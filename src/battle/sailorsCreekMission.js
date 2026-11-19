import { insideObjective, objectiveControl, objectiveOrganized, recordObjectiveProgress } from './objectiveControl.js';

const LEE = 'sailors-lee';
const KERSHAW = 'sailors-kershaw';
const ESCORT = 'sailors-escort';
const LEAD = new Set([LEE, ESCORT]);
const SCREEN = new Set([LEE, KERSHAW]);
const RETAINED_GOAL = .65;
const APPROACH = {
  'sailors-wheaton': { x: 689, y: 423 },
  'sailors-seymour': { x: 915, y: 427 },
  'sailors-keifer': { x: 564, y: 447 },
};

export const SAILORS_CREEK_MISSIONS = Object.freeze({
  option_a: {
    title: 'Secure a local window for the casualty escort',
    assessment: 'Hold the South Bank while the casualty escort reaches Aid Staging',
    kind: 'hold',
    deadline: 52,
    holdMinutes: 8,
    result: 'costly-win',
    orders: [
      'Move Kershaw into the South Bank sector beside Custis Lee. Keep both formations holding the heights under Union fire.',
      'Move the casualty escort into the separate Aid Staging sector and let it settle. Hold both positions clear for eight uninterrupted field minutes so aid parties can collect wounded.',
    ],
    replay: 'Move Kershaw beside Custis Lee and use Move to put the casualty escort in Aid Staging. Keep all three formations in place until the eight-minute aid window is secured.',
  },
  option_b: {
    title: 'Cover the lead column and withdraw by the West Road',
    assessment: 'Cover Custis Lee’s column and withdraw at least 65% through the western exits',
    kind: 'withdraw',
    deadline: 91,
    result: 'disciplined-withdrawal',
    orders: [
      'Order Custis Lee and the escort to Withdraw first. Leave Kershaw on the South Bank under fire until the lead column reaches the western exits.',
      'When the screen is confirmed, order Kershaw to Withdraw. Get both parts of the lead column and the covering infantry off the map through the western exits in order.',
    ],
    replay: 'Withdraw Custis Lee and the escort as soon as the field starts. Watch the western route and leave Kershaw at the South Bank until the screen is confirmed. Then withdraw Kershaw.',
  },
});

export function directSailorsCreekPressure(engine) {
  for (const unit of engine.state) {
    const approach = APPROACH[unit.id];
    if (!approach || unit.order !== 'hold' || !objectiveOrganized(unit)
      || ['shaken', 'wavering'].includes(unit.condition)) continue;
    const target = engine.time >= 41 ? { ...approach, y: 517 } : approach;
    if (Math.hypot(unit.x - target.x, unit.y - target.y) < 18) continue;
    Object.assign(unit, { order: 'assault', directMove: false, assaultSector: null, target });
  }
}

const check = (label, satisfied, detail) => ({ label, satisfied, detail });
const holding = unit => unit.order === 'hold' && !unit.pendingCommand && !unit.directMove;
const orderedExit = unit => unit.withdrawn && unit.withdrawalOrganized && unit.departureReason === 'rear-exit';

