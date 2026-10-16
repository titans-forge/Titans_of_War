#!/usr/bin/env python3
"""Render native transparent structural guides for one Gettysburg E pilot.

Adapted from the existing v2 mesh/material renderer; the original source and
v3 wrapper remain unchanged. Native Blender renders are the final PNGs: no
raster packing, resizing, drawing, trimming, or postprocessing follows them.
Run Blender --background --factory-startup --python this-file -- --kind march
(or --kind actions). Rendering uses Cycles CPU, 24 samples and eight threads.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'scripts/render-civil-war-infantry-v2.py'
DEFAULT_OUTPUT = ROOT / 'docs/art-pass/candidates/gettysburg-v4'
CELL = (512, 512)
ORIGIN = (192, 440)
COLS = 2
PHASES = [('left-contact', 'walk', 1), ('left-passing', 'walk', 2),
          ('right-contact', 'walk', 3), ('right-passing', 'walk', 0)]
ACTION_POSES = [('ready-upright-carry', 'idle', 0), ('shoulder-aim-fire', 'fire', 0),
                ('upright-load-at-barrel', 'reload', 0), ('upright-ramrod-insertion', 'reload', 1)]


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()



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

    pose_specs = PHASES if args.kind == 'march' else ACTION_POSES
    selected_entries = [(action, 0, frame) for _, action, frame in pose_specs]
    columns = COLS
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
        # Page rows move along the actual horizontal world ground plane, rather
        # than lifting/lowering each root in Z to lay out the image.
        root_position = Vector(((pixel_x - width / 2) / pixels_per_unit,
                                (height / 2 - pixel_y) / pixels_per_unit / math.sin(elevation), 0))
        yaw = -math.pi / 2 - direction * math.pi / 4
        root = Matrix.Translation(root_position) @ Matrix.Rotation(yaw, 4, 'Z')
        phase = frame * math.pi / 2
        moving = action in ('walk', 'route')
        stride = (0.38 if action == 'route' else 0.27) if moving else 0.025
        bob = 0.024 * math.cos(2 * phase) if moving else 0
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
            leg_name = 'left-far' if sign == -1 else 'right-near'
            leg_phase = phase + (math.pi if sign == 1 else 0)
            foot_y = stride * math.sin(leg_phase)
            lift = max(0, math.cos(leg_phase)) * (0.19 if action == 'route' else 0.12) if moving else 0
            foot = (sign * 0.115, foot_y, 0.064 + lift)
            knee = (sign * 0.12, foot_y * 0.55 + (0.085 if moving else 0.025), 0.48 + lift * 0.35)
            hip = (sign * 0.105, 0, hip_z)
            segment('trouser thigh', 'pants', hip, knee, 0.100, tapered=True)
            part('cloth knee', 'sphere', 'pants', knee, (0.080, 0.083, 0.084))
            segment('trouser shin', 'pants', knee, (foot[0], foot[1], foot[2] + 0.12), 0.079, tapered=True)
            part('boot ankle', 'sphere', 'leather', (foot[0], foot[1] - 0.018, foot[2] + 0.075), (0.070, 0.074, 0.112))
            part(f'{leg_name} boot upper', 'sphere', 'leather', (foot[0], foot[1] + 0.042, foot[2]), (0.082, 0.155, 0.060))
            part(f'{leg_name} boot sole', 'box', 'leather', (foot[0], foot[1] + 0.042, foot[2] - 0.047), (0.080, 0.141, 0.017))
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

        # One complete weapon assembly and exact grip points attach to the
        # torso in every march phase. The legs/bob cannot change the grip.
        weapon_length = 1.38
        if action == 'fire':
            gun_start = Vector((0.21, -0.08, 1.46))
            gun_end = gun_start + Vector((0, weapon_length, 0))
            hands = [gun_start.lerp(gun_end, 0.43), gun_start.lerp(gun_end, 0.22)]
            hands = [point + Vector((0, 0, -0.04)) for point in hands]
            elbows = [(-0.08, 0.31, 1.23), (0.36, 0.10, 1.29)]
            weapon_pose = 'right-shoulder aim; stock butt touches upper right shoulder; no discharge baked into source'
        elif action == 'reload':
            gun_start = Vector((0.12, 0.28, 0.04))
            gun_end = gun_start + Vector((0, 0, weapon_length))
            left_hand = gun_start.lerp(gun_end, 0.65)
            right_hand = gun_end + Vector((0, 0, 0.035 if frame == 0 else 0.43))
            hands = [left_hand, right_hand]
            elbows = [(-0.12, 0.17, 1.14), (0.34, 0.15, 1.39 if frame == 0 else 1.63)]
            weapon_pose = 'upright loading: hand at barrel mouth' if frame == 0 else 'upright loading: raised hand drives a separate ramrod along bore'
        else:
            gun_start = Vector((0.16, 0.10, 0.60))
            gun_end = gun_start + Vector((0, 0.31, 0.95)).normalized() * weapon_length
            hands = [gun_start.lerp(gun_end, 0.57), gun_start.lerp(gun_end, 0.38)]
            elbows = [(-0.10, 0.22, 1.16), (0.32, 0.12, 1.18)]
            weapon_pose = 'fixed two-hand diagonal carry: left hand at foreend, right hand at stock'
        for arm, sign in enumerate((-1, 1)):
            part('cloth shoulder', 'sphere', 'coat', (sign * 0.22, 0, 1.43), (0.091, 0.093, 0.093), torso=True)
            segment('upper sleeve', 'coat', (sign * 0.22, 0, 1.43), elbows[arm], 0.084, True, tapered=True)
            part('cloth elbow', 'sphere', 'coat', elbows[arm], (0.069, 0.070, 0.071), torso=True)
            segment('lower sleeve', 'coat', elbows[arm], hands[arm], 0.068, True, tapered=True)
            part(('left hand' if arm == 0 else 'right hand'), 'sphere', 'skin', hands[arm], (0.060, 0.055, 0.069), torso=True)
        start, end = Vector(gun_start), Vector(gun_end)
        axis = end - start
        segment('musket stock', 'wood', start, start + axis * 0.60, 0.036, True)
        segment('musket barrel', 'steel', start + axis * 0.35, end, 0.017, True)
        segment('ramrod', 'steel', start + axis * 0.40 + Vector((0.022, 0, -0.015)), end + Vector((0.022, 0, -0.015)), 0.006, True)
        for fraction in (0.43, 0.65, 0.86):
            part('barrel band', 'cylinder', 'steel', start + axis * fraction, (0.025, 0.025, 0.012), axis.to_track_quat('Z', 'Y'), True)
        # The bayonet is offset from the bore by its socket/shank, and its
        # long taper remains visible in carry, aim and loading poses.
        direction_vector = axis.normalized()
        segment('bayonet socket', 'steel', end - direction_vector * 0.025,
                end + direction_vector * 0.045, 0.025, True)
        blade_start = end + direction_vector * 0.045 + Vector((0.035, 0, 0))
        blade_tip = end + direction_vector * 0.495 + Vector((0.035, 0, 0))
        segment('bayonet shank', 'steel', end + direction_vector * 0.025,
                blade_start, 0.010, True)
        blade_axis = blade_tip - blade_start
        part('socket bayonet blade', 'cone', 'steel', (blade_start + blade_tip) / 2,
             (0.012, 0.009, blade_axis.length / 2), blade_axis.to_track_quat('Z', 'Y'), True)
        if action == 'reload' and frame == 1:
            segment('inserted ramrod', 'steel', end - direction_vector * 0.30,
                    end + direction_vector * 0.55, 0.007, True)
        pose_receipts.append({'frame': f'{action}-{direction}-{frame}', 'yawRadians': yaw,
                              'poseSha256': hashlib.sha256(json.dumps(transforms).encode()).hexdigest(),
                              'bodyBobWorldZ': bob, 'rootWorld': list(root_position),
                              'weaponPose': weapon_pose,
                              'weaponStartBodyLocal': list(start), 'weaponEndBodyLocal': list(end),
                              'handAttachmentBodyLocal': [list(Vector(point)) for point in hands],
                              'bayonetTipBodyLocal': list(blade_tip), 'bayonetBladeLength': blade_axis.length})

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
        'sourceEntries': selected_entries, 'phaseOrder': [label for label, _, _ in pose_specs],
    })


def measure_native_render(args, source_hash, script_hash):
    """Read native Blender pixels/mesh vertices; write a JSON receipt only."""
    import bpy
    from mathutils import Vector

    output = Path(args.raw)
    receipt_path = output.with_suffix('.json')
    receipt = json.loads(receipt_path.read_text())
    rendered = bpy.data.images.load(str(output), check_existing=False)
    width, height = rendered.size
    if (width, height) != (1024, 1024):
        raise RuntimeError('Expected an unchanged native 1024x1024 2x2 render')
    pixels = rendered.pixels[:]
    scene = bpy.context.scene
    camera_inverse = scene.camera.matrix_world.inverted()
    pixels_per_unit = max(width, height) / scene.camera.data.ortho_scale
    specs = PHASES if args.kind == 'march' else ACTION_POSES

    def project(point, column, row):
        point = camera_inverse @ point
        return {'x': round(width / 2 + point.x * pixels_per_unit - column * CELL[0], 3),
                'y': round(height / 2 - point.y * pixels_per_unit - row * CELL[1], 3)}

    def mesh_record(obj, column, row):
        world_vertices = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
        projected = [project(point, column, row) for point in world_vertices]
        return {
            'center': project(obj.matrix_world.translation, column, row),
            'projectedBounds': [min(point['x'] for point in projected), min(point['y'] for point in projected),
                                max(point['x'] for point in projected), max(point['y'] for point in projected)],
            'worldMinimumZ': round(min(point.z for point in world_vertices), 8),
            'worldMaximumZ': round(max(point.z for point in world_vertices), 8),
        }

    records = []
    for index, (phase, action, frame) in enumerate(specs):
        column, row = index % COLS, index // COLS
        alpha_points = [(x, y) for y in range(CELL[1]) for x in range(CELL[0])
                        if pixels[((height - 1 - (row * CELL[1] + y)) * width + column * CELL[0] + x) * 4 + 3] > 16 / 255]
        if not alpha_points:
            raise RuntimeError(f'Blank native pose: {phase}')
        bounds = [min(x for x, _ in alpha_points), min(y for _, y in alpha_points),
                  max(x for x, _ in alpha_points) + 1, max(y for _, y in alpha_points) + 1]
        padding = {'left': bounds[0], 'top': bounds[1], 'right': CELL[0] - bounds[2], 'bottom': CELL[1] - bounds[3]}
        if min(padding.values()) < 12:
            raise RuntimeError(f'Weapon/body needs more native padding: {phase}: {padding}')
        prefix = f'{action}-0-{frame}'
        soles = {name: mesh_record(scene.objects[f'{prefix}:{name} boot sole'], column, row)
                 for name in ['left-far', 'right-near']}
        supports = [name for name, value in soles.items() if abs(value['worldMinimumZ']) < 1e-7]
        if not supports:
            raise RuntimeError(f'No planted sole at actual world ground Z=0: {phase}')
        pose = receipt['poses'][index]
        root_projection = project(Vector(pose['rootWorld']), column, row)
        if max(abs(root_projection[axis] - ORIGIN[offset]) for offset, axis in enumerate(['x', 'y'])) > 0.01:
            raise RuntimeError(f'Projected root differs from the common cell reference: {phase}')
        record = {
            'phase': phase, 'sourceEntry': [action, 0, frame], 'sourceFrame': prefix,
            'cell': {'x': column * CELL[0], 'y': row * CELL[1], 'w': CELL[0], 'h': CELL[1]},
            'alphaBoundsThreshold': 16, 'alphaBounds': bounds, 'paddingPixels': padding,
            'rootProjected': root_projection, 'rootWorld': pose['rootWorld'], 'worldGroundZ': 0,
            'cap': mesh_record(scene.objects[f'{prefix}:kepi crown'], column, row),
            'soles': soles, 'plantedSupportLegs': supports,
            'leftHand': mesh_record(scene.objects[f'{prefix}:left hand'], column, row),
            'rightHand': mesh_record(scene.objects[f'{prefix}:right hand'], column, row),
            'bayonet': mesh_record(scene.objects[f'{prefix}:socket bayonet blade'], column, row),
            'weaponPose': pose['weaponPose'], 'weaponStartBodyLocal': pose['weaponStartBodyLocal'],
            'weaponEndBodyLocal': pose['weaponEndBodyLocal'], 'handAttachmentBodyLocal': pose['handAttachmentBodyLocal'],
            'bodyBobWorldZ': pose['bodyBobWorldZ'],
        }
        if action == 'reload' and frame == 1:
            record['insertedRamrod'] = mesh_record(scene.objects[f'{prefix}:inserted ramrod'], column, row)
        records.append(record)
    if args.kind == 'march':
        for name in ['weaponStartBodyLocal', 'weaponEndBodyLocal', 'handAttachmentBodyLocal']:
            if any(record[name] != records[0][name] for record in records[1:]):
                raise RuntimeError(f'Marching attachment changed between phases: {name}')
    if any('muzzle flash' in obj.name for obj in scene.objects):
        raise RuntimeError('No baked muzzle discharge belongs in these structural guides')
    if sha256(SOURCE) != source_hash or sha256(Path(__file__)) != script_hash:
        raise RuntimeError('Source or adapted renderer changed during rendering')
    receipt.update({
        'purpose': 'Structural guide only; awaiting visual review; not approved game artwork or an entire infantry family',
        'sourceScript': str(SOURCE.relative_to(ROOT)), 'sourceScriptSha256': source_hash,
        'adaptedScript': str(Path(__file__).resolve().relative_to(ROOT)), 'adaptedScriptSha256': script_hash,
        'image': str(output.relative_to(ROOT)), 'imageSha256': sha256(output), 'imageBytes': output.stat().st_size,
        'side': 'union', 'direction': 'E', 'guideKind': args.kind,
        'size': {'w': width, 'h': height}, 'cell': {'w': CELL[0], 'h': CELL[1]}, 'columns': COLS, 'rows': 2,
        'rootPixels': {'x': ORIGIN[0], 'y': ORIGIN[1]}, 'pixelsPerWorldUnit': pixels_per_unit,
        'camera': {'elevationDegrees': 35, 'orthographicScale': scene.camera.data.ortho_scale,
                   'location': list(scene.camera.location), 'rotationEuler': list(scene.camera.rotation_euler)},
        'nativeAlpha': rendered.channels == 4 and scene.render.film_transparent,
        'rasterPostprocessing': False, 'threads': args.threads,
        'bayonetExtensionWorldUnits': 0.495, 'bayonetBladeLengthWorldUnits': 0.45, 'musketBodyLengthWorldUnits': 1.38,
        'representativeArmsReference': 'https://www.nps.gov/articles/000/civil-war-weapons-in-the-shenandoah-valley.htm',
        'historicalScope': 'Representative three-band percussion muzzleloading musket with walnut-colored stock and steel socket bayonet; not a verified full loading drill or a claim about every Gettysburg regiment',
        'geometry': records, 'noBakedDischarge': True,
        'capCenterDriftPixels': {
            axis: round(max(record['cap']['center'][axis] for record in records) - min(record['cap']['center'][axis] for record in records), 3)
            for axis in ['x', 'y']
        },
        'review': {'status': 'awaiting read-only native image inspection', 'productionApproved': False,
                   'familyApproved': False, 'anatomicalValidation': False},
    })
    write_json(receipt_path, receipt)
    print(json.dumps({'image': str(output), 'receipt': str(receipt_path), 'size': receipt['size'],
                      'padding': [record['paddingPixels'] for record in records],
                      'capDrift': receipt['capCenterDriftPixels'], 'sha256': receipt['imageSha256']}), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--kind', choices=['march', 'actions'], required=True)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--samples', type=int, default=24)
    parser.add_argument('--threads', type=int, default=8)
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    args = parser.parse_args(argv)
    if args.samples != 24 or args.threads != 8:
        parser.error('This bounded guide uses exactly 24 samples and eight CPU threads')
    output = args.output or DEFAULT_OUTPUT / f'union-e-{args.kind}-guide.png'
    output = output.resolve()
    if not output.is_relative_to(DEFAULT_OUTPUT.resolve()):
        parser.error('Guide output must remain inside the Gettysburg v4 candidate directory')
    output.parent.mkdir(parents=True, exist_ok=True)
    args.raw, args.side, args.supersample = str(output), 'union', 1
    source_hash, script_hash = sha256(SOURCE), sha256(Path(__file__))
    render_worker(args)
    measure_native_render(args, source_hash, script_hash)


if __name__ == '__main__':
    main()
