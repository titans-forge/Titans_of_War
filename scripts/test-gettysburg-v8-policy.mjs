import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { gettysburgInfantryClipAssets, gettysburgInfantryClipDefinitions } from '../src/battle/gettysburgInfantryClipAssets.js';
import { gettysburgInfantryClipPolicy } from '../src/battle/gettysburgInfantryClipPolicy.js';
import { GETTYSBURG_INFANTRY_CLIPS_IDS, gettysburgInfantryClipsEnabled, gettysburgInfantryClipPose,
  prepareGettysburgInfantryClips, validateGettysburgInfantryClip } from '../src/battle/gettysburgInfantryClips.js';
import { gettysburgInfantryFamilyAssets, gettysburgInfantryIdentity, gettysburgInfantryContactPhase } from '../src/battle/gettysburgInfantryFamily.js';
import { detailedInfantryPose, detailedUnitAssetDirectory, DETAILED_UNIT_PAGES } from '../src/battle/detailedUnitVisual.js';
import { deterministicUnitValue } from '../src/battle/formationMath.js';
import { formationStatusLabel } from '../src/battle/battleTactics.js';
import { gettysburgClipTestTextures } from './test-support/gettysburgClipTextures.mjs';

const search = '?artPass=gettysburg-v8';
const assets = gettysburgInfantryClipAssets('gettysburg', search);
const atlasPath = asset => new URL(`../public/${asset.json}`, import.meta.url);
const atlases = new Map(assets.filter(asset => existsSync(atlasPath(asset)))
  .map(asset => [asset.key, JSON.parse(readFileSync(atlasPath(asset)))]));
const loadedTextures = gettysburgClipTestTextures(atlases);
const definitions = gettysburgInfantryClipDefinitions('gettysburg', search, loadedTextures);
const prepare = textures => prepareGettysburgInfantryClips(
  gettysburgInfantryClipDefinitions('gettysburg', search, textures),
  (key, name) => textures.exists(key) && textures.get(key).has(name),
);
const clips = prepare(loadedTextures);
const swAssets = assets.filter(asset => asset.image.includes('/gettysburg-v8/'));
const swClips = clips.filter(clip => clip.direction === 3);
const completeSW = swAssets.every(asset => atlases.has(asset.key)) && swClips.length === 8;
const pending = { skip: completeSW || process.env.FORGE_REQUIRE_V8_DATA === '1'
  ? false : 'Pending real v8 Union SW A/B atlas metadata; no synthetic artwork substitute' };
const requireSW = () => assert.ok(completeSW, 'all four real v8 SW atlases and eight complete reviewed clips are required');
const formationId = 'v8-sw-policy';
const idFor = identity => Array.from({ length: 256 }, (_, id) => id)
  .find(id => gettysburgInfantryIdentity(formationId, id) === identity);
const pose = (figure, query = search, prepared = clips, side = 'union') => gettysburgInfantryClipPose(formationId, figure, 0,
  { scenarioId: 'gettysburg', search: query, clips: prepared, side, identity: 'a', versionedIdentity: true });
const source = readFileSync(new URL('../src/battle/CivilWarBattlefield.jsx', import.meta.url), 'utf8');
const createStart = source.indexOf('  create() {');
const createEnd = source.indexOf('    createStandardTextures(this);', createStart);
assert.ok(createStart >= 0 && createEnd > createStart);
// Run the actual scene initialization before its independent camera/UI setup.
const Initializer = vm.runInNewContext(`(class {${source.slice(createStart, createEnd)}  }})`, {
  createDetailedUnitTextures() {}, prepareGettysburgInfantryClips, gettysburgInfantryClipDefinitions,
});
function initialize(textures, query = search, scenarioId = 'gettysburg') {
  const scene = new Initializer();
  Object.assign(scene, { scenarioId, artPassSearch: query, textures });
  scene.create();
  return scene.infantryClips;
}

