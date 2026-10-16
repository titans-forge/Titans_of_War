# Gettysburg v20: matching contact and casualty infantry

## What changed

The Gettysburg art preview now has four native Confederate A east-facing contact poses and four non-graphic casualty poses in the same kit as v18. The former depicts guard, a short two-handed lunge, recovery and close guard. The latter depicts hit/stumble, knee down, collapse and ground rest. The existing combat simulation decides when close combat and losses occur; this change only selects artwork for those recorded events.

Use `?artPass=gettysburg-v20` on the local game URL, then Quick battle → Gettysburg — The Field Between the Ridges. This is an explicit, incomplete art preview. Normal Gettysburg alone uses the new policy. Other battles, alternate Gettysburg/Jackson, sides and directions retain their accepted fallback. The default game art has not changed.

The preview extends v18's 36 atlases to 38 and 72 clips to 74. Ready, marching, firing and ordered reload behavior stay exact. Existing shot checkpoints keep the v18 presentation ID. The renderer, combat rules, saved visual state, checkpoint schema and campaign storage remain unchanged.

## Artwork and review

Both original generated RGBA sources are 1254×1254, divided by metadata into four complete 627×627 cells. No raster crop, resizing, alpha cleanup, warping, mirroring or per-phase height normalization is applied to the exported PNGs. One independently measured 396-pixel contact reference height governs all eight natural postures. Each phase has a separately reviewed ground-support pivot; falling naturally lowers its projected body height.

Independent Astra Max source review accepted the exact pair for this bounded preview. It does not certify historical drill, physical anatomy, human usability, a complete family, default promotion or a production release. The level lunge can resemble a shouldered aim pose in isolation; recovery and close guard have a subtle distinction. Very low-alpha edge noise remains in the generated pixels, including source-edge noise; solid silhouettes have at least 45 pixels of clearance in each contact cell and 50 in each casualty cell. The sources are not certified fringe-free.

Three generation attempts were rejected before choosing these two sheets: an eight-pose source with nonintegral cell geometry/cross-cell weapons, then separate contact and casualty sources with insufficient solid-pixel margin. Original attempts and reasons are retained in the isolated work evidence; production source directories contain the selected originals only. Prompt provenance and independent measurements accompany the new assets.

The added public PNGs total **1,078,019 compressed bytes**; the two atlas JSON files add **7,352 bytes**. Nominal decoded RGBA for both native sheets is **12,580,128 bytes**. This is image arithmetic, not a measured GPU residency or frame-rate claim.

## Playback behavior

- Only the exact Confederate A east contact/fall addresses can select these sequences. A missing phase, unavailable atlas, ambiguous definition or malformed native metadata withholds the entire action and uses the established fallback.
- Close combat uses the existing contact bearing, rather than rotating a formation's firing front to fake a bayonet action. The supplied four contact frames cycle; no new wall clock or random animation clock is introduced.
- Casualty frames use saved fall timing and ground positions, clamp at ground rest, then follow the existing fade/hide interval. Authored fallen poses are not rotated again by the legacy fallen-sprite treatment.
- Pause and cold resume preserve the existing visual facts. Reduced motion uses a fixed guard and terminal ground-rest frame; it does not invent movement or alter damage.

## Verification and limits

The authentic pre-edit fixture binds 16 historical policies, 890,624 legacy poses, 32,768 unsupported contact/fall poses, 40 native source pairs, 12 protected runtime modules, four older fixtures, 202 motion studies and 125 motion presets. It cannot be regenerated after v20 is enabled to make a regression disappear.

Mandatory results at the final integration point: **20/20 v20 checks**, **262/262 current-art checks**, **396/396 asset-suite checks**, **1,421/1,421 gameplay checks**, all native source authors/checks, 21 new author rejection cases, and the production build passed. The actual Scene code is exercised for contact facing, genuine simultaneous losses, ordered fall phases, ground anchors, pause/cold resume, resolution aging, reduced motion, complete-action fallback and v18 volley checkpoint identity. Those Scene tests use display doubles and are not GPU measurements. Existing gates and fixtures were retained.

Public browser play used the production build, one owned tab and full-ammunition Gettysburg practice. A direct assault exercised the established fallback directions and routing. A fresh four-column supporting maneuver placed Pickett west of Gibbon, then a Southern ridge assault produced genuine east-facing close combat. At field time 43 the public inspector reported close combat and strength 4,831/5,404. Close captures show native contact/casualty figures among the ranks; normal and overview captures preserve battlefield context. Two paused battlefield captures were pixel-identical.

Save and leave → cold page reload → Resume saved battle restored that combat moment paused at field time 43, with the same strength and combat status. Camera, inspector and marker preferences reset through existing UI behavior; after inspection controls were reapplied the screenshots were not pixel-identical, so no cold screenshot equality claim is made. All four casualty phases and first cold-draw sprite facts are verified separately by the actual-Scene tests. No browser OS reduced-motion override is exposed by this browser; that branch has automated Scene coverage, not a browser-level motion observation. Browser warnings/errors were absent in the observed run. This was a scoped art play check, not a complete battle-permutation audit or a new whole-game grade.

## Next priorities, in order

1. Add matching Union west-facing contact and casualty sources so the two sides of this same engagement have equally coherent kit and native posture.
2. Complete the principal north/south and diagonal bearings in coherent action groups, with independent ground registration and fallback gates. Then address secondary identities and other unit roles.
3. Improve the lunge/guard/recovery distinction at actual battle scale, using a historically plausible complete musket and naturally connected grips. Compare short real-play sequences with an outside human tester before approving the family.
4. Review transitions between marching, contact and casualties, color/lighting consistency and faint edges across the full family. Keep per-phase anatomical size changes natural.
5. After the infantry family passes these checks, extend it across battlefields, then consider saving camera/inspector preferences and repeat measured performance and complete game audits. Promote default art and publish only after that broader acceptance.

The prior whole-game grade remains provisional; this narrow increment does not justify a 10/10 score or a production-art approval.
