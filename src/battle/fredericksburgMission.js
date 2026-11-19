import { insideObjective, objectiveControl, objectiveOrganized, recordObjectiveProgress } from './objectiveControl.js';

const HEIGHTS_HOLD = 8;
const PROSPECT_HOLD = 6;
const HEIGHTS_DEADLINE = 38;
const PROSPECT_DEADLINE = 42;
const WALL_LINE = new Set(['fredericksburg-cobb', 'fredericksburg-kershaw']);
const HILL_LINE = new Set(['fredericksburg-gregg', 'fredericksburg-lane']);
const UNION_WALL_WAVES = new Set(['fredericksburg-french', 'fredericksburg-hancock', 'fredericksburg-humphreys']);

export const FREDERICKSBURG_MISSIONS = Object.freeze({
  option_a: {
    title: 'Hold the Sunken Road and support it with guns',
    assessment: 'Hold Marye’s Heights after the stone-wall line comes under fire',
    kind: 'hold',
    deadline: HEIGHTS_DEADLINE,
    result: 'costly-win',
    orders: [
      'Keep Cobb and Kershaw in the Marye’s Heights sector. The wall line must come under Union fire.',
      'Move Walton’s guns into the southwest of the marked Heights sector. After the battery deploys, hold the sector clear of organized Union troops for eight uninterrupted field minutes.',
    ],
    replay: 'Keep Cobb and Kershaw at the wall. Move Walton a short distance east into the rear of the Marye’s Heights sector and allow the guns time to deploy.',
  },
  option_b: {
    title: 'Close the gap at Prospect Hill',
    assessment: 'Reinforce Jackson and contain the Prospect Hill breach',
    kind: 'hold',
    deadline: PROSPECT_DEADLINE,
    result: 'costly-win',
    orders: [
      'Meade’s advance will probe the wooded gap by the railroad. Keep Gregg or Lane in the Prospect Hill sector as an organized anchor.',
      'Move Early’s reserve into the western edge of Prospect Hill. Keep organized Union troops out of the western half while Early and an anchor hold the sector together for six uninterrupted field minutes.',
    ],
    replay: 'Send Early into the western edge of Prospect Hill to support Gregg and Lane. Watch the breach and hold counters so a temporary repulse does not end the mission early.',
  },
});

const check = (label, satisfied, detail) => ({ label, satisfied, detail });

export function directFredericksburgAssaults(engine) {
  const wallDefense = engine.choiceId === 'option_a';
  for (const unit of engine.state) {
    const sectorId = UNION_WALL_WAVES.has(unit.id) && (wallDefense || engine.time >= 20) ? 'left'
      : (unit.id === 'fredericksburg-meade' || unit.id === 'fredericksburg-gibbon') && (!wallDefense || engine.time >= 18)
        ? 'right' : null;
    if (!sectorId || !objectiveOrganized(unit) || ['shaken', 'wavering'].includes(unit.condition)
      || !['hold', 'advance'].includes(unit.order)) continue;
    const sector = engine.fieldBattle.sectors.find(site => site.id === sectorId);
    if (Math.hypot(unit.x - sector.x, unit.y - sector.y) < 18) continue;
    Object.assign(unit, { order: 'assault', directMove: false, assaultSector: sectorId, target: { x: sector.x, y: sector.y } });
  }
}

export function updateFredericksburgMission(engine, dt = 0) {
  const mission = FREDERICKSBURG_MISSIONS[engine.choiceId];
  if (!mission) return false;
  const previous = engine.fieldBattle.fredericksburg;
  if (previous && previous.status !== 'tracking') return true;
  const wallDefense = engine.choiceId === 'option_a';
  const sector = engine.fieldBattle.sectors.find(site => site.id === (wallDefense ? 'left' : 'right'));
  const { supported, defenders } = objectiveControl(engine.state, sector, 'attack');
  const anchors = supported.filter(unit => (wallDefense ? WALL_LINE : HILL_LINE).has(unit.id));
  const tested = Boolean(previous?.tested || anchors.some(unit => unit.lastIncomingAt >= 0 && engine.time - unit.lastIncomingAt <= 2));
  const breached = Boolean(previous?.breached || (!wallDefense && defenders.length));
  if (breached && !previous?.breached) {
    engine.events.push({ time: engine.time, type: 'gap', message: 'Union infantry entered the wooded gap at Prospect Hill. Support the western line with Early’s reserve before the breach deepens.' });
  }

  const conditions = wallDefense ? [
    check('Stone-wall line under fire', anchors.length === 2 && tested,
      `${anchors.length} / 2 supported · ${tested ? 'Under fire recorded' : 'Awaiting contact'}`),
  ] : [
    check('Prospect Hill gap tested', breached, breached ? 'Union breach recorded' : 'Awaiting Union penetration'),
    check('Jackson’s anchor line', anchors.length > 0, anchors.length ? 'At least one organized formation in support' : 'Needs an organized formation in support'),
  ];

  if (wallDefense) {
    const battery = engine.state.find(unit => unit.id === 'fredericksburg-walton');
    const deployed = objectiveOrganized(battery) && insideObjective(battery, sector)
      && battery.x < 555 && battery.gunState === 'deployed' && !battery.directMove && !battery.gunsAbandoned && battery.order === 'hold';
    conditions.push(check('Walton’s artillery support', deployed, deployed ? 'Battery deployed behind the wall' : 'Move and deploy behind the wall'));
  } else {
    const reserve = supported.some(unit => unit.id === 'fredericksburg-early');
    conditions.push(check('Early’s reserve joined the line', reserve, reserve ? 'Reserve in support on the hill' : 'Bring the reserve into the hill sector'));
  }
  const pressure = wallDefense ? defenders.length : defenders.filter(unit => unit.x < sector.x).length;
  conditions.push(check(wallDefense ? 'Marye’s Heights free of organized attackers' : 'Western half of Prospect Hill held',
    pressure === 0, pressure ? 'Contested' : defenders.length ? 'Union pressure contained to the east' : 'Clear'));

  const required = wallDefense ? HEIGHTS_HOLD : PROSPECT_HOLD;
  const before = previous?.held || 0;
  const uninterrupted = conditions.every(condition => condition.satisfied) ? before + dt : 0;
  const held = uninterrupted + 1e-8 >= required ? required : uninterrupted;
  recordObjectiveProgress(engine.fieldBattle, engine.time, before, held, wallDefense ? 'Marye’s Heights' : 'Prospect Hill');
  const achieved = held >= required;
  conditions.push(check('Uninterrupted field interval', achieved, `${Math.floor(held * 10) / 10} / ${required} min`));
  const finished = achieved || engine.time + 1e-8 >= mission.deadline || !engine.state.some(unit => unit.side === 'confederate' && unit.active);
  const status = achieved ? 'achieved' : finished ? 'failed' : 'tracking';
  const title = achieved ? wallDefense ? 'The Sunken Road defense held' : 'The Prospect Hill line was restored'
    : finished ? 'Field objective incomplete' : mission.title;
  const detail = [...conditions.map(condition => `${condition.label} · ${condition.detail}`),
    ...(!finished ? [`By minute ${mission.deadline}`] : [])].join(' • ');
  engine.fieldBattle.fredericksburg = { title, detail, conditions, status, deadline: mission.deadline, tested, breached, held, replay: mission.replay };
  if (finished) {
    engine.events.push({ time: engine.time, type: achieved ? 'objective' : 'warning', message: `${title}. ${detail}` });
    engine.beginResolution(achieved ? mission.result : 'defeat');
  }
  return true;
}
