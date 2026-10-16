# Gettysburg v5 independent generated-source review

Read-only source inspection on October 1, 2026. Native PNGs were viewed with `view_image`; Pillow/NumPy read pixels and measured bounded regions. No source pixels or runtime code were changed. This report does not validate runtime animation, a complete infantry family, exact period drill, or regiment-specific weapons.

**Current decision: the fresh E action sheet supports a limited opt-in Union identity-a preview of ready, fire, and two simplified loading states, paired with the unchanged v4 E march. The final padded SE source also supports a limited opt-in Union identity-a SE march preview. The fresh v5 E march study and earlier SE attempts remain rejected; their negative evidence is preserved below. Production and full-family approval remain false.**

## Source binding and negative evidence

Each source below is native 1254×1254 RGBA, with four 627×627 cells in row-major order. Alpha extrema for the fresh action sheet are 0–255.

| Source | SHA-256 | Bytes | Decision |
| --- | --- | ---: | --- |
| Fresh E actions, `../candidates/gettysburg-v5/union-e-actions-candidate.png` | `78fa2637045fc066ad86c1ea118897e30ac35542a1a14c6327f923a904b8201f` | 592,405 | Limited source preview |
| Final padded SE march, `../candidates/gettysburg-v5/union-se-march-padded-candidate.png` | `90a124967a778789bcdbaf5b83fc0cba689f145486450ba775798ec106bfc103` | 609,955 | Limited SE march source preview |
| Unchanged v4 E march, `../candidates/gettysburg-v4/union-e-march-candidate.png` | `43b8f4394b6071958b693d83c14eb7f324e277706bd5513d23b536467e9f6a42` | 520,759 | Retain prior limited preview |
| First action edit, `../candidates/gettysburg-v5/union-e-actions-rejected-edit.png` | `a1a5f22bcf727f0f404a6bd23356f3ef48f09b6b0926ca22ff5923d12d1c90ae` | 605,651 | Rejected |
| Fresh E march study, to be preserved as `../candidates/gettysburg-v5/union-e-march-rejected-fresh.png` | `d4348cf8570faa556251428374be268215601bac46ced07169697be780133eee` | 608,464 | Rejected as a gait loop |

The first action edit increased the standing loading-body spans from v4's 443/444 px to 456/456 px, versus ready 432 px. It retained loading-hardware uncertainty and increased saturated-blue low-alpha residue. The rejection is preserved; regeneration does not establish that the first edit succeeded.

The fresh E march keeps recognizable kit and attached carrying hands, but both contact cells retain the same visible arrangement: the forward/right boot ends above the rear/left boot. At alpha ≥128, the rear/front sole diagnostics are 587/565 px in cell 0 and 579/561 px in cell 2. In the retained v4 source, these are 562/524 and 518/548: the visible ordering reverses. The fresh passing cells also repeat the near-leg planted/far-leg bent-behind arrangement. Occlusion prevents a definitive anatomical left/right assignment, but the fresh source does not supply convincing opposite contacts. Its consistent 439–441 px body spans do not repair this gait problem. Its diagnostic blue counts at nonzero alpha are 364/15/278/11; all are below alpha 8. The rejected study is not evidence for an improved march loop.

## Fresh E action observations

Ready preserves the recognizable navy coat, pale trousers, cap, rolled blanket, pack, canteen, cartridge box, boots, and two-hand carry. Fire places the stock against the upper shoulder and cheek; the rear hand reaches the grip/trigger region and the forward hand supports the underside of the fore-end. The firearm is continuous through both grips. Individual finger assignment, sight alignment, lock details, and exact weapon-model identity remain unverified. No discharge effect is baked into the source.

The loading cells now separate the upright barrel/bore axis from a bayonet attached through a visible offset collar/elbow. A slender implement follows the bore axis through the working-hand region. The raised-hand cell reads more clearly as ramrod insertion than v4: the bayonet stays to the side instead of merging with the rod. The lower hand supports the fore-end in both cells. The working hand still occludes part of the rod; the open bore and the exact insertion depth are not continuously exposed. These remain two representative loading pictures, not a complete or historically verified sequence. Ground contact of the rifle butt cannot be certified from a transparent cutout and diagnostic sole rows alone.

