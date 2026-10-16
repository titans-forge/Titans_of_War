# Gettysburg v6/v7: opening facings, matching actions and stable identities

October 1, 2026. Local opt-in Civil War art pass. Exact historical Gettysburg only. **Production and full-family approval remain false.**

The next art group is implemented at `?artPass=gettysburg-v7`. Union A now has matching E/SE march, ready, fire and two representative loading states. New Union A/B S and Confederate A N sheets cover the main opening deployment views, with four-phase march and matching stationary actions. The ordinary game keeps its accepted artwork. Other scenarios, missing bearings and unsupported actions use that artwork directly.

## What changed

The v6 SE action sheet closes the previous diagonal combat gap. Ready, shouldered fire, load and ram share one 495 px source-body reference; the barrel mouth is distinct from the bayonet tip. The development reviewer can compare E/SE stationary actions and matched-phase turns.

The v7 priority follows the actual deployment: screen-facing Union S and Confederate N. These are renderer directions, not historical map geography. A bounded, locally authored engine probe helped prioritize them; its direction counts are design evidence, not ordinary-player telemetry or independent balance validation. The [source review](gettysburg-v7-board-facing-source-review.md) preserves that distinction.

Six new native sources cover both Union S identities and the Confederate N counterpart. Union A/B marches use native cells **0,3,2,1**: the generated passing poses were swapped relative to the guide. Metadata selects the reviewed chronological order without rearranging pixels. Confederate march uses 0,1,2,3. The reviewer derives roots and phase roles from the actual annotations instead of assuming row-major chronology.

The live v7 pilot assigns Union identities through stable soldier IDs. Losses and reformation preserve surviving identities. Confederate requests remain A. A missing B E/SE clip falls directly to accepted artwork; it never turns the soldier into candidate A. Missing whole reload sequences, wrong armies/bearings and unsupported identity/version combinations clear candidate playback rather than leaving a stale pose. Earlier supported art-pass versions retain their explicit registries.

One renderer correction makes an available native clip frame take precedence over the legacy rear-facing frame hint. Accepted-art rear selection remains intact. Flash and smoke use the measured barrel mouth, registered root and common action scale. Reduced-motion flash suppression and paused action/phase retention remain covered by the real-method tests. Damage, ammunition, movement, combat timing, victory rules and music are unchanged by this art group.

## Exact coverage

| Army / identity / screen bearing | V7 candidate coverage | Source body references |
| --- | --- | --- |
| Union A E | Retained v4 four-phase march; retained v5 ready/fire/two-state reload | March 412 px; actions 485 px |
| Union A SE | Retained v5 four-phase march; new v6 ready/fire/two-state reload | March 490 px; actions 495 px |
| Union A S | New four-phase march; ready/fire/two-state reload | March 440 px; actions 460 px |
| Union B S | New four-phase march; ready/fire/two-state reload | March 440 px; actions 460 px |
| Confederate A N | New four-phase march; ready/fire/two-state reload | March 440 px; actions 375 px |
| Other identities, bearings, actions and scenarios | Accepted-art fallback | Existing references |

References are source-specific registration measurements, not different physical soldier heights. They preserve natural posture/phase differences through one shared reference per sheet, with no independent boot/head/action normalization. Two loading pictures and one held firing pose do not establish a complete historical drill, recoil/settling or continuous skeletal motion. Union A/B facial variation is subtle at ordinary formation scale.

## Source review and provenance

All selected PNGs remain **native 1254 × 1254 RGBA**, four full 627 × 627 cells. Public and built PNGs are byte-identical to native sources. No raster crop, resample, color cleanup, flat rotation or pixel rearrangement was applied. Runtime full-cell extraction, uniform scale and annotated root translation provide registration. Manual root/ground uncertainty is approximately ±5–8 source pixels.

The unchanged alpha ≥64 padding gate is 16 px on every cell edge. Seventeen native attempts were preserved: four v6 and thirteen v7, including the superseded B SE study. Seven sheets support limited previews; ten were rejected or superseded for padding, repeated passing support, wrong projected firing bearing or changed priority. The [generation ledger](../manifests/gettysburg-v6-v7-generation-ledger.json) binds every original, exact prompt block, references, SHA, dimensions and decision. Requested isolated edits were re-reviewed; exact scale factors, translation or preservation of untargeted details are not assumed.

Separate model-assisted reviews cover [v6 SE actions](gettysburg-v6-independent-source-review.md), [the four Union S sources](gettysburg-v7-board-facing-source-review.md) and [the Confederate N sources and structural guides](gettysburg-v7-board-facing-pose-review.md). These are separate worker inspections, **not independent human, anatomical or historical validation**. Built-in imagegen did not report its underlying model identifier. Direct Blender output supplies structural reference, not production soldier art.

Faint colored and alpha-1 boundary residue remains untouched. Selected blue diagnostics and reviewed Confederate red/yellow/green residue stay below alpha 8; the stricter Confederate neon predicate reaches alpha 2, while broader saturated predicates reach alpha 4. These diagnostics are not an exhaustive fringe-free certification. Normal compositing in the inspected views showed no conspicuous colored fringe.

Measured firing mouths are SE A (488,365), S A (287,406), S B (288,407), and N A (285,195), all local to their 627 px cell. The N mouth is uncertain by approximately ±4 px and separate from the blade tip near (292,159). Its short visible barrel-axis segment projects chiefly upscreen; hidden butt/cheek/support-grip relationships and full world-space weapon length remain uncertified. Occlusion also limits exact bore/ramrod insertion assessment.

