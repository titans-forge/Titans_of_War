import { FORMATION_VISUAL_CHECKPOINT_VERSION } from './formationVisualCheckpoint.js';

// Optional renderer metadata. A carrier is a raw figure identity, never a slot
// index, projected point, combat input, or claim that the art depicts a bearer.
export const GETTYSBURG_STANDARD_CHECKPOINT_VERSION = 1;
export const GETTYSBURG_STANDARD_CONTINUITY_ID = 'gettysburg-standard-continuity-v34';
const MAX_FORMATIONS = 32, MAX_CAPACITY = 32, MAX_FIGURES = 700;
const identityKeys = ['id', 'side', 'type', 'strength', 'initialStrength', 'x', 'y', 'facing', 'frontage', 'formationMode', 'status', 'active', 'footprint'];
const plain = value => value !== null && typeof value === 'object'
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const finite = value => Number.isFinite(value) && Math.abs(value) <= 1e7;
const timeValue = value => finite(value) && value >= 0;
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 128;
const capacityValue = value => Number.isInteger(value) && value >= 1 && value <= MAX_CAPACITY;
const data = (value, key) => plain(value) ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined;
const keys = (value, names) => plain(value) && Reflect.ownKeys(value).length === names.length
  && names.every(name => Object.hasOwn(Object.getOwnPropertyDescriptor(value, name) || {}, 'value'));
const array = (value, maximum) => Array.isArray(value) && value.length <= maximum
  && Reflect.ownKeys(value).length === value.length + 1
  && Array.from({ length: value.length }, (_, index) => String(index)).every(name =>
    Object.hasOwn(Object.getOwnPropertyDescriptor(value, name) || {}, 'value'));

function validIdentity(value) {
  return keys(value, identityKeys) && text(value.id) && ['union', 'confederate'].includes(value.side)
    && ['infantry', 'artillery'].includes(value.type)
    && ['strength', 'initialStrength', 'frontage'].every(key => timeValue(value[key]))
    && ['x', 'y', 'facing'].every(key => finite(value[key]))
    && ['line', 'column', 'deep', 'skirmish'].includes(value.formationMode)
    && text(value.status) && typeof value.active === 'boolean'
    && (value.footprint === null || keys(value.footprint, ['width', 'depth'])
      && timeValue(value.footprint.width) && timeValue(value.footprint.depth));
}

function sameIdentity(saved, formation) {
  if (!validIdentity(saved) || !formation) return false;
  return identityKeys.every(key => key === 'footprint'
    ? formation.footprint == null ? saved.footprint === null
      : saved.footprint !== null && saved.footprint.width === formation.footprint.width
        && saved.footprint.depth === formation.footprint.depth
    : saved[key] === formation[key]);
}

const copyIdentity = value => Object.fromEntries(identityKeys.map(key => [key,
  key === 'footprint' && value[key] !== null ? { width: value[key].width, depth: value[key].depth } : value[key]]));
const carrierAllowed = formation => formation.type === 'infantry' && formation.active === true;

function livingCarrier(state, anchorId, capacity) {
  if (!Number.isInteger(anchorId) || anchorId < 0 || anchorId >= capacity
    || data(state, 'capacity') !== capacity) return false;
  const figures = data(state, 'figures');
  if (!array(figures, MAX_CAPACITY) || figures.length !== capacity) return false;
  const figure = figures[anchorId];
  return data(figure, 'id') === anchorId && data(figure, 'alive') === true && data(figure, 'fallen') === null;
}

function baseRecords(presentation, time) {
  if (!plain(presentation) || data(presentation, 'version') !== FORMATION_VISUAL_CHECKPOINT_VERSION
    || data(presentation, 'time') !== time || !timeValue(time)) return null;
  const records = data(presentation, 'formations');
  if (!array(records, MAX_FORMATIONS)) return null;
  const result = new Map();
  let total = 0;
  for (const record of records) {
    if (!keys(record, ['id', 'capacity', 'formation', 'state']) || !text(record.id)
      || result.has(record.id) || !capacityValue(record.capacity) || !validIdentity(record.formation)
      || record.formation.id !== record.id || data(record.state, 'capacity') !== record.capacity
      || !timeValue(data(record.state, 'time')) || data(record.state, 'time') > time) return null;
    const figures = data(record.state, 'figures');
    if (!array(figures, MAX_CAPACITY) || figures.length !== record.capacity) return null;
    total += record.capacity;
    if (total > MAX_FIGURES) return null;
    result.set(record.id, record);
  }
  return result;
}

function readAnchors(presentation, time) {
  const base = baseRecords(presentation, time), saved = data(presentation, 'standardAnchors');
  if (!base || !keys(saved, ['version', 'continuityId', 'time', 'formations'])
    || saved.version !== GETTYSBURG_STANDARD_CHECKPOINT_VERSION
    || saved.continuityId !== GETTYSBURG_STANDARD_CONTINUITY_ID || saved.time !== time
    || !array(saved.formations, MAX_FORMATIONS) || saved.formations.length !== base.size) return null;
  const result = new Map();
  for (const record of saved.formations) {
    if (!keys(record, ['id', 'capacity', 'formation', 'anchorId']) || !text(record.id)
      || result.has(record.id) || !capacityValue(record.capacity)) return null;
    const original = base.get(record.id);
    if (!original || original.capacity !== record.capacity || !sameIdentity(record.formation, original.formation)
      || record.anchorId !== null && (!carrierAllowed(record.formation)
        || !livingCarrier(original.state, record.anchorId, record.capacity))) return null;
    result.set(record.id, record);
  }
  return { base, anchors: result };
}

/** Capture retained living IDs without moving flags or selecting new carriers. */
export function createGettysburgStandardAnchorCheckpoint(presentation, formations, views, time) {
  try {
    const base = baseRecords(presentation, time);
    if (!base || !Array.isArray(formations) || formations.length > MAX_FORMATIONS || !(views instanceof Map)) return null;
    const current = new Map();
    for (const formation of formations) {
      if (!formation || !text(formation.id) || current.has(formation.id)) return null;
      current.set(formation.id, formation);
    }
    const records = [];
    for (const [id, record] of base) {
      const formation = current.get(id), view = views.get(id), visual = view?.visual;
      if (!sameIdentity(record.formation, formation) || !visual || visual.capacity !== record.capacity
        || visual.time !== record.state.time) return null;
      const retained = view.standardAnchorId;
      const anchorId = carrierAllowed(formation) && livingCarrier(visual, retained, record.capacity)
        && livingCarrier(record.state, retained, record.capacity) ? retained : null;
      records.push({ id, capacity: record.capacity, formation: copyIdentity(record.formation), anchorId });
    }
    return { version: GETTYSBURG_STANDARD_CHECKPOINT_VERSION,
      continuityId: GETTYSBURG_STANDARD_CONTINUITY_ID, time, formations: records };
  } catch { return null; }
}

/** Called immediately after the actual base parser, before any raw sampling. */
export function restoreGettysburgStandardAnchorCheckpoint(presentation, formation, visual, time) {
  try {
    const parsed = readAnchors(presentation, time), record = parsed?.anchors.get(formation?.id);
    const original = parsed?.base.get(formation?.id);
    if (!record || !original || !carrierAllowed(formation) || visual?.restoreFrame !== true
      || visual.capacity !== record.capacity || visual.time !== original.state.time
      || !sameIdentity(record.formation, formation)) return null;
    return livingCarrier(visual, record.anchorId, record.capacity) ? record.anchorId : null;
  } catch { return null; }
}