Ready, load, and ram retain much closer standing size than v4. Fire's lower cap position is compatible with its head/shoulder posture and should not be erased by scaling that cell separately. The fresh action figure and retained v4 marcher remain recognizable, but exact head proportions, garment cut, equipment dimensions, and anatomical continuity across their sources are not certified. Common-scale in-game transitions remain an acceptance step.

## Body and registration diagnostics

Cap top uses alpha ≥64 inside a manually selected head region; sole bottom uses the last alpha ≥128 row. Span is `sole bottom − cap top`, with zero-based inclusive coordinates. This is a diagnostic, not a per-frame normalization or approved ground plane.

| Cell | v4 cap / sole / span | Fresh v5 cap / sole / span | Proposed torso/pelvis X | Proposed row ground Y |
| --- | --- | --- | ---: | ---: |
| 0, ready | 165 / 586 / 421 | 124 / 605 / 481 | 219 | 609 |
| 1, fire | 178 / 587 / 409 | 143 / 606 / 463 | 145 | 609 |
| 2, load | 123 / 566 / 443 | 108 / 586 / 478 | 247 | 590 |
| 3, ram | 123 / 567 / 444 | 110 / 586 / 476 | 233 | 590 |

Fresh standing spans differ by about 1%; v4 loading spans exceeded ready by about 5%. The proposed roots are visual annotations with approximately ±5–8 native-pixel uncertainty, not recovered Blender coordinates. Use the row-shared ground references and one stationary-action reference, approximately **485 px** when calibrated to ready's cap-to-proposed-ground span. Do not independently scale fire or loading cells, and do not recenter a pose on its lowest boot.

Fresh cap ROIs, in cell-local `[left,top,right,bottom]`, were `[180,80,300,220]`, `[120,100,245,240]`, `[200,75,320,215]`, and `[160,75,290,210]`. The corresponding v4 ROIs were `[185,140,280,240]`, `[130,150,215,245]`, `[195,100,285,220]`, and `[195,100,285,220]`.

The firing **barrel-mouth center is approximately (488,210)** cell-local, normalized `(0.778309,0.334928)`, with approximately ±3 px uncertainty. The upper barrel terminates near x487–488 / y209–211; the offset bayonet continues around y217. Effects must originate at the barrel mouth, not the blade tip. This is a manual source landmark, not runtime effect verification.

## Transparency and blade evidence

The saturated-blue diagnostic is `R<80`, `G<100`, `B≥140`, `B≥R+90`, and `B≥1.8G+30`. It identifies bright residual RGB; it is not an exhaustive color-fringe classifier.

| Cell | Fresh solid padding L/T/R/B, alpha ≥64 | Fresh nonzero-alpha padding L/T/R/B | Boundary nonzero pixels | Fresh faint pixels, alpha 1–7 | Diagnostic blue pixels, alpha ≥1 |
| --- | --- | --- | ---: | ---: | ---: |
| Ready | 147 / 19 / 222 / 20 | 0 / 16 / 6 / 15 | 2 | 7,687 | 39 |
| Fire | 73 / 143 / 32 / 20 | 9 / 37 / 22 / 0 | 2 | 6,941 | 22 |
| Load | 175 / 108 / 262 / 40 | 0 / 17 / 6 / 32 | 30 | 9,285 | 107 |
| Ram | 153 / 62 / 269 / 40 | 15 / 1 / 40 / 33 | 0 | 9,348 | 48 |

All listed boundary pixels are alpha 1. No solid silhouette touches a cell boundary, but **transparent padding at every alpha level fails**. Full-cell isolation is still necessary; the images were not cleaned or recolored.

The fresh actions have 216 diagnostic blue pixels: 214 at alpha 1, one at alpha 3, one at alpha 5. V4 actions have 421: 420 at alpha 1 and one at alpha 3. The rejected first edit has 1,235: 1,228 at alpha 1, one at alpha 3, six at alpha 4. All three have zero diagnostic blue pixels at alpha ≥8, including ≥64 and ≥128. Raw transparent-image presentation makes residual blue conspicuous; normal alpha compositing bounds the fresh diagnostic-blue channel contribution/change to at most 5/255, and almost all of it to 1/255. This is evidence of very faint residual RGB, not opaque blue contamination or an absence of colored residue.

