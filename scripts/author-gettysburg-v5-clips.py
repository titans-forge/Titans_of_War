#!/usr/bin/env python3
"""Bind native, reviewed Gettysburg sources to complete action clips.

Read-only Pillow measurements; byte-for-byte PNG exports. No raster editing,
alpha cleanup, resampling, trimming or phase-dependent body normalization.
"""
import argparse
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = 'gettysburg-v5'
ANNOTATIONS = ROOT / f'docs/art-pass/manifests/{DIRECTORY}-source-annotations.json'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def author(spec, directory=DIRECTORY):
    source = (ROOT / spec['source']).resolve()
    if not source.is_relative_to(ROOT / f'docs/art-pass/candidates/{directory}'):
        raise ValueError('Source must belong to this versioned candidate directory')
    if digest(source) != spec['sha256']:
        raise ValueError('Source changed; obtain new visual review and annotations')
    cell = spec['cell']
    asset = ROOT / f'public/images/units/{directory}/{spec["side"]}-{spec["identity"]}-{spec["name"]}.png'
    atlas_path = asset.with_suffix('.json')
    review_path = ROOT / f'docs/art-pass/reviews/{directory}-{spec.get("measurementName", spec["name"])}-measurement.json'
    with Image.open(source) as image:
        if image.mode != 'RGBA' or image.size != (cell * 2, cell * 2):
            raise ValueError('Expected reviewed native square RGBA source with four equal cells')
        cells = []
        for index in range(4):
            box = (index % 2 * cell, index // 2 * cell, (index % 2 + 1) * cell, (index // 2 + 1) * cell)
            pixels = list(image.crop(box).getdata())
            measures = {}
            for threshold in (1, 8, 64, 128, 240):
                positions = [i for i, rgba in enumerate(pixels) if rgba[3] >= threshold]
                if not positions:
                    raise ValueError(f'Empty source cell {index}')
                xs, ys = [i % cell for i in positions], [i // cell for i in positions]
                bounds = [min(xs), min(ys), max(xs) + 1, max(ys) + 1]
                measures[str(threshold)] = {'pixels': len(positions), 'bounds': bounds,
                    'padding': [bounds[0], bounds[1], cell - bounds[2], cell - bounds[3]]}
            if min(measures['64']['padding']) < 16:
                raise ValueError(f'Insufficient solid cell padding: {spec["name"]} {index}')
            # A diagnostic for conspicuous blue RGB, not a universal fringe detector.
            blue = [(r, g, b, a) for r, g, b, a in pixels
                    if r < 80 and g < 100 and b >= 140 and b >= r + 90 and b >= 1.8 * g + 30]
            cells.append({'index': index, 'alpha': measures,
                'diagnosticBluePixels': {str(t): sum(a >= t for _, _, _, a in blue) for t in (1, 8, 64, 128)},
                'rootPixels': spec['roots'][index], 'capTopY': spec['capTop'][index],
                'bodySpanDiagnostic': spec['bodySpans'][index]})
    key = spec.get('key', f'{spec["side"]}-{directory}-{spec["name"]}')
    frames, clips = {}, []
    used = []
    for action, indexes in spec['actions']:
        used.extend(indexes)
        names = [f'{spec["identity"]}-{action}-{spec["direction"]}-{phase}' for phase in range(len(indexes))]
        pivots = [{'x': round(spec['roots'][i][0] / cell, 6), 'y': round(spec['roots'][i][1] / cell, 6)} for i in indexes]
        for phase, index in enumerate(indexes):
            frames[names[phase]] = {
                'frame': {'x': index % 2 * cell, 'y': index // 2 * cell, 'w': cell, 'h': cell},
                'rotated': False, 'trimmed': False,
                'spriteSourceSize': {'x': 0, 'y': 0, 'w': cell, 'h': cell},
                'sourceSize': {'w': cell, 'h': cell}, 'pivot': pivots[phase],
                'bodyHeight': spec['referenceHeight'],
            }
        clip = {'side': spec['side'], 'identity': spec['identity'], 'direction': spec['direction'],
            'action': action, 'key': key, 'frames': names, 'sourceHash': spec['sha256'],
            'referenceHeight': spec['referenceHeight'], 'pivots': pivots,
            'approval': {'reviewed': True, 'rejected': False},
            'scope': spec.get('scope', 'opt-in Union A E actions / reviewed SE march only')}
        if action == 'fire':
            clip['muzzles'] = [{'x': round(spec['muzzle'][0] / cell, 6), 'y': round(spec['muzzle'][1] / cell, 6)}]
        clips.append(clip)
    if sorted(used) != [0, 1, 2, 3]:
        raise ValueError('Every native cell must belong to exactly one complete action')
    review = {
        'source': spec['source'], 'sourceHash': spec['sha256'], 'publicPNG': str(asset.relative_to(ROOT)),
        'atlas': str(atlas_path.relative_to(ROOT)), 'nativeSize': {'w': cell * 2, 'h': cell * 2},
        'nativeMode': 'RGBA', 'pixelTreatment': 'none; byte-for-byte native PNG copy, full equal cells',
        'annotationMethod': spec['annotationMethod'], 'referenceHeight': spec['referenceHeight'],
        'scaleMethod': 'One uniform body reference for the entire source; no action or phase size correction.',
        'solidPaddingVerified': True, 'nonzeroAlphaPaddingVerified': all(min(c['alpha']['1']['padding']) >= 16 for c in cells),
        'cells': cells, 'clips': clips, 'limitations': spec['limitations'],
        'productionApproved': False, 'familyApproved': False,
    }
    atlas = {'frames': frames, 'meta': {
        'image': asset.name, 'size': review['nativeSize'], 'sha256': spec['sha256'],
        'source': spec['source'], 'artPass': directory, 'candidate': True, 'productionApproved': False,
        'pixelTreatment': review['pixelTreatment'], 'clips': clips,
        'measurementReview': str(review_path.relative_to(ROOT)),
    }}
    return source, asset, atlas_path, review_path, atlas, review


def run(config, check=False, directory=DIRECTORY):
    if config['artPass'] != directory or config['productionApproved'] is not False:
        raise ValueError('Unexpected source annotation scope')
    for spec in config['sources']:
        source, asset, atlas_path, review_path, atlas, review = author(spec, directory)
        if check:
            if digest(asset) != spec['sha256']:
                raise ValueError('Public PNG differs from native source')
            for path, expected in [(atlas_path, atlas), (review_path, review)]:
                if json.loads(path.read_text()) != expected:
                    raise ValueError(f'Metadata differs: {path}')
        else:
            asset.parent.mkdir(parents=True, exist_ok=True)
            review_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, asset)
            if digest(asset) != spec['sha256']:
                raise ValueError('PNG copy failed')
            for path, data in [(atlas_path, atlas), (review_path, review)]:
                path.write_text(json.dumps(data, indent=2) + '\n')
        print(json.dumps({'verified': True, 'sourceHash': spec['sha256'], 'name': spec['name'],
            'clips': [clip['action'] for clip in atlas['meta']['clips']], 'productionApproved': False}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    run(json.loads(ANNOTATIONS.read_text()), args.check)


if __name__ == '__main__':
    main()
