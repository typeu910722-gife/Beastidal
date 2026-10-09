// Local save slot + metadata used to reconcile with an optional cloud copy.
// The save itself stays under the original key so pre-0.7 progress keeps loading.
export const META_KEY = 'beastidal-save-meta-v1';
const blank = () => ({ savedAt: 0, synced: {} });

export function readMeta(storage) {
  try {
    const m = JSON.parse(storage.getItem(META_KEY) || 'null');
    if (m && typeof m === 'object') return { ...blank(), ...m, synced: { ...(m.synced || {}) } };
  } catch {}
  return blank();
}
export function writeMeta(storage, meta) {
  storage.setItem(META_KEY, JSON.stringify(meta));
}
export function readLocal(storage, key, validate) {
  const raw = storage.getItem(key);
  if (!raw) return null;
  const v = JSON.parse(raw);
  return validate(v) ? v : null;
}
// Throws when storage is unavailable or full so the caller can report it.
export function writeLocal(storage, key, state, now = Date.now()) {
  storage.setItem(key, JSON.stringify(state));
  const meta = readMeta(storage);
  meta.savedAt = now;
  writeMeta(storage, meta);
  return meta;
}
export function markSynced(storage, account, savedAt) {
  const meta = readMeta(storage);
  meta.synced[account] = savedAt;
  writeMeta(storage, meta);
}
export function forgetLocal(storage, key) {
  storage.removeItem(key);
  const meta = readMeta(storage);
  meta.savedAt = 0;
  meta.synced = {};
  writeMeta(storage, meta);
}

// Decide how the device copy and the cloud copy relate.
// local / cloud: {savedAt} or null when that copy does not exist.
// lastSynced: the savedAt both copies shared after the previous successful sync for this account.
export function reconcile(local, cloud, lastSynced = 0) {
  if (!local && !cloud) return 'none';
  if (!cloud) return 'upload';
  if (!local) return 'download';
  if (local.savedAt === cloud.savedAt) return 'same';
  if (lastSynced && cloud.savedAt === lastSynced) return 'upload';
  if (lastSynced && local.savedAt <= lastSynced && cloud.savedAt > lastSynced) return 'download';
  return 'conflict';
}

// Short human summary for the "which save do you keep" dialog.
export function describeSave(s) {
  if (!s) return '無存檔';
  const day = 1 + Math.floor((s.elapsed || 0) / 480),
    pets = (s.tamed || []).length,
    builds = (s.buildings || []).length;
  return `第 ${day} 日 · ${builds} 座建築${pets ? ` · ${pets} 隻御獸` : ''}`;
}
export function formatTime(ms) {
  if (!ms) return '時間不明';
  const d = new Date(ms),
    p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
