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
import { gettysburgClipTestTextures } from './test-support/gettysburgClipTextures.mjs';

const search = '?artPass=gettysburg-v5';
const assets = gettysburgInfantryClipAssets('gettysburg', search);
const atlases = new Map(assets.map(asset => [asset.key, JSON.parse(readFileSync(new URL(`../public/${asset.json}`, import.meta.url)))]));
const textures = gettysburgClipTestTextures(atlases);
const definitions = gettysburgInfantryClipDefinitions('gettysburg', search, textures);
const hasFrame = (key, frame) => Boolean(atlases.get(key)?.frames[frame]);
const prepared = prepareGettysburgInfantryClips(definitions, hasFrame);
const east = new Map(definitions.filter(clip => clip.direction === 0).map(clip => [clip.action, clip]));
const southeast = definitions.find(clip => clip.direction === 1 && clip.action === 'march');
const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const options = { scenarioId: 'gettysburg', search, side: 'union', identity: 'a', clips: prepared };

test('v5 enables only the exact scenario and query, preserving identity and invalid-direction fallback', () => {
  assert.equal(gettysburgInfantryClipsEnabled('gettysburg', search), true);
  for (const query of ['', '?artPass=gettysburg-v5-other', '?other=gettysburg-v5']) {
    assert.equal(gettysburgInfantryClipsEnabled('gettysburg', query), false);
    assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', query), []);
    assert.deepEqual(gettysburgInfantryClipDefinitions('gettysburg', query), []);
  }
  for (const scenario of ['gettysburg_jackson', 'gettysburg_meade', 'first_manassas', 'shiloh', null]) {
    assert.equal(gettysburgInfantryClipsEnabled(scenario, search), false);
    assert.deepEqual(gettysburgInfantryClipAssets(scenario, search), []);
    assert.deepEqual(gettysburgInfantryClipDefinitions(scenario, search), []);
  }
  const figure = { id: 0, direction: 0, action: 'idle', frame: 0 };
  assert.ok(gettysburgInfantryClipPose('v5-gate', figure, 0, options));
  for (const direction of [-1, 2, 3, 4, 5, 6, 7, 8, .5, NaN, undefined, '0']) {
    assert.equal(gettysburgInfantryClipPose('v5-gate', { ...figure, direction }, 0, options), null);
  }
  for (const side of ['confederate', 'unknown', undefined]) assert.equal(gettysburgInfantryClipPose('v5-gate', figure, 0, { ...options, side }), null);
  for (const identity of ['b', 'unknown', null]) assert.equal(gettysburgInfantryClipPose('v5-gate', figure, 0, { ...options, identity }), null);
  const missingB = Array.from({ length: 100 }, (_, id) => id).find(id => gettysburgInfantryIdentity('v5-gate', id) === 'b');
  assert.equal(gettysburgInfantryClipPose('v5-gate', { ...figure, id: missingB }, 0, { ...options, identity: undefined }), null);
  assert.equal(gettysburgInfantryClipPose('v5-gate', { ...figure, fallen: true }, 0, options), null);
  assert.equal(gettysburgInfantryClipPose('v5-gate', { ...figure, action: 'unknown' }, 0, options), null);
  assert.equal(gettysburgInfantryClipPose('v5-gate', null, 0, options), null);
});

