import { approachAngle, directionIndex } from './formationMath.js';

export const BATTLE_TACTICS_VERSION = 2;
export const fireArcDegrees = (unit) => unit.type === 'artillery' ? 90 : 120;
export const turnRate = (unit) => (unit.type === 'artillery' ? 18 : 35) * Math.PI / 180;
export const bearingTo = (unit, point) => Math.atan2(point.y - unit.y, point.x - unit.x);
export const angularDistance = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
export const inFireArc = (unit, target) => angularDistance(unit.facing, bearingTo(unit, target)) <= fireArcDegrees(unit) * Math.PI / 360 + 1e-9;
export const turnToward = (unit, angle, dt) => approachAngle(unit.facing, angle, Math.max(0, dt) * turnRate(unit));
export const compassHeading = (angle) => ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'][directionIndex(angle)];
export const organizedFormation = (unit) => !['routing', 'broken'].includes(unit.status)
  && unit.morale >= 18 && unit.cohesion >= 13 && unit.strength > unit.initialStrength * 0.12;

export function formationStatusLabel(unit) {
  if (!unit) return 'Not on field';
  if (unit.status === 'surrendered') return 'captured';
  if (unit.active && unit.condition && !['routing', 'broken'].includes(unit.status) && unit.condition !== 'steady') return unit.condition;
  if (unit.presentationStatus) return unit.presentationStatus;
  if (unit.withdrawn) return unit.withdrawalOrganized ? 'withdrawn in order' : 'escaped in disorder';
  return unit.active ? unit.status : unit.arrivalTime != null ? `arrives at ${unit.arrivalTime}` : 'unavailable';
}

export const isVisuallyRouting = (unit) => unit.presentationStatus ? ['routing', 'broken'].includes(unit.presentationStatus) : unit.status === 'routing';

export function combatEventLabel(event, formations = []) {
  const name = formations.find(unit => unit.id === event.formationId)?.name || event.formationId;
  const target = formations.find(unit => unit.id === event.targetId)?.name || event.targetId;
  if (event.type === 'melee') return `${name} is in close combat${target ? ` with ${target}` : ''}.`;
  if (event.type === 'volley') return `${name} fired ${event.weapon === 'artillery' ? 'its guns' : 'a volley'}${target ? ` at ${target}` : ''}.`;
  if (event.type === 'departure') return `${name} is departing ${event.organized ? 'in order' : 'in disorder'}.`;
  if (event.type === 'reinforcement') return `${name} arrived on the field.`;
  return `${name} ${event.type === 'broken' ? 'has broken' : 'is routing'}.`;
}
