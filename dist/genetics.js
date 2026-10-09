// Diploid genome: 16 independent loci, two 8-bit alleles per locus.
// 256^32 possible ordered encodings; rendered phenotypes deliberately share traits.
export const LOCI=['body','fin','tail','horn','eyes','pattern','hue','glow','size','speed','armor','affinity','temper','fertility','lure','ability'];
export const FORMS=['骨刃鰭獸','裂翼魔魟','星眸觸母','晶甲靈龜'];
export const ABILITIES=['拾荒者','守護者','產珊者','深潛者'];
export function seeded(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function makeGenome(seed,form){const r=seeded(seed),g={};for(const key of LOCI)g[key]=[Math.floor(r()*256),Math.floor(r()*256)];if(form!==undefined)g.body=[form*64+20,form*64+20];g.temper=[50+Math.floor(r()*100),50+Math.floor(r()*100)];return g;}
export function phenotype(g){const v=k=>(g[k][0]+g[k][1])/2/255;return {body:Math.min(3,Math.floor(g.body[0]/64)),secondary:Math.min(3,Math.floor(g.body[1]/64)),fusion:Math.floor(g.body[0]/64)!==Math.floor(g.body[1]/64)?1:0,fin:Math.min(3,Math.floor(v('fin')*4)),tail:Math.min(3,Math.floor(v('tail')*4)),horn:Math.floor(v('horn')*4),eyes:2+Math.floor(v('eyes')*3),pattern:Math.min(3,Math.floor(v('pattern')*4)),hue:v('hue'),glow:.15+v('glow')*.85,size:.75+v('size')*.9,speed:Math.round(20+v('speed')*80),armor:Math.round(20+v('armor')*80),affinity:Math.round(20+v('affinity')*80),temper:v('temper'),fertility:v('fertility'),lure:v('lure'),ability:Math.min(3,Math.floor(v('ability')*4))};}
export function geneName(g){const p=phenotype(g),colors=['赤潮','琥珀','青芽','碧海','琉光','暮紫','緋霧'];const prefix=colors[Math.min(6,Math.floor(p.hue*7))];const feature=p.horn>1?'角':p.glow>.6?'燈':p.fin>1?'翼':'紋';return prefix+feature+FORMS[p.body]+(p.fusion?'・混種':'');}
export function dnaCode(g){let a=2166136261;for(const k of LOCI)for(const v of g[k]){a^=v;a=Math.imul(a,16777619);}return(a>>>0).toString(16).toUpperCase().padStart(8,'0');}
export function crossGenome(parentA,parentB,rng=Math.random,mutationRate=.045){const genome={};let mutations=0;for(const k of LOCI){genome[k]=[parentA[k][rng()<.5?0:1],parentB[k][rng()<.5?0:1]];for(let i=0;i<2;i++)if(rng()<mutationRate){const old=genome[k][i];genome[k][i]=(old+1+Math.floor(rng()*255))%256;mutations++;}}return{genome,mutations};}
export function describeGenes(g){const p=phenotype(g);return[p.fusion?FORMS[p.body]+' × '+FORMS[p.secondary]:FORMS[p.body],['短鰭','羽鰭','翼鰭','絲鰭'][p.fin],['扇尾','雙尾','長尾','棘尾'][p.tail],p.horn?`${p.horn+1} 組骨棘`:'晶觸角',p.glow>.6?'高生物光':'微光'];}
export function genomeValid(g){return g&&LOCI.every(k=>Array.isArray(g[k])&&g[k].length===2&&g[k].every(v=>Number.isInteger(v)&&v>=0&&v<=255));}
