// Shared sea physics: the CPU mirror of the ocean shader's Gerstner waves (so floating things ride the
// same swell the player sees), floating poses, boat dynamics with inertia and keel drag, and fleeing creatures.

// [dirX, dirZ, steepness, wavelength] — the ocean shader is generated from this same table.
export const WAVE_SET=[[.92,.38,.055,42],[.42,.91,.05,27],[-.6,.8,.045,17],[.98,-.2,.035,11],[-.31,-.95,.03,7.5]];
export const WAVE_TIME=.55,G=9.8;
const WAVES=WAVE_SET.map(([x,z,steep,len])=>{const n=Math.hypot(x,z),k=Math.PI*2/len;return{dx:x/n,dz:z/n,steep,k,c:Math.sqrt(G/k)};});

// Waves are damped around the raft (rect centre x,z and half sizes hx,hz) like in the shader.
export function calmFactor(x,z,home){if(!home)return 1;const hx=Math.max(Math.abs(x-home.x)-home.hx,0),hz=Math.max(Math.abs(z-home.z)-home.hz,0),d=Math.hypot(hx,hz),t=Math.min(1,d/14),s=t*t*(3-2*t);return .45+.55*s;}
export function waveAmp(x,z,storm,home){return calmFactor(x,z,home)*(1+storm*1.6);}
// Surface height at (x,z). Gerstner horizontal drift is ignored; at these steepness values the error is a few cm.
export function waveHeight(x,z,time,storm=0,home=null){const amp=waveAmp(x,z,storm,home);let y=0;for(const w of WAVES){const f=w.k*(w.dx*x+w.dz*z-w.c*time*WAVE_TIME);y+=w.steep*amp/w.k*Math.sin(f);}return y;}

// Heave, pitch and roll of a hull of given length/beam, found by sampling the surface under bow, stern and both sides.
// Light hulls follow the water closely; heavier ones (lower response) average it out.
export function floatPose(x,z,heading,time,storm,home,length=3.6,beam=1.6,response=1){const fx=Math.sin(heading),fz=Math.cos(heading),sx=fz,sz=-fx,h=length/2,b=beam/2;
 const bow=waveHeight(x+fx*h,z+fz*h,time,storm,home),stern=waveHeight(x-fx*h,z-fz*h,time,storm,home),port=waveHeight(x-sx*b,z-sz*b,time,storm,home),star=waveHeight(x+sx*b,z+sz*b,time,storm,home),mid=waveHeight(x,z,time,storm,home);
 return{y:((bow+stern+port+star)/4*.6+mid*.4)*response,pitch:Math.atan2(stern-bow,length)*response,roll:Math.atan2(star-port,beam)*response*.8};}

// Vessel tuning: thrust response (1/s), coasting drag (1/s), keel grip against side-slip (1/s), turn rate (rad/s).
export const HULLS={
 boat:{accel:1.5,drag:.55,keel:3.2,turn:2.4,turnAtSpeed:1.2},
 mount:{accel:3,drag:1.4,keel:5,turn:4,turnAtSpeed:0},
 ship:{accel:.45,drag:.22,keel:1.6,turn:.55,turnAtSpeed:.6},
 foot:{accel:14,drag:14,keel:14,turn:12,turnAtSpeed:0}
};
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
// Advances a vessel one step. body {vx,vz,heading}; input {x,z} desired direction (length 0..1, world space);
// maxSpeed m/s. Returns the displacement to apply. Thrust only acts along the bow, so boats turn before they gain speed,
// coast when the input stops, and the keel kills sideways drift.
export function stepVessel(body,input,maxSpeed,dt,hull){const mag=Math.min(1,Math.hypot(input.x,input.z));let fx=Math.sin(body.heading),fz=Math.cos(body.heading);
 let forward=body.vx*fx+body.vz*fz,side=body.vx*fz-body.vz*fx;
 if(mag>.05){const desired=Math.atan2(input.x,input.z),diff=angleDiff(desired,body.heading),speedFrac=Math.min(1,Math.abs(forward)/Math.max(.1,maxSpeed));const rate=hull.turn+hull.turnAtSpeed*speedFrac;body.heading+=Math.max(-rate*dt,Math.min(rate*dt,diff*Math.min(1,dt*6)));
  const align=Math.max(0,Math.cos(diff));const target=maxSpeed*mag*(hull===HULLS.foot?1:align*align);forward+=(target-forward)*(1-Math.exp(-dt*hull.accel));}
 else forward*=Math.exp(-dt*hull.drag);
 side*=Math.exp(-dt*hull.keel);fx=Math.sin(body.heading);fz=Math.cos(body.heading);body.vx=fx*forward+fz*side;body.vz=fz*forward-fx*side;
 return{dx:body.vx*dt,dz:body.vz*dt};}
// After a collision the hull loses most of its momentum.
export function bump(body,keep=.15){body.vx*=keep;body.vz*=keep;}

// Fleeing: a burst of speed straight away from the splash, decaying with water drag but never below a cruising swim.
export function startFlee(w,fromX,fromZ,elapsed,strength=1){let dx=w.x-fromX,dz=w.z-fromZ;const d=Math.hypot(dx,dz)||1;dx/=d;dz/=d;const burst=(6.5+Math.random()*1.5)*strength*Math.max(.45,1-d/14);w.vx=dx*burst;w.vz=dz*burst;w.fleeUntil=elapsed+4.5+Math.random()*1.5;w.diving=1;}
export function stepFlee(w,dt,elapsed){const sp=Math.hypot(w.vx||0,w.vz||0);if(!sp)return false;const decayed=Math.max(2.2,sp*Math.exp(-dt*.7));const k=elapsed<w.fleeUntil?decayed/sp:Math.exp(-dt*2.5);w.vx*=k;w.vz*=k;w.x+=w.vx*dt;w.z+=w.vz*dt;w.heading=turnToward(w.heading||0,Math.atan2(w.vx,w.vz),dt*7);w.diving=Math.max(0,(w.diving||0)-dt*.35);
 if(elapsed>=w.fleeUntil&&Math.hypot(w.vx,w.vz)<.25){w.vx=0;w.vz=0;w.homeX=w.x;w.homeZ=w.z;w.diving=0;return false;}return true;}
export function turnToward(h,target,maxStep){const d=angleDiff(target,h);return h+Math.max(-maxStep,Math.min(maxStep,d));}

// Recent hull positions; the shader turns them into a Kelvin wake (rings whose envelope opens at ~19.5°) and prop wash.
export class WakeTrail{
 constructor(max=40,life=9){this.max=max;this.life=life;this.points=[];this.data=new Float32Array(max*4);}
 record(x,z,speed,time){const last=this.points[0];if(speed>.35&&(!last||Math.hypot(x-last.x,z-last.z)>.8||time-last.t>.35))this.points.unshift({x,z,t:time,v:speed});while(this.points.length>this.max||(this.points.length&&time-this.points[this.points.length-1].t>this.life))this.points.pop();
  this.data.fill(0);this.points.forEach((p,i)=>this.data.set([p.x,p.z,p.t,p.v],i*4));return this.data;}
}
