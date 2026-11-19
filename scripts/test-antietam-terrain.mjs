import assert from 'node:assert/strict';
import test from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { antietamTerrainPlan, antietamChannel, shadeAntietamPixels, drawAntietamGround } from '../src/battle/antietamTerrain.js';

const current = { rulesVersion: 2, battleRulesVersion: 18 };
const antietam = () => new CivilWarBattleEngine('antietam', current, 'option_a');

function recordGround(plan) {
  const calls = [];
  const ctx = {};
  for (const method of ['save', 'restore', 'translate', 'rotate', 'rect', 'clip',
    'beginPath', 'closePath', 'moveTo', 'lineTo', 'fillRect', 'fill', 'stroke']) {
    ctx[method] = (...args) => calls.push([method, ...args]);
  }
  ctx.createLinearGradient = () => ({ addColorStop: (...args) => calls.push(['gradient', ...args]) });
  drawAntietamGround(ctx, plan, 1862);
  return calls;
}

test('Antietam uses its authored Cornfield, Sunken Road and creek without changing the checkpoint or terrain rules', () => {
  const battle = antietam();
  const plan = antietamTerrainPlan(battle);
  assert.equal(plan.corn, battle.fieldBattle.zones.find(zone => zone.name === 'Miller Cornfield'));
  assert.equal(plan.lane, battle.fieldBattle.zones.find(zone => zone.name === 'Sunken Road'));
  assert.equal(plan.creek, battle.fieldBattle.zones.find(zone => zone.kind === 'creek'));
  assert.equal(plan.crossing, battle.fieldBattle.zones.find(zone => zone.name === 'Lower Bridge crossing'));
  const before = battle.checkpoint();
  const points = [{ x: 400, y: 434 }, { x: 810, y: 568 }, { x: 1325, y: 458 }, { x: 1450, y: 458 }];
  const ground = points.map(point => battle.fieldTerrain(point));
  const first = recordGround(plan);
  assert.deepEqual(recordGround(plan), first);
  assert.ok(first.flat().filter(value => typeof value === 'number').every(Number.isFinite));
  assert.deepEqual(points.map(point => battle.fieldTerrain(point)), ground);
  assert.deepEqual(battle.checkpoint(), before);
  assert.ok(ground[2].movement > ground[3].movement);
  assert.equal(antietamTerrainPlan(new CivilWarBattleEngine('petersburg', current, 'option_a')), null);
});

test('Antietam Creek bends inside the authored zone and its only rendered connection meets both banks', () => {
  const plan = antietamTerrainPlan(antietam());
  const { creek, crossing } = plan;
  const bridgeX = (crossing.left + crossing.right) / 2;
  const bank = antietamChannel(plan, bridgeX);
  const positions = Array.from({ length: 65 }, (_, i) => antietamChannel(plan, creek.left + (creek.right - creek.left) * i / 64));
  assert.equal(positions[0].halfWidth, 0);
  assert.equal(positions.at(-1).halfWidth, 0);
  assert.ok(positions.every(p => p.y - p.halfWidth >= creek.top && p.y + p.halfWidth <= creek.bottom));
  assert.ok(Math.max(...positions.map(p => p.y)) - Math.min(...positions.map(p => p.y)) > 20);
  assert.ok(bank.halfWidth > 10);

  const calls = recordGround(plan);
  assert.ok(calls.some(([method, ...args]) => method === 'rect'
    && args[0] === creek.left && args[1] === creek.top
    && args[2] === creek.right - creek.left && args[3] === creek.bottom - creek.top));
  const roads = calls.filter(([name]) => name === 'translate');
  assert.deepEqual(roads, [['translate', bridgeX, crossing.top - 32], ['translate', bridgeX, bank.y + bank.halfWidth]]);
  const clips = calls.slice(calls.indexOf(roads[0])).filter(([name]) => name === 'rect');
  assert.ok(Math.abs(roads[0][2] + clips[0][3] - (bank.y - bank.halfWidth)) < 1e-8);
  assert.ok(Math.abs(roads[1][2] + clips[1][3] - (crossing.bottom + 39)) < 1e-8);
  assert.ok(clips.every(([, , , , width]) => bridgeX - width / 2 >= crossing.left && bridgeX + width / 2 <= crossing.right));
});

test('Antietam relief produces distinct directional slopes and leaves transparency intact', () => {
  const plan = antietamTerrainPlan(antietam());
  const width = 165, height = 90;
  const fixture = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < fixture.length; i += 4) fixture.set([120, 109, 75, 177], i);
  const first = fixture.slice(), repeat = fixture.slice();
  shadeAntietamPixels(first, width, height, plan);
  shadeAntietamPixels(repeat, width, height, plan);
  assert.deepEqual(first, repeat);
  const red = first.filter((_, i) => i % 4 === 0);
  const alpha = first.filter((_, i) => i % 4 === 3);
  assert.ok(Math.max(...red) - Math.min(...red) > 30);
  assert.ok(alpha.every(a => a === 177));
});
