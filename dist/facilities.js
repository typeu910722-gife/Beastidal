import { bagRoom, bagFullError } from './bag.js?v=0.15.0';
import { nearFacility } from './fortress.js?v=0.15.0';
export const facilityId = b => `facility:${b.type}:${b.x}:${b.z}${b.level ? ':1' : ''}`;
export const findFacility = (s, id) => s.buildings.find(b => facilityId(b) === id);
export function useFacility(s, id, action) {
  const b = findFacility(s, id);
  if (!b) return { ok: false, error: '設施不存在。' };
  if (b.stowed) return { ok: false, error: '這座設施還在待安置清單上。' };
  if (!nearFacility(s, b)) return { ok: false, error: '請靠近設施至 5 公尺內。' };
  if (action === 'rest' && b.type === 'shelter') {
    if (s.vitals.health >= 98) return { ok: false, error: '目前體力充足。' };
    if (s.resources.food < 1 || s.resources.water < 1) return { ok: false, error: '休息需要 1 口糧與 1 淡水。' };
    s.resources.food--;
    s.resources.water--;
    s.vitals.health = Math.min(100, s.vitals.health + 45);
    return { ok: true, message: '休息完成，體力恢復 45。' };
  }
  if (action === 'collect' && b.type === 'collector') {
    if (!(b.waterStored > 0)) return { ok: false, error: '尚無淡水，蒸餾器每 35 秒產出 2 份。' };
    const n = Math.min(b.waterStored, bagRoom(s));
    if (!n) return { ok: false, error: bagFullError };
    s.resources.water += n;
    b.waterStored -= n;
    return { ok: true, message: `取出 ${n} 份淡水。` };
  }
  if (action === 'signal' && b.type === 'beacon') {
    s.islandsRevealed = true;
    return { ok: true, message: '海圖已標示三座島嶼：棕櫚環礁、異晶礁島、沉城遺島。' };
  }
  return { ok: false, error: '此設施不支援這項操作。' };
}
