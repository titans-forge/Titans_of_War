import assert from 'node:assert/strict';
import test from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { drawChancellorsvilleLandmarkGround } from '../src/battle/chancellorsvilleLandmarkGround.js';

function canvasRecorder() {
  const calls = [];
  const ctx = {
    createRadialGradient(...args) {
      calls.push(['gradient', ...args]);
      return { addColorStop: (...args) => calls.push(['addColorStop', ...args]) };
    },
  };
  for (const method of ['save', 'restore', 'translate', 'scale', 'rotate',
    'beginPath', 'moveTo', 'lineTo', 'closePath', 'rect', 'clip', 'fill', 'fillRect', 'stroke']) {
    ctx[method] = (...args) => calls.push([method, ...args]);
  }
  return { calls, ctx };
}

test('landmark yard rendering is deterministic and leaves the battle rules intact', () => {
  const battle = new CivilWarBattleEngine('chancellorsville', { rulesVersion: 2, battleRulesVersion: 18 }, 'option_a');
  const before = battle.snapshot();
  const sites = battle.fieldBattle.landmarks;
  assert.deepEqual(sites.map(site => site.id), ['catharine-furnace', 'chancellor-house']);
  const locations = [...sites, { x: 1123, y: 555 }, { x: 826, y: 824 }, { x: 705, y: 755 }];
  const terrain = locations.map(point => battle.fieldTerrain(point));
  const palettes = [];
  for (const site of sites) {
    const first = canvasRecorder();
    const second = canvasRecorder();
    assert.ok(drawChancellorsvilleLandmarkGround(first.ctx, site));
    assert.ok(drawChancellorsvilleLandmarkGround(second.ctx, site));
    assert.deepEqual(second.calls, first.calls);
    assert.equal(first.calls.filter(([method]) => method === 'save').length,
      first.calls.filter(([method]) => method === 'restore').length);
    assert.ok(first.calls.some(([method]) => method === 'clip'), 'wagon track texture is painted');
    palettes.push(first.calls.find(([method]) => method === 'addColorStop')[2]);
  }
  assert.notEqual(palettes[0], palettes[1], 'industrial and domestic surfaces have different colors');
  assert.deepEqual(battle.snapshot(), before);
  assert.deepEqual(locations.map(point => battle.fieldTerrain(point)), terrain);
});

test('Chancellorsville ground painter leaves landmarks from other boards alone', () => {
  const { calls, ctx } = canvasRecorder();
  assert.equal(drawChancellorsvilleLandmarkGround(ctx, { id: 'shiloh-church' }), false);
  assert.equal(calls.length, 0);
});
