import {
  normalizeExpansion,
  activePet,
  EXPLORE,
  stormAt,
  toggleRide,
  toggleDive,
  attack,
  explore,
  tickExpansion,
  trainPet,
  commandPet
} from './expansion.js?v=0.14.0';
import { renderAdventure } from './expansion-ui.js?v=0.14.0';
import {
  normalizeShip,
  tickShip,
  shipDockOption,
  boardShip,
  launchSkiff,
  stowSkiff,
  nearShip,
  disembark,
  takeHelm,
  leaveHelm,
  climbShip,
  transferCargo,
  toggleLounge,
  fireCannon,
  shipPointsWorld,
  claimIsland,
  startFusion,
  fusionChecks,
  warshipRevealed,
  FUSION_COST,
  LIMITS,
  DECKS,
  LOUNGE_CAPACITY,
  CARGO_CAPACITY,
  cargoTotal,
  nearBeastHome,
  restIsland
} from './ship.js?v=0.14.0';
import { monologue, markGuide } from './guide.js?v=0.14.0';
import { climb, demolish, relocate } from './construction.js?v=0.14.0';
import {
  normalizeHousing,
  penId,
  pens,
  occupants,
  reserved,
  used,
  movePet,
  renamePet,
  penLabel,
  renamePen
} from './housing.js?v=0.14.0';
import { ISLANDS, NODES, onIsland, islandAt, islandDocks, harvest, clearLand } from './islands.js?v=0.14.0';
import { facilityId, findFacility, useFacility } from './facilities.js?v=0.14.0';
import { OceanWorld, IntroFilm } from './world.js?v=0.14.0';
import { QUALITY } from './realism.js?v=0.14.0';
import { MusicPlayer, WaterRush, playSplash, soundPref } from './sound.js?v=0.14.0';
import { promptText, promptDom, PAD } from './prompts.js?v=0.14.0';
import { LANG, LANGS, setLang, tr, watch, localize, setPostProcess } from './i18n.js?v=0.14.0';
import { TUTORIAL, startTutorialState, advanceTutorial, tutorialActive } from './tutorial.js?v=0.14.0';
import { stepVessel, HULLS, bump, startFlee, stepFlee, turnToward } from './physics.js?v=0.14.0';
import { CONFIG } from './config.js?v=0.14.0';
import { ACHIEVEMENTS, checkUnlocks, achievementCount } from './achievements.js?v=0.14.0';
import { normalizeCodex, recordCreature, syncOwned, codexProgress, codexEntries } from './codex.js?v=0.14.0';
import { seaGenome, ensureLandBeasts, normalizeWildlife, stepLandBeast } from './wildlife.js?v=0.14.0';
import {
  RARITY,
  FRENZY,
  rarityOf,
  baitCost,
  frenzied,
  normalizeTaming,
  rollTame,
  craftContract,
  contract
} from './taming.js?v=0.14.0';
import { DEVICE_APPS, normalizeDevice, takeDevice, readLaptop, tickDevice } from './device.js?v=0.14.0';
import { BeastStage } from './beast-stage.js?v=0.14.0';
import { spawnRescue, freeRescue, shareFood, tickRescue } from './rescue.js?v=0.14.0';
import {
  funds,
  normalizeBag,
  migrateBag,
  bagUsed,
  bagCap,
  bagRoom,
  bagFullError,
  give,
  deposit,
  takeSupplies,
  upgradeBag,
  nextBag,
  atHome
} from './bag.js?v=0.14.0';
import {
  homePos,
  facilityPos,
  nearFacility,
  pendingFacilities,
  usedSlots,
  installFacility,
  stowFacility,
  SHIP_SLOTS,
  FORTRESS_DECK,
  isStructure
} from './fortress.js?v=0.14.0';
import { normalizeStats, tickStats, formatDuration, milestoneRows, statsReport } from './stats.js?v=0.14.0';
export const GAME_VERSION = '0.14.0';
import { CloudSave } from './cloud-save.js?v=0.14.0';
import {
  readLocal,
  writeLocal,
  readMeta,
  markSynced,
  slotKey,
  activeSlot,
  setActiveSlot,
  listSlots,
  exportSave,
  importSave,
  forgetLocal,
  SLOT_COUNT,
  reconcile,
  describeSave,
  formatTime
} from './save-store.js?v=0.14.0';
import { normalizeTravel, canWalk, dockOption, switchVessel, moveTravel, dockingSpots } from './navigation.js?v=0.14.0';
import { phenotype, describeGenes, dnaCode, ABILITIES, clamp, makeGenome, geneName } from './genetics.js?v=0.14.0';
import {
  RESOURCE_NAMES,
  RESOURCE_ICONS,
  RECIPES,
  createState,
  count,
  dayOf,
  canPay,
  salvage,
  placeBuilding,
  placeOnShip,
  craftBait,
  feed,
  breed,
  useSupply,
  tickSystems,
  validateSave,
  log,
  uid
} from './rules.js?v=0.14.0';
import { DAY, dayPhase, hourOf, isNight, nextMorning } from './clock.js?v=0.14.0';
const $ = id => document.getElementById(id),
  esc = s =>
    String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// Studio splash: pure CSS animation in index.html; this only removes it when done or skipped (tap / key).
// ?debug skips it so automated tests can start right away.
(() => {
  const el = document.getElementById('splash');
  if (!el) return;
  const done = () => el.classList.add('done');
  if (new URLSearchParams(location.search).has('debug')) return done();
  el.addEventListener('animationend', e => e.target === el && done());
  el.addEventListener('pointerdown', done);
  addEventListener('keydown', done, { once: true });
  setTimeout(done, 7600);
})();
let state = createState(),
  hasSave = false,
  storageOk = true,
  slot = 1;
try {
  slot = activeSlot(localStorage);
  const v = readLocal(localStorage, slotKey(slot), validateSave);
  if (v) {
    state = v;
    hasSave = true;
  }
} catch (e) {
  storageOk = false;
}
try {
  navigator.storage?.persist?.();
} catch {}
// Optional Google Drive sync. Guest play never touches the network.
const cloud = new CloudSave({ config: CONFIG });
cloud.setSlot(slot);
let cloudStatus = cloud.signedIn ? 'idle' : 'off',
  cloudLast = 0,
  cloudTimer = null,
  cloudReady = false;
normalizeExpansion(state);
normalizeTravel(state);
normalizeHousing(state);
normalizeShip(state);
let orientationBlocked = false,
  activeFacility = null,
  buildLevel = 0;
function releaseMouse() {
  if (document.pointerLockElement) document.exitPointerLock?.();
}
function lockMouse() {
  if (touchDevice() || !world?.firstPerson || !running || panel || paused || gamepadActive) return;
  try {
    const promise = $('ocean').requestPointerLock?.();
    promise?.catch?.(() => toast('點一下畫面啟用滑鼠環視；也可按住右鍵拖曳。'));
  } catch {
    toast('可按住滑鼠右鍵拖曳環視。');
  }
}
const touchDevice = () => !!(navigator.maxTouchPoints > 0 || window.matchMedia?.('(pointer:coarse)').matches);
let world,
  running = false,
  panel = null,
  paused = false,
  film = null,
  destination = null,
  selectedTarget = null,
  nearest = null,
  salvaging = null,
  buildType = null,
  buildRot = 0,
  gamepadActive = false,
  lastInput = 'keyboard',
  geneTab = 'collection',
  cameraDrag = null,
  keys = new Set(),
  joystick = { x: 0, y: 0 },
  modalRestore = null,
  repelCooldown = 0,
  attackCooldown = 0,
  uiTimer = 0,
  saveTimer = 0,
  spawnTimer = 0,
  discoveryTimer = 0,
  panelTimer = 0,
  frameTime = 0,
  padGridTimer = 0,
  preferParents = ['', ''],
  menuFocus = null;
let padPrevious = [],
  padNavCooldown = 0;
