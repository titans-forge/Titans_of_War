import { insideObjective, objectiveOrganized } from './objectiveControl.js';

const ASSAULT_GOALS = {
  'five-forks-ayres': 'right',
  'five-forks-crawford': 'left',
  'five-forks-griffin': 'right',
};
const SCREEN_TIME = 8;
const HOLD_DEADLINE = 44;
const COVERED_DEADLINE = 58;
const EARLY_DEADLINE = 36;
const COVERED_THRESHOLD = .65;
const EARLY_THRESHOLD = .75;

export const FIVE_FORKS_MISSIONS = Object.freeze({
  option_a: {
    title: 'Delay the Union breakthrough', deadline: HOLD_DEADLINE, result: 'costly-win',
    assessment: 'Delay the breakthrough at the crossroads and the Angle',
    orders: [
      'At minute 44, hold both the crossroads and the Angle with supported, organized infantry. Each position must have been tested by Union fire.',
      'Keep organized Union troops out of both sectors and support the defenders within 340 field units. Move Wallace’s brigade to the northern end of the Angle early.',
    ],
    replay: 'Keep Steuart at the crossroads and Ransom in the Angle. Move Wallace to the northern end of the Angle before Warren’s first wave can enter the works.',
  },
  option_b: {
    title: 'Cover the exit on Ford’s Road', deadline: COVERED_DEADLINE, result: 'disciplined-withdrawal', threshold: COVERED_THRESHOLD,
    assessment: 'Screen Ford’s Road and withdraw at least 65% of starting strength',
    orders: [
      'Hold the Ford’s Road screen with supported infantry for 8 uninterrupted field minutes after it comes under fire.',
      'Withdraw at least 65% of starting strength through the marked northern exits by minute 58. Move the rest of the army out while your screen holds, then withdraw the rearguard.',
    ],
    replay: 'Keep Wallace and Fitzhugh Lee at the screen until the timer completes. Give the distant brigades and batteries an early start along Ford’s Road.',
  },
  option_c: {
    title: 'Withdraw before the line closes', deadline: EARLY_DEADLINE, result: 'disciplined-withdrawal', threshold: EARLY_THRESHOLD,
    assessment: 'Withdraw at least 75% of starting strength before the assault closes',
    orders: [
      'Use Withdraw to bring at least 75% of starting strength through the marked northern exits by minute 36.',
      'Issue orders early. The batteries need time to limber, and units that rout through the exits do not count.',
    ],
    replay: 'Order withdrawal while the road is clear. Recover the batteries by limbering them early, then make room for the slower formations.',
  },
});

export function directFiveForksAssaults(e) {
  for (const unit of e.state) {
    const sectorId = ASSAULT_GOALS[unit.id];
    if (!sectorId || !objectiveOrganized(unit) || ['wavering', 'shaken'].includes(unit.condition)
      || !['hold', 'advance'].includes(unit.order)) continue;
    const target = e.fieldBattle.sectors.find(sector => sector.id === sectorId);
    if (insideObjective(unit, target) && !e.state.some(defender =>
      defender.side === 'confederate' && objectiveOrganized(defender) && insideObjective(defender, target))) continue;
    Object.assign(unit, { order: 'assault', directMove: false, assaultSector: sectorId, target: { x: target.x, y: target.y } });
  }
}

const row = (label, satisfied, detail) => ({ label, satisfied, detail });
const isDefender = unit => unit.side === 'confederate' && unit.type === 'infantry'
  && objectiveOrganized(unit) && !unit.directMove && !['fallback', 'withdraw', 'rally'].includes(unit.order);

