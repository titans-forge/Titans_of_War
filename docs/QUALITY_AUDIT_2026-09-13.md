# Titans of War: Civil War — Quality audit and upgrade backlog

**Audit date:** September 13, 2026. **Decision:** build on the existing game. The underlying systems and existing artwork are substantial; the highest-value work is to make the rules, campaign continuity and battlefield readable, then improve scene identity and release reliability. A 10/10 quality claim is not supported by one audit.

Upgrade 16 (0.18.0) adds Heater House and Catharine Furnace, plus connected approaches, fields and work yards around their existing companion landmarks. Rules 16 and envelope 20 preserve older maps. All 950 validation checks pass; the 264-case new-rules matrix has no geometry flags or outcome-category changes, and 264 legacy cases match exactly. See [second-landmark research and verification](UPGRADE_16_2026-09-14.md) for the measured casualty changes and architectural limits.

Upgrade 15 (0.17.0) replaces Petersburg sortie proxies with four native supply-yard and engineer-yard assets, visible workers, connected work tracks and persistent raid aftermath. Target View anchors remain fixed after proxy retreat. The live raid and return succeeded at 100/100 with no Confederate losses; 923 validation checks pass and all six policy records match 0.16.0. See [siege-site art details](UPGRADE_15_2026-09-14.md). Additional researched second landmarks remain open.

Upgrade 14 (0.16.0) fixes unavailable opening selection for the sortie, adds named target View controls and raid/return deadlines, and clarifies the covered Cold Harbor transfer. Both missions passed live playtests; six baseline/candidate policy records match and 916 validation checks pass. See [sortie and transfer details](UPGRADE_14_2026-09-13.md), including retained failed timing attempts. Next is connected battlefield art; broader difficulty and balance coverage remains open.

Upgrade 13 (0.15.0) clarifies Wilderness arriving-reserve orders and Winchester covering requirements, with selected briefs and visible command checkpoints. All three choices succeeded in live playtests; nine baseline/candidate policy records match exactly and 908 validation checks pass. See [withdrawal-command details](UPGRADE_13_2026-09-13.md). Specialized raid/transfer playtests remain next within mission depth.

Upgrade 12 (0.14.0) adds optional orderly-withdrawal goals across ten choices, with live progress and saved reports. Existing grades match 0.13.0 across all ten choices; 901 validation checks pass. See [withdrawal-goal build details](UPGRADE_12_2026-09-13.md). Wilderness and Winchester timing/rearguard playtests remain next within mission depth.

Upgrade 11 (0.13.0) aligns Chickamauga C/D preservation criteria, selected briefings and C staff estimates. New rules15 count organized on-field strength plus orderly withdrawals; old rules remain unchanged. Full validation890 test executions plus11 final targeted preservation checks pass. See [Chickamauga build details](UPGRADE_11_2026-09-13.md). Optional mastery and remaining playtests keep mission depth in progress.

Upgrade 10 (0.12.0) begins the ranked mission-depth phase with a measured Shiloh reserve mission: actual organized strength, a connected front, effective Breckinridge support and a visible limited Union advance. Rules 14 preserve earlier campaigns. Full validation passes 881 test executions; 264 legacy stress results match exactly. See [mission-depth build details](UPGRADE_10_2026-09-13.md). Chickamauga preservation and other mission-depth work remain ahead of the next art phase.

Upgrade 09 (0.11.0) adds visible save status and recovery actions, explains the battlefield save boundary, and retains detailed field reports in the journal. All 44 tactical choices pass save/reload round trips; a live Shiloh campaign handoff survives reload with identical report text. See [campaign continuity build details](UPGRADE_09_2026-09-13.md). Mid-battle resume, full later-branch playthroughs and remaining second landmarks are still open.

Upgrade 08 (0.10.0) adds the Stone House to First Manassas and Snodgrass House to Chickamauga, including illustrative connected farm surfaces and View controls in all landmark notes. Rules 13 preserve older saves; the final 264-case stress matrix has no flagged issues or outcome-category changes, and the 264-case legacy matrix matches 0.9.0 exactly. See [second-landmark build details](UPGRADE_08_2026-09-13.md) for art sources, rejected placement and measured casualty differences. Two battlefields now have two dedicated buildings. Full campaign continuity, additional second sites and physical-phone testing remain priorities.

Upgrade 07 (0.9.0) improves mobile field command with roster-to-unit camera focus, larger phone close-ups, labeled 44-pixel map controls, visible troop strength, nearest-body selection and explicit flag priority. Multi-contact gestures cancel safely; movement remains confirmed. See [mobile control details](UPGRADE_07_2026-09-13.md). Rules 12, saves, terrain and balance remain unchanged. Second landmarks, full campaign continuity and physical-phone validation remain priorities.

Upgrade 06 (0.8.0) improves Cold Harbor and Petersburg with generated ravine, earthwork and Crater terrain. It also corrects diagonal farm lanes and removes the road-speed bonus inside the Crater for new rules 12, preserving older saves. See [siege terrain details](UPGRADE_06_2026-09-13.md) for 814 passing tests, 528 final stress cases, exact rules-11 preservation and historical/art qualifications. CW-007 terrain identity has improved; mobile camera/selection, second landmarks and full campaign continuity playtests remain priorities.

