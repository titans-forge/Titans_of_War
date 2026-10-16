# Gettysburg v7 board-facing source review

Prepared October 1, 2026 for the new Union S identity-a and identity-b families and Confederate N identity-a family. This is a separate model-assisted source review from the earlier v7 identity study. **All six final source sheets support limited opt-in previews. This reviewer personally inspected/measured the four Union S sheets below; the two Confederate N decisions are delegated findings recorded in the [supplemental structural/pose review](gettysburg-v7-board-facing-pose-review.md). Earlier rejected attempts remain rejected.** Guide availability alone is not source acceptance.

The reviewer may inspect native images and measure them read-only, and may update only this review document. No source image is cropped, cleaned, resampled or otherwise altered. Human, historical, anatomical, exact drill, full-family and production certification remain false. Any later acceptance is limited to an opt-in source preview for the explicitly named identity, action and bearing.

## Why S and N are the next useful bearings

The actual main Gettysburg deployment in `src/battle/battleDefinitions.js` puts the four Confederate infantry formations at screen positions `(430,720)`, `(760,745)`, `(1065,770)` and `(1360,735)`, all initially facing `-Math.PI/2`. The four Union infantry formations occupy `(470,330)`, `(790,310)`, `(1080,345)` and `(1370,245)`, all facing `Math.PI/2`. `directionIndex` in `src/battle/formationMath.js` uses the screen order E, SE, S, SW, W, NW, N, NE: these opening angles select **Union S, index 2**, and **Confederate N, index 6**. These are renderer screen bearings, not a claim about historical map geography.

The presentation code in `src/battle/formationVisualState.js` retains tactical formation facing when a footprint exists. A fighting fallback can move rearward while retaining enemy-facing orientation. Thus movement displacement alone does not identify the art direction that appears on the board.

Read-only current-session engine probes used `CivilWarBattleEngine`, `createFreshCampaignState(1861,'gettysburg')`, presentation snapshots and formation visuals, sampled once per simulated second. A ten-second opening-hold probe showed Union S throughout; Confederate figures were approximately 77% N and 23% NW after the support formation turned. One authored 120-second, three-sector assault with support advance produced the following **sampled visible-figure direction counts**, including actions beyond the proposed art subset:

| Army | S | SW | W | NW | N | NE | E | SE |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Union | 5,603 | 4,970 | 2,730 | 256 | 64 | 32 | 128 | 415 |
| Confederate | 719 | 789 | 630 | 1,018 | 4,894 | 1,430 | 182 | 231 |

In that authored probe Union E/SE was approximately 3.8% of samples and Confederate E/SE approximately 4.2%. A separate ordered Confederate withdrawal ended at approximately 20.55 seconds of field time, with Union still predominantly S and Confederate rear-exit directions changing. These exploratory, locally authored policies are **not player telemetry, action-specific exposure measurements, a balance benchmark, historical validation or independently replicated evidence**. Their use here is to prioritize source work, not to establish ordinary-player frequencies.

The concrete art priority is Union S, Confederate N, Union SW, Union W, then Confederate NE/NW. Existing Union E/SE sources help maneuvers and flank responses but do not address the opening deployment as directly. Between Union W/NW and Confederate E/SE, the inspected deployment and authored combat probe favor Union W next.

## Required six sources and current state

| Planned source | Required content | Decision |
| --- | --- | --- |
| Union S identity-a march | Four alternating contact/passing phases | Limited source preview; passing cells require correct mapping |
| Union S identity-a actions | Ready, fire, representative load, representative ram | Final spaced source limited preview; two earlier attempts rejected |
| Union S identity-b march | Same bearing and gait structure, distinct identity-b | Limited source preview; subtle identity variation and explicit phase mapping |
| Union S identity-b actions | Same bearing and action structure, matching identity-b | Limited source preview; subtle identity variation |
| Confederate N identity-a march | Four alternating contact/passing phases | Limited preview per [supplemental review](gettysburg-v7-board-facing-pose-review.md); delegated inspection |
| Confederate N identity-a actions | Ready, fire, representative load, representative ram | Limited preview per [supplemental review](gettysburg-v7-board-facing-pose-review.md); delegated inspection |

The existing unused Union identity-b SE march study is outside this new six-source scope; no acceptance or shipping use is inferred from its presence. The earlier v5/v6 review records remain unchanged.

