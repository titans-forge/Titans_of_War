import { insideObjective, objectiveControl, objectiveOrganized, recordObjectiveProgress } from './objectiveControl.js';

const FRONT = new Set(['spotsylvania-gordon', 'spotsylvania-ramseur']);
const BATTERY = 'spotsylvania-battery';
const RESERVE = 'spotsylvania-reserve';
const UNION_SUPPORT = 'spotsylvania-wright';
const RESERVE_STAGING = { x: 785, y: 745, width: 280, height: 110 };
const RETAINED_RESERVE = .8;
const INTERIOR_PRESSURE = {
  'spotsylvania-barlow': { x: 826, y: 524 },
  'spotsylvania-birney': { x: 710, y: 526 },
  [UNION_SUPPORT]: { x: 674, y: 495 },
};
const WEST_PRESSURE = {
  'spotsylvania-barlow': { x: 672, y: 246 },
  [UNION_SUPPORT]: { x: 563, y: 299 },
};
const LATE_PRESSURE = { option_a: 35, option_b: 43 };

export const SPOTSYLVANIA_MISSIONS = Object.freeze({
  option_a: {
    title: 'Stabilize the Interior Line under pressure',
    assessment: 'Stabilize the shorter Interior Line with supporting guns',
    kind: 'hold',
    deadline: 51,
    holdMinutes: 9,
    result: 'costly-win',
    orders: [
      'Keep Gordon on the Interior Line. Move Ramseur into its eastern half. Move the field battery a little to his right and behind him, inside the marked works. Let the guns deploy.',
      'After Union support arrives and the line comes under fire, hold the sector clear with both infantry formations and the deployed battery for nine uninterrupted field minutes.',
      'This is a local defense. The May 12 fighting continues at the salient.',
    ],
    replay: 'Move Ramseur into the Interior Line and deploy the battery behind the infantry. A line without its deployed guns cannot complete this order.',
  },
  option_b: {
    title: 'Regain a section of the West Face',
    assessment: 'Recover part of the West Face with the interior reserve intact',
    kind: 'attack',
    deadline: 57,
    holdMinutes: 7,
    result: 'costly-win',
    orders: [
      'Order Gordon and Ramseur together to assault the West Face. Keep the interior reserve behind the second line; it must remain organized on Hold and retain at least 80% of its starting strength.',
      'After the supporting Union line arrives and your attackers take fire, clear this sector of organized opposition and hold it for seven uninterrupted field minutes.',
      'Recover only this section. The mission does not call for retaking the entire salient.',
    ],
    replay: 'Use Gordon and Ramseur to retake the West Face. Leave the interior reserve on Hold behind the second line so it can cover the position.',
  },
});

export function directSpotsylvaniaPressure(engine) {
  const counterattack = engine.choiceId === 'option_b';
  const approaches = counterattack ? WEST_PRESSURE : INTERIOR_PRESSURE;
  for (const unit of engine.state) {
    const approach = approaches[unit.id];
    if (!approach || unit.order !== 'hold' || !objectiveOrganized(unit)
      || ['shaken', 'wavering'].includes(unit.condition)) continue;
    const target = engine.time < LATE_PRESSURE[engine.choiceId] ? approach : counterattack
      ? { x: unit.id === UNION_SUPPORT ? 555 : 645, y: 374 }
      : { x: approach.x, y: 628 };
    if (Math.hypot(unit.x - target.x, unit.y - target.y) < 20) continue;
    Object.assign(unit, { order: 'assault', directMove: false, assaultSector: null, target: { ...target } });
  }
}

const check = (label, satisfied, detail) => ({ label, satisfied, detail });

