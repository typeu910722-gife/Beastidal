"""Builds the game's Blender props into dist/models/props/*.glb.

Run with Blender's Python module (pip install bpy==5.2.2, Python 3.13):
    python scripts/blender/props.py            # every prop
    python scripts/blender/props.py skiff      # just one
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import kit  # noqa: E402
import facilities  # noqa: E402
import raft  # noqa: E402
import shelter  # noqa: E402
import skiff  # noqa: E402
import town  # noqa: E402

PROPS = {
    'skiff': skiff.build,
    'shelter': shelter.build,
    'collector': facilities.collector,
    'pen': facilities.pen,
    'hatchery': facilities.hatchery,
    'beacon': facilities.beacon,
    'floor': raft.floor,
    'stairs': raft.stairs,
    'chair': raft.chair,
    'table': raft.table,
    'lamp': raft.lamp,
    'desk': raft.desk,
    'dock': raft.dock,
    'town': town.build,
    'town-street': town.street,
}
# where the preview camera stands and looks (game coordinates)
VIEWS = {
    'skiff': {},
    'shelter': {'eye': (4.6, 3.6, 5.6), 'target': (0, 1.5, 0)},
    'collector': {'eye': (4.2, 3.2, 4.8), 'target': (0, 1.2, 0)},
    'pen': {'eye': (4.8, 3.6, 5.4), 'target': (0, 0.0, 0)},
    'hatchery': {'eye': (3.6, 3.0, 4.0), 'target': (0, 1.4, 0)},
    'beacon': {'eye': (6.0, 4.6, 7.0), 'target': (0, 3.0, 0)},
    'floor': {'eye': (3.6, 2.4, 4.2), 'target': (0, 0.0, 0)},
    'stairs': {'eye': (4.4, 3.6, 4.6), 'target': (-0.8, 2.0, 0)},
    'chair': {'eye': (1.8, 1.8, 2.2), 'target': (0, 0.9, 0)},
    'table': {'eye': (2.4, 2.4, 2.8), 'target': (0, 1.0, 0)},
    'lamp': {'eye': (1.8, 2.4, 2.4), 'target': (0, 1.6, 0)},
    'desk': {'eye': (2.2, 2.4, 2.6), 'target': (0, 1.0, 0.2)},
    'dock': {'eye': (4.4, 3.4, 5.0), 'target': (0, 1.0, 0)},
    'town': {'eye': (-30, 38, 75), 'target': (0, 0, -5), 'lens': 30, 'size': (1400, 800)},
    'town-street': {'eye': (14, 9, 30), 'target': (0, 3, 0), 'lens': 32, 'size': (1400, 800)},
}
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'dist', 'models', 'props')


def main(names):
    os.makedirs(OUT, exist_ok=True)
    for name in names or PROPS:
        kit.reset()
        ob = PROPS[name]()
        path = os.path.abspath(os.path.join(OUT, name + '.glb'))
        stats = kit.export(ob, path)
        print(f'{name}: {stats["verts"]} verts, {stats["tris"]} triangles, {os.path.getsize(path) // 1024} KB')
        if os.environ.get('PREVIEW'):
            kit.preview(ob, os.path.join(os.environ['PREVIEW'], name + '.png'), **VIEWS.get(name, {}))


if __name__ == '__main__':
    main(sys.argv[1:])
