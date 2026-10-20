// 0.71: inside 慈光港's buildings — room 0412, the empty diner and the admin block are rooms you walk into. Each is
// a pocket of its own, built 30 m under its building (the town's buildings are solid from outside), entered and left
// through the building's door. While you are inside, `s.town.inside` names the room: walking, the ground, the camera,
// the light and what you can use all follow it. Pure: reads and changes the state; interior-models.js draws it.
import { isNight, dayOf } from './clock.js?v=0.74.0';
import { give } from './bag.js?v=0.74.0';
import { toWorld, toLocal } from './dome.js?v=0.74.0';
import { BUILDINGS } from './town.js?v=0.74.0';
import { normalizeChapter2, ADMIN_SCENES } from './chapter2.js?v=0.74.0';
import { seeTankB01 } from './chapter4.js?v=0.74.0';

export const INTERIOR_Y = -30;
// Rooms in coordinates local to the building's centre: walkable rectangles (`rects`), the ceiling height, where you
// come in (`entry`, facing `yaw`, 0 = north), and what stands inside (`points`; `solid` ones block your way).
export const INTERIORS = {
  room: {
    name: '公寓 0412 號房',
    building: 'apartment',
    h: 2.7,
    tone: 'warm',
    rects: [{ x0: -3.2, x1: 3.2, z0: -4, z1: 4 }],
    entry: { x: 0, z: 3, yaw: 0 },
    points: [
      { id: 'door', name: '房門', x: 0, z: 3.8, hint: ['回到走廊 · 按 E 出去', '出去'] },
      { id: 'bed', name: '床', x: -1.9, z: -2.4, w: 1.4, d: 2.2, solid: true, hint: ['你的床 · 按 E', '躺下'] },
      {
        id: 'desk',
        name: '書桌',
        x: 2.3,
        z: -3.2,
        w: 1.4,
        d: 0.7,
        solid: true,
        hint: ['桌上有一本手冊 · 按 E 翻閱', '翻閱']
      },
      { id: 'window', name: '窗戶', x: 0, z: -3.9, hint: ['看得到廣場 · 按 E 往外看', '看'] },
      {
        id: 'wardrobe',
        name: '衣櫃',
        x: 2.75,
        z: 1.4,
        w: 0.8,
        d: 1.6,
        solid: true,
        hint: ['衣櫃門沒關好 · 按 E 打開', '打開']
      }
    ]
  },
  diner: {
    name: '空無一人的餐館',
    building: 'diner',
    h: 3.2,
    tone: 'warm',
    rects: [
      { x0: -6, x1: 6, z0: -4, z1: 2 },
      { x0: 1.5, x1: 6, z0: 1.2, z1: 4.5 } // the kitchen behind the counter (overlapping the room)
    ],
    entry: { x: 0, z: -3.2, yaw: Math.PI },
    points: [
      { id: 'door', name: '店門', x: 0, z: -3.9, hint: ['回到街上 · 按 E 出去', '出去'] },
      {
        id: 'soup',
        name: '冒著熱氣的湯',
        x: -3.4,
        z: -1.6,
        w: 1.2,
        d: 1.2,
        solid: true,
        hint: ['每張桌上都有一碗 · 按 E 喝一口', '喝']
      },
      {
        id: 'table',
        name: '靠牆的桌子',
        x: -4.2,
        z: 1,
        w: 1.2,
        d: 1.2,
        solid: true,
        hint: ['桌子底下好像卡著什麼 · 按 E 找找', '找']
      },
      {
        id: 'till',
        name: '收銀台',
        x: 0.6,
        z: 1.2,
        w: 2.6,
        d: 0.7,
        solid: true,
        hint: ['抽屜開著 · 按 E 看看', '看看']
      },
      {
        id: 'stove',
        name: '廚房的爐子',
        x: 4.6,
        z: 4,
        w: 1.6,
        d: 0.7,
        solid: true,
        hint: ['鍋子還在冒煙 · 按 E 看看', '看看']
      }
    ]
  },
  admin: {
    name: '管理區',
    building: 'admin',
    h: 3.4,
    tone: 'cold',
    rects: [
      { x0: -6, x1: 6, z0: -2, z1: 6 }, // the monitor room, the door at its south wall
      { x0: -1.5, x1: 1.5, z0: -14.8, z1: -1.2 }, // the corridor (overlapping both halls, so it opens into them)
      { x0: -7, x1: 7, z0: -25, z1: -14 } // the hall of tanks
    ],
    entry: { x: 0, z: 5, yaw: 0 },
    points: [
      { id: 'door', name: '門', x: 0, z: 5.8, hint: ['回到外面 · 按 E 出去', '出去'] },
      { id: 'screens', name: '一整排螢幕', x: -5.6, z: 2, hint: ['每一格都是一個房間 · 按 E 細看', '細看'] },
      {
        id: 'terminal-a',
        name: '終端機 · 適應監測',
        x: 5,
        z: 0,
        w: 1.2,
        d: 0.8,
        solid: true,
        hint: ['螢幕還亮著 · 按 E 讀', '讀']
      },
      {
        id: 'terminal-b',
        name: '終端機 · 畢業名單',
        x: 1.1,
        z: -9,
        w: 0.6,
        d: 1,
        solid: true,
        hint: ['走廊邊的終端機 · 按 E 讀', '讀']
      },
      { id: 'tanks', name: '玻璃槽', x: 0, z: -19, hint: ['淡綠色的液體 · 按 E 走近', '走近'] },
      // 0.73: chapter four — the tank at the far left, once K.'s master code has opened the door again
      { id: 'tank-b01', name: '玻璃槽 B-01', x: -6, z: -17, needs: 'master', hint: ['最左邊的槽 · 按 E 走近', '走近'] },
      {
        id: 'terminal-c',
        name: '終端機 · 伴生體計畫',
        x: 6,
        z: -23,
        w: 1,
        d: 1.2,
        solid: true,
        hint: ['最裡面的終端機 · 按 E 讀', '讀']
      }
    ]
  }
};
// Which of ADMIN_SCENES each place in the admin block shows; 0 plays at the door, the rest once all are seen.
export const ADMIN_PARTS = {
  enter: [0],
  screens: [1],
  'terminal-a': [2, 3],
  'terminal-b': [4],
  tanks: [5, 6],
  'terminal-c': [7, 8, 9],
  qing: [10, 11, 12, 13]
};
const LORE = {
  room: {
    bed: {
      first: '被子疊得整整齊齊，枕頭上有洗衣精的味道。像是有人每天都來換過。',
      again: '床很軟。天黑以後可以在這裡睡到天亮。'
    },
    desk: {
      first: '《新生者手冊》第一頁：「歡迎回家。這裡沒有痛苦。」最後一頁被撕掉了，只剩一條整齊的撕痕。',
      again: '手冊停在第一頁。「歡迎回家。」'
    },
    window: {
      first: '窗外是廣場，雕像的影子落在石板上……影子的方向，跟現在太陽的位置對不上。',
      again: '廣場上沒有人。雕像的影子還是朝著同一個方向。'
    },
    wardrobe: {
      first: '衣櫃裡掛著三件一模一樣的白襯衫。領口的標籤上寫著：0411。',
      again: '三件襯衫。0411。你把衣櫃門關上了。'
    }
  },
  diner: {
    soup: {
      first: '每張桌上都擺著一碗熱湯，湯匙放在碗的右邊，角度都一樣。你喝了一口……跟配給站的味道一模一樣。',
      again: '湯還是熱的。你又喝了一口。',
      done: '你今天已經喝過了。湯還是一樣熱，好像從來不會涼。'
    },
    till: {
      first: '收銀機的抽屜開著。裡面沒有錢，只有一疊空白的收據，每一張都印著今天的日期。',
      again: '一疊空白的收據。日期還是今天。'
    },
    stove: {
      first: '爐子上的鍋還在冒煙，可是爐火根本沒開。你把手放在鍋邊——是冷的。',
      again: '冷的鍋，熱的煙。'
    }
  }
};

