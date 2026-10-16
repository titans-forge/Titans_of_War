# Tactical Battle Engine

Titans of War remains a deterministic, authored strategy campaign. Tactical
battles are optional encounters that can modify a chosen strategic result; they
do not replace the campaign graph or require AI.

## First Manassas Vertical Slice

The `manassas_battlefield` scenario now offers two routes after the player
commits a strategic choice:

1. **Command the field** opens the Henry Hill battle. The player selects
   Confederate formations, changes formation order, issues commands, and uses
   terrain, fire discipline, and reserves to resist McDowell's attack.
2. **Delegate to staff** resolves the same battle deterministically from the
   campaign state and selected strategy.

Both routes return a bounded tactical consequence to the authored campaign,
record the result in the versioned save, and then continue to the next scenario.
Displayed formations represent larger commands rather than a literal order of
battle.

## Battlefield Terrain

Each encounter uses a high-oblique terrain plate rather than a flat decorative
backdrop. Henry Hill emphasizes open rolling ground and artillery sightlines;
Shiloh uses a wooded plateau, farm clearings, ravines, and the Tennessee River;
Chancellorsville is organized around forest roads and the Hazel Grove clearing;
and the Wilderness compresses movement into the Orange Plank and Brock Road
corridors amid dense second-growth timber. Cedar Creek spans the creek's wooded
banks, the Belle Grove plateau, Valley Pike, open farm country, and the distant
Shenandoah ridges. Gettysburg opens the broad farm basin between Seminary and
Cemetery Ridges, with the Emmitsburg Road, Codori farm, Cemetery Hill, Culp's
Hill, and the Round Tops establishing the tactical geometry. Historical maps
and National Park Service landscape descriptions informed the terrain
relationships. Chickamauga uses dense hardwood belts, irregular farm
clearings, LaFayette Road, Brotherton Farm, Dyer Field, and the low wooded rise
toward Horseshoe Ridge to make command friction visible. Cold Harbor places
Lee's irregular earthworks across low Hanover County ground, with open pine
woods, shallow ravines, farm roads, and overlapping fire lanes separating the
Bethesda Church-Cold Harbor front. Petersburg centers the mine-torn salient,
intact trench shoulders, covered approaches, secondary works, and the narrow
ground separating Burnside's IX Corps from the heights above the city. The plates are representative
reconstructions, not surveyed GIS models.

## Implemented Encounters

- **Third Winchester:** the Middle Field defense, Red Bud Run flank pressure,
  and an army-preserving retreat toward Winchester. See
  [Third Winchester](third-winchester.md) for geographic and media notes.

- **First Manassas:** Henry Hill defense, formation control, reserves, and
  ammunition discipline.
- **Shiloh:** corps coordination, Johnston exposure, Pittsburg Landing, and
  Buell's timed arrival.
- **Chancellorsville:** staggered arrival of Jackson's flank column, a closing
  surprise window, XI Corps morale shock, and an alerted-Union response when
  the march is delayed. Jackson's survival remains the separate authored dusk
  decision on the following turn.
- **The Wilderness:** a battered opening line, restricted visibility and
  off-road movement, choice-dependent arrival of the Texas Brigade and
  Longstreet, a penalty for committing Hill too early, and explicit command
  risk when Lee rides into the front.
- **Cedar Creek:** a timed dawn-surprise window, Early's choice-dependent
  discipline problem in the captured camps, Sheridan's return and Union
  recovery, and separate victory, historical-defeat, and army-preserving
  withdrawal paths tied to the 1864 election branch.
- **Gettysburg, historical branch:** Alexander's cannonade opens a bounded
  assault window across the Emmitsburg Road; Pickett, Pettigrew, and Trimble
  must maintain coordination against the stone-wall line. Repositioning and
  withdrawal choices retain army-preserving outcomes rather than demanding an
  artificial battlefield victory.
- **Gettysburg, Jackson-survives branch:** Jackson's divisions can reach
  Cemetery Hill and Culp's Hill before Hancock closes the Union fishhook.
  Surprise, reinforcement timing, and control of the heights determine the
  result. Only a decisive victory satisfies the separate campaign gate for
  foreign recognition.
