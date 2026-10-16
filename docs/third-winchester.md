# Third Winchester: The Middle Field

## Scope

The September 19, 1864 encounter extends the existing `third_winchester`
campaign stage with optional field command and deterministic delegation.
Quick battle also exposes it directly, without advancing a campaign save.
The following Cedar Creek stage and election conditions remain in place.

## Historical Grounding

The tactical problem is to resist Sheridan's larger army without losing Early's
army when fresh forces turn the northern flank. The Middle Field, woodland
edges, Red Bud Run, and the approach toward Winchester shape the encounter.
The Confederate counterattacks and Union reinforcements provide opportunities
and constraints, rather than a guaranteed repetition of the historical result.
Historically Sheridan won and Early withdrew south.

Sources consulted September 4, 2026:

- [National Park Service: Third Battle of Winchester](https://home.nps.gov/articles/000/third-battle-of-winchester.htm)
- [Shenandoah Valley Battlefields Foundation: The Third Battle of Winchester, Brandon H. Beck](https://www.shenandoahatwar.org/third-winchester-article-1)
- [National Park Service: Restoring Order in the Landscape of Memory](https://www.nps.gov/articles/000/third-winchester.htm)

These sources inform geography and the sequence of the fighting. The scenario
briefing no longer places the main battle line across Opequon Creek or presents
a fictional three-day delay caused by political rumors as historical fact.
Political publicity remains an alternate strategic choice, not a supernatural
field advantage.

## Fidelity Boundaries

- The map compresses an east-facing view: east at the top, west and the approach
  toward Winchester at the bottom, north on the right.
- Forces and time represent larger commands and phases. Displayed soldiers
  are not literal headcounts, and field minutes do not reproduce clock time.
- The terrain is a geography-informed artistic reconstruction, not surveyed
  terrain, a present-day photograph, or a reconstruction of every fence.
- The wooded stream corridor and farm buildings are representative. Their
  exact bends, elevations, and architectural details are not verified.
- Mounted operations outside this infantry sector are described as pressure
  on the flank; infantry sprites must not be labeled as mounted cavalry.
- A successful rearguard preserves the army; it is not a claim that Winchester
  was historically held. Alternative battlefield outcomes remain counterfactual.

## Terrain Provenance

- Runtime file: `public/images/battles/third-winchester-terrain-v1.webp`
- Creator/provider: Titans Forge art direction; OpenAI image generation.
- Generated: September 4, 2026. No third-party reference image was supplied.
- Dimensions: 1672 x 941. WebP quality 88, 412750 bytes.
- SHA-256: `868367c311d8f6a8d9a1c260b1b83a9923d48d81f0aeb7a93e71c40b79382bad`
- Rights: Project Media terms in `MEDIA_RIGHTS.md`, subject to its
  AI-output/copyrightability qualifications.
- Direction: high-oblique Virginia limestone farm country; open Middle Field;
  First Woods in the distance; Second Woods near the left; narrow wooded Red
  Bud Run at right; dirt Berryville approach at left; no soldiers, labels,
  modern infrastructure, or fixed combat effects baked into the plate.

## Release Boundary

This is a local game update. It does not itself publish to itch.io, replace the
release ZIP, push GitHub changes, or migrate the repository.

## Verification

- `npm run validate`: passed, including content, campaign, agent, and media checks.
- Third Winchester tests: 37 passed. Coverage includes all four choices at
  weak, normal, and strong readiness; covering withdrawals; Crook's arrivals;
  northern pressure; exit thresholds; save migration; and idempotent results.
- All 40 pre-addition battle replay baselines remain unchanged.
- Visual-state tests: 69 passed. Retreat-pacing tests: 50 passed.
- Production build: passed; existing large-chunk advisory remains.
- Browser: opening, firing, Crook's flank arrival, player-issued withdrawal,
  practice debrief, and return to selection verified. A mobile-layout run
  reached army-preserved withdrawal, score 71, without changing campaign state.
- Responsive visual checks: 390x844, 768x1024, 1366x768, 1920x1080.
  These are browser viewport checks, not physical-device performance claims.
- Objective, destination, and begin/resume controls now stack without overlap.
  Unused Phaser audio is disabled; campaign music retains its own audio owner.
