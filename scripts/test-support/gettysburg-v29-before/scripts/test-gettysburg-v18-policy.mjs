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

const search = '?artPass=gettysburg-v18';
const priorSearch = '?artPass=gettysburg-v17';
const root = path => new URL(`../${path}`, import.meta.url);
const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.parse(JSON.stringify(value));
const jsonHash = value => hash(JSON.stringify(value));
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);
const assets = gettysburgInfantryClipAssets('gettysburg', search);
const priorAssets = gettysburgInfantryClipAssets('gettysburg', priorSearch);
// Native files are mandatory. A placeholder atlas or optional skip cannot
// substitute for this six-cell stationary source.
const baseline = JSON.parse(readFileSync(root('scripts/fixtures/gettysburg-v18-preservation.json')));
const availableAssets = [...new Map([...baseline.allPriorAssets, ...assets].map(asset => [asset.key, asset])).values()];
const atlases = new Map(availableAssets.map(asset => [asset.key, JSON.parse(readFileSync(root(`public/${asset.json}`)))]));
const textures = gettysburgClipTestTextures(atlases);
const prepare = (loaded = textures, query = search) => prepareGettysburgInfantryClips(
  gettysburgInfantryClipDefinitions('gettysburg', query, loaded),
  (key, frame) => loaded.exists(key) && loaded.get(key).has(frame));
