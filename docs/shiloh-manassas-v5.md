# Shiloh and First Manassas: field rules v5 and art pass

New campaigns use battle rules 5 within save envelope 9. First Manassas and Shiloh use v5; Gettysburg still uses v3 and the other field battles use v4. Existing saves retain their original battle rules. The paused pre-battle upgrade button can opt one older encounter into the update without rewriting past results.

## Mechanics

First Manassas attack choices A/D require two organized supporting infantry inside the Union battery line for eight uninterrupted field minutes. Elzey's representative Shenandoah brigade arrives at minute 48 if its deployment footprint is clear. The attack deadline is 140; the defensive interval remains 105. No strength, morale or ammunition bonus is applied on arrival beyond the normal scenario/supply initialization. Elzey needs an explicit player order.

Shiloh attack choices A/C use the same supported-control rule at Pittsburg Landing. Hurlbut responds once when organized Confederate troops threaten the landing, using physical movement and the existing morale/combat rules. Buell's existing arrival remains unchanged.

Capture requires infantry pairs within 340 field units, both inside the marked area. Direct movement, withdrawal, fallback, rally, routing and broken formations cannot capture. Organized enemy infantry or functional guns contest it and reset the timer. Destroying enemy strength alone cannot bypass capture. Assault now presses defenders inside its destination sector instead of halting at the boundary. Retreat and explicit Rally behavior from the Gettysburg work remain intact.

The brief supplies an optional opening plan. Every formation, destination preview, confirmation and Assault command remains under player control. The objective panel reports control time, supporting infantry, enemy defenders and the actual deadline. Guns now count toward the v5 sector display, including before the clock starts.

## Art

Three versioned WebP assets: a golden Virginia pasture for Manassas, a greener Tennessee landing approach for Shiloh, and an oak canopy with true alpha for the shared field renderer. Ground plates are generated illustrations, not historical survey maps. Terrain cover is still derived from authored zones. Trees are baked once into the scenery, clipped to woodland and away from roads/clearings. Terrain-rule overlays can be hidden while physical scenery stays visible. Field-sector labels are shorter and sit at the bottom of their regions to reduce overlap with formations.

Built-in OpenAI image generation was used; its backend model identifier was not exposed. Full prompts, original hashes, exported dimensions and asset hashes are in field-art-v2-prompts.json and field-art-v2-manifest.json. Original masters are preserved in the working task's Art output folder. A first Shiloh image with misplaced baked woodland was corrected before integration. Existing music, original image files and the distribution ZIP were preserved.

## Verification and limitations

585 Node tests, content and agent-contribution checks, asset validation and production build pass. This includes 44 new mechanics tests and a fixed 28-trial attack cohort. All 352 v1–v4 traces match the previous build exactly across 11 battles, four choices and two command policies. The cohort retains both successful supported attacks and failed hold/withdraw/unsupported advance policies. We did not change those failed results to improve a score.

Browser playthroughs completed both attacks through normal UI commands. Manassas scored 97/100 with 10% Confederate losses; final Shiloh scored 99/100 with 3% Confederate losses. Those are in-game mission assessments, not product quality ratings. A 390×844 Shiloh check exercised staging, confirmation, formation changes, sector selection, Assault, pause, Fit and responsive resizing. All ten field-battle openings rendered with no reported browser warnings/errors. Gettysburg itself was regression-tested but received no new art in this pass.

A fixed opening winning at several readiness levels proves a viable path, not balanced replayability. Shiloh still allows a low-casualty flanking success while much of the Union line survives elsewhere. Wider enemy coordination, player variety, recovery tactics and difficulty tuning need independent play sessions. Unit poses/formation animation, additional tree varieties, distinct terrain for remaining battles, historically reviewed equipment and richer battle-specific landmarks remain the highest-value art work. Do not label the game 10/10 from automated checks or command scores.

## Historical scope

NPS records late Confederate reinforcement from the Shenandoah and the brigade's role in extending the left at First Manassas. Minute 48, brigade strength and the 140-minute attack interval are compressed game parameters, not claims of exact historical deployment.

- https://www.nps.gov/civilwar/search-battles-detail.htm?battleCode=va005
- https://www.nps.gov/mana/learn/historyculture/confederate-order-of-battle-first-manassas.htm

OpenAI announced Images 2.5 on September 8, 2026. The built-in generator available to this task does not provide a model selector or identity receipt, so the assets are not attributed to an unverified backend variant.

- https://openai.com/index/introducing-chatgpt-images-2-5/