test('v3-v8 share exact selection, immutable descriptors and unchanged historical direction/identity policy', () => {
  const expected = [
    ['gettysburg-v3', 1, [0], false], ['gettysburg-v4', 2, [0], false],
    ['gettysburg-v5', 3, [0, 1], false], ['gettysburg-v6', 4, [0, 1], false],
    ['gettysburg-v7', 10, [0, 1, 2, 6], true], ['gettysburg-v8', 14, [0, 1, 2, 3, 6], true],
  ];
  assert.deepEqual(GETTYSBURG_INFANTRY_CLIPS_IDS, [...expected.map(([pass]) => pass), 'gettysburg-v9', 'gettysburg-v10', 'gettysburg-v11', 'gettysburg-v12', 'gettysburg-v13', 'gettysburg-v14', 'gettysburg-v15', 'gettysburg-v16', 'gettysburg-v17', 'gettysburg-v18']);
  for (const [pass, count, directions, stableUnionIdentity] of expected) {
    const query = `?artPass=${pass}`;
    const policy = gettysburgInfantryClipPolicy('gettysburg', query);
    assert.equal(gettysburgInfantryClipsEnabled('gettysburg', query), true);
    assert.deepEqual(policy.directions, directions);
    assert.equal(policy.stableUnionIdentity, stableUnionIdentity);
    assert.equal(gettysburgInfantryClipAssets('gettysburg', query).length, count);
    assert.ok(Object.isFrozen(policy) && Object.isFrozen(policy.atlases) && Object.isFrozen(policy.directions));
    for (const descriptor of policy.atlases) {
      assert.ok(Object.isFrozen(descriptor));
      assert.deepEqual(Object.keys(descriptor).sort(), ['directory', 'image', 'key']);
    }
  }
  assert.deepEqual(assets.slice(0, 10), gettysburgInfantryClipAssets('gettysburg', '?artPass=gettysburg-v7'));
  assert.deepEqual(swAssets.map(asset => asset.key), ['union-gettysburg-v8-a-march-sw', 'union-gettysburg-v8-a-actions-sw',
    'union-gettysburg-v8-b-march-sw', 'union-gettysburg-v8-b-actions-sw']);
  assert.equal(new Set(assets.map(asset => asset.key)).size, 14);
  for (const base of ['/game', '/game/', 'https://example.test/game/']) {
    const prefix = `${base.replace(/\/$/, '')}/`;
    assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', search, base),
      assets.map(asset => ({ key: asset.key, image: `${prefix}${asset.image}`, json: `${prefix}${asset.json}` })));
  }
});

test('default, unknown passes and non-Gettysburg scenarios touch no candidate texture or metadata', () => {
  const unavailable = { exists() { assert.fail('disabled pass checked a candidate texture'); }, get() { assert.fail('disabled pass read metadata'); } };
  const queries = ['', '?artPass=gettysburg-v8-other', '?other=gettysburg-v8', '?artPass=gettysburg-v19', '?artPass=__proto__', '?artPass=constructor'];
  for (const query of queries) {
    assert.equal(gettysburgInfantryClipsEnabled('gettysburg', query), false);
    assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', query), []);
    assert.deepEqual(gettysburgInfantryClipDefinitions('gettysburg', query, unavailable), []);
    assert.deepEqual(initialize(unavailable, query), []);
  }
  for (const scenario of ['gettysburg_meade', 'gettysburg_jackson', 'first_manassas', 'shiloh', null]) {
    assert.equal(gettysburgInfantryClipsEnabled(scenario, search), false);
    assert.deepEqual(gettysburgInfantryClipAssets(scenario, search), []);
    assert.deepEqual(gettysburgInfantryClipDefinitions(scenario, search, unavailable), []);
    assert.deepEqual(initialize(unavailable, search, scenario), []);
  }
});

