# Gettysburg v2 Infantry Source Prompts

September 30, 2026. Built-in OpenAI imagegen; exact model identifier not reported. Original pixels and native alpha retained. The march sheets remain limited movement studies; anatomy does not yet pass the opposing-contact gate. Targeted corrections are retained as rejected evidence.

## union_ready

```text
Use case: historical-scene
Asset type: production sprite atlas source for a realistic elevated-view 2D Civil War game.
Input reference: supplied Union sheet establishes material realism only; create an improved disciplined new source atlas.
Create a transparent landscape sheet, ideally 3072x2048, with EXACTLY 16 separate full-body figures in an even 4 column by 4 row grid. Cell centers fixed. Each figure and upright musket MUST fit completely inside its own cell with at least 12 percent top/bottom/side transparent margins. No shadows, ground, text, labels, borders, backdrop or grid lines. True alpha.
TWO coherent ordinary Army of the Potomac privates, Gettysburg July 1863:
Identity A: lean young clean-shaven man, dark blue forage cap, dusty dark indigo sack coat, sky-blue trousers, black leather cartridge box, tan haversack/canteen, gray blanket roll on pack, brown brogans.
Identity B: slightly stockier older man with brown beard, same forage cap and regulation blue palette, worn coat, different rolled blanket/stowage, no insignia. Both carry a percussion rifle-musket with fixed bayonet upright in the right hand, butt near boot; left hand relaxed. Natural planted weight, relaxed knees.
FIRST TWO ROWS are identity A, LAST TWO ROWS identity B. In EACH identity's eight cells, read row-major: (1) right profile facing screen right, (2) front-right three-quarter facing down-right, (3) front toward viewer/down, (4) front-left facing down-left, (5) left profile, (6) back-left facing up-left, (7) back away/up, (8) back-right facing up-right.
CRITICAL camera is fixed elevated orthographic 35 degrees downward: visible cap crown, shoulders, boots, pack top; subject rotates through eight horizontal headings. No eye-level portrait. Exactly the same equipment sides, scale and anatomy for each identity through all directions. Rifle on anatomical right, cartridge box/haversack stable. No mirroring equipment.
Documentary realism: human skin, dusty wool weave, worn leather, wood/iron; muted mid-afternoon light from upper left consistent across cells, no heroic rim. Bodies slightly less rigid, candid ready posture. Strong readable silhouette at 60-pixel game height. No cartoon/anime, ornamental uniforms, repeated front views, cropped boots or bayonet.
```

## confederate_ready

```text
Use case: historical-scene
Asset type: transparent sprite atlas for a realistic Civil War game.
Reference Confederate image establishes materials. Create a NEW disciplined elevated-camera sheet with TWO different ordinary Confederate privates at Gettysburg July 1863.
Exactly 16 full-body figures in precise 4 columns x4 rows, on native transparent background. Every figure INCLUDING upright fixed-bayonet musket must fit within central 75 percent of its cell. Upper and lower margins mandatory. Boots never at canvas edge. No text, labels, grid, scenery, ground or cast shadows.
Identity A: lean younger man, short brown stubble, worn gray forage cap, muted gray wool short jacket and gray trousers, dark leather belt/cartridge box, tan canteen/haversack, blanket roll, brogans.
Identity B: older broad-shouldered brown-bearded man, worn brown slouch hat, muted brown-gray wool jacket and dusty gray trousers, tan blanket roll, dark leather equipment. Plausible Army of Northern Virginia representative clothing; no decorative symbols or modern gear.
Rifle-musket with fixed bayonet held upright safely at right side, natural ready stance, weight on boots. Anatomical right hand/equipment sides remain constant.
Rows1-2 identity A; rows3-4 identity B. For EACH identity eight cells read row-major: E right profile; SE front-right three-quarter; S front; SW front-left three-quarter; W left profile; NW rear-left; N back; NE rear-right. Rotate person under fixed elevated orthographic camera pitched 35 degrees downward. Show hat crown and shoulders/pack tops. Exactly eight unique headings per man, no eye-level view.
Realistic dusty wool/leather/wood/metal, anatomically natural hands and equipment, soft hot summer light from upper-left, muted documentary palette consistent all cells. Same body scale, face and clothing across each identity's eight views. Clean silhouettes for 60pixel game height. Prefer 3072x2048 landscape source. Do not maximize figure size: leave 12percent clear margin on every cell edge. No overlap or cropping.
```

## union_march

```text
Use case: historical-scene
Asset type: true opposing-contact march source atlas for a realistic 2D Civil War game.
Input image is the identity reference: PRESERVE these TWO Union privates, their face, cap, clothing, gear and rifle. Create their MARCH cycle.
Exactly 32 separate FULL figures in precise 8 columns x4 rows. Native transparent background, no ground/shadow/text/grid. Every figure plus vertical rifle inside central 75percent cell with clear margin. Never crop boots, hat or bayonet. Landscape preferably 3072x2048.
ROW1 identity A LEFT-foot forward contact; ROW2 exact same identity A RIGHT-foot forward contact.
ROW3 identity B LEFT-foot forward contact; ROW4 exact same identity B RIGHT-foot forward contact.
Every row eight compass headings left-right E, SE, S, SW, W, NW, N, NE: right profile, front-right, front, front-left, left profile, rear-left, back, rear-right. One fixed orthographic elevated camera 35degrees down, camera NEVER rotates; figure rotates. Same scale all cells, matched torso/pelvis centers. Rifle-musket with fixed bayonet held vertical against RIGHT shoulder by right hand in both contacts; no long horizontal weapons crossing cells. Pack, canteen, haversack never change body side.
Identity A lean young clean-shaven man, indigo sack coat, blue forage cap, sky-blue trousers, gray rolled blanket/pack.
Identity B stockier older brown-bearded man, same blue forage cap and blue uniform, distinct beard/body and worn coat/blanket arrangement matching reference.
Real marching: alternating lead boot and opposite trailing boot, knees/hips carry weight, hips over planted contact, subtle upper-body counterbalance. CONTACT A and B must clearly alternate legs rather than duplicate poses. Natural tired soldiers in organized march, not running. No mirroring of equipment. Consistent documentary material realism, dusty wool/wood/leather, light upper left. No backdrop, float, modern equipment, overlapping figures, cropped edges, grid or labels.
```

