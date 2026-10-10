// Item icons for the grid inventories: small, readable SVG pictograms (a log, an ingot, a gem …) instead of
// typographic glyphs, so a slot reads at a glance like a Minecraft-style inventory.
const svg = body =>
  `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" shape-rendering="geometricPrecision">${body}</svg>`;
export const ICONS = {
  wood: svg(
    '<rect x="4" y="11" width="22" height="11" rx="2" fill="#8a5a33"/><path d="M6 13h18M6 17h16M6 20h18" stroke="#6b4325" stroke-width="1.2"/><ellipse cx="26" cy="16.5" rx="3.6" ry="5.5" fill="#d9a96a"/><ellipse cx="26" cy="16.5" rx="2" ry="3.2" fill="none" stroke="#a87440" stroke-width="1"/><circle cx="26" cy="16.5" r=".8" fill="#a87440"/>'
  ),
  metal: svg(
    '<path d="M5 22l4-9h14l4 9z" fill="#8a9aa3"/><path d="M9 13h14l-2.5-3h-9z" fill="#c3d0d6"/><path d="M5 22h22v2H5z" fill="#5f6e76"/><path d="M11 15.5h7" stroke="#e6eef1" stroke-width="1.2" stroke-linecap="round"/>'
  ),
  fiber: svg(
    '<path d="M10 26c1-6 0-12-3-18M14 26c0-7 0-13-1-19M18 26c0-7 1-13 3-19M22 26c-1-6 1-11 4-16" stroke="#7fb05a" stroke-width="2.2" fill="none" stroke-linecap="round"/><rect x="8.5" y="18" width="15" height="3.4" rx="1.6" fill="#c9a86a"/>'
  ),
  crystal: svg(
    '<path d="M16 3l8 9-8 17-8-17z" fill="#7fe0e6"/><path d="M16 3l8 9h-16z" fill="#c4f6f6"/><path d="M16 12v17l8-17z" fill="#48aeb8"/><path d="M12 12l4-6" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>'
  ),
  food: svg(
    '<circle cx="16" cy="17" r="10" fill="#7b5634"/><circle cx="16" cy="17" r="7.2" fill="#f1e6cc"/><circle cx="16" cy="17" r="3" fill="#e9dcb8"/><path d="M11 9c2-3 5-4 7-3" stroke="#5c7d3a" stroke-width="2" fill="none" stroke-linecap="round"/>'
  ),
  water: svg(
    '<path d="M12 6h8v4l3 4v12a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3V14l3-4z" fill="#cfe7ef" opacity=".9"/><path d="M10 18h12v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z" fill="#4fa6d6"/><rect x="11.5" y="3.5" width="9" height="3.5" rx="1" fill="#8a6a45"/><path d="M13 20.5c1 1 2 1 3 0" stroke="#bfe6fb" stroke-width="1.2" fill="none" stroke-linecap="round"/>'
  ),
  bait: svg(
    '<path d="M20 5v12a5 5 0 0 1-10 0" stroke="#b9c3c9" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M10 17l-2-2" stroke="#b9c3c9" stroke-width="2" stroke-linecap="round"/><path d="M7 24c3-4 6 3 9-1s6 2 9-2" stroke="#e48c8f" stroke-width="3" fill="none" stroke-linecap="round"/>'
  ),
  contract: svg(
    '<rect x="8" y="5" width="16" height="22" rx="2" fill="#efe0b9"/><rect x="6" y="4" width="20" height="4" rx="2" fill="#c9a86a"/><rect x="6" y="24" width="20" height="4" rx="2" fill="#c9a86a"/><path d="M11 12h10M11 15.5h10M11 19h7" stroke="#8a6a45" stroke-width="1.2"/><circle cx="21" cy="20.5" r="2.4" fill="#b64a3c"/>'
  )
};
// Unknown items still get a tidy tile with their glyph.
export const iconFor = (key, glyph = '?') =>
  ICONS[key] || svg(`<text x="16" y="22" text-anchor="middle" font-size="16" fill="#e6efe9">${glyph}</text>`);
