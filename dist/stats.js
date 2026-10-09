// Local play statistics. Nothing leaves the device: the player can copy the JSON and send it in by hand.
// Used to tune pacing (how long each milestone takes) without any analytics service.
import { GUIDE_IDS, guideDone } from './guide.js?v=0.10.0';

export const MILESTONE_NAMES = {
  salvage: '打撈 3 件物資',
  floor: '擴建 2 格地基',
  shelter: '蓋好避難所',
  collector: '蓋好集水器',
  buoy: '調查研究浮標',
  beacon: '點亮訊號塔（第一章）',
  pen: '蓋好展示池',
  tame: '馴化第一隻御獸',
  bond: '羈絆達到 30',
  scan: '發現島嶼',
  claim: '占領島嶼',
  dock: '蓋好停靠站',
  floors: '地基滿 20 格',
  pens: '展示池滿 5 座',
  boat: '小艇升到 LV3',
  fuse: '開始戰艦融合',
  helm: '第一次掌舵',
  lounge: '御獸登船',
  cargo: '使用物資艙',
  boss: '擊退深海守望者'
};

export function normalizeStats(s) {
  s.stats ??= {};
  const st = s.stats;
  st.playSeconds ??= 0;
  st.sessions ??= 0;
  st.sailed ??= 0;
  st.walked ??= 0;
  st.collapses ??= 0;
  st.repels ??= 0;
  st.stormsAtSea ??= 0;
  st.milestones ??= {};
  // Saves from before 0.10 get their already-reached milestones marked as "before tracking".
  if (!st.started) {
    st.started = Date.now();
    for (const id of guideDone(s)) st.milestones[id] ??= { before: true };
  }
  return st;
}
// Called every frame while playing. Returns milestone ids newly reached.
export function tickStats(s, dt, moved, mode) {
  const st = s.stats;
  st.playSeconds += dt;
  if (mode === 'foot' || mode === 'aboard') st.walked += moved;
  else st.sailed += moved;
  const fresh = [];
  for (const id of guideDone(s))
    if (!st.milestones[id]) {
      st.milestones[id] = { play: Math.round(st.playSeconds), day: 1 + Math.floor(s.elapsed / 480), at: Date.now() };
      fresh.push(id);
    }
  return fresh;
}
export function formatDuration(sec) {
  sec = Math.round(sec || 0);
  const h = Math.floor(sec / 3600),
    m = Math.floor((sec % 3600) / 60),
    r = sec % 60;
  return h ? `${h} 小時 ${m} 分` : m ? `${m} 分 ${r} 秒` : `${r} 秒`;
}
// Rows in story order: [name, "time from start" or null if not reached / reached before tracking].
export function milestoneRows(s) {
  return GUIDE_IDS.filter(id => MILESTONE_NAMES[id]).map(id => {
    const m = s.stats?.milestones?.[id];
    return { id, name: MILESTONE_NAMES[id], reached: !!m, play: m && !m.before ? m.play : null, day: m?.day ?? null };
  });
}
// Anonymous summary the player can paste into feedback (no account or device identifiers).
export function statsReport(s, version) {
  const st = s.stats || {};
  return JSON.stringify(
    {
      game: 'beastidal',
      version,
      playSeconds: Math.round(st.playSeconds || 0),
      sessions: st.sessions,
      day: 1 + Math.floor((s.elapsed || 0) / 480),
      sailed: Math.round(st.sailed || 0),
      walked: Math.round(st.walked || 0),
      collapses: st.collapses,
      repels: st.repels,
      stormsAtSea: st.stormsAtSea,
      tamed: (s.tamed || []).length,
      milestones: Object.fromEntries(
        Object.entries(st.milestones || {}).map(([id, m]) => [id, m.before ? 'before-tracking' : m.play])
      )
    },
    null,
    1
  );
}
