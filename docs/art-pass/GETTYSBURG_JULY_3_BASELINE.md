# Gettysburg July 3 Art Baseline

**Snapshot date:** 2026-09-30  
**Scenario:** `gettysburg` (the historical July 3 battlefield, not `gettysburg_jackson`)  
**Rules baseline:** fresh-campaign `battleRulesVersion: 17`  
**World:** 1700 × 900  
**Machine-readable inventory:** [`manifests/gettysburg-july-3-assets.json`](manifests/gettysburg-july-3-assets.json)

This is the frozen technical baseline for the first focused art pass. It distinguishes files fetched by the Phaser scene, textures generated in memory, art that is actually selected for display, conditional art, and compatibility fallbacks. That distinction matters: Gettysburg currently fetches much more art than it normally shows.

## Baseline result

| Measure | Current value |
| --- | ---: |
| Phaser loader entries | 47 |
| Unique preload URLs | 45 |
| Unique image files | 25 |
| JSON atlas files | 20 |
| Unique preload file bytes | 38,913,341 bytes / 37.11 MiB |
| Unique decoded image RGBA lower bound | 158,004,404 bytes / 150.68 MiB |
| Generated canvas texture allocation represented by the current code | 98,525,760 bytes / 93.96 MiB |

The decoded and generated figures are engineering estimates from pixel dimensions at four bytes per pixel. They are not a browser heap measurement and must not be added together as a claim about steady-state memory. Detailed and scenery source textures are removed after their replacement canvases are registered, while browser caching and Phaser internals can retain other allocations. A live trace remains necessary before making a memory or startup-time claim.

The 45 unique files split as follows:

| Runtime role | Files | File bytes | Meaning |
| --- | ---: | ---: | --- |
| Active | 22 | 25,323,724 / 24.15 MiB | Directly selected in ordinary July 3 play |
| Conditional active | 2 | 828,700 / 0.79 MiB | Union rear-facing fire fallback only |
| Loaded but unselected | 2 | 2,266,592 / 2.16 MiB | Foliage atlas is composited but Gettysburg does not stamp it |
| Compatibility fallback | 19 | 10,494,325 / 10.01 MiB | Preloaded but superseded by detailed units and procedural artillery |

Two image URLs are each entered twice in the loader: `realistic-v1/axial-aim.png` and `realistic-v1/artillery-crew.png`. The static audit counts them once in unique file bytes. Browser request caching may prevent a second network transfer, but Phaser still creates distinct side-specific atlas registrations.

## What the player actually sees

### 1. Base terrain

A fresh rules-17 campaign replaces the configured legacy terrain with:

- `public/images/battles/gettysburg-terrain-v3.png`
- Native dimensions: 1724 × 912
- Display size: 1700 × 900
- SHA-256: `4b82798c9d15b75010cc96cc9b352488fa4a2e5ba58465525dd98dd0764c2ba1`

`gettysburg-terrain-v1.webp` and `gettysburg-terrain-v2.webp` remain on disk for earlier rule envelopes but are not loaded by this baseline.

### 2. Physical scenery and connected ground

`drawGettysburgTerrain()` creates the 1700 × 900 `gettysburg-physical-scenery-v2` canvas in memory. It stamps:

- split-rail fence sections along the road band;
- stone-wall sections inside the exact wall rules rectangle;
- yard tint, farm lanes and cultivated plots around both current landmarks.

The visible fence and wall fragments use `realistic-v2/earthworks.png` plus its four-frame JSON index. The renderer also loads and composites `realistic-v2/foliage.png`, but the Gettysburg terrain path never calls a foliage stamp. It is payload without a July 3 visual contribution.

The scenery layer is visual only. Its fence, wall and landmark surroundings follow existing engine geometry and do not define new cover, movement or collision rules.

### 3. Landmarks

Rules 17 load and display both current July 3 landmarks:

| Landmark | File | Source size | Battlefield display |
| --- | --- | ---: | ---: |
| Abraham Brian House | `landmarks-v7/brian-house.png` | 1536 × 1024 | 162 × 126 |
| Leister House | `landmarks-v3/leister-house.png` | 1374 × 1145 | 150 × 128 |

Both have physical rectangular footprints, labels, connected farm ground and building-aware movement/fire/melee tests. The artwork is illustrative and the compressed placement is not a survey coordinate.

### 4. Infantry

The opening field contains eight infantry formations, each with a stable visual capacity of 32 figures. Under the current successful load path:

- idle figures select the side-specific `detailed-v2/*-ready` atlas;
- marching and routing figures select `detailed-v2/*-walk`;
- firing and melee figures select `detailed-v2/*-aim`;
- one Union rear-fire direction deliberately selects `realistic-v1/axial-aim.png` through `union-aim.json` because the detailed rear working pose was rejected;
- deterministic pose, spacing, tint and scale variation comes from code and does not move simulation feet.

Each detailed PNG is chroma-composited once into an in-memory Phaser atlas. The source texture is then removed. `realistic-v1` infantry and both directional families remain preloaded as compatibility fallbacks, but a healthy rules-17 load does not select them.

### 5. Artillery

The opening field contains Alexander's Artillery and Cushing's Battery. Their gun carriage, limber, wheels, barrel, recoil and shadows are procedural Phaser graphics from `artilleryVisual.js`. Current external artillery art is limited to the crew:

- `detailed-v2/confederate-crew.{png,json}`
- `detailed-v2/union-crew.{png,json}`

`union-artillery-v2.png` and `realistic-v1/artillery-crew.png` are still fetched, but the tactical renderer hides the former and chooses the detailed crew over the latter when current assets load successfully.

### 6. Standards

