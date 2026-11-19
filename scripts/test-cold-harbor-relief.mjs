import assert from 'node:assert/strict';
import test from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { coldHarborReliefPlan, drawColdHarborRelief, shadeColdHarborPixels } from '../src/battle/coldHarborRelief.js';

const current = { rulesVersion: 2, battleRulesVersion: 18 };
const battleAt = scenario => new CivilWarBattleEngine(scenario, current, 'option_b');

test('Cold Harbor relief follows the authored ravine, works and pike without touching combat', () => {
  const battle = battleAt('cold_harbor');
  const plan = coldHarborReliefPlan(battle);
  assert.equal(plan.ravine, battle.fieldBattle.zones.find(zone => zone.kind === 'ravine'));
  assert.equal(plan.works, battle.fieldBattle.zones.find(zone => zone.kind === 'earthworks'));
  assert.equal(plan.pike, battle.config.movement.roadBands[0]);
  assert.equal(coldHarborReliefPlan(battleAt('petersburg')), null);

  const saved = battle.checkpoint();
  const points = [{ x: 360, y: 350 }, { x: 760, y: 520 }, { x: 760, y: 680 }, { x: plan.pike.value, y: 520 }];
  const ground = points.map(point => battle.fieldTerrain(point));
  const image = { data: new Uint8ClampedArray(plan.world.width * plan.world.height * 4).fill(160) };
  const calls = [];
  const context = {
    drawImage: (...args) => calls.push(['draw', ...args]),
    getImageData: (...args) => { calls.push(['read', ...args]); return image; },
    putImageData: (...args) => calls.push(['write', ...args]),
  };
  const grass = {};
  drawColdHarborRelief(context, grass, plan);
  assert.deepEqual(calls, [
    ['draw', grass, 0, 0, plan.world.width, plan.world.height],
    ['read', 0, 0, plan.world.width, plan.world.height],
    ['write', image, 0, 0],
  ]);
  assert.deepEqual(points.map(point => battle.fieldTerrain(point)), ground);
  assert.deepEqual(battle.checkpoint(), saved);
});

test('a deterministic shaded relief reads the cut, the works shoulder and the shallower pike', () => {
  const plan = coldHarborReliefPlan(battleAt('cold_harbor'));
  const width = plan.world.width / 5;
  const height = plan.world.height / 5;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < pixels.length; index += 4) pixels.set([120, 124, 93, 207], index);
  const repeated = pixels.slice();
  shadeColdHarborPixels(pixels, width, height, plan);
  shadeColdHarborPixels(repeated, width, height, plan);
  assert.deepEqual(pixels, repeated);
  const red = (x, y) => pixels[(y / 5 * width + x / 5) * 4];
  const variation = x => {
    const sample = [440, 465, 490, 515, 540, 565].map(y => red(x, y));
    return Math.max(...sample) - Math.min(...sample);
  };
  assert.ok(red(620, 465) + 45 < red(620, 655));
  assert.ok(variation(620) > variation(plan.pike.value) * 2);
  assert.ok(Math.abs(red(60, 465) - red(55, 465)) < 10, 'ravine art tapers at the authored edge');
  for (let index = 3; index < pixels.length; index += 4) assert.equal(pixels[index], 207);
});
