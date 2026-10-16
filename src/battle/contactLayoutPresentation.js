import { closeCombatPairs } from './closeCombat.js';

// Optional renderer state only. Neither displaced points nor this sidecar are
// inputs to combat, raw formation visuals, standards, or volley sampling.
export const CONTACT_LAYOUT_VERSION = 1;
export const CONTACT_LAYOUT_ID = 'gettysburg-contact-layout-v33';
export const CONTACT_LAYOUT_MAX_OFFSET = 3;
export const CONTACT_LAYOUT_SPEED = 6;
const MAX_FORMATIONS = 32, MAX_CAPACITY = 32, MAX_FIGURES = 700;
const zero = () => ({ x: 0, y: 0 });
// Computed unit vectors may overshoot the exact cap by one floating-point
// rounding step. Keep our own serialized producer output strictly inside the
// validator's cap; this does not relax acceptance of externally saved data.
const copyOffset = value => {
  const length = Math.hypot(value.x, value.y);
  const factor = length > CONTACT_LAYOUT_MAX_OFFSET
    ? CONTACT_LAYOUT_MAX_OFFSET * (1 - 4 * Number.EPSILON) / length : 1;
  const x = value.x * factor, y = value.y * factor;
  return { x: x === 0 ? 0 : x, y: y === 0 ? 0 : y };
};
const finite = value => Number.isFinite(value) && Math.abs(value) <= 1e7;
const timeValue = value => finite(value) && value >= 0;
const plain = value => value !== null && typeof value === 'object'
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const keys = (value, names) => plain(value) && Object.keys(value).length === names.length
  && names.every(name => Object.hasOwn(value, name) && Object.hasOwn(Object.getOwnPropertyDescriptor(value, name), 'value'));
const array = (value, max) => Array.isArray(value) && value.length <= max
  && Object.keys(value).length === value.length
  && Object.keys(value).every((name, i) => name === String(i) && Object.hasOwn(Object.getOwnPropertyDescriptor(value, name), 'value'));
const boundedOffset = value => keys(value, ['x', 'y']) && finite(value.x) && finite(value.y)
  && Math.hypot(value.x, value.y) <= CONTACT_LAYOUT_MAX_OFFSET;
const identityKeys = ['id', 'side', 'type', 'strength', 'initialStrength', 'x', 'y', 'facing', 'frontage', 'formationMode', 'status', 'active', 'footprint'];
const fallKeys = ['x', 'y', 'time', 'facing', 'scale'];

function identity(formation) {
  const result = Object.fromEntries(identityKeys.filter(key => key !== 'footprint').map(key => [key, formation[key]]));
  result.footprint = formation.footprint == null ? null : { width: formation.footprint.width, depth: formation.footprint.depth };
  return result;
}

function sameIdentity(saved, formation) {
  if (!keys(saved, identityKeys)) return false;
  const current = identity(formation);
  return identityKeys.every(key => key === 'footprint'
    ? current.footprint === null ? saved.footprint === null
      : keys(saved.footprint, ['width', 'depth']) && saved.footprint.width === current.footprint.width && saved.footprint.depth === current.footprint.depth
    : saved[key] === current[key]);
}

const copyFall = fall => fall === null ? null : Object.fromEntries(fallKeys.map(key => [key, fall[key]]));
function sameFall(saved, raw, time) {
  return raw === null ? saved === null : keys(saved, fallKeys)
    && fallKeys.every(key => finite(saved[key]) && saved[key] === raw[key])
    && saved.time >= 0 && saved.time <= time && saved.scale >= 0;
}

function validSample(sample) {
  const state = sample?.state;
  return plain(state) && Number.isInteger(state.capacity) && state.capacity >= 1 && state.capacity <= MAX_CAPACITY
    && Array.isArray(state.figures) && state.figures.length === state.capacity
    && sample.formation !== null && typeof sample.formation === 'object'
    && sample.visual && Array.isArray(sample.visual.figures);
}

