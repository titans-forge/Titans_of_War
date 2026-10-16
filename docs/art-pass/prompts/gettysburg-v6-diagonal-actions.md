# Gettysburg v6 diagonal action sources

October 1, 2026. Built-in imagegen. Model identifier not reported. Native output is preserved; no pixel cleanup, cropping or resizing is permitted in this source pass. Structural guides are direct Blender renders, not accepted game art.

## SE ready / fire / load / ram candidate

References, in order:
1. `docs/art-pass/candidates/gettysburg-v6/union-se-actions-guide.png` — structure/camera/action layout only.
2. `docs/art-pass/candidates/gettysburg-v5/union-se-march-padded-candidate.png` — Union A identity, materials, SE camera and weapon scale.
3. `docs/art-pass/candidates/gettysburg-v5/union-e-actions-candidate.png` — weapon/socket/bore/ramrod separation only; do not copy E bearing.

```text
Use case: identity-preserve / historical-scene.
Asset type: realistic transparent infantry action sprite sheet for a Civil War educational game.
Create ONE native square RGBA PNG, transparent background, EXACTLY FOUR full-body figures of the SAME Union infantryman in a2x2 equal-cell grid. No text/grid/shadows/discharge/background. Top-left ready, top-right firing, bottom-left loading at muzzle, bottom-right raised ramrod insertion.
Image1 is the structural action/camera guide ONLY: elevated35-degree fixed orthographic camera, SE facing diagonally toward viewer and screen LOWER RIGHT; copy its3D bearing and grounded two-foot stances. Its crude head/arms are not realistic anatomy: make believable human shoulder/cheek/grips. Image2 is the EXACT soldier identity and material reference: short brown hair and short brown beard/sideburns, dark blue kepi and worn navy wool sack coat, pale skyblue trousers, leather brogans/belts/straps/cartridge box, disk canteen, rolled gray blanket and pack behind screen-left shoulder. Preserve that same man's age, proportions, uniform, kit, two-hand musket dimensions and neutral daylight across ALL4 cells. Image3 explains offset socket bayonet/bore/ramrod geometry only; do NOT copy its E side-on bearing.
Top-left: SE STATIONARY ready carry corresponding to Image2, both feet planted, musket diagonally up in attached fore-end and stock grips, natural relaxed but alert weight.
Top-right: aim and fire toward SCREEN LOWER RIGHT, with the whole long walnut-stock percussion musket projecting down-right from shoulder toward muzzle under the elevated camera. Butt seated against upper shoulder, cheek against stock, trigger hand at grip/lock and support hand UNDER fore-end. Keep two hands attached. No floating weapon, blade or hand. Same body/weapon scale as ready. Distinct barrel mouth followed by an OFFSET socket spike bayonet; no muzzle flash or smoke baked in. Musket must NOT point flat right as in the E source.
Bottom-left: same SE man standing with muzzleloading musket upright at his side, butt near ground, lower hand gripping walnut fore-end, working hand at barrel mouth. Clearly expose separate bore axis and offset fixed bayonet blade.
Bottom-right: same upright musket/location as loading, lower hand unchanged on wood, working hand raised holding a long slender RAMROD entering the barrel along the BORE axis. The fixed socket bayonet remains visibly offset beside the barrel; do not use the blade as ramrod or fuse them. Believable connected elbows/fingers.
One COMMON human/weapon scale and camera for all4; approximately72–75percent cell-height standing man, boots near90percent cell-height, same row-shared ground plane. Match face, head/torso width, kit proportions and rifle length across poses. Preserve natural head lowering in fire; no enlarged reload body. Entire body, muzzle, blade, raised hand and kit must fit inside their OWN cell with at least24nativepixel solid margins at every side. No adjacent-cell overlap. Natural human anatomy and finely realistic wool/leather/wood/steel; not cartoon/anime/toy/plastic/miniature. Clean neutral native alpha edges, no colored matte or speckles. Exactly4figures,2x2, transparentRGBA, nothing else.
```

Output, measurements, source review and acceptance status will be recorded after generation.

Original tool output: `/Users/titansforge/.codex/generated_images/01a07dec-6d36-7502-86fe-7095742e4f2e/exec-dc0191e9-c2d9-4e9d-88e9-1201f85adcf3.png`.
Project source: `docs/art-pass/candidates/gettysburg-v6/union-se-actions-candidate.png`. Review pending; no source approval inferred from generation.

Root measurement rejected this source: alpha64 solid padding reaches cell boundaries at the bottom of both top cells and the top of both lower cells. The padding gate is unchanged.

## Uniform size and cell placement correction

```text
Use case: precise-object-edit. Edit this transparent1254x1254 Union SE ready/fire/load/ram sprite sheet. Change ONLY the complete figures' uniform size and cell placement. Preserve all4 identities, poses, human anatomy, face, shoulder/cheek contact, grips, rifle/bayonet/rod geometry, kit, materials, lighting and alpha cutouts. Do not redraw or invent equipment.
The source has2x2 equal627x627 cells. Top-left ready and top-right firing extend across the middle-row boundary, contaminating the top of the lower cells. Correct that defect. Treat EACH complete figure including ALL of its weapon/kit as one indivisible object. Uniformly reduce ALL FOUR complete figures by the SAME approximately12percent factor (to88percent original size), preserving aspect ratio and exact pose. No separate arm/weapon/body reduction, no per-figure different scale.
Place each complete resized figure wholly inside its original627square cell. Both rows' feet should lie near cell-localY570–585, on one shared ground reference per row. Keep their natural two-boot projection/stance differences. Keep each figure's approximate torso/pelvis horizontal placement, adjusting only enough for safe margins. Full bayonet, muzzle, raised hand, ramrod, boots and kit must stay in its OWN cell with at least24nativepixels of EMPTY SOLID padding on all4 sides. Absolutely no upper figure pixels cross into lower cells and no clipping/cropping at cell boundaries.
Exactly the same4 SE-facing men/actions, elevated35degree camera, top-left ready/top-right shouldered firing down-right/bottom-left load/bottom-right raised ramrod. Same natural human/wool/leather/wood/steel realism and clean native transparentRGBA background. No text, grid, floor, shadows, matte, flash, smoke, added object or colored halo. Keep full1254x1254 image and2x2 equal cells. This is one COMMON scale/spacing correction only.
```

