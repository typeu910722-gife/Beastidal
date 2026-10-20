"""慈光港, the town past the mountains (dist/town.js, dist/town-models.js), rebuilt in Blender.

Every building keeps the footprint town.js gives it (its walls stand exactly on the box the game walks and aims its
camera against); the model adds what a box cannot have: pitched and hipped roofs of tile with eaves that overhang,
chimneys, framed and mullioned windows with sills and lintels, shutters and flower boxes, doors set in stone
surrounds under little tiled canopies, the apartment's balconies, the welcome centre's portico and pediment, the
ration hall's awning, the kiosk's pavilion roof and wall of mailboxes, the admin block's parapet and mast.

All twelve buildings are one model in the town's own coordinates (metres from the plaza, +z towards the gate), its
faces grouped by material. The window panes carry the material 'window' (the admin block's, 'frosted'): the game
swaps in its own glass for those, which it lights up at night.
"""
import json
import math
import os
import subprocess

import kit  # imports bpy first
import bmesh  # noqa: E402
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

HERE = os.path.dirname(__file__)
TOWN_JS = os.path.join(HERE, '..', '..', 'dist', 'town.js')

# colours (sRGB, as the game picks them)
PLASTER = [0xF1ECE0, 0xEAE2CF, 0xF4EEE4, 0xE6DCC6, 0xEFE6D6, 0xE9E1D8]
TRIM = 0xD9D0BC
STONE = 0xA8A090
STONE_DARK = 0x8E877A
TILE = [0x9A5A42, 0x8C5440, 0xA4664A, 0x7E4C3C]
DOOR = 0x5A4636
SHUTTER = [0x6F8A94, 0x7C9A7E, 0x8A6F5A, 0x5F7790, 0x9A8364, 0x6E7F8C]
GOLD = 0xE9C46A
METAL = 0x3B3D40
BLOOM = [0xD77A8A, 0xE8B04A, 0xF0EEE6, 0xB97AC8]
LEAF = 0x5E7F4A


_LAYOUT = None


def layout():
    """The town's layout, straight from town.js (run through node), so the models can never drift from what the game
    walks on and aims its camera against."""
    global _LAYOUT
    if _LAYOUT is None:
        js = ("import('" + os.path.abspath(TOWN_JS).replace(os.sep, '/') + "').then(m => console.log(JSON.stringify({"
              "BUILDINGS: m.BUILDINGS, LAMPS: m.LAMPS, FURNITURE: m.FURNITURE, STATUE: m.STATUE, STELE: m.STELE,"
              "BOARD: m.BOARD, WALL: m.WALL, GATE_HALF: m.GATE_HALF })))")
        _LAYOUT = json.loads(subprocess.run(['node', '-e', js], capture_output=True, text=True, check=True).stdout)
    return _LAYOUT


def buildings():
    out = []
    for b in layout()['BUILDINGS']:
        d = b.get('door')
        out.append(dict(b, door=(d['x'], d['z']) if d else None))
    return out


# ---------------------------------------------------------------- mesh helpers (game coordinates)
class Mesh:
    """Collects faces of one material kind into a bmesh, each face painted its own colour."""

    def __init__(self, kind, flat=True):
        self.bm = bmesh.new()
        self.col = self.bm.loops.layers.float_color.new('Col')
        self.kind = kind
        self.flat = flat

    def face(self, pts, color, k=1.0):
        vs = [self.bm.verts.new(kit.g2b(*p)) for p in pts]
        f = self.bm.faces.new(vs)
        c = kit.rgb(color)
        for loop in f.loops:
            loop[self.col] = (c[0] * k, c[1] * k, c[2] * k, 1.0)
        return f

    def box(self, color, cx, cy, cz, sx, sy, sz, shade=True):
        """An axis-aligned box: centre and full sizes. Its underside is left out (nobody sees it)."""
        x0, x1, y0, y1, z0, z1 = cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2
        k = (lambda v: v) if not shade else (lambda v: v)
        self.face([(x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0)], color, k(1.0))
        self.face([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], color, k(0.97))
        self.face([(x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0)], color, k(0.97))
        self.face([(x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1)], color, k(0.95))
        self.face([(x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)], color, k(0.95))

    def slab(self, color, pts, t, k=1.0):
        """A polygon (its top surface, in order) thickened straight down by t."""
        # wound so the top faces up (its sides then face out, its underside down)
        (ax, ay, az), (bx, by, bz), (cx, cy, cz) = pts[0], pts[1], pts[2]
        ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az)
        if ny < 0:
            pts = pts[::-1]
        top = pts
        bot = [(x, y - t, z) for x, y, z in pts]
        self.face(top, color, k)
        self.face(bot[::-1], color, k * 0.7)
        n = len(pts)
        for i in range(n):
            j = (i + 1) % n
            self.face([bot[i], bot[j], top[j], top[i]], color, k * 0.82)

    def cylinder(self, color, x, y0, y1, z, r0, r1=None, seg=14):
        r1 = r0 if r1 is None else r1
        ring0 = [(x + r0 * math.cos(a), y0, z + r0 * math.sin(a)) for a in (i / seg * 2 * math.pi for i in range(seg))]
        ring1 = [(x + r1 * math.cos(a), y1, z + r1 * math.sin(a)) for a in (i / seg * 2 * math.pi for i in range(seg))]
        for i in range(seg):
            j = (i + 1) % seg
            self.face([ring0[j], ring0[i], ring1[i], ring1[j]], color)
        self.face(list(reversed(ring1)), color)

    def blob(self, color, x, y, z, r, sub=1, scale=(1, 1, 1), shade=True):
        """A low-poly ball (a bloom, a shrub; sub=2 and smooth for carved stone), squashed by scale."""
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
        sx, sy, sz = scale
        for f in bm.faces:
            k = 0.9 + 0.2 * (f.index % 3) / 2 if shade else 1.0
            self.face([(x + v.co.x * sx, y + v.co.z * sy, z - v.co.y * sz) for v in f.verts], color, k)
        bm.free()

    def obox(self, color, ox, oz, ry, cx, cy, cz, sx, sy, sz):
        """A box placed in a local frame (origin ox, oz on the ground, turned ry about y): cx, cz are local."""
        c, s_ = math.cos(ry), math.sin(ry)

        def w(x, y, z):  # local (x, z) -> world, as three.js turns an object by rotation.y
            return (ox + x * c + z * s_, y, oz - x * s_ + z * c)

        x0, x1, y0, y1, z0, z1 = cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2
        for quad, k in (([(x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0)], 1.0),
                        ([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], 0.97),
                        ([(x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0)], 0.97),
                        ([(x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1)], 0.95),
                        ([(x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)], 0.95),
                        ([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], 0.8)):
            self.face([w(*q) for q in quad], color, k)

    def tube(self, color, pts, r0, r1, seg=8, cap=True):
        """A tapered round tube through game points (a finger, a branch), capped with a little dome."""
        P = [Vector(p) for p in pts]
        rings = []
        for i, p in enumerate(P):
            t = (P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)]).normalized()
            ref = Vector((0, 1, 0)) if abs(t.y) < 0.9 else Vector((1, 0, 0))
            a = t.cross(ref).normalized()
            b = t.cross(a).normalized()
            r = r0 + (r1 - r0) * i / (len(P) - 1)
            rings.append([p + (a * math.cos(k / seg * 2 * math.pi) + b * math.sin(k / seg * 2 * math.pi)) * r
                          for k in range(seg)])
        for i in range(len(rings) - 1):
            for k in range(seg):
                j = (k + 1) % seg
                quad = [rings[i][j], rings[i][k], rings[i + 1][k], rings[i + 1][j]]
                self.face_out(quad, color, sum(quad, Vector()) / 4 - (P[i] + P[i + 1]) / 2)
        if cap:
            tip = P[-1] + (P[-1] - P[-2]).normalized() * r1
            for k in range(seg):
                j = (k + 1) % seg
                self.face_out([rings[-1][j], rings[-1][k], tip], color, tip - P[-1])

    def face_out(self, pts, color, out, k=1.0):
        """A face wound so its normal points along `out`."""
        n = (pts[1] - pts[0]).cross(pts[2] - pts[0])
        if n.dot(out) < 0:
            pts = pts[::-1]
        return self.face([tuple(p) for p in pts], color, k)

    def object(self, name):
        self.bm.faces.index_update()
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts, dist=1e-5)
        # every piece is wound outward as it is drawn (boxes, slabs, rings): no normals to recalculate
        ob = kit.mesh_object(name, self.bm)
        ob['kind'] = self.kind
        ob['flat'] = self.flat
        return ob


