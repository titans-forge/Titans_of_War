#!/usr/bin/env python3
"""Register reviewed native Union S A/B and Confederate N A sources."""
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
    path = HERE.parent / 'docs/art-pass/manifests/gettysburg-v7-source-annotations.json'
    native.run(json.loads(path.read_text()), args.check, directory='gettysburg-v7')


if __name__ == '__main__':
    main()
