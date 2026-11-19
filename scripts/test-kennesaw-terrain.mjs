import assert from 'node:assert/strict';
import test from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { battleLocations } from '../src/battle/battleLocations.js';
import { KOLB_FARMHOUSE, kennesawWorksPath } from '../src/battle/kennesawArt.js';
import {
  drawKennesawTerrain, kennesawElevation, kennesawRoadX, kennesawTerrainPlan, kennesawTrees,
} from '../src/battle/kennesawTerrain.js';

const state = { rulesVersion: 2, battleRulesVersion: 18 };
const battle = (choice = 'option_a', id = 'kennesaw_mountain') => new CivilWarBattleEngine(id, state, choice);

test('both Kennesaw missions put locators on their named art and bound the farmhouse claim to June 22', () => {
  for (const choice of ['option_a', 'option_b']) {
    const engine = battle(choice);
    const plan = kennesawTerrainPlan(engine);
    assert.ok(plan, 'Kennesaw’s four authored zones produce a terrain plan');
    const sites = battleLocations(engine.snapshot());
    const find = id => sites.find(site => site.id === id);
    const house = find('Landmark:kolb-farmhouse');
    assert.deepEqual([house.x, house.y], [KOLB_FARMHOUSE.x, KOLB_FARMHOUSE.y]);
    assert.match(house.note, /June 22/);
    assert.match(house.note, /brings the two places closer/);
    assert.match(house.source, /nps.gov\/places\/kolb-farmhouse/);
    const angle = find('Terrain:dead-angle');
    assert.ok(kennesawWorksPath(plan).some(({ x, y }) => x === angle.x && y === angle.y));
    assert.match(angle.source, /nps.gov\/places\/the-dead-angle/);
    assert.ok(angle.focusLabelOffsetX < 0);
    const ravine = find('Terrain:wooded-ravine');
    assert.ok(ravine.x < angle.x && angle.y < house.y);
    const road = find('Terrain:southern-road');
    assert.equal(kennesawRoadX(plan.road, road.y), road.x);
    assert.ok(sites.some(site => site.kind === 'Exit' && Math.abs(site.x - kennesawRoadX(plan.road, site.y)) < 25));
  }
  const previous = battle('option_a', 'spotsylvania');
  assert.equal(kennesawTerrainPlan(previous), null);
  assert.ok(!battleLocations(previous.snapshot()).some(site => site.id === 'Landmark:kolb-farmhouse'));
});

test('Cheatham Hill rises out of the ravine and timber cover leaves the works, road and farmhouse readable', () => {
  const plan = kennesawTerrainPlan(battle());
  const [angle] = kennesawWorksPath(plan).slice(5);
  assert.ok(kennesawElevation(plan, angle.x + 129, angle.y) - kennesawElevation(plan, angle.x - 125, angle.y) > 33);
  assert.ok(kennesawElevation(plan, 580, 445) - kennesawElevation(plan, 427, 445) > 20);
  const trees = kennesawTrees(plan, 1864);
  assert.deepEqual(trees, kennesawTrees(plan, 1864));
  assert.ok(trees.length > 165);
  assert.ok(trees.filter(tree => tree.x > plan.ravine.left && tree.x < plan.ravine.right
    && tree.y > plan.ravine.top && tree.y < plan.ravine.bottom).length >= 15);
  for (const tree of trees) {
    assert.ok(Math.hypot((tree.x - KOLB_FARMHOUSE.x) * .8, tree.y - KOLB_FARMHOUSE.y) >= 96 + tree.size / 2);
    if (tree.y >= plan.road.top - 95) {
      assert.ok(Math.abs(tree.x - kennesawRoadX(plan.road, tree.y)) >= 17 + tree.size / 2);
    }
  }
});

test('Kennesaw relief and scenery bake once and preserve the gameplay checkpoint', () => {
  const engine = battle('option_b');
  const checkpoint = engine.checkpoint();
  const plan = kennesawTerrainPlan(engine);
  const { width, height } = plan.world;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([119, 131, 82, 173], i);
  const strokes = new Set();
  let reads = 0, writes = 0, trenchStamps = 0;
  const ctx = {
    getImageData: () => { reads++; return { data }; },
    putImageData: () => { writes++; },
    createRadialGradient: () => ({ addColorStop: () => {} }),
  };
  for (const method of ['drawImage', 'save', 'restore', 'beginPath', 'moveTo', 'lineTo', 'stroke',
    'fillRect', 'ellipse', 'fill', 'translate', 'scale', 'rotate']) {
    ctx[method] = (...args) => {
      assert.ok(args.every(arg => typeof arg !== 'number' || Number.isFinite(arg)), `finite ${method} geometry`);
      if (method === 'stroke') strokes.add(ctx.strokeStyle);
      if (method === 'drawImage' && args[3] === 84) trenchStamps++;
    };
  }
  const image = {};
  const frame = { x: 0, y: 0, w: 120, h: 135 };
  const frames = Object.fromEntries(['oak', 'poplar', 'cedar', 'trench'].map(species => [species, frame]));
  const scene = { cache: { json: { get: () => frames } }, textures: { get: () => ({ getSourceImage: () => image }) } };
  drawKennesawTerrain(scene, ctx, image, plan, 1864);
  assert.equal(reads, 1);
  assert.equal(writes, 1);
  assert.ok(strokes.has('#ab745290'), 'exposed earth at the works');
  assert.ok(strokes.has('#483526a0'), 'ditch beneath the works');
  assert.equal(trenchStamps, kennesawWorksPath(plan).length - 1, 'trench texture follows both sides of the angle');
  assert.ok(strokes.has('#71543867'), 'wheel ruts');
  assert.ok(data.every((value, index) => index % 4 !== 3 || value === 173));
  const green = (x, y) => data[(y * width + x) * 4 + 1];
  assert.ok(green(730, 435) - green(444, 445) > 18, 'lit slope is brighter than the ravine');
  assert.deepEqual(engine.checkpoint(), checkpoint);
});
