# Gettysburg v2 atlas measurement notes

Status: measured candidate atlases. Ready artwork and movement studies remain subject to visual registration review; the movement samples are not approved opposing foot contacts.

The authoring process reads the original RGBA PNGs and writes JSON only. No PNG pixels were edited, resized, padded, recolored, or corrected by this process. The atlas metadata records the SHA-256 of each original source.

## Authored coverage

| Source | Logical frames | Identity a reference height | Identity b reference height | Solid row-separator failures |
| --- | ---: | ---: | ---: | ---: |
| Union ready | 16 | 239 px | 242 px | 0 |
| Confederate ready | 16 | 240 px | 243 px | 0 |
| Union march study | 32 | 232 px | 233 px | 0 |
| Confederate march study | 32 | 220 px | 224 px | 1 |

All 96 logical frames pass `validateGettysburgInfantryAtlas`: complete names, positive integer source rectangles, in-bounds geometry, valid normalized ground pivots, fixed identity/page height references, and distinct sample rectangles. The source hashes match the PNGs.

## Geometry decisions

- Ready source columns use the nominal 384 px boundaries, which lie in transparent vertical bands. Each source column uses its own measured row cuts because generated row spacing is irregular. A single shared third-row boundary would clip boots or bayonet tips in the Union sheet.
- Union march uses source x boundaries `[0, 202, 386, 582, 771, 960, 1152, 1346, 1536]`. Nominal 192 px cells would clip the first and third columns' boots.
- Confederate march uses source x boundaries `[0, 195, 384, 570, 768, 960, 1156, 1350, 1536]`.
- A cut is chosen from the least residual alpha mass in the source gap, preferentially where no pixel reaches alpha 64. The metadata preserves every measured cut and its maximum alpha. Faint antialias residue remains in some generated gaps.
- Rectangles are full assigned cells with `trimmed: false`. Body height is the median measured cap-to-sole height for each identity/page, so switching direction or sample does not change the renderer's scale reference.
- Ground y uses the lowest solid sole band. Boot-center x uses a shallow alpha-weighted sole band. The Union ready E views have explicit visual annotations to avoid anchoring to the adjacent rifle butt. These pivots still require live animation review.

## Source limitations requiring another authoring method

1. **Opposing march contacts remain unproven and visibly fail in several directions.** Sample 0/1 often repeats the same leading leg. Targeted imagegen corrections were inspected and rejected; the public movement study sheets retain the original pixels. Logical names containing `contact` are identifiers only. The metadata explicitly states that anatomical opposing support legs are not approved.
2. **Confederate march S source rows overlap.** Column 2 at y761 contains two solid pixels at x468–469, with alpha 134/169, in the least-mass gap between identity b samples. A rectangular crop cannot isolate both neighboring poses fully: it must lose part of a bayonet tip or include a sliver of the neighboring tip. This source needs isolated frames or another authoring approach before promotion.
3. **Union ready source height varies by viewing direction.** Identity a front views measure 244–252 px cap-to-sole while rear views measure 230–234 px; identity b front views measure 248–258 px and rear views 231–236 px. A fixed median reference removes per-frame scale changes, but the generated silhouette still changes apparent height across directions. This is a source camera/registration issue.
4. **Tight ground padding persists in some movement study cells.** Several ground pivots are at 0.996–1.0 of their assigned cell height. The measured separators avoid strong pixels in all but the explicitly failed Confederate S gap, but isolated frames with consistent padding would be safer production assets.

## Reproduction

Run `python3 scripts/author-gettysburg-family-atlases.py` from the project root to regenerate all four JSON atlases against the current PNGs. Optional source stems, such as `union-ready`, restrict the run. This requires Pillow and performs no image writes.

The script's output is geometry evidence. It does not certify action anatomy, uniform history, frame-to-frame motion, readability, or production quality.
