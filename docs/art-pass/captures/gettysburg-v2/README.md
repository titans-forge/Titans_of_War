# Gettysburg v2 capture catalogue

**Date:** September 30, 2026. Local development build 0.29.0 with the current working changes. These are real browser captures, not generated promotional scenes. The query `fieldProfile=1` exposes the local presentation counters; `artPass=gettysburg-v2` selects the candidate family.

Desktop requests were 1280×720; returned browser-content captures are **1265×712**. The phone request was 390×844; its returned capture is **375×812**. Browser chrome/scrollbar sizing means the requested viewport and output pixel dimensions differ. Files retain their native JPEG bytes and use matching extensions. The explicit viewport override was reset after QA.

| Capture | Build/state | Interpretation |
| --- | --- | --- |
| [01 ready, intermediate](01-ready-focus-1280x720.jpg) | Candidate, opening deployment | Diagnostic only: early resize/focus left a black strip, and flag position was still under correction. |
| [02 ready, intermediate](02-ready-focus-corrected-1280x720.jpg) | Candidate, opening deployment | Diagnostic only: subsequent focus; not evidence of final flag interaction. |
| [03 Confederate ready](03-ready-final-1280x720.jpg) | Candidate, field time 0 | Final visual placement of taller standard; two figure identities in the ready formation. Captured before the later hit-area fix, which does not change the image. |
| [04 advance near the line](04-march-combat-1280x720.jpg) | Candidate, paused at field time 39 | Order received and formation advanced, taking casualties. Accepted fire/reload fallbacks may be visible; this does not certify correct marching contacts. |
| [05 compact layout](05-phone-layout-390x844.jpg) | Candidate, paused at field time 39 | All six formation orders and the roster remain visible in the compact layout. |
| [06 normal-game ready](06-default-ready-1280x720.jpg) | Default art, field time 0 | Accepted infantry with the new grounded/taller standard. |
| [07 normal-game flag selection](07-default-flag-selection-1280x720.jpg) | Default art, field time 0 | Click at the visible Pettigrew flag changed the selected roster/order status from Pickett to Pettigrew. Raised cloth is inside the corrected hit target. |
| [08 Union ridge during encounter](08-union-ridge-1280x720.jpg) | Candidate, paused at field time 39 | Landmark inspection and Union action fallbacks; permanent unit cards are absent. The yellow sector box is the temporary selected objective. |
| [09 Union ready](09-union-ready-final-1280x720.jpg) | Candidate, fresh encounter, field time 0 | Union ready family and historical field landmarks. Temporary objective inspection is active. |

The game uses representative formations and terrain; screenshots are not a reconstruction of every historical position. This session covered art/interaction smoke checks rather than the entire Gettysburg acceptance matrix or a full balance playthrough. See [build review](../../reviews/gettysburg-v2-build-review.md) for unresolved source and integration limitations.
