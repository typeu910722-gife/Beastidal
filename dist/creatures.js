// Procedural creature models (0.10 rewrite).
//
// Every beast is built from its genome: family + form pick one of 16 species builders, and the remaining genes
// shape fins, tails, horns, eyes, colour, patterning and bioluminescence. Bodies are swept surfaces with painted
// skin textures (countershading, stripes / spots / scales / light organs, plant moss), glossy "wet" physical
// materials, iris-textured eyes and ray-veined fin membranes. Swimming is done on the GPU: the body and its baked-on
// parts share one wave deformation, so tails, crests and ribbons ripple together.
import * as T from './vendor/three.module.min.js';
import { phenotype, seeded, dnaCode } from './genetics.js?v=0.77.0';
import { mergeGeometries } from './vendor/addons/utils/BufferGeometryUtils.js';

const V = T.Vector3;
let detail = 'high';
// 'high' | 'balanced' | 'low' — matches the graphics quality presets.
export function setCreatureDetail(level) {
  detail = level;
}
export const creatureDetail = () => detail;
const segs = (hi, lo) => (detail === 'low' ? lo : detail === 'balanced' ? Math.round((hi + lo) / 2) : hi);
const texSize = () => (detail === 'low' ? 128 : 256);

/* ---------------------------------------------------------------- colour helpers */
const hsl = (h, s, l) => new T.Color().setHSL(((h % 1) + 1) % 1, s, l);
const css = c => `#${c.getHexString()}`;
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function palette(p) {
  // Land beasts lean earthy, flora green-gold, deep species darker and more saturated.
  const hue = p.family === 'flora' ? mix(p.hue, 0.3, 0.55) : p.family === 'land' ? mix(p.hue, 0.08, 0.35) : p.hue;
  const deep = p.family === 'deep';
  // Natural countershading: dark back, mid flank, pale belly.
  return {
    hue,
    back: hsl(hue, deep ? 0.55 : 0.5, (deep ? 0.12 : 0.17) * (1 - p.fierce * 0.35)),
    side: hsl(hue + 0.02, deep ? 0.5 : 0.44, deep ? 0.27 : 0.33),
    belly: hsl(hue + 0.06, 0.22, deep ? 0.55 : 0.68),
    mark:
      p.fierce >= 0.55
        ? hsl(mix(hue + 0.5, 0.03, 0.6), 0.72, deep ? 0.5 : 0.42)
        : hsl(hue + 0.5 + p.temper * 0.1, 0.62, deep ? 0.55 : 0.4),
    accent: hsl(hue + 0.12, 0.6, 0.62),
    glow: hsl(hue + 0.45, 0.9, 0.62),
    fin: hsl(hue + 0.05, 0.45, 0.5)
  };
}

/* ---------------------------------------------------------------- textures */
const texCache = new Map();
const canPaint = typeof document !== 'undefined';
function canvasTex(w, h, draw, key) {
  if (!canPaint) return null; // headless (unit tests): geometry only
  if (key && texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c);
  t.flipY = false; // canvas row y == texture v, so the painter's "back" really lands on the back
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 4;
  t.wrapS = T.RepeatWrapping;
  if (key) texCache.set(key, t);
  return t;
}
// Skin: u (x) runs tail→head, v (y) runs around the body; v=0.25 is the back, 0.75 the belly.
function skinTextures(p, pal, kind, seed) {
  const W = texSize(),
    H = W / 2,
    key = `${kind}|${seed}|${W}`;
  if (texCache.has(key)) return texCache.get(key);
  if (!canPaint) return { map: null, glow: null };
  const rnd = seeded(seed),
    glowCanvas = document.createElement('canvas');
  glowCanvas.width = W;
  glowCanvas.height = H;
  const gctx = glowCanvas.getContext('2d');
  gctx.fillStyle = '#000';
  gctx.fillRect(0, 0, W, H);
  const map = canvasTex(W, H, (ctx, w, h) => {
    const img = ctx.createImageData(w, h),
      d = img.data,
      // canvas pixels are sRGB, so read the palette in sRGB (THREE.Color stores linear values)
      rgb = c => {
        const o = {};
        c.getRGB(o, T.SRGBColorSpace);
        return [o.r, o.g, o.b];
      },
      [br, bg, bb] = rgb(pal.back),
      [sr, sg, sb] = rgb(pal.side),
      [lr, lg, lb] = rgb(pal.belly),
      [mr, mg, mb] = rgb(pal.mark),
      [qr, qg, qb] = rgb(hsl(0.27 + rnd() * 0.06, 0.45, 0.32));
    for (let y = 0; y < h; y++) {
      const a = (y / h) * Math.PI * 2,
        up = Math.sin(a), // +1 back, -1 belly
        t1 = smooth(-0.9, 0.1, up),
        t2 = smooth(-0.55, 0.65, up);
      for (let x = 0; x < w; x++) {
        const u = x / w;
        let r = mix(mix(lr, sr, t1), br, t2),
          g = mix(mix(lg, sg, t1), bg, t2),
          b = mix(mix(lb, sb, t1), bb, t2),
          m = 0;
        if (p.pattern === 0) m = Math.sin(u * 40 + Math.sin(a * 2) * 1.5) > 0.55 && up > -0.3 ? 1 : 0;
        else if (p.pattern === 2) {
          const su = u * 46,
            sv = (y / h) * 23 + (Math.floor(su) % 2) * 0.5,
            fu = su - Math.floor(su),
            fv = sv - Math.floor(sv);
          m = Math.hypot(fu - 0.5, (fv - 0.5) * 1.2) > 0.42 ? 0.55 : 0;
        }
        if (kind === 'fur') m *= 0.4;
        if (m) {
          const k = m * (0.55 + 0.25 * t2);
          r = mix(r, mr, k);
          g = mix(g, mg, k);
          b = mix(b, mb, k);
        }
        if (p.flora && up > -0.2) {
          const n = Math.sin(u * 23 + Math.sin(y * 0.21) * 2) * Math.cos((y / h) * 17 + u * 9);
          if (n > 0.35 - p.flora * 0.4) {
            const k = 0.6 * p.flora;
            r = mix(r, qr, k);
            g = mix(g, qg, k);
            b = mix(b, qb, k);
          }
        }
        const grain = 1 + (rnd() - 0.5) * (kind === 'fur' ? 0.3 : 0.12),
          i = (y * w + x) * 4;
        d[i] = Math.min(255, r * grain * 255);
        d[i + 1] = Math.min(255, g * grain * 255);
        d[i + 2] = Math.min(255, b * grain * 255);
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // spots / light organs drawn as soft discs
    if (p.pattern === 1 || p.pattern === 3) {
      const n = p.pattern === 1 ? 70 : 34;
      for (let k = 0; k < n; k++) {
        const x = rnd() * w,
          y = (0.05 + rnd() * 0.42) * h,
          r = (p.pattern === 1 ? 2 + rnd() * 5 : 1.5 + rnd() * 2.5) * (w / 256);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, css(p.pattern === 1 ? pal.mark : pal.accent));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        if (p.pattern === 3) {
          const gg = gctx.createRadialGradient(x, y, 0, x, y, r * 1.6);
          gg.addColorStop(0, css(pal.glow));
          gg.addColorStop(1, 'rgba(0,0,0,0)');
          gctx.fillStyle = gg;
          gctx.beginPath();
          gctx.arc(x, y, r * 1.6, 0, Math.PI * 2);
          gctx.fill();
        }
      }
    }
    // old scars: pale, slightly raised claw rakes across the back and flanks
    if (p.fierce >= 0.7) {
      ctx.lineCap = 'round';
      for (let k = 0; k < 3 + Math.floor(p.fierce * 4); k++) {
        const x = rnd() * w,
          y = (0.04 + rnd() * 0.4) * h,
          a = (rnd() - 0.5) * 1.2,
          l = (10 + rnd() * 18) * (w / 256);
        for (let j = 0; j < 3; j++) {
          const ox = Math.cos(a + Math.PI / 2) * j * 3 * (w / 256),
            oy = Math.sin(a + Math.PI / 2) * j * 3 * (w / 256);
          ctx.strokeStyle = 'rgba(214,196,180,.75)';
          ctx.lineWidth = 1.4 * (w / 256);
          ctx.beginPath();
          ctx.moveTo(x + ox, y + oy);
          ctx.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l);
          ctx.stroke();
        }
      }
    }
    // lateral line of light organs along both flanks
    if (p.glow > 0.45) {
      for (const yy of [0, 0.5]) {
        for (let x = 4; x < w; x += 7 * (w / 256)) {
          const y = (yy + 0.02) * h,
            r = 1.6 * (w / 256);
          gctx.fillStyle = css(pal.glow);
          gctx.beginPath();
          gctx.arc(x, y, r, 0, Math.PI * 2);
          gctx.fill();
        }
      }
    }
  });
  const glow = new T.CanvasTexture(glowCanvas);
  glow.flipY = false;
  glow.colorSpace = T.SRGBColorSpace;
  glow.wrapS = T.RepeatWrapping;
  const out = { map, glow };
  texCache.set(key, out);
  return out;
}
// Fin membrane: translucent at the edge, opaque at the root, with bony rays fanning out.
function finTexture(pal, rays = 9, leaf = false) {
  const key = `fin|${pal.fin.getHex()}|${rays}|${leaf}`;
  return canvasTex(
    128,
    128,
    (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, css(pal.side));
      g.addColorStop(0.6, css(pal.fin));
      g.addColorStop(1, css(pal.accent));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = leaf ? 'rgba(235,255,200,.55)' : 'rgba(20,25,30,.35)';
      ctx.lineWidth = leaf ? 1.6 : 2;
      for (let i = 0; i <= rays; i++) {
        ctx.beginPath();
        if (leaf) {
          ctx.moveTo(0, h / 2);
          ctx.quadraticCurveTo(w * 0.4, h / 2 + (i / rays - 0.5) * h * 0.3, w, (i / rays) * h);
        } else {
          ctx.moveTo(0, h * 0.5);
          ctx.quadraticCurveTo(w * 0.5, h * (0.5 + (i / rays - 0.5) * 0.6), w, (i / rays) * h);
        }
        ctx.stroke();
      }
      if (leaf) {
        ctx.strokeStyle = 'rgba(250,255,220,.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
      }
    },
    key
  );
}
// Equirectangular eye map: u spans 360°, v 180°, so a 35° iris is a ~12 px disc on a 128×64 canvas.
function eyeTexture(hue, slit, fierce = false) {
  const key = `eye|${Math.round(hue * 40)}|${slit}|${fierce}`;
  return canvasTex(
    128,
    64,
    (ctx, w, h) => {
      const cx = w / 2,
        cy = h / 2,
        R = 19,
        iris = fierce ? hsl(0.07 + (hue - 0.5) * 0.06, 0.95, 0.5) : hsl(hue + 0.5, 0.75, 0.48);
      // animals show little white: a dark sclera that fades into the iris
      ctx.fillStyle = css(iris.clone().offsetHSL(0, -0.35, -0.38));
      ctx.fillRect(0, 0, w, h);
      const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, R);
      g.addColorStop(0, css(iris.clone().offsetHSL(0, 0, 0.22)));
      g.addColorStop(0.55, css(iris));
      g.addColorStop(0.85, css(iris.clone().offsetHSL(0, 0, -0.25)));
      g.addColorStop(1, css(iris.clone().offsetHSL(0, -0.35, -0.38)));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#020304';
      ctx.beginPath();
      if (slit) ctx.ellipse(cx, cy, fierce ? 1.8 : 2.5, fierce ? 15 : 13, 0, 0, Math.PI * 2);
      else ctx.arc(cx, cy, 7.5, 0, Math.PI * 2);
      ctx.fill();
    },
    key
  );
}

/* ---------------------------------------------------------------- materials */
// GPU swimming. Modes: 1 undulate (side-to-side wave growing toward the tail), 2 flap (wings rise and fall with
// distance from the midline), 3 sway (hanging tentacles drift with depth).
function swimify(mat, u, mode) {
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uSwimT,uSwimA,uSwimF,uHead,uLen,uSpan;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #if ${mode} == 1
          float w = clamp((uHead - transformed.z) / uLen, 0., 1.);
          transformed.x += sin(transformed.z * uSwimF - uSwimT) * uSwimA * (0.12 + w * w);
        #elif ${mode} == 2
          float s = abs(transformed.x) / uSpan;
          transformed.y += sin(uSwimT - s * 1.6) * uSwimA * pow(s, 1.5);
          transformed.x += sin(transformed.z * 1.2 - uSwimT * 0.5) * uSwimA * 0.15;
        #elif ${mode} == 3
          float dpt = clamp(-transformed.y / uLen, 0., 1.);
          transformed.x += sin(transformed.y * uSwimF + uSwimT) * uSwimA * dpt;
          transformed.z += cos(transformed.y * uSwimF * 0.8 + uSwimT * 1.1) * uSwimA * dpt;
        #endif`
      );
  };
  mat.customProgramCacheKey = () => 'swim' + mode;
  return mat;
}
function physical(opts) {
  if (detail === 'low') {
    const rest = { ...opts };
    for (const k of ['clearcoat', 'clearcoatRoughness', 'sheen', 'sheenColor', 'sheenRoughness']) delete rest[k];
    return new T.MeshStandardMaterial(rest);
  }
  return new T.MeshPhysicalMaterial(opts);
}

/* ---------------------------------------------------------------- geometry */
// Swept surface along a path. profile(u) → [rx, ry, yOffset]; u = 0 at the tail end, 1 at the head end.
function sweepGeometry(path, profile, S, R, twist = 0) {
  const pos = [],
    uv = [],
    idx = [],
    up = new V(0, 1, 0),
    n = new V(),
    b = new V();
  for (let i = 0; i <= S; i++) {
    const u = i / S,
      c = path.getPointAt(u),
      tan = path.getTangentAt(u);
    b.crossVectors(tan, up);
    if (b.lengthSq() < 1e-6) b.set(1, 0, 0);
    b.normalize();
    n.crossVectors(b, tan).normalize();
    const [rx, ry, oy = 0] = profile(u);
    for (let j = 0; j <= R; j++) {
      const a = (j / R) * Math.PI * 2 + twist * u,
        x = Math.cos(a) * rx,
        y = Math.sin(a) * ry + oy;
      pos.push(c.x + b.x * x + n.x * y, c.y + b.y * x + n.y * y, c.z + b.z * x + n.z * y);
      uv.push(u, j / R);
      if (i && j) {
        const q = i * (R + 1) + j;
        idx.push(q - R - 2, q - 1, q, q - R - 2, q, q - R - 1);
      }
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const line = pts => new T.CatmullRomCurve3(pts.map(p => new V(...p)));
const straight = (z0, z1) =>
  line([
    [0, 0, z0],
    [0, 0, (z0 + z1) / 2],
    [0, 0, z1]
  ]);
// Smooth radius curve through key points [u, value].
function curve(keys) {
  return u => {
    for (let i = 1; i < keys.length; i++)
      if (u <= keys[i][0]) {
        const [u0, v0] = keys[i - 1],
          [u1, v1] = keys[i],
          t = (u - u0) / (u1 - u0);
        return mix(v0, v1, t * t * (3 - 2 * t));
      }
    return keys[keys.length - 1][1];
  };
}
// Tapered tube (tentacles, legs, horns, antlers, whiskers).
function taper(pts, r0, r1, S = 14, R = 8) {
  const path = line(pts);
  return sweepGeometry(path, u => [mix(r0, r1, u), mix(r0, r1, u)], segs(S, 6), segs(R, 5));
}
// Flat membrane from an outline in the XY plane; UVs normalised to the outline's bounding box.
function membraneGeometry(outline) {
  const shape = new T.Shape();
  shape.moveTo(...outline[0]);
  for (let i = 1; i < outline.length; i++) {
    const [x0, y0] = outline[i - 1],
      [x1, y1] = outline[i];
    shape.quadraticCurveTo((x0 + x1) / 2 + (y1 - y0) * 0.08, (y0 + y1) / 2 - (x1 - x0) * 0.08, x1, y1);
  }
  shape.closePath();
  const g = new T.ShapeGeometry(shape, segs(10, 5));
  g.computeBoundingBox();
  const bb = g.boundingBox,
    p = g.attributes.position,
    uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++)
    uv.setXY(
      i,
      (p.getX(i) - bb.min.x) / (bb.max.x - bb.min.x || 1),
      (p.getY(i) - bb.min.y) / (bb.max.y - bb.min.y || 1)
    );
  return g;
}
// Spheres run v from bottom (0) to top (1); skins expect back at v=.25 and belly at v=.75.
function skinUV(geo) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 0.25 + (1 - uv.getY(i)) * 0.5);
  return geo;
}
function addMesh(parent, geo, mat, pos, rot, scale) {
  const m = new T.Mesh(geo, mat);
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  if (scale) typeof scale === 'number' ? m.scale.setScalar(scale) : m.scale.set(...scale);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
// Moves a part's transform into its geometry so the shared swim wave (which works in body space) bends it too.
function bake(m) {
  m.updateMatrix();
  m.geometry = transformed(m.geometry, m.matrix);
  m.position.set(0, 0, 0);
  m.rotation.set(0, 0, 0);
  m.scale.set(1, 1, 1);
  return m;
}

// Body outlines shared by the builders and the species signatures (u = 0 at the tail end, 1 at the head end)
const FISH_RX = curve([
    [0, 0.03],
    [0.12, 0.09],
    [0.4, 0.4],
    [0.62, 0.46],
    [0.86, 0.33],
    [1, 0.03]
  ]),
  FISH_RY = curve([
    [0, 0.05],
    [0.12, 0.14],
    [0.4, 0.52],
    [0.62, 0.55],
    [0.86, 0.36],
    [1, 0.05]
  ]);
const RAY_RX = curve([
    [0, 0.12],
    [0.2, 0.95],
    [0.45, 1.75],
    [0.62, 1.7],
    [0.82, 0.95],
    [1, 0.25]
  ]),
  RAY_RY = curve([
    [0, 0.06],
    [0.3, 0.17],
    [0.55, 0.24],
    [0.8, 0.2],
    [1, 0.08]
  ]);
const SERPENT_R = curve([
  [0, 0.02],
  [0.08, 0.14],
  [0.5, 0.36],
  [0.8, 0.4],
  [0.88, 0.33],
  [0.95, 0.4],
  [1, 0.14]
]);
const LIZARD_R = curve([
  [0, 0.02],
  [0.35, 0.12],
  [0.55, 0.3],
  [0.75, 0.3],
  [0.85, 0.17],
  [0.92, 0.2],
  [1, 0.05]
]);

// A copy of geo moved by matrix. A mirroring matrix also reverses the triangles' winding, so their front faces (and
// the lighting of double-sided membranes) stay on the side the normals point to.
function transformed(geo, matrix) {
  const g = geo.clone().applyMatrix4(matrix);
  if (matrix.determinant() < 0) {
    if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i += 3) [ix[i + 1], ix[i + 2]] = [ix[i + 2], ix[i + 1]];
    g.index.needsUpdate = true;
  }
  return g;
}

/* ---------------------------------------------------------------- the kit handed to species builders */
function kit(genome) {
  const p = phenotype(genome),
    pal = palette(p),
    seed = parseInt(dnaCode(genome), 16),
    rnd = seeded(seed),
    u = {
      uSwimT: { value: 0 },
      uSwimA: { value: 0.15 },
      uSwimF: { value: 2.4 },
      uHead: { value: 1.3 },
      uLen: { value: 2.8 },
      uSpan: { value: 1.6 }
    };
  const land = p.family === 'land';
  const mats = {};
  const skinMat = (kind, mode = 1, extra = {}) => {
    const key = kind + mode;
    if (mats[key]) return mats[key];
    const tx = skinTextures(p, pal, kind, seed);
    const m = physical({
      map: tx.map,
      // 0.43: the skin's own pattern as relief — scales and plates stand out, smooth hide gets soft folds
      bumpMap: tx.map,
      bumpScale: kind === 'scale' ? 2.2 : kind === 'fur' ? 1.2 : 0.8,
      emissiveMap: tx.glow,
      emissive: new T.Color(0xffffff),
      emissiveIntensity: 0.25 + p.glow * 1.1,
      roughness: kind === 'fur' ? 0.88 : land ? 0.6 : 0.42,
      metalness: 0.0,
      clearcoat: kind === 'fur' ? 0 : land ? 0.15 : 0.45,
      clearcoatRoughness: 0.35,
      envMapIntensity: 0.8,
      sheen: kind === 'fur' ? 1 : 0,
      sheenColor: pal.belly,
      sheenRoughness: 0.6,
      side: T.FrontSide,
      ...extra
    });
    return (mats[key] = mode ? swimify(m, u, mode) : m);
  };
  const finMat = (mode = 1, leaf = false) => {
    const key = 'fin' + mode + leaf;
    if (mats[key]) return mats[key];
    const m = physical({
      map: finTexture(
        leaf ? { ...pal, fin: hsl(0.3, 0.5, 0.42), side: hsl(0.28, 0.45, 0.3), accent: hsl(0.2, 0.6, 0.6) } : pal,
        9,
        leaf
      ),
      side: T.DoubleSide,
      transparent: true,
      opacity: leaf ? 0.95 : 0.82,
      roughness: 0.35,
      clearcoat: 0.5,
      depthWrite: !!leaf
    });
    return (mats[key] = mode ? swimify(m, u, mode) : m);
  };
  const plain = (color, extra = {}, mode = 0) => {
    const m = physical({ color, roughness: 0.4, clearcoat: 0.4, ...extra });
    return mode ? swimify(m, u, mode) : m;
  };
  const glowMat = (mode = 0) =>
    plain(pal.glow, { emissive: pal.glow, emissiveIntensity: 0.6 + p.glow * 1.6, roughness: 0.25 }, mode);
  const wary = p.fierce >= 0.35,
    savage = p.fierce >= 0.55;
  const eye = (parent, pos, r, slit = false) => {
    const map = eyeTexture(pal.hue, slit || wary, savage);
    const mat = physical({
      map,
      roughness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      // savage eyes shine back out of the dark
      emissive: savage ? new T.Color(0xffffff) : pal.glow,
      emissiveMap: savage ? map : null,
      emissiveIntensity: savage ? 0.55 : p.glow > 0.7 ? 0.25 : 0
    });
    const e = addMesh(parent, new T.SphereGeometry(r, segs(18, 10), segs(14, 8)), mat, pos);
    e.userData.eye = true;
    // SphereGeometry puts the texture centre (the iris) on +x: turn it outward, or up-and-forward for brow eyes.
    if (Math.abs(pos[0]) < 0.02) e.rotation.set(Math.PI / 4, 0, Math.PI / 2);
    else if (pos[0] < 0) e.rotation.y = Math.PI;
    // a bony brow ridge slanting down toward the snout gives the scowl
    if (wary && Math.abs(pos[0]) >= 0.02) {
      const side = Math.sign(pos[0]);
      mats.brow ??= physical({ color: pal.back.clone().offsetHSL(0, -0.1, -0.03), roughness: 0.7 });
      addMesh(
        parent,
        new T.SphereGeometry(1, segs(10, 6), segs(6, 4)),
        mats.brow,
        [pos[0] - side * r * 0.12, pos[1] + r * 0.62, pos[2] + r * 0.12],
        [0.25, side * 0.35, -side * (0.35 + p.fierce * 0.35)],
        [r * 1.35, r * 0.38, r * 1.05]
      );
    }
    return e;
  };
  return { p, pal, u, rnd, skinMat, finMat, plain, glowMat, eye, limbs: [], parts: {} };
}

