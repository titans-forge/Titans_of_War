# Gettysburg v10 Confederate diagonal art pass

The opt-in Gettysburg pilot adds Confederate A northeast and northwest marching, ready, firing and representative loading poses. These native views address turning across the Confederate front while retaining the exact v9 Union and north-facing sources.

Local preview: http://127.0.0.1:5173/?artPass=gettysburg-v10 . Choose Quick battle, then Gettysburg — The Field Between the Ridges. Source inspection: http://127.0.0.1:5173/?artReview=gettysburg-motion .

## Changes

- Four native transparent 1254×1254 sheets, with four 627×627 cells each: 16 new source frames and 8 action clips.
- 22 atlases/44 clips total, retaining v9's 18 atlases/36 clips byte-for-byte.
- Stable side, identity, action and bearing selection. Confederate B and unsupported views use existing fallbacks; no mirroring, faction borrowing or default promotion.
- Realistic gray-brown campaign jackets, pale trousers, cream blanket rolls/canteens, dark waist pouches and period long arms. Body-relative kit stays consistent as the view turns.
- Complete contact/passing sequences calibrated against native color-coded anatomical guides. Two passing poses needed explicit correction; a preliminary contact-duplication reading was withdrawn after the guide revealed different hip chains. Final row-major playback is accepted for narrow visual preview.
- One body reference across each whole source:430 NE march,420 NW march,380 NE actions,360 NW actions. Artistic pelvis/row registration is approximate; no per-frame rescaling.
- All native PNG pixels and bytes remain unchanged. Rejected/earlier sheets remain in the isolated work directory and are excluded from installation.

## Verification

The strict current-art suite passed 89/89 cases with zero failures/skips. A separate presentation, checkpoint, texture and performance suite passed 33/33. Native author checks across v5–v10 and the production build passed. Native/public/dist PNG hashes and public/dist atlas JSON hashes match.

All 300 normalized review poses from 75 registered studies fit at alpha8/64, including all 16 new frames. Minimum solid stage margin is 5.57 display pixels. Extremely faint alpha1-only native residue exceeds bounds in 57 pose instances (53 retained, 4 new); it is preserved, not represented as perfectly clean transparency. The selected native sources have at least 21px solid cell padding.

The browser source reviewer loaded the complete NE/NW action and marching comparisons without errors or warnings. Manual stepping covered every new phase. Automatic playback starts and pauses, and disabling it keeps manual stepping available. The new figures and complete weapons fit the registered 1× stage.

Actual Gettysburg browser practice exercised NE and NW fixed-front turning, a confirmed coordinate move, pause, save/leave, page reload and resume. Resume starts paused at field time 150 with Pickett selected, strength 5404/5404, cohesion 74%, morale 94%, ammunition 42/42 and NW fixed front retained. Camera/inspector display state resets on resume; this was not treated as combat-state loss. No browser warnings/errors were observed. This was focused art and checkpoint QA, not a full campaign, balance or human usability certification.

The browser's requested 1024×768 override did not take effect; observed DOM geometry was 1265×720. Captures therefore demonstrate that desktop layout only. No 1024px or mobile certification is claimed.

## Budget

The 22 selected candidate atlases contain 11,020,969PNG bytes (11,106,016 with JSON). The 4 new sheets add 2,034,844PNG bytes. Nominal RGBA source pixels total 131.97MiB, including 23.99MiB added by v10. The complete battlefield diagnostic reported 92 sources and 305.75MiB nominal RGBA versus the retained v9's 88 and 281.75MiB. These are source-pixel estimates, not decoded residency, peak/process/GPU memory, bandwidth or complete allocation measurements.

Observed ready times were 234ms for the v10 attack and 221ms after resume; retained v9 withdrawal was 346ms. Cache, scenario and playback workloads differ. These observations are not a comparative speed benchmark.

## Remaining priorities

1. Complete Union B east/southeast views without borrowing A; then continue missing side/identity/bearing coverage. This pilot still falls back where exact clips are absent.
2. Add recoil and settling, aim transitions, meaningful melee/casualty reactions and dedicated standard-bearer handling. Held fire/two loading sources do not form a complete historical drill.
3. Check transitions and body/kit continuity with independent human play and a knowledgeable historical reviewer before full-family/default approval.
4. Establish matched foreground performance tests and a candidate texture/residency strategy before broader promotion; the new native sheets add about 24MiB nominal RGBA.
5. Consider restoring camera/inspector preferences on resume as a separate convenience change. Current core formation and order restoration passed.

## Evidence and limits

The source-annotation manifest, per-source measurement receipts, separate kit/registration reviews and final anatomical-guide review bind acceptance to the exact native hashes. Model-assisted agreement is not independent human validation or physical/anatomical/historical certification. NE's partly hidden pelvis limits absolute support attribution; fingers, bore/socket details, recoil and verified loading drill remain incomplete.

Clothing/equipment context was checked against National Park Service Gettysburg educational material, linked in HISTORICAL_REFERENCES.json. These are representative interpretations, not exact regiment-specific uniform reconstructions.

Local installation uses a declared hash-checked file list and rollback copies; the original 544-file baseline is checked before copying. The default artwork, other battles, combat/campaign code, soundtrack, terrain and standards are outside this change. Public upload and full-family/default approval remain pending.
