import { insideFieldZone } from './fieldBattleProfiles.js';
import { objectiveControl, objectiveOrganized, recordObjectiveProgress } from './objectiveControl.js';

const SCREEN = new Set(['kennesaw-maney', 'kennesaw-vaughan']);
const MITCHELL = 'kennesaw-mitchell';
const BATTERY = 'kennesaw-mebane';
const RETAINED_GOAL = .65;
const APPROACH = {
  'kennesaw-mccook': { x: 666, y: 319 },
  'kennesaw-harker': { x: 854, y: 318 },
  [MITCHELL]: { x: 571, y: 404 },
};

export const KENNESAW_MISSIONS = Object.freeze({
  option_a: {
    title: 'Hold the Dead Angle against the renewed attack',
    assessment: 'Hold the Dead Angle under pressure with both brigades',
    kind: 'hold',
    deadline: 54,
    holdMinutes: 9,
    result: 'costly-win',
    orders: [
      'Move Vaughan’s infantry into the Dead Angle beside Maney. Both formations must be holding inside the marked sector.',
      'After Mitchell’s supporting infantry makes contact and the defenders come under fire, hold the Dead Angle clear of organized Union troops for nine uninterrupted field minutes.',
    ],
    replay: 'Use Move to bring Vaughan onto the Dead Angle works early. Watch for both infantry formations to finish moving and for the support wave. Keep the line in place until all nine minutes count.',
  },
  option_b: {
    title: 'Cover the battery’s withdrawal down the Southern Road',
    assessment: 'Cover Mebane’s battery and get the force out in order',
    kind: 'withdraw',
    deadline: 78,
    holdMinutes: 6,
    result: 'disciplined-withdrawal',
    orders: [
      'Move Mebane’s battery to the center of the Southern Road sector and let the move finish. Keep Maney and Vaughan at the Dead Angle.',
      'After the supporting Union infantry makes contact and the defenders come under fire, keep the Dead Angle clear for six uninterrupted field minutes. The reserve can withdraw early.',
      'When the screen is confirmed, withdraw Mebane and wait for the battery’s withdrawal order to take effect. Then withdraw Maney and Vaughan. Get both brigades and the guns out in order with at least 65% of starting strength.',
    ],
    replay: 'Move Mebane to the Southern Road first and let the battery finish moving. Hold Maney and Vaughan at the Dead Angle through the six-minute screen. Start withdrawing Mebane before pulling both covering formations back.',
  },
});

export function directKennesawPressure(engine) {
  for (const unit of engine.state) {
    const approach = APPROACH[unit.id];
    if (!approach || unit.order !== 'hold' || !objectiveOrganized(unit)
      || ['shaken', 'wavering'].includes(unit.condition)) continue;
    const target = engine.time >= 41 ? { ...approach, y: 405 } : approach;
    if (Math.hypot(unit.x - target.x, unit.y - target.y) < 18) continue;
    Object.assign(unit, { order: 'assault', directMove: false, assaultSector: null, target });
  }
}

const check = (label, satisfied, detail) => ({ label, satisfied, detail });
const settled = unit => unit.order === 'hold' && !unit.pendingCommand && !unit.directMove;

