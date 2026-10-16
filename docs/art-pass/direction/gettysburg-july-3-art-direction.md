# Gettysburg July 3 Art Direction Lock

**Version:** 0.1 candidate lock  
**Date:** September 30, 2026  
**Applies to:** Historical `gettysburg` battlefield only  
**Research packet:** [Gettysburg July 3 research](../research/gettysburg-july-3.md)  
**Technical baseline:** [Gettysburg July 3 baseline](../GETTYSBURG_JULY_3_BASELINE.md)

## Production order

1. Preserve the playable relationship between Seminary Ridge, the open approach, Emmitsburg Road, Cemetery Ridge, the Angle, the Brian farm, and the Leister farm.
2. Lock camera, scale, mid-afternoon light, calm wind, palette, edge treatment, and ground contact.
3. Prove two to four stable human identities per side in `ready`, true opposing march contacts, aim/fire/recover, reload, melee, route, and fall families.
4. Add officer, color bearer, and artillery crew-role families without changing simulation footprints.
5. Integrate calm-air standards with bearers and correct the visual scale relationship between cloth, pole, people, and formation.
6. Deepen the farm, field, fence, wall, road, orchard, grove, and damage language while preserving engine geometry.
7. Tune smoke, dust, impact, damage, and casualty states.
8. Promote only after close, play, overview, reduced-motion, responsive, performance, and historical gates pass.

Generated imagery is source material. It is not evidence and does not enter the default game because it looks strong in isolation.

## Scene statement

The field is a hot, inhabited agricultural landscape under broken mid-afternoon summer cloud. It should feel broad, low, exposed, dusty, and almost still. The visual drama comes from the distance across working farms, accumulating smoke, obstacles that break formations, and the contrast between ordered lines and human disorder. It should not use sunset orange, mountain-scale ridges, strong wind, fantasy spectacle, pristine tourism landscaping, or modern roads.

## Camera contract

- Projection: fixed orthographic or near-orthographic elevated battlefield view.
- Pitch: approximately 35 degrees downward for people, guns, structures, trees, and effects.
- Bearings: eight source directions mapped to `E, SE, S, SW, W, NW, N, NE`.
- Rotation rule: rotate the subject through a fixed camera. Do not rotate a flat sprite in code to invent a direction.
- Feet: every frame owns a measured boot pivot on its assigned ground slot.
- Weapon: rifle or tool direction must agree with formation facing and effect origin.
- Mirroring: permitted only for a reviewed symmetric state. Cartridge boxes, swords, tools, lettering, and documented equipment sides may not silently swap.
- Perspective consistency: visible crown, shoulders, packs, gun carriage top planes, roof planes, and tree canopies must imply the same pitch.

## Light, weather, and wind

- Time: principal assault, roughly 1:30–3:30 p.m. on July 3, 1863.
- Temperature and mood: hot summer afternoon; dry enough for localized road, march, hoof, and gun dust.
- Sky: broken blue-white cumulus after heavier morning cloud, with restrained local softening of light.
- Key light: screen upper left, treated as a documented game-direction choice because the historical record does not establish the board-camera azimuth.
- Shadow travel: screen lower right.
- Shadow quality: short-to-moderate, soft-edged but present; no studio rim lighting.
- Wind: very gentle from the south-southwest. Standards sag and form slow folds more often than they stream fully extended.
- Smoke: black-powder smoke accumulates and drifts slowly, then clears enough to preserve command readability.
- Weather exclusions: no rain during the charge, no sunset, no desert haze, no strong flag-streaming wind.

## Palette and material contract

### Ground and vegetation

- meadow: warm olive green through straw green;
- cut or trampled hay: muted ochre and flax;
- exposed soil: warm gray-brown, never bright orange;
- road dust: pale tan-gray with localized darker wheel ruts;
- orchard and grove: varied summer greens with restrained cool shadow;
- stone: local gray-brown fieldstone with lichen and dust;
- timber: weathered gray and brown, not saturated red lumber;
- damage: raw pale wood, displaced gray stone, dark soil, and restrained soot.

### Union

- coat: deep indigo wool that remains blue at play scale without turning electric;
- trousers: weathered sky blue with dirt and sweat variation;
- leather: dark brown to black with low gloss;
- brass: small warm accents, never a bright outline;
- equipment cloth: off-white, tan, gray, and worn black.

### Confederate

