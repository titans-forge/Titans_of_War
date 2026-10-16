import assert from 'node:assert/strict';
import { CivilWarBattleEngine, REFORM_DURATION } from '../src/battle/civilWarEngine.js';
import { BATTLE_ENGINE_CONFIGS } from '../src/battle/battleDefinitions.js';
import { overviewZoom, boundedZoom, isPanGesture, canCommand } from '../src/battle/battleUsability.js';

let deployments = 0;
for (const [id, config] of Object.entries(BATTLE_ENGINE_CONFIGS)) {
  for (const choice of Object.keys(config.postures)) {
    const engine = new CivilWarBattleEngine(id, {}, choice);
    for (const unit of engine.state.filter(canCommand)) {
      const reload = unit.reload;
      const ammunition = unit.ammunition;
      for (let click = 0; click < 100; click += 1) engine.order(unit.id, 'volley');
      assert.equal(unit.reload, reload, `${id}: volley cannot clear reload`);
      assert.equal(unit.ammunition, ammunition, `${id}: paused orders cannot fire`);
      const cohesion = unit.cohesion;
      const fatigue = unit.fatigue;
      for (let click = 0; click < 100; click += 1) engine.order(unit.id, 'reform');
      assert.equal(unit.cohesion, cohesion, `${id}: paused reform cannot grant cohesion`);
      assert.equal(unit.fatigue, fatigue, `${id}: paused reform cannot change fatigue`);
      assert.equal(unit.reformRemaining, REFORM_DURATION);
      engine.order(unit.id, 'hold');
      assert.equal(unit.reformRemaining, 0);
    }
    deployments += 1;
  }
  for (const viewport of [{ width: 390, height: 300 }, { width: 768, height: 600 }, { width: 1131, height: 560 }, { width: 1685, height: 850 }]) {
    const minimum = overviewZoom(viewport, config.world);
    assert.ok(config.world.width * minimum <= viewport.width + 1e-8);
    assert.ok(config.world.height * minimum <= viewport.height + 1e-8);
    assert.equal(boundedZoom(minimum, -0.1, minimum), minimum, 'Zoom out at Fit must not magnify');
    let zoom = boundedZoom(minimum, 0.8, minimum);
    for (let click = 0; click < 30; click += 1) {
      const next = boundedZoom(zoom, -0.1, minimum);
      assert.ok(next <= zoom);
      zoom = next;
    }
    assert.equal(zoom, minimum);
  }
}

function fixture() {
  const engine = new CivilWarBattleEngine('first_manassas', {}, 'option_b');
  // Keep both sides on field but separate them beyond all firing ranges.
  for (const unit of engine.state) { unit.x = unit.side === 'confederate' ? 100 : 1450; unit.y = 500; unit.ammunition = 0; }
  const unit = engine.state.find(canCommand);
  unit.cohesion = 50;
  unit.fatigue = 10;
  return { engine, unit };
}
const normal = fixture();
const spammed = fixture();
for (const { engine, unit } of [normal, spammed]) engine.order(unit.id, 'reform');
for (let step = 0; step < REFORM_DURATION * 20; step += 1) {
  spammed.engine.order(spammed.unit.id, 'reform');
  normal.engine.tick(0.05);
  spammed.engine.tick(0.05);
}
assert.deepEqual(spammed.engine.snapshot(), normal.engine.snapshot(), 'Repeated reform orders cannot speed up or restart recovery');
assert.ok(Math.abs(normal.unit.cohesion - 59) < 1e-8);
assert.ok(Math.abs(normal.unit.fatigue - 13) < 1e-8);
normal.engine.tick(0.05);
assert.equal(normal.unit.order, 'hold');
assert.equal(normal.unit.reformRemaining, 0);

const interrupted = fixture();
interrupted.engine.order(interrupted.unit.id, 'reform');
interrupted.engine.tick(1);
assert.equal(interrupted.unit.cohesion, 51.5);
interrupted.engine.move(interrupted.unit.id, { x: 200, y: 500 });
assert.equal(interrupted.unit.reformRemaining, 0);
interrupted.engine.tick(1);
assert.equal(interrupted.unit.cohesion, 51.5, 'Moving cancels recovery');
const paused = interrupted.engine.snapshot();
for (const dt of [0, -1, NaN, Infinity]) interrupted.engine.tick(dt);
assert.deepEqual(interrupted.engine.snapshot(), paused, 'No simulation or reload progress without positive finite time');

function firingFixture() {
  const { engine, unit } = fixture();
  const enemy = engine.state.find((other) => other.side === 'union');
  enemy.x = 200;
  unit.ammunition = 50;
  unit.reload = 2;
  return { engine, unit };
}
const held = firingFixture();
const volley = firingFixture();
for (let step = 0; step < 100; step += 1) {
  volley.engine.order(volley.unit.id, 'volley');
  held.engine.tick(0.05);
  volley.engine.tick(0.05);
}
assert.equal(volley.unit.volleySerial, held.unit.volleySerial, 'Volley spam cannot increase firing cadence');
assert.equal(volley.unit.ammunition, held.unit.ammunition);
assert.equal(volley.unit.reload, held.unit.reload);
const reforming = firingFixture();
reforming.engine.order(reforming.unit.id, 'reform');
for (let step = 0; step < 80; step += 1) reforming.engine.tick(0.05);
assert.equal(reforming.unit.volleySerial, 0, 'Reforming formations cannot fire');

const snapUnit = normal.engine.snapshot().formations.find((unit) => unit.id === normal.unit.id);
assert.equal(snapUnit.defenseMultiplier, normal.engine.terrainDefense(normal.unit));
assert.equal(snapUnit.movementMultiplier, normal.engine.terrainMovementMultiplier(normal.unit));
assert.ok(snapUnit.firingRange > 0);
assert.equal(isPanGesture({ x: 0, y: 0 }, { x: 4, y: 4 }), false);
assert.equal(isPanGesture({ x: 0, y: 0 }, { x: 9, y: 0 }), true);
for (const status of ['routing', 'broken']) assert.equal(canCommand({ ...normal.unit, status }), false);
assert.equal(canCommand({ ...normal.unit, active: false }), false);
assert.equal(canCommand(undefined), false);

console.log(`Battle usability checks passed: ${deployments} deployments, reload/reform regressions, camera bounds, gestures, and command eligibility.`);
