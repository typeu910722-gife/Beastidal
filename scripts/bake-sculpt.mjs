// Bakes the sculpted bodies of the standing 御獸 into dist/models/sculpt-<plan>.json.
//   node scripts/bake-sculpt.mjs [cell]        (cell size in metres, default 0.02)
import { writeFileSync, mkdirSync } from 'node:fs';
import { uprightPrims, SCULPT_BONES } from '../dist/creatures.js';
import { sculpt } from '../dist/sculpt.js';
import { SCULPT_PLANS } from '../dist/sculpt-assets.js';

const cell = Number(process.argv[2]) || 0.02;
mkdirSync('dist/models', { recursive: true });
const b64 = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
for (const plan of SCULPT_PLANS) {
  const t0 = Date.now(),
    g = sculpt(uprightPrims(plan), { cell, blend: 0.07, boneCount: SCULPT_BONES.length }),
    P = g.attributes.position.array,
    scale = Math.max(...P.map(Math.abs)) / 32000,
    pos = Int16Array.from(P, v => Math.round(v / scale)),
    nor = Int8Array.from(g.attributes.normal.array, v => Math.round(v * 127)),
    uv = Uint16Array.from(g.attributes.uv.array, v => Math.round(Math.min(1, Math.max(0, v)) * 65535)),
    si = Uint8Array.from(g.attributes.skinIndex.array),
    sw = Uint8Array.from(g.attributes.skinWeight.array, v => Math.round(v * 255)),
    n = P.length / 3,
    big = n > 65535,
    idx = big ? Uint32Array.from(g.index.array) : Uint16Array.from(g.index.array);
  const file = `dist/models/sculpt-${plan}.json`;
  writeFileSync(
    file,
    JSON.stringify({
      plan,
      cell,
      scale,
      big,
      pos: b64(pos),
      nor: b64(nor),
      uv: b64(uv),
      si: b64(si),
      sw: b64(sw),
      idx: b64(idx)
    })
  );
  console.log(`${file}: ${n} vertices, ${g.index.count / 3} triangles, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
