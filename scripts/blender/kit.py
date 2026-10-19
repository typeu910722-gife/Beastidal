"""Shared helpers for the Blender prop scripts.

Every prop is modelled in the game's own coordinates (three.js: x right, y up, bow / front towards +z) and converted
to Blender's z-up frame on the way in, so the numbers here match the procedural builders in dist/*.js one for one.
Each prop ends as one mesh, vertex-coloured, with ambient occlusion baked into its colours: soft contact shadows
without a texture to download. Its faces are grouped by what they are made of (KINDS), one material each, and the
game gives each material the surface it names (surfaces.js: wood grain along an axis, rope, cloth, metal), so a prop
is a handful of draw calls where the procedural model was dozens.
"""
import math

import bpy  # first: the bpy module is what makes bmesh and mathutils importable
import bmesh  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402


# material name -> (roughness, metallic, double-sided). wood-x/y/z: the grain runs along that game axis.
KINDS = {
    'wood-x': (0.62, 0.0, False),
    'wood-y': (0.62, 0.0, False),
    'wood-z': (0.62, 0.0, False),
    # decking: wood with the dark seams and butt joints of laid boards, as the game paints its own decks
    'deck-x': (0.62, 0.0, False),
    'deck-z': (0.62, 0.0, False),
    'rope': (0.85, 0.0, False),
    'cloth': (0.9, 0.0, True),
    'metal': (0.45, 0.55, False),
    'plain': (0.6, 0.0, False),
}


def g2b(x, y, z):
    """Game (three.js, y up, +z forward) to Blender (z up). The glTF exporter turns it back."""
    return Vector((x, -z, y))


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 48
    return scene


def rgb(hex_or_tuple):
    if isinstance(hex_or_tuple, int):
        h = hex_or_tuple
        c = ((h >> 16) & 255, (h >> 8) & 255, h & 255)
        # the game picks colours in sRGB; vertex colours are stored linear
        return tuple(((v / 255) / 12.92 if v / 255 <= 0.04045 else ((v / 255 + 0.055) / 1.055) ** 2.4) for v in c)
    return hex_or_tuple


def mesh_object(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def paint(ob, color_of_face):
    """Fills the 'Col' colour attribute face by face: color_of_face(centre, normal) -> linear rgb."""
    me = ob.data
    attr = me.color_attributes.get('Col') or me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
    for poly in me.polygons:
        c = color_of_face(poly.center, poly.normal)
        if c is None:
            continue  # keep the colour it already has
        for li in poly.loop_indices:
            attr.data[li].color = (c[0], c[1], c[2], 1.0)
    return ob


def solid_color(ob, color, kind='plain'):
    ob['kind'] = kind
    return paint(ob, lambda c, n: rgb(color))


def box(name, color, cx, cy, cz, sx, sy, sz, rot_y=0.0, bevel=0.0, kind=None, bevel_segments=1):
    """An axis box in game coordinates (centre, full sizes), optionally turned about the game's y axis."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        x, y, z = v.co.x * sx, v.co.z * sy, -v.co.y * sz  # unit cube in game axes
        c, s = math.cos(rot_y), math.sin(rot_y)
        x, z = x * c + z * s, -x * s + z * c
        v.co = g2b(cx + x, cy + y, cz + z)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=bevel_segments, affect='EDGES', profile=0.5)
    # a board's grain runs along its longest side, as the game's surfaces do for its own boxes
    c, s = abs(math.cos(rot_y)), abs(math.sin(rot_y))
    extent = (sx * c + sz * s, sy, sx * s + sz * c)  # the box's size along the game axes once turned
    longest = 'xyz'[extent.index(max(extent))]
    ob = solid_color(mesh_object(name, bm), color, kind or 'wood-' + longest)
    ob['flat'] = True
    return ob


def rod(name, color, a, b, radius, segments=8, kind=None):
    """A round rod between two game-space points."""
    A, B = g2b(*a), g2b(*b)
    d = B - A
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=radius, radius2=radius, depth=d.length)
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=rot, verts=bm.verts)
    bmesh.ops.translate(bm, vec=(A + B) / 2, verts=bm.verts)
    return solid_color(mesh_object(name, bm), color, kind or 'wood-' + axis_of(a, b))


def axis_of(a, b):
    """The game axis a line from a to b mostly runs along."""
    d = [abs(b[i] - a[i]) for i in range(3)]
    return 'xyz'[d.index(max(d))]


def plank(name, color, a, b, width, thick, bevel=0.0, kind=None):
    """A flat board from game point a to b, its broad face kept as upright as the line allows."""
    A, B = g2b(*a), g2b(*b)
    d = B - A
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(thick, width, d.length), verts=bm.verts)
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=rot, verts=bm.verts)
    bmesh.ops.translate(bm, vec=(A + B) / 2, verts=bm.verts)
    if bevel > 0:
        # one segment: a flat-shaded board shows a single chamfer whatever the count, and each one costs vertices
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=1, affect='EDGES', profile=0.5)
    ob = solid_color(mesh_object(name, bm), color, kind or 'wood-' + axis_of(a, b))
    ob['flat'] = True
    return ob


def tube(name, color, points, radius, closed=False, segments=6, kind='rope'):
    """A smooth tube along game-space points (a gunwale rail, a rope)."""
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    sp = cu.splines.new('NURBS')
    sp.points.add(len(points) - 1)
    for p, q in zip(sp.points, points):
        v = g2b(*q)
        p.co = (v.x, v.y, v.z, 1)
    sp.use_cyclic_u = closed
    sp.use_endpoint_u = not closed
    sp.order_u = 4
    cu.bevel_depth = radius
    cu.bevel_resolution = max(1, segments // 4)
    cu.resolution_u = 3
    ob = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(ob)
    return solid_color(to_mesh(ob), color, kind)


def torus(name, color, centre, major, minor, kind='rope'):
    """A ring lying flat (its axis along the game's y), like a coiled rope on a deck."""
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=24, minor_segments=8)
    ob = bpy.context.active_object
    ob.name = name
    # move the mesh itself: an object's location only reaches matrix_world after a depsgraph update
    ob.data.transform(Matrix.Translation(g2b(*centre)))
    return solid_color(ob, color, kind)


def to_mesh(ob):
    """Converts a curve (or anything with modifiers) to a plain mesh object in place."""
    deps = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(deps))
    out = bpy.data.objects.new(ob.name, me)
    out.matrix_world = ob.matrix_world
    bpy.context.scene.collection.objects.link(out)
    bpy.data.objects.remove(ob)
    return out


