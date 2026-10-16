#!/usr/bin/env python3
"""Register one independently reviewed native six-cell Confederate A E source.

Read-only Pillow measurements and a byte-for-byte copy of the complete PNG.
No cropping of the exported raster, resampling, warping, alpha cleanup, or
phase-specific size normalization. Acceptance is an opt-in illustration pilot.
"""
import argparse
import copy
from datetime import datetime
import hashlib
import json
import math
from pathlib import Path
import re
import shutil
import statistics
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = 'gettysburg-v18'
ANNOTATIONS = ROOT / f'docs/art-pass/manifests/{DIRECTORY}-source-annotations.json'
SOURCE = f'docs/art-pass/candidates/{DIRECTORY}/confederate-a-e-actions-candidate.png'
REVIEW = f'docs/art-pass/reviews/{DIRECTORY}-independent-e-actions-source-review.json'
ASSET = ROOT / f'public/images/units/{DIRECTORY}/confederate-a-actions-e.png'
ATLAS = ASSET.with_suffix('.json')
MEASUREMENT = ROOT / f'docs/art-pass/reviews/{DIRECTORY}-confederate-a-e-actions-measurement.json'
KEY = 'confederate-gettysburg-v18-a-actions-e'
SEQUENCE = 'gettysburg-v18-confederate-a-e'
PHASES = ('ready', 'fire', 'cartridge', 'charge', 'ram', 'return-to-shouldered-aim')
# Source-specific posture allowance independently reviewed by Astra at Max.
# Original 5% target failure remains recorded; all older authors retain their gates.
MAXIMUM_SPAN_RANGE = 0.06
ACTIONS = [['ready', [0]], ['fire', [1]], ['reload', [2, 3, 4, 5]]]
FALSE_FLAGS = ('productionApproved', 'defaultApproved', 'humanCertified',
               'physicalAnatomyCertified', 'historicalDrillCertified')
MEASUREMENT_KEYS = ('cell', 'roots', 'capTop', 'bodySpans', 'referenceHeight', 'capROIs',
                    'supportingSoleROIs', 'pelvisCenterX', 'measurementThreshold',
                    'muzzle', 'muzzleROI')


def finite_number(value):
    return type(value) is int or (type(value) is float and math.isfinite(value))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def exact_digest(value):
    return isinstance(value, str) and re.fullmatch('[0-9a-f]{64}', value) is not None


def require_false_fields(obj, family_field):
    for key in (*FALSE_FLAGS, family_field):
        if obj.get(key) is not False:
            raise ValueError(f'Local opt-in scope requires explicit {key}=false')


def direct_file(relative, expected):
    if relative != expected:
        raise ValueError('Exact v18 source/review path is required')
    path = ROOT / expected
    if any(part.is_symlink() for part in (path, *path.parents) if part != ROOT.parent):
        raise ValueError('Native source and review paths cannot use symlink redirection')
    if path.resolve() != ROOT.resolve() / expected:
        raise ValueError('Native source and review paths must resolve inside this candidate')
    return path


def validate_roi(roi, cell, label):
    if (not isinstance(roi, list) or len(roi) != 4 or any(type(v) is not int for v in roi)
            or not 0 <= roi[0] < roi[2] <= cell or not 0 <= roi[1] < roi[3] <= cell):
        raise ValueError(f'{label} must be a bounded cell-local integer rectangle')


def validate_rois(values, cell, label):
    if not isinstance(values, list) or len(values) != 6:
        raise ValueError(f'Six independently selected {label} regions are required')
    for roi in values:
        validate_roi(roi, cell, label)