/* ---------------------------------------------------------------- shared features */
function finFan(K, parent, at, span, length, side, mode = 0, leaf = false) {
  const pivot = new T.Group();
  pivot.position.set(...at);
  parent.add(pivot);
  const outline = leaf
    ? [
        [0, 0],
        [span * 0.35, length * 0.22],
        [span, length * 0.05],
        [span * 0.4, -length * 0.25],
        [0, 0]
      ]
    : [
        [0, 0.06],
        [span * 0.55, length * 0.25],
        [span, -length * 0.1],
        [span * 0.62, -length * 0.55],
        [0.05, -length * 0.35]
      ];
  const g = membraneGeometry(outline);
  const m = addMesh(pivot, g, K.finMat(mode, leaf), null, [Math.PI / 2, 0, 0]);
  m.scale.x = side;
  pivot.userData.side = side;
  return pivot;
}
// Dorsal crest / sail along the back from z0 to z1, height h. Baked so it ripples with the body.
function crest(K, parent, z0, z1, y, h, spines) {
  const outline = [
    [z0, 0],
    [mix(z0, z1, 0.25), h],
    [mix(z0, z1, 0.6), h * 0.85],
    [z1, h * 0.15],
    [z1, 0]
  ];
  const m = addMesh(parent, membraneGeometry(outline), K.finMat(1), [0, y, 0], [0, -Math.PI / 2, 0]);
  bake(m);
  if (spines) {
    const bone = K.plain(K.pal.belly.clone().offsetHSL(0, -0.2, 0.1), { roughness: 0.5 }, 1);
    for (let i = 0; i < spines; i++) {
      const z = mix(z0, z1, (i + 0.5) / spines),
        s = addMesh(parent, new T.ConeGeometry(0.035, h * 1.25, 6), bone, [0, y + h * 0.55, z], [-0.35, 0, 0]);
      bake(s);
    }
  }
  return m;
}
function horns(K, parent, at, count, len, swept = 0.6, mode = 0) {
  const bone = K.plain(K.pal.belly.clone().offsetHSL(0.05, -0.25, 0.05), { roughness: 0.45, clearcoat: 0.6 }, mode);
  for (let i = 0; i < count; i++)
    for (const side of [-1, 1]) {
      const x = side * (0.08 + i * 0.07),
        g = taper(
          [
            [x + at[0], at[1], at[2] - i * 0.12],
            [x * 1.6 + at[0], at[1] + len * 0.6, at[2] - i * 0.12 - len * swept * 0.4],
            [x * 2.2 + at[0], at[1] + len * 0.9, at[2] - i * 0.12 - len * swept]
          ],
          0.045,
          0.006,
          10,
          7
        );
      const m = addMesh(parent, g, bone);
      if (mode) bake(m);
    }
}
function fangs(K, parent, mouth) {
  const { at, w, depth = 0.12, mode = 1 } = mouth,
    n = 4 + Math.round(K.p.fierce * 4),
    len = (0.07 + K.p.fierce * 0.08) * (mouth.scale || 1),
    ivory = K.plain(hsl(0.11, 0.25, 0.8), { roughness: 0.35, clearcoat: 0.6 }, mode);
  for (const row of [1, -1])
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n - 0.5,
        x = t * w,
        // the two outer pairs are long canines
        l = len * (Math.abs(t) > 0.3 ? 1.5 : 0.7) * (row > 0 ? 1 : 0.75);
      const m = addMesh(
        parent,
        new T.ConeGeometry(l * 0.22, l, 5),
        ivory,
        [at[0] + x, at[1] + row * 0.012, at[2] - t * t * depth * 4],
        [row > 0 ? Math.PI : 0, 0, t * 0.4]
      );
      m.position.y -= (row * l) / 2;
      m.userData.tooth = true;
      if (mode) bake(m);
    }
}
function extraEyes(K, parent, head, n) {
  // Mutant third/fourth eyes on the brow, glowing when bioluminescent.
  for (let i = 0; i < n; i++) K.eye(parent, [(i - (n - 1) / 2) * 0.12, head[1], head[2]], 0.05);
}

/* ---------------------------------------------------------------- flora overlay */
function leafGeometry() {
  return membraneGeometry([
    [0, 0],
    [0.12, 0.08],
    [0.32, 0.03],
    [0.12, -0.08],
    [0, 0]
  ]);
}
function flower(K, parent, at, size, mode) {
  const petals = 5 + Math.floor(K.rnd() * 3),
    petalMat = K.plain(hsl(K.pal.hue + 0.85 + K.rnd() * 0.2, 0.7, 0.68), { side: T.DoubleSide, roughness: 0.5 }, mode),
    g = membraneGeometry([
      [0, 0],
      [0.08, 0.06],
      [0.2, 0.02],
      [0.08, -0.05],
      [0, 0]
    ]);
  for (let i = 0; i < petals; i++) {
    const m = addMesh(parent, g, petalMat, at, [Math.PI / 2 - 0.5, (i / petals) * Math.PI * 2, 0], size);
    if (mode) bake(m);
  }
  const c = addMesh(parent, new T.SphereGeometry(0.04 * size, 8, 6), K.glowMat(mode), [at[0], at[1] + 0.02, at[2]]);
  if (mode) bake(c);
}
// Leaves sprout along the back, flowers bloom near the head; strength 0.4 for a recessive bud, 1 for full growth.
function floraGrowth(K, parent, z0, z1, y, strength) {
  const leafMat = K.finMat(1, true),
    leaf = leafGeometry(),
    n = Math.round(4 + strength * 10);
  for (let i = 0; i < n; i++) {
    const z = mix(z0, z1, K.rnd()),
      side = K.rnd() < 0.5 ? -1 : 1,
      m = addMesh(
        parent,
        leaf,
        leafMat,
        [side * 0.1, y, z],
        [0.3 + K.rnd() * 0.6, side * (0.8 + K.rnd()), -side * 0.6],
        1 + K.rnd() * 1.4
      );
    bake(m);
  }
  const flowers = Math.round(strength * 3);
  for (let i = 0; i < flowers; i++)
    flower(K, parent, [(K.rnd() - 0.5) * 0.3, y + 0.04, mix(z0, z1, 0.4 + K.rnd() * 0.5)], 1 + K.rnd(), 1);
  // a trailing vine
  if (strength > 0.5) {
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8,
        a = t * Math.PI * 4;
      pts.push([Math.cos(a) * 0.32, y * 0.4 + Math.sin(a) * 0.3, mix(z1, z0 - 0.4, t)]);
    }
    bake(addMesh(parent, taper(pts, 0.025, 0.01, 30, 5), K.plain(hsl(0.3, 0.45, 0.3), { roughness: 0.7 }, 1)));
  }
}

/* ---------------------------------------------------------------- sea family */
function fish(K, body) {
  const { p } = K;
  K.u.uHead.value = 1.3;
  K.u.uLen.value = 2.8;
  K.u.uSwimA.value = 0.2;
  K.u.uSwimF.value = 2.4;
  const rx = FISH_RX,
    ry = FISH_RY;
  addMesh(
    body,
    sweepGeometry(straight(-1.45, 1.35), u => [rx(u), ry(u), (u - 0.6) * 0.06], segs(44, 22), segs(28, 14)),
    K.skinMat('scale')
  );
  K.eye(body, [0.27, 0.17, 0.93], 0.1);
  K.eye(body, [-0.27, 0.17, 0.93], 0.1);
  if (p.eyes > 2) extraEyes(K, body, [0, 0.4, 0.7], p.eyes - 2);
  // pectoral fins (rigid pivots, flapped in animate), pelvic fins baked
  for (const side of [-1, 1]) K.limbs.push(finFan(K, body, [side * 0.38, -0.08, 0.5], 0.5 + p.fin * 0.22, 0.9, side));
  for (const side of [-1, 1])
    bake(
      addMesh(
        body,
        membraneGeometry([
          [0, 0],
          [0.25, -0.1],
          [0.3, -0.35],
          [0, -0.2]
        ]),
        K.finMat(1),
        [side * 0.18, -0.38, -0.1],
        [0, side * 0.3, 0]
      )
    );
  // 骨刃 and 雷紋 grow their own dorsal blades (signature below)
  if (!(p.family === 'sea' && (p.strain === 0 || p.strain === 3)))
    crest(K, body, -0.75, 0.55, 0.42, 0.35 + p.fin * 0.22, p.horn ? p.horn * 2 + 2 : 0);
  // caudal fin by tail gene: fan, forked, ribbon, spiked
  const L = 0.7 + p.tail * 0.18,
    tails = [
      [
        [0, 0],
        [-L * 0.8, 0.55],
        [-L, 0.15],
        [-L, -0.15],
        [-L * 0.8, -0.55],
        [0, 0]
      ],
      [
        [0, 0],
        [-L, 0.75],
        [-L * 0.55, 0.05],
        [-L, -0.75],
        [0, 0]
      ],
      [
        [0, 0.05],
        [-L * 2.1, 0.5],
        [-L * 0.9, 0.0],
        [-L * 2.1, -0.5],
        [0, -0.05]
      ],
      [
        [0, 0],
        [-L * 0.9, 0.6],
        [-L * 0.6, 0.12],
        [-L * 1.1, 0],
        [-L * 0.6, -0.12],
        [-L * 0.9, -0.6],
        [0, 0]
      ]
    ];
  bake(addMesh(body, membraneGeometry(tails[p.tail]), K.finMat(1), [0, 0, -1.38], [0, -Math.PI / 2, 0]));
  if (p.tail === 3)
    for (const y of [-0.45, 0.45])
      bake(
        addMesh(
          body,
          new T.ConeGeometry(0.04, 0.4, 6),
          K.plain(K.pal.belly, {}, 1),
          [0, y, -1.38 - L * 0.7],
          [Math.PI / 2, 0, 0]
        )
      );
  // lateral light organs
  if (p.glow > 0.6)
    for (const side of [-1, 1])
      bake(
        addMesh(
          body,
          taper(
            [
              [side * 0.42, 0.04, 0.6],
              [side * 0.45, 0.02, -0.1],
              [side * 0.22, 0.02, -1]
            ],
            0.016,
            0.008,
            18,
            5
          ),
          K.glowMat(1)
        )
      );
  return {
    head: [0, 0.35, 0.95],
    back: [0, 0.5, -0.1],
    len: 2.8,
    top: 0.55,
    flora: [-0.8, 0.7, 0.5],
    mouth: { at: [0, -0.06, 1.3], w: 0.26 }
  };
}
function ray(K, body) {
  const { p } = K;
  K.u.uSwimA.value = 0.32;
  K.u.uSpan.value = 1.85;
  const rx = RAY_RX,
    ry = RAY_RY;
  addMesh(
    body,
    sweepGeometry(straight(-0.95, 1.05), u => [rx(u), ry(u), 0], segs(36, 18), segs(40, 18)),
    K.skinMat('smooth', 2)
  );
  for (const side of [-1, 1]) {
    K.eye(body, [side * 0.42, 0.2, 0.78], 0.085);
    // cephalic lobes: the "devil" horns of a manta, curled forward
    addMesh(
      body,
      taper(
        [
          [side * 0.3, 0.02, 0.95],
          [side * 0.42, 0.05, 1.35],
          [side * 0.3, -0.08, 1.55]
        ],
        0.09,
        0.03,
        12,
        7
      ),
      K.skinMat('smooth', 2)
    );
  }
  if (p.eyes > 2) extraEyes(K, body, [0, 0.27, 0.6], p.eyes - 2);
  const tailLen = 1.8 + p.tail * 0.5;
  addMesh(
    body,
    taper(
      [
        [0, 0, -0.9],
        [0, 0.05, -0.9 - tailLen * 0.5],
        [0, 0.12, -0.9 - tailLen]
      ],
      0.08,
      0.008,
      24,
      6
    ),
    K.skinMat('smooth', 2)
  );
  if (p.tail === 3)
    addMesh(
      body,
      new T.ConeGeometry(0.05, 0.35, 6),
      K.plain(K.pal.belly, {}, 2),
      [0, 0.12, -0.95 - tailLen * 0.35],
      [-Math.PI / 2, 0, 0]
    );
  if (p.horn) horns(K, body, [0, 0.2, 0.55], p.horn, 0.35, 0.9, 2);
  if (p.glow > 0.55)
    for (const side of [-1, 1])
      addMesh(
        body,
        taper(
          [
            [side * 0.3, 0.19, 0.6],
            [side * 1.0, 0.15, 0.05],
            [side * 1.55, 0.12, -0.1]
          ],
          0.016,
          0.006,
          16,
          5
        ),
        K.glowMat(2)
      );
  return { head: [0, 0.3, 0.8], back: [0, 0.25, 0], len: 2, top: 0.3, flora: [-0.6, 0.7, 0.25] };
}
function jelly(K, body) {
  const { p, pal } = K;
  K.u.uSwimA.value = 0.22;
  K.u.uSwimF.value = 2.2;
  K.u.uLen.value = 2.4;
  const bellPts = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    bellPts.push(
      new T.Vector2(
        Math.sin(t * Math.PI * 0.55) * 1.0 + (t > 0.85 ? (t - 0.85) * 0.6 : 0),
        Math.cos(t * Math.PI * 0.5) * 0.95
      )
    );
  }
  const bellMat = physical({
    color: pal.accent.clone().lerp(pal.side, 0.35),
    emissive: pal.glow,
    emissiveIntensity: 0.1 + p.glow * 0.35,
    transparent: true,
    opacity: 0.48,
    roughness: 0.15,
    clearcoat: 1,
    side: T.DoubleSide,
    depthWrite: false
  });
  const bell = addMesh(body, new T.LatheGeometry(bellPts, segs(36, 16)), bellMat, [0, 0.1, 0]);
  K.parts.bell = bell;
  // glowing inner organs, "star eyes" round the rim
  addMesh(
    body,
    new T.SphereGeometry(0.3, 16, 12),
    K.plain(pal.mark, { emissive: pal.glow, emissiveIntensity: 0.4 + p.glow * 0.8, roughness: 0.3 }),
    [0, 0.5, 0],
    null,
    [1, 0.55, 1]
  );
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    addMesh(
      body,
      new T.TorusGeometry(0.16, 0.035, 6, 16),
      K.glowMat(),
      [Math.cos(a) * 0.32, 0.42, Math.sin(a) * 0.32],
      [Math.PI / 2, 0, 0]
    );
  }
  const rim = 6 + p.eyes * 2;
  for (let i = 0; i < rim; i++) {
    const a = (i / rim) * Math.PI * 2;
    addMesh(body, new T.SphereGeometry(0.045, 8, 6), K.glowMat(), [Math.cos(a) * 1.0, 0.12, Math.sin(a) * 1.0]);
  }
  // oral arms (frilled ribbons) and fine tentacles, all swaying on the GPU
  const ribbon = K.skinMat('smooth', 3, { side: T.DoubleSide });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4,
      pts = [];
    for (let k = 0; k <= 6; k++)
      pts.push([Math.cos(a) * (0.25 + k * 0.05), -k * 0.32, Math.sin(a) * (0.25 + k * 0.05)]);
    addMesh(
      body,
      sweepGeometry(line(pts), u => [mix(0.16, 0.05, u), 0.025, 0], segs(24, 10), 6, 6),
      ribbon
    );
  }
  const tent = K.plain(pal.accent, { emissive: pal.glow, emissiveIntensity: p.glow * 0.5, roughness: 0.3 }, 3),
    n = segs(18, 10) + p.fin * 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2,
      len = 1.8 + p.tail * 0.5 + (i % 3) * 0.25;
    addMesh(
      body,
      taper(
        [
          [Math.cos(a) * 0.92, 0.05, Math.sin(a) * 0.92],
          [Math.cos(a) * 0.95, -len * 0.5, Math.sin(a) * 0.95],
          [Math.cos(a) * 0.85, -len, Math.sin(a) * 0.85]
        ],
        0.022,
        0.004,
        16,
        4
      ),
      tent
    );
  }
  return { head: [0, 0.95, 0], back: [0, 0.9, 0], len: 2, top: 1.05, flora: [-0.5, 0.5, 0.95], jelly: true };
}
function turtle(K, body) {
  const { p, pal } = K;
  K.u.uSwimA.value = 0.04;
  addMesh(
    body,
    sweepGeometry(
      straight(-1.0, 1.05),
      u => [
        curve([
          [0, 0.08],
          [0.25, 0.6],
          [0.6, 0.72],
          [0.85, 0.4],
          [1, 0.18]
        ])(u),
        curve([
          [0, 0.05],
          [0.4, 0.28],
          [0.8, 0.22],
          [1, 0.12]
        ])(u),
        0
      ],
      segs(30, 16),
      segs(26, 12)
    ),
    K.skinMat('scale', 0)
  );
  // domed shell with painted scutes
  const shellTex = canvasTex(256, 128, (ctx, w, h) => {
    ctx.fillStyle = css(pal.back);
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = css(pal.belly.clone().offsetHSL(0, -0.2, -0.1));
    ctx.lineWidth = 3;
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 8; x++) {
        const cx = (x + (y % 2) * 0.5) * (w / 8),
          cy = (y + 0.5) * (h / 3.4);
        ctx.fillStyle = css(pal.side.clone().offsetHSL(0, 0, (x + y) % 2 ? 0.04 : -0.03));
        ctx.beginPath();
        for (let k = 0; k < 6; k++)
          ctx.lineTo(cx + Math.cos((k / 6) * Math.PI * 2) * 15, cy + Math.sin((k / 6) * Math.PI * 2) * 13);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
  });
  const shellMat = physical({ map: shellTex, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  addMesh(
    body,
    new T.SphereGeometry(1, segs(40, 18), segs(20, 10), 0, Math.PI * 2, 0, Math.PI / 2),
    shellMat,
    [0, 0.12, -0.02],
    null,
    [0.92, 0.55, 1.12]
  );
  // crystal growths (晶甲)
  const crystal = K.plain(pal.glow, {
    emissive: pal.glow,
    emissiveIntensity: 0.4 + p.glow,
    roughness: 0.1,
    transparent: true,
    opacity: 0.85,
    metalness: 0.1
  });
  // 0.64: only the crystal-shelled species (晶甲) grows them, and more of them
  const crystals = p.family === 'sea' && p.strain === 0 ? 8 + p.horn * 3 : 0;
  for (let i = 0; i < crystals; i++) {
    const a = K.rnd() * Math.PI * 2,
      r = K.rnd() * 0.65,
      h = 0.25 + K.rnd() * 0.45;
    addMesh(
      body,
      new T.OctahedronGeometry(1, 0),
      crystal,
      [Math.cos(a) * r, 0.62 - r * 0.35 + h * 0.4, Math.sin(a) * r],
      [K.rnd(), K.rnd(), K.rnd()],
      [0.07, h, 0.07]
    );
  }
  // head, beak, flippers
  const head = new T.Group();
  head.position.set(0, 0.1, 1.1);
  body.add(head);
  addMesh(
    head,
    sweepGeometry(
      straight(-0.25, 0.42),
      u => [
        curve([
          [0, 0.17],
          [0.6, 0.22],
          [1, 0.05]
        ])(u),
        curve([
          [0, 0.15],
          [0.6, 0.18],
          [1, 0.06]
        ])(u),
        0
      ],
      16,
      16
    ),
    K.skinMat('scale', 0)
  );
  K.eye(head, [0.17, 0.08, 0.18], 0.06);
  K.eye(head, [-0.17, 0.08, 0.18], 0.06);
  if (p.eyes > 2) extraEyes(K, head, [0, 0.2, 0.12], p.eyes - 2);
  K.parts.head = head;
  for (const [side, z, big] of [
    [-1, 0.55, 1],
    [1, 0.55, 1],
    [-1, -0.6, 0.6],
    [1, -0.6, 0.6]
  ]) {
    const pivot = new T.Group();
    pivot.position.set(side * 0.62, 0, z);
    body.add(pivot);
    addMesh(
      pivot,
      sweepGeometry(
        line([
          [0, 0, 0],
          [side * 0.45 * big, -0.02, -0.1],
          [side * 0.95 * big, -0.03, -0.35 * big]
        ]),
        u => [mix(0.16, 0.05, u) * big, 0.04, 0],
        12,
        8
      ),
      K.skinMat('scale', 0)
    );
    pivot.userData.side = side;
    pivot.userData.front = big === 1;
    K.limbs.push(pivot);
  }
  return { head: [0, 0.35, 1.2], back: [0, 0.68, -0.1], len: 2.4, top: 0.7, flora: [-0.5, 0.5, 0.6], shell: true };
}

/* ---------------------------------------------------------------- deep family */
function serpent(K, body) {
  const { p } = K;
  K.u.uHead.value = 1.8;
  K.u.uLen.value = 5.5;
  K.u.uSwimA.value = 0.32;
  K.u.uSwimF.value = 1.5;
  const len = 5 + p.tail * 0.6;
  const r = SERPENT_R;
  addMesh(
    body,
    sweepGeometry(straight(1.9 - len, 1.9), u => [r(u), r(u) * 0.95, 0], segs(80, 36), segs(24, 12)),
    K.skinMat('scale')
  );
  // jaw and snout
  bake(
    addMesh(
      body,
      sweepGeometry(straight(1.6, 2.35), u => [mix(0.24, 0.07, u), mix(0.16, 0.05, u), -0.06], 12, 14),
      K.skinMat('scale')
    )
  );
  K.eye(body, [0.22, 0.14, 1.7], 0.07, true);
  K.eye(body, [-0.22, 0.14, 1.7], 0.07, true);
  if (p.eyes > 2) extraEyes(K, body, [0, 0.33, 1.55], p.eyes - 2);
  horns(K, body, [0, 0.22, 1.5], 1 + p.horn, 0.55, 0.9, 1);
  // barbels (whiskers)
  for (const side of [-1, 1])
    bake(
      addMesh(
        body,
        taper(
          [
            [side * 0.15, -0.02, 2.1],
            [side * 0.5, -0.2, 1.8],
            [side * 0.8, -0.35, 1.3]
          ],
          0.018,
          0.004,
          14,
          4
        ),
        K.skinMat('smooth')
      )
    );
  crest(K, body, 1.9 - len * 0.85, 1.35, 0.27, 0.22 + p.fin * 0.1, p.horn ? 8 : 0);
  for (const side of [-1, 1]) K.limbs.push(finFan(K, body, [side * 0.3, -0.05, 1.0], 0.45 + p.fin * 0.1, 0.6, side));
  if (p.glow > 0.5)
    for (const side of [-1, 1])
      bake(
        addMesh(
          body,
          taper(
            [
              [side * 0.3, 0.02, 1.4],
              [side * 0.3, 0, -1],
              [side * 0.08, 0, 1.9 - len]
            ],
            0.016,
            0.006,
            40,
            5
          ),
          K.glowMat(1)
        )
      );
  return {
    head: [0, 0.45, 1.65],
    back: [0, 0.4, 0],
    len,
    top: 0.55,
    flora: [-1.8, 1.2, 0.35],
    mouth: { at: [0, -0.1, 2.05], w: 0.26, depth: 0.5, scale: 1.3 }
  };
}
function cephalopod(K, body) {
  const { p } = K;
  K.u.uLen.value = 2.2;
  K.u.uSwimA.value = 0.25;
  K.u.uSwimF.value = 2.6;
  // mantle points backwards (−z), head and arms forward (+z)
  addMesh(
    body,
    sweepGeometry(
      straight(-1.5, 0.35),
      u => [
        curve([
          [0, 0.02],
          [0.2, 0.28],
          [0.7, 0.48],
          [1, 0.42]
        ])(u),
        curve([
          [0, 0.02],
          [0.2, 0.3],
          [0.7, 0.52],
          [1, 0.45]
        ])(u),
        0.05
      ],
      segs(30, 16),
      segs(26, 12)
    ),
    K.skinMat('smooth', 0)
  );
  for (const side of [-1, 1])
    addMesh(
      body,
      membraneGeometry([
        [0, 0],
        [0.55, 0.2],
        [0.6, -0.15],
        [0, -0.45]
      ]),
      K.finMat(0),
      [side * 0.28, 0.05, -1.05],
      [Math.PI / 2, 0, 0],
      [side, 1, 1]
    );
  addMesh(
    body,
    sweepGeometry(straight(0.25, 0.85), u => [mix(0.4, 0.3, u), mix(0.36, 0.3, u), 0], 12, 18),
    K.skinMat('smooth', 0)
  );
  const big = 0.12 + p.eyes * 0.01;
  K.eye(body, [0.36, 0.1, 0.6], big);
  K.eye(body, [-0.36, 0.1, 0.6], big);
  if (p.eyes > 2) extraEyes(K, body, [0, 0.35, 0.6], p.eyes - 2);
  // eight arms + two long feeding tentacles, swaying (mode 3 uses −y as "depth", so arms are built hanging down)
  const armGroup = new T.Group();
  armGroup.position.set(0, -0.05, 0.85);
  armGroup.rotation.x = -Math.PI / 2.4;
  body.add(armGroup);
  K.parts.arms = armGroup;
  const armMat = K.skinMat('smooth', 3);
  K.u.uLen.value = 2;
  for (let i = 0; i < 10; i++) {
    const a = (i / 8) * Math.PI * 2,
      long = i >= 8,
      L = long ? 2.6 : 1.4 + p.tail * 0.15,
      x = Math.cos(a) * 0.22,
      z = Math.sin(a) * 0.22;
    addMesh(
      armGroup,
      taper(
        [
          [x, 0, z],
          [x * 1.4, -L * 0.5, z * 1.4],
          [x * 1.1, -L, z * 1.1]
        ],
        long ? 0.04 : 0.07,
        0.008,
        18,
        6
      ),
      armMat
    );
    if (long) addMesh(armGroup, new T.SphereGeometry(0.07, 8, 6), armMat, [x * 1.1, -L, z * 1.1], null, [1, 1.8, 1]);
  }
  if (p.glow > 0.5) addMesh(body, new T.SphereGeometry(0.08, 10, 8), K.glowMat(), [0, 0.4, -0.3]);
  return { head: [0, 0.4, 0.55], back: [0, 0.5, -0.5], len: 2.4, top: 0.55, flora: [-1.2, 0.3, 0.5] };
}
function crab(K, body) {
  const { p, pal } = K;
  const shellMat = K.skinMat('scale', 0);
  const cara = new T.SphereGeometry(1, segs(36, 16), segs(24, 12));
  // knobbly ridged carapace
  const pos = cara.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i),
      bump = 1 + Math.sin(x * 9) * Math.cos(z * 7) * 0.04 + (y > 0 ? Math.sin(z * 12) * 0.02 : 0);
    pos.setXYZ(i, x * bump, y * (y > 0 ? 1 : 0.6) * bump, z * bump);
  }
  cara.computeVertexNormals();
  skinUV(cara);
  addMesh(body, cara, shellMat, [0, 0.25, 0], null, [1.05, 0.42, 0.82]);
  const spikes = 2 + p.horn * 2,
    bone = K.plain(pal.belly.clone().offsetHSL(0, -0.1, 0), { roughness: 0.45 });
  for (let i = 0; i < spikes; i++) {
    const a = (i / (spikes - 1 || 1) - 0.5) * 2.2;
    addMesh(
      body,
      new T.ConeGeometry(0.05, 0.3, 6),
      bone,
      [Math.sin(a) * 1.0, 0.3, Math.cos(a) * 0.75],
      [Math.PI / 2.2, 0, -Math.sin(a) * 1.2]
    );
  }
  // eye stalks
  for (const side of [-1, 1]) {
    addMesh(
      body,
      taper(
        [
          [side * 0.18, 0.35, 0.65],
          [side * 0.22, 0.6, 0.78]
        ],
        0.035,
        0.03,
        6,
        6
      ),
      shellMat
    );
    K.eye(body, [side * 0.22, 0.64, 0.8], 0.065, true);
  }
  if (p.eyes > 2) extraEyes(K, body, [0, 0.62, 0.7], p.eyes - 2);
  // legs (three per side, two segments) and claws
  const legMat = K.skinMat('scale', 0);
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++) {
      const pivot = new T.Group();
      pivot.position.set(side * 0.85, 0.15, 0.25 - i * 0.38);
      body.add(pivot);
      addMesh(
        pivot,
        taper(
          [
            [0, 0, 0],
            [side * 0.55, 0.25, -0.05],
            [side * 0.95, -0.35, -0.1]
          ],
          0.07,
          0.025,
          10,
          6
        ),
        legMat
      );
      pivot.userData.side = side;
      pivot.userData.leg = i;
      K.limbs.push(pivot);
    }
  for (const side of [-1, 1]) {
    const claw = new T.Group();
    claw.position.set(side * 0.6, 0.2, 0.75);
    body.add(claw);
    const s = 0.9 + p.fin * 0.18;
    addMesh(
      claw,
      taper(
        [
          [0, 0, 0],
          [side * 0.35, 0.05, 0.3],
          [side * 0.45, 0.05, 0.55]
        ],
        0.09,
        0.07,
        8,
        7
      ),
      legMat,
      null,
      null,
      s
    );
    addMesh(
      claw,
      new T.SphereGeometry(0.19, 14, 10),
      shellMat,
      [side * 0.48 * s, 0.05, 0.7 * s],
      null,
      [0.8, 0.6, 1.3]
    );
    const pincer = addMesh(
      claw,
      new T.ConeGeometry(0.07, 0.4, 8),
      shellMat,
      [side * 0.42 * s, 0.1, 0.98 * s],
      [Math.PI / 2, 0, 0]
    );
    claw.userData.pincer = pincer;
    claw.userData.claw = side;
    K.limbs.push(claw);
  }
  if (p.glow > 0.5)
    addMesh(body, new T.TorusGeometry(0.5, 0.025, 6, 32), K.glowMat(), [0, 0.42, 0], [Math.PI / 2, 0, 0], [1, 0.8, 1]);
  return { head: [0, 0.55, 0.7], back: [0, 0.65, 0], len: 2.2, top: 0.65, flora: [-0.4, 0.4, 0.62], rigid: true };
}
function nautilus(K, body) {
  const { p, pal } = K;
  // Logarithmic spiral in the YZ plane; whorls touch because the tube radius grows with the spiral radius.
  // 1.5 turns ending at angle 3π puts the aperture at the front, where the hooded head sits.
  const N = 90,
    turns = 1.5,
    growth = 0.42,
    pts = [],
    radii = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N,
      a = t * turns * Math.PI * 2,
      r = 0.1 * Math.exp(a * growth * 0.25);
    pts.push(new V(0, 0.75 + Math.sin(a) * r, -0.25 - Math.cos(a) * r));
    radii.push(r * 0.62);
  }
  const spiral = new T.CatmullRomCurve3(pts),
    radiusAt = u => radii[Math.min(N, Math.round(u * N))];
  const shellTex = canvasTex(256, 64, (ctx, w, h) => {
    ctx.fillStyle = css(pal.belly.clone().offsetHSL(0, -0.05, 0.08));
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = css(pal.mark.clone().offsetHSL(0, -0.1, -0.12));
    for (let x = 0; x < w * 0.8; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.quadraticCurveTo(x + 9, h * 0.25, x + 1, h * 0.5);
      ctx.lineTo(x + 5, h * 0.5);
      ctx.quadraticCurveTo(x + 14, h * 0.25, x + 6, 0);
      ctx.fill();
    }
  });
  const shellMat = physical({ map: shellTex, roughness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.1 });
  addMesh(
    body,
    sweepGeometry(spiral, u => [radiusAt(u), radiusAt(u) * 1.05, 0], segs(110, 50), segs(22, 12)),
    shellMat
  );
  const end = pts[N],
    endR = radii[N];
  // hood and head emerging from the aperture
  addMesh(
    body,
    skinUV(new T.SphereGeometry(endR * 1.02, 20, 14)),
    K.skinMat('smooth', 0),
    [0, end.y, end.z + 0.05],
    null,
    [1, 0.95, 0.75]
  );
  K.eye(body, [endR * 0.8, end.y + 0.08, end.z + 0.18], 0.09);
  K.eye(body, [-endR * 0.8, end.y + 0.08, end.z + 0.18], 0.09);
  if (p.eyes > 2) extraEyes(K, body, [0, end.y + endR * 0.8, end.z + 0.1], p.eyes - 2);
  const g = new T.Group();
  g.position.set(0, end.y - endR * 0.35, end.z + endR * 0.55);
  g.rotation.x = -Math.PI / 2.4;
  body.add(g);
  const tm = K.skinMat('smooth', 3);
  K.u.uLen.value = 1;
  const n = 14 + p.fin * 3;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2,
      L = 0.55 + (i % 3) * 0.15;
    addMesh(
      g,
      taper(
        [
          [Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18],
          [Math.cos(a) * 0.3, -L, Math.sin(a) * 0.3]
        ],
        0.03,
        0.008,
        10,
        4
      ),
      tm
    );
  }
  if (p.glow > 0.4)
    addMesh(
      body,
      sweepGeometry(spiral, u => [0.012, 0.012, radiusAt(u) * 0.98], segs(110, 50), 4),
      K.glowMat()
    );
  return {
    head: [0, end.y + endR, end.z],
    back: [0, 0.75 + radii[N] * 1.4, -0.25],
    len: 1.6,
    top: 1.3,
    flora: [-0.6, 0.1, 1.2],
    rigid: true
  };
}

