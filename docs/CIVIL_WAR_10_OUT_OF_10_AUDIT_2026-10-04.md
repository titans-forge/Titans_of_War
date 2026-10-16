# Titans of War: Civil War — play audit and route toward 10/10

Prepared October 4, 2026. Candidate: Gettysburg v18, following the installed v17 baseline. Review requested: Astra at Max in Codex. This audit covers the whole game; the new native art remains an explicit Gettysburg preview.

## Verdict and grading standard

The game has a substantial, working foundation: eleven playable battlefield configurations, meaningful morale and supply constraints, close combat, organized withdrawal, branch narratives, inspectable objectives and recoverable battlefield saves. It is enjoyable to command a coordinated attack or extract a battered army. The strongest result in this pass was an orderly Gettysburg withdrawal; the alternate Gettysburg attack also produced a decisive victory through actual field orders.

After Astra Max challenged the initial 8.3 estimate against the actual campaign contradictions and unfinished art coverage, my revised provisional overall assessment is **7.8/10**. A solid A begins at 9/10 for this review. No whole-game category earns an unqualified A yet. A sharper Gettysburg figure alone cannot lift unfinished action families, command friction, heavy textures and untested target devices to that standard. These are editorial, model-assisted scores from AI-operated play on one Mac, not player-review averages or measured commercial quality.

| Area | Provisional grade | Strong now | What prevents a solid A |
|---|---:|---|---|
| Battle mechanics | 8.2 | Fire, cohesion, suppression, support, contact and withdrawal produce understandable consequences. | Command recovery remains cumbersome; several coordinated offensive plans need broader testing; a success brief differs from its win rule. |
| Visuals and animation, whole game | 7.5 | Detailed figures, period standards, restrained labels, landmark environments and the Gettysburg native pilot. | Missing roles/bearings, abrupt changes to older art in contact, limited pose counts, imperfect weapon/bearer attachment. |
| Controls and interface | 8.0 | Public orders, forecasts, mission conditions, roster, destination previews and compact controls work. | Dense information, multi-step turn recovery, and camera/marker preferences resetting on cold resume. |
| Historical and educational presentation | 7.5 | Named situations and landmarks; several outcomes explicitly distinguish game assumptions and counterfactual interpretation. | Confirmed strategy/aftermath and calendar contradictions need repair and broader route review; drill/flag/uniform review is incomplete. |
| Replay and balance | 7.8 | Different openings and ammunition levels support different objectives; preservation can be a legitimate success. | Only representative commanded encounters were played; defensive and offensive mission difficulty differs considerably. |
| Reliability and recovery | 8.5 | All eleven configurations reached a result; battlefield facts cold-resumed correctly; the fixed single campaign ending survived a page reload. | Broader branch/outcome dependencies, cross-browser and named-PC evidence remain open. |
| Performance | 7.7 | Responsive orders and fast scene-ready diagnostics on this Mac. | Gettysburg loads many textures; active frame intervals are appreciably worse than paused measurements. |
| Music and battle sound | Not rescored | The retained playlist and revised Bonnie Blue Flag arrangement are established work. | This pass did not include a fresh audible listening session; visual/text sound signals do not establish mix quality. |

Scores describe this candidate and evidence below. They do not certify anatomy, historical drill, human usability, Windows compatibility or default-art readiness.

## What was actually played

One owned in-app browser tab ran the candidate through ordinary public controls. All eleven field configurations reached terminal results. Most ran at 4x to cover complete encounters; the Gettysburg animation inspection also ran at 1x. A Story campaign reached Appomattox through actual decisions, delegated field resolutions and late supply purchases. There were no hidden-state edits or injected orders.

