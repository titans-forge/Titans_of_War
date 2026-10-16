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
import { fieldTextureBudget } from '../src/battle/fieldPerformance.js';
import { GETTYSBURG_MOTION_STUDIES as ALL_GETTYSBURG_MOTION_STUDIES, getGettysburgMotionStudyCell } from '../src/battle/gettysburgMotionStudies.js';
import { createGettysburgActionSequence, createGettysburgActionTurnSequence, createGettysburgTurnSequence,
  getGettysburgMotionPlaybackPresets, getGettysburgMotionPlaybackInitialPreset,
  createGettysburgMotionPlaybackState } from '../src/battle/gettysburgMotionPlayback.js';

// Historical assertions inspect every prior study; v14 and v15 each have a strict suite.
const GETTYSBURG_MOTION_STUDIES = ALL_GETTYSBURG_MOTION_STUDIES.filter(study => !study.id.endsWith('-v14') && !study.id.endsWith('-v15')); 

const search = '?artPass=gettysburg-v9';
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
const westAssets = assets.filter(asset => asset.image.includes('/gettysburg-v9/'));
const westClips = clips.filter(clip => clip.direction === 4);
const completeWest = westAssets.every(asset => atlases.has(asset.key)) && westClips.length === 8;
const pending = { skip: westAssets.some(asset => atlases.has(asset.key)) || process.env.FORGE_REQUIRE_V9_DATA === '1'
  ? false : 'Pending real v9 Union W A/B atlas metadata; no synthetic artwork substitute' };
const requireWest = () => assert.ok(completeWest, 'all four real v9 W atlases and eight complete reviewed clips are required');
const formationId = 'v9-west-policy';
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

test('v9 retains every historical policy and appends exactly four immutable W atlases', () => {
  const expected = [
    ['gettysburg-v3', 1, [0], false], ['gettysburg-v4', 2, [0], false],
    ['gettysburg-v5', 3, [0, 1], false], ['gettysburg-v6', 4, [0, 1], false],
    ['gettysburg-v7', 10, [0, 1, 2, 6], true], ['gettysburg-v8', 14, [0, 1, 2, 3, 6], true],
    ['gettysburg-v9', 18, [0, 1, 2, 3, 4, 6], true],
  ];
  assert.deepEqual(GETTYSBURG_INFANTRY_CLIPS_IDS, [...expected.map(([pass]) => pass), 'gettysburg-v10', 'gettysburg-v11', 'gettysburg-v12', 'gettysburg-v13', 'gettysburg-v14', 'gettysburg-v15', 'gettysburg-v16', 'gettysburg-v17', 'gettysburg-v18']);
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
  assert.deepEqual(assets.slice(0, 14), gettysburgInfantryClipAssets('gettysburg', '?artPass=gettysburg-v8'));
  assert.deepEqual(westAssets.map(asset => asset.key), ['union-gettysburg-v9-a-march-w', 'union-gettysburg-v9-a-actions-w',
    'union-gettysburg-v9-b-march-w', 'union-gettysburg-v9-b-actions-w']);
  assert.equal(new Set(assets.map(asset => asset.key)).size, 18);
  for (const base of ['/game', '/game/', 'https://example.test/game/']) {
    const prefix = `${base.replace(/\/$/, '')}/`;
    assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', search, base),
      assets.map(asset => ({ key: asset.key, image: `${prefix}${asset.image}`, json: `${prefix}${asset.json}` })));
  }
});

