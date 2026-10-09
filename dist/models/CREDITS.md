# Model credits

## protagonist.glb

- Character "Vanguard" and its Idle / Walk / Run animations come from **Adobe Mixamo** (https://www.mixamo.com),
  as packaged in the three.js examples (`examples/models/gltf/Soldier.glb`, three.js r180,
  https://github.com/mrdoob/three.js).
- Mixamo characters and animations may be used royalty-free in personal, commercial and non-profit projects,
  including games, but may not be redistributed as standalone assets. Check Adobe's current Mixamo terms before
  release.
- The game swaps this file in at runtime; if it is missing, the procedural figure from `human.js` is used.

## Loader code

`dist/vendor/addons/` holds GLTFLoader, BufferGeometryUtils and SkeletonUtils from three.js r180 (MIT, see
`dist/vendor/THREE-LICENSE.txt`), with the `three` import pointed at the vendored build.