/* ---------------------------------------------------------------- land family (feet at y = 0) */
function legs(K, body, mat, spots, upper, lower, splay = 0, thick = 0.08) {
  for (const [x, z] of spots) {
    const side = Math.sign(x),
      hip = new T.Group();
    hip.position.set(x, upper + lower, z);
    body.add(hip);
    addMesh(
      hip,
      taper(
        [
          [0, 0, 0],
          [side * splay * 0.6, -upper, 0.02],
          [side * splay, -(upper + lower) + 0.04, 0.06]
        ],
        thick,
        thick * 0.55,
        10,
        7
      ),
      mat
    );
    addMesh(
      hip,
      new T.SphereGeometry(thick * 0.9, 8, 6),
      mat,
      [side * splay, -(upper + lower) + 0.05, 0.12],
      null,
      [1, 0.5, 1.6]
    );
    hip.userData.leg = z > 0 ? (x > 0 ? 0 : 1) : x > 0 ? 1 : 0;
    hip.userData.side = side;
    K.limbs.push(hip);
  }
}
function lizard(K, body) {
  const { p } = K;
  K.u.uHead.value = 1.4;
  K.u.uLen.value = 3.4;
  K.u.uSwimA.value = 0.08;
  K.u.uSwimF.value = 2;
  const mat = K.skinMat('scale');
  const r = LIZARD_R;
  addMesh(
    body,
    sweepGeometry(straight(-2.1, 1.45), u => [r(u) * 1.15, r(u) * 0.85, 0.55], segs(56, 24), segs(22, 12)),
    mat
  );
  K.eye(body, [0.17, 0.72, 1.12], 0.065, true);
  K.eye(body, [-0.17, 0.72, 1.12], 0.065, true);
  if (p.eyes > 2) extraEyes(K, body, [0, 0.8, 1.0], p.eyes - 2);
  legs(
    K,
    body,
    K.skinMat('scale', 0),
    [
      [0.32, 0.55],
      [-0.32, 0.55],
      [0.32, -0.45],
      [-0.32, -0.45]
    ],
    0.28,
    0.27,
    0.35,
    0.075
  );
  // neck frill (fin gene) and back spines (horn gene)
  if (p.fin) {
    const fr = membraneGeometry([
      [0, 0],
      [0.35 + p.fin * 0.12, 0.4],
      [0.45 + p.fin * 0.12, -0.1],
      [0, -0.3]
    ]);
    for (const side of [-1, 1])
      bake(addMesh(body, fr, K.finMat(1), [side * 0.18, 0.62, 0.85], [0, side * 0.6, 0], [side, 1, 1]));
  }
  if (p.horn) crest(K, body, -1.2, 0.8, 0.78, 0.1 + p.horn * 0.06, 6 + p.horn * 3);
  return {
    head: [0, 0.85, 1.1],
    back: [0, 0.85, -0.1],
    len: 3.4,
    top: 0.9,
    flora: [-1, 0.7, 0.82],
    walker: true,
    mouth: { at: [0, 0.5, 1.38], w: 0.18, depth: 0.4 }
  };
}
function deer(K, body) {
  const { p, pal } = K;
  K.u.uSwimA.value = 0;
  const fur = K.skinMat('fur', 0);
  addMesh(
    body,
    sweepGeometry(
      straight(-0.75, 0.75),
      u => [
        curve([
          [0, 0.15],
          [0.25, 0.32],
          [0.7, 0.33],
          [1, 0.2]
        ])(u),
        curve([
          [0, 0.18],
          [0.3, 0.36],
          [0.7, 0.38],
          [1, 0.25]
        ])(u),
        0
      ],
      24,
      18
    ),
    fur,
    [0, 1.15, 0]
  );
  addMesh(
    body,
    taper(
      [
        [0, 1.3, 0.6],
        [0, 1.65, 0.85],
        [0, 1.85, 0.95]
      ],
      0.17,
      0.12,
      10,
      10
    ),
    fur
  );
  const head = new T.Group();
  head.position.set(0, 1.92, 1.0);
  body.add(head);
  addMesh(
    head,
    sweepGeometry(straight(-0.12, 0.42), u => [mix(0.14, 0.06, u), mix(0.15, 0.08, u), -u * 0.05], 12, 12),
    fur
  );
  K.eye(head, [0.12, 0.05, 0.08], 0.045);
  K.eye(head, [-0.12, 0.05, 0.08], 0.045);
  if (p.eyes > 2) extraEyes(K, head, [0, 0.16, 0.1], p.eyes - 2);
  for (const side of [-1, 1])
    addMesh(head, new T.ConeGeometry(0.05, 0.2, 6), fur, [side * 0.12, 0.14, -0.08], [-0.3, 0, side * 0.9]);
  // branching antlers with crystal tips (岸角; the other deer grow horns of their own, see the signatures)
  const antler = K.plain(pal.belly.clone().offsetHSL(0.05, -0.3, 0), { roughness: 0.6 }),
    tip = K.glowMat();
  for (const side of p.strain ? [] : [-1, 1]) {
    const base = [side * 0.07, 0.12, -0.02],
      top = [side * 0.35, 0.65 + p.horn * 0.08, -0.15];
    addMesh(head, taper([base, [side * 0.2, 0.4, -0.05], top], 0.03, 0.014, 10, 6), antler);
    addMesh(head, new T.OctahedronGeometry(0.05, 0), tip, top);
    for (let k = 0; k < 1 + p.horn; k++) {
      const t = 0.35 + k * 0.2,
        from = [mix(base[0], top[0], t), mix(base[1], top[1], t), mix(base[2], top[2], t)],
        to = [from[0] + side * 0.12, from[1] + 0.2, from[2] + 0.12];
      addMesh(head, taper([from, to], 0.014, 0.008, 6, 5), antler);
      addMesh(head, new T.OctahedronGeometry(0.03, 0), tip, to);
    }
  }
  K.parts.head = head;
  legs(
    K,
    body,
    fur,
    [
      [0.2, 0.55],
      [-0.2, 0.55],
      [0.2, -0.55],
      [-0.2, -0.55]
    ],
    0.5,
    0.5,
    0,
    0.06
  );
  addMesh(body, new T.ConeGeometry(0.06, 0.22, 6), fur, [0, 1.25, -0.82], [-2.2, 0, 0]);
  return { head: [0, 2.1, 1.0], back: [0, 1.5, 0], len: 1.9, top: 2.4, flora: [-0.6, 0.5, 1.5], walker: true };
}
function gull(K, body) {
  const { p, pal } = K;
  const feathers = K.skinMat('fur', 0);
  addMesh(
    body,
    sweepGeometry(
      straight(-0.7, 0.55),
      u => [
        curve([
          [0, 0.05],
          [0.35, 0.26],
          [0.8, 0.24],
          [1, 0.12]
        ])(u),
        curve([
          [0, 0.05],
          [0.35, 0.28],
          [0.8, 0.26],
          [1, 0.14]
        ])(u),
        0
      ],
      20,
      16
    ),
    feathers,
    [0, 0.75, 0],
    [-0.25, 0, 0]
  );
  const head = new T.Group();
  head.position.set(0, 1.15, 0.62);
  body.add(head);
  addMesh(head, skinUV(new T.SphereGeometry(0.17, 16, 12)), feathers);
  addMesh(
    head,
    new T.ConeGeometry(0.06, 0.32, 8),
    K.plain(hsl(0.11, 0.7, 0.55), { roughness: 0.4 }),
    [0, -0.02, 0.26],
    [Math.PI / 2, 0, 0]
  );
  K.eye(head, [0.12, 0.05, 0.07], 0.04);
  K.eye(head, [-0.12, 0.05, 0.07], 0.04);
  if (p.eyes > 2) extraEyes(K, head, [0, 0.15, 0.08], p.eyes - 2);
  K.parts.head = head;
  // feathered wings: overlapping primary feathers fanned from the wrist
  const featherMat = physical({ color: pal.belly.clone().lerp(pal.side, 0.3), roughness: 0.75, side: T.DoubleSide });
  const tipMat = physical({ color: pal.back, roughness: 0.75, side: T.DoubleSide });
  const fg = membraneGeometry([
    [0, 0],
    [0.1, 0.05],
    [0.7, 0.03],
    [0.75, -0.02],
    [0.1, -0.05]
  ]);
  for (const side of [-1, 1]) {
    const wing = new T.Group();
    wing.position.set(side * 0.2, 0.92, 0.2);
    body.add(wing);
    addMesh(
      wing,
      sweepGeometry(
        line([
          [0, 0, 0],
          [side * 0.4, 0.05, -0.1],
          [side * 0.75, 0, -0.2]
        ]),
        u => [0.08, 0.025, 0],
        10,
        6
      ),
      featherMat
    );
    const span = 0.9 + p.fin * 0.2;
    for (let k = 0; k < 7; k++) {
      const m = addMesh(
        wing,
        fg,
        k > 4 ? tipMat : featherMat,
        [side * (0.3 + k * 0.08), 0, -0.15 - k * 0.02],
        [-Math.PI / 2, 0, side > 0 ? -0.9 + k * 0.18 : Math.PI + 0.9 - k * 0.18],
        span
      );
      m.scale.y = 1.2;
    }
    wing.userData.side = side;
    wing.userData.wing = true;
    K.limbs.push(wing);
  }
  for (let k = 0; k < 5; k++)
    addMesh(body, fg, featherMat, [0, 0.72, -0.6], [-Math.PI / 2, 0, -Math.PI / 2 + (k - 2) * 0.18], 0.6);
  legs(
    K,
    body,
    K.plain(hsl(0.1, 0.6, 0.5)),
    [
      [0.1, 0.05],
      [-0.1, 0.05]
    ],
    0.3,
    0.28,
    0,
    0.03
  );
  return { head: [0, 1.35, 0.62], back: [0, 1.05, 0], len: 1.5, top: 1.4, flora: [-0.4, 0.4, 1.0], walker: true };
}
function armadillo(K, body) {
  const { p, pal } = K;
  const skin = K.skinMat('scale', 0);
  addMesh(
    body,
    sweepGeometry(
      straight(-0.8, 0.95),
      u => [
        curve([
          [0, 0.1],
          [0.3, 0.42],
          [0.7, 0.42],
          [1, 0.12]
        ])(u),
        curve([
          [0, 0.1],
          [0.3, 0.4],
          [0.7, 0.4],
          [1, 0.12]
        ])(u),
        0
      ],
      24,
      18
    ),
    skin,
    [0, 0.55, 0]
  );
  // overlapping armour bands
  const band = physical({ color: pal.back.clone().offsetHSL(0, -0.1, 0.05), roughness: 0.45, clearcoat: 0.6 });
  for (let i = 0; i < 7; i++) {
    const z = -0.6 + i * 0.2,
      r = 0.47 - Math.abs(i - 3) * 0.035;
    addMesh(body, new T.TorusGeometry(r, 0.07, 6, 24, Math.PI), band, [0, 0.55, z], [0, 0, 0], [1, 1.02, 1.6]);
  }
  addMesh(body, new T.ConeGeometry(0.16, 0.5, 10), skin, [0, 0.5, 1.15], [Math.PI / 2.2, 0, 0]);
  K.eye(body, [0.14, 0.62, 0.95], 0.04);
  K.eye(body, [-0.14, 0.62, 0.95], 0.04);
  if (p.eyes > 2) extraEyes(K, body, [0, 0.72, 0.92], p.eyes - 2);
  for (const side of [-1, 1])
    addMesh(body, new T.SphereGeometry(0.08, 8, 6), skin, [side * 0.16, 0.78, 0.85], null, [0.6, 1.3, 0.4]);
  addMesh(
    body,
    taper(
      [
        [0, 0.45, -0.8],
        [0, 0.3, -1.2],
        [0, 0.15, -1.45]
      ],
      0.09,
      0.02,
      12,
      8
    ),
    band
  );
  legs(
    K,
    body,
    skin,
    [
      [0.3, 0.45],
      [-0.3, 0.45],
      [0.3, -0.45],
      [-0.3, -0.45]
    ],
    0.14,
    0.13,
    0.05,
    0.075
  );
  // moss tufts in the band grooves
  const moss = K.plain(hsl(0.28, 0.55, 0.32), { roughness: 0.9 });
  for (let i = 0; i < (p.strain ? 0 : 14 + p.pattern * 3); i++) {
    const a = K.rnd() * Math.PI,
      z = -0.6 + K.rnd() * 1.2;
    addMesh(body, new T.IcosahedronGeometry(0.07, 0), moss, [Math.cos(a) * 0.48, 0.55 + Math.sin(a) * 0.48, z]);
  }
  return { head: [0, 0.75, 1.0], back: [0, 1.05, 0], len: 2.4, top: 1.05, flora: [-0.5, 0.5, 1.02], walker: true };
}

