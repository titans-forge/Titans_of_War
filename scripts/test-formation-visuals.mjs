import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import {
  hashString, deterministicUnitValue, generateFormationSlots, projectFormationSlot, visibleFigureCount,
  projectedFormationSlot, directionIndex, approachAngle, formationFootprint, casualtyOrder,
} from '../src/battle/formationMath.js';

const approx = (a, b, message = '') => assert.ok(Math.abs(a - b) < 1e-9, `${message}: ${a} != ${b}`);
const pointEqual = (a, b) => { approx(a.x, b.x, 'x'); approx(a.y, b.y, 'y'); };
const radians = (degrees) => degrees * Math.PI / 180;
const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const modes = ['line', 'column', 'skirmish', 'deep'];

test('legacy slot layout, projection, and count calls remain compatible', () => {
  const layouts = modes.map((mode) => generateFormationSlots('fixture', mode, 32, 180));
  assert.equal(createHash('sha256').update(JSON.stringify(layouts)).digest('hex'),
    '994ee11641f0d97637e5473489b0066d2721c401610ec89ebc5dee247cda8df1');
  assert.equal(hashString(''), 2166136261);
  assert.equal(hashString('hello'), 1335831723);
  pointEqual(projectFormationSlot({ x: 100, y: 200 }, 0, { lateral: 4, forward: 10 }), { x: 110, y: 204 });
  pointEqual(projectFormationSlot({ x: 100, y: 200 }, Math.PI / 2, { lateral: 4, forward: 10 }), { x: 96, y: 210 });
  assert.equal(visibleFigureCount(50, 100, 32), 16);
  assert.equal(visibleFigureCount(0, 100, 32), 0);
  assert.equal(visibleFigureCount(200, 100, 32), 32);
  assert.equal(visibleFigureCount(1, 100, 32), 1);
  for (const mode of modes) {
    assert.deepEqual(generateFormationSlots('fixture', mode, 0, 180), []);
    for (const count of [1, 2, 18, 32, 64]) {
      const slots = generateFormationSlots('fixture', mode, count, 180, 1);
      assert.equal(slots.length, count);
      assert.deepEqual(slots, generateFormationSlots('fixture', mode, count, 180, 1));
      assert.deepEqual(slots.map((slot) => slot.index), Array.from({ length: count }, (_, index) => index));
    }
  }
});

test('projection scales every rotated ground offset around an unchanged anchor', () => {
  const origin = Object.freeze({ x: 100, y: 200 });
  const slot = Object.freeze({ lateral: 4, forward: 10 });
  pointEqual(projectedFormationSlot(origin, 0, slot, 1), { x: 110, y: 202.88 });
  pointEqual(projectedFormationSlot(origin, Math.PI / 2, slot, 1), { x: 96, y: 207.2 });
  pointEqual(projectedFormationSlot(origin, 0, slot, 0.5), { x: 105, y: 201.44 });
  pointEqual(projectedFormationSlot(origin, 0, slot, 0), origin);
  pointEqual(projectedFormationSlot(origin, Math.PI / 2, slot, 1, 0), { x: 96, y: 200 });
  for (const mode of modes) {
    const slots = generateFormationSlots('projection', mode, 32, 190, 1);
    for (let direction = 0; direction < 16; direction += 1) {
      const facing = direction * Math.PI / 8;
      for (const slot of slots) {
        const legacy = projectFormationSlot(origin, facing, slot);
        pointEqual(projectedFormationSlot(origin, facing, slot, 1, 1), legacy);
        for (const scale of [0.55, 1, 1.08]) {
          const projected = projectedFormationSlot(origin, facing, slot, scale, 0.72);
          pointEqual(projected, { x: origin.x + (legacy.x - origin.x) * scale, y: origin.y + (legacy.y - origin.y) * scale * 0.72 });
        }
      }
    }
  }
});

test('direction indices are east-first and clockwise with deterministic boundaries', () => {
  for (let index = 0; index < 8; index += 1) {
    const center = index * Math.PI / 4;
    for (const turns of [-3, -1, 0, 1, 4]) assert.equal(directionIndex(center + turns * Math.PI * 2), index);
    const boundary = (index + 0.5) * Math.PI / 4;
    assert.equal(directionIndex(boundary - 1e-8), index);
    assert.equal(directionIndex(boundary + 1e-8), (index + 1) % 8);
    assert.equal(directionIndex(boundary), (index + 1) % 8, 'exact positive half-sector tie goes clockwise');
  }
  assert.equal(directionIndex(-Math.PI / 8), 0);
  assert.equal(directionIndex(-3 * Math.PI / 8), 7);
  assert.equal(directionIndex(-Math.PI / 2), 6);
  assert.equal(directionIndex(-0), 0);
});

test('angle approach takes the bounded shortest turn without wrap jumps or overshoot', () => {
  approx(approachAngle(radians(350), radians(10), radians(5)), radians(355));
  approx(approachAngle(radians(350), radians(10), radians(30)), radians(370));
  approx(approachAngle(radians(10), radians(350), radians(5)), radians(5));
  approx(approachAngle(radians(179), radians(-179), radians(1)), radians(180));
  approx(approachAngle(radians(-179), radians(179), radians(1)), radians(-180));
  assert.equal(approachAngle(1, 2, 0), 1);
  approx(approachAngle(0, Math.PI, 0.1), 0.1);
  approx(approachAngle(0, -Math.PI, 0.1), 0.1);
  approx(approachAngle(0.3, 0.3 + Math.PI * 2, 1), 0.3);
  let current = radians(350);
  for (let index = 0; index < 20; index += 1) {
    const next = approachAngle(current, radians(10), radians(3));
    assert.ok(next >= current && next - current <= radians(3) + 1e-12);
    current = next;
  }
  approx(current, radians(370));
});

