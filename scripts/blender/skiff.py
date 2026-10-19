"""The skiff: a lapstrake rowing boat that matches makeBoat() in dist/world.js (bow at +z 1.95, transom at -1.65,
gunwale at y 0.75, half-beam 0.95). The rider, pennant, stern lantern and its glow stay procedural in the game
(they move or hide in first person), so they are not modelled here.
"""
import math

import kit  # imports bpy first
import bmesh  # noqa: E402
from mathutils import Vector  # noqa: E402

BOW, STERN = 1.95, -1.65
BANDS = 6  # planks per side
RED, CREAM, TEAL, TEAL_LIGHT = 0x7A3B2E, 0xE8DCBC, 0x427C80, 0x4F8D90
WOOD_IN, RAIL = 0xA88A62, 0xD5B783
# keel to gunwale: antifouling, the boot stripe, then the teal strakes in two shades
PLANKS = [RED, RED, CREAM, TEAL, TEAL_LIGHT, TEAL]


def half_beam(z):
    if z >= 0.15:
        u = min(1.0, (z - 0.15) / (BOW - 0.15))
        return 0.95 * math.sqrt(max(0.0, 1 - u ** 2.2))
    u = (0.15 - z) / (0.15 - STERN)
    return 0.95 - 0.33 * u * u


def gunwale(z):
    return 0.75 + 0.14 * max(0.0, (z - 0.6) / (BOW - 0.6)) ** 2 + 0.05 * max(0.0, (-z - 0.9) / 0.75) ** 2


def keel(z):
    return 0.14 + 0.45 * max(0.0, (z - 0.9) / (BOW - 0.9)) ** 2 + 0.06 * max(0.0, (-z - 1.1) / 0.55) ** 2


def section(z, s, side, shrink=1.0):
    """A point on the hull's cross-section: s 0 at the keel to 1 at the gunwale."""
    w, yg, yk = half_beam(z) * shrink, gunwale(z), keel(z)
    x = side * w * math.sin(s * math.pi / 2) ** 0.75
    y = yk + (yg - yk) * (1 - math.cos(s * math.pi / 2)) ** 0.9
    return x, y


def hull():
    """The shell: each plank overlaps the one below it, so the section steps out at every seam."""
    stations = [STERN + (BOW - STERN) * (i / 30) ** 0.95 for i in range(31)]
    rows = []  # (s, f) per side, keel to gunwale: f is how far up its plank a row sits (the overlap grows with it)
    for k in range(BANDS):
        rows.append((k / BANDS, 0.0))
        rows.append(((k + 1) / BANDS - 1e-4, 1.0))
    across = [(s, f, -1) for s, f in reversed(rows)] + [(s, f, 1) for s, f in rows]
    bm = bmesh.new()
    col = bm.loops.layers.float_color.new('Col')
    grid = []
    for z in stations:
        ring = []
        for s, f, side in across:
            x, y = section(z, s, side)
            # outward normal of the section here, for the clinker step
            x2, y2 = section(z, min(1, s + 0.01), side)
            tx, ty = x2 - x, y2 - y
            n = Vector((side * ty, -side * tx))
            n = n.normalized() if n.length > 1e-6 else Vector((side, 0))
            off = 0.014 * f * min(1.0, half_beam(z) / 0.3)
            ring.append(bm.verts.new(kit.g2b(x + n.x * off, y + n.y * off, z)))
        grid.append(ring)
    for a, b in zip(grid, grid[1:]):
        for i in range(len(a) - 1):
            f = bm.faces.new((a[i], a[i + 1], b[i + 1], b[i]))
            s_mid = (across[i][0] + across[i + 1][0]) / 2
            c = kit.rgb(PLANKS[min(BANDS - 1, int(s_mid * BANDS))])
            for loop in f.loops:
                loop[col] = (*c, 1.0)
    # the transom closes the stern
    stern = bm.faces.new(list(reversed(grid[0])))
    for loop in stern.loops:
        loop[col] = (*kit.rgb(TEAL), 1.0)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = kit.mesh_object('hull', bm)
    mod = ob.modifiers.new('thick', 'SOLIDIFY')
    mod.thickness = 0.045
    mod.offset = -1
    ob = kit.to_mesh(ob)

    def color(c, n):
        outward = n.x * c.x > 0.02 or n.z < -0.55 or (n.y > 0.6 and c.y > -STERN - 0.08)
        if n.z > 0.75 and c.z > 0.6:
            return kit.rgb(RAIL)  # the top edge of the planks
        return None if outward else kit.rgb(WOOD_IN)  # outside keeps its plank's paint

    ob['kind'] = 'wood-z'  # the strakes run bow to stern
    return kit.paint(ob, color)


def build():
    parts = [hull()]
    # gunwale rails, meeting at the stem
    zs = [STERN + 0.04 + (BOW - 0.06 - STERN) * i / 14 for i in range(15)]
    for side in (-1, 1):
        pts = [(side * (half_beam(z) + 0.015), gunwale(z) + 0.02, z) for z in zs]
        parts.append(kit.tube(f'rail{side}', RAIL, pts, 0.04, kind='wood-z'))
    parts.append(kit.rod('stem', 0x8A6A45, (0, keel(1.72) + 0.04, 1.74), (0, gunwale(BOW) + 0.08, BOW + 0.02), 0.045))
    parts.append(kit.box('keel', 0x5A3A2A, 0, keel(0) - 0.035, -0.35, 0.08, 0.07, 2.5, bevel=0.012))
    # seats and floorboards
    for z in (-0.9, 0.8):
        parts.append(kit.box(f'thwart{z}', 0xB99868, 0, 0.6, z, 2 * half_beam(z) - 0.12, 0.06, 0.3, bevel=0.012))
    for j in range(-2, 3):
        parts.append(kit.box(f'floor{j}', 0xBE9866 if j % 2 else 0x9F8A6A, j * 0.22, 0.29, 0, 0.19, 0.04, 2.3,
                             bevel=0.008))
    # ribs inside the shell
    for z in (-0.7, 0.0, 0.65):
        for side in (-1, 1):
            pts = [(*section(z, s, side, 0.9), z) for s in (0.18, 0.35, 0.55, 0.75, 0.92)]
            pts = [(x, y + 0.02, z) for x, y, z in pts]
            parts.append(kit.tube(f'rib{z}{side}', 0x72583B, pts, 0.026, kind='wood-y'))
    # oarlocks, the sculling oar over the side, the coiled rope
    for side in (-1, 1):
        x = side * half_beam(0.05)
        parts.append(kit.rod(f'lock{side}', 0x6E6A60, (x, gunwale(0.05), 0.05), (x, gunwale(0.05) + 0.13, 0.05), 0.02, kind='metal'))
    a, b = Vector((0.6, 0.85, -0.45)), Vector((1.7, 0.15, 0.7))
    tip = a + (b - a) * 0.7
    parts.append(kit.rod('oar', 0xB89A6A, tuple(a), tuple(tip), 0.04))
    parts.append(kit.plank('blade', 0xB08F5E, tuple(tip), tuple(b), 0.2, 0.035, bevel=0.012))
    parts.append(kit.torus('coil', 0xCBB894, (0.43, 0.56, -0.77), 0.22, 0.035))
    parts.append(kit.torus('coil2', 0xC2AE88, (0.43, 0.61, -0.77), 0.16, 0.032))
    ob = kit.join('skiff', parts)
    kit.smooth(ob, 38)
    kit.bake_ao(ob, strength=0.7)
    return kit.finish(ob)