def validate_registration(source):
    cell = source.get('cell')
    if type(cell) is not int or not 64 <= cell <= 2048:
        raise ValueError('Native equal-cell size must be a bounded positive integer, 64 to 2048')
    roots, caps, spans = source.get('roots'), source.get('capTop'), source.get('bodySpans')
    if not all(isinstance(values, list) and len(values) == 6 for values in (roots, caps, spans)):
        raise ValueError('Six fresh supporting-sole roots, cap tops and spans are required')
    for index, (root, cap, span) in enumerate(zip(roots, caps, spans)):
        if (not isinstance(root, list) or len(root) != 2
                or not all(finite_number(value) and 0 <= value < cell for value in root)
                or not finite_number(cap) or not 0 <= cap < root[1]
                or not finite_number(span) or not 0 < span < cell
                or root[1] - cap != span):
            raise ValueError(f'Fresh native registration is invalid in actions-E cell {index}')
    median = statistics.median(spans)
    height = source.get('referenceHeight')
    if (not finite_number(height) or not 0 < height < cell
            or height != math.floor(median + 0.5)):
        raise ValueError('Reference height must be the six-span median rounded half upward')
    if (max(spans) - min(spans)) / median > MAXIMUM_SPAN_RANGE:
        raise ValueError('Native cap-to-supporting-sole span range exceeds the source-specific 6% posture limit')
    validate_rois(source.get('capROIs'), cell, 'cap-only')
    validate_rois(source.get('supportingSoleROIs'), cell, 'supporting-sole-only')
    centers = source.get('pelvisCenterX')
    if (not isinstance(centers, list) or len(centers) != 6
            or not all(finite_number(x) and 0 <= x < cell for x in centers)
            or centers != [root[0] for root in roots]):
        raise ValueError('Every pivot X must bind to its independently interpreted pelvis center')
    if type(source.get('measurementThreshold')) is not int or source['measurementThreshold'] != 64:
        raise ValueError('Fresh cap and supporting sole measurements require alpha>=64')
    for index, (cap, sole) in enumerate(zip(source['capROIs'], source['supportingSoleROIs'])):
        if cap[3] > sole[1]:
            raise ValueError(f'Cap and supporting sole regions must be distinct in cell {index}')
    muzzle = source.get('muzzle')
    if (not isinstance(muzzle, list) or len(muzzle) != 2
            or not all(finite_number(v) and 0 <= v < cell for v in muzzle)):
        raise ValueError('The fire-cell barrel-mouth annotation must be one finite native point')
    validate_roi(source.get('muzzleROI'), cell, 'Fire-cell muzzle region')
    roi = source['muzzleROI']
    if not roi[0] <= muzzle[0] < roi[2] or not roi[1] <= muzzle[1] < roi[3]:
        raise ValueError('The fire-cell barrel-mouth point must lie inside its reviewed muzzle ROI')


def fresh_measurements(source):
    """Recompute reviewed native ROIs read-only; never write a changed raster."""
    from PIL import Image
    path = direct_file(source['source'], SOURCE)
    if digest(path) != source['sha256']:
        raise ValueError('Native source changed; obtain a new visual review and annotations')
    cell = source['cell']
    with Image.open(path) as image:
        if (image.mode != 'RGBA' or image.size != (cell * 2, cell * 3) or image.format != 'PNG'
                or getattr(image, 'is_animated', False) or getattr(image, 'n_frames', 1) != 1):
            raise ValueError('Expected the native RGBA PNG with six equal cells, two columns by three rows')
        extrema = image.getchannel('A').getextrema()
        if extrema[0] != 0 or extrema[1] < 240:
            raise ValueError('Native PNG must contain genuine transparent and solid alpha pixels')
        result = []
        for index in range(6):
            x, y = index % 2 * cell, index // 2 * cell
            # A temporary read-only analysis crop is never an exported asset.
            native_cell = image.crop((x, y, x + cell, y + cell))
            alpha = native_cell.getchannel('A')
            alpha_measures = {}
            for threshold in (1, 8, 64, 128, 240):
                mask = alpha.point(lambda value: 255 if value >= threshold else 0)
                bounds = mask.getbbox()
                if bounds is None:
                    raise ValueError(f'Empty native cell {index} at alpha>={threshold}')
                padding = [bounds[0], bounds[1], cell - bounds[2], cell - bounds[3]]
                alpha_measures[str(threshold)] = {'pixels': mask.histogram()[255],
                                                  'bounds': list(bounds), 'padding': padding}
            if min(alpha_measures['64']['padding']) < 16:
                raise ValueError(f'Insufficient solid cell padding: actions-E {index}')
            measures = {}
            for label, roi in [('cap', source['capROIs'][index]),
                               ('supportingSole', source['supportingSoleROIs'][index])]:
                region_alpha = alpha.crop(tuple(roi))
                mask = region_alpha.point(lambda value: 255 if value >= 64 else 0)
                bounds = mask.getbbox()
                if bounds is None:
                    raise ValueError(f'Empty reviewed {label} ROI in native cell {index}')
                measures[label] = {'roi': roi, 'solidPixels': mask.histogram()[255],
                                   'minY': roi[1] + bounds[1],
                                   'maxYExclusive': roi[1] + bounds[3]}
            cap = measures['cap']['minY']
            sole = measures['supportingSole']['maxYExclusive']
            if cap != source['capTop'][index] or sole != source['roots'][index][1]:
                raise ValueError(f'Fresh pixels disagree with reviewed cap/supporting sole in cell {index}')
            result.append({'cell': index, 'phaseRole': PHASES[index], **measures,
                           'capTopY': cap, 'supportingSoleGroundY': sole, 'bodySpan': sole - cap,
                           'alpha': alpha_measures,
                           'solidAlphaBounds': alpha_measures['64']['bounds'],
                           'solidAlphaPadding': alpha_measures['64']['padding']})
            if index == 1:
                mask = alpha.crop(tuple(source['muzzleROI'])).point(lambda value: 255 if value >= 64 else 0)
                if mask.getbbox() is None:
                    raise ValueError('The reviewed fire-cell muzzle ROI contains no solid-alpha weapon pixels')
                result[-1]['muzzleReview'] = {'roi': source['muzzleROI'],
                                             'point': source['muzzle'],
                                             'solidPixelsInROI': mask.histogram()[255],
                                             'physicalBarrelApertureCertified': False}
    return result


