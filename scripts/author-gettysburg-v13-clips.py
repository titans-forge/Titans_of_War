#!/usr/bin/env python3
"""Register four independently reviewed native Confederate A E/W sources.

This wrapper validates declared identity/kit review and complete row-major
action ownership before invoking the unchanged v5 byte-copy author. Review
attestations are model-assisted inspection, not physical or historical proof.
All native source pixels remain unchanged.
"""
import argparse
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
DIRECTORY = 'gettysburg-v13'
ANNOTATIONS = ROOT / f'docs/art-pass/manifests/{DIRECTORY}-source-annotations.json'
CORE = HERE / 'author-gettysburg-v5-clips.py'
CORE_SHA256 = '7a9f5300a58f85f5d5cf9b25018a4806d3da746be21b70734efc5719e3808e0d'
NAMES = ('march-e', 'actions-e', 'march-w', 'actions-w')


def finite_number(value):
    return type(value) in (int, float) and math.isfinite(value)


def checked_native():
    if hashlib.sha256(CORE.read_bytes()).hexdigest() != CORE_SHA256:
        raise ValueError('Unchanged v5 native author bytes are required')
    loader = importlib.util.spec_from_file_location('gettysburg_v13_checked_native_clips', CORE)
    module = importlib.util.module_from_spec(loader)
    loader.loader.exec_module(module)
    return module


def validate_config(config):
    """Fail before any writes if scope, source binding or annotations differ."""
    if (config.get('artPass') != DIRECTORY or config.get('productionApproved') is not False
            or config.get('familyComplete') is not False):
        raise ValueError('Only incomplete, unapproved local Gettysburg v13 sources are in scope')
    sources = config.get('sources')
    if not isinstance(sources, list) or len(sources) != 4:
        raise ValueError('Exactly four native Confederate A E/W sources are required')
    actual = [(source.get('identity'), source.get('name')) for source in sources]
    if set(actual) != {('a', name) for name in NAMES}:
        raise ValueError('Exactly march-e/actions-e/march-w/actions-w for Confederate A are required')
    hashes = []
    for source in sources:
        name = source['name']
        kind, bearing = name.split('-')
        direction = {'e': 0, 'w': 4}[bearing]
        expected_source = f'docs/art-pass/candidates/{DIRECTORY}/confederate-a-{bearing}-{kind}-candidate.png'
        if (source.get('side') != 'confederate' or source.get('identity') != 'a'
                or type(source.get('direction')) is not int or source['direction'] != direction
                or source.get('identityKit') != 'confederate-a'):
            raise ValueError('Every source must bind to Confederate A identity/kit and its native E(0)/W(4) bearing')
        if (source.get('source') != expected_source
                or source.get('key') != f'confederate-{DIRECTORY}-a-{name}'
                or source.get('measurementName') != f'confederate-a-{name}'):
            raise ValueError('Source path, atlas key and measurement name must bind to the exact v13 source')
        source_path = ROOT / expected_source
        if source_path.is_symlink() or source_path.resolve().parent != (ROOT / f'docs/art-pass/candidates/{DIRECTORY}').resolve():
            raise ValueError('Native source must be a direct v13 candidate file, without source redirection')
        source_hash = source.get('sha256')
        if not isinstance(source_hash, str) or re.fullmatch('[0-9a-f]{64}', source_hash) is None:
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
            raise ValueError('Four freshly measured roots, cap tops and body spans are required')
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
        if not isinstance(source.get('limitations'), list) or not source['limitations']:
            raise ValueError('Source inspection and measurement limitations must remain explicit')
        if not isinstance(source.get('scope'), str) or not source['scope'].strip():
            raise ValueError('Local opt-in v13 scope must be documented')
    if len(set(hashes)) != 4:
        raise ValueError('Four distinct native sources are required; reused or mirrored source bindings are unsupported')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    config = json.loads(ANNOTATIONS.read_text())
    validate_config(config)
    native = checked_native()
    # Native author validates hashes, square RGBA dimensions, nonempty cells
    # and padding read-only. Preflight all four before writing the first file.
    for source in config['sources']:
        native.author(source, directory=DIRECTORY)
    native.run(config, args.check, directory=DIRECTORY)


if __name__ == '__main__':
    main()
