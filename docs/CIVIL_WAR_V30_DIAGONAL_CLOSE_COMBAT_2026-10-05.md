# Gettysburg v30: southeast–northwest close combat

This pass adds Union A southeast (direction 1) and Confederate A northwest (direction 5) contact and casualty artwork. Four native sheets supply sixteen poses: low guard, bayonet extension, withdrawal and block; hit reaction, knee drop, collapse and ground rest. A rifle held at the shoulder is a firing pose, so the Confederate extension was redrawn with the stock beside the hip. Resting casualties release their weapons and do not aim prone.

Use `?artPass=gettysburg-v30&infantryScale=moderate` for the local preview. The inherited profiles are baseline 100%, moderate 86% and small 74%; absent or invalid profile means baseline. The same profile applies to all infantry presentation. This is a selected Gettysburg art extension, with ordinary default and historical art selections preserved.

## What is preserved

Only the clip policy, strict clip dispatch and a new southeast–northwest helper change in production. The Scene, volley sampler, engine, formation state, checkpoints, campaign storage, flags, artillery, audio and older artwork remain byte exact. Stable A/B identities, feet, physical slots, loss membership, saved fall times, melee phase timing, shot18 cache and muzzle behavior keep their existing contracts. Missing new sources and Union B use the accepted fallback; the reverse Union northwest / Confederate southeast axis also retains fallback.

The native author copies whole generated PNG bytes. It does not crop, mirror, rotate, clean alpha, resize or normalize individual phase heights. Independent source registration selects projected pelvis/torso X separately from the support patch X; root Y reproduces that patch's alpha≥64 exclusive extent. Each army's contact cap-to-near-sole reference is shared unchanged with its casualty sheet. Natural crouching and foreshortened falls remain shorter. Model-assisted support and anatomical judgments are not physical simulation or historical-drill certification.

## Source corrections and evidence

The built-in image-generation tool produced the artwork. Selected sheets, full prompts and rejected-attempt history are preserved. Initial candidates failed because long weapons or boots crossed/touched native cell boundaries. One Confederate contact candidate also read as firing. Those sources were replaced through whole-sheet generation, retaining the actual failures. A previously used blank inset composition guide helped separate body-plus-weapon groups. No validator threshold was relaxed to accept a near miss.

Selected alpha≥64 cell-padding minima are Union contact 21 px, Union casualty 27 px, Confederate contact 38 px and Confederate casualty 35 px. These are solid-silhouette measurements, not claims that every low-alpha fringe pixel is absent. Fine colored fringe, occluded rear grips and stylized thrust movement remain source limitations.

Astra at Max independently accepted all four exact source sheets and their sixteen cells. The measured shared references are Union 372 px and Confederate 384 px. The actual standalone native-author check passed 239 rejection cases and verified all twelve exports; all twenty-four older author files remain unchanged. Four JSON cases share one diagnostic label but bind distinct input bytes. This is source acceptance for the selected art pass, not full-family or historical-drill certification.

## Play and checks

The public route is Pickett Move to (650,600), then Assault the left Southern ridge. A fresh engine probe reaches reciprocal Confederate NW5 / Union SE1 contact; that probe does not establish browser play. Separate real browser preparation reaches field time 25 with Pickett visibly in close combat with Gibbon, using only normal controls and visible map clicks. Save/leave, full reload and Resume preserve the displayed combat/order facts. Repeated hot paused captures match; the first cold focused capture has some pixel differences despite matching displayed facts. Whole-screen cold pixel equality is not claimed.

The actual candidate browser also reaches this encounter. The first v30 route paused at 25 with strength 5230/5404 and morale 90%; a separate v29 replay reached 5226/5404 and 89%, so those independently played runs are not equal-state comparisons. A public save/reload/resume/re-save sequence then provided a single checkpoint for v29/v30 comparison: both selectors restore the same paused time 25, strength 5226, cohesion 68%, morale 89%, ammunition 42/42, suppression 29%, northwest facing, Gibbon opponent and Southern-ridge Assault destination (470,330). Fit and Focus screenshots show the selected new contact poses in the same encounter. The browser evidence covers these recorded states; source and scene checks cover all sixteen new phases.

Repeated reloads exposed an inherited campaign-anchor problem before that re-save. After the first successful resume, a later navigation rejected the checkpoint under both v29 and v30. Source-only reproduction attributes this to campaign-load normalization followed by autosave leaving the original field anchor stale. Saving again through normal controls binds the normalized campaign and allows the comparison above. No browser storage was inspected or injected. This workaround is not a fix: repeated-reload checkpoint stability is a high-priority follow-up, and its failures remain in the audit. The campaign and checkpoint code remain byte identical to the live baseline.

The isolated candidate retains authentic prior-selector pose/Scene witnesses, old fixtures and before-images. The v29 test's formerly unknown `gettysburg-v30` negative token is explicitly migrated to a permanently invalid token; every other assertion and the authentic v29 fixture/migration ledger remain intact. Package metadata permits only the declared version and v30 test-command additions. Current behavior is tested directly, without substituting an older implementation into ordinary tests.

The candidate passed 25 focused tests, 545 current-art tests, 679 asset checks, 61 field-continuity tests and 1,704 gameplay tests, with no skips or failures in the final runs. The production build passed. Astra independently reran the 25 focused tests and verified the source/dispatch scope. Earlier failures are retained: the new harness initially compared live against paused motion, sampled losses before native A casualties, assumed a naturally missing firing source, and assigned an inherited walk-restore edge to the wrong witness. Corrected setup uses matched v29/v30 operations and explicitly withholds native sources for fallback tests; authentic preservation fixtures and production bytes were unchanged by those repairs.

The inherited immediate-before-first-draw re-save edge changes 25 surviving WALK frames on the southeast–northwest case and 13 on the northeast–southwest case in both v29 and v30 under all three profiles. All thirty-two fallen records remain exact. Ordinary first cold draws remain exact in the scene tests; that does not establish whole-screen browser equality.

The external `civil-war-v30-20261005` receipts bind the actual final browser comparison, independent exact-candidate acceptance and local installation separately. No public upload or whole-game regrade is part of this pass.

## Next priorities

1. Fill Union A northwest and Confederate A southeast contact/fall to complete the opposite diagonal. Keep direct bearing-specific sources rather than mirrored kit or weapons.
2. Pilot Union B contact/fall on a common encounter bearing, preserving identity-specific fallback elsewhere. Confederate B artwork needs a separately designed identity-routing change to become visible.
3. Complete convincing Union northern walking. Different frame hashes alone do not prove alternating physical foot contact.
4. Review close-combat frontage and occlusion as a separate presentation/spacing change. Dense blue and gray ranks still interpenetrate, and improved individual poses do not solve that. Preserve casualty membership and combat outcomes while testing a clearer contact front.
5. Repair the repeated-reload campaign-anchor mismatch first in the next stability pass, using the actual public failure and source-only reproduction. Also address the inherited immediate-before-first-draw cold re-save WALK edge and restored sector/camera context. Obtain fresh human play, uniform/drill review and target-device performance evidence before default promotion.
