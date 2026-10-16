import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { BATTLE_ENGINE_CONFIGS } from '../src/battle/battleDefinitions.js';
import { BATTLE_OBJECTIVES, getBattleAssessment, isBattleAssessment } from '../src/battle/battleAssessment.js';
import { BATTLE_SCENARIOS, delegateBattle } from '../src/game/battles.js';

const state = { rulesVersion: 1, metrics: { militaryStrength: 85, munitions: 80, foodSupply: 78, treasury: 75, publicMorale: 80 } };
function play(id, choice, policy = 'hold') {
  const engine = new CivilWarBattleEngine(id, state, choice);
  const issued = new Set();
  for (let step = 0; step < 3300 && engine.outcome === 'undecided'; step += 1) {
    for (const unit of engine.state.filter((unit) => unit.side === 'confederate' && unit.active)) {
      if (issued.has(unit.id)) continue;
      issued.add(unit.id);
      if (policy === 'advance' || policy === 'withdraw') engine.order(unit.id, policy);
      if (policy === 'skirmish') { engine.setFormation(unit.id, 'skirmish'); engine.order(unit.id, 'advance'); }
      if (policy === 'transfer' && engine.config.transferFormationIds.includes(unit.id)) engine.order(unit.id, 'withdraw');
    }
    if (policy === 'covered' && (engine.thirdWinchester.rearguardHeld >= engine.config.rearguardHoldRequired
      || engine.thirdWinchester.middleFieldHeld >= engine.config.middleFieldHoldRequired)) {
      for (const unit of engine.state.filter((unit) => unit.side === 'confederate' && unit.active)) engine.order(unit.id, 'withdraw');
    }
    engine.tick(0.05);
  }
  assert.notEqual(engine.outcome, 'undecided');
  return engine.snapshot();
}

test('all eleven configured battles and all forty-four authored postures declare an assessment mission', () => {
  assert.deepEqual(Object.keys(BATTLE_OBJECTIVES).sort(), Object.keys(BATTLE_ENGINE_CONFIGS).sort());
  assert.equal(Object.values(BATTLE_OBJECTIVES).reduce((n, choices) => n + Object.keys(choices).length, 0), 44);
  for (const [id, config] of Object.entries(BATTLE_ENGINE_CONFIGS)) {
    assert.deepEqual(Object.keys(BATTLE_OBJECTIVES[id]).sort(), Object.keys(config.postures).sort());
    for (const choice of Object.keys(config.postures)) {
      const initial = new CivilWarBattleEngine(id, state, choice).snapshot();
      const assessment = getBattleAssessment(initial, choice);
      assert.ok(isBattleAssessment(assessment), `${id}:${choice}`);
      assert.equal(assessment.objective.status, 'in-progress');
      assert.equal(assessment.objective.score, null);
      assert.equal(assessment.commandScore, null, 'unfinished missions are not given a final grade');
    }
  }
  assert.equal(getBattleAssessment({ scenarioId: 'constructor' }, 'prototype'), null);
  assert.equal(getBattleAssessment({ scenarioId: 'unknown' }, 'option_b'), null);
});

test('missing Jackson’s flank window scores below completing the actual maneuver, despite greater preservation', () => {
  const idle = play('chancellorsville', 'option_a');
  const attack = play('chancellorsville', 'option_a', 'advance');
  assert.equal(idle.outcome, 'disciplined-withdrawal');
  assert.equal(idle.surpriseState, 'expired');
  assert.equal(attack.outcome, 'decisive-win');
  assert.equal(attack.surpriseState, 'triggered');
  assert.ok(idle.score > attack.score, 'the legacy numeric result remains exactly the old preservation-heavy measure');
  const a = getBattleAssessment(idle, 'option_a'), b = getBattleAssessment(attack, 'option_a');
  assert.equal(a.objective.status, 'failed');
  assert.equal(a.objective.score, 0);
  assert.equal(b.objective.status, 'achieved');
  assert.equal(b.objective.score, 100);
  assert.ok(b.commandScore > a.commandScore);
  assert.ok(a.preservation.score > b.preservation.score, 'preservation credit stays visible instead of being erased');
});

// Expected results are taken from the authored mission conditions: timed contact,
// covered exit, breach/containment, and transfer. These run real commands, not
// synthetic result injection or a hash regenerated from the implementation.
const successfulMissions = [
  ['first_manassas', 'option_c', 'withdraw', 'disciplined-withdrawal'],
  ['shiloh', 'option_d', 'withdraw', 'disciplined-withdrawal'],
  ['shiloh', 'option_b', 'hold', 'disciplined-withdrawal'],
  ['chancellorsville', 'option_b', 'hold', 'disciplined-withdrawal'],
  ['wilderness', 'option_b', 'hold', 'disciplined-withdrawal'],
  ['wilderness', 'option_d', 'withdraw', 'disciplined-withdrawal'],
  ['third_winchester', 'option_b', 'covered', 'disciplined-withdrawal'],
  ['cedar_creek', 'option_a', 'advance', 'decisive-win'],
  ['cedar_creek', 'option_c', 'withdraw', 'disciplined-withdrawal'],
  ['gettysburg', 'option_a', 'advance', 'costly-win'],
  ['gettysburg', 'option_c', 'withdraw', 'disciplined-withdrawal'],
  ['gettysburg_jackson', 'option_b', 'skirmish', 'costly-win'],
  ['chickamauga', 'option_b', 'advance', 'costly-win'],
  ['cold_harbor', 'option_b', 'hold', 'decisive-win'],
  ['cold_harbor', 'option_d', 'transfer', 'disciplined-withdrawal'],
  ['petersburg', 'option_a', 'advance', 'decisive-win'],
  ['petersburg', 'option_b', 'hold', 'costly-win'],
  ['petersburg', 'option_d', 'hold', 'decisive-win'],
];
for (const [id, choice, policy, outcome] of successfulMissions) {
  test(`actual selected mission completes: ${id}:${choice}:${policy}`, () => {
    const snapshot = play(id, choice, policy);
    assert.equal(snapshot.outcome, outcome);
    const assessment = getBattleAssessment(snapshot, choice);
    assert.ok(isBattleAssessment(assessment));
    assert.equal(assessment.objective.status, 'achieved');
    assert.ok(assessment.commandScore >= 75);
  });
}

