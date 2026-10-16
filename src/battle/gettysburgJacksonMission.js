import { BATTLE_ENGINE_CONFIGS } from './battleDefinitions.js';

// Presentation only. These readers never decide an outcome or issue orders.
// Keep the branch descriptions checked against actual engine fixtures: Jackson
// has alternative resolution paths, rather than a two-sector capture mission.
const config = BATTLE_ENGINE_CONFIGS.gettysburg_jackson;
const results = {
  'decisive-win': 'Decisive field victory', 'costly-win': 'Limited field victory',
  'disciplined-withdrawal': 'Organized withdrawal', defeat: 'Field defeat', rout: 'Army routed',
};
const percent = value => `${(value * 100).toFixed(1)}%`;
const effective = (unit, field) => !['broken', 'routing'].includes(unit.status)
  && (!field || (!unit.withdrawn && unit.status !== 'surrendered'));
const ratio = units => units.reduce((sum, unit) => sum + unit.strength, 0)
  / Math.max(1, units.reduce((sum, unit) => sum + unit.initialStrength, 0));
const condition = (label, satisfied, detail) => ({ label, satisfied, detail });

const displayedDispatches = new Map([
  ...Object.values(config.postures).map(posture => [
    `Jackson must break the Union high ground before the opportunity window closes at field minute ${posture.surpriseDeadline}.`,
    `Trigger Jackson's surprise contact by field minute ${posture.surpriseDeadline}. Exploit the disrupted center while Hancock's rally line is inactive; a center collapse or favorable deadline pressure can also decide the field result.`,
  ]),
  ["Jackson's corps has reached Cemetery Hill and Culp's Hill before the Union fishhook is fully joined.",
    "Jackson's corps has made timely contact with the Union center around the heights within the surprise window."],
]);
const freezeDisplay = value => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeDisplay(child);
    Object.freeze(value);
  }
  return value;
};

// Keep raw authored events, checkpoints and replay evidence intact. Only exact
// known Jackson dispatches receive corrected wording in this detached UI copy.
export function presentGettysburgJacksonSnapshot(snapshot, choiceId) {
  if (snapshot?.scenarioId !== 'gettysburg_jackson' || !Object.hasOwn(config.postures, choiceId)) return snapshot;
  const display = structuredClone(snapshot);
  display.gettysburgJackson = {
    surpriseDeadline: config.postures[choiceId].surpriseDeadline,
    missionDeadline: config.maxTime,
  };
  for (const event of display.events || []) if (displayedDispatches.has(event.message)) event.message = displayedDispatches.get(event.message);
  if (display.fieldStatus && displayedDispatches.has(display.fieldStatus.message)) display.fieldStatus.message = displayedDispatches.get(display.fieldStatus.message);
  if (/^Hancock in \d+$/.test(display.fieldStatus?.label || '')) {
    const hancock = display.formations?.find(unit => unit.id === config.hancockFormationId);
    if (hancock && !hancock.active) {
      if (hancock.withdrawn) display.fieldStatus.label = "Hancock's rally line departed";
      else if (hancock.participated) display.fieldStatus.label = "Hancock's rally line off field";
      else if (Number.isFinite(hancock.arrivalTime) && display.time >= hancock.arrivalTime) display.fieldStatus.label = 'Hancock arrival pending';
    }
  }
  return freezeDisplay(display);
}

