import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { gettysburgInfantryClipAssets, gettysburgInfantryClipDefinitions } from '../src/battle/gettysburgInfantryClipAssets.js';
import { gettysburgInfantryClipPolicy, GETTYSBURG_INFANTRY_CLIPS_IDS } from '../src/battle/gettysburgInfantryClipPolicy.js';
import { gettysburgInfantryClipsEnabled, gettysburgInfantryClipPose, prepareGettysburgInfantryClips,
  validateGettysburgInfantryClip } from '../src/battle/gettysburgInfantryClips.js';
import { gettysburgInfantryFamilyAssets, gettysburgInfantryFamilyEnabled, gettysburgInfantryIdentity, gettysburgInfantryContactPhase,
  gettysburgInfantryFamilyPose, gettysburgInfantryFamilyTextureKey, gettysburgInfantryStandardAnchor } from '../src/battle/gettysburgInfantryFamily.js';
import { gettysburgInfantryShootingAge } from '../src/battle/gettysburgInfantryShotMotion.js';
import { sampleGettysburgInfantryVolley, createGettysburgInfantryShotCheckpoint,
  restoreGettysburgInfantryShots } from '../src/battle/gettysburgInfantryVolleyPresentation.js';
import { GETTYSBURG_MOTION_STUDIES as ALL_GETTYSBURG_MOTION_STUDIES, getGettysburgMotionStudyCell } from '../src/battle/gettysburgMotionStudies.js';
import { createGettysburgActionSequence, createGettysburgTurnSequence, createGettysburgActionTurnSequence,
  getGettysburgMotionPlaybackPresets, getGettysburgMotionPlaybackInitialPreset,
  createGettysburgMotionPlaybackState } from '../src/battle/gettysburgMotionPlayback.js';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { FieldPresentationCache } from '../src/battle/fieldPresentationCache.js';
import { getBattleEngineConfig } from '../src/battle/battleDefinitions.js';
import { combatCheckpointEnvelope } from '../src/battle/combatCheckpointEnvelope.js';
import { createFormationVisual, updateFormationVisual } from '../src/battle/formationVisualState.js';
import { createFormationVisualCheckpoint, restoreFormationVisualFromCheckpoint } from '../src/battle/formationVisualCheckpoint.js';
import { createFreshCampaignState } from '../src/game/campaignStorage.js';
import { detailedInfantryPose, detailedUnitAssetDirectory, DETAILED_UNIT_PAGES } from '../src/battle/detailedUnitVisual.js';
import { deterministicUnitValue, formationFootprint } from '../src/battle/formationMath.js';
import { realisticInfantryPose, updateTravelDust } from '../src/battle/realisticUnitVisual.js';
import { retreatOpacity } from '../src/battle/retreatPresentation.js';
import { formationStatusLabel } from '../src/battle/battleTactics.js';
import { fieldTextureBudget } from '../src/battle/fieldPerformance.js';
import { gettysburgClipTestTextures } from './test-support/gettysburgClipTextures.mjs';

// This suite keeps the exact historical v14 rows; v15 and v16 have their own strict suites.
const GETTYSBURG_MOTION_STUDIES = ALL_GETTYSBURG_MOTION_STUDIES.filter(study => !study.id.endsWith('-v15') && !study.id.endsWith('-v16'));

