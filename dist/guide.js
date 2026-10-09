// Protagonist inner monologue doubling as the tutorial: the first unmet step speaks.
const n = (s, t) => s.buildings.filter(b => b.type === t).length;
const STEPS = [
  [
    'salvage',
    s => s.salvaged < 3,
    s => `（……先別慌。社畜的基本功：先盤點資源。靠近漂流木箱，按 E 打撈吧。還差 ${3 - s.salvaged} 件。）`
  ],
  [
    'device',
    s => s.device && !s.device.owned,
    () => '（木筏的書桌上……那台破舊的隨身裝置還亮著。登上木筏，走到書桌旁按 E 拿起來。）'
  ],
  ['floor', s => s.expanded < 2, () => '（木筏小得連轉身都難。按 B 打開建造，在綠色格子接上浮動地基，先擴建 2 格。）'],
  [
    'shelter',
    s => !n(s, 'shelter'),
    () => '（太陽下山會很冷……用漂流木和纖維搭一座帆布避難所，至少能遮風避雨、恢復體力。）'
  ],
  ['collector', s => !n(s, 'collector'), () => '（喉嚨好乾。海水不能直接喝——蓋集水蒸餾器，記得回來點它取水。）'],
  ['buoy', s => !s.buoyFound, () => '（東北方那個一閃一閃的光點……是人造的浮標？駕艇過去按 E 調查看看。）'],
  [
    'beacon',
    s => !n(s, 'beacon'),
    () => '（與其等人來找我，不如讓整片海知道我在這裡。異晶收集夠了，就蓋遠洋訊號塔。）'
  ],
  ['pen', s => !n(s, 'pen'), () => '（研究紀錄說，牠們不是怪物。先蓋一座海洋展示池，給牠們一個能回來的家。）'],
  [
    'tame',
    s => !s.tamed.length,
    () => '（做些誘餌，連續餵同一隻生物，牠會越來越信任我。信任到 100% 牠就會跟著我——再回木筏的工作桌締結契約。）'
  ],
  [
    'bond',
    s => !s.tamed.some(p => p.bond >= 30),
    () => '（牠還不完全信任我。按 K 打開御獸遠航：訓練、帶牠一起出海採集，羈絆到 30 就能並肩作戰。）'
  ],
  [
    'scan',
    s => !s.islandsRevealed && !(s.visitedIslands || []).length,
    () => '（訊號塔應該能掃描遠方。點它試試，或打開日誌 J 設定島嶼航線。）'
  ],
  [
    'claim',
    s => !(s.occupied || []).length,
    () => '（那些島嶼……如果夥伴們能在那裡安心休息就好了。派出羈絆 30 的夥伴，登島走到中央石碑，按 E 插旗占領。）'
  ],
  [
    'dock',
    s => !n(s, 'dock'),
    () => '（有了領地，就需要一座能停大船的碼頭。建造選單多了「船隻停靠站」，蓋在木筏邊緣。）'
  ],
  [
    'floors',
    s => n(s, 'floor') < 20,
    s => `（以前老闆總愛說「擴大規模」……這次是為了自己。地基還差 ${20 - n(s, 'floor')} 格，避難所最多撐得起 20 格。）`
  ],
  ['pens', s => n(s, 'pen') < 5, s => `（夥伴越來越多了。展示池還差 ${5 - n(s, 'pen')} 座，上限是 5 座。）`],
  [
    'boat',
    s => (s.expedition?.boatLevel || 0) < 3,
    s =>
      `（小艇只有 LV ${s.expedition?.boatLevel || 0}。船體要升到 3 級，才撐得住融合時的重量。御獸遠航 → 航務與遺跡可以升級。）`
  ],
  [
    'fuse',
    s => !s.ship && !s.shipFusion,
    () => '（一切都準備好了。建造選單最下面那張藍圖——「戰艦」。把避難所與小艇融合吧，材料可不便宜，先存夠再說。）'
  ],
  ['fusing', s => !!s.shipFusion, () => '（龍骨正在海面下成形……再等一下，我的第二個家要出航了。）'],
  [
    'helm',
    s => !s.guide?.helm,
    () => '（這艘船比公司大樓還高。駕駛室在船尾最上層——走主甲板後方的樓梯上去，握住舵輪才能出航。）'
  ],
  [
    'lounge',
    s => !s.ship?.lounge?.length,
    () => '（甲板下第三層是御獸休息室。停在領地附近時，到管理台讓夥伴登船，牠們會陪我遠航。）'
  ],
  [
    'cargo',
    s => !Object.values(s.ship?.cargo || {}).some(v => v > 0),
    () => '（最下面兩層是物資艙。把用不到的材料存進去，背包就輕鬆多了。）'
  ],
  [
    'boss',
    s => !s.expedition?.boss?.defeated,
    () => '（東方 (100, 40) 的海怪……有艦砲和夥伴，或許能贏。掌舵時按空白鍵發射艦砲。）'
  ],
  ['free', () => true, () => '（從通勤機車到比斯泰德號……第二次人生，好像也不壞。去更遠的海看看吧。）']
];
// Story milestones already reached (their "still to do" condition is false). Used for pacing statistics.
export const GUIDE_IDS = STEPS.map(([id]) => id).filter(id => id !== 'free' && id !== 'fusing');
export function guideDone(s) {
  return STEPS.filter(([id, when]) => GUIDE_IDS.includes(id) && !when(s)).map(([id]) => id);
}
// Later milestones skip earlier tutorial lines even if an old save never triggered them.
export function monologue(s) {
  const start = s.ship
    ? 'helm'
    : s.shipFusion
      ? 'fusing'
      : (s.occupied || []).length
        ? 'dock'
        : s.completed
          ? 'buoy'
          : 'salvage';
  const from = STEPS.findIndex(([id]) => id === start);
  for (const [id, when, text] of STEPS.slice(from)) if (when(s)) return { id, text: text(s) };
}
export function markGuide(s, key) {
  s.guide ??= {};
  s.guide[key] = true;
}