def validate_review(source, review):
    if not isinstance(review, dict):
        raise ValueError('Independent review must be one JSON object')
    inspected = review.get('source')
    if (not isinstance(inspected, dict) or inspected.get('sha256') != source['sha256']
            or inspected.get('mode') != 'RGBA'
            or inspected.get('size') != [source['cell'] * 2, source['cell'] * 3]
            or review.get('selectedSource') != SOURCE
            or review.get('selectedSourceSha256') != source['sha256']
            or review.get('identityKit') != 'confederate-a'):
        raise ValueError('Independent review must inspect the exact native source, size and identity kit')
    for key in ('acceptedForOptIn', 'modelAssisted', 'independentReview', 'kitAccepted',
                'allSixCellsReviewed', 'completeNativeSheetInspected'):
        if review.get(key) is not True:
            raise ValueError(f'Fresh independent source review requires explicit {key}=true')
    require_false_fields(review, 'completeFamilyApproved')
    reviewer, time = review.get('reviewer'), review.get('reviewedAtUTC')
    if not isinstance(reviewer, str) or not reviewer.strip() or not isinstance(time, str):
        raise ValueError('Independent review must identify its reviewer and timezone-aware inspection time')
    try:
        timestamp = datetime.fromisoformat(time.replace('Z', '+00:00'))
    except ValueError as error:
        raise ValueError('Independent review inspection time is invalid') from error
    if timestamp.utcoffset() is None:
        raise ValueError('Independent review inspection time must include its UTC offset')
    cells = review.get('cells')
    if not isinstance(cells, list) or len(cells) != 6 or any(not isinstance(c, dict) for c in cells):
        raise ValueError('Independent review must explicitly accept all six row-major cells')
    for index, inspected_cell in enumerate(cells):
        if type(inspected_cell.get('cell')) is not int or inspected_cell['cell'] != index:
            raise ValueError('Independent review cells must follow exact native row-major order')
        if inspected_cell.get('phaseRole') != PHASES[index]:
            raise ValueError('Independent review must accept the six exact action/phase roles')
        for key in ('poseAccepted', 'bearingAccepted', 'kitAccepted', 'gripAccepted',
                    'completeLegChainsAccepted', 'supportRoleAccepted'):
            if inspected_cell.get(key) is not True:
                raise ValueError(f'Independent cell review requires explicit {key}=true')
    bearing = review.get('bearingAndGrip')
    if (not isinstance(bearing, dict) or bearing.get('direction') != 'E'
            or type(bearing.get('directionIndex')) is not int or bearing['directionIndex'] != 0
            or bearing.get('actualFacingAccepted') is not True):
        raise ValueError('Independent review must accept the exact native E(0) facing')
    measured = review.get('measurementContract')
    if not isinstance(measured, dict):
        raise ValueError('Fresh independent per-cell measurement contract is required')
    for key in MEASUREMENT_KEYS:
        if measured.get(key) != source[key]:
            raise ValueError(f'Annotation {key} differs from independent source measurements')
    validate_registration(measured)
    if (measured.get('measuredSourceSha256') != source['sha256']
            or measured.get('measurementsFresh') is not True
            or measured.get('muzzleApplicable') is not True
            or measured.get('firingBarrelMouth') != source['muzzle']
            or measured.get('firingMuzzleAccepted') is not True
            or type(measured.get('firingCell')) is not int or measured['firingCell'] != 1):
        raise ValueError('Fresh actions measurements must bind to the real fire-cell muzzle annotation')
    sole_y = measured.get('perCellSupportingSoleGroundY')
    if (not isinstance(sole_y, list) or len(sole_y) != 6
            or not all(finite_number(value) for value in sole_y)
            or sole_y != [root[1] for root in source['roots']]):
        raise ValueError('Every pivot must use its independently measured supporting-sole ground Y')
    for key in ('rootMeaning', 'groundMethod', 'referenceMethod', 'roiMethod', 'muzzleMethod'):
        if not isinstance(measured.get(key), str) or not measured[key].strip():
            raise ValueError('Fresh cap/sole/root/muzzle ROI and source-wide scale methods must be documented')


