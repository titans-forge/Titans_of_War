import { objectiveOrganized } from './objectiveControl.js';

// One definition serves the adjudicator and the live/debrief display. This
// preserves the existing deadline check; it does not invent continuous control.
export function henryHillObjective(engine) {
  if (!engine.fieldBattle || engine.scenarioId !== 'first_manassas' || engine.choiceId !== 'option_b') return null;
  const hill = engine.fieldBattle.zones.find(zone => zone.name === 'Henry Hill');
  if (!hill) return null;
  const onHill = unit => unit.x >= hill.left && unit.x <= hill.right && unit.y >= hill.top && unit.y <= hill.bottom;
  const infantry = engine.state.filter(unit => unit.side === 'confederate' && unit.type === 'infantry' && objectiveOrganized(unit) && onHill(unit) && !['withdraw', 'fallback'].includes(unit.order));
  const supported = infantry.filter(a => infantry.some(b => a.id !== b.id && Math.hypot(a.x - b.x, a.y - b.y) <= 340));
  const enemies = engine.state.filter(unit => unit.side === 'union' && objectiveOrganized(unit) && onHill(unit));
  const underFire = engine.fieldBattle.defendedUnderFire || infantry.some(unit => engine.time - unit.lastIncomingAt < 2);
  const deadline = engine.config.maxTime;
  const intervalComplete = engine.time >= deadline;
  return { name: 'Henry Hill', deadline, elapsed: Math.min(deadline, engine.time), supporting: supported.length, enemies: enemies.length, underFire, intervalComplete,
    achieved: intervalComplete && supported.length >= 2 && enemies.length === 0 && underFire };
}

export function henryHillConditions(objective) {
  if (!objective) return [];
  return [
    { label: 'Defensive interval', satisfied: objective.intervalComplete, detail: `${Math.floor(objective.elapsed)} / ${objective.deadline} field minutes` },
    { label: 'Supporting infantry on hill', satisfied: objective.supporting >= 2, detail: `${objective.supporting} / 2 required, within 340 of each other` },
    { label: 'Hill clear of organized enemy', satisfied: objective.enemies === 0, detail: `${objective.enemies} enemy formations on hill` },
    { label: 'Defense tested under fire', satisfied: objective.underFire, detail: objective.underFire ? 'Recorded during this battle' : 'Not yet recorded' },
  ];
}
