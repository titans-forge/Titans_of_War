#!/usr/bin/env python3
"""Register four reviewed native Union B E/SE sources without changing pixels."""
import argparse
import importlib.util
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
loader = importlib.util.spec_from_file_location('gettysburg_native_clips', HERE / 'author-gettysburg-v5-clips.py')
native = importlib.util.module_from_spec(loader)
loader.loader.exec_module(native)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    config = json.loads((HERE.parent / 'docs/art-pass/manifests/gettysburg-v11-source-annotations.json').read_text())
    expected = {('b', name) for name in ['march-e', 'actions-e', 'march-se', 'actions-se']}
    actual = [(source.get('identity'), source.get('name')) for source in config['sources']]
    if len(actual) != 4 or set(actual) != expected:
        raise ValueError('Exactly four reviewed native Union B E/SE sources are required')
    for source in config['sources']:
        name = source['name']
        bearing = name.split('-')[1]
        if source['side'] != 'union' or source['direction'] != {'e': 0, 'se': 1}[bearing]:
            raise ValueError('This pass contains only correctly addressed Union B E/SE sources')
        if source['key'] != f'union-gettysburg-v11-b-{name}':
            raise ValueError('Native source must bind to its exact v11 atlas key')
        actions = source['actions']
        expected_actions = [('march', 4)] if name.startswith('march-') else [('ready', 1), ('fire', 1), ('reload', 2)]
        if [(action, len(indexes)) for action, indexes in actions] != expected_actions:
            raise ValueError('Native source must contain every complete named action in its reviewed order')
        indexes = [index for _, frames in actions for index in frames]
        if any(type(index) is not int for index in indexes) or sorted(indexes) != [0, 1, 2, 3]:
            raise ValueError('Every native cell must belong to exactly one complete action')
    native.run(config, args.check, directory='gettysburg-v11')


if __name__ == '__main__':
    main()