## Verification

| Check | Result and boundary |
| --- | --- |
| `npm run validate:gettysburg-native` | Exit 0. V5, v6 and all six v7 authored sources, hashes, copies and metadata agree. |
| `npm run test:gettysburg-art-current` | 44 passed, zero failures/skips. A separate code-review worker reran it successfully. Tests use actual source data, extracted scene preload, the clip-initialization prefix of create, and syncFormation paths, including every supported action, native phase order, identity preservation, whole-action fallback, pause and reduced motion. They do not execute the full Phaser scene lifecycle. |
| `npm run validate-assets` | Exit 0. 178 Node tests passed, zero failures/skips, including the 44 focused checks, plus atlas/content validation commands. |
| `npm run test:gettysburg` | Exit 0. 81 mechanics, command-brief and artillery tests passed, zero failures/skips. |
| `npm run build` | Exit 0. Candidate runtime assets included for opt-in selection. Existing large JavaScript chunk warning remains. |
| Desktop motion reviewer | E/SE fire/load; S A/B opposite passing, fire and ram; N fire/load inspected. Native images decoded, matched references and independent stepping remained usable. Manual stepping worked with automatic playback disabled. |
| Narrow motion reviewer | 390 × 844 tested; document client/scroll width both 375 px, wrapped controls and decoded images. Override restored. This is reviewer layout QA, not renewed whole-game mobile validation. |
| Actual Gettysburg practice | Completed one full-ammunition center-assault encounter. Three divisions assaulted; combat, losses and close contact were observed at field time 44, retreat at 65, then all five formations left and the practice report opened. Report: line routed, command 21/100, Confederate losses 18%, Union losses 10%. This deliberately aggressive render/control check is not a successful tactical demonstration or independent balance test. |
| Fresh second opening | Paused withdrawal-strategy setup inspected at normal and closer zoom, with N Confederate and S Union candidate poses, roster/focus/objective/zoom controls. Desktop document client/scroll width both 1688 px; canvas displayed at 1442 × 550. This second encounter was not completed. |

The practice result and campaign UI reported the campaign unchanged at turn 1. No campaign decisions were committed or campaign data inspected through browser storage. Every new firing phase was verified in the reviewer and real renderer tests; every phase was **not individually isolated in live combat**. Desktop review is on this Mac/Chrome setup, not a named-PC performance or independent human playtest. Evidence logs and file bindings are in the [family manifest](../manifests/gettysburg-v7-board-facing-family.json).

## Loading cost and build boundary

The actual v7 selection loads **ten unique atlas pairs / twenty clips**. PNGs total 5,643,666 bytes; JSON totals 38,494 bytes. Combined candidate files are **5,682,160 bytes, about 5.42 MiB**. Nominal width × height × 4 storage is **62,900,640 bytes, about 60 MiB**, before browser/texture overhead or duplication. V6 is four atlases/eight clips, 2,506,629 file bytes and about 24 MiB nominal RGBA.

The [preload audit](../manifests/gettysburg-v7-preload-budget.json) compares every native/public/dist PNG and public/dist JSON. Normal and nonmatching controls request zero candidate atlases; nested public bases work. Candidate JSON is statically imported, so zero candidate texture requests does not mean zero metadata in JavaScript. File lengths and nominal pixel storage are **not measured transfer, startup latency, peak memory, frame time or FPS**. Texture/bundle optimization is required before full-family default promotion.

## Captures

- [Union A/B S firing comparison](../captures/gettysburg-v7/s-a-b-fire.jpg) and [ramrod comparison](../captures/gettysburg-v7/s-a-b-ramrod.jpg).
- [Opposite passing phase](../captures/gettysburg-v7/s-a-b-left-passing.jpg) and [narrow reviewer](../captures/gettysburg-v7/mobile-review.jpg).
- [Confederate N fire](../captures/gettysburg-v7/n-fire.jpg) and [loading](../captures/gettysburg-v7/n-loading.jpg).
- [Opening overview](../captures/gettysburg-v7/gettysburg-opening.jpg), [closer Confederate ready](../captures/gettysburg-v7/gettysburg-confederate-ready.jpg) and [closer Union ready](../captures/gettysburg-v7/gettysburg-union-ready.jpg).
- [Close combat](../captures/gettysburg-v7/gettysburg-close-combat.jpg), [retreat](../captures/gettysburg-v7/gettysburg-retreat.jpg) and [completed practice result](../captures/gettysburg-v7/gettysburg-practice-result.jpg).

## Next priorities, in order

1. **Union SW/W, then Confederate NE/NW**, with matching march/actions and identity continuity. The live maneuver/close-combat inspection reinforces how conspicuous accepted-art direction transitions remain. Extend B only with complete matching clips; keep direct fallback until then.
2. **Melee, casualties and recoil/settling**, followed by dedicated staff-gripping standard bearers. The completed practice exposed these older poses. Two loading states and four march samples remain deliberately partial animation.
3. **Optimize textures and bundle loading**, then obtain informed human checks of shoulder/grips, weapon proportions, drill and ordinary formation readability. Measure named ordinary-PC startup/frame time and peak effects, rather than infer performance from PNG sizes.
4. **Repeat complete Gettysburg encounters with independent players**, including winning assaults, supported recovery, orderly withdrawal, low ammunition and checkpoints. Consider default promotion only after those gates, then follow the existing Gettysburg-first battle rollout.

This group establishes no new overall game grade, default release, itch.io upload or full Civil War art completion.