| Battlefield | Opening / ammunition | Tested actions and result | Follow-up |
|---|---|---|---|
| First Manassas | B / full | Original defensive opening left without further orders. Field defeat, command 16, CS losses 37%; support and hill-clearance conditions unmet. | This tests an unattended opening, not a competent defensive plan. Re-test reserve commitment and a coordinated hill defense. |
| Shiloh | B / full | Held Breckinridge's reserve and kept the connected front. Army preserved, command 98, losses 4%. | Compare a disciplined offensive plan and a reserve committed too early. |
| Chancellorsville | A / full | Waited for the flank force; ordered Rodes to assault and Colston to advance. Field defeat, command 62, losses 1%; partial flank gain. | Improve the clarity of the complete success conditions and test a stronger coordinated exploitation. |
| Wilderness | B / full | Held Heth; fell back with wavering Wilcox. Army preserved, command 97, losses 8%; some units escaped in disorder. | Keep the distinction between surviving and withdrawing in order clear. |
| Third Winchester | C / full | Political opening, then withdrawals by Ramseur and Rodes. Both withdrew in order; Gordon escaped in disorder. Field defeat, command 21. | One cannot infer a broken retreat mission from this result: C was a political/field-defense opening. Test the designated whole-army withdrawal opening separately. |
| Cedar Creek | C / full | Morning-success withdrawal opening; withdrew Gordon alone. Gordon escaped in order, but the whole mission failed, command 22. | Make the army-wide requirement easy to notice; test withdrawing the remaining formations. |
| Gettysburg | B / full | Moved Pickett into east-facing fire, inspected reloads, saved/cold-resumed, entered close combat, used compact Fallback, then withdrew all five formations. Organized withdrawal 90% against 70% required, command 98, losses 10%. | Best complete state/recovery evidence of this pass. Complete the art family before promotion. |
| Gettysburg with Jackson | A / full | Rodes assaulted Cemetery Hill, Early advanced, Johnson assaulted Culp's Hill and entered close combat. Decisive victory, command 99, losses 3%. | Compare less successful timings and depleted ammunition; this one victory is not a balance certification. |
| Chickamauga | B / 68% | Concentrated Bushrod Johnson, advanced Kershaw/Hindman, preserved Preston. Defeat, command 24, losses 2%. Used turn-clearance preview and confirmed a move; the deadline arrived before reissuing the attack. | Recovery is too laborious under pressure. This does not establish that the clearance path itself failed. |
| Cold Harbor | B / 35% | Deepened works and held. Decisive victory, command 97, losses 8%. | Test weaker preparation and offensive branches. An easy prepared defense can be intentional. |
| Petersburg | B / full | Secondary-works containment, including compact controls. Limited victory, command 99, losses 4%. | Test timed counterattack and reserve transfer in addition to containment. |

External evidence directory: `/Users/titansforge/Vault/Titans_of_War_Art_Work/gettysburg-v18-20261004/browser-audit`. `all-battles.json` preserves results and actions; individual screenshots/text preserve the observed interface. This is eleven representative encounters, not every opening, ammunition setting, difficulty or platform permutation.

Additional deterministic scans covered 44 unattended battlefield openings and 240 campaign policy/seed cases. All terminated. An adaptive policy reached an ending on all 24 tested seeds in each of Story and Standard; a fixed Fox policy survived Story but exhausted the army in Standard. After the finale/context repairs, a fresh 240-case scan found zero duplicated finales and all 72 surviving campaigns recorded Appomattox once. These are software experiments, not human win rates or independent customer validation. Repeated rigid strategy failure alone does not prove unfair difficulty.

## Findings and repairs in this pass

### Native loading and aiming

V18 replaces the Confederate A east-facing stationary source with six native poses: ready, shouldered fire, cartridge preparation, muzzle charging, ramming and return to shouldered aim. Reload progress comes from actual volley/reload facts, advances once through four phases, freezes on pause and derives correctly after a cold resume. No presentation timer changes shot timing or damage. Other addresses retain their complete accepted fallback; older policies and source pixels are preserved.

The live close 1x inspection captured 18 samples through a reload and the next volley. A further clean normal-scale E cycle captured ten samples: 36 volleys remaining, reload 4.2 down to 0.4, then 35 volleys and reload 4.4. The earlier clean NE sample supplies layout evidence only. No obvious gross scale jump was seen in the sampled E poses; this remains discrete browser sampling. A save at field time 49 cold-resumed paused with the same displayed strength, cohesion, morale, ammunition, facing and 2.5 reload remaining, without a command refresh. Contact later displayed close combat rather than rifle volleys; a whole-army withdrawal reached its result.