- **Chickamauga:** Longstreet's wing must remain concentrated while the Union
  center shifts near Brotherton Farm. Passing through the accidental gap earns
  the historical costly victory; pushing at least two divisions into Dyer Field
  before Thomas forms Horseshoe Ridge creates the rarer decisive result.
  Distributed frontal attacks lose cohesion in the woods, while the cavalry
  option retains its separate strategic value without inventing an easy field
  victory.
- **Cold Harbor:** Grant's corps cross broken open ground and shallow ravines
  against an interlocking Confederate trench line. Deepening and holding the
  works produces the strongest defensive result; counterattacking abandons
  their protection. The Petersburg-pivot choice instead requires Breckinridge
  and Hill's reserve to clear the rear road while the remaining line screens
  the movement.
- **Petersburg and the Crater:** Burnside's divisions begin with a successful
  mine breach but must escape the crater and broken works before Confederate
  reserves arrive. The historical branch requires both of Mahone's
  representative brigades to reach the breach together. Secondary-line
  containment can preserve Petersburg but cannot earn the same decisive
  result. The night-sortie branch must strike two siege sectors and return;
  the experimental-mine branch must catch the assault inside marked lanes
  before reserves close the perimeter.

## Architecture

- `src/battle/civilWarEngine.js`: pure deterministic movement, fire, morale,
  fatigue, ammunition, routing, and outcome rules.
- `src/battle/formationMath.js`: formation slots, perspective projection, and
  representative casualty contraction.
- `src/battle/formationVisualState.js`: presentation-only facing, travel-driven
  poses, stable casualty identities, temporary fallen figures, and reforming.
- `src/battle/CivilWarBattlefield.jsx`: lazy-loaded Phaser renderer.
- `src/game/battles.js`: campaign readiness, delegation, scoring, and ledger
  integration.
- `src/components/CivilWarBattleGate.jsx`: command-or-delegate decision.
- `src/components/CivilWarBattleEncounter.jsx`: field command interface.

The engine does not alter existing scenario IDs, choice IDs, or deterministic
campaign routing. Campaign saves migrate from versions 1 or 2 to version 3 and
gain a `battleCampaign.results` ledger.

## Expansion Status

The planned tactical sequence through Petersburg is implemented. Future
encounters should be selected only when they add a new command problem rather
than duplicating the existing assault, defense, maneuver, breakthrough,
withdrawal, and siege mechanics.

Each migration should reuse the deterministic engine but add battle-specific
terrain profiles, formations, objectives, and unit art. No encounter should be
added until command, delegation, save/resume, mobile layout, and campaign return
all pass the same tests as First Manassas.

## Regression Contract

`scripts/test-battle-campaign-integration.mjs` runs every authored choice across
all tactical encounters at weak, standard, and strong readiness. It verifies
deterministic delegation, monotonic readiness scoring, formation loading,
ledger closure, idempotent battle effects, tactical report-card integration,
and return to the strategic campaign. This complements the battle-engine tests,
which exercise authored battlefield objectives and timing directly.

Alternate Gettysburg deliberately reserves the delegated decisive result for
Jackson's immediate seizure of the heights. The envelopment, Baltimore Pike,
and wide-turning postures can earn bounded tactical success, but they do not
silently duplicate the separate recognition-grade branch.

The itch build runs `scripts/prune-release-assets.mjs` after Vite finishes. It
derives the shipped campaign-picture allowlist from the resolved scenario and
ending graph, removes only unused copies from `dist`, and then checks every
picture URL embedded in the production JavaScript. Source media remains intact
in `public` for later scenario work and rights review.

## Formation Presentation Upgrade, September 2026

Infantry now uses original eight-direction Blender atlases with idle, walk,
fire, reload, route, and fall poses. See `civil-war-directional-infantry.md` for
reproduction and asset details. Artillery retains its existing illustration.
The renderer does not alter movement orders, combat, morale, objectives, grades,
or saves. Generic CS/US standards mark factions, not historical regimental flags.