// Gettysburg's physical-footprint branch uses projectedFormationSlot(...,1,1),
// unlike the legacy default .72 screen-Y compression. Invert those actual feet.
function feasibleBox(sample) {
  if (!validSample(sample)) return null;
  const f = sample.formation, facing = sample.visual.facing;
  if (![f.x, f.y, facing, f.footprint?.width, f.footprint?.depth].every(finite)
    || !(f.footprint.width > 0 && f.footprint.depth > 0)) return null;
  const c = Math.cos(facing), s = Math.sin(facing);
  let lateralMin = -Infinity, lateralMax = Infinity, forwardMin = -Infinity, forwardMax = Infinity, count = 0;
  const byId = new Map(sample.visual.figures.map(figure => [figure.id, figure]));
  for (const raw of sample.state.figures) {
    if (!raw.alive) continue;
    const foot = byId.get(raw.id);
    if (!foot?.visible || foot.fallen || ![foot.x, foot.y].every(finite)) return null;
    const x = foot.x - f.x, y = foot.y - f.y;
    const lateral = -s * x + c * y, forward = c * x + s * y;
    const a = f.footprint.width / 2, b = f.footprint.depth / 2;
    // Outside raw feet are not repaired by the optional presentation layer.
    if (lateral < -a || lateral > a || forward < -b || forward > b) return null;
    lateralMin = Math.max(lateralMin, -a - lateral); lateralMax = Math.min(lateralMax, a - lateral);
    forwardMin = Math.max(forwardMin, -b - forward); forwardMax = Math.min(forwardMax, b - forward);
    count++;
  }
  return count ? { c, s, lateralMin, lateralMax, forwardMin, forwardMax } : null;
}

function scalarLimit(box, vector, maximum) {
  if (!box) return 0;
  const lateral = -box.s * vector.x + box.c * vector.y;
  const forward = box.c * vector.x + box.s * vector.y;
  let limit = maximum;
  for (const [component, lo, hi] of [[lateral, box.lateralMin, box.lateralMax], [forward, box.forwardMin, box.forwardMax]]) {
    if (component > 0) limit = Math.min(limit, hi / component);
    else if (component < 0) limit = Math.min(limit, lo / component);
  }
  return Math.max(0, limit);
}

function clipOffset(box, offset) {
  const length = Math.hypot(offset.x, offset.y);
  if (!box || !finite(length)) return zero();
  if (!length) return zero();
  const factor = scalarLimit(box, offset, Math.min(1, CONTACT_LAYOUT_MAX_OFFSET / length));
  return copyOffset({ x: offset.x * factor, y: offset.y * factor });
}

function eligible(formation) {
  return formation?.active === true && formation.type === 'infantry' && formation.strength > 0
    && !['routing', 'broken', 'surrendered'].includes(formation.status)
    && !['routing', 'broken'].includes(formation.presentationStatus)
    && !['withdraw', 'fallback', 'rally'].includes(formation.order);
}

function volleyUnsafe(formation, sample, time) {
  const recent = Number.isFinite(formation.lastVolleyAt) && time - formation.lastVolleyAt >= 0 && time - formation.lastVolleyAt < 1.25;
  return recent || Boolean(Array.isArray(sample?.visual?.figures) && sample.visual.figures.some(figure => figure.visible && !figure.fallen && figure.action === 'fire'));
}

function approach(current, target, distance) {
  const dx = target.x - current.x, dy = target.y - current.y, length = Math.hypot(dx, dy);
  if (!length || length <= distance) return { ...target };
  return { x: current.x + dx / length * distance, y: current.y + dy / length * distance };
}

export class ContactLayoutPresentation {
  constructor() {
    this.formations = new Map();
  }

