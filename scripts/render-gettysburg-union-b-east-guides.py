#!/usr/bin/env python3
"""Render only three new bounded native Gettysburg v11 structural guides.

Padded Union E actions render first at native ground root(176,440); E/SE
march diagnostics follow at(192,440), anatomical left blue/right red.
The checked v7 helper and checked v10 diagnostic import the unchanged v4 rig.
Existing SE actions are reused unchanged, not rendered again. All original
renderer/guide bytes are protected. There is no raster editing or production
identity claim: Union B appearance comes from the accepted S/SW/W artwork.
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
DIAGNOSTIC_SOURCE = ROOT / 'scripts/render-gettysburg-diagonal-leg-diagnostics.py'
PRIOR_WRAPPERS = [ROOT / 'scripts/render-gettysburg-diagonal-guide.py',
                  ROOT / 'scripts/render-gettysburg-diagonal-action-guide.py', V7_SOURCE, DIAGNOSTIC_SOURCE]
OUTPUT = ROOT / 'docs/art-pass/candidates/gettysburg-v11'
CELL, ORIGIN = (512, 512), (192, 440)
MARCH_POSES = [('left-contact', 'walk', 1), ('left-passing', 'walk', 2),
               ('right-contact', 'walk', 3), ('right-passing', 'walk', 0)]
ACTION_POSES = [('ready-upright-carry', 'idle', 0), ('shoulder-aim-fire', 'fire', 0),
                ('upright-load-at-barrel', 'reload', 0), ('upright-ramrod-insertion', 'reload', 1)]
JOBS = [('union', 'E', 0, 'actions'), ('union', 'E', 0, 'march'), ('union', 'SE', 1, 'march')]
CHECKED_HASHES = {
    SOURCE: '14ed68fd8ca42dd66641db73dac437d9219a9a715bd18c14e06be2e6558b1877',
    GUIDE_SOURCE: '7d0b3e93b958bbf9f03184b6f8e54987c578e540b3052d2efa73bada68d5257a',
    PRIOR_WRAPPERS[0]: '89748380613a939dc2cbc3f58e6f433b9baef867e4f23d2acc25ea1378079955',
    PRIOR_WRAPPERS[1]: 'e7fd86507a9ddbfb09d3ebf65408cbcf03b5b431ceb19f29902fbc7c2a3727ba',
    V7_SOURCE: '62f6492e74a9cc5c5da9f179885c34b3ca7a7efdb73b10b9f3a63894d045e0bd',
    DIAGNOSTIC_SOURCE: 'fac14d033431f9674001962982526fc69e925c789f551b5aac369a2715753e2d',
}
GRAY_GUIDES = {
    ('E', 'march'): ROOT / 'docs/art-pass/candidates/gettysburg-v4/union-e-march-guide.json',
    ('E', 'actions'): ROOT / 'docs/art-pass/candidates/gettysburg-v4/union-e-actions-guide.json',
    ('SE', 'march'): ROOT / 'docs/art-pass/candidates/gettysburg-v5/union-se-march-guide.json',
    ('SE', 'actions'): ROOT / 'docs/art-pass/candidates/gettysburg-v6/union-se-actions-guide.json',
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
    for path, digest in CHECKED_HASHES.items():
        if sha256(path) != digest:
            raise RuntimeError(f'Original checked renderer changed: {path}')
    helper = import_module(V7_SOURCE, 'v11_checked_v7')
    diagnostic = import_module(DIAGNOSTIC_SOURCE, 'v11_checked_leg_materials')
    if (helper.CELL, helper.ORIGIN, helper.MARCH_POSES, helper.ACTION_POSES) != (CELL, (192, 440), MARCH_POSES, ACTION_POSES):
        raise RuntimeError('Expected original cells, root and chronological native poses')
    for (bearing, kind), path in GRAY_GUIDES.items():
        receipt = json.loads(path.read_text())
        if sha256(ROOT / receipt['image']) != receipt['imageSha256']:
            raise RuntimeError('Existing native gray guide image/receipt mismatch')
        direction = 0 if bearing == 'E' else 1
        specs = MARCH_POSES if kind == 'march' else ACTION_POSES
        if receipt['sourceEntries'] != [[action, direction, frame] for _, action, frame in specs]:
            raise RuntimeError('Existing native gray guide phase/direction contract changed')
    return helper, diagnostic


def firing_projection_contract(direction, length, ppu, camera_distance):
    if direction not in (0, 1):
        raise ValueError('Only native E(0)/SE(1) are in scope')
    yaw = -math.pi / 2 - direction * math.pi / 4
    return {'directionIndex': direction, 'yawRadians': yaw,
            'expectedAxisDeltaPixels': {'x': -math.sin(yaw) * length * ppu,
                                       'y': -math.cos(yaw) * length * math.sin(math.radians(35)) * ppu},
            'idealAxisTolerancePixels': 4 * 2 ** -23 * max(1, camera_distance, length) * ppu + .001,
            'toleranceFormula': '4*2^-23*max(1,cameraDistance,weaponLength)*pixelsPerWorldUnit+0.001',
            'derivation': 'Ideal body-local fire axis(0,length,0), native Rz(yaw), fixed35deg camera image-up; float32 transform bound plus endpoint rounding; independent of measured pixels'}


def firing_invalid(bearing, dx, dy, yaw, length, camera, ppu):
    direction = {'E': 0, 'SE': 1}.get(bearing)
    if direction is None:
        return True
    contract = firing_projection_contract(direction, length, ppu, camera.location.length)
    expected, tolerance = contract['expectedAxisDeltaPixels'], contract['idealAxisTolerancePixels']
    return (dx <= 0 or (bearing == 'SE' and dy <= 0) or abs(yaw - contract['yawRadians']) > 1e-8
            or abs(dx - expected['x']) > tolerance or abs(dy - expected['y']) > tolerance)


def scoped_measure(helper):
    tree = ast.parse(inspect.getsource(helper.measure))
    expected = ast.parse("(bearing == 'S' and projected_dy <= 0) or (bearing == 'N' and projected_dy >= 0)", mode='eval').body
    predicates = [node for node in ast.walk(tree) if isinstance(node, ast.If)
                  and ast.dump(node.test, include_attributes=False) == ast.dump(expected, include_attributes=False)]
    if len(predicates) != 1:
        raise RuntimeError('Expected one checked v7 cardinal firing predicate')
    predicates[0].test = ast.parse('firing_invalid(bearing,projected_dx,projected_dy,expected_yaw,axis.length,scene.camera,pixels_per_unit)', mode='eval').body
    ast.fix_missing_locations(tree)
    exec(compile(tree, str(V7_SOURCE), 'exec'), globals())
    return globals()['measure']


def self_test():
    helper, diagnostic = checked_helpers()
    scoped_measure(helper)
    camera = SimpleNamespace(location=SimpleNamespace(length=100))
    for bearing, direction in [('E', 0), ('SE', 1)]:
        diagnostic.diagnostic_renderer(helper, direction)
        contract = firing_projection_contract(direction, 1.38, 1024 / 6, 100)
        dx, dy = contract['expectedAxisDeltaPixels'].values()
        yaw, tolerance = contract['yawRadians'], contract['idealAxisTolerancePixels']
        if firing_invalid(bearing, dx, dy, yaw, 1.38, camera, 1024 / 6):
            raise RuntimeError('Ideal authored bearing rejected')
        for b, x, y, angle in [('W', dx, dy, yaw), (bearing, -dx, dy, yaw),
                               (bearing, dx + 2 * tolerance, dy, yaw),
                               (bearing, dx, dy + 2 * tolerance, yaw),
                               (bearing, dx, dy, yaw + math.pi / 4)]:
            if not firing_invalid(b, x, y, angle, 1.38, camera, 1024 / 6):
                raise RuntimeError('Unsupported/incorrect ideal projection accepted')
    print('UNION_B_EAST_GUIDE_CONTRACT_PASSED: checked native poses, anatomical material adaptation and independent E/SE firing axis', flush=True)
    return helper, diagnostic


def main():
    global ORIGIN
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--self-test', action='store_true')
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ([] if '--python' in sys.argv else sys.argv[1:])
    args = parser.parse_args(argv)
    helper, diagnostic = self_test()
    if args.self_test:
        return
    outputs = [OUTPUT / 'union-b-e-actions-guide.png', OUTPUT / 'union-b-e-march-anatomical-guide.png',
               OUTPUT / 'union-b-se-march-anatomical-guide.png']
    if any(path.exists() or path.with_suffix('.json').exists() for path in outputs):
        raise RuntimeError('Existing new guide names are protected; no overwrite permitted')
    old_scripts = {path: sha256(path) for path in [SOURCE, *ROOT.glob('scripts/render-gettysburg*.py')]
                   if path != Path(__file__).resolve()}
    old_guides = {path: sha256(path) for path in (ROOT / 'docs/art-pass/candidates').glob('gettysburg-v*/*')
                  if path.is_file() and path.parent != OUTPUT and path.suffix in ('.png', '.json')
                  and ('guide' in path.name or 'anatomical-diagnostic' in path.name)}
    source_hashes = {**CHECKED_HASHES, Path(__file__).resolve(): sha256(Path(__file__).resolve())}
    measure = scoped_measure(helper)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    import bpy
    for (side, bearing, direction, kind), output in zip(JOBS, outputs):
        bpy.ops.wm.read_factory_settings(use_empty=False)
        ORIGIN = (176, 440) if kind == 'actions' else (192, 440)
        renderer = helper.import_renderer(direction) if kind == 'actions' else diagnostic.diagnostic_renderer(helper, direction)
        renderer.ORIGIN = ORIGIN
        renderer.render_worker(SimpleNamespace(kind=kind, side='union', raw=str(output),
                                              samples=16, supersample=1, threads=8))
        scene = bpy.context.scene
        elevation = math.degrees(math.atan2(scene.camera.location.z, -scene.camera.location.y))
        if (scene.cycles.device, scene.cycles.samples, scene.render.threads, scene.camera.data.type,
            scene.render.resolution_x, scene.render.resolution_y) != ('CPU', 16, 8, 'ORTHO', 1024, 1024):
            raise RuntimeError('Native rendering contract changed')
        if abs(elevation - 35) > 1e-5 or abs(scene.camera.data.ortho_scale - 6) > 1e-6:
            raise RuntimeError('Native fixed35-degree camera changed')
        measure(output, side, bearing, direction, kind, source_hashes)
        path = output.with_suffix('.json')
        receipt = json.loads(path.read_text())
        gray_path = GRAY_GUIDES[(bearing, kind)]
        gray = json.loads(gray_path.read_text())
        if [p['poseSha256'] for p in receipt['poses']] != [p['poseSha256'] for p in gray['poses']]:
            raise RuntimeError('Local geometry transforms differ from the unchanged native gray guide')
        if kind == 'actions' and min(min(r['paddingPixels'].values()) for r in receipt['geometry']) < 32:
            raise RuntimeError('New native E actions must clear32px solid padding')
        reused = json.loads(GRAY_GUIDES[('SE', 'actions')].read_text())
        receipt.update({
            'purpose': 'Union E/SE structural reference for v11 only; not authored B appearance, final artwork, approved family or validated drill',
            'identityScope': 'Union B appearance must come from accepted B S/SW/W sources; primitive rig has no certified B likeness',
            'samples': 16, 'helperContractSelfTest': 'passed',
            'jobExecution': 'Exactly three sequential native CPU jobs; scene reset; 8threads; old SE actions reused',
            'geometryTransformHashesMatchGrayGuide': True,
            'unchangedGrayGuideReceipt': str(gray_path.relative_to(ROOT)),
            'unchangedGrayGuideReceiptSha256': sha256(gray_path),
            'nativeOriginAdaptation': {'original': [192, 440], 'selected': list(ORIGIN),
                                      'method': 'Native scene root registration before rendering; shared by every pose; worldground z0; no pixel translation'},
            'nativeMaterialAdaptation': {'applied': kind == 'march', 'anatomicalLeft': 'blue', 'anatomicalRight': 'red',
                                         'method': 'Checked new3D diagnostic materials on thigh/knee/shin/boot; source geometry unchanged; do not transfer to final uniform'},
            'materialSelection': 'Original Union palette for actions/body/kit; diagnostic leftblue/rightred legs only in march references',
            'allOriginalRendererHashes': {str(p.relative_to(ROOT)): d for p, d in old_scripts.items()},
            'allOriginalGuideHashes': {str(p.relative_to(ROOT)): d for p, d in old_guides.items()},
            'reusedSEActions': {'image': reused['image'], 'imageSha256': reused['imageSha256'],
                                'receipt': str(GRAY_GUIDES[('SE', 'actions')].relative_to(ROOT)),
                                'receiptSha256': sha256(GRAY_GUIDES[('SE', 'actions')]), 'renderedThisPass': False},
            'poseCaveats': ['Primitive geometry does not certify anatomy, exact cheek/stock contact or period drill',
                            'Legacy far/near labels originate in E; anatomical left/right are authoritative',
                            'A boot image position alone cannot identify its support hip; trace the entire joint chain',
                            'Kit is a reduced rig; accepted B artwork supplies body-relative equipment and identity'],
        })
        for record in receipt['geometry']:
            if record['sourceEntry'][0] == 'fire':
                record['independentFiringProjectionContract'] = firing_projection_contract(direction,
                    record['musketBodyLengthWorldUnits'], receipt['pixelsPerWorldUnit'], scene.camera.location.length)
        write_json(path, receipt)
        if any(sha256(p) != d for p, d in {**old_scripts, **old_guides, **source_hashes}.items()):
            raise RuntimeError('An original renderer/guide or new wrapper changed during rendering')
        print(f'V11_NATIVE_GUIDE_READY: {output}', flush=True)
    print('V11_UNION_B_EAST_GUIDES_COMPLETE:3 new native renders; existing SE actions and all oldbytes unchanged', flush=True)


if __name__ == '__main__':
    main()
