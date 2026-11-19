import { insideObjective, objectiveControl, objectiveOrganized } from './objectiveControl.js';

const LIGHT_DIVISION = 'antietam-light-division';
const WITHDRAWAL_THRESHOLD = .65;
const BRIDGE_HOLD = 8;

export const ANTIETAM_MISSIONS = Object.freeze({
  option_a: {
    title: 'Hold the Bloody Lane',
    deadline: 60,
    replay: 'Keep D. H. Hill and Anderson together within the Bloody Lane sector. Use the tactical overlay to see the sector boundary and bring support when either formation has to fall back.',
    orders: [
      'At minute 60, keep two supporting infantry formations within 340 field units of each other in the Bloody Lane sector. Keep organized Union troops out.',
      'The sector must have been defended under fire. Hold the prepared line and reinforce it only if the center needs help.',
    ],
  },
  option_b: {
    title: 'Withdraw the army in order',
    deadline: 74,
    replay: 'Use Withdraw on the opening formations while they are still organized. Give A. P. Hill his own withdrawal order when the reserve reaches the field.',
    orders: [
      'Withdraw at least 65% of your starting strength in order by minute 74. Use Withdraw to send formations to the Confederate rear exits.',
      'A. P. Hill is due at minute 38 and counts toward starting strength. Keep his arrival area clear and issue the reserve its own withdrawal order.',
    ],
  },
  option_c: {
    title: 'Keep the left and center connected',
    deadline: 72,
    replay: 'Keep the center in position. Reinforce the Cornfield with Hood as the pressure builds, then clear organized Federal troops from the sector.',
    orders: [
      'At minute 72, hold the Cornfield and Bloody Lane with organized infantry. Keep at least one formation in each sector with another organized infantry formation within 340 field units.',
      'Both positions must have come under fire and be clear of organized Union troops at the deadline.',
    ],
  },
  option_d: {
    title: 'Recover the Lower Bridge approach',
    deadline: 92,
    replay: 'Stage A. P. Hill near the left edge of the Lower Bridge sector and Toombs near its right edge. Finish moving before exchanging fire and hold the ground together.',
    orders: [
      'In this alternate plan, send A. P. Hill and supporting infantry to Lower Bridge after his arrival at minute 46.',
      'Use Move to bring Hill to the left edge of the sector and Toombs to the right edge. Finish their moves, then hold and fight together.',
      'Hold the sector clear of organized Union troops for eight continuous minutes with Hill and at least one supporting infantry formation within 340 field units. Finish by minute 92.',
    ],
  },
});

const condition = (label, satisfied, detail) => ({ label, satisfied, detail });
const defending = unit => unit.type === 'infantry' && objectiveOrganized(unit)
  && !unit.directMove && !['withdraw', 'fallback', 'rally'].includes(unit.order);
const isInOrder = unit => unit.withdrawn && unit.withdrawalOrganized
  && !['broken', 'routing', 'surrendered'].includes(unit.status);
const clock = time => Math.floor(time + 1e-8);

function defenseCondition(e, sectorId, underFire, minimum) {
  const sector = e.fieldBattle.sectors.find(site => site.id === sectorId);
  const infantry = e.state.filter(unit => unit.side === 'confederate' && defending(unit));
  const inSector = infantry.filter(unit => insideObjective(unit, sector));
  const supported = inSector.filter(unit => (minimum === 1 ? infantry : inSector).some(friend =>
    friend !== unit && Math.hypot(friend.x - unit.x, friend.y - unit.y) <= 340));
  const enemies = e.state.filter(unit => unit.side === 'union' && objectiveOrganized(unit) && insideObjective(unit, sector));
  const tested = underFire || inSector.some(unit => unit.lastIncomingAt >= 0 && e.time - unit.lastIncomingAt < 2);
  return { tested, row: condition(sector.name, supported.length >= minimum && enemies.length === 0 && tested,
    `${supported.length}/${minimum} supported · ${enemies.length} enemy · ${tested ? 'Under fire recorded' : 'Awaiting contact'}`) };
}

