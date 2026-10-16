import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { getBattleAssessment, isBattleAssessment } from '../src/battle/battleAssessment.js';
import { updateFieldCommand } from '../src/battle/fieldBattleMechanics.js';
import { shilohReserveState, updateShilohReserve, shilohReserveConditions } from '../src/battle/shilohReserveObjective.js';

const campaign = (readiness = 85, battleRulesVersion = 14) => ({ rulesVersion: 2, battleRulesVersion, seed: 1862,
  metrics: { militaryStrength: readiness, munitions: readiness, foodSupply: readiness, treasury: readiness, publicMorale: readiness } });
const make = (readiness = 85, version = 14, choice = 'option_b') => new CivilWarBattleEngine('shiloh', campaign(readiness, version), choice);
function run(engine, policy = 'hold') {
  if (policy === 'reserve-left') assert.equal(engine.order('breckinridge-reserve', 'move', { x: 450, y: 120 }), true);
  if (['advance', 'withdraw'].includes(policy)) for (const unit of engine.state.filter(u => u.side === 'confederate')) engine.order(unit.id, policy);
  for (let i = 0; i < 4000 && engine.outcome === 'undecided'; i += 1) engine.tick(.05);
  assert.notEqual(engine.outcome, 'undecided', 'the field decision must resolve in its bounded interval');
  return engine.snapshot();
}
function fixture() {
  const unit = (id, x, y) => ({ id, side: 'confederate', type: 'infantry', x, y, initialStrength: 1000, strength: 1000,
    morale: 70, cohesion: 70, ammunition: 20, active: true, status: 'steady', order: 'hold', directMove: false });
  return { scenarioId: 'shiloh', choiceId: 'option_b', battleRulesVersion: 14, commanderStatus: 'protected', time: 0,
    config: { maxTime: 128 }, fieldBattle: {}, events: [], state: [unit('hardee-corps', 200, 200), unit('bragg-corps', 500, 200),
      unit('polk-corps', 800, 200), unit('breckinridge-reserve', 350, 80)] };
}
const reserveOf = e => e.state.find(u => u.id === 'breckinridge-reserve');

test('the reserve exercise is restricted to new-rule Shiloh B', () => {
  assert.ok(shilohReserveState(make()));
  assert.equal(shilohReserveState(make(85, 13)), null);
  for (const choice of ['option_a', 'option_c', 'option_d']) assert.equal(shilohReserveState(make(85, 14, choice)), null);
  const e = fixture(); e.scenarioId = 'chickamauga';
  assert.equal(shilohReserveState(e), null);
});

for (const readiness of [70, 85]) for (const policy of ['hold', 'reserve-left']) {
  test(`an organized cautious defense succeeds at readiness ${readiness} using ${policy}`, () => {
    const snapshot = run(make(readiness), policy);
    assert.equal(snapshot.outcome, 'disciplined-withdrawal');
    assert.ok(snapshot.time >= 128 && snapshot.time < 128.1);
    assert.equal(snapshot.assessment.objective.status, 'achieved');
    assert.ok(snapshot.assessment.commandScore >= 75);
    assert.ok(isBattleAssessment(snapshot.assessment));
    assert.ok(snapshot.assessment.evidence.length <= 12, 'mission evidence must remain inside the save-validator bound');
    const archivedAssessment = JSON.parse(JSON.stringify(snapshot.assessment));
    assert.ok(isBattleAssessment(archivedAssessment));
    assert.deepEqual(archivedAssessment, snapshot.assessment, 'manual mission evidence survives JSON archival unchanged');
    assert.equal(snapshot.fieldBattle.reserveObjective.achieved, true);
    assert.ok(snapshot.fieldBattle.reserveObjective.organizedRatio >= .65);
    assert.ok(snapshot.formations.some(u => u.side === 'confederate' && u.volleySerial > 0), 'the defense must face actual firing');
    assert.ok(snapshot.events.some(e => e.type === 'counterattack' && e.time >= 48));
    if (policy === 'reserve-left') assert.ok(Math.hypot(reserveOf({ state: snapshot.formations }).x - 450, reserveOf({ state: snapshot.formations }).y - 120) < 4);
  });
}

test('early withdrawal preserves actual survivors without completing the command-reserve mission', () => {
  const snapshot = run(make(), 'withdraw');
  assert.ok(snapshot.time < 20, 'an empty field must not wait for the full defensive clock');
  assert.equal(snapshot.outcome, 'defeat');
  assert.equal(snapshot.assessment.objective.status, 'partial');
  assert.ok(snapshot.assessment.commandScore < 75);
  assert.equal(snapshot.confederateLossRate, 0, 'failure to hold the mission does not invent casualties');
  assert.equal(snapshot.assessment.preservation.armyRetained, 100);
  for (const unit of snapshot.formations.filter(u => u.side === 'confederate')) {
    assert.equal(unit.strength, unit.initialStrength);
    assert.equal(unit.withdrawn, true);
    assert.equal(unit.withdrawalOrganized, true);
    assert.notEqual(unit.status, 'routing', 'adjudication must not turn an organized exit into a rout');
  }
  assert.match(snapshot.assessment.afterAction.next.join(' '), /eight uninterrupted/);
});