export function getGettysburgJacksonBrief(choiceId) {
  const deadline = config.postures[choiceId]?.surpriseDeadline;
  const common = 'The hill markers show actual force presence. Clearing both marked sectors is not a separate victory requirement.';
  const orders = choiceId === 'option_a' ? [
    `Trigger surprise contact by field minute ${deadline}. While Hancock's rally line is not active on the field, bring at least two active Jackson divisions into the upper heights area (formation center Y ≤ 475) and shake at least two Union center formations.`,
    'This attack route gives a decisive victory with more than 64% of starting army strength retained; 64% or less gives a limited victory. Only a decisive result with timely surprise completes this selected mission.',
  ] : choiceId === 'option_b' ? [
    `Coordinate Jackson and Longstreet. A decisive or limited field victory with surprise contact by field minute ${deadline} completes this selected mission.`,
    'Seek a collapse of the Union center or a favorable deadline result. The immediate heights attack condition does not apply to this opening.',
  ] : [
    choiceId === 'option_c' ? 'Turn the Baltimore Pike threat into a decisive or limited field victory.' : 'Turn the wide movement into a decisive or limited field victory.',
    `Seek a collapse of the Union center or a favorable deadline result. Surprise contact by field minute ${deadline} strengthens the deadline route, but is not required for this selected mission’s grade.`,
  ];
  return { orders: [...orders, common] };
}

function readFacts(snapshot) {
  const formations = snapshot.formations;
  if (!Array.isArray(formations) || !formations.length
    || !config.formations.every(authored => formations.some(unit => unit.id === authored.id))
    || !formations.every(unit => Number.isFinite(unit.strength) && Number.isFinite(unit.initialStrength))) return null;
  const field = Boolean(snapshot.fieldBattle);
  const confederates = formations.filter(unit => unit.side === 'confederate');
  const union = formations.filter(unit => unit.side === 'union');
  const center = formations.filter(unit => config.unionCenterIds.includes(unit.id));
  const hancock = formations.find(unit => unit.id === config.hancockFormationId);
  const initialConfederate = confederates.reduce((sum, unit) => sum + unit.initialStrength, 0);
  return {
    field, confederateRatio: ratio(confederates), unionRatio: ratio(union), centerRatio: ratio(center),
    shakenCenter: center.filter(unit => ['broken', 'routing'].includes(unit.status) || unit.morale <= 30 || unit.cohesion <= 24).length,
    attackersOnHeights: formations.filter(unit => config.surpriseFormationIds.includes(unit.id) && unit.active && unit.status !== 'broken' && unit.y <= 475).length,
    hancockActive: Boolean(hancock?.active), hancockEta: Math.max(0, (hancock?.arrivalTime || 0) - snapshot.time),
    hancockParticipated: Boolean(hancock?.participated), hancockWithdrawn: Boolean(hancock?.withdrawn),
    effectiveConfederates: confederates.filter(unit => effective(unit, field)).length,
    effectiveUnion: union.filter(unit => effective(unit, field)).length,
    fieldExit: field && !confederates.some(unit => unit.active && !['broken', 'surrendered'].includes(unit.status))
      && !confederates.some(unit => !unit.participated && unit.arrivalTime != null && unit.arrivalTime <= config.maxTime),
    escaped: confederates.filter(unit => unit.withdrawn && unit.withdrawalOrganized).reduce((sum, unit) => sum + unit.strength, 0) / Math.max(1, initialConfederate),
  };
}

