import { landmarksFor, landmarkLineClear, landmarkField, formationLandmarkBlocker, landmarkMoveClear, landmarkDestinationError, clearLandmarkTarget } from './historicalLandmarks.js';
import { objectiveOrganized, objectiveControl, recordObjectiveProgress } from './objectiveControl.js';
import { closeCombatPairs, resolveContactCombat, closeCombatDistance } from './closeCombat.js';
import { angularDistance, bearingTo, inFireArc, turnToward } from './battleTactics.js';
import { findRetreatCorridor, retreatSegmentBlocker, retreatTurnClear, RETREAT_CORRIDOR_LIMITS } from './retreatCorridors.js';

// Abstract field coordinates and compressed field minutes, not a historical casualty model.
export const GETTYSBURG_RULES = Object.freeze({ step: 0.05, duration: 240, holdRequired: 18, rallyRequired: 10, limberTime: 5, unlimberTime: 4, spacing: 42, retreatDistance: 220, retreatRearProgress: 180, reserveCommitment: 8 });
export const RIDGE_SECTORS = Object.freeze([
  { id: 'left', name: 'Southern ridge', x: 470, y: 330, width: 250, height: 150 },
  { id: 'center', name: 'Cemetery Ridge', x: 790, y: 330, width: 250, height: 150 },
  { id: 'angle', name: 'The Angle', x: 1080, y: 345, width: 250, height: 150 },
]);
const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const living = u => u.active && u.strength > 0 && !['broken', 'surrendered'].includes(u.status);
export const gettysburgOrganized = objectiveOrganized;
const inside = (u, s) => Math.abs(u.x - s.x) <= s.width / 2 && Math.abs(u.y - s.y) <= s.height / 2;
const enemies = (e, u) => e.state.filter(v => v.side !== u.side && living(v));
const threats = (e, u) => enemies(e, u).filter(v => v.status !== 'routing' && v.order !== 'withdraw' && !v.gunsAbandoned);
const nearest = (e, u) => threats(e, u).sort((a, b) => dist(u, a) - dist(u, b))[0];
const friend = (e, u, radius = 240) => e.state.some(v => v.id !== u.id && v.side === u.side && gettysburgOrganized(v) && dist(u, v) <= radius);
const rearSign = (u, e) => e?.fieldBattle ? ((e.config.retreatEdges?.[u.side] || (u.side === 'union' ? 'top' : 'bottom')) === 'top' ? -1 : 1) : u.side === 'union' ? -1 : 1;
const sectorsFor = e => e.fieldBattle?.sectors || RIDGE_SECTORS;
const retreatCorridorPilot = e => e.battleRulesVersion >= 18 && e.scenarioId === 'gettysburg';
const fieldEvent = (e, u, message) => { e.events.push({ time: e.time, type: 'command', message: `${u ? `${u.name}: ` : ''}${message}` }); if (e.events.length > 100) e.events.splice(1, 1); };

export function initializeGettysburg(e) {
  e.gettysburg = { version: 3, ...(e.battleRulesVersion >= 10 ? { landmarks: landmarksFor(e.scenarioId, e.battleRulesVersion) } : {}), held: 0, holdRequired: GETTYSBURG_RULES.holdRequired, sectors: RIDGE_SECTORS.map(s => ({ ...s, control: 'union' })), reserveIntent: 'Holding behind the ridge', reserveCommitted: false, nextAi: 0, accumulator: 0, escaped: 0, surrendered: 0, abandonedGuns: 0 };
  initializeTacticalFormations(e);
  // The battery belongs on the ridge, behind the same geometric wall as the infantry.
  const battery = e.state.find(u => u.id === 'cushing-battery');
  if (battery) { battery.y = 355; battery.home.y = 355; battery.target.y = 355; }
  e.events = e.events.filter(v => v.type !== 'objective');
  fieldEvent(e, null, e.choiceId === 'option_a'
    ? 'Assault: secure two marked ridge sectors with supported infantry and hold them uncontested for 18 field minutes. Advance establishes a firing line; Assault commits to the ridge.'
    : 'Withdrawal: bring at least 70% of the starting force through the marked rear exits. Use Fallback and supporting fire before Withdraw.');
}

export function initializeTacticalFormations(e) {
  for (const u of e.state) Object.assign(u, {
    participated: u.active, suppression: 0, condition: 'steady', pressureReason: 'No immediate pressure',
    safeTime: 0, blockedTime: 0, commandDelay: 0, pendingCommand: null,
    home: { x: u.x, y: u.y }, directMove: false, withdrawalOrganized: false,
    ...(retreatCorridorPilot(e) ? { retreatRoute: null, retreatRouteKey: null, retreatReplanAt: 0 } : {}),
    peakSuppression: 0, lastIncomingAt: -100, incomingFireFrom: null, pinned: false,
    ...(u.type === 'artillery' ? { gunState: 'deployed', gunTimer: 0, gunsAbandoned: false } : {}),
  });

}

// Shared by the rules and visible overlay: decorative landscape features confer no cover.
export const GETTYSBURG_TERRAIN = Object.freeze({
  ridge: Object.freeze({ left: 320, right: 1220, top: 255, bottom: 410 }),
  wall: Object.freeze({ left: 960, right: 1205, top: 320, bottom: 380 }),
  road: Object.freeze({ top: 495, bottom: 545 }),
});
export function gettysburgTerrain(u, e = null) {
  if (e?.fieldBattle) return e.fieldTerrain(u);
  const within = r => u.y >= r.top && u.y <= r.bottom && u.x >= r.left && u.x <= r.right;
  const ridge = within(GETTYSBURG_TERRAIN.ridge), wall = within(GETTYSBURG_TERRAIN.wall);
  const road = u.y >= GETTYSBURG_TERRAIN.road.top && u.y <= GETTYSBURG_TERRAIN.road.bottom;
  return { name: wall ? 'Stone wall' : ridge ? 'Ridge' : road ? 'Road and fences' : 'Open field', defense: wall ? 1.38 : ridge ? 1.16 : 1, movement: road ? 0.72 : ridge ? 0.9 : 1 };
}

