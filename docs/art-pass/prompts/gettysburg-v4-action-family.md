# Gettysburg v4 constrained action-family prompts

Date: October 1, 2026

Built-in imagegen, native transparent PNG output. Tool model identifier was not reported. Two appearance-transfer calls; no raster editing, trimming, repacking, resizing, or alpha cleanup. Sources and public PNGs are byte-identical. Native guides are direct Blender renders, structural references only.

## March

References, in order:
- docs/art-pass/candidates/gettysburg-v4/union-e-march-guide.png
- docs/art-pass/candidates/gettysburg-v3/union-e-rig-guided-candidate.png

Original output: /Users/titansforge/.codex/generated_images/01a07dec-6d36-7502-86fe-7095742e4f2e/exec-3a79c0f7-a7a7-4283-b9c8-d2fe954e5aba.png
Native size:1254x1254 RGBA. SHA256:43b8f4394b6071958b693d83c14eb7f324e277706bd5513d23b536467e9f6a42.

```text
Use case: historical game sprite appearance transfer. Create ONE photorealistic transparent Civil War infantry animation sheet, EXACTLY 2 equal columns by 2 equal rows, four figures in reading order.
FIRST reference is the structural truth: copy its elevated 35-degree orthographic camera, four distinct walking poses, which leg passes in front, fixed torso-ground origin, and the identical rifle and TWO HAND attachments across all four frames. SECOND reference supplies only realistic face, Union navy wool sack coat and forage cap, sky-blue trousers, worn leather brogans, rolled blanket, canteen, haversack, straps and pouches. Same clean-shaven man and exact outfit in every cell. Upgrade the low-poly first reference to this realistic appearance; do NOT copy the missing bayonet or changing hand grips of the second.
TOP LEFT: far leg forward, near leg behind. TOP RIGHT: bent passing leg, one planted supporting foot. BOTTOM LEFT: near leg forward, far leg behind, anatomically opposite of top left. BOTTOM RIGHT: the opposite passing leg. Preserve the FIRST reference lower body and planted sole positions as closely as possible.
The rifle is a representative 1861 Springfield-style muzzleloading percussion rifled musket: long walnut stock, three metal barrel bands, slender dark steel barrel, clearly distinct long narrow socket spike bayonet extending beyond the muzzle. Same barrel length, stock, bayonet, strap sides and carry angle in all four cells. Both hands firmly grip the SAME points of the rifle in all walking frames; no hovering hands, no duplicate fingers or weapons. Rifle may move only with the consistent torso. Bayonet must remain sharp, straight, visible, and wholly inside its cell.
Important layout: native transparent square sheet, 2 by 2 equal cells. Match the FIRST reference placement inside each cell: pelvis/torso ground-root X at 37.5% cell width, invisible ground Y at 86% cell height, identical pixel scale/camera across cells. Realistic cap-to-ground approximately 53% cell height as in structural reference; do NOT enlarge men to fill each cell. Generous blank margin around full bayonet, boots and backpack; zero overlaps. Head may have the small natural bob of the structural guide; do not change identity or proportions.
Diffuse neutral daylight, real wool/leather/wood/metal detail, restrained realistic colors, credible human anatomy, no anime, toy, glossy miniature, or painted cartoon. No backdrop, no floor, no baked shadow, no smoke, no text, labels, dividers or grid. Actual alpha transparency. Preserve full bodies and entire weapons.
```

## Ready, fire and two loading states

References, in order:
- docs/art-pass/candidates/gettysburg-v4/union-e-actions-guide.png
- docs/art-pass/candidates/gettysburg-v4/union-e-march-candidate.png

Original output: /Users/titansforge/.codex/generated_images/01a07dec-6d36-7502-86fe-7095742e4f2e/exec-1ba9d767-a850-4ee8-9faa-c696a7eac056.png
Native size:1254x1254 RGBA. SHA256:3e0ef9a0a0de5be7a5f10e16a703a611441088d5c39e081a0e11d7d436ad5c4a.

```text
Use case: photorealistic historical game sprite appearance transfer. Create ONE native RGBA transparent square 2-column by 2-row sheet, EXACTLY FOUR full-body poses of ONE SAME Union Civil War soldier facing screen right (E).
FIRST reference is the structural action sheet: preserve elevated 35-degree orthographic camera, stance, anatomy, grounded feet, and reading-order actions. SECOND reference is the accepted new marching study and is the EXACT SAME man's realistic identity, forage cap, navy sack coat, sky-blue trousers, rolled blanket, canteen, haversack, leather boots/straps and long Springfield-type rifled musket. Match its body proportions, cloth/materials, equipment sides and pixel scale. Do not copy low-poly anatomy or uncalibrated upright head in the first guide.
TOP LEFT READY: stationary, natural upright two-hand rifle carry, same carry grip and angle as marching image, both boots grounded.
TOP RIGHT FIRE/AIM: butt firmly against right shoulder, cheek meets stock and eye follows sights, rifle level screen right, left hand supports barrel/fore-end and right hand holds trigger grip. Clearly plausible shoulder-to-stock and hand contact. NO muzzle flash or smoke: the game will draw those effects separately. Entire barrel and the full long narrow socket bayonet visible, generous transparent right margin, never cropped.
BOTTOM LEFT LOAD: grounded stationary muzzleloading pose, rifle vertical with butt beside boot, supporting hand on stock/barrel and other hand near muzzle preparing the charge. Three metal barrel bands, same stock/barrel length and distinct fixed socket bayonet.
BOTTOM RIGHT RAM: same body/camera and grounded vertical rifle as bottom left, hand raised holding the slender RAMROD aligned over the bore, the rod enters the muzzle. Keep the bayonet separately visible beside the bore; do not substitute a second rifle or turn the bayonet into the ramrod. These are two simplified visual states of percussion muzzleloading, not a whole drill.
Camera and body scale MUST match across ready/fire/load/ram and the second reference. Constant torso/pelvis placement: X approximately37.5% of each cell, invisible ground baselineY86% of cell. Fixed pixel cap-to-ground height for stationary men, natural stance only. Do not enlarge individual men to fill the available width; the firing barrel needs empty space. Fit all bodies and whole weapons inside each equal cell with ample margins. Same man, same cap, same worn coat/trousers/boots and backpack.
Realistic natural hands, credible anatomy, finely resolved wool, leather, wood, iron. Diffuse neutral daylight. Actual transparent alpha, no floor or shadow, no backgrounds, no captions, text, labels, grid lines, logos, smoke or flash. No toy, cartoon, anime, glossy figure or painted miniature. Exactly four figures, 2x2, nothing else.
```

## Review boundary

Narrow Union A, E-bearing ready/march/fire/two-state reload preview only. Production and full-family approval remain false. See the independent source review and measurements. Native source placement/scale did not exactly follow the guides; registration is explicit metadata, not pixel correction. Muzzleloading imagery is simplified, with partly coalesced rod/bayonet detail.

Representative weapon shape was checked against [NPS Civil War weapons in the Shenandoah Valley](https://www.nps.gov/articles/000/civil-war-weapons-in-the-shenandoah-valley.htm). This supports period muzzleloading/stock/band/socket-bayonet context; it does not certify the generated exact weapon model, full drill or Gettysburg regiment-specific equipment.
