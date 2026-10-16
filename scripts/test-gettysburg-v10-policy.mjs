import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { FieldPresentationCache } from '../src/battle/fieldPresentationCache.js';
import { getBattleEngineConfig } from '../src/battle/battleDefinitions.js';
import { createFormationVisual, updateFormationVisual } from '../src/battle/formationVisualState.js';
import { createFormationVisualCheckpoint, restoreFormationVisualFromCheckpoint } from '../src/battle/formationVisualCheckpoint.js';
import { combatCheckpointEnvelope } from '../src/battle/combatCheckpointEnvelope.js';
import { createFreshCampaignState } from '../src/game/campaignStorage.js';
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

const search = '?artPass=gettysburg-v10';
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
const nativeAssets = assets.filter(asset => asset.image.includes('/gettysburg-v10/'));
const nativeClips = clips.filter(clip => [5, 7].includes(clip.direction));
const requireNative = () => assert.ok(nativeAssets.length === 4 && nativeAssets.every(asset => atlases.has(asset.key))
  && nativeClips.length === 8, 'PENDING_NATIVE_DATA: all four real v10 Confederate NE/NW atlases and eight complete reviewed clips are required; no substitute or missing-data skip');
const formationId = 'v10-confederate-policy';
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

test('v10 retains every historical policy and adds four immutable Confederate NE/NW atlases', () => {
  const expected = [
    ['gettysburg-v3', 1, [0], false], ['gettysburg-v4', 2, [0], false],
    ['gettysburg-v5', 3, [0, 1], false], ['gettysburg-v6', 4, [0, 1], false],
    ['gettysburg-v7', 10, [0, 1, 2, 6], true], ['gettysburg-v8', 14, [0, 1, 2, 3, 6], true],
    ['gettysburg-v9', 18, [0, 1, 2, 3, 4, 6], true],
    ['gettysburg-v10', 22, [0, 1, 2, 3, 4, 5, 6, 7], true],
  ];
  assert.deepEqual(GETTYSBURG_INFANTRY_CLIPS_IDS, [...expected.map(([pass]) => pass), 'gettysburg-v11', 'gettysburg-v12', 'gettysburg-v13', 'gettysburg-v14', 'gettysburg-v15', 'gettysburg-v16', 'gettysburg-v17', 'gettysburg-v18']);
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
  assert.deepEqual(assets.slice(0, 18), gettysburgInfantryClipAssets('gettysburg', '?artPass=gettysburg-v9'));
  assert.deepEqual(nativeAssets.map(asset => asset.key), ['confederate-gettysburg-v10-a-march-ne', 'confederate-gettysburg-v10-a-actions-ne',
    'confederate-gettysburg-v10-a-march-nw', 'confederate-gettysburg-v10-a-actions-nw']);
  assert.equal(new Set(assets.map(asset => asset.key)).size, 22);
  for (const base of ['/game', '/game/', 'https://example.test/game/']) {
    const prefix = `${base.replace(/\/$/, '')}/`;
    assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', search, base),
      assets.map(asset => ({ key: asset.key, image: `${prefix}${asset.image}`, json: `${prefix}${asset.json}` })));
  }
});

