import assert from 'node:assert/strict';
import test from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { battleLocations } from '../src/battle/battleLocations.js';
import { HILLSMAN_HOUSE, sailorsCreekHalfWidth, sailorsCreekY, sailorsRoadY } from '../src/battle/sailorsCreekArt.js';
import { drawSailorsTerrain, sailorsElevation, sailorsTerrainPlan, sailorsTrees, sailorsWetness } from '../src/battle/sailorsCreekTerrain.js';

const state = { rulesVersion: 2, battleRulesVersion: 18 };
const battle = (choice = 'option_a', id = 'sailors_creek') => new CivilWarBattleEngine(id, state, choice);

test('Sailor’s Creek locators place the hospital on the historic north bank and separate it from the fictional aid staging', () => {
  for (const choice of ['option_a', 'option_b']) {
    const engine = battle(choice);
    const plan = sailorsTerrainPlan(engine);
    assert.ok(plan);
    const sites = battleLocations(engine.snapshot());
    const find = id => sites.find(site => site.id === id);
    const house = find('Landmark:hillsman-house');
    const water = find('Terrain:little-sailors-creek');
    const heights = find('Terrain:south-bank-heights');
    const road = find('Terrain:west-road');
    assert.deepEqual([house.x, house.y], [HILLSMAN_HOUSE.x, HILLSMAN_HOUSE.y]);
    assert.match(house.note, /field hospital.*both armies/);
    assert.match(house.source, /dcr\.virginia\.gov\/state-parks\/sailors-creek/);
    assert.ok(house.y + house.height / 2 < plan.floodplain.top);
    assert.ok(heights.y >= plan.heights.top && heights.y <= plan.heights.bottom);
    assert.equal(water.y, sailorsCreekY(plan.creek, water.x));
    assert.equal(road.y, sailorsRoadY(plan.road, road.x));
    assert.ok(sites.some(site => site.kind === 'Exit' && Math.abs(site.y - sailorsRoadY(plan.road, site.x)) < 8));
    assert.ok(!sites.some(site => site.kind === 'Objective' && site.x === house.x && site.y === house.y));
  }
  const previous = battle('option_a', 'vicksburg');
  assert.equal(sailorsTerrainPlan(previous), null);
  assert.ok(!battleLocations(previous.snapshot()).some(site => site.id === 'Landmark:hillsman-house'));
});

test('the wet bottom follows the creek below the south-bank ridge and canopy stays clear of reads', () => {
  const plan = sailorsTerrainPlan(battle());
  const { creek, heights, floodplain, road } = plan;
  for (let x = 0; x <= plan.world.width; x += 10) {
    const y = sailorsCreekY(creek, x);
    assert.ok(y >= creek.top && y <= creek.bottom);
    assert.ok(y - sailorsCreekHalfWidth(x) >= floodplain.top);
    assert.ok(y + sailorsCreekHalfWidth(x) <= floodplain.bottom);
  }
  const creekY = sailorsCreekY(creek, 800);
  assert.ok(sailorsElevation(plan, 800, heights.bottom - 56) - sailorsElevation(plan, 800, creekY) > 80);
  assert.ok(sailorsWetness(plan, 800, creekY - 22) > .43);
  assert.ok(sailorsWetness(plan, 800, creekY - 75) < .15);
  assert.ok(sailorsWetness(plan, HILLSMAN_HOUSE.x, HILLSMAN_HOUSE.y) < .04);
  const trees = sailorsTrees(plan, 1865);
  assert.ok(trees.length > 120);
  assert.deepEqual(trees, sailorsTrees(plan, 1865));
  for (const tree of trees) {
    assert.ok(Math.abs(tree.y - sailorsCreekY(creek, tree.x)) >= 26 + tree.size / 2);
    if (tree.x <= road.right + tree.size / 2) {
      assert.ok(Math.abs(tree.y - sailorsRoadY(road, tree.x)) >= 17 + tree.size / 2);
    }
    assert.ok(Math.hypot((tree.x - HILLSMAN_HOUSE.x) * .72, tree.y - HILLSMAN_HOUSE.y) >= 79 + tree.size / 2);
  }
});

test('the floodplain, creek banks and road bake once without altering the combat checkpoint', () => {
  const engine = battle('option_b');
  const checkpoint = engine.checkpoint();
  const plan = sailorsTerrainPlan(engine);
  const { width, height } = plan.world;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([119, 131, 82, 173], i);
  const fills = new Set();
  const strokes = new Set();
  let reads = 0, writes = 0;
  const ctx = {
    getImageData: () => { reads++; return { data }; },
    putImageData: () => { writes++; },
    createRadialGradient: () => ({ addColorStop: () => {} }),
  };
  for (const method of ['drawImage', 'save', 'restore', 'beginPath', 'moveTo', 'lineTo', 'stroke',
    'fillRect', 'ellipse', 'fill', 'translate', 'scale']) {
    ctx[method] = (...args) => {
      assert.ok(args.every(arg => typeof arg !== 'number' || Number.isFinite(arg)), `finite ${method} geometry`);
      if (method === 'stroke') strokes.add(ctx.strokeStyle);
      if (method === 'fill') fills.add(ctx.fillStyle);
    };
  }
  const image = {};
  const frame = { x: 0, y: 0, w: 120, h: 135 };
  const frames = Object.fromEntries(['oak', 'poplar', 'cedar'].map(species => [species, frame]));
  const scene = { cache: { json: { get: () => frames } }, textures: { get: () => ({ getSourceImage: () => image }) } };
  drawSailorsTerrain(scene, ctx, image, plan, 1865);
  assert.equal(reads, 1);
  assert.equal(writes, 1);
  assert.ok(fills.has('#3c4f43a3'), 'standing water north of the stream');
  assert.ok(strokes.has('#c1cbb038'), 'light on the moving surface');
  const waterY = Math.round(sailorsCreekY(plan.creek, 800));
  const green = y => data[(y * width + 800) * 4 + 1];
  assert.ok(green(waterY) + 15 < green(waterY - 40), 'dark channel separates from the damp floodplain');
  assert.ok(strokes.has('#5e5143ad'), 'visible wheel ruts');
  assert.ok(data.every((value, index) => index % 4 !== 3 || value === 173));
  assert.deepEqual(engine.checkpoint(), checkpoint);
});