const clips = prepare();
const formationId = 'v18-confederate-policy';
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
function coldScene(saved, id, pass = 'gettysburg-v18') {
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

const address = clip => JSON.stringify([clip.side, clip.identity, clip.direction, clip.action]);
const preservationFlags = [{}, { paused: true, frozenAction: 'native', frozenPhase: 'last' }, { reducedMotion: true }, { resolving: true, frozenAction: 'native', frozenPhase: 'last' }];
function preservationRows(clip, query, prepared) {
  const rows = [];
  for (const action of clip.action === 'march' ? ['walk', 'route'] : clip.action === 'ready' ? ['idle', 'ready'] : [clip.action])
  for (const frame of [0, 1, 2, 3, 4, 7, -1, 8]) for (const template of preservationFlags) for (const age of [0, .08, .19, .4]) for (const reloadProgress of [undefined, 0, .2, .49, .5, .8, 1]) {
    const flags = Object.keys(template).length ? { ...template, ...(template.frozenAction ? { frozenAction: clip.action, frozenPhase: clip.frames.length - 1 } : {}) } : {};
    const figure = { id: 17, direction: clip.direction, action, frame, scale: 1.37, bodyOffsetX: 5, bodyOffsetY: -4, lean: 2 };
    rows.push({ action, frame, flags, age, reloadProgress, pose: gettysburgInfantryClipPose('v18-v17-preservation', figure, 999, {
      scenarioId: 'gettysburg', search: query, side: clip.side, identity: clip.identity, clips: prepared, shootingAge: age, reloadProgress, ...flags }) });
  }
  return rows;
}
const requireComplete = () => {
  assert.equal(assets.length, 36); assert.equal(clips.length, 72); assert.equal(initialize(textures).length, 72);
  assert.equal(new Set(clips.map(address)).size, 72);
};

const nativeKey = 'confederate-gettysburg-v18-a-actions-e';
const nativeSequence = 'gettysburg-v18-confederate-a-e';
const nativeReload = () => clips.find(clip => clip.key === nativeKey && clip.action === 'reload');

test('v18 replaces exactly one stationary atlas and selects one four-stage native loading action', () => {
  requireComplete();
  const policy = gettysburgInfantryClipPolicy('gettysburg', search);
  assert.deepEqual(GETTYSBURG_INFANTRY_CLIPS_IDS, [...baseline.oldPasses.map(row => row.pass), 'gettysburg-v18']);
  assert.ok(Object.isFrozen(policy) && Object.isFrozen(policy.atlases) && Object.isFrozen(policy.directions));
  assert.equal(policy.monotonicReload, true); assert.equal(policy.nativeReloadSequence, true);
  assert.equal(policy.shotPresentationId, 'gettysburg-v18');
  const retained = assets.filter(asset => asset.key !== nativeKey);
  assert.deepEqual(retained, priorAssets.filter(asset => asset.key !== 'confederate-gettysburg-v13-a-actions-e'));
  assert.equal(assets.filter(asset => asset.key === nativeKey).length, 1);
  assert.equal(assets.some(asset => asset.key === 'confederate-gettysburg-v13-a-actions-e'), false);
  const actions = clips.filter(clip => clip.key === nativeKey);
  assert.deepEqual(actions.map(clip => [clip.action, clip.frames.length]), [['ready', 1], ['fire', 1], ['reload', 4]]);
  assert.equal(nativeReload().nativeReloadSequence, nativeSequence);
  assert.equal(clips.filter(clip => clip.action === 'reload' && clip.frames.length === 4).length, 1);
  for (const clip of clips.filter(clip => clip.action === 'reload' && clip.key !== nativeKey)) assert.equal(clip.frames.length, 2);
  const unavailable = { exists() { assert.fail('disabled query inspected texture'); }, get() { assert.fail('disabled query read metadata'); } };
  for (const query of ['', '?artPass=gettysburg-v19', '?artPass=gettysburg-v18-other', '?other=gettysburg-v18', '?artPass=__proto__', '?artPass=constructor']) {
    assert.equal(gettysburgInfantryClipsEnabled('gettysburg', query), false);
    assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', query), []);
    assert.deepEqual(gettysburgInfantryClipDefinitions('gettysburg', query, unavailable), []);
    assert.deepEqual(initialize(unavailable, query), []);
  }
  for (const scenario of ['gettysburg_meade', 'gettysburg_jackson', 'first_manassas', 'shiloh', null]) {
    assert.equal(gettysburgInfantryClipsEnabled(scenario, search), false);
    assert.deepEqual(initialize(unavailable, search, scenario), []);
  }
});

test('15 genuine original policies, 793856 prior poses and 39 historical source pairs remain exact', () => {
  requireComplete(); assert.equal(baseline.artPass, 'gettysburg-v17'); assert.equal(baseline.schemaVersion, 1);
  assert.equal(baseline.oldPasses.length, 15); assert.equal(baseline.allPriorAssets.length, 39);
  assert.equal(baseline.oldPasses.reduce((sum, pass) => sum + pass.poseRows, 0), 793856);
  const hashes = selected => selected.map(asset => ({ key: asset.key, image: hash(readFileSync(root(`public/${asset.image}`))), json: hash(readFileSync(root(`public/${asset.json}`))) }));
  assert.deepEqual(hashes(priorAssets), baseline.hashes);
  assert.deepEqual(hashes(baseline.allPriorAssets), baseline.allPriorHashes);
  const priorClips = prepare(textures, priorSearch);
  assert.equal(jsonHash(priorClips), baseline.clipHash);
  for (const [index, clip] of priorClips.entries()) {
    const expected = baseline.addresses[index], rows = preservationRows(clip, priorSearch, priorClips);
    assert.deepEqual([clip.side, clip.identity, clip.direction, clip.action], expected.address);
    assert.equal(clip.key, expected.key); assert.deepEqual(clip.frames, expected.frames);
    assert.equal(rows.length, expected.rows); assert.equal(jsonHash(rows), expected.poseHash);
  }
  for (const pass of baseline.oldPasses) {
    const query = `?artPass=${pass.pass}`, prepared = prepare(textures, query);
    const rows = prepared.flatMap(clip => preservationRows(clip, query, prepared));
    assert.deepEqual(gettysburgInfantryClipPolicy('gettysburg', query), pass.policy);
    assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', query), pass.assets);
    assert.equal(prepared.length, pass.clips); assert.equal(jsonHash(prepared), pass.clipHash);
    assert.equal(rows.length, pass.poseRows); assert.equal(jsonHash(rows), pass.poseHash, `${pass.pass} genuine original outputs`);
  }
});

test('all existing studies and playback choices stay exact and seven protected combat/save/presentation modules retain their original bytes', () => {
  const presets = getGettysburgMotionPlaybackPresets(GETTYSBURG_MOTION_STUDIES);
  assert.equal(GETTYSBURG_MOTION_STUDIES.length, 202); assert.equal(jsonHash(GETTYSBURG_MOTION_STUDIES), baseline.studyHash);
  assert.equal(presets.length, 125); assert.equal(jsonHash(presets), baseline.presetHash);
  assert.equal(getGettysburgMotionPlaybackInitialPreset(presets).id, baseline.initialPreset);
  assert.deepEqual(createGettysburgMotionPlaybackState(GETTYSBURG_MOTION_STUDIES), baseline.playbackState);
  const allowed = new Set(['src/battle/gettysburgInfantryClips.js']);
  const preserved = baseline.protectedModules.filter(row => !allowed.has(row.path)); assert.equal(preserved.length, 7);
  for (const record of preserved) assert.equal(hash(readFileSync(root(record.path))), record.sha256, record.path);
});

test('four-stage metadata is accepted only at its exact native address; malformed or arbitrary extra phases are withheld', () => {
  const accepted = json(nativeReload()); assert.equal(validateGettysburgInfantryClip(accepted).length, 0);
  for (const mutate of [
    clip => { delete clip.nativeReloadSequence; }, clip => { clip.nativeReloadSequence = 'four-phase'; },
    clip => { clip.key = 'confederate-gettysburg-v13-a-actions-e'; }, clip => { clip.side = 'union'; },
    clip => { clip.identity = 'b'; }, clip => { clip.direction = 1; }, clip => { clip.action = 'fire'; },
    clip => { clip.frames.pop(); clip.pivots.pop(); }, clip => { clip.frames.push('extra'); clip.pivots.push({ x: .5, y: .9 }); },
    clip => { clip.frames[2] = clip.frames[1]; }, clip => { delete clip.frames[2]; },
    clip => { [clip.frames[0], clip.frames[1]] = [clip.frames[1], clip.frames[0]]; },
    clip => { clip.pivots[2].x = NaN; }, clip => { clip.pivots.pop(); },
    clip => { clip.muzzles = [{ x: .5, y: .5 }]; }, clip => { clip.sourceHash = 'unknown'; },
    clip => { clip.approval.reviewed = false; }, clip => { clip.approval.rejected = true; },
  ]) {
    const damaged = json(accepted); mutate(damaged);
    assert.ok(validateGettysburgInfantryClip(damaged).length > 0);
    assert.deepEqual(prepareGettysburgInfantryClips([damaged], () => true), []);
  }
  const historical = json(prepare(textures, priorSearch).find(clip => clip.side === 'confederate' && clip.direction === 0 && clip.action === 'reload'));
  historical.frames = ['load', 'charge', 'ram', 'shoulder']; historical.pivots = Array.from({ length: 4 }, () => ({ x: .5, y: .9 }));
  assert.ok(validateGettysburgInfantryClip(historical).length > 0);
  assert.deepEqual(prepareGettysburgInfantryClips([historical], () => true), []);
  for (const action of ['ready', 'fire', 'reload']) {
    const figure = { id: 0, action, direction: 0, frame: 7 };
    const definition = clips.find(clip => clip.key === nativeKey && clip.action === action);
    for (const pass of baseline.oldPasses) assert.equal(pose(figure, `?artPass=${pass.pass}`, [definition], 'confederate', { reloadProgress: .9 }), null);
  }
  for (const action of ['ready', 'fire']) for (const mutate of [clip => { clip.side = 'union'; }, clip => { clip.identity = 'b'; },
    clip => { clip.direction = 1; }, clip => { clip.nativeReloadSequence = nativeSequence; }, clip => { clip.frames = ['a-reload-0-0']; }]) {
    const damaged = json(clips.find(clip => clip.key === nativeKey && clip.action === action)); mutate(damaged);
    assert.ok(validateGettysburgInfantryClip(damaged).length > 0);
    assert.deepEqual(prepareGettysburgInfantryClips([damaged], () => true), []);
  }
});

test('any missing native loading phase withholds the whole four-stage action and leaves ready/fire available without borrowed poses', () => {
  requireComplete();
  for (const name of nativeReload().frames) {
    const damaged = gettysburgClipTestTextures(atlases); damaged.get(nativeKey).frames.delete(name);
    const prepared = initialize(damaged); assert.equal(prepared.length, 71);
    assert.equal(pose({ id: 0, action: 'reload', direction: 0, frame: 9 }, search, prepared, 'confederate', { reloadProgress: .8 }), null);
    assert.equal(prepared.some(clip => clip.key === 'confederate-gettysburg-v13-a-actions-e'), false);
    for (const action of ['ready', 'fire']) assert.equal(pose({ id: 0, action, direction: 0, frame: 0 }, search, prepared).key, nativeKey);
  }
  const missing = gettysburgClipTestTextures(atlases); missing.loaded.delete(nativeKey);
  const prepared = initialize(missing); assert.equal(prepared.length, 69);
  for (const action of ['ready', 'fire', 'reload']) assert.equal(pose({ id: 0, action, direction: 0, frame: 0 }, search, prepared), null);
  assert.ok(pose({ id: 0, action: 'walk', direction: 0, frame: 0 }, search, prepared));
});

test('four native loading stages advance once using combat facts and ignore recycled legacy frames and render time', () => {
  requireComplete(); const clip = nativeReload(), figure = { id: 0, action: 'reload', direction: 0, frame: 0 };
  for (const duration of [3.4, 4.1, 3.4 * 1.6, 3.4 * 1.6 * 1.8]) {
    let previousPhase = 0, transitions = 0;
    for (let step = 0; step <= Math.ceil(duration * 100); step++) {
      const elapsed = Math.min(duration, step / 100);
      const progress = gettysburgInfantryReloadProgress({ type: 'infantry', lastVolleyAt: 7, reload: Math.max(0, duration - elapsed) }, 7 + elapsed);
      const selected = pose(figure, search, clips, 'confederate', { reloadProgress: progress });
      assert.ok(selected.phase >= previousPhase); assert.equal(selected.frame, clip.frames[selected.phase]);
      if (selected.phase !== previousPhase) transitions++; previousPhase = selected.phase;
      for (const frame of [-99, 0, 1, 4, 7, 999]) assert.deepEqual(pose({ ...figure, frame }, search, clips, 'confederate', { reloadProgress: progress }), selected);
    }
    assert.equal(transitions, 3); assert.equal(previousPhase, 3);
  }
  for (const [progress, expected] of [[0, 0], [.24999, 0], [.25, 1], [.49999, 1], [.5, 2], [.74999, 2], [.75, 3], [1, 3]]) {
    assert.equal(pose(figure, search, clips, 'confederate', { reloadProgress: progress }).phase, expected);
  }
});

test('v18 retains every other v17 native action and two-stage bearing exactly', () => {
  const priorClips = prepare(textures, priorSearch);
  for (const clip of clips.filter(clip => clip.key !== nativeKey)) for (const frame of [0, 1, 3, 7]) for (const reloadProgress of [0, .2, .5, .8, 1]) {
    const figure = { id: 0, action: clip.action === 'march' ? 'walk' : clip.action, direction: clip.direction, frame };
    const options = { side: clip.side, identity: clip.identity, scenarioId: 'gettysburg', shootingAge: .08, reloadProgress };
    const selected = gettysburgInfantryClipPose('retained-v17', figure, 77, { ...options, search, clips });
    const prior = gettysburgInfantryClipPose('retained-v17', figure, 77, { ...options, search: priorSearch, clips: priorClips });
    assert.deepEqual(selected, prior);
  }
});

test('actual Scene with one missing loading cell uses the accepted reload body for the whole action', () => {
  for (const name of nativeReload().frames) {
    const { scene, unit, id } = volleyFixture(0), damaged = gettysburgClipTestTextures(atlases);
    damaged.get(nativeKey).frames.delete(name); scene.infantryClips = initialize(damaged);
    scene.speed = 1;
    for (const [time, remaining] of [[7.65, 2.75], [8.4, 2], [9, 1.4], [9.8, .6]]) {
      scene.engine.time = time; unit.reload = remaining;
      const combat = json(scene.engine.checkpoint()), view = draw(scene, id);
      const front = view.visual.output.figures.filter(figure => figure.visible && !figure.fallen && figure.action === 'reload');
      assert.ok(front.length > 0);
      for (const figure of front) {
        const soldier = view.soldiers[figure.id]; assert.equal(soldier.clipPhase, undefined);
        assert.ok(/^confederate-detailed-/.test(soldier.sprite.textureKey));
        assert.notEqual(soldier.sprite.textureKey, nativeKey);
      }
      assert.deepEqual(json(scene.engine.checkpoint()), combat);
    }
  }
});

test('paused/resolving loading freezes a valid native phase; cold unsampled progress and reduced motion remain deterministic', () => {
  const figure = { id: 0, direction: 0, action: 'reload', frame: 999 };
  for (const flag of ['paused', 'resolving']) {
    assert.equal(pose(figure, search, clips, 'confederate', { [flag]: true, reloadProgress: .9 }).phase, 3);
    for (const frozenPhase of [0, 1, 2, 3]) assert.equal(pose(figure, search, clips, 'confederate', { [flag]: true, reloadProgress: .9, frozenPhase, frozenAction: 'reload' }).phase, frozenPhase);
    for (const frozenPhase of [-1, 4, NaN, '3']) assert.equal(pose(figure, search, clips, 'confederate', { [flag]: true, reloadProgress: .9, frozenPhase, frozenAction: 'reload' }).phase, 3);
    assert.equal(pose(figure, search, clips, 'confederate', { [flag]: true, reloadProgress: .9, frozenPhase: 0, frozenAction: 'fire' }).phase, 3);
  }
  for (const reloadProgress of [undefined, null, NaN, Infinity, -Infinity, '1']) assert.equal(pose(figure, search, clips, 'confederate', { reloadProgress }).phase, 0);
  assert.equal(pose(figure, search, clips, 'confederate', { reloadProgress: -1 }).phase, 0);
  assert.equal(pose(figure, search, clips, 'confederate', { reloadProgress: 2 }).phase, 3);
  for (const reloadProgress of [0, .2, .5, .8, 1]) assert.equal(pose(figure, search, clips, 'confederate', { reloadProgress, reducedMotion: true }).phase, 0);
});

for (const direction of [0, 1, 2, 3, 4, 5, 6, 7]) test(`actual Scene bearing ${direction} renders the appropriate complete loading sequence and cold-resumes without changing combat`, () => {
  requireComplete(); const { scene, unit, id } = volleyFixture(direction); scene.speed = 1;
  const timeline = direction === 0 ? [[7.65, 2.75, 0], [8.4, 2, 1], [9, 1.4, 2], [9.8, .6, 3]]
    : [[7.65, 2.75, 0], [8.7, 1.7, 0], [9, 1.4, 1], [9.9, .5, 1]];
  const reload = clips.find(clip => clip.side === 'confederate' && clip.direction === direction && clip.action === 'reload'); assert.ok(reload);
  for (const [time, remaining, phase] of timeline) {
    scene.engine.time = time; unit.reload = remaining;
    const combat = json(scene.engine.checkpoint()), view = draw(scene, id);
    const front = view.visual.output.figures.filter(figure => figure.visible && !figure.fallen && figure.action === 'reload'); assert.ok(front.length > 0);
    for (const figure of front) {
      const soldier = view.soldiers[figure.id]; assert.equal(soldier.clipPhase, phase);
      assert.equal(soldier.sprite.textureKey, reload.key); assert.equal(soldier.sprite.frameName, reload.frames[phase]);
    }
    assert.deepEqual(json(scene.engine.checkpoint()), combat); scene.speed = 0;
    const frozen = json(spriteFacts(view)); for (let sample = 0; sample < 3; sample++) draw(scene, id);
    assert.deepEqual(json(spriteFacts(view)), frozen);
    const saved = json(scene.checkpoint()), cold = coldScene(saved, id);
    assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation, 'JSON re-save before first cold draw retains presentation');
    assert.deepEqual(json(cold.engine.checkpoint()), combat); draw(cold, id);
    assert.deepEqual(json(spriteFacts(cold.views.get(id))), frozen); assert.deepEqual(json(cold.engine.checkpoint()), combat);
    scene.speed = 1;
  }
  assert.equal(CAMPAIGN_SAVE_VERSION, 22); assert.equal(scene.engine.battleRulesVersion, 18);
});

