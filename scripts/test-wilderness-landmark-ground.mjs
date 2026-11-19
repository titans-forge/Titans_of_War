import assert from 'node:assert/strict';
import test from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import {
  drawWildernessLandmarkGround, drawWildernessWoodland, wildernessCrownBounds, wildernessCrowns, wildernessLandmarkGround, wildernessWoodlandWeight,
} from '../src/battle/wildernessLandmarkGround.js';

function canvasRecorder() {
  const calls = [];
  const ctx = {
    createRadialGradient() {
      return { addColorStop: (...args) => calls.push(['addColorStop', ...args]) };
    },
  };
  for (const method of ['save', 'restore', 'translate', 'scale', 'rotate', 'beginPath',
    'moveTo', 'lineTo', 'closePath', 'rect', 'clip', 'fill', 'fillRect', 'stroke']) {
    ctx[method] = (...args) => calls.push([method, ...args]);
  }
  return { calls, ctx };
}

test('Wilderness art follows the authored road and farm clearing without modifying terrain', () => {
  const engine = new CivilWarBattleEngine('wilderness', { rulesVersion: 2, battleRulesVersion: 18 }, 'option_a');
  const snapshot = engine.snapshot();
  const plan = wildernessLandmarkGround(engine);
  const roadPoint = plan.surroundings.lanes[0].at(-1);
  assert.equal(roadPoint.y, plan.mainRoad.value);
  const samples = [roadPoint, { x: 367, y: 513 }, { x: 550, y: 500 }];
  const before = samples.map(point => engine.fieldTerrain(point));
  const a = canvasRecorder();
  const b = canvasRecorder();
  drawWildernessLandmarkGround(a.ctx, plan, 1864);
  drawWildernessLandmarkGround(b.ctx, plan, 1864);
  assert.deepEqual(a.calls, b.calls);
  assert.equal(a.calls.filter(([method]) => method === 'save').length,
    a.calls.filter(([method]) => method === 'restore').length);
  const { left, right, top, bottom } = plan.clearing;
  const halfRoadWidth = (plan.route.bottom - plan.route.top) / 2;
  assert.ok(a.calls.some(call => call.join(',') === ['rect', left, top, right - left, bottom - top].join(',')));
  assert.ok(a.calls.some(call => call.join(',') === ['rect', 0, -halfRoadWidth, engine.world.width, halfRoadWidth * 2].join(',')));
  assert.deepEqual(samples.map(point => engine.fieldTerrain(point)), before);
  assert.deepEqual(engine.snapshot(), snapshot);
});

test('other fields and the Wilderness layout from before Tapp clearing have no upgrade plan', () => {
  const legacy = new CivilWarBattleEngine('wilderness', { rulesVersion: 2, battleRulesVersion: 10 }, 'option_a');
  const other = new CivilWarBattleEngine('chancellorsville', { rulesVersion: 2, battleRulesVersion: 18 }, 'option_a');
  assert.equal(wildernessLandmarkGround(legacy), null);
  assert.equal(wildernessLandmarkGround(other), null);
});

test('The Wilderness canopy clusters follow the woodland belt and leave the farm and both roads open', () => {
  const engine = new CivilWarBattleEngine('wilderness', { rulesVersion: 2, battleRulesVersion: 18 }, 'option_a');
  const plan = wildernessLandmarkGround(engine);
  assert.ok(wildernessWoodlandWeight(plan, 582, 453) > .4);
  for (const [x, y] of [[plan.house.x, plan.house.y], [83, 420], [510, plan.mainRoad.value], [910, 442]]) {
    assert.equal(wildernessWoodlandWeight(plan, x, y), 0);
  }
  const trees = wildernessCrowns(plan, 1864);
  assert.deepEqual(wildernessCrowns(plan, 1864), trees);
  assert.ok(trees.length > 120);
  assert.equal(new Set(trees.map(({ kind }) => kind)).size, 4);
  const treeWeights = trees.map(({ x, y }) => wildernessWoodlandWeight(plan, x, y));
  assert.ok(Math.max(...treeWeights) - Math.min(...treeWeights) > .32);
  for (const tree of trees) {
    const { left, right, top, bottom } = wildernessCrownBounds(tree);
    assert.ok(plan.roads.every(road => {
      const [start, end] = road.axis === 'x' ? [left, right] : [top, bottom];
      return end <= road.value - road.width || start >= road.value + road.width;
    }));
    assert.ok(right <= plan.clearing.left || left >= plan.clearing.right
      || bottom <= plan.clearing.top || top >= plan.clearing.bottom);
  }
});

test('The Wilderness woods bake floor tint and existing foliage without changing the combat checkpoint', () => {
  const engine = new CivilWarBattleEngine('wilderness', { rulesVersion: 2, battleRulesVersion: 18 }, 'option_a');
  const baseline = engine.checkpoint();
  const plan = wildernessLandmarkGround(engine);
  const { width, height } = plan;
  const { ctx, calls } = canvasRecorder();
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([119, 131, 82, 173], i);
  const ground = {}, atlas = {};
  ctx.drawImage = (...args) => calls.push(['drawImage', ...args]);
  ctx.getImageData = () => { calls.push(['read']); return { data }; };
  ctx.putImageData = () => calls.push(['write']);
  ctx.ellipse = (...args) => calls.push(['ellipse', ...args]);
  const frame = { x: 0, y: 0, w: 32, h: 32 };
  const frames = Object.fromEntries(['oak', 'poplar', 'cedar', 'scrub'].map(key => [key, frame]));
  const scene = { cache: { json: { get: () => frames } }, textures: { get: () => ({ getSourceImage: () => atlas }) } };

  drawWildernessWoodland(scene, ctx, ground, plan, 1864);
  assert.equal(calls.filter(([method]) => method === 'read').length, 1);
  assert.equal(calls.filter(([method]) => method === 'write').length, 1);
  assert.equal(calls.filter(([method, source]) => method === 'drawImage' && source === atlas).length,
    wildernessCrowns(plan, 1864).length);
  assert.ok(data.every((value, index) => index % 4 !== 3 || value === 173));
  const green = (x, y) => data[(y * width + x) * 4 + 1];
  assert.ok(green(581, 454) < 109);
  assert.equal(green(341, 521), 131);
  assert.equal(green(505, plan.mainRoad.value), 131);
  assert.deepEqual(engine.checkpoint(), baseline);
});
