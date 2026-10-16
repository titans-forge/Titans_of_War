#!/usr/bin/env python3
"""Measure one reviewed native Gettysburg gait source and author JSON only.

Pillow reads the source alpha; it never saves, resizes, trims or repacks an
image. The public PNG is a byte-for-byte copy. Manual anatomical annotations
are bound to the source hash and must be reviewed again for any new source.
"""

import argparse
import hashlib
import json
import shutil
from pathlib import Path
from statistics import median

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/art-pass/candidates/gettysburg-v3/union-e-rig-guided-candidate.png"
ASSET = ROOT / "public/images/units/gettysburg-v3/union-a-march-e.png"
ATLAS = ASSET.with_suffix(".json")
REVIEW = ROOT / "docs/art-pass/reviews/gettysburg-v3-clip-measurement.json"
SOURCE_SHA256 = "fe564b8374e48e3d1732e2d6e40d3809c950003c063762a123944759bcef8bca"
CELL_W, CELL_H, CELL_COUNT = 543, 724, 4
GROUND_Y = 632
KEY = "union-gettysburg-v3-march-e"
THRESHOLDS = (1, 8, 32, 64, 128, 200, 240, 255)

# Read-only visual annotations in native, cell-local pixels. The preview was
# displayed at 2048x683; coordinates were converted to the native 2172x724
# space and checked against alpha row spans. Landmarks are approximate (+/-5
# source pixels), not a calibrated skeleton. Torso/pelvis centers determine X;
# the same ground reference determines Y in every phase. A lowest boot never
# determines the root or the scale.
ANNOTATIONS = (
    {
        "phase": "rearward-foot-contact",
        "torsoCenter": [266, 310], "pelvisCenter": [278, 408],
        "capTopY": 92,
        "forwardLeg": {"hip": [291, 431], "knee": [330, 492], "ankle": [335, 543], "bootCenter": [363, 566]},
        "rearwardLeg": {"hip": [256, 431], "knee": [198, 516], "ankle": [144, 579], "bootCenter": [164, 614]},
        "supportObservation": "Rearward foot is lower; forward foot is visibly raised. Leg chains separate across the pelvis.",
    },
    {
        "phase": "first-passing",
        "torsoCenter": [262, 300], "pelvisCenter": [270, 404],
        "capTopY": 79,
        "forwardLeg": {"hip": [273, 428], "knee": [294, 480], "ankle": [252, 568], "bootCenter": [267, 599]},
        "rearwardLeg": {"hip": [250, 427], "knee": [242, 496], "ankle": [278, 531], "bootCenter": [290, 545]},
        "supportObservation": "Legs pass under the pelvis; one boot remains lower while the other is raised behind the visible shin.",
    },
    {
        "phase": "forward-foot-contact",
        "torsoCenter": [288, 310], "pelvisCenter": [294, 418],
        "capTopY": 90,
        "forwardLeg": {"hip": [312, 446], "knee": [354, 511], "ankle": [365, 588], "bootCenter": [395, 613]},
        "rearwardLeg": {"hip": [267, 444], "knee": [208, 499], "ankle": [162, 555], "bootCenter": [190, 570]},
        "supportObservation": "Forward foot is lower; trailing foot is visibly raised. This reverses the contact-cell-0 support geometry.",
    },
    {
        "phase": "second-passing",
        "torsoCenter": [312, 305], "pelvisCenter": [314, 419],
        "capTopY": 76,
        "forwardLeg": {"hip": [320, 439], "knee": [339, 498], "ankle": [295, 582], "bootCenter": [308, 615]},
        "rearwardLeg": {"hip": [302, 441], "knee": [276, 499], "ankle": [265, 524], "bootCenter": [269, 535]},
        "supportObservation": "Legs pass under the pelvis; the raised boot appears on the opposite side of the visible supporting shin from cell 1.",
    },
)


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def alpha_measurements(values):
    """Inclusive pixel membership; reported rectangles have exclusive edges."""
    measurements = {}
    for threshold in THRESHOLDS:
        indexes = [index for index, value in enumerate(values) if value >= threshold]
        xs = [index % CELL_W for index in indexes]
        ys = [index // CELL_W for index in indexes]
        bounds = [min(xs), min(ys), max(xs) + 1, max(ys) + 1] if indexes else None
        measurements[str(threshold)] = {"pixels": len(indexes), "bounds": bounds}
    solid = measurements["64"]["bounds"]
    ghost_count = measurements["1"]["pixels"] - measurements["8"]["pixels"]
    return {
        "thresholds": measurements,
        "solidThreshold": 64,
        "solidPadding": {"left": solid[0], "top": solid[1], "right": CELL_W - solid[2], "bottom": CELL_H - solid[3]},
        "faintGhostAlphaRange": [1, 7],
        "faintGhostPixels": ghost_count,
        "faintGhostFractionOfNonzero": round(ghost_count / measurements["1"]["pixels"], 6),
        "edgeMaxAlpha": {
            "left": max(values[y * CELL_W] for y in range(CELL_H)),
            "right": max(values[y * CELL_W + CELL_W - 1] for y in range(CELL_H)),
            "top": max(values[:CELL_W]), "bottom": max(values[-CELL_W:]),
        },
    }


def author():
    source_hash = sha256(SOURCE)
    if source_hash != SOURCE_SHA256:
        raise ValueError("Source hash changed: the anatomical annotations need fresh visual review")
    with Image.open(SOURCE) as image:
        if image.mode != "RGBA" or image.size != (CELL_W * CELL_COUNT, CELL_H):
            raise ValueError("The reviewed source must remain native 2172x724 RGBA")
        alpha = list(image.getchannel("A").getdata())
    frame_names = [f"a-march-0-{phase}" for phase in range(CELL_COUNT)]
    reference_height = round(GROUND_Y - median(annotation["capTopY"] for annotation in ANNOTATIONS))
    frames, cells, pivots = {}, [], []
    for phase, annotation in enumerate(ANNOTATIONS):
        values = [value for y in range(CELL_H) for value in alpha[y * CELL_W * CELL_COUNT + phase * CELL_W:y * CELL_W * CELL_COUNT + (phase + 1) * CELL_W]]
        measurement = alpha_measurements(values)
        if min(measurement["solidPadding"].values()) < 16:
            raise ValueError(f"Cell {phase} has insufficient solid padding")
        root_x = (annotation["torsoCenter"][0] + annotation["pelvisCenter"][0]) / 2
        pivot = {"x": round(root_x / CELL_W, 6), "y": round(GROUND_Y / CELL_H, 6)}
        pivots.append(pivot)
        rectangle = {"x": phase * CELL_W, "y": 0, "w": CELL_W, "h": CELL_H}
        frames[frame_names[phase]] = {
            "frame": rectangle, "rotated": False, "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": CELL_W, "h": CELL_H},
            "sourceSize": {"w": CELL_W, "h": CELL_H},
            "pivot": pivot, "bodyHeight": reference_height,
        }
        solid_bottom = measurement["thresholds"]["128"]["bounds"][3]
        cells.append({
            "frame": frame_names[phase], "sourceRectangle": rectangle,
            "anatomicalAnnotation": annotation,
            "root": {"x": root_x, "y": GROUND_Y, "method": "mean of annotated torso and pelvis X; shared ground-reference Y"},
            "normalizedPivot": pivot,
            "capToSharedGroundHeight": GROUND_Y - annotation["capTopY"],
            "solidBottomYForDiagnosticsOnly": solid_bottom,
            "solidBottomOffsetFromSharedGround": GROUND_Y - solid_bottom,
            "capToOwnSolidBottomForDiagnosticsOnly": solid_bottom - annotation["capTopY"],
            "alpha": measurement,
        })
    heights = [cell["capToSharedGroundHeight"] for cell in cells]
    clip = {
        "side": "union", "identity": "a", "direction": 0, "action": "march", "key": KEY,
        "frames": frame_names, "sourceHash": source_hash, "referenceHeight": reference_height, "pivots": pivots,
        "approval": {"reviewed": True, "rejected": False}, "scope": "opt-in E marching pilot only",
    }
    review = {
        "source": str(SOURCE.relative_to(ROOT)), "sourceHash": source_hash,
        "nativeSize": {"w": CELL_W * CELL_COUNT, "h": CELL_H}, "nativeMode": "RGBA",
        "publicPNG": str(ASSET.relative_to(ROOT)), "atlas": str(ATLAS.relative_to(ROOT)),
        "pixelTreatment": "none; full equal native cells; public PNG copied byte-for-byte",
        "annotationMethod": "manual visual anatomy in native cell-local pixels, checked against alpha row spans; approximately +/-5 source pixels",
        "leftRightLimbIdentity": "withheld because the side view occludes anatomical left/right; annotations describe visible forward/rearward leg chains",
        "commonGroundReferenceY": GROUND_Y, "fixedCapToGroundReferenceHeight": reference_height,
        "referenceCapTopY": GROUND_Y - reference_height,
        "referenceHeightMethod": "rounded median cap-to-shared-ground height; one scalar for the entire clip",
        "clip": clip, "cells": cells,
        "review": {
            "anatomicalContactDifference": "accepted for narrow pilot: cells 0 and 2 show opposite lower feet, and passing cells 1 and 3 show differing occluded-leg geometry",
            "solidPaddingVerified": True, "nonzeroAlphaPaddingVerified": False,
            "sharedGroundCapHeightRange": [min(heights), max(heights)],
            "sharedGroundCapHeightSpanFraction": round((max(heights) - min(heights)) / reference_height, 6),
            "productionApproved": False, "familyApproved": False,
            "risks": [
                "Faint alpha 1..7 ghost pixels extend beyond the solid silhouette and reach some cell edges; they are preserved in the native source.",
                "Cap-to-common-ground height varies by 16 native pixels (about 2.9 percent); a common scale preserves this source variation instead of normalizing each pose.",
                "Solid sole bottoms vary by up to 19 pixels from the common ground reference; the passing pose can appear slightly elevated. No per-frame lowest-boot alignment is applied.",
                "Manual torso/pelvis landmarks are approximate; they provide a stable body root, not independently verified skeletal reconstruction.",
                "The source has visible edge color fringes and minor equipment/clothing drift between phases; native pixels are preserved.",
                "Only Union identity a, E, four marching phases are covered; ready, firing, other directions, identity b and Confederate clips retain accepted fallback art.",
                "Playback still requires game-scale browser inspection for apparent foot sliding, body wobble and silhouette transition quality.",
            ],
        },
    }
    atlas = {
        "frames": frames,
        "meta": {
            "image": ASSET.name, "size": {"w": CELL_W * CELL_COUNT, "h": CELL_H},
            "sha256": source_hash, "source": str(SOURCE.relative_to(ROOT)), "sourceHash": source_hash,
            "artPass": "gettysburg-v3", "candidate": True, "productionApproved": False,
            "layout": "four equal 543x724 native cells, full source rectangles, no trimming or repacking",
            "pixelTreatment": review["pixelTreatment"], "commonGroundReferenceY": GROUND_Y,
            "fixedCapToGroundReferenceHeight": reference_height, "clip": clip,
            "measurementReview": str(REVIEW.relative_to(ROOT)),
        },
    }
    return atlas, review


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify existing JSON and exact native PNG copy without writing")
    args = parser.parse_args()
    atlas, review = author()
    if args.check:
        for path, expected in [(ATLAS, atlas), (REVIEW, review)]:
            if json.loads(path.read_text()) != expected:
                raise ValueError(f"Authored metadata differs: {path.relative_to(ROOT)}")
        if sha256(ASSET) != SOURCE_SHA256:
            raise ValueError("Public PNG differs from the reviewed native source")
    else:
        ASSET.parent.mkdir(parents=True, exist_ok=True)
        REVIEW.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(SOURCE, ASSET)
        if sha256(ASSET) != SOURCE_SHA256 or sha256(SOURCE) != SOURCE_SHA256:
            raise ValueError("PNG copy verification failed")
        for path, data in [(ATLAS, atlas), (REVIEW, review)]:
            path.write_text(json.dumps(data, indent=2) + "\n")
    print(json.dumps({"verified": True, "sourceHash": SOURCE_SHA256, "textureKey": KEY,
                      "referenceHeight": atlas["meta"]["clip"]["referenceHeight"], "frames": CELL_COUNT,
                      "scope": "opt-in E marching pilot only", "productionApproved": False}))


if __name__ == "__main__":
    main()
