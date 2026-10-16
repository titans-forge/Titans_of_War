# Gettysburg v1 Ready Candidate Review

**Date:** September 30, 2026  
**Status:** Useful proof; remains opt-in  
**Selector:** `?artPass=gettysburg-v1`  
**Scope:** Gettysburg historical board, infantry `ready` page only

## Decision

Keep the new figures as a development candidate and continue the family. Do not promote them to the default game yet.

The upgraded image model delivers a meaningful gain in anatomy, period material texture, faces, packs, straps, rifles, and natural body proportion. That gain survives downscaling. The live formation comparison also reveals the next problem clearly: higher-fidelity copies of one soldier still look like copies. A promoted family needs multiple stable identities and complete action continuity.

## Scorecard

| Category | Candidate score | Finding |
|---|---:|---|
| Source-level anatomy and materials | 9.2 / 10 | Clear improvement in wool, leather, wood, metal, faces, and natural proportions. |
| Historical plausibility | 8.4 / 10 | Strong representative treatment; final clothing/equipment and artifact review still required. |
| Eight-direction coherence | 7.8 / 10 | Bearings are usable after remapping, but spacing, body placement, and a few view transitions need authored cleanup. |
| Alpha and silhouette | 8.5 / 10 | Native alpha is clean enough for evaluation; some cells approach frame edges and need production-safe padding. |
| Play-scale readability | 8.6 / 10 | Army side and upright posture remain readable; Confederate values need grading against dry terrain. |
| Formation naturalism | 6.2 / 10 | One identity and one ready pose repeated across 32 figures still creates a stamped rank. |
| Action continuity | 4.0 / 10 | Only ready is new; march, aim, crew, melee, route, and fall remain in the accepted family. |
| Pivot and animation readiness | 6.8 / 10 | Evaluation pivots work statically; several cells need manual boot, rifle, and crop cleanup before motion production. |
| Runtime isolation | 10 / 10 | Exact historical Gettysburg-only query selector; no alternate-Gettysburg or default-route spill. |

## What passed

- exact side-specific transparent source sheets exist in the project;
- eight game directions resolve through an explicit atlas map;
- figure scale survives the current body-height contract;
- the candidate renders in the actual Phaser field without console errors;
- default art remains the fallback when the selector is absent;
- movement and all non-ready pages remain available from the accepted family;
- candidate file hashes, dimensions, frame bounds, pivots, and selector behavior have automated coverage.

## What failed promotion

1. **Identity repetition:** one face, body, equipment arrangement, and stance per army repeats across the full line.
2. **Incomplete family:** entering march, fire, or melee changes the figure back to the old identity and style.
3. **Source-cell discipline:** Union front and oblique views reach the lower cell edge; multiple figures need more controlled padding.
4. **Pivot confidence:** boot anchors were measured from alpha for live evaluation and have not received frame-by-frame human correction.
5. **Scene grading:** figures are crisper and more photographic than the terrain and landmarks. They need a shared grade and edge treatment.
6. **Confederate contrast:** gray clothing can merge into the warm dry approach when formations are not selected.
7. **Color-party integration:** the existing standard still floats above a rank and is not attached to the new human family.

## Next production move

Generate and test a controlled mini-family before creating every action:

1. two additional Confederate identities and two additional Union identities with the same camera, light, scale, source grid, and equipment-side rules;
2. one true opposing-foot march pair for one accepted identity per side;
3. one officer and one color bearer per side;
4. one artillery service role per side;
5. offline cleanup of every accepted cell, including foot pivot, crop, weapon, hand, edge, and grade;
6. deterministic identity selection that persists through action changes;
7. matched opening, movement, and reduced-motion captures;
8. performance comparison against the baseline preload.

Only after that mini-family passes should production expand to fire, reload, melee, route, fall, and full crew pages.

## Evidence

- [Capture set](../captures/gettysburg-baseline/README.md)
- [Current implementation audit](gettysburg-implementation-audit.md)
- [Art direction lock](../direction/gettysburg-july-3-art-direction.md)
- [Candidate prompts](../prompts/gettysburg-v1-ready-turnarounds.md)
- [Candidate manifest](../manifests/gettysburg-v1-ready-candidates.json)
