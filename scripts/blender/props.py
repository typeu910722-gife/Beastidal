"""Builds the game's Blender props into dist/models/props/*.glb.

Run with Blender's Python module (pip install bpy==5.2.2, Python 3.13):
    python scripts/blender/props.py            # every prop
    python scripts/blender/props.py skiff      # just one
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import kit  # noqa: E402
import shelter  # noqa: E402
import skiff  # noqa: E402

PROPS = {'skiff': skiff.build, 'shelter': shelter.build}
# where the preview camera stands and looks (game coordinates)
VIEWS = {
    'skiff': {},
    'shelter': {'eye': (4.6, 3.6, 5.6), 'target': (0, 1.5, 0)},
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
