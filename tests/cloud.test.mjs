import assert from'node:assert/strict';
import{reconcile,readMeta,writeLocal,readLocal,markSynced,forgetLocal,describeSave,META_KEY}from'../dist/save-store.js';
import{CloudSave}from'../dist/cloud-save.js';
import{createState,validateSave,SAVE_KEY}from'../dist/rules.js';
import{CONFIG}from'../dist/config.js';
import{sunAt,horizonColor,QUALITY,loadSettings}from'../dist/realism.js';

const memory=()=>{const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),m};};
let passed=0;const test=async(name,fn)=>{await fn();passed++;console.log('ok -',name);};

await test('reconcile covers every device/cloud combination',()=>{
 assert.equal(reconcile(null,null),'none');
 assert.equal(reconcile({savedAt:5},null),'upload');
 assert.equal(reconcile(null,{savedAt:5}),'download');
 assert.equal(reconcile({savedAt:5},{savedAt:5},1),'same');
 assert.equal(reconcile({savedAt:9},{savedAt:5},5),'upload','cloud unchanged since last sync');
 assert.equal(reconcile({savedAt:5},{savedAt:9},5),'download','device unchanged since last sync');
 assert.equal(reconcile({savedAt:8},{savedAt:9},5),'conflict','both changed');
 assert.equal(reconcile({savedAt:8},{savedAt:9},0),'conflict','never synced with this account');
});

await test('local slot keeps the legacy key and records metadata',()=>{
 const st=memory(),s=createState(1);writeLocal(st,SAVE_KEY,s,1234);
 assert.equal(SAVE_KEY,'tidal-rebirth-save-v1');assert.deepEqual(readLocal(st,SAVE_KEY,validateSave),s);
 assert.equal(readMeta(st).savedAt,1234);markSynced(st,'u1',1234);assert.equal(readMeta(st).synced.u1,1234);
 st.setItem(META_KEY,'{broken');assert.deepEqual(readMeta(st),{savedAt:0,synced:{}});
 st.setItem(SAVE_KEY,'{"version":99}');assert.equal(readLocal(st,SAVE_KEY,validateSave),null);
 forgetLocal(st,SAVE_KEY);assert.equal(st.getItem(SAVE_KEY),null);
 assert.match(describeSave(s),/第 1 日 · 4 座建築/);
});

function fakeDrive(){const d={file:null,calls:[]};d.fetch=async(url,opts={})=>{const u=new URL(url),m=opts.method||'GET';d.calls.push(m+' '+u.pathname);assert.equal(opts.headers.Authorization,'Bearer t1');
 const res=(body,status=200)=>({ok:status<300,status,headers:{get:()=>'application/json'},json:async()=>body,text:async()=>JSON.stringify(body)});
 if(u.pathname.endsWith('/userinfo'))return res({sub:'u1',email:'a@b.c',name:'A'});
 if(u.pathname==='/drive/v3/files'){assert.equal(u.searchParams.get('spaces'),'appDataFolder');return res({files:d.file?[{id:'f1',modifiedTime:'2026-01-01T00:00:00Z',appProperties:{savedAt:String(d.file.savedAt)}}]:[]});}
 if(u.pathname==='/drive/v3/files/f1')return res(d.file);
 if(u.pathname.startsWith('/upload/drive/v3/files')){const boundary=opts.headers['Content-Type'].split('boundary=')[1];const parts=opts.body.split('--'+boundary);const meta=JSON.parse(parts[1].split('\r\n\r\n')[1]);if(m==='POST')assert.deepEqual(meta.parents,['appDataFolder']);else assert.equal(meta.parents,undefined);d.file=JSON.parse(parts[2].split('\r\n\r\n')[1]);return res({id:'f1'});}
 return res({},404);};return d;}

await test('Drive client signs in through the native bridge and round-trips a save',async()=>{
 const st=memory(),d=fakeDrive();let asked=0;const native={getToken:async o=>{asked++;assert.ok(o.scopes.includes(CONFIG.driveScope));return{accessToken:'t1',expiresIn:3600};}};
 const c=new CloudSave({config:{...CONFIG,googleClientId:''},storage:st,fetchImpl:d.fetch,native:()=>native});
 assert.ok(c.configured);const a=await c.signIn();assert.equal(a.email,'a@b.c');assert.ok(c.signedIn);
 assert.equal(await c.remoteInfo(),null);
 const s=createState(2);await c.upload(s,111);assert.ok(d.calls.includes('POST /upload/drive/v3/files'));
 s.elapsed=50;await c.upload(s,222);assert.ok(d.calls.includes('PATCH /upload/drive/v3/files/f1'));
 const got=await c.download();assert.equal(got.savedAt,222);assert.equal(got.state.elapsed,50);assert.ok(validateSave(got.state));
 assert.equal(asked,1,'token is reused until it expires');
 const again=new CloudSave({config:CONFIG,storage:st,fetchImpl:d.fetch,native:()=>native});assert.equal(again.account.id,'u1','account is remembered');
 await c.signOut();assert.ok(!c.signedIn);assert.equal(st.getItem('beastidal-account-v1'),null);
});

await test('guest build without a client id never offers sign-in',async()=>{
 const c=new CloudSave({config:{...CONFIG,googleClientId:''},storage:memory(),fetchImpl:()=>{throw new Error('network used');},native:()=>undefined});
 assert.equal(c.configured,false);await assert.rejects(c.signIn(),e=>e.code==='unconfigured');
});

await test('sun follows the HUD clock and quality presets are valid',()=>{
 const at=h=>sunAt((h-6.5)/24);
 assert.ok(at(12).y>.85,'high at noon');assert.ok(Math.abs(at(6).y)<.02&&Math.abs(at(18).y)<.02,'horizon at 6 and 18');assert.ok(at(0).y<-.85,'below at midnight');assert.ok(at(8).x>0&&at(16).x<0,'rises east, sets west');
 assert.ok(horizonColor(at(12),0).g>horizonColor(at(0),0).g);
 for(const q of Object.values(QUALITY))assert.ok(q.pixelRatio>0&&q.shadow>=1024&&q.rings>0);
});

await test('settings fall back to a device-appropriate quality',()=>{const g=globalThis.localStorage;globalThis.localStorage=memory();try{assert.equal(loadSettings(true).quality,'balanced');assert.equal(loadSettings(false).quality,'high');}finally{globalThis.localStorage=g;}});

console.log(`${passed} cloud/save/realism tests passed.`);