// Only this new board persists the mission journal, inside the existing field
// checkpoint. Resolved evidence is retained while formations leave the board.
export function updateAntietamMission(e, dt = 0) {
  const mission = ANTIETAM_MISSIONS[e.choiceId] || ANTIETAM_MISSIONS.option_a;
  const previous = e.fieldBattle.antietam;
  if (previous?.status === 'achieved' || previous?.status === 'failed') return;
  const atDeadline = e.time + 1e-8 >= mission.deadline;
  const army = e.state.filter(unit => unit.side === 'confederate');
  const available = army.some(unit => unit.active && !['broken', 'surrendered'].includes(unit.status));
  const waiting = army.some(unit => !unit.active && !unit.participated && unit.arrivalTime != null && unit.arrivalTime <= mission.deadline);
  const completeArmy = !available && !waiting;
  let underFire = previous?.underFire || {};
  let held = previous?.held || 0;
  let conditions;
  let achieved = false;
  if (e.choiceId === 'option_b') {
    const escaped = army.filter(isInOrder).reduce((n, unit) => n + unit.strength, 0) / Math.max(1, e.initialConfederate);
    conditions = [condition('Starting strength withdrawn in order', escaped >= WITHDRAWAL_THRESHOLD,
      `${Math.floor(escaped * 100)}% / 65%`)];
    achieved = (atDeadline || completeArmy) && conditions[0].satisfied;
  } else if (e.choiceId === 'option_d') {
    const sector = e.fieldBattle.sectors.find(site => site.id === 'right');
    const { supported, defenders } = objectiveControl(e.state, sector, 'attack');
    const lightDivision = supported.some(unit => unit.id === LIGHT_DIVISION);
    held = lightDivision && defenders.length === 0 ? Math.min(BRIDGE_HOLD, held + dt) : 0;
    if (held + 1e-8 >= BRIDGE_HOLD) held = BRIDGE_HOLD;
    const hillArrived = army.some(unit => unit.id === LIGHT_DIVISION && unit.participated);
    conditions = [
      condition('A. P. Hill and a supporting formation in the sector', lightDivision,
        hillArrived ? `${supported.length} supporting infantry · ${defenders.length} enemy` : 'Expected at minute 46'),
      condition('Uninterrupted bridge control', held + 1e-8 >= BRIDGE_HOLD, `${(Math.floor((held + 1e-8) * 10) / 10).toFixed(1)} / ${BRIDGE_HOLD} min`),
    ];
    achieved = conditions.every(row => row.satisfied);
  } else {
    const twoSectors = e.choiceId === 'option_c';
    const lane = defenseCondition(e, 'center', underFire.center, twoSectors ? 1 : 2);
    const cornfield = twoSectors ? defenseCondition(e, 'left', underFire.left, 1) : null;
    underFire = { center: lane.tested, ...(cornfield ? { left: cornfield.tested } : {}) };
    conditions = [...(cornfield ? [cornfield.row] : []), lane.row,
      condition('Defensive interval completed', atDeadline, `${Math.min(mission.deadline, clock(e.time))} / ${mission.deadline} min`)];
    achieved = conditions.every(row => row.satisfied);
  }
  const finished = achieved || atDeadline || completeArmy;
  const status = achieved ? 'achieved' : finished ? 'failed' : 'tracking';
  const title = achieved ? e.choiceId === 'option_b' ? 'Army withdrawn in order' : 'Field objective secured'
    : finished ? 'Field objective incomplete' : mission.title;
  const pendingReserve = !finished && e.choiceId === 'option_b' && army.find(unit =>
    unit.id === LIGHT_DIVISION && !unit.participated && Number.isFinite(unit.arrivalTime));
  const detail = [...conditions.map(row => `${row.label} · ${row.detail}`),
    ...(pendingReserve ? [pendingReserve.arrivalBlocked ? 'Clear A. P. Hill’s arrival area' : 'A. P. Hill due at minute 38'] : []),
    ...(finished ? [] : [`By minute ${mission.deadline}`])].join(' • ');
  e.fieldBattle.antietam = { title, detail, conditions, status, deadline: mission.deadline, underFire, held, replay: mission.replay };
  if (finished) {
    e.events.push({ time: e.time, type: achieved ? 'objective' : 'warning', message: `${title}. ${detail}` });
    e.beginResolution(achieved ? e.choiceId === 'option_b' ? 'disciplined-withdrawal' : 'costly-win' : 'defeat');
  }
}
