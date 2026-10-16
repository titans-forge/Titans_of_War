// Representative placement on the compressed battle boards, not survey coordinates.
// Building footprints block every side equally; yards confer no additional cover.
const sites = {
  wilderness: [{ id: 'widow-tapp-house', name: 'Widow Tapp House', minimumRules: 11, assetSet: 'landmarks-v4', x: 285, y: 510, width: 92, height: 60, artWidth: 150, artHeight: 124, labelOffsetY: -88,
    approachX: 320, approachY: 625,
    note: 'Catharine Tapp’s rented farm stood beside the Orange Plank Road. Her family fled as Hill’s front broke and Longstreet’s troops arrived. This is an illustrative reconstruction of the modest log home. The marked farm clearing has open-ground cover and movement; the battle’s short visibility limits still apply.',
    source: 'https://www.nps.gov/places/tapp-field.htm' }],
  cold_harbor: [{ id: 'garthright-house', name: 'Garthright House', minimumRules: 11, assetSet: 'landmarks-v4', x: 435, y: 195, width: 112, height: 68, artWidth: 176, artHeight: 140, labelOffsetY: -96,
    note: 'The Garthright farmhouse stood behind Wright’s Federal VI Corps. After June 3, Union surgeons used it as a field hospital for ten days while the family sheltered in the basement. This brick-and-timber reconstruction is illustrative; hospital care is historical context, with no healing or garrison bonus.',
    source: 'https://www.nps.gov/rich/learn/historyculture/cold-harbor-tour.htm' }],
  gettysburg: [{ id: 'brian-house', name: 'Abraham Brian House', minimumRules: 17, assetSet: 'landmarks-v7', x: 1300, y: 390, width: 96, height: 58, artWidth: 162, artHeight: 126, labelOffsetY: -90,
    note: 'Abraham Brian’s farm stood near the northern end of Cemetery Ridge. His African American family fled the Confederate invasion and returned to damaged buildings and lost crops. This small farmhouse follows the restored house; exact 1863 finishes and yard details are illustrative. Its placement is compressed, not surveyed. Farm tracks and cultivation add no cover or speed bonus.',
    source: 'https://www.nps.gov/places/abraham-brian-farm.htm' }, { id: 'leister-house', name: 'Leister House', minimumRules: 10, assetSet: 'landmarks-v3', x: 1120, y: 195, width: 94, height: 64, artWidth: 150, artHeight: 128, labelOffsetY: -90,
    note: 'Lydia Leister’s small farmhouse behind Cemetery Ridge served as Meade’s headquarters. Shelling forced him to relocate on July 3. This illustrative reconstruction shows the standing house; bombardment damage and headquarters relocation are not simulated.',
    source: 'https://www.nps.gov/places/lydia-leister-farm.htm' }],
  gettysburg_jackson: [{ id: 'evergreen-gatehouse', name: 'Evergreen Gatehouse', minimumRules: 10, assetSet: 'landmarks-v3', x: 930, y: 245, width: 144, height: 62, artWidth: 196, artHeight: 160, labelOffsetY: -112,
    note: 'Evergreen Cemetery’s 1855 brick gatehouse anchors Cemetery Hill. This depicts the original gateway without later residential additions. The building is historical; Jackson’s attack here is alternate history. Its narrow carriage arch is not a route for a full formation; move around the building.',
    source: 'https://www.nps.gov/places/gettysburg-then-now-gatehouse.htm' }],
  shiloh: [{ id: 'shiloh-church', name: 'Shiloh Church', minimumRules: 9, assetSet: 'landmarks-v2', x: 445, y: 600, width: 88, height: 62, artWidth: 150, artHeight: 125,
    note: 'The log Shiloh Meeting House gave the battle its name. Sherman’s division defended this ridge on the morning of April 6, 1862. This modest chapel is an illustrative reconstruction informed by the park’s historical painting.',
    source: 'https://www.nps.gov/places/shiloh-church-tour-stop-5.htm' }],
  chancellorsville: [{ id: 'catharine-furnace', name: 'Catharine Furnace', minimumRules: 16, assetSet: 'landmarks-v6', x: 1120, y: 740, width: 150, height: 88, artWidth: 216, artHeight: 184, labelOffsetY: -124, approachX: 1050, approachY: 825,
    note: 'Jackson’s column passed Catharine Furnace on May 2, 1863. Its ironworks and woodland roads helped shape the flank march. The round stone stack follows the surviving masonry; its upper works, shed and ramp are illustrative. This compressed board places the site toward the southern approach, not at surveyed coordinates. Work tracks and charcoal yards add no cover or speed bonus.',
    source: 'https://www.nps.gov/frsp/learn/photosmultimedia/chancellorsville-battlefield-tour.htm' }, { id: 'chancellor-house', name: 'Chancellor House', minimumRules: 9, assetSet: 'landmarks-v2', x: 1210, y: 540, width: 150, height: 80, artWidth: 205, artHeight: 150,
    note: 'The Chancellor family’s large brick house served as Hooker’s headquarters. The house is shown standing during the May 2 flank attack; it burned on May 3. Architecture is illustrative, informed by Edwin Forbes’s May 1 drawing.',
    source: 'https://www.nps.gov/places/chancellor-house-site.htm' }],
  chickamauga: [{ id: 'snodgrass-house', name: 'Snodgrass House', minimumRules: 13, assetSet: 'landmarks-v5', x: 490, y: 155, width: 122, height: 60, artWidth: 190, artHeight: 132, labelOffsetY: -92,
    approachX: 760, approachY: 240,
    note: 'The Snodgrass home stood near the Union stand on Horseshoe Ridge. This larger log-house interpretation is informed by Alfred Waud’s drawing; its date is uncertain. The smaller surviving cabin was rebuilt in 1867 using original logs. Farm tracks and yard details are illustrative, with no additional movement, cover or hospital bonus.',
    source: 'https://www.loc.gov/pictures/item/2004660147/' }, { id: 'brotherton-cabin', name: 'Brotherton Cabin', minimumRules: 9, assetSet: 'landmarks-v2', x: 915, y: 565, width: 86, height: 58, artWidth: 140, artHeight: 115,
    note: 'Longstreet’s breakthrough crossed the fields around the Brotherton farm on September 20, 1863. This log dwelling is an illustrative reconstruction; the cabin standing at the park today was rebuilt after the war.',
    source: 'https://www.nps.gov/chch/learn/news/chickamaugaartilleryapril29.htm' }],
  first_manassas: [{ id: 'stone-house', name: 'Stone House', minimumRules: 13, assetSet: 'landmarks-v5', x: 310, y: 330, width: 110, height: 68, artWidth: 172, artHeight: 146, labelOffsetY: -103,
    approachX: 470, approachY: 435,
    note: 'The Stone House stood northeast of the Sudley Road–Warrenton Turnpike crossroads below Henry Hill and sheltered wounded during both Manassas battles. This wartime interpretation follows the 1862 photograph. Farm tracks and yard details are illustrative, with no additional movement, cover or hospital bonus.',
    source: 'https://www.nps.gov/mana/learn/historyculture/the-stone-house.htm' }, { id: 'henry-house', name: 'Henry House', x: 580, y: 530, width: 100, height: 64, artWidth: 156, artHeight: 122,
    note: 'The original Henry farmhouse stood at the center of the fighting on Henry Hill. This depicts the modest wartime frame house, not the larger postwar replacement.',
    source: 'https://www.nps.gov/places/000/henry-house.htm' }],
  third_winchester: [{ id: 'hackwood', name: 'Hackwood', x: 1375, y: 555, width: 146, height: 76, artWidth: 190, artHeight: 145,
    note: 'Fighting around Hackwood marked the Confederate northern flank during Crook’s attack. The stone house is an illustrative reconstruction informed by the battlefield interpretive panel.',
    source: 'https://www.shenandoahatwar.org/third-winchester-article-1' }],
  cedar_creek: [{ id: 'heater-house', name: 'Heater House', minimumRules: 16, assetSet: 'landmarks-v6', x: 1260, y: 480, width: 134, height: 68, artWidth: 202, artHeight: 145, labelOffsetY: -102, approachX: 1170, approachY: 540,
    note: 'Solomon and Caroline Heater’s farm stood in the Cedar Creek battlefield. Fighting reached the house during the morning attack, and troops passed it again in the afternoon retreat. This clapboard-house interpretation follows the surviving main block and lower wing; roof, porch and yard details are not a verified 1864 reconstruction. Farm tracks, furrows and fences are illustrative and add no cover or speed bonus.',
    source: 'https://www.nps.gov/places/heater-house.htm' }, { id: 'belle-grove', name: 'Belle Grove', x: 625, y: 470, width: 142, height: 76, artWidth: 190, artHeight: 145,
    note: 'Belle Grove served as Union headquarters before the Confederate dawn attack overran this part of the field. The limestone mansion anchors the headquarters sector.',
    source: 'https://home.nps.gov/places/belle-grove-plantation.htm' }],
};

