#!/usr/bin/env python3
"""Render four bounded native Confederate NE/NW Gettysburg v10 guides.

Blender --background --factory-startup --python this-file imports the checked
unchanged v4 authorable rig through the checked v7 helper. Its checked single
entry-direction replacement selects NE (7) or NW (5). The checked measurement
predicate changes to the corresponding ideal diagonal firing projection, with
a tolerance derived from float32 precision and endpoint rounding, not pixels.
March retains origin (192,440); NE actions also use (192,440), while NW actions
use (272,440) to clear the complete leftward weapon. These are native 3D ground
registrations shared by all four poses of a sheet; camera and geometry remain
unchanged. Four Cycles CPU renders run sequentially at eight threads and sixteen
samples, resetting the scene between jobs. PNGs are direct 1024x1024 RGBA native
renders with 512px cells: no raster editing, recoloring, mirroring or resampling.
These primitive structural guides are not production artwork or certified drill.
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
V9_SOURCE = ROOT / 'scripts/render-gettysburg-west-guides.py'
PRIOR_WRAPPERS = [ROOT / 'scripts/render-gettysburg-diagonal-guide.py',
                  ROOT / 'scripts/render-gettysburg-diagonal-action-guide.py',
                  V7_SOURCE, V8_SOURCE, V9_SOURCE]
OUTPUT = ROOT / 'docs/art-pass/candidates/gettysburg-v10'
CELL = (512, 512)
ORIGIN = (192, 440)
ORIGIN_BY_JOB = {('NE', 'march'): (192, 440), ('NE', 'actions'): (192, 440),
                 ('NW', 'march'): (192, 440), ('NW', 'actions'): (272, 440)}
MARCH_POSES = [('left-contact', 'walk', 1), ('left-passing', 'walk', 2),
               ('right-contact', 'walk', 3), ('right-passing', 'walk', 0)]
ACTION_POSES = [('ready-upright-carry', 'idle', 0), ('shoulder-aim-fire', 'fire', 0),
                ('upright-load-at-barrel', 'reload', 0), ('upright-ramrod-insertion', 'reload', 1)]
JOBS = [('confederate', 'NE', 7, 'march'), ('confederate', 'NE', 7, 'actions'),
        ('confederate', 'NW', 5, 'march'), ('confederate', 'NW', 5, 'actions')]
CHECKED_ORIGINAL_HASHES = {
    SOURCE: '14ed68fd8ca42dd66641db73dac437d9219a9a715bd18c14e06be2e6558b1877',
    GUIDE_SOURCE: '7d0b3e93b958bbf9f03184b6f8e54987c578e540b3052d2efa73bada68d5257a',
    PRIOR_WRAPPERS[0]: '89748380613a939dc2cbc3f58e6f433b9baef867e4f23d2acc25ea1378079955',
    PRIOR_WRAPPERS[1]: 'e7fd86507a9ddbfb09d3ebf65408cbcf03b5b431ceb19f29902fbc7c2a3727ba',
    V7_SOURCE: '62f6492e74a9cc5c5da9f179885c34b3ca7a7efdb73b10b9f3a63894d045e0bd',
    V8_SOURCE: '47b1e7ccb09983fcb3cdeef7bd4eb1ff2379248fe8d8d4fdd565f656c0e850f4',
    V9_SOURCE: '5f5ed2afada1f220c3d14250bff94bac3815f56314f28366dd4366a9ec278165',
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')


def import_checked_v7_helper():
    mismatches = [str(path.relative_to(ROOT)) for path, digest in CHECKED_ORIGINAL_HASHES.items()
                  if sha256(path) != digest]
    if mismatches:
        raise RuntimeError(f'Original guide machinery differs from checked v10 inputs: {mismatches}')
    spec = importlib.util.spec_from_file_location('gettysburg_v10_checked_v7_helper', V7_SOURCE)
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    if (helper.CELL, helper.ORIGIN, helper.MARCH_POSES, helper.ACTION_POSES) != (CELL, (192, 440), MARCH_POSES, ACTION_POSES):
        raise RuntimeError('Expected unchanged v7 cells, root contract and eight poses')
    return helper


def diagonal_projection_contract(direction, weapon_length, pixels_per_unit, camera_distance):
    """Derive the ideal aim before looking at any native rendered measurement.

    Zero-lean stationary fire has body-local axis (0,length,0). Rz(yaw) maps it
    to (-sin(yaw)*length,cos(yaw)*length,0). Fixed camera image-up is
    (0,sin(35deg),cos(35deg)); PNG y points down. Four float32 error units at
    the 100-unit camera radius plus .001px endpoint rounding bound transform
    error. The same independent bound applies to both diagonal components.
    """
    if direction not in (7, 5):
        raise ValueError('Only actual NE (7) and NW (5) diagonal directions are authored')
    yaw = -math.pi / 2 - direction * math.pi / 4
    float32_epsilon = 2 ** -23
    tolerance = 4 * float32_epsilon * max(1, camera_distance, weapon_length) * pixels_per_unit + .001
    return {'directionIndex': direction, 'yawRadians': yaw,
            'expectedAxisDeltaPixels': {'x': -math.sin(yaw) * weapon_length * pixels_per_unit,
                                       'y': -math.cos(yaw) * weapon_length * math.sin(math.radians(35)) * pixels_per_unit},
            'idealAxisTolerancePixels': tolerance,
            'toleranceDerivation': {'float32Epsilon': float32_epsilon, 'cameraDistanceWorldUnits': camera_distance,
                                    'float32ErrorMultiplier': 4, 'endpointRoundingErrorPixels': .001,
                                    'formula': '4*2^-23*max(1,cameraDistance,weaponLength)*pixelsPerWorldUnit + 0.001'},
            'meaning': 'NE requires x>0,y<0; NW requires x<0,y<0; each measured component must also match the ideal native axis within this independently derived tolerance'}


def diagonal_firing_invalid(bearing, dx, dy, yaw, weapon_length, camera, pixels_per_unit):
    direction = {'NE': 7, 'NW': 5}.get(bearing)
    if direction is None:
        return True
    contract = diagonal_projection_contract(direction, weapon_length, pixels_per_unit, camera.location.length)
    expected = contract['expectedAxisDeltaPixels']
    tolerance = contract['idealAxisTolerancePixels']
    return (abs(yaw - contract['yawRadians']) > 1e-8 or dy >= 0
            or (bearing == 'NE' and dx <= 0) or (bearing == 'NW' and dx >= 0)
            or abs(dx - expected['x']) > tolerance or abs(dy - expected['y']) > tolerance)


def scoped_measurement(helper):
    """Compile checked v7 measurement here; replace only its firing predicate."""
    tree = ast.parse(inspect.getsource(helper.measure))
    expected = ast.parse("(bearing == 'S' and projected_dy <= 0) or (bearing == 'N' and projected_dy >= 0)", mode='eval').body
    targets = [node for node in ast.walk(tree) if isinstance(node, ast.If)
               and ast.dump(node.test, include_attributes=False) == ast.dump(expected, include_attributes=False)]
    if len(targets) != 1:
        raise RuntimeError('Expected exactly one checked v7 cardinal firearm predicate')
    targets[0].test = ast.parse('diagonal_firing_invalid(bearing, projected_dx, projected_dy, expected_yaw, axis.length, scene.camera, pixels_per_unit)', mode='eval').body
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


def prior_guide_hashes():
    return {path: sha256(path) for path in (ROOT / 'docs/art-pass/candidates').glob('gettysburg-v*/*guide.*')
            if path.parent != OUTPUT and path.suffix in ('.png', '.json')}


def annotate_receipt(output, originals):
    import bpy
    scene = bpy.context.scene
    path = output.with_suffix('.json')
    receipt = json.loads(path.read_text())
    receipt.update({
        'measurementHelperScript': str(V7_SOURCE.relative_to(ROOT)),
        'measurementHelperScriptSha256': CHECKED_ORIGINAL_HASHES[V7_SOURCE],
        'measurementAdaptation': 'Checked v7 measure compiled into v10 globals; its one cardinal predicate changes to native NE/NW signs and ideal-axis tolerance derived before measurement; root expectation uses the native origin for each job.',
        'nativeOriginAdaptation': {'originalOriginPixels': {'x': 192, 'y': 440},
                                  'selectedOriginPixels': {'x': ORIGIN[0], 'y': ORIGIN[1]},
                                  'adapted': ORIGIN != (192, 440),
                                  'reason': 'Native 3D ground registration gives the unchanged body and complete weapon at least 24px solid cell padding',
                                  'method': 'Set imported authorable renderer ORIGIN before native scene construction and scoped measurement ORIGIN to the same value; every sheet pose shares this ground reference, world root z remains zero; no pixel translation'},
        'checkedOriginalScriptHashes': {str(path.relative_to(ROOT)): digest for path, digest in CHECKED_ORIGINAL_HASHES.items()},
        'unchangedPriorGuideHashes': {str(path.relative_to(ROOT)): digest for path, digest in originals.items()},
        'nativeDirection': f"Actual 3D {receipt['direction']} direction {receipt['directionIndex']}; no flat image rotation or mirroring",
        'samples': 16, 'jobExecution': 'Four sequential jobs in one Blender process; scene reset between jobs; fixed 8 CPU threads',
        'legacyDepthQualifierCaveat': 'Far/near object names are retained from E rig; diagonal views do not inherit their depth meaning. Anatomical left/right remain authoritative.',
        'poseCaveats': ['Primitive rig is structural reference; exact anatomy and period drill remain unvalidated',
                        'Firing head is upright without guaranteed cheek-to-stock or sight alignment',
                        'Diagonal geometry can occlude grip, bore, rod or kit; projection checks do not certify visibility',
                        'Thin socket bayonet and loading rod may be difficult to separate visually',
                        'Original rig is a reduced kit reference, not a verified complete campaign equipment inventory'],
    })
    for record in receipt['geometry']:
        if record['sourceEntry'][0] == 'fire':
            record['diagonalFiringProjectionContract'] = diagonal_projection_contract(receipt['directionIndex'],
                record['musketBodyLengthWorldUnits'], receipt['pixelsPerWorldUnit'], scene.camera.location.length)
    write_json(path, receipt)


def self_test():
    """Guard checked adaptations and rejection boundaries without rendering."""
    helper = import_checked_v7_helper()
    scoped_measurement(helper)
    camera = SimpleNamespace(location=SimpleNamespace(length=100))
    length, ppu = 1.38, 1024 / 6
    contracts = []
    for bearing, direction in [('NE', 7), ('NW', 5)]:
        renderer = helper.import_renderer(direction)
        if not renderer.render_worker.__code__:
            raise RuntimeError('Checked direction adaptation did not produce a worker')
        contract = diagonal_projection_contract(direction, length, ppu, 100)
        yaw = contract['yawRadians']
        dx, dy = contract['expectedAxisDeltaPixels'].values()
        tolerance = contract['idealAxisTolerancePixels']
        if diagonal_firing_invalid(bearing, dx, dy, yaw, length, camera, ppu):
            raise RuntimeError(f'Ideal native {bearing} axis rejected')
        if diagonal_firing_invalid(bearing, dx + tolerance * .5, dy - tolerance * .5, yaw, length, camera, ppu):
            raise RuntimeError(f'Derived float32 tolerance rejected: {bearing}')
        invalid_samples = [('N', dx, dy, yaw), (bearing, -dx, dy, yaw), (bearing, dx, -dy, yaw),
                           (bearing, dx + tolerance * 2, dy, yaw), (bearing, dx, dy - tolerance * 2, yaw),
                           (bearing, dx, dy, yaw + math.pi / 4)]
        if any(not diagonal_firing_invalid(b, x, y, a, length, camera, ppu) for b, x, y, a in invalid_samples):
            raise RuntimeError(f'Incorrect bearing/sign/ideal axis accepted: {bearing}')
        contracts.append(contract)
    print(json.dumps({'status': 'CONFEDERATE_DIAGONAL_GUIDE_HELPER_CONTRACT_PASSED',
                      'checkedOriginalCount': len(CHECKED_ORIGINAL_HASHES), 'projectionContracts': contracts}), flush=True)


def main():
    global ORIGIN
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--self-test', action='store_true')
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ([] if '--python' in sys.argv else sys.argv[1:])
    args = parser.parse_args(argv)
    if args.self_test:
        self_test()
        return
    outputs = [OUTPUT / f'{side}-{bearing.lower()}-{kind}-guide.png' for side, bearing, _, kind in JOBS]
    if any(path.exists() or path.with_suffix('.json').exists() for path in outputs):
        parser.error('Existing named native guides are protected; inspect before rerendering')
    self_test()
    helper = import_checked_v7_helper()
    measure = scoped_measurement(helper)
    renderers = {direction: helper.import_renderer(direction) for direction in (7, 5)}
    source_hashes = {**CHECKED_ORIGINAL_HASHES, Path(__file__).resolve(): sha256(Path(__file__).resolve())}
    originals = prior_guide_hashes()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    import bpy
    for (side, bearing, direction, kind), output in zip(JOBS, outputs):
        bpy.ops.wm.read_factory_settings(use_empty=False)
        ORIGIN = ORIGIN_BY_JOB[(bearing, kind)]
        renderer = renderers[direction]
        renderer.ORIGIN = ORIGIN
        settings = SimpleNamespace(kind=kind, side=side, raw=str(output), samples=16, supersample=1, threads=8)
        renderer.render_worker(settings)
        verify_scene_contract()
        measure(output, side, bearing, direction, kind, source_hashes)
        annotate_receipt(output, originals)
        if any(sha256(path) != digest for path, digest in {**source_hashes, **originals}.items()):
            raise RuntimeError('An original script, guide or v10 wrapper changed during rendering')
        if kind == 'actions':
            print(f'CONFEDERATE_{bearing}_GUIDE_PAIR_READY: native march/actions and measured receipts complete', flush=True)
    print('CONFEDERATE_DIAGONAL_GUIDES_COMPLETE: four sequential native renders; originals unchanged', flush=True)


if __name__ == '__main__':
    main()
