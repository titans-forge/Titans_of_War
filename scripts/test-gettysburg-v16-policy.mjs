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
import { gettysburgInfantryReloadProgress } from '../src/battle/gettysburgInfantryReloadProgress.js';
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

const search = '?artPass=gettysburg-v16';
const priorSearch = '?artPass=gettysburg-v15';
const root = path => new URL(`../${path}`, import.meta.url);
const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.parse(JSON.stringify(value));
const jsonHash = value => hash(JSON.stringify(value));
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);
const assets = gettysburgInfantryClipAssets('gettysburg', search);
const priorAssets = gettysburgInfantryClipAssets('gettysburg', priorSearch);
// Missing native files fail this suite during module load; no generated stand-ins
// or skip flag can replace one real reviewed native SW sheet.
const baseline = JSON.parse(readFileSync(root('scripts/fixtures/gettysburg-v16-preservation.json')));
const availableAssets = [...new Map([...baseline.allPriorAssets, ...assets].map(asset => [asset.key, asset])).values()];
const atlases = new Map(availableAssets.map(asset => [asset.key, JSON.parse(readFileSync(root(`public/${asset.json}`)))]));
const textures = gettysburgClipTestTextures(atlases);
const prepare = (loaded = textures, query = search) => prepareGettysburgInfantryClips(
  gettysburgInfantryClipDefinitions('gettysburg', query, loaded),
  (key, frame) => loaded.exists(key) && loaded.get(key).has(frame));