const BUILDERS = {
  sea: [fish, ray, jelly, turtle],
  deep: [serpent, cephalopod, crab, nautilus],
  land: [lizard, deer, gull, armadillo],
  // Plant mutants grow on a classic sea body.
  flora: [fish, ray, jelly, turtle]
};

/* ---------------------------------------------------------------- fusion: a trait borrowed from the second lineage */
function fusionTrait(K, body, info) {
  const { p } = K,
    fam = p.secondFamily,
    form = p.secondary,
    [hx, hy, hz] = info.back;
  if (!p.fusion && fam === p.family) return;
  const key = `${fam}-${form}`;
  if (['sea-1', 'land-2', 'flora-1'].includes(key)) {
    // small wings
    for (const side of [-1, 1]) {
      const w = finFan(K, body, [side * 0.2, hy, hz], 0.7, 0.55, side);
      w.rotation.z = side * 0.6;
      K.limbs.push(w);
    }
  } else if (['sea-3', 'land-3', 'flora-3'].includes(key)) {
    const plate = K.plain(K.pal.back.clone().offsetHSL(0, -0.1, 0.08), { roughness: 0.4, clearcoat: 0.7 });
    for (let i = 0; i < 4; i++)
      addMesh(
        body,
        new T.SphereGeometry(0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        plate,
        [hx, hy - 0.05, hz + 0.3 - i * 0.25],
        null,
        [1.2, 0.5, 1]
      );
  } else if (['sea-2', 'deep-1', 'flora-2'].includes(key)) {
    const tm = K.plain(K.pal.accent, { emissive: K.pal.glow, emissiveIntensity: 0.4 }, 3);
    K.u.uLen.value = Math.max(K.u.uLen.value, 1);
    for (let i = 0; i < 6; i++)
      addMesh(
        body,
        taper(
          [
            [(i - 2.5) * 0.08, 0, hz],
            [(i - 2.5) * 0.12, -1.1, hz - 0.2]
          ],
          0.02,
          0.004,
          10,
          4
        ),
        tm
      );
  } else if (['sea-0', 'deep-0', 'flora-0'].includes(key)) {
    crest(K, body, hz - 0.6, hz + 0.5, hy, 0.25, 4);
  } else if (key === 'deep-2') {
    const m = K.plain(K.pal.back, { roughness: 0.4 });
    for (const side of [-1, 1])
      addMesh(
        body,
        new T.ConeGeometry(0.08, 0.45, 8),
        m,
        [side * 0.35, info.head[1] - 0.2, info.head[2] + 0.15],
        [Math.PI / 2, 0, side * 0.4]
      );
  } else if (key === 'deep-3') {
    addMesh(
      body,
      new T.TorusGeometry(0.2, 0.08, 8, 20),
      K.plain(K.pal.belly, { clearcoat: 1 }),
      [hx, hy + 0.12, hz],
      [0, Math.PI / 2, 0]
    );
  } else if (key === 'land-0' || key === 'land-1') {
    horns(K, body, info.head, 1, 0.4, 0.8);
  }
}

/* ---------------------------------------------------------------- 0.64: species signatures */
// The four strains of a form used to share one body and differ only in colour. Now every species has a build of its
// own (PROPORTIONS) and a signature feature (SIGNATURES), so the 64 tell apart by silhouette alone. Parts on
// swimming bodies are baked with the body's swim mode so they ripple with it.
function sail(K, parent, outline, y, mat, mode = 1) {
  // a membrane standing on the midline; outline points are [z, height]
  const m = addMesh(parent, membraneGeometry(outline), mat, [0, y, 0], [0, -Math.PI / 2, 0]);
  if (mode) bake(m);
  return m;
}
function rod(parent, pts, r0, r1, mat, mode = 0, S = 10, R = 6) {
  const m = addMesh(parent, taper(pts, r0, r1, S, R), mat);
  if (mode) bake(m);
  return m;
}
function knob(parent, geo, mat, pos, rot, scale, mode = 0) {
  const m = addMesh(parent, geo, mat, pos, rot, scale);
  if (mode) bake(m);
  return m;
}
// a saw-toothed outline from z0 to z1: n teeth, tallest mid-way
function teeth(z0, z1, h, n, drop = 0.45) {
  const o = [[z0, 0]];
  for (let i = 0; i < n; i++) {
    const env = 0.45 + 0.55 * Math.sin(((i + 0.5) / n) * Math.PI);
    o.push([mix(z0, z1, (i + 0.5) / n), h * env], [mix(z0, z1, (i + 1) / n), h * env * drop]);
  }
  o.push([z1, 0]);
  return o;
}
// a ring of n petals of length len round `at`, tilted up by `tilt` (negative droops), starting r0 out from the centre
function petalRing(parent, at, n, len, tilt, mat, mode = 0, phase = 0, r0 = 0) {
  const geo = membraneGeometry([
    [0, 0],
    [0.25, 0.3],
    [0.7, 0.33],
    [1, 0],
    [0.7, -0.33],
    [0.25, -0.3]
  ]);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + phase,
      m = addMesh(parent, geo, mat, [at[0] + Math.cos(a) * r0, at[1], at[2] - Math.sin(a) * r0], null, [
        len,
        len * 0.6,
        1
      ]);
    m.rotation.set(Math.PI / 2, a, tilt, 'YZX');
    if (mode) bake(m);
  }
}
// a cone standing on `at`, leaning by `rot`
const spike = (parent, mat, at, r, h, rot = [0, 0, 0], mode = 0, sides = 6) =>
  knob(parent, new T.ConeGeometry(r, h, sides), mat, at, rot, null, mode);
const boneMat = (K, mode = 0) =>
  K.plain(K.pal.belly.clone().offsetHSL(0.04, -0.25, 0.06), { roughness: 0.5, clearcoat: 0.5 }, mode);
const crystalOf = (K, mode = 0, color = K.pal.glow) =>
  K.plain(
    color,
    { emissive: color, emissiveIntensity: 0.45 + K.p.glow, roughness: 0.08, transparent: true, opacity: 0.86 },
    mode
  );
const emberOf = (K, mode = 0) =>
  K.plain(hsl(0.05, 0.95, 0.55), { emissive: hsl(0.06, 1, 0.5), emissiveIntensity: 1.3, roughness: 0.4 }, mode);
const rockOf = (K, mode = 0) =>
  K.plain(hsl(K.pal.hue * 0.2 + 0.07, 0.12, 0.38), { roughness: 0.95, clearcoat: 0 }, mode);
const goldOf = (K, mode = 0) => K.plain(hsl(0.12, 0.75, 0.52), { metalness: 0.85, roughness: 0.28 }, mode);
// tops of the swept bodies, in body space
const fishTop = z => FISH_RY((z + 1.45) / 2.8) + ((z + 1.45) / 2.8 - 0.6) * 0.06;
const rayTop = (x, z) => {
  const u = Math.max(0, Math.min(1, (z + 0.95) / 2)),
    k = 1 - (x / RAY_RX(u)) ** 2;
  return RAY_RY(u) * Math.sqrt(Math.max(0, k));
};
const serpentTop = (z, len) => SERPENT_R(Math.max(0, Math.min(1, (z - 1.9 + len) / len))) * 0.95;
const lizardTop = z => 0.55 + LIZARD_R(Math.max(0, Math.min(1, (z + 2.1) / 3.55))) * 0.85;
const shellTop = (x, z) => 0.12 + 0.55 * Math.sqrt(Math.max(0, 1 - (x / 0.92) ** 2 - ((z + 0.02) / 1.12) ** 2));
const carapaceTop = (x, z) => 0.25 + 0.42 * Math.sqrt(Math.max(0, 1 - (x / 1.05) ** 2 - (z / 0.82) ** 2));
// the nautilus shell's spiral (see nautilus()): centre line, tube radius and outward direction at t in 0..1
function whorl(t) {
  const a = t * 3 * Math.PI,
    r = 0.1 * Math.exp(a * 0.105);
  return {
    at: [0, 0.75 + Math.sin(a) * r, -0.25 - Math.cos(a) * r],
    rad: r * 0.62,
    n: [0, Math.sin(a), -Math.cos(a)],
    a
  };
}
const along = (a, n, d) => a.map((v, i) => v + n[i] * d);

// body scale per species [x, y, z]; land feet stand at y = 0, so any scale keeps them on the ground
const PROPORTIONS = {
  'sea-0-0': [1, 1.1, 0.95],
  'sea-0-1': [0.72, 0.78, 1.22],
  'sea-0-2': [1.1, 1.15, 0.86],
  'sea-0-3': [0.9, 1, 1.08],
  'sea-1-0': [1.05, 1, 1],
  'sea-1-1': [1.28, 0.85, 0.78],
  'sea-1-2': [1, 0.62, 1.12],
  'sea-1-3': [1.12, 1, 0.95],
  'sea-2-1': [0.82, 1.35, 0.82],
  'sea-2-2': [1.32, 0.66, 1.32],
  'sea-2-3': [0.95, 1.12, 0.95],
  'sea-3-0': [1, 1.05, 1],
  'sea-3-1': [1.12, 0.88, 1.05],
  'sea-3-2': [0.9, 0.8, 1.2],
  'sea-3-3': [1, 1.22, 0.98],
  'deep-0-0': [1.12, 1.1, 0.95],
  'deep-0-1': [0.78, 0.85, 1.28],
  'deep-0-2': [1, 1, 1.05],
  'deep-0-3': [1.05, 1.05, 0.92],
  'deep-1-0': [1.05, 1, 0.88],
  'deep-1-1': [0.85, 0.9, 1.3],
  'deep-1-2': [1.22, 1.2, 0.78],
  'deep-2-0': [1.18, 0.85, 1],
  'deep-2-1': [1, 1.12, 1],
  'deep-2-2': [1.05, 1, 1],
  'deep-2-3': [0.85, 1, 0.85],
  'deep-3-0': [1.1, 1.1, 1.1],
  'deep-3-1': [1.15, 1.15, 1.15],
  'land-0-0': [1.15, 1, 0.9],
  'land-0-1': [0.82, 0.88, 1.2],
  'land-0-3': [1.1, 1.05, 0.95],
  'land-1-1': [0.95, 1.08, 0.95],
  'land-1-2': [1.15, 0.95, 1.08],
  'land-1-3': [0.9, 1.04, 1],
  'land-2-0': [0.95, 1, 1.05],
  'land-2-1': [1.15, 1, 1.05],
  'land-2-2': [1, 1.08, 1],
  'land-2-3': [1.15, 0.92, 0.92],
  'land-3-1': [1.15, 1.1, 1],
  'land-3-2': [1.05, 0.95, 1.12],
  'land-3-3': [0.95, 1, 1],
  'flora-0-1': [0.9, 1.05, 1.05],
  'flora-0-2': [1.05, 1.1, 0.9],
  'flora-0-3': [0.95, 0.95, 1.1],
  'flora-1-1': [1.15, 0.8, 1.05],
  'flora-1-3': [0.95, 1, 1.1],
  'flora-2-1': [1.2, 0.8, 1.2],
  'flora-2-2': [0.9, 1.1, 0.9],
  'flora-3-1': [1.05, 0.95, 1.05],
  'flora-3-3': [1.1, 1, 1.05]
};

