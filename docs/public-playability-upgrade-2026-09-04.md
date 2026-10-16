# Public Playability Upgrade

Date: 2026-09-04
Status: local review build, not published

## Delivered

- [x] Briefing and decisions share the desktop view. Smaller screens stack them without horizontal overflow.
- [x] Compact resource strip; detailed controls remain under Campaign desk.
- [x] Long briefings retain a visible opening sentence and expandable full text. Advisor discussion and correspondence are optional disclosures.
- [x] Every completed decision opens an after-action report with the outcome and actual resource deltas, including upkeep and battle effects.
- [x] Expandable resource breakdown separates field command, upkeep, and decisions using exact applied changes after caps. Legacy effects remain explicitly unattributed.
- [x] Optional four-step first-battle guide pauses play, can be dismissed immediately, and can be reopened. It covers selection, movement, holding, and reserves.
- [x] Correspondence submissions and planning bonuses persist in version 4 saves, checkpoints, and demo returns. Reload cannot repeat the reward. Versions 1-3 have explicit migrations.
- [x] Incomplete save states are rejected before defaults can conceal corruption. A successful protected reset re-enables autosave.
- [x] Pending reports survive reload without applying effects twice.
- [x] Campaign journal records decisions and consequences throughout a run.
- [x] Eight recent checkpoints support trying an earlier decision.
- [x] Demo saves use a separate key. Returning also keeps an exact in-memory snapshot, so it does not depend on successful browser storage.
- [x] Invalid saves are protected from automatic overwrite. Reset/import/restore abort if a protective checkpoint cannot be written.
- [x] Reset and checkpoint replacement use in-game confirmations, not native browser prompts.
- [x] Quick Battle exposes all ten existing tactical encounters without changing campaign state.
- [x] Practice results return to a separate report, not the campaign consequence handler.
- [x] Repeated Volley orders preserve reload progress. Reform takes field time rather than granting an immediate repeatable gain.
- [x] Tactical camera fits the entire field; zoom is relative to fit. Pan and movement are separate modes, and destinations are confirmed before orders are issued.
- [x] Keyboard-selectable formation roster, coordinate movement, range toggle, and unit status feedback.
- [x] Leaving a battle warns before discarding field progress.
- [x] Dialog focus trapping, focus return, inert backgrounds, and visible focus indicators. Checkpoint disclosures remain keyboard-accessible.
- [x] Stored scoring fields retain authored data when tactical result bonuses are merged. Legacy records have regression coverage.
- [x] Benchmark termination distinguishes a completed run from hitting the decision cap.
- [x] Media labels use catalog provenance instead of labeling all artwork as period artwork.
- [x] Share-text downloads are named honestly; unfinished runs are no longer described as completed results.
- [x] Existing scenario IDs and routing contracts are preserved.

## Verification

`npm run validate` passes, including:

- Existing smoke and battle-engine tests.
- Ten-battle, forty-choice campaign integration checks.
- Four hundred scorecard merge combinations and legacy-record checks.
- Twenty full headless campaign runs with explicit termination reporting.
- Forty deployment/camera cases and reload/reform exploit regressions.
- Debrief persistence, exact deltas, isolated demo storage, checkpoint retention and quota failures.
- Sixteen independently written handler/focus tests covering malformed saves, failed replacement, cancellation, correspondence persistence, stale asynchronous replies, migration, demo return without storage, and nested debrief corruption.
- Content validation across 44 scenarios and existing contribution-queue validation.
- Asset validation: 18 manifest entries, zero asset warnings. Existing proposal rubric warnings are not new approvals.

Browser checks on the local development build covered desktop and 390x844 mobile layouts, debrief/reload/continue, demo return, journal keyboard access, practice entry, completed practice results, and leave-battle confirmation. The completed practice encounter left campaign resources and decision count unchanged. No sampled JavaScript console errors were reported.

On the sampled 1366x768 decision screen, the commit button is now at y=683 and fully visible in the first viewport. The mobile sample has no horizontal overflow. These are layout checks, not new-player completion metrics.

The earlier native-dialog blocker is resolved. A fresh browser check restored a checkpoint, persisted it through reload, and cancelled reset without changing the campaign. A malformed save was rejected without replacing progress; a valid version 4 fixture imported and survived reload. A submitted letter retained its text and reward lock after reload. The export-download event was not captured by the browser tooling, so a downloaded-file round-trip remains unverified.

The extracted HTML5 ZIP was tested at a nested path inside a sandboxed local iframe. An ordinary campaign reached Army Exhausted after 21 decisions without a lockup. The isolated headline demo reached the McClellan conditional-reunion ending; returning restored the prior campaign. This is not a full new-game alternate-route test or a complete Appomattox journey. Mobile guide and resource-report screenshots were checked at 390x844; iframe width checks also passed at 768x1024 and 1920x1080. A recurring iframe MutationObserver warning was traced to the browser's injected design-annotation script, not the game bundle; a fresh direct-app console check was clean. The final rebuilt package also restored the earlier version 3 campaign successfully. No physical-device performance claim is made.

`npm run build:itch` passes and generates the local HTML5 ZIP. Asset pruning verifies 67 built media references and removes only generated-output copies of unused media. Original source assets remain untouched. Vite still warns about large JavaScript chunks; this is a performance follow-up, not a compilation failure.

## Remaining Before Public Replacement

- [x] Fresh-browser checkpoint restore, reset cancellation, valid/invalid import, and reload after restore using the final in-game confirmation UI.
- [ ] Download a save, import that exact file, and verify it on another browser. Generated-fixture import passed; actual exported-file capture remains unverified.
- [ ] Actual-phone testing, including browser interruption, touch panning, and every command at small viewport heights.
- [x] Exercise ordinary termination and a demo-assisted alternate ending in the packaged iframe build.
- [ ] Complete a full new-game Appomattox and alternate-ending journey with human-selected choices.
- [x] Verify packaged game entry, guide, relative images, decisions, and endings inside an itch-style iframe.
- [ ] Recheck audio opt-in on the actual hosting page after the authorized upload.
- [ ] New-player testing of the shorter decision flow. Do not describe an A-grade experience or retention improvement as measured yet.

## Separate Follow-On Work

The audit's larger production suggestions remain separate from this correctness/usability build:

- Further first-session refinements based on new-player observation; the short battle guide is now implemented.
- A discovered-branch map and curated short campaign routes. The journal/checkpoints are the first replay layer, not a completed branch-map feature.
- Directional infantry animation sets and improved casualty transitions. This batch retains existing art and does not claim to have produced new animation atlases.
- A genuine image-based share card, updated trailer, and release screenshots. Current share export is text.
- Independent source/quotation review; automated content checks are not source authentication.
- Real-device performance profiling and targeted chunk/loading improvements.

## Release Boundary

Preview: http://127.0.0.1:4319/

Local package: `titans-of-war-itch.zip` (about 91 MiB).

SHA-256: `c9f66aed3e6d650b472898564826aab6bb26483c047b45757ddbc8bdc8f966e1`

No commit, push, GitHub transfer, or itch publication was performed. Existing unrelated and preexisting changes were retained.