export function updateKennesawMission(engine, dt = 0) {
  const mission = KENNESAW_MISSIONS[engine.choiceId];
  if (!mission) return false;
  const field = engine.fieldBattle;
  const previous = field.kennesaw;
  if (previous && previous.status !== 'tracking') return true;

  const withdrawing = mission.kind === 'withdraw';
  const sector = field.sectors.find(site => site.id === 'center');
  const { supported, defenders } = objectiveControl(engine.state, sector, 'attack');
  const anchors = supported.filter(unit => SCREEN.has(unit.id) && settled(unit));
  const support = engine.state.find(unit => unit.id === MITCHELL);
  const supportEngaged = support.lastVolleyAt >= 0 || support.lastIncomingAt >= 0;
  const tested = Boolean(previous?.tested || anchors.some(unit => unit.lastIncomingAt >= 0 && engine.time - unit.lastIncomingAt <= 2));
  const before = previous?.held || 0;
  const confirmed = withdrawing && before >= mission.holdMinutes;
  const ready = anchors.length === SCREEN.size && defenders.length === 0 && tested && supportEngaged;
  const interval = ready ? before + dt : 0;
  const held = confirmed || interval + 1e-8 >= mission.holdMinutes ? mission.holdMinutes : interval;
  const intervalMet = held >= mission.holdMinutes;
  recordObjectiveProgress(field, engine.time, before, held, sector.name);

  const army = engine.state.filter(unit => unit.side === 'confederate');
  const battery = army.find(unit => unit.id === BATTERY);
  const road = field.zones.find(zone => zone.kind === 'road');
  const gunsReachedRoad = withdrawing && Boolean(previous?.gunsReachedRoad || (
    objectiveOrganized(battery) && settled(battery) && !battery.gunsAbandoned && insideFieldZone(battery, road)));
  const exits = army.filter(unit => unit.withdrawn && unit.withdrawalOrganized && unit.departureReason === 'rear-exit');
  const gunsEscaped = exits.includes(battery) && !battery.gunsAbandoned;
  const escaped = exits.reduce((sum, unit) => sum + unit.strength, 0) / Math.max(1, engine.initialConfederate);
  const screenEscaped = exits.filter(unit => SCREEN.has(unit.id)).length;
  const gunsLeading = withdrawing && Boolean(previous?.gunsLeading || (
    intervalMet && gunsReachedRoad && (battery.order === 'withdraw' || gunsEscaped) && anchors.length === SCREEN.size));

  if (gunsReachedRoad && !previous?.gunsReachedRoad) {
    engine.events.push({ time: engine.time, type: 'objective', message: 'Mebane’s battery reached the Southern Road. Keep the infantry at the Dead Angle until the screen is confirmed.' });
  }
  if (withdrawing && intervalMet && !confirmed) {
    engine.events.push({ time: engine.time, type: 'objective', message: 'The Dead Angle screen has held. Get Mebane onto the Southern Road if needed, then send the battery out first.' });
  }
  if (gunsLeading && !previous?.gunsLeading) {
    engine.events.push({ time: engine.time, type: 'objective', message: 'Mebane’s battery is withdrawing with both brigades still in place. Maney and Vaughan can now withdraw.' });
  }

  const conditions = [
    check('Union support wave engaged', supportEngaged, supportEngaged ? 'Mitchell’s infantry made contact'
      : support.participated ? 'Mitchell’s infantry approaching' : 'Awaiting Mitchell’s infantry'),
    check('Dead Angle defenders under fire', tested, tested ? 'Contact recorded' : 'Awaiting Union fire'),
    check('Maney and Vaughan holding the Dead Angle', intervalMet || anchors.length === SCREEN.size,
      withdrawing && intervalMet ? 'Screen confirmed' : `${anchors.length} / 2 formations`),
    check('Dead Angle clear of organized Union troops', withdrawing && intervalMet || defenders.length === 0,
      withdrawing && intervalMet ? 'Clear during the screen' : defenders.length ? `${defenders.length} contesting` : 'Clear'),
    check(withdrawing ? 'Uninterrupted screen' : 'Uninterrupted hold', intervalMet,
      `${Math.floor(held * 10) / 10} / ${mission.holdMinutes} min`),
  ];
  if (withdrawing) conditions.push(
    check('Mebane’s battery staged on the Southern Road', gunsReachedRoad, gunsReachedRoad ? 'Move completed' : 'Move to the center of the Southern Road'),
    check('Battery sent out ahead of the screen', gunsLeading, gunsLeading ? 'Cover still in place when guns began withdrawing' : 'Keep both brigades in place until the battery starts to withdraw'),
    check('Mebane’s guns withdrawn in order', gunsEscaped, gunsEscaped ? 'Guns and crew escaped' : 'Awaiting the battery at the rear exits'),
    check('Covering formations withdrawn in order', screenEscaped === SCREEN.size, `${screenEscaped} / 2 formations`),
    check('Starting strength withdrawn in order', escaped >= RETAINED_GOAL, `${Math.floor(escaped * 100)}% / 65%`),
  );
  const achieved = conditions.every(condition => condition.satisfied);
  const finished = achieved || engine.time + 1e-8 >= mission.deadline || !army.some(unit => unit.active);
  const status = achieved ? 'achieved' : finished ? 'failed' : 'tracking';
  const title = achieved ? (withdrawing ? 'Dead Angle screened and guns withdrawn' : 'Dead Angle held through the renewed attack')
    : finished ? 'Kennesaw Mountain objective incomplete' : mission.title;
  const detail = [...conditions.map(condition => `${condition.label} · ${condition.detail}`),
    ...(!finished ? [`By minute ${mission.deadline}`] : [])].join(' • ');
  field.kennesaw = { title, detail, conditions, status, deadline: mission.deadline, held, tested, escaped, gunsReachedRoad, gunsLeading, gunsEscaped, screenEscaped, replay: mission.replay };
  if (finished) {
    engine.events.push({ time: engine.time, type: achieved ? 'objective' : 'warning', message: `${title}. ${detail}` });
    engine.beginResolution(achieved ? mission.result : 'defeat');
  }
  return true;
}
