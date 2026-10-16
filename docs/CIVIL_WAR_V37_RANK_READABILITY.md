# Civil War v37: clearer infantry ranks

The Gettysburg compact pilot now applies the existing 0.74 infantry size consistently across stationary, marching, firing, reload, close-combat and casualty poses. This is a presentation change: raw soldier feet, rank membership, slots, collision, formation frontage, casualties and battle outcomes stay unchanged. Fresh barrel-mouth offsets use the same supported size. Previously captured volley origins remain fixed when loading a save, including saves made with another size profile.

Use the local preview with:

`?artPass=gettysburg-v32&infantryScale=moderate&contactLayout=v33&standardContinuity=v34&animationContinuity=v35&dustContinuity=v36&rankReadability=v37`

Only the exact, single raw `rankReadability=v37` paired with exact, single `artPass=gettysburg-v32` enables this view. Encoded/duplicate/other-value selectors and other battlefields retain the previous behavior. The existing size selector and each continuity selector stay independently available. Omit the new selector for the authentic v36 view. No default artwork promotion or itch.io upload occurs in this pass.

## Why this was selected

An independent CPU diagnostic used actual atlas alpha, fresh production chroma removal, Phaser custom-pivot flip geometry and the Scene's body painter order at unchanged raw feet. It measured all live ranks, avoiding the earlier rear-rank-only bias. Its fixed-camera paired images omit flags, smoke and terrain and are source diagnostics, not browser screenshots.

Across the retained owned field46 sample, weighted own-formation overlap falls from 58.04% to 50.90%; worst live-target occlusion falls from 87.94% to 80.94%. Across controlled close-combat samples, weighted overlap falls from 58.19% to 50.83%, and worst target occlusion falls from 90.89% to 88.38%. There were no increases greater than 0.5 percentage points in the owned/contact samples or the tested idle/fire/reload line poses across all eight bearings. These measurements do not imply that every soldier is clearly visible.

Rear-only shrinking had hidden a previously visible rear soldier. Front-only 0.92 shrinking also worsened some targets, including 74 of498 owned scores and 578 of4096 contact scores by more than 0.5 percentage points. Those controls were rejected. Uniform small 0.74 uses the already accepted native-shot geometry and avoids scale changes during individual poses or reformation.

## Remaining art work, in order

1. Column reformation needs improved projected rank separation or redesigned occluding silhouettes. The uniform compact control still worsened 24 of 7168 controlled action scores by more than 0.5 percentage points, all during the tested line-to-column transition. Gibbon #27's NW walking silhouette worsened by 5.66 percentage points; Pickett #31's south column silhouette changed from 2 visible thresholded pixels to 0. These are retained exceptions, not a claim of universal improvement. Avoid a dynamic size switch that introduces new pose/resume discontinuities.
2. Some close-combat bodies remain heavily hidden even with the compact pilot. Refine projected spacing and individual silhouettes while preserving raw combat feet and verifying all bearings, firing, loading, turning and casualties. Do not repeat rear-only shrinking.
3. The faint native warm/cold contact difference remains unproved. The v36 field47 public element screenshot pair had 632 changed pixels, maximum channel 25. Its source facts matched, but the source recorder omitted actual Canvas raster inputs. No production frame, pivot, smoothing or camera fix was guessed. The v37 public capture records intrinsic Canvas PNGs as well as before/after element screenshots and exact DOM/DPR facts. Any new equality only applies to that new trial and cannot retrospectively erase the v36 failure.
4. After column/contact silhouettes are acceptable, assess the pilot in the other battles and with independent human play. This Gettysburg pass does not certify the full game as 10/10.

## Verification and provenance

The focused suite imports the current physical Scene and native modules. It compares the new gate to the existing small profile through actions and bearings, verifies disabled behavior against the authentic installed v36 archive, checks raw/combat/standard/flag preservation, and exercises fresh versus historical shots, pause and save/resume. Historical fixtures, migration ledgers and behavioral assertions remain immutable; only the v36 metadata reader receives an exact adapter for the new archives. Existing dependencies and assets are reused without installation.

Execution totals, native/element pixel comparisons, served-build hashes, independent Astra Max decision, rollback and final installed status are recorded in the work folder's final delivery receipt:

`/Users/titansforge/Vault/Titans_of_War_Art_Work/civil-war-v37-20261006/delivery-receipt.json`

Comparison art and complete measured exceptions are under `row-probe/` in that work folder. The rendering diagnosis is under `renderer-diagnosis/`. Test executions overlap across composite suites and must not be reported as unique tests or human validation.
