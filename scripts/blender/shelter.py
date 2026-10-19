"""The canvas shelter on the raft, matching buildingMesh(b) for 'shelter' in dist/world.js (one 3.6 m raft tile, the
door towards +z). Two parts: the shelter itself, and a named 'roof' (canvas, ridge, rafters) that the game lifts
away while you are inside in third person. The lanterns, their lights and glows stay procedural.
"""
import math

import kit  # imports bpy first
import bmesh  # noqa: E402

DARK, WALL_A, WALL_B = 0x3B342C, 0xA98257, 0xB8915F
ROPE, CLOTH, CANVAS_A, CANVAS_B = 0xA8957A, 0xA49D86, 0xCCB885, 0x42948D


def canvas(name, side):
    """One side of the roof: sags between the ridge and the eave, and between the gables; seams every 0.6 m."""
    n_u, n_v = 12, 18
    bm = bmesh.new()
    col = bm.loops.layers.float_color.new('Col')
    grid = []
    for j in range(n_u + 1):
        u = j / n_u
        row = []
        for k in range(n_v + 1):
            v = k / n_v
            x = side * u * 1.6
            y = 3.1 - u * 0.95 - math.sin(u * math.pi) * 0.14 - math.sin(v * math.pi) * 0.08
            z = -1.5 + v * 3
            row.append(bm.verts.new(kit.g2b(x, y, z)))
        grid.append(row)
    base = kit.rgb(CANVAS_A if side == 1 else CANVAS_B)
    for j in range(n_u):
        for k in range(n_v):
            f = bm.faces.new((grid[j][k], grid[j + 1][k], grid[j + 1][k + 1], grid[j][k + 1]))
            z = -1.5 + (k + 0.5) / n_v * 3
            seam = abs(((z + 1.5) % 0.6) - 0.3) > 0.24  # a darker band where two lengths of canvas are sewn
            edge = j == n_u - 1  # the hem along the eave
            k_shade = 0.78 if seam or edge else 1.0
            for loop in f.loops:
                loop[col] = (base[0] * k_shade, base[1] * k_shade, base[2] * k_shade, 1.0)
    ob = kit.mesh_object(name, bm)
    ob['kind'] = 'cloth'
    return ob


def curtain(name, side):
    """A canvas door flap hanging in soft folds, tied back a little."""
    bm = bmesh.new()
    col = bm.loops.layers.float_color.new('Col')
    n_w, n_h = 6, 8
    rows = []
    for j in range(n_h + 1):
        t = j / n_h
        y = 2.04 - t * 1.23
        row = []
        for i in range(n_w + 1):
            s = i / n_w
            x = side * (0.88 + s * 0.3 - (0.06 * t if s < 0.5 else 0))
            z = 1.2 + math.sin(s * math.pi * 3) * 0.035 * (0.4 + t)
            row.append(bm.verts.new(kit.g2b(x, y, z)))
        rows.append(row)
    c = kit.rgb(0xD4C195)
    for j in range(n_h):
        for i in range(n_w):
            f = bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
            for loop in f.loops:
                loop[col] = (*c, 1.0)
    ob = kit.mesh_object(name, bm)
    ob['kind'] = 'cloth'
    return ob


