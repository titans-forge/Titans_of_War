import { landmarkField, landmarkLineClear } from './historicalLandmarks.js';
import { gettysburgClearance, gettysburgTerrain, gettysburgFootprint } from './gettysburgMechanics.js';

const clamp = value => Math.max(0, Math.min(100, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const present = u => u.active && u.strength > 0 && !['broken', 'surrendered'].includes(u.status);
const fighting = u => present(u) && u.status !== 'routing' && !u.gunsAbandoned;
const retiring = u => u.status === 'routing' || ['withdraw', 'fallback', 'rally'].includes(u.order);
// Formation edges meet at their collision boundary, without interpenetration.
export const closeCombatDistance = (a, b) => gettysburgClearance(a, b) + 3;
export function closeCombatPairs(e) {
  const units = e.state.filter(present).sort((a, b) => a.id.localeCompare(b.id));
  const pairs = [];
  for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) {
    const a = units[i], b = units[j];
    if (a.side === b.side || (a.type === 'artillery' && b.type === 'artillery')) continue;
    if ((!fighting(a) || retiring(a)) && (!fighting(b) || retiring(b))) continue;
    if (distance(a, b) > closeCombatDistance(a, b)) continue;
    if (e.fieldBattle && !e.fieldLineOfFire(a, b)) continue;
    if (!landmarkLineClear(landmarkField(e), a, b)) continue;
    pairs.push([a, b]);
  }
  return pairs;
}

// One simultaneous exchange per fixed simulation step. Damage is derived from
// a pre-exchange snapshot so iteration order never lets one side hit twice.
export function resolveContactCombat(e, dt) {
  if (e.battleRulesVersion < 7 || e.pendingOutcome || e.outcome !== 'undecided' || !Number.isFinite(dt) || !(dt > 0)) return;
  const pairs = closeCombatPairs(e), incoming = new Map(), neighbors = new Map();
  e.closeCombatCues ||= new Map();
  for (const u of e.state) { u.meleeWith = null; u.inMelee = false; }
  for (const [a, b] of pairs) {
    for (const [u, foe] of [[a, b], [b, a]]) {
      if (!neighbors.has(u.id)) neighbors.set(u.id, []);
      neighbors.get(u.id).push(foe);
    }
  }
  for (const [a, b] of pairs) {
    for (const [u, foe] of [[a, b], [b, a]]) {
      u.inMelee = true;
      u.meleeWith ||= foe.id;
      u.lastMeleeAt = e.time;
      u.pressureReason = `Close combat with ${foe.name}`;
      // Retreat remains an available movement order. Broken troops cannot
      // initiate attacks; withdrawing troops can only defend at reduced power.
      if (!fighting(u)) continue;
      const quality = .25 + .75 * (u.morale + u.cohesion) / 200;
      const fatigue = Math.max(.35, 1 - u.fatigue / 140);
      const support = e.state.some(v => v.id !== u.id && v.side === u.side && fighting(v) && !retiring(v) && distance(v, u) < 240) ? 1.12 : 1;
      const type = u.type === 'artillery' ? .35 : 1;
      const posture = retiring(u) ? .45 : u.formationMode === 'skirmish' ? .7 : 1;
      const defense = Math.max(.8, Math.min(1.6, gettysburgTerrain(foe, e).defense));
      // A whole corps cannot fight through one brigade-sized front at once.
      // This is a game-scale frontage budget, not a historical casualty rate.
      const engagedStrength = Math.min(u.strength, gettysburgFootprint(u).width * 32);
      const losses = engagedStrength * .012 * quality * fatigue * support * type * posture * dt / defense / neighbors.get(u.id).length;
      incoming.set(foe.id, (incoming.get(foe.id) || 0) + losses);
    }
    const key = `${a.id}|${b.id}`, last = e.closeCombatCues.get(key);
    if (last === undefined || e.time - last >= 1.5) {
      e.recordCombatEvent('melee', a, b);
      if (last === undefined) e.events.push({ time: e.time, type: 'melee', message: `${a.name} and ${b.name} are fighting at close quarters.` });
      e.closeCombatCues.set(key, e.time);
    }
  }
  const livePairs = new Set(pairs.map(([a, b]) => `${a.id}|${b.id}`));
  for (const key of e.closeCombatCues.keys()) if (!livePairs.has(key)) e.closeCombatCues.delete(key);
  for (const u of e.state) {
    const losses = Math.min(u.strength, incoming.get(u.id) || 0);
    if (losses > 0) {
      u.strength = Math.max(0, u.strength - losses);
      u.cohesion = clamp(u.cohesion - losses / Math.max(1, u.initialStrength) * 140 - dt * .55);
      u.morale = clamp(u.morale - losses / Math.max(1, u.initialStrength) * 115 - dt * .4);
      u.suppression = clamp(u.suppression + dt * 1.2);
      u.lastIncomingAt = e.time;
      u.incomingFireFrom = u.meleeWith;
      if (!u.strength) { u.status = 'broken'; u.inMelee = false; e.recordCombatEvent('broken', u); }
    }
    if (u.inMelee) u.fatigue = clamp(u.fatigue + dt * 1.1);
  }
}
