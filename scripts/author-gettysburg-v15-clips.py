#!/usr/bin/env python3
"""Register exactly four independently reviewed native Confederate A SE/SW sources.

The unchanged SHA-checked v5 author measures native RGBA cells read-only and
copies complete PNG bytes. All four sources, their fresh v15 reviews and every
annotation are preflighted before any output. Review attestations are
model-assisted inspection, not physical anatomy or historical certification.
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
import sys

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
DIRECTORY = 'gettysburg-v15'
ANNOTATIONS = ROOT / f'docs/art-pass/manifests/{DIRECTORY}-source-annotations.json'
CORE = HERE / 'author-gettysburg-v5-clips.py'
CORE_SHA256 = '7a9f5300a58f85f5d5cf9b25018a4806d3da746be21b70734efc5719e3808e0d'
NAMES = ('march-se', 'actions-se', 'march-sw', 'actions-sw')
DIRECTIONS = {'se': 1, 'sw': 3}


def finite_number(value):
    # Python integers are finite without conversion to an overflowing float.
    # Per-field native pixel bounds below still reject arbitrarily large ints.
    return type(value) is int or (type(value) is float and math.isfinite(value))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def checked_native():
    if digest(CORE) != CORE_SHA256:
        raise ValueError('Unchanged v5 native author bytes are required')
    loader = importlib.util.spec_from_file_location('gettysburg_v15_checked_native_clips', CORE)
    module = importlib.util.module_from_spec(loader)
    loader.loader.exec_module(module)
    return module


def exact_digest(value):
    return isinstance(value, str) and re.fullmatch('[0-9a-f]{64}', value) is not None


def validate_fresh_review(source):
    """Bind actual v15 review bytes and measurements to this native source."""
    kind, bearing = source['name'].split('-')
    expected = f'docs/art-pass/reviews/{DIRECTORY}-independent-{bearing}-{kind}-source-review.json'
    if source.get('sourceReview') != expected or not exact_digest(source.get('sourceReviewSHA256')):
        raise ValueError('Fresh exact v15 source-review path and SHA-256 are required')
    path = ROOT / expected
    if path.is_symlink() or path.resolve().parent != (ROOT / 'docs/art-pass/reviews').resolve():
        raise ValueError('Independent review must be a direct v15 review file without redirection')
    if digest(path) != source['sourceReviewSHA256']:
        raise ValueError('Independent source review changed; obtain a fresh bound review')
    review = json.loads(path.read_text())
    validate_review(source, review)


def validate_review(source, review):
    """Check review content separately so malformed real reviews test read-only."""
    kind, native_bearing = source['name'].split('-')
    if not isinstance(review, dict):
        raise ValueError('Independent review must be one JSON object')
    inspected = review.get('source')
    if (not isinstance(inspected, dict) or inspected.get('sha256') != source['sha256']
            or inspected.get('mode') != 'RGBA'
            or inspected.get('size') != [2 * source['cell'], 2 * source['cell']]
            or review.get('selectedSource') != source['source']
            or review.get('selectedSourceSha256') != source['sha256']
            or review.get('identityKit') != 'confederate-a'):
        raise ValueError('Fresh review must inspect this exact selected source, dimensions and identity kit')
    for key in ('acceptedForOptIn', 'modelAssisted', 'independentReview', 'kitAccepted', 'allFourCellsReviewed',
                'completeNativeSheetInspected'):
        if review.get(key) is not True:
            raise ValueError(f'Fresh independent source review requires explicit {key}=true')
    for key in ('productionApproved', 'defaultApproved', 'completeFamilyApproved',
                'humanCertified', 'physicalAnatomyCertified', 'historicalDrillCertified'):
        if review.get(key) is not False:
            raise ValueError(f'Fresh local opt-in review requires explicit {key}=false')
    reviewer, time = review.get('reviewer'), review.get('reviewedAtUTC')
    if not isinstance(reviewer, str) or not reviewer.strip() or not isinstance(time, str):
        raise ValueError('Fresh review must identify its reviewer and timezone-aware inspection time')
    try:
        timestamp = datetime.fromisoformat(time.replace('Z', '+00:00'))
    except ValueError as error:
        raise ValueError('Fresh review inspection time is invalid') from error
    if timestamp.utcoffset() is None:
        raise ValueError('Fresh review inspection time must include its UTC offset')
    cells = review.get('cells')
    if (not isinstance(cells, list) or len(cells) != 4
            or [cell.get('cell') for cell in cells if isinstance(cell, dict)] != [0, 1, 2, 3]
            or any(type(cell['cell']) is not int
                   or any(cell.get(key) is not True for key in ('poseAccepted', 'bearingAccepted', 'kitAccepted'))
                   for cell in cells)):
        raise ValueError('Fresh review must explicitly accept all four row-major cells')
    bearing = review.get('bearingAndGrip')
    if (not isinstance(bearing, dict) or bearing.get('direction') != native_bearing.upper()
            or type(bearing.get('directionIndex')) is not int or bearing['directionIndex'] != source['direction']
            or bearing.get('actualFacingAccepted') is not True):
        raise ValueError('Fresh review must accept this exact native SE(1)/SW(3) facing')
    measured = review.get('measurementContract')
    if not isinstance(measured, dict):
        raise ValueError('Fresh independent per-cell measurement contract is required')
    for key in ('roots', 'capTop', 'bodySpans', 'referenceHeight'):
        if measured.get(key) != source[key]:
            raise ValueError(f'Annotation {key} differs from fresh independent measurements')
    if (not all(finite_number(value) for root in measured['roots'] for value in root)
            or not all(finite_number(value) for value in measured['capTop'] + measured['bodySpans'])
            or not finite_number(measured['referenceHeight'])):
        raise ValueError('Fresh reviewed registration values must be finite native numbers, never booleans')
    sole_y = measured.get('perCellSupportingSoleGroundY')
    if (not isinstance(sole_y, list) or len(sole_y) != 4
            or not all(finite_number(value) for value in sole_y)
            or sole_y != [root[1] for root in source['roots']]):
        raise ValueError('Every root must use its independently measured supporting-sole ground Y')
    for key in ('rootMeaning', 'groundMethod', 'referenceMethod'):
        if not isinstance(measured.get(key), str) or not measured[key].strip():
            raise ValueError('Supporting sole, root meaning and source-wide scale methods must be documented')
    if kind == 'actions':
        if (measured.get('firingBarrelMouth') != source['muzzle']
                or not all(finite_number(value) for value in measured['firingBarrelMouth'])
                or measured.get('firingAnchorIsBayonetTip') is not False
                or measured.get('muzzleApplicable') is not True):
            raise ValueError('Fresh fire anchor must be the actual barrel mouth, independently distinguished from bayonet tip')
    elif (measured.get('muzzleApplicable') is not False
            or any(key in measured for key in ('firingBarrelMouth', 'muzzle'))):
        raise ValueError('March review cannot claim a firing-mouth measurement')


def validate_config(config):
    """Fail before any writes if scope, source binding or annotations differ."""
    if (not isinstance(config, dict) or config.get('artPass') != DIRECTORY
            or config.get('productionApproved') is not False or config.get('defaultApproved') is not False
            or config.get('familyComplete') is not False):
        raise ValueError('Only incomplete, unapproved local Gettysburg v15 sources are in scope')
    sources = config.get('sources')
    if not isinstance(sources, list) or len(sources) != 4 or any(not isinstance(source, dict) for source in sources):
        raise ValueError('Exactly four native Confederate A SE/SW source objects are required')
    actual = [(source.get('identity'), source.get('name')) for source in sources]
    if any(not isinstance(identity, str) or not isinstance(name, str) for identity, name in actual):
        raise ValueError('Source identity and name must be strings')
    if set(actual) != {('a', name) for name in NAMES}:
        raise ValueError('Exactly march-se/actions-se/march-sw/actions-sw for Confederate A are required')
    hashes = []
    for source in sources:
        name = source['name']
        kind, bearing = name.split('-')
        direction = DIRECTIONS[bearing]
        expected_source = f'docs/art-pass/candidates/{DIRECTORY}/confederate-a-{bearing}-{kind}-candidate.png'
        if (source.get('side') != 'confederate' or source.get('identity') != 'a'
                or type(source.get('direction')) is not int or source['direction'] != direction
                or source.get('identityKit') != 'confederate-a'):
            raise ValueError('Every source must bind to Confederate A identity/kit and native SE(1)/SW(3) bearing')
        if (source.get('source') != expected_source
                or source.get('key') != f'confederate-{DIRECTORY}-a-{name}'
                or source.get('measurementName') != f'confederate-a-{name}'):
            raise ValueError('Source path, atlas key and measurement name must bind to the exact v15 source')
        source_path = ROOT / expected_source
        if source_path.is_symlink() or source_path.resolve().parent != (ROOT / f'docs/art-pass/candidates/{DIRECTORY}').resolve():
            raise ValueError('Native source must be a direct v15 candidate file without source redirection')
        source_hash = source.get('sha256')
        if not exact_digest(source_hash):
            raise ValueError('Native source needs a lowercase SHA-256 digest')
        hashes.append(source_hash)
        review = source.get('nativeReview')
        if not isinstance(review, dict) or any(review.get(key) != value for key, value in {
                'sourceHash': source_hash, 'identity': 'confederate-a', 'kitAccepted': True,
                'allFourCellsReviewed': True, 'independentReview': True, 'modelAssisted': True}.items()):
            raise ValueError('Exact source-bound independent model-assisted identity/kit and all-four-cell review is required')
        if any(review.get(key) is not True for key in ('kitAccepted', 'allFourCellsReviewed', 'independentReview', 'modelAssisted')):
            raise ValueError('Review acceptance fields must be explicit booleans')
        expected_actions = [['march', [0, 1, 2, 3]]] if kind == 'march' else [
            ['ready', [0]], ['fire', [1]], ['reload', [2, 3]]]
        if source.get('actions') != expected_actions:
            raise ValueError('Every complete action must own its exact reviewed row-major cells')
        indexes = [index for _, frames in source['actions'] for index in frames]
        if any(type(index) is not int for index in indexes) or sorted(indexes) != [0, 1, 2, 3]:
            raise ValueError('Every native cell must belong to exactly one complete action')
        cell = source.get('cell')
        if type(cell) is not int or not 64 <= cell <= 4096:
            raise ValueError('Native equal-cell size must be one bounded positive integer')
        roots, caps, spans = source.get('roots'), source.get('capTop'), source.get('bodySpans')
        if not all(isinstance(values, list) and len(values) == 4 for values in (roots, caps, spans)):
            raise ValueError('Four freshly measured supporting-sole roots, cap tops and body spans are required')
        for index, (root, cap, span) in enumerate(zip(roots, caps, spans)):
            if (not isinstance(root, list) or len(root) != 2
                    or not all(finite_number(value) and 0 <= value < cell for value in root)
                    or not finite_number(cap) or not 0 <= cap < root[1]
                    or not finite_number(span) or not 0 < span < cell
                    or abs((root[1] - cap) - span) > 1):
                raise ValueError(f'Fresh native body registration is invalid in {name} cell {index}')
        height = source.get('referenceHeight')
        if not finite_number(height) or not 0 < height < cell:
            raise ValueError('One finite source-wide referenceHeight is required; phase scaling is unsupported')
        if kind == 'actions':
            muzzle = source.get('muzzle')
            if (not isinstance(muzzle, list) or len(muzzle) != 2
                    or not all(finite_number(value) and 0 <= value < cell for value in muzzle)):
                raise ValueError('Actions source requires a fresh native firing-mouth coordinate')
        elif 'muzzle' in source:
            raise ValueError('March source cannot claim an actions firing-mouth annotation')
        if not isinstance(source.get('annotationMethod'), str) or not source['annotationMethod'].strip():
            raise ValueError('Fresh independent manual measurement method must be documented')
        if (not isinstance(source.get('limitations'), list) or not source['limitations']
                or any(not isinstance(value, str) or not value.strip() for value in source['limitations'])):
            raise ValueError('Source inspection and measurement limitations must remain explicit')
        if not isinstance(source.get('scope'), str) or not source['scope'].strip():
            raise ValueError('Local opt-in v15 scope must be documented')
        validate_fresh_review(source)
    if len(set(hashes)) != 4:
        raise ValueError('Four distinct native sources are required; reused or mirrored source bindings are unsupported')


def self_test():
    """Reject malformed clones of the actual manifest and four bound reviews.

    A genuine accepted v15 annotation manifest is required. No test invents
    source acceptance, overwrites source/review files or authors output files.
    """
    native = checked_native()
    if not finite_number(0) or not finite_number(0.25):
        raise RuntimeError('Finite native coordinate rejected')
    for value in (True, False, None, '12', float('nan'), float('inf'), -float('inf'), [12]):
        if finite_number(value):
            raise RuntimeError('Nonfinite or nonnumeric native coordinate accepted')
    if not ANNOTATIONS.is_file():
        raise ValueError('Self-test requires the real independently reviewed v15 source manifest')
    real = json.loads(ANNOTATIONS.read_text())
    validate_config(real)
    for source in real['sources']:
        native.author(source, directory=DIRECTORY)
    prior = json.loads((ROOT / 'docs/art-pass/manifests/gettysburg-v14-source-annotations.json').read_text())
    cases = [prior, None, [], {}, {'artPass': DIRECTORY, 'productionApproved': False,
                                  'defaultApproved': False, 'familyComplete': False, 'sources': []}]
    cases.extend([dict(real, sources=real['sources'][:1]), dict(real, sources=real['sources'] * 2),
                  dict(real, sources=[None] * 4)])
    for key in ('productionApproved', 'defaultApproved', 'familyComplete'):
        for value in (True, 0, None):
            cases.append(dict(real, **{key: value}))
        case = copy.deepcopy(real)
        del case[key]
        cases.append(case)
    for index, source in enumerate(real['sources']):
        for name, value in [('name', []), ('identity', []), ('side', 'union'), ('identityKit', 'union-a'),
                            ('direction', True), ('direction', 2), ('cell', True), ('cell', 0),
                            ('cell', source['cell'] + 1), ('referenceHeight', float('nan')),
                            ('referenceHeight', 10 ** 400), ('roots', [[10 ** 400, 1]] * 4),
                            ('referenceHeight', True), ('roots', []), ('roots', [[0, 0]] * 4),
                            ('capTop', []), ('capTop', [float('inf')] * 4), ('bodySpans', []),
                            ('bodySpans', [True] * 4), ('nativeReview', {}),
                            ('sha256', '0' * 64), ('sha256', source['sha256'].upper()),
                            ('source', source['source'].replace(DIRECTORY, 'gettysburg-v14')),
                            ('key', 'confederate-gettysburg-v14-a-' + source['name']),
                            ('measurementName', 'misbound-measurement'),
                            ('sourceReview', real['sources'][(index + 1) % 4]['sourceReview']),
                            ('sourceReviewSHA256', '0' * 64), ('annotationMethod', ''),
                            ('limitations', [None]), ('scope', ''),
                            ('actions', [['march', [0, 1, 1, 3]]]),
                            ('actions', [['march', [0, True, 2, 3]]])]:
            case = copy.deepcopy(real)
            case['sources'][index][name] = value
            cases.append(case)
        case = copy.deepcopy(real)
        case['sources'][index]['sha256'] = real['sources'][(index + 1) % 4]['sha256']
        cases.append(case)
        if source['name'].startswith('march-'):
            case = copy.deepcopy(real)
            case['sources'][index]['muzzle'] = [0, 0]
            cases.append(case)
        else:
            for value in (None, [0], [True, 0], [0, source['cell']], [float('nan'), 0]):
                case = copy.deepcopy(real)
                case['sources'][index]['muzzle'] = value
                cases.append(case)
    for case in cases:
        try:
            validate_config(case)
        except (ValueError, FileNotFoundError):
            continue
        raise RuntimeError('Unsupported native-author contract accepted')
    review_cases = []
    for source in real['sources']:
        review = json.loads((ROOT / source['sourceReview']).read_text())
        for key, value in [('source', {}), ('selectedSource', '../wrong-source.png'),
                           ('selectedSourceSha256', '0' * 64), ('identityKit', 'union-a'),
                           ('reviewer', ''), ('reviewedAtUTC', '2026-10-03T00:00:00'),
                           ('reviewedAtUTC', 'invalid'), ('cells', []),
                           ('cells', [{'cell': True}] * 4), ('bearingAndGrip', {}),
                           ('measurementContract', {})]:
            review_cases.append((source, dict(review, **{key: value})))
        for key in ('acceptedForOptIn', 'modelAssisted', 'independentReview', 'kitAccepted',
                    'allFourCellsReviewed', 'completeNativeSheetInspected'):
            review_cases.append((source, dict(review, **{key: 1})))
        for key in ('productionApproved', 'defaultApproved', 'completeFamilyApproved',
                    'humanCertified', 'physicalAnatomyCertified', 'historicalDrillCertified'):
            review_cases.append((source, dict(review, **{key: True})))
        for key, value in [('direction', source['name'].split('-')[1].upper()[::-1]),
                           ('directionIndex', True), ('actualFacingAccepted', 1)]:
            case = copy.deepcopy(review)
            case['bearingAndGrip'][key] = value
            review_cases.append((source, case))
        for key, value in [('roots', []), ('capTop', []), ('bodySpans', []),
                           ('referenceHeight', source['referenceHeight'] + 1),
                           ('perCellSupportingSoleGroundY', [True] * 4),
                           ('rootMeaning', ''), ('groundMethod', ''), ('referenceMethod', '')]:
            case = copy.deepcopy(review)
            case['measurementContract'][key] = value
            review_cases.append((source, case))
        for index in range(4):
            for key in ('poseAccepted', 'bearingAccepted', 'kitAccepted'):
                case = copy.deepcopy(review)
                case['cells'][index][key] = 1
                review_cases.append((source, case))
        for key, value in ([('firingBarrelMouth', [0, 0]), ('firingAnchorIsBayonetTip', True),
                            ('muzzleApplicable', 1)] if source['name'].startswith('actions-')
                           else [('muzzleApplicable', True), ('firingBarrelMouth', [0, 0])]):
            case = copy.deepcopy(review)
            case['measurementContract'][key] = value
            review_cases.append((source, case))
    for source, review in review_cases:
        try:
            validate_review(source, review)
        except ValueError:
            continue
        raise RuntimeError('Unsupported independent-source review accepted')
    native_cases = []
    for source in real['sources']:
        for key, value in [('sha256', '0' * 64), ('cell', source['cell'] + 1),
                           ('source', str(CORE.relative_to(ROOT)))]:
            native_cases.append(dict(source, **{key: value}))
    for source in native_cases:
        try:
            native.author(source, directory=DIRECTORY)
        except ValueError:
            continue
        raise RuntimeError('Unsupported native PNG source accepted')
    print(json.dumps({'status': 'V15_NATIVE_AUTHOR_CONTRACT_PASSED',
                      'manifestRejectionCases': len(cases), 'reviewRejectionCases': len(review_cases),
                      'nativeRejectionCases': len(native_cases),
                      'rejectionCases': len(cases) + len(review_cases) + len(native_cases),
                      'checkedV5Sha256': CORE_SHA256, 'realV15ManifestPresent': True,
                      'realNativeSourcesPreflighted': 4, 'writes': False}), flush=True)


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
    # Preflight ALL FOUR native images, all cells and the unchanged alpha64/16px
    # padding floor read-only before the unchanged core writes its first file.
    for source in config['sources']:
        native.author(source, directory=DIRECTORY)
    native.run(config, args.check, directory=DIRECTORY)


if __name__ == '__main__':
    main()
