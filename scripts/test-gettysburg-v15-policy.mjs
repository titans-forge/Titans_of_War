import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
import { GETTYSBURG_MOTION_STUDIES, getGettysburgMotionStudyCell } from '../src/battle/gettysburgMotionStudies.js';
import { createGettysburgActionSequence, createGettysburgTurnSequence, createGettysburgActionTurnSequence,
  getGettysburgMotionPlaybackPresets, getGettysburgMotionPlaybackInitialPreset,
  createGettysburgMotionPlaybackState } from '../src/battle/gettysburgMotionPlayback.js';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { FieldPresentationCache } from '../src/battle/fieldPresentationCache.js';
import { getBattleEngineConfig } from '../src/battle/battleDefinitions.js';
import { combatCheckpointEnvelope } from '../src/battle/combatCheckpointEnvelope.js';
import { createFormationVisual, updateFormationVisual } from '../src/battle/formationVisualState.js';
import { createFormationVisualCheckpoint, restoreFormationVisualFromCheckpoint } from '../src/battle/formationVisualCheckpoint.js';
import { createFreshCampaignState, createCampaignSnapshot, CAMPAIGN_SAVE_VERSION } from '../src/game/campaignStorage.js';
import { detailedInfantryPose, detailedUnitAssetDirectory, DETAILED_UNIT_PAGES } from '../src/battle/detailedUnitVisual.js';
import { deterministicUnitValue, formationFootprint } from '../src/battle/formationMath.js';
import { realisticInfantryPose, updateTravelDust } from '../src/battle/realisticUnitVisual.js';
import { retreatOpacity } from '../src/battle/retreatPresentation.js';
import { formationStatusLabel } from '../src/battle/battleTactics.js';
import { fieldTextureBudget } from '../src/battle/fieldPerformance.js';
import { gettysburgClipTestTextures } from './test-support/gettysburgClipTextures.mjs';

const search = '?artPass=gettysburg-v15';
const priorSearch = '?artPass=gettysburg-v14';
const root = path => new URL(`../${path}`, import.meta.url);
const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.parse(JSON.stringify(value));
const jsonHash = value => hash(JSON.stringify(value));
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);
const assets = gettysburgInfantryClipAssets('gettysburg', search);
const priorAssets = gettysburgInfantryClipAssets('gettysburg', priorSearch);
// Missing native files fail this suite during module load; no generated stand-ins
// or skip flag can replace four real reviewed native sheets.
const atlases = new Map(assets.map(asset => [asset.key, JSON.parse(readFileSync(root(`public/${asset.json}`)))]));
const textures = gettysburgClipTestTextures(atlases);
const prepare = (loaded = textures, query = search) => prepareGettysburgInfantryClips(
  gettysburgInfantryClipDefinitions('gettysburg', query, loaded),
  (key, frame) => loaded.exists(key) && loaded.get(key).has(frame));
