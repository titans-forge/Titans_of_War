# Gettysburg v36: travel dust continuity and close-combat spacing findings

## Priority and scope

This pass addresses a concrete Save/Resume presentation defect before changing more artwork. It preserves the short-lived travel dust behind moving troops. Soldier images, flags, raw feet/slots, firing geometry, combat, save ownership/checksum algorithms, assets and other battles retain their existing behavior. The optional independent Gettysburg gate is `artPass=gettysburg-v32&dustContinuity=v36`; the contact-layout, standard and native-animation continuity gates remain independent.

Local preview after verified installation: `http://127.0.0.1:5174/?artPass=gettysburg-v32&infantryScale=moderate&contactLayout=v33&standardContinuity=v34&animationContinuity=v35&dustContinuity=v36`.

## What the diagnosis establishes

The previous public v35 continuation/re-save/cold-resume comparison retained 2,269 changed canvas RGB pixels. A new current-source recorder used the exact final owned field46 primitive save (time 46.74999999999948), actual native clips and production flag functions. After another 1.2 seconds of real Scene updates, native bodies, raw feet, slots, shots, retained carriers, flag transforms/cloth frames and combat matched warm/cold reconstruction. Warm normal-motion dust produced 24 draw commands while cold dust produced none. Reduced-motion dust was empty on both paths.

Dust explains a concrete missing effect around the moving Hancock formation. It does not by itself establish the cause of every previous contact-region pixel difference. Source replay and public screenshots remain separate evidence; no Phaser animation-clock defect or soldier-frame rule change is justified by this replay.

The portable owned-input fixture stores precisely two previously saved primitive strings and their provenance. It was obtained by a read-only diagnostic against a storage-only copy of a closed agent-owned QA profile, using a synthetic blank origin page. The original profile was not opened, game scripts were not run, and no storage was written. That diagnostic is not a public playthrough.

## Repair

`presentation.travelDust` contains bounded primitive trail state only: the last rendered position/time, optional last-emission time/serial, and at most twelve `{x,y,time,seed}` puffs per formation. It binds to the base presentation version/time, unique formation identity/capacity and current motion/resolution preferences. Restore is allowed only immediately after the actual base parser has accepted that formation. Malformed, extra, accessor, future, stale, oversized or incompatible optional data falls back to the existing empty trail; valid combat saves remain usable.

Save never advances the trail or emits particles. A last-render timestamp earlier than the checkpoint is retained within the existing 1.25-second trail lifetime, covering Save between render passes. The unchanged updater handles expiry, the 0.12-second emission interval, displacement threshold, reduced motion and battle resolution. No display objects enter the save.

## Close-combat art finding

The independent alpha compositor measured authentic field46 and a representative eight-bearing/four-phase full-density subset, using the actual atlas, production chroma removal and Phaser custom-pivot flipping. Moderate remains the safe baseline. Rear-only shrinking lowered average overlap but worsened worst-case visibility: the owned view's worst rear occlusion rose from 84.35% to 94.70% at rear ×0.86, and to 100% at ×0.74.

Webb rear soldier #11 is the clearest failure: the front occluder is only 7.21 world pixels farther down-screen. Shrinking the rear silhouette places it completely behind the unchanged front silhouette. Across sampled rear rows, ×0.86 worsened 686 of 3,054 normalized occlusion scores. The existing contact-layout translation moves the whole formation and cannot widen these internal row gaps.

No scaling or spacing change is promoted in v36. The next art work should examine projected row separation and the occluding front silhouettes at stable raw feet. Validate all bearings, firing/reload transitions, formation changes, displaced contact layout, flags, dead offsets and Save/Resume before promotion. The measured subset is not a complete animation matrix: all sampled layout offsets were zero, and firing, reformation and reduced-motion transitions remain outside the occlusion probe.

## Verification and remaining work

The fresh public v36 desktop playthrough used visible Move/Assault controls at 1×. First/idle, field46 warm Save/cold Resume and paused zoom/re-save captures are byte-identical. A further 1.2-second continuation to field47 retains a faint 632-pixel contact difference (maximum channel difference 25, bounds [536,289,582,344] in a 1194×705 canvas PNG). Its cause remains unresolved. These fresh facts differ from the prior v35 field46 timing; this is not an exact replay or claimed repair of the older 2,269-pixel case. The latest diagnostic save is a second paused field47 save from the already cold-rendered state, so the original warm cosmetics are unavailable in that input.

Phone controls fit 390×844: all six 65×48 order buttons and the 119×44 sector selector are within the viewport, with no horizontal overflow. Paused OS reduced-motion captures match. Public QA reports no console/page errors, four Canvas2D readback advisories, 848 verified served response bodies across 210 unique files and no mismatch; forty streaming-audio bodies were unread. The actual 386-file build is bound by its manifest. Public play uses a fresh owned headless profile and no storage or engine injection. No public pre-first-draw race was forced.

Sixteen focused source tests cover authentic before/disabled behavior, all independent gate combinations, real flag frames, non-drawing pre-draw saves, idle/zoom/re-save/reload, 32 further combat steps, expiry/cadence, Hold/Face/Reform, earlier legitimate dust timestamps, malformed/accessor metadata, motion/base/capacity rejection, inactive/resolving paths and authentic migration pins. Full final gate results are recorded separately and must pass before local installation; repeated suite executions are not unique test counts.

Final candidate/public/independent-review and installation results are recorded in the v36 work directory. Existing v35 archives and migration ledgers are preserved; only the metadata reader adapts to the new authentic three-file migration. The work contract and exact source scope precede installation. There is no public upload, default art promotion, whole-game regrade, human-usability certification or measured GPU-performance claim.

Ranked follow-up: (1) investigate any remaining matched-camera public pixel differences, (2) improve row/depth readability from measured occluder geometry, (3) complete firing/reload and reformation coverage before broader art promotion, (4) extend accepted changes to other battles only after Gettysburg validation.
