export function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function deterministicUnitValue(formationId, index, salt = 0) {
  let value = hashString(`${formationId}:${index}:${salt}`);
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 0xffffffff;
}

export function generateFormationSlots(formationId, mode, count, frontage, verticalCompression = 0.72) {
  if (count <= 0) return [];
  const rows = mode === 'line'
    ? (count <= 20 ? 2 : 3)
    : mode === 'column'
      ? Math.ceil(count / 4)
      : mode === 'skirmish'
        ? 2
        : Math.ceil(Math.sqrt(count / 1.25));
  const columns = mode === 'line'
    ? Math.ceil(count / rows)
    : mode === 'column'
      ? 4
      : mode === 'skirmish'
        ? Math.ceil(count / 2)
        : Math.ceil(count / rows);
  const spacingScale = mode === 'skirmish' ? 1.45 : 1;
  const lateralSpacing = Math.min(24, Math.max(11, frontage / Math.max(columns, 1) * 0.86)) * spacingScale;
  const depthSpacing = (mode === 'column' ? 18 : mode === 'skirmish' ? 22 : mode === 'deep' ? 15 : 13) * verticalCompression;

  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const rowCount = Math.min(columns, count - row * columns);
    const irregularity = deterministicUnitValue(formationId, index, 7) - 0.5;
    return {
      index,
      row,
      column,
      lateral: (column - (rowCount - 1) / 2) * lateralSpacing + irregularity * 2.5,
      forward: ((rows - 1) / 2 - row) * depthSpacing + irregularity,
      frontRank: row === 0,
      variant: Math.floor(deterministicUnitValue(formationId, index, 19) * 4),
    };
  });
}

export function projectFormationSlot(origin, facing, slot) {
  const right = facing + Math.PI / 2;
  return {
    x: origin.x + Math.cos(right) * slot.lateral + Math.cos(facing) * slot.forward,
    y: origin.y + Math.sin(right) * slot.lateral + Math.sin(facing) * slot.forward,
  };
}

export function visibleFigureCount(strength, initialStrength, capacity) {
  if (initialStrength <= 0 || strength <= 0) return 0;
  return Math.max(1, Math.min(capacity, Math.round(capacity * strength / initialStrength)));
}

function requireFinite(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
}

function requireNonnegative(value, name) {
  requireFinite(value, name);
  if (value < 0) throw new RangeError(`${name} must be nonnegative`);
}

// Generate slots with verticalCompression=1: rotate first, then apply the
// same perspective scale to both axes and compress screen Y around the anchor.
export function projectedFormationSlot(origin, facing, slot, scale = 1, compression = 0.72) {
  requireFinite(origin.x, 'origin.x');
  requireFinite(origin.y, 'origin.y');
  requireFinite(facing, 'facing');
  requireFinite(slot.lateral, 'slot.lateral');
  requireFinite(slot.forward, 'slot.forward');
  requireNonnegative(scale, 'scale');
  requireNonnegative(compression, 'compression');
  const offset = projectFormationSlot({ x: 0, y: 0 }, facing, slot);
  return { x: origin.x + offset.x * scale, y: origin.y + offset.y * scale * compression };
}

const FULL_TURN = Math.PI * 2;

// Screen coordinates: E, SE, S, SW, W, NW, N, NE. Half-sector ties go clockwise.
export function directionIndex(facing) {
  requireFinite(facing, 'facing');
  const sector = (facing % FULL_TURN) / (Math.PI / 4);
  const halfSector = Math.round(sector - 0.5) + 0.5;
  // PI-based half-sector inputs can land a few ULPs below the tie.
  const snapped = Math.abs(sector - halfSector) <= Number.EPSILON * 8 ? halfSector : sector;
  const index = Math.floor(snapped + 0.5);
  return ((index % 8) + 8) % 8;
}

// Return a continuous, unwrapped angle; exact half-turn ties go clockwise.
export function approachAngle(current, target, maxDelta) {
  requireFinite(current, 'current');
  requireFinite(target, 'target');
  requireNonnegative(maxDelta, 'maxDelta');
  let delta = ((target % FULL_TURN) - (current % FULL_TURN)) % FULL_TURN;
  if (delta > Math.PI) delta -= FULL_TURN;
  if (delta <= -Math.PI) delta += FULL_TURN;
  return current + Math.max(-maxDelta, Math.min(maxDelta, delta));
}

// Convex hull of ground anchors, padded by screen-space axis-aligned squares.
// Vertices run clockwise in screen coordinates, without repeating the first.
// With zero padding, a single/collinear input returns one/two endpoints.
export function formationFootprint(points, padding = 10) {
  requireNonnegative(padding, 'padding');
  const expanded = points.flatMap((point) => {
    requireFinite(point.x, 'point.x');
    requireFinite(point.y, 'point.y');
    return padding === 0 ? [{ x: point.x, y: point.y }] : [
      { x: point.x - padding, y: point.y - padding },
      { x: point.x + padding, y: point.y - padding },
      { x: point.x + padding, y: point.y + padding },
      { x: point.x - padding, y: point.y + padding },
    ];
  }).sort((a, b) => a.x - b.x || a.y - b.y);
  const unique = expanded.filter((point, index) => index === 0 || point.x !== expanded[index - 1].x || point.y !== expanded[index - 1].y);
  if (unique.length <= 2) return unique;
  const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const half = (ordered) => {
    const hull = [];
    for (const point of ordered) {
      while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) hull.pop();
      hull.push(point);
    }
    return hull;
  };
  const lower = half(unique);
  const upper = half([...unique].reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

// Returns positions into the supplied array, not slot.index values. Keeping
// one capacity-sized slot array lets the caller remove a prefix, retain gaps,
// then explicitly regenerate/repack once its casualty timer expires.
export function casualtyOrder(slots, formationId) {
  return slots.map((slot, position) => ({
    position,
    front: slot.frontRank === true || slot.row === 0,
    row: Number.isFinite(slot.row) ? slot.row : 0,
    priority: deterministicUnitValue(formationId, slot.index ?? position, 97),
  })).sort((a, b) => Number(b.front) - Number(a.front) || a.row - b.row || a.priority - b.priority || a.position - b.position)
    .map((entry) => entry.position);
}