def validate_config(config):
    if not isinstance(config, dict) or config.get('artPass') != DIRECTORY:
        raise ValueError('Only the unapproved local Gettysburg v18 source is in scope')
    require_false_fields(config, 'familyComplete')
    sources = config.get('sources')
    if not isinstance(sources, list) or len(sources) != 1 or not isinstance(sources[0], dict):
        raise ValueError('Exactly one native six-cell Confederate A E actions source is required')
    source = sources[0]
    for key, expected in {'name': 'actions-e', 'side': 'confederate', 'identity': 'a',
                          'identityKit': 'confederate-a', 'key': KEY,
                          'measurementName': 'confederate-a-e-actions'}.items():
        if source.get(key) != expected:
            raise ValueError('Source identity, atlas key and measurement name must bind to exact v18 E actions')
    if type(source.get('direction')) is not int or source['direction'] != 0:
        raise ValueError('Only native east direction 0 is in scope')
    source_path = direct_file(source.get('source'), SOURCE)
    if not exact_digest(source.get('sha256')):
        raise ValueError('Native source needs a lowercase SHA-256 digest')
    if digest(source_path) != source['sha256']:
        raise ValueError('Native source changed; obtain a new source inspection')
    native_review = source.get('nativeReview')
    if (not isinstance(native_review, dict) or native_review.get('sourceHash') != source['sha256']
            or native_review.get('identity') != 'confederate-a'
            or any(native_review.get(key) is not True for key in
                   ('kitAccepted', 'allSixCellsReviewed', 'independentReview', 'modelAssisted'))):
        raise ValueError('Exact source-bound independent model-assisted all-six-cell kit review is required')
    if source.get('actions') != ACTIONS:
        raise ValueError('Ready/fire/reload must own exact row-major cells [0], [1], [2,3,4,5]')
    if any(type(index) is not int for _, indexes in source['actions'] for index in indexes):
        raise ValueError('Native phase indices must be integers, never booleans')
    validate_registration(source)
    for key in ('annotationMethod', 'scope'):
        if not isinstance(source.get(key), str) or not source[key].strip():
            raise ValueError('Fresh independent measurement method and opt-in scope must be documented')
    if (not isinstance(source.get('limitations'), list) or not source['limitations']
            or any(not isinstance(value, str) or not value.strip() for value in source['limitations'])):
        raise ValueError('Source inspection and measurement limitations must remain explicit')
    review_path = direct_file(source.get('sourceReview'), REVIEW)
    if not exact_digest(source.get('sourceReviewSHA256')) or digest(review_path) != source['sourceReviewSHA256']:
        raise ValueError('Exact fresh independent review SHA-256 is required')
    validate_review(source, json.loads(review_path.read_text()))
    fresh_measurements(source)


