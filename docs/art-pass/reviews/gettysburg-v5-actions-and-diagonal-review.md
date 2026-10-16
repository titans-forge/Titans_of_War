# Gettysburg v5: clearer loading and the first diagonal march

October 1, 2026. Local opt-in art pass, exact historical Gettysburg only. Production and full-family approval remain **false**.

The highest-value source corrections are now in `?artPass=gettysburg-v5`: clearer rifle-loading geometry, one shared stationary-action size, and a reviewed four-phase southeast march. The development reviewer supports explicit action sequences and matched-phase E → SE → E turn inspection. The normal game continues to use its accepted art; incomplete coverage remains a direct fallback to that art.

## What changed and why

- The new east-facing Union A sheet separates the socket bayonet from the bore and loading rod. Ready, shouldered fire, load and ram use one **485 native-pixel body reference**, including loading. Ready/load/ram solid body spans are 481/478/476 px, about 1% apart; the v4 loading figures were about 5% larger than ready. Fire's lowered head remains a posture change rather than receiving its own scale correction.
- The barrel-mouth landmark is measured separately from the bayonet tip. Existing flash/smoke rendering uses the new source anchor, scale and pivot. Reduced motion still suppresses flash. These are visual changes; movement, ammunition, damage, combat timing and victory rules are unchanged.
- The new southeast march has four visibly alternating contact/passing phases, a consistent two-hand carry, full-cell isolation and a single **490 px reference**. A direct Blender guide supplied articulated leg and grip structure; it is reference material, not shipping art. The final generated image was re-reviewed in every cell rather than assumed to preserve that structure.
- The east-facing march remains the **unchanged v4 source**. A fresh E march was rejected because its contacts and passing poses repeated the same visible leg arrangement. The first SE source repeated its support leg; its first repair fixed the leg but failed the 16 px solid-padding requirement. Only the final padded SE source cleared both narrow source checks. Failed studies are preserved outside public assets.
- The reviewer now starts paused and provides explicit ready/march/fire/load/ram sequences. Its E ↔ SE and E → SE → E presets pair the same gait phase across bearings; unsupported SE combat sequences are withheld. Manual source stepping pauses playback and affects its own panel only. Pause retains the current sample, including during an already queued animation advance. OS reduced motion initially disallows automatic playback and leaves explicit stepping available.

## Exact coverage

| Army / identity / bearing | Candidate coverage | Remaining accepted-art fallback |
| --- | --- | --- |
| Union A, E | Retained four-phase march; new ready, fire, two simplified loading states | Melee, casualty and other unsupported states |
| Union A, SE | New four-phase march only | Ready, fire, reload, melee, casualty |
| Other bearings, Confederate | None in v5 | All states |
| Explicit Union B requests | None in v5 | All states; the live pilot currently selects A for supported Union figures |
| Other scenarios, including alternate Gettysburg | None in v5 | All states |

The narrow pilot assigns identity A to supported Union figures; it does not yet alternate A/B artwork. The registry rejects an explicit B request and uses accepted-art fallback, but the current battlefield renderer does not make that request. Adding B is therefore necessary for visual identity variation as well as broader registry coverage.

This is not a complete loading drill, anatomical certification, or regiment-specific weapon reconstruction. Exact equipment dimensions, historical drill and inter-source body continuity still require informed human review. Representative percussion-musket and socket-bayonet context is linked in the [prompt record](../prompts/gettysburg-v5-native-corrections.md).

## Sources and traceability

The PNGs remain native 1254 × 1254 RGBA, with four full 627 × 627 cells. Public PNGs are byte-for-byte copies. No cropping, resampling, pixel cleanup or per-frame normalization was applied. Pivots, row-shared ground lines, body references and the muzzle location are explicit annotations, with approximately ±5–8 px registration uncertainty.

| Runtime source | Native PNG bytes | Body reference | Source decision |
| --- | ---: | ---: | --- |
| Retained v4 E march | 520,759 | 412 px | Retain prior limited preview |
| New v5 E stationary actions | 592,405 | 485 px across all actions | Limited opt-in preview |
| New v5 SE march | 609,955 | 490 px across all phases | Limited opt-in preview |

The [manifest](../manifests/gettysburg-v5-action-and-diagonal-family.json) binds sources, hashes, runtime assets, scope and checks. The [annotations](../manifests/gettysburg-v5-source-annotations.json), [E measurements](gettysburg-v5-actions-e-measurement.json), [SE measurements](gettysburg-v5-march-se-measurement.json), [guide receipt](../candidates/gettysburg-v5/union-se-march-guide.json) and [complete prompts](../prompts/gettysburg-v5-native-corrections.md) preserve how the sources were authored. Built-in imagegen was used; its model identifier was not reported.

