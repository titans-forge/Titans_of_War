# Civil War v19 — mission clarity and command recovery

Date: October 4, 2026. Implements the next local priorities from the game-wide audit. Implementation and candidate verification are complete; exact independent acceptance, scoped installation and post-install checks are recorded in the work folder rather than inferred from this document.

## Completed, in priority order

### 1. Match alternate Gettysburg explanations to the actual battle

Gettysburg with Jackson now has a selected-strategy briefing, an expandable live mission checklist and a result explanation derived from the existing resolution rules. The immediate heights attack depends on timely surprise, Hancock's current field participation, Jackson's position, the condition of the Union center and retained strength. Other valid result paths, including center collapse and pressure at the deadline, are explained separately. A tactical win and completion of the chosen strategic mission are distinct.

Actual hill-presence markers remain accurate: an outcome does not silently turn contested ground into captured ground. Hancock's late arrival, prior departure and exhausted on-field troops receive distinct explanations. The wide turning movement can create timely surprise after Hancock enters; it no longer implies that every surprise happened before reinforcement.

This is a display adapter and assessment explanation. The combat engine, victory predicates, authored balance, engine events, checkpoint version, battle-rules version and replay digests are preserved. The adapter makes a detached, frozen presentation snapshot and leaves unrelated battles and unknown legacy wording unchanged.

### 2. Make Chancellorsville consequences follow the failed attack

The flank-march A aftermath now reflects a recorded defeat, rout or disciplined withdrawal. A failed attack opens **After the Failed Flank Attack**, with choices and briefings that do not claim Jackson already won. Successful attacks and older saves without a recorded result retain the authored default. Existing B/C/D context, IDs, numerical effects, routes and recorded chronicles are preserved.

### 3. Recover a blocked turn without losing the intended attack

When a blocked formation's current order is Advance or Assault, **Preview room to turn** remembers that attack and its assault sector. The player still reviews and confirms a normal move. The battle pauses when the clearance move finishes, including when another formation is selected. The reminder offers **Resume advance** or **Resume assault** once the formation has space and is out of close contact. Resuming sends a normal courier-delayed order.

Canceling an unconfirmed move leaves the attack unchanged. Canceling a group preview preserves a confirmed reminder; an accepted replacement order clears only the affected formations' reminders. Departure, routing and invalidated formations cannot resume a stale attack. The reminder lasts only while the battlefield is open, as its UI states; it is not persisted in saved checkpoints.

## Verification

| Check | Final candidate result |
|---|---:|
| Full gameplay suite, before the final layout-only correction | 1,401 passed; no failed, skipped, canceled or pending tests |
| Current Gettysburg art suite | 242 passed |
| Asset validation | 376 passed |
| Focused campaign, mission, recovery and presentation tests | 67 passed |
| Native-art validators | Passed |
| Production build | Passed; existing large-bundle warning remains |
| Installer fault fixtures | 8 passed; real game untouched by fixtures |

The original engine, Gettysburg mechanics, battlefield renderer, campaign storage, authored scenarios, campaign supply, headless campaign and package lock match the original baseline hashes. Art assets, default art policy and audio are unchanged by this repair pass. Earlier rejected engine-message edits failed the immutable preservation checks; those edits were removed, and the original gates passed without rewriting their expected hashes. Those superseded failures remain in the evidence folder.

Public-UI play checks use one owned tab at a time on an isolated production preview. They cover a real failed Chancellorsville A encounter and its cold-loaded campaign aftermath, Chickamauga turning recovery with explicit resume and group-order cancellation/receipt, and an alternate Gettysburg A encounter with its final mission explanation. Astra identified vertical clipping in the initial 390×844 Jackson checklist despite its lack of horizontal overflow. The final correction bounds the expanded body to a labeled, keyboard-focusable scroll region. A fresh production build reached the selected-mission requirement and bottom of expanded alternative conditions by keyboard, with all sector buttons and Begin battle visibly unobscured. The focused 67 tests and build were refreshed after this layout-only correction; unchanged gameplay, art and asset evidence was retained. This is browser emulation on one Mac, not a physical phone or Windows-PC test.

Astra at Max independently reviewed source behavior and factual edge cases. The model reviewer also checked 1,600 synthetic mission branches; branch consistency does not establish balance or human usability. The exact final review binds installed source and verification evidence by hash. Its receipt and the installation/rollback receipts live in:

`/Users/titansforge/Vault/Titans_of_War_Art_Work/civil-war-v19-20261004/`

## Next priorities

1. **Complete the coherent Gettysburg action family.** Finish matched contact, casualty and standard-bearer poses, artillery service roles and remaining Union bearings before expanding to more isolated figures. Review ready/march/turn/fire/load/contact/fall/rally/retreat at overview, ordinary and close zoom; preserve identities through pause, reduced motion, losses and cold resume. Keep new art opt-in until informed human art/history review and the existing preservation gates pass.
2. **Test command recovery with uncoached players, then improve resume preferences.** Camera, selection and display preferences still need a deliberate persistence design. Check the new flow with five novice players on move, supporting assault, reserve transfer, turning clearance, fallback and organized withdrawal; use completion and unintended-order observations to guide changes.
3. **Measure texture pressure and active play on a named ordinary PC.** Preserve missing-phase fallback coverage while investigating deferred loading, lossless packing and actual GPU/process memory. Collect cold-load and active 1x/4x frame traces; this pass supplies no new performance grade.
4. **Broaden balance and campaign causality tests.** Try sensible attack, defense and extraction plans across the four openings and three ammunition states. Review chronological transitions, commander survival and consequences on additional historical and alternate branches.
5. **Complete listening, keyboard/accessibility and release checks.** Retained music needs a fresh full listen alongside combat. Verify essential actions with keyboard-only input, reduced motion and non-color cues. Test itch iframe and Windows layouts before a separate release decision.

The prior game-wide **7.8/10 provisional assessment** remains the reference. This narrow repair pass closes specific defects; it does not certify the game at 10/10, provide new whole-game grades or establish independent human validation. Nothing in this pass is a public upload.
