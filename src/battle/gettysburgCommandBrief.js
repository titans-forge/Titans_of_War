// Presentation only: these summaries neither issue orders nor change the assessment.
const finite = value => Number.isFinite(value) ? value : 0;
const bounded = (value, max = Infinity) => Math.max(0, Math.min(max, finite(value)));

// Optional opening reference. Each destination still needs the player's normal
// preview and confirmation; this data never moves or assigns orders to a unit.
export const GETTYSBURG_STAGING_PLAN = Object.freeze([
  Object.freeze({ id: 'pickett-division', label: 'Pickett', x: 670, y: 545, sectorId: 'center', role: 'Cemetery Ridge pair' }),
  Object.freeze({ id: 'pettigrew-division', label: 'Pettigrew', x: 825, y: 570, sectorId: 'center', role: 'Cemetery Ridge pair' }),
  Object.freeze({ id: 'trimble-division', label: 'Trimble', x: 1060, y: 545, sectorId: 'angle', role: 'The Angle pair' }),
  Object.freeze({ id: 'wilcox-support', label: 'Wilcox', x: 1270, y: 570, sectorId: 'angle', role: 'The Angle pair' }),
  Object.freeze({ id: 'alexander-battalion', label: 'Alexander', x: 950, y: 675, sectorId: null, role: 'Clear-lane artillery support' }),
]);

export function getGettysburgCommandBrief(snapshot, choiceId) {
  const formations = snapshot?.formations || [];
  const allies = formations.filter(unit => unit.side === 'confederate' && unit.active && unit.strength > 0);
  if (snapshot?.outcome && snapshot.outcome !== 'undecided') return { phase: 'After action', message: 'Review the force report before returning the result.' };
  if (!snapshot?.time) return {
    phase: allies.some(unit => unit.pendingCommand) ? 'Orders queued · paused' : 'Command phase · paused',
    message: choiceId === 'option_a' ? 'Prepare individual orders before beginning. Keep the infantry connected and the battery’s firing lane clear.' : 'Plan a covered withdrawal before beginning. Withdraw each formation in turn; protect guns while they limber.',
  };
  if (choiceId !== 'option_a') return { phase: 'Preserve the army', message: 'Screen the retreat. Only survivors who leave in order count toward the withdrawal objective.' };
  if (snapshot?.gettysburg?.held > 0) return { phase: 'Hold the foothold', message: 'Keep two ridge sectors uncontested with organized, supported infantry. Watch for the Union reserve.' };
  if (allies.some(unit => ['wavering', 'routing'].includes(unit.condition))) return { phase: 'Line under pressure', message: 'Check the affected formations. Fallback before collapse; Rally requires safety and nearby support.' };
  if (allies.some(unit => unit.type === 'infantry' && (snapshot?.gettysburg?.sectors || []).some(sector => Math.abs(unit.x - sector.x) <= sector.width / 2 && Math.abs(unit.y - sector.y) <= sector.height / 2))) return { phase: 'Connect the foothold', message: 'Keep organized infantry in two sectors and within 340 field units of friendly support. A formation can survive on the ridge while standing too far from its neighbors to hold it.' };
  if (allies.some(unit => unit.order === 'assault')) return { phase: 'Assault underway', message: 'Support the committed brigades and watch their cohesion. One sector alone cannot complete the mission.' };
  return { phase: 'Prepare the breach', message: 'Use clear fire lanes and nearby support. Choose a ridge sector, then issue Assault when the formation is ready.' };
}