The fresh fire cell's rightmost alpha ≥64 bound is x594, leaving 32 px padding. At alpha ≥200 it is x590, a 4 px shortening; v4 shortens by 22 px at that threshold. The fresh blade therefore has a more continuous strong-opacity terminal stroke by this diagnostic. Actual game-scale visibility remains unverified.

## Independent SE diagonal study decision

The SE candidate and its native Blender guide were subsequently inspected. The generated source is `../candidates/gettysburg-v5/union-se-march-candidate.png`, SHA-256 `6196626331c6c2476d32fd7506ae427563f7744fd87fabe3ee11f91e7cc6b7f9`, 618,392 bytes, native 1254×1254 RGBA. The structural guide is `../candidates/gettysburg-v5/union-se-march-guide.png`; its [receipt](../candidates/gettysburg-v5/union-se-march-guide.json) records four anatomical phases, planted support legs, foot projections and fixed hand/weapon attachments. The receipt is evidence for the authored guide, not proof that imagegen preserved its skeleton.

**SE decision: withhold approval of this four-phase marching source pending repair or clearer verification of the first passing cell.** The two contact cells are promising and plausibly alternate anatomical leading legs. In cell 0, the screen-right/far thigh continues to the forward knee and lower/right leading boot. In cell 2, the screen-left/near thigh crosses in front toward the lower/right leading boot while the far leg recedes. This is a change in hip-to-knee continuity and occlusion; both leading boots can project screen-right/lower in this diagonal camera. Their boot coordinates alone would not justify rejecting the contact pair.

The passing pair remains the concern. In both generated cells 1 and 3, the screen-left/near thigh appears to continue into the long descending shin and supporting boot, while the screen-right/far thigh bends outward/back toward the raised boot. The guide receipt requires first-passing support by `left-far` and opposite-passing support by `right-near`. In the guide's first passing pose, the near foot is 0.12 world units above the ground despite its projected sole being close to the far sole; in opposite passing, the far foot is raised instead. Thus screen-space sole height does not identify support. Generated cloth and overlapping thighs prevent an exact skeletal assignment, but the repeated visible hip/knee/support arrangement does not yet establish the required alternating passing states.

A targeted correction should preserve cells 0, 2 and 3, torso scale, camera, kit and carrying grips. In cell 1, trace the far/right-image thigh down into the planted support shin and boot; swing the near/left-image thigh and knee through with its lifted boot passing alongside. Preserve the same fore-end and stock grip locations. Re-review the hip/knee crossing rather than accepting a boot-position change alone.

Both hands remain visibly attached to the carried weapon in all four cells; the upper grip encloses the fore-end and the lower grip encloses the stock/grip region. The cap, face, coat, trousers, rolled blanket, pack, canteen, cartridge box and boots remain recognizable. Small cloth, face and finger-detail differences remain. The steel barrel and bayonet form a continuous diagonal silhouette; exact socket mechanics and weapon identity remain unverified. No baked discharge is visible.

| SE cell | Cap top Y | Diagnostic sole bottom Y | Span | Solid padding L/T/R/B, alpha ≥64 | Nonzero-alpha padding L/T/R/B | Faint alpha 1–7 pixels | Diagnostic blue, alpha ≥1 |
| --- | ---: | ---: | ---: | --- | --- | ---: | ---: |
| 0, far-contact | 141 | 617 | 476 | 226 / 32 / 106 / 9 | 87 / 29 / 0 / 4 | 9,220 | 128 |
| 1, first-passing | 139 | 604 | 465 | 140 / 33 / 208 / 22 | 7 / 30 / 96 / 6 | 7,724 | 10 |
| 2, near-contact | 123 | 598 | 475 | 251 / 18 / 98 / 27 | 19 / 15 / 8 / 16 | 8,897 | 16 |
| 3, opposite-passing | 122 | 586 | 464 | 139 / 19 / 207 / 39 | 17 / 6 / 44 / 30 | 7,887 | 29 |

Cap ROIs were `[290,110,420,240]`, `[195,100,325,245]`, `[290,90,425,240]` and `[190,90,325,235]`. Contact spans agree within 1 px, as do passing spans. The smaller passing cap-to-lowest-sole span is compatible with changed foot placement/projection and must not be automatically corrected by per-cell scaling. Body size is otherwise broadly consistent by visual inspection; exact anatomical dimensions are not certified.

