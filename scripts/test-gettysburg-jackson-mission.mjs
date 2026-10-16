import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { updateFieldSectors } from '../src/battle/fieldBattleMechanics.js';
import { getBattleAssessment, isBattleAssessment } from '../src/battle/battleAssessment.js';
import { getGettysburgJacksonBrief, getGettysburgJacksonMissionPresentation, presentGettysburgJacksonSnapshot } from '../src/battle/gettysburgJacksonMission.js';
import { BATTLE_SCENARIOS } from '../src/game/battles.js';

const campaign = { rulesVersion: 2, battleRulesVersion: 17, metrics: { militaryStrength: 80, publicMorale: 80, munitions: 80, foodSupply: 80 } };
const fixture = (choice = 'option_a', rules = 17) => {
  const engine = new CivilWarBattleEngine('gettysburg_jackson', { ...campaign, battleRulesVersion: rules }, choice);
  // Fixed starting strengths make strict percentage boundaries exact. All real
  // authored identities, sides, arrivals, missions and outcome methods remain.
  for (const unit of engine.state) { unit.initialStrength = 100; unit.strength = 100; unit.morale = 80; unit.cohesion = 80; }
  engine.initialConfederate = engine.sideStrength('confederate');
  engine.initialUnion = engine.sideStrength('union');
  return engine;
};
const retained = (engine, side, percentage) => {
  for (const unit of engine.state.filter(unit => unit.side === side)) unit.strength = percentage;
};
const centerStrength = (engine, percentage) => {
  for (const unit of engine.state.filter(unit => engine.config.unionCenterIds.includes(unit.id))) unit.strength = percentage;
};
const shake = (engine, number) => {
  for (const unit of engine.state.filter(unit => engine.config.unionCenterIds.includes(unit.id)).slice(0, number)) unit.morale = 30;
};
const reachHeights = engine => {
  for (const unit of engine.state.filter(unit => engine.config.surpriseFormationIds.includes(unit.id)).slice(0, 2)) unit.y = 475;
};
const early = engine => { engine.surpriseState = 'triggered'; shake(engine, 2); reachHeights(engine); engine.time = 50; };
const decide = (engine, expected, path) => {
  engine.judgeOutcome();
  assert.equal(engine.pendingOutcome, expected, `${engine.choiceId}: actual engine result`);
  const checkpoint = engine.checkpoint();
  const snapshot = engine.snapshot();
  const presentation = getGettysburgJacksonMissionPresentation(snapshot, engine.choiceId);
  assert.equal(presentation.resolution?.path, path);
  assert.equal(presentation.resolution?.result, expected);
  assert.ok(presentation.resultRationale && presentation.resultRationale.length <= 500);
  assert.deepEqual(engine.checkpoint(), checkpoint, 'presentation leaves all engine and checkpoint facts intact');
  assert.ok(isBattleAssessment(getBattleAssessment(snapshot, engine.choiceId)));
  engine.tick(1);
  assert.equal(engine.outcome, expected);
  assert.equal(getGettysburgJacksonMissionPresentation(engine.snapshot(), engine.choiceId).resultRationale, presentation.resultRationale, 'rationale persists after resolution playback');
  return presentation;
};

