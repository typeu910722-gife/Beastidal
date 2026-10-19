"""The raft's working facilities, matching buildingMesh(b) in dist/world.js: the water collector, the display pen,
the gene hatchery and the signal beacon. Each fits the same 3.6 m tile as its procedural model. What the game moves,
lights or makes transparent stays procedural there: the collector's water gauge and sight glass, the hatchery's
glass dome, egg, screen and glow, the beacon's lamp, beam and glow.
"""
import math

import kit  # imports bpy first
import bmesh  # noqa: E402

WOOD, METAL, ROPE = 0x7A6049, 0x4B5150, 0xA8957A


def staved_cylinder(name, color, x, y0, y1, z, radius, belly=0.0, staves=16, rings=5, kind='wood-y', caps=True):
    """A vertical cylinder of staves (a tank, a cask), each stave a shade off its neighbour."""
    bm = bmesh.new()
    col = bm.loops.layers.float_color.new('Col')
    base = kit.rgb(color)
    verts = []
    for r in range(rings + 1):
        t = r / rings
        rad = radius + belly * math.sin(t * math.pi)
        y = y0 + (y1 - y0) * t
        verts.append([bm.verts.new(kit.g2b(x + rad * math.cos(a), y, z + rad * math.sin(a)))
                      for a in (i / staves * 2 * math.pi for i in range(staves))])
    for r in range(rings):
        for i in range(staves):
            f = bm.faces.new((verts[r][i], verts[r][(i + 1) % staves], verts[r + 1][(i + 1) % staves],
                              verts[r + 1][i]))
            k = 0.86 if i % 2 else 1.0
            for loop in f.loops:
                loop[col] = (base[0] * k, base[1] * k, base[2] * k, 1.0)
    if caps:
        for ring in (verts[0], verts[-1]):
            f = bm.faces.new(ring)
            for loop in f.loops:
                loop[col] = (base[0] * 0.75, base[1] * 0.75, base[2] * 0.75, 1.0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = kit.mesh_object(name, bm)
    ob['kind'] = kind
    return ob


def canopy(name, color, apex_y, eave_y, half, sag=0.08):
    """A four-sided cloth roof, corners over the diagonals, each side sagging between its corner poles."""
    bm = bmesh.new()
    col = bm.loops.layers.float_color.new('Col')
    c = kit.rgb(color)
    n = 8
    corners = [(half, half), (-half, half), (-half, -half), (half, -half)]
    for i in range(4):
        (ax, az), (bx, bz) = corners[i], corners[(i + 1) % 4]
        grid = []
        for j in range(n + 1):  # from the apex down to the eave
            u = j / n
            row = []
            for k in range(n + 1):
                v = k / n
                ex, ez = ax + (bx - ax) * v, az + (bz - az) * v
                drop = math.sin(v * math.pi) * sag * u + math.sin(u * math.pi) * sag * 0.6
                row.append(bm.verts.new(kit.g2b(ex * u, apex_y + (eave_y - apex_y) * u - drop, ez * u)))
            grid.append(row)
        for j in range(n):
            for k in range(n):
                f = bm.faces.new((grid[j][k], grid[j][k + 1], grid[j + 1][k + 1], grid[j + 1][k]))
                shade = 0.82 if j == n - 1 else (0.94 if i % 2 else 1.0)
                for loop in f.loops:
                    loop[col] = (c[0] * shade, c[1] * shade, c[2] * shade, 1.0)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    ob = kit.mesh_object(name, bm)
    ob['kind'] = 'cloth'
    return ob


def collector():
    parts = [staved_cylinder('tank', 0x3C747B, 0, 0.35, 1.45, 0, 0.74, belly=0.03, staves=20)]
    for y in (0.46, 0.91, 1.39):
        parts.append(kit.torus(f'hoop{y}', 0xC1B58F, (0, y, 0), 0.77, 0.035, kind='metal'))
    for x in (-1.1, 1.1):
        for z in (-1.1, 1.1):
            parts.append(kit.rod(f'leg{x}{z}', WOOD, (x, 0.38, z), (x, 2.42, z), 0.065, segments=8))
    for a, b in (((-1.1, 2.3, -1.1), (1.1, 2.3, -1.1)), ((-1.1, 2.3, 1.1), (1.1, 2.3, 1.1)),
                 ((-1.1, 2.3, -1.1), (-1.1, 2.3, 1.1)), ((1.1, 2.3, -1.1), (1.1, 2.3, 1.1))):
        parts.append(kit.rod(f'beam{a}{b}', WOOD, a, b, 0.045, segments=6))
    parts.append(canopy('tarp', 0x779F9B, 2.5, 1.95, 1.15))
    parts.append(kit.rod('funnel', 0xC8D0B6, (0, 1.95, 0), (0, 1.42, 0), 0.065, kind='metal'))
    parts.append(kit.rod('spout', METAL, (0.7, 0.66, 0), (1.0, 0.66, 0), 0.06, kind='metal'))
    parts.append(kit.rod('tap', METAL, (1.0, 0.47, 0), (1.0, 0.66, 0), 0.06, kind='metal'))
    parts.append(kit.box('gaugeplate', 0xCADACE, 0.3, 0.93, 0.72, 0.16, 0.67, 0.045, kind='plain'))
    for k, y in enumerate([0.7 + i * 0.12 for i in range(5)]):
        parts.append(kit.box(f'tick{k}', 0x466673, 0.3, y, 0.75, 0.13, 0.018, 0.02, kind='plain'))
    ob = kit.join('collector', parts)
    kit.smooth(ob, 40)
    kit.bake_ao(ob, strength=0.7)
    return [kit.finish(ob)]


def pen():
    parts = []
    for x in (-1.6, 1.6):
        for z in (-1.6, 1.6):
            parts.append(kit.rod(f'post{x}{z}', WOOD, (x, -0.25, z), (x, 1.0, z), 0.1, segments=10))
            parts.append(kit.rod(f'cap{x}{z}', 0xD5B887, (x, 0.96, z), (x, 1.1, z), 0.13, segments=10))
    for s in (-1, 1):
        parts.append(kit.rod(f'ropeX{s}', ROPE, (-1.6, 0.6, s * 1.6), (1.6, 0.6, s * 1.6), 0.035, kind='rope'))
        parts.append(kit.rod(f'ropeZ{s}', ROPE, (s * 1.6, 0.6, -1.6), (s * 1.6, 0.6, 1.6), 0.035, kind='rope'))
        # the net: hangs from the rope into the water on every side
        for j in range(-3, 4):
            parts.append(kit.rod(f'netX{s}{j}', 0x8FC3B2, (j * 0.48, 0.58, s * 1.6), (j * 0.48, -1.5, s * 1.6),
                                 0.013, segments=4, kind='rope'))
            parts.append(kit.rod(f'netZ{s}{j}', 0x8FC3B2, (s * 1.6, 0.58, j * 0.48), (s * 1.6, -1.5, j * 0.48),
                                 0.013, segments=4, kind='rope'))
        for y in (-1.0, -0.5, 0.0):
            parts.append(kit.rod(f'meshX{s}{y}', 0x8FC3B2, (-1.6, y, s * 1.6), (1.6, y, s * 1.6), 0.013,
                                 segments=4, kind='rope'))
            parts.append(kit.rod(f'meshZ{s}{y}', 0x8FC3B2, (s * 1.6, y, -1.6), (s * 1.6, y, 1.6), 0.013,
                                 segments=4, kind='rope'))
    # floats all round, butted at the corners
    for x in (-1.75, 1.75):
        parts.append(kit.box(f'floatZ{x}', 0x9A8A71, x, 0.25, 0, 0.23, 0.17, 3.6, bevel=0.02))
    for z in (-1.75, 1.75):
        parts.append(kit.box(f'floatX{z}', 0x9A8A71, 0, 0.25, z, 3.27, 0.17, 0.23, bevel=0.02))
    ob = kit.join('pen', parts)
    kit.smooth(ob, 40)
    kit.bake_ao(ob, strength=0.6)
    return [kit.finish(ob)]


def hatchery():
    parts = []
    for x in (-1, 1):
        for z in (-0.65, 0.65):
            parts.append(kit.rod(f'leg{x}{z}', METAL, (x, 0.3, z), (x, 1.17, z), 0.08, kind='metal'))
    parts.append(kit.box('bench', 0x566D72, 0, 1.25, 0, 2.5, 0.18, 1.9, bevel=0.03, kind='metal'))
    parts.append(kit.rod('stand', 0x4C827F, (0, 1.34, 0), (0, 1.54, 0), 0.65, segments=24, kind='metal'))
    for y in (1.5, 2.35):
        parts.append(kit.torus(f'ring{y}', METAL, (0, y, 0), 0.63, 0.05, kind='metal'))
    for s in (-1, 1):
        parts.append(kit.rod(f'arm{s}', METAL, (s * 0.6, 1.48, 0), (s * 0.6, 2.3, 0), 0.035, kind='metal'))
    parts.append(kit.box('console', 0x25464D, 1.02, 1.43, 0.43, 0.36, 0.3, 0.5, bevel=0.02, kind='metal'))
    for n in range(3):
        z = -0.5 + n * 0.3
        parts.append(kit.rod(f'vial{n}', 0x9CDFD5, (-0.92, 1.31, z), (-0.92, 1.71, z), 0.055, segments=10,
                             kind='plain'))
        parts.append(kit.rod(f'stopper{n}', 0x6B4B2E, (-0.92, 1.71, z), (-0.92, 1.78, z), 0.04, kind='plain'))
    parts.append(kit.box('rack', 0x6B4B2E, -0.92, 1.37, -0.2, 0.18, 0.06, 0.82, kind='wood-z'))
    ob = kit.join('hatchery', parts)
    kit.smooth(ob, 40)
    kit.bake_ao(ob, strength=0.65)
    return [kit.finish(ob)]


def beacon():
    parts = []

    def half(y):  # the tower narrows from ±0.55 at the deck to ±0.275 at 4.6 m
        return 0.55 - 0.275 * (y - 0.4) / 4.2

    for sx in (-1, 1):
        for sz in (-1, 1):
            parts.append(kit.rod(f'leg{sx}{sz}', METAL, (sx * 0.55, 0.4, sz * 0.55),
                                 (sx * 0.275, 4.6, sz * 0.275), 0.09, segments=8, kind='metal'))
    for j in range(5):
        y0, y1 = 0.5 + j * 0.85, 0.5 + (j + 1) * 0.85
        h0, h1 = half(y0), half(y1)
        for side in range(4):  # an X of braces on each face, between two levels
            a = [(-h0, h0), (h0, h0), (h0, -h0), (-h0, -h0)]
            b = [(-h1, h1), (h1, h1), (h1, -h1), (-h1, -h1)]
            i, k = side, (side + 1) % 4
            parts.append(kit.rod(f'x{j}{side}a', METAL, (a[i][0], y0, a[i][1]), (b[k][0], y1, b[k][1]), 0.033,
                                 segments=5, kind='metal'))
            parts.append(kit.rod(f'x{j}{side}b', METAL, (a[k][0], y0, a[k][1]), (b[i][0], y1, b[i][1]), 0.033,
                                 segments=5, kind='metal'))
        h = half(y1)
        for side in range(4):  # a ring of girts at every level
            pts = [(-h, h), (h, h), (h, -h), (-h, -h)]
            p, q = pts[side], pts[(side + 1) % 4]
            parts.append(kit.rod(f'g{j}{side}', METAL, (p[0], y1, p[1]), (q[0], y1, q[1]), 0.04, segments=5,
                                 kind='metal'))
    parts.append(kit.rod('platform', METAL, (0, 4.6, 0), (0, 5.0, 0), 0.49, segments=20, kind='metal'))
    for x in (-0.36, 0.36):
        for z in (-0.36, 0.36):
            parts.append(kit.rod(f'cage{x}{z}', METAL, (x, 4.94, z), (x, 5.7, z), 0.028, kind='metal'))
    parts.append(kit.torus('cagering', METAL, (0, 5.7, 0), 0.5, 0.03, kind='metal'))
    cone = kit.rod('hood', METAL, (0, 5.69, 0), (0, 5.99, 0), 0.63, segments=16, kind='metal')
    # taper the hood into a cone: pull the top ring in
    for v in cone.data.vertices:
        if v.co.z > 5.8:
            v.co.x *= 0.05
            v.co.y *= 0.05
    parts.append(cone)
    parts.append(kit.rod('mast', METAL, (0, 5.95, 0), (0, 6.25, 0), 0.06, kind='metal'))
    ob = kit.join('beacon', parts)
    kit.smooth(ob, 40)
    kit.bake_ao(ob, strength=0.6)
    return [kit.finish(ob)]