Cell 0 has three boundary pixels, all alpha 1; all other boundaries are zero. No solid silhouette touches a boundary, but the first contact's bottom solid padding is only 9 px. The 183 diagnostic blue pixels comprise 181 at alpha 1 and two at alpha 5; there are zero at alpha ≥8. These are very faint residual RGB under normal compositing, not strong-opacity blue contamination. Full-cell source isolation remains necessary.

For a future corrected source that preserves the current layout, provisional torso/pelvis X annotations are approximately `[340,239,349,238]`, with one row-shared ground reference near Y=620 for the top row and Y=600 for the bottom row, and one body reference near 480 px. These are uncertain visual registration suggestions, **not approved atlas metadata**. The current SE source remains outside the approved opt-in coverage until the passing-state boundary is resolved. Do not copy Blender roots as generated-source coordinates or center each phase on its lowest boot.

## SE passing repair review and padding rejection

The subsequent `../candidates/gettysburg-v5/union-se-march-repaired-candidate.png` was independently inspected. It is native 1254×1254 RGBA, 628,077 bytes, SHA-256 `2e03848f869bc393e5fa165b51f3450e2f9d0765cea81dbfafa0efc62fb12f5e`, with alpha extrema 0–255.

**The passing repair is visually plausible, but this source remains rejected for approved opt-in use because it fails the unchanged 16 px solid-padding gate.** At alpha ≥64, cell 0 has only **12 px bottom padding**. This does not justify cropping, resampling, per-frame scaling, or weakening the gate.

In repaired cell 1, the screen-right/far thigh now descends through a comparatively straight shin into the supporting boot, while the near/screen-left thigh bends into the lifted boot. Cell 3 retains near-leg support and a bent far leg. These are now plausibly opposite passing states when traced from the hips, and the contact pair still plausibly alternates through the change in thigh crossing. This resolves the earlier passing-state concern at source-review level; it does not certify a rig or an in-game walking loop.

All four cells were inspected because the edit also changed upper-body details and row placement. Carrying hands remain attached to their weapon grip regions, and major kit and identity remain recognizable. Minor cap, face, coat and weapon-detail changes persist. Cap-to-lowest-sole diagnostics differ more than in the first SE candidate; those spans alone cannot distinguish anatomical scale change from leg projection and posture, so common-reference registration and runtime transitions must remain inspectable.

| Repaired SE cell | Cap top Y | Diagnostic sole bottom Y | Span | Solid padding L/T/R/B, alpha ≥64 | Gate result |
| --- | ---: | ---: | ---: | --- | --- |
| 0, far-contact | 141 | 613 | 472 | 219 / 33 / 115 / 12 | **Fail: bottom 12 < 16** |
| 1, first-passing | 140 | 606 | 466 | 135 / 33 / 219 / 20 | Pass |
| 2, near-contact | 112 | 600 | 488 | 238 / 17 / 111 / 26 | Pass |
| 3, opposite-passing | 113 | 587 | 474 | 132 / 17 / 219 / 39 | Pass |

Cap ROIs remain the same as the first SE study. Cell 0 has two alpha-1 pixels on its right boundary; cell 1 has one alpha-1 pixel on its bottom boundary; other boundaries are zero. Diagnostic saturated-blue counts are 368/80/78/429, totaling 955: 944 at alpha 1, seven at alpha 2, three at alpha 4, and one at alpha 5. None reach alpha 8. This edit increases bright residual RGB, but it remains very faint under correct alpha compositing; it is not an opaque blue fringe. No pixels were erased or recolored.

A concrete native-generation padding correction is to translate the complete cell 0 soldier and weapon approximately **10 native pixels upward**, retaining its pose, body scale and hand attachments. If obeyed exactly, its alpha ≥64 padding would become approximately `219 / 23 / 115 / 22`, clearing the gate. The current last solid row is 614; a compliant result requires it at or above row 610, with other boundaries still at least 16 px away. This is a requested generation geometry, not permission to manipulate the source afterward. Every cell must be re-inspected after another generation. No roots or atlas approval are issued for this rejected repair.

## Final padded SE source decision

