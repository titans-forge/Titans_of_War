#!/usr/bin/env python3
"""Read-only regression against actual independently accepted v32 sources.

Requires the real source review, annotations and twelve completed exports.
No synthetic approval, substitute source, raster edit or fixture is written.
"""
import copy
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
ROOT = Path(__file__).absolute().parents[1]
SPEC = importlib.util.spec_from_file_location('v32_native_author', ROOT / 'scripts/author-gettysburg-v32-clips.py')
AUTHOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUTHOR)
OBSERVED_REJECTIONS = []


def roi_y(points, roi):
    selected = [y for x, y in points if roi[0] <= x < roi[2] and roi[1] <= y < roi[3]]
    if not selected:
        raise AssertionError('Independent ROI check found no alpha>=64 pixels')
    return min(selected), max(selected) + 1


def independent_cells(raw, cell):
    """Measure full original RGBA bytes without creating or editing a raster."""
    from PIL import Image
    with Image.open(io.BytesIO(raw)) as image:
        if image.format != 'PNG' or image.mode != 'RGBA' or image.size != (2 * cell, 2 * cell):
            raise AssertionError('Expected a whole native RGBA 2x2 source')
        image.load()
        raster = image.tobytes()
    stride = 2 * cell * 4
    measured = []
    for phase in range(4):
        origin_x, origin_y = phase % 2 * cell, phase // 2 * cell
        rows = [raster[(origin_y + y) * stride + origin_x * 4:
                       (origin_y + y) * stride + (origin_x + cell) * 4] for y in range(cell)]
        rgba = b''.join(rows)
        points = [(x, y) for y, row in enumerate(rows) for x in range(cell) if row[x * 4 + 3] >= 64]
        if not points:
            raise AssertionError('Empty solid-alpha native cell')
        x_values, y_values = zip(*points)
        box = [min(x_values), min(y_values), max(x_values) + 1, max(y_values) + 1]
        measured.append({'points': points, 'rgbaSHA256': hashlib.sha256(rgba).hexdigest(),
                         'solidBounds': box, 'solidPadding': [box[0], box[1], cell - box[2], cell - box[3]]})
    return measured