## confederate_march

```text
Use case: historical-scene
Asset type: transparent march-cycle atlas for a realistic Civil War game.
Reference is the identity target: preserve these TWO Confederate privates, faces, clothing, hats, equipment arrangement and camera.
EXACTLY 32 full-body figures in a strict 8-column x4-row sheet. All separate, no overlap; figure and upright musket inside central 75percent of each cell. Transparent margin above bayonets and BELOW boots compulsory. Native alpha background, no text, grid, labels, scenery, cast shadows or ground. Landscape preferably 3072x2048.
Row1: gray-capped younger identity A, LEFT-boot forward contact.
Row2: SAME identity A, RIGHT-boot forward opposing contact.
Row3: brown slouch-hat bearded identity B, LEFT-boot forward.
Row4: SAME identity B, RIGHT-boot forward.
Every row identical eight heading order E SE S SW W NW N NE: right profile, front-right, front, front-left, left profile, back-left, back, back-right. Fixed elevated orthographic camera 35degrees downward from above. Subject turns, camera/light never turns.
A wears dusty muted gray wool jacket and trousers, gray forage cap, gray blanket/pack, leather cartridge box/canteen and tan haversack.
B wears brown slouch hat, weathered brown-gray jacket, gray trousers, tan rolled blanket, dark equipment as in reference.
Both percussion rifle-musket with fixed bayonet safely upright at anatomical RIGHT shoulder, right hand around stock. Opposite arm counter-swings naturally. Equipment remains on correct anatomical side in every direction, no mirroring.
True marching poses alternate the leading legs CLEARLY between rows, pelvis over weight-bearing boot, natural bent trailing knee, mild tired forward motion. No running/heroic stance. Body scale and torso length unchanged within identity, light always upper-left. Dusty wool/leather/wood/iron with human anatomy documentary realism matching reference. Clean readable silhouette at 60pixel gameplay height. No crop/floating/malformed limbs/duplicate headings.
```

## union_march_correction

```text
Use case: precise-object-edit
Edit target: Union 8x4 marching sprite sheet. Make ONE correction: the opposing step rows currently repeat the same lead-leg silhouettes. Correct ONLY the lower body legs and boots in the SECOND and FOURTH rows (count from top). Preserve EVERY pixel-level composition, all32figures, all upper bodies/faces/uniforms/gear/weapon/eightdirections/camera/light and true alpha as closely as possible.
Rows1and3 remain reference contact. In row2and4, make anatomical RIGHT thigh/knee/boot extend forward along each person's heading, anatomical LEFT thigh/boot trail behind. If reference row's visible legs suggest a different lead due view, explicitly swap front and rear leg positions so the second row contact is the unmistakable opposite of the corresponding first-row contact. Each column pair must visibly alternate legs when played.
For right-facing profile, far and near leg ownership/boot positions swap. For frontal SOUTH view, viewer-LEFT leg is the anatomical right: that boot must be forward/low, viewer-right leg trailing. Back NORTH view: viewer-RIGHT anatomical right boot goes forward/away/up, viewer-left boot trails toward viewer. Apply coherent projection to obliques.
Keep hips/torso centered at same location and identical size. Natural foot contacts, no extreme kick. Keep entire boots inside source row, no crop or neighboring overlap. No added elements/text/background/shadow. Native transparent output.
```

## confederate_march_correction

```text
Use case: precise-object-edit
Edit target: Confederate 8column4row march sprite sheet. Correct ONLY leg/boot pose in rows TWO and FOUR. These opposing contact rows presently duplicate their paired first/third row. Preserve all32people, hats, faces, gear, muskets, torso size/location, same camera/light, native transparency, eightheadings and layout.
In rows2and4 set anatomical RIGHT leg/boot as leading forward along that person's heading, LEFT leg/boot trailing. Explicitly swap support legs relative to corresponding row1or3 pose so each pair is clearly the opposite foot contact. The fixed hips and body must not change size.
At front-facing SOUTH column3 (human ordinal), RIGHT anatomical boot (viewer-left) reaches forward/lower, viewer-right boot trails. At back-facing NORTH column7, RIGHT anatomical boot (viewer-right) reaches forward/away/up, LEFT boot trails towardviewer. At profile headings keep correct near/far legs and swap which leads. Obliques follow same actual leg/anatomy. Both boots stay natural ground contact with bent trailing knee; no kick or running. No mirrored equipment.
All upper bodies, source cell locations/headings, imagery outside row2/4legs remain unchanged as closely as possible. Full boots must fit source frame. No backdrop/shadow/text/grid, no overlap/crop. True alpha.
```