// Mirror the priority of the existing resolution branches solely to describe
// frozen current-rule facts. Never use this result in judgeOutcome.
function frozenResolution(snapshot, choiceId, facts, deadline) {
  const { confederateRatio: army, unionRatio: union, centerRatio: center, shakenCenter: shaken } = facts;
  const surprise = snapshot.surpriseState === 'triggered';
  const resolved = (path, result, explanation) => ({ path, result, explanation });
  if (facts.fieldExit) return resolved('field-exit', facts.escaped >= .4 ? 'defeat' : 'rout',
    `No active Confederate formations able to hold the field remained, and no reinforcements were pending within the mission interval. ${percent(facts.escaped)} of starting strength had withdrawn in order. This attack mission yields defeat at 40% or more withdrawn in order, otherwise rout.`);
  if (choiceId === 'option_a' && surprise && !facts.hancockActive && facts.attackersOnHeights >= 2 && shaken >= 2) return resolved('early-attack', army > .64 ? 'decisive-win' : 'costly-win',
    `Timely surprise, two Jackson divisions in the upper heights area and two shaken Union center formations met the immediate heights attack condition while Hancock's rally line was inactive on the field. ${percent(army)} of starting army strength remained; more than 64% earns a decisive result, otherwise a limited result.`);
  if (!facts.effectiveUnion || center < .3 || shaken >= 3) {
    const trigger = !facts.effectiveUnion ? 'No effective Union formations remained' : center < .3 ? `Union center strength fell below 30% (${percent(center)})` : 'All three Union center formations were shaken';
    return resolved('center-collapse', army > .6 ? 'decisive-win' : 'costly-win',
      `${trigger}. ${percent(army)} of starting army strength remained; more than 60% earns a decisive result, otherwise a limited result.`);
  }
  if (!facts.effectiveConfederates || army < .28) return resolved('army-collapse', 'rout',
    !facts.effectiveConfederates ? 'No effective Confederate formations remained after the winning conditions were checked.' : `Starting army strength fell below 28% (${percent(army)}) after the winning conditions were checked.`);
  if (snapshot.time < deadline) return null;
  if (surprise && center < .6 && army > .56) return resolved('deadline-pressure', choiceId === 'option_a' ? 'costly-win' : 'decisive-win',
    `At the field deadline, timely surprise, Union center strength below 60% (${percent(center)}) and army strength above 56% (${percent(army)}) met the pressure condition. The immediate heights plan receives a limited victory here; the other plans receive a decisive victory.`);
  if (union + .04 < army) return resolved('deadline-advantage', 'costly-win',
    `At the field deadline, retained army strength (${percent(army)}) exceeded retained Union strength (${percent(union)}) by more than four percentage points, earning a limited field victory.`);
  if (army > .55) return resolved('deadline-preservation', facts.escaped >= .65 ? 'disciplined-withdrawal' : 'defeat',
    facts.escaped >= .65
      ? `The field deadline arrived without a winning condition. Army strength remained above 55% and ${percent(facts.escaped)} of starting strength had withdrawn in order, meeting the 65% exit requirement. The attack mission remained incomplete.`
      : `The field deadline arrived without a winning condition. Army strength remained above 55%, but only ${percent(facts.escaped)} of starting strength had withdrawn in order; the required 65% organized exit was incomplete, so the field result was defeat.`);
  return resolved('deadline-loss', army > .42 ? 'defeat' : 'rout',
    `The field deadline arrived without a winning condition. ${percent(army)} of starting army strength remained; more than 42% yields defeat, otherwise rout.`);
}

