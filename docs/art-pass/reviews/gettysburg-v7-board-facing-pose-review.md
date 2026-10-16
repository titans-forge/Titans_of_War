# Gettysburg v7 board-facing structural and Confederate N pose review

Model-assisted, read-only image and geometry review on October 1, 2026. Native PNGs were viewed directly; receipts, source hashes and bounded native pixel regions were read for measurements. No PNG pixels were edited, cropped, resized, cleaned, recolored or repacked. These observations are not independent human, anatomical, historical, drill or production validation.

## Native structural guides

The [new wrapper](../../../scripts/render-gettysburg-board-facing-guides.py) imports the unchanged v4 authorable renderer and makes one checked in-memory selected-entry direction replacement per job. It selects the renderer's existing Union or Confederate palette. Body, legs, arms, weapon assembly, camera and pose code remain unchanged. Four Cycles CPU jobs ran sequentially at 16 samples and eight threads with a factory scene reset between renders.

All four guides are native **1024×1024 RGBA** PNGs, four equal **512×512** cells. Every camera is identical: orthographic, elevation 35°, scale 6, location `(0,-81.9152069,57.3576431)`. Each projected ground root is `(192,440.003)` cell-local, within numerical tolerance of `(192,440)`, with actual root world Z=0. The unchanged source formula `yaw=-pi/2-direction*pi/4` gives S2 `-pi` and N6 `-2pi`; it gives the previous SE1 `-3pi/4`. S visibly faces the camera, N visibly faces away.

| Guide | SHA-256 | Bytes | Minimum solid padding, alpha ≥64 | Cap-to-sole fraction of cell |
| --- | --- | ---: | ---: | --- |
| [Union S march](../candidates/gettysburg-v7/union-s-march-guide.png) | `b2ca51175eef4e691340d697dff4c4f295ce4bdfb99b8089b6cb88d014318aca` | 452,657 | 28 px | 56.35–60.20% |
| [Union S actions](../candidates/gettysburg-v7/union-s-actions-guide.png) | `ced9e1dcaefcde88423ebcebe86653a2741f9b38bd54cf28472a9071da8036e5` | 453,847 | 46 px | 56.70–57.17% |
| [Confederate N march](../candidates/gettysburg-v7/confederate-n-march-guide.png) | `bc02642f32379810c85c7bbda94c4e5975379221c509945c02b14f7e970f4f4e` | 478,301 | 36 px | 56.85–60.71% |
| [Confederate N actions](../candidates/gettysburg-v7/confederate-n-actions-guide.png) | `0724d5892c8350731274ff4317045a0aa0b4197e756af99752bb53bbba34a1b0` | 453,268 | 46 px | 55.32–55.80% |

The body-span figures preserve contact/passing and foot-projection differences; no per-phase normalization was applied. March cap bob spans approximately 6.71 native pixels, and stationary action cap centers have zero drift. The original v2 renderer, v4 guide and prior v5/v6 wrappers retain their recorded hashes.

March order is left contact, left/first passing, right contact, right/opposite passing, source frames `[1,2,3,0]`. Authored contact soles both reach actual Z=0. First passing has left-leg support and raised right foot; opposite passing has right-leg support and raised left foot. Legacy mesh names `left-far` and `right-near` mean anatomical left/right here; their E-facing depth qualifiers do not establish cardinal front/back depth.

The complete musket remains 1.38 world units, the socket bayonet blade 0.45, its lateral offset 0.035. March hand and weapon coordinates are identical across phases. Load and ram retain identical musket placement and supporting left-hand grip; ram raises the working hand 0.43 units above the bore and includes a separate 0.85-unit inserted rod.

| Firing guide | Stock-to-mouth screen delta | Firing axis | Actual barrel-mouth point, cell-local | Bayonet tip, cell-local |
| --- | --- | ---: | --- | --- |
| Union S | `(0,+135.089)` | +90° | `(156.160,363.150)` | `(150.187,411.606)` |
| Confederate N | `(0,-135.089)` | −90° | `(227.840,108.635)` | `(233.813,60.179)` |