// Sound cues on the intro film clock (seconds): honks, skid, impact, fading heartbeat.
const FILM_CUES = [
  [4.9, () => audio.horn(0.32, 0.08)],
  [5.45, () => audio.horn(0.28, 0.1)],
  [5.85, () => audio.horn(1, 0.14)],
  [6.3, () => audio.screech()],
  [6.8, () => audio.crash()],
  [8.8, () => audio.heart(1)],
  [9.7, () => audio.heart(0.65)],
  [10.7, () => audio.heart(0.35)]
];
const lootNames = ['漂流木束', '失落工具箱', '密封補給桶', '異晶研究箱', '漂流貨箱'];
const audio = {
  ctx: null,
  on: false,
  gain: null,
  start() {
    if (!this.ctx) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return;
      this.ctx = new A();
      for (const bus of ['sfx', 'amb', 'mus']) {
        this[bus] = this.ctx.createGain();
        this[bus].connect(this.ctx.destination);
      }
      applyVolumes();
      const sr = this.ctx.sampleRate,
        b = this.ctx.createBuffer(1, sr * 4, sr),
        data = b.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = (last + 0.018 * (Math.random() * 2 - 1)) / 1.02;
        data[i] = last * 3;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = b;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600;
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0.18;
      src.connect(filter).connect(this.gain).connect(this.amb);
      src.start();
      this.music = new MusicPlayer(this.ctx, this.mus, GAME_VERSION);
      this.rush = new WaterRush(this.ctx, this.amb);
    }
    this.ctx.resume();
    this.on = true;
    this.gain.gain.setTargetAtTime(0.18, this.ctx.currentTime, 0.5);
  },
  stop() {
    this.on = false;
    if (this.ctx) this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
    this.music?.stop();
    this.rush?.set(0);
  },
  splash(strength = 1, quiet = false) {
    if (this.on && this.ctx) playSplash(this.ctx, this.sfx, quiet ? strength * 0.6 : strength);
  },
  motion(speed) {
    if (this.on) this.rush?.set(speed);
  },
  mood(m) {
    if (this.on && this.music) this.music.play(m);
  },
  note(freq = 600, dur = 0.12) {
    if (!this.on || !this.ctx) return;
    const o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.065, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g).connect(this.sfx);
    o.start();
    o.stop(this.ctx.currentTime + dur);
  }, // Truck air horn: detuned sawtooth chord through a lowpass, rising as the truck approaches.
  horn(dur = 0.6, vol = 0.11) {
    if (!this.on || !this.ctx) return;
    const c = this.ctx,
      t = c.currentTime,
      lp = c.createBiquadFilter(),
      g = c.createGain();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.setValueAtTime(vol, t + dur - 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.08);
    lp.connect(g).connect(this.sfx);
    for (const f of [185, 233, 277]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t);
      o.frequency.linearRampToValueAtTime(f * 1.03, t + dur);
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
  },
  noise(dur) {
    const c = this.ctx,
      b = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate),
      d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource();
    s.buffer = b;
    return s;
  },
  screech() {
    if (!this.on || !this.ctx) return;
    const c = this.ctx,
      t = c.currentTime,
      s = this.noise(0.7),
      bp = c.createBiquadFilter(),
      g = c.createGain();
    bp.type = 'bandpass';
    bp.Q.value = 12;
    bp.frequency.setValueAtTime(3200, t);
    bp.frequency.linearRampToValueAtTime(2100, t + 0.6);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.68);
    s.connect(bp).connect(g).connect(this.sfx);
    s.start(t);
  },
  // Impact: low body thump + metal crunch + glass shatter, then ambient ducks and the ears ring.
  crash() {
    if (!this.on || !this.ctx) return;
    const c = this.ctx,
      t = c.currentTime,
      out = c.createGain();
    out.gain.value = 1;
    out.connect(this.sfx);
    const o = c.createOscillator(),
      og = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(32, t + 0.45);
    og.gain.setValueAtTime(0.55, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    o.connect(og).connect(out);
    o.start(t);
    o.stop(t + 0.65);
    const n = this.noise(0.9),
      lp = c.createBiquadFilter(),
      ng = c.createGain();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(5000, t);
    lp.frequency.exponentialRampToValueAtTime(300, t + 0.8);
    ng.gain.setValueAtTime(0.45, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
    n.connect(lp).connect(ng).connect(out);
    n.start(t);
    for (const [f, d] of [
      [420, 0.5],
      [611, 0.4],
      [893, 0.35],
      [1270, 0.3]
    ]) {
      const m = c.createOscillator(),
        mg = c.createGain();
      m.type = 'square';
      m.frequency.setValueAtTime(f, t);
      m.frequency.exponentialRampToValueAtTime(f * 0.82, t + d);
      mg.gain.setValueAtTime(0.05, t);
      mg.gain.exponentialRampToValueAtTime(0.001, t + d);
      m.connect(mg).connect(out);
      m.start(t);
      m.stop(t + d);
    }
    const gl = this.noise(1.1),
      hp = c.createBiquadFilter(),
      gg = c.createGain();
    hp.type = 'highpass';
    hp.frequency.value = 4200;
    gg.gain.setValueAtTime(0, t + 0.04);
    gg.gain.linearRampToValueAtTime(0.2, t + 0.07);
    gg.gain.exponentialRampToValueAtTime(0.001, t + 1.05);
    gl.connect(hp).connect(gg).connect(out);
    gl.start(t + 0.04);
    if (this.gain) {
      this.gain.gain.cancelScheduledValues(t);
      this.gain.gain.setTargetAtTime(0.015, t + 0.1, 0.15);
      this.gain.gain.setTargetAtTime(0.18, t + 9, 1.2);
    }
    const ring = c.createOscillator(),
      rg = c.createGain();
    ring.frequency.value = 3600;
    rg.gain.setValueAtTime(0, t + 0.5);
    rg.gain.linearRampToValueAtTime(0.025, t + 1.2);
    rg.gain.exponentialRampToValueAtTime(0.001, t + 6.5);
    ring.connect(rg).connect(this.sfx);
    ring.start(t + 0.5);
    ring.stop(t + 6.6);
  },
  heart(vol = 1) {
    if (!this.on || !this.ctx) return;
    const c = this.ctx,
      t = c.currentTime;
    for (const d of [0, 0.22]) {
      const o = c.createOscillator(),
        g = c.createGain();
      o.frequency.setValueAtTime(62, t + d);
      o.frequency.exponentialRampToValueAtTime(38, t + d + 0.16);
      g.gain.setValueAtTime(0.32 * vol * (d ? 0.7 : 1), t + d);
      g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.2);
      o.connect(g).connect(this.sfx);
      o.start(t + d);
      o.stop(t + d + 0.22);
    }
  }
};
function updateViewport() {
  const width = window.visualViewport?.width || innerWidth,
    height = window.visualViewport?.height || innerHeight;
  document.documentElement.style.setProperty('--game-height', height + 'px');
  document.body.classList.toggle('touch-device', touchDevice());
  document.body.classList.toggle('landscape-play', width > height && height < 700 && touchDevice());
  orientationBlocked = touchDevice() && width < height && width < 650 && !!(running || film);
  $('rotate-screen').hidden = !orientationBlocked;
  if (orientationBlocked) {
    keys.clear();
    joystick = { x: 0, y: 0 };
    cameraDrag = null;
  }
  world?.resize();
  film?.resize();
}
async function fullscreen() {
  try {
    if (!document.fullscreenElement) {
      if (!document.documentElement.requestFullscreen) {
        toast('請手動橫放手機；若無法旋轉，請關閉直向鎖定。');
        return;
      }
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
    if (touchDevice() && window.screen?.orientation?.lock) {
      try {
        await window.screen.orientation.lock('landscape');
      } catch {}
    }
    updateViewport();
  } catch {
    toast('此瀏覽器未啟用全螢幕，仍可手動橫放手機遊玩。');
  }
}
// With the warship the dock button follows the ship, except while the skiff is out exploring on its own.
const shipControls = () => {
  if (!state.ship) return false;
  const m = state.player.mode;
  if (!state.skiff || m === 'aboard' || m === 'ship') return true;
  return m === 'boat' ? !!shipDockOption(state) : !state.player.level && !state.inCave && nearShip(state, 6);
};
function updateDock() {
  if (shipControls()) {
    const o = shipDockOption(state),
      m = state.player.mode;
    $('dock-btn').hidden = !running || paused || !!panel || !!buildType || !!salvaging || !o;
    $('dock-label').textContent = o?.label || '';
    $('dock-detail').textContent = o?.detail || '';
    $('dock-btn').querySelector('kbd').textContent = gamepadActive ? 'LT' : 'Q';
    $('travel-mode').textContent =
      m === 'aboard'
        ? '比斯泰德號 · ' + DECKS[state.player.deck].name
        : m === 'ship'
          ? '掌舵航行 · 駕駛室'
          : onIsland(state.player.x, state.player.z)?.name || '避難所步行';
    $('travel-tip').textContent = P(
      m === 'aboard'
        ? state.player.deck === 4
          ? '走到舵輪前按 E 掌舵'
          : '樓梯在船身中央，按 E 上下層'
        : m === 'ship'
          ? '按空白鍵發射艦砲 · 按 Q 離開舵輪'
          : '走近戰艦按 Q 登船'
    );
    return;
  }
  const spot = dockOption(state),
    foot = state.player.mode === 'foot';
  $('dock-btn').hidden = !running || paused || !!panel || !!buildType || !!salvaging || (!foot && !spot?.near);
  $('dock-label').textContent = foot
    ? spot?.near
      ? '登艇出海'
      : '返回停泊處'
    : spot?.island
      ? '登上' + spot.name
      : '登上避難所';
  $('dock-detail').textContent = foot ? '取回停泊的小艇' : spot?.island ? '下船，探索島嶼' : '下船，踏上木筏';
  $('dock-btn').querySelector('kbd').textContent = gamepadActive ? 'LT' : 'Q';
  $('travel-mode').textContent = foot ? onIsland(state.player.x, state.player.z)?.name || '避難所步行' : '海上航行';
  $('travel-tip').textContent = foot ? '走近採集點或建築，按 E 互動' : '靠近木筏或島嶼可登岸';
  $('joystick').setAttribute('aria-label', foot ? '拖曳移動角色' : '拖曳駕艇');
}
function dock() {
  if (state.inCave) {
    toast('請先離開洞窟。');
    return;
  }
  if (state.expedition?.mounted) {
    toast('先返回小艇附近，按 T 解除騎乘後再登岸。');
    return;
  }
  if (!running || paused || panel || buildType) return;
  // A line still out: haul the item aboard if it is in reach, otherwise let the line go, then dock.
  if (salvaging) {
    const l = state.loot.find(l => l.id === salvaging.id);
    if (l && Math.hypot(l.x - state.player.x, l.z - state.player.z) <= 10) {
      l.x = state.player.x;
      l.z = state.player.z;
      finishSalvage();
    } else {
      salvaging = null;
      $('salvage-progress').hidden = true;
    }
  }
  if (shipControls()) {
    const m = state.player.mode,
      o = shipDockOption(state);
    const res =
      o?.mode === 'stow-skiff'
        ? stowSkiff(state)
        : o?.mode === 'launch-skiff'
          ? launchSkiff(state)
          : m === 'foot'
            ? boardShip(state)
            : m === 'ship'
              ? leaveHelm(state)
              : disembark(state);
    toast(res.ok ? res.message : res.error, !res.ok);
    if (res.ok) {
      destination = null;
      selectedTarget = null;
      keys.clear();
      joystick = { x: 0, y: 0 };
      world.sync(state);
      const landed = state.player.mode === 'foot' && onIsland(state.player.x, state.player.z);
      if (landed) {
        state.visitedIslands ??= [];
        if (!state.visitedIslands.includes(landed.id)) {
          state.visitedIslands.push(landed.id);
          discover('新島嶼 · ' + landed.name, '走近採集點按 E 採集；島中央石碑可插旗占領。');
        }
      }
      audio.note(540, 0.18);
      updateDock();
      updateNearest();
      updateUI();
      save(true);
    }
    return;
  }
  if (state.shipFusion && state.player.mode === 'foot') {
    toast('小艇正在與避難所融合，暫時無法出航。', true);
    return;
  }
  const result = switchVessel(state);
  if (!result.ok) {
    if (state.player.mode === 'foot' && result.spot) {
      destination = { ...result.spot.foot };
      toast('停泊處已標記，走近後再按登艇。');
    } else toast(result.error, true);
    return;
  }
  destination = null;
  selectedTarget = null;
  nearest = null;
  keys.clear();
  joystick = { x: 0, y: 0 };
  world.sync(state);
  const landed = onIsland(state.player.x, state.player.z);
  if (result.mode === 'foot' && landed) {
    state.visitedIslands ??= [];
    if (!state.visitedIslands.includes(landed.id)) {
      state.visitedIslands.push(landed.id);
      log(state, '發現：' + landed.name, '海底隆起的礁島，岸上散落著可採集物資。走近採集點按 E，兩分鐘後資源會恢復。');
      discover('新島嶼 · ' + landed.name, '走近木堆、海椰果與異晶，按 E 採集。');
    }
  }
  toast(result.mode === 'foot' ? '已登岸。用 WASD 步行，走近物件按 E 互動。' : '已登艇，可以繼續出海。');
  audio.note(540, 0.18);
  updateDock();
  updateNearest();
  updateUI();
  save(true);
}

// Which controls the player is using right now: drives every on-screen key hint (settings can pin one style).
let sawKey = false,
  promptMode = '';
function inputMode() {
  const pin = world?.settings?.prompts;
  if (pin && pin !== 'auto') return pin;
  if (gamepadActive && lastInput === 'gamepad') return 'gamepad';
  if (lastInput === 'touch') return 'touch';
  if (!sawKey && lastInput !== 'mouse' && touchDevice()) return 'touch';
  return 'keyboard';
}
const P = t => promptText(tr(t), inputMode(), LANG);
// Panels are built from Chinese, keyboard-worded HTML: translate synchronously, then re-word key hints.
function promptPanel(root, mode = inputMode()) {
  localize(root);
  promptDom(root, mode, LANG);
}
setPostProcess(t => promptText(t, inputMode(), LANG));
watch();
// Re-labels key badges and hints whenever the input device changes.
function refreshPrompts(force = false) {
  const m = inputMode();
  if (m === promptMode && !force) return;
  promptMode = m;
  document.body.dataset.input = m;
  document.querySelectorAll('#hud kbd,#dock-btn kbd').forEach(k => {
    k.dataset.key ??= k.textContent.trim();
    const key = k.dataset.key.toUpperCase();
    k.textContent = m === 'gamepad' && PAD[key] ? PAD[key] : k.dataset.key;
  });
  const hint = document.querySelector('.control-hint');
  if (hint) {
    hint.dataset.kb ??= hint.innerHTML;
    hint.innerHTML =
      m === 'gamepad'
        ? '<span><kbd>左搖桿</kbd> 駕艇 · <kbd>右搖桿</kbd> 環視</span><span><kbd>十字↑↓</kbd> 縮放 · <kbd>Ⓐ</kbd> 互動</span><span><kbd>RT</kbd> 驅離 · <kbd>Start</kbd> 暫停</span>'
        : hint.dataset.kb;
  }
  const mono = $('monologue');
  if (mono?.dataset.raw) mono.querySelector('p').textContent = P(mono.dataset.raw);
  const qh = $('quest-hint');
  if (qh?.dataset.raw) qh.textContent = P(qh.dataset.raw);
  if (panel) promptPanel($('drawer-body'), m);
  if (typeof updateTutorial === 'function') updateTutorial(true);
}
// Vibration on phones (Android; iOS browsers ignore it) and rumble on gamepads that support it.
const HAPTICS = {
  pickup: [12],
  repel: [28],
  bump: [22],
  hit: [70, 40, 70],
  discover: [20, 50, 30],
  storm: [50, 90, 50]
};
function haptic(kind) {
  if (world?.settings?.haptics === false) return;
  const pat = HAPTICS[kind];
  if (!pat) return;
  const m = inputMode();
  if (m === 'touch')
    try {
      navigator.vibrate?.(pat);
    } catch {}
  else if (m === 'gamepad') {
    const pad = [...(navigator.getGamepads?.() || [])].find(p => p?.connected && p.vibrationActuator);
    const dur = pat.reduce((a, b) => a + b, 0),
      strong = kind === 'hit' || kind === 'storm' ? 0.8 : kind === 'bump' ? 0.5 : 0.2;
    pad?.vibrationActuator
      .playEffect?.('dual-rumble', { duration: dur, strongMagnitude: strong, weakMagnitude: Math.min(1, strong + 0.2) })
      .catch?.(() => {});
  }
}
const RESOURCE_BAR = ['wood', 'metal', 'fiber', 'crystal']; // same order as updateUI's resource bar
// Collected resources rise from where they were picked up and fly into the resource bar (or the bag button).
function flyResources(rewards, wx, wy, wz) {
  const entries = Object.entries(rewards).filter(([, v]) => v > 0);
  if (!entries.length) return;
  const reduce = matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce || $('hud').hidden) {
    toast(entries.map(([k, v]) => `${RESOURCE_NAMES[k]} +${v}`).join('　'));
    return;
  }
  const cv = $('ocean').getBoundingClientRect(),
    from = world.screenPoint(wx, wy, wz),
    sx = cv.left + (from.visible ? from.x : cv.width / 2),
    sy = cv.top + (from.visible ? from.y : cv.height / 2);
  entries.forEach(([k, v], i) => {
    const el = document.createElement('div');
    el.className = 'fly-chip';
    el.innerHTML = `<span>${RESOURCE_ICONS[k] || '＋'}</span>+${v} ${esc(RESOURCE_NAMES[k])}`;
    el.style.left = sx + 'px';
    el.style.top = sy + 'px';
    document.body.append(el);
    requestAnimationFrame(() => {
      el.style.top = sy - 34 - i * 26 + 'px';
      el.classList.add('shown');
    });
    setTimeout(
      () => {
        const idx = RESOURCE_BAR.indexOf(k),
          target = idx >= 0 ? $('resources').children[idx] : document.querySelector('[data-panel="device"]'),
          tr = target?.getBoundingClientRect(),
          y0 = sy - 34 - i * 26;
        if (tr && tr.width) {
          el.classList.add('flying');
          el.style.transform = `translate(${tr.left + tr.width / 2 - sx}px,${tr.top + tr.height / 2 - y0}px) scale(.45)`;
        } else el.style.opacity = 0;
        setTimeout(() => {
          el.remove();
          const t2 = idx >= 0 ? $('resources').children[idx] : target;
          if (t2) {
            t2.classList.remove('bump');
            void t2.offsetWidth;
            t2.classList.add('bump');
          }
        }, 600);
      },
      650 + i * 110
    );
  });
}
// At most three toasts on screen: a new one pushes out the oldest, and a repeat of one still showing is dropped.
const MAX_TOASTS = 3;
function toast(text, error = false) {
  const box = $('toasts'),
    shown = [...box.children].filter(el => !el.classList.contains('fading'));
  if (shown.some(el => el.textContent === P(text))) return;
  for (const old of shown.slice(0, Math.max(0, shown.length - MAX_TOASTS + 1))) old.remove();
  const el = document.createElement('div');
  el.className = 'toast' + (error ? ' error' : '');
  el.textContent = P(text);
  box.append(el);
  setTimeout(() => {
    el.classList.add('fading');
    setTimeout(() => el.remove(), 400);
  }, 3200);
}
function discover(title, text) {
  $('discovery').querySelector('h2').textContent = title;
  $('discovery').querySelector('.discovery-text').textContent = P(text);
  $('discovery').hidden = false;
  discoveryTimer = 5.5;
  haptic('discover');
  audio.note(780, 0.6);
}
function save(silent = false) {
  try {
    writeLocal(localStorage, slotKey(slot), state, Date.now(), slot);
    storageOk = true;
    hasSave = true;
    scheduleCloud();
    $('save-status').textContent = saveLabel();
    if (!silent) {
      toast('已保存這段漂流。');
      flashSaveStatus();
    }
  } catch (e) {
    storageOk = false;
    $('save-status').textContent = '存檔不可用 · 請允許瀏覽器儲存';
    $('save-status').classList.add('show');
    if (!silent) toast('無法存檔，請確認瀏覽器允許儲存資料。', true);
  }
}
// The save line stays out of the way; it shows briefly after manual saves, cloud changes and errors.
let saveFlash = 0;
function flashSaveStatus(ms = 3500) {
  const el = $('save-status');
  el.classList.add('show');
  clearTimeout(saveFlash);
  saveFlash = setTimeout(() => storageOk && el.classList.remove('show'), ms);
}
function saveLabel() {
  if (!storageOk) return '存檔不可用 · 請允許瀏覽器儲存';
  const c =
    {
      synced: ' ＋ Google Drive',
      syncing: ' · 雲端同步中…',
      connecting: ' · 連線 Google…',
      offline: ' · 雲端離線，稍後重試',
      reconnect: ' · 雲端需重新連線',
      idle: ' · Google 未連線'
    }[cloudStatus] || '';
  return '已自動存檔 · 此裝置' + c;
}
function setCloud(status) {
  const changed = status !== cloudStatus;
  cloudStatus = status;
  $('save-status').textContent = saveLabel();
  if (changed && running) flashSaveStatus();
  updateAccountUI();
}
function updateAccountUI() {
  const box = $('account-box');
  if (!box) return;
  const a = cloud.account,
    busy = cloudStatus === 'connecting' || cloudStatus === 'syncing';
  $('account-text').innerHTML = a
    ? `<b>${esc(a.email || a.name)}</b><br>${cloud.connected ? (cloudStatus === 'synced' ? '已同步到 Google Drive' : cloudStatus === 'syncing' ? '同步中…' : '已連線 Google Drive') : '開始遊戲時自動連線並同步雲端'}`
    : cloud.configured
      ? '<b>免登入單機體驗</b><br>進度自動保存在此裝置；登入 Google 可備份到雲端'
      : '<b>單機體驗版</b><br>進度自動保存在此裝置';
  $('google-btn').hidden = !cloud.configured;
  $('google-btn').disabled = busy;
  $('google-btn-text').textContent = busy
    ? '連線中…'
    : a
      ? cloud.connected
        ? '立即同步雲端存檔'
        : '連線 Google Drive'
      : 'Google 登入 · 雲端存檔';
  $('signout-btn').hidden = !a;
}
// Uploads only after this session reconciled with the cloud, so a stale device never overwrites newer progress.
function scheduleCloud(now = false) {
  if (!cloud.signedIn || !cloudReady) return;
  if (!cloud.connected && !cloud.native()) {
    if (cloudStatus === 'synced') setCloud('reconnect');
    return;
  }
  clearTimeout(cloudTimer);
  const wait = now ? 0 : Math.max(0, CONFIG.cloudSyncInterval * 1000 - (Date.now() - cloudLast));
  cloudTimer = setTimeout(pushCloud, wait);
}
async function pushCloud() {
  if (!cloud.signedIn || !hasSave) return;
  const account = cloud.account.id,
    savedAt = readMeta(localStorage, slot).savedAt;
  setCloud('syncing');
  try {
    await cloud.upload(structuredClone(state), savedAt);
    if (cloud.account?.id !== account) return;
    markSynced(localStorage, account, savedAt, slot);
    cloudLast = Date.now();
    setCloud('synced');
  } catch (e) {
    setCloud(e.code === 'offline' ? 'offline' : 'reconnect');
    if (e.code === 'offline') cloudTimer = setTimeout(pushCloud, 30000);
  }
}
function chooseSave(localState, localAt, cloudState, cloudAt) {
  return new Promise(resolve =>
    modal(
      'CLOUD SAVE · 選擇存檔',
      '此裝置與 Google Drive 的進度不同',
      `<p>請選擇要保留哪一份進度，另一份將被覆蓋。</p><p><strong>此裝置</strong>：${esc(describeSave(localState))}<br><small>${formatTime(localAt)}</small></p><p><strong>Google Drive</strong>：${esc(describeSave(cloudState))}<br><small>${formatTime(cloudAt)}</small></p>`,
      [
        {
          label: '使用雲端進度',
          primary: cloudAt > localAt,
          action: () => {
            closeModal();
            resolve('cloud');
          }
        },
        {
          label: '使用此裝置進度',
          primary: cloudAt <= localAt,
          action: () => {
            closeModal();
            resolve('local');
          }
        }
      ]
    )
  );
}
function adoptState(v, savedAt) {
  if (!validateSave(v)) throw new Error('雲端存檔內容無效。');
  state = v;
  hasSave = true;
  writeLocal(localStorage, slotKey(slot), state, savedAt, slot);
  destination = null;
  selectedTarget = null;
  salvaging = null;
  world.sync(state);
  if (running) beginGame(false);
  else updateTitleButtons();
}
// Signs in (interactive) or reconnects a remembered account, then reconciles device and cloud copies.
async function connectCloud(interactive) {
  if (!cloud.configured) return false;
  cloudReady = false;
  setCloud('connecting');
  try {
    await cloud.signIn({ interactive });
    const id = cloud.account.id,
      meta = readMeta(localStorage, slot),
      remote = await cloud.remoteInfo();
    const decision = reconcile(hasSave ? { savedAt: meta.savedAt } : null, remote, meta.synced[id] || 0);
    if (decision === 'download' || decision === 'conflict') {
      const d = await cloud.download();
      let pick = 'cloud';
      if (decision === 'conflict') pick = await chooseSave(state, meta.savedAt, d.state, d.savedAt);
      if (pick === 'cloud') {
        adoptState(d.state, d.savedAt);
        markSynced(localStorage, id, d.savedAt, slot);
        toast('已載入 Google Drive 上的進度。');
      } else {
        setCloud('idle');
        await pushCloud();
      }
    } else if (decision === 'upload') {
      await pushCloud();
    } else if (decision === 'same') markSynced(localStorage, id, meta.savedAt, slot);
    cloudReady = true;
    cloudLast = Date.now();
    setCloud('synced');
    if (interactive) toast(`已登入 ${cloud.account.email || cloud.account.name}，進度會同步到 Google Drive。`);
    return true;
  } catch (e) {
    setCloud(cloud.signedIn ? (e.code === 'offline' ? 'offline' : 'reconnect') : 'off');
    toast(e.message || 'Google 連線失敗。', true);
    return false;
  }
}
async function signOutCloud() {
  clearTimeout(cloudTimer);
  if (cloud.connected && hasSave) {
    save(true);
    try {
      await cloud.upload(structuredClone(state), readMeta(localStorage, slot).savedAt);
    } catch {}
  }
  cloudReady = false;
  await cloud.signOut();
  setCloud('off');
  toast('已登出 Google。進度仍保存在此裝置，可繼續單機遊玩。');
}
function cloudMenuHTML() {
  const a = cloud.account;
  const where = a
    ? `此裝置＋Google Drive（<strong>${esc(a.email || a.name)}</strong>）`
    : '<strong>此裝置</strong>（免登入單機模式）';
  return `<p>進度保存在${where}。${a ? '每次存檔後最多 ' + CONFIG.cloudSyncInterval + ' 秒內同步到雲端。' : cloud.configured ? '登入 Google 後可備份到 Google Drive，換裝置也能接續。' : ''}關閉畫面時世界會暫停。</p>`;
}
function modal(eyebrow, title, body, buttons) {
  releaseMouse();
  paused = true;
  keys.clear();
  joystick = { x: 0, y: 0 };
  modalRestore = document.activeElement;
  $('modal-eyebrow').textContent = eyebrow;
  $('modal-title').textContent = title;
  $('modal-body').innerHTML = body;
  $('modal-actions').innerHTML = '';
  for (const b of buttons) {
    const el = document.createElement('button');
    el.textContent = b.label;
    if (b.primary) el.className = 'primary';
    el.addEventListener('click', b.action);
    $('modal-actions').append(el);
  }
  $('modal-shade').hidden = false;
  $('modal-actions').querySelector('button')?.focus();
}
function closeModal() {
  paused = false;
  $('modal-shade').hidden = true;
  modalRestore?.focus?.();
}
// Title-screen buttons reflect the active slot.
function updateTitleButtons() {
  $('start-btn').textContent = hasSave ? '繼續這段漂流' : '開始第二次人生';
  $('new-btn').hidden = !hasSave;
  $('slots-btn').textContent = `💾 存檔槽 · 目前存檔 ${slot}`;
}
// Load another slot (title screen only); its cloud copy is reconciled the next time the game starts.
function useSlot(n) {
  slot = n;
  setActiveSlot(localStorage, n);
  cloud.setSlot(n);
  cloudReady = false;
  let v = null;
  try {
    v = readLocal(localStorage, slotKey(n), validateSave);
  } catch {}
  state = v || createState();
  hasSave = !!v;
  destination = null;
  selectedTarget = null;
  salvaging = null;
  world.sync(state);
  updateTitleButtons();
}
function downloadSave(n) {
  const v = readLocal(localStorage, slotKey(n), validateSave);
  if (!v) return;
  const blob = new Blob([exportSave(v, readMeta(localStorage, n).savedAt)], { type: 'application/json' }),
    a = document.createElement('a'),
    d = new Date();
  a.href = URL.createObjectURL(blob);
  a.download = `beastidal-save${n}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
  toast(`已匯出存檔 ${n}。`);
}
function uploadSave(n) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const { state: v, savedAt } = importSave(await file.text(), validateSave);
      const write = () => {
        writeLocal(localStorage, slotKey(n), v, savedAt, n);
        if (n === slot) useSlot(n);
        toast(`已匯入到存檔 ${n}。`);
        openSlots();
      };
      if (readLocal(localStorage, slotKey(n), validateSave))
        modal('IMPORT · 匯入存檔', `覆蓋存檔 ${n}？`, `<p>存檔 ${n} 已有進度，匯入後會被取代。</p>`, [
          { label: '取消', action: openSlots },
          { label: '覆蓋', primary: true, action: write }
        ]);
      else write();
    } catch (e) {
      toast(e.message, true);
    }
  };
  input.click();
}
function confirmDeleteSlot(n) {
  modal(
    'DELETE · 刪除存檔',
    `刪除存檔 ${n}？`,
    `<p>此裝置上的存檔 ${n} 會被永久刪除，無法復原。${cloud.signedIn ? 'Google Drive 上的雲端副本不會刪除，下次選這格並開始遊戲時會再下載回來。' : ''}建議先匯出備份。</p>`,
    [
      { label: '取消', action: openSlots },
      {
        label: '刪除',
        action: () => {
          forgetLocal(localStorage, slotKey(n), n);
          if (n === slot) useSlot(n);
          toast(`已刪除存檔 ${n}。`);
          openSlots();
        }
      }
    ]
  );
}
// Slot picker: choose, start, export, import or delete each of the SLOT_COUNT saves.
function openSlots() {
  const rows = listSlots(localStorage, validateSave)
    .map(
      ({ slot: n, state: v, savedAt, corrupt }) => `<div class="slot-card ${n === slot ? 'current' : ''}">
      <div class="slot-info"><strong>存檔 ${n}${n === slot ? '<em>使用中</em>' : ''}</strong><small>${corrupt ? '存檔損毀，可匯入備份覆蓋' : v ? `${esc(describeSave(v))} · ${formatTime(savedAt)}` : '空白存檔'}</small></div>
      <div class="slot-actions">${v ? `${n === slot ? '' : `<button type="button" data-slot-use="${n}">選擇</button>`}<button type="button" data-slot-export="${n}">匯出</button><button type="button" data-slot-delete="${n}">刪除</button>` : `<button type="button" data-slot-new="${n}">在此開始</button>`}<button type="button" data-slot-import="${n}">匯入</button></div></div>`
    )
    .join('');
  modal(
    'SAVE SLOTS · 存檔槽',
    '選擇一段人生',
    `<p>共有 ${SLOT_COUNT} 個存檔槽，各自獨立保存${cloud.signedIn ? '，並各自同步到 Google Drive' : ''}。匯出的檔案可以在其他裝置或平台匯入。</p><div class="slots">${rows}</div>`,
    [{ label: '完成', primary: true, action: closeModal }]
  );
  const body = $('modal-body');
  body.querySelectorAll('[data-slot-use]').forEach(
    b =>
      (b.onclick = () => {
        useSlot(Number(b.dataset.slotUse));
        toast(`已切換到存檔 ${slot}。`);
        openSlots();
      })
  );
  body.querySelectorAll('[data-slot-new]').forEach(
    b =>
      (b.onclick = () => {
        useSlot(Number(b.dataset.slotNew));
        closeModal();
        beginIntro();
      })
  );
  body
    .querySelectorAll('[data-slot-export]')
    .forEach(b => (b.onclick = () => downloadSave(Number(b.dataset.slotExport))));
  body
    .querySelectorAll('[data-slot-import]')
    .forEach(b => (b.onclick = () => uploadSave(Number(b.dataset.slotImport))));
  body
    .querySelectorAll('[data-slot-delete]')
    .forEach(b => (b.onclick = () => confirmDeleteSlot(Number(b.dataset.slotDelete))));
}
function confirmNew() {
  modal(
    'ANOTHER LIFE',
    '重新開始？',
    `<p>存檔 ${slot} 目前的進度將被取代。你將重新經歷通勤與轉生。想保留這段人生，可以改用「存檔槽」選擇空白存檔。</p>${cloud.signedIn ? '<p>已登入 Google：新的進度存檔後也會取代 Google Drive 上的雲端存檔。</p>' : ''}`,
    [
      { label: '保留現在的人生', action: closeModal },
      {
        label: '重新開始',
        primary: true,
        action: () => {
          closeModal();
          state = createState();
          hasSave = false;
          destination = null;
          selectedTarget = null;
          salvaging = null;
          repelCooldown = 0;
          world.sync(state);
          beginIntro();
        }
      }
    ]
  );
}
function showMenu() {
  closePanel();
  modal(
    'PAUSED · 海風暫停',
    '漂流者，休息一下。',
    `${cloudMenuHTML()}<div class="help-keys"><span>鍵盤</span><span>WASD 移動／駕艇 · Shift 加速 · E 互動 · Q 登岸／登艇 · 空白鍵驅離<br>B 建造 · I 背包 · J 日誌 · C 生物<br>H 返航 · R 旋轉設施 · V 切換視角 · Esc 返回<br>K 御獸遠航 · T 騎乘 · G 潛水／浮上 · F 夥伴攻擊<br>戰艦：Q 登船／下船／離開舵輪 · 駕駛室舵輪按 E 掌舵 · 掌舵時空白鍵發射艦砲</span><span>滑鼠／觸控</span><span>點擊海面航行；第三人稱右鍵拖曳環視<br>第一人稱移動滑鼠轉頭，Esc 釋放游標<br>手機橫屏：左下搖桿移動（推到底約半秒自動加速），右側單指環視、雙指縮放／旋轉<br>搖桿旁「加速」點一下開啟、停下自動關閉；可同時移動、環視與按按鈕；駛過漂流物、走過採集點會自動收集<br>靠近木筏或島嶼，點登岸即可步行<br>建築可直接點擊；J 日誌可設定島嶼航線<br>滾輪／雙指縮放，點擊按鈕互動</span><span>遊戲手把</span><span>左搖桿駕艇（推到底加速）· 右搖桿環視 · 十字鍵←騎乘／→潛水 · R3 切換視角<br>A 互動 · X 建造 · Y 生物 · B 返回<br>LB 背包 · RB 日誌 · LT 登岸／登艇<br>RT 夥伴攻擊（未出戰時驅離）· Select 御獸遠航 · L3 返航<br>十字鍵選單 · 左右切換親代 · Start 暫停</span></div>`,
    [
      { label: '繼續漂流', primary: true, action: closeModal },
      { label: '⚙ 設定', action: () => openSettings(showMenu) },
      { label: '📊 統計', action: () => openStats(showMenu) },
      {
        label: '保存進度',
        action: () => {
          save(false);
          scheduleCloud(true);
        }
      },
      ...(cloud.configured
        ? [
            cloud.signedIn
              ? {
                  label: cloud.connected ? '立即同步雲端' : '連線 Google Drive',
                  action: () => {
                    if (cloud.connected) {
                      save(true);
                      scheduleCloud(true);
                      toast('正在同步到 Google Drive…');
                    } else connectCloud(true);
                  }
                }
              : { label: 'Google 登入', action: () => connectCloud(true) }
          ]
        : []),
      {
        label: '回到主畫面',
        action: () => {
          save(true);
          closeModal();
          running = false;
          updateViewport();
          $('hud').hidden = true;
          $('title-screen').hidden = false;
          updateTitleButtons();
          scheduleCloud(true);
          updateAccountUI();
        }
      }
    ]
  );
}
// Settings page (stored per device with the graphics settings).
const UI_DEFAULTS = {
  camSens: 1,
  invertY: false,
  autoPickup: true,
  haptics: true,
  prompts: 'auto',
  fontSize: 'normal',
  buttonSize: 'normal',
  lefty: false
};
const setting = k => world.settings[k] ?? UI_DEFAULTS[k] ?? VOLUME_DEFAULTS[k];
function applyUiSettings() {
  const b = document.body.classList;
  b.toggle('font-lg', setting('fontSize') === 'large');
  b.toggle('font-xl', setting('fontSize') === 'xlarge');
  b.toggle('btn-sm', setting('buttonSize') === 'small');
  b.toggle('btn-lg', setting('buttonSize') === 'large');
  b.toggle('lefty', !!setting('lefty'));
  applyVolumes();
  refreshPrompts(true);
}
function openSettings(back = closeModal) {
  const seg = (key, opts) =>
      `<span class="seg" data-key="${key}">${opts.map(([v, l]) => `<button type="button" data-val="${v}" class="${String(setting(key)) === String(v) ? 'active' : ''}">${l}</button>`).join('')}</span>`,
    range = (key, min, max, fmt) =>
      `<input type="range" data-key="${key}" min="${min}" max="${max}" value="${Math.round(setting(key) * 100)}"><output>${fmt(setting(key))}</output>`,
    check = (key, label) =>
      `<label class="check"><input type="checkbox" data-key="${key}" ${setting(key) ? 'checked' : ''}> ${label}</label>`,
    pct = v => Math.round(v * 100) + '%';
  modal(
    'SETTINGS · 設定',
    '讓這片海更順手',
    `<div class="settings">
  <div class="about-row"><img src="./brand/emblem.svg" alt=""><div><strong>比斯泰德 Beastidal</strong><small>版本 ${GAME_VERSION}${running ? ' · ' + saveLabel() : ''}</small></div></div>
  <div class="row"><span>語言 · Language</span><span class="seg" data-key="lang">${Object.entries(LANGS)
    .map(
      ([v, l]) =>
        `<button type="button" data-val="${v}" class="${LANG === v ? 'active' : ''}" data-no-i18n>${l}</button>`
    )
    .join('')}</span></div>
  ${running ? `<h3>主角</h3><div class="row"><span>外觀</span><span class="seg" data-key="hero">${HEROES.map(([v, l]) => `<button type="button" data-val="${v}" class="${state.hero === v ? 'active' : ''}">${l.split(' · ')[0]}</button>`).join('')}</span></div>` : ''}
  <h3>畫面</h3><div class="row"><span>畫質</span>${seg(
    'quality',
    Object.entries(QUALITY).map(([k, q]) => [k, q.label])
  )}</div><p class="note">畫質變更會重新載入遊戲（進度會先保存）。</p>
  <div class="row"><span>字體大小</span>${seg('fontSize', [
    ['normal', '標準'],
    ['large', '大'],
    ['xlarge', '特大']
  ])}</div>
  <h3>聲音</h3><div class="row"><span>音樂</span>${range('musicVol', 0, 100, pct)}</div><div class="row"><span>音效</span>${range('sfxVol', 0, 100, pct)}</div><div class="row"><span>環境聲</span>${range('ambVol', 0, 100, pct)}</div>
  <h3>操作</h3><div class="row"><span>鏡頭靈敏度</span>${range('camSens', 40, 250, pct)}</div>${check('invertY', '鏡頭上下反轉')}${check('autoPickup', '自動拾取（駛過漂流物、走過採集點自動收集）')}${check('haptics', '震動回饋（手機、手把）')}
  <div class="row"><span>按鍵提示</span>${seg('prompts', [
    ['auto', '自動'],
    ['keyboard', '鍵盤'],
    ['touch', '觸控'],
    ['gamepad', '手把']
  ])}</div>
  <h3>手機</h3><div class="row"><span>按鈕大小</span>${seg('buttonSize', [
    ['small', '小'],
    ['normal', '標準'],
    ['large', '大']
  ])}</div>${check('lefty', '左右手對調（搖桿在右、動作鈕在左）')}
  <div class="row"><span>新手教學</span><button type="button" class="small-button" id="replay-tutorial">${running ? '重新播放教學' : '下次開始時播放'}</button></div></div>`,
    [
      {
        label: '完成',
        primary: true,
        action: () => {
          closeModal();
          back === closeModal || back();
        }
      }
    ]
  );
  const body = $('modal-body'),
    store = () => {
      world.saveSettings();
      applyUiSettings();
    };
  body.querySelectorAll('.seg').forEach(g =>
    g.querySelectorAll('button').forEach(
      b =>
        (b.onclick = () => {
          const key = g.dataset.key,
            v = b.dataset.val;
          g.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
          if (key === 'lang') {
            if (v !== LANG) {
              setLang(v);
              if (running) save(true);
              setTimeout(() => location.reload(), 200);
            }
            return;
          }
          if (key === 'hero') {
            state.hero = v;
            world.setHero(v);
            save(true);
            return;
          }
          if (key === 'quality') {
            if (world.setQuality(v)) {
              if (running) save(true);
              toast('正在套用畫質…');
              setTimeout(() => location.reload(), 400);
            }
            return;
          }
          world.settings[key] = v;
          store();
        })
    )
  );
  body.querySelectorAll('input[type=range]').forEach(
    r =>
      (r.oninput = () => {
        world.settings[r.dataset.key] = r.value / 100;
        r.nextElementSibling.textContent = r.value + '%';
        store();
        if (r.dataset.key === 'sfxVol') audio.note(660, 0.08);
      })
  );
  body.querySelectorAll('input[type=checkbox]').forEach(
    c =>
      (c.onchange = () => {
        world.settings[c.dataset.key] = c.checked;
        store();
        if (c.dataset.key === 'haptics' && c.checked) haptic('pickup');
      })
  );
  $('replay-tutorial').onclick = () => {
    world.settings.tutorialReplay = true;
    world.saveSettings();
    if (running) {
      startTutorial();
      closeModal();
    } else toast('下次開始遊戲時會先播放新手教學。');
  };
}
function toggleView() {
  if (!running || paused || film) return;
  const first = world.toggleView();
  state.view = first ? 'first' : 'third';
  if (first) lockMouse();
  else releaseMouse();
  $('view-btn').textContent = first ? '第一人稱' : '第三人稱';
  toast(first ? '第一人稱 · 滑鼠轉頭，Esc 釋放游標；手機滑動環視' : '第三人稱 · 拖曳環視，滾輪／雙指縮放');
  save(true);
}
function beginGame(fresh = false) {
  state.hero ??= 'male';
  migrateBag(state);
  spawnRescue(state);
  normalizeWildlife(state);
  normalizeTaming(state);
  normalizeDevice(state);
  ensureLandBeasts(state);
  normalizeStats(state).sessions++;
  statsPrev = null;
  if (soundPref.get() && !audio.on) {
    audio.start();
    $('sound-btn').textContent = '♫';
  }
  hull.mode = '';
  normalizeExpansion(state);
  normalizeTravel(state);
  normalizeHousing(state);
  normalizeShip(state);
  running = true;
  paused = false;
  film = null;
  closePanel();
  $('title-screen').hidden = true;
  $('hud').hidden = false;
  $('intro-overlay').hidden = true;
  $('film-fade').hidden = true;
  $('ocean').style.filter = '';
  if ($('film-flash')) $('film-flash').style.opacity = 0;
  world.firstPerson = state.view === 'first';
  world.firstPitch = 0;
  $('view-btn').textContent = world.firstPerson ? '第一人稱' : '第三人稱';
  world.yaw = 0.63;
  world.pitch = 0.64;
  world.distance = touchDevice() ? 30 : 36;
  keys.clear();
  if (fresh) {
    state.player = { x: 7, z: 10, heading: 0 };
  }
  normalizeExpansion(state);
  normalizeTravel(state);
  normalizeHousing(state);
  normalizeShip(state);
  world.sync(state);
  updateViewport();
  updateUI();
  updateDock();
  save(true);
  lastMono = '';
  if (fresh || world.settings.tutorialReplay) startTutorial();
  else updateTutorial(true);
  setTimeout(() => updateMonologue(true), fresh ? 6200 : 1500);
}
// A new life starts by choosing who is reborn: the office worker in the white shirt or the one in the suit.
const HEROES = [
  ['male', '男 · 白襯衫上班族'],
  ['female', '女 · 套裝上班族']
];
function beginIntro() {
  if (state.hero) return startIntro();
  modal(
    'WHO WAS REBORN',
    '那天加班到深夜的是誰？',
    '<p>選擇主角的外觀。之後也可以在「設定」裡更換。</p>',
    HEROES.map(([v, label], i) => ({
      label,
      primary: i === 0,
      action: () => {
        closeModal();
        state.hero = v;
        world.setHero(v);
        startIntro();
      }
    }))
  );
}
function startIntro() {
  running = false;
  closePanel();
  $('hud').hidden = true;
  $('title-screen').hidden = true;
  $('intro-overlay').hidden = false;
  $('film-fade').hidden = false;
  $('film-fade').style.opacity = 0;
  film = new IntroFilm(world.renderer, () => beginGame(true));
  audio.start();
  $('sound-btn').textContent = '♫';
  $('skip-intro').focus();
  updateViewport();
}
function initialize() {
  try {
    world = new OceanWorld($('ocean'), state);
  } catch (e) {
    $('load-text').innerHTML = '3D 畫面無法啟動。請使用支援 WebGL 2 的新版 Chrome、Edge 或 Safari，並開啟硬體加速。';
    document.querySelector('.loading-line').hidden = true;
    console.error(e);
    return;
  }
  const filmUI = document.createElement('div');
  filmUI.id = 'intro-overlay';
  filmUI.hidden = true;
  filmUI.innerHTML =
    '<div class="film-bars"></div><p id="film-chapter"></p><button id="skip-intro">跳過動畫 <kbd>Esc / B</kbd></button><div class="film-subtitles"><p id="film-caption"></p><small>PROLOGUE · 前往沒有終點的海</small></div>';
  document.body.append(filmUI);
  const fade = document.createElement('div');
  fade.id = 'film-fade';
  fade.hidden = true;
  document.body.append(fade);
  const flash = document.createElement('div');
  flash.id = 'film-flash';
  document.body.append(flash);
  $('skip-intro').onclick = () => beginGame(true);
  window.tidalReady = true;
  if (new URLSearchParams(location.search).has('debug'))
    window.__beastidal = {
      world,
      audio,
      get state() {
        return state;
      },
      keys,
      openDevice,
      enterFocus,
      exitFocus,
      selectFocusPet,
      step(dt, n = 1) {
        for (let i = 0; i < n; i++) {
          movePlayer(dt, null);
          moveWild(dt);
          if (salvaging) tickSalvage(dt);
          else autoPickup();
          updateStorm();
          updateTutorial();
          world.update(dt, state, { salvaging });
        }
        world.render();
      },
      repel,
      openSettings
    };
  $('load-screen').hidden = true;
  $('title-screen').hidden = false;
  $('start-btn').disabled = false;
  updateTitleButtons();
  $('start-btn').focus();
  setupEvents();
  updateViewport();
  requestAnimationFrame(frame);
}
function getAllTargets() {
  if (state.player.mode === 'aboard') return shipPointsWorld(state);
  const arr = state.loot.map(l => ({ ...l, type: 'loot', name: lootNames[l.kind] }));
  for (const w of state.wild)
    arr.push({ ...w, type: 'wild', name: w.rescue === 'tangled' ? '受困的小獸' : geneName(w.genome) });
  if (!state.buoyFound) arr.push({ id: 'buoy', x: 17, z: -13, type: 'buoy', name: '失落研究浮標' });
  const onDeck = state.player.mode === 'aboard' && state.player.deck === FORTRESS_DECK;
  for (const b of state.buildings)
    if (
      !b.stowed &&
      b.type !== 'floor' &&
      b.type !== 'upperfloor' &&
      (b.ship ? onDeck : (b.level || 0) === (state.player.level || 0) || b.type === 'stairs')
    )
      arr.push({
        id: facilityId(b),
        type: 'facility',
        ...facilityPos(state, b),
        name: b.type === 'pen' ? penLabel(state, penId(b)) : RECIPES[b.type].name
      });
  // a spot that is still regrowing is just scenery until it is ready again
  for (const n of NODES) if ((state.harvested?.[n.id] || 0) <= state.elapsed) arr.push(n);
  for (const i of ISLANDS)
    arr.push({
      id: 'claim-' + i.id,
      claimId: i.id,
      type: 'claim',
      x: i.x,
      z: i.z,
      name: (state.occupied || []).includes(i.id) ? '領地 · ' + i.name : '無主石碑 · ' + i.name
    });
  for (const site of EXPLORE)
    if (!!site.cave === !!state.inCave && (!site.deep || state.expedition.diving)) arr.push({ ...site, type: 'site' });
  return state.inCave
    ? arr.filter(t => t.type === 'site')
    : state.expedition.diving
      ? arr.filter(t => t.type === 'site')
      : arr;
}
function updateNearest() {
  updateContractButton();
  const all = getAllTargets();
  let selected = selectedTarget ? all.find(t => t.id === selectedTarget) : null;
  const d = t => Math.hypot(t.x - state.player.x, t.z - state.player.z);
  if (selected && d(selected) > 130) selected = null;
  if (!selected) {
    const R = t => (t.type === 'shippoint' ? 2.6 : t.type === 'claim' ? 6 : 10);
    const near = all.filter(t => d(t) < R(t)).sort((a, b) => d(a) - d(b));
    selected = near[0] || null;
  }
  nearest = selected;
  world.target = selected;
  const inRange =
    selected &&
    d(selected) <
      (selected.type === 'shippoint' ? 2.8 : selected.type === 'claim' ? 6 : selected.type === 'wild' ? 10.8 : 10.3);
  $('context-action').hidden = !inRange || !!buildType || !!panel || !!salvaging;
  if (inRange) {
    $('context-title').textContent = selected.name;
    $('context-subtitle').textContent = P(
      selected.type === 'shippoint'
        ? DECKS[state.player.deck].name + ' · 按 E ' + selected.verb
        : selected.type === 'claim'
          ? (state.occupied || []).includes(selected.claimId)
            ? '你的領地 · 御獸在此休息'
            : '派出羈絆 30 的夥伴 · 按 E 插旗占領'
          : selected.type === 'site'
            ? '探索點 · 靠近按 E 調查'
            : selected.type === 'facility'
              ? '點擊建築或按 E 開啟設施'
              : selected.type === 'node'
                ? (state.harvested?.[selected.id] || 0) > state.elapsed
                  ? '資源恢復中 · 兩分鐘再生'
                  : '登島後走近 4 公尺內採集'
                : selected.type === 'loot'
                  ? `${Math.round(d(selected))}m · 可打撈物資`
                  : selected.type === 'buoy'
                    ? '訊號微弱 · 有人留下了紀錄'
                    : selected.rescue === 'tangled'
                      ? '被漂流漁網纏住了 · 按 E 解開'
                      : selected.rescue === 'freed'
                        ? '牠還在發抖 · 分一點口糧給牠（口糧 1）'
                        : selected.rescue === 'friend' && !state.secret
                          ? `信任 ${selected.trust}% · 跟著你 · 等你學會締結契約`
                          : state.secret
                            ? frenzied(selected, state.elapsed)
                              ? '狂暴中！快拉開距離'
                              : selected.follow
                                ? '信任 100% · 跟著你 · 帶著契約書按 X 締結'
                                : `${RARITY[rarityOf(selected.genome)]} · 信任 ${selected.trust}% · 下次投餌 ${baitCost(selected)} 份${selected.tame ? ' · 似乎特別親人' : ''}${selected.hostile ? ' · 危險個體' : ''}`
                            : '未知生命 · 調查浮標，或按空白鍵驅離'
    );
    $('context-verb').textContent =
      selected.type === 'shippoint'
        ? selected.verb
        : selected.type === 'claim'
          ? (state.occupied || []).includes(selected.claimId)
            ? '查看'
            : '占領'
          : selected.type === 'site'
            ? '調查'
            : selected.type === 'facility'
              ? '操作'
              : selected.type === 'node'
                ? '採集'
                : selected.type === 'loot'
                  ? '打撈'
                  : selected.type === 'buoy'
                    ? '調查'
                    : selected.rescue === 'tangled'
                      ? '解開'
                      : selected.rescue === 'freed'
                        ? '餵食'
                        : state.secret
                          ? '投餌'
                          : '觀察';
  }
  $('target-card').hidden = !selected || inRange || !!panel || !!buildType;
  if (selected && !inRange && !panel) {
    $('target-card').innerHTML =
      `${esc(selected.name)}<small>${Math.round(d(selected))} 公尺 · ${inputMode() === 'gamepad' ? '用左搖桿駕艇靠近' : '點擊海面或駕艇靠近'}</small>`;
  }
}
function interact() {
  if (!running || paused || panel || buildType || salvaging) return;
  if (!nearest) {
    if (state.ship ? shipDockOption(state)?.near : dockOption(state)?.near) {
      dock();
      return;
    }
    toast('靠近漂流物打撈，或靠近木筏登岸。');
    return;
  }
  if (Math.hypot(nearest.x - state.player.x, nearest.z - state.player.z) > 10.8) {
    toast('再靠近一點。', true);
    return;
  }
  destination = null;
  const t = nearest;
  if (t.type === 'shippoint') {
    shipPoint(t.point);
    return;
  }
  if (t.type === 'claim') {
    claim(t.claimId);
    return;
  }
  if (t.type === 'site') {
    handleExploration(t.id);
    return;
  }
  if (t.type === 'facility') {
    enterFocus(t.id);
    return;
  }
  if (t.type === 'node') {
    gather(t.id);
    return;
  }
  if (t.type === 'loot') {
    startSalvage(t);
  } else if (t.type === 'buoy') {
    state.secret = true;
    state.buoyFound = true;
    give(state, { bait: 6, crystal: 3, fiber: 4 });
    log(
      state,
      '隱藏航線：共生計畫',
      '浮標裡的研究紀錄指出，異晶讓所有海洋生命共享同一套基因語言。先以誘餌建立信任，再用契約書締結，最後讓兩個不同個體配對。'
    );
    selectedTarget = null;
    world.sync(state);
    updateUI();
    save(true);
    modal(
      'HIDDEN QUEST · 共生計畫',
      '牠們並不是怪物。',
      '<p>「我們曾試圖消滅突變，最後才發現，<strong>共生才是生存的方法</strong>。」</p><p>浮標中找到 6 份誘餌、3 顆異晶與 4 束纖維，以及一張展示池藍圖。</p><p>做<strong>誘餌</strong>（口糧 1 + 纖維 1 → 3 份），連續餵同一隻野生生物：每餵一次<strong>信任度</strong>上升，下一次要多花一點誘餌。到工作桌做<strong>契約書</strong>帶在身上，在信任你的生物旁按 X 締結，信任度就是成功率。收服之後，你們之間的是<strong>羈絆</strong>，靠一起冒險慢慢加深。</p>',
      [
        {
          label: '開啟共生之路',
          primary: true,
          action: () => {
            closeModal();
            discover('隱藏航線已解鎖', '海洋展示池 · 生物馴化 · 基因雜交');
          }
        }
      ]
    );
  } else if (t.type === 'wild') {
    // the first companion: free it from the net, then share some food (no taming knowledge needed)
    // (targets are snapshots refreshed a few times a second: read the beast's state now)
    const stage = state.wild.find(w => w.id === t.id)?.rescue;
    if (stage === 'tangled' || stage === 'freed') {
      const r = stage === 'tangled' ? freeRescue(state) : shareFood(state);
      if (!r.ok) return toast(r.error, true);
      haptic('discover');
      audio.note(stage === 'tangled' ? 520 : 780, 0.4);
      if (stage === 'freed') {
        discover('一個小小的同伴', r.message);
        log(state, '漁網裡的小傢伙', '我解開了漁網，分給牠一點口糧。牠游在船邊，好像在說謝謝。');
      } else toast(r.message);
      selectedTarget = null;
      save(true);
      updateUI();
      return;
    }
    if (!state.secret) {
      toast('牠正警戒地看著你。也許浮標裡有接近牠的方法。');
      return;
    }
    // a beast that already trusts you fully: E uses a contract scroll
    if (t.follow && (state.contracts || 0) > 0) {
      performContract(t.id);
      return;
    }
    const r = feed(state, t.id);
    if (!r.ok) toast(r.error, true);
    else if (r.follow) {
      selectedTarget = null;
      discover('完全信任', `${geneName(state.wild.find(w => w.id === t.id).genome)} 會跟著你。帶著契約書按 X 締結。`);
      haptic('discover');
      save(true);
    } else {
      toast(`牠接住了誘餌。信任 +${r.gain}% → ${r.trust}% · 最多再餵 ${r.left} 次必定成功 · 下次需要 ${r.next} 份誘餌`);
      audio.note(620 + r.trust * 3, 0.2);
      save(true);
    }
    updateUI();
  }
}
// Throwing a line: the salvage reels the item in while the player keeps moving; it fails only if the line overstretches.
function startSalvage(t) {
  if (salvaging) return;
  if (!bagRoom(state)) {
    bagFullNotice();
    return;
  }
  const d = Math.hypot(t.x - state.player.x, t.z - state.player.z);
  salvaging = { id: t.id, x: t.x, z: t.z, remaining: 0.8 + d * 0.1, duration: 0.8 + d * 0.1 };
  $('salvage-progress').hidden = false;
  world.splash(t.x, t.z, 0.25);
  audio.splash(0.25, true);
}
function tickSalvage(dt) {
  const l = state.loot.find(l => l.id === salvaging.id);
  if (!l) {
    salvaging = null;
    $('salvage-progress').hidden = true;
    return;
  }
  const dx = state.player.x - l.x,
    dz = state.player.z - l.z,
    d = Math.hypot(dx, dz);
  if (d > 16) {
    salvaging = null;
    $('salvage-progress').hidden = true;
    toast('纜繩拉得太遠，鬆脫了。靠近一點再打撈。', true);
    return;
  }
  const pull = Math.min(Math.max(0, d - 1.6), dt * 5.5);
  if (pull > 0) {
    l.x += (dx / d) * pull;
    l.z += (dz / d) * pull;
  }
  salvaging.x = l.x;
  salvaging.z = l.z;
  salvaging.remaining -= dt;
  $('salvage-progress').querySelector('i').style.transform =
    `scaleX(${1 - Math.max(0, salvaging.remaining) / salvaging.duration})`;
  if (salvaging.remaining <= 0 && d < 4.5) {
    world.splash(l.x, l.z, 0.35);
    audio.splash(0.3, true);
    finishSalvage();
  }
}
// Auto pickup: sailing over drift reels it in, walking past a ready node gathers it.
// a full bag says so once in a while, not on every pickup it passes over
let bagFullAt = -99;
function bagFullNotice() {
  if (state.elapsed - bagFullAt < 6) return;
  bagFullAt = state.elapsed;
  toast(bagFullError, true);
}
function autoPickup() {
  if (!running || paused || panel || buildType || salvaging || world.settings.autoPickup === false) return;
  if (!bagRoom(state)) return;
  const px = state.player.x,
    pz = state.player.z;
  if (state.player.mode === 'boat' && !state.expedition.diving) {
    const l = state.loot.find(l => Math.hypot(l.x - px, l.z - pz) < 3.6);
    if (l) startSalvage(l);
  } else if (state.player.mode === 'foot' && !state.inCave) {
    const n = NODES.find(n => Math.hypot(n.x - px, n.z - pz) < 2.2 && (state.harvested?.[n.id] || 0) <= state.elapsed);
    if (n) gather(n.id);
  }
}
function finishSalvage() {
  const at = { x: salvaging.x, z: salvaging.z },
    r = salvage(state, salvaging.id);
  salvaging = null;
  $('salvage-progress').hidden = true;
  if (r.ok) {
    flyResources(r.rewards, at.x, 0.6, at.z);
    haptic('pickup');
    audio.note(860, 0.16);
    selectedTarget = null;
    world.sync(state);
    save(true);
    updateUI();
  } else toast(r.error, true);
}
function repel() {
  if (!running || paused || panel || buildType) return;
  if (state.ship && state.player.mode === 'ship' && !state.expedition.mounted) {
    const r = fireCannon(state);
    toast(r.ok ? r.message : r.error, !r.ok);
    if (r.ok) {
      audio.note(90, 0.4);
      audio.note(60, 0.5);
      world.sync(state);
      save(true);
      updateUI();
    }
    return;
  }
  if (state.player.mode === 'aboard') {
    toast('在船內無法划槳；到駕駛室掌舵後可用艦砲。');
    return;
  }
  if (repelCooldown > 0) {
    toast('划槳尚在恢復，稍等一下。');
    return;
  }
  repelCooldown = 3;
  let affected = false;
  const h = state.player.heading,
    px = state.player.x + Math.cos(h) * 1.1,
    pz = state.player.z - Math.sin(h) * 1.1;
  world.splash(px, pz, 1);
  audio.splash(1);
  haptic('repel');
  if (state.stats) state.stats.repels++;
  for (const w of state.wild) {
    const d = Math.hypot(w.x - px, w.z - pz);
    if (d < 12) {
      startFlee(w, px, pz, state.elapsed, 1);
      affected = true;
    }
  }
  if (affected) setTimeout(() => audio.splash(0.45, true), 180);
  toast(affected ? '拍擊水面，周圍生物暫時退開了。' : '你用船槳拍擊水面。');
}
function closePanel() {
  panel = null;
  beastStage.clear();
  deviceMode = false;
  $('drawer').hidden = true;
  $('drawer').classList.remove('device');
  document.querySelectorAll('.action-bar button').forEach(b => b.classList.remove('active'));
  if (world) updateDock();
}
function openPanel(name, inDevice = false) {
  if (!running || paused || film) return;
  releaseMouse();
  cancelBuild();
  if (panel === name && deviceMode === inDevice) {
    closePanel();
    return;
  }
  deviceMode = inDevice;
  destination = null;
  salvaging = null;
  $('salvage-progress').hidden = true;
  panel = name;
  keys.clear();
  $('drawer').hidden = false;
  document
    .querySelectorAll('.action-bar button')
    .forEach(b => b.classList.toggle('active', b.dataset.panel === (inDevice ? 'device' : name)));
  renderPanel();
  updateDock();
  if (gamepadActive) setTimeout(() => focusMenu(0, true), 0);
}
// The handheld from the raft desk: phone-style hub. Apps reuse the regular panels, rendered inside the device frame.
let deviceMode = false;
const DEVICE_PANEL = { bag: 'bag', beasts: 'beasts', journal: 'journal', codex: 'journal', achievements: 'journal' };
function openDevice(app = null) {
  if (!running || paused || film) return;
  normalizeDevice(state);
  if (!state.device.owned) {
    toast('（那台隨身裝置還放在木筏的書桌上。）', true);
    return;
  }
  if (deviceMode && !app) {
    closePanel();
    return;
  }
  if (app === 'stats' || app === 'settings') {
    closePanel();
    const back = () => openDevice();
    if (app === 'stats') openStats(back);
    else openSettings(back);
    return;
  }
  if (app === 'beasts') beastPick = null;
  if (app === 'journal' || app === 'codex' || app === 'achievements') journalTab = app === 'journal' ? 'log' : app;
  const name = app ? DEVICE_PANEL[app] || app : 'device';
  panel = null;
  openPanel(name, true);
}
function deviceClock() {
  const m = Math.floor(hourOf(state) * 60 + 0.5);
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
function deviceHome(body) {
  body.innerHTML = `<section class="dv-widget"><div class="dv-widget-head"><strong>${deviceClock()}</strong><span>第 ${dayOf(state)} 日</span></div></section>
  <div class="dv-apps">${DEVICE_APPS.map(a => `<button type="button" data-app="${a.id}"><span>${a.icon}</span><small>${a.name}</small></button>`).join('')}</div>`;
  body.querySelectorAll('[data-app]').forEach(b => (b.onclick = () => openDevice(b.dataset.app)));
}
// Beast storage: a 3 × 3 grid of your beasts, alive and turning; tap one for its details and what you can do.
const beastStage = new BeastStage();
let beastPage = 0,
  beastPick = null;
function renderBeastStorage(body) {
  const pets = state.tamed,
    p = pets.find(p => p.id === beastPick);
  if (!p) beastPick = null;
  if (!state.secret || !pets.length) {
    beastStage.clear();
    body.innerHTML = `<p class="dv-note">${state.secret ? '還沒有御獸。餵誘餌建立信任，再用契約書締結。' : '還沒有御獸。先調查東北方的研究浮標。'}</p>`;
    return;
  }
  if (p) {
    const ph = phenotype(p.genome),
      active = state.expedition?.activeId === p.id;
    body.innerHTML = `<button type="button" class="bx-back">‹ 全部御獸</button><div class="bx-detail"><canvas width="320" height="220"></canvas><div class="bx-info"><h3>${esc(p.name)}<small>第 ${p.generation} 代</small></h3><p class="bx-stats"><span>羈絆 <b>${Math.round(p.bond || 0)}</b></span><span>體力 <b>${Math.round(p.health ?? 100)}</b></span><span>精力 <b>${Math.round(p.stamina ?? 100)}</b></span></p><div class="gene-chips">${describeGenes(
      p.genome
    )
      .slice(0, 4)
      .map(t => `<span>${esc(t)}</span>`)
      .join(
        ''
      )}</div><small class="focus-meta">${ABILITIES[ph.ability]} · 游速 ${ph.speed} · 防禦 ${ph.armor} · 親和 ${ph.affinity}</small>${
      p.memories?.length
        ? `<ul class="bx-memories">${p.memories
            .slice(0, 3)
            .map(m => `<li><small>第 ${m.day} 日</small> ${esc(m.text)}</li>`)
            .join('')}</ul>`
        : ''
    }</div></div><div class="bx-actions"><button type="button" class="primary" data-bx="train">默契訓練 · 口糧 2 / 異晶 1</button><button type="button" data-bx="go">${active ? '讓牠回去休息' : '帶牠出發'}</button><button type="button" data-bx="rename">改名</button></div><form class="focus-rename" hidden><input type="text" maxlength="16" value="${esc(p.name)}" aria-label="新名字" autocomplete="off"><button type="submit">儲存</button></form>`;
    const done = r => {
      toast(r.ok ? r.message : r.error, !r.ok);
      if (r.ok) {
        world.sync(state);
        save(true);
        updateUI();
      }
      renderPanel();
    };
    body.querySelector('.bx-back').onclick = () => {
      beastPick = null;
      renderPanel();
    };
    body.querySelector('[data-bx=train]').onclick = () => done(trainPet(state, p.id));
    body.querySelector('[data-bx=go]').onclick = () => done(commandPet(state, p.id, active ? 'home' : 'follow'));
    const form = body.querySelector('.focus-rename');
    body.querySelector('[data-bx=rename]').onclick = () => {
      form.hidden = false;
      form.querySelector('input').focus();
    };
    form.onsubmit = e => {
      e.preventDefault();
      const r = renamePet(state, p.id, form.querySelector('input').value);
      done(r.ok ? { ok: true, message: `改名為「${r.name}」。` } : r);
    };
    beastStage.show([{ canvas: body.querySelector('canvas'), key: p.id, genome: p.genome }]);
    return;
  }
  const pages = Math.ceil(pets.length / 9);
  beastPage = clamp(beastPage, 0, pages - 1);
  const shown = pets.slice(beastPage * 9, beastPage * 9 + 9);
  body.innerHTML = `<div class="bx-grid">${Array.from({ length: 9 }, (_, i) =>
    shown[i]
      ? `<button type="button" class="bx-cell" data-pet="${esc(shown[i].id)}"><canvas width="160" height="160"></canvas><span>${esc(shown[i].name)}</span></button>`
      : '<div class="bx-cell empty"></div>'
  ).join('')}</div>${
    pages > 1
      ? `<div class="bx-pager"><button type="button" data-page="-1" ${beastPage ? '' : 'disabled'}>‹</button><span>${beastPage + 1} / ${pages}</span><button type="button" data-page="1" ${beastPage < pages - 1 ? '' : 'disabled'}>›</button></div>`
      : ''
  }`;
  body.querySelectorAll('[data-pet]').forEach(
    b =>
      (b.onclick = () => {
        beastPick = b.dataset.pet;
        renderPanel();
      })
  );
  body.querySelectorAll('[data-page]').forEach(
    b =>
      (b.onclick = () => {
        beastPage += Number(b.dataset.page);
        renderPanel();
      })
  );
  beastStage.show(
    [...body.querySelectorAll('[data-pet]')].map(b => {
      const pet = pets.find(x => x.id === b.dataset.pet);
      return { canvas: b.querySelector('canvas'), key: pet.id, genome: pet.genome };
    })
  );
}
function decorateDevice(body) {
  const d = $('drawer');
  d.classList.toggle('device', deviceMode);
  if (!deviceMode) return;
  const app = DEVICE_APPS.find(a => a.id === (panel === 'device' ? null : deviceAppFor()));
  $('drawer-eyebrow').innerHTML =
    `<span>無訊號</span><span>${deviceClock()}</span><span>▮ ${Math.round(state.device.battery ?? 64)}%</span>`;
  $('drawer-title').textContent = panel === 'device' ? '隨身裝置' : app ? app.name : $('drawer-title').textContent;
  // (a beast's details bring their own way back to the grid)
  if (panel !== 'device' && !body.querySelector('.bx-back')) {
    body.insertAdjacentHTML('afterbegin', '<button type="button" class="dv-back">‹ 主畫面</button>');
    body.querySelector('.dv-back').onclick = () => {
      panel = null;
      openPanel('device', true);
    };
  }
}
function deviceAppFor() {
  if (panel === 'creatures') return 'beasts';
  if (panel === 'beasts') return 'beasts';
  if (panel === 'journal') return ['log', 'routes'].includes(journalTab) ? 'journal' : journalTab;
  return panel;
}
function handleExploration(id) {
  const r = explore(state, id);
  toast(r.ok ? r.message : r.error, !r.ok);
  if (r.ok) {
    destination = null;
    selectedTarget = null;
    world.sync(state);
    save(true);
    updateUI();
  }
}
function beastAction(action) {
  if (!running || paused || panel) return;
  const r = action === 'ride' ? toggleRide(state) : action === 'dive' ? toggleDive(state) : attack(state);
  toast(r.ok ? r.message : r.error, !r.ok);
  if (r.ok) {
    world.sync(state);
    save(true);
    updateUI();
  }
}
function routeExplore(id) {
  if (id === 'boss') {
    if (state.player.mode === 'foot') {
      toast('請先出海。');
      return;
    }
    closePanel();
    destination = { x: 82, z: 40 };
    toast('已標記守望者海域；接近前準備夥伴。');
    return;
  }
  let site = EXPLORE.find(v => v.id === id);
  if (!site) return;
  if (site.cave && !state.inCave) site = EXPLORE.find(v => v.id === 'cave-door');
  if (state.inCave && !site.cave) {
    toast('請先離開洞窟。');
    return;
  }
  if (state.player.mode === 'foot') {
    if (!state.inCave && Math.hypot(site.x - state.player.x, site.z - state.player.z) > 22) {
      toast('這個探索點在其他海域，請先登艇。');
      return;
    }
    destination = { x: site.x, z: site.z };
  } else if (site.deep) {
    destination = { x: site.x, z: site.z };
  } else {
    const island = ISLANDS.find(i => Math.hypot(site.x - i.x, site.z - i.z) < 18);
    const spots = islandDocks()
      .filter(d => d.island === island?.id)
      .sort(
        (a, b) =>
          Math.hypot(a.boat.x - state.player.x, a.boat.z - state.player.z) -
          Math.hypot(b.boat.x - state.player.x, b.boat.z - state.player.z)
      );
    if (!spots.length) return;
    destination = { ...spots[0].boat };
  }
  closePanel();
  selectedTarget = site.id;
  toast('探索點已標記，登岸後走近按 E 調查。');
}
function updateBeastHUD() {
  const p = activePet(state),
    e = state.expedition;
  if (!$('beast-bar')) return;
  $('beast-bar').hidden = !running || paused || !!panel || !!buildType || !p;
  if (p) {
    $('beast-status').textContent =
      `${p.name} · 羈絆 ${p.bond.toFixed(1)} · 耐力 ${Math.ceil(p.stamina)}${e.diving ? ' · 氧氣 ' + Math.ceil(e.oxygen) + '秒' : ''}`;
    $('ride-btn').textContent = e.mounted ? (state.ship ? '回戰艦 T' : '回小艇 T') : '騎乘 T';
    $('dive-btn').textContent = e.diving ? '浮上 G' : '潛水 G';
  }
  if (e.mounted) $('travel-mode').textContent = e.diving ? '御獸深潛 · 8m' : '御獸騎乘';
  else if (state.inCave) $('travel-mode').textContent = '異晶洞窟';
  else if (state.player.level) $('travel-mode').textContent = '避難所二樓';
  const b = e.boss;
  $('boss-bar').hidden = b.defeated || state.inCave || Math.hypot(b.x - state.player.x, b.z - state.player.z) > 35;
  $('boss-bar').textContent = `深海守望者  ${Math.max(0, Math.ceil(b.hp))} / 480`;
}
function appendConstruction(body, b) {
  body.insertAdjacentHTML(
    'beforeend',
    `<section class="building-tools"><p class="dv-note">${b.ship ? `比斯泰德號甲板 · 艙位 ${b.ship.slot + 1}` : `${b.level ? '二樓' : '一樓'} · 格位 (${b.x}, ${b.z})`}${b.type === 'pen' ? ' · 住民會一起搬家' : ''}</p>${b.ship ? '<button id="stow-building" class="full-button">收進待安置（空出艙位）</button>' : !['floor', 'upperfloor', 'stairs'].includes(b.type) ? '<button id="move-building" class="full-button">拖動搬移</button>' : ''}<button id="remove-building" class="full-button">拆除 · 回收約半數材料</button></section>`
  );
  if ($('move-building')) $('move-building').onclick = () => startMove(activeFacility);
  if ($('stow-building'))
    $('stow-building').onclick = () => {
      const r = stowFacility(state, activeFacility, findFacility);
      toast(r.ok ? r.message : r.error, !r.ok);
      if (r.ok) {
        normalizeHousing(state);
        world.sync(state);
        save(true);
        closePanel();
      }
    };
  let confirmed = false;
  $('remove-building').onclick = () => {
    if (!confirmed) {
      confirmed = true;
      $('remove-building').textContent = '再次點擊確認拆除';
      return;
    }
    const r = demolish(state, activeFacility);
    toast(r.ok ? r.message : r.error, !r.ok);
    if (r.ok) {
      normalizeTravel(state);
      world.sync(state);
      save(true);
      closePanel();
    }
  };
}
function housingMarkup(pets, scope = null) {
  const pools = pens(state),
    shownPools = scope ? pools.filter(b => penId(b) === scope) : pools,
    waiting = scope ? 0 : state.tamed.filter(p => !p.penId).length;
  return (
    `<section class="housing"><p class="section-label">展示池 · 每池陳列 3 隻</p><div class="info-strip">${shownPools.map(b => `${esc(penLabel(state, penId(b)))}：${occupants(state, penId(b)).length} 隻 + ${reserved(state, penId(b)).length} 預留`).join('<br>') || '尚未建造展示池'}${waiting ? `<br>御獸倉庫 ${waiting} 隻（不佔展示池，可隨時帶出）` : ''}</div>` +
    pets
      .map(
        p =>
          `<div class="housing-row"><label for="home-${esc(p.id)}">${esc(p.name)}<small>目前：${esc(penLabel(state, p.penId))}</small></label><select id="home-${esc(p.id)}" class="gene-select" data-home="${esc(p.id)}" aria-label="${esc(p.name)}的目的地"><option value="">選擇目的展示池</option>${pools
            .map(b => {
              const id = penId(b),
                n = used(state, id);
              return `<option value="${id}" ${p.penId === id ? 'disabled' : ''}>${esc(penLabel(state, id))} · ${n}/3 ${p.penId === id ? '目前住處' : n >= 3 ? '已滿，可交換' : ''}</option>`;
            })
            .join(
              ''
            )}</select><select class="gene-select housing-swap" data-swap="${esc(p.id)}" aria-label="選擇交換生物" hidden><option value="">選擇交換生物</option></select><button data-move-pet="${esc(p.id)}">搬移</button></div>`
      )
      .join('') +
    '</section>'
  );
}
function bindHousing(body) {
  body.querySelectorAll('[data-home]').forEach(
    select =>
      (select.onchange = () => {
        const swap = [...body.querySelectorAll('[data-swap]')].find(e => e.dataset.swap === select.dataset.home),
          pet = state.tamed.find(p => p.id === select.dataset.home);
        swap.hidden = !(select.value && used(state, select.value) >= 3 && pet?.penId);
        swap.innerHTML =
          '<option value="">選擇要交換的生物</option>' +
          occupants(state, select.value)
            .map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`)
            .join('');
      })
  );
  body.querySelectorAll('[data-move-pet]').forEach(
    button =>
      (button.onclick = () => {
        const target = [...body.querySelectorAll('[data-home]')].find(
            e => e.dataset.home === button.dataset.movePet
          )?.value,
          swap = [...body.querySelectorAll('[data-swap]')].find(e => e.dataset.swap === button.dataset.movePet)?.value;
        const r = movePet(state, button.dataset.movePet, target, swap);
        toast(r.ok ? '住處已更新：' + penLabel(state, target) + '。' : r.error, !r.ok);
        if (r.ok) {
          world.sync(state);
          save(true);
          renderPanel();
        }
      })
  );
}