export const gettysburgRange = u => Math.min(u.visibilityLimit || Infinity, u.type === 'artillery' ? 485 : u.formationMode === 'skirmish' ? 275 : 235);
export function selectGettysburgTarget(e, u) {
  const targets = enemies(e, u).sort((a, b) => Number(a.status === 'routing' || a.order === 'withdraw') - Number(b.status === 'routing' || b.order === 'withdraw') || dist(u, a) - dist(u, b));
  const focused = targets.find(v => v.id === u.focusTargetId);
  if (focused) return focused;
  const activeThreats = targets.filter(v => v.status !== 'routing' && v.order !== 'withdraw' && !v.gunsAbandoned);
  const visible = activeThreats.filter(v => gettysburgLineOfFire(e, u, v));
  const reachable = visible.filter(v => dist(u, v) <= gettysburgRange(u));
  return reachable.find(v => inFireArc(u, v)) || reachable[0] || visible[0] || activeThreats[0];
}
export function safeToRallyGettysburg(e, u) {
  return enemies(e, u).every(v => dist(u, v) > 285 &&
    !(v.ammunition > 0 && v.status !== 'routing' && !v.gunsAbandoned &&
      (v.type !== 'artillery' || v.gunState === 'deployed') &&
      dist(u, v) <= gettysburgRange(v) && gettysburgLineOfFire(e, v, u)));
}
export function gettysburgFireStatus(e, u) {
  if (!living(u)) return u.withdrawn ? 'Off the field' : 'Not combat effective';
  if (u.inMelee) return ['withdraw', 'fallback'].includes(u.order) ? 'Breaking contact — close combat continues until clear' : 'Close combat — exchanging losses, not firing volleys';
  if (u.status === 'routing' || u.order === 'withdraw') return 'Withdrawing — not firing';
  if (u.order === 'rally') return 'Rallying — not firing';
  if (u.gunsAbandoned) return 'Guns abandoned';
  if (u.type === 'artillery' && u.gunState !== 'deployed') return `${u.gunState} — guns cannot fire`;
  if (u.ammunition <= 0) return 'Ammunition exhausted';
  const target = selectGettysburgTarget(e, u);
  if (!target) return enemies(e, u).length ? 'No organized enemies — automatic fire held' : 'No enemy formations remaining';
  const foe = nearest(e, u);
  const advancing = u.order === 'advance' && (u.directMove ? dist(u, u.target) >= 2 : foe && dist(u, foe) > (u.type === 'artillery' ? Math.min(420, (u.visibilityLimit || Infinity) * .86) : 165));
  if ((e.battleRulesVersion < 7 || u.blockedTime < 0.5) && (advancing || (u.order === 'assault' && (!foe || dist(u, foe) > (e.battleRulesVersion >= 7 ? closeCombatDistance(u, foe) : gettysburgContactRange(u, foe)))))) return 'Moving — halt to fire';
  if (dist(u, target) > gettysburgRange(u)) return `${target.name} — out of range`;
  if (!gettysburgLineOfFire(e, u, target)) return `${target.name} — line of fire blocked`;
  if (!inFireArc(u, target) && u.turnBlocked && e.battleRulesVersion >= 7) {
    const blocker = e.state.find(v => v.id === u.turnBlockerId);
    return `${target.name} — turning space blocked${blocker ? ` by ${blocker.name}` : ''}; reposition for a clear firing front`;
  }
  if (!inFireArc(u, target)) return `${target.name} — ${u.facingOrder != null ? 'outside locked fire arc' : 'turning to face'}`;
  return `${u.pinned ? 'Suppressed fire · ' : ''}${target.name} — ${u.reload > 0 ? `reloading (${u.reload.toFixed(1)})` : 'ready to fire'}`;
}

export function gettysburgFootprint(u) {
  if (u.type === 'artillery') return { width: u.gunState === 'limbered' ? 36 : 66, depth: u.gunState === 'limbered' ? 72 : 34 };
  const mode = u.formationMode;
  return { width: mode === 'column' ? 62 : mode === 'skirmish' ? 144 : mode === 'deep' ? 88 : 124, depth: mode === 'column' ? 72 : mode === 'deep' ? 48 : mode === 'skirmish' ? 30 : 32 };
}
function footprintRadius(u, angle) {
  const f = gettysburgFootprint(u), delta = angle - u.facing;
  return Math.abs(Math.cos(delta)) * f.depth / 2 + Math.abs(Math.sin(delta)) * f.width / 2;
}
export function gettysburgClearance(a, b) {
  const angle = bearingTo(a, b);
  return Math.max(GETTYSBURG_RULES.spacing, footprintRadius(a, angle) + footprintRadius(b, angle) + 8);
}
function turnGettysburg(e, u, desired, dt) {
  const facing = turnToward(u, desired, dt), candidate = { ...u, facing };
  const blocker = e.state.find(v => living(v) && v.id !== u.id &&
    dist(u, v) < gettysburgClearance(candidate, v) - 1e-6 &&
    gettysburgClearance(candidate, v) > gettysburgClearance(u, v) + 1e-6);
  const clear = !blocker;
  if (e.battleRulesVersion >= 7) u.turnBlockerId = blocker?.id || null;
  u.turnBlocked = !clear;
  if (clear) u.facing = facing;
  else u.pressureReason = 'Turning space blocked by a nearby formation';
  u.turning = angularDistance(u.facing, desired) > 0.01;
}
export const gettysburgContactRange = (a, b) => Math.max(72, gettysburgClearance(a, b) + 6);
// Advisory only: the player previews and confirms a normal Move order.
export function gettysburgTurnClearance(e, u) {
  if (e.battleRulesVersion < 7 || !living(u) || u.side !== 'confederate' || u.type !== 'infantry'
    || u.status === 'routing' || u.inMelee || (!u.turnBlocked && (u.blockedTime || 0) < .5) || u.pendingCommand
    || ['fallback', 'withdraw', 'rally'].includes(u.order)) return null;
  const blocker = e.state.find(v => v.id === u.turnBlockerId && living(v) && v.side === u.side)
    || e.state.filter(v => v.id !== u.id && living(v) && v.side === u.side && dist(u, v) <= gettysburgClearance(u, v) + 10).sort((a,b) => dist(u,a)-dist(u,b))[0];
  if (!blocker) return null;
  const others = e.state.filter(v => living(v) && v.id !== u.id);
  const footprint = gettysburgFootprint(u), turnRadius = Math.hypot(footprint.width, footprint.depth) / 2;
  const away = bearingTo(blocker, u);
  for (const length of [48, 56, 64, 72, 80, 88, 96]) for (const offset of [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2]) {
    const point = { x: Math.round(u.x + Math.cos(away + offset) * length), y: Math.round(u.y + Math.sin(away + offset) * length) };
    if (point.x < 70 || point.x > e.world.width - 70 || point.y < 45 || point.y > e.world.height - 35) continue;
    if (!landmarkMoveClear(landmarkField(e), u, point)) continue;
    if (others.some(v => dist(point, v) < turnRadius + footprintRadius(v, bearingTo(point, v)) + 12)) continue;
    const steps = Math.ceil(dist(u, point) / 4);
    let clear = true;
    for (let i = 1; i <= steps && clear; i++) {
      const step = { ...u, x: u.x + (point.x - u.x) * i / steps, y: u.y + (point.y - u.y) * i / steps };
      clear = others.every(v => dist(step, v) >= gettysburgClearance(step, v) + (v.side !== u.side ? 20 : 0));
    }
    if (clear) return { ...point, blockerName: blocker.name };
  }
  return null;
}

