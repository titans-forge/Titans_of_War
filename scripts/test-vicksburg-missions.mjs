import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getBattleAssessment, isBattleAssessment } from '../src/battle/battleAssessment.js';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { insideObjective } from '../src/battle/objectiveControl.js';
import { createPracticeState } from '../src/game/practiceConditions.js';

const scenarioId = 'vicksburg';
const practice = ammunition => createPracticeState({ id: scenarioId, turn: 11 }, 'reserve', ammunition);
const mission = engine => engine.fieldBattle.vicksburg;
const unit = (engine, who) => engine.state.find(entry => entry.id === `vicksburg-${who}`);
const gunPosition = { x: 402, y: 587 };
const infantryPosition = { x: 470, y: 430 };
const resume = (engine, state) => CivilWarBattleEngine.fromCheckpoint(
  JSON.parse(JSON.stringify(engine.checkpoint())), scenarioId, state, engine.choiceId,
);

function runUntil(engine, predicate) {
  for (let step = 0; step < 1350 && !predicate() && engine.outcome === 'undecided'; step++) engine.tick(.05);
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

test('assaulting with Waul recovers the breach and holds it under real supporting fire', () => {
  for (const supply of ['full', 'depleted']) {
    const state = practice(supply);
    const engine = new CivilWarBattleEngine(scenarioId, state, 'option_a');
    const redoubt = engine.fieldBattle.sectors.find(sector => sector.id === 'center');
    assert.ok(insideObjective(unit(engine, 'griffith'), redoubt));
    assert.equal(mission(engine).breachClear, false);
    order(engine, 'waul', 'assault', { sectorId: 'center' });
    runUntil(engine, () => unit(engine, 'carr').participated);
    assert.equal(mission(engine).held, 0, 'reinforcement arrival does not count as contact');
    runUntil(engine, () => mission(engine).held >= 2);
    assert.equal(mission(engine).breachClear, true);
    assert.ok(unit(engine, 'carr').lastVolleyAt >= 0 || unit(engine, 'carr').lastIncomingAt >= 0);
    assert.ok(unit(engine, 'union-battery').lastVolleyAt >= 0);
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

test('leaving Waul outside the Railroad Redoubt fails even if the first assault is repulsed', () => {
  const engine = new CivilWarBattleEngine(scenarioId, practice('depleted'), 'option_a');
  finish(engine);
  assert.equal(engine.outcome, 'defeat');
  assert.equal(mission(engine).breachClear, true);
  assert.equal(mission(engine).held, 0);
  assertAssessed(engine, 'failed');
});

test('taking Waul out of the redoubt during contact resets the hold', () => {
  const engine = new CivilWarBattleEngine(scenarioId, practice('full'), 'option_a');
  order(engine, 'waul', 'assault', { sectorId: 'center' });
  runUntil(engine, () => mission(engine).held >= 2);
  order(engine, 'waul', 'move', { x: 470, y: 373 });
  runUntil(engine, () => mission(engine).held === 0);
  assert.ok(engine.fieldBattle.controlEvents.some(event => event.message.includes('hold timer reset')));
  finish(engine);
  assert.equal(engine.outcome, 'defeat');
});

test('the covered transfer saves the guns and leaves the defenders in position on the field', () => {
  for (const supply of ['full', 'depleted']) {
    const state = practice(supply);
    const engine = new CivilWarBattleEngine(scenarioId, state, 'option_b');
    runUntil(engine, () => mission(engine).covered);
    order(engine, 'battery', 'move', gunPosition);
    runUntil(engine, () => unit(engine, 'battery').gunState === 'unlimbering');
    assert.equal(mission(engine).screened, false, 'stopping on the line is not the same as deploying the guns');
    runUntil(engine, () => mission(engine).screened);
    order(engine, 'alabama', 'move', infantryPosition);
    runUntil(engine, () => mission(engine).held >= 1);
    const restored = resume(engine, state);
    for (const candidate of [engine, restored]) {
      finish(candidate);
      assert.equal(candidate.outcome, 'disciplined-withdrawal');
      assert.ok(mission(candidate).retained >= .65);
      assert.equal(mission(candidate).held, 6);
      const secondLine = candidate.fieldBattle.sectors.find(sector => sector.id === 'left');
      for (const who of ['battery', 'waul', 'alabama']) {
        const formation = unit(candidate, who);
        assert.ok(formation.active && !formation.withdrawn && insideObjective(formation, secondLine));
      }
      assert.equal(unit(candidate, 'battery').gunState, 'deployed');
      assertAssessed(candidate, 'achieved');
    }
    assert.deepEqual(engine.snapshot(), restored.snapshot());
  }
});

test('breaking the redoubt screen first fails despite getting everyone onto the Interior Line', () => {
  const engine = new CivilWarBattleEngine(scenarioId, practice('depleted'), 'option_b');
  runUntil(engine, () => mission(engine).covered);
  order(engine, 'alabama', 'move', infantryPosition);
  runUntil(engine, () => unit(engine, 'alabama').x < 500 && unit(engine, 'alabama').order === 'hold');
  order(engine, 'battery', 'move', gunPosition);
  runUntil(engine, () => mission(engine).gunsReady);
  finish(engine);
  assert.equal(engine.outcome, 'defeat');
  assert.equal(mission(engine).screened, false);
  assert.ok(mission(engine).retained >= .65);
  assert.ok(mission(engine).gunsReady);
  assertAssessed(engine, 'failed');
});
