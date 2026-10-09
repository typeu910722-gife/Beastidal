export const PEN_CAPACITY = 3;
export const penId = b => `pen:${b.x}:${b.z}`;
export const pens = s => s.buildings.filter(b => b.type === 'pen');
export const occupants = (s, id) => s.tamed.filter(p => p.penId === id);
export const reserved = (s, id) => s.eggs.filter(p => p.penId === id);
export const used = (s, id) => occupants(s, id).length + reserved(s, id).length;
export function normalizeHousing(s) {
  const counts = new Map(pens(s).map(b => [penId(b), 0])),
    pending = [];
  for (const p of [...s.tamed, ...s.eggs]) {
    if (counts.has(p.penId) && counts.get(p.penId) < PEN_CAPACITY) counts.set(p.penId, counts.get(p.penId) + 1);
    else {
      p.penId = null;
      pending.push(p);
    }
  }
  for (const p of pending) {
    const entry = [...counts].find(([, n]) => n < PEN_CAPACITY);
    if (!entry) break;
    p.penId = entry[0];
    counts.set(entry[0], entry[1] + 1);
  }
  return s;
}
export function freePen(s) {
  normalizeHousing(s);
  const b = pens(s).find(b => used(s, penId(b)) < PEN_CAPACITY);
  return b ? penId(b) : null;
}
export function movePet(s, petId, destination, swapId) {
  normalizeHousing(s);
  const pet = s.tamed.find(p => p.id === petId);
  if (!pet) return { ok: false, error: '找不到這隻生物。' };
  if (!pens(s).some(b => penId(b) === destination)) return { ok: false, error: '請選擇存在的展示池。' };
  if (pet.penId === destination) return { ok: false, error: '牠已經住在這一池。' };
  if (used(s, destination) >= PEN_CAPACITY) {
    const other = s.tamed.find(p => p.id === swapId && p.penId === destination);
    if (!other || !pet.penId) return { ok: false, error: '此池已滿，請選一隻生物交換；待安置生物需要空位。' };
    other.penId = pet.penId;
  }
  pet.penId = destination;
  return { ok: true };
}
export function penLabel(s, id) {
  const i = pens(s).findIndex(b => penId(b) === id);
  return i < 0
    ? '待安置'
    : typeof pens(s)[i].name === 'string' && pens(s)[i].name.trim()
      ? pens(s)[i].name
      : `展示池 ${i + 1}`;
}

export function renamePen(s, id, value) {
  const b = pens(s).find(b => penId(b) === id);
  if (!b) return { ok: false, error: '找不到這座展示池。' };
  const name = String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!name) return { ok: false, error: '請輸入展示池名稱。' };
  if ([...name].length > 16) return { ok: false, error: '名稱最多 16 個字。' };
  // eslint-disable-next-line no-control-regex -- rejecting control characters is the point
  if (/[\u0000-\u001f\u007f]/.test(name)) return { ok: false, error: '名稱含有無法使用的字元。' };
  if (pens(s).some(p => p !== b && penLabel(s, penId(p)) === name))
    return { ok: false, error: '已有同名展示池，請換一個名稱。' };
  b.name = name;
  return { ok: true, name };
}
