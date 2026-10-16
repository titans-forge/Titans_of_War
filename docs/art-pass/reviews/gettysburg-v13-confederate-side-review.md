# Gettysburg v13: native Confederate east and west views

Prepared October 3, 2026. Local opt-in Gettysburg preview: `?artPass=gettysburg-v13`. Four new native transparent sources add Confederate A E/W four-phase marching and ready/fire/two-state loading. Thirty atlas pairs and sixty complete clips are selected. All twenty-six v12 atlas pairs, fifty-two retained clips, earlier policies/poses and helper bytes stay exact. Other battlefields, default art, simulation rules, damage, footprints, campaign, standards, terrain and audio remain unchanged.

## What improved

Sideways movement and stationary weapon actions now have native left/right-facing images instead of relying on the accepted fallback presentation. Opposite-contact and opposite-passing legs were inspected as full hip-to-knee-to-boot chains. Several generated attempts repeated contacts or crossed a cell edge and were rejected. The final west source preserves the opposite contact leg depth, with the far leading boot above the near trailing boot in screen Y. Matching broad gray/tan kit is recognizable across the sources; exact skeleton/face continuity is not established.

Each of the sixteen native cells has a fresh concealed-pelvis X estimate projected to its own visible supporting boot sole. Per-cell sole Y avoids row-layout hover without changing pixels or scaling individual phases. One whole-source reference height preserves actual variation. Neutral firing mouths are independently distinguished from bayonet tips: E `[450,247]`, W `[192,214]` in the firing cell, with about 3–4 native pixels of uncertainty.

V12 simulation-timed restrained recoil and latched neutral-mouth smoke geometry remain active for the new views. Optional shot checkpoints bind to the selected v12/v13 pass; an incompatible optional shot record is dropped while combat and valid formation visuals survive. Default and older pass checkpoint behavior remains exact. Missing native phases withhold the entire action; unsupported bearings/identities use accepted fallback art without borrowing a different army or identity.

## Source evidence

All four selected sheets are 1254×1254 native RGBA with four full 627×627 cells. Original sources, public PNGs and built PNGs have identical SHA-256; JSON copies also match the build. No raster mirroring, recoloring, resizing, trimming or alpha cleanup was applied. Generation used the built-in image tool; its response did not expose an underlying model identifier. Selected prompts and original output paths are in `../candidates/gettysburg-v13/GENERATION_PROMPTS.json`. Rejected attempts and intermediate colored leg diagnostics remain outside the installation, in the external work directory.

| Source | Source-wide height | Minimum solid padding | Cap-to-sole range |
|---|---:|---:|---:|
| Confederate A E march | 460 px | 24 px | 29 px / 6.30% |
| Confederate A E actions | 419 px | 38 px | 32 px / 7.64% |
| Confederate A W march | 471 px | 18 px | 39 px / 8.28% |
| Confederate A W actions | 454 px | 23 px | 14 px / 3.08% |

Every cell exceeds the unchanged alpha≥64, sixteen-pixel solid-padding floor. The larger padding requested in generation was not reached everywhere. Low-alpha colored RGB residue and sparse colored pixels remain under the recorded targeted criterion; native transparent-image viewers overemphasize nearly transparent RGB. Rendered checkerboard and battlefield captures showed no conspicuous broad outline. This is not proof of perfectly clean transparency.

Exact-source independent model-assisted records are `gettysburg-v13-independent-{e,w}-{march,actions}-source-review.json`. They preserve per-cell observations, alpha thresholds/ROIs, measurement uncertainties, limits and final hashes. Authoring requires four distinct native sources, exact side/identity/bearing/path/hash binding, all four reviewed cells, the entire role sequence and finite fresh registrations before writing any output. The old native author remains unchanged.

Generic kit plausibility references are recorded in `../candidates/gettysburg-v13/HISTORICAL_REFERENCES.json`, including NPS clothing and accouterment education pages. They do not establish a precise regiment's uniform, exact musket construction or drill choreography.

## Verification

