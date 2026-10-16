#!/usr/bin/env python3
"""Reproducible, original low-poly infantry; Blender renders, Pillow only packs/encodes.

/opt/homebrew/bin/python3.11 scripts/render-civil-war-infantry.py --preview
/opt/homebrew/bin/python3.11 scripts/render-civil-war-infantry.py
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

CELL = (128, 160)
ORIGIN = (64, 128)
COLS = 16
ACTIONS = ('idle', 'walk', 'fire', 'reload', 'route', 'fall')
DIRECTIONS = ('E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE')
FPS = (4, 8, 12, 6, 10, 8)
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / 'public/images/units/directional-v2'


def entries(preview=False):
    if preview:
        samples = [('idle', 0), ('walk', 0), ('walk', 1), ('fire', 1),
                   ('reload', 1), ('route', 0), ('fall', 2), ('fall', 3)]
        return [(action, direction, frame) for action, frame in samples for direction in range(8)]
    return [(action, direction, frame) for action in ACTIONS for direction in range(8) for frame in range(4)]


def metadata(side):
    frames = {}
    for index, (action, direction, frame) in enumerate(entries()):
        frames[f'{action}-{direction}-{frame}'] = {
            'frame': {'x': index % COLS * CELL[0], 'y': index // COLS * CELL[1], 'w': CELL[0], 'h': CELL[1]},
            'rotated': False, 'trimmed': False,
            'spriteSourceSize': {'x': 0, 'y': 0, 'w': CELL[0], 'h': CELL[1]},
            'sourceSize': {'w': CELL[0], 'h': CELL[1]},
            'pivot': {'x': 0.5, 'y': 0.8},
        }
    return {'frames': frames, 'meta': {
        'app': 'Titans Forge refined Blender infantry', 'version': '2',
        'image': f'{side}-infantry.webp', 'format': 'RGBA8888',
        'size': {'w': 2048, 'h': 1920}, 'scale': '1',
        'cell': {'w': 128, 'h': 160}, 'columns': 16, 'rows': 12,
        'origin': {'x': 0.5, 'y': 0.8}, 'originPixels': {'x': 64, 'y': 128},
        'directionOrder': list(DIRECTIONS), 'screenAngleRadians': [round(i * math.pi / 4, 8) for i in range(8)],
        'frameIndex': 'actionIndex * 32 + directionIndex * 4 + frameIndex',
        'actions': {action: {'frames': 4, 'suggestedFps': FPS[i], 'loop': action != 'fall'} for i, action in enumerate(ACTIONS)},
        'anchorMeaning': 'Fixed ground origin at standing feet; fall retains this origin without recentering or trimming.',
        'renderMethod': 'Individually posed 3D meshes, fixed orthographic camera; no 2D rotation, mirroring, warping, or generated art.',
    }}


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')


def render_worker(args):
    import bpy
    from mathutils import Matrix, Vector

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = args.samples
    scene.cycles.seed = 1861
    scene.cycles.use_animated_seed = False
    scene.cycles.use_denoising = True
    scene.cycles.use_adaptive_sampling = False
    scene.cycles.max_bounces = 3
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = args.threads
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    scene.view_settings.exposure = 0
    scene.world.color = (0.32, 0.32, 0.32)

    colors = {
        'coat': (0.025, 0.08, 0.22, 1) if args.side == 'union' else (0.43, 0.40, 0.34, 1),
        'pants': (0.19, 0.33, 0.48, 1) if args.side == 'union' else (0.42, 0.41, 0.38, 1),
        'cap': (0.02, 0.055, 0.17, 1) if args.side == 'union' else (0.30, 0.29, 0.27, 1),
        'skin': (0.54, 0.31, 0.19, 1), 'leather': (0.025, 0.021, 0.019, 1),
        'wood': (0.16, 0.065, 0.026, 1), 'steel': (0.25, 0.28, 0.31, 1),
        'brass': (0.65, 0.42, 0.11, 1), 'linen': (0.76, 0.77, 0.73, 1),
        'pack': (0.09, 0.10, 0.09, 1), 'flash': (1.0, 0.46, 0.055, 1),
    }
    materials = {}
    for name, color in colors.items():
        material = bpy.data.materials.new(name)
        material.diffuse_color = color
        material.use_nodes = True
        shader = material.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Base Color'].default_value = color
        shader.inputs['Roughness'].default_value = 0.86
        if name in ('coat', 'pants', 'cap'):
            texture = material.node_tree.nodes.new('ShaderNodeTexNoise')
            texture.inputs['Scale'].default_value = 42
            texture.inputs['Detail'].default_value = 2
            ramp = material.node_tree.nodes.new('ShaderNodeValToRGB')
            ramp.color_ramp.elements[0].color = tuple(v * .83 for v in color[:3]) + (1,)
            ramp.color_ramp.elements[1].color = tuple(min(1, v * 1.12) for v in color[:3]) + (1,)
            material.node_tree.links.new(texture.outputs['Fac'], ramp.inputs['Fac'])
            material.node_tree.links.new(ramp.outputs['Color'], shader.inputs['Base Color'])
            bump = material.node_tree.nodes.new('ShaderNodeBump')
            bump.inputs['Strength'].default_value = .12
            bump.inputs['Distance'].default_value = .018
            material.node_tree.links.new(texture.outputs['Fac'], bump.inputs['Height'])
            material.node_tree.links.new(bump.outputs['Normal'], shader.inputs['Normal'])
        if name == 'steel': shader.inputs['Metallic'].default_value = 0.6
        if name == 'flash':
            shader.inputs['Emission Color'].default_value = color
            shader.inputs['Emission Strength'].default_value = 2.5
        materials[name] = material

    templates = {}
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16)
    templates['sphere'] = bpy.context.object.data.copy()
    bpy.data.objects.remove(bpy.context.object, do_unlink=True)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=1, depth=2)
    templates['cylinder'] = bpy.context.object.data.copy()
    bpy.data.objects.remove(bpy.context.object, do_unlink=True)
    bpy.ops.mesh.primitive_cube_add(size=2)
    cube = bpy.context.object
    bevel = cube.modifiers.new('Rounded edges', 'BEVEL')
    bevel.width = 0.30
    bevel.segments = 3
    bpy.context.view_layer.objects.active = cube
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    templates['box'] = cube.data.copy()
    bpy.data.objects.remove(cube, do_unlink=True)
    bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=1, radius2=0.0, depth=2)
    templates['cone'] = bpy.context.object.data.copy()
    bpy.data.objects.remove(bpy.context.object, do_unlink=True)
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=1, radius2=0.78, depth=2)
    templates['taper'] = bpy.context.object.data.copy()
    bpy.data.objects.remove(bpy.context.object, do_unlink=True)
    # Rounded cloth cross-sections: flared hem, narrow waist, soft chest and shoulders.
    rings = [(-1, 1.00, 1.0), (-0.70, 0.91, 0.94), (-0.35, 0.83, 0.91),
             (0.10, 0.93, 1.0), (0.67, 1.02, 1.02), (0.86, 1.01, 0.96), (1, 0.62, 0.67)]
    vertices = []
    for z, rx, ry in rings:
        for i in range(24):
            angle = i * math.tau / 24
            cosine, sine = math.cos(angle), math.sin(angle)
            vertices.append((math.copysign(abs(cosine) ** 0.78, cosine) * rx,
                             math.copysign(abs(sine) ** 0.78, sine) * ry, z))
    faces = []
    for ring in range(len(rings) - 1):
        for i in range(24):
            a, b = ring * 24 + i, ring * 24 + (i + 1) % 24
            faces.append((a, b, b + 24, a + 24))
    faces.extend([tuple(reversed(range(24))), tuple(range((len(rings) - 1) * 24, len(rings) * 24))])
    coat_mesh = bpy.data.meshes.new('Tailored rounded coat')
    coat_mesh.from_pydata(vertices, [], faces)
    coat_mesh.update()
    templates['coat'] = coat_mesh
    for shape, mesh in templates.items():
        if shape in ('sphere', 'cylinder', 'taper', 'coat'):
            for polygon in mesh.polygons: polygon.use_smooth = len(polygon.vertices) <= 4
    meshes = {}
    for shape, base in templates.items():
        for material, value in materials.items():
            mesh = base.copy()
            mesh.materials.append(value)
            meshes[shape, material] = mesh

    selected_entries = entries(args.preview)
    columns = 8 if args.preview else COLS
    rows = math.ceil(len(selected_entries) / columns)
    width, height = columns * CELL[0], rows * CELL[1]
    elevation = math.radians(35)
    up = Vector((0, math.sin(elevation), math.cos(elevation)))
    pixels_per_unit = CELL[1] / 3.0
    camera_data = bpy.data.cameras.new('Fixed orthographic infantry camera')
    camera = bpy.data.objects.new('Fixed orthographic infantry camera', camera_data)
    scene.collection.objects.link(camera)
    camera.location = (0, -100 * math.cos(elevation), 100 * math.sin(elevation))
    camera.rotation_euler = (-camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera_data.type = 'ORTHO'
    # Blender's orthographic scale is the width for landscape images, height for portrait.
    camera_data.ortho_scale = max(width, height) / pixels_per_unit
    camera_data.clip_end = 300
    scene.camera = camera
    for name, energy, rotation in [('Key', 1.9, (0.45, -0.4, -0.5)), ('Fill', 0.95, (0.4, 0.6, 2.2)), ('Rim', 0.85, (-0.5, 0.4, 0.5))]:
        data = bpy.data.lights.new(name, 'SUN')
        data.energy = energy
        data.angle = 0.12
        light = bpy.data.objects.new(name, data)
        scene.collection.objects.link(light)
        light.rotation_euler = rotation

    pose_receipts = []
    for index, (action, direction, frame) in enumerate(selected_entries):
        pixel_x = index % columns * CELL[0] + ORIGIN[0]
        pixel_y = index // columns * CELL[1] + ORIGIN[1]
        root_position = Vector(((pixel_x - width / 2) / pixels_per_unit, 0, 0)) + up * ((height / 2 - pixel_y) / pixels_per_unit)
        yaw = -math.pi / 2 - direction * math.pi / 4
        root = Matrix.Translation(root_position) @ Matrix.Rotation(yaw, 4, 'Z')
        phase = frame * math.pi / 2
        moving = action in ('walk', 'route')
        stride = (0.38 if action == 'route' else 0.27) if moving else 0.025
        bob = (0.025 * math.cos(2 * phase + 0.4)) if moving else 0.012 * math.sin(phase)
        hip_z = 0.89 + bob
        lean = 0.24 if action == 'route' else 0.06 if action == 'walk' else 0
        if action == 'fall':
            progress = (0.0, 0.30, 0.70, 1.0)[frame]
            root = root @ Matrix.Translation((0, 0.02 * progress, -0.69 * progress)) @ Matrix.Translation((0, 0, 0.89)) @ Matrix.Rotation(-1.48 * progress, 4, 'X') @ Matrix.Translation((0, 0, -0.89))
        body = Matrix.Translation((0, 0, hip_z)) @ Matrix.Rotation(-lean, 4, 'X') @ Matrix.Translation((0, 0, -0.89))
        transforms = []

        def part(name, shape, material, position, scale, rotation=None, torso=False):
            local = Matrix.Translation(Vector(position))
            if rotation is not None: local = local @ rotation.to_matrix().to_4x4()
            local = local @ Matrix.Diagonal((*scale, 1))
            transform = root @ (body if torso else Matrix.Identity(4)) @ local
            obj = bpy.data.objects.new(f'{action}-{direction}-{frame}:{name}', meshes[shape, material])
            scene.collection.objects.link(obj)
            obj.matrix_world = transform
            transforms.append([name, *[round(v, 6) for row in local for v in row]])

        def segment(name, material, start, end, radius, torso=False, tapered=False):
            a, b = Vector(start), Vector(end)
            delta = b - a
            part(name, 'taper' if tapered else 'cylinder', material, (a + b) / 2, (radius, radius, delta.length / 2), delta.to_track_quat('Z', 'Y'), torso)

        for sign in (-1, 1):
            leg_phase = phase + (math.pi if sign == 1 else 0)
            foot_y = stride * math.sin(leg_phase)
            lift = max(0, math.cos(leg_phase)) * (0.19 if action == 'route' else 0.12) if moving else 0
            foot = (sign * 0.115, foot_y, 0.085 + lift)
            knee = (sign * 0.12, foot_y * 0.55 + (0.085 if moving else 0.025), 0.48 + lift * 0.35)
            hip = (sign * 0.105, 0, hip_z)
            segment('trouser thigh', 'pants', hip, knee, 0.100, tapered=True)
            part('cloth knee', 'sphere', 'pants', knee, (0.080, 0.083, 0.084))
            segment('trouser shin', 'pants', knee, (foot[0], foot[1], foot[2] + 0.12), 0.079, tapered=True)
            part('boot ankle', 'sphere', 'leather', (foot[0], foot[1] - 0.018, foot[2] + 0.075), (0.070, 0.074, 0.112))
            part('boot upper', 'sphere', 'leather', (foot[0], foot[1] + 0.042, foot[2]), (0.082, 0.155, 0.070))
            part('boot sole', 'box', 'leather', (foot[0], foot[1] + 0.042, foot[2] - 0.047), (0.080, 0.141, 0.017))
        part('sack coat', 'coat', 'coat', (0, 0, 1.18), (0.218, 0.135, 0.355), torso=True)
        part('collar', 'box', 'coat', (0, 0.007, 1.50), (0.105, 0.095, 0.045), torso=True)
        part('belt', 'box', 'leather', (0, 0, 1.03), (0.242, 0.144, 0.033), torso=True)
        part('buckle', 'box', 'brass', (0, 0.151, 1.03), (0.034, 0.013, 0.027), torso=True)
        for z in (1.16, 1.27, 1.38): part('button', 'sphere', 'brass', (0, 0.137, z), (0.015, 0.012, 0.015), torso=True)
        part('neck', 'cylinder', 'skin', (0, 0, 1.54), (0.070, 0.070, 0.06), torso=True)
        head_y = 0.009 * math.cos(phase) if action == 'idle' else 0
        part('head', 'sphere', 'skin', (0, 0.018 + head_y, 1.67), (0.114, 0.106, 0.148), torso=True)
        part('nose', 'sphere', 'skin', (0, 0.124 + head_y, 1.67), (0.035, 0.042, 0.04), torso=True)
        for x in (-0.114, 0.114): part('ear', 'sphere', 'skin', (x, 0.01, 1.66), (0.024, 0.035, 0.047), torso=True)
        part('kepi crown', 'cylinder', 'cap', (0, 0.006, 1.812), (0.126, 0.115, 0.065), torso=True)
        part('kepi band', 'cylinder', 'leather', (0, 0.006, 1.758), (0.130, 0.119, 0.019), torso=True)
        part('kepi visor', 'sphere', 'leather', (0, 0.13, 1.748), (0.133, 0.083, 0.014), torso=True)
        part('pack', 'box', 'pack', (0, -0.18, 1.28), (0.17, 0.07, 0.21), torso=True)
        part('cartridge box', 'box', 'leather', (0.245, -0.07, 1.02), (0.055, 0.09, 0.075), torso=True)
        segment('sling', 'linen', (-0.17, 0.144, 1.46), (0.16, 0.15, 1.06), 0.023, True)

        recoil = (0, -0.075, -0.035, -0.010)[frame] if action == 'fire' else 0
        if action == 'fire':
            gun_start, gun_end = (0.135, -0.25 + recoil, 1.39), (0.135, 0.95 + recoil, 1.39)
            hands = [(-0.08, 0.46 + recoil, 1.34), (0.18, 0.06 + recoil, 1.33)]
            elbows = [(-0.26, 0.20, 1.17), (0.37, -0.02, 1.30)]
        elif action == 'reload':
            gun_start, gun_end = (0.11, 0.19, 0.62), (0.11, 0.30, 1.80)
            hands = [(-0.07, 0.25, 1.17), (0.13, 0.32, (1.12, 1.72, 1.32, 1.58)[frame])]
            elbows = [(-0.30, 0.12, 1.08), (0.34, 0.14, (1.14, 1.56, 1.20, 1.42)[frame])]
        else:
            swing = 0.07 * math.sin(phase) if moving else 0.012 * math.sin(phase)
            gun_start, gun_end = (0.16, 0.13 + swing, 0.72), (0.16, 0.48 + swing, 1.80)
            hands = [(-0.20, 0.10 - swing, 1.05), (0.17, 0.24 + swing, 1.11)]
            elbows = [(-0.29, -0.04 - swing, 1.22), (0.31, 0.02 + swing, 1.19)]
            if action == 'fall':
                # Keep the dropped musket and supporting palm above the ground after collapse.
                gun_start, gun_end = (0.23, -0.04, 0.65), (0.23, -0.04, 1.79)
                hands[0] = (-0.31, 0.10, 1.17 - frame * 0.045)
                hands[1] = (0.23, -0.04, 1.08)
        for arm, sign in enumerate((-1, 1)):
            part('cloth shoulder', 'sphere', 'coat', (sign * 0.22, 0, 1.43), (0.091, 0.093, 0.093), torso=True)
            segment('upper sleeve', 'coat', (sign * 0.22, 0, 1.43), elbows[arm], 0.084, True, tapered=True)
            part('cloth elbow', 'sphere', 'coat', elbows[arm], (0.069, 0.070, 0.071), torso=True)
            segment('lower sleeve', 'coat', elbows[arm], hands[arm], 0.068, True, tapered=True)
            part('hand', 'sphere', 'skin', hands[arm], (0.060, 0.055, 0.069), torso=True)
        start, end = Vector(gun_start), Vector(gun_end)
        axis = end - start
        segment('musket stock', 'wood', start, start + axis * 0.60, 0.036, True)
        segment('musket barrel', 'steel', start + axis * 0.35, end, 0.017, True)
        segment('ramrod', 'steel', start + axis * 0.40 + Vector((0.022, 0, -0.015)), end + Vector((0.022, 0, -0.015)), 0.006, True)
        for fraction in (0.43, 0.65, 0.86):
            part('barrel band', 'cylinder', 'steel', start + axis * fraction, (0.025, 0.025, 0.012), axis.to_track_quat('Z', 'Y'), True)
        if action == 'reload':
            tip = Vector((0.13, 0.32, (1.20, 1.88, 1.44, 1.76)[frame]))
            segment('moving ramrod', 'steel', (0.13, 0.31, 1.43), tip, 0.006, True)
        if action == 'fire' and frame == 1:
            part('muzzle flash', 'cone', 'flash', end + axis.normalized() * 0.04, (0.056, 0.056, 0.075), axis.to_track_quat('Z', 'Y'), True)
        pose_receipts.append({'frame': f'{action}-{direction}-{frame}', 'yawRadians': yaw,
                              'poseSha256': hashlib.sha256(json.dumps(transforms).encode()).hexdigest()})

    scene.render.resolution_x = width * args.supersample
    scene.render.resolution_y = height * args.supersample
    scene.render.resolution_percentage = 100
    scene.render.filepath = str(Path(args.raw).resolve())
    print(f'RENDER_READY {args.side}: {len(selected_entries)} independently posed 3D figures; {len(scene.objects)} objects', flush=True)
    bpy.ops.render.render(write_still=True)
    write_json(Path(args.raw).with_suffix('.json'), {
        'blenderVersion': bpy.app.version_string, 'engine': 'Cycles CPU', 'samples': args.samples,
        'seed': 1861, 'supersample': args.supersample, 'cameraElevationDegrees': 35,
        'cellWorldHeight': 3.0, 'objectCount': len(scene.objects), 'poses': pose_receipts,
    })


def inspect(image, preview=False):
    columns = 8 if preview else COLS
    records, hashes = [], {}
    for index, (action, direction, frame) in enumerate(entries(preview)):
        x, y = index % columns * CELL[0], index // columns * CELL[1]
        cell = image.crop((x, y, x + CELL[0], y + CELL[1]))
        alpha = cell.getchannel('A')
        bbox = alpha.point(lambda value: 255 if value > 16 else 0).getbbox()
        if not bbox: raise RuntimeError(f'Blank frame: {action}-{direction}-{frame}')
        if bbox[0] < 2 or bbox[1] < 2 or bbox[2] > CELL[0] - 2 or bbox[3] > CELL[1] - 2:
            raise RuntimeError(f'Clipped frame: {action}-{direction}-{frame}: {bbox}')
        digest = hashlib.sha256(cell.tobytes()).hexdigest()
        hashes.setdefault((action, direction), set()).add(digest)
        records.append({'frame': f'{action}-{direction}-{frame}', 'alphaBounds': list(bbox), 'pixelSha256': digest})
    if not preview:
        for key, values in hashes.items():
            if len(values) < 4: raise RuntimeError(f'Cycle lacks four distinct rendered poses: {key}')
    return records


def main(args):
    from PIL import Image, ImageDraw
    evidence = Path(args.evidence_dir).resolve()
    output = evidence if args.preview else Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    if args.layout_only:
        for side in ('union', 'confederate'): write_json(output / f'{side}-infantry.json', metadata(side))
        print('Layout metadata written; atlas images still require rendering.', flush=True)
        return
    evidence.mkdir(parents=True, exist_ok=True)
    for side in (('union',) if args.preview else ('union', 'confederate')):
        with tempfile.TemporaryDirectory(prefix='cw-infantry-') as temporary:
            raw = Path(temporary) / 'render.png'
            command = [args.blender, '--background', '--factory-startup', '--python', str(Path(__file__).resolve()), '--',
                       '--worker', '--side', side, '--raw', str(raw), '--samples', str(args.samples),
                       '--supersample', str(args.supersample), '--threads', str(args.threads)]
            if args.preview: command.append('--preview')
            subprocess.run(command, check=True)
            size = (1024, 1280) if args.preview else (2048, 1920)
            with Image.open(raw) as source:
                image = source.convert('RGBA').resize(size, Image.Resampling.LANCZOS)
            if args.preview: image.save(output / 'proof-unverified.png', optimize=True)
            records = inspect(image, args.preview)
            filename = 'proof-contact-sheet' if args.preview else f'{side}-infantry'
            image.save(output / f'{filename}.webp', lossless=True, method=6, exact=True)
            receipt = json.loads(raw.with_suffix('.json').read_text())
            receipt.update({'scriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                            'imageSha256': hashlib.sha256((output / f'{filename}.webp').read_bytes()).hexdigest(),
                            'imageBytes': (output / f'{filename}.webp').stat().st_size,
                            'pixelInspection': records})
            write_json(evidence / f'{filename}-receipt.json', receipt)
            if args.preview:
                contact = Image.new('RGB', (1024, 1280), '#353b41')
                contact.paste(image, (0, 0), image)
                draw = ImageDraw.Draw(contact)
                for index, (action, direction, frame) in enumerate(entries(True)):
                    x, y = index % 8 * 128, index // 8 * 160
                    draw.text((x + 3, y + 3), f'{action} {DIRECTIONS[direction]} f{frame}', fill='white')
                    draw.line((x + 60, y + 128, x + 68, y + 128), fill='#77b3a3')
                contact.save(output / 'proof-contact-sheet.png', optimize=True)
            else:
                write_json(output / f'{side}-infantry.json', metadata(side))
            print(f'VERIFIED {output / (filename + ".webp")} ({receipt["imageBytes"]:,} bytes)', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', default=str(DEFAULT_OUTPUT))
    parser.add_argument('--evidence-dir', default='/tmp/civil-war-infantry-evidence')
    parser.add_argument('--blender', default=shutil.which('blender') or '/Applications/Blender.app/Contents/MacOS/Blender')
    parser.add_argument('--preview', action='store_true')
    parser.add_argument('--layout-only', action='store_true')
    parser.add_argument('--worker', action='store_true')
    parser.add_argument('--side', choices=('union', 'confederate'), default='union')
    parser.add_argument('--raw')
    parser.add_argument('--samples', type=int, default=32)
    parser.add_argument('--supersample', type=int, default=2)
    parser.add_argument('--threads', type=int, default=8)
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    args = parser.parse_args(argv)
    if min(args.samples, args.supersample, args.threads) < 1: parser.error('Render settings must be positive')
    if args.worker: render_worker(args)
    else: main(args)
