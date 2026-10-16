import { createFormationVisual } from './formationVisualState.js';
import { visibleFigureCount } from './formationMath.js';

// This optional checkpoint belongs to the renderer. It never enters combat
// state, and old engine checkpoints continue to use the existing initializer.
export const FORMATION_VISUAL_CHECKPOINT_VERSION = 1;
const MAX_FORMATIONS = 32;
const MAX_CAPACITY = 32;
const MAX_FIGURES = 700;
const MAX_NUMBER = 1e7;
const MODES = ['line', 'column', 'deep', 'skirmish'];
const plain = value => value !== null && typeof value === 'object'
  && [Object.prototype, null].includes(Object.getPrototypeOf(value))
  && !Object.hasOwn(value, '$fieldMap') && !Object.hasOwn(value, '$fieldSet');
const finite = value => Number.isFinite(value) && Math.abs(value) <= MAX_NUMBER;
const nonnegative = value => finite(value) && value >= 0;
const integer = (value, max) => Number.isInteger(value) && value >= 0 && value <= max;
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 128;

function formationIdentity(formation) {
  const { id, side, type, strength, initialStrength, x, y, facing, frontage, formationMode, status, active } = formation;
  if (!text(id) || !['union', 'confederate'].includes(side) || !['infantry', 'artillery'].includes(type)
    || ![strength, initialStrength, frontage].every(nonnegative) || ![x, y, facing].every(finite)
    || !MODES.includes(formationMode) || !text(status) || typeof active !== 'boolean') return null;
  let footprint = null;
  if (formation.footprint !== undefined && formation.footprint !== null) {
    if (!plain(formation.footprint) || !nonnegative(formation.footprint.width) || !nonnegative(formation.footprint.depth)) return null;
    footprint = { width: formation.footprint.width, depth: formation.footprint.depth };
  }
  return { id, side, type, strength, initialStrength, x, y, facing, frontage, formationMode, status, active, footprint };
}

function sameFormation(saved, formation) {
  const current = formationIdentity(formation);
  if (!plain(saved) || !current) return false;
  return Object.entries(current).every(([key, value]) => key === 'footprint'
    ? value === null ? saved[key] === null : plain(saved[key]) && value.width === saved[key].width && value.depth === saved[key].depth
    : saved[key] === value);
}

function readSlot(slot, capacity) {
  if (!plain(slot) || !['index', 'row', 'column'].every(key => integer(slot[key], capacity - 1))
    || ![slot.lateral, slot.forward].every(finite) || typeof slot.frontRank !== 'boolean' || !integer(slot.variant, 3)) return null;
  return { index: slot.index, row: slot.row, column: slot.column, lateral: slot.lateral,
    forward: slot.forward, frontRank: slot.frontRank, variant: slot.variant };
}

function readFigure(figure, id, capacity, time) {
  if (!plain(figure) || figure.id !== id || typeof figure.alive !== 'boolean'
    || !nonnegative(figure.stepDistance) || typeof figure.localMoving !== 'boolean') return null;
  const slot = readSlot(figure.slot, capacity);
  if (!slot) return null;
  let fallen = null;
  if (figure.fallen !== null) {
    const fall = figure.fallen;
    if (figure.alive || !plain(fall) || ![fall.x, fall.y, fall.facing].every(finite)
      || !nonnegative(fall.scale) || !nonnegative(fall.time) || fall.time > time) return null;
    fallen = { x: fall.x, y: fall.y, facing: fall.facing, scale: fall.scale, time: fall.time };
  }
  return { id, slot, alive: figure.alive, fallen, stepDistance: figure.stepDistance, localMoving: figure.localMoving };
}

function readState(value, capacity, formation, checkpointTime) {
  if (!plain(value) || value.capacity !== capacity || !integer(capacity, MAX_CAPACITY) || capacity < 1
    || !nonnegative(value.time) || value.time > checkpointTime || ![value.x, value.y, value.facing].every(finite)
    || ![value.distance, value.turnDistance, value.routingDistance].every(nonnegative)
    || typeof value.assembling !== 'boolean' || value.mode !== formation.formationMode
    || !nonnegative(value.lastContact) || value.lastContact > value.time
    || !(value.lastLoss === null || nonnegative(value.lastLoss) && value.lastLoss <= value.time)
    || !(value.lastStatus === null || text(value.lastStatus))
    || !plain(value.lastMotion) || !['moving', 'turning', 'reducedMotion', 'resolving'].every(key => typeof value.lastMotion[key] === 'boolean')
    || value.x !== formation.x || value.y !== formation.y
    || !Array.isArray(value.figures) || value.figures.length !== capacity) return null;
  const figures = value.figures.map((figure, id) => readFigure(figure, id, capacity, value.time));
  if (figures.some(figure => !figure) || figures.filter(figure => figure.alive).length
    !== visibleFigureCount(formation.strength, formation.initialStrength, capacity)) return null;
  return { capacity, time: value.time, x: value.x, y: value.y, facing: value.facing,
    distance: value.distance, turnDistance: value.turnDistance, routingDistance: value.routingDistance,
    assembling: value.assembling, mode: value.mode, lastContact: value.lastContact,
    lastLoss: value.lastLoss === null ? -Infinity : value.lastLoss,
    lastStatus: value.lastStatus === null ? undefined : value.lastStatus,
    lastMotion: { moving: value.lastMotion.moving, turning: value.lastMotion.turning,
      reducedMotion: value.lastMotion.reducedMotion, resolving: value.lastMotion.resolving }, restoreFrame: true, figures };
}

