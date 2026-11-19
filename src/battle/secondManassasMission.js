import { insideObjective, objectiveControl, objectiveOrganized, recordObjectiveProgress } from './objectiveControl.js';

const CUT_WING = new Set(['second-manassas-starke', 'second-manassas-lawton']);
const FLANK_WING = new Set(['second-manassas-hood', 'second-manassas-kemper']);
const FLANK_DURATION = 6;
const DEFENSE_DURATION = 10;
const FLANK_DEADLINE = 39;
const DEFENSE_DEADLINE = 33;

export const SECOND_MANASSAS_MISSIONS = Object.freeze({
  option_a: {
    title: 'Hold the cut and turn Chinn Ridge',
    assessment: 'Hold the tested Deep Cut while Longstreet secures Chinn Ridge',
    kind: 'attack',
    deadline: FLANK_DEADLINE,
    result: 'costly-win',
    orders: [
      'Keep Starke and Lawton in the Deep Cut until it has taken fire. Keep that sector clear of organized Union troops.',
      'Order Hood and Kemper to Assault Chinn Ridge. Hold both sectors together for six uninterrupted field minutes before minute 39.',
    ],
    replay: 'Keep both Jackson formations in the Deep Cut, then send Hood and Kemper to Chinn Ridge together. A single brigade cannot hold the ridge by itself.',
  },
  option_b: {
    title: 'Link the defensive line at Groveton',
    assessment: 'Deploy the Groveton guns and hold the Deep Cut with Longstreet in reserve',
    kind: 'hold',
    deadline: DEFENSE_DEADLINE,
    result: 'costly-win',
    orders: [
      'Use Move to place Stephen D. Lee’s artillery just inside the western end of the Groveton gun line. It will deploy after it reaches the destination.',
      'Keep Union troops from breaking through the western half of the Deep Cut and hold both of Longstreet’s brigades in reserve. Maintain this defense for ten uninterrupted field minutes before minute 33.',
    ],
    replay: 'Move the battery into the Groveton gun line early to allow time to deploy. Keep Starke and Lawton in the cut and hold Hood and Kemper west of the ridge.',
  },
});

const row = (label, satisfied, detail) => ({ label, satisfied, detail });

export function directSecondManassasAssaults(engine) {
  for (const unit of engine.state) {
    const sectorId = unit.id === 'second-manassas-porter' ? 'left'
      : unit.id === 'second-manassas-warren' && engine.choiceId === 'option_b' && engine.time >= 11 ? 'center' : null;
    if (!sectorId || !objectiveOrganized(unit) || ['wavering', 'shaken'].includes(unit.condition)
      || !['hold', 'advance'].includes(unit.order)) continue;
    const target = engine.fieldBattle.sectors.find(sector => sector.id === sectorId);
    if (Math.hypot(unit.x - target.x, unit.y - target.y) < 18) continue;
    Object.assign(unit, { order: 'assault', directMove: false, assaultSector: sectorId, target: { x: target.x, y: target.y } });
  }
}

export function updateSecondManassasMission(engine, dt = 0) {
  const mission = SECOND_MANASSAS_MISSIONS[engine.choiceId];
  if (!mission) return false;
  const previous = engine.fieldBattle.secondManassas;
  if (previous && previous.status !== 'tracking') return true;
  const [cut, gunLine, ridge] = engine.fieldBattle.sectors;
  const cutState = objectiveControl(engine.state, cut, 'attack');
  const cutWing = cutState.supported.filter(unit => CUT_WING.has(unit.id));
  const tested = Boolean(previous?.tested || cutWing.some(unit => unit.lastIncomingAt >= 0 && engine.time - unit.lastIncomingAt <= 2));
  const breakthrough = mission.kind === 'hold' && cutState.defenders.some(unit => unit.x < cut.x);
  const cutClear = mission.kind === 'hold' ? !breakthrough : !cutState.defenders.length;
  const cutHeld = cutWing.length === 2 && cutClear && tested;
  const cutPressure = breakthrough ? 'Western line breached' : cutState.defenders.length
    ? mission.kind === 'hold' ? 'Pressure contained to the east' : 'Contested'
    : 'Clear';
  const conditions = [row('Jackson’s Deep Cut line', cutHeld,
    `${cutWing.length} / 2 supported · ${cutPressure} · ${tested ? 'Under fire recorded' : 'Awaiting contact'}`)];
  let required;
  if (mission.kind === 'attack') {
    const ridgeState = objectiveControl(engine.state, ridge, 'attack');
    const flankWing = ridgeState.supported.filter(unit => FLANK_WING.has(unit.id));
    conditions.push(row('Longstreet’s Chinn Ridge line', flankWing.length === 2 && !ridgeState.defenders.length,
      `${flankWing.length} / 2 supported · ${ridgeState.defenders.length ? 'Contested' : 'Clear'}`));
    required = FLANK_DURATION;
  } else {
    const battery = engine.state.find(unit => unit.id === 'second-manassas-battery');
    const gunsReady = objectiveOrganized(battery) && insideObjective(battery, gunLine) && battery.gunState === 'deployed'
      && !battery.directMove && !battery.gunsAbandoned && battery.order === 'hold';
    const reserve = engine.state.filter(unit => FLANK_WING.has(unit.id) && objectiveOrganized(unit)
      && unit.x < ridge.x - ridge.width / 2 && !unit.directMove && unit.order === 'hold');
    conditions.push(row('Groveton gun line', gunsReady, gunsReady ? 'Battery deployed' : 'Move and deploy the battery'),
      row('Longstreet’s reserve', reserve.length === 2, `${reserve.length} / 2 organized and holding west of Chinn Ridge`));
    required = DEFENSE_DURATION;
  }
  const before = previous?.held || 0;
  let held = conditions.every(condition => condition.satisfied) ? before + dt : 0;
  if (held + 1e-8 >= required) held = required;
  recordObjectiveProgress(engine.fieldBattle, engine.time, before, held, mission.kind === 'attack' ? 'Deep Cut and Chinn Ridge' : 'The Groveton defense');
  conditions.push(row('Uninterrupted field interval', held >= required, `${Math.floor(held * 10) / 10} / ${required} min`));
  const achieved = held >= required;
  const finished = achieved || engine.time + 1e-8 >= mission.deadline || !engine.state.some(unit => unit.side === 'confederate' && unit.active);
  const status = achieved ? 'achieved' : finished ? 'failed' : 'tracking';
  const title = achieved ? mission.kind === 'attack' ? 'Both wings secured their ground' : 'The limited defense held'
    : finished ? 'Field objective incomplete' : mission.title;
  const detail = [...conditions.map(condition => `${condition.label} · ${condition.detail}`),
    ...(!finished ? [`By minute ${mission.deadline}`] : [])].join(' • ');
  engine.fieldBattle.secondManassas = { title, detail, conditions, status, deadline: mission.deadline, tested, held, replay: mission.replay };
  if (finished) {
    engine.events.push({ time: engine.time, type: achieved ? 'objective' : 'warning', message: `${title}. ${detail}` });
    engine.beginResolution(achieved ? mission.result : 'defeat');
  }
  return true;
}
