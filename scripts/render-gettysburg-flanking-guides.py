#!/usr/bin/env python3
"""Render bounded native Union SW march/action structural Gettysburg v8 guides.

Run Blender --background --factory-startup --python this-file.
The checked v7 helper imports the unchanged v4 authorable rig and replaces its
single direction constant with 3. Its measurement function is compiled into this
new wrapper's namespace, so __file__, JOBS and provenance refer to v8. Exactly
one checked measurement predicate changes: a firearm must project x<0, y>0.
March retains ground origin (192,440). Only actions use native authored origin
(272,440), because the unchanged SW firing bayonet exceeds the old cell edge.
This is a scene-root registration adaptation, never a raster translation.
The original v2/v4/v5/v6/v7 scripts are never edited. Two Cycles CPU jobs run
sequentially, with eight threads and scene resets. Final PNGs are raw native
RGBA renders; no raster editing or packing. These are structural references,
not approved production artwork or independently validated anatomy/drill.
"""
import argparse
from array import array
import ast
import hashlib
import importlib.util
import inspect
import json
import math
from pathlib import Path
import struct
import sys
from types import SimpleNamespace

sys.dont_write_bytecode = True

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'scripts/render-civil-war-infantry-v2.py'
GUIDE_SOURCE = ROOT / 'scripts/render-gettysburg-action-guide.py'
V7_SOURCE = ROOT / 'scripts/render-gettysburg-board-facing-guides.py'
PRIOR_WRAPPERS = [ROOT / 'scripts/render-gettysburg-diagonal-guide.py',
                  ROOT / 'scripts/render-gettysburg-diagonal-action-guide.py',
                  V7_SOURCE]
OUTPUT = ROOT / 'docs/art-pass/candidates/gettysburg-v8'
CELL = (512, 512)
ORIGIN = (192, 440)
ORIGIN_BY_KIND = {'march': (192, 440), 'actions': (272, 440)}
MARCH_POSES = [('left-contact', 'walk', 1), ('left-passing', 'walk', 2),
               ('right-contact', 'walk', 3), ('right-passing', 'walk', 0)]
ACTION_POSES = [('ready-upright-carry', 'idle', 0), ('shoulder-aim-fire', 'fire', 0),
                ('upright-load-at-barrel', 'reload', 0), ('upright-ramrod-insertion', 'reload', 1)]
