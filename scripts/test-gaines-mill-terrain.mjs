import assert from 'node:assert/strict';
import test from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { battleLocations } from '../src/battle/battleLocations.js';
import { gainesMillCreekBanks, WATT_HOUSE } from '../src/battle/gainesMillArt.js';
import { drawGainesMillTerrain, gainesMillElevation, gainesMillRavineTrees, gainesMillTerrainPlan } from '../src/battle/gainesMillTerrain.js';

const state = { rulesVersion: 2, battleRulesVersion: 18 };
const makeBattle = (id = 'gaines_mill') => new CivilWarBattleEngine(id, state, 'option_a');

test('Gaines’ Mill locators share the played creek, crossings and south-up plateau', () => {
  const engine = makeBattle();
  const plan = gainesMillTerrainPlan(engine);
  const { creek, ridge, plateau } = plan;
  assert.ok(WATT_HOUSE.x > plateau.left && WATT_HOUSE.x < plateau.right);
  assert.ok(WATT_HOUSE.y > plateau.top && WATT_HOUSE.y < plateau.bottom);
  assert.ok(WATT_HOUSE.y < creek.top, 'geographic south is up on this field');
  assert.ok(ridge.bottom < creek.top);
  const locations = battleLocations(engine.snapshot());
  const byId = id => locations.find(site => site.id === id);
  assert.equal(byId('Landmark:watt-house').source, WATT_HOUSE.source);
  assert.ok(byId('Terrain:boatswains-creek').note.includes('wooded ravine'));
  for (let x = creek.left; x <= creek.right; x += 8) {
    const { upper, lower } = gainesMillCreekBanks(creek, x);
    assert.ok(creek.top < upper && upper < lower && lower < creek.bottom);
  }
  assert.equal(plan.crossings.length, 2);
  for (const site of plan.crossings) {
    const { upper, lower } = gainesMillCreekBanks(creek, site.x);
    assert.ok(site.route.left < site.x && site.x < site.route.right);
    assert.ok(site.route.top < upper && lower < site.route.bottom);
    assert.equal(byId(`Terrain:${site.id}`).y, site.y);
  }
  assert.equal(gainesMillTerrainPlan(makeBattle('fredericksburg')), null);
  assert.equal(battleLocations(makeBattle('fredericksburg').snapshot()).find(site => site.id === 'Landmark:watt-house'), undefined);
});

test('Gaines’ Mill relief has a ravine, wooded slopes and unobstructed crossing gaps', () => {
  const plan = gainesMillTerrainPlan(makeBattle());
  const nearHouse = gainesMillElevation(plan, WATT_HOUSE.x, WATT_HOUSE.y);
  const bedAtHouse = gainesMillCreekBanks(plan.creek, WATT_HOUSE.x);
  assert.ok(nearHouse - gainesMillElevation(plan, WATT_HOUSE.x, bedAtHouse.center) > 65);
  const trees = gainesMillRavineTrees(plan, 1219);
  assert.deepEqual(trees, gainesMillRavineTrees(plan, 1219));
  assert.ok(trees.length > 60, 'ravine woodland reads at normal zoom');
  for (const tree of trees) {
    const { upper, lower } = gainesMillCreekBanks(plan.creek, tree.x);
    assert.ok(tree.y <= upper - tree.size * .38 || tree.y >= lower + tree.size * .38);
    for (const crossing of plan.crossings) {
      assert.ok(Math.abs(tree.x - crossing.x) >= 19 + tree.size * .52 || Math.abs(tree.y - crossing.y) >= 124);
    }
  }
});

test('Gaines’ Mill paints the bowed banks, yard and trees without changing battle state', () => {
  const engine = makeBattle();
  const before = engine.checkpoint();
  const plan = gainesMillTerrainPlan(engine);
  const { width, height } = plan.world;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([123, 127, 66, 191], i);
  const ctx = { getImageData: () => ({ data }), putImageData: () => {}, createRadialGradient: () => ({ addColorStop: () => {} }) };
  const fills = new Set();
  const methods = ['save', 'restore', 'translate', 'rotate', 'scale', 'drawImage', 'ellipse', 'beginPath', 'rect',
    'moveTo', 'lineTo', 'quadraticCurveTo', 'closePath', 'clip', 'stroke', 'fill', 'fillRect'];
  for (const method of methods) ctx[method] = (...args) => {
    assert.ok(args.every(value => typeof value !== 'number' || Number.isFinite(value)), `finite ${method} geometry`);
    if (method === 'fill') fills.add(ctx.fillStyle);
  };
  const image = {};
  const frame = { x: 0, y: 0, w: 143, h: 138 };
  const frames = Object.fromEntries(['oak', 'poplar', 'cedar', 'scrub'].map(species => [species, frame]));
  const scene = { cache: { json: { get: () => frames } }, textures: { get: () => ({ getSourceImage: () => image }) } };
  drawGainesMillTerrain(scene, ctx, image, plan, 1219);
  assert.ok(fills.has('#526c6b'), 'paints the water channel');
  assert.ok(fills.has('rgba(31,43,26,.32)'), 'paints canopy shadows');
  const pixel = (x, y) => data.slice((y * width + x) * 4, (y * width + x) * 4 + 4);
  assert.notDeepEqual(pixel(700, 314), pixel(700, 463));
  assert.ok(data.every((value, i) => i % 4 !== 3 || value === 191));
  assert.deepEqual(engine.checkpoint(), before);
});
