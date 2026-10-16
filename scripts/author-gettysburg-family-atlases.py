#!/usr/bin/env python3
"""Author Gettysburg v2 atlas geometry without changing any source pixels.

Reads the original RGBA PNGs and writes Phaser atlas JSON. Generated layout
guides are approximate: transparent column bands and a separate transparent
row band for each column define non-overlapping source rectangles.
"""

import argparse
import hashlib
import json
from pathlib import Path
from statistics import median

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public/images/units/gettysburg-v2"
DIRECTIONS = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"]
# Read-only visual annotation: in the Union ready E view the grounded rifle
# butt joins the shoe silhouette. The actual boot sole lies to its right.
BOOT_CENTER_ANNOTATIONS = {
    ("union", "ready", "a-ready-0"): 268.0,
    ("union", "ready", "b-ready-0"): 260.0,
}


def separator(values, opaque_counts, nominal, radius):
    """Choose the least residual alpha in a band without solid pixels."""
    candidates = range(max(1, nominal - radius), min(len(values), nominal + radius + 1))
    safe = [index for index in candidates if opaque_counts[index] == 0]
    pool = safe or list(candidates)
    return min(pool, key=lambda index: (values[index], abs(index - nominal), index))


def geometry(image, columns):
    width, height = image.size
    alpha = image.getchannel("A")
    pixels = list(alpha.getdata())
    column_mass = [sum(pixels[y * width + x] for y in range(height)) for x in range(width)]
    column_opaque = [sum(pixels[y * width + x] >= 64 for y in range(height)) for x in range(width)]
    edges_x = [0] + [separator(column_mass, column_opaque, width * col // columns, width // columns // 4)
                      for col in range(1, columns)] + [width]
    rows_by_column = []
    for col in range(columns):
        left, right = edges_x[col:col + 2]
        row_mass = [sum(pixels[y * width + left:y * width + right]) for y in range(height)]
        row_opaque = [sum(value >= 64 for value in pixels[y * width + left:y * width + right])
                      for y in range(height)]
        rows_by_column.append([0] + [separator(row_mass, row_opaque, height * row // 4, height // 16)
                                    for row in range(1, 4)] + [height])
    return alpha, edges_x, rows_by_column


def measure_pose(alpha, rect):
    """Measure the human silhouette, excluding the narrow bayonet tip."""
    left, top, width, height = (rect[key] for key in ["x", "y", "w", "h"])
    data = list(alpha.crop((left, top, left + width, top + height)).getdata())
    rows = [data[y * width:(y + 1) * width] for y in range(height)]
    body_counts = [sum(value >= 96 for value in row) for row in rows]
    cap_min_width = max(8, round(height * 0.04))
    cap_candidates = [y for y in range(height - 2)
                      if all(body_counts[index] >= cap_min_width for index in range(y, y + 3))]
    cap_top = cap_candidates[0] if cap_candidates else next(y for y, count in enumerate(body_counts) if count)
    sole_candidates = [y for y, row in enumerate(rows) if sum(value >= 128 for value in row) >= 4]
    ground = sole_candidates[-1] if sole_candidates else max(y for y, count in enumerate(body_counts) if count)
    # A shallow sole band excludes most raised rifle butts, which can appear
    # inside a taller boot band. Preserve any manual read-only annotations.
    boot_top = max(cap_top, ground - 7)
    points = [(x, rows[y][x]) for y in range(boot_top, ground + 1)
              for x in range(width) if rows[y][x] >= 128]
    weight = sum(value for _, value in points)
    boot_center = sum((x + 0.5) * value for x, value in points) / weight
    return {
        "capTop": cap_top,
        "groundY": ground + 1,
        "bootCenterX": round(boot_center, 3),
        "measuredHumanHeight": ground - cap_top + 1,
        "bootBand": {"top": boot_top, "bottom": ground},
    }


def author(path):
    side, page = path.stem.split("-")
    columns = 4 if page == "ready" else 8
    with Image.open(path) as image:
        if image.mode != "RGBA":
            raise ValueError(f"{path.name} must have native alpha")
        alpha, x_edges, y_edges_by_column = geometry(image, columns)
        row_cuts = []
        for col, edges in enumerate(y_edges_by_column):
            for y in edges[1:-1]:
                values = [alpha.getpixel((x, y)) for x in range(x_edges[col], x_edges[col + 1])]
                row_cuts.append({"column": col, "y": y, "maxAlpha": max(values),
                                 "solidPixels": sum(value >= 64 for value in values)})
        solid_cut_failures = [cut for cut in row_cuts if cut["solidPixels"]]
        frames = {}
        measurements = {}
        for row in range(4):
            for col in range(columns):
                identity = "a" if row < 2 else "b"
                direction = row % 2 * 4 + col if page == "ready" else col
                contact = None if page == "ready" else row % 2
                key = f"{identity}-ready-{direction}" if page == "ready" else f"{identity}-march-{direction}-{contact}"
                rect = {"x": x_edges[col], "y": y_edges_by_column[col][row],
                        "w": x_edges[col + 1] - x_edges[col],
                        "h": y_edges_by_column[col][row + 1] - y_edges_by_column[col][row]}
                pose = measure_pose(alpha, rect)
                annotation = BOOT_CENTER_ANNOTATIONS.get((side, page, key))
                if annotation is not None:
                    pose["alphaSoleCenterX"] = pose["bootCenterX"]
                    pose["bootCenterX"] = annotation
                    pose["pivotAnnotation"] = "Visible grounded boot sole; exclude adjacent rifle butt"
                measurements[key] = pose
                frames[key] = {
                    "frame": rect, "rotated": False, "trimmed": False,
                    "spriteSourceSize": {"x": 0, "y": 0, "w": rect["w"], "h": rect["h"]},
                    "sourceSize": {"w": rect["w"], "h": rect["h"]},
                    "pivot": {"x": round(pose["bootCenterX"] / rect["w"], 6),
                              "y": round(pose["groundY"] / rect["h"], 6)},
                }
        identity_heights = {}
        for identity in ["a", "b"]:
            identity_heights[identity] = round(median(pose["measuredHumanHeight"]
                                                    for key, pose in measurements.items() if key.startswith(identity + "-")))
            for key, entry in frames.items():
                if key.startswith(identity + "-"):
                    entry["bodyHeight"] = identity_heights[identity]
                    if entry["bodyHeight"] > entry["sourceSize"]["h"]:
                        raise ValueError(f"{path.name}: reference height exceeds {key} source cell")
        atlas = {
            "frames": frames,
            "meta": {
                "image": path.name, "size": {"w": image.width, "h": image.height},
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "generation": "OpenAI built-in imagegen; model identifier not reported",
                "candidate": True, "artPass": "gettysburg-v2", "side": side, "page": page,
                "background": "native alpha", "identityReferenceHeights": identity_heights,
                "directions": DIRECTIONS,
                "layout": "4x4: rows 0-1 identity a, rows 2-3 identity b; eight directions row-major"
                          if page == "ready" else "8x4: rows 0/1 identity a samples 0/1, rows 2/3 identity b samples 0/1; columns are eight directions",
                "sourceColumnEdges": x_edges, "sourceRowEdgesByColumn": y_edges_by_column,
                "separatorAnalysis": {
                    "solidAlphaThreshold": 64,
                    "solidRowSeparationVerified": not solid_cut_failures,
                    "rowCuts": row_cuts,
                    "solidRowCutFailures": solid_cut_failures,
                },
                "measurements": measurements,
                "measurementNotes": [
                    "Original PNG pixels are preserved. Rectangles are full assigned cells and are not trimmed.",
                    "Cuts use least alpha mass in bands with no alpha >=64 pixels, measured separately by source column.",
                    "Cap top uses a sustained broad silhouette to exclude narrow bayonet tips; ground uses the lowest solid sole band.",
                    "Boot-center pivots use alpha-weighted pixels in the last eight source rows above ground, with explicit annotations where a rifle butt touches a sole; inspect animation for anatomical registration.",
                    "One median human height per identity and page prevents per-contact or per-direction scale breathing.",
                    "Faint alpha residue can exist at generated separators. Distinct contact crops do not prove anatomically opposing leg contacts.",
                ],
            },
        }
        if page == "march":
            atlas["meta"]["movementReview"] = {
                "status": "movement study; opposing contacts not approved",
                "opposingSupportLegsVerified": False,
                "logicalContactSemantics": "Logical contact 0/1 identify distinct source samples; they do not certify opposing anatomical support legs.",
                "remainingFailure": "Several facing directions repeat the same leading leg across samples 0/1.",
                "sourcePixelEdits": False,
                "generatedCorrectionUsed": False,
            }
            atlas["meta"]["measurementNotes"].append(
                "Targeted imagegen corrections were reviewed and rejected for repeated leading legs; this atlas retains the original movement study pixels."
            )
        if solid_cut_failures:
            atlas["meta"]["measurementNotes"].append(
                "Source neighboring rows overlap solid pixels at the recorded failed cuts. Rectangular cropping cannot isolate both poses completely; re-author isolated source frames before production."
            )
    path.with_suffix(".json").write_text(json.dumps(atlas, indent=2) + "\n")
    return atlas


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("names", nargs="*", help="Source stems such as union-ready; default authors all four")
    args = parser.parse_args()
    names = args.names or [f"{side}-{page}" for side in ["union", "confederate"] for page in ["ready", "march"]]
    for name in names:
        path = ASSET_DIR / f"{name}.png"
        atlas = author(path)
        print(json.dumps({"image": path.name, "frames": len(atlas["frames"]),
                          "columnEdges": atlas["meta"]["sourceColumnEdges"],
                          "rowEdges": atlas["meta"]["sourceRowEdgesByColumn"],
                          "referenceHeights": atlas["meta"]["identityReferenceHeights"]}))


if __name__ == "__main__":
    main()