test('actual preload requests every accepted fallback and exactly the selected atlases for each pass', () => {
  const preload = source.slice(source.indexOf('  preload() {'), createStart);
  const Loader = vm.runInNewContext(`(class {${preload}})`, {
    gettysburgInfantryFamilyAssets, gettysburgInfantryClipAssets, detailedUnitAssetDirectory, DETAILED_UNIT_PAGES,
    siegeTargetAssets: () => [], siegeTerrainAssets: () => [], landmarkField: () => ({ landmarks: [] }), PUBLIC_BASE: '/game/',
  });
  const collect = (query, scenarioId = 'gettysburg') => {
    const requests = [];
    const scene = new Loader();
    Object.assign(scene, { scenarioId, artPassSearch: query, engine: { fieldBattle: false, snapshot: () => ({}) },
      config: { terrain: { key: 'terrain', src: 'images/battles/gettysburg-terrain-v3.png' } },
      load: { image(key, image) { requests.push({ key, image }); }, json(key, json) { requests.push({ key, json }); },
        atlas(key, image, json) { requests.push({ key, image, json }); } } });
    scene.preload();
    return requests;
  };
  const normal = collect('');
  const candidate = request => /\/gettysburg-v(?:[3-9]|1[0134568])\//.test(request.image || request.json || '');
  assert.ok(!normal.some(candidate));
  for (const pass of GETTYSBURG_INFANTRY_CLIPS_IDS) {
    const query = `?artPass=${pass}`;
    const selected = collect(query);
    assert.deepEqual(selected.filter(candidate), gettysburgInfantryClipAssets('gettysburg', query, '/game/'));
    for (const request of normal) assert.ok(selected.some(item => JSON.stringify(item) === JSON.stringify(request)),
      `accepted fallback ${request.key} is still preloaded for ${pass}`);
  }
  for (const scenario of ['gettysburg_meade', 'gettysburg_jackson', 'first_manassas', 'shiloh']) assert.ok(!collect(search, scenario).some(candidate));
  assert.ok(!collect('?artPass=gettysburg-v19').some(candidate));
});

test('actual scene create reads only selected parser metadata and fails closed on missing, malformed or cross-bound metadata', () => {
  assert.deepEqual(gettysburgInfantryClipDefinitions('gettysburg', search), []);
  for (const textures of [{}, { exists: () => false, get() { assert.fail('missing textures must not be read'); } },
    { exists: () => true, get: () => ({}) }, { exists: () => true, get: () => ({ customData: { meta: { clips: 'invalid' } } }) },
    { exists: () => true, get() { throw new Error('texture failed'); } }]) assert.deepEqual(initialize(textures), []);
  const selected = gettysburgInfantryClipAssets('gettysburg', '?artPass=gettysburg-v3')[0];
  const v3Atlas = JSON.parse(readFileSync(atlasPath(selected)));
  const v3Textures = gettysburgClipTestTextures(new Map([[selected.key, v3Atlas]]));
  const reads = [];
  const exact = { exists: key => key === selected.key, get: key => {
    reads.push(key); assert.equal(key, selected.key); return v3Textures.get(key);
  } };
  assert.equal(initialize(exact, '?artPass=gettysburg-v3').length, 1, 'Phaser meta.clip remains supported for v3');
  assert.ok(reads.every(key => key === selected.key));
  const crossBound = structuredClone(v3Atlas);
  crossBound.meta.clip.key = assets[0].key;
  assert.deepEqual(initialize(gettysburgClipTestTextures(new Map([[selected.key, crossBound]])), '?artPass=gettysburg-v3'), []);
  delete v3Textures.get(selected.key).customData.meta;
  assert.deepEqual(initialize(v3Textures, '?artPass=gettysburg-v3'), []);
});