- jackets and coats: controlled gray, brown-gray, and muted butternut variation supported by the scenario's representative scale;
- trousers: gray, blue-gray, and restrained mixed issue;
- leather and equipment: worn dark brown, black, tan canvas, and gray blanket rolls;
- exclusions: uniform theatrical butternut, bright red trim across the formation, and decorative battle-flag motifs on clothing.

### Rendering and edges

- target: realistic historical illustration with documentary material detail;
- local detail: visible wool, leather, wood, iron, dust, and wear in source art;
- play-scale edge: clean enough to preserve silhouette, softened enough to belong to the terrain plate;
- contrast: keep heads, shoulders, rifles, and legs separable; avoid hard black cutout outlines;
- alpha: no matte halo, checkerboard, colored spill, or dark fringe;
- grade: generated photographic source figures must be graded toward the board rather than placed unchanged.

## Scale contract

The simulation footprint remains authoritative. These values are presentation targets for the existing renderer:

| Element | Target presentation |
|---|---|
| Infantry body | Approximately 54–60 world pixels from boot pivot to head at unit scale 1 before camera zoom |
| Rifle and bayonet | Full coherent silhouette; may extend above the head but must remain inside its reviewed frame |
| Representative formation | Up to 32 visible figures; losses reduce visible people without changing simulation strength rules |
| Standard cloth | Command-readable but subordinate to the full formation; visually attached to a bearer |
| Artillery crew | Human scale matches infantry; role positions establish the gun's size |
| Field gun | Wheels, trail, barrel, limber, crew, and shadow agree with the human scale |
| Houses | Preserve current mechanical footprints while bringing visible dimensions and surroundings into one scale language |
| Wall at the Angle | Low field wall overall, roughly two to three feet in the principal treatment, with restrained local variation |

At overview scale, a formation must read as an organized body. At focus scale, it must read as different people performing related tasks rather than one person stamped 32 times.

## People and identity contract

- Use two to four controlled body/equipment identities per side in the first promoted family.
- Preserve each figure's identity across ready, march, aim, fire, recover, reload, melee, route, and fall.
- Variation may change face, body proportions, headgear within evidence, jacket/trouser tone, blanket roll, pack, haversack, and stance.
- Variation may not change side recognition, weapon type, ground pivot, camera, light, or direction mapping.
- Deterministic figure ID selects identity, pose phase, tint, and small spacing differences.
- Officers, color bearers, and artillery crew members need role-specific silhouettes and actions.
- Poses should carry weight through hips, knees, shoulders, and weapon handling. Avoid mannequin posture, heroic portrait stance, and synchronized knees.

### Required infantry action families

1. `ready-a` and `ready-b` planted variants;
2. `march-a` and `march-b` with opposite foot contacts;
3. `aim`, `fire`, and `recover`;
4. `reload-start`, `reload-work`, and `reload-ready`;
5. `melee-ready`, `melee-thrust`, `melee-parry`, and `melee-recover`;
6. organized fallback steps that retain the legal facing;
7. exhausted route silhouettes distinct from marching;
8. grounded fall phases with a stable boot/ground anchor.

## Formation composition

- A stable ordered line uses two principal ranks with modest deterministic spacing and posture differences.
- Marching phases are desynchronized by stable figure seed.
- Fence crossings bunch, climb, pass through gaps, and redress; formations do not pass through an intact fence as a rigid rectangle.
- Fire ripples across the front rank rather than flashing as one perfectly synchronous event.
- Melee affects the contact ranks first and must face actual contact.
- Strength loss removes people, widens or disrupts spacing, and leaves restrained transient casualty states.
- Rally restores order and posture, not lost bodies.
- Routing breaks spacing and posture before the unit fades at the field boundary.

## Standards

- Gettysburg Union formations use a representative 34-star United States national color unless a documented formation-level assignment replaces it.
- Confederate formations use an explicitly representative Army of Northern Virginia pattern unless artifact research supports a more specific assignment.
- Exact regimental inscriptions, battle honors, and provenance are forbidden without evidence.
- Cloth is heavy woven fabric with a fixed hoist, gravity sag, slow traveling fold, mild edge curl, seam, and wear.
- Calm air is the default. Fully extended cloth is an occasional movement response, not the resting silhouette.
- Pole, ties, cloth, finial, and bearer form one visual system.
- Reduced motion uses a natural sagged frame rather than a rigid rectangle.