## Native layout and scale gates

- Record the actual native PNG dimensions, mode, byte count and SHA-256. Do not infer native size from a tool preview. Each sheet must have four independent equal cells with the complete figure and hardware contained.
- **Every cell edge must have at least 16 native pixels of padding at alpha ≥64.** Measure L/T/R/B separately. A single failed edge rejects the source for integration, regardless of promising poses. Alpha-1 boundary residue is recorded separately and does not replace this gate.
- View and review all four cells after every generation. A requested isolated correction does not guarantee other cells remained unchanged, nor establish an exact pixel translation or scale factor.
- Use manual torso/pelvis X and one shared ground Y per row, with approximately ±5–8 px uncertainty. Use one body reference for the complete source and one common stationary scale across its four actions. Do not normalize individual boots, caps, gait phases, firing posture or loading figures.
- Report cap tops and diagnostic cap-to-sole spans, distinguishing projected foot position and lowered posture from body-size drift. Complete bayonet, bore mouth, raised rod, both boots, hands and kit must remain available inside the cell.
- Measure diagnostic saturated-blue RGB at alpha thresholds 1, 8, 64, 128 and 200, boundary counts/max alpha and faint alpha 1–7. Explain normal compositing contribution; colored RGB at alpha 1 is not an opaque fringe. Do not claim full-alpha edge clearance or fringe-free output unless measured.

## Camera, identities and equipment

Use the authored elevated approximately 35° orthographic camera and true S/N orientation. Do not turn an E or SE painting into S/N by flat rotation. Follow guide landmark projection while keeping a recognizable body, shoulder/hip orientation and consistent equipment scale.

Union identity-a and identity-b should retain their separately established faces/hair, navy coats and caps, pale blue trousers, brown boots, blanket/pack, disk canteen, cartridge box and straps across march and all actions. Distinction between A and B must survive the new frontal view without swapping kit or clothing within a family.

The inspected accepted Confederate reference, `public/images/units/gettysburg-v2/confederate-ready.png`, shows the north identity-a from the back: gray cap with a dark band, brown hair, gray/brown coat, dusty pale gray trousers and brown boots; a horizontal rolled blanket across the upper back, crossed brown straps, a disk canteen toward viewer-left hip and dark cartridge/haversack boxes toward viewer-right/lower back. Use a coherent chosen Confederate kit across phases/actions. This is continuity with representative project art, not exact regiment, garment or firearm certification.

## Gait and carry criteria

Four march cells must contain two anatomically opposite contact poses and two anatomically opposite passing/support poses. Trace each thigh from its hip through knee to boot; use crossing and occlusion to determine which anatomical leg leads or supports. Front/back camera occlusion can conceal portions of a leg. Boot ordering by itself is insufficient to establish alternating anatomy.

In contacts, opposed feet and weight transfer must be plausible without repeated leading thighs. In passing poses, the supporting limb must change between the two cells while the free knee advances. No source-wide scaling workaround can establish a missing phase. The carried firearm stays on the corresponding anatomical side, with hands, wrist, fore-end and sling/contact continuity through all four phases. Ground and body-reference annotations must preserve source differences, rather than independently leveling every sole.

## Firing, loading and grip criteria

Union S is frontal. Anatomical right shoulder is **viewer-left**: the stock butt should meet it, with plausible cheek contact, right trigger-arm connection and a left supporting palm under the fore-end. A firearm horizontal in the world and aimed S projects chiefly **downscreen**; the guide supplies the actual projected landmarks and foreshortening. The fixed blade extends beyond the mouth on a coherent offset axis, not as a substitute muzzle.

Confederate N is a back view. Anatomical right shoulder is **viewer-right**: stock and rear grip may be partly occluded by the body, but shoulder, elbow, wrist and support relationships must be coherent. The barrel emerges chiefly **upscreen** toward the guide's N direction. Do not expose both rear hands unnaturally merely to make them visible. A visible barrel mouth must be distinguished from the farther blade tip for effect registration.

Ready/carry and upright loading hardware stay on the corresponding anatomical side. Load and ram require a credible barrel bore mouth, a separate slender rod on the bore axis and a fixed blade offset through a plausible socket/elbow. Raised and lower hands need traceable attachment to rod and fore-end respectively; do not merge the rod with a blade or duplicate the barrel. Two loading pictures remain representative states, not a verified complete historical drill.

