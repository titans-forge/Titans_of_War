import assert from 'node:assert/strict';
import test from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { battleLocations } from '../src/battle/battleLocations.js';
import { INNIS_HOUSE } from '../src/battle/fredericksburgArt.js';
import {
  drawFredericksburgTerrain, fredericksburgBanks, fredericksburgPontoon, fredericksburgTerrainPlan,
  fredericksburgTownBlocks, fredericksburgWinterTrees,
} from '../src/battle/fredericksburgTerrain.js';

const state = { rulesVersion: 2, battleRulesVersion: 18 };
const makeBattle = (id = 'fredericksburg') => new CivilWarBattleEngine(id, state, 'option_a');

test('Fredericksburg terrain, pontoon and locators follow the authored field', () => {
  const engine = makeBattle();
  const plan = fredericksburgTerrainPlan(engine);
  const bridge = fredericksburgPontoon(plan);
  const banks = fredericksburgBanks(plan.river, bridge.y);
  assert.ok(bridge.start >= plan.crossing.left && bridge.end <= plan.crossing.right);
  assert.ok(bridge.start < banks.west && bridge.end > banks.east);
  assert.ok(bridge.y > plan.crossing.top && bridge.y < plan.crossing.bottom);
  const location = id => battleLocations(engine.snapshot()).find(site => site.id === id);
  assert.equal(location('Landmark:innis-house').source, INNIS_HOUSE.source);
  assert.ok(INNIS_HOUSE.x > plan.wall.right);
  assert.ok(location('Terrain:sunken-road-wall').x < INNIS_HOUSE.x);
  assert.ok(location('Terrain:maryes-heights').x < plan.wall.left);
  assert.ok(location('Terrain:rappahannock-river').x > plan.town.right);
  assert.ok(location('Terrain:prospect-hill').y > plan.wall.bottom);
  assert.equal(fredericksburgTerrainPlan(makeBattle('second_manassas')), null);
});

test('Fredericksburg keeps the town streets, winter woods and southern gap stable', () => {
  const plan = fredericksburgTerrainPlan(makeBattle());
  const buildings = fredericksburgTownBlocks(plan.town, 1812);
  assert.deepEqual(buildings, fredericksburgTownBlocks(plan.town, 1812));
  assert.notDeepEqual(buildings, fredericksburgTownBlocks(plan.town, 1813));
  assert.ok(buildings.length >= 12 && buildings.length <= 20);
  for (const house of buildings) {
    assert.ok(house.x > plan.town.left && house.x + house.w < plan.town.right);
    assert.ok(house.y > plan.town.top && house.y + house.h < plan.crossing.top);
  }
  const trees = fredericksburgWinterTrees(plan, 1812);
  assert.deepEqual(trees, fredericksburgWinterTrees(plan, 1812));
  assert.ok(trees.length > 40);
  assert.ok(trees.filter(tree => tree.bare).length > trees.length * .7);
  for (const { x, y } of trees) assert.ok(Math.hypot((x - 663) / 79, (y - 650) / 114) >= 1);
});

test('Fredericksburg paints cold relief, river and stone without mutating the engine', () => {
  const engine = makeBattle();
  const before = engine.checkpoint();
  const plan = fredericksburgTerrainPlan(engine);
  const { width, height } = plan.world;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([123, 127, 66, 191], i);
  const drawnRects = [];
  const gradient = { addColorStop: () => {} };
  const ctx = {
    getImageData: () => ({ data }), putImageData: () => {},
    createLinearGradient: () => gradient,
  };
  const methods = ['save', 'restore', 'translate', 'rotate', 'scale', 'drawImage', 'ellipse', 'beginPath', 'rect',
    'moveTo', 'lineTo', 'closePath', 'clip', 'stroke', 'fill', 'fillRect'];
  for (const method of methods) ctx[method] = (...args) => {
    assert.ok(args.every(value => typeof value !== 'number' || Number.isFinite(value)), `finite ${method} geometry`);
    if (method === 'fillRect') drawnRects.push({ args, color: ctx.fillStyle });
  };
  const image = {};
  const frames = { cedar: { x: 0, y: 0, w: 143, h: 138 } };
  const scene = { cache: { json: { get: () => frames } }, textures: { get: () => ({ getSourceImage: () => image }) } };
  drawFredericksburgTerrain(scene, ctx, image, plan, 1812);
  const pix = (x, y) => data.slice((y * width + x) * 4, (y * width + x) * 4 + 4);
  assert.notDeepEqual(pix(489, 251), pix(622, 281));
  assert.ok(data.every((value, i) => i % 4 !== 3 || value === 191));
  assert.ok(drawnRects.some(item => item.color === '#6c5946' && item.args[2] > 175), 'draws the pontoon’s wood deck');
  assert.ok(drawnRects.some(item => item.args[0] > plan.wall.left && item.args[0] < plan.wall.right && /^rgb\(/.test(item.color)),
    'draws wall blocks within the road footprint');
  assert.deepEqual(engine.checkpoint(), before);
});
