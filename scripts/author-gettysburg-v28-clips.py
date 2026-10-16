#!/usr/bin/env python3
"""Validate independent native v28 Union northern stationary registrations and copy whole PNG bytes.

The reviewer supplies every anatomical root and reference ROI. This author
reproduces alpha measurements; it does not select roots, approve anatomy,
change pixels, or normalize the height of individual action phases.
"""
import argparse
import copy
import hashlib
import io
import json
import math
from pathlib import Path
import re
import stat
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).absolute().parents[1]
VERSION = 'gettysburg-v28'
CONFIG = f'docs/art-pass/manifests/{VERSION}-source-annotations.json'
REVIEW = f'docs/art-pass/reviews/{VERSION}-independent-union-northern-source-review.json'
ROLES = ('actions',)
REFERENCE_CELLS = (0, 2, 3)
SEQUENCE = 'nativeUnionNorthernSequence'
FLAGS = ('productionApproved', 'defaultApproved', 'humanCertified',
         'physicalAnatomyCertified', 'historicalDrillCertified')
ADDRESSES = tuple((identity, direction, cardinal) for identity in ('a', 'b')
                  for direction, cardinal in ((6, 'n'), (5, 'nw')))
REFERENCE_KEYS = tuple(f'{identity}-{cardinal}' for identity, _, cardinal in ADDRESSES)
REGISTRATION_FIELDS = ('cell', 'referenceHeight', 'roots', 'groundROIs', 'groundMethods', 'frameOrder')
BODY_FIELDS = ('capROIs', 'capTop', 'referenceSoleROIs', 'referenceSoleGroundY', 'bodySpans')
MUZZLE_FIELDS = ('muzzle', 'muzzleROI', 'muzzleMethod')
MAX_JSON_BYTES = 4 * 1024 * 1024
MAX_PNG_BYTES = 64 * 1024 * 1024
MAX_SAFE_INTEGER = 2 ** 53 - 1
SOLID_ALPHA = 64
MIN_PADDING = 16


class ValidationError(ValueError):
    def __init__(self, code, message):
        self.code = code
        super().__init__(f'{code}: {message}')


def fail(code, message):
    raise ValidationError(code, message)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def finite(value):
    # math.isfinite(huge_python_int) can raise OverflowError. Bounds on native
    # measurements make a bounded integer test sufficient without conversion.
    if type(value) is int:
        return abs(value) <= MAX_SAFE_INTEGER
    return type(value) is float and math.isfinite(value)


def strict_equal(left, right):
    """JSON equality without treating True as the numeric coordinate 1."""
    if type(left) in (int, float) or type(right) in (int, float):
        return finite(left) and finite(right) and left == right
    if type(left) is not type(right):
        return False
    if isinstance(left, dict):
        return left.keys() == right.keys() and all(strict_equal(left[k], right[k]) for k in left)
    if isinstance(left, list):
        return len(left) == len(right) and all(strict_equal(a, b) for a, b in zip(left, right))
    return left == right


def bounded_file(relative):
    if (not isinstance(relative, str) or not relative or '\\' in relative
            or any(ord(c) < 32 for c in relative)):
        fail('E_PATH', 'A canonical candidate-relative file path is required')
    path = Path(relative)
    if path.is_absolute() or '..' in path.parts or path.as_posix() != relative:
        fail('E_PATH', 'Files must remain canonically inside the candidate')
    target = ROOT / path
    if any(p.is_symlink() for p in (target, *target.parents)):
        fail('E_PATH', 'Native inputs and outputs cannot use symlink redirection')
    try:
        target.relative_to(ROOT)
    except ValueError:
        fail('E_PATH', 'File escaped the candidate root')
    return target


def read_bytes(relative, limit):
    path = bounded_file(relative)
    try:
        info = path.stat()
        if not stat.S_ISREG(info.st_mode) or info.st_size > limit:
            fail('E_FILE', 'Expected a bounded regular file: ' + relative)
        raw = path.read_bytes()
    except OSError as exc:
        fail('E_FILE', f'Cannot read {relative}: {exc.strerror or type(exc).__name__}')
    if len(raw) > limit:
        fail('E_FILE', 'File grew beyond its bound: ' + relative)
    return raw


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            fail('E_JSON', 'Duplicate JSON object key: ' + key)
        result[key] = value
    return result


def reject_constant(value):
    fail('E_JSON', 'Non-finite JSON number: ' + value)


def load_json(raw):
    if not isinstance(raw, bytes) or len(raw) > MAX_JSON_BYTES:
        fail('E_JSON', 'Expected bounded UTF-8 JSON bytes')
    try:
        result = json.loads(raw.decode('utf-8'), object_pairs_hook=unique_object,
                            parse_constant=reject_constant)
    except (UnicodeError, json.JSONDecodeError, ValueError, OverflowError, RecursionError) as exc:
        if isinstance(exc, ValidationError):
            raise
        fail('E_JSON', 'Invalid or unbounded JSON encoding')
    if not isinstance(result, dict):
        fail('E_JSON', 'The registration/review JSON must be an object')
    return result


def valid_hash(value):
    return isinstance(value, str) and re.fullmatch('[0-9a-f]{64}', value) is not None


def source_path(address):
    identity, _, cardinal = address
    return f'docs/art-pass/candidates/{VERSION}/union-{identity}-actions-{cardinal}-candidate.png'


def sheet_key(identity, direction):
    if type(direction) is not int or direction not in (5, 6):
        fail('E_ADDRESS', 'Only Union north/northwest stationary references are permitted')
    return identity + ('-n' if direction == 6 else '-nw')

def frame_names(identity, direction, role='actions'):
    if role != 'actions' or type(direction) is not int or direction not in (5, 6):
        fail('E_ADDRESS', 'Only northern stationary ready/fire/two-stage reload sheets are permitted')
    return [f'{identity}-ready-{direction}-0', f'{identity}-fire-{direction}-0',
            f'{identity}-reload-{direction}-0', f'{identity}-reload-{direction}-1']

def reject_legacy_sequences(record):
    if isinstance(record, dict):
        if any(field in record for field in ('nativeReloadSequence', 'nativeContactSequence',
                                             'nativeCasualtySequence', 'nativeUnionNortheastSequence')):
            fail('E_SEQUENCE', 'Earlier native action markers cannot bind the Union northern family')
        for value in record.values():
            reject_legacy_sequences(value)
    elif isinstance(record, list):
        for value in record:
            reject_legacy_sequences(value)


