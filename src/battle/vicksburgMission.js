import { insideObjective, objectiveControl, objectiveOrganized, recordObjectiveProgress } from './objectiveControl.js';

const WAUL = 'vicksburg-waul';
const ALABAMA = 'vicksburg-alabama';
const GUNS = 'vicksburg-battery';
const BREACH = 'vicksburg-griffith';
const CARR = 'vicksburg-carr';
const RETAINED_GOAL = .65;
const APPROACH = {
  'vicksburg-iowa': { x: 948, y: 543 },
  [CARR]: { x: 936, y: 364 },
};

export const VICKSBURG_MISSIONS = Object.freeze({
  option_a: {
    title: 'Clear the breach and hold the Railroad Redoubt',
    assessment: 'Recover the Railroad Redoubt with Waul’s Texas Legion',
    kind: 'attack',
    deadline: 54,
    holdMinutes: 8,
    result: 'costly-win',
    orders: [
      'Griffith’s Iowa detachment is inside the southeast breach. Select Waul’s Texas Legion and Assault the Railroad Redoubt sector.',
      'Use the 30th Alabama to support Waul. Clear the sector and hold it for eight uninterrupted field minutes after Carr’s supporting infantry makes contact.',
    ],
    replay: 'Send Waul into the Railroad Redoubt to support the 30th Alabama. Leave both formations in the sector after the breach is clear, and wait for contact with Carr’s supporting infantry.',
  },
  option_b: {
    title: 'Bring the guns and infantry back to the Interior Line',
    assessment: 'Preserve the guns and infantry on the Interior Line',
    kind: 'preserve',
    deadline: 64,
    holdMinutes: 6,
    result: 'disciplined-withdrawal',
    orders: [
      'Leave Waul on the Interior Line and keep the 30th Alabama at the Railroad Redoubt under fire. Move the field guns into the lower half of the Interior Line sector and wait for them to deploy.',
      'Once the guns are deployed behind the screen, Move the 30th Alabama into the upper half of the Interior Line beside Waul. Keep the guns, both infantry formations, and at least 65% of starting strength there for six uninterrupted field minutes.',
    ],
    replay: 'Use Move to set the guns on the lower half of the marked Interior Line. Leave the 30th Alabama in the redoubt until the guns deploy. Then Move the infantry into the upper half and hold together.',
  },
});

export function directVicksburgPressure(engine) {
  for (const unit of engine.state) {
    const approach = APPROACH[unit.id];
    if (!approach || unit.order !== 'hold' || !objectiveOrganized(unit)
      || ['shaken', 'wavering'].includes(unit.condition)) continue;
    const target = engine.time >= 38 ? { ...approach, x: 838 } : approach;
    if (Math.hypot(unit.x - target.x, unit.y - target.y) < 18) continue;
    Object.assign(unit, { order: 'assault', directMove: false, assaultSector: null, target });
  }
}

const check = (label, satisfied, detail) => ({ label, satisfied, detail });
const holding = unit => unit.order === 'hold' && !unit.pendingCommand && !unit.directMove;

function enemyFellBack(unit, redoubt) {
  return !unit.active || !insideObjective(unit, redoubt) || ['routing', 'broken', 'surrendered'].includes(unit.status);
}

