# Gettysburg July 3 implementation audit

**Audit date:** September 30, 2026  
**Project:** `Titans_of_War` 0.29.0  
**Surface:** Gettysburg — The Field Between the Ridges, July 3, 1863  
**Purpose:** Identify the safest, highest-value implementation path for the focused Civil War art pass.  
**Change boundary:** This audit does not change gameplay code or runtime art.

## Bottom line

Gettysburg already has a stronger technical foundation than its current screenshots suggest. Simulation geometry and presentation are deliberately separated, representative losses are deterministic, flags use period-aware patterns and cloth motion, artillery has direction-correct geometry, landmarks participate in movement and line-of-fire rules, and the regression suite is broad.

The present realism ceiling comes from the final presentation layer:

1. there is no isolated art-profile seam, so art paths, fallbacks, and rules versions are coupled inside the main renderer;
2. the detailed infantry set contains excellent source figures but too few authored action phases and identities to animate a formation naturally;
3. Gettysburg preloads overlapping stable, detailed, realistic, directional, and fallback art families before rendering a single frame;
4. terrain, soldiers, artillery, flags, and landmark sprites do not yet share one camera, lighting, scale, and edge treatment;
5. flags, fences, smoke, and formation blocks retain repeated or synthetic patterns that are conspicuous at the exact zoom levels used for play and promotion.

The first implementation should therefore be an exact-scenario, presentation-only art profile for `gettysburg`. It should select versioned candidate assets without reading or writing battle rules, campaign saves, formation footprints, collision, cover, or outcome state. New art should not be wired directly into the current hard-coded preload list.

## Audit scope and evidence

This is an implementation and asset-pipeline audit, supported by:

- the current Phaser renderer and its visual helpers;
- the current Gettysburg terrain, unit, landmark, scenery, and standard assets;
- the art manifests and provenance notes;
- current-run baseline captures at desktop, normal play, overview, and phone sizes;
- the current Gettysburg, asset, presentation, melee, and deterministic replay checks.

Current captures inspected:

1. [Opening field, 1920 × 1080](../captures/gettysburg-baseline/01-opening-field-1920x1080.png) — healthy composition; repeated formation and fence patterns are conspicuous.
2. [Pickett close view, 1920 × 1080](../captures/gettysburg-baseline/02-pickett-close-1920x1080.png) — sharp individual figures; cloned bodies, floating standards, and mixed rendering styles are conspicuous.
3. [Pickett advancing, 1920 × 1080](../captures/gettysburg-baseline/03-pickett-advance-1920x1080.png) — facing and movement are readable; marching phases remain uniform and block-like.
4. [Active overview, 1280 × 720](../captures/gettysburg-baseline/04-active-overview-1280x720.png) — command state is readable; unit and landmark detail collapses quickly at fitted zoom.
5. [Active phone layout, 390 × 844](../captures/gettysburg-baseline/05-active-mobile-390x844.png) — controls remain usable; the operational view is too small for fine art to carry state by itself.

The audit did not complete a new hand-driven matrix of every firing, melee, rally, retreat, reduced-motion, and outcome state. Animation findings below are therefore grounded in the actual pose-selection code and available captures, not a claim that every transition was watched live. Historical accuracy beyond the existing manifests is also outside this implementation audit and should be reviewed against the separate Gettysburg research record before assets are approved.

## Priority definitions

- **P0 — integration blocker:** complete before candidate art is connected to the renderer.
- **P1 — Gettysburg gate:** complete before the July 3 vertical slice is approved.
- **P2 — library-freeze work:** complete before Gettysburg becomes the template for the remaining battles.

## What is already strong

### 1. Simulation and art are separated

[Formation visual state](../../../src/battle/formationVisualState.js) uses simulation time, measured movement, stable figure identities, deterministic casualty order, and an existing physical footprint. It does not write presentation positions back into combat. Gettysburg selection uses the same physical footprint at every facing and art scale.

This is the most valuable constraint to preserve. New art can change silhouettes, frames, shadows, and effects while the simulation remains authoritative.

### 2. Formation behavior contains more state than the art currently exposes

