# Civil War itch.io Release Candidate - September 4, 2026

Status: prepared locally; not uploaded or published.

## Included

- Third Winchester tactical encounter, terrain, reinforcements, and covered withdrawal.
- Improved formation graphics and slower routing presentation.
- Direct movement persists under fire, without firing while marching.
- Ground-tap destination preview pauses for confirmation; dragging pans.
- Friendly selection is no longer blocked by overlapping enemy hit targets.

## Verification

- `npm run validate`: passed, including 25 direct-movement regressions, 37 Winchester tests, and 40 unchanged legacy battle/choice replay hashes.
- Content validation: 44 scenarios, zero errors.
- Asset validation: 18 manifest entries; 384 infantry frames validated.
- `npm run build:itch`: passed; removed 15 unused campaign pictures (5.9 MB).
- `unzip -tq titans-of-war-itch.zip`: passed.
- Production preview: Third Winchester terrain and formations render; no console warnings or errors observed in the smoke check.
- Desktop/mobile movement and confirmation were tested in the preceding development pass.
- Existing Vite large-chunk warning remains a nonblocking performance follow-up.

## Artifact

`titans-of-war-itch.zip`, approximately 97 MiB; `index.html` at ZIP root.

SHA-256: `e034e49e39072106aa0d9df42523a791702d4f05ea8bbf2b3cfad831e8039989`

## Remaining Publication Steps

Replace the browser upload on `https://titans-forge.itch.io/titans-of-war-civil-war` with this ZIP. Keep fullscreen, scrollbars, and mobile-friendly enabled. Verify the actual hosted game after upload, including a move under fire and leaving a practice battle without altering campaign progress.

No GitHub push, repository transfer, or itch.io publication occurred during preparation.