test('default, unknown passes and non-Gettysburg scenarios touch no candidate texture or metadata', () => {
  const unavailable = { exists() { assert.fail('disabled pass checked a candidate texture'); }, get() { assert.fail('disabled pass read metadata'); } };
  const queries = ['', '?artPass=gettysburg-v9-other', '?other=gettysburg-v9', '?artPass=gettysburg-v19', '?artPass=__proto__', '?artPass=constructor'];
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

test('installed Phaser JSONHash and Frame preserve every real W frame, metadata, normalized anchors and native bounds', pending, () => {
  requireWest();
  assert.equal(definitions.length, 36); assert.equal(initialize(loadedTextures).length, 36);
  for (const identity of ['a', 'b']) {
    const stationary = westClips.filter(clip => clip.identity === identity && clip.action !== 'march');
    assert.deepEqual(stationary.map(clip => clip.action).sort(), ['fire', 'ready', 'reload']);
    assert.equal(new Set(stationary.map(clip => clip.referenceHeight)).size, 1,
      'one stationary source reference prevents action-dependent resizing');
  }
  for (const asset of westAssets) {
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
      assert.equal(clip.side, 'union'); assert.equal(clip.direction, 4);
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

test('v9 Union identity stays stable across W actions while old passes and unsupported views preserve fallback', pending, () => {
  requireWest();
  for (const identity of ['a', 'b']) {
    const id = idFor(identity);
    const contact = gettysburgInfantryContactPhase(formationId, id);
    for (const [action, count] of [['idle', 1], ['walk', 4], ['fire', 1], ['reload', 2]]) {
      for (let frame = 0; frame < 8; frame++) {
        const figure = { id, direction: 4, action, frame };
        const selected = pose(figure);
        assert.equal(selected.identity, identity); assert.equal(selected.direction, 4);
        assert.equal(selected.phase, action === 'walk' ? (frame + contact) % count : action === 'reload' ? Math.floor(frame / 2) % count : 0);
        for (const pass of GETTYSBURG_INFANTRY_CLIPS_IDS.filter(pass => !['gettysburg-v9', 'gettysburg-v10', 'gettysburg-v11', 'gettysburg-v12', 'gettysburg-v13', 'gettysburg-v14', 'gettysburg-v15', 'gettysburg-v16', 'gettysburg-v17', 'gettysburg-v18'].includes(pass))) {
          assert.equal(pose(figure, `?artPass=${pass}`), null, `${pass} cannot acquire a W view from the v9 registry`);
        }
      }
    }
    for (const direction of [-1, 5, 7, 8, .5, NaN, undefined, '4']) assert.equal(pose({ id, direction, action: 'walk', frame: 0 }), null);
    for (const direction of [0, 1, 2, 3, 4, 6]) {
      const figure = { id, direction, action: 'walk', frame: 0 };
      const selected = pose(figure);
      if (selected) assert.equal(selected.identity, identity);
      if (identity === 'b' && [0, 1, 6].includes(direction)) assert.equal(selected, null, 'missing Union B view cannot borrow A or Confederate N');
    }
    assert.equal(pose({ id, direction: 4, action: 'walk', frame: 0 }, search, clips, 'confederate'), null);
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
    return { figures: [state.figure], moving: false, facing: Math.PI, footprint: [] };
  },
  detailedInfantryPose, gettysburgInfantryClipPose, deterministicUnitValue, formationStatusLabel,
  updateTravelDust: () => [], updatePeriodStandard() {},
});
function renderFixture(identity, prepared = clips) {
  const id = idFor(identity);
  const figure = { id, direction: 4, visible: true, frontRank: true, action: 'idle', frame: 0, scale: .82, x: 200, y: 200, alpha: 1 };
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

test('actual renderer binds both W identities to all complete action phases and retains paused/reduced-motion phases', pending, () => {
  requireWest();
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
    fixture.figure.direction = 5; fixture.sync(50); assertAccepted(fixture);
  }
});

test('actual scene initialization withholds the whole missing W action and renderer never borrows identity, bearing or action', pending, () => {
  requireWest();
  const missing = gettysburgClipTestTextures(atlases);
  const reload = westClips.find(clip => clip.identity === 'b' && clip.action === 'reload');
  missing.get(reload.key).frames.delete(reload.frames[1]);
  const incomplete = initialize(missing);
  assert.equal(incomplete.length, 35);
  assert.ok(!incomplete.some(clip => clip.direction === 4 && clip.identity === 'b' && clip.action === 'reload'));
  const fixture = renderFixture('b');
  Object.assign(fixture.figure, { action: 'reload', frame: 2 }); fixture.sync(); assert.equal(fixture.soldier.clipPhase, 1);
  fixture.scene.infantryClips = incomplete;
  for (let frame = 0; frame < 4; frame++) { fixture.figure.frame = frame; fixture.sync(); assertAccepted(fixture); }
  fixture.figure.action = 'fire'; fixture.sync(); assert.equal(fixture.sprite.textureKey, reload.key);
  const noB = gettysburgClipTestTextures(atlases);
  for (const asset of westAssets.filter(asset => asset.key.includes('-b-'))) noB.loaded.delete(asset.key);
  fixture.scene.infantryClips = initialize(noB);
  for (const action of ['idle', 'walk', 'fire', 'reload']) { fixture.figure.action = action; fixture.sync(); assertAccepted(fixture); }
  const noMeta = gettysburgClipTestTextures(atlases);
  delete noMeta.get(reload.key).customData.meta;
  assert.equal(initialize(noMeta).length, 33, 'missing action-atlas metadata removes all three stationary actions');
});

// Exercise the actual renderer with its newly restored visual-frame signal.
test('resumed paused candidate sprites reconstruct the saved phase before freezing it', pending, () => {
  requireWest();
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

test('v9 scene metadata and pose selection preserve the exact v8 clips for every retained address', () => {
  const retained = initialize(loadedTextures, '?artPass=gettysburg-v8');
  assert.equal(retained.length, 28);
  assert.deepEqual(initialize(loadedTextures).filter(clip => clip.direction !== 4), retained);
  for (const side of ['union', 'confederate']) {
    for (const identity of ['a', 'b']) {
      const id = idFor(identity);
      for (const direction of [0, 1, 2, 3, 6]) {
        for (const action of ['idle', 'walk', 'route', 'fire', 'reload', 'melee', 'casualty']) {
          for (const frame of [0, 1, 2, 7]) {
            const figure = { id, direction, action, frame };
            assert.deepEqual(pose(figure, search, clips, side),
              pose(figure, '?artPass=gettysburg-v8', retained, side), `${side} ${identity} ${direction} ${action} ${frame}`);
          }
        }
      }
    }
  }
});

test('actual renderer retains accepted artwork for disabled passes, other scenarios, unsupported bearings and actions', () => {
  for (const identity of ['a', 'b']) {
    const fixture = renderFixture(identity);
    for (const query of ['', '?artPass=gettysburg-v19']) {
      fixture.scene.artPassSearch = query;
      for (const action of ['idle', 'walk', 'fire', 'reload']) {
        Object.assign(fixture.figure, { action, frame: 2 }); fixture.sync(); assertAccepted(fixture);
      }
    }
    fixture.scene.artPassSearch = search;
    for (const scenario of ['gettysburg_meade', 'gettysburg_jackson', 'first_manassas', 'shiloh']) {
      fixture.scene.scenarioId = scenario; fixture.sync(); assertAccepted(fixture);
    }
    fixture.scene.scenarioId = 'gettysburg';
    for (const direction of [5, 7]) {
      fixture.figure.direction = direction; fixture.sync(); assertAccepted(fixture);
    }
    fixture.figure.direction = 4;
    for (const action of ['melee', 'casualty']) {
      fixture.figure.action = action; fixture.sync(); assertAccepted(fixture);
    }
  }
});

test('real retained texture metadata counts v9 atlases and clips in the existing performance diagnostic', pending, () => {
  requireWest();
  const budget = fieldTextureBudget({ list: Object.fromEntries(loadedTextures.loaded) });
  assert.equal(budget.candidateAtlases, 18);
  assert.equal(budget.candidateClips, 36);
});

const nativeStudyIds = ['union-w', 'union-b-w'].flatMap(address => ['march', 'actions'].map(kind => `${address}-${kind}-v9`));
const nativeStudies = GETTYSBURG_MOTION_STUDIES.filter(study => nativeStudyIds.includes(study.id));
const pendingStudies = { skip: nativeStudies.length || process.env.FORGE_REQUIRE_V9_DATA === '1'
  ? false : 'Pending four real annotated v9 W source studies and receipts' };
const pairPresetIds = ['v9-sw-w', 'v9-b-sw-w'].flatMap(prefix => ['march', 'actions', 'turn', 'action-turn'].map(kind => `${prefix}-${kind}`));

test('v9 retains the exact fourteen v8 studies and every existing preset without modifying older review inputs', () => {
  const oldStudies = GETTYSBURG_MOTION_STUDIES.filter(study => !study.id.endsWith('-v9'));
  const v8 = oldStudies.filter(study => study.id.endsWith('-v8'));
  assert.equal(v8.length, 14);
  for (const prior of v8) {
    const retained = GETTYSBURG_MOTION_STUDIES.find(study => study.id === prior.id.replace(/-v8$/, '-v9'));
    assert.ok(retained, prior.id); assert.ok(Object.isFrozen(retained));
    for (const field of ['source', 'receipt', 'sourceSha256', 'width', 'height', 'columns', 'rows', 'cellOrder', 'phaseRoots', 'root', 'referenceHeight']) {
      assert.deepEqual(retained[field], prior[field], `${prior.id} ${field}`);
    }
    assert.equal(retained.retainedFrom, prior.id); assert.equal(retained.approved, false);
    assert.deepEqual(retained.limitations.slice(0, prior.limitations.length), prior.limitations);
  }
  const oldPresets = getGettysburgMotionPlaybackPresets(oldStudies);
  const allPresets = getGettysburgMotionPlaybackPresets(GETTYSBURG_MOTION_STUDIES);
  const ids = new Set(oldPresets.map(preset => preset.id));
  assert.deepEqual(allPresets.filter(preset => ids.has(preset.id)), oldPresets);
});

test('real v9 studies bind every reviewed source, native cell order, root, atlas and measurement receipt', pendingStudies, () => {
  requireWest();
  const annotations = JSON.parse(readFileSync(new URL('../docs/art-pass/manifests/gettysburg-v9-source-annotations.json', import.meta.url)));
  assert.equal(annotations.artPass, 'gettysburg-v9'); assert.equal(annotations.productionApproved, false);
  assert.equal(annotations.sources.length, 4); assert.equal(nativeStudies.length, 4);
  assert.equal(new Set(annotations.sources.map(spec => spec.key)).size, 4);
  for (const study of nativeStudies) {
    const spec = annotations.sources.find(spec => `/${spec.source}` === study.source);
    assert.ok(spec); assert.equal(spec.side, 'union'); assert.equal(spec.direction, 4);
    assert.equal(study.sourceSha256, spec.sha256); assert.equal(study.approved, false);
    const image = readFileSync(new URL(`../${study.source.slice(1)}`, import.meta.url));
    assert.equal(createHash('sha256').update(image).digest('hex'), study.sourceSha256);
    assert.deepEqual([image.readUInt32BE(16), image.readUInt32BE(20)], [study.width, study.height]);
    const receipt = JSON.parse(readFileSync(new URL(`../${study.receipt.slice(1)}`, import.meta.url)));
    assert.equal(receipt.source, study.source.slice(1)); assert.equal(receipt.sourceHash, study.sourceSha256);
    assert.deepEqual(receipt.nativeSize, { w: study.width, h: study.height });
    assert.equal(receipt.nativeMode, 'RGBA'); assert.equal(receipt.productionApproved, false);
    assert.equal(receipt.familyApproved, false); assert.equal(receipt.solidPaddingVerified, true);
    assert.equal(receipt.cells.length, 4);
    assert.deepEqual(receipt.cells.map(cell => cell.index).sort(), [0, 1, 2, 3]);
    for (const cell of receipt.cells) assert.ok(cell.alpha['64'].padding.every(padding => padding >= 16),
      `${study.id} native cell ${cell.index} retains the accepted solid-padding gate`);
    const atlas = atlases.get(spec.key);
    assert.ok(atlas); assert.equal(atlas.meta.artPass, 'gettysburg-v9');
    assert.equal(atlas.meta.source, spec.source); assert.equal(atlas.meta.sha256, spec.sha256);
    assert.equal(atlas.meta.measurementReview, study.receipt.slice(1));
    assert.deepEqual(receipt.clips, atlas.meta.clips);
    assert.equal(atlas.meta.image, westAssets.find(asset => asset.key === spec.key).image.split('/').at(-1));
    assert.deepEqual(study.cellOrder, spec.actions.flatMap(([, indexes]) => indexes));
    assert.equal(new Set(study.cellOrder).size, 4);
    for (let phase = 0; phase < 4; phase++) {
      const cellIndex = study.cellOrder[phase];
      const cell = getGettysburgMotionStudyCell(study, phase);
      assert.deepEqual(cell, { x: cellIndex % 2 * spec.cell, y: Math.floor(cellIndex / 2) * spec.cell, w: spec.cell, h: spec.cell });
      assert.deepEqual(receipt.cells.find(cell => cell.index === cellIndex).rootPixels, spec.roots[cellIndex]);
      assert.deepEqual(study.phaseRoots[phase], { x: spec.roots[cellIndex][0] / spec.cell, y: spec.roots[cellIndex][1] / spec.cell });
    }
    for (const [action, indexes] of spec.actions) {
      const clip = atlas.meta.clips.find(clip => clip.action === action);
      assert.ok(clip); assert.equal(clip.identity, spec.identity); assert.equal(clip.referenceHeight, study.referenceHeight);
      assert.equal(clip.frames.length, indexes.length);
      for (const [phase, cellIndex] of indexes.entries()) {
        assert.deepEqual(atlas.frames[clip.frames[phase]].frame,
          { x: cellIndex % 2 * spec.cell, y: Math.floor(cellIndex / 2) * spec.cell, w: spec.cell, h: spec.cell });
        assert.ok(Math.abs(clip.pivots[phase].x - spec.roots[cellIndex][0] / spec.cell) < .000001);
        assert.ok(Math.abs(clip.pivots[phase].y - spec.roots[cellIndex][1] / spec.cell) < .000001);
        if (action === 'fire') {
          assert.ok(spec.muzzle, 'firing source must identify the actual muzzle');
          assert.ok(Math.abs(clip.muzzles[phase].x - spec.muzzle[0] / spec.cell) < .000001);
          assert.ok(Math.abs(clip.muzzles[phase].y - spec.muzzle[1] / spec.cell) < .000001);
        }
      }
    }
  }
});

test('real W A/B and SW/W reviewer presets preserve identity, semantic action and phase', pendingStudies, () => {
  const v9Studies = GETTYSBURG_MOTION_STUDIES.filter(study => !['v10', 'v11', 'v13'].includes(study.id.split('-').at(-1)));
  assert.equal(nativeStudies.length, 4);
  const presets = getGettysburgMotionPlaybackPresets(v9Studies);
  for (const id of [...pairPresetIds, 'v9-w-a-b-march', 'v9-w-a-b-actions']) {
    const preset = presets.find(preset => preset.id === id); assert.ok(preset, id);
    assert.equal(preset.sequence.length, id.endsWith('action-turn') ? 30 : id.endsWith('-turn') ? 14 : id.endsWith('-march') ? 4 : 10);
    for (const sample of preset.sequence) {
      assert.equal(sample.left.phase, sample.right.phase); assert.equal(sample.left.action, sample.right.action);
      for (const panel of [sample.left, sample.right]) {
        assert.ok(panel.studyId.endsWith('-v9')); assert.equal(panel.action === 'march', panel.studyId.includes('-march-'));
        assert.ok(v9Studies.some(study => study.id === panel.studyId));
      }
      if (!id.includes('-a-b-')) assert.equal(sample.left.identity, sample.right.identity);
    }
  }
  assert.equal(getGettysburgMotionPlaybackInitialPreset(presets).id, 'v9-w-a-b-actions');
  const state = createGettysburgMotionPlaybackState(v9Studies);
  assert.equal(state.panels.left.studyId, 'union-w-march-v9'); assert.equal(state.panels.right.studyId, 'union-w-actions-v9');
  for (const identity of ['a', 'b']) {
    const turn = createGettysburgTurnSequence(v9Studies, 'v9', identity, ['sw', 'w']);
    assert.deepEqual(turn.map(pose => pose.bearing).filter((bearing, index, all) => index === 0 || bearing !== all[index - 1]), ['SW', 'W', 'SW']);
    for (let index = 1; index < turn.length; index++) {
      if (turn[index].bearing !== turn[index - 1].bearing) assert.equal(turn[index].phase, turn[index - 1].phase);
    }
    const roleId = `${identity === 'a' ? 'union' : 'union-b'}-w-actions-v9`;
    const partial = v9Studies.filter(study => study.id !== roleId);
    const source = v9Studies.find(study => study.id === roleId);
    for (const studies of [partial, [...partial, { ...source, status: 'rejected' }], [...partial, { ...source, cellOrder: [0, 1, 1, 3] }], [...partial, source, source]]) {
      assert.deepEqual(createGettysburgActionSequence(studies, 'v9', 'w', identity), []);
      assert.deepEqual(createGettysburgActionTurnSequence(studies, 'v9', identity, ['sw', 'w']), []);
      const ids = getGettysburgMotionPlaybackPresets(studies).map(preset => preset.id);
      const prefix = `v9${identity === 'a' ? '' : '-b'}-sw-w`;
      assert.ok(ids.includes(`${prefix}-march`) && ids.includes(`${prefix}-turn`));
      assert.ok(!ids.includes(`${prefix}-actions`) && !ids.includes(`${prefix}-action-turn`) && !ids.includes('v9-w-a-b-actions'));
    }
  }
  const noWest = v9Studies.filter(study => !nativeStudyIds.includes(study.id));
  assert.equal(getGettysburgMotionPlaybackInitialPreset(getGettysburgMotionPlaybackPresets(noWest)).id, 'v8-sw-a-b-actions');
  assert.equal(createGettysburgMotionPlaybackState(noWest).panels.left.studyId, 'union-sw-march-v8');
});
