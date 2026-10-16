import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { BATTLE_ENGINE_CONFIGS } from '../src/battle/battleDefinitions.js';

const approx = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

function fixture({ type = 'infantry', enemyFire = false, gap = 100 } = {}) {
  const engine = new CivilWarBattleEngine('first_manassas', {}, 'option_b');
  const unit = engine.state.find((entry) => entry.side === 'confederate');
  const enemy = engine.state.find((entry) => entry.side === 'union');
  for (const entry of engine.state) entry.active = entry === unit || entry === enemy;
  Object.assign(unit, { x: 700, y: 600, type, formationMode: 'line', order: 'hold', status: 'firing', engagedWith: enemy.id, reload: 0, morale: 90, cohesion: 90, fatigue: 0, target: { x: 700, y: 600 } });
  Object.assign(enemy, { x: 700, y: 600 - gap, ammunition: enemyFire ? 40 : 0, reload: 0, order: 'hold', target: { x: 700, y: 600 - gap } });
  return { engine, unit, enemy };
}

// Observe private-intent cleanup through the unchanged, unbounded legacy mover.
function assertIntentCleared(engine, unit) {
  const probe = { ...unit, order: 'advance', type: 'infantry', formationMode: 'line', target: { x: unit.x + 10, y: unit.y } };
  engine.moveUnit(probe, 1);
  approx(probe.x - unit.x, 25 * engine.terrainMovementMultiplier(unit));
}

for (const type of ['infantry', 'artillery']) {
  test(`${type}: direct destinations march under fire without returning fire`, () => {
    const { engine, unit, enemy } = fixture({ type, enemyFire: true });
    const before = structuredClone(unit);
    const enemyStrength = enemy.strength;
    engine.move(unit.id, { x: 820, y: 600 });
    for (let step = 0; step < 10; step += 1) engine.tick(0.05);
    approx(unit.x - before.x, (type === 'artillery' ? 13 : 25) * 0.5);
    approx(unit.y, before.y);
    assert.ok(unit.strength < before.strength, 'marchers must still receive enemy fire');
    assert.equal(unit.ammunition, before.ammunition);
    assert.equal(unit.volleySerial, before.volleySerial);
    assert.equal(unit.lastVolleyAt, before.lastVolleyAt);
    assert.equal(enemy.strength, enemyStrength);
    assert.equal(unit.status, 'steady');
    assert.equal(unit.engagedWith, null);
    assert.equal(unit.order, 'advance');
    assert.deepEqual(unit.target, { x: 820, y: 600 });
  });
}

test('direct movement does not attack in close combat while marching', () => {
  const { engine, unit, enemy } = fixture({ gap: 30 });
  const enemyStrength = enemy.strength;
  const ownStrength = unit.strength;
  engine.move(unit.id, { x: 800, y: 600 });
  engine.tick(0.05);
  assert.ok(unit.x > 700);
  assert.equal(enemy.strength, enemyStrength);
  assert.ok(unit.strength < ownStrength, 'enemy close combat remains possible');
});

test('direct movement does not require an available enemy', () => {
  const { engine, unit, enemy } = fixture();
  enemy.active = false;
  engine.move(unit.id, { x: 750, y: 600 });
  engine.tick(0.05);
  approx(unit.x, 701.25);
  assert.equal(unit.volleySerial, 0);
});

test('attack Advance still stops to fire at preferred range', () => {
  const { engine, unit } = fixture();
  engine.order(unit.id, 'advance');
  engine.tick(0.05);
  assert.equal(unit.x, 700);
  assert.equal(unit.y, 600);
  assert.equal(unit.order, 'hold');
  assert.equal(unit.status, 'firing');
  assert.equal(unit.volleySerial, 1);
});

