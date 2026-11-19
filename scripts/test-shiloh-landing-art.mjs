import assert from 'node:assert/strict';
import test from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { getBattleEngineConfig } from '../src/battle/battleDefinitions.js';
import { runShilohReference } from './lib/shiloh-reference-run.mjs';
import {
  SHILOH_LANDING_ART,
  SHILOH_LANDING_LABEL,
  drawShilohLandingArt,
  shilohLandingArtEnabled,
} from '../src/battle/shilohLandingArt.js';

function drawingContext() {
  const calls = [];
  let path = [];
  const context = {
    beginPath() { path = []; },
    moveTo(...point) { path.push(point); },
    lineTo(...point) { path.push(point); },
    clip() { calls.push({ name: 'clip', path: path.slice() }); },
    createRadialGradient() { return { addColorStop() {} }; },
  };
  for (const name of ['save', 'restore', 'rect', 'stroke', 'translate', 'rotate', 'closePath', 'fill', 'fillRect', 'drawImage']) {
    context[name] = (...args) => calls.push({ name, args });
  }
  return { context, calls };
}

const waterImage = { width: 1200, height: 800 };
const fakeTextures = {
  exists: key => key === SHILOH_LANDING_ART.key,
  get: () => ({ getSourceImage: () => waterImage }),
};

test('current Shiloh defaults to the landing artwork and admits a classic comparison', () => {
  assert.equal(shilohLandingArtEnabled('shiloh', 18), true);
  assert.equal(shilohLandingArtEnabled('shiloh', 18, '?artPass=shiloh-landmarks-v1'), true);
  assert.equal(shilohLandingArtEnabled('shiloh', 18, '?artPass=shiloh-landmarks-classic'), false);
  assert.equal(shilohLandingArtEnabled('shiloh', 17), false);
  assert.equal(shilohLandingArtEnabled('first_manassas', 18, '?artPass=shiloh-landmarks-v1'), false);
});

test('water leaves current movement, the starting formations and Union rear exits dry', () => {
  const { context, calls } = drawingContext();
  const engine = new CivilWarBattleEngine('shiloh', { rulesVersion: 2, battleRulesVersion: 18 }, 'option_b');
  const original = engine.checkpoint();
  assert.equal(drawShilohLandingArt({ engine, textures: fakeTextures }, context), true);
  assert.deepEqual(engine.checkpoint(), original);
  const beforeWater = calls.slice(0, calls.findIndex(call => call.name === 'drawImage'));
  const polygon = beforeWater.findLast(call => call.name === 'clip').path;
  assert.ok(polygon.length > 10);
  const bounds = { right: engine.world.width - 45, bottom: engine.world.height - 25 };
  const unionExits = engine.fieldExitTargets({ side: 'union' });
  assert.deepEqual(unionExits, [{ x: 180, y: 882 }, { x: 750, y: 882 }, { x: 1320, y: 882 }]);
  const exitMarkerRight = Math.max(...unionExits.map(exit => exit.x + 60));
  for (let index = 0; index < polygon.length; index++) {
    const start = polygon[index], end = polygon[(index + 1) % polygon.length];
    for (let step = 0; step <= 20; step++) {
      const x = start[0] + (end[0] - start[0]) * step / 20;
      const y = start[1] + (end[1] - start[1]) * step / 20;
      assert.ok(x > bounds.right || y > bounds.bottom, `water touches playable ground at ${x},${y}`);
      assert.ok(x > exitMarkerRight, `water touches the Union withdrawal apron at ${x},${y}`);
    }
  }
  assert.ok(getBattleEngineConfig('shiloh').formations.every(unit => unit.x < bounds.right && unit.y < bounds.bottom));
  assert.ok(SHILOH_LANDING_LABEL.x < bounds.right && SHILOH_LANDING_LABEL.y < bounds.bottom);
  assert.equal(calls.filter(call => call.name === 'drawImage').length, 1);
  assert.equal(calls.filter(call => call.name === 'save').length, calls.filter(call => call.name === 'restore').length);
});

test('landing artillery still withdraws to the actual southeast exit during the current battle', () => {
  const { snapshot, orders } = runShilohReference({ rules: 18, choice: 'option_a' });
  assert.ok(orders.length > 0 && orders.every(order => order.accepted));
  const battery = snapshot.formations.find(unit => unit.id === 'landing-artillery');
  assert.deepEqual(battery.retreatExit, { x: 1320, y: 882 });
  assert.equal(battery.departureReason, 'rear-exit');
  assert.ok(battery.x >= 1250 && battery.x < 1380);
  assert.ok(battery.y > 862 && battery.y <= 882);
});

test('classic, older and missing texture cases leave the existing ground alone', () => {
  const current = { scenarioId: 'shiloh', battleRulesVersion: 18 };
  for (const scene of [
    { engine: { scenarioId: 'shiloh', battleRulesVersion: 17 } },
    { engine: { scenarioId: 'gettysburg', battleRulesVersion: 18 } },
    { engine: current, artPassSearch: '?artPass=shiloh-landmarks-classic' },
    { engine: current, textures: { exists: () => false } },
    { engine: current, textures: { exists: () => true, get: () => ({ getSourceImage: () => null }) } },
  ]) {
    const { context, calls } = drawingContext();
    assert.equal(drawShilohLandingArt({ textures: fakeTextures, ...scene }, context), false);
    assert.deepEqual(calls, []);
  }
});