Upgrade 05 (0.7.0) adds Widow Tapp House and its modeled clearing at the Wilderness, plus Garthright House at Cold Harbor. Together with Petersburg’s existing Crater, every playable battlefield now has a first historical landmark. Rules 11 also fix a building-corner routing stall. See [Wilderness and Cold Harbor details](UPGRADE_05_2026-09-13.md) for 802 passing tests, 528 stress cases, exact legacy preservation and art/source qualifications. CW-007 remains partial: second sites, connected terrain and mobile readability still need work.

Upgrade 04 (0.6.0) adds Leister House to July 3 Gettysburg and Evergreen Gatehouse to the alternate Jackson battle, bringing dedicated physical landmark buildings to eight scenarios. Gettysburg's separate tactical system now enforces building movement, fire and melee obstruction, and its terrain plate no longer contains generic painted houses. See [Gettysburg landmark details](UPGRADE_04_2026-09-13.md) for the 774-test validation, preserved rules-9 results, tactical outcome changes and visual checks. Wilderness and Cold Harbor still need their first building; Petersburg needs further context around its existing Crater. CW-007 and mobile camera/readability remain partial.

Upgrade 03 (0.5.0) adds Shiloh Church, Chancellor House and Brotherton Cabin. Generated art, historical qualifications, 24 infantry/artillery route cases, mobile inspection and preserved rules-8 results are recorded in [the second landmark batch](UPGRADE_03_2026-09-13.md).

Upgrade 02 (0.4.0) adds Henry House, Hackwood and Belle Grove with tested movement and fire obstruction, generated art, source notes and preserved older rules. See [landmark upgrade details](UPGRADE_02_2026-09-13.md).

## Implementation progress — September 13, 2026

Upgrade 01 (0.3.2) fixes the misleading defensive debrief, adds live Henry Hill evidence and new Manassas terrain, cleans up the named campaign labels, and explains the shared resource ledger. See [upgrade details](UPGRADE_01_2026-09-13.md). CW-001/CW-002/CW-003/CW-007 remain partial; the ranked list below preserves the original audit.

## Start here

Take CW-001 and CW-004 first: correct misleading mission feedback and remove implementation language from player-facing text. Next combine CW-002/CW-005 for campaign orientation, then CW-003 for battlefield layout. Begin the art pass with CW-007/CW-008 after layouts and terrain semantics are settled. Do not start by replacing all existing soldier art.

## What was actually checked

- Played the published itch.io build: https://titans-forge.itch.io/titans-of-war-civil-war. Game frame: upload 19172862. No live edits or publication were made.
- Source: `/Users/titansforge/Vault/Titans_of_War`, package 0.3.1, Git HEAD `fb0a122c884db410b86f0bfb7e1ea1b209ddc4de` plus pre-existing tracked and untracked changes. These changes were preserved.
- The live entry JS/CSS filenames matched the newly built source output. This is useful release-identity evidence, not a byte-for-byte comparison of every remotely hosted asset.
- Normal early campaign: Sumter B, Union mobilization B, next naval technology scenario; inspected the map. Completed training exercises 1 and 2. Completed Manassas defense (defeat, 19% Confederate losses) and Gettysburg option B withdrawal (100% escaped, 0% losses).
- Desktop 1280×720 and 1280×800; phone viewport 390×844. These are browser viewport checks, not physical-phone testing.
- Loaded auto-save; rejected an invalid JSON save without losing the campaign; inspected music start/track selection/pause; verified Journal Tab/Escape and focus return.
- Used the built-in settlement demo for Cedar Creek delegated command and the McClellan conditional-reunion ending. Returned to the untouched turn-3 campaign. This was a curated demo, not a fresh manual campaign completion.
- `npm run validate` passed: 694 node:test executions across suites, zero failures, plus smoke/content/asset/agent-contribution validators. Some scripts repeat; this is not a count of unique tests. Content validator checked 44 scenarios.
- Production build passed in a separate audit output directory. Existing installed dist and release ZIP were not rebuilt or replaced. Large-chunk warnings remain.
- Existing battle integrity matrix: 264 completed cases (11 battles × 4 choices × 3 doctrines × 2 readiness levels), no flagged exceptions/nonfinite values/invalid results under those checks.
- Existing command-policy comparison: 14 runs; supported plans achieved objectives in 5 of 7 battle/doctrine cases versus 0 of 7 simple advances. These are fixed scripted policies, not human win rates.
- Campaign benchmark: four heuristic policies × three seeds, all 12 terminal and none capped. It does not replace integrated supply/tactical human campaign testing.

## Keep these strengths