function shipPoint(id) {
  let r;
  if (id === 'helm') {
    r = takeHelm(state);
    if (r.ok) markGuide(state, 'helm');
  } else if (id === 'gangway') {
    dock();
    return;
  } else if (id === 'cargo-a' || id === 'cargo-b') {
    openPanel('cargo');
    return;
  } else if (id === 'lounge') {
    openPanel('lounge');
    return;
  } else if (id === 'chart') {
    openPanel('journal');
    return;
  } else r = climbShip(state, id);
  toast(r.ok ? r.message : r.error, !r.ok);
  if (r.ok) {
    selectedTarget = null;
    audio.note(500, 0.12);
    updateDock();
    updateNearest();
    updateUI();
    save(true);
  }
}
function claim(id) {
  const isl = ISLANDS.find(i => i.id === id);
  if ((state.occupied || []).includes(id)) {
    toast(isl.name + ' 是你的領地，御獸平時在這裡休息。');
    return;
  }
  const r = claimIsland(state, id, activePet(state));
  toast(r.ok ? r.message : r.error, !r.ok);
  if (r.ok) {
    log(state, '領地：' + isl.name, '旗幟立起來了。從今天起，夥伴們有了能安心休息的島。');
    discover('占領成功 · ' + isl.name, '御獸平時會在這座島休息，恢復速度提升。');
    audio.note(820, 0.5);
    world.sync(state);
    save(true);
    updateUI();
  }
}
function renderCargo(body) {
  const deck = DECKS[state.player.deck];
  if (!state.ship || state.player.mode !== 'aboard' || !deck.cargo) {
    body.innerHTML = '<p>請到戰艦下層的物資艙操作貨櫃。</p>';
    return;
  }
  $('drawer-title').textContent = deck.name;
  body.innerHTML =
    `<div class="info-strip">貨艙總量 ${cargoTotal(state)} / ${CARGO_CAPACITY} · 本層存放：${deck.cargo.map(k => RESOURCE_NAMES[k]).join('、')}</div>` +
    deck.cargo
      .map(
        k =>
          `<div class="cargo-row"><div><span>${RESOURCE_ICONS[k]} ${RESOURCE_NAMES[k]}</span><small>背包 ${state.resources[k]} · 貨艙 ${state.ship.cargo[k]}</small></div><div class="button-row"><button data-cargo="${k}" data-n="10">存 10</button><button data-cargo="${k}" data-n="99999">全存</button><button data-cargo="${k}" data-n="-10">取 10</button><button data-cargo="${k}" data-n="-99999">全取</button></div></div>`
      )
      .join('') +
    '<p>建造與融合只使用背包物資。遠航前把多餘材料存進貨艙；失去意識時，貨艙物資不會遺失。</p>';
  body.querySelectorAll('[data-cargo]').forEach(
    b =>
      (b.onclick = () => {
        const r = transferCargo(state, b.dataset.cargo, Number(b.dataset.n));
        toast(r.ok ? r.message : r.error, !r.ok);
        if (r.ok) {
          save(true);
          updateUI();
          renderPanel();
        }
      })
  );
}
function renderLounge(body) {
  if (!state.ship) {
    body.innerHTML = '<p>尚未擁有戰艦。</p>';
    return;
  }
  const L = state.ship.lounge,
    home = nearBeastHome(state),
    isl = restIsland(state);
  body.innerHTML =
    `<div class="info-strip">休息室 ${L.length} / ${LOUNGE_CAPACITY} · ${home ? '已停靠領地附近，可讓夥伴上下船' : '需停靠在占領島嶼或避難所附近，夥伴才能上下船'}<br>平時御獸在${isl ? esc(isl.name) : '展示池'}休息（恢復 ×1.6）；休息室內恢復 ×1.3，遠航時可隨時派出。</div>` +
    (state.tamed.length
      ? state.tamed
          .map(p => {
            const on = L.includes(p.id);
            return `<article class="beast-card"><div class="beast-heading"><h3>${esc(p.name)}</h3><span>${on ? '戰艦休息室' : isl ? esc(isl.name) : '展示池'}</span></div><div class="beast-stats">羈絆 ${p.bond.toFixed(1)} · 耐力 ${Math.ceil(p.stamina)} · 體力 ${Math.ceil(p.health)}</div><button class="full-button" data-lounge="${esc(p.id)}" ${home ? '' : 'disabled'}>${on ? '送回領地休息' : '登船，進入休息室'}</button></article>`;
          })
          .join('')
      : '<p>還沒有御獸夥伴。</p>');
  body.querySelectorAll('[data-lounge]').forEach(
    b =>
      (b.onclick = () => {
        const r = toggleLounge(state, b.dataset.lounge);
        toast(r.ok ? r.message : r.error, !r.ok);
        if (r.ok) {
          world.sync(state);
          save(true);
          renderPanel();
        }
      })
  );
}
function warshipCard() {
  if (!warshipRevealed(state))
    return '<article class="warship-card locked"><div class="warship-head"><span>？</span><div><small>HIDDEN BLUEPRINT</small><h3>？？？ · 隱藏藍圖</h3></div></div><p>藍圖被海水浸濕了，只看得出巨大的龍骨……占領一座島嶼後或許能解讀。</p></article>';
  const checks = fusionChecks(state),
    f = state.shipFusion,
    ready = checks.every(([, ok]) => ok);
  return `<article class="warship-card"><div class="warship-head"><span>⚓</span><div><small>HIDDEN BLUEPRINT · 隱藏藍圖</small><h3>戰艦 · 比斯泰德號</h3></div></div><p>避難所與 LV3 小艇融合成五層甲板的移動堡壘：基地設施全部搬上甲板繼續運作；小艇仍可放下單獨探索。</p>${
    state.ship
      ? '<div class="info-strip">✓ 戰艦已完成，停泊於停靠站外海。</div>'
      : f
        ? `<div class="info-strip">融合中…… 剩餘 ${Math.max(0, Math.ceil(f.readyAt - state.elapsed))} 秒</div><div class="egg-bar"><i style="width:${clamp((1 - (f.readyAt - state.elapsed) / f.duration) * 100, 0, 100)}%"></i></div>`
        : `<ul class="checklist">${checks.map(([n, ok]) => `<li class="${ok ? 'done' : ''}">${ok ? '✓' : '○'} ${n}</li>`).join('')}</ul><div class="cost fusion-cost">${Object.entries(
            FUSION_COST
          )
            .map(
              ([k, v]) =>
                `<span class="${funds(state, k) >= v ? '' : 'short'}">${RESOURCE_NAMES[k]} ${funds(state, k)}/${v}</span>`
            )
            .join(
              ''
            )}</div><button id="fuse-btn" class="primary full-button" ${ready && canPay(state, FUSION_COST) ? '' : 'disabled'}>開始融合 · 需時 120 秒</button>`
  }</article>`;
}
let lastMono = '',
  monoTimer = 0;