export const interiorOf = s => (s.town?.inside && INTERIORS[s.town.inside]) || null;
const centre = def => BUILDINGS.find(b => b.id === def.building);
// interior-local ↔ world (x, z)
export function interiorWorld(id, p) {
  const b = centre(INTERIORS[id]);
  return toWorld({ x: b.x + p.x, z: b.z + p.z });
}
export function interiorLocal(id, x, z) {
  const b = centre(INTERIORS[id]),
    p = toLocal(x, z);
  return { x: p.x - b.x, z: p.z - b.z };
}
const inRects = (def, x, z, pad = 0) =>
  def.rects.some(r => x > r.x0 + pad && x < r.x1 - pad && z > r.z0 + pad && z < r.z1 - pad);
// Where you can walk inside (world coordinates): within the rooms, round the furniture.
export function interiorWalkable(id, x, z, pad = 0.35) {
  const def = INTERIORS[id],
    p = interiorLocal(id, x, z);
  if (!inRects(def, p.x, p.z, pad)) return false;
  for (const q of def.points)
    if (q.solid && Math.abs(p.x - q.x) < q.w / 2 + pad && Math.abs(p.z - q.z) < q.d / 2 + pad) return false;
  return true;
}
// The camera stays inside the walls and under the ceiling.
export function interiorCameraBlocked(id, x, y, z) {
  const def = INTERIORS[id],
    p = interiorLocal(id, x, z);
  return !inRects(def, p.x, p.z, 0.15) || y > INTERIOR_Y + def.h - 0.15 || y < INTERIOR_Y + 0.1;
}

