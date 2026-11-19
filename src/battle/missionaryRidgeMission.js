import { objectiveControl, objectiveOrganized, recordObjectiveProgress } from './objectiveControl.js';

const CREST_LINE = new Set(['missionary-ridge-anderson', 'missionary-ridge-bate']);
const UNION_REINFORCEMENT = 'missionary-ridge-baird';
const RETAINED_GOAL = .65;
const PRESSURE_TARGETS = {
  'missionary-ridge-wood': { x: 922, y: 309 },
  'missionary-ridge-sheridan': { x: 927, y: 468 },
  [UNION_REINFORCEMENT]: { x: 916, y: 240 },
};
const PRESS_CREST_AT = 34;

export const MISSIONARY_RIDGE_MISSIONS = Object.freeze({
  option_a: {
    title: 'Hold the Main Crest long enough to buy time',
    assessment: 'Delay the Union attack on the Main Crest with a supported line',
    kind: 'hold',
    deadline: 47,
    holdMinutes: 9,
    result: 'costly-win',
    orders: [
      'Move Bate’s infantry onto the Main Crest beside Anderson. Finish the movement so both formations are holding and can return fire.',
      'Keep both formations organized on the crest for nine uninterrupted field minutes after Baird’s supporting line arrives and the defense comes under fire.',
      'This is a local delaying action. The rest of the Union assault continues.',
    ],
    replay: 'Bring Bate into the Main Crest early so he can hold the works alongside Anderson. Pause to review contact and keep both formations in position until the interval finishes.',
  },
  option_b: {
    title: 'Cover the crest and withdraw through the eastern exits',
    assessment: 'Screen the withdrawal and get the force out in order toward Dalton',
    kind: 'withdraw',
    deadline: 67,
    holdMinutes: 6,
    result: 'disciplined-withdrawal',
    orders: [
      'Keep Anderson and Bate on the Main Crest while the rear formations begin withdrawing east. After contact and the Union reinforcement, keep the crest clear for six uninterrupted field minutes.',
      'When the screen is confirmed, withdraw Anderson and Bate. Both covering formations must leave in order, with at least 65% of starting strength through the eastern exits.',
    ],
    replay: 'Withdraw the battery and rear infantry early. Keep Anderson and Bate at the crest until the six-minute screen is confirmed, then order both to Withdraw.',
  },
});

export function directMissionaryRidgePressure(engine) {
  for (const unit of engine.state) {
    const approach = PRESSURE_TARGETS[unit.id];
    if (!approach || unit.order !== 'hold' || !objectiveOrganized(unit)
      || ['shaken', 'wavering'].includes(unit.condition)) continue;
    // The first movement brings the Union line into range on the slope. A
    // later push tries to carry the inner works if the sector is still open.
    const target = engine.time >= PRESS_CREST_AT ? { ...approach, x: 1005 } : { ...approach };
    if (Math.hypot(unit.x - target.x, unit.y - target.y) < 18) continue;
    Object.assign(unit, { order: 'assault', directMove: false, assaultSector: null, target });
  }
}

const check = (label, satisfied, detail) => ({ label, satisfied, detail });

export function updateMissionaryRidgeMission(engine, dt = 0) {
  const mission = MISSIONARY_RIDGE_MISSIONS[engine.choiceId];
  if (!mission) return false;
  const field = engine.fieldBattle;
  const previous = field.missionaryRidge;
  if (previous && previous.status !== 'tracking') return true;

  const withdrawing = mission.kind === 'withdraw';
  const sector = field.sectors.find(site => site.id === 'center');
  const { supported, defenders } = objectiveControl(engine.state, sector, 'attack');
  const anchors = supported.filter(unit => CREST_LINE.has(unit.id));
  const supportArrived = engine.state.some(unit => unit.id === UNION_REINFORCEMENT && unit.participated);
  const tested = Boolean(previous?.tested || anchors.some(unit => unit.lastIncomingAt >= 0 && engine.time - unit.lastIncomingAt <= 2));
  const before = previous?.held || 0;
  const confirmed = withdrawing && before >= mission.holdMinutes;
  const ready = anchors.length === CREST_LINE.size && defenders.length === 0 && tested && supportArrived;
  const interval = ready ? before + dt : 0;
  const held = confirmed || interval + 1e-8 >= mission.holdMinutes ? mission.holdMinutes : interval;
  const intervalMet = held >= mission.holdMinutes;
  recordObjectiveProgress(field, engine.time, before, held, sector.name);
  if (withdrawing && intervalMet && !confirmed) {
    engine.events.push({ time: engine.time, type: 'objective', message: 'The crest screen has held. Order Anderson and Bate to withdraw through the marked eastern exits.' });
  }

  const army = engine.state.filter(unit => unit.side === 'confederate');
  const exits = army.filter(unit => unit.withdrawn && unit.withdrawalOrganized && unit.departureReason === 'rear-exit');
  const escaped = exits.reduce((sum, unit) => sum + unit.strength, 0) / Math.max(1, engine.initialConfederate);
  const coveringExits = exits.filter(unit => CREST_LINE.has(unit.id)).length;
  const conditions = [
    check('Union reinforcement on the field', supportArrived, supportArrived ? 'Baird’s infantry arrived' : 'Awaiting Baird’s infantry'),
    check('Crest line under fire', tested, tested ? 'Contact recorded' : 'Awaiting Union fire'),
    check('Anderson and Bate holding the crest', intervalMet || anchors.length === CREST_LINE.size,
      withdrawing && intervalMet ? 'Screen confirmed' : `${anchors.length} / 2 formations`),
    check('Crest clear of organized Union troops', withdrawing && intervalMet || defenders.length === 0,
      withdrawing && intervalMet ? 'Clear during the screen' : defenders.length ? `${defenders.length} contesting` : 'Clear'),
    check(withdrawing ? 'Uninterrupted cover interval' : 'Uninterrupted delay interval', intervalMet,
      `${Math.floor(held * 10) / 10} / ${mission.holdMinutes} min`),
  ];
  if (withdrawing) conditions.push(
    check('Covering formations withdrawn in order', coveringExits === CREST_LINE.size, `${coveringExits} / 2 formations`),
    check('Starting strength withdrawn in order', escaped >= RETAINED_GOAL, `${Math.floor(escaped * 100)}% / 65%`),
  );
  const achieved = conditions.every(condition => condition.satisfied);
  const finished = achieved || engine.time + 1e-8 >= mission.deadline || !army.some(unit => unit.active);
  const status = achieved ? 'achieved' : finished ? 'failed' : 'tracking';
  const title = achieved ? (withdrawing ? 'Crest covered and force withdrawn' : 'Main Crest held long enough to delay the attack')
    : finished ? 'Missionary Ridge objective incomplete' : mission.title;
  const detail = [...conditions.map(condition => `${condition.label} · ${condition.detail}`),
    ...(!finished ? [`By minute ${mission.deadline}`] : [])].join(' • ');
  field.missionaryRidge = { title, detail, conditions, status, deadline: mission.deadline, held, tested, escaped, replay: mission.replay };
  if (finished) {
    engine.events.push({ time: engine.time, type: achieved ? 'objective' : 'warning', message: `${title}. ${detail}` });
    engine.beginResolution(achieved ? mission.result : 'defeat');
  }
  return true;
}