for (const order of ['hold', 'advance', 'volley', 'reform', 'withdraw']) {
  test(`${order} cancels an outstanding direct destination`, () => {
    const { engine, unit } = fixture();
    engine.move(unit.id, { x: 850, y: 600 });
    engine.order(unit.id, order);
    assertIntentCleared(engine, unit);
    engine.tick(0.05);
    approx(unit.x, 700);
    if (order === 'withdraw') {
      approx(unit.y, 601.9);
      assert.equal(unit.volleySerial, 0);
    } else if (order === 'reform') {
      assert.equal(unit.status, 'reforming');
      assert.equal(unit.volleySerial, 0);
    } else {
      approx(unit.y, 600);
      assert.equal(unit.volleySerial, 1);
    }
  });
}

test('new destinations replace the route; invalid commands do not cancel it', () => {
  const { engine, unit } = fixture();
  engine.move(unit.id, { x: 850, y: 600 });
  engine.move(unit.id, { x: 650, y: 600 });
  engine.move(unit.id, { x: NaN, y: 0 });
  engine.move(unit.id, null);
  engine.order(unit.id, 'invalid');
  engine.tick(0.05);
  approx(unit.x, 698.75);
  assert.deepEqual(unit.target, { x: 650, y: 600 });
  assert.equal(unit.volleySerial, 0);
});

test('formation changes preserve a direct destination', () => {
  const { engine, unit } = fixture();
  engine.move(unit.id, { x: 850, y: 600 });
  engine.setFormation(unit.id, 'column');
  engine.tick(0.05);
  approx(unit.x, 700 + 25 * 1.18 * 0.05);
  assert.equal(unit.volleySerial, 0);
});

for (const delta of [0, 2, 6, 25]) {
  test(`arrival at ${delta} units holds exactly and clears direct intent`, () => {
    const { engine, unit } = fixture();
    const target = { x: 700 + delta, y: 600 };
    engine.move(unit.id, target);
    engine.tick(1);
    assert.deepEqual({ x: unit.x, y: unit.y }, target);
    assert.equal(unit.order, 'hold');
    assert.equal(unit.volleySerial, 0, 'arrival tick must not also fire');
    assertIntentCleared(engine, unit);
    engine.tick(0.05);
    assert.equal(unit.volleySerial, 1, 'stationary firing resumes after arrival');
  });
}

test('routing cancels the destination and retains the 0.85 retreat multiplier', () => {
  const { engine, unit } = fixture();
  engine.move(unit.id, { x: 850, y: 600 });
  unit.morale = 17;
  engine.checkRouting(unit);
  assertIntentCleared(engine, unit);
  assert.equal(unit.status, 'routing');
  engine.tick(0.05);
  approx(unit.x, 700);
  approx(unit.y, 600 + 38 * 0.85 * 0.05);
  assert.equal(unit.volleySerial, 0);
});

test('morale lost before the marching turn triggers routing instead of direct movement', () => {
  const { engine, unit } = fixture();
  engine.move(unit.id, { x: 850, y: 600 });
  unit.morale = 17;
  engine.tick(0.05);
  approx(unit.x, 700);
  assert.equal(unit.status, 'routing');
  assertIntentCleared(engine, unit);
});

test('inactive or broken units cannot retain marching intent', () => {
  for (const change of [{ active: false }, { status: 'broken' }]) {
    const { engine, unit } = fixture();
    engine.move(unit.id, { x: 850, y: 600 });
    Object.assign(unit, change);
    engine.tick(0.05);
    approx(unit.x, 700);
    assertIntentCleared(engine, unit);
  }
});

test('resolution clears intent for both winning and losing formations', () => {
  for (const result of ['decisive-win', 'defeat']) {
    const { engine, unit } = fixture();
    engine.move(unit.id, { x: 850, y: 600 });
    engine.beginResolution(result);
    assertIntentCleared(engine, unit);
    const before = engine.snapshot();
    engine.move(unit.id, { x: 800, y: 650 });
    assert.deepEqual(engine.snapshot(), before);
    engine.tick(0.05);
    if (result === 'decisive-win') {
      approx(unit.x, 700);
      approx(unit.y, 600);
    } else {
      approx(Math.hypot(unit.x - 700, unit.y - 600), 38 * 2.8 * 0.05);
    }
  }
});