The final `../candidates/gettysburg-v5/union-se-march-padded-candidate.png` was inspected independently in all four cells, not assumed unchanged from the repair. Native file dimensions measured **1254×1254 RGBA**, with four **627×627** cells, 609,955 bytes, SHA-256 `90a124967a778789bcdbaf5b83fc0cba689f145486450ba775798ec106bfc103`, alpha extrema 0–255.

**Decision: approve only a limited opt-in Union identity-a SE march source preview.** All four cells pass the unchanged **16 px solid-padding gate at alpha ≥64**. The passing repair remains visible: cell 1 traces the far/right-image thigh through the supporting shin, with the near leg lifted; cell 3 traces the near thigh through the supporting shin, with the far leg bent/lifted. Contact cell 0 leads through the far thigh; contact cell 2 leads through the near thigh crossing in front. These are plausible alternating anatomical phases from hip/knee continuity and occlusion, not deductions from boot-coordinate ordering alone.

Upper and lower carrying hands remain attached to the fore-end and stock/grip regions in every cell. Major kit, identity, camera and SE bearing remain recognizable. Fingers, face, cap, coat folds and steel details still vary; the final generation subtly changes cells beyond the padding target. Exact anatomy, weapon dimensions, grip rigging, planted-foot trajectories and historical drill are not certified. No discharge effect is baked into the source.

| Final SE cell | Cap top Y | Diagnostic sole bottom Y | Span | Solid padding L/T/R/B, alpha ≥64 | Minimum padding | Proposed pelvis X | Proposed row ground Y |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: |
| 0, far-contact | 127 | 599 | 472 | 217 / 26 / 119 / 26 | 26 | 342 | 612 |
| 1, first-passing | 139 | 608 | 469 | 133 / 35 / 219 / 17 | 17 | 241 | 612 |
| 2, near-contact | 111 | 602 | 491 | 238 / 16 / 111 / 24 | 16 | 344 | 605 |
| 3, opposite-passing | 112 | 589 | 477 | 131 / 18 / 219 / 37 | 18 | 241 | 605 |

Final cap ROIs were `[290,100,420,240]`, `[195,100,325,245]`, `[290,90,425,240]` and `[190,90,325,235]`. The native body-span variation remains visible and must not be erased by separately scaling the contact or passing cells. Proposed pelvis/row-ground annotations are manual, approximately **±5–8 native pixels**, and do not assert recovery of the guide's physical floor. Use **one common SE source reference of 490 px** for all phases, with the proposed row-shared ground references; no per-phase cap, boot, or body calibration. Source placement and body/projection differences require actual game-scale observation before broader acceptance.

There are 10/4/9/0 nonzero cell-boundary pixels, all alpha 1. Solid padding passes, but fully transparent padding at every alpha level does not. Faint alpha 1–7 counts are 5,067/4,624/5,643/4,716. Diagnostic blue counts are 173/4/12/245, totaling 434: 428 at alpha 1, four at alpha 2, one at alpha 3 and one at alpha 4. None reach alpha 8. Under normal alpha compositing this diagnostic residue has at most 4/255 per-channel contribution/change, predominantly 1/255. Preserve native pixels and full-cell isolation; do not describe the sheet as free of colored residue.

Only SE **march** is covered by this source decision. SE stationary carry/ready, firing, loading, melee and casualties, other bearings, other identities and other armies must retain their accepted-art fallback. Direction/action transitions into and out of this subset, gait at actual scale, foot sliding and formation performance remain runtime acceptance tasks. This final source approval does not reverse the rejections of the earlier SE or E attempts and does not establish production readiness.

## Remaining acceptance boundary

The fresh E stationary actions, previously accepted unchanged v4 E march, and final padded SE march are supported for a bounded opt-in source preview. Action-switch scale, weapon-length continuity, the measured muzzle effect, pause/retained-action behavior, formation use, and performance require runtime checks. The first SE study fails the passing-state review and its repair fails the solid-padding gate; only the final padded SE source passes both narrow source-review criteria. SE stationary actions and additional bearings, identities, Confederate soldiers, melee, casualties, recoil, and true standard bearers remain outside this source decision and require accepted-art fallback. This is model-assisted review, not independent human, historical, anatomical, or balance validation.
