// Loads the baked sculpted bodies (dist/models/sculpt-<plan>.json, made by scripts/bake-sculpt.mjs) and hands
// them to creatures.js. Without them the standing beasts fall back to their composite bodies.
import * as T from './vendor/three.module.min.js';
import { setSculpt } from './creatures.js?v=0.53.0';
import { setXiaoyueSculpt } from './story-models.js?v=0.53.0';

export const SCULPT_PLANS = ['dragon', 'wraith', 'dryad'];
const bytes = b64 => {
  if (typeof atob === 'function') {
    const bin = atob(b64),
      out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(globalThis.Buffer.from(b64, 'base64'));
};
// position: int16 × scale · normal: int8 · uv: uint16 · skin index / weight: uint8 · index: uint16 or uint32
export function decodeSculpt(d) {
  const g = new T.BufferGeometry(),
    pos = new Int16Array(bytes(d.pos).buffer),
    nor = new Int8Array(bytes(d.nor).buffer),
    uv = new Uint16Array(bytes(d.uv).buffer),
    si = bytes(d.si),
    sw = bytes(d.sw),
    idx = d.big ? new Uint32Array(bytes(d.idx).buffer) : new Uint16Array(bytes(d.idx).buffer);
  const P = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i++) P[i] = pos[i] * d.scale;
  const N = new Float32Array(nor.length);
  for (let i = 0; i < nor.length; i++) N[i] = nor[i] / 127;
  const U = new Float32Array(uv.length);
  for (let i = 0; i < uv.length; i++) U[i] = uv[i] / 65535;
  const W = new Float32Array(sw.length);
  for (let i = 0; i < sw.length; i++) W[i] = sw[i] / 255;
  g.setAttribute('position', new T.BufferAttribute(P, 3));
  g.setAttribute('normal', new T.BufferAttribute(N, 3));
  g.setAttribute('uv', new T.BufferAttribute(U, 2));
  g.setAttribute('skinIndex', new T.Uint16BufferAttribute(Array.from(si), 4));
  g.setAttribute('skinWeight', new T.BufferAttribute(W, 4));
  g.setIndex(new T.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}
// 0.37: 嘯岳's parts — the same packing without the skin weights (each part rides its own rig group)
export function decodePart(d) {
  const g = new T.BufferGeometry(),
    pos = new Int16Array(bytes(d.pos).buffer),
    nor = new Int8Array(bytes(d.nor).buffer),
    uv = new Uint16Array(bytes(d.uv).buffer),
    idx = d.big ? new Uint32Array(bytes(d.idx).buffer) : new Uint16Array(bytes(d.idx).buffer);
  g.setAttribute(
    'position',
    new T.BufferAttribute(
      Float32Array.from(pos, v => v * d.scale),
      3
    )
  );
  g.setAttribute(
    'normal',
    new T.BufferAttribute(
      Float32Array.from(nor, v => v / 127),
      3
    )
  );
  g.setAttribute(
    'uv',
    new T.BufferAttribute(
      Float32Array.from(uv, v => v / 65535),
      2
    )
  );
  g.setIndex(new T.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}
export async function loadSculpts(version = '', base = new URL('./', import.meta.url).href) {
  const q = version ? '?v=' + version : '';
  await Promise.all([
    ...SCULPT_PLANS.map(plan =>
      fetch(`${base}models/sculpt-${plan}.json` + q)
        .then(r => (r.ok ? r.json() : null))
        .then(d => d && setSculpt(plan, decodeSculpt(d)))
        .catch(() => null)
    ),
    fetch(`${base}models/sculpt-xiaoyue.json` + q)
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setXiaoyueSculpt(Object.fromEntries(Object.entries(d.parts).map(([k, v]) => [k, decodePart(v)]))))
      .catch(() => null)
  ]);
}
