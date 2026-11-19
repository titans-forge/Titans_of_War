import assert from 'node:assert/strict';
import test from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { drawPetersburgRelief, petersburgReliefPlan, shadePetersburgPixels } from '../src/battle/petersburgRelief.js';
import { createPetersburgGroundState } from '../src/battle/petersburgGroundState.js';
import { drawSiegeTerrain } from '../src/battle/siegeTerrainVisual.js';

const current = { rulesVersion: 2, battleRulesVersion: 18 };
const make = (id = 'petersburg', choice = 'option_b') => new CivilWarBattleEngine(id, current, choice);

function trackedContext() {
  const calls = [];
  const context = { calls };
  for (const key of ['save', 'restore', 'clearRect', 'translate', 'scale', 'rotate', 'beginPath', 'rect', 'clip',
    'fillRect', 'moveTo', 'lineTo', 'closePath', 'fill', 'stroke']) {
    context[key] = (...args) => calls.push([key, ...args]);
  }
  context.createRadialGradient = () => ({ addColorStop() {} });
  return context;
}

test('Petersburg relief samples one cohesive clay basin and retains grass elsewhere', () => {
  const plan = petersburgReliefPlan(make());
  const { width: worldWidth, height: worldHeight } = plan.world;
  const width = worldWidth / 5, height = worldHeight / 5;
  const initial = Uint8ClampedArray.from({ length: width * height * 4 }, (_, i) => [134, 137, 92, 216][i % 4]);
  const pixels = initial.slice(), repeat = initial.slice();
  shadePetersburgPixels(pixels, width, height, plan);
  shadePetersburgPixels(repeat, width, height, plan);
  assert.deepEqual(pixels, repeat);
  const pixel = (x, y) => {
    const index = (y / 5 * width + x / 5) * 4;
    return [...pixels.slice(index, index + 4)];
  };
  const [shadowRed, shadowGreen] = pixel(850, 435);
  const [lipRed, lipGreen] = pixel(850, 545);
  const [grassRed, grassGreen] = pixel(850, 335);
  assert.ok(lipRed > shadowRed + 55, 'opposing walls get distinct directional lighting');
  assert.ok(shadowRed > shadowGreen && lipRed > lipGreen, 'crater surfaces expose red earth');
  assert.ok(grassGreen >= grassRed, 'higher ground retains grass rather than a soil rectangle');
  assert.ok(pixels.every((value, index) => index % 4 !== 3 || value === 216));
});

test('exposed soil suppresses high-contrast pasture fibres only in the cut', () => {
  const plan = petersburgReliefPlan(make());
  const width = plan.world.width / 5, height = plan.world.height / 5;
  const index = (x, y) => (y / 5 * width + x / 5) * 4;
  const basin = index(850, 485), pasture = index(850, 335);
  const neutral = Uint8ClampedArray.from({ length: width * height * 4 }, (_, i) => [134, 137, 92, 216][i % 4]);
  const fibres = neutral.slice();
  for (const at of [basin, pasture]) fibres.set([184, 187, 142], at);
  shadePetersburgPixels(neutral, width, height, plan);
  shadePetersburgPixels(fibres, width, height, plan);
  assert.ok(fibres[basin] - neutral[basin] < 7);
  assert.ok(fibres[pasture] - neutral[pasture] > 40);
});

test('Petersburg draws the authored cut and road bands once without touching combat checkpoints', () => {
  const battle = make();
  const plan = petersburgReliefPlan(battle);
  const before = battle.checkpoint();
  assert.equal(petersburgReliefPlan(make('cold_harbor')), null);
  assert.equal(plan.basin, battle.fieldBattle.zones.find(zone => zone.kind === 'crater'));
  assert.equal(plan.roads, battle.config.movement.roadBands);
  const { width, height } = plan.world;
  const pixels = new Uint8ClampedArray(width * height * 4).fill(160);
  const canvas = { data: pixels };
  const calls = [];
  const grass = {};
  drawPetersburgRelief({
    drawImage: (...args) => calls.push(['draw', ...args]),
    getImageData: (...args) => { calls.push(['read', ...args]); return canvas; },
    putImageData: (...args) => calls.push(['write', ...args]),
  }, grass, plan);
  assert.deepEqual(calls, [['draw', grass, 0, 0, width, height], ['read', 0, 0, width, height], ['write', canvas, 0, 0]]);

  const context = trackedContext();
  drawSiegeTerrain({
    engine: battle, petersburgTerrainArt: true,
    textures: { get: () => assert.fail('modern Petersburg should not read stamped terrain images') },
  }, context);
  for (const zone of battle.fieldBattle.zones) {
    assert.ok(context.calls.some(([method, x, y, w, h]) =>
      method === 'rect' && x === zone.left && y === zone.top && w === zone.right - zone.left && h === zone.bottom - zone.top));
  }
  assert.equal(context.calls.filter(([method, rule]) => method === 'clip' && rule === 'evenodd').length, plan.roads.length);
  assert.equal(context.calls.filter(([method]) => method === 'save').length, context.calls.filter(([method]) => method === 'restore').length);
  assert.equal(battle.fieldTerrain({ x: 930, y: 500 }).movement, .72);
  assert.deepEqual(battle.checkpoint(), before);
});

test('crater ground disturbance redraws only on a state transition and leaves the base terrain in place', () => {
  const { basin } = petersburgReliefPlan(make());
  const context = trackedContext(), spriteCalls = [];
  let refreshes = 0;
  const scene = {
    textures: { exists: () => true, get: () => ({ context, refresh: () => refreshes++ }) },
    add: { image: (...args) => {
      spriteCalls.push(args);
      return {
        setOrigin() { return this; }, setDepth() { return this; },
        setVisible(visible) { spriteCalls.push(visible); return this; },
      };
    } },
  };
  const change = createPetersburgGroundState(scene, basin);
  change('breached');
  assert.equal(refreshes, 0);
  change('contested');
  change('contested');
  assert.equal(refreshes, 1);
  const contested = context.calls.slice();
  const changed = new Map();
  for (const state of ['contained', 'overrun', 'sealed']) {
    context.calls.length = 0;
    change(state);
    changed.set(state, context.calls.slice());
    assert.notDeepEqual(context.calls, contested);
  }
  assert.equal(refreshes, 4);
  assert.notDeepEqual(changed.get('contained'), changed.get('sealed'));
  change('not-applicable');
  assert.equal(refreshes, 4);
  assert.equal(spriteCalls.at(-1), false);
  assert.deepEqual(spriteCalls[0], [basin.left, basin.top, 'petersburg-ground-condition']);
});