const SIGNATURES = {
  /* ------------ 鰭獸 (fish) */
  // 骨刃: a serrated blade of bone down the back, a bony ram on the snout, spurred cheeks
  'sea-0-0'(K, b) {
    const bone = boneMat(K, 1),
      z0 = -1.05,
      z1 = 0.75,
      n = 7;
    sail(K, b, teeth(z0, z1, 0.95, n, 0.5), 0.36, K.finMat(1));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n,
        z = mix(z0, z1, t),
        h = 0.95 * (0.45 + 0.55 * Math.sin(t * Math.PI));
      rod(
        b,
        [
          [0, 0.36, z + 0.04],
          [0, 0.36 + h * 1.04, z]
        ],
        0.04,
        0.006,
        bone,
        1,
        6,
        5
      );
    }
    rod(
      b,
      [
        [0, 0.0, 1.22],
        [0, -0.01, 1.5],
        [0, 0.03, 1.78]
      ],
      0.075,
      0.01,
      bone,
      1
    );
    for (const side of [-1, 1])
      rod(
        b,
        [
          [side * 0.3, 0.25, 0.75],
          [side * 0.46, 0.38, 0.35]
        ],
        0.045,
        0.006,
        bone,
        1
      );
  },
  // 銀梭: a slender torpedo with a needle bill, tuna finlets and a mirror stripe down each flank
  'sea-0-1'(K, b) {
    const bone = boneMat(K, 1),
      silver = K.plain(hsl(0.55, 0.12, 0.86), { metalness: 0.9, roughness: 0.18 }, 1);
    rod(
      b,
      [
        [0, -0.03, 1.2],
        [0, -0.04, 1.8],
        [0, -0.02, 2.5]
      ],
      0.065,
      0.005,
      bone,
      1,
      14
    );
    for (let i = 0; i < 5; i++) {
      const z = -1.32 + i * 0.13;
      for (const [y, s] of [
        [fishTop(z) - 0.03, 1],
        [-fishTop(z) * 0.85 + 0.03, -1]
      ])
        sail(
          K,
          b,
          [
            [z + 0.05, 0],
            [z - 0.02, 0.13 * s],
            [z - 0.09, 0]
          ],
          y,
          K.finMat(1)
        );
    }
    for (const side of [-1, 1])
      rod(
        b,
        [
          [side * 0.4, 0.1, 0.85],
          [side * 0.47, 0.08, 0.1],
          [side * 0.3, 0.06, -0.7],
          [side * 0.08, 0.03, -1.35]
        ],
        0.03,
        0.01,
        silver,
        1,
        24,
        5
      );
  },
  // 赤鬃: a lionfish mane of long banded spines round the head, and great fan pectorals
  'sea-0-2'(K, b) {
    const banded = [K.plain(K.pal.accent, { roughness: 0.45 }, 1), K.plain(K.pal.belly, { roughness: 0.45 }, 1)];
    for (let k = 0; k < 13; k++) {
      const a = mix(-1.95, 1.95, k / 12),
        dx = Math.sin(a),
        dy = Math.cos(a),
        root = [dx * 0.3, 0.05 + dy * 0.4, 0.62],
        L = 0.75 + (1 - Math.abs(a) / 2) * 0.45;
      rod(
        b,
        [root, [root[0] + dx * L * 0.6, root[1] + dy * L * 0.6, 0.38], [root[0] + dx * L, root[1] + dy * L, 0.05]],
        0.03,
        0.005,
        banded[k % 2],
        1,
        8,
        5
      );
    }
    for (const side of [-1, 1]) K.limbs.push(finFan(K, b, [side * 0.4, -0.12, 0.42], 1.2, 1.5, side));
  },
  // 雷紋: a lightning-bolt dorsal and keel, edged in light, and a forked bolt of a horn
  'sea-0-3'(K, b) {
    const glow = K.glowMat(1),
      top = [
        [-1.15, 0],
        [-0.85, 0.55],
        [-0.75, 0.3],
        [-0.35, 0.95],
        [-0.2, 0.5],
        [0.25, 0.85],
        [0.35, 0.35],
        [0.7, 0]
      ],
      keel = [
        [-0.95, 0],
        [-0.7, -0.55],
        [-0.55, -0.25],
        [-0.2, -0.6],
        [0.1, 0]
      ];
    sail(K, b, top, 0.4, K.finMat(1));
    sail(K, b, keel, -0.3, K.finMat(1));
    for (const [line, y] of [
      [top, 0.4],
      [keel, -0.3]
    ])
      for (let i = 1; i < line.length - 1; i++)
        rod(
          b,
          [
            [0, y + line[i][1], line[i][0]],
            [0, y + line[i + 1][1], line[i + 1][0]]
          ],
          0.02,
          0.02,
          glow,
          1,
          2,
          4
        );
    const bolt = [
      [0, 0.42, 0.95],
      [0.05, 0.72, 1.02],
      [-0.06, 0.78, 1.18],
      [0.02, 1.08, 1.38]
    ];
    for (let i = 0; i < bolt.length - 1; i++)
      rod(b, [bolt[i], bolt[i + 1]], 0.05 - i * 0.012, 0.035 - i * 0.012, glow, 1, 2, 5);
  },
  /* ------------ 魔魟 (ray) */
  // 裂翼: each wing splits into a long back-swept blade
  'sea-1-0'(K, b) {
    for (const side of [-1, 1])
      knob(
        b,
        membraneGeometry([
          [0.55, -0.25],
          [1.55, 0.05],
          [2.4, -1.3],
          [1.5, -0.6],
          [0.6, -0.72]
        ]),
        K.finMat(2),
        [0, 0.02, 0],
        [Math.PI / 2, 0, 0],
        [side, 1, 1],
        2
      );
  },
  // 月影: a crescent, its horns swept far forward, a pale moon on its back
  'sea-1-1'(K, b) {
    const skin = K.skinMat('smooth', 2);
    for (const side of [-1, 1])
      rod(
        b,
        [
          [side * 0.35, 0, 0.92],
          [side * 0.9, 0.04, 1.5],
          [side * 1.25, 0.08, 1.75],
          [side * 1.48, 0.1, 1.5]
        ],
        0.12,
        0.012,
        skin,
        2,
        16,
        8
      );
    knob(
      b,
      new T.CylinderGeometry(0.34, 0.34, 0.04, 32),
      K.glowMat(2),
      [0, rayTop(0, 0) + 0.005, -0.05],
      null,
      null,
      2
    );
    knob(
      b,
      new T.TorusGeometry(0.4, 0.025, 6, 40),
      K.plain(K.pal.belly, {}, 2),
      [0, rayTop(0, 0), -0.05],
      [Math.PI / 2, 0, 0],
      null,
      2
    );
  },
  // 砂紋: a flat bottom-dweller studded with thorny tubercles, a trio of barbs on the tail
  'sea-1-2'(K, b) {
    const bone = boneMat(K, 2);
    for (let i = 0; i < 9; i++) {
      const z = mix(-0.75, 0.85, i / 8);
      spike(b, bone, [0, rayTop(0, z) + 0.08, z], 0.06, 0.24, [0, 0, 0], 2, 5);
      for (const side of [-1, 1])
        if (i % 2 === 0) {
          const x = side * 0.55;
          spike(b, bone, [x, rayTop(x, z) + 0.05, z], 0.04, 0.16, [0, 0, -side * 0.3], 2, 5);
        }
    }
    for (const x of [-0.07, 0, 0.07]) spike(b, bone, [x, 0.07, -1.25], 0.035, 0.3, [-Math.PI / 2.3, 0, x * 3], 2, 5);
  },
  // 焰緣: tongues of flame lick all along the wing edges
  'sea-1-3'(K, b) {
    const flame = K.plain(
        hsl(0.06, 0.95, 0.55),
        { emissive: hsl(0.07, 1, 0.5), emissiveIntensity: 1, side: T.DoubleSide, transparent: true, opacity: 0.9 },
        2
      ),
      tongue = membraneGeometry([
        [0, 0.09],
        [0.2, 0.15],
        [0.32, 0.05],
        [0.55, 0.1],
        [0.44, -0.02],
        [0.62, -0.06],
        [0.22, -0.1],
        [0, -0.09]
      ]);
    for (const side of [-1, 1])
      for (let k = 0; k < 8; k++) {
        const u = 0.2 + k * 0.09,
          z = -0.95 + 2 * u,
          x = RAY_RX(u) * 0.95,
          size = 0.7 + Math.sin(((u - 0.2) / 0.65) * Math.PI) * 0.6;
        knob(b, tongue, flame, [side * x, 0, z], [Math.PI / 2, 0, side * -0.35], [side * size, size, 1], 2);
      }
  },
  /* ------------ 觸母 (jelly) */
  // 星眸: a star of long glowing rays round the rim, one great eye on the crown
  'sea-2-0'(K, b) {
    const glow = K.glowMat();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      spike(b, glow, [Math.cos(a) * 1.3, 0.18, -Math.sin(a) * 1.3], 0.09, 0.75, [0, a, -Math.PI / 2], 0, 4);
    }
    const star = [];
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2,
        r = k % 2 ? 0.16 : 0.42;
      star.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    knob(
      b,
      membraneGeometry(star),
      K.plain(K.pal.glow, { emissive: K.pal.glow, emissiveIntensity: 0.8, side: T.DoubleSide }),
      [0, 1.0, 0],
      [-Math.PI / 2, 0, 0]
    );
    K.eye(b, [0, 1.04, 0.05], 0.15);
  },
  // 霧鈴: a tall bell with a glowing clapper and veils of mist trailing below
  'sea-2-1'(K, b) {
    const mist = K.plain(
      K.pal.accent.clone().lerp(new T.Color(0xffffff), 0.5),
      {
        transparent: true,
        opacity: 0.32,
        side: T.DoubleSide,
        depthWrite: false,
        emissive: K.pal.glow,
        emissiveIntensity: 0.15
      },
      3
    );
    rod(
      b,
      [
        [0, 0.45, 0],
        [0, -0.4, 0],
        [0, -0.95, 0]
      ],
      0.03,
      0.02,
      K.plain(K.pal.belly, {}, 3),
      3
    );
    knob(b, new T.SphereGeometry(0.16, 16, 12), K.glowMat(3), [0, -1.05, 0], null, [1, 1.25, 1], 3);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.25,
        pts = [];
      for (let i = 0; i <= 6; i++)
        pts.push([Math.cos(a) * (0.82 - i * 0.04), 0.1 - i * 0.32, Math.sin(a) * (0.82 - i * 0.04)]);
      addMesh(
        b,
        sweepGeometry(line(pts), u => [mix(0.06, 0.3, u), 0.012, 0], segs(20, 10), 6),
        mist
      );
    }
  },
  // 琉璃: a wide glass saucer ringed with crystal facets and a flared skirt
  'sea-2-2'(K, b) {
    const crystal = crystalOf(K);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      knob(
        b,
        new T.OctahedronGeometry(1, 0),
        crystal,
        [Math.cos(a) * 1.02, 0.28, Math.sin(a) * 1.02],
        [0, -a, -0.5],
        [0.08, 0.24, 0.08]
      );
    }
    const skirt = [];
    for (let i = 0; i <= 5; i++) skirt.push(new T.Vector2(1.0 + i * 0.07, 0.14 - i * 0.05 - i * i * 0.006));
    addMesh(
      b,
      new T.LatheGeometry(skirt, segs(40, 20)),
      K.plain(K.pal.accent, {
        transparent: true,
        opacity: 0.5,
        side: T.DoubleSide,
        depthWrite: false,
        roughness: 0.1,
        clearcoat: 1
      })
    );
    knob(b, new T.IcosahedronGeometry(0.2, 0), crystal, [0, 1.05, 0]);
  },
  // 夜燈: a lantern bell, ribbed with light, a lure dangling from its crown
  'sea-2-3'(K, b) {
    const glow = K.glowMat(),
      stalk = K.plain(K.pal.side, { roughness: 0.5 });
    rod(
      b,
      [
        [0, 1.0, 0],
        [0, 1.5, 0.15],
        [0, 1.72, 0.5],
        [0, 1.6, 0.75]
      ],
      0.04,
      0.015,
      stalk,
      0,
      14
    );
    knob(b, new T.SphereGeometry(0.14, 16, 12), glow, [0, 1.52, 0.78]);
    knob(b, new T.CylinderGeometry(0.12, 0.18, 0.12, 12), stalk, [0, 1.03, 0]);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2,
        pts = [];
      for (let i = 0; i <= 6; i++) {
        const t = 0.08 + (i / 6) * 0.9,
          r = Math.sin(t * Math.PI * 0.55) * 1.015 + (t > 0.85 ? (t - 0.85) * 0.6 : 0);
        pts.push([Math.cos(a) * r, Math.cos(t * Math.PI * 0.5) * 0.95 + 0.1, Math.sin(a) * r]);
      }
      rod(b, pts, 0.022, 0.022, glow, 0, 14, 4);
    }
  },
  /* ------------ 靈龜 (turtle) — 晶甲's crystals grow in turtle() */
  // 苔背: a carpet of moss on the shell, weed trailing from its rim
  'sea-3-1'(K, b) {
    const moss = K.plain(hsl(0.27, 0.5, 0.3), { roughness: 0.95, clearcoat: 0 }),
      weed = K.plain(hsl(0.24, 0.55, 0.26), { roughness: 0.8 });
    for (let i = 0; i < 30; i++) {
      const a = K.rnd() * Math.PI * 2,
        r = Math.sqrt(K.rnd()) * 0.85,
        x = Math.cos(a) * r * 0.92,
        z = Math.sin(a) * r * 1.1;
      knob(b, new T.IcosahedronGeometry(0.08 + K.rnd() * 0.08, 0), moss, [x, shellTop(x, z), z], null, [1, 0.6, 1]);
    }
    for (let k = 0; k < 11; k++) {
      const a = Math.PI * (0.05 + (k / 10) * 0.9) + Math.PI,
        x = Math.cos(a) * 0.9,
        z = Math.sin(a) * 1.08,
        L = 0.45 + K.rnd() * 0.35;
      rod(
        b,
        [
          [x, 0.15, z],
          [x * 1.05, 0.15 - L * 0.5, z * 1.05 - 0.08],
          [x, 0.15 - L, z * 1.02 - 0.1]
        ],
        0.025,
        0.006,
        weed,
        0,
        8,
        4
      );
    }
  },
  // 潮紋: a streamlined swimmer with long wing-like fore flippers and wave keels on its shell
  'sea-3-2'(K, b) {
    for (const l of K.limbs) if (l.userData.front) l.scale.set(1.7, 1, 1.45);
    const keel = K.plain(K.pal.accent, { roughness: 0.35, clearcoat: 0.8 });
    for (const x of [-0.38, 0, 0.38]) {
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const z = mix(-0.95, 0.95, i / 8);
        pts.push([x + Math.sin(i * 1.2) * 0.04, shellTop(x, z) + 0.015, z]);
      }
      rod(b, pts, 0.045, 0.03, keel, 0, 24, 5);
    }
  },
  // 金棱: a high dome studded with gilded pyramid scutes and a gold rim
  'sea-3-3'(K, b) {
    const gold = goldOf(K);
    for (const x of [-0.42, 0, 0.42])
      for (const z of [-0.62, -0.2, 0.22, 0.62]) {
        const y = shellTop(x, z);
        if (y < 0.25) continue;
        spike(b, gold, [x, y + 0.08, z], 0.13, 0.3, [z * 0.35, 0, -x * 0.7], 0, 4);
      }
    knob(b, new T.TorusGeometry(1, 0.04, 6, 48), gold, [0, 0.13, -0.02], [Math.PI / 2, 0, 0], [0.93, 1.13, 1]);
  },
  /* ------------ 海龍 (serpent) */
  // 淵鱗: armoured in keeled diamond scutes from crown to tail
  'deep-0-0'(K, b, info) {
    const plate = K.plain(
        K.pal.accent.clone().offsetHSL(0, -0.1, -0.12),
        { roughness: 0.3, clearcoat: 0.9, metalness: 0.35 },
        1
      ),
      z0 = 1.9 - info.len * 0.85;
    for (let i = 0; i < 16; i++) {
      const z = mix(1.4, z0, i / 15),
        s = 1 - i / 22,
        y = serpentTop(z, info.len);
      knob(b, new T.OctahedronGeometry(1, 0), plate, [0, y + 0.08, z], [-0.7, 0, 0], [0.09 * s, 0.3 * s, 0.34 * s], 1);
      for (const side of [-1, 1])
        if (i % 2 === 0)
          knob(
            b,
            new T.OctahedronGeometry(1, 0),
            plate,
            [side * y * 0.8, y * 0.45, z],
            [-0.6, 0, side * 1.0],
            [0.06 * s, 0.2 * s, 0.26 * s],
            1
          );
    }
  },
  // 黑潮: a long black eel, ribbon fins above and below, a paddle of a tail
  'deep-0-1'(K, b, info) {
    const tail = 1.9 - info.len;
    sail(
      K,
      b,
      [
        [tail + 0.4, 0],
        [tail + 1.2, -0.28],
        [0.4, -0.22],
        [1.0, 0]
      ],
      -serpentTop(0, info.len) * 0.6,
      K.finMat(1)
    );
    sail(
      K,
      b,
      [
        [tail + 0.7, 0],
        [tail - 0.25, 0.6],
        [tail - 0.55, 0.05],
        [tail - 0.55, -0.05],
        [tail - 0.25, -0.6],
        [tail + 0.7, 0]
      ],
      0,
      K.finMat(1)
    );
  },
  // 冥火: flames of ghost-light run down its spine, wisps stream from the tail
  'deep-0-2'(K, b, info) {
    const fire = K.plain(
        K.pal.glow,
        { emissive: K.pal.glow, emissiveIntensity: 1.4, transparent: true, opacity: 0.9 },
        1
      ),
      z0 = 1.9 - info.len;
    for (let i = 0; i < 11; i++) {
      const z = mix(1.25, z0 + 0.8, i / 10),
        y = serpentTop(z, info.len),
        h = 0.32 + Math.sin((i / 10) * Math.PI) * 0.28;
      rod(
        b,
        [
          [0, y - 0.04, z],
          [0.04, y + h * 0.5, z - 0.12],
          [-0.03, y + h, z - 0.3]
        ],
        0.07,
        0.004,
        fire,
        1,
        8,
        5
      );
    }
    for (const side of [-1, 0, 1])
      rod(
        b,
        [
          [0, 0, z0 + 0.15],
          [side * 0.15, 0.1, z0 - 0.35],
          [side * 0.3, 0.2, z0 - 0.8]
        ],
        0.05,
        0.004,
        fire,
        1,
        10,
        5
      );
  },
  // 骨冠: a great frill of bone-ribbed membrane flares behind the skull, horns swept back
  'deep-0-3'(K, b) {
    const bone = boneMat(K, 1),
      frill = [[0, -0.15]];
    for (let k = 0; k <= 10; k++) {
      const a = mix(-2.0, 2.0, k / 10),
        r = k % 2 ? 0.62 : 0.95;
      frill.push([Math.sin(a) * r, Math.cos(a) * r]);
    }
    knob(b, membraneGeometry(frill), K.finMat(1), [0, 0.18, 1.3], [-0.35, 0, 0], null, 1);
    for (let k = 0; k <= 10; k += 2) {
      const a = mix(-2.0, 2.0, k / 10),
        tip = [Math.sin(a) * 1.0, 0.18 + Math.cos(a) * 0.94, 1.3 - Math.cos(a) * 0.34];
      rod(b, [[0, 0.18, 1.32], tip], 0.04, 0.008, bone, 1, 6, 5);
    }
    horns(K, b, [0, 0.3, 1.5], 1, 0.95, 1.3, 1);
  },
  /* ------------ 觸獸 (cephalopod) */
  // 千腕: a writhing ring of a thousand arms
  'deep-1-0'(K, b) {
    const arms = K.parts.arms,
      mat = K.skinMat('smooth', 3);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + 0.17,
        r = 0.3 + (i % 2) * 0.06,
        L = 1.0 + ((i * 7) % 5) * 0.22,
        x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      addMesh(
        arms,
        taper(
          [
            [x, 0, z],
            [x * 1.5, -L * 0.5, z * 1.5],
            [x * 1.25, -L, z * 1.25]
          ],
          0.04,
          0.005,
          14,
          5
        ),
        mat
      );
    }
  },
  // 寒淵: a long icy mantle bristling with frost shards, an arrowhead of fins at its tip
  'deep-1-1'(K, b) {
    const ice = crystalOf(K, 0, hsl(0.54, 0.45, 0.82)),
      fin = K.plain(hsl(0.55, 0.4, 0.75), {
        transparent: true,
        opacity: 0.7,
        side: T.DoubleSide,
        roughness: 0.2,
        clearcoat: 1
      });
    for (const side of [-1, 1])
      knob(
        b,
        membraneGeometry([
          [0, 0.35],
          [0.85, -0.15],
          [0.12, -0.6],
          [0, -0.5]
        ]),
        fin,
        [side * 0.1, 0.05, -1.15],
        [Math.PI / 2, 0, 0],
        [side, 1, 1]
      );
    for (let i = 0; i < 9; i++) {
      const z = mix(-1.2, 0.15, i / 8),
        u = (z + 1.5) / 1.85,
        y = 0.05 + Math.min(0.52, 0.02 + u * 0.7) * 0.92;
      knob(
        b,
        new T.OctahedronGeometry(1, 0),
        ice,
        [0, y + 0.08, z],
        [-0.5, 0, 0],
        [0.05, 0.22 - Math.abs(i - 4) * 0.02, 0.05]
      );
      for (const side of [-1, 1])
        if (i % 2)
          knob(
            b,
            new T.OctahedronGeometry(1, 0),
            ice,
            [side * y * 0.75, y * 0.6, z],
            [-0.4, 0, side * 0.9],
            [0.04, 0.15, 0.04]
          );
    }
  },
  // 墨霧: a bulbous mantle, its arms webbed into a cloak, ink clouds trailing behind
  'deep-1-2'(K, b) {
    const web = K.plain(
        K.pal.back.clone().offsetHSL(0, 0, -0.08),
        { transparent: true, opacity: 0.75, side: T.DoubleSide, roughness: 0.5 },
        3
      ),
      ink = K.plain(hsl(K.pal.hue, 0.3, 0.08), { transparent: true, opacity: 0.38, depthWrite: false, roughness: 1 });
    knob(
      K.parts.arms,
      new T.CylinderGeometry(0.24, 0.62, 1.05, segs(24, 12), 1, true),
      web,
      [0, -0.52, 0],
      null,
      null,
      3
    );
    for (let i = 0; i < 6; i++)
      knob(b, new T.IcosahedronGeometry(0.18 + i * 0.05, 1), ink, [
        Math.sin(i * 2.1) * 0.2,
        0.05 + Math.cos(i * 1.7) * 0.12,
        -1.65 - i * 0.28
      ]);
  },
  // 虹腕: arms ringed in rainbow light, a frilled fin the length of its mantle
  'deep-1-3'(K, b) {
    const L = 1.4 + K.p.tail * 0.15;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2,
        x = Math.cos(a) * 0.22,
        z = Math.sin(a) * 0.22,
        ring = K.plain(hsl(i / 8, 0.85, 0.6), { emissive: hsl(i / 8, 0.9, 0.5), emissiveIntensity: 0.9 }, 3);
      for (const t of [0.3, 0.55, 0.8]) {
        const s = t < 0.5 ? mix(1, 1.4, t * 2) : mix(1.4, 1.1, (t - 0.5) * 2);
        knob(
          K.parts.arms,
          new T.TorusGeometry(0.075 - t * 0.04, 0.016, 5, 14),
          ring,
          [x * s, -L * t, z * s],
          [Math.PI / 2, 0, 0],
          null,
          3
        );
      }
    }
    const frill = [[0, -1.42]];
    for (let k = 0; k <= 8; k++) frill.push([0.22 + (k % 2) * 0.12, mix(-1.3, 0.1, k / 8)]);
    frill.push([0, 0.25]);
    for (const side of [-1, 1])
      knob(b, membraneGeometry(frill), K.finMat(0), [side * 0.4, 0.05, 0], [Math.PI / 2, 0, 0], [side, 1, 1]);
  },
  /* ------------ 蟹獸 (crab) */
  // 潮鎧: a broad tiered shield with an armoured skirt of plates
  'deep-2-0'(K, b) {
    const plate = K.plain(K.pal.back.clone().offsetHSL(0, -0.08, 0.06), { roughness: 0.35, clearcoat: 0.8 });
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      if (Math.sin(a) > 0.75) continue; // the face stays clear
      knob(
        b,
        new T.SphereGeometry(0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        plate,
        [Math.cos(a) * 1.0, 0.2, Math.sin(a) * 0.78],
        [0, -a + Math.PI / 2, -0.25],
        [1, 0.4, 0.75]
      );
    }
    for (const [y, s] of [
      [0.6, [0.72, 0.12, 0.56]],
      [0.68, [0.42, 0.1, 0.32]]
    ])
      knob(b, new T.SphereGeometry(1, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), plate, [0, y, -0.02], null, s);
  },
  // 熔殼: a shell split by glowing seams of lava, smoking vents on its back
  'deep-2-1'(K, b) {
    const lava = emberOf(K),
      vent = K.plain(hsl(0.05, 0.15, 0.18), { roughness: 0.9 });
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + 0.3,
        pts = [];
      for (let i = 0; i <= 4; i++) {
        const r = 0.12 + i * 0.2,
          w = a + (i % 2 ? 0.18 : -0.12),
          x = Math.cos(w) * r,
          z = Math.sin(w) * r * 0.78;
        pts.push([x, carapaceTop(x, z) + 0.012, z]);
      }
      rod(b, pts, 0.03, 0.012, lava, 0, 12, 4);
    }
    for (const [x, z] of [
      [-0.3, -0.2],
      [0.25, -0.3],
      [0.02, 0.15]
    ]) {
      const y = carapaceTop(x, z);
      knob(b, new T.CylinderGeometry(0.07, 0.12, 0.2, 10), vent, [x, y + 0.07, z]);
      knob(b, new T.CircleGeometry(0.065, 12), lava, [x, y + 0.175, z], [-Math.PI / 2, 0, 0]);
    }
  },
  // 棘王: a crown of tall spikes and one great king-claw
  'deep-2-2'(K, b) {
    const bone = boneMat(K);
    for (let k = 0; k < 7; k++) {
      const a = mix(-1.2, 1.2, k / 6),
        x = Math.sin(a) * 0.55,
        z = Math.cos(a) * 0.35 - 0.1,
        h = 0.75 - Math.abs(a) * 0.25;
      spike(b, bone, [x, carapaceTop(x, z) + h / 2 - 0.04, z], 0.06, h, [-0.15, 0, -x * 0.5], 0, 6);
    }
    for (const l of K.limbs) if (l.userData.claw === 1) l.scale.setScalar(1.75);
  },
  // 幽光: a spider crab on long stilt legs, glowing whips of antennae
  'deep-2-3'(K, b) {
    for (const l of K.limbs) if (l.userData.leg !== undefined) l.scale.set(1.6, 1.5, 1.6);
    const stalk = K.plain(K.pal.belly, { roughness: 0.4 }),
      glow = K.glowMat();
    for (const side of [-1, 1]) {
      const tip = [side * 0.75, 1.35, 1.55];
      rod(b, [[side * 0.1, 0.45, 0.75], [side * 0.35, 0.98, 1.3], tip], 0.022, 0.006, stalk, 0, 14, 5);
      knob(b, new T.SphereGeometry(0.06, 10, 8), glow, tip);
    }
  },
  /* ------------ 螺獸 (nautilus) */
  // 渦殼: a keel spiralling round the shell and a flared, ringed mouth
  'deep-3-0'(K, b) {
    const keel = K.plain(K.pal.mark, { roughness: 0.3, clearcoat: 0.8 }),
      pts = [];
    for (let i = 0; i <= 40; i++) {
      const w = whorl(0.15 + (i / 40) * 0.85);
      pts.push(along(w.at, w.n, w.rad * 0.98));
    }
    rod(b, pts, 0.02, 0.04, keel, 0, 80, 5);
    const end = whorl(1);
    knob(b, new T.TorusGeometry(end.rad * 1.05, 0.035, 8, 28), keel, along(end.at, [0, 0, 1], 0.02));
  },
  // 沉鐘: its mouth flares into a great bronze bell
  'deep-3-1'(K, b) {
    const end = whorl(1),
      bronze = K.plain(hsl(0.1, 0.6, 0.55), { metalness: 0.8, roughness: 0.25, side: T.DoubleSide }),
      bell = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      bell.push(new T.Vector2(end.rad * 1.02 + Math.sin(t * Math.PI * 0.5) * 0.08 + t ** 4 * 0.32, t * 0.6));
    }
    knob(b, new T.LatheGeometry(bell, segs(32, 16)), bronze, along(end.at, [0, 0, 1], -0.12), [Math.PI / 2, 0, 0]);
    knob(b, new T.TorusGeometry(end.rad * 1.02 + 0.42, 0.03, 6, 36), bronze, along(end.at, [0, 0, 1], 0.48));
    for (const t of [0.25, 0.45])
      knob(
        b,
        new T.TorusGeometry(end.rad * 1.02 + 0.08 + t ** 4 * 0.32, 0.018, 5, 32),
        K.glowMat(),
        along(end.at, [0, 0, 1], -0.12 + t * 0.6)
      );
  },
  // 稜晶: crystal prisms jut from every whorl
  'deep-3-2'(K, b) {
    const crystal = crystalOf(K);
    for (let i = 0; i < 9; i++) {
      const w = whorl(0.3 + (i / 8) * 0.65),
        len = 0.16 + (i / 8) * 0.22,
        th = w.a - Math.PI / 2;
      knob(b, new T.CylinderGeometry(0.0, 0.05, len, 6), crystal, along(w.at, w.n, w.rad + len * 0.4), [th, 0, 0]);
      for (const side of [-1, 1])
        if (i % 3 === 1)
          knob(
            b,
            new T.CylinderGeometry(0.0, 0.035, len * 0.6, 6),
            crystal,
            [side * w.rad * 0.8, ...along(w.at, w.n, w.rad * 0.5).slice(1)],
            [th, 0, side * -0.7]
          );
    }
  },
  // 深歌: organ pipes rise from its shell, rings of song hang round it
  'deep-3-3'(K, b) {
    const pipe = K.plain(K.pal.belly.clone().offsetHSL(0, -0.1, 0.1), { roughness: 0.3, clearcoat: 0.9 }),
      glow = K.glowMat();
    for (const [x, z, h] of [
      [-0.11, -0.38, 0.42],
      [0, -0.3, 0.62],
      [0.11, -0.38, 0.5]
    ]) {
      knob(b, new T.CylinderGeometry(0.05, 0.065, h, 12, 1, true), pipe, [x, 1.0 + h / 2, z]);
      knob(b, new T.TorusGeometry(0.055, 0.015, 6, 14), glow, [x, 1.0 + h, z], [Math.PI / 2, 0, 0]);
    }
    const halo = K.plain(K.pal.glow, {
      emissive: K.pal.glow,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    for (const [r, y] of [
      [0.3, 1.38],
      [0.44, 1.56]
    ])
      knob(b, new T.TorusGeometry(r, 0.014, 4, 40), halo, [0, y, -0.33], [Math.PI / 2 - 0.25, 0, 0]);
  },
  /* ------------ 蜥獸 (lizard) */
  // 礁岩: crusted with reef rock and barnacles
  'land-0-0'(K, b) {
    const rock = rockOf(K, 1),
      barnacle = K.plain(hsl(0.1, 0.12, 0.78), { roughness: 0.8 }, 1);
    for (let i = 0; i < 14; i++) {
      const z = mix(-1.3, 0.85, i / 13),
        y = lizardTop(z),
        side = i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : -1,
        x = side * (y - 0.55) * 0.9;
      knob(
        b,
        new T.DodecahedronGeometry(0.1 + (i % 4) * 0.025, 0),
        rock,
        [x, y - Math.abs(side) * 0.08, z],
        [i, i * 2, 0],
        null,
        1
      );
      if (i % 2) spike(b, barnacle, [x * 0.6 + 0.05, y + 0.06, z + 0.08], 0.05, 0.08, [0, 0, 0], 1, 7);
    }
  },
  // 沙丘: a lean dune-runner raising a tall ribbed sail
  'land-0-1'(K, b) {
    const bone = boneMat(K, 1),
      outline = [
        [-0.95, 0],
        [-0.7, 0.62],
        [-0.25, 0.95],
        [0.2, 0.82],
        [0.55, 0.3],
        [0.65, 0]
      ];
    sail(K, b, outline, 0.72, K.finMat(1));
    for (let i = 1; i < 9; i++) {
      const z = mix(-0.92, 0.6, i / 9),
        h = 0.95 * Math.sin((i / 9) * Math.PI) * (z < -0.25 ? 1 : 0.9);
      rod(
        b,
        [
          [0, 0.72, z],
          [0, 0.72 + h, z - 0.05]
        ],
        0.022,
        0.006,
        bone,
        1,
        5,
        4
      );
    }
  },
  // 赤斑: a great umbrella frill round the neck, ribbed and spotted
  'land-0-2'(K, b) {
    const bone = boneMat(K, 1),
      frill = [];
    for (let k = 0; k <= 16; k++) {
      const a = (k / 16) * Math.PI * 2,
        r = k % 2 ? 0.5 : 0.62;
      frill.push([Math.sin(a) * r, Math.cos(a) * r * 0.85]);
    }
    knob(b, membraneGeometry(frill), K.finMat(1), [0, 0.78, 0.82], [-0.25, 0, 0], null, 1);
    for (let k = 0; k < 16; k += 2) {
      const a = (k / 16) * Math.PI * 2;
      rod(
        b,
        [
          [0, 0.78, 0.84],
          [Math.sin(a) * 0.6, 0.78 + Math.cos(a) * 0.51, 0.84 - Math.cos(a) * 0.13]
        ],
        0.02,
        0.008,
        bone,
        1,
        4,
        4
      );
    }
  },
  // 雷鱗: a horned face and rows of spikes down its flanks
  'land-0-3'(K, b) {
    const bone = boneMat(K, 1);
    rod(
      b,
      [
        [0, 0.72, 1.3],
        [0, 0.92, 1.42],
        [0, 1.15, 1.45]
      ],
      0.07,
      0.008,
      bone,
      1
    );
    for (const side of [-1, 1]) {
      rod(
        b,
        [
          [side * 0.12, 0.85, 1.0],
          [side * 0.28, 1.05, 0.85],
          [side * 0.36, 1.2, 0.6]
        ],
        0.05,
        0.006,
        bone,
        1
      );
      for (let i = 0; i < 7; i++) {
        const z = mix(-1.0, 0.6, i / 6),
          y = lizardTop(z),
          r = (y - 0.55) / 0.85;
        spike(b, bone, [side * r * 1.15, 0.55 + r * 0.2, z], 0.04, 0.22, [0, 0, -side * 1.2], 1, 5);
      }
    }
  },
  /* ------------ 靈鹿 (deer) — 岸角's branching antlers grow in deer() */
  // 霜角: twisted spiral horns tipped with ice, a frosted mane down the neck
  'land-1-1'(K, b) {
    const head = K.parts.head,
      horn = K.plain(hsl(0.58, 0.15, 0.85), { roughness: 0.35, clearcoat: 0.8 }),
      ice = crystalOf(K, 0, hsl(0.54, 0.5, 0.85));
    for (const side of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10,
          a = t * Math.PI * 3;
        pts.push([
          side * (0.08 + t * 0.12 + Math.cos(a) * 0.04 * t),
          0.12 + t * 0.85,
          -0.02 - t * 0.3 + Math.sin(a) * 0.04 * t
        ]);
      }
      rod(head, pts, 0.04, 0.008, horn, 0, 30, 6);
      knob(head, new T.OctahedronGeometry(0.06, 0), ice, pts[10], null, [1, 1.8, 1]);
    }
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      spike(b, ice, [0, mix(1.82, 1.32, t) + 0.1, mix(0.9, 0.55, t) - 0.08], 0.05, 0.25, [-0.9, 0, 0], 0, 4);
    }
  },
  // 林影: broad palmate antlers like a forest stag's, a shaggy beard
  'land-1-2'(K, b) {
    const head = K.parts.head,
      antler = K.plain(K.pal.belly.clone().offsetHSL(0.05, -0.35, -0.05), { roughness: 0.65, side: T.DoubleSide }),
      palm = membraneGeometry([
        [0, 0],
        [0.12, 0.06],
        [0.18, 0.3],
        [0.25, 0.15],
        [0.33, 0.38],
        [0.4, 0.18],
        [0.5, 0.36],
        [0.55, 0.14],
        [0.66, 0.24],
        [0.6, 0.02],
        [0.4, -0.08],
        [0.12, -0.06]
      ]);
    for (const side of [-1, 1]) {
      rod(
        head,
        [
          [side * 0.07, 0.12, -0.02],
          [side * 0.2, 0.22, -0.06]
        ],
        0.035,
        0.03,
        antler,
        0,
        4,
        6
      );
      knob(head, palm, antler, [side * 0.18, 0.2, -0.06], [-0.2, side * 0.3, side * 0.5], [side * 1.25, 1.25, 1]);
    }
    const fur = K.skinMat('fur', 0);
    knob(head, new T.ConeGeometry(0.07, 0.3, 6), fur, [0, -0.2, 0.12], [Math.PI, 0, 0]);
  },
  // 晶角: one spiral crystal horn on the brow, crystals along the back
  'land-1-3'(K, b) {
    const head = K.parts.head,
      crystal = crystalOf(K);
    knob(head, new T.ConeGeometry(0.06, 0.8, 6), crystal, [0, 0.42, 0.18], [0.55, 0, 0]);
    for (let i = 0; i < 6; i++) {
      const z = mix(0.55, -0.6, i / 5);
      knob(
        b,
        new T.OctahedronGeometry(1, 0),
        crystal,
        [Math.sin(i * 2.3) * 0.06, 1.5 + 0.06, z],
        [i * 0.4, i, 0.3],
        [0.05, 0.16 + (i % 2) * 0.06, 0.05]
      );
    }
  },
  /* ------------ 鷗獸 (gull) */
  // 風翼: albatross wings and long streamer tail feathers
  'land-2-0'(K, b) {
    for (const l of K.limbs) if (l.userData.wing) l.scale.set(1.65, 1, 1.3);
    const tip = K.plain(K.pal.back, { roughness: 0.75 });
    for (const side of [-1, 1])
      rod(
        b,
        [
          [side * 0.04, 0.72, -0.6],
          [side * 0.1, 0.62, -1.1],
          [side * 0.18, 0.62, -1.65]
        ],
        0.025,
        0.004,
        tip,
        0,
        12,
        4
      );
  },
  // 暴羽: a stormy punk crest and ragged feather shards along the back
  'land-2-1'(K, b) {
    const head = K.parts.head,
      tip = K.plain(K.pal.back, { roughness: 0.75 });
    for (let k = 0; k < 7; k++)
      spike(
        head,
        tip,
        [0, 0.18 + Math.sin((k / 6) * Math.PI) * 0.06, 0.08 - k * 0.05],
        0.035,
        0.28 + Math.sin((k / 6) * Math.PI) * 0.16,
        [-0.5 - k * 0.12, 0, 0],
        0,
        4
      );
    for (let k = 0; k < 6; k++)
      spike(
        b,
        tip,
        [Math.sin(k * 2.1) * 0.08, 1.02, 0.25 - k * 0.14],
        0.04,
        0.24,
        [-1.1, 0, Math.sin(k * 2.1) * 0.5],
        0,
        3
      );
  },
  // 雪喉: a great snowy throat pouch beneath a heavy bill
  'land-2-2'(K, b) {
    const head = K.parts.head,
      pouch = K.plain(hsl(0.02, 0.25, 0.9), {
        roughness: 0.3,
        clearcoat: 0.9,
        sheen: 1,
        sheenColor: hsl(0.98, 0.5, 0.8)
      });
    knob(head, new T.SphereGeometry(0.18, 18, 14), pouch, [0, -0.17, 0.12], null, [0.85, 1, 1.25]);
    knob(
      head,
      new T.ConeGeometry(0.075, 0.5, 8),
      K.plain(hsl(0.11, 0.7, 0.55), { roughness: 0.4 }),
      [0, -0.01, 0.38],
      [Math.PI / 2, 0, 0]
    );
  },
  // 夜哨: an owl's face — a pale disc, great glowing eyes, ear tufts
  'land-2-3'(K, b) {
    const head = K.parts.head,
      disc = K.plain(K.pal.belly.clone().offsetHSL(0, -0.1, 0.1), { roughness: 0.8, side: T.DoubleSide }),
      glow = K.glowMat(),
      pupil = K.plain(0x101010, { roughness: 0.1, clearcoat: 1 });
    knob(head, new T.CircleGeometry(0.27, 24), disc, [0, 0.02, 0.1]);
    for (const side of [-1, 1]) {
      knob(head, new T.SphereGeometry(0.08, 14, 10), glow, [side * 0.1, 0.04, 0.12]);
      knob(head, new T.SphereGeometry(0.04, 10, 8), pupil, [side * 0.1, 0.04, 0.18]);
      spike(
        head,
        K.plain(K.pal.back, { roughness: 0.75 }),
        [side * 0.14, 0.26, -0.02],
        0.05,
        0.3,
        [0, 0, -side * 0.35],
        0,
        4
      );
    }
  },
  /* ------------ 犰獸 (armadillo) — 苔甲's moss grows in armadillo() */
  // 岩甲: boulders heaped on its banded back
  'land-3-1'(K, b) {
    const rock = rockOf(K);
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + Math.sin(i * 1.9) * 0.6,
        z = mix(-0.55, 0.6, i / 9);
      knob(
        b,
        new T.DodecahedronGeometry(0.14 + (i % 3) * 0.04, 0),
        rock,
        [Math.cos(a) * 0.5, 0.55 + Math.sin(a) * 0.5, z],
        [i, i * 1.7, 0],
        [1, 0.75, 1]
      );
    }
  },
  // 鐵背: rows of iron spikes and a spiked club of a tail
  'land-3-2'(K, b) {
    const iron = K.plain(hsl(0.6, 0.06, 0.42), { metalness: 0.85, roughness: 0.32 });
    for (let i = 0; i < 6; i++) {
      const z = mix(-0.55, 0.5, i / 5);
      for (const a of [Math.PI * 0.5, Math.PI * 0.22, Math.PI * 0.78])
        spike(
          b,
          iron,
          [Math.cos(a) * 0.55, 0.55 + Math.sin(a) * 0.55, z],
          0.06,
          a === Math.PI * 0.5 ? 0.3 : 0.22,
          [0, 0, a - Math.PI / 2],
          0,
          5
        );
    }
    knob(b, new T.IcosahedronGeometry(0.17, 1), iron, [0, 0.15, -1.45]);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      spike(b, iron, [Math.cos(a) * 0.18, 0.15 + Math.sin(a) * 0.18, -1.45], 0.04, 0.16, [0, 0, a - Math.PI / 2], 0, 5);
    }
  },
  // 曜晶: clusters of obsidian crystal erupt along its back
  'land-3-3'(K, b) {
    const obsidian = K.plain(hsl(K.pal.hue, 0.35, 0.12), { roughness: 0.05, clearcoat: 1, metalness: 0.3 }),
      core = crystalOf(K);
    for (let i = 0; i < 5; i++) {
      const z = mix(-0.5, 0.55, i / 4),
        a = Math.PI / 2 + (i % 2 ? 0.45 : -0.45) * (i % 3 ? 1 : 0.3);
      const at = [Math.cos(a) * 0.5, 0.55 + Math.sin(a) * 0.5, z];
      for (let k = 0; k < 3; k++)
        knob(
          b,
          new T.OctahedronGeometry(1, 0),
          k ? obsidian : core,
          [at[0] + (k - 1) * 0.07, at[1] + 0.05, at[2] + (k === 2 ? 0.05 : 0)],
          [0.2 * (k - 1), i, a - Math.PI / 2 + (k - 1) * 0.35],
          [0.06, 0.22 - k * 0.04, 0.06]
        );
    }
  },
  /* ------------ 花獸 (flora fish) */
  // 藻鰭: streamers of kelp trail from its back and sides, buoyed by little bladders
  'flora-0-0'(K, b) {
    const kelp = K.plain(hsl(0.17, 0.55, 0.32), { side: T.DoubleSide, roughness: 0.7 }, 1),
      bladder = K.plain(hsl(0.14, 0.6, 0.45), { roughness: 0.35, clearcoat: 0.7 }, 1);
    for (let k = 0; k < 7; k++) {
      const z0 = 0.45 - k * 0.22,
        side = k % 2 ? 1 : -1,
        x0 = k === 3 ? 0 : side * 0.18,
        y0 = fishTop(z0) * 0.85,
        pts = [];
      for (let i = 0; i <= 8; i++)
        pts.push([x0 + side * i * 0.035 + Math.sin(i * 1.3 + k) * 0.07, y0 + 0.06 - i * 0.03, z0 - i * 0.3]);
      bake(
        addMesh(
          b,
          sweepGeometry(line(pts), u => [0.04 + Math.sin(u * Math.PI) * 0.07, 0.008, 0], segs(26, 12), 4),
          kelp
        )
      );
      knob(b, new T.SphereGeometry(0.06, 10, 8), bladder, pts[3], null, [1, 1, 1.4], 1);
    }
  },
  // 蕨鰭: fern fronds for fins, the tallest uncurling from a fiddlehead
  'flora-0-1'(K, b) {
    const leaf = K.finMat(1, true),
      stem = K.plain(hsl(0.25, 0.45, 0.28), { roughness: 0.7 }, 1),
      leaflet = leafGeometry();
    const frond = (pts, size, normal) => {
      rod(b, pts, 0.03, 0.01, stem, 1, 16, 5);
      const path = line(pts),
        N = new V(...normal).normalize();
      for (let i = 1; i < 12; i++) {
        const t = i / 12,
          p = path.getPointAt(t),
          tg = path.getTangentAt(t),
          s = size * (1 - t * 0.7);
        // leaflets lie flat in the frond's plane, swept toward its tip
        for (const sd of [-1, 1]) {
          const X = new V().crossVectors(N, tg).multiplyScalar(sd).addScaledVector(tg, 0.6).normalize(),
            m = addMesh(b, leaflet, leaf, [p.x, p.y, p.z], null, s);
          m.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(X, new V().crossVectors(N, X), N));
          bake(m);
        }
      }
    };
    frond(
      [
        [0, 0.45, 0.45],
        [0, 1.05, 0.1],
        [0, 1.35, -0.45],
        [0, 1.2, -0.9]
      ],
      1.3,
      [1, 0, 0]
    );
    for (const side of [-1, 1])
      frond(
        [
          [side * 0.35, 0.05, 0.55],
          [side * 0.8, 0.1, 0.2],
          [side * 1.15, 0.0, -0.3]
        ],
        1,
        [0, 1, 0]
      );
    const curl = [];
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2.2,
        r = 0.16 * (1 - i / 14);
      curl.push([0, 1.2 + Math.sin(a) * r, -0.9 - 0.16 + Math.cos(a) * r]);
    }
    rod(b, curl, 0.03, 0.012, stem, 1, 24, 5);
  },
  // 蓮冠: a full lotus crown on its brow over a round leaf pad
  'flora-0-2'(K, b) {
    const pink = K.plain(
        hsl(0.93, 0.55, 0.78),
        { side: T.DoubleSide, roughness: 0.45, sheen: 1, sheenColor: hsl(0.95, 0.6, 0.9) },
        1
      ),
      pad = K.plain(hsl(0.3, 0.5, 0.33), { side: T.DoubleSide, roughness: 0.6 }, 1),
      at = [0, 0.5, 0.55];
    knob(b, new T.CircleGeometry(0.62, 24), pad, [at[0], at[1] - 0.02, at[2]], [-Math.PI / 2 + 0.12, 0, 0], null, 1);
    petalRing(b, at, 9, 0.62, 0.55, pink, 1);
    petalRing(b, [at[0], at[1] + 0.02, at[2]], 7, 0.48, 1.0, pink, 1, 0.3);
    knob(
      b,
      new T.CylinderGeometry(0.14, 0.1, 0.14, 16),
      K.plain(hsl(0.16, 0.7, 0.55), { roughness: 0.5 }, 1),
      [at[0], at[1] + 0.1, at[2]],
      null,
      null,
      1
    );
  },
  // 棘藤: thorned vines coil round and round its body
  'flora-0-3'(K, b) {
    const vine = K.plain(hsl(0.22, 0.45, 0.24), { roughness: 0.75 }, 1),
      thorn = K.plain(hsl(0.08, 0.35, 0.55), { roughness: 0.5 }, 1);
    for (const phase of [0, Math.PI]) {
      const pts = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40,
          z = mix(1.0, -1.35, t),
          u = (z + 1.45) / 2.8,
          a = phase + t * Math.PI * 5,
          rx = FISH_RX(u) + 0.03,
          ry = FISH_RY(u) + 0.03;
        pts.push([Math.cos(a) * rx, Math.sin(a) * ry + (u - 0.6) * 0.06, z]);
        if (i % 4 === 2) spike(b, thorn, pts[i], 0.03, 0.18, [0, 0, a - Math.PI / 2], 1, 4);
      }
      rod(b, pts, 0.035, 0.025, vine, 1, 90, 5);
    }
  },
  /* ------------ 葉魟 (flora ray) */
  // 花翼: its wings are fringed with petals, a great bloom open on its back
  'flora-1-0'(K, b) {
    const petal = [
        K.plain(hsl(0.92, 0.6, 0.78), { side: T.DoubleSide, roughness: 0.45 }, 2),
        K.plain(hsl(0.13, 0.7, 0.85), { side: T.DoubleSide, roughness: 0.45 }, 2)
      ],
      geo = membraneGeometry([
        [0, 0.05],
        [0.18, 0.12],
        [0.36, 0.06],
        [0.42, 0],
        [0.36, -0.06],
        [0.18, -0.12],
        [0, -0.05]
      ]);
    for (const side of [-1, 1])
      for (let k = 0; k < 10; k++) {
        const u = 0.16 + k * 0.075,
          x = RAY_RX(u) * 0.94;
        knob(
          b,
          geo,
          petal[k % 2],
          [side * x, 0.01, -0.95 + 2 * u],
          [Math.PI / 2, 0, side * -0.2],
          [side * 1.2, 1.2, 1],
          2
        );
      }
    petalRing(b, [0, rayTop(0, 0.1), 0.1], 10, 0.45, 0.45, petal[0], 2);
    knob(b, new T.SphereGeometry(0.1, 12, 8), K.glowMat(2), [0, rayTop(0, 0.1) + 0.04, 0.1], null, null, 2);
  },
  // 枯葉: veined like a fallen leaf, midrib to ragged edge
  'flora-1-1'(K, b) {
    const vein = K.plain(hsl(0.09, 0.45, 0.3), { roughness: 0.8 }, 2);
    rod(
      b,
      [
        [0, rayTop(0, 0.95) + 0.01, 0.95],
        [0, rayTop(0, 0) + 0.01, 0],
        [0, rayTop(0, -0.9) + 0.01, -0.9]
      ],
      0.035,
      0.02,
      vein,
      2,
      20,
      5
    );
    for (const side of [-1, 1])
      for (let k = 0; k < 6; k++) {
        const z = 0.75 - k * 0.3,
          u = (z - 0.35 + 0.95) / 2,
          x1 = RAY_RX(Math.max(0, u)) * 0.92,
          zm = z - 0.18;
        rod(
          b,
          [
            [0, rayTop(0, z) + 0.01, z],
            [side * x1 * 0.5, rayTop(x1 * 0.5, zm) + 0.01, zm],
            [side * x1, 0.01, z - 0.35]
          ],
          0.022,
          0.008,
          vein,
          2,
          12,
          4
        );
      }
  },
  // 楓紅: each wingtip opens into a red maple leaf, smaller leaves strewn on its back
  'flora-1-2'(K, b) {
    const red = K.plain(hsl(0.01, 0.75, 0.46), { side: T.DoubleSide, roughness: 0.55 }, 2),
      maple = [[0, 0]];
    for (let k = 0; k <= 10; k++) {
      const a = mix(-1.9, 1.9, k / 10),
        r = k % 2 ? 0.42 : k % 4 === 0 ? 0.85 : 1;
      maple.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    const geo = membraneGeometry(maple);
    for (const side of [-1, 1]) {
      knob(b, geo, red, [side * 1.45, 0.02, 0.05], [Math.PI / 2, 0, side * -0.25], [side * 0.75, 0.75, 1], 2);
      for (let k = 0; k < 3; k++)
        knob(
          b,
          geo,
          red,
          [side * (0.35 + k * 0.28), rayTop(0.35 + k * 0.28, -0.1 + k * 0.15) + 0.015, -0.1 + k * 0.15],
          [Math.PI / 2, 0, k * 1.3],
          [side * 0.18, 0.18, 1],
          2
        );
    }
  },
  // 荊棘: hooked thorns in rows across its wings, a bramble coiled round its tail
  'flora-1-3'(K, b) {
    const thorn = K.plain(hsl(0.07, 0.4, 0.5), { roughness: 0.5 }, 2),
      vine = K.plain(hsl(0.22, 0.45, 0.24), { roughness: 0.75 }, 2),
      tailLen = 1.8 + K.p.tail * 0.5;
    for (const side of [-1, 1])
      for (let r = 0; r < 3; r++)
        for (let k = 0; k < 5; k++) {
          const z = 0.7 - k * 0.38,
            x = side * (0.35 + r * 0.38);
          if (Math.abs(x) > RAY_RX((z + 0.95) / 2) * 0.85) continue;
          spike(b, thorn, [x, rayTop(x, z) + 0.06, z], 0.035, 0.18, [-0.6, 0, -side * 0.25], 2, 4);
        }
    const pts = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30,
        a = t * Math.PI * 7;
      pts.push([Math.cos(a) * 0.09, 0.05 * t + Math.sin(a) * 0.09, -0.9 - tailLen * 0.8 * t]);
      if (i % 3 === 1) spike(b, thorn, pts[i], 0.02, 0.12, [0, 0, a - Math.PI / 2], 2, 4);
    }
    rod(b, pts, 0.025, 0.012, vine, 2, 60, 4);
  },
  /* ------------ 燈母 (flora jelly) */
  // 苔光: a bell carpeted in glowing moss, strands of it hanging below
  'flora-2-0'(K, b) {
    const moss = K.plain(hsl(0.27, 0.5, 0.3), { roughness: 0.95 }),
      tips = K.glowMat(),
      strand = K.plain(hsl(0.25, 0.4, 0.35), { roughness: 0.8 }, 3);
    for (let i = 0; i < 34; i++) {
      const t = 0.1 + Math.sqrt(K.rnd()) * 0.75,
        a = K.rnd() * Math.PI * 2,
        r = Math.sin(t * Math.PI * 0.55) * 1.0,
        y = Math.cos(t * Math.PI * 0.5) * 0.95 + 0.1;
      knob(
        b,
        new T.IcosahedronGeometry(0.07 + K.rnd() * 0.06, 0),
        i % 4 ? moss : tips,
        [Math.cos(a) * r, y, Math.sin(a) * r],
        null,
        [1, 0.7, 1]
      );
    }
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2,
        L = 0.6 + (k % 3) * 0.3;
      rod(
        b,
        [
          [Math.cos(a) * 0.98, 0.1, Math.sin(a) * 0.98],
          [Math.cos(a) * 1.0, -L * 0.5, Math.sin(a) * 1.0],
          [Math.cos(a) * 0.95, -L, Math.sin(a) * 0.95]
        ],
        0.03,
        0.008,
        strand,
        3,
        10,
        4
      );
    }
  },
  // 孢雲: a mushroom cap, gilled beneath and spotted above, in a drifting cloud of spores
  'flora-2-1'(K, b) {
    const cap = K.plain(hsl(0.05, 0.55, 0.45), { roughness: 0.6, clearcoat: 0.3 }),
      spot = K.plain(hsl(0.12, 0.2, 0.92), { roughness: 0.7 }),
      gill = K.plain(hsl(0.1, 0.3, 0.75), { side: T.DoubleSide, roughness: 0.8 }),
      spore = K.plain(K.pal.glow, { emissive: K.pal.glow, emissiveIntensity: 1, transparent: true, opacity: 0.8 });
    knob(
      b,
      new T.SphereGeometry(1, segs(32, 16), 10, 0, Math.PI * 2, 0, Math.PI / 2),
      cap,
      [0, 0.32, 0],
      null,
      [1.3, 0.98, 1.3]
    );
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4,
        r = 0.2 + (i / 14) * 0.85,
        y = 0.32 + 0.98 * Math.sqrt(Math.max(0, 1 - (r / 1.3) ** 2));
      knob(b, new T.SphereGeometry(0.07, 8, 6), spot, [Math.cos(a) * r, y, Math.sin(a) * r], null, [1, 0.4, 1]);
    }
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      knob(b, new T.PlaneGeometry(0.85, 0.16), gill, [Math.cos(a) * 0.82, 0.28, Math.sin(a) * 0.82], [0, -a, 0]);
    }
    for (let i = 0; i < 26; i++) {
      const a = K.rnd() * Math.PI * 2,
        r = 0.6 + K.rnd() * 1.1;
      knob(b, new T.SphereGeometry(0.035 + K.rnd() * 0.03, 6, 5), spore, [
        Math.cos(a) * r,
        1.2 + K.rnd() * 1.0,
        Math.sin(a) * r
      ]);
    }
  },
  // 螢蕊: a crown of long stamens, each tipped with a glowing anther
  'flora-2-2'(K, b) {
    const stem = K.plain(hsl(0.2, 0.4, 0.75), { roughness: 0.5 }),
      anther = K.glowMat();
    for (let k = 0; k < 11; k++) {
      const a = (k / 11) * Math.PI * 2,
        h = 0.75 + (k % 3) * 0.25,
        tip = [Math.cos(a) * 0.55, 1.0 + h, Math.sin(a) * 0.55];
      rod(
        b,
        [[Math.cos(a) * 0.12, 0.95, Math.sin(a) * 0.12], [Math.cos(a) * 0.3, 1.0 + h * 0.6, Math.sin(a) * 0.3], tip],
        0.022,
        0.012,
        stem,
        0,
        10,
        5
      );
      knob(b, new T.SphereGeometry(0.07, 10, 8), anther, tip, [0, -a, 0.6], [1, 1.7, 1]);
    }
    knob(b, new T.CylinderGeometry(0.1, 0.06, 0.6, 10), stem, [0, 1.25, 0]);
    knob(b, new T.SphereGeometry(0.1, 12, 10), anther, [0, 1.58, 0]);
  },
  // 蜜露: a skirt of drooping petals, beads of amber honey hanging from their tips
  'flora-2-3'(K, b) {
    const petal = K.plain(hsl(0.11, 0.75, 0.7), {
        side: T.DoubleSide,
        roughness: 0.45,
        sheen: 1,
        sheenColor: hsl(0.1, 0.8, 0.85)
      }),
      honey = K.plain(hsl(0.09, 0.9, 0.5), {
        transparent: true,
        opacity: 0.85,
        roughness: 0.05,
        clearcoat: 1,
        emissive: hsl(0.09, 0.9, 0.35),
        emissiveIntensity: 0.4
      });
    petalRing(b, [0, 0.15, 0], 9, 0.75, -0.55, petal, 0, 0, 0.9);
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2,
        r = 0.9 + 0.75 * Math.cos(0.55),
        y = 0.15 - 0.75 * Math.sin(0.55) - 0.08;
      knob(b, new T.SphereGeometry(0.065, 10, 8), honey, [Math.cos(a) * r, y, -Math.sin(a) * r], null, [1, 1.35, 1]);
    }
  },
  /* ------------ 樹龜 (flora turtle) */
  // 森甲: a little forest of conifers stands on its shell
  'flora-3-0'(K, b) {
    const bark = K.plain(hsl(0.07, 0.35, 0.27), { roughness: 0.9 }),
      pine = K.plain(hsl(0.36, 0.45, 0.24), { roughness: 0.85 });
    for (const [x, z, h] of [
      [0, -0.1, 1.15],
      [-0.4, 0.25, 0.8],
      [0.38, 0.3, 0.7],
      [0.3, -0.5, 0.9],
      [-0.35, -0.45, 0.6]
    ]) {
      const y = shellTop(x, z);
      rod(
        b,
        [
          [x, y - 0.05, z],
          [x, y + h * 0.3, z]
        ],
        0.05 * h,
        0.04 * h,
        bark,
        0,
        3,
        6
      );
      for (let k = 0; k < 3; k++)
        knob(b, new T.ConeGeometry(0.3 * h * (1 - k * 0.25), 0.45 * h, 8), pine, [x, y + h * (0.38 + k * 0.24), z]);
    }
  },
  // 根鬚: a gnarled stump whose roots spill over the shell and hang like a beard
  'flora-3-1'(K, b) {
    const bark = K.plain(hsl(0.07, 0.3, 0.25), { roughness: 0.92 }),
      leaf = K.plain(hsl(0.28, 0.5, 0.33), { roughness: 0.8 });
    rod(
      b,
      [
        [0, 0.55, -0.1],
        [0.06, 0.9, -0.12],
        [-0.04, 1.15, -0.05]
      ],
      0.2,
      0.13,
      bark,
      0,
      8,
      9
    );
    for (const [dx, dz] of [
      [0.25, 0.1],
      [-0.2, -0.15]
    ])
      rod(
        b,
        [
          [-0.02, 1.05, -0.08],
          [dx, 1.3, -0.08 + dz],
          [dx * 1.4, 1.38, -0.08 + dz * 1.5]
        ],
        0.06,
        0.02,
        bark,
        0,
        6,
        5
      );
    for (let i = 0; i < 6; i++)
      knob(b, new T.IcosahedronGeometry(0.16, 1), leaf, [
        Math.sin(i * 2.3) * 0.3,
        1.38 + (i % 2) * 0.1,
        -0.08 + Math.cos(i * 2.3) * 0.25
      ]);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + 0.2,
        cx = Math.cos(a),
        cz = Math.sin(a),
        mid = [cx * 0.5, shellTop(cx * 0.5, cz * 0.6) + 0.02, cz * 0.6],
        rim = [cx * 0.95, 0.12, cz * 1.15],
        L = 0.4 + (k % 3) * 0.2;
      rod(
        b,
        [[cx * 0.12, 0.62, -0.1 + cz * 0.12], mid, rim, [cx * 1.0, 0.12 - L, cz * 1.2]],
        0.05,
        0.012,
        bark,
        0,
        18,
        5
      );
    }
  },
  // 果實: a round fruit tree, hung with glowing fruit
  'flora-3-2'(K, b) {
    const bark = K.plain(hsl(0.07, 0.35, 0.3), { roughness: 0.85 }),
      leaf = K.plain(hsl(0.29, 0.55, 0.35), { roughness: 0.8 }),
      fruit = K.plain(hsl(0.04 + K.pal.hue * 0.1, 0.85, 0.55), {
        roughness: 0.25,
        clearcoat: 1,
        emissive: hsl(0.05, 0.9, 0.4),
        emissiveIntensity: 0.5
      });
    rod(
      b,
      [
        [0, 0.6, -0.1],
        [0.05, 1.0, -0.12],
        [0, 1.25, -0.1]
      ],
      0.09,
      0.06,
      bark,
      0,
      6,
      7
    );
    for (let i = 0; i < 9; i++) {
      const a = i * 2.39,
        r = i ? 0.32 : 0;
      knob(b, new T.IcosahedronGeometry(0.3, 1), leaf, [
        Math.cos(a) * r,
        1.45 + (i % 3) * 0.12,
        -0.1 + Math.sin(a) * r
      ]);
    }
    for (let i = 0; i < 12; i++) {
      const a = i * 2.1,
        r = 0.5 + (i % 2) * 0.08;
      knob(b, new T.SphereGeometry(0.075, 10, 8), fruit, [
        Math.cos(a) * r,
        1.3 + (i % 4) * 0.12,
        -0.1 + Math.sin(a) * r
      ]);
    }
  },
  // 古木: an ancient, twisted bonsai with flat pads of foliage and hanging moss
  'flora-3-3'(K, b) {
    const bark = K.plain(hsl(0.06, 0.25, 0.2), { roughness: 0.95 }),
      leaf = K.plain(hsl(0.33, 0.45, 0.27), { roughness: 0.85 }),
      moss = K.plain(hsl(0.25, 0.4, 0.4), { roughness: 0.9 });
    rod(
      b,
      [
        [0, 0.55, 0],
        [0.25, 0.9, -0.1],
        [-0.05, 1.25, -0.2],
        [0.2, 1.55, -0.1],
        [0.5, 1.7, 0.05]
      ],
      0.17,
      0.06,
      bark,
      0,
      24,
      8
    );
    rod(
      b,
      [
        [-0.04, 1.25, -0.2],
        [-0.4, 1.4, -0.25],
        [-0.65, 1.42, -0.15]
      ],
      0.07,
      0.03,
      bark,
      0,
      8,
      6
    );
    for (const [x, y, z, s] of [
      [0.55, 1.78, 0.05, 0.42],
      [-0.65, 1.5, -0.15, 0.32],
      [0.1, 1.95, -0.15, 0.3]
    ])
      knob(b, new T.IcosahedronGeometry(1, 1), leaf, [x, y, z], null, [s, s * 0.35, s * 0.85]);
    for (let k = 0; k < 5; k++)
      rod(
        b,
        [
          [-0.65 + k * 0.28, 1.45, -0.15],
          [-0.65 + k * 0.28, 1.2 - (k % 2) * 0.15, -0.15]
        ],
        0.015,
        0.006,
        moss,
        0,
        4,
        4
      );
  }
};