For each final firing cell, record a manual native barrel-mouth center and uncertainty, normalized cell coordinates, a rear barrel-axis landmark and the resulting projected vector. Require dy > 0 for Union S and dy < 0 for Confederate N, with only camera-consistent lateral deviation. Inspect shoulder/cheek contact, both grip chains, muzzle/blade distinction and foreshortening together. No baked muzzle flash or discharge is required in the source. Runtime muzzle effects, actual target direction, common-scale transitions and board use require separate verification.

## Per-source evidence to append

The completed source decisions record native provenance, all-four-cell visual observations, L/T/R/B solid padding, transparency diagnostics, gait/action/identity decisions and specific remaining limits. Rejected attempts and their exact failures remain preserved. Final limited approvals include manual roots, row grounds, cap tops, spans, one source-wide body reference, and action-source firing mouth/axis annotations. Union evidence is recorded directly below; Confederate evidence is recorded in the linked supplement.

## Union S identity-a march: limited preview with explicit phase mapping

The source `../candidates/gettysburg-v7/union-a-s-march-candidate.png` and `union-s-march-guide.png` were viewed with `view_image`; native pixels and the guide receipt were read without image modification. Native source is **1254×1254 RGBA**, four **627×627** cells, **490,022 bytes**, SHA-256 `c177704cb3e4c7fa64f405dc13724013ad03476a53510ae7b01a1614376e7000`, alpha extrema 0–255.

**Decision: the source contains four plausibly distinct anatomical gait phases and passes the hard padding gate. It supports a limited opt-in identity-a S march preview only if the passing cells are assigned by the observed anatomy.** Generated native cells do not exactly inherit the guide's phase labels. The guide's native top-right passing figure supports on anatomical left and bottom-right on anatomical right; this source does the reverse. No automatic guide-order acceptance or runtime animation approval is issued.

Top-left has a viewer-right/anatomical-left thigh leading to its extended forward trouser column and lower boot; viewer-left/anatomical-right bends toward the shorter rear boot. Bottom-left reverses that anatomy: viewer-left/right thigh extends to the lower forward boot while viewer-right/left bends toward the shorter rear boot. They are opposite contact pictures, although the rear foot's exact ground contact is not physically certified.

Top-right traces viewer-left/anatomical-right hip through the long straight support column to the low boot, while viewer-right/left thigh bends forward into a raised knee and higher boot. Bottom-right instead traces viewer-right/anatomical-left hip through the straight supporting trouser column to the low boot; viewer-left/right thigh bends into the raised knee and high boot. In bottom-right the bent viewer-left knee is near `(244,443)` and lifted boot near `(245,492)`; the supporting viewer-right column is near X=289 and planted boot near `(294,560)`. These are manual approximate landmarks, not rig joints.

The chronological anatomical mapping is **native cell 0 left-contact → cell 3 left-support passing → cell 2 right-contact → cell 1 right-support passing → cell 0**. This differs from a simple native row-major phase sequence. Preserve the original pixels and encode this source-to-phase mapping if integrated. A guide-order four-phase sequence would assign both passing states incorrectly.

| Native cell | Observed anatomical phase | Cap top Y | Viewer-left / viewer-right sole Y | Diagnostic span | Solid padding L/T/R/B, alpha ≥64 | Manual pelvis X | Shared row ground Y |
| --- | --- | ---: | --- | ---: | --- | ---: | ---: |
| 0, top-left | Left contact | 172 | 517 / 605 | 433 | 260 / 27 / 192 / 21 | 345 | 608 |
| 1, top-right | Right support passing | 172 | 602 / 512 | 430 | 187 / 27 / 263 / 23 | 272 | 608 |
| 2, bottom-left | Right contact | 162 | 593 / 505 | 431 | 262 / 19 / 189 / 33 | 344 | 597 |
| 3, bottom-right | Left support passing | 162 | 510 / 587 | 425 | 188 / 18 / 263 / 39 | 272 | 597 |