test('installed Phaser JSONHash and Frame preserve every real SW frame, metadata, normalized anchors and native bounds', pending, () => {
  requireSW();
  assert.equal(definitions.length, 28); assert.equal(initialize(loadedTextures).length, 28);
  for (const identity of ['a', 'b']) {
    const stationary = swClips.filter(clip => clip.identity === identity && clip.action !== 'march');
    assert.deepEqual(stationary.map(clip => clip.action).sort(), ['fire', 'ready', 'reload']);
    assert.equal(new Set(stationary.map(clip => clip.referenceHeight)).size, 1,
      'one stationary source reference prevents action-dependent resizing');
  }
  for (const asset of swAssets) {
    const atlas = atlases.get(asset.key);
    const texture = loadedTextures.get(asset.key);
    const bytes = readFileSync(new URL(`../public/${asset.image}`, import.meta.url));
    assert.deepEqual(texture.customData.meta, atlas.meta, 'installed Phaser parser retains full clip metadata');
    assert.equal(bytes[25], 6, 'native PNG remains RGBA');
    assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], [atlas.meta.size.w, atlas.meta.size.h]);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), atlas.meta.sha256);
    assert.deepEqual(bytes, readFileSync(new URL(`../${atlas.meta.source}`, import.meta.url)));
    assert.equal(atlas.meta.productionApproved, false);
    const occupied = new Set();
    for (const clip of atlas.meta.clips) {
      assert.deepEqual(validateGettysburgInfantryClip(clip), []);
      assert.equal(clip.key, asset.key); assert.equal(clip.sourceHash, atlas.meta.sha256);
      assert.equal(clip.side, 'union'); assert.equal(clip.direction, 3);
      for (const [phase, name] of clip.frames.entries()) {
        const entry = atlas.frames[name]; const frame = texture.get(name);
        const { x, y, w, h } = entry.frame;
        assert.ok([x, y, w, h].every(Number.isInteger));
        assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= atlas.meta.size.w && y + h <= atlas.meta.size.h);
        assert.equal(entry.rotated, false); assert.equal(entry.trimmed, false);
        assert.deepEqual([frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight], [x, y, w, h]);
        assert.deepEqual([frame.pivotX, frame.pivotY], [clip.pivots[phase].x, clip.pivots[phase].y]);
        assert.equal(frame.customData.bodyHeight, clip.referenceHeight);
        occupied.add(`${x},${y}`);
      }
    }
    assert.equal(occupied.size, 4, 'complete action samples occupy all four native cells');
  }
});

test('v8 Union identity stays stable across SW actions while old passes and unsupported views preserve fallback', pending, () => {
  requireSW();
  for (const identity of ['a', 'b']) {
    const id = idFor(identity);
    const contact = gettysburgInfantryContactPhase(formationId, id);
    for (const [action, count] of [['idle', 1], ['walk', 4], ['fire', 1], ['reload', 2]]) {
      for (let frame = 0; frame < 8; frame++) {
        const figure = { id, direction: 3, action, frame };
        const selected = pose(figure);
        assert.equal(selected.identity, identity); assert.equal(selected.direction, 3);
        assert.equal(selected.phase, action === 'walk' ? (frame + contact) % count : action === 'reload' ? Math.floor(frame / 2) % count : 0);
        for (const pass of GETTYSBURG_INFANTRY_CLIPS_IDS.filter(pass => !['gettysburg-v8', 'gettysburg-v9', 'gettysburg-v10', 'gettysburg-v11', 'gettysburg-v12', 'gettysburg-v13', 'gettysburg-v14', 'gettysburg-v15', 'gettysburg-v16', 'gettysburg-v17', 'gettysburg-v18'].includes(pass))) {
          assert.equal(pose(figure, `?artPass=${pass}`), null, `${pass} cannot acquire a SW view from the v8 registry`);
        }
      }
    }
    for (const direction of [-1, 4, 5, 7, 8, .5, NaN, undefined, '3']) assert.equal(pose({ id, direction, action: 'walk', frame: 0 }), null);
    for (const direction of [0, 1, 2, 3, 6]) {
      const figure = { id, direction, action: 'walk', frame: 0 };
      const selected = pose(figure);
      if (selected) assert.equal(selected.identity, identity);
      if (identity === 'b' && [0, 1, 6].includes(direction)) assert.equal(selected, null, 'missing Union B view cannot borrow A or Confederate N');
    }
    assert.equal(pose({ id, direction: 3, action: 'walk', frame: 0 }, search, clips, 'confederate'), null);
    assert.equal(pose({ id, direction: 6, action: 'walk', frame: 0 }, search, clips, 'confederate').identity, 'a');
    for (const pass of ['gettysburg-v3', 'gettysburg-v4', 'gettysburg-v5', 'gettysburg-v6']) {
      assert.equal(pose({ id, direction: 0, action: 'walk', frame: 0 }, `?artPass=${pass}`).identity, 'a');
    }
  }
});

