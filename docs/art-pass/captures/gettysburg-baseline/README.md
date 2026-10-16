# Gettysburg Baseline Capture Set

**Captured:** September 30, 2026  
**Local preview:** `http://127.0.0.1:5173/`  
**Candidate preview:** `http://127.0.0.1:5173/?artPass=gettysburg-v1`  
**Battle:** Quick battle → Gettysburg — The Field Between the Ridges → direct charge  
**Browser:** Codex in-app browser  

These are viewport captures, not independent art validation. The default and candidate scenes were opened from the same practice route with full ammunition. The candidate is opt-in and affects only the Gettysburg `ready` page.

| File | Viewport | State | Purpose |
|---|---:|---|---|
| `01-opening-field-1920x1080.png` | 1920 × 1080 | Default art, paused opening, fit view | Whole-field opening composition |
| `02-pickett-close-1920x1080.png` | 1920 × 1080 | Default art, selected Pickett, focus plus one zoom | Accepted ready-page comparison |
| `03-pickett-advance-1920x1080.png` | 1920 × 1080 | Default art, Pickett advancing, 2×, field minute 4 | Movement and formation-angle baseline |
| `04-active-overview-1280x720.png` | 1280 × 720 | Default art, paused around field minute 45 | Release-viewport hierarchy and field size |
| `05-active-mobile-390x844.png` | 390 × 844 | Default art, paused around field minute 45 | Mobile hierarchy and touch-sized controls |
| `06-art-pass-v1-ready-close-1280x720.png` | 1280 × 720 | Candidate art, paused opening, selected Pickett | Candidate at release viewport |
| `07-art-pass-v1-ready-close-1920x1080.png` | 1920 × 1080 | Candidate art, paused opening, selected Pickett | Direct comparison with capture 02 |
| `08-art-pass-v1-ready-detail-1920x1080.png` | 1920 × 1080 | Candidate art, maximum useful zoom | Pivot, silhouette, repetition, and edge check |

## Baseline observations

- The terrain, agricultural texture, named farms, and broad ridge-to-ridge composition are already strong.
- Unit information is correctly absent from the idle field and available through the command shell and inspection state.
- At fit zoom, objectives and force groupings remain readable, but unit detail becomes subordinate to a dense interface at 1280 × 720.
- At focus zoom, the accepted figures are clear but visibly reuse one identity and a small pose set.
- Standards use technically capable cloth deformation but remain large relative to individual figures and visually float above formations instead of reading as a bearer-led color party.
- The candidate figures improve anatomy, equipment, wool, leather, and human proportion.
- The candidate does not solve formation repetition because it still stamps one identity per army.
- Candidate pivots are adequate for evaluation, not ready for final animation production.
- No relevant browser console error or warning appeared during the captured path.

## Missing captures before promotion

- identical default/candidate artillery-fire frame;
- identical default/candidate close-combat contact;
- reload and recovery;
- organized fallback;
- wavering and route;
- strength-loss sequence;
- reduced-motion comparison;
- named-landmark close views;
- measured `fieldProfile=1` trace at matched camera and cache conditions.

The missing states are promotion requirements, not evidence that the current game is broken.