def apply_transforms(ob):
    ob.data.transform(ob.matrix_world)
    ob.matrix_world.identity()
    return ob


def kind_material(kind):
    mat = bpy.data.materials.get(kind)
    if mat is None:
        mat = bpy.data.materials.new(kind)
        mat.use_nodes = True
    return mat


def join(name, parts):
    parts = [apply_transforms(p) for p in parts]
    for p in parts:
        p.data.materials.clear()
        p.data.materials.append(kind_material(p.get('kind', 'plain')))
        attr = p.data.attributes.new('flat_part', 'BOOLEAN', 'FACE')
        for i in range(len(p.data.polygons)):
            attr.data[i].value = bool(p.get('flat'))
    # join into the first part, so the result has only the parts' own material slots
    out = parts[0]
    with bpy.context.temp_override(active_object=out, selected_editable_objects=parts):
        bpy.ops.object.join()
    out.name = out.data.name = name
    return out


def smooth(ob, angle_deg=40):
    """Round parts shade smooth, with creases sharper than angle_deg kept hard. Flat parts (boxes, boards, marked
    'flat' when made) were set flat before the join and stay flat: a deck board's top must face straight up."""
    me = ob.data
    flat = me.attributes.get('flat_part')
    # first: set_sharp_from_angle also marks every face smooth, so the flat parts are set after it
    me.set_sharp_from_angle(angle=math.radians(angle_deg))
    for poly in me.polygons:
        poly.use_smooth = not (flat and flat.data[poly.index].value)
    if flat:
        me.attributes.remove(flat)
    return ob


def bake_ao(ob, strength=0.75, samples=48):
    """Bakes ambient occlusion per vertex and multiplies it into 'Col'. Per vertex, not per face corner: corners that
    share a vertex and a paint colour stay equal, so the exported mesh does not split them apart."""
    me = ob.data
    ao = me.color_attributes.new('AO', 'FLOAT_COLOR', 'POINT')
    me.color_attributes.active_color = ao
    scene = bpy.context.scene
    scene.cycles.samples = samples
    scene.world = scene.world or bpy.data.worlds.new('World')
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.scene.objects:
        o.select_set(o == ob)
    bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
    col = me.color_attributes['Col']
    for li, loop in enumerate(me.loops):
        k = 1 - strength + strength * ao.data[loop.vertex_index].color[0]
        c = col.data[li].color
        col.data[li].color = (c[0] * k, c[1] * k, c[2] * k, 1)
    me.color_attributes.remove(ao)
    me.color_attributes.active_color = me.color_attributes['Col']
    return ob


