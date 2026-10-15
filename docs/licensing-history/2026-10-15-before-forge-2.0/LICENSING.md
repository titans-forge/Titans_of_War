# Licensing checkpoint: Titans of War: Civil War

Checkpoint: **FG-LIC-20260930-13-GH1**. Recorded September 30, 2026.

## Current policy

The current project licensing policy is [Forge Game Hosting License 1.0](LICENSE).
This is a source-available licence, not an OSI-approved open-source licence.
For newly supplied, Licensor-controlled material covered by those terms, a company
with gross annual revenue **over US$1,000,000**, including its controlled
subsidiaries, needs a separate written agreement before publicly hosting its own
playable copy. Ordinary play, private internal/classroom use, official links and
authorized platform-served embeds are excluded as defined in the full licence.
[Contact Titans Forge](https://titans-forge.itch.io/).

Copyright (c) 2026 Titans Forge LLC for the newly authored checkpoint and
release-notice staging support. Attribution for existing components is retained.

## Earlier MIT grants remain available

The last pre-checkpoint default-branch commit is
[`fb0a122c884db410b86f0bfb7e1ea1b209ddc4de`](https://github.com/JCapone83/Titans_of_War/tree/fb0a122c884db410b86f0bfb7e1ea1b209ddc4de),
with tree `a36657695468ef6702dcf34db3fda3953f0f7751`.
Its original MIT notice is retained **byte-for-byte** as
[LICENSE-LEGACY-MIT.txt](LICENSE-LEGACY-MIT.txt).

- Previous MIT notice Git blob: `348a58a4137c12b4621bdbfb45207cab05688525`.
- Previous MIT notice SHA-256: `da6f0430ff6467dc0c9cab9f0b086032f0e70f6efa2f690de7a63e9be482bcf6`.
- Approved Forge licence SHA-256: `28638be413f7815704fe68aed52a4ea4cb7bd4d28b35f2dca9b78d438a4a90bf`.

All source already published at that commit keeps its MIT permissions.
Identical previously MIT-licensed material remains usable and hostable under MIT;
this checkpoint does not retroactively impose a hosting fee on it.
This is a licensing/documentation/release-support change, **not a gameplay upgrade**.
The package version remains `0.3.1`; no old tag, release or history is
rewritten. Newly authored checkpoint documents and staging support are expressly
offered under the Forge terms. Future covered game changes need their own
identifiable release boundary. Modifications to previously MIT files do not erase
the original MIT grant over the earlier material.

## Media, dependencies and distribution

Existing media, third-party software, fonts and separately licensed assets retain
their original terms and required attribution. Existing rights records are not
replaced by the root licence. Earlier blanket MIT grants over project-authored
interface assets or documentation also remain available. No new rights over
third-party media or trademarks are asserted.

The machine-readable record is [LICENSING_CHECKPOINT.json](LICENSING_CHECKPOINT.json).
It identifies this GitHub policy boundary only; equivalence with the currently
hosted itch.io build is not certified.

`npm run build` stages the full current licence, preserved MIT notice and
checkpoint in `dist/` after Vite succeeds, alongside any media/NOTICE records.
Markdown rights documents are packaged as text so production-only ZIP checks
continue to work. Direct `vite build` bypasses npm's lifecycle hook: before
redistribution, run `node scripts/stage-release-licenses.mjs` and then
`node scripts/stage-release-licenses.mjs --check`.
The staging script changes no gameplay file and performs no network requests.