function showMonologue(text) {
  const el = $('monologue');
  el.dataset.raw = text;
  el.querySelector('p').textContent = P(text);
  el.hidden = false;
  el.classList.remove('show', 'collapsed');
  void el.offsetWidth;
  el.classList.add('show');
  monoTimer = 11;
  clearTimeout(monoCollapse);
  if (compactHud()) monoCollapse = setTimeout(() => el.classList.add('collapsed'), 4000);
}
let monoCollapse = 0;
const compactHud = () => document.body.classList.contains('landscape-play') || innerWidth < 760 || innerHeight < 520;
function updateMonologue(force = false) {
  if (!running) return;
  const m = monologue(state);
  if (!m) return;
  $('quest-hint').dataset.raw = m.text;
  $('quest-hint').textContent = P(m.text);
  if (tutorialActive(state)) return;
  state.monoSeen ??= [];
  if (force) {
    showMonologue(m.text);
    lastMono = m.id;
    return;
  }
  if (m.id !== lastMono) {
    lastMono = m.id;
    if (!state.monoSeen.includes(m.id)) {
      state.monoSeen.push(m.id);
      log(state, '內心獨白', m.text);
      showMonologue(m.text);
    }
  }
}
function gather(id) {
  const r = harvest(state, id);
  if (r.ok) {
    flyResources({ [r.node.kind]: r.node.yield }, r.node.x, 1, r.node.z);
    haptic('pickup');
  } else if (r.full) bagFullNotice();
  else toast(r.error, true);
  if (r.ok) {
    audio.note(720, 0.14);
    save(true);
    updateUI();
  }
}
function activateObject(hit) {
  if (hit.type === 'claim') claim(hit.id);
  else if (hit.type === 'site') handleExploration(hit.id);
  else if (hit.type === 'facility') enterFocus(hit.id);
  else if (hit.type === 'node') {
    if ((state.harvested?.[hit.id] || 0) > state.elapsed) return;
    selectedTarget = hit.id;
    gather(hit.id);
  }
}
/* ---------------------------------------------------------------- using a facility
   Pressing 操作 on a facility "enters" it without touching the camera: first person stays first person, third
   person stays third person, and you can keep looking around. The bottom bar only offers 管理 (the text panel)
   and 離開. Everything else is done by tapping the things in the building (or the marker floating over each),
   which opens a small card beside it. Entering the shelter steps you inside; in third person its roof lifts away
   so you can see in. Lamps, chairs and stairs act at once. */