class V32Annotations(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = AUTHOR.load_json(AUTHOR.read_bytes(AUTHOR.CONFIG, AUTHOR.MAX_JSON_BYTES))
        cls.review_bytes = AUTHOR.read_bytes(AUTHOR.REVIEW, AUTHOR.MAX_JSON_BYTES)
        cls.review = AUTHOR.load_json(cls.review_bytes)
        cls.cache = {}
        cls.results = AUTHOR.inspect(cls.config, _native_cache=cls.cache)
        cls.outputs = AUTHOR.exports(cls.config, cls.results)
        AUTHOR.verify_outputs(cls.outputs)
        cls.source_bytes = {r['source']['source']: r['pngBytes'] for r in cls.results}
        cls.measured = {r['source']['source']: independent_cells(r['pngBytes'], r['source']['cell'])
                        for r in cls.results}

    def assertRejected(self, name, code, operation):
        with self.assertRaises(AUTHOR.ValidationError) as caught:
            operation()
        self.assertEqual(caught.exception.code, code, name)
        OBSERVED_REJECTIONS.append({'name': name, 'observedCode': caught.exception.code})

    def forged_review(self, config, review):
        raw = json.dumps(review, allow_nan=False).encode()
        config['sourceReviewSHA256'] = AUTHOR.digest(raw)
        return lambda: AUTHOR.inspect(config, _review_bytes=raw, _source_bytes=self.source_bytes,
                                      _native_cache=self.cache)

    def test_01_exact_four_sources_and_twelve_exports(self):
        expected = {('union', 'b', direction, role) for direction in (1, 5)
                    for role in ('contact', 'casualty')}
        self.assertEqual({tuple(s[k] for k in ('side', 'identity', 'direction', 'role'))
                          for s in self.config['sources']}, expected)
        self.assertEqual(len(self.outputs), 12)
        self.assertEqual(set(self.outputs), AUTHOR.expected_output_paths())
        self.assertEqual(len(set(AUTHOR.digest(raw) for raw in self.source_bytes.values())), 4)

    def test_02_native_cell_hashes_bounds_and_padding(self):
        for result in self.results:
            for supplied, fresh in zip(result['cells'], self.measured[result['source']['source']]):
                for field in ('rgbaSHA256', 'solidBounds', 'solidPadding'):
                    self.assertEqual(supplied[field], fresh[field])
                self.assertGreaterEqual(min(fresh['solidPadding']), 16)
            self.assertEqual(len({c['rgbaSHA256'] for c in result['cells']}), 4)

    def test_03_all_sixteen_independent_support_roots(self):
        for source in self.config['sources']:
            for root, roi, measured in zip(source['roots'], source['groundROIs'], self.measured[source['source']]):
                self.assertEqual(root[1], roi_y(measured['points'], roi)[1])
                self.assertTrue(0 <= root[0] < source['cell'])
                # Projected pelvis X need not be inside the support ROI.

    def test_04_fresh_contact_cap_and_sole_spans(self):
        for source in self.config['sources']:
            if source['role'] != 'contact':
                continue
            for i, measured in enumerate(self.measured[source['source']]):
                cap = roi_y(measured['points'], source['capROIs'][i])[0]
                sole = roi_y(measured['points'], source['referenceSoleROIs'][i])[1]
                self.assertEqual(source['capTop'][i], cap)
                self.assertEqual(source['referenceSoleGroundY'][i], sole)
                self.assertEqual(source['bodySpans'][i], sole - cap)

    def test_05_each_fresh_contact_median_shared_unchanged_with_casualty(self):
        for cardinal in ('se', 'nw'):
            contact = next(s for s in self.config['sources'] if s['cardinal'] == cardinal and s['role'] == 'contact')
            spans = sorted(roi_y(m['points'], contact['referenceSoleROIs'][i])[1]
                           - roi_y(m['points'], contact['capROIs'][i])[0]
                           for i, m in enumerate(self.measured[contact['source']]))
            reference = (spans[1] + spans[2] + 1) // 2
            self.assertEqual(self.config['referenceHeights'][cardinal], reference)
            for source in self.config['sources']:
                if source['cardinal'] == cardinal:
                    self.assertEqual(source['referenceHeight'], reference)

    def test_06_public_pngs_are_original_whole_bytes(self):
        for source in self.config['sources']:
            cardinal = source['cardinal']
            path = 'public/images/units/gettysburg-v32/{}-b-{}-{}.png'.format(source['side'], source['role'], cardinal)
            self.assertEqual(self.outputs[path], self.source_bytes[source['source']])
            self.assertEqual(AUTHOR.read_bytes(path, AUTHOR.MAX_PNG_BYTES), self.source_bytes[source['source']])

    def test_07_atlas_frames_are_complete_native_cells(self):
        for path, raw in self.outputs.items():
            if not path.startswith('public/') or not path.endswith('.json'):
                continue
            atlas = AUTHOR.load_json(raw)
            self.assertEqual(len(atlas['meta']['clips']), 1)
            clip = atlas['meta']['clips'][0]
            source = next(s for s in self.config['sources'] if s['sha256'] == clip['sourceHash'])
            cell = source['cell']
            self.assertEqual(atlas['meta']['sha256'], source['sha256'])
            for i, name in enumerate(clip['frames']):
                self.assertEqual(name, 'b-{}-{}-{}'.format(AUTHOR.ROLES[source['role']][0], source['direction'], i))
                frame = atlas['frames'][name]
                self.assertEqual(frame['frame'], {'x': i % 2 * cell, 'y': i // 2 * cell, 'w': cell, 'h': cell})
                self.assertIs(frame['rotated'], False)
                self.assertIs(frame['trimmed'], False)
                self.assertEqual(frame['sourceSize'], {'w': cell, 'h': cell})
                self.assertEqual(frame['spriteSourceSize'], {'x': 0, 'y': 0, 'w': cell, 'h': cell})
                self.assertEqual(frame['bodyHeight'], source['referenceHeight'])

    def test_08_pivots_preserve_independent_roots_and_exact_markers(self):
        markers = {'nativeContactSequence', 'nativeCasualtySequence', 'nativeReloadSequence',
                   'nativeUnionNortheastSequence', 'nativeUnionNorthernSequence'}
        for path, raw in self.outputs.items():
            if not path.startswith('public/') or not path.endswith('.json'):
                continue
            clip = AUTHOR.load_json(raw)['meta']['clips'][0]
            source = next(s for s in self.config['sources'] if s['sha256'] == clip['sourceHash'])
            cardinal = source['cardinal']
            marker = AUTHOR.ROLES[source['role']][1]
            self.assertEqual(set(clip) & markers, {marker})
            self.assertEqual(clip[marker], 'gettysburg-v32-{}-b-{}-{}'.format(source['side'], cardinal, source['role']))
            self.assertEqual(clip['key'], '{}-gettysburg-v32-b-{}-{}'.format(source['side'], source['role'], cardinal))
            self.assertNotIn('muzzles', clip)
            for actual, root in zip(clip['pivots'], source['roots']):
                self.assertEqual(actual, {'x': round(root[0] / source['cell'], 6), 'y': round(root[1] / source['cell'], 6)})

    def test_09_review_and_measurement_source_bindings(self):
        self.assertEqual(self.config['sourceReviewSHA256'], hashlib.sha256(self.review_bytes).hexdigest())
        for result in self.results:
            source = result['source']
            path = 'docs/art-pass/reviews/gettysburg-v32-{}-b-{}-{}-measurement.json'.format(source['side'], source['role'], source['cardinal'])
            measurement = AUTHOR.load_json(self.outputs[path])
            self.assertEqual(measurement['cardinal'], source['cardinal'])
            self.assertEqual(measurement['sourceSHA256'], hashlib.sha256(result['pngBytes']).hexdigest())
            self.assertEqual(measurement['sourceReviewSHA256'], self.config['sourceReviewSHA256'])
            self.assertEqual(measurement['cells'], result['cells'])
            self.assertIs(measurement['nativePixelChanges'], False)
            self.assertIs(measurement['phaseScaleNormalization'], False)

    def test_10_source_only_approval_and_all_false_certification(self):
        for field in ('acceptedForOptIn', 'independentReview', 'modelAssisted', 'sourceOnly'):
            self.assertIs(self.review[field], True)
        self.assertIs(self.review['localInstall'], False)
        self.assertEqual(self.review['pairScaleAccepted'], {'se': True, 'nw': True})
        for reviewed in self.review['sources']:
            self.assertIs(reviewed['acceptedForOptIn'], True)
        for record in [self.config, self.review] + [AUTHOR.load_json(raw) for p, raw in self.outputs.items() if p.endswith('.json')]:
            metadata = record.get('meta', record)
            for flag in (*AUTHOR.FLAGS, 'familyComplete'):
                self.assertIs(metadata[flag], False)

    def test_11_every_named_registration_and_forged_binding_negative(self):
        cases = AUTHOR.negative_cases(self.config)
        self.assertEqual(len({name for name, _, _ in cases}), len(cases))
        for name, code, mutate in cases:
            with self.subTest(case=name):
                config, review = copy.deepcopy(self.config), copy.deepcopy(self.review)
                mutate(config, review)
                self.assertRejected(name, code, self.forged_review(config, review))

    def test_12_reject_A_identity_and_cross_bearing_even_with_review_rebound(self):
        for i, source in enumerate(self.config['sources']):
            for field, value in (('identity', 'a'), ('direction', 5 if source['direction'] == 1 else 1)):
                config, review = copy.deepcopy(self.config), copy.deepcopy(self.review)
                config['sources'][i][field] = value
                bound = next(s for s in review['sources'] if s['source'] == source['source'])
                bound[field] = value
                bound['measurements'][field] = value
                self.assertRejected(source['cardinal'] + '-' + source['role'] + '-wrong-' + field,
                                    'E_ADDRESS', self.forged_review(config, review))

    def test_13_reject_changed_source_bytes_before_any_export(self):
        for source in self.config['sources']:
            changed = dict(self.source_bytes)
            changed[source['source']] = changed[source['source']] + b'\x00'
            self.assertRejected(source['side'] + '-' + source['cardinal'] + '-' + source['role'] + '-changed-whole-source', 'E_SOURCE_HASH',
                                lambda c=changed: AUTHOR.inspect(self.config, _source_bytes=c, _native_cache=self.cache))

    def test_14_reject_duplicate_json_and_numeric_approval(self):
        for raw in (b'{"sources":[],"sources":[]}', b'{"x":NaN}', b'{"x":Infinity}', b'[]'):
            self.assertRejected('strict-json-' + raw.decode(), 'E_JSON', lambda r=raw: AUTHOR.load_json(r))
        config, review = copy.deepcopy(self.config), copy.deepcopy(self.review)
        review['acceptedForOptIn'] = 1
        self.assertRejected('numeric-opt-in-approval', 'E_REVIEW_STATUS', self.forged_review(config, review))

    def test_15_original_sources_remain_byte_exact(self):
        for path, raw in self.source_bytes.items():
            self.assertEqual(AUTHOR.read_bytes(path, AUTHOR.MAX_PNG_BYTES), raw)


if __name__ == '__main__':
    program = unittest.main(exit=False)
    result = program.result
    print(json.dumps({'artPass': 'gettysburg-v32', 'testsRun': result.testsRun,
                      'failures': len(result.failures), 'errors': len(result.errors),
                      'skipped': len(result.skipped), 'namedRejectionOutcomes': OBSERVED_REJECTIONS,
                      'nativePixelChanges': False, 'phaseScaleNormalization': False}))
    raise SystemExit(0 if result.wasSuccessful() else 1)
