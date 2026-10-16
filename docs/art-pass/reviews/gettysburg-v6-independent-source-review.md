# Gettysburg v6 independent source review

Read-only source review on October 1, 2026. The candidate and native SE action guide were viewed with `view_image`; Pillow/NumPy measured native pixels. No images were cropped, cleaned, resampled, or otherwise changed. Human, historical, anatomical and production certification remain false.

**Current decision: the final padded Union identity-a SE action source supports a limited opt-in preview of ready, fire and two representative loading states. The three earlier attempts remain rejected for the recorded layout/bearing/padding failures. Other identities and full-family/production approval remain outside this decision.**

## First SE action source: rejected

The first source is `../candidates/gettysburg-v6/union-se-actions-candidate.png`, native **1254×1254 RGBA**, four equal **627×627** cells, **861,288 bytes**, SHA-256 `e25a0563b430988c4951afbb47e31ac22945d783e300f162090f79c6c2aad50a`, alpha extrema 0–255.

**Decision: reject integration and withhold source-geometry approval.** All four native cells fail the unchanged **alpha ≥64 padding ≥16 px on every edge** requirement. This is strong-opacity inter-cell contamination, not merely residual alpha-1 RGB. The ready and firing boots extend beyond their assigned top-row cells; their pixels intrude into the loading cells. Equal-cell isolation cannot recover complete, independent poses from this sheet without source regeneration.

| Cell | Action | Solid padding L/T/R/B, alpha ≥64 | Nonzero boundary pixels | Maximum boundary alpha | Decision |
| --- | --- | --- | ---: | ---: | --- |
| 0 | Ready | 171 / 18 / 148 / **0** | 76 | 253 | Reject |
| 1 | Fire | 79 / 126 / 28 / **0** | 75 | 253 | Reject |
| 2 | Load | 192 / **0** / 184 / 46 | 85 | 253 | Reject |
| 3 | Ram | 126 / **0** / 260 / 40 | 59 | 253 | Reject |

The bottom cells' top-boundary content includes the previous row's boots; it must not be mistaken for correctly positioned loading hardware. No cropping, clipping, per-action scaling, or relaxed padding threshold can establish acceptance for this source.

## Pose and identity observations

The three-quarter front/chest view, dark cap band, brown hair/beard region, navy coat, pale trousers, boots, rolled blanket, pack, disk canteen, cartridge box and diagonal straps remain broadly recognizable as Union identity-a from the accepted SE march. Ready uses a plausible stationary version of the diagonal carry. Both palms enclose their carried weapon regions. Minor face, cap, garment and gear variations persist; exact identity and equipment dimensions are not certified.

Fire has plausible upper-shoulder stock contact, cheek contact, a rear grip at the lock/trigger region and supporting palm beneath the fore-end. The upper body reads as a SE three-quarter view, and the gun projects lower-right. Individual fingers, trigger placement and sight alignment remain unverified. No discharge is baked in.

Load and ram show an upright bore axis, an offset fixed bayonet attached through a visible elbow/socket, and a separate slender rod on the bore axis. The raised hand wraps the rod above the barrel, while the lower hand supports the wooden fore-end. The first loading hand partly occludes the mouth/rod region. Both states are representative loading pictures, not a verified complete period drill. Source layout failure prevents acceptance regardless of these improvements.

## Firing-axis mismatch with the guide

The [native guide receipt](../candidates/gettysburg-v6/union-se-actions-guide.json) records the firing stock center `(206.964,273.547)` and barrel center `(269.416,309.368)`, cell-local in its 512 px guide cell. Their projected slope is approximately **0.574**, or **29.8° down-right**. These guide coordinates describe the authored model, not the generated source.

The generated source's stock-to-barrel-mouth direction is approximately **14–15° down-right**, materially shallower than that controlled SE guide. A manual mouth estimate is cell-local **(496,305)**, approximately ±4 px; its barrel tube terminates above the longer blade stroke. The estimated stock/butt-axis origin near `(158,224)` gives slope about 0.24. This is a manual image measurement, not a recovered camera or certified firing vector. The blade also appears steeper than the main barrel, so barrel/blade parallelism should be reviewed in the correction.

Preserve shoulder/cheek contact and both grips while following the guide's projected firing direction, approximately **25–35° down-right**. The tube and fixed bayonet blade should retain a coherent parallel direction, with the blade offset through its socket. Effects must later originate at the measured barrel mouth, not the blade tip. A size/layout correction alone does not establish that this firing geometry has been repaired.

## Body and registration diagnostics

