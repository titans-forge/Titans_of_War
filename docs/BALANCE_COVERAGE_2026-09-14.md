# Civil War balance coverage — September 14, 2026

Release 0.25.0 candidate; battle rules 17. Fixed-policy evidence, not human win rates or a balance certification.

## Tactical matrix

564 completed cases, zero nonterminal or invalid-state/score cases: all 44 missions under no orders, all-assault, immediate withdrawal and withdrawal after 55% of the deadline, at full/limited/depleted ammunition (528 cases). Another 36 cases exercise a fixed Manassas flank reference across three enemy doctrines, two commitment times and those three ammunition conditions. Starting campaign metrics are otherwise unchanged. Ammunition stocks also contribute to the engine's existing starting-strength calculation. Main matrix uses reserve doctrine; other doctrine comparisons are confined to Manassas attacks.

| Ammunition | Policy | Cases | Mission achieved | Mean Confederate loss |
|---|---|---:|---:|---:|
| full | no-orders | 44 | 8 | 7.1% |
| full | all-assault | 44 | 10 | 10.2% |
| full | immediate-withdrawal | 44 | 10 | 0.0% |
| full | late-withdrawal | 44 | 15 | 3.9% |
| full | supported-flank | 12 | 0 | 13.4% |
| limited | no-orders | 44 | 8 | 7.3% |
| limited | all-assault | 44 | 10 | 10.4% |
| limited | immediate-withdrawal | 44 | 10 | 0.0% |
| limited | late-withdrawal | 44 | 15 | 4.0% |
| limited | supported-flank | 12 | 0 | 14.4% |
| depleted | no-orders | 44 | 8 | 8.0% |
| depleted | all-assault | 44 | 8 | 11.2% |
| depleted | immediate-withdrawal | 44 | 10 | 0.0% |
| depleted | late-withdrawal | 44 | 15 | 4.1% |
| depleted | supported-flank | 12 | 0 | 15.3% |

These aggregates mix deliberately different missions. A withdrawal succeeding in preservation is not evidence that retreat wins an attack. No orders can be legitimate for preservation missions; do not remove those successes just to force interaction.

**Actionable finding:** the timed Manassas flank reference achieved zero objectives in all 36 current-rule probes, including full ammunition. A focused comparison using explicit Line staging wins under rules 7 and stalls under rules 17: Jackson and Elzey report turning space blocked near the western approach. This does not prove the mission is unwinnable. The timed reference is no longer demonstrated competent play under current rules. This release adds an Army attention notice for the obstruction and corrects the reference's wording. Rework the route and independently validate current-rule attack play before broad numerical tuning. Existing older-rule success tests remain unchanged.

## Campaign policies

An initial 192-run fixed-advisor pass is retained separately. The expanded pass has 240 runs: 24 seeds (1861–1884), both difficulties, four fixed advisor preferences plus one adaptive resource policy. Choices are filtered for availability; battles use staff delegation and the normal campaign resolution. Fixed policies use simple recovery thresholds; adaptive uses expected resource effects and available recovery allocations, without sampling future outcomes. The adaptive policy can inspect structured authored effects and is not a novice-human model.

| Difficulty | Policy | Runs | Survived to ending | Mean decisions |
|---|---|---:|---:|---:|
| story | hotspur | 24 | 0 | 7.0 |
| story | fox | 24 | 24 | 30.0 |
| story | wolf | 24 | 0 | 24.7 |
| story | sovereign | 24 | 0 | 16.0 |
| story | adaptive | 24 | 24 | 30.0 |
| standard | hotspur | 24 | 0 | 7.0 |
| standard | fox | 24 | 0 | 23.0 |
| standard | wolf | 24 | 0 | 20.8 |
| standard | sovereign | 24 | 0 | 16.0 |
| standard | adaptive | 24 | 24 | 31.0 |

All 240 runs terminated. Adaptive survived 24/24 on both difficulties; fixed Fox survived 24/24 on Story and 0/24 on Standard, with Standard ending in army collapse. This shows that the tested adaptive supply decisions can sustain a Standard campaign; it does not establish broad fairness, calibrated difficulty, or a universal best strategy. No campaign tuning was applied from these fixed policies.

## Reproduction and preserved evidence

Run `npm run benchmark:battles -- <new-output-directory>` and `npm run benchmark:campaign -- <new-output-directory>`. The scripts write JSONL cases, summaries and explicit policy limitations. Use a new directory to preserve previous runs. Tactical simulation uses 0.2 input steps, subdivided by the existing engine.

Raw evidence lives at `/Users/titansforge/Documents/Codex/2026-09-11/create-an-image-of-2/outputs/Civil-War-Upgrade-23/evidence`: `tactical.jsonl`, `tactical-summary.json`, initial `campaign.jsonl` and expanded `adaptive-expanded/campaign.jsonl`. Engine/source hashes are recorded in `benchmark-source-hashes.json`.

## Priority after this pass

1. Rework and playtest the current-rule Manassas flank route, including congestion recovery and doctrine variation; keep the failed fixed reference as a regression baseline.
2. Add bespoke competent-play policies and manual runs for the remaining attack, reserve, raid and withdrawal missions. Test impaired supplies and late arrivals against each mission's actual conditions.
3. Continue long-battle/device performance measurements and the researched second-landmark/people art queue.
