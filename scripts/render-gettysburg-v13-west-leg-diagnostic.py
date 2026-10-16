#!/usr/bin/env python3
"""Render one new native Confederate W anatomical leg-chain diagnostic.

The checked existing material diagnostic is applied before native rendering.
Anatomical left is blue and right is red from hip/thigh through knee, shin and
boot. Unchanged geometry must match the original v13 W gray guide exactly.
One 1024-square transparent render uses 512px cells, root(192,440), 35-degree
orthographic camera, 8 CPU threads and 16 samples. No existing pixels change.
"""
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
from types import FunctionType, SimpleNamespace

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
SETUP = ROOT / 'scripts/render-gettysburg-confederate-east-west-guides.py'
DIAGNOSTIC = ROOT / 'scripts/render-gettysburg-diagonal-leg-diagnostics.py'
CHECKED_NEW_SETUP_HASH = 'd83d025c6de6c3713ec1ff5c655436dfbac83b2d7fe67738d034dcff3a8235af'
CHECKED_DIAGNOSTIC_HASH = 'fac14d033431f9674001962982526fc69e925c789f551b5aac369a2715753e2d'
OUTPUT = ROOT / 'docs/art-pass/candidates/gettysburg-v13/confederate-a-w-march-anatomical-diagnostic.png'
GRAY = OUTPUT.parent / 'confederate-a-w-march-guide.json'
CELL, ORIGIN = (512, 512), (192, 440)
JOBS = [('confederate', 'W', 4, 'march')]


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')


def import_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def leg_chain_records(receipt):
    """Verify actual colored mesh chains against the checked authored points."""
    import bpy
    from mathutils import Matrix, Vector
    records = []
    for pose in receipt['poses']:
        action, direction, frame = pose['frame'].split('-')
        if action != 'walk' or direction != '4':
            raise RuntimeError('Every diagnostic pose must be native W march')
        phase = int(frame) * math.pi / 2
        root = Matrix.Translation(Vector(pose['rootWorld'])) @ Matrix.Rotation(pose['yawRadians'], 4, 'Z')
        record = {'sourceFrame': pose['frame'], 'anatomicalLegs': {}}
        for side, sign, material, rgba, legacy in [
                ('left', -1, 'diagnostic_left_blue', (.025, .20, .90, 1), 'left-far'),
                ('right', 1, 'diagnostic_right_red', (.90, .035, .025, 1), 'right-near')]:
            if any(abs(value - expected) > 1e-6 for value, expected in zip(bpy.data.materials[material].diffuse_color, rgba)):
                raise RuntimeError('Native anatomical material color changed')
            leg_phase = phase + (math.pi if sign == 1 else 0)
            foot_y = .27 * math.sin(leg_phase)
            lift = max(0, math.cos(leg_phase)) * .12
            hip = Vector((sign * .105, 0, .89 + pose['bodyBobWorldZ']))
            knee = Vector((sign * .12, foot_y * .55 + .085, .48 + lift * .35))
            foot = Vector((sign * .115, foot_y, .064 + lift))
            colored = [obj for obj in bpy.context.scene.objects if obj.name.startswith(pose['frame'] + ':')
                       and obj.type == 'MESH' and obj.data.materials and obj.data.materials[0].name == material]
            parts = ['trouser thigh', 'cloth knee', 'trouser shin', 'boot ankle',
                     f'{legacy} boot upper', f'{legacy} boot sole']
            if len(colored) != 6:
                raise RuntimeError('Expected exactly six colored meshes per anatomical leg')
            matched = {}
            for part in parts:
                found = [obj for obj in colored if obj.name.split(':', 1)[1].split('.', 1)[0] == part]
                if len(found) != 1:
                    raise RuntimeError('A colored hip-to-boot joint chain is incomplete or ambiguous')
                matched[part] = found[0]
            expected = {
                'hip': (matched['trouser thigh'], Vector((0, 0, -1)), hip),
                'thighToKnee': (matched['trouser thigh'], Vector((0, 0, 1)), knee),
                'kneeCenter': (matched['cloth knee'], Vector((0, 0, 0)), knee),
                'shinFromKnee': (matched['trouser shin'], Vector((0, 0, -1)), knee),
                'shinToBoot': (matched['trouser shin'], Vector((0, 0, 1)), foot + Vector((0, 0, .12))),
                'bootSoleCenter': (matched[f'{legacy} boot sole'], Vector((0, 0, 0)), foot + Vector((0, .042, -.047))),
            }
            for label, (obj, local, body_point) in expected.items():
                if (obj.matrix_world @ local - root @ body_point).length > 1e-6:
                    raise RuntimeError(f'Actual {side} {label} does not match its checked authored joint chain')
            record['anatomicalLegs'][side] = {'bodyLocalSign': sign, 'material': material, 'meshCount': 6,
                'parts': parts, 'objectNames': [matched[part].name for part in parts],
                'hipBodyLocal': list(hip), 'kneeBodyLocal': list(knee), 'footBodyLocal': list(foot),
                'hipWorld': list(root @ hip), 'kneeWorld': list(root @ knee), 'footWorld': list(root @ foot),
                'hipThighKneeShinBootChainVerified': True}
        records.append(record)
    return records


