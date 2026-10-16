#!/usr/bin/env python3
"""Render a native-alpha SE marching reference with the unchanged v4 guide rig.

Run Blender --background --factory-startup --python this-file.
This wrapper imports the existing authorable guide, changes its one explicit
entry-direction value to 1 in memory, and renders four 512px cells directly.
The PNG is Blender's original render: no packing, drawing, resizing, or edits.
This is structural reference only, not accepted final game artwork.
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
DEFAULT_OUTPUT = ROOT / 'docs/art-pass/candidates/gettysburg-v5/union-se-march-guide.png'
CELL = (512, 512)
ORIGIN = (192, 440)
DIRECTION = 1
PHASES = [('far-contact', 'walk', 1), ('first-passing', 'walk', 2),
          ('near-contact', 'walk', 3), ('opposite-passing', 'walk', 0)]


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')


def import_se_renderer():
    """Import v4, then change only its explicit selected-entry direction to SE.

    v4 has no direction parameter. A checked AST replacement exposes that one
    choice without duplicating its rig or editing either existing renderer.
    The body, feet, weapon and hand attachment code remains exactly v4's code.
    """
    spec = importlib.util.spec_from_file_location('gettysburg_v4_native_guide', GUIDE_SOURCE)
    renderer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(renderer)
    tree = ast.parse(inspect.getsource(renderer.render_worker))
    assignments = [node for node in ast.walk(tree) if isinstance(node, ast.Assign)
                   and any(isinstance(target, ast.Name) and target.id == 'selected_entries'
                           for target in node.targets)]
    expected = ast.parse('selected_entries = [(action, 0, frame) for _, action, frame in pose_specs]').body[0]
    if len(assignments) != 1 or ast.dump(assignments[0], include_attributes=False) != ast.dump(expected, include_attributes=False):
        raise RuntimeError('Expected the original single v4 selected-entry direction assignment')
    assignments[0].value.elt.elts[1].value = DIRECTION
    ast.fix_missing_locations(tree)
    exec(compile(tree, str(GUIDE_SOURCE), 'exec'), renderer.__dict__)
    renderer.PHASES = PHASES
    return renderer


def measure(output, renderer, source_hashes):
    """Inspect native pixels and projected mesh geometry; write JSON only."""
    import bpy
    from mathutils import Vector

    receipt_path = output.with_suffix('.json')
    receipt = json.loads(receipt_path.read_text())
    rendered = bpy.data.images.load(str(output), check_existing=False)
    width, height = rendered.size
    if (width, height) != (1024, 1024) or rendered.channels != 4:
        raise RuntimeError('Expected unchanged native 1024x1024 RGBA render')
    header = output.read_bytes()[:33]
    if header[:8] != b'\x89PNG\r\n\x1a\n' or header[12:16] != b'IHDR':
        raise RuntimeError('Expected a native PNG with an IHDR header')
    png_width, png_height, bit_depth, color_type = struct.unpack('>IIBB', header[16:26])
    if (png_width, png_height, color_type) != (width, height, 6):
        raise RuntimeError('Native PNG header does not report RGBA pixels')
    pixels = array('f', [0]) * (width * height * 4)
    rendered.pixels.foreach_get(pixels)
    scene = bpy.context.scene
    camera_inverse = scene.camera.matrix_world.inverted()
    pixels_per_unit = max(width, height) / scene.camera.data.ortho_scale

    def project(point, column, row):
        point = camera_inverse @ point
        return {'x': round(width / 2 + point.x * pixels_per_unit - column * CELL[0], 3),
                'y': round(height / 2 - point.y * pixels_per_unit - row * CELL[1], 3)}

    def mesh_record(obj, column, row):
        world_vertices = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
        points = [project(point, column, row) for point in world_vertices]
        return {'center': project(obj.matrix_world.translation, column, row),
                'projectedBounds': [min(p['x'] for p in points), min(p['y'] for p in points),
                                    max(p['x'] for p in points), max(p['y'] for p in points)],
                'worldMinimumZ': round(min(p.z for p in world_vertices), 8),
                'worldMaximumZ': round(max(p.z for p in world_vertices), 8)}

    records = []
    transparent_count = 0
    opaque_count = 0
    for index, (phase, action, frame) in enumerate(PHASES):
        column, row = index % 2, index // 2
        min_x, min_y, max_x, max_y = CELL[0], CELL[1], -1, -1
        foreground_count = 0
        for y in range(CELL[1]):
            for x in range(CELL[0]):
                alpha = pixels[((height - 1 - (row * CELL[1] + y)) * width + column * CELL[0] + x) * 4 + 3]
                transparent_count += alpha == 0
                opaque_count += alpha >= 1
                if alpha > 16 / 255:
                    min_x, min_y = min(min_x, x), min(min_y, y)
                    max_x, max_y = max(max_x, x), max(max_y, y)
                    foreground_count += 1
        if not foreground_count:
            raise RuntimeError(f'Blank native SE phase: {phase}')
        bounds = [min_x, min_y, max_x + 1, max_y + 1]
        padding = {'left': min_x, 'top': min_y, 'right': CELL[0] - max_x - 1,
                   'bottom': CELL[1] - max_y - 1}
        if min(padding.values()) < 12:
            raise RuntimeError(f'Insufficient native cell padding: {phase}: {padding}')
        prefix = f'{action}-{DIRECTION}-{frame}'
        pose = receipt['poses'][index]
        root_projection = project(Vector(pose['rootWorld']), column, row)
        if max(abs(root_projection[axis] - ORIGIN[offset]) for offset, axis in enumerate(['x', 'y'])) > 0.01:
            raise RuntimeError(f'Projected ground origin changed: {phase}')
        soles = {name: mesh_record(scene.objects[f'{prefix}:{name} boot sole'], column, row)
                 for name in ['left-far', 'right-near']}
        supports = [name for name, value in soles.items() if abs(value['worldMinimumZ']) < 1e-7]
        if not supports:
            raise RuntimeError(f'No planted sole at world ground Z=0: {phase}')
        record = {'phase': phase, 'sourceEntry': [action, DIRECTION, frame], 'sourceFrame': prefix,
                  'cell': {'x': column * CELL[0], 'y': row * CELL[1], 'w': CELL[0], 'h': CELL[1]},
                  'alphaBoundsThreshold': 16, 'alphaBounds': bounds, 'paddingPixels': padding,
                  'foregroundPixelCount': foreground_count,
                  'rootProjected': root_projection, 'rootWorld': pose['rootWorld'], 'worldGroundZ': 0,
                  'cap': mesh_record(scene.objects[f'{prefix}:kepi crown'], column, row),
                  'soles': soles, 'plantedSupportLegs': supports,
                  'leftHand': mesh_record(scene.objects[f'{prefix}:left hand'], column, row),
                  'rightHand': mesh_record(scene.objects[f'{prefix}:right hand'], column, row),
                  'bayonet': mesh_record(scene.objects[f'{prefix}:socket bayonet blade'], column, row),
                  'weaponPose': pose['weaponPose'], 'weaponStartBodyLocal': pose['weaponStartBodyLocal'],
                  'weaponEndBodyLocal': pose['weaponEndBodyLocal'],
                  'handAttachmentBodyLocal': pose['handAttachmentBodyLocal'], 'bodyBobWorldZ': pose['bodyBobWorldZ']}
        records.append(record)
    for name in ['weaponStartBodyLocal', 'weaponEndBodyLocal', 'handAttachmentBodyLocal']:
        if any(record[name] != records[0][name] for record in records[1:]):
            raise RuntimeError(f'Marching attachment changed between phases: {name}')
    if not scene.render.film_transparent or not transparent_count or not opaque_count:
        raise RuntimeError('Native render must contain both transparent background and opaque figures')
    if any('muzzle flash' in obj.name for obj in scene.objects):
        raise RuntimeError('Marching reference must have no baked muzzle discharge')
    if any(sha256(path) != digest for path, digest in source_hashes.items()):
        raise RuntimeError('An original source or the wrapper changed during rendering')
    receipt.update({
        'purpose': 'Structural SE gait reference only; not accepted final game artwork or a complete infantry family',
        'sourceScript': str(SOURCE.relative_to(ROOT)), 'sourceScriptSha256': source_hashes[SOURCE],
        'authorableGuideScript': str(GUIDE_SOURCE.relative_to(ROOT)), 'authorableGuideScriptSha256': source_hashes[GUIDE_SOURCE],
        'wrapperScript': str(Path(__file__).resolve().relative_to(ROOT)), 'wrapperScriptSha256': source_hashes[Path(__file__).resolve()],
        'inMemoryAdaptation': 'One checked selected-entry AST direction constant changed from 0 to 1; semantic phase labels updated; body, feet, weapon, hands and camera code imported unchanged',
        'directionReplacement': {'count': 1, 'before': '[(action, 0, frame) for _, action, frame in pose_specs]',
                                 'after': '[(action, 1, frame) for _, action, frame in pose_specs]',
                                 'meaning': 'Native 3D yaw becomes -3*pi/4 (SE); no flat sprite rotation'},
        'image': str(output.relative_to(ROOT)), 'imageSha256': sha256(output), 'imageBytes': output.stat().st_size,
        'side': 'union', 'direction': 'SE', 'directionIndex': DIRECTION, 'guideKind': 'march',
        'phaseOrder': [phase for phase, _, _ in PHASES], 'sourceEntries': [[action, DIRECTION, frame] for _, action, frame in PHASES],
        'size': {'w': width, 'h': height}, 'cell': {'w': CELL[0], 'h': CELL[1]}, 'columns': 2, 'rows': 2,
        'groundOriginPixels': {'x': ORIGIN[0], 'y': ORIGIN[1]}, 'worldGroundZ': 0,
        'pixelsPerWorldUnit': pixels_per_unit,
        'camera': {'type': scene.camera.data.type, 'elevationDegrees': 35,
                   'orthographicScale': scene.camera.data.ortho_scale, 'location': list(scene.camera.location),
                   'rotationEuler': list(scene.camera.rotation_euler)},
        'nativeAlpha': True, 'alphaEvidence': {'channels': rendered.channels, 'pngColorType': color_type,
                                              'pngBitDepth': bit_depth, 'transparentPixels': transparent_count,
                                              'opaquePixels': opaque_count},
        'rasterPostprocessing': False, 'nativeRenderWritesOnly': True, 'supersample': 1, 'threads': 8,
        'bayonetExtensionWorldUnits': 0.495, 'bayonetBladeLengthWorldUnits': 0.45, 'musketBodyLengthWorldUnits': 1.38,
        'geometry': records, 'noBakedDischarge': True, 'fixedHandWeaponAttachmentsAcrossPhases': True,
        'capCenterDriftPixels': {
            axis: round(max(r['cap']['center'][axis] for r in records) - min(r['cap']['center'][axis] for r in records), 3)
            for axis in ['x', 'y']},
        'review': {'status': 'awaiting read-only native image inspection', 'productionApproved': False,
                   'familyApproved': False, 'anatomicalValidation': False},
    })
    write_json(receipt_path, receipt)
    print(json.dumps({'image': str(output), 'receipt': str(receipt_path), 'size': receipt['size'],
                      'padding': [r['paddingPixels'] for r in records], 'capDrift': receipt['capCenterDriftPixels'],
                      'sha256': receipt['imageSha256'], 'nativeAlpha': receipt['nativeAlpha']}), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    output = parser.parse_args(argv).output.resolve()
    if output != DEFAULT_OUTPUT.resolve():
        parser.error('This bounded wrapper writes only its named Gettysburg v5 candidate PNG and JSON')
    if output.exists() or output.with_suffix('.json').exists():
        parser.error('Existing candidate output is protected; inspect it before rerendering')
    source_hashes = {path: sha256(path) for path in [SOURCE, GUIDE_SOURCE, Path(__file__).resolve()]}
    renderer = import_se_renderer()
    output.parent.mkdir(parents=True, exist_ok=True)
    settings = SimpleNamespace(kind='march', side='union', raw=str(output), samples=16, supersample=1, threads=8)
    renderer.render_worker(settings)
    measure(output, renderer, source_hashes)


if __name__ == '__main__':
    main()
