import { directionIndex, projectedFormationSlot } from './formationMath.js';
import { isVisuallyRouting } from './battleTactics.js';
import { updateFormationVisual } from './formationVisualState.js';
import { createFormationVisualCheckpoint } from './formationVisualCheckpoint.js';

// Drawing direction only. Canonical figures remain the authority for combat,
// positions, shots, effects and falls. No second slot or gait integrator.
export const LOCOMOTION_HEADING_ID = 'gettysburg-locomotion-heading-v40';
export const LOCOMOTION_MIN_TRAVEL = .015;
const MAX_FORMATIONS = 32, MAX_CAPACITY = 32, MAX_FIGURES = 700;
const finite = value => Number.isFinite(value) && Math.abs(value) <= 1e7;
const plain = value => value !== null && typeof value === 'object'
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const own = (value, key) => plain(value) ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined;
const keys = (value, names) => plain(value) && Reflect.ownKeys(value).length === names.length
  && names.every(key => Object.hasOwn(Object.getOwnPropertyDescriptor(value, key) || {}, 'value'));
const sector = value => value === null || Number.isInteger(value) && value >= 0 && value <= 7;

// Inspect descriptors before reading saved data. Reject cycles, sparse arrays,
// extra properties and accessors; neither getters nor display objects execute.
function savedData(value) {
  const seen = new Set(); let count = 0;
  function copy(item, depth) {
    if (++count > 100000 || depth > 16) throw new Error('Saved heading budget');
    if (item === null || typeof item === 'boolean') return item;
    if (typeof item === 'number' && finite(item)) return item;
    if (typeof item === 'string' && item.length <= 128) return item;
    if (typeof item !== 'object' || seen.has(item)) throw new Error('Saved heading data');
    seen.add(item);
    const array = Array.isArray(item);
    if (array ? Object.getPrototypeOf(item) !== Array.prototype : !plain(item)) throw new Error('Saved heading prototype');
    const names = Reflect.ownKeys(item);
    if (names.some(name => typeof name !== 'string')) throw new Error('Saved heading symbol');
    if (array) {
      const length = Object.getOwnPropertyDescriptor(item, 'length')?.value;
      if (!Number.isInteger(length) || length < 0 || length > 2000 || names.length !== length + 1) throw new Error('Saved heading array');
      const result = [];
      for (let i = 0; i < length; i++) {
        const descriptor = Object.getOwnPropertyDescriptor(item, String(i));
        if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) throw new Error('Saved heading entry');
        result.push(copy(descriptor.value, depth + 1));
      }
      return result;
    }
    if (names.length > 32) throw new Error('Saved heading fields');
    const result = {};
    for (const name of names) {
      const descriptor = Object.getOwnPropertyDescriptor(item, name);
      if (!name.length || name.length > 128 || ['__proto__', 'constructor', 'prototype'].includes(name)
        || !descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) throw new Error('Saved heading field');
      result[name] = copy(descriptor.value, depth + 1);
    }
    return result;
  }
  try { return copy(value, 0); } catch { return null; }
}

function sameData(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const names = Object.keys(a);
  return names.length === Object.keys(b).length && names.every(key => Object.hasOwn(b, key) && sameData(a[key], b[key]));
}

function facts(formation, time, { reducedMotion = false, resolving = false } = {}) {
  return { time, reducedMotion: Boolean(reducedMotion), resolving: Boolean(resolving),
    order: formation.order ?? null, status: formation.status ?? null,
    presentationStatus: formation.presentationStatus ?? null, active: formation.active,
    reload: formation.reload, lastVolleyAt: formation.lastVolleyAt,
    inMelee: Boolean(formation.inMelee), engagedWith: formation.engagedWith ?? null };
}

function eligible(formation, time, { resolving = false } = {}) {
  return !resolving && formation.type === 'infantry' && formation.active === true
    && formation.footprint && formation.order === 'hold' && formation.status === 'steady'
    && !isVisuallyRouting(formation) && !formation.engagedWith && !formation.inMelee
    && formation.reload === 0 && finite(formation.lastVolleyAt) && time - formation.lastVolleyAt >= 1.25;
}

function baseRecord(formation, state, time) {
  return createFormationVisualCheckpoint([formation], new Map([[formation.id, state]]), time)?.formations[0] ?? null;
}

function sameFormation(saved, formation) {
  return saved && Object.keys(saved).every(key => key === 'footprint'
    ? saved.footprint && formation.footprint && saved.footprint.width === formation.footprint.width
      && saved.footprint.depth === formation.footprint.depth : saved[key] === formation[key]);
}