def main():
    if OUTPUT.exists() or OUTPUT.with_suffix('.json').exists():
        raise RuntimeError('Existing diagnostic names are protected; no overwrite permitted')
    if sha256(SETUP) != CHECKED_NEW_SETUP_HASH or sha256(DIAGNOSTIC) != CHECKED_DIAGNOSTIC_HASH:
        raise RuntimeError('Expected unchanged checked native setup and material diagnostic')
    setup = import_module(SETUP, 'v13_checked_ew_native_setup')
    diagnostic = import_module(DIAGNOSTIC, 'v13_checked_anatomical_materials')
    helper, scene_checker = setup.self_test()
    for name in ['SOURCE', 'GUIDE_SOURCE', 'V7_SOURCE', 'MARCH_POSES', 'ACTION_POSES', 'firing_invalid']:
        globals()[name] = getattr(setup, name)
    globals()['PRIOR_WRAPPERS'] = [*setup.PRIOR_WRAPPERS, SETUP, DIAGNOSTIC]
    measure = FunctionType(setup.scoped_measure.__code__, globals())(helper)
    source_hashes = {**setup.CHECKED_HASHES, SETUP: CHECKED_NEW_SETUP_HASH,
                     DIAGNOSTIC: CHECKED_DIAGNOSTIC_HASH, Path(__file__).resolve(): sha256(Path(__file__).resolve())}
    protected = {path: sha256(path) for bearing in ('e', 'w') for kind in ('march', 'actions')
                 for path in [OUTPUT.parent / f'confederate-a-{bearing}-{kind}-guide.png',
                              OUTPUT.parent / f'confederate-a-{bearing}-{kind}-guide.json']}
    gray = json.loads(GRAY.read_text())
    if sha256(ROOT / gray['image']) != gray['imageSha256']:
        raise RuntimeError('Original W gray image/receipt binding changed')
    import bpy
    bpy.ops.wm.read_factory_settings(use_empty=False)
    renderer = diagnostic.diagnostic_renderer(helper, 4)
    renderer.ORIGIN = ORIGIN
    renderer.render_worker(SimpleNamespace(kind='march', side='confederate', raw=str(OUTPUT), samples=16, supersample=1, threads=8))
    scene_checker.verify_scene_contract()
    measure(OUTPUT, 'confederate', 'W', 4, 'march', source_hashes)
    receipt_path = OUTPUT.with_suffix('.json')
    receipt = json.loads(receipt_path.read_text())
    if ([pose['poseSha256'] for pose in receipt['poses']] != [pose['poseSha256'] for pose in gray['poses']]
            or receipt['sourceEntries'] != [['walk', 4, frame] for frame in [1, 2, 3, 0]]):
        raise RuntimeError('Native diagnostic geometry or four W pose roles differ from unchanged gray guide')
    chains = leg_chain_records(receipt)
    receipt.update({
        'purpose': 'Anatomical W hip-to-boot composition diagnostic only; not final uniform, production art, physical gait or certified drill',
        'nativeMaterialAdaptation': {'anatomicalLeft': 'blue', 'anatomicalRight': 'red', 'leftSign': -1, 'rightSign': 1,
            'parts': ['hip-to-thigh', 'knee', 'shin', 'boot ankle', 'boot upper', 'boot sole'],
            'method': 'Checked existing material adaptation adds two opaque Blender materials and selects them only in the native leg loop before whole-sheet rendering; no raster editing'},
        'anatomicalJointChains': chains, 'hipThighKneeShinBootChainsVerified': True,
        'geometryTransformHashesMatchGrayGuide': True, 'poseAdaptation': 'None; exact local transform hashes match original W native gray guide',
        'unchangedGrayGuideReceipt': str(GRAY.relative_to(ROOT)), 'unchangedGrayGuideReceiptSha256': protected[GRAY],
        'checkedOriginalScriptHashes': {str(path.relative_to(ROOT)): digest for path, digest in source_hashes.items()},
        'unchangedV13StructuralGuideHashes': {str(path.relative_to(ROOT)): digest for path, digest in protected.items()},
        'samples': 16, 'jobExecution': 'One native render job; fixed 8 CPU threads; 35-degree orthographic camera',
        'identityScope': 'Primitive reduced gray/brown kit provides composition only; full Confederate A identity and kit remain supplied by reviewed A artwork',
        'review': {'status': 'Awaiting read-only diagnostic inspection', 'productionApproved': False,
                   'familyApproved': False, 'anatomicalValidation': False, 'historicalValidation': False},
    })
    write_json(receipt_path, receipt)
    if any(sha256(path) != digest for path, digest in {**source_hashes, **protected}.items()):
        raise RuntimeError('An existing checked input or new script changed during rendering')
    print(f'V13_W_ANATOMICAL_DIAGNOSTIC_READY: {OUTPUT}', flush=True)


if __name__ == '__main__':
    main()
