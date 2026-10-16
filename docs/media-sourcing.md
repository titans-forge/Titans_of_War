# Titans of War Media Sourcing Guide

Titans of War should use period-appropriate media without creating copyright or provenance ambiguity. Every shipped audio or image asset needs a catalog entry before it is referenced by the game.

## Audio Rules

The composition and the recording are separate rights questions. A Civil War-era tune may be public domain while a modern recording of that tune is still copyrighted.

Acceptable recordings:

- Public-domain recordings from a reputable archive.
- CC0 recordings.
- Free-culture recordings with a license compatible with open-source game distribution.
- Newly created recordings commissioned for Titans of War with an explicit release.

Good source pools:

- IMSLP public-domain or free-license recordings: https://imslp.org/wiki/IMSLP:Free_content_licenses
- Open Music Archive: https://www.openmusicarchive.org/
- Wikimedia Commons free music resources: https://commons.wikimedia.org/wiki/Commons:Free_media_resources/Music
- Musopen / Commons mirrors where recording licenses are explicit.
- Internet Archive only when the item page clearly identifies public-domain or compatible free-license status.

Recommended track set:

- Dixie
- Battle Cry of Freedom
- Lorena
- The Bonnie Blue Flag
- When Johnny Comes Marching Home
- Battle Hymn of the Republic
- Aura Lea
- Home, Sweet Home
- Somber Appomattox or campaign-end classical elegy
- Campfire ambience
- Distant artillery ambience

The current playlist is defined by `src/game/audioCatalog.js`. Do not restore
Tenting Tonight on the Old Camp Ground or Just Before the Battle, Mother: both
were removed at the user's request. Retain the accepted instrumental Bonnie
Blue Flag arrangement, including its repeated stanzas and final ending, while
reviewing any future replacement recording.

Add metadata in `src/game/audioCatalog.js` before or alongside each file:

- `sourceUrl`
- `sourceInstitution`
- `licenseStatus`
- `credit`
- `bestFor`

Keep `licenseStatus: "recording-needed"` until the actual recording has been audited.

## Image Rules

Images should educate first and decorate second. Prefer primary historical archives for scenario theater and tactical underlays.

Good source pools:

- Library of Congress Civil War photograph collections: https://guides.loc.gov/military-photographs/selected-collections/civil-war
- Library of Congress Prints & Photographs catalog: https://www.loc.gov/pictures/
- National Archives Civil War photographs: https://www.archives.gov/research/military/civil-war/photos/
- National Archives Catalog Civil War map records, especially Army Corps/Record Group 77 map holdings: https://catalog.archives.gov/
- National Archives Civil War maps overview and guide: https://www.archives.gov/publications/prologue/2003/summer/civil-war-maps.html
- National Park Service maps/photos only when reuse terms are clear.
- Wikimedia Commons only when the file page points back to a primary archive or has strong rights metadata.

Each scenario should eventually have:

- A theater image for emotional/historical identity.
- A tactical underlay or map for battlefield reasoning.
- Optional portrait/detail media for commanders, railroads, trenches, artillery, or cabinet pressure.
- A stylized card image for the compact scenario badge.

Required image metadata lives in `src/game/mediaCatalog.js`:

- `sourceInstitution`
- `sourceUrl`
- `license`
- `provenanceStatus`
- `historicalMedium`
- `assetRoles`
- `caption`
- `credit`
- `cropFocus`
- `tacticalView`

Use `provenanceStatus: "needs-review"` until the source URL and rights have been checked. The UI will show these as local archive images instead of claiming they are verified historical records.

## Emplacement QA

For each new or replaced image:

1. Open the scenario in Historical mode and check crop, caption, and card thumbnail overlap.
2. Open Tactical mode and verify troop blocks, labels, rivers, hotspots, and maneuver arrows sit on meaningful parts of the image.
3. Tune `cropFocus`, `cropMode`, and `tacticalView.zoom` in `mediaCatalog.js`.
4. Tune rivers, labels, troops, maneuvers, and inspector pins in `mapAnnotations.js`.
5. Run `npm test` and `npm run build`.

Do not mark an image `verified` until its source and rights are recorded.
