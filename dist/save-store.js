// Local save slots + metadata used to reconcile with optional cloud copies.
// Slot 1 keeps the original keys so pre-0.7 progress keeps loading; slots 2..N get suffixed keys.
import { dayOf } from './clock.js?v=0.18.0';
export const META_KEY = 'beastidal-save-meta-v1';
export const LEGACY_SAVE_KEY = 'tidal-rebirth-save-v1';
export const SLOT_COUNT = 3;
const ACTIVE_KEY = 'beastidal-active-slot';
export const slotKey = (slot = 1) => (slot === 1 ? LEGACY_SAVE_KEY : `${LEGACY_SAVE_KEY}-slot${slot}`);
export const metaKey = (slot = 1) => (slot === 1 ? META_KEY : `${META_KEY}-slot${slot}`);
export const cloudFileName = (base, slot = 1) => (slot === 1 ? base : base.replace(/\.json$/, `-slot${slot}.json`));
export function activeSlot(storage) {
  try {
    const n = Number(storage.getItem(ACTIVE_KEY));
    return n >= 1 && n <= SLOT_COUNT ? n : 1;
  } catch {
    return 1;
  }
}
export function setActiveSlot(storage, slot) {
  try {
    storage.setItem(ACTIVE_KEY, String(slot));
  } catch {}
}
const blank = () => ({ savedAt: 0, synced: {} });

export function readMeta(storage, slot = 1) {
  try {
    const m = JSON.parse(storage.getItem(metaKey(slot)) || 'null');
    if (m && typeof m === 'object') return { ...blank(), ...m, synced: { ...(m.synced || {}) } };
  } catch {}
  return blank();
}
export function writeMeta(storage, meta, slot = 1) {
  storage.setItem(metaKey(slot), JSON.stringify(meta));
}
export function readLocal(storage, key, validate) {
  const raw = storage.getItem(key);
  if (!raw) return null;
  const v = JSON.parse(raw);
  return validate(v) ? v : null;
}
// Throws when storage is unavailable or full so the caller can report it.
export function writeLocal(storage, key, state, now = Date.now(), slot = 1) {
  storage.setItem(key, JSON.stringify(state));
  const meta = readMeta(storage, slot);
  meta.savedAt = now;
  writeMeta(storage, meta, slot);
  return meta;
}
export function markSynced(storage, account, savedAt, slot = 1) {
  const meta = readMeta(storage, slot);
  meta.synced[account] = savedAt;
  writeMeta(storage, meta, slot);
}
export function forgetLocal(storage, key, slot = 1) {
  storage.removeItem(key);
  const meta = readMeta(storage, slot);
  meta.savedAt = 0;
  meta.synced = {};
  writeMeta(storage, meta, slot);
}
// Summary of every slot for the slot picker. Corrupt slots are reported, not thrown.
export function listSlots(storage, validate) {
  return Array.from({ length: SLOT_COUNT }, (_, i) => {
    const slot = i + 1;
    try {
      const state = readLocal(storage, slotKey(slot), validate);
      return { slot, state, savedAt: state ? readMeta(storage, slot).savedAt : 0, corrupt: false };
    } catch {
      return { slot, state: null, savedAt: 0, corrupt: true };
    }
  });
}
// Portable save file (same envelope as the Drive copy).
export function exportSave(state, savedAt = Date.now()) {
  return JSON.stringify({ format: 'beastidal-save', version: 1, savedAt, state }, null, 1);
}
export function importSave(text, validate) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('檔案不是有效的存檔（JSON 格式錯誤）。');
  }
  const state = data?.format === 'beastidal-save' ? data.state : data;
  if (!validate(state)) throw new Error('檔案內容不是比斯泰德的存檔，或版本不相容。');
  return { state, savedAt: Number(data?.savedAt) || Date.now() };
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
  const day = dayOf(s),
    pets = (s.tamed || []).length,
    // the drift desk was there from the start: count only what the player built
    builds = (s.buildings || []).filter(b => b.type !== 'desk').length;
  return `第 ${day} 日 · ${builds} 座建築${pets ? ` · ${pets} 隻御獸` : ''}`;
}
export function formatTime(ms) {
  if (!ms) return '時間不明';
  const d = new Date(ms),
    p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
