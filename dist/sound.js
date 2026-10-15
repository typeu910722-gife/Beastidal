// Music (CC0 tracks, see audio/music/CREDITS.md) and synthesised water sounds.
const TRACKS = { title: 'title', day: 'sea-day', night: 'sea-night', deep: 'deep', island: 'island', boss: 'boss' };
const PREF_KEY = 'beastidal-sound';
export const soundPref = {
  get() {
    try {
      return localStorage.getItem(PREF_KEY) !== 'off';
    } catch {
      return true;
    }
  },
  set(on) {
    try {
      localStorage.setItem(PREF_KEY, on ? 'on' : 'off');
    } catch {}
  }
};

// Streams each track through an <audio> element (no full decode in memory) and crossfades with Web Audio gains,
// which also works on iOS where element.volume is ignored.
// 0.61: two decks, both unlocked in the first tap (iOS only lets a media element play from inside a user gesture,
// so a track first started later — the battle theme in 嘯岳's den — stayed silent). A track is loaded onto the idle
// deck and faded in while the other fades out; a play() the browser still refuses is retried on the next tap.
const SILENCE =
  'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YSADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
export class MusicPlayer {
  constructor(ctx, out, version = '') {
    this.ctx = ctx;
    this.out = out;
    this.version = version;
    this.current = null;
    this.volume = 0.42;
    this.decks = [0, 1].map(() => {
      const a = new Audio();
      a.loop = true;
      a.preload = 'auto';
      a.setAttribute('playsinline', '');
      const g = ctx.createGain();
      g.gain.value = 0;
      ctx.createMediaElementSource(a).connect(g).connect(out);
      return { a, g, mood: null, timer: 0 };
    });
    this.live = null; // the deck that is (or should be) playing
    this.blocked = false;
  }
  src(mood) {
    return `./audio/music/${TRACKS[mood]}.mp3${this.version ? '?v=' + this.version : ''}`;
  }
  // call from inside a user gesture: play a moment of silence on both decks so the browser trusts them from now on
  unlock() {
    for (const d of this.decks)
      if (!d.mood) {
        d.a.src = SILENCE;
        d.a
          .play()
          .then(() => d.mood || d.a.pause())
          .catch(() => {});
      }
    this.retry();
  }
  // the browser refused to start the live track: try again (from a gesture)
  retry() {
    if (!this.blocked || !this.live) return;
    this.blocked = false;
    this.live.a.play().catch(() => (this.blocked = true));
  }
  play(mood) {
    if (mood === this.current || (mood && !TRACKS[mood])) return;
    const now = this.ctx.currentTime;
    this.current = mood;
    const old = this.live;
    if (old) {
      old.g.gain.cancelScheduledValues(now);
      old.g.gain.setTargetAtTime(0, now, 1.1);
      clearTimeout(old.timer);
      old.timer = setTimeout(() => {
        if (this.live !== old) old.a.pause();
      }, 6500);
    }
    if (!mood) {
      this.live = null;
      return;
    }
    // the idle deck takes the new track (or the old deck, if it was this track and has not stopped yet)
    const d = this.decks.find(x => x !== old && x.mood === mood) || this.decks.find(x => x !== old) || this.decks[0];
    clearTimeout(d.timer);
    if (d.mood !== mood) {
      d.a.src = this.src(mood);
      d.mood = mood;
    }
    this.live = d;
    d.a.play().catch(() => (this.blocked = true));
    d.g.gain.cancelScheduledValues(now);
    d.g.gain.setTargetAtTime(this.volume, now + 0.2, 1.6);
  }
  stop() {
    this.play(null);
  }
}

