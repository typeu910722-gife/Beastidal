"""The warship 比斯泰德號: the hull, its five decks and the wheelhouse, matching makeWarship() in dist/ship-models.js
piece for piece (the same hull lines, deck heights and fittings, in ship-local game metres, +z the bow).

The game cuts the ship away deck by deck when you go below and hides the wheelhouse's front and roof while you stand
at the wheel, so the model is seven named parts: 'keel', 'band-0' (hold B) .. 'band-4' (the bridge) and 'cab'. What
glows, moves or is see-through stays procedural in the game: the sails, the wheel, the lamps and lanterns, the
porthole glass, the screens and the crystals.
"""
import math

import kit  # imports bpy first
import bpy  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

SHIP_BEAM = 5
DECK_Y = [0.4, 3, 5.6, 8.2, 11]
BAND = 2.6
ZS = [-15 + i * 0.75 for i in range(41)]

HULL, STRAKE, COPPER, TRIM, GOLD = 0x3D2C20, 0x6A4A31, 0x8D5B38, 0x2E7C78, 0xD6B15C
PLANK, CLOTH, ROPE, IRON, RED = 0xBE9866, 0xE6DCC0, 0xD6C19B, 0x3A4448, 0x9E3B32
BOOT = 0xE8E0C8
INSIDE = 0x7A5A3E  # the hull's inner face, seen from the decks


def half_beam(z):
    if z > 4:
        return SHIP_BEAM * math.cos(min(1, (z - 4) / 11) * math.pi / 2)
    if z < -11:
        return SHIP_BEAM * (1 - 0.25 * ((-11 - z) / 4) ** 2)
    return SHIP_BEAM


def flare(y):
    return 0.62 + 0.38 * min(1, max(0, (y + 2) / 9))


def ring(y, inset=0.0):
    right = [(max(0.02, half_beam(z) * flare(y) - inset), z) for z in ZS]
    left = [(-x, z) for x, z in reversed(right)]
    return right + left


def hull_color(y):
    if y < -0.2:
        return COPPER
    if y < 0.15:
        return BOOT
    return HULL if math.floor((y + 0.3) / 0.65) % 2 else STRAKE


# ---------- shapes the kit does not have ----------
def cyl(name, color, x, y, z, r, h, segments=12, kind=None):
    """An upright cylinder centred at (x, y, z), as the game's cyl() helper."""
    return kit.rod(name, color, (x, y - h / 2, z), (x, y + h / 2, z), r, segments=segments, kind=kind or 'wood-y')


def sphere(name, color, x, y, z, r, scale=(1, 1, 1), kind='plain', segs=(12, 8)):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs[0], v_segments=segs[1], radius=r)
    for v in bm.verts:
        gx, gy, gz = v.co.x * scale[0], v.co.z * scale[1], -v.co.y * scale[2]
        v.co = kit.g2b(x + gx, y + gy, z + gz)
    return kit.solid_color(kit.mesh_object(name, bm), color, kind)


def ring_x(name, color, x, y, z, major, minor, kind='metal', yaw=0.0):
    """A ring standing on its edge, its axis along the game's x (a porthole's rim, a cannon's wheel), turned by
    yaw about the game's y so it can lie flat on a curving hull."""
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=14, minor_segments=5)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.transform(Matrix.Rotation(math.pi / 2, 4, 'Y'))  # Blender z (game y) turned onto x
    ob.data.transform(Matrix.Rotation(yaw, 4, 'Z'))
    ob.data.transform(Matrix.Translation(kit.g2b(x, y, z)))
    return kit.solid_color(ob, color, kind)


def flat_ring(name, color, x, y, z, major, minor, kind='rope'):
    return kit.torus(name, color, (x, y, z), major, minor, kind)


