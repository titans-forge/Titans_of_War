# Gettysburg v4 generated source review

Read-only review of the generated native PNGs on 2026-10-01. This reviews the source pictures, not the Blender guides, runtime animation, or a whole infantry family. No source pixels or atlas metadata were changed.

**Decision: the sources justify a limited opt-in Union identity-a E preview covering march, ready, fire, and two simplified loading states. Production approval and full-family approval are withheld.** The firing pose improves cheek/stock contact and the marching grips remain attached. The source size changes and loading-rod ambiguity below must remain visible in the preview record.

## Source binding

Both files are native **1254×1254 RGBA**, with four equal **627×627** cells in a 2×2 row-major layout. Alpha extrema are 0–255.

| Source | SHA-256 |
| --- | --- |
| `docs/art-pass/candidates/gettysburg-v4/union-e-march-candidate.png` | `43b8f4394b6071958b693d83c14eb7f324e277706bd5513d23b536467e9f6a42` |
| `docs/art-pass/candidates/gettysburg-v4/union-e-actions-candidate.png` | `3e0ef9a0a0de5be7a5f10e16a703a611441088d5c39e081a0e11d7d436ad5c4a` |

The action source was first viewed at `/Users/titansforge/.codex/generated_images/01a07dec-6d36-7502-86fe-7095742e4f2e/exec-1ba9d767-a850-4ee8-9faa-c696a7eac056.png`; the later candidate copy has the same SHA-256. Native originals were inspected with `view_image`. Pillow was used only to read alpha and bounded cap regions.

## March observations

- The visible upper and lower hands remain on the foreend/stock in all four cells. Rifle inclination, wrist relationship, and upper-body carry are broadly consistent. Fingers and sleeve folds vary slightly, so this is visual attachment continuity rather than a mechanically identical authored rig.
- Contact cells 0 and 2 show opposing leading/trailing leg arrangements. The rearward foot is lower in cell 0; the forward foot is lower in cell 2. Passing cells 1 and 3 have different overlapping shin/boot arrangements beneath the pelvis. Anatomical left/right identity cannot be proved from the occluded side view alone.
- Cap, face, beard/sideburn region, blue coat, pale trousers, rolled blanket, pack, canteen, cartridge box and boots remain recognizable as the same figure. Minor cloth and gear-detail drift remains.
- The bayonet is long and visibly offset at the muzzle, with a consistent socket-like transition. It is much thinner than the body silhouette and will need inspection at the actual game scale.
- The bottom-row cap and sole positions are translated upward by roughly 14–17 native pixels relative to the top row. The source is not registered to the Blender root coordinates. Actual torso/pelvis annotations are needed; guide coordinates and lowest-boot centering cannot establish a stable root.

## Action observations

- Ready retains the identity and major equipment of the march source. Its carrying hand placement and steep rifle attitude read as the same general two-hand carry.
- Fire visibly presses the stock against the upper right shoulder and cheek. The rear hand reaches the grip/trigger area; the forward hand supports the foreend. The head now looks along the weapon. No muzzle flash is baked into the source. The pose is plausible for a preview, although sight alignment, finger placement and lock mechanics are not independently verified.
- The two loading pictures are distinct: cell 2 has a hand near the barrel mouth, while cell 3 raises a hand on a long narrow implement above the muzzle. The rifle remains upright and the stock/butt, barrel bands and percussion-lock-like region remain recognizable.
- **The ramrod and fixed-bayonet interpretation is not fully clear.** Thin near-parallel lines partly merge around the muzzle/raised hand, and the loading blade/rod proportions differ from the carry/fire pictures. Cell 3 suggests insertion but does not unambiguously demonstrate a ramrod entering the bore independently of a fixed bayonet. The two states can communicate “loading” in an opt-in preview; they cannot establish a historically correct loading drill.
- Reload bodies are larger than the fire body. A common scalar preserves this source discrepancy; it does not normalize the generated anatomy. Action switches may produce a visible size increase unless separately reviewed authoring addresses it.

The walnut-colored stock, several barrel bands, steel tube and long socket-style bayonet are broadly plausible for a representative Springfield-type percussion rifle musket. This is a visual inference, not exact-model identification. The [NPS reference](https://www.nps.gov/articles/000/civil-war-weapons-in-the-shenandoah-valley.htm) describes the M1861 as a single-shot percussion muzzleloader with a three-band walnut-stock barrel and a steel socket bayonet; related period weapons share several of those features. The generated lock, sights, band locations, blade dimensions and individual Gettysburg regimental arms remain unverified.

## Read-only geometry and alpha evidence

The cap top is measured within a manually selected cap region, at alpha ≥64. Sole bottom is the last alpha ≥128 silhouette row, recorded **only as a diagnostic**. These values are not approved pivots, per-frame scales or ground references.

| Source / cell | Approximate cap top Y | Diagnostic sole bottom Y | Cap-to-sole height | Solid padding L / T / R / B, alpha ≥64 | Faint pixels, alpha 1–7 |
| --- | ---: | ---: | ---: | --- | ---: |
| March 0, contact | 154 | 563 | 409 | 158 / 42 / 143 / 64 | 6,817 |
| March 1, passing | 155 | 563 | 408 | 225 / 42 / 134 / 64 | 6,714 |
| March 2, opposing contact | 137 | 549 | 412 | 173 / 26 / 143 / 77 | 7,997 |
| March 3, opposing passing | 138 | 549 | 411 | 227 / 31 / 132 / 78 | 6,433 |
| Actions 0, ready | 165 | 587 | 422 | 142 / 42 / 238 / 39 | 6,823 |
| Actions 1, fire | 178 | 588 | 410 | 73 / 178 / 16 / 39 | 8,652 |
| Actions 2, barrel-mouth loading | 123 | 567 | 444 | 146 / 71 / 297 / 59 | 8,878 |
| Actions 3, raised-rod loading | 123 | 568 | 445 | 150 / 77 / 292 / 59 | 9,584 |

March cap-to-sole span is about 1% across its four cells. The two loading figures are about 8.3–8.5% taller than the fire figure by this diagnostic. The cap-region boxes, in cell-local `[left, top, right, bottom]` pixels, were:

- March: `[270,125,375,235]`, `[270,125,390,240]`, `[270,105,380,225]`, `[270,105,385,235]`.
- Actions: `[185,140,280,240]`, `[130,150,215,245]`, `[195,100,285,220]`, `[195,100,285,220]`.

No solid silhouette touches a cell boundary. The firing blade leaves 16 pixels of right padding at alpha ≥64. Its right bound shortens by 22 pixels when the threshold rises to 200, demonstrating the fragile, partly transparent terminal blade stroke. Native faint speckles extend well beyond the solid silhouette; March cell 0 has a boundary pixel of alpha 1. Other cell edges measured zero. Cyan, blue, green and red edge fringes are visible around parts of the equipment, trousers and weapon. None were erased or recolored.

## Remaining preview boundary

Readiness means source review supports a bounded opt-in experiment with explicit fallback outside Union-a E. It does not establish in-game animation quality. Source-root authoring, common-reference handling, action-transition size stability, visible foot sliding, rod/bayonet readability and paused/resolving fallback still need game-scale observation. Missing actions, other directions, identity b and Confederate art are outside this source decision.
