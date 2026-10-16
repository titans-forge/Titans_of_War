# Gettysburg v2 infantry build and review

**Date:** September 30, 2026  
**Scope:** Gettysburg, July 3, representative historical field  
**Decision:** Keep the new infantry family opt-in. The grounded standards and unused-preload removal apply to normal Gettysburg.

## Improvements available in the normal game

Gettysburg infantry standards now stand beside a stable surviving figure, rather than above the formation's upper boundary. A longer staff and higher cloth keep the flag above heads while the staff base follows that figure's ground position. If the figure becomes a casualty, the standard chooses another living central figure. This is adjacency, not a completed color-bearer animation: the soldier still carries a rifle and the standard remains an overlay at depth 40000.

The standard's hover label and clickable rectangle now include the raised cloth. Live verification selected Pettigrew's Division by clicking its flag. The change is limited to non-artillery formations in exact historical Gettysburg; other boards retain their previous placement and hit areas.

Gettysburg no longer preloads the realistic foliage atlas, which its dedicated terrain renderer never stamps. The optional-source guard prevents creation of a canvas for an unloaded source. Other boards still preload foliage.

| Gettysburg preload | URL entries | Unique URLs | Files on disk |
| --- | ---: | ---: | ---: |
| Prior baseline | 47 | 45 | 38,913,341 bytes |
| Current normal game | 45 | 43 | 36,646,749 bytes |
| Current v1 ready preview | 45 | 43 | 37,532,034 bytes |
| Current v2 family preview | 53 | 51 | 45,173,570 bytes |

The normal encounter saves **2,266,592 bytes (2.16 MiB, 5.8%)**. The v2 preview adds **8,526,821 bytes (8.13 MiB)** over the current normal encounter because accepted action fallbacks are retained. These are summed source-file sizes from the actual preload method, not network transfer, total app size, startup timing, or measured GPU memory. Removing foliage also avoids its 1536×1024 source image and equally sized compositing canvas, nominally 6 MiB RGBA each; actual memory residency was not measured.

## New infantry family

Open the local app with `?artPass=gettysburg-v2`, choose **Quick battle → Gettysburg — The Field Between the Ridges**, and enter the field. Removing the query returns to accepted infantry artwork. The selector does not affect alternate Gettysburg, Manassas, Shiloh, or other battles.

Four native transparent imagegen sheets provide **two identities per army, eight directions, ready poses, and two movement samples**: 96 mapped frames in total. Their more elevated camera, cap/hat variation, different builds, packs, blanket rolls, and worn material treatment improve the formation's naturalism. Identity selection is stable by formation and figure ID, with a mixed hash to avoid a visible alternating A/B rank pattern.

The integration retains distance-driven movement phases. Candidate sprites use measured boot pivots, fixed reference height within each identity/page, and no whole-sprite lift or rotation layered over the authored posture. Pause/resolution retain a contact sample; reduced motion uses a fixed sample. Missing candidate textures or frames keep the accepted art. Fire, reload, melee, and fall deliberately use the accepted family, so identity/style continuity is still incomplete.

The built-in imagegen tool produced six sources: two ready sheets, two original movement studies, and two attempted movement corrections. Its model identifier was not reported. The correction images still repeated the leading leg and were rejected. Original PNG pixels and alpha are unchanged; a reproducible read-only measurement script authors atlas JSON. Hashes, source dimensions, bounds, pivots, frame coverage, and source limitations are recorded separately.

## Promotion blockers found in this pass

1. **The two movement samples do not reliably alternate the anatomical leading leg.** Distinct rectangles and logical contact keys pass geometry tests but do not establish correct footwork. Both attempted sheet-wide corrections failed visual review.
2. **One Confederate march crop cannot cleanly isolate neighboring bayonet tips.** In S column 2, source row separation contains two solid pixels at y761. A rectangular cut either clips the tip or includes a neighboring sliver. Isolated frames are required.
3. **Perspective/height registration still varies.** Union ready rear silhouettes are roughly 5–10% shorter than some front views. Reference heights also differ between ready and march pages. Fixed scale references prevent metadata-driven breathing but cannot repair source perspective or guarantee action-transition continuity.
4. **The action family is incomplete.** Firing and casualties switch to accepted art. Officers, true color bearers, matched melee/fall silhouettes, and crew roles have not been produced in this family.
5. **Ground padding and depth need production authoring.** Some movement soles lie at the cell edge. Flags still draw over intervening people, rather than sharing physical occlusion with a bearer's hands, rifle, and body.
6. **The preview is too expensive to promote without optimization.** Four new RGBA pages add 24 MiB of nominal decoded image data before any additional buffers. Retaining fallback pages is sensible for a study, but full production should consolidate accepted coverage and revisit the preload budget.

## Verification and its limits

- `npm run build`: passed on the final source. Existing large-chunk warnings remain.
- `npm run validate-assets`: passed, including source hashes and the new family checks.
- `node scripts/test-gettysburg-infantry-family.mjs`: 9 passed; identity, logical coverage, pause/reduced-motion selection, anchors, and actual source geometry/hashes.
- `node scripts/test-detailed-unit-visuals.mjs`: 6 passed; real preload selection, existing art, and cross-battle isolation.
- `node scripts/test-realistic-scenery.mjs`: 5 passed, including absent optional sources.
- `npm run test:gettysburg`: 81 passed across mechanics, command brief, and artillery presentation.
- `node scripts/test-field-presentation-cache.mjs`: 14 passed.
- Browser checks: normal and v2 Gettysburg, ready formations for both sides, advance-order delivery, movement toward the Union line, casualties, pause, zoom/focus, landmark inspection, raised-flag selection, and a 390×844 compact-layout request. Checked default and pilot tabs returned no warning/error entries at the final check. Browser sizing was reset afterward.
- An earlier solo Pickett advance reached a disorderly field exit. That was a presentation smoke check, not a coordinated full battle or independent balance trial. No all-battle audit, historical validation, human usability study, or new whole-game numerical grade is claimed.

Source geometry tests do not certify anatomy or motion. The separate agent's read-only integration review caught the raised-flag hit-target mismatch, which was fixed and then verified through the UI. It also identified the remaining scale/depth risks above.

## Next work in order

1. Author one correctly registered march pair for one identity per side using isolated poses or a deterministic rig. Inspect legs, boot contact, rifle/strap sides, padding, and direction transitions before expanding. Stop relying on full-sheet corrections for the failed contact pair.
2. Register ready/march at one camera and consistent cap-to-sole scale; isolate the contaminated Confederate S frames. Recheck actual moving sprites, not only atlas rectangles.
3. Complete that small family's aim/fire/reload and casualty actions while retaining identity. Establish continuity before multiplying identities and pages.
4. Produce one true bearer and one officer per army. Attach staff/cloth to the bearer, implement appropriate depth, and verify hover/click targets again.
5. Optimize the completed pages, repeat the baseline capture matrix and preload audit, then promote Gettysburg. Continue the battlefield sequence in the main plan only after its gate passes.

## Evidence

- [Capture catalogue](../captures/gettysburg-v2/README.md)
- [Source and status manifest](../manifests/gettysburg-v2-infantry.json)
- [Actual preload inventory](../manifests/gettysburg-v2-preload-audit.json)
- [Exact generation prompts](../prompts/gettysburg-v2-infantry.md)
- [Atlas measurement notes and defects](gettysburg-v2-atlas-measurement-notes.md)
- [Earlier v1 review](gettysburg-v1-ready-candidate-review.md)
- [Main production order](../../CIVIL_WAR_FOCUSED_ART_PASS_PLAN.md)