- Explicit preview and confirmation for movement; paused planning; formation roster, group orders and support mechanics.
- Scene art, real animation atlases, historically labeled artwork, period flags, Gettysburg roads/fences/terrain, and opt-in sound.
- Resource forecasts that matched the observed Sumter resolution; readable before/after deltas.
- Historical-source reflections distinguish game assumptions from evidence, including counterfactual elections and settlements.
- Practice and settlement demo protect the campaign; save validation and Journal focus behavior worked.
- Eleven field battles and an extensive deterministic test base. Improvements should preserve these investments.

## Quality bar by area

| Area | Current evidence | What is needed before calling it excellent |
|---|---|---|
| Gameplay and tactics | Real consequences and distinct missions; one easy perfect retreat | Clear mission telemetry, comparable replays, several viable plans and human testing |
| Campaign design | Branches and persistent resource pressure work | Explicit role/ledger continuity and meaningful long-run divergence |
| Onboarding | Useful training is available but secondary | A clear starting choice and a measured first-ten-minutes experience |
| Visuals and people | Strong scene art; Gettysburg ahead of Manassas; rigid units at fit zoom | Battle identity, readable formations, coherent portraits and terrain |
| UX and mobile | Main controls function; crowded screen | More battlefield space and clear action/error/result hierarchy |
| Saves and reliability | Recovery and invalid-save rejection passed | Discoverable save status, export/reimport, denied-storage and active-battle resume |
| Performance | Build works, sizeable JS and broad atlas preload | Actual mobile/desktop frame pacing, memory and loading budgets |
| Sound | Controls and track selection work; lifecycle tests pass | Auditory mix and full-session device tests |
| Historical value | Good disclosures/reflections | Full independent historical/editorial check and readable operational maps |
| Accessibility | Labeled controls, focus return and reduced-motion code | Keyboard-only full mission, VoiceOver, contrast and zoom verification |
| Release quality | Live/source entry names agree; old local ZIP differs | Versioned deterministic artifacts and visible hosted version |

## Ranked work list

P1 means fix early because it affects understanding or core play. P2 means substantial next-pass quality work. P3 follows the core fixes. None of the current findings establishes a release-blocking P0 crash or data-loss defect. Effort is a planning estimate, not a delivery promise.

| Rank | ID | Priority | Upgrade | Evidence type | Effort |
|---|---|---|---|---|---|
| 1 | CW-001 | P1 | Make every mission explain its actual success and failure conditions | Confirmed defect + usability gap | Small–medium |
| 2 | CW-002 | P1 | Explain campaign identity and what the shared resources represent | Observed design problem | Medium–large |
| 3 | CW-003 | P1 | Give the battlefield more room and simplify the command layout | Observed usability problem | Medium |
| 4 | CW-004 | P1 | Remove development terminology from the player experience | Confirmed copy problem | Small–medium |
| 5 | CW-005 | P1 | Make the first ten minutes a clear choice between campaign and field command | Observed onboarding opportunity | Medium |
| 6 | CW-006 | P1 | Give low-pressure missions meaningful choices and replay goals | Observed challenge/replay opportunity | Medium–large |
| 7 | CW-007 | P1 | Upgrade battlefield identity before adding more scenery volume | Observed art + readability opportunity | Medium–large |
| 8 | CW-008 | P1 | Replace faint abstract campaign schematics with useful operational maps | Observed map quality problem | Medium |
| 9 | CW-009 | P2 | Improve people and formation readability without sacrificing function | Observed art opportunity | Medium–large |
| 10 | CW-010 | P2 | Create a versioned, reproducible release with exact artifact identity | Source-confirmed release risk | Small–medium |
| 11 | CW-011 | P2 | Measure full campaign play with supply and tactical decisions included | Validation gap + balance signal | Medium |
| 12 | CW-012 | P2 | Make saves and recovery a first-class destination | Observed usability opportunity | Medium |
| 13 | CW-013 | P2 | Support recovery of an unfinished field battle | Source-confirmed feature gap | Large |
| 14 | CW-014 | P2 | Make endings tell the story of this run | Observed presentation opportunity | Medium |
| 15 | CW-015 | P2 | Make demo history consistent with current rules or explicitly archival | Source-confirmed inconsistency | Small–medium |
| 16 | CW-016 | P2 | Reduce startup and field asset work, then benchmark frame pacing | Measured build issue + performance gap | Medium |
| 17 | CW-017 | P2 | Complete keyboard, screen-reader and motion verification | Accessibility risk + verification gap | Medium |
| 18 | CW-018 | P2 | Give advisor identity the same care as the battlefield | Observed presentation opportunity | Medium |
| 19 | CW-019 | P2 | Review every remaining battle and major branch with a human playthrough | Coverage gap | Medium–large |
| 20 | CW-020 | P3 | Polish sound feedback and mix continuity | Audio quality verification gap | Small–medium |
| 21 | CW-021 | P3 | Finish the historical and counterfactual editorial pass | Editorial and historical verification gap | Medium |
| 22 | CW-022 | P3 | Split the application along stable responsibilities and consolidate regression gates | Maintainability risk | Medium–large |
| 23 | CW-023 | P3 | Refresh the store presentation after the first quality pass | Observed distribution opportunity | Small |

