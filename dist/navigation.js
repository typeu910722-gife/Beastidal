import{CAVE}from'./expansion.js?v=0.7.3';
import{moveAboard,moveShip,shipBlocked}from'./ship.js?v=0.7.3';
import{islandAt,onIsland,islandDocks,clearLand}from'./islands.js?v=0.7.3';
// All travel modes share world coordinates. The boat stays moored while walking.
export const TILE_SIZE = 3.6;
const SIDES = [[1,0],[-1,0],[0,1],[0,-1]];
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
export function deckAt(s,x,z){return s.buildings.find(b=>b.type===(s.player.level?'upperfloor':'floor')&&Math.abs(x-b.x*TILE_SIZE)<=1.8&&Math.abs(z-b.z*TILE_SIZE)<=1.8);}
export function boatBlocked(s,x,z){return !!islandAt(x,z,1)||s.buildings.some(b=>(b.type==='floor'||b.type==='pen'||b.type==='dock')&&Math.abs(x-b.x*TILE_SIZE)<2.32&&Math.abs(z-b.z*TILE_SIZE)<2.32);}
export function canWalk(s,x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z))return false;
  if(s.inCave)return Math.hypot(x-CAVE.x,z-CAVE.z)<CAVE.r-.3;if(!s.player.level&&onIsland(x,z))return true;
  if(![[0,0],[.23,0],[-.23,0],[0,.23],[0,-.23]].every(([dx,dz])=>deckAt(s,x+dx,z+dz)))return false;
  for(const b of s.buildings){
    if((b.level||0)!==(s.player.level||0)||!['collector','hatchery','beacon'].includes(b.type))continue;
    const dx=x-b.x*TILE_SIZE,dz=z-b.z*TILE_SIZE,c=Math.cos(b.rot||0),sn=Math.sin(b.rot||0),lx=dx*c-dz*sn,lz=dx*sn+dz*c;
    if(b.type==='collector'&&Math.hypot(lx,lz)<1.04)return false;
    if(b.type==='hatchery'&&Math.abs(lx)<1.4&&Math.abs(lz)<1.1)return false;
    if(b.type==='beacon'&&Math.abs(lx)<.79&&Math.abs(lz)<.79)return false;
  }
  return true;
}
export function normalizeTravel(s){
  clearLand(s);s.player.level=s.player.mode==='foot'&&s.player.level===1?1:0;
  s.player.mode=s.player.mode==='foot'||(s.ship&&['ship','aboard'].includes(s.player.mode))?s.player.mode:'boat';if(s.ship&&s.player.mode==='boat')s.player.mode='ship';
  if(!s.boat||!Number.isFinite(s.boat.x)||!Number.isFinite(s.boat.z))s.boat={x:s.player.x,z:s.player.z,heading:s.player.heading||0};
  if(s.player.mode==='foot'&&!canWalk(s,s.player.x,s.player.z)){
    const fallback=walkPoints(s).sort((a,b)=>distance(a,s.player)-distance(b,s.player))[0];
    if(fallback){s.player.x=fallback.x;s.player.z=fallback.z;}else{s.player.mode='boat';s.player.x=s.boat.x;s.player.z=s.boat.z;}
  }
  if(!s.ship&&s.player.mode==='foot'&&boatBlocked(s,s.boat.x,s.boat.z)){const spot=dockingSpots(s).sort((a,b)=>distance(a.boat,s.boat)-distance(b.boat,s.boat))[0];if(spot)Object.assign(s.boat,spot.boat);}
  if(s.player.mode==='boat'&&islandAt(s.player.x,s.player.z,1)){const d=islandDocks().sort((a,b)=>distance(a.boat,s.player)-distance(b.boat,s.player))[0];Object.assign(s.player,d.boat);}
  if(s.player.mode==='boat'&&!s.expedition?.mounted)Object.assign(s.boat,{x:s.player.x,z:s.player.z,heading:s.player.heading||0});
  return s;
}
export function walkPoints(s){const points=[];for(const b of s.buildings)if(b.type===(s.player.level?'upperfloor':'floor'))for(const dx of[-1.28,0,1.28])for(const dz of[-1.28,0,1.28]){const x=b.x*TILE_SIZE+dx,z=b.z*TILE_SIZE+dz;if(canWalk(s,x,z))points.push({x,z});}return points;}
export function dockingSpots(s){
  const spots=[];
  for(const b of s.buildings)if(b.type==='floor')for(const[dx,dz]of SIDES){
    if(s.buildings.some(n=>(n.type==='floor'||n.type==='pen'||n.type==='dock')&&n.x===b.x+dx&&n.z===b.z+dz))continue;
    const foot={x:b.x*TILE_SIZE+dx*1.3,z:b.z*TILE_SIZE+dz*1.3};
    const boat={x:b.x*TILE_SIZE+dx*3.65,z:b.z*TILE_SIZE+dz*3.65,heading:Math.atan2(dx,dz)};
    if(canWalk({...s,player:{...s.player,level:0},inCave:false},foot.x,foot.z)&&!boatBlocked(s,boat.x,boat.z))spots.push({foot,boat});
  }
  return spots;
}
export function dockOption(s){
  if(s.player.mode==='foot'){
    const spots=[...dockingSpots(s),...islandDocks()].sort((a,b)=>distance(a.boat,s.boat)-distance(b.boat,s.boat));
    const spot=spots[0];if(!spot)return null;
    return{...spot,mode:'board',near:!s.player.level&&distance(s.player,spot.foot)<4.4,distance:distance(s.player,spot.foot)};
  }
  const spots=[...dockingSpots(s),...islandDocks()].sort((a,b)=>distance(a.boat,s.player)-distance(b.boat,s.player));
  const spot=spots[0];if(!spot)return null;
  const d=distance(spot.boat,s.player);
  return{...spot,mode:'land',near:d<5.8,distance:d};
}
export function switchVessel(s){
  if(s.player.level)return{ok:false,error:'請先從樓梯回到一樓。'};normalizeTravel(s);const spot=dockOption(s);
  if(!spot||!spot.near)return{ok:false,error:s.player.mode==='foot'?'請走回停泊處再登艇。':'請駕艇靠近木筏或島嶼海岸。',spot};
  if(s.player.mode==='foot'){
    s.player.mode='boat';Object.assign(s.player,spot.boat);Object.assign(s.boat,spot.boat);return{ok:true,mode:'boat'};
  }
  Object.assign(s.boat,spot.boat,{dockX:spot.foot.x,dockZ:spot.foot.z});
  Object.assign(s.player,spot.foot,{mode:'foot',heading:spot.boat.heading+Math.PI});
  return{ok:true,mode:'foot'};
}
export function moveTravel(s,dx,dz){
  if(s.player.mode==='aboard'){moveAboard(s,dx,dz);return;}
  if(s.player.mode==='ship'&&!s.expedition?.mounted){moveShip(s,dx,dz);return;}
  const allowed=s.player.mode==='foot'?(x,z)=>canWalk(s,x,z):s.ship?(x,z)=>!islandAt(x,z,1):(x,z)=>!boatBlocked(s,x,z);
  // Substeps prevent tunneling over deck gaps at low frame rates.
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));
  for(let i=0;i<steps;i++){if(allowed(s.player.x+dx/steps,s.player.z))s.player.x+=dx/steps;if(allowed(s.player.x,s.player.z+dz/steps))s.player.z+=dz/steps;}
  if(s.player.mode==='boat'&&!s.expedition?.mounted)Object.assign(s.boat,{x:s.player.x,z:s.player.z,heading:s.player.heading});
}
