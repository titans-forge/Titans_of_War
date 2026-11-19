import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { getBattleAssessment, isBattleAssessment } from '../src/battle/battleAssessment.js';
import { createFreshCampaignState } from '../src/game/campaignStorage.js';

const campaign = createFreshCampaignState(1865, 'five_forks');
const screen = ['five-forks-wallace', 'five-forks-fitz-lee'];
const battle = id => new CivilWarBattleEngine('five_forks', campaign, id);
const fitToScreen = engine => {
  for (const unit of engine.state.filter(unit => unit.side === 'confederate' && !screen.includes(unit.id))) {
    assert.equal(engine.order(unit.id, 'withdraw'), true);
  }
};
const orderAllOut = engine => {
  for (const unit of engine.state.filter(unit => unit.side === 'confederate')) {
    assert.equal(engine.order(unit.id, 'withdraw'), true);
  }
};
function stepUntil(engine, done) {
  for (let step = 0; step < 1400 && !done(); step++) engine.tick(.05);
  assert.ok(done(), 'battle did not reach the requested checkpoint');
}

test('the extended line must reinforce the Angle to earn a temporary delay', () => {
  const idle = battle('option_a');
  stepUntil(idle, () => idle.outcome !== 'undecided');
  assert.equal(idle.outcome, 'defeat');
  assert.equal(idle.fieldBattle.fiveForks.conditions.find(row => row.label === 'The Angle').satisfied, false);
  assert.match(idle.snapshot().assessment.afterAction.next[0], /Move Wallace/);

  const defended = battle('option_a');
  assert.equal(defended.move('five-forks-wallace', { x: 1129, y: 331 }), true);
  stepUntil(defended, () => defended.outcome !== 'undecided');
  assert.equal(defended.outcome, 'costly-win');
  assert.equal(Math.round(defended.time), 44);
  assert.ok(defended.fieldBattle.fiveForks.conditions.every(row => row.satisfied));
  const grade = getBattleAssessment(defended.snapshot(), 'option_a');
  assert.equal(grade.objective.status, 'achieved');
  assert.ok(isBattleAssessment(grade));
});

test('covered withdrawal keeps a tested screen and survives a mid-battle checkpoint', () => {
  const covered = battle('option_b');
  fitToScreen(covered);
  stepUntil(covered, () => covered.fieldBattle.fiveForks.screened >= 3);
  assert.ok(covered.fieldBattle.fiveForks.screened < 8);
  const restored = CivilWarBattleEngine.fromCheckpoint(JSON.parse(JSON.stringify(covered.checkpoint())),
    covered.scenarioId, campaign, 'option_b');

  for (const engine of [covered, restored]) {
    stepUntil(engine, () => engine.fieldBattle.fiveForks.screened >= 8);
    assert.ok(engine.events.some(event => event.type === 'objective' && event.message.includes('rearguard now')));
    for (const id of screen) assert.equal(engine.order(id, 'withdraw'), true);
    stepUntil(engine, () => engine.outcome !== 'undecided');
    assert.equal(engine.outcome, 'disciplined-withdrawal');
    assert.ok(engine.fieldBattle.escaped >= .65);
    assert.ok(engine.state.filter(unit => screen.includes(unit.id)).every(unit => unit.withdrawalOrganized));
  }
  assert.deepEqual(restored.snapshot(), covered.snapshot());

  const premature = battle('option_b');
  orderAllOut(premature);
  stepUntil(premature, () => premature.outcome !== 'undecided');
  assert.ok(premature.fieldBattle.escaped >= .65, 'strength alone must be insufficient');
  assert.equal(premature.fieldBattle.fiveForks.screened, 0);
  assert.equal(premature.outcome, 'defeat');
  assert.equal(premature.snapshot().assessment.objective.status, 'failed');
});

test('early withdrawal requires real exits and preserves optional recovery goals', () => {
  const early = battle('option_c');
  const army = early.state.filter(unit => unit.side === 'confederate');
  assert.deepEqual(early.fieldExitTargets(army[0]), [
    { x: 690, y: 18 }, { x: 780, y: 18 }, { x: 870, y: 18 },
  ]);
  assert.equal(early.fieldBattle.requireExitIds.length, army.length);
  orderAllOut(early);
  stepUntil(early, () => early.outcome !== 'undecided');
  assert.equal(early.outcome, 'disciplined-withdrawal');
  assert.ok(army.every(unit => unit.departureReason === 'rear-exit' && unit.withdrawalOrganized));
  assert.ok(early.snapshot().assessment.withdrawalGoals.goals.every(goal => goal.status === 'achieved'));

  const stationary = battle('option_c');
  stepUntil(stationary, () => stationary.outcome !== 'undecided');
  assert.equal(stationary.outcome, 'defeat');
  assert.equal(stationary.fieldBattle.escaped, 0);
  assert.equal(Math.round(stationary.time), 36);
});
