// Bakes 嘯岳's sculpted parts (dist/xiaoyue-sculpt.js) into dist/models/sculpt-xiaoyue.json.
//   node scripts/bake-xiaoyue.mjs [cell]        (cell size in metres, default 0.035)
import { writeFileSync, mkdirSync } from 'node:fs';
import { sculpt } from '../dist/sculpt.js';
import { XIAOYUE_PARTS } from '../dist/xiaoyue-sculpt.js';

const cell = Number(process.argv[2]) || 0.035;
mkdirSync('dist/models', { recursive: true });
const b64 = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
const parts = {};
let verts = 0,
  tris = 0;
for (const [id, prims] of Object.entries(XIAOYUE_PARTS)) {
  const g = sculpt(prims, { cell, blend: 0.12, boneCount: 1 }),
    P = g.attributes.position.array,
    scale = Math.max(...P.map(Math.abs)) / 32000,
    n = P.length / 3,
    big = n > 65535;
  parts[id] = {
    scale,
    big,
    pos: b64(Int16Array.from(P, v => Math.round(v / scale))),
    nor: b64(Int8Array.from(g.attributes.normal.array, v => Math.round(v * 127))),
    uv: b64(Uint16Array.from(g.attributes.uv.array, v => Math.round(Math.min(1, Math.max(0, v)) * 65535))),
    idx: b64(big ? Uint32Array.from(g.index.array) : Uint16Array.from(g.index.array))
  };
  verts += n;
  tris += g.index.count / 3;
}
writeFileSync('dist/models/sculpt-xiaoyue.json', JSON.stringify({ cell, parts }));
console.log(
  `dist/models/sculpt-xiaoyue.json: ${Object.keys(parts).length} parts, ${verts} vertices, ${tris} triangles`
);
