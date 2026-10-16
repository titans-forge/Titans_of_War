#!/usr/bin/env python3
"""Author hash-bound native clip metadata; never edit raster pixels.

Pillow measures alpha read-only. PNG exports are byte-for-byte copies. The
manual ground/pelvis annotations describe source registration, not recovered
anatomy. Separate sources use measured standing-height scale references.
"""
import argparse
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = 'gettysburg-v4'
CELL = 627
SOURCES = (
    {
        'name': 'march', 'sha256': '43b8f4394b6071958b693d83c14eb7f324e277706bd5513d23b536467e9f6a42',
        'roots': [(310, 565), (310, 565), (307, 550), (316, 550)],
        'capTop': [153, 158, 137, 138], 'referenceHeight': 412,
        'actions': [('march', [0, 1, 2, 3])],
    },
    {
        'name': 'actions', 'sha256': '3e0ef9a0a0de5be7a5f10e16a703a611441088d5c39e081a0e11d7d436ad5c4a',
        'roots': [(224, 590), (138, 590), (222, 570), (228, 570)],
        'capTop': [164, 178, 122, 125], 'referenceHeight': 426,
        'actions': [('ready', [0]), ('fire', [1]), ('reload', [2, 3])],
        'actionReferences': {'reload': 447},
        'muzzle': {'x': round(467 / CELL, 6), 'y': round(243 / CELL, 6)},
    },
)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def author(spec):
    name = spec['name']
    source = ROOT / f'docs/art-pass/candidates/{DIRECTORY}/union-e-{name}-candidate.png'
    asset = ROOT / f'public/images/units/{DIRECTORY}/union-a-{name}-e.png'
    atlas_path = asset.with_suffix('.json')
    review_path = ROOT / f'docs/art-pass/reviews/{DIRECTORY}-{name}-measurement.json'
    if digest(source) != spec['sha256']:
        raise ValueError('Source changed: annotations require fresh visual review')
    with Image.open(source) as image:
        if image.mode != 'RGBA' or image.size != (CELL * 2, CELL * 2):
            raise ValueError('Expected reviewed native 1254 square RGBA source')
        alpha = image.getchannel('A')
        cells = []
        for index in range(4):
            rectangle = (index % 2 * CELL, index // 2 * CELL, (index % 2 + 1) * CELL, (index // 2 + 1) * CELL)
            values = list(alpha.crop(rectangle).getdata())
            measures = {}
            for threshold in (1, 8, 64, 128, 240):
                pixels = [i for i, value in enumerate(values) if value >= threshold]
                xs, ys = [i % CELL for i in pixels], [i // CELL for i in pixels]
                measures[str(threshold)] = {'pixels': len(pixels), 'bounds': [min(xs), min(ys), max(xs) + 1, max(ys) + 1]}
            solid = measures['64']['bounds']
            padding = [solid[0], solid[1], CELL - solid[2], CELL - solid[3]]
            if min(padding) < 16:
                raise ValueError(f'Insufficient solid padding: {name} {index}')
            cells.append({'index': index, 'alpha': measures, 'solidPadding': padding,
                          'rootPixels': list(spec['roots'][index]), 'capTopY': spec['capTop'][index]})
    key = f'union-{DIRECTORY}-{name}-e'
    frames, clips = {}, []
    for action, indexes in spec['actions']:
        reference = spec.get('actionReferences', {}).get(action, spec['referenceHeight'])
        pivots = [{'x': round(spec['roots'][i][0] / CELL, 6), 'y': round(spec['roots'][i][1] / CELL, 6)} for i in indexes]
        names = [f'a-{action}-0-{phase}' for phase in range(len(indexes))]
        for phase, index in enumerate(indexes):
            frames[names[phase]] = {
                'frame': {'x': index % 2 * CELL, 'y': index // 2 * CELL, 'w': CELL, 'h': CELL},
                'rotated': False, 'trimmed': False,
                'spriteSourceSize': {'x': 0, 'y': 0, 'w': CELL, 'h': CELL},
                'sourceSize': {'w': CELL, 'h': CELL}, 'pivot': pivots[phase], 'bodyHeight': reference,
            }
        clip = {'side': 'union', 'identity': 'a', 'direction': 0, 'action': action, 'key': key,
                'frames': names, 'sourceHash': spec['sha256'], 'referenceHeight': reference, 'pivots': pivots,
                'approval': {'reviewed': True, 'rejected': False}, 'scope': 'opt-in E action-family preview only'}
        if action == 'fire':
            clip['muzzles'] = [spec['muzzle']]
        clips.append(clip)
    review = {
        'source': str(source.relative_to(ROOT)), 'sourceHash': spec['sha256'],
        'publicPNG': str(asset.relative_to(ROOT)), 'atlas': str(atlas_path.relative_to(ROOT)),
        'nativeSize': {'w': CELL * 2, 'h': CELL * 2}, 'nativeMode': 'RGBA',
        'pixelTreatment': 'none; equal full native cells, byte-for-byte PNG copy',
        'annotationMethod': 'manual torso/pelvis center X and row-shared ground Y, approximately +/-5 source px; never per-phase lowest-boot roots',
        'scaleMethod': 'one standing-height reference per source/action calibration; march 412, stationary ready/fire 426, reload 447 native px',
        'registrationLimits': 'imagegen did not preserve exact guide placement or native body scale; row registration and measured uniform scaling correct layout, not anatomy or equipment drift',
        'cells': cells, 'clips': clips,
        'review': {
            'scope': 'opt-in Union A E-only ready/march/fire/two-state reload',
            'productionApproved': False, 'familyApproved': False,
            'anatomicalValidation': False, 'solidPaddingVerified': True, 'nonzeroAlphaPaddingVerified': False,
            'risks': [
                'Colored edge fringes and alpha 1..7 ghost pixels remain in original native source.',
                'Two row placements and separate action scales require manual registration; no skeletal or exact identity certification.',
                'Loading states simplify percussion muzzleloading; ramrod and fixed bayonet partly coalesce near the hand/muzzle.',
                'Weapon is representative period imagery, not certified exact Model 1861 or regiment-specific armament.',
                'Firing is one held pose; reload is two stepped states, not a smooth or complete drill.',
                'Other directions, Confederate soldiers, second identity, melee, casualty and actual standard bearers remain accepted-art fallback.',
            ],
        },
    }
    atlas = {'frames': frames, 'meta': {
        'image': asset.name, 'size': review['nativeSize'], 'sha256': spec['sha256'],
        'source': review['source'], 'artPass': DIRECTORY, 'candidate': True, 'productionApproved': False,
        'pixelTreatment': review['pixelTreatment'], 'clips': clips, 'measurementReview': str(review_path.relative_to(ROOT)),
    }}
    return source, asset, atlas_path, review_path, atlas, review

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    for spec in SOURCES:
        source, asset, atlas_path, review_path, atlas, review = author(spec)
        if args.check:
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

if __name__ == '__main__':
    main()