def hull_band(name, y0, y1, color_at=hull_color):
    """The hull's skin between two heights, painted by height, with a thickness so the decks see its inside."""
    cuts = sorted({y0, y1, *[v for v in (-0.2, 0.15) if y0 < v < y1],
                   *[(-0.3 + 0.65 * k) for k in range(-6, 20) if y0 < -0.3 + 0.65 * k < y1]})
    bm = bmesh.new()
    rows = [[bm.verts.new(kit.g2b(x, y, z)) for x, z in ring(y)] for y in cuts]
    n = len(rows[0])
    col = bm.loops.layers.color.new('Col')
    for k, (a, b) in enumerate(zip(rows, rows[1:])):
        c = kit.rgb(color_at((cuts[k] + cuts[k + 1]) / 2))
        for i in range(n):
            j = (i + 1) % n
            f = bm.faces.new((a[i], a[j], b[j], b[i]))
            for loop in f.loops:
                loop[col] = (*c, 1.0)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = kit.mesh_object(name, bm)
    mod = ob.modifiers.new('thick', 'SOLIDIFY')
    mod.thickness = 0.1
    mod.offset = -1  # inward: the outside stays on the hull's lines, where the portholes sit
    ob = kit.to_mesh(ob)

    def inside(c, nrm):
        # faces turned towards the ship's centre line are the inner skin
        return kit.rgb(INSIDE) if nrm.x * c.x < -0.02 else None

    ob['kind'] = 'wood-z'
    return kit.paint(ob, inside)


def deck(name, y, color=PLANK, inset=0.12):
    """A deck: the hull's outline at that height, a board thick, its planks running bow to stern."""
    bm = bmesh.new()
    top = [bm.verts.new(kit.g2b(x, y, z)) for x, z in ring(y, inset)]
    bm.faces.new(top)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.triangulate(bm, faces=bm.faces, quad_method='BEAUTY', ngon_method='BEAUTY')
    ob = kit.mesh_object(name, bm)
    mod = ob.modifiers.new('thick', 'SOLIDIFY')
    mod.thickness = 0.1
    mod.offset = -1
    ob = kit.to_mesh(ob)
    ob = kit.solid_color(ob, color, 'deck-z')
    ob['flat'] = True
    return ob


