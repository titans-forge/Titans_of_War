# Titans of War Local Audio Archive

The public release currently ships these source-verified recordings:

- ambient_campfire.mp3
- lorena_instrumental.mp3
- shenandoah.mp3
- battle_cry_brass.mp3
- fife_drum_march.mp3
- battle_hymn_triumphant.mp3
- yellow_rose_march.mp3
- dixie_instrumental.mp3
- tenting_tonight.mp3
- elegy_final.mp3
- just_before_battle_mother.mp3

Their source pages, rights status, credits, download URLs, and audited SHA-256
hashes are recorded in `src/game/audioCatalog.js` and
`src/game/historicalAssetManifest.js`.

Optional local recordings may use these reserved filenames:

- lorena_instrumental.mp3
- lorena_melancholic.mp3
- bonnie_blue_flag_instrumental.mp3
- aura_lea.mp3
- home_sweet_home.mp3
- distant_artillery_ambience.mp3

Guidelines:

- Use public-domain, CC0, or otherwise compatible free-culture recordings.
- Prefer instrumental-only tracks so the cabinet voice and scenario text stay readable.
- MP3 is the format currently indexed by the audio manager.
- Add or update the corresponding metadata in `src/game/audioCatalog.js`.
- Keep `licenseStatus` set to `recording-needed` until the recording, not just the composition, has been audited and hashed.
- Missing files are fine; the game falls back to the built-in procedural score automatically.
- Reload the app after adding files so the archive probe can index the new tracks.

Suggested repertoire:

- Lorena
- Battle Cry of Freedom
- When Johnny Comes Marching Home
- Dixie
- Battle Hymn of the Republic
- The Bonnie Blue Flag
- Tenting Tonight on the Old Camp Ground
- Aura Lea
- Home, Sweet Home
- Quiet campfire ambience
- Somber Appomattox elegy
- Distant artillery ambience