export function updateVicksburgMission(engine, dt = 0) {
  const mission = VICKSBURG_MISSIONS[engine.choiceId];
  if (!mission) return false;
  const field = engine.fieldBattle;
  const previous = field.vicksburg;
  if (previous && previous.status !== 'tracking') return true;

  const fallback = mission.kind === 'preserve';
  const redoubt = field.sectors.find(sector => sector.id === 'center');
  const site = fallback ? field.sectors.find(sector => sector.id === 'left') : redoubt;
  const { supported, defenders } = objectiveControl(engine.state, site, 'attack');
  const army = engine.state.filter(unit => unit.side === 'confederate');
  const alabama = army.find(unit => unit.id === ALABAMA);
  const battery = army.find(unit => unit.id === GUNS);
  const breach = engine.state.find(unit => unit.id === BREACH);
  const carr = engine.state.find(unit => unit.id === CARR);
  const anchors = supported.filter(unit => [ALABAMA, WAUL].includes(unit.id) && holding(unit));
  const covered = Boolean(previous?.covered || (
    objectiveOrganized(alabama) && holding(alabama) && insideObjective(alabama, redoubt) && alabama.lastIncomingAt >= 0));
  const gunsReady = fallback && objectiveOrganized(battery) && holding(battery) && insideObjective(battery, site)
    && battery.gunState === 'deployed' && !battery.gunsAbandoned;
  const screenInPlace = objectiveOrganized(alabama) && holding(alabama) && insideObjective(alabama, redoubt);
  const screened = fallback && Boolean(previous?.screened || (
    gunsReady && !previous?.gunsReady && screenInPlace && covered));
  const retained = army.filter(unit => objectiveOrganized(unit) && insideObjective(unit, site))
    .reduce((sum, unit) => sum + unit.strength, 0) / Math.max(1, engine.initialConfederate);
  const breachClear = enemyFellBack(breach, redoubt);
  const supportEngaged = carr.lastVolleyAt >= 0 || carr.lastIncomingAt >= 0;
  const conditions = fallback ? [
    check('30th Alabama covered the redoubt under fire', covered, covered ? 'Contact recorded' : 'Awaiting fire on the outer screen'),
    check('Field guns deployed on the Interior Line', gunsReady, gunsReady ? 'Guns in position' : 'Move the guns inside the Interior Line and let them deploy'),
    check('Guns deployed before the covering infantry left', screened, screened ? 'Screen in place when the guns deployed' : 'Keep the 30th Alabama in the redoubt until the guns deploy'),
    check('Two supporting infantry formations on the Interior Line', anchors.length === 2, `${anchors.length} / 2 formations`),
    check('Starting strength organized on the Interior Line', retained >= RETAINED_GOAL, `${Math.floor(retained * 100)}% / 65%`),
  ] : [
    check('Griffith’s detachment driven from the breach', breachClear, breachClear ? 'Breach cleared' : 'Iowa detachment inside the sector'),
    check('Waul and the 30th Alabama supporting each other in the redoubt', anchors.length === 2, `${anchors.length} / 2 formations`),
    check('Carr’s supporting infantry engaged', supportEngaged, supportEngaged ? 'Contact recorded' : 'Awaiting contact on the eastern approach'),
  ];
  conditions.push(check(`${site.name} clear of organized Union troops`, defenders.length === 0,
    defenders.length ? `${defenders.length} contesting` : 'Clear'));
  const before = previous?.held || 0;
  const interval = conditions.every(row => row.satisfied) ? before + dt : 0;
  const held = interval + 1e-8 >= mission.holdMinutes ? mission.holdMinutes : interval;
  recordObjectiveProgress(field, engine.time, before, held, site.name);
  conditions.push(check(fallback ? 'Uninterrupted interior defense' : 'Uninterrupted redoubt hold', held >= mission.holdMinutes,
    `${Math.floor(held * 10) / 10} / ${mission.holdMinutes} min`));

  if (!previous && !fallback) engine.events.push({ time: engine.time, type: 'objective', message: 'Griffith’s Iowa detachment has entered through the damaged southeast angle.' });
  if (!fallback && breachClear && !previous?.breachClear) engine.events.push({ time: engine.time, type: 'objective', message: 'The Iowa detachment no longer holds the breach. Keep both infantry formations in the redoubt against the supporting Union line.' });
  if (screened && !previous?.screened) engine.events.push({ time: engine.time, type: 'objective', message: 'The field guns are deployed with the redoubt screen still in place. Move the 30th Alabama to the Interior Line.' });

  const achieved = conditions.every(row => row.satisfied);
  const finished = achieved || engine.time + 1e-8 >= mission.deadline || !army.some(unit => unit.active);
  const status = achieved ? 'achieved' : finished ? 'failed' : 'tracking';
  const title = achieved ? (fallback ? 'Guns and infantry formed an Interior Line' : 'Railroad Redoubt recovered and held')
    : finished ? 'Vicksburg objective incomplete' : mission.title;
  const detail = [...conditions.map(row => `${row.label} · ${row.detail}`),
    ...(!finished ? [`By minute ${mission.deadline}`] : [])].join(' • ');
  field.vicksburg = { title, detail, conditions, status, deadline: mission.deadline, held, breachClear, supportEngaged, covered, gunsReady, screened, retained, replay: mission.replay };
  if (finished) {
    engine.events.push({ time: engine.time, type: achieved ? 'objective' : 'warning', message: `${title}. ${detail}` });
    engine.beginResolution(achieved ? mission.result : 'defeat');
  }
  return true;
}