test('v5 retains the reviewed v4 E gait and binds all stationary actions to one unchanged 485px source', () => {
  assert.equal(assets.length, 3); assert.equal(definitions.length, 5);
  assert.deepEqual([...east.keys()].sort(), ['fire', 'march', 'ready', 'reload']);
  assert.equal(prepared.length, definitions.length);
  assert.equal(east.get('march').key, 'union-gettysburg-v4-march-e');
  assert.equal(east.get('march').sourceHash, '43b8f4394b6071958b693d83c14eb7f324e277706bd5513d23b536467e9f6a42');
  for (const action of ['ready', 'fire', 'reload']) {
    assert.equal(east.get(action).key, 'union-gettysburg-v5-actions-e');
    assert.equal(east.get(action).referenceHeight, 485);
  }
  assert.deepEqual(Object.fromEntries([...east].map(([action, clip]) => [action, clip.frames.length])), { march: 4, ready: 1, fire: 1, reload: 2 });
  assert.equal(new Set(assets.map(asset => asset.key)).size, assets.length, 'each shared atlas loads once');
  assert.equal(assets.filter(asset => asset.image.includes('/gettysburg-v5/union-a-actions-e.png')).length, 1);
  assert.equal(southeast?.key, 'union-gettysburg-v5-march-se');
  assert.equal(southeast.referenceHeight, 490);
  assert.equal(southeast.sourceHash, '90a124967a778789bcdbaf5b83fc0cba689f145486450ba775798ec106bfc103');
  assert.deepEqual(southeast.frames, ['a-march-1-0', 'a-march-1-1', 'a-march-1-2', 'a-march-1-3']);
  for (const asset of assets) {
    const atlas = atlases.get(asset.key);
    const bytes = readFileSync(new URL(`../public/${asset.image}`, import.meta.url));
    assert.deepEqual(bytes, readFileSync(new URL(`../${atlas.meta.source}`, import.meta.url)), 'native source bytes remain unchanged');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), atlas.meta.sha256);
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(bytes[25], 6, 'PNG is native RGBA');
    assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], [atlas.meta.size.w, atlas.meta.size.h]);
    assert.equal(atlas.meta.productionApproved, false);
    const cells = new Set();
    for (const clip of atlas.meta.clips) {
      assert.deepEqual(validateGettysburgInfantryClip(clip), []);
      assert.equal(clip.sourceHash, atlas.meta.sha256);
      assert.deepEqual([clip.side, clip.identity], ['union', 'a']);
      assert.ok([0, 1].includes(clip.direction));
      if (clip.direction === 1) assert.equal(clip.action, 'march', 'this pass has no SE stationary-action artwork');
      for (const [phase, name] of clip.frames.entries()) {
        const entry = atlas.frames[name];
        const { x, y, w, h } = entry.frame;
        assert.ok([x, y, w, h].every(Number.isInteger));
        assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= atlas.meta.size.w && y + h <= atlas.meta.size.h);
        assert.equal(w * 2, atlas.meta.size.w);
        assert.equal(h * 2, atlas.meta.size.h);
        assert.equal(x % w, 0); assert.equal(y % h, 0);
        assert.equal(entry.rotated, false); assert.equal(entry.trimmed, false);
        assert.deepEqual(entry.sourceSize, { w, h });
        assert.equal(entry.bodyHeight, clip.referenceHeight);
        assert.deepEqual(entry.pivot, clip.pivots[phase]);
        cells.add(`${x},${y}`);
      }
    }
    assert.equal(cells.size, 4, 'all four native cells belong to complete actions');
  }
});

