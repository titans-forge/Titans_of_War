// Deterministic Gettysburg withdrawal pilot. Geometry is independent of UI and
// simulation mutation; the caller owns version gates, turning and retirement.
import { landmarkField, landmarkMoveClear, formationLandmarkBlocker, landmarkBounds, landmarkClearance } from './historicalLandmarks.js';

export const RETREAT_CORRIDOR_LIMITS = Object.freeze({ nodes: 176, expanded: 128, neighbors: 16, segments: 4096, waypoints: 64, replanSuccess: 2, replanFailure: 4, sampleDistance: 2 });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const alive = unit => unit.active && unit.strength > 0 && !['broken', 'surrendered'].includes(unit.status);
const dot = (a, b) => a.x * b.x + a.y * b.y;
const segmentDistance = (point, from, to) => {
  const dx = to.x - from.x, dy = to.y - from.y;
  const t = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / Math.max(1e-12, dx * dx + dy * dy)));
  return Math.hypot(point.x - from.x - t * dx, point.y - from.y - t * dy);
};
const axes = facing => [{ x: Math.cos(facing), y: Math.sin(facing) }, { x: -Math.sin(facing), y: Math.cos(facing) }];
const support = (unit, axis, footprint) => {
  const [front, across] = axes(unit.facing), size = footprint(unit);
  return Math.abs(dot(front, axis)) * size.depth / 2 + Math.abs(dot(across, axis)) * size.width / 2;
};

// Exact SAT time interval for translation of two fixed-facing rectangles.
// This is additional to the historical radial clearance rule, never its replacement.
export function sweptFormationContact(from, to, other, footprint, padding = 4) {
  let enter = 0, exit = 1;
  const delta = { x: to.x - from.x, y: to.y - from.y };
  const separation = { x: from.x - other.x, y: from.y - other.y };
  for (const axis of [...axes(from.facing), ...axes(other.facing)]) {
    const extent = support(from, axis, footprint) + support(other, axis, footprint) + padding;
    const start = dot(separation, axis), velocity = dot(delta, axis);
    if (Math.abs(velocity) < 1e-12) { if (Math.abs(start) >= extent - 1e-8) return null; continue; }
    const a = (-extent - start) / velocity, b = (extent - start) / velocity;
    enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b));
    if (enter >= exit - 1e-8) return null;
  }
  return { enter, exit };
}

function initialContactEscape(from, to, other, footprint, interval) {
  if (interval.enter > 1e-8 || distance(to, other) + 1e-8 < distance(from, other)) return false;
  // Existing melee may begin inside the padded footprints. Only translation
  // that opens an already-overlapping separating axis is permitted, never a
  // segment through the other formation or a stationary/contact-deepening step.
  const relative = { x: from.x - other.x, y: from.y - other.y };
  const next = { x: to.x - other.x, y: to.y - other.y };
  return [...axes(from.facing), ...axes(other.facing)].some(axis => {
    const before = dot(relative, axis), after = dot(next, axis);
    return Math.abs(after) > Math.abs(before) + 1e-8 && before * after >= 0;
  });
}

// Caller supplies gettysburgClearance/Footprint to avoid an import cycle. Each
// planning segment is sampled at <=2 field pixels using the same initial-gap
// floor as historical motion; every actual stride separately enforces that rule
// and exact swept rectangle/landmark checks at its actual current facing.
export function retreatSegmentBlocker(e, unit, destination, clearance, footprint) {
  const field = landmarkField(e);
  if (!landmarkMoveClear(field, unit, destination)) {
    const site = (field?.landmarks || []).find(landmark => !landmarkMoveClear({ landmarks: [landmark] }, unit, destination));
    return { kind: 'landmark', obstacle: site };
  }
  const others = e.state.filter(other => other.id !== unit.id && alive(other));
  const steps = Math.max(1, Math.ceil(distance(unit, destination) / RETREAT_CORRIDOR_LIMITS.sampleDistance));
  const point = { ...unit };
  const ownSize = footprint(unit), ownRadius = Math.hypot(ownSize.width, ownSize.depth) / 2;
  for (const other of others) {
    const size = footprint(other);
    // Radial support and the padded rectangles are both contained by this
    // capsule. Far-away formations need no point sampling or SAT arithmetic.
    if (segmentDistance(other, unit, destination) > Math.max(42, ownRadius + Math.hypot(size.width, size.depth) / 2 + 8)) continue;
    const contact = sweptFormationContact(unit, destination, other, footprint);
    if (contact && !initialContactEscape(unit, destination, other, footprint, contact)) return { kind: 'formation', obstacle: other };
    const initialGap = distance(unit, other);
    for (let index = 1; index <= steps; index++) {
      point.x = unit.x + (destination.x - unit.x) * index / steps;
      point.y = unit.y + (destination.y - unit.y) * index / steps;
      if (distance(point, other) < Math.min(clearance(point, other), initialGap - .001)) return { kind: 'formation', obstacle: other };
    }
  }
  return null;
}

