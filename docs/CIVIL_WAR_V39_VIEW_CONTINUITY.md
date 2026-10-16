# Civil War v39: Resume retains the battlefield view

The Gettysburg preview can now retain a player's zoom and pan when saving and returning to a battle. Previously the Scene always returned to the overview, then automatically focused the default formation on narrow screens. That lost a close-up and made warm/cold art comparisons use different framing.

Append `&viewContinuity=v39` to the existing preview:

`?artPass=gettysburg-v32&infantryScale=moderate&contactLayout=v33&standardContinuity=v34&animationContinuity=v35&dustContinuity=v36&rankReadability=v37&viewContinuity=v39`

The exact single raw selector, paired with the exact single `artPass=gettysburg-v32`, enables this Gettysburg pilot. Missing, encoded, duplicate and unknown values retain the earlier behavior. Existing artwork and all earlier continuity options remain independently available. This adds no default art promotion or public upload.

Only optional renderer metadata changes: `presentation.fieldView` records the current world center, zoom, overview/free intent, version, scenario, world size and presentation time. Capturing the current camera scroll avoids a stale midpoint immediately after a pan. An overscroll is bounded as the camera would be on its next render. Resume accepts only matching plain data and clamps to the current viewport. Missing or malformed metadata leaves the ordinary initial view and combat save usable; saved accessors are not executed.

An overview refits the new screen. A focused, zoomed or panned view returns as free framing, independent of the initially selected formation. Selection is unchanged; clicking Focus again still focuses the selected unit. An accepted restore prevents the initial phone auto-focus from replacing the saved view. Automatic resizes use its saved center and zoom as an intent anchor, bounded to the current screen each time; a transient larger canvas cannot permanently shift the view or raise its zoom when it shrinks again. Explicit pan, zoom, Focus or Overview leaves this restored free mode and uses the ordinary controls. A checkpoint still records the actual visible, clamped framing. Saving again before the first draw preserves the accepted framing.

The engine, raw soldier feet and slots, animation inputs, casualty membership, native art, body scale policy, firing origins, cached shots, standards, effects, campaign storage ownership and checksum algorithm remain unchanged. The new focused witnesses evaluate current physical Scene code and the unchanged Phaser BaseCamera math; the Node display recorder does not prove actual Canvas pixels. Owned public-control browser checks provide rendered evidence separately. Existing protected tests and historical fixtures/ledgers are preserved.

## Art findings retained from this pass

Two new Union A northwest march sheets were generated and independently rejected because they repeat the same contact-leg arrangement instead of establishing a complete opposite-contact/passing cycle. Neither is installed and Union B was not generated. Sharper detail alone did not meet the preregistered motion requirement. The native NW/N/NE Union marching gaps remain.

Source probes also found per-soldier displacement directions differing from the formation front during stationary turns and Line-to-Column reformation. Changing only the drawn direction would lose it on paused cold Resume and could redirect forced firing samples. A future locomotion pilot needs independently reviewed primitive heading persistence and matched fall/shot handoff. This camera pass does not fix that issue or claim a historical drill certification.

The earlier pre-first-draw WALK edge reproduces with animation continuity disabled; the new bounded probe found no body changes in its 36 v35-enabled cases. This does not erase the earlier v36 native screenshot anomaly. Previous v38 camera-confounded comparisons remain retained historical evidence rather than being relabeled as fixed pixel trials.

Exact local test executions, public screenshots, source/build hashes, independent review, rollback and installation status are recorded outside the game source at:

`/Users/titansforge/Vault/Titans_of_War_Art_Work/civil-war-v39-20261007`

The first public attempt caught a further map-edge drift: the Resume layout temporarily enlarged the canvas, clamped the view, then preserved that temporary clamp after shrinking. Its original source, successful technical gates, failed native framing witnesses and full build are retained. The intent anchor was added only after preserving that failure and a current-Scene/BaseCamera failing reproduction. A second public attempt confirmed exact phone and repeated-layout pixels, with the original desktop body/effect residual retained separately. Astra then caught an additional order: cold Resume initializing on a larger screen must retain the validated original zoom separately from its initially bounded zoom. That source revision, successful gates, full build and public evidence are also retained. Final acceptance must bind the latest revision, fresh gates and a new public initial-large-screen witness.

Overlapping suites are separate executions, not unique test totals. Local technical acceptance does not certify a human ten-out-of-ten grade, historical anatomy, a physical phone/Windows PC, GPU performance or a public release.
