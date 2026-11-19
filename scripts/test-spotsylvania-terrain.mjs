import assert from 'node:assert/strict';
import test from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { battleLocations } from '../src/battle/battleLocations.js';
import { MCCOULL_HOUSE } from '../src/battle/spotsylvaniaArt.js';
import { drawSpotsylvaniaTerrain, spotsylvaniaElevation, spotsylvaniaLaneX, spotsylvaniaSalientShape,
  spotsylvaniaTerrainPlan, spotsylvaniaTrees, spotsylvaniaWetness } from '../src/battle/spotsylvaniaTerrain.js';

const state = { rulesVersion: 2, battleRulesVersion: 18 };
const battle = (choice = 'option_a', id = 'spotsylvania') => new CivilWarBattleEngine(id, state, choice);

test('Spotsylvania locators align with the angle, interior line and period farmhouse', () => {
  for (const choice of ['option_a', 'option_b']) {
    const engine = battle(choice);
    const plan = spotsylvaniaTerrainPlan(engine);
    const sites = battleLocations(engine.snapshot());
    const find = id => sites.find(site => site.id === id);
    const house = find('Landmark:mccoull-house');
    assert.deepEqual([house.x, house.y], [MCCOULL_HOUSE.x, MCCOULL_HOUSE.y]);
    assert.match(house.note, /family sheltered in the cellar/);
    assert.match(house.source, /nps.gov\/places\/mccoull-house-site/);
    const angle = find('Terrain:bloody-angle');
    assert.ok(spotsylvaniaSalientShape(plan).western.some(([x, y]) => x === angle.x && y === angle.y));
    assert.equal(angle.focusLabelOffsetX, 126);
    assert.match(angle.note, /west face of the Mule Shoe/);
    assert.ok(find('Terrain:rain-soaked-fields').x < angle.x);
    assert.ok(find('Sector:right').y < angle.y && angle.y < house.y);
    assert.ok(house.y < find('Sector:center').y && find('Sector:center').y < find('Terrain:harrison-farm-lane').y);
    assert.ok(sites.filter(site => site.kind === 'Exit').every(site => site.y > find('Sector:center').y));
  }
  const previous = battle('option_a', 'missionary_ridge');
  assert.equal(spotsylvaniaTerrainPlan(previous), null);
  assert.ok(!battleLocations(previous.snapshot()).some(site => site.id === 'Landmark:mccoull-house'));
});

test('the terrain traces an open salient, rain-soaked field and shorter line with an unobstructed farm lane', () => {
  const plan = spotsylvaniaTerrainPlan(battle());
  const shape = spotsylvaniaSalientShape(plan);
  assert.deepEqual(shape.western.at(-1), shape.apex[0]);
  assert.deepEqual(shape.apex.at(-1), shape.eastern[0]);
  const [[leftBank], [rightBank]] = [shape.shorterWest.at(-1), shape.shorterEast[0]];
  const lane = spotsylvaniaLaneX(plan.lane, (plan.interior.top + plan.interior.bottom) / 2);
  assert.ok(leftBank < lane - 20 && rightBank > lane + 20);
  assert.ok(spotsylvaniaWetness(plan, 455, 350) > .7);
  assert.equal(spotsylvaniaWetness(plan, MCCOULL_HOUSE.x, MCCOULL_HOUSE.y), 0);
  assert.ok(spotsylvaniaElevation(plan, 790, 630) - spotsylvaniaElevation(plan, 790, 548) > 22);
  const trees = spotsylvaniaTrees(plan, 1864);
  assert.deepEqual(trees, spotsylvaniaTrees(plan, 1864));
  assert.ok(trees.length > 120);
  for (const tree of trees) {
    assert.ok(spotsylvaniaWetness(plan, tree.x, tree.y) <= .06);
    if (tree.y > plan.lane.top - tree.size) {
      assert.ok(Math.abs(tree.x - spotsylvaniaLaneX(plan.lane, tree.y)) >= 21 + tree.size / 2);
    }
  }
});

test('the wet field and timber-reinforced earthworks are baked without changing the game state', () => {
  const engine = battle('option_b');
  const baseline = engine.checkpoint();
  const plan = spotsylvaniaTerrainPlan(engine);
  const { width, height } = plan.world;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([119, 131, 82, 173], i);
  const strokes = new Set();
  const fills = new Set();
  let reads = 0, writes = 0;
  const ctx = {
    getImageData: () => { reads++; return { data }; },
    putImageData: () => { writes++; },
    createRadialGradient: () => ({ addColorStop: () => {} }),
  };
  for (const method of ['drawImage', 'save', 'restore', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'fillRect', 'ellipse', 'fill', 'translate', 'scale']) {
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
  drawSpotsylvaniaTerrain(scene, ctx, image, plan, 1864);
  assert.equal(reads, 1);
  assert.equal(writes, 1);
  assert.ok(strokes.has('#332b25'), 'rain-darkened works');
  assert.ok(strokes.has('#8f7558'), 'wet split logs');
  assert.ok(strokes.has('rgba(153,128,97,.53)'), 'scuffed farm lane');
  assert.ok(fills.has('rgba(90,103,111,.46)'), 'small areas of standing water');
  assert.ok(data.every((value, index) => index % 4 !== 3 || value === 173));
  const green = (x, y) => data[(y * width + x) * 4 + 1];
  assert.ok(green(805, 460) - green(455, 350) > 27);
  assert.deepEqual(engine.checkpoint(), baseline);
});