def flag(name, color, x, y, z, w, h):
    """The pennant at a masthead: a thin triangle pointing along +x."""
    bm = bmesh.new()
    t = 0.03
    pts = [(0, h / 2), (0, -h / 2), (w, 0)]
    vs = [[bm.verts.new(kit.g2b(x + px, y + py, z + s)) for px, py in pts] for s in (-t, t)]
    bm.faces.new(vs[0])
    bm.faces.new(list(reversed(vs[1])))
    for i in range(3):
        j = (i + 1) % 3
        bm.faces.new((vs[0][i], vs[0][j], vs[1][j], vs[1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = kit.solid_color(kit.mesh_object(name, bm), color, 'cloth')
    ob['flat'] = True
    return ob


# ---------- the parts ----------
def keel():
    parts = [hull_band('hull-keel', -2.4, 0.4)]
    bm = bmesh.new()
    bm.faces.new([bm.verts.new(kit.g2b(x, -2.4, z)) for x, z in ring(-2.4)])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    parts.append(kit.solid_color(kit.mesh_object('bottom', bm), COPPER, 'wood-z'))
    parts.append(kit.box('keelbeam', HULL, 0, -2.6, 0, 0.35, 0.5, 29, bevel=0.03))
    return parts


def lower_band(d):
    y, top = DECK_Y[d], DECK_Y[d + 1]
    parts = [deck(f'deck{d}', y), hull_band(f'hull{d}', y, top)]
    # ribs follow the hull's flare, just inside its skin
    for z in [-12 + 2.6 * k for k in range(9)]:
        for s in (-1, 1):
            a = (s * (half_beam(z) * flare(y) - 0.26), y, z)
            b = (s * (half_beam(z) * flare(top) - 0.26), top, z)
            parts.append(kit.plank(f'rib{d}{z}{s}', STRAKE, a, b, 0.22, 0.18, kind='wood-y'))
    z = -11
    while z <= 10:
        for s in (-1, 1):
            hb = half_beam(z) * flare(y + 1.4)
            slope = (half_beam(z + 0.1) - half_beam(z - 0.1)) / 0.2 * flare(y + 1.4)
            parts.append(ring_x(f'port{d}{z}{s}', GOLD, s * (hb + 0.02), y + 1.4, z, 0.32, 0.07,
                                yaw=math.atan(s * slope)))
        z += 3.2
    # the ladder up to the deck above, the hatch frame cut into this one
    for s in (-0.32, 0.32):
        parts.append(kit.rod(f'ladder{d}{s}', STRAKE, (1.1 + s, y, 2.6), (1.1 + s, top + 0.2, 1.6), 0.05))
    for k in range(1, 9):
        t = k / 9
        parts.append(kit.box(f'rung{d}{k}', PLANK, 1.1, y + t * (top - y), 2.6 - t, 0.68, 0.05, 0.12))
    if d > 0:
        for zz in (2, 2.65):
            parts.append(kit.box(f'hatch{d}{zz}', STRAKE, -1.1, y + 0.05, zz, 1.3, 0.1, 0.12))
        parts.append(kit.box(f'hole{d}', 0x1A120C, -1.1, y + 0.03, 2.3, 1.1, 0.01, 0.6, kind='plain'))
    for z in (-8, 0, 8):
        parts.append(cyl(f'lamprod{d}{z}', IRON, 0, y + 2.35, z, 0.04, 0.3, segments=6, kind='metal'))
    return parts


def hold_b():
    y = DECK_Y[0]
    parts = lower_band(0)
    for i, (x, z, c) in enumerate([(-2.2, -9, 0x8A6A45), (2.2, -9, 0x8A6A45), (-2.4, -5, 0x6D7F86),
                                   (2.4, -5, 0x6D7F86), (-2.4, -1, 0x8A6A45), (2.05, 8, 0x8A6A45)]):
        for k in range(2):
            zz = z + (0.15 if k else 0)
            parts.append(kit.box(f'crate{i}{k}', c, x, y + 0.45 + k * 0.9, zz, 1.3, 0.85, 1.3, bevel=0.03))
            parts.append(kit.box(f'band{i}{k}', 0xC8AD7C, x, y + 0.45 + k * 0.9, zz, 1.35, 0.12, 1.35))
    for i in range(6):
        yy, zz = y + 0.25 + (i % 3) * 0.32, -12.2 + (i // 3) * 0.4
        parts.append(kit.rod(f'log{i}', 0x8E6C4C, (2.4, yy, zz - 1.1), (2.4, yy, zz + 1.1), 0.16, segments=10))
    return parts


def hold_a():
    y = DECK_Y[1]
    parts = lower_band(1)
    for i, (x, z) in enumerate([(-2.6, -9), (-2.6, -7.6), (2.6, -9), (2.6, -7.6), (-2.8, -3), (2.8, -3)]):
        parts.append(cyl(f'cask{i}', 0x8B5E3C, x, y + 0.6, z, 0.52, 1.2, segments=14))
        for yy in (0.25, 0.95):
            parts.append(flat_ring(f'hoop{i}{yy}', IRON, x, y + yy, z, 0.53, 0.04, kind='metal'))
    for x in (-2.25, 2.25):
        parts.append(cyl(f'tank{x}', 0x4F8D95, x, y + 0.9, 9, 0.7, 1.8, segments=16, kind='metal'))
    for i in range(5):
        parts.append(sphere(f'sack{i}', 0xBDA774, -2.6 + (i % 3) * 0.5, y + 0.35 + (i // 3) * 0.4, -12, 0.42,
                            (1, 0.7, 1.2), kind='cloth'))
    return parts


def lounge():
    y = DECK_Y[2]
    parts = lower_band(2)
    for i, (x, z) in enumerate([(-2.4, -7), (2.4, -7), (-2.8, -2.5), (2.8, -2.5), (-2.05, 9), (2.05, 9)]):
        parts.append(cyl(f'bed{i}', 0x7C5C3E, x, y + 0.12, z, 1.15, 0.24, segments=20))
        parts.append(flat_ring(f'bolster{i}', 0xD9B98C, x, y + 0.3, z, 1.05, 0.22, kind='cloth'))
        parts.append(cyl(f'cushion{i}', 0x5D9E93, x, y + 0.27, z, 0.92, 0.08, segments=20, kind='cloth'))
    parts.append(kit.box('trough', 0x6F8D8A, 0, y + 0.35, -11.5, 3.4, 0.5, 0.8, bevel=0.04, kind='plain'))
    return parts


def main_deck():
    y = DECK_Y[3]
    parts = [deck('deck3', y, 0xC9A473), hull_band('bulwark', y, y + 1.05, lambda _y: STRAKE)]
    top = ring(y + 1.05)
    for i in range(0, len(top), 2):
        x, z = top[i]
        parts.append(cyl(f'stanchion{i}', HULL, x * 0.995, y + 0.55, z, 0.06, 1.1, segments=6))
    parts.append(kit.tube('rail', GOLD, [(x, y + 1.08, z) for x, z in top[::2]], 0.07, closed=True, kind='metal'))
    for mz, h in ((6, 17), (-1, 20)):
        parts.append(cyl(f'mast{mz}', 0x6B4B2E, 0, y + h / 2, mz, 0.32, h, segments=10))
        for yy in (h * 0.45, h * 0.8):
            w = 3.6 if yy > h * 0.6 else 4.8
            parts.append(kit.rod(f'yard{mz}{yy}', 0x5A3F27, (-w, y + yy, mz), (w, y + yy, mz), 0.12))
        parts.append(flag(f'pennant{mz}', RED, -0.2, y + h + 0.6, mz, 1.4, 1.2))
        for s in (-1, 1):
            hb = half_beam(mz) * flare(y)
            parts.append(kit.rod(f'shroud{mz}{s}a', ROPE, (0, y + h * 0.95, mz), (s * hb, y + 1, mz - 2.5), 0.025,
                                 segments=5, kind='rope'))
            parts.append(kit.rod(f'shroud{mz}{s}b', ROPE, (0, y + h * 0.95, mz), (s * hb, y + 1, mz + 2.2), 0.025,
                                 segments=5, kind='rope'))
    parts.append(kit.rod('stay1', ROPE, (0, y + 18, -1), (0, y + 15.5, 6), 0.03, segments=5, kind='rope'))
    parts.append(kit.rod('stay2', ROPE, (0, y + 15.5, 6), (0, y + 2.2, 15.8), 0.03, segments=5, kind='rope'))
    parts.append(kit.rod('bowsprit', 0x6B4B2E, (0, y + 0.6, 13.5), (0, y + 2.4, 18), 0.18, segments=10))
    # the figurehead: a horned sea-beast (its eyes glow, in the game)
    parts.append(sphere('figurehead', TRIM, 0, y - 0.6, 15.1, 0.7, (1, 1.1, 1.5), kind='metal', segs=(16, 12)))
    for s in (-1, 1):
        parts.append(kit.rod(f'horn{s}', GOLD, (s * 0.3, y - 0.2, 15.4), (s * 0.75, y + 0.9, 15.2), 0.08,
                             kind='metal'))
    # the gun deck: four cannons a side
    for i in range(4):
        z = -8 + i * 4.6
        for s in (-1, 1):
            cx, cy = s * (half_beam(z) * flare(y) - 0.9), y + 0.55
            parts.append(kit.box(f'carriage{i}{s}', 0x5A3F27, cx, cy, z, 0.9, 0.4, 1.1, bevel=0.03))
            for zz in (-0.4, 0.4):
                parts.append(ring_x(f'wheel{i}{s}{zz}', 0x2B2B2B, cx, cy - 0.05, z + zz, 0.22, 0.06))
            parts.append(kit.rod(f'barrel{i}{s}', IRON, (cx + s * 0.55 - 0.8, cy + 0.25, z),
                                 (cx + s * 0.55 + 0.8, cy + 0.25, z), 0.17, segments=12, kind='metal'))
    # stairs up to the bridge, the gangway, the companionway's deckhouse, casks
    for i in range(9):
        parts.append(kit.box(f'step{i}', STRAKE, 0, y + 0.35 + i * 0.31, -4.6 - i * 0.23, 1.5, 0.08, 0.32))
    for s in (-0.8, 0.8):
        parts.append(kit.rod(f'stairrail{s}', GOLD, (s, y + 0.6, -4.5), (s, y + 3.5, -6.6), 0.04, kind='metal'))
    parts.append(kit.box('gangway', STRAKE, 3.7, y + 0.12, 1, 1.3, 0.12, 1.6))
    parts.append(kit.box('deckhouse', STRAKE, 0, y + 1.0, 3.2, 2.4, 2.0, 1.8, bevel=0.03))
    parts.append(kit.box('deckhouse-roof', TRIM, 0, y + 2.06, 3.2, 2.7, 0.12, 2.1, bevel=0.02))
    parts.append(kit.box('door', 0x2A1A10, 0, y + 0.95, 2.28, 1.1, 1.8, 0.06))
    for zz in (0.3, 1.7):
        parts.append(cyl(f'gangpost{zz}', GOLD, 4.3, y + 0.7, zz, 0.05, 1.2, segments=6, kind='metal'))
    for i in range(3):
        parts.append(cyl(f'deckcask{i}', 0x8B5E3C, -3, y + 0.5, 8 + i * 1.1, 0.4, 1, segments=12))
    return parts


def bridge():
    y = DECK_Y[4]
    parts = [kit.box('platform', 0xB08A5A, 0, y - 0.1, -9.5, 7.2, 0.22, 7.4, kind='deck-z')]
    for x in (-3.4, 3.4):
        for z in (-12.9, -6.1):
            parts.append(cyl(f'pillar{x}{z}', 0x5A3F27, x, y - 1.4, z, 0.16, 2.8, segments=10))
    for s in (-1, 1):
        parts.append(kit.box(f'sidewall{s}', STRAKE, s * 3.55, y + 0.5, -9.5, 0.2, 1, 7.4))
        parts.append(kit.box(f'sidetop{s}', STRAKE, s * 3.55, y + 2.35, -9.5, 0.2, 0.3, 7.4))
        for z in (-12, -10, -8, -6.6):
            parts.append(kit.box(f'mullion{s}{z}', STRAKE, s * 3.55, y + 1.5, z, 0.22, 1.4, 0.15))
    parts.append(kit.box('frontlow', STRAKE, 0, y + 0.5, -5.9, 7.2, 1, 0.2))
    parts.append(cyl('helmpost', 0x5A3F27, 0, y + 0.6, -10.75, 0.14, 1.2, segments=10))
    parts.append(kit.box('chart', 0x7C5C3E, 2, y + 0.85, -8.4, 1.5, 0.1, 1))
    for x in (1.4, 2.6):
        for z in (-8.8, -8):
            parts.append(cyl(f'chartleg{x}{z}', 0x5A3F27, x, y + 0.4, z, 0.05, 0.8, segments=6))
    parts.append(kit.box('chartpaper', 0xE9DCB4, 2, y + 0.92, -8.4, 1.2, 0.02, 0.8, kind='plain'))
    parts.append(cyl('compass', TRIM, 2, y + 0.935, -8.4, 0.25, 0.01, segments=20, kind='metal'))
    return parts


def cab():
    y = DECK_Y[4]
    parts = [kit.box('backwall', STRAKE, 0, y + 1.2, -13.1, 7.2, 2.6, 0.2)]
    for s in (-1, 1):
        parts.append(kit.box(f'front{s}', STRAKE, s * 2.4, y + 1.5, -5.9, 2.4, 2.6, 0.2))
    parts.append(kit.box('lintel', STRAKE, 0, y + 2.6, -5.9, 7.2, 0.4, 0.2))
    parts.append(kit.box('roof', HULL, 0, y + 2.75, -9.5, 7.8, 0.25, 8, bevel=0.03))
    parts.append(kit.box('rooftrim', TRIM, 0, y + 2.92, -9.5, 7.9, 0.08, 8.1))
    return parts


def build():
    out = []
    for name, parts, angle, ao in (('keel', keel(), 40, 0.6), ('band-0', hold_b(), 40, 0.7),
                                   ('band-1', hold_a(), 40, 0.7), ('band-2', lounge(), 40, 0.7),
                                   ('band-3', main_deck(), 40, 0.7), ('band-4', bridge(), 40, 0.6),
                                   ('cab', cab(), 40, 0.5)):
        ob = kit.join(name, parts)
        kit.smooth(ob, angle)
        out.append((ob, ao))
    for ob, ao in out:
        kit.bake_ao(ob, strength=ao, samples=24)
        kit.finish(ob)
    return [ob for ob, _ in out]