352 acceptance checks passed with zero failures/skips: 133 strict current art/policy/motion/volley checks, 33 field-continuity checks, 105 formation/action regressions and 81 Gettysburg mechanics/brief/artillery checks. Native authoring checks and the production build passed. The build retains its existing large-chunk advisory. The preservation fixture recaptures 4,161 actual v12 policy/asset/native-pose outputs and twenty-six retained PNG/JSON pairs; the captured policy/asset/pose payload SHA-256 is `32fe237d8fd6606ae105433f51e1c81bf1451b8aa4e75ed705bb3fd2a401d0a3`. The fixture file SHA-256 is `d9928e9c3c3e10f63ca067f68555e7e735daa09af883e0fbd8cdd0c078872912`.

The new tests use actual extracted scene initialization/createFormation/syncFormation/checkpoint methods, the battle engine/formation visuals and installed Phaser JSONHash/Frame parser. Both E and W firing fixtures verify native neutral mouths, recoil, frozen latched shot geometry after movement, turns, losses and re-forming, paused JSON cold restore and immediate re-save, stale cross-pass optional-shot rejection, unchanged combat and safe fallback. Historical test changes extend version filters and unsupported future-version examples; retained assertions stay active. Software fixtures are not independent human usability or physical/historical validation.

Browser QA used one owned in-app tab at an observed 1265×720 desktop viewport. The development comparison displayed registered paired ready/fire/loading/ramming sources, all four march phases and a turn sample. Soles remained at the inspection ground line; expressive passing knees and height variation remain visible. The reviewer cadence does not reproduce battlefield timing or interpolate poses.

A v12 practice save at field time 11 with Pickett strength 5404/5404, cohesion74%, morale94%, ammunition42/42 and W fixed front cold-loaded paused under v13 with those exact visible values. V13 actual east/west turns and queued moves worked. Its second save at field time66 cold-loaded under v13 with those values and W fixed front preserved. Camera/selection conveniences retain existing reset behavior. A subsequent three-formation advance reached combat, ammunition expenditure, casualties, routing and escaped formations by field time193; selected Trimble showed3187/3533, cohesion45%, morale70%, ammunition31/39 and escaped-in-disorder status. This unrefined advance was unsuccessful and does not validate balance or strategy. No console warnings/errors or framework overlay were observed. The owned practice checkpoint was cleared; the campaign was not played or reset. Exact shot-age continuity is established by renderer tests, not precisely timed browser captures. No phone/named-PC/full-battle performance acceptance is claimed.

Actual battle diagnostics reported v12:96 texture sources,26 candidate atlases/52clips,329.74 MiB nominal RGBA; v13:100 sources,30atlases/60clips,353.74 MiB. Actual selected atlas pixels grow from163,541,664 to188,701,920 nominal RGBA bytes:25,160,256 bytes / about24 MiB added, selected total179.9602 MiB. Selected PNG bytes grow from13,319,593 to15,788,780; selected PNG+JSON total15,905,073 bytes. These are source-pixel/asset-byte estimates, not measured decoded/GPU/process residency, peak memory or matched-device performance proof.

External scoped acceptance, independent final code review, browser captures, hashes and rollback receipts are in `Titans_of_War_Art_Work/gettysburg-v13-20261003`. Original files remain unchanged until accepted scoped local installation; the installer verifies the 921-file baseline and selected bytes, preserves rollback copies, installs atomically and verifies output hashes.

## Remaining priorities

1. Complete Confederate A S/SE/SW native views with measured texture budgets and the same whole-sheet pose/kit review. Confederate B and missing Union bearings still need coverage.
2. Reduce expressive knee lifts and source height/body-rotation variation through authored intermediate poses; improve ready-to-aim/loading continuity and recoil foot contact. Four-state gait and two loading states are a limited preview, not skeletal motion or a verified loading drill.
3. Author actual staff-gripping bearers, gun crews, contact/casualty poses and coordinated body movement. Smoke after an entire formation departs remains outside this pass.
4. Optimize the real selected texture set, then run matched complete encounters on named devices and obtain independent human/history review before default promotion or adapting the finished art language to later battlefields.

This local preview does not establish complete-family/default/production approval or a public upload.
