# External v10 final Confederate diagonal march review

Reviewed 2026-10-03 by a Codex review agent. **Narrow visual-preview approval for both final sheets, with source order `[0,1,2,3]`.** This approval is bound only to the exact final hashes below. It does not transfer to earlier anatomical, guide-only, passing-fixed, or margin-deficient candidates.

The final sheets contain visibly distinct contact and passing configurations consistent with the colored native anatomical references. The repaired NW BR now changes support from the near/left chain in TR to the far/right chain. The repaired NE BR now differs from TR and reads as near/right support with far/left swing. The NE TR pelvis is partly obscured, so its absolute far/left attribution remains a lower-confidence visual reading rather than a measured skeletal fact. There is no positive evidence warranting chronology `[0,3,2,1]`; cell reordering is not being used to invent a missing phase.

This is an agent image review for limited preview and source authoring. It is not physical ground-contact measurement of the generated soldier, anatomical certification, historical-drill validation, full-family acceptance, default-production promotion, or a gameplay result.

## Exact reviewed sources

| Source | Native dimensions | SHA-256 | Alpha-64 minimum cell padding, TL/TR/BL/BR |
|---|---|---|---|
| `candidate/docs/art-pass/candidates/gettysburg-v10/confederate-a-ne-march-candidate.png` | 1254×1254; 627px cells | `48f4c9537b8326d7d1451da727aae73161661ae408fd32ecb467d5d412d26b3d` | 33 / 34 / 40 / 45px |
| `candidate/docs/art-pass/candidates/gettysburg-v10/confederate-a-nw-march-candidate.png` | 1254×1254; 627px cells | `b66a59f4135fdf91f9b6750fb918552603055b6917497ea9934b27d9765d1a69` | 35 / 37 / 33 / 32px |

All eight final cells were inspected. No cell was assumed unchanged after an image-generation edit. The NW candidate is byte-identical to the reviewed NW passing-fixed sheet; this identity was checked by SHA-256. The NE final candidate was viewed anew after margin correction, and all registration measurements below were read from that final file. No old candidate coordinates were reused.

The whole images were inspected at original resolution. PNG bytes were read using standard-library IDAT decompression and PNG filters for alpha bounds, cap landmarks, and boot bounds. No source pixels were cropped, resized, mirrored, cleaned, recolored, translated, or otherwise written.

## Native anatomical comparison

Reference files are `candidate/docs/art-pass/candidates/gettysburg-v10/confederate-ne-march-anatomical-diagnostic.png` and `confederate-nw-march-anatomical-diagnostic.png`, with their existing JSON receipts. Anatomical left is blue and anatomical right red. Their pose-transform hashes match the unchanged gray native guides exactly. Native rig ground evidence belongs to those guides, not to the generated artwork.

For NE, the anatomical right hip is nearer the camera and the left hip farther away. For NW, anatomical left is nearer and right farther away. A projected boot's image side does not by itself identify its anatomical hip: the long rear boot can occupy the same image side in opposing contact poses.

| Cell | Intended phase | Final NE chain assessment | Final NW chain assessment |
|---|---|---|---|
| TL | Left contact | Near/right chain trails down-left; far/left chain advances up-right and is partly hidden. Consistent with native left-forward contact. | Near/left chain advances up-left; far/right chain trails down-right. Consistent with native left-forward contact. |
| TR | Left support passing | Lower support chain is consistent with far/left attachment; near/right boot is bent/lifted beside it. Hip overlap prevents a firm skeletal label, but the configuration now differs from BR. | Near/left thigh, shin and boot form the descending support chain; far/right leg bends toward the raised boot. Clear left-support reading. |
| BL | Right contact | Far/left thigh trails down-left while near/right chain advances up-right. The separated thigh origins are consistent with the opposing contact. | Near/left foreground thigh crosses toward the trailing down-right boot; far/right advances up-left behind it. Consistent with the opposing contact. |
| BR | Right support passing | Near/right chain descends to the planted-looking boot on the right; far/left boot is visibly raised to its left, partly behind the standing leg. This is distinct from TR. | Far/right chain descends to the support boot; near/left knee flexes strongly and its boot lifts to image-left. This supplies the support change that the preceding candidate lacked. |