Cap tops were measured at alpha ≥64 inside manual ROIs: `[240,70,360,200]`, `[140,95,255,235]`, `[265,35,385,180]`, and `[190,45,300,205]`. Top-row sole rows within a 627 px cell are truncated by its boundary, so full-source boot regions were measured separately: ready `[160,500,450,640]`, fire `[700,500,995,640]`, alpha ≥128. These regions stop before the next row's raised rod.

| Cell | Cap top Y, cell-local | Complete figure sole Y, cell-local | Diagnostic span |
| --- | ---: | ---: | ---: |
| Ready | 105 | **634, outside cell** | 529 |
| Fire | 126 | **633, outside cell** | 507 |
| Load | 61 | 580 | 519 |
| Ram | 75 | 586 | 511 |

These spans mix posture, foot projection and possible source-scale drift. Fire's lowered head must remain a pose difference. Do not match every cap-to-lowest-sole span through independent scaling. The source is too large/poorly placed for its cells, but broadly recognizable body proportions can be preserved by a common native-generation size correction.

Approximate diagnostic torso/pelvis X positions are `[284,194,312,242]`; an attempted top-row ground reference would be near Y=638, already outside a cell. Bottom-row ground is near Y=590. These are uncertain visual measurements, approximately ±5–8 px, **not approved pivots or atlas metadata**. No reference-height approval is issued for this rejected source. The corrected source needs fresh annotations and one common stationary reference across all actions.

## Transparency diagnostics

Using the same saturated-blue classifier as v5 (`R<80`, `G<100`, `B≥140`, `B≥R+90`, `B≥1.8G+30`), the cells have 530/629/244/397 diagnostic blue pixels at nonzero alpha. All 1,800 are below alpha 8: 1,792 at alpha 1, two at alpha 2, five at alpha 4, one at alpha 5. Under normal alpha compositing this classifier's residue has at most 5/255 channel contribution/change, mostly 1/255. It is not strong-opacity blue contamination and does not explain the alpha-253 boundary failure.

Faint alpha 1–7 counts are 9,830/9,088/12,905/12,669. Fully transparent all-edge padding also fails. Preserve native bytes and negative evidence; do not claim a fringe-free or independently isolated source.

## Spaced SE source: padding passes, firing bearing still withheld

The subsequent `../candidates/gettysburg-v6/union-se-actions-spaced-candidate.png` was inspected in all four native cells. It is **1254×1254 RGBA**, four **627×627** cells, **735,312 bytes**, SHA-256 `880cb6fc8dd66bc205b0a6c29fe7cdfca5d0c4245b5e67b5f97d668011cc5453`, alpha extrema 0–255.

**Decision: the source now passes the hard padding gate, but integration and firing-bearing approval remain withheld.** Whole figures are smaller and separately contained at substantial opacity. This establishes the measured result, not exact obedience to a uniform 88% geometric transform. Identity, camera, major equipment, carried grips and loading bore/rod/socket separation remain broadly coherent by inspection. No source is certified as a complete or historically verified drill.

| Spaced cell | Cap top Y | Diagnostic sole Y | Span | Solid padding L/T/R/B, alpha ≥64 | Minimum |
| --- | ---: | ---: | ---: | --- | ---: |
| Ready | 128 | 608 | 480 | 172 / 44 / 164 / 17 | 17 |
| Fire | 149 | 608 | 459 | 111 / 149 / 36 / 18 | 18 |
| Load | 88 | 567 | 479 | 202 / 88 / 191 / 59 | 59 |
| Ram | 81 | 566 | 485 | 156 / 43 / 244 / 60 | 43 |

Cap ROIs were `[240,100,360,245]`, `[160,110,275,265]`, `[265,70,390,205]` and `[210,75,330,230]`. Standing spans are now close: ready/load/ram 480/479/485 px. Fire's 459 px diagnostic includes its lowered head. One eventual stationary reference near **485 px** is appropriate if final source geometry and placement preserve this relationship; do not individually normalize the fire or reload states. These are still diagnostic suggestions, not approved final metadata.

The firing stock-axis origin near `(194,235)` and barrel mouth near `(499,315)` imply approximately **15° down-right**, ±several degrees from manual landmark uncertainty. The guide remains 29.8°. The terminal blade stroke also appears steeper than the main barrel. A targeted native correction should aim the complete firing assembly approximately 25–35° down-right with the barrel and blade coherent/parallel, and re-pose its shoulder, cheek, head and arms to maintain contact. Preserve the other actions' identity, scale and layout, but re-inspect all four after generation.

