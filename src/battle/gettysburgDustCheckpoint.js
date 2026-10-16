import { FORMATION_VISUAL_CHECKPOINT_VERSION } from './formationVisualCheckpoint.js';

// Optional renderer state only. Preserve the existing updater's trail lifetime
// and emission clock without storing display objects or changing combat.
export const GETTYSBURG_DUST_CHECKPOINT_VERSION = 1;
export const GETTYSBURG_DUST_CONTINUITY_ID = 'gettysburg-dust-continuity-v36';
const MAX_FORMATIONS = 32, MAX_CAPACITY = 32, MAX_FIGURES = 700, MAX_PUFFS = 12;
const LIFETIME = 1.25;
const identityKeys = ['id', 'side', 'type', 'strength', 'initialStrength', 'x', 'y', 'facing', 'frontage', 'formationMode', 'status', 'active', 'footprint'];
const plain = value => value !== null && typeof value === 'object'
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const data = (value, key) => plain(value) ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined;
const keys = (value, names) => plain(value) && Reflect.ownKeys(value).length === names.length
  && names.every(name => Object.hasOwn(Object.getOwnPropertyDescriptor(value, name) || {}, 'value'));
const array = (value, max) => Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype
  && value.length <= max && Reflect.ownKeys(value).length === value.length + 1
  && Array.from({ length: value.length }, (_, i) => String(i)).every(name =>
    Object.hasOwn(Object.getOwnPropertyDescriptor(value, name) || {}, 'value'));
const finite = value => Number.isFinite(value) && Math.abs(value) <= 1e7;
const timeValue = value => finite(value) && value >= 0;
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 128;
const capacityValue = value => Number.isInteger(value) && value >= 1 && value <= MAX_CAPACITY;
const serialValue = value => Number.isInteger(value) && value >= 1 && value <= 1e9;

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
  return validIdentity(saved) && validIdentity(formation) && identityKeys.every(key => key === 'footprint'
    ? saved.footprint === null ? formation.footprint === null
      : formation.footprint !== null && saved.footprint.width === formation.footprint.width
        && saved.footprint.depth === formation.footprint.depth
    : saved[key] === formation[key]);
}
function currentIdentity(formation) {
  if (!plain(formation)) return null;
  const identity = Object.fromEntries(identityKeys.map(key => [key, key === 'footprint'
    ? formation.footprint == null ? null : { width: formation.footprint.width, depth: formation.footprint.depth }
    : formation[key]]));
  return validIdentity(identity) ? identity : null;
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
function motionOptions(options) {
  return keys(options, ['reducedMotion', 'resolving'])
    && typeof options.reducedMotion === 'boolean' && typeof options.resolving === 'boolean';
}
function compatible(visual, record, options) {
  const motion = data(visual, 'lastMotion');
  return plain(visual) && visual.capacity === record.capacity && visual.time === record.state.time
    && visual.x === record.formation.x && visual.y === record.formation.y
    && visual.mode === record.formation.formationMode
    && data(motion, 'reducedMotion') === options.reducedMotion
    && data(motion, 'resolving') === options.resolving;
}
function validDust(value, time) {
  if (!keys(value, ['x', 'y', 'time', 'emittedAt', 'serial', 'puffs'])
    || !finite(value.x) || !finite(value.y) || !timeValue(value.time)
    || value.time > time || time - value.time > LIFETIME
    || !(value.emittedAt === null || timeValue(value.emittedAt) && value.emittedAt <= value.time)
    || !(value.serial === null || serialValue(value.serial))
    || (value.emittedAt === null) !== (value.serial === null)
    || !array(value.puffs, MAX_PUFFS)) return false;
  let previous = null;
  for (const puff of value.puffs) {
    if (!keys(puff, ['x', 'y', 'time', 'seed']) || !finite(puff.x) || !finite(puff.y)
      || !timeValue(puff.time) || puff.time > value.time || value.time - puff.time >= LIFETIME
      || !serialValue(puff.seed) || previous && (puff.time <= previous.time || puff.seed !== previous.seed + 1)) return false;
    previous = puff;
  }
  return !previous || previous.time === value.emittedAt && previous.seed === value.serial;
}
const copyDust = value => ({ x: value.x, y: value.y, time: value.time,
  emittedAt: value.emittedAt, serial: value.serial,
  puffs: value.puffs.map(puff => ({ x: puff.x, y: puff.y, time: puff.time, seed: puff.seed })) });
function captureDust(value, time) {
  if (!plain(value)) return null;
  const names = Reflect.ownKeys(value);
  if (names.some(name => !['x', 'y', 'time', 'emittedAt', 'serial', 'puffs'].includes(name)
    || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, name) || {}, 'value'))) return null;
  const state = { x: data(value, 'x'), y: data(value, 'y'), time: data(value, 'time'),
    emittedAt: data(value, 'emittedAt') ?? null, serial: data(value, 'serial') ?? null,
    puffs: data(value, 'puffs') };
  return validDust(state, time) ? copyDust(state) : null;
}
function readDust(presentation, time, options) {
  const base = baseRecords(presentation, time), saved = data(presentation, 'travelDust');
  if (!base || !motionOptions(options) || !keys(saved, ['version', 'continuityId', 'time', 'reducedMotion', 'resolving', 'formations'])
    || saved.version !== GETTYSBURG_DUST_CHECKPOINT_VERSION || saved.continuityId !== GETTYSBURG_DUST_CONTINUITY_ID
    || saved.time !== time || saved.reducedMotion !== options.reducedMotion || saved.resolving !== options.resolving
    || !array(saved.formations, MAX_FORMATIONS) || saved.formations.length !== base.size) return null;
  const result = new Map();
  for (const record of saved.formations) {
    if (!keys(record, ['id', 'capacity', 'formation', 'dust']) || !text(record.id)
      || result.has(record.id) || !capacityValue(record.capacity)) return null;
    const original = base.get(record.id);
    if (!original || original.capacity !== record.capacity || !sameIdentity(record.formation, original.formation)
      || record.dust !== null && (!record.formation.active || options.reducedMotion || options.resolving
        || !validDust(record.dust, time))) return null;
    result.set(record.id, record);
  }
  return { base, records: result };
}

