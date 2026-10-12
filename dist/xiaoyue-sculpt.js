// 嘯岳's sculpted body (0.37): a heavy, muscled sabre-tooth in the build of a Smilodon — a deep chest and a hump of
// shoulder muscle, forelimbs far thicker than the hind ones, a short loin tucked up behind the ribs, broad haunches,
// a thick neck and a broad skull with a jutting brow, strong cheeks and the bony flanges of the lower jaw.
// Each part is sculpted in the space of the rig group that moves it (story-models.js), so the idle, the gait and
// the roar keep working: body, the four legs, neck, head, jaw and the two tail segments.
// Primitives as in sculpt.js: { a, b?, ra, rb?, squash? } (sphere, tapered capsule, squashed ellipsoid).

const S = (a, ra, squash) => ({ a, ra, ...(squash ? { squash } : {}) });
const C = (a, b, ra, rb = ra) => ({ a, b, ra, rb });
const mirror = list =>
  list.flatMap(p => [p, { ...p, a: [-p.a[0], p.a[1], p.a[2]], b: p.b && [-p.b[0], p.b[1], p.b[2]] }]);

// body: origin at the rig's (0, 1.55, 0), +z toward the head
const BODY = [
  // rib cage and the deep chest
  S([0, 0.02, 0.45], 0.66, [1.0, 1.12, 1.18]),
  C([0, 0.05, 0.35], [0, 0.12, -0.45], 0.6, 0.48),
  // the hump of shoulder muscle over the withers, and the shoulder blades
  S([0, 0.6, 0.72], 0.42, [1.35, 0.75, 1.15]),
  ...mirror([S([0.5, 0.24, 0.84], 0.4, [0.9, 1.35, 1.1])]),
  // pectorals rolling down into the forelegs
  ...mirror([S([0.3, -0.38, 1.0], 0.3, [1, 1.1, 0.9])]),
  // the loin, tucked up behind the ribs
  C([0, 0.22, -0.4], [0, 0.26, -0.95], 0.4, 0.42),
  // pelvis and the broad haunches
  S([0, 0.32, -1.08], 0.42, [1.1, 0.9, 1]),
  ...mirror([S([0.34, 0.12, -1.08], 0.4, [0.85, 1.15, 1.05])]),
  // the ridge of the spine
  C([0, 0.68, 0.55], [0, 0.6, -1.0], 0.16, 0.14),
  // the upper limbs grow out of the body (the legs below the elbow and the knee swing on their own)
  ...mirror([C([0.48, 0.05, 0.92], [0.48, -0.66, 0.96], 0.31, 0.25)]), // shoulder and upper arm
  ...mirror([S([0.48, -0.36, 0.86], 0.28, [0.85, 1.25, 1.0])]), // triceps
  ...mirror([S([0.42, -0.1, -1.08], 0.38, [0.85, 1.3, 1.15])]) // thigh
];

// front leg: pivot at the shoulder; mighty forearms (Smilodon's killing tools)
const FORE = [
  S([0, -0.66, 0.04], 0.25, [1, 0.9, 1]), // elbow
  C([0, -0.7, 0.05], [0, -1.28, 0.1], 0.23, 0.15), // forearm
  S([0, -0.9, 0.12], 0.22, [0.95, 1.3, 1.0]), // forearm muscle
  S([0, -1.4, 0.18], 0.22, [1.15, 0.55, 1.4]) // the broad paw
];
// hind leg: pivot at the hip; below the knee — a shank, a hock bent back
const HIND = [
  S([0, -0.5, -0.06], 0.24, [0.9, 1, 1]), // knee
  C([0, -0.5, -0.06], [0, -0.95, -0.28], 0.22, 0.13), // shank
  S([0, -0.66, -0.16], 0.18, [0.9, 1.4, 1.0]), // calf
  C([0, -0.95, -0.28], [0, -1.36, -0.02], 0.12, 0.1), // hock to paw
  S([0, -1.42, 0.08], 0.18, [1.1, 0.55, 1.35])
];
// neck: pivot at (0, 1.95, 1.25) on the rig; the head sits at (0, 0.35, 0.65)
const NECK = [C([0, -0.3, -0.35], [0, 0.28, 0.48], 0.6, 0.42), S([0, 0.18, 0.05], 0.46, [1.25, 0.9, 1.1])];
// head: its own origin; +z the muzzle
const HEAD = [
  S([0, 0, 0], 0.46, [1.15, 0.82, 1.04]), // skull, broad and low
  ...mirror([S([0.33, -0.1, 0.12], 0.25, [1, 0.85, 1.05])]), // heavy cheeks
  C([0, -0.07, 0.24], [0, -0.12, 0.52], 0.25, 0.2), // a short, deep muzzle
  C([0, 0.07, 0.18], [0, 0.0, 0.52], 0.13, 0.1), // nose bridge
  ...mirror([C([0.07, 0.13, 0.36], [0.32, 0.23, 0.22], 0.12, 0.09)]), // the brow, slanting down to the nose: a scowl
  S([0, 0.25, -0.1], 0.32, [1.15, 0.5, 1.2]) // the crown's muscle
];
// lower jaw: its own origin; the sagittal flanges that guard the sabres
const JAW = [C([0, -0.05, 0], [0, -0.09, 0.42], 0.15, 0.12), ...mirror([S([0.1, -0.16, 0.42], 0.08, [0.7, 1.4, 1])])];
// tail: thick at the root, two segments
const TAIL = [C([0, 0, 0], [0, -0.2, -0.45], 0.16, 0.12), C([0, -0.2, -0.45], [0, -0.45, -0.85], 0.12, 0.1)];
const TAIL2 = [C([0, 0, 0], [0, -0.2, -0.35], 0.1, 0.08), C([0, -0.2, -0.35], [0, -0.15, -0.7], 0.08, 0.1)];

export const XIAOYUE_PARTS = {
  body: BODY,
  fore: FORE,
  hind: HIND,
  neck: NECK,
  head: HEAD,
  jaw: JAW,
  tail: TAIL,
  tail2: TAIL2
};
// the parts that stay smooth-skinned fur (the rest is decoration added in story-models.js)
export const XIAOYUE_PART_IDS = Object.keys(XIAOYUE_PARTS);
