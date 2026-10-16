# Gettysburg v8: southwest infantry implementation

October 2, 2026. Local, opt-in art pass. Historical Gettysburg only, selected with `?artPass=gettysburg-v8`. Default art and battle rules are unchanged. Nothing was uploaded or released.

## Result

Four freshly generated native sheets add Union A/B southwest marching, ready, fire and two representative loading states. They supply eight complete action clips. The v8 set retains the ten v7 atlases, for fourteen atlases and twenty-eight clips. Missing directions, identities, textures or metadata fall back to the existing accepted artwork; they do not borrow another candidate facing or mix phases from different sources.

The developer motion reviewer now offers A and B S-to-SW marching, action and turn comparisons, plus SW A-to-B comparisons. Turning inspection switches explicitly between discrete source views; it is not interpolated skeletal animation. Source registration uses one measured body reference per sheet and separate measured roots and actual barrel-mouth anchors. Native pixels were not cropped, rescaled, rearranged or cleaned on disk. Public PNG exports are byte-identical to the reviewed native sources.

Shared version policy now governs the registry and renderer. Candidate atlas metadata is read from selected, loaded Phaser textures at scene creation instead of eagerly importing every atlas JSON into the application. Unselected passes do not preload candidate textures or read their clip metadata. Existing fallback textures remain available.

## Art review

See [native source review](gettysburg-v8-native-source-review.md), [exact generation prompts](../prompts/gettysburg-v8-southwest.md) and [source annotations](../manifests/gettysburg-v8-source-annotations.json). The built-in image tool did not expose a model identifier. Nine native outputs were inspected; rejected attempts remain in the candidate directory with their reasons recorded. The first action guide also remains preserved as rejected after firearm cell bleed; its replacement was rendered natively with a different root.

Observed march chronology is native cells `[0,3,2,1]`, established by fresh leg-chain inspection rather than the requested row order. Final ready carry agrees with marching carry. An extra rifle and mismatched carrying side in earlier action attempts were rejected.

All four final sheets clear the unchanged alpha-64 solid-padding threshold of 16 px. A march, B march and A actions have minimum margins of 64, 63 and 53 px. **B actions have only 18 px**, meeting the existing threshold but missing the requested wider 32–40 px margin. Low-alpha edge residue remains; the blue diagnostic is not an exhaustive fringe detector. B identity distinction is subtle. These are preview decisions, not full-family, historical, anatomical or production certification.

## Verification

Commands ran in the isolated candidate copied from the current working game, with the original installed dependencies:

| Gate | Result | Evidence |
| --- | --- | --- |
| `npm run test:gettysburg-art-current` | 58 passed, 0 failed, 0 skipped | `gettysburg-v8-focused-tests.log` |
| `npm run validate-assets` | 192 test passes across 14 subprocess summaries; no failures or skips | `gettysburg-v8-assets-tests.log` |
| `npm run test:gettysburg` | 81 passed across 3 subprocesses; no failures or skips | `gettysburg-v8-mechanics-tests.log` |
| `npm run validate:gettysburg-native` | Native v5–v8 source/export checks passed | `gettysburg-v8-native-validation.log` |
| `npm run build` | Production build passed; existing large-chunk warning remains | `gettysburg-v8-build.log` |

Focused gates cover actual renderer methods, installed Phaser atlas parsing, real native/export hashes, complete-action fallback, stable identity selection, frozen/reduced-motion behavior, effect anchors, selected-only preload and missing metadata. These overlap the asset suite and should not be summed into an independent total. Independent model-assisted source and implementation reviewers found no additional actionable integration defect. Automated and model-assisted checks are not independent human balance or historical validation.

The fourteen candidate atlases total 7,292,440 bytes of PNG plus JSON (about 6.95 MiB). Their nominal RGBA storage is 88,060,896 bytes (about 84 MiB), an increase of about 24 MiB over v7. See [budget and source/public/build hash receipt](../manifests/gettysburg-v8-preload-budget.json). Nominal RGBA is not measured GPU, peak or process memory. File lengths are not measured HTTP traffic and exclude terrain, fallback art, audio and application payload.

## Browser evidence and limits

One external Chrome tab and one local preview server were used, avoiding additional Codex panels. The reviewer loaded the new sheets and the registered S/SW fire comparison was inspected and captured in [this image](gettysburg-v8-captures/v8-s-sw-fire-review.jpg).

In a v8 Gettysburg practice battle, the UI accepted assault, delivered its command, reported destination `430,385`, advanced field time from 0 to 2, and responded to pause, speed, landmark and zoom controls. Selecting a landmark deliberately pauses the battle. The visible document was not hidden. No full encounter or v8 board-scale visual approval is claimed.

Battlefield captures subsequently timed out after 5 seconds. A matched v7 Gettysburg practice opening also timed out, so this does not isolate a v8 regression. The renderer uses Canvas; no WebGL framebuffer diagnosis is asserted. Frame delivery was slow, but no quantitative player-frame-rate measurement was obtained. The source reviewer remained usable earlier; later browser scroll also timed out. The capture/frame-delivery cause is unresolved. Earlier v7 opening/active screenshots are retained as baseline evidence, not mislabeled v8 footage.

## Ranked next work

1. Resolve the shared live Canvas/browser performance and capture boundary with matched v7/v8/default runs. Measure frame delivery, decoded texture residency and close-view quality in a foreground browser. Complete a live assault, withdrawal and result before production promotion.
2. Add coherent Union W A/B and Confederate NE/NW marching/action groups. Keep exact direction and identity addressing. Generate and review one complete bearing group at a time while controlling decoded texture growth.
3. Fix the pre-existing survivor-ID reconstruction issue: after casualties and a formation change, checkpoint visual recreation can recompute casualty ordering from current slots. Test survivor identities through casualties, reformation, save and resume. This turn did not change that system.
4. Improve stationary B SW padding with a native rerender; retain the current preview until the replacement clears the wider target and a new all-cell review. Inspect fringe and weapon/grip geometry at actual game scale.
5. Add recoil/settling, contact combat, casualty and bearer roles with matched facings and mechanical event timing. Two loading pictures do not constitute a verified complete period loading drill.
6. Finish cavalry, artillery crews and remaining terrain/landmark work, then propagate only accepted components to other battles. Require a full family review and representative viewport/browser play before making the candidate default or packaging an itch.io replacement.

## Installation

The user authorized this local upgrade in the session. Install only scoped changed/new files into the current game, verify existing baseline hashes, keep rollback copies and verify installed hashes. Preserve unrelated checkout changes. The external installation receipt and rollback directory live under `/Users/titansforge/Vault/Titans_of_War_Art_Work/gettysburg-v8-20261002/`.