test('the disputed early victory is truthful while Culp’s Hill remains contested', () => {
  const engine = fixture(); early(engine);
  const rodes = engine.state.find(unit => unit.id === 'jackson-rodes-gettysburg');
  const earlyDivision = engine.state.find(unit => unit.id === 'jackson-early-gettysburg');
  const johnson = engine.state.find(unit => unit.id === 'jackson-johnson-gettysburg');
  const slocum = engine.state.find(unit => unit.id === 'slocum-culps-hill');
  rodes.x = 1000; rodes.y = 380; earlyDivision.x = 1130; earlyDivision.y = 380;
  johnson.x = 1320; johnson.y = 335; slocum.x = 1320; slocum.y = 270;
  // Center disorder can come from the batteries and Howard while Slocum still
  // contests Culp's Hill as an organized defender.
  slocum.morale = 80;
  engine.state.find(unit => unit.id === 'cemetery-hill-batteries').cohesion = 24;
  updateFieldSectors(engine);
  assert.equal(engine.fieldBattle.sectors.find(sector => sector.id === 'center').control, 'contested');
  const before = structuredClone(engine.fieldBattle.sectors);
  const presentation = decide(engine, 'decisive-win', 'early-attack');
  assert.match(presentation.resultRationale, /Hancock's rally line was inactive/);
  assert.match(presentation.note, /contested ground/);
  assert.equal(presentation.conditions.filter(item => item.satisfied).length, 5);
  assert.deepEqual(engine.fieldBattle.sectors, before, 'victory explanation does not award control of contested ground');
  assert.equal(getBattleAssessment(engine.snapshot(), 'option_a').objective.status, 'achieved');
});

test('the immediate heights predicate and explanation still apply after Hancock entered and departed', () => {
  const engine = fixture(); early(engine); engine.time = 100;
  const hancock = engine.state.find(unit => unit.id === engine.config.hancockFormationId);
  Object.assign(hancock, { active: false, participated: true, withdrawn: true, withdrawalOrganized: true });
  const presentation = decide(engine, 'decisive-win', 'early-attack');
  const condition = presentation.conditions.find(item => item.label === 'Hancock is not active on the field');
  assert.equal(condition.satisfied, true);
  assert.match(condition.detail, /previously entered and departed/);
  assert.match(presentation.resultRationale, /was inactive on the field/);
  assert.doesNotMatch(presentation.resultRationale + condition.detail + getGettysburgJacksonBrief('option_a').orders.join(' '), /before Hancock enter|has not entered|arrival pending/i);
  const neverEntered = fixture(); early(neverEntered);
  assert.match(getGettysburgJacksonMissionPresentation(neverEntered.snapshot(), 'option_a').conditions[1].detail, /Entry has not been recorded; scheduled arrival in 8/);
  neverEntered.time = 100;
  assert.match(getGettysburgJacksonMissionPresentation(neverEntered.snapshot(), 'option_a').conditions[1].detail, /scheduled arrival time has passed/);
});

test('the early decisive threshold is strictly greater than 64%', () => {
  for (const percentage of [64, 65]) {
    const engine = fixture(); early(engine); retained(engine, 'confederate', percentage);
    decide(engine, percentage === 64 ? 'costly-win' : 'decisive-win', 'early-attack');
    assert.equal(getBattleAssessment(engine.snapshot(), 'option_a').objective.status, percentage === 64 ? 'partial' : 'achieved');
  }
});

test('each early prerequisite remains required without invented sector or support conditions', () => {
  for (const change of [
    engine => { engine.surpriseState = 'expired'; },
    engine => { engine.state.find(unit => unit.id === engine.config.hancockFormationId).active = true; },
    engine => { engine.state.find(unit => unit.id === engine.config.surpriseFormationIds[0]).y = 475.1; },
    engine => { engine.state.find(unit => unit.id === engine.config.surpriseFormationIds[0]).active = false; },
    engine => { engine.state.find(unit => unit.id === engine.config.surpriseFormationIds[0]).status = 'broken'; },
    engine => { engine.state.find(unit => unit.id === engine.config.unionCenterIds[0]).morale = 30.1; },
  ]) {
    const engine = fixture(); early(engine); change(engine);
    const before = engine.checkpoint();
    const presentation = getGettysburgJacksonMissionPresentation(engine.snapshot(), 'option_a');
    assert.equal(presentation.conditions.filter(item => item.satisfied).length, 4);
    assert.deepEqual(engine.checkpoint(), before);
    engine.judgeOutcome(); assert.equal(engine.pendingOutcome, null);
  }
  for (const choice of ['option_b', 'option_c', 'option_d']) {
    const engine = fixture(choice); early(engine); engine.judgeOutcome(); assert.equal(engine.pendingOutcome, null, 'early A route is not applied to other plans');
  }
});

test('the existing early predicate counts active routing attackers and batteries, without adding new eligibility rules', () => {
  const engine = fixture(); early(engine);
  engine.state.find(unit => unit.id === engine.config.surpriseFormationIds[0]).status = 'routing';
  const center = engine.state.filter(unit => engine.config.unionCenterIds.includes(unit.id));
  center[0].morale = 80; center[0].status = 'routing'; center[1].morale = 80; center[2].cohesion = 24;
  decide(engine, 'decisive-win', 'early-attack');
});

test('all three general center-collapse triggers retain their priority and 60% strength boundary', () => {
  for (const [trigger, change] of [
    ['no effective Union formations', engine => { for (const unit of engine.state.filter(unit => unit.side === 'union')) unit.status = 'routing'; }],
    ['center strength', engine => centerStrength(engine, 29)],
    ['three shaken formations', engine => shake(engine, 3)],
  ]) for (const percentage of [60, 61]) {
    const engine = fixture('option_c'); change(engine); retained(engine, 'confederate', percentage);
    const presentation = decide(engine, percentage === 60 ? 'costly-win' : 'decisive-win', 'center-collapse');
    assert.match(presentation.resultRationale.toLowerCase(), trigger === 'center strength' ? /center strength/ : trigger === 'three shaken formations' ? /all three/ : /no effective union/);
  }
  const engine = fixture('option_a'); shake(engine, 3); retained(engine, 'confederate', 20);
  decide(engine, 'costly-win', 'center-collapse'); // Victory is checked before army collapse.
  const assessed = getBattleAssessment(engine.snapshot(), 'option_a');
  assert.equal(assessed.objective.status, 'partial', 'lack of timely surprise retains the existing mission grade');
});

test('army collapse recognizes either no effective formations or strength below 28%', () => {
  const engine = fixture(); retained(engine, 'confederate', 27); decide(engine, 'rout', 'army-collapse');
  const noLine = fixture(); for (const unit of noLine.state.filter(unit => unit.side === 'confederate')) unit.status = 'routing';
  decide(noLine, 'rout', 'army-collapse');
  const boundary = fixture(); retained(boundary, 'confederate', 28); boundary.judgeOutcome(); assert.equal(boundary.pendingOutcome, null);
});

test('deadline pressure differs for A and the other three plans, while mission surprise grading stays unchanged', () => {
  for (const choice of ['option_a', 'option_b', 'option_c', 'option_d']) {
    const engine = fixture(choice); engine.time = 122; engine.surpriseState = 'triggered'; centerStrength(engine, 59); retained(engine, 'confederate', 57);
    decide(engine, choice === 'option_a' ? 'costly-win' : 'decisive-win', 'deadline-pressure');
    assert.equal(getBattleAssessment(engine.snapshot(), choice).objective.status, choice === 'option_a' ? 'partial' : 'achieved');
  }
  for (const change of [engine => retained(engine, 'confederate', 56), engine => centerStrength(engine, 60), engine => { engine.surpriseState = 'expired'; }]) {
    const engine = fixture('option_b'); engine.time = 122; engine.surpriseState = 'triggered'; centerStrength(engine, 59); retained(engine, 'confederate', 57); change(engine);
    decide(engine, 'defeat', 'deadline-preservation');
  }
});

test('deadline comparative strength requires more than four percentage points', () => {
  const advantage = fixture('option_d'); advantage.time = 122; retained(advantage, 'union', 60); retained(advantage, 'confederate', 65);
  decide(advantage, 'costly-win', 'deadline-advantage');
  const exact = fixture(); exact.time = 122; retained(exact, 'union', 60); retained(exact, 'confederate', 64);
  decide(exact, 'defeat', 'deadline-preservation');
});

test('deadline preservation distinguishes actual organized exit from survival in place', () => {
  for (const [escaped, expected] of [[64, 'defeat'], [65, 'disciplined-withdrawal']]) {
    const engine = fixture('option_c'); engine.time = 122;
    // Withdraw five of six equal-strength formations and leave one active.
    const force = engine.state.filter(unit => unit.side === 'confederate');
    for (const unit of force.slice(0, 5)) { unit.active = false; unit.participated = true; unit.withdrawn = true; unit.withdrawalOrganized = true; unit.strength = escaped * 6 / 5; }
    decide(engine, expected, 'deadline-preservation');
    assert.notEqual(getBattleAssessment(engine.snapshot(), 'option_c').objective.status, 'achieved');
  }
});

test('deadline failure retains the strict 55% and 42% boundaries', () => {
  for (const [percentage, expected] of [[55, 'defeat'], [43, 'defeat'], [42, 'rout']]) {
    const engine = fixture(); engine.time = 122; retained(engine, 'confederate', percentage); decide(engine, expected, 'deadline-loss');
  }
});

test('complete field exit precedes attack wins and never invents a successful attack', () => {
  for (const [percentage, expected] of [[40, 'defeat'], [39, 'rout']]) {
    const engine = fixture(); shake(engine, 3); retained(engine, 'confederate', percentage);
    for (const unit of engine.state.filter(unit => unit.side === 'confederate')) { unit.active = false; unit.participated = true; unit.withdrawn = true; unit.withdrawalOrganized = true; }
    decide(engine, expected, 'field-exit');
  }
  const waiting = fixture();
  for (const unit of waiting.state.filter(unit => unit.side === 'confederate' && unit.active)) { unit.active = false; unit.participated = true; unit.withdrawn = true; unit.withdrawalOrganized = true; }
  const snapshot = waiting.snapshot();
  assert.equal(getGettysburgJacksonMissionPresentation(snapshot, 'option_a').resolution, null);
  waiting.judgeOutcome(); assert.equal(waiting.pendingOutcome, null, 'the unarrived Longstreet wing prevents premature field-exit judgment');
});

test('active broken or surrendered formations can trigger field exhaustion without physically leaving', () => {
  const engine = fixture(); engine.time = 30;
  const force = engine.state.filter(unit => unit.side === 'confederate');
  for (const [index, unit] of force.entries()) Object.assign(unit, { active: true, participated: true, withdrawn: false, status: index % 2 ? 'surrendered' : 'broken' });
  assert.ok(force.every(unit => unit.active && !unit.withdrawn));
  const presentation = decide(engine, 'rout', 'field-exit');
  assert.match(presentation.resultRationale, /No active Confederate formations able to hold the field/);
  assert.match(presentation.resultRationale, /0\.0% of starting strength had withdrawn in order/);
  assert.doesNotMatch(presentation.resultRationale + presentation.routes.at(-1), /army left|complete field exit|physically left/);
  assert.ok(force.every(unit => unit.active && !unit.withdrawn), 'result presentation never turns broken troops into departed troops');
});

test('partial imports, staff estimates and legacy playback do not invent the deciding condition', () => {
  const partial = { scenarioId: 'gettysburg_jackson', outcome: 'decisive-win', surpriseState: 'triggered' };
  assert.equal(getGettysburgJacksonMissionPresentation(partial, 'option_a').resolution, null);
  assert.match(getGettysburgJacksonMissionPresentation(partial, 'option_a').resultRationale, /does not establish the exact deciding condition/);
  const legacy = fixture('option_c', 2); legacy.time = 122;
  legacy.judgeOutcome(); assert.equal(legacy.pendingOutcome, 'disciplined-withdrawal');
  const presentation = getGettysburgJacksonMissionPresentation(legacy.snapshot(), 'option_c');
  assert.equal(presentation.resolution, null); assert.match(presentation.routes.at(-1), /earlier command rules/);
  assert.match(presentation.resultRationale, /does not establish/);
  assert.equal(getGettysburgJacksonMissionPresentation({ scenarioId: 'gettysburg' }, 'option_a'), null);
  assert.equal(getGettysburgJacksonMissionPresentation(partial, 'unknown'), null);
});

test('presentation is pure on frozen snapshots and display-only deadlines keep checkpoint version 1 unchanged', () => {
  const engine = fixture(); early(engine);
  const snapshot = engine.snapshot();
  const original = structuredClone(snapshot);
  const freeze = value => { if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) freeze(child); } };
  freeze(snapshot); getGettysburgJacksonMissionPresentation(snapshot, 'option_a'); assert.deepEqual(snapshot, original);
  const display = presentGettysburgJacksonSnapshot(snapshot, 'option_a');
  assert.deepEqual(display.gettysburgJackson, { surpriseDeadline: 46, missionDeadline: 122 });
  assert.equal(snapshot.gettysburgJackson, undefined, 'engine snapshots retain their original shape');
  assert.ok(Object.isFrozen(display) && Object.isFrozen(display.events) && Object.isFrozen(display.formations[0]));
  assert.notEqual(display.events, snapshot.events); assert.notEqual(display.formations, snapshot.formations);
  assert.deepEqual(snapshot, original);
  const checkpoint = engine.checkpoint();
  assert.equal(checkpoint.version, 1); assert.equal(checkpoint.state.gettysburgJackson, undefined);
  const resumed = CivilWarBattleEngine.fromCheckpoint(checkpoint, 'gettysburg_jackson', campaign, 'option_a');
  assert.deepEqual(presentGettysburgJacksonSnapshot(resumed.snapshot(), 'option_a').gettysburgJackson, display.gettysburgJackson);
  assert.deepEqual(getGettysburgJacksonMissionPresentation(resumed.snapshot(), 'option_a'), getGettysburgJacksonMissionPresentation(snapshot, 'option_a'));
});