## Implementation briefs

### 1. CW-001 — Make every mission explain its actual success and failure conditions

**P1 · Confirmed defect + usability gap · Small–medium effort · Open**

Players cannot learn reliably from the wrong debrief. The live Manassas defeat advice refers to ridge hold time and assault formations, although the selected mission was defensive.

**Evidence:** Live Manassas option B: screenshots 05–07; manassas-debrief-dom.txt. src/battle/gettysburgCommandBrief.js:76, src/components/CivilWarBattleEncounter.jsx:394, src/battle/fieldBattleMechanics.js:131.

**Upgrade:** Replace reused Gettysburg prose with battle/mission-specific evidence. Keep a compact live checklist visible: organized defenders, support, contesting enemies, deadline and relevant hold/escape progress. Show the unmet condition first in the result.

**Acceptance:** Reproduce Manassas defense failure and success. Both report the actual hill/support/contest/fire conditions. Each of the 44 battle/choice combinations has truthful mission-specific evidence; preserve current outcome calculations unless separately rebalanced.

### 2. CW-002 — Explain campaign identity and what the shared resources represent

**P1 · Observed design problem · Medium–large effort · Open**

The player moves from Anderson to Lincoln to Confederate Navy Secretary Mallory while Army, Food, Treasury and Morale carry straight through. It is hard to understand whose success is being pursued.

**Evidence:** Normal live path: Sumter B → Union mobilization B → naval technology. Resources after Lincoln: Army 90, Ammunition 74, Treasury 71, Food 74, Morale 94; unchanged upon Confederate role transition. src/App.jsx:1327; src/game/headlessCampaign.js; src/game/scenarios.js.

**Upgrade:** Establish an explicit historical decision-anthology framing and a visible role handoff. Explain persistent campaign pressure versus resources of the current command. If faction-specific continuity is intended, design separate ledgers and a save migration rather than silently relabeling one ledger.

**Acceptance:** A new player can identify commander, side, objective, date and ledger meaning at every transition without opening documentation. All cross-side transitions have explicit explanations and tests.

### 3. CW-003 — Give the battlefield more room and simplify the command layout

**P1 · Observed usability problem · Medium effort · Open**

The mobile interface functions, but a 390×844 screen displays only about 208 vertical pixels of actual terrain in the captured overview. Dense controls and letterboxing consume most of the view. Desktop briefing text competes with unit state in a 245px sidebar.

**Evidence:** Screenshots 05, 08, 09. Mobile canvas measured 390×340; document width and scrollWidth both 390. src/battle/battleUsability.css; src/components/CivilWarBattleEncounter.jsx.

**Upgrade:** Keep mission, pause, selected unit and essential orders visible. Collapse secondary controls; use a temporary formation sheet. Improve fit/focus defaults and offer a clearly explained landscape view. Preserve zoom and roster alternatives.

**Acceptance:** At 390×844, 844×390, 1280×720 and 1920×1080 the selected force, its target and mission progress are legible. No clipped actions or horizontal overflow. Touch selection and pan cannot accidentally confirm orders. Validate real touch hardware separately.

### 4. CW-004 — Remove development terminology from the player experience

**P1 · Confirmed copy problem · Small–medium effort · Open**

The campaign desk exposes Senate Shards, Core Telemetry Indicators, AI Portals Console and State Vector; Sumter choices discuss the new game model. The ending refers to the non-AI campaign. This disrupts the historical experience and obscures ordinary actions.

**Evidence:** Live campaign desk and screenshots 02, 03, 11, 12. src/App.jsx:1349, src/App.jsx:2306; src/game/campaignSupply.js:12–13; src/game/scenarios.js.

**Upgrade:** Use Cabinet, Supplies, Campaign saves, Rules and Optional local tools. Put version compatibility and scoring assumptions in concise expandable notes. Keep historical/counterfactual disclosures intact. Standardize Army/Ammunition labels between forecast, costs and results.

**Acceptance:** Main player flows contain no unexplained internal jargon, legacy implementation language or raw identifiers. Compatibility details remain available in Rules and save recovery. Human read-through of all 44 scenarios, errors and endings passes.

### 5. CW-005 — Make the first ten minutes a clear choice between campaign and field command

**P1 · Observed onboarding opportunity · Medium effort · Open**

The game opens directly into a long decision screen. Its strongest active gameplay and six exercises are behind Quick battle. Choosing the historical Sumter evacuation route led through politics and naval technology rather than an early field battle.

**Evidence:** Screenshots 01–04; live Quick battle offers eleven battles and six exercises. Sumter B route observed, not inferred.

**Upgrade:** Add a restrained entry flow: Continue, Start campaign, Learn command, Quick battle. Explain the anthology, the optional tactical layer and likely session length. Surface training at first field handoff. Preserve existing saves and immediate experienced-player access.

**Acceptance:** Five first-time players can start their chosen mode, give one intentional order and explain the current objective within ten minutes. Training is optional and never replaces the campaign save.

### 6. CW-006 — Give low-pressure missions meaningful choices and replay goals