Ready and load each have four nonzero boundary pixels, all alpha 1; other boundaries are zero. There is no strong-opacity boundary crossing. Nonzero-alpha padding still fails on those left edges, so full-cell isolation remains necessary. Diagnostic blue counts are 498/343/323/439, totaling 1,603: 1,580 at alpha 1, nine at alpha 2, one at alpha 3, seven at alpha 4 and six at alpha 5; none reach alpha 8. Faint alpha 1–7 counts are 7,651/6,657/8,545/9,549. This is residual low-alpha RGB, not opaque blue contamination, and no cleanup occurred.

## Corrected firing-bearing source: padding rejection retained

The third source, `../candidates/gettysburg-v6/union-se-actions-bearing-candidate.png`, was viewed in all four cells and measured natively: **1254×1254 RGBA**, four **627×627** cells, **738,207 bytes**, SHA-256 `8575d57a5f4cccfa7aff619588b9168c23d0cfdc9ac633546e81e3409bf48910`, alpha extrema 0–255.

**Decision: the firing direction is now visually plausible for the controlled SE bearing, but the source remains rejected because both top cells fail the unchanged 16 px solid-padding gate.** Ready has 13 px bottom padding and fire has 12 px. Promising firing geometry does not relax this requirement.

The corrected firing assembly projects approximately **30–35° down-right** by manual visual axis assessment, inside the requested 25–35° band around the guide's 29.8°. Shoulder/stock and cheek contact remain visible, with a rear grip at the lock/trigger region and supporting palm beneath the fore-end. Barrel and fixed blade now read along the same general diagonal. Exact parallelism, individual fingers, sight alignment and rig attachment remain uncertified. This resolves the earlier substantial shallow-bearing concern at source-review level; it is not a runtime muzzle or facing validation.

Ready, load and ram were separately re-inspected. Major identity, kit, camera, carrying grips and upright loading geometry remain recognizable. The bore-axis implement and side-offset fixed bayonet remain distinct. The edit also changes placement and details outside fire, reinforcing the need to inspect every cell after the final generation. No baked discharge is visible.

| Bearing-source cell | Cap top Y | Diagnostic sole Y | Span | Solid padding L/T/R/B, alpha ≥64 | Decision |
| --- | ---: | ---: | ---: | --- | --- |
| Ready | 133 | 613 | 480 | 158 / 48 / 179 / **13** | Reject padding |
| Fire | 161 | 613 | 452 | 118 / 161 / 59 / **12** | Reject padding |
| Load | 93 | 582 | 489 | 194 / 93 / 186 / 44 | Padding pass |
| Ram | 94 | 582 | 488 | 148 / 52 / 233 / 44 | Padding pass |

Cap ROIs were `[240,100,360,245]`, `[160,105,290,265]`, `[265,60,390,215]` and `[210,65,330,230]`. The 480/489/488 standing spans and fire's lowered head remain diagnostics under a common eventual scale. No per-action calibration is justified, and no final roots/reference/muzzle metadata are approved for this rejected source.

Only fire has nonzero boundary pixels: two, both alpha 1. No alpha ≥64 silhouette crosses a boundary, but the required margin still fails. Diagnostic blue counts are 319/270/146/241, totaling 976: 962 at alpha 1, five at alpha 2, two at alpha 3, four at alpha 4 and three at alpha 5; none reach alpha 8. Faint alpha 1–7 counts are 6,993/6,627/7,445/8,226. Native pixels remain unchanged and fully transparent all-edge padding is still not guaranteed.

The next requested native-generation correction is to translate **both complete top-row figures and their weapons approximately 12 native pixels upward**, retaining pose, scale and grip relationships. Exact obedience would bring their bottom margins to approximately 25/24 px while leaving comfortable top clearance. Re-inspect all four cells afterward; no source geometry or final metadata are presumed unchanged.

## Final padded identity-a SE actions: limited source preview accepted

The fourth source, `../candidates/gettysburg-v6/union-se-actions-padded-candidate.png`, was freshly inspected in every cell. Native dimensions are **1254×1254 RGBA**, four **627×627** cells, **768,245 bytes**, SHA-256 `bd4650f0d15bf5abf612ebfd01edecf9560c7a459b96e2643ad76ca5d023b61e`, alpha extrema 0–255.

**Decision: accept only the limited opt-in Union identity-a SE ready/fire/two-state reload source preview.** Every edge of every cell passes the unchanged **16 px solid-padding gate at alpha ≥64**. Ready retains the SE front/chest bearing and attached carrying grips. Fire retains an approximately 31° projected barrel direction, shoulder/stock and cheek contact, a rear grip at the lock/trigger region, and supporting palm under the fore-end. Loading retains the separate upright bore/rod axis and offset fixed bayonet, with lower support on the fore-end. Both loading states remain simplified representative pictures; no complete historical drill, individual finger mechanics or exact firearm identity is certified.

