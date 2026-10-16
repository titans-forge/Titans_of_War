# Gettysburg v3 gait and depth review

**Date:** October 1, 2026  
**Scope:** Exact historical Gettysburg; a small Union E march pilot and production standard-depth correction  
**Decision:** Apply the standard-depth correction in normal Gettysburg. Keep new gait artwork opt-in; the complete family has not passed promotion.

## Delivered in normal Gettysburg

Pole and cloth now share the living anchor soldier's ground depth. Nearer figures and scenery can occlude the physical standard. Hover labels, strength bar, condition text and the raised click rectangle stay in a separate UI container at depth 40000. Both layers move, fade, hide, disable input and restore together. Names and strength remain hover/touch inspection only.

This applies to Gettysburg infantry; artillery and other battlefields retain their previous standard presentation. It establishes physical depth, not a completed color bearer: the nearby man still carries his rifle and does not visibly grip the staff. Limb-level cloth/staff/body compositing remains unfinished.

The earlier v2 candidate also now overrides inherited independent width/height variation with one stable proportion-preserving scale. That fix is confined to the candidate family.

## Gait experiment and result

Two verbal imagegen attempts failed: a four-pose strip repeated its leading leg and an isolated opposite-contact correction repeated it again. Those original PNGs are retained as rejected evidence in the development studies, and are not release assets.

A native Blender structural render supplied an actual four-phase opposing-leg guide. One built-in imagegen appearance transfer using that guide and the existing Union appearance reference produced visibly distinct opposing contacts and passing poses. Root and a separate agent visually reviewed the result. This is agent visual review, not independent human or historical certification.

The successful source is native **2172 × 724 RGBA**, mapped to four full **543 × 724** cells. Its public PNG is byte-identical to the generated study. A read-only authoring script writes JSON; it neither draws nor resizes/repacks source pixels.

The pilot is deliberately small:

- Union identity A, E bearing, four march phases only;
- native pelvis/torso-derived X roots **272, 266, 291, 313**, shared ground-reference Y **632**;
- common reference height **548**, preserving the authored proportions;
- animation phase follows traveled distance, with stable per-soldier phase offsets;
- pause/resolution retain the last rendered phase; reduced motion retains a stable phase;
- explicit complete-clip approval and availability are checked before use;
- one absent frame withholds the whole clip, avoiding alternation between candidate and fallback artwork;
- unmatched ready/fire/reload/melee/fall, other directions and Confederate units use accepted artwork. The rejected v2 movement study is never a v3 fallback.

In this one-identity pilot the scene explicitly selects A. This is not silent substitution for a missing B family. The clip's narrow approval does not authorize production promotion or establish identity/action continuity.

Open the game with `?artPass=gettysburg-v3`, then Quick battle → Gettysburg. The E clip appears only when Union infantry move in that bearing; most opening soldiers face other directions. Removing the query returns to accepted artwork.

## Development inspection tool

`?artReview=gettysburg-motion` compares source studies with the rig guide. It supports phase stepping, looping playback, close zoom, raw cells, body-root registration, and guide overlays. Registration translates a measured body root to a fixed target without altering aspect ratio. Filmstrips remain raw. Rejected sources retain nominal guides and never acquire an approval through playback.

The route is guarded by Vite's development flag. The production build contains neither the reviewer UI/chunk nor the rejected-study source URLs or study PNG directory. The gameplay pilot's public PNG remains included for the explicit art-pass query. Production does retain the pilot's small clip metadata; development inspection sources are not fetched by normal play.

Browser review also caught lost rapid phase clicks from captured state. Previous/Next now use functional state updates.

## Remaining defects and next order