Cap top uses alpha ≥64 in native cell-local ROIs `(306,145,370,265)`, `(230,145,290,265)`, `(307,130,370,265)` and `(230,130,292,270)`, deliberately excluding the raised weapon. Boot soles use alpha ≥128 in separate manually bounded foot regions. Diagnostic span is lowest sole minus cap top, not an inclusive pixel height. **One source-wide body reference of 440 px** is proposed; manual pelvis and row-ground estimates carry approximately **±5–8 px uncertainty**. Shared grounds preserve within-row projected differences. Do not individually equalize boots, caps or phase spans. Source scale and posture appear coherent across the four cells; final atlas scale and transition continuity still require integration review.

The view is recognizably frontal/elevated S with navy coat/cap, pale blue trousers, brown boots, dark beard/hair, pack/rolled blanket, crossing straps, cartridge/haversack region and disk canteen consistent across phases and recognizable as identity-a. Some cap/face and garment detail differs from the previous SE artwork. The firearm is carried toward **viewer-right**, unlike the guide's viewer-left position. Its anatomical-left arm reaches the upper fore-end grip, while anatomical-right crosses to the lower stock grip; both wrist-to-hand-to-weapon attachments remain plausible across all four cells. It is a consistent alternative carrying pose, not exact obedience to the guide or verified period drill. The fixed blade, barrel region and stock remain complete; source identity, exact fingers, firearm model and rig invariants are not certified.

All solid-padding edges pass 16 px; the minimum is **18 px**, so a requested 24 px target was not fully achieved. All four cell boundaries have **zero nonzero-alpha pixels** in this native file. Diagnostic saturated-blue counts at nonzero alpha are **19/22/79/18**, totaling 138: 132 at alpha 1, two at alpha 3, one at alpha 4 and three at alpha 5; **none at alpha ≥8, ≥64, ≥128 or ≥200**. Faint alpha 1–7 counts are **4,459/4,895/4,775/5,943**. The diagnostic-blue residue has at most 5/255 channel contribution/change under normal compositing, mostly 1/255. This does not establish exhaustive color-fringe clearance or a historically correct carrying posture.

Runtime playback of the mapped complete cycle, action switches, common-scale transitions, actual board-facing use and any muzzle registration remain outside this narrow march-source decision.

## First Union S identity-a action source: rejected padding

The first `../candidates/gettysburg-v7/union-a-s-actions-candidate.png` and native S action guide were viewed in all four cells. Source is **1254×1254 RGBA**, four **627×627** cells, **635,687 bytes**, SHA-256 `f9af79132c87ebdcedd6d00a181d5dc8dbe54234fa988b5ba8bf9a1d68806ed5`, alpha extrema 0–255.

**Decision: reject integration.** Ready fails top and bottom padding, fire reaches the lower cell boundary with substantial opacity and ram receives substantial top-edge content. No final roots, reference or muzzle metadata are approved for this rejected source. The requested native-generation common size/layout correction must be re-inspected in all four cells; exact 85% scaling or preservation is not assumed.

| Native cell | Action | Solid padding L/T/R/B, alpha ≥64 | Nonzero boundary pixels | Maximum boundary alpha | Decision |
| --- | --- | --- | ---: | ---: | --- |
| 0 | Ready | 256 / **14** / 169 / **1** | 24 | 2 | Reject padding |
| 1 | Fire | 146 / 143 / 279 / **0** | 40 | 254 | Reject padding/cell crossing |
| 2 | Load | 246 / 80 / 172 / 60 | 20 | 3 | Padding pass only |
| 3 | Ram | 185 / **0** / 245 / 52 | 36 | 253 | Reject padding/cell crossing |

The frontal elevated S camera, identity-a face/hair/cap, navy coat, pale trousers, boots, pack/blanket and belt/strap/canteen regions remain recognizable in each action. Ready preserves the march's viewer-right carrying pose with anatomical-left upper fore-end hand and right lower hand crossing the stock. Fire puts the stock/cheek region at anatomical right/viewer-left shoulder, with the right arm reaching the trigger/lock region and the left hand supporting the fore-end. Both attachment chains are plausible in the foreshortened frontal view. The barrel mouth visibly opens toward the viewer/downscreen, while the side blade continues farther down. A provisional mouth landmark near `(272,417)` and rear-axis landmark near `(256,246)` imply a chiefly downscreen vector `(16,171)`, approximately 85° from screen-right. These are diagnostic estimates only, approximately ±4 px, and must not be copied into final author metadata.

