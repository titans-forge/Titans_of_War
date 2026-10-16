# Gettysburg v27: Union northeast stationary actions

The normal-Gettysburg preview ?artPass=gettysburg-v27 adds distinct ready, aimed fire, loading and ramming poses for both stable Union soldier identities facing northeast. Two whole native 2×2 RGBA sheets supply eight poses and six action clips: 62 selected atlases and 102 clips. Northeast marching retains the exact v26 fallback.

## Implementation and artwork

The narrow Union northeast helper checks exact army, identity, action, bearing, frame order, source key and dedicated nativeUnionNortheastSequence marker. Existing shared timing, pose selection and shot motion drive the new art. Missing phases withhold an entire action while preserving siblings and the other identity. Earlier policies reject the new capability. Two-stage reload, v18 four-stage Confederate east reload, rules18 and checkpoint22 remain unchanged. No engine, scene, campaign, audio or storage changes.

The original plan included walking. Eight whole march attempts failed to reliably alternate the anatomical leading leg. Whole-sheet edits, an existing gait as primary reference and a fresh colored mannequin guide were attempted. The guide changed colors between thigh and shin while keeping the same contact silhouette. None of those nine outputs is selected. Actual Astra at Max endorsed a useful stationary split; no two-frame exception or manufactured gait acceptance.

The two accepted sheets are complete byte-identical generator originals, each 1254×1254 RGBA with 627-pixel cells. Minimum solid alpha64 clearance is 40 pixels for A and 16 for B. A keeps black pouches; B brown. Independent review observes distinct actions, coherent rear northeast bearing and no material within-sheet head, roll or limb scale mismatch. No mirroring, warping, collaging, resampling, alpha editing or phase-height normalization. Low-alpha fringes remain; solid clearance does not certify fringe-free art.

Eleven actual built-in imagegen requests, exact prompts, reference hashes and whole originals are retained. The tool does not expose its underlying model identity. Saved prompt set: docs/art-pass/candidates/gettysburg-v27/GENERATION_PROMPTS.json. Rejected march candidates were retained externally and removed from selection.

A body spans [406,402,392,396] and B [442,444,439,438] yield fresh own-identity ready/load/ram medians A396 and B439 from fixed cells [0,2,3]. Each reference is shared across all four phases. Fire spans402/444 corroborate scale separately. Eight projected-pelvis X/support-sole Y anchors and cap/sole ROIs are independently inspected and reproduced. Fire-cell barrel-mouth points A[486,197] and B[466,145] land on solid steel pixels before the bayonet. Rear aperture and grip details are partly occluded; model-assisted judgments do not certify anatomy or historical drill.

Actual Astra Max source acceptance SHA256:64b91110340012ce73c307718157302953420196a5082798859962e13e190df3; annotation SHA256:e845b727d192081eeb26e9205c3868ae89dc337e6ea42631f7203fa94870fb9b. Source approval and final installation approval are separate records.

## Checks and genuine play

Candidate gates pass 32/32 targeted, 461/461 current art, 595/595 asset-suite and 1,620/1,620 gameplay checks, with zero failures, skips, cancellations or todo cases. All native authors and the production build pass. The frozen v27 author verifies six complete exports and 212 actual rejection cases on Python3.9.6. Independent coverage binds 201 named record-case definitions and 11 host helpers to the executed aggregate result; individual case telemetry is not emitted.

Development failures are retained. An early broad filter selected an absent-export test, and a new timeline assertion misunderstood the inherited 1.25-second shot lifetime. After actual exports, the first targeted run passed24/32 and failed8. Three harness causes were reproduced against unchanged v26: expected shot positions used raw units without the presented footprint and figure fire stagger; direct fixtures omitted the snapshot callback; a Confederate north-fire null assertion contradicted retained v7 output. Only the new harness changed. Position equality, required pause snapshots and prior-source comparison remain strict. The authentic fixture and protected runtime never changed to satisfy tests. All eight formerly failing cases passed a focused rerun before final broad gates.

Automated Scene diagnostics cover 12 public routes, 12 inherited cold comparisons, 60 ordinary fall cases, 48 resolution cases, 12 real resolver-loss cases and six stationary A/B cases. All 32 fallen bodies per inherited case remain exact:24 native/eight fallback. Ordinary first draw to re-save is exact. Immediate-before-first-draw inherited WALK differences remain13/25/25/13/25/25 in both versions. Northeast walking and four accepted fallback gait phases remain unchanged. All six new stationary addresses and ordered loading/ramming phases are verified. New NE muzzle coordinates intentionally replace fallback coordinates; shot18 identity/schema and unaffected bearings remain exact.