let noiseBuf = null;
function noise(ctx) {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const len = ctx.sampleRate * 1.2;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
// A paddle slapping the water: broadband hit swept down by a lowpass, a low body thump, then falling droplets.
export function playSplash(ctx, out, strength = 1) {
  const t = ctx.currentTime,
    vol = Math.min(1, strength);
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 0.7;
  lp.frequency.setValueAtTime(5200 * (0.6 + 0.4 * vol), t);
  lp.frequency.exponentialRampToValueAtTime(320, t + 0.55);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.42 * vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.12 * vol, t + 0.09);
  g.gain.exponentialRampToValueAtTime(0.0008, t + 0.75);
  src.connect(lp).connect(g).connect(out);
  src.start(t);
  src.stop(t + 0.8);
  const o = ctx.createOscillator(),
    og = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.16);
  og.gain.setValueAtTime(0.32 * vol, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  o.connect(og).connect(out);
  o.start(t);
  o.stop(t + 0.22);
  const drops = Math.round(4 + 8 * vol);
  for (let i = 0; i < drops; i++) {
    const t0 = t + 0.09 + Math.random() * 0.65 * (0.5 + vol * 0.5),
      f = 500 + Math.random() * 1400,
      b = ctx.createOscillator(),
      bg = ctx.createGain();
    b.type = 'sine';
    b.frequency.setValueAtTime(f, t0);
    b.frequency.exponentialRampToValueAtTime(f * 1.9, t0 + 0.035);
    bg.gain.setValueAtTime(0.05 * vol * (1 - (i / drops) * 0.6), t0);
    bg.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.06);
    b.connect(bg).connect(out);
    b.start(t0);
    b.stop(t0 + 0.07);
  }
}

// Continuous hull hiss whose loudness and brightness follow speed through the water.
export class WaterRush {
  constructor(ctx, out) {
    this.ctx = ctx;
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    src.loop = true;
    this.bp = ctx.createBiquadFilter();
    this.bp.type = 'bandpass';
    this.bp.Q.value = 0.6;
    this.bp.frequency.value = 500;
    this.g = ctx.createGain();
    this.g.gain.value = 0;
    src.connect(this.bp).connect(this.g).connect(out);
    src.start();
  }
  set(speed) {
    const t = this.ctx.currentTime,
      k = Math.min(1, speed / 9);
    this.g.gain.setTargetAtTime(k * k * 0.16, t, 0.25);
    this.bp.frequency.setTargetAtTime(380 + k * 1500, t, 0.3);
  }
}

