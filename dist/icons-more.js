// 0.38: hand-drawn pictograms for every other item — creature drops, catches, what the work table makes, and gear —
// so no slot shows an emoji. Same 32 × 32 grid and palette as icons.js.
const svg = body =>
  `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" shape-rendering="geometricPrecision">${body}</svg>`;
const fish = (body, fin, eye = '#1b2a33') =>
  `<path d="M4 16c4-6 13-7 19-2l5-4v12l-5-4c-6 5-15 4-19-2z" fill="${body}"/><path d="M12 11l3-4 3 5z" fill="${fin}"/><circle cx="9" cy="15" r="1.3" fill="${eye}"/>`;
export const MORE_ICONS = {
  // sea drops
  finblade: svg(
    '<path d="M6 26C10 16 16 8 27 5c-3 9-9 16-21 21z" fill="#e8e2d0"/><path d="M6 26c6-6 12-12 21-21" stroke="#a89c80" stroke-width="1.4"/><path d="M5 27l3-3" stroke="#6b4325" stroke-width="3" stroke-linecap="round"/>'
  ),
  raywing: svg(
    '<path d="M16 9c-6 0-12 4-13 9 5-1 9 0 13 6 4-6 8-7 13-6-1-5-7-9-13-9z" fill="#8f9fc8"/><path d="M16 10v14M9 14l7 4 7-4" stroke="#c9d3ef" stroke-width="1" fill="none" opacity=".8"/><path d="M16 24l1 5" stroke="#5f6e9a" stroke-width="1.5" stroke-linecap="round"/>'
  ),
  slime: svg(
    '<path d="M6 22c0-7 4-14 10-14s10 7 10 14c0 3-3 5-10 5S6 25 6 22z" fill="#8fe3c9" opacity=".85"/><ellipse cx="12" cy="15" rx="2.6" ry="3.4" fill="#e9fff6" opacity=".8"/><circle cx="20" cy="20" r="1.6" fill="#e9fff6" opacity=".7"/><path d="M9 26c0 2 1 3 2 3" stroke="#8fe3c9" stroke-width="2" stroke-linecap="round"/>'
  ),
  shellplate: svg(
    '<path d="M16 5l10 5v10l-10 7-10-7V10z" fill="#7d8a52"/><path d="M16 9l6 3v6l-6 4-6-4v-6z" fill="#a9b56a"/><path d="M16 5v4M26 10l-4 2M26 20l-4-2M16 27v-5M6 20l4-2M6 10l4 2" stroke="#55603a" stroke-width="1.2"/>'
  ),
  silverscale: svg(
    '<path d="M16 4c6 4 9 9 9 14a9 9 0 0 1-18 0c0-5 3-10 9-14z" fill="#d7e3ea"/><path d="M16 8c3 3 5 6 5 10" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M10 20c2 3 10 3 12 0" stroke="#9fb3c0" stroke-width="1.2" fill="none"/>'
  ),
  coralbit: svg(
    '<path d="M16 28V17M16 20l-6-6M10 14V8M10 14l-4-2M16 17l6-7M22 10l1-5M22 10l4 1M16 22l5 1" stroke="#ef7f78" stroke-width="3" stroke-linecap="round" fill="none"/><ellipse cx="16" cy="28" rx="6" ry="2" fill="#c96a63"/>'
  ),
  // deep drops
  deepscale: svg(
    '<path d="M16 4l10 6v8c0 5-4 9-10 10-6-1-10-5-10-10v-8z" fill="#3c5a7a"/><path d="M16 8l6 4v6c0 3-2 5-6 6-4-1-6-3-6-6v-6z" fill="#5d86ad"/><path d="M12 14l4-3 4 3" stroke="#9cc6ea" stroke-width="1.4" fill="none"/>'
  ),
  fang: svg(
    '<path d="M11 5h10c0 9-2 17-5 23-3-6-5-14-5-23z" fill="#f1ead6"/><path d="M11 5h10v3H11z" fill="#c9b994"/><path d="M14 10c0 5 1 10 2 14" stroke="#fff" stroke-width="1.2" fill="none" opacity=".8"/>'
  ),
  sucker: svg(
    '<path d="M4 20c4-8 20-8 24 0" stroke="#c46e8f" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="10" cy="16" r="3" fill="#f1b8cb"/><circle cx="10" cy="16" r="1.2" fill="#c46e8f"/><circle cx="17" cy="14" r="3" fill="#f1b8cb"/><circle cx="17" cy="14" r="1.2" fill="#c46e8f"/><circle cx="23.5" cy="17" r="2.6" fill="#f1b8cb"/><circle cx="23.5" cy="17" r="1" fill="#c46e8f"/>'
  ),
  crabclaw: svg(
    '<path d="M6 26c2-8 6-12 12-13l6-7c3 2 4 6 2 9l-5 3c-2 5-7 8-15 8z" fill="#d9573f"/><path d="M18 13l7-7c1 2 0 4-2 5z" fill="#f08a6e"/><path d="M8 25c3-1 6-4 8-8" stroke="#a63c2a" stroke-width="1.2" fill="none"/>'
  ),
  spiralshell: svg(
    '<path d="M5 24c0-10 6-18 14-18 5 0 8 4 8 8 0 6-5 9-9 9-3 0-5-2-5-5 0-2 2-4 4-4" stroke="#e7c9a2" stroke-width="3" fill="#c79a6a" stroke-linecap="round"/><path d="M5 24h20l-3 3H8z" fill="#a8774c"/>'
  ),
  glowsac: svg(
    '<circle cx="16" cy="17" r="11" fill="#7fe8c8" opacity=".25"/><path d="M16 6c6 0 9 5 9 10 0 6-4 10-9 10s-9-4-9-10c0-5 3-10 9-10z" fill="#9ff3d5"/><circle cx="13" cy="13" r="2.4" fill="#f0fff9"/><path d="M16 26v3" stroke="#5aa58a" stroke-width="2" stroke-linecap="round"/>'
  ),
  inksac: svg(
    '<path d="M16 5c5 4 9 9 9 14a9 9 0 0 1-18 0c0-5 4-10 9-14z" fill="#2d2840"/><circle cx="12.5" cy="16" r="2.2" fill="#5b5480"/><path d="M10 27c2 2 4 2 6 0" stroke="#2d2840" stroke-width="2" fill="none" stroke-linecap="round"/>'
  ),
  // land drops
  hide: svg(
    '<path d="M8 6c3 2 13 2 16 0l2 5-2 4 2 6-2 5c-3-2-13-2-16 0l-2-5 2-6-2-4z" fill="#a5754b"/><path d="M11 11c3 1 7 1 10 0M11 21c3-1 7-1 10 0" stroke="#7d5433" stroke-width="1.3" fill="none"/>'
  ),
  lizardscale: svg(
    '<path d="M6 8h20v16H6z" fill="#4f8a5a" rx="2"/><path d="M6 13h20M6 18h20M11 8v5M16 13v5M21 8v5M11 18v6M21 18v6" stroke="#2f5c38" stroke-width="1.3"/><path d="M8 10h2M18 15h2" stroke="#8fd19a" stroke-width="1.2"/>'
  ),
  antler: svg(
    '<path d="M16 28V14M16 14l-6-6M10 8V4M10 8l-4-1M16 18l7-6M23 12l2-5M23 12l4 1" stroke="#d9c3a0" stroke-width="2.8" stroke-linecap="round" fill="none"/><path d="M24 7l2-2" stroke="#9ff0f0" stroke-width="2.4" stroke-linecap="round"/>'
  ),
  feather: svg(
    '<path d="M24 4C12 6 7 15 8 26c8-2 15-8 16-22z" fill="#e7eef2"/><path d="M8 28L22 7" stroke="#9fb3c0" stroke-width="1.4"/><path d="M12 19l5 1M14 15l5 1M17 11l4 1" stroke="#c3d0d8" stroke-width="1"/>'
  ),
  armorplate: svg(
    '<path d="M6 10c4-4 16-4 20 0v8c-4 6-16 6-20 0z" fill="#8c7a66"/><path d="M6 13c5 3 15 3 20 0M6 17c5 3 15 3 20 0" stroke="#5e5040" stroke-width="1.4" fill="none"/><path d="M10 9c3-1 9-1 12 0" stroke="#c1ad94" stroke-width="1.2" fill="none"/>'
  ),
  bone: svg(
    '<path d="M9 22l13-13" stroke="#eee5cf" stroke-width="4" stroke-linecap="round"/><circle cx="7" cy="22" r="2.6" fill="#eee5cf"/><circle cx="10" cy="25" r="2.6" fill="#eee5cf"/><circle cx="22" cy="7" r="2.6" fill="#eee5cf"/><circle cx="25" cy="10" r="2.6" fill="#eee5cf"/>'
  ),
  fat: svg(
    '<path d="M5 18l6-8h16l-4 8z" fill="#f4e3a8"/><path d="M5 18h18v6H5z" fill="#e8cf82"/><path d="M23 18l4-8v6l-4 8z" fill="#d4b768"/>'
  ),
  // flora drops
  vine: svg(
    '<path d="M6 28c0-8 8-6 8-13s6-8 12-9" stroke="#4f9a4a" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M10 20c-3-1-4-4-3-6 3 0 4 3 3 6zM16 12c0-3 2-5 5-5 0 3-2 5-5 5zM22 7c1-2 3-3 5-2-1 2-3 3-5 2z" fill="#7cc76a"/>'
  ),
  spore: svg(
    '<path d="M6 16c0-6 5-10 10-10s10 4 10 10z" fill="#b880d8"/><path d="M13 16h6v10h-6z" fill="#efe4d0"/><circle cx="12" cy="11" r="1.8" fill="#f1dcff"/><circle cx="19" cy="10" r="1.4" fill="#f1dcff"/><circle cx="25" cy="7" r="1" fill="#e0b8ff"/><circle cx="7" cy="7" r=".9" fill="#e0b8ff"/>'
  ),
  nectar: svg(
    '<path d="M9 11h14v13a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4z" fill="#f2b33d"/><path d="M8 9h16v3H8z" fill="#c98a2a"/><path d="M12 6c2 0 3 1 3 3h2c0-2 1-3 3-3" stroke="#c98a2a" stroke-width="1.6" fill="none"/><path d="M12 16v6" stroke="#ffe3a0" stroke-width="1.6" stroke-linecap="round"/>'
  ),
  leaf: svg(
    '<path d="M6 26C6 13 14 6 27 5c0 13-8 21-21 21z" fill="#6cbf5a"/><path d="M6 26L25 7M12 20l-1-5M17 15l-1-5M12 20l5 0M17 15l5 0" stroke="#3f8a3a" stroke-width="1.3" fill="none"/>'
  ),
  root: svg(
    '<path d="M16 4v10M16 14c-2 5-6 8-10 10M16 14c1 5 4 9 9 12M16 14v13" stroke="#8a5f3a" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M10 21l-3-1M22 22l3 0M16 22l-2 2" stroke="#8a5f3a" stroke-width="1.6" stroke-linecap="round"/>'
  ),
  fruit: svg(
    '<circle cx="16" cy="18" r="9" fill="#e9b04a"/><path d="M10 15c1-3 4-4 6-4" stroke="#fde6a0" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M16 9V6" stroke="#6b4325" stroke-width="1.8" stroke-linecap="round"/><path d="M16 7c3-3 6-3 8-1-3 2-5 2-8 1z" fill="#6cbf5a"/>'
  ),
  moss: svg(
    '<ellipse cx="16" cy="22" rx="12" ry="6" fill="#3f7a3a"/><circle cx="10" cy="19" r="4" fill="#5e9e4a"/><circle cx="17" cy="17" r="5" fill="#6cbf5a"/><circle cx="23" cy="20" r="3.6" fill="#5e9e4a"/><path d="M8 26h16" stroke="#2f5c2a" stroke-width="1.4"/>'
  ),
  // the work table
  cookedfish: svg(
    fish('#c98a4a', '#9a5f2a', '#2a1a10') +
      '<path d="M9 18l3-4M13 19l3-5M17 19l3-5" stroke="#7a4a1e" stroke-width="1.4"/>'
  ),
  stew: svg(
    '<path d="M5 15h22c0 7-5 12-11 12S5 22 5 15z" fill="#6b4a33"/><ellipse cx="16" cy="15" rx="11" ry="3" fill="#c9773a"/><circle cx="12" cy="15" r="1.5" fill="#f1d38a"/><circle cx="19" cy="14.5" r="1.3" fill="#7cc76a"/><path d="M12 10c0-2 2-2 2-4M18 10c0-2 2-2 2-4" stroke="#d9e4e8" stroke-width="1.3" fill="none" opacity=".7"/>'
  ),
  jam: svg(
    '<path d="M9 10h14v15a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3z" fill="#7a3a8a"/><path d="M8 7h16v4H8z" fill="#e8d3a8"/><path d="M8 7l2-2h12l2 2" fill="#c9a86a"/><path d="M12 15v7" stroke="#c48ad6" stroke-width="1.6" stroke-linecap="round"/>'
  ),
  salve: svg(
    '<ellipse cx="16" cy="21" rx="10" ry="5" fill="#d7c9a8"/><path d="M6 17h20v4H6z" fill="#d7c9a8"/><ellipse cx="16" cy="17" rx="10" ry="4" fill="#8fc98a"/><path d="M13 17h6M16 14.5v5" stroke="#f4fff2" stroke-width="1.6" stroke-linecap="round"/>'
  ),
  rope: svg(
    '<circle cx="16" cy="16" r="9" fill="none" stroke="#c9a86a" stroke-width="4"/><circle cx="16" cy="16" r="9" fill="none" stroke="#8a6a45" stroke-width="1" stroke-dasharray="2 3"/><path d="M24 20l4 6" stroke="#c9a86a" stroke-width="3" stroke-linecap="round"/>'
  ),
  leather: svg(
    '<path d="M6 8h20v16H6z" fill="#8a5a33"/><path d="M8 10h16v12H8z" fill="none" stroke="#d9a96a" stroke-width="1" stroke-dasharray="2 1.5"/><path d="M6 8l-2 3M26 8l2 3M6 24l-2-3M26 24l2-3" stroke="#8a5a33" stroke-width="2" stroke-linecap="round"/>'
  ),
  cloth: svg(
    '<path d="M5 9h17v15H5z" fill="#cfd9df"/><path d="M5 12h17M5 16h17M5 20h17M9 9v15M13 9v15M17 9v15" stroke="#9fb0ba" stroke-width=".8"/><path d="M22 9c3 0 5 2 5 5v10h-5z" fill="#b5c2ca"/>'
  ),
  charcoal: svg(
    '<path d="M5 22l3-8 7-3 9 2 3 7-5 5H10z" fill="#2c2a2a"/><path d="M9 15l5-2M17 14l5 1M12 20l6 0" stroke="#5a5656" stroke-width="1.3"/><circle cx="21" cy="19" r="1.2" fill="#e8743a"/>'
  ),
  nails: svg(
    '<path d="M9 6h6M12 6v20M18 8h6M21 8v18" stroke="#a9b6bd" stroke-width="2.2" stroke-linecap="round"/><path d="M12 26l-1-2h2zM21 26l-1-2h2z" fill="#a9b6bd"/>'
  ),
  glass: svg(
    '<path d="M7 6h18v20H7z" fill="#bfe6ef" opacity=".55" stroke="#e6fbff" stroke-width="1.4"/><path d="M11 10l6 6M11 15l3 3" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".9"/>'
  ),
  crystaldust: svg(
    '<ellipse cx="16" cy="23" rx="10" ry="4" fill="#5fc9d1"/><path d="M8 22c3-4 13-4 16 0" fill="#9ff0f0"/><path d="M10 10l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM21 7l.8 1.6 1.6.8-1.6.8L21 12l-.8-1.6-1.6-.8 1.6-.8zM16 14l.6 1.2 1.2.6-1.2.6-.6 1.2-.6-1.2-1.2-.6 1.2-.6z" fill="#e8ffff"/>'
  ),
  torch: svg(
    '<path d="M14 14h4l-1 14h-2z" fill="#8a5a33"/><path d="M12 13h8l-1 3h-6z" fill="#e8cf82"/><path d="M16 3c4 3 5 6 3 9h-6c-2-3 0-6 3-9z" fill="#f08a3a"/><path d="M16 6c2 2 2 4 1 6h-2c-1-2-1-4 1-6z" fill="#ffd36a"/>'
  ),
  lantern: svg(
    '<path d="M12 4h8M16 4v3" stroke="#6b4a2a" stroke-width="2" stroke-linecap="round"/><path d="M10 9h12l-1 15H11z" fill="#9ff3d5" opacity=".85"/><path d="M9 7h14v3H9zM9 24h14v3H9z" fill="#8a6a45"/><circle cx="16" cy="16.5" r="3" fill="#f0fff9"/>'
  ),
  cage: svg(
    '<path d="M7 12c0-5 4-8 9-8s9 3 9 8v14H7z" fill="none" stroke="#c9a86a" stroke-width="2"/><path d="M11 6v20M16 4v22M21 6v20M7 18h18" stroke="#c9a86a" stroke-width="1.4"/><path d="M5 26h22v2H5z" fill="#8a6a45"/>'
  ),
  // catches
  fish: svg(fish('#7fb2c9', '#4f86a0')),
  bigfish: svg(
    fish('#4f7fa8', '#2f5c80') + '<path d="M6 16c3 3 8 4 12 3" stroke="#a9cbe0" stroke-width="1.4" fill="none"/>'
  ),
  pearl: svg(
    '<path d="M4 22c4-6 20-6 24 0-4 4-20 4-24 0z" fill="#b9c3c9"/><circle cx="16" cy="17" r="6" fill="#f4f1ea"/><circle cx="14" cy="15" r="1.8" fill="#fff"/>'
  ),
  // the backpack (the bag's load in the top bar)
  pack: svg(
    '<path d="M9 11c0-4 3-6 7-6s7 2 7 6v14a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2z" fill="#7a6a4a"/><path d="M12 11c0-2 2-3 4-3s4 1 4 3" stroke="#5e4f36" stroke-width="1.6" fill="none"/><path d="M11 17h10v6H11z" fill="#9a8760"/><path d="M14 17v2h4v-2" stroke="#5e4f36" stroke-width="1.2" fill="none"/>'
  ),
  // gear
  rod: svg(
    '<path d="M5 28L25 5" stroke="#8a5a33" stroke-width="2.4" stroke-linecap="round"/><path d="M25 5c2 6 2 12 0 17" stroke="#d7e3ea" stroke-width="1" fill="none"/><path d="M25 22c0 3-3 3-3 1" stroke="#b9c3c9" stroke-width="1.6" fill="none"/><circle cx="9" cy="23.5" r="2.4" fill="#5f6e76"/>'
  ),
  mask: svg(
    '<path d="M5 13c0-4 22-4 22 0v6c0 4-4 5-7 5l-4-3-4 3c-3 0-7-1-7-5z" fill="#3c6f8a"/><path d="M8 13.5c0-2 7-2 7 0v4c0 1.5-7 1.5-7 0zM17 13.5c0-2 7-2 7 0v4c0 1.5-7 1.5-7 0z" fill="#bfe6ef"/><path d="M27 12v-6" stroke="#f2b33d" stroke-width="2.4" stroke-linecap="round"/>'
  ),
  hook: svg(
    '<path d="M16 4v14c0 5-8 5-8 0" stroke="#a9b6bd" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M16 18c0 5 8 5 8 0" stroke="#a9b6bd" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M8 18l-2-2M24 18l2-2" stroke="#a9b6bd" stroke-width="2.4" stroke-linecap="round"/><path d="M16 4l3-1" stroke="#c9a86a" stroke-width="2" stroke-linecap="round"/>'
  ),
  saddle: svg(
    '<path d="M4 16c4-6 8-2 12-2s8-4 12 2l-2 6H6z" fill="#8a5a33"/><path d="M8 16c3-2 13-2 16 0" stroke="#d9a96a" stroke-width="1.4" fill="none"/><path d="M12 22v5M20 22v5" stroke="#5f6e76" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="27" r="1.6" fill="#a9b6bd"/><circle cx="20" cy="27" r="1.6" fill="#a9b6bd"/>'
  )
};
