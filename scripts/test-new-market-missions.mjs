import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { getBattleAssessment } from '../src/battle/battleAssessment.js';
import { NEW_MARKET_MISSIONS } from '../src/battle/newMarketMission.js';
import { createPracticeState } from '../src/game/practiceConditions.js';

const fieldId = 'new_market';
const stateWith = ammunition => createPracticeState({ id: fieldId, turn: 17 }, 'reserve', ammunition);
const full = stateWith('full');
const field = (choice, state = full) => new CivilWarBattleEngine(fieldId, state, choice);
const id = name => `new-market-${name}`;
const mission = engine => engine.fieldBattle.newMarket;
const condition = (engine, label) => mission(engine).conditions.find(check => check.label === label);
const stayInReserve = 'Cadets organized at Reserve Rise';

function stepUntil(engine, predicate) {
  for (let step = 0; step < 1400 && !predicate() && engine.outcome === 'undecided'; step += 1) engine.tick(.05);
  assert.ok(predicate(), `expected battlefield state by minute ${engine.time.toFixed(1)}`);
}

const finish = engine => stepUntil(engine, () => engine.outcome !== 'undecided');
const tickTo = (engine, minute) => stepUntil(engine, () => engine.time + 1e-8 >= minute);

function give(engine, order, names, target = null) {
  for (const name of names) assert.equal(engine.order(id(name), order, target), true, `${name} received ${order}`);
}

function assaultFarm(engine, names = ['wharton', 'echols', 'cadets']) {
  give(engine, 'assault', names, { sectorId: 'left' });
}

function resume(engine, state = full) {
  return CivilWarBattleEngine.fromCheckpoint(
    JSON.parse(JSON.stringify(engine.checkpoint())), fieldId, state, engine.choiceId,
  );
}

test('regular brigades and the arriving cadets secure the farm continuously across a restored checkpoint', () => {
  const engine = field('option_a');
  assaultFarm(engine, ['wharton', 'echols']);
  tickTo(engine, 8);
  assert.equal(condition(engine, 'Cadets supporting the farm line').satisfied, false);
  assaultFarm(engine, ['cadets']);
  stepUntil(engine, () => mission(engine).held >= 2);
  assert.equal(mission(engine).status, 'tracking');
  const restored = resume(engine);
  for (const candidate of [engine, restored]) {
    finish(candidate);
    assert.equal(candidate.outcome, 'costly-win');
    assert.equal(mission(candidate).held, 7);
    const assessment = getBattleAssessment(candidate.snapshot(), 'option_a');
    assert.equal(assessment.objective.status, 'achieved');
    assert.match(assessment.evidence.find(row => row.label === 'Cadets supporting the farm line').value, /Met: In support/);
  }
  assert.deepEqual(engine.snapshot(), restored.snapshot());
});

test('depleted ammunition still allows a supported farm assault, but cadet fallback breaks the hold', () => {
  const depleted = stateWith('depleted');
  const win = field('option_a', depleted);
  assaultFarm(win);
  finish(win);
  assert.equal(win.outcome, 'costly-win');
  assert.match(condition(win, 'Cadets supporting the farm line').detail, /\/ 60% strength/);

  const interrupted = field('option_a', depleted);
  assaultFarm(interrupted);
  stepUntil(interrupted, () => mission(interrupted).held >= 2);
  give(interrupted, 'fallback', ['cadets']);
  stepUntil(interrupted, () => mission(interrupted).held === 0);
  assert.equal(condition(interrupted, 'Cadets supporting the farm line').satisfied, false);
  assert.ok(interrupted.fieldBattle.controlEvents.some(event => event.message.includes('timer reset')));
  finish(interrupted);
  assert.equal(interrupted.outcome, 'defeat');
});

test('the pike defense works after a delayed advance and counts Union fire after support arrives', () => {
  const depleted = stateWith('depleted');
  const engine = field('option_b', depleted);
  tickTo(engine, 10);
  assert.equal(mission(engine).tested, false);
  assert.equal(engine.state.find(unit => unit.id === id('union-reserve')).participated, true);
  give(engine, 'advance', ['wharton', 'echols']);
  stepUntil(engine, () => mission(engine).held >= 1);
  assert.equal(mission(engine).tested, true);
  assert.ok(engine.events.some(event => event.type === 'reinforcement' && event.message.includes('behind the Pike line')));
  const restored = resume(engine, depleted);
  for (const candidate of [engine, restored]) {
    finish(candidate);
    assert.equal(candidate.outcome, 'costly-win');
    assert.equal(mission(candidate).held, 7);
    assert.equal(candidate.state.find(unit => unit.id === id('cadets')).order, 'hold');
    const assessment = getBattleAssessment(candidate.snapshot(), 'option_b');
    assert.equal(assessment.objective.status, 'achieved');
    assert.match(assessment.evidence.find(row => row.label === stayInReserve).value, /Met: Holding in reserve · 100% \/ 75%/);
  }
  assert.deepEqual(engine.snapshot(), restored.snapshot());
});

test('committing the cadets to the road cannot earn an organized reserve objective', () => {
  const engine = field('option_b');
  give(engine, 'advance', ['wharton', 'echols', 'cadets']);
  finish(engine);
  assert.equal(engine.outcome, 'defeat');
  assert.equal(condition(engine, 'Two regular brigades on the Pike').satisfied, true);
  assert.equal(condition(engine, stayInReserve).satisfied, false);
  const assessment = getBattleAssessment(engine.snapshot(), 'option_b');
  assert.equal(assessment.objective.status, 'failed');
  assert.equal(assessment.afterAction.next[0], NEW_MARKET_MISSIONS.option_b.replay);
});

test('idle armies and a farm advance without cadet support fail their own deadlines', () => {
  for (const choice of ['option_a', 'option_b']) {
    const idle = field(choice);
    finish(idle);
    assert.equal(idle.outcome, 'defeat');
    assert.equal(Math.round(idle.time * 10) / 10, NEW_MARKET_MISSIONS[choice].deadline);
    assert.equal(mission(idle).held, 0);
  }
  const withoutCadets = field('option_a');
  assaultFarm(withoutCadets, ['wharton', 'echols']);
  finish(withoutCadets);
  assert.equal(withoutCadets.outcome, 'defeat');
  assert.equal(condition(withoutCadets, 'Cadets supporting the farm line').satisfied, false);
});

test('plowed mud slows formations and the pike offers the firmer approach', () => {
  const engine = field('option_a');
  assert.deepEqual(engine.fieldTerrain({ x: 698, y: 327 }), { name: 'Field of Lost Shoes', defense: .96, movement: .68 });
  assert.deepEqual(engine.fieldTerrain({ x: 1068, y: 478 }), { name: 'Valley Pike', defense: 1, movement: 1.13 });
  assert.equal(engine.fieldTerrain({ x: 578, y: 482 }).name, 'Bushong Orchard');
  assert.equal(engine.fieldTerrain({ x: 850, y: 615 }).name, 'Reserve Rise');
});