let focus = null; // { id, type, item: key of the open card or null }
// What can be used in each facility, and where it sits (building-local coordinates).
const FOCUS_ITEMS = {
  shelter: [{ key: 'bed', label: '床鋪', at: [0, 0.85, -0.3] }],
  collector: [{ key: 'tap', label: '儲水桶', at: [0.85, 1.05, 0] }],
  beacon: [{ key: 'beacon', label: '訊號塔', at: [0, 1.6, 0] }],
  hatchery: [{ key: 'dome', label: '孵化槽', at: [0, 1.9, 0] }],
  table: [{ key: 'bench', label: '工作檯', at: [0, 1.45, 0] }],
  desk: [
    { key: 'laptop', label: '破舊筆電', at: [-0.25, 1.55, -0.1] },
    { key: 'device', label: '隨身裝置', at: [0.45, 1.45, 0.12] },
    { key: 'locker', label: '儲物箱', at: [0.1, 1.05, 0.95] }
  ],
  pen: [], // the beasts themselves, see focusItems()
  dock: []
};
const nearBuilding = b => nearFacility(state, b);
// The usable things in the focused building, each with its position in the world right now.
function focusItems(b) {
  if (b.type === 'pen')
    return occupants(state, penId(b))
      .map(p => ({ key: 'pet:' + p.id, label: p.name, petId: p.id, pos: world.petPoint(p.id) }))
      .filter(i => i.pos);
  normalizeDevice(state);
  return (FOCUS_ITEMS[b.type] || [])
    .filter(i => i.key !== 'device' || !state.device.owned)
    .map(i => ({ ...i, pos: world.facilityPoint(b, i.at) }));
}
function enterFocus(id) {
  const b = findFacility(state, id);
  if (!b || !running || paused) return;
  // one-press furniture
  if (b.type === 'lamp') {
    if (!nearBuilding(b)) return toast('靠近一點才能開關燈。', true);
    b.off = !b.off;
    toast(b.off ? '燈熄了。' : '燈亮了。');
    audio.note(b.off ? 420 : 660, 0.08);
    world.sync(state);
    save(true);
    return;
  }
  if (b.type === 'stairs') {
    const r = climb(state, b);
    toast(r.ok ? r.message : r.error, !r.ok);
    if (r.ok) world.sync(state);
    return;
  }
  if (b.type === 'chair') {
    if (!nearBuilding(b)) return toast('走到椅子旁才能坐下。', true);
    if (state.vitals.health >= 98 || state.resources.food < 1) return toast('目前不需要休息，或口糧不足。');
    state.resources.food--;
    state.vitals.health = Math.min(100, state.vitals.health + 15);
    toast('坐下來喘口氣，體力 +15。');
    save(true);
    updateUI();
    return;
  }
  if (!FOCUS_ITEMS[b.type]) {
    openFacility(id);
    return;
  }
  closePanel();
  releaseMouse(); // the cursor is needed to click things; drag to look around
  keys.clear();
  destination = null;
  focus = { id, type: b.type, item: null };
  // step in through the tent flap, facing the bed
  if (b.type === 'shelter' && !b.ship && nearBuilding(b) && state.player.mode === 'foot') {
    const spot = world.facilityPoint(b, [0, 0, 0.85]),
      bed = world.facilityPoint(b, [0, 0, -0.3]);
    if (spot && bed) {
      state.player.x = spot.x;
      state.player.z = spot.z;
      state.player.heading = Math.atan2(bed.x - spot.x, bed.z - spot.z);
      if (world.firstPerson) world.yaw = Math.atan2(spot.x - bed.x, spot.z - bed.z);
    }
  }
  world.inside = id;
  document.body.classList.add('focus-on');
  renderFocus();
}
function exitFocus() {
  if (!focus) return;
  focus = null;
  world.inside = null;
  document.body.classList.remove('focus-on');
  $('focus-ui').hidden = true;
}
// Esc / B: close the open card first, then leave
function focusBack() {
  if (focus?.item) {
    focus.item = null;
    renderFocus();
  } else exitFocus();
}
function openFocusItem(key) {
  if (!focus) return;
  focus.item = focus.item === key ? null : key;
  audio.note(560, 0.05);
  renderFocus();
}
function selectFocusPet(id) {
  openFocusItem('pet:' + id);
}
function focusDone(r) {
  toast(r.ok ? r.message : r.error, !r.ok);
  if (r.ok) {
    world.sync(state);
    save(true);
    updateUI();
  }
  renderFocus();
}
// The card for one item: what it says and what you can do with it.
function focusCard(b, item, near) {
  const acts = [],
    act = (label, fn, opts = {}) => acts.push({ label, fn, ...opts }),
    card = {
      eyebrow: RECIPES[b.type].name,
      title: item.label,
      info: near ? '' : '走近一點才能操作。',
      extra: '',
      acts
    };
  if (item.petId) {
    const p = state.tamed.find(p => p.id === item.petId);
    if (!p) return null;
    const ph = phenotype(p.genome),
      active = state.expedition?.activeId === p.id;
    card.eyebrow = `${penLabel(state, p.penId)} · 第 ${p.generation} 代`;
    card.title = p.name;
    card.info = `羈絆 ${Math.round(p.bond || 0)} · 體力 ${Math.round(p.health ?? 100)} · 精力 ${Math.round(p.stamina ?? 100)}`;
    card.extra = `<div class="gene-chips">${describeGenes(p.genome)
      .map(t => `<span>${esc(t)}</span>`)
      .join(
        ''
      )}</div><small class="focus-meta">${ABILITIES[ph.ability]} · 游速 ${ph.speed} · 防禦 ${ph.armor} · 親和 ${ph.affinity}</small><form class="focus-rename" hidden><input type="text" maxlength="16" value="${esc(p.name)}" aria-label="新名字" autocomplete="off"><button type="submit">儲存</button></form>`;
    act('默契訓練 · 口糧 2 / 異晶 1', () => focusDone(trainPet(state, p.id)), { primary: true });
    if (active) act('讓牠回池休息', () => focusDone(commandPet(state, p.id, 'home')));
    else act('帶牠出發（跟隨）', () => focusDone(commandPet(state, p.id, 'follow')));
    act('改名', () => {
      const form = $('focus-ui').querySelector('.focus-rename');
      form.hidden = false;
      form.querySelector('input').focus();
    });
    act('換展示池', () => {
      exitFocus();
      geneTab = 'collection';
      openPanel('creatures');
    });
  } else if (item.key === 'bed') {
    const night = isNight(state);
    card.info = near
      ? night
        ? '外面已經黑了。睡一覺，天亮前不會有事。'
        : '天黑後（18:36 起）才能睡覺；白天可以躺一下恢復體力。'
      : card.info;
    if (night) act('睡覺 · 度過黑夜', () => startSleep(), { primary: true, disabled: !near });
    act('躺下休息 · 口糧 1 / 淡水 1 → 體力 +45', () => restInShelter(), { primary: !night, disabled: !near });
  } else if (item.key === 'tap') {
    card.info = `儲水 ${b.waterStored || 0} / 20 · 每 35 秒 +2` + (near ? '' : ' · ' + card.info);
    act('取出淡水', () => focusDone(useFacility(state, focus.id, 'collect')), {
      primary: true,
      disabled: !near || !b.waterStored
    });
  } else if (item.key === 'beacon') {
    act('掃描島嶼訊號', () => focusDone(useFacility(state, focus.id, 'signal')), { primary: true, disabled: !near });
    act('島嶼航線', () => {
      exitFocus();
      journalTab = 'routes';
      openPanel('journal');
    });
  } else if (item.key === 'dome') {
    const eggs = state.eggs.filter(e => e.readyAt > state.elapsed);
    card.info = eggs.length ? `${eggs.length} 顆卵正在孵育` : '孵化槽是空的。';
    act(
      '基因配對與孵育',
      () => {
        exitFocus();
        geneTab = 'breed';
        openPanel('creatures');
      },
      { primary: true }
    );
  } else if (item.key === 'bench') {
    card.eyebrow = '工作桌 · 契約書';
    card.info = `背包裡有 ${state.contracts || 0} 份契約書。帶在身上，靠近信任你的野生御獸按「契約」就能締結；信任度就是成功率。`;
    if (!near) card.info += ' 走到桌旁才能製作。';
    act('製作契約書 · 纖維 2 + 異晶 1', () => focusDone(craftContract(state, b)), {
      primary: true,
      disabled: !near || !state.secret
    });
    act(
      '製作誘餌 · 口糧 1 + 纖維 1 → 3 份',
      () => {
        const r = craftBait(state);
        focusDone(r.ok ? { ok: true, message: `誘餌 +3（共 ${state.resources.bait} 份）` } : r);
      },
      { disabled: !state.secret }
    );
  } else if (item.key === 'laptop') {
    card.eyebrow = '破舊筆電';
    card.title = '系統修復模式';
    if (near) {
      const r = readLaptop(state);
      if (r.ok && r.first) {
        log(state, '破舊筆電', '開機畫面停在修復模式。最後一筆同步，是我出車禍的那個早上。');
        save(true);
      }
      card.extra = `<pre class="laptop-screen">${(r.lines || []).map(esc).join('\n')}</pre>`;
      card.info = '（電源鍵按不太下去。也許哪天找到零件，可以把它修好。）';
    }
  } else if (item.key === 'locker') {
    normalizeBag(state);
    const stored = Object.values(state.storage).reduce((a, b) => a + b, 0),
      next = nextBag(state);
    card.eyebrow = '漂流書桌 · 儲物箱';
    card.info = `背包 ${bagUsed(state)} / ${bagCap(state)} · 書桌存放 ${stored} 件。在家時，建造會一併使用書桌上的材料。`;
    act('存入材料', () => focusDone(deposit(state)), { primary: true, disabled: !near });
    act('取出補給（口糧、淡水、誘餌）', () => focusDone(takeSupplies(state)), { disabled: !near });
    if (next)
      act(`加大背包 → ${next.cap} 件 · ${costLabel(next.cost)}`, () => focusDone(upgradeBag(state)), {
        disabled: !near || !canPay(state, next.cost)
      });
  } else if (item.key === 'device') {
    act(
      '拿起隨身裝置',
      () => {
        const r = takeDevice(state);
        if (r.ok) {
          haptic('discover');
          log(
            state,
            '隨身裝置',
            '螢幕裂了一角，電量只剩一點，但還能開機。沒有訊號——這裡沒有任何基地台。至少它能幫我記住每一件事。'
          );
        }
        focusDone(r);
        if (r.ok) {
          exitFocus();
          openDevice();
        }
      },
      { primary: true, disabled: !near }
    );
  }
  return card;
}
function renderFocus() {
  if (!focus) return;
  const b = findFacility(state, focus.id);
  if (!b) return exitFocus();
  const ui = $('focus-ui'),
    near = nearBuilding(b),
    items = focusItems(b),
    item = items.find(i => i.key === focus.item),
    card = item && focusCard(b, item, near);
  if (focus.item && !card) focus.item = null;
  const title = b.type === 'pen' ? penLabel(state, penId(b)) : RECIPES[b.type].name,
    hint = !near
      ? '走近一點才能操作。'
      : items.length
        ? b.type === 'pen'
          ? `${items.length} / 3 隻 · 點選牠們查看與互動`
          : '點擊建築裡的物品操作'
        : b.type === 'pen'
          ? '池裡還沒有住民。'
          : '';
  ui.innerHTML = `<div class="focus-spots">${items
    .map(
      i =>
        `<button type="button" class="focus-spot${i.key === focus.item ? ' open' : ''}" data-spot="${esc(i.key)}"><span>${esc(i.label)}</span></button>`
    )
    .join('')}</div>${
    card
      ? `<div class="focus-card" data-card="${esc(item.key)}"><button type="button" class="focus-card-close" data-focus-close aria-label="關閉">×</button><header><small>${esc(card.eyebrow)}</small><h3>${esc(card.title)}</h3>${card.info ? `<p>${esc(card.info)}</p>` : ''}</header>${card.extra}${
          card.acts.length
            ? `<div class="focus-actions">${card.acts
                .map(
                  (a, i) =>
                    `<button type="button" data-focus-act="${i}" class="${a.primary ? 'primary' : ''}" ${a.disabled ? 'disabled' : ''}>${esc(a.label)}</button>`
                )
                .join('')}</div>`
            : ''
        }</div>`
      : ''
  }<div class="focus-bar"><div class="focus-bar-text"><strong>${esc(title)}</strong>${hint ? `<small>${esc(hint)}</small>` : ''}</div><button type="button" data-focus-manage>管理</button><button type="button" data-focus-back class="primary">離開</button></div>`;
  ui.hidden = false;
  if (gamepadActive) setTimeout(() => focusMenu(0, true), 0);
  ui.querySelectorAll('[data-spot]').forEach(btn => (btn.onclick = () => openFocusItem(btn.dataset.spot)));
  ui.querySelectorAll('[data-focus-act]').forEach(btn => (btn.onclick = () => card.acts[btn.dataset.focusAct].fn()));
  ui.querySelector('[data-focus-close]')?.addEventListener('click', () => openFocusItem(focus.item));
  ui.querySelector('[data-focus-back]').onclick = exitFocus;
  ui.querySelector('[data-focus-manage]').onclick = () => {
    const id = focus.id;
    exitFocus();
    openFacility(id);
  };
  const rename = ui.querySelector('.focus-rename');
  if (rename)
    rename.onsubmit = e => {
      e.preventDefault();
      const r = renamePet(state, item.petId, rename.querySelector('input').value);
      focusDone(r.ok ? { ok: true, message: `改名為「${r.name}」。` } : r);
    };
  promptPanel(ui);
  placeFocusSpots();
}
// Every frame: keep the markers on their objects, and the open card beside its object.
function placeFocusSpots() {
  if (!focus) return;
  const b = findFacility(state, focus.id);
  if (!b) return;
  const ui = $('focus-ui'),
    items = new Map(focusItems(b).map(i => [i.key, i]));
  for (const el of ui.querySelectorAll('[data-spot]')) {
    const i = items.get(el.dataset.spot),
      p = i && world.screenPoint(i.pos.x, i.pos.y, i.pos.z);
    el.hidden = !p?.visible;
    if (p?.visible) el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
  }
  const card = ui.querySelector('.focus-card'),
    i = card && items.get(card.dataset.card);
  if (i) {
    const p = world.screenPoint(i.pos.x, i.pos.y, i.pos.z),
      w = card.offsetWidth,
      h = card.offsetHeight,
      bar = ui.querySelector('.focus-bar').getBoundingClientRect().top;
    // beside the object: to its right if there is room, else to its left; kept on screen and above the bar
    let x = p.x + 28,
      y = p.y - h / 2;
    if (x + w > innerWidth - 12) x = p.x - 28 - w;
    x = Math.max(12, Math.min(innerWidth - w - 12, x));
    y = Math.max(12, Math.min(bar - h - 10, y));
    card.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }
}
// A tap in the scene while inside a facility: the nearest usable thing under the pointer (or a beast in the pen).
function tapInFocus(e) {
  const b = findFacility(state, focus.id);
  if (!b) return exitFocus();
  const items = focusItems(b);
  const pet = world.pickPet(e.clientX, e.clientY);
  if (pet && items.some(i => i.petId === pet)) return openFocusItem('pet:' + pet);
  const hit = world.pickFacilityPoint(b, e.clientX, e.clientY);
  if (hit) {
    const best = items
      .filter(i => !i.petId)
      .map(i => ({ i, d: hit.distanceTo(i.pos) }))
      .sort((a, b) => a.d - b.d)[0];
    if (best && best.d < 1.4) return openFocusItem(best.i.key);
  }
  if (focus.item) return openFocusItem(focus.item);
  // tapping another facility moves over to it
  const other = world.pickObject(e.clientX, e.clientY);
  if (other?.type === 'facility' && other.id !== focus.id) {
    exitFocus();
    enterFocus(other.id);
  }
}
// The contract button / X key: the wild beast currently in reach.
function contractTarget() {
  if (!running || !state.secret || !(state.contracts > 0)) return null;
  const t = selectedTarget && state.wild.find(w => w.id === selectedTarget);
  const near = t && Math.hypot(t.x - state.player.x, t.z - state.player.z) <= 12 ? t : null;
  const w =
    near ||
    state.wild
      .filter(w => w.trust > 0 && Math.hypot(w.x - state.player.x, w.z - state.player.z) <= 12)
      .sort((a, b) => b.trust - a.trust)[0];
  return w && w.trust > 0 && !frenzied(w, state.elapsed) ? w : null;
}
function contractNearest() {
  const w = contractTarget();
  if (w) performContract(w.id);
  else if (!(state.contracts > 0)) toast('背包裡沒有契約書。到木筏的工作桌製作。', true);
  else toast('附近沒有信任你的野生御獸。', true);
}
function updateContractButton() {
  const w = contractTarget(),
    btn = $('contract-btn');
  btn.hidden = !w || !!panel || !!buildType || !!focus;
  if (w) {
    const p = Math.round(w.trust);
    btn.classList.toggle('danger', p < FRENZY.below);
    btn.querySelector('span').innerHTML =
      `${p < FRENZY.below ? '強行契約' : '契約'} ${p}%<small> · 剩 ${state.contracts}</small>`;
  }
}
// Use a contract scroll from the bag on the wild beast in front of you.
function performContract(id) {
  if (!running || paused) return;
  const r = contract(state, id);
  if (r.ok) {
    selectedTarget = null;
    haptic('discover');
    audio.note(940, 0.5);
    log(state, '御獸契約', `契約書亮了起來，${r.tamed.name} 把頭靠了過來。契約成立。`);
    discover(
      '契約成立',
      r.tamed.penId
        ? `${r.tamed.name} 成為你的御獸，已入住${penLabel(state, r.tamed.penId)}。`
        : `${r.tamed.name} 成為你的御獸，收進御獸倉庫（展示池都滿了，隨時可以從裝置帶牠出來）。`
    );
    world.sync(state);
    save(true);
    updateUI();
    return;
  }
  toast(r.error, true);
  if (r.frenzy) {
    haptic('hit');
    audio.splash(1);
  }
  save(true);
  updateUI();
}
// Resting in the tent: the screen dims, time passes a little, you wake up rested.
function restInShelter() {
  const r = useFacility(state, focus.id, 'rest');
  if (!r.ok) return toast(r.error, true);
  const fade = $('focus-fade');
  fade.hidden = false;
  requestAnimationFrame(() => fade.classList.add('on'));
  setTimeout(() => {
    fade.classList.remove('on');
    setTimeout(() => (fade.hidden = true), 700);
    focusDone(r);
  }, 1100);
}
// Sleeping through the night: the screen dims, the clock races on to 06:30 in about seven seconds, and you wake
// fully rested. Nothing drains while you sleep.
const SLEEP_SECONDS = 7;
let sleeping = null;
function startSleep() {
  if (sleeping || !focus) return;
  const b = findFacility(state, focus.id);
  if (!b || !nearBuilding(b)) return toast('走到床邊才能睡覺。', true);
  if (!isNight(state)) return toast('天還亮著，睡不著。', true);
  sleeping = {
    start: performance.now(),
    from: state.elapsed,
    to: nextMorning(state),
    health: state.vitals.health,
    hatched: []
  };
  exitFocus();
  keys.clear();
  destination = null;
  releaseMouse();
  const el = $('sleep-overlay');
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('on'));
  audio.note(330, 0.6);
}
function tickSleep() {
  // timed on the wall clock (not the capped frame time), so it takes seven seconds even on a slow device; eased,
  // so falling asleep and waking up pass slowly and the middle of the night rushes by
  const t = Math.min(SLEEP_SECONDS, (performance.now() - sleeping.start) / 1000),
    k = t / SLEEP_SECONDS,
    target = sleeping.from + (sleeping.to - sleeping.from) * k * k * (3 - 2 * k);
  while (state.elapsed < target - 1e-6)
    for (const e of tickSystems(state, Math.min(5, target - state.elapsed), true))
      if (e.type === 'hatch') sleeping.hatched.push(e.pet);
  state.vitals.health = Math.max(state.vitals.health, sleeping.health + (100 - sleeping.health) * k);
  $('sleep-clock').textContent = deviceClock();
  if (t < SLEEP_SECONDS) return;
  const hatched = sleeping.hatched;
  sleeping = null;
  state.vitals.health = 100;
  const el = $('sleep-overlay');
  el.classList.remove('on');
  setTimeout(() => (el.hidden = true), 900);
  world.sync(state);
  toast('一覺到天亮。體力全滿。');
  if (hatched.length) discover('新的生命誕生', `${hatched.map(p => p.name).join('、')} 在夜裡破殼而出。`);
  save(true);
  updateUI();
}
function openFacility(id) {
  activeFacility = id;
  if (panel === 'facility') {
    renderPanel();
    return;
  }
  openPanel('facility');
}
function islandMenu() {
  return (
    '<p class="dv-note">選一座島設定航線；靠岸按 Q 登島。</p>' +
    ISLANDS.map(
      i =>
        `<button class="full-button island-route" data-island="${i.id}">△ ${i.name} · ${Math.round(Math.hypot(i.x - state.player.x, i.z - state.player.z))}m <small>設定航線 →</small></button>`
    ).join('')
  );
}
function bindIslandMenu(body) {
  body.querySelectorAll('[data-island]').forEach(
    b =>
      (b.onclick = () => {
        if (state.player.mode === 'foot') {
          toast('請先回到停泊處登艇，再設定島嶼航線。');
          return;
        }
        const spots = islandDocks()
          .filter(d => d.island === b.dataset.island)
          .sort(
            (a, b) =>
              Math.hypot(a.boat.x - state.player.x, a.boat.z - state.player.z) -
              Math.hypot(b.boat.x - state.player.x, b.boat.z - state.player.z)
          );
        closePanel();
        destination = { ...spots[0].boat };
        selectedTarget = null;
        toast('航線已標記；可用 WASD 調整航向。');
      })
  );
}
function renderFacility(body) {
  const b = findFacility(state, activeFacility);
  if (!b) {
    body.innerHTML = '<p>找不到此設施。</p>';
    return;
  }
  // Management only: using a facility happens in the world (tap it, then the things in it).
  const title = b.type === 'pen' ? penLabel(state, penId(b)) : RECIPES[b.type].name;
  $('drawer-title').textContent = title;
  body.innerHTML = '';
  if (b.type === 'pen') {
    const id = penId(b);
    body.insertAdjacentHTML('beforeend', housingMarkup(occupants(state, id), id));
    const eggs = reserved(state, id);
    if (eggs.length)
      body.insertAdjacentHTML(
        'beforeend',
        '<p class="section-label">本池預留幼體</p>' +
          eggs
            .map(
              e =>
                `<div class="egg-row">${esc(e.name)} · 第 ${e.generation} 代<small>孵化後入住 ${esc(penLabel(state, id))}</small></div>`
            )
            .join('')
      );
    bindHousing(body);
    body.insertAdjacentHTML(
      'afterbegin',
      `<form id="rename-pen" class="rename-pen"><label for="pen-name">展示池名稱 <small>最多 16 個字</small></label><div><input id="pen-name" type="text" value="${esc(penLabel(state, id))}" autocomplete="off" placeholder="例如：星光水母館" aria-label="展示池名稱"><button type="submit">儲存名稱</button></div><p id="pen-name-error" role="status"></p></form>`
    );
    $('rename-pen').onsubmit = e => {
      e.preventDefault();
      const r = renamePen(state, id, $('pen-name').value);
      if (!r.ok) {
        $('pen-name-error').textContent = r.error;
        return;
      }
      save(true);
      renderPanel();
      updateNearest();
      toast('已命名為「' + r.name + '」。');
    };
  }
  appendConstruction(body, b);
}
function costLabel(cost) {
  return Object.entries(cost)
    .map(([k, v]) => `${RESOURCE_NAMES[k]} ${v}`)
    .join(' · ');
}
function renderPanel() {
  if (!panel) return;
  normalizeHousing(state);
  normalizeExpansion(state);
  const settings = {
    build: ['HABITAT', '建造避難所'],
    bag: ['SUPPLIES', '漂流者的背包'],
    journal: ['LOGBOOK', '航海日誌'],
    creatures: ['SYMBIOSIS', '共生研究'],
    facility: ['FACILITY', '設施操作'],
    adventure: ['BEASTKEEPER', '御獸與遠航'],
    cargo: ['CARGO HOLD', '物資艙'],
    lounge: ['BEAST LOUNGE', '御獸休息室'],
    device: ['HANDHELD', '隨身裝置'],
    beasts: ['BEASTS', '御獸倉庫']
  };
  $('drawer-eyebrow').textContent = settings[panel][0];
  $('drawer-title').textContent = settings[panel][1];
  const body = $('drawer-body');
  if (panel === 'beasts') {
    renderBeastStorage(body);
    decorateDevice(body);
    promptPanel(body);
    return;
  }
  beastStage.clear();
  if (panel === 'device') {
    deviceHome(body);
    decorateDevice(body);
    promptPanel(body);
    return;
  }
  if (panel === 'adventure') {
    renderAdventure(body, state, {
      toast,
      save: () => save(true),
      sync: () => world.sync(state),
      close: closePanel,
      refresh: renderPanel,
      route: routeExplore
    });
    return;
  }
  if (panel === 'facility') {
    renderFacility(body);
    return;
  }
  if (panel === 'cargo') {
    renderCargo(body);
    return;
  }
  if (panel === 'lounge') {
    renderLounge(body);
    return;
  }
  if (panel === 'build') {
    // a compact grid: icon, name and cost on each tile (the description as its tooltip); tap a tile to place it.
    // Existing buildings are managed by tapping them in the world (管理), not from a list here.
    const upper = !state.ship && count(state, 'upperfloor') > 0,
      fortress = !!state.ship,
      waiting = pendingFacilities(state);
    if (!upper) buildLevel = 0;
    body.innerHTML =
      (fortress
        ? `<p class="dv-note">比斯泰德號甲板 · 已用 ${usedSlots(state).size} / ${SHIP_SLOTS.length} 個艙位。點設施就會放進空位。</p>${
            waiting.length
              ? `<div class="pending-row"><span>待安置</span>${waiting
                  .map(
                    b =>
                      `<button type="button" data-install="${facilityId(b)}">${esc(b.type === 'pen' ? penLabel(state, penId(b)) : RECIPES[b.type].name)} · 安置</button>`
                  )
                  .join('')}</div>`
              : ''
          }`
        : '') +
      (upper
        ? `<div class="build-floors"><span>施工樓層</span><span class="seg">${[
            [0, '一樓'],
            [1, '二樓']
          ]
            .map(
              ([v, l]) =>
                `<button type="button" data-level="${v}" class="${buildLevel === v ? 'active' : ''}">${l}</button>`
            )
            .join('')}</span></div>`
        : '') +
      `<div class="build-grid">${Object.entries(RECIPES)
        .filter(
          ([k, r]) =>
            !r.fixed && (!r.hidden || state.secret) && (!r.unlock || r.unlock(state)) && !(fortress && isStructure(k))
        )
        .map(([k, r]) => {
          const full = LIMITS[k] && count(state, k) >= LIMITS[k];
          return `<button type="button" class="build-tile" data-build="${k}" title="${esc(r.desc)}" ${full || !canPay(state, r.cost) ? 'disabled' : ''}><span>${r.icon}</span><b>${r.name}</b><small>${full ? `已達上限 ${LIMITS[k]}` : costLabel(r.cost)}</small></button>`;
        })
        .join('')}</div>` +
      (warshipRevealed(state) && !state.ship ? warshipCard() : '');
    body.querySelectorAll('[data-install]').forEach(
      b =>
        (b.onclick = () => {
          const r = installFacility(state, b.dataset.install, findFacility);
          toast(r.ok ? r.message : r.error, !r.ok);
          if (r.ok) {
            normalizeHousing(state);
            world.sync(state);
            save(true);
            renderPanel();
          }
        })
    );
    body.querySelectorAll('[data-level]').forEach(
      b =>
        (b.onclick = () => {
          buildLevel = Number(b.dataset.level);
          renderPanel();
        })
    );
    body.querySelectorAll('[data-build]').forEach(b => (b.onclick = () => startBuild(b.dataset.build)));
    if ($('fuse-btn'))
      $('fuse-btn').onclick = () => {
        const r = startFusion(state);
        toast(r.ok ? r.message : r.error, !r.ok);
        if (r.ok) {
          closePanel();
          discover('融合開始', '避難所與小艇正在合而為一……');
          log(state, '融合工程', '把所有材料投進去的那一刻，木筏輕輕震了一下。');
          world.sync(state);
          save(true);
          updateUI();
        }
      };
  }
  if (panel === 'bag') {
    normalizeBag(state);
    const used = bagUsed(state),
      cap = bagCap(state);
    body.innerHTML =
      `<div class="bag-meter${used >= cap ? ' full' : ''}"><span>背包 ${used} / ${cap}</span><i><b style="width:${Math.min(100, (used / cap) * 100)}%"></b></i></div>` +
      `<div class="bag-grid">${Object.keys(RESOURCE_NAMES)
        .map(
          k =>
            `<div class="bag-slot"><span>${RESOURCE_ICONS[k]}</span><b>${state.resources[k]}</b><small>${RESOURCE_NAMES[k]}${state.storage[k] ? ` · 書桌 ${state.storage[k]}` : ''}</small></div>`
        )
        .join(
          ''
        )}<div class="bag-slot"><span>📜</span><b>${state.contracts || 0}</b><small>契約書</small></div></div>` +
      (used >= cap ? `<p class="dv-note">${bagFullError}</p>` : '') +
      (state.secret
        ? `<button class="full-button" id="craft-bait" ${canPay(state, { food: 1, fiber: 1 }) ? '' : 'disabled'}>製作誘餌 · 口糧 1 + 纖維 1 → 3 份</button>`
        : '');
    if ($('craft-bait'))
      $('craft-bait').onclick = () => {
        const r = craftBait(state);
        toast(r.ok ? '誘餌 +3' : r.error, !r.ok);
        renderPanel();
        updateUI();
        save(true);
      };
  }
  if (panel === 'journal' && journalTab === 'routes') {
    body.innerHTML = journalTabs() + islandMenu();
    bindIslandMenu(body);
    bindJournalTabs(body);
  } else if (panel === 'journal' && journalTab !== 'log') {
    body.innerHTML = journalTabs() + (journalTab === 'codex' ? codexHTML() : achievementsHTML());
    bindJournalTabs(body);
  } else if (panel === 'journal') {
    const page = paged('log', state.log, compactPanels() ? 3 : 5);
    body.innerHTML =
      journalTabs() +
      (page.items.length
        ? page.items
            .map(
              l =>
                `<article class="journal-entry compact"><small>DAY ${l.day.toString().padStart(2, '0')}</small><h3>${esc(l.title)}</h3><p>${esc(l.text)}</p></article>`
            )
            .join('')
        : '<p class="dv-note">還沒有紀錄。</p>') +
      page.bar;
    bindJournalTabs(body);
  }
  if (panel === 'creatures') {
    if (!state.secret) {
      body.innerHTML =
        '<div class="info-strip">尚未解讀生命訊號。</div><p>你的第二次人生並不是這片海唯一的祕密。東北方的發光浮標，在反覆發送一段紀錄。</p><button id="track-buoy" class="full-button">標記研究浮標</button>';
      $('track-buoy').onclick = () => {
        closePanel();
        selectedTarget = 'buoy';
        destination = { x: 17, z: -6 };
        toast('已標記浮標。也可用 WASD 自行駕艇。');
      };
      return;
    }
    body.innerHTML = `<div class="tabs"><button data-gene-tab="collection" class="${geneTab === 'collection' ? 'active' : ''}">展示場 ${state.tamed.length}</button><button data-gene-tab="breed" class="${geneTab === 'breed' ? 'active' : ''}">基因雜交</button></div><div class="info-strip">已安置 ${state.tamed.filter(p => p.penId).length} / ${count(state, 'pen') * 3} · 孵育 ${state.eggs.length}<br>每座展示池容納 3 隻，孵育中的幼體也占用名額。</div>`;
    body.querySelectorAll('[data-gene-tab]').forEach(
      b =>
        (b.onclick = () => {
          geneTab = b.dataset.geneTab;
          renderPanel();
        })
    );
    if (geneTab === 'collection') {
      if (!state.tamed.length) {
        body.innerHTML +=
          '<p>帶誘餌連續餵同一隻野生生物提高信任度，再用契約書締結。收服的御獸都會住進御獸倉庫；展示池用來陳列牠們。</p><button class="full-button" id="go-build-pen">建造展示池</button>';
        $('go-build-pen').onclick = () => openPanel('build');
      } else {
        body.innerHTML += state.tamed
          .map(p => {
            const ph = phenotype(p.genome);
            return `<article class="creature-card"><div class="specimen-hero"><img class="specimen-image" alt="${esc(p.name)}的 3D 外形" src="${world.thumbnail(p.genome, p.id)}"></div><div class="specimen-meta"><h3>${esc(p.name)}<small>GEN ${p.generation.toString().padStart(2, '0')}</small></h3><div class="gene-chips">${describeGenes(
              p.genome
            )
              .map(t => `<span>${t}</span>`)
              .join(
                ''
              )}</div><div class="mini-stats"><span>游速<b>${ph.speed}</b></span><span>防禦<b>${ph.armor}</b></span><span>親和<b>${ph.affinity}</b></span></div><p>${ABILITIES[ph.ability]} · ${['每 55 秒帶回木材', '減少你遭受的生物傷害', '每 55 秒生成異晶', '每 55 秒帶回金屬'][ph.ability]}<br>基因 ${dnaCode(p.genome)} · ${p.mutations} 處新突變${p.parentNames ? '<br>親代：' + p.parentNames.map(esc).join(' × ') : '<br>野生始祖'}</p></div></article>`;
          })
          .join('');
      }
    } else {
      const opts = selected =>
        state.tamed
          .map(
            p =>
              `<option value="${esc(p.id)}" ${selected === p.id ? 'selected' : ''}>${esc(p.name)} · G${p.generation} · ${dnaCode(p.genome).slice(0, 4)}</option>`
          )
          .join('');
      if (state.tamed.length < 2) body.innerHTML += '<p>需要先馴化兩隻不同的個體。跨外形生物也能配對。</p>';
      else if (!count(state, 'hatchery')) {
        body.innerHTML +=
          '<p>兩個親代已就緒。請先在木筏上建造基因孵化台。</p><button class="full-button" id="go-hatchery">建造孵化台</button>';
        $('go-hatchery').onclick = () => openPanel('build');
      } else {
        if (!state.tamed.some(p => p.id === preferParents[0])) preferParents[0] = state.tamed[0].id;
        if (!state.tamed.some(p => p.id === preferParents[1])) preferParents[1] = state.tamed[1].id;
        body.innerHTML += `<section class="breed-box"><h3>讓兩段生命，產生新的可能</h3><label class="field-label" for="parent-a">親代 A</label><select class="gene-select" id="parent-a">${opts(preferParents[0])}</select><label class="field-label" for="parent-b">親代 B</label><select class="gene-select" id="parent-b">${opts(preferParents[1])}</select><button class="primary full-button" id="breed-btn">開始雜交 · 異晶 1 / 口糧 2</button><p>雙親需要羈絆 35。孵育 30 秒。每組基因各繼承一半親代等位基因，每個等位基因有 4.5% 機率發生新突變。後代長成後仍可繼續配對。</p></section>`;
        $('parent-a').onchange = () => (preferParents[0] = $('parent-a').value);
        $('parent-b').onchange = () => (preferParents[1] = $('parent-b').value);
        $('breed-btn').onclick = () => {
          const r = breed(state, $('parent-a').value, $('parent-b').value);
          if (r.ok) {
            toast('基因重組成功。30 秒後迎接新生命。');
            audio.note(940, 0.4);
            save(true);
            renderPanel();
            updateUI();
          } else toast(r.error, true);
        };
      }
      body.innerHTML +=
        '<div id="eggs-list"></div><p class="section-label">重組沒有終點</p><p>16 組雙份基因決定體型、鰭、尾、角、花紋、色彩與能力。256³² 種理論基因編碼，外觀表現會有相似組合；持續雜交與突變可探索大量後代。</p>';
      renderEggs();
    }
    // Rebind tabs after innerHTML additions replaced their original nodes.
    body.querySelectorAll('[data-gene-tab]').forEach(
      b =>
        (b.onclick = () => {
          geneTab = b.dataset.geneTab;
          renderPanel();
        })
    );
    if ($('go-build-pen')) $('go-build-pen').onclick = () => openPanel('build');
    if ($('go-hatchery')) $('go-hatchery').onclick = () => openPanel('build');
    if ($('breed-btn')) {
      $('parent-a').onchange = () => (preferParents[0] = $('parent-a').value);
      $('parent-b').onchange = () => (preferParents[1] = $('parent-b').value);
      $('breed-btn').onclick = () => {
        const r = breed(state, $('parent-a').value, $('parent-b').value);
        if (r.ok) {
          toast('基因重組成功。30 秒後迎接新生命。');
          save(true);
          renderPanel();
          updateUI();
        } else toast(r.error, true);
      };
    }
  }
  if (panel === 'creatures' && state.secret && geneTab === 'collection') {
    body.insertAdjacentHTML('afterbegin', housingMarkup(state.tamed));
    bindHousing(body);
  }
  decorateDevice(body);
  promptPanel(body);
}
function renderEggs() {
  if (!$('eggs-list')) return;
  $('eggs-list').innerHTML = state.eggs
    .map(
      e =>
        `<div class="egg-row">◇ 第 ${e.generation} 代生命正在成形 · ${esc(penLabel(state, e.penId))}<small>剩餘 ${Math.max(0, Math.ceil(e.readyAt - state.elapsed))} 秒 · ${e.mutations} 處新突變</small><div class="egg-bar"><i style="width:${clamp((1 - (e.readyAt - state.elapsed) / e.duration) * 100, 0, 100)}%"></i></div></div>`
    )
    .join('');
}
function consume(type) {
  const r = useSupply(state, type);
  toast(r.ok ? (type === 'water' ? '補充水分 +35' : '補充飽食 +35') : r.error, !r.ok);
  renderPanel();
  updateUI();
  save(true);
}
function startBuild(type) {
  if (!atHome(state)) {
    toast(state.ship ? '請回到戰艦上再建造。' : '請先回到避難所附近，按 H 返航。', true);
    return;
  }
  // aboard the fortress a facility simply takes the next free deck slot
  if (state.ship) {
    const r = placeOnShip(state, type);
    toast(r.ok ? r.message : r.error, !r.ok);
    if (r.ok) {
      audio.note(450, 0.2);
      world.sync(state);
      save(true);
      updateUI();
      renderPanel();
    }
    return;
  }
  if (type === 'hatchery' && !count(state, 'pen')) {
    toast('先建造海洋展示池。', true);
    return;
  }
  closePanel();
  buildType = type;
  buildRot = 0;
  destination = null;
  world.setPlacement(type, state, ['floor', 'pen', 'stairs'].includes(type) ? 0 : buildLevel);
  if (!world.gridGroup.children.length) {
    cancelBuild();
    toast('沒有可用空間，請先擴建地基。', true);
    return;
  }
  $('build-banner').hidden = false;
  updateBuildBanner();
  updateNearest();
}
// How many more of this item the current materials (and the shelter's limits) allow.
function buildsLeft(type) {
  const cost = RECIPES[type].cost;
  let n = Math.min(99, ...Object.entries(cost).map(([k, v]) => (v > 0 ? Math.floor(funds(state, k) / v) : 99)));
  if (LIMITS[type]) n = Math.min(n, LIMITS[type] - count(state, type));
  return Math.max(0, n);
}
function updateBuildBanner() {
  if (moving) return;
  const n = buildsLeft(buildType);
  $('build-banner-name').textContent = `${RECIPES[buildType].name} · 材料還夠蓋 ${n} 個`;
  $('build-banner').querySelector('span').textContent = gamepadActive
    ? '左搖桿選格 · A 放置 · X 旋轉 · B 結束'
    : innerWidth < 760
      ? '點擊綠色格子放置；拖曳畫面環視'
      : '點擊綠色格子放置 · R 旋轉 · Esc 結束';
}
function cancelBuild() {
  buildType = null;
  if (moving) {
    moving = null;
    world?.home.children.forEach(g => (g.visible = true));
  }
  if (world) world.setPlacement(null, state);
  $('build-banner').hidden = true;
}
// Moving a building: it lifts off and follows your finger or mouse over the free cells; let go to set it down
// (a tap on a cell, Enter / E, or the gamepad's A work too). It goes through the build mode's ghost and grid.
let moving = null;
function startMove(id) {
  const b = findFacility(state, id);
  if (!b) return;
  if (['floor', 'upperfloor', 'stairs'].includes(b.type)) return toast('地板與樓梯請用拆除、重建調整。', true);
  if (!atHome(state)) return toast('請返回避難所管理建築。', true);
  closePanel();
  exitFocus();
  cancelBuild();
  buildType = b.type;
  buildRot = b.rot || 0;
  moving = id;
  destination = null;
  // free cells are judged as if the building were already lifted (and its materials never count)
  const lifted = {
    ...state,
    buildings: state.buildings.filter(v => v !== b),
    resources: Object.fromEntries(Object.keys(state.resources).map(k => [k, 99999]))
  };
  world.setPlacement(b.type, lifted, b.level || 0);
  world.ghostCell = { x: b.x, z: b.z };
  world.home.children.forEach(g => g.userData.facilityId === id && (g.visible = false));
  $('build-banner').hidden = false;
  $('build-banner-name').textContent = `搬移 ${b.type === 'pen' ? penLabel(state, penId(b)) : RECIPES[b.type].name}`;
  $('build-banner').querySelector('span').textContent = gamepadActive
    ? '左搖桿選格 · A 放下 · B 取消'
    : '拖動到綠色格子，放開即完成 · Esc 取消';
}
function finishMove() {
  const b = findFacility(state, moving),
    { x, z } = world.ghostCell;
  if (!b) return cancelBuild();
  if (x === b.x && z === b.z) {
    b.rot = buildRot;
    cancelBuild();
    world.sync(state);
    return;
  }
  const r = relocate(state, moving, x, z, b.level || 0);
  toast(r.ok ? r.message : r.error, !r.ok);
  if (!r.ok) return;
  b.rot = buildRot;
  cancelBuild();
  normalizeTravel(state);
  world.sync(state);
  audio.note(450, 0.2);
  save(true);
}
function place() {
  if (!buildType) return;
  if (moving) return finishMove();
  const { x, z } = world.ghostCell;
  if (
    state.player.mode === 'foot' &&
    (state.player.level || 0) === (world.buildLevel || 0) &&
    !['floor', 'upperfloor'].includes(buildType) &&
    Math.abs(state.player.x - x * 3.6) < 1.5 &&
    Math.abs(state.player.z - z * 3.6) < 1.5
  ) {
    toast('請先走到旁邊的地基，再放置這座設施。', true);
    return;
  }
  const r = placeBuilding(state, buildType, x, z, buildRot, world.buildLevel || 0);
  if (!r.ok) {
    toast(r.error, true);
    return;
  }
  normalizeExpansion(state);
  normalizeTravel(state);
  normalizeHousing(state);
  normalizeShip(state);
  const type = buildType,
    name = RECIPES[type].name,
    level = world.buildLevel || 0;
  audio.note(450, 0.2);
  world.sync(state);
  updateUI();
  save(true);
  // Stay in build mode: keep placing the same thing while there are materials and room for it.
  world.setPlacement(type, state, level);
  const cells = world.gridGroup.children;
  if (cells.length) {
    // keep the ghost next to the piece just placed instead of jumping back to the first free cell
    const near = cells
      .map(c => ({ x: Math.round(c.position.x / 3.6), z: Math.round(c.position.z / 3.6) }))
      .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
    world.ghostCell = near;
    updateBuildBanner();
    toast(`${name} 建造完成。可以繼續放置，按「結束建造」離開。`);
    return;
  }
  // Nothing more of this kind fits: stay in the build menu to pick something else.
  const why =
    LIMITS[type] && count(state, type) >= LIMITS[type]
      ? '已達上限'
      : !canPay(state, RECIPES[type].cost)
        ? '材料不夠再蓋一個'
        : '沒有可以放的位置了';
  cancelBuild();
  openPanel('build');
  toast(`${name} 建造完成。${why}，可以改蓋別的設施。`);
}
function returnHome() {
  if (!running || paused) return;
  if (state.inCave) {
    destination = { x: 120, z: -106 };
    closePanel();
    toast('先從洞窟出口返回海岸。');
    return;
  }
  if (state.expedition?.mounted) {
    closePanel();
    destination = { x: state.boat.x, z: state.boat.z };
    toast('已標記小艇，靠近後按 T 解除騎乘。');
    return;
  }
  // with the fortress, home is wherever the warship is: on board you are already home; ashore or in the skiff,
  // head back to it
  if (state.ship) {
    closePanel();
    selectedTarget = null;
    if (state.player.mode === 'aboard' || state.player.mode === 'ship') {
      toast('你就在家裡：比斯泰德號上。');
      return;
    }
    destination = { x: state.ship.x, z: state.ship.z };
    toast(state.player.mode === 'foot' ? '已標記戰艦，走到岸邊後按 Q 登船。' : '已標記戰艦，開到旁邊按 Q 收回小艇。');
    return;
  }
  closePanel();
  cancelBuild();
  const spot =
    state.player.mode === 'foot'
      ? dockOption(state)
      : dockingSpots(state).sort(
          (a, b) =>
            Math.hypot(a.boat.x - state.player.x, a.boat.z - state.player.z) -
            Math.hypot(b.boat.x - state.player.x, b.boat.z - state.player.z)
        )[0];
  if (state.player.mode === 'foot') {
    if (spot) {
      destination = { ...spot.foot };
      toast('走到標記處，再點登艇出海。');
    }
  } else {
    destination = spot ? { ...spot.boat } : { x: 7, z: 10 };
    toast('已設定返航路線。抵達後點「登上避難所」。');
  }
  selectedTarget = null;
}
function updateUI() {
  updateDock();
  updateBeastHUD();
  const resourceKeys = ['wood', 'metal', 'fiber', 'crystal'];
  $('resources').innerHTML = resourceKeys
    .map(
      k =>
        `<div class="resource"><span class="r-icon">${RESOURCE_ICONS[k]}</span><b>${state.resources[k]}</b><small>${RESOURCE_NAMES[k]}</small></div>`
    )
    .join('')
    .concat(
      `<div class="resource bag-load${bagRoom(state) ? '' : ' full'}" title="背包容量"><span class="r-icon">▤</span><b>${bagUsed(state)}/${bagCap(state)}</b><small>背包</small></div>`
    );
  for (const key of ['health', 'food', 'water']) {
    $(key + '-bar').style.width = state.vitals[key] + '%';
    $(key + '-val').textContent = Math.ceil(state.vitals[key]);
  }
  $('day-text').textContent = `第 ${dayOf(state)} 日`;
  const mins = hourOf(state) * 60;
  $('time-text').textContent =
    Math.floor(mins / 60)
      .toString()
      .padStart(2, '0') +
    ':' +
    Math.floor(mins % 60)
      .toString()
      .padStart(2, '0');
  const phase = dayPhase(state);
  $('weather-text').textContent =
    phase > 0.6 && phase < 0.76 ? '風浪漸強' : phase > 0.45 && phase < 0.87 ? '星夜' : '晴朗';
  $('coords').textContent =
    `${Math.abs(state.player.z).toFixed(1)} ${state.player.z < 0 ? 'N' : 'S'} / ${Math.abs(state.player.x).toFixed(1)} ${state.player.x < 0 ? 'W' : 'E'}`;
  const far = Math.hypot(state.player.x, state.player.z);
  $('zone-text').textContent = far < 35 ? '初醒淺海' : far < 80 ? '漂流之境' : '異生深海';
  let quests, title, hint, chapter;
  const nf = count(state, 'floor'),
    np = count(state, 'pen');
  if (state.ship) {
    chapter = 'CHAPTER 03 · 遠洋';
    title = '比斯泰德號，啟航';
    quests = [
      ['在駕駛室掌舵出航', !!state.guide?.helm],
      ['讓御獸登船休息', state.ship.lounge.length > 0],
      ['擊退深海守望者', !!state.expedition.boss.defeated]
    ];
    hint = '';
  } else if (state.completed && state.tamed.length) {
    chapter = 'CHAPTER 02 · 讓家出航';
    title = '避難所的極限';
    quests = [
      ['占領一座島嶼', (state.occupied || []).length > 0],
      ['建造船隻停靠站', count(state, 'dock') > 0],
      ['地基擴至上限', nf >= 20, `${Math.min(nf, 20)} / 20`],
      ['展示池擴至上限', np >= 5, `${Math.min(np, 5)} / 5`],
      ['融合戰艦', !!state.ship]
    ];
    hint = '';
  } else if (state.completed) {
    chapter = 'CHAPTER 01 · 已完成';
    title = '這片海，也可以是家';
    quests = [
      ['點亮海上避難所', true],
      ['自由擴建與探索', false],
      [state.secret ? `馴化生物 ${state.tamed.length} 隻` : '追尋海下的訊號', state.tamed.length > 0]
    ];
    hint = state.tamed.some(p => p.generation > 0)
      ? '你的新生命已經誕生。繼續培育下一代。'
      : '主線完成後，仍可探索共生與雜交的祕密。';
  } else if (state.salvaged < 3 || state.expanded < 2 || !count(state, 'shelter')) {
    chapter = 'CHAPTER 01 · 重新呼吸';
    title = '先在這片海活下來';
    quests = [
      ['打撈漂流物', state.salvaged >= 3, `${Math.min(3, state.salvaged)} / 3`],
      ['擴建浮動地基', state.expanded >= 2, `${Math.min(2, state.expanded)} / 2`],
      ['建造帆布避難所', !!count(state, 'shelter')]
    ];
    hint = '靠近物資按 E 打撈。按 B 回家建造。';
  } else {
    chapter = 'CHAPTER 01 · 海上的家';
    title = '讓漂流，有一個終點';
    quests = [
      ['建造集水蒸餾器', !!count(state, 'collector')],
      ['建造遠洋訊號塔', !!count(state, 'beacon')],
      ['完成遮風避雨的家', true]
    ];
    hint = '異晶藏在發光研究箱中。箱子會隨海流補充。';
  }
  $('quest-chapter').textContent = chapter;
  $('quest-title').textContent = title;
  {
    let open = 0;
    $('quest-list').innerHTML = quests
      .map(
        ([name, done, n]) =>
          `<div class="quest-item ${done ? 'done' : ''} ${done || open++ >= 2 ? 'minor' : ''}">${name}${n ? `<b>${n}</b>` : ''}</div>`
      )
      .join('');
  }
  // the bottom bar follows where you are: on the raft, build and the device; at sea, the device and expeditions
  const onFoot = state.player.mode === 'foot' || state.player.mode === 'aboard';
  $('build-tool').hidden = !onFoot || !atHome(state);
  $('home-btn').firstChild.textContent = state.ship ? '⌂ 回到戰艦 ' : '⌂ 導航回避難所 ';
  $('adventure-btn').hidden = onFoot;
  $('drink-count').textContent = state.resources.water || 0;
  $('eat-count').textContent = state.resources.food || 0;
  $('drink-btn').disabled = !state.resources.water || state.vitals.water >= 98;
  $('eat-btn').disabled = !state.resources.food || state.vitals.food >= 98;
  $('secret-hint').innerHTML = state.secret
    ? `<span>◇</span><div><strong>隱藏航線 · 共生計畫</strong><p>${!count(state, 'pen') ? '建造展示池，迎接第一位夥伴。' : state.tamed.length < 2 ? '馴化兩隻生物，探索基因的祕密。' : !count(state, 'hatchery') ? '建造孵化台，重組生命的可能。' : '打開共生研究，培育新的生命。'}</p></div>`
    : '<span>◇</span><div><strong>來自海下的訊號</strong><p>東北方那座浮標，好像在呼喚你。</p></div>';
  if (!storageOk) $('save-status').textContent = '存檔不可用 · 請允許瀏覽器儲存';
}
// Storm forecast: the storm runs from 60 % to 76 % of each day (see clock.js); warn 30 s ahead and point to the nearest shelter.
// Being on foot (raft, island, warship deck), in a cave or diving keeps the player out of the storm damage.
const STORM_START = 0.6 * DAY,
  STORM_END = 0.76 * DAY,
  STORM_WARN = 30;
