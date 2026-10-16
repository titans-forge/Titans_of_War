# Gettysburg v40: walking direction during held turns

This local pilot makes living infantry face their actual travel direction while walking into a new facing or physical formation at a stationary, held position. The prior renderer gave these soldiers the tactical front even when their feet moved sideways or backward. Independent installed-v39 probes found 20–21 direction disagreements in a 32-figure held turn and 30 in line/column reformation.

## How to try it

Append `locomotionHeading=v40` to the existing Gettysburg v32 pilot. Recommended combined query:

```
?artPass=gettysburg-v32&infantryScale=moderate&contactLayout=v33&standardContinuity=v34&animationContinuity=v35&dustContinuity=v36&rankReadability=v37&viewContinuity=v39&locomotionHeading=v40
```

Choose Gettysburg, the central Pickett charge, and Pickett's Division. Wait until Reload reads Ready, hold the division and lock its front. Use Face left/right or change line to column and back while time runs. Pause during the reformation, Save and Resume to check the accepted presentation. Each option remains independent; v40 does not turn on other pilot features. Its exact single query value requires the exact single `artPass=gettysburg-v32` value and Gettysburg. Duplicates, alternate or percent-encoded selectors disable the pilot. Other battles and the default path remain unchanged.

## Ownership and scope

`gettysburgLocomotionPresentation.js` wraps exactly one existing raw visual update. It measures each living figure's previous physical anchor and current raw foot position in world units. The existing .015 local-motion threshold excludes tiny displacements. A drawing-only copy carries the travel sector into detailed, realistic, family and native clip pose selection. The canonical raw direction still owns volley origins and combat-facing facts. Positions, feet, slots, gait distances, losses, actions, shadows, standards, dust, contact offsets and the engine are not rewritten.

Eligibility is active, living physical infantry, held and steady, with a stationary center, no engagement, no melee, no reload, no recent volley and no resolving outcome. A real positive-time turn or ongoing assembly must have produced walking. Ordinary advances, rally, withdrawal, fighting fallback, routing, fire, reload, contact and frozen falls keep their established policies. In particular, fighting fallback intentionally keeps its tactical front toward the enemy. Zero-time geometry clamping is a separate existing behavior; this pilot does not turn it into a gait.

An optional, bounded primitive heading record binds the exact accepted base visual state and current safety facts. Restoration requires the existing base restore acceptance before that proof is consumed. Missing, malformed, mismatched or stale optional data falls back without rejecting a combat save. Descriptor-based inspection rejects accessors without executing them. Same-time changes to orders, geometry, engagement or raw feet revoke the drawing authority.

The independently enabled v35/v40 combination also preserves the latest sampled phase intent for a qualifying stationary heading episode when Save samples an engine advance before any drawing. It reuses the existing v35 transient token, binds the actual sampled view state and post-sample facts, validates again after sampling and consumes the validated token after drawing. It creates no serialized phase cache and no token for ordinary marching, reload or a positive no-motion sample. Resolving and reduced-motion policies remain authoritative. This repair addresses a separate installed-v39 witness with 23 changed native display commands; it does not establish native-pixel equality or explain the older residual below.

## Verification and retained limits

The focused suite uses actual rules-version-18 engines, raw updater, current physical Scene and native selectors. It checks both turn directions, line/column/skirmish changes, normal/reduced motion, canonical state equality, body-selector delivery, safety revocation, actual advance/volley/fallback, cold and repeated pre-draw saves, malformed data and exact disabled behavior. A Union draw-input witness checks the renderer without pretending the player can order enemy formations. Display-command recording is source evidence, not browser pixels.

Authentic installed-v39 bytes were captured before edits. The v40 migration reader protects 1,623 unrelated baseline files, original fixtures, prior migration ledgers and historical assertions. Four package registrations add the new suite. The existing v39 preservation adapter redirects only historical metadata comparisons to archived bytes; behavioral tests still run the physical current Scene. Local acceptance additionally requires the registered legacy/current/full gates, production build, public browser controls, exact served-byte binding, independent Astra Max review and a guarded rollback-capable install. Work-directory receipts record actual execution and acceptance; this document alone is not an acceptance report.

Remaining priorities:

1. Native walking art still has NW/N/NE family gaps. The corrected sectors can reveal an existing detailed-sheet fallback rather than native walking art. Create and inspect true alternating contact frames before accepting new sheets.
2. The previous 5,830-pixel native body/effect save/resume residual remains unresolved. This direction and display-command repair does not close it.
3. Evaluate the new held-turn behavior with players before extending it to other battles or making it the default. This is a Gettysburg opt-in pilot, not an all-battle or whole-game 10/10 claim.

No new artwork, dependencies, public upload or default art promotion belongs to this pass. Prior failed source attempts and generated-art rejections remain retained in the work directory.
