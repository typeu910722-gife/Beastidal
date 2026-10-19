"""The raft's own pieces, matching dist/world.js: the floor tile (floorMesh), the stairs, chair, table and lamp from
buildingMesh. The floor matters most: a raft is up to twenty tiles, and the procedural tile was 35 meshes.
"""
import math

import kit  # imports bpy first
import bmesh  # noqa: E402

PLANK, PLANK_B, DARK, ROPE, WOOD, METAL = 0x9A8A71, 0x9A8668, 0x3B342C, 0xA8957A, 0x7A6049, 0x4B5150


def drum(name, color, a, b, radius, bands=(), seg=12):
    """A drum or pontoon lying along a line, with iron bands round it."""
    parts = [kit.rod(name, color, a, b, radius, segments=seg, kind='metal')]
    for k, t in enumerate(bands):
        c = tuple(a[i] + (b[i] - a[i]) * t for i in range(3))
        ring = kit.rod(f'{name}band{k}', 0x2F3A3D, tuple(c[i] - (b[i] - a[i]) * 0.015 for i in range(3)),
                       tuple(c[i] + (b[i] - a[i]) * 0.015 for i in range(3)), radius + 0.025, segments=seg,
                       kind='metal')
        parts.append(ring)
    return parts


def floor():
    parts = []
    # oil drums under the deck, each with two bands, lying fore and aft
    for x in (-1, 1):
        for z in (-1, 1):
            cx, cz = x * 0.95, z * 0.95
            parts += drum(f'drum{x}{z}', 0x6E4A2F, (cx, -0.12, cz - 0.47), (cx, -0.12, cz + 0.47), 0.42,
                          bands=(0.18, 0.82))
    # pontoons under the side beams
    for x in (-1.45, 1.45):
        for z in (-1.2, 1.2):
            parts.append(kit.rod(f'pont{x}{z}', 0x283E44, (x - 0.35, -0.21, z), (x + 0.35, -0.21, z), 0.4,
                                 segments=12, kind='metal'))
    # side beams under the outer planks
    for x in (-1.45, 1.45):
        parts.append(kit.box(f'beam{x}', DARK, x, 0.06, 0, 0.17, 0.27, 3.4, bevel=0.02, bevel_segments=1))
    # the deck: seven planks, a third of them a darker board, nail heads at the ends
    for i in range(7):
        x = (i - 3) * 0.49
        color = PLANK_B if i % 3 == 0 else PLANK
        tone = (1.0, 0.95, 1.04, 0.98, 1.02, 0.93, 1.0)[i]
        plank = kit.box(f'plank{i}', color, x, 0.29, 0, 0.45, 0.2, 3.45, bevel=0.025, bevel_segments=1)
        kit.paint(plank, lambda c, n, t=tone, col=kit.rgb(color): tuple(v * t for v in col))
        parts.append(plank)
        for z in (-1.5, 1.5):
            for dx in (-0.12, 0.12):
                parts.append(kit.rod(f'nail{i}{z}{dx}', 0x695F4D, (x + dx, 0.385, z), (x + dx, 0.4, z), 0.022,
                                     segments=5, kind='metal'))
    ob = kit.join('floor', parts)
    kit.smooth(ob, 40)
    kit.bake_ao(ob, strength=0.7)
    return [kit.finish(ob)]


def stairs():
    parts = []
    for n in range(11):
        parts.append(kit.box(f'tread{n}', PLANK, -0.85, 0.45 + n * 0.3, -1.45 + n * 0.27, 1.0, 0.11, 0.34,
                             bevel=0.02))
    for x in (-1.4, -0.3):
        parts.append(kit.plank(f'string{x}', DARK, (x, 0.42, -1.6), (x, 3.62, 1.5), 0.24, 0.07, bevel=0.012,
                               kind='wood-z'))
        parts.append(kit.rod(f'rail{x}', ROPE, (x, 1.45, -1.5), (x, 4.4, 1.45), 0.035, kind='rope'))
        for n in range(0, 11, 3):
            y, z = 0.95 + n * 0.3, -1.45 + n * 0.27
            parts.append(kit.rod(f'baluster{x}{n}', WOOD, (x, y - 0.4, z), (x, y + 0.5, z), 0.03))
    ob = kit.join('stairs', parts)
    kit.smooth(ob, 40)
    kit.bake_ao(ob, strength=0.6)
    return [kit.finish(ob)]