const clips = prepare();
const nativeAssets = assets.filter(asset => asset.image.includes('/gettysburg-v15/'));
const nativeClips = clips.filter(clip => clip.key.startsWith('confederate-gettysburg-v15-a-'));
const formationId = 'v15-confederate-policy';
const idFor = identity => Array.from({ length: 256 }, (_, id) => id).find(id => gettysburgInfantryIdentity(formationId, id) === identity);
const pose = (figure, query = search, prepared = clips, side = 'confederate', extra = {}) =>
  gettysburgInfantryClipPose(formationId, figure, 0, { scenarioId: 'gettysburg', search: query, clips: prepared,
    side, identity: 'a', versionedIdentity: true, ...extra });
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
const requireNative = () => {
  assert.equal(nativeAssets.length, 4, 'four real v15 native atlas pairs are required');
  assert.equal(nativeClips.length, 8, 'eight complete reviewed v15 clips are required');
  assert.equal(clips.length, 72); assert.equal(initialize(textures).length, 72);
};

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
const campaign = { ...createFreshCampaignState(1861), battleRulesVersion: 18 };
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
function coldScene(saved, id, pass = 'gettysburg-v15') {
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

test('v15 appends four immutable Confederate A diagonal atlases; disabled paths read no metadata and preload keeps accepted assets', () => {
  requireNative();
  const policy = gettysburgInfantryClipPolicy('gettysburg', search);
  assert.deepEqual(GETTYSBURG_INFANTRY_CLIPS_IDS, Array.from({ length: 16 }, (_, index) => `gettysburg-v${index + 3}`));
  assert.ok(Object.isFrozen(policy) && Object.isFrozen(policy.atlases) && Object.isFrozen(policy.directions));
  assert.equal(policy.shotMotion, true); assert.equal(policy.shotPresentationId, 'gettysburg-v15'); assert.equal(policy.stableUnionIdentity, true);
  assert.deepEqual(policy.directions, [0, 1, 2, 3, 4, 5, 6, 7]); assert.equal(assets.length, 36);
  assert.deepEqual(assets.slice(0, 32), priorAssets); assert.equal(new Set(assets.map(asset => asset.key)).size, 36);
  assert.deepEqual(nativeAssets.map(asset => asset.key), ['march-se', 'actions-se', 'march-sw', 'actions-sw'].map(name => `confederate-gettysburg-v15-a-${name}`));
  for (const descriptor of policy.atlases) assert.ok(Object.isFrozen(descriptor));
  for (const base of ['/game', '/game/', 'https://example.test/game/']) assert.deepEqual(
    gettysburgInfantryClipAssets('gettysburg', search, base), assets.map(asset => ({ key: asset.key,
      image: `${base.replace(/\/$/, '')}/${asset.image}`, json: `${base.replace(/\/$/, '')}/${asset.json}` })));
  const unavailable = { exists() { assert.fail('disabled query inspected texture'); }, get() { assert.fail('disabled query read metadata'); } };
  for (const query of ['', '?artPass=gettysburg-v19', '?artPass=gettysburg-v15-other', '?other=gettysburg-v15', '?artPass=__proto__', '?artPass=constructor']) {
    assert.equal(gettysburgInfantryClipsEnabled('gettysburg', query), false);
    assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', query), []);
    assert.deepEqual(gettysburgInfantryClipDefinitions('gettysburg', query, unavailable), []); assert.deepEqual(initialize(unavailable, query), []);
  }
  for (const scenario of ['gettysburg_meade', 'gettysburg_jackson', 'first_manassas', 'shiloh', null]) {
    assert.equal(gettysburgInfantryClipsEnabled(scenario, search), false); assert.deepEqual(gettysburgInfantryClipAssets(scenario, search), []);
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
  assert.deepEqual(selected.filter(request => assets.some(asset => request.key === asset.key)), gettysburgInfantryClipAssets('gettysburg', search, '/game/'));
  for (const request of normal) assert.ok(selected.some(item => JSON.stringify(item) === JSON.stringify(request)), request.key);
});

test('native source bytes, independent reviews, Phaser frames, exact roots and muzzles bind all four sheets and eight clips', () => {
  requireNative();
  const annotations = JSON.parse(readFileSync(root('docs/art-pass/manifests/gettysburg-v15-source-annotations.json')));
  assert.equal(annotations.artPass, 'gettysburg-v15'); assert.equal(annotations.productionApproved, false); assert.equal(annotations.defaultApproved, false); assert.equal(annotations.familyComplete, false);
  assert.deepEqual(annotations.sources.map(spec => spec.name).sort(), ['actions-se', 'actions-sw', 'march-se', 'march-sw']);
  for (const spec of annotations.sources) {
    const bearing = spec.name.split('-')[1], direction = { se: 1, sw: 3 }[bearing];
    assert.equal(spec.side, 'confederate'); assert.equal(spec.identity, 'a'); assert.equal(spec.direction, direction);
    assert.equal(spec.key, `confederate-gettysburg-v15-a-${spec.name}`);
    assert.deepEqual(spec.actions.map(([action, indexes]) => [action, indexes.length]), spec.name.startsWith('march-')
      ? [['march', 4]] : [['ready', 1], ['fire', 1], ['reload', 2]]);
    const asset = nativeAssets.find(asset => asset.key === spec.key), atlas = atlases.get(spec.key), texture = textures.get(spec.key);
    const study = GETTYSBURG_MOTION_STUDIES.find(study => study.id === `confederate-${bearing}-${spec.name.split('-')[0]}-v15`);
    assert.ok(asset && atlas && texture && study); assert.equal(study.sourceReviewed, true); assert.equal(study.approved, false);
    const native = readFileSync(root(spec.source)), runtime = readFileSync(root(`public/${asset.image}`));
    assert.deepEqual(runtime, native); assert.equal(hash(runtime), spec.sha256); assert.equal(runtime[25], 6);
    const reviewBytes = readFileSync(root(spec.sourceReview)), review = JSON.parse(reviewBytes);
    assert.equal(hash(reviewBytes), spec.sourceReviewSHA256); assert.equal(review.source.sha256, spec.sha256);
    assert.equal(review.acceptedForOptIn, true); assert.equal(review.independentReview, true); assert.equal(review.allFourCellsReviewed, true);
    for (const certification of ['productionApproved', 'defaultApproved', 'completeFamilyApproved', 'humanCertified', 'physicalAnatomyCertified', 'historicalDrillCertified']) assert.equal(review[certification], false);
    assert.equal(spec.nativeReview.sourceHash, spec.sha256); assert.equal(spec.nativeReview.independentReview, true);
    assert.equal(spec.nativeReview.allFourCellsReviewed, true); assert.equal(spec.nativeReview.kitAccepted, true);
    assert.deepEqual(spec.bodySpans, spec.roots.map((root, index) => root[1] - spec.capTop[index]));
    const spans = [...spec.bodySpans].sort((a, b) => a - b), median = Math.floor((spans[1] + spans[2]) / 2 + .5);
    assert.equal(spec.referenceHeight, median); assert.equal(study.referenceHeight, median);
    assert.equal(study.source, `/${spec.source}`); assert.equal(study.sourceSha256, spec.sha256);
    assert.deepEqual([runtime.readUInt32BE(16), runtime.readUInt32BE(20)], [study.width, study.height]);
    assert.deepEqual([study.width, study.height], [spec.cell * 2, spec.cell * 2]);
    assert.deepEqual(atlas.meta.size, { w: study.width, h: study.height }); assert.equal(atlas.meta.artPass, 'gettysburg-v15');
    assert.equal(atlas.meta.sha256, spec.sha256); assert.equal(atlas.meta.source, spec.source); assert.equal(atlas.meta.productionApproved, false);
    const receipt = JSON.parse(readFileSync(root(study.receipt.slice(1))));
    assert.equal(atlas.meta.measurementReview, study.receipt.slice(1)); assert.equal(receipt.sourceHash, spec.sha256); assert.equal(receipt.source, spec.source);
    assert.equal(receipt.nativeMode, 'RGBA'); assert.deepEqual(receipt.nativeSize, atlas.meta.size);
    assert.equal(receipt.productionApproved, false); assert.equal(receipt.familyApproved, false); assert.equal(receipt.solidPaddingVerified, true);
    assert.deepEqual(receipt.clips, atlas.meta.clips); assert.deepEqual(receipt.cells.map(cell => cell.index).sort(), [0, 1, 2, 3]);
    for (const cell of receipt.cells) assert.ok(cell.alpha['64'].padding.every(value => value >= 16));
    assert.deepEqual(study.cellOrder, spec.actions.flatMap(([, indexes]) => indexes));
    for (let phase = 0; phase < 4; phase++) {
      const index = study.cellOrder[phase];
      assert.deepEqual(getGettysburgMotionStudyCell(study, phase), { x: index % 2 * spec.cell, y: Math.floor(index / 2) * spec.cell, w: spec.cell, h: spec.cell });
      assert.deepEqual(study.phaseRoots[phase], { x: spec.roots[index][0] / spec.cell, y: spec.roots[index][1] / spec.cell });
      assert.deepEqual(receipt.cells.find(cell => cell.index === index).rootPixels, spec.roots[index]);
    }
    for (const [action, indexes] of spec.actions) {
      const clip = atlas.meta.clips.find(clip => clip.action === action); assert.ok(clip); assert.deepEqual(validateGettysburgInfantryClip(clip), []);
      assert.equal(clip.side, 'confederate'); assert.equal(clip.identity, 'a'); assert.equal(clip.direction, direction);
      assert.equal(clip.referenceHeight, study.referenceHeight); assert.equal(clip.sourceHash, spec.sha256); assert.equal(clip.frames.length, indexes.length);
      for (const [phase, index] of indexes.entries()) {
        const frame = texture.get(clip.frames[phase]); assert.ok(frame);
        assert.deepEqual(atlas.frames[clip.frames[phase]].frame, { x: index % 2 * spec.cell, y: Math.floor(index / 2) * spec.cell, w: spec.cell, h: spec.cell });
        assert.equal(atlas.frames[clip.frames[phase]].rotated, false); assert.equal(atlas.frames[clip.frames[phase]].trimmed, false);
        close(clip.pivots[phase].x, spec.roots[index][0] / spec.cell, .000001); close(clip.pivots[phase].y, spec.roots[index][1] / spec.cell, .000001);
        assert.equal(frame.pivotX, clip.pivots[phase].x); assert.equal(frame.pivotY, clip.pivots[phase].y); assert.equal(frame.customData.bodyHeight, study.referenceHeight);
        if (action === 'fire') { close(clip.muzzles[phase].x, spec.muzzle[0] / spec.cell, .000001); close(clip.muzzles[phase].y, spec.muzzle[1] / spec.cell, .000001); }
      }
    }
  }
  for (const asset of assets) textures.get(asset.key).source[0].image = readFileSync(root(`public/${asset.image}`));
  const budget = fieldTextureBudget({ list: Object.fromEntries(textures.loaded) });
  assert.equal(budget.candidateAtlases, 36); assert.equal(budget.candidateClips, 72); assert.equal(budget.sources, 36);
  const pixels = [...atlases.values()].reduce((sum, atlas) => sum + atlas.meta.size.w * atlas.meta.size.h, 0);
  assert.equal(budget.pixels, pixels); assert.equal(budget.nominalRgbaBytes, pixels * 4);
});

const preservationFlags = [{}, { paused: true, frozenAction: 'native', frozenPhase: 'last' }, { reducedMotion: true }, { resolving: true, frozenAction: 'native', frozenPhase: 'last' }];
function preservationRows(clip, query, prepared) {
  const rows = [];
  for (const action of clip.action === 'march' ? ['walk', 'route'] : clip.action === 'ready' ? ['idle', 'ready'] : [clip.action])
  for (const frame of [0, 1, 2, 3, 4, 7, -1, 8]) for (const template of preservationFlags) for (const age of [0, .08, .19, .4]) {
    const flags = Object.keys(template).length ? { ...template, ...(template.frozenAction ? { frozenAction: clip.action, frozenPhase: clip.frames.length - 1 } : {}) } : {};
    const figure = { id: 17, direction: clip.direction, action, frame, scale: 1.37, bodyOffsetX: 5, bodyOffsetY: -4, lean: 2 };
    rows.push({ action, frame, flags, age, pose: gettysburgInfantryClipPose('v15-v14-preservation', figure, 999, {
      scenarioId: 'gettysburg', search: query, side: clip.side, identity: clip.identity, clips: prepared, shootingAge: age, ...flags }) });
  }
  return rows;
}

test('independently frozen original preserves all 32 atlas pairs, 64 addresses, 12 older policies, old poses and reviewer rows', () => {
  const baseline = JSON.parse(readFileSync(root('scripts/fixtures/gettysburg-v15-preservation.json')));
  assert.equal(baseline.schemaVersion, 1); assert.equal(baseline.capturedFrom, '/Users/titansforge/Vault/Titans_of_War');
  assert.equal(baseline.assets, 32); assert.equal(baseline.clips, 64); assert.equal(baseline.addresses.length, 64);
  assert.deepEqual(priorAssets.map(asset => ({ key: asset.key, image: hash(readFileSync(root(`public/${asset.image}`))),
    json: hash(readFileSync(root(`public/${asset.json}`))) })), baseline.hashes);
  const previous = prepare(textures, priorSearch); assert.equal(previous.length, 64); assert.equal(jsonHash(previous), baseline.clipHash);
  assert.deepEqual(clips.filter(clip => !clip.key.startsWith('confederate-gettysburg-v15-a-')), previous);
  assert.deepEqual(previous.map(clip => [clip.side, clip.identity, clip.direction, clip.action]), baseline.addresses.map(row => row.address));
  for (const [index, clip] of previous.entries()) {
    const expected = baseline.addresses[index], rows = preservationRows(clip, priorSearch, previous);
    assert.equal(rows.length, expected.rows); assert.equal(jsonHash(rows), expected.poseHash, `${expected.address} retained pose samples`);
    assert.deepEqual(preservationRows(clip, search, clips), rows, `${expected.address} v15 keeps original pose results`);
  }
  for (const pass of baseline.oldPasses) {
    const query = `?artPass=${pass.pass}`, prepared = prepare(textures, query), rows = prepared.flatMap(clip => preservationRows(clip, query, prepared));
    assert.deepEqual(gettysburgInfantryClipPolicy('gettysburg', query), pass.policy); assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', query), pass.assets);
    assert.equal(prepared.length, pass.clips); assert.equal(jsonHash(prepared), pass.clipHash); assert.equal(rows.length, pass.poseRows); assert.equal(jsonHash(rows), pass.poseHash);
  }
  const studies = GETTYSBURG_MOTION_STUDIES.filter(study => !study.id.endsWith('-v15') && !study.id.endsWith('-v16')), presets = getGettysburgMotionPlaybackPresets(studies);
  assert.equal(studies.length, baseline.studyRows); assert.equal(jsonHash(studies), baseline.studyHash);
  assert.equal(presets.length, baseline.presetRows); assert.equal(jsonHash(presets), baseline.presetHash);
  assert.equal(getGettysburgMotionPlaybackInitialPreset(presets).id, baseline.initialPreset); assert.deepEqual(createGettysburgMotionPlaybackState(studies), baseline.playbackState);
});

test('SE/SW select exact Confederate A addresses, semantic source phases and recoil; Union identities and unsupported art stay accepted', () => {
  requireNative(); const id = idFor('b'), contact = gettysburgInfantryContactPhase(formationId, id);
  for (const direction of [1, 3]) for (const [action, count] of [['idle', 1], ['walk', 4], ['route', 4], ['fire', 1], ['reload', 2]]) for (let frame = 0; frame < 8; frame++) {
    const figure = { id, direction, action, frame, scale: .82 }, selected = pose(figure, search, clips, 'confederate', { shootingAge: .08 });
    assert.ok(selected); assert.equal(selected.identity, 'a'); assert.equal(selected.direction, direction); assert.ok(selected.key.startsWith('confederate-gettysburg-v15-a-'));
    assert.equal(selected.phase, ['walk', 'route'].includes(action) ? (frame + contact) % count : action === 'reload' ? Math.floor(frame / 2) % count : 0);
    assert.equal(selected.flip, false); assert.equal(selected.angle, 0); assert.equal(selected.shotMotion, true);
    assert.equal(pose(figure, priorSearch, prepare(textures, priorSearch)), null);
    assert.equal(pose(figure, search, clips, 'confederate', { identity: 'b', versionedIdentity: false }), null);
    for (const identity of ['a', 'b']) {
      const union = pose({ ...figure, id: idFor(identity) }, search, clips, 'union'); assert.ok(union); assert.equal(union.identity, identity); assert.ok(!union.key.includes('gettysburg-v15'));
    }
    assert.equal(pose(figure, search, clips, 'confederate', { paused: true, frozenAction: action, frozenPhase: count - 1 }).phase, count - 1);
    for (const flags of [{ reducedMotion: true }, { resolving: true }]) {
      const fixed = pose(figure, search, clips, 'confederate', { shootingAge: .08, ...flags }); assert.equal(fixed.offsetX, 0); assert.equal(fixed.offsetY, 0);
    }
    if (action === 'fire') {
      close(selected.offsetX, -Math.cos(direction * Math.PI / 4) * 1.1 * figure.scale);
      close(selected.offsetY, -Math.sin(direction * Math.PI / 4) * .55 * figure.scale);
      for (const age of [0, .4, .5]) { const fixed = pose(figure, search, clips, 'confederate', { shootingAge: age }); assert.equal(fixed.offsetX, 0); assert.equal(fixed.offsetY, 0); }
    }
  }
  for (const direction of [-1, 8, .5, NaN, undefined, '1']) assert.equal(pose({ id, direction, action: 'walk', frame: 0 }), null);
  for (const action of ['melee', 'casualty', '__proto__']) assert.equal(pose({ id, direction: 1, action, frame: 0 }), null);
  assert.equal(pose({ id, direction: 1, action: 'walk', frame: 0, fallen: true }), null);
});

test('a missing native phase withholds its whole action and the extracted real renderer uses accepted art', () => {
  requireNative();
  for (const clip of nativeClips) for (const frameName of clip.frames) {
    const damaged = gettysburgClipTestTextures(atlases); damaged.get(clip.key).frames.delete(frameName);
    const prepared = initialize(damaged); assert.equal(prepared.length, 71); assert.ok(!prepared.some(value => value.key === clip.key && value.action === clip.action));
    const fixture = renderFixture(clip.direction, prepared); fixture.figure.action = clip.action === 'march' ? 'walk' : clip.action === 'ready' ? 'idle' : clip.action;
    for (let frame = 0; frame < 8; frame++) { fixture.figure.frame = frame; fixture.sync(); assertAccepted(fixture); }
  }
  for (const asset of nativeAssets) for (const mode of ['metadata', 'review', 'binding']) {
    const damaged = structuredClone(atlases.get(asset.key));
    if (mode !== 'metadata') for (const clip of damaged.meta.clips) {
      if (mode === 'review') clip.approval.reviewed = false;
      else clip.key = nativeAssets.find(value => value.key !== asset.key).key;
    }
    const loaded = gettysburgClipTestTextures(new Map([...atlases].map(([key, atlas]) => [key, key === asset.key ? damaged : atlas])));
    // Phaser still parses genuine frame dimensions; remove only the loaded
    // clip metadata used by the real scene's candidate selection.
    if (mode === 'metadata') delete loaded.get(asset.key).customData.meta;
    const prepared = initialize(loaded);
    assert.equal(prepared.length, asset.key.includes('-march-') ? 71 : 69);
  }
  for (const direction of [1, 3]) {
    const fixture = renderFixture(direction);
    for (const action of ['idle', 'walk', 'route', 'fire', 'reload']) for (let frame = 0; frame < 8; frame++) {
      Object.assign(fixture.figure, { action, frame }); fixture.sync(); const selected = pose(fixture.figure);
      assert.equal(fixture.soldier.sprite.textureKey, selected.key); assert.equal(fixture.soldier.sprite.frameName, selected.frame);
      assert.deepEqual(fixture.soldier.sprite.origin, selected.pivot); assert.equal(fixture.soldier.sprite.scaleX, 58 * fixture.figure.scale / selected.referenceHeight * selected.width);
    }
    for (const query of ['', '?artPass=gettysburg-v19']) { fixture.scene.artPassSearch = query; fixture.sync(); assertAccepted(fixture); }
    fixture.scene.artPassSearch = search;
    for (const scenario of ['gettysburg_meade', 'first_manassas', 'shiloh']) { fixture.scene.scenarioId = scenario; fixture.sync(); assertAccepted(fixture); }
  }
});

test('reviewer appends retained rows and S/SE/SW action and turn comparisons without phase jumps; incomplete review falls back to v14', () => {
  requireNative();
  const previous = GETTYSBURG_MOTION_STUDIES.filter(study => !study.id.endsWith('-v15') && !study.id.endsWith('-v16'));
  const current = GETTYSBURG_MOTION_STUDIES.filter(study => study.id.endsWith('-v15')); assert.equal(current.length, 36);
  const retained = previous.filter(study => study.id.endsWith('-v14')); assert.equal(retained.length, 32);
  for (const prior of retained) {
    const study = current.find(study => study.id === prior.id.replace(/-v14$/, '-v15')); assert.ok(study && Object.isFrozen(study)); assert.equal(study.retainedFrom, prior.id);
    for (const key of ['source', 'receipt', 'sourceSha256', 'width', 'height', 'columns', 'rows', 'cellOrder', 'phaseRoots', 'root', 'referenceHeight']) assert.deepEqual(study[key], prior[key]);
    assert.deepEqual(study.limitations.slice(0, prior.limitations.length), prior.limitations);
  }
  const oldPresets = getGettysburgMotionPlaybackPresets(previous), presets = getGettysburgMotionPlaybackPresets(GETTYSBURG_MOTION_STUDIES), oldIds = new Set(oldPresets.map(preset => preset.id));
  assert.deepEqual(presets.filter(preset => oldIds.has(preset.id)), oldPresets);
  for (const pair of [['s', 'se'], ['s', 'sw'], ['se', 'sw']]) for (const kind of ['march', 'actions', 'turn', 'action-turn']) {
    const preset = presets.find(preset => preset.id === `v15-confederate-${pair.join('-')}-${kind}`); assert.ok(preset); assert.equal(preset.reviewComplete, true);
    assert.equal(preset.sequence.length, { march: 4, actions: 10, turn: 14, 'action-turn': 30 }[kind]);
    for (const item of preset.sequence) {
      assert.equal(item.left.phase, item.right.phase); assert.equal(item.left.action, item.right.action);
      for (const panel of [item.left, item.right]) { const study = current.find(study => study.id === panel.studyId); assert.ok(study?.phaseRoots[panel.phase]); assert.ok(panel.studyId.startsWith('confederate-')); }
    }
    for (const make of [createGettysburgTurnSequence, createGettysburgActionTurnSequence]) {
      const turns = make(GETTYSBURG_MOTION_STUDIES, 'v15', 'a', pair, 'confederate');
      for (let index = 1; index < turns.length; index++) if (turns[index].bearing !== turns[index - 1].bearing) {
        assert.equal(turns[index].phase, turns[index - 1].phase); assert.equal(turns[index].action, turns[index - 1].action);
      }
    }
  }
  assert.equal(getGettysburgMotionPlaybackInitialPreset(presets).id, 'v15-confederate-s-se-actions');
  assert.deepEqual(createGettysburgMotionPlaybackState(GETTYSBURG_MOTION_STUDIES).panels,
    { left: { studyId: 'confederate-se-march-v15', phase: 0 }, right: { studyId: 'confederate-se-actions-v15', phase: 0 } });
  for (const bearing of ['s', 'se', 'sw']) for (const kind of ['march', 'actions']) {
    const id = `confederate-${bearing}-${kind}-v15`, study = current.find(study => study.id === id), missing = GETTYSBURG_MOTION_STUDIES.filter(study => study.id !== id);
    for (const partial of [missing, [...missing, { ...study, status: 'rejected' }], [...missing, { ...study, cellOrder: [0, 1, 1, 3] }],
      [...missing, study, study], [...missing, { ...study, sourceReviewed: false }], [...missing, { ...study, phaseRoots: [] }],
      [...missing, { ...study, receipt: '' }], [...missing, { ...study, source: ' ' }], [...missing, { ...study, sourceSha256: 'invalid' }],
      [...missing, { ...study, referenceHeight: 0 }], [...missing, { ...study, phaseRoots: study.phaseRoots.map(root => ({ ...root, y: NaN })) }]]) {
      assert.equal(getGettysburgMotionPlaybackInitialPreset(getGettysburgMotionPlaybackPresets(partial)).id, 'v14-confederate-n-s-actions');
      assert.deepEqual(createGettysburgMotionPlaybackState(partial).panels, createGettysburgMotionPlaybackState(previous).panels);
    }
  }
});

for (const direction of [1, 3]) test(`real direction ${direction} volley latches native mouths and recoil; pause, JSON cold resume and re-save retain presentation and rules 18`, () => {
  requireNative(); const { scene, unit, id } = volleyFixture(direction), before = scene.engine.checkpoint();
  const view = draw(scene, id), shots = json(view.shots), clip = nativeClips.find(clip => clip.direction === direction && clip.action === 'fire');
  assert.ok(shots.figures.length > 0); assert.ok(shots.figures.every(shot => shot.native)); assert.ok(clip);
  const frame = textures.get(clip.key).get(clip.frames[0]);
  for (const shot of shots.figures) {
    const figure = view.visual.output.figures.find(figure => figure.id === shot.id), scale = 58 * figure.scale / clip.referenceHeight * (.95 + deterministicUnitValue(id, shot.id, 215) * .1);
    close(shot.x, figure.x + (clip.muzzles[0].x - clip.pivots[0].x) * frame.realWidth * scale);
    close(shot.y, figure.y + (clip.muzzles[0].y - clip.pivots[0].y) * frame.realHeight * scale); close(shot.bearing, direction * Math.PI / 4);
  }
  let recoiling = 0;
  for (const figure of view.visual.output.figures.filter(figure => figure.visible && !figure.fallen && figure.action === 'fire')) {
    const selected = gettysburgInfantryClipPose(id, figure, scene.engine.time, { scenarioId: 'gettysburg', search, side: 'confederate', clips, identity: 'a', versionedIdentity: true,
      shootingAge: gettysburgInfantryShootingAge(current(scene, id), figure.id, scene.engine.time) }), sprite = view.soldiers[figure.id].sprite;
    assert.equal(sprite.textureKey, clip.key); assert.equal(sprite.frame, frame); close(sprite.x, figure.x + selected.offsetX); close(sprite.y, figure.y + selected.offsetY);
    if (Math.hypot(selected.offsetX, selected.offsetY) > 0) { recoiling++; assert.ok(selected.offsetX * Math.cos(direction * Math.PI / 4) + selected.offsetY * Math.sin(direction * Math.PI / 4) < 0); }
  }
  assert.ok(recoiling > 0); assertSmoke(scene, shots); assert.deepEqual(scene.engine.checkpoint(), before);
  const initialSprites = json(spriteFacts(view)), initialSmoke = json(scene.smoke.draws); scene.speed = 0;
  for (let index = 0; index < 3; index++) draw(scene, id);
  assert.deepEqual(spriteFacts(view), initialSprites); assert.deepEqual(scene.smoke.draws, initialSmoke);
  const saved = json(scene.checkpoint()); assert.equal(saved.version, 1); assert.equal(saved.state.battleRulesVersion, 18);
  const campaignSave = createCampaignSnapshot(campaign, null); assert.equal(CAMPAIGN_SAVE_VERSION, 22); assert.equal(campaignSave.version, 22); assert.equal(campaignSave.state.battleRulesVersion, 18); assert.equal(saved.presentation.shots.artPass, 'gettysburg-v15');
  assert.deepEqual(combatCheckpointEnvelope(saved), before);
  const cold = coldScene(saved, id); assert.deepEqual(cold.views.get(id).shots, shots); assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation);
  draw(cold, id); assert.deepEqual(spriteFacts(cold.views.get(id)), initialSprites); assert.deepEqual(cold.smoke.draws, initialSmoke); assert.deepEqual(cold.engine.checkpoint(), before);
  scene.engine.time = 7.8; Object.assign(unit, { x: unit.x + 41, y: unit.y + 17, facing: -Math.PI / 2, formationMode: 'column', strength: unit.initialStrength * .72 });
  draw(scene, id); assert.deepEqual(view.shots, shots); assertSmoke(scene, shots); assert.equal(scene.smoke.draws.some(draw => draw.shape === 'circle'), false);
  const moved = json(scene.checkpoint()), movedSprites = json(spriteFacts(view)), movedSmoke = json(scene.smoke.draws), movedCold = coldScene(moved, id);
  assert.deepEqual(movedCold.views.get(id).shots, shots); assert.deepEqual(json(movedCold.checkpoint()).presentation, moved.presentation);
  draw(movedCold, id); assert.deepEqual(spriteFacts(movedCold.views.get(id)), movedSprites); assert.deepEqual(movedCold.smoke.draws, movedSmoke);
  assert.deepEqual(movedCold.engine.checkpoint(), scene.engine.checkpoint());
  scene.engine.time = 8.25; draw(scene, id); assert.equal(view.shots, null); assert.deepEqual(scene.smoke.draws, []);
});

test('shot checkpoints remain pass bound across v12-v15 and damaged optional records cannot change combat', () => {
  requireNative();
  for (const pass of ['gettysburg-v12', 'gettysburg-v13', 'gettysburg-v14', 'gettysburg-v15']) {
    windowState.location.search = `?artPass=${pass}`;
    const scene = attachRenderer(new Scene('gettysburg', campaign, 'option_a')); scene.engine.time = 7.08;
    const unit = scene.engine.state.find(unit => unit.side === 'confederate' && unit.type === 'infantry' && unit.active);
    const direction = pass === 'gettysburg-v15' ? 1 : pass === 'gettysburg-v14' ? 2 : 0;
    Object.assign(unit, { facing: direction * Math.PI / 4, formationMode: 'line', lastVolleyAt: 7, status: 'firing', reload: 10 });
    scene.createFormation(current(scene, unit.id)); draw(scene, unit.id);
    const formation = current(scene, unit.id), combat = scene.engine.checkpoint(), saved = json(scene.checkpoint()), savedPass = pass;
    assert.equal(saved.presentation.shots.artPass, savedPass);
    for (const selected of ['gettysburg-v12', 'gettysburg-v13', 'gettysburg-v14', 'gettysburg-v15']) {
      const cold = coldScene(saved, unit.id, selected); assert.deepEqual(cold.engine.checkpoint(), combat);
      assert.deepEqual(cold.views.get(unit.id).shots, selected === savedPass ? scene.views.get(unit.id).shots : null);
      if (selected === savedPass) assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation);
      else {
        // A safe immediate re-save samples current selected art, never restores
        // another pass's historical mouths or changes the engine checkpoint.
        const resaved = json(cold.checkpoint()); assert.equal(resaved.presentation.shots.artPass, selected);
        assert.deepEqual(combatCheckpointEnvelope(resaved), combat); draw(cold, unit.id); assert.deepEqual(cold.engine.checkpoint(), combat);
      }
    }
    for (const damaged of ['gettysburg-v11', 'gettysburg-v16', 'gettysburg-v17', 'gettysburg-v18', 'gettysburg-v19', null, '__proto__']) {
      const rejected = json(saved.presentation); rejected.shots.artPass = damaged;
      assert.equal(restoreGettysburgInfantryShots(formation, 32, 7.08, rejected, savedPass), null);
      if (['gettysburg-v16', 'gettysburg-v17', 'gettysburg-v18'].includes(damaged)) {
        assert.equal(createGettysburgInfantryShotCheckpoint([formation], scene.views, 7.08, damaged).artPass, damaged);
      } else {
        assert.equal(createGettysburgInfantryShotCheckpoint([formation], scene.views, 7.08, damaged), null);
      }
    }
    assert.equal(createGettysburgInfantryShotCheckpoint([formation], scene.views, 7.08).artPass, 'gettysburg-v12');
    assert.equal(restoreGettysburgInfantryShots(formation, 32, 8.25, { ...saved.presentation, time: 8.25, shots: { ...saved.presentation.shots, time: 8.25 } }, savedPass), null);
    const malformed = json(saved.presentation); malformed.shots.formations[0].volley.figures[0].scale = 99;
    assert.equal(restoreGettysburgInfantryShots(formation, 32, 7.08, malformed, savedPass), null);
    const damagedCold = coldScene({ ...saved, presentation: malformed }, unit.id, pass); assert.deepEqual(damagedCold.engine.checkpoint(), combat); assert.equal(damagedCold.views.get(unit.id).shots, null);
  }
});

