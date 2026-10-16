# Gettysburg v3 motion study prompts

Date: October 1, 2026

Three built-in imagegen attempts. Tool model identifier was not reported. Native PNGs preserved, no raster editing.

## Four-phase verbal strip — rejected

Appearance reference: `public/images/units/gettysburg-v2/union-ready.png`

```text
Use case: historical-scene.
Asset: a production-quality, realistic 2D game character animation strip on a genuinely transparent background.
Reference image: use ONLY the lean clean-shaven Union soldier in the FIRST cell of the supplied ready sheet as the identity, clothing, equipment, material and camera reference. Do not reproduce the sheet layout or other soldiers.
Create EXACTLY FOUR full-body versions of that ONE SAME MAN, four evenly spaced columns in ONE horizontal row, all facing screen RIGHT (E), in a coherent four-phase walking cycle. Elevated orthographic camera 35 degrees down, consistent pure right-facing side view with visible cap top. Same navy forage cap, dark navy wool sack coat, sky-blue wool trousers, black brogans, canvas straps, dark leather belt and pouches, blanket roll and haversack. Carry the same rifle vertically at the same shoulder/hand in every phase; preserve equipment sides.
At this side view his ANATOMICAL RIGHT leg is the NEAR leg and his LEFT leg is the FAR leg. Do not substitute four copies of the same stride. The FOUR DIFFERENT poses left to right are:
1 LEFT CONTACT: FAR/LEFT leg extended forward to screen-right, left heel just touching ground; NEAR/RIGHT leg extended backward to screen-left with right heel lifted.
2 LEFT SUPPORT / RIGHT SWING: FAR/LEFT foot planted UNDER the pelvis; NEAR/RIGHT knee bent and lifted in front, right boot airborne moving forward.
3 RIGHT CONTACT: NEAR/RIGHT leg extended forward to screen-right, right heel just touching ground; FAR/LEFT leg extended backward to screen-left with left heel lifted. This is the ANATOMICAL OPPOSITE of pose 1.
4 RIGHT SUPPORT / LEFT SWING: NEAR/RIGHT foot planted UNDER the pelvis; FAR/LEFT knee bent and lifted in front, left boot airborne moving forward.
Keep the torso, head, shoulder, pack, hip/pelvis center, body proportions and camera identical across all four. Head stays at the same height; any gait changes come from the two legs, not a rotated whole body. Pelvis aligned to the CENTER of each equal column, feet resting against one common invisible ground baseline. Full rifle and bayonet remain inside each column.
Layout: landscape transparent sheet, four equal columns; each man fits within his own column with ample empty transparent margin above bayonet, beneath soles, and beside all limbs. No overlapping sprites, no backgrounds, no floor, no shadows, no gradients, no grid lines, no labels or text. Natural historical realism with finely resolved wool, leather, hands, wood and iron, no toy proportions, no cartoon or anime.
Critical correctness check before finishing: compare poses 1 and 3; the leading leg must visibly change from FAR LEFT to NEAR RIGHT, while the rifle and pack remain on the same anatomical side. Poses 2 and 4 show genuinely different bent swing legs.
```

## Isolated opposite-foot correction — rejected

Reference: the rejected four-phase strip.

```text
Edit / identity-preserve historical game sprite.
Reference: the supplied four-sprite Union strip, first man ONLY. Output ONE full-body soldier on transparent background, no other figures and no sheet. Preserve that exact face, right-facing E camera, forage cap, navy coat, pale blue wool trousers, rifle in the same hand at the same shoulder, pack, rolled blanket, canteen and leather equipment. Keep torso and head upright in the same posture.
CHANGE THE TWO LEGS TO THE ANATOMICALLY OPPOSITE STRIDE of the first reference sprite. The near/camera-side RIGHT thigh must angle BACKWARD, from his near hip down-left toward a right boot at the BACK of the stride (screen-left); this near right leg passes IN FRONT OF and occludes the far leg at the crossing. The farther LEFT thigh angles FORWARD down-right and ends in a left boot ahead of him (screen-right). The FAR left heel meets the ground in front; the NEAR right heel is lifted behind. Both legs are straight enough for walking contact, NOT a high knee. Reverse which anatomical leg owns each boot. Do NOT simply mirror the entire soldier and do NOT repeat his existing near/right leg forward stride.
His face, hands, coat, rifle and pack still face screen RIGHT and must stay on their original anatomical sides. Only legs change pose. The legs visibly CROSS as the near right leg goes behind and the far left leg reaches ahead. Accurate natural anatomy and realistic fabric folds, no distortions, no floor, no shadow, no backdrop, no text, ample transparent margin around entire bayonet and boots. Full cap-to-sole body and full rifle must fit.
```

## Rig-guided appearance transfer — limited E gait pilot

References, in order: `docs/art-pass/candidates/gettysburg-v3/union-e-rig-guide.png`, `public/images/units/gettysburg-v2/union-ready.png`

```text
Create a production-quality realistic Civil War infantry animation strip by upgrading the FIRST reference image's materials and detail while preserving its exact four poses. FIRST image is a structural render: four equal cells, one Union soldier facing screen right viewed from elevated 35-degree isometric camera, same camera, fixed pelvis-ground root in each cell. SECOND image is appearance reference ONLY for worn dark blue Union wool jacket, light blue trousers, kepi, brown leather boots, blanket roll, haversack, canteen and wood/metal rifle.

IMPORTANT: preserve FIRST image lower-body geometry almost exactly. Phase 1: FAR/LEFT leg is forward screen-right, NEAR/RIGHT leg trails screen-left. Phase 2: right leg passes forward with bent knee while left foot supports. Phase 3: NEAR/RIGHT leg is forward screen-right, FAR/LEFT trails screen-left. Phase 4: left leg passes forward while right foot supports. Do not repeat the same leading leg across phase 1 and 3. The boot silhouettes in the first reference demonstrate the opposite poses, copy these positions and which knee is visible. A genuine left-contact / passing / right-contact / passing gait is essential.

Maintain one identical man, same realistic body proportions, same equipment side, same rifle carrying pose, fixed camera and pixel scale in all four frames. Realistic natural cloth folds and textured leather; restrained diffuse daytime light, no floor shadow. Keep the image as a SINGLE 4-column x 1-row strip, each soldier wholly within its own equal cell with generous blank margins; no text, labels, grid, ground, backdrop or scenery. Transparent background, preserved alpha. The guide is structural only: replace its low-poly skin/clothes with highly detailed realistic artwork, keep its gait and elevated viewpoint. Full body and entire weapon visible. Do not draw additional people or frames.
```

The guide was rendered natively in Blender. This experiment changes materials while constraining the four lower-body poses. Approval is limited to an opt-in Union E march study, not a completed family or default production art.