export function gettysburgReadiness(e, u) {
  const allies = e.state.filter(v => v.id !== u.id && v.side === u.side && gettysburgOrganized(v)).sort((a, b) => dist(u, a) - dist(u, b));
  const supportCount = allies.filter(v => dist(u, v) <= 340).length;
  const nearestSupport = allies[0];
  const safe = safeToRallyGettysburg(e, u);
  return { supportCount, supported: supportCount > 0, pinned: u.suppression >= 65, supportRange: 340,
    nearestSupportId: nearestSupport?.id || null, nearestSupportName: nearestSupport?.name || null, nearestSupportDistance: nearestSupport ? dist(u, nearestSupport) : null,
    rallySafe: safe, rallyProgress: u.order === 'rally' ? Math.min(1, u.safeTime / GETTYSBURG_RULES.rallyRequired) : 0,
    recovery: u.order === 'rally' ? !safe ? 'Exposed to enemy fire' : !supportCount ? 'Needs nearby friendly support' : 'Rallying under friendly support' : safe ? 'Clear of enemy fire; Rally restores morale and cohesion' : 'Fallback to safety before Rally',
    turnClearance: gettysburgTurnClearance(e, u),
    ...(retreatCorridorPilot(e) ? { retreatGuidance: gettysburgRetreatGuidance(e, u) } : {}),
    footprint: gettysburgFootprint(u) };
}

export function gettysburgLineOfFire(e, a, b) {
  if (!landmarkLineClear(landmarkField(e), a, b)) return false;
  // The ridge masks troops on its reverse slope. Occupants of its crest can fire outward.
  if (e.fieldBattle && !e.fieldLineOfFire(a, b)) return false;
  if (!e.fieldBattle && ((a.y > 420 && b.y < 255) || (b.y > 420 && a.y < 255))) {
    const x = a.x + (b.x - a.x) * ((330 - a.y) / (b.y - a.y));
    if (x >= 320 && x <= 1220) return false;
  }
  const length = dist(a, b);
  return !e.state.some(v => {
    if (!living(v) || v.id === a.id || v.id === b.id || v.side !== a.side) return false;
    const t = ((v.x - a.x) * (b.x - a.x) + (v.y - a.y) * (b.y - a.y)) / Math.max(1, length * length);
    if (t <= 0.12 || t >= 0.9) return false;
    return Math.hypot(v.x - a.x - t * (b.x - a.x), v.y - a.y - t * (b.y - a.y)) < footprintRadius(v, bearingTo(a, b) + Math.PI / 2) + 4;
  });
}

function applyCommand(e, u, order, point) {
  if (order === 'withdraw' && u.order !== 'withdraw') beginRetreat(e, u);
  clearRetreatCorridor(e, u);
  u.pendingCommand = null; u.commandDelay = 0; u.path = null; u.assaultSector = null; u.directMove = false; u.reformRemaining = 0;
  u.facingOrder = null; u.focusTargetId = null; u.blockedTime = 0;
  if (order === 'rally' || order === 'reform') { u.order = 'rally'; u.safeTime = 0; return; }
  u.order = order;
  if (order === 'fallback') u.target = { x: u.x, y: clamp(u.y + rearSign(u, e) * 135, 35, e.world.height - 35) };
  else if (order === 'withdraw') u.target = retreatTarget(e, u);
  else if (order === 'move') { u.order = 'advance'; u.directMove = true; u.target = { x: clamp(point.x, 45, e.world.width - 45), y: clamp(point.y, 25, e.world.height - 25) }; }
  else if (order === 'assault') {
    const sector = sectorsFor(e).find(s => s.id === point?.sectorId) || sectorsFor(e).reduce((a, b) => dist(u, a) < dist(u, b) ? a : b);
    u.assaultSector = sector.id;
    const slot = e.state.filter(v => v.side === u.side && v.type === 'infantry').findIndex(v => v.id === u.id);
    u.target = e.battleRulesVersion >= 7 ? {
      // Enter from this formation's side of the objective. Roster-index slots
      // sent adjacent brigades across each other's paths and exposed flanks.
      x: clamp(u.x, sector.x - sector.width / 2 + 35, sector.x + sector.width / 2 - 35),
      y: clamp(u.y, sector.y - sector.height / 2 + 20, sector.y + sector.height / 2 - 20),
    } : { x: sector.x + [-85, 70, -70, 85][slot % 4], y: sector.y + (slot < 2 ? 35 : -35) };
  } else u.target = { x: u.x, y: u.y };
  fieldEvent(e, u, `${order === 'move' ? 'move' : order} order received.`);
}

export function commandGettysburg(e, id, order, point = null) {
  if (e.pendingOutcome || e.outcome !== 'undecided' || !['hold', 'advance', 'assault', 'volley', 'reform', 'rally', 'fallback', 'withdraw', 'move'].includes(order)) return false;
  const u = e.state.find(v => v.id === id && v.side === 'confederate' && living(v));
  if (order === 'assault' && point && !sectorsFor(e).some(s => s.id === point.sectorId)) return false;
  if (!u || (u.status === 'routing' && order !== 'rally') || (order === 'move' && (!Number.isFinite(point?.x) || !Number.isFinite(point?.y))) || (order === 'assault' && u.type === 'artillery')) return false;
  if (order === 'move' && landmarkDestinationError(landmarkField(e), u, { x: clamp(point.x, 45, e.world.width - 45), y: clamp(point.y, 25, e.world.height - 25) })) return false;
  if (['rally', 'reform'].includes(order) && u.order === 'rally') {
    u.pendingCommand = null; u.commandDelay = 0; return true;
  }
  if (u.pendingCommand?.order === order && JSON.stringify(u.pendingCommand.point) === JSON.stringify(point)) return true;
  // One visible order slot. Replacement replaces the queued order rather than accumulating clicks.
  if (e.fieldBattle && ['advance', 'assault', 'move'].includes(order)) e.recordWildernessCommitment(u);
  u.commandDelay = 0.6 + Math.min(1.4, dist(u, e.fieldBattle?.commandPost || { x: 825, y: 735 }) / 600);
  u.pendingCommand = { order, point: point ? { ...point } : null };
  return true;
}