Two untouched full-ammunition routes were genuinely played through public browser controls:

- Reverse approach: Move(220,620), Move(220,170), Move(580,170); actual displayed pauses13,36,53,56; Assault Southern ridge; close combat at66. Incoming Gibbon fire is visible before contact and its hovered name captured. Selected facts: shaken, SW, 5,109/5,404 strength,62% cohesion,83% morale,41/42 ammunition. Two paused whole screenshots are byte-exact. Save, page reload and Resume restore those selected facts and time66 exactly.
- Retained first diagonal: Move(300,500), pause14; Assault Southern ridge; close combat at26. Selected facts: steady, NE, 5,214/5,404 strength,67% cohesion,88% morale,42/42 ammunition. Save, page reload and Resume restore those facts and time26 exactly.

Browser time can advance during UI capture; these are actual observations, not earlier-run timing or combat-total reproduction. Cold camera and transient selectors reset; cold pixel equality is not claimed. Crowded ranks still obscure weapons and casualties. Exact source/phase/muzzle selection is additionally verified by automated Scene tests; screenshots do not certify every phase or continuous motion. Only two routes were browser-played. Audible sound, human usability and GPU performance were not measured.

At requested viewport390×844, document width375 and inner height844, all six footer commands measure within bounds:48 pixels tall, ending at y820. The screenshot bitmap is375×812; DOM bounds establish this layout check, not native-device pixel certification. No page warnings/errors are captured. Both practices were discarded through the UI; the single new QA tab closed, viewport reset and owned preview5175 stopped. The pre-existing tab remains unchanged. Fresh checks found5174 absent before this work; no unrelated server restarted. Initial/final visible campaign facts match:turn11,12 resolved decisions, Chancellorsville failed-flank aftermath, resources67/18/21/82/99 and divergence15%. Storage was not inspected.

## Exact scope and installation evidence

Authentic pre-selector v26 fixture:23 prior policies,64 unique prior PNG/JSON pairs,1,645,056 pose outputs,47,104 prior contact/fall outputs. Expanded protection covers22 runtime/consumer modules,11 old fixtures and159 prior contact files:192 records/185 paths. Fixture SHA25614126072dfe4df2bd8eb4c847ca6b4d73b04c7427c58493fc7c61a3e6def4522 remains unchanged; enabled-v27 recapture is refused.

Scope is three existing plus17 new files, preserving1,364 unrelated baseline files. Snapshot1,367 files; baseline SHA25605532fd745609913ac69e8ea53f5b242560c0628000fcccac4ad501137f7b599. Protected engine SHA256e0c7ac497c267bf178288e61bc08e985d6a3246a740ac36e16ea416747d1fa1c. Previous build backup:350 files/254,531,202 bytes. Browser-tested candidate build:354 files/255,732,680 bytes.

Fresh generic installer faults pass15/15. Separate read-only coverage binds257 nested files,15 script/log pairs, rollback bytes and six preserved concurrent-edit outcomes. Generic fixtures do not establish real v27 source/browser/install acceptance. The narrow final expected-before-check to replacement/unlink instant race remains explicit.

Frozen hashes, actual independent Astra Max final review, rollback-backed scoped installation, installed targeted/art/continuity/native checks and full build-byte comparison are recorded externally in civil-war-v27-20261005. Only successful bound receipts establish completed installation; this document does not pre-assert future installation or release. No default promotion or upload.

## Next priorities, in order

1. Complete ordinary Union A and B north/northwest bearings, stationary actions first and walking only after opposite contacts are visible. Sixteen missing action addresses plus two NE march addresses remain. Ranking follows verified coverage/expert review, not measured direction frequency in human play.
2. Revisit NE walking using a validated anatomical pose source or separately scoped rig workflow. Distinct pixel hashes do not prove a complete cycle.
3. Reduce visual crowding so firing, bayonet and casualty actions can be read. Separate spacing/painter order from physical contact distances; protect mechanics/balance if simulation changes.
4. Complete remaining SE/NW A contact/fall pairs and B-identity partners, exercise terrain/zoom transitions, and obtain fresh human and uniform/drill review before default promotion or extension.
5. Repair the inherited immediate cold re-save WALK edge in a separate runtime increment.

Family completeness, production/default approval, human usability, anatomy and historical drill certification remain false. This increment does not establish a new whole-game grade.
