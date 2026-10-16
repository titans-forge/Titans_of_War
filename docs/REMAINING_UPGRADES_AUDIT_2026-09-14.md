# Titans of War: Civil War — remaining-upgrades audit

Date: September 14, 2026 · inspected release: 0.20.0 · local preview: http://127.0.0.1:5267/

## Verdict

The strongest next gains are protecting battle progress, validating a coherent complete campaign, and making the first few minutes easier to understand. The next art investment should finish distinctive battlefield environments and improve people in motion at actual playing scale.

This is a fresh, scoped product and source audit, not a 10/10 certification or a complete playthrough of every route. It recommends a revised order for review; it does not mark queued work complete or change the existing implementation sequence. No game code or published build was changed.

## Implementation progress

September 14 follow-up: item 1 delivered in 0.21.0; see [upgrade 19](UPGRADE_19_2026-09-14.md). Item 2 received its first continuity pass in 0.22.0; broader human campaign coverage remains open. See [upgrade 20](UPGRADE_20_2026-09-14.md). Item 3 received its opening-flow implementation in 0.23.0; see [upgrade 21](UPGRADE_21_2026-09-14.md). Uncoached novice studies remain open. Item 4 received its battlefield orientation pass in 0.24.0; see [upgrade 22](UPGRADE_22_2026-09-14.md). Route safety visualization, command-explanation depth and player studies remain open. Item 5 received its first expanded balance pass in 0.25.0; see [upgrade 23](UPGRADE_23_2026-09-14.md). Its Manassas reference finding received a revised route, map guidance and successful manual playthrough in 0.26.0; see [upgrade 24](UPGRADE_24_2026-09-14.md). Shiloh current-rule attack guidance and staging positions followed in 0.27.0; a manual playthrough achieved the objective after clearing a blocked corps. See [upgrade 25](UPGRADE_25_2026-09-14.md). Item 6 received an initial measured pass in 0.28.0: paused update work fell from 1.20 ms to 0.10 ms p95 in the desktop sample; see [upgrade 26](UPGRADE_26_2026-09-14.md). The preload audit found 38–48 MB of assets per board. Lossless PNG repacking in 0.29.0 reduced that by 7.7–9.4%; all 41 images and a full in-game screenshot remained pixel-identical. See [upgrade 27](UPGRADE_27_2026-09-14.md). Texture reuse and startup processing are next, subject to no visual degradation. Bespoke competent-play coverage remains open. The rest of item 6 and items 7–12 remain queued in this order. The evidence and findings below preserve the original 0.20.0 audit.

## Ranked work list

### 1. Mid-battle save and resume

**Confirmed gap · highest priority.** The live exit warning explicitly says field progress is discarded (step 2); campaign autosave already exists. Interruptions therefore cost the player an encounter.

**Upgrade:** Create a versioned tactical checkpoint covering formations, orders, mission phase, casualties, reinforcements and deterministic random state. Resume paused; clearly distinguish campaign saves from field checkpoints.

**Acceptance:** Save during combat, reload, and compare the resumed result with an uninterrupted run. Cover reinforcements, withdrawal, completed-but-unreturned results, corrupt saves and old versions.

### 2. Complete campaign continuity and consequences

**Validation and design priority.** The campaign changes command roles across historical moments (step 4). Current source includes aftermath, supply planning and chronicles; their coherence across an entire human-played route remains unverified in this audit.

**Upgrade:** Play full Story and Standard routes through supply, tactical command, political crises and settlements. Make role handoffs explicit and carry visible losses, reserves and consequences forward.

**Acceptance:** Complete representative routes with manual battles, reloads and scarce supplies; no contradictory briefings, duplicated settlement or unexplained resource changes.

### 3. A clearer first five minutes

**Observed usability opportunity.** The opening spends much of the 720px screen on headers, status, resources and explanation before the scene. Training exists inside Quick battle (steps 3–4).

**Upgrade:** Bring Continue, New campaign, Learn command and Quick battle into a clear opening hierarchy. Compact repeat information and introduce supply and field commands progressively.

**Acceptance:** Observe new players reaching a first intentional order and explaining the objective without coaching; record time and confusion points.

### 4. Tactical clarity and battlefield orientation

**Observed design opportunity.** Shiloh has useful objectives and historical notes, but several competing text layers surround a limited battlefield (step 1). The campaign reference map explicitly has no game overlay (step 5).

**Upgrade:** Prioritize current objective, selected formation and immediate command feedback. Make routes, reserve areas and exits legible. Keep historical reference maps and schematic playable orientation clearly distinguished.

**Acceptance:** Players can locate the objective, exit and supporting unit, explain an unavailable command, and recover from a mistaken order on desktop and narrow layouts.

### 5. Broader battle and campaign balance

