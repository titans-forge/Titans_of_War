# Gettysburg v29: clearer formations

The selected local preview uses `?artPass=gettysburg-v29&infantryScale=moderate`: infantry bodies render at 86% of their previous size. This gives ranks more breathing room while retaining useful detail at overview and close zoom. It uses the exact v28 artwork and animation timing. This is a bounded readability improvement, not a completed infantry family or a new whole-game grade.

The comparison also retains `infantryScale=baseline` (100%) and `infantryScale=small` (74%). An absent or invalid profile selects baseline. Other selectors and battles ignore the scale parameter. The ordinary default art is not promoted by this pass.

## What changed

Three production files carry the change: the clip policy, battlefield renderer and volley sampler. A Scene captures its profile once. Final infantry body dimensions, body-local motion offsets and shadow dimensions use the selected factor. Native actions, accepted fallbacks and fallen figures scale consistently. Flags, artillery, hit areas, effect scale, physical feet, 32 identities, formation footprints and combat rules retain their previous values.

Fresh native barrel-mouth positions and fallback muzzle estimates use the same body factor in both drawing and checkpoint sampling. Cached volleys retain their original world coordinates until expiry, including when an older save is opened under a different profile. Resampling an old shot at a new position would misrepresent where it was fired. Shot18, combat checkpoint envelopes and campaign save22 are unchanged; the URL remains authoritative for the body-size profile.

## Comparison and public play

Actual headless Canvas browser captures compare all three profiles at field time0 with the same saved practice, camera controls and viewport. All retain Pickett's 5,404 strength, 74% cohesion, 94% morale and 42/42 ammunition. Moderate keeps more presence/detail than small while reducing crowding compared with baseline. This is a model-assisted visual preference, not a human usability finding.

The selected moderate profile was played through the public controls: Advance, then Assault Southern ridge. Actual paused observations:

| Field time | State | Strength | Cohesion | Morale | Ammunition |
| --- | --- | --- | --- | --- | --- |
|13|Advance/reload|5,350/5,404|72%|93%|41/42|
|26|Advance/reload|5,235/5,404|68%|90%|38/42|
|41|Close combat|4,893/5,404|54%|79%|37/42|

Save and leave, navigation/reload and Resume preserve the displayed time26 facts across baseline and moderate profiles; time41 facts restore under moderate. Repeated paused captures at26 and41 retain exact PNG bytes. Cold camera/whole-screen pixel equality and every animation phase are not claimed. At1024×768, all six commands are44px tall and end at y742; at390×844 they are48px tall and end at y820. Both fit the actual document width. No captured page errors or warning/error console entries. Battle sound was off; audio listening, human controls, WebGL/GPU performance and native-device usability were not measured.

A separate native-alpha projection uses authentic before/current render facts and six actual PNG/atlas pairs. Each of three Union32-figure formations contains21ready and11fire poses. Fixed0.25-world-pixel samples with alpha≥64 estimate painter-order silhouette coverage, including kit and weapons:

| Bearing | Baseline covered support | Moderate | Small |
| --- | ---: | ---: | ---: |
|N|61.22%|54.83%|47.84%|
|NW|63.27%|56.86%|49.07%|
|NE|62.05%|56.14%|48.98%|

Moderate reduces the estimated overlap fraction by about5.9–6.4percentage points. Twenty to21of32 bodies still have more than half their silhouette covered. This numerical mask model does not reproduce Canvas blending or establish anatomy/readability scores; crowding remains a real limitation.

## Verification and honest test migration

The authentic pre-change capture binds25 older selectors and448 actual-source Scene/render/volley/checkpoint witnesses. Its SHA256 remains `e76989be5369db4a97f85d83ed852e59b28708f708493fac3efa58f2b06224db`. All13 older fixture JSONs remain byte exact.

Previous art-only passes locked runtime source bytes. V29 deliberately changes two locked modules. An explicit12-path ledger covers those two runtime files and ten historical tests. Authentic before-images retain the old hashes; each test changes only one helper import and its historical-byte assertion. Every behavioral assertion remains intact. The helper verifies exact declared current hashes and checks all other protected files directly. The mandatory v29 gate compares current behavior with authentic archived implementations for every prior selector. It does not silently substitute old production files into the ordinary tests.

Candidate checks pass:13/13 targeted,520/520 current art,654/654 assets,1,666/1,666 gameplay and61/61 continuity, zero failures/skips/cancellations/todo; production build passes. Tests include native/fallback/missing-source bodies, all bearings and actions, fall anchors, both muzzle call sites, cached shot18 geometry, pause/cold phases, artillery/standards and unchanged engine checkpoints. Display doubles provide transform checks; actual browser pixels supply the separate visual evidence.

Initial harness failures and initial519/520art plus588/589asset-stage results remain recorded. The broad gates revealed one additional historical lock in v18, beyond the first nine-test inventory. Its authentic live before-image was captured with a separate baseline-bound supplement; neither the original v29 capture nor older fixtures were refreshed. No production fix was needed for these oracle/migration issues. An earlier browser attempt used Space on the focused4× button, left time running and ended routed at123; it is retained and discarded before the valid dedicated-Pause comparisons. Initial geometry collection matched capitalized labels against lowercase DOM text; corrected footer selection supplies the actual six-command measurements.

## Local installation boundary

The fresh baseline is1,409files/469,750,770bytes. Scope is15existing and21new files, preserving1,394unrelated baseline files. Source images, exporters, engine, formation-state/checkpoint helpers, campaign storage and audio are unchanged. No new image generation or repeated native-author fault suite was needed.

The external work directory `civil-war-v29-20261005` holds the independent architectural advice, authentic capture and supplements, exact source/evidence hashes, screenshots, original failures and verification logs. Actual Astra at Max final review, rollback-backed installation and installed-build comparison are required before declaring this increment installed. This document does not pre-assert their success. The unchanged installer SHA256 is `653729e4958fb564b69314c1ae881861e0a8a14528a2e6beb5d9a25f78a94a10`; its previously tested narrow check-to-replace race remains a limitation. No upload, public release or default-art promotion is included.

## Next priorities, in order

1. Complete Union N/NW/NE walking with demonstrably alternating physical foot contacts. Use a validated pose source or a separately scoped rig workflow; different image hashes alone do not establish gait.
2. Complete missing SE/NW A contact/fall partners, then B-identity partners. Review actual grips, kit placement, soles and muzzle semantics at close zoom; retain identity-specific fallback when a source is unavailable.
3. Repair the inherited immediate-before-first-draw cold re-save WALK edge. Also review restored inspector/sector/camera context separately; the sector dropdown currently resets to Nearest even when the saved attack destination is retained.
4. Obtain fresh human play, uniform/drill review and target-device performance checks before promoting the art as the default or extending the new presentation to other battles. Further density adjustments need matched screenshots and combat/foot preservation evidence.
