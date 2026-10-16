#!/usr/bin/env python3
"""Register one independently reviewed native Confederate A SW march source.

The unchanged SHA-checked v5 author measures native RGBA cells read-only and
copies complete PNG bytes. Fresh manual cap/supporting-sole regions are measured
again before output; one source-wide median must keep span range within 5%.
Acceptance is limited to the local opt-in pilot, not anatomy or history proof.
"""
import argparse
import copy
from datetime import datetime
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import re
import shutil
import statistics
import sys

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
DIRECTORY = 'gettysburg-v16'
ANNOTATIONS = ROOT / f'docs/art-pass/manifests/{DIRECTORY}-source-annotations.json'
CORE = HERE / 'author-gettysburg-v5-clips.py'
CORE_SHA256 = '7a9f5300a58f85f5d5cf9b25018a4806d3da746be21b70734efc5719e3808e0d'
SOURCE = f'docs/art-pass/candidates/{DIRECTORY}/confederate-a-sw-march-candidate.png'
REVIEW = f'docs/art-pass/reviews/{DIRECTORY}-independent-sw-march-source-review.json'
FALSE_FLAGS = ('productionApproved', 'defaultApproved', 'humanCertified',
               'physicalAnatomyCertified', 'historicalDrillCertified')
PHASES = ('contact', 'passing', 'opposite-contact', 'opposite-passing')
MEASUREMENT_KEYS = ('cell', 'roots', 'capTop', 'bodySpans', 'referenceHeight', 'capROIs',
                    'supportingSoleROIs', 'pelvisCenterX', 'measurementThreshold')


def finite_number(value):
    return type(value) is int or (type(value) is float and math.isfinite(value))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def exact_digest(value):
    return isinstance(value, str) and re.fullmatch('[0-9a-f]{64}', value) is not None


def checked_native():
    if digest(CORE) != CORE_SHA256:
        raise ValueError('Unchanged v5 native author bytes are required')
    loader = importlib.util.spec_from_file_location('gettysburg_v16_checked_native_clips', CORE)
    module = importlib.util.module_from_spec(loader)
    loader.loader.exec_module(module)
    return module


def require_false_fields(obj, family_field):
    for key in (*FALSE_FLAGS, family_field):
        if obj.get(key) is not False:
            raise ValueError(f'Local opt-in scope requires explicit {key}=false')


def direct_file(relative, expected):
    if relative != expected:
        raise ValueError('Exact v16 source/review path is required')
    path = ROOT / expected
    # Inspect each lexical parent so a directory symlink cannot redirect a file
    # that itself is not a symlink into another candidate/review tree.
    if any(part.is_symlink() for part in (path, *path.parents) if part != ROOT.parent):
        raise ValueError('Native source and review paths must not use symlink redirection')
    if path.resolve() != ROOT.resolve() / expected:
        raise ValueError('Native source and review paths must resolve inside this candidate')
    return path


def validate_rois(values, cell, label):
    if not isinstance(values, list) or len(values) != 4:
        raise ValueError(f'Four fresh manually selected {label} regions are required')
    for roi in values:
        if (not isinstance(roi, list) or len(roi) != 4 or any(type(v) is not int for v in roi)
                or not 0 <= roi[0] < roi[2] <= cell or not 0 <= roi[1] < roi[3] <= cell):
            raise ValueError(f'{label} regions must be bounded cell-local integer rectangles')


