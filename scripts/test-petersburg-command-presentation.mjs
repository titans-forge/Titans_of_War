import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getBattleAssessment } from '../src/battle/battleAssessment.js';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { petersburgReadout } from '../src/battle/petersburgCommandPresentation.js';
import { createPracticeState } from '../src/game/practiceConditions.js';

function start(choiceId) {
  return new CivilWarBattleEngine('petersburg', createPracticeState({ id: 'petersburg_siege', turn: 20 }), choiceId);
}

function finish(engine) {
  for (let step = 0; step < 2400 && engine.outcome === 'undecided'; step++) engine.tick(.05);
  assert.notEqual(engine.outcome, 'undecided');
  return engine.snapshot();
}

test('the Crater card opts in on current manual non-sortie fields', () => {
  const snapshot = start('option_a').snapshot();
  const unchanged = structuredClone(snapshot);
  const view = petersburgReadout(snapshot, 'option_a');
  assert.equal(view.state, 'breached');
  assert.equal(view.compact, 'Federal assault in 4');
  assert.match(view.detail, /Mahone available 0 \/ 2 · Next arrival minute 11/);
  assert.deepEqual(snapshot, unchanged);
  assert.equal(petersburgReadout({ ...snapshot, battleRulesVersion: 17 }, 'option_a'), null);
  assert.equal(petersburgReadout({ ...snapshot, delegated: true }, 'option_a'), null);
  assert.equal(petersburgReadout({ ...snapshot, scenarioId: 'cold_harbor' }, 'option_a'), null);
  assert.equal(petersburgReadout(start('option_c').snapshot(), 'option_c'), null);
});

test('containment shows observed availability and crossing counts, then reports an open breach', () => {
  const engine = start('option_b');
  for (let step = 0; step < 820; step++) engine.tick(.05);
  const snapshot = engine.snapshot();
  assert.equal(snapshot.craterState, 'contested');
  assert.match(petersburgReadout(snapshot, 'option_b').compact, /^Hold the works · \d+ min left$/);
  assert.match(petersburgReadout(snapshot, 'option_b').detail, /Federal assault formations through the line 0 \(need 0\)/);
  const attacker = snapshot.formations.find(unit => unit.id === engine.config.craterAttackerIds[0]);
  Object.assign(attacker, { active: true, status: 'steady', y: 655 });
  assert.match(petersburgReadout(snapshot, 'option_b').detail, /Federal assault formations through the line 1 \(need 0\)/);
  attacker.status = 'routing';
  assert.match(petersburgReadout(snapshot, 'option_b').detail, /Federal assault formations through the line 0 \(need 0\)/);
  const result = finish(engine);
  const view = petersburgReadout(result, 'option_b');
  assert.equal(view.state, 'contained');
  assert.match(view.detail, /The breach remains open/);
  assert.equal(getBattleAssessment(result, 'option_b').objective.status, 'achieved');
});

test('coordinated reserve orders seal the breach while waiting passes the deadline', () => {
  const engine = start('option_a');
  for (let step = 0; step < 340; step++) engine.tick(.05);
  assert.match(petersburgReadout(engine.snapshot(), 'option_a').detail, /Mahone available 2 \/ 2/);
  for (const id of engine.config.mahoneFormationIds) assert.equal(engine.order(id, 'assault', { sectorId: 'center' }), true);
  const sealed = finish(engine);
  assert.equal(petersburgReadout(sealed, 'option_a').title, 'Crater breach sealed');
  assert.equal(getBattleAssessment(sealed, 'option_a').objective.status, 'achieved');

  const overrun = finish(start('option_a'));
  const failed = getBattleAssessment(overrun, 'option_a');
  assert.equal(petersburgReadout(overrun, 'option_a').state, 'overrun');
  assert.match(petersburgReadout(overrun, 'option_a').detail, /field minute 48 deadline/);
  assert.equal(failed.objective.status, 'failed');
  assert.match(failed.afterAction.next[0], /order both brigades to Assault before minute 48/);
});

test('the defense line card distinguishes a pending alternate event from a recorded one', () => {
  const snapshot = start('option_d').snapshot();
  assert.match(petersburgReadout(snapshot, 'option_d').detail, /Mine-lane action pending/);
  assert.match(petersburgReadout({ ...snapshot, craterState: 'contested', mineState: 'detonated' }, 'option_d').detail,
    /Mine shock recorded/);
});