The only external flag material is `realistic-v2/bunting.png`. `createStandardTextures()` combines it with code-drawn period designs and generates five 1920 × 768, 32-frame cloth atlases in memory:

- `cloth-us-national-34` — selected for Gettysburg Union formations;
- `cloth-anv-13` — selected for Gettysburg Confederate formations;
- `cloth-us-national-35` — generated but not selected here;
- `cloth-first-national-11` — generated but not selected here;
- `cloth-first-national-13` — generated but not selected here.

The Gettysburg standards are representative national/army patterns, not exact regimental colors. The animation pins the hoist, adds sag, light and shadow, uses deterministic phase offsets, and freezes to a stable frame under reduced motion.

### 7. Effects

Gettysburg loads no external effect image or particle file. The following effects are code-drawn and scene-owned:

- formation ground shadows;
- marching dust;
- infantry volley smoke;
- artillery smoke, flash and recoil;
- strength loss through declining visible figure count and strength bar;
- close-combat poses and status cue;
- routing/withdrawal disappearance through a one-field-second fade;
- selection arc, fire arc, target cue, route and destination marks.

Paused play and reduced-motion behavior are explicit. No timer, tween or effect object feeds a visual coordinate back into combat state.

### 8. Battlefield UI

The Phaser layer creates its tactical UI from text and graphics rather than image assets:

- unit names, strength bars and condition cues appear on mouse hover or touch inspection;
- the selected formation uses a short ground arc instead of a unit box;
- mission markers, three ridge sectors, six rear-exit markers and terrain labels are toggleable;
- landmark names and outlines are toggleable with mission markers/overlay state;
- `Outfit` is the principal battlefield typeface, while `Georgia` is a system fallback for the location callout.

The surrounding React encounter uses Lucide SVG components bundled as code. The 768 × 768 `src/assets/images/gettysburg_card.jpg` is the pre-battle scenario image; it is not part of the Phaser preload total. Global local font files are listed separately in the JSON manifest because browser font fetches depend on the rendered weights and cache state.

## Current opening composition

The July 3 scene starts with ten representative formations:

- Confederate infantry: Pickett, Pettigrew, Trimble and Wilcox;
- Confederate artillery: Alexander;
- Union infantry: Gibbon, Hays, Webb at the Angle and Hancock's Reserve;
- Union artillery: Cushing.

This yields a maximum ordinary opening representation of 256 infantry figures, six detailed artillery crew figures, two procedural gun systems and ten standards. Strength loss reduces visible figures; it does not swap to a separate casualty texture.

## Validation evidence

All commands were run against the dirty working tree on 2026-09-30 without modifying existing source or art.

### Asset suite

`npm run validate-assets` passed every stage:

- historical asset manifest: 17 entries, zero warnings;
- legacy, detailed, melee and realistic infantry atlas checks;
- detailed pose bounds, hashes and rear-fire fallback;
- cloth bounds, animation loop and reduced-motion stability;
- scenery chroma and indexed-frame checks;
- artillery, siege and presentation asset checks;
- 41 PNG repack checks, including Gettysburg terrain, both landmarks, standards material, scenery sheets, detailed units and artillery art, each preserving recorded pixels and metadata.

### Gettysburg suite

`npm run test:gettysburg` passed 81 tests across mechanics, command/debrief presentation and artillery visuals. Relevant art boundaries include:

- 34-star Union and 13-star Confederate standards;
- renderer withdrawal fade and restored arriving standards;
- stable deterministic stepping;
- detailed crew anchors and pause/reduced-motion behavior;
- artillery geometry, recoil, limber and object reuse.

### Landmark suite

`npm run test:landmarks` passed 175 tests across all landmark generations. Gettysburg-specific coverage includes both houses, connected yards, opening clearances, bilateral line-of-fire blocking, close-combat blocking, routing around footprints, scheduled-arrival safety and deterministic 1×/4× stepping.

### Static preload audit

`node scripts/audit-field-assets.mjs` reported the 47 loader entries, 45 unique files and 38,913,341 file bytes recorded above. This script reports local file size, not transfer compression, cache behavior, decoded memory, startup time or frame time.

### Missing performance evidence

No fresh live-browser `?fieldProfile=1` trace was captured for this document. The scene already exposes ready time, frame p95, update p95, snapshot builds and formation passes after 120 frames, but those values depend on hardware, viewport, zoom, cache and running/paused mode. The first visual replacement should capture this evidence before and after integration at the same viewport and camera state.

## Art-pass implications

1. Gettysburg's first replacement should target the active detailed pages, terrain, two landmarks, earthworks sheet and bunting material. Replacing a fallback family first cannot improve a healthy current load.
2. Preserve the current atlas frame names, native boot anchors, terrain world alignment, landmark display aspect ratios and standard keys unless the integration code and tests change together.
3. Do not paint tactical obstacles into the terrain plate unless their engine rectangles remain authoritative. The current renderer intentionally stamps fence and wall art from rule geometry.
4. The first performance gain available without visible compromise is eliminating or deferring the 10.01 MiB compatibility preload and the 2.16 MiB unused foliage preload after a verified failure-mode plan exists.
5. Gettysburg currently creates three flag atlases it cannot display in this scenario. Lazy generation is a separate optimization candidate after the art result is accepted.
6. Capture identical overview, formation-focus, artillery-fire, close-combat, routing and reduced-motion frames before promoting new art. The focused pass needs to improve close-up realism without losing formation readability at fit zoom.

## Baseline boundary

This inventory covers the current historical July 3 battlefield scene and its immediate React shell dependencies. It does not claim a network waterfall, GPU allocation, browser heap size, visual score, historical uniform certification or independent human review. It does not cover the alternate `gettysburg_jackson` board.

