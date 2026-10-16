import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { getBattleEngineConfig } from '../src/battle/battleDefinitions.js';
import { FieldPresentationCache } from '../src/battle/fieldPresentationCache.js';
import { combatCheckpointEnvelope } from '../src/battle/combatCheckpointEnvelope.js';
import { createFormationVisualCheckpoint } from '../src/battle/formationVisualCheckpoint.js';
import { gettysburgInfantryClipPolicy } from '../src/battle/gettysburgInfantryClipPolicy.js';
import { createFreshCampaignState } from '../src/game/campaignStorage.js';
import { BATTLE_SCENARIOS } from '../src/game/battles.js';
import { previewGroupOrder } from '../src/battle/groupOrders.js';
import { canCommand } from '../src/battle/battleUsability.js';
import { landmarkField, landmarkDestinationError } from '../src/battle/historicalLandmarks.js';
import { battleLocations } from '../src/battle/battleLocations.js';
import { overviewZoom } from '../src/battle/battleUsability.js';

const source = fs.readFileSync(new URL('../src/battle/CivilWarBattlefield.jsx', import.meta.url), 'utf8');
// Evaluate the installed scene methods, rather than a reproduction of setSpeed.
// Display objects are stubs; engine, cache, checkpoint and location rules are real.
const document = { hidden: false };
const Scene = vm.runInNewContext(source.slice(source.indexOf('class CivilWarBattleScene')) + '; CivilWarBattleScene', {
  Phaser: { Scene: class {}, Math: { Clamp: (n, lo, hi) => Math.max(lo, Math.min(hi, n)) } },
  performance, Map, structuredClone, document, window: { location: { search: '' }, matchMedia: () => ({ matches: false }) },
  CivilWarBattleEngine, getBattleEngineConfig, FieldPresentationCache, combatCheckpointEnvelope,
  createFormationVisualCheckpoint, gettysburgInfantryClipPolicy, previewGroupOrder,
  canCommand, landmarkField, landmarkDestinationError, battleLocations, overviewZoom,
  recordFieldProfile() {},
});
const plain = value => JSON.parse(JSON.stringify(value));
function fixture(id = 'gettysburg', checkpoint = null) {
  const emitted = [];
  const scene = new Scene(id, createFreshCampaignState(1861), 'option_a', null, s => emitted.push(s), null, null, checkpoint);
  const drawing = { setDepth() { return this; }, lineStyle() { return this; }, strokeRoundedRect() {}, setOrigin() { return this; }, setScale() { return this; } };
  Object.assign(scene, {
    cameras: { main: { zoom: .4, width: 800, height: 500, setZoom(n) { this.zoom = n; }, centerOn() {} } },
    scale: { width: 800, height: 500 }, shadows: { clear() {} }, dust: { clear() {} }, smoke: { clear() {} },
    add: { graphics: () => ({ ...drawing }), text: () => ({ ...drawing }) },
    syncFormation() {}, drawSelection() {}, updateCameraBounds() {},
  });
  return { scene, emitted };
}
function betweenInspectorUpdates(scene, speed) {
  scene.setSpeed(speed);
  scene.update(0, 980 / speed);
  scene.update(0, 90 / speed);
  assert.equal(Math.floor(scene.engine.time), 1);
  assert.ok(scene.snapshotClock < 140);
}

for (const battle of Object.values(BATTLE_SCENARIOS)) for (const speed of [1, 4]) {
  test(`${battle.id} ${speed}x: pause publishes the current state and cold save instant without another command`, () => {
    const { scene, emitted } = fixture(battle.id);
    betweenInspectorUpdates(scene, speed);
    assert.equal(Math.floor(emitted.at(-1).time), 0, 'reproduce the old visible clock lag');
    const before = plain(scene.engine.checkpoint()), count = emitted.length;
    scene.setSpeed(0);
    const latest = emitted.at(-1);
    assert.equal(emitted.length, count + 1);
    assert.deepEqual(plain(latest), plain(scene.engine.snapshot({ presentation: true })));
    assert.equal(scene.presentationCache.current, latest);
    assert.equal(scene.snapshotClock, 0);
    assert.deepEqual(plain(scene.engine.checkpoint()), before, 'publishing does not tick or issue an order');
    const saved = plain(scene.checkpoint()), cold = fixture(battle.id, saved);
    assert.deepEqual(plain(cold.scene.engine.checkpoint()), before);
    assert.deepEqual(plain(cold.scene.engine.snapshot({ presentation: true })), plain(latest));
    const current = scene.presentationCache.current;
    for (let i = 0; i < 20; i++) { scene.setSpeed(0); scene.update(i * 16, 16); }
    assert.equal(emitted.length, count + 1, 'repeated pause does not emit or build extra snapshots');
    assert.equal(scene.presentationCache.current, current);
    assert.deepEqual(plain(scene.engine.checkpoint()), before);
  });
}

