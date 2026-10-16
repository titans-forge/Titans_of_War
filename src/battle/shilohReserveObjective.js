import { objectiveOrganized } from './objectiveControl.js';

// Representative command exercise for the cautious Shiloh branch. Timing and
// distances are game parameters, not a reconstruction of an actual counterstroke.
export const SHILOH_RESERVE_RULES = Object.freeze({ responseTime: 48, duration: 8, supportDistance: 340, retained: .65, reserveRetained: .6 });
const frontIds = ['hardee-corps', 'bragg-corps', 'polk-corps'];
const holding = u => objectiveOrganized(u) && !u.directMove && !['move', 'withdraw', 'fallback', 'rally'].includes(u.order);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function usesShilohReserveMission(e) {
  return e.scenarioId === 'shiloh' && e.choiceId === 'option_b' && e.battleRulesVersion >= 14 && Boolean(e.fieldBattle);
}
export function shilohReserveState(e) {
  if (!usesShilohReserveMission(e)) return null;
  const r = SHILOH_RESERVE_RULES;
  const army = e.state.filter(u => u.side === 'confederate');
  const initial = army.reduce((n, u) => n + u.initialStrength, 0);
  const organizedRatio = army.filter(holding).reduce((n, u) => n + u.strength, 0) / Math.max(1, initial);
  const front = army.filter(u => frontIds.includes(u.id) && holding(u));
  const pair = front.filter(a => front.some(b => a.id !== b.id && distance(a, b) <= r.supportDistance));
  const reserve = army.find(u => u.id === 'breckinridge-reserve');
  const reserveReady = Boolean(reserve && holding(reserve) && reserve.strength >= reserve.initialStrength * r.reserveRetained && reserve.ammunition > 0);
  const supported = reserveReady && pair.some(u => distance(u, reserve) <= r.supportDistance);
  const protectedCommander = e.commanderStatus === 'protected';
  const effective = protectedCommander && organizedRatio >= r.retained && pair.length >= 2 && supported;
  const held = e.fieldBattle.reserveObjective?.held || 0;
  return { responseTime: r.responseTime, deadline: e.config.maxTime, elapsed: Math.min(e.time, e.config.maxTime), required: r.duration, held,
    organizedRatio, supporting: pair.length, reserveReady, supported, protectedCommander, effective,
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
