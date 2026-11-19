import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { getBattleAssessment, isBattleAssessment } from '../src/battle/battleAssessment.js';
import { createPracticeState } from '../src/game/practiceConditions.js';

const state = createPracticeState({ id: 'antietam', turn: 8 });
const make = choice => new CivilWarBattleEngine('antietam', state, choice);
const unit = (battle, id) => battle.state.find(formation => formation.id === `antietam-${id}`);

function advance(battle, until) {
  for (let frame = 0; frame < 2150 && until(battle); frame++) battle.tick(.05);
}

function finish(battle) {
  advance(battle, battle => battle.outcome === 'undecided');
  const snapshot = battle.snapshot();
  const assessment = getBattleAssessment(snapshot, battle.choiceId);
  assert.ok(isBattleAssessment(assessment));
  assert.ok(assessment.commandScore !== null);
  for (const formation of snapshot.formations) {
    assert.ok(['x', 'y', 'fatigue', 'strength', 'morale', 'cohesion'].every(key => Number.isFinite(formation[key])));
  }
  return { snapshot, assessment };
}

function withdrawOpening(battle) {
  for (const unit of battle.state.filter(formation => formation.side === 'confederate' && formation.active)) {
    assert.equal(battle.order(unit.id, 'withdraw'), true);
  }
}

test('Antietam has three actions under phased Union pressure and the Lower Bridge crossing is faster than creek terrain', () => {
  const battle = make('option_a');
  assert.deepEqual(battle.fieldBattle.sectors.map(site => site.name), ['The Cornfield', 'Bloody Lane', 'Lower Bridge']);
  assert.ok(battle.fieldTerrain({ x: 1325, y: 473 }).movement > battle.fieldTerrain({ x: 1450, y: 473 }).movement);
  finish(battle);
  const arrivals = battle.events.filter(event => event.type === 'reinforcement');
  assert.match(arrivals[0].message, /Mansfield/);
  assert.match(arrivals[1].message, /French/);
  assert.match(arrivals[2].message, /Richardson/);
  assert.match(arrivals[3].message, /Burnside/);
  assert.match(arrivals[4].message, /Light Division/);
  assert.ok(arrivals.every((event, index) => index === 0 || arrivals[index - 1].time < event.time));
});

test('Bloody Lane defense has to face contact and hold through the deadline', () => {
  const stand = make('option_a');
  const held = finish(stand);
  assert.equal(held.assessment.objective.status, 'achieved');
  assert.ok(held.snapshot.fieldBattle.antietam.underFire.center);
  assert.equal(held.assessment.commandScore, 99);
  const exit = make('option_a');
  withdrawOpening(exit);
  advance(exit, battle => !unit(battle, 'light-division').active);
  assert.equal(exit.order('antietam-light-division', 'withdraw'), true);
  const abandoned = finish(exit);
  assert.equal(abandoned.assessment.objective.status, 'failed');
  assert.match(abandoned.assessment.afterAction.next[0], /within the Bloody Lane sector/);
});

test('organized exit accounts for the later reserve; idle formations miss the deadline', () => {
  const withdrawn = make('option_b');
  withdrawOpening(withdrawn);
  advance(withdrawn, battle => !unit(battle, 'light-division').active);
  assert.equal(withdrawn.order('antietam-light-division', 'withdraw'), true);
  const { snapshot, assessment } = finish(withdrawn);
  assert.equal(snapshot.outcome, 'disciplined-withdrawal');
  assert.equal(assessment.objective.status, 'achieved');
  assert.equal(snapshot.fieldBattle.antietam.conditions[0].detail, '100% / 65%');
  assert.equal(assessment.withdrawalGoals.goals.every(goal => goal.status === 'achieved'), true);
  const idle = finish(make('option_b'));
  assert.equal(idle.assessment.objective.status, 'failed');
  assert.equal(idle.snapshot.fieldBattle.antietam.conditions[0].satisfied, false);
});

test('timely support in the Cornfield earns the two-sector defense; leaving the opening line in place fails', () => {
  const held = make('option_c');
  advance(held, battle => battle.time < 24);
  assert.equal(held.order('antietam-hood', 'assault', { sectorId: 'left' }), true);
  const { assessment, snapshot } = finish(held);
  assert.equal(assessment.objective.status, 'achieved');
  assert.deepEqual(snapshot.fieldBattle.antietam.underFire, { center: true, left: true });
  const idle = finish(make('option_c'));
  assert.equal(idle.assessment.objective.status, 'failed');
  assert.equal(idle.snapshot.fieldBattle.antietam.conditions[0].satisfied, false);
});

test('the alternate Lower Bridge operation needs Hill, a supporting formation and eight continuous field minutes', () => {
  const recover = make('option_d');
  advance(recover, battle => battle.time < 47);
  assert.equal(recover.order('antietam-toombs', 'move', { x: 1400, y: 559 }), true);
  assert.equal(recover.order('antietam-light-division', 'move', { x: 1265, y: 610 }), true);
  const { assessment, snapshot } = finish(recover);
  assert.equal(assessment.objective.status, 'achieved');
  assert.equal(snapshot.fieldBattle.antietam.held, 8);
  const idle = finish(make('option_d'));
  assert.equal(idle.assessment.objective.status, 'failed');
  assert.equal(idle.snapshot.fieldBattle.antietam.held, 0);
});

test('mid-battle field checkpoint restores orders, timed arrivals and mission progress exactly', () => {
  const original = make('option_c');
  advance(original, battle => battle.time < 24);
  original.order('antietam-hood', 'assault', { sectorId: 'left' });
  advance(original, battle => battle.time < 34);
  const checkpoint = original.checkpoint();
  const restored = CivilWarBattleEngine.fromCheckpoint(checkpoint, 'antietam', state, 'option_c');
  assert.deepEqual(restored.checkpoint(), checkpoint);
  finish(original);
  finish(restored);
  assert.deepEqual(restored.checkpoint(), original.checkpoint());
});