function signature(K, body, info) {
  const key = K.p.species,
    parents = [body, K.parts.head, K.parts.arms].filter(Boolean),
    before = parents.map(g => g.children.length);
  SIGNATURES[key]?.(K, body, info);
  // the signature's parts are static in their parent's space: fold those sharing a material into one mesh each
  parents.forEach((g, i) => mergeParts(g, before[i]));
  const s = PROPORTIONS[key];
  if (s) body.scale.set(...s);
}
function mergeParts(parent, from) {
  const byMat = new Map();
  for (const m of parent.children.slice(from)) {
    if (!m.isMesh || m.userData.eye) continue;
    if (!byMat.has(m.material)) byMat.set(m.material, []);
    byMat.get(m.material).push(m);
  }
  for (const [mat, list] of byMat) {
    if (list.length < 2) continue;
    const geos = list.map(m => {
      m.updateMatrix();
      let g = transformed(m.geometry, m.matrix);
      if (g.index) g = g.toNonIndexed();
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!g.attributes.normal) g.computeVertexNormals();
      return g;
    });
    const merged = mergeGeometries(geos);
    if (!merged) continue;
    for (const m of list) parent.remove(m);
    addMesh(parent, merged, mat);
  }
}

/* ---------------------------------------------------------------- 0.26: upright beasts */
// A swept tube whose frame never flips, for bodies that stand up (sweepGeometry's frame is built around +y and
// degenerates on a vertical path). Same handedness as sweepGeometry, so skins and normals come out the same.
function sweepUp(pts, profile, S, R) {
  const path = line(pts),
    pos = [],
    uv = [],
    idx = [],
    b = new V(-1, 0, 0),
    n = new V();
  for (let i = 0; i <= S; i++) {
    const u = i / S,
      c = path.getPointAt(u),
      tan = path.getTangentAt(u);
    n.crossVectors(b, tan).normalize();
    const [rx, ry, oy = 0] = profile(u);
    for (let j = 0; j <= R; j++) {
      const a = (j / R) * Math.PI * 2,
        x = Math.cos(a) * rx,
        y = Math.sin(a) * ry + oy;
      pos.push(c.x + b.x * x + n.x * y, c.y + b.y * x + n.y * y, c.z + b.z * x + n.z * y);
      uv.push(u, j / R);
      if (i && j) {
        const q = i * (R + 1) + j;
        idx.push(q - R - 2, q - 1, q, q - R - 2, q, q - R - 1);
      }
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const taperUp = (pts, r0, r1, S = 14, R = 8) =>
  sweepUp(pts, u => [mix(r0, r1, u), mix(r0, r1, u)], segs(S, 6), segs(R, 5));
// Three standing body plans for land 御獸 (beast-look.js picks one by element), feet on y = 0, facing +z:
//   dragon — heavy, hunched, digitigrade, a long tail, a snouted head with a jaw;
//   wraith — tall and gaunt, long arms and claws, a hooded skull with slit eyes;
//   dryad  — slender, a small face, long fingers, root feet.
const PLANS = {
  dragon: { waist: 0.2, chest: 0.31, depth: 0.82, hip: 0.18, leg: 0.11, arm: 0.088, reach: 0.62, top: 2.2, tail: true },
  wraith: { waist: 0.13, chest: 0.23, depth: 0.7, hip: 0.13, leg: 0.08, arm: 0.07, reach: 0.82, top: 2.32 },
  dryad: { waist: 0.12, chest: 0.19, depth: 0.72, hip: 0.12, leg: 0.075, arm: 0.06, reach: 0.7, top: 2.22 }
};
// 0.30: baked sculpted skins for the three standing plans (sculpt.js makes them; sculpt-assets.js loads them).
const SCULPT = {};
export const setSculpt = (plan, geometry) => (SCULPT[plan] = geometry);
export const hasSculpt = plan => !!SCULPT[plan];
// bone order shared by the baker and the skinned mesh
export const SCULPT_BONES = ['root', 'hipL', 'hipR', 'shL', 'shR', 'tail'];
const boneOf = (kind, sd) => (kind === 'leg' ? (sd < 0 ? 1 : 2) : sd < 0 ? 3 : 4);
function planFrame(plan) {
  const P = PLANS[plan] || PLANS.dragon,
    lean = plan === 'dragon' ? 0.16 : plan === 'wraith' ? 0.08 : 0.02,
    H = [0, plan === 'dragon' ? -0.07 : plan === 'wraith' ? -0.04 : 0, lean],
    at = (x, y, z) => [x + H[0], y + H[1], z + H[2]],
    shoulderZ = 0.05 + lean,
    neckTop = plan === 'dragon' ? at(0, 1.97, 0.24) : at(0, 1.95, 0.12);
  return { P, lean, H, at, shoulderZ, neckTop, neckMid: [0, 1.82, (shoulderZ + neckTop[2]) / 2 + 0.02] };
}
const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
// The signed-distance parts of a standing body, in body space (the same proportions as the composite body).
export function uprightPrims(plan) {
  const { P, lean, at, shoulderZ, neckTop, neckMid } = planFrame(plan),
    out = [],
    sph = (a, r, bone = 0, squash, k) => out.push({ a, ra: squash ? 1 : r, bone, squash, k }),
    seg = (a, b, ra, rb, bone = 0, squash, k) => out.push({ a, b, ra, rb, bone, squash, k });
  // pelvis, torso, chest and shoulders, pectorals, the belly, the dorsal ridge
  sph([0, 0.96, -0.05], 1, 0, [P.waist * 1.3, P.waist, P.waist * 1.05]);
  const mid = (P.waist + P.chest) / 2;
  seg([0, 0.94, -0.06], [0, 1.32, 0.02 + lean * 0.3], P.waist * 0.95, mid, 0, [1, 1, P.depth]);
  seg([0, 1.32, 0.02 + lean * 0.3], [0, 1.64, 0.05 + lean], mid, P.chest * 0.92, 0, [1, 1, P.depth]);
  sph([0, 1.68, shoulderZ], 1, 0, [P.chest * 1.02, P.chest * 0.5, P.chest * P.depth]);
  for (const sd of [-1, 1]) {
    sph(
      [sd * P.chest * 0.45, 1.55, shoulderZ + P.chest * P.depth * 0.5],
      1,
      0,
      [P.chest * 0.5, P.chest * 0.34, P.chest * 0.3],
      0.04
    );
    sph([sd * (P.chest + 0.01), 1.66, shoulderZ], 1, 0, [P.chest * 0.36, P.chest * 0.32, P.chest * 0.36]);
    for (let i = 0; i < 3; i++)
      sph(
        [sd * P.waist * 0.4, 1.4 - i * 0.12, 0.02 + lean * 0.4 + P.waist * P.depth * 0.72],
        1,
        0,
        [P.waist * 0.36, P.waist * 0.22, P.waist * 0.2],
        0.03
      );
  }
  seg([0, 0.98, -P.waist * 0.92], [0, 1.68, -P.chest * 0.58 + lean], P.waist * 0.2, P.waist * 0.18, 0, null, 0.05);
  // neck and head
  seg([0, 1.64, shoulderZ], neckMid, P.waist * 0.66, P.waist * 0.58);
  seg(neckMid, neckTop, P.waist * 0.58, P.waist * 0.5);
  if (plan === 'dragon') {
    sph(at(0, 2.03, 0.24), 1, 0, [0.15, 0.14, 0.17], 0.04);
    seg(at(0, 2.02, 0.26), at(0, 1.99, 0.44), 0.12, 0.09, 0, [1.05, 0.8, 1], 0.03);
    seg(at(0, 1.99, 0.44), at(0, 1.94, 0.62), 0.09, 0.05, 0, [1.05, 0.8, 1], 0.03);
    seg(at(0, 1.93, 0.27), at(0, 1.865, 0.56), 0.085, 0.035, 0, [1, 0.65, 1], 0.015);
    for (const sd of [-1, 1]) sph(at(sd * 0.1, 1.95, 0.27), 1, 0, [0.045, 0.04, 0.05], 0.03);
  } else if (plan === 'wraith') {
    sph(at(0, 2.06, 0.08), 1, 0, [0.17, 0.24, 0.24], 0.04);
    const c = at(0, 2.2, -0.12),
      dir = [0, Math.cos(-2.0), Math.sin(-2.0)];
    seg(
      vadd(
        c,
        dir.map(v => -v * 0.17)
      ),
      vadd(
        c,
        dir.map(v => v * 0.17)
      ),
      0.11,
      0.012,
      0,
      null,
      0.04
    );
  } else {
    sph([0, 2.04, 0.14], 1, 0, [0.12, 0.15, 0.13], 0.04);
    for (const sd of [-1, 1]) sph([sd * 0.075, 2.0, 0.2], 1, 0, [0.04, 0.035, 0.04], 0.02);
    sph([0, 1.95, 0.17], 0.06, 0, null, 0.03);
  }
  // arms: upper arm with its biceps, elbow, forearm, the back of the hand
  for (const sd of [-1, 1]) {
    const pv = [sd * (P.chest + 0.02), 1.63, shoulderZ],
      r = P.reach,
      elbow = vadd(pv, [sd * 0.07, -r * 0.5, -0.02]),
      wrist = vadd(pv, [sd * 0.1, -r, 0.16]),
      b = boneOf('arm', sd);
    seg(pv, elbow, P.arm * 1.12, P.arm * 0.92, b);
    sph(vadd(pv, [sd * 0.045, -r * 0.24, 0.0]), P.arm * 1.28, b, null, 0.05);
    sph(elbow, P.arm * 0.92, b);
    seg(elbow, wrist, P.arm * 0.86, P.arm * 0.6, b);
    sph(vadd(elbow, [sd * 0.012, -r * 0.16, 0.05]), P.arm * 0.98, b, null, 0.05);
    sph(vadd(wrist, [0, -0.02, 0.02]), 1, b, [P.arm * 0.72, P.arm * 0.56, P.arm * 0.95], 0.04);
  }
  // legs: hip, the heavy thigh, knee, calf, ankle, foot
  for (const sd of [-1, 1]) {
    const pv = [sd * P.hip, 0.98, -0.05],
      dig = plan !== 'dryad',
      knee = vadd(pv, dig ? [sd * 0.03, -0.42, 0.16] : [sd * 0.03, -0.48, 0.05]),
      ankle = vadd(pv, dig ? [sd * 0.05, -0.8, -0.08] : [sd * 0.04, -0.9, -0.01]),
      foot = vadd(pv, [sd * 0.05, -0.955, 0.06]),
      b = boneOf('leg', sd);
    sph(pv, 1, b, [P.leg * 1.3, P.leg * 1.2, P.leg * 1.3]);
    seg(pv, knee, P.leg * 1.25, P.leg * 0.92, b);
    sph(vadd(pv, [sd * 0.015, -0.2, 0.08]), P.leg * 1.45, b, null, 0.06);
    sph(knee, P.leg * 0.9, b);
    seg(knee, ankle, P.leg * 0.82, P.leg * 0.55, b);
    sph(vadd(knee, [0, -0.13, -0.05]), P.leg * 0.98, b, null, 0.05);
    seg(ankle, foot, P.leg * 0.55, P.leg * 0.5, b);
    sph(vadd(foot, [0, 0, 0.03]), 1, b, [P.leg * 0.75, P.leg * 0.32, P.leg * 1.2], 0.03);
  }
  // tail: thick at the root, tapering to a point
  if (P.tail) {
    const pv = [0, 0.95, -0.16],
      pts = [
        [0, 0, 0],
        [0, -0.28, -0.45],
        [0, -0.72, -0.95],
        [0, -0.9, -1.5]
      ].map(p => vadd(pv, p)),
      lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1], p[2] - pts[i][2])),
      total = lens.reduce((a, b) => a + b, 0);
    let acc = 0;
    for (let i = 0; i < 3; i++) {
      const r0 = 0.15 + (0.012 - 0.15) * (acc / total);
      acc += lens[i];
      const r1 = 0.15 + (0.012 - 0.15) * (acc / total);
      seg(pts[i], pts[i + 1], r0, r1, 5, null, 0.05);
    }
  }
  return out;
}