The guide's authored fire stock and mouth are `(156.16,228.061)` and `(156.16,363.15)` in its 512 px cell, a vertical downscreen vector. This first source broadly follows S rather than the earlier shallow SE error. Exact yaw, cheek/sight geometry, fingers, firearm model and stock contact are not certified.

Load and ram show an upright barrel, lower fore-end support and an upper hand near the rod/mouth, with the raised ram hand grasping the longer separate rod. The fixed bayonet at the upright muzzle is short/foreshortened and partly occluded, making the complete blade/socket and precise rod entry less clear than in the accepted SE reference. That ambiguity needs fresh inspection on the correction; no complete weapon-continuity or drill certification is issued. This is not a reason to accept a sheet that already fails layout.

Diagnostic saturated-blue counts are **209/27/209/201**, totaling 646: 629 at alpha 1, three at alpha 2, four at alpha 3, seven at alpha 4 and three at alpha 5; **none reach alpha ≥8, ≥64, ≥128 or ≥200**. Faint alpha 1–7 counts are **5,180/5,335/4,463/6,008**. This tiny-alpha RGB residue does not explain the alpha-254/253 cell crossings. Native bytes remain unchanged and full-alpha edge padding is false.

## Union S identity-b march: limited preview, subtle facial variation

The native `../candidates/gettysburg-v7/union-b-s-march-candidate.png` was viewed alongside the accepted A S marcher and measured read-only. Source is **1254×1254 RGBA**, four **627×627** cells, **494,241 bytes**, SHA-256 `544dd143918b18af8807e34a406affe7c83b23378a554d5f88a12586cc16ef68`, alpha extrema 0–255.

**Decision: accept a limited opt-in Union identity-b S march source preview with the same explicit anatomical phase mapping `[0,3,2,1]`.** The face varies subtly from A: the moustache/chin-hair region leaves more visible cheek/chin and gives a slightly different face shape. That variation is reasonably consistent across these four downward-looking frontal faces. This does not establish the requested older age, a strongly distinct identity at game scale, exact likeness to an older reference, or exact isolation of a facial edit.

Every leg chain was reviewed afresh. Top-left viewer-right/anatomical-left leg extends forward while the right leg bends to the higher boot; bottom-left reverses the contact anatomy. Top-right has viewer-left/anatomical-right long support leg with the left knee/boot lifted; bottom-right has viewer-right/anatomical-left long support leg with the right knee/boot lifted. The passing states are opposite, and are again swapped from the guide's native TR/BR labels. Use source cell 0 left-contact, cell 3 left-support passing, cell 2 right-contact and cell 1 right-support passing in chronological order.

The S elevated frontal camera, navy cap/coat, pale trousers, boots, blanket/pack, canteen and straps match the A source's major style and equipment while remaining coherent within B. Viewer-right firearm carry is retained; anatomical-left upper fore-end grip and crossing right lower-stock grip remain visibly attached. Exact fingers, drill, body rig, unchanged equipment dimensions and historical identity are not certified.

| Native B cell | Observed phase | Cap top Y | Viewer-left / viewer-right sole Y | Span | Solid padding L/T/R/B, alpha ≥64 | Manual pelvis X | Shared row ground Y |
| --- | --- | ---: | --- | ---: | --- | ---: | ---: |
| 0 | Left contact | 171 | 519 / 605 | 434 | 259 / 26 / 189 / 20 | 345 | 609 |
| 1 | Right support passing | 172 | 603 / 514 | 431 | 186 / 26 / 260 / 22 | 272 | 609 |
| 2 | Right contact | 161 | 595 / 508 | 434 | 260 / 18 / 187 / 31 | 344 | 600 |
| 3 | Left support passing | 161 | 512 / 589 | 428 | 187 / 19 / 259 / 37 | 272 | 600 |

Cap ROIs are `(306,140,370,265)`, `(230,140,290,265)`, `(307,130,370,265)` and `(230,130,292,270)`, measured at alpha ≥64; separately bounded boot regions use alpha ≥128. One body reference is **440 px**, with approximately **±5–8 px** uncertainty for manual pelvis/ground measurements. The diagnostic span differences include projected limb position. Do not level individual boots, recenter caps or independently rescale phases. A/B source spans differ by only a few pixels, but final runtime identity/action common-scale continuity remains to be checked.

