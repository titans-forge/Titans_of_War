# Gettysburg v28: Union north and northwest stationary actions

The normal Gettysburg preview `?artPass=gettysburg-v28` adds ready, aimed fire, cartridge loading and ramming poses for both stable Union soldier identities facing north and northwest. Four whole native sheets provide 16 poses and 12 clips. The selected policy now has 66 atlases and 114 clips. Ordinary stationary actions cover all eight bearings for both Union identities; north, northwest and northeast marching still use their exact previous fallbacks. This does not complete the infantry family.

## Artwork and registration

Thirteen actual built-in imagegen requests produced four selected whole originals and nine rejected sheets. Early failures included inadequate cell clearance, mixed NE/NW bearings and likely reflected kit placement. Rejected originals and exact generation records remain in the external work directory. The final northwest sheets and B-north sheet came from built-in whole-image edits; no host-side raster warps, mirrors, resampling, alpha editing or individual phase resizing were applied. The accepted PNG exports are byte-identical to their complete generated sources. The model identity was not exposed by the tool.

All four sheets are native1254×1254 RGBA, with equal627-pixel cells. Solid alpha64 clearance remains at least16px without an exception: minimum A-N25, A-NW123, B-N24 and B-NW128. A retains a black pouch; B a brown pouch. The corrected rear NW bearing and left-side canteen remain consistent across all four actions. Source review finds comparable head, roll and limb proportions within each sheet and coherent kit across bearings.

Each sheet uses its own freshly inspected ready/load/ram median from fixed cells[0,2,3]: A-N375, A-NW259, B-N378, B-NW255. That one reference is shared by all four phases of the same sheet; no per-phase height correction. Sixteen independent projected-pelvis/support-sole registrations, cap/sole ROIs and four fire muzzle points are bound to the exact source review. Native extrema and normalized anchors are independently reproduced from actual pixels.

The northwest sources have fewer native body pixels and softer small hand, fitting and muzzle detail at close zoom. Some rear firing grips, cap crowns and muzzle openings are occluded; exposed cap rims and barrel-mouth points carry documented semantic uncertainty. Colored and low-alpha fringe remains. These are model-assisted observations, not anatomy, drill or equal-detail certification.

Actual Astra at Max source review SHA256 `d02158dc16c249ed9fd6d0c6361c7a6b178d8d4c9e361d8f14aa986b1ce05686`; annotations SHA256 `50a5da0cdd179d0dc23ff36f301f4cd572e08a10dfb9df9224ef5583167e6d1e`. Source acceptance is separate from final installation acceptance. Prompts and reference hashes are saved in `docs/art-pass/candidates/gettysburg-v28/GENERATION_PROMPTS.json`.

## Integration and verification

The new narrow helper checks army, stable identity, action, exact bearing, source key, frame order and the dedicated nativeUnionNorthernSequence marker. Missing action phases withhold that complete action while preserving siblings and the other identity. Older policies reject the new capability. Shared pose timing, recoil, muzzle motion, two-stage reload, v18 four-stage Confederate east reload, shot18 and checkpoint22 are preserved. No engine, Scene, geometry, campaign, music, storage or default-art changes.

All six candidate gates pass:46/46 targeted,507/507 current art,641/641 asset suite and1,666/1,666 gameplay checks, zero failures/skips/cancellations/todo; all native authors and the production build also pass. The new author's actual `--check --self-test` verifies12 exports and377 rejection cases on Python3.9.6:366 record mutation definitions plus11 applicable host helpers. Independent coverage binds the definitions to the executed aggregate result; the CLI does not emit individual case telemetry. All23 older authors remain byte-preserved.

The authentic pre-selector fixture preserves24 prior policies,62 atlases/102 clips,66 prior source pairs,1,770,496 pose outputs and49,152 contact outputs. Its SHA256 remains `190f76ff549e1af1bedc0d9d73d5d2f9df4103e0a208dcd2f53e441f20eb3149`; recapture after enabling v28 is refused. Protection covers210 records/202 unique paths, including22 shared modules,12 old fixtures and176 prior art/integration files.

Actual-source Scene diagnostics cover12 inherited old/new cases,12 retained public contact routes,4 new N/NW public routes,60 fall ages,48 resolution cases,12 real resolver-loss cases,12 stationary cases and6 unchanged N/NW/NE marching addresses. All12 new clip addresses and16 poses are bound to exact sources, pivots, references and shared shot motion. All32 fallen bodies per retained axis remain exact:24 native/eight fallback. Correct resolving hot/cold presentation is exact in48 cases. The inherited immediate-before-first-draw re-save WALK edge remains13/25/25/13/25/25 in both versions; ordinary first-draw/re-save remains exact.