  // Call before any raw pre-sample: restoreFrame proves the base parser really
  // accepted each bound visual. Malformed optional data leaves the base intact.
  restore(presentation, formations, views, time) {
    this.formations.clear();
    try {
      const saved = plain(presentation) ? Object.getOwnPropertyDescriptor(presentation, 'contactLayout')?.value : undefined;
      if (!keys(saved, ['version', 'layoutId', 'time', 'formations']) || saved.version !== CONTACT_LAYOUT_VERSION
        || saved.layoutId !== CONTACT_LAYOUT_ID || saved.time !== time || presentation.time !== time || !timeValue(time)
        || !array(saved.formations, MAX_FORMATIONS) || !array(presentation.formations, MAX_FORMATIONS)
        || saved.formations.length !== presentation.formations.length || !Array.isArray(formations) || formations.length > MAX_FORMATIONS) return false;
      const current = new Map(formations.map(f => [f.id, f])), seen = new Set();
      const restored = new Map();
      let total = 0;
      for (const record of saved.formations) {
        if (!keys(record, ['id', 'capacity', 'formation', 'time', 'offset', 'figures']) || seen.has(record.id)
          || typeof record.id !== 'string' || record.id.length < 1 || record.id.length > 128
          || !Number.isInteger(record.capacity) || record.capacity < 1 || record.capacity > MAX_CAPACITY
          || !timeValue(record.time) || record.time > time || !boundedOffset(record.offset)
          || !array(record.figures, MAX_CAPACITY) || record.figures.length !== record.capacity) return false;
        seen.add(record.id); total += record.capacity;
        if (total > MAX_FIGURES) return false;
        const formation = current.get(record.id), visual = views.get(record.id)?.visual;
        const base = presentation.formations.find(item => item.id === record.id);
        if (!formation || !base || !visual || visual.restoreFrame !== true || visual.capacity !== record.capacity
          || base.capacity !== record.capacity || !sameIdentity(record.formation, formation) || !sameIdentity(base.formation, formation)
          || !Array.isArray(visual.figures) || visual.figures.length !== record.capacity || record.time !== time || visual.time !== time) return false;
        const figures = new Map();
        for (const figure of record.figures) {
          if (!keys(figure, ['id', 'alive', 'fallen', 'offset']) || !Number.isInteger(figure.id)
            || figure.id < 0 || figure.id >= record.capacity || figures.has(figure.id) || typeof figure.alive !== 'boolean'
            || !boundedOffset(figure.offset)) return false;
          const raw = visual.figures[figure.id];
          if (!raw || raw.id !== figure.id || raw.alive !== figure.alive || !sameFall(figure.fallen, raw.fallen, time)
            || (figure.alive && (figure.fallen !== null || figure.offset.x !== 0 || figure.offset.y !== 0))
            || (!figure.alive && figure.fallen === null && (figure.offset.x !== 0 || figure.offset.y !== 0))) return false;
          figures.set(figure.id, { alive: figure.alive, fallen: copyFall(figure.fallen), offset: copyOffset(figure.offset) });
        }
        restored.set(record.id, { capacity: record.capacity, time: record.time, offset: copyOffset(record.offset), figures });
      }
      this.formations = restored;
      return true;
    } catch {
      this.formations.clear();
      return false;
    }
  }

