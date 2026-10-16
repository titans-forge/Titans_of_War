# itch.io Browser Release

GitHub remains the source-code home for Titans of War. itch.io is the player-facing page for people who want to click and play without Git, Terminal, Node.js, or a local checkout.

## Recommended Project Setup

- Project title: `Titans of War: Civil War`
- Project type: HTML / browser-playable game
- Pricing: free or pay-what-you-want
- Visibility while testing: restricted or draft
- Embed size: start with `1280 x 1000`; enable scrollbars and the fullscreen button
- Enable mobile-friendly; leave automatic start and SharedArrayBuffer support off
- Description: include the GitHub repository link and the short media/license note from `MEDIA_RIGHTS.md`

Suggested page text:

```text
Titans of War is a local-first historical strategy simulator from Titans Forge.

This browser build runs without an API key, account, or AI model. Optional local-AI features are available in the GitHub version for users who run the project locally.

Source code and license notes:
https://github.com/JCapone83/Titans_of_War
```

## Build A Browser Upload

From the repository root:

```bash
npm ci
npm run validate
npm run build:itch
```

This creates:

```text
titans-of-war-itch.zip
```

Upload that ZIP to the itch.io project as an HTML5/browser build. The ZIP should contain `index.html` at the top level, not inside another folder.

## Manual ZIP Fallback

If `npm run build:itch` fails because `zip` is unavailable:

```bash
npm run build
node scripts/prune-release-assets.mjs
```

Then manually compress the contents of `dist/`. Do not compress the `dist` folder itself. The ZIP root must contain:

```text
index.html
assets/
audio/
fonts/
images/
```

## butler Upload

After the itch.io project exists, install and authenticate `butler`, then run:

```bash
npm run build:itch
butler push dist titans-forge/titans-of-war-civil-war:web
```

If the project slug is different, replace `titans-of-war` with the slug from the itch.io project URL.

## Local AI Note

The browser build should be treated as the scripted public game. The optional Ollama/local-AI portal is best advertised as a GitHub/local-run feature because hosted browser pages may be blocked from reaching a player's local Ollama server depending on browser, CORS, and local security settings.

## Pre-Publish Checks

Before making the itch page public:

```bash
npm run validate
npm run build
```

Then test the uploaded itch page in a clean browser:

- First scenario renders with the Fort Sumter image.
- `WALKTHROUGH` opens.
- One choice can be selected and executed.
- Historical context opens if present.
- Audio fallback does not block gameplay.
- Quick battle opens Third Winchester with its terrain and soldiers visible.
- Selecting open ground pauses for move confirmation; after resuming, units move under fire.
- Dragging pans without issuing an order; mobile controls remain reachable.
- Leaving a practice battle does not change the campaign or its saves.
- GitHub link works.