Cap, face/hair, uniform, boots, rolled blanket, pack, canteen, cartridge box and straps remain recognizable relative to the accepted SE marcher and E action identity. Slight head/garment/equipment-proportion differences and generated detail variation remain. This supports a recognizable identity at source-review level, not a mechanically identical rig. No baked discharge is visible.

| Final cell | Cap top Y | Diagnostic sole Y | Span | Solid padding L/T/R/B, alpha ≥64 | Minimum | Proposed torso/pelvis X | Proposed row ground Y |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: |
| Ready | 104 | 587 | 483 | 157 / 18 / 176 / 39 | 18 | 270 | 590 |
| Fire | 119 | 580 | 461 | 117 / 119 / 56 / 45 | 45 | 238 | 590 |
| Load | 92 | 583 | 491 | 193 / 92 / 183 / 43 | 43 | 310 | 587 |
| Ram | 95 | 583 | 488 | 147 / 51 / 231 / 43 | 43 | 265 | 587 |

Final cap ROIs were `[225,75,360,240]`, `[145,80,285,250]`, `[260,65,390,220]`, and `[200,65,330,235]`. Cap top uses alpha ≥64; diagnostic sole uses alpha ≥128. Standing spans are 483/491/488 px; fire's 461 px reflects its lower head/posture and must not be individually normalized. Proposed torso and row-ground annotations are manual, approximately **±5–8 native pixels**, not recovered guide roots or a certified physical floor. Use **one common stationary reference of 495 px** for all four actions; retain source-size and posture differences visibly. Do not use separate loading, boot, or cap scalars.

The final firing **barrel-mouth center is approximately `(488,365)`**, normalized **`(0.778309,0.582137)`**, with approximately ±3–4 px uncertainty. A rear barrel-axis landmark near `(292,246)` gives a down-right vector of `(196,119)`, approximately **31.3°**, consistent with the guide's 29.8° within manual uncertainty. The barrel ends above the socket/blade stroke; blade pixels continue farther down-right. These are manual source landmarks. Runtime effects must use the mouth, and runtime aim/effect continuity still requires verification.

The generation did **not** perform an exact 12 px translation. Ready cap/sole rows change from 133/613 to 104/587, while fire changes from 161/613 to 119/580; resulting body spans and other details also change. Load and ram change slightly despite their requested preservation. Acceptance is based on inspection and measurements of this final native file, not exact compliance with the requested transformation.

Ready has five nonzero boundary pixels; load has seven; all are alpha 1. Fire and ram boundaries are zero. Fully transparent all-edge padding therefore remains false, even though the solid-padding gate passes. Diagnostic blue counts are 355/338/197/62, totaling 952: 935 at alpha 1, one at alpha 2, three at alpha 3, seven at alpha 4 and six at alpha 5. There are zero at alpha ≥8, including ≥64, ≥128 and ≥200. Faint alpha 1–7 counts are 6,987/7,114/8,099/8,645. Under ordinary alpha compositing the diagnostic-blue residue contributes/changes channels by at most 5/255, predominantly 1/255. Preserve native pixels and complete-cell isolation; do not claim a fringe-free sheet.

## Remaining runtime and family boundary

The initial layout correction requested an approximately **12% common reduction of every complete figure and its weapon**, preserving identity, proportions, camera and pose relationships, plus placement inside each independent cell. The spaced successor cleared padding without establishing an exact 88% transform; the subsequent bearing correction improved firing direction but failed top-row bottom margins. Only the final padded source above clears both narrow source criteria. Preserve complete bayonets, both boots, raised rod, bore/socket/blade/rod separation and hand attachments. Do not independently shrink loading states or normalize individual boots/caps.

Every newly generated cell requires independent inspection because imagegen can alter cells outside the requested change. The first source remains rejected for layout, the spaced successor for incomplete bearing, and the bearing correction for top-row padding. Only the final padded identity-a source supports an opt-in preview of SE ready/fire/two-state reload; accepted SE march remains its own source. Runtime action/direction switches, common-scale anatomy, weapon continuity, measured muzzle effects, paused/fallback behavior and actual formation use require verification before broader acceptance. Other actions, identities, armies and bearings retain accepted-art fallback. Identity-b artwork, if produced, requires a separate review. Production and full-family approval remain false.
