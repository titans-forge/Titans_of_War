# Civil War v34: flag-carrier continuity

## Changes in priority order

1. Preserve a valid living Gettysburg flag-carrier figure ID through cold Resume and repeated immediate pre-draw re-saves. Restore it directly after the existing base visual parser, before shot/contact/checkpoint sampling consumes the base restore marker.
2. Keep existing casualty reassignment. Saving never chooses a new nearest soldier or moves a flag. A carrier that died before Save is serialized as null; the unchanged deterministic selector chooses the next surviving figure on the next draw. A raw living carrier can be retained while temporarily hidden. Figure identity is distinct from a re-formed slot index.
3. Reject malformed optional metadata without invalidating valid combat or base presentation. Bind the versioned presentation.standardAnchors sidecar to exact presentation time, formation identity, capacity and accepted raw living figure. Enforce 32 formations, 32 figures per formation and 700 figures total; reject duplicate/unknown records, getters, non-dense arrays and invalid IDs. Standards continue to use raw feet and existing depth placement.
4. Register the new actual-module/current-Scene regression suite in gameplay, current-art and field-continuity checks, preserving authentic installed-v33 archives and historical fixtures through a narrow three-file metadata migration.

## Preview boundary

Enable Gettysburg with canonical artPass=gettysburg-v32 and standardContinuity=v34. The contactLayout=v33 preview is independent and can be enabled or omitted. Duplicate or encoded gate variants disable continuity. Existing query-absent checkpoint output is preserved. Turning continuity off and saving can drop the optional metadata; turning it back on cannot recover a carrier choice that was not saved.

Local URL: http://127.0.0.1:5174/?artPass=gettysburg-v32&infantryScale=moderate&contactLayout=v33&standardContinuity=v34

This changes renderer save metadata only. Base presentation version/state, raw feet/formation slots, combat, collision footprints, native volley origins, art pixels/atlases/flags and default art policy remain unchanged. Existing save owner version and checksum algorithm remain unchanged; the optional extension changes the contents/checksum of a newly written enabled save.

## Before failure and source evidence

The authentic before source reaches the same contact at simulation time 104.04999999999623 with Pickett and Gibbon retaining carrier 16. Cold views start without the retained ID and choose 19 and 18. That shifts Pickett's standard by (+27.887861525821563, -36.798809590953795) world pixels and Gibbon's by (-14.76475582161413, +20.064273897260932), despite matching raw feet and canonical fallen tuples. Byte-equal pre-draw re-saves alone failed to expose this visual defect.

The new tests explicitly collect carrier and standard/UI transforms because the older body-facts collector omits standards. Current enabled source retains carrier 16 through cold restoration and three immediate pre-draw re-saves with contact layout both off and on, while raw combat, feet, body poses, shots and graphics remain exact. Tests also cover both controlled diagonal contact directions, both sides, reduced motion, carrier death between draw and checkpoint, legacy/missing/off and malformed metadata. Reformation includes a retained figure 17 whose new slot index is 1 and whose nearest fallback would be 27; the saved ID remains 17.

These are actual source modules and a current-Scene Display command recorder, not GPU or human usability certification. The hidden-to-visible diagnostic independently matches an inherited decorative-ground-standard input.enabled difference to the authentic before Scene; physical/carrier facts remain exact. It is not silently removed from comparisons or reported as a newly fixed defect. Inactive warm/cold cached display parity is a separate known limitation.

Authentic v33 capture preserves 1,562 before source files (548,470,731 bytes), 46 policy/asset queries, 59,744 pose executions, 336 legacy Scene witnesses, 12 cold rows and two command-schedule carrier-failure witnesses. Old fixtures, ledgers and archives are not refreshed. The prior unchanged installer fault cases are freshly rehashed reuse evidence, not new fault execution. Per-file ownership checks and rollback do not make an atomic multi-file transaction against an uncoordinated writer.

## Final validation

The candidate passed 1,922 gameplay test executions with zero failed, cancelled, skipped or pending tests. The focused v34 suite passed 25 tests. Separate checks passed for assault controls (16), v31 (25), v32 (26), v33 (31), current art (652), save flow (67), field continuity (117), assets (786), and production build. These suites overlap; their counts are not independent unique tests. All executable/test sources and the Node runtime remained fixed during those checks.

An owned browser session played Practice Gettysburg through Move, Assault, Pause, Save and cold Resume with the exact preview gates, repeated Save/Resume, contact layout off, and a 390 by 844 phone viewport. Combat information survived Resume, the six order buttons and sector selector fit the phone layout, and no console or page errors occurred. The production build after the final gate matches the browser-tested 386 files and 265,222,594 bytes exactly. This is headless browser evidence, not an independent human playtest or GPU performance benchmark.

Whole-canvas warm/cold pixel equality FAILED and remains recorded. Warm/hot captures were identical; cold captures had small changed rifle, body or cloth regions. Approximate image coordinates alone did not establish a displaced flag. A separate authorized read-only capture of the two saved-game keys from the owned QA profile confirms the actual saved optional metadata. Actual production loaders and the base visual parser accept all ten formation records and restore all living carrier IDs, including Pickett and Gibbon as figure 16. Source draws preserve carrier identity and standard transforms. A fresh cold draw, idle draw, second zoom draw and subsequent re-save also preserve visible body frames for this actual save. Saving before the first draw can change native body phase on a later fresh reload; the pinned authentic before Scene reproduces exactly the same body-only difference. That inherited ordering behavior remains a separate repair priority. These source facts do not turn the public screenshot comparison into a pixel-parity pass.

The external v34 receipts bind the exact source, screenshots, failed diagnostic attempts, independent Astra Max decision, rollback copies, scoped installation and post-install served-byte checks. Acceptance is limited to the optional carrier-continuity change. This document is not a public-release receipt or a new whole-game grade.

## Next priorities

1. Review the combined optional contact/continuity preview in ordinary play before default promotion or other-battle rollout.
2. Measure a separate dense own-rank art/layout change across all bearings and phases; v33 opposing separation does not solve rear-rank crowding or rifle/body interpenetration.
3. Fix inherited pre-draw re-save body-phase continuity and inactive cold cached-display continuity separately from the restored living carrier identity; then repeat actual browser pixel comparisons.
4. Expand remaining close-combat pose bearings/identities after spacing is settled, then obtain independent human command/readability feedback and representative browser frame timing.
