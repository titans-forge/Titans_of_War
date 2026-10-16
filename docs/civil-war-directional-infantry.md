# Civil War Directional Infantry Proof

Original procedural geometry and articulated poses authored locally for
Titans Forge. No external meshes, photographs, texture downloads, generative
image models, or modified existing sprites are used. Uniforms are simplified
blue and gray visual identifiers, not authenticated regimental reconstructions.

## Integration Contract

- Files: `union-infantry.webp`, `confederate-infantry.webp`, matching Phaser JSON atlases.
- Each atlas: **2048 x 1920**, **16 columns x 12 rows**, 192 untrimmed transparent RGBA cells.
- Cell: **128 x 160**. Constant origin: **64,128**, normalized **0.5,0.8**.
- Direction indices: **0 E, 1 SE, 2 S, 3 SW, 4 W, 5 NW, 6 N, 7 NE**.
- Frame names: **`walk-0-0`**, `{action}-{direction}-{frame}`.
- Action order: `idle`, `walk`, `fire`, `reload`, `route`, `fall`.
- Four frames per action/direction. Index = `actionIndex * 32 + direction * 4 + frame`.
- Cell x = `(index % 16) * 128`; y = `floor(index / 16) * 160`.
- Origin is a ground contact reference. Fall retains that same reference; do not
  trim, recenter, or flip frames. Play fall once and hold its last frame.
- The parent renderer owns cycle timing, distance/simulation coupling, and selection.

## Reproduction

From `/Users/titansforge/Vault/Titans_of_War`:

```sh
/opt/homebrew/bin/python3.11 scripts/render-civil-war-infantry.py --layout-only
/opt/homebrew/bin/python3.11 scripts/render-civil-war-infantry.py --preview
/opt/homebrew/bin/python3.11 scripts/render-civil-war-infantry.py
```

Requires Blender with Cycles and Python with Pillow. Initial local environment:
Blender 5.2.1 LTS, Pillow 12.2.0. Blender's Metal startup crashes inside this
host's restricted sandbox; the approved local unsandboxed Blender execution
succeeds. This does not require network access or publishing.

The script constructs distinct posed 3D figures, rotates their geometry in 3D,
and renders them using a fixed 35-degree orthographic camera and fixed lights.
Rigid articulated sleeves, hands, trousers, boots, musket and ramrod change pose
between frames. Pillow only downsamples, losslessly encodes WebP, and labels the
review contact sheet. It never rotates, mirrors, or warps sprite images.

Per-atlas receipts record Blender settings, pose hashes, image and source hashes,
byte size, per-cell alpha bounds, and pixel hashes. The generator rejects blank
or edge-clipped cells and cycles without four distinct rasterized frames.

The editable source kit is `scripts/render-civil-war-infantry.py`. No `.blend`
file is saved or claimed. The script rebuilds all meshes, material assignments,
articulated poses, lighting, camera, and atlas metadata from scratch.

Only the two `.webp` atlases and two loader `.json` files belong in
`public/images/units/directional/`. Preview images and receipts default to
`/tmp/civil-war-infantry-evidence/`, outside the public release. This can be
overridden with `--evidence-dir`. The labeled contact sheet is
`/tmp/civil-war-infantry-evidence/proof-contact-sheet.png`.

Final geometry uses 24-sided smooth tapered sleeves/trousers, rounded cloth
shoulders/elbows/knees, a multi-ring tailored coat, shaped boots, and a muted
blue Union coat with lighter blue trousers and a neutral, slightly warm gray
Confederate palette. Default render quality is 32 Cycles CPU samples with 2x
supersampling, followed by one Lanczos downsample and lossless WebP encoding.

## Narrow Pipeline Inspection

Read-only inspection found Caesar-derived Formation V2 atlases in
`/Users/titansforge/Vault/Titans_of_War_Rise_of_Rome_Current/public/unit-atlases/`.
Its `MEDIA_RIGHTS.md` describes the Caesar Blender geometry and fixed-camera
pipeline, but the editable Caesar `art-source/` kit was not present in the
inspected Vault project. Only the compatible untrimmed Phaser atlas convention
is reused here; no Roman/Gallic geometry, pixels, or animation were copied.

This is a proof asset set. Keep existing infantry images until the parent has
verified readability and animation integration. No renderer/engine edits,
publishing, or removal of existing assets are part of this generation task.

## Verified Output, September 4, 2026

The revised smooth-geometry 32-sample render passed all 384 frame checks:
nonblank alpha, no hard cell-edge clipping, and four distinct pixel images for
every action/direction cycle. Before the color revision, an independent full rerender produced byte-identical
Union WebP and both JSON files. Confederate output differed at two decoded pixels:
one nearly transparent pixel (alpha 2) changed RGB, and one pixel changed blue by
one level. Alpha was identical throughout. Full byte identity across rerenders
or versions/platforms is therefore not claimed; layout and frame checks passed.

| Runtime image | Bytes | SHA-256 |
| --- | ---: | --- |
| union-infantry.webp | 936164 | 668b081f537b04246de3ca3f2018b43bc9b838fe4ff40243cda6956edbc64ce8 |
| confederate-infantry.webp | 854664 | 7bd3c4adca51c0e8f2792402309ccd00c95b16f6b55ed3b607c7989d6f24ed02 |

Current color-revision receipts: `/private/tmp/cw-infantry-palette-review/union-infantry-receipt.json`
and `/private/tmp/cw-infantry-palette-review/confederate-infantry-receipt.json`.
This revision changes only material colors, keeping all geometry and poses.
Independent comparison outputs: `/tmp/civil-war-infantry-final-repro/`.
Receipts and proofs are intentionally temporary, excluded from public assets.

Pixel inspection was performed through the local image tool, not a browser.
Parent integration still owns final in-game readability, scale, animation timing,
and gameplay verification. The local rendering stage took approximately 16-29
seconds per side at this quality; packing and validation add overhead.
