import assert from 'node:assert/strict';
import test from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { battleLocations } from '../src/battle/battleLocations.js';
import { BRAGG_HEADQUARTERS } from '../src/battle/missionaryRidgeArt.js';
import { drawMissionaryRidgeTerrain, missionaryRidgeCrestX, missionaryRidgeElevation, missionaryRidgeRoadY,
  missionaryRidgeTerrainPlan, missionaryRidgeTrees } from '../src/battle/missionaryRidgeTerrain.js';

const state = { rulesVersion: 2, battleRulesVersion: 18 };
const battle = (choice = 'option_a', id = 'missionary_ridge') => new CivilWarBattleEngine(id, state, choice);

test('Chattanooga landmarks align with the ridge and eastward withdrawal in both field choices', () => {
  for (const choice of ['option_a', 'option_b']) {
    const engine = battle(choice);
    const plan = missionaryRidgeTerrainPlan(engine);
    const sites = battleLocations(engine.snapshot());
    const find = (id) => sites.find(site => site.id === id);
    const hq = find('Landmark:bragg-headquarters');
    assert.equal(hq.x, BRAGG_HEADQUARTERS.x);
    assert.equal(hq.y, BRAGG_HEADQUARTERS.y);
    assert.match(hq.note, /exact appearance is undocumented/);
    assert.match(hq.source, /irma.nps.gov/);
    assert.match(find('Terrain:orchard-knob').note, /Grant’s observation post/);
    assert.ok(find('Terrain:orchard-knob').x < find('Sector:left').x);
    assert.ok(find('Sector:left').x < find('Terrain:western-slope').x);
    assert.ok(find('Terrain:western-slope').x < find('Sector:center').x);
    assert.ok(find('Sector:center').x < find('Sector:right').x);
    assert.ok(find('Sector:right').x < find('Terrain:dalton-road').x);
    const exits = sites.filter(site => site.kind === 'Exit');
    assert.deepEqual(exits.map(({ x, y }) => [x, y]), [[1582, 520], [1582, 594], [1582, 676]]);
    assert.ok(exits.every(site => site.name.startsWith('Dalton approach')));
    assert.ok(Math.abs(missionaryRidgeRoadY(plan.road, exits[1].x) - exits[1].y) < 12);
  }
  assert.equal(missionaryRidgeTerrainPlan(battle('option_a', 'new_market')), null);
  assert.ok(!battleLocations(battle('option_a', 'new_market').snapshot()).some(site => site.id === 'Landmark:bragg-headquarters'));
});

test('relief goes up from the western valley, with an independent knob, clear works, and an open road', () => {
  const plan = missionaryRidgeTerrainPlan(battle());
  const meters = (x, y) => missionaryRidgeElevation(plan, x, y);
  const { crest, orchard, road, pits } = plan;
  const hillX = (orchard.left + orchard.right) / 2;
  const hillY = (orchard.top + orchard.bottom) / 2;
  assert.ok(meters(hillX, hillY) - meters(hillX + 180, hillY) > 23);
  for (let y = 210; y < 750; y += 47) {
    const spine = missionaryRidgeCrestX(plan, y);
    assert.ok(spine > crest.left + 12 && spine < crest.right - 12);
    assert.ok(meters(spine, y) - meters(pits.left, y) > 90);
    assert.ok(meters(spine, y) - meters(road.left + 150, y) > 75);
  }
  for (let x = road.left; x <= road.right; x += 7) {
    const lane = missionaryRidgeRoadY(road, x);
    assert.ok(lane - 17.5 > road.top && lane + 17.5 < road.bottom);
  }
  const trees = missionaryRidgeTrees(plan, 1569);
  assert.deepEqual(trees, missionaryRidgeTrees(plan, 1569));
  assert.ok(trees.length > 175);
  assert.ok(trees.filter(tree => tree.x > plan.crest.right).length > trees.length / 2);
  for (const tree of trees) {
    assert.ok(Math.abs(tree.x - missionaryRidgeCrestX(plan, tree.y)) >= 56);
    if (tree.x + tree.size / 2 > road.left) {
      assert.ok(Math.abs(tree.y - missionaryRidgeRoadY(road, tree.x)) >= 22 + tree.size / 2);
    }
  }
});

test('Missionary Ridge bakes a one-read texture with field-specific works and road without altering the battle', () => {
  const engine = battle('option_b');
  const before = engine.checkpoint();
  const plan = missionaryRidgeTerrainPlan(engine);
  const { width, height } = plan.world;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) data.set([117, 133, 72, 171], index);
  const styles = new Set();
  let reads = 0, writes = 0;
  const context = {
    getImageData: () => { reads++; return { data }; },
    putImageData: () => { writes++; },
    createRadialGradient: () => ({ addColorStop: () => {} }),
  };
  for (const method of ['drawImage', 'save', 'restore', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'fillRect', 'ellipse', 'fill', 'translate', 'scale']) {
    context[method] = (...args) => {
      assert.ok(args.every(arg => typeof arg !== 'number' || Number.isFinite(arg)), `finite ${method} geometry`);
      if (method === 'stroke') styles.add(context.strokeStyle);
    };
  }
  const source = {};
  const frame = { x: 0, y: 0, w: 143, h: 138 };
  const frames = Object.fromEntries(['oak', 'poplar', 'cedar'].map(species => [species, frame]));
  const scene = { cache: { json: { get: () => frames } }, textures: { get: () => ({ getSourceImage: () => source }) } };
  drawMissionaryRidgeTerrain(scene, context, source, plan, 1569);
  assert.equal(reads, 1);
  assert.equal(writes, 1);
  assert.ok(styles.has('#493c2c'), 'ridge trenches');
  assert.ok(styles.has('#43382a'), 'Orchard Knob works');
  assert.ok(styles.has('rgba(177,153,109,.52)'), 'eastern dirt track');
  assert.ok(data.every((value, index) => index % 4 !== 3 || value === 171));
  const pixel = (x, y) => data[(y * width + x) * 4];
  assert.ok(pixel(910, 375) - pixel(1100, 375) > 16);
  assert.deepEqual(engine.checkpoint(), before);
});