Soldiers stay upright while their positions turn smoothly. Projection scales
both rank spacing and figures; foot shadows, ground selection polygons, and hit
regions follow the displayed footprint. Flags are independently selectable.
Actual displacement drives gait, including withdrawal, while simulation time
controls firing, reloading, casualties, and the final retreat. Ordinary pause
and completion freeze the scene. Names appear only on selection or hover.

Losses remove stable front-first figure identities and retain gaps during fire.
Survivors regroup after movement/disengagement or a formation change; routing
spread grows from retreat travel rather than jumping to full scatter. Displayed
figures represent larger commands, not literal soldier counts. Resolution keeps
positive-strength broken survivors distinct from deaths.

Verification: 9 geometry tests, 65 visual-state/replay tests (all 10 battles and
40 opening choices), and checks for every one of 384 atlas frames. Full project
validation and production build pass. The maximum tested allocation is 385
figures; the two infantry textures total 1,766,742 bytes. Engine and battle
definition source hashes were unchanged during this visual batch.

Browser checks cover Shiloh advance, fire, losses, routing, completion, selection,
zoom, and 390x844, 768x1024, 1366x768, and 1920x1080 layouts, plus a dense
Petersburg deployment. These are desktop-browser viewport checks, not physical
phone performance measurements. Device FPS targets remain unmeasured.

Further balance changes (formation separation, approach/stop rules, and order
behavior) must be tested separately. This local preview has not been published;
the existing itch ZIP was not replaced by this batch.

### Color And Retreat Follow-up

Player review favored the earlier stronger blue/gray colors while retaining the
new geometry. Infantry has been rerendered with clearer blue Union coats,
lighter blue trousers, and a more neutral Confederate gray; poses and meshes
are unchanged. The atlas textures now total 1,790,828 bytes.

Routed movement during active combat is 15% slower; ordered withdrawals retain
their previous speed. The post-decision retreat multiplier is 2.8x instead of
4.4x, with a 5.4-second closing interval instead of 3.4 seconds. The winning
side remains stationary. Morale, cohesion, and strength thresholds for routing
are unchanged. The previous source-hash invariance applies to the visual-only
batch above, not this subsequent movement-speed adjustment.


## Gettysburg Retreat Corridors, October 3, 2026

Battle rules18 adds a bounded retreat search for July3 Gettysburg only. It runs
for routing and ordered Withdraw, including a safe partial corridor when a
formation must leave a tight corner before planning again at its actual facing.
The search starts at the actual position, checks continuous formation contact
and building intersections, retains the earlier radial clearance requirement,
and rechecks each actual stride and turn. It never moves a blocking formation
or increases a retreating formation's speed. Fallback and other battlefields
keep their prior movement.

The same chosen rear exit and its existing arrival envelope remain authoritative.
The alternative disengagement requirement remains220 field units of travel,
including180 toward the rear, with285 separation and clearance from enemy firing
reach. Close enemy control, capture timing, casualties, objectives and result
freezing remain unchanged. A safe next waypoint does not guarantee a clear exit.

The existing selected-formation inspector now explains the direct-route blocker,
a checked local detour, a threatened exit, firing reach and close enemies. A
friendly-blocker selection button pauses, focuses and opens that formation's
inspector. It sends no order; the player must preview and confirm a normal Move.
Unavailable, routed, enemy and stale blockers cannot be selected through it.

Fresh campaign/practice state uses rules18 and campaign save envelope22. Earlier
save envelopes retain their recorded rules, including envelope21/rules17; merely
loading and saving an archive does not promote it. New Gettysburg corridor state
is serialized, validated and restored with the existing field checkpoint. An
explicit mechanics upgrade is available before starting an older Gettysburg
battle. Older results preserve their original recorded rule version.

Search limits are176 nodes,128 expansions,4096 checked segments and64 waypoints.
Successful or unsuccessful replanning waits respectively2 or4 field minutes.
Those caps bound work rather than guarantee an escape from every arrangement.
Complete-encounter device performance and human usability remain separate gates.