export function updateSpotsylvaniaMission(engine, dt = 0) {
  const mission = SPOTSYLVANIA_MISSIONS[engine.choiceId];
  if (!mission) return false;
  const field = engine.fieldBattle;
  const previous = field.spotsylvania;
  if (previous && previous.status !== 'tracking') return true;

  const counterattack = mission.kind === 'attack';
  const sector = field.sectors.find(site => site.id === (counterattack ? 'left' : 'center'));
  const { supported, defenders } = objectiveControl(engine.state, sector, 'attack');
  const front = supported.filter(unit => FRONT.has(unit.id) && (counterattack || unit.order === 'hold'));
  const supportArrived = engine.state.some(unit => unit.id === UNION_SUPPORT && unit.participated);
  const tested = Boolean(previous?.tested || front.some(unit => unit.lastIncomingAt >= 0 && engine.time - unit.lastIncomingAt <= 2));
  const conditions = [
    check('Union supporting line on the field', supportArrived, supportArrived ? 'Wright’s infantry arrived' : 'Awaiting Wright’s infantry'),
    check(counterattack ? 'Advance under fire' : 'Interior Line under fire', tested, tested ? 'Contact recorded' : 'Awaiting Union fire'),
    check(counterattack ? 'Gordon and Ramseur supporting the West Face' : 'Gordon and Ramseur holding the Interior Line',
      front.length === FRONT.size, `${front.length} / 2 formations`),
  ];
  if (counterattack) {
    const reserve = engine.state.find(unit => unit.id === RESERVE);
    const staged = objectiveOrganized(reserve) && insideObjective(reserve, RESERVE_STAGING)
      && reserve.order === 'hold' && !reserve.directMove && !reserve.pendingCommand;
    const retention = reserve.strength / Math.max(1, reserve.initialStrength);
    conditions.push(check('Interior reserve organized and in position', staged && retention >= RETAINED_RESERVE,
      `${staged ? 'In reserve' : 'Needs Hold behind the line'} · ${Math.floor(retention * 100)}% / 80%`));
  } else {
    const battery = engine.state.find(unit => unit.id === BATTERY);
    const deployed = objectiveOrganized(battery) && insideObjective(battery, sector) && battery.y >= sector.y
      && battery.gunState === 'deployed' && !battery.directMove && !battery.pendingCommand && !battery.gunsAbandoned && battery.order === 'hold';
    conditions.push(check('Deployed battery behind the infantry', deployed, deployed ? 'Guns deployed' : 'Move the battery into the rear half of the sector and let it deploy'));
  }
  conditions.push(check(`${sector.name} clear of organized Union troops`, defenders.length === 0,
    defenders.length ? `${defenders.length} contesting` : 'Clear'));
  const before = previous?.held || 0;
  const interval = conditions.every(row => row.satisfied) ? before + dt : 0;
  const held = interval + 1e-8 >= mission.holdMinutes ? mission.holdMinutes : interval;
  const achieved = held >= mission.holdMinutes;
  recordObjectiveProgress(field, engine.time, before, held, sector.name);
  conditions.push(check('Uninterrupted hold', achieved, `${Math.floor(held * 10) / 10} / ${mission.holdMinutes} field minutes`));

  const finished = achieved || engine.time + 1e-8 >= mission.deadline
    || !engine.state.some(unit => unit.side === 'confederate' && unit.active);
  const status = achieved ? 'achieved' : finished ? 'failed' : 'tracking';
  const title = achieved ? (counterattack ? 'West Face section restored' : 'Interior Line stabilized')
    : finished ? 'Spotsylvania objective incomplete' : mission.title;
  const detail = [...conditions.map(row => `${row.label} · ${row.detail}`),
    ...(!finished ? [`By minute ${mission.deadline}`] : [])].join(' • ');
  field.spotsylvania = { title, detail, conditions, status, deadline: mission.deadline, held, tested, replay: mission.replay };
  if (finished) {
    engine.events.push({ time: engine.time, type: achieved ? 'objective' : 'warning', message: `${title}. ${detail}` });
    engine.beginResolution(achieved ? mission.result : 'defeat');
  }
  return true;
}
