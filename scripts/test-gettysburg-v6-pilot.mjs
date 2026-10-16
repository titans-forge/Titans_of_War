import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { gettysburgInfantryClipAssets, gettysburgInfantryClipDefinitions } from '../src/battle/gettysburgInfantryClipAssets.js';
import { gettysburgInfantryClipsEnabled, prepareGettysburgInfantryClips,
  gettysburgInfantryClipPose, validateGettysburgInfantryClip } from '../src/battle/gettysburgInfantryClips.js';
import { gettysburgInfantryContactPhase, gettysburgInfantryIdentity,
  gettysburgInfantryFamilyAssets } from '../src/battle/gettysburgInfantryFamily.js';
import { detailedInfantryPose, detailedUnitAssetDirectory, DETAILED_UNIT_PAGES } from '../src/battle/detailedUnitVisual.js';
import { deterministicUnitValue } from '../src/battle/formationMath.js';
import { formationStatusLabel } from '../src/battle/battleTactics.js';
import { GETTYSBURG_MOTION_STUDIES as ALL_GETTYSBURG_MOTION_STUDIES } from '../src/battle/gettysburgMotionStudies.js';
import { gettysburgClipTestTextures } from './test-support/gettysburgClipTextures.mjs';

// Historical assertions inspect every prior study; v14 and v15 each have a strict suite.
const GETTYSBURG_MOTION_STUDIES = ALL_GETTYSBURG_MOTION_STUDIES.filter(study => !study.id.endsWith('-v14') && !study.id.endsWith('-v15')); 

const search = '?artPass=gettysburg-v6';
const assets = gettysburgInfantryClipAssets('gettysburg', search);
const atlases = new Map(assets.map(asset => [asset.key, JSON.parse(readFileSync(new URL(`../public/${asset.json}`, import.meta.url)))]));
const textures = gettysburgClipTestTextures(atlases);
const definitions = gettysburgInfantryClipDefinitions('gettysburg', search, textures);
const hasFrame = (key, name) => Boolean(atlases.get(key)?.frames[name]);
const prepared = prepareGettysburgInfantryClips(definitions, hasFrame);
const clip = (direction, action) => definitions.find(item => item.direction === direction && item.action === action);
// Until real reviewed data is registered, these checks remain visibly pending.
// A release/validation caller can require the data instead of allowing skips:
// FORGE_REQUIRE_V6_DATA=1 node --test scripts/test-gettysburg-v6-pilot.mjs
const pending = { skip: assets.length === 0 && process.env.FORGE_REQUIRE_V6_DATA !== '1'
  ? 'Pending real reviewed v6 SE actions and asset registry; no synthetic substitute' : false };
const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const options = { scenarioId: 'gettysburg', search, side: 'union', identity: 'a', clips: prepared };

test('v6 is exact Gettysburg only and preserves the retained reviewed bearings without identity substitution', () => {
  assert.equal(gettysburgInfantryClipsEnabled('gettysburg', search), true);
  for (const scenario of ['gettysburg_meade', 'gettysburg_jackson', 'first_manassas', 'shiloh', null]) {
    assert.equal(gettysburgInfantryClipsEnabled(scenario, search), false);
    assert.deepEqual(gettysburgInfantryClipAssets(scenario, search), []);
    assert.deepEqual(gettysburgInfantryClipDefinitions(scenario, search), []);
  }
  for (const query of ['', '?artPass=gettysburg-v6-other', '?other=gettysburg-v6']) {
    assert.equal(gettysburgInfantryClipsEnabled('gettysburg', query), false);
    assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', query), []);
  }
  // Existing native v5 E/SE march definitions are reused by v6. No future SE
  // action source or review approval is invented for this selector check.
  const retained = prepareGettysburgInfantryClips(gettysburgInfantryClipDefinitions('gettysburg', '?artPass=gettysburg-v5', textures), () => true);
  const figure = { id: 0, action: 'walk', frame: 0, direction: 0 };
  for (const direction of [0, 1]) assert.ok(gettysburgInfantryClipPose('v6-gate', { ...figure, direction }, 0, { ...options, clips: retained }));
  for (const direction of [-1, 2, 3, 4, 5, 6, 7, 8, .5, NaN, undefined, '1']) {
    assert.equal(gettysburgInfantryClipPose('v6-gate', { ...figure, direction }, 0, { ...options, clips: retained }), null);
  }
  const missingB = Array.from({ length: 100 }, (_, id) => id).find(id => gettysburgInfantryIdentity('v6-gate', id) === 'b');
  assert.equal(gettysburgInfantryClipPose('v6-gate', { ...figure, id: missingB }, 0, { ...options, clips: retained, identity: undefined }), null);
  assert.equal(gettysburgInfantryClipPose('v6-gate', figure, 0, { ...options, clips: retained, identity: 'b' }), null);
  assert.equal(gettysburgInfantryClipPose('v6-gate', { ...figure, fallen: true }, 0, { ...options, clips: retained }), null);
  assert.equal(gettysburgInfantryClipPose('v6-gate', { ...figure, action: 'unknown' }, 0, { ...options, clips: retained }), null);
  if (!assets.length) assert.deepEqual(definitions, [], 'pending v6 must not silently borrow another version registry');
});