let stormSeaTime = 0,
  stormWarned = false,
  stormShelter = null,
  stormLabel = '';
function stormClock(elapsed) {
  const t = elapsed % DAY;
  if (t >= STORM_START && t < STORM_END) return { phase: 'storm', left: STORM_END - t };
  const until = (STORM_START - t + DAY) % DAY;
  return until <= STORM_WARN ? { phase: 'warn', left: until } : null;
}
function nearestShelter() {
  const px = state.player.x,
    pz = state.player.z,
    d = (x, z) => Math.hypot(x - px, z - pz);
  const h = homePos(state),
    best = [{ name: state.ship ? '比斯泰德號' : '海上避難所', x: h.x, z: h.z, home: true }];
  for (const i of ISLANDS) {
    const dock = islandDocks()
      .filter(k => k.island === i.id)
      .sort((a, b) => d(a.boat.x, a.boat.z) - d(b.boat.x, b.boat.z))[0];
    if (dock) best.push({ name: i.name, x: dock.boat.x, z: dock.boat.z });
  }
  return best.sort((a, b) => d(a.x, a.z) - d(b.x, b.z))[0];
}
function goShelter() {
  const s = nearestShelter();
  if (!s) return;
  if (s.home) {
    returnHome();
    return;
  }
  destination = { x: s.x, z: s.z };
  selectedTarget = null;
  toast(`已標記避風處：${s.name}。靠岸後按 Q 登岸。`);
}
// Pacing statistics (local only).
let statsPrev = null;
// Achievements and codex.
let journalTab = 'log',
  progressTimer = 0,
  achievementQueue = [],
  achievementShowing = false;