**P1 · Observed challenge/replay opportunity · Medium–large effort · Open**

Gettysburg option B was completed by issuing Withdraw to all five formations while paused, then running at 4×. All forces escaped with zero losses and 100/100. This is a valid mission result, but provided little tactical decision-making in this run.

**Evidence:** Live mobile withdrawal: screenshots 09–10. Manassas human defense lost; supported scripted attacks succeeded in 5/7 battle/doctrine comparisons. command-policy-audit.json.

**Upgrade:** Keep orderly withdrawal as a legitimate success. Add carefully authored pressure, screening, routes or optional objectives where appropriate; distinguish introductory missions from expert challenges. Add a one-click replay of the same setup and a comparable previous-attempt summary.

**Acceptance:** At least two viable, meaningfully different plans per featured battle are demonstrated. Retreat is not falsely punished. Novice and advanced challenge goals are labeled. Compare identical readiness/rules/seeds; do not tune from a single human result.

### 7. CW-007 — Upgrade battlefield identity before adding more scenery volume

**P1 · Observed art + readability opportunity · Medium–large effort · Open**

Manassas reads largely as open grass and generic ridges. Gettysburg has a much stronger road, fence, ridge and settlement composition. Battle identity and useful cover should be recognizable without relying only on small labels.

**Evidence:** Screenshots 05–09. src/battle/fieldBattleProfiles.js; src/battle/CivilWarBattlefield.jsx:100; src/battle/fieldTerrainVisual.js.

**Upgrade:** Prioritize Manassas landmark composition, then inspect Shiloh, Chancellorsville, Cedar Creek and Petersburg individually. Use image generation for historically grounded terrain/landmark assets, with roads, cover and traversable ground aligned to actual engine zones. Preserve interpretive-map labels.

**Acceptance:** At normal zoom players can identify the mission landmark, useful cover, approaches and retreat direction. Artwork never implies impassable cover or a route the simulation does not support. Test native resolution, both side colors and mobile scale.

### 8. CW-008 — Replace faint abstract campaign schematics with useful operational maps

**P1 · Observed map quality problem · Medium effort · Open**

The naval Map view is a sparse dark schematic with tiny, low-contrast labels and little geographic or logistical context. It does not approach the visual quality of the scene art.

**Evidence:** Screenshot 13; src/components/BattlefieldMap.jsx and src/game/mapAnnotations.js. The app accurately labels it illustrative and not geographically verified.

**Upgrade:** Build readable coastal/theater maps with land/water, relevant ports, blockade/supply routes, a legend and the selected decision overlay. Use sourced geography when claiming geography; otherwise retain explicit schematic framing.

**Acceptance:** Each map answers where, what is threatened, and how the choices differ. Labels remain legible at the deployed size; do not bake essential labels into generated images. Check geography independently before making historical-map claims.

### 9. CW-009 — Improve people and formation readability without sacrificing function

**P2 · Observed art opportunity · Medium–large effort · Open**

Existing animated soldiers and flags are a good base. At fitted scale formations still read as repeated, rigid blocks, and individual condition is easier to read in the roster than on the field.

**Evidence:** Screenshots 04–10; src/battle/detailedUnitVisual.js, realisticUnitVisual.js, formationVisualState.js, CivilWarBattlefield.jsx:322–457.

**Upgrade:** Refine officer, drummer, flag bearer and gun-crew silhouettes; add restrained uniform and posture variation. Improve moving, firing, reloading, exhausted and routing reads. Give selected units a clear outline and persistent short label. Preserve directional atlases and simulation-linked casualty counts.

**Acceptance:** Blind screenshot tests distinguish side, unit type, selected formation and major condition at normal zoom. Art variations never change hitboxes or combat. No sliding feet, flipped insignia, oversized flags or detached crews in an animation review.

### 10. CW-010 — Create a versioned, reproducible release with exact artifact identity

**P2 · Source-confirmed release risk · Small–medium effort · Open**

The repository package says 0.3.1, the live bundle matches the fresh source build by filename, but the root titans-of-war-itch.zip contains older JS/CSS. A future upload can easily publish the wrong file.

**Evidence:** Live and rebuilt entry: index-CUhsmc1U.js / index-BeB9NOqZ.css. Existing root ZIP: index-CP0sUtsC.js / index-CimuJhdw.css, 97,840,210 bytes. package.json build:itch uses an unversioned ZIP and has no per-file release manifest.

**Upgrade:** Adopt the verified versioned-archive, checksum, per-file manifest and rollback workflow used for Rise of Rome. Separate source artwork, tested dist and release output. Add a visible version in About and reject stale artifacts.

**Acceptance:** Two release runs from identical bytes produce identical archives. Every ZIP entry matches the tested distribution. Hosted version and entry hashes are recorded after publishing. Never rebuild between validation and upload.

### 11. CW-011 — Measure full campaign play with supply and tactical decisions included

**P2 · Validation gap + balance signal · Medium effort · Open**

