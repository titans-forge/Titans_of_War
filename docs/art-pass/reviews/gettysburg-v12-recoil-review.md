# Gettysburg v12: firing recoil and persistent volley geometry

Prepared October 3, 2026. Local opt-in preview: `?artPass=gettysburg-v12`. Exact v11 atlas bytes, metadata, keys and measured registrations are reused: 26 atlas pairs, 52 clips, no new images. Ordinary play, previous previews, other battlefields, combat rules, damage, formation footprints, campaign and audio behavior remain unchanged.

## Result

The accepted native clip pose supplied explicit zero offsets, suppressing the formation layer's cosmetic recoil. V12 adds a small smooth movement behind the authored firing direction, peaking at simulation age 0.08 at 1.1 times figure scale and returning to neutral by simulation age 0.40, before the existing 0.50-unit fire window ends. Rotation stays zero. Timing values use the compressed simulation clock (wall seconds coincide at 1x), which the game presents as field minutes. Motion follows simulation time and the existing per-soldier stagger, freezes when time is paused, and is suppressed under reduced motion or resolution. Native marching registration and loading phases receive no additional gait movement.

Each volley now samples neutral barrel mouths before recoil, then preserves its firing positions, bearing, scale and membership for the existing 1.25-unit smoke lifetime. Movement, turning, re-forming and individual casualties cannot drag or erase those puffs. Unsupported native views retain the accepted fallback barrel estimate and receive no invented native flash. The artillery branch is unchanged.

Optional renderer-owned `presentation.shots` data saves the latched geometry. Its bounded reader checks version, art pass, simulation time, formation identity, latest volley time, capacities, uniqueness and finite coordinates. Invalid/missing optional shots do not reject combat or otherwise valid formation visuals. Checkpoint capture samples newly observed volleys between draws without ticking combat; immediate re-save after cold restoration retains validated geometry. The combat envelope still strips all presentation before engine revival.

## Verification

The acceptance suites passed with zero failures/skips: 123 current native art/policy/motion/volley checks, 33 field-continuity checks, 105 formation/action regression checks and 81 Gettysburg mechanics/brief/artillery checks. Native authoring checks and production build passed. The build retains its existing large-chunk advisory. The historical digest covers 3,969 v3-v11 policy, asset and native-pose outputs; it matches the pre-change digest.

The new independent test file executes actual extracted scene constructor, createFormation, syncFormation and checkpoint methods with the actual engine/formation visual code and installed Phaser JSONHash/Frame parser. It verifies all 13 reviewed native bearing/identity combinations, neutral mouths and recoil binding, movement/turn/loss/re-form invariance, pause/reduced-motion/resolution, fallback, malformed optional data, JSON round trips at volley ages 0.18 and 0.80, immediate re-save, save between draws and unchanged combat continuation. These are software fixtures, not an independent human play or anatomy/historical acceptance.

Browser QA used one owned in-app tab at an observed 1265x720 desktop viewport on the candidate server. V11 practice advanced into combat and an owned paused save was cold-loaded under v12. Pettigrew's strength 4772/5819, cohesion 33%, morale 61%, ammunition 40/40 and field time 159 were preserved, with the same N automatic front. Native details, field, standards and controls rendered without console warnings/errors or framework overlay. A fresh v12 three-formation advance exercised queued commands, movement, firing ammunition expenditure, casualties, disordered retreat and the normal practice defeat/debrief path. This unrefined advance did not win and is not a balance/strategy validation. Exact simulation-age 0.18/0.80 shot continuity is established by renderer fixtures, not a claim of precisely timed browser capture. Camera and selection convenience preferences retain prior reset behavior. The owned practice checkpoint was cleared after QA.

The actual field diagnostic reported the same 96 texture sources and 329.74 MiB nominal RGBA, with 26 candidate atlases/52clips. Atlas-only nominal source pixels remain155.9655 MiB; selected PNG bytes remain13,319,593 (13,420,125 including JSON). These are nominal source-pixel and asset-byte values, not measured decoded/GPU/process residency or peak memory. No matched device-performance claim is made.

External evidence and rollback installation receipts are in `Titans_of_War_Art_Work/gettysburg-v12-20261003`. Installation remains scoped and hash checked against the original baseline; existing files have rollback copies.

## Remaining work

This is restrained whole-source recoil, not skeletal movement or a verified musket-loading drill. Depicted feet move by the same bounded translation; new anatomically consistent action poses are still needed for larger body motion. Aim transitions, close combat, casualties, standard bearers and crews remain separate art work. Coverage remains Union A/B E,SE,S,SW,W and Confederate A N,NE,NW. Missing combinations retain fallback art.

Latched shot geometry preserves observed firing positions exactly. If an old/damaged save has no usable shot records, the current neutral restored pose is sampled once as a safe approximation. Neither lastVolleyAt nor recorded formation/target centers can recover historical per-soldier positions and firing bearing after movement or re-forming. Full formation departure still follows the existing early-return rendering path; this pass preserves individual casualty puffs, not smoke after an entire formation leaves the field.

Next: missing Confederate E/W views with measured texture budgets; authored fire/loading continuity; bearer/crew grips and ground contact; contact/casualty poses; matched full-battle/device checks and independent human/history review before promotion. No complete-family/default promotion or public upload is established by this local installation.