def chair():
    parts = []
    for x in (-0.35, 0.35):
        for z in (-0.35, 0.35):
            parts.append(kit.rod(f'leg{x}{z}', WOOD, (x, 0.4, z), (x * 0.92, 0.94, z * 0.92), 0.045))
    for k, x in enumerate((-0.28, 0, 0.28)):
        parts.append(kit.box(f'seat{k}', PLANK, x, 0.98, 0, 0.26, 0.08, 0.8, bevel=0.015))
    parts.append(kit.box('apron', WOOD, 0, 0.9, 0, 0.78, 0.07, 0.72))
    for k, y in enumerate((1.18, 1.42, 1.62)):
        parts.append(kit.box(f'back{k}', PLANK, 0, y, -0.38, 0.85, 0.13, 0.06, bevel=0.012))
    for x in (-0.38, 0.38):
        parts.append(kit.rod(f'upright{x}', WOOD, (x, 0.98, -0.38), (x, 1.7, -0.4), 0.04))
    ob = kit.join('chair', parts)
    kit.smooth(ob, 40)
    kit.bake_ao(ob, strength=0.6)
    return [kit.finish(ob)]


def table():
    parts = []
    for x in (-0.7, 0.7):
        for z in (-0.4, 0.4):
            parts.append(kit.rod(f'leg{x}{z}', WOOD, (x, 0.39, z), (x, 1.24, z), 0.06, segments=8))
    for z in (-0.4, 0.4):
        parts.append(kit.box(f'rail{z}', WOOD, 0, 1.15, z, 1.4, 0.08, 0.06))
    parts.append(kit.box('stretcher', WOOD, 0, 0.6, 0, 1.4, 0.06, 0.06))
    for k, z in enumerate((-0.36, 0, 0.36)):
        parts.append(kit.box(f'top{k}', PLANK, 0, 1.3, z, 1.75, 0.12, 0.34, bevel=0.018))
    # a few things left on it: a tin cup, a rolled chart, a knife
    parts.append(kit.rod('cup', 0x7C8F93, (0.45, 1.36, 0.2), (0.45, 1.5, 0.2), 0.06, segments=10, kind='metal'))
    parts.append(kit.rod('chart', 0xD9CFAA, (-0.6, 1.42, -0.2), (-0.1, 1.42, -0.15), 0.05, segments=10,
                         kind='plain'))
    parts.append(kit.box('knife', 0xB9C2C0, 0.1, 1.37, 0.25, 0.3, 0.012, 0.04, rot_y=0.4, kind='metal'))
    ob = kit.join('table', parts)
    kit.smooth(ob, 40)
    kit.bake_ao(ob, strength=0.6)
    return [kit.finish(ob)]


def lamp():
    parts = [kit.rod('pole', METAL, (0, 0.45, 0), (0, 2.45, 0), 0.05, kind='metal')]
    parts.append(kit.rod('foot', METAL, (0, 0.38, 0), (0, 0.5, 0), 0.22, segments=12, kind='metal'))
    for k in range(4):  # a cage round the glowing crystal (the crystal itself stays in the game)
        a = k / 4 * 2 * math.pi
        x, z = math.cos(a) * 0.22, math.sin(a) * 0.22
        parts.append(kit.rod(f'cage{k}', METAL, (x * 0.4, 2.3, z * 0.4), (x, 2.6, z), 0.018, kind='metal'))
        parts.append(kit.rod(f'cage{k}b', METAL, (x, 2.6, z), (x * 0.4, 2.92, z * 0.4), 0.018, kind='metal'))
    parts.append(kit.rod('cap', METAL, (0, 2.9, 0), (0, 2.98, 0), 0.12, segments=10, kind='metal'))
    ob = kit.join('lamp', parts)
    kit.smooth(ob, 40)
    kit.bake_ao(ob, strength=0.5)
    return [kit.finish(ob)]