/** Never advance the trail or emit new particles while saving. */
export function createGettysburgDustCheckpoint(presentation, formations, views, time, options) {
  try {
    const base = baseRecords(presentation, time);
    if (!base || !motionOptions(options) || !Array.isArray(formations)
      || formations.length > MAX_FORMATIONS || !(views instanceof Map)) return null;
    const current = new Map();
    for (const formation of formations) {
      const identity = currentIdentity(formation);
      if (!identity || current.has(identity.id)) return null;
      current.set(identity.id, identity);
    }
    const records = [];
    for (const [id, record] of base) {
      const identity = current.get(id), view = views.get(id);
      if (!sameIdentity(record.formation, identity) || !compatible(view?.visual, record, options)) return null;
      const dust = identity.active && !options.reducedMotion && !options.resolving
        ? captureDust(view.dust, time) : null;
      records.push({ id, capacity: record.capacity, formation: identity, dust });
    }
    return { version: GETTYSBURG_DUST_CHECKPOINT_VERSION, continuityId: GETTYSBURG_DUST_CONTINUITY_ID,
      time, reducedMotion: options.reducedMotion, resolving: options.resolving, formations: records };
  } catch { return null; }
}

/** Immediately after the actual base parser, before its first sample. */
export function restoreGettysburgDustCheckpoint(presentation, formation, visual, time, options) {
  try {
    const parsed = readDust(presentation, time, options), record = parsed?.records.get(formation?.id);
    const original = parsed?.base.get(formation?.id), identity = currentIdentity(formation);
    if (!record || !original || !identity?.active || visual?.restoreFrame !== true
      || !sameIdentity(record.formation, identity) || !compatible(visual, original, options)
      || record.dust === null) return null;
    const state = copyDust(record.dust);
    if (state.emittedAt === null) delete state.emittedAt;
    if (state.serial === null) delete state.serial;
    return state;
  } catch { return null; }
}
