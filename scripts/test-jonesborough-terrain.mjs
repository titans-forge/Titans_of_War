import assert from 'node:assert/strict';
import test from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { battleLocations } from '../src/battle/battleLocations.js';
import { WARREN_HOUSE } from '../src/battle/jonesboroughArt.js';
import { drawJonesboroughTerrain, flintRiverX, jonesboroughTerrainPlan, jonesboroughTrees } from '../src/battle/jonesboroughTerrain.js';

const state = { rulesVersion: 2, battleRulesVersion: 18 };
const battle = () => new CivilWarBattleEngine('jonesborough', state, 'option_a');

test('Jonesborough centers rail and road art on authored terrain and keeps the Flint River west of town', () => {
  const engine = battle();
  const plan = jonesboroughTerrainPlan(engine);
  assert.ok(plan.railX > plan.crossing.left && plan.railX < plan.crossing.right);
  assert.ok(plan.roadX > plan.rail.right);
  for (let y = 0; y <= plan.world.height; y += 5) {
    const channel = flintRiverX(plan, y);
    assert.ok(channel - 22 > plan.river.left && channel + 22 < plan.river.right);
  }
  assert.equal(jonesboroughTerrainPlan(new CivilWarBattleEngine('five_forks', state, 'option_a')), null);
  const sites = battleLocations(engine.snapshot());
  const tile = id => sites.find(site => site.id === id);
  assert.equal(tile('Terrain:macon-western-railroad').x, plan.railX);
  assert.equal(tile('Terrain:flint-river').x, (plan.river.left + plan.river.right) / 2);
  assert.ok(tile('Exit:1').y > plan.world.height - 35);
  assert.ok(tile('Landmark:warren-house').x < plan.railX);
  assert.equal(tile('Landmark:warren-house').source, WARREN_HOUSE.source);
  assert.match(tile('Landmark:old-depot-site').note, /wooden station burned before the battle/);
  assert.ok(tile('Landmark:old-depot-site').x > plan.railX);
  assert.ok(engine.fieldBattle.landmarks.every(site => site.id !== WARREN_HOUSE.id));
});

test('Jonesborough woodland is repeatable and leaves a visible rail, river and house', () => {
  const plan = jonesboroughTerrainPlan(battle());
  const trees = jonesboroughTrees(plan, 1196);
  assert.deepEqual(jonesboroughTrees(plan, 1196), trees);
  assert.notDeepEqual(jonesboroughTrees(plan, 1197), trees);
  assert.ok(trees.length > 80 && trees.length < 360);
  assert.ok(trees.some(tree => tree.variant === 'oak') && trees.some(tree => tree.variant === 'cedar'));
  assert.ok(trees.every(({ x, y, size }) => Math.abs(x - flintRiverX(plan, y)) > 27 + size * .52));
  assert.ok(trees.every(({ x, size }) => Math.abs(x - plan.railX) > 28 + size * .52));
  assert.ok(trees.every(({ x, y }) => Math.abs(x - WARREN_HOUSE.x) > WARREN_HOUSE.width / 2
    || Math.abs(y - WARREN_HOUSE.y) > WARREN_HOUSE.height / 2));
});

test('Jonesborough art draws rail ties and steel without mutating battle state', () => {
  const engine = battle();
  const before = engine.checkpoint();
  const plan = jonesboroughTerrainPlan(engine);
  const { width, height } = plan.world;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([130, 118, 70, 177], i);
  const image = {};
  const context = { getImageData: () => ({ data }), putImageData: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} }) };
  let calls = 0;
  const steel = [], sleepers = [];
  let origin;
  for (const method of ['save', 'restore', 'translate', 'rotate', 'scale', 'drawImage', 'ellipse', 'beginPath',
    'moveTo', 'lineTo', 'stroke', 'fillRect', 'fill']) {
    context[method] = (...args) => {
      assert.ok(args.every(arg => typeof arg !== 'number' || Number.isFinite(arg)), method + ' geometry must be finite');
      if (method === 'moveTo') origin = args;
      if (method === 'stroke' && context.strokeStyle === '#2b2926') steel.push(origin);
      if (method === 'fillRect' && ['#695345', '#4e4036'].includes(context.fillStyle)) sleepers.push(args);
      calls++;
    };
  }
  const frames = Object.fromEntries(['cedar', 'oak', 'poplar'].map(name => [name, { x: 0, y: 0, w: 140, h: 135 }]));
  const scene = { cache: { json: { get: () => frames } }, textures: { get: () => ({ getSourceImage: () => image }) } };
  drawJonesboroughTerrain(scene, context, image, plan, 1196);
  assert.ok(calls > 4000);
  assert.ok(sleepers.length > 80 && sleepers.every(([x]) => Math.abs(x - plan.railX) <= 12));
  assert.deepEqual(steel, [[plan.railX - 6, plan.rail.top], [plan.railX + 6, plan.rail.top]]);
  assert.ok(data.every((channel, i) => i % 4 !== 3 || channel === 177));
  assert.notEqual(data[0], data[(430 * width + 900) * 4]);
  assert.deepEqual(engine.checkpoint(), before);
});