function sectorState(e, id, previouslyTested) {
  const sector = e.fieldBattle.sectors.find(site => site.id === id);
  const eligible = e.state.filter(isDefender);
  const here = eligible.filter(unit => insideObjective(unit, sector));
  const supported = here.some(unit => eligible.some(other => other !== unit
    && Math.hypot(unit.x - other.x, unit.y - other.y) <= 340));
  const contested = e.state.some(unit => unit.side === 'union' && objectiveOrganized(unit) && insideObjective(unit, sector));
  const tested = previouslyTested || here.some(unit => unit.lastIncomingAt >= 0 && e.time - unit.lastIncomingAt < 2);
  const detail = `${supported ? 'Supported' : 'Needs support'} · ${contested ? 'Union troops present' : 'Clear'} · ${tested ? 'Under fire recorded' : 'Awaiting contact'}`;
  return { tested, row: row(sector.name, supported && !contested && tested, detail) };
}

export function updateFiveForksMission(e, dt = 0) {
  const mission = FIVE_FORKS_MISSIONS[e.choiceId];
  if (!mission) return false;
  const previous = e.fieldBattle.fiveForks;
  if (previous?.status === 'achieved' || previous?.status === 'failed') return true;
  const army = e.state.filter(unit => unit.side === 'confederate');
  const noForceRemaining = !army.some(unit => unit.active && !['broken', 'surrendered'].includes(unit.status));
  const atDeadline = e.time + 1e-8 >= mission.deadline;
  const withdrawal = mission.threshold !== undefined;
  const underFire = { ...previous?.underFire };
  let screened = previous?.screened || 0;
  let conditions;
  if (!withdrawal) {
    conditions = ['center', 'right'].map(id => {
      const state = sectorState(e, id, Boolean(underFire[id]));
      underFire[id] = state.tested;
      return state.row;
    });
    conditions.push(row('Delay window completed', atDeadline,
      `${Math.min(Math.floor(e.time + 1e-8), mission.deadline)} / ${mission.deadline} min`));
  } else {
    const escaped = army.filter(unit => unit.withdrawn && unit.withdrawalOrganized)
      .reduce((total, unit) => total + unit.strength, 0) / Math.max(1, e.initialConfederate);
    conditions = [row('Starting strength withdrawn in order', escaped >= mission.threshold,
      `${Math.floor(escaped * 100)}% / ${mission.threshold * 100}%`)];
    if (e.choiceId === 'option_b') {
      const screen = sectorState(e, 'left', Boolean(underFire.left));
      underFire.left = screen.tested;
      const before = screened;
      if (screened < SCREEN_TIME) {
        screened = screen.row.satisfied ? screened + dt : 0;
        if (screened + 1e-8 >= SCREEN_TIME) screened = SCREEN_TIME;
      }
      if (before < SCREEN_TIME && screened >= SCREEN_TIME) e.events.push({ time: e.time, type: 'objective', message: 'Ford’s Road screen held for eight minutes under pressure. Withdraw the rearguard now.' });
      conditions.unshift(row('Ford’s Road screen held under fire', screened >= SCREEN_TIME,
        `${Math.floor(screened * 10) / 10} / ${SCREEN_TIME} min · ${screened >= SCREEN_TIME ? 'Rearguard may withdraw' : screen.row.detail}`));
    }
  }
  // Give a successful withdrawal time to bring out the rest of the army.
  const achieved = conditions.every(check => check.satisfied) && (!withdrawal || atDeadline || noForceRemaining);
  const finished = achieved || atDeadline || noForceRemaining;
  const status = achieved ? 'achieved' : finished ? 'failed' : 'tracking';
  const title = achieved ? withdrawal ? 'Army withdrawn in order' : 'Breakthrough delayed'
    : finished ? 'Field objective incomplete' : mission.title;
  const detail = conditions.map(check => `${check.label} · ${check.detail}`).join(' • ');
  e.fieldBattle.fiveForks = { title, detail, conditions, status, deadline: mission.deadline, underFire, screened, replay: mission.replay };
  if (finished) {
    e.events.push({ time: e.time, type: achieved ? 'objective' : 'warning', message: `${title}. ${detail}` });
    e.beginResolution(achieved ? mission.result : 'defeat');
  }
  return true;
}