Those are actual authored 3D barrel-end projections, distinct from blade tips. Both firearms have zero stock-to-mouth world-Z change: their near-vertical **screen** ray is expected foreshortening of a level world-space aim toward or away from the elevated camera. It does not mean that the soldier points the musket vertically into the ground or sky. Source generations must preserve this relationship rather than rotate to E/SE to make a long horizontal weapon silhouette.

Primitive shoulder contact is geometrically present, but the upright head does not establish cheek-to-stock or eye-to-sight alignment. In N views, the backpack naturally hides the forward supporting grip and much of the upright loading weapon. Absence of visible front hands is not proof of detachment; the generated source still cannot inherit the guide's rig/attachment guarantees. Facial identity, exact fingers, complete campaign kit and period drill cannot be certified by these back-facing primitive references.

The four JSON receipts now record this read-only inspection while retaining `productionApproved=false`, `familyApproved=false`, `anatomicalValidation=false` and `historicalValidation=false`. Guide acceptance is limited to useful structural input, with no accepted final artwork or runtime claims.

## First generated Confederate A N march source

Inspected [the first native source](../candidates/gettysburg-v7/confederate-a-n-march-candidate.png) in all four cells. It is **1254×1254 RGBA**, four **627×627** cells, **540,671 bytes**, SHA-256 `b41f0b3641fe52961813f105fe3fb8ece7b2b8c9d4c966d694ca308e0333a96c`, alpha extrema 0–255.

**Decision: withhold source-preview acceptance.** Both bottom cells fail the unchanged source gate of **at least 16 px padding at alpha ≥64 on every cell edge**. Additionally, the passing pair does not yet convincingly alternate support. A spacing-only generation cannot establish that the latter concern is repaired.

| Cell | Solid padding L/T/R/B, alpha ≥64 | Cap top Y | Diagnostic sole bottom Y, alpha ≥128 | Span | Provisional pelvis X | Provisional row-shared ground Y |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 0, left contact | 227 / 26 / 219 / 21 | 159 | 605 | 446 | 315 | 610 |
| 1, first passing | 213 / 26 / 231 / 26 | 159 | 600 | 441 | 302 | 610 |
| 2, right contact | 228 / **5** / 217 / 43 | 136 | 583 | 447 | 315 | 588 |
| 3, opposite passing | 213 / **6** / 233 / 62 | 134 | 564 | 430 | 302 | 588 |

Cap tops use alpha ≥64 within manual ROIs `[270,120,342,220]`, `[260,120,322,220]`, `[270,100,342,205]`, `[260,95,320,205]`. Sole diagnostics use alpha ≥128 in manual boot ROIs `[225,430,380,627]`, `[225,430,395,627]`, `[225,405,385,627]`, `[220,405,390,627]`. Span is sole-bottom minus cap-top, in zero-based inclusive coordinates. The weapon is excluded from cap/sole regions. Manual pelvis and row-ground estimates are approximately ±5–8 native pixels; they are diagnostic suggestions, **not approved pivots or atlas metadata**.

If a corrected source retains comparable body size, a single source-wide reference near **455 native pixels** would preserve the standing body relation and row registration without concealing gait differences. This is provisional only; no approved reference is issued for the rejected source. Do not separately normalize the 430 px opposite-passing span to the contact spans or infer a physical ground plane from the lowest boot.

The true rear view, cap, wavy brown hair/nape, grey clothing, horizontal blanket roll, crossed straps, dark bags, left disk canteen, right cartridge box, boots and carried weapon remain broadly coherent across the sheet. One visible upper gripping hand wraps the weapon near the right shoulder; the other supporting hand is largely hidden on the front side. Kit size, fingers, hidden grip attachment, facial identity and exact weapon model are uncertified. The additional realistic kit is not evidence of a verified Confederate campaign inventory. No baked discharge is visible.