The headless benchmark exposes distinct endings and failures, but it does not exercise the same manual tactical play and supply choices as a human. Five of twelve heuristic runs reached 100% divergence; the others ranged from 59% to 90%, limiting the meter’s discrimination.

**Evidence:** campaign-benchmark.json/log: 12 runs, all terminal, no decision caps; fox survives 3/3, wolf loses 3/3. scripts/benchmark-engine.mjs:350–371, src/game/headlessCampaign.js, simulationEngine.js:269.

**Upgrade:** Add reproducible reference policies that choose supply allocations and resolve tactical/delegated battles explicitly. Track resource trajectory, arrears, branch access, turning points and recoverability. Review divergence scaling with a history-following policy before changing it.

**Acceptance:** At least three complete viable paths and deliberate neglect controls are reproduced from fresh saves. Neither survival percentages nor heuristic scores are presented as player win rates. Preserve failed runs and their exact settings.

### 12. CW-012 — Make saves and recovery a first-class destination

**P2 · Observed usability opportunity · Medium effort · Open**

Invalid saves are rejected and the campaign is preserved, but save controls and status are buried in Campaign desk alongside experimental tools. Manual loading immediately returns to an auto-saved status.

**Evidence:** Screenshot 11; live invalid JSON rejected with supported-format message; LOAD AUTO-SAVE returned turn 3 correctly. src/App.jsx:463–466, 770, 882–931, 2285–2311.

**Upgrade:** Add a clear Saves panel with Continue, recent checkpoints, export/import preview, timestamp and scenario. Keep a visible save-failure indicator and separate load confirmation from subsequent autosave. Preserve existing protected recovery and validation.

**Acceptance:** Export/import round trips preserve state; invalid, oversized, corrupt, future-version and interrupted imports preserve the current campaign. Reload, storage denial and quota failure have clear UI. Verify the flow in an itch.io iframe and after a real release update.

### 13. CW-013 — Support recovery of an unfinished field battle

**P2 · Source-confirmed feature gap · Large effort · Open**

Campaign saves preserve strategic state and completed battle results; the current field engine lives in the encounter component. Leaving or reloading a battle does not provide a resume snapshot of all tactical orders and positions.

**Evidence:** src/components/CivilWarBattleEncounter.jsx:170–172 installs beforeunload warning; src/battle/CivilWarBattlefield.jsx; src/game/campaignStorage.js validates completed battle records. Active-battle reload was not forced in this audit.

**Upgrade:** Design a versioned tactical checkpoint with time, orders, positions, ammo, arrivals, objective state and random/AI state. Restore paused. Start with explicit suspend/resume before adding frequent autosave.

**Acceptance:** A save taken mid-fight resumes deterministically with no duplicate reinforcements, damage, objective rewards or campaign resolution. Unsupported old tactical snapshots retain a safe strategic recovery path.

### 14. CW-014 — Make endings tell the story of this run

**P2 · Observed presentation opportunity · Medium effort · Open**

The ending has strong artwork and an outcome assessment, but the first screen spends considerable space on a generic Campaign Report heading and monospaced conclusion. The long chronicle and score mechanics dominate the rest.

**Evidence:** Screenshot 12 and ending-dom.txt. Viewed using the clearly marked settlement demo, not a fresh full manual campaign. src/components/CampaignAssessmentPanel.jsx; src/App.jsx ending section.

**Upgrade:** Lead with the named ending, three decisive choices and concrete military/political/supply consequences. Add a short comparative history timeline and a compact replay invitation. Preserve uncertainties about counterfactual settlements.

**Acceptance:** Different endings visibly differ in narrative and art. Every personalized claim is derived from saved history. Demo results and exports remain conspicuously labeled; no scripted demo is described as an earned playthrough.

### 15. CW-015 — Make demo history consistent with current rules or explicitly archival

**P2 · Source-confirmed inconsistency · Small–medium effort · Open**

The ending demo’s seeded Sumter entry still describes a morale penalty, whereas the fresh campaign correctly reports +8 morale for evacuation. Its preloaded history and metrics are authored rather than replayed.

**Evidence:** ending-dom.txt decision 1; src/App.jsx:70–124 and 943–966; screenshot 03/current campaignSupply.js. Demo banner and return protection work.

**Upgrade:** Generate demo history from an actual legal reference run, or label its setup as an illustrative archive with a fixed rules version. Do not reuse it as balance evidence or a benchmark.

**Acceptance:** Demo history, resource transitions and rules metadata agree. Exported demo results cannot be confused with a new manual campaign. Return to original campaign still restores exact resources, history and mode.

### 16. CW-016 — Reduce startup and field asset work, then benchmark frame pacing

**P2 · Measured build issue + performance gap · Medium effort · Open**

Fresh production output has a 1.04 MB entry JS chunk and a 1.36 MB battle chunk before gzip. Battle preload loads several generations of unit art plus all detailed pages. No hardware frame-time budget is recorded in this audit.

**Evidence:** build.log: entry 1,035.58 kB (303.48 kB gzip), battleUsability 1,355.60 kB (366.34 kB gzip). CivilWarBattlefield.jsx:114–135.