test('actual native reduced-motion Scene stays static through four loading stages and cold resume; resolution keeps its neutral pose', () => {
  const reduced = volleyFixture(0); reduced.scene.reducedMotion = true; reduced.scene.speed = 1;
  for (const [time, remaining] of [[7.65, 2.75], [8.4, 2], [9, 1.4], [9.8, .6]]) {
    reduced.scene.engine.time = time; reduced.unit.reload = remaining;
    const view = draw(reduced.scene, reduced.id);
    const front = view.visual.output.figures.filter(figure => figure.visible && !figure.fallen && figure.action === 'reload');
    assert.ok(front.length > 0); for (const figure of front) assert.equal(view.soldiers[figure.id].clipPhase, 0);
    reduced.scene.speed = 0;
    const saved = json(reduced.scene.checkpoint()), cold = coldScene(saved, reduced.id); cold.reducedMotion = true;
    draw(cold, reduced.id); assert.deepEqual(json(spriteFacts(cold.views.get(reduced.id))), json(spriteFacts(view)));
    reduced.scene.speed = 1;
  }
  const active = volleyFixture(0); active.scene.speed = 1; active.scene.engine.time = 9.8; active.unit.reload = .6; draw(active.scene, active.id);
  active.scene.engine.beginResolution('defeat'); active.scene.engine.resolutionTime = .3;
  const drawResolution = scene => {
    scene.smoke.clear(); scene.shadows.clear(); scene.dust.clear();
    scene.syncFormation(current(scene, active.id), scene.engine.time + scene.engine.resolutionTime, true, []);
    return scene.views.get(active.id);
  };
  const combat = json(active.scene.engine.checkpoint()), view = drawResolution(active.scene);
  assert.ok(view.visual.output.figures.every(figure => !figure.visible || figure.fallen || figure.action === 'idle'));
  const frozen = json(spriteFacts(view)); for (let sample = 0; sample < 3; sample++) drawResolution(active.scene);
  assert.deepEqual(json(spriteFacts(view)), frozen); assert.deepEqual(json(active.scene.engine.checkpoint()), combat);
  const saved = json(active.scene.checkpoint()), cold = coldScene(saved, active.id);
  assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation); drawResolution(cold);
  assert.deepEqual(json(spriteFacts(cold.views.get(active.id))), frozen); assert.deepEqual(json(cold.engine.checkpoint()), combat);
});

