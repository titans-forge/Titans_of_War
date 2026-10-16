#!/usr/bin/env python3
"""Register exactly two independently reviewed native Confederate A S sources.

The unchanged SHA-checked v5 author measures native RGBA cells read-only and
copies complete PNG bytes. Both sources, their fresh v14 reviews and every
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
DIRECTORY = 'gettysburg-v14'
ANNOTATIONS = ROOT / f'docs/art-pass/manifests/{DIRECTORY}-source-annotations.json'
CORE = HERE / 'author-gettysburg-v5-clips.py'
CORE_SHA256 = '7a9f5300a58f85f5d5cf9b25018a4806d3da746be21b70734efc5719e3808e0d'
NAMES = ('march-s', 'actions-s')


def finite_number(value):
    return type(value) in (int, float) and math.isfinite(value)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def checked_native():
    if digest(CORE) != CORE_SHA256:
        raise ValueError('Unchanged v5 native author bytes are required')
    loader = importlib.util.spec_from_file_location('gettysburg_v14_checked_native_clips', CORE)
    module = importlib.util.module_from_spec(loader)
    loader.loader.exec_module(module)
    return module


def exact_digest(value):
    return isinstance(value, str) and re.fullmatch('[0-9a-f]{64}', value) is not None


def validate_fresh_review(source):
    """Bind actual v14 review bytes and measurements to this native source."""
    kind = source['name'].split('-')[0]
    expected = f'docs/art-pass/reviews/{DIRECTORY}-independent-s-{kind}-source-review.json'
    if source.get('sourceReview') != expected or not exact_digest(source.get('sourceReviewSHA256')):
        raise ValueError('Fresh exact v14 source-review path and SHA-256 are required')
    path = ROOT / expected
    if path.is_symlink() or path.resolve().parent != (ROOT / 'docs/art-pass/reviews').resolve():
        raise ValueError('Independent review must be a direct v14 review file without redirection')
    if digest(path) != source['sourceReviewSHA256']:
        raise ValueError('Independent source review changed; obtain a fresh bound review')
    review = json.loads(path.read_text())
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
    for key in ('acceptedForOptIn', 'modelAssisted', 'kitAccepted', 'allFourCellsReviewed',
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
    if (not isinstance(bearing, dict) or bearing.get('direction') != 'S'
            or type(bearing.get('directionIndex')) is not int or bearing['directionIndex'] != 2
            or bearing.get('actualFacingAccepted') is not True):
        raise ValueError('Fresh review must accept actual native S facing, direction 2')
    measured = review.get('measurementContract')
    if not isinstance(measured, dict):
        raise ValueError('Fresh independent per-cell measurement contract is required')
    for key in ('roots', 'capTop', 'bodySpans', 'referenceHeight'):
        if measured.get(key) != source[key]:
            raise ValueError(f'Annotation {key} differs from fresh independent measurements')
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
                or measured.get('firingAnchorIsBayonetTip') is not False
                or measured.get('muzzleApplicable') is not True):
            raise ValueError('Fresh fire anchor must be the actual barrel mouth, independently distinguished from bayonet tip')
    elif (measured.get('muzzleApplicable') is not False
            or any(key in measured for key in ('firingBarrelMouth', 'muzzle'))):
        raise ValueError('March review cannot claim a firing-mouth measurement')


def validate_config(config):
    """Fail before any writes if scope, source binding or annotations differ."""
    if (not isinstance(config, dict) or config.get('artPass') != DIRECTORY
            or config.get('productionApproved') is not False or config.get('familyComplete') is not False):
        raise ValueError('Only incomplete, unapproved local Gettysburg v14 sources are in scope')
    sources = config.get('sources')
    if not isinstance(sources, list) or len(sources) != 2 or any(not isinstance(source, dict) for source in sources):
        raise ValueError('Exactly two native Confederate A S source objects are required')
    actual = [(source.get('identity'), source.get('name')) for source in sources]
    if any(not isinstance(identity, str) or not isinstance(name, str) for identity, name in actual):
        raise ValueError('Source identity and name must be strings')
    if set(actual) != {('a', name) for name in NAMES}:
        raise ValueError('Exactly march-s/actions-s for Confederate A are required')
    hashes = []
    for source in sources:
        name = source['name']
        kind = name.split('-')[0]
        expected_source = f'docs/art-pass/candidates/{DIRECTORY}/confederate-a-s-{kind}-candidate.png'
        if (source.get('side') != 'confederate' or source.get('identity') != 'a'
                or type(source.get('direction')) is not int or source['direction'] != 2
                or source.get('identityKit') != 'confederate-a'):
            raise ValueError('Every source must bind to Confederate A identity/kit and native S(2) bearing')
        if (source.get('source') != expected_source
                or source.get('key') != f'confederate-{DIRECTORY}-a-{name}'
                or source.get('measurementName') != f'confederate-a-{name}'):
            raise ValueError('Source path, atlas key and measurement name must bind to the exact v14 source')
        source_path = ROOT / expected_source
        if source_path.is_symlink() or source_path.resolve().parent != (ROOT / f'docs/art-pass/candidates/{DIRECTORY}').resolve():
            raise ValueError('Native source must be a direct v14 candidate file without source redirection')
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
            raise ValueError('Local opt-in v14 scope must be documented')
        validate_fresh_review(source)
    if len(set(hashes)) != 2:
        raise ValueError('Two distinct native sources are required; reused or mirrored source bindings are unsupported')


def self_test():
    """Reject prior scopes and malformed inputs without invented source data."""
    checked_native()
    if not finite_number(0) or not finite_number(0.25):
        raise RuntimeError('Finite native coordinate rejected')
    for value in (True, False, None, '12', float('nan'), float('inf'), -float('inf'), [12]):
        if finite_number(value):
            raise RuntimeError('Nonfinite or nonnumeric native coordinate accepted')
    prior = json.loads((ROOT / 'docs/art-pass/manifests/gettysburg-v13-source-annotations.json').read_text())
    cases = [prior, None, [], {}, {'artPass': DIRECTORY, 'productionApproved': False,
                                  'familyComplete': False, 'sources': []}]
    if ANNOTATIONS.exists():
        real = json.loads(ANNOTATIONS.read_text())
        validate_config(real)
        cases.extend([dict(real, sources=real['sources'][:1]), dict(real, sources=real['sources'] * 2)])
        for name, value in [('direction', True), ('identityKit', 'union-a'), ('referenceHeight', float('nan')),
                            ('roots', []), ('capTop', []), ('bodySpans', []), ('nativeReview', {}),
                            ('sha256', '0' * 64), ('actions', [['march', [0, 1, 1, 3]]])]:
            case = copy.deepcopy(real)
            case['sources'][0][name] = value
            cases.append(case)
        case = copy.deepcopy(real)
        march = next(source for source in case['sources'] if source['name'] == 'march-s')
        march['muzzle'] = [0, 0]
        cases.append(case)
    for case in cases:
        try:
            validate_config(case)
        except (ValueError, FileNotFoundError):
            continue
        raise RuntimeError('Unsupported native-author contract accepted')
    print(json.dumps({'status': 'V14_NATIVE_AUTHOR_CONTRACT_PASSED', 'rejectionCases': len(cases),
                      'checkedV5Sha256': CORE_SHA256, 'realV14ManifestPresent': ANNOTATIONS.exists(),
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
    native = checked_native()
    # Preflight BOTH native images, all cells and the unchanged alpha64/16px
    # padding floor read-only before the unchanged core writes its first file.
    for source in config['sources']:
        native.author(source, directory=DIRECTORY)
    native.run(config, args.check, directory=DIRECTORY)


if __name__ == '__main__':
    main()
