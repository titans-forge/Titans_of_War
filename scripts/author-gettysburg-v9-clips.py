#!/usr/bin/env python3
"""Register four reviewed native Union west A/B sources without changing pixels."""
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
    path = HERE.parent / 'docs/art-pass/manifests/gettysburg-v9-source-annotations.json'
    config = json.loads(path.read_text())
    expected = {(identity, name) for identity in ['a', 'b'] for name in ['march-w', 'actions-w']}
    actual = [(source.get('identity'), source.get('name')) for source in config['sources']]
    if len(actual) != 4 or set(actual) != expected:
        raise ValueError('Exactly four reviewed native A/B west sources are required')
    for source in config['sources']:
        if source['side'] != 'union' or source['direction'] != 4:
            raise ValueError('This pass contains only west-facing Union sources')
    native.run(config, args.check, directory='gettysburg-v9')


if __name__ == '__main__':
    main()