test('leaving a holding objective and escaping without a covered exit do not receive completion credit', () => {
  for (const [id, choice] of [['first_manassas', 'option_b'], ['cold_harbor', 'option_b'], ['third_winchester', 'option_b']]) {
    const result = getBattleAssessment(play(id, choice, 'withdraw'), choice);
    assert.notEqual(result.objective.status, 'achieved');
    assert.ok(result.commandScore < 75);
  }
});

test('a completed sortie requires both target strikes and the return, not merely a favorable result label', () => {
  const observed = { scenarioId: 'petersburg', outcome: 'costly-win', confederateLossRate: 0.1, ammunitionRate: 0.8, sortieTargetsHit: ['siege-train-east', 'siege-train-west'], sortieState: 'raided' };
  const noReturn = getBattleAssessment(observed, 'option_c');
  assert.equal(noReturn.objective.status, 'partial');
  assert.equal(getBattleAssessment({ ...observed, sortieState: 'withdrawn' }, 'option_c').objective.status, 'achieved');
});

test('a costly Gettysburg success does not claim the decisive heights objective or recognition threshold', () => {
  const observed = { scenarioId: 'gettysburg_jackson', outcome: 'costly-win', confederateLossRate: 0.1, ammunitionRate: 0.8, surpriseState: 'triggered' };
  assert.equal(getBattleAssessment(observed, 'option_a').objective.status, 'partial');
  assert.equal(getBattleAssessment({ ...observed, outcome: 'decisive-win' }, 'option_a').objective.status, 'achieved');
});

test('the rubric strictly ranks a completed objective above any incomplete objective, at every preservation extreme', () => {
  for (const id of Object.keys(BATTLE_OBJECTIVES)) for (const choice of Object.keys(BATTLE_OBJECTIVES[id])) {
    const samples = [];
    for (const result of ['decisive-win', 'costly-win', 'disciplined-withdrawal', 'defeat', 'rout']) {
      for (const loss of [0, 1]) {
        const assessed = getBattleAssessment({ battleId: id, result, delegated: true, confederateLossRate: loss }, choice);
        assert.ok(isBattleAssessment(assessed));
        samples.push(assessed);
      }
    }
    const completed = samples.filter((item) => item.objective.status === 'achieved');
    const incomplete = samples.filter((item) => item.objective.status !== 'achieved');
    assert.ok(completed.length && incomplete.length);
    assert.ok(Math.min(...completed.map((item) => item.commandScore)) > Math.max(...incomplete.map((item) => item.commandScore)), `${id}:${choice}`);
  }
});

test('new-rule delegated assessments describe estimates without invented tactical telemetry', () => {
  for (const battle of Object.values(BATTLE_SCENARIOS)) for (const choice of ['option_a', 'option_b', 'option_c', 'option_d']) {
    const result = delegateBattle({ ...state, rulesVersion: 2 }, battle, choice);
    assert.ok(isBattleAssessment(result.assessment));
    assert.equal(result.assessment.source, 'delegated');
    assert.equal(result.assessment.preservation.ammunitionRetained, null);
    assert.ok(result.assessment.evidence.every((item) => !/surprise|arrival|sector|minute|corridor|mine|breach/i.test(item.label)));
    assert.match(result.assessment.explanation.join(' '), /were not observed/);
    assert.equal(delegateBattle(state, battle, choice).assessment, undefined);
  }
});

test('imported assessment validation rejects malformed renderable fields and inconsistent grades', () => {
  const valid = getBattleAssessment({ scenarioId: 'first_manassas', outcome: 'decisive-win', confederateLossRate: 0.1, ammunitionRate: 0.8 }, 'option_b');
  assert.ok(isBattleAssessment(valid));
  for (const invalid of [null, [], {}, { ...valid, version: 2 }, { ...valid, explanation: [null] },
    { ...valid, evidence: [{ label: 'x', value: {} }] }, { ...valid, commandScore: NaN },
    { ...valid, commandScore: 0 }, { ...valid, objective: { ...valid.objective, label: {} } },
    { ...valid, objective: { ...valid.objective, progress: Infinity } },
    { ...valid, preservation: { ...valid.preservation, armyRetained: 1000 } }]) {
    assert.equal(isBattleAssessment(invalid), false);
  }
});

test('new-rule assessment evidence is stable after the field decision while the result animation finishes', () => {
  for (const id of Object.keys(BATTLE_OBJECTIVES)) for (const choice of Object.keys(BATTLE_OBJECTIVES[id])) {
    const engine = new CivilWarBattleEngine(id, { ...state, rulesVersion: 2 }, choice);
    for (let step = 0; step < 3300 && !engine.pendingOutcome; step += 1) engine.tick(0.05);
    assert.ok(engine.pendingOutcome, `${id}:${choice} resolves`);
    const atDecision = engine.snapshot().assessment;
    assert.ok(isBattleAssessment(atDecision));
    while (engine.outcome === 'undecided') engine.tick(0.05);
    assert.deepEqual(engine.snapshot().assessment, atDecision, `${id}:${choice} assessment must not drift during result animation`);
  }
});
