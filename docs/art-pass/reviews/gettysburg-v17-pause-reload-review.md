# Gettysburg v17: current pause state and ordered reload

This is a local opt-in presentation update. Use `?artPass=gettysburg-v17` for the ordered reload; the pause correction applies to all eleven battles and earlier art previews.

## Corrected behavior

The running inspector updates on a 140 ms throttle. Previously, pausing between those updates could leave its clock and formation details behind the actual engine checkpoint. A running-to-paused transition now resets that throttle and publishes a fresh presentation snapshot synchronously. Destination previews, group placement/preview and location inspection share this path. Initial pause, repeated pause and running speed changes do not publish extra snapshots. Pending outcome resolution keeps its existing final retreat behavior.

The native two-state reload previously selected phases from a repeating visual frame counter. V17 derives progress from the saved last volley time, the existing half-second firing pose and remaining combat reload. The engine sets the duration once, including suppression and moving-fire costs, then counts it down. Loading advances to ramming once per reload, independently of visual frame or playback speed. No mutable presentation timer or new checkpoint field is required. Paused cached poses stay frozen; cold scenes derive the phase from the saved combat facts. Reduced motion remains static. Missing or invalid history uses the first loading pose; incomplete native clips retain the accepted artwork fallback.

## Preservation and verification

- V17 reuses the exact v16 selection: 36 atlases / 72 complete clips, zero extra selected pixels or downloads. Whole-field nominal texture estimates remain estimates rather than measured GPU residency.
- The preservation fixture was captured directly from the original before edits: all 14 old policies, 99,584 pose samples, 39 historical image/metadata pairs, 202 studies and 125 presets. Earlier policy/pose outputs and atlas bytes stay exact.
- Combat, formation visual-state, visual checkpoint, shot motion, mechanics and campaign storage retain their frozen module hashes. Only the scene and clip selector intentionally change among those eight protected modules; mandatory behavioral suites cover these exceptions.
- The actual-source pause suite reproduces the defect against the old scene and passes 28 checks on the candidate, including all eleven battles at 1x/4x, cold save, previews, reentrant pause callbacks, hidden pages and outcome resolution.
- Nineteen v17 checks use authentic atlas metadata, real Gettysburg volley timers and the actual scene renderer paths, including all eight Confederate bearings, strict shot identity, pause/cold resume and missing-frame fallback.
- Browser practice checks pause, save, cold load and paused resume at both speeds without issuing a facing/order refresh. Displayed clock, strength, cohesion, morale, ammunition, front and order agree before/after. The source/evidence reviews are model-assisted, not independent human validation.
- A bounded live approach brought Pickett into firing range. Ammunition fell from 42 to 39 after three volleys; early/late reload captures showed 2.4 then 0.8 remaining. Saving during that reload cold-resumed paused at field time 37 with the same visible formation state and 0.8 reload remaining. This is a real firing check, not a full encounter or a frame-by-frame browser proof of every pose.
- A separate reviewer compared 7,460 original/candidate combat checkpoints, sampled 1,387 native reload poses without regression, and checked 18 cold late-reload phases. These deterministic checks add independent implementation review, not human product or historical-drill validation.
- Full regression, art, asset, native-source and build results, installer fault checks, acceptance hashes, rollback and post-install verification belong to the external v17 receipts. Existing partial-method test fixtures now include the actual shared pause/publication dependencies; their assertions are retained.

## Remaining priorities

1. Author coherent aiming, shoulder attachment and intermediate loading transitions. The current two poses provide an ordered approximation, not a complete or historically certified musket drill.
2. Add real staff-gripping standard bearers, artillery service roles, and contact/casualty poses with consistent scale and ground contact.
3. Complete missing Union bearings and additional soldier identities with measured texture budgets and preserved fallbacks.
4. Optimize atlas allocation, then run complete encounters on named target PCs and obtain informed human/history review before default promotion or the remaining battlefield sequence.

This pass does not change default art, upload a release, alter combat/save versions, certify anatomy/history, or claim the complete game is 10/10.
