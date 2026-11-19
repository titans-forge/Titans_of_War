#!/usr/bin/env python3
"""Pack reviewed Manassas march and pivot poses into a Phaser hash atlas.

Usage: python3 scripts/pack-manassas-infantry.py reviewed.json --out-dir DIR

The JSON names a side, sources, and approved runtime frame addresses:

    {"side": "union",
     "sources": {"sheet": {"file": "union.png", "grid": [5, 5]}},
     "frames": {"march-0-0": {"source": "sheet", "cell": [0, 0]},
                "pivot-0": {"source": "sheet", "crop": [0, 800, 200, 1000],
                            "boot": [92, 170], "capY": 37, "groundX": 94}}}

Each frame has a zero-based [row, column] or a pixel crop [left, top, right,
bottom]. Optional boot, capY and groundX annotations are pixels within the cell/crop.
Source referenceHeights may pin the measured size per direction when
replacing part of a sequence from a sheet with a different pixel density.
Omitting a frame leaves that art unavailable. --inspect reports measurements
for transparent source cells without emitting any runtime files.
"""

import argparse
from collections import deque
from dataclasses import dataclass
from hashlib import sha256
from io import BytesIO
import json
import math
from pathlib import Path
import re
from statistics import median
import sys

from PIL import Image


ATLAS_ID = "manassas-infantry-v1"
FRAME_NAME = re.compile(r"march-([01267])-[0-3]|pivot-([01267])")
SIDES = ("union", "confederate")
SOLID_ALPHA = 64
REFERENCE_HEIGHT = 144
GUTTER = 3
LIMIT = 2048


@dataclass(frozen=True)
class Source:
    name: str
    image: Image.Image
    grid: tuple
    digest: str
    reference_heights: dict


@dataclass(frozen=True)
class Pose:
    name: str
    bearing: str
    source: str
    crop: tuple
    image: Image.Image
    boot: tuple
    cap_y: int
    ground_x: float

    @property
    def height(self):
        return self.boot[1] - self.cap_y


def is_integer(value):
    return type(value) is int


def read_source(root, record):
    path = root / record["file"]
    data = path.read_bytes()
    digest = sha256(data).hexdigest()
    if record.get("sha256", digest) != digest:
        raise ValueError(f"{path.name}: source SHA-256 differs")
    with Image.open(BytesIO(data)) as image:
        if image.format != "PNG" or image.mode != "RGBA" or max(image.size) > 4096:
            raise ValueError(f"{path.name}: expected an RGBA PNG at most 4096 px wide/high")
        if image.getchannel("A").getextrema()[0] != 0:
            raise ValueError(f"{path.name}: source has no transparent pixels")
        grid = record.get("grid", [5, 5])
        if (not isinstance(grid, list) or len(grid) != 2
                or any(not is_integer(n) or not 1 <= n <= 12 for n in grid)):
            raise ValueError(f"{path.name}: grid must be [rows, columns] between 1 and 12")
        heights = record.get("referenceHeights", {})
        if (not isinstance(heights, dict) or any(direction not in "01267" or len(direction) != 1
                or type(height) not in (int, float) or not 30 <= height <= 4096
                for direction, height in heights.items())):
            raise ValueError(f"{path.name}: invalid pinned reference heights")
        return Source(path.name, image.copy(), tuple(grid), digest, heights)


def grid_crop(source, cell):
    rows, columns = source.grid
    if (not isinstance(cell, list) or len(cell) != 2
            or any(not is_integer(n) for n in cell)):
        raise ValueError("cell must be [row, column]")
    row, column = cell
    if not (0 <= row < rows and 0 <= column < columns):
        raise ValueError("cell falls outside the source grid")
    width, height = source.image.size
    return (round(column * width / columns), round(row * height / rows),
            round((column + 1) * width / columns), round((row + 1) * height / rows))