Keep native row-major chronology: left contact → left support passing → right contact → right support passing. This is a narrow visual topology assessment; a transparent image does not expose a ground plane or measured joint skeleton. NE uncertainty must remain explicit in any subsequent source ledger or review claim.

## Fresh registration and one scale per source

Coordinates below are **cell-local native pixels**. Ground rows are artistic registration lines shared within each row, selected from the fresh boot bounds. They are not physical world-ground measurements. Pelvis X values are visual anatomical-registration proposals, cross-checked against root's fresh independent landmark measurements; allow about ±5px uncertainty because coat and pouches hide the precise pelvic center. Do not substitute an individual boot location for the pelvis root.

| Source | Cell | Pelvis X | Shared row ground Y | Cap top Y | Registered cap-to-ground span |
|---|---|---:|---:|---:|---:|
| NE | TL | 275 | 594 | 162 | 432 |
| NE | TR | 285 | 594 | 161 | 433 |
| NE | BL | 273 | 587 | 161 | 426 |
| NE | BR | 285 | 587 | 161 | 426 |
| NW | TL | 341 | 592 | 179 | 413 |
| NW | TR | 316 | 592 | 179 | 413 |
| NW | BL | 341 | 576 | 154 | 422 |
| NW | BR | 317 | 576 | 155 | 421 |

Fresh alpha-64 exclusive boot-bottom readings were NE `[594,593,587,582]` and NW `[592,590,576,576]`. Shared row ground values are consequently NE `[594,587]` and NW `[592,576]`. Cap-top readings were independently confirmed from visually selected head windows that exclude the musket: NE `[162,161,161,161]`, NW `[179,179,154,155]`.

Use **one common body reference of 430px for the NE march source and 420px for the NW march source**, with an approximate ±8px artistic-calibration uncertainty. No separate per-frame normalization is proposed. Registered span variation is 7px for NE, about 1.6% of its reference, and 9px for NW, about 2.1%. Individual lowest-boot bounds vary with stride, perspective and swing; that is not a measurement of changing physical body stature. The common references must not imply physical or drill certification.

## Appearance and kit continuity

The final marching sources restore the accepted short taupe-gray jacket, pale trousers, cream blanket roll, brown neck-length wavy hair, blue-gray cap trim, tan circular canteen, dark waist pouches and crossed carrying straps. Their musket and fixed carrying grip remain coherent across the reviewed poses. No diagnostic blue/red leg material appears in final artwork.

Appearance was compared separately from gait to these exact stationary references:

- `candidate/docs/art-pass/candidates/gettysburg-v10/confederate-a-ne-actions-candidate.png`, SHA-256 `3036c2de71157958023a82c7034ace597bba02d7b8bad6d09fa7b8e289e98a85`.
- `candidate/docs/art-pass/candidates/gettysburg-v10/confederate-a-nw-actions-candidate.png`, SHA-256 `a84512cd372b714d41913b849b97aceb4d99daf4d02f175130a0190a16329bd0`.

The body-relative kit and clothing read as the same limited Confederate A family. This is not a complete historical equipment-inventory claim. Stationary-source acceptance does not establish gait; the passing repair and fresh eight-cell review supply the narrow gait finding above.

## Remaining boundary

These exact sources may proceed to versioned, opt-in limited-preview authoring with row-major phase indexes and the single-source reference heights. The usual source-bound native authoring, registry, actual renderer, frame/pivot, pause/reduced-motion, bearing/fallback and default-behavior checks still belong to integration validation. This review alone does not establish those results or authorize a broader production/default claim.
