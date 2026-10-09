import assert from'node:assert/strict';
import{waveHeight,floatPose,stepVessel,HULLS,bump,startFlee,stepFlee,WakeTrail,calmFactor,WAVE_SET}from'../dist/physics.js';
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('ok -',name);};
const home={x:1.8,z:1.8,hx:3.6,hz:3.6};

test('wave field is smooth, bounded, and calmer beside the raft',()=>{
 const maxAmp=WAVE_SET.reduce((a,[,,st,len])=>a+st*len/(Math.PI*2),0);let prev=waveHeight(0,0,0);
 for(let i=1;i<400;i++){const h=waveHeight(i*.1,0,0);assert.ok(Math.abs(h)<=maxAmp+1e-9);assert.ok(Math.abs(h-prev)<.05,'no jumps between 10 cm samples');prev=h;}
 assert.ok(Math.abs(waveHeight(5,5,3,1))>Math.abs(waveHeight(5,5,3,0))*1.5||Math.abs(waveHeight(5,5,3,0))<.01,'storms raise the swell');
 assert.equal(calmFactor(1.8,1.8,home),.45);assert.equal(calmFactor(60,60,home),1);
});

test('floating pose tilts the hull toward the higher water',()=>{
 let found=false;for(let t=0;t<20&&!found;t+=.37){const p=floatPose(30,-12,0,t,0,null);const bow=waveHeight(30,-12+1.8,t),stern=waveHeight(30,-12-1.8,t);if(Math.abs(bow-stern)>.02){found=true;assert.equal(Math.sign(p.pitch),Math.sign(stern-bow),'pitch follows bow/stern height');}}
 assert.ok(found);
});

test('boats accelerate gradually, coast when released and resist sliding sideways',()=>{
 const b={vx:0,vz:0,heading:0};const xs=[];for(let i=0;i<60;i++){stepVessel(b,{x:0,z:1},6,1/30,HULLS.boat);xs.push(b.vz);}
 assert.ok(xs[0]<1,'no instant top speed');assert.ok(xs[59]>3&&xs[59]<6.01,'approaches max speed');
 const v=b.vz;for(let i=0;i<30;i++)stepVessel(b,{x:0,z:0},6,1/30,HULLS.boat);assert.ok(b.vz>v*.5&&b.vz<v*.7,'coasts and slows with drag (about 58% left after 1 s)');
 const s={vx:4,vz:0,heading:0};stepVessel(s,{x:0,z:0},6,.5,HULLS.boat);assert.ok(Math.abs(s.vx)<4*.3,'keel removes side slip');
 const t={vx:0,vz:0,heading:0};stepVessel(t,{x:0,z:-1},6,1/30,HULLS.boat);assert.ok(Math.hypot(t.vx,t.vz)<.05,'must turn before driving backwards');
 bump(b);assert.ok(Math.hypot(b.vx,b.vz)<1);
 const ship={vx:0,vz:0,heading:0},boat={vx:0,vz:0,heading:0};for(let i=0;i<30;i++){stepVessel(ship,{x:0,z:1},6,1/30,HULLS.ship);stepVessel(boat,{x:0,z:1},6,1/30,HULLS.boat);}assert.ok(ship.vz<boat.vz,'the warship carries more inertia');
});

test('repelled creatures swim away continuously instead of teleporting',()=>{
 const w={x:3,z:0,homeX:3,homeZ:0,heading:0};startFlee(w,0,0,0);let last={x:w.x,z:w.z},t=0,maxStep=0;
 for(let i=0;i<300;i++){t+=1/30;const active=stepFlee(w,1/30,t);maxStep=Math.max(maxStep,Math.hypot(w.x-last.x,w.z-last.z));last={x:w.x,z:w.z};if(!active)break;}
 assert.ok(maxStep<.35,'each frame moves a short distance');assert.ok(w.x>10,'ends well away from the splash');assert.equal(w.homeX,w.x,'settles where it stopped');assert.ok(Math.abs(w.heading-Math.PI/2)<.2,'faces the direction it swims');
});

test('wake trail keeps recent hull points and drops stale ones',()=>{
 const tr=new WakeTrail(5,2);for(let i=0;i<10;i++)tr.record(i,0,5,i*.5);assert.equal(tr.points.length,5);assert.equal(tr.points[0].x,9);
 tr.record(9,0,0,10);assert.equal(tr.points.length,0,'old points expire');const d=tr.record(0,0,.1,11);assert.equal(d[3],0,'no trail when nearly still');
});
console.log(`${passed} physics tests passed.`);