export function getGettysburgJacksonMissionPresentation(snapshot, choiceId) {
  if (snapshot?.scenarioId !== 'gettysburg_jackson' || !config.postures[choiceId]) return null;
  const facts = readFacts(snapshot);
  const deadline = snapshot.gettysburgJackson?.missionDeadline ?? config.maxTime;
  const surpriseDeadline = snapshot.gettysburgJackson?.surpriseDeadline ?? config.postures[choiceId].surpriseDeadline;
  const result = snapshot.decision || snapshot.outcome;
  const finished = Object.hasOwn(results, result);
  const conditions = facts ? choiceId === 'option_a' ? [
    condition('Timely surprise contact', snapshot.surpriseState === 'triggered', `Contact window: minute ${surpriseDeadline}. ${snapshot.surpriseState === 'triggered' ? 'Contact recorded' : snapshot.surpriseState === 'expired' ? 'Window missed' : 'Contact pending'}.`),
    condition('Hancock is not active on the field', !facts.hancockActive, facts.hancockActive ? "Hancock's rally line is active."
      : facts.hancockWithdrawn ? "Hancock's rally line previously entered and departed; it is currently inactive."
        : facts.hancockParticipated ? "Hancock's rally line previously entered; it is currently inactive on the field."
          : facts.hancockEta > 0 ? `Entry has not been recorded; scheduled arrival in ${Math.ceil(facts.hancockEta)} field minutes.` : 'Entry has not been recorded; the scheduled arrival time has passed.'),
    condition('Two Jackson divisions in the upper heights area', facts.attackersOnHeights >= 2, `${facts.attackersOnHeights} / 2 active divisions with centers at Y ≤ 475; broken divisions do not count.`),
    condition('Two Union center formations shaken', facts.shakenCenter >= 2, `${facts.shakenCenter} / 2. Broken, routing, morale ≤ 30 or cohesion ≤ 24; the center includes the hill batteries.`),
    condition('Decisive immediate attack strength', facts.confederateRatio > .64, `${percent(facts.confederateRatio)} retained; must exceed 64%. At 64% or less this attack route gives a limited victory.`),
  ] : [
    condition('Union center collapse', !facts.effectiveUnion || facts.centerRatio < .3 || facts.shakenCenter >= 3, `${facts.shakenCenter} / 3 shaken; center strength ${percent(facts.centerRatio)} / below 30%; ${facts.effectiveUnion} effective Union formations remain. Any one of these collapse tests can win.`),
    ...(choiceId === 'option_b' ? [condition('Timely surprise for selected mission credit', snapshot.surpriseState === 'triggered', `Contact by minute ${surpriseDeadline} is required alongside a field victory for this selected mission’s grade.`)] : []),
  ] : [];
  const routes = [
    'Union center collapse can win any opening: no effective Union formations, center strength below 30%, or all three center formations shaken. Retain more than 60% of starting army strength for a decisive result; otherwise the result is limited.',
    'An army with no effective Confederate formations or less than 28% of starting strength routs if an earlier winning condition has not applied.',
    `At minute ${deadline}, timely surprise with center strength below 60% and army strength above 56% gives the immediate heights plan a limited victory and other plans a decisive victory. Otherwise, an army strength advantage of more than four percentage points gives a limited victory.`,
    snapshot.fieldBattle
      ? 'Without a winning deadline condition, more than 55% army strength permits organized withdrawal only if at least 65% of starting strength has already withdrawn in order; otherwise it is defeat. With 55% or less remaining, more than 42% means defeat, otherwise rout. If no active Confederate formations can hold the field and no reinforcements remain pending, 40% withdrawn in order gives defeat, otherwise rout.'
      : 'Under the earlier command rules, without a winning deadline condition, more than 55% army strength gives organized withdrawal; more than 42% gives defeat, otherwise rout.',
  ];
  let resolution = null;
  let resultRationale = null;
  if (finished) {
    // Earlier command rules change the losing army during result playback.
    // Partial imported snapshots also lack the facts needed to identify a path.
    if (facts?.field) {
      const candidate = frozenResolution(snapshot, choiceId, facts, deadline);
      if (candidate?.result === result) resolution = candidate;
    }
    resultRationale = resolution?.explanation || `${results[result]} was recorded. The available formation record does not establish the exact deciding condition; review the recorded result and mission evidence.`;
  }
  return {
    title: choiceId === 'option_a' ? 'Immediate heights attack conditions' : 'Jackson field victory conditions',
    summary: choiceId === 'option_a' ? `${conditions.filter(item => item.satisfied).length} / ${conditions.length} immediate attack conditions met` : facts ? `${facts.shakenCenter} / 3 Union center formations shaken` : 'Formation conditions unavailable',
    note: choiceId === 'option_a'
      ? 'These conditions describe the immediate heights attack route. Center collapse and deadline pressure can also decide the battle. The hill markers continue to show actual presence, including contested ground.'
      : 'A collapse of the Union center or a favorable deadline result can win this opening. The hill markers continue to show actual presence, including contested ground.',
    conditions, routes, resultRationale, resolution,
    missionRequirement: choiceId === 'option_a' ? 'Selected mission: decisive victory with timely surprise. A limited victory leaves it incomplete.'
      : choiceId === 'option_b' ? 'Selected mission: decisive or limited victory with timely surprise.' : 'Selected mission: decisive or limited victory.',
  };
}
