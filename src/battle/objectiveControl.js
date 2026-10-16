// Shared by the adjudicator and the command inspector: the UI must explain
// the same formation-center and support tests that award objective progress.
export const objectiveOrganized = u => u.active && u.strength > 0 && !['broken', 'surrendered', 'routing'].includes(u.status) && u.morale >= 30 && u.cohesion >= 25;
export const insideObjective = (u, s) => Math.abs(u.x - s.x) <= s.width / 2 && Math.abs(u.y - s.y) <= s.height / 2;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function objectiveEligibility(u, sector, mode) {
  if (!u?.active || u.strength <= 0 || ['broken', 'surrendered'].includes(u.status)) return 'Not combat effective on the field';
  if (u.type !== 'infantry') return 'Infantry required';
  if (u.status === 'routing') return 'Routing; recover with Rally before holding ground';
  if (u.morale < 30 || u.cohesion < 25) return 'Needs morale 30 and cohesion 25';
  if (mode === 'ridge' && u.strength < 600) return 'Needs at least 600 troops';
  if (mode === 'attack' && (u.directMove || ['withdraw', 'fallback', 'rally'].includes(u.order))) return 'Finish moving or recovering, then Hold, Advance or Assault';
  if (!insideObjective(u, sector)) return 'Formation center is outside the objective boundary';
  return null;
}
export function objectiveControl(formations, sector, mode) {
  const candidates = formations.filter(u => u.side === 'confederate' && !objectiveEligibility(u, sector, mode));
  const supported = candidates.filter(a => formations.some(b => a.id !== b.id && b.side === a.side && objectiveOrganized(b) && distance(a, b) <= 340 && (mode === 'ridge' || candidates.includes(b))));
  const defenders = formations.filter(u => u.side === 'union' && objectiveOrganized(u) && insideObjective(u, sector) && (mode === 'ridge' ? u.type === 'infantry' && u.strength >= 600 : !u.gunsAbandoned));
  return { candidates, supported, defenders };
}

export function recordObjectiveProgress(journal, time, before, after, name) {
  if (!(before === 0 && after > 0) && !(before > 0 && after === 0)) return;
  const message = after > 0 ? `${name}: required control established; the uninterrupted hold has begun.` : `${name}: required control lost after ${before.toFixed(1)} field minutes; the hold timer reset.`;
  journal.controlEvents = [...(journal.controlEvents || []), { time, message }].slice(-16);
}
