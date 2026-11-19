import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getBattleAssessment, isBattleAssessment } from '../src/battle/battleAssessment.js';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { createPracticeState } from '../src/game/practiceConditions.js';

const scenarioId = 'sailors_creek';
const practice = ammunition => createPracticeState({ id: scenarioId, turn: 22 }, 'reserve', ammunition);
const mission = engine => engine.fieldBattle.sailorsCreek;
const unit = (engine, who) => engine.state.find(entry => entry.id === `sailors-${who}`);
const southBank = { x: 884, y: 553 };
const aidStaging = { x: 1108, y: 726 };
const resume = (engine, state) => CivilWarBattleEngine.fromCheckpoint(
  JSON.parse(JSON.stringify(engine.checkpoint())), scenarioId, state, engine.choiceId,
);

function runUntil(engine, predicate) {
  for (let step = 0; step < 1900 && !predicate() && engine.outcome === 'undecided'; step++) engine.tick(.05);
  assert.ok(predicate(), `Expected field state by minute ${engine.time.toFixed(1)}; ${mission(engine).detail}`);
}

function order(engine, who, command, target) {
  assert.equal(engine.order(unit(engine, who).id, command, target), true, `${who} received ${command}`);
}

const finish = engine => runUntil(engine, () => engine.outcome !== 'undecided');
function assertAssessed(engine, status) {
  const assessment = getBattleAssessment(engine.snapshot(), engine.choiceId);
  assert.ok(isBattleAssessment(assessment));
  assert.equal(assessment.objective.status, status);
  for (const row of mission(engine).conditions) {
    assert.equal(assessment.evidence.find(evidence => evidence.label === row.label)?.value,
      `${row.satisfied ? 'Met' : 'Unmet'}: ${row.detail}`);
  }
}

test('setting both positions under fire opens a local aid window with full or depleted ammunition', () => {
  for (const supply of ['full', 'depleted']) {
    const state = practice(supply);
    const engine = new CivilWarBattleEngine(scenarioId, state, 'option_a');
    assert.equal(mission(engine).held, 0);
    order(engine, 'kershaw', 'move', southBank);
    order(engine, 'escort', 'move', aidStaging);
    runUntil(engine, () => mission(engine).held >= 2);
    assert.ok(mission(engine).contact && mission(engine).escortInPlace);
    assert.ok(['lee', 'kershaw'].some(who => unit(engine, who).lastIncomingAt >= 0));
    const restored = resume(engine, state);
    for (const candidate of [engine, restored]) {
      finish(candidate);
      assert.equal(candidate.outcome, 'costly-win');
      assert.equal(mission(candidate).held, 8);
      assertAssessed(candidate, 'achieved');
    }
    assert.deepEqual(engine.snapshot(), restored.snapshot());
  }
});

test('a steady South Bank without the escort fails the aid objective', () => {
  const engine = new CivilWarBattleEngine(scenarioId, practice('full'), 'option_a');
  order(engine, 'kershaw', 'move', southBank);
  runUntil(engine, () => mission(engine).contact);
  assert.equal(mission(engine).escortInPlace, false);
  assert.equal(mission(engine).held, 0);
  finish(engine);
  assert.equal(engine.outcome, 'defeat');
  assertAssessed(engine, 'failed');
});

test('moving the escort off Aid Staging resets uninterrupted aid time', () => {
  const engine = new CivilWarBattleEngine(scenarioId, practice('depleted'), 'option_a');
  order(engine, 'kershaw', 'move', southBank);
  order(engine, 'escort', 'move', aidStaging);
  runUntil(engine, () => mission(engine).held >= 2);
  order(engine, 'escort', 'move', { x: 1320, y: 747 });
  runUntil(engine, () => mission(engine).held === 0);
  assert.ok(engine.fieldBattle.controlEvents.some(event => event.message.includes('hold timer reset')));
  finish(engine);
  assert.equal(engine.outcome, 'defeat');
});

test('sending the lead out under Kershaw’s screen preserves the force through actual western exits', () => {
  for (const supply of ['full', 'depleted']) {
    const state = practice(supply);
    const engine = new CivilWarBattleEngine(scenarioId, state, 'option_b');
    order(engine, 'lee', 'withdraw');
    order(engine, 'escort', 'withdraw');
    runUntil(engine, () => mission(engine).screened);
    assert.equal(mission(engine).leadExited, 2);
    assert.ok(unit(engine, 'kershaw').lastIncomingAt >= 0);
    order(engine, 'kershaw', 'withdraw');
    const restored = resume(engine, state);
    for (const candidate of [engine, restored]) {
      finish(candidate);
      assert.equal(candidate.outcome, 'disciplined-withdrawal');
      assert.ok(mission(candidate).escaped >= .65 && mission(candidate).rearguardExited);
      for (const who of ['lee', 'escort', 'kershaw']) {
        const formation = unit(candidate, who);
        assert.equal(formation.departureReason, 'rear-exit');
        assert.ok(formation.withdrawalOrganized && formation.x < 40);
      }
      assertAssessed(candidate, 'achieved');
    }
    assert.deepEqual(engine.snapshot(), restored.snapshot());
  }
});

test('withdrawing Kershaw after contact but before the column clears fails despite three organized exits', () => {
  const engine = new CivilWarBattleEngine(scenarioId, practice('depleted'), 'option_b');
  order(engine, 'lee', 'withdraw');
  order(engine, 'escort', 'withdraw');
  runUntil(engine, () => mission(engine).contact);
  assert.equal(mission(engine).leadExited, 0);
  order(engine, 'kershaw', 'withdraw');
  finish(engine);
  assert.equal(engine.outcome, 'defeat');
  assert.equal(mission(engine).leadExited, 2);
  assert.ok(mission(engine).rearguardExited && mission(engine).escaped >= .65);
  assert.equal(mission(engine).screened, false);
  assertAssessed(engine, 'failed');
});
