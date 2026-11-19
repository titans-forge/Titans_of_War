import { objectiveControl, objectiveOrganized, recordObjectiveProgress } from './objectiveControl.js';

const RIDGE_HOLD = 7;
const SCREEN_HOLD = 6;
const WITHDRAWAL_STRENGTH = .65;
const FAR_BANK = 390;

export const GAINES_MILL_MISSIONS = Object.freeze({
  option_a: {
    title: 'Cross Boatswain’s Creek and take Porter’s Ridge',
    assessment: 'Cross the ravine and hold a supported breach on Porter’s Ridge',
    kind: 'attack',
    deadline: 51,
    result: 'costly-win',
    orders: [
      'Send Hood and Law across Boatswain’s Creek together. Use Assault on Porter’s Ridge to let both brigades fight as they advance.',
      'Establish two organized, supporting infantry formations on the ridge. Keep the sector clear of organized Union formations for seven uninterrupted field minutes before the deadline.',
      'Bring Hill in on the screen left if the assault stalls or the brigades are short on ammunition.',
    ],
    replay: 'Send two brigades across together. If Porter’s troops delay either assault in the ravine, bring Hill forward as support and give the brigades room to deploy.',
  },
  option_b: {
    title: 'Cover the crossing and withdraw in order',
    assessment: 'Screen the ravine crossing under fire before withdrawing the army',
    kind: 'withdraw',
    deadline: 60,
    result: 'disciplined-withdrawal',
    orders: [
      'Move two infantry formations into Ravine Crossing to screen the retreat. After the screen comes under fire, hold the marked crossing together for six uninterrupted field minutes.',
      'Once the screen is confirmed, withdraw. At least 65% of starting strength must leave in order through the marked Confederate rear exits.',
    ],
    replay: 'Move Hood and Law into the crossing sector first. Let the screen finish its six-minute interval before withdrawing your last two covering formations.',
  },
});

export function directGainesMillPressure(engine) {
  if (engine.choiceId !== 'option_b') return;
  for (const unit of engine.state) {
    const x = unit.id === 'gaines-mill-sykes' ? 525 : unit.id === 'gaines-mill-slocum' ? 604 : null;
    if (x === null || !objectiveOrganized(unit) || ['shaken', 'wavering'].includes(unit.condition) || unit.order !== 'hold') continue;
    const target = { x, y: 383 };
    if (Math.hypot(unit.x - target.x, unit.y - target.y) < 18) continue;
    Object.assign(unit, { order: 'assault', directMove: false, assaultSector: null, target });
  }
}

const row = (label, satisfied, detail) => ({ label, satisfied, detail });

export function updateGainesMillMission(engine, dt = 0) {
  const mission = GAINES_MILL_MISSIONS[engine.choiceId];
  if (!mission) return false;
  const field = engine.fieldBattle;
  const previous = field.gainesMill;
  if (previous && previous.status !== 'tracking') return true;

  const attack = mission.kind === 'attack';
  const sector = field.sectors.find(site => site.id === (attack ? 'center' : 'left'));
  const { supported, defenders } = objectiveControl(engine.state, sector, 'attack');
  const army = engine.state.filter(unit => unit.side === 'confederate');
  const crossed = attack
    ? [...new Set([...(previous?.crossed || []), ...army
      .filter(unit => unit.type === 'infantry' && unit.y <= FAR_BANK && objectiveOrganized(unit))
      .map(unit => unit.id)])]
    : [];
  const alliedLine = attack ? supported.filter(unit => crossed.includes(unit.id)) : supported;
  const tested = Boolean(previous?.tested || (!attack && alliedLine.some(unit => unit.lastIncomingAt >= 0 && engine.time - unit.lastIncomingAt <= 2)));
  const before = previous?.held || 0;
  const required = attack ? RIDGE_HOLD : SCREEN_HOLD;
  const inControl = alliedLine.length >= 2 && defenders.length === 0 && (attack || tested);
  const screenConfirmed = !attack && before >= required;
  const interval = inControl ? before + dt : 0;
  const held = screenConfirmed || interval + 1e-8 >= required ? required : interval;
  recordObjectiveProgress(field, engine.time, before, held, sector.name);

  const intactExits = army.filter(unit => unit.withdrawn && unit.withdrawalOrganized && unit.departureReason === 'rear-exit');
  const escaped = intactExits.reduce((sum, unit) => sum + unit.strength, 0) / Math.max(1, engine.initialConfederate);
  const screenComplete = !attack && held >= required;
  if (screenComplete && before < required) {
    engine.events.push({ time: engine.time, type: 'objective', message: 'The screen has held. Withdraw the remaining formations to the marked Confederate rear exits.' });
  }

  const conditions = attack ? [
    row('Organized infantry across the ravine', crossed.length >= 2, `${crossed.length} / 2 formations reached the far bank`),
    row('Supported infantry on Porter’s Ridge', alliedLine.length >= 2, `${alliedLine.length} / 2 formations`),
    row('Ridge clear of organized Union troops', defenders.length === 0, defenders.length ? `${defenders.length} contesting` : 'Clear'),
    row('Uninterrupted ridge hold', held >= required, `${Math.floor(held * 10) / 10} / ${required} min`),
  ] : [
    row('Crossing screen under fire', tested, tested ? 'Contact recorded' : 'Awaiting Union fire'),
    row('Supported crossing defense', screenComplete || alliedLine.length >= 2, screenComplete ? 'Screen confirmed' : `${alliedLine.length} / 2 formations`),
    row('Uninterrupted screen', screenComplete, `${Math.floor(held * 10) / 10} / ${required} min`),
    row('Starting strength withdrawn in order', escaped >= WITHDRAWAL_STRENGTH, `${Math.floor(escaped * 100)}% / 65%`),
  ];
  const achieved = conditions.every(condition => condition.satisfied);
  const finished = achieved || engine.time + 1e-8 >= mission.deadline || !army.some(unit => unit.active);
  const status = achieved ? 'achieved' : finished ? 'failed' : 'tracking';
  const title = achieved ? (attack ? 'Porter’s Ridge breached' : 'Crossing covered and army withdrawn')
    : finished ? 'Field objective incomplete' : mission.title;
  const detail = [...conditions.map(condition => `${condition.label} · ${condition.detail}`),
    ...(!finished ? [`By minute ${mission.deadline}`] : [])].join(' • ');
  field.gainesMill = { title, detail, conditions, status, deadline: mission.deadline, held, crossed, tested, escaped, replay: mission.replay };
  if (finished) {
    engine.events.push({ time: engine.time, type: achieved ? 'objective' : 'warning', message: `${title}. ${detail}` });
    engine.beginResolution(achieved ? mission.result : 'defeat');
  }
  return true;
}