def validate_registration(source):
    cell = source.get('cell')
    if type(cell) is not int or not 64 <= cell <= 4096:
        raise ValueError('Native equal-cell size must be one bounded positive integer')
    roots, caps, spans = source.get('roots'), source.get('capTop'), source.get('bodySpans')
    if not all(isinstance(values, list) and len(values) == 4 for values in (roots, caps, spans)):
        raise ValueError('Four fresh supporting-sole roots, cap tops and spans are required')
    for index, (root, cap, span) in enumerate(zip(roots, caps, spans)):
        if (not isinstance(root, list) or len(root) != 2
                or not all(finite_number(value) and 0 <= value < cell for value in root)
                or not finite_number(cap) or not 0 <= cap < root[1]
                or not finite_number(span) or not 0 < span < cell
                or root[1] - cap != span):
            raise ValueError(f'Fresh native registration is invalid in march-sw cell {index}')
    median = statistics.median(spans)
    height = source.get('referenceHeight')
    if (not finite_number(height) or not 0 < height < cell
            or height != math.floor(median + 0.5)):
        raise ValueError('Reference height must be the four-span median rounded half upward')
    if (max(spans) - min(spans)) / median > 0.05:
        raise ValueError('Native cap-to-supporting-sole span range exceeds 5% of the source median')
    validate_rois(source.get('capROIs'), cell, 'cap-only')
    validate_rois(source.get('supportingSoleROIs'), cell, 'supporting-sole-only')
    centers = source.get('pelvisCenterX')
    if (not isinstance(centers, list) or len(centers) != 4
            or not all(finite_number(x) and 0 <= x < cell for x in centers)
            or centers != [root[0] for root in roots]):
        raise ValueError('Every pivot X must bind to its freshly interpreted pelvis center')
    if type(source.get('measurementThreshold')) is not int or source['measurementThreshold'] != 64:
        raise ValueError('Fresh cap and supporting sole measurements require alpha>=64')
    for index, (cap, sole) in enumerate(zip(source['capROIs'], source['supportingSoleROIs'])):
        if cap[3] > sole[1]:
            raise ValueError(f'Cap and supporting sole regions must be distinct in cell {index}')