All solid-padding edges pass 16 px, minimum **18 px**; the 24 px aspirational margin is not fully achieved. Every native cell boundary has zero nonzero-alpha pixels. Saturated-blue diagnostic counts are **19/25/145/24**, totaling 213: 208 at alpha 1, two at alpha 3 and three at alpha 5; none reach alpha ≥8, ≥64, ≥128 or ≥200. Faint alpha 1–7 counts are **6,279/5,572/6,300/6,697**. Additional whole-source diagnostic classifiers for conspicuous bright green (`G>130`, `G≥R+35`, `G≥B+35`) and red (`R>150`, `G<80`, `B<80`, `R≥G+100`) find 39/77 nonzero-alpha pixels respectively, all below alpha 8; green maximum is 7, red maximum 2. The visible colored raw-RGB residue therefore has small normal compositing contribution under these diagnostics, not an opaque green/red/blue fringe. The diagnostics are not an exhaustive color certification.

Only the named march source preview is accepted by this subsection. B actions require their separate review below; actual mapped playback, identity differentiation at board scale, human review and production use remain outside this march decision.

## Intermediate Union S identity-a actions: padding rejection retained

The next `../candidates/gettysburg-v7/union-a-s-actions-padded-candidate.png` was viewed and measured natively: **1254×1254 RGBA**, four **627×627** cells, **576,944 bytes**, SHA-256 `bc6ed631e9ef2b344e80d7e1100acc01446263e0db36d833f69bbdc30ce03920`. Its solid L/T/R/B padding is **262/50/172/12**, **169/169/266/11**, **249/97/174/64** and **201/43/233/59**. Both top cells still fail the hard 16 px bottom margin. **Reject integration**, despite plausible downscreen fire and improved containment. This intermediate source establishes neither final registration nor an exact 85% common scale transform.

## Final Union S identity-a actions: limited source preview accepted

The final `../candidates/gettysburg-v7/union-a-s-actions-spaced-candidate.png` was freshly inspected in all four cells. It is **1254×1254 RGBA**, four **627×627** cells, **582,088 bytes**, SHA-256 `fe4b4a0a531f6e4e6709fa747393d4fa6cc6e5e13ced71fd287c4cd440d1e1c2`, alpha extrema 0–255.

**Decision: accept the limited opt-in identity-a S ready/fire/two representative loading-state source preview.** Every alpha ≥64 cell edge passes the unchanged 16 px padding gate. Body, navy cap/coat, hair/face, pale trousers, boots, pack/blanket, canteen and straps remain recognizably coherent across the four cells and the A S marcher. Minor generated face/garment/equipment variation persists. No exact identity rig, individual finger mechanics, firearm model, full drill or historical/human/production certification is issued.

Ready keeps the viewer-right two-hand carry with anatomical-left fore-end hand and right hand crossing toward the lower stock. Fire is frontal/elevated S, with butt/cheek contact toward anatomical right/viewer-left shoulder, right elbow/wrist/hand attached at the rear grip, and left support under the fore-end. Its shortened-looking barrel is a coherent foreshortened view, with a visible downward-opening tube mouth and separate offset blade projecting farther downscreen. Neither baked discharge nor a blade-tip muzzle anchor is used.

Load and ram each retain lower support on the wooden fore-end, an upright bore/rod axis and a separately offset socket/blade region. Load's hand partly hides the short exposed rod; ram's upper hand wraps the long raised rod that descends toward the mouth. The fixed blade is more foreshortened/partly occluded than the diagonal reference, but it reads separately from the rod and bore. Exact socket manufacture, insertion depth, blade/rod parallelism, load sequence and period drill remain unverified. Passing these narrow attachment criteria does not establish historical correctness.

| Final A S cell | Cap top Y | Diagnostic sole Y | Span | Solid padding L/T/R/B, alpha ≥64 | Manual torso/pelvis X | Shared row ground Y |
| --- | ---: | ---: | ---: | --- | ---: | ---: |
| 0, ready | 145 | 593 | 448 | 255 / 32 / 176 / 33 | 343 | 598 |
| 1, fire | 149 | 594 | 445 | 168 / 149 / 264 / 31 | 291 | 598 |
| 2, load | 75 | 529 | 454 | 246 / 75 / 167 / 90 | 355 | 543 |
| 3, ram | 97 | 539 | 442 | 200 / 29 / 227 / 75 | 309 | 543 |