function clearRetreatCorridor(e, u) {
  if (retreatCorridorPilot(e)) { u.retreatRoute = null; u.retreatRouteKey = null; u.retreatReplanAt = 0; }
}
function beginRetreat(e, u) {
  clearRetreatCorridor(e, u);
  u.retreatOrigin = { x: u.x, y: u.y };
  u.retreatExit = exitTarget(e, u);
}
function retreatTarget(e, u) {
  if (!u.retreatOrigin) beginRetreat(e, u);
  // Keep the chosen route unless its exit becomes threatened. Avoid a new nearest-exit
  // decision every frame, which can reverse a formation near a route boundary.
  if (!u.retreatExit || enemies(e, u).some(v => dist(v, u.retreatExit) < 175)) u.retreatExit = exitTarget(e, u);
  return { ...u.retreatExit };
}
export function canDisengageGettysburg(e, u) {
  if (!living(u) || u.order === 'rally' || (u.order !== 'withdraw' && u.status !== 'routing') || !u.retreatOrigin) return false;
  if (e.fieldBattle?.requireExitIds.includes(u.id)) return false;
  if (dist(u, u.retreatOrigin) < GETTYSBURG_RULES.retreatDistance || (u.y - u.retreatOrigin.y) * rearSign(u, e) < GETTYSBURG_RULES.retreatRearProgress) return false;
  // Distance alone cannot remove a unit from an ongoing fight or let it evade pursuit.
  return enemies(e, u).every(v => {
    if (dist(u, v) < 285) return false;
    const range = gettysburgRange(v);
    const canShoot = v.ammunition > 0 && v.status !== 'routing' && !v.gunsAbandoned && (v.type !== 'artillery' || v.gunState === 'deployed');
    return !canShoot || dist(u, v) > range || !gettysburgLineOfFire(e, v, u);
  });
}
function retire(e, u, reason) {
  clearRetreatCorridor(e, u);
  u.withdrawalOrganized = u.status !== 'routing'; u.withdrawn = true; u.active = false;
  u.retiredAt = e.time; u.departureReason = reason; u.pendingCommand = null; u.engagedWith = null;
  e.recordCombatEvent('departure', u, null, { organized: u.withdrawalOrganized });
  fieldEvent(e, u, `${u.withdrawalOrganized ? 'withdrew in order' : 'escaped in disorder'} — ${reason === 'disengaged' ? 'beyond the engagement area' : 'through a rear exit'}.`);
}

function exitTarget(e, u) {
  const y = rearSign(u, e) < 0 ? 18 : e.world.height - 18;
  const choices = e.fieldBattle ? e.fieldExitTargets(u) : [180, 850, 1510].map(x => ({ x, y }));
  return choices.sort((a, b) => {
    const cost = p => dist(u, p) + enemies(e, u).reduce((sum, v) => sum + (dist(p, v) < 175 ? 1200 : 0), 0);
    return cost(a) - cost(b);
  })[0];
}

// Bounded local path search handles congestion; final movement still checks every formation.
function findRoute(e, u, target) {
  const cell = 40, cols = Math.ceil(e.world.width / cell), rows = Math.ceil(e.world.height / cell);
  const key = (x, y) => y * cols + x;
  const start = { x: Math.floor(u.x / cell), y: Math.floor(u.y / cell) }, goal = { x: Math.floor(target.x / cell), y: Math.floor(target.y / cell) };
  const open = [{ ...start, cost: 0, priority: 0 }], costs = new Map([[key(start.x, start.y), 0]]), previous = new Map();
  const obstacles = e.state.filter(v => v.id !== u.id && living(v));
  const blockedCache = new Map();
  const point = { ...u };
  const blocked = (x, y) => {
    const id = key(x, y);
    if (blockedCache.has(id)) return blockedCache.get(id);
    point.x = x * cell + 20; point.y = y * cell + 20;
    const value = Boolean(formationLandmarkBlocker(landmarkField(e), u, point)) || obstacles.some(v => dist(v, point) < gettysburgClearance(point, v));
    blockedCache.set(id, value); return value;
  };
  let end = null;
  for (let expanded = 0; open.length && expanded < Math.min(320, cols * rows); expanded++) {
    open.sort((a, b) => a.priority - b.priority); const n = open.shift();
    const from = n.x === start.x && n.y === start.y ? u : { ...u, x: n.x * cell + 20, y: n.y * cell + 20 };
    if (Math.hypot(n.x - goal.x, n.y - goal.y) <= 1
      && (e.battleRulesVersion < 11 || landmarkMoveClear(landmarkField(e), from, target))) { end = key(n.x, n.y); break; }
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const x = n.x + dx, y = n.y + dy;
      if (x < 0 || y < 0 || x >= cols || y >= rows || blocked(x, y)) continue;
      if (dx && dy && (blocked(n.x + dx, n.y) || blocked(n.x, n.y + dy))) continue;
      // A clear cell center does not guarantee a clear segment from the unit's
      // actual position, especially when a new route starts beside a corner.
      if (e.battleRulesVersion >= 11 && !landmarkMoveClear(landmarkField(e), from, { x: x * cell + 20, y: y * cell + 20 })) continue;
      const id = key(x, y), cost = n.cost + Math.hypot(dx, dy);
      if (cost >= (costs.get(id) ?? Infinity)) continue;
      costs.set(id, cost); previous.set(id, key(n.x, n.y)); open.push({ x, y, cost, priority: cost + Math.hypot(x - goal.x, y - goal.y) });
    }
  }
  if (end === null) return null;
  const path = [];
  while (end !== key(start.x, start.y)) { path.unshift({ x: (end % cols) * cell + 20, y: Math.floor(end / cols) * cell + 20 }); end = previous.get(end); if (end === undefined) return null; }
  return path;
}

// Read-only UI advisory: never plans a route or changes simulation state.
export function gettysburgRetreatGuidance(e, u) {
  if (!retreatCorridorPilot(e) || e.pendingOutcome || e.outcome !== 'undecided' || !living(u)
    || (u.status !== 'routing' && u.order !== 'withdraw')) return null;
  const target = u.retreatExit || u.target;
  if (!target) return null;
  const blocked = retreatSegmentBlocker(e, u, target, gettysburgClearance, gettysburgFootprint);
  const blocker = blocked?.obstacle;
  const waypoint = u.retreatRoute?.[0];
  const detouring = Boolean(waypoint && !retreatSegmentBlocker(e, u, waypoint, gettysburgClearance, gettysburgFootprint));
  const currentEnemies = enemies(e, u).sort((a,b) => dist(u,a)-dist(u,b) || a.id.localeCompare(b.id));
  const fireThreat = currentEnemies.find(enemy => enemy.ammunition > 0 && enemy.status !== 'routing' && !enemy.gunsAbandoned
    && (enemy.type !== 'artillery' || enemy.gunState === 'deployed') && dist(u,enemy) <= gettysburgRange(enemy) && gettysburgLineOfFire(e,enemy,u));
  const closeEnemy = currentEnemies.find(enemy => dist(u,enemy) < 285);
  const threat = currentEnemies.filter(enemy => dist(enemy, target) < 175).sort((a,b) => dist(a,target)-dist(b,target) || a.id.localeCompare(b.id))[0];
  return { formationId: u.id, blocked: Boolean(blocked), blockerKind: blocked?.kind || null,
    blockerId: blocker?.id || null, blockerName: blocker?.name || null, blockerSide: blocker?.side || null,
    blockerStatus: blocker?.status || null, blockerOrder: blocker?.order || null,
    blockerAvailable: blocked?.kind === 'formation' && blocker.side === u.side && living(blocker) && !blocker.withdrawn && blocker.status !== 'routing',
    reason: blocked ? blocked.kind === 'landmark' ? 'Building blocks the direct rear corridor' : blocker.side === u.side ? 'Friendly formation blocks the direct rear corridor' : 'Enemy formation blocks the direct rear corridor' : 'Direct rear corridor is clear',
    detouring, nextWaypoint: detouring ? { x: waypoint.x, y: waypoint.y } : null,
    corridor: detouring ? u.retreatRoute.map(point => ({ x: point.x, y: point.y })) : [],
    exitThreatened: Boolean(threat), threatId: threat?.id || null, threatName: threat?.name || null,
    underFire: Boolean(fireThreat), fireThreatId: fireThreat?.id || null, fireThreatName: fireThreat?.name || null,
    closeEnemyId: closeEnemy?.id || null, closeEnemyName: closeEnemy?.name || null,
    pendingOrder: u.pendingCommand?.order || null };
}

