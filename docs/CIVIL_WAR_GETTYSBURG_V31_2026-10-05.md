# Civil War Gettysburg v31: reverse-diagonal close-combat art
Work date: 2026-10-05 (America/New_York). This is a focused local art pass; it does not regrade the entire game.

## Priority and result
Fill the remaining reverse-diagonal A-identity close-combat pair: rear-facing Union northwest and front-facing Confederate southeast. Four newly authored native sheets contain sixteen distinct poses. Each army gets low guard, low bayonet thrust, recovery and high parry, followed by stumble, knee drop, collapse and a settled non-graphic casualty. Their bodies share one independently measured contact reference per army; fallen poses retain their natural projection rather than being enlarged to standing height.

The four sheets are available only through the optional v31 art selection. Older art selections, the default selection, the B-identity fallback, gameplay rules, existing renderer, shot18 presentation, music and the accepted owner-v2 save repair are preserved. Local installation follows a separate exact-candidate Astra Max review and rollback-backed installer. The external completion and delivery receipts record installed checks; this document records candidate evidence and priorities.

## Play
After the scoped local installation passes, use [the optional v31 preview](http://127.0.0.1:5174/?artPass=gettysburg-v31&infantryScale=moderate) and choose Gettysburg. The existing live preview remains the user's preview. Temporary audit previews use an isolated browser session and are closed after verification.

## New art
| Army / bearing | Action | Poses | Native source |
| --- | --- | ---: | --- |
| Union A / NW5 | Contact | 4 | union-a-contact-nw-candidate.png |
| Union A / NW5 | Casualty | 4 | union-a-casualty-nw-candidate.png |
| Confederate A / SE1 | Contact | 4 | confederate-a-contact-se-candidate.png |
| Confederate A / SE1 | Casualty | 4 | confederate-a-casualty-se-candidate.png |

Sources are whole native 1254 × 1254 transparent RGBA PNGs with 627 × 627 cells. Public PNG exports are byte-for-byte equal to their original generated sources. All 16 solid-alpha cell margins pass the unchanged 16px minimum. No cropping, mirroring, recoloring, alpha repair or per-phase height normalization occurs in export.

Astra Max independently reviewed every cell, the paired uniforms/materials/body proportions and the anatomical roots. Fresh contact references are 370 px Union and 403 px Confederate. Root X follows the projected pelvis/hip; root Y follows a specifically selected boot, knee or forearm support. Detached rifles and raised boot soles do not determine later falling roots. Two draft Union support ROIs were narrowed to remove rifle-edge contamination before final approval.

The first Union contact attempt was rejected because its thrust resembled shouldered firing. Four early casualty sheets were rejected for unsafe margins. Nine built-in imagegen calls produced four selected whole sources and five retained rejected attempts. Prompt text, reference-source bindings, original paths and hashes are saved in the v31 image-prompt and generation-provenance manifests. The tool did not return a model identifier; no image-model version is claimed.

## Candidate verification
| Gate | Actual result |
| --- | --- |
| v31 native author/check/self-test | 12 exports exact ; 256 rejection cases passed |
| independent annotation regression | 15/15 methods ; 258 named rejection outcomes ; 0 errors/failures/skips |
| focused Gettysburg v31 | 25/25 |
| current art suite | 570/570 |
| current save-flow source behavior | 67/67 |
| field continuity | 61/61 |
| full gameplay pipeline | 1768/1768 |
| asset validation | 704/704 |
| production build | Passed |

All required processes use separately captured commands, cwd, raw logs and hashes. The early pre-export asset run failed 16 missing-export cases and is preserved as incomplete-candidate evidence; the completed required asset run above passed. No failures were skipped or converted into approvals.

Historical preservation uses five authentic before-file snapshots and an explicitly pinned v31 migration ledger. Only historical byte assertions for the declared changes are migrated. Current-code behavioral checks remain active. 36 old queries / 39,840 pose rows / 288 old Scene witnesses are preserved. The actual-current Scene test also reaches reverse-axis contact using confirmed public Move/Assault calls from the unchanged roster, then verifies both losses and all new phases. This deterministic Scene witness is distinct from the public browser playthrough.

## Public play and close-up review
An isolated public browser played Gettysburg through ordinary controls: three confirmed Moves around the flank (nearest visible destinations 151,600 / 151,151 / 350,230), then an Assault on Southern ridge. The UI showed southeast close combat by field 59. Pickett strength fell from 5224 at 59 to 4888 at 70; the Gibbon tooltip fell from 4772 before contact to 4407 at 70, confirming losses on both sides. Close-up and overview screenshots preserve the visible evidence. The two contacting formations remain dense, with some rank/rifle interpenetration; isolated poses are easier to read than every soldier in the crowded field. Numeric Union bearing/texture identity was not exposed in public UI; exact NW5 source selection is established separately by the current Scene tests. The normal combat state was saved, the page cold-reloaded and Resume chosen through public UI. At 70, restored strength, cohesion 53, morale 77, ammunition 41/42, suppression 19, contact status, AssaultReceived and destination 470,330 matched the pre-save public facts.

The assault-sector dropdown reset from Southern ridge to Nearest sector after cold reload, despite the restored saved order and destination. This is an inherited presentation-continuity concern to fix separately. At 1440 × 1000 the bottom command row remained reachable; public scroll, target selection and a Hold click were tested. That bounded observation does not establish every PC viewport's usability. Two paused battlefield screenshots were byte/pixel identical. The owned practice was publicly discarded, the fresh campaign remained turn 1 / 0 decisions, and the isolated browser was closed.

A separate explicitly synthetic export viewer inspected all 16 frames/four clips. Public controls showed both final fall phase 3 labels held and returned all four animated clips to phase 0 on Restart falls. Four served whole PNG hashes matched their originals. The viewer initially magnified independently sized canvases differently; root corrected it to common normalized extents across all four sources. A second control-redraw defect was corrected to redraw all 20 cards on input/change. The final viewer was verified at actual 0.86 and 0.74 factors: all 20 canvases had matching intrinsic sizes within each setting and equal CSS widths within animation/gallery groups. Larger animated cards and smaller galleries intentionally use different zoom. Full corrected frame-row captures 33–36 support the visual review; cropped preliminary captures are retained rather than relabeled as complete.

Audit-helper limits are explicit. The pinned browser CLI rejected a decimal click, so confirmed integer-coordinate destinations were used without private state injection. One overlapped wait caused receipt 057's raw wait evidence to be overwritten; that exact interval is not fully attested. Separate public facts/screenshots/route commands support the reported battle observations. The logger was changed to exclusive filename reservation and process-start helper hashes, and subsequent calls were sequential. A selection using '.86' returned Done without selecting the intended option; the final checks used actual option values 0.86 / 0.74 and verified them. No complete-custody, all-phase-live-gameplay or physical-motion certification is claimed.

## Scope and installation
Five existing files change: package registration, infantry policy/dispatcher, and two test-source historical-byte migrations. 34 new files provide four sources, eight public exports, four measurements, fresh annotations/review/author/tests, preservation artifacts and this pass's records. Package version and lockfile stay unchanged. All 1,468 unrelated baseline files remain exact.

The generic rollback-backed installer is reused unchanged at SHA256 653729e4958fb564b69314c1ae881861e0a8a14528a2e6beb5d9a25f78a94a10. Its previous fault receipts were freshly rehashed and retained as reused evidence; they were not executed again during this pass. The 39-file source scope, built/served bytes and external evidence are frozen before final independent review. Fresh installed native, annotation, focused-art, current-art, save and continuity checks plus the installed production build must pass, and the installed build must equal the browser-tested candidate.

External work/evidence: /Users/titansforge/Vault/Titans_of_War_Art_Work/civil-war-v31-20261005. Source and evidence inventories have explicit file, size and time limits. No public upload or default-art promotion is included.

## Remaining priorities, in order

Before the next large art batch, make the assault-sector selector preserve or deliberately reflect the restored saved order after cold reload. It is a small usability repair surfaced by this pass. Keep the owner-v2/checksum guarantees active.

1. Author the second Union identity's close-combat and casualty poses, beginning with the same southeast/northwest pair. This is the largest remaining mismatch inside mixed infantry formations, because B soldiers still use the accepted fallback.
2. Expand that B identity across the remaining bearings, reusing the same independent body-scale/support and gameplay checks. Preserve uniform variety rather than making every soldier identical.
3. Improve contact-front spacing and depth ordering so opposing ranks and rifles overlap less, while preserving combat rules, saved state and muzzle/world coordinates. Then review short transitions between authored poses, rear hand grips and high parries in motion. The current four-phase sequences are a meaningful improvement but are not a full physical-motion or historical-drill certificate.
4. Inspect very-low-alpha colored edge noise on contrasting terrain and high-resolution close-ups. Solid margins pass; the sources are not certified fringe-free. Any material source-art correction should be regenerated and independently reaccepted, not hidden by changing thresholds.
5. After the art family is coherent, conduct target-PC/Mac performance and human readability/playability checks, then decide on wider battle/default-art promotion and a separate release package.

Production/default/human/anatomy/drill certification and family-complete flags remain false. The pass improves a specific art gap; it does not justify an automatic 10/10 whole-game rating.
