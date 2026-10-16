# Titans of War: Civil War — next development plan

Prepared October 2, 2026. This is the execution plan following the Gettysburg v7 art work and the interruption for Codex stability. It refines the [focused art-pass plan](CIVIL_WAR_FOCUSED_ART_PASS_PLAN.md), which remains the reference for battle order and historical art direction.

## Recommended order

**Finish a convincing, consistent Gettysburg battle first. Then reuse that finished work across the other ten boards.** The next visible gain should be soldiers that retain their quality as they turn, fight, take losses and withdraw. More isolated high-quality still images will not resolve the current gaps.

| Priority | Work | What the player should notice | Completion gate |
|---:|---|---|---|
| 0 | Re-establish the current playable baseline | A reliable comparison build and repeatable encounters | Record current behavior, captures, loading and active-combat performance |
| 1 | Complete the important infantry directions and identity coverage | Soldiers stop changing visual quality when they turn | Matching movement and stationary actions for each supported identity/direction; no visible identity substitution |
| 2 | Finish combat transitions, melee and casualties | Firing has weight; close combat reads as contact; losses and withdrawal look natural | Clear complete action transitions at normal play zoom, synchronized to existing game events |
| 3 | Upgrade standard bearers, officers and artillery crews | Standards are carried by people; guns and crews act together | Correct grips, ground contact, scale, depth and event timing |
| 4 | Finish the Gettysburg ground, landmarks and effects | A coherent place rather than separate assets placed on grass | Connected surroundings, consistent light and scale, clear movement lanes and readable combat |
| 5 | Complete performance, usability and full-battle validation | The improved art stays responsive and commands remain easy to use | Device measurements, complete encounters, save/resume and accessibility checks meet the agreed gates |
| 6 | Promote Gettysburg and freeze the reusable art library | The finished look becomes the ordinary game presentation | All required states covered and reviewed; no unexplained regressions |
| 7 | Roll through the remaining battlefields in the order below | The same quality across the whole game, with distinct historical places | Per-board art, gameplay, landmark and performance review |
| 8 | Finish campaign presentation and prepare the release candidate | Battles lead into a polished, coherent educational campaign | Whole-campaign play, package and itch-iframe checks, then release review |

Performance measurement starts at priority 0 and accompanies every asset group. Priority 5 is the final performance gate, not the first time performance is examined.

## October 3 continuation: Gettysburg v12

The newest local preview is now `?artPass=gettysburg-v12`. This pass reuses the exact v11 native atlas set and adds only bounded, simulation-timed firing recoil/settling plus renderer-owned shot geometry. Earlier previews and ordinary play retain their prior behavior. Shot smoke keeps its original world position, firing bearing and membership through movement, turns and individual casualties while a formation remains active; optional presentation checkpoints retain that geometry across cold resume.

This addressed a concrete integration bug before adding more textures: native poses supplied zero offsets, suppressing the existing formation recoil. It does not supply a complete articulated firing drill. Coverage is still Union A/B E, SE, S, SW, W and Confederate A N, NE, NW; other combinations retain accepted fallback art.

Next order: (1) extend the most useful missing Confederate E/W views with matched marching/actions, checking measured memory needs before loading more atlases; (2) improve ready-to-fire and loading continuity with authored anatomically consistent poses rather than crossfading a held image; (3) dedicated standard-bearer/crew grip and ground-contact work; (4) contact/casualty poses and normal-zoom readability; (5) matched device/full-battle performance and independent human art/history/play checks before default promotion and rollout to other boards. Camera/inspector preference continuity and the displayed order-delay rounding difference remain separate convenience work.

The v12 pass notes record implementation, validation and reconstruction limits. No full-family/default promotion or public upload is established by this local preview.

## Current position, verified from the project on October 2

- The package is version **0.29.0**. The newest infantry work remains an **opt-in Gettysburg preview**, selected with `?artPass=gettysburg-v7`; it is not the ordinary art for the whole game.
- Union A has E, SE and S candidate movement/actions. Union B has S. Confederate A has N. These are screen-facing directions, not historical compass bearings on the battlefield.
- Each supported family currently provides four march samples, one ready pose, one firing pose and two representative loading states. This is partial animation, not a complete firing/reloading drill.
- Stable soldier identities, whole-action fallback, pause retention and reduced-motion handling already exist. The next work should extend them rather than replace their foundations.
- The v7 selection uses ten atlas pairs and twenty clips: about **5.42 MiB of candidate files** and **60 MiB of nominal decoded RGBA pixels**, before overhead, duplicates or the rest of the battlefield. These figures do not establish actual startup time or memory use.
- The October 1 review records passing native-asset validation, 178 asset-related tests, 81 Gettysburg tests and a production build. It also records one completed aggressive practice encounter that ended in a routed defeat. Those are previous results, not tests rerun for this plan or independent balance evidence.
- Battle checkpoints, campaign continuity, command training, orientation controls, melee mechanics, retreat exits and the earlier Manassas/Shiloh improvements already exist. Older audit items describing these as missing are superseded; we should test their current quality instead of rebuilding them from scratch.
- The new art has not established a new overall grade. A fresh score should follow the next completed gameplay review.