def reject_angles(record):
    if isinstance(record, dict):
        if any('angle' in str(key).lower() for key in record):
            fail('E_ANGLE', 'Native bearing registration must not introduce angle metadata')
        for value in record.values():
            reject_angles(value)
    elif isinstance(record, list):
        for value in record:
            reject_angles(value)


def optional_flags(record, code):
    if any(flag in record and record[flag] is not False
           for flag in (*FLAGS, 'familyApproved', 'completeFamilyApproved')):
        fail(code, 'Optional certification fields must remain explicitly false')
    if 'familyComplete' in record and record['familyComplete'] is not False:
        fail(code, 'The native family remains incomplete')


def address_fields(record, address, required=False):
    identity, direction, cardinal = address
    expected = {'side': 'union', 'identity': identity, 'direction': direction, 'role': 'actions',
                'action': 'actions'}
    for field, value in expected.items():
        if (required and field != 'action') or field in record:
            if (record.get(field) != value
                    or (field == 'direction' and type(record.get(field)) is not int)):
                fail('E_ADDRESS', 'Exact Union identity/N6 or NW5 stationary sheet address is required')
    if any(field in record for field in ('nativeReloadSequence', 'nativeContactSequence',
                                         'nativeCasualtySequence', 'nativeUnionNortheastSequence')):
        fail('E_SEQUENCE', 'Earlier native action markers cannot bind the Union northern family')
    if SEQUENCE in record and record[SEQUENCE] != f'{VERSION}-union-{identity}-{cardinal}':
        fail('E_SEQUENCE', 'The exact dedicated Union northern sequence marker is required')
    optional_flags(record, 'E_SOURCE_FLAGS')
    reject_angles(record)

def reference_map(value):
    if not isinstance(value, dict) or set(value) != set(REFERENCE_KEYS):
        fail('E_REFERENCE_MAP', 'Exactly one fresh stationary reference per identity/bearing sheet is required')
    if any(not finite(height) or not 0 < height < 2048 for height in value.values()):
        fail('E_REFERENCE_VALUE', 'Sheet reference heights must be bounded finite numbers')

def bounds(roi, cell):
    if (not isinstance(roi, list) or len(roi) != 4 or any(type(v) is not int for v in roi)
            or not 0 <= roi[0] < roi[2] <= cell or not 0 <= roi[1] < roi[3] <= cell):
        fail('E_ROI', 'Every independently selected ROI must fit its native cell')


def region_extrema(solid, roi, cell):
    bounds(roi, cell)
    box = solid.crop(tuple(roi)).getbbox()
    if box is None:
        fail('E_EMPTY_ROI', 'Reviewed ROI contains no alpha>=64 source pixels')
    return roi[1] + box[1], roi[1] + box[3]


def unique_phase_digests(values):
    if len(values) != 4 or len(set(values)) != 4:
        fail('E_DUPLICATE_PHASE', 'Authored phases cannot duplicate native cell pixels')


def native_sheet(raw, cell, cache):
    from PIL import Image, UnidentifiedImageError
    key = (digest(raw), cell)
    if key in cache:
        return cache[key]
    try:
        with Image.open(io.BytesIO(raw)) as image:
            if (image.format != 'PNG' or image.mode != 'RGBA'
                    or image.size != (cell * 2, cell * 2)
                    or getattr(image, 'is_animated', False)):
                fail('E_NATIVE', 'Expected one complete native square RGBA 2x2 PNG')
            image.load()
            cells = []
            for index in range(4):
                x, y = index % 2 * cell, index // 2 * cell
                raster = image.crop((x, y, x + cell, y + cell))
                alpha = raster.getchannel('A')
                solid = alpha.point(lambda a: 255 if a >= SOLID_ALPHA else 0)
                box = solid.getbbox()
                if box is None:
                    fail('E_MARGIN', 'Every native cell needs a visible solid silhouette')
                padding = [box[0], box[1], cell - box[2], cell - box[3]]
                if min(padding) < MIN_PADDING:
                    fail('E_MARGIN', 'Solid alpha>=64 silhouette needs at least 16px padding')
                cells.append({'solid': solid, 'rgbaSHA256': digest(raster.tobytes()),
                              'solidBounds': list(box), 'solidPadding': padding,
                              'nonzeroBounds': list(alpha.getbbox())})
            unique_phase_digests([c['rgbaSHA256'] for c in cells])
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        fail('E_NATIVE', 'Cannot decode a bounded native PNG: ' + type(exc).__name__)
    cache[key] = cells
    return cells


def registration_shape(source):
    cell, height = source.get('cell'), source.get('referenceHeight')
    if type(cell) is not int or not 64 <= cell <= 2048:
        fail('E_CELL', 'Native equal-cell dimensions must be bounded integers')
    if not finite(height) or not 0 < height < cell:
        fail('E_REFERENCE_VALUE', 'Native reference height must fit its cell')
    roots, rois, methods = (source.get(k) for k in ('roots', 'groundROIs', 'groundMethods'))
    if any(not isinstance(v, list) or len(v) != 4 for v in (roots, rois, methods)):
        fail('E_REGISTRATION', 'Four independently reviewed grounds are required')
    # Anatomical projected X is independent of the near support ROI used for Y.
    for root, roi, method in zip(roots, rois, methods):
        if (not isinstance(root, list) or len(root) != 2
                or any(not finite(v) or not 0 <= v < cell for v in root)):
            fail('E_ROOT', 'Every independently selected root must fit its native cell')
        bounds(roi, cell)
        if not isinstance(method, str) or not method.strip() or len(method) > 2000:
            fail('E_METHOD', 'Every ground needs its independent support interpretation')
    if source.get('frameOrder') != frame_names(source['identity'], source['direction'], source['role']):
        fail('E_FRAME_ORDER', 'All four native phases must keep their exact authored action order')
    if any(not isinstance(source.get(k), list) or len(source[k]) != 4 for k in BODY_FIELDS):
        fail('E_BODY_FIELDS', 'Every native source needs four fresh independent cap/sole ROI records')
    for index in range(4):
        bounds(source['capROIs'][index], cell)
        bounds(source['referenceSoleROIs'][index], cell)
        top = source['capTop'][index]
        ground = source['referenceSoleGroundY'][index]
        span = source['bodySpans'][index]
        if (any(type(v) is not int for v in (top, ground, span))
                or not 0 <= top < ground <= cell or span != ground - top):
            fail('E_BODY_MEASUREMENT', 'Cap/near-sole spans need exact bounded integer measurements')
    if source['role'] == 'actions':
        point = source.get('muzzle')
        if (not isinstance(point, list) or len(point) != 2
                or any(not finite(v) or not 0 <= v < cell for v in point)):
            fail('E_MUZZLE', 'The fire cell needs one independently reviewed native barrel-mouth point')
        roi = source.get('muzzleROI')
        bounds(roi, cell)
        if not roi[0] <= point[0] < roi[2] or not roi[1] <= point[1] < roi[3]:
            fail('E_MUZZLE', 'The barrel-mouth point must fit its independently reviewed native ROI')
        method = source.get('muzzleMethod')
        if not isinstance(method, str) or not method.strip() or len(method) > 2000:
            fail('E_METHOD', 'The muzzle needs an independent barrel-mouth interpretation')
    elif any(field in source for field in MUZZLE_FIELDS):
        fail('E_MUZZLE_SOURCE', 'Only the stationary fire source may bind a barrel mouth')


