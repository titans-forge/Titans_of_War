import { BATTLE_ENGINE_CONFIGS } from './battleDefinitions.js';

const titles = Object.freeze({
  breached: 'Crater breach open',
  contested: 'Crater breach contested',
  contained: 'Lodgment contained',
  sealed: 'Crater breach sealed',
  overrun: 'Petersburg heights exposed',
});

const available = unit => unit.active && !['broken', 'routing'].includes(unit.status);

// Read only. Formation counts repeat the battle's observed eligibility, and
// the terminal titles report ground status independently of the command grade.
export function petersburgReadout(snapshot, choiceId) {
  if (snapshot?.scenarioId !== 'petersburg' || !(snapshot.battleRulesVersion >= 18)
    || !snapshot.fieldBattle || snapshot.delegated || !Object.hasOwn(titles, snapshot.craterState)) return null;
  const config = BATTLE_ENGINE_CONFIGS.petersburg;
  const posture = Object.hasOwn(config.postures, choiceId) ? config.postures[choiceId] : null;
  if (!posture?.craterDeadline) return null;

  const state = snapshot.craterState;
  const title = titles[state];
  const containment = posture.craterPosture === 'containment';
  const counterattack = posture.craterPosture === 'counterattack';
  if (state === 'contained') return {
    state, title, compact: title,
    detail: 'The secondary works confined the Federal assault around the crater. The breach remains open.',
  };
  if (state === 'sealed') return {
    state, title, compact: title,
    detail: counterattack ? 'Both of Mahone’s brigades reached the breach and secured its shoulders.'
      : 'The defenders stopped the assault and closed the crater perimeter.',
  };
  if (state === 'overrun') return {
    state, title, compact: title,
    detail: containment ? `The line failed the containment check at field minute ${posture.craterDeadline}.`
      : `The breach remained open at the field minute ${posture.craterDeadline} deadline.`,
  };

  const finished = Boolean(snapshot.resolving || (snapshot.outcome && snapshot.outcome !== 'undecided'));
  if (finished) return { state, title, compact: title, detail: 'The breach remained open when the field result was decided.' };

  const time = snapshot.time;
  const remaining = Math.max(0, Math.ceil(posture.craterDeadline - time));
  const untilAssault = Math.max(0, Math.ceil(posture.assaultStartTime - time));
  const compact = state === 'breached' ? `Federal assault in ${untilAssault}`
    : containment ? `Hold the works · ${remaining} min left` : `Seal the breach · ${remaining} min left`;
  const formations = snapshot.formations || [];
  if (containment) {
    const defenders = formations.filter(unit => unit.secondaryDefender && available(unit)).length;
    const throughLine = formations.filter(unit => config.craterAttackerIds.includes(unit.id) && available(unit) && unit.y >= 655).length;
    return { state, title, compact,
      detail: `Hold through minute ${posture.craterDeadline} · Secondary defenders ${defenders} (need 3) · Federal assault formations through the line ${throughLine} (need 0).` };
  }
  if (counterattack) {
    const reserves = formations.filter(unit => config.mahoneFormationIds.includes(unit.id));
    const ready = reserves.filter(available).length;
    const arrivals = reserves.filter(unit => !unit.active && Number.isFinite(unit.arrivalTime));
    const nextArrival = arrivals.length ? ` · Next arrival minute ${Math.ceil(Math.min(...arrivals.map(unit => unit.arrivalTime)))}` : '';
    return { state, title, compact,
      detail: `Seal by minute ${posture.craterDeadline} · Mahone available ${ready} / 2${nextArrival}. When both are ready, select Crater breach and order both to Assault.` };
  }
  const mineStatus = snapshot.mineState === 'detonated' ? 'Mine shock recorded'
    : snapshot.mineState === 'missed' ? 'Mine-lane window missed' : 'Mine-lane action pending';
  return { state, title, compact,
    detail: `${mineStatus} · Keep the line in place and seal the breach by minute ${posture.craterDeadline}.` };
}
