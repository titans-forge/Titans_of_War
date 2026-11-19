import { objectiveOrganized } from './objectiveControl.js';

// Representative command exercise for the cautious Shiloh branch. Timing and
// distances are game parameters, not a reconstruction of an actual counterstroke.
export const SHILOH_RESERVE_RULES = Object.freeze({ responseTime: 48, duration: 8, supportDistance: 340, retained: .65, reserveRetained: .6 });
const frontIds = ['hardee-corps', 'bragg-corps', 'polk-corps'];
const reserveId = 'breckinridge-reserve';
const movementIssues = new Map([
  ['move', 'Breckinridge is moving.'],
  ['withdraw', 'Breckinridge is withdrawing.'],
  ['fallback', 'Breckinridge is falling back.'],
  ['rally', 'Breckinridge is rallying.'],
]);
const holding = u => objectiveOrganized(u) && !u.directMove && !movementIssues.has(u.order);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function reserveNetworkFacts(formations) {
  const { supportDistance, reserveRetained } = SHILOH_RESERVE_RULES;
  const army = formations.filter(unit => unit.side === 'confederate');
  const initial = army.reduce((total, unit) => total + unit.initialStrength, 0);
  const organized = army.filter(holding);
  const organizedRatio = organized.reduce((total, unit) => total + unit.strength, 0) / Math.max(1, initial);
  const front = organized.filter(unit => frontIds.includes(unit.id));
  const frontLinks = [];
  const connected = new Set();

  for (let i = 0; i < front.length; i++) {
    const from = front[i];
    for (let j = i + 1; j < front.length; j++) {
      const to = front[j];
      if (from.id !== to.id && distance(from, to) <= supportDistance) {
        frontLinks.push({ from: from.id, to: to.id });
        connected.add(from.id);
        connected.add(to.id);
      }
    }
  }

  const reserve = army.find(unit => unit.id === reserveId);
  const reserveReady = Boolean(reserve && holding(reserve) && reserve.strength >= reserve.initialStrength * reserveRetained && reserve.ammunition > 0);
  const reserveLinks = [];
  let nearestFrontId = null;
  let nearestSupportDistance = Infinity;
  for (const unit of front) {
    if (!reserve || !connected.has(unit.id)) continue;
    const gap = distance(unit, reserve);
    if (gap < nearestSupportDistance) {
      nearestSupportDistance = gap;
      nearestFrontId = unit.id;
    }
    if (reserveReady && gap <= supportDistance) reserveLinks.push({ from: reserve.id, to: unit.id });
  }

  return {
    organizedRatio, frontLinks, reserveLinks, supporting: connected.size,
    nearestFrontId, nearestSupportDistance: Number.isFinite(nearestSupportDistance) ? nearestSupportDistance : null,
    reserveReady, supported: reserveLinks.length > 0, frontCount: front.length, reserve,
  };
}

function describeReserveIssue(reserve, reserveReady, supported, nearestSupportDistance) {
  if (supported) return null;
  if (reserveReady) return nearestSupportDistance === null
    ? 'Link two front corps for Breckinridge to support.'
    : `Breckinridge is ${Math.ceil(nearestSupportDistance)} field units from the nearest connected corps. Support range is ${SHILOH_RESERVE_RULES.supportDistance}.`;
  if (!reserve?.active || reserve.strength <= 0 || ['broken', 'surrendered'].includes(reserve.status)) {
    return 'Breckinridge is off the field or unable to fight.';
  }
  if (reserve.status === 'routing') return 'Breckinridge is routing.';
  if (movementIssues.has(reserve.order)) return movementIssues.get(reserve.order);
  if (reserve.directMove) return movementIssues.get('move');
  if (!objectiveOrganized(reserve)) return 'Breckinridge needs at least 30 morale and 25 cohesion.';
  if (reserve.strength < reserve.initialStrength * SHILOH_RESERVE_RULES.reserveRetained) {
    return 'Breckinridge needs at least 60% of his starting strength.';
  }
  return 'Breckinridge is out of ammunition.';
}