class Kit:
    def __init__(self):
        self.parts = {}

    def __getitem__(self, kind):
        if kind not in self.parts:
            self.parts[kind] = Mesh(kind, flat=kind not in ('metal',))
        return self.parts[kind]


# ---------------------------------------------------------------- roofs
def gable(K, b, h, color, over=0.55, pitch=34, t=0.16, gable_color=None):
    """A tiled roof pitched along the building's longer side, its ends closed by plaster gables."""
    x0, x1, z0, z1 = b['x'] - b['w'] / 2, b['x'] + b['w'] / 2, b['z'] - b['d'] / 2, b['z'] + b['d'] / 2
    along_x = b['w'] >= b['d']
    span = (b['d'] if along_x else b['w']) / 2
    rise = (span + over) * math.tan(math.radians(pitch))
    ridge = h + rise - over * math.tan(math.radians(pitch))
    ye = h - over * math.tan(math.radians(pitch))  # the eave's lip, below the wall top
    tile = K['tile']
    if along_x:
        xa, xb, zc = x0 - over, x1 + over, b['z']
        tile.slab(color, [(xa, ye, z1 + over), (xb, ye, z1 + over), (xb, ridge, zc), (xa, ridge, zc)], t)
        tile.slab(color, [(xb, ye, z0 - over), (xa, ye, z0 - over), (xa, ridge, zc), (xb, ridge, zc)], t)
        for x, s in ((x0, 1), (x1, -1)):
            K['plaster'].face([(x, h, z0), (x, h, z1), (x, ridge - t, zc)][::s], gable_color)
        K['plain'].box(TRIM, b['x'], ridge + 0.06, zc, b['w'] + 2 * over + 0.1, 0.16, 0.26)
        for x in (xa - 0.02, xb + 0.02):  # bargeboards
            for zz in (z1 + over, z0 - over):
                K['plain'].face([(x, ye - 0.05, zz), (x, ridge - 0.05, zc), (x, ridge + 0.12, zc),
                                 (x, ye + 0.12, zz)][:: (1 if (x > b['x']) == (zz > zc) else -1)], TRIM)
    else:
        za, zb, xc = z0 - over, z1 + over, b['x']
        tile.slab(color, [(x1 + over, ye, zb), (x1 + over, ye, za), (xc, ridge, za), (xc, ridge, zb)], t)
        tile.slab(color, [(x0 - over, ye, za), (x0 - over, ye, zb), (xc, ridge, zb), (xc, ridge, za)], t)
        for z, s in ((z0, -1), (z1, 1)):
            K['plaster'].face([(x0, h, z), (x1, h, z), (xc, ridge - t, z)][::s], gable_color)
        K['plain'].box(TRIM, xc, ridge + 0.06, b['z'], 0.26, 0.16, b['d'] + 2 * over + 0.1)
    return ridge