function retreatMovement(e, u, dt, target, speed) {
  target = clearLandmarkTarget(landmarkField(e), u, target, e.world);
  const key = `${Math.round(target.x)},${Math.round(target.y)}`;
  if (u.retreatRouteKey !== key) { u.retreatRoute = null; u.retreatRouteKey = key; u.retreatReplanAt = 0; }
  while (u.retreatRoute?.length && dist(u, u.retreatRoute[0]) < 1) {
    const next = u.retreatRoute[1];
    if (next && retreatSegmentBlocker(e, u, next, gettysburgClearance, gettysburgFootprint)) break;
    u.retreatRoute.shift();
  }
  const directBlocked = retreatSegmentBlocker(e, u, target, gettysburgClearance, gettysburgFootprint);
  const routeBlocked = u.retreatRoute?.length && retreatSegmentBlocker(e, u, u.retreatRoute[0], gettysburgClearance, gettysburgFootprint);
  if (routeBlocked) u.retreatRoute = null;
  if (directBlocked && !u.retreatRoute?.length && e.time >= u.retreatReplanAt) {
    const route = findRetreatCorridor(e, u, target, gettysburgClearance, gettysburgFootprint);
    u.retreatRoute = route.path;
    u.retreatReplanAt = e.time + (route.path ? RETREAT_CORRIDOR_LIMITS.replanSuccess : RETREAT_CORRIDOR_LIMITS.replanFailure);
  }
  const waypoint = u.retreatRoute?.[0] || target;
  const angle = bearingTo(u, waypoint), facing = turnToward(u, angle, dt);
  if (retreatTurnClear(e, u, facing, gettysburgClearance, gettysburgFootprint)) {
    turnGettysburg(e, u, angle, dt);
  } else { u.turnBlocked = true; u.turning = angularDistance(u.facing, angle) > .01; }
  const stride = Math.min(dist(u, waypoint), speed * gettysburgTerrain(u, e).movement * dt * (1 - u.fatigue / 180) * (u.pinned && !['fallback', 'withdraw'].includes(u.order) ? .62 : 1));
  let next = null;
  // Preserve historical local alternatives and actual stride clearance. A real
  // lateral waypoint, rather than a wider collision exception, breaks deadlock.
  for (const offset of [0, .55, -.55, 1.05, -1.05]) {
    const point = { x: clamp(u.x + Math.cos(angle + offset) * stride, 15, e.world.width - 15), y: clamp(u.y + Math.sin(angle + offset) * stride, 15, e.world.height - 15) };
    if (dist(point, waypoint) >= dist(u, waypoint) || retreatSegmentBlocker(e, u, point, gettysburgClearance, gettysburgFootprint)) continue;
    next = point; break;
  }
  if (next) { u.x = next.x; u.y = next.y; u.blockedTime = 0; u.fatigue = clamp(u.fatigue + dt * (u.order === 'assault' ? .8 : .18)); }
  else { u.blockedTime += dt; u.pressureReason = directBlocked?.kind === 'landmark' ? 'Retreat corridor blocked by a building — finding a way around' : 'Retreat corridor blocked by formations'; }
  return dist(u, target) < 2;
}

function movement(e, u, dt, target, speed) {
  if (retreatCorridorPilot(e) && (u.status === 'routing' || u.order === 'withdraw')) return retreatMovement(e, u, dt, target, speed);
  target = clearLandmarkTarget(landmarkField(e), u, target, e.world);
  const d = dist(u, target);
  if (d < 1) {
    // Reaching a guarded exit is still a blocked retreat; do not bypass the capture timer.
    if ((u.status === 'routing' || u.order === 'withdraw') && enemies(e, u).some(v => dist(u, v) < 80)) {
      u.blockedTime += dt; u.pressureReason = 'Rear exit blocked by enemy formations';
    } else u.blockedTime = 0;
    return true;
  }
  const routeKey = `${Math.round(target.x)},${Math.round(target.y)}`;
  if (u.routeKey !== routeKey) { u.path = null; u.routeKey = routeKey;
    if (!landmarkMoveClear(landmarkField(e), u, target)) u.path = findRoute(e, u, target);
  }
  if (u.blockedTime > 0.5 && (!u.nextRouteAt || e.time >= u.nextRouteAt)) { u.path = findRoute(e, u, target); u.nextRouteAt = e.time + (u.path ? 2 : 4); }
  while (u.path?.length && dist(u, u.path[0]) < 4) {
    // Keep the corner waypoint until the whole formation can reach the next
    // segment. Dropping it within four pixels can cut into an expanded footprint.
    if (e.battleRulesVersion >= 11 && !landmarkMoveClear(landmarkField(e), u, u.path[1] || target)) break;
    u.path.shift();
  }
  const waypoint = u.path?.[0] || target;
  const angle = bearingTo(u, waypoint);
  if (u.order !== 'fallback') turnGettysburg(e, u, angle, dt);
  const stride = Math.min(dist(u, waypoint), speed * gettysburgTerrain(u, e).movement * dt * (1 - u.fatigue / 180) * (u.pinned && !['fallback', 'withdraw'].includes(u.order) ? 0.62 : 1));
  const clear = p => landmarkMoveClear(landmarkField(e), u, p) && e.state.every(v => !living(v) || v.id === u.id || dist(p, v) >= Math.min(gettysburgClearance({ ...u, ...p }, v), dist(u, v) - 0.001));
  let next = null;
  for (const offset of [0, 0.55, -0.55, 1.05, -1.05]) {
    const p = { x: clamp(u.x + Math.cos(angle + offset) * stride, 15, e.world.width - 15), y: clamp(u.y + Math.sin(angle + offset) * stride, 15, e.world.height - 15) };
    if (clear(p) && dist(p, waypoint) < dist(u, waypoint)) { next = p; break; }
  }
  if (next) { u.x = next.x; u.y = next.y; u.blockedTime = 0; u.fatigue = clamp(u.fatigue + dt * (u.order === 'assault' ? 0.8 : 0.18)); }
  else { u.blockedTime += dt; u.pressureReason = !landmarkMoveClear(landmarkField(e), u, waypoint) ? 'Route blocked by a building — finding a way around' : 'Route blocked by formations'; }
  return dist(u, target) < 2;
}

