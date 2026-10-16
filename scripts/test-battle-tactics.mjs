import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { BATTLE_OBJECTIVES, getBattleAssessment } from '../src/battle/battleAssessment.js';
import { angularDistance, fireArcDegrees, inFireArc, formationStatusLabel } from '../src/battle/battleTactics.js';
import { createFormationVisual, updateFormationVisual } from '../src/battle/formationVisualState.js';

const campaign = (battleRulesVersion = 2) => ({ rulesVersion: 2, battleRulesVersion,
  metrics: { militaryStrength: 85, munitions: 80, foodSupply: 78, publicMorale: 80, treasury: 75 } });
function isolated(version = 2) {
  const engine = new CivilWarBattleEngine('first_manassas', campaign(version), 'option_b');
  engine.config = { ...engine.config, unionAdvance: false };
  engine.state.forEach(unit => { unit.active = false; });
  const own = engine.state.find(unit => unit.side === 'confederate');
  const enemy = engine.state.find(unit => unit.side === 'union');
  Object.assign(own, { active: true, x: 600, y: 600, facing: 0, target: { x: 600, y: 600 }, order: 'hold', reload: 0 });
  Object.assign(enemy, { active: true, x: 500, y: 600, facing: 0, target: { x: 500, y: 600 }, order: 'hold', ammunition: 0 });
  return { engine, own, enemy };
}

test('a rear threat cannot receive an instant backward volley; turning is paid in simulation time', () => {
  const revised = isolated(), old = isolated(1);
  revised.engine.tick(0.05); old.engine.tick(0.05);
  assert.equal(revised.own.volleySerial, 0);
  assert.equal(old.own.volleySerial, 1, 'the frozen legacy model can fire behind its original front');
  assert.ok(angularDistance(revised.own.facing, 0) <= 35 * Math.PI / 180 * 0.05 + 1e-9);
  for (let i = 0; i < 90; i += 1) revised.engine.tick(0.05);
  assert.ok(revised.own.volleySerial > 0, 'automatic tracking eventually turns into the arc and fires');
  assert.equal(revised.own.x, 600); assert.equal(revised.own.y, 600);
});

test('facing and focus commands never activate new tactics in a legacy battle', () => {
  const { engine, own, enemy } = isolated(1);
  const before = engine.snapshot();
  assert.equal(engine.face(own.id, { x: 0, y: 0 }), false);
  assert.equal(engine.focusTarget(own.id, enemy.id), false);
  assert.deepEqual(engine.snapshot(), before);
  assert.equal(before.battleRulesVersion, undefined);
});

test('new tactical commands and event timelines replay deterministically, including paused frames', () => {
  const run = paused => {
    const { engine, own, enemy } = isolated();
    engine.face(own.id, { x: 700, y: 600 });
    for (let i = 0; i < 180; i += 1) {
      if (i === 40) engine.focusTarget(own.id, enemy.id);
      engine.tick(0.05);
      if (paused) engine.tick(0);
    }
    return engine.snapshot({ presentation: true });
  };
  assert.deepEqual(run(false), run(true));
});

test('fixed fronts retain their arc while focused fire turns toward a selected enemy without chasing', () => {
  const { engine, own, enemy } = isolated();
  assert.equal(engine.face(own.id, { x: 700, y: 600 }), true);
  for (let i = 0; i < 110; i += 1) engine.tick(0.05);
  assert.equal(own.volleySerial, 0); assert.equal(own.facing, 0);
  assert.equal(engine.focusTarget(own.id, enemy.id), true);
  assert.equal(own.facing, 0, 'selecting a target does not teleport the firing front');
  for (let i = 0; i < 90; i += 1) engine.tick(0.05);
  assert.ok(own.volleySerial > 0);
  enemy.x = 1300;
  const shots = own.volleySerial;
  for (let i = 0; i < 80; i += 1) engine.tick(0.05);
  assert.equal(own.volleySerial, shots, 'focused fire respects range');
  assert.equal(own.x, 600); assert.equal(own.y, 600);
  assert.equal(engine.focusTarget(own.id, own.id), false);
  assert.equal(engine.focusTarget(own.id, 'missing'), false);
  assert.equal(engine.focusTarget(own.id, null), true);
  assert.equal(own.focusTargetId, null);
  own.x = -10;
  assert.equal(engine.focusTarget(own.id, enemy.id), false, 'a formation that has left the map cannot receive a fire target');
});

test('automatic fire favors a threat inside the front; player focus can select another live enemy', () => {
  const { engine, own, enemy } = isolated();
  const front = engine.state.find(unit => unit.side === 'union' && unit.id !== enemy.id);
  Object.assign(front, { active: true, x: 760, y: 600, ammunition: 0 });
  assert.equal(engine.selectTarget(own).id, front.id, 'do not turn away from a ready front target just because a rear threat is closer');
  engine.focusTarget(own.id, enemy.id);
  assert.equal(engine.selectTarget(own).id, enemy.id);
  enemy.active = false;
  assert.equal(engine.selectTarget(own).id, front.id);
  assert.equal(own.focusTargetId, null, 'departed targets are released');
});

