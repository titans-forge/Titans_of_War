# Titans of War

> **Current licensing policy — Forge Game License 2.0 (FG2-TITANS-OF-WAR-CIVIL-WAR-20261015).** That licensing checkpoint requires separate permission for either public hosting or AI training by above-threshold entities on qualifying new Forge-controlled material. Previously supplied gameplay/media retain MIT, earlier Forge and other applicable grants. No retroactive restriction is claimed. See [release scope](LICENSING.md), [complete current terms](LICENSE), [preserved prior terms](LICENSE-LEGACY-PRE-FORGE-2.0.txt), [offline licensing page](FORGE-LICENSING.html) and [new download](https://github.com/titans-forge/Titans_of_War/releases/tag/forge-license-2.0-20261015). Earlier statements below describe the earlier game and preserved grants.


## Current source: 0.32.0 / v45 — iPhone edition

The main branch now contains the polished v44 game source and the new iPhone app shell, replacing the earlier 0.3.1 source snapshot. It includes the cannon app icon, bundled offline assets, native save sharing, pause/suspend integration, safe-area handling and compact phone layouts.

- [iPhone build and testing notes](docs/IPHONE_APP.md)
- [v45 release](https://github.com/titans-forge/Titans_of_War/releases/tag/civil-war-v45-iphone-20261015)
- [Play the existing browser release](https://titans-forge.github.io/Titans_of_War/) · [Play on itch.io](https://titans-forge.itch.io/titans-of-war-civil-war)

The hosted browser and itch releases remain v44. This release updates the GitHub source and adds a v45 browser ZIP for download; it does not publish to the App Store. iPhone installation requires your own Apple signing and provisioning.

Forge Game License 2.0 applies according to the material's versioned scope; earlier MIT/Forge grants and separate media rights remain preserved. The existing licensing checkpoint records its original adoption, not a new audit of every v45 file.


[Play on itch.io](https://titans-forge.itch.io/titans-of-war-civil-war) ·
[Forge source](https://github.com/titans-forge/Titans_of_War) ·
[Report an issue](https://github.com/titans-forge/Titans_of_War/issues) ·
[Game collection](https://github.com/titans-forge/educational-games)

This is the Civil War entry in the Titans of War collection. The existing
repository moved from JCapone83 to Titans Forge on September 30, 2026, retaining
its history and licensing checkpoints. Historical owner names in those records
remain intentional; earlier MIT grants and separate media rights are preserved.
The native edition is based on the verified v44 source; see the release notes for packaging changes and testing limits.

Titans of War is a source-available historical strategy prototype from Titans Forge. It turns Civil War command decisions into a playable pressure system: logistics, food, morale, cabinet politics, military strength, and alternate-history divergence all compound across a campaign.

The game is local-first. It runs in scripted deterministic mode without any AI service, and it can optionally use a local Ollama model as a decision/generation layer when one is available. The project is educational; it is not an endorsement of any historical faction or ideology.

## Why Titans Forge Built It

Titans of War is both a game and a public proof artifact for Titans Forge. The goal is to show how a strategy engine can make messy historical tradeoffs legible: every decision changes resources, faction trust, morale, divergence, and the final campaign ending.

## Basic Facts

- Genre: historical educational strategy game
- Focus: command tradeoffs, campaign pressure, and alternate-history branching
- Era: American Civil War campaign scenarios
- Runtime: browser app built with React and Vite
- AI requirement: none; local Ollama support is optional
- Release channel: GitHub-first source-available project; prior MIT grants retained
- Current project policy: Forge Game License 2.0; earlier MIT code grants retained
- Media license: separate per asset; see `NOTICE` and the media manifests

## Features

- Authored campaign scenarios with deterministic fallback play
- Seeded simulation runs for reproducible outcomes
- Three-part campaign report card at campaign end
- Cabinet, morale, munitions, treasury, and military-pressure mechanics
- Food supply and late-war endurance pressure
- Guided walkthrough and campaign progress tracking
- Share-card export for posting campaign results
- Campaign auto-save plus JSON import/export
- Markdown chronicle export
- Headless benchmark CLI for strategy-policy comparisons
- Optional local Ollama model discovery and turn generation

## Requirements

- Node.js 20.19+ or 22.12+ (as specified in package.json)
- npm 10+
- Optional: Ollama on `http://localhost:11434`
- Optional local model: Gemma 4 12B-it is the recommended agent model when available through your local runner

## Quick Start

If you do not use Git, read [GETTING_STARTED.md](GETTING_STARTED.md). It explains the green GitHub **Code** button, ZIP download, and the double-click launchers.

For the easiest player-facing browser release, Titans of War can also be published as an itch.io HTML5 build. See [docs/itch-io.md](docs/itch-io.md).

```bash
npm install
npm start
```

Your browser should open automatically. If it does not, use the local URL printed in the terminal.

For people comfortable with Git:

```bash
git clone https://github.com/titans-forge/Titans_of_War.git
cd Titans_of_War
npm install
npm start
```

For recording or quick review, use `LOAD HEADLINE DEMO` in the Campaign Archive panel. It opens at Cedar Creek with a curated alternate-history record. A strong result reaches the McClellan election, where the player can conclude the run through a proposed Concurrent Majority settlement.

Run checks:

```bash
npm test
npm run validate-assets
npm run build
```

Run a deterministic benchmark:

```bash
npm run benchmark -- --policies balanced,hotspur,fox,wolf --seeds 1861,1862,1863
```

Benchmark installed local Ollama chat models:

```bash
npm run benchmark -- --models installed --seeds 1861,1862
```

## Local AI

Titans of War does not need a model to run. If Ollama is installed, the in-app local AI portal can discover installed chat models and use one for scenario generation or decision selection. If Ollama is unavailable, the game reports that clearly and continues with scripted campaign logic.

When the local AI portal is engaged, the authored Civil War spine still runs whenever a scenario exists for the current turn. Procedural generation is reserved for the explicit "free play" mode and for campaign continuations past the authored catalog. This preserves curated content as the default experience.

Recommended local model: Gemma 4 12B-it. It is the preferred option for Titans Forge agent contributions, benchmark decision selection, and optional in-game local generation because it should fit ordinary enthusiast PCs better than very large frontier-style local models while still giving stronger reasoning than small fallback models. See `docs/local-models.md`.

> **Note on availability.** Gemma 4 12B-it released only a few days before this build. The Ollama registry typically takes several days to publish a new family. Until the official `gemma4:12b-it` tag is live, players who want to try the local-AI path can run one of the fallback families below; the engine discovers any installed chat model at runtime and adapts.

Other workable choices:

- Qwen 7B/14B for strong structured JSON and scenario drafting
- Llama 8B-class models for broad local compatibility
- Mistral 7B for fast text generation on modest hardware
- Phi-class models for low-memory machines

Local AI is optional. The public game, scripted scenarios, campaign scoring, walkthrough, exports, and benchmark policies all work without a model.

## Campaign Report Card

Every campaign closes with three A-F grades plus a transparent 0-1000 composite score so human runs and headless model-tournament runs are directly comparable. The score is computed by `calculateCampaignScore` in `src/game/simulationEngine.js`.

| Component | Cap | What it measures |
| :--- | ---: | :--- |
| Tactical Smarts | 350 | Whether battlefield decisions were sound: preserving armies, choosing defensible ground, avoiding reckless assaults, and making correct operational calls such as holding Lee back at the Wilderness. |
| Strategic Brilliance | 400 | Whether political, logistical, diplomatic, food, treasury, and cabinet decisions strengthened long-run survival rather than chasing short-term drama. |
| Timeline Fidelity | 250 | How closely the campaign stayed to the historical timeline. High divergence no longer ends the game by itself; it lowers this grade. |

Each report-card component receives its own A-F grade: `A` >= 90, `B` >= 80, `C` >= 70, `D` >= 60, otherwise `F`. The composite score also receives an A-F grade: `A` >= 900, `B` >= 800, `C` >= 700, `D` >= 600, otherwise `F`.

Example: a campaign might earn `Tactical Smarts: B`, `Strategic Brilliance: A`, and `Timeline Fidelity: D` if the player made excellent field and political decisions while pushing the war far outside the original chronology.

## Win Conditions

The campaign has several ending families. This section contains light mechanical spoilers.

- **Historical defeat and reunion:** Most campaigns reach Richmond, Appomattox, or Greensboro. The final result depends on army strength, food, morale, divergence, and the settlement selected.
- **McClellan settlement:** Keeping Joseph E. Johnston in command long enough to delay Atlanta, then producing enough military and political pressure in the Valley, can elect McClellan. He still requires reunion. Accepting the Concurrent Majority proposal ends the scripted campaign with McClellan promising to submit the amendment to Congress and the states, not guaranteeing ratification.
- **Gettysburg recognition:** Albert Sidney Johnston must survive Shiloh, Jackson must survive Chancellorsville, and Jackson's immediate assault at Gettysburg must succeed. Britain and France then offer recognition and mediation. The player may accept the armistice and end with recognized independence or continue fighting for stronger terms.
- **Late full independence:** Players who continue after recognition must preserve the rare military chain, win the McClellan election without accepting reunion, and reach the final peace crisis at very high divergence. Full independence remains the hardest ending.

Reaching `100%` divergence does not automatically end the game. It records a fully severed timeline and lowers the Timeline Fidelity grade.

## Media Policy

Previously published source code retains its MIT licence; new covered material follows the checkpoint in `LICENSING.md`. Historical images, audio recordings, and other media keep their own rights status.

Verified public-domain or permissively licensed assets are documented in:

- `src/game/mediaCatalog.js`
- `src/game/audioCatalog.js`
- `src/game/historicalAssetManifest.js`
- `docs/media-sourcing.md`
- `docs/historical_assets_curation.md`
- `MEDIA_RIGHTS.md`
- `NOTICE`

Assets marked `needs-review` or `recording-needed` are not public release assets. They are placeholders or sourcing targets until provenance is resolved.

Project-authored photographs and project-created images are offered under CC BY 4.0 to the extent transferable rights exist. Public-release AI images were created with OpenAI, xAI, or Google tools. Experimental local FLUX.2 Klein outputs are excluded from the repository and release build. See `MEDIA_RIGHTS.md` and `NOTICE`; third-party historical media retains the rights status recorded in its catalog entry.

## Sharing Results

Campaign-end reports include a `Titans Forge Share Card` export with:

- outcome and ending class
- report-card grades and composite score
- divergence percentage
- final resource state
- recent decisions
- reproducible campaign seed

The share card is intended for X, LinkedIn, Discord, screenshots, and beta feedback threads.

## Project Structure

```text
src/
  App.jsx                     Main gameplay UI
  components/                 Tactical map and scenario theater UI
  engine/                     Optional local model and audio managers
  game/                       Scenario data, simulation engine, storage, catalogs
scripts/
  benchmark-engine.mjs        Headless benchmark runner
  smoke-test.mjs              Dependency-free smoke checks
  validate-content.mjs        Scenario/catalog validation
  validate-assets.mjs         Media manifest validation
docs/
  historical_assets_curation.md
  media-sourcing.md
```

## Contributing

Good first contribution areas:

- New historically grounded scenarios
- More tests for engine math and state transitions
- Save/load UX improvements
- Campaign-end summary improvements
- Accessibility and performance work
- Verified public-domain or permissively licensed media sourcing

Before opening a change:

```bash
npm test
npm run validate-assets
npm run build
```

## License

Current project policy: [Forge Game Hosting License 1.0](LICENSE), with the
release boundary recorded in [LICENSING.md](LICENSING.md) and
[LICENSING_CHECKPOINT.json](LICENSING_CHECKPOINT.json).

For newly covered material, companies with gross annual revenue **over
US$1,000,000** need a separate written licence to publicly host their own playable
copy. Ordinary playing and private internal/classroom use do not require one.
See the full terms for platform embeds, revenue calculation and exceptions.

**Earlier MIT permissions remain available.** The original notice is preserved in
[LICENSE-LEGACY-MIT.txt](LICENSE-LEGACY-MIT.txt). Previously MIT-licensed code,
documentation and assets keep those grants, including hosting rights for the same
material. Existing media and third-party rights/credits remain unchanged.
This policy update does not rewrite old releases or make identical MIT material
exclusively Forge-licensed. Future covered game changes need a distinct release
boundary. [Commercial inquiries](https://titans-forge.itch.io/).