function gunsReady(e, u, moving, dt) {
  if (u.type !== 'artillery') return true;
  if (u.gunsAbandoned) return moving;
  if (moving && u.gunState === 'deployed') { u.gunState = 'limbering'; u.gunTimer = GETTYSBURG_RULES.limberTime; }
  if (!moving && u.gunState === 'limbered') { u.gunState = 'unlimbering'; u.gunTimer = GETTYSBURG_RULES.unlimberTime; }
  if (['limbering', 'unlimbering'].includes(u.gunState)) {
    u.gunTimer = Math.max(0, u.gunTimer - dt);
    if (!u.gunTimer) u.gunState = u.gunState === 'limbering' ? 'limbered' : 'deployed';
    return false;
  }
  return moving ? u.gunState === 'limbered' : u.gunState === 'deployed';
}

export function tacticalPressure(e, u, dt) {
  const safe = safeToRallyGettysburg(e, u);
  const supported = friend(e, u, 340), quiet = e.time - u.lastIncomingAt > 8;
  u.suppression = clamp(u.suppression - dt * (safe || quiet ? 3 : supported && ['hold', 'volley', 'rally'].includes(u.order) ? 1.7 : 1.15));
  u.pinned = u.suppression >= 65;
  u.peakSuppression = Math.max(u.peakSuppression, u.suppression);
  const flanking = threats(e, u).some(v => dist(u, v) < 195 && angularDistance(u.facing, bearingTo(u, v)) > Math.PI * 0.65);
  u.flanked = Boolean(flanking);
  if (flanking) { u.morale = clamp(u.morale - dt * 0.7); u.cohesion = clamp(u.cohesion - dt * 0.35); }
  u.pressureReason = flanking ? 'Enemy on flank or rear' : u.suppression > 35 ? 'Heavy incoming fire' : u.fatigue > 70 ? 'Exhausted' : safe ? 'Clear of nearby enemies' : 'Enemy nearby';
  if (u.strength < u.initialStrength * 0.045) { u.status = 'broken'; u.order = 'hold'; return; }
  if (u.status !== 'routing' && (u.morale < 20 || u.cohesion < 16 || u.suppression > 90)) {
    if (u.order !== 'withdraw') beginRetreat(e, u);
    u.routingCause = `${u.morale < 20 ? 'Morale collapse' : u.cohesion < 16 ? 'Cohesion collapse' : 'Sustained suppression'}${flanking ? ' under flank or rear pressure' : !supported ? ' without nearby support' : ''}`;
    u.routingAt = e.time;
    u.status = 'routing'; u.order = 'withdraw'; u.target = retreatTarget(e, u); u.pendingCommand = null; u.safeTime = 0;
    if (u.type === 'artillery' && u.gunState !== 'limbered') { u.gunsAbandoned = true; u.gunState = 'abandoned'; (e.gettysburg || e.fieldBattle).abandonedGuns++; }
    e.recordCombatEvent('routing', u); fieldEvent(e, u, `routing — ${u.pressureReason.toLowerCase()}.`);
    // A local shock with a strict radius; never cascade across the entire army.
    for (const v of e.state.filter(v => v.id !== u.id && v.side === u.side && living(v) && dist(u, v) < 155)) v.morale = clamp(v.morale - 4);
  }
  u.condition = u.status === 'routing' ? 'routing' : u.morale < 38 || u.cohesion < 32 || u.suppression > 65 ? 'wavering' : u.morale < 55 || u.cohesion < 48 || u.suppression > 35 ? 'shaken' : 'steady';
  if (u.order === 'rally') {
    if (safe && friend(e, u, 340)) {
      u.safeTime += dt; u.pressureReason = 'Rallying near friendly support';
      if (u.safeTime >= GETTYSBURG_RULES.rallyRequired) {
        if (u.morale < 60) u.morale = Math.min(60, u.morale + dt * 1.4); if (u.cohesion < 60) u.cohesion = Math.min(60, u.cohesion + dt * 1.6);
        if (u.morale >= 40 && u.cohesion >= 35) { u.status = 'steady'; u.condition = 'shaken'; u.order = 'hold'; u.safeTime = 0; fieldEvent(e, u, 'rallied; losses and fatigue remain.'); }
      }
      return true;
    }
    u.safeTime = 0;
    if (u.order === 'rally' && u.status !== 'routing') u.pressureReason = safe ? 'Rally needs friendly support within 340' : 'Rally needs 285 separation and a clear line from enemy fire';
  }
  if (safe && u.order === 'hold') u.fatigue = clamp(u.fatigue - dt * 0.6);
  return false;
}

function unionCommand(e) {
  const g = e.gettysburg; if (e.time < g.nextAi) return; g.nextAi = e.time + 2;
  const sectors = RIDGE_SECTORS.map(s => ({ ...s, threat: e.state.filter(u => u.side === 'confederate' && gettysburgOrganized(u) && dist(u, s) < 310).reduce((n, u) => n + u.strength, 0), defenders: e.state.filter(u => u.side === 'union' && gettysburgOrganized(u) && dist(u, s) < 160).reduce((n, u) => n + u.strength, 0) }));
  sectors.sort((a, b) => (b.threat - b.defenders) - (a.threat - a.defenders));
  let threatened = sectors.find(s => s.threat > 0);
  const committed = sectors.find(s => s.id === g.reserveSector && s.threat > 0);
  if (committed && e.time < (g.reserveCommitUntil || 0)) threatened = committed;
  const reserve = e.state.find(u => u.id === 'hancock-reserve');
  if (threatened && reserve && gettysburgOrganized(reserve)) {
    if (g.reserveSector !== threatened.id) { g.reserveSector = threatened.id; g.reserveCommitUntil = e.time + GETTYSBURG_RULES.reserveCommitment; }
    const incursion = e.state.some(u => u.side === 'confederate' && gettysburgOrganized(u) && inside(u, threatened));
    const intent = `${incursion ? 'Counterattack' : 'Reinforce'} ${threatened.name}`;
    if (g.reserveIntent !== intent) { g.reserveIntent = intent; fieldEvent(e, reserve, intent.toLowerCase()); }
    g.reserveCommitted = true;
    if (reserve.order !== 'rally' && reserve.order !== 'fallback') {
      reserve.order = 'advance';
      // A counterattack engages on contact; a player-directed Move keeps marching.
      const opponent = nearest(e, reserve);
      reserve.directMove = !(incursion && opponent && dist(reserve, opponent) <= 165);
      reserve.target = { x: threatened.x + 95, y: incursion ? threatened.y : threatened.y - 100 };
    }
  }
  for (const u of e.state.filter(u => u.side === 'union' && living(u) && u.status !== 'routing')) {
    if (u.condition === 'wavering' && u.order !== 'fallback' && u.order !== 'rally') { u.order = 'fallback'; u.target = { x: u.x, y: Math.max(40, u.y - 125) }; fieldEvent(e, u, 'falling back under pressure.'); }
    if (u.order === 'hold' && u.condition === 'shaken' && !enemies(e, u).some(v => dist(u, v) < 285)) u.order = 'rally';
  }
}