test('actual engine normal, suppressed/non-line and moving-fire volleys drive a single four-stage load without mutating rules', () => {
  for (const spec of [{ suppression: 0, mode: 'line', order: 'hold' }, { suppression: 75, mode: 'column', order: 'hold' }, { suppression: 0, mode: 'line', order: 'fallback' }]) {
    const engine = new CivilWarBattleEngine('gettysburg', campaign, 'option_a');
    const unit = engine.state.find(formation => formation.side === 'confederate' && formation.type === 'infantry' && formation.active);
    const enemy = engine.state.find(formation => formation.side === 'union' && formation.type === 'infantry' && formation.active);
    for (const formation of engine.state) formation.active = [unit.id, enemy.id].includes(formation.id);
    Object.assign(unit, { x: 400, y: 700, facing: 0, facingOrder: 0, formationMode: spec.mode, order: spec.order,
      target: { x: 200, y: 700 }, reload: 0, suppression: spec.suppression, cohesion: 95, morale: 95 });
    Object.assign(enemy, { x: 600, y: 700, order: 'hold', ammunition: 0, reload: 10, facing: Math.PI });
    const ammunition = unit.ammunition; engine.tick(.05);
    assert.equal(unit.ammunition, ammunition - 1); assert.equal(unit.lastVolleyAt, engine.time);
    const initialDuration = (spec.mode === 'line' ? 3.4 : 4.1) * (1 + unit.suppression / 125) * (spec.order === 'fallback' ? 1.8 : 1);
    close(unit.reload, initialDuration); if (spec.order === 'fallback') assert.ok(unit.x < 400);
    const volleyAt = unit.lastVolleyAt; unit.ammunition = 0;
    let previousPhase = 0, transitions = 0;
    for (let step = 0; step <= Math.ceil(initialDuration / .05) + 1 && unit.reload > 0; step++) {
      const combat = json(engine.checkpoint()), progress = gettysburgInfantryReloadProgress(unit, engine.time);
      const selected = pose({ id: 0, direction: 0, action: 'reload', frame: step * 7 }, search, clips, 'confederate', { reloadProgress: progress });
      assert.deepEqual(json(engine.checkpoint()), combat); assert.ok(selected.phase >= previousPhase);
      if (selected.phase !== previousPhase) transitions++; previousPhase = selected.phase;
      engine.tick(.05); assert.equal(unit.lastVolleyAt, volleyAt);
    }
    assert.equal(unit.reload, 0); assert.equal(transitions, 3); assert.equal(previousPhase, 3);
  }
});