function writeState(state) {
  // Explicit fields prevent cached output, Phaser objects, and future display
  // properties from leaking into saves. null represents only the no-loss timer.
  return {
    capacity: state.capacity, time: state.time, x: state.x, y: state.y, facing: state.facing,
    distance: state.distance, turnDistance: state.turnDistance, routingDistance: state.routingDistance,
    assembling: state.assembling, mode: state.mode, lastContact: state.lastContact,
    lastLoss: state.lastLoss === -Infinity ? null : state.lastLoss, lastStatus: state.lastStatus ?? null,
    lastMotion: { moving: state.lastMotion?.moving ?? false, turning: state.lastMotion?.turning ?? false,
      reducedMotion: state.lastMotion?.reducedMotion ?? false, resolving: state.lastMotion?.resolving ?? false },
    figures: state.figures.map(figure => ({ id: figure.id,
      slot: { index: figure.slot.index, row: figure.slot.row, column: figure.slot.column,
        lateral: figure.slot.lateral, forward: figure.slot.forward, frontRank: figure.slot.frontRank, variant: figure.slot.variant },
      alive: figure.alive, fallen: figure.fallen === null ? null : {
        x: figure.fallen.x, y: figure.fallen.y, facing: figure.fallen.facing, scale: figure.fallen.scale, time: figure.fallen.time,
      }, stepDistance: figure.stepDistance ?? 0, localMoving: figure.localMoving ?? false })),
  };
}

/** Capture latest sampled visuals. visualStates is Map<formationId, visual>. */
export function createFormationVisualCheckpoint(formations, visualStates, time) {
  if (!Array.isArray(formations) || formations.length > MAX_FORMATIONS || !(visualStates instanceof Map) || !nonnegative(time)) return null;
  const records = [];
  const ids = new Set();
  let figures = 0;
  for (const formation of formations) {
    if (!plain(formation)) continue;
    const identity = formationIdentity(formation);
    const visual = visualStates.get(formation.id);
    if (!identity || !plain(visual) || !Array.isArray(visual.figures)) continue;
    let saved;
    try { saved = writeState(visual); } catch { continue; }
    if (!readState(saved, visual.capacity, formation, time)) continue;
    if (ids.has(identity.id)) return null;
    ids.add(identity.id);
    figures += visual.capacity;
    if (figures > MAX_FIGURES) return null;
    records.push({ id: identity.id, capacity: visual.capacity, formation: identity, state: saved });
  }
  return { version: FORMATION_VISUAL_CHECKPOINT_VERSION, time, formations: records };
}

/** Invalid/missing optional presentation data cannot invalidate a combat save. */
export function restoreFormationVisualFromCheckpoint(formation, capacity, time, checkpoint) {
  const fallback = () => createFormationVisual(formation, capacity, time);
  if (!plain(checkpoint) || checkpoint.version !== FORMATION_VISUAL_CHECKPOINT_VERSION
    || checkpoint.time !== time || !nonnegative(time) || !Array.isArray(checkpoint.formations)
    || checkpoint.formations.length > MAX_FORMATIONS) return fallback();
  const ids = new Set();
  let figures = 0;
  for (const record of checkpoint.formations) {
    if (!plain(record) || !text(record.id) || ids.has(record.id)
      || !integer(record.capacity, MAX_CAPACITY) || record.capacity < 1) return fallback();
    ids.add(record.id);
    figures += record.capacity;
    if (figures > MAX_FIGURES) return fallback();
  }
  const record = checkpoint.formations.find(value => value.id === formation.id);
  if (!record || record.capacity !== capacity || !sameFormation(record.formation, formation)) return fallback();
  return readState(record.state, capacity, formation, time) || fallback();
}
