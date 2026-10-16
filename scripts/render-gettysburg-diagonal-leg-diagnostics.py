#!/usr/bin/env python3
"""Render two new native anatomical-leg diagnostics, never production art.

Checked v10/v7 helpers import the unchanged v4 body/pose/camera geometry.
Only native material selection changes: anatomical left leg is blue, right
leg red, including thigh, knee, shin and boot. The whole sheet is a direct
Blender render, not a recolored existing image. Each geometry transform hash
must match its unchanged gray native guide. Two sequential CPU jobs use eight
threads and sixteen samples, 35-degree orthographic camera and root(192,440).
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
V10_SOURCE = ROOT / 'scripts/render-gettysburg-confederate-diagonal-guides.py'
V10_HASH = 'f44eb326fbcdecec043685048111ea6e0ff5ff801c19a2dedca6b98648e5735c'
OUTPUT = ROOT / 'docs/art-pass/candidates/gettysburg-v10'
CELL, ORIGIN = (512, 512), (192, 440)
JOBS = [('confederate', 'NE', 7, 'march'), ('confederate', 'NW', 5, 'march')]


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')


def checked_wrapper():
    if sha256(V10_SOURCE) != V10_HASH:
        raise RuntimeError('Expected unchanged checked v10 wrapper')
    spec = importlib.util.spec_from_file_location('checked_v10_diagonal_wrapper', V10_SOURCE)
    wrapper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(wrapper)
    wrapper.self_test()
    return wrapper


def diagnostic_renderer(helper, direction):
    renderer = helper.import_renderer(direction)
    # Read the hash-checked original worker directly: the helper's compiled
    # function starts at a synthetic line number, which inspect can mistake
    # for another definition. Select its entry direction before compilation.
    workers = [node for node in ast.parse(Path(renderer.__file__).read_text()).body
               if isinstance(node, ast.FunctionDef) and node.name == 'render_worker']
    if len(workers) != 1:
        raise RuntimeError('Expected exactly one hash-checked native render worker')
    tree = ast.Module(body=workers, type_ignores=[])
    original_entries = ast.parse('selected_entries = [(action, 0, frame) for _, action, frame in pose_specs]').body[0]
    entries = [node for node in ast.walk(tree) if isinstance(node, ast.Assign)
               and ast.dump(node, include_attributes=False) == ast.dump(original_entries, include_attributes=False)]
    if len(entries) != 1:
        raise RuntimeError('Expected one original native entry direction')
    entries[0].value.elt.elts[1].value = direction
    colors = [node for node in ast.walk(tree) if isinstance(node, ast.Assign)
              and any(isinstance(target, ast.Name) and target.id == 'colors' for target in node.targets)]
    if len(colors) != 1 or not isinstance(colors[0].value, ast.Dict):
        raise RuntimeError('Expected one native material palette dictionary')
    for name, rgba in [('diagnostic_left_blue', (0.025, 0.20, 0.90, 1)),
                       ('diagnostic_right_red', (0.90, 0.035, 0.025, 1))]:
        colors[0].value.keys.append(ast.Constant(name))
        colors[0].value.values.append(ast.Tuple(elts=[ast.Constant(value) for value in rgba], ctx=ast.Load()))
    expected_loop = ast.parse('for sign in (-1, 1):\n    pass').body[0]
    legs = [node for node in ast.walk(tree) if isinstance(node, ast.For)
            and ast.dump(node.target, include_attributes=False) == ast.dump(expected_loop.target, include_attributes=False)
            and ast.dump(node.iter, include_attributes=False) == ast.dump(expected_loop.iter, include_attributes=False)]
    if len(legs) != 1:
        raise RuntimeError('Expected one unchanged anatomical left/right leg loop')
    count = 0
    for call in ast.walk(legs[0]):
        if not isinstance(call, ast.Call) or not isinstance(call.func, ast.Name):
            continue
        if call.func.id not in ('part', 'segment'):
            continue
        material_index = 2 if call.func.id == 'part' else 1
        if not isinstance(call.args[material_index], ast.Constant) or call.args[material_index].value not in ('pants', 'leather'):
            raise RuntimeError('Unexpected material call inside checked leg geometry')
        call.args[material_index] = ast.parse("'diagnostic_left_blue' if sign == -1 else 'diagnostic_right_red'", mode='eval').body
        count += 1
    if count != 6:
        raise RuntimeError(f'Expected exactly six native material selections per leg; found {count}')
    ast.fix_missing_locations(tree)
    exec(compile(tree, str(V10_SOURCE), 'exec'), renderer.__dict__)
    renderer.ORIGIN = ORIGIN
    return renderer


def main():
    wrapper = checked_wrapper()
    helper = wrapper.import_checked_v7_helper()
    # Compile the unchanged v10 scoped measurement into this diagnostic's
    # namespace, preserving correct __file__, source hashes and two-job identity.
    for name in ['SOURCE', 'GUIDE_SOURCE', 'V7_SOURCE', 'MARCH_POSES', 'ACTION_POSES',
                 'diagonal_projection_contract', 'diagonal_firing_invalid']:
        globals()[name] = getattr(wrapper, name)
    globals()['PRIOR_WRAPPERS'] = [*wrapper.PRIOR_WRAPPERS, V10_SOURCE]
    measure = FunctionType(wrapper.scoped_measurement.__code__, globals())(helper)
    source_hashes = {**wrapper.CHECKED_ORIGINAL_HASHES, V10_SOURCE: V10_HASH,
                     Path(__file__).resolve(): sha256(Path(__file__).resolve())}
    protected = {path: sha256(path) for path in OUTPUT.iterdir() if path.is_file()}
    outputs = [OUTPUT / f'{side}-{bearing.lower()}-march-anatomical-diagnostic.png' for side, bearing, _, _ in JOBS]
    if any(path.exists() or path.with_suffix('.json').exists() for path in outputs):
        raise RuntimeError('Existing diagnostics are protected; no overwrite permitted')
    import bpy
    for (side, bearing, direction, kind), output in zip(JOBS, outputs):
        bpy.ops.wm.read_factory_settings(use_empty=False)
        renderer = diagnostic_renderer(helper, direction)
        renderer.render_worker(SimpleNamespace(kind='march', side='confederate', raw=str(output),
                                              samples=16, supersample=1, threads=8))
        wrapper.verify_scene_contract()
        measure(output, side, bearing, direction, kind, source_hashes)
        path = output.with_suffix('.json')
        receipt = json.loads(path.read_text())
        gray_path = OUTPUT / f'confederate-{bearing.lower()}-march-guide.json'
        gray = json.loads(gray_path.read_text())
        if [pose['poseSha256'] for pose in receipt['poses']] != [pose['poseSha256'] for pose in gray['poses']]:
            raise RuntimeError('Native diagnostic geometry differs from the unchanged gray guide')
        receipt.update({
            'purpose': 'Anatomical leg-chain diagnostic only; not final uniform, production art, or certified gait/drill',
            'nativeMaterialAdaptation': {'anatomicalLeft': 'blue', 'anatomicalRight': 'red',
                                         'leftSign': -1, 'rightSign': 1,
                                         'parts': ['thigh', 'knee', 'shin', 'boot ankle', 'boot upper', 'boot sole'],
                                         'method': 'Two new opaque native Blender materials selected only in the existing anatomical leg loop before rendering; no old material or raster edits'},
            'geometryTransformHashesMatchGrayGuide': True,
            'unchangedGrayGuideReceipt': str(gray_path.relative_to(ROOT)),
            'unchangedGrayGuideReceiptSha256': protected[gray_path],
            'checkedOriginalScriptHashes': {str(path.relative_to(ROOT)): digest for path, digest in source_hashes.items()},
            'unchangedV10InputHashes': {str(path.relative_to(ROOT)): digest for path, digest in protected.items()},
            'samples': 16, 'jobExecution': 'Two sequential native render jobs; scene reset between jobs; 8 CPU threads',
            'poseAdaptation': 'None; all pose geometry transform hashes match the unchanged gray native march guide',
            'review': {'status': 'Awaiting read-only diagnostic inspection', 'productionApproved': False,
                       'familyApproved': False, 'anatomicalValidation': False, 'historicalValidation': False},
        })
        write_json(path, receipt)
        if any(sha256(path) != digest for path, digest in {**source_hashes, **protected}.items()):
            raise RuntimeError('An existing input changed during native diagnostic rendering')
        print(f'ANATOMICAL_DIAGNOSTIC_READY: {output}', flush=True)
    print('ANATOMICAL_DIAGNOSTICS_COMPLETE: two native sheets; all old inputs unchanged', flush=True)


if __name__ == '__main__':
    main()