test('engine bytes match all three unchanged native preservation gates', () => {
  const engine = readFileSync(new URL('../src/battle/civilWarEngine.js', import.meta.url));
  const hash = createHash('sha256').update(engine).digest('hex');
  for (const version of [16, 17, 18]) {
    const preservation = JSON.parse(readFileSync(new URL(`./fixtures/gettysburg-v${version}-preservation.json`, import.meta.url)));
    const protectedEngine = preservation.protectedModules.find(record => record.path === 'src/battle/civilWarEngine.js');
    assert.ok(protectedEngine); assert.equal(hash, protectedEngine.sha256, `v${version} engine protection stays exact`);
  }
});

test('legacy and current dispatch display is corrected without changing raw events or checkpoints', () => {
  for (const rules of [2, 17]) for (const choice of ['option_a', 'option_b', 'option_c', 'option_d']) {
    const engine = fixture(choice, rules);
    const deadline = engine.config.postures[choice].surpriseDeadline;
    let snapshot = engine.snapshot();
    const original = structuredClone(snapshot);
    let display = presentGettysburgJacksonSnapshot(snapshot, choice);
    assert.ok(display.events.some(event => event.message.startsWith(`Trigger Jackson's surprise contact by field minute ${deadline}.`)));
    assert.deepEqual(snapshot, original);
    const rodes = engine.state.find(unit => unit.id === engine.config.surpriseFormationIds[0]);
    const howard = engine.state.find(unit => unit.id === engine.config.unionCenterIds[0]);
    const slocum = engine.state.find(unit => unit.id === engine.config.unionCenterIds[1]);
    const battery = engine.state.find(unit => unit.id === engine.config.unionCenterIds[2]);
    rodes.x = howard.x; rodes.y = howard.y; slocum.x = 0; slocum.y = 0; battery.x = 0; battery.y = 800;
    engine.updateGettysburgJacksonEvents();
    assert.equal(engine.surpriseState, 'triggered');
    const checkpoint = engine.checkpoint(); snapshot = engine.snapshot(); display = presentGettysburgJacksonSnapshot(snapshot, choice);
    const rawSurprise = snapshot.events.find(event => event.type === 'surprise');
    const shownSurprise = display.events.find(event => event.type === 'surprise');
    assert.equal(rawSurprise.message, "Jackson's corps has reached Cemetery Hill and Culp's Hill before the Union fishhook is fully joined.");
    assert.equal(shownSurprise.message, "Jackson's corps has made timely contact with the Union center around the heights within the surprise window.");
    assert.equal(display.fieldStatus.message, shownSurprise.message);
    assert.equal(snapshot.fieldStatus.message, rawSurprise.message);
    assert.deepEqual(engine.checkpoint(), checkpoint);
    assert.deepEqual(display.formations, snapshot.formations);
    assert.deepEqual(display.fieldBattle, snapshot.fieldBattle, 'all objective presence and mission facts remain intact');
    assert.deepEqual(display.assessment, snapshot.assessment, 'display normalization never regrades the mission');
    assert.deepEqual(presentGettysburgJacksonSnapshot(display, choice), display, 'normalization is idempotent');
  }
});