JOBS = [('union', 'SW', 3, 'march'), ('union', 'SW', 3, 'actions')]
CHECKED_ORIGINAL_HASHES = {
    SOURCE: '14ed68fd8ca42dd66641db73dac437d9219a9a715bd18c14e06be2e6558b1877',
    GUIDE_SOURCE: '7d0b3e93b958bbf9f03184b6f8e54987c578e540b3052d2efa73bada68d5257a',
    PRIOR_WRAPPERS[0]: '89748380613a939dc2cbc3f58e6f433b9baef867e4f23d2acc25ea1378079955',
    PRIOR_WRAPPERS[1]: 'e7fd86507a9ddbfb09d3ebf65408cbcf03b5b431ceb19f29902fbc7c2a3727ba',
    V7_SOURCE: '62f6492e74a9cc5c5da9f179885c34b3ca7a7efdb73b10b9f3a63894d045e0bd',
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')


def import_checked_v7_helper():
    if any(sha256(path) != digest for path, digest in CHECKED_ORIGINAL_HASHES.items()):
        raise RuntimeError('Original guide machinery differs from the checked v8 input hashes')
    spec = importlib.util.spec_from_file_location('gettysburg_v8_checked_v7_helper', V7_SOURCE)
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    if (helper.CELL, helper.ORIGIN, helper.MARCH_POSES, helper.ACTION_POSES) != (CELL, ORIGIN, MARCH_POSES, ACTION_POSES):
        raise RuntimeError('Expected the unchanged v7 camera-root, cells and eight poses')
    return helper


def scoped_measurement(helper):
    """Keep v7 geometry/padding checks; change only its cardinal firing guard.

    Compiling into v8 globals avoids modifying the imported helper's __file__
    and gives its existing receipt-writing code the correct wrapper and job
    identity. SOURCE, GUIDE_SOURCE, prior wrappers and this file are all hashed.
    """
    tree = ast.parse(inspect.getsource(helper.measure))
    expected = ast.parse("(bearing == 'S' and projected_dy <= 0) or (bearing == 'N' and projected_dy >= 0)", mode='eval').body
    targets = [node for node in ast.walk(tree) if isinstance(node, ast.If)
               and ast.dump(node.test, include_attributes=False) == ast.dump(expected, include_attributes=False)]
    if len(targets) != 1:
        raise RuntimeError('Expected exactly one checked v7 cardinal firearm predicate')
    targets[0].test = ast.parse("bearing != 'SW' or projected_dx >= 0 or projected_dy <= 0", mode='eval').body
    ast.fix_missing_locations(tree)
    exec(compile(tree, str(V7_SOURCE), 'exec'), globals())
    return globals()['measure']


def verify_scene_contract():
    import bpy
    scene = bpy.context.scene
    elevation = math.degrees(math.atan2(scene.camera.location.z, -scene.camera.location.y))
    if (scene.render.engine, scene.cycles.device, scene.render.threads_mode, scene.render.threads,
        scene.camera.data.type, scene.render.resolution_x, scene.render.resolution_y) != ('CYCLES', 'CPU', 'FIXED', 8, 'ORTHO', 1024, 1024):
        raise RuntimeError('Native CPU/thread/camera/size contract changed')
    # Blender camera coordinates are stored as floats; v7 measures
    # 34.99999894662639 degrees from its unchanged native coordinates.
    if abs(elevation - 35) > 1e-5 or abs(scene.camera.data.ortho_scale - 6.0) > 1e-6:
        raise RuntimeError('Native 35-degree orthographic camera or scale changed')
    if scene.render.image_settings.color_mode != 'RGBA' or not scene.render.film_transparent:
        raise RuntimeError('Native RGBA alpha render contract changed')


def annotate_v8_receipt(output):
    path = output.with_suffix('.json')
    receipt = json.loads(path.read_text())
    receipt.update({
        'measurementHelperScript': str(V7_SOURCE.relative_to(ROOT)),
        'measurementHelperScriptSha256': CHECKED_ORIGINAL_HASHES[V7_SOURCE],
        'measurementAdaptation': 'Checked v7 measure compiled into v8 globals; its one cardinal firearm predicate changes to SW x<0 and y>0; its root expectation uses the registered origin for each job. No rig, camera, feet, hand, weapon or raster changes.',
        'nativeOriginAdaptation': {'originalOriginPixels': {'x': 192, 'y': 440},
                                  'selectedOriginPixels': {'x': ORIGIN[0], 'y': ORIGIN[1]},
                                  'adapted': receipt['guideKind'] == 'actions',
                                  'reason': 'Action-only native 3D ground-root registration gives the unchanged SW firing musket/bayonet at least24px cell padding',
                                  'method': 'Set imported authorable renderer ORIGIN before native scene construction and scoped measurement ORIGIN to the same value; no pixel translation',
                                  'rejectedUnregisteredSibling': 'union-sw-actions-guide-unregistered-rejected.png' if receipt['guideKind'] == 'actions' else None},
        'checkedOriginalScriptHashes': {str(path.relative_to(ROOT)): digest for path, digest in CHECKED_ORIGINAL_HASHES.items()},
        'legacyDepthQualifierCaveat': 'Far/near object names are retained from E rig; SW does not inherit their depth meaning. Anatomical left/right remain authoritative.',
        'poseCaveats': ['Primitive rig is structural reference; exact anatomy and period drill remain unvalidated',
                        'Firing head is upright without guaranteed cheek-to-stock or sight alignment',
                        'SW geometry may occlude hands, bore, working rod, or facial identity',
                        'Thin socket bayonet and loading rod may be difficult to separate visually',
                        'Original rig is a reduced kit reference, not a verified complete campaign equipment inventory'],
    })
    write_json(path, receipt)


def main():
    global ORIGIN
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--kind', choices=['march', 'actions', 'both'], default='both')
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    selection = parser.parse_args(argv).kind
    selected_jobs = [job for job in JOBS if selection == 'both' or job[3] == selection]
    outputs = [OUTPUT / f'{side}-{bearing.lower()}-{kind}-guide.png' for side, bearing, _, kind in selected_jobs]
    if any(path.exists() or path.with_suffix('.json').exists() for path in outputs):
        parser.error('Existing named native guides are protected; inspect them before rerendering')
    helper = import_checked_v7_helper()
    measure = scoped_measurement(helper)
    renderer = helper.import_renderer(3)
    source_hashes = {**CHECKED_ORIGINAL_HASHES, Path(__file__).resolve(): sha256(Path(__file__).resolve())}
    OUTPUT.mkdir(parents=True, exist_ok=True)
    import bpy
    for (side, bearing, direction, kind), output in zip(selected_jobs, outputs):
        bpy.ops.wm.read_factory_settings(use_empty=False)
        ORIGIN = ORIGIN_BY_KIND[kind]
        renderer.ORIGIN = ORIGIN
        settings = SimpleNamespace(kind=kind, side=side, raw=str(output), samples=16, supersample=1, threads=8)
        renderer.render_worker(settings)
        verify_scene_contract()
        measure(output, side, bearing, direction, kind, source_hashes)
        annotate_v8_receipt(output)
    if any(sha256(path) != digest for path, digest in source_hashes.items()):
        raise RuntimeError('An original script or the v8 wrapper changed during rendering')
    print(f'FLANKING_GUIDES_COMPLETE: {len(selected_jobs)} sequential native Union SW renders; all original scripts unchanged', flush=True)


if __name__ == '__main__':
    main()
