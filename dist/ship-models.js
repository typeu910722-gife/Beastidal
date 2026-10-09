// Procedural warship "比斯泰德號": keel + five walkable deck bands that can be cut away.
import * as T from './vendor/three.module.min.js';
import{DECKS,BAND_HEIGHT,SHIP_POINTS,hullHalfBeam,hullFlare}from'./ship.js?v=0.9.0';
export const LOUNGE_SLOTS=[[-2.4,-7],[2.4,-7],[-2.8,-2.5],[2.8,-2.5],[-2.5,9],[2.5,9]];
const V=T.Vector3;
const C={hull:0x3d2c20,strake:0x6a4a31,copper:0x8d5b38,trim:0x2e7c78,gold:0xd6b15c,plank:0xbe9866,deckDark:0x8f6c47,cloth:0xe6dcc0,rope:0xd6c19b,iron:0x3a4448,glass:0x9fd8e0,glow:0x9affdf,red:0x9e3b32};
export function makeWarship(mat,halo){
 const g=new T.Group(),bands=[0,1,2,3,4].map(()=>new T.Group()),keel=new T.Group();g.add(keel,...bands);
 const add=(p,geo,color,pos,scale=[1,1,1],extra)=>{const m=new T.Mesh(geo,mat(color,extra));m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;p.add(m);return m;};
 const box=(p,c,x,y,z,sx,sy,sz,e)=>add(p,new T.BoxGeometry(1,1,1),c,[x,y,z],[sx,sy,sz],e);
 const cyl=(p,c,x,y,z,r,h,e,seg=12)=>add(p,new T.CylinderGeometry(1,1,1,seg),c,[x,y,z],[r,h,r],e);
 const rod=(p,a,b,r,c)=>{const s=new V(...a),e=new V(...b),m=add(p,new T.CylinderGeometry(1,1,1,6),c,s.clone().add(e).multiplyScalar(.5).toArray(),[r,s.distanceTo(e),r]);m.quaternion.setFromUnitVectors(new V(0,1,0),e.sub(s).normalize());return m;};
 const ZS=[];for(let i=0;i<=40;i++)ZS.push(-15+i*.75);
 const ring=(y,inset=0)=>{const f=hullFlare(y),pts=[];for(const z of ZS)pts.push([Math.max(.02,hullHalfBeam(z)*f-inset),z]);for(const z of[...ZS].reverse())pts.push([-Math.max(.02,hullHalfBeam(z)*f-inset),z]);return pts;};
 // Hull skin between two heights; vertex colors give strakes and the copper bottom.
 function strip(p,y0,y1,colorAt,extra={}){const a=ring(y0),b=ring(y1),pos=[],col=[],ix=[],n=a.length;for(let i=0;i<n;i++){for(const[pt,y]of[[a[i],y0],[b[i],y1]]){pos.push(pt[0],y,pt[1]);const c=new T.Color(colorAt(y));col.push(c.r,c.g,c.b);}}for(let i=0;i<n;i++){const j=(i+1)%n,q=i*2,r=j*2;ix.push(q,r,q+1,r,r+1,q+1);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(col,3));geo.setIndex(ix);geo.computeVertexNormals();const m=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:.62,metalness:.08,side:T.DoubleSide,...extra}));m.castShadow=true;m.receiveShadow=true;p.add(m);return m;}
 function floor(p,y,color=C.plank,inset=.12){const sh=new T.Shape(ring(y,inset).map(([x,z])=>new T.Vector2(x,z)));const geo=new T.ShapeGeometry(sh,2);geo.rotateX(Math.PI/2);const m=add(p,geo,color,[0,y,0],[1,1,1],{side:T.DoubleSide});for(let x=-4;x<=4;x+=.55)box(p,C.deckDark,x,y+.012,0,.02,.01,27*Math.max(.1,1-Math.abs(x)/6));return m;}
 const hullColor=y=>y<-.2?C.copper:y<.15?0xe8e0c8:Math.floor((y+.3)/.65)%2?C.hull:C.strake;
 // Keel
 strip(keel,-2.4,.4,hullColor);const bottom=new T.Shape(ring(-2.4).map(([x,z])=>new T.Vector2(x,z)));const bg=new T.ShapeGeometry(bottom);bg.rotateX(Math.PI/2);add(keel,bg,C.copper,[0,-2.4,0],[1,1,1],{side:T.DoubleSide});box(keel,C.hull,0,-2.6,0,.35,.5,29);
 // Interior decks 0..2 + their hull walls
 for(let d=0;d<3;d++){const y=DECKS[d].y,b=bands[d];floor(b,y);strip(b,y,DECKS[d+1].y,hullColor);
  // ribs inside the hull
  for(let z=-12;z<=11;z+=2.6){const hb=hullHalfBeam(z)*hullFlare(y+1.3)-.2;for(const s of[-1,1])box(b,C.strake,s*hb,y+1.3,z,.18,BAND_HEIGHT,.22);}
  // portholes on the outside
  for(let z=-11;z<=10;z+=3.2)for(const s of[-1,1]){const hb=hullHalfBeam(z)*hullFlare(y+1.4);const ph=add(b,new T.TorusGeometry(.32,.07,6,16),C.gold,[s*(hb+.02),y+1.4,z]);ph.rotation.y=Math.PI/2;add(b,new T.CircleGeometry(.27,14),C.glass,[s*(hb+.03),y+1.4,z],[1,1,1],{emissive:0xffd79a,emissiveIntensity:.55,side:T.DoubleSide}).rotation.y=Math.PI/2;}
  // ladder up and hatch frame
  if(d<3){for(const s of[-.32,.32])rod(b,[1.1+s,y,2.6],[1.1+s,DECKS[d+1].y+.2,1.6],.05,C.strake);for(let k=1;k<9;k++){const t=k/9;box(b,C.plank,1.1,y+t*(DECKS[d+1].y-y),2.6-t,.68,.05,.12);}}
  if(d>0){box(b,C.strake,-1.1,y+.05,2,1.3,.1,.12);box(b,C.strake,-1.1,y+.05,2.65,1.3,.1,.12);add(b,new T.PlaneGeometry(1.1,.6),0x1a120c,[-1.1,y+.03,2.3],[1,1,1],{side:T.DoubleSide}).rotation.x=-Math.PI/2;}
  const lamp=new T.PointLight(d===2?0xffcf91:0xffe2b5,d===2?16:10,15);lamp.position.set(0,y+2.2,0);b.add(lamp);for(const z of[-8,0,8]){cyl(b,C.iron,0,y+2.35,z,.04,.3);add(b,new T.SphereGeometry(.18,10,8),0xffd38c,[0,y+2.1,z],[1,1.2,1],{emissive:0xffc06a,emissiveIntensity:1.4});}
 }
 // Hold B: materials
 {const b=bands[0],y=DECKS[0].y;for(const[x,z,c]of[[-2.2,-9,0x8a6a45],[2.2,-9,0x8a6a45],[-2.4,-5,0x6d7f86],[2.4,-5,0x6d7f86],[-2.4,-1,0x8a6a45],[2.4,8,0x8a6a45]]){for(let k=0;k<2;k++){box(b,c,x,y+.45+k*.9,z+(k?.15:0),1.3,.85,1.3);box(b,0xc8ad7c,x,y+.45+k*.9,z+(k?.15:0),1.35,.12,1.35);}}for(let i=0;i<5;i++)add(b,new T.ConeGeometry(.25,.9+i*.15,5),0x9bd9e6,[-2.6+i*.3,y+.55,10],[1,1,1],{emissive:0x5bb7d2,emissiveIntensity:.8});for(let i=0;i<6;i++){const l=cyl(b,0x8e6c4c,2.4,y+.25+(i%3)*.32,-12.2+Math.floor(i/3)*.4,.16,2.2);l.rotation.x=Math.PI/2;}}
 // Hold A: provisions
 {const b=bands[1],y=DECKS[1].y;for(const[x,z]of[[-2.6,-9],[-2.6,-7.6],[2.6,-9],[2.6,-7.6],[-2.8,-3],[2.8,-3]]){cyl(b,0x8b5e3c,x,y+.6,z,.52,1.2,undefined,14);for(const yy of[.25,.95])add(b,new T.TorusGeometry(.53,.04,5,18),C.iron,[x,y+yy,z]).rotation.x=Math.PI/2;}for(const x of[-2.4,2.4]){cyl(b,0x4f8d95,x,y+.9,9,.7,1.8,{metalness:.4});cyl(b,0x9fd8e0,x,y+1.9,9,.2,.25,{emissive:0x6fc8d8,emissiveIntensity:.5});}for(let i=0;i<5;i++)add(b,new T.SphereGeometry(.42,10,8),0xbda774,[-2.6+(i%3)*.5,y+.35+Math.floor(i/3)*.4,-12],[1,.7,1.2]);}
 // Lounge: beds, trough and warm lanterns
 {const b=bands[2],y=DECKS[2].y;for(const[x,z]of LOUNGE_SLOTS){cyl(b,0x7c5c3e,x,y+.12,z,1.15,.24,undefined,20);add(b,new T.TorusGeometry(1.05,.22,8,24),0xd9b98c,[x,y+.3,z]).rotation.x=Math.PI/2;cyl(b,0x5d9e93,x,y+.27,z,.92,.08,undefined,20);}box(b,0x6f8d8a,0,y+.35,-11.5,3.4,.5,.8);box(b,0x5fb7c8,0,y+.62,-11.5,3.1,.05,.55,{emissive:0x3d8ea0,emissiveIntensity:.4});for(const z of[-4.8,4.8])for(const s of[-1,1]){box(b,0xd8c3a0,s*3.7,y+1.6,z,.05,1.1,2.4,{emissive:0x8a6a3a,emissiveIntensity:.15});}}
 // Main deck
 {const b=bands[3],y=DECKS[3].y;floor(b,y,0xc9a473);strip(b,y,y+1.05,()=>C.strake);const top=ring(y+1.05);for(let i=0;i<top.length;i+=2){const p=top[i];cyl(b,C.hull,p[0]*.995,y+.55,p[1],.06,1.1);}
  const railPts=top.map(([x,z])=>new V(x,y+1.08,z));add(b,new T.TubeGeometry(new T.CatmullRomCurve3(railPts,true),160,.07,6,true),C.gold,[0,0,0]);
  for(const[mz,h]of[[6,17],[-1,20]]){cyl(b,0x6b4b2e,0,y+h/2,mz,.32,h,undefined,10);for(const yy of[h*.45,h*.8]){const w=yy>h*.6?3.6:4.8;rod(b,[-w,y+yy,mz],[w,y+yy,mz],.12,0x5a3f27);const sail=new T.PlaneGeometry(w*1.9,h*.32,8,4);const pa=sail.attributes.position;for(let i=0;i<pa.count;i++){const sx=pa.getX(i)/w;pa.setZ(i,(1-sx*sx)*.9);}sail.computeVertexNormals();add(b,sail,C.cloth,[0,y+yy-h*.17,mz+.25],[1,1,1],{side:T.DoubleSide,roughness:.9});}add(b,new T.CircleGeometry(1.1,24),C.trim,[0,y+h*.62,mz+1.05],[1,1,1],{side:T.DoubleSide,emissive:0x2a6e6a,emissiveIntensity:.3});add(b,new T.ConeGeometry(.6,1.4,3),C.red,[.5,y+h+.6,mz],[1,1,.05]).rotation.z=-Math.PI/2;
   for(const s of[-1,1]){rod(b,[0,y+h*.95,mz],[s*hullHalfBeam(mz)*hullFlare(y),y+1,mz-2.5],.025,C.rope);rod(b,[0,y+h*.95,mz],[s*hullHalfBeam(mz)*hullFlare(y),y+1,mz+2.2],.025,C.rope);}}
  rod(b,[0,y+18,-1],[0,y+15.5,6],.03,C.rope);rod(b,[0,y+15.5,6],[0,y+2.2,15.8],.03,C.rope);
  rod(b,[0,y+.6,13.5],[0,y+2.4,18],.18,0x6b4b2e);
  // figurehead: a horned sea-beast
  add(b,new T.SphereGeometry(.7,16,12),C.trim,[0,y-.6,15.1],[1,1.1,1.5],{metalness:.3});for(const s of[-1,1]){rod(b,[s*.3,y-.2,15.4],[s*.75,y+.9,15.2],.08,C.gold);add(b,new T.SphereGeometry(.12,8,6),0xfff0b0,[s*.32,y-.45,15.95],[1,1,1],{emissive:0xffe08a,emissiveIntensity:1.5});}
  for(let i=0;i<4;i++){const z=-8+i*4.6;for(const s of[-1,1]){const hb=hullHalfBeam(z)*hullFlare(y)-.9;const c=new T.Group();c.position.set(s*hb,y+.55,z);b.add(c);box(c,0x5a3f27,0,0,0,.9,.4,1.1);for(const zz of[-.4,.4])add(c,new T.TorusGeometry(.22,.06,6,12),0x2b2b2b,[0,-.05,zz]).rotation.y=Math.PI/2;const barrel=cyl(c,C.iron,s*.55,.25,0,.17,1.6,{metalness:.6,roughness:.35});barrel.rotation.z=Math.PI/2;}}
  for(let i=0;i<9;i++)box(b,C.strake,0,y+.35+i*.31,-4.6-i*.23,1.5,.08,.32);for(const s of[-.8,.8])rod(b,[s,y+.6,-4.5],[s,y+3.5,-6.6],.04,C.gold);
  box(b,C.strake,3.7,y+.12,1,1.3,.12,1.6);for(const zz of[.3,1.7])cyl(b,C.gold,4.3,y+.7,zz,.05,1.2);
  for(let i=0;i<3;i++)cyl(b,0x8b5e3c,-3,y+.5,8+i*1.1,.4,1);
 }
 // Bridge
 {const b=bands[4],y=DECKS[4].y;box(b,0xb08a5a,0,y-.1,-9.5,7.2,.22,7.4);for(const x of[-3.4,3.4])for(const z of[-12.9,-6.1])cyl(b,0x5a3f27,x,y-1.4,z,.16,2.8);
  box(b,C.strake,0,y+1.2,-13.1,7.2,2.6,.2);for(const s of[-1,1]){box(b,C.strake,s*3.55,y+.5,-9.5,.2,1,7.4);box(b,C.strake,s*3.55,y+2.35,-9.5,.2,.3,7.4);for(const z of[-12,-10,-8,-6.6])box(b,C.strake,s*3.55,y+1.5,z,.22,1.4,.15);add(b,new T.PlaneGeometry(7,1.4),C.glass,[s*3.56,y+1.5,-9.5],[1,1,1],{transparent:true,opacity:.28,side:T.DoubleSide,metalness:.5,roughness:.05}).rotation.y=Math.PI/2;}
  box(b,C.strake,0,y+.5,-5.9,7.2,1,.2);for(const s of[-1,1])box(b,C.strake,s*2.4,y+1.5,-5.9,2.4,2.6,.2);box(b,C.strake,0,y+2.6,-5.9,7.2,.4,.2);add(b,new T.PlaneGeometry(2.4,1.4),C.glass,[0,y+1.5,-5.88],[1,1,1],{transparent:true,opacity:.28,side:T.DoubleSide});
  box(b,C.hull,0,y+2.75,-9.5,7.8,.25,8);box(b,C.trim,0,y+2.92,-9.5,7.9,.08,8.1);add(b,new T.SphereGeometry(.28,12,8),0xffd38c,[0,y+3.3,-9.5],[1,1.2,1],{emissive:0xffc06a,emissiveIntensity:1.6});halo(b,0xffd499,0,y+3.3,-9.5,1.6);
  const helm=new T.Group();helm.position.set(0,y+1.35,-10.6);b.add(helm);cyl(b,0x5a3f27,0,y+.6,-10.75,.14,1.2);const wheel=add(helm,new T.TorusGeometry(.62,.06,8,28),0x8b5e3c,[0,0,0]);for(let i=0;i<8;i++){const a=i*Math.PI/4;rod(helm,[0,0,0],[Math.cos(a)*.8,Math.sin(a)*.8,0],.035,0x8b5e3c);add(helm,new T.SphereGeometry(.06,6,5),C.gold,[Math.cos(a)*.84,Math.sin(a)*.84,0]);}add(helm,new T.SphereGeometry(.12,8,6),C.gold,[0,0,0]);g.userData.wheel=helm;
  box(b,0x7c5c3e,2,y+.85,-8.4,1.5,.1,1);for(const x of[1.4,2.6])for(const z of[-8.8,-8])cyl(b,0x5a3f27,x,y+.4,z,.05,.8);box(b,0xe9dcb4,2,y+.92,-8.4,1.2,.02,.8);add(b,new T.CircleGeometry(.25,20),0x2e7c78,[2,y+.94,-8.4],[1,1,1],{side:T.DoubleSide}).rotation.x=-Math.PI/2;
  for(let i=0;i<4;i++)box(b,0x253d42,-2.4,y+.9,-12.4+i*.6,.9,.6,.4,{emissive:i%2?0x3fbfa0:0x6fd0ff,emissiveIntensity:.35});const l=new T.PointLight(0xffe2b5,8,10);l.position.set(0,y+2.4,-9.5);b.add(l);
 }
 // consoles at the interaction points
 for(const p of SHIP_POINTS)if(['cargo-a','cargo-b','lounge'].includes(p.id)){const b=bands[p.deck],y=DECKS[p.deck].y;box(b,0x5a3f27,p.lx,y+.5,p.lz+.5,1.4,1,.6);box(b,0x9affdf,p.lx,y+1.05,p.lz+.45,1.1,.04,.4,{emissive:0x5fe2bd,emissiveIntensity:.9});}
 g.userData.bands=bands;g.userData.keel=keel;return g;
}
// Dock station: a pier with bollards and a crane, extending from the raft edge.
export function dockMesh(mat){const g=new T.Group();const add=(geo,c,pos,s=[1,1,1],e)=>{const m=new T.Mesh(geo,mat(c,e));m.position.set(...pos);m.scale.set(...s);m.castShadow=m.receiveShadow=true;g.add(m);return m;};const B=new T.BoxGeometry(1,1,1),Cy=new T.CylinderGeometry(1,1,1,12);
 for(let i=0;i<7;i++)add(B,i%2?0xbe9866:0xcba574,[(i-3)*.49,.32,0],[.45,.18,3.5]);for(const x of[-1.5,1.5])for(const z of[-1.5,0,1.5])add(Cy,0x4a3626,[x,-.4,z],[.17,1.6,.17]);
 for(const x of[-1.2,1.2]){add(Cy,0x2f3a3d,[x,.6,1.4],[.16,.45,.16],{metalness:.5});add(new T.SphereGeometry(.2,10,8),0x2f3a3d,[x,.85,1.4],[1,.6,1],{metalness:.5});}
 add(Cy,0x6b4b2e,[-1.3,1.9,-1.3],[.13,3.2,.13]);const arm=add(B,0x6b4b2e,[-.4,3.4,-1.3],[2.2,.16,.16]);add(Cy,0xd6c19b,[.6,2.6,-1.3],[.02,1.6,.02]);add(B,0x8d5b38,[.6,1.7,-1.3],[.4,.3,.4]);
 add(new T.TorusGeometry(.32,.08,6,16),0xd6c19b,[1.2,.5,-.4]).rotation.x=Math.PI/2;add(Cy,0xffd38c,[1.5,1.2,-1.5],[.07,1.4,.07]);add(new T.SphereGeometry(.17,10,8),0xffd38c,[1.5,1.95,-1.5],[1,1,1],{emissive:0xffc06a,emissiveIntensity:1.4});
 const sign=add(B,0x2e7c78,[0,1.1,-1.65],[1.6,.5,.06]);add(B,0xd6b15c,[0,1.1,-1.62],[1.3,.08,.02],{emissive:0xb08a3a,emissiveIntensity:.5});return g;}