test('initial pause, run and speed changes do not emit until a running-to-paused transition', () => {
  const { scene, emitted } = fixture();
  scene.setSpeed(0); scene.setSpeed(1); scene.setSpeed(4);
  assert.equal(emitted.length, 0);
  scene.setSpeed(0);
  assert.equal(emitted.length, 1);
  scene.setSpeed(0); scene.setSpeed(0);
  assert.equal(emitted.length, 1);
});

test('destination and group guards publish a running-to-paused transition and still block running', () => {
  for (const pending of ['pendingDestination', 'pendingGroup']) {
    const { scene, emitted } = fixture();
    betweenInspectorUpdates(scene, 4);
    scene[pending] = {};
    scene.setSpeed(4);
    assert.equal(scene.speed, 0);
    assert.equal(emitted.at(-1).time, scene.engine.time);
    const count = emitted.length;
    scene.setSpeed(1);
    assert.equal(scene.speed, 0);
    assert.equal(emitted.length, count);
  }
});

test('all direct user pause paths refresh the inspector without changing combat orders', () => {
  for (const mode of ['destination', 'placeGroup', 'previewGroup', 'location']) {
    const { scene, emitted } = fixture();
    betweenInspectorUpdates(scene, 4);
    const before = plain(scene.engine.checkpoint()), count = emitted.length;
    const ids = scene.engine.snapshot().formations.filter(u => u.side === 'confederate' && u.active).slice(0, 2).map(u => u.id);
    if (mode === 'destination') scene.previewDestination({ x: 300, y: 850 });
    if (mode === 'placeGroup') scene.placeGroup({ ids, order: 'hold' });
    if (mode === 'previewGroup') scene.previewGroup({ ids, order: 'hold' });
    if (mode === 'location') assert.equal(scene.focusLocation(battleLocations(scene.engine.snapshot())[0].id), true);
    assert.equal(scene.speed, 0, mode);
    assert.equal(emitted.length, count + 1, mode);
    assert.equal(emitted.at(-1).time, scene.engine.time, mode);
    assert.deepEqual(plain(scene.engine.checkpoint()), before, mode);
    scene.setSpeed(0);
    assert.equal(emitted.length, count + 1, mode);
  }
});

test('publish resets the throttle before callbacks, including a repeated pause callback', () => {
  const { scene, emitted } = fixture();
  betweenInspectorUpdates(scene, 4);
  const count = emitted.length;
  scene.onBattleSnapshot = s => {
    assert.equal(scene.speed, 0);
    assert.equal(scene.snapshotClock, 0);
    assert.equal(scene.presentationCache.current, s);
    scene.setSpeed(0);
    emitted.push(s);
  };
  scene.setSpeed(0);
  assert.equal(emitted.length, count + 1);
});

test('pending outcome continues its existing resolution after an immediate pause publication', () => {
  const { scene, emitted } = fixture();
  betweenInspectorUpdates(scene, 4);
  scene.engine.pendingOutcome = 'union-victory';
  const before = plain(scene.engine.checkpoint());
  scene.setSpeed(0);
  assert.equal(emitted.at(-1).resolving, true);
  assert.deepEqual(plain(scene.engine.checkpoint()), before);
  scene.update(0, 50);
  assert.ok(scene.engine.resolutionTime > 0, 'pause does not strand the existing final retreat');
});

test('visibility pause publishes even when hidden frames do not draw or tick', () => {
  const { scene, emitted } = fixture();
  betweenInspectorUpdates(scene, 4);
  document.hidden = true;
  try {
    const before = plain(scene.engine.checkpoint());
    scene.setSpeed(0);
    assert.equal(emitted.at(-1).time, scene.engine.time);
    scene.update(0, 1000);
    assert.deepEqual(plain(scene.engine.checkpoint()), before);
  } finally { document.hidden = false; }
});