test('infantry and artillery have explicit arc boundaries and equal rules on both sides', () => {
  for (const side of ['confederate', 'union']) for (const type of ['infantry', 'artillery']) {
    const unit = { x: 0, y: 0, facing: Math.PI - 0.1, side, type };
    const half = fireArcDegrees(unit) * Math.PI / 360;
    const point = angle => ({ x: Math.cos(angle) * 100, y: Math.sin(angle) * 100 });
    assert.equal(inFireArc(unit, point(unit.facing + half)), true);
    assert.equal(inFireArc(unit, point(unit.facing + half + 0.001)), false);
    assert.equal(inFireArc(unit, point(unit.facing + Math.PI)), false);
  }
  const { engine, own } = isolated();
  own.type = 'artillery';
  engine.face(own.id, { x: 500, y: 600 }); engine.tick(0.5);
  assert.ok(Math.abs(angularDistance(own.facing, 0) - 9 * Math.PI / 180) < 1e-9);
});

test('an ammunition-empty advance still finishes its approach inside nominal firing range', () => {
  const { engine, own, enemy } = isolated();
  own.ammunition = 0; enemy.x = 780;
  engine.order(own.id, 'advance');
  const destination = { ...own.target };
  assert.ok(destination.x > own.x);
  for (let i = 0; i < 40; i += 1) engine.tick(0.05);
  assert.ok(own.x > 600, 'an empty formation must not remain stalled on an Advance order');
  assert.ok(Math.hypot(own.x - destination.x, own.y - destination.y) < 5);
  assert.equal(own.order, 'hold');
  assert.equal(own.volleySerial, 0);
  assert.equal(own.ammunition, 0);
});

test('presentation marks an organized legacy departure in order without changing its raw replay or casualties', () => {
  const engine = new CivilWarBattleEngine('first_manassas', campaign(1), 'option_c');
  engine.state.filter(unit => unit.side === 'confederate').forEach(unit => engine.order(unit.id, 'withdraw'));
  for (let i = 0; i < 3300 && !engine.pendingOutcome; i += 1) engine.tick(0.05);
  assert.equal(engine.pendingOutcome, 'disciplined-withdrawal');
  const raw = engine.snapshot();
  const shown = engine.snapshot({ presentation: true });
  const own = shown.formations.find(unit => unit.side === 'confederate');
  assert.equal(own.status, 'routing');
  assert.equal(formationStatusLabel(own), 'withdrawing in order');
  const visual = createFormationVisual(own, 18, shown.time);
  const output = updateFormationVisual(visual, { ...own, y: own.y + 10 }, shown.time + 0.1, 1, { resolving: true });
  assert.ok(output.figures.filter(figure => figure.visible && !figure.fallen).every(figure => figure.action === 'walk'));
  assert.deepEqual(engine.snapshot(), raw, 'reading/rendering presentation is not an engine mutation');
  const preserve = snapshot => snapshot.formations.map(unit => [unit.id, unit.strength, unit.ammunition]);
  while (engine.outcome === 'undecided') engine.tick(0.05);
  assert.deepEqual(preserve(engine.snapshot()), preserve(raw));
  assert.equal(engine.snapshot().score, raw.score);
});

test('a genuinely disorganized unit retains a rout pose even in an otherwise preserved army', () => {
  const { engine, own } = isolated(1);
  own.morale = 8; engine.checkRouting(own);
  engine.beginResolution('disciplined-withdrawal');
  const shown = engine.snapshot({ presentation: true }).formations.find(unit => unit.id === own.id);
  assert.equal(formationStatusLabel(shown), 'routing');
  const visual = createFormationVisual(shown, 18, 0);
  const output = updateFormationVisual(visual, { ...shown, y: shown.y + 10 }, 0.1, 1, { resolving: true });
  assert.ok(output.figures.filter(figure => figure.visible && !figure.fallen).every(figure => figure.action === 'route'));
});

test('broken survivors are never given an orderly walking pose by departure presentation', () => {
  const { engine, own } = isolated(1);
  own.status = 'broken';
  engine.beginResolution('disciplined-withdrawal');
  const shown = engine.snapshot({ presentation: true }).formations.find(unit => unit.id === own.id);
  assert.equal(formationStatusLabel(shown), 'broken');
  const visual = createFormationVisual(shown, 18, 0);
  const output = updateFormationVisual(visual, { ...shown, y: shown.y + 10 }, 0.1, 1, { resolving: true });
  const figures = output.figures.filter(figure => figure.visible && !figure.fallen);
  assert.ok(figures.length);
  assert.ok(figures.every(figure => figure.action === 'route'));
});

