import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { realisticInfantryPose, updateTravelDust } from '../src/battle/realisticUnitVisual.js';

const figure = Object.freeze({ id: 0, x: 100, y: 200, direction: 6, action: 'idle', frame: 0, scale: .82, alpha: 1, bodyOffsetX: 0, bodyOffsetY: 0, lean: 0 });
test('soldier identity is stable, varied within a rank, and presentation never moves simulation feet', () => {
  const before = JSON.stringify(figure), sizes = new Set(), stances = new Set(), tones = new Set();
  for (let id = 0; id < 32; id++) {
    const a = realisticInfantryPose('jackson', { ...figure, id }, 4);
    const b = realisticInfantryPose('jackson', { ...figure, id }, 5);
    assert.equal(a.width, b.width); assert.equal(a.height, b.height); assert.equal(a.tint, b.tint);
    assert.ok(a.width >= .94 && a.width <= 1.04 && a.height >= .95 && a.height <= 1.05);
    sizes.add(a.height); stances.add(a.frame); tones.add(a.tint);
  }
  assert.equal(sizes.size, 32); assert.equal(stances.size, 3); assert.equal(tones.size, 4);
  assert.equal(JSON.stringify(figure), before);
});
test('pause is deterministic and reduced motion freezes breathing and thrust', () => {
  for (const action of ['idle', 'melee', 'reload']) {
    const f = { ...figure, action };
    assert.deepEqual(realisticInfantryPose('a', f, 4), realisticInfantryPose('a', f, 4));
    assert.deepEqual(realisticInfantryPose('a', f, 4, true), realisticInfantryPose('a', f, 9, true));
    assert.deepEqual(realisticInfantryPose('a', f, 4, false, true), realisticInfantryPose('a', f, 9, false, true));
  }
});
test('travel dust requires displacement, pauses without emission, expires, and stays bounded', () => {
  const state = {};
  updateTravelDust(state, { x: 0, y: 0, time: 0, moving: false });
  assert.equal(updateTravelDust(state, { x: 0, y: 0, time: 1, moving: true }).length, 0);
  const atTwo = updateTravelDust(state, { x: 10, y: 0, time: 2, moving: true });
  assert.equal(atTwo.length, 1);
  for (let i = 0; i < 100; i++) assert.deepEqual(updateTravelDust(state, { x: 10, y: 0, time: 2, moving: true }), atTwo);
  for (let i = 1; i < 300; i++) {
    const puffs = updateTravelDust(state, { x: 10 + i, y: 0, time: 2 + i / 20, moving: true });
    assert.ok(puffs.length <= 12); assert.ok(puffs.every(p => p.alpha >= 0 && p.alpha <= .055));
  }
  assert.deepEqual(updateTravelDust(state, { x: 400, y: 0, time: 25, moving: false }), []);
  assert.deepEqual(updateTravelDust(state, { x: 410, y: 0, time: 26, moving: true, reducedMotion: true }), []);
});
test('every action and direction resolves to an inspected native RGBA frame with boot anchor', () => {
  const root = new URL('../public/images/units/realistic-v1/', import.meta.url);
  const atlases = {};
  for (const side of ['union', 'confederate']) for (const kind of ['infantry', 'crew', 'aim']) {
    const atlas = JSON.parse(readFileSync(new URL(`${side}-${kind}.json`, root)));
    atlases[`${side}-${kind}`] = atlas;
    const bytes = readFileSync(new URL(atlas.meta.image, root));
    assert.equal(bytes.readUInt32BE(16), atlas.meta.size.w); assert.equal(bytes.readUInt32BE(20), atlas.meta.size.h);
    assert.equal(bytes[25], 6, 'PNG is native RGBA');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), atlas.meta.sha256);
    for (const frame of Object.values(atlas.frames)) {
      const { x, y, w, h } = frame.frame;
      assert.ok(x >= 0 && y >= 0 && w > 30 && h > 150 && x + w <= atlas.meta.size.w && y + h <= atlas.meta.size.h);
      assert.ok(frame.pivot.x > .05 && frame.pivot.x < .95 && frame.pivot.y > .95 && frame.pivot.y < 1);
    }
  }
  for (const side of ['union', 'confederate']) for (const action of ['idle', 'walk', 'route', 'fire', 'reload', 'melee', 'fall']) for (let direction = 0; direction < 8; direction++) for (let frame = 0; frame < 4; frame++) {
    const pose = realisticInfantryPose('a', { ...figure, action, direction, frame, fallen: action === 'fall' }, 1);
    assert.ok(atlases[`${side}-${pose.axialAim ? 'aim' : 'infantry'}`].frames[pose.frame], `${side} ${action} ${direction} ${frame}`);
    if (action === 'fall') assert.ok(pose.angle >= 25 && pose.angle <= 82);
  }
});