test('direct intent stays private; paused commands do not advance simulation', () => {
  const { engine, unit } = fixture();
  const keys = Object.keys(engine);
  const snapshotKeys = Object.keys(engine.snapshot());
  const formationKeys = Object.keys(engine.snapshot().formations[0]);
  engine.move(unit.id, { x: 850, y: 600 });
  const snapshot = engine.snapshot();
  for (const dt of [0, -1, NaN, Infinity]) engine.tick(dt);
  assert.deepEqual(engine.snapshot(), snapshot);
  assert.deepEqual(Object.keys(engine), keys);
  assert.deepEqual(Object.keys(snapshot), snapshotKeys);
  assert.deepEqual(Object.keys(snapshot.formations[0]), formationKeys);
  assert.ok(!Object.values(engine).some((value) => value instanceof Set));
  assert.ok(!JSON.stringify(snapshot).includes('explicitDestinations'));
  engine.tick(0.05);
  assert.ok(unit.x > 700, 'pause must retain the command');
});

test('marching still runs reinforcements, scenario pressure, and routing after the formation loop', () => {
  const engine = new CivilWarBattleEngine('third_winchester', {}, 'option_b');
  const unit = engine.state.find((entry) => entry.id === 'gordon-winchester');
  unit.morale = 20;
  engine.time = 87.99;
  engine.move(unit.id, { x: 1140, y: unit.y });
  const x = unit.x;
  engine.tick(0.05);
  assert.ok(unit.x > x, 'direct movement runs first');
  assert.ok(engine.config.crookFormationIds.every((id) => engine.state.find((entry) => entry.id === id).active));
  assert.equal(engine.thirdWinchester.cavalryPressureState, 'pressing');
  assert.equal(engine.thirdWinchester.cavalryPulses, 1);
  assert.equal(unit.status, 'routing', 'scenario pressure still routes an exposed marcher');
  assertIntentCleared(engine, unit);
});

test('marching into the Winchester corridor still retires the unit in shared updates', () => {
  const engine = new CivilWarBattleEngine('third_winchester', {}, 'option_b');
  const unit = engine.state.find((entry) => entry.id === 'ramseur-winchester');
  Object.assign(unit, { x: 400, y: 809 });
  engine.move(unit.id, { x: 400, y: 840 });
  engine.tick(0.05);
  assert.equal(unit.withdrawn, true);
  assert.equal(unit.withdrawalOrganized, true);
  assert.equal(unit.active, false);
  assert.equal(unit.arrivalTime, null);
  assertIntentCleared(engine, unit);
});

test('direct movement cannot bypass the scenario time limit and result resolution', () => {
  const engine = new CivilWarBattleEngine('third_winchester', {}, 'option_b');
  const unit = engine.state.find((entry) => entry.id === 'ramseur-winchester');
  engine.time = engine.config.maxTime - 0.01;
  engine.move(unit.id, { x: unit.x + 100, y: unit.y });
  engine.tick(0.05);
  assert.equal(engine.pendingOutcome, 'defeat');
  assertIntentCleared(engine, unit);
});

test('all 40 legacy battle/choice replay snapshots retain their reviewed baseline', () => {
  const results = [];
  const ids = Object.keys(BATTLE_ENGINE_CONFIGS).filter((id) => id !== 'third_winchester');
  assert.equal(ids.length, 10);
  for (const id of ids) for (const choice of ['option_a', 'option_b', 'option_c', 'option_d']) {
    const engine = new CivilWarBattleEngine(id, {}, choice);
    for (const unit of engine.state.filter((unit) => unit.side === 'confederate' && unit.active)) engine.order(unit.id, 'advance');
    for (let step = 0; step < 3200 && engine.outcome === 'undecided'; step += 1) engine.tick(0.05);
    results.push([id, choice, engine.snapshot()]);
  }
  assert.equal(results.length, 40);
  // Reviewed Shiloh retreat edges and Cold Harbor exits; the other eight maps are unchanged.
  assert.equal(createHash('sha256').update(JSON.stringify(results)).digest('hex'), 'b27e04bb75c1dea7457c9780d8c764acfdd83323af2ee007d13f2a2ee13e9cab');
});