function upright(K, body, plan, opts = {}) {
  const baked = SCULPT[plan] && !opts.composite;
  const P = PLANS[plan] || PLANS.dragon,
    // the skin's light organs read as stitched seams on a standing body: keep them dim
    skin = K.skinMat('scale', 0, { emissiveIntensity: 0.04 }),
    dark = K.plain(K.pal.back.clone().offsetHSL(0, -0.2, -0.08), { roughness: 0.6 }),
    bone = K.plain(hsl(0.07, 0.12, 0.13), { roughness: 0.4, clearcoat: 0.6 }),
    claw = K.plain(hsl(0.08, 0.15, 0.16), { roughness: 0.35, clearcoat: 0.7 });
  K.u.uSwimA.value = 0;
  const S = segs(36, 14),
    R = segs(22, 10),
    sphere = new T.SphereGeometry(1, R, segs(14, 8)),
    // dragons hunch and push the head forward; wraiths stoop a little
    lean = plan === 'dragon' ? 0.16 : plan === 'wraith' ? 0.08 : 0.02,
    H = [0, plan === 'dragon' ? -0.07 : plan === 'wraith' ? -0.04 : 0, lean],
    at = (x, y, z) => [x + H[0], y + H[1], z + H[2]],
    // with a baked sculpt the skin-coloured body parts are already in the one seamless mesh: skip them here
    ball = (parent, mat, pos, sc) => (baked && mat === skin ? null : addMesh(parent, sphere, mat, pos, null, sc)),
    // a muscle: a bulged tube between two joints
    muscle = (parent, pts, r, bulge, S_ = 18, R_ = 10) =>
      baked
        ? null
        : addMesh(
            parent,
            sweepUp(
              pts,
              u => [r * (1 + Math.sin(u * Math.PI) * bulge), r * (1 + Math.sin(u * Math.PI) * bulge)],
              segs(S_, 8),
              segs(R_, 6)
            ),
            skin
          ),
    bodyPart = (parent, geo) => (baked ? null : addMesh(parent, geo, skin)),
    // limb pivots: bones when skinned, plain groups otherwise
    joint = () => (baked ? new T.Bone() : new T.Group());
  let sk = null,
    root = body;
  if (baked) {
    // the striped skin texture is laid out along a swimmer's body; on the sculpt the hide is one deep colour and
    // the scale normal map (beast-look.js) gives it its surface
    const hide = skin.clone();
    hide.map = null;
    hide.emissiveMap = null;
    hide.emissiveIntensity = 0;
    hide.color = K.pal.side.clone().lerp(K.pal.back, 0.55);
    hide.userData.sculpted = true;
    sk = new T.SkinnedMesh(SCULPT[plan], hide);
    sk.castShadow = sk.receiveShadow = true;
    sk.frustumCulled = false;
    root = new T.Bone();
    sk.add(root);
    body.add(sk);
  }
  const bones = { root };
  // ---- pelvis, torso, shoulders
  ball(body, skin, [0, 0.96, -0.05], [P.waist * 1.3, P.waist * 1.0, P.waist * 1.05]);
  const torso = curve([
    [0, P.waist * 0.95],
    [0.28, P.waist],
    [0.72, P.chest],
    [1, P.chest * 0.72]
  ]);
  bodyPart(
    body,
    sweepUp(
      [
        [0, 0.94, -0.06],
        [0, 1.32, 0.02 + lean * 0.3],
        [0, 1.7, 0.06 + lean]
      ],
      u => [torso(u), torso(u) * P.depth],
      S,
      R
    )
  );
  const shoulderZ = 0.05 + lean;
  ball(body, skin, [0, 1.68, shoulderZ], [P.chest * 1.02, P.chest * 0.5, P.chest * P.depth]);
  // pectorals, the ridges of the belly, the deltoids and the dorsal ridge
  for (const sd of [-1, 1]) {
    ball(
      body,
      skin,
      [sd * P.chest * 0.45, 1.55, shoulderZ + P.chest * P.depth * 0.55],
      [P.chest * 0.5, P.chest * 0.34, P.chest * 0.3]
    );
    ball(body, skin, [sd * (P.chest + 0.01), 1.66, shoulderZ], [P.chest * 0.34, P.chest * 0.3, P.chest * 0.34]);
  }
  for (let i = 0; i < 3; i++)
    for (const sd of [-1, 1])
      ball(
        body,
        skin,
        [sd * P.waist * 0.4, 1.4 - i * 0.12, 0.02 + lean * 0.4 + P.waist * P.depth * 0.75],
        [P.waist * 0.36, P.waist * 0.22, P.waist * 0.22]
      );
  bodyPart(
    body,
    sweepUp(
      [
        [0, 0.98, -P.waist * 0.95],
        [0, 1.35, -P.waist * 0.85 + lean * 0.3],
        [0, 1.7, -P.chest * 0.6 + lean]
      ],
      u => [P.waist * 0.22, P.waist * 0.16],
      segs(16, 8),
      segs(10, 6)
    )
  );
  // ---- neck, with its tendons
  const neckTop = plan === 'dragon' ? at(0, 1.97, 0.24) : at(0, 1.95, 0.12),
    neckMid = [0, 1.82, (shoulderZ + neckTop[2]) / 2 + 0.02];
  bodyPart(body, taperUp([[0, 1.64, shoulderZ], neckMid, neckTop], P.waist * 0.66, P.waist * 0.5, 12, R));
  for (const sd of [-1, 1])
    addMesh(
      body,
      taperUp(
        [
          [sd * P.waist * 0.4, 1.66, shoulderZ + 0.04],
          [sd * P.waist * 0.3, 1.85, neckMid[2] + 0.06]
        ],
        P.waist * 0.14,
        P.waist * 0.08,
        8,
        6
      ),
      skin
    );
  // ---- head
  let head, mouth, eyeAt, eyeR;
  if (plan === 'dragon') {
    ball(body, skin, at(0, 2.03, 0.24), [0.15, 0.14, 0.17]);
    const snout = curve([
      [0, 0.12],
      [0.6, 0.085],
      [1, 0.05]
    ]);
    bodyPart(
      body,
      sweepGeometry(
        line([at(0, 2.02, 0.26), at(0, 1.99, 0.44), at(0, 1.94, 0.62)]),
        u => [snout(u) * 1.05, snout(u) * 0.8],
        segs(18, 8),
        R
      )
    );
    // the lower jaw hangs a little open, hinged at the cheeks
    bodyPart(
      body,
      sweepGeometry(
        line([at(0, 1.93, 0.27), at(0, 1.88, 0.42), at(0, 1.865, 0.56)]),
        u => [0.085 - u * 0.05, 0.055 - u * 0.025],
        segs(14, 8),
        R
      )
    );
    for (const sd of [-1, 1]) {
      ball(body, skin, at(sd * 0.1, 1.95, 0.27), [0.045, 0.04, 0.05]);
      // brow ridge, cheek spur, nostril
      addMesh(
        body,
        taperUp([at(sd * 0.05, 2.12, 0.36), at(sd * 0.12, 2.1, 0.3), at(sd * 0.16, 2.05, 0.22)], 0.022, 0.012, 8, 6),
        skin
      );
      addMesh(body, new T.ConeGeometry(0.03, 0.16, 5), bone, at(sd * 0.13, 1.98, 0.2), [-1.9, 0, sd * 0.5]);
      ball(body, dark, at(sd * 0.028, 1.97, 0.6), [0.014, 0.01, 0.012]);
    }
    head = at(0, 2.05, 0.3);
    mouth = { at: at(0, 1.92, 0.56), w: 0.12, depth: 0.2, mode: 0 };
    fangs({ ...K, p: { ...K.p, fierce: Math.max(K.p.fierce, 0.7) } }, body, { ...mouth, w: 0.11 });
    eyeAt = at(0.1, 2.09, 0.36);
    eyeR = 0.04;
  } else if (plan === 'wraith') {
    // a hood round a dark face, its point falling back over the nape; a jaw of teeth in the dark
    ball(body, skin, at(0, 2.06, 0.08), [0.17, 0.24, 0.24]);
    if (!baked) addMesh(body, new T.ConeGeometry(0.12, 0.34, R), skin, at(0, 2.2, -0.12), [-2.0, 0, 0]);
    ball(body, dark, at(0, 2.02, 0.2), [0.13, 0.17, 0.12]);
    ball(body, dark, at(0, 1.92, 0.22), [0.08, 0.06, 0.08]);
    head = at(0, 2.08, 0.16);
    mouth = { at: at(0, 1.95, 0.31), w: 0.08, depth: 0.12, mode: 0, scale: 0.7 };
    fangs({ ...K, p: { ...K.p, fierce: Math.max(K.p.fierce, 0.6) } }, body, mouth);
    eyeAt = at(0.055, 2.07, 0.3);
    eyeR = 0.026;
  } else {
    ball(body, skin, [0, 2.04, 0.14], [0.12, 0.15, 0.13]);
    // cheekbones and a narrow chin
    for (const sd of [-1, 1]) ball(body, skin, [sd * 0.075, 2.0, 0.2], [0.04, 0.035, 0.04]);
    ball(body, skin, [0, 1.95, 0.17], [0.06, 0.06, 0.06]);
    head = [0, 2.05, 0.15];
    mouth = { at: [0, 1.97, 0.26], w: 0.06, depth: 0.1, mode: 0, scale: 0.6 };
    eyeAt = [0.048, 2.06, 0.245];
    eyeR = 0.028;
  }
  for (const sd of [-1, 1]) {
    const e = K.eye(body, [sd * eyeAt[0], eyeAt[1], eyeAt[2]], eyeR, true);
    if (plan !== 'dragon') e.rotation.set(0, -Math.PI / 2 - sd * 0.3, 0); // looking forward, not to the side
  }
  // shoulder spurs: bone growing out through the hide
  if (plan !== 'dryad')
    for (const sd of [-1, 1])
      for (let i = 0; i < (plan === 'dragon' ? 3 : 2); i++)
        addMesh(
          body,
          new T.ConeGeometry(0.035 - i * 0.006, 0.26 - i * 0.05, 5),
          bone,
          [sd * (P.chest * 0.85 + i * 0.04), 1.76 - i * 0.03, shoulderZ - 0.06 - i * 0.07],
          [-0.5 - i * 0.2, 0, -sd * (0.5 + i * 0.15)]
        );
  // ---- arms: upper arm, elbow, forearm, a hand with three fingers and claws
  for (const sd of [-1, 1]) {
    const sh = joint();
    sh.position.set(sd * (P.chest + 0.02), 1.63, shoulderZ);
    root.add(sh);
    bones[sd < 0 ? 'shL' : 'shR'] = sh;
    const r = P.reach,
      elbow = [sd * 0.07, -r * 0.5, -0.02],
      wrist = [sd * 0.1, -r, 0.16];
    muscle(sh, [[0, 0, 0], [sd * 0.05, -r * 0.25, -0.01], elbow], P.arm, 0.35, 16, 12);
    ball(sh, skin, elbow, [P.arm * 0.95, P.arm * 0.95, P.arm * 0.95]);
    muscle(sh, [elbow, [sd * 0.09, -r * 0.75, 0.07], wrist], P.arm * 0.78, 0.22, 16, 12);
    ball(sh, skin, [wrist[0], wrist[1] - 0.02, wrist[2] + 0.02], [P.arm * 0.7, P.arm * 0.55, P.arm * 0.95]);
    const long = plan === 'wraith' ? 0.2 : plan === 'dryad' ? 0.15 : 0.11;
    for (let i = 0; i < 3; i++) {
      const fx = wrist[0] + (i - 1) * 0.04,
        root = [fx, wrist[1] - 0.02, wrist[2] + 0.05],
        tip = [fx + (i - 1) * 0.015, wrist[1] - long * 0.75, wrist[2] + 0.14 + long * 0.5];
      addMesh(
        sh,
        taperUp([root, [fx, wrist[1] - long * 0.35, wrist[2] + 0.1 + long * 0.25], tip], 0.017, 0.01, 8, 6),
        skin
      );
      addMesh(
        sh,
        new T.ConeGeometry(0.012, long * 0.55, 5),
        claw,
        [tip[0], tip[1] - long * 0.22, tip[2] + long * 0.12],
        [0.6, 0, (i - 1) * 0.1 + Math.PI]
      );
    }
    sh.userData.arm = true;
    sh.userData.side = sd;
    K.limbs.push(sh);
  }
  // ---- legs: a heavy thigh, the knee, a calf, the ankle and a clawed foot
  for (const sd of [-1, 1]) {
    const hip = joint();
    hip.position.set(sd * P.hip, 0.98, -0.05);
    root.add(hip);
    bones[sd < 0 ? 'hipL' : 'hipR'] = hip;
    const dig = plan !== 'dryad',
      knee = dig ? [sd * 0.03, -0.42, 0.16] : [sd * 0.03, -0.48, 0.05],
      ankle = dig ? [sd * 0.05, -0.8, -0.08] : [sd * 0.04, -0.9, -0.01],
      foot = [sd * 0.05, -0.955, 0.06];
    ball(hip, skin, [0, 0, 0], [P.leg * 1.3, P.leg * 1.2, P.leg * 1.3]);
    muscle(hip, [[0, 0, 0], [sd * 0.02, -0.22, 0.1], knee], P.leg, 0.45, 18, 12);
    ball(hip, skin, knee, [P.leg * 0.9, P.leg * 0.9, P.leg * 0.95]);
    muscle(hip, [knee, [sd * 0.04, -0.6, 0.02], ankle], P.leg * 0.8, 0.3, 18, 12);
    ball(hip, skin, ankle, [P.leg * 0.6, P.leg * 0.55, P.leg * 0.65]);
    bodyPart(hip, taperUp([ankle, foot], P.leg * 0.55, P.leg * 0.5, 6, 8));
    ball(hip, skin, [foot[0], foot[1], foot[2] + 0.03], [P.leg * 0.75, P.leg * 0.32, P.leg * 1.2]);
    for (let i = 0; i < 3; i++) {
      const tx = foot[0] + (i - 1) * 0.045,
        len = plan === 'dryad' ? 0.17 : 0.12;
      addMesh(
        hip,
        taperUp(
          [
            [tx, foot[1] - 0.01, foot[2] + 0.06],
            [tx + (i - 1) * 0.02, foot[1] - 0.015, foot[2] + 0.06 + len]
          ],
          P.leg * 0.26,
          P.leg * 0.15,
          6,
          6
        ),
        skin
      );
      addMesh(
        hip,
        new T.ConeGeometry(0.014, 0.07, 5),
        claw,
        [tx + (i - 1) * 0.025, foot[1] - 0.015, foot[2] + 0.1 + len],
        [Math.PI / 2 - 0.15, 0, 0]
      );
    }
    // a dewclaw / heel spur
    if (dig)
      addMesh(
        hip,
        new T.ConeGeometry(0.012, 0.07, 5),
        claw,
        [foot[0] - sd * 0.01, foot[1] + 0.02, foot[2] - 0.08],
        [-Math.PI / 2 + 0.3, 0, 0]
      );
    hip.userData.leg = sd > 0 ? 0 : 1;
    hip.userData.side = sd;
    K.limbs.push(hip);
  }
  // ---- tail (dragons): thick at the root, a ridge of plates down its back
  if (P.tail) {
    const tl = joint();
    tl.position.set(0, 0.95, -0.16);
    root.add(tl);
    bones.tail = tl;
    bodyPart(
      tl,
      taperUp(
        [
          [0, 0, 0],
          [0, -0.28, -0.45],
          [0, -0.72, -0.95],
          [0, -0.9, -1.5]
        ],
        0.15,
        0.012,
        26,
        segs(14, 7)
      )
    );
    for (let i = 0; i < 6; i++) {
      const u = (i + 0.5) / 6,
        y = -0.28 * u * 2.2 - (u > 0.5 ? (u - 0.5) * 0.9 : 0) + 0.12 * (1 - u),
        z = -0.45 * u * 2.1;
      addMesh(tl, new T.ConeGeometry(0.035 * (1 - u * 0.6), 0.1 * (1 - u * 0.5), 4), bone, [0, y, z], [-0.9, 0, 0]);
    }
    tl.userData.tail = true;
    K.limbs.push(tl);
  }
  // ---- wings (some dragons): a bone arm and two fingers with a torn membrane between
  if (opts.wings) {
    for (const sd of [-1, 1]) {
      const w = new T.Group();
      w.position.set(sd * P.chest * 0.6, 1.72, shoulderZ - 0.18);
      body.add(w);
      const L = 1.15,
        a1 = [sd * L * 0.55, 0.55, -0.1],
        a2 = [sd * L * 1.0, 0.95, -0.15],
        f1 = [sd * L * 1.25, 0.3, -0.2],
        f2 = [sd * L * 0.95, -0.45, -0.15];
      addMesh(w, taperUp([[0, 0, 0], a1], 0.045, 0.035, 8, 7), skin);
      ball(w, skin, a1, [0.045, 0.045, 0.045]);
      addMesh(w, taperUp([a1, a2], 0.035, 0.02, 8, 7), skin);
      addMesh(w, taperUp([a2, f1], 0.018, 0.006, 8, 6), bone);
      addMesh(w, taperUp([a2, f2], 0.018, 0.006, 8, 6), bone);
      addMesh(w, new T.ConeGeometry(0.02, 0.14, 5), claw, [a2[0], a2[1] + 0.08, a2[2]], [0, 0, 0]);
      const g = membraneGeometry([
        [0, -0.05],
        [a1[0] * 0.9, a1[1] - 0.02],
        [a2[0], a2[1] - 0.03],
        [f1[0], f1[1]],
        [sd * L * 1.0, -0.15],
        [f2[0], f2[1]],
        [sd * L * 0.4, -0.5],
        [0, -0.32]
      ]);
      const mem = addMesh(w, g, K.finMat(0), [0, 0, -0.16]);
      mem.material = mem.material.clone();
      mem.material.opacity = 0.92;
      mem.material.color = K.pal.back.clone().offsetHSL(0, -0.1, -0.05);
      w.rotation.set(0.15, sd * 0.5, sd * 0.1);
      w.userData.wing = true;
      w.userData.side = sd;
      K.limbs.push(w);
    }
  }
  if (sk) {
    bones.tail ??= new T.Bone();
    if (!bones.tail.parent) root.add(bones.tail);
    sk.bind(new T.Skeleton(SCULPT_BONES.map(n => bones[n])));
  }
  return {
    head,
    back: [0, 1.4, -0.22],
    len: 2.2,
    top: P.top + H[1],
    walker: true,
    upright: plan,
    mouth,
    chest: [0, 1.48, 0.04 + lean * 0.6 + P.chest * P.depth * 0.5],
    spine:
      plan === 'dragon'
        ? [
            [1.0, -0.22],
            [1.72, -0.12 + lean * 0.8]
          ]
        : [
            [1.02, -0.15],
            [1.72, -0.1 + lean * 0.8]
          ]
  };
}