def fresh_measurements(source):
    """Measure reviewed native ROIs read-only; never create an edited raster."""
    from PIL import Image
    path = direct_file(source['source'], SOURCE)
    if digest(path) != source['sha256']:
        raise ValueError('Native source changed; obtain new visual review and annotations')
    cell = source['cell']
    with Image.open(path) as image:
        if (image.mode != 'RGBA' or image.size != (cell * 2, cell * 2) or image.format != 'PNG'
                or getattr(image, 'is_animated', False) or getattr(image, 'n_frames', 1) != 1):
            raise ValueError('Expected the selected native RGBA PNG with four equal square cells')
        result = []
        for index in range(4):
            x, y = index % 2 * cell, index // 2 * cell
            pixels = image.crop((x, y, x + cell, y + cell)).getdata()
            positions = [i for i, rgba in enumerate(pixels) if rgba[3] >= 64]
            if not positions:
                raise ValueError(f'Empty native solid cell {index}')
            xs, ys = [i % cell for i in positions], [i // cell for i in positions]
            bounds = [min(xs), min(ys), max(xs) + 1, max(ys) + 1]
            padding = [bounds[0], bounds[1], cell - bounds[2], cell - bounds[3]]
            if min(padding) < 16:
                raise ValueError(f'Insufficient solid cell padding: march-sw {index}')
            measures = {}
            for label, roi in [('cap', source['capROIs'][index]),
                               ('supportingSole', source['supportingSoleROIs'][index])]:
                region = image.crop((x + roi[0], y + roi[1], x + roi[2], y + roi[3]))
                width = roi[2] - roi[0]
                positions = [i for i, rgba in enumerate(region.getdata()) if rgba[3] >= 64]
                if not positions:
                    raise ValueError(f'Empty reviewed {label} ROI in native cell {index}')
                ys = [roi[1] + i // width for i in positions]
                measures[label] = {'roi': roi, 'solidPixels': len(positions),
                                   'minY': min(ys), 'maxYExclusive': max(ys) + 1}
            cap = measures['cap']['minY']
            sole = measures['supportingSole']['maxYExclusive']
            if cap != source['capTop'][index] or sole != source['roots'][index][1]:
                raise ValueError(f'Fresh source pixels disagree with reviewed cap/supporting sole in cell {index}')
            result.append({'cell': index, **measures, 'capTopY': cap,
                           'supportingSoleGroundY': sole, 'bodySpan': sole - cap,
                           'solidAlphaBounds': bounds, 'solidAlphaPadding': padding})
    return result


def validate_review(source, review):
    """Validate immutable review content; malformed copies do not change files."""
    if not isinstance(review, dict):
        raise ValueError('Independent review must be one JSON object')
    inspected = review.get('source')
    if (not isinstance(inspected, dict) or inspected.get('sha256') != source['sha256']
            or inspected.get('mode') != 'RGBA'
            or inspected.get('size') != [source['cell'] * 2, source['cell'] * 2]
            or review.get('selectedSource') != SOURCE
            or review.get('selectedSourceSha256') != source['sha256']
            or review.get('identityKit') != 'confederate-a'):
        raise ValueError('Independent review must inspect the exact native source, size and identity kit')
    for key in ('acceptedForOptIn', 'modelAssisted', 'independentReview', 'kitAccepted',
                'allFourCellsReviewed', 'completeNativeSheetInspected'):
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
    if not isinstance(cells, list) or len(cells) != 4 or any(not isinstance(c, dict) for c in cells):
        raise ValueError('Independent review must explicitly accept all four row-major cells')
    for index, inspected_cell in enumerate(cells):
        if type(inspected_cell.get('cell')) is not int or inspected_cell['cell'] != index:
            raise ValueError('Independent review cells must follow exact native row-major order')
        if inspected_cell.get('phaseRole') != PHASES[index]:
            raise ValueError('Independent review must accept contact/passing/opposite contact/passing roles')
        for key in ('poseAccepted', 'bearingAccepted', 'kitAccepted',
                    'completeLegChainsAccepted', 'supportRoleAccepted'):
            if inspected_cell.get(key) is not True:
                raise ValueError(f'Independent cell review requires explicit {key}=true')
    bearing = review.get('bearingAndGrip')
    if (not isinstance(bearing, dict) or bearing.get('direction') != 'SW'
            or type(bearing.get('directionIndex')) is not int or bearing['directionIndex'] != 3
            or bearing.get('actualFacingAccepted') is not True):
        raise ValueError('Independent review must accept the exact native SW(3) facing')
    measured = review.get('measurementContract')
    if not isinstance(measured, dict):
        raise ValueError('Fresh independent per-cell measurement contract is required')
    for key in MEASUREMENT_KEYS:
        if measured.get(key) != source[key]:
            raise ValueError(f'Annotation {key} differs from independent source measurements')
    # Equality in Python would allow True == 1, so validate native types again.
    validate_registration(measured)
    if (measured.get('measuredSourceSha256') != source['sha256']
            or measured.get('measurementsFresh') is not True
            or measured.get('muzzleApplicable') is not False
            or any(key in measured for key in ('firingBarrelMouth', 'muzzle'))):
        raise ValueError('Fresh SW march measurements must bind to this source without firing annotations')
    sole_y = measured.get('perCellSupportingSoleGroundY')
    if (not isinstance(sole_y, list) or len(sole_y) != 4
            or not all(finite_number(value) for value in sole_y)
            or sole_y != [root[1] for root in source['roots']]):
        raise ValueError('Every pivot must use its independently measured supporting-sole ground Y')
    for key in ('rootMeaning', 'groundMethod', 'referenceMethod', 'roiMethod'):
        if not isinstance(measured.get(key), str) or not measured[key].strip():
            raise ValueError('Fresh cap/sole/root ROI and source-wide scale methods must be documented')


def validate_config(config):
    """Preflight one source, bound review and fresh native pixels before writes."""
    if not isinstance(config, dict) or config.get('artPass') != DIRECTORY:
        raise ValueError('Only the unapproved local Gettysburg v16 source is in scope')
    require_false_fields(config, 'familyComplete')
    sources = config.get('sources')
    if not isinstance(sources, list) or len(sources) != 1 or not isinstance(sources[0], dict):
        raise ValueError('Exactly one native Confederate A SW march source is required')
    source = sources[0]
    for key, expected in {'name': 'march-sw', 'side': 'confederate', 'identity': 'a',
                          'identityKit': 'confederate-a', 'key': 'confederate-gettysburg-v16-a-march-sw',
                          'measurementName': 'confederate-a-march-sw'}.items():
        if source.get(key) != expected:
            raise ValueError('Source identity, atlas key and measurement name must bind to exact v16 SW march')
    if type(source.get('direction')) is not int or source['direction'] != 3:
        raise ValueError('Only native southwest direction 3 is in scope')
    source_path = direct_file(source.get('source'), SOURCE)
    if not exact_digest(source.get('sha256')):
        raise ValueError('Native source needs a lowercase SHA-256 digest')
    if digest(source_path) != source['sha256']:
        raise ValueError('Native source changed; obtain new source inspection')
    native_review = source.get('nativeReview')
    if (not isinstance(native_review, dict) or native_review.get('sourceHash') != source['sha256']
            or native_review.get('identity') != 'confederate-a'
            or any(native_review.get(key) is not True for key in
                   ('kitAccepted', 'allFourCellsReviewed', 'independentReview', 'modelAssisted'))):
        raise ValueError('Exact source-bound independent model-assisted all-four-cell kit review is required')
    if source.get('actions') != [['march', [0, 1, 2, 3]]]:
        raise ValueError('The one complete march action must own exact row-major cells 0,1,2,3')
    if any(type(index) is not int for index in source['actions'][0][1]):
        raise ValueError('Native phase indices must be integers, never booleans')
    if 'muzzle' in source:
        raise ValueError('March source cannot claim an actions firing-mouth annotation')
    validate_registration(source)
    if not isinstance(source.get('annotationMethod'), str) or not source['annotationMethod'].strip():
        raise ValueError('Fresh independent manual measurement method must be documented')
    if (not isinstance(source.get('limitations'), list) or not source['limitations']
            or any(not isinstance(value, str) or not value.strip() for value in source['limitations'])):
        raise ValueError('Source inspection and measurement limitations must remain explicit')
    if not isinstance(source.get('scope'), str) or not source['scope'].strip():
        raise ValueError('Local opt-in v16 scope must be documented')
    review_path = direct_file(source.get('sourceReview'), REVIEW)
    if not exact_digest(source.get('sourceReviewSHA256')) or digest(review_path) != source['sourceReviewSHA256']:
        raise ValueError('Exact fresh independent review SHA-256 is required')
    review = json.loads(review_path.read_text())
    # Registration validation needs the native cell bound even though all ROI
    # coordinates in the actual independent review remain strictly cell-local.
    measured = review.get('measurementContract') if isinstance(review, dict) else None
    if isinstance(measured, dict) and measured.get('cell') != source['cell']:
        raise ValueError('Independent native ROI measurement cell size must match the source')
    validate_review(source, review)
    fresh_measurements(source)


def authored(source, native):
    result = native.author(source, directory=DIRECTORY)
    _, _, _, _, atlas, measurement = result
    fresh = fresh_measurements(source)
    spans = [cell['bodySpan'] for cell in fresh]
    median = statistics.median(spans)
    measurement['sourceReview'] = source['sourceReview']
    measurement['sourceReviewSHA256'] = source['sourceReviewSHA256']
    measurement['freshMeasurementContract'] = {
        'threshold': 64, 'sourceHash': source['sha256'], 'cells': fresh,
        'medianBodySpan': median, 'spanRange': max(spans) - min(spans),
        'spanRangeFractionOfMedian': (max(spans) - min(spans)) / median,
        'maximumSpanRangeFractionOfMedian': 0.05,
        'manualROIsIndependentlyReviewed': True, 'freshNativePixelsRecomputed': True,
        'phaseScaleNormalization': False,
    }
    for key in FALSE_FLAGS:
        measurement[key] = False
        atlas['meta'][key] = False
    measurement['completeFamilyApproved'] = False
    atlas['meta']['completeFamilyApproved'] = False
    atlas['meta']['sourceReview'] = source['sourceReview']
    atlas['meta']['sourceReviewSHA256'] = source['sourceReviewSHA256']
    return result


def rejected(call, cases, label):
    for case in cases:
        try:
            call(case)
        except (ValueError, FileNotFoundError):
            continue
        raise RuntimeError(f'Unsupported {label} accepted')


def self_test():
    """Reject malformed clones of the actual accepted manifest/review/native PNG.

    Requires a genuine independently accepted v16 source. No test creates
    acceptance, modifies source/review files or writes authored output files.
    """
    native = checked_native()
    if not ANNOTATIONS.is_file():
        raise ValueError('Self-test requires the real independently accepted v16 source manifest')
    real = json.loads(ANNOTATIONS.read_text())
    validate_config(real)
    source = real['sources'][0]
    authored(source, native)
    cases = [None, [], {}, dict(real, artPass='gettysburg-v15'),
             dict(real, sources=[]), dict(real, sources=[None]),
             dict(real, sources=real['sources'] * 2)]
    for key in (*FALSE_FLAGS, 'familyComplete'):
        for value in (True, 0, None):
            cases.append(dict(real, **{key: value}))
        case = copy.deepcopy(real)
        del case[key]
        cases.append(case)
    malformed_fields = [
        ('name', []), ('name', 'march-se'), ('side', 'union'), ('identity', 'b'),
        ('identityKit', 'union-a'), ('direction', True), ('direction', 1),
        ('source', SOURCE.replace(DIRECTORY, 'gettysburg-v15')),
        ('key', 'confederate-gettysburg-v15-a-march-sw'), ('measurementName', 'other'),
        ('sourceReview', REVIEW.replace(DIRECTORY, 'gettysburg-v15')),
        ('sourceReviewSHA256', '0' * 64), ('sha256', '0' * 64),
        ('sha256', source['sha256'].upper()), ('cell', True), ('cell', 0),
        ('cell', source['cell'] + 1), ('roots', []), ('roots', [[0, 0]] * 4),
        ('roots', [[10 ** 400, 1]] * 4), ('capTop', [float('inf')] * 4),
        ('bodySpans', [True] * 4), ('bodySpans', []),
        ('referenceHeight', float('nan')), ('referenceHeight', 10 ** 400),
        ('referenceHeight', True), ('referenceHeight', source['referenceHeight'] + 1),
        ('nativeReview', {}), ('annotationMethod', ''), ('limitations', [None]),
        ('scope', ''), ('actions', [['march', [0, 1, 1, 3]]]),
        ('actions', [['march', [0, True, 2, 3]]]), ('muzzle', [0, 0]),
        ('capROIs', []), ('capROIs', [[True, 0, 10, 10]] * 4),
        ('supportingSoleROIs', [[0, 0, source['cell'] + 1, 10]] * 4),
        ('pelvisCenterX', [True] * 4), ('measurementThreshold', True),
        ('measurementThreshold', 63),
    ]
    for key, value in malformed_fields:
        case = copy.deepcopy(real)
        case['sources'][0][key] = value
        cases.append(case)
    for key in ('kitAccepted', 'allFourCellsReviewed', 'independentReview', 'modelAssisted'):
        case = copy.deepcopy(real)
        case['sources'][0]['nativeReview'][key] = 1
        cases.append(case)
    # A self-consistent fabricated span cannot pass the 5% gate merely by
    # changing the claimed median and sole coordinate together.
    case = copy.deepcopy(real)
    changed = case['sources'][0]
    changed['capTop'][0] = 0
    changed['bodySpans'][0] = changed['roots'][0][1]
    changed['referenceHeight'] = math.floor(statistics.median(changed['bodySpans']) + 0.5)
    cases.append(case)
    # A plausible in-bounds ROI with alpha pixels still cannot inherit another
    # source's annotations: recomputed extrema must equal the bound values.
    case = copy.deepcopy(real)
    changed = case['sources'][0]
    changed['capROIs'][0][1] = changed['capTop'][0] + 1
    if changed['capROIs'][0][1] >= changed['capROIs'][0][3]:
        changed['capROIs'][0][3] = changed['capROIs'][0][1] + 1
    cases.append(case)
    rejected(validate_config, cases, 'native-author manifest')
    review = json.loads((ROOT / REVIEW).read_text())
    reviews = [None, [], {}]
    for key, value in [('source', {}), ('selectedSource', '../wrong.png'),
                       ('selectedSourceSha256', '0' * 64), ('identityKit', 'union-a'),
                       ('reviewer', ''), ('reviewedAtUTC', 'invalid'),
                       ('reviewedAtUTC', '2026-10-03T00:00:00'), ('cells', []),
                       ('cells', [{'cell': True}] * 4), ('bearingAndGrip', {}),
                       ('measurementContract', {})]:
        reviews.append(dict(review, **{key: value}))
    for key in ('acceptedForOptIn', 'modelAssisted', 'independentReview', 'kitAccepted',
                'allFourCellsReviewed', 'completeNativeSheetInspected'):
        reviews.append(dict(review, **{key: 1}))
    for key in (*FALSE_FLAGS, 'completeFamilyApproved'):
        reviews.append(dict(review, **{key: True}))
    for key, value in [('direction', 'SE'), ('directionIndex', True), ('actualFacingAccepted', 1)]:
        case = copy.deepcopy(review)
        case['bearingAndGrip'][key] = value
        reviews.append(case)
    for key, value in [('cell', source['cell'] + 1), ('cell', True),
                       ('roots', []), ('capTop', []), ('bodySpans', []),
                       ('referenceHeight', True), ('perCellSupportingSoleGroundY', [True] * 4),
                       ('rootMeaning', ''), ('groundMethod', ''), ('referenceMethod', ''),
                       ('roiMethod', ''), ('capROIs', []), ('supportingSoleROIs', []),
                       ('pelvisCenterX', [True] * 4), ('measurementThreshold', True),
                       ('measuredSourceSha256', '0' * 64), ('measurementsFresh', 1),
                       ('muzzleApplicable', True), ('firingBarrelMouth', [0, 0])]:
        case = copy.deepcopy(review)
        case['measurementContract'][key] = value
        reviews.append(case)
    for index in range(4):
        for key, value in [('cell', True), ('phaseRole', PHASES[(index + 1) % 4]),
                           ('poseAccepted', 1), ('bearingAccepted', 1), ('kitAccepted', 1),
                           ('completeLegChainsAccepted', 1), ('supportRoleAccepted', 1)]:
            case = copy.deepcopy(review)
            case['cells'][index][key] = value
            reviews.append(case)
    rejected(lambda item: validate_review(source, item), reviews, 'independent source review')
    native_cases = [dict(source, sha256='0' * 64), dict(source, cell=source['cell'] + 1),
                    dict(source, source=str(CORE.relative_to(ROOT)))]
    rejected(lambda item: native.author(item, directory=DIRECTORY), native_cases, 'native PNG source')
    # Exercise actual native ROI reads independently from review equality so a
    # stale measurement is rejected by fresh pixels, not only JSON binding.
    measurement_cases = []
    for key in ('capTop', 'roots'):
        case = copy.deepcopy(source)
        if key == 'capTop':
            case[key][0] += 1
        else:
            case[key][0][1] -= 1
        measurement_cases.append(case)
    rejected(fresh_measurements, measurement_cases, 'fresh native pixel measurement')
    print(json.dumps({'status': 'V16_NATIVE_AUTHOR_CONTRACT_PASSED',
                      'manifestRejectionCases': len(cases), 'reviewRejectionCases': len(reviews),
                      'nativeRejectionCases': len(native_cases),
                      'freshMeasurementRejectionCases': len(measurement_cases),
                      'rejectionCases': len(cases) + len(reviews) + len(native_cases) + len(measurement_cases),
                      'checkedV5Sha256': CORE_SHA256, 'realV16ManifestPresent': True,
                      'realNativeSourcesPreflighted': 1, 'writes': False}), flush=True)


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
    native = checked_native()
    source = config['sources'][0]
    native_path, asset, atlas_path, measurement_path, atlas, measurement = authored(source, native)
    if args.check:
        if digest(asset) != source['sha256']:
            raise ValueError('Public PNG differs from independently reviewed native source')
        for path, expected in [(atlas_path, atlas), (measurement_path, measurement)]:
            if json.loads(path.read_text()) != expected:
                raise ValueError(f'Metadata differs: {path}')
    else:
        asset.parent.mkdir(parents=True, exist_ok=True)
        measurement_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(native_path, asset)
        if digest(asset) != source['sha256']:
            raise ValueError('Whole native PNG byte copy failed')
        for path, data in [(atlas_path, atlas), (measurement_path, measurement)]:
            path.write_text(json.dumps(data, indent=2) + '\n')
    print(json.dumps({'verified': True, 'sourceHash': source['sha256'], 'name': source['name'],
                      'clips': ['march'], 'productionApproved': False,
                      'spanRangeFractionOfMedian': measurement['freshMeasurementContract']['spanRangeFractionOfMedian']}))


if __name__ == '__main__':
    main()