export function landmarksFor(scenarioId, version) {
  return version >= 8 ? (sites[scenarioId] || []).filter(site => version >= (site.minimumRules || 8))
    .map(site => ({ ...site, src: `images/battles/${site.assetSet || 'landmarks-v1'}/${site.id}.png` })) : [];
}

// July 3 Gettysburg retains its dedicated rules; both tactical systems expose
// the same landmark data without making Gettysburg a generic field battle.
export const landmarkField = battle => battle?.fieldBattle || battle?.gettysburg;
export const landmarkLineClear = (field, a, b) => !(field?.landmarks || []).some(site => segmentHitsLandmark(a, b, site));

export function landmarkBounds(site, padding = 0) {
  return { left: site.x - site.width / 2 - padding, right: site.x + site.width / 2 + padding,
    top: site.y - site.height / 2 - padding, bottom: site.y + site.height / 2 + padding };
}

// Reserve turning room around masonry. Artillery reserves both travel and deployed
// dimensions, so stopping or limbering cannot enlarge its footprint into a house.
export function landmarkClearance(unit) {
  if (unit.type === 'artillery') return Math.hypot(72, 36) / 2 + 6;
  const mode = unit.formationMode;
  return Math.hypot(mode === 'column' ? 62 : mode === 'skirmish' ? 144 : mode === 'deep' ? 88 : 124,
    mode === 'column' ? 72 : mode === 'deep' ? 48 : mode === 'skirmish' ? 30 : 32) / 2 + 6;
}

