import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { manassasInfantryPose, preloadManassasInfantry } from '../src/battle/manassasInfantryArt.js';

const directory = new URL('../public/images/units/manassas-infantry-v1/', import.meta.url);
const sides = ['union', 'confederate'];
const bearings = [0, 1, 2, 6, 7];
const view = { visible: true, fallen: false, action: 'walk', direction: 0, frame: 0 };

function frameInfo(entry) {
  return {
    customPivot: true, customData: entry, realHeight: entry.sourceSize.h,
    pivotX: entry.pivot.x, pivotY: entry.pivot.y,
  };
}

function rig(data) {
  return {
    exists: key => Object.hasOwn(data, key),
    get: key => ({ has: frame => Object.hasOwn(data[key], frame), get: frame => data[key][frame] }),
  };
}

test('both Manassas atlases load from the build base URL', () => {
  const calls = [];
  preloadManassasInfantry({ atlas: (...args) => calls.push(args) }, './');
  assert.deepEqual(calls, sides.map(side => {
    const stem = `./images/units/manassas-infantry-v1/${side}`;
    return [`manassas-1861-${side}`, `${stem}.webp`, `${stem}.json`];
  }));
});

for (const side of sides) test(`${side} atlas anchors and selects every authored stride and pivot`, () => {
  const { frames, meta } = JSON.parse(readFileSync(new URL(`${side}.json`, directory), 'utf8'));
  const raster = readFileSync(new URL(`${side}.webp`, directory));
  assert.equal(raster.toString('ascii', 0, 4), 'RIFF');
  assert.equal(raster.toString('ascii', 8, 12), 'WEBP');
  const key = `manassas-1861-${side}`;
  const texture = rig({ [key]: Object.fromEntries(Object.entries(frames).map(([name, frame]) => [name, frameInfo(frame)])) });
  for (let direction = 0; direction < 8; direction++) {
    const bearing = [0, 1, 2, 1, 0, 7, 6, 7][direction];
    for (let phase = 0; phase < 4; phase++) {
      const pose = manassasInfantryPose(texture, side, { ...view, direction, frame: phase });
      assert.equal(pose.key, key);
      assert.equal(pose.frame, `march-${bearing}-${phase}`);
      assert.equal(pose.flip, direction >= 3 && direction <= 5);
      assert.deepEqual(pose.pivot, frames[pose.frame].pivot);
      assert.equal(pose.referenceHeight, frames[pose.frame].bodyHeight);
    }
    const turning = { ...view, direction, frame: 1, stationaryTurn: true };
    assert.equal(manassasInfantryPose(texture, side, turning).frame, `pivot-${bearing}`);
    assert.equal(manassasInfantryPose(texture, side, turning, { reducedMotion: true }).frame, `march-${bearing}-0`);
  }
  const expected = bearings.flatMap(bearing => [
    ...[0, 1, 2, 3].map(phase => `march-${bearing}-${phase}`), `pivot-${bearing}`,
  ]).sort();
  assert.deepEqual(Object.keys(frames).sort(), expected);
  const rectangles = new Set();
  for (const entry of Object.values(frames)) {
    const { x, y, w, h } = entry.frame;
    assert.ok([x,y,w,h].every(Number.isInteger) && x >= 0 && y >= 0 && w > 0 && h > 0);
    assert.ok(x + w <= meta.size.w && y + h <= meta.size.h);
    assert.ok(entry.bodyHeight > 40 && entry.bodyHeight <= entry.sourceSize.h);
    assert.ok(entry.pivot.x > .1 && entry.pivot.x < .9 && entry.pivot.y > .65 && entry.pivot.y < 1);
    assert.equal(entry.support.y, entry.pivot.y);
    assert.ok(entry.support.x > 0 && entry.support.x < 1);
    rectangles.add(`${x}:${y}`);
  }
  assert.equal(rectangles.size, expected.length);
});

test('invalid or missing frames preserve the accepted pose and pivot falls back to stride', () => {
  const key = 'manassas-1861-union';
  const frame = frameInfo({ bodyHeight: 100, pivot: { x: .5, y: .85 }, sourceSize: { h: 120 } });
  const texture = rig({ [key]: { 'march-0-1': frame, 'pivot-0': { ...frame, customPivot: false } } });
  const turning = { ...view, frame: 1, stationaryTurn: true };
  assert.equal(manassasInfantryPose(texture, 'union', turning).frame, 'march-0-1');
  assert.equal(manassasInfantryPose(texture, 'confederate', turning), null);
  assert.equal(manassasInfantryPose(texture, 'union', { ...view, frame: 3 }), null);
  for (const action of ['idle', 'route', 'fire', 'reload', 'fall', 'melee']) {
    assert.equal(manassasInfantryPose(texture, 'union', { ...turning, action }), null);
  }
  assert.equal(manassasInfantryPose(texture, 'union', turning, { resolving: true }), null);
  assert.equal(manassasInfantryPose(texture, 'union', { ...turning, visible: false }), null);
});