test('actual option D surprise can follow Hancock’s arrival without claiming the fishhook remains unjoined', () => {
  const engine = fixture('option_d');
  engine.time = 67;
  const hancock = engine.state.find(unit => unit.id === engine.config.hancockFormationId);
  Object.assign(hancock, { active: true, participated: true });
  engine.activateGettysburgRecovery();
  const rodes = engine.state.find(unit => unit.id === engine.config.surpriseFormationIds[0]);
  const howard = engine.state.find(unit => unit.id === engine.config.unionCenterIds[0]);
  rodes.x = howard.x; rodes.y = howard.y;
  engine.updateGettysburgJacksonEvents();
  assert.equal(engine.surpriseState, 'triggered');
  assert.equal(engine.gettysburgRecoveryTriggered, true);
  const checkpoint = engine.checkpoint();
  const snapshot = engine.snapshot();
  assert.equal(snapshot.fieldStatus.label, 'Union fishhook restored');
  const display = presentGettysburgJacksonSnapshot(snapshot, 'option_d');
  assert.equal(display.fieldStatus.label, 'Union fishhook restored');
  const surprise = display.events.find(event => event.type === 'surprise').message;
  assert.match(surprise, /within the surprise window/);
  assert.doesNotMatch(surprise, /before|not.*joined|unjoined/);
  assert.equal(snapshot.events.find(event => event.type === 'surprise').message, "Jackson's corps has reached Cemetery Hill and Culp's Hill before the Union fishhook is fully joined.");
  assert.deepEqual(engine.checkpoint(), checkpoint);
});