def hip(K, b, h, color, over=0.55, pitch=30, t=0.16):
    """A hipped roof: four tiled slopes, a short ridge along the longer side (none on a square: a pyramid)."""
    x0, x1, z0, z1 = b['x'] - b['w'] / 2 - over, b['x'] + b['w'] / 2 + over, b['z'] - b['d'] / 2 - over, \
        b['z'] + b['d'] / 2 + over
    W, D = x1 - x0, z1 - z0
    tan = math.tan(math.radians(pitch))
    ye = h - over * tan
    half = min(W, D) / 2
    top = ye + half * tan
    if W >= D:
        ra, rb = (x0 + half, b['z']), (x1 - half, b['z'])
    else:
        ra, rb = (b['x'], z0 + half), (b['x'], z1 - half)
    A, B = (ra[0], top, ra[1]), (rb[0], top, rb[1])
    c00, c10, c11, c01 = (x0, ye, z0), (x1, ye, z0), (x1, ye, z1), (x0, ye, z1)
    tile = K['tile']
    if W >= D:
        tile.slab(color, [c01, c11, B, A], t)
        tile.slab(color, [c10, c00, A, B], t)
        tile.slab(color, [c00, c01, A], t)
        tile.slab(color, [c11, c10, B], t)
    else:
        tile.slab(color, [c11, c10, B, A][::-1] if False else [c10, c11, B, A], t)
        tile.slab(color, [c01, c00, A, B], t)
        tile.slab(color, [c00, c10, A], t)
        tile.slab(color, [c11, c01, B], t)
    if abs(A[0] - B[0]) + abs(A[2] - B[2]) > 0.01:
        K['plain'].box(TRIM, (A[0] + B[0]) / 2, top + 0.05, (A[2] + B[2]) / 2,
                       abs(A[0] - B[0]) + 0.3 if W >= D else 0.24, 0.14, abs(A[2] - B[2]) + 0.3 if W < D else 0.24)
    return top


def chimney(K, x, z, base, top, color):
    K['plaster'].box(color, x, (base + top) / 2, z, 0.8, top - base, 0.8)
    K['plain'].box(TRIM, x, top + 0.08, z, 1.0, 0.16, 1.0)
    K['plain'].box(0x55504A, x, top + 0.28, z, 0.45, 0.25, 0.45)


# ---------------------------------------------------------------- walls, windows, doors
def faces_of(b):
    """Each wall: (outward normal nx, nz), its centre on the wall, its width, and the axis along it."""
    x, z, w, d = b['x'], b['z'], b['w'], b['d']
    return [((1, 0), (x + w / 2, z), d), ((-1, 0), (x - w / 2, z), d), ((0, 1), (x, z + d / 2), w),
            ((0, -1), (x, z - d / 2), w)]


def at(face, u, y, out=0.0):
    """A point on a wall: u metres along it (from its centre), y up, `out` metres proud of it."""
    (nx, nz), (cx, cz), _ = face
    # walking along the wall with the outside on your left... any fixed tangent works
    tx, tz = -nz, nx
    return (cx + tx * u + nx * out, y, cz + tz * u + nz * out)


def wall_box(K, kind, color, face, u, y, along, height, depth, out):
    """A box sitting on a wall: `along` wide, `height` tall, `depth` deep, its back `out` from the wall."""
    (nx, nz), _, _ = face
    p = at(face, u, y, out + depth / 2)
    sx = depth if nx else along
    sz = along if nx else depth
    K[kind].box(color, p[0], p[1], p[2], sx, height, sz)


def window(K, face, u, y, style, shutter=None, bloom=False, pane='window', wide=1.0):
    """A framed, mullioned window: pane, frame, sill and lintel; shutters and a flower box for the houses."""
    W, H = 1.25 * wide, 1.55
    wall_box(K, pane, 0x2A2C30, face, u, y, W, H, 0.02, 0.01)
    fr = 0.11
    wall_box(K, 'plain', TRIM, face, u, y + H / 2 + fr / 2, W + 2 * fr, fr, 0.1, 0)
    for du in (-W / 2 - fr / 2, W / 2 + fr / 2):
        wall_box(K, 'plain', TRIM, face, u + du, y, fr, H, 0.1, 0)
    # mullions: a cross of glazing bars, flat on the glass
    bar(K, face, u, y, 0.06, H, 0.035)
    bar(K, face, u, y + 0.25, W, 0.06, 0.035)
    wall_box(K, 'stone', STONE, face, u, y - H / 2 - fr - 0.06, W + 0.5, 0.12, 0.26, 0)
    if style != 'modern':
        wall_box(K, 'stone', STONE, face, u, y + H / 2 + fr + 0.1, W + 0.45, 0.2, 0.12, 0)
    if shutter is not None:
        for s in (-1, 1):
            wall_box(K, 'wood-y', shutter, face, u + s * (W / 2 + fr + 0.34), y, 0.6, H + 0.1, 0.06, 0.02)
    if bloom:
        wall_box(K, 'wood-x', 0x7B5B3A, face, u, y - H / 2 - 0.34, W + 0.1, 0.3, 0.32, 0.06)
        for k in range(3):
            p = at(face, u - 0.4 + k * 0.4, y - H / 2 - 0.12, 0.22)
            K['plain'].blob(BLOOM[(k + int(u * 7)) % len(BLOOM)] if k != 1 else LEAF, *p, 0.17)


def bar(K, face, u, y, along, height, out):
    """A flat strip lying on a wall, `out` metres proud of it."""
    a, b = at(face, u - along / 2, y - height / 2, out), at(face, u + along / 2, y - height / 2, out)
    c, d = at(face, u + along / 2, y + height / 2, out), at(face, u - along / 2, y + height / 2, out)
    # wound so its normal points out of the wall (a → b runs along the wall's tangent, b → c up)
    K['plain'].face([d, c, b, a], TRIM)


