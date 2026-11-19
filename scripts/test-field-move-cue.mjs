import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { drawConfirmedMoveCue } from '../src/battle/fieldMoveCue.js';
import { createPracticeState } from '../src/game/practiceConditions.js';

const source = readFileSync(new URL('../src/battle/CivilWarBattlefield.jsx', import.meta.url), 'utf8');
const selection = source.slice(source.indexOf('  drawSelection(snapshot) {'), source.indexOf('  setSpeed(speed) {'));
const Scene = runInNewContext(`(class {${selection}})`, { drawConfirmedMoveCue });

function fieldView() {
  const scene = new Scene();
  const calls = [];
  const graphics = { clear() { calls.length = 0; } };
  for (const name of ['lineStyle', 'beginPath', 'arc', 'strokePath', 'lineBetween', 'strokeCircle', 'fillStyle', 'fillCircle']) {
    graphics[name] = (...args) => { calls.push({ name, args }); return graphics; };
  }
  Object.assign(scene, { selection: graphics, cameras: { main: { zoom: 1 } }, selectedId: 'friendly' });
  return { scene, argsFor: name => calls.filter(call => call.name === name).map(call => call.args) };
}

const friendly = {
  id: 'friendly', side: 'confederate', active: true, x: 500, y: 550, order: 'advance', status: 'steady',
  directMove: true, target: { x: 720, y: 620 },
  path: [{ x: 615, y: 710 }, { x: 1300, y: 840 }],
};
const playing = (unit, overrides = {}) => ({ outcome: 'undecided', formations: [unit], ...overrides });

function advanceUntil(engine, predicate) {
  for (let i = 0; i < 550 && !predicate(); i++) engine.tick(.05);
  assert.ok(predicate());
}

test('a real Move shows the intended point during courier delivery and marching, then clears on arrival', () => {
  const state = createPracticeState({ id: 'sailors_creek', turn: 22 });
  const engine = new CivilWarBattleEngine('sailors_creek', state, 'option_a');
  const unit = engine.state.find(item => item.id === 'sailors-kershaw');
  const target = { x: 884, y: 553 };
  const { scene, argsFor } = fieldView();
  scene.selectedId = unit.id;
  const render = () => {
    const checkpoint = engine.checkpoint();
    scene.drawSelection(engine.snapshot());
    assert.deepEqual(engine.checkpoint(), checkpoint, 'selection rendering is presentation only');
  };

  assert.equal(engine.move(unit.id, target), true);
  assert.equal(unit.pendingCommand.order, 'move');
  render();
  assert.deepEqual(argsFor('lineBetween'), [[unit.x, unit.y, target.x, target.y]]);
  assert.deepEqual(argsFor('strokeCircle'), [[target.x, target.y, 7]]);
  assert.deepEqual(argsFor('fillCircle'), []);

  advanceUntil(engine, () => unit.directMove);
  render();
  assert.deepEqual(argsFor('lineBetween'), [[unit.x, unit.y, target.x, target.y]]);
  assert.deepEqual(argsFor('fillCircle'), [[target.x, target.y, 2]]);
  const restored = CivilWarBattleEngine.fromCheckpoint(engine.checkpoint(), 'sailors_creek', state, 'option_a');
  scene.drawSelection(restored.snapshot());
  assert.deepEqual(argsFor('lineBetween'), [[unit.x, unit.y, target.x, target.y]]);

  advanceUntil(engine, () => unit.order === 'hold');
  render();
  assert.deepEqual(argsFor('lineBetween'), []);
  assert.deepEqual(argsFor('strokeCircle'), []);
});

test('the confirmed bearing uses only the intended point, even with the tactical layer visible', () => {
  const { scene, argsFor } = fieldView();
  scene.showOverlay = true;
  scene.cameras.main.zoom = .5;
  scene.drawSelection(playing(friendly));
  assert.deepEqual(argsFor('lineBetween'), [[500, 550, 720, 620]], 'no computed waypoints are rendered');
  assert.deepEqual(argsFor('strokeCircle'), [[720, 620, 14]]);
  assert.deepEqual(argsFor('fillCircle'), [[720, 620, 4]]);
  assert.deepEqual(argsFor('lineStyle').at(-1), [3.2, 0xf2d996, .9]);
});

test('a new confirmed Move replaces the old point and a queued Hold or Withdraw clears it', () => {
  const { scene, argsFor } = fieldView();
  scene.showOverlay = true;
  scene.drawSelection(playing({ ...friendly, pendingCommand: { order: 'move', point: { x: 790, y: 606 } } }));
  assert.deepEqual(argsFor('lineBetween'), [[500, 550, 790, 606]]);
  assert.deepEqual(argsFor('fillCircle'), [], 'the current destination becomes filled after delivery');
  for (const order of ['hold', 'withdraw']) {
    scene.drawSelection(playing({ ...friendly, pendingCommand: { order } }));
    assert.deepEqual(argsFor('lineBetween'), []);
    assert.deepEqual(argsFor('strokeCircle'), []);
  }
});

test('the unconfirmed white target takes priority, and a group plan suppresses the selected bearing', () => {
  const { scene, argsFor } = fieldView();
  scene.pendingDestination = { x: 645, y: 666 };
  scene.drawSelection(playing(friendly));
  assert.deepEqual(argsFor('lineStyle').at(-1), [3, 0xffffff, .95]);
  assert.deepEqual(argsFor('strokeCircle'), [[645, 666, 14]]);
  assert.deepEqual(argsFor('lineBetween')[0], [500, 550, 645, 666]);
  assert.deepEqual(argsFor('fillCircle'), []);
  scene.pendingDestination = null;
  scene.pendingGroup = { placing: true };
  scene.drawSelection(playing(friendly));
  assert.deepEqual(argsFor('lineBetween'), []);
});

test('the selected Move cue is hidden after a decision and for enemy or unavailable formations', () => {
  const { scene, argsFor } = fieldView();
  const snapshots = [
    playing({ ...friendly, side: 'union' }),
    playing({ ...friendly, active: false }),
    playing({ ...friendly, status: 'routing' }),
    playing({ ...friendly, status: 'surrendered' }),
    playing({ ...friendly, order: 'withdraw' }),
    playing({ ...friendly, target: { x: NaN, y: 620 } }),
    playing(friendly, { resolving: true }),
    playing(friendly, { outcome: 'defeat' }),
    playing({ ...friendly, id: 'other-formation' }),
  ];
  for (const snapshot of snapshots) {
    scene.drawSelection(snapshot);
    assert.deepEqual(argsFor('lineBetween'), []);
  }
  scene.showOverlay = true;
  scene.drawSelection(playing({ ...friendly, side: 'union', directMove: false, order: 'advance' }));
  assert.deepEqual(argsFor('lineBetween'), [], 'tactical paths are restricted to friendly formations');
});