**Fresh test signal; not a confirmed balance defect.** All 12 fresh automated campaign runs terminated. Fox survived 3/3; Hotspur 2/3; Balanced 1/3; Wolf 0/3. Only three seeds per fixed policy were sampled, so these results do not establish fairness or a dominant human strategy.

**Upgrade:** Expand seeded tactical and strategic coverage, including no input, reasonable play, reckless play, retreat, late reserves and low supplies. Tune only demonstrated problems and distinguish Story from Standard intentionally.

**Acceptance:** Publish outcome distributions, failure causes and representative manual playthroughs. Ensure skillful adaptation matters, while objectives remain understandable.

### 6. Measured loading, memory and frame pacing

**Engineering validation priority.** The current unpruned dist occupies about 202 MB on disk; image and audio directories are about 151 MB and 44 MB. This is not a measurement of initial download, compressed transfer or the pruned itch package.

**Upgrade:** Measure cold loading and long battles on target devices. Profile asset decoding, texture memory, effect density and unnecessary rerenders; load scenes and audio when needed and apply measured asset budgets.

**Acceptance:** Record compressed startup bytes, time to interaction, peak memory and frame-time percentiles before and after on named devices. Check long battles for degradation.

### 7. Finish second landmarks and connected surroundings

**Highest remaining environment-art priority.** Current source and roadmap leave Shiloh, Wilderness, Third Winchester, Cold Harbor and alternate Gettysburg as the next research targets. Connected ground is already present around several first landmarks. Petersburg already has the Crater and siege surroundings.

**Upgrade:** Research a defensible second feature per remaining board, then connect farms, roads, fences, orchards, work areas and damaged ground into a coherent place. Confirm geographic fit before adding a structure; identify reconstructed and illustrative elements.

**Acceptance:** Each feature has a primary or authoritative source, a justified placement and period treatment, readable art at gameplay zoom, and verified collision and objective behavior.

### 8. People, crews and readable animation

**Art and animation opportunity.** The battlefield already has detailed unit pages for ready, walk, aim and crew states. Source describes limited-frame gait; the Shiloh view still shows conspicuously repeated formation blocks (step 1).

**Upgrade:** Improve officers, standard bearers, artillery handling, firing, recoil, rallying, exhaustion and withdrawal. Add controlled variation in pose and spacing. Review advisor portraits for consistency rather than replacing strong art wholesale.

**Acceptance:** Compare before and after at normal zoom and on a narrow viewport. Players can distinguish firing, moving, recovering and leaving without opening a panel; performance stays within budget.

### 9. Accessibility and physical-device controls

**Unverified release requirement.** The 390×844 campaign layout wraps without an obvious horizontal break in the captured region, but the decision remains below the visible content (step 6). Small secondary text and dense controls deserve testing.

**Upgrade:** Run keyboard-only play, visible-focus checks, 200% zoom, contrast measurements, reduced motion and screen-reader review of essential instructions and results. Verify touch selection, panning and orders on actual phones and tablets.

**Acceptance:** Complete the main flows with keyboard and physical touch; document measured contrast, focus order, accessible alternatives and remaining limitations. No compliance claim from screenshots.

### 10. Personalized endings and replay motivation

**Presentation-depth opportunity.** Current source already provides a campaign assessment, historical reflections and an exportable chronicle. The remaining opportunity is stronger synthesis and presentation of the player’s particular route.

**Upgrade:** Build an ending around saved turning points, command losses, supply condition, political consequences and historical divergence. Offer a clear replay hook tied to a different approach.

**Acceptance:** Distinct saved histories produce accurate, distinct epilogues and highlights. Reopened completed saves preserve the same account; interpretations are separated from historical facts.

### 11. Sound, atmosphere and historical editorial finish

**Review queue; not a finding of broken audio.** Music controls and substantial audio assets exist. This audit did not listen through the score, sound mix or every battle, or verify every historical claim.

**Upgrade:** Review command acknowledgement, battle ambience, gun distance, transition mixing and repetition. Perform an editorial sweep for dates, role changes, civilian context, alternate history and art provenance.

**Acceptance:** Listen through representative long sessions; verify volume and mute persistence, avoid clipping or fatiguing repetition, and resolve historical claims against cited sources.

### 12. Release-package and itch.io verification

**Final delivery gate.** This audit used the local installed preview. It did not test a newly packaged itch build or the live itch iframe.

**Upgrade:** Build a versioned pruned package, verify it from its extracted contents, and test first load, audio activation, resizing, fullscreen, storage and migration inside the actual delivery environment.

**Acceptance:** Archive artifact hash and validation results, confirm save compatibility and no missing assets, then obtain the appropriate publication instruction before replacing the live version.

## Fresh evidence and limits

