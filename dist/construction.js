import { RECIPES, buildError } from './rules.js?v=0.13.0';
import { findFacility } from './facilities.js?v=0.13.0';
import { penId, used } from './housing.js?v=0.13.0';
import { give } from './bag.js?v=0.13.0';
import { atHome } from './bag.js?v=0.13.0';
const fail = error => ({ ok: false, error });
export function climb(s, b) {
  if (
    !b ||
    b.type !== 'stairs' ||
    s.player.mode !== 'foot' ||
    Math.hypot(s.player.x - b.x * 3.6, s.player.z - b.z * 3.6) > 4
  )
    return fail('走近樓梯才能上下樓。');
  const level = s.player.level ? 0 : 1;
  if (level && !s.buildings.some(v => v.type === 'upperfloor' && v.x === b.x && v.z === b.z))
    return fail('樓梯上方還沒有二樓地板。');
  s.player.level = level;
  s.player.x = b.x * 3.6 + 1.1;
  s.player.z = b.z * 3.6;
  return { ok: true, message: level ? '已到二樓。' : '已回到一樓。' };
}
function removable(s, b) {
  if (RECIPES[b.type]?.fixed) return '這張書桌是醒來時就在的東西，留著吧。';
  if (b.type === 'pen' && used(s, penId(b))) return '先把本池住民與預留幼體安置到別處。';
  if (b.type === 'floor') {
    if (s.buildings.some(v => v !== b && v.x === b.x && v.z === b.z)) return '先移走此地基上的設施與二樓。';
    const floors = s.buildings.filter(v => v.type === 'floor' && v !== b);
    if (!floors.length) return '至少保留一格地基。';
    const seen = new Set([`${floors[0].x},${floors[0].z}`]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const f of floors)
        if (
          !seen.has(`${f.x},${f.z}`) &&
          floors.some(v => seen.has(`${v.x},${v.z}`) && Math.abs(v.x - f.x) + Math.abs(v.z - f.z) === 1)
        ) {
          seen.add(`${f.x},${f.z}`);
          changed = true;
        }
    }
    if (seen.size !== floors.length) return '不能切斷木筏連接。';
    if (s.buildings.some(v => v.type === 'pen' && !floors.some(f => Math.abs(v.x - f.x) + Math.abs(v.z - f.z) === 1)))
      return '不能拆掉展示池唯一連接地基。';
  }
  if (b.type === 'upperfloor') {
    if (s.player.level === 1 && Math.abs(s.player.x - b.x * 3.6) < 1.8 && Math.abs(s.player.z - b.z * 3.6) < 1.8)
      return '先離開這格二樓地板。';
    if (s.buildings.some(v => v !== b && v.x === b.x && v.z === b.z && v.level === 1)) return '先移走二樓設施與樓梯。';
  }
  if (
    b.type === 'stairs' &&
    s.buildings.some(v => v.type === 'upperfloor') &&
    s.buildings.filter(v => v.type === 'stairs').length === 1
  )
    return '有二樓時需保留至少一座樓梯。';
  return null;
}
export function demolish(s, id) {
  const b = findFacility(s, id);
  if (!b) return fail('找不到建築。');
  if (!atHome(s)) return fail('請返回避難所管理建築。');
  const error = removable(s, b);
  if (error) return fail(error);
  s.buildings = s.buildings.filter(v => v !== b);
  give(s, Object.fromEntries(Object.entries(RECIPES[b.type].cost).map(([k, v]) => [k, Math.floor(v / 2)])));
  return { ok: true, message: '已拆除，回收約一半材料。' };
}
export function relocate(s, id, x, z, level = 0) {
  const b = findFacility(s, id);
  if (!b) return fail('找不到建築。');
  if (['floor', 'upperfloor', 'stairs'].includes(b.type)) return fail('地板與樓梯請用拆除、重建調整。');
  if (b.ship || b.stowed) return fail('戰艦上的設施使用固定艙位；可以收進待安置，再放到空出的艙位。');
  if (!Number.isInteger(x) || !Number.isInteger(z) || ![0, 1].includes(level)) return fail('請輸入整數格位與樓層。');
  if (b.type === 'pen' && level !== 0) return fail('展示池需設在海面。');
  const old = penId(b),
    test = {
      ...s,
      buildings: s.buildings.filter(v => v !== b),
      resources: Object.fromEntries(Object.keys(s.resources).map(k => [k, 99999]))
    };
  const error = buildError(test, b.type, x, z, level);
  if (error) return fail(error);
  Object.assign(b, { x, z, level });
  if (b.type === 'pen') for (const p of [...s.tamed, ...s.eggs]) if (p.penId === old) p.penId = penId(b);
  return { ok: true, message: '設施已搬移，住民與池名保留。' };
}