const clips = prepare();
const nativeAssets = assets.filter(asset => asset.image.includes('/gettysburg-v16/'));
const nativeClips = clips.filter(clip => clip.key.startsWith('confederate-gettysburg-v16-a-'));
const formationId = 'v16-confederate-policy';
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
  assert.equal(nativeAssets.length, 1, 'one genuine v16 native SW atlas pair is required');
  assert.equal(nativeClips.length, 1, 'one complete reviewed v16 SW march clip is required');
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
  gettysburgInfantryClipPose, gettysburgInfantryShootingAge, gettysburgInfantryReloadProgress, formationStatusLabel, retreatOpacity,
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
function coldScene(saved, id, pass = 'gettysburg-v16') {
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

const oldSWKey = 'confederate-gettysburg-v15-a-march-sw';
const nativeSWKey = 'confederate-gettysburg-v16-a-march-sw';
const address = clip => JSON.stringify([clip.side, clip.identity, clip.direction, clip.action]);
const preservationFlags = [{}, { paused: true, frozenAction: 'native', frozenPhase: 'last' }, { reducedMotion: true }, { resolving: true, frozenAction: 'native', frozenPhase: 'last' }];
function preservationRows(clip, query, prepared) {
  const rows = [];
  for (const action of clip.action === 'march' ? ['walk', 'route'] : clip.action === 'ready' ? ['idle', 'ready'] : [clip.action])
  for (const frame of [0, 1, 2, 3, 4, 7, -1, 8]) for (const template of preservationFlags) for (const age of [0, .08, .19, .4]) {
    const flags = Object.keys(template).length ? { ...template, ...(template.frozenAction ? { frozenAction: clip.action, frozenPhase: clip.frames.length - 1 } : {}) } : {};
    const figure = { id: 17, direction: clip.direction, action, frame, scale: 1.37, bodyOffsetX: 5, bodyOffsetY: -4, lean: 2 };
    rows.push({ action, frame, flags, age, pose: gettysburgInfantryClipPose('v16-v15-preservation', figure, 999, {
      scenarioId: 'gettysburg', search: query, side: clip.side, identity: clip.identity, clips: prepared, shootingAge: age, ...flags }) });
  }
  return rows;
}

test('v16 replaces exactly one whole SW march atlas with fixed selected count and exact Gettysburg opt-in', () => {
  requireNative();
  const policy = gettysburgInfantryClipPolicy('gettysburg', search), prior = gettysburgInfantryClipPolicy('gettysburg', priorSearch);
  assert.deepEqual(GETTYSBURG_INFANTRY_CLIPS_IDS, [...baseline.oldPasses.map(row => row.pass), 'gettysburg-v16', 'gettysburg-v17', 'gettysburg-v18']);
  assert.ok(Object.isFrozen(policy) && Object.isFrozen(policy.atlases) && Object.isFrozen(policy.directions));
  assert.equal(policy.shotMotion, true); assert.equal(policy.shotPresentationId, 'gettysburg-v16'); assert.equal(policy.stableUnionIdentity, true);
  assert.deepEqual(policy.directions, prior.directions); assert.equal(assets.length, 36); assert.equal(new Set(assets.map(asset => asset.key)).size, 36);
  assert.deepEqual(nativeAssets.map(asset => asset.key), [nativeSWKey]);
  assert.equal(assets.some(asset => asset.key === oldSWKey), false);
  assert.deepEqual(assets.filter(asset => asset.key !== nativeSWKey), priorAssets.filter(asset => asset.key !== oldSWKey));
  assert.deepEqual(policy.atlases.filter(descriptor => descriptor.key !== nativeSWKey), prior.atlases.filter(descriptor => descriptor.key !== oldSWKey));
  for (const descriptor of policy.atlases) assert.ok(Object.isFrozen(descriptor));
  for (const base of ['/game', '/game/', 'https://example.test/game/']) assert.deepEqual(
    gettysburgInfantryClipAssets('gettysburg', search, base), assets.map(asset => ({ key: asset.key,
      image: `${base.replace(/\/$/, '')}/${asset.image}`, json: `${base.replace(/\/$/, '')}/${asset.json}` })));
  const unavailable = { exists() { assert.fail('disabled query inspected texture'); }, get() { assert.fail('disabled query read metadata'); } };
  for (const query of ['', '?artPass=gettysburg-v19', '?artPass=gettysburg-v16-other', '?other=gettysburg-v16', '?artPass=__proto__', '?artPass=constructor']) {
    assert.equal(gettysburgInfantryClipsEnabled('gettysburg', query), false); assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', query), []);
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
  assert.equal(selected.some(request => request.key === oldSWKey), false);
  for (const request of normal) assert.ok(selected.some(item => JSON.stringify(item) === JSON.stringify(request)), request.key);
});

test('genuine native bytes and independent source review bind four freshly measured SW cells with at most five percent span variation', () => {
  requireNative();
  const annotations = JSON.parse(readFileSync(root('docs/art-pass/manifests/gettysburg-v16-source-annotations.json')));
  assert.equal(annotations.artPass, 'gettysburg-v16'); assert.equal(annotations.productionApproved, false); assert.equal(annotations.defaultApproved, false); assert.equal(annotations.familyComplete, false);
  assert.equal(annotations.sources.length, 1); const spec = annotations.sources[0];
  assert.equal(spec.name, 'march-sw'); assert.equal(spec.key, nativeSWKey); assert.equal(spec.side, 'confederate'); assert.equal(spec.identity, 'a'); assert.equal(spec.direction, 3);
  assert.deepEqual(spec.actions, [['march', [0, 1, 2, 3]]]); assert.equal(spec.roots.length, 4); assert.equal(spec.capTop.length, 4);
  const asset = nativeAssets[0], atlas = atlases.get(nativeSWKey), texture = textures.get(nativeSWKey), clip = nativeClips[0];
  const native = readFileSync(root(spec.source)), runtime = readFileSync(root(`public/${asset.image}`));
  assert.deepEqual(runtime, native); assert.equal(hash(runtime), spec.sha256); assert.equal(runtime[24], 8); assert.equal(runtime[25], 6);
  assert.deepEqual([runtime.readUInt32BE(16), runtime.readUInt32BE(20)], [spec.cell * 2, spec.cell * 2]);
  assert.deepEqual(atlas.meta.size, { w: spec.cell * 2, h: spec.cell * 2 }); assert.equal(atlas.meta.artPass, 'gettysburg-v16');
  assert.equal(atlas.meta.sha256, spec.sha256); assert.equal(atlas.meta.source, spec.source); assert.equal(atlas.meta.productionApproved, false);
  const reviewBytes = readFileSync(root(spec.sourceReview)), review = JSON.parse(reviewBytes);
  assert.equal(hash(reviewBytes), spec.sourceReviewSHA256); assert.equal(review.source.sha256, spec.sha256);
  assert.equal(review.acceptedForOptIn, true); assert.equal(review.independentReview, true); assert.equal(review.allFourCellsReviewed, true);
  assert.equal(review.completeNativeSheetInspected, true);
  assert.deepEqual(review.cells.map(cell => cell.cell), [0, 1, 2, 3]);
  assert.deepEqual(review.cells.map(cell => cell.phaseRole), ['contact', 'passing', 'opposite-contact', 'opposite-passing']);
  for (const cell of review.cells) for (const key of ['poseAccepted', 'bearingAccepted', 'kitAccepted', 'completeLegChainsAccepted', 'supportRoleAccepted']) assert.equal(cell[key], true);
  const contract = review.measurementContract;
  for (const key of ['roots', 'capTop', 'bodySpans', 'referenceHeight', 'capROIs', 'supportingSoleROIs', 'pelvisCenterX', 'measurementThreshold']) assert.deepEqual(contract[key], spec[key]);
  assert.equal(contract.cell, spec.cell); assert.equal(contract.measurementThreshold, 64); assert.equal(contract.measuredSourceSha256, spec.sha256); assert.equal(contract.measurementsFresh, true);
  assert.equal(contract.muzzleApplicable, false); assert.equal(Object.hasOwn(contract, 'muzzle'), false); assert.equal(Object.hasOwn(contract, 'firingBarrelMouth'), false);
  assert.deepEqual(contract.perCellSupportingSoleGroundY, spec.roots.map(point => point[1])); assert.deepEqual(spec.pelvisCenterX, spec.roots.map(point => point[0]));
  for (const certification of ['productionApproved', 'defaultApproved', 'completeFamilyApproved', 'humanCertified', 'physicalAnatomyCertified', 'historicalDrillCertified']) assert.equal(review[certification], false);
  assert.equal(spec.nativeReview.sourceHash, spec.sha256); assert.equal(spec.nativeReview.independentReview, true);
  assert.equal(spec.nativeReview.allFourCellsReviewed, true); assert.equal(spec.nativeReview.kitAccepted, true);
  assert.deepEqual(spec.bodySpans, spec.roots.map((point, index) => point[1] - spec.capTop[index]));
  assert.ok(spec.bodySpans.every(span => Number.isFinite(span) && span > 0));
  const spans = [...spec.bodySpans].sort((a, b) => a - b), exactMedian = (spans[1] + spans[2]) / 2, median = Math.floor(exactMedian + .5);
  assert.equal(spec.referenceHeight, median); assert.ok((spans[3] - spans[0]) / exactMedian <= .05);
  const receipt = JSON.parse(readFileSync(root(atlas.meta.measurementReview)));
  assert.equal(receipt.sourceHash, spec.sha256); assert.equal(receipt.source, spec.source); assert.equal(receipt.nativeMode, 'RGBA');
  assert.deepEqual(receipt.nativeSize, atlas.meta.size); assert.equal(receipt.productionApproved, false); assert.equal(receipt.familyApproved, false); assert.equal(receipt.solidPaddingVerified, true);
  assert.equal(receipt.sourceReview, spec.sourceReview); assert.equal(receipt.sourceReviewSHA256, spec.sourceReviewSHA256);
  for (const certification of ['defaultApproved', 'completeFamilyApproved', 'humanCertified', 'physicalAnatomyCertified', 'historicalDrillCertified']) assert.equal(receipt[certification], false);
  const fresh = receipt.freshMeasurementContract;
  assert.equal(fresh.threshold, 64); assert.equal(fresh.sourceHash, spec.sha256); assert.equal(fresh.manualROIsIndependentlyReviewed, true); assert.equal(fresh.freshNativePixelsRecomputed, true);
  assert.equal(fresh.phaseScaleNormalization, false); assert.equal(fresh.maximumSpanRangeFractionOfMedian, .05);
  assert.equal(fresh.medianBodySpan, exactMedian); assert.equal(fresh.spanRange, spans[3] - spans[0]); close(fresh.spanRangeFractionOfMedian, (spans[3] - spans[0]) / exactMedian);
  assert.deepEqual(fresh.cells.map(cell => cell.cell), [0, 1, 2, 3]);
  for (const cell of fresh.cells) {
    assert.deepEqual(cell.cap.roi, spec.capROIs[cell.cell]); assert.deepEqual(cell.supportingSole.roi, spec.supportingSoleROIs[cell.cell]);
    assert.equal(cell.cap.minY, spec.capTop[cell.cell]); assert.equal(cell.capTopY, spec.capTop[cell.cell]);
    assert.equal(cell.supportingSole.maxYExclusive, spec.roots[cell.cell][1]); assert.equal(cell.supportingSoleGroundY, spec.roots[cell.cell][1]);
    assert.equal(cell.bodySpan, spec.bodySpans[cell.cell]); assert.ok(cell.solidAlphaPadding.every(value => value >= 16));
  }
  assert.deepEqual(receipt.clips, atlas.meta.clips); assert.equal(atlas.meta.clips.length, 1);
  assert.deepEqual(receipt.cells.map(cell => cell.index).sort(), [0, 1, 2, 3]);
  assert.deepEqual(validateGettysburgInfantryClip(clip), []); assert.equal(clip.referenceHeight, median); assert.equal(clip.sourceHash, spec.sha256);
  assert.deepEqual(clip.frames, [0, 1, 2, 3].map(phase => `a-march-3-${phase}`));
  for (let phase = 0; phase < 4; phase++) {
    const cell = receipt.cells.find(cell => cell.index === phase), entry = atlas.frames[clip.frames[phase]], frame = texture.get(clip.frames[phase]);
    assert.ok(cell.alpha['64'].padding.every(value => value >= 16)); assert.deepEqual(cell.rootPixels, spec.roots[phase]);
    assert.deepEqual(entry.frame, { x: phase % 2 * spec.cell, y: Math.floor(phase / 2) * spec.cell, w: spec.cell, h: spec.cell });
    assert.equal(entry.rotated, false); assert.equal(entry.trimmed, false); assert.equal(entry.bodyHeight, median);
    close(clip.pivots[phase].x, spec.roots[phase][0] / spec.cell, .000001); close(clip.pivots[phase].y, spec.roots[phase][1] / spec.cell, .000001);
    assert.equal(frame.pivotX, clip.pivots[phase].x); assert.equal(frame.pivotY, clip.pivots[phase].y); assert.equal(frame.customData.bodyHeight, median);
  }
  const selectedTextures = gettysburgClipTestTextures(new Map(assets.map(asset => [asset.key, atlases.get(asset.key)])));
  for (const asset of assets) selectedTextures.get(asset.key).source[0].image = readFileSync(root(`public/${asset.image}`));
  const budget = fieldTextureBudget({ list: Object.fromEntries(selectedTextures.loaded) });
  assert.equal(budget.candidateAtlases, 36); assert.equal(budget.candidateClips, 72); assert.equal(budget.sources, 36);
  const pixels = assets.reduce((sum, asset) => { const { w, h } = atlases.get(asset.key).meta.size; return sum + w * h; }, 0);
  const priorPixels = priorAssets.reduce((sum, asset) => { const { w, h } = atlases.get(asset.key).meta.size; return sum + w * h; }, 0);
  assert.equal(budget.pixels, pixels); assert.equal(budget.nominalRgbaBytes, pixels * 4);
  assert.ok(pixels - priorPixels < atlas.meta.size.w * atlas.meta.size.h, 'the replacement adds less than one sheet of selected texture pixels');
});

test('fresh original preserves all 36 v15 atlas pairs, 72 clips, thirteen real old policies, pose samples, studies and protected simulation modules', () => {
  requireNative(); assert.equal(baseline.schemaVersion, 1); assert.equal(baseline.capturedFrom, '/Users/titansforge/Vault/Titans_of_War');
  assert.equal(baseline.artPass, 'gettysburg-v15'); assert.equal(baseline.assets, 36); assert.equal(baseline.clips, 72); assert.equal(baseline.addresses.length, 72);
  const hashes = selected => selected.map(asset => ({ key: asset.key, image: hash(readFileSync(root(`public/${asset.image}`))), json: hash(readFileSync(root(`public/${asset.json}`))) }));
  assert.deepEqual(hashes(priorAssets), baseline.hashes); assert.deepEqual(hashes(baseline.allPriorAssets), baseline.allPriorHashes);
  const previous = prepare(textures, priorSearch); assert.equal(previous.length, 72); assert.equal(jsonHash(previous), baseline.clipHash);
  assert.equal(new Set(clips.map(address)).size, 72);
  assert.deepEqual(clips.filter(clip => clip.key !== nativeSWKey), previous.filter(clip => clip.key !== oldSWKey));
  assert.deepEqual(clips.map(address), previous.map(address));
  for (const [index, clip] of previous.entries()) {
    const expected = baseline.addresses[index], rows = preservationRows(clip, priorSearch, previous);
    assert.deepEqual([clip.side, clip.identity, clip.direction, clip.action], expected.address); assert.equal(clip.key, expected.key); assert.deepEqual(clip.frames, expected.frames);
    assert.equal(rows.length, expected.rows); assert.equal(jsonHash(rows), expected.poseHash, `${expected.address} retained pose samples`);
    if (clip.key !== oldSWKey) assert.deepEqual(preservationRows(clip, search, clips), rows, `${expected.address} v16 retains exact pose output`);
  }
  assert.equal(baseline.oldPasses.length, 13); assert.equal(baseline.oldPasses[0].clips, 1, 'v3 is sampled from its genuine historical atlas');
  for (const pass of baseline.oldPasses) {
    const query = `?artPass=${pass.pass}`, prepared = prepare(textures, query), rows = prepared.flatMap(clip => preservationRows(clip, query, prepared));
    assert.deepEqual(gettysburgInfantryClipPolicy('gettysburg', query), pass.policy); assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', query), pass.assets);
    assert.equal(prepared.length, pass.clips); assert.equal(jsonHash(prepared), pass.clipHash); assert.equal(rows.length, pass.poseRows); assert.equal(jsonHash(rows), pass.poseHash);
  }
  const studies = GETTYSBURG_MOTION_STUDIES.filter(study => !study.id.endsWith('-v16')), presets = getGettysburgMotionPlaybackPresets(studies);
  assert.equal(studies.length, baseline.studyRows); assert.equal(jsonHash(studies), baseline.studyHash);
  assert.equal(presets.length, baseline.presetRows); assert.equal(jsonHash(presets), baseline.presetHash);
  assert.equal(getGettysburgMotionPlaybackInitialPreset(presets).id, baseline.initialPreset); assert.deepEqual(createGettysburgMotionPlaybackState(studies), baseline.playbackState);
  // V17 intentionally changes only the native reload selector and the Scene's
  // pause snapshot publication/integration. Their behavior is covered by the
  // mandatory replacement suites; every other protected module stays exact.
  const presentationChanges = new Set(['src/battle/CivilWarBattlefield.jsx', 'src/battle/gettysburgInfantryClips.js']);
  const preservedModules = baseline.protectedModules.filter(record => !presentationChanges.has(record.path));
  assert.deepEqual(preservedModules.map(record => record.path), [
    'src/battle/formationVisualState.js', 'src/battle/formationVisualCheckpoint.js',
    'src/battle/gettysburgInfantryShotMotion.js', 'src/battle/civilWarEngine.js',
    'src/battle/gettysburgMechanics.js', 'src/game/campaignStorage.js',
  ], 'only the two intentional v17 presentation modules may leave the historical byte-hash boundary');
  assert.equal(baseline.protectedModules.length, preservedModules.length + presentationChanges.size);
  const scripts = JSON.parse(readFileSync(root('package.json'), 'utf8')).scripts;
  for (const replacement of ['scripts/test-gettysburg-v17-policy.mjs', 'scripts/test-scene-pause-snapshot.mjs']) {
    assert.ok(readFileSync(root(replacement), 'utf8').includes('test('), `${replacement} is required for the v17 presentation exception`);
    assert.ok(scripts['test:gettysburg-art-current'].split(/\s+/).includes(replacement), `${replacement} must run with this preservation suite`);
  }
  for (const record of preservedModules) assert.equal(hash(readFileSync(root(record.path))), record.sha256, record.path);
});

test('one source reviewer row and one phase-matched v15/v16 SW comparison preserve every historical row, preset and default', () => {
  requireNative();
  const annotations = JSON.parse(readFileSync(root('docs/art-pass/manifests/gettysburg-v16-source-annotations.json'))), spec = annotations.sources[0];
  const current = GETTYSBURG_MOTION_STUDIES.filter(study => study.id.endsWith('-v16')); assert.equal(current.length, 1);
  const study = current[0], atlas = atlases.get(nativeSWKey);
  assert.equal(study.id, 'confederate-sw-march-v16'); assert.equal(study.sourceReviewed, true); assert.equal(study.approved, false); assert.ok(Object.isFrozen(study));
  assert.equal(study.source, `/${spec.source}`); assert.equal(study.sourceSha256, spec.sha256); assert.equal(study.receipt, `/${atlas.meta.measurementReview}`);
  assert.equal(study.referenceHeight, spec.referenceHeight); assert.deepEqual([study.width, study.height], [spec.cell * 2, spec.cell * 2]); assert.deepEqual(study.cellOrder, [0, 1, 2, 3]);
  for (let phase = 0; phase < 4; phase++) {
    assert.deepEqual(study.phaseRoots[phase], { x: spec.roots[phase][0] / spec.cell, y: spec.roots[phase][1] / spec.cell });
    assert.deepEqual(getGettysburgMotionStudyCell(study, phase), { x: phase % 2 * spec.cell, y: Math.floor(phase / 2) * spec.cell, w: spec.cell, h: spec.cell });
  }
  const previous = GETTYSBURG_MOTION_STUDIES.filter(value => !value.id.endsWith('-v16')), oldPresets = getGettysburgMotionPlaybackPresets(previous);
  const presets = getGettysburgMotionPlaybackPresets(GETTYSBURG_MOTION_STUDIES), id = 'v15-v16-confederate-sw-march', comparison = presets.find(preset => preset.id === id);
  assert.equal(presets.length, oldPresets.length + 1); assert.deepEqual(presets.filter(preset => preset.id !== id), oldPresets);
  assert.equal(comparison.reviewComplete, true); assert.equal(comparison.sequence.length, 4);
  for (const [phase, item] of comparison.sequence.entries()) {
    assert.deepEqual(item.left, { studyId: 'confederate-sw-march-v15', phase, action: 'march' });
    assert.deepEqual(item.right, { studyId: 'confederate-sw-march-v16', phase, action: 'march' });
  }
  assert.equal(getGettysburgMotionPlaybackInitialPreset(presets).id, baseline.initialPreset); assert.deepEqual(createGettysburgMotionPlaybackState(GETTYSBURG_MOTION_STUDIES), baseline.playbackState);
  for (const damaged of [null, { ...study, status: 'rejected' }, { ...study, sourceReviewed: false }, { ...study, cellOrder: [0, 1, 1, 3] },
    { ...study, phaseRoots: [] }, { ...study, phaseRoots: study.phaseRoots.map(point => ({ ...point, y: NaN })) }, { ...study, referenceHeight: 0 },
    { ...study, receipt: '' }, { ...study, sourceSha256: 'invalid' }]) {
    const incomplete = damaged ? [...previous, damaged] : previous;
    assert.deepEqual(getGettysburgMotionPlaybackPresets(incomplete), oldPresets); assert.deepEqual(createGettysburgMotionPlaybackState(incomplete), baseline.playbackState);
  }
  assert.deepEqual(getGettysburgMotionPlaybackPresets([...previous, study, study]), oldPresets);
});

test('SW uses exact native phases while every other action, side, identity and bearing keeps its v15 output', () => {
  requireNative(); const id = idFor('b'), prior = prepare(textures, priorSearch), contact = gettysburgInfantryContactPhase(formationId, id);
  for (const action of ['walk', 'route']) for (let frame = -1; frame <= 8; frame++) {
    const figure = { id, direction: 3, action, frame, scale: .82 }, selected = pose(figure);
    assert.equal(selected.key, nativeSWKey); assert.equal(selected.identity, 'a'); assert.equal(selected.phase, ((frame + contact) % 4 + 4) % 4);
    assert.equal(selected.flip, false); assert.equal(selected.angle, 0); assert.equal(selected.offsetX, 0); assert.equal(selected.offsetY, 0);
    assert.equal(pose(figure, priorSearch, prior).key, oldSWKey);
    assert.equal(pose(figure, search, clips, 'confederate', { paused: true, frozenAction: action, frozenPhase: 2 }).phase, 2);
  }
  for (const direction of [0, 1, 2, 3, 4, 5, 6, 7]) for (const side of ['union', 'confederate']) for (const identity of ['a', 'b'])
  for (const action of ['idle', 'walk', 'route', 'fire', 'reload']) for (const frame of [0, 1, 2, 3, 7]) {
    if (direction === 3 && side === 'confederate' && ['walk', 'route'].includes(action)) continue;
    const figure = { id: idFor(identity), direction, action, frame, scale: .82 };
    assert.deepEqual(pose(figure, search, clips, side, { shootingAge: .08 }), pose(figure, priorSearch, prior, side, { shootingAge: .08 }));
  }
  for (const direction of [-1, 8, .5, NaN, undefined, '3']) assert.equal(pose({ id, direction, action: 'walk', frame: 0 }), null);
  for (const action of ['melee', 'casualty', '__proto__']) assert.equal(pose({ id, direction: 3, action, frame: 0 }), null);
  assert.equal(pose({ id, direction: 3, action: 'walk', frame: 0, fallen: true }), null);
  assert.equal(pose({ id, direction: 3, action: 'walk', frame: 0 }, search, clips, 'confederate', { identity: 'b', versionedIdentity: false }), null);
});

test('missing native phase or malformed loaded metadata withholds the entire SW action and the actual renderer falls back', () => {
  requireNative(); const clip = nativeClips[0];
  for (const frameName of clip.frames) {
    const damaged = gettysburgClipTestTextures(atlases); damaged.get(clip.key).frames.delete(frameName);
    const prepared = initialize(damaged); assert.equal(prepared.length, 71); assert.equal(prepared.some(value => value.key === clip.key), false);
    const fixture = renderFixture(3, prepared);
    for (const action of ['walk', 'route']) for (let frame = 0; frame < 8; frame++) { Object.assign(fixture.figure, { action, frame }); fixture.sync(); assertAccepted(fixture); }
  }
  const mutations = [
    atlas => { delete atlas.meta.clips; },
    atlas => { atlas.meta.clips[0].approval.reviewed = false; },
    atlas => { atlas.meta.clips[0].approval.rejected = true; },
    atlas => { atlas.meta.clips[0].key = oldSWKey; },
    atlas => { atlas.meta.clips[0].frames.pop(); },
    atlas => { atlas.meta.clips[0].frames[1] = atlas.meta.clips[0].frames[0]; },
    atlas => { atlas.meta.clips[0].referenceHeight = 0; },
    atlas => { atlas.meta.clips[0].pivots[0].y = 2; },
    atlas => { atlas.meta.clips[0].sourceHash = 'invalid'; },
    atlas => { atlas.meta.clips.push(structuredClone(atlas.meta.clips[0])); },
  ];
  for (const mutate of mutations) {
    const damaged = structuredClone(atlases.get(nativeSWKey)); mutate(damaged);
    const loaded = gettysburgClipTestTextures(new Map([...atlases].map(([key, atlas]) => [key, key === nativeSWKey ? damaged : atlas])));
    const prepared = initialize(loaded); assert.equal(prepared.length, 71); const fixture = renderFixture(3, prepared);
    fixture.sync(); assertAccepted(fixture);
  }
  const missingMetadata = gettysburgClipTestTextures(atlases); delete missingMetadata.get(nativeSWKey).customData.meta;
  assert.equal(initialize(missingMetadata).length, 71);
  const fixture = renderFixture(3);
  for (let frame = 0; frame < 8; frame++) {
    fixture.figure.frame = frame; fixture.sync(); const selected = pose(fixture.figure);
    assert.equal(fixture.soldier.sprite.textureKey, nativeSWKey); assert.equal(fixture.soldier.sprite.frameName, selected.frame);
    assert.deepEqual(fixture.soldier.sprite.origin, selected.pivot); close(fixture.soldier.sprite.scaleX, 58 * fixture.figure.scale / selected.referenceHeight * selected.width);
    close(fixture.soldier.sprite.x, fixture.figure.x); close(fixture.soldier.sprite.y, fixture.figure.y);
  }
  for (const query of ['', '?artPass=gettysburg-v19']) { fixture.scene.artPassSearch = query; fixture.sync(); assertAccepted(fixture); }
  fixture.scene.artPassSearch = search;
  for (const scenario of ['gettysburg_meade', 'first_manassas', 'shiloh']) { fixture.scene.scenarioId = scenario; fixture.sync(); assertAccepted(fixture); }
});

for (const direction of [1, 3]) test(`real direction ${direction} firing, recoil, latched smoke and reload remain exactly v15; cold JSON pause preserves rules 18`, () => {
  requireNative(); const active = volleyFixture(direction), { scene, unit, id } = active, before = scene.engine.checkpoint();
  const view = draw(scene, id), shots = json(view.shots), fire = clips.find(clip => clip.side === 'confederate' && clip.direction === direction && clip.action === 'fire');
  assert.ok(shots.figures.length > 0); assert.ok(shots.figures.every(shot => shot.native)); assert.ok(fire);
  const frame = textures.get(fire.key).get(fire.frames[0]);
  for (const shot of shots.figures) {
    const figure = view.visual.output.figures.find(figure => figure.id === shot.id), scale = 58 * figure.scale / fire.referenceHeight * (.95 + deterministicUnitValue(id, shot.id, 215) * .1);
    close(shot.x, figure.x + (fire.muzzles[0].x - fire.pivots[0].x) * frame.realWidth * scale);
    close(shot.y, figure.y + (fire.muzzles[0].y - fire.pivots[0].y) * frame.realHeight * scale); close(shot.bearing, direction * Math.PI / 4);
  }
  let recoiling = 0;
  for (const figure of view.visual.output.figures.filter(figure => figure.visible && !figure.fallen && figure.action === 'fire')) {
    const selected = gettysburgInfantryClipPose(id, figure, scene.engine.time, { scenarioId: 'gettysburg', search, side: 'confederate', clips, identity: 'a', versionedIdentity: true,
      shootingAge: gettysburgInfantryShootingAge(current(scene, id), figure.id, scene.engine.time) }), sprite = view.soldiers[figure.id].sprite;
    assert.equal(sprite.textureKey, fire.key); assert.equal(sprite.frame, frame); close(sprite.x, figure.x + selected.offsetX); close(sprite.y, figure.y + selected.offsetY);
    if (Math.hypot(selected.offsetX, selected.offsetY) > 0) { recoiling++; assert.ok(selected.offsetX * Math.cos(direction * Math.PI / 4) + selected.offsetY * Math.sin(direction * Math.PI / 4) < 0); }
  }
  assert.ok(recoiling > 0); assertSmoke(scene, shots); assert.deepEqual(scene.engine.checkpoint(), before);
  windowState.location.search = priorSearch; const prior = attachRenderer(new Scene('gettysburg', campaign, 'option_a', null, null, null, null, json(before)));
  prior.createFormation(current(prior, id)); draw(prior, id);
  assert.deepEqual(spriteFacts(prior.views.get(id)), spriteFacts(view)); assert.deepEqual(prior.views.get(id).shots, view.shots); assert.deepEqual(prior.smoke.draws, scene.smoke.draws);
  const initialSprites = json(spriteFacts(view)), initialSmoke = json(scene.smoke.draws); scene.speed = 0;
  for (let index = 0; index < 3; index++) draw(scene, id);
  assert.deepEqual(spriteFacts(view), initialSprites); assert.deepEqual(scene.smoke.draws, initialSmoke);
  const saved = json(scene.checkpoint()); assert.equal(saved.version, 1); assert.equal(saved.state.battleRulesVersion, 18);
  const campaignSave = createCampaignSnapshot(campaign, null); assert.equal(CAMPAIGN_SAVE_VERSION, 22); assert.equal(campaignSave.version, 22); assert.equal(campaignSave.state.battleRulesVersion, 18);
  assert.equal(saved.presentation.shots.artPass, 'gettysburg-v16'); assert.deepEqual(combatCheckpointEnvelope(saved), before);
  const cold = coldScene(saved, id); assert.deepEqual(cold.views.get(id).shots, shots); assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation);
  draw(cold, id); assert.deepEqual(spriteFacts(cold.views.get(id)), initialSprites); assert.deepEqual(cold.smoke.draws, initialSmoke); assert.deepEqual(cold.engine.checkpoint(), before);
  scene.engine.time = 7.8; prior.engine.time = 7.8; draw(scene, id); draw(prior, id);
  assert.ok(view.visual.output.figures.some(figure => figure.action === 'reload')); assert.deepEqual(spriteFacts(view), spriteFacts(prior.views.get(id)));
  assert.deepEqual(view.shots, shots); assertSmoke(scene, shots); assert.equal(scene.smoke.draws.some(mark => mark.shape === 'circle'), false);
  Object.assign(unit, { x: unit.x + 41, y: unit.y + 17, facing: -Math.PI / 2, formationMode: 'column', strength: unit.initialStrength * .72 }); draw(scene, id);
  assert.deepEqual(view.shots, shots); assertSmoke(scene, shots);
  const moved = json(scene.checkpoint()), movedSprites = json(spriteFacts(view)), movedSmoke = json(scene.smoke.draws), movedCold = coldScene(moved, id);
  assert.deepEqual(movedCold.views.get(id).shots, shots); assert.deepEqual(json(movedCold.checkpoint()).presentation, moved.presentation);
  draw(movedCold, id); assert.deepEqual(spriteFacts(movedCold.views.get(id)), movedSprites); assert.deepEqual(movedCold.smoke.draws, movedSmoke);
  assert.deepEqual(movedCold.engine.checkpoint(), scene.engine.checkpoint());
  scene.engine.time = 8.25; draw(scene, id); assert.equal(view.shots, null); assert.deepEqual(scene.smoke.draws, []);
});

test('optional shots are strictly bound to each selected v12-v17 pass, and malformed records leave combat intact', () => {
  requireNative(); const passes = ['gettysburg-v12', 'gettysburg-v13', 'gettysburg-v14', 'gettysburg-v15', 'gettysburg-v16', 'gettysburg-v17', 'gettysburg-v18'];
  for (const pass of passes) {
    windowState.location.search = `?artPass=${pass}`; const scene = attachRenderer(new Scene('gettysburg', campaign, 'option_a')); scene.engine.time = 7.08;
    const unit = scene.engine.state.find(unit => unit.side === 'confederate' && unit.type === 'infantry' && unit.active);
    Object.assign(unit, { facing: (['gettysburg-v15', 'gettysburg-v16', 'gettysburg-v17'].includes(pass) ? 3 : pass === 'gettysburg-v14' ? 2 : 0) * Math.PI / 4,
      formationMode: 'line', lastVolleyAt: 7, status: 'firing', reload: 10 });
    scene.createFormation(current(scene, unit.id)); draw(scene, unit.id);
    const formation = current(scene, unit.id), combat = scene.engine.checkpoint(), saved = json(scene.checkpoint());
    assert.equal(saved.presentation.shots.artPass, pass);
    for (const selected of passes) {
      const cold = coldScene(saved, unit.id, selected); assert.deepEqual(cold.engine.checkpoint(), combat);
      assert.deepEqual(cold.views.get(unit.id).shots, selected === pass ? scene.views.get(unit.id).shots : null);
      if (selected === pass) assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation);
      else {
        const resaved = json(cold.checkpoint()); assert.equal(resaved.presentation.shots.artPass, selected);
        assert.deepEqual(combatCheckpointEnvelope(resaved), combat); draw(cold, unit.id); assert.deepEqual(cold.engine.checkpoint(), combat);
      }
    }
    for (const damaged of ['gettysburg-v11', 'gettysburg-v19', null, '__proto__']) {
      const rejected = json(saved.presentation); rejected.shots.artPass = damaged;
      assert.equal(restoreGettysburgInfantryShots(formation, 32, 7.08, rejected, pass), null);
      assert.equal(createGettysburgInfantryShotCheckpoint([formation], scene.views, 7.08, damaged), null);
    }
    assert.equal(createGettysburgInfantryShotCheckpoint([formation], scene.views, 7.08).artPass, 'gettysburg-v12');
    assert.equal(restoreGettysburgInfantryShots(formation, 32, 8.25, { ...saved.presentation, time: 8.25, shots: { ...saved.presentation.shots, time: 8.25 } }, pass), null);
    const malformed = json(saved.presentation); malformed.shots.formations[0].volley.figures[0].scale = 99;
    assert.equal(restoreGettysburgInfantryShots(formation, 32, 7.08, malformed, pass), null);
    const damagedCold = coldScene({ ...saved, presentation: malformed }, unit.id, pass); assert.deepEqual(damagedCold.engine.checkpoint(), combat); assert.equal(damagedCold.views.get(unit.id).shots, null);
  }
});