test('Hancock’s current field status distinguishes prior departure, prior participation and an overdue arrival', () => {
  const cases = [
    [{ participated: true, withdrawn: true }, "Hancock's rally line departed"],
    [{ participated: true, withdrawn: false }, "Hancock's rally line off field"],
    [{ participated: false, withdrawn: false }, 'Hancock arrival pending'],
  ];
  for (const [facts, expected] of cases) {
    const engine = fixture(); engine.time = 100; engine.surpriseState = 'triggered';
    const hancock = engine.state.find(unit => unit.id === engine.config.hancockFormationId);
    Object.assign(hancock, { active: false, ...facts });
    const checkpoint = engine.checkpoint();
    const snapshot = engine.snapshot();
    assert.equal(snapshot.fieldStatus.label, 'Hancock in 0');
    const display = presentGettysburgJacksonSnapshot(snapshot, 'option_a');
    assert.equal(display.fieldStatus.label, expected);
    assert.equal(snapshot.fieldStatus.label, 'Hancock in 0');
    assert.deepEqual(display.formations, snapshot.formations);
    assert.deepEqual(engine.checkpoint(), checkpoint);
    const unknown = structuredClone(snapshot); unknown.fieldStatus.label = 'Hancock returning shortly';
    assert.equal(presentGettysburgJacksonSnapshot(unknown, 'option_a').fieldStatus.label, unknown.fieldStatus.label);
  }
  const awaiting = fixture(); awaiting.surpriseState = 'triggered'; awaiting.time = 50;
  assert.equal(presentGettysburgJacksonSnapshot(awaiting.snapshot(), 'option_a').fieldStatus.label, 'Hancock in 8');
});

