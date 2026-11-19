import assert from 'node:assert/strict';
import test from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { fieldExitTargets } from '../src/battle/fieldBattleProfiles.js';
import { drawWinchesterLandmarkGround, winchesterLandmarkGround } from '../src/battle/winchesterLandmarkGround.js';

function recordDrawing(plan) {
  const calls = [];
  const context = { createRadialGradient: () => ({ addColorStop() {} }) };
  for (const method of ['save', 'restore', 'translate', 'scale', 'rotate', 'rect', 'clip',
    'beginPath', 'closePath', 'moveTo', 'lineTo', 'fillRect', 'fill', 'stroke']) {
    context[method] = (...args) => calls.push([method, ...args]);
  }
  drawWinchesterLandmarkGround(context, plan, 1864);
  return calls;
}

test('Third Winchester ground follows the existing corridor and all three exit points', () => {
  const battle = new CivilWarBattleEngine('third_winchester', { rulesVersion: 2, battleRulesVersion: 18 }, 'option_d');
  const before = battle.checkpoint();
  const plan = winchesterLandmarkGround(battle);
  assert.equal(plan.house.id, 'hackwood');
  assert.equal(plan.corridor, battle.config.withdrawalCorridor);
  assert.deepEqual(plan.exits, fieldExitTargets(battle, { side: 'confederate' }));
  const nearbyGround = [plan.house, ...plan.exits, { x: 400, y: 770 }];
  const originalTerrain = nearbyGround.map(point => battle.fieldTerrain(point));

  const calls = recordDrawing(plan);
  for (const { x, y } of plan.exits) {
    assert.ok(calls.some(([method, px, py]) => method === 'lineTo' && px === x && py === y),
      `visible track should meet the existing ${x},${y} exit`);
  }
  assert.deepEqual(recordDrawing(plan), calls);
  assert.deepEqual(nearbyGround.map(point => battle.fieldTerrain(point)), originalTerrain);
  assert.deepEqual(battle.checkpoint(), before);
  assert.equal(winchesterLandmarkGround({ ...battle, scenarioId: 'chickamauga' }), null);
});
