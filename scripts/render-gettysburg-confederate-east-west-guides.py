#!/usr/bin/env python3
"""Render four bounded native Confederate E/W structural Gettysburg v13 guides.

Use Blender --background --factory-startup --python this-file. Checked v4/v7
machinery remains unchanged on disk; its one native entry-direction selector
is adapted in memory. Four native transparent 1024x1024 RGBA sheets render
sequentially with 512px cells, 8 CPU threads, 16 samples and a 35-degree
orthographic camera. Native root registration provides full weapon padding.
These reduced gray/brown kit guides do not certify Confederate A identity,
complete kit, anatomy, physical gait or historical drill. No raster edits.
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
WEST_SOURCE = ROOT / 'scripts/render-gettysburg-west-guides.py'
EAST_SOURCE = ROOT / 'scripts/render-gettysburg-union-b-east-guides.py'
PRIOR_WRAPPERS = [ROOT / 'scripts/render-gettysburg-diagonal-guide.py',
                  ROOT / 'scripts/render-gettysburg-diagonal-action-guide.py',
                  V7_SOURCE, WEST_SOURCE, EAST_SOURCE]
OUTPUT = ROOT / 'docs/art-pass/candidates/gettysburg-v13'
CELL, ORIGIN = (512, 512), (192, 440)
ORIGIN_BY_JOB = {('E', 'march'): (192, 440), ('E', 'actions'): (176, 440),
                 ('W', 'march'): (192, 440), ('W', 'actions'): (344, 440)}
MARCH_POSES = [('left-contact', 'walk', 1), ('left-passing', 'walk', 2),
               ('right-contact', 'walk', 3), ('right-passing', 'walk', 0)]
ACTION_POSES = [('ready-upright-carry', 'idle', 0), ('shoulder-aim-fire', 'fire', 0),
                ('upright-load-at-barrel', 'reload', 0), ('upright-ramrod-insertion', 'reload', 1)]
JOBS = [('confederate', 'E', 0, 'march'), ('confederate', 'E', 0, 'actions'),
        ('confederate', 'W', 4, 'march'), ('confederate', 'W', 4, 'actions')]
CHECKED_HASHES = {
    SOURCE: '14ed68fd8ca42dd66641db73dac437d9219a9a715bd18c14e06be2e6558b1877',
    GUIDE_SOURCE: '7d0b3e93b958bbf9f03184b6f8e54987c578e540b3052d2efa73bada68d5257a',
    PRIOR_WRAPPERS[0]: '89748380613a939dc2cbc3f58e6f433b9baef867e4f23d2acc25ea1378079955',
    PRIOR_WRAPPERS[1]: 'e7fd86507a9ddbfb09d3ebf65408cbcf03b5b431ceb19f29902fbc7c2a3727ba',
    V7_SOURCE: '62f6492e74a9cc5c5da9f179885c34b3ca7a7efdb73b10b9f3a63894d045e0bd',
    WEST_SOURCE: '5f5ed2afada1f220c3d14250bff94bac3815f56314f28366dd4366a9ec278165',
    EAST_SOURCE: 'f92ac6e7353d28b894078349bf912bb08c759afefae56087afaa9c211b3483d6',
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')


def import_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def checked_helpers():
    if any(sha256(path) != digest for path, digest in CHECKED_HASHES.items()):
        raise RuntimeError('Original checked render machinery changed')
    helper = import_module(V7_SOURCE, 'v13_checked_v7')
    west = import_module(WEST_SOURCE, 'v13_checked_scene_contract')
    if (helper.CELL, helper.ORIGIN, helper.MARCH_POSES, helper.ACTION_POSES) != (CELL, (192, 440), MARCH_POSES, ACTION_POSES):
        raise RuntimeError('Original equal cells, root registration or pose order changed')
    return helper, west


def firing_projection_contract(direction, length, ppu, camera_distance):
    if type(direction) is not int or direction not in (0, 4):
        raise ValueError('Only native E(0)/W(4) are in scope')
    yaw = -math.pi / 2 - direction * math.pi / 4
    return {'directionIndex': direction, 'yawRadians': yaw,
            'expectedAxisDeltaPixels': {'x': -math.sin(yaw) * length * ppu,
                                       'y': -math.cos(yaw) * length * math.sin(math.radians(35)) * ppu},
            'idealAxisTolerancePixels': 4 * 2 ** -23 * max(1, camera_distance, length) * ppu + .001,
            'toleranceFormula': '4*2^-23*max(1,cameraDistance,weaponLength)*pixelsPerWorldUnit+0.001',
            'derivation': 'Body-local stationary fire axis(0,length,0), native Rz(yaw), fixed 35deg camera image-up; float32 transform bound and endpoint rounding; independent of measured pixels'}


def firing_invalid(bearing, dx, dy, yaw, length, camera, ppu):
    direction = {'E': 0, 'W': 4}.get(bearing)
    if direction is None or not all(math.isfinite(value) for value in (dx, dy, yaw, length, ppu)):
        return True
    contract = firing_projection_contract(direction, length, ppu, camera.location.length)
    expected, tolerance = contract['expectedAxisDeltaPixels'], contract['idealAxisTolerancePixels']
    return ((dx <= 0 if direction == 0 else dx >= 0)
            or abs(yaw - contract['yawRadians']) > 1e-8
            or abs(dx - expected['x']) > tolerance or abs(dy - expected['y']) > tolerance)


def scoped_measure(helper):
    tree = ast.parse(inspect.getsource(helper.measure))
    expected = ast.parse("(bearing == 'S' and projected_dy <= 0) or (bearing == 'N' and projected_dy >= 0)", mode='eval').body
    targets = [node for node in ast.walk(tree) if isinstance(node, ast.If)
               and ast.dump(node.test, include_attributes=False) == ast.dump(expected, include_attributes=False)]
    if len(targets) != 1:
        raise RuntimeError('Expected one checked cardinal firearm predicate')
    targets[0].test = ast.parse('firing_invalid(bearing,projected_dx,projected_dy,expected_yaw,axis.length,scene.camera,pixels_per_unit)', mode='eval').body
    ast.fix_missing_locations(tree)
    exec(compile(tree, str(V7_SOURCE), 'exec'), globals())
    return globals()['measure']


def self_test():
    helper, west = checked_helpers()
    scoped_measure(helper)
    camera = SimpleNamespace(location=SimpleNamespace(length=100))
    for bearing, direction in [('E', 0), ('W', 4)]:
        helper.import_renderer(direction)
        contract = firing_projection_contract(direction, 1.38, 1024 / 6, 100)
        dx, dy = contract['expectedAxisDeltaPixels'].values()
        yaw, tolerance = contract['yawRadians'], contract['idealAxisTolerancePixels']
        if firing_invalid(bearing, dx, dy, yaw, 1.38, camera, 1024 / 6):
            raise RuntimeError('Ideal authored cardinal bearing rejected')
        for b, x, y, angle in [('SE', dx, dy, yaw), (bearing, -dx, dy, yaw),
                               (bearing, dx + 2 * tolerance, dy, yaw),
                               (bearing, dx, dy + 2 * tolerance, yaw),
                               (bearing, dx, dy, yaw + math.pi / 4),
                               (bearing, float('nan'), dy, yaw)]:
            if not firing_invalid(b, x, y, angle, 1.38, camera, 1024 / 6):
                raise RuntimeError('Unsupported or incorrect ideal projection accepted')
    print('CONFEDERATE_EW_GUIDE_CONTRACT_PASSED: checked native machinery, pose order and independent E/W firing axis', flush=True)
    return helper, west


def annotate_receipt(output):
    import bpy
    scene = bpy.context.scene
    path = output.with_suffix('.json')
    receipt = json.loads(path.read_text())
    bearing, kind = receipt['direction'], receipt['guideKind']
    expected_entries = [[action, {'E': 0, 'W': 4}[bearing], frame]
                        for _, action, frame in (MARCH_POSES if kind == 'march' else ACTION_POSES)]
    if receipt['sourceEntries'] != expected_entries or receipt['side'] != 'confederate':
        raise RuntimeError('Actual guide side, bearing or complete pose ownership changed')
    for material, expected in {'coat': (.43, .40, .34, 1), 'pants': (.42, .41, .38, 1), 'cap': (.30, .29, .27, 1)}.items():
        if any(abs(value - wanted) > 1e-6 for value, wanted in zip(bpy.data.materials[material].diffuse_color, expected)):
            raise RuntimeError('Original reduced Confederate gray/brown material selection changed')
    receipt.update({
        'identityScope': 'Confederate A composition reference only; A face, full kit and equipment placement must come from reviewed A artwork',
        'measurementHelperScript': str(V7_SOURCE.relative_to(ROOT)),
        'measurementHelperScriptSha256': CHECKED_HASHES[V7_SOURCE],
        'measurementAdaptation': 'Checked v7 measure compiled into v13 globals; only its cardinal firing predicate changes to E/W signed ideal-axis checks; origin expectation uses native registration selected for the whole job',
        'nativeOriginAdaptation': {'original': [192, 440], 'selected': list(ORIGIN),
                                  'method': 'One shared native 3D ground registration before scene construction; world root z0; no pixel translation'},
        'materialSelection': 'Unchanged reduced Confederate gray/brown palette from original side parameter; no recoloring of existing images',
        'samples': 16, 'jobExecution': 'Four sequential native CPU jobs; scene reset; fixed 8 threads',
        'checkedOriginalScriptHashes': {str(path.relative_to(ROOT)): digest for path, digest in CHECKED_HASHES.items()},
        'helperContractSelfTest': 'passed',
        'nativeDirection': f'Actual native 3D {bearing} direction {receipt["directionIndex"]}; no flat rotation or mirrored image',
        'legacyDepthQualifierCaveat': 'Far/near object labels originate in E rig; anatomical left/right remain authoritative for both bearings',
        'poseCaveats': ['Primitive rig is only a structural composition reference; anatomy and historical drill remain unvalidated',
                        'Reduced kit does not independently certify the complete Confederate A campaign equipment or likeness',
                        'Native E/W projection can occlude hands, bore, loading rod or kit; geometry checks do not certify their visibility',
                        'Firing head remains upright without guaranteed cheek-to-stock contact or sight alignment',
                        'Trace the complete hip-to-boot joint chain for gait anatomy; image position alone cannot label support leg'],
    })
    for record in receipt['geometry']:
        if record['sourceEntry'][0] == 'fire':
            record['independentFiringProjectionContract'] = firing_projection_contract(receipt['directionIndex'],
                record['musketBodyLengthWorldUnits'], receipt['pixelsPerWorldUnit'], scene.camera.location.length)
    write_json(path, receipt)


def main():
    global ORIGIN
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--self-test', action='store_true')
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ([] if '--python' in sys.argv else sys.argv[1:])
    args = parser.parse_args(argv)
    helper, west = self_test()
    if args.self_test:
        return
    outputs = [OUTPUT / f'confederate-a-{bearing.lower()}-{kind}-guide.png' for _, bearing, _, kind in JOBS]
    if any(path.exists() or path.with_suffix('.json').exists() for path in outputs):
        raise RuntimeError('Existing guide names are protected; no overwrite permitted')
    source_hashes = {**CHECKED_HASHES, Path(__file__).resolve(): sha256(Path(__file__).resolve())}
    measure = scoped_measure(helper)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    import bpy
    for (side, bearing, direction, kind), output in zip(JOBS, outputs):
        bpy.ops.wm.read_factory_settings(use_empty=False)
        ORIGIN = ORIGIN_BY_JOB[(bearing, kind)]
        renderer = helper.import_renderer(direction)
        renderer.ORIGIN = ORIGIN
        renderer.render_worker(SimpleNamespace(kind=kind, side=side, raw=str(output), samples=16, supersample=1, threads=8))
        west.verify_scene_contract()
        measure(output, side, bearing, direction, kind, source_hashes)
        annotate_receipt(output)
        if any(sha256(path) != digest for path, digest in source_hashes.items()):
            raise RuntimeError('Original machinery or v13 wrapper changed during rendering')
        print(f'V13_NATIVE_GUIDE_READY: {output}', flush=True)
    print('V13_CONFEDERATE_EW_GUIDES_COMPLETE: four new native renders; checked original bytes unchanged', flush=True)


if __name__ == '__main__':
    main()