test('display formatter leaves unrelated battles, unknown wording, and unknown choices intact', () => {
  const raw = fixture().snapshot();
  raw.events = [{ time: 0, type: 'objective', message: 'Jackson must break the Union high ground before the opportunity window closes at field minute 99.' }, { time: 2, type: 'warning', message: 'Union reinforcements are approaching.' }];
  raw.fieldStatus = { label: 'Heights window', message: raw.events[0].message };
  const copy = structuredClone(raw);
  const display = presentGettysburgJacksonSnapshot(raw, 'option_a');
  assert.deepEqual(display.events, raw.events); assert.deepEqual(display.fieldStatus, raw.fieldStatus); assert.deepEqual(raw, copy);
  for (const scenarioId of ['gettysburg', 'chancellorsville', 'first_manassas']) {
    const other = { ...raw, scenarioId };
    assert.equal(presentGettysburgJacksonSnapshot(other, 'option_a'), other);
  }
  assert.equal(presentGettysburgJacksonSnapshot(raw, 'unknown'), raw);
  assert.equal(presentGettysburgJacksonSnapshot(raw, 'toString'), raw);
  assert.equal(presentGettysburgJacksonSnapshot(null, 'option_a'), null);
});

test('briefs follow all four selected missions and never require capturing both heights', () => {
  const battle = BATTLE_SCENARIOS.gettysburg_with_jackson;
  for (const choice of ['option_a', 'option_b', 'option_c', 'option_d']) {
    assert.deepEqual(battle.fieldOrdersByChoice[choice], getGettysburgJacksonBrief(choice).orders);
    assert.doesNotMatch([battle.objective, ...battle.fieldOrdersByChoice[choice]].join(' '), /take both|capture both/i);
  }
  assert.match(getGettysburgJacksonBrief('option_a').orders.join(' '), /more than 64%/);
  assert.match(getGettysburgJacksonBrief('option_b').orders.join(' '), /minute 62/);
  assert.match(getGettysburgJacksonBrief('option_c').orders.join(' '), /not required/);
});