Development failures are retained. The first candidate runs had three failures:43/46 targeted,504/507 art,573/576 initial asset-stage tests and1,663/1,666 gameplay. The new reload fixture changed a NE facing to N/NW and jumped forward before settling the turn; both unchanged v27 and v28 correctly presented WALK. Only the new test fixture changed: draw the final bearing at7.08 before advancing to9, retaining every assertion. The three formerly failing tests then passed3/3 before broad reruns. The external Scene runner also initially set cold resolving from outcome alone, contradicting the actual pending-outcome/snapshot.resolving contract; correcting that runner passed under both policies. An initial external native audit filename filter omitted the atlas/gait authors; its corrected audit passed. No protected runtime, authentic fixture, author or source was changed to satisfy these oracles.

## Genuine public playthrough

Three full-ammunition practice approaches were played through public controls, with Pickett's Division selected and no state/storage injection. Each used Move(220,620), Move(220,170), then the listed final destination and Assault Southern ridge:

| Approach | Final destination | Actual displayed pauses | Selected contact facts |
| --- | --- | --- | --- |
| North |470,170|13,36,46,48,54|steady,S,5,256/5,404 strength,69% cohesion,90% morale,42/42 ammo|
| Northwest |370,170|13,36,44,45,53|steady,SE,5,288/5,404 strength,70% cohesion,91% morale,41/42 ammo|
| Retained northeast |580,170|13,36,53,66|shaken,SW,5,090/5,404 strength,61% cohesion,82% morale,41/42 ammo|

North and northwest selected contact facts/time restore exactly after Save and leave, page reload and Resume. Two paused whole JPEG captures per new approach are byte-identical. Cold camera/selector pixel equality is not claimed. An earlier attempt ran too long between tool/capture calls, paused at45/133/239 and routed; its actual observations are retained and the practice discarded before the successful replay. Browser times and combat totals are observations, not reproduction of the headless route clock.

Close zoom shows coherent north/northwest responses and the retained NE art. Packed ranks still hide weapon and casualty details; screenshots do not verify every one of the16 phases or continuous animation. Source/phase binding is additionally verified by the actual-source automated Scene tests, which use display doubles and do not constitute browser pixels.

At requested viewport390×844, document width375, all six footer commands measure48px tall within bounds, ending at y820. The screenshot is375×812 JPEG; DOM geometry establishes layout fit, not native-device pixel certification. No captured page warnings/errors. All owned practices were discarded, the new QA tab closed, viewport reset and only the owned5175 preview stopped. The existing unowned tab and existing5174 preview PID90098 were preserved. Initial/final visible campaign facts match:turn11,12 decisions, Chancellorsville failed-flank aftermath, resources67/18/21/82/99 and divergence15%. Audio listening, human usability and GPU performance were not measured.

## Scope and local installation

The fresh baseline has1,384 files/465,947,974 bytes; baseline map SHA256 `681ea88310dc67788fda278a7447707880cefcb20998c3742c58d2cb5e904fb8`. Scope is three existing and25 new files, preserving1,381 unrelated baseline files. Previous build backup:354 files/255,732,680 bytes. The browser-tested production build has362 files/257,313,930 bytes.

The installer is byte-identical to the previously independently accepted version, SHA256 `653729e4958fb564b69314c1ae881861e0a8a14528a2e6beb5d9a25f78a94a10`. Its previous actual15/15 generic fault results and independent coverage are explicitly reused, not claimed as fresh v28 executions. Fresh exact v28 baseline, scope, candidate and evidence checks remain required. The narrow final expected-before-check to replacement/unlink instant race remains a known limitation.

Frozen hashes, independent Astra Max final acceptance, rollback-backed scoped installation, installed checks and exact whole-build comparison are recorded externally in `civil-war-v28-20261005`. Only successful bound receipts establish completed installation; this document does not pre-assert it. This is an opt-in local preview with no default-art promotion or public upload. Family completeness and production/default/human/anatomy/drill certification remain false. This increment does not establish a new whole-game grade.

## Next priorities, in order

1. Run a separate presentation-only formation readability study before generating more contact art. Compare a few uniform body sizes against the same feet,32 identities, simulation footprint, casualty anchors and combat outcomes. Bind matching native/fallback muzzle origins and cached-shot behavior; obtain actual screenshot comparisons and play observations. Current nominal body height47.56 world pixels versus small adjacent projected spacing is a geometry hypothesis, not measured alpha overlap. Raw slot spacing is normalized into the footprint, so simply increasing a spacing constant will not solve it.
2. Complete ordinary Union N/NW/NE walking only with visibly alternating physical contacts from a validated pose source or separately scoped rig workflow. Distinct hashes do not prove gait.
3. Complete missing SE/NW A contact/fall pairs and B-identity partners, then exercise terrain/zoom transitions. Higher-quality individual sprites do not certify readable packed combat.
4. Repair the inherited immediate cold re-save WALK edge in a separate runtime increment. Obtain fresh human play and uniform/drill review before default promotion or extension to other battles.
