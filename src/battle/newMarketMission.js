import { insideObjective, objectiveControl, objectiveOrganized, recordObjectiveProgress } from './objectiveControl.js';

const CADET_ID = 'new-market-cadets';
const UNION_RESERVE_ID = 'new-market-union-reserve';
const HOLD_MINUTES = 7;
const ATTACK_RETENTION = .6;
const RESERVE_RETENTION = .75;

export const NEW_MARKET_MISSIONS = Object.freeze({
  option_a: {
    title: 'Take Bushong Farm with the cadets in support',
    assessment: 'Hold Bushong Farm with the organized cadets and a regular brigade',
    kind: 'attack',
    deadline: 62,
    result: 'costly-win',
    sectorId: 'left',
    orders: [
      'Order Wharton and Echols to Assault Bushong Farm. Send the cadets to the same sector in support. The wet plowed field slows the advance.',
      'Keep the cadets organized with at least 60% of their starting strength. With a regular brigade in support, clear the farm sector and hold it for seven uninterrupted field minutes.',
    ],
    replay: 'Order both regular brigades to Assault Bushong Farm. Have the cadets follow them into the farm sector in support.',
  },
  option_b: {
    title: 'Secure the Valley Pike and keep the cadets in reserve',
    assessment: 'Keep the Valley Pike open under pressure with the cadets in reserve',
    kind: 'hold',
    deadline: 55,
    result: 'costly-win',
    sectorId: 'center',
    orders: [
      'Give Wharton and Echols Advance orders from their starting positions toward the Valley Pike. Keep the cadets on Hold at Reserve Rise with at least 75% of their starting strength.',
      'Once Union support is on the field and the Pike defense has come under fire, hold the clear road sector with both regular brigades and an organized reserve for seven uninterrupted field minutes.',
    ],
    replay: 'Advance Wharton and Echols together toward the Pike. Leave the cadets behind them on Hold inside Reserve Rise, then watch for the seven-minute interval.',
  },
});

const row = (label, satisfied, detail) => ({ label, satisfied, detail });

export function directNewMarketPressure(engine) {
  if (engine.choiceId !== 'option_b') return;
  for (const unit of engine.state) {
    if (!['new-market-moor', UNION_RESERVE_ID].includes(unit.id) || !objectiveOrganized(unit)
      || unit.order !== 'hold' || ['shaken', 'wavering'].includes(unit.condition)) continue;
    const target = unit.id === 'new-market-moor' ? { x: 1125, y: 384 } : { x: 1016, y: 392 };
    if (Math.hypot(unit.x - target.x, unit.y - target.y) < 18) continue;
    Object.assign(unit, { order: 'assault', directMove: false, assaultSector: null, target });
  }
}

export function updateNewMarketMission(engine, dt = 0) {
  const mission = NEW_MARKET_MISSIONS[engine.choiceId];
  if (!mission) return false;
  const field = engine.fieldBattle;
  const previous = field.newMarket;
  if (previous && previous.status !== 'tracking') return true;

  const attack = mission.kind === 'attack';
  const sector = field.sectors.find(site => site.id === mission.sectorId);
  const reserve = field.sectors.find(site => site.id === 'right');
  const { candidates, supported, defenders } = objectiveControl(engine.state, sector, 'attack');
  const cadets = engine.state.find(unit => unit.id === CADET_ID);
  const retained = cadets.strength / Math.max(1, cadets.initialStrength);
  const reserveStrength = Math.floor(retained * 100);
  const regulars = supported.filter(unit => unit.id !== CADET_ID);
  const unionSupportArrived = !attack && engine.state.some(unit => unit.id === UNION_RESERVE_ID && unit.participated);
  const tested = !attack && Boolean(previous?.tested || (unionSupportArrived && candidates.some(unit => unit.id !== CADET_ID
    && unit.lastIncomingAt >= 0 && engine.time - unit.lastIncomingAt <= 2)));
  const cadetsAtFarm = supported.includes(cadets);
  const cadetsInReserve = objectiveOrganized(cadets) && insideObjective(cadets, reserve) && cadets.order === 'hold';
  const conditions = attack ? [
    row('Cadets supporting the farm line', cadetsAtFarm && retained >= ATTACK_RETENTION,
      `${cadetsAtFarm ? 'In support' : 'Awaiting supported cadets at the farm'} · ${reserveStrength}% / 60% strength`),
    row('Regular infantry in support', regulars.length >= 1, `${regulars.length} / 1 formations`),
  ] : [
    row('Pike defense has come under fire', tested, tested ? 'Contact recorded' : unionSupportArrived ? 'Awaiting Union fire' : 'Awaiting Union support'),
    row('Two regular brigades on the Pike', regulars.length >= 2, `${regulars.length} / 2 formations`),
    row('Cadets organized at Reserve Rise', cadetsInReserve && retained >= RESERVE_RETENTION,
      `${cadetsInReserve ? 'Holding in reserve' : 'Keep the cadets organized on Hold at Reserve Rise'} · ${reserveStrength}% / 75% strength`),
  ];
  conditions.push(row(`${sector.name} clear of organized Union troops`, !defenders.length,
    defenders.length ? `${defenders.length} contesting` : 'Clear'));
  const before = previous?.held || 0;
  let held = conditions.every(condition => condition.satisfied) ? before + dt : 0;
  const achieved = held + 1e-8 >= HOLD_MINUTES;
  if (achieved) held = HOLD_MINUTES;
  recordObjectiveProgress(field, engine.time, before, held, sector.name);
  conditions.push(row('Uninterrupted field interval', achieved, `${Math.floor(held * 10) / 10} / ${HOLD_MINUTES} min`));

  const finished = achieved || engine.time + 1e-8 >= mission.deadline
    || !engine.state.some(unit => unit.side === 'confederate' && unit.active);
  const status = achieved ? 'achieved' : finished ? 'failed' : 'tracking';
  const title = achieved ? (attack ? 'Bushong Farm secured' : 'Valley Pike secured')
    : finished ? 'New Market objective incomplete' : mission.title;
  const detail = [...conditions.map(condition => `${condition.label} · ${condition.detail}`),
    ...(!finished ? [`By minute ${mission.deadline}`] : [])].join(' • ');
  field.newMarket = { title, detail, conditions, status, deadline: mission.deadline, held, tested, replay: mission.replay };
  if (finished) {
    engine.events.push({ time: engine.time, type: achieved ? 'objective' : 'warning', message: `${title}. ${detail}` });
    engine.beginResolution(achieved ? mission.result : 'defeat');
  }
  return true;
}