export function resolveGettysburgVolley(e, u, target) {
  if (!living(u) || u.status === 'routing' || ['withdraw', 'rally'].includes(u.order) || !target || !living(target) || u.side === target.side || u.ammunition <= 0 || u.reload > 0 || u.gunsAbandoned || (u.type === 'artillery' && u.gunState !== 'deployed') || !inFireArc(u, target) || dist(u, target) > gettysburgRange(u) || !gettysburgLineOfFire(e, u, target)) return;
  const gap = dist(u, target), artillery = u.type === 'artillery';
  const firepower = artillery ? 1.55 : u.formationMode === 'line' ? 1.14 : u.formationMode === 'skirmish' ? 0.78 : u.formationMode === 'column' ? 0.55 : 0.82;
  const quality = (u.cohesion * 0.58 + u.morale * 0.42) / 100;
  const exposure = target.formationMode === 'skirmish' ? 0.72 : target.formationMode === 'column' ? 1.3 : 1;
  const suppression = 1 - Math.min(100, u.suppression) * 0.0045;
  const canister = artillery && gap < 170;
  const losses = Math.max(1, (artillery ? 34 : Math.max(7, u.strength / 125)) * firepower * quality * (1 - u.fatigue / 150) * clamp(1.22 - gap / gettysburgRange(u) * 0.55, 0.5, 1.1) * exposure * suppression * (canister ? 1.65 : 1) / gettysburgTerrain(target, e).defense);
  target.strength = Math.max(0, target.strength - losses);
  // Combat losses affect a formation proportionally; pressure is recoverable until a formation breaks.
  const lossRatio = losses / Math.max(1400, target.initialStrength);
  target.cohesion = clamp(target.cohesion - lossRatio * 180);
  target.morale = clamp(target.morale - lossRatio * 135);
  const support = friend(e, target, 340) ? 0.88 : 1;
  target.suppression = clamp(target.suppression + (artillery ? canister ? 17 : 12 : 8) * exposure * support * suppression / gettysburgTerrain(target, e).defense);
  target.pinned = target.suppression >= 65;
  target.lastIncomingAt = e.time; target.incomingFireFrom = u.id; target.peakSuppression = Math.max(target.peakSuppression, target.suppression);
  u.ammunition = Math.max(0, u.ammunition - 1);
  u.reload = (artillery ? 5.1 : u.formationMode === 'line' ? 3.4 : 4.1) * (1 + u.suppression / 125);
  u.lastVolleyAt = e.time; u.volleySerial += 1; u.lastShotType = artillery ? canister ? 'canister' : 'shell' : 'volley';
  e.recordCombatEvent('volley', u, target, { shotType: u.lastShotType });
  u.fatigue = clamp(u.fatigue + (artillery ? 0.7 : 0.42));
}

function fire(e, u, target, dt, moving) {
  if (moving && u.order !== 'fallback') return;
  u.aimTargetId = target?.id || null;
  turnGettysburg(e, u, u.facingOrder ?? (target ? bearingTo(u, target) : u.facing), dt);
  if (!target || u.ammunition <= 0 || u.gunsAbandoned || (u.type === 'artillery' && u.gunState !== 'deployed')) return;
  const range = gettysburgRange(u);
  if (dist(u, target) > range || !gettysburgLineOfFire(e, u, target)) return;
  if (!inFireArc(u, target) || u.reload > 0 || (moving && u.order !== 'fallback')) return;
  const before = target.strength; resolveGettysburgVolley(e, u, target);
  if (target.strength < before) {
    target.lastIncomingAt = e.time; target.incomingFireFrom = u.id;
    target.peakSuppression = Math.max(target.peakSuppression, target.suppression);
    u.engagedWith = target.id; u.status = 'firing';
    if (moving) u.reload *= 1.8;
  }
}

export function judgeGettysburg(e, dt = 0) {
  const g = e.gettysburg;
  for (const s of g.sectors) {
    const { supported, defenders } = objectiveControl(e.state, s, 'ridge');
    const c = supported.length > 0, n = defenders.length > 0;
    s.control = c && n ? 'contested' : c ? 'confederate' : n ? 'union' : 'vacant';
  }
  const controlled = g.sectors.filter(s => s.control === 'confederate').length;
  const previouslyHeld = g.held;
  g.held = controlled >= 2 ? Math.min(g.holdRequired, g.held + dt) : 0;
  recordObjectiveProgress(g, e.time, previouslyHeld, g.held, 'Two ridge sectors');
  const started = e.state.filter(u => u.side === 'confederate' && u.participated).reduce((n, u) => n + u.initialStrength, 0);
  const escaped = e.state.filter(u => u.side === 'confederate' && u.withdrawn && u.withdrawalOrganized).reduce((n, u) => n + u.strength, 0);
  g.escaped = escaped / Math.max(1, started);
  g.surrendered = e.state.filter(u => u.status === 'surrendered').reduce((n, u) => n + (u.capturedStrength || 0), 0);
  const viable = e.state.some(u => u.side === 'confederate' && living(u));
  let result = null;
  if (g.held >= g.holdRequired) result = e.sideStrength('confederate') / e.initialConfederate > 0.8 ? 'decisive-win' : 'costly-win';
  else if (g.escaped >= 0.7) result = 'disciplined-withdrawal';
  else if (!viable) result = g.escaped > 0.4 ? 'defeat' : 'rout';
  else if (e.time >= GETTYSBURG_RULES.duration) result = 'defeat';
  if (result) e.beginResolution(result);
}

export function finishGettysburg(e, decision) {
  // Results freeze the tactical state. Losing an objective is not a morale event.
  e.pendingOutcome = decision; e.resolutionTime = 0;
  fieldEvent(e, null, `Battle ended: ${decision.replaceAll('-', ' ')}. Formation positions and conditions are preserved.`);
}

