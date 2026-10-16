# Field command v4 — all-battles adaptation

Local September 8, 2026 update. Ten representative tactical boards share the tested Gettysburg formation system, while Gettysburg itself remains on version 3. New campaigns and Quick Battle opt into version 4; old saves retain their recorded rules. A paused old-rule battle offers an explicit, one-battle upgrade. Save envelope 8 accepts known battle rules 1–4 and retains historical ledgers.

## Shared behavior

Orders use couriers and show queued versus received state. Move travels without offensive fire; Advance establishes a firing line; Assault commits infantry to a named sector. Infantry footprints constrain movement, pivots and friendly firing lanes. Artillery must limber and deploy, and uses directional gun and crew artwork. Suppression, support and facing matter alongside casualties. Fallback stays on the board; Rally is explicit and requires safe, supported recovery. Withdraw leaves permanently after a safe 220-unit disengagement, including 180 toward the correct rear, or at a rear exit. Routed survivors, organized withdrawals and captures remain distinct. Departure fades use field time and honor pause/reduced motion. The result freezes the actual battlefield instead of launching the losing army off-screen.

Cover is attached to map locations, not to the identity of the original defender. Scenario visibility limits also constrain artillery stopping range and the displayed fire arc. A blocked arrival waits with a visible warning until its deployment footprint clears; formations cannot respawn after withdrawal. Command sectors are destinations and occupancy indicators, not automatic victory points.

## Scenario adaptations

| Battle | Rules retained or adapted | Verified legal mission example |
|---|---|---|
| First Manassas | Henry Hill cover, reserve support and Union advance. Defense can succeed at minute 105 with two connected infantry formations on the hill, evidence of incoming fire, and no organized Union troops occupying it. | Option B: Line; Move Jackson to 520,640, Bee to 740,640 and Hampton to 940,640. Hold through the interval. Browser result: 96 command, 9% losses. |
| Shiloh | Confederate advance goes down-screen; Confederate rear exits are above. Johnston protection and Buell's arrival remain. | Option D: organized withdrawal toward the upper rear. Option B: protect command and preserve the force. |
| Chancellorsville | Timed flank arrivals, concealment/contact window and the compact defensive interval remain distinct. | Option A: deploy arriving infantry in Line and Assault the Flank road sector together. |
| Wilderness | Restricted visibility, road movement, Texans/Longstreet arrivals and premature commitment tracking. | Option B: hold until support arrives. Option D: organized retirement toward the lower rear. |
| Third Winchester | Middle Field/rearguard covering time, Crook, cavalry pressure and the lower-left corridor. Every Confederate formation must physically reach the corridor; distance alone cannot count. | Option B: hold until Middle Field covering credit reaches 18, then withdraw; option D uses the authored rearguard opening. |
| Cedar Creek | Dawn surprise, discipline, Sheridan's recovery and retirement with the train. | Option A: connected Line advance; option C: organized withdrawal. |
| Gettysburg with Jackson | Alternate-history heights race, surprise timing, Longstreet and Hancock remain distinct from July 3 Gettysburg. | Option B: connected Line advance and envelopment. |
| Chickamauga | Restricted sight, timed Brotherton opening, Dyer Field exploitation and Thomas's arrival. | Option B: concentrate and advance through the opening. |
| Cold Harbor | Geographic works and exposed approaches; the Federal assault now closes to contact. Transfer troops must physically exit while an occupied screen survives to the required time. | Option B: hold the works; browser result 98 command, 3% losses. Option D: withdraw designated transfers while retaining the screen. |
| Petersburg | Crater terrain, Mahone timing, containment, mines and two siege raid targets. A sortie only returns when both designated brigades exit in order. | Option A: Line advance with arriving support. Option B: containment. Option C: strike both targets and explicitly withdraw the raiding brigades. |

## Verification and limits

`npm test` passes 541 named Node tests, including 95 new field tests and the existing 60 Gettysburg mechanics tests, plus smoke/campaign/UI/content and agent-contribution checks. Asset checks and the production build pass. Vite still reports its existing large-bundle warning. A separate comparison reproduces all 264 previous-rule traces exactly across versions 1–3, all eleven battles, four choices and two command policies.

The final field suite runs 60 complete battles: all forty idle posture cases, nineteen successful legal mission sequences, and one failed uncovered Cold Harbor withdrawal. These are correctness and playability examples, not a player win-rate estimate. Failed exploratory runs remain in the audit evidence. Shiloh's attacking missions and Manassas's counterattack/diversion choices need further supported-attack balance work; successful preservation or defense does not prove those attack choices are well balanced.

The new overhead ground plate and baked terrain features eliminate the horizon/projection mismatch, but are representative maps, not surveyed geography. New faction standards are symbolic blue/red colors, not certified regimental flags. More distinctive farm buildings, woodland edges, terrain silhouettes and scenario-specific artillery placement remain art improvements for a later pass. Archive recordings remain the default soundtrack.

No public release, upload or new Git commit is part of this update.