The contact pair plausibly changes which anatomical leg advances away from the camera: cell 0 has the shorter/up-projected left chain, while cell 2 has the shorter/up-projected right chain. Toe/heel roll and transparent cutout projection prevent proof of actual ground contact. The first and opposite passing cells, however, both visibly trace the screen-left/anatomical-left thigh through a long descending shin into the lower boot, while the screen-right thigh bends into the lifted boot with its sole facing the camera. This concern is based on hip–knee–shin continuity and occlusion, **not just lowest-boot coordinates**. Some posterior hip detail is hidden by bags, so the anatomical assignment remains uncertain, but the repeated visible chain does not establish the intended opposing support states.

A targeted native-generation correction should retain cell 1's left support and make cell 3's **screen-right/anatomical-right leg** the long planted support. Its screen-left thigh, knee, shin and lifted boot should form the other passing chain. Preserve rear camera, equipment, body scale and carried grip placement; changing only a boot coordinate does not repair a repeated thigh/knee arrangement. The whole-sheet spacing correction must also leave all four weapon tips and boots at least 16 solid pixels inside their assigned cells. Every cell requires fresh inspection after generation, including cells outside the requested edit.

There is one nonzero boundary pixel, alpha 1, in cell 0; other native boundaries are zero. Faint alpha 1–7 counts are 5,586 / 6,347 / 6,180 / 6,138. The existing saturated-blue diagnostic finds 3 / 13 / 13 / 11 nonzero-alpha pixels, none at alpha ≥8. This is faint residual RGB under normal alpha compositing, not an opaque blue fringe or an excuse for the 5/6 px solid-margin failures. Native pixels and negative evidence remain preserved.

Corrected Confederate N sources are pending. Any later source decision remains distinct from runtime gait, muzzle effects, depth ordering, formation performance and production or full-family acceptance.

## Gait successor: alternating support visible, final padding pending

Independently viewed [the gait successor](../candidates/gettysburg-v7/confederate-a-n-march-gait-candidate.png) in all four cells. The parent supplied source binding SHA-256 `82b91a9655e18ed39f22d3c06e5c9b94cfcdd8a9e4ec645593b4732feb0ceb4b`. Final native pixel/registration measurements are deferred to the forthcoming padding successor, as requested; no intermediate body or root calibration is issued here.

The previous repeated-support concern is resolved at visual source-review level. Cell 0 advances the left leg away from the camera; cell 2 advances the right. Cell 1 traces the left thigh through the long supporting shin while the right leg bends/lifts toward the camera. Cell 3 now traces the right thigh through the long supporting shin while the left thigh, knee and lifted boot form the opposite passing chain. These assessments trace the legs from the posterior hips and their occlusion, rather than infer support from a sole row alone. Ground contact, precise joint locations and foot trajectories remain uncertified.

The rear camera, grey cap and clothing, wavy brown hair/nape, horizontal strapped blanket roll, crossed straps, dark bags, left canteen and right cartridge box remain broadly coherent. The visible upper hand still wraps the carried weapon near the right shoulder. The other supporting hand is naturally occluded on the front side, so exact generated grip attachment cannot be independently established from this view. No discharge is visible.

**Acceptance remains withheld pending the final padding source.** The parent's pixel check reports top-row bottom margins of 0/2 px, below the unchanged 16 px source gate. The requested complete top-row translation must preserve both body and weapon, with one shared source body reference and no raster postprocessing. Every cell will be re-inspected after generation, including the corrected opposite passing chain and the nominally unchanged bottom-row kit and grips. Earlier source rejections remain recorded above.

## Final spaced Confederate A N march: limited source preview accepted

Freshly inspected [the final spaced source](../candidates/gettysburg-v7/confederate-a-n-march-spaced-candidate.png) in every cell. Native dimensions, mode, bytes and hash were independently measured: **1254×1254 RGBA**, four **627×627** cells, **516,307 bytes**, SHA-256 `cf9e0535f7dd581b815940c32a35d51b4ec573d92c6a3cdfbaf4bb74ccc10e64`, alpha extrema 0–255. This establishes the final result, not obedience to an exact 40 px translation or preservation of every nominally unchanged pixel.

