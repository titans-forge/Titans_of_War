import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../public/images/units/directional-melee-v1/', import.meta.url);
const hashes = {
  union: '8b61f2e60526613ae5bcdf579b23b0804e14213b53911894a637017c16798972',
  confederate: 'af41c5980adb2e2af1fa6437df561c4ddb8132049deb000bcc00b52eeaa69415',
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
  assert.deepEqual(atlas.meta.size, { w: 2048, h: 320 });
  assert.equal(Object.keys(atlas.frames).length, 32);
  assert.deepEqual(atlas.meta.directionOrder, ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']);
  const rectangles = new Set();
  for (const action of ['melee']) {
    for (let direction = 0; direction < 8; direction++) {
      for (let index = 0; index < 4; index++) {
        const frame = atlas.frames[`${action}-${direction}-${index}`];
        assert.ok(frame, `Missing ${side} ${action}-${direction}-${index}`);
        assert.equal(frame.trimmed, false);
        assert.equal(frame.rotated, false);
        assert.deepEqual(frame.sourceSize, { w: 128, h: 160 });
        assert.deepEqual(frame.pivot, { x: 0.5, y: 0.8 });
        const { x, y, w, h } = frame.frame;
        assert.ok(x >= 0 && y >= 0 && x + w <= 2048 && y + h <= 320);
        assert.equal(w, 128); assert.equal(h, 160);
        rectangles.add(`${x}:${y}`);
      }
    }
  }
  assert.equal(rectangles.size, 32, 'Frames must not alias the same atlas cell');
}
assert.ok(bytes < 400_000, 'Infantry textures must stay within the two-megabyte budget');
console.log(`Infantry atlases passed: 64 frames, verified pixels/anchors/directions, ${bytes} image bytes.`);