1. **Finish this E cycle's equipment and ground contact.** Musket grip shifts, especially in the third sample; the bayonet is indistinct. One passing sole sits 19 source pixels above the common ground reference. Source fringe colors and very faint alpha ghosts remain. Refine with the structural guide, inspect both contact silhouettes, then compare at game scale.
2. **Match ready and firing before expanding.** Produce ready, aim/fire/reload using the same camera, equipment, identity, root and common reference. Check all transitions. The present pilot visibly changes family when those actions begin.
3. **Add Confederate E, then the remaining bearings.** Use isolated per-bearing studies rather than sheet-wide correction attempts. Do not multiply identities before the small matched action family passes.
4. **Author a true bearer and officer.** Complete staff grip and limb/cloth/body layering before claiming fully integrated standards. Verify selection and departure again after the source role changes.
5. **Consolidate textures and repeat promotion review.** Retain accepted fallbacks while coverage is partial; remove duplicate work only after equivalent coverage is evidenced. Repeat close/play/overview, reduced motion, touch, combat and retirement checks before default promotion and later battlefield rollout.

Apparent cap-to-shared-ground height varies **16 native pixels / 2.9%**. Manual root annotations have approximately **±5 source pixel** uncertainty. The source remains a registered raster approximation, not a validated skeleton. A fixed height preserves source variation; it does not normalize it away. No new whole-game grade is assigned from this narrow pass.

## Preload comparison

| Current Gettysburg encounter | URL entries | Unique URLs | Source-file bytes |
| --- | ---: | ---: | ---: |
| Normal | 45 | 43 | 36,646,749 |
| v3 E gait pilot | 47 | 45 | 37,407,371 |

The opt-in adds **760,622 bytes / 0.73 MiB**, including atlas JSON. Normal Gettysburg does not request the new PNG. The native image is nominally 6 MiB decoded RGBA before additional buffers; actual GPU/canvas memory was not measured. This inventory sums on-disk source files from the real preload method, not total app payload, transferred bytes, startup timing or end-user performance.

## Verification

- Final `npm run build`: passed; existing large-chunk warnings remain.
- `npm run validate-assets`: passed. The subsequently added real-v3-preload regression also passed in the detailed-unit suite.
- Gettysburg mechanics / command brief / artillery: **81 passed**.
- Family selection / proportions / original hashes: **10 passed**.
- Whole-clip readiness / actual travel / pause / reduced motion / fallback: **11 passed**.
- New pilot hash / native geometry / actual scene binding / common scale / fallback: **4 passed**.
- Grounded standard geometry / selection / fade / escape / restoration / scope: **6 passed**.
- Detailed unit / actual preload selection: **7 passed**.
- Field presentation cache: **14 passed**; battle UI lifecycle: **7 passed**.
- `python3 scripts/author-gettysburg-gait-clip.py --check`: passed.
- Production output inspection: development review component, UI strings, rejected image URLs and study directory absent.

Live browser checks selected Pettigrew by its raised cloth and verified the readable hover label. A three-formation assault in the v3-enabled field reached combat, wavering, routing and Trimble's disordered field exit at field time 180; pause, ridge inspection and disabled departed-unit commands worked. This was a presentation smoke run, not an optimized strategy or independent balance trial. That battle capture does not demonstrate the E-only candidate on every figure: existing art correctly remains for unmatched bearings/actions. The actual renderer binding is separately tested.

The review tool displayed opposing contact samples with fixed root registration and looped through phases. Final pilot-field and reviewer warning/error logs were empty. No all-board play audit, named-device benchmark, publication or human usability validation is claimed.

## Evidence

- [Capture catalogue](../captures/gettysburg-v3/README.md)
- [Clip measurements and remaining defects](gettysburg-v3-clip-measurement.json)
- [Native rig and geometry receipt](../candidates/gettysburg-v3/union-e-rig-guide.json)
- [Exact imagegen prompts](../prompts/gettysburg-v3-gait.md)
- [Source hashes and review statuses](../manifests/gettysburg-v3-motion-studies.json)
- [Actual preload inventory](../manifests/gettysburg-v3-preload-audit.json)
- [Prior family review](gettysburg-v2-build-review.md)
- [Main battlefield order](../../CIVIL_WAR_FOCUSED_ART_PASS_PLAN.md)
