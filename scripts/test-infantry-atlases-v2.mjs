import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../public/images/units/directional-v2/', import.meta.url);
const hashes = {
  union: '62d68209464e6d7efa6481d68fedcdf098d2e289d6bc9e5b24aacf708624b294',
  confederate: '3e7c7c4ca3bab3a6c5663365500bf1e7d9a4181759f421b42e0c7eecee2e2840',
};
const expectedFiles = Object.keys(hashes).flatMap((side) => [`${side}-infantry.json`, `${side}-infantry.webp`]).sort();
assert.deepEqual(readdirSync(root).sort(), expectedFiles, 'Only runtime atlas files belong in the public directory');
let bytes = 0;
for (const [side, hash] of Object.entries(hashes)) {
  const image = readFileSync(new URL(`${side}-infantry.webp`, root));
  bytes += image.length;
  assert.equal(image.toString('ascii', 0, 4), 'RIFF');
  assert.equal(image.toString('ascii', 8, 12), 'WEBP');
  assert.equal(createHash('sha256').update(image).digest('hex'), hash, `${side} must match the inspected render`);
  const atlas = JSON.parse(readFileSync(new URL(`${side}-infantry.json`, root), 'utf8'));
  assert.deepEqual(atlas.meta.origin, { x: 0.5, y: 0.8 });
  assert.deepEqual(atlas.meta.size, { w: 2048, h: 1920 });
  assert.equal(Object.keys(atlas.frames).length, 192);
  assert.deepEqual(atlas.meta.directionOrder, ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']);
  const rectangles = new Set();
  for (const action of ['idle', 'walk', 'fire', 'reload', 'route', 'fall']) {
    for (let direction = 0; direction < 8; direction++) {
      for (let index = 0; index < 4; index++) {
        const frame = atlas.frames[`${action}-${direction}-${index}`];
        assert.ok(frame, `Missing ${side} ${action}-${direction}-${index}`);
        assert.equal(frame.trimmed, false);
        assert.equal(frame.rotated, false);
        assert.deepEqual(frame.sourceSize, { w: 128, h: 160 });
        assert.deepEqual(frame.pivot, { x: 0.5, y: 0.8 });
        const { x, y, w, h } = frame.frame;
        assert.ok(x >= 0 && y >= 0 && x + w <= 2048 && y + h <= 1920);
        assert.equal(w, 128); assert.equal(h, 160);
        rectangles.add(`${x}:${y}`);
      }
    }
  }
  assert.equal(rectangles.size, 192, 'Frames must not alias the same atlas cell');
}
assert.ok(bytes < 2_000_000, 'Infantry textures must stay within the two-megabyte budget');
console.log(`Infantry atlases passed: 384 frames, verified pixels/anchors/directions, ${bytes} image bytes.`);