def barrel(name, x, z):
    """A small cask: bellied staves and two iron hoops."""
    bm = bmesh.new()
    col = bm.loops.layers.float_color.new('Col')
    rings, seg = 7, 14
    verts = []
    for r in range(rings + 1):
        t = r / rings
        rad = 0.11 + 0.025 * math.sin(t * math.pi)
        y = 0.55 + t * 0.48
        verts.append([bm.verts.new(kit.g2b(x + rad * math.cos(a), y, z + rad * math.sin(a)))
                      for a in (i / seg * 2 * math.pi for i in range(seg))])
    wood = kit.rgb(0x8B5E3C)
    for r in range(rings):
        for i in range(seg):
            f = bm.faces.new((verts[r][i], verts[r][(i + 1) % seg], verts[r + 1][(i + 1) % seg], verts[r + 1][i]))
            k = 0.88 if i % 2 else 1.0  # stave to stave
            for loop in f.loops:
                loop[col] = (wood[0] * k, wood[1] * k, wood[2] * k, 1.0)
    for ring in (verts[0], verts[-1]):
        f = bm.faces.new(ring)
        for loop in f.loops:
            loop[col] = (*kit.rgb(0x6E4A2C), 1.0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = kit.mesh_object(name, bm)
    ob['kind'] = 'wood-y'
    hoops = [kit.torus(f'{name}h{y}', 0x4B5150, (x, y, z), 0.13, 0.012, kind='metal') for y in (0.66, 0.92)]
    return [ob, *hoops]


def build():
    parts = []
    # the platform, board by board, each its own tone
    for i in range(7):
        x = -1.2 + i * 0.4
        tone = (0x7A5A3A, 0x80603E, 0x745536)[i % 3]
        parts.append(kit.box(f'deck{i}', tone, x, 0.48, 0, 0.37, 0.14, 2.9, bevel=0.015))
    for z in (-1.3, 0, 1.3):
        parts.append(kit.box(f'joist{z}', 0x5E452C, 0, 0.38, z, 2.8, 0.08, 0.14))
    # corner posts and the lantern post at the door
    for x in (-1.2, 1.2):
        for z in (-1.2, 1.2):
            parts.append(kit.rod(f'post{x}{z}', DARK, (x, 0.3, z), (x, 2.32, z), 0.09, segments=10))
    parts.append(kit.rod('lanternpost', DARK, (1.24, 1.5, 1.22), (1.24, 2.8, 1.22), 0.075, segments=8))
    # plank walls: both sides, and the back
    for s in (-1, 1):
        for k in range(5):
            parts.append(kit.box(f'side{s}{k}', WALL_A if k % 2 else WALL_B, s * 1.32, 0.62 + k * 0.3, -0.15,
                                 0.08, 0.3, 2.3, bevel=0.012))
    for k in range(6):
        parts.append(kit.box(f'back{k}', WALL_A if k % 2 else WALL_B, 0, 0.62 + k * 0.3, -1.32, 2.6, 0.3, 0.08,
                             bevel=0.012))
    parts.append(kit.box('backcloth', CLOTH, 0, 1.23, -1.19, 2.35, 1.74, 0.05, kind='cloth'))
    # the door: two steps, the sign with its brass edge, curtains tied back, guy ropes to the deck
    parts.append(kit.box('step1', 0x6B4B2E, 0, 0.42, 1.62, 1.3, 0.1, 0.34, bevel=0.012))
    for s in (-1, 1):
        parts.append(kit.box(f'stepleg{s}', 0x5E452C, s * 0.55, 0.3, 1.62, 0.1, 0.18, 0.3))
    parts.append(kit.box('sign', 0x2E7C78, 0, 2.62, 1.36, 1.1, 0.32, 0.05, bevel=0.01, kind='wood-x'))
    parts.append(kit.box('signtrim', 0xD6B15C, 0, 2.62, 1.39, 0.8, 0.06, 0.02, kind='metal'))
    for s in (-1, 1):
        parts.append(curtain(f'curtain{s}', s))
        parts.append(kit.rod(f'guy{s}', ROPE, (s * 1.25, 2.2, 1.28), (s * 1.5, 0.47, 1.5), 0.023, kind='rope'))
    # inside: a bed with pillow and blankets, casks, a crate, a jug and some salvaged paper
    parts.append(kit.box('mattress', 0x546B58, 0, 0.6, -0.25, 1.2, 0.2, 1.6, bevel=0.06, kind='cloth'))
    parts.append(kit.box('pillow', CLOTH, 0, 0.75, -0.75, 0.95, 0.14, 0.34, bevel=0.06, kind='cloth'))
    parts.append(kit.box('blanket', 0x6E5A48, 0.12, 0.72, 0.05, 1.05, 0.05, 0.7, rot_y=0.12, bevel=0.02,
                         kind='cloth'))
    parts.append(kit.box('mat', 0x4C5E52, -0.2, 0.71, 0.35, 0.6, 0.04, 0.3, rot_y=-0.3, kind='cloth'))
    for k in range(3):
        parts += barrel(f'cask{k}', -1.05 + k * 0.32, -0.95)
    parts.append(kit.box('shelf', 0xD9CFAA, 0.7, 0.8, -0.9, 0.7, 0.08, 1.0, bevel=0.01))
    parts.append(kit.box('crate', 0x8C714C, -1.1, 0.64, -0.9, 0.46, 0.4, 0.42, bevel=0.02))
    parts.append(kit.box('crate2', 0x9A8668, -0.85, 0.62, 0.55, 0.42, 0.3, 0.32, bevel=0.02))
    parts.append(kit.box('paper', 0xCFC6AD, -0.86, 0.785, 0.55, 0.24, 0.01, 0.17, rot_y=0.4, kind='plain'))
    parts.append(kit.rod('jug', 0x7C8F93, (0.82, 0.57, 0.35), (0.82, 0.97, 0.35), 0.11, segments=12, kind='plain'))
    parts.append(kit.rod('jugcap', 0x2D3638, (0.82, 0.97, 0.35), (0.82, 1.06, 0.35), 0.05, kind='plain'))
    shelter = kit.join('shelter', parts)
    kit.smooth(shelter, 35)

    roof_parts = [canvas('canvas+', 1), canvas('canvas-', -1)]
    for z in (-1.3, 1.3):
        roof_parts.append(kit.rod(f'rafterL{z}', ROPE, (-1.45, 2.1, z), (0, 3.1, z), 0.06, kind='rope'))
        roof_parts.append(kit.rod(f'rafterR{z}', ROPE, (0, 3.1, z), (1.45, 2.1, z), 0.06, kind='rope'))
    roof_parts.append(kit.rod('ridge', 0x7A6049, (0, 3.1, -1.55), (0, 3.1, 1.55), 0.085, segments=10, kind='wood-z'))
    roof = kit.join('roof', roof_parts)
    kit.smooth(roof, 50)

    kit.bake_ao(shelter, strength=0.75)
    kit.bake_ao(roof, strength=0.5)
    kit.finish(shelter)
    kit.finish(roof)
    return [shelter, roof]
