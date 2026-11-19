import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { getBattleAssessment } from '../src/battle/battleAssessment.js';
import { createPracticeState } from '../src/game/practiceConditions.js';

const scenarioId = 'missionary_ridge';
const makeState = ammunition => createPracticeState({ id: scenarioId, turn: 15 }, 'reserve', ammunition);
const full = makeState('full');
const depleted = makeState('depleted');
const field = (choice, state = full) => new CivilWarBattleEngine(scenarioId, state, choice);
const mission = engine => engine.fieldBattle.missionaryRidge;
const formation = (engine, who) => engine.state.find(unit => unit.id === `missionary-ridge-${who}`);
const covering = ['anderson', 'bate'];
const trailing = ['rearguard', 'battery'];

function runUntil(engine, predicate) {
  for (let step = 0; step < 1450 && !predicate() && engine.outcome === 'undecided'; step += 1) engine.tick(.05);
  assert.ok(predicate(), `expected battlefield state by minute ${engine.time.toFixed(1)}`);
}

const finish = engine => runUntil(engine, () => engine.outcome !== 'undecided');
const tickTo = (engine, minute) => runUntil(engine, () => engine.time + 1e-8 >= minute);
const order = (engine, names, command, point) => {
  for (const who of names) assert.equal(engine.order(formation(engine, who).id, command, point), true, `${who} received ${command}`);
};
const resume = (engine, state) => CivilWarBattleEngine.fromCheckpoint(
  JSON.parse(JSON.stringify(engine.checkpoint())), scenarioId, state, engine.choiceId,
);

test('a supplied or depleted crest defense buys time after contact and reinforcement', () => {
  for (const state of [full, depleted]) {
    const engine = field('option_a', state);
    tickTo(engine, 6);
    assert.equal(mission(engine).held, 0);
    order(engine, ['bate'], 'move', { x: 1015, y: 450 });
    runUntil(engine, () => mission(engine).held >= 2);
    assert.ok(formation(engine, 'baird').participated);
    assert.equal(formation(engine, 'bate').order, 'hold');
    assert.equal(mission(engine).tested, true);
    const restored = resume(engine, state);
    for (const candidate of [engine, restored]) {
      finish(candidate);
      assert.equal(candidate.outcome, 'costly-win');
      assert.equal(mission(candidate).held, 9);
      assert.ok(mission(candidate).conditions.every(row => row.satisfied));
      assert.equal(getBattleAssessment(candidate.snapshot(), 'option_a').objective.status, 'achieved');
    }
    assert.deepEqual(engine.snapshot(), restored.snapshot());
  }
});

test('leaving Bate behind the crest prevents a supported delay', () => {
  const engine = field('option_a');
  finish(engine);
  assert.equal(engine.outcome, 'defeat');
  assert.equal(mission(engine).held, 0);
  assert.equal(mission(engine).conditions.find(check => check.label === 'Anderson and Bate holding the crest').satisfied, false);
  assert.equal(engine.fieldBattle.sectors.find(sector => sector.id === 'center').control, 'contested');
});

test('moving the support brigade away breaks the continuous delay interval', () => {
  const engine = field('option_a');
  order(engine, ['bate'], 'move', { x: 1015, y: 450 });
  runUntil(engine, () => mission(engine).held >= 2);
  order(engine, ['bate'], 'move', { x: 1220, y: 475 });
  runUntil(engine, () => mission(engine).held === 0);
  assert.ok(engine.fieldBattle.controlEvents.some(event => event.message.includes('timer reset')));
  finish(engine);
  assert.equal(engine.outcome, 'defeat');
});

test('the screen keeps its earned six minutes while both covering brigades reach the eastern exits', () => {
  const engine = field('option_b', depleted);
  order(engine, trailing, 'withdraw');
  runUntil(engine, () => mission(engine).held === 6);
  assert.equal(engine.outcome, 'undecided');
  assert.ok(engine.events.some(event => event.message.startsWith('The crest screen has held.')));
  order(engine, covering, 'withdraw');
  const restored = resume(engine, depleted);
  for (const candidate of [engine, restored]) {
    finish(candidate);
    assert.equal(candidate.outcome, 'disciplined-withdrawal');
    assert.equal(mission(candidate).held, 6);
    assert.ok(mission(candidate).escaped >= .65);
    for (const who of covering) {
      const unit = formation(candidate, who);
      assert.equal(unit.departureReason, 'rear-exit');
      assert.equal(unit.withdrawalOrganized, true);
      assert.ok(unit.x > candidate.world.width - 40);
    }
    assert.equal(getBattleAssessment(candidate.snapshot(), 'option_b').objective.status, 'achieved');
  }
  assert.deepEqual(engine.snapshot(), restored.snapshot());
});

test('the entire force can get out and still fail if it leaves before holding the screen', () => {
  const engine = field('option_b');
  order(engine, [...covering, ...trailing], 'withdraw');
  finish(engine);
  assert.equal(engine.outcome, 'defeat');
  assert.equal(mission(engine).held, 0);
  assert.equal(mission(engine).escaped, 1);
  assert.equal(getBattleAssessment(engine.snapshot(), 'option_b').objective.status, 'failed');
});

test('the west slope, crest and east road expose different terrain and rear directions', () => {
  const engine = field('option_b');
  const terrain = (x, y) => engine.fieldTerrain({ x, y });
  assert.ok(terrain(830, 430).movement < terrain(1380, 590).movement);
  assert.ok(terrain(1015, 430).defense > terrain(830, 430).defense);
  assert.ok(engine.fieldExitTargets(formation(engine, 'anderson')).every(exit => exit.x === 1582));
  assert.ok(engine.fieldExitTargets(formation(engine, 'wood')).every(exit => exit.x === 18));
});
