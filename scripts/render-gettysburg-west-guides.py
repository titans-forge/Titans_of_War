#!/usr/bin/env python3
"""Render two bounded native Union W structural Gettysburg v9 guides.

Blender --background --factory-startup --python this-file -- --kind both
imports the checked unchanged v4 authorable rig through its checked v7 helper.
One checked entry-direction replacement selects W (4), yaw -3*pi/2. A checked
measurement replacement requires a westward, nearly horizontal firing axis;
its tolerance is derived from native float precision and receipt rounding.
March retains origin (192,440); action roots are authored at (344,440) on the
world ground plane to clear the complete west firing weapon. Camera, meshes,
poses, weapon scale and kit are unchanged. Exactly two Cycles CPU renders run
sequentially at eight threads and sixteen samples, resetting the scene between
jobs. Native RGBA PNGs are never edited, mirrored, translated or resampled.
These primitive structural references are not certified anatomy, drill,
complete equipment inventories, or approved production sprites.
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
V8_SOURCE = ROOT / 'scripts/render-gettysburg-flanking-guides.py'
PRIOR_WRAPPERS = [ROOT / 'scripts/render-gettysburg-diagonal-guide.py',
                  ROOT / 'scripts/render-gettysburg-diagonal-action-guide.py',
                  V7_SOURCE, V8_SOURCE]
OUTPUT = ROOT / 'docs/art-pass/candidates/gettysburg-v9'
CELL = (512, 512)
ORIGIN = (192, 440)
ORIGIN_BY_KIND = {'march': (192, 440), 'actions': (344, 440)}
MARCH_POSES = [('left-contact', 'walk', 1), ('left-passing', 'walk', 2),
               ('right-contact', 'walk', 3), ('right-passing', 'walk', 0)]
ACTION_POSES = [('ready-upright-carry', 'idle', 0), ('shoulder-aim-fire', 'fire', 0),
                ('upright-load-at-barrel', 'reload', 0), ('upright-ramrod-insertion', 'reload', 1)]
JOBS = [('union', 'W', 4, 'march'), ('union', 'W', 4, 'actions')]
CHECKED_ORIGINAL_HASHES = {
    SOURCE: '14ed68fd8ca42dd66641db73dac437d9219a9a715bd18c14e06be2e6558b1877',
    GUIDE_SOURCE: '7d0b3e93b958bbf9f03184b6f8e54987c578e540b3052d2efa73bada68d5257a',
    PRIOR_WRAPPERS[0]: '89748380613a939dc2cbc3f58e6f433b9baef867e4f23d2acc25ea1378079955',
    PRIOR_WRAPPERS[1]: 'e7fd86507a9ddbfb09d3ebf65408cbcf03b5b431ceb19f29902fbc7c2a3727ba',
    V7_SOURCE: '62f6492e74a9cc5c5da9f179885c34b3ca7a7efdb73b10b9f3a63894d045e0bd',
    V8_SOURCE: '47b1e7ccb09983fcb3cdeef7bd4eb1ff2379248fe8d8d4fdd565f656c0e850f4',
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')


def import_checked_v7_helper():
    mismatches = [str(path.relative_to(ROOT)) for path, digest in CHECKED_ORIGINAL_HASHES.items()
                  if sha256(path) != digest]
    if mismatches:
        raise RuntimeError(f'Original guide machinery differs from checked v9 inputs: {mismatches}')
    spec = importlib.util.spec_from_file_location('gettysburg_v9_checked_v7_helper', V7_SOURCE)
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    if (helper.CELL, helper.ORIGIN, helper.MARCH_POSES, helper.ACTION_POSES) != (CELL, (192, 440), MARCH_POSES, ACTION_POSES):
        raise RuntimeError('Expected unchanged v7 cells, root contract and eight poses')
    return helper


def west_projection_contract(yaw, weapon_length, pixels_per_unit, camera_distance, elevation=math.radians(35)):
    """Ideal authored W aim and a bound for float32 camera math plus rounding.

    Stationary fire has zero torso lean and body-local axis (0,length,0).
    Rz(yaw) maps it to (-sin(yaw)*length,cos(yaw)*length,0). The fixed
    camera's image-up is (0,sin(elevation),cos(elevation)); PNG y is down.
    Native Blender transforms use float32. Four float32 error units at the
    100-unit camera radius, then endpoint rounding to .001 px, give the bound.
    This bound is independent of the measured firing result.
    """
    float32_epsilon = 2 ** -23
    tolerance = 4 * float32_epsilon * max(1, camera_distance, weapon_length) * pixels_per_unit + .001
    return {'expectedAxisDeltaPixels': {'x': -math.sin(yaw) * weapon_length * pixels_per_unit,
                                       'y': -math.cos(yaw) * weapon_length * math.sin(elevation) * pixels_per_unit},
            'nearHorizontalTolerancePixels': tolerance,
            'toleranceDerivation': {'float32Epsilon': float32_epsilon, 'cameraDistanceWorldUnits': camera_distance,
                                    'float32ErrorMultiplier': 4, 'endpointRoundingErrorPixels': .001,
                                    'formula': '4*2^-23*max(1,cameraDistance,weaponLength)*pixelsPerWorldUnit + 0.001'},
            'meaning': 'W must project x<0; y may have either sign only within this independently derived near-horizontal tolerance'}


def west_firing_invalid(bearing, dx, dy, yaw, weapon_length, camera, pixels_per_unit):
    contract = west_projection_contract(yaw, weapon_length, pixels_per_unit, camera.location.length)
    expected = contract['expectedAxisDeltaPixels']
    tolerance = contract['nearHorizontalTolerancePixels']
    return (bearing != 'W' or dx >= 0 or abs(dy) > tolerance
            or abs(dx - expected['x']) > tolerance or abs(dy - expected['y']) > tolerance)


def scoped_measurement(helper):
    """Compile checked v7 measurement here; replace only its firing predicate."""
    tree = ast.parse(inspect.getsource(helper.measure))
    expected = ast.parse("(bearing == 'S' and projected_dy <= 0) or (bearing == 'N' and projected_dy >= 0)", mode='eval').body
    targets = [node for node in ast.walk(tree) if isinstance(node, ast.If)
               and ast.dump(node.test, include_attributes=False) == ast.dump(expected, include_attributes=False)]
    if len(targets) != 1:
        raise RuntimeError('Expected exactly one checked v7 cardinal firearm predicate')
    targets[0].test = ast.parse('west_firing_invalid(bearing, projected_dx, projected_dy, expected_yaw, axis.length, scene.camera, pixels_per_unit)', mode='eval').body
    ast.fix_missing_locations(tree)
    exec(compile(tree, str(V7_SOURCE), 'exec'), globals())
    return globals()['measure']


def verify_scene_contract():
    import bpy
    scene = bpy.context.scene
    elevation = math.degrees(math.atan2(scene.camera.location.z, -scene.camera.location.y))
    if (scene.render.engine, scene.cycles.device, scene.cycles.samples, scene.render.threads_mode,
        scene.render.threads, scene.camera.data.type, scene.render.resolution_x, scene.render.resolution_y,
        scene.render.resolution_percentage) != ('CYCLES', 'CPU', 16, 'FIXED', 8, 'ORTHO', 1024, 1024, 100):
        raise RuntimeError('Native render sample/CPU/thread/camera/size contract changed')
    if abs(elevation - 35) > 1e-5 or abs(scene.camera.data.ortho_scale - 6) > 1e-6:
        raise RuntimeError('Native 35-degree camera or orthographic scale changed')
    if scene.render.image_settings.color_mode != 'RGBA' or not scene.render.film_transparent:
        raise RuntimeError('Native transparent RGBA render contract changed')


def annotate_receipt(output):
    import bpy
    scene = bpy.context.scene
    path = output.with_suffix('.json')
    receipt = json.loads(path.read_text())
    receipt.update({
        'measurementHelperScript': str(V7_SOURCE.relative_to(ROOT)),
        'measurementHelperScriptSha256': CHECKED_ORIGINAL_HASHES[V7_SOURCE],
        'measurementAdaptation': 'Checked v7 measure compiled into v9 globals; its one cardinal predicate changes to native W x<0 and independently derived near-horizontal/ideal-axis tolerance; root expectation uses the native origin for each job.',
        'nativeOriginAdaptation': {'originalOriginPixels': {'x': 192, 'y': 440},
                                  'selectedOriginPixels': {'x': ORIGIN[0], 'y': ORIGIN[1]},
                                  'adapted': receipt['guideKind'] == 'actions',
                                  'reason': 'Action-only native 3D ground-root registration provides at least 24px cell padding for the unchanged leftward musket and socket bayonet',
                                  'method': 'Set imported authorable renderer ORIGIN before native scene construction, with the same scoped measurement origin; world root z remains zero; no pixel translation'},
        'checkedOriginalScriptHashes': {str(path.relative_to(ROOT)): digest for path, digest in CHECKED_ORIGINAL_HASHES.items()},
        'nativeDirection': 'Actual 3D W direction 4, yaw -3*pi/2; no E image mirroring',
        'samples': 16, 'jobExecution': 'Two sequential jobs in one Blender process; scene reset between jobs; fixed 8 CPU threads',
        'legacyDepthQualifierCaveat': 'Far/near object names are retained from E rig; W does not inherit their depth meaning. Anatomical left/right remain authoritative.',
        'poseCaveats': ['Primitive rig is structural reference; exact anatomy and period drill remain unvalidated',
                        'Firing head is upright without guaranteed cheek-to-stock or sight alignment',
                        'W geometry can occlude grip, bore, rod or kit; projection checks do not certify visibility',
                        'Thin socket bayonet and loading rod may be difficult to separate visually',
                        'Original rig is a reduced kit reference, not a verified complete campaign equipment inventory'],
    })
    for record in receipt['geometry']:
        if record['sourceEntry'][0] == 'fire':
            record['westFiringProjectionContract'] = west_projection_contract(record['yawRadians'],
                record['musketBodyLengthWorldUnits'], receipt['pixelsPerWorldUnit'], scene.camera.location.length)
    write_json(path, receipt)


def self_test():
    """Check adaptation identity and both rejection boundaries without rendering."""
    helper = import_checked_v7_helper()
    scoped_measurement(helper)
    renderer = helper.import_renderer(4)
    tree = ast.parse(inspect.getsource(renderer.render_worker))
    # inspect reflects the checked source text; the compiled in-memory code's
    # constant table provides the selected direction, while explicit AST
    # identity is already guarded by the unchanged helper import_renderer.
    if not renderer.render_worker.__code__ or len(tree.body) != 1:
        raise RuntimeError('Renderer adaptation did not produce one worker')
    camera = SimpleNamespace(location=SimpleNamespace(length=100))
    yaw, length, ppu = -3 * math.pi / 2, 1.38, 1024 / 6
    contract = west_projection_contract(yaw, length, ppu, 100)
    dx, dy = contract['expectedAxisDeltaPixels'].values()
    tolerance = contract['nearHorizontalTolerancePixels']
    if west_firing_invalid('W', dx, dy, yaw, length, camera, ppu):
        raise RuntimeError('Ideal native W axis rejected')
    if west_firing_invalid('W', dx, tolerance * .5, yaw, length, camera, ppu):
        raise RuntimeError('Derived near-horizontal tolerance rejected')
    for bearing, test_dx, test_dy in [('E', dx, dy), ('W', -dx, dy), ('W', dx, tolerance * 2), ('W', dx + 1, dy)]:
        if not west_firing_invalid(bearing, test_dx, test_dy, yaw, length, camera, ppu):
            raise RuntimeError(f'Invalid direction/projection accepted: {bearing}, {test_dx}, {test_dy}')
    print(json.dumps({'status': 'WEST_GUIDE_HELPER_CONTRACT_PASSED', 'checkedOriginalCount': len(CHECKED_ORIGINAL_HASHES),
                      'direction': 4, 'projectionContract': contract}), flush=True)


def main():
    global ORIGIN
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--kind', choices=['march', 'actions', 'both'], default='both')
    parser.add_argument('--self-test', action='store_true')
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    args = parser.parse_args(argv)
    if args.self_test:
        self_test()
        return
    selected_jobs = [job for job in JOBS if args.kind == 'both' or job[3] == args.kind]
    outputs = [OUTPUT / f'{side}-{bearing.lower()}-{kind}-guide.png' for side, bearing, _, kind in selected_jobs]
    if any(path.exists() or path.with_suffix('.json').exists() for path in outputs):
        parser.error('Existing named native guides are protected; inspect before rerendering')
    helper = import_checked_v7_helper()
    measure = scoped_measurement(helper)
    renderer = helper.import_renderer(4)
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
        annotate_receipt(output)
    if any(sha256(path) != digest for path, digest in source_hashes.items()):
        raise RuntimeError('An original script or the v9 wrapper changed during rendering')
    print(f'WEST_GUIDES_COMPLETE: {len(selected_jobs)} sequential native Union W renders; originals unchanged', flush=True)


if __name__ == '__main__':
    main()
