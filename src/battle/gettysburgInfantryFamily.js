import { deterministicUnitValue, hashString } from './formationMath.js';

// Presentation-only pilot. The logical frame names are independent of the
// generated sheet layout, so a new crop or atlas does not change soldier IDs.
export const GETTYSBURG_INFANTRY_FAMILY_ID = 'gettysburg-v2';
export const GETTYSBURG_INFANTRY_SIDES = Object.freeze(['union', 'confederate']);
export const GETTYSBURG_INFANTRY_PAGES = Object.freeze(['ready', 'march']);
export const GETTYSBURG_INFANTRY_IDENTITIES = Object.freeze(['a', 'b']);
export const GETTYSBURG_INFANTRY_DIRECTIONS = Object.freeze(['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']);

export function gettysburgInfantryFamilyEnabled(scenarioId, search = '') {
  return scenarioId === 'gettysburg'
    && new URLSearchParams(search).get('artPass') === GETTYSBURG_INFANTRY_FAMILY_ID;
}

export function gettysburgInfantryFamilyTextureKey(side, page) {
  if (!GETTYSBURG_INFANTRY_SIDES.includes(side) || !GETTYSBURG_INFANTRY_PAGES.includes(page)) {
    throw new RangeError('Unknown Gettysburg infantry side or page');
  }
  return `${side}-${GETTYSBURG_INFANTRY_FAMILY_ID}-${page}`;
}

// Four atlas descriptors, each containing its PNG and JSON URL. Opt-in and
// exact scenario checks live here as well as in pose selection to prevent
// accidental extra loading on another battlefield.
export function gettysburgInfantryFamilyAssets(scenarioId, search = '', publicBase = '') {
  if (!gettysburgInfantryFamilyEnabled(scenarioId, search)) return [];
  const base = publicBase ? `${publicBase.replace(/\/$/, '')}/` : '';
  return GETTYSBURG_INFANTRY_SIDES.flatMap(side => GETTYSBURG_INFANTRY_PAGES.map(page => {
    const path = `${base}images/units/${GETTYSBURG_INFANTRY_FAMILY_ID}/${side}-${page}`;
    return {
      side,
      page,
      key: gettysburgInfantryFamilyTextureKey(side, page),
      image: `${path}.png`,
      json: `${path}.json`,
    };
  }));
}