class Display {
  constructor() { Object.assign(this, { visible: true, alpha: 1, input: { enabled: true }, scaleX: 1, scaleY: 1 }); }
  setTexture(key, name) {
    this.textureKey = key; this.frameName = name;
    this.frame = loadedTextures.get(key)?.get(name) || { pivotX: .5, pivotY: .98, realHeight: 450, customData: { bodyHeight: 450 } };
    return this;
  }
  setOrigin(x, y) { this.origin = { x, y }; return this; }
  setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setDepth() { return this; } setVisible(value) { this.visible = value; return this; }
  setAlpha(value) { this.alpha = value; return this; } setAngle() { return this; }
  setFlipX() { return this; } setTint() { return this; } setText() { return this; } setDisplaySize() { return this; }
  disableInteractive() { this.input.enabled = false; return this; }
}
const Renderer = vm.runInNewContext(`(class {${source.slice(source.indexOf('  syncFormation('), source.indexOf('  drawSelection('))}})`, {
  updateFormationVisual: state => {
    delete state.restoreFrame;
    return { figures: [state.figure], moving: false, facing: 3 * Math.PI / 4, footprint: [] };
  },
  detailedInfantryPose, gettysburgInfantryClipPose, deterministicUnitValue, formationStatusLabel,
  updateTravelDust: () => [], updatePeriodStandard() {},
});
function renderFixture(identity, prepared = clips) {
  const id = idFor(identity);
  const figure = { id, direction: 3, visible: true, frontRank: true, action: 'idle', frame: 0, scale: .82, x: 200, y: 200, alpha: 1 };
  const soldiers = Array.from({ length: id + 1 }, () => ({ sprite: new Display() }));
  const view = { soldiers, standard: new Display(), standardUI: null, hitArea: new Display(), label: new Display(),
    bar: new Display(), barBack: new Display(), condition: new Display(), flag: {}, realistic: true, detailed: true,
    infantryFamily: false, visual: { figure }, dust: {} };
  const formation = { id: formationId, side: 'union', type: 'infantry', active: true, x: 200, y: 200, strength: 100,
    initialStrength: 100, status: 'steady', order: 'hold', name: 'Test', ammunition: 50, lastVolleyAt: -Infinity, frontage: 120 };
  const graphics = { fillStyle() { return this; }, fillEllipse() { return this; }, fillCircle() { return this; } };
  const scene = new Renderer();
  Object.assign(scene, { scenarioId: 'gettysburg', artPassSearch: search, infantryClips: prepared, tactical: true,
    views: new Map([[formationId, view]]), speed: 1, reducedMotion: false, cameras: { main: { zoom: 1 } },
    shadows: graphics, smoke: graphics, dust: graphics });
  return { scene, figure, soldier: soldiers[id], sprite: soldiers[id].sprite,
    sync: (time = 1, resolving = false) => scene.syncFormation(formation, time, resolving, []) };
}
function assertAccepted(fixture) {
  assert.ok(!fixture.sprite.textureKey.includes('gettysburg-v'));
  assert.equal(fixture.soldier.clipPhase, undefined); assert.equal(fixture.soldier.clipAction, undefined);
}