test('default, unknown passes and non-Gettysburg scenarios touch no candidate texture or metadata', () => {
  const unavailable = { exists() { assert.fail('disabled pass checked a candidate texture'); }, get() { assert.fail('disabled pass read metadata'); } };
  const queries = ['', '?artPass=gettysburg-v10-other', '?other=gettysburg-v10', '?artPass=gettysburg-v19', '?artPass=__proto__', '?artPass=constructor'];
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
    return { figures: [state.figure], moving: false, facing: state.figure.direction * Math.PI / 4, footprint: [] };
  },
  detailedInfantryPose, gettysburgInfantryClipPose, deterministicUnitValue, formationStatusLabel,
  updateTravelDust: () => [], updatePeriodStandard() {},
});
function renderFixture(direction, side = 'confederate', prepared = clips, id = 0) {
  const figure = { id, direction, visible: true, frontRank: true, action: 'idle', frame: 0, scale: .82, x: 200, y: 200, alpha: 1 };
  const soldiers = Array.from({ length: id + 1 }, () => ({ sprite: new Display() }));
  const view = { soldiers, standard: new Display(), standardUI: null, hitArea: new Display(), label: new Display(),
    bar: new Display(), barBack: new Display(), condition: new Display(), flag: {}, realistic: true, detailed: true,
    infantryFamily: false, visual: { figure }, dust: {} };
  const formation = { id: formationId, side, type: 'infantry', active: true, x: 200, y: 200, strength: 100,
    initialStrength: 100, status: 'steady', order: 'hold', name: 'Test', ammunition: 50, lastVolleyAt: -Infinity, frontage: 120 };
  const graphics = { fillStyle() { return this; }, fillEllipse() { return this; }, fillCircle() { return this; } };
  const scene = new Renderer();
  Object.assign(scene, { scenarioId: 'gettysburg', artPassSearch: search, infantryClips: prepared, tactical: true,
    views: new Map([[formationId, view]]), speed: 1, reducedMotion: false, cameras: { main: { zoom: 1 } },
    shadows: graphics, smoke: graphics, dust: graphics });
  return { scene, figure, formation, soldier: soldiers[id], sprite: soldiers[id].sprite,
    sync: (time = 1, resolving = false) => scene.syncFormation(formation, time, resolving, []) };
}
function assertAccepted(fixture) {
  assert.ok(!fixture.sprite.textureKey.includes('gettysburg-v'));
  assert.equal(fixture.soldier.clipPhase, undefined); assert.equal(fixture.soldier.clipAction, undefined);
}