**Upgrade:** Move optional historical/developer/export tools off the startup path. Inventory actual rendering fallbacks before removing old atlas loads. Measure startup, peak memory, 95th/99th percentile frame time and repeated battle-open/close behavior on desktop and midrange mobile.

**Acceptance:** No missing assets after pruning. Same deterministic outcomes. Demonstrate improvement on measured devices; target smooth 60fps desktop and an explicit supported mobile floor, with no claim based only on build size.

### 17. CW-017 — Complete keyboard, screen-reader and motion verification

**P2 · Accessibility risk + verification gap · Medium effort · Open**

Many controls have labels, mobile buttons are usable, and Journal Tab/Escape focus behavior passed. Tactical spatial information is primarily a canvas and the mobile overview makes small units difficult to identify.

**Evidence:** Screenshots 05, 09, 13; Journal focus test returned to Journal after Escape. src/components/useDialogFocus.js; CivilWarBattlefield.jsx:87; index.css reduced-motion rules.

**Upgrade:** Provide a text roster with distances, threats, objective eligibility and order status; announce critical changes without flooding a screen reader. Verify contrast, keyboard-only ordering, zoom, reduced motion and non-color status cues.

**Acceptance:** Finish a selected mission with keyboard alone, and test VoiceOver with an actual user or trained tester. Verify 200% text zoom and touch targets. Do not claim WCAG compliance from these screenshots or source checks.

### 18. CW-018 — Give advisor identity the same care as the battlefield

**P2 · Observed presentation opportunity · Medium effort · Open**

Hotspur/fox/wolf labels and generic political shard names feel like a separate abstract system. They do not visually explain who is speaking in each historical command role.

**Evidence:** Screenshots 02, 11; live campaign desk and option proposer labels; src/game/advisorDebate.js and historicalPrimers.js.

**Upgrade:** Use role-appropriate portraits, names and short positions where historical individuals are intended. Clearly label fictional composite advisors. Generate portrait art only after subject, era, uniform and display slot are defined. Keep practical resource disagreement visible.

**Acceptance:** The player can distinguish historical person, fictional composite and game role. Advisor art and names remain consistent across scenes and never imply a fabricated historical quotation.

### 19. CW-019 — Review every remaining battle and major branch with a human playthrough

**P2 · Coverage gap · Medium–large effort · Open**

Automated battle checks passed, but they cannot establish fun, clarity, historical fidelity or visual polish. Only Manassas defense and Gettysburg withdrawal were completed manually.

**Evidence:** battle-matrix.json: 264 complete fixed-order scenarios, no flagged integrity failures. command-policy-audit.json: 14 runs. Live scope in PLAYTEST.md.

**Upgrade:** Play the other nine quick battles, alternate Jackson Gettysburg, all six lessons, supply failure/recovery and three fresh full campaigns. Include a novice cohort and a tactics-experienced cohort. Log confusion, restarts and mission failures.

**Acceptance:** Maintain a coverage matrix per battle/mission and supported viewport. No uncaptured scenario receives a clean visual verdict. Record session duration and successful independent objective explanations, not only wins.

### 20. CW-020 — Polish sound feedback and mix continuity

**P3 · Audio quality verification gap · Small–medium effort · Open**

Music starts and displays a credited historical track, then pauses correctly. Battle sound is optional and event-based. This run did not assess the mix by listening or complete an audible long-session test.

**Evidence:** Live music selected The Bonnie Blue Flag and restored Off. StrategyAudioManager.js, InstrumentalPlayer.js, BattleAudioManager.js; audio lifecycle tests pass.

**Upgrade:** Conduct a listening pass for levels, transitions, looping and rapid-speed battles. Make command receipt, blocked fire, rally and routing distinct without overwhelming the soundtrack. Put music and effects controls together.

**Acceptance:** No clipping, overlapping orphaned tracks or stuck playback after repeated battle/dialog transitions. Persist user settings; respect autoplay and reduced sensory load. Verify with headphones and mobile speakers.

### 21. CW-021 — Finish the historical and counterfactual editorial pass

**P3 · Editorial and historical verification gap · Medium effort · Open**

The game already separates sourced history, modeled effects and counterfactual outcomes in several excellent reflection panels. Some scenario prose still gives away consequences or switches into an omniscient retrospective voice.

**Evidence:** Live Cedar Creek option B says the historical pause becomes defeat; ending and reflection panels distinguish actual election from counterfactual. src/game/scenarios.js, learningReflections.js, historicalPrimers.js.

**Upgrade:** Review choices from what the commander could know at the time. Retain history lessons in debriefs. Independently verify quotations, dates, unit identities, geography, civilian consequences and media captions using primary/authoritative sources.

**Acceptance:** A documented historian/editor review covers every scenario and major ending. No invented period quote is presented as authentic. Slavery, emancipation and civilian agency are represented accurately and are not reduced to a flattering faction victory narrative.

### 22. CW-022 — Split the application along stable responsibilities and consolidate regression gates