export function enterInterior(s, id) {
  const def = INTERIORS[id];
  if (!def) return { ok: false, error: '這裡進不去。' };
  s.town ??= {};
  s.town.inside = id;
  s.town.insideSeen ??= {};
  s.town.insideSeen[id] ??= [];
  Object.assign(s.player, {
    ...interiorWorld(id, def.entry),
    heading: def.entry.yaw + Math.PI,
    level: 0,
    mode: 'foot'
  });
  return { ok: true, yaw: def.entry.yaw, name: def.name };
}
// Out through the door, standing at the building's door outside.
export function leaveInterior(s) {
  const def = interiorOf(s);
  if (!def) return { ok: false };
  const b = centre(def);
  s.town.inside = null;
  const out = toWorld(b.door),
    away = { x: b.door.x - b.x, z: b.door.z - b.z },
    yaw = Math.atan2(-away.x, -away.z);
  Object.assign(s.player, { ...out, heading: yaw + Math.PI, level: 0, mode: 'foot' });
  return { ok: true, yaw };
}
// What you can use inside, in world coordinates (the town's interaction list while you are in).
export function interiorPoints(s) {
  const def = interiorOf(s);
  if (!def) return [];
  const pts = def.points
    .filter(q => q.needs !== 'master' || !!s.chapter4?.terminal)
    .map(q => ({ id: 'i:' + q.id, name: q.name, ...interiorWorld(s.town.inside, q) }));
  if (s.town.inside === 'admin' && qingWaits(s))
    pts.push({ id: 'i:qing', name: '晴', ...interiorWorld('admin', QING_AT) });
  return pts;
}
export const QING_AT = { x: 0, z: -6 };
// she waits only on the night of chapter two's choice
export const qingWaits = s => (s.chapter2?.stage || 0) === 4 && adminReady(s);
export const interiorHint = (s, id) => {
  if (id === 'i:qing') return ['她站在走廊上 · 按 E', '面對她'];
  return interiorOf(s)?.points.find(q => 'i:' + q.id === id)?.hint;
};
const seenList = s => {
  s.town.insideSeen ??= {};
  return (s.town.insideSeen[s.town.inside] ??= []);
};
// The admin block's scenes: has every room's story been seen (so 晴 is waiting in the corridor)?
export function adminReady(s) {
  const seen = s.town?.insideSeen?.admin || [];
  return ['screens', 'terminal-a', 'terminal-b', 'tanks', 'terminal-c'].every(id => seen.includes(id));
}
// Using something inside. Returns one of:
//   { leave: true } · { sleep: true, text } · { lines: [[speaker, text]…], then?: 'choice' | 'key' } · { text, got }
export function useInterior(s, pointId) {
  const room = s.town?.inside,
    def = interiorOf(s);
  if (!def) return { ok: false, error: '你不在室內。' };
  const id = pointId.replace(/^i:/, '');
  if (id === 'door') return { ok: true, leave: true };
  const seen = seenList(s),
    first = !seen.includes(id);
  if (first) seen.push(id);
  if (room === 'admin') {
    if (id === 'tank-b01') {
      const r = seeTankB01(s);
      return r ? { ok: true, lines: r.lines, chapter4: r.first } : { ok: false, error: '這裡什麼也沒有。' };
    }
    if (id === 'qing') {
      if (!qingWaits(s)) return { ok: false, error: '走廊上沒有人。' };
      return { ok: true, lines: ADMIN_PARTS.qing.map(i => ADMIN_SCENES[i]), then: 'choice' };
    }
    const part = ADMIN_PARTS[id];
    if (!part) return { ok: false, error: '這裡什麼也沒有。' };
    return { ok: true, lines: part.map(i => ADMIN_SCENES[i]), ready: first && adminReady(s) };
  }
  if (room === 'room' && id === 'bed' && isNight(s)) return { ok: true, sleep: true };
  if (room === 'diner' && id === 'table') return { ok: true, search: true };
  const lore = LORE[room]?.[id];
  if (!lore) return { ok: false, error: '這裡什麼也沒有。' };
  // the soup: a sip once a day
  if (room === 'diner' && id === 'soup') {
    s.town.soupDay ??= 0;
    if (s.town.soupDay === dayOf(s)) return { ok: true, text: lore.done, got: {} };
    s.town.soupDay = dayOf(s);
    give(s, { food: 1, water: 2 });
    return { ok: true, text: first ? lore.first : lore.again, got: { food: 1, water: 2 } };
  }
  if (first) {
    s.log.unshift({
      day: dayOf(s),
      title: def.name + ' · ' + def.points.find(q => q.id === id).name,
      text: lore.first
    });
    s.log = s.log.slice(0, 70);
  }
  return { ok: true, text: first ? lore.first : lore.again, got: {} };
}
// Whether the admin block lets you in now (with No.0156's key, at night, before the choice).
export function adminOpen(s) {
  const c = normalizeChapter2(s);
  return c.stage >= 3 && c.stage < 5 && isNight(s);
}
// 0.73: K.'s master code opens it at any hour (chapter four)
export const masterOpen = s => !!s.chapter4?.terminal;
