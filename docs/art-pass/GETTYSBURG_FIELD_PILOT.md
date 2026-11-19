# Gettysburg field art pilot

Open the local game with `?artPass=gettysburg-field-v1` and choose July 3 Gettysburg in Quick Battle. The pilot uses the current field rules. A plain URL opens the comparison build. Older art tags still select their own previews.

## Art and provenance

- The terrain plate starts with the existing `gettysburg-terrain-v3.png`. OpenAI ImageGen produced a material and light edit from that plate. Forge Studio's masked image workbench merged it at the original 1724×912 size. The lossless WebP decodes to the exact verified composite. The mask protects the road center and ground under both farmhouse footprints. The authoring output retains the prompt, raw image, mask and Forge Studio receipt.
- Existing fence and stonework art is drawn from the current scenario geometry. Grounded rail shadows, work on the lane surface and the short return in the wall give the field clearer visual landmarks. Both the road and the wall use the game's representative geometry. [National Park Service account of the fenced ground](https://www.nps.gov/gett/learn/historyculture/cushing-at-gettysburg.htm) · [The Angle](https://www.nps.gov/places/the-angle.htm)
- Four WebP sheets contain the 78 reviewed logical atlases from the v32 preview. Manifests retain the source digests, original action addresses and normalized foot and muzzle anchors. Trimmed cells keep their full logical dimensions. `scripts/pack-gettysburg-field-art.py` regenerates the pack using the existing source files and Pillow. The terrain and atlases load only when the pilot is selected on July 3.
- The pilot uses the reviewed contact, locomotion and continuity readers. Standards follow the same ground position as their assigned living figure during contact and retreat. Cloth deforms around a fixed hoist. Formation status appears on inspection, and the selected-formation bar names the current maneuver. Field audio follows recorded events, including separate signals for organized and disordered exits.

## Review

Compare the same Quick Battle opening in both builds. Check overview, close-up, movement, fire, contact and withdrawal, then rotate a phone-size viewport during play. Review audio and motion with the game running as well as the Forge Studio still. Pressing pause, resuming a saved encounter and changing presentation affect separate parts of the game. Keep those checks distinct when reviewing new assets.

Run `node --test scripts/test-gettysburg-field-art.mjs scripts/test-battle-audio.mjs` for the pack and cue checks.

## Local playtest results

- The matching desktop withdrawal runs each scored 100/100 and earned all three optional goals. The pilot brought all five formations and their guns out in order. A separate assault recorded volleys and close contact before a field defeat.
- In Chromium phone emulation, the battle paused on rotation, kept the selected formation and refit the canvas to the live layout. The 390×844 portrait run continued through the 844×390 landscape layout and completed the withdrawal. The landscape map area measured 664×132 pixels with the command controls visible.
- A disposable campaign archive opened directly at Gettysburg. Save and leave, a full page reload, and Resume saved battle restored Pettigrew’s Division and field minute 3 while paused.
- The production build and 159 focused checks passed. The aggregate `npm test` stopped at the existing v44 migration checksum check for `package.json`. The physical iPhone and native Safari still need verification.

## Field command follow-up

- In short landscape windows, the mission readout shares the map toolbar and the clock sits beside the orders. The brief opens with keyboard focus on its heading. Escape closes the brief and returns focus to Formation details. During play, Resume sits at the side of the map, and the result gets its own full-width action.
- On the Gettysburg pilot, the gun and ammunition carriage transition between deployed and travel positions using the battle’s setup timers. The selected battery reports limbering, deployment and reload. The existing detailed crew poses follow the recorded volley and reload once per cycle. Reduced motion retains stable deployed and travel silhouettes during setup.
- At 844×390 in Chromium touch emulation, map height increased from 132 to 201 pixels at Gettysburg and from 131 to 201 at Winchester. Gettysburg measured 186 pixels of map height at 667×375. A live Gettysburg run rotated from portrait and finished with 100/100 and all three optional goals. Winchester earned cover and completed the withdrawal at 98/100.
- Alexander’s battery limbered, moved and saved during deployment. A full reload resumed paused at field minute 12 with the same unit and setup phase, and the battery subsequently deployed, fired and displayed its reload. The production build and 226 focused tests passed. Native Safari was blocked by the locked Mac. Physical iPhone input is still unverified.