for (const direction of [1, 3]) for (const stepsPerDraw of [1, 4]) test(`real direction ${direction} march with ${stepsPerDraw} ticks per presentation matches v15 rules and survives a cold paused continuation`, () => {
  requireNative();
  function movingScene(pass) {
    windowState.location.search = `?artPass=${pass}`; const scene = attachRenderer(new Scene('gettysburg', campaign, 'option_a'));
    for (const unit of scene.engine.state) unit.active = false;
    const unit = scene.engine.state.find(unit => unit.side === 'confederate' && unit.type === 'infantry');
    Object.assign(unit, { active: true, x: 850, y: 500, facing: direction * Math.PI / 4, order: 'hold', target: { x: 850, y: 500 }, ammunition: 40, reload: 0, morale: 80, cohesion: 80 });
    scene.createFormation(current(scene, unit.id)); draw(scene, unit.id); scene.speed = stepsPerDraw;
    scene.engine.move(unit.id, { x: 850 + (direction === 1 ? 140 : -140), y: 640 }); return { scene, unit, id: unit.id };
  }
  const active = movingScene('gettysburg-v16'), previous = movingScene('gettysburg-v15'); let samples = 0; const observed = new Set();
  for (let index = 0; index < 30; index++) {
    for (let step = 0; step < stepsPerDraw; step++) { active.scene.engine.tick(.05); previous.scene.engine.tick(.05); }
    const before = active.scene.engine.checkpoint(), view = draw(active.scene, active.id); draw(previous.scene, previous.id);
    assert.deepEqual(active.scene.engine.checkpoint(), before); assert.deepEqual(previous.scene.engine.checkpoint(), before);
    assert.deepEqual(view.visual.output, previous.scene.views.get(previous.id).visual.output);
    for (const figure of view.visual.output.figures.filter(figure => figure.visible && !figure.fallen && figure.direction === direction && figure.action === 'walk')) {
      samples++; const sprite = view.soldiers[figure.id].sprite, priorSprite = previous.scene.views.get(previous.id).soldiers[figure.id].sprite;
      assert.equal(sprite.textureKey, direction === 3 ? nativeSWKey : 'confederate-gettysburg-v15-a-march-se');
      assert.equal(priorSprite.textureKey, direction === 3 ? oldSWKey : sprite.textureKey);
      assert.equal(sprite.frameName, priorSprite.frameName); close(sprite.x, figure.x); close(sprite.y, figure.y); assert.equal(sprite.angle, 0); assert.equal(sprite.flipX, false);
      if (direction === 1) assert.deepEqual(spriteFacts(view), spriteFacts(previous.scene.views.get(previous.id)));
      observed.add(sprite.frameName);
    }
  }
  assert.ok(samples > 0); assert.equal(observed.size, 4); assert.equal(active.scene.views.get(active.id).visual.output.moving, true);
  const frozen = json(spriteFacts(active.scene.views.get(active.id))), combat = active.scene.engine.checkpoint(); active.scene.speed = 0;
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