def authored(source):
    cells = fresh_measurements(source)
    cell = source['cell']
    frames, clips = {}, []
    for action, indexes in ACTIONS:
        names = [f'a-{action}-0-{phase}' for phase in range(len(indexes))]
        pivots = [{'x': round(source['roots'][i][0] / cell, 6),
                   'y': round(source['roots'][i][1] / cell, 6)} for i in indexes]
        for phase, index in enumerate(indexes):
            frames[names[phase]] = {
                'frame': {'x': index % 2 * cell, 'y': index // 2 * cell, 'w': cell, 'h': cell},
                'rotated': False, 'trimmed': False,
                'spriteSourceSize': {'x': 0, 'y': 0, 'w': cell, 'h': cell},
                'sourceSize': {'w': cell, 'h': cell}, 'pivot': pivots[phase],
                'bodyHeight': source['referenceHeight'],
            }
        clip = {'side': 'confederate', 'identity': 'a', 'direction': 0, 'action': action,
                'key': KEY, 'frames': names, 'sourceHash': source['sha256'],
                'referenceHeight': source['referenceHeight'], 'pivots': pivots,
                'approval': {'reviewed': True, 'rejected': False}, 'scope': source['scope']}
        if action == 'reload':
            clip['nativeReloadSequence'] = SEQUENCE
        if action == 'fire':
            clip['muzzles'] = [{'x': round(source['muzzle'][0] / cell, 6),
                                'y': round(source['muzzle'][1] / cell, 6)}]
        clips.append(clip)
    spans = [record['bodySpan'] for record in cells]
    median = statistics.median(spans)
    measurement = {
        'source': SOURCE, 'sourceHash': source['sha256'], 'publicPNG': str(ASSET.relative_to(ROOT)),
        'atlas': str(ATLAS.relative_to(ROOT)), 'nativeSize': {'w': cell * 2, 'h': cell * 3},
        'nativeMode': 'RGBA', 'pixelTreatment': 'none; byte-for-byte whole native PNG copy, full equal cells',
        'annotationMethod': source['annotationMethod'], 'referenceHeight': source['referenceHeight'],
        'scaleMethod': 'One uniform reference for all six source cells; no action or phase size correction.',
        'solidPaddingVerified': True,
        'nonzeroAlphaPaddingVerified': all(min(c['alpha']['1']['padding']) >= 16 for c in cells),
        'edgeOrFringeFreeCertified': False, 'cells': cells, 'clips': clips,
        'limitations': source['limitations'], 'sourceReview': REVIEW,
        'sourceReviewSHA256': source['sourceReviewSHA256'], 'completeFamilyApproved': False,
        'familyApproved': False,
        'freshMeasurementContract': {
            'threshold': 64, 'sourceHash': source['sha256'], 'cells': cells,
            'medianBodySpan': median, 'spanRange': max(spans) - min(spans),
            'spanRangeFractionOfMedian': (max(spans) - min(spans)) / median,
            'maximumSpanRangeFractionOfMedian': MAXIMUM_SPAN_RANGE,
            'originalTargetFractionOfMedian': 0.05,
            'originalTargetMet': (max(spans) - min(spans)) / median <= 0.05,
            'postureAllowance': 'Source-specific opt-in illustration judgment by Astra at Max; normal and close-zoom playback required.',
            'manualROIsIndependentlyReviewed': True, 'freshNativePixelsRecomputed': True,
            'phaseScaleNormalization': False,
        },
    }
    atlas = {'frames': frames, 'meta': {
        'image': ASSET.name, 'size': measurement['nativeSize'], 'sha256': source['sha256'],
        'source': SOURCE, 'artPass': DIRECTORY, 'candidate': True,
        'pixelTreatment': measurement['pixelTreatment'], 'clips': clips,
        'measurementReview': str(MEASUREMENT.relative_to(ROOT)),
        'sourceReview': REVIEW, 'sourceReviewSHA256': source['sourceReviewSHA256'],
        'completeFamilyApproved': False, 'familyApproved': False,
    }}
    for key in FALSE_FLAGS:
        measurement[key] = False
        atlas['meta'][key] = False
    return atlas, measurement


def rejected(call, cases, label):
    for case in cases:
        try:
            call(case)
        except (ValueError, FileNotFoundError):
            continue
        raise RuntimeError(f'Unsupported {label} accepted')


def self_test():
    """Reject malformed clones of the real accepted manifest/review/source.

    Requires a genuine independently accepted source. This test does not create
    acceptance, write fixtures, or modify source/review/output files.
    """
    if not ANNOTATIONS.is_file():
        raise ValueError('Self-test requires the real independently accepted v18 source manifest')
    real = json.loads(ANNOTATIONS.read_text())
    validate_config(real)
    source = real['sources'][0]
    authored(source)
    cases = [None, [], {}, dict(real, artPass='gettysburg-v17'),
             dict(real, sources=[]), dict(real, sources=[None]), dict(real, sources=real['sources'] * 2)]
    for key in (*FALSE_FLAGS, 'familyComplete'):
        for value in (True, 0, None):
            cases.append(dict(real, **{key: value}))
        case = copy.deepcopy(real)
        del case[key]
        cases.append(case)
    malformed_fields = [
        ('name', []), ('name', 'march-e'), ('side', 'union'), ('identity', 'b'),
        ('identityKit', 'union-a'), ('direction', True), ('direction', 1),
        ('source', SOURCE.replace(DIRECTORY, 'gettysburg-v17')),
        ('key', 'confederate-gettysburg-v17-a-actions-e'), ('measurementName', 'other'),
        ('sourceReview', REVIEW.replace(DIRECTORY, 'gettysburg-v17')),
        ('sourceReviewSHA256', '0' * 64), ('sha256', '0' * 64),
        ('sha256', source['sha256'].upper()), ('cell', True), ('cell', 0), ('cell', 4096),
        ('cell', source['cell'] + 1), ('roots', []), ('roots', [[0, 0]] * 6),
        ('roots', [[10 ** 400, 1]] * 6), ('capTop', [float('inf')] * 6),
        ('bodySpans', [True] * 6), ('bodySpans', []),
        ('referenceHeight', float('nan')), ('referenceHeight', 10 ** 400),
        ('referenceHeight', True), ('referenceHeight', source['referenceHeight'] + 1),
        ('nativeReview', {}), ('annotationMethod', ''), ('limitations', [None]), ('scope', ''),
        ('actions', [['ready', [0]], ['fire', [1]], ['reload', [2, 3, 4, 4]]]),
        ('actions', [['ready', [0]], ['fire', [True]], ['reload', [2, 3, 4, 5]]]),
        ('actions', [['ready', [0]], ['fire', [1]], ['reload', [2, 3]]]),
        ('muzzle', [float('nan'), 0]), ('muzzle', [True, 0]),
        ('muzzleROI', [0, 0, source['cell'] + 1, 10]),
        ('capROIs', []), ('capROIs', [[True, 0, 10, 10]] * 6),
        ('supportingSoleROIs', [[0, 0, source['cell'] + 1, 10]] * 6),
        ('pelvisCenterX', [True] * 6), ('measurementThreshold', True), ('measurementThreshold', 63),
    ]
    for key, value in malformed_fields:
        case = copy.deepcopy(real)
        case['sources'][0][key] = value
        cases.append(case)
    for key in ('kitAccepted', 'allSixCellsReviewed', 'independentReview', 'modelAssisted'):
        case = copy.deepcopy(real)
        case['sources'][0]['nativeReview'][key] = 1
        cases.append(case)
    case = copy.deepcopy(real)
    changed = case['sources'][0]
    changed['capTop'][0] = 0
    changed['bodySpans'][0] = changed['roots'][0][1]
    changed['referenceHeight'] = math.floor(statistics.median(changed['bodySpans']) + 0.5)
    cases.append(case)
    rejected(validate_config, cases, 'native-author manifest')
    review = json.loads((ROOT / REVIEW).read_text())
    reviews = [None, [], {}]
    for key, value in [('source', {}), ('selectedSource', '../wrong.png'),
                       ('selectedSourceSha256', '0' * 64), ('identityKit', 'union-a'),
                       ('reviewer', ''), ('reviewedAtUTC', 'invalid'),
                       ('reviewedAtUTC', '2026-10-04T00:00:00'), ('cells', []),
                       ('cells', [{'cell': True}] * 6), ('bearingAndGrip', {}), ('measurementContract', {})]:
        reviews.append(dict(review, **{key: value}))
    for key in ('acceptedForOptIn', 'modelAssisted', 'independentReview', 'kitAccepted',
                'allSixCellsReviewed', 'completeNativeSheetInspected'):
        reviews.append(dict(review, **{key: 1}))
    for key in (*FALSE_FLAGS, 'completeFamilyApproved'):
        reviews.append(dict(review, **{key: True}))
    for key, value in [('direction', 'SE'), ('directionIndex', True), ('actualFacingAccepted', 1)]:
        case = copy.deepcopy(review)
        case['bearingAndGrip'][key] = value
        reviews.append(case)
    for key, value in [('cell', source['cell'] + 1), ('cell', True), ('roots', []), ('capTop', []),
                       ('bodySpans', []), ('referenceHeight', True),
                       ('perCellSupportingSoleGroundY', [True] * 6), ('rootMeaning', ''),
                       ('groundMethod', ''), ('referenceMethod', ''), ('roiMethod', ''), ('muzzleMethod', ''),
                       ('capROIs', []), ('supportingSoleROIs', []), ('pelvisCenterX', [True] * 6),
                       ('measurementThreshold', True), ('measuredSourceSha256', '0' * 64),
                       ('measurementsFresh', 1), ('muzzleApplicable', False), ('firingMuzzleAccepted', 1),
                       ('firingCell', True), ('firingBarrelMouth', [0, 0]), ('muzzle', [True, 0]),
                       ('muzzleROI', [0, 0, source['cell'] + 1, 10])]:
        case = copy.deepcopy(review)
        case['measurementContract'][key] = value
        reviews.append(case)
    for index in range(6):
        for key, value in [('cell', True), ('phaseRole', PHASES[(index + 1) % 6]),
                           ('poseAccepted', 1), ('bearingAccepted', 1), ('kitAccepted', 1),
                           ('gripAccepted', 1), ('completeLegChainsAccepted', 1), ('supportRoleAccepted', 1)]:
            case = copy.deepcopy(review)
            case['cells'][index][key] = value
            reviews.append(case)
    rejected(lambda item: validate_review(source, item), reviews, 'independent source review')
    measurement_cases = [dict(source, sha256='0' * 64), dict(source, cell=source['cell'] + 1),
                         dict(source, source=str(Path(__file__).relative_to(ROOT)))]
    for key in ('capTop', 'roots', 'capROIs', 'muzzleROI'):
        case = copy.deepcopy(source)
        if key == 'capTop':
            case[key][0] += 1
        elif key == 'roots':
            case[key][0][1] -= 1
        elif key == 'capROIs':
            case[key][0][1] = source['capTop'][0] + 1
        else:
            case[key] = [0, 0, 1, 1]
        measurement_cases.append(case)
    rejected(fresh_measurements, measurement_cases, 'fresh native pixel measurement')
    print(json.dumps({'status': 'V18_NATIVE_AUTHOR_CONTRACT_PASSED',
                      'manifestRejectionCases': len(cases), 'reviewRejectionCases': len(reviews),
                      'freshMeasurementRejectionCases': len(measurement_cases),
                      'rejectionCases': len(cases) + len(reviews) + len(measurement_cases),
                      'realV18ManifestPresent': True, 'realNativeSourcesPreflighted': 1,
                      'writes': False}), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    config = json.loads(ANNOTATIONS.read_text())
    validate_config(config)
    source = config['sources'][0]
    atlas, measurement = authored(source)
    if args.check:
        if digest(ASSET) != source['sha256']:
            raise ValueError('Public PNG differs from independently reviewed native source')
        for path, expected in [(ATLAS, atlas), (MEASUREMENT, measurement)]:
            if json.loads(path.read_text()) != expected:
                raise ValueError(f'Metadata differs: {path}')
    else:
        ASSET.parent.mkdir(parents=True, exist_ok=True)
        MEASUREMENT.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(direct_file(source['source'], SOURCE), ASSET)
        if digest(ASSET) != source['sha256']:
            raise ValueError('Whole native PNG byte copy failed')
        for path, data in [(ATLAS, atlas), (MEASUREMENT, measurement)]:
            path.write_text(json.dumps(data, indent=2) + '\n')
    print(json.dumps({'verified': True, 'sourceHash': source['sha256'], 'name': source['name'],
                      'clips': ['ready', 'fire', 'reload'], 'reloadPhases': 4,
                      'productionApproved': False,
                      'spanRangeFractionOfMedian': measurement['freshMeasurementContract']['spanRangeFractionOfMedian']}))


if __name__ == '__main__':
    main()