test('convex footprint handles duplicates, collinear points, empty and singleton inputs', () => {
  assert.deepEqual(formationFootprint([]), []);
  assert.deepEqual(formationFootprint([{ x: 2, y: 3 }], 0), [{ x: 2, y: 3 }]);
  assert.deepEqual(formationFootprint([{ x: 2, y: 3 }]), [
    { x: -8, y: -7 }, { x: 12, y: -7 }, { x: 12, y: 13 }, { x: -8, y: 13 },
  ]);
  assert.deepEqual(formationFootprint([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 1, y: 1 }], 0),
    [{ x: 0, y: 0 }, { x: 2, y: 2 }]);
  const points = [{ x: 10, y: 10 }, { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }, { x: 5, y: 5 }, { x: 10, y: 0 }];
  const original = structuredClone(points);
  const expected = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  assert.deepEqual(formationFootprint(points, 0), expected);
  assert.deepEqual(formationFootprint([...points].reverse(), 0), expected);
  assert.deepEqual(points, original);
});

test('projected formation hulls enclose all padded ground anchors with no crossing edges', () => {
  for (const mode of modes) {
    for (let direction = 0; direction < 8; direction += 1) {
      const points = generateFormationSlots('footprint', mode, 32, 180, 1)
        .map((slot) => projectedFormationSlot({ x: 300, y: 400 }, direction * Math.PI / 4, slot, 0.58));
      const hull = formationFootprint(points, 7);
      assert.ok(hull.length >= 3);
      for (let index = 0; index < hull.length; index += 1) {
        const a = hull[index];
        const b = hull[(index + 1) % hull.length];
        assert.ok(cross(a, b, hull[(index + 2) % hull.length]) > 0, 'convex, clockwise in screen coordinates');
        for (const point of points) {
          for (const dx of [-7, 7]) for (const dy of [-7, 7]) {
            assert.ok(cross(a, b, { x: point.x + dx, y: point.y + dy }) >= -1e-8, 'padded anchor inside every hull edge');
          }
        }
      }
    }
  }
});

test('casualty priority is a stable front-first permutation independent of caller mutation', () => {
  const slots = generateFormationSlots('fixture', 'line', 18, 180, 1);
  const original = structuredClone(slots);
  const order = casualtyOrder(slots, 'fixture');
  assert.deepEqual(order, [3, 7, 1, 8, 6, 4, 0, 5, 2, 15, 14, 10, 13, 16, 12, 11, 9, 17]);
  assert.deepEqual(casualtyOrder(slots, 'fixture'), order);
  assert.notDeepEqual(casualtyOrder(slots, 'another-formation'), order);
  assert.deepEqual(slots, original);
  assert.deepEqual(casualtyOrder([], 'empty'), []);
  assert.deepEqual(casualtyOrder([{ index: 99, row: 0 }], 'singleton'), [0], 'return array position, not slot.index');
  for (const mode of modes) {
    const slots = generateFormationSlots('ranks', mode, 32, 180, 1);
    const order = casualtyOrder(slots, 'ranks');
    assert.deepEqual([...order].sort((a, b) => a - b), slots.map((slot, index) => index));
    for (let index = 1; index < order.length; index += 1) assert.ok(slots[order[index - 1]].row <= slots[order[index]].row);
  }
});

test('loss prefixes preserve visible gaps until caller explicitly regenerates packed slots', () => {
  const slots = generateFormationSlots('fixture', 'line', 18, 180, 1);
  const order = casualtyOrder(slots, 'fixture');
  for (const losses of [1, 3, 8, 17, 18]) {
    const dead = new Set(order.slice(0, losses));
    const survivors = slots.filter((slot, index) => !dead.has(index));
    assert.equal(survivors.length, slots.length - losses);
    for (const survivor of survivors) assert.deepEqual(survivor, slots[survivor.index], 'surviving ground slot stays fixed');
    if (losses < 8) assert.ok(survivors.some((slot, index) => slot.index !== index), 'casualties leave visible interior gaps');
    const packed = generateFormationSlots('fixture', 'line', survivors.length, 180, 1);
    assert.deepEqual(packed.map((slot) => slot.index), Array.from({ length: survivors.length }, (_, index) => index));
  }
});

test('helpers have no wall-clock/random dependency and reject nonfinite geometry', () => {
  const originalRandom = Math.random;
  Math.random = () => assert.fail('visual helpers must not use Math.random');
  try {
    const slots = generateFormationSlots('no-random', 'column', 18, 180, 1);
    assert.ok(Number.isFinite(deterministicUnitValue('no-random', 2)));
    casualtyOrder(slots, 'no-random');
    formationFootprint(slots.map((slot) => projectedFormationSlot({ x: 0, y: 0 }, 1, slot, 0.6)));
    directionIndex(1);
    approachAngle(1, 2, 0.2);
  } finally { Math.random = originalRandom; }
  assert.throws(() => directionIndex(NaN), /finite/);
  assert.throws(() => approachAngle(0, 1, -1), /nonnegative/);
  assert.throws(() => formationFootprint([{ x: Infinity, y: 0 }]), /finite/);
  assert.throws(() => formationFootprint([], -1), /nonnegative/);
  assert.throws(() => projectedFormationSlot({ x: 0, y: 0 }, 0, { lateral: 1, forward: 2 }, -1), /nonnegative/);
});
