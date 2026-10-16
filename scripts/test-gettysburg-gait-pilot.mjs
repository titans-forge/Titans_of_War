import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { gettysburgInfantryClipAssets, gettysburgInfantryClipDefinitions } from '../src/battle/gettysburgInfantryClipAssets.js';
import { prepareGettysburgInfantryClips, gettysburgInfantryClipPose, validateGettysburgInfantryClip } from '../src/battle/gettysburgInfantryClips.js';
import { detailedInfantryPose } from '../src/battle/detailedUnitVisual.js';
import { deterministicUnitValue } from '../src/battle/formationMath.js';
import { formationStatusLabel } from '../src/battle/battleTactics.js';
import { gettysburgClipTestTextures } from './test-support/gettysburgClipTextures.mjs';

const search = '?artPass=gettysburg-v3';
const atlas = JSON.parse(readFileSync(new URL('../public/images/units/gettysburg-v3/union-a-march-e.json', import.meta.url)));
const textures = gettysburgClipTestTextures(new Map([[gettysburgInfantryClipAssets('gettysburg', search)[0].key, atlas]]));
const definition = gettysburgInfantryClipDefinitions('gettysburg', search, textures)[0];
const prepared = prepareGettysburgInfantryClips([definition], (key, frame) => key === definition.key && Boolean(atlas.frames[frame]));

test('pilot preserves native PNG bytes, complete phase geometry and a shared pelvis-ground reference', () => {
  const bytes = readFileSync(new URL('../public/images/units/gettysburg-v3/union-a-march-e.png', import.meta.url));
  const original = readFileSync(new URL('../docs/art-pass/candidates/gettysburg-v3/union-e-rig-guided-candidate.png', import.meta.url));
  assert.deepEqual(bytes, original, 'imagegen pixels remain unedited');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), definition.sourceHash);
  assert.equal(atlas.meta.sha256, definition.sourceHash);
  assert.equal(bytes.readUInt32BE(16), atlas.meta.size.w);
  assert.equal(bytes.readUInt32BE(20), atlas.meta.size.h);
  assert.equal(bytes[25], 6, 'native RGBA');
  assert.deepEqual(validateGettysburgInfantryClip(definition), []);
  assert.equal(prepared.length, 1);
  const groundYs = new Set();
  for (const [phase, key] of definition.frames.entries()) {
    const entry = atlas.frames[key];
    assert.ok(entry.frame.x >= 0 && entry.frame.y >= 0);
    assert.ok(entry.frame.x + entry.frame.w <= atlas.meta.size.w);
    assert.ok(entry.frame.y + entry.frame.h <= atlas.meta.size.h);
    assert.equal(entry.bodyHeight, definition.referenceHeight);
    assert.deepEqual(entry.pivot, definition.pivots[phase]);
    groundYs.add(Math.round(entry.pivot.y * entry.frame.h));
  }
  assert.equal(groundYs.size, 1, 'support boot changes cannot move the root');
});

test('only explicit Gettysburg v3 requests the one Union E pilot atlas', () => {
  const assets = gettysburgInfantryClipAssets('gettysburg', search);
  assert.equal(assets.length, 1);
  assert.equal(assets[0].key, definition.key);
  assert.equal(assets[0].image, 'images/units/gettysburg-v3/union-a-march-e.png');
  assert.equal(gettysburgInfantryClipAssets('gettysburg', search, '/game/')[0].json, '/game/images/units/gettysburg-v3/union-a-march-e.json');
  for (const scenario of ['first_manassas', 'shiloh', 'gettysburg_jackson']) {
    assert.deepEqual(gettysburgInfantryClipAssets(scenario, search), []);
  }
  for (const query of ['', '?artPass=gettysburg-v2']) assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', query), []);
  assert.equal(gettysburgInfantryClipDefinitions('gettysburg', search, textures).length, 1);
});

