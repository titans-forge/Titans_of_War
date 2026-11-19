import assert from 'node:assert/strict';
import test from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { cedarCreekLandmarkGround, drawCedarCreekDawnGround, drawCedarCreekLandmarkYards, drawCedarCreekWater } from '../src/battle/cedarCreekLandmarkGround.js';

function recordDrawing(plan, ...painters) {
  const calls = [];
  const context = {};
  for (const method of ['save', 'restore', 'translate', 'scale', 'rotate', 'rect', 'clip',
    'beginPath', 'closePath', 'moveTo', 'lineTo', 'fillRect', 'fill', 'stroke']) {
    context[method] = (...args) => calls.push([method, ...args]);
  }
  for (const method of ['createLinearGradient', 'createRadialGradient']) {
    context[method] = (...args) => {
      calls.push([method, ...args]);
      return { addColorStop: (...stop) => calls.push(['addColorStop', ...stop]) };
    };
  }
  for (const draw of painters) draw(context, plan, 1864);
  return calls;
}

test('Cedar Creek landmark ground uses the authored battlefield and stays outside combat state', () => {
  const battle = new CivilWarBattleEngine('cedar_creek', { rulesVersion: 2, battleRulesVersion: 18 }, 'option_a');
  const plan = cedarCreekLandmarkGround(battle);
  assert.equal(plan.manor, battle.fieldBattle.landmarks.find(site => site.id === 'belle-grove'));
  assert.equal(plan.farm, battle.fieldBattle.landmarks.find(site => site.id === 'heater-house'));
  assert.equal(plan.camps, battle.fieldBattle.zones.find(zone => zone.name === 'Camp terraces'));
  assert.equal(plan.creek, battle.fieldBattle.zones.find(zone => zone.kind === 'creek'));
  const before = battle.checkpoint();
  const artworkSites = [plan.farm, plan.manor, { x: 364, y: 320 }, { x: 760, y: 606 }];
  const originalGround = artworkSites.map(point => battle.fieldTerrain(point));

  const layers = [drawCedarCreekDawnGround, drawCedarCreekWater, drawCedarCreekLandmarkYards];
  const calls = recordDrawing(plan, ...layers);
  assert.ok(calls.some(([method, x, y, width, height]) =>
    method === 'fillRect' && x === 0 && y === 0 && width === battle.world.width && height === battle.world.height));
  const canvasPositions = calls.filter(([method], index) => {
    const [command, dx, dy] = calls[index + 1] || [];
    return method === 'translate' && command === 'fillRect' && dx === -4 && dy === 2;
  });
  assert.equal(canvasPositions.length, 9);
  for (const [, x, y] of canvasPositions) {
    assert.ok(x - 4 >= plan.camps.left && x + 26 <= plan.camps.right);
    assert.ok(y - 2 >= plan.camps.top && y + 14 <= plan.camps.bottom);
  }
  assert.deepEqual(recordDrawing(plan, ...layers), calls);
  assert.deepEqual(artworkSites.map(point => battle.fieldTerrain(point)), originalGround);
  assert.deepEqual(battle.checkpoint(), before);
});

test('the painted creek stays within the approach and shallows meet the existing road', () => {
  const battle = new CivilWarBattleEngine('cedar_creek', { battleRulesVersion: 18 }, 'option_a');
  const plan = cedarCreekLandmarkGround(battle);
  const { left, right, top, bottom } = plan.creek;
  const middle = (top + bottom) / 2;
  const calls = recordDrawing(plan, drawCedarCreekWater);
  assert.ok(calls.some(([method, x, y]) => method === 'translate' && x === plan.pike.value && y === middle));
  const bank = calls.filter(([method]) => method === 'lineTo');
  for (const [, x, y] of bank) assert.ok(x >= left && x <= right && y >= top && y <= bottom);
  for (const edge of [left, right]) {
    const ends = bank.filter(([, x]) => x === edge).map(([, , y]) => y);
    assert.ok(ends.length > 0 && ends.every(y => y === ends[0]), 'banks taper to the channel at their ends');
  }
});

test('the presentation plan is local to Cedar Creek and requires both landmark sites', () => {
  const state = { rulesVersion: 2, battleRulesVersion: 18 };
  assert.equal(cedarCreekLandmarkGround(new CivilWarBattleEngine('chickamauga', state, 'option_a')), null);
  assert.equal(cedarCreekLandmarkGround(new CivilWarBattleEngine('cedar_creek', { ...state, battleRulesVersion: 15 }, 'option_a')), null);
});