def finish(ob):
    """Sets up each kind's material: base colour from the 'Col' attribute, its roughness and metalness, cloth seen
    from both sides. The material names are what the game reads to give each its surface."""
    for mat in ob.data.materials:
        rough, metal, double = KINDS.get(mat.name, KINDS['plain'])
        nt = mat.node_tree
        bsdf = nt.nodes.get('Principled BSDF')
        if not any(n.bl_idname == 'ShaderNodeVertexColor' for n in nt.nodes):
            attr = nt.nodes.new('ShaderNodeVertexColor')
            attr.layer_name = 'Col'
            nt.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
        bsdf.inputs['Roughness'].default_value = rough
        bsdf.inputs['Metallic'].default_value = metal
        mat.use_backface_culling = not double
    return ob


def export(obs, path):
    obs = obs if isinstance(obs, (list, tuple)) else [obs]
    for o in bpy.context.scene.objects:
        o.select_set(o in obs)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_normals=True,
        export_texcoords=False,
        export_vertex_color='MATERIAL',
        export_materials='EXPORT',
    )
    pack_colors(path)
    return {
        'verts': sum(len(o.data.vertices) for o in obs),
        'tris': sum(len(p.vertices) - 2 for o in obs for p in o.data.polygons),
        'materials': sorted({m.name for o in obs for m in o.data.materials}),
    }


def preview(ob, path, eye=(3.4, 2.2, 3.2), target=(0, 0.5, 0.2), lens=40, size=(900, 560)):
    """A quick Cycles render of the prop under a sun and a sky, for checking a model without opening the game."""
    scene = bpy.context.scene
    world = scene.world or bpy.data.worlds.new('World')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.68, 0.8, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.8
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3.2
    sun.rotation_euler = (0.75, 0.2, 0.9)
    scene.collection.objects.link(sun)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    cam.data.lens = lens
    scene.collection.objects.link(cam)
    cam.location = g2b(*eye)
    direction = g2b(*target) - cam.location
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.cycles.samples = 32
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    for o in (sun, cam):
        bpy.data.objects.remove(o)


def pack_colors(path):
    """Rewrites a GLB so COLOR_0 is stored as normalized bytes (4 per vertex) instead of floats (12), and drops the
    buffer views nothing uses any more. Plain glTF 2.0, which three.js reads without any extension."""
    import json
    import struct

    raw = open(path, 'rb').read()
    jlen = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + jlen])
    blen = struct.unpack_from('<I', raw, 20 + jlen)[0]
    binary = raw[28 + jlen:28 + jlen + blen]
    views = doc['bufferViews']
    data = [binary[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']] for v in views]
    for mesh in doc['meshes']:
        for prim in mesh['primitives']:
            i = prim['attributes'].get('COLOR_0')
            if i is None:
                continue
            acc = doc['accessors'][i]
            if acc['componentType'] != 5126:
                continue
            n = 3 if acc['type'] == 'VEC3' else 4
            src = data[acc['bufferView']][acc.get('byteOffset', 0):]
            vals = struct.unpack_from(f'<{acc["count"] * n}f', src)
            out = bytearray()
            for k in range(acc['count']):
                c = vals[k * n:k * n + n]
                # stored linear, as the float colours were
                out += bytes(max(0, min(255, round(v * 255))) for v in c[:3]) + b'\xff'
            data.append(bytes(out))
            views.append({'buffer': 0, 'byteLength': len(out)})
            acc.update(bufferView=len(views) - 1, byteOffset=0, componentType=5121, normalized=True, type='VEC4')
            acc.pop('min', None)
            acc.pop('max', None)
    used = sorted({a['bufferView'] for a in doc['accessors'] if 'bufferView' in a})
    remap = {old: new for new, old in enumerate(used)}
    blob, new_views = bytearray(), []
    for old in used:
        v = dict(views[old])
        while len(blob) % 4:
            blob += b'\0'
        v['byteOffset'] = len(blob)
        v['byteLength'] = len(data[old])
        blob += data[old]
        new_views.append(v)
    for a in doc['accessors']:
        if 'bufferView' in a:
            a['bufferView'] = remap[a['bufferView']]
    while len(blob) % 4:
        blob += b'\0'
    doc['bufferViews'] = new_views
    doc['buffers'] = [{'byteLength': len(blob)}]
    js = json.dumps(doc, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    total = 12 + 8 + len(js) + 8 + len(blob)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
        f.write(struct.pack('<II', len(blob), 0x004E4942) + bytes(blob))