// Execute the actual renderer method. Texture calls and transforms are retained
// by display doubles; this checks binding/scale/fallback, not canvas appearance.
class Display {
  constructor() { Object.assign(this, { alpha: 1, visible: true, input: { enabled: true }, scaleX: 1 }); }
  setTexture(key, frame) { Object.assign(this, { textureKey: key, frameName: frame, frame: { pivotX: .5, pivotY: .98, customData: { bodyHeight: 450 } } }); return this; }
  setOrigin(x, y) { this.origin = { x, y }; return this; }
  setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setDepth(depth) { this.depth = depth; return this; }
  setVisible(value) { this.visible = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setAngle() { return this; } setFlipX() { return this; } setTint() { return this; }
  setText() { return this; } setDisplaySize() { return this; }
  disableInteractive() { this.input.enabled = false; return this; }
}
const source = readFileSync(new URL('../src/battle/CivilWarBattlefield.jsx', import.meta.url), 'utf8');
const method = source.slice(source.indexOf('  syncFormation('), source.indexOf('  drawSelection('));
let currentFigure;
const Renderer = vm.runInNewContext(`(class {${method}})`, {
  updateFormationVisual: () => ({ figures: [currentFigure], footprint: [], moving: false, facing: 0 }),
  detailedInfantryPose, gettysburgInfantryClipPose, deterministicUnitValue, formationStatusLabel,
  updateTravelDust: () => [], updatePeriodStandard() {},
});
const formation = { id: 'pilot-test', side: 'union', type: 'infantry', active: true, x: 100, y: 200,
  strength: 100, initialStrength: 100, order: 'hold', status: 'steady', name: 'Test', ammunition: 50,
  lastVolleyAt: -100, frontage: 70 };

function fixture(clips = prepared) {
  const sprite = new Display();
  const view = { soldiers: [{ sprite }], standard: new Display(), standardUI: null, hitArea: new Display(),
    label: new Display(), bar: new Display(), barBack: new Display(), condition: new Display(), flag: {},
    realistic: true, detailed: true, infantryFamily: false, visual: {}, dust: {} };
  const graphics = { fillStyle() { return this; }, fillEllipse() { return this; } };
  const scene = new Renderer();
  Object.assign(scene, { scenarioId: 'gettysburg', artPassSearch: search, infantryClips: clips,
    views: new Map([[formation.id, view]]), tactical: true, speed: 1, reducedMotion: false,
    cameras: { main: { zoom: 1 } }, shadows: graphics, dust: graphics, smoke: graphics });
  currentFigure = { id: 0, visible: true, direction: 0, action: 'walk', frame: 0, scale: .82, x: 100, y: 200, alpha: 1 };
  return { scene, sprite, view };
}

test('actual scene binds four phases at common scale and uses their pelvis roots', () => {
  const { scene, sprite, view } = fixture();
  const selected = new Set();
  for (let frame = 0; frame < 4; frame++) {
    currentFigure.frame = frame;
    scene.syncFormation(formation, frame, false, []);
    const pose = gettysburgInfantryClipPose(formation.id, currentFigure, frame, {
      scenarioId: 'gettysburg', search, side: 'union', identity: 'a', clips: prepared,
    });
    assert.equal(sprite.textureKey, definition.key);
    assert.equal(sprite.frameName, pose.frame);
    assert.deepEqual(sprite.origin, pose.pivot);
    assert.equal(sprite.scaleX, 58 * .82 / definition.referenceHeight * pose.width);
    assert.equal(sprite.scaleX, sprite.scaleY);
    assert.deepEqual([sprite.x, sprite.y], [100, 200]);
    assert.equal(view.soldiers[0].clipPhase, pose.phase);
    assert.equal(view.soldiers[0].clipAction, 'march');
    selected.add(sprite.frameName);
  }
  assert.equal(selected.size, 4);
  const beforePause = sprite.frameName;
  scene.speed = 0;
  currentFigure.frame = 6;
  scene.syncFormation(formation, 30, false, []);
  assert.equal(sprite.frameName, beforePause);
  scene.speed = 1;
  scene.reducedMotion = true;
  scene.syncFormation(formation, 31, false, []);
  const fixed = sprite.frameName;
  for (let frame = 0; frame < 4; frame++) {
    currentFigure.frame = frame;
    scene.syncFormation(formation, 40 + frame, false, []);
    assert.equal(sprite.frameName, fixed);
  }
});

test('accepted-art fallback clears the retained action and phase before a paused return', () => {
  const { scene, sprite, view } = fixture();
  currentFigure.frame = 3;
  scene.syncFormation(formation, 1, false, []);
  assert.equal(view.soldiers[0].clipAction, 'march');
  currentFigure.direction = 6;
  scene.syncFormation(formation, 2, false, []);
  assert.equal(view.soldiers[0].clipAction, undefined);
  assert.equal(view.soldiers[0].clipPhase, undefined);
  currentFigure.direction = 0;
  scene.speed = 0;
  scene.syncFormation(formation, 3, false, []);
  const expected = gettysburgInfantryClipPose(formation.id, currentFigure, 3, {
    scenarioId: 'gettysburg', search, side: 'union', identity: 'a', clips: prepared, paused: true,
  });
  assert.equal(sprite.frameName, expected.frame);
});

test('actual scene retains accepted textures for unsupported direction, action or unavailable clip', () => {
  for (const change of [{ direction: 6 }, { action: 'fire' }, { action: 'reload' }, { action: 'idle' }, { fallen: true, action: 'fall' }]) {
    const { scene, sprite } = fixture();
    Object.assign(currentFigure, change);
    scene.syncFormation(formation, 1, false, []);
    assert.notEqual(sprite.textureKey, definition.key);
    assert.ok(!sprite.textureKey.includes('gettysburg-v2'), 'a rejected movement study is never a v3 fallback');
  }
  const missing = prepareGettysburgInfantryClips([definition], (_key, frame) => frame !== definition.frames[2]);
  const { scene, sprite } = fixture(missing);
  for (let frame = 0; frame < 4; frame++) {
    currentFigure.frame = frame;
    scene.syncFormation(formation, 1, false, []);
    assert.equal(sprite.textureKey, frame % 2 === 0 ? 'union-detailed-walk' : 'union-detailed-ready');
  }
});