export function stepTacticalFormations(e, dt) {
  e.time += dt;
  if (e.fieldBattle) { e.activateReinforcements(); e.updateFieldCommand(); }
  else {
    for (const u of e.state) if (!u.active && !u.withdrawn && u.arrivalTime != null && e.time >= u.arrivalTime && !u.participated && !formationLandmarkBlocker(landmarkField(e), u)) { u.active = true; u.participated = true; e.recordCombatEvent('reinforcement', u); }
    unionCommand(e);
  }
  const contactBefore = e.battleRulesVersion >= 7 ? closeCombatPairs(e) : [];
  const inContact = new Set(contactBefore.flatMap(([a, b]) => [a.id, b.id]));
  for (const u of e.state) {
    if (!living(u)) continue;
    if (u.pendingCommand) { u.commandDelay = Math.max(0, u.commandDelay - dt); if (u.commandDelay < 1e-8) applyCommand(e, u, u.pendingCommand.order, u.pendingCommand.point); }
    u.reload = Math.max(0, u.reload - dt); u.engagedWith = null;
    if (u.status === 'firing') u.status = 'steady';
    if (canDisengageGettysburg(e, u)) { retire(e, u, 'disengaged'); continue; }
    // Contact does not freeze a formation's facing. Respect a locked heading
    // and retiring orders; otherwise turn toward the actual melee opponent,
    // using the same collision-safe turning rules as ranged combat.
    if (inContact.has(u.id) && u.status !== 'routing' && !['withdraw', 'fallback', 'rally'].includes(u.order)) {
      const opponent = contactBefore.flatMap(([a, b]) => a.id === u.id ? [b] : b.id === u.id ? [a] : [])
        .filter(v => v.status !== 'routing' && v.order !== 'withdraw')
        .sort((a, b) => dist(u, a) - dist(u, b))[0];
      if (opponent) turnGettysburg(e, u, u.facingOrder ?? bearingTo(u, opponent), dt);
    }
    const rallying = tacticalPressure(e, u, dt); if (!living(u)) continue;
    const foe = nearest(e, u);
    if (u.focusTargetId && !enemies(e, u).some(v => v.id === u.focusTargetId)) u.focusTargetId = null;
    const fireTarget = selectGettysburgTarget(e, u);
    if (rallying || (u.order === 'rally' && u.status !== 'routing')) continue;
    let moving = ['advance', 'assault', 'fallback', 'withdraw'].includes(u.order) || u.status === 'routing';
    if (u.status === 'routing' || u.order === 'withdraw') u.target = retreatTarget(e, u);
    else if (u.order === 'advance' && !u.directMove) {
      if (foe && dist(u, foe) > (u.type === 'artillery' ? Math.min(420, (u.visibilityLimit || Infinity) * .86) : 165)) { const angle = bearingTo(u, foe); u.target = { x: foe.x - Math.cos(angle) * 150, y: foe.y - Math.sin(angle) * 150 }; }
      else moving = false;
    }
    if (u.order === 'assault' && u.type === 'infantry') {
      const sector = sectorsFor(e).find(s => s.id === u.assaultSector);
      if (foe && dist(u, foe) <= (e.battleRulesVersion >= 7 ? closeCombatDistance(u, foe) : gettysburgContactRange(u, foe))) moving = false;
      else if (sector && inside(u, sector)) {
        const defender = e.battleRulesVersion >= 5 ? threats(e, u).filter(v => gettysburgOrganized(v) && inside(v, sector)).sort((a, b) => dist(u, a) - dist(u, b))[0] : null;
        // An assault clears occupied ground. Entering the outline alone is
        // not a reason to halt in front of a battery still inside the sector.
        if (defender) u.target = { x: defender.x, y: defender.y };
        else { u.order = 'hold'; moving = false; }
      }
    }
    if (moving && gunsReady(e, u, true, dt)) {
      const speed = u.type === 'artillery' && !u.gunsAbandoned ? 13 : u.order === 'fallback' ? 14 : u.status === 'routing' ? 28 : u.order === 'assault' ? 29 : 24;
      const arrived = movement(e, u, dt, u.target, speed * (u.formationMode === 'column' ? 1.12 : 1));
      const atExit = Math.abs(u.y - u.target.y) < 20 && Math.abs(u.x - u.target.x) < 70 && !enemies(e, u).some(v => dist(u, v) < 80);
      if ((u.status === 'routing' || u.order === 'withdraw') && (atExit || canDisengageGettysburg(e, u))) {
        retire(e, u, atExit ? 'rear-exit' : 'disengaged'); continue;
      }
      if (u.status === 'routing' && u.blockedTime > 8 && foe && dist(u, foe) < 100) { u.capturedStrength = u.strength; u.strength = 0; u.status = 'surrendered'; u.active = false; fieldEvent(e, u, 'trapped without an open retreat; survivors captured.'); continue; }
      if (arrived && !['withdraw'].includes(u.order) && u.status !== 'routing') { u.order = u.order === 'fallback' && u.side === 'union' ? 'rally' : 'hold'; u.directMove = false; moving = false; }
    } else if (!moving) gunsReady(e, u, false, dt);
    if (u.status === 'routing' || u.order === 'withdraw') continue;
    // An intended move is not actual motion when the route is blocked.
    // After a short halt, use normal facing/range/line-of-fire checks while
    // retaining the player's order and continuing to look for a clear route.
    if (!inContact.has(u.id)) fire(e, u, fireTarget, dt, moving && (e.battleRulesVersion < 7 || u.blockedTime < 0.5));
    if (e.battleRulesVersion < 7 && foe && dist(u, foe) <= gettysburgContactRange(u, foe) && u.type === 'infantry' && !u.directMove) {
      e.resolveCloseCombat(u, foe, dt);
      const advantage = (friend(e, u, 240) ? 1.2 : 0.7) * (u.formationMode === 'skirmish' ? 0.65 : 1) * (u.morale + u.cohesion) / 140 / gettysburgTerrain(foe, e).defense;
      foe.morale = clamp(foe.morale - dt * advantage * 1.7); foe.cohesion = clamp(foe.cohesion - dt * advantage * 1.25);
      u.suppression = clamp(u.suppression + dt * 0.6);
    }
  }
  if (e.battleRulesVersion >= 7) resolveContactCombat(e, dt);
  if (e.fieldBattle) { e.updateScenarioEvents(dt); e.judgeOutcome(dt); }
  else judgeGettysburg(e, dt);
}

export function tickGettysburg(e, dt) {
  if (e.pendingOutcome) { e.resolutionTime += dt; if (e.resolutionTime >= 1) { e.outcome = e.pendingOutcome; e.pendingOutcome = null; } return; }
  e.gettysburg.accumulator += Math.min(dt, 60);
  while (e.gettysburg.accumulator + 1e-9 >= GETTYSBURG_RULES.step && !e.pendingOutcome && e.outcome === 'undecided') {
    e.gettysburg.accumulator = Math.max(0, e.gettysburg.accumulator - GETTYSBURG_RULES.step);
    stepTacticalFormations(e, GETTYSBURG_RULES.step);
  }
}