Evidence: [v6/v7 implementation review](art-pass/reviews/gettysburg-v6-v7-board-facing-review.md), [v7 loading audit](art-pass/reviews/gettysburg-v7-preload-budget-review.md), [upgrade sequence and completed systems](HIGHEST_VALUE_UPGRADE_SEQUENCE.md), and the current clip registry and pose-selection code in `src/battle/`.

## 0. Establish a small, durable baseline

1. Record the current source state and preserve the accepted build before implementation. The checkout contains substantial existing work; do not reset it or mix unrelated edits into the next batch.
2. Compare ordinary Gettysburg and the v7 preview using the same viewport, zoom and encounter conditions.
3. Capture opening formation, turning while marching, a volley/reload cycle, close combat, strength loss, orderly fallback, rout/exit and a result screen. Include close, normal-play and overview scales.
4. Measure cold/warm loading, time until orders can be issued, sustained frame times and repeated battle entry/exit. Record hardware, browser, display scale and build identity with the results.
5. Record which directions/actions actually appear during the inspected encounters. Treat these as design probes, not player telemetry or a substitute for independent testing.

**Deliverable:** a short baseline report and capture manifest that can be reused throughout the pass. Keep a single external browser preview and use saved reports/checkpoints for continuity instead of accumulating Codex preview tabs.

## 1. Complete infantry coverage before adding more unrelated art

### First implementation batch

Work through **Union SW/W, then Confederate NE/NW**, as identified by the last live Gettysburg review. Produce matching march, ready, fire and loading assets for each added direction. Extend Union B with its own matching assets where that identity is used; never substitute A when B is unavailable.

Then close the existing Union B E/SE gaps and review all eight screen bearings for both armies. Prioritize the remaining bearings from actual maneuver coverage. Full default promotion requires consistent coverage of the playable states, including the less common views reached during turning and retreat.

Use the existing camera, lighting, ground registration and weapon scale. Structural guides can help generation, but generated frames must still be checked for believable anatomy and chronology. Preserve source images, rejected attempts, prompts and registrations so a weak frame can be replaced without losing the accepted family.

**Acceptance:**

- A formation can turn through the tested bearings without a conspicuous jump in body size, ground position, identity or rendering style.
- Feet do not visibly slide during planted phases. Opposite passing poses occur in the right order.
- Weapons point along the reviewed bearing and sit plausibly against the shoulder and hands.
- Unsupported combinations retain explicit fallback during development; they never borrow a visually convenient wrong-facing frame.
- Surviving soldiers retain identity through casualties, reforming, pause and checkpoint resume.
- New atlases load only for the scenario/selection that needs them. Review candidate metadata imports and repeated texture creation as the family grows.

## 2. Make combat look as convincing as marching

Address the current one-pose shot and short loading cycle, then melee, casualty and retreat presentation.

- Build readable transitions from ready to aim, shot, recoil/settling, loading and ready again. The sequence should feel physically continuous without inventing extra gameplay shots or changing reload timing.
- Add contact poses that communicate close combat at normal scale. Keep formations from looking like two unrelated walking blocks passing through each other.
- Connect casualty presentation to confirmed losses, retaining stable survivor identities and the existing strength-to-visible-figures behavior. Use restrained, non-graphic fall/removal treatment with bounded visual lifetime.
- Give orderly fallback, retreat under pressure and routed withdrawal distinct presentation where the existing game state supports that distinction. Check facing against movement so soldiers do not appear to moonwalk accidentally.
- Review melee metal/impact sounds and musket timing against actual combat events. Keep the approved music selection and track edits unless a fresh listening pass identifies a specific issue.

**Acceptance:** players can distinguish ready, firing, loading, engaged and withdrawing formations without reading a detailed unit card. Pause, reduced motion, fast simulation and battle exit do not leave stale poses, repeated sounds or lingering effects.

This is initially a presentation change. If a playthrough exposes a real collision, damage, routing or timing defect, record and fix that mechanics issue explicitly with a focused regression check.

## 3. Finish the human roles and equipment

### Standard bearers and flags

Give standards dedicated carrying poses with credible hand placement and a consistent pole attachment. Preserve the improved cloth motion; refine its attachment, weight and movement response. Check ground depth so poles, cloth and people overlap correctly. Review the correct standard selection across battle dates, especially Third Winchester during the later rollout.

### Officers and artillery

Make officers distinguishable through pose and equipment at playing scale. Give gun crews coordinated handling, loading and recovery states tied to the existing artillery events. Assess the current procedural gun/carriage closely before deciding which components need new artwork; retain working recoil and control behavior.

**Acceptance:** people visibly carry the objects associated with their roles. Cannon, crew, shadows, muzzle effects and recoil agree on position and timing. Improved detail does not obscure selection or create a scale conflict with infantry.

## 4. Finish Gettysburg as one coherent scene

Build on the existing Leister House and Abraham Brian House work. Review their connected yards, tracks, fences, cultivation and worn ground against the project's references; confirm uncertain historical details before replacing art.