  // samples contains actual updateFormationVisual outputs for both sides.
  sample(engine, formations, samples, time, resolving = false) {
    if (!timeValue(time) || !Array.isArray(formations) || formations.length > MAX_FORMATIONS || !(samples instanceof Map)) return;
    if ([...samples.values()].reduce((sum, sample) => sum + (validSample(sample) ? sample.state.capacity : 0), 0) > MAX_FIGURES) {
      this.formations.clear();
      return;
    }
    const current = new Map(formations.map(f => [f.id, f]));
    const neighbors = new Map(), targets = new Map(), boxes = new Map(), unsafe = new Set();
    // Read the resolver's actual graph exactly once. Count every contact so an
    // artillery or otherwise ineligible extra opponent cannot be overlooked.
    const pairs = closeCombatPairs(engine);
    for (const [a, b] of pairs) {
      for (const [unit, foe] of [[a, b], [b, a]]) {
        if (!neighbors.has(unit.id)) neighbors.set(unit.id, new Set());
        neighbors.get(unit.id).add(foe.id);
      }
    }
    for (const formation of formations) {
      const sample = samples.get(formation.id);
      boxes.set(formation.id, feasibleBox(sample));
      targets.set(formation.id, zero());
      if (volleyUnsafe(formation, sample, time)) unsafe.add(formation.id);
    }
    const ownUnsafe = new Set(unsafe);
    for (const [aRaw, bRaw] of pairs) {
      if (ownUnsafe.has(aRaw.id) || ownUnsafe.has(bRaw.id)) { unsafe.add(aRaw.id); unsafe.add(bRaw.id); }
    }
    for (const [aRaw, bRaw] of pairs) {
      const a = current.get(aRaw.id), b = current.get(bRaw.id);
      if (!a || !b) continue;
      if (resolving || !eligible(a) || !eligible(b) || a.side === b.side
        || a.inMelee !== true || b.inMelee !== true || a.meleeWith !== b.id || b.meleeWith !== a.id
        || neighbors.get(a.id)?.size !== 1 || neighbors.get(b.id)?.size !== 1 || unsafe.has(a.id) || unsafe.has(b.id)
        || ![a.x, a.y, b.x, b.y].every(finite)) continue;
      const length = Math.hypot(a.x - b.x, a.y - b.y);
      if (!(length > 0)) continue;
      const away = { x: (a.x - b.x) / length, y: (a.y - b.y) / length }, opposite = { x: -away.x, y: -away.y };
      const retreat = Math.min(CONTACT_LAYOUT_MAX_OFFSET, scalarLimit(boxes.get(a.id), away, CONTACT_LAYOUT_MAX_OFFSET), scalarLimit(boxes.get(b.id), opposite, CONTACT_LAYOUT_MAX_OFFSET));
      targets.set(a.id, { x: away.x * retreat, y: away.y * retreat });
      targets.set(b.id, { x: opposite.x * retreat, y: opposite.y * retreat });
    }
    let total = 0;
    for (const formation of formations) {
      const sample = samples.get(formation.id);
      if (!validSample(sample) || (total += sample.state.capacity) > MAX_FIGURES) continue;
      const raw = sample.state;
      let state = this.formations.get(formation.id);
      if (!state || state.capacity !== raw.capacity || state.time > time) {
        state = { capacity: raw.capacity, time, offset: zero(), figures: new Map() };
        this.formations.set(formation.id, state);
      }
      // Handoff uses the PREVIOUS sampled common live vector, before today's
      // release, changed contact direction, or volley safety override.
      for (const figure of raw.figures) {
        const previous = state.figures.get(figure.id);
        if (figure.alive) {
          if (!previous || previous.alive) state.figures.set(figure.id, { alive: true, fallen: null, offset: zero() });
        } else if (figure.fallen !== null) {
          if (!previous || previous.alive || !sameFall(previous.fallen, figure.fallen, time)) {
            state.figures.set(figure.id, { alive: false, fallen: copyFall(figure.fallen), offset: previous?.alive ? { ...state.offset } : zero() });
          }
        } else state.figures.set(figure.id, { alive: false, fallen: null, offset: zero() });
      }
      // Inactive draw retains its old cached departing sprites. Do not move
      // their layout vector during a checkpoint-only raw sample.
      if (formation.active) {
        state.offset = unsafe.has(formation.id) ? zero()
          : clipOffset(boxes.get(formation.id), approach(state.offset, targets.get(formation.id), CONTACT_LAYOUT_SPEED * Math.max(0, time - state.time)));
      }
      state.time = time;
    }
    for (const id of this.formations.keys()) if (!current.has(id)) this.formations.delete(id);
  }

  groundPoint(formationId, figure) {
    const state = this.formations.get(formationId), history = state?.figures.get(figure.id);
    const offset = figure.fallen ? history && !history.alive && history.fallen
      && fallKeys.every(key => history.fallen[key] === figure[key]) ? history.offset : null
      : history?.alive ? state.offset : null;
    return { x: figure.x + (offset?.x || 0), y: figure.y + (offset?.y || 0) };
  }

  checkpoint(presentation, formations, views, time) {
    if (!presentation || presentation.time !== time || !Array.isArray(presentation.formations)
      || presentation.formations.length > MAX_FORMATIONS || !timeValue(time)) return null;
    const current = new Map(formations.map(f => [f.id, f])), records = [];
    let total = 0;
    for (const base of presentation.formations) {
      const formation = current.get(base.id), raw = views.get(base.id)?.visual, state = this.formations.get(base.id);
      if (!formation || !raw || !state || state.capacity !== raw.capacity || base.capacity !== raw.capacity
        || !sameIdentity(base.formation, formation) || (total += raw.capacity) > MAX_FIGURES) return null;
      const figures = raw.figures.map(figure => {
        const history = state.figures.get(figure.id);
        const offset = !figure.alive && figure.fallen !== null && history && !history.alive
          && sameFall(history.fallen, figure.fallen, time) ? history.offset : zero();
        return { id: figure.id, alive: figure.alive, fallen: copyFall(figure.fallen), offset: copyOffset(offset) };
      });
      records.push({ id: base.id, capacity: raw.capacity, formation: identity(formation), time: state.time, offset: copyOffset(state.offset), figures });
    }
    return { version: CONTACT_LAYOUT_VERSION, layoutId: CONTACT_LAYOUT_ID, time, formations: records };
  }
}
