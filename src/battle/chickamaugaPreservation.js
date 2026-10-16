import { objectiveOrganized } from './objectiveControl.js';
export const CHICKAMAUGA_RETAINED = .65;
export function chickamaugaPreservation(e) {
  if (e.scenarioId !== 'chickamauga' || e.battleRulesVersion < 15 || !['option_c', 'option_d'].includes(e.choiceId) || !e.fieldBattle) return null;
  const army = e.state.filter(u => u.side === 'confederate');
  const initial = army.reduce((n, u) => n + u.initialStrength, 0);
  const onField = army.filter(u => !u.withdrawn && objectiveOrganized(u)).reduce((n, u) => n + u.strength, 0);
  const escaped = army.filter(u => u.withdrawn && u.withdrawalOrganized && !['routing', 'broken', 'surrendered'].includes(u.status)).reduce((n, u) => n + u.strength, 0);
  const waiting = army.some(u => !u.participated && u.arrivalTime != null && u.arrivalTime <= e.config.maxTime);
  const occupied = army.some(u => u.active && !['broken', 'surrendered'].includes(u.status));
  return { retained: (onField + escaped) / Math.max(1, initial), onField: onField / Math.max(1, initial), escaped: escaped / Math.max(1, initial), required: CHICKAMAUGA_RETAINED,
    ready: (onField + escaped) / Math.max(1, initial) >= CHICKAMAUGA_RETAINED,
    elapsed: Math.min(e.time, e.config.maxTime), deadline: e.config.maxTime, intervalComplete: e.time >= e.config.maxTime, exitComplete: !waiting && !occupied };
}
export function chickamaugaPreservationConditions(s) {
  return s ? [{ label:'Organized army retained', satisfied:s.ready, detail:`${Math.round(s.retained * 100)}% / 65% of starting strength; ${Math.round(s.onField * 100)}% on field, ${Math.round(s.escaped * 100)}% withdrawn in order` }] : [];
}
export const CHICKAMAUGA_PRESERVATION_BRIEF = [
  'Preserve at least 65% of your starting strength in organized formations. Troops still on the field need morale 30 and cohesion 25; troops withdrawn in order also count. Routed, captured and not-yet-arrived formations do not count.',
  'You can hold through field minute 126, win a favorable field result, or complete an orderly withdrawal. Arriving divisions must be accounted for before an early exit can finish the battle. You do not have to attack the Brotherton gap to complete this preservation mission.',
  'Coordination delays and the cavalry rail operation are campaign consequences. This battlefield measures the army you retain; it does not simulate cabinet negotiations or the destruction of rail bridges.',
];