export function getGettysburgFormationAdvice(unit) {
  if (!unit) return 'Select a formation to review its condition.';
  if (unit.withdrawn) return unit.withdrawalOrganized ? 'These survivors left in order and count toward organized withdrawal.' : 'These survivors escaped in disorder. They are alive but do not count toward organized withdrawal.';
  if (unit.status === 'surrendered') return 'The formation was captured after its retreat route closed.';
  if (!unit.active) return 'This formation is not currently on the field.';
  if (unit.order === 'rally' && unit.readiness?.rallySafe && unit.readiness.supported) return 'Safe ground and friendly support reached. Keep the formation here while it rallies.';
  if (unit.status === 'routing') return 'Rally is the only available recovery order. The formation keeps retreating until it is safe and supported.';
  if (unit.gunsAbandoned) return 'The crew survives, but these guns can no longer fire.';
  if (unit.order === 'rally') return unit.readiness?.recovery || 'Keep the formation clear of enemy fire and near a friendly formation while it recovers.';
  if (unit.order === 'withdraw') return 'This withdrawal removes the formation from the battle once it is safely clear.';
  if (unit.readiness?.pinned) return 'Pinned by fire. Reduce exposure and bring support before trying to press the attack.';
  if (unit.condition === 'wavering') return 'The formation is close to breaking. Use Fallback before it loses the ability to obey normal orders.';
  if (unit.ammunition <= 0) return 'Ammunition is exhausted. Preserve this formation or use it to support a fresh brigade.';
  if (unit.fatigue > 70) return 'Exhaustion weakens the formation. Bring up fresh support and make room for a recovery behind the line.';
  if (unit.readiness?.supported === false && unit.type === 'infantry') return Number.isFinite(unit.readiness.nearestSupportDistance) ? `Nearest support: ${unit.readiness.nearestSupportName}, ${Math.ceil(unit.readiness.nearestSupportDistance)} field units away. Close the gap to ${unit.readiness.supportRange || 340} to support the foothold.` : 'Bring an organized friendly formation closer before committing to the ridge.';
  return 'Watch cohesion and suppression together. Low casualties do not guarantee an effective formation.';
}

export function getGettysburgForceReport(snapshot, assessment = null) {
  const units = (snapshot?.formations || []).filter(unit => unit.side === 'confederate');
  const totals = { initial: 0, onField: 0, disordered: 0, escaped: 0, reserve: 0, captured: 0, casualties: 0 };
  const breaks = [];
  for (const unit of units) {
    const initial = bounded(unit.initialStrength);
    const survivors = bounded(unit.strength, initial);
    const captured = bounded(unit.capturedStrength, initial - survivors);
    totals.initial += initial;
    totals.captured += captured;
    totals.casualties += initial - survivors - captured;
    if (unit.withdrawn && unit.withdrawalOrganized) totals.escaped += survivors;
    else if (['routing', 'broken'].includes(unit.status) || unit.withdrawn) totals.disordered += survivors;
    else if (unit.active) totals.onField += survivors;
    else totals.reserve += survivors;
    if (unit.routingCause) breaks.push({ name: unit.name || unit.id, cause: unit.routingCause, at: finite(unit.routingAt) });
  }
  const outcome = snapshot?.decision || snapshot?.outcome;
  const lostRatio = totals.initial ? (totals.casualties + totals.captured) / totals.initial : 0;
  const finished = ['rout', 'defeat', 'disciplined-withdrawal', 'decisive-win', 'costly-win'].includes(outcome);
  const headline = !finished ? 'The battle remains undecided.' : outcome === 'rout'
    ? lostRatio < 0.35 ? 'The line collapsed before the army was destroyed.' : 'The army lost its ability to hold the field.'
    : outcome === 'defeat' ? 'The objective remained out of reach.'
      : outcome === 'disciplined-withdrawal' ? assessment?.objective?.kind === 'preserve' && snapshot?.fieldBattle?.escaped < .65 ? 'The army remained effective through the mission.' : 'The army escaped in order.'
        : 'The field objective was secured.';
  const explanation = !finished ? 'These are current formation totals, not a final result.' : outcome === 'rout'
    ? 'Routing records a loss of organized combat power. Troops can survive the battle while their formation breaks and retreats.'
    : outcome === 'defeat' ? `Surviving troops and an uncompleted mission are separate results.${assessment?.objective?.label ? ` Mission: ${assessment.objective.label}.` : ' Review the selected mission and its completion evidence.'}`
      : outcome === 'disciplined-withdrawal' ? assessment?.objective?.kind === 'preserve' && snapshot?.fieldBattle?.escaped < .65 ? 'This mission allows preservation in place. Review the forces still on the field separately from those withdrawn.' : 'The withdrawal threshold counts surviving strength that left in order, rather than every soldier still alive.'
        : 'The objective and force preservation are assessed separately. These totals show what remained when the battle ended.';
  const rows = [
    ['onField', 'On the field'], ['escaped', 'Withdrawn in order'], ['disordered', 'Routed or disordered survivors'],
    ['reserve', 'Off-field reserve'], ['captured', 'Captured'], ['casualties', 'Casualties'],
  ].map(([key, label]) => ({ key, label, value: totals[key], percent: totals.initial ? totals[key] / totals.initial * 100 : 0 }));
  return { ...totals, headline, explanation, rows, breaks: breaks.sort((a, b) => a.at - b.at) };
}
