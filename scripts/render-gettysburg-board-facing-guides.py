#!/usr/bin/env python3
"""Render four direct native board-facing Gettysburg structural guides.

Run Blender --background --factory-startup --python this-file.
The existing authorable v4 rig is imported unchanged. A checked in-memory
entry-direction replacement selects Union S (2) or Confederate N (6).
Four bounded Cycles CPU jobs run sequentially, with scene resets between them.
Each final PNG is the native Blender render: no raster editing or packing.
These are structural references, not accepted final artwork or validated drill.
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
PRIOR_WRAPPERS = [ROOT / 'scripts/render-gettysburg-diagonal-guide.py',
                  ROOT / 'scripts/render-gettysburg-diagonal-action-guide.py']
OUTPUT = ROOT / 'docs/art-pass/candidates/gettysburg-v7'
CELL = (512, 512)
ORIGIN = (192, 440)
MARCH_POSES = [('left-contact', 'walk', 1), ('left-passing', 'walk', 2),
               ('right-contact', 'walk', 3), ('right-passing', 'walk', 0)]
ACTION_POSES = [('ready-upright-carry', 'idle', 0), ('shoulder-aim-fire', 'fire', 0),
                ('upright-load-at-barrel', 'reload', 0), ('upright-ramrod-insertion', 'reload', 1)]
JOBS = [('union', 'S', 2, 'march'), ('union', 'S', 2, 'actions'),
        ('confederate', 'N', 6, 'march'), ('confederate', 'N', 6, 'actions')]


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')


def import_renderer(direction):
    spec = importlib.util.spec_from_file_location(f'gettysburg_native_direction_{direction}', GUIDE_SOURCE)
    renderer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(renderer)
    if (renderer.CELL, renderer.ORIGIN, renderer.COLS, renderer.PHASES, renderer.ACTION_POSES) != (CELL, ORIGIN, 2, MARCH_POSES, ACTION_POSES):
        raise RuntimeError('Expected the unchanged v4 cell, camera-root and pose contract')
    tree = ast.parse(inspect.getsource(renderer.render_worker))
    targets = [node for node in ast.walk(tree) if isinstance(node, ast.Assign)
               and any(isinstance(target, ast.Name) and target.id == 'selected_entries' for target in node.targets)]
    expected = ast.parse('selected_entries = [(action, 0, frame) for _, action, frame in pose_specs]').body[0]
    if len(targets) != 1 or ast.dump(targets[0], include_attributes=False) != ast.dump(expected, include_attributes=False):
        raise RuntimeError('Expected one original selected-entry direction assignment')
    targets[0].value.elt.elts[1].value = direction
    ast.fix_missing_locations(tree)
    exec(compile(tree, str(GUIDE_SOURCE), 'exec'), renderer.__dict__)
    return renderer


def measure(output, side, bearing, direction, kind, source_hashes):
    """Read original native pixels and authored 3D meshes; write JSON only."""
    import bpy
    from mathutils import Vector

    receipt_path = output.with_suffix('.json')
    receipt = json.loads(receipt_path.read_text())
    rendered = bpy.data.images.load(str(output), check_existing=False)
    width, height = rendered.size
    header = output.read_bytes()[:33]
    if header[:8] != b'\x89PNG\r\n\x1a\n' or header[12:16] != b'IHDR':
        raise RuntimeError('Expected a native PNG with IHDR header')
    png_width, png_height, bit_depth, color_type = struct.unpack('>IIBB', header[16:26])
    if (width, height, rendered.channels, png_width, png_height, color_type) != (1024, 1024, 4, 1024, 1024, 6):
        raise RuntimeError('Expected unchanged native 1024x1024 RGBA pixels')
    pixels = array('f', [0]) * (width * height * 4)
    rendered.pixels.foreach_get(pixels)
    scene = bpy.context.scene
    camera_inverse = scene.camera.matrix_world.inverted()
    pixels_per_unit = max(width, height) / scene.camera.data.ortho_scale
    poses = MARCH_POSES if kind == 'march' else ACTION_POSES

    def project(point, column, row):
        point = camera_inverse @ point
        return {'x': round(width / 2 + point.x * pixels_per_unit - column * CELL[0], 3),
                'y': round(height / 2 - point.y * pixels_per_unit - row * CELL[1], 3)}

    def mesh_record(obj, column, row):
        vertices = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
        points = [project(point, column, row) for point in vertices]
        return {'center': project(obj.matrix_world.translation, column, row),
                'projectedBounds': [min(p['x'] for p in points), min(p['y'] for p in points),
                                    max(p['x'] for p in points), max(p['y'] for p in points)],
                'worldMinimumZ': round(min(p.z for p in vertices), 8),
                'worldMaximumZ': round(max(p.z for p in vertices), 8)}

    records = []
    transparent_count = 0
    opaque_count = 0
    for index, (phase, action, frame) in enumerate(poses):
        column, row = index % 2, index // 2
        min_x, min_y, max_x, max_y = CELL[0], CELL[1], -1, -1
        foreground_count = 0
        for y in range(CELL[1]):
            for x in range(CELL[0]):
                alpha = pixels[((height - 1 - (row * CELL[1] + y)) * width + column * CELL[0] + x) * 4 + 3]
                transparent_count += alpha == 0
                opaque_count += alpha >= 1
                if alpha >= 64 / 255:
                    min_x, min_y = min(min_x, x), min(min_y, y)
                    max_x, max_y = max(max_x, x), max(max_y, y)
                    foreground_count += 1
        if not foreground_count:
            raise RuntimeError(f'Blank native pose: {side} {bearing} {phase}')
        bounds = [min_x, min_y, max_x + 1, max_y + 1]
        padding = {'left': min_x, 'top': min_y, 'right': CELL[0] - max_x - 1, 'bottom': CELL[1] - max_y - 1}
        if min(padding.values()) < 24:
            raise RuntimeError(f'Native solid padding below 24px: {side} {bearing} {phase}: {padding}')
        prefix = f'{action}-{direction}-{frame}'
        pose = receipt['poses'][index]
        root_projection = project(Vector(pose['rootWorld']), column, row)
        if max(abs(root_projection[axis] - ORIGIN[offset]) for offset, axis in enumerate(['x', 'y'])) > 0.01:
            raise RuntimeError(f'Projected ground root changed: {phase}')
        expected_yaw = -math.pi / 2 - direction * math.pi / 4
        if abs(pose['yawRadians'] - expected_yaw) > 1e-8:
            raise RuntimeError(f'Native {bearing} yaw changed: {phase}')
        start, end = Vector(pose['weaponStartBodyLocal']), Vector(pose['weaponEndBodyLocal'])
        axis = end - start
        if abs(axis.length - 1.38) > 1e-6 or abs(pose['bayonetBladeLength'] - 0.45) > 1e-6:
            raise RuntimeError(f'Weapon scale changed: {phase}')
        soles = {name: mesh_record(scene.objects[f'{prefix}:{name} boot sole'], column, row)
                 for name in ['left-far', 'right-near']}
        support_objects = [name for name, value in soles.items() if abs(value['worldMinimumZ']) < 1e-7]
        supports = ['left' if name == 'left-far' else 'right' for name in support_objects]
        expected_supports = {1: ['left', 'right'], 2: ['left'], 3: ['left', 'right'], 0: ['right']}[frame] if kind == 'march' else ['left', 'right']
        if supports != expected_supports:
            raise RuntimeError(f'Anatomical support changed: {phase}: {supports}')
        stock = scene.objects[f'{prefix}:musket stock']
        barrel = scene.objects[f'{prefix}:musket barrel']
        blade = scene.objects[f'{prefix}:socket bayonet blade']
        butt_world = stock.matrix_world @ Vector((0, 0, -1))
        mouth_world = barrel.matrix_world @ Vector((0, 0, 1))
        tip_world = blade.matrix_world @ Vector((0, 0, 1))
        butt_projected, mouth_projected = project(butt_world, column, row), project(mouth_world, column, row)
        record = {'phase': phase, 'sourceEntry': [action, direction, frame], 'sourceFrame': prefix,
                  'cell': {'x': column * CELL[0], 'y': row * CELL[1], 'w': CELL[0], 'h': CELL[1]},
                  'alphaBoundsThreshold': 64, 'alphaBounds': bounds, 'paddingPixels': padding,
                  'foregroundPixelCount': foreground_count,
                  'rootProjected': root_projection, 'rootWorld': pose['rootWorld'], 'worldGroundZ': 0,
                  'yawRadians': pose['yawRadians'], 'bodyBobWorldZ': pose['bodyBobWorldZ'],
                  'cap': mesh_record(scene.objects[f'{prefix}:kepi crown'], column, row),
                  'soles': soles, 'plantedSupportObjectLabels': support_objects, 'anatomicalSupportLegs': supports,
                  'leftHand': mesh_record(scene.objects[f'{prefix}:left hand'], column, row),
                  'rightHand': mesh_record(scene.objects[f'{prefix}:right hand'], column, row),
                  'weaponPose': pose['weaponPose'], 'weaponStartBodyLocal': pose['weaponStartBodyLocal'],
                  'weaponEndBodyLocal': pose['weaponEndBodyLocal'], 'handAttachmentBodyLocal': pose['handAttachmentBodyLocal'],
                  'musketBodyLengthWorldUnits': axis.length,
                  'stockButtWorld': list(butt_world), 'stockButtProjected': butt_projected,
                  'barrelMouthWorld': list(mouth_world), 'barrelMouthProjected': mouth_projected,
                  'barrelMouthAnchorMeaning': 'Actual authored barrel-end point; distinct from bayonet tip; visibility is not guaranteed',
                  'bayonetTipWorld': list(tip_world), 'bayonetTipProjected': project(tip_world, column, row),
                  'weaponAssembly': {name: mesh_record(scene.objects[f'{prefix}:{name}'], column, row)
                                     for name in ['musket stock', 'musket barrel', 'ramrod', 'bayonet socket',
                                                  'bayonet shank', 'socket bayonet blade']}}
        record['bodyCapToSoleSpanPixels'] = round(max(value['projectedBounds'][3] for value in soles.values()) - record['cap']['projectedBounds'][1], 3)
        record['bodyCapToSoleFractionOfCell'] = round(record['bodyCapToSoleSpanPixels'] / CELL[1], 4)
        hands = [Vector(point) for point in pose['handAttachmentBodyLocal']]
        if action == 'fire':
            shoulder = Vector((0.22, 0, 1.43))
            if (start - shoulder).length > 0.093:
                raise RuntimeError('Firing stock butt must contact right shoulder geometry')
            record['stockButtToRightShoulderCenterWorldUnits'] = (start - shoulder).length
            projected_dx = mouth_projected['x'] - butt_projected['x']
            projected_dy = mouth_projected['y'] - butt_projected['y']
            if (bearing == 'S' and projected_dy <= 0) or (bearing == 'N' and projected_dy >= 0):
                raise RuntimeError(f'Actual firearm projection disagrees with {bearing}: {projected_dx}, {projected_dy}')
            record['projectedFiringAxisDeltaPixels'] = {'x': round(projected_dx, 3), 'y': round(projected_dy, 3)}
            record['projectedFiringAxisDegrees'] = math.degrees(math.atan2(projected_dy, projected_dx))
        elif action == 'reload':
            if (hands[0] - start.lerp(end, 0.65)).length > 1e-7:
                raise RuntimeError('Loading left hand must retain its supporting grip')
            if frame == 1:
                record['insertedRamrod'] = mesh_record(scene.objects[f'{prefix}:inserted ramrod'], column, row)
                record['insertedRamrodBodyLocalEndpoints'] = [list(end - axis.normalized() * 0.30), list(end + axis.normalized() * 0.55)]
                record['rightHandAboveBoreWorldUnits'] = (hands[1] - end).dot(axis.normalized())
                record['bayonetToInsertedRodCenterOffsetWorldUnits'] = 0.035
        records.append(record)
    if kind == 'march':
        for name in ['weaponStartBodyLocal', 'weaponEndBodyLocal', 'handAttachmentBodyLocal']:
            if any(record[name] != records[0][name] for record in records[1:]):
                raise RuntimeError(f'Marching attachment changed: {name}')
    else:
        for name in ['weaponStartBodyLocal', 'weaponEndBodyLocal']:
            if records[2][name] != records[3][name]:
                raise RuntimeError(f'Load/ram weapon continuity changed: {name}')
        if records[2]['handAttachmentBodyLocal'][0] != records[3]['handAttachmentBodyLocal'][0]:
            raise RuntimeError('Supporting load/ram grip changed')
    if not scene.render.film_transparent or not transparent_count or not opaque_count:
        raise RuntimeError('Native transparent background and opaque figures required')
    if any('muzzle flash' in obj.name for obj in scene.objects):
        raise RuntimeError('Structural guides must have no baked discharge')
    if any(sha256(path) != digest for path, digest in source_hashes.items()):
        raise RuntimeError('An original source or wrapper changed during rendering')
    receipt.update({
        'purpose': f'Structural {side} {bearing} {kind} reference only; not accepted final artwork, full-family evidence or validated historical drill',
        'sourceScript': str(SOURCE.relative_to(ROOT)), 'sourceScriptSha256': source_hashes[SOURCE],
        'authorableGuideScript': str(GUIDE_SOURCE.relative_to(ROOT)), 'authorableGuideScriptSha256': source_hashes[GUIDE_SOURCE],
        'wrapperScript': str(Path(__file__).resolve().relative_to(ROOT)), 'wrapperScriptSha256': source_hashes[Path(__file__).resolve()],
        'unchangedPriorWrapperHashes': {str(path.relative_to(ROOT)): source_hashes[path] for path in PRIOR_WRAPPERS},
        'directionReplacement': {'count': 1, 'before': '[(action, 0, frame) for _, action, frame in pose_specs]',
                                 'after': f'[(action, {direction}, frame) for _, action, frame in pose_specs]',
                                 'meaning': f'Native 3D yaw {expected_yaw} for {bearing}; no flat sprite rotation'},
        'poseAdaptation': 'None; imported v4 body, feet, arms, weapon, camera and pose geometry remains unchanged',
        'materialSelection': f'Existing v4 {side} palette selected through original side parameter',
        'image': str(output.relative_to(ROOT)), 'imageSha256': sha256(output), 'imageBytes': output.stat().st_size,
        'side': side, 'direction': bearing, 'directionIndex': direction, 'guideKind': kind,
        'phaseOrder': [phase for phase, _, _ in poses], 'sourceEntries': [[action, direction, frame] for _, action, frame in poses],
        'size': {'w': width, 'h': height}, 'cell': {'w': CELL[0], 'h': CELL[1]}, 'columns': 2, 'rows': 2,
        'groundOriginPixels': {'x': ORIGIN[0], 'y': ORIGIN[1]}, 'worldGroundZ': 0, 'pixelsPerWorldUnit': pixels_per_unit,
        'camera': {'type': scene.camera.data.type, 'elevationDegrees': 35, 'orthographicScale': scene.camera.data.ortho_scale,
                   'location': list(scene.camera.location), 'rotationEuler': list(scene.camera.rotation_euler)},
        'nativeAlpha': True, 'alphaEvidence': {'channels': rendered.channels, 'pngColorType': color_type, 'pngBitDepth': bit_depth,
                                              'transparentPixels': transparent_count, 'opaquePixels': opaque_count},
        'rasterPostprocessing': False, 'nativeRenderWritesOnly': True, 'supersample': 1, 'threads': 8,
        'minimumSolidPaddingPixels': 24, 'solidPaddingAlphaThreshold': 64,
        'jobIndex': JOBS.index((side, bearing, direction, kind)), 'boundedJobCount': len(JOBS),
        'bayonetExtensionWorldUnits': 0.495, 'bayonetBladeLengthWorldUnits': 0.45, 'bayonetOffsetWorldUnits': 0.035,
        'musketBodyLengthWorldUnits': 1.38, 'insertedRamrodLengthWorldUnits': 0.85,
        'legacySoleObjectLabelMeaning': {'left-far': 'anatomical left', 'right-near': 'anatomical right'},
        'legacyDepthQualifierCaveat': 'Far/near object names are retained from E rig; cardinal front/back views do not inherit their depth meaning',
        'geometry': records, 'noBakedDischarge': True,
        'fixedMarchAttachments': kind == 'march', 'loadRamSupportAndWeaponContinuity': kind == 'actions',
        'capCenterDriftPixels': {axis: round(max(r['cap']['center'][axis] for r in records) - min(r['cap']['center'][axis] for r in records), 3)
                               for axis in ['x', 'y']},
        'poseCaveats': ['Primitive rig is structural reference; exact anatomy and period drill remain unvalidated',
                        'Firing head is upright without guaranteed cheek-to-stock or sight alignment',
                        'Back-facing N view can occlude hands, bore, working rod, and facial identity',
                        'Thin socket bayonet and loading rod may be difficult to separate visually',
                        'Original rig is a reduced kit reference, not a verified complete campaign equipment inventory'],
        'review': {'status': 'awaiting read-only native image inspection', 'productionApproved': False,
                   'familyApproved': False, 'anatomicalValidation': False, 'historicalValidation': False},
    })
    write_json(receipt_path, receipt)
    print(json.dumps({'image': str(output), 'receipt': str(receipt_path), 'size': receipt['size'],
                      'padding': [r['paddingPixels'] for r in records], 'capDrift': receipt['capCenterDriftPixels'],
                      'sha256': receipt['imageSha256'], 'nativeAlpha': True}), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser.parse_args(argv)
    outputs = [OUTPUT / f'{side}-{bearing.lower()}-{kind}-guide.png' for side, bearing, _, kind in JOBS]
    if any(path.exists() or path.with_suffix('.json').exists() for path in outputs):
        parser.error('Existing named native guides are protected; inspect them before rerendering')
    source_hashes = {path: sha256(path) for path in [SOURCE, GUIDE_SOURCE, *PRIOR_WRAPPERS, Path(__file__).resolve()]}
    renderers = {direction: import_renderer(direction) for direction in [2, 6]}
    OUTPUT.mkdir(parents=True, exist_ok=True)
    import bpy
    for (side, bearing, direction, kind), output in zip(JOBS, outputs):
        bpy.ops.wm.read_factory_settings(use_empty=False)
        settings = SimpleNamespace(kind=kind, side=side, raw=str(output), samples=16, supersample=1, threads=8)
        renderers[direction].render_worker(settings)
        measure(output, side, bearing, direction, kind, source_hashes)
    print('BOARD_FACING_GUIDES_COMPLETE: four sequential native renders; all original scripts unchanged', flush=True)


if __name__ == '__main__':
    main()
