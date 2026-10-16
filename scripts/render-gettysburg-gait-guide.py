#!/usr/bin/env python3
"""Render one native-alpha E gait strip for structural reference, not game art.

Run with Blender --background --factory-startup --python this-file.
The existing infantry renderer is imported unchanged. No raster packing,
resizing, drawing, or postprocessing occurs in this wrapper.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
from types import SimpleNamespace


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'scripts/render-civil-war-infantry-v2.py'
DEFAULT_OUTPUT = ROOT / 'docs/art-pass/candidates/gettysburg-v3/union-e-rig-guide.png'
PHASES = [('left-contact', 1), ('near-passing', 2), ('right-contact', 3), ('far-passing', 0)]
CELL = (384, 512)
ORIGIN = (192, 440)


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def render(output):
    import bpy

    source_hash = sha256(SOURCE)
    wrapper_hash = sha256(Path(__file__))
    spec = importlib.util.spec_from_file_location('gettysburg_guide_source', SOURCE)
    renderer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(renderer)
    renderer.CELL, renderer.ORIGIN, renderer.COLS = CELL, ORIGIN, 4
    renderer.entries = lambda preview=False: [('walk', 0, frame) for _, frame in PHASES]
    output.parent.mkdir(parents=True, exist_ok=True)
    settings = SimpleNamespace(side='union', preview=False, raw=str(output), samples=16, supersample=1, threads=8)
    renderer.render_worker(settings)
    receipt_path = output.with_suffix('.json')
    receipt = json.loads(receipt_path.read_text())
    rendered = bpy.data.images.load(str(output), check_existing=False)
    width, height = rendered.size
    pixels = rendered.pixels[:]
    records = []
    scene = bpy.context.scene
    camera_inverse = scene.camera.matrix_world.inverted()
    pixels_per_unit = max(width, height) / scene.camera.data.ortho_scale

    def projected_center(obj, column):
        point = camera_inverse @ obj.matrix_world.translation
        return {'x': round(width / 2 + point.x * pixels_per_unit - column * CELL[0], 3),
                'y': round(height / 2 - point.y * pixels_per_unit, 3)}

    for column, (phase, frame) in enumerate(PHASES):
        points = [(x, y) for y in range(CELL[1]) for x in range(CELL[0])
                  if pixels[((height - 1 - y) * width + column * CELL[0] + x) * 4 + 3] > 16 / 255]
        if not points:
            raise RuntimeError(f'Blank native render phase: {phase}')
        bounds = [min(x for x, _ in points), min(y for _, y in points),
                  max(x for x, _ in points) + 1, max(y for _, y in points) + 1]
        padding = {'left': bounds[0], 'top': bounds[1], 'right': CELL[0] - bounds[2], 'bottom': CELL[1] - bounds[3]}
        if min(padding.values()) < 12:
            raise RuntimeError(f'Guide needs more native camera/cell padding: {phase}: {padding}')
        prefix = f'walk-0-{frame}'
        soles = sorted((obj for obj in scene.objects if obj.name.startswith(prefix + ':boot sole')), key=lambda obj: obj.name)
        if len(soles) != 2:
            raise RuntimeError(f'Expected two boot soles: {phase}')
        records.append({
            'phase': phase, 'sourceFrame': prefix, 'cell': {'x': column * CELL[0], 'y': 0, 'w': CELL[0], 'h': CELL[1]},
            'alphaBounds': bounds, 'paddingPixels': padding,
            'capCenter': projected_center(scene.objects[prefix + ':kepi crown'], column),
            'leftFarSoleCenter': projected_center(soles[0], column),
            'rightNearSoleCenter': projected_center(soles[1], column),
        })
    if sha256(SOURCE) != source_hash or sha256(Path(__file__)) != wrapper_hash:
        raise RuntimeError('Renderer or wrapper changed during the native render')
    receipt.update({
        'purpose': 'Structural gait reference only; not proposed default artwork or anatomically validated motion',
        'side': 'union', 'direction': 'E', 'phaseOrder': [phase for phase, _ in PHASES],
        'sourceEntries': [['walk', 0, frame] for _, frame in PHASES],
        'sourceScript': str(SOURCE.relative_to(ROOT)), 'sourceScriptSha256': source_hash,
        'wrapperScript': str(Path(__file__).resolve().relative_to(ROOT)), 'wrapperScriptSha256': wrapper_hash,
        'image': str(output.relative_to(ROOT)) if output.is_relative_to(ROOT) else str(output),
        'imageSha256': sha256(output), 'imageBytes': output.stat().st_size,
        'size': {'w': width, 'h': height}, 'cell': {'w': CELL[0], 'h': CELL[1]},
        'groundOriginPixels': {'x': ORIGIN[0], 'y': ORIGIN[1]},
        'nativeAlpha': rendered.channels == 4 and scene.render.film_transparent,
        'rasterPostprocessing': False, 'supersample': 1, 'threads': 8,
        'geometry': records,
        'capCenterDriftPixels': {
            axis: round(max(record['capCenter'][axis] for record in records) - min(record['capCenter'][axis] for record in records), 3)
            for axis in ['x', 'y']
        },
        'review': 'Awaiting visual review; alpha bounds and projected mesh centers are geometry evidence only',
    })
    receipt_path.write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps({'image': str(output), 'receipt': str(receipt_path), 'size': receipt['size'],
                      'padding': [record['paddingPixels'] for record in records], 'capDrift': receipt['capCenterDriftPixels']}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    render(parser.parse_args(argv).output.resolve())
