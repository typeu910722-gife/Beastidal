// Static batching (optimisation round 1): meshes that never move again are merged, one mesh per material, so a
// statue built from two hundred parts draws in three calls instead of two hundred. Materials are kept as they are
// (shared material animations such as glowing windows still work); anything listed in `skip` is left alone.
import * as T from './vendor/three.module.min.js';
import { mergeGeometries } from './vendor/addons/utils/BufferGeometryUtils.js';

const KEEP = ['position', 'normal', 'uv'];
// Returns how many meshes were merged away. `root` keeps its transform; its baked meshes become direct children.
export function bakeStatic(root, { skip = new Set() } = {}) {
  root.updateMatrixWorld(true);
  const toLocal = new T.Matrix4().copy(root.matrixWorld).invert(),
    buckets = new Map(),
    m = new T.Matrix4();
  const skipped = o => {
    for (let p = o; p && p !== root; p = p.parent) if (skip.has(p) || p.userData.noBake) return true;
    return false;
  };
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.morphTargetInfluences || !o.geometry) return;
    if (Array.isArray(o.material) || skipped(o)) return;
    // hidden parts stay hidden: they are simply dropped
    // (only inside `root`: the root itself may be hidden for now, like the town until you get there)
    for (let p = o; p && p !== root; p = p.parent) if (!p.visible) return (o.userData.bakeDrop = true);
    const key = o.material.uuid + '|' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0);
    if (!buckets.has(key))
      buckets.set(key, { material: o.material, cast: o.castShadow, receive: o.receiveShadow, list: [] });
    buckets.get(key).list.push(o);
  });
  let merged = 0;
  const drop = [];
  for (const b of buckets.values()) {
    if (b.list.length < 2) continue;
    const geos = [],
      keep = b.material.vertexColors ? [...KEEP, 'color'] : KEEP;
    for (const o of b.list) {
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const name of Object.keys(g.attributes)) if (!keep.includes(name)) g.deleteAttribute(name);
      if (!g.attributes.normal) g.computeVertexNormals();
      g.applyMatrix4(m.multiplyMatrices(toLocal, o.matrixWorld));
      geos.push(g);
    }
    // every piece must carry the same attributes to merge
    const shared = keep.filter(name => geos.every(g => g.attributes[name]));
    for (const g of geos)
      for (const name of Object.keys(g.attributes)) if (!shared.includes(name)) g.deleteAttribute(name);
    const geo = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!geo) continue;
    const mesh = new T.Mesh(geo, b.material);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    mesh.userData.baked = b.list.length;
    root.add(mesh);
    drop.push(...b.list);
    merged += b.list.length - 1;
  }
  root.traverse(o => o.userData.bakeDrop && drop.push(o));
  for (const o of drop) o.parent?.remove(o);
  // groups emptied by the merge go too
  const empty = [];
  root.traverse(o => o !== root && o.isGroup && !o.children.length && !skipped(o) && empty.push(o));
  for (const o of empty) o.parent?.remove(o);
  return merged;
}
