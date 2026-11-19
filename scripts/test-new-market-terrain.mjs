import assert from 'node:assert/strict';
import test from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { battleLocations } from '../src/battle/battleLocations.js';
import { BUSHONG_HOUSE, newMarketPikeX } from '../src/battle/newMarketArt.js';
import { drawNewMarketTerrain, newMarketElevation, newMarketRiverBanks, newMarketTerrainPlan, newMarketTrees } from '../src/battle/newMarketTerrain.js';

const state = { rulesVersion: 2, battleRulesVersion: 18 };
const battle = (id = 'new_market', choice = 'option_a') => new CivilWarBattleEngine(id, state, choice);

test('New Market landmark cues follow the north-up game terrain in both missions', () => {
  for (const choice of ['option_a', 'option_b']) {
    const engine = battle('new_market', choice);
    const plan = newMarketTerrainPlan(engine);
    const { hill, mud, orchard, road, reserve, river } = plan;
    assert.ok(BUSHONG_HOUSE.x > orchard.left && BUSHONG_HOUSE.x < orchard.right);
    assert.ok(BUSHONG_HOUSE.y > orchard.top && BUSHONG_HOUSE.y < orchard.bottom);
    assert.ok(river.right < hill.left && hill.top < mud.top && mud.bottom < BUSHONG_HOUSE.y);
    assert.ok(reserve.top > BUSHONG_HOUSE.y && BUSHONG_HOUSE.x < road.left);
    const locations = battleLocations(engine.snapshot());
    const byId = id => locations.find(site => site.id === id);
    assert.equal(byId('Landmark:bushong-house').source, BUSHONG_HOUSE.source);
    assert.equal(byId('Landmark:bushong-house').x, BUSHONG_HOUSE.x);
    assert.match(byId('Terrain:field-of-lost-shoes').note, /freshly plowed soil/);
    assert.match(byId('Terrain:bushong-orchard').note, /rail fence/);
    const pike = byId('Terrain:valley-pike');
    assert.equal(pike.x, newMarketPikeX(road, pike.y));
    for (let y = 0; y <= 900; y += 5) {
      const { west, east } = newMarketRiverBanks(river, y);
      assert.ok(river.left < west && west < east && east < river.right);
      const roadX = newMarketPikeX(road, y);
      assert.ok(road.left < roadX - 24.5 && roadX + 24.5 < road.right);
    }
  }
  assert.equal(newMarketTerrainPlan(battle('gaines_mill')), null);
  assert.ok(!battleLocations(battle('gaines_mill').snapshot()).some(site => site.id === 'Landmark:bushong-house'));
});

test('New Market relief separates the hills from the muddy swale and keeps trees out of the road and yard', () => {
  const plan = newMarketTerrainPlan(battle());
  const low = newMarketElevation(plan, 624, 337);
  assert.ok(newMarketElevation(plan, 624, 165) - low > 34);
  assert.ok(newMarketElevation(plan, 838, 622) - low > 32);
  assert.ok(newMarketElevation(plan, 259, 435) - newMarketElevation(plan, 70, 435) > 18);
  const seed = 1062;
  const trees = newMarketTrees(plan, seed);
  assert.deepEqual(trees, newMarketTrees(plan, seed));
  assert.ok(trees.filter(tree => tree.orchard).length >= 14);
  assert.ok(trees.filter(tree => !tree.orchard).length >= 75);
  for (const tree of trees) {
    assert.ok(tree.x + tree.size / 2 < plan.road.left);
    if (!tree.orchard) {
      assert.ok(tree.x - tree.size / 2 > newMarketRiverBanks(plan.river, tree.y).east);
    } else {
      assert.ok(Math.abs(tree.x - BUSHONG_HOUSE.x) >= BUSHONG_HOUSE.width / 2 + tree.size * .52
        || Math.abs(tree.y - BUSHONG_HOUSE.y) >= BUSHONG_HOUSE.height / 2 + tree.size * .35);
    }
  }
});

test('New Market bakes soil, furrows, stone road and river without modifying the field engine', () => {
  const engine = battle();
  const before = engine.checkpoint();
  const plan = newMarketTerrainPlan(engine);
  const { width, height } = plan.world;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([123, 131, 81, 181], i);
  const strokes = new Set();
  const fills = new Set();
  let reads = 0;
  const ctx = {
    getImageData: () => { reads++; return { data }; },
    putImageData: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} }),
  };
  for (const method of ['save', 'restore', 'drawImage', 'translate', 'rotate', 'scale', 'rect', 'clip',
    'beginPath', 'closePath', 'moveTo', 'lineTo', 'quadraticCurveTo', 'ellipse', 'fill', 'stroke', 'fillRect']) {
    ctx[method] = (...args) => {
      assert.ok(args.every(value => typeof value !== 'number' || Number.isFinite(value)), `finite ${method} geometry`);
      if (method === 'stroke') strokes.add(ctx.strokeStyle);
      if (method === 'fill') fills.add(ctx.fillStyle);
    };
  }
  const image = {};
  const frame = { x: 0, y: 0, w: 143, h: 138 };
  const frames = Object.fromEntries(['oak', 'poplar', 'cedar', 'scrub'].map(species => [species, frame]));
  const scene = { cache: { json: { get: () => frames } }, textures: { get: () => ({ getSourceImage: () => image }) } };
  drawNewMarketTerrain(scene, ctx, image, plan, 1062);
  assert.equal(reads, 1);
  assert.ok(strokes.has('rgba(55,39,28,.44)'));
  assert.ok(strokes.has('#a9a087'));
  assert.ok(fills.has('#425b5d'));
  assert.ok(fills.has('rgba(27,41,30,.37)'));
  const pixel = (x, y) => data.slice((y * width + x) * 4, (y * width + x) * 4 + 4);
  const field = pixel(630, 337);
  const pasture = pixel(630, 560);
  assert.ok(field[0] > field[1] && pasture[0] < pasture[1]);
  assert.ok(data.every((value, i) => i % 4 !== 3 || value === 181));
  assert.deepEqual(engine.checkpoint(), before);
});