def inspect(config, *, _review_bytes=None, _source_bytes=None, _native_cache=None):
    """Inspect real files; private byte inputs let negative checks forge records in memory."""
    if not isinstance(config, dict):
        fail('E_CONFIG', 'The registration must be an object')
    if (config.get('artPass') != VERSION or config.get('familyComplete') is not False
            or any(config.get(flag) is not False for flag in FLAGS)):
        fail('E_CONFIG_FLAGS', 'Only explicitly unapproved incomplete v28 opt-in art is accepted')
    optional_flags(config, 'E_CONFIG_FLAGS')
    reject_angles(config)
    reject_legacy_sequences(config)
    references = config.get('referenceHeights')
    reference_map(references)
    sources = config.get('sources')
    if not isinstance(sources, list) or len(sources) != 4:
        fail('E_SOURCE_SET', 'Exactly four native Union identity/bearing stationary sources are required')
    by_address = {}
    for source in sources:
        if not isinstance(source, dict):
            fail('E_SOURCE_SET', 'Every source must be a registration object')
        identity, direction = source.get('identity'), source.get('direction')
        address = next((a for a in ADDRESSES if a[:2] == (identity, direction)), None)
        if address is None:
            fail('E_ADDRESS', 'Only Union A/B north/northwest stationary sheet addresses are accepted')
        address_fields(source, address, required=True)
        if address in by_address:
            fail('E_SOURCE_SET', 'Duplicate native identity/action address')
        if source.get('source') != source_path(address):
            fail('E_SOURCE_PATH', 'Exact identity/action/bearing native source path is required')
        if not valid_hash(source.get('sha256')):
            fail('E_HASH_FORMAT', 'Each native source needs a lowercase SHA-256')
        registration_shape(source)
        if not strict_equal(source['referenceHeight'], references[sheet_key(identity, direction)]):
            fail('E_SHARED_REFERENCE', 'All stationary phases must share their own sheet upright stationary reference')
        by_address[address] = source
    if set(by_address) != set(ADDRESSES):
        fail('E_SOURCE_SET', 'A required native identity/action source is missing')
    if config.get('sourceReview') != REVIEW:
        fail('E_REVIEW_PATH', 'The exact independent v28 source review is required')
    raw_review = read_bytes(REVIEW, MAX_JSON_BYTES) if _review_bytes is None else _review_bytes
    if not valid_hash(config.get('sourceReviewSHA256')) or config['sourceReviewSHA256'] != digest(raw_review):
        fail('E_REVIEW_HASH', 'Independent review bytes changed')
    review = load_json(raw_review)
    if (review.get('acceptedForOptIn') is not True or review.get('independentReview') is not True
            or review.get('modelAssisted') is not True or review.get('sourceOnly') is not True
            or review.get('acceptedForLocalInstall') is not False
            or review.get('familyComplete') is not False
            or any(review.get(flag) is not False for flag in FLAGS)):
        fail('E_REVIEW_STATUS', 'Exact independent source-only opt-in acceptance is required')
    if not isinstance(review.get('reviewer'), str) or not review['reviewer'].strip():
        fail('E_REVIEWER', 'Independent reviewer identity is required')
    if review.get('reviewerModel') != 'gpt-6-astra' or review.get('reasoningEffort') != 'max':
        fail('E_REVIEW_MODEL', 'The requested independent Astra Max source review is required')
    if review.get('artPass') != VERSION:
        fail('E_REVIEW_VERSION', 'Review version does not match v28')
    optional_flags(review, 'E_REVIEW_STATUS')
    reject_angles(review)
    reject_legacy_sequences(review)
    if not strict_equal(review.get('referenceHeights'), references):
        fail('E_REVIEW_REFERENCE', 'Review per-sheet references do not match the registration')
    if 'pairScaleAccepted' in review or 'pairScaleAccepted' in config:
        fail('E_SCALE_SCOPE', 'A rejected march/stationary pair cannot certify the stationary-only scope')
    stationary_scale = review.get('stationaryScaleAccepted')
    if (not isinstance(stationary_scale, dict) or set(stationary_scale) != set(REFERENCE_KEYS)
            or any(value is not True for value in stationary_scale.values())):
        fail('E_STATIONARY_SCALE', 'Independent within-sheet stationary kit and scale acceptance is required')
    reviewed_sources = review.get('sources')
    if not isinstance(reviewed_sources, list) or len(reviewed_sources) != 4:
        fail('E_REVIEW_SET', 'The independent review must bind all four exact stationary sources')
    reviewed_by_path = {}
    expected_paths = {source_path(a): a for a in ADDRESSES}
    for reviewed in reviewed_sources:
        if (not isinstance(reviewed, dict) or not isinstance(reviewed.get('source'), str)
                or reviewed['source'] not in expected_paths):
            fail('E_REVIEW_SET', 'Review contains an incorrect native source address')
        path = reviewed['source']
        if path in reviewed_by_path or not valid_hash(reviewed.get('sha256')):
            fail('E_REVIEW_SET', 'Review has a duplicate or malformed source binding')
        address = expected_paths[path]
        address_fields(reviewed, address)
        if reviewed['sha256'] != by_address[address]['sha256']:
            fail('E_REVIEW_SET', 'Native source hash differs from the independent review')
        reviewed_by_path[path] = reviewed
    cache = {} if _native_cache is None else _native_cache
    results = []
    native_hashes = []
    for address in ADDRESSES:
        source = by_address[address]
        path = source_path(address)
        reviewed = reviewed_by_path[path].get('measurements')
        if not isinstance(reviewed, dict):
            fail('E_BINDING', 'Review must provide exact independent native measurements')
        address_fields(reviewed, address)
        keys = REGISTRATION_FIELDS + BODY_FIELDS + (MUZZLE_FIELDS if source['role'] == 'actions' else ())
        if any(key not in reviewed or not strict_equal(source[key], reviewed[key]) for key in keys):
            fail('E_BINDING', 'Registration differs from independently reviewed native measurements')
        raw = read_bytes(path, MAX_PNG_BYTES) if _source_bytes is None else _source_bytes[path]
        if len(raw) > MAX_PNG_BYTES or source['sha256'] != digest(raw):
            fail('E_SOURCE_HASH', 'Reviewed native source bytes changed')
        native_hashes.append(source['sha256'])
        native = native_sheet(raw, source['cell'], cache)
        records = []
        for index, raster in enumerate(native):
            root, roi = source['roots'][index], source['groundROIs'][index]
            _, ground = region_extrema(raster['solid'], roi, source['cell'])
            if ground != root[1]:
                fail('E_GROUND', 'Ground ROI does not reproduce the independently reviewed root Y')
            record = {'cell': index, 'rgbaSHA256': raster['rgbaSHA256'],
                      'ground': list(root), 'groundROI': list(roi),
                      'groundMethod': source['groundMethods'][index],
                      'solidBounds': raster['solidBounds'], 'solidPadding': raster['solidPadding'],
                      'nonzeroBounds': raster['nonzeroBounds']}
            cap, _ = region_extrema(raster['solid'], source['capROIs'][index], source['cell'])
            _, sole = region_extrema(raster['solid'], source['referenceSoleROIs'][index], source['cell'])
            if (source['capTop'][index] != cap or source['referenceSoleGroundY'][index] != sole
                    or source['bodySpans'][index] != sole - cap or sole <= cap):
                fail('E_BODY_MEASUREMENT', 'Native cap/near-sole pixels do not reproduce the independent body span')
            record.update({'capROI': source['capROIs'][index], 'capTop': cap,
                           'referenceSoleROI': source['referenceSoleROIs'][index],
                           'referenceSoleGroundY': sole, 'bodySpan': sole - cap})
            if source['role'] == 'actions' and index == 1:
                point, mouth_roi = source['muzzle'], source['muzzleROI']
                region_extrema(raster['solid'], mouth_roi, source['cell'])
                if not raster['solid'].getpixel((math.floor(point[0]), math.floor(point[1]))):
                    fail('E_MUZZLE_PIXEL', 'Reviewed barrel-mouth point must land on alpha>=64 fire-cell pixels')
                record.update({'muzzle': list(point), 'muzzleROI': list(mouth_roi),
                               'muzzleMethod': source['muzzleMethod']})
            records.append(record)
        results.append({'source': source, 'cells': records, 'pngBytes': raw})
    if len(set(native_hashes)) != 4:
        fail('E_DUPLICATE_SOURCE', 'The four identity/bearing stationary sources must contain distinct native PNG bytes')
    for result in results:
        source = result['source']
        key = sheet_key(source['identity'], source['direction'])
        spans = sorted(result['cells'][index]['bodySpan'] for index in REFERENCE_CELLS)
        # Three bounded integer upright spans: the middle integer is the exact
        # median; the half-up convention has no fractional tie to round.
        median = spans[1]
        if references[key] != median:
            fail('E_COMMON_REFERENCE', 'Each identity/bearing sheet needs its fresh ready/load/ram median across its stationary phases')
    return results