test('actual renderer binds both SW identities to all complete action phases and retains paused/reduced-motion phases', pending, () => {
  requireSW();
  for (const identity of ['a', 'b']) {
    const fixture = renderFixture(identity, initialize(loadedTextures));
    const fixed = gettysburgInfantryContactPhase(formationId, fixture.figure.id);
    for (const action of ['idle', 'walk', 'fire', 'reload']) {
      for (let frame = 0; frame < 4; frame++) {
        Object.assign(fixture.figure, { action, frame }); fixture.sync(1 + frame);
        const expected = pose(fixture.figure);
        assert.equal(fixture.sprite.textureKey, expected.key); assert.equal(fixture.sprite.frameName, expected.frame);
        assert.deepEqual(fixture.sprite.origin, expected.pivot);
        assert.equal(fixture.sprite.scaleX, fixture.sprite.scaleY);
        assert.equal(fixture.sprite.scaleX, 58 * fixture.figure.scale / expected.referenceHeight * expected.width);
      }
    }
    fixture.scene.speed = 0; fixture.figure.frame = 0; fixture.sync(10);
    assert.equal(fixture.soldier.clipPhase, 1);
    fixture.sync(20, true); assert.equal(fixture.soldier.clipPhase, 1);
    fixture.scene.reducedMotion = true; fixture.sync(30); assert.equal(fixture.soldier.clipPhase, 0);
    fixture.figure.action = 'walk'; fixture.sync(40); assert.equal(fixture.soldier.clipPhase, fixed);
    fixture.figure.direction = 4; fixture.sync(50); assertAccepted(fixture);
  }
});

test('actual scene initialization withholds the whole missing SW action and renderer never borrows identity, bearing or action', pending, () => {
  requireSW();
  const missing = gettysburgClipTestTextures(atlases);
  const reload = swClips.find(clip => clip.identity === 'b' && clip.action === 'reload');
  missing.get(reload.key).frames.delete(reload.frames[1]);
  const incomplete = initialize(missing);
  assert.equal(incomplete.length, 27);
  assert.ok(!incomplete.some(clip => clip.direction === 3 && clip.identity === 'b' && clip.action === 'reload'));
  const fixture = renderFixture('b');
  Object.assign(fixture.figure, { action: 'reload', frame: 2 }); fixture.sync(); assert.equal(fixture.soldier.clipPhase, 1);
  fixture.scene.infantryClips = incomplete;
  for (let frame = 0; frame < 4; frame++) { fixture.figure.frame = frame; fixture.sync(); assertAccepted(fixture); }
  fixture.figure.action = 'fire'; fixture.sync(); assert.equal(fixture.sprite.textureKey, reload.key);
  const noB = gettysburgClipTestTextures(atlases);
  for (const asset of swAssets.filter(asset => asset.key.includes('-b-'))) noB.loaded.delete(asset.key);
  fixture.scene.infantryClips = initialize(noB);
  for (const action of ['idle', 'walk', 'fire', 'reload']) { fixture.figure.action = action; fixture.sync(); assertAccepted(fixture); }
  const noMeta = gettysburgClipTestTextures(atlases);
  delete noMeta.get(reload.key).customData.meta;
  assert.equal(initialize(noMeta).length, 25, 'missing action-atlas metadata removes all three stationary actions');
});

// Exercise the actual renderer with its newly restored visual-frame signal.
test('resumed paused candidate sprites reconstruct the saved phase before freezing it', pending, () => {
  requireSW();
  for (const identity of ['a', 'b']) {
    for (const action of ['walk', 'reload']) {
      const fixture = renderFixture(identity);
      fixture.scene.speed = 0;
      Object.assign(fixture.figure, { action, frame: 2 });
      fixture.scene.views.get(formationId).visual.restoreFrame = true;
      const expected = pose(fixture.figure);
      fixture.sync(10);
      assert.equal(fixture.sprite.frameName, expected.frame, 'first paused restore reconstructs the saved pose');
      assert.equal(fixture.soldier.clipPhase, expected.phase);
      fixture.figure.frame = 0;
      fixture.sync(20);
      assert.equal(fixture.sprite.frameName, expected.frame, 'subsequent paused frames retain the reconstructed pose');
    }
  }
});
