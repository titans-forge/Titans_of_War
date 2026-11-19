# First Manassas field art

The local preview opens with `?artPass=manassas-field-v1` on current First Manassas rules. Compare it with the plain URL in Quick Battle using the same opening, zoom and lighting. From **Find on field**, inspect the Stone House junction and Henry House yard at play scale.

## How the field was made

- OpenAI's built-in ImageGen edited the existing overhead pasture plate. The revised material gives the two rises and their shallow depression a mix of fallow grass, pale stubble and exposed clay. The original 1613×975 plate, full prompt and generated edit are preserved in the authoring output.
- Forge Studio registered the edit with a protected mask over the two house sites. Its workbench receipt and an independent decode check verified all 16,366 protected pixels. The in-game lossless WebP matches the composite pixels and is 2,210,022 bytes. The original PNG is 3,111,512 bytes.
- The game draws the road surface and yards at fixed field coordinates so the houses meet the painted ground. The crossing uses the relationship between Stone House, the Warrenton Turnpike and Sudley Road. Henry House's worn lane and fallow ground are illustrative, and exact road placements follow the compressed board. The renderer reads the same structure footprints and terrain rules. [NPS Stone House](https://www.nps.gov/mana/learn/historyculture/the-stone-house.htm) · [NPS Henry House](https://www.nps.gov/places/000/henry-house.htm) · [NPS historic farm lane](https://www.nps.gov/places/information-panel-historic-road-trace.htm)
- Existing period colors are attached to a surviving infantry ground slot. The Gettysburg pilot's battery setup and reload animation now works on Manassas, using the recorded battle clock with the early-war board's existing crew art. The UI distinguishes a movement order, setting up the guns and reloading. Marking a place in short landscape keeps the readout without shrinking the canvas.

## Verified in play

- At 1440×860, I compared the same opening with both ground plates and inspected both landmarks. The move preview still rejected a destination inside Henry House.
- The prepared advance scored 97/100 with its objective achieved. Save and leave at field minute 51 reopened with Elzey selected, the same field minute and a paused battle. The resumed battle reached the victory report through ordinary controls.
- Chromium touch emulation located the Stone House, rotated from 390×844 to 844×390 during play and kept a visible 664×201 map with the landmark marked. The separate defense run correctly reported a failed objective. The physical iPhone remains unverified.
- The separate Gettysburg art preview loaded successfully. The production build and 214 focused checks passed. The browser checks recorded zero page exceptions and zero failed requests.

## Continuing the art pass

Add `&infantryMotion=v1` to the preview URL to try the infantry movement pass. During a wheel or a change of formation, walking figures use the direction their ground slots actually travel. The two ends of a wheeling line can step in different directions. Select Jackson’s Brigade in the prepared defense, open **Front and target**, order **Face S**, then run at 1× and pause mid-turn. The combat front and fire arc still show where the formation can fight.

The v1 movement preview reuses the accepted sprites. It stores the walking directions for a paused Manassas field under a scenario-specific presentation record. Saved fields without that record open with their original poses.

## July 1861 marching and turning artwork

Open `?artPass=manassas-field-v1&infantryMotion=v2` for the new Union and Confederate infantry art. Each side has four painted stride poses and a pivot for five bearings. The three westward bearings mirror the eastward artwork around the ground anchor. During a stationary wheel, the passing step can use the pivot while the other steps still follow each soldier’s direction of travel. The animation follows simulation distance and time so the phase stays put when paused or reopened.

The navy Union coat and gray Virginia volunteer jacket are representative outfits. The battle included many different militia and volunteer uniforms. [National Park Service Manassas living history standards](https://www.nps.gov/mana/getinvolved/manassas-living-history-standards.htm) · [Library of Congress Union sack coat and forage cap](https://www.loc.gov/item/2010648771/)

The preview uses the new art for ordinary infantry walking and turning. Existing standing, firing, reloading, retreat and casualty poses cover their respective actions. It uses the original battlefield rules and save format.

For a close wheel, select Jackson’s Brigade in the prepared defense, use **Focus**, then order **Face S** from **Front and target**. For a march, move a formation across open ground and compare **Fit battlefield** with a closer view. The opposing formations move under their usual AI.
