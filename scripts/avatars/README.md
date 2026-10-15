# Protagonist models

The shipped `dist/models/protagonist.glb` (male) and `protagonist-female.glb` (female) were made from the
Microsoft Rocketbox avatars `Professions/Business_Male_06` (texture code `m025`) and
`Professions/Business_Female_04` (`f020`) with `convert.html`; 晴's `dist/models/guide-qing.glb` from
`Professions/Medical_Female_01` (`f152`) the same way (0.59).

1. Prepare the textures with ImageMagick:
   - colour and normal maps: `convert X.tga -resize 1024x1024 -quality 88 X.jpg`
   - the opacity map: `convert f020_opacity_color.tga -resize 50% f020_opacity_color.png`
   - leave out the specular maps.
2. Serve the folder described at the top of `convert.html`.
3. Open `convert.html?a=<Avatar>&c=<code>&export` in a browser (headless Chromium works) and write the
   base64 in `window.out.b64` to the GLB file.

`convert.html` uses the bare specifier `three`: serve it with an import map
(`{"imports":{"three":"./build/three.module.js","three/addons/":"./jsm/"}}`) added above its module script.