const nativeStudyIds = ['ne', 'nw'].flatMap(bearing => ['march', 'actions'].map(kind => `confederate-${bearing}-${kind}-v10`));
const nativeStudies = GETTYSBURG_MOTION_STUDIES.filter(study => nativeStudyIds.includes(study.id));
test('real v10 studies bind every reviewed source, native cell order, root, atlas and measurement receipt', () => {
  requireNative();
  const annotations = JSON.parse(readFileSync(new URL('../docs/art-pass/manifests/gettysburg-v10-source-annotations.json', import.meta.url)));
  assert.equal(annotations.artPass, 'gettysburg-v10'); assert.equal(annotations.productionApproved, false);
  assert.equal(annotations.sources.length, 4); assert.equal(nativeStudies.length, 4);
  assert.equal(new Set(annotations.sources.map(spec => spec.key)).size, 4);
  for (const study of nativeStudies) {
    const spec = annotations.sources.find(spec => `/${spec.source}` === study.source);
    assert.ok(spec); assert.equal(spec.side, 'confederate'); assert.equal(spec.direction, spec.name.endsWith('-ne') ? 7 : 5);
    assert.equal(spec.identity, 'a');
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
    assert.ok(atlas); assert.equal(atlas.meta.artPass, 'gettysburg-v10');
    assert.equal(atlas.meta.source, spec.source); assert.equal(atlas.meta.sha256, spec.sha256);
    assert.equal(atlas.meta.measurementReview, study.receipt.slice(1));
    assert.deepEqual(receipt.clips, atlas.meta.clips);
    assert.equal(atlas.meta.image, nativeAssets.find(asset => asset.key === spec.key).image.split('/').at(-1));
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


test('installed Phaser JSONHash retains all eight complete native clips, native bounds and normalized anchors', () => {
  requireNative();
  assert.equal(definitions.length, 44); assert.equal(initialize(loadedTextures).length, 44);
  for (const asset of nativeAssets) {
    const atlas = atlases.get(asset.key), texture = loadedTextures.get(asset.key);
    const image = readFileSync(new URL(`../public/${asset.image}`, import.meta.url));
    assert.equal(image[25], 6, 'native PNG remains RGBA');
    assert.deepEqual([image.readUInt32BE(16), image.readUInt32BE(20)], [atlas.meta.size.w, atlas.meta.size.h]);
    assert.equal(createHash('sha256').update(image).digest('hex'), atlas.meta.sha256);
    assert.deepEqual(image, readFileSync(new URL(`../${atlas.meta.source}`, import.meta.url)), 'public copy retains every native source byte');
    assert.equal(atlas.meta.productionApproved, false); assert.deepEqual(texture.customData.meta, atlas.meta);
    const occupied = new Set();
    for (const clip of atlas.meta.clips) {
      assert.deepEqual(validateGettysburgInfantryClip(clip), []);
      assert.equal(clip.side, 'confederate'); assert.equal(clip.identity, 'a');
      assert.equal(clip.direction, asset.key.endsWith('-ne') ? 7 : 5);
      assert.equal(clip.key, asset.key); assert.equal(clip.sourceHash, atlas.meta.sha256);
      for (const [phase, name] of clip.frames.entries()) {
        const entry = atlas.frames[name], frame = texture.get(name);
        const { x, y, w, h } = entry.frame;
        assert.ok([x, y, w, h].every(Number.isInteger));
        assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= atlas.meta.size.w && y + h <= atlas.meta.size.h);
        assert.equal(entry.rotated, false); assert.equal(entry.trimmed, false);
        assert.deepEqual([frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight], [x, y, w, h]);
        assert.deepEqual([frame.pivotX, frame.pivotY], [clip.pivots[phase].x, clip.pivots[phase].y]);
        assert.equal(frame.customData.bodyHeight, clip.referenceHeight); occupied.add(`${x},${y}`);
      }
    }
    assert.equal(occupied.size, 4);
  }
  for (const direction of [5, 7]) {
    const stationary = nativeClips.filter(clip => clip.direction === direction && clip.action !== 'march');
    assert.deepEqual(stationary.map(clip => clip.action).sort(), ['fire', 'ready', 'reload']);
    assert.equal(new Set(stationary.map(clip => clip.referenceHeight)).size, 1);
  }
  const budget = fieldTextureBudget({ list: Object.fromEntries(loadedTextures.loaded) });
  assert.equal(budget.candidateAtlases, 22); assert.equal(budget.candidateClips, 44);
});

test('v10 preserves every v9 clip and Union identity across all retained directions and action phases', () => {
  const retained = initialize(loadedTextures, '?artPass=gettysburg-v9');
  assert.equal(retained.length, 36);
  assert.deepEqual(initialize(loadedTextures).filter(clip => ![5, 7].includes(clip.direction)), retained);
  for (const side of ['union', 'confederate']) for (const identity of ['a', 'b']) {
    const id = idFor(identity);
    for (const direction of [0, 1, 2, 3, 4, 6]) for (const action of ['idle', 'walk', 'route', 'fire', 'reload', 'melee', 'casualty']) {
      for (const frame of [0, 1, 2, 7]) {
        const figure = { id, direction, action, frame };
        assert.deepEqual(pose(figure, search, clips, side), pose(figure, '?artPass=gettysburg-v9', retained, side));
      }
    }
  }
  for (const identity of ['a', 'b']) for (const direction of [5, 7]) {
    assert.equal(pose({ id: idFor(identity), direction, action: 'walk', frame: 1 }, search, clips, 'union'), null);
  }
});

test('Confederate A NE/NW uses exact side, action, source phase and stable identity while all previous passes withhold the new views', () => {
  requireNative();
  for (const direction of [5, 7]) for (const id of [idFor('a'), idFor('b')]) {
    const contact = gettysburgInfantryContactPhase(formationId, id);
    for (const [action, count] of [['idle', 1], ['walk', 4], ['route', 4], ['fire', 1], ['reload', 2]]) for (let frame = 0; frame < 8; frame++) {
      const figure = { id, direction, action, frame }, selected = pose(figure, search, clips, 'confederate');
      assert.ok(selected); assert.equal(selected.identity, 'a'); assert.equal(selected.direction, direction);
      assert.equal(selected.phase, ['walk', 'route'].includes(action) ? (frame + contact) % count : action === 'reload' ? Math.floor(frame / 2) % count : 0);
      assert.equal(selected.flip, false); assert.equal(selected.angle, 0);
      for (const pass of GETTYSBURG_INFANTRY_CLIPS_IDS.filter(pass => !['gettysburg-v10', 'gettysburg-v11', 'gettysburg-v12', 'gettysburg-v13', 'gettysburg-v14', 'gettysburg-v15', 'gettysburg-v16', 'gettysburg-v17', 'gettysburg-v18'].includes(pass))) {
        assert.equal(pose(figure, `?artPass=${pass}`, clips, 'confederate'), null, `${pass} cannot acquire a v10 diagonal`);
      }
    }
    for (const action of ['melee', 'casualty', '__proto__']) assert.equal(pose({ id, direction, action, frame: 0 }, search, clips, 'confederate'), null);
    assert.equal(pose({ id, direction, action: 'walk', fallen: true, frame: 0 }, search, clips, 'confederate'), null);
    assert.equal(gettysburgInfantryClipPose(formationId, { id, direction, action: 'walk', frame: 0 }, 0,
      { side: 'confederate', scenarioId: 'gettysburg', search, clips, identity: 'b' }), null);
  }
  for (const direction of [-1, 8, .5, NaN, undefined, '7']) assert.equal(pose({ id: 0, direction, action: 'walk', frame: 0 }, search, clips, 'confederate'), null);
});

test('actual renderer binds both diagonals to every native action phase and freezes pause, resolution and reduced motion', () => {
  requireNative();
  for (const direction of [5, 7]) {
    const fixture = renderFixture(direction, 'confederate', initialize(loadedTextures));
    const fixed = gettysburgInfantryContactPhase(formationId, fixture.figure.id);
    for (const action of ['idle', 'walk', 'route', 'fire', 'reload']) for (let frame = 0; frame < 4; frame++) {
      Object.assign(fixture.figure, { action, frame }); fixture.sync(1 + frame);
      const expected = pose(fixture.figure, search, clips, 'confederate');
      assert.equal(fixture.sprite.textureKey, expected.key); assert.equal(fixture.sprite.frameName, expected.frame);
      assert.deepEqual(fixture.sprite.origin, expected.pivot);
      assert.equal(fixture.sprite.scaleX, fixture.sprite.scaleY);
      assert.equal(fixture.sprite.scaleX, 58 * fixture.figure.scale / expected.referenceHeight * expected.width);
    }
    fixture.scene.speed = 0; fixture.figure.frame = 0; fixture.sync(10); assert.equal(fixture.soldier.clipPhase, 1);
    fixture.sync(20, true); assert.equal(fixture.soldier.clipPhase, 1);
    fixture.scene.reducedMotion = true; fixture.sync(30); assert.equal(fixture.soldier.clipPhase, 0);
    fixture.figure.action = 'walk'; fixture.sync(40); assert.equal(fixture.soldier.clipPhase, fixed);
    fixture.figure.direction = 0; fixture.sync(50); assertAccepted(fixture);
  }
});

test('actual scene withholds a whole incomplete or rejected diagonal action and never borrows a different bearing or side', () => {
  requireNative();
  for (const direction of [5, 7]) {
    const reload = nativeClips.find(clip => clip.direction === direction && clip.action === 'reload');
    const missing = gettysburgClipTestTextures(atlases); missing.get(reload.key).frames.delete(reload.frames[1]);
    const incomplete = initialize(missing); assert.equal(incomplete.length, 43);
    const fixture = renderFixture(direction);
    Object.assign(fixture.figure, { action: 'reload', frame: 2 }); fixture.sync(); assert.equal(fixture.soldier.clipPhase, 1);
    fixture.scene.infantryClips = incomplete;
    for (let frame = 0; frame < 4; frame++) { fixture.figure.frame = frame; fixture.sync(); assertAccepted(fixture); }
    fixture.figure.action = 'fire'; fixture.sync(); assert.equal(fixture.sprite.textureKey, reload.key);
    const noBearing = gettysburgClipTestTextures(atlases);
    for (const asset of nativeAssets.filter(asset => asset.key.endsWith(direction === 7 ? '-ne' : '-nw'))) noBearing.loaded.delete(asset.key);
    fixture.scene.infantryClips = initialize(noBearing);
    for (const action of ['idle', 'walk', 'fire', 'reload']) { fixture.figure.action = action; fixture.sync(); assertAccepted(fixture); }
    const rejectedAtlas = structuredClone(atlases.get(reload.key));
    rejectedAtlas.meta.clips.find(clip => clip.action === 'reload').approval.reviewed = false;
    const rejected = new Map(atlases); rejected.set(reload.key, rejectedAtlas);
    fixture.scene.infantryClips = initialize(gettysburgClipTestTextures(rejected));
    fixture.figure.action = 'reload'; fixture.sync(); assertAccepted(fixture);
    const noMeta = gettysburgClipTestTextures(atlases); delete noMeta.get(reload.key).customData.meta;
    assert.equal(initialize(noMeta).length, 41);
  }
});

test('actual renderer leaves default and other scenarios accepted and resumes saved paused diagonal phases before freezing', () => {
  requireNative();
  for (const direction of [5, 7]) {
    const fixture = renderFixture(direction);
    for (const query of ['', '?artPass=gettysburg-v19']) {
      fixture.scene.artPassSearch = query;
      for (const action of ['idle', 'walk', 'fire', 'reload']) { fixture.figure.action = action; fixture.sync(); assertAccepted(fixture); }
    }
    fixture.scene.artPassSearch = search;
    for (const scenario of ['gettysburg_meade', 'gettysburg_jackson', 'first_manassas', 'shiloh']) {
      fixture.scene.scenarioId = scenario; fixture.sync(); assertAccepted(fixture);
    }
    fixture.scene.scenarioId = 'gettysburg';
    for (const action of ['walk', 'reload']) {
      fixture.scene.speed = 0; Object.assign(fixture.figure, { action, frame: 2 });
      fixture.scene.views.get(formationId).visual.restoreFrame = true;
      const expected = pose(fixture.figure, search, clips, 'confederate'); fixture.sync(10);
      assert.equal(fixture.sprite.frameName, expected.frame); assert.equal(fixture.soldier.clipPhase, expected.phase);
      fixture.figure.frame = 0; fixture.sync(20); assert.equal(fixture.sprite.frameName, expected.frame);
    }
  }
});

test('v10 retains all eighteen v9 studies and every existing preset with exact old source references and measurements', () => {
  const old = GETTYSBURG_MOTION_STUDIES.filter(study => !study.id.endsWith('-v10'));
  const v9 = old.filter(study => study.id.endsWith('-v9')); assert.equal(v9.length, 18);
  for (const prior of v9) {
    const retained = GETTYSBURG_MOTION_STUDIES.find(study => study.id === prior.id.replace(/-v9$/, '-v10'));
    assert.ok(retained && Object.isFrozen(retained)); assert.equal(retained.retainedFrom, prior.id); assert.equal(retained.approved, false);
    for (const key of ['source', 'receipt', 'sourceSha256', 'width', 'height', 'columns', 'rows', 'cellOrder', 'phaseRoots', 'root', 'referenceHeight']) {
      assert.deepEqual(retained[key], prior[key]);
    }
    assert.deepEqual(retained.limitations.slice(0, prior.limitations.length), prior.limitations);
  }
  const previous = getGettysburgMotionPlaybackPresets(old), all = getGettysburgMotionPlaybackPresets(GETTYSBURG_MOTION_STUDIES);
  const ids = new Set(previous.map(preset => preset.id)); assert.deepEqual(all.filter(preset => ids.has(preset.id)), previous);
});

const diagonalPresetIds = ['n-ne', 'n-nw', 'ne-nw'].flatMap(pair => ['march', 'actions', 'turn', 'action-turn'].map(kind => `v10-confederate-${pair}-${kind}`));
test('real N/NE, N/NW and NE/NW comparisons preserve Confederate A, role and chronological phase', () => {
  requireNative(); assert.equal(nativeStudies.length, 4);
  const presets = getGettysburgMotionPlaybackPresets(GETTYSBURG_MOTION_STUDIES);
  for (const id of diagonalPresetIds) {
    const preset = presets.find(preset => preset.id === id); assert.ok(preset, id);
    assert.equal(preset.sequence.length, id.endsWith('action-turn') ? 30 : id.endsWith('-turn') ? 14 : id.endsWith('-march') ? 4 : 10);
    for (const sample of preset.sequence) {
      assert.equal(sample.left.phase, sample.right.phase); assert.equal(sample.left.action, sample.right.action);
      for (const panel of [sample.left, sample.right]) {
        assert.ok(panel.studyId.startsWith('confederate-') && panel.studyId.endsWith('-v10'));
        assert.equal(panel.action === 'march', panel.studyId.includes('-march-'));
        assert.ok(GETTYSBURG_MOTION_STUDIES.some(study => study.id === panel.studyId));
        if (panel.side) { assert.equal(panel.side, 'confederate'); assert.equal(panel.identity, 'a'); }
      }
    }
  }
  const retainedNorth = GETTYSBURG_MOTION_STUDIES.find(study => study.id === 'confederate-n-march-v10');
  assert.equal(retainedNorth.source, GETTYSBURG_MOTION_STUDIES.find(study => study.id === 'confederate-n-march-v7').source);
  for (const pair of [['n', 'ne'], ['n', 'nw'], ['ne', 'nw']]) {
    const turn = createGettysburgTurnSequence(GETTYSBURG_MOTION_STUDIES, 'v10', 'a', pair, 'confederate');
    assert.deepEqual(turn.map(pose => pose.bearing).filter((bearing, index, all) => index === 0 || bearing !== all[index - 1]), [pair[0], pair[1], pair[0]].map(bearing => bearing.toUpperCase()));
    for (let index = 1; index < turn.length; index++) if (turn[index].bearing !== turn[index - 1].bearing) assert.equal(turn[index].phase, turn[index - 1].phase);
  }
});

test('complete v10 NE startup and NE/NW preset take priority; missing, rejected and ambiguous roles retain exact v9 fallback', () => {
  requireNative();
  const studies = GETTYSBURG_MOTION_STUDIES.filter(study => !study.id.endsWith('-v11') && !study.id.endsWith('-v13'));
  const presets = getGettysburgMotionPlaybackPresets(studies);
  assert.equal(getGettysburgMotionPlaybackInitialPreset(presets).id, 'v10-confederate-ne-nw-actions');
  assert.deepEqual(createGettysburgMotionPlaybackState(studies).panels,
    { left: { studyId: 'confederate-ne-march-v10', phase: 0 }, right: { studyId: 'confederate-ne-actions-v10', phase: 0 } });
  const previous = studies.filter(study => !study.id.endsWith('-v10'));
  for (const kind of ['march', 'actions']) {
    const roleId = `confederate-ne-${kind}-v10`, role = studies.find(study => study.id === roleId);
    const missing = studies.filter(study => study.id !== roleId);
    for (const partial of [missing, [...missing, { ...role, status: 'rejected' }], [...missing, { ...role, cellOrder: [0, 1, 1, 3] }], [...missing, role, role]]) {
      assert.deepEqual(createGettysburgActionSequence(partial, 'v10', 'ne', 'a', 'confederate'), []);
      assert.deepEqual(createGettysburgActionTurnSequence(partial, 'v10', 'a', ['ne', 'nw'], 'confederate'), []);
      assert.deepEqual(createGettysburgMotionPlaybackState(partial).panels, createGettysburgMotionPlaybackState(previous).panels);
      assert.equal(getGettysburgMotionPlaybackInitialPreset(getGettysburgMotionPlaybackPresets(partial)).id, 'v9-w-a-b-actions');
    }
  }
  for (const kind of ['march', 'actions']) {
    const missing = studies.filter(study => study.id !== `confederate-nw-${kind}-v10`);
    assert.ok(!getGettysburgMotionPlaybackPresets(missing).some(preset => preset.id === 'v10-confederate-ne-nw-actions'));
    assert.equal(getGettysburgMotionPlaybackInitialPreset(getGettysburgMotionPlaybackPresets(missing)).id, 'v9-w-a-b-actions');
  }
  assert.deepEqual(createGettysburgActionSequence(studies, 'v10', 'ne', 'b', 'confederate'), []);
  assert.deepEqual(createGettysburgActionSequence(studies, 'v10', 'ne', 'a', 'union'), []);
});

// Only UI/graphics containers are doubled. Constructor, commands, checkpoint,
// visual save/restore and pose selection use the actual installed game code.
const CheckpointScene = vm.runInNewContext(source.slice(source.indexOf('class CivilWarBattleScene')) + '; CivilWarBattleScene', {
  Phaser: { Scene: class {} }, CivilWarBattleEngine, FieldPresentationCache, getBattleEngineConfig,
  performance, Map, window: { location: { search }, matchMedia: () => ({ matches: false }) },
  combatCheckpointEnvelope, createFormationVisualCheckpoint, restoreFormationVisualFromCheckpoint, updateFormationVisual, gettysburgInfantryClipPolicy,
});
test('actual v10 scene checkpoint preserves combat and restores native NE/NW visual poses and survivors', () => {
  requireNative();
  const campaign = { ...createFreshCampaignState(1861), battleRulesVersion: 17 };
  for (const direction of [5, 7]) {
    const scene = new CheckpointScene('gettysburg', campaign, 'option_a'); scene.tactical = true;
    const current = () => scene.engine.snapshot({ presentation: true }).formations.find(unit => unit.id === 'pickett-division');
    const initial = current(), visual = createFormationVisual(initial, 32); scene.views.set(initial.id, { visual });
    scene.engine.move(initial.id, { x: initial.x + (direction === 7 ? 140 : -140), y: initial.y - 140 });
    for (let tick = 0; tick < 80; tick++) {
      scene.engine.tick(.2); const time = scene.engine.time + (scene.engine.resolutionTime || 0);
      updateFormationVisual(visual, current(), time, .82);
      if (visual.output.figures.some(figure => figure.visible && !figure.fallen && figure.direction === direction && figure.action === 'walk')) break;
    }
    const combat = scene.engine.checkpoint(), saved = JSON.parse(JSON.stringify(scene.checkpoint()));
    assert.deepEqual(scene.engine.checkpoint(), combat); assert.deepEqual(combatCheckpointEnvelope(saved), combat);
    assert.equal(saved.presentation.formations.length, 1);
    const restoredScene = new CheckpointScene('gettysburg', campaign, 'option_a', null, null, null, null, saved);
    assert.deepEqual(restoredScene.engine.checkpoint(), combat);
    const formation = restoredScene.engine.snapshot({ presentation: true }).formations.find(unit => unit.id === initial.id);
    const time = restoredScene.engine.time + (restoredScene.engine.resolutionTime || 0);
    const restored = restoreFormationVisualFromCheckpoint(formation, 32, time, restoredScene.savedPresentation);
    const output = updateFormationVisual(restored, formation, time, .82);
    assert.deepEqual(restored.figures.map(figure => [figure.id, figure.alive]), visual.figures.map(figure => [figure.id, figure.alive]));
    assert.deepEqual(output, visual.output);
    const select = figure => gettysburgInfantryClipPose(initial.id, figure, time,
      { scenarioId: 'gettysburg', search, clips: initialize(loadedTextures), side: 'confederate', identity: 'a', versionedIdentity: true });
    assert.ok(output.figures.some(figure => figure.direction === direction && select(figure)?.key.includes('gettysburg-v10')));
    assert.deepEqual(output.figures.map(select), visual.output.figures.map(select));
  }
});