// Derive view-only connections and explanations from the same formations as
// the mission adjudicator. These details are not written to the checkpoint.
export function shilohReserveNetwork(formations) {
  const { frontCount, reserve, ...network } = reserveNetworkFacts(formations);
  const frontIssue = network.supporting >= 2 ? null : frontCount < 2
    ? 'Two front corps must be organized and in a fighting posture.'
    : `Bring two front corps within ${SHILOH_RESERVE_RULES.supportDistance} field units of each other.`;
  const reserveIssue = describeReserveIssue(reserve, network.reserveReady, network.supported, network.nearestSupportDistance);
  return { ...network, frontIssue, reserveIssue };
}

export function usesShilohReserveMission(e) {
  return e.scenarioId === 'shiloh' && e.choiceId === 'option_b' && e.battleRulesVersion >= 14 && Boolean(e.fieldBattle);
}
export function shilohReserveState(e) {
  if (!usesShilohReserveMission(e)) return null;
  const r = SHILOH_RESERVE_RULES;
  const { organizedRatio, supporting, reserveReady, supported } = reserveNetworkFacts(e.state);
  const protectedCommander = e.commanderStatus === 'protected';
  const effective = protectedCommander && organizedRatio >= r.retained && supporting >= 2 && supported;
  const held = e.fieldBattle.reserveObjective?.held || 0;
  return { responseTime: r.responseTime, deadline: e.config.maxTime, elapsed: Math.min(e.time, e.config.maxTime), required: r.duration, held,
    organizedRatio, supporting, reserveReady, supported, protectedCommander, effective,
    achieved: e.time >= e.config.maxTime && effective && held + 1e-8 >= r.duration };
}
export function updateShilohReserve(e, dt) {
  if (!usesShilohReserveMission(e)) return null;
  const previous = e.fieldBattle.reserveObjective;
  const state = shilohReserveState(e);
  const activeDt = Math.max(0, Math.min(e.time, state.deadline) - Math.max(e.time - Math.max(0, dt), state.responseTime));
  state.held = state.effective && e.time >= state.responseTime ? Math.min(state.required, state.held + activeDt) : 0;
  state.achieved = e.time >= state.deadline && state.effective && state.held + 1e-8 >= state.required;
  e.fieldBattle.reserveObjective = state;
  if (previous?.held >= state.required && state.held === 0) e.events.push({time:e.time,type:'warning',message:'The connected line or reserve has lost readiness. Re-form support for eight uninterrupted field minutes before the deadline.'});
  if ((previous?.held || 0) < state.required && state.held >= state.required) e.events.push({time:e.time,type:'objective',message:'The front and Breckinridge’s reserve have maintained effective support for eight field minutes. Keep the force organized through minute 128.'});
  return state;
}
export function shilohReserveConditions(s) {
  if (!s) return [];
  return [
    { label:'Defensive interval', satisfied:s.elapsed >= s.deadline, detail:`${Math.floor(s.elapsed)} / ${s.deadline} field minutes` },
    { label:'Organized force on field', satisfied:s.organizedRatio >= SHILOH_RESERVE_RULES.retained, detail:`${Math.round(s.organizedRatio * 100)}% / 65% of starting strength` },
    { label:'Connected front', satisfied:s.supporting >= 2, detail:`${s.supporting} / 2 of Hardee, Bragg and Polk, within 340` },
    { label:'Breckinridge ready and supporting', satisfied:s.reserveReady && s.supported, detail:s.reserveReady && s.supported ? 'At least 60% strength, ammunition available, within 340 of the connected front' : 'Needs 60% strength, ammunition, and position within 340 of the connected front' },
    { label:'Sustained command reserve', satisfied:s.held + 1e-8 >= s.required, detail:`${s.held.toFixed(1)} / ${s.required} uninterrupted field minutes after minute ${s.responseTime}` },
  ];
}
export const SHILOH_RESERVE_BRIEF = [
  'Hold the army together through field minute 128. At minute 48, Sherman and McClernand will attempt a limited advance; the rest of the Union line guards its ground. This timing is a representative game challenge.',
  'Keep at least 65% of your starting strength organized on the field. Connect two of Hardee, Bragg and Polk within 340 field units of each other.',
  'Keep Breckinridge within 340 of that connected front, with at least 60% of his starting strength and ammunition remaining. He may fight in support; he does not have to stay idle.',
  'Maintain those conditions for eight uninterrupted field minutes after minute 48 and through the deadline. Direct moves, Fallback, Rally and Withdraw do not count until the formation returns to an effective fighting posture. Early withdrawal preserves survivors but does not complete this reserve mission.',
];
