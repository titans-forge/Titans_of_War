import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { gettysburgInfantryClipAssets, gettysburgInfantryClipDefinitions } from '../src/battle/gettysburgInfantryClipAssets.js';
import { prepareGettysburgInfantryClips, gettysburgInfantryClipPose, validateGettysburgInfantryClip } from '../src/battle/gettysburgInfantryClips.js';
import { gettysburgInfantryContactPhase } from '../src/battle/gettysburgInfantryFamily.js';
import { detailedInfantryPose } from '../src/battle/detailedUnitVisual.js';
import { deterministicUnitValue } from '../src/battle/formationMath.js';
import { formationStatusLabel } from '../src/battle/battleTactics.js';
import { gettysburgClipTestTextures } from './test-support/gettysburgClipTextures.mjs';

const search = '?artPass=gettysburg-v4';
const assets = gettysburgInfantryClipAssets('gettysburg', search);
const atlases = new Map(assets.map(asset => [asset.key, JSON.parse(readFileSync(new URL(`../public/${asset.json}`, import.meta.url)))]));
const textures = gettysburgClipTestTextures(atlases);
const definitions = gettysburgInfantryClipDefinitions('gettysburg', search, textures);
const byAction = new Map(definitions.map(clip => [clip.action, clip]));
const prepared = prepareGettysburgInfantryClips(definitions, (key, frame) => Boolean(atlases.get(key)?.frames[frame]));
const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

test('the v4 registry binds four complete actions to two unchanged native PNGs', () => {
  assert.equal(assets.length, 2);
  assert.equal(definitions.length, 4);
  assert.equal(prepared.length, 4);
  assert.deepEqual(Object.fromEntries(definitions.map(clip => [clip.action, clip.frames.length])), { march: 4, ready: 1, fire: 1, reload: 2 });
  assert.deepEqual(Object.fromEntries(definitions.map(clip => [clip.action, clip.referenceHeight])), { march: 412, ready: 426, fire: 426, reload: 447 });
  for (const asset of assets) {
    assert.ok(asset.image.includes('/gettysburg-v4/'));
    assert.ok(asset.json.includes('/gettysburg-v4/'));
    const atlas = atlases.get(asset.key);
    const bytes = readFileSync(new URL(`../public/${asset.image}`, import.meta.url));
    const sourceBytes = readFileSync(new URL(`../${atlas.meta.source}`, import.meta.url));
    assert.deepEqual(bytes, sourceBytes, 'native imagegen pixels remain unchanged');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), atlas.meta.sha256);
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(bytes[25], 6, 'native RGBA');
    assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], [1254, 1254]);
    assert.deepEqual(atlas.meta.size, { w: 1254, h: 1254 });
    assert.equal(atlas.meta.productionApproved, false);
    const cells = new Set();
    for (const clip of atlas.meta.clips) {
      assert.deepEqual(validateGettysburgInfantryClip(clip), []);
      assert.deepEqual([clip.side, clip.identity, clip.direction], ['union', 'a', 0]);
      assert.equal(clip.sourceHash, atlas.meta.sha256);
      assert.equal(clip.scope, 'opt-in E action-family preview only');
      for (const [phase, name] of clip.frames.entries()) {
        const entry = atlas.frames[name];
        assert.deepEqual([entry.frame.w, entry.frame.h], [627, 627]);
        assert.ok(entry.frame.x >= 0 && entry.frame.y >= 0);
        assert.ok(entry.frame.x + entry.frame.w <= atlas.meta.size.w);
        assert.ok(entry.frame.y + entry.frame.h <= atlas.meta.size.h);
        assert.equal(entry.frame.x % 627, 0);
        assert.equal(entry.frame.y % 627, 0);
        assert.equal(entry.rotated, false);
        assert.equal(entry.trimmed, false);
        assert.deepEqual(entry.sourceSize, { w: 627, h: 627 });
        assert.equal(entry.bodyHeight, clip.referenceHeight);
        assert.deepEqual(entry.pivot, clip.pivots[phase]);
        cells.add(`${entry.frame.x},${entry.frame.y}`);
      }
    }
    assert.equal(cells.size, 4, 'all four native cells belong to complete clips');
  }
  const fire = byAction.get('fire');
  near(fire.pivots[0].x * 627, 138, .001);
  near(fire.pivots[0].y * 627, 590, .001);
  near(fire.muzzles[0].x * 627, 467, .001);
  near(fire.muzzles[0].y * 627, 243, .001);
});

