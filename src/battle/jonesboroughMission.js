import { objectiveControl, objectiveOrganized, recordObjectiveProgress } from './objectiveControl.js';

const CROSSING_HOLD = 7;
const CROSSING_DEADLINE = 39;
const EVACUATION_DEADLINE = 32;
const EVACUATION_STRENGTH = .72;

export const JONESBOROUGH_MISSIONS = Object.freeze({
  option_a: {
    title: 'Reopen the rail crossing',
    assessment: 'Secure the rail crossing for a temporary reopening',
    kind: 'attack',
    deadline: CROSSING_DEADLINE,
    result: 'costly-win',
    orders: [
      'Take the rail crossing with two organized infantry formations and keep the sector clear of Union troops for seven uninterrupted field minutes.',
      'Govan and Granbury can converge from opposite sides while Carter holds the salient. Finish moving before counting on their support. Secure the crossing by minute 39.',
    ],
    replay: 'Bring Govan and Granbury onto opposite sides of the rail crossing together. Leave Carter in the salient so the pressure west of the tracks does not split your counterattack.',
  },
  option_b: {
    title: 'Withdraw toward Lovejoy’s Station',
    assessment: 'Withdraw at least 72% in order and recover Hardee’s battery',
    kind: 'withdraw',
    deadline: EVACUATION_DEADLINE,
    result: 'disciplined-withdrawal',
    orders: [
      'Withdraw at least 72% of starting strength through the marked southern exits by minute 32.',
      'Bring Hardee’s battery out in order without abandoning its guns. Give the battery time to limber and order the more distant infantry out early.',
    ],
    replay: 'Hardee’s battery is slower than the infantry. Order it and Carter’s distant formation out early, and check both the strength and battery requirements at the exit.',
  },
});

const UNION_ORDERS = {
  'jonesborough-carlin': 'left',
  'jonesborough-baird': 'left',
  'jonesborough-stanley': 'center',
};

export function directJonesboroughAssaults(engine) {
  for (const unit of engine.state) {
    const sectorId = UNION_ORDERS[unit.id];
    if (!sectorId || !objectiveOrganized(unit) || ['wavering', 'shaken'].includes(unit.condition)
      || !['hold', 'advance'].includes(unit.order)) continue;
    const target = engine.fieldBattle.sectors.find(sector => sector.id === sectorId);
    if (Math.hypot(unit.x - target.x, unit.y - target.y) < 18) continue;
    Object.assign(unit, { order: 'assault', directMove: false, assaultSector: sectorId, target: { x: target.x, y: target.y } });
  }
}

export function updateJonesboroughMission(engine, dt = 0) {
  const mission = JONESBOROUGH_MISSIONS[engine.choiceId];
  if (!mission) return false;
  const previous = engine.fieldBattle.jonesborough;
  if (previous && previous.status !== 'tracking') return true;
  const row = (label, satisfied, detail) => ({ label, satisfied, detail });
  const army = engine.state.filter(unit => unit.side === 'confederate');
  const noForceRemaining = !army.some(unit => unit.active);
  const atDeadline = engine.time + 1e-8 >= mission.deadline;
  let held = previous?.held || 0;
  let conditions;
  if (mission.kind === 'attack') {
    const crossing = engine.fieldBattle.sectors.find(sector => sector.id === 'center');
    const { supported, defenders } = objectiveControl(engine.state, crossing, 'attack');
    const before = held;
    held = supported.length >= 2 && !defenders.length ? held + dt : 0;
    if (held + 1e-8 >= CROSSING_HOLD) held = CROSSING_HOLD;
    recordObjectiveProgress(engine.fieldBattle, engine.time, before, held, crossing.name);
    conditions = [
      row('Supported infantry at the crossing', supported.length >= 2, `${supported.length} / 2 formations`),
      row('Crossing clear of organized Union troops', defenders.length === 0, defenders.length
        ? `${defenders.length} ${defenders.length === 1 ? 'formation' : 'formations'} contesting the crossing` : 'Clear'),
      row('Uninterrupted rail window', held >= CROSSING_HOLD, `${Math.floor(held * 10) / 10} / ${CROSSING_HOLD} min`),
    ];
  } else {
    const orderedExits = army.filter(unit => unit.withdrawn && unit.withdrawalOrganized && unit.departureReason === 'rear-exit');
    const escaped = orderedExits.reduce((total, unit) => total + unit.strength, 0) / Math.max(1, engine.initialConfederate);
    const battery = orderedExits.find(unit => unit.id === 'jonesborough-battery' && !unit.gunsAbandoned);
    conditions = [
      row('Starting strength withdrawn in order', escaped >= EVACUATION_STRENGTH, `${Math.floor(escaped * 100)}% / 72%`),
      row('Hardee’s battery', Boolean(battery), battery ? 'Guns withdrawn in order' : 'Battery still needs an organized exit'),
    ];
  }
  const achieved = conditions.every(condition => condition.satisfied) && (mission.kind === 'attack' || atDeadline || noForceRemaining);
  const finished = achieved || atDeadline || noForceRemaining;
  const status = achieved ? 'achieved' : finished ? 'failed' : 'tracking';
  const title = achieved ? mission.kind === 'attack' ? 'Rail crossing reopened temporarily' : 'Army and battery withdrawn in order'
    : finished ? 'Field objective incomplete' : mission.title;
  const detail = [...conditions.map(condition => `${condition.label} · ${condition.detail}`),
    ...(!finished ? [`By minute ${mission.deadline}`] : [])].join(' • ');
  engine.fieldBattle.jonesborough = { title, detail, conditions, status, deadline: mission.deadline, held, replay: mission.replay };
  if (finished) {
    engine.events.push({ time: engine.time, type: achieved ? 'objective' : 'warning', message: `${title}. ${detail}` });
    engine.beginResolution(achieved ? mission.result : 'defeat');
  }
  return true;
}