test('the logistical withdrawal posture keeps its independent early-exit objective', () => {
  const snapshot = run(make(85, 14, 'option_d'), 'withdraw');
  assert.equal(snapshot.outcome, 'disciplined-withdrawal');
  assert.equal(snapshot.assessment.objective.status, 'achieved');
  assert.ok(snapshot.time < 20);
  assert.equal(snapshot.fieldBattle.reserveObjective, undefined);
});

test('living routed corps cannot receive command-cohesion completion credit', () => {
  const snapshot = run(make(), 'advance');
  assert.ok(snapshot.formations.filter(u => ['hardee-corps', 'bragg-corps'].includes(u.id)).every(u => u.status === 'routing'));
  assert.ok(snapshot.assessment.preservation.armyRetained > 80, 'preserved headcount remains visible');
  assert.ok(snapshot.fieldBattle.reserveObjective.organizedRatio < .65);
  assert.equal(snapshot.assessment.objective.status, 'partial');
  assert.ok(snapshot.assessment.commandScore < 75);
});

test('rules 13 retains its existing hold, early-exit and routed-survivor grading', () => {
  for (const policy of ['hold', 'withdraw', 'advance']) {
    const snapshot = run(make(85, 13), policy);
    assert.equal(snapshot.assessment.objective.status, 'achieved', policy);
    assert.equal(snapshot.fieldBattle.reserveObjective, undefined);
    assert.ok(!snapshot.events.some(e => e.type === 'counterattack' && /limited advance/.test(e.message)));
    if (policy !== 'advance') assert.equal(snapshot.assessment.commandScore, 100, policy);
    if (policy === 'withdraw') assert.ok(snapshot.time < 20);
  }
});

test('Breckinridge cannot double-count as a second front corps', () => {
  const e = fixture();
  e.state.find(u => u.id === 'hardee-corps').active = false;
  e.state.find(u => u.id === 'polk-corps').active = false;
  const state = shilohReserveState(e);
  assert.equal(state.reserveReady, true);
  assert.equal(state.supporting, 0);
  assert.equal(state.supported, false);
  assert.equal(state.effective, false);
});

test('front support includes the 340 boundary and excludes formations beyond it', () => {
  const e = fixture();
  Object.assign(e.state[0], { x: 0, y: 0 }); Object.assign(e.state[1], { x: 340, y: 0 });
  Object.assign(e.state[2], { x: 1000, y: 0 }); Object.assign(reserveOf(e), { x: 0, y: 100 });
  assert.equal(shilohReserveState(e).supporting, 2);
  e.state[1].x = 340.001;
  assert.equal(shilohReserveState(e).supporting, 0);
});

test('reserve support includes the 340 boundary and excludes a distant intact reserve', () => {
  const e = fixture();
  Object.assign(e.state[0], { x: 0, y: 0 }); Object.assign(e.state[1], { x: 340, y: 0 });
  Object.assign(e.state[2], { x: 1000, y: 0 }); Object.assign(reserveOf(e), { x: 0, y: 340 });
  assert.equal(shilohReserveState(e).supported, true);
  reserveOf(e).y = 340.001;
  assert.equal(shilohReserveState(e).reserveReady, true);
  assert.equal(shilohReserveState(e).supported, false);
});

test('a reserve needs 60 percent of its own original strength and available ammunition', () => {
  const e = fixture(), reserve = reserveOf(e);
  reserve.strength = 600;
  assert.equal(shilohReserveState(e).reserveReady, true);
  reserve.strength = 599.99;
  assert.equal(shilohReserveState(e).reserveReady, false);
  reserve.strength = 1000; reserve.ammunition = 0;
  assert.equal(shilohReserveState(e).reserveReady, false);
  reserve.ammunition = 1;
  assert.equal(shilohReserveState(e).reserveReady, true);
});

test('the army retention threshold measures effective on-field strength, including its 65 percent boundary', () => {
  const e = fixture();
  for (const unit of e.state) unit.strength = 650;
  assert.equal(shilohReserveState(e).organizedRatio, .65);
  assert.equal(shilohReserveState(e).effective, true);
  e.state[0].strength = 649.99;
  assert.equal(shilohReserveState(e).effective, false);
});

test('moving, recovering, departed or routing reserves do not satisfy a fighting reserve', () => {
  for (const patch of [{ directMove: true }, { order: 'move' }, { order: 'fallback' }, { order: 'rally' }, { order: 'withdraw' },
    { active: false }, { status: 'routing' }, { status: 'surrendered' }, { morale: 29.99 }, { cohesion: 24.99 }]) {
    const e = fixture(); Object.assign(reserveOf(e), patch);
    assert.equal(shilohReserveState(e).reserveReady, false, JSON.stringify(patch));
  }
  for (const order of ['hold', 'advance', 'assault']) {
    const e = fixture(); Object.assign(reserveOf(e), { order, morale: 30, cohesion: 25 });
    assert.equal(shilohReserveState(e).reserveReady, true, 'ordinary organized combat postures can satisfy the reserve');
  }
});

