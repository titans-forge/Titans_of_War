# Gettysburg v9: native west-facing Union infantry

Reviewed October 2, 2026. Accepted for an **opt-in local preview**. The complete infantry family and a default release remain unapproved.

## What changed

Four new native RGBA sheets provide two Union identities facing west, each with four march poses and ready, fire, and two representative loading poses. These add eight clips to the retained v8 set: v9 has 18 atlases and 36 clips. It activates only for the historical `gettysburg` scenario with `?artPass=gettysburg-v9`.

The built-in image generation tool produced the final sheets. Its interface does not identify the underlying image model. No final PNG was flipped, resampled, cropped, repainted, or cleaned up. Public and built PNGs have the same SHA-256 as their accepted source. Separate rendered structural guides informed pose direction and weapon projection; those guides are reference geometry, not historical drill or anatomy certification.

The motion reviewer now gives long weapons room in both directions. Its root moved to 47% of the preview width after 50% exposed a retained east-facing shot to right-edge clipping. All 212 registered phases across 53 studies fit the final preview at the common display body height. Gameplay unit scale has not changed.

## Native sources and registration

| Source sheet | Native size | Shared body-height reference | SHA-256 |
| --- | --- | --- | --- |
| Union A west march | 1254 x 1254 | 335 px | `8548f147d8021126f8bc4ce3069983dd7bf5eb29429a1fbafb1401e0f0d5acbb` |
| Union B west march | 1254 x 1254 | 335 px | `7842f97c0ea99f1683b8f138bd6411744cbed1e9326b2d061c2b40c7696e7aaf` |
| Union A west actions | 1254 x 1254 | 415 px | `3676bb60c6c4373cd1176e30b4079ad68cebb94de26fe7bea582dd675b936d96` |
| Union B west actions | 1254 x 1254 | 415 px | `81b66db974e4f026083fe60abe6670461afd7853ea33a845dd7f39aac0d7d35f` |

Each sheet has four equal 627-pixel cells. Actual source roots and cap tops establish registration and shared scale; there are no per-phase size corrections. Firing effects bind to the barrel opening, not the projecting bayonet tip. The annotations and four measurement receipts record native coordinates, padding, frame hashes, phase order, and uncertainty.

Native cell order is retained for march. Opposite contact poses are readable; some support-leg identity in passing poses remains occluded or similar. This is an accepted proposed playback sequence, not proof of perfect gait. Actions comprise one firing hold and two loading poses, not a complete historical recoil/loading drill.

Faint low-alpha pixels reach some source-cell borders. Solid padding passes the native gate, and actual browser alpha compositing shows clean figures. The raw image viewer can exaggerate these faint pixels. No alpha repair was applied.

Executed prompts, including rejected attempts and corrective requests, are preserved in [PROMPTS.md](../candidates/gettysburg-v9/PROMPTS.md). The six rejected or superseded PNG attempts remain in the isolated work directory and are excluded from the local installation. The accepted sources and structural guides are recorded separately in the candidate README.

## Validation

- `npm run test:gettysburg-art-current`: **74 passed, 0 failed, 0 skipped**. Includes 15 v9 tests with required real source/atlas/receipt data, actual Phaser texture registration, renderer selection, scene lifecycle, and pause/reduced-motion/checkpoint reconstruction.
- `npm run validate:gettysburg-native`: v5 through v9 source authoring checks passed.
- `node scripts/validate-assets.mjs`: 17 manifest entries passed, zero warnings. This is the manifest index check, not a rerun of the full gameplay test suite.
- `npm run build`: passed. The existing large Phaser bundle warning remains.
- Source review and final integration review were performed by separate model workers. These are independent task reviews, not independent human testing or historical validation.
- All 429 captured original baseline files matched before installation. Eight existing files change; protected combat, scene, checkpoint, campaign, terrain, music, flags, loader, and default routing implementations remain unchanged.

Raw logs, source-review JSON, and final independent reviews are retained in `/Users/titansforge/Vault/Titans_of_War_Art_Work/gettysburg-v9-20261002/`.

## Actual browser play and inspection

Only one owned browser tab was used at a time. No Codex window settings or services were changed for this test. This does not establish that the earlier Codex crashes are resolved.

The reviewer was inspected through west A/B marching, ready, firing, and both loading phases, and a southwest/west firing comparison. Final long-weapon extents were visible and ground registration remained consistent.

A Gettysburg practice attack was completed with four infantry assault orders. It ended in **field defeat**, command score 20/100, Confederate losses 21%, Union losses 11%, and force preservation 81/100. Three formations escaped in disorder. This records the actual outcome; it is not a new balance certification or evidence of a successful historical attack.

A second Gettysburg encounter ran at 1024 x 768. Formation, assault-sector, speed, pause, and leave controls were accessible. Pickett reached close combat. Save and leave followed by Resume saved battle returned paused at field time 27 with strength 4917/5404, cohesion 54%, morale 78%, ammunition 42/42, and the confirmed destination 470,330. The stable repeat preserved all of those displayed values. The immediate first post-pause display had briefly shown 4918; the settled paused display and repeat both showed 4917. The sector chooser returns to “Nearest sector,” while the confirmed destination remains intact.

The Gettysburg diagnostic reported 18 candidate atlases / 36 clips on each fresh or resumed encounter. First Manassas with the same v9 query reported **zero** candidate atlases / clips and completed a practice defense with the established artwork. The native reviewer and scene tests establish west-frame wiring; these gameplay screenshots alone do not prove every new west pose occurred naturally in combat.

The narrow-screen viewport override was reset after testing. Browser captures and before/after visible checkpoint snapshots are listed in the external browser QA receipt.

## Cost and limits

V9 PNGs total 8,986,125 bytes; this pass adds 1,747,542 PNG bytes. The source-pixel RGBA estimate for candidate atlases is 107.976 MiB, an increase of 23.995 MiB over v8. The whole-field diagnostic reported nominal 281.75 MiB across 88 textures. These are nominal pixel allocations, not measurements of process memory, GPU residency, peak decoding, or network transfer. There was no matched v8 browser performance comparison.

The native budget manifest checks all 18 retained/new source PNGs against public and built PNGs, and public against built JSON. No artwork is promoted to the default game by these checks.

## Next priorities, in order

1. Add native Confederate northeast and northwest march/action poses. These cover important attack approaches without substituting Union uniforms or mirroring other bearings.
2. Complete Union B east and southeast coverage and the remaining northward bearings, preserving identity and shared root/body registration at each direction transition.
3. Test the expanded family together in Gettysburg at close and strategic zoom. Measure actual memory/loading and frame delivery before selecting a production atlas strategy; consider direction-specific loading once coverage stabilizes.
4. Add role-specific artillery/cavalry/melee detail, then review fatigue, casualty, rally, and retreat presentation as a complete formation.
5. Improve the result camera: an escaped selected formation can leave the defeat view focused outside the populated field. Also retain or clearly reconstruct the assault-sector chooser on resume when a confirmed destination exists.
6. Obtain human visual/drill and gameplay feedback, then apply the accepted family to other battles. Production/default promotion and itch.io upload require a separate release step.

This pass closes west-facing Union coverage and improves the reviewer. It does not justify a 10/10 rating or declare the art family finished.
