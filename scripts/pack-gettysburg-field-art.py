"""Pack reviewed Gettysburg preview cells for interactive play.

Run with a Python that has Pillow. The original atlases and their filenames
remain the inputs for the historical preview queries.
"""

from copy import deepcopy
from hashlib import sha256
from pathlib import Path
import json
import subprocess

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT / "public/images/units/gettysburg-field-v1"
LIMIT = 2048
GUTTER = 2


def source_atlases():
    return json.loads(subprocess.check_output(
        ["node", "--input-type=module", "-e", """
import { gettysburgInfantryClipAssets } from './src/battle/gettysburgInfantryClipAssets.js';
console.log(JSON.stringify(gettysburgInfantryClipAssets('gettysburg', '?artPass=gettysburg-v32')));
"""], cwd=ROOT, text=True,
    ))


def read_atlas(descriptor):
    image_file = ROOT / "public" / descriptor["image"]
    metadata_file = ROOT / "public" / descriptor["json"]
    atlas = json.loads(metadata_file.read_text())
    meta = atlas["meta"]
    digest = sha256(image_file.read_bytes()).hexdigest()
    if digest != meta["sha256"]:
        raise ValueError(f"Source digest differs for {image_file}")
    cells = []
    native_size = None
    with Image.open(image_file) as sheet:
        for name, cell in atlas["frames"].items():
            rect = cell["frame"]
            size = (rect["w"], rect["h"])
            if cell["rotated"] or cell["trimmed"] or native_size not in (None, size):
                raise ValueError(f"Expected equal, untrimmed cells in {image_file}")
            native_size = size
            x, y = rect["x"], rect["y"]
            original = sheet.crop((x, y, x + size[0], y + size[1])).convert("RGBA")
            sprite_size = tuple(round(length / 4) for length in size)
            resized = original.resize(sprite_size, Image.Resampling.LANCZOS)
            bounds = resized.getbbox(alpha_only=True)
            if bounds is None:
                raise ValueError(f"Empty frame {name} in {image_file}")
            cells.append((name, resized.crop(bounds), bounds, sprite_size))
    clips = deepcopy(meta.get("clips") or [meta["clip"]])
    for clip in clips:
        clip["referenceHeight"] *= cells[0][3][1] / native_size[1]
    role = "contact" if clips[0]["action"] in ("melee", "fall") else "drill"
    provenance = {"image": descriptor["image"], "json": descriptor["json"], "sha256": digest}
    return (f'{clips[0]["side"]}-{role}', descriptor["key"], clips, cells, provenance)


def pack_sheet(output, groups):
    sheet = Image.new("RGBA", (LIMIT, LIMIT))
    x, y, row_height, right = GUTTER, GUTTER, 0, 0
    atlases = {}
    for _, key, clips, cells, provenance in sorted(
        groups, key=lambda group: (-max(cell[1].height for cell in group[3]), group[1])
    ):
        frames = {}
        for name, sprite, bounds, source_size in cells:
            if x + sprite.width + GUTTER > LIMIT:
                x, y, row_height = GUTTER, y + row_height + GUTTER, 0
            if y + sprite.height + GUTTER > LIMIT:
                raise ValueError(f"{output} exceeds {LIMIT} pixels")
            sheet.paste(sprite, (x, y))
            frames[name] = {
                "frame": {"x": x, "y": y, "w": sprite.width, "h": sprite.height},
                "rotated": False,
                "trimmed": True,
                "spriteSourceSize": {
                    "x": bounds[0], "y": bounds[1], "w": sprite.width, "h": sprite.height,
                },
                "sourceSize": {"w": source_size[0], "h": source_size[1]},
            }
            row_height = max(row_height, sprite.height)
            x += sprite.width + GUTTER
            right = max(right, x)
        atlases[key] = {"frames": frames, "meta": {"clips": clips, "source": provenance}}
    sheet = sheet.crop((0, 0, right, y + row_height + GUTTER))
    sheet.save(DESTINATION / f"{output}.webp", lossless=True, method=6, exact=True)
    with (DESTINATION / f"{output}.json").open("w") as file:
        json.dump({"version": 1, "width": sheet.width, "height": sheet.height, "atlases": atlases}, file,
                  separators=(",", ":"))
        file.write("\n")
    print(f"{output}: {sheet.width}×{sheet.height}, {len(atlases)} atlases")


def main():
    DESTINATION.mkdir(parents=True, exist_ok=True)
    atlases = [read_atlas(descriptor) for descriptor in source_atlases()]
    for group in ("confederate-drill", "confederate-contact", "union-drill", "union-contact"):
        pack_sheet(group, [atlas for atlas in atlases if atlas[0] == group])


if __name__ == "__main__":
    main()