def check_solid_components(solid, box):
    """Reject substantial detached material such as part of a second figure."""
    interior = solid.crop(box)
    width, height = interior.size
    remaining = {index for index, value in enumerate(interior.tobytes()) if value}
    count = len(remaining)
    parts = []
    # Record 8-neighbor areas. Diagonal contacts are common at sprite scale.
    while remaining:
        todo = deque([remaining.pop()])
        size = 0
        while todo:
            i = todo.popleft()
            y, x = divmod(i, width)
            size += 1
            for r in range(max(0, y - 1), min(height, y + 2)):
                for c in range(max(0, x - 1), min(width, x + 2)):
                    neighbor = r * width + c
                    if neighbor in remaining:
                        remaining.remove(neighbor)
                        todo.append(neighbor)
        parts.append(size)
    if count - max(parts) > max(18, count * 0.016):
        raise ValueError(f"found detached material ({sorted(parts, reverse=True)[:5]})")


def solid_runs(mask, y, start, stop):
    values = mask.crop((start, y, stop, y + 1)).tobytes()
    runs = []
    left = None
    for x, value in enumerate(values + b"\0", start):
        if value and left is None:
            left = x
        if not value and left is not None:
            runs.append((left, x))
            left = None
    return runs


def measured_boot(solid, box):
    left, top, right, bottom = box
    min_run = max(2, round((right - left) * 0.035))
    for y in range(bottom - 1, bottom - 1 - max(6, (bottom - top) // 8), -1):
        runs = solid_runs(solid, y, left, right)
        if runs:
            start, stop = max(runs, key=lambda run: run[1] - run[0])
            if stop - start >= min_run:
                return (round((start + stop - 1) / 2), y + 1)
    raise ValueError("no supporting boot could be measured")


def measured_cap(solid, box, foot_y):
    left, top, right, _ = box
    min_run = max(3, round((right - left) * 0.13))
    stop = min(top + math.ceil((foot_y - top) * .32), solid.height)
    for y in range(top, stop):
        if any(end - start >= min_run for start, end in solid_runs(solid, y, left, right)):
            return y
    raise ValueError("no cap could be measured")


def measured_ground_x(solid, cap_y, foot_y):
    # Follow the center of the pelvis horizontally and the planted boot
    # vertically. Registering X on alternating soles moves the entire torso
    # by a stride even though field translation already advances the figure.
    height = foot_y - cap_y
    first = round(cap_y + height * .50)
    last = round(cap_y + height * .62)
    centers = []
    for y in range(first, last):
        row = solid.crop((0, y, solid.width, y + 1)).tobytes()
        points = [x for x, value in enumerate(row) if value]
        if points:
            centers.append(median(points))
    if not centers:
        raise ValueError("no pelvis center could be measured")
    return median(centers)


def read_pose(name, bearing, source, record):
    if ("cell" in record) == ("crop" in record):
        raise ValueError("supply exactly one cell or crop")
    crop = tuple(record["crop"]) if "crop" in record else grid_crop(source, record["cell"])
    width, height = source.image.size
    if (len(crop) != 4 or any(not is_integer(n) for n in crop)
            or not (0 <= crop[0] < crop[2] <= width and 0 <= crop[1] < crop[3] <= height)):
        raise ValueError("crop falls outside the source")
    sprite = source.image.crop(crop)
    alpha = sprite.getchannel("A")
    solid = alpha.point(lambda value: 255 if value >= SOLID_ALPHA else 0)
    bounds = solid.getbbox()
    if not bounds:
        raise ValueError("cell is empty")
    left, top, right, bottom = bounds
    if min(left, top, sprite.width - right, sprite.height - bottom) < 2:
        raise ValueError("solid art is clipped or crosses the cell edge")
    if bottom - top < 30 or right - left < 10 or right - left > (bottom - top) * 1.35:
        raise ValueError("silhouette is inconsistent with one upright infantry figure")
    check_solid_components(solid, bounds)
    boot = tuple(record["boot"]) if "boot" in record else measured_boot(solid, bounds)
    if (len(boot) != 2 or any(not is_integer(n) for n in boot)
            or not (left <= boot[0] < right and bottom - (bottom - top) * .12 <= boot[1] <= bottom + 3)):
        raise ValueError("boot anchor must be within the lower silhouette beside a supporting sole")
    foot_area = (max(0, boot[0] - 3), max(0, boot[1] - 5),
                 min(boot[0] + 4, solid.width), min(boot[1] + 2, solid.height))
    if solid.crop(foot_area).getbbox() is None:
        raise ValueError("boot anchor is detached from the solid sole")
    cap_y = record["capY"] if "capY" in record else measured_cap(solid, bounds, boot[1])
    if (not is_integer(cap_y) or not top <= cap_y < boot[1]
            or boot[1] - cap_y < (bottom - top) * 0.66):
        raise ValueError("head-to-sole span is inconsistent with the silhouette")
    ground_x = record["groundX"] if "groundX" in record else measured_ground_x(solid, cap_y, boot[1])
    if type(ground_x) not in (int, float) or not left <= ground_x < right:
        raise ValueError("ground X must be inside the silhouette")
    return Pose(name, bearing, source.name, crop, sprite, boot, cap_y, ground_x)


def normalized_pose(pose, ratio):
    # Keep genuine subpixel source edges. A transparent pixel around the
    # trimmed frame keeps the foot origin away from neighboring atlas cells.
    size = tuple(max(1, round(length * ratio)) for length in pose.image.size)
    resized = pose.image.resize(size, Image.Resampling.LANCZOS)
    alpha = resized.getchannel("A").getbbox()
    boot_x = pose.boot[0] * resized.width / pose.image.width
    boot_y = pose.boot[1] * resized.height / pose.image.height
    ground_x = pose.ground_x * resized.width / pose.image.width
    left = min(alpha[0], math.floor(boot_x), math.floor(ground_x)) - 1
    top = min(alpha[1], math.floor(boot_y)) - 1
    right = max(alpha[2], math.ceil(boot_x), math.ceil(ground_x)) + 1
    bottom = max(alpha[3], math.ceil(boot_y)) + 1
    sprite = resized.crop((left, top, right, bottom))
    pivot = {"x": round((ground_x - left) / sprite.width, 6),
             "y": round((boot_y - top) / sprite.height, 6)}
    support = {"x": round((boot_x - left) / sprite.width, 6), "y": pivot["y"]}
    return sprite, pivot, support


def pack_atlas(side, poses, sources):
    # Constant sizing per source and direction preserves passing-pose posture.
    # Source medians also reconcile supplements authored at a denser scale.
    groups = {}
    for pose in poses:
        groups.setdefault((pose.source, pose.bearing), []).append(pose)
    source_heights = {source.name: source.reference_heights for source in sources.values()}
    ratios = {}
    for (source, bearing), group in groups.items():
        heights = [pose.height for pose in group if pose.name.startswith("march-")]
        pinned = source_heights[source].get(bearing)
        reference = pinned if pinned is not None else median(heights or [pose.height for pose in group])
        if any(not 0.82 <= pose.height / reference <= 1.18 for pose in group):
            raise ValueError(f"{source} direction {bearing}: inconsistent cap-to-sole span")
        ratios[(source, bearing)] = REFERENCE_HEIGHT / reference

    sheet = Image.new("RGBA", (LIMIT, LIMIT))
    frames, registration, signatures = {}, {}, set()
    x, y, right, row_height = GUTTER, GUTTER, GUTTER, 0
    for pose in sorted(poses, key=lambda row: row.name):
        sprite, pivot, support = normalized_pose(pose, ratios[(pose.source, pose.bearing)])
        signature = (sprite.size, sha256(sprite.tobytes()).digest())
        if signature in signatures:
            raise ValueError(f"{pose.name}: duplicates a normalized frame")
        signatures.add(signature)
        if x + sprite.width + GUTTER > LIMIT:
            x, y, row_height = GUTTER, y + row_height + GUTTER, 0
        if y + sprite.height + GUTTER > LIMIT:
            raise ValueError(f"{side}: sprite atlas exceeds {LIMIT} pixels")
        sheet.paste(sprite, (x, y))
        width, height = sprite.size
        frames[pose.name] = {"frame": {"x": x, "y": y, "w": width, "h": height},
                             "rotated": False, "trimmed": False,
                             "sourceSize": {"w": width, "h": height}, "pivot": pivot, "support": support,
                             "bodyHeight": REFERENCE_HEIGHT}
        registration[pose.name] = {"source": pose.source, "crop": pose.crop, "boot": pose.boot,
                                   "groundX": pose.ground_x, "capY": pose.cap_y,
                                   "measuredBodyHeight": pose.height}
        row_height = max(row_height, height)
        x += width + GUTTER
        right = max(right, x)
    sheet = sheet.crop((0, 0, right, y + row_height + GUTTER))
    encoded = BytesIO()
    sheet.save(encoded, format="WEBP", lossless=True, method=6, exact=True)
    image = encoded.getvalue()
    with Image.open(BytesIO(image)) as decoded:
        if decoded.convert("RGBA").tobytes() != sheet.tobytes():
            raise ValueError(f"{side}: encoded atlas pixels differ from the packed source")
    atlas = {"frames": frames, "meta": {
        "version": 1, "id": ATLAS_ID, "side": side,
        "size": {"w": sheet.width, "h": sheet.height},
        "sha256": sha256(image).hexdigest(),
        "sources": {name: {"file": source.name, "sha256": source.digest}
                    for name, source in sorted(sources.items())},
        "registration": registration,
    }}
    return image, (json.dumps(atlas, separators=(",", ":")) + "\n").encode()


def inspect(path, rows, columns):
    source = read_source(path.parent, {"file": path.name, "grid": [rows, columns]})
    records = []
    for row in range(rows):
        for column in range(columns):
            cell = [row, column]
            record = {"cell": cell, "crop": grid_crop(source, cell)}
            try:
                pose = read_pose("inspect", "0", source, {"cell": cell})
                record.update(boot=pose.boot, groundX=pose.ground_x, capY=pose.cap_y, measuredBodyHeight=pose.height)
            except ValueError as error:
                record["rejection"] = str(error)
            records.append(record)
    print(json.dumps({"source": source.name, "sha256": source.digest, "cells": records}, indent=2))


def build(manifest, output, check=False):
    data = json.loads(manifest.read_text())
    side = data["side"]
    if side not in SIDES:
        raise ValueError("manifest side must be union or confederate")
    sources = {key: read_source(manifest.parent, value) for key, value in data["sources"].items()}
    poses = []
    for name, record in data["frames"].items():
        match = FRAME_NAME.fullmatch(name)
        if match is None:
            raise ValueError(f"unknown frame address {name}")
        try:
            poses.append(read_pose(name, match.group(1) or match.group(2), sources[record["source"]], record))
        except (KeyError, TypeError, ValueError) as error:
            raise ValueError(f"{name}: {error}") from error
    if not poses:
        raise ValueError("manifest has no accepted poses")
    webp, atlas = pack_atlas(side, poses, sources)
    paths = {output / f"{side}.webp": webp, output / f"{side}.json": atlas}
    if check:
        for path, contents in paths.items():
            if path.read_bytes() != contents:
                raise ValueError(f"{path.name}: checked-in bytes differ")
    else:
        output.mkdir(parents=True, exist_ok=True)
        if any(path.exists() for path in paths):
            raise ValueError(f"{side}: output files already exist. Use --check or choose a fresh output folder.")
        for path, contents in paths.items():
            with path.open("xb") as file:
                file.write(contents)
    print(f"{side}: {len(poses)} reviewed poses, {len(webp):,} WebP bytes")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--out-dir", type=Path)
    modes.add_argument("--inspect", action="store_true")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--rows", type=int, default=5)
    parser.add_argument("--columns", type=int, default=5)
    args = parser.parse_args()
    try:
        if args.inspect:
            inspect(args.input, args.rows, args.columns)
        else:
            build(args.input, args.out_dir, args.check)
    except (KeyError, OSError, TypeError, ValueError) as error:
        sys.exit(str(error))


if __name__ == "__main__":
    main()