test('v18 shot geometry remains latched and its optional presentation identity strictly rejects cross-pass or malformed records', () => {
  const { scene, unit, id } = volleyFixture(0), before = json(scene.engine.checkpoint());
  const view = draw(scene, id), shots = json(view.shots); assert.ok(shots.figures.length > 0); assertSmoke(scene, shots);
  const saved = json(scene.checkpoint()); assert.equal(saved.presentation.shots.artPass, 'gettysburg-v18');
  assert.deepEqual(json(combatCheckpointEnvelope(saved)), before);
  const cold = coldScene(saved, id); assert.deepEqual(json(cold.views.get(id).shots), shots);
  assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation); draw(cold, id); assertSmoke(cold, shots);
  const formation = current(scene, id), capacity = view.capacity;
  assert.deepEqual(json(restoreGettysburgInfantryShots(formation, capacity, scene.engine.time, saved.presentation, 'gettysburg-v18')), shots);
  for (const pass of ['gettysburg-v12', 'gettysburg-v13', 'gettysburg-v14', 'gettysburg-v15', 'gettysburg-v16', 'gettysburg-v17', 'gettysburg-v19']) {
    assert.equal(restoreGettysburgInfantryShots(formation, capacity, scene.engine.time, saved.presentation, pass), null);
  }
  for (const mutate of [state => { state.shots.artPass = 'gettysburg-v17'; }, state => { state.shots.formations[0].volley.figures[0].x = Infinity; },
    state => { state.shots.formations[0].volley.figures.push(state.shots.formations[0].volley.figures[0]); }, state => { state.shots.time += .1; }]) {
    const damaged = structuredClone(saved.presentation); mutate(damaged);
    assert.equal(restoreGettysburgInfantryShots(formation, capacity, scene.engine.time, damaged, 'gettysburg-v18'), null);
  }
  scene.speed = 1; scene.engine.time = 7.8; unit.reload = 2.6; draw(scene, id); assert.deepEqual(json(view.shots), shots);
  scene.engine.time = 8.25; unit.reload = 2.15; draw(scene, id); assert.equal(view.shots, null); assert.deepEqual(scene.smoke.draws, []);
});