The renderer already distinguishes turning, advancing, fallback fire, routing spread, close contact, firing, reload, casualties, reforming ranks, fatigue-weighted gait, and reduced motion in [formationVisualState.js](../../../src/battle/formationVisualState.js#L44). The next asset family does not need new battle mechanics to look substantially better; it needs authored poses that faithfully consume those states.

### 3. Gettysburg terrain rules have explicit geometry

[Gettysburg terrain visuals](../../../src/battle/gettysburgTerrainVisual.js) keep physical fences, the road, and the stone wall aligned with [Gettysburg mechanics](../../../src/battle/gettysburgMechanics.js). The terrain plate intentionally excludes painted military standards and generic houses. Leister House and the Abraham Brian House have explicit blocking footprints and researched notes in [historicalLandmarks.js](../../../src/battle/historicalLandmarks.js#L11).

### 4. Labels and selection respect the desired field presentation

The idle field no longer places permanent opaque cards around formations. Names, strength, bars, and condition cues appear on hover or touch inspection, while the selected formation uses a short ground arc. The implementation is in [CivilWarBattlefield.jsx](../../../src/battle/CivilWarBattlefield.jsx#L521).

### 5. Standards are period-aware and animated

[periodStandards.js](../../../src/battle/periodStandards.js) selects a 34-star United States color and a 13-star Army of Northern Virginia pattern for Gettysburg. [realisticStandards.js](../../../src/battle/realisticStandards.js) generates a 32-frame cloth cycle with a pinned hoist, sag, moving shade, deterministic phase, pause behavior, and reduced-motion behavior.

### 6. Artillery geometry is coherent with combat direction

[artilleryVisual.js](../../../src/battle/artilleryVisual.js) keeps the muzzle, recoil, wheel rotation, limbered state, crew anchors, visible footprint, and facing in the same engine coordinate system. The apparatus is reusable and presentation-only.

### 7. Assets are traceable and guarded

The current detailed unit, scenery, terrain, and landmark files have manifests, source notes, dimensions, hashes, and explicit limitations. Relevant records include [detailed-unit-art-v2.json](../../detailed-unit-art-v2.json), [realistic-scenery-v2.json](../../realistic-scenery-v2.json), [historical-landmark-art-v3.json](../../historical-landmark-art-v3.json), and [historical-landmark-art-v7.json](../../historical-landmark-art-v7.json).

### 8. The current regression baseline is healthy

Checks run during this audit:

- `npm run test:gettysburg`: **81/81 passed** across Gettysburg mechanics, command briefing, and artillery visuals.
- `npm run validate-assets`: passed asset catalog, atlas, detailed-unit, scenery, siege, and pixel-preservation checks.
- targeted close-combat, coordination, formation-state, connected-surroundings, and deterministic replay checks: **118/118 passed**.

These results prove the current mechanical and structural baseline. They do not prove perceived animation quality, historical accuracy, mobile legibility, or visual cohesion.

## Ranked actionable issue map

| Rank | ID | Priority | Limiting issue | Principal touchpoints | First corrective move |
|---:|---|---|---|---|---|
| 1 | GART-01 | P0 | No Gettysburg-only art-profile seam; art selection is hard-coded and partly tied to rules versions | `CivilWarBattlefield.jsx` 102–153; `historicalLandmarks.js` 49–56 | Add an exact-scenario, presentation-only, versioned art profile before loading candidate assets |
| 2 | GART-02 | P0 | Detailed infantry has insufficient action phases and human variation | `detailedUnitVisual.js` 39–65; `formationVisualState.js` 118–142; `detailed-v2` atlases | Build a complete Gettysburg candidate action family with stable variants and grounded anchors |
| 3 | GART-03 | P0 | Preload and decoded texture pressure are already high before new art | `CivilWarBattlefield.jsx` 128–153; `detailedUnitVisual.js` 20–36; `realisticStandards.js` 27–51 | Make profiles load one production family, pre-key runtime atlases, and generate only current standards |
| 4 | GART-04 | P1 | Terrain, people, structures, guns, and shadows use different visual languages | terrain v3, detailed units, both Gettysburg landmarks, artillery renderer | Freeze one Gettysburg camera/light/scale sheet and grade every candidate against it |
| 5 | GART-05 | P1 | Standards remain oversized, visually uncrewed, and partly detached from formation motion | `CivilWarBattlefield.jsx` 385–404, 509–529; standard modules | Add a standard-bearer role and attach pole, bearer, cloth scale, shadow, and motion |
| 6 | GART-06 | P1 | Roads, fences, walls, and farm surroundings show repeated stamps and abrupt authored lines | `gettysburgTerrainVisual.js` 8–33; `landmarkSurroundings.js` 10–11 | Add deterministic variants and researched connected surroundings without altering rule geometry |
| 7 | GART-07 | P1 | Fire, impact, smoke, and melee effects do not yet form a readable event language | `CivilWarBattlefield.jsx` 438–507; `closeCombat.js`; `BattleAudioManager.js` | Add a bounded visual-event layer derived from stable snapshot events and state deltas |
| 8 | GART-08 | P1 | One art density is used at close, play, overview, and phone scales | renderer camera and sync paths; `battleUsability.js` | Define close/play/overview presentation levels while keeping one simulation footprint |
| 9 | GART-09 | P1 | Artillery is mechanically strong but visually separate from the detailed people | `artilleryVisual.js` 164–280; detailed crew pages | Preserve geometry, replace the surface treatment and crew-role coverage |
| 10 | GART-10 | P2 | Tests prove integrity and determinism but do not gate visible transitions or scene cohesion | current asset and visual test scripts | Add capture, transition, alpha, scale, and performance gates before library freeze |

## Detailed findings

### GART-01 — Create an isolated art-profile seam first

**Evidence**

- [CivilWarBattlefield.jsx](../../../src/battle/CivilWarBattlefield.jsx#L111) selects Gettysburg terrain v2 or v3 from `battleRulesVersion`.
- The preload block at lines 128–153 hard-codes every unit and scenery family.
- `this.engine.gettysburg` is true for both `gettysburg` and `gettysburg_jackson`; using that predicate for the focused pass would unintentionally change the alternate-history board.
- `DETAILED_UNIT_PAGES.every(...)` at line 404 makes the entire detailed path depend on all four shared pages, including `crew`, even though infantry poses do not use the crew page.

**Why it matters**

Candidate art cannot currently be introduced for July 3 alone without editing shared preload and texture-selection logic. Tying a visual revision to `battleRulesVersion` also makes an old save's art depend on mechanics compatibility. Pure presentation upgrades should not require a new combat rules version.

**Recommended implementation**

Create `src/battle/battleArtProfiles.js` with immutable profiles and a resolver shaped like:

```js
resolveBattleArtProfile({ scenarioId, requestedProfile })
```

The first candidate profile should have an explicit ID such as `gettysburg-focused-v1` and must activate only when `scenarioId === 'gettysburg'`. It may contain:

- terrain image key and path;
- unit atlas families and action-to-page maps;
- standard texture settings and display scale;
- landmark sprite overrides using the existing landmark IDs and footprints;
- scenery modules;
- effect palette and density limits;
- close, play, and overview presentation constants.

It must not contain or change:

- `battleRulesVersion`;
- formation, landmark, road, ridge, wall, sector, cover, or collision geometry;
- strength, morale, fatigue, ammunition, timing, AI, scoring, or outcomes;
- save-envelope fields.

Resolve the profile once in the scene constructor. Namespace every new texture key with the profile ID. During internal review, select the candidate through a development/build setting; the stable profile remains the default until promotion. Do not preload stable and candidate families together in a release build.

**First candidate slice**

Use the seam first for a complete Gettysburg infantry action pack for both armies. A partial ready-only swap would create visible style changes when a figure walks, fires, reloads, or enters melee. Development fallbacks may exist for missing files, but a promoted profile must contain a visually coherent full action family.

**Regression risks**

- accidental activation on `gettysburg_jackson`;
- profile selection leaking into campaign saves or replay hashes;
- texture-key collisions after scene restart;
- one missing page silently disabling every detailed pose;
- candidate art extending outside the established ground anchors and selection footprint;
- release builds carrying both stable and candidate source sets.

**Acceptance**

- All scenarios resolve the stable profile by default.
- Only exact `gettysburg` resolves the candidate when explicitly requested.
- `gettysburg_jackson` remains byte-for-byte on its stable asset paths.
- Snapshot, checkpoint, and replay data contain no art-profile field.
- Existing Gettysburg outcome and deterministic replay tests remain unchanged.
- A missing candidate asset fails validation before release rather than producing an invisible formation.

### GART-02 — Replace the pose map before merely increasing source resolution

**Evidence**

- The current source figures are detailed and realistic at full size, but each side largely depicts the same soldier identity in every direction.
- [detailedUnitVisual.js](../../../src/battle/detailedUnitVisual.js#L39) chooses `walk` only on alternating gait frames and falls back to `ready` on the other frames.
- The manifest records that the requested opposite-footstep edit failed visual acceptance. The current walk therefore remains limited-frame animation.
- Both `fire` and `melee` select the `aim` page. The older directional melee atlases are loaded, but the detailed path bypasses them.
- `reload` is represented by the ready family plus procedural body motion; there is no authored reload page.
- A formation creates 32 representative sprites. Deterministic width, height, tint, phase, and breathing vary them, but faces, uniforms, equipment arrangement, and base poses remain visibly cloned.

**Visible result**

The captures show readable formations with sharply rendered people, but the people read as repeated paper-doll rows. Movement changes the block's position and angle more convincingly than it changes individual bodies. At close view, repeated heads, packs, legs, and rifle positions become more noticeable.

**Recommended action family**

For each side, author and index:

- `ready`: at least two planted variations per useful bearing;
- `march-a` and `march-b`: true opposing foot contacts with consistent body and equipment identity;
- `aim`, `fire`, and `recover`;
- `reload-start`, `reload-work`, and `reload-ready`;
- `melee-ready`, `melee-thrust`, `melee-parry`, and `melee-recover`;
- `route` or exhausted run silhouettes distinct from organized marching;
- `fall` phases that retain the current grounded casualty anchor;
- officer, standard bearer, and at least three artillery crew-role families.

Use two to four controlled body/equipment identities per side. Select identity, phase, and small wear variation with the existing deterministic unit seed. A figure must keep its identity across ready, walk, aim, fire, and reload so animation does not change the soldier's face, gear, or proportions between frames.

**Code touchpoints**

- Extend the action/page contract in [detailedUnitVisual.js](../../../src/battle/detailedUnitVisual.js).
- Preserve state timing and feet in [formationVisualState.js](../../../src/battle/formationVisualState.js); do not rewrite combat state to fit animation.
- Route texture keys through the new art profile in [CivilWarBattlefield.jsx](../../../src/battle/CivilWarBattlefield.jsx#L452).
- Keep the existing body-height and boot-pivot contract, then expand [test-detailed-unit-visuals.mjs](../../../scripts/test-detailed-unit-visuals.mjs).

**Regression risks**

- foot sliding from inconsistent pivots or body height;
- body identity changing between pages;
- rifle direction diverging from engine facing or muzzle smoke;
- mirrored cartridge boxes, scabbards, or lettering;
- long bayonets extending outside click and occlusion expectations;
- synchronized 32-person phase changes;
- reduced motion selecting a visually unstable contact frame.

**Acceptance**

- A sustained advance shows opposing foot contacts without a ready/walk pop.
- Fallback keeps the firing rank facing its legal arc while rear ranks move.
- Reload, melee, route, fall, and rally are visually distinct at normal play zoom.
- Figure identity remains stable across every action transition.
- Every boot pivot remains on its assigned ground slot.
- Reduced motion uses intentional planted frames and preserves every footprint.

### GART-03 — Put the art pass under an explicit startup and texture budget

**Evidence**

`node scripts/audit-field-assets.mjs` reports the current Gettysburg option-A preload as:

- **47 load entries**;
- **45 unique assets**;
- **38,913,341 file bytes** before transfer compression, decoded-memory accounting, or generated canvases.

The 25 loaded image files contain **39,501,101 pixels**, a **150.7 MiB RGBA-equivalent source-pixel footprint** if decoded to four-byte surfaces. This is a sizing estimate, not a measured browser memory figure. Runtime then creates additional detailed-unit canvases, scenery canvases, five 32-frame standard atlases, and the 1700 × 900 Gettysburg physical-scenery canvas.

The preload includes:

- detailed pages for both sides;
- realistic infantry and crew fallbacks;
- directional infantry and directional melee fallbacks;
- legacy infantry and artillery images;
- all scenery sources;
- a 1254 × 1254, roughly 3 MB cloth source;
- both Gettysburg landmarks and the terrain plate.

**Recommended implementation**

- Export production-sized RGBA atlases offline; retain high-resolution sources outside the shipping path.
- Stop chroma-keying eight 1536 × 1024 sheets on every scene creation.
- Load one selected infantry family per promoted profile. Keep fallbacks in a development/recovery path, not as routine parallel preload.
- Generate only the two standard textures required by the active scenario, rather than all five pattern/star combinations.
- Reduce cloth material to the resolution needed by the final flag frames.
- Use namespaced, profile-specific atlases and validate all required pages before building.
- Measure first controllable frame, Canvas memory pressure, and frame-time percentiles on desktop and the itch iframe.

**Regression risks**

- removing a fallback that still serves a rare bearing or rear-fire pose;
- alpha fringes introduced by offline compositing;
- texture eviction or missing frames after responsive resize;
- Canvas allocation failure on mobile iframe contexts;
- quality loss from downscaling source sheets too aggressively.

**Acceptance**

- No increase in Gettysburg first-interaction bytes without a documented visual reason.
- No stable and candidate duplicate family in the production preload.
- Production atlases retain accepted close-up detail at the maximum supported focus zoom.
- The `fieldProfile=1` diagnostic records ready time and p95 behavior for the baseline and candidate under the same viewport and state.
- Long play and repeated scene entry do not grow retained textures.

### GART-04 — Unify camera, light, scale, and edge treatment

**Evidence**

- [Gettysburg terrain v3](../../../public/images/battles/gettysburg-terrain-v3.png) is a soft, painterly elevated field plate.
- [Detailed infantry](../../../public/images/units/detailed-v2/union-ready.png) is near-photorealistic, upright figure photography-style art with very sharp local edges.
- [Leister House](../../../public/images/battles/landmarks-v3/leister-house.png) and [Abraham Brian House](../../../public/images/battles/landmarks-v7/brian-house.png) are individually detailed but differ in angle, framing, alpha edge, contrast, and grounding treatment.
- The cannon is procedurally shaded while its crew uses photographic figure sprites.
- Unit shadows are generic ellipses and do not establish the terrain plate's sun direction.

**Recommended implementation**

Freeze a Gettysburg art-direction sheet before approving generated replacements:

- elevated camera angle and eight bearing examples;
- figure, gun, house, fence, wall, tree, and road scale chart;
- one sun direction and shadow length;
- summer haze, contrast, saturation, and edge-sharpness ranges;
- ground-contact shadow rules;
- alpha-edge and color-spill tolerances;
- close, normal-play, and overview reference crops.

Grade generated assets into this target rather than accepting each one independently. A strong isolated image that requires a different camera or light should be rejected.

**Regression risks**

- making units realistic in close-up but muddy at play zoom;
- changing landmark display bounds while collision footprints remain fixed;
- darkening Confederate uniforms until side and facing are lost;
- over-sharpening people against the softer terrain;
- baking incompatible shadows into sprites.

### GART-05 — Integrate each standard with a bearer

**Evidence**

The flag code is technically sound, but [createFormation](../../../src/battle/CivilWarBattlefield.jsx#L363) places a pole and cloth inside a UI container above the formation. No soldier owns that pole. In the captures, the standards are strong side cues but read as large, floating formation icons. The same container also owns hover labels and strength bars, which constrains art placement.

**Recommended implementation**

- Reserve one living representative figure as the standard bearer when formation strength permits.
- Anchor the pole at the bearer's hand/shoulder while keeping the formation's interactive and label anchor separate.
- Give marching, planted, wavering, and routing standards bounded motion derived from the bearer state.
- Retain the 34-star United States and 13-star ANV designs unless historical review authorizes a more specific documented color.
- Reduce cloth size to a plausible silhouette while retaining enough saturation and contrast to function as a side cue.
- Keep the label/bar container invisible except during inspection, independent of the flag's art lifetime.

**Regression risks**

- losing the primary touch/selection anchor;
- hiding a standard behind its own formation at some bearings;
- standard bearer disappearing too early as representative losses occur;
- flag motion continuing while paused or in reduced-motion mode;
- treating a representative army pattern as a specific regiment's documented color.

### GART-06 — Remove repeated scenery stamps without changing rules

**Evidence**

[drawGettysburgTerrain](../../../src/battle/gettysburgTerrainVisual.js#L8) repeats two fence offsets every 238 units and repeats the same wall frame every 90 units. The resulting horizontal road boundary is mechanically clear, but the same rails, gaps, brightness, and stone silhouettes repeat across the board. The two farms have connected lanes and plots in [landmarkSurroundings.js](../../../src/battle/landmarkSurroundings.js#L10), but those small authored surfaces do not yet make each farm read as a distinct working landscape.

**Recommended implementation**

- Produce four to six compatible fence and wall modules with matching camera, scale, and light.
- Use deterministic selection, small length changes, post wear, vegetation interruption, and ground blending.
- Preserve the authored fourth-section crossing and every exact road/wall rule bound.
- Extend the Leister and Brian settings with researched yards, lanes, fences, cultivation, and restrained outbuilding evidence.
- Keep all new surroundings presentation-only unless a separate mechanics change explicitly versions and tests them.

**Regression risks**

- a decorative gap implying a passable crossing where the simulation blocks movement;
- a continuous-looking fence where the simulation permits crossing;
- new outbuildings covering units without collision;
- high-frequency clutter masking the stone wall, road, or objective sectors.

### GART-07 — Build an event-driven effects layer

**Evidence**

- Artillery currently receives a short warm flash and expanding smoke ellipses.
- Infantry receives smoke but no corresponding visible flash.
- There is no material-specific impact, hit response, splinter, dirt strike, or bounded debris layer in the battlefield renderer.
- Close combat has deterministic damage and throttled metallic audio, but detailed infantry uses the aim family for its visible melee state.
- All smoke graphics render at depth 45000, above standards and mission labels, so heavy effects can compete with command information.

**Recommended implementation**

Create a presentation-only visual-event controller that consumes stable volley serials, melee event IDs, strength deltas, and existing formation state. It should pool and bound:

- rifle and artillery muzzle flash;
- smoke source, rise/drift, thinning, and expiry;
- soil, wood, stone, and equipment impacts;
- a restrained hit reaction tied to actual strength loss;
- melee contact accents synchronized with real contact and metal-impact audio;
- dust tied to movement and dry ground;
- separate below-unit, unit-height, and atmospheric layers.

Effects must follow simulation time, freeze on pause, become restrained in reduced motion, and remain deterministic enough for replay capture. They must never feed positions or outcomes back into the engine.

**Regression risks**

- effects replaying after pause, focus, or snapshot refresh;
- event duplication at 2× speed;
- smoke hiding selected units and labels;
- hit feedback occurring when suppression changes without a casualty;
- particle accumulation in long sessions.

### GART-08 — Define presentation levels by zoom

**Evidence**

At focus zoom, the detailed figures can justify richer action art. At fitted desktop zoom, repetition and silhouette matter more than facial detail. On the 390 × 844 capture, the battlefield occupies only a few hundred vertical pixels; the normal unit art cannot carry fine condition information there.

**Recommended implementation**

Keep one simulation and physical footprint, but define presentation levels:

- **close:** complete role and action sprites, richer effects, detailed landmark treatment;
- **play:** full formation silhouettes, restrained effects, readable flags and facing;
- **overview/phone:** bounded representative count, clearer mass and side contrast, compact standards, minimal effects, no tiny permanent labels.

Do not solve overview readability by restoring boxes over units. Use formation silhouette, spacing, standards, selection, and the existing command panel. UI height on phone is a separate layout constraint; sharper sprites cannot recover terrain space consumed by controls.

**Regression risks**

- figures appearing or disappearing abruptly across a zoom threshold;
- LOD changing the interactive or combat footprint;
- reduced representative count making strength losses unreadable;
- side recognition relying only on red/blue color.

### GART-09 — Preserve artillery geometry and replace its surface language

**Evidence**

The current procedural cannon correctly rotates, limbers, recoils, turns wheels, abandons crew, and exposes the actual visible muzzle. Its gun surfaces are flatter and more illustrative than the current detailed people and terrain. Three crew sprites share a small pose vocabulary and a common identity; the working frame is suppressed for rear views because the generated tool direction was inaccurate.

**Recommended implementation**

- Retain `artilleryGeometry` and its tests as the authoritative apparatus transform.
- Replace flat fills with a coherent Gettysburg gun/limber surface or sprite parts mapped to the existing geometry.
- Add stable crew identities and task roles: sponge/rammer, loader, gunner, and supporting crew as the representative budget permits.
- Make unlimbering, loading, ramming, aiming, firing, recoil response, recovery, limbering, and abandonment visually distinct.
- Keep muzzle effects attached to `view.artillery.geometry.muzzle`.

**Regression risks**

- sprite art no longer matching the geometry's muzzle or wheel contact;
- crew crossing wheels or occupying landmark footprints;
- recoil moving crew or collision state;
- limbered art facing opposite the actual travel direction.

### GART-10 — Add visual promotion gates beyond hash and geometry checks

**Evidence**

Current tests are strong at proving hashes, bounds, pivot ranges, deterministic pose resolution, flag constraints, scenery clipping, physical footprints, and engine replay isolation. They do not judge:

- a visible ready/walk pop;
- stable human identity between pages;
- matched lighting and perspective;
- alpha fringe or background contamination at play scale;
- label/flag/landmark occlusion;
- repeated scenery patterns;
- close/play/overview/mobile readability;
- first controllable frame and decoded texture pressure.

**Recommended gates**

1. Asset schema: every page declares action, bearing, identity, phase, body height, boot pivot, source hash, runtime hash, and historical scope.
2. Transition contact sheets: ready → walk-a → walk-b → aim → fire → recover → reload → ready for every bearing and identity.
3. Alpha and spill checks against light grass, dark woods, smoke, and neutral gray.
4. Scene captures at fixed states and viewports, including normal and reduced motion.
5. Direct before/after review at actual play scale, not only source resolution.
6. Performance capture with identical scenario, choice, viewport, zoom, and battle state.
7. Exact regression checks proving snapshot, replay, checkpoint, collision, and outcomes are unchanged.

Avoid a brittle whole-canvas pixel equality test as the only visual gate. Browser font and Canvas details can vary. Use stable state/camera capture plus human visual review and narrow programmatic checks for dimensions, anchors, alpha, color bounds, and performance.

## Recommended first integration seam

### New module

Add `src/battle/battleArtProfiles.js` with:

- `STABLE_BATTLE_ART_PROFILE` describing the current paths;
- `GETTYSBURG_FOCUSED_V1` describing candidate paths and presentation constants;
- `resolveBattleArtProfile({ scenarioId, requestedProfile })`;
- an asset enumerator used by both Phaser preload and asset validation;
- an invariant that a profile contains no mechanics or save fields.

### Candidate directory

Use a versioned, isolated runtime directory such as:

```text
public/images/art-pass/gettysburg-focused-v1/
  terrain/
  units/union/
  units/confederate/
  artillery/
  standards/
  landmarks/
  scenery/
  effects/
```

Keep the candidate manifest at:

```text
docs/art-pass/manifests/gettysburg-focused-v1.json
```

The manifest should record source/generation reference, prompt or source citation, editing steps, historical scope, dimensions, decoded pixel dimensions, runtime bytes, SHA-256, atlas frames, pivots, body heights, and rejected limitations.

### Renderer changes when implementation begins

1. Resolve `this.artProfile` in the [scene constructor](../../../src/battle/CivilWarBattlefield.jsx#L102).
2. Replace hard-coded art paths in [preload](../../../src/battle/CivilWarBattlefield.jsx#L128) with the profile enumerator.
3. Pass profile texture keys into [createDetailedUnitTextures](../../../src/battle/detailedUnitVisual.js#L20), standard creation, scenery creation, `createFormation`, and artillery creation.
4. Keep [formationVisualState.js](../../../src/battle/formationVisualState.js) unchanged until an authored action needs a new presentation-only state mapping.
5. Keep all Gettysburg mechanics, terrain-rule coordinates, landmark footprints, and movement/line-of-fire helpers unchanged.
6. Add profile tests before adding the first candidate file.

### First tests to add

- exact Gettysburg candidate selection and exact alternate-Gettysburg exclusion;
- default stable selection for all eleven battles;
- profile asset completeness and unique texture keys;
- no mechanics/save keys in a profile;
- candidate action coverage for all eight bearings and both sides;
- identity continuity, boot-pivot, body-height, and alpha checks;
- preload byte and source-pixel budget;
- stable snapshots and replay hashes under stable versus candidate art profiles.

## Gettysburg regression-risk register

| Risk | Likelihood | Impact | Control |
|---|---|---|---|
| Candidate leaks onto alternate Gettysburg | High without exact check | High | Match `scenarioId === 'gettysburg'`, never `engine.gettysburg` |
| Art revision changes old-save mechanics behavior | Medium | High | Decouple art version from `battleRulesVersion`; retain existing physical data |
| Missing page disables the full detailed path | High with current `every(...)` gate | High | Validate profile completeness and report the exact missing page |
| Feet slide or figures jump between pages | High for generated atlases | High | Shared identity sheet, measured boot pivots, transition contact sheets |
| Texture memory or startup regresses | High if new sources are additive | High | One selected family, production atlases, byte/pixel/profile gates |
| Building art disagrees with collision footprint | Medium | High | Preserve IDs and bounds; overlay footprint during review captures |
| New scenery implies false cover or openings | Medium | High | Render authored rule geometry during review; no decorative rule changes |
| Effects duplicate at speed or resume | Medium | Medium-high | Stable event IDs/serials, simulation-time lifetime, pooled caps |
| Flag loses touch/selection behavior | Medium | Medium-high | Separate visual bearer from inspection/command anchor |
| Reduced motion looks broken or fully dead | Medium | Medium | Deliberate planted frames and stable restrained cloth pose |
| Source detail disappears at normal zoom | High | Medium | Review every asset at close, play, and overview scale before promotion |
| Chroma or alpha fringe survives Canvas composition | Medium | Medium | Offline RGBA export and multi-background alpha inspection |

## Promotion order from this audit

1. Add and test the Gettysburg-only art-profile seam.
2. Establish baseline byte, source-pixel, ready-time, frame-time, and fixed-state captures.
3. Freeze the Gettysburg camera/light/scale sheet.
4. Produce and integrate a complete two-side infantry action/identity candidate.
5. Integrate standard bearer and right-size the standards.
6. Resurface artillery while retaining its existing geometry.
7. Replace repeated fence/wall modules and complete both farm surroundings.
8. Add event-driven fire, impact, smoke, hit, and melee presentation.
9. Add close/play/overview presentation levels and verify phone readability.
10. Run the complete Gettysburg promotion gate and only then freeze shared art-library contracts.

This order addresses the integration boundary and human motion before investing in broad scenery volume. It also prevents high-resolution candidate files from being added to an already expensive shared preload without a selection and performance contract.

## Definition of done for the first implementation increment

The groundwork increment is complete when:

- a stable and a Gettysburg-focused candidate profile exist;
- exact scenario selection is tested;
- the alternate Gettysburg board remains on stable paths;
- profiles do not enter snapshots or save data;
- preload and renderer texture keys come from the selected profile;
- no candidate art is required for stable builds;
- a candidate manifest schema and byte/pixel budget are enforced;
- all current Gettysburg, asset, replay, and formation tests still pass;
- baseline and candidate captures can be reproduced at the same state, camera, zoom, and viewport.

At that point, the image-generation work can begin without risking a global art swap or mechanics regression.
