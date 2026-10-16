#!/usr/bin/env python3
"""Register reviewed native contact/fall cells without changing source pixels."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import shutil
import statistics
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
VERSION = 'gettysburg-v20'
CONFIG = ROOT / f'docs/art-pass/manifests/{VERSION}-source-annotations.json'
REVIEW = f'docs/art-pass/reviews/{VERSION}-independent-contact-casualty-source-review.json'
ROLES = {'contact': ('melee', 'nativeContactSequence'), 'casualty': ('fall', 'nativeCasualtySequence')}
FLAGS = ('productionApproved', 'defaultApproved', 'humanCertified', 'physicalAnatomyCertified', 'historicalDrillCertified')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def bounded_file(relative):
    p = Path(relative)
    if p.is_absolute() or '..' in p.parts:
        raise ValueError('Source path must remain inside the candidate')
    out = ROOT / p
    if any(v.is_symlink() for v in (out, *out.parents) if v != ROOT.parent):
        raise ValueError('Source/review cannot use symlink redirection')
    return out


def finite(v):
    return type(v) in (int, float) and math.isfinite(v)


def bounds(roi, cell):
    if (not isinstance(roi, list) or len(roi) != 4 or any(type(v) is not int for v in roi)
            or not 0 <= roi[0] < roi[2] <= cell or not 0 <= roi[1] < roi[3] <= cell):
        raise ValueError('Each independently selected ROI must be bounded in its native cell')


def region_extrema(alpha, roi, cell):
    bounds(roi, cell)
    box = alpha.crop(tuple(roi)).point(lambda a: 255 if a >= 64 else 0).getbbox()
    if box is None:
        raise ValueError('Reviewed ground/cap ROI contains no alpha>=64 source pixels')
    return roi[1] + box[1], roi[1] + box[3]


def inspect(config):
    from PIL import Image
    if (config.get('artPass') != VERSION or config.get('familyComplete') is not False
            or any(config.get(f) is not False for f in FLAGS)):
        raise ValueError('Only explicitly unapproved v20 opt-in art is accepted')
    if config.get('sourceReview') != REVIEW:
        raise ValueError('Exact independent source review is required')
    review_path = bounded_file(REVIEW)
    if config.get('sourceReviewSHA256') != sha(review_path):
        raise ValueError('Independent review bytes changed')
    review = json.loads(review_path.read_text())
    if (review.get('acceptedForOptIn') is not True or review.get('independentReview') is not True
            or review.get('modelAssisted') is not True or any(review.get(f) is not False for f in FLAGS)):
        raise ValueError('Explicit independent source-only opt-in acceptance is required')
    if not isinstance(review.get('reviewer'), str) or not review['reviewer'].strip():
        raise ValueError('Reviewer identity is required')
    if review.get('reviewerModel') != 'gpt-6-astra' or review.get('reasoningEffort') != 'max':
        raise ValueError('The requested independent Astra Max source review is required')
    sources = config.get('sources')
    if not isinstance(sources, list) or len(sources) != 2 or {s.get('role') for s in sources} != set(ROLES):
        raise ValueError('Exactly one contact and one casualty source are required')
    reviewed_sources = review.get('sources')
    if (not isinstance(reviewed_sources, list) or len(reviewed_sources) != 2
            or {(s.get('source'), s.get('sha256')) for s in reviewed_sources}
            != {(s.get('source'), s.get('sha256')) for s in sources}):
        raise ValueError('Every source must match the exact independent visual review')
    height = config.get('referenceHeight')
    if not finite(height) or height <= 0:
        raise ValueError('Common source-wide contact reference is required')
    results = []
    for s in sources:
        role = s['role']; expected = f'docs/art-pass/candidates/{VERSION}/confederate-a-{role}-e-candidate.png'
        if s.get('source') != expected or s.get('referenceHeight') != height:
            raise ValueError('Exact source path and shared scale are required')
        path = bounded_file(expected)
        if s.get('sha256') != sha(path):
            raise ValueError('Reviewed native source changed')
        reviewed = next(v for v in reviewed_sources if v['source'] == expected).get('measurements', {})
        keys = ('cell', 'roots', 'groundROIs', 'groundMethods', 'referenceHeight')
        if role == 'contact':
            keys += ('capROIs', 'capTop', 'bodySpans', 'referenceSoleROIs', 'referenceSoleGroundY')
        if any(s.get(key) != reviewed.get(key) for key in keys):
            raise ValueError('Registration differs from the independently reviewed native measurements')
        cell = s.get('cell')
        if type(cell) is not int or not 64 <= cell <= 2048 or height >= cell:
            raise ValueError('Native equal-cell dimensions must be bounded')
        roots, rois, methods = s.get('roots'), s.get('groundROIs'), s.get('groundMethods')
        if any(not isinstance(v, list) or len(v) != 4 for v in (roots, rois, methods)):
            raise ValueError('Four independently registered grounds are required')
        with Image.open(path) as image:
            if image.mode != 'RGBA' or image.format != 'PNG' or image.size != (cell * 2, cell * 2):
                raise ValueError('Expected complete native square RGBA 2x2 PNG')
            if getattr(image, 'is_animated', False):
                raise ValueError('The source must be one static native sheet')
            cells = []
            for i in range(4):
                raster = image.crop((i % 2 * cell, i // 2 * cell, (i % 2 + 1) * cell, (i // 2 + 1) * cell))
                alpha = raster.getchannel('A')
                box = alpha.point(lambda a: 255 if a >= 64 else 0).getbbox()
                if box is None or min(box[0], box[1], cell-box[2], cell-box[3]) < 16:
                    raise ValueError('Solid source silhouette crosses its reviewed cell margin')
                root = roots[i]
                if (not isinstance(root, list) or len(root) != 2
                        or any(not finite(v) or not 0 <= v < cell for v in root)
                        or not isinstance(methods[i], str) or not methods[i].strip()):
                    raise ValueError('Native pivot and support interpretation are required')
                _, ground = region_extrema(alpha, rois[i], cell)
                if ground != root[1]:
                    raise ValueError('Native ground ROI does not reproduce the reviewed pivot')
                record = {'cell': i, 'rgbaSHA256': hashlib.sha256(raster.tobytes()).hexdigest(),
                          'ground': root, 'groundROI': rois[i], 'groundMethod': methods[i],
                          'solidBounds': list(box), 'solidPadding': [box[0], box[1], cell-box[2], cell-box[3]],
                          'nonzeroBounds': list(alpha.getbbox())}
                if role == 'contact':
                    caps = s.get('capROIs'); soles = s.get('referenceSoleROIs')
                    if any(not isinstance(v, list) or len(v) != 4 for v in
                           (caps, soles, s.get('capTop'), s.get('referenceSoleGroundY'), s.get('bodySpans'))):
                        raise ValueError('Contact reference needs four fresh cap/sole ROIs')
                    cap, _ = region_extrema(alpha, caps[i], cell)
                    _, sole = region_extrema(alpha, soles[i], cell)
                    if (s.get('capTop', [])[i] != cap or s.get('referenceSoleGroundY', [])[i] != sole
                            or s.get('bodySpans', [])[i] != sole-cap or sole <= cap):
                        raise ValueError('Contact cap/sole reference measurements changed')
                    record.update({'capTop': cap, 'referenceSoleGroundY': sole, 'bodySpan': sole-cap})
                cells.append(record)
            if len({c['rgbaSHA256'] for c in cells}) != 4:
                raise ValueError('Authored action phases cannot duplicate native cell pixels')
        results.append((s, cells))
    contact = next(cells for s, cells in results if s['role'] == 'contact')
    if height != math.floor(statistics.median(c['bodySpan'] for c in contact) + .5):
        raise ValueError('One shared scale must use the independently measured contact median')
    return results


def exports(config):
    outputs = {}
    for source, cells in inspect(config):
        role = source['role']; action, marker = ROLES[role]; cell = source['cell']
        basename = f'confederate-a-{role}-e'
        png = f'public/images/units/{VERSION}/{basename}.png'
        names = [f'a-{action}-0-{i}' for i in range(4)]
        pivots = [{'x': round(x/cell, 6), 'y': round(y/cell, 6)} for x,y in source['roots']]
        clip = {'side': 'confederate', 'identity': 'a', 'direction': 0, 'action': action,
                'key': f'confederate-gettysburg-v20-a-{role}-e', 'frames': names,
                'pivots': pivots, 'referenceHeight': config['referenceHeight'], 'sourceHash': source['sha256'],
                'approval': {'reviewed': True, 'rejected': False}, marker: f'gettysburg-v20-confederate-a-e-{role}',
                'scope': 'Exact source-reviewed Confederate A E local opt-in only; incomplete family'}
        frames = {name: {'frame': {'x': i%2*cell, 'y': i//2*cell, 'w': cell, 'h': cell},
                         'rotated': False, 'trimmed': False, 'sourceSize': {'w': cell, 'h': cell},
                         'spriteSourceSize': {'x': 0, 'y': 0, 'w': cell, 'h': cell},
                         'pivot': pivots[i], 'bodyHeight': config['referenceHeight']} for i,name in enumerate(names)}
        atlas = {'frames': frames, 'meta': {'image': basename+'.png', 'size': {'w': cell*2, 'h': cell*2},
                 'sha256': source['sha256'], 'source': source['source'], 'artPass': VERSION, 'candidate': True,
                 'clips': [clip], 'sourceReview': REVIEW, 'sourceReviewSHA256': config['sourceReviewSHA256'],
                 'familyApproved': False, 'completeFamilyApproved': False,
                 'pixelTreatment': 'none; complete native PNG copied byte-identically', **{f: False for f in FLAGS}}}
        outputs[png.replace('.png','.json')] = json.dumps(atlas,indent=2)+'\n'
        measurement = {'artPass': VERSION, 'source': source['source'], 'sourceSHA256': source['sha256'],
                       'referenceHeight': config['referenceHeight'], 'nativeSize': [cell*2,cell*2],
                       'scaleMethod': 'One contact median shared across all eight natural postures; no phase normalization',
                       'cells': cells, 'nativePixelChanges': False, 'phaseScaleNormalization': False,
                       'edgeOrFringeFreeCertified': False, 'clips': [clip], **{f: False for f in FLAGS}}
        outputs[f'docs/art-pass/reviews/{VERSION}-{role}-measurement.json'] = json.dumps(measurement,indent=2)+'\n'
        outputs[png] = bounded_file(source['source'])
    return outputs


def main():
    parser = argparse.ArgumentParser();parser.add_argument('--check', action='store_true')
    parser.add_argument('--self-test', action='store_true');args = parser.parse_args()
    config = json.loads(CONFIG.read_text());out = exports(config)
    if args.self_test:
        import copy
        cases = []
        for flag in (*FLAGS, 'familyComplete'):
            c = copy.deepcopy(config);c[flag] = True;cases.append(c)
        c = copy.deepcopy(config);c['referenceHeight'] += 1;cases.append(c)
        for i in range(2):
            for field, value in [('sha256', '0'*64), ('referenceHeight', config['referenceHeight']+1),
                                 ('source', '../outside.png'), ('groundMethods', []), ('cell', True)]:
                c = copy.deepcopy(config);c['sources'][i][field] = value;cases.append(c)
            c = copy.deepcopy(config);c['sources'][i]['roots'][0][0] += 1;cases.append(c)
            c = copy.deepcopy(config);c['sources'][i]['roots'][0][1] += 1;cases.append(c)
        for c in cases:
            try:
                inspect(c)
            except (ValueError, FileNotFoundError):
                continue
            raise ValueError('Corrupted native acceptance/registration was accepted')
        print(json.dumps({'artPass': VERSION, 'sourceAuthorNegativeCasesPassed': len(cases)}))
        if not args.check:
            return
    for rel, value in out.items():
        dest = ROOT / rel
        if args.check:
            expected = value.read_bytes() if isinstance(value, Path) else value.encode()
            if not dest.is_file() or dest.read_bytes() != expected:
                raise ValueError('Native export changed or missing: '+rel)
        else:
            dest.parent.mkdir(parents=True,exist_ok=True)
            if isinstance(value, Path): shutil.copy2(value,dest)
            else: dest.write_text(value)
    print(json.dumps({'artPass': VERSION, 'checked': args.check, 'outputs': len(out),
                      'nativePixelChanges': False, 'productionApproved': False, 'defaultApproved': False}))


if __name__ == '__main__':
    main()
