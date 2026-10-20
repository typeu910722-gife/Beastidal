// Protagonist inner monologue doubling as the tutorial: the first unmet step speaks.
const n = (s, t) => s.buildings.filter(b => b.type === t).length;
const STEPS = [
  [
    'salvage',
    s => s.salvaged < 3,
    s => `（……先別慌。社畜的基本功：先盤點資源。靠近漂流木箱，按 E 打撈吧。還差 ${3 - s.salvaged} 件。）`
  ],
  [
    'rescue',
    s => s.rescue === 'tangled' || s.rescue === 'freed',
    s =>
      s.rescue === 'tangled'
        ? '（那團漂流漁網裡……有東西在掙扎？是一隻小小的生物。開過去按 E 解開牠。）'
        : '（牠沒有逃走，還在發抖。分一點口糧給牠吧——靠近按 E。）'
  ],
  [
    'device',
    s => s.device && !s.device.owned,
    () =>
      '（木筏的書桌上……那台破舊的隨身裝置還亮著。登上木筏走到書桌旁按 E，點畫面上「隨身裝置」的光圈，再按「拿起隨身裝置」。）'
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
  [
    'pen',
    s => !n(s, 'pen'),
    s =>
      s.rescue === 'friend'
        ? '（那隻被我救下的小傢伙一直待在木筏邊。蓋一座海洋展示池，給牠一個能回來的家。）'
        : '（研究紀錄說，牠們不是怪物。先蓋一座海洋展示池，給牠們一個能回來的家。）'
  ],
  [
    'tame',
    s => !s.tamed.length,
    () =>
      '（在工作桌做些誘餌，再從「製作物品」做一個外出籠。連續餵同一隻生物，信任到 50% 以上，靠近牠按 X 就能帶回船上。）'
  ],
  [
    'evolve',
    s => s.tamed.length > 0 && !s.tamed.some(p => p.kind !== 'creature'),
    () =>
      '（帶回來的還只是生物，不能出戰。蓋孵化台讓牠們配對，等誰身上出現 3 種比斯基因，再帶著契約書到生物倉庫按「契闊進化」。）'
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
    s => n(s, 'floor') < 12,
    s => `（以前老闆總愛說「擴大規模」……這次是為了自己。地基還差 ${12 - n(s, 'floor')} 格，就撐得起一艘戰艦的龍骨。）`
  ],
  ['pens', s => n(s, 'pen') < 3, s => `（夥伴越來越多了。再蓋 ${3 - n(s, 'pen')} 座展示池，讓大家都有地方露臉。）`],
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
    s => !s.flags?.visitedCabin,
    () =>
      '（從甲板的艙門下去：2F 是御獸艙，御獸會在裡面自由走動；1F 是生物艙，水生的住進水族缸，陸生的在地板上晃。御獸契約最多 10 張，身上最多帶 3 隻。）'
  ],
  [
    'cargo',
    s => !Object.values(s.ship?.cargo || {}).some(v => v > 0),
    () => '（最下面兩層是物資艙。把用不到的材料存進去，背包就輕鬆多了。）'
  ],
  [
    'boss',
    s => !s.expedition?.boss?.defeated,
    () => '（湖心東側最深的水域，有東西在沉城上方游動……有艦砲和夥伴，或許能贏。掌舵時按空白鍵發射艦砲。）'
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
  // 0.67: the pact is sealed — the way over the mountains is chapter one's last step, say where it starts
  if (s.story?.stage === 5 && !s.inTown)
    return {
      id: 'cross',
      text: '（嘯岳答應帶我翻過群山了。把嘯岳派出來，走上環湖的山腳——不是島嶼——按 E 請牠帶我越過去。）'
    };
  // 0.73: the story goes on in the New World — on the lake, say how to get back to it
  // 0.74: chapter four, part two — what you would leave is here, on the lake
  if (s.chapter4?.manager && !s.inTown) {
    const c = s.chapter4,
      beasts = (s.tamed || []).filter(p => p.kind !== 'creature').length;
    if ((c.talked || []).length < Math.min(3, beasts))
      return { id: 'talk', text: '（牠們好像察覺到什麼了。打開選單 › 御獸倉庫，跟牠們好好說說話。）' };
    const kinds = new Set(
      (s.buildings || [])
        .filter(b => !b.stowed && !b.ship && ['shelter', 'collector', 'beacon', 'pen', 'dock', 'desk'].includes(b.type))
        .map(b => b.type)
    );
    if ((c.homeSeen || []).length < Math.min(3, kinds.size))
      return { id: 'home', text: '（回到木筏上走一走。這裡的每一樣東西，都是我親手蓋的。）' };
    // 0.75: 嘯岳 has something to say, then the night, then the last day
    if (!c.xiaoyue) return { id: 'xiaoyue', text: '（嘯岳一直趴在湖邊，看著遠方。去御獸倉庫，跟牠說說話吧。）' };
    if (!c.lastDay) return { id: 'lastnight', text: '（天快黑了。回避難所睡一覺吧。）' };
    if (!c.lastDone) return { id: 'lastday', text: '（今天是最後一天。我想把這裡的一切，都再看一次。）' };
    // 0.76: then back over the mountains, to the bridge
    if (!c.ending)
      return {
        id: 'choose',
        text: '（最後一天過完了。該回去了——把嘯岳派出來，走上環湖的山腳，按 E 翻過群山，到橋那裡。）'
      };
  }
  if ((s.story?.stage || 0) >= 6 && !s.inTown && s.town?.visited && !s.chapter4?.manager)
    return {
      id: 'newworld',
      text: '（新生之界那邊，還有事情沒做完。把嘯岳派出來，走上環湖的山腳，按 E 請牠帶我翻過群山。）'
    };
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

// 0.41 moments of pride: the first time each milestone is reached, the protagonist notices how far they have come.
// Only for real progress (never for chores), and each one speaks once per save.
const PRIDE = [
  ['shelter', s => n(s, 'shelter') > 0, '（以前租的雅房都沒這麼像樣。這是我親手蓋起來的家。）'],
  ['companion', s => s.rescue === 'friend', '（牠在船邊打轉，一直不肯走。上班那幾年，從來沒有誰這樣等過我。）'],
  ['treasure', s => (s.salvaged || 0) >= 30, '（打撈已經是反射動作了。社畜的手速，原來是用在這裡的。）'],
  ['island', s => (s.occupied || []).length > 0, '（一整座島，是我的。以前的我，連一坪房子都買不起。）'],
  ['boat', s => (s.expedition?.boatLevel || 0) >= 3, '（這艘小艇現在跑得比誰都快。浪再大，也追不上我了。）'],
  ['ship', s => !!s.ship, '（那天沒能抵達公司。現在，我有一艘載著整個家的戰艦。）'],
  ['warden', s => !!s.expedition?.boss?.defeated, '（守望者沉下去了。這片海，從今天起會記住我的名字。）']
];
export function pride(s) {
  s.prideSeen ??= [];
  for (const [id, when, text] of PRIDE) if (!s.prideSeen.includes(id) && when(s)) return { id, text };
  return null;
}
export function markPride(s, id) {
  s.prideSeen ??= [];
  if (!s.prideSeen.includes(id)) s.prideSeen.push(id);
}