for (const direction of [1, 3]) test(`real engine diagonal ${direction} travel matches v14 combat and survives paused cold JSON continuation`, () => {
  requireNative();
  function movingScene(pass) {
    windowState.location.search = `?artPass=${pass}`; const scene = attachRenderer(new Scene('gettysburg', campaign, 'option_a'));
    for (const unit of scene.engine.state) unit.active = false;
    const unit = scene.engine.state.find(unit => unit.side === 'confederate' && unit.type === 'infantry');
    Object.assign(unit, { active: true, x: 850, y: 500, facing: direction * Math.PI / 4, order: 'hold', target: { x: 850, y: 500 }, ammunition: 40, reload: 0, morale: 80, cohesion: 80 });
    scene.createFormation(current(scene, unit.id)); draw(scene, unit.id); scene.speed = 1;
    scene.engine.move(unit.id, { x: 850 + (direction === 1 ? 140 : -140), y: 640 }); return { scene, unit, id: unit.id };
  }
  const active = movingScene('gettysburg-v15'), previous = movingScene('gettysburg-v14'); let samples = 0;
  for (let index = 0; index < 120; index++) {
    active.scene.engine.tick(.05); previous.scene.engine.tick(.05); const before = active.scene.engine.checkpoint(), view = draw(active.scene, active.id); draw(previous.scene, previous.id);
    assert.deepEqual(active.scene.engine.checkpoint(), before); assert.deepEqual(previous.scene.engine.checkpoint(), before);
    for (const figure of view.visual.output.figures.filter(figure => figure.visible && !figure.fallen && figure.direction === direction && figure.action === 'walk')) {
      samples++; assert.equal(view.soldiers[figure.id].sprite.textureKey, `confederate-gettysburg-v15-a-march-${direction === 1 ? 'se' : 'sw'}`);
      assert.ok(previous.scene.views.get(previous.id).soldiers[figure.id].sprite.textureKey.startsWith('confederate-detailed-'));
    }
  }
  assert.ok(samples > 0); const frozen = json(spriteFacts(active.scene.views.get(active.id))), combat = active.scene.engine.checkpoint(); active.scene.speed = 0;
  for (let index = 0; index < 3; index++) draw(active.scene, active.id);
  assert.deepEqual(spriteFacts(active.scene.views.get(active.id)), frozen); assert.deepEqual(active.scene.engine.checkpoint(), combat);
  const saved = json(active.scene.checkpoint()), cold = coldScene(saved, active.id); draw(cold, active.id);
  assert.deepEqual(spriteFacts(cold.views.get(active.id)), frozen); assert.deepEqual(cold.engine.checkpoint(), combat); assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation);
  active.scene.speed = 1; cold.speed = 1;
  for (let index = 0; index < 40; index++) {
    active.scene.engine.tick(.05); cold.engine.tick(.05); draw(active.scene, active.id); draw(cold, active.id);
    assert.deepEqual(cold.engine.checkpoint(), active.scene.engine.checkpoint()); assert.deepEqual(spriteFacts(cold.views.get(active.id)), spriteFacts(active.scene.views.get(active.id)));
  }
});
