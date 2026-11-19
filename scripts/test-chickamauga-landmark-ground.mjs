import assert from 'node:assert/strict';
import test from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { chickamaugaLandmarkGround, drawChickamaugaLandmarkGround } from '../src/battle/chickamaugaLandmarkGround.js';

function recordingContext() {
  const calls = [];
  const context = {
    createRadialGradient(...args) {
      calls.push(['gradient', ...args]);
      return { addColorStop: (...stop) => calls.push(['color', ...stop]) };
    },
  };
  for (const method of ['save', 'restore', 'translate', 'scale', 'rotate', 'rect', 'clip',
    'beginPath', 'closePath', 'moveTo', 'lineTo', 'fillRect', 'fill', 'stroke']) {
    context[method] = (...args) => calls.push([method, ...args]);
  }
  return { calls, context };
}

const createBattle = (id, rules) => new CivilWarBattleEngine(id, {
  rulesVersion: 2, battleRulesVersion: rules,
}, 'option_b');

test('Chickamauga farm and ridge textures use actual zones and the original road centerline', () => {
  const battle = createBattle('chickamauga', 18);
  const before = battle.checkpoint();
  const plan = chickamaugaLandmarkGround(battle);
  assert.equal(plan.house.id, 'snodgrass-house');
  assert.equal(plan.cabin.id, 'brotherton-cabin');
  assert.equal(plan.ridgeLane.at(-1).x, plan.road.value);
  assert.equal(plan.road, battle.config.movement.roadBands[0]);
  const sampledPoints = [
    { x: 620, y: 550 },
    { x: 490, y: 180 },
    { x: 760, y: 596 },
    { x: 1400, y: 550 },
  ];
  const originalTerrain = sampledPoints.map(point => battle.fieldTerrain(point));
  const first = recordingContext();
  const second = recordingContext();
  drawChickamaugaLandmarkGround(first.context, plan, 1863);
  drawChickamaugaLandmarkGround(second.context, plan, 1863);
  assert.deepEqual(first.calls, second.calls, 'the terrain can be drawn consistently on reload');
  assert.equal(first.calls.filter(([method]) => method === 'save').length,
    first.calls.filter(([method]) => method === 'restore').length);
  for (const zone of [plan.clearing, plan.ridge]) {
    const rectangle = ['rect', zone.left, zone.top, zone.right - zone.left, zone.bottom - zone.top];
    assert.ok(first.calls.some(call => call.join(',') === rectangle.join(',')), `${zone.name} wash uses its authored bounds`);
  }
  assert.ok(first.calls.some(([method, x, y]) => method === 'moveTo' && x === plan.road.value && y === plan.cabin.y + plan.cabin.height / 2 + 2));
  assert.deepEqual(sampledPoints.map(point => battle.fieldTerrain(point)), originalTerrain);
  assert.deepEqual(battle.checkpoint(), before);
});

test('other scenarios and layouts without both historic buildings keep their existing terrain', () => {
  assert.equal(chickamaugaLandmarkGround(createBattle('wilderness', 18)), null);
  assert.equal(chickamaugaLandmarkGround(createBattle('chickamauga', 12)), null);
});