def door(K, face, u, style, tall=2.4, width=1.4, canopy=True, transom=True, color=DOOR):
    wall_box(K, 'wood-y', color, face, u, tall / 2, width, tall, 0.06, 0.0)
    for k in (-1, 1):  # panels
        wall_box(K, 'wood-y', color, face, u + k * width / 4, tall * 0.35, width * 0.36, tall * 0.4, 0.04, 0.05)
    wall_box(K, 'stone', STONE, face, u - width / 2 - 0.12, tall / 2, 0.24, tall + 0.1, 0.14, 0)
    wall_box(K, 'stone', STONE, face, u + width / 2 + 0.12, tall / 2, 0.24, tall + 0.1, 0.14, 0)
    top = tall
    if transom:
        wall_box(K, 'window', 0x2A2C30, face, u, tall + 0.3, width, 0.45, 0.02, 0.01)
        top = tall + 0.55
    wall_box(K, 'stone', STONE, face, u, top + 0.1, width + 0.75, 0.2, 0.16, 0)
    wall_box(K, 'stone', STONE_DARK, face, u, 0.09, width + 0.9, 0.18, 0.6, 0)  # the step
    if canopy:
        (nx, nz), _, _ = face
        y0 = top + 0.35
        a, b2 = at(face, u - width / 2 - 0.45, y0, 0.0), at(face, u + width / 2 + 0.45, y0, 0.0)
        c, d = at(face, u + width / 2 + 0.45, y0 - 0.32, 1.05), at(face, u - width / 2 - 0.45, y0 - 0.32, 1.05)
        pts = [a, b2, c, d]
        # wind the slab so its top faces up
        K['tile'].slab(TILE[0], pts if (nx + nz) * (1 if nx else -1) > 0 else pts[::-1], 0.08)
        for k in (-1, 1):
            p = at(face, u + k * (width / 2 + 0.3), y0 - 0.45, 0.45)
            K['wood-z' if nz else 'wood-x'].box(DOOR, p[0], p[1], p[2], 0.08 if nz else 0.8, 0.08,
                                                 0.8 if nz else 0.08)


def door_face(b):
    """The wall a building's door is on (where you stand to use it), or the one facing the plaza."""
    dx, dz = (b['door'][0] - b['x'], b['door'][1] - b['z']) if b['door'] else (-b['x'], -b['z'])
    if abs(dx) / b['w'] > abs(dz) / b['d']:
        return (1 if dx > 0 else -1, 0), dz
    return (0, 1 if dz > 0 else -1), dx


