# Protagonist models

The shipped `dist/models/protagonist.glb` (male) and `protagonist-female.glb` (female) were made from the
Microsoft Rocketbox avatars `Professions/Business_Male_06` (texture code `m025`) and
`Professions/Business_Female_04` (`f020`) with `convert.html`.

1. Prepare the textures with ImageMagick:
   - colour and normal maps: `convert X.tga -resize 1024x1024 -quality 88 X.jpg`
   - the opacity map: `convert f020_opacity_color.tga -resize 50% f020_opacity_color.png`
   - leave out the specular maps.
2. Serve the folder described at the top of `convert.html`.
3. Open `convert.html?a=<Avatar>&c=<code>&export` in a browser (headless Chromium works) and write the
   base64 in `window.out.b64` to the GLB file.