export function updateSailorsCreekMission(engine, dt = 0) {
  const mission = SAILORS_CREEK_MISSIONS[engine.choiceId];
  if (!mission) return false;
  const field = engine.fieldBattle;
  const previous = field.sailorsCreek;
  if (previous && previous.status !== 'tracking') return true;

  const army = engine.state.filter(unit => unit.side === 'confederate');
  const southBank = field.sectors.find(sector => sector.id === 'center');
  const aidStaging = field.sectors.find(sector => sector.id === 'right');
  const withdrawing = mission.kind === 'withdraw';
  const { supported, defenders } = objectiveControl(engine.state, southBank, 'attack');
  const anchors = supported.filter(unit => SCREEN.has(unit.id) && holding(unit));
  const rearguard = army.find(unit => unit.id === KERSHAW);
  const rearguardHolding = objectiveOrganized(rearguard) && insideObjective(rearguard, southBank) && holding(rearguard);
  const contact = Boolean(previous?.contact || (withdrawing ? rearguardHolding && rearguard.lastIncomingAt >= 0
    : anchors.some(unit => unit.lastIncomingAt >= 0)));
  const escort = army.find(unit => unit.id === ESCORT);
  const escortInPlace = !withdrawing && objectiveOrganized(escort) && insideObjective(escort, aidStaging) && holding(escort);
  const aidClear = !withdrawing && objectiveControl(engine.state, aidStaging, 'attack').defenders.length === 0;
  const exits = army.filter(orderedExit);
  const leadExited = withdrawing ? exits.filter(unit => LEAD.has(unit.id)).length : 0;
  const rearguardExited = withdrawing && exits.includes(rearguard);
  const screened = withdrawing && Boolean(previous?.screened || (
    leadExited === LEAD.size && contact && rearguardHolding && defenders.length === 0));
  const escaped = exits.reduce((sum, unit) => sum + unit.strength, 0) / Math.max(1, engine.initialConfederate);
  const conditions = [
    check('South Bank defenders under fire', contact, contact ? 'Contact recorded' : 'Awaiting fire across the creek'),
  ];
  if (withdrawing) {
    conditions.push(
      check('Custis Lee and escort through the western exits', leadExited === LEAD.size, `${leadExited} / 2 formations`),
      check('Kershaw screened the lead column', screened, screened ? 'South Bank held until the lead column escaped'
        : 'Keep Kershaw holding the South Bank until both formations escape'),
      check('Kershaw through the western exits in order', rearguardExited, rearguardExited ? 'Rear guard escaped' : 'Awaiting the rear guard'),
      check('Starting strength withdrawn in order', escaped >= RETAINED_GOAL, `${Math.floor(escaped * 100)}% / 65%`),
    );
    if (screened && !previous?.screened) {
      engine.events.push({ time: engine.time, type: 'objective', message: 'Custis Lee and the escort have cleared the western exits. Order Kershaw to withdraw now.' });
    }
  } else {
    conditions.push(
      check('Kershaw and Custis Lee holding the South Bank', anchors.length === SCREEN.size, `${anchors.length} / 2 formations`),
      check('South Bank clear of organized Union troops', defenders.length === 0, defenders.length ? `${defenders.length} contesting` : 'Clear'),
      check('Casualty escort holding Aid Staging', escortInPlace, escortInPlace ? 'Escort in position' : 'Move the escort inside Aid Staging and let it settle'),
      check('Aid Staging clear of organized Union troops', aidClear, aidClear ? 'Clear' : 'Contested'),
    );
  }
  const before = previous?.held || 0;
  const interval = !withdrawing && conditions.every(row => row.satisfied) ? before + dt : 0;
  const held = !withdrawing && interval + 1e-8 >= mission.holdMinutes ? mission.holdMinutes : interval;
  if (!withdrawing) {
    recordObjectiveProgress(field, engine.time, before, held, 'South Bank aid screen');
    conditions.push(check('Uninterrupted aid window', held >= mission.holdMinutes,
      `${Math.floor(held * 10) / 10} / ${mission.holdMinutes} min`));
  }

  const achieved = conditions.every(row => row.satisfied);
  const finished = achieved || engine.time + 1e-8 >= mission.deadline || !army.some(unit => unit.active);
  const status = achieved ? 'achieved' : finished ? 'failed' : 'tracking';
  const title = achieved ? (withdrawing ? 'Lead column covered and force withdrawn' : 'Aid window secured on the South Bank')
    : finished ? 'Sailor’s Creek objective incomplete' : mission.title;
  const detail = [...conditions.map(row => `${row.label} · ${row.detail}`),
    ...(!finished ? [`By minute ${mission.deadline}`] : [])].join(' • ');
  field.sailorsCreek = { title, detail, conditions, status, deadline: mission.deadline, held, contact, escortInPlace, leadExited, rearguardExited, screened, escaped, replay: mission.replay };
  if (finished) {
    engine.events.push({ time: engine.time, type: achieved ? 'objective' : 'warning', message: `${title}. ${detail}` });
    engine.beginResolution(achieved ? mission.result : 'defeat');
  }
  return true;
}