test('real v6 sources bind eight complete clips, unchanged retained atlases and one shared SE stationary reference', pending, () => {
  assert.equal(assets.length, 4, 'three retained atlases plus one new SE action atlas');
  assert.equal(definitions.length, 8); assert.equal(prepared.length, 8);
  assert.equal(clip(0, 'march').key, 'union-gettysburg-v4-march-e');
  assert.equal(clip(0, 'march').referenceHeight, 412);
  assert.equal(clip(1, 'march').key, 'union-gettysburg-v5-march-se');
  assert.equal(clip(1, 'march').referenceHeight, 490);
  const seReference = clip(1, 'ready').referenceHeight;
  assert.ok(Number.isFinite(seReference) && seReference > 0);
  for (const action of ['ready', 'fire', 'reload']) {
    assert.equal(clip(0, action).key, 'union-gettysburg-v5-actions-e');
    assert.equal(clip(0, action).referenceHeight, 485);
    assert.equal(clip(1, action).key, 'union-gettysburg-v6-actions-se');
    assert.equal(clip(1, action).referenceHeight, seReference);
  }
  assert.equal(clip(1, 'fire').muzzles.length, 1, 'SE fire has its own measured barrel-mouth anchor');
  for (const asset of assets) {
    const atlas = atlases.get(asset.key);
    const bytes = readFileSync(new URL(`../public/${asset.image}`, import.meta.url));
    assert.deepEqual(bytes, readFileSync(new URL(`../${atlas.meta.source}`, import.meta.url)), 'native source copied byte-for-byte');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), atlas.meta.sha256);
    assert.equal(bytes[25], 6, 'native RGBA PNG');
    assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], [atlas.meta.size.w, atlas.meta.size.h]);
    assert.equal(atlas.meta.productionApproved, false);
    const cells = new Set();
    for (const definition of atlas.meta.clips) {
      assert.deepEqual(validateGettysburgInfantryClip(definition), []);
      assert.equal(definition.sourceHash, atlas.meta.sha256);
      assert.deepEqual([definition.side, definition.identity], ['union', 'a']);
      for (const [phase, name] of definition.frames.entries()) {
        const entry = atlas.frames[name];
        const { x, y, w, h } = entry.frame;
        assert.ok([x, y, w, h].every(Number.isInteger));
        assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= atlas.meta.size.w && y + h <= atlas.meta.size.h);
        assert.equal(w * 2, atlas.meta.size.w); assert.equal(h * 2, atlas.meta.size.h);
        assert.equal(x % w, 0); assert.equal(y % h, 0);
        assert.equal(entry.trimmed, false); assert.equal(entry.rotated, false);
        assert.deepEqual(entry.pivot, definition.pivots[phase]);
        assert.equal(entry.bodyHeight, definition.referenceHeight);
        cells.add(`${x},${y}`);
      }
    }
    assert.equal(cells.size, 4);
  }
});

test('real SE atlas and reviewer registration agree with recorded source roots, reference and muzzle', pending, () => {
  const record = JSON.parse(readFileSync(new URL('../docs/art-pass/manifests/gettysburg-v6-source-annotations.json', import.meta.url)));
  const annotation = record.sources.find(source => source.name === 'actions-se');
  assert.ok(annotation);
  const atlas = atlases.get('union-gettysburg-v6-actions-se');
  const measurement = JSON.parse(readFileSync(new URL(`../${atlas.meta.measurementReview}`, import.meta.url)));
  const study = GETTYSBURG_MOTION_STUDIES.find(source => source.id === 'union-se-actions-v6');
  assert.equal(annotation.sha256, atlas.meta.sha256); assert.equal(measurement.sourceHash, annotation.sha256);
  assert.equal(annotation.source, atlas.meta.source); assert.equal(measurement.source, annotation.source);
  assert.equal(study.source, `/${annotation.source}`);
  assert.equal(study.receipt, `/${atlas.meta.measurementReview}`);
  assert.equal(annotation.referenceHeight, 495);
  assert.equal(measurement.referenceHeight, annotation.referenceHeight); assert.equal(study.referenceHeight, annotation.referenceHeight);
  assert.deepEqual(measurement.cells.map(cell => cell.rootPixels), annotation.roots);
  const normalized = value => Math.round(value / annotation.cell * 1e6) / 1e6;
  for (const [action, cells] of annotation.actions) {
    const definition = clip(annotation.direction, action);
    assert.equal(definition.sourceHash, annotation.sha256); assert.equal(definition.referenceHeight, annotation.referenceHeight);
    for (const [phase, index] of cells.entries()) {
      const [x, y] = annotation.roots[index];
      assert.deepEqual(definition.pivots[phase], { x: normalized(x), y: normalized(y) });
      near(study.phaseRoots[index].x, x / annotation.cell); near(study.phaseRoots[index].y, y / annotation.cell);
    }
  }
  assert.deepEqual(clip(1, 'fire').muzzles[0], { x: normalized(annotation.muzzle[0]), y: normalized(annotation.muzzle[1]) });
});