function journalTabs() {
  const c = codexProgress(state);
  return `<div class="tabs journal-tabs">${[
    ['log', '日誌'],
    ['routes', '航線'],
    ['codex', `圖鑑 ${c.seen}/${c.total}`],
    ['achievements', `成就 ${achievementCount(state)}/${ACHIEVEMENTS.length}`]
  ]
    .map(
      ([k, l]) =>
        `<button type="button" data-journal-tab="${k}" class="${journalTab === k ? 'active' : ''}">${l}</button>`
    )
    .join('')}</div>`;
}
function bindJournalTabs(body) {
  body.querySelectorAll('[data-codex]').forEach(
    b =>
      (b.onclick = () => {
        codexPick = b.dataset.codex;
        renderPanel();
      })
  );
  const back = body.querySelector('[data-codex-back]');
  if (back)
    back.onclick = () => {
      codexPick = null;
      renderPanel();
    };
  bindPagers(body);
  body.querySelectorAll('[data-journal-tab]').forEach(
    b =>
      (b.onclick = () => {
        journalTab = b.dataset.journalTab;
        renderPanel();
      })
  );
}
// Long lists in the drawer turn pages instead of scrolling.
const pages = {};
const compactPanels = () => innerHeight < 520;
function paged(key, items, per) {
  const n = Math.max(1, Math.ceil(items.length / per));
  pages[key] = clamp(pages[key] || 0, 0, n - 1);
  const i = pages[key];
  return {
    items: items.slice(i * per, i * per + per),
    bar:
      n > 1
        ? `<div class="bx-pager" data-pager="${key}"><button type="button" data-page-step="-1" ${i ? '' : 'disabled'}>‹</button><span>${i + 1} / ${n}</span><button type="button" data-page-step="1" ${i < n - 1 ? '' : 'disabled'}>›</button></div>`
        : ''
  };
}
function bindPagers(body) {
  body.querySelectorAll('[data-pager]').forEach(p =>
    p.querySelectorAll('[data-page-step]').forEach(
      b =>
        (b.onclick = () => {
          pages[p.dataset.pager] += Number(b.dataset.pageStep);
          renderPanel();
        })
    )
  );
}
// The codex: a grid of species (pictures for the ones you have met); tap one for its page.
let codexPick = null;
function codexHTML() {
  const c = codexProgress(state),
    entries = codexEntries(state),
    pick = entries.find(e => e.id === codexPick && e.seen);
  if (pick)
    return `<button type="button" class="bx-back" data-codex-back>‹ 圖鑑</button><article class="codex-page ${pick.tamed ? 'tamed' : ''}"><img alt="${esc(pick.name)}" src="${world.thumbnail(pick.seen.genome, 'codex-' + pick.id)}"><div><small>${esc(pick.familyName)}${pick.tamed ? ' · 🎖 已馴化' : ''}</small><h3>${esc(pick.name)}</h3><p>${esc(pick.lore)}</p><small>第 ${pick.seen.day} 日首次記錄 · 遇見 ${pick.seen.count} 次</small></div></article>`;
  const page = paged('codex', entries, compactPanels() ? 4 : 12);
  return `<p class="codex-count">已記錄 ${c.seen} / ${c.total} · 馴化 ${c.tamed}</p><div class="codex-tiles">${page.items
    .map(e =>
      e.seen
        ? `<button type="button" class="codex-tile ${e.tamed ? 'tamed' : ''}" data-codex="${esc(e.id)}"><img alt="" src="${world.thumbnail(e.seen.genome, 'codex-' + e.id)}"><span>${esc(e.name)}</span></button>`
        : `<div class="codex-tile unknown"><b>？</b><span>${esc(e.familyName)}</span></div>`
    )
    .join('')}</div>${page.bar}`;
}
function achievementsHTML() {
  const got = state.achievements || {};
  const page = paged('achievements', ACHIEVEMENTS, compactPanels() ? 4 : 8);
  return `<div class="achievement-list compact">${page.items
    .map(a => {
      const u = got[a.id];
      return `<div class="achievement ${u ? 'done' : 'locked'}"><span class="ach-icon">${u || !a.hidden ? a.icon : '❔'}</span><div><strong>${u || !a.hidden ? esc(a.name) : '隱藏成就'}</strong><small>${u || !a.hidden ? esc(a.desc) : '繼續冒險，也許就會發現。'}</small></div><em>${u ? '第 ' + u.day + ' 日' : ''}</em></div>`;
    })
    .join('')}</div>${page.bar}`;
}
function showNextAchievement() {
  if (achievementShowing || !achievementQueue.length) return;
  const a = achievementQueue.shift(),
    el = $('achievement-pop');
  achievementShowing = true;
  el.querySelector('.ach-pop-icon').textContent = a.icon;
  el.querySelector('strong').textContent = a.name;
  el.querySelector('small').textContent = a.desc;
  el.hidden = false;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  audio.note(988, 0.12);
  setTimeout(() => audio.note(1319, 0.2), 120);
  haptic('discover');
  setTimeout(() => {
    el.hidden = true;
    achievementShowing = false;
    showNextAchievement();
  }, 3600);
}
// Runs on progress events and every couple of seconds. First run on an old save unlocks quietly.
function checkAchievements() {
  if (!running) return;
  normalizeStats(state);
  normalizeCodex(state);
  const flags = (state.stats.flags ??= {});
  if (state.expedition?.mounted) flags.rode = true;
  if (state.expedition?.diving) flags.dove = true;
  for (const sp of syncOwned(state)) toast(`📖 圖鑑新增（馴化）：${codexEntries(state).find(e => e.id === sp)?.name}`);
  const first = !state.achievements;
  const fresh = checkUnlocks(state);
  if (!fresh.length) return;
  for (const a of fresh)
    try {
      globalThis.BeastidalNative?.steam?.unlock?.(a.steam);
    } catch {}
  if (first && fresh.length > 1) toast(`依目前進度解鎖了 ${fresh.length} 個成就，可在航海日誌查看。`);
  else {
    achievementQueue.push(...fresh);
    showNextAchievement();
  }
  save(true);
}
// Creatures within 18 m enter the codex.
function updateCodex(dt) {
  progressTimer -= dt;
  if (progressTimer > 0) return;
  progressTimer = 1;
  for (const w of state.wild)
    if (Math.hypot(w.x - state.player.x, w.z - state.player.z) < 18 && recordCreature(state, w.genome)) {
      const e = codexEntries(state).find(e => e.id === phenotype(w.genome).species);
      toast(`📖 圖鑑新增：${e?.name}`);
      onProgress('codex');
    }
  checkAchievements();
}
function updateStats(dt) {
  const hour = hourOf(state);
  tickDevice(state, dt, hour > 6 && hour < 18);
  if (!state.stats) return;
  const here = { x: state.player.x, z: state.player.z };
  const moved = statsPrev ? Math.min(30 * dt, Math.hypot(here.x - statsPrev.x, here.z - statsPrev.z)) : 0;
  statsPrev = here;
  for (const id of tickStats(state, dt, moved, state.player.mode)) onProgress('milestone', id);
}
// Hook for progress events (achievements subscribe to it).
function onProgress(kind, detail) {
  if (typeof checkAchievements === 'function') checkAchievements(kind, detail);
}
function openStats(back = closeModal) {
  normalizeStats(state);
  const st = state.stats,
    rows = milestoneRows(state)
      .map(
        r =>
          `<tr class="${r.reached ? 'done' : ''}"><td>${r.reached ? '✓' : '·'}</td><td>${esc(r.name)}</td><td>${r.play != null ? formatDuration(r.play) : r.reached ? '紀錄前已完成' : '—'}</td><td>${r.day != null ? '第 ' + r.day + ' 日' : ''}</td></tr>`
      )
      .join('');
  modal(
    'STATISTICS · 遊玩統計',
    `存檔 ${slot} 的旅程`,
    `<div class="stats-grid"><span>遊玩時間</span><b>${formatDuration(st.playSeconds)}</b><span>遊玩次數</span><b>${st.sessions}</b><span>航行距離</span><b>${(st.sailed / 1000).toFixed(2)} km</b><span>步行距離</span><b>${Math.round(st.walked)} m</b><span>昏迷次數</span><b>${st.collapses}</b><span>海上撐過暴風</span><b>${st.stormsAtSea}</b></div>
     <table class="stats-table"><thead><tr><th></th><th>里程碑</th><th>遊玩時間</th><th>遊戲天數</th></tr></thead><tbody>${rows}</tbody></table>
     <p class="note">統計只存在這台裝置。按「複製統計資料」可以把匿名數據貼給開發者，用來調整遊戲節奏。</p>`,
    [
      { label: '返回', primary: true, action: () => (back === closeModal ? closeModal() : back()) },
      {
        label: '複製統計資料',
        action: async () => {
          try {
            await navigator.clipboard.writeText(statsReport(state, GAME_VERSION));
            toast('已複製統計資料。');
          } catch {
            toast('無法存取剪貼簿。', true);
          }
        }
      }
    ]
  );
}
function updateStorm(dt = 1 / 30) {
  const el = $('storm-alert'),
    sc = running ? stormClock(state.elapsed) : null;
  document.body.classList.toggle('storm-alert-on', !!sc);
  // A storm counts as weathered at sea after 30 s spent off shore while it rages.
  if (sc?.phase === 'storm' && running && !paused) {
    const atSea = !['foot', 'aboard'].includes(state.player.mode) && !state.inCave;
    if (atSea) stormSeaTime += dt;
  } else if (stormSeaTime) {
    if (stormSeaTime >= 30 && state.stats) {
      state.stats.stormsAtSea++;
      onProgress('storm');
    }
    stormSeaTime = 0;
  }
  if (!sc) {
    if (!el.hidden) el.hidden = true;
    stormWarned = false;
    stormShelter = null;
    return;
  }
  const safe =
    state.player.mode === 'foot' || state.player.mode === 'aboard' || !!state.inCave || !!state.expedition?.diving;
  stormShelter = safe ? null : nearestShelter();
  if (sc.phase === 'warn' && !stormWarned) {
    stormWarned = true;
    haptic('storm');
    audio.note(196, 0.5);
  }
  const left = Math.ceil(sc.left),
    mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`,
    dist = stormShelter ? Math.round(Math.hypot(stormShelter.x - state.player.x, stormShelter.z - state.player.z)) : 0;
  const label = `${sc.phase === 'warn' ? '⛈ 暴風將至 ' + mm : '⛈ 暴風中 · 剩 ' + mm}${safe ? ' · 已在避風處' : ''}|${stormShelter ? `前往 ${stormShelter.name} · ${dist}m` : ''}`;
  if (label === stormLabel && !el.hidden) return;
  stormLabel = label;
  const [text, go] = label.split('|');
  el.hidden = false;
  el.classList.toggle('active', sc.phase === 'storm');
  el.querySelector('.storm-text').textContent = text;
  $('storm-go').hidden = !go;
  $('storm-go').textContent = go;
}
// Hands-on tutorial card. While it runs, inner-monologue pop-ups wait so the player gets one instruction at a time.
let tutLast = null,
  tutFocus = null,
  tutRendered = '';
function startTutorial() {
  startTutorialState(state);
  tutLast = { x: state.player.x, z: state.player.z };
  $('monologue').hidden = true;
  world.settings.tutorialReplay = false;
  world.saveSettings();
  updateTutorial(true);
}
function endTutorial(skipped) {
  document.body.classList.remove('tutorial-on');
  if (state.tutorial) state.tutorial.done = true;
  $('tutorial').hidden = true;
  tutFocus?.classList.remove('tut-focus');
  tutFocus = null;
  tutRendered = '';
  if (!skipped) {
    discover('教學完成', '接下來跟著內心獨白與左側任務，慢慢把這片海變成家。');
  }
  save(true);
  setTimeout(() => updateMonologue(true), skipped ? 300 : 5800);
}
function updateTutorial(force = false) {
  const el = $('tutorial');
  if (!running || !tutorialActive(state)) {
    document.body.classList.remove('tutorial-on');
    if (!el.hidden) {
      el.hidden = true;
      tutFocus?.classList.remove('tut-focus');
      tutFocus = null;
    }
    return;
  }
  const t = state.tutorial;
  if (tutLast) {
    t.moved += Math.hypot(state.player.x - tutLast.x, state.player.z - tutLast.z);
  }
  tutLast = { x: state.player.x, z: state.player.z };
  const finished = advanceTutorial(state);
  if (finished.length) {
    audio.note(880, 0.12);
    setTimeout(() => audio.note(1175, 0.16), 110);
    haptic('pickup');
    save(true);
    if (t.done) {
      endTutorial(false);
      return;
    }
  }
  const step = TUTORIAL[t.step],
    key = t.step + '|' + inputMode();
  if (!force && !finished.length && key === tutRendered && !el.hidden) return;
  tutRendered = key;
  document.body.classList.add('tutorial-on');
  el.hidden = false;
  el.querySelector('.tut-step').textContent = `新手教學 ${t.step + 1}/${TUTORIAL.length}`;
  el.querySelector('.tut-title').textContent = step.title;
  el.querySelector('.tut-text').textContent = P(step.text);
  el.querySelector('.tut-dots').innerHTML = TUTORIAL.map(
    (_, i) => `<i class="${i < t.step ? 'done' : i === t.step ? 'now' : ''}"></i>`
  ).join('');
  if (finished.length) {
    el.classList.remove('advance');
    void el.offsetWidth;
    el.classList.add('advance');
  }
  tutFocus?.classList.remove('tut-focus');
  tutFocus = document.querySelector(step.focus);
  tutFocus?.classList.add('tut-focus');
}
function drawMap() {
  const ctx = $('minimap').getContext('2d'),
    w = 190,
    c = 95,
    range = 70,
    scale = 80 / range;
  ctx.clearRect(0, 0, w, w);
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, 87, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = '#aad5c319';
  ctx.lineWidth = 1;
  for (const r of [25, 50, 75]) {
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(c, 10);
  ctx.lineTo(c, 180);
  ctx.moveTo(10, c);
  ctx.lineTo(180, c);
  ctx.stroke();
  const pt = (x, z) => ({ x: c + (x - state.player.x) * scale, y: c + (z - state.player.z) * scale });
  const dot = (x, z, color, size) => {
    const p = pt(x, z);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
  };
  for (const i of ISLANDS) {
    const p = pt(i.x, i.z);
    ctx.fillStyle = '#829c70';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, i.rx * scale, i.rz * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state.islandsRevealed) for (const n of NODES) dot(n.x, n.z, n.kind === 'crystal' ? '#c1b2ee' : '#ead594', 1.6);
  for (const l of state.loot) dot(l.x, l.z, '#dabd80', 2);
  for (const b of state.buildings) {
    if (b.stowed) continue;
    const at = facilityPos(state, b),
      p = pt(at.x, at.z);
    ctx.fillStyle = b.type === 'pen' ? '#b1c8ee' : '#bce5bc';
    ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
  }
  for (const a of state.wild) dot(a.x, a.z, a.hostile ? '#ea947f' : '#84cfca', a.hostile ? 3 : 2.5);
  if (!state.buoyFound) {
    const p = pt(17, -13);
    ctx.strokeStyle = '#bcbfe9';
    ctx.strokeRect(p.x - 4, p.y - 4, 8, 8);
  }
  if (state.ship) {
    const p = pt(state.ship.x, state.ship.z);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(-state.ship.heading);
    ctx.fillStyle = '#d6b15c';
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(3.5, 4);
    ctx.lineTo(3, -8);
    ctx.lineTo(-3, -8);
    ctx.lineTo(-3.5, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  for (const id of state.occupied || []) {
    const i = ISLANDS.find(v => v.id === id),
      p = pt(i.x, i.z);
    ctx.fillStyle = '#2e7c78';
    ctx.fillRect(p.x - 1, p.y - 7, 2, 8);
    ctx.fillStyle = '#d6b15c';
    ctx.fillRect(p.x + 1, p.y - 7, 5, 3);
  }
  if (destination) {
    const p = pt(destination.x, destination.z);
    ctx.strokeStyle = '#d0dbd177';
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (stormShelter) {
    let p = pt(stormShelter.x, stormShelter.z);
    const dx = p.x - c,
      dy = p.y - c,
      r = Math.hypot(dx, dy);
    if (r > 78) p = { x: c + (dx / r) * 78, y: c + (dy / r) * 78 };
    const pulse = 4 + Math.sin(performance.now() / 180) * 2;
    ctx.strokeStyle = '#f0c674';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, pulse + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#f0c674';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(tr('避'), p.x, p.y + 4);
    ctx.lineWidth = 1;
  }
  ctx.save();
  ctx.translate(c, c);
  ctx.rotate(-state.player.heading);
  ctx.fillStyle = '#f1e5bb';
  ctx.beginPath();
  ctx.moveTo(0, 7);
  ctx.lineTo(-4, -4);
  ctx.lineTo(4, -4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}
function worldLabels() {
  let labels = ISLANDS.filter(
    i => state.islandsRevealed || Math.hypot(i.x - state.player.x, i.z - state.player.z) < 65
  ).map(i => ({
    x: i.x,
    y: 5,
    z: i.z,
    text: ((state.occupied || []).includes(i.id) ? '⚑ 領地 · ' : '△ ') + i.name,
    className: 'gold'
  }));
  if (!state.buoyFound) labels.push({ x: 17, y: 3, z: -13, text: '◇ 研究浮標', className: '' });
  // once the base has gone to sea, the warship is home
  if (!state.ship)
    labels.push({
      x: 1.8,
      y: 3.5,
      z: 1.8,
      text: count(state, 'shelter') ? '⌂ 海上避難所' : '⌂ 你的木筏',
      className: 'gold'
    });
  if (state.ship) {
    if (state.player.mode === 'foot' || state.player.mode === 'boat')
      labels.push({ x: state.ship.x, y: 24, z: state.ship.z, text: '⌂ 比斯泰德號 · 家', className: 'mint' });
  } else if (state.player.mode === 'foot')
    labels.push({ x: state.boat.x, y: 2.7, z: state.boat.z, text: '⛵ 停泊的小艇', className: 'mint' });
  if (nearest) labels = labels.filter(l => !(nearest.type === 'buoy' && l.x === 17));
  $('world-labels').innerHTML = labels
    .map(l => {
      const p = world.screenPoint(l.x, l.y, l.z);
      return p.visible
        ? `<span class="world-tag ${l.className}" style="left:${p.x}px;top:${p.y}px">${l.text}</span>`
        : '';
    })
    .join('');
}
// Hull momentum for the rowboat, ridden beasts and the warship (walking stays direct for precise footing).
const hull = { vx: 0, vz: 0, heading: 0, mode: '' };
let sprintTouch = false,
  fullTilt = 0,
  sprintIdle = 0;
function setSprintTouch(on) {
  sprintTouch = on;
  sprintIdle = 0;
  $('sprint-btn')?.classList.toggle('active', on);
  $('sprint-btn')?.setAttribute('aria-pressed', on);
}
function sprinting(stick, dt) {
  fullTilt = stick > 0.97 ? fullTilt + dt : 0;
  if (sprintTouch) {
    sprintIdle = stick < 0.06 && !destination ? sprintIdle + dt : 0;
    if (sprintIdle > 1.2) setSprintTouch(false);
  }
  return keys.has('shift') || sprintTouch || fullTilt > 0.5;
}
function movePlayer(dt, analog) {
  if (paused || panel || buildType) {
    world.moveSpeed = 0;
    return;
  }
  let x = 0,
    z = 0;
  const foot = state.player.mode === 'foot';
  const kx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0),
    ky = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
  let sx = kx + joystick.x + (analog?.x || 0),
    sy = ky - joystick.y - (analog?.y || 0),
    m = Math.hypot(sx, sy);
  // walking away ends a close-up
  if (focus) {
    world.moveSpeed = 0;
    if (m > 0.35) exitFocus();
    return;
  }
  const sprint = sprinting(m, dt);
  const shipDrive = state.player.mode === 'ship' && !state.expedition.mounted,
    mounted = !!state.expedition.mounted,
    vessel = !foot && state.player.mode !== 'aboard';
  let brake = 1;
  if (m > 0.06) {
    destination = null;
    if (m > 1) {
      sx /= m;
      sy /= m;
    }
    x = Math.cos(world.yaw) * sx - Math.sin(world.yaw) * sy;
    z = -Math.sin(world.yaw) * sx - Math.cos(world.yaw) * sy;
  } else if (destination && state.player.mode !== 'aboard') {
    const dx = destination.x - state.player.x,
      dz = destination.z - state.player.z,
      d = Math.hypot(dx, dz);
    if (d < (foot ? 0.28 : 1.2)) destination = null;
    else {
      x = dx / d;
      z = dz / d;
      if (vessel) brake = Math.min(1, d / 7);
    }
  }
  const speed =
    state.player.mode === 'aboard'
      ? sprint
        ? 4.2
        : 3
      : shipDrive
        ? (sprint ? 10 : 7.6) * (stormAt(state) ? 0.85 : 1)
        : foot
          ? sprint
            ? 4.4
            : 3
          : mounted
            ? (state.expedition.diving ? 4 : 6 + phenotype(activePet(state).genome).speed / 55) * (sprint ? 1.3 : 1)
            : ((sprint ? 7 : 5.3) + state.expedition.boatLevel * 0.7) * (stormAt(state) ? 0.72 : 1);
  const oldx = state.player.x,
    oldz = state.player.z;
  let dx, dz;
  if (vessel) {
    const mode = shipDrive ? 'ship' : mounted ? 'mount' : 'boat';
    if (hull.mode !== mode) {
      hull.mode = mode;
      hull.vx = hull.vz = 0;
    }
    hull.heading = state.player.heading;
    const step = stepVessel(hull, { x: x * brake, z: z * brake }, speed, dt, HULLS[mode]);
    dx = step.dx;
    dz = step.dz;
    state.player.heading = hull.heading;
    if (shipDrive && state.ship) state.ship.heading = hull.heading;
    else if (state.player.mode === 'boat' && !mounted) state.boat.heading = hull.heading;
  } else {
    hull.mode = '';
    dx = x * dt * speed;
    dz = z * dt * speed;
    if (Math.hypot(x, z) > 0.05) {
      const desired = Math.atan2(x, z);
      state.player.heading = turnToward(state.player.heading, desired, dt * 12);
    }
  }
  moveTravel(state, dx, dz);
  const travelled = Math.hypot(state.player.x - oldx, state.player.z - oldz),
    wanted = Math.hypot(dx, dz);
  world.moveSpeed = dt ? travelled / dt : 0;
  if (vessel && wanted > 0.004 && travelled < wanted * 0.5) {
    if (Math.hypot(hull.vx, hull.vz) > 2.2) haptic('bump');
    bump(hull);
  }
  if (destination && travelled < 0.001 && wanted > 0.02 && !vessel) {
    destination = null;
    toast('前方無法通行，請用搖桿繞過設施。');
  }
  if (destination && vessel && wanted > 0.02 && travelled < 0.001 && Math.hypot(hull.vx, hull.vz) < 0.3) {
    destination = null;
    toast('已靠近木筏。點「登上避難所」，或繞過設施。');
  }
}
// A beast that fully trusts you follows a few metres behind; land beasts hop into the boat when you put to sea.
function followPlayer(w, dt) {
  const p = state.player;
  if (w.island && p.mode !== 'foot') {
    w.riding = true;
    w.x = state.boat.x;
    w.z = state.boat.z;
    return;
  }
  w.riding = false;
  const h = p.heading || 0,
    tx = p.x - Math.sin(h) * 2.6,
    tz = p.z - Math.cos(h) * 2.6,
    dx = tx - w.x,
    dz = tz - w.z,
    d = Math.hypot(dx, dz);
  if (d > 40) {
    w.x = tx;
    w.z = tz;
    return;
  }
  if (d < 0.6) return;
  const v = Math.min(9, 2.5 + d * 1.2),
    nx = w.x + (dx / d) * v * dt,
    nz = w.z + (dz / d) * v * dt;
  if (w.island || !islandAt(nx, nz, 2)) {
    w.x = nx;
    w.z = nz;
  }
  w.heading = turnToward(w.heading || 0, Math.atan2(dx, dz), dt * 3);
}
function moveWild(dt) {
  tickRescue(state);
  for (const w of state.wild) {
    if (w.rescue === 'tangled') continue; // caught in the net
    const fren = frenzied(w, state.elapsed);
    if (w.frenzyUntil && !fren) {
      delete w.frenzyUntil;
      toast('狂暴的御獸冷靜下來，退開了。');
    }
    if (w.follow && !fren) {
      followPlayer(w, dt);
      continue;
    }
    if (w.island && !fren) {
      stepLandBeast(w, dt, state.elapsed);
      continue;
    }
    if (stepFlee(w, dt, state.elapsed)) {
      if (islandAt(w.x, w.z, 2)) {
        w.vx *= -0.5;
        w.vz *= -0.5;
        w.x += w.vx * dt * 2;
        w.z += w.vz * dt * 2;
      }
      continue;
    }
    const d = Math.hypot(w.x - state.player.x, w.z - state.player.z);
    let tx = w.homeX + Math.sin(state.elapsed * 0.1 + w.phase) * 4,
      tz = w.homeZ + Math.cos(state.elapsed * 0.075 + w.phase) * 4;
    let speed = 0.45 + phenotype(w.genome).speed / 150;
    // a frenzied beast (failed forced contract) hunts you anywhere, 1.2x faster and harder-hitting
    if (
      fren ||
      ((state.player.mode === 'boat' || state.expedition.mounted) &&
        w.hostile &&
        d < 16 &&
        (!w.fleeUntil || state.elapsed > w.fleeUntil) &&
        !panel)
    ) {
      tx = state.player.x;
      tz = state.player.z;
      speed = 2.2 * (fren ? FRENZY.power : 1);
      if (d < (fren ? 3.2 : 2.2) && attackCooldown <= 0) {
        const guardians = state.tamed.filter(p => phenotype(p.genome).ability === 1);
        const defense = guardians.reduce((sum, p) => sum + phenotype(p.genome).armor / 100, 0);
        const damage = Math.max(1, (7 * (fren ? FRENZY.power : 1)) / (1 + defense));
        state.vitals.health = Math.max(0, state.vitals.health - damage);
        attackCooldown = 3;
        $('damage-flash').style.opacity = '.5';
        if (world.post) world.post.hurt = 1;
        haptic('hit');
        setTimeout(() => ($('damage-flash').style.opacity = 0), 180);
        toast('危險生物靠近！按空白鍵驅離。', true);
      }
    }
    const dx = tx - w.x,
      dz = tz - w.z,
      len = Math.hypot(dx, dz);
    if (len > 0.4) {
      const nx = w.x + (dx / len) * speed * dt,
        nz = w.z + (dz / len) * speed * dt;
      // sea beasts stay off the islands; a frenzied land beast stays on its island
      if (w.island ? islandAt(nx, nz, -1) : !islandAt(nx, nz, 2)) {
        w.x = nx;
        w.z = nz;
      }
      w.heading = turnToward(w.heading || 0, Math.atan2(dx, dz), dt * 2.2);
    }
  }
}
function handleCollapse() {
  if (state.stats) state.stats.collapses++;
  state.expedition.mounted = false;
  state.expedition.diving = false;
  state.expedition.activeId = null;
  state.inCave = false;
  state.player.level = 0;
  state.vitals = { health: 65, food: 50, water: 55 };
  state.player.x = 7;
  state.player.z = 10;
  state.player.mode = 'boat';
  state.boat = { x: 7, z: 10, heading: 0 };
  // you wake up at home: on the fortress, wherever it is anchored
  if (state.ship) {
    state.skiff = false;
    Object.assign(state.player, { mode: 'aboard', deck: 3, lx: 2.6, lz: 1 });
    normalizeShip(state);
  }
  state.resources.wood = Math.floor(state.resources.wood * 0.8);
  state.resources.metal = Math.floor(state.resources.metal * 0.8);
  destination = null;
  salvaging = null;
  selectedTarget = null;
  $('salvage-progress').hidden = true;
  log(state, '潮水又一次接住了我', '失去意識後漂回了木筏，遺失了一部分木材與金屬。下次要準備好補給。');
  save(true);
  modal(
    'WASHED ASHORE',
    '海流帶你回了家。',
    '<p>你在熟悉的木筏邊醒來。損失了 20% 木材與金屬，<strong>建築、生物與基因研究仍然保留</strong>。</p><p>留意水分與飽食，從背包補充。危險生物靠近時，用船槳驅離或駕艇離開。</p>',
    [{ label: '再出發', primary: true, action: closeModal }]
  );
}
function focusables() {
  const root = !$('modal-shade').hidden
    ? $('modal')
    : panel
      ? $('drawer')
      : focus
        ? $('focus-ui')
        : !running
          ? $('title-screen')
          : null;
  return root
    ? [...root.querySelectorAll('button:not(:disabled):not([hidden]), select:not(:disabled)')].filter(
        e => e.offsetParent !== null
      )
    : [];
}
function focusMenu(dir, first = false) {
  const list = focusables();
  if (!list.length) return;
  let i = list.indexOf(document.activeElement);
  i = first ? 0 : (i + dir + list.length) % list.length;
  list[i].focus();
  list[i].scrollIntoView({ block: 'nearest' });
}
function changeSelect(dir) {
  const e = document.activeElement;
  if (e?.tagName === 'SELECT') {
    e.selectedIndex = (e.selectedIndex + dir + e.options.length) % e.options.length;
    e.dispatchEvent(new Event('change'));
    return true;
  }
  return false;
}
function back() {
  if (film) {
    beginGame(true);
    return;
  }
  if (!$('modal-shade').hidden) {
    closeModal();
    return;
  }
  if (buildType) {
    cancelBuild();
    return;
  }
  if (panel) {
    closePanel();
    return;
  }
  if (focus) {
    focusBack();
    return;
  }
  if (running) showMenu();
}
function gamepad(dt) {
  if (!navigator.getGamepads) return null;
  const p = [...navigator.getGamepads()].find(p => p && p.connected);
  if (!p) {
    if (gamepadActive) {
      gamepadActive = false;
      document.body.classList.remove('gamepad');
    }
    padPrevious = [];
    return null;
  }
  const down = i => !!p.buttons[i]?.pressed,
    edge = i => down(i) && !padPrevious[i];
  const dead = v => (Math.abs(v) > 0.17 ? (Math.sign(v) * (Math.abs(v) - 0.17)) / 0.83 : 0);
  const ax = dead(p.axes[0] || 0),
    ay = dead(p.axes[1] || 0),
    rx = dead(p.axes[2] || 0),
    ry = dead(p.axes[3] || 0);
  if (Math.abs(ax) + Math.abs(ay) + Math.abs(rx) + Math.abs(ry) > 0.1 || p.buttons.some(b => b.pressed)) {
    gamepadActive = true;
    lastInput = 'gamepad';
    document.body.classList.add('gamepad');
  }
  padNavCooldown -= dt;
  padGridTimer -= dt;
  if (film) {
    if (edge(0) || edge(1) || edge(9)) beginGame(true);
  } else if (!running || paused || panel || focus) {
    if (edge(12) || (ay < -0.65 && padNavCooldown <= 0)) {
      focusMenu(-1);
      padNavCooldown = 0.2;
    }
    if (edge(13) || (ay > 0.65 && padNavCooldown <= 0)) {
      focusMenu(1);
      padNavCooldown = 0.2;
    }
    if (edge(14) || (ax < -0.65 && padNavCooldown <= 0)) {
      if (!changeSelect(-1)) focusMenu(-1);
      padNavCooldown = 0.22;
    }
    if (edge(15) || (ax > 0.65 && padNavCooldown <= 0)) {
      if (!changeSelect(1)) focusMenu(1);
      padNavCooldown = 0.22;
    }
    if (edge(0)) {
      if (!changeSelect(1)) {
        const el = document.activeElement;
        if (el?.tagName === 'BUTTON') el.click();
        else focusMenu(0, true);
      }
    }
    if (edge(1)) back();
    if (edge(9)) {
      if (paused) closeModal();
      else if (running) showMenu();
    }
  } else if (buildType) {
    if (
      padGridTimer <= 0 &&
      (Math.abs(ax) > 0.6 || Math.abs(ay) > 0.6 || down(12) || down(13) || down(14) || down(15))
    ) {
      world.ghostCell.x = clamp(
        world.ghostCell.x + (Math.abs(ax) > 0.6 ? Math.sign(ax) : down(15) ? 1 : down(14) ? -1 : 0),
        -10,
        10
      );
      world.ghostCell.z = clamp(
        world.ghostCell.z + (Math.abs(ay) > 0.6 ? Math.sign(ay) : down(13) ? 1 : down(12) ? -1 : 0),
        -10,
        10
      );
      padGridTimer = 0.19;
    }
    if (edge(0)) place();
    if (edge(2)) {
      buildRot += Math.PI / 2;
      toast('設施已旋轉 90°');
    }
    if (edge(1)) cancelBuild();
  } else {
    world.rotate(-rx * dt * 1.5, ry * dt * 0.65);
    if (edge(11)) toggleView();
    if (edge(0)) interact();
    if (edge(2)) openPanel('build');
    // Ⓨ: use a contract scroll when a trusting wild beast is in reach, otherwise the research panel
    if (edge(3)) contractTarget() ? contractNearest() : openPanel('creatures');
    if (edge(1)) back();
    if (edge(4)) openDevice();
    if (edge(5)) openPanel('journal');
    if (edge(6)) dock();
    if (edge(7)) {
      if (activePet(state) && state.player.mode !== 'ship') beastAction('attack');
      else repel();
    }
    if (edge(8)) openPanel('adventure');
    if (edge(14)) beastAction('ride');
    if (edge(15)) beastAction('dive');
    if (edge(9)) showMenu();
    if (edge(10)) returnHome();
    if (down(12)) world.distance = clamp(world.distance - dt * 15, 20, 70);
    if (down(13)) world.distance = clamp(world.distance + dt * 15, 20, 70);
  }
  padPrevious = p.buttons.map(b => b.pressed);
  return { x: ax, y: ay };
}
function setupEvents() {
  $('adventure-btn').onclick = () => openPanel('adventure');
  $('drink-btn').onclick = () => consume('water');
  $('eat-btn').onclick = () => consume('food');
  $('monologue').onclick = () => {
    const el = $('monologue');
    if (el.classList.contains('collapsed')) {
      el.classList.remove('collapsed');
      monoTimer = Math.max(monoTimer, 8);
      clearTimeout(monoCollapse);
      return;
    }
    el.hidden = true;
    monoTimer = 0;
  };
  $('quest-hint').onclick = () => updateMonologue(true);
  $('ride-btn').onclick = () => beastAction('ride');
  $('dive-btn').onclick = () => beastAction('dive');
  $('beast-attack').onclick = () => beastAction('attack');

  document.addEventListener('mousemove', e => {
    if (document.pointerLockElement === $('ocean') && world.firstPerson && running && !paused && !panel)
      world.rotate(-e.movementX * 0.0025, e.movementY * 0.0025);
  });
  document.addEventListener('pointerlockchange', () => {
    cameraDrag = null;
    document.body.classList.toggle('mouse-look', document.pointerLockElement === $('ocean'));
  });
  document.addEventListener('pointerlockerror', () => toast('滑鼠鎖定未啟用，可按住右鍵拖曳環視。'));

  $('start-btn').onclick = async () => {
    const btn = $('start-btn');
    if (btn.disabled) return;
    if (cloud.signedIn && (!cloud.connected || !cloudReady)) {
      btn.disabled = true;
      btn.textContent = '正在同步雲端存檔…';
      await connectCloud(false);
      btn.disabled = false;
      updateTitleButtons();
      if (!$('modal-shade').hidden) return;
    }
    hasSave ? beginGame(false) : beginIntro();
  };
  $('google-btn').onclick = () => {
    if (cloud.connected) {
      save(true);
      scheduleCloud(true);
    } else connectCloud(true);
  };
  $('signout-btn').onclick = signOutCloud;
  updateAccountUI();
  $('settings-btn').onclick = () => openSettings();
  $('slots-btn').onclick = openSlots;
  $('storm-go').onclick = goShelter;
  $('tut-skip').onclick = () => endTutorial(true);
  applyUiSettings();
  $('new-btn').onclick = confirmNew;
  $('menu-btn').onclick = showMenu;
  $('view-btn').onclick = toggleView;
  $('dock-btn').onclick = dock;
  $('fullscreen-btn').onclick = fullscreen;
  $('rotate-fullscreen').onclick = fullscreen;
  $('sound-btn').onclick = () => {
    if (audio.on) audio.stop();
    else audio.start();
    soundPref.set(audio.on);
    $('sound-btn').textContent = audio.on ? '♫' : '♪';
    $('sound-btn').setAttribute('aria-label', audio.on ? '關閉海洋環境音' : '開啟海洋環境音');
  };
  $('home-btn').onclick = returnHome;
  $('interact-btn').onclick = interact;
  $('repel-btn').onclick = repel;
  $('cancel-build').onclick = cancelBuild;
  $('contract-btn').onclick = contractNearest;
  $('close-drawer').onclick = closePanel;
  document
    .querySelectorAll('[data-panel]')
    .forEach(b => (b.onclick = () => (b.dataset.panel === 'device' ? openDevice() : openPanel(b.dataset.panel))));
  const rotate = document.createElement('button');
  rotate.textContent = '旋轉';
  rotate.onclick = () => {
    buildRot += Math.PI / 2;
    toast('設施已旋轉 90°');
  };
  $('build-banner').insertBefore(rotate, $('cancel-build'));
  addEventListener('keydown', e => {
    if (e.target.matches?.('input,select') && e.key !== 'Escape') return;
    const k = e.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (e.repeat) return;
    if (sleeping) return;
    keys.add(k);
    lastInput = 'keyboard';
    sawKey = true;
    if (k === 'escape') {
      back();
      return;
    }
    if (film) {
      if (k === ' ' || k === 'enter') beginGame(true);
      return;
    }
    if (paused || !running) return;
    if (buildType) {
      if (k === 'r') {
        buildRot += Math.PI / 2;
        toast('設施已旋轉 90°');
      }
      if (k === 'enter' || k === 'e') place();
      if (k === 'arrowleft') world.ghostCell.x--;
      if (k === 'arrowright') world.ghostCell.x++;
      if (k === 'arrowup') world.ghostCell.z--;
      if (k === 'arrowdown') world.ghostCell.z++;
      return;
    }
    // inside a facility, E opens the first thing in it (or presses the open card's main action); other hotkeys
    // step out first
    if (focus) {
      if (k === 'e') {
        const ui = $('focus-ui');
        (
          ui.querySelector('.focus-card .primary:not(:disabled)') || ui.querySelector('[data-spot]:not([hidden])')
        )?.click();
      } else if (!['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
        exitFocus();
      } else return;
      if (k === 'e') return;
    }
    if (k === 'k') openPanel('adventure');
    if (k === 't') beastAction('ride');
    if (k === 'g') beastAction('dive');
    if (k === 'f') beastAction('attack');
    if (k === 'e') interact();
    if (k === 'x') contractNearest();
    if (k === ' ') repel();
    if (k === 'b') openPanel('build');
    if (k === 'i') openDevice();
    if (k === 'j') openPanel('journal');
    if (k === 'c') openPanel('creatures');
    if (k === 'h') returnHome();
    if (k === 'v') toggleView();
    if (k === 'q') dock();
  });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => {
    keys.clear();
    joystick = { x: 0, y: 0 };
  });
  // Multi-touch canvas: one finger drags the camera, two fingers pinch-zoom (and twist to orbit), each finger tracked on its own
  // so the joystick, action buttons and camera can all be used at the same time.
  const cvs = $('ocean'),
    pointers = new Map();
  let pinch = null;
  const canvasTouches = () => [...pointers.values()].filter(p => p.touch);
  const tapAt = e => {
    if (sleeping) return;
    if (focus) return tapInFocus(e);
    const hit = !buildType ? world.pickObject(e.clientX, e.clientY) : null;
    if (hit) {
      activateObject(hit);
      return;
    }
    if (world.firstPerson && e.pointerType !== 'touch' && !buildType) {
      lockMouse();
      return;
    }
    const p = world.seaPoint(e.clientX, e.clientY);
    if (p) {
      if (buildType) {
        world.ghostCell = { x: Math.round(p.x / 3.6), z: Math.round(p.z / 3.6) };
        place();
      } else {
        let target = getAllTargets()
          .filter(t => Math.hypot(t.x - p.x, t.z - p.z) < 3)
          .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
        if (state.player.mode === 'aboard') {
          toast('船內請用 WASD 走動，靠近設施按 E。');
        } else if (state.player.mode === 'foot') {
          if (canWalk(state, p.x, p.z)) {
            destination = { x: p.x, z: p.z };
            selectedTarget = null;
          } else if (Math.hypot(p.x - state.boat.x, p.z - state.boat.z) < 3) {
            dock();
          } else toast('請點擊可行走的木筏或島嶼地面；離岸前需回到小艇。');
        } else if (target) {
          selectedTarget = target.id;
          const dx = state.player.x - target.x,
            dz = state.player.z - target.z,
            d = Math.hypot(dx, dz);
          if (d > 7) destination = { x: target.x + (dx / d) * 6, z: target.z + (dz / d) * 6 };
        } else {
          selectedTarget = null;
          const dx = p.x - state.player.x,
            dz = p.z - state.player.z,
            d = Math.hypot(dx, dz),
            f = Math.min(1, 75 / (d || 1));
          destination = { x: state.player.x + dx * f, z: state.player.z + dz * f };
        }
      }
    }
  };
  cvs.addEventListener('contextmenu', e => e.preventDefault());
  cvs.addEventListener('pointerdown', e => {
    if (!running || paused || panel || orientationBlocked) return;
    if (document.pointerLockElement === cvs) {
      if (e.button === 0) {
        const r = cvs.getBoundingClientRect(),
          hit = world.pickObject(r.left + r.width / 2, r.top + r.height / 2);
        if (hit) activateObject(hit);
        else interact();
      }
      return;
    }
    lastInput = e.pointerType === 'touch' ? 'touch' : 'mouse';
    try {
      cvs.setPointerCapture(e.pointerId);
    } catch {}
    pointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      right: e.button === 2,
      touch: e.pointerType === 'touch',
      moved: false,
      t: performance.now()
    });
    const t = canvasTouches();
    if (t.length >= 2) {
      t.forEach(p => (p.moved = true));
      pinch = { d: Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y), a: Math.atan2(t[1].y - t[0].y, t[1].x - t[0].x) };
    }
    cameraDrag = pointers.get(e.pointerId);
  });
  cvs.addEventListener('pointermove', e => {
    if (document.pointerLockElement === cvs) return;
    const p = pointers.get(e.pointerId);
    if (buildType && !p) {
      const sp = world.seaPoint(e.clientX, e.clientY);
      if (sp) world.ghostCell = { x: Math.round(sp.x / 3.6), z: Math.round(sp.z / 3.6) };
    }
    if (!p) {
      if (running && !panel && !buildType && !world.firstPerson && e.pointerType !== 'touch')
        cvs.style.cursor = world.pickObject(e.clientX, e.clientY) ? 'pointer' : '';
      return;
    }
    const dx = e.clientX - p.x,
      dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > 9) p.moved = true;
    if (moving && !p.right && canvasTouches().length < 2) {
      const sp = world.seaPoint(e.clientX, e.clientY);
      if (sp) world.ghostCell = { x: Math.round(sp.x / 3.6), z: Math.round(sp.z / 3.6) };
      return;
    }
    const t = canvasTouches();
    if (p.touch && t.length >= 2) {
      if (p !== t[0] && p !== t[1]) return;
      const d = Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y),
        a = Math.atan2(t[1].y - t[0].y, t[1].x - t[0].x);
      if (pinch) {
        world.distance = clamp(world.distance + (pinch.d - d) * 0.09, 20, 75);
        world.rotate(-Math.atan2(Math.sin(a - pinch.a), Math.cos(a - pinch.a)) * 0.9, 0);
      }
      pinch = { d, a };
      return;
    }
    // inside a facility a plain drag looks around too (a click there picks things)
    if (p.right || ((p.touch || focus) && p.moved)) world.rotate(-dx * 0.006, dy * 0.004);
  });
  const release = e => {
    const p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (canvasTouches().length < 2) pinch = null;
    if (cameraDrag === p) cameraDrag = null;
    return p;
  };
  cvs.addEventListener('pointerup', e => {
    const p = release(e);
    // let go of a dragged building to set it down
    if (p && moving && p.moved && !p.right && running && !paused) return place();
    if (p && !p.moved && !p.right && running && !paused && pointers.size === 0 && performance.now() - p.t < 600)
      tapAt(e);
  });
  cvs.addEventListener('pointercancel', release);
  cvs.addEventListener('lostpointercapture', e => {
    if (pointers.has(e.pointerId)) release(e);
  });
  cvs.addEventListener(
    'wheel',
    e => {
      if (!running) return;
      e.preventDefault();
      world.distance = clamp(world.distance + e.deltaY * 0.03, 20, 75);
    },
    { passive: false }
  );
  // Touch buttons fire on finger release via pointer events, so they work while another finger holds the joystick
  // (some mobile browsers drop the click of a second simultaneous touch). The follow-up native click is swallowed.
  const tapped = new WeakMap(),
    btnSel = '#hud button,#touch-controls button,#build-banner button';
  document.addEventListener(
    'pointerdown',
    e => {
      if (e.pointerType !== 'touch') return;
      const b = e.target.closest?.(btnSel);
      if (!b || b.disabled || b.dataset.hold !== undefined) return;
      b._tap = e.pointerId;
      b.classList.add('pressed');
    },
    true
  );
  document.addEventListener(
    'pointerup',
    e => {
      if (e.pointerType !== 'touch') return;
      const b = e.target.closest?.(btnSel);
      document.querySelectorAll('.pressed').forEach(x => x.classList.remove('pressed'));
      if (!b || b._tap !== e.pointerId) return;
      b._tap = null;
      tapped.set(b, performance.now());
      b.click();
    },
    true
  );
  document.addEventListener(
    'pointercancel',
    () => document.querySelectorAll('.pressed').forEach(x => x.classList.remove('pressed')),
    true
  );
  document.addEventListener(
    'click',
    e => {
      const b = e.target.closest?.(btnSel);
      if (b && e.isTrusted && performance.now() - (tapped.get(b) || -1e9) < 800) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true
  );
  // Touch sprint is a toggle beside the joystick, so the left thumb can switch it on and keep steering while the right thumb
  // works the action buttons. It switches itself off once the player stops (keyboard: hold Shift; stick: push fully for 0.5 s).
  const sprintBtn = $('sprint-btn');
  if (sprintBtn)
    sprintBtn.addEventListener('pointerdown', e => {
      e.preventDefault();
      setSprintTouch(!sprintTouch);
    });
  addEventListener(
    'pointerdown',
    () => {
      if (soundPref.get() && !audio.on && !running && !film) {
        audio.start();
        $('sound-btn').textContent = '♫';
      }
    },
    { once: true }
  );
  let joyPointer = null;
  const joy = $('joystick'),
    knob = $('joystick-knob');
  const moveJoy = e => {
    const r = joy.getBoundingClientRect(),
      x = e.clientX - r.left - r.width / 2,
      y = e.clientY - r.top - r.height / 2,
      d = Math.hypot(x, y),
      scale = 32 / Math.max(32, d);
    joystick = { x: (x * scale) / 32, y: (y * scale) / 32 };
    knob.style.transform = `translate(${x * scale}px,${y * scale}px)`;
  };
  joy.addEventListener('pointerdown', e => {
    joyPointer = e.pointerId;
    joy.setPointerCapture(e.pointerId);
    moveJoy(e);
  });
  joy.addEventListener('pointermove', e => {
    if (e.pointerId === joyPointer) moveJoy(e);
  });
  for (const evt of ['pointerup', 'pointercancel', 'lostpointercapture'])
    joy.addEventListener(evt, () => {
      joyPointer = null;
      joystick = { x: 0, y: 0 };
      knob.style.transform = '';
    });
  addEventListener('resize', updateViewport);
  window.visualViewport?.addEventListener('resize', updateViewport);
  addEventListener('orientationchange', () => setTimeout(updateViewport, 150));
  document.addEventListener('fullscreenchange', updateViewport);
  addEventListener('beforeunload', () => {
    if (running) save(true);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      keys.clear();
      joystick = { x: 0, y: 0 };
      if (running) {
        save(true);
        scheduleCloud(true);
      }
      audio.ctx?.suspend();
    } else {
      frameTime = performance.now();
      if (audio.on) audio.ctx?.resume();
    }
  });
  addEventListener('gamepadconnected', () => {
    gamepadActive = true;
    document.body.classList.add('gamepad');
    toast('手把已連接：A 互動 · X 建造 · Y 生物 · Start 暫停');
  });
  addEventListener('gamepaddisconnected', () => {
    toast('手把已中斷，可繼續用鍵盤或觸控。');
  });
  // Keep keyboard focus inside a modal dialog.
  document.addEventListener('keydown', e => {
    if (e.key === 'Tab' && !$('modal-shade').hidden) {
      const f = focusables(),
        i = f.indexOf(document.activeElement);
      if ((!e.shiftKey && i === f.length - 1) || (e.shiftKey && i <= 0)) {
        e.preventDefault();
        f[e.shiftKey ? f.length - 1 : 0]?.focus();
      }
    }
  });
}
// Picks the music for the current situation; a new mood must hold for 2.5 s before the crossfade starts.
let moodPending = null,
  moodSince = 0;
function musicMood() {
  if (film) return null;
  if (!running) return 'title';
  const e = state.expedition,
    boss = e?.boss;
  if (
    e?.diving ||
    state.inCave ||
    (boss && !boss.defeated && Math.hypot(boss.x - state.player.x, boss.z - state.player.z) < 70)
  )
    return 'deep';
  if (state.player.mode === 'foot' || state.player.mode === 'aboard') return 'island';
  const hours = hourOf(state);
  return stormAt(state) || hours < 5.6 || hours > 18.6 ? 'night' : 'day';
}
// Mixer: music / effects / ambience (sea, wind, hull rush), each 0..1 from settings.
const VOLUME_DEFAULTS = { musicVol: 0.8, sfxVol: 0.9, ambVol: 0.8 };
const vol = k => {
  const v = world?.settings?.[k];
  return Number.isFinite(v) ? v : VOLUME_DEFAULTS[k];
};
function applyVolumes() {
  if (!audio.ctx) return;
  const t = audio.ctx.currentTime;
  audio.mus.gain.setTargetAtTime(vol('musicVol'), t, 0.05);
  audio.sfx.gain.setTargetAtTime(vol('sfxVol'), t, 0.05);
  audio.amb.gain.setTargetAtTime(vol('ambVol'), t, 0.05);
}
function updateSound(dt) {
  if (!audio.on) return;
  const m = musicMood(),
    now = performance.now();
  if (m !== moodPending) {
    moodPending = m;
    moodSince = now;
  }
  if (now - moodSince > (audio.music?.current ? 2500 : 0)) audio.mood(m);
  const vessel = running && !paused && state.player.mode !== 'foot' && state.player.mode !== 'aboard' && !state.inCave;
  audio.motion(vessel ? world.hullSpeed || 0 : 0);
}
function frame(now) {
  requestAnimationFrame(frame);
  let dt = frameTime ? Math.min(0.05, (now - frameTime) / 1000) : 0.016;
  frameTime = now;
  if (document.hidden) return;
  updateSound(dt);
  refreshPrompts();
  updateStorm(dt);
  updateTutorial();
  if (orientationBlocked) {
    if (!film) {
      world.titleMode = !running;
      world.update(0, state, { title: !running });
      world.render();
    }
    return;
  }
  const analog = gamepad(dt);
  if (film) {
    const before = film.t,
      info = film.update(dt);
    if (film) for (const [at, cue] of FILM_CUES) if (before < at && film.t >= at) cue();
    if (film) {
      $('film-chapter').textContent = info.chapter;
      $('film-caption').textContent = info.caption;
      $('film-fade').style.opacity = info.fade;
      $('film-fade').style.background = info.fadeColor || '';
      $('ocean').style.filter =
        info.blur || info.dim
          ? `blur(${info.blur.toFixed(1)}px) saturate(${Math.max(0.15, 1 - info.blur / 18).toFixed(2)}) brightness(${(1 - info.dim * 0.55).toFixed(2)})`
          : '';
      $('film-flash').style.opacity = info.flash;
    }
    return;
  }
  if (running && sleeping) tickSleep();
  else if (running && !paused) {
    repelCooldown = Math.max(0, repelCooldown - dt);
    attackCooldown = Math.max(0, attackCooldown - dt);
    movePlayer(dt, analog);
    moveWild(dt);
    updateStats(dt);
    updateCodex(dt);
    const events = tickSystems(state, dt, !!panel || !!buildType);
    for (const message of tickExpansion(state, dt, !!panel || !!buildType)) toast(message);
    for (const ev of tickShip(state))
      if (ev === 'fusion') {
        world.sync(state);
        discover('比斯泰德號 · 誕生', '整個基地都搬上了甲板：書桌、床、集水器、展示池跟著你出航。走近戰艦按 Q 登船。');
        log(state, '比斯泰德號', '木筏上的避難所與陪我漂流的小艇，融合成了一艘戰艦。這一次，我要主動出航。');
        save(true);
        updateUI();
      }
    if (monoTimer > 0) {
      monoTimer -= dt;
      if (monoTimer <= 0) $('monologue').hidden = true;
    }
    document.body.classList.toggle('underwater', !!state.expedition.diving);
    if (salvaging) tickSalvage(dt);
    else autoPickup();
    for (const e of events) {
      if (e.type === 'hatch') {
        world.sync(state);
        discover('新的生命誕生', `${e.pet.name} · 第 ${e.pet.generation} 代 · ${e.pet.mutations} 處突變`);
        if (panel === 'creatures') renderPanel();
        save(true);
      }
      if (e.type === 'chapter') {
        discover('第一章完成 · 海上的家', '你終於不再只是漂流。共生與進化的旅程還在繼續。');
        save(true);
      }
    }
    if (state.vitals.health <= 0) handleCollapse();
    saveTimer += dt;
    spawnTimer += dt;
    if (saveTimer > 8) {
      saveTimer = 0;
      save(true);
    }
    if (spawnTimer > 3) {
      spawnTimer = 0;
      ensureLandBeasts(state);
      clearLand(state);
      world.sync(state);
      const nearby = state.wild.filter(w => Math.hypot(w.x - state.player.x, w.z - state.player.z) < 65);
      if (nearby.length < 4 && state.wild.length < 26) {
        const a = Math.random() * Math.PI * 2,
          x = state.player.x + Math.sin(a) * 35,
          z = state.player.z + Math.cos(a) * 35;
        state.wild.push({
          id: uid('wild'),
          x,
          z,
          homeX: x,
          homeZ: z,
          phase: Math.random() * 6,
          genome: seaGenome(x, z),
          trust: 0,
          tame: rollTame(),
          hostile: Math.hypot(x, z) > 90 && Math.random() < 0.3
        });
        world.sync(state);
      }
    }
    if (discoveryTimer > 0) {
      discoveryTimer -= dt;
      if (discoveryTimer <= 0) $('discovery').hidden = true;
    }
    uiTimer += dt;
    panelTimer += dt;
    if (uiTimer > 0.2) {
      uiTimer = 0;
      updateUI();
      updateNearest();
      drawMap();
      worldLabels();
      updateMonologue();
    }
    if (panelTimer > 1) {
      panelTimer = 0;
      renderEggs();
      const tank = $('tank-status'),
        b = findFacility(state, activeFacility);
      if (tank && b) tank.textContent = `儲水 ${b.waterStored || 0} / 20 · 每 35 秒 +2`;
    }
  }
  world.titleMode = !running;
  world.update(dt, state, { title: !running, destination, salvaging });
  world.render();
  placeFocusSpots();
  if (panel === 'beasts') beastStage.update(dt);
}
initialize();