test('support time cannot accrue before the announced response or award success before the deadline', () => {
  const e = fixture(); e.time = 47.95;
  assert.equal(updateShilohReserve(e, .05).held, 0);
  e.time = 48.05;
  assert.ok(Math.abs(updateShilohReserve(e, .1).held - .05) < 1e-8, 'only the part after minute48 counts');
  e.time = 56; updateShilohReserve(e, 7.95);
  assert.ok(Math.abs(e.fieldBattle.reserveObjective.held - 8) < 1e-8);
  assert.equal(e.fieldBattle.reserveObjective.achieved, false);
  e.time = 128;
  assert.equal(updateShilohReserve(e, 72).achieved, true);
});

test('losing a completed support interval resets it and a last-minute restoration cannot launder the gap', () => {
  const e = fixture(); e.time = 120; updateShilohReserve(e, 8);
  reserveOf(e).ammunition = 0; e.time = 120.05;
  assert.equal(updateShilohReserve(e, .05).held, 0);
  reserveOf(e).ammunition = 10; e.time = 128;
  const state = updateShilohReserve(e, 7.95);
  assert.ok(Math.abs(state.held - 7.95) < 1e-8);
  assert.equal(state.achieved, false);
  assert.ok(e.events.some(event => event.type === 'warning'));
  e.time = 128.05;
  assert.equal(updateShilohReserve(e, .05).achieved, false, 'time after the mission deadline cannot complete a late support interval');
});

test('Johnston protection remains required even when force and reserve conditions are met', () => {
  const e = fixture(); e.time = 128; e.commanderStatus = 'exposed';
  const state = updateShilohReserve(e, 8);
  assert.equal(state.protectedCommander, false);
  assert.equal(state.achieved, false);
  const assessment = getBattleAssessment({ scenarioId: 'shiloh', outcome: 'disciplined-withdrawal', commanderStatus: 'exposed',
    time: 128, fieldBattle: { reserveObjective: state, escaped: 0 }, confederateLossRate: 0, ammunitionRate: 1 }, 'option_b');
  assert.notEqual(assessment.objective.status, 'achieved');
});

test('the displayed reserve conditions agree with the adjudicated completion evidence', () => {
  const e = fixture(); e.time = 128;
  const state = updateShilohReserve(e, 8);
  assert.equal(state.achieved, true);
  assert.ok(shilohReserveConditions(state).every(condition => condition.satisfied));
  reserveOf(e).ammunition = 0;
  const failed = updateShilohReserve(e, .05);
  assert.equal(failed.achieved, false);
  assert.ok(shilohReserveConditions(failed).some(condition => !condition.satisfied));
});

test('the announced counterprobe issues physical orders once, without changing deployment or resources', () => {
  const e = make();
  const original = e.state.map(u => ({ id: u.id, x: u.x, y: u.y, strength: u.strength, morale: u.morale, cohesion: u.cohesion, ammunition: u.ammunition }));
  e.time = 47.95; e.fieldBattle.nextAi = 0; updateFieldCommand(e);
  assert.equal(e.state.find(u => u.id === 'sherman-division').order, 'hold');
  e.time = 48.05; e.fieldBattle.nextAi = 0; updateFieldCommand(e);
  for (const id of ['sherman-division', 'mcclernand-division']) {
    const unit = e.state.find(u => u.id === id);
    assert.equal(unit.order, 'advance'); assert.equal(unit.directMove, false);
  }
  assert.equal(e.state.find(u => u.id === 'hurlbut-division').order, 'hold');
  assert.equal(e.state.find(u => u.id === 'prentiss-division').order, 'hold');
  assert.deepEqual(e.state.map(u => ({ id: u.id, x: u.x, y: u.y, strength: u.strength, morale: u.morale, cohesion: u.cohesion, ammunition: u.ammunition })), original);
  e.time = 55; e.fieldBattle.nextAi = 0; updateFieldCommand(e);
  assert.equal(e.events.filter(event => event.type === 'counterattack' && /limited advance/.test(event.message)).length, 1);
});

test('the counterprobe respects Union fallback and rally orders already in progress', () => {
  const e = make();
  e.state.find(u => u.id === 'sherman-division').order = 'fallback';
  e.state.find(u => u.id === 'mcclernand-division').order = 'rally';
  e.time = 48.05; e.fieldBattle.nextAi = 0; updateFieldCommand(e);
  assert.equal(e.state.find(u => u.id === 'sherman-division').order, 'fallback');
  assert.equal(e.state.find(u => u.id === 'mcclernand-division').order, 'rally');
});

test('the finalized reserve assessment remains stable throughout result presentation', () => {
  const e = make();
  for (let i = 0; i < 3500 && !e.pendingOutcome; i += 1) e.tick(.05);
  assert.ok(e.pendingOutcome);
  const before = e.snapshot();
  while (e.outcome === 'undecided') e.tick(.05);
  assert.deepEqual(e.snapshot().assessment, before.assessment);
  assert.deepEqual(e.snapshot().fieldBattle.reserveObjective, before.fieldBattle.reserveObjective);
});