/** Wrap exactly one raw update, taking previous physical anchors before mutation. */
export function sampleGettysburgLocomotion(state, previous, formation, time, scale, options = {}) {
  const oldTime = state.time, oldX = state.x, oldY = state.y, oldFacing = state.facing;
  const oldMode = state.mode, oldAssembling = state.assembling;
  const anchors = new Map(state.figures.filter(figure => figure.alive).map(figure => [figure.id,
    projectedFormationSlot({ x: oldX, y: oldY }, oldFacing, figure.slot, 1, 1)]));
  const visual = updateFormationVisual(state, formation, time, scale, options);
  const base = baseRecord(formation, state, time), current = facts(formation, time, options);
  if (!base) return { visual, heading: null };
  const headings = Array(state.capacity).fill(null);
  if (eligible(formation, time, options)) {
    if (time === oldTime && previous && sameData(previous.base, base) && sameData(previous.facts, current)) {
      headings.splice(0, headings.length, ...previous.headings);
    } else if (time > oldTime && Math.hypot(formation.x - oldX, formation.y - oldY) <= .001) {
      const turn = Math.abs(Math.atan2(Math.sin(state.facing - oldFacing), Math.cos(state.facing - oldFacing))) > .001;
      const assembling = oldAssembling || state.assembling || oldMode !== state.mode;
      if (turn || assembling) for (const figure of visual.figures) {
        const before = anchors.get(figure.id);
        if (!before || !figure.visible || figure.fallen || figure.action !== 'walk') continue;
        const dx = figure.x - before.x, dy = figure.y - before.y;
        if (Math.hypot(dx, dy) > LOCOMOTION_MIN_TRAVEL) headings[figure.id] = directionIndex(Math.atan2(dy, dx));
      }
    }
  }
  return { visual, heading: { id: formation.id, base, facts: current, headings } };
}

/** Pose selectors receive a copy; raw direction still owns volley geometry. */
export function gettysburgWalkingFigure(figure, heading, formation, time, options = {}) {
  const direction = heading?.headings[figure.id];
  if (!figure.visible || figure.fallen || figure.action !== 'walk' || !eligible(formation, time, options)
    || !heading || heading.id !== formation.id || !sameData(heading.facts, facts(formation, time, options))
    || !sameFormation(heading.base?.formation, formation)
    || direction === null || !sector(direction)) return figure;
  const saved = heading.base.state.figures[figure.id];
  if (!saved?.alive) return figure;
  const point = projectedFormationSlot(heading.base.state, heading.base.state.facing, saved.slot, 1, 1);
  if (point.x !== figure.x || point.y !== figure.y) return figure;
  return direction === figure.direction ? figure : { ...figure, direction };
}

export function createGettysburgLocomotionCheckpoint(presentation, formations, views, time, options = {}) {
  if (!presentation || presentation.version !== 1 || presentation.time !== time || !finite(time) || time < 0
    || !Array.isArray(formations) || formations.length > MAX_FORMATIONS || !(views instanceof Map)) return null;
  const records = []; let total = 0;
  for (const formation of formations) {
    const view = views.get(formation.id), heading = view?.locomotionHeading;
    if (!heading || !eligible(formation, time, options) || !heading.headings.some(value => value !== null)) continue;
    const base = presentation.formations.find(record => record.id === formation.id);
    if (!base || !sameData(base, heading.base) || !sameData(heading.facts, facts(formation, time, options))) continue;
    const record = savedData(heading);
    if (!validRecord(record) || (total += record.headings.length) > MAX_FIGURES) return null;
    records.push(record);
  }
  return { version: 1, continuityId: LOCOMOTION_HEADING_ID, scenarioId: 'gettysburg', time, formations: records };
}

function validRecord(record) {
  const n = record?.headings?.length;
  return keys(record, ['id', 'base', 'facts', 'headings']) && typeof record.id === 'string' && record.id.length > 0
    && record.id.length <= 128 && plain(record.base) && record.base.id === record.id
    && Number.isInteger(record.base.capacity) && record.base.capacity >= 1 && record.base.capacity <= MAX_CAPACITY
    && Array.isArray(record.headings) && n === record.base.capacity && record.headings.every(sector)
    && plain(record.facts) && finite(record.facts.time);
}

/** Require the accepted raw restore before any sampler consumes restoreFrame. */
export function restoreGettysburgLocomotionCheckpoint(presentation, formation, state, time, options = {}) {
  if (state.restoreFrame !== true || own(presentation, 'version') !== 1 || own(presentation, 'time') !== time
    || !eligible(formation, time, options)) return null;
  const checkpoint = savedData(own(presentation, 'locomotionHeading'));
  if (!keys(checkpoint, ['version', 'continuityId', 'scenarioId', 'time', 'formations']) || checkpoint.version !== 1
    || checkpoint.continuityId !== LOCOMOTION_HEADING_ID || checkpoint.scenarioId !== 'gettysburg'
    || checkpoint.time !== time || !finite(time) || time < 0 || !Array.isArray(checkpoint.formations)
    || checkpoint.formations.length > MAX_FORMATIONS) return null;
  const ids = new Set(); let total = 0, matching = null;
  for (const record of checkpoint.formations) {
    if (!validRecord(record) || ids.has(record.id) || (total += record.headings.length) > MAX_FIGURES) return null;
    ids.add(record.id);
    if (record.id === formation.id) matching = record;
  }
  if (!matching || !sameData(matching.base, baseRecord(formation, state, time))
    || !sameData(matching.facts, facts(formation, time, options))) return null;
  return matching;
}
