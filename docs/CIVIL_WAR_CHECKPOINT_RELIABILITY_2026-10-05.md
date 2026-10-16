# Field checkpoint reliability

## Order of work

1. Reproduce the repeated-reload rejection using the current public game, without re-saving between reloads.
2. Prevent ordinary autosave from rewriting the campaign anchor while a validated/successfully saved field checkpoint owns the encounter.
3. Make explicit Save and leave preserve or recover the previous owned campaign/field pair when a write fails. Retain exact campaign matching and report incomplete recovery honestly.
4. Run the actual App effect and handler regressions, save-failure cases, historical art checks and public repeated reload/resume. Freeze the finished evidence before independent review.
5. Install the exact independently accepted local repair with rollback copies, rebuild, and verify installed checks and the played build.
6. Return to the opposite diagonal art gap: Union A northwest and Confederate A southeast contact/casualty, then the alternate Union infantry variant and clearer combat frontage.

## Problem and design

The prior Gettysburg art audit exposed a first successful cold resume followed by a later rejected checkpoint. Fresh campaign loading normalizes authored commander labels and fills supported state fields. Ordinary autosave then rewrites the campaign while the field save still points to the earlier exact campaign anchor. Re-saving manually works around this; it is not necessary play behavior. The current public baseline reproduced the failure at paused field time zero: first resume succeeded and the second reload rejected the same saved encounter without another save.

The repair prevents that unnecessary write while the current encounter owns a checkpoint. Exact anchor validation, checksum, storage formats, battle outcomes and presentation remain unchanged. A checkpoint must come from a successful save or validated load; a rejected stored key does not acquire ownership. Settlement and discard release ownership and allow ordinary saving again. Demo saving remains separate from the player's campaign.

Explicit Save and leave still writes a current campaign and binds a new field checkpoint. The pair is prepared and validated through the unchanged storage APIs before writing. A previously loaded checkpoint must still match its stored owner. These are two storage writes, not an atomic transaction. On failure, recovery restores only bytes still recognized as written by this operation. Detected concurrent changes must be preserved, and a failed or incomplete recovery must be reported rather than described as a successful save. Verified recovery backups for migrated campaigns retain their existing semantics.

Independent Astra review rejected the first candidate before installation. Two tabs can save identical deterministic practice states against different real campaigns; comparing their battle/choice/engine/practice fields alone allowed an old tab to replace a newer campaign. The correction remembers the exact validated campaign anchor in App memory and updates it only after a successful verified save. It is never serialized into either stored format. A saved encounter with missing or changed ownership is refused before writing.

Initial campaign and field loading must also agree with the original unnormalized campaign snapshot. A detected mixed load protects the campaign from ordinary autosave and supplies no pending encounter or owner. Stable corrupt-field behavior is retained. This is bounded encounter ownership and initialization consistency, not an atomic storage transaction or a general lock across tabs.

## Verification and scope

The rejected first candidate passed 59 save-flow checks (28 original and 31 new), all 1,735 checks reported by the full npm test pipeline, 545 current art checks, 61 field continuity checks and the actual build. Those passes did not cover remembered campaign ownership; its complete source/evidence and blocking actual API proof are preserved in the external `failed-source-attempts/owner-v1` record. The original pre-repair source failures also remain retained. Corrected-candidate results are recorded separately below when complete.

The first candidate's fresh isolated public Gettysburg practice saved Pickett's confirmed Move to 650,600 at paused field time zero. Four reload/resume cycles without another save preserved the complete displayed orders and facts. Two additional v30/v29 art-query loads also preserved them. One deliberate second save followed by three further reload/resume cycles passed. Public discard removed the checkpoint; a fresh practice had no old Move order. The browser session was closed, with no observed console errors, warnings or page errors. These remain genuine bounded queued-order observations of that candidate, not corrected-candidate, stale-owner or completed-battle certification. A fresh owner-v2 session repeats the public paths against the corrected build.

An additional ordinary Fort Sumter campaign choice retained turn two and one resolved decision after reload, confirming progress autosave after practice discard. An immediate reload after Continue still displayed the after-action report, so report-dismissal persistence is unclaimed by this test. Real field settlement is covered by the separate current App/engine regressions.

The external `civil-war-checkpoint-20261005` receipts distinguish reproduction, candidate checks, real public browser play, independent review, installation and postchecks. Exact final acceptance and installed status are recorded separately; this source note does not pre-assert them. No artwork is regenerated by the stability repair, and the v30 moderate selector remains the art preview.

Historical preservation fixtures remain byte exact. The changed App/save-flow test files receive an explicit archived-before/current-hash ledger; other historical behavior assertions remain active against the current implementation. This migration replaces an obsolete byte promise for declared files, not a claim that those files never changed.

The source regressions extract and execute the current App loader, autosave effect and handlers, including real campaign settlement functions. Their queued setter model checks callback behavior; it does not certify React scheduling. The separate browser pass uses fresh isolated storage and ordinary public controls to verify reload behavior without injecting state or re-saving between cold loads.

## Corrected candidate results

The owner-v2 candidate passed 67 mandatory save-flow checks (all 28 original checks and 39 new checks), all 1,743 checks reported by the full npm test pipeline, 545 current art checks, 61 field continuity checks and the build. Every reported test passed without skips. The actual App regressions cover stale ownership with identical full deterministic practice checkpoints, ownership updates only after verified saving, and mixed initialization with valid, absent or corrupt field saves. The original save formats, engine, artwork, audio, package and 1,461 unrelated baseline files remain byte exact.

A fresh isolated owner-v2 public browser session repeated four cold reload/resume cycles without re-saving, two art-query loads without saving, then three further cycles after one deliberate second save. All nine complete displayed formation overlays matched the pre-save text byte-for-byte: paused field time zero, confirmed Pickett Move to 650,600, strength 5,404, cohesion 74, morale 94, ammunition 42 and suppression zero. Public discard removed the saved encounter, and a fresh practice did not retain the old Move order.

The additional public two-tab check loaded an old practice in A, then used B's ordinary controls to discard it, resolve Fort Sumter B and save a new Gettysburg practice. A's stale Save and leave was refused. B retained turn two, one resolved decision, its successor and all displayed resources after reload; its newer encounter remained resumable. The visible A/B formation overlays matched, but the browser did not inspect private storage or claim identical full checkpoint bytes. The separate actual API regression supplies that narrower byte-identity proof.

The session completed 225 CLI commands without failures, observed no page errors or console warnings/errors, publicly discarded its final practice and closed its owned tabs/browser. The played build inventory binds 370 files and 259,953,737 bytes, with seven served HTML/JavaScript/CSS files independently matched. All earlier browser and rejected-candidate evidence remains retained. Final independent acceptance, local installation and installed verification are recorded by the separate external receipts after this source note is frozen.

One small presentation issue remains: the stale-save dialog repeats its error prefix as “Battle not saved: Battle was not saved.” This is a wording polish item for a later focused change, not a failed save or a false success message. Opposite-diagonal and alternate-Union contact/casualty artwork remain the next visual priorities.

This is a local repair. Complete art coverage, historical drill/anatomy certification, target-device performance and public release are separate work.
