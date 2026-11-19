import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getBattleAssessment, isBattleAssessment } from '../src/battle/battleAssessment.js';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { createPracticeState } from '../src/game/practiceConditions.js';

const scenarioId = 'kennesaw_mountain';
const practice = ammunition => createPracticeState({ id: scenarioId, turn: 16 }, 'reserve', ammunition);
const mission = engine => engine.fieldBattle.kennesaw;
const unit = (engine, who) => engine.state.find(entry => entry.id === `kennesaw-${who}`);
const condition = (engine, label) => mission(engine).conditions.find(entry => entry.label === label).satisfied;
const works = { x: 865, y: 460 };
const road = { x: 1155, y: 695 };
const resume = (engine, state) => CivilWarBattleEngine.fromCheckpoint(
  JSON.parse(JSON.stringify(engine.checkpoint())), scenarioId, state, engine.choiceId,
);

function runUntil(engine, predicate) {
  for (let step = 0; step < 1640 && !predicate() && engine.outcome === 'undecided'; step++) engine.tick(.05);
  assert.ok(predicate(), `Expected field state by minute ${engine.time.toFixed(1)}; ${mission(engine).detail}`);
}

function order(engine, who, command, point) {
  assert.equal(engine.order(unit(engine, who).id, command, point), true, `${who} received ${command}`);
}

const finish = engine => runUntil(engine, () => engine.outcome !== 'undecided');
const withdrawScreen = engine => {
  order(engine, 'maney', 'withdraw');
  order(engine, 'vaughan', 'withdraw');
};

test('Dead Angle holds for nine minutes only after the second wave makes contact', () => {
  for (const supply of ['full', 'depleted']) {
    const state = practice(supply);
    const engine = new CivilWarBattleEngine(scenarioId, state, 'option_a');
    order(engine, 'vaughan', 'move', works);
    runUntil(engine, () => unit(engine, 'mitchell').participated);
    assert.equal(mission(engine).held, 0, 'arrival alone does not start the clock');
    runUntil(engine, () => mission(engine).held >= 2);
    assert.ok(unit(engine, 'mitchell').lastVolleyAt >= 0, 'renewed attack is visible in combat');
    const restored = resume(engine, state);
    for (const candidate of [engine, restored]) {
      finish(candidate);
      assert.equal(candidate.outcome, 'costly-win');
      assert.equal(mission(candidate).held, 9);
      assert.ok(mission(candidate).conditions.every(row => row.satisfied));
      const assessment = getBattleAssessment(candidate.snapshot(), candidate.choiceId);
      assert.ok(isBattleAssessment(assessment));
      assert.equal(assessment.objective.status, 'achieved');
    }
    assert.deepEqual(engine.snapshot(), restored.snapshot());
  }
});

test('moving Vaughan off the works resets the hold and a scattered line fails', () => {
  const engine = new CivilWarBattleEngine(scenarioId, practice('full'), 'option_a');
  order(engine, 'vaughan', 'move', works);
  runUntil(engine, () => mission(engine).held >= 2);
  order(engine, 'vaughan', 'move', { x: 1120, y: 520 });
  runUntil(engine, () => mission(engine).held === 0);
  assert.ok(engine.fieldBattle.controlEvents.some(event => event.message.includes('hold timer reset')));
  finish(engine);
  assert.equal(engine.outcome, 'defeat');
  assert.equal(condition(engine, 'Maney and Vaughan holding the Dead Angle'), false);
});

test('staging Mebane and sending the guns first achieves an ordered withdrawal and valid full debrief', () => {
  for (const supply of ['full', 'depleted']) {
    const state = practice(supply);
    const engine = new CivilWarBattleEngine(scenarioId, state, 'option_b');
    order(engine, 'mebane', 'move', road);
    order(engine, 'reserve', 'withdraw');
    runUntil(engine, () => mission(engine).held === 6 && mission(engine).gunsReachedRoad);
    order(engine, 'mebane', 'withdraw');
    runUntil(engine, () => mission(engine).gunsLeading);
    withdrawScreen(engine);
    const restored = resume(engine, state);
    for (const candidate of [engine, restored]) {
      finish(candidate);
      assert.equal(candidate.outcome, 'disciplined-withdrawal');
      assert.equal(mission(candidate).screenEscaped, 2);
      assert.ok(mission(candidate).gunsEscaped);
      assert.ok(mission(candidate).escaped >= .65);
      for (const who of ['maney', 'vaughan', 'mebane']) {
        assert.equal(unit(candidate, who).departureReason, 'rear-exit');
        assert.equal(unit(candidate, who).withdrawalOrganized, true);
      }
      const assessment = getBattleAssessment(candidate.snapshot(), candidate.choiceId);
      assert.equal(assessment.objective.status, 'achieved');
      assert.equal(assessment.evidence.length, 14);
      assert.ok(isBattleAssessment(assessment), 'ten tactical rows plus four summary rows remain a valid debrief');
      assert.equal(isBattleAssessment({ ...assessment, evidence: [...assessment.evidence, assessment.evidence[0]] }), false);
    }
    assert.deepEqual(engine.snapshot(), restored.snapshot());
  }
});

test('a battery that escapes without staging leaves the mission incomplete', () => {
  const engine = new CivilWarBattleEngine(scenarioId, practice('full'), 'option_b');
  order(engine, 'reserve', 'withdraw');
  runUntil(engine, () => mission(engine).held === 6);
  order(engine, 'mebane', 'withdraw');
  runUntil(engine, () => unit(engine, 'mebane').order === 'withdraw');
  withdrawScreen(engine);
  finish(engine);
  assert.equal(engine.outcome, 'defeat');
  assert.equal(mission(engine).gunsReachedRoad, false);
  assert.equal(mission(engine).gunsEscaped, true);
  assert.equal(mission(engine).screenEscaped, 2);
  assert.ok(mission(engine).escaped >= .65);
  assert.equal(getBattleAssessment(engine.snapshot(), engine.choiceId).objective.status, 'failed');
});

test('the covering brigades must wait for the battery even after the interval is met', () => {
  const engine = new CivilWarBattleEngine(scenarioId, practice('full'), 'option_b');
  order(engine, 'reserve', 'withdraw');
  order(engine, 'mebane', 'move', road);
  runUntil(engine, () => mission(engine).held === 6 && mission(engine).gunsReachedRoad);
  withdrawScreen(engine);
  runUntil(engine, () => unit(engine, 'maney').order === 'withdraw' && unit(engine, 'vaughan').order === 'withdraw');
  order(engine, 'mebane', 'withdraw');
  finish(engine);
  assert.equal(engine.outcome, 'defeat');
  assert.equal(mission(engine).held, 6);
  assert.equal(mission(engine).gunsReachedRoad, true);
  assert.equal(mission(engine).gunsEscaped, true);
  assert.equal(mission(engine).gunsLeading, false);
  assert.equal(mission(engine).screenEscaped, 2);
});