**P3 · Maintainability risk · Medium–large effort · Open**

The App is 2,448 lines and the battle engine 1,600 lines. There is extensive test coverage, but several suites repeat scripts and many tests check source strings rather than a browser flow.

**Evidence:** src/App.jsx; src/battle/civilWarEngine.js; package.json. Validation recorded 694 node:test executions across suites, not 694 unique tests, plus custom validators.

**Upgrade:** Extract saves, audio, campaign orchestration, outcome/report and optional local tools in small behavior-preserving passes. Establish unique test inventory, browser regressions and a single release gate.

**Acceptance:** No broad rewrite. Each extraction preserves replay fixtures and public behavior. Regression tests cover actual critical flows rather than only matching implementation text.

### 23. CW-023 — Refresh the store presentation after the first quality pass

**P3 · Observed distribution opportunity · Small effort · Open**

The live page explains the campaign but does not foreground its eleven playable field battles or six command lessons. Current wording spends space comparing the game to a college paper.

**Evidence:** Published itch.io page captured in this audit; opening controls show richer features than the description.

**Upgrade:** After upgrades are verified, create a short gameplay-first trailer, representative screenshots and clear campaign/quick-battle instructions. Use current gameplay captures and accurately label alternate history and generated scenes.

**Acceptance:** Store claims match the released build. Screenshots cover campaign, battle, training and outcome; phone support is described according to actual tested limits. Publishing remains a separate action.

## Suggested improvement passes

1. **Truth and clarity:** CW-001, CW-004 and the small release-identity fix CW-010. Confirm the exact mission signals before changing any balance.
2. **Player orientation and controls:** CW-002, CW-003, CW-005 and CW-012. Test with unfamiliar players before expanding content.
3. **Art tied to play:** CW-007, CW-008, CW-009 and CW-018. Generate to measured slots; integrate, inspect at actual play scale, then verify assets and frame cost.
4. **Campaign depth and replay:** CW-006, CW-011, CW-013, CW-014 and CW-015. Preserve old saves and compare recorded outcomes.
5. **Finish and release:** CW-016–CW-023 as applicable, supported-device tests, full campaigns, historian/editor review, then one reproducible release.

## Art-production brief

Use the new image model where it can improve a real play surface, not as decoration for this audit. First capture each target slot and existing visual style. Request terrain/landmark layers without labels or UI baked in; add live labels in the renderer. For people, maintain a reference sheet for era, rank, uniform, weapon, equipment, side and camera direction. Preserve active source masters and validate atlas dimensions/anchors and alpha edges. Every new landmark must match engine cover and movement zones. Do not assume a good isolated image is a good sprite at 390px viewport width.

Art priority: (1) Manassas battlefield identity, (2) operational campaign maps, (3) readability/variation of existing infantry and gun crews, (4) role-consistent officer/advisor portraits, (5) remaining battle backdrops after capture, (6) ending images tied to actual outcomes. No new assets were generated during this audit.

## Evidence and limits

[Screenshot playtest report](/Users/titansforge/Documents/Codex/2026-09-11/create-an-image-of-2/outputs/Civil-War-Audit-2026-09-13/PLAYTEST.md) · [Sortable backlog CSV](/Users/titansforge/Documents/Codex/2026-09-11/create-an-image-of-2/outputs/Civil-War-Audit-2026-09-13/BACKLOG.csv) · [Structured backlog JSON](/Users/titansforge/Documents/Codex/2026-09-11/create-an-image-of-2/outputs/Civil-War-Audit-2026-09-13/BACKLOG.json)

[Validation log](/Users/titansforge/Documents/Codex/2026-09-11/create-an-image-of-2/outputs/Civil-War-Audit-2026-09-13/evidence/validation.log) · [Build log](/Users/titansforge/Documents/Codex/2026-09-11/create-an-image-of-2/outputs/Civil-War-Audit-2026-09-13/evidence/build.log) · [264-case battle matrix](/Users/titansforge/Documents/Codex/2026-09-11/create-an-image-of-2/outputs/Civil-War-Audit-2026-09-13/evidence/battle-matrix.json) · [Command comparison](/Users/titansforge/Documents/Codex/2026-09-11/create-an-image-of-2/outputs/Civil-War-Audit-2026-09-13/evidence/command-policy-audit.json) · [Campaign benchmark](/Users/titansforge/Documents/Codex/2026-09-11/create-an-image-of-2/outputs/Civil-War-Audit-2026-09-13/evidence/campaign-benchmark.json)

The audit did not manually finish all eleven battles, all six lessons, all 44 scenarios, three complete fresh campaigns, or every ending. It did not verify browser export/reimport round trips, offline cold launch, another browser engine, physical mobile input, screen-reader completion, calibrated sound quality, frame-time percentiles or historical facts exhaustively. The optional local-AI feature was not activated. Scores in the game are game rubrics, not proof of learning, balance or product quality.

Only audit documents and evidence were added. No game code, art, installed distribution, existing saves outside the audit browser, remote project settings or releases were changed.