def shell(K, b, color, floors_h=3.2, style='classic', shutter=None, skip=()):
    """Plinth, walls, string courses, cornice and the windows of every floor."""
    h = b['h']
    K['plaster'].box(color, b['x'], h / 2, b['z'], b['w'], h, b['d'])
    K['stone'].box(STONE, b['x'], 0.32, b['z'], b['w'] + 0.2, 0.64, b['d'] + 0.2)
    f = 1
    while f * floors_h < h - 1.2:
        K['plain'].box(TRIM, b['x'], f * floors_h + 0.15, b['z'], b['w'] + 0.16, 0.16, b['d'] + 0.16)
        f += 1
    if style != 'modern':
        K['plain'].box(TRIM, b['x'], h - 0.12, b['z'], b['w'] + 0.36, 0.24, b['d'] + 0.36)
        K['plain'].box(TRIM, b['x'], h + 0.05, b['z'], b['w'] + 0.6, 0.12, b['d'] + 0.6)
    floors = max(1, int((h - 1) // floors_h))
    dn, _ = door_face(b)
    for face in faces_of(b):
        n, _, width = face
        count = max(1, int(width // 3.2))
        for fl in range(floors):
            for i in range(count):
                u = ((i + 0.5) / count - 0.5) * width
                # keep the ground floor clear round the door
                if fl == 0 and n == dn and abs(u - door_u(face, b)) < 1.9:
                    continue
                if (n, fl, i) in skip:
                    continue
                window(K, face, u, 1.9 + fl * floors_h, style, shutter=shutter,
                       bloom=shutter is not None and fl == 0, pane='frosted' if style == 'modern' else 'window')
    return floors


def door_u(face, b):
    """Where along a wall (u) the building's door is."""
    (nx, nz), (cx, cz), width = face
    dxz = b['door'] or (b['x'] - b['x'] * 1e-4, b['z'] - math.copysign(b['d'] / 2 + 1, b['z']))
    tx, tz = -nz, nx
    u = (dxz[0] - cx) * tx + (dxz[1] - cz) * tz
    return max(-width / 2 + 1.2, min(width / 2 - 1.2, u))


def the_door_face(b):
    n, _ = door_face(b)
    return next(f for f in faces_of(b) if f[0] == n)


# ---------------------------------------------------------------- the buildings
def house(K, b, i):
    color = PLASTER[i % len(PLASTER)]
    shell(K, b, color, shutter=SHUTTER[i % len(SHUTTER)])
    ridge = gable(K, b, b['h'], TILE[i % len(TILE)], gable_color=color)
    f = the_door_face(b)
    door(K, f, door_u(f, b), 'classic', color=[DOOR, 0x3E5A66, 0x6B3A2E, 0x2F4A3A][i % 4])
    along_x = b['w'] >= b['d']
    cx = b['x'] + (b['w'] * 0.28 * (1 if i % 2 else -1) if along_x else 0)
    cz = b['z'] + (0 if along_x else b['d'] * 0.28 * (1 if i % 2 else -1))
    chimney(K, cx, cz, b['h'] - 0.5, ridge + 0.6, color)


def apartment(K, b):
    color = 0xEDE6D8
    shell(K, b, color, shutter=0x6F8A94)
    hip(K, b, b['h'], TILE[1], pitch=26)
    f = the_door_face(b)
    door(K, f, door_u(f, b), 'classic', tall=2.6, width=2.0)
    # balconies on the street side, every other bay, floors 1..3
    (nx, nz), _, width = f
    count = int(width // 3.2)
    for fl in range(1, int((b['h'] - 1) // 3.2)):
        for i in range(1, count, 2):
            u = ((i + 0.5) / count - 0.5) * width
            y = fl * 3.2 + 0.32
            wall_box(K, 'stone', STONE, f, u, y, 2.7, 0.16, 1.15, 0)
            for k in range(9):
                p = at(f, u - 1.3 + k * 0.325, y + 0.5, 1.08)
                K['metal'].box(METAL, p[0], p[1], p[2], 0.05, 0.85, 0.05)
            wall_box(K, 'metal', METAL, f, u, y + 0.95, 2.7, 0.06, 0.08, 1.04)
            for s in (-1, 1):
                p = at(f, u + s * 1.32, y + 0.95, 0.55)
                K['metal'].box(METAL, p[0], p[1], p[2], 1.1 if nx else 0.06, 0.06, 0.06 if nx else 1.1)
            p = at(f, u + 0.9, y + 0.25, 0.75)
            K['plain'].cylinder(0x9C6B4E, p[0], y + 0.08, y + 0.42, p[2], 0.16, 0.2, 8)
            K['plain'].blob(LEAF, p[0], y + 0.6, p[2], 0.26)
    for z in (b['z'] - b['d'] * 0.3, b['z'] + b['d'] * 0.3):
        chimney(K, b['x'] + 2.2, z, b['h'] - 0.5, b['h'] + 3.6, color)


def welcome(K, b):
    color = 0xF4EFE6
    shell(K, b, color)
    hip(K, b, b['h'], TILE[2], pitch=22)
    f = the_door_face(b)
    door(K, f, 0, 'classic', tall=3.0, width=2.4, canopy=False)
    # the portico: steps, six columns, an entablature and a pediment carrying the sun
    zf = b['z'] + b['d'] / 2
    for k in range(3):
        K['stone'].box(STONE, 0, 0.1 + k * 0.2, zf + 2.0 - k * 0.45, 17 - k * 0.6, 0.2, 4.0 - k * 0.9)
    for i in (-3, -2, -1, 1, 2, 3):
        x = i * 2.5
        K['plain'].cylinder(STONE, x, 0.6, 6.0, zf + 2.6, 0.42, 0.36, 16)
        K['plain'].box(TRIM, x, 0.7, zf + 2.6, 1.05, 0.2, 1.05)
        K['plain'].box(TRIM, x, 6.05, zf + 2.6, 1.0, 0.25, 1.0)
    K['plain'].box(TRIM, 0, 6.5, zf + 1.6, 16.6, 0.7, 3.4)
    K['plain'].box(TRIM, 0, 6.95, zf + 1.6, 17.0, 0.2, 3.6)
    zp = zf + 3.35
    tri = [(-8.3, 7.05, zp), (8.3, 7.05, zp), (0, 9.3, zp)]
    K['plaster'].face(tri, color)
    K['plaster'].face([(x, y, zp - 0.3) for x, y, _ in tri][::-1], color)
    K['tile'].slab(TILE[2], [(-8.8, 6.95, zp + 0.25), (0, 9.55, zp + 0.25), (0, 9.55, zf - 0.3),
                             (-8.8, 6.95, zf - 0.3)], 0.14)
    K['tile'].slab(TILE[2], [(0, 9.55, zp + 0.25), (8.8, 6.95, zp + 0.25), (8.8, 6.95, zf - 0.3),
                             (0, 9.55, zf - 0.3)], 0.14)
    sun_disc(K, 0, 7.9, zp + 0.06, 0.75)
    # a cupola on the ridge
    K['plaster'].box(color, 0, b['h'] + 2.4, b['z'], 2.4, 1.8, 2.4)
    hip(K, dict(x=0, z=b['z'], w=2.4, d=2.4), b['h'] + 3.3, TILE[2], over=0.3, pitch=40, t=0.1)
    for s in (-1, 1):
        K['window'].box(0x2A2C30, s * 1.21, b['h'] + 2.5, b['z'], 0.02, 1.0, 0.9)
        K['window'].box(0x2A2C30, 0, b['h'] + 2.5, b['z'] + s * 1.21, 0.9, 1.0, 0.02)


def sun_disc(K, x, y, z, r, axis='z'):
    """The 慈愛組織 sun: a gold disc with rays, on a wall facing +z (or +x / -x)."""
    seg = 28
    for i in range(seg):
        a0, a1 = i / seg * 2 * math.pi, (i + 1) / seg * 2 * math.pi
        rr = r * (1.35 if i % 2 == 0 else 1.0)
        pts = [(0, 0), (math.cos(a0) * r, math.sin(a0) * r), (math.cos((a0 + a1) / 2) * rr, math.sin((a0 + a1) / 2) * rr),
               (math.cos(a1) * r, math.sin(a1) * r)]
        if axis == 'z':
            K['gold'].face([(x + px, y + py, z) for px, py in pts], GOLD)
        elif axis == '-x':
            K['gold'].face([(x, y + py, z + px) for px, py in pts], GOLD)
        else:
            K['gold'].face([(x, y + py, z - px) for px, py in pts], GOLD)


def ration(K, b):
    color = 0xE8DFCB
    shell(K, b, color, shutter=0x8A6F5A)
    gable(K, b, b['h'], TILE[3], gable_color=color)
    f = the_door_face(b)
    u = door_u(f, b)
    door(K, f, u, 'classic', width=2.2, canopy=False)
    # a striped market awning along the whole door side, on posts
    (nx, nz), _, width = f
    n = 10
    for i in range(n):
        u0 = -width / 2 + 0.3 + i * (width - 0.6) / n
        u1 = u0 + (width - 0.6) / n
        a, b2 = at(f, u0, 3.7, 0.0), at(f, u1, 3.7, 0.0)
        c, d = at(f, u1, 2.9, 2.4), at(f, u0, 2.9, 2.4)
        pts = [a, b2, c, d] if nx < 0 or nz > 0 else [b2, a, d, c]
        K['cloth'].slab(0xC8513E if i % 2 else 0xF2EBDD, pts, 0.04)
        valance = [d, c, (c[0], 2.6, c[2]), (d[0], 2.6, d[2])]
        K['cloth'].face(valance if nx < 0 or nz > 0 else valance[::-1], 0xC8513E if i % 2 else 0xF2EBDD)
    for uu in (-width / 2 + 0.4, width / 2 - 0.4):
        p = at(f, uu, 1.45, 2.35)
        K['wood-y'].box(DOOR, p[0], p[1], p[2], 0.12, 2.9, 0.12)
    # crates and sacks to either side of the door
    for k, uu in enumerate((u - 3.2, u - 2.4, u + 2.6, u + 3.4)):
        p = at(f, uu, 0.3, 0.9)
        K['wood-x'].box(0x9A7B55, p[0], 0.3, p[2], 0.7, 0.6, 0.7)
        if k % 2:
            K['cloth'].blob(0xCDBB92, p[0], 0.85, p[2], 0.3)


def kiosk(K, b):
    color = 0xF2ECDE
    shell(K, b, color)
    hip(K, b, b['h'], TILE[0], over=0.7, pitch=38)
    K['gold'].cylinder(GOLD, b['x'], b['h'] + 2.0, b['h'] + 2.7, b['z'], 0.08, 0.02, 8)
    # the wall of numbered mailboxes on the door side
    f = the_door_face(b)
    for r in range(3):
        for c in range(4):
            wall_box(K, 'gold', GOLD, f, -1.2 + c * 0.8, 1.0 + r * 0.55, 0.65, 0.45, 0.08, 0.02)
            wall_box(K, 'plain', 0x3B3226, f, -1.2 + c * 0.8, 1.08 + r * 0.55, 0.32, 0.05, 0.03, 0.1)


def admin(K, b):
    color = 0xE9EEF0
    shell(K, b, color, style='modern')
    # a flat roof behind a parapet, plant on it, a mast with a dish
    h = b['h']
    x0, x1, z0, z1 = b['x'] - b['w'] / 2, b['x'] + b['w'] / 2, b['z'] - b['d'] / 2, b['z'] + b['d'] / 2
    for (cx, cz, sx, sz) in ((b['x'], z0, b['w'], 0.3), (b['x'], z1, b['w'], 0.3), (x0, b['z'], 0.3, b['d']),
                             (x1, b['z'], 0.3, b['d'])):
        K['plaster'].box(color, cx, h + 0.45, cz, sx + 0.1, 0.9, sz + 0.1)
        K['metal'].box(0x8B949A, cx, h + 0.93, cz, sx + 0.2, 0.06, sz + 0.2)
    K['stone'].box(0xB9BEC0, b['x'], h + 0.04, b['z'], b['w'] - 0.4, 0.08, b['d'] - 0.4)
    for k in range(3):
        K['metal'].box(0x9BA3A8, b['x'] + 1.5, h + 0.6, b['z'] - 3 + k * 2.2, 1.6, 1.1, 1.4)
    K['metal'].cylinder(METAL, x1 - 2, h, h + 7, z0 + 2, 0.12, 0.05, 8)
    for k in range(3):
        K['metal'].box(METAL, x1 - 2, h + 2.5 + k * 1.5, z0 + 2, 1.2 - k * 0.3, 0.06, 0.06)
    # vertical strips down the door side, and the sun over the door
    f = the_door_face(b)
    door(K, f, door_u(f, b), 'modern', tall=2.7, width=1.8, canopy=False, transom=False, color=0x2E3438)
    sun_disc(K, x0 - 0.06, h - 2, b['z'], 0.9, axis='-x')
    for u in (-4.5, 4.5):
        wall_box(K, 'plain', 0xC9D0D3, f, u, h / 2, 0.5, h, 0.25, 0)


def diner(K, b):
    color = 0xF0E4D0
    f = the_door_face(b)
    # the street front is mostly glass: leave the windows out of that face and draw shop windows instead
    shell(K, b, color, shutter=0x7C9A7E, skip={(f[0], 0, i) for i in range(8)})
    gable(K, b, b['h'], TILE[0], gable_color=color)
    u = door_u(f, b)
    door(K, f, u, 'classic', canopy=False, color=0x7A3A2A)
    for s in (-1, 1):
        wall_box(K, 'window', 0x2A2C30, f, u + s * 3.2, 1.6, 3.4, 1.9, 0.02, 0.01)
        for k in range(4):
            wall_box(K, 'plain', 0x7A3A2A, f, u + s * 3.2 - 1.7 + k * (3.4 / 3), 1.6, 0.1, 2.0, 0.08, 0)
        wall_box(K, 'plain', 0x7A3A2A, f, u + s * 3.2, 0.6, 3.6, 0.12, 0.12, 0)
        wall_box(K, 'plain', 0x7A3A2A, f, u + s * 3.2, 2.6, 3.6, 0.12, 0.12, 0)
    (nx, nz), _, width = f
    n = 12
    for i in range(n):
        u0 = -width / 2 + 0.2 + i * (width - 0.4) / n
        u1 = u0 + (width - 0.4) / n
        a, b2 = at(f, u0, 3.4, 0.0), at(f, u1, 3.4, 0.0)
        c, d = at(f, u1, 2.85, 1.5), at(f, u0, 2.85, 1.5)
        pts = [a, b2, c, d] if nx < 0 or nz > 0 else [b2, a, d, c]
        K['cloth'].slab(0x2F6B5A if i % 2 else 0xF2EBDD, pts, 0.04)
    chimney(K, b['x'] - b['w'] * 0.3, b['z'] + b['d'] * 0.2, b['h'] - 0.5, b['h'] + 3.2, 0xB5ACA0)


def build():
    K = Kit()
    houses = 0
    for b in buildings():
        if b['id'].startswith('house'):
            house(K, b, houses)
            houses += 1
        else:
            {'apartment': apartment, 'welcome': welcome, 'ration': ration, 'kiosk': kiosk, 'admin': admin,
             'diner': diner}[b['id']](K, b)
    obs = [m.object(kind) for kind, m in K.parts.items()]
    # a ground plane while the occlusion bakes, so walls darken where they meet the street; not exported
    bpy.ops.mesh.primitive_plane_add(size=120, location=(0, 0, 0))
    ground = bpy.context.active_object
    ob = kit.join('town', obs)
    kit.smooth(ob)
    kit.bake_ao(ob, strength=0.6, samples=32)
    bpy.data.objects.remove(ground)
    return kit.finish(ob)


# ---------------------------------------------------------------- the streets: wall, gate, statue, stele, board, lamps,
# benches and planters (models/props/town-street.glb). The lamps' glowing globes stay the game's (they light up at
# night); so do the statue's sun and its turning halo, which the hands here are shaped to hold.
WALL_PLASTER = 0xE8E2D4
MARBLE = 0xF2EEE6
BRONZE = 0x3B3D40


def town_wall(K, L):
    W, G = L['WALL'], L['GATE_HALF']
    H = 4.2
    runs = [((-W - 0.5, -W), (W + 0.5, -W)), ((-W, -W), (-W, W)), ((W, -W), (W, W)), ((-W - 0.5, W), (-G - 1.2, W)),
            ((G + 1.2, W), (W + 0.5, W))]
    for (ax, az), (bx, bz) in runs:
        cx, cz, lx, lz = (ax + bx) / 2, (az + bz) / 2, abs(bx - ax), abs(bz - az)
        sx, sz = max(lx, 1.0), max(lz, 1.0)
        K['plaster'].box(WALL_PLASTER, cx, H / 2, cz, sx, H, sz)
        K['stone'].box(STONE, cx, 0.4, cz, sx + 0.2 * (lz > lx), 0.8, sz + 0.2 * (lx > lz))
        K['stone'].box(STONE, cx, H + 0.1, cz, sx + 0.3 * (lz > lx) + 0.2, 0.2, sz + 0.3 * (lx > lz) + 0.2)
        n = int(max(lx, lz) // 7.5)
        for i in range(1, n):  # pilasters both sides
            t = i / n
            px, pz = ax + (bx - ax) * t, az + (bz - az) * t
            K['plaster'].box(WALL_PLASTER, px, H / 2, pz, 1.6 if lz > lx else 0.7, H + 0.05, 0.7 if lz > lx else 1.6)
            K['stone'].box(STONE, px, H + 0.25, pz, 1.8 if lz > lx else 0.9, 0.18, 0.9 if lz > lx else 1.8)
    # the gate: two stone pillars and an arch carrying the sun
    for x in (-G - 0.4, G + 0.4):
        K['stone'].box(STONE, x, 3.6, W, 1.6, 7.2, 1.8)
        K['stone'].box(STONE_DARK, x, 7.35, W, 2.0, 0.3, 2.2)
        K['stone'].box(STONE_DARK, x, 0.3, W, 2.0, 0.6, 2.2)
    r0, r1, yc, n = G - 0.4, G + 0.6, 7.2, 14
    for i in range(n):
        a0, a1 = math.pi * i / n, math.pi * (i + 1) / n
        p = [(math.cos(a0) * r0, yc + math.sin(a0) * r0), (math.cos(a0) * r1, yc + math.sin(a0) * r1),
             (math.cos(a1) * r1, yc + math.sin(a1) * r1), (math.cos(a1) * r0, yc + math.sin(a1) * r0)]
        zf, zb = W + 0.85, W - 0.85
        col = STONE if i % 2 else 0xB3AB9B
        K['stone'].face([(x, y, zf) for x, y in p[::-1]], col)
        K['stone'].face([(x, y, zb) for x, y in p], col)
        K['stone'].face([(p[1][0], p[1][1], zb), (p[2][0], p[2][1], zb), (p[2][0], p[2][1], zf),
                         (p[1][0], p[1][1], zf)], col)
        K['stone'].face([(p[0][0], p[0][1], zf), (p[3][0], p[3][1], zf), (p[3][0], p[3][1], zb),
                         (p[0][0], p[0][1], zb)], col)
    sun_disc(K, 0, yc + r1 + 0.9, W + 0.9, 1.0)
    sun_disc(K, 0, yc + r1 + 0.9, W - 0.9, 1.0)
    K['stone'].box(STONE, 0, yc + r1 + 0.2, W, 2.0, 0.5, 1.9)


def statue(K, L):
    """A stepped round pedestal and two open hands of marble, palms up, cupping the sun (the game's glowing sphere,
    r 0.9 at y 4.4) between them."""
    S = L['STATUE']
    x0, z0 = S['x'], S['z']
    M = K['statue']
    for r, y0, y1 in ((S['r'], 0, 0.45), (S['r'] - 0.35, 0.45, 0.8), (S['r'] - 0.7, 0.8, 1.15)):
        M.cylinder(STONE if r == S['r'] else MARBLE, x0, y0, y1, z0, r, r, 40)
    M.cylinder(MARBLE, x0, 1.15, 2.6, z0, 1.25, 1.05, 32)
    M.cylinder(0xD9CFB8, x0, 2.0, 2.15, z0, 1.2, 1.18, 32)
    for side in (-1, 1):
        # the forearm rising out of the drum, the wrist, the cupped palm
        M.tube(MARBLE, [(x0 + side * 0.45, 2.4, z0), (x0 + side * 0.95, 3.0, z0), (x0 + side * 1.3, 3.45, z0)],
               0.42, 0.34, 14, cap=False)
        M.blob(MARBLE, x0 + side * 1.3, 3.62, z0, 0.62, sub=2, scale=(0.95, 0.42, 1.25), shade=False)
        # four fingers curling up and in round the sun, the thumb from the near side
        for f in range(4):
            dz = (f - 1.5) * 0.36
            base = (x0 + side * 1.75, 3.75, z0 + dz)
            M.tube(MARBLE, [base, (x0 + side * 1.95, 4.25, z0 + dz * 1.05), (x0 + side * 1.75, 4.85, z0 + dz * 1.1),
                            (x0 + side * 1.35, 5.2 - abs(dz) * 0.4, z0 + dz * 1.0)], 0.17, 0.12, 10)
        M.tube(MARBLE, [(x0 + side * 1.1, 3.75, z0 + 0.7), (x0 + side * 1.05, 4.2, z0 + 1.05),
                        (x0 + side * 0.85, 4.65, z0 + 1.0)], 0.18, 0.13, 10)


def stele(K, L):
    S = L['STELE']
    x, z = S['x'], S['z']
    dark, panel = 0x55575C, 0x46484D
    K['carved'].box(0x6A6C70, x, 0.2, z, 2.0, 0.4, 1.0)
    K['carved'].box(dark, x, 1.6, z, 1.5, 2.4, 0.5)
    # a rounded head: a half-disc slab across the top
    n = 12
    top = []
    for i in range(n + 1):
        a = math.pi * i / n
        top.append((x + math.cos(a) * 0.75, 2.8 + math.sin(a) * 0.55))
    for zz, s in ((z + 0.25, 1), (z - 0.25, -1)):
        K['carved'].face([(px, py, zz) for px, py in (top if s < 0 else top[::-1])], dark)
    for i in range(n):
        (ax, ay), (bx, by) = top[i], top[i + 1]
        K['carved'].face([(ax, ay, z - 0.25), (bx, by, z - 0.25), (bx, by, z + 0.25), (ax, ay, z + 0.25)][::-1], dark)
    for zz in (z + 0.26, z - 0.26):
        K['carved'].box(panel, x, 1.75, zz, 1.1, 1.8, 0.02)
    sun_disc(K, x, 3.0, z + 0.27, 0.22)
    sun_disc(K, x, 3.0, z - 0.27, 0.22)


def board(K, L):
    B = L['BOARD']
    x, z = B['x'], B['z']
    for s in (-1, 1):
        K['wood-y'].box(DOOR, x + s * 0.75, 1.05, z, 0.14, 2.1, 0.14)
    K['plain'].box(0xF3EEDF, x, 1.55, z, 1.5, 1.05, 0.06)
    for dy in (-0.56, 0.56):
        K['wood-x'].box(DOOR, x, 1.55 + dy, z, 1.66, 0.09, 0.12)
    K['tile'].slab(TILE[0], [(x - 1.0, 2.25, z + 0.45), (x + 1.0, 2.25, z + 0.45), (x + 1.0, 2.55, z),
                             (x - 1.0, 2.55, z)], 0.06)
    K['tile'].slab(TILE[0], [(x + 1.0, 2.25, z - 0.45), (x - 1.0, 2.25, z - 0.45), (x - 1.0, 2.55, z),
                             (x + 1.0, 2.55, z)], 0.06)
    for i, c in enumerate((0xFFFFFF, 0xE9E2CE, 0xF7F3E8)):  # pinned notices
        K['plain'].box(c, x - 0.45 + i * 0.45, 1.6 - (i % 2) * 0.15, z + 0.045, 0.36, 0.48, 0.01)


def lamp(K, x, z):
    K['metal'].cylinder(BRONZE, x, 0, 0.55, z, 0.22, 0.17, 8)
    K['metal'].cylinder(BRONZE, x, 0.55, 3.75, z, 0.085, 0.065, 8)
    K['metal'].cylinder(BRONZE, x, 3.72, 3.85, z, 0.16, 0.16, 8)
    for k in range(4):  # the lantern's cage round the globe (the globe itself is the game's)
        a = k / 4 * 2 * math.pi + math.pi / 4
        K['metal'].box(BRONZE, x + math.cos(a) * 0.3, 4.15, z + math.sin(a) * 0.3, 0.04, 0.62, 0.04)
    K['metal'].cylinder(BRONZE, x, 4.45, 4.5, z, 0.36, 0.36, 8)
    K['metal'].cylinder(BRONZE, x, 4.5, 4.78, z, 0.36, 0.06, 8)
    K['gold'].cylinder(GOLD, x, 4.78, 4.95, z, 0.04, 0.0, 6)


def bench(K, f):
    x, z, ry = f['x'], f['z'], f['ry']
    for s in (-0.8, 0.8):  # cast-iron ends
        K['metal'].obox(BRONZE, x, z, ry, s, 0.22, 0.12, 0.08, 0.44, 0.08)
        K['metal'].obox(BRONZE, x, z, ry, s, 0.22, -0.18, 0.08, 0.44, 0.08)
        K['metal'].obox(BRONZE, x, z, ry, s, 0.46, -0.03, 0.08, 0.06, 0.5)
        K['metal'].obox(BRONZE, x, z, ry, s, 0.72, -0.27, 0.08, 0.6, 0.08)
    for k in range(4):  # seat slats
        K['wood-x'].obox(0x9A7450, x, z, ry, 0, 0.5, 0.17 - k * 0.12, 1.8, 0.05, 0.1)
    for k in range(2):  # back slats
        K['wood-x'].obox(0x9A7450, x, z, ry, 0, 0.75 + k * 0.2, -0.29, 1.8, 0.12, 0.04)


def planter(K, f, i):
    x, z = f['x'], f['z']
    K['stone'].box(0xB4AC9C, x, 0.35, z, 1.7, 0.7, 1.7)
    K['stone'].box(0xC2BAAA, x, 0.74, z, 1.9, 0.1, 1.9)
    K['plain'].box(0x4A3A2C, x, 0.7, z, 1.5, 0.04, 1.5)
    K['wood-y'].tube(0x6B5240, [(x, 0.6, z), (x + 0.05, 1.5, z), (x - 0.05, 2.3, z + 0.05)], 0.09, 0.05, 6)
    greens = (0x5E7F4A, 0x6F8F55, 0x557545)
    for k in range(6):
        a = k * 2.4 + i
        K['leaf'].blob(greens[k % 3], x + math.cos(a) * 0.45, 2.45 + (k % 3) * 0.2, z + math.sin(a) * 0.45,
                       0.5 - (k % 2) * 0.1, sub=1)
    K['leaf'].blob(greens[i % 3], x, 2.85, z, 0.45, sub=1)
    for k in range(6):
        a = k / 6 * 2 * math.pi + i
        K['plain'].blob(BLOOM[(k + i) % len(BLOOM)], x + math.cos(a) * 0.6, 0.82, z + math.sin(a) * 0.6, 0.12)


def street():
    L = layout()
    K = Kit()
    town_wall(K, L)
    statue(K, L)
    stele(K, L)
    board(K, L)
    for l in L['LAMPS']:
        lamp(K, l['x'], l['z'])
    for i, f in enumerate(L['FURNITURE']):
        (bench if f['kind'] == 'bench' else lambda K, f: planter(K, f, i))(K, f)
    K['statue'].flat = False
    K['leaf'].flat = False
    obs = [m.object(kind) for kind, m in K.parts.items() if len(m.bm.faces)]
    bpy.ops.mesh.primitive_plane_add(size=160, location=(0, 0, 0))
    ground = bpy.context.active_object
    ob = kit.join('town-street', obs)
    kit.smooth(ob)
    kit.bake_ao(ob, strength=0.6, samples=32)
    bpy.data.objects.remove(ground)
    return kit.finish(ob)