Uniform size correction original output: `/Users/titansforge/.codex/generated_images/01a07dec-6d36-7502-86fe-7095742e4f2e/exec-7ccdc4c8-cb6b-4774-a5c1-fef5b243a0c2.png`.
Project source: `docs/art-pass/candidates/gettysburg-v6/union-se-actions-spaced-candidate.png`. Firing-bearing review pending.

## Firing bearing correction

```text
Use case: precise-object-edit. Image1 is EDIT TARGET, a1254square transparent2x2 SE infantry action sheet. Image2 is structural camera/bearing reference ONLY.
Correct ONLY the TOP-RIGHT firing soldier's AIM direction. Its rifle currently projects only about15–20degrees down-right, too shallow for this SE bearing. Match TOP-RIGHT of Image2: stock-to-barrel-mouth screen direction approximately30degrees BELOW horizontal to the RIGHT (acceptable25–35degrees; positive deltaY about0.55–0.65times positive deltaX). The complete rifle from butt through muzzle and offset bayonet follows that3D bearing, aimed toward screen lower-right under the fixed35degree elevated camera.
Keep butt seated against SAME upper shoulder; cheek against stock and eye aligned along sights. Trigger hand stays at grip/lock; move support hand/forearm WITH fore-end so both grips remain attached. Adjust only firing arms/head slightly as anatomically necessary for this corrected aim. Keep the same man's body size, torso/pelvis position, planted feet, uniform/kit, face, weapon physical length, wood/steel details and lighting. Do not rotate the whole figure or shorten/stretch rifle. Muzzle must remain distinct from offset socket bayonet blade tip. No flash/smoke baked in. Full musket/bayonet stays inside top-right627square with >=24px solid padding.
Preserve TOP-LEFT ready, BOTTOM-LEFT loading and BOTTOM-RIGHT raised-ramrod figures exactly: positions, sizes, poses, grips, equipment, separate barrel/bore/bayonet/rod, row ground levels and native alpha unchanged. Preserve overall1254x1254 transparentRGBA and equal2x2 grid. Four realistic figures only; no background/floor/shadows/text/grid/matte/newobject. Do not enlarge any body or contaminate adjacent cells. This is one firing-bearing correction only.
```

Firing-bearing correction original output: `/Users/titansforge/.codex/generated_images/01a07dec-6d36-7502-86fe-7095742e4f2e/exec-911a39b3-a6b2-4cc5-8a4a-d527c74c7d82.png`.
Project source: `docs/art-pass/candidates/gettysburg-v6/union-se-actions-bearing-candidate.png`. All four cells require fresh review.

The bearing edit changed other cell details and moved the top-row soles: bottom solid padding became13/12px, below the unchanged16px gate. This attempt remains rejected even if its firing projection passes.

## Top-row padding repair

```text
Use case: precise-object-edit. Edit this native1254x1254 transparent2x2 SE Union ready/fire/load/ram sheet.
Change ONLY TOP-ROW placement: translate the ENTIRE TOP-LEFT ready figure AND ENTIRE TOP-RIGHT firing figure UPWARD by12nativepixels inside their existing627x627cells. Preserve their exact sizes, poses, body/weapon proportions, face/uniform/kit, grips, lighting and silhouettes. Move complete man+rifle+bayonet+allkit as one object. No part is left behind. Currently bottom alpha64 padding is13px and12px respectively; after translation it should be25px and24px. Current top margins48px/161px have room. Keep the corrected firing barrel axis about30degrees down-right, cheek/shoulder/grips unchanged.
Keep BOTTOM-LEFT loading and BOTTOM-RIGHT raised-ramrod figures EXACTLY as shown: same location/size/poses, supporting and working hands, distinct bore/barrel/socket bayonet/ramrod. No scaling, resizing, redrawing, recoloring, new equipment or pose change in ANY cell. Entire weapon, blade, hand, boots and kit remain in their owncell. Keep1254squareRGBA, exact2equalcolumns2equalrows, fully transparent background with no floor/shadow/text/grid/matte/discharge. Exactly4figures. This is ONLY a12pixel upward translation of each complete top-row figure to fix padding.
```

Top-row padding repair original output: `/Users/titansforge/.codex/generated_images/01a07dec-6d36-7502-86fe-7095742e4f2e/exec-6b11e5f8-74f7-461d-a205-feab49475f65.png`.
Project source: `docs/art-pass/candidates/gettysburg-v6/union-se-actions-padded-candidate.png`. Final separate model-assisted review accepts all4cells for a limited opt-in preview: alpha64 padding minimum18px, fire bearing approximately31degrees down-right with distinct tube mouth. SHA256 `bd4650f0d15bf5abf612ebfd01edecf9560c7a459b96e2643ad76ca5d023b61e`, native1254x1254RGBA,768245bytes. One495px stationary reference and manual roots/muzzle are recorded in the v6 source annotations; public copy is identical. Exact12px translation, anatomy/perioddrill, fullfamily and production approval are not certified. See [source review](../reviews/gettysburg-v6-independent-source-review.md).
