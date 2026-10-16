#!/usr/bin/env python3
"""Validate independent native v23 registrations and copy whole PNG bytes.

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
VERSION = 'gettysburg-v23'
CONFIG = f'docs/art-pass/manifests/{VERSION}-source-annotations.json'
REVIEW = f'docs/art-pass/reviews/{VERSION}-independent-contact-casualty-source-review.json'
ROLES = {'contact': ('melee', 'nativeContactSequence'),
         'casualty': ('fall', 'nativeCasualtySequence')}
FLAGS = ('productionApproved', 'defaultApproved', 'humanCertified',
         'physicalAnatomyCertified', 'historicalDrillCertified')
ADDRESSES = tuple((side, role, direction, cardinal)
                  for side, direction, cardinal in (('union', 6, 'n'), ('confederate', 2, 's'))
                  for role in ROLES)
REGISTRATION_FIELDS = ('cell', 'referenceHeight', 'roots', 'groundROIs', 'groundMethods')
CONTACT_FIELDS = ('capROIs', 'capTop', 'referenceSoleROIs', 'referenceSoleGroundY', 'bodySpans')
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
    side, role, _, cardinal = address
    return f'docs/art-pass/candidates/{VERSION}/{side}-a-{role}-{cardinal}-candidate.png'


def reject_angles(record):
    if isinstance(record, dict):
        if any('angle' in str(key).lower() for key in record):
            fail('E_ANGLE', 'Native cardinal registration must not introduce angle metadata')
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
    side, role, direction, _ = address
    expected = {'side': side, 'identity': 'a', 'direction': direction, 'role': role,
                'action': ROLES[role][0]}
    for field, value in expected.items():
        if (required and field != 'action') or field in record:
            if (record.get(field) != value
                    or (field == 'direction' and type(record.get(field)) is not int)):
                fail('E_ADDRESS', 'Exact side/identity/direction/role/action address is required')
    optional_flags(record, 'E_SOURCE_FLAGS')
    reject_angles(record)


def reference_map(value):
    if not isinstance(value, dict) or set(value) != {'union', 'confederate'}:
        fail('E_REFERENCE_MAP', 'Exactly one contact reference per army is required')
    if any(not finite(height) or not 0 < height < 2048 for height in value.values()):
        fail('E_REFERENCE_VALUE', 'Army reference heights must be bounded finite numbers')


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
    if source['role'] == 'contact':
        if any(not isinstance(source.get(k), list) or len(source[k]) != 4 for k in CONTACT_FIELDS):
            fail('E_CONTACT_FIELDS', 'Contact references need four fresh cap/sole ROI records')
        for index in range(4):
            bounds(source['capROIs'][index], cell)
            bounds(source['referenceSoleROIs'][index], cell)
            top = source['capTop'][index]
            ground = source['referenceSoleGroundY'][index]
            span = source['bodySpans'][index]
            if (any(type(v) is not int for v in (top, ground, span))
                    or not 0 <= top < ground <= cell or span != ground - top):
                fail('E_CONTACT_MEASUREMENT', 'Contact cap/sole spans need exact bounded integer measurements')


def inspect(config, *, _review_bytes=None, _source_bytes=None, _native_cache=None):
    """Inspect real files; private byte inputs let negative checks forge records in memory."""
    if not isinstance(config, dict):
        fail('E_CONFIG', 'The registration must be an object')
    if (config.get('artPass') != VERSION or config.get('familyComplete') is not False
            or any(config.get(flag) is not False for flag in FLAGS)):
        fail('E_CONFIG_FLAGS', 'Only explicitly unapproved incomplete v23 opt-in art is accepted')
    reject_angles(config)
    references = config.get('referenceHeights')
    reference_map(references)
    sources = config.get('sources')
    if not isinstance(sources, list) or len(sources) != 4:
        fail('E_SOURCE_SET', 'Exactly four native army/action sources are required')
    by_address = {}
    for source in sources:
        if not isinstance(source, dict):
            fail('E_SOURCE_SET', 'Every source must be a registration object')
        side, role = source.get('side'), source.get('role')
        address = next((a for a in ADDRESSES if a[:2] == (side, role)), None)
        if address is None:
            fail('E_ADDRESS', 'Only Union A N and Confederate A S contact/casualty addresses are accepted')
        address_fields(source, address, required=True)
        if address in by_address:
            fail('E_SOURCE_SET', 'Duplicate native army/action address')
        if source.get('source') != source_path(address):
            fail('E_SOURCE_PATH', 'Exact army/action/cardinal native source path is required')
        if not valid_hash(source.get('sha256')):
            fail('E_HASH_FORMAT', 'Each native source needs a lowercase SHA-256')
        registration_shape(source)
        if not strict_equal(source['referenceHeight'], references[side]):
            fail('E_SHARED_REFERENCE', 'Contact and casualty must share their army contact reference')
        by_address[address] = source
    if set(by_address) != set(ADDRESSES):
        fail('E_SOURCE_SET', 'A required native army/action source is missing')
    if config.get('sourceReview') != REVIEW:
        fail('E_REVIEW_PATH', 'The exact independent v23 source review is required')
    raw_review = read_bytes(REVIEW, MAX_JSON_BYTES) if _review_bytes is None else _review_bytes
    if not valid_hash(config.get('sourceReviewSHA256')) or config['sourceReviewSHA256'] != digest(raw_review):
        fail('E_REVIEW_HASH', 'Independent review bytes changed')
    review = load_json(raw_review)
    if (review.get('acceptedForOptIn') is not True or review.get('independentReview') is not True
            or review.get('modelAssisted') is not True
            or any(review.get(flag) is not False for flag in FLAGS)):
        fail('E_REVIEW_STATUS', 'Exact independent source-only opt-in acceptance is required')
    if not isinstance(review.get('reviewer'), str) or not review['reviewer'].strip():
        fail('E_REVIEWER', 'Independent reviewer identity is required')
    if review.get('reviewerModel') != 'gpt-6-astra' or review.get('reasoningEffort') != 'max':
        fail('E_REVIEW_MODEL', 'The requested independent Astra Max source review is required')
    if 'artPass' in review and review['artPass'] != VERSION:
        fail('E_REVIEW_VERSION', 'Review version does not match v23')
    optional_flags(review, 'E_REVIEW_STATUS')
    reject_angles(review)
    if 'referenceHeights' in review and not strict_equal(review['referenceHeights'], references):
        fail('E_REVIEW_REFERENCE', 'Review army references do not match the registration')
    reviewed_sources = review.get('sources')
    if not isinstance(reviewed_sources, list) or len(reviewed_sources) != 4:
        fail('E_REVIEW_SET', 'The independent review must bind all four exact sources')
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
        keys = REGISTRATION_FIELDS + (CONTACT_FIELDS if source['role'] == 'contact' else ())
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
            if source['role'] == 'contact':
                cap, _ = region_extrema(raster['solid'], source['capROIs'][index], source['cell'])
                _, sole = region_extrema(raster['solid'], source['referenceSoleROIs'][index], source['cell'])
                if (source['capTop'][index] != cap or source['referenceSoleGroundY'][index] != sole
                        or source['bodySpans'][index] != sole - cap or sole <= cap):
                    fail('E_CONTACT_MEASUREMENT', 'Native cap/sole pixels do not reproduce the contact reference')
                record.update({'capROI': source['capROIs'][index], 'capTop': cap,
                               'referenceSoleROI': source['referenceSoleROIs'][index],
                               'referenceSoleGroundY': sole, 'bodySpan': sole - cap})
            records.append(record)
        results.append({'source': source, 'cells': records, 'pngBytes': raw})
    if len(set(native_hashes)) != 4:
        fail('E_DUPLICATE_SOURCE', 'The four army/action sources must contain distinct native PNG bytes')
    for side in references:
        spans = sorted(next(r['cells'] for r in results
                            if r['source']['side'] == side and r['source']['role'] == 'contact'),
                       key=lambda record: record['bodySpan'])
        # Four bounded integer spans: exact half-up median without float math.
        median = (spans[1]['bodySpan'] + spans[2]['bodySpan'] + 1) // 2
        if references[side] != median:
            fail('E_COMMON_REFERENCE', 'Each army needs its fresh half-up contact median shared across its pair')
    return results


def expected_output_paths():
    result = set()
    for side, role, _, cardinal in ADDRESSES:
        base = f'public/images/units/{VERSION}/{side}-a-{role}-{cardinal}'
        result.update((base + '.png', base + '.json',
                       f'docs/art-pass/reviews/{VERSION}-{side}-{role}-measurement.json'))
    return result


def exports(config, results=None):
    results = inspect(config) if results is None else results
    outputs = {}
    for result in results:
        source, cells = result['source'], result['cells']
        side, role, direction = (source[k] for k in ('side', 'role', 'direction'))
        cardinal = 'n' if side == 'union' else 's'
        action, marker = ROLES[role]
        cell, height = source['cell'], source['referenceHeight']
        basename = f'{side}-a-{role}-{cardinal}'
        png = f'public/images/units/{VERSION}/{basename}.png'
        names = [f'a-{action}-{direction}-{i}' for i in range(4)]
        pivots = [{'x': round(x / cell, 6), 'y': round(y / cell, 6)} for x, y in source['roots']]
        clip = {'side': side, 'identity': 'a', 'direction': direction, 'action': action,
                'key': f'{side}-{VERSION}-a-{role}-{cardinal}', 'frames': names,
                'pivots': pivots, 'referenceHeight': height, 'sourceHash': source['sha256'],
                'approval': {'reviewed': True, 'rejected': False},
                marker: f'{VERSION}-{side}-a-{cardinal}-{role}',
                'scope': f'Exact source-reviewed {side} A {cardinal.upper()} local opt-in only; incomplete family',
                'familyComplete': False, **{flag: False for flag in FLAGS}}
        frames = {name: {'frame': {'x': i % 2 * cell, 'y': i // 2 * cell, 'w': cell, 'h': cell},
                         'rotated': False, 'trimmed': False, 'sourceSize': {'w': cell, 'h': cell},
                         'spriteSourceSize': {'x': 0, 'y': 0, 'w': cell, 'h': cell},
                         'pivot': pivots[i], 'bodyHeight': height} for i, name in enumerate(names)}
        atlas = {'frames': frames, 'meta': {'image': basename + '.png',
                 'size': {'w': cell * 2, 'h': cell * 2}, 'sha256': source['sha256'],
                 'source': source['source'], 'artPass': VERSION, 'candidate': True,
                 'clips': [clip], 'sourceReview': REVIEW,
                 'sourceReviewSHA256': config['sourceReviewSHA256'],
                 'referenceHeight': height, 'familyComplete': False,
                 'familyApproved': False, 'completeFamilyApproved': False,
                 'pixelTreatment': 'none; complete native PNG copied byte-identically',
                 **{flag: False for flag in FLAGS}}}
        measurement = {'artPass': VERSION, 'side': side, 'identity': 'a',
                       'direction': direction, 'role': role, 'source': source['source'],
                       'sourceSHA256': source['sha256'], 'sourceReview': REVIEW,
                       'sourceReviewSHA256': config['sourceReviewSHA256'],
                       'referenceHeight': height, 'nativeSize': [cell * 2, cell * 2],
                       'scaleMethod': f'One fresh {side} contact median shared across contact/casualty natural postures; no phase normalization',
                       'cells': cells, 'nativePixelChanges': False,
                       'phaseScaleNormalization': False, 'edgeOrFringeFreeCertified': False,
                       'familyComplete': False, 'clips': [clip], **{flag: False for flag in FLAGS}}
        outputs[png] = result['pngBytes']
        outputs[png[:-4] + '.json'] = (json.dumps(atlas, indent=2, allow_nan=False) + '\n').encode()
        rel = f'docs/art-pass/reviews/{VERSION}-{side}-{role}-measurement.json'
        outputs[rel] = (json.dumps(measurement, indent=2, allow_nan=False) + '\n').encode()
    if len(outputs) != 12 or set(outputs) != expected_output_paths():
        fail('E_EXPORT_SET', 'Exactly four whole PNGs, four atlases, and four measurements are required')
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
    add('wrong-version', 'E_CONFIG_FLAGS', lambda c, r: c.__setitem__('artPass', 'gettysburg-v22'))
    add('missing-army-reference', 'E_REFERENCE_MAP', lambda c, r: c['referenceHeights'].pop('union'))
    add('extra-army-reference', 'E_REFERENCE_MAP', lambda c, r: c['referenceHeights'].__setitem__('other', 100))
    for value, label in ((True, 'bool'), (10 ** 1000, 'huge-int'), (float('nan'), 'nan'),
                         (float('inf'), 'infinity'), (0, 'zero'), (2048, 'out-of-bound')):
        add('reference-' + label, 'E_REFERENCE_VALUE',
            lambda c, r, v=value: c['referenceHeights'].__setitem__('union', v))
    add('missing-source', 'E_SOURCE_SET', lambda c, r: c['sources'].pop())
    add('duplicate-source-address', 'E_SOURCE_SET', lambda c, r: c['sources'].__setitem__(1, copy.deepcopy(c['sources'][0])))
    add('nonobject-source', 'E_SOURCE_SET', lambda c, r: c['sources'].__setitem__(0, None))
    add('wrong-review-path', 'E_REVIEW_PATH', lambda c, r: c.__setitem__('sourceReview', '../review.json'))
    for field in ('acceptedForOptIn', 'independentReview', 'modelAssisted'):
        add('review-missing-' + field, 'E_REVIEW_STATUS', lambda c, r, f=field: r.pop(f))
        add('review-numeric-' + field, 'E_REVIEW_STATUS', lambda c, r, f=field: r.__setitem__(f, 1))
    add('missing-reviewer', 'E_REVIEWER', lambda c, r: r.__setitem__('reviewer', ' '))
    add('wrong-reviewer-model', 'E_REVIEW_MODEL', lambda c, r: r.__setitem__('reviewerModel', 'gpt-6-sol'))
    add('wrong-reviewer-effort', 'E_REVIEW_MODEL', lambda c, r: r.__setitem__('reasoningEffort', 'high'))
    add('wrong-review-version', 'E_REVIEW_VERSION', lambda c, r: r.__setitem__('artPass', 'gettysburg-v22'))
    add('review-complete-family', 'E_REVIEW_STATUS', lambda c, r: r.__setitem__('familyComplete', True))
    add('missing-reviewed-source', 'E_REVIEW_SET', lambda c, r: r['sources'].pop())
    add('duplicate-reviewed-source', 'E_REVIEW_SET', lambda c, r: r['sources'].__setitem__(1, copy.deepcopy(r['sources'][0])))
    add('wrong-reviewed-source', 'E_REVIEW_SET', lambda c, r: r['sources'][0].__setitem__('source', '../outside.png'))
    add('wrong-reviewed-hash', 'E_REVIEW_SET', lambda c, r: r['sources'][0].__setitem__('sha256', '0' * 64))
    add('forged-review-reference', 'E_REVIEW_REFERENCE',
        lambda c, r: r.__setitem__('referenceHeights', {'union': c['referenceHeights']['union'] + 1,
                                                       'confederate': c['referenceHeights']['confederate']}))
    for index, original in enumerate(config['sources']):
        prefix = original['side'] + '-' + original['role']
        for field, value in (('side', 'other'), ('identity', 'b'), ('direction', True),
                             ('direction', 4), ('role', 'march'), ('action', 'walk')):
            add(prefix + '-wrong-' + field + '-' + str(value), 'E_ADDRESS',
                lambda c, r, i=index, f=field, v=value: c['sources'][i].__setitem__(f, v))
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
        if original['role'] == 'contact':
            for field in CONTACT_FIELDS:
                add(prefix + '-missing-' + field, 'E_CONTACT_FIELDS',
                    lambda c, r, i=index, f=field: paired_field(c, r, i, f, []))
            for field in ('capTop', 'referenceSoleGroundY', 'bodySpans'):
                def boolean_measurement(c, r, i=index, f=field):
                    values = list(c['sources'][i][f]); values[0] = True
                    paired_field(c, r, i, f, values)
                add(prefix + '-boolean-' + field, 'E_CONTACT_MEASUREMENT', boolean_measurement)
            def forged_cap_span(c, r, i=index):
                source = c['sources'][i]
                tops = list(source['capTop']); spans = list(source['bodySpans'])
                tops[0] += 1; spans[0] -= 1
                paired_field(c, r, i, 'capTop', tops); paired_field(c, r, i, 'bodySpans', spans)
            add(prefix + '-forged-pixel-cap-span', 'E_CONTACT_MEASUREMENT', forged_cap_span)
            for field in ('capROIs', 'referenceSoleROIs'):
                def empty_reference(c, r, i=index, f=field):
                    rois = copy.deepcopy(c['sources'][i][f]); rois[0] = [0, 0, 8, 8]
                    paired_field(c, r, i, f, rois)
                add(prefix + '-forged-empty-' + field, 'E_EMPTY_ROI', empty_reference)
    for side in ('union', 'confederate'):
        def forged_median(c, r, army=side):
            c['referenceHeights'][army] += 1
            if 'referenceHeights' in r:
                r['referenceHeights'] = copy.deepcopy(c['referenceHeights'])
            for i, source in enumerate(c['sources']):
                if source['side'] == army:
                    paired_field(c, r, i, 'referenceHeight', c['referenceHeights'][army])
        add(side + '-forged-pair-median', 'E_COMMON_REFERENCE', forged_median)
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
    # Reuse an entire original contact PNG, with matching forged annotations,
    # as its casualty source. No PNG is created or edited for this check.
    forged_config, forged_review = copy.deepcopy(config), copy.deepcopy(review)
    indices = {s['role']: i for i, s in enumerate(forged_config['sources']) if s['side'] == 'union'}
    contact = forged_config['sources'][indices['contact']]
    casualty = forged_config['sources'][indices['casualty']]
    for field in REGISTRATION_FIELDS:
        casualty[field] = copy.deepcopy(contact[field])
    casualty['sha256'] = contact['sha256']
    bound = next(s for s in forged_review['sources'] if s['source'] == casualty['source'])
    bound['sha256'] = casualty['sha256']
    for field in REGISTRATION_FIELDS:
        bound['measurements'][field] = copy.deepcopy(casualty[field])
    raw_review = json.dumps(forged_review, allow_nan=False).encode()
    forged_config['sourceReviewSHA256'] = digest(raw_review)
    swapped = dict(source_bytes); swapped[casualty['source']] = source_bytes[contact['source']]
    expect_rejection('forged-whole-PNG-role-duplication', 'E_DUPLICATE_SOURCE',
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
                      'wholePNGs': 4, 'atlasJSONs': 4, 'measurementJSONs': 4,
                      'sourceAuthorNegativeCasesPassed': negative_count,
                      'nativePixelChanges': False, 'phaseScaleNormalization': False,
                      'familyComplete': False, **{flag: False for flag in FLAGS}}))


if __name__ == '__main__':
    try:
        main()
    except (ValidationError, OSError, ValueError, TypeError, OverflowError, RecursionError) as exc:
        print(json.dumps({'artPass': VERSION, 'accepted': False, 'error': str(exc)}), file=sys.stderr)
        raise SystemExit(1)