Unify terrain and object lighting, apparent scale and contact shadows. Add local variation through field edges, road wear, grass disturbance and stonework where it improves place and tactical legibility. Avoid excessive repeated prop stamps and decorative clutter.

Refine smoke, dust, flashes and impacts around the completed unit poses. Effects should start at their actual sources, drift consistently, fade promptly and remain capped during heavy combat.

**Acceptance:**

- Both landmarks read as part of the battlefield at normal zoom, with useful close-up detail.
- Visible structures agree with collision, cover and line-of-fire footprints.
- Ground treatment does not imply blocked movement where movement remains legal.
- Names and detailed numbers remain available through hover, focus, selection and touch inspection; opaque permanent unit boxes do not return.
- Objectives, exits, selection and urgent conditions stay legible beneath the art and effects.

## 5. Validate complete Gettysburg play and delivery cost

Run complete encounters, not only attractive opening shots. Include a supported attack, a failed attack with recovery, orderly withdrawal, rout/exit, constrained ammunition, pause/speed changes and save/leave/resume. Preserve losing outcomes and ambiguous findings.

Test the actual player-supported factions and modes; do not invent a mirrored campaign mode simply to fill a test matrix. Check a narrow PC viewport as well as the Mac setup, with a named ordinary Windows PC when available. Include keyboard operation, touch inspection, reduced motion and volume/mute persistence.

Record time to first controllable frame, active-combat frame-time percentiles, peak effects and memory across repeated battle entry/exit. Set device budgets from the baseline; every material regression needs an explanation and a decision. Optimize loading and texture reuse before reducing visual quality. Keep high-resolution sources archived separately from the shipping asset set. Any derived shipping images need explicit source bindings and visual checks.

Use the current project commands according to the changed scope: native validation, focused infantry/renderer tests, asset validation, Gettysburg mechanics, relevant checkpoint/landmark checks and build. At the promotion gate, run the broader validation suite and the packaged game. A passing test count alone is not a quality grade.

**Human review:** obtain uncoached player feedback on commands and readable states, plus informed review of weapon handling and period details. Separate those results from model-assisted reviews and authored simulation policies.

## 6–7. Promote the library, then complete the other boards

Once Gettysburg passes, freeze a shared camera/scale/light contract, unit and role families, effect timing, atlas conventions, loading rules and accessibility behavior. Make the approved Gettysburg family the normal presentation only after its required coverage and validation are complete.

Use this established rollout order:

1. **Gettysburg with Jackson:** reuse the people; finish the distinct heights/woodland setting and research a second defensible landmark feature.
2. **First Manassas:** early-war uniform/flag review, Henry House/Stone House surroundings, hill and artillery readability.
3. **Shiloh:** woodland/camp variation, connected church setting, researched second feature and dense-force readability.
4. **Chancellorsville:** distinct Chancellor House and Catharine Furnace sectors, clear flank approaches.
5. **Wilderness:** dense but readable vegetation, road corridors, smoke and a researched second feature.
6. **Chickamauga:** distinct farm clearings, breakthrough corridor and defensive ridge setting.
7. **Third Winchester:** late-war standards, withdrawal/cavalry cues, Hackwood surroundings and a second researched feature.
8. **Cedar Creek:** restrained dawn lighting, camps, rally cues and coherent Belle Grove/Heater House settings.
9. **Cold Harbor:** convincing earthworks and wear, Garthright surroundings and a second researched feature.
10. **Petersburg:** siege crew/equipment work, damaged terrain and works, careful density and performance review.

Maintain one or two historically identifiable structures/features on every board, with the basis for their wartime appearance recorded. Prefer identifiable structures where the evidence and playable geography support them; clearly label interpreted or generalized features. Do not invent a historical building solely to meet the count.

For each board, deliver a before/after review, source/asset manifest, complete representative encounter, command/landmark checks and loading/performance comparison before moving to the next. Reuse shared improvements but preserve each battle's uniforms, flags, terrain, season and tactical identity.

## 8. Finish the product and release candidate

After the battlefield work, revisit the remaining product concerns: uncoached command usability, varied competent-play balance, full human campaign routes, personalized campaign endings and an editorial/audio consistency pass. Fix measured weaknesses before adding new systems.

Prepare a versioned itch package, test its extracted contents and delivery iframe, check save compatibility and fullscreen/resizing/audio activation, and produce new gameplay captures from that exact candidate. Keep the release evidence and package hash together. This plan does not initiate an upload or promotional publication.

## What the next working session should deliver

1. A compact baseline/coverage/performance record for ordinary Gettysburg and v7.
2. The first completed missing-facing asset group, with matching actions and stable identities, available in the development reviewer and an opt-in live battle.
3. Before/after captures at actual playing scale, appropriate validation results and a clear record of any remaining fallback.

If the baseline reveals an immediate control, crash or save-loss defect, fix it before producing new art. Otherwise begin with the missing infantry directions. The next session should end with a visible, tested improvement rather than another replacement roadmap.