**Decision: accept a limited opt-in Confederate identity-a N march source preview.** Every cell passes the unchanged 16 px solid-padding gate at alpha ≥64. The corrected passing pair remains visible: cell 1 traces the left leg into the straight supporting chain, with the right lifted; cell 3 traces the right leg into the straight supporting chain, with the left lifted. Contact cell 0 advances the left chain away from the camera and cell 2 advances the right. Anatomical chains and occlusion support the source-level reading; physical planted-foot trajectories and recovered skeleton coordinates remain uncertified.

The true rear facing, elevated projection, cap, wavy brown nape/hair, grey coat and pale trousers, horizontal strapped blanket roll, crossed straps, dark bags, left canteen, right cartridge box, boots and carried musket remain broadly coherent. The visible upper hand still wraps the weapon near the right shoulder. The forward supporting hand is naturally occluded; exact generated attachment, fingers and facial identity cannot be certified. The major kit is visually consistent, not a verified period or regiment-specific inventory. No discharge is baked into this march source.

| Final cell | Solid padding L/T/R/B, alpha ≥64 | Cap top Y | Sole bottom Y, alpha ≥128 | Diagnostic span | Manual pelvis X | Row-shared ground Y |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 0, left contact | 234 / 36 / 208 / 35 | 153 | 591 | 438 | 318 | 596 |
| 1, first passing | 170 / 36 / 271 / 39 | 153 | 586 | 433 | 258 | 596 |
| 2, right contact | 233 / 38 / 207 / 36 | 160 | 590 | 430 | 320 | 595 |
| 3, opposite passing | 166 / 38 / 271 / 42 | 160 | 584 | 424 | 256 | 595 |

Final cap ROIs are `[275,120,345,230]`, `[220,125,267,230]`, `[275,130,345,240]`, `[220,135,267,245]`; they exclude adjacent rifle hardware. Final boot ROIs are `[245,410,390,627]`, `[205,405,340,627]`, `[245,420,390,627]`, `[200,425,340,627]`. Cap and sole pixel rows are exact diagnostics for those manually chosen regions and thresholds. The span is sole row minus cap row, not a normalization target or proof of source skeleton scale.

Use **one common source-wide body reference of 440 native pixels for all four phases**, with the manual pelvis roots and ground Y shared within each source row above. Registration uncertainty is approximately **±5–8 native pixels**. The transparent source does not recover the guide's physical floor. Source-wide calibration preserves the 438/433/430/424 px differences rather than independently scaling caps, soles or passing poses. The bottom-row cap placement and smaller body/foot-projection diagnostics remain inspectable in common-scale playback.

Only cell 2 has a nonzero boundary pixel, alpha 1; the other three boundaries are zero. Faint alpha 1–7 counts are 5,481 / 5,597 / 5,330 / 6,806. The saturated-blue diagnostic finds 5 / 4 / 4 / 8 nonzero-alpha pixels, none at alpha ≥8. Low-alpha color residue remains unchanged; the solid-margin pass does not mean full transparent padding at every alpha level or a fringe-free source. Preserve full native cells and normal alpha compositing.

This source decision covers **Confederate identity-a N march only**. Stationary actions, other bearings and identities, runtime gait timing, root/foot sliding, transitions, depth ordering, effects and formation performance require their separate checks. Earlier source and gait/spacing rejections are retained. Production, full-family, historical/anatomical and independent human validation remain false.

## First Confederate A N actions: visual inspection, layout rejected

Viewed [the first action sheet](../candidates/gettysburg-v7/confederate-a-n-actions-candidate.png) in all four cells. Native file binding was checked independently: **1254×1254 RGBA PNG**, **562,460 bytes**, SHA-256 `05d4e1e6ae31805db79db5c4546074f43e77ff7127f071846bbf3766ffd4df4a`. The parent reports alpha ≥64 L/T/R/B margins of `254/39/187/0`, `183/93/263/0`, `276/0/171/45`, `191/0/261/46`; this supplement did not repeat intermediate pixel/registration measurement. Source row spill is also visible in the native view. **Withhold source acceptance:** the complete top-row figures are not contained inside their cells, and previous-row boots intrude into the bottom-cell boundary region. No final body, root or effect metadata is issued.