- Inspected the current Shiloh command view and leave flow, Quick battle library, Fort Sumter opening, historical map and a 390×844 campaign viewport. All six saved captures were visually inspected. Screenshots below reflect their actual scroll position, not full-page captures.
- Ran `node scripts/benchmark-engine.mjs` with four built-in policies and seeds 1861, 1862 and 1863. All 12 runs ended; none hit the 80-decision cap or returned incomplete. Six ended in defeat. These are headless strategic-policy runs, not human tactical playtests. Survival is not itself a measure of historical or design quality.
- The current tab’s error-log query returned no entries. This is a limited observation, not a comprehensive runtime guarantee.
- Read current campaign assessment, tactical exit, unit animation and roadmap code; inspected current asset sizes. Source references: `src/components/CivilWarBattleEncounter.jsx`, `src/components/CampaignAssessmentPanel.jsx`, `src/components/CampaignReflection.jsx`, `src/components/BattlefieldMap.jsx`, `src/battle/detailedUnitVisual*`, `src/App.jsx`, and `docs/HIGHEST_VALUE_UPGRADE_SEQUENCE.md`.
- Not completed here: a full human campaign, all eleven boards and opening orders, physical-device testing, screen-reader/contrast certification, measured frame pacing/network loading, a complete listening pass, new historical research, or live itch verification. Broader findings are labeled opportunities or validation priorities accordingly.

[Fresh benchmark report](/Users/titansforge/Documents/Codex/2026-09-11/create-an-image-of-2/outputs/Civil-War-Audit-2026-09-14/campaign-benchmark.md) · [Raw benchmark results](/Users/titansforge/Documents/Codex/2026-09-11/create-an-image-of-2/outputs/Civil-War-Audit-2026-09-14/campaign-benchmark.json)

## Captured flow and visual notes

### Step 1 — Battlefield command

**Health: Functional; crowded.** The Shiloh church, connected ground, mission counters and command controls are present. Historical notes and stacked status information compete with the field. Repeated formations and small distant labels are candidates for polish. Accessibility risk: small secondary text and visually dense state reporting; contrast and keyboard behavior were not measured.

![Step 1: Battlefield command](/Users/titansforge/Documents/Codex/2026-09-11/create-an-image-of-2/outputs/Civil-War-Audit-2026-09-14/01-battlefield.png)

### Step 2 — Leave battle

**Health: Clear warning; major persistence gap.** The dialog clearly explains discarded progress and offers a safe return. The missing save-and-resume option is the confirmed product gap. Focus trapping and screen-reader announcement were not tested.

![Step 2: Leave battle](/Users/titansforge/Documents/Codex/2026-09-11/create-an-image-of-2/outputs/Civil-War-Audit-2026-09-14/02-leave-battle.png)

### Step 3 — Practice library

**Health: Useful; discovery can improve.** Training is prominent once Quick battle is opened. Eleven encounters and opening strategies are available. The start-battle action lies below the captured modal viewport; scrolling is available, so this is a hierarchy issue rather than a claim of an inaccessible action. Keyboard traversal remains untested.

![Step 3: Practice library](/Users/titansforge/Documents/Codex/2026-09-11/create-an-image-of-2/outputs/Civil-War-Audit-2026-09-14/03-practice-library.png)

### Step 4 — Campaign opening

**Health: Functional; too much introductory interface.** The page communicates save state, resources and command role. At 1280×720, stacked introductory material pushes much of the artwork, briefing and decisions below the visible area. Compact this hierarchy and promote a direct learn-command entry. Secondary text contrast needs measurement.

![Step 4: Campaign opening](/Users/titansforge/Documents/Codex/2026-09-11/create-an-image-of-2/outputs/Civil-War-Audit-2026-09-14/04-campaign-opening.png)

### Step 5 — Historical map

**Health: Clear provenance; limited tactical orientation.** The map is explicitly labeled historical reference with no game overlay, which avoids conflating archive and simulation. Its regional detail does not directly answer battlefield movement questions at this scale. Keep this map and add purpose-built playable orientation where useful. Small map labeling needs zoom/alternative-text review.

![Step 5: Historical map](/Users/titansforge/Documents/Codex/2026-09-11/create-an-image-of-2/outputs/Civil-War-Audit-2026-09-14/05-campaign-map.png)

### Step 6 — Phone-sized campaign

**Health: Responsive in inspected region; long reading path.** At 390×844, the inspected content wraps into one column without an obvious horizontal break. Status, explanation and map consume substantial vertical space before a decision. This capture starts at a retained scroll position; it is not a measurement of top-to-decision distance. Real touch interaction, zoom and assistive technology remain untested.

![Step 6: Phone-sized campaign](/Users/titansforge/Documents/Codex/2026-09-11/create-an-image-of-2/outputs/Civil-War-Audit-2026-09-14/06-phone-campaign.png)