test('reserves that never entered the field are not presented as having completed an organized departure', () => {
  const engine = new CivilWarBattleEngine('wilderness', campaign(1), 'option_b');
  const reserve = engine.state.find(unit => unit.side === 'confederate' && !unit.active);
  assert.ok(reserve);
  engine.beginResolution('disciplined-withdrawal');
  assert.equal(engine.snapshot({ presentation: true }).formations.find(unit => unit.id === reserve.id).presentationStatus, undefined);
});

test('event cues follow actual volleys and routing, remain bounded, and cannot mutate the simulation', () => {
  const { engine, own, enemy } = isolated(); enemy.x = 700;
  engine.tick(0.05);
  const cue = engine.snapshot({ presentation: true }).combatEvents.find(event => event.type === 'volley');
  assert.equal(cue.formationId, own.id); assert.equal(cue.targetId, enemy.id);
  assert.equal(own.initialAmmunition - own.ammunition, 1);
  const count = engine.snapshot({ presentation: true }).combatEvents.length;
  engine.tick(0); assert.equal(engine.snapshot({ presentation: true }).combatEvents.length, count);
  own.morale = 8; engine.checkRouting(own); engine.checkRouting(own);
  assert.equal(engine.snapshot({ presentation: true }).combatEvents.filter(event => event.type === 'routing').length, 1);
  for (let i = 0; i < 150; i += 1) engine.recordCombatEvent('reinforcement', enemy);
  const events = engine.snapshot({ presentation: true }).combatEvents;
  assert.equal(events.length, 128);
  assert.ok(events.every((event, i) => !i || event.id > events[i - 1].id));
  events[0].position.x = -999;
  assert.notEqual(engine.snapshot({ presentation: true }).combatEvents[0].position.x, -999);
  assert.equal(engine.snapshot().combatEvents, undefined, 'legacy/default consumers keep their previous shape');
});

function play(id, choice, policy) {
  const engine = new CivilWarBattleEngine(id, campaign(), choice);
  const issued = new Set(); let returning = false;
  if (policy === 'sortie') { engine.move('mahone-virginia-brigade', { x: 330, y: 190 }); engine.move('mahone-alabama-brigade', { x: 1275, y: 200 }); }
  for (let i = 0; i < 3300 && engine.outcome === 'undecided'; i += 1) {
    for (const unit of engine.state.filter(unit => unit.side === 'confederate' && unit.active && !issued.has(unit.id))) {
      issued.add(unit.id);
      if (policy === 'advance' || policy === 'withdraw') engine.order(unit.id, policy);
      if (policy === 'skirmish') { engine.setFormation(unit.id, 'skirmish'); engine.order(unit.id, 'advance'); }
      if (policy === 'transfer' && engine.config.transferFormationIds.includes(unit.id)) engine.order(unit.id, 'withdraw');
    }
    if (policy === 'covered' && (engine.thirdWinchester.rearguardHeld >= engine.config.rearguardHoldRequired || engine.thirdWinchester.middleFieldHeld >= engine.config.middleFieldHoldRequired)) {
      engine.state.filter(unit => unit.side === 'confederate' && unit.active).forEach(unit => engine.order(unit.id, 'withdraw'));
    }
    if (policy === 'sortie' && !returning && engine.sortieState === 'raided') { returning = true; engine.move('mahone-virginia-brigade', { x: 650, y: 820 }); engine.move('mahone-alabama-brigade', { x: 1000, y: 830 }); }
    engine.tick(0.05);
  }
  return engine.snapshot();
}

const missions = [
  ['first_manassas', 'option_c', 'withdraw'], ['shiloh', 'option_b', 'hold'], ['shiloh', 'option_d', 'withdraw'],
  ['chancellorsville', 'option_a', 'advance'], ['chancellorsville', 'option_b', 'hold'],
  ['wilderness', 'option_b', 'hold'], ['third_winchester', 'option_b', 'covered'],
  ['cedar_creek', 'option_a', 'advance'], ['gettysburg', 'option_a', 'advance'],
  ['gettysburg_jackson', 'option_b', 'skirmish'], ['chickamauga', 'option_b', 'advance'],
  ['cold_harbor', 'option_b', 'hold'], ['cold_harbor', 'option_d', 'transfer'],
  ['petersburg', 'option_a', 'advance'], ['petersburg', 'option_b', 'hold'], ['petersburg', 'option_c', 'sortie'], ['petersburg', 'option_d', 'hold'],
];
for (const [id, choice, policy] of missions) test(`new tactics preserve a reachable authored mission: ${id}:${choice}:${policy}`, () => {
  const result = play(id, choice, policy);
  assert.equal(result.battleRulesVersion, 2);
  assert.notEqual(result.outcome, 'undecided');
  assert.equal(getBattleAssessment(result, choice).objective.status, 'achieved');
});
test('actual mission traces cover all eleven new-mode configurations', () => {
  assert.deepEqual([...new Set(missions.map(mission => mission[0]))].sort(), Object.keys(BATTLE_OBJECTIVES).sort());
});
