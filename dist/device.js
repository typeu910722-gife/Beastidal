// The battered handheld found on the raft desk. Once picked up it is the player's hub: a phone-style UI with apps
// for the bag, vitals/status, beast storage, logbook, codex, achievements and stats (see game.js openDevice).
import { RECIPES, buildError } from './rules.js?v=0.18.0';
import { nearFacility } from './fortress.js?v=0.18.0';

export const DEVICE_APPS = [
  { id: 'bag', icon: '▤', name: '背包' },
  { id: 'beasts', icon: '◎', name: '御獸倉庫' },
  { id: 'journal', icon: '☷', name: '航海日誌' },
  { id: 'codex', icon: '◈', name: '圖鑑' },
  { id: 'settings', icon: '⚙', name: '設定' }
];

// What is left on the laptop: the commute, an unsent message, and a sky its star chart does not recognise.
export const LAPTOP_LINES = [
  '系統修復模式……磁碟損毀 63%。',
  '最後一次同步：08:12（通勤途中）。',
  '行事曆：09:00 新人週會 · 10:30 交週報。',
  '未寄出的訊息：「媽，我到公司再打給你。」',
  'GPS：無法定位。星圖與資料庫不符。',
  '偵測到外部訊號：頻率不明，方向東北。'
];

const deskAt = s => s.buildings.find(b => b.type === 'desk');

// Saves from before 0.11 have no device: anyone who has played a while already carries it, and the desk is placed
// on the first free raft cell (if the raft is full, the device simply stays in their pocket).
export function normalizeDevice(s) {
  s.device ??= { owned: (s.salvaged || 0) > 0 || (s.elapsed || 0) > 120, laptop: false };
  s.device.battery ??= 64;
  if (!deskAt(s) && RECIPES.desk) {
    const test = {
      ...s,
      player: { ...s.player, x: 1.8, z: 1.8 },
      secret: true,
      resources: Object.fromEntries(Object.keys(s.resources).map(k => [k, 99999]))
    };
    const spot = s.buildings
      .filter(b => b.type === 'floor')
      .sort((a, b) => Math.hypot(a.x - 1, a.z - 1) - Math.hypot(b.x - 1, b.z - 1))
      .find(f => !buildError(test, 'desk', f.x, f.z, 0));
    if (spot) s.buildings.push({ type: 'desk', x: spot.x, z: spot.z, rot: 0 });
    else s.device.owned = true;
  }
  return s.device;
}
const nearDesk = s => nearFacility(s, deskAt(s));
export function takeDevice(s) {
  normalizeDevice(s);
  if (s.device.owned) return { ok: false, error: '裝置已經在你身上。' };
  if (!nearDesk(s)) return { ok: false, error: '請走到書桌旁。' };
  s.device.owned = true;
  return { ok: true, message: '拿起了隨身裝置。按 I 或「裝置」鈕開啟。' };
}
export function readLaptop(s) {
  normalizeDevice(s);
  if (!nearDesk(s)) return { ok: false, error: '請走到書桌旁。' };
  const first = !s.device.laptop;
  s.device.laptop = true;
  return { ok: true, first, lines: LAPTOP_LINES };
}
// Cosmetic battery: a patched-in solar cell charges by day and drains slowly at night.
export function tickDevice(s, dt, daylight) {
  if (!s.device?.owned) return;
  const b = s.device.battery ?? 64;
  s.device.battery = Math.max(4, Math.min(100, b + dt * (daylight ? 0.06 : -0.025)));
}