// Execute the existing syncFormation method with real atlas geometry. Visual
// figures are supplied by a fixture; this is not pixel or anatomical review.
class Display {
  constructor() { Object.assign(this, { visible: true, alpha: 1, input: { enabled: true }, scaleX: 1, scaleY: 1 }); }
  setTexture(key, name) {
    const entry = atlases.get(key)?.frames[name];
    assert.ok(!atlases.has(key) || entry, `missing real candidate frame ${key}/${name}`);
    this.textureKey = key; this.frameName = name;
    this.frame = entry ? { pivotX: entry.pivot.x, pivotY: entry.pivot.y, realWidth: entry.frame.w, realHeight: entry.frame.h,
      customData: { bodyHeight: entry.bodyHeight } } : { pivotX: .5, pivotY: .98, realWidth: 100, realHeight: 100, customData: { bodyHeight: 450 } };
    return this;
  }
  setOrigin(x, y) { this.origin = { x, y }; return this; }
  setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setDepth(value) { this.depth = value; return this; }
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
function fixture(clips = prepared, query = search) {
  const formation = { id: 'v6-renderer-test', side: 'union', type: 'infantry', active: true, x: 100, y: 200,
    strength: 100, initialStrength: 100, order: 'hold', status: 'steady', name: 'Test', ammunition: 50,
    lastVolleyAt: -100, frontage: 70, facing: 0 };
  const figure = { id: 0, visible: true, frontRank: true, direction: 1, action: 'idle', frame: 0, scale: .82, x: 100, y: 200, alpha: 1 };
  const sprite = new Display();
  const view = { soldiers: [{ sprite }], standard: new Display(), standardUI: null, hitArea: new Display(),
    label: new Display(), bar: new Display(), barBack: new Display(), condition: new Display(), flag: {},
    realistic: true, detailed: true, infantryFamily: false, visual: { figure, facing: 0 }, dust: {} };
  const scene = new Renderer();
  Object.assign(scene, { scenarioId: 'gettysburg', artPassSearch: query, infantryClips: clips, tactical: true,
    views: new Map([[formation.id, view]]), speed: 1, reducedMotion: false,
    cameras: { main: { zoom: 1 } }, shadows: new Graphics(), dust: new Graphics(), smoke: new Graphics() });
  const sync = (time = 1, resolving = false) => {
    view.visual.facing = figure.direction * Math.PI / 4;
    formation.facing = view.visual.facing;
    scene.smoke.clear(); scene.syncFormation(formation, time, resolving, []);
  };
  return { scene, formation, figure, sprite, view, soldier: view.soldiers[0], sync };
}
function expectBinding(f, action, phase) {
  const definition = clip(f.figure.direction, action);
  const pose = gettysburgInfantryClipPose(f.formation.id, f.figure, 0, { ...options, clips: f.scene.infantryClips });
  assert.equal(f.sprite.textureKey, definition.key); assert.equal(f.sprite.frameName, definition.frames[phase]);
  assert.deepEqual(f.sprite.origin, definition.pivots[phase]);
  near(f.sprite.scaleX, 58 * f.figure.scale / definition.referenceHeight * pose.width);
  assert.equal(f.sprite.scaleX, f.sprite.scaleY);
  assert.deepEqual([f.sprite.x, f.sprite.y], [f.figure.x, f.figure.y]);
  assert.equal(f.soldier.clipAction, action); assert.equal(f.soldier.clipPhase, phase);
}
function expectAccepted(f) {
  assert.ok(!f.sprite.textureKey.includes('gettysburg-v'), 'accepted fallback is direct');
  assert.equal(f.soldier.clipAction, undefined); assert.equal(f.soldier.clipPhase, undefined);
}

test('real SE ready, fire and both loading states use their own pivots at one common stationary scale', pending, () => {
  const f = fixture();
  const scales = [];
  for (const [action, frame, page, phase] of [['idle', 0, 'ready', 0], ['fire', 3, 'fire', 0],
    ['reload', 0, 'reload', 0], ['reload', 1, 'reload', 0], ['reload', 2, 'reload', 1], ['reload', 3, 'reload', 1], ['idle', 0, 'ready', 0]]) {
    Object.assign(f.figure, { action, frame }); f.sync(); expectBinding(f, page, phase); scales.push(f.sprite.scaleX);
  }
  assert.ok(scales.every(scale => scale === scales[0]));
});

test('real E to SE action turns retain matching phases while v5 still withholds unsupported SE actions', pending, () => {
  const f = fixture();
  const contact = gettysburgInfantryContactPhase(f.formation.id, f.figure.id);
  for (const [action, frame, page, phase] of [['idle', 0, 'ready', 0], ['walk', 2, 'march', (2 + contact) % 4],
    ['fire', 2, 'fire', 0], ['reload', 0, 'reload', 0], ['reload', 2, 'reload', 1]]) {
    Object.assign(f.figure, { action, frame });
    for (const direction of [0, 1, 0]) { f.figure.direction = direction; f.sync(); expectBinding(f, page, phase); }
  }
  Object.assign(f.figure, { direction: 0, action: 'reload', frame: 2 }); f.sync();
  f.scene.speed = 0; f.figure.frame = 0;
  for (const direction of [1, 0]) { f.figure.direction = direction; f.sync(100); expectBinding(f, 'reload', 1); }
  const older = prepareGettysburgInfantryClips(gettysburgInfantryClipDefinitions('gettysburg', '?artPass=gettysburg-v5', textures), hasFrame);
  const v5 = fixture(older, '?artPass=gettysburg-v5');
  for (const action of ['idle', 'fire', 'reload']) { v5.figure.action = action; v5.sync(); expectAccepted(v5); }
  for (const query of ['?artPass=gettysburg-v3', '?artPass=gettysburg-v4']) {
    const old = fixture(prepared, query); old.figure.action = 'walk'; old.sync(); expectAccepted(old);
  }
});

test('real SE muzzle effects use the measured barrel mouth and retain the shot origin through reload and turns', pending, () => {
  const f = fixture();
  f.figure.action = 'fire'; f.formation.lastVolleyAt = 10; f.sync(10); expectBinding(f, 'fire', 0);
  const fire = clip(1, 'fire');
  const muzzle = {
    x: f.figure.x + (fire.muzzles[0].x - fire.pivots[0].x) * f.sprite.frame.realWidth * f.sprite.scaleX,
    y: f.figure.y + (fire.muzzles[0].y - fire.pivots[0].y) * f.sprite.frame.realHeight * f.sprite.scaleY,
  };
  near(f.soldier.clipVolleyMuzzle.x, muzzle.x); near(f.soldier.clipVolleyMuzzle.y, muzzle.y);
  assert.equal(f.scene.smoke.circles.length, 1); assert.equal(f.scene.smoke.ellipses.length, 3);
  near(f.scene.smoke.circles[0].x, muzzle.x); near(f.scene.smoke.circles[0].y, muzzle.y);
  f.sync(10.05);
  const age = 10.05 - 10;
  near(f.scene.smoke.ellipses[0].x, muzzle.x + Math.cos(Math.PI / 4) * age * 14 * .82);
  near(f.scene.smoke.ellipses[0].y, muzzle.y - age * 9);
  Object.assign(f.figure, { direction: 0, action: 'reload', frame: 2, x: 130, y: 230 }); f.sync(10.25);
  near(f.soldier.clipVolleyMuzzle.x, muzzle.x); near(f.soldier.clipVolleyMuzzle.y, muzzle.y);
  near(f.scene.smoke.ellipses[0].x, muzzle.x + .25 * 14 * .82); near(f.scene.smoke.ellipses[0].y, muzzle.y - .25 * 9);
  Object.assign(f.figure, { direction: 2, action: 'fire' }); f.formation.lastVolleyAt = 20; f.sync(20.05); expectAccepted(f);
  assert.equal(f.scene.smoke.circles.length, 0, 'unsupported new volley cannot reuse an old candidate flash origin');
});

test('real SE pause, reduced motion and resolution retain valid phases and suppress candidate flash appropriately', pending, () => {
  const f = fixture(); Object.assign(f.figure, { action: 'reload', frame: 2 }); f.sync(); expectBinding(f, 'reload', 1);
  f.scene.speed = 0; f.figure.frame = 0; f.sync(30); expectBinding(f, 'reload', 1);
  f.sync(40, true); expectBinding(f, 'reload', 1);
  f.figure.action = 'walk'; f.sync(50);
  expectBinding(f, 'march', gettysburgInfantryContactPhase(f.formation.id, f.figure.id));
  f.figure.action = 'reload'; f.figure.frame = 3; f.sync(60); expectBinding(f, 'reload', 0);
  f.scene.speed = 1; f.scene.reducedMotion = true;
  for (let frame = 0; frame < 4; frame++) { f.figure.frame = frame; f.sync(70 + frame); expectBinding(f, 'reload', 0); }
  f.figure.action = 'fire'; f.formation.lastVolleyAt = 80; f.sync(80.05);
  assert.equal(f.scene.smoke.circles.length, 0); assert.equal(f.scene.smoke.ellipses.length, 3);
  f.scene.reducedMotion = false; f.sync(80.05, true);
  assert.equal(f.scene.smoke.circles.length, 0); assert.equal(f.scene.smoke.ellipses.length, 0);
});

test('a missing real SE loading phase withholds both poses and clears fallback state without disabling E loading', pending, () => {
  const reload = clip(1, 'reload');
  const incomplete = prepareGettysburgInfantryClips(definitions, (key, frame) => hasFrame(key, frame)
    && !(key === reload.key && frame === reload.frames[1]));
  assert.equal(incomplete.length, 7);
  const f = fixture(); Object.assign(f.figure, { action: 'reload', frame: 2 }); f.sync();
  f.scene.infantryClips = incomplete;
  for (let frame = 0; frame < 4; frame++) { f.figure.frame = frame; f.sync(); expectAccepted(f); }
  f.figure.direction = 0; f.scene.speed = 0; f.sync(); expectBinding(f, 'reload', 0);
  f.figure.direction = 1; f.figure.action = 'fire'; f.sync(); expectBinding(f, 'fire', 0);
  for (const change of [{ direction: 6 }, { direction: 2 }, { action: 'melee' }, { action: 'fall', fallen: true }]) {
    const unsupported = fixture(); unsupported.sync(); Object.assign(unsupported.figure, change); unsupported.sync(); expectAccepted(unsupported);
  }
});

test('actual v6 preload retains every accepted fallback and requests one shared SE action atlas only on exact opt-in', pending, () => {
  const method = source.slice(source.indexOf('  preload() {'), source.indexOf('  create() {'));
  const Loader = vm.runInNewContext(`(class {${method}})`, {
    gettysburgInfantryFamilyAssets, gettysburgInfantryClipAssets, DETAILED_UNIT_PAGES, detailedUnitAssetDirectory,
    siegeTargetAssets: () => [], siegeTerrainAssets: () => [], landmarkField: () => ({ landmarks: [] }), PUBLIC_BASE: '',
  });
  const collect = (query, scenario = 'gettysburg') => {
    const loader = new Loader(); const urls = [];
    Object.assign(loader, { scenarioId: scenario, artPassSearch: query, engine: { fieldBattle: false, snapshot: () => ({}) },
      config: { terrain: { key: 'terrain', src: 'images/battles/gettysburg-terrain-v3.png' } },
      load: { image(_key, url) { urls.push(url); }, json(_key, url) { urls.push(url); }, atlas(_key, image, json) { urls.push(image, json); } } });
    loader.preload(); return urls;
  };
  const normal = collect(''); const candidate = collect(search);
  assert.ok(!normal.some(url => /\/gettysburg-v[3456]\//.test(url)));
  for (const url of normal) assert.ok(candidate.includes(url));
  assert.deepEqual(candidate.filter(url => !normal.includes(url)), assets.flatMap(asset => [asset.image, asset.json]));
  assert.equal(candidate.filter(url => url.endsWith('/gettysburg-v6/union-a-actions-se.png')).length, 1);
  assert.equal(candidate.filter(url => url.endsWith('/gettysburg-v6/union-a-actions-se.json')).length, 1);
  const v5 = collect('?artPass=gettysburg-v5');
  assert.deepEqual(candidate.filter(url => !v5.includes(url)), [
    'images/units/gettysburg-v6/union-a-actions-se.png', 'images/units/gettysburg-v6/union-a-actions-se.json',
  ]);
  for (const scenario of ['gettysburg_jackson', 'first_manassas', 'shiloh']) assert.ok(!collect(search, scenario).some(url => /\/gettysburg-v[3456]\//.test(url)));
});