test('only exact Gettysburg v4 requests its action-family assets without earlier studies', () => {
  for (const scenario of ['first_manassas', 'shiloh', 'gettysburg_jackson', 'gettysburg_meade', null]) {
    assert.deepEqual(gettysburgInfantryClipAssets(scenario, search), []);
    assert.deepEqual(gettysburgInfantryClipDefinitions(scenario, search), []);
  }
  for (const query of ['', '?artPass=gettysburg-v1', '?artPass=gettysburg-v2', '?artPass=gettysburg-v4-other', '?other=gettysburg-v4']) {
    assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', query), []);
    assert.deepEqual(gettysburgInfantryClipDefinitions('gettysburg', query), []);
  }
  for (const base of ['/game', '/game/', 'https://example.test/game/']) {
    const rooted = gettysburgInfantryClipAssets('gettysburg', search, base);
    assert.equal(rooted[0].image, `${base.replace(/\/$/, '')}/${assets[0].image}`);
    assert.equal(rooted[1].json, `${base.replace(/\/$/, '')}/${assets[1].json}`);
  }
});

// Run the actual syncFormation method. Candidate texture frames use the real
// atlas geometry; smoke primitives retain their world coordinates. This tests
// renderer binding and state transitions, not visual or historical quality.
class Display {
  constructor() { Object.assign(this, { alpha: 1, visible: true, input: { enabled: true }, scaleX: 1, scaleY: 1 }); }
  setTexture(key, name) {
    const entry = atlases.get(key)?.frames[name];
    assert.ok(!atlases.has(key) || entry, `requested candidate frame exists: ${name}`);
    this.textureKey = key; this.frameName = name;
    this.frame = entry ? { pivotX: entry.pivot.x, pivotY: entry.pivot.y, realWidth: entry.frame.w, realHeight: entry.frame.h,
      customData: { bodyHeight: entry.bodyHeight } } : { pivotX: .5, pivotY: .98, realWidth: 100, realHeight: 100, customData: { bodyHeight: 450 } };
    return this;
  }
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
class Graphics {
  constructor() { this.ellipses = []; this.circles = []; }
  fillStyle(color, alpha) { this.style = { color, alpha }; return this; }
  fillEllipse(x, y, width, height) { this.ellipses.push({ x, y, width, height, ...this.style }); return this; }
  fillCircle(x, y, radius) { this.circles.push({ x, y, radius, ...this.style }); return this; }
  clear() { this.ellipses.length = 0; this.circles.length = 0; return this; }
}
const source = readFileSync(new URL('../src/battle/CivilWarBattlefield.jsx', import.meta.url), 'utf8');
const method = source.slice(source.indexOf('  syncFormation('), source.indexOf('  drawSelection('));
const Renderer = vm.runInNewContext(`(class {${method}})`, {
  updateFormationVisual: visual => ({ figures: [visual.figure], footprint: [], moving: false, facing: visual.facing }),
  detailedInfantryPose, gettysburgInfantryClipPose, deterministicUnitValue, formationStatusLabel,
  updateTravelDust: () => [], updatePeriodStandard() {},
});

function fixture(clips = prepared) {
  const formation = { id: 'action-pilot-test', side: 'union', type: 'infantry', active: true, x: 100, y: 200,
    strength: 100, initialStrength: 100, order: 'hold', status: 'steady', name: 'Test', ammunition: 50,
    lastVolleyAt: -100, frontage: 70, facing: 0 };
  const figure = { id: 0, visible: true, frontRank: true, direction: 0, action: 'idle', frame: 0, scale: .82, x: 100, y: 200, alpha: 1 };
  const sprite = new Display();
  const view = { soldiers: [{ sprite }], standard: new Display(), standardUI: null, hitArea: new Display(),
    label: new Display(), bar: new Display(), barBack: new Display(), condition: new Display(), flag: {},
    realistic: true, detailed: true, infantryFamily: false, visual: { figure, facing: 0 }, dust: {} };
  const scene = new Renderer();
  Object.assign(scene, { scenarioId: 'gettysburg', artPassSearch: search, infantryClips: clips,
    views: new Map([[formation.id, view]]), tactical: true, speed: 1, reducedMotion: false,
    cameras: { main: { zoom: 1 } }, shadows: new Graphics(), dust: new Graphics(), smoke: new Graphics() });
  const sync = (time = 1, resolving = false) => { scene.smoke.clear(); scene.syncFormation(formation, time, resolving, []); };
  return { scene, formation, figure, sprite, view, soldier: view.soldiers[0], sync };
}

function expectBinding(f, action, phase) {
  const clip = byAction.get(action);
  const pose = gettysburgInfantryClipPose(f.formation.id, f.figure, 0, {
    scenarioId: 'gettysburg', search, side: 'union', identity: 'a', clips: prepared,
  });
  assert.equal(f.sprite.textureKey, clip.key);
  assert.equal(f.sprite.frameName, clip.frames[phase]);
  assert.deepEqual(f.sprite.origin, clip.pivots[phase]);
  assert.equal(f.sprite.frame.realWidth, 627);
  assert.equal(f.sprite.frame.realHeight, 627);
  near(f.sprite.scaleX, 58 * f.figure.scale / clip.referenceHeight * pose.width);
  assert.equal(f.sprite.scaleX, f.sprite.scaleY, 'candidate scaling remains isotropic');
  assert.deepEqual([f.sprite.x, f.sprite.y], [f.figure.x, f.figure.y]);
  assert.equal(f.soldier.clipAction, action);
  assert.equal(f.soldier.clipPhase, phase);
}

test('actual scene binds ready, all march phases, fire, both reload poses and ready again', () => {
  const f = fixture();
  f.sync(); expectBinding(f, 'ready', 0);
  f.figure.action = 'walk';
  const contact = gettysburgInfantryContactPhase(f.formation.id, f.figure.id);
  const marchFrames = new Set();
  for (let frame = 0; frame < 4; frame++) {
    f.figure.frame = frame; f.sync(2 + frame);
    expectBinding(f, 'march', (frame + contact) % 4);
    marchFrames.add(f.sprite.frameName);
  }
  assert.equal(marchFrames.size, 4);
  f.figure.action = 'fire'; f.figure.frame = 3; f.sync(6); expectBinding(f, 'fire', 0);
  f.figure.action = 'reload';
  const reloadFrames = [];
  for (let frame = 0; frame < 4; frame++) {
    f.figure.frame = frame; f.sync(7 + frame);
    expectBinding(f, 'reload', Math.floor(frame / 2));
    reloadFrames.push(f.sprite.frameName);
  }
  assert.deepEqual(reloadFrames, ['a-reload-0-0', 'a-reload-0-0', 'a-reload-0-1', 'a-reload-0-1']);
  f.figure.action = 'idle'; f.sync(11); expectBinding(f, 'ready', 0);
});

test('paused action changes cannot inherit a retained phase from another action', () => {
  const f = fixture();
  f.figure.action = 'walk'; f.figure.frame = 3; f.sync();
  f.scene.speed = 0;
  f.figure.action = 'reload'; f.figure.frame = 3; f.sync(50); expectBinding(f, 'reload', 0);
  f.figure.frame = 0; f.sync(70); expectBinding(f, 'reload', 0);
  f.figure.action = 'fire'; f.sync(80); expectBinding(f, 'fire', 0);
  f.figure.action = 'idle'; f.sync(90); expectBinding(f, 'ready', 0);
  f.scene.speed = 1;
  f.figure.action = 'reload'; f.figure.frame = 2; f.sync(91); expectBinding(f, 'reload', 1);
  f.scene.speed = 0;
  f.figure.frame = 0; f.sync(100); expectBinding(f, 'reload', 1);
  f.figure.action = 'walk'; f.sync(110);
  expectBinding(f, 'march', gettysburgInfantryContactPhase(f.formation.id, f.figure.id));
});

test('unsupported or incomplete clips fall directly to accepted art and clear retained action state', () => {
  for (const change of [{ action: 'melee' }, { direction: 6 }, { fallen: true, action: 'fall' }]) {
    const f = fixture();
    f.figure.action = 'reload'; f.figure.frame = 2; f.sync();
    Object.assign(f.figure, change); f.sync(2);
    assert.equal(f.soldier.clipAction, undefined);
    assert.equal(f.soldier.clipPhase, undefined);
    assert.ok(!f.sprite.textureKey.includes('gettysburg-v'), 'fallback uses accepted textures without v2/v3 intermediates');
    Object.assign(f.figure, { direction: 0, fallen: false, action: 'reload', frame: 3 });
    f.scene.speed = 0; f.sync(3); expectBinding(f, 'reload', 0);
  }
  const noReload = prepareGettysburgInfantryClips(definitions, (key, name) => Boolean(atlases.get(key)?.frames[name]) && name !== 'a-reload-0-1');
  const f = fixture(noReload);
  assert.equal(noReload.length, 3);
  for (let frame = 0; frame < 4; frame++) {
    f.figure.action = 'reload'; f.figure.frame = frame; f.sync(frame);
    assert.ok(!f.sprite.textureKey.includes('gettysburg-v'));
    assert.equal(f.soldier.clipAction, undefined);
    assert.equal(f.soldier.clipPhase, undefined);
  }
  f.figure.action = 'fire'; f.sync(5); expectBinding(f, 'fire', 0);
});

test('authored muzzle coordinates place flash and smoke and remain tied to the volley through reload', () => {
  const f = fixture();
  f.figure.action = 'fire'; f.formation.lastVolleyAt = 10; f.sync(10);
  expectBinding(f, 'fire', 0);
  const muzzle = { x: 100 + (467 - 138) * f.sprite.scaleX, y: 200 + (243 - 590) * f.sprite.scaleY };
  near(f.soldier.clipVolleyMuzzle.x, muzzle.x, .0001);
  near(f.soldier.clipVolleyMuzzle.y, muzzle.y, .0001);
  assert.equal(f.soldier.clipVolleyAt, 10);
  assert.equal(f.scene.smoke.circles.length, 1);
  near(f.scene.smoke.circles[0].x, muzzle.x, .0001);
  near(f.scene.smoke.circles[0].y, muzzle.y, .0001);
  assert.equal(f.scene.smoke.ellipses.length, 3);
  near(f.scene.smoke.ellipses[0].x, muzzle.x, .0001);
  near(f.scene.smoke.ellipses[0].y, muzzle.y, .0001);
  const retained = { x: f.soldier.clipVolleyMuzzle.x, y: f.soldier.clipVolleyMuzzle.y };
  Object.assign(f.figure, { action: 'reload', frame: 2, x: 130, y: 230 });
  f.sync(10.25); expectBinding(f, 'reload', 1);
  assert.deepEqual([f.soldier.clipVolleyMuzzle.x, f.soldier.clipVolleyMuzzle.y], [retained.x, retained.y]);
  near(f.scene.smoke.ellipses[0].x, retained.x + .25 * 14 * .82);
  near(f.scene.smoke.ellipses[0].y, retained.y - .25 * 9);
  assert.equal(f.scene.smoke.circles.length, 0);
  const noFire = prepared.filter(clip => clip.action !== 'fire');
  f.scene.infantryClips = noFire;
  Object.assign(f.figure, { action: 'fire', frame: 0, x: 160, y: 240 });
  f.formation.lastVolleyAt = 20; f.sync(20.05);
  assert.equal(f.soldier.clipAction, undefined);
  assert.equal(f.soldier.clipPhase, undefined);
  const age = 20.05 - 20;
  near(f.scene.smoke.ellipses[0].x, 160 + 15 * .82 + age * 14 * .82);
  near(f.scene.smoke.ellipses[0].y, 240 - 24 * .82 - age * 9);
  assert.equal(f.scene.smoke.circles.length, 0, 'an old candidate muzzle cannot flash at a new unsupported volley');
});

test('reduced motion suppresses the candidate flash while preserving muzzle smoke; resolution suppresses both', () => {
  const f = fixture();
  f.figure.action = 'fire'; f.formation.lastVolleyAt = 30; f.scene.reducedMotion = true;
  f.sync(30.05);
  assert.equal(f.scene.smoke.circles.length, 0);
  assert.equal(f.scene.smoke.ellipses.length, 3);
  const age = 30.05 - 30;
  near(f.scene.smoke.ellipses[0].x, f.soldier.clipVolleyMuzzle.x + age * 14 * .82);
  near(f.scene.smoke.ellipses[0].y, f.soldier.clipVolleyMuzzle.y - age * 9);
  f.scene.reducedMotion = false; f.sync(30.05, true);
  assert.equal(f.scene.smoke.circles.length, 0);
  assert.equal(f.scene.smoke.ellipses.length, 0);
});