The ready and firing pictures are distinct. Ready holds the carried weapon beside the right shoulder with a lower elbow; fire raises the right elbow and working hand toward the upper-right shoulder, with a comparatively short stock region and a chiefly upscreen barrel. Shoulder/arm relationships make a shouldered N shot plausible under back-view occlusion. An upscreen line alone would not establish valid firing: the apparent stock butt, wrist chain and shoulder relationship must survive the corrected generation. Exact hidden butt termination, cheek/eye alignment and forward supporting grip remain uncertified.

A provisional manual firing **barrel-mouth** estimate is cell-local `(296,168)`, approximately ±6 px, below the longer offset blade tip. A rear stock-axis landmark near `(305,284)`, approximately ±8 px, gives a projected delta around `(-9,-116)`, approximately −94°: chiefly N with slight left deviation. This is uncertain image geometry, not a recovered world-space rifle axis or approved effect anchor. Re-annotate the tube mouth independently after final generation; do not use the blade tip as the flash/smoke origin.

Load and ram visibly differ through the raised working hand and thin implement. The barrel/bore, side-fixed socket bayonet and loading rod terminations remain close and partly occluded in the rear view. The padding regeneration should preserve separate bore and fixed bayonet geometry and a separate working rod, without exposing both front hands unnaturally. A size/spacing repair alone cannot certify hidden grip contact or historical loading drill. Cap, brown wavy hair/nape, grey cloth, blanket roll, crossed straps, dark bags and hip kit remain broadly coherent with the accepted N march source.

The parent plans one common native-generation reduction and corrected placement for complete figures/weapons. No exact geometric transform or unchanged outside-cell pixels will be presumed. Final acceptance requires fresh inspection of all four cells, every solid edge, stock/shoulder pose, bore/socket/rod distinction, one common action-sheet body reference, row-shared grounds and a freshly measured barrel mouth. Source pixels remain untouched, and march approval does not extend to these rejected action cells.

## Final padded Confederate A N actions: limited source preview accepted

Freshly inspected [the final native action sheet](../candidates/gettysburg-v7/confederate-a-n-actions-padded-candidate.png) in every cell. Independently measured file binding is **1254×1254 RGBA**, four **627×627** cells, **468,067 bytes**, SHA-256 `8c97e41c277a07f7e63d08bbb7aa91782ab38a7769531fc2bc9dcf2dd7c5faf0`, alpha extrema 0–255. The final result is established directly; neither an exact 75%/80% scale transform nor unchanged outside-cell pixels is presumed.

**Decision: accept a limited opt-in Confederate identity-a N ready/fire/load/ram source preview.** Every cell passes the unchanged 16 px solid-padding gate at alpha ≥64, with a minimum margin of 24 px. All four figures remain rear-facing under a consistent elevated view. The cap, brown wavy hair/nape, grey coat, pale trousers, strapped blanket roll, crossed straps, left disk canteen, dark bags and right cartridge box remain broadly coherent with the accepted N march source. This is major-kit visual continuity, not verified facial identity or a regiment-specific historical inventory.

Ready retains the carried weapon beside the right shoulder and a relatively low elbow. Fire raises the right elbow, moves the hand into the upper-right shoulder/stock region, and presents a much shorter, chiefly upscreen barrel projection. This combination makes a shouldered N firing pose plausible under back-view occlusion; the upscreen barrel alone would not establish firing. The exact hidden butt termination, cheek/eye-to-sight alignment and forward supporting grip cannot be certified. The loading cells differ through a lower working hand near the upright weapon in load and the raised hand/thin working implement in ram. Their bore, fixed offset bayonet and rod terminations remain close or hidden by the back-facing body, so exact rod insertion, hidden grips and period drill remain uncertified. No discharge is baked into these source cells.