// Check rotation throughout its small fixed-step arc. The extra rectangle
// padding covers the maximum corner travel between orientation samples.
export function retreatTurnClear(e, unit, facing, clearance, footprint) {
  const delta = Math.atan2(Math.sin(facing - unit.facing), Math.cos(facing - unit.facing));
  const parts = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 360)));
  const size = footprint(unit), radius = Math.hypot(size.width, size.depth) / 2;
  const padding = 4 + radius * Math.abs(delta) / parts / 2;
  for (let index = 1; index <= parts; index++) {
    const candidate = { ...unit, facing: unit.facing + delta * index / parts };
    for (const other of e.state) {
      if (!alive(other) || other.id === unit.id) continue;
      if (distance(unit, other) < clearance(candidate, other) - 1e-6 && clearance(candidate, other) > clearance(unit, other) + 1e-6) return false;
      const before = sweptFormationContact(unit, unit, other, footprint, 4);
      const after = sweptFormationContact(candidate, candidate, other, footprint, padding);
      if (!before && after) return false;
    }
  }
  return true;
}

export function findRetreatCorridor(e, unit, target, clearance, footprint) {
  const stats = { nodesCreated: 0, nodesExpanded: 0, segmentsChecked: 0, exhausted: false };
  const nodes = [], seen = new Set();
  const inBounds = point => point.x >= 15 && point.x <= e.world.width - 15 && point.y >= 15 && point.y <= e.world.height - 15;
  const add = (point, goal = false) => {
    const key = `${point.x.toFixed(4)},${point.y.toFixed(4)}`;
    if (nodes.length >= RETREAT_CORRIDOR_LIMITS.nodes || seen.has(key) || !inBounds(point)) return;
    if (formationLandmarkBlocker(landmarkField(e), unit, point)) return;
    if (goal && e.state.some(other => other.side !== unit.side && alive(other) && distance(other, point) < 80)) return;
    seen.add(key); nodes.push({ x: point.x, y: point.y, goal });
  };
  if (!inBounds(unit) || formationLandmarkBlocker(landmarkField(e), unit)) return { path: null, complete: false, ...stats };
  add(unit);
  // Same chosen exit, same original retirement envelope (<70 across/<20 deep).
  // An occupied exact gate center must not prohibit the rest of its legal lane.
  for (const offset of [0, 32, -32, 64, -64]) for (const dy of [0, -12, 12]) add({ x: target.x + offset, y: target.y + dy }, true);
  const goals = nodes.map((point, index) => point.goal ? index : -1).filter(index => index >= 0);
  stats.nodesCreated = nodes.length;
  if (!goals.length) return { path: null, complete: false, ...stats };
  const heuristic = point => Math.min(...goals.map(index => distance(point, nodes[index])));
  const ownSize = footprint(unit), ownRadius = Math.hypot(ownSize.width, ownSize.depth) / 2;
  const obstacles = e.state.filter(other => other.id !== unit.id && alive(other)).sort((a, b) => distance(unit, a) - distance(unit, b) || a.id.localeCompare(b.id));
  // Escape rays join the actual position to the graph without snapping onto a
  // blocked coarse-grid center. Graph detours may temporarily move laterally or
  // away from the gate; retirement progress remains measured by the old rules.
  for (const radius of [40, 80, 120]) for (let index = 0; index < 16; index++) {
    const angle = index * Math.PI / 8; add({ x: unit.x + Math.cos(angle) * radius, y: unit.y + Math.sin(angle) * radius });
  }
  for (const other of obstacles.slice(0, 10)) {
    const otherSize = footprint(other), radius = ownRadius + Math.hypot(otherSize.width, otherSize.depth) / 2 + 14;
    for (let index = 0; index < 8; index++) {
      const angle = index * Math.PI / 4; add({ x: other.x + Math.cos(angle) * radius, y: other.y + Math.sin(angle) * radius });
    }
  }
  for (const site of landmarkField(e)?.landmarks || []) {
    const bounds = landmarkBounds(site, landmarkClearance(unit) + 12);
    for (const x of [bounds.left, bounds.right]) for (const y of [bounds.top, bounds.bottom]) add({ x, y });
  }
  stats.nodesCreated = nodes.length;
  const open = [{ index: 0, cost: 0, priority: heuristic(unit) }], costs = new Map([[0, 0]]), previous = new Map(), closed = new Set();
  const edges = new Map();
  const edgeClear = (from, to) => {
    const key = `${from},${to}`;
    if (!edges.has(key)) { stats.segmentsChecked++; edges.set(key, !retreatSegmentBlocker(e, { ...unit, ...nodes[from] }, nodes[to], clearance, footprint)); }
    return edges.get(key);
  };
  let bestPartial = null;
  const reconstruct = end => {
    const path = []; let index = end;
    while (index !== 0) { path.unshift({ x: nodes[index].x, y: nodes[index].y }); index = previous.get(index); if (index === undefined || path.length > RETREAT_CORRIDOR_LIMITS.waypoints) return null; }
    return path;
  };
  while (open.length && stats.nodesExpanded < RETREAT_CORRIDOR_LIMITS.expanded && stats.segmentsChecked < RETREAT_CORRIDOR_LIMITS.segments) {
    open.sort((a, b) => a.priority - b.priority || a.cost - b.cost || a.index - b.index);
    const current = open.shift();
    if (closed.has(current.index)) continue;
    closed.add(current.index); stats.nodesExpanded++;
    if (nodes[current.index].goal) return { path: reconstruct(current.index), complete: true, ...stats };
    // A formation boxed beside an obstacle may need to leave that corner before
    // it can turn enough to traverse the rest of the exit corridor. Return only
    // a searched, collision-checked prefix that makes meaningful rear-lane
    // progress; the next route is planned at the actual new facing and position.
    if (current.index !== 0 && heuristic(nodes[current.index]) < heuristic(unit) - 24
      && (!bestPartial || heuristic(nodes[current.index]) < bestPartial.gap - 1e-8)) bestPartial = { index: current.index, gap: heuristic(nodes[current.index]) }; 
    const neighbors = nodes.map((point, index) => ({ index, gap: distance(nodes[current.index], point) }))
      .filter(node => node.index !== current.index && !closed.has(node.index))
      .sort((a, b) => a.gap - b.gap || a.index - b.index).slice(0, RETREAT_CORRIDOR_LIMITS.neighbors).map(node => node.index);
    for (const goal of goals) if (!closed.has(goal) && !neighbors.includes(goal)) neighbors.push(goal);
    for (const next of neighbors) {
      if (stats.segmentsChecked >= RETREAT_CORRIDOR_LIMITS.segments) break;
      if (!edgeClear(current.index, next)) continue;
      const cost = current.cost + distance(nodes[current.index], nodes[next]);
      if (cost >= (costs.get(next) ?? Infinity) - 1e-8) continue;
      costs.set(next, cost); previous.set(next, current.index); open.push({ index: next, cost, priority: cost + heuristic(nodes[next]) });
    }
  }
  stats.exhausted = Boolean(open.length); return { path: bestPartial ? reconstruct(bestPartial.index) : null, complete: false, ...stats };
}
