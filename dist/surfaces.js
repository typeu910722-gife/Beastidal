// 0.43: what things are made of. The raft, the warship and the cabin were built of flat colours; this gives a
// material its surface, painted in the shader in the object's own metres (so it rides along with a moving hull):
//  · wood — growth rings and streaks running with the grain (along the piece's longest side), each board its own
//    tone; with `planks`, the dark seams between deck boards
//  · metal — brushed lines, patches of rust that are rough and dull where brushed steel is smooth and bright
//  · cloth — a fine weave and grime, matte
//  · stone — weathered, with cracks and moss on what faces the sky; with `blocks`, laid in staggered courses
//  · plaster — a fine stucco, faint blotches, rain streaks running down the walls (0.65)
//  · tile — roof tiles in staggered courses, each course shading the one below it (0.65)
// The colour of the material stays as it was — the surface only modulates it. Detail finer than a pixel fades to
// its mean, so nothing shimmers in the distance. No image files.
const NOISE = `
float sf_h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float sf_n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(sf_h(i),sf_h(i+vec2(1.,0.)),f.x),mix(sf_h(i+vec2(0.,1.)),sf_h(i+1.),f.x),f.y);}
float sf_fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*sf_n(p);p=p*2.03+17.17;a*=.5;}return s;}
`;
const BODY = {
  wood: `
  float plank=floor(sfB/.21);float tone=sf_h(vec2(plank,3.1));
  float off=tone*13.;
  float warp=sf_fbm(vec2(sfA*.7+off,sfB*5.));
  float rings=.5+.5*sin(sfB*46.+sfC*21.+warp*7.);
  float streak=sf_fbm(vec2(sfA*1.6+off*3.,sfB*34.));
  float w=mix(.5,rings*.35+streak*.65,lod);
  sfAlb*=mix(.7,1.12,w)*(.84+tone*.3);
  sfRough=.62+streak*.28;
  #ifdef SF_PLANKS
  float seam=abs(fract(sfB/.21)-.5)*.21;
  float joint=abs(fract((sfA+tone*1.7)/2.4)-.5)*2.4;
  sfAlb*=mix(.45,1.,smoothstep(.004,.012+fw,min(seam,joint))*lod+(1.-lod));
  #endif`,
  metal: `
  float brushed=sf_fbm(vec2(sfA*2.,sfB*140.));
  float rust=smoothstep(.56,.76,sf_fbm(vec2(sfA,sfB)*1.4+sfC*.7));
  float pit=sf_fbm(vec2(sfA,sfB)*22.);
  sfAlb=mix(sfAlb*(.86+mix(.5,brushed,lod)*.28),vec3(.2,.095,.045)*(.7+pit*.6),rust*.75);
  sfRough=mix(.32+brushed*.16,.92,rust);
  sfMetal=rust;`,
  stone: `
  vec3 n0=sfNrm;bool top=abs(n0.y)>.7;
  vec2 q=top?p.xz:vec2(abs(n0.x)>abs(n0.z)?p.z:p.x,p.y);
  float tone=.5,joint=1.;
  #ifdef SF_BLOCKS
  float rowH=.46,blkW=.9;
  float row=floor(q.y/rowH);float xx=q.x/blkW+row*.5;
  vec2 cell=vec2(floor(xx),row);vec2 f=vec2(fract(xx)*blkW,fract(q.y/rowH)*rowH);
  float edge=min(min(f.x,blkW-f.x),min(f.y,rowH-f.y));
  joint=mix(1.,smoothstep(.008,.026+fw,edge),lod);
  tone=sf_h(cell+3.7);
  #endif
  float weather=sf_fbm(q*.9+tone*5.);
  float grit=mix(.5,sf_fbm(q*9.),lod);
  float crack=1.-(1.-smoothstep(.0,.025+fw,abs(sf_n(q*2.3+tone*9.)-.5)))*smoothstep(.62,.7,sf_fbm(q*.6+4.))*lod;
  sfAlb*=(.8+tone*.28)*(.78+weather*.38)*(.88+grit*.24)*mix(.42,1.,joint)*mix(.45,1.,crack);
  // moss and lichen where rain and light fall on it, and at the foot of a wall
  float moss=smoothstep(.5,.78,sf_fbm(q*1.6+7.))*(.35+.65*max(n0.y,0.))+smoothstep(.6,0.,p.y)*.25*(1.-abs(n0.y));
  sfAlb=mix(sfAlb,vec3(.09,.13,.05)*(.8+weather*.5),clamp(moss,0.,1.)*.65);
  sfRough=.94;`,
  plaster: `
  vec3 n0=sfNrm;float u=abs(n0.x)>abs(n0.z)?p.z:p.x;
  float stucco=mix(.5,sf_fbm(vec2(u,p.y)*7.+sfC),lod);
  float blot=sf_fbm(vec2(u,p.y)*.4+sfC*.3);
  float streak=abs(n0.y)<.5?sf_fbm(vec2(u*2.6,p.y*.18)):.5;
  sfAlb*=(.91+stucco*.12)*(.95+blot*.08)*(.95+streak*.08)*mix(1.,.86,smoothstep(.9,0.,p.y)*(1.-abs(n0.y)));
  sfRough=.9;`,
  tile: `
  vec3 n0=sfNrm;float u=abs(n0.x)>abs(n0.z)?p.z:p.x;
  float row=floor(p.y/.18);float cx=u/.26+row*.5;
  float fy=fract(p.y/.18),fx=fract(cx);
  float tone=sf_h(vec2(floor(cx),row));
  float shade=mix(.6,1.,smoothstep(0.,.4,fy));
  float gap=smoothstep(0.,.07+fw*4.,min(fx,1.-fx));
  sfAlb*=mix(1.,(.8+tone*.32)*shade*mix(.6,1.,gap),lod);
  float moss=smoothstep(.62,.82,sf_fbm(vec2(u,p.y)*1.2+3.))*.3*lod;
  sfAlb=mix(sfAlb,vec3(.17,.18,.11),moss);
  sfRough=.72;`,
  cloth: `
  float weave=.5+.25*(sin(sfA*420.)+sin(sfB*420.));
  float grime=sf_fbm(vec2(sfA,sfB)*1.8+sfC);
  sfAlb*=mix(1.,.86+weave*.2,lod)*(.78+grime*.34);
  sfRough=.95;`
};

