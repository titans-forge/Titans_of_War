import assert from 'node:assert/strict';
import test from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { battleLocations } from '../src/battle/battleLocations.js';
import { BURNT_QUARTER } from '../src/battle/fiveForksArt.js';
import { drawFiveForksTerrain, fiveForksTerrainPlan, fiveForksTrees } from '../src/battle/fiveForksTerrain.js';

const state = { rulesVersion: 2, battleRulesVersion: 18 };
const battle = () => new CivilWarBattleEngine('five_forks', state, 'option_a');

test('Five Forks places its historical road spokes on the authored crossroads and north exit axis', () => {
  const engine = battle();
  const plan = fiveForksTerrainPlan(engine);
  const [whiteOak, ford, dinwiddie, scotts] = plan.roads;
  const [eastWorks, bend] = plan.works[1].slice(-2);
  assert.deepEqual(whiteOak.path[3], plan.junction);
  assert.deepEqual(ford.path.at(-1), plan.junction);
  assert.deepEqual(dinwiddie.path[0], plan.junction);
  assert.deepEqual(scotts.path[0], plan.junction);
  assert.ok(dinwiddie.path.at(-1).x > plan.junction.x && scotts.path.at(-1).x < plan.junction.x);
  assert.ok(bend.y < eastWorks.y && Math.abs(bend.x - eastWorks.x) < 14);
  assert.equal(fiveForksTerrainPlan(new CivilWarBattleEngine('antietam', state, 'option_a')), null);

  const sites = battleLocations(engine.snapshot());
  const fordExit = sites.find(site => site.id === 'Exit:1');
  assert.equal(fordExit.x, plan.junction.x);
  assert.ok(fordExit.y < 30);
  assert.equal(sites.find(site => site.id === 'Sector:right').name, 'The Angle');
  const house = sites.find(site => site.id === 'Landmark:burnt-quarter');
  assert.equal(house.source, BURNT_QUARTER.source);
  assert.equal(house.scenic, true);
  assert.ok(house.x < plan.junction.x && house.y > plan.junction.y);
  assert.ok(engine.fieldBattle.landmarks.every(site => site.id !== BURNT_QUARTER.id));
});

test('Five Forks woodland is stable for a given seed and leaves room for roads, works and farm art', () => {
  const plan = fiveForksTerrainPlan(battle());
  const trees = fiveForksTrees(plan, 1077);
  assert.deepEqual(fiveForksTrees(plan, 1077), trees);
  assert.notDeepEqual(fiveForksTrees(plan, 1078), trees);
  assert.ok(trees.length > 200 && trees.length < 600);
  assert.ok(trees.some(tree => tree.variant === 'cedar') && trees.some(tree => tree.variant === 'oak'));
  assert.ok(trees.every(({ x, y }) => x > plan.woods.left && x < plan.woods.right && y > plan.woods.top && y < plan.woods.bottom));
  assert.ok(trees.every(({ x, y }) => Math.abs(x - plan.junction.x) > 24 || y > plan.junction.y + 30));
  assert.ok(trees.every(({ x, y }) => Math.abs(x - BURNT_QUARTER.x) > BURNT_QUARTER.width / 2
    || Math.abs(y - BURNT_QUARTER.y) > BURNT_QUARTER.height / 2));
});

test('Five Forks paints finite canvas geometry without changing battle terrain or checkpoint data', () => {
  const engine = battle();
  const before = engine.checkpoint();
  const plan = fiveForksTerrainPlan(engine);
  const { width, height } = plan.world;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([130, 118, 70, 177], i);
  const image = {};
  const context = { getImageData: () => ({ data }), putImageData: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} }) };
  let calls = 0;
  for (const method of ['save', 'restore', 'translate', 'scale', 'drawImage', 'ellipse', 'beginPath',
    'moveTo', 'lineTo', 'stroke', 'fillRect', 'fill']) {
    context[method] = (...args) => {
      assert.ok(args.every(arg => typeof arg !== 'number' || Number.isFinite(arg)), `${method} geometry must be finite`);
      calls++;
    };
  }
  const frames = Object.fromEntries(['cedar', 'oak', 'poplar', 'scrub'].map(name => [name, { x: 0, y: 0, w: 140, h: 135 }]));
  const scene = { cache: { json: { get: () => frames } }, textures: { get: () => ({ getSourceImage: () => image }) } };
  drawFiveForksTerrain(scene, context, image, plan, 1077);
  assert.ok(calls > 3000);
  assert.ok(data.every((channel, i) => i % 4 !== 3 || channel === 177));
  assert.notEqual(data[0], data[(430 * width + 900) * 4]);
  assert.deepEqual(engine.checkpoint(), before);
});