Cap ROIs are `(302,110,370,250)`, `(245,110,308,255)`, `(314,40,383,185)` and `(306,88,332,203)`, at alpha ≥64. The ram ROI excludes the raised hand/rod; they must not be counted as cap top. Diagnostic sole rows use alpha ≥128 in manually bounded boot regions, excluding the lower wooden stock, which projects below the boots in loading cells. Span is sole minus cap. **One common stationary source reference of 460 px** is proposed for all four actions. Manual torso/ground measurements have approximately **±5–8 px uncertainty**. The observed 442–454 px span range mixes posture and source variation; no per-action or boot scaling is justified.

The actual firing **barrel-mouth center is approximately cell-local `(287,406)`**, normalized **`(0.457735,0.647528)`**, approximately ±3–4 px. A rear barrel-axis landmark near `(277,248)` gives vector `(10,158)`, about **86.4° downscreen from screen-right**. The guide's authored vector is vertical downscreen. This manual source estimate is consistent with S bearing and modest lateral projection; it is not a recovered physical camera or runtime effect validation. Blade pixels continue farther downward from the offset socket and must not determine the muzzle origin.

The corrected source does not prove an exact 20 px translation or preservation of other details. Relative to the intermediate source, ready's alpha ≥64 top/bottom margins change 50/12 → 32/33, fire 169/11 → 149/31, load 97/64 → 75/90 and ram 43/59 → 29/75. More than the top row changes, and the changes are not one exact translation. This final native file is the basis for the decision and fresh annotations.

Only ready has nonzero cell-boundary pixels: two, both alpha 1; the other boundaries are zero. Full-alpha edge clearance is therefore false. Saturated-blue diagnostic counts are **165/24/141/151**, totaling 481: 457 at alpha 1, six at alpha 2, three at alpha 3, nine at alpha 4 and six at alpha 5. There are none at alpha ≥8, ≥64, ≥128 or ≥200. Faint alpha 1–7 counts are **5,026/4,388/4,801/4,690**. These diagnostics indicate low-alpha colored residue rather than opaque blue contamination; no native cleanup occurred and no exhaustive fringe-free claim is made.

This approval covers only the named source preview. Runtime S firing origin/direction, stationary/action transitions at common scale, actual board-facing use and human review remain separate checks. The two preceding A action attempts remain rejected.

## Union S identity-b actions: limited source preview accepted

The native `../candidates/gettysburg-v7/union-b-s-actions-candidate.png` was viewed in all four cells alongside the B S march. It is **1254×1254 RGBA**, four **627×627** cells, **601,577 bytes**, SHA-256 `b3719bc03beba5f3613ec22300789d0653aadb0ce05102b65a8cfcb4be73ad5c`, alpha extrema 0–255.

**Decision: accept only the limited opt-in Union identity-b S ready/fire/two representative loading-state source preview.** Every cell edge passes alpha ≥64 padding ≥16 px. The moustache/chin/cheek variation is consistent enough to remain recognizable within the B S march/action family. Its distinction from A is subtle, especially when the head tilts down or is partly covered by the gun. Exact requested age, older likeness, game-scale identity distinctness and isolation of a face-only edit remain unverified.

All four cells retain coherent frontal/elevated S orientation, navy cap/coat, pale trousers, boots, blanket/pack, crossing straps, canteen and belt equipment. Ready's viewer-right carry remains attached through the anatomical-left upper hand and crossing right lower hand. Fire retains the anatomical-right/viewer-left shoulder/cheek region, rear right grip chain and forward left support. The tube opening projects downscreen in a foreshortened assembly, separate from the offset blade that continues farther downward. Load and ram show lower fore-end support, a distinct upper rod and offset blade/socket region; the precise socket and short rod entry remain partly occluded. No exact fingers, complete drill, firearm model or rig invariants are certified.

| Native B S cell | Cap top Y | Diagnostic sole Y | Span | Solid padding L/T/R/B, alpha ≥64 | Manual torso/pelvis X | Shared row ground Y |
| --- | ---: | ---: | ---: | --- | ---: | ---: |
| 0, ready | 143 | 593 | 450 | 254 / 33 / 174 / 32 | 343 | 599 |
| 1, fire | 148 | 595 | 447 | 167 / 148 / 261 / 31 | 292 | 599 |
| 2, load | 74 | 531 | 457 | 244 / 74 / 163 / 89 | 355 | 545 |
| 3, ram | 97 | 541 | 444 | 198 / 29 / 223 / 73 | 310 | 545 |

