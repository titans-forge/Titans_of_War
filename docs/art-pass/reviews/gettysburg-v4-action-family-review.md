# Gettysburg v4: rifle continuity and the first matching action family

October 1, 2026. Local experimental pass; no upload or default-art promotion.

The Union A / east-facing pilot now has a steadier four-phase march, stationary ready carry, shouldered firing pose and two simplified loading states. It is available in exact historical Gettysburg through `?artPass=gettysburg-v4`. Unsupported directions, identities, armies, melee and casualties retain the accepted detailed art directly. Normal play still uses the accepted art.

## What improved

- Both marching hands stay attached to more consistent rifle grip points. A distinct long bayonet replaces the earlier vague barrel end. Opposite contact and passing silhouettes remain visibly different.
- The firing soldier places his cheek against the stock, shoulders the butt and supports the fore-end. The source contains no discharge effect.
- The renderer selects the new ready/fire/reload actions through the existing formation state. March remains driven by traveled distance; reload uses existing reload progress. Rendering does not change movement, firing, damage, casualties, timing or victory rules.
- Action-aware pause retains a phase only for its matching action. Unsupported-art fallback clears the retained action/phase, preventing an old phase from resurfacing on a paused return.
- A manually measured barrel-mouth anchor places flash and smoke through actual sprite scale and pivot. Smoke retains the shot origin through reload; a later volley cannot inherit the previous candidate origin. Reduced motion suppresses the flash.
- The development reviewer now uses a common 300-display-pixel body reference and registered ground plane, with enough space for complete bayonets. Sources remain isolated before translation, avoiding adjacent-cell leakage. Raw filmstrips remain visible.

## Source and registration evidence

Two native imagegen sheets, each 1254×1254 RGBA with four 627×627 cells, are preserved byte-for-byte in public assets. The new direct Blender guides are 1024×1024 RGBA; they constrain camera, poses, planted soles and hand/weapon attachment geometry without being accepted game art themselves.

| Source | SHA-256 | Native PNG bytes |
| --- | --- | ---: |
| March | `43b8f4394b6071958b693d83c14eb7f324e277706bd5513d23b536467e9f6a42` | 520,759 |
| Ready/fire/load/ram | `3e0ef9a0a0de5be7a5f10e16a703a611441088d5c39e081a0e11d7d436ad5c4a` | 542,117 |

Imagegen did not maintain the exact guide cell placement or one native body scale. Metadata uses manually annotated torso/pelvis roots, a ground reference shared within each row, and uniform standing-height calibration: march 412 px, ready/fire 426 px, reload 447 px. Firing retains the ready reference so its lowered head remains a posture change. Calibration does not prove anatomical or equipment continuity, and no per-phase boot or cap normalization hides source variation. Annotation uncertainty is approximately ±5 native pixels. The reviewer deliberately keeps a single 426 px reference across the action sheet so reload size drift remains inspectable.

The separate worker's [source review](gettysburg-v4-independent-source-review.md) accepts only the narrow opt-in preview. This is model-assisted visual review, not external human, historical, anatomical or balance validation. The [march measurements](gettysburg-v4-march-measurement.json), [action measurements](gettysburg-v4-actions-measurement.json), [prompt record](../prompts/gettysburg-v4-action-family.md), [manifest](../manifests/gettysburg-v4-action-family.json), and native guide receipts preserve the evidence.

Representative muzzleloading, stock/band and socket-bayonet context was checked against [NPS Civil War weapons in the Shenandoah Valley](https://www.nps.gov/articles/000/civil-war-weapons-in-the-shenandoah-valley.htm). Generated weapons are not certified exact Model 1861s or regiment-specific Gettysburg armament. The loading samples are simplified visual states, not a verified complete drill.

## Verification

- Full `npm run validate-assets` passed, including 17 clip-contract tests, 5 retained v3 renderer tests, 7 new v4 source/actual-renderer tests, and 8 detailed-art/preload tests.
- Gettysburg mechanics, command-brief and artillery suite passed. Ground-sorted standards: 6 passed; presentation cache: 14 passed; battle UI lifecycle: 7 passed.
- Both native-asset authoring scripts passed `--check`. Public hashes match unedited original PNG bytes. V3 sources and guide scripts remain intact.
- `npm run build` passed. Production output excludes the development reviewer chunk/UI/CSS, rejected studies, development source URLs and docs directory. Relative provenance paths remain harmless atlas metadata. Existing large-bundle warning remains.
- Browser review inspected registered ready/march, shouldered fire, both passing states and the loading source. Complete weapons fit within the enlarged review canvas. Rapid phase stepping remained responsive. Captures are in [gettysburg-v4](../captures/gettysburg-v4/).
- A fresh full-ammunition Gettysburg assault practice ran through legal destination preview/confirmation, 4× execution, pause and close-up controls to field time 179. An unsupported solo flanking column broke and escaped in disorder; that is a limited live renderer/control check, not a successful mission or balance evaluation. The browser did not isolate every new E action during that encounter; explicit action transitions and muzzle continuity were exercised in the actual-renderer tests and source reviewer.

The opt-in adds two atlases without duplicate loading of the three stationary actions. Exact Gettysburg preload increases from 45 entries / 43 unique assets / 36,646,749 bytes to 49 / 47 / 37,717,155 bytes: **1,070,406 additional file bytes (about 1.02 MiB)**. Nominal decoded RGBA source storage is 12,580,128 bytes (about 12 MiB), before browser/Phaser overhead. These are file and pixel counts, not network, startup-time, FPS or memory benchmarks. Other scenarios request no v4 textures.

## Remaining priorities, in order

1. Clarify separate ramrod/bayonet/bore geometry and remove colored edge fringes with a targeted native imagegen correction. Keep this small matching family under review until weapon and hand transitions hold at close-up and game scale.
2. Add one controlled diagonal bearing with the same identity, kit and action coverage; verify turn transitions against E before expanding all directions. Maintain accepted fallback during incomplete coverage.
3. Add the second Union identity and Confederate family using the established clips/registration contract. Distinct uniforms must preserve believable equipment and contact geometry.
4. Complete melee, casualty, recoil/settling and true standard-bearer artwork; the current physical standard still stands beside a rifleman rather than a soldier gripping its staff.
5. Inspect complete formations in independently played encounters and check load/performance on ordinary PCs before default promotion and wider battlefield rollout.

Production and full-family approval remain **false**. Gettysburg is still the first acceptance gate, followed by the battlefield order in the main art-pass plan. This pass warrants no new overall game grade.