// Execute the real renderer methods with real atlas rectangles and retained
// smoke primitives. The fixture supplies visual figures directly; this checks
// render binding, not anatomy, historical drill, or a played battle.
class Display {
  constructor() { Object.assign(this, { alpha: 1, visible: true, input: { enabled: true }, scaleX: 1, scaleY: 1 }); }
  setTexture(key, name) {
    const entry = atlases.get(key)?.frames[name];
    assert.ok(!atlases.has(key) || entry, `requested candidate frame exists: ${key}/${name}`);
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
const syncMethod = source.slice(source.indexOf('  syncFormation('), source.indexOf('  drawSelection('));
const Renderer = vm.runInNewContext(`(class {${syncMethod}})`, {
  updateFormationVisual: visual => ({ figures: [visual.figure], footprint: [], moving: false, facing: visual.facing }),
  detailedInfantryPose, gettysburgInfantryClipPose, deterministicUnitValue, formationStatusLabel,
  updateTravelDust: () => [], updatePeriodStandard() {},
});
function fixture(clips = prepared, query = search) {
  const formation = { id: 'v5-renderer-test', side: 'union', type: 'infantry', active: true, x: 100, y: 200,
    strength: 100, initialStrength: 100, order: 'hold', status: 'steady', name: 'Test', ammunition: 50,
    lastVolleyAt: -100, frontage: 70, facing: 0 };
  const figure = { id: 0, visible: true, frontRank: true, direction: 0, action: 'idle', frame: 0, scale: .82, x: 100, y: 200, alpha: 1 };
  const sprite = new Display();
  const view = { soldiers: [{ sprite }], standard: new Display(), standardUI: null, hitArea: new Display(),
    label: new Display(), bar: new Display(), barBack: new Display(), condition: new Display(), flag: {},
    realistic: true, detailed: true, infantryFamily: false, visual: { figure, facing: 0 }, dust: {} };
  const scene = new Renderer();
  Object.assign(scene, { scenarioId: 'gettysburg', artPassSearch: query, infantryClips: clips,
    views: new Map([[formation.id, view]]), tactical: true, speed: 1, reducedMotion: false,
    cameras: { main: { zoom: 1 } }, shadows: new Graphics(), dust: new Graphics(), smoke: new Graphics() });
  const sync = (time = 1, resolving = false) => { scene.smoke.clear(); scene.syncFormation(formation, time, resolving, []); };
  return { scene, formation, figure, sprite, view, soldier: view.soldiers[0], sync };
}
function expectBinding(f, clip, phase) {
  const pose = gettysburgInfantryClipPose(f.formation.id, f.figure, 0, { ...options, search: f.scene.artPassSearch, clips: f.scene.infantryClips });
  assert.equal(f.sprite.textureKey, clip.key);
  assert.equal(f.sprite.frameName, clip.frames[phase]);
  assert.deepEqual(f.sprite.origin, clip.pivots[phase]);
  near(f.sprite.scaleX, 58 * f.figure.scale / clip.referenceHeight * pose.width);
  assert.equal(f.sprite.scaleX, f.sprite.scaleY, 'uniform scaling preserves the native aspect ratio');
  assert.deepEqual([f.sprite.x, f.sprite.y], [f.figure.x, f.figure.y]);
  assert.equal(f.soldier.clipAction, clip.action); assert.equal(f.soldier.clipPhase, phase);
}
function expectAccepted(f) {
  assert.ok(!f.sprite.textureKey.includes('gettysburg-v') && !f.sprite.textureKey.includes('synthetic'), 'fallback uses accepted artwork directly');
  assert.equal(f.soldier.clipAction, undefined); assert.equal(f.soldier.clipPhase, undefined);
}

test('actual preload preserves accepted assets, adds only the selected atlases, and requests none by default', () => {
  const preloadMethod = source.slice(source.indexOf('  preload() {'), source.indexOf('  create() {'));
  const Loader = vm.runInNewContext(`(class {${preloadMethod}})`, {
    gettysburgInfantryFamilyAssets, gettysburgInfantryClipAssets, DETAILED_UNIT_PAGES, detailedUnitAssetDirectory,
    siegeTargetAssets: () => [], siegeTerrainAssets: () => [], landmarkField: () => ({ landmarks: [] }), PUBLIC_BASE: '',
  });
  const collect = (query, scenario = 'gettysburg') => {
    const loader = new Loader();
    const urls = [];
    Object.assign(loader, { scenarioId: scenario, artPassSearch: query,
      engine: { fieldBattle: false, snapshot: () => ({}) }, config: { terrain: { key: 'terrain', src: 'images/battles/gettysburg-terrain-v3.png' } },
      load: { image(_key, url) { urls.push(url); }, json(_key, url) { urls.push(url); }, atlas(_key, image, json) { urls.push(image, json); } } });
    loader.preload(); return urls;
  };
  const normal = collect('');
  assert.ok(!normal.some(url => /\/gettysburg-v[345]\//.test(url)));
  const candidate = collect(search);
  for (const url of normal) assert.ok(candidate.includes(url), `accepted fallback retained: ${url}`);
  assert.deepEqual(candidate.filter(url => !normal.includes(url)), assets.flatMap(asset => [asset.image, asset.json]));
  assert.ok(!candidate.some(url => /\/gettysburg-v3\//.test(url)));
  for (const scenario of ['gettysburg_jackson', 'first_manassas', 'shiloh']) {
    assert.ok(!collect(search, scenario).some(url => /\/gettysburg-v[345]\//.test(url)));
  }
  const rooted = gettysburgInfantryClipAssets('gettysburg', search, '/game/');
  assert.deepEqual(rooted.map(asset => asset.image), assets.map(asset => `/game/${asset.image}`));
});

test('actual E action transitions keep common stationary scale and use each authored pivot', () => {
  const f = fixture();
  const scales = [];
  for (const [action, frame, clipAction, phase] of [
    ['idle', 0, 'ready', 0], ['fire', 3, 'fire', 0], ['reload', 0, 'reload', 0],
    ['reload', 1, 'reload', 0], ['reload', 2, 'reload', 1], ['reload', 3, 'reload', 1], ['idle', 0, 'ready', 0],
  ]) {
    Object.assign(f.figure, { action, frame }); f.sync(); expectBinding(f, east.get(clipAction), phase); scales.push(f.sprite.scaleX);
  }
  assert.ok(scales.every(scale => scale === scales[0]), 'ready, fire, and both loading states share one 485px reference');
  f.figure.action = 'walk';
  const contact = gettysburgInfantryContactPhase(f.formation.id, f.figure.id);
  for (let frame = 0; frame < 4; frame++) {
    f.figure.frame = frame; f.sync(); expectBinding(f, east.get('march'), (frame + contact) % 4);
  }
});

test('actual E firing places flash and smoke at the authored barrel mouth and retains that volley origin', () => {
  const f = fixture();
  const fire = east.get('fire');
  f.figure.action = 'fire'; f.formation.lastVolleyAt = 10; f.sync(10); expectBinding(f, fire, 0);
  const muzzle = {
    x: f.figure.x + (fire.muzzles[0].x - fire.pivots[0].x) * f.sprite.frame.realWidth * f.sprite.scaleX,
    y: f.figure.y + (fire.muzzles[0].y - fire.pivots[0].y) * f.sprite.frame.realHeight * f.sprite.scaleY,
  };
  near(f.soldier.clipVolleyMuzzle.x, muzzle.x); near(f.soldier.clipVolleyMuzzle.y, muzzle.y);
  assert.equal(f.scene.smoke.circles.length, 1); assert.equal(f.scene.smoke.ellipses.length, 3);
  near(f.scene.smoke.circles[0].x, muzzle.x); near(f.scene.smoke.circles[0].y, muzzle.y);
  near(f.scene.smoke.ellipses[0].x, muzzle.x); near(f.scene.smoke.ellipses[0].y, muzzle.y);
  Object.assign(f.figure, { action: 'reload', frame: 2, x: 130, y: 230 }); f.sync(10.25);
  expectBinding(f, east.get('reload'), 1);
  near(f.soldier.clipVolleyMuzzle.x, muzzle.x); near(f.soldier.clipVolleyMuzzle.y, muzzle.y);
  near(f.scene.smoke.ellipses[0].x, muzzle.x + .25 * 14 * .82);
  near(f.scene.smoke.ellipses[0].y, muzzle.y - .25 * 9);
  Object.assign(f.figure, { direction: 1, action: 'fire', x: 160, y: 240 });
  f.formation.lastVolleyAt = 20; f.sync(20.05); expectAccepted(f);
  const age = 20.05 - 20;
  near(f.scene.smoke.ellipses[0].x, 160 + 15 * .82 + age * 14 * .82);
  near(f.scene.smoke.ellipses[0].y, 240 - 24 * .82 - age * 9);
  assert.equal(f.scene.smoke.circles.length, 0, 'a later unsupported SE volley cannot flash at an earlier E muzzle');
});

test('pause and resolution retain matching action phases; reduced motion fixes phases and suppresses flash', () => {
  const f = fixture();
  Object.assign(f.figure, { action: 'reload', frame: 2 }); f.sync(); expectBinding(f, east.get('reload'), 1);
  f.scene.speed = 0; f.figure.frame = 0; f.sync(20); expectBinding(f, east.get('reload'), 1);
  f.sync(30, true); expectBinding(f, east.get('reload'), 1);
  f.figure.action = 'walk'; f.sync(40);
  expectBinding(f, east.get('march'), gettysburgInfantryContactPhase(f.formation.id, f.figure.id));
  f.figure.action = 'reload'; f.figure.frame = 3; f.sync(50); expectBinding(f, east.get('reload'), 0);
  f.scene.speed = 1; f.scene.reducedMotion = true;
  for (let frame = 0; frame < 4; frame++) {
    Object.assign(f.figure, { action: 'reload', frame }); f.sync(60 + frame); expectBinding(f, east.get('reload'), 0);
    f.figure.action = 'walk'; f.sync(70 + frame);
    expectBinding(f, east.get('march'), gettysburgInfantryContactPhase(f.formation.id, f.figure.id));
  }
  f.figure.action = 'fire'; f.formation.lastVolleyAt = 80; f.sync(80.05);
  assert.equal(f.scene.smoke.circles.length, 0); assert.equal(f.scene.smoke.ellipses.length, 3);
  f.scene.reducedMotion = false; f.sync(80.05, true);
  assert.equal(f.scene.smoke.circles.length, 0); assert.equal(f.scene.smoke.ellipses.length, 0);
});

test('the real reviewed SE atlas renders all matching E phases and old passes remain E-only', () => {
  assert.ok(southeast, 'the reviewed real SE clip must be registered; this test never substitutes synthetic artwork');
  const f = fixture();
  f.figure.action = 'walk';
  const contact = gettysburgInfantryContactPhase(f.formation.id, f.figure.id);
  for (let frame = 0; frame < 4; frame++) {
    f.figure.frame = frame;
    for (const direction of [0, 1, 0]) {
      f.figure.direction = direction; f.sync(); expectBinding(f, direction ? southeast : east.get('march'), (frame + contact) % 4);
      if (direction) assert.equal(f.sprite.textureKey, 'union-gettysburg-v5-march-se');
    }
  }
  f.figure.frame = 2; f.sync(); const retained = f.soldier.clipPhase;
  f.scene.speed = 0; f.figure.frame = 0;
  for (const direction of [1, 0]) { f.figure.direction = direction; f.sync(100); expectBinding(f, direction ? southeast : east.get('march'), retained); }
  for (const query of ['?artPass=gettysburg-v3', '?artPass=gettysburg-v4']) {
    f.scene.artPassSearch = query; f.figure.direction = 0; f.sync();
    f.figure.direction = 1; f.sync(); expectAccepted(f);
  }
  f.scene.artPassSearch = search;
  for (const action of ['idle', 'fire', 'reload']) { f.figure.action = action; f.sync(); expectAccepted(f); }
});

test('the real SE march retains direction-specific pivots and its uniform 490px reference under reduced motion and resolution', () => {
  const f = fixture();
  f.scene.reducedMotion = true; f.figure.action = 'walk';
  const phase = gettysburgInfantryContactPhase(f.formation.id, f.figure.id);
  for (let frame = 0; frame < 4; frame++) {
    f.figure.frame = frame;
    f.figure.direction = 0; f.sync(); expectBinding(f, east.get('march'), phase);
    const eastScale = f.sprite.scaleX;
    f.figure.direction = 1; f.sync(); expectBinding(f, southeast, phase);
    near(eastScale / f.sprite.scaleX, 490 / 412, 1e-8);
  }
  f.scene.reducedMotion = false; f.figure.frame = 2; f.sync();
  const retained = f.soldier.clipPhase;
  f.figure.frame = 0; f.sync(100, true); expectBinding(f, southeast, retained);
  f.figure.direction = 0; f.sync(100, true); expectBinding(f, east.get('march'), retained);
});

test('unsupported bearings and missing phases clear retained state and use accepted artwork for the complete action', () => {
  for (const change of [{ direction: 2 }, { direction: 6 }, { action: 'melee' }, { fallen: true, action: 'fall' }]) {
    const f = fixture(); Object.assign(f.figure, { action: 'reload', frame: 2 }); f.sync();
    Object.assign(f.figure, change); f.sync(); expectAccepted(f);
    Object.assign(f.figure, { direction: 0, fallen: false, action: 'reload', frame: 3 });
    f.scene.speed = 0; f.sync(); expectBinding(f, east.get('reload'), 0);
  }
  const noReload = prepareGettysburgInfantryClips(definitions, (key, name) => hasFrame(key, name)
    && !(key === east.get('reload').key && name === east.get('reload').frames[1]));
  const f = fixture(); Object.assign(f.figure, { action: 'reload', frame: 2 }); f.sync();
  f.scene.infantryClips = noReload;
  for (let frame = 0; frame < 4; frame++) { f.figure.frame = frame; f.sync(); expectAccepted(f); }
  f.figure.action = 'fire'; f.sync(); expectBinding(f, east.get('fire'), 0);
  const noSE = prepareGettysburgInfantryClips(definitions, (key, name) => hasFrame(key, name)
    && !(key === southeast.key && name === southeast.frames[3]));
  assert.equal(noSE.length, 4, 'one missing real SE phase withholds its entire clip only');
  const diagonal = fixture(); Object.assign(diagonal.figure, { direction: 1, action: 'walk', frame: 2 }); diagonal.sync();
  diagonal.scene.infantryClips = noSE;
  for (let frame = 0; frame < 4; frame++) { diagonal.figure.frame = frame; diagonal.sync(); expectAccepted(diagonal); }
  diagonal.figure.direction = 0; diagonal.scene.speed = 0; diagonal.sync();
  expectBinding(diagonal, east.get('march'), gettysburgInfantryContactPhase(diagonal.formation.id, diagonal.figure.id));
});