export function segmentHitsLandmark(a, b, site, padding = 0) {
  const r = landmarkBounds(site, padding);
  let enter = 0, exit = 1;
  for (const [axis, lo, hi] of [['x', r.left, r.right], ['y', r.top, r.bottom]]) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-10) { if (a[axis] < lo || a[axis] > hi) return false; continue; }
    const t1 = (lo - a[axis]) / delta, t2 = (hi - a[axis]) / delta;
    enter = Math.max(enter, Math.min(t1, t2)); exit = Math.min(exit, Math.max(t1, t2));
    if (enter > exit) return false;
  }
  return true;
}

export function formationLandmarkBlocker(field, unit, destination = unit) {
  return (field?.landmarks || []).find(site => segmentHitsLandmark(destination, destination, site, landmarkClearance(unit)));
}

export function landmarkMoveClear(field, unit, destination) {
  return !(field?.landmarks || []).some(site => segmentHitsLandmark(unit, destination, site, landmarkClearance(unit)));
}

export function landmarkDestinationError(field, unit, destination) {
  const site = formationLandmarkBlocker(field, unit, destination);
  return site ? `${site.name} blocks this destination. Leave room for the formation to turn beside the building.` : null;
}

// Automatic approach and retreat orders can name an occupied objective center.
// Give them a reachable point outside the footprint; explicit player moves are
// validated before their courier is sent instead of silently changing the order.
export function clearLandmarkTarget(field, unit, target, world) {
  const blocker = formationLandmarkBlocker(field, unit, target);
  if (!blocker) return target;
  const r = landmarkBounds(blocker, landmarkClearance(unit) + 8);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  return [
    { x: r.left, y: clamp(target.y, r.top, r.bottom) }, { x: r.right, y: clamp(target.y, r.top, r.bottom) },
    { x: clamp(target.x, r.left, r.right), y: r.top }, { x: clamp(target.x, r.left, r.right), y: r.bottom },
  ].filter(p => p.x >= 15 && p.x <= world.width - 15 && p.y >= 15 && p.y <= world.height - 15 && !formationLandmarkBlocker(field, unit, p))
    .sort((a, b) => Math.hypot(a.x - unit.x, a.y - unit.y) - Math.hypot(b.x - unit.x, b.y - unit.y))[0] || unit;
}