// 0.54: the New World's ambience, all synthesised. Under the dome: a soft, too-even breeze, the faint mains hum of
// streetlights at night, a three-note chime from the public speakers now and then, and close to the shell a low
// tone you feel more than hear. Outside, under the real sky: a deep wind, a drone from the rift and its crackle.
export class NewWorldAmbience {
  constructor(ctx, out) {
    this.ctx = ctx;
    this.out = out;
    const loop = (filterType, freq, q) => {
      const src = ctx.createBufferSource();
      src.buffer = noise(ctx);
      src.loop = true;
      src.playbackRate.value = 0.5 + Math.random() * 0.1;
      const f = ctx.createBiquadFilter();
      f.type = filterType;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(f).connect(g).connect(out);
      src.start();
      return { f, g };
    };
    this.breeze = loop('bandpass', 520, 0.5);
    this.gale = loop('lowpass', 260, 0.8);
    const tone = (freqs, type = 'sine') => {
      const g = ctx.createGain();
      g.gain.value = 0;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 400;
      lp.connect(g).connect(out);
      for (const fr of freqs) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = fr;
        o.connect(lp);
        o.start();
      }
      return g;
    };
    this.mains = tone([120, 240.6], 'triangle'); // streetlights' hum
    this.shell = tone([41, 41.7]); // the dome's tone
    this.drone = tone([55, 55.8, 82.6], 'sawtooth'); // the rift
    this.nextChime = ctx.currentTime + 25 + Math.random() * 30;
    this.nextCrackle = 0;
  }
  // k: { town, night, shell (0..1 nearness to the shell), outside, rift (0..1 nearness to the rift) }
  set(k) {
    const c = this.ctx,
      t = c.currentTime,
      on = !!k.town,
      out = on && !!k.outside,
      under = on && !out,
      to = (g, v, tc = 0.8) => g.gain.setTargetAtTime(v, t, tc);
    // the breeze under the dome swells and falls on an exact, endless sine
    const swell = 0.5 + 0.5 * Math.sin(t * 0.21);
    to(this.breeze.g, under ? 0.05 + swell * 0.035 : 0);
    this.breeze.f.frequency.setTargetAtTime(420 + swell * 260, t, 1);
    to(this.gale.g, out ? 0.16 + 0.08 * Math.sin(t * 0.37) * Math.sin(t * 0.11) : 0, 1.2);
    to(this.mains, under && k.night ? 0.012 : 0, 1.5);
    to(this.shell, on ? (k.shell || 0) * 0.09 : 0, 0.6);
    to(this.drone, out ? 0.012 + (k.rift || 0) * 0.05 : 0, 1.2);
    if (under && t > this.nextChime) {
      this.nextChime = t + 70 + Math.random() * 60;
      this.chime();
    }
    if (out && (k.rift || 0) > 0.05 && t > this.nextCrackle) {
      this.nextCrackle = t + 0.08 + Math.random() * (1.4 - k.rift);
      this.crackle(0.05 + k.rift * 0.12);
    }
  }
  // the public speakers: ding-dong-ding, far away and a little too bright
  chime() {
    const c = this.ctx,
      t = c.currentTime + 0.05;
    [784, 659, 988].forEach((f, i) => {
      const o = c.createOscillator(),
        g = c.createGain(),
        t0 = t + i * 0.55;
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.035, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0005, t0 + 1.6);
      o.connect(g).connect(this.out);
      o.start(t0);
      o.stop(t0 + 1.7);
    });
  }
  // a spit of static from the rift
  crackle(vol) {
    const c = this.ctx,
      t = c.currentTime,
      src = c.createBufferSource();
    src.buffer = noise(c);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2500 + Math.random() * 3000;
    const g = c.createGain(),
      len = 0.015 + Math.random() * 0.05;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + len);
    src.connect(hp).connect(g).connect(this.out);
    src.start(t, Math.random());
    src.stop(t + len + 0.01);
  }
}

// 0.58: a blow landing — a short crack of filtered noise over a low thump, pitched by how hard it was.
// kind: 'hit' (yours lands), 'crit', 'hurt' (you or yours take it), 'kill'
export function playImpact(ctx, out, kind = 'hit') {
  const t = ctx.currentTime,
    big = kind === 'crit' || kind === 'kill',
    src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.9;
  bp.frequency.setValueAtTime(kind === 'hurt' ? 900 : big ? 2600 : 1800, t);
  bp.frequency.exponentialRampToValueAtTime(kind === 'hurt' ? 260 : 500, t + 0.12);
  const g = ctx.createGain(),
    v = kind === 'kill' ? 0.5 : big ? 0.42 : kind === 'hurt' ? 0.36 : 0.3;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0008, t + (big ? 0.22 : 0.13));
  src.connect(bp).connect(g).connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + 0.3);
  const o = ctx.createOscillator(),
    og = ctx.createGain(),
    f0 = kind === 'kill' ? 140 : kind === 'hurt' ? 95 : big ? 170 : 130;
  o.type = 'sine';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f0 * 0.35, t + (kind === 'kill' ? 0.4 : 0.14));
  og.gain.setValueAtTime(big ? 0.45 : 0.32, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + (kind === 'kill' ? 0.45 : 0.17));
  o.connect(og).connect(out);
  o.start(t);
  o.stop(t + 0.5);
  // a crit rings a little after the crack
  if (kind === 'crit') {
    const r = ctx.createOscillator(),
      rg = ctx.createGain();
    r.type = 'triangle';
    r.frequency.value = 1320;
    rg.gain.setValueAtTime(0.0001, t + 0.03);
    rg.gain.exponentialRampToValueAtTime(0.06, t + 0.04);
    rg.gain.exponentialRampToValueAtTime(0.0005, t + 0.35);
    r.connect(rg).connect(out);
    r.start(t + 0.03);
    r.stop(t + 0.4);
  }
}