## Terrain and obstacle contract

- Preserve the three depth bands: Confederate staging ground, exposed agricultural approach, and United States ridge position.
- Emmitsburg and Taneytown roads are unpaved, rutted, irregular nineteenth-century roads.
- Use straight post-and-rail, Virginia worm or rider fence where supported, low fieldstone wall, gates, gaps, missing rails, and localized battle damage.
- Repeatable modules require scale, damage, alignment, shadow, and ground-wear variation.
- Physical engine rectangles stay authoritative. Decorative crops, weeds, debris, and shadows do not create hidden rules.
- Ziegler's Grove is a localized oak grove, not a forest wall.
- The Brian orchard is small, cultivated, and progressively damaged.
- Modern tour roads, parking, curbs, signs, monuments, and manicured park edges are excluded.

## Farm contract

### Leister

- A small headquarters and aid-station farm group in the Union rear, not a structure on the stone wall.
- Build house, barn, yard, fence, lane/road relationship, hitching area, and restrained working clutter as one composition.
- Planned states: headquarters intact, under cannonade, and post-cannonade aid station.
- Use the immediate July 1863 photograph for silhouette and adjacency; later surveys inform dimensions with a reconstruction label.

### Brian

- A modest working farm at the northern Cemetery Ridge/Ziegler's Grove edge.
- Build house, barn or outbuilding mass, orchard edge, grove, farm lane, fence gaps, low stonework, and trampled defensive ground together.
- Planned states: pre-heavy-fire, active battle damage, and disrupted post-charge.
- Keep the orchard ordered enough to read as cultivation while breaking rows where fire and troop movement damaged them.

## Artillery and effects contract

- Gun type, wheel size, barrel material, carriage, limber, tools, ammunition, horse use, and crew roles require one scale and light.
- Crew actions: carry, load, sponge or ram, aim, fire response, wheel service, recover, limber, withdraw, and casualty response.
- Muzzle flash is brief and directional.
- Smoke grows from the actual muzzle, expands, drifts slowly, thins, and clears.
- Rifle smoke begins along firing ranks with small timing offsets.
- Dust follows movement and discharge; it does not hover as a permanent fog.
- Impacts match soil, wood, stone, or metal.
- Cushing's position needs progressive disruption without turning every opening frame into a destroyed tableau.

## Interface relationship

- The idle field carries no permanent unit name boxes.
- Hover, keyboard focus, touch inspection, or selection reveals formation details.
- Selected-unit arc, objective control, routes, exits, facing, and urgent state cues remain readable.
- Labels scale by zoom and avoid standards, structures, neighboring labels, and objective text.
- Historical landmarks remain identifiable without becoming oversized objective icons.
- Every critical state has a non-color signal.

## Candidate acceptance gate

A candidate family advances only if it passes all of the following:

- [ ] correct battle, period, role, clothing, equipment, and standard treatment;
- [ ] identical camera and light across directions and actions;
- [ ] complete anatomy, hands, feet, rifle, straps, tools, and equipment;
- [ ] stable identity and equipment side across every frame;
- [ ] measured boot pivot and body height;
- [ ] exact direction mapping;
- [ ] no source-cell crop or alpha contamination;
- [ ] strong silhouette at normal play size;
- [ ] no visible paper-doll repetition in a 32-figure line;
- [ ] no foot sliding, identity pop, or weapon jump during animation;
- [ ] correct smoke/effect origin;
- [ ] intentional reduced-motion frame;
- [ ] no gameplay geometry change;
- [ ] no unexplained asset-byte, startup, memory, or frame-time regression;
- [ ] approved close, play, and overview comparisons against the baseline.

## First-candidate ruling

The September 30 `gettysburg-v1` ready turnarounds prove that the upgraded image model can improve individual anatomy, cloth, equipment, and material realism. They do **not** yet pass promotion:

- each army still uses one identity, making repeated ranks more obvious;
- several generated cells place the figure or weapon too close to the source-cell edge;
- boot pivots were derived for evaluation and need authored cleanup;
- the figures require a controlled edge, contrast, and color grade to belong to the terrain plate;
- only `ready` exists, so movement or combat still changes to the accepted `detailed-v2` identity;
- the exact same person repeated 32 times fails the formation-composition target.

Keep the candidate opt-in. The next generation batch must create controlled identities and true opposing march contacts before any default-asset replacement.
