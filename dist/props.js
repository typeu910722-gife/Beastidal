// Blender-built props (scripts/blender/, exported to models/props/*.glb). Each is one vertex-coloured mesh with its
// ambient occlusion baked in, its faces grouped by material: a handful of draw calls where the procedural model was
// dozens. The material names say what each group is made of, and get the same surfaces the procedural models use
// (surfaces.js). Props load in the background; until one arrives, or if it cannot, the procedural model stays.
import { GLTFLoader } from './vendor/addons/loaders/GLTFLoader.js';
import { surface } from './surfaces.js?v=0.72.0';

// material name -> [surface kind, options]: wood-x/y/z have their grain along that axis
const SURFACES = {
  'wood-x': ['wood', { axis: 0 }],
  'wood-y': ['wood', { axis: 1 }],
  'wood-z': ['wood', { axis: 2 }],
  // decks: the same seams and joints the game paints on its own planking
  'deck-x': ['wood', { axis: 0, planks: true }],
  'deck-z': ['wood', { axis: 2, planks: true }],
  rope: ['cloth'],
  cloth: ['cloth'],
  metal: ['metal'],
  // 慈光港 (0.65)
  plaster: ['plaster'],
  stone: ['stone', { blocks: true, clean: true }],
  tile: ['tile'],
  carved: ['stone', { clean: true }]
};

// the same ?v= this module was loaded with, so a rebuilt prop is not served from an old cache
const VERSION = new URL(import.meta.url).search;
const cache = new Map(),
  ready = new Map(); // name -> scene, once loaded: later copies swap in at once, without a frame of the old model

export function loadProp(name) {
  if (!cache.has(name))
    cache.set(
      name,
      new GLTFLoader()
        .loadAsync(new URL(`./models/props/${name}.glb${VERSION}`, import.meta.url).href)
        .then(gltf => {
          gltf.scene.traverse(o => {
            if (!o.isMesh) return;
            o.castShadow = o.receiveShadow = true;
            const [kind, opts] = SURFACES[o.material.name] || [];
            if (kind) surface(o.material, kind, opts);
          });
          ready.set(name, gltf.scene);
          return gltf.scene;
        })
        .catch(err => {
          console.warn(`Prop "${name}" unavailable, keeping the procedural model.`, err);
          return null;
        })
    );
  return cache.get(name);
}

// Replaces a procedural group's static parts with the prop once it has loaded. `keep` lists the children that
// stay: the parts the game moves, hides or animates (a rider, a flag, a lantern). A prop may carry named parts of
// its own that the game drives (a roof that lifts away); `bind` receives them by name, e.g. { roof: mesh }.
export function dressWithProp(group, name, keep = [], bind) {
  // only the procedural parts there now are replaced: anything the game adds to the group while the prop is still
  // loading (a creature in a pen, a label) stays
  const replaced = group.children.filter(c => !keep.includes(c));
  const dress = scene => {
    if (!scene) return false;
    for (const child of replaced) group.remove(child);
    const copy = scene.clone(),
      parts = {};
    // a part with several materials loads as a group of meshes: name the group, not its pieces
    copy.traverse(o => {
      if (o.name && !parts[o.name]) parts[o.name] = o;
    });
    group.add(copy);
    group.userData.prop = name;
    bind?.(parts);
    return true;
  };
  if (ready.has(name)) return Promise.resolve(dress(ready.get(name)));
  return loadProp(name).then(dress);
}
