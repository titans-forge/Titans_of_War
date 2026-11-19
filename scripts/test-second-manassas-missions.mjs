import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { getBattleAssessment, isBattleAssessment } from '../src/battle/battleAssessment.js';
import { fieldTerrain } from '../src/battle/fieldBattleProfiles.js';

const state = { rulesVersion: 2, battleRulesVersion: 18,
  metrics: { militaryStrength: 85, munitions: 80, treasury: 75, foodSupply: 78, publicMorale: 80 } };
const fieldId = 'second_manassas';
const battle = choice => new CivilWarBattleEngine(fieldId, state, choice);
const mission = engine => engine.fieldBattle.secondManassas;
const unitId = name => `second-manassas-${name}`;

function advanceUntil(engine, condition) {
  for (let step = 0; step < 1020 && !condition(); step++) engine.tick(.05);
  assert.ok(condition(), 'battle reached requested state');
}

const finish = engine => advanceUntil(engine, () => engine.outcome !== 'undecided');
const assaultRidge = (engine, formations = ['hood', 'kemper']) => {
  for (const name of formations) assert.equal(engine.order(unitId(name), 'assault', { sectorId: 'right' }), true);
};
const deployBattery = engine => assert.equal(engine.move(unitId('battery'), { x: 510, y: 545 }), true);

test('the flank must keep a tested Deep Cut and capture Chinn Ridge with both Longstreet formations', () => {
  const idle = battle('option_a');
  finish(idle);
  assert.equal(idle.outcome, 'defeat');
  assert.equal(mission(idle).conditions[0].satisfied, true);
  assert.equal(mission(idle).conditions[1].satisfied, false);
  assert.match(idle.snapshot().assessment.afterAction.next[0], /Hood and Kemper/);

  const unsupported = battle('option_a');
  assaultRidge(unsupported, ['hood']);
  finish(unsupported);
  assert.equal(unsupported.outcome, 'defeat');
  assert.equal(mission(unsupported).held, 0);

  const abandonedCut = battle('option_a');
  assaultRidge(abandonedCut);
  assert.equal(abandonedCut.move(unitId('lawton'), { x: 386, y: 415 }), true);
  finish(abandonedCut);
  assert.equal(abandonedCut.outcome, 'defeat');
  assert.equal(mission(abandonedCut).conditions[0].satisfied, false);

  const coordinated = battle('option_a');
  assaultRidge(coordinated);
  finish(coordinated);
  assert.equal(coordinated.outcome, 'costly-win');
  assert.equal(mission(coordinated).tested, true);
  assert.equal(mission(coordinated).held, 6);
  assert.ok(coordinated.time < 39);
  assert.ok(mission(coordinated).conditions.every(check => check.satisfied));
  const assessment = getBattleAssessment(coordinated.snapshot(), 'option_a');
  assert.ok(isBattleAssessment(assessment));
  assert.equal(assessment.objective.status, 'achieved');
  assert.match(assessment.evidence.find(check => check.label === 'Uninterrupted field interval').value, /Met: 6 \/ 6/);
});

test('the limited defense needs a deployed battery and an intact reserve, including after reload', () => {
  const idle = battle('option_b');
  finish(idle);
  assert.equal(idle.outcome, 'defeat');
  assert.equal(mission(idle).conditions[1].satisfied, false);
  assert.equal(Math.round(idle.time), 33);

  const reserveCommitted = battle('option_b');
  deployBattery(reserveCommitted);
  advanceUntil(reserveCommitted, () => mission(reserveCommitted).held >= 3);
  assert.equal(reserveCommitted.order(unitId('hood'), 'advance'), true);
  finish(reserveCommitted);
  assert.equal(reserveCommitted.outcome, 'defeat');
  assert.equal(mission(reserveCommitted).conditions[1].satisfied, true);
  assert.equal(mission(reserveCommitted).conditions[2].satisfied, false);

  const prepared = battle('option_b');
  deployBattery(prepared);
  advanceUntil(prepared, () => mission(prepared).held >= 3);
  const resumed = CivilWarBattleEngine.fromCheckpoint(JSON.parse(JSON.stringify(prepared.checkpoint())),
    fieldId, state, 'option_b');
  for (const engine of [prepared, resumed]) {
    finish(engine);
    assert.equal(engine.outcome, 'costly-win');
    assert.equal(mission(engine).held, 10);
    assert.ok(engine.time < 33);
    assert.ok(mission(engine).conditions.every(check => check.satisfied));
    const assessment = getBattleAssessment(engine.snapshot(), 'option_b');
    assert.equal(assessment.objective.status, 'achieved');
    assert.match(assessment.evidence.find(check => check.label === 'Groveton gun line').value, /Met: Battery deployed/);
  }
  assert.deepEqual(resumed.snapshot(), prepared.snapshot());
});

test('the cut provides cover while the turnpike speeds formations between wings', () => {
  const engine = battle('option_a');
  assert.equal(fieldTerrain(engine, { x: 560, y: 300 }).defense, 1.35);
  assert.equal(fieldTerrain(engine, { x: 1080, y: 660 }).defense, 1.17);
  assert.equal(fieldTerrain(engine, { x: 600, y: 507 }).movement, 1.11);
});
