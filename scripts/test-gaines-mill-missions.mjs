import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { getBattleAssessment } from '../src/battle/battleAssessment.js';
import { GAINES_MILL_MISSIONS } from '../src/battle/gainesMillMission.js';
import { createFreshCampaignState } from '../src/game/campaignStorage.js';

const fieldId = 'gaines_mill';
const campaign = createFreshCampaignState(1861, 'seven_days');
const battle = (choice, state = campaign) => new CivilWarBattleEngine(fieldId, state, choice);
const mission = engine => engine.fieldBattle.gainesMill;
const id = name => `gaines-mill-${name}`;
const condition = (engine, label) => mission(engine).conditions.find(row => row.label === label);

function stepUntil(engine, predicate) {
  for (let step = 0; step < 1300 && !predicate(); step += 1) engine.tick(.05);
  assert.ok(predicate(), 'expected battlefield state was reached');
}

const finish = engine => stepUntil(engine, () => engine.outcome !== 'undecided');
const resume = engine => CivilWarBattleEngine.fromCheckpoint(
  JSON.parse(JSON.stringify(engine.checkpoint())), fieldId, campaign, engine.choiceId,
);

function assaultRidge(engine, names) {
  for (const name of names) assert.equal(engine.order(id(name), 'assault', { sectorId: 'center' }), true);
}

function establishScreen(engine) {
  assert.equal(engine.move(id('hood'), { x: 506, y: 492 }), true);
  assert.equal(engine.move(id('law'), { x: 630, y: 498 }), true);
  assert.equal(engine.order(id('hill'), 'withdraw'), true);
  assert.equal(engine.order(id('battery'), 'withdraw'), true);
}

test('the coordinated ridge assault crosses the ravine and keeps a supported breach after reloading', () => {
  const engine = battle('option_a');
  assaultRidge(engine, ['hood', 'law']);
  stepUntil(engine, () => mission(engine).held >= 2);
  assert.deepEqual([...mission(engine).crossed].sort(), [id('hood'), id('law')].sort());
  assert.equal(mission(engine).status, 'tracking');
  const restored = resume(engine);
  for (const candidate of [engine, restored]) {
    finish(candidate);
    assert.equal(candidate.outcome, 'costly-win');
    assert.equal(mission(candidate).held, 7);
    assert.ok(candidate.events.some(event => event.type === 'reinforcement' && event.message.includes('Slocum')));
    const assessment = getBattleAssessment(candidate.snapshot(), candidate.choiceId);
    assert.equal(assessment.objective.status, 'achieved');
    assert.match(assessment.evidence.find(row => row.label === 'Uninterrupted ridge hold').value, /Met: 7 \/ 7 min/);
  }
  assert.deepEqual(engine.snapshot(), restored.snapshot());
});

test('losing a supporting brigade interrupts and resets the ridge hold', () => {
  const engine = battle('option_a');
  assaultRidge(engine, ['hood', 'law']);
  stepUntil(engine, () => mission(engine).held >= 2);
  assert.equal(engine.order(id('law'), 'fallback'), true);
  stepUntil(engine, () => mission(engine).held === 0);
  assert.equal(condition(engine, 'Organized infantry across the ravine').satisfied, true);
  assert.equal(condition(engine, 'Supported infantry on Porter’s Ridge').satisfied, false);
  assert.ok(engine.fieldBattle.controlEvents.some(event => event.message.includes('timer reset')));
  finish(engine);
  assert.equal(engine.outcome, 'defeat');
});

test('Hill gives a low-supply army a second way to complete the breach', () => {
  const depleted = { ...campaign, metrics: { militaryStrength: 40, munitions: 35, publicMorale: 38, foodSupply: 40, treasury: 50 } };
  const unsupported = battle('option_a', depleted);
  assaultRidge(unsupported, ['hood', 'law']);
  finish(unsupported);
  assert.equal(unsupported.outcome, 'defeat');
  assert.equal(Math.round(unsupported.time * 10) / 10, GAINES_MILL_MISSIONS.option_a.deadline);
  assert.equal(mission(unsupported).crossed.length, 2);
  const supported = battle('option_a', depleted);
  assaultRidge(supported, ['hood', 'law', 'hill']);
  finish(supported);
  assert.equal(supported.outcome, 'costly-win');
  assert.ok(mission(supported).crossed.includes(id('hill')));
});

test('the crossing screen can withdraw after six supported minutes under fire and save over 65%', () => {
  const engine = battle('option_b');
  establishScreen(engine);
  stepUntil(engine, () => mission(engine).held >= 6);
  assert.equal(mission(engine).tested, true);
  assert.ok(mission(engine).escaped < .65);
  const restored = resume(engine);
  for (const candidate of [engine, restored]) {
    for (const name of ['hood', 'law']) assert.equal(candidate.order(id(name), 'withdraw'), true);
    finish(candidate);
    assert.equal(candidate.outcome, 'disciplined-withdrawal');
    assert.equal(mission(candidate).held, 6);
    assert.ok(mission(candidate).escaped >= .65);
    assert.equal(candidate.events.filter(event => event.message.includes('The screen has held')).length, 1);
    assert.ok(candidate.state.some(unit => unit.withdrawalOrganized && unit.departureReason === 'rear-exit'));
    assert.equal(getBattleAssessment(candidate.snapshot(), candidate.choiceId).objective.status, 'achieved');
  }
  assert.deepEqual(engine.snapshot(), restored.snapshot());
});

test('idle postures and an immediate wholesale exit miss their assigned missions', () => {
  for (const choice of ['option_a', 'option_b']) {
    const idle = battle(choice);
    finish(idle);
    assert.equal(idle.outcome, 'defeat');
    assert.equal(Math.round(idle.time * 10) / 10, GAINES_MILL_MISSIONS[choice].deadline);
    const assessment = getBattleAssessment(idle.snapshot(), choice);
    assert.equal(assessment.objective.status, 'failed');
    assert.ok(assessment.afterAction.next.includes(GAINES_MILL_MISSIONS[choice].replay));
  }

  const engine = battle('option_b');
  for (const name of ['hood', 'law', 'hill', 'battery']) assert.equal(engine.order(id(name), 'withdraw'), true);
  finish(engine);
  assert.equal(engine.outcome, 'defeat');
  assert.equal(condition(engine, 'Starting strength withdrawn in order').satisfied, true);
  assert.equal(condition(engine, 'Uninterrupted screen').satisfied, false);
});

test('creek ground, road crossings, ridge cover and rear exits have distinct rules', () => {
  const engine = battle('option_a');
  assert.deepEqual(engine.fieldTerrain({ x: 700, y: 475 }), { name: 'Boatswain’s Creek', defense: .98, movement: .62 });
  assert.deepEqual(engine.fieldTerrain({ x: 565, y: 475 }), { name: 'Ravine Crossing', defense: 1.04, movement: 1 });
  assert.deepEqual(engine.fieldTerrain({ x: 881, y: 478 }), { name: 'Watt Farm Lane', defense: 1.02, movement: 1.02 });
  assert.equal(engine.fieldTerrain({ x: 810, y: 295 }).defense, 1.22);
  assert.ok(engine.fieldExitTargets({ side: 'confederate' }).every(exit => exit.y === 882));
  assert.ok(engine.fieldExitTargets({ side: 'union' }).every(exit => exit.y === 18));
});
