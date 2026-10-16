import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createFormationVisual, updateFormationVisual } from '../src/battle/formationVisualState.js';
import { casualtyOrder, deterministicUnitValue, formationFootprint, generateFormationSlots, projectedFormationSlot, visibleFigureCount } from '../src/battle/formationMath.js';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { BATTLE_ENGINE_CONFIGS } from '../src/battle/battleDefinitions.js';
import { canCommand } from '../src/battle/battleUsability.js';

const formation = (overrides = {}) => ({
  id: 'visual-fixture', side: 'confederate', type: 'infantry', active: true,
  x: 500, y: 400, facing: 0, frontage: 220, formationMode: 'line',
  strength: 180, initialStrength: 180, status: 'steady', order: 'hold',
  engagedWith: null, lastVolleyAt: -100, volleySerial: 0, reload: 0,
  ...overrides,
});
const living = (output) => output.figures.filter((figure) => figure.visible && !figure.fallen);
const fallen = (output) => output.figures.filter((figure) => figure.visible && figure.fallen);
const ids = (figures) => figures.map((figure) => figure.id);
const approx = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
const slotsOf = (state) => state.figures.filter((figure) => figure.alive).map(({ id, slot }) => ({ id, slot: structuredClone(slot) }));

test('Gettysburg visible ground anchors and selection use the physical footprint at every facing and art scale', () => {
  for (const mode of ['line', 'column', 'deep', 'skirmish']) for (const angle of [0, Math.PI / 4, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const unit = formation({ formationMode: mode, facing: angle, footprint: { width: 124, depth: 32 } });
    const a = updateFormationVisual(createFormationVisual(unit, 32), unit, 0, 0.6);
    const b = updateFormationVisual(createFormationVisual(unit, 32), unit, 0, 1.2);
    assert.deepEqual(a.footprint, b.footprint, 'zoom or sprite sizing cannot change formation spacing');
    for (const figure of living(a)) {
      const dx = figure.x - unit.x, dy = figure.y - unit.y;
      assert.ok(Math.abs(-Math.sin(angle) * dx + Math.cos(angle) * dy) <= 54 + 1e-8);
      assert.ok(Math.abs(Math.cos(angle) * dx + Math.sin(angle) * dy) <= 10 + 1e-8);
    }
  }
});

test('Gettysburg fallback faces its actual fire arc and reload remains visible between volleys', () => {
  const unit = formation({ facing: -Math.PI / 2, footprint: { width: 124, depth: 32 }, order: 'fallback' });
  const state = createFormationVisual(unit, 32);
  updateFormationVisual(state, unit, 0, 0.82);
  const moved = updateFormationVisual(state, { ...unit, y: 420 }, 1, 0.82);
  approx(moved.facing, unit.facing);
  assert.ok(living(moved).every(figure => figure.direction === 6));
  const reload = updateFormationVisual(state, { ...unit, y: 420, reload: 2, lastVolleyAt: 0.5, engagedWith: null }, 2, 0.82);
  assert.ok(living(reload).filter(figure => figure.frontRank).every(figure => figure.action === 'reload'));
});

test('single artillery anchor stays centered inside its Gettysburg footprint', () => {
  const unit = formation({ type: 'artillery', footprint: { width: 66, depth: 34 } });
  const output = updateFormationVisual(createFormationVisual(unit, 1), unit, 0, 0.82);
  approx(living(output)[0].x, unit.x);
  approx(living(output)[0].y, unit.y);
});

test('identical timelines produce identical visuals without random or wall-clock reads', () => {
  const initial = Object.freeze(formation());
  const original = structuredClone(initial);
  const replay = () => {
    const state = createFormationVisual(initial, 18);
    return [
      [0, {}], [0.2, { x: 510 }],
      [0.4, { x: 515, strength: 150, status: 'firing', engagedWith: 'enemy', lastVolleyAt: 0.4 }],
      [0.4, { x: 515, strength: 150, status: 'firing', engagedWith: 'enemy', lastVolleyAt: 0.4 }],
      [1, { x: 530, strength: 150, status: 'routing' }],
      [4, { x: 560, strength: 150, status: 'routing' }],
    ].map(([time, changes]) => structuredClone(updateFormationVisual(state, Object.freeze({ ...initial, ...changes }), time, 0.8)));
  };
  const random = Math.random;
  const now = Date.now;
  Math.random = () => assert.fail('visual state must not consume random numbers');
  Date.now = () => assert.fail('visual state must not read wall-clock time');
  try { assert.deepEqual(replay(), replay()); }
  finally { Math.random = random; Date.now = now; }
  assert.deepEqual(initial, original);
});

test('initial representative counts cover artillery, mobile, desktop, and depleted formations', () => {
  for (const capacity of [1, 18, 32]) {
    for (const strength of [0, 1, 90, 180]) {
      const unit = formation({ strength });
      const state = createFormationVisual(unit, capacity);
      const output = updateFormationVisual(state, unit, 0, 1);
      assert.equal(living(output).length, visibleFigureCount(strength, 180, capacity));
      assert.equal(fallen(output).length, 0, 'preexisting casualties must not replay as fresh deaths');
      assert.equal(state.figures.length, capacity);
      assert.equal(new Set(ids(state.figures)).size, capacity);
    }
  }
});

test('repeated paused frames preserve stride, casualty pose, gaps, and visual state', () => {
  const unit = formation();
  const state = createFormationVisual(unit, 18);
  updateFormationVisual(state, unit, 0, 1);
  const next = formation({ x: 510, strength: 150, order: 'advance' });
  const output = updateFormationVisual(state, next, 0.1, 1);
  const before = structuredClone(state);
  for (let index = 0; index < 100; index += 1) {
    assert.deepEqual(updateFormationVisual(state, next, 0.1, 1), output);
  }
  assert.deepEqual(state, before);
});

test('orders do not imply movement and actual displacement does', () => {
  for (const order of ['advance', 'withdraw', 'hold']) {
    const unit = formation({ order });
    const state = createFormationVisual(unit, 18);
    updateFormationVisual(state, unit, 0, 1);
    const still = updateFormationVisual(state, unit, 0.1, 1);
    assert.equal(still.moving, false);
    assert.ok(living(still).every((figure) => figure.action === 'idle'));
    const moved = updateFormationVisual(state, { ...unit, x: 510 }, 0.2, 1);
    assert.equal(moved.moving, true);
    assert.ok(living(moved).every((figure) => figure.action === 'walk'));
    approx(state.distance, 10);
  }
});

test('stationary advance inside firing range renders fire rather than walking', () => {
  const unit = formation({ order: 'advance', status: 'firing', engagedWith: 'enemy', lastVolleyAt: 0.1, reload: 3 });
  const state = createFormationVisual(unit, 18);
  const output = updateFormationVisual(state, unit, 0.2, 1);
  assert.equal(output.moving, false);
  assert.ok(living(output).filter((figure) => figure.frontRank).every((figure) => figure.action === 'fire'));
  assert.ok(living(output).every((figure) => figure.action !== 'walk'));
});

test('manual withdrawal follows measured travel direction without changing engine facing', () => {
  const engine = new CivilWarBattleEngine('first_manassas', {}, 'option_b');
  const unit = engine.state.find((candidate) => candidate.active && candidate.side === 'confederate' && candidate.type === 'infantry');
  const originalFacing = unit.facing;
  const state = createFormationVisual(unit, 18);
  updateFormationVisual(state, unit, 0, 1);
  engine.order(unit.id, 'withdraw');
  assert.equal(unit.facing, originalFacing, 'fixture must retain the engine manual-withdrawal behavior');
  engine.moveUnit(unit, 1);
  const before = engine.snapshot();
  const output = updateFormationVisual(state, Object.freeze({ ...unit }), 1, 1, { reducedMotion: true });
  assert.equal(output.moving, true);
  approx(output.facing, Math.PI / 2);
  assert.ok(living(output).every((figure) => figure.direction === 2 && figure.action === 'walk'));
  assert.deepEqual(engine.snapshot(), before);
});

test('gait phase follows distance, not elapsed time or projection scale', () => {
  const unit = formation();
  const slow = createFormationVisual(unit, 18);
  const fast = createFormationVisual(unit, 18);
  updateFormationVisual(slow, unit, 0, 1);
  updateFormationVisual(fast, unit, 0, 0.5);
  const a = updateFormationVisual(slow, { ...unit, x: 513 }, 1, 1);
  const b = updateFormationVisual(fast, { ...unit, x: 513 }, 0.1, 0.5);
  assert.deepEqual(living(a).map((figure) => figure.frame), living(b).map((figure) => figure.frame));
  approx(slow.distance, fast.distance);
});

test('visual turning takes the short arc and is bounded by simulation time', () => {
  const radians = (degrees) => degrees * Math.PI / 180;
  const unit = formation({ facing: radians(179) });
  const state = createFormationVisual(unit, 18);
  updateFormationVisual(state, unit, 0, 1);
  const output = updateFormationVisual(state, { ...unit, facing: radians(-179) }, 0.01, 1);
  assert.ok(output.facing > unit.facing);
  assert.ok(output.facing - unit.facing <= 0.026 + 1e-12);
});

test('routing can animate on a presentation clock while engine battle time stays frozen', () => {
  const engine = new CivilWarBattleEngine('first_manassas', {}, 'option_b');
  const initial = engine.snapshot();
  const unit = initial.formations.find((candidate) => candidate.active && candidate.side === 'confederate');
  const state = createFormationVisual(unit, 18, initial.time);
  updateFormationVisual(state, unit, initial.time, 1);
  engine.beginResolution('defeat');
  engine.tick(0.1);
  const snapshot = engine.snapshot();
  assert.equal(snapshot.time, initial.time);
  const next = snapshot.formations.find((candidate) => candidate.id === unit.id);
  const output = updateFormationVisual(state, next, snapshot.time + engine.resolutionTime, 1, { resolving: true });
  assert.equal(output.moving, true);
  assert.ok(living(output).every((figure) => figure.action === 'route'));
  assert.deepEqual(engine.snapshot(), snapshot);
  const before = structuredClone(state);
  updateFormationVisual(state, next, snapshot.time + engine.resolutionTime, 1, { resolving: true });
  assert.deepEqual(state, before);
});

test('losses remove deterministic front-first identities and retain surviving slots during contact', () => {
  const unit = formation({ engagedWith: 'enemy' });
  const state = createFormationVisual(unit, 18);
  updateFormationVisual(state, unit, 0, 1);
  const slots = structuredClone(state.figures.map((figure) => figure.slot));
  const expected = casualtyOrder(slots, unit.id).slice(0, 3).sort((a, b) => a - b);
  const hurt = { ...unit, strength: 150 };
  const output = updateFormationVisual(state, hurt, 0.1, 1);
  assert.deepEqual(ids(fallen(output)).sort((a, b) => a - b), expected);
  assert.equal(living(output).length, 15);
  for (const figure of state.figures.filter((figure) => figure.alive)) assert.deepEqual(figure.slot, slots[figure.id]);
  assert.ok(ids(living(output)).some((id, index) => id !== index), 'interior gaps must remain');
  const before = slotsOf(state);
  updateFormationVisual(state, hurt, 4, 1);
  assert.deepEqual(slotsOf(state), before, 'continued contact prevents automatic repacking');
});

test('successive casualties never remove an already fallen figure twice', () => {
  const unit = formation({ engagedWith: 'enemy' });
  const state = createFormationVisual(unit, 18);
  updateFormationVisual(state, unit, 0, 1);
  const first = updateFormationVisual(state, { ...unit, strength: 150 }, 0.1, 1);
  const initialFalls = new Map(fallen(first).map((figure) => [figure.id, structuredClone(figure)]));
  const second = updateFormationVisual(state, { ...unit, strength: 120 }, 0.2, 1);
  assert.equal(living(second).length, 12);
  assert.equal(fallen(second).length, 6);
  for (const figure of fallen(second).filter((candidate) => initialFalls.has(candidate.id))) {
    const previous = initialFalls.get(figure.id);
    assert.equal(figure.time, previous.time);
    approx(figure.x, previous.x);
    approx(figure.y, previous.y);
  }
});

test('fallen figures keep world anchors while survivors move and expire on simulation time', () => {
  const unit = formation({ engagedWith: 'enemy' });
  const state = createFormationVisual(unit, 18);
  updateFormationVisual(state, unit, 0, 1);
  const hurt = { ...unit, strength: 150 };
  const first = fallen(updateFormationVisual(state, hurt, 0.1, 1));
  const moving = { ...hurt, x: 540, y: 420, engagedWith: null };
  const later = fallen(updateFormationVisual(state, moving, 0.6, 0.5));
  assert.deepEqual(later.map(({ id, x, y, scale }) => ({ id, x, y, scale })), first.map(({ id, x, y, scale }) => ({ id, x, y, scale })));
  assert.ok(later.every((figure) => figure.frame === 3));
  const expired = updateFormationVisual(state, moving, 3.31, 0.5);
  assert.equal(fallen(expired).length, 0);
});

test('automatic repacking waits for casualty and disengagement delays then preserves identities', () => {
  const unit = formation({ engagedWith: 'enemy' });
  const state = createFormationVisual(unit, 18);
  updateFormationVisual(state, unit, 0, 1);
  const hurt = { ...unit, strength: 150 };
  updateFormationVisual(state, hurt, 1, 1);
  const gaps = slotsOf(state);
  const resting = { ...hurt, engagedWith: null };
  updateFormationVisual(state, resting, 2, 1);
  assert.deepEqual(slotsOf(state), gaps);
  updateFormationVisual(state, resting, 3.01, 1);
  assert.notDeepEqual(slotsOf(state), gaps);
  assert.deepEqual(ids(slotsOf(state)), ids(gaps));
  const targets = generateFormationSlots(unit.id, 'line', 15, unit.frontage * Math.sqrt(15 / 18), 1);
  updateFormationVisual(state, resting, 10, 1);
  slotsOf(state).forEach(({ slot }, index) => {
    approx(slot.lateral, targets[index].lateral);
    approx(slot.forward, targets[index].forward);
  });
});

test('moving survivors retain fresh gaps and repack only after the loss delay', () => {
  const unit = formation();
  const state = createFormationVisual(unit, 18);
  updateFormationVisual(state, unit, 0, 1);
  const hurt = { ...unit, strength: 150 };
  updateFormationVisual(state, hurt, 0.1, 1);
  const gaps = slotsOf(state);
  updateFormationVisual(state, { ...hurt, x: 510 }, 1, 1);
  assert.deepEqual(slotsOf(state), gaps);
  updateFormationVisual(state, { ...hurt, x: 520 }, 1.21, 1);
  assert.notDeepEqual(slotsOf(state), gaps);
  assert.deepEqual(ids(slotsOf(state)), ids(gaps));
});

test('an explicit paused formation change repacks survivors without replaying casualties', () => {
  const unit = formation({ engagedWith: 'enemy' });
  const state = createFormationVisual(unit, 18);
  updateFormationVisual(state, unit, 0, 1);
  const hurt = { ...unit, strength: 150 };
  updateFormationVisual(state, hurt, 0.1, 1);
  const before = ids(state.figures.filter((figure) => figure.alive));
  const lastLoss = state.lastLoss;
  const output = updateFormationVisual(state, { ...hurt, formationMode: 'column', frontage: 115 }, 0.1, 1);
  assert.deepEqual(ids(living(output)), before);
  assert.equal(state.lastLoss, lastLoss);
  assert.equal(output.moving, false);
  const targets = generateFormationSlots(unit.id, 'column', 15, 115, 1);
  state.figures.filter((figure) => figure.alive).forEach(({ slot }, index) => {
    const { lateral, forward, ...metadata } = slot;
    const { lateral: targetLateral, forward: targetForward, ...targetMetadata } = targets[index];
    assert.deepEqual(metadata, targetMetadata);
    approx(lateral, targetLateral);
    approx(forward, targetForward);
  });
});

test('broken survivors are hidden, while strength alone determines deaths', () => {
  for (const change of [{ status: 'broken', strength: 5 }, { strength: 0 }]) {
    const unit = formation();
    const state = createFormationVisual(unit, 18);
    updateFormationVisual(state, unit, 0, 1);
    const output = updateFormationVisual(state, { ...unit, ...change }, 0.1, 1);
    assert.equal(living(output).length, 0);
    const survivors = change.strength === 5 ? 1 : 0;
    assert.equal(state.figures.filter((figure) => figure.alive).length, survivors);
    assert.equal(output.figures.filter((figure) => !figure.visible).length, survivors);
    assert.equal(fallen(output).length, 18 - survivors);
    assert.deepEqual(output.footprint, []);
  }
});

test('broken-to-routing resolution returns the same survivors without extra deaths or resurrection', () => {
  const unit = formation();
  const state = createFormationVisual(unit, 18);
  updateFormationVisual(state, unit, 0, 1);
  const hurt = { ...unit, strength: 5 };
  const beforeBroken = updateFormationVisual(state, hurt, 0.1, 1);
  const survivors = ids(living(beforeBroken));
  const casualties = structuredClone(state.figures.filter((figure) => !figure.alive));
  assert.equal(survivors.length, 1);
  assert.equal(casualties.length, 17);

  const broken = updateFormationVisual(state, { ...hurt, status: 'broken' }, 0.2, 1);
  assert.equal(living(broken).length, 0);
  assert.deepEqual(ids(state.figures.filter((figure) => figure.alive)), survivors);
  assert.deepEqual(state.figures.filter((figure) => !figure.alive), casualties, 'status alone creates no fresh falls');
  assert.deepEqual(broken.footprint, []);
  assert.equal(state.lastLoss, 0.1);

  const routing = { ...hurt, status: 'routing', order: 'withdraw', x: unit.x + 4 };
  const returned = updateFormationVisual(state, routing, 0.3, 1, { resolving: true });
  assert.deepEqual(ids(living(returned)), survivors);
  assert.ok(living(returned).every((figure) => figure.action === 'route'));
  assert.deepEqual(state.figures.filter((figure) => !figure.alive), casualties);
  assert.equal(fallen(returned).length, 17);
  assert.ok(returned.footprint.length > 0);
  assert.equal(state.lastLoss, 0.1);

  const afterFallsExpire = updateFormationVisual(state, { ...routing, x: unit.x + 50 }, 4, 1, { resolving: true });
  assert.deepEqual(ids(living(afterFallsExpire)), survivors);
  assert.equal(fallen(afterFallsExpire).length, 0);
  assert.equal(state.figures.filter((figure) => figure.alive).length, 1);
});

test('routing spread starts at zero after a 60-unit march and counts only new routing travel', () => {
  const unit = formation({ order: 'advance' });
  const state = createFormationVisual(unit, 18);
  updateFormationVisual(state, unit, 0, 1);
  const marched = { ...unit, x: unit.x + 60 };
  const beforeRouting = structuredClone(updateFormationVisual(state, marched, 1, 1));
  approx(state.distance, 60);
  approx(state.routingDistance, 0);
  const routing = { ...marched, status: 'routing', order: 'withdraw' };
  const stationary = updateFormationVisual(state, routing, 1, 1, { resolving: true });
  assert.equal(stationary.moving, false);
  approx(state.routingDistance, 0);
  const anchors = (output) => living(output).map(({ id, x, y }) => ({ id, x, y }));
  assert.deepEqual(anchors(stationary), anchors(beforeRouting), 'entering routing at rest must not scatter by lifetime marching distance');
  const paused = structuredClone(state);
  updateFormationVisual(state, routing, 1, 1, { resolving: true });
  assert.deepEqual(state, paused);

  for (const [time, travel] of [[1.5, 9], [2, 12]]) {
    const moved = { ...routing, x: routing.x + travel };
    const output = updateFormationVisual(state, moved, time, 1, { resolving: true });
    approx(state.distance, 60 + travel);
    approx(state.routingDistance, travel);
    assert.equal(output.moving, true);
    for (const figure of living(output)) {
      const slot = state.figures.find((candidate) => candidate.id === figure.id).slot;
      const ground = projectedFormationSlot(moved, output.facing, slot, 1);
      const spread = travel / 45;
      approx(figure.x - ground.x, (deterministicUnitValue(unit.id, figure.id, 47) - 0.5) * 38 * spread);
      approx(figure.y - ground.y, (deterministicUnitValue(unit.id, figure.id, 49) - 0.5) * 22 * spread);
    }
  }

  const held = { ...routing, status: 'steady', order: 'hold', x: routing.x + 12 };
  const heldOutput = structuredClone(updateFormationVisual(state, held, 2, 1));
  approx(state.routingDistance, 0);
  const rerouted = updateFormationVisual(state, { ...held, status: 'routing', order: 'withdraw' }, 2, 1, { resolving: true });
  approx(state.routingDistance, 0);
  approx(state.distance, 72);
  assert.deepEqual(anchors(rerouted), anchors(heldOutput), 'a later routing episode must not inherit earlier routing spread');
});

test('footprints contain living ground anchors only, not casualties', () => {
  const unit = formation();
  const state = createFormationVisual(unit, 18);
  updateFormationVisual(state, unit, 0, 0.6);
  const output = updateFormationVisual(state, { ...unit, strength: 90 }, 0.1, 0.6);
  assert.deepEqual(output.footprint, formationFootprint(living(output), 9 * 0.6));
  assert.ok(fallen(output).length > 0);
});

test('inactive reserves skipped by the renderer activate without phantom travel or fresh casualties', () => {
  const unit = formation({ active: false, strength: 90 });
  const state = createFormationVisual(unit, 18);
  const before = structuredClone(state);
  // The renderer owns inactive visibility and must skip visual updates until arrival.
  for (const time of [1, 10, 20]) {
    if (unit.active) updateFormationVisual(state, unit, time, 1);
  }
  assert.deepEqual(state, before);
  const arrived = Object.freeze({ ...unit, active: true });
  const output = updateFormationVisual(state, arrived, 30, 1);
  assert.equal(output.moving, false);
  assert.equal(state.distance, 0);
  assert.equal(living(output).length, 9);
  assert.equal(fallen(output).length, 0);
  assert.ok(living(output).every((figure) => figure.action === 'idle'));
});

test('fresh reinforcement state initialized at arrival does not inherit another formation history', () => {
  const veteran = formation({ strength: 90 });
  const oldState = createFormationVisual(veteran, 18);
  updateFormationVisual(oldState, { ...veteran, x: 540, strength: 60 }, 1, 1);
  const before = structuredClone(oldState);
  const reserve = formation({ id: 'reserve', x: 300, y: 700 });
  const newState = createFormationVisual(reserve, 18, 30);
  const output = updateFormationVisual(newState, reserve, 30, 1);
  assert.equal(living(output).length, 18);
  assert.equal(fallen(output).length, 0);
  assert.equal(newState.distance, 0);
  assert.equal(output.moving, false);
  assert.deepEqual(oldState, before);
});

test('paused scale changes refresh geometry without advancing gait or casualty timers', () => {
  const unit = formation();
  const state = createFormationVisual(unit, 18);
  const first = structuredClone(updateFormationVisual(state, unit, 0, 1));
  const distance = state.distance;
  const output = updateFormationVisual(state, unit, 0, 0.5);
  for (const figure of living(output)) {
    const original = first.figures.find((candidate) => candidate.id === figure.id);
    assert.equal(figure.scale, 0.5);
    approx(figure.x - unit.x, (original.x - unit.x) * 0.5);
    approx(figure.y - unit.y, (original.y - unit.y) * 0.5);
    assert.equal(figure.frame, original.frame);
  }
  assert.equal(state.time, 0);
  assert.equal(state.distance, distance);
});

test('same-time resolution transition suppresses cached firing poses', () => {
  const unit = formation({ status: 'firing', engagedWith: 'enemy', lastVolleyAt: 0 });
  const state = createFormationVisual(unit, 18);
  const first = updateFormationVisual(state, unit, 0, 1);
  assert.ok(living(first).some((figure) => figure.action === 'fire'));
  const output = updateFormationVisual(state, unit, 0, 1, { resolving: true });
  assert.ok(living(output).every((figure) => figure.action === 'idle'));
});

test('same-time reduced-motion changes replace cached animated frames', () => {
  const unit = formation({ status: 'firing', engagedWith: 'enemy', lastVolleyAt: 0 });
  const state = createFormationVisual(unit, 18);
  const first = updateFormationVisual(state, unit, 0.3, 1);
  assert.ok(living(first).some((figure) => figure.action === 'fire' && figure.frame === 2));
  const output = updateFormationVisual(state, unit, 0.3, 1, { reducedMotion: true });
  assert.ok(living(output).filter((figure) => figure.action === 'fire').every((figure) => figure.frame === 1));
});

// Match the renderer's allocated pool, including inactive reserves and fallen figures.
const figureCapacity = (unit) => unit.type === 'artillery' ? 1 : 32;
const deployments = Object.entries(BATTLE_ENGINE_CONFIGS).flatMap(([scenarioId, config]) =>
  Object.keys(config.postures).map((choiceId) => ({ scenarioId, choiceId, config })));

test('all 11 scenarios and 4 choices remain within the 700-figure allocation budget', (context) => {
  assert.equal(Object.keys(BATTLE_ENGINE_CONFIGS).length, 11);
  for (const config of Object.values(BATTLE_ENGINE_CONFIGS)) {
    assert.deepEqual(Object.keys(config.postures).sort(), ['option_a', 'option_b', 'option_c', 'option_d']);
  }
  assert.equal(deployments.length, 44);
  const renderer = readFileSync(new URL('../src/battle/CivilWarBattlefield.jsx', import.meta.url), 'utf8');
  assert.match(renderer, /const capacity = formation\.type === 'artillery' \? 1 : 32;/,
    'update the budget fixture when renderer allocation changes');
  let maximum = 0;
  let maximumDeployment = '';
  for (const { scenarioId, choiceId } of deployments) {
    const engine = new CivilWarBattleEngine(scenarioId, {}, choiceId);
    const allocated = engine.snapshot().formations.reduce((sum, unit) => sum + figureCapacity(unit), 0);
    assert.ok(allocated <= 700, `${scenarioId}:${choiceId} allocates ${allocated} figures`);
    if (allocated > maximum) { maximum = allocated; maximumDeployment = `${scenarioId}:${choiceId}`; }
  }
  context.diagnostic(`Maximum allocated figure count: ${maximum}/700 (${maximumDeployment}), including inactive reserves.`);
});

for (const { scenarioId, choiceId, config } of deployments) {
  test(`visual sampling cannot change engine replay: ${scenarioId}:${choiceId}`, () => {
    const control = new CivilWarBattleEngine(scenarioId, {}, choiceId);
    const engines = [control,
      new CivilWarBattleEngine(scenarioId, {}, choiceId),
      new CivilWarBattleEngine(scenarioId, {}, choiceId)];
    const opening = control.snapshot();
    const makeViews = () => new Map(opening.formations.map((unit) =>
      [unit.id, createFormationVisual(unit, figureCapacity(unit), opening.time)]));
    const samplers = [
      { engine: engines[1], views: makeViews(), calls: 0 },
      { engine: engines[2], views: makeViews(), calls: 0 },
    ];
    const allocated = opening.formations.reduce((sum, unit) => sum + figureCapacity(unit), 0);
    const initialIds = opening.formations.map((unit) => unit.id);

    const sample = (sampler, reducedMotion = false) => {
      const before = sampler.engine.snapshot();
      const input = sampler.engine.snapshot();
      const time = input.time + sampler.engine.resolutionTime;
      let visible = 0;
      for (const unit of input.formations) {
        if (!unit.active) continue;
        const depth = Math.max(0, Math.min(1, (unit.y - config.projection.horizon) / (config.world.height - config.projection.horizon)));
        const scale = config.projection.farScale + (config.projection.nearScale - config.projection.farScale) * depth;
        const output = updateFormationVisual(sampler.views.get(unit.id), unit, time, scale, {
          reducedMotion, resolving: input.resolving || input.outcome !== 'undecided',
        });
        assert.equal(output.figures.length, figureCapacity(unit));
        visible += output.figures.filter((figure) => figure.visible).length;
      }
      assert.ok(visible <= allocated && visible <= 700, 'living and fallen figures share the bounded pool');
      assert.deepEqual(input, before, 'sampling must not mutate its snapshot input');
      assert.deepEqual(sampler.engine.snapshot(), before, 'sampling must not mutate the engine through aliased data');
      sampler.calls += 1;
    };

    // Commands are chosen once from the control, then sent identically through public APIs.
    const commandAt = (step) => {
      const eligible = control.snapshot().formations.filter(canCommand);
      if ([0, 400].includes(step)) {
        for (const unit of eligible) for (const engine of engines) engine.order(unit.id, 'advance');
      }
      const selected = eligible.find((unit) => unit.type === 'infantry');
      if (!selected) return;
      for (const engine of engines) {
        if (step === 40) engine.order(selected.id, 'volley');
        if (step === 60) engine.move(selected.id, { x: selected.x + 80, y: selected.y - 60 });
        if (step === 100) engine.setFormation(selected.id, 'column');
        if (step === 140) engine.order(selected.id, 'withdraw');
        if (step === 200) engine.order(selected.id, 'reform');
        if (step === 340) engine.order(selected.id, 'hold');
      }
    };

    sample(samplers[0]);
    sample(samplers[1]);
    // At most 24 field seconds: identical 50ms ticks with periodic paused ticks.
    for (let step = 0; step < 480; step += 1) {
      commandAt(step);
      const dt = step % 80 === 0 ? 0 : 0.05;
      for (const engine of engines) engine.tick(dt);
      sample(samplers[0]);
      if (step % 7 === 0 || step % 19 === 0) sample(samplers[1], step % 19 === 0);
      if (dt === 0) { sample(samplers[0]); sample(samplers[1]); }
      const expected = control.snapshot();
      assert.deepEqual(expected.formations.map((unit) => unit.id), initialIds, 'reinforcement activation must reuse allocated formations');
      for (const { engine } of samplers) {
        assert.deepEqual(engine.snapshot(), expected, `engine diverged after commands, tick, or visual sampling at step ${step}`);
        assert.equal(engine.resolutionTime, control.resolutionTime);
        assert.equal(engine.pendingOutcome, control.pendingOutcome);
      }
    }
    sample(samplers[1]);
    assert.ok(samplers[0].calls > samplers[1].calls * 3, 'replays must exercise materially different visual sampling cadences');
    assert.deepEqual(engines[1].snapshot(), control.snapshot());
    assert.deepEqual(engines[2].snapshot(), control.snapshot());
  });
}