function soldierHash(formationId, figureId, salt) {
  // Encoding a tuple avoids collisions between e.g. ('a:b', 'c') and ('a',
  // 'b:c'). Identity and gait have different salts and never use action/time.
  let value = hashString(JSON.stringify([String(formationId), String(figureId), salt]));
  // Mix the FNV bits before reducing to two identities/four phases; the raw
  // low bit otherwise creates an obvious ABAB pattern for sequential IDs.
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

export function gettysburgInfantryIdentity(formationId, figureId) {
  return GETTYSBURG_INFANTRY_IDENTITIES[soldierHash(formationId, figureId, 'identity') % 2];
}

export function gettysburgInfantryContactPhase(formationId, figureId) {
  return soldierHash(formationId, figureId, 'contact') % 4;
}

// Place the standard beside a surviving central soldier. This establishes
// adjacency only: the soldier is not authored as a color bearer. Retaining the
// previous ID prevents the pole jumping when a formation turns or re-forms.
// Coordinates must share the caller's render space; nothing is projected here.
export function gettysburgInfantryStandardAnchor(formation, figures, previousId = null) {
  const living = Array.isArray(figures) ? figures.filter(figure => figure?.visible === true
    && !figure.fallen && figure.action !== 'fall' && figure.id != null
    && Number.isFinite(figure.x) && Number.isFinite(figure.y)) : [];
  if (!living.length) return null;
  const retained = previousId == null ? null : living.find(figure => figure.id === previousId);
  if (retained) return { id: retained.id, x: retained.x, y: retained.y };
  if (!Number.isFinite(formation?.x) || !Number.isFinite(formation?.y)) return null;
  const idKey = id => `${typeof id}:${String(id)}`;
  const ranked = living.map(figure => ({
    figure,
    distance: (figure.x - formation.x) ** 2 + (figure.y - formation.y) ** 2,
    key: idKey(figure.id),
  })).sort((first, second) => first.distance - second.distance
    || (first.key < second.key ? -1 : first.key > second.key ? 1 : 0));
  const { id, x, y } = ranked[0].figure;
  return { id, x, y };
}

export function gettysburgInfantryExpectedFrames(page) {
  if (!GETTYSBURG_INFANTRY_PAGES.includes(page)) throw new RangeError('Unknown Gettysburg infantry page');
  return GETTYSBURG_INFANTRY_IDENTITIES.flatMap(identity =>
    GETTYSBURG_INFANTRY_DIRECTIONS.flatMap((_, direction) => page === 'ready'
      ? [`${identity}-ready-${direction}`]
      : [0, 1].map(contact => `${identity}-march-${direction}-${contact}`)));
}

// figure.frame is supplied by formationVisualState's distance-driven gait.
// Render-clock time deliberately does not animate feet: moving a paused view
// or waiting while stationary must not advance a contact. To retain an exact
// contact when an explicit paused/resolving state receives a changed figure,
// callers can pass frozenContact captured from the last rendered pose. Without
// it, a fixed per-soldier contact is used. No state is retained or mutated here.
export function gettysburgInfantryFamilyPose(formationId, figure, _time, {
  scenarioId,
  search = '',
  reducedMotion = false,
  paused = false,
  resolving = false,
  frozenContact,
} = {}) {
  if (!gettysburgInfantryFamilyEnabled(scenarioId, search) || !figure || figure.fallen) return null;
  const { action, direction } = figure;
  if (!Number.isInteger(direction) || direction < 0 || direction >= GETTYSBURG_INFANTRY_DIRECTIONS.length) return null;
  const page = ['ready', 'idle'].includes(action) ? 'ready'
    : ['walk', 'route'].includes(action) ? 'march' : null;
  // Fire, reload, melee, fall and any later action must use the accepted family.
  if (!page) return null;
  const identity = gettysburgInfantryIdentity(formationId, figure.id);
  let contact = null;
  if (page === 'march') {
    const phase = gettysburgInfantryContactPhase(formationId, figure.id);
    const frame = Number.isFinite(figure.frame) ? Math.floor(figure.frame) : 0;
    const animatedContact = ((Math.floor((frame + phase) / 2) % 2) + 2) % 2;
    const fixedContact = Math.floor(phase / 2);
    contact = reducedMotion ? fixedContact
      : paused || resolving ? ([0, 1].includes(frozenContact) ? frozenContact : fixedContact)
        : animatedContact;
  }
  // Authored realistic bodies keep their proportions. The accepted legacy
  // pose applies separate width/height variation; do not inherit that stretch
  // when this family overrides its source artwork.
  const size = 0.95 + deterministicUnitValue(formationId, figure.id, 215) * 0.10;
  return {
    identity,
    page,
    direction,
    contact,
    frame: page === 'ready' ? `${identity}-ready-${direction}` : `${identity}-march-${direction}-${contact}`,
    flip: false,
    axialAim: false,
    useLegacyRearAim: false,
    width: size,
    height: size,
    // The contact and natural posture are authored in the frame. Applying the
    // legacy sway/lean on top would move its ground pivot and double the gait.
    angle: 0,
    offsetX: 0,
    offsetY: 0,
  };
}

// Validate authored crop geometry without making assumptions about grid size.
// Pixels/hashes are validated by the asset pipeline; this catches incomplete
// logical coverage, invalid ground pivots and out-of-bounds crops before load.
export function validateGettysburgInfantryAtlas(atlas, page) {
  const errors = [];
  if (!GETTYSBURG_INFANTRY_PAGES.includes(page)) return ['Unknown Gettysburg infantry page'];
  const size = atlas?.meta?.size;
  if (!Number.isInteger(size?.w) || size.w <= 0 || !Number.isInteger(size?.h) || size.h <= 0) {
    errors.push('Atlas meta.size must contain positive integer dimensions');
  }
  const frames = atlas?.frames;
  if (!frames || typeof frames !== 'object' || Array.isArray(frames)) return [...errors, 'Atlas frames must be a keyed object'];
  const expected = gettysburgInfantryExpectedFrames(page);
  const expectedSet = new Set(expected);
  for (const key of Object.keys(frames)) if (!expectedSet.has(key)) errors.push(`Unexpected frame ${key}`);
  for (const key of expected) {
    const entry = frames[key];
    if (!entry) { errors.push(`Missing frame ${key}`); continue; }
    const rect = entry.frame;
    const validRect = rect && ['x', 'y', 'w', 'h'].every(field => Number.isInteger(rect[field]))
      && rect.x >= 0 && rect.y >= 0 && rect.w > 0 && rect.h > 0;
    if (!validRect) errors.push(`${key}: frame must be a positive integer crop`);
    else if (size && (rect.x + rect.w > size.w || rect.y + rect.h > size.h)) errors.push(`${key}: crop exceeds atlas bounds`);
    const pivot = entry.pivot;
    if (!Number.isFinite(pivot?.x) || !Number.isFinite(pivot?.y)
      || pivot.x < 0 || pivot.x > 1 || pivot.y < 0 || pivot.y > 1) errors.push(`${key}: pivot must lie within the source frame`);
    const sourceHeight = entry.sourceSize?.h ?? rect?.h;
    if (!Number.isFinite(entry.bodyHeight) || entry.bodyHeight <= 0 || entry.bodyHeight > sourceHeight) {
      errors.push(`${key}: bodyHeight must fit the source frame`);
    }
    if (entry.rotated === true) errors.push(`${key}: rotated crops are not supported`);
  }
  if (page === 'march') for (const identity of GETTYSBURG_INFANTRY_IDENTITIES) {
    for (let direction = 0; direction < GETTYSBURG_INFANTRY_DIRECTIONS.length; direction++) {
      const first = frames[`${identity}-march-${direction}-0`]?.frame;
      const second = frames[`${identity}-march-${direction}-1`]?.frame;
      if (first && second && ['x', 'y', 'w', 'h'].every(field => first[field] === second[field])) {
        errors.push(`${identity}-march-${direction}: opposing contacts reuse the same crop`);
      }
    }
  }
  return errors;
}