/* ---------------------------------------------------------------- public API */
// opts.upright: 'dragon' | 'wraith' | 'dryad' — the standing body of a land 御獸 (0.26); opts.wings adds a pair
export function makeCreature(genome, opts = {}) {
  const K = kit(genome),
    { p } = K,
    group = new T.Group(),
    body = new T.Group();
  group.add(body);
  const info = opts.upright ? upright(K, body, opts.upright, opts) : BUILDERS[p.family][p.body](K, body);
  const grown = body.children.length;
  if (p.flora && !info.upright) {
    const [z0, z1, y] = info.flora;
    if (info.jelly) {
      for (let i = 0; i < 3 + p.flora * 4; i++)
        flower(K, body, [Math.cos(i * 1.7) * 0.5, y + 0.15, Math.sin(i * 1.7) * 0.5], 1.5, 0);
      floraGrowth(K, body, -0.5, 0.5, y, p.flora * 0.6);
    } else if (info.shell && p.family !== 'flora') {
      // a small tree takes root in the shell (a flora turtle grows its own, see the signatures)
      const bark = K.plain(hsl(0.08, 0.35, 0.3), { roughness: 0.85 });
      addMesh(
        body,
        taper(
          [
            [0, 0.6, -0.1],
            [0.05, 1.0, -0.15],
            [-0.05, 1.35, -0.1]
          ],
          0.07,
          0.035,
          10,
          7
        ),
        bark
      );
      const canopy = K.plain(hsl(0.3, 0.5, 0.35), { roughness: 0.8 });
      for (let i = 0; i < 4 + p.flora * 4; i++)
        addMesh(body, new T.IcosahedronGeometry(0.22, 1), canopy, [
          (K.rnd() - 0.5) * 0.5,
          1.35 + K.rnd() * 0.3,
          -0.1 + (K.rnd() - 0.5) * 0.5
        ]);
      floraGrowth(K, body, z0, z1, y, p.flora);
    } else floraGrowth(K, body, z0, z1, y, p.flora);
  }
  // leaves and blossoms are static on the body: one mesh per material
  if (p.flora && !info.upright) mergeParts(body, grown);
  if (!info.upright) fusionTrait(K, body, info);
  if (p.fierce >= 0.55 && info.mouth) fangs(K, body, info.mouth);
  // savage beasts bristle with a ridge of spines (species that already grow a crest keep theirs)
  if (p.fierce >= 0.8 && !p.horn && !info.jelly && !info.shell && !info.rigid && !info.upright)
    crest(K, body, info.back[2] - info.len * 0.3, info.back[2] + info.len * 0.2, info.top * 0.92, 0.12, 7);
  // 0.64: the species' own build and signature feature
  if (!info.upright) signature(K, body, info);
  // land beasts get a hidden rock perch, shown when they rest in a sea pen
  let perch = null;
  if (p.habitat === 'land') {
    perch = addMesh(
      group,
      new T.DodecahedronGeometry(0.9, 0),
      new T.MeshStandardMaterial({ color: 0x6d7570, roughness: 0.95 }),
      [0, -0.55, 0],
      null,
      [1.3, 0.6, 1.1]
    );
    perch.visible = false;
  }
  group.scale.setScalar(p.size);
  group.userData = { body, limbs: K.limbs, parts: K.parts, phenotype: p, swimU: K.u, info, perch, last: null, gait: 0 };
  return group;
}

// t is the creature's own clock (the world speeds it up while the creature moves fast).
export function animateCreature(m, t) {
  const u = m.userData,
    p = u.phenotype,
    info = u.info;
  u.beastLook?.update(t);
  u.swimU.uSwimT.value = t * (p.family === 'deep' ? 2.2 : 3);
  // how fast the creature moved since last frame drives gait and fin effort
  const pos = m.getWorldPosition(new V());
  const speed = u.last ? Math.min(6, pos.distanceTo(u.last) * 60) : 0;
  u.last = pos;
  u.gait += (speed - u.gait) * 0.1;
  if (info.walker) {
    u.body.position.y = Math.abs(Math.sin(t * 4)) * 0.03 * Math.min(1, u.gait);
    u.limbs.forEach(l => {
      if (l.userData.wing) {
        l.rotation.y = l.userData.side * (0.5 + Math.sin(t * 1.3) * 0.18);
        l.rotation.z = l.userData.side * (0.1 + Math.sin(t * 1.3 + 0.5) * 0.1);
      } else if (l.userData.arm)
        l.rotation.x =
          -Math.sin(t * 5 + (l.userData.side > 0 ? Math.PI : 0)) * 0.4 * Math.min(1, u.gait) +
          Math.sin(t * 1.1 + l.userData.side) * 0.05;
      else if (l.userData.tail) {
        l.rotation.y = Math.sin(t * 1.6) * 0.25;
        l.rotation.x = Math.sin(t * 1.1) * 0.05;
      } else l.rotation.x = Math.sin(t * 5 + l.userData.leg * Math.PI) * 0.45 * Math.min(1, u.gait + 0.08);
    });
    if (u.parts.head) u.parts.head.rotation.y = Math.sin(t * 0.4) * 0.25;
    return;
  }
  if (info.jelly && u.parts.bell) {
    const pulse = Math.sin(t * 1.8);
    u.parts.bell.scale.set(1 + pulse * 0.07, 1 - pulse * 0.06, 1 + pulse * 0.07);
    u.body.position.y = pulse * 0.05;
  }
  u.body.rotation.z = Math.sin(t * 1.3) * 0.03;
  u.limbs.forEach((l, i) => {
    const s = l.userData.side || 1;
    if (l.userData.claw) l.userData.pincer.rotation.z = Math.sin(t * 2 + i) * 0.3;
    else if (l.userData.leg !== undefined) l.rotation.z = s * Math.sin(t * 3 + l.userData.leg) * 0.18;
    else if (l.userData.front !== undefined)
      l.rotation.y = s * Math.sin(t * (l.userData.front ? 1.6 : 2) + (l.userData.front ? 0 : 1)) * 0.45;
    else l.rotation.z = s * (Math.sin(t * 2.6 + i * 0.5) * 0.28 + 0.08);
  });
  if (u.parts.head && !info.walker) u.parts.head.rotation.y = Math.sin(t * 0.7) * 0.15;
}
// shared with beast-look.js
export { taper, addMesh };
