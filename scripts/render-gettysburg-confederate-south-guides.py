#!/usr/bin/env python3
"""Render two native Confederate S structural Gettysburg v14 guides.

Use Blender --background --factory-startup --python this-file. The unchanged
checked v7 board-facing wrapper adapts only its imported entry-direction
selector to S(2); original v7 measurement and S projection predicates remain
unchanged. Two 1024x1024 transparent RGBA sheets with 512px equal cells render
sequentially at 8 CPU threads/16 samples through the fixed 35deg orthographic
camera. No native pixels are mirrored, recolored, cropped or resampled.
These reduced kit guides are composition references, not final A kit, anatomy
or historical drill certification.
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
                  ROOT / 'scripts/render-gettysburg-diagonal-action-guide.py', V7_SOURCE]
OUTPUT = ROOT / 'docs/art-pass/candidates/gettysburg-v14'
CELL, ORIGIN = (512, 512), (192, 440)
MARCH_POSES = [('left-contact', 'walk', 1), ('left-passing', 'walk', 2),
               ('right-contact', 'walk', 3), ('right-passing', 'walk', 0)]
ACTION_POSES = [('ready-upright-carry', 'idle', 0), ('shoulder-aim-fire', 'fire', 0),
                ('upright-load-at-barrel', 'reload', 0), ('upright-ramrod-insertion', 'reload', 1)]
JOBS = [('confederate', 'S', 2, 'march'), ('confederate', 'S', 2, 'actions')]
CHECKED_HASHES = {
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


def import_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def checked_helper():
    if any(sha256(path) != digest for path, digest in CHECKED_HASHES.items()):
        raise RuntimeError('Original checked render machinery changed')
    helper = import_module(V7_SOURCE, 'v14_checked_board_facing')
    if (helper.CELL, helper.ORIGIN, helper.MARCH_POSES, helper.ACTION_POSES) != (CELL, ORIGIN, MARCH_POSES, ACTION_POSES):
        raise RuntimeError('Original equal cells, root registration or pose order changed')
    return helper


def scoped_measurement(helper):
    """Rebind checked v7 measurement globals without changing its AST."""
    tree = ast.parse(inspect.getsource(helper.measure))
    original_tree = ast.dump(tree, include_attributes=False)
    expected = ast.parse("(bearing == 'S' and projected_dy <= 0) or (bearing == 'N' and projected_dy >= 0)", mode='eval').body
    predicates = [node for node in ast.walk(tree) if isinstance(node, ast.If)
                  and ast.dump(node.test, include_attributes=False) == ast.dump(expected, include_attributes=False)]
    if len(predicates) != 1 or ast.dump(tree, include_attributes=False) != original_tree:
        raise RuntimeError('Expected unchanged original v7 S/N firing predicate')
    exec(compile(tree, str(V7_SOURCE), 'exec'), globals())
    return globals()['measure']


def south_projection_contract(length, ppu, camera_distance):
    """Predict the ideal S axis from fixed rig/camera, before measurement."""
    if not all(type(value) in (int, float) and math.isfinite(value) and value > 0
               for value in (length, ppu, camera_distance)):
        raise ValueError('Finite positive rig and camera dimensions required')
    yaw = -math.pi
    return {'directionIndex': 2, 'yawRadians': yaw,
            'expectedAxisDeltaPixels': {'x': -math.sin(yaw) * length * ppu,
                                       'y': -math.cos(yaw) * length * math.sin(math.radians(35)) * ppu},
            'idealAxisTolerancePixels': 4 * 2 ** -23 * max(1, camera_distance, length) * ppu + .001,
            'toleranceFormula': '4*2^-23*max(1,cameraDistance,weaponLength)*pixelsPerWorldUnit+0.001',
            'derivation': 'Body-local stationary fire axis(0,length,0), native Rz(-pi), fixed 35deg camera image-up; float32 transform bound and endpoint rounding; independent of measured pixels'}


def verify_south_projection(dx, dy, yaw, length, ppu, camera_distance):
    if not all(type(value) in (int, float) and math.isfinite(value) for value in (dx, dy, yaw)):
        raise RuntimeError('Native S axis requires finite coordinates and yaw')
    contract = south_projection_contract(length, ppu, camera_distance)
    expected, tolerance = contract['expectedAxisDeltaPixels'], contract['idealAxisTolerancePixels']
    if (dy <= 0 or abs(yaw - contract['yawRadians']) > 1e-8
            or abs(dx - expected['x']) > tolerance or abs(dy - expected['y']) > tolerance):
        raise RuntimeError('Native S firearm axis differs from independently predicted geometry')
    return contract


def self_test():
    helper = checked_helper()
    scoped_measurement(helper)
    renderer = helper.import_renderer(2)
    if renderer.ORIGIN != ORIGIN or renderer.CELL != CELL:
        raise RuntimeError('Native S renderer changed root or cell contract')
    contract = south_projection_contract(1.38, 1024 / 6, 100)
    dx, dy = contract['expectedAxisDeltaPixels'].values()
    yaw, tolerance = contract['yawRadians'], contract['idealAxisTolerancePixels']
    verify_south_projection(dx, dy, yaw, 1.38, 1024 / 6, 100)
    rejected = 0
    for x, y, angle in [(dx, -dy, yaw), (dx + 2 * tolerance, dy, yaw),
                        (dx, dy + 2 * tolerance, yaw), (dx, dy, yaw + math.pi / 4),
                        (float('nan'), dy, yaw), (dx, float('inf'), yaw)]:
        try:
            verify_south_projection(x, y, angle, 1.38, 1024 / 6, 100)
        except RuntimeError:
            rejected += 1
            continue
        raise RuntimeError('Unsupported native S projection accepted')
    print(json.dumps({'status': 'CONFEDERATE_S_GUIDE_CONTRACT_PASSED',
                      'checkedOriginalCount': len(CHECKED_HASHES), 'rejectionCases': rejected,
                      'originalV7MeasurementAndSPredicate': 'unchanged',
                      'direction': 2, 'projectionContract': contract}), flush=True)
    return helper


def verify_scene_contract():
    import bpy
    scene = bpy.context.scene
    elevation = math.degrees(math.atan2(scene.camera.location.z, -scene.camera.location.y))
    if (scene.render.engine, scene.cycles.device, scene.cycles.samples, scene.render.threads_mode,
        scene.render.threads, scene.camera.data.type, scene.render.resolution_x, scene.render.resolution_y,
        scene.render.resolution_percentage) != ('CYCLES', 'CPU', 16, 'FIXED', 8, 'ORTHO', 1024, 1024, 100):
        raise RuntimeError('Native sample/CPU/thread/camera/size contract changed')
    if abs(elevation - 35) > 1e-5 or abs(scene.camera.data.ortho_scale - 6) > 1e-6:
        raise RuntimeError('Native 35-degree camera or orthographic scale changed')
    if scene.render.image_settings.color_mode != 'RGBA' or not scene.render.film_transparent:
        raise RuntimeError('Native transparent RGBA render contract changed')


def annotate_receipt(output, prior_hashes):
    import bpy
    scene = bpy.context.scene
    path = output.with_suffix('.json')
    receipt = json.loads(path.read_text())
    kind = receipt['guideKind']
    expected_entries = [[action, 2, frame] for _, action, frame in (MARCH_POSES if kind == 'march' else ACTION_POSES)]
    if (receipt['sourceEntries'] != expected_entries or receipt['side'] != 'confederate'
            or receipt['direction'] != 'S' or receipt['directionIndex'] != 2):
        raise RuntimeError('Actual guide side, bearing or complete pose ownership changed')
    for material, expected in {'coat': (.43, .40, .34, 1), 'pants': (.42, .41, .38, 1), 'cap': (.30, .29, .27, 1)}.items():
        if any(abs(value - wanted) > 1e-6 for value, wanted in zip(bpy.data.materials[material].diffuse_color, expected)):
            raise RuntimeError('Original reduced Confederate gray/brown material selection changed')
    for record in receipt['geometry']:
        if (min(record['paddingPixels'].values()) < 24
                or max(abs(record['rootProjected'][axis] - ORIGIN[index]) for index, axis in enumerate(('x', 'y'))) > .01):
            raise RuntimeError('Independently fixed root/padding expectations failed')
        if record['sourceEntry'][0] == 'fire':
            delta = record['projectedFiringAxisDeltaPixels']
            record['independentSouthProjectionContract'] = verify_south_projection(delta['x'], delta['y'],
                record['yawRadians'], record['musketBodyLengthWorldUnits'], receipt['pixelsPerWorldUnit'], scene.camera.location.length)
    receipt.update({
        'identityScope': 'Confederate A composition reference only; full A kit, equipment placement and face must come from reviewed A artwork',
        'measurementHelperScript': str(V7_SOURCE.relative_to(ROOT)),
        'measurementHelperScriptSha256': CHECKED_HASHES[V7_SOURCE],
        'measurementAdaptation': 'None; unchanged checked v7 measure AST rebinds into v14 globals; original S firing predicate, root comparison, native alpha padding and geometry predicates remain unchanged',
        'nativeOriginAdaptation': {'original': list(ORIGIN), 'selected': list(ORIGIN), 'adapted': False},
        'materialSelection': 'Unchanged reduced Confederate gray/brown palette from original side parameter; no existing-image recoloring',
        'samples': 16, 'jobExecution': 'Two sequential native CPU jobs; scene reset; fixed 8 threads',
        'checkedOriginalScriptHashes': {str(path.relative_to(ROOT)): digest for path, digest in CHECKED_HASHES.items()},
        'priorHelperPreservationHashes': {str(path.relative_to(ROOT)): digest for path, digest in prior_hashes.items()},
        'helperContractSelfTest': 'passed',
        'nativeDirection': 'Actual native 3D S direction2, yaw -pi; no flat rotation or mirrored image',
        'independentRegistrationChecks': {'expectedRootPixels': list(ORIGIN), 'rootTolerancePixels': .01,
            'paddingComputedFromNativePixelsSeparatelyFrom3DRoot': True, 'alphaThreshold': 64, 'minimumPaddingPixels': 24},
        'legacyDepthQualifierCaveat': 'Far/near object labels originate in E rig; anatomical left/right remain authoritative for native S',
        'poseCaveats': ['Primitive rig is a structural composition reference; anatomy and historical drill remain unvalidated',
                        'Reduced kit does not independently certify complete Confederate A campaign equipment or likeness',
                        'Native S projection can occlude hands, bore, loading rod or kit; geometry checks do not certify their visibility',
                        'Firing head remains upright without guaranteed cheek-to-stock contact or sight alignment',
                        'Trace the complete hip-to-boot joint chain for gait anatomy; image position alone cannot label support leg'],
    })
    write_json(path, receipt)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--self-test', action='store_true')
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ([] if '--python' in sys.argv else sys.argv[1:])
    args = parser.parse_args(argv)
    helper = self_test()
    if args.self_test:
        return
    outputs = [OUTPUT / f'confederate-a-s-{kind}-guide.png' for _, _, _, kind in JOBS]
    if any(path.exists() or path.with_suffix('.json').exists() for path in outputs):
        raise RuntimeError('Existing guide names are protected; no overwrite permitted')
    prior_paths = sorted(set(ROOT.glob('scripts/author-gettysburg*.py'))
                         | set(ROOT.glob('scripts/render-gettysburg*.py')) | {SOURCE})
    new_helpers = {Path(__file__).resolve(), ROOT / 'scripts/author-gettysburg-v14-clips.py'}
    prior_hashes = {path: sha256(path) for path in prior_paths if path not in new_helpers}
    source_hashes = {**prior_hashes, **CHECKED_HASHES, Path(__file__).resolve(): sha256(Path(__file__).resolve())}
    measure = scoped_measurement(helper)
    renderer = helper.import_renderer(2)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    import bpy
    for (side, bearing, direction, kind), output in zip(JOBS, outputs):
        bpy.ops.wm.read_factory_settings(use_empty=False)
        renderer.render_worker(SimpleNamespace(kind=kind, side=side, raw=str(output), samples=16, supersample=1, threads=8))
        verify_scene_contract()
        measure(output, side, bearing, direction, kind, source_hashes)
        annotate_receipt(output, prior_hashes)
        if any(sha256(path) != digest for path, digest in source_hashes.items()):
            raise RuntimeError('Prior machinery or v14 wrapper changed during rendering')
        print(f'V14_NATIVE_GUIDE_READY: {output}', flush=True)
    print('V14_CONFEDERATE_S_GUIDES_COMPLETE: two native renders; checked original bytes unchanged', flush=True)


if __name__ == '__main__':
    main()
