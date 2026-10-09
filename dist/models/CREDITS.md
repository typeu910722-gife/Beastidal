# Model credits

## protagonist.glb and protagonist-female.glb

- The two office workers are `Business_Male_06` and `Business_Female_04` from the **Microsoft Rocketbox Avatar
  Library** (https://github.com/microsoft/Microsoft-Rocketbox), released under the MIT License, Copyright (c) 2020
  Microsoft.
- Changes for this game:
  - converted from FBX to GLB;
  - textures resized to 1024 px; specular maps dropped;
  - bones renamed to Mixamo names;
  - Idle / Walk / Run clips added.
- The clips are retargeted from the Idle / Walk / Run animations of the three.js example `Soldier.glb` (Adobe
  Mixamo, https://www.mixamo.com). Mixamo animations may be used royalty-free in games but may not be
  redistributed as standalone assets.
- The game loads these files at runtime. If they are missing, it uses the procedural figure from `human.js`.

MIT License (Microsoft Rocketbox):

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
> documentation files (the "Software"), to deal in the Software without restriction, including without limitation
> the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
> to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above
> copyright notice and this permission notice shall be included in all copies or substantial portions of the
> Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.

## Loader code

`dist/vendor/addons/` holds GLTFLoader, BufferGeometryUtils and SkeletonUtils from three.js r180 (MIT, see
`dist/vendor/THREE-LICENSE.txt`), with the `three` import pointed at the vendored build.