test('native ready and fire retain measured anchors and accepted whole-sprite recoil while ignoring legacy limb offsets', () => {
  for (const action of ['ready', 'fire']) {
    const clip = clips.find(value => value.key === nativeKey && value.action === action);
    const neutral = { id: 0, action, direction: 0, frame: 0, scale: 1 };
    const noisy = { ...neutral, lean: 999, bodyOffsetX: 99, bodyOffsetY: -99 };
    const selected = pose(noisy, search, clips, 'confederate', { shootingAge: .08 });
    assert.equal(selected.key, nativeKey); assert.equal(selected.frame, clip.frames[0]); assert.deepEqual(selected.pivot, clip.pivots[0]);
    assert.deepEqual(selected.muzzle, clip.muzzles?.[0]);
    // The accepted peak recoils the entire east-facing sprite by 1.1 pixels;
    // this remains deliberate presentation, not a procedural limb deformation.
    assert.equal(selected.offsetX, action === 'fire' ? -1.1 : 0); close(selected.offsetY, 0);
    assert.equal(selected.angle, 0); assert.equal(selected.flip, false); assert.equal(selected.axialAim, false);
    assert.equal(selected.useLegacyRearAim, false);
    for (const shootingAge of [0, .04, .08, .24, .4, .5]) {
      const motion = pose(noisy, search, clips, 'confederate', { shootingAge });
      assert.deepEqual(motion, pose(neutral, search, clips, 'confederate', { shootingAge }));
      assert.ok(Math.abs(motion.offsetX) <= 1.1); close(motion.offsetY, 0); assert.equal(motion.angle, 0);
      if (shootingAge === 0 || shootingAge >= .4) assert.equal(motion.offsetX, 0);
      const reduced = pose(noisy, search, clips, 'confederate', { shootingAge, reducedMotion: true });
      assert.equal(reduced.offsetX, 0); assert.equal(reduced.offsetY, 0); assert.equal(reduced.angle, 0);
    }
  }
});

test('the replacement keeps 36 selected atlases and 72 complete clips, while its true source dimensions determine allocation', () => {
  const selectedTextures = gettysburgClipTestTextures(new Map(assets.map(asset => [asset.key, atlases.get(asset.key)])));
  for (const asset of assets) selectedTextures.get(asset.key).source[0].image = readFileSync(root(`public/${asset.image}`));
  const budget = fieldTextureBudget({ list: Object.fromEntries(selectedTextures.loaded) });
  assert.equal(budget.candidateAtlases, 36); assert.equal(budget.candidateClips, 72); assert.equal(budget.sources, 36);
  const pixels = assets.reduce((sum, asset) => { const { w, h } = atlases.get(asset.key).meta.size; return sum + w * h; }, 0);
  assert.equal(budget.pixels, pixels); assert.equal(budget.nominalRgbaBytes, pixels * 4);
});