| Final cell | Solid padding L/T/R/B, alpha ≥64 | Cap top Y | Sole bottom Y, alpha ≥128 | Diagnostic span | Manual pelvis X | Row-shared ground Y |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 0, ready | 268 / 81 / 197 / 28 | 234 | 598 | 364 | 348 | 606 |
| 1, fire | 194 / 159 / 274 / 24 | 242 | 602 | 360 | 264 | 606 |
| 2, load | 282 / 66 / 175 / 90 | 167 | 536 | 369 | 352 | 543 |
| 3, ram | 201 / 84 / 266 / 88 | 172 | 537 | 365 | 268 | 543 |

Final cap ROIs are `[305,210,370,300]`, `[235,215,274,305]`, `[310,140,380,230]`, `[235,145,280,240]`; they exclude adjacent firearm hardware. Final boot ROIs are `[280,470,425,627]`, `[195,480,335,627]`, `[290,410,410,580]`, `[210,420,325,580]`. Cap and sole rows are exact diagnostics within these manually selected regions at their stated thresholds; span means sole row minus cap row. Use **one common source-wide body reference of 375 native pixels for every action**, with the manual pelvis roots and row-shared grounds above. Registration uncertainty is approximately **±5–8 native pixels**. The fire head's lower position and all 364/360/369/365 px body diagnostics remain inspectable at this common scale. Neither the transparent image nor its lowest boot recovers the guide's physical ground plane.

The final firing **tube mouth** is estimated at cell-local **`(285,195)`**, approximately **±4 px**, normalized **`(0.45454545,0.31100478)`** within its 627 px cell. The longer offset blade tip is near `(292,159)` and is not the effect anchor. A visible rear barrel-axis landmark near `(291,250)`, approximately ±4 px, gives projected delta `(-6,-55)`, approximately **−96.2°**: chiefly N with a slight screen-left deviation. At alpha ≥128 the hardware's row 195 has a separate x285–286 mouth run beside the x292–297 blade run; this distinguishes the tube endpoint from the blade. Angle uncertainty is several degrees. This manually read image segment does not recover the hidden world-space axis, stock attachment or eye/sight alignment.

Native boundary nonzero counts are **2 / 0 / 1 / 0**, all at alpha 1. Faint alpha 1–7 counts are **7,234 / 6,190 / 6,534 / 6,108**. At any nonzero alpha, L/T/R/B padding is `105/23/0/24`, `39/21/153/16`, `49/61/0/78`, `1/19/55/24`; there is therefore no claim of a transparent margin at every alpha level. Preserve complete native cells and ordinary alpha compositing.

The raw RGB view exposes conspicuous saturated red/yellow/green residual values, so these were checked against alpha rather than ignored. Strict predicates use red `R≥220,G<80,B<80`, yellow `R≥220,G≥200,B<80`, and green `G≥220,R<80,B<80`. Their respective nonzero-alpha counts are **1,181 / 1,573 / 24**, maximum alpha **2 / 2 / 2**, with **zero pixels at alpha ≥8, ≥64 or ≥128**. The saturated-blue predicate `R<80,G<100,B≥140,B≥R+90,B≥1.8G+30` finds **31** nonzero pixels, all alpha 1, distributed **7 / 8 / 9 / 7** across cells. Broader saturated predicates were also checked: red `R≥160,G<100,B<100,R≥G+90,R≥B+90`, yellow `R≥160,G≥140,B<80,R≥B+90,G≥B+80`, and green `G≥140,R<100,B<100,G≥R+70,G≥B+70`. Their respective counts are **1,191 / 1,593 / 48**, maximum alpha **4 / 4 / 3**, again zero at alpha ≥8, ≥64 or ≥128. Under ordinary straight-alpha compositing these classifications contribute at most 4/255 of their raw RGB values. They do not show opaque colored contamination; these bounded diagnostics are not exhaustive color classifiers or a guarantee of a fringe-free source. No residual pixels were cleaned or otherwise modified.

This decision covers **Confederate identity-a N stationary actions only**. The generated image does not inherit physical hand/weapon attachment guarantees from the native guide. Runtime mouth effects, pose registration and transitions, root/foot sliding, occlusion, depth ordering and formation performance need separate checks. Earlier rejected sources remain preserved above. Production, full-family, anatomical/historical/drill and independent human validation remain false.
