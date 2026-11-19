import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { getBattleAssessment, isBattleAssessment } from '../src/battle/battleAssessment.js';

const campaign = { rulesVersion: 2, battleRulesVersion: 18,
  metrics: { militaryStrength: 85, munitions: 80, foodSupply: 78, publicMorale: 79, treasury: 75 } };
const battle = choiceId => new CivilWarBattleEngine('jonesborough', campaign, choiceId);
const assault = (engine, names) => {
  for (const name of names) assert.equal(engine.order(`jonesborough-${name}`, 'assault', { sectorId: 'center' }), true);
};
const withdraw = (engine, { recoverBattery = true } = {}) => {
  for (const unit of engine.state.filter(unit => unit.side === 'confederate' && (recoverBattery || unit.type !== 'artillery'))) {
    assert.equal(engine.order(unit.id, 'withdraw'), true);
  }
};

function stepUntil(engine, condition) {
  for (let step = 0; step < 980 && !condition(); step++) engine.tick(.05);
  assert.ok(condition(), 'battle did not reach the requested checkpoint');
}

const finish = engine => stepUntil(engine, () => engine.outcome !== 'undecided');

test('the counterattack needs supported infantry and seven uncontested field minutes on the crossing', () => {
  const idle = battle('option_a');
  finish(idle);
  assert.equal(idle.outcome, 'defeat');
  assert.equal(Math.round(idle.time), 39);
  assert.match(idle.snapshot().assessment.afterAction.next[0], /Govan and Granbury/);

  const lone = battle('option_a');
  assault(lone, ['govan']);
  finish(lone);
  assert.equal(lone.outcome, 'defeat');
  assert.equal(lone.fieldBattle.jonesborough.held, 0);

  const pair = battle('option_a');
  assault(pair, ['govan', 'granbury']);
  stepUntil(pair, () => pair.fieldBattle.jonesborough.held >= 2);
  const resumed = CivilWarBattleEngine.fromCheckpoint(JSON.parse(JSON.stringify(pair.checkpoint())),
    'jonesborough', campaign, 'option_a');
  for (const engine of [pair, resumed]) {
    finish(engine);
    assert.equal(engine.outcome, 'costly-win');
    assert.equal(engine.fieldBattle.jonesborough.held, 7);
    assert.ok(engine.time < 39);
    const grade = getBattleAssessment(engine.snapshot(), 'option_a');
    assert.ok(isBattleAssessment(grade));
    assert.equal(grade.objective.status, 'achieved');
    assert.match(grade.evidence.find(row => row.label === 'Uninterrupted rail window').value, /Met: 7 \/ 7/);
  }
  assert.deepEqual(resumed.snapshot(), pair.snapshot());
});

test('retiring infantry alone does not recover the battery', () => {
  const evacuatedInfantry = battle('option_b');
  withdraw(evacuatedInfantry, { recoverBattery: false });
  finish(evacuatedInfantry);
  assert.ok(evacuatedInfantry.fieldBattle.escaped >= .72, 'the battery requirement must be independently tested');
  assert.deepEqual(evacuatedInfantry.fieldBattle.jonesborough.conditions.map(row => row.satisfied), [true, false]);
  assert.equal(evacuatedInfantry.outcome, 'defeat');

  const evacuated = battle('option_b');
  assert.deepEqual(evacuated.fieldExitTargets(evacuated.state[0]), [
    { x: 855, y: 862 }, { x: 930, y: 862 }, { x: 1005, y: 862 },
  ]);
  withdraw(evacuated);
  finish(evacuated);
  assert.equal(evacuated.outcome, 'disciplined-withdrawal');
  assert.ok(evacuated.time < 32);
  assert.ok(evacuated.state.filter(unit => unit.side === 'confederate').every(unit => unit.departureReason === 'rear-exit'
    && unit.withdrawalOrganized && !unit.gunsAbandoned));
  const grade = getBattleAssessment(evacuated.snapshot(), 'option_b');
  assert.ok(isBattleAssessment(grade));
  assert.equal(grade.objective.status, 'achieved');
  assert.match(grade.evidence.find(row => row.label === 'Hardee’s battery').value, /Met: Guns withdrawn in order/);

  const idle = battle('option_b');
  finish(idle);
  assert.equal(idle.outcome, 'defeat');
  assert.equal(idle.fieldBattle.escaped, 0);
  assert.equal(Math.round(idle.time), 32);
});
