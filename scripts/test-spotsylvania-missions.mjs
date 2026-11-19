import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getBattleAssessment } from '../src/battle/battleAssessment.js';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { periodStandardFor } from '../src/battle/periodStandards.js';
import { createPracticeState } from '../src/game/practiceConditions.js';

const scenarioId = 'spotsylvania';
const practice = ammunition => createPracticeState({ id: scenarioId, turn: 17 }, 'reserve', ammunition);
const full = practice('full');
const depleted = practice('depleted');
const engineFor = (choice, state = full) => new CivilWarBattleEngine(scenarioId, state, choice);
const mission = engine => engine.fieldBattle.spotsylvania;
const formation = (engine, who) => engine.state.find(unit => unit.id === `${scenarioId}-${who}`);
const condition = (engine, label) => mission(engine).conditions.find(row => row.label === label);

function until(engine, predicate) {
  for (let step = 0; step < 1250 && !predicate() && engine.outcome === 'undecided'; step += 1) engine.tick(.05);
  assert.ok(predicate(), `expected battlefield state by minute ${engine.time.toFixed(1)}`);
}

const finish = engine => until(engine, () => engine.outcome !== 'undecided');
const tickTo = (engine, minute) => until(engine, () => engine.time + 1e-8 >= minute);
const order = (engine, who, command, point) =>
  assert.equal(engine.order(formation(engine, who).id, command, point), true, `${who} received ${command}`);
const restoredEngine = (engine, state) => CivilWarBattleEngine.fromCheckpoint(
  JSON.parse(JSON.stringify(engine.checkpoint())), scenarioId, state, engine.choiceId,
);

function assaultWestFace(engine) {
  order(engine, 'gordon', 'assault', { sectorId: 'left' });
  order(engine, 'ramseur', 'assault', { sectorId: 'left' });
}

test('supporting infantry and deployed guns stabilize the Interior Line after contact', () => {
  for (const state of [full, depleted]) {
    const engine = engineFor('option_a', state);
    tickTo(engine, 6);
    order(engine, 'ramseur', 'move', { x: 834, y: 618 });
    order(engine, 'battery', 'move', { x: 893, y: 663 });
    until(engine, () => mission(engine).held >= 2);
    assert.ok(formation(engine, 'wright').participated);
    assert.equal(mission(engine).tested, true);
    assert.equal(formation(engine, 'battery').gunState, 'deployed');
    const restored = restoredEngine(engine, state);
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

test('infantry alone cannot stabilize the Interior Line', () => {
  const engine = engineFor('option_a');
  order(engine, 'ramseur', 'move', { x: 834, y: 618 });
  finish(engine);
  assert.equal(engine.outcome, 'defeat');
  assert.equal(mission(engine).held, 0);
  assert.equal(condition(engine, 'Interior Line under fire').satisfied, true);
  assert.equal(condition(engine, 'Gordon and Ramseur holding the Interior Line').satisfied, true);
  assert.equal(condition(engine, 'Deployed battery behind the infantry').satisfied, false);
  assert.equal(getBattleAssessment(engine.snapshot(), 'option_a').objective.status, 'failed');
});

test('the West Face counterattack can start after a delay and keeps a separate reserve', () => {
  for (const state of [full, depleted]) {
    const engine = engineFor('option_b', state);
    tickTo(engine, 6);
    assaultWestFace(engine);
    until(engine, () => mission(engine).held >= 2);
    assert.ok(formation(engine, 'wright').participated);
    assert.equal(mission(engine).tested, true);
    assert.equal(formation(engine, 'reserve').order, 'hold');
    const restored = restoredEngine(engine, state);
    for (const candidate of [engine, restored]) {
      finish(candidate);
      assert.equal(candidate.outcome, 'costly-win');
      assert.equal(mission(candidate).held, 7);
      assert.ok(mission(candidate).conditions.every(row => row.satisfied));
      assert.equal(getBattleAssessment(candidate.snapshot(), 'option_b').objective.status, 'achieved');
    }
    assert.deepEqual(engine.snapshot(), restored.snapshot());
  }
});

test('moving the reserve resets an otherwise established West Face hold', () => {
  const engine = engineFor('option_b');
  assaultWestFace(engine);
  until(engine, () => mission(engine).held >= 2);
  assert.equal(condition(engine, 'West Face clear of organized Union troops').satisfied, true);
  order(engine, 'reserve', 'move', { x: 1230, y: 765 });
  until(engine, () => mission(engine).held === 0);
  assert.equal(condition(engine, 'Interior reserve organized and in position').satisfied, false);
  assert.ok(engine.fieldBattle.controlEvents.some(event => event.message.includes('timer reset')));
  finish(engine);
  assert.equal(engine.outcome, 'defeat');
  assert.equal(getBattleAssessment(engine.snapshot(), 'option_b').objective.status, 'failed');
});

test('the wet field, interior works, and farm lane have different gameplay properties', () => {
  const engine = engineFor('option_a');
  const terrain = (x, y) => engine.fieldTerrain({ x, y });
  assert.equal(terrain(415, 480).name, 'Rain-Soaked Fields');
  assert.equal(terrain(895, 635).name, 'Interior Line Works');
  assert.equal(terrain(944, 745).name, 'Harrison Farm Lane');
  assert.ok(terrain(415, 480).movement < terrain(944, 745).movement);
  assert.ok(terrain(895, 635).defense > terrain(415, 480).defense);
  assert.equal(periodStandardFor('union', scenarioId).stars, 35);
  assert.equal(periodStandardFor('confederate', scenarioId).pattern, 'anv');
});
