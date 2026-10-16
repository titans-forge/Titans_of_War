# Civil War v32: Union B close combat and restored assault selection

Started October 5, 2026; verification continued October 6. This pass addresses the next two concrete gaps found in the v31 playthrough: Union uniform B still used older southeast/northwest melee and casualty poses, and the assault-sector dropdown displayed “Nearest sector” after cold Resume even when the restored formation was assaulting the left sector.

## Changes

The assault selector now derives its initial value from the selected formation's pending or received assault order. Explicit choices remain local drafts for each formation and take precedence over repeated snapshots. Switching formations displays that formation's own choice. Astra's implementation review also caught a field attack-plan callback still calling the removed setter. Actual Manassas and Shiloh button clicks reproduced the error; the corrected callback selects the intended formation, records its draft sector and pauses without issuing an engine order. The change adds no order, campaign-save or battlefield-checkpoint fields.

The optional `artPass=gettysburg-v32` adds four whole transparent source sheets: Union B southeast and northwest contact and casualty. Each sheet contains four native phases. It retains the v31 atlas family, stable A/B identities, the three body-scale profiles and the v18 shot presentation. Other bearings, other battles and older art selectors retain their existing behavior. The existing battlefield renderer, formation geometry, combat, music and saved presentation code are unchanged.

## Source review

Generation uses the built-in image tool with the accepted Union B uniform references. Whole original PNG bytes are retained; there is no asset cropping, recoloring, mirroring, alpha repair or phase-by-phase scale normalization. Independent Astra Max review must accept the actual action, uniform, padding, projected anatomical roots and common contact/casualty scale before export. The tool did not return a model identifier.

Fourteen actual image-tool calls produced four accepted originals and ten rejected attempts, all retained in the external generation ledger. The second northwest casualty source passed padding but failed the action review: kneeling and final poses still appeared to aim a rifle. A later source fixed the action but enlarged the cap and boot by approximately 28–30% compared with the contact source. Independent review rejected that pair too. The final northwest source lowers/releases the weapon, finishes in a relaxed grounded rest, matches the accepted B anatomical scale and passes the unchanged alpha-64 padding minimum of 16 pixels in all four cells. Geometry checks alone cannot establish that a casualty pose is suitable.

Astra accepted the exact four-source group for local opt-in export. Fresh contact reference heights are SE 412 and NW 382, shared unchanged with their respective casualty partners. All 16 registrations were independently measured and reproduced. Public PNGs are byte-identical to their accepted whole originals.

Source acceptance is limited to these four addresses. It does not certify every bearing, historical drill, physical anatomy or human usability. Partly obscured grips and low-alpha edge color remain inspection limitations.

## Verification and release boundary

Candidate gates passed with no failures or skipped cases:

| Gate | Observed result |
| --- | --- |
| Full game pipeline | 1,810 Node test executions |
| Current art | 596 Node test executions |
| Asset pipeline | 730 Node test executions |
| Focused v32 contact | 26 cases |
| Assault-selector and actual staging clicks | 16 cases |
| Current v31 behavior | 25 cases |
| Save flow / field continuity | 67 / 61 cases |
| Native author | 12 outputs; 272 distinct observed rejection cases |
| Annotation tests | 15 methods; 278 named rejection outcomes |
| Production build | Successful; 386 files, 265,208,509 bytes |

These counts describe their respective command executions; overlapping pipeline coverage is not added into a unique-test total or treated as human playability certification. Native/annotation checks used Python 3.9.6. The main Node gates and build used Node 26.0.0; the browser CLI uses its pinned Node 22.23.2 runtime. The earlier external entrypoint inventory ran under the task's ambient Node 22.23.2 context and is labelled as named dependency coverage, not a complete vendor inventory.

The first new resolver fixture incorrectly computed separation from a donor's old position. It placed the pair about 113.75 units apart while the actual diagonal contact threshold was 45, so no losses or falling phases occurred. The original targeted/art/asset failures remain saved. Only the new test helper was corrected to establish the requested diagonal first; an initial actual contact-pair assertion was added and all phase/loss assertions retained. Fresh focused/current-art/asset gates passed. The sequential full pipeline's final new contact subprocess executed the corrected helper and passed all 26 cases; older production sources/suites were unchanged during that correction.

Public-control play and synthetic Scene-derived close-ups are recorded separately. Public Manassas and Shiloh staging checks passed on the exact built/served bytes: they selected Jackson/left and Hardee/right respectively, remained paused and produced no page errors. Gettysburg was played through two approaches into actual contact. In the northwest route, Pickett fell from 5,068 to 4,868 and Gibbon from 4,538 to 4,352 after cold Resume. The same saved checkpoint was also resumed through v32, v31 and v32 art selectors with matching combat facts. In the southeast route with reduced motion enabled, Pickett fell from 5,189 to 4,957 and Gibbon from 4,788 to 4,588. Cold Resume preserved the left assault sector, time, strength, cohesion, morale, ammunition and paused state in both routes. These are contact-segment checks, not full-battle wins or campaign certification. All isolated practices were publicly discarded; campaign progress and human browser storage were not changed. An earlier southeast CLI attempt rejected fractional mouse coordinates and then used a stale pointer. That audit operator error was retained separately and restarted with integer coordinates; it is not attributed to game mechanics. The separate synthetic viewer inspected all 16 new phases across 20 matched cards. Profile changes between .86 and .74 redrew all 40 canvases within unchanged dimensions, paused observations repeated exactly, and final falling poses remained held. These Canvas observations use current Scene-derived draw commands; they do not establish WebGL pixel parity. The isolated browser closed successfully. Its external summary and immutable inventory retain the raw command results, screenshot corrections and operator failures before final acceptance.

A saved baseline, fixed historical-byte migration ledger and scoped rollback installer protect unrelated local work. Historical behavior tests continue to execute current production modules and the current battlefield Scene. Final local installation and preview health are established only by the external acceptance, installation, completion and delivery receipts, after independent exact-candidate review.

The art remains opt-in. This pass does not upload a release or promote a new default art policy.

## Next larger concern

Contact crowding remains. Astra found that the current ground-position depth order already works; a tie-break would not resolve overlapping tall bodies and rifles. Moving only the visible live sprites would make falling soldiers jump back to their old positions and would lose the displacement after cold Resume. The ordered implementation and acceptance requirements for a continuous contact layout with saved casualty handoff are in `CIVIL_WAR_CONTACT_LAYOUT_NEXT_BUILD.md`. This pass does not claim that layout improvement has been built.
