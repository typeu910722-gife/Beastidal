// Music (CC0 tracks, see audio/music/CREDITS.md) and synthesised water sounds.
const TRACKS={title:'title',day:'sea-day',night:'sea-night',deep:'deep',island:'island'};
const PREF_KEY='beastidal-sound';
export const soundPref={get(){try{return localStorage.getItem(PREF_KEY)!=='off';}catch{return true;}},set(on){try{localStorage.setItem(PREF_KEY,on?'on':'off');}catch{}}};

// Streams each track through an <audio> element (no full decode in memory) and crossfades with Web Audio gains,
// which also works on iOS where element.volume is ignored.
export class MusicPlayer{
 constructor(ctx,out,version=''){this.ctx=ctx;this.out=out;this.version=version;this.players=new Map();this.current=null;this.volume=.42;}
 player(mood){if(!this.players.has(mood)){const a=new Audio();a.src=`./audio/music/${TRACKS[mood]}.mp3${this.version?'?v='+this.version:''}`;a.loop=true;a.preload='auto';const g=this.ctx.createGain();g.gain.value=0;this.ctx.createMediaElementSource(a).connect(g).connect(this.out);this.players.set(mood,{a,g,mood});}return this.players.get(mood);}
 play(mood){if(mood===this.current||(mood&&!TRACKS[mood]))return;const now=this.ctx.currentTime;if(this.current){const old=this.players.get(this.current);old.g.gain.cancelScheduledValues(now);old.g.gain.setTargetAtTime(0,now,1.1);setTimeout(()=>{if(this.current!==old.mood)old.a.pause();},6500);}
  this.current=mood;if(!mood)return;const p=this.player(mood);p.a.play().catch(()=>{});p.g.gain.cancelScheduledValues(now);p.g.gain.setTargetAtTime(this.volume,now+.2,1.6);}
 stop(){this.play(null);}
}

let noiseBuf=null;
function noise(ctx){if(noiseBuf&&noiseBuf.sampleRate===ctx.sampleRate)return noiseBuf;const len=ctx.sampleRate*1.2;noiseBuf=ctx.createBuffer(1,len,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;return noiseBuf;}
// A paddle slapping the water: broadband hit swept down by a lowpass, a low body thump, then falling droplets.
export function playSplash(ctx,out,strength=1){const t=ctx.currentTime,vol=Math.min(1,strength);
 const src=ctx.createBufferSource();src.buffer=noise(ctx);const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.Q.value=.7;lp.frequency.setValueAtTime(5200*(.6+.4*vol),t);lp.frequency.exponentialRampToValueAtTime(320,t+.55);
 const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.42*vol,t+.006);g.gain.exponentialRampToValueAtTime(.12*vol,t+.09);g.gain.exponentialRampToValueAtTime(.0008,t+.75);src.connect(lp).connect(g).connect(out);src.start(t);src.stop(t+.8);
 const o=ctx.createOscillator(),og=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(48,t+.16);og.gain.setValueAtTime(.32*vol,t);og.gain.exponentialRampToValueAtTime(.001,t+.2);o.connect(og).connect(out);o.start(t);o.stop(t+.22);
 const drops=Math.round(4+8*vol);for(let i=0;i<drops;i++){const t0=t+.09+Math.random()*.65*(.5+vol*.5),f=500+Math.random()*1400,b=ctx.createOscillator(),bg=ctx.createGain();b.type='sine';b.frequency.setValueAtTime(f,t0);b.frequency.exponentialRampToValueAtTime(f*1.9,t0+.035);bg.gain.setValueAtTime(.05*vol*(1-i/drops*.6),t0);bg.gain.exponentialRampToValueAtTime(.0005,t0+.06);b.connect(bg).connect(out);b.start(t0);b.stop(t0+.07);}}

// Continuous hull hiss whose loudness and brightness follow speed through the water.
export class WaterRush{
 constructor(ctx,out){this.ctx=ctx;const src=ctx.createBufferSource();src.buffer=noise(ctx);src.loop=true;this.bp=ctx.createBiquadFilter();this.bp.type='bandpass';this.bp.Q.value=.6;this.bp.frequency.value=500;this.g=ctx.createGain();this.g.gain.value=0;src.connect(this.bp).connect(this.g).connect(out);src.start();}
 set(speed){const t=this.ctx.currentTime,k=Math.min(1,speed/9);this.g.gain.setTargetAtTime(k*k*.16,t,.25);this.bp.frequency.setTargetAtTime(380+k*1500,t,.3);}
}