The source is an illustration pilot with explicit limitations. Its measured cap-to-supporting-sole spread is **5.739%**: it fails the initial 5% engineering target. Astra Max independently judged the variation to follow posture and accepted a documented **6% allowance for this source alone**, subject to actual playback. There is no raster rescaling, body warping or per-phase size correction. Solid-alpha padding passes, but faint alpha fringes remain; the bayonet is omitted or obscured in two loading poses. The four loading frames compress a drill that the [NPS soldier guide](https://www.nps.gov/common/uploads/teachers/lessonplans/Civil_War_Soldier_Guide-508.pdf) describes in more steps. This is not certification of a correct complete drill.

### Campaign finale — confirmed defect, repaired and replayed

The first public Story route recorded Appomattox twice as decisions 29 and 30. A separate real headless route reproduced it. Appomattox lacked an explicit terminal flag, so an early branch arrival advanced into the canonical Appomattox slot again. The repair makes the finale terminal, refuses a second commit to a concluded headless state, and makes the public commit button reflect pending/debrief/terminal guards. Authentic tests cover all four finale options, early arrival and legacy saved states. A second public Story route ended at decision 29 with exactly one Appomattox entry, no next command, and the same single ending after a cold page reload. Existing old chronicles are retained rather than silently rewritten. This defect is closed for the tested scope.

### Campaign chronology — confirmed presentation concern

The alternate Atlanta sequence reached October–November 1864 and then presented Third Winchester, dated September 19, before Cedar Creek. The repaired handoff explicitly labels a historical flashback and explains the carried campaign resources; the second public route observed that note. This supplies orientation without silently reordering strategic consequences. Chronological/resource dependency restructuring, the election branch and other alternate-history chains still deserve a separate consistency review.

### Chancellorsville branch causality — independently found defect

Astra Max traced actual campaign decisions 12 and 13: the player refused the split and chose a compact defensive line, but the next scene and its orders assumed Jackson had already ruptured the Union flank. The authored routing reproduced this contradiction. The tested correction derives description, choices and outcomes from the defensive B, feint/probe C or direct-pressure D approach, while retaining IDs, effects, targets, old history and save compatibility. The second public route observed “The Compact Line at Dusk” and a matching consolidation outcome. **The A flank-march choice followed by a failed tactical result still needs a separate causal-context repair**; preserving that old authoring is not proof it is correct.

### Alternate Gettysburg mission explanation — independently found mismatch

The Jackson attack earned decisive victory while Culp's Hill still displayed “Contested.” The authored brief says take both hills, but option A can succeed through surprise, coordinated attackers and disruption of the Union center without clearing both displayed sectors. This is a mission-explanation/win-rule mismatch; it does not prove that the victory itself is wrong. Make the brief and success telemetry explain the actual conditions, or deliberately revise the rule with versioned mechanics. Test this captured result explicitly.

### Source guide — small repair

The music sourcing guide again recommended “Tenting Tonight,” despite its removal. That recommendation is removed, and the guide records both requested exclusions: “Tenting Tonight” and “Just Before the Battle, Mother.” This is a documentation fix; no retained audio was replaced in this pass.

### Performance and layout observations

Gettysburg reported 106 loaded textures and **389.73 MiB nominal RGBA**; other tested fields reported roughly 184–197 MiB. These are pixel allocation estimates, not measured GPU residency. Active Gettysburg samples reported wall-interval p95 around 21.9–23.5 ms. Paused 8–10 ms samples cannot justify an active 60 fps claim. Scene-ready diagnostics around 253–281 ms do not measure full cold navigation, transfer and decode time.

At a 390×844 requested compact viewport, the selected Fallback button was reachable and the details drawer opened. Petersburg compact controls also reached a result. This is responsive browser emulation, not a physical phone or the user's named PC. The first transient Gettysburg mobile screenshot is unsuitable as final layout evidence; the settled details and Petersburg captures are the relevant ones.

Cold battle resume preserved combat facts but reset camera and the mission-marker preference. The code also initializes selection to the default; the tested Pickett selection was already that default, so its reset was not independently demonstrated. These are modest usability concerns, not combat-state loss. Most initial captures include the opt-in field profiler, which consumes space; that obstruction is not ordinary product UI. Final diagnostic-free desktop and settled compact captures show reachable bottom orders without observed overlap. The compact terrain occupies only about a 190-pixel band, so Focus/Expand and uncoached readability deserve follow-up. Short active profile windows can also be perturbed by screenshot/control polling.

## Next work, in leverage order

### 0. Close the confirmed campaign and mission-explanation defects

The single Appomattox ending and explicit Atlanta/Valley calendar orientation are repaired and publicly replayed. Chancellorsville B/C/D context is regression-tested; B was publicly replayed. Next investigate the code-supported failed flank-march A aftermath dependency and resolve the alternate-Gettysburg success explanation, then audit causal dependencies across all branches. The failed-A concern was not independently reproduced in this public campaign route. Keep historic/counterfactual context clear and retain existing recorded chronicles.

**Acceptance:** each finale choice concludes once, late commits are refused, cold legacy saves recover, descriptions/options/outcomes match the recorded strategy, and displayed success conditions match the rule that actually awarded success. A flashback note is a bounded orientation improvement; it does not solve every chronological/resource dependency.

### 1. Finish one coherent Gettysburg action and role family

Finish the vertical slice before generating many more isolated soldiers. Add matching contact/casualty poses, actual staff-gripping standard bearers and artillery service roles; complete Union N/NE/NW bearings and then controlled additional identities. Confederate A already has all eight basic bearings: do not repeat an obsolete missing-bearing diagnosis.

**Acceptance:** observe ready, march, turn, fire, loading, contact, fall, rally and retreat on both sides at overview/normal/close zoom. No abrupt return to incompatible old figures. Weapon, shoulders, staff and supporting foot stay coherent. Native measurement and missing-phase fallback pass; pause, reduced motion, losses and cold resume preserve identity and phase. Obtain informed human art/history review before default promotion. The current six-cell source is a useful first step, not the finished family.

### 2. Make a blocked or threatened command easy to recover

Retain destination confirmation, but offer a clear recovery flow that keeps the original intention visible: identify blocker, preview a safe clearance move, then offer to resume the prior attack after clearance. Keep uncertain/dangerous actions deliberate. Preserve camera, selection and display preferences on resume where practical. Reduce the amount of inspector/mission/receipt information competing for attention; keep detailed explanations expandable.

**Formative usability target:** at least five uncoached players complete move, coordinated assault, reserve transfer, turn clearance, fallback and organized withdrawal drills. Aim for 80% completing each within 90 seconds without verbal help. Record confusion and unintended commands; iterate on failures. This small sample guides improvement rather than certifying usability. Existing forecasts and turn previews already exist—the work is their accessibility and recovery flow.

### 3. Reduce texture pressure and measure active play on target hardware

Load detailed fallback families only where native coverage actually needs them; avoid dropping a fallback before contact/crew/casualty coverage is ready. Repack losslessly, verify pixel hashes, investigate atlas allocation and offscreen work. Measure real resident memory separately from nominal RGBA.

**Acceptance:** named Mac and Windows integrated-graphics PC runs, complete battles at 1x/4x, close effects and compact layouts. Target active p95 frame intervals ≤16.7 ms where feasible and ≤33.3 ms on the minimum device, responsive orders, no progressive texture growth over repeated battles, and measured cold load/decode time. Capture traces and actual memory rather than extrapolating from paused profiles.

### 4. Test competent tactics and varied mission balance

Use several reasonable command plans per mission: holding/reserve discipline, coordinated assault and organized extraction. Vary all four openings and full/limited/depleted ammunition, with repeatable seeds. Prioritize Manassas, Chancellorsville, Cedar Creek and Chickamauga follow-ups exposed here. Separate designated withdrawal, political and offensive objectives.

**Acceptance:** demonstrate an attainable intended objective with more than one sensible plan where the design promises it; demonstrate failure consequences for poor timing without hidden rules. Compare human observations with engine scans. State desired difficulty by mission and Story/Standard rather than demanding identical win rates or making every opening automatically win.

### 5. Review chronology, learning outcomes and historical identity

Resolve the Atlanta/Valley calendar transition. Audit branch state dependencies, commander survival, elections and endings. Verify representative standards, uniforms, weapons and buildings against primary historical sources and label representative art accordingly. Keep actual history, counterfactual resolution and numerical game assumptions visibly distinct. Preserve the battlefield-specific landmarks already present and deepen their connected surroundings where they still look decorative.

**Acceptance:** a historian or knowledgeable independent tester follows both historical and alternate routes and can explain what actually happened, what the player changed, and why. Every battlefield has its requested one or two defensible identifying structures/features. A short post-battle reflection tests understanding, not recall of a generated narration.

### 6. Finish sound and accessibility with fresh listening and input tests

Listen to full retained tracks and combat together, including the revised Bonnie Blue Flag repetitions and finale. Check transitions, peak loudness, loop fatigue, shot/contact feedback and text equivalents. Verify keyboard-only selection, focus visibility, reduced motion, non-color states and screen-reader navigation of essential controls.

**Acceptance:** complete a field and campaign segment on speakers/headphones without clipping or music masking an important warning; excluded tracks remain absent. Keyboard-only players can issue, cancel and confirm orders and reach compact controls. Do not assign a new audio grade before listening.

### 7. Port the finished language and complete the release gate

After Gettysburg passes its family, hardware and human review gates, follow the existing art plan: shared library, alternate Gettysburg, Manassas, Shiloh, then the remaining fields in their documented order. Test date-specific standards and theater scenery rather than pasting Gettysburg unchanged everywhere.

**Acceptance:** full regression and asset checks, named-browser/itch iframe tests, ordinary-PC viewport tests, save recovery, nonblank renders and console review. Package only required assets. Default promotion and a public upload are separate reviewable actions; this local preview is not a released build.

## Evidence and independent review

The work folder contains baseline hashes, authentic preservation fixtures, test/build/native logs, source prompts and rejected attempts, browser captures, campaign scans and installation receipts. V18 retains 36 selected atlases / 72 complete clips and 39 historical image/metadata pairs. Mandatory tests exercise real engine volley timers and actual renderer paths with display doubles; browser playback supplies separate real-field evidence. Synthetic tests are not GPU playback or human validation.

The independent source review is [recorded here](art-pass/reviews/gettysburg-v18-independent-e-actions-source-review.json). The [Astra Max game-wide critique](art-pass/reviews/gettysburg-v18-astra-max-game-audit-review.md) records disagreements, independently identified defects and revised scores. It is a separate model-assisted code/evidence review, not an independent human playtest. Final candidate checks passed **1,343 gameplay, 242 current-art and 376 asset checks**, native author validation and the production build, with no failed or skipped Node tests. Final immutable installation hashes and post-install results belong in the completion receipt.