Cap ROIs are `(302,110,370,250)`, `(245,110,308,255)`, `(314,40,383,185)` and `(306,88,332,203)` at alpha ≥64. Alpha ≥128 sole ROIs deliberately exclude the lower wooden butt; cap measurements exclude raised hand/rod. One common stationary source reference is **460 px** across all four cells, with approximately **±5–8 px** uncertainty for manual torso and ground references. The 444–457 px spans remain source/posture diagnostics. Do not independently rescale load, ram, fire or boots. Small A/B span differences remain visible under the common reference.

The actual **fire tube-mouth center is approximately `(288,407)`**, normalized **`(0.459330,0.649123)`**, approximately **±3–4 px**. A rear barrel-axis point near `(278,248)` gives vector `(10,159)`, approximately **86.4° downscreen from screen-right**, consistent with S and the guide's chiefly vertical direction. The bright ring/black bore, not the blade's lowest point, defines the anchor. These are manual source annotations; runtime targeting, effect origins and action transitions are separate checks.

Ready has four and load two nonzero boundary pixels, all alpha 1; fire and ram boundaries are zero. Fully transparent all-edge padding remains false. Saturated-blue counts are **273/185/214/140**, totaling 812: 777 at alpha 1, seven at alpha 2, eight at alpha 3, seventeen at alpha 4, two at alpha 5 and one at alpha 7. None reach alpha ≥8, ≥64, ≥128 or ≥200. Faint alpha 1–7 counts are **4,857/4,695/4,754/4,728**. These diagnostic colored pixels have at most 7/255 normal channel contribution/change, predominantly 1/255; this is not opaque blue contamination or an exhaustive fringe-free certification. Native source bytes remain unmodified.

Both Union S identities now have separately reviewed march/action source previews in this document. Their march cell order is explicitly `[0,3,2,1]`; their action cells remain ready/fire/load/ram in native order. This does not establish mapped runtime gait, stationary/march transitions, source identity equality, board-scale player usability, historical/human review or production/full-family approval.

## Confederate N delegated decisions and completed source scope

The separate reviewer completed both Confederate identity-a N decisions in [the supplemental structural/pose review](gettysburg-v7-board-facing-pose-review.md). This document's author read that review and its final decisions, but **did not personally repeat its Confederate image or pixel measurements**. Treat the following as attributed delegated model-assisted evidence, not a second independent measurement or human review.

The accepted march source is `../candidates/gettysburg-v7/confederate-a-n-march-spaced-candidate.png`, bound in the supplement to SHA-256 `cf9e0535f7dd581b815940c32a35d51b4ec573d92c6a3cdfbaf4bb74ccc10e64`. The supplement records fresh all-four-cell anatomical tracing, alternating contacts and passing supports, alpha ≥64 padding at least 35 px, one source-wide reference of 440 px and row-shared registration. Its earlier repeated-support and padding failures remain rejected. Hidden front grip, exact physical foot trajectories and facial identity remain unverified.

The accepted action source is `../candidates/gettysburg-v7/confederate-a-n-actions-padded-candidate.png`, bound in the supplement to SHA-256 `8c97e41c277a07f7e63d08bbb7aa91782ab38a7769531fc2bc9dcf2dd7c5faf0`. The supplement records a plausible shouldered N firing pose under back-view occlusion, separate representative loading states, alpha ≥64 padding at least 24 px, one common stationary reference of 375 px and a manual tube-mouth anchor distinct from the blade. Exact hidden grips, cheek/sight contact, bore/rod insertion and drill remain uncertified; the earlier row-spill source remains rejected.

The six-source review scope is complete: four personally reviewed Union S sheets and two delegated Confederate N sheets support their named limited opt-in source previews. Source acceptance does not itself establish runtime registration, actual muzzle effects, transitions, board-scale player quality, anatomical/historical/human validation or production/full-family approval. Integration and test evidence belongs to its separate implementation record; no new pixel processing or runtime verification is claimed here.