const search = '?artPass=gettysburg-v14';
const priorSearch = '?artPass=gettysburg-v13';
const root = path => new URL(`../${path}`, import.meta.url);
const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.parse(JSON.stringify(value));
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} differs from ${expected}`);
const assets = gettysburgInfantryClipAssets('gettysburg', search);
const priorAssets = gettysburgInfantryClipAssets('gettysburg', priorSearch);
const atlases = new Map(assets
  .map(asset => [asset.key, JSON.parse(readFileSync(root(`public/${asset.json}`)))]));
const textures = gettysburgClipTestTextures(atlases);
const prepare = (loaded = textures, query = search) => prepareGettysburgInfantryClips(
  gettysburgInfantryClipDefinitions('gettysburg', query, loaded),
  (key, frame) => loaded.exists(key) && loaded.get(key).has(frame));
const clips = prepare();
const nativeAssets = assets.filter(asset => asset.image.includes('/gettysburg-v14/'));
const nativeClips = clips.filter(clip => clip.key.startsWith('confederate-gettysburg-v14-a-'));
const requireNative = () => assert.ok(nativeAssets.length === 2 && nativeAssets.every(asset => atlases.has(asset.key))
  && nativeClips.length === 4, 'PENDING_NATIVE_DATA: two real v14 Confederate A S atlases and four complete reviewed clips are required; no substitutes or missing-data skips');
const formationId = 'v14-confederate-policy';
const idFor = identity => Array.from({ length: 256 }, (_, id) => id)
  .find(id => gettysburgInfantryIdentity(formationId, id) === identity);
const pose = (figure, query = search, prepared = clips, side = 'confederate', extra = {}) =>
  gettysburgInfantryClipPose(formationId, figure, 0, {
    scenarioId: 'gettysburg', search: query, clips: prepared, side, identity: 'a', versionedIdentity: true, ...extra,
  });
const source = readFileSync(root('src/battle/CivilWarBattlefield.jsx'), 'utf8');
const createStart = source.indexOf('  create() {');
const createEnd = source.indexOf('    createStandardTextures(this);', createStart);
assert.ok(createStart >= 0 && createEnd > createStart);
const Initializer = vm.runInNewContext(`(class {${source.slice(createStart, createEnd)}  }})`, {
  createDetailedUnitTextures() {}, prepareGettysburgInfantryClips, gettysburgInfantryClipDefinitions,
});
function initialize(loaded, query = search, scenarioId = 'gettysburg') {
  const scene = new Initializer(); Object.assign(scene, { textures: loaded, scenarioId, artPassSearch: query });
  scene.create(); return scene.infantryClips;
}

test('default, future passes and every other board read no candidate metadata; actual preload preserves fallback assets', () => {
  const unavailable = { exists() { assert.fail('disabled pass checked candidate textures'); }, get() { assert.fail('disabled pass read metadata'); } };
  for (const query of ['', '?artPass=gettysburg-v19', '?artPass=gettysburg-v14-other', '?other=gettysburg-v14', '?artPass=__proto__', '?artPass=constructor']) {
    assert.equal(gettysburgInfantryClipsEnabled('gettysburg', query), false);
    assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', query), []);
    assert.deepEqual(gettysburgInfantryClipDefinitions('gettysburg', query, unavailable), []);
    assert.deepEqual(initialize(unavailable, query), []);
  }
  for (const scenario of ['gettysburg_meade', 'gettysburg_jackson', 'first_manassas', 'shiloh', null]) {
    assert.equal(gettysburgInfantryClipsEnabled(scenario, search), false);
    assert.deepEqual(gettysburgInfantryClipAssets(scenario, search), []);
    assert.deepEqual(initialize(unavailable, search, scenario), []);
  }
  const Loader = vm.runInNewContext(`(class {${source.slice(source.indexOf('  preload() {'), createStart)}})`, {
    gettysburgInfantryFamilyAssets, gettysburgInfantryClipAssets, detailedUnitAssetDirectory, DETAILED_UNIT_PAGES,
    siegeTargetAssets: () => [], siegeTerrainAssets: () => [], landmarkField: () => ({ landmarks: [] }), PUBLIC_BASE: '/game/',
  });
  const collect = query => {
    const requests = [], scene = new Loader(); Object.assign(scene, { scenarioId: 'gettysburg', artPassSearch: query,
      engine: { fieldBattle: false, snapshot: () => ({}) }, config: { terrain: { key: 'terrain', src: 'images/battles/gettysburg-terrain-v3.png' } },
      load: { image(key, image) { requests.push({ key, image }); }, json(key, json) { requests.push({ key, json }); },
        atlas(key, image, json) { requests.push({ key, image, json }); } } }); scene.preload(); return requests;
  };
  const normal = collect(''), selected = collect(search);
  assert.deepEqual(selected.filter(request => /gettysburg-v(?:[3-9]|1[01345])\//.test(request.image || request.json || '')),
    gettysburgInfantryClipAssets('gettysburg', search, '/game/'));
  for (const request of normal) assert.ok(selected.some(item => JSON.stringify(item) === JSON.stringify(request)), request.key);
});

test('two native RGBA sources bind every real byte, cell, role, root, muzzle and measurement receipt', () => {
  requireNative(); assert.equal(clips.length, 64); assert.equal(initialize(textures).length, 64);
  const annotations = JSON.parse(readFileSync(root('docs/art-pass/manifests/gettysburg-v14-source-annotations.json')));
  assert.equal(annotations.artPass, 'gettysburg-v14'); assert.equal(annotations.productionApproved, false);
  assert.equal(annotations.familyComplete, false); assert.equal(annotations.sources.length, 2);
  assert.deepEqual(annotations.sources.map(spec => spec.name).sort(), ['actions-s', 'march-s']);
  const nativeStudies = GETTYSBURG_MOTION_STUDIES.filter(study => /^confederate-s-(march|actions)-v14$/.test(study.id));
  assert.equal(nativeStudies.length, 2);
  for (const spec of annotations.sources) {
    assert.equal(spec.side, 'confederate'); assert.equal(spec.identity, 'a'); assert.equal(spec.direction, 2);
    assert.equal(spec.key, `confederate-gettysburg-v14-a-${spec.name}`);
    assert.deepEqual(spec.actions.map(([action, indexes]) => [action, indexes.length]), spec.name.startsWith('march-')
      ? [['march', 4]] : [['ready', 1], ['fire', 1], ['reload', 2]]);
    const asset = nativeAssets.find(asset => asset.key === spec.key), atlas = atlases.get(spec.key), texture = textures.get(spec.key);
    const study = nativeStudies.find(study => study.source === `/${spec.source}`); assert.ok(asset && atlas && study);
    const original = readFileSync(root(spec.source)), image = readFileSync(root(`public/${asset.image}`));
    assert.deepEqual(image, original, 'runtime PNG preserves every native source byte');
    assert.equal(hash(image), spec.sha256);
    const reviewBytes = readFileSync(root(spec.sourceReview));
    assert.equal(hash(reviewBytes), spec.sourceReviewSHA256);
    assert.equal(spec.nativeReview.sourceHash, spec.sha256); assert.equal(spec.nativeReview.independentReview, true);
    assert.equal(spec.nativeReview.allFourCellsReviewed, true); assert.equal(spec.nativeReview.kitAccepted, true);
    assert.deepEqual(spec.bodySpans, spec.roots.map((root, index) => root[1] - spec.capTop[index])); assert.equal(study.sourceSha256, spec.sha256); assert.equal(image[25], 6);
    assert.deepEqual([image.readUInt32BE(16), image.readUInt32BE(20)], [study.width, study.height]);
    assert.deepEqual(atlas.meta.size, { w: study.width, h: study.height });
    assert.equal(atlas.meta.artPass, 'gettysburg-v14'); assert.equal(atlas.meta.sha256, spec.sha256);
    assert.equal(atlas.meta.source, spec.source); assert.equal(atlas.meta.productionApproved, false); assert.equal(study.approved, false);
    const receipt = JSON.parse(readFileSync(root(study.receipt.slice(1))));
    assert.equal(atlas.meta.measurementReview, study.receipt.slice(1));
    assert.equal(receipt.source, spec.source); assert.equal(receipt.sourceHash, spec.sha256);
    assert.deepEqual(receipt.nativeSize, { w: study.width, h: study.height }); assert.equal(receipt.nativeMode, 'RGBA');
    assert.equal(receipt.productionApproved, false); assert.equal(receipt.familyApproved, false);
    assert.equal(receipt.solidPaddingVerified, true); assert.equal(receipt.cells.length, 4); assert.deepEqual(receipt.clips, atlas.meta.clips);
    assert.deepEqual(receipt.cells.map(cell => cell.index).sort(), [0, 1, 2, 3]);
    for (const cell of receipt.cells) assert.ok(cell.alpha['64'].padding.every(value => value >= 16), `${spec.key} cell ${cell.index} solid padding`);
    assert.deepEqual(study.cellOrder, spec.actions.flatMap(([, indexes]) => indexes)); assert.equal(new Set(study.cellOrder).size, 4);
    for (let phase = 0; phase < 4; phase++) {
      const index = study.cellOrder[phase];
      assert.deepEqual(getGettysburgMotionStudyCell(study, phase), { x: index % 2 * spec.cell, y: Math.floor(index / 2) * spec.cell, w: spec.cell, h: spec.cell });
      assert.deepEqual(receipt.cells.find(cell => cell.index === index).rootPixels, spec.roots[index]);
      assert.deepEqual(study.phaseRoots[phase], { x: spec.roots[index][0] / spec.cell, y: spec.roots[index][1] / spec.cell });
    }
    for (const [action, indexes] of spec.actions) {
      const clip = atlas.meta.clips.find(clip => clip.action === action); assert.ok(clip); assert.deepEqual(validateGettysburgInfantryClip(clip), []);
      assert.equal(clip.side, spec.side); assert.equal(clip.identity, 'a'); assert.equal(clip.direction, spec.direction);
      assert.equal(clip.referenceHeight, study.referenceHeight); assert.equal(clip.sourceHash, spec.sha256); assert.equal(clip.frames.length, indexes.length);
      for (const [phase, index] of indexes.entries()) {
        const frame = texture.get(clip.frames[phase]); assert.ok(frame);
        assert.deepEqual(atlas.frames[clip.frames[phase]].frame, { x: index % 2 * spec.cell, y: Math.floor(index / 2) * spec.cell, w: spec.cell, h: spec.cell });
        assert.equal(atlas.frames[clip.frames[phase]].rotated, false); assert.equal(atlas.frames[clip.frames[phase]].trimmed, false);
        assert.ok(Math.abs(clip.pivots[phase].x - spec.roots[index][0] / spec.cell) < .000001);
        assert.ok(Math.abs(clip.pivots[phase].y - spec.roots[index][1] / spec.cell) < .000001);
        assert.equal(frame.pivotX, clip.pivots[phase].x); assert.equal(frame.pivotY, clip.pivots[phase].y);
        assert.equal(frame.customData.bodyHeight, study.referenceHeight);
        if (action === 'fire') {
          assert.ok(spec.muzzle); assert.ok(Math.abs(clip.muzzles[phase].x - spec.muzzle[0] / spec.cell) < .000001);
          assert.ok(Math.abs(clip.muzzles[phase].y - spec.muzzle[1] / spec.cell) < .000001);
        }
      }
    }
  }
  // Source containers are software fixtures; dimensions and identities bind the actual native PNG bytes.
  for (const asset of assets) textures.get(asset.key).source[0].image = readFileSync(root(`public/${asset.image}`));
  const budget = fieldTextureBudget({ list: Object.fromEntries(textures.loaded) });
  assert.equal(budget.candidateAtlases, 32); assert.equal(budget.candidateClips, 64);
  assert.equal(budget.sources, 32);
  const pixels = [...atlases.values()].reduce((sum, atlas) => sum + atlas.meta.size.w * atlas.meta.size.h, 0);
  assert.equal(budget.pixels, pixels); assert.equal(budget.nominalRgbaBytes, pixels * 4);
});

test('native S actions select only Confederate A and keep every authored phase and existing shot motion', () => {
  requireNative(); const id = idFor('b'), contact = gettysburgInfantryContactPhase(formationId, id);
  for (const direction of [2]) for (const [action, count] of [['idle', 1], ['walk', 4], ['route', 4], ['fire', 1], ['reload', 2]]) for (let frame = 0; frame < 8; frame++) {
    const figure = { id, direction, action, frame, scale: .82 }, selected = pose(figure, search, clips, 'confederate', { shootingAge: .08 });
    assert.ok(selected); assert.equal(selected.identity, 'a'); assert.equal(selected.direction, direction);
    assert.ok(selected.key.startsWith('confederate-gettysburg-v14-a-')); assert.equal(selected.shotMotion, true);
    assert.equal(selected.phase, ['walk', 'route'].includes(action) ? (frame + contact) % count : action === 'reload' ? Math.floor(frame / 2) % count : 0);
    assert.equal(selected.flip, false); assert.equal(selected.angle, 0);
    assert.equal(pose(figure, priorSearch, prepare(textures, priorSearch)), null);
    assert.equal(pose(figure, search, clips, 'confederate', { identity: 'b', versionedIdentity: false }), null);
    for (const identity of ['a', 'b']) {
      const union = pose({ ...figure, id: idFor(identity) }, search, clips, 'union'); assert.ok(union);
      assert.equal(union.identity, identity); assert.ok(!union.key.includes('gettysburg-v14'));
    }
    const frozen = pose(figure, search, clips, 'confederate', { paused: true, frozenAction: action, frozenPhase: count - 1 });
    assert.equal(frozen.phase, count - 1);
    const reduced = pose(figure, search, clips, 'confederate', { reducedMotion: true, shootingAge: .08 });
    assert.equal(reduced.phase, ['walk', 'route'].includes(action) ? contact : 0); assert.equal(reduced.offsetX, 0); assert.equal(reduced.offsetY, 0);
    assert.equal(pose(figure, search, clips, 'confederate', { resolving: true, shootingAge: .08 }).offsetX, 0);
    if (action === 'fire') {
      close(selected.offsetX, 0);
      assert.ok(selected.offsetY < 0);
      assert.ok(Math.abs(selected.offsetY + Math.sin(direction * Math.PI / 4) * .55 * figure.scale) < 1e-12);
      for (const age of [0, .4, .5]) { const neutral = pose(figure, search, clips, 'confederate', { shootingAge: age }); assert.equal(neutral.offsetX, 0); assert.equal(neutral.offsetY, 0); }
    }
  }
  for (const direction of [1, 3, -1, 8, .5, NaN, undefined, '0']) assert.equal(pose({ id, direction, action: 'walk', frame: 0 }), null);
  for (const action of ['melee', 'casualty', '__proto__']) assert.equal(pose({ id, direction: 2, action, frame: 0 }), null);
  assert.equal(pose({ id, direction: 2, action: 'walk', frame: 0, fallen: true }), null);
});

const acceptedFrame = { realWidth: 64, realHeight: 96, pivotX: .5, pivotY: .9, customData: { bodyHeight: 96 } };
const acceptedKey = key => /^(union|confederate)-(realistic|aim-realistic|detailed-(body|aim|melee|crew))$/.test(key)
  || DETAILED_UNIT_PAGES.some(page => key === `union-detailed-${page}` || key === `confederate-detailed-${page}`);
const renderingTextures = {
  exists: key => textures.exists(key) || acceptedKey(key),
  get: key => textures.get(key) || { has: () => true, get: () => acceptedFrame },
};
class Display {
  constructor(x = 0, y = 0) { Object.assign(this, { x, y, visible: true, alpha: 1, input: { enabled: true }, scaleX: 1, scaleY: 1, frame: acceptedFrame }); }
  setTexture(key, name) { this.textureKey = key; this.frameName = name; this.frame = renderingTextures.get(key).get(name); assert.ok(this.frame, `${key}/${name}`); return this; }
  setOrigin(x, y = x) { this.origin = { x, y }; this.originX = x; this.originY = y; return this; }
  setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setVisible(value) { this.visible = value; return this; } setAlpha(value) { this.alpha = value; return this; }
  setDepth() { return this; } setAngle(angle) { this.angle = angle; return this; } setFlipX(value) { this.flipX = value; return this; } setTint(tint) { this.tint = tint; return this; }
  setText() { return this; } setDisplaySize() { return this; } disableInteractive() { this.input.enabled = false; return this; }
  setY(y) { this.y = y; return this; } setBlendMode() { return this; } setStrokeStyle() { return this; }
  setInteractive() { this.input.enabled = true; return this; } setData() { return this; } on() { return this; }
  setRotation() { return this; } setSize() { return this; }
}
class Graphics {
  constructor() { this.draws = []; }
  clear() { this.draws = []; return this; }
  fillStyle(color, alpha) { this.style = { color, alpha }; return this; }
  fillCircle(x, y, radius) { this.draws.push({ shape: 'circle', ...this.style, x, y, radius }); return this; }
  fillEllipse(x, y, width, height) { this.draws.push({ shape: 'ellipse', ...this.style, x, y, width, height }); return this; }
}
const Renderer = vm.runInNewContext(`(class {${source.slice(source.indexOf('  syncFormation('), source.indexOf('  drawSelection('))}})`, {
  updateFormationVisual: state => { delete state.restoreFrame; return { figures: [state.figure], moving: false, facing: state.figure.direction * Math.PI / 4, footprint: [] }; },
  detailedInfantryPose, gettysburgInfantryClipPose, deterministicUnitValue, formationStatusLabel,
  sampleGettysburgInfantryVolley, gettysburgInfantryShootingAge,
  updateTravelDust: () => [], updatePeriodStandard() {},
});
function renderFixture(direction, prepared = clips) {
  const id = idFor('b'), figure = { id, direction, action: 'walk', frame: 0, visible: true, frontRank: true, scale: .82, x: 200, y: 200, alpha: 1 };
  const soldiers = Array.from({ length: id + 1 }, () => ({ sprite: new Display() }));
  const view = { soldiers, standard: new Display(), hitArea: new Display(), label: new Display(), bar: new Display(), barBack: new Display(), condition: new Display(), flag: {},
    realistic: true, detailed: true, infantryFamily: false, visual: { figure }, dust: {} };
  const formation = { id: formationId, side: 'confederate', type: 'infantry', active: true, x: 200, y: 200,
    strength: 100, initialStrength: 100, status: 'steady', order: 'hold', name: 'Test', ammunition: 50, lastVolleyAt: -Infinity, frontage: 120 };
  const graphics = { fillStyle() { return this; }, fillEllipse() { return this; }, fillCircle() { return this; } }, scene = new Renderer();
  Object.assign(scene, { scenarioId: 'gettysburg', artPassSearch: search, infantryClips: prepared, nativeShotMotion: true,
    textures, tactical: true, views: new Map([[formationId, view]]), speed: 1, reducedMotion: false, cameras: { main: { zoom: 1 } },
    shadows: graphics, smoke: graphics, dust: graphics });
  return { scene, figure, soldier: soldiers[id], sync: () => scene.syncFormation(formation, 1, false, []) };
}
const assertAccepted = fixture => {
  const fallback = detailedInfantryPose(formationId, fixture.figure, 1, false, false);
  assert.equal(fixture.soldier.sprite.textureKey, `confederate-detailed-${fallback.page}`);
  assert.equal(fixture.soldier.sprite.frameName, fallback.frame);
  assert.equal(fixture.soldier.sprite.flipX, fallback.flip);
  assert.equal(fixture.soldier.clipAction, undefined); assert.equal(fixture.soldier.clipPhase, undefined);
};

test('every missing native phase withholds its complete action and actual renderer falls back without borrowing another army or bearing', () => {
  requireNative();
  for (const clip of nativeClips) for (const missingFrame of clip.frames) {
    const missing = gettysburgClipTestTextures(atlases); missing.get(clip.key).frames.delete(missingFrame);
    const incomplete = initialize(missing); assert.equal(incomplete.length, 63);
    assert.ok(!incomplete.some(value => value.key === clip.key && value.action === clip.action));
    const fixture = renderFixture(clip.direction, incomplete);
    fixture.figure.action = clip.action === 'march' ? 'walk' : clip.action;
    for (let frame = 0; frame < 8; frame++) { fixture.figure.frame = frame; fixture.sync(); assertAccepted(fixture); }
  }
  for (const asset of nativeAssets) {
    const damaged = gettysburgClipTestTextures(atlases); delete damaged.get(asset.key).customData.meta;
    assert.equal(initialize(damaged).length, asset.key.includes('-march-') ? 63 : 61);
    const rejected = structuredClone(atlases.get(asset.key)); for (const clip of rejected.meta.clips) clip.approval.reviewed = false;
    assert.equal(initialize(gettysburgClipTestTextures(new Map([...atlases].map(([key, atlas]) => [key, key === asset.key ? rejected : atlas])))).length,
      asset.key.includes('-march-') ? 63 : 61);
    const crossBound = structuredClone(atlases.get(asset.key));
    for (const clip of crossBound.meta.clips) clip.key = nativeAssets.find(value => value.key !== asset.key).key;
    assert.equal(initialize(gettysburgClipTestTextures(new Map([...atlases].map(([key, atlas]) => [key, key === asset.key ? crossBound : atlas])))).length,
      asset.key.includes('-march-') ? 63 : 61);
  }
  for (const direction of [2]) {
    const fixture = renderFixture(direction);
    for (const action of ['idle', 'walk', 'route', 'fire', 'reload']) for (let frame = 0; frame < 8; frame++) {
      Object.assign(fixture.figure, { action, frame }); fixture.sync(); const expected = pose(fixture.figure);
      assert.equal(fixture.soldier.sprite.textureKey, expected.key); assert.equal(fixture.soldier.sprite.frameName, expected.frame);
      assert.deepEqual(fixture.soldier.sprite.origin, expected.pivot);
      assert.equal(fixture.soldier.sprite.scaleX, 58 * fixture.figure.scale / expected.referenceHeight * expected.width);
    }
    for (const query of ['', '?artPass=gettysburg-v19']) { fixture.scene.artPassSearch = query; fixture.sync(); assertAccepted(fixture); }
    fixture.scene.artPassSearch = search;
    for (const scenario of ['gettysburg_meade', 'gettysburg_jackson', 'first_manassas', 'shiloh']) { fixture.scene.scenarioId = scenario; fixture.sync(); assertAccepted(fixture); }
  }
});

const windowState = { location: { search }, matchMedia: () => ({ matches: false }) };
const Scene = vm.runInNewContext(source.slice(source.indexOf('class CivilWarBattleScene')) + '; CivilWarBattleScene', {
  Phaser: { Scene: class {}, BlendModes: { NORMAL: 0 }, Geom: { Rectangle: class { static Contains() {} }, Polygon: class { static Contains() {} } } },
  CivilWarBattleEngine, FieldPresentationCache, getBattleEngineConfig, performance, Map,
  window: windowState, combatCheckpointEnvelope, createFormationVisualCheckpoint, restoreFormationVisualFromCheckpoint,
  updateFormationVisual, sampleGettysburgInfantryVolley, createGettysburgInfantryShotCheckpoint,
  restoreGettysburgInfantryShots, gettysburgInfantryClipPolicy, DETAILED_UNIT_PAGES, gettysburgInfantryFamilyEnabled,
  formationFootprint, deterministicUnitValue, detailedInfantryPose, realisticInfantryPose, updateTravelDust,
  gettysburgInfantryFamilyPose, gettysburgInfantryFamilyTextureKey, gettysburgInfantryStandardAnchor,
  gettysburgInfantryClipPose, gettysburgInfantryShootingAge, formationStatusLabel, retreatOpacity,
  siegeTargetPlan: () => [], createSiegeTargetVisual: () => null,
  createStandardPole: () => new Display(), createRealisticStandard: () => new Display(), updatePeriodStandard() {},
});
const campaign = { ...createFreshCampaignState(1861), battleRulesVersion: 17 };
function attachRenderer(scene) {
  scene.textures = renderingTextures; scene.infantryClips = prepare(textures, scene.artPassSearch);
  scene.add = Object.fromEntries(['image', 'rectangle', 'text', 'container', 'zone'].map(kind => [kind, (x, y) => new Display(x, y)]));
  scene.shadows = new Graphics(); scene.smoke = new Graphics(); scene.dust = new Graphics();
  scene.cameras = { main: { zoom: 1 } }; return scene;
}
const current = (scene, id) => scene.engine.snapshot({ presentation: true }).formations.find(value => value.id === id);
function volleyFixture(direction) {
  windowState.location.search = search;
  const scene = attachRenderer(new Scene('gettysburg', campaign, 'option_a')); scene.engine.time = 7.08;
  const unit = scene.engine.state.find(value => value.side === 'confederate' && value.type === 'infantry' && value.active);
  const enemy = scene.engine.state.find(value => value.side === 'union' && value.active);
  Object.assign(unit, { facing: direction * Math.PI / 4, formationMode: 'line', lastVolleyAt: 7,
    status: 'firing', reload: 10, inMelee: false, engagedWith: enemy.id });
  scene.createFormation(current(scene, unit.id)); return { scene, unit, id: unit.id };
}
function draw(scene, id) {
  scene.smoke.clear(); scene.shadows.clear(); scene.dust.clear();
  scene.syncFormation(current(scene, id), scene.engine.time + (scene.engine.resolutionTime || 0), false);
  return scene.views.get(id);
}
function coldScene(saved, id, pass = 'gettysburg-v14') {
  windowState.location.search = `?artPass=${pass}`;
  const cold = attachRenderer(new Scene('gettysburg', campaign, 'option_a', null, null, null, null, json(saved)));
  cold.createFormation(current(cold, id)); return cold;
}
function spriteFacts(view) {
  return Array.from(view.soldiers, ({ sprite }) => ({ x: sprite.x, y: sprite.y, texture: sprite.textureKey, frame: sprite.frameName,
    visible: sprite.visible, originX: sprite.originX, originY: sprite.originY, scaleX: sprite.scaleX,
    scaleY: sprite.scaleY, angle: sprite.angle, alpha: sprite.alpha, flipX: sprite.flipX, tint: sprite.tint }));
}
function assertSmoke(scene, shots) {
  const age = scene.engine.time - shots.at, ellipses = scene.smoke.draws.filter(draw => draw.shape === 'ellipse');
  assert.equal(ellipses.length, shots.figures.length * 3);
  for (const [index, shot] of shots.figures.entries()) {
    close(ellipses[index * 3].x, shot.x + Math.cos(shot.bearing) * age * 14 * shot.scale);
    close(ellipses[index * 3].y, shot.y - age * 9);
  }
}

for (const direction of [2]) test(`actual Confederate S volley uses native mouths and recoil and preserves smoke through movement, turning and cold resume`, () => {
  requireNative(); const { scene, unit, id } = volleyFixture(direction), combatBeforeDraw = scene.engine.checkpoint();
  const view = draw(scene, id), shots = view.shots, original = json(shots), initialSprites = json(spriteFacts(view)), initialSmoke = json(scene.smoke.draws);
  assert.ok(shots.figures.length > 0); assert.ok(shots.figures.every(shot => shot.native));
  const clip = nativeClips.find(clip => clip.direction === direction && clip.action === 'fire'); assert.ok(clip);
  const frame = textures.get(clip.key).get(clip.frames[0]), flashes = scene.smoke.draws.filter(draw => draw.shape === 'circle');
  assert.equal(flashes.length, shots.figures.length);
  for (const [index, shot] of shots.figures.entries()) {
    const figure = view.visual.output.figures.find(figure => figure.id === shot.id);
    const authoredScale = 58 * figure.scale / clip.referenceHeight * (.95 + deterministicUnitValue(id, shot.id, 215) * .1);
    close(shot.x, figure.x + (clip.muzzles[0].x - clip.pivots[0].x) * frame.realWidth * authoredScale);
    close(shot.y, figure.y + (clip.muzzles[0].y - clip.pivots[0].y) * frame.realHeight * authoredScale);
    close(shot.bearing, direction * Math.PI / 4); close(flashes[index].x, shot.x); close(flashes[index].y, shot.y);
  }
  let recoiling = 0;
  for (const figure of view.visual.output.figures.filter(figure => figure.visible && !figure.fallen && figure.action === 'fire')) {
    const age = gettysburgInfantryShootingAge(current(scene, id), figure.id, scene.engine.time);
    const selected = gettysburgInfantryClipPose(id, figure, scene.engine.time, { scenarioId: 'gettysburg', search,
      side: 'confederate', clips, identity: 'a', versionedIdentity: true, shootingAge: age });
    const sprite = view.soldiers[figure.id].sprite; assert.ok(selected); assert.equal(sprite.textureKey, clip.key);
    assert.equal(sprite.frame, frame, 'the actual scene renders the installed native Phaser frame');
    close(sprite.x, figure.x + selected.offsetX); close(sprite.y, figure.y + selected.offsetY); assert.equal(sprite.angle, 0);
    if (Math.abs(selected.offsetY) > 0) { recoiling++; assert.ok(selected.offsetY * Math.sin(direction * Math.PI / 4) < 0); }
  }
  assert.ok(recoiling > 0); assertSmoke(scene, shots); assert.deepEqual(scene.engine.checkpoint(), combatBeforeDraw);
  draw(scene, id); assert.equal(view.shots, shots); assert.deepEqual(spriteFacts(view), initialSprites); assert.deepEqual(scene.smoke.draws, initialSmoke);
  const immediate = json(scene.checkpoint()), immediateCold = coldScene(immediate, id);
  assert.deepEqual(immediateCold.views.get(id).shots, original); draw(immediateCold, id);
  assert.deepEqual(spriteFacts(immediateCold.views.get(id)), initialSprites); assert.deepEqual(immediateCold.smoke.draws, initialSmoke);
  scene.engine.time = 7.8;
  Object.assign(unit, { x: unit.x + 41, y: unit.y + 17, facing: -Math.PI / 2, formationMode: 'column', strength: unit.initialStrength * .72 });
  draw(scene, id); assert.equal(view.shots, shots); assert.deepEqual(view.shots, original);
  assertSmoke(scene, shots); assert.equal(scene.smoke.draws.some(draw => draw.shape === 'circle'), false);
  const movedSprites = json(spriteFacts(view)), movedSmoke = json(scene.smoke.draws), combat = scene.engine.checkpoint(), saved = json(scene.checkpoint());
  assert.equal(saved.presentation.shots.artPass, 'gettysburg-v14'); assert.deepEqual(combatCheckpointEnvelope(saved), combat);
  const matching = coldScene(saved, id); assert.deepEqual(matching.views.get(id).shots, original);
  assert.deepEqual(json(matching.checkpoint()).presentation, saved.presentation, 'immediate re-save retains geometry before a new draw');
  draw(matching, id); assert.deepEqual(spriteFacts(matching.views.get(id)), movedSprites); assert.deepEqual(matching.smoke.draws, movedSmoke);
  assert.deepEqual(matching.engine.checkpoint(), combat);
  const crossPass = coldScene(saved, id, 'gettysburg-v13'); assert.equal(crossPass.views.get(id).shots, null);
  assert.deepEqual(crossPass.engine.checkpoint(), combat); draw(crossPass, id);
  assert.deepEqual(crossPass.engine.checkpoint(), combat); assert.ok(crossPass.views.get(id).shots);
  assert.ok(crossPass.views.get(id).shots.figures.every(shot => shot.native));
  assert.notDeepEqual(crossPass.views.get(id).shots, original, 'cross-pass failure uses current geometry rather than another pass\'s saved mouths');
  scene.engine.time = 8.25; draw(scene, id); assert.equal(view.shots, null); assert.deepEqual(scene.smoke.draws, []);
});


test('v14 appends only two immutable Confederate A south atlases and preserves opt-in scope', () => {
  assert.deepEqual(GETTYSBURG_INFANTRY_CLIPS_IDS, Array.from({ length: 16 }, (_, index) => `gettysburg-v${index + 3}`));
  const policy = gettysburgInfantryClipPolicy('gettysburg', search);
  assert.ok(Object.isFrozen(policy) && Object.isFrozen(policy.atlases) && Object.isFrozen(policy.directions));
  assert.equal(policy.shotMotion, true); assert.equal(policy.shotPresentationId, 'gettysburg-v14');
  assert.equal(policy.stableUnionIdentity, true); assert.deepEqual(policy.directions, [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(assets.length, 32); assert.equal(new Set(assets.map(asset => asset.key)).size, 32);
  assert.deepEqual(assets.slice(0, 30), priorAssets);
  assert.deepEqual(nativeAssets.map(asset => asset.key), ['march-s', 'actions-s'].map(name => `confederate-gettysburg-v14-a-${name}`));
  for (const descriptor of policy.atlases) assert.ok(Object.isFrozen(descriptor));
  for (const base of ['/game', '/game/', 'https://example.test/game/']) assert.deepEqual(
    gettysburgInfantryClipAssets('gettysburg', search, base), assets.map(asset => ({ key: asset.key,
      image: `${base.replace(/\/$/, '')}/${asset.image}`, json: `${base.replace(/\/$/, '')}/${asset.json}` })));
  for (let version = 3; version <= 12; version++) assert.equal(
    Object.hasOwn(gettysburgInfantryClipPolicy('gettysburg', `?artPass=gettysburg-v${version}`), 'shotPresentationId'), false);
});

test('independent original-v13 capture preserves all 30 PNG/JSON pairs, 60 clips, policies, assets, poses, studies and presets', () => {
  const baseline = JSON.parse(readFileSync(root('scripts/test-support/gettysburgV13Preservation.json')));
  assert.equal(baseline.original, '/Users/titansforge/Vault/Titans_of_War');
  assert.equal(priorAssets.length, 30);
  assert.deepEqual(priorAssets.map(asset => ({ key: asset.key, image: hash(readFileSync(root(`public/${asset.image}`))),
    json: hash(readFileSync(root(`public/${asset.json}`))) })), baseline.hashes);
  const previous = prepare(textures, priorSearch); assert.equal(previous.length, 60);
  assert.equal(hash(JSON.stringify(previous)), baseline.clipHash);
  const rows = GETTYSBURG_INFANTRY_CLIPS_IDS.filter(pass => !['gettysburg-v14', 'gettysburg-v15', 'gettysburg-v16', 'gettysburg-v17', 'gettysburg-v18'].includes(pass)).map(pass => ({ pass,
    policy: gettysburgInfantryClipPolicy('gettysburg', `?artPass=${pass}`),
    assets: gettysburgInfantryClipAssets('gettysburg', `?artPass=${pass}`) }));
  for (const clip of previous) for (const frame of [0, 1, 2, 3, 7]) for (const flags of [{},
    { paused: true, frozenAction: clip.action, frozenPhase: clip.frames.length - 1 }, { reducedMotion: true },
    { resolving: true, frozenAction: clip.action, frozenPhase: clip.frames.length - 1 }]) for (const age of [0, .08, .19, .4]) {
    const figure = { id: 17, direction: clip.direction, action: clip.action === 'march' ? 'walk' : clip.action,
      frame, scale: 1.37, bodyOffsetX: 5, bodyOffsetY: -4, lean: 2 };
    const options = { scenarioId: 'gettysburg', search: priorSearch, side: clip.side, identity: clip.identity,
      clips: previous, shootingAge: age, ...flags };
    const prior = gettysburgInfantryClipPose('v14-v13-preservation', figure, 999, options);
    rows.push({ key: clip.key, action: clip.action, frame, flags, age, pose: prior });
    assert.deepEqual(gettysburgInfantryClipPose('v14-v13-preservation', figure, 999, { ...options, search, clips }), prior);
  }
  assert.equal(rows.length, baseline.rowCount); assert.equal(hash(JSON.stringify(rows)), baseline.poseHash);
  assert.deepEqual(clips.filter(clip => !clip.key.startsWith('confederate-gettysburg-v14-a-')), previous);
  const studies = GETTYSBURG_MOTION_STUDIES.filter(study => !study.id.endsWith('-v14'));
  assert.equal(hash(JSON.stringify(studies)), baseline.studyHash);
  const presets = getGettysburgMotionPlaybackPresets(studies);
  assert.equal(hash(JSON.stringify(presets)), baseline.presetHash);
  assert.equal(getGettysburgMotionPlaybackInitialPreset(presets).id, baseline.initialPreset);
  assert.deepEqual(createGettysburgMotionPlaybackState(studies), baseline.playbackState);
});

test('v14 reviewer retains every measured v13 study and compares Confederate N/S and S/E/W at matching semantic phases', () => {
  requireNative();
  const previous = GETTYSBURG_MOTION_STUDIES.filter(study => !study.id.endsWith('-v14'));
  const retained = previous.filter(study => study.id.endsWith('-v13')); assert.equal(retained.length, 30);
  const current = GETTYSBURG_MOTION_STUDIES.filter(study => study.id.endsWith('-v14')); assert.equal(current.length, 32);
  for (const prior of retained) {
    const study = current.find(study => study.id === prior.id.replace(/-v13$/, '-v14')); assert.ok(study && Object.isFrozen(study));
    assert.equal(study.retainedFrom, prior.id); assert.equal(study.approved, false);
    for (const key of ['source', 'receipt', 'sourceSha256', 'width', 'height', 'columns', 'rows', 'cellOrder', 'phaseRoots', 'root', 'referenceHeight']) assert.deepEqual(study[key], prior[key]);
    assert.deepEqual(study.limitations.slice(0, prior.limitations.length), prior.limitations);
  }
  const oldPresets = getGettysburgMotionPlaybackPresets(previous), presets = getGettysburgMotionPlaybackPresets(GETTYSBURG_MOTION_STUDIES);
  const oldIds = new Set(oldPresets.map(preset => preset.id)); assert.deepEqual(presets.filter(preset => oldIds.has(preset.id)), oldPresets);
  for (const pair of [['n', 's'], ['s', 'e'], ['s', 'w']]) for (const kind of ['march', 'actions', 'turn', 'action-turn']) {
    const preset = presets.find(preset => preset.id === `v14-confederate-${pair.join('-')}-${kind}`); assert.ok(preset);
    assert.equal(preset.sequence.length, kind === 'march' ? 4 : kind === 'actions' ? 10 : kind === 'turn' ? 14 : 30);
    for (const item of preset.sequence) {
      assert.equal(item.left.phase, item.right.phase); assert.equal(item.left.action, item.right.action);
      for (const panel of [item.left, item.right]) {
        const study = current.find(study => study.id === panel.studyId); assert.ok(study);
        assert.ok(panel.studyId.startsWith('confederate-'));
        if (panel.identity) { assert.equal(panel.identity, 'a'); assert.equal(panel.side, 'confederate'); }
        assert.ok(study.source && study.phaseRoots[panel.phase]);
      }
    }
    if (kind === 'turn') {
      const turn = createGettysburgTurnSequence(GETTYSBURG_MOTION_STUDIES, 'v14', 'a', pair, 'confederate');
      assert.deepEqual(turn.map(pose => pose.bearing).filter((bearing, index, all) => !index || bearing !== all[index - 1]), [pair[0], pair[1], pair[0]].map(value => value.toUpperCase()));
      for (let index = 1; index < turn.length; index++) if (turn[index].bearing !== turn[index - 1].bearing) assert.equal(turn[index].phase, turn[index - 1].phase);
    }
  }
  assert.equal(getGettysburgMotionPlaybackInitialPreset(presets).id, 'v14-confederate-n-s-actions');
  assert.deepEqual(createGettysburgMotionPlaybackState(GETTYSBURG_MOTION_STUDIES).panels,
    { left: { studyId: 'confederate-s-march-v14', phase: 0 }, right: { studyId: 'confederate-s-actions-v14', phase: 0 } });
  for (const bearing of ['n', 's']) for (const kind of ['march', 'actions']) {
    const id = `confederate-${bearing}-${kind}-v14`, role = current.find(study => study.id === id);
    const missing = GETTYSBURG_MOTION_STUDIES.filter(study => study.id !== id);
    for (const partial of [missing, [...missing, { ...role, status: 'rejected' }], [...missing, { ...role, cellOrder: [0, 1, 1, 3] }], [...missing, role, role]]) {
      assert.deepEqual(createGettysburgActionSequence(partial, 'v14', bearing, 'a', 'confederate'), []);
      assert.deepEqual(createGettysburgActionTurnSequence(partial, 'v14', 'a', ['n', 's'], 'confederate'), []);
      assert.deepEqual(createGettysburgMotionPlaybackState(partial).panels, createGettysburgMotionPlaybackState(previous).panels);
      assert.equal(getGettysburgMotionPlaybackInitialPreset(getGettysburgMotionPlaybackPresets(partial)).id, 'v13-confederate-e-w-actions');
    }
  }
});

test('actual v13/v14 checkpoint binding preserves combat and defaults while rejecting stale, future and cross-pass shot records', () => {
  requireNative();
  for (const pass of ['gettysburg-v13', 'gettysburg-v14']) for (const direction of pass === 'gettysburg-v13' ? [0, 4] : [2]) {
    windowState.location.search = `?artPass=${pass}`;
    const scene = attachRenderer(new Scene('gettysburg', campaign, 'option_a'));
    assert.equal(scene.nativeShotMotion, true); assert.equal(scene.shotPresentationId, pass);
    scene.engine.time = 7.08;
    const unit = scene.engine.state.find(unit => unit.side === 'confederate' && unit.type === 'infantry' && unit.active);
    Object.assign(unit, { facing: direction * Math.PI / 4, formationMode: 'line', lastVolleyAt: 7, status: 'firing', reload: 10 });
    scene.createFormation(current(scene, unit.id)); draw(scene, unit.id);
    const formation = current(scene, unit.id), combat = scene.engine.checkpoint(), saved = json(scene.checkpoint());
    assert.equal(saved.presentation.shots.artPass, pass); assert.equal(saved.presentation.shots.formations.length, 1);
    assert.deepEqual(scene.engine.checkpoint(), combat); assert.deepEqual(combatCheckpointEnvelope(saved), combat);
    const restored = restoreGettysburgInfantryShots(formation, 32, 7.08, saved.presentation, pass);
    assert.deepEqual(restored, scene.views.get(formation.id).shots);
    for (const selected of ['gettysburg-v13', 'gettysburg-v14']) {
      const cold = coldScene(saved, unit.id, selected);
      assert.deepEqual(cold.engine.checkpoint(), combat);
      assert.deepEqual(cold.views.get(unit.id).shots, selected === pass ? restored : null);
      if (selected === pass) assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation);
    }
    for (const damaged of ['gettysburg-v11', 'gettysburg-v15', 'gettysburg-v16', 'gettysburg-v17', 'gettysburg-v18', 'gettysburg-v19', null, '__proto__']) {
      const rejected = json(saved.presentation); rejected.shots.artPass = damaged;
      assert.equal(restoreGettysburgInfantryShots(formation, 32, 7.08, rejected, pass), null);
      if (['gettysburg-v15', 'gettysburg-v16', 'gettysburg-v17', 'gettysburg-v18'].includes(damaged)) {
        assert.equal(createGettysburgInfantryShotCheckpoint([formation], scene.views, 7.08, damaged).artPass, damaged);
      } else {
        assert.equal(createGettysburgInfantryShotCheckpoint([formation], scene.views, 7.08, damaged), null);
      }
    }
    // The optional helper retains its historical v12 default.
    assert.equal(createGettysburgInfantryShotCheckpoint([formation], scene.views, 7.08).artPass, 'gettysburg-v12');
    assert.equal(restoreGettysburgInfantryShots(formation, 32, 7.08, saved.presentation), null);
    assert.equal(restoreGettysburgInfantryShots(formation, 32, 8.25, { ...saved.presentation, time: 8.25,
      shots: { ...saved.presentation.shots, time: 8.25 } }, pass), null);
  }
});

// Isolate one formation so the real command, turning, walking, morale and exit
// code can be inspected deterministically. These fixtures make no balance claim.
function marchingScene(mode, pass = 'gettysburg-v14') {
  windowState.location.search = `?artPass=${pass}`;
  const scene = attachRenderer(new Scene('gettysburg', campaign, 'option_a'));
  for (const unit of scene.engine.state) unit.active = false;
  const unit = scene.engine.state.find(unit => unit.side === 'confederate' && unit.type === 'infantry');
  Object.assign(unit, { active: true, x: 850, y: 500, facing: -Math.PI / 2, order: 'hold', target: { x: 850, y: 500 },
    ammunition: 40, reload: 0, morale: mode === 'routing' ? 17 : 80, cohesion: 80 });
  scene.speed = 1; scene.createFormation(current(scene, unit.id)); draw(scene, unit.id);
  if (mode === 'move') scene.engine.move(unit.id, { x: 850, y: 780 });
  else if (mode !== 'routing') scene.engine.order(unit.id, mode);
  return { scene, unit, id: unit.id };
}
function tickDraw(scene, id) {
  scene.engine.tick(.05);
  const combat = scene.engine.checkpoint(), view = draw(scene, id);
  assert.deepEqual(scene.engine.checkpoint(), combat, 'presentation cannot write combat facts');
  return view;
}
function assertGeneratedBearing(scene, id, direction, nativeKey) {
  const view = scene.views.get(id), figures = view.visual.output.figures.filter(figure => figure.visible && !figure.fallen);
  assert.ok(figures.length > 0); assert.ok(figures.every(figure => figure.direction === direction));
  for (const figure of figures) {
    const selected = gettysburgInfantryClipPose(id, figure, scene.engine.time, { side: 'confederate', scenarioId: 'gettysburg',
      search: scene.artPassSearch, clips: scene.infantryClips, identity: 'a', versionedIdentity: true });
    const sprite = view.soldiers[figure.id].sprite;
    if (nativeKey) { assert.ok(selected); assert.equal(selected.key, nativeKey); assert.equal(sprite.textureKey, nativeKey); }
    else { assert.equal(selected, null); assert.ok(sprite.textureKey.startsWith('confederate-detailed-')); }
  }
}

for (const mode of ['fallback', 'withdraw', 'move']) test(`real engine ${mode} generates its actual facing independently of southward travel, with exact v13 mechanics`, () => {
  requireNative(); const active = marchingScene(mode), baseline = marchingScene(mode, 'gettysburg-v13');
  for (let index = 0; index < 200; index++) { tickDraw(active.scene, active.id); tickDraw(baseline.scene, baseline.id); }
  assert.deepEqual(active.scene.engine.checkpoint(), baseline.scene.engine.checkpoint());
  assert.ok(active.unit.y > 600); assert.equal(active.unit.lastVolleyAt, -100);
  if (mode === 'fallback') {
    close(active.unit.facing, -Math.PI / 2);
    assertGeneratedBearing(active.scene, active.id, 6, 'confederate-gettysburg-v7-a-march-n');
    assertGeneratedBearing(baseline.scene, baseline.id, 6, 'confederate-gettysburg-v7-a-march-n');
  } else {
    close(active.unit.facing, Math.PI / 2);
    assertGeneratedBearing(active.scene, active.id, 2, 'confederate-gettysburg-v14-a-march-s');
    assertGeneratedBearing(baseline.scene, baseline.id, 2, null);
  }
  const paused = json(spriteFacts(active.scene.views.get(active.id))), combat = active.scene.engine.checkpoint();
  active.scene.speed = 0; for (let index = 0; index < 3; index++) draw(active.scene, active.id);
  assert.deepEqual(spriteFacts(active.scene.views.get(active.id)), paused); assert.deepEqual(active.scene.engine.checkpoint(), combat);
  const saved = json(active.scene.checkpoint()), cold = coldScene(saved, active.id); draw(cold, active.id);
  assert.deepEqual(spriteFacts(cold.views.get(active.id)), paused); assert.deepEqual(cold.engine.checkpoint(), combat);
  assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation);
});

for (const mode of ['withdraw', 'routing']) test(`real ${mode} completes retirement and preserves native south gait and combat through cold JSON resume`, () => {
  requireNative(); const { scene, unit, id } = marchingScene(mode);
  let southSamples = 0;
  for (let index = 0; index < 120; index++) {
    const view = tickDraw(scene, id);
    if (view.visual.output.figures.filter(figure => figure.visible && !figure.fallen).every(figure => figure.direction === 2)) southSamples++;
  }
  const saved = json(scene.checkpoint()), cold = coldScene(saved, id); cold.speed = 1; draw(cold, id);
  assert.deepEqual(spriteFacts(cold.views.get(id)), spriteFacts(scene.views.get(id)));
  let ticks = 0;
  while (unit.active && ticks++ < 300) {
    const view = tickDraw(scene, id); tickDraw(cold, id);
    assert.deepEqual(cold.engine.checkpoint(), scene.engine.checkpoint());
    assert.deepEqual(spriteFacts(cold.views.get(id)), spriteFacts(view));
    if (unit.active && view.visual.output.figures.some(figure => figure.visible && !figure.fallen)) {
      assertGeneratedBearing(scene, id, 2, 'confederate-gettysburg-v14-a-march-s'); southSamples++;
      assert.equal(view.visual.output.figures.some(figure => figure.action === 'fire'), false);
    }
  }
  assert.ok(southSamples > 0); assert.ok(ticks < 300);
  assert.equal(unit.active, false); assert.equal(unit.withdrawn, true); assert.equal(unit.departureReason, 'disengaged');
  assert.equal(unit.withdrawalOrganized, mode === 'withdraw'); assert.ok(unit.y > 720); assert.equal(unit.lastVolleyAt, -100);
  assert.equal(scene.views.get(id).hitArea.input.enabled, false);
  // Retirement is a combat event followed by the existing one-field-second visual fade.
  for (let index = 0; index < 22; index++) { tickDraw(scene, id); tickDraw(cold, id); }
  assert.equal(scene.views.get(id).soldiers.some(soldier => soldier.sprite.visible), false);
  assert.deepEqual(cold.engine.checkpoint(), scene.engine.checkpoint());
  assert.deepEqual(json(cold.checkpoint()).presentation, json(scene.checkpoint()).presentation);
});

test('fighting fallback retains real north-facing fire while travel is southward', () => {
  requireNative(); const { scene, unit, id } = marchingScene('fallback');
  const enemy = scene.engine.state.find(unit => unit.side === 'union' && unit.type === 'infantry');
  Object.assign(enemy, { active: true, x: 850, y: 345, facing: Math.PI / 2, ammunition: 0, order: 'hold',
    target: { x: 850, y: 345 }, morale: 80, cohesion: 80 });
  let sawFallbackFire = false;
  for (let index = 0; index < 100; index++) {
    const view = tickDraw(scene, id);
    if (unit.order === 'fallback' && unit.y > 500 && view.visual.output.figures.some(figure => figure.visible && figure.action === 'fire')) {
      sawFallbackFire = true; close(unit.facing, -Math.PI / 2);
      for (const figure of view.visual.output.figures.filter(figure => figure.visible && figure.action === 'fire')) {
        assert.equal(figure.direction, 6);
        assert.equal(view.soldiers[figure.id].sprite.textureKey, 'confederate-gettysburg-v7-a-actions-n');
      }
    }
  }
  assert.ok(sawFallbackFire, 'engine-authored fighting fallback must keep its north-facing fire');
});

test('Gettysburg resolution preserves its tactical freeze and cannot invent a new southward retreat', () => {
  requireNative(); const { scene, unit, id } = marchingScene('hold'), before = { x: unit.x, y: unit.y, facing: unit.facing, status: unit.status };
  scene.engine.beginResolution('rout');
  for (let index = 0; index < 30; index++) tickDraw(scene, id);
  assert.deepEqual({ x: unit.x, y: unit.y, facing: unit.facing, status: unit.status }, before);
  assert.equal(scene.engine.outcome, 'rout');
  assert.ok(scene.views.get(id).visual.output.figures.filter(figure => figure.visible && !figure.fallen).every(figure => figure.direction === 6 && figure.action === 'idle'));
});
