# Civil War v35: preserve the first rendered pose through immediate re-save

## Changes in priority order

1. Reproduce the installed-v34 first-render defect from the authentic owned Gettysburg field46 save. All ten raw visual records are accepted, but a Save before the first draw consumes restoreFrame. One Pickett figure and 24 Hancock figures then choose a different native march phase. Save bytes, combat, feet, standards and shots are intact; the failure is the Scene's use of a draw marker after non-drawing sampling.
2. Add a narrowly gated, view-local first-render record for active infantry. It exists only after the actual base visual parser accepts a compatible raw frame at the current time, position, mode and motion options. It retains the raw visual object identity and capacity, exact simulation time, motion options and render-affecting formation facts. Save and contact sampling validate but do not consume this record. A completed render consumes it.
3. Discard pending intent permanently when time, travel, facing, formation mode, strength, status, reload, volley, fatigue, activity, contact, resolution, reduced motion, object identity or capacity changes. A render failure retains intent for a retry. Pending records never enter saves; no additional serialized sidecar or format version is needed.
4. Register meaningful actual-Scene regression checks and preserve installed-v34 source through three authentic archives and a narrow metadata-reader migration. Current runtime assertions still use current code; historical code is a before reference only.

## Preview

Local preview: http://127.0.0.1:5174/?artPass=gettysburg-v32&infantryScale=moderate&contactLayout=v33&standardContinuity=v34&animationContinuity=v35

The new switch is canonical Gettysburg artPass=gettysburg-v32 with animationContinuity=v35. Standard continuity v34 and contact layout v33 are independent. Duplicate or encoded variants disable the animation switch. A query without the new switch retains the authentic installed-v34 behavior and checkpoint output. This remains an optional local preview; no default art promotion or public upload is established.

## Implementation boundary

Only CivilWarBattlefield.jsx changes production behavior. The first-render record is ephemeral Scene/view state. Object.is comparisons preserve differences between absent and null primitive facts. Its footprint binding stores geometry, not a mutable object reference. The existing generic raw visual updater, base checkpoint parser/writer, native clip selector, assets, pivots, raw feet/slots, physical collision geometry, shot origins, flag carriers and standard transforms remain byte unchanged. Existing save owner and checksum algorithms remain unchanged.

The record is created for eight active infantry views in the authentic input, while all ten raw base records, including the two artillery records, remain accepted. It does not claim to repair inactive warm/cold cached displays. Existing contactLayoutRestoringFrame behavior remains unchanged; v35's own record is independently checked and cannot revive after invalidation.

## Reproduction and checks

The fixed 11-test suite uses the exact two stored-game primitive strings copied from the authorized v34 owned-profile diagnostic into an immutable in-project fixture. The fixed fixture and key hashes bind provenance; normal tests no longer need an absolute external session path.

Actual-input checks exercise all roster views, one/three/seven saves before first draw, contact layout on/off, standard continuity on/off, first/idle/zoom draw, subsequent re-save and fresh reload. Visible bodies, raw figures, standards/UI, shots, graphics and combat match the canonical fresh first draw exactly. There is no new serialized animation sidecar. Fresh v35 rendering matches authentic installed-v34 rendering before the problematic Save ordering.

A controlled matrix covers both armies, Union A/B and Confederate A, all eight bearings and four native march phases, four travel distances and reduced motion. Tests also cover rejected or missing presentation, stale accepted raw time, incompatible motion options, permanent invalidation after thirteen state/command changes with contact layout both on and off, replacement raw objects/capacity and an injected render failure followed by retry. These are source/Display command facts, not GPU pixel or human usability certification.

The fresh installed-v34 capture contains 1,573 files and 551,190,101 bytes, with 1,570 protected files and three authentic archives. All 46 policy/asset queries, 59,744 native pose executions, 336 Scene and 12 cold witnesses freshly match the unchanged v34 canonical fixture; four additional v34-gate witnesses and native/legacy/owned save chains are checked. Old fixtures, ledgers and archives are not refreshed. Pending pin states and unsuccessful diagnostic attempts are retained externally.

## Browser and final validation

The corrected candidate passed all twelve declared commands: 1,944 gameplay test executions, 663 current-art checks, 797 asset checks, the 11 focused v35 cases, inherited v31/v32/v33/v34 suites (25/26/31/25), 16 assault-sector UI checks, 67 save checks, 128 field-continuity checks and a source-bound production build. These overlapping suites are test executions, not a count of independent unique tests. Source/runtime before-and-after bindings are stable. Independent review and installed/served-byte checks are recorded externally after their completion. Public Save/Resume and responsive controls are checked using an owned headless profile and ordinary visible controls. Public timing does not deterministically exercise a Save before the initial Phaser draw; the source ordering tests supply that evidence separately.

Two public attempts were retained independently. The first used the initially approved Scene and was superseded by a three-line feature-gate compatibility correction. An unchanged historical renderer witness extracts only syncFormation; the three new calls now short-circuit when the new feature is off. Authentic v34 passes, the original v35 attempt reproduces the TypeError and the corrected candidate passes the unchanged witness. No historical assertion was modified. The old source, pins, attempted gate logs and browser manifests remain available externally.

Final browser confirmation used the corrected Scene and exact rebuilt manifest. At field45 the first and idle cold screenshots were byte-identical. Public continuation to field46, Save and leave, cold Resume and the contact-layout-off route retained the displayed strength, cohesion, morale, ammunition, contact and order/sector facts. Desktop 1440x1000 and phone 390x844 were exercised; the six phone orders and sector selector fit. Reduced motion was checked as an OS/browser preference on paused views, not a game-specific setting.

Whole-canvas warm/cold equality remains FAIL: attempt01 retains 1,200 and 1,652 changed RGB pixels; final attempt02 retains 2,269 changed pixels at field46. The cause and any physical carrier displacement are unresolved. Comparisons were not normalized to hide differences. This pass fixes the reproduced source lifecycle defect; it does not establish equality for every browser pixel. A local build or a passing source recorder is not a new whole-game grade, independent human playtest or GPU performance result.

## Next priorities

1. Measure rear-rank occlusion using actual PNG crops, atlas pivots, sprite scale and depth at fixed raw feet. Compare moderate (0.86) and small (0.74) only as controlled diagnostic baselines; do not promote small blindly because presentation scale also changes fresh muzzle geometry.
2. Report normalized own-army overlap, per-rear-figure occlusion and opposing union-mask intersection separately by army, bearing and phase. Keep raw intersection areas, a fixed alpha threshold and worst rows; a smaller silhouette must not appear better solely because it contains fewer pixels. Measure eight bearings, four melee phases, both stable identities, contact on/off, full density, casualty gaps/reformation, firing/reload/falls, reduced motion and Save/Resume.
3. If measurement supports it, test a separate nonfiring/rear-body renderer factor while keeping firing sprites and shot sampling at accepted geometry. Review unequal apparent soldier size, contact entry/exit and casualty transitions. Any new displacement needs its own bounded fallen-offset handoff and must preserve v33's frozen dead offsets.
4. Diagnose remaining actual browser cold pixel differences and inactive cached display behavior separately. Broaden native close-combat identity/bearing art only after spacing decisions, followed by independent human command/readability feedback and representative frame timing.
