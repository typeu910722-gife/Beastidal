// Procedural creature models (0.10 rewrite).
//
// Every beast is built from its genome: family + form pick one of 16 species builders, and the remaining genes
// shape fins, tails, horns, eyes, colour, patterning and bioluminescence. Bodies are swept surfaces with painted
// skin textures (countershading, stripes / spots / scales / light organs, plant moss), glossy "wet" physical
// materials, iris-textured eyes and ray-veined fin membranes. Swimming is done on the GPU: the body and its baked-on
// parts share one wave deformation, so tails, crests and ribbons ripple together.
import * as T from './vendor/three.module.min.js';
import { phenotype, seeded, dnaCode } from './genetics.js?v=0.18.0';

const V = T.Vector3;
let detail = 'high';
// 'high' | 'balanced' | 'low' — matches the graphics quality presets.
export function setCreatureDetail(level) {
  detail = level;
}
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
    const { clearcoat, clearcoatRoughness, sheen, sheenColor, sheenRoughness, ...rest } = opts;
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
  m.geometry = m.geometry.clone();
  m.geometry.applyMatrix4(m.matrix);
  m.position.set(0, 0, 0);
  m.rotation.set(0, 0, 0);
  m.scale.set(1, 1, 1);
  return m;
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
  const rx = curve([
      [0, 0.03],
      [0.12, 0.09],
      [0.4, 0.4],
      [0.62, 0.46],
      [0.86, 0.33],
      [1, 0.03]
    ]),
    ry = curve([
      [0, 0.05],
      [0.12, 0.14],
      [0.4, 0.52],
      [0.62, 0.55],
      [0.86, 0.36],
      [1, 0.05]
    ]);
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
  const rx = curve([
      [0, 0.12],
      [0.2, 0.95],
      [0.45, 1.75],
      [0.62, 1.7],
      [0.82, 0.95],
      [1, 0.25]
    ]),
    ry = curve([
      [0, 0.06],
      [0.3, 0.17],
      [0.55, 0.24],
      [0.8, 0.2],
      [1, 0.08]
    ]);
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
  const crystals = 3 + p.horn * 3;
  for (let i = 0; i < crystals; i++) {
    const a = K.rnd() * Math.PI * 2,
      r = K.rnd() * 0.65,
      h = 0.18 + K.rnd() * 0.35;
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
  const r = curve([
    [0, 0.02],
    [0.08, 0.14],
    [0.5, 0.36],
    [0.8, 0.4],
    [0.88, 0.33],
    [0.95, 0.4],
    [1, 0.14]
  ]);
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
  const { p, pal } = K;
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
  const r = curve([
    [0, 0.02],
    [0.35, 0.12],
    [0.55, 0.3],
    [0.75, 0.3],
    [0.85, 0.17],
    [0.92, 0.2],
    [1, 0.05]
  ]);
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
  // branching antlers with crystal tips
  const antler = K.plain(pal.belly.clone().offsetHSL(0.05, -0.3, 0), { roughness: 0.6 }),
    tip = K.glowMat();
  for (const side of [-1, 1]) {
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
  for (let i = 0; i < 6 + p.pattern * 3; i++) {
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

/* ---------------------------------------------------------------- public API */
export function makeCreature(genome) {
  const K = kit(genome),
    { p } = K,
    group = new T.Group(),
    body = new T.Group();
  group.add(body);
  const info = BUILDERS[p.family][p.body](K, body);
  if (p.flora) {
    const [z0, z1, y] = info.flora;
    if (info.jelly) {
      for (let i = 0; i < 3 + p.flora * 4; i++)
        flower(K, body, [Math.cos(i * 1.7) * 0.5, y + 0.15, Math.sin(i * 1.7) * 0.5], 1.5, 0);
      floraGrowth(K, body, -0.5, 0.5, y, p.flora * 0.6);
    } else if (info.shell) {
      // a small tree takes root in the shell
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
  fusionTrait(K, body, info);
  if (p.fierce >= 0.55 && info.mouth) fangs(K, body, info.mouth);
  // savage beasts bristle with a ridge of spines (species that already grow a crest keep theirs)
  if (p.fierce >= 0.8 && !p.horn && !info.jelly && !info.shell && !info.rigid)
    crest(K, body, info.back[2] - info.len * 0.3, info.back[2] + info.len * 0.2, info.top * 0.92, 0.12, 7);
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
  u.swimU.uSwimT.value = t * (p.family === 'deep' ? 2.2 : 3);
  // how fast the creature moved since last frame drives gait and fin effort
  const pos = m.getWorldPosition(new V());
  const speed = u.last ? Math.min(6, pos.distanceTo(u.last) * 60) : 0;
  u.last = pos;
  u.gait += (speed - u.gait) * 0.1;
  if (info.walker) {
    u.body.position.y = Math.abs(Math.sin(t * 4)) * 0.03 * Math.min(1, u.gait);
    u.limbs.forEach(l => {
      if (l.userData.wing) l.rotation.z = l.userData.side * (0.2 + Math.sin(t * 1.3) * 0.08);
      else l.rotation.x = Math.sin(t * 5 + l.userData.leg * Math.PI) * 0.45 * Math.min(1, u.gait + 0.08);
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
