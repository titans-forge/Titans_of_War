import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { getBattleAssessment, isBattleAssessment } from '../src/battle/battleAssessment.js';
import { fieldTerrain } from '../src/battle/fieldBattleProfiles.js';

const fieldId = 'fredericksburg';
const state = { seed: 1862, rulesVersion: 2, battleRulesVersion: 18,
  metrics: { militaryStrength: 85, munitions: 80, treasury: 75, foodSupply: 78, publicMorale: 80 } };
const battle = choice => new CivilWarBattleEngine(fieldId, state, choice);
const mission = engine => engine.fieldBattle.fredericksburg;
const formation = (engine, name) => engine.state.find(unit => unit.id === `fredericksburg-${name}`);

function stepUntil(engine, predicate) {
  for (let step = 0; step < 1100 && !predicate(); step++) engine.tick(.05);
  assert.ok(predicate(), 'battle reached the requested state');
}

const finish = engine => stepUntil(engine, () => engine.outcome !== 'undecided');

test('Marye’s Heights requires the stone-wall line under fire and an ordered gun deployment', () => {
  const idle = battle('option_a');
  finish(idle);
  assert.equal(idle.outcome, 'defeat');
  assert.equal(mission(idle).tested, true);
  assert.equal(mission(idle).conditions.find(check => check.label === 'Walton’s artillery support').satisfied, false);

  const supported = battle('option_a');
  assert.equal(supported.move(formation(supported, 'walton').id, { x: 495, y: 320 }), true);
  finish(supported);
  assert.equal(supported.outcome, 'costly-win');
  assert.equal(mission(supported).held, 8);
  assert.ok(supported.events.some(event => event.type === 'reinforcement' && event.message.includes('Humphreys')));
  const assessment = getBattleAssessment(supported.snapshot(), 'option_a');
  assert.ok(isBattleAssessment(assessment));
  assert.equal(assessment.objective.status, 'achieved');
  assert.match(assessment.evidence.find(check => check.label === 'Walton’s artillery support').value, /Met: Battery deployed/);
});

test('Prospect Hill requires an observed breach and the reserve in support even after resuming', () => {
  const idle = battle('option_b');
  finish(idle);
  assert.equal(idle.outcome, 'defeat');
  assert.equal(mission(idle).breached, true);
  assert.equal(mission(idle).conditions.find(check => check.label === 'Early’s reserve joined the line').satisfied, false);

  const rallied = battle('option_b');
  assert.equal(rallied.move(formation(rallied, 'early').id, { x: 455, y: 603 }), true);
  stepUntil(rallied, () => mission(rallied).held >= 2);
  const resumed = CivilWarBattleEngine.fromCheckpoint(JSON.parse(JSON.stringify(rallied.checkpoint())),
    fieldId, state, 'option_b');
  for (const engine of [rallied, resumed]) {
    finish(engine);
    assert.equal(engine.outcome, 'costly-win');
    assert.equal(mission(engine).breached, true);
    assert.equal(mission(engine).held, 6);
    assert.equal(engine.events.filter(event => event.type === 'gap').length, 1);
    assert.ok(mission(engine).conditions.every(check => check.satisfied));
    const assessment = getBattleAssessment(engine.snapshot(), 'option_b');
    assert.ok(isBattleAssessment(assessment));
    assert.match(assessment.evidence.find(check => check.label === 'Western half of Prospect Hill held').value, /Met: Union pressure contained to the east/);
  }
  assert.deepEqual(resumed.snapshot(), rallied.snapshot());
});

test('Fredericksburg uses western Confederate exits with distinct road, wall and river terrain', () => {
  const engine = battle('option_a');
  const cobb = formation(engine, 'cobb');
  assert.equal(fieldTerrain(engine, cobb).defense, 1.42);
  assert.equal(fieldTerrain(engine, { x: 1300, y: 400 }).movement, .46);
  assert.equal(fieldTerrain(engine, { x: 1300, y: 418 }).movement, .99);
  assert.ok(engine.fieldExitTargets(cobb).every(exit => exit.x === 18));
  const openingLatitude = cobb.y;
  assert.equal(engine.order(cobb.id, 'fallback'), true);
  stepUntil(engine, () => cobb.order === 'fallback');
  assert.ok(cobb.target.x < cobb.x);
  assert.equal(cobb.target.y, openingLatitude);
  assert.equal(engine.order(cobb.id, 'withdraw'), true);
  stepUntil(engine, () => cobb.order === 'withdraw');
  assert.equal(cobb.target.x, 18);
  assert.ok(cobb.target.x < cobb.x);
});