// kind: 'wood' | 'metal' | 'cloth'; opts.planks: deck seams; opts.axis: 0/1/2 forces the grain's axis (x/y/z)
export function surface(material, kind, opts = {}) {
  if (!BODY[kind] || material.userData.surface) return material;
  material.userData.surface = kind;
  const key = `sf-${kind}-${opts.planks ? 1 : 0}${opts.blocks ? 1 : 0}-${opts.axis ?? 'a'}`;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (sh, r) => {
    prev?.(sh, r);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 sfPos;varying vec3 sfNrm;varying float sfAxis;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
 {
  vec3 sc=vec3(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz),length(modelMatrix[2].xyz));
  sfPos=transformed*sc;sfNrm=normalize(objectNormal);
  ${
    opts.axis !== undefined
      ? `sfAxis=${opts.axis}.;`
      : // the grain runs along the piece's longest side (a box scaled into a beam or a board)
        'sfAxis=sc.x>=sc.y&&sc.x>=sc.z?0.:sc.y>=sc.z?1.:2.;if(abs(sc.x-sc.z)<.01&&abs(sc.x-sc.y)<.01)sfAxis=2.;'
  }
 }`
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\nvarying vec3 sfPos;varying vec3 sfNrm;varying float sfAxis;float sfRough=-1.;float sfMetal=-1.;\n${NOISE}`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
 {
  // A: along the grain; B: across it on this face; C: the third axis
  vec3 p=sfPos;vec3 n=abs(sfNrm);
  float sfA,sfB,sfC;
  if(sfAxis<.5){sfA=p.x;sfB=n.y>n.z?p.z:p.y;sfC=n.y>n.z?p.y:p.z;}
  else if(sfAxis<1.5){sfA=p.y;sfB=n.x>n.z?p.z:p.x;sfC=n.x>n.z?p.x:p.z;}
  else{sfA=p.z;sfB=n.x>n.y?p.y:p.x;sfC=n.x>n.y?p.x:p.y;}
  float fw=length(fwidth(sfPos));
  float lod=clamp(1.-fw*9.,0.,1.);
  vec3 sfAlb=diffuseColor.rgb;
  ${BODY[kind]}
  diffuseColor.rgb=sfAlb;
 }`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nif(sfRough>=0.)roughnessFactor=sfRough;'
      )
      .replace(
        '#include <metalnessmap_fragment>',
        '#include <metalnessmap_fragment>\nif(sfMetal>=0.)metalnessFactor=mix(metalnessFactor,.1,sfMetal);'
      );
    if (opts.planks) sh.fragmentShader = '#define SF_PLANKS\n' + sh.fragmentShader;
    if (opts.blocks) sh.fragmentShader = '#define SF_BLOCKS\n' + sh.fragmentShader;
  };
  const prevKey = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => key + (prevKey ? prevKey() : '');
  material.needsUpdate = true;
  return material;
}