def expected_output_paths():
    result = set()
    for identity, _, cardinal in ADDRESSES:
        base = f'public/images/units/{VERSION}/union-{identity}-actions-{cardinal}'
        result.update((base + '.png', base + '.json',
                       f'docs/art-pass/reviews/{VERSION}-union-{identity}-actions-{cardinal}-measurement.json'))
    return result


def exports(config, results=None):
    results = inspect(config) if results is None else results
    outputs = {}
    total_clips = 0
    for result in results:
        source, cells = result['source'], result['cells']
        identity, role, direction = source['identity'], source['role'], source['direction']
        cardinal = 'n' if direction == 6 else 'nw'
        cell, height = source['cell'], source['referenceHeight']
        basename = f'union-{identity}-{role}-{cardinal}'
        png = f'public/images/units/{VERSION}/{basename}.png'
        names = frame_names(identity, direction, role)
        pivots = [{'x': round(x / cell, 6), 'y': round(y / cell, 6)} for x, y in source['roots']]
        specs = [('ready', [0]), ('fire', [1]), ('reload', [2, 3])]
        clips = []
        for action, indices in specs:
            clip = {'side': 'union', 'identity': identity, 'direction': direction, 'action': action,
                    'key': f'union-{VERSION}-{identity}-{role}-{cardinal}',
                    'frames': [names[i] for i in indices], 'pivots': [pivots[i] for i in indices],
                    'referenceHeight': height, 'sourceHash': source['sha256'],
                    'approval': {'reviewed': True, 'rejected': False},
                    SEQUENCE: f'{VERSION}-union-{identity}-{cardinal}',
                    'scope': f'Exact source-reviewed Union {identity.upper()} {cardinal.upper()} opt-in only; incomplete family',
                    'familyComplete': False, **{flag: False for flag in FLAGS}}
            if action == 'fire':
                clip['muzzles'] = [{'x': round(source['muzzle'][0] / cell, 6),
                                   'y': round(source['muzzle'][1] / cell, 6)}]
            clips.append(clip)
        total_clips += len(clips)
        frames = {name: {'frame': {'x': i % 2 * cell, 'y': i // 2 * cell, 'w': cell, 'h': cell},
                         'rotated': False, 'trimmed': False, 'sourceSize': {'w': cell, 'h': cell},
                         'spriteSourceSize': {'x': 0, 'y': 0, 'w': cell, 'h': cell},
                         'pivot': pivots[i], 'bodyHeight': height} for i, name in enumerate(names)}
        atlas = {'frames': frames, 'meta': {'image': basename + '.png',
                 'size': {'w': cell * 2, 'h': cell * 2}, 'sha256': source['sha256'],
                 'source': source['source'], 'artPass': VERSION, 'candidate': True,
                 'clips': clips, 'sourceReview': REVIEW,
                 'sourceReviewSHA256': config['sourceReviewSHA256'],
                 'referenceHeight': height, 'familyComplete': False,
                 'familyApproved': False, 'completeFamilyApproved': False,
                 'pixelTreatment': 'none; complete native PNG copied byte-identically',
                 **{flag: False for flag in FLAGS}}}
        measurement = {'artPass': VERSION, 'side': 'union', 'identity': identity,
                       'direction': direction, 'role': role, 'source': source['source'],
                       'sourceSHA256': source['sha256'], 'sourceReview': REVIEW,
                       'sourceReviewSHA256': config['sourceReviewSHA256'],
                       'referenceHeight': height, 'nativeSize': [cell * 2, cell * 2],
                       'scaleMethod': 'One fresh own-sheet ready/load/ram median shared across independently accepted stationary phases; fire span corroborates only, no phase normalization',
                       'referenceCellIndices': list(REFERENCE_CELLS), 'frameOrder': names,
                       'cells': cells, 'nativePixelChanges': False,
                       'phaseScaleNormalization': False, 'edgeOrFringeFreeCertified': False,
                       'familyComplete': False, 'clips': clips, **{flag: False for flag in FLAGS}}
        outputs[png] = result['pngBytes']
        outputs[png[:-4] + '.json'] = (json.dumps(atlas, indent=2, allow_nan=False) + '\n').encode()
        rel = f'docs/art-pass/reviews/{VERSION}-union-{identity}-{role}-{cardinal}-measurement.json'
        outputs[rel] = (json.dumps(measurement, indent=2, allow_nan=False) + '\n').encode()
    if len(outputs) != 12 or set(outputs) != expected_output_paths() or total_clips != 12:
        fail('E_EXPORT_SET', 'Exactly four whole PNGs, four atlases, four measurements and twelve stationary clips are required')
    return outputs


def verify_outputs(outputs):
    for relative, expected in outputs.items():
        limit = MAX_PNG_BYTES if relative.endswith('.png') else MAX_JSON_BYTES
        actual = read_bytes(relative, limit)
        if actual != expected:
            fail('E_EXPORT_BYTES', 'Native export changed: ' + relative)


def write_outputs(outputs):
    # Preflight every destination before creating any directory or file.
    destinations = {relative: bounded_file(relative) for relative in outputs}
    for relative, destination in destinations.items():
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(outputs[relative])


def paired_field(config, review, index, field, value):
    source = config['sources'][index]
    source[field] = copy.deepcopy(value)
    reviewed = next(s for s in review['sources'] if s['source'] == source['source'])
    reviewed['measurements'][field] = copy.deepcopy(value)


def negative_cases(config):
    """Each case names the invariant it must reach, including fully forged review bindings."""
    cases = []
    def add(name, code, mutation):
        cases.append((name, code, mutation))
    for flag in (*FLAGS, 'familyComplete'):
        add('config-' + flag, 'E_CONFIG_FLAGS', lambda c, r, f=flag: c.__setitem__(f, True))
    for flag in FLAGS:
        add('review-' + flag, 'E_REVIEW_STATUS', lambda c, r, f=flag: r.__setitem__(f, True))
    add('wrong-version', 'E_CONFIG_FLAGS', lambda c, r: c.__setitem__('artPass', 'gettysburg-v27'))
    add('missing-identity-reference', 'E_REFERENCE_MAP', lambda c, r: c['referenceHeights'].pop('a-n'))
    add('extra-identity-reference', 'E_REFERENCE_MAP', lambda c, r: c['referenceHeights'].__setitem__('other', 100))
    for value, label in ((True, 'bool'), (10 ** 1000, 'huge-int'), (float('nan'), 'nan'),
                         (float('inf'), 'infinity'), (0, 'zero'), (2048, 'out-of-bound')):
        add('reference-' + label, 'E_REFERENCE_VALUE',
            lambda c, r, v=value: c['referenceHeights'].__setitem__('a-n', v))
    add('missing-source', 'E_SOURCE_SET', lambda c, r: c['sources'].pop())
    add('duplicate-source-address', 'E_SOURCE_SET', lambda c, r: c['sources'].__setitem__(1, copy.deepcopy(c['sources'][0])))
    add('nonobject-source', 'E_SOURCE_SET', lambda c, r: c['sources'].__setitem__(0, None))
    add('wrong-review-path', 'E_REVIEW_PATH', lambda c, r: c.__setitem__('sourceReview', '../review.json'))
    for field in ('acceptedForOptIn', 'independentReview', 'modelAssisted', 'sourceOnly'):
        add('review-missing-' + field, 'E_REVIEW_STATUS', lambda c, r, f=field: r.pop(f))
        add('review-numeric-' + field, 'E_REVIEW_STATUS', lambda c, r, f=field: r.__setitem__(f, 1))
    add('review-local-install-approval', 'E_REVIEW_STATUS', lambda c, r: r.__setitem__('acceptedForLocalInstall', True))
    add('missing-local-install-boundary', 'E_REVIEW_STATUS', lambda c, r: r.pop('acceptedForLocalInstall'))
    add('missing-review-family-complete', 'E_REVIEW_STATUS', lambda c, r: r.pop('familyComplete'))
    add('missing-reviewer', 'E_REVIEWER', lambda c, r: r.__setitem__('reviewer', ' '))
    add('wrong-reviewer-model', 'E_REVIEW_MODEL', lambda c, r: r.__setitem__('reviewerModel', 'gpt-6-sol'))
    add('wrong-reviewer-effort', 'E_REVIEW_MODEL', lambda c, r: r.__setitem__('reasoningEffort', 'high'))
    add('wrong-review-version', 'E_REVIEW_VERSION', lambda c, r: r.__setitem__('artPass', 'gettysburg-v27'))
    add('review-complete-family', 'E_REVIEW_STATUS', lambda c, r: r.__setitem__('familyComplete', True))
    add('missing-reviewed-source', 'E_REVIEW_SET', lambda c, r: r['sources'].pop())
    add('duplicate-reviewed-source', 'E_REVIEW_SET', lambda c, r: r['sources'].__setitem__(1, copy.deepcopy(r['sources'][0])))
    add('wrong-reviewed-source', 'E_REVIEW_SET', lambda c, r: r['sources'][0].__setitem__('source', '../outside.png'))
    add('wrong-reviewed-hash', 'E_REVIEW_SET', lambda c, r: r['sources'][0].__setitem__('sha256', '0' * 64))
    add('forged-review-reference', 'E_REVIEW_REFERENCE',
        lambda c, r: r.__setitem__('referenceHeights', dict(c['referenceHeights'], **{'a-n': c['referenceHeights']['a-n'] + 1})))
    for field in ('familyApproved', 'completeFamilyApproved'):
        add('config-' + field, 'E_CONFIG_FLAGS', lambda c, r, f=field: c.__setitem__(f, True))
        add('review-' + field, 'E_REVIEW_STATUS', lambda c, r, f=field: r.__setitem__(f, True))
    add('missing-review-version', 'E_REVIEW_VERSION', lambda c, r: r.pop('artPass'))
    add('missing-review-reference-map', 'E_REVIEW_REFERENCE', lambda c, r: r.pop('referenceHeights'))
    for value, label in ((None, 'missing'), ({key: True for key in REFERENCE_KEYS[:-1]}, 'missing-sheet'),
                         ({**{key: True for key in REFERENCE_KEYS}, 'other': True}, 'extra-sheet'),
                         ({**{key: True for key in REFERENCE_KEYS}, 'a-n': 1}, 'numeric-approval'),
                         ({**{key: True for key in REFERENCE_KEYS}, 'a-n': False}, 'not-accepted')):
        add('stationary-scale-' + label, 'E_STATIONARY_SCALE', lambda c, r, v=value: r.__setitem__('stationaryScaleAccepted', v))
    add('stale-march-pair-scale-review', 'E_SCALE_SCOPE', lambda c, r: r.__setitem__('pairScaleAccepted', {'a': True, 'b': True}))
    add('stale-march-pair-scale-config', 'E_SCALE_SCOPE', lambda c, r: c.__setitem__('pairScaleAccepted', {'a': True, 'b': True}))
    for field in ('nativeReloadSequence', 'nativeContactSequence', 'nativeCasualtySequence', 'nativeUnionNortheastSequence'):
        add('config-legacy-' + field, 'E_SEQUENCE', lambda c, r, f=field: c.__setitem__(f, 'old-sequence'))
        add('review-legacy-' + field, 'E_SEQUENCE', lambda c, r, f=field: r.__setitem__(f, 'old-sequence'))
    for index, original in enumerate(config['sources']):
        prefix = sheet_key(original['identity'], original['direction']) + '-' + original['role']
        for field, value in (('side', 'other'), ('identity', 'other'), ('direction', False),
                             ('direction', 2), ('role', 'other'), ('action', 'walk')):
            add(prefix + '-wrong-' + field + '-' + str(value), 'E_ADDRESS',
                lambda c, r, i=index, f=field, v=value: c['sources'][i].__setitem__(f, v))
        add(prefix + '-rejected-march-role', 'E_ADDRESS', lambda c, r, i=index: c['sources'][i].__setitem__('role', 'march'))
        add(prefix + '-float-valid-direction', 'E_ADDRESS',
            lambda c, r, i=index: c['sources'][i].__setitem__('direction', float(c['sources'][i]['direction'])))
        for field in ('nativeReloadSequence', 'nativeContactSequence', 'nativeCasualtySequence', 'nativeUnionNortheastSequence'):
            add(prefix + '-forbidden-' + field, 'E_SEQUENCE',
                lambda c, r, i=index, f=field: c['sources'][i].__setitem__(f, 'old-sequence'))
        add(prefix + '-wrong-dedicated-sequence', 'E_SEQUENCE',
            lambda c, r, i=index: c['sources'][i].__setitem__(SEQUENCE, 'gettysburg-v27-union-a-ne'))
        add(prefix + '-missing-frame-order', 'E_FRAME_ORDER',
            lambda c, r, i=index: paired_field(c, r, i, 'frameOrder', []))
        def duplicate_frame(c, r, i=index):
            frames = list(c['sources'][i]['frameOrder']); frames[1] = frames[0]
            paired_field(c, r, i, 'frameOrder', frames)
        add(prefix + '-duplicate-frame-order', 'E_FRAME_ORDER', duplicate_frame)
        def swap_frame(c, r, i=index):
            frames = list(c['sources'][i]['frameOrder']); frames[0], frames[1] = frames[1], frames[0]
            paired_field(c, r, i, 'frameOrder', frames)
        add(prefix + '-swapped-frame-order', 'E_FRAME_ORDER', swap_frame)
        add(prefix + '-wrong-path', 'E_SOURCE_PATH',
            lambda c, r, i=index: c['sources'][i].__setitem__('source', '../outside.png'))
        add(prefix + '-hash-type', 'E_HASH_FORMAT',
            lambda c, r, i=index: c['sources'][i].__setitem__('sha256', True))
        def forged_hash(c, r, i=index):
            source = c['sources'][i]
            source['sha256'] = '0' * 64
            next(s for s in r['sources'] if s['source'] == source['source'])['sha256'] = source['sha256']
        add(prefix + '-forged-matching-source-hash', 'E_SOURCE_HASH', forged_hash)
        for value, label in ((True, 'bool'), (10 ** 1000, 'huge-int'), (63, 'small'), (2049, 'large')):
            add(prefix + '-cell-' + label, 'E_CELL',
                lambda c, r, i=index, v=value: paired_field(c, r, i, 'cell', v))
        add(prefix + '-forged-cell-size', 'E_NATIVE',
            lambda c, r, i=index: paired_field(c, r, i, 'cell',
                c['sources'][i]['cell'] + (1 if c['sources'][i]['cell'] < 2048 else -1)))
        add(prefix + '-wrong-shared-reference', 'E_SHARED_REFERENCE',
            lambda c, r, i=index: paired_field(c, r, i, 'referenceHeight', c['sources'][i]['referenceHeight'] + 1))
        add(prefix + '-missing-roots', 'E_REGISTRATION', lambda c, r, i=index: paired_field(c, r, i, 'roots', []))
        add(prefix + '-missing-ground-rois', 'E_REGISTRATION', lambda c, r, i=index: paired_field(c, r, i, 'groundROIs', []))
        add(prefix + '-missing-methods', 'E_REGISTRATION', lambda c, r, i=index: paired_field(c, r, i, 'groundMethods', []))
        def root_value(c, r, i, axis, value, paired=True):
            roots = copy.deepcopy(c['sources'][i]['roots']); roots[0][axis] = value
            if paired:
                paired_field(c, r, i, 'roots', roots)
            else:
                c['sources'][i]['roots'] = roots
        for axis in (0, 1):
            for value, label in ((True, 'bool'), (10 ** 1000, 'huge-int'), (-1, 'negative')):
                add(prefix + f'-root-{axis}-' + label, 'E_ROOT',
                    lambda c, r, i=index, a=axis, v=value: root_value(c, r, i, a, v))
            add(prefix + f'-root-{axis}-cell-edge', 'E_ROOT',
                lambda c, r, i=index, a=axis: root_value(c, r, i, a, c['sources'][i]['cell']))
        add(prefix + '-root-nan', 'E_ROOT',
            lambda c, r, i=index: root_value(c, r, i, 0, float('nan'), paired=False))
        add(prefix + '-forged-ground-y', 'E_GROUND',
            lambda c, r, i=index: root_value(c, r, i, 1, c['sources'][i]['roots'][0][1] - 0.5))
        add(prefix + '-unbound-root-x', 'E_BINDING',
            lambda c, r, i=index: root_value(c, r, i, 0,
                c['sources'][i]['cell'] / 2 +
                (0.25 if c['sources'][i]['roots'][0][0] == c['sources'][i]['cell'] / 2 else 0),
                paired=False))
        def roi_value(c, r, i, roi):
            rois = copy.deepcopy(c['sources'][i]['groundROIs']); rois[0] = roi
            paired_field(c, r, i, 'groundROIs', rois)
        for roi, label in (([0, 0, True, 2], 'bool'), ([0, 0, 10 ** 1000, 2], 'huge-int'),
                           ([0, 0, 0, 2], 'empty'), ([-1, 0, 2, 2], 'negative')):
            add(prefix + '-roi-' + label, 'E_ROI', lambda c, r, i=index, v=roi: roi_value(c, r, i, v))
        add(prefix + '-forged-empty-ground-support', 'E_EMPTY_ROI',
            lambda c, r, i=index: roi_value(c, r, i, [0, 0, 8, 8]))
        def empty_method(c, r, i=index):
            methods = list(c['sources'][i]['groundMethods']); methods[0] = ' '
            paired_field(c, r, i, 'groundMethods', methods)
        add(prefix + '-empty-ground-interpretation', 'E_METHOD', empty_method)
        add(prefix + '-angle-metadata', 'E_ANGLE', lambda c, r, i=index: c['sources'][i].__setitem__('angle', 0))
        add(prefix + '-source-certification', 'E_SOURCE_FLAGS',
            lambda c, r, i=index: c['sources'][i].__setitem__('productionApproved', True))
        def missing_binding(c, r, i=index):
            next(s for s in r['sources'] if s['source'] == c['sources'][i]['source'])['measurements'].pop('roots')
        add(prefix + '-missing-review-registration', 'E_BINDING', missing_binding)
        for field in BODY_FIELDS:
            add(prefix + '-missing-' + field, 'E_BODY_FIELDS',
                lambda c, r, i=index, f=field: paired_field(c, r, i, f, []))
        for field in ('capTop', 'referenceSoleGroundY', 'bodySpans'):
            def boolean_measurement(c, r, i=index, f=field):
                values = list(c['sources'][i][f]); values[0] = True
                paired_field(c, r, i, f, values)
            add(prefix + '-boolean-' + field, 'E_BODY_MEASUREMENT', boolean_measurement)
        def forged_cap_span(c, r, i=index):
            source = c['sources'][i]
            tops = list(source['capTop']); spans = list(source['bodySpans'])
            tops[0] += 1; spans[0] -= 1
            paired_field(c, r, i, 'capTop', tops); paired_field(c, r, i, 'bodySpans', spans)
        add(prefix + '-forged-pixel-cap-span', 'E_BODY_MEASUREMENT', forged_cap_span)
        for field in ('capROIs', 'referenceSoleROIs'):
            def empty_reference(c, r, i=index, f=field):
                rois = copy.deepcopy(c['sources'][i][f]); rois[0] = [0, 0, 8, 8]
                paired_field(c, r, i, f, rois)
            add(prefix + '-forged-empty-' + field, 'E_EMPTY_ROI', empty_reference)
        if original['role'] == 'actions':
            for value, label in ((None, 'missing'), ([], 'empty'), ([True, 1], 'bool'),
                                 ([10 ** 1000, 1], 'huge-int'), ([-1, 1], 'negative')):
                add(prefix + '-muzzle-' + label, 'E_MUZZLE',
                    lambda c, r, i=index, v=value: paired_field(c, r, i, 'muzzle', v))
            add(prefix + '-muzzle-cell-edge', 'E_MUZZLE',
                lambda c, r, i=index: paired_field(c, r, i, 'muzzle', [c['sources'][i]['cell'], 1]))
            for value, label in ((None, 'missing'), ([0, 0, True, 2], 'bool'),
                                 ([0, 0, 10 ** 1000, 2], 'huge-int'), ([0, 0, 0, 2], 'empty')):
                add(prefix + '-muzzle-roi-' + label, 'E_ROI',
                    lambda c, r, i=index, v=value: paired_field(c, r, i, 'muzzleROI', v))
            add(prefix + '-empty-muzzle-interpretation', 'E_METHOD',
                lambda c, r, i=index: paired_field(c, r, i, 'muzzleMethod', ' '))
            def outside_mouth_roi(c, r, i=index):
                paired_field(c, r, i, 'muzzle', [1, 1])
                paired_field(c, r, i, 'muzzleROI', [2, 2, 4, 4])
            add(prefix + '-muzzle-outside-reviewed-roi', 'E_MUZZLE', outside_mouth_roi)
            def empty_mouth_roi(c, r, i=index):
                paired_field(c, r, i, 'muzzle', [1, 1])
                paired_field(c, r, i, 'muzzleROI', [0, 0, 8, 8])
            add(prefix + '-forged-empty-mouth-roi', 'E_EMPTY_ROI', empty_mouth_roi)
            def transparent_mouth_point(c, r, i=index):
                cell = c['sources'][i]['cell']
                paired_field(c, r, i, 'muzzle', [1, 1])
                paired_field(c, r, i, 'muzzleROI', [0, 0, cell, cell])
            add(prefix + '-forged-mouth-on-transparent-padding', 'E_MUZZLE_PIXEL', transparent_mouth_point)
            add(prefix + '-unbound-muzzle-interpretation', 'E_BINDING',
                lambda c, r, i=index: c['sources'][i].__setitem__('muzzleMethod', 'unreviewed replacement method'))
        else:
            add(prefix + '-wrong-source-muzzle', 'E_MUZZLE_SOURCE',
                lambda c, r, i=index: c['sources'][i].__setitem__('muzzle', [1, 1]))
    for key in REFERENCE_KEYS:
        def forged_median(c, r, sheet=key):
            c['referenceHeights'][sheet] += 1
            if 'referenceHeights' in r:
                r['referenceHeights'] = copy.deepcopy(c['referenceHeights'])
            for i, source in enumerate(c['sources']):
                if sheet_key(source['identity'], source['direction']) == sheet:
                    paired_field(c, r, i, 'referenceHeight', c['referenceHeights'][sheet])
        add(key + '-forged-stationary-median', 'E_COMMON_REFERENCE', forged_median)
    return cases


def expect_rejection(name, code, operation):
    try:
        operation()
    except ValidationError as exc:
        if exc.code != code:
            fail('E_SELF_TEST', f'{name} reached {exc.code}, expected {code}')
        return
    fail('E_SELF_TEST', 'Forged native record was accepted: ' + name)


def self_test(config, results, cache):
    review = load_json(read_bytes(REVIEW, MAX_JSON_BYTES))
    source_bytes = {r['source']['source']: r['pngBytes'] for r in results}
    cases = negative_cases(config)
    for name, code, mutate in cases:
        forged_config, forged_review = copy.deepcopy(config), copy.deepcopy(review)
        mutate(forged_config, forged_review)
        raw_review = json.dumps(forged_review, allow_nan=False).encode()
        # Rebind bytes deliberately, so paired record forgeries must fail the
        # stated geometry/coverage invariant rather than merely a stale hash.
        forged_config['sourceReviewSHA256'] = digest(raw_review)
        expect_rejection(name, code, lambda: inspect(forged_config, _review_bytes=raw_review,
                         _source_bytes=source_bytes, _native_cache=cache))
    extras = 0
    for relative in ('../outside.png', '/tmp/outside.png', './docs/source.png', 'docs\\source.png'):
        expect_rejection('noncanonical-path-' + relative, 'E_PATH', lambda p=relative: bounded_file(p))
        extras += 1
    for raw in (b'{"sources": [], "sources": []}', b'{"coordinate": NaN}',
                b'{"coordinate": Infinity}', b'[]'):
        expect_rejection('ambiguous-or-nonfinite-json', 'E_JSON', lambda b=raw: load_json(b))
        extras += 1
    # Force the JSON integer digit-limit path without converting the number to
    # float or changing process-wide Python integer parsing settings.
    if hasattr(sys, 'get_int_max_str_digits') and sys.get_int_max_str_digits():
        raw = b'{"coordinate": ' + b'9' * (sys.get_int_max_str_digits() + 1) + b'}'
        expect_rejection('excessive-json-integer', 'E_JSON', lambda: load_json(raw))
        extras += 1
    hashes = [c['rgbaSHA256'] for c in results[0]['cells']]
    expect_rejection('forged-duplicate-native-phase-record', 'E_DUPLICATE_PHASE',
                     lambda: unique_phase_digests([hashes[0], hashes[0], hashes[2], hashes[3]]))
    extras += 1
    stale = copy.deepcopy(config); stale['sourceReviewSHA256'] = '0' * 64
    expect_rejection('stale-review-byte-hash', 'E_REVIEW_HASH', lambda: inspect(stale,
                     _source_bytes=source_bytes, _native_cache=cache))
    extras += 1
    # Reuse the entire original A stationary PNG as B stationary with fully
    # forged matching measurements/references. No PNG is created or edited.
    forged_config, forged_review = copy.deepcopy(config), copy.deepcopy(review)
    a_actions = next(s for s in forged_config['sources'] if s['identity'] == 'a' and s['direction'] == 6)
    b_actions = next(s for s in forged_config['sources'] if s['identity'] == 'b' and s['direction'] == 6)
    forged_config['referenceHeights']['b-n'] = forged_config['referenceHeights']['a-n']
    forged_review['referenceHeights'] = copy.deepcopy(forged_config['referenceHeights'])
    for i, source in enumerate(forged_config['sources']):
        if source['identity'] == 'b' and source['direction'] == 6:
            paired_field(forged_config, forged_review, i, 'referenceHeight', forged_config['referenceHeights']['b-n'])
    for field in REGISTRATION_FIELDS + BODY_FIELDS + MUZZLE_FIELDS:
        if field != 'frameOrder':
            b_actions[field] = copy.deepcopy(a_actions[field])
    b_actions['sha256'] = a_actions['sha256']
    bound = next(s for s in forged_review['sources'] if s['source'] == b_actions['source'])
    bound['sha256'] = b_actions['sha256']
    for field in REGISTRATION_FIELDS + BODY_FIELDS + MUZZLE_FIELDS:
        bound['measurements'][field] = copy.deepcopy(b_actions[field])
    raw_review = json.dumps(forged_review, allow_nan=False).encode()
    forged_config['sourceReviewSHA256'] = digest(raw_review)
    swapped = dict(source_bytes); swapped[b_actions['source']] = source_bytes[a_actions['source']]
    expect_rejection('forged-whole-PNG-identity-duplication', 'E_DUPLICATE_SOURCE',
                     lambda: inspect(forged_config, _review_bytes=raw_review,
                     _source_bytes=swapped, _native_cache=cache))
    return len(cases) + extras + 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify all 12 exports and rejection cases')
    parser.add_argument('--self-test', action='store_true', help='Verify all 12 exports and rejection cases')
    args = parser.parse_args()
    config = load_json(read_bytes(CONFIG, MAX_JSON_BYTES))
    cache = {}
    results = inspect(config, _native_cache=cache)
    outputs = exports(config, results)
    checking = args.check or args.self_test
    negative_count = None
    if checking:
        verify_outputs(outputs)
        negative_count = self_test(config, results, cache)
    else:
        write_outputs(outputs)
        verify_outputs(outputs)
    print(json.dumps({'artPass': VERSION, 'checked': checking, 'outputs': len(outputs),
                      'wholePNGs': 4, 'atlasJSONs': 4, 'measurementJSONs': 4, 'nativeClips': 12,
                      'sourceAuthorNegativeCasesPassed': negative_count,
                      'nativePixelChanges': False, 'phaseScaleNormalization': False,
                      'familyComplete': False, **{flag: False for flag in FLAGS}}))


if __name__ == '__main__':
    try:
        main()
    except (ValidationError, OSError, ValueError, TypeError, OverflowError, RecursionError) as exc:
        print(json.dumps({'artPass': VERSION, 'accepted': False, 'error': str(exc)}), file=sys.stderr)
        raise SystemExit(1)