The separate worker's [source review](gettysburg-v5-independent-source-review.md) records each failed attempt and the final narrow acceptance. It is model-assisted review, not independent human, historical, anatomical or balance validation.

Solid padding at alpha ≥64 passes the unchanged 16 px gate for every approved v5 cell. Very faint colored RGB and alpha-1 boundary pixels remain in the native sources. The diagnostic saturated-blue pixels are all below alpha 8. Correctly composited inspected previews showed no conspicuous blue contamination, but the source is **not free of colored residue**. Full-cell isolation remains necessary.

## Verification and browser QA

| Check | Result and boundary |
| --- | --- |
| Native source authoring `--check` | Passed for E actions and SE march; source hashes, public copies and generated metadata agree. |
| Full `npm run validate-assets` | Exit 0; 143 Node tests passed, zero failures, plus the asset validation commands. The run preceded the final two added real-SE tests. |
| Final v5 pilot + playback tests | 20 passed, zero skipped/failing. The latest tests use the actual SE atlas and all four frames, not a synthetic SE fixture. |
| Gettysburg mechanics/command-brief/artillery suite | `npm run test:gettysburg` exited 0. |
| Production build | Exit 0; development reviewer UI/markers, rejected source images and docs are excluded. Candidate runtime PNGs/metadata are included for the explicit opt-in. Existing large-chunk warning remains. |
| Desktop reviewer | All inspected images decoded at native dimensions; action stepping, matched-phase E → SE → E transitions and independent panel inspection responded. No horizontal overflow or browser warning/error logs in inspected states. |
| Narrow layout | Tested at 390 × 844; document client/scroll width both 375 px, controls wrapped and remained available. This is reviewer responsiveness, not a renewed full game UI audit. |
| Gettysburg quick battle | Opened v5 practice, dismissed guidance, began combat, changed to 2× speed, paused and zoomed in. Controls responded without browser warnings/errors. Encounter was not completed; every candidate action was not isolated in live combat. |
| Pause and reduced motion | Actual-renderer/playback tests cover retained action/phase, fallback clearing and reduced-motion frame/effect behavior. Reviewer manual stepping remained usable. |

Source review and browser inspection do not prove a physically continuous walking rig, planted-foot trajectories, a seamless interpolated turn, or formation-wide performance. Turns switch authored bearings at matched phases; they do not interpolate between 2D images. The gameplay encounter was a bounded control/rendering check, not balance testing or a campaign playthrough.

### Captures

- [Registered v4/v5 loading comparison](../captures/gettysburg-v5/loading-comparison.jpg).
- [E/SE first passing comparison](../captures/gettysburg-v5/e-se-first-passing.jpg).
- [E/SE opposite passing comparison](../captures/gettysburg-v5/e-se-opposite-passing.jpg).
- [Narrow reviewer](../captures/gettysburg-v5/mobile-review.jpg).
- [Gettysburg practice paused at closer zoom](../captures/gettysburg-v5/gettysburg-paused.jpg).

### Asset budget

The explicit v5 selection requests **three atlases and five clips**, sharing one PNG/JSON for its three stationary actions. Selected PNGs total **1,723,119 bytes**; JSON totals **10,810 bytes**. Combined candidate files total **1,733,929 bytes (about 1.65 MiB)**. Nominal decoded RGBA storage is **18,870,192 bytes (about 18 MiB)** before texture/browser overhead. The reused v4 march is counted once.

Normal play and non-Gettysburg scenarios request zero candidate atlases. These are registry, file and pixel counts from the [preload audit](../manifests/gettysburg-v5-preload-audit.json), not measured startup latency, FPS, peak memory or ordinary-PC performance. The current texture footprint needs optimization before a complete multidirectional family can become default.

## Next priorities, in order

1. **Complete SE ready/fire/load/ram using the same identity, camera, kit and shared stationary scale.** Check E ↔ SE action transitions, grip/weapon length and rendered muzzle effects. This closes the most visible hole in the present family.
2. **Build the second Union identity and Confederate counterpart**, then extend the remaining bearings through the same source, scale, alpha-padding and renderer checks. Review at normal formation scale as well as close-up.
3. **Complete melee, casualties, recoil/settling and true standard bearers.** Standards currently have physical depth placement but are not yet held by a dedicated staff-gripping soldier.
4. **Optimize the complete family and test on named ordinary PCs**, then independently play complete Gettysburg encounters, including retreat, losses and peak effects. Only then consider default promotion and the later battlefield rollout.

Gettysburg remains the first acceptance gate. This pass earns no revised overall game grade and does not complete the wider Civil War art plan.
