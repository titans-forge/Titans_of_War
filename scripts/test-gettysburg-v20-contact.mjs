import { assertGettysburgV29HistoricalFile } from './test-support/gettysburgV29Preservation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
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
import { GETTYSBURG_INFANTRY_CONTACT_CLIPS_IDS } from '../src/battle/gettysburgInfantryContactClips.js';
import { closeCombatDistance, resolveContactCombat } from '../src/battle/closeCombat.js';

const search = '?artPass=gettysburg-v20';
const priorSearch = '?artPass=gettysburg-v18';
const root = path => new URL(`../${path}`, import.meta.url);
const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.parse(JSON.stringify(value));
const jsonHash = value => hash(JSON.stringify(value));
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);
const assets = gettysburgInfantryClipAssets('gettysburg', search);
const priorAssets = gettysburgInfantryClipAssets('gettysburg', priorSearch);
// Native v20 files are mandatory in integration tests below. Missing sources
// fail those tests; pure negative/preservation checks still run without them.
const baseline = JSON.parse(readFileSync(root('scripts/fixtures/gettysburg-v20-preservation.json')));
const availableAssets = [...new Map([...baseline.allPriorAssets, ...assets].map(asset => [asset.key, asset])).values()];
const atlases = new Map(availableAssets.filter(asset => existsSync(root(`public/${asset.json}`))).map(asset => [asset.key, JSON.parse(readFileSync(root(`public/${asset.json}`)))]));
const textures = gettysburgClipTestTextures(atlases);
const prepare = (loaded = textures, query = search) => prepareGettysburgInfantryClips(
  gettysburgInfantryClipDefinitions('gettysburg', query, loaded),
  (key, frame) => loaded.exists(key) && loaded.get(key).has(frame));
const clips = prepare();
const formationId = 'v20-confederate-policy';
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
function coldScene(saved, id, pass = 'gettysburg-v20') {
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

const contract = action => action === 'melee'
  ? { key: 'confederate-gettysburg-v20-a-contact-e', marker: 'nativeContactSequence', sequence: 'gettysburg-v20-confederate-a-e-contact' }
  : { key: 'confederate-gettysburg-v20-a-casualty-e', marker: 'nativeCasualtySequence', sequence: 'gettysburg-v20-confederate-a-e-casualty' };
// This synthetic definition is used only by metadata rejection tests. It is
// never installed or accepted instead of either mandatory reviewed native sheet.
const definition = action => ({ side: 'confederate', identity: 'a', direction: 0, action,
  key: contract(action).key, [contract(action).marker]: contract(action).sequence,
  frames: Array.from({ length: 4 }, (_, i) => `a-${action}-0-${i}`), sourceHash: 'a'.repeat(64),
  referenceHeight: 349, pivots: Array.from({ length: 4 }, () => ({ x: .5, y: .9 })),
  approval: { reviewed: true, rejected: false } });
const address = clip => JSON.stringify([clip.side, clip.identity, clip.direction, clip.action]);
function requireComplete() {
  assert.equal(assets.length, 38); assert.equal(clips.length, 74); assert.equal(initialize(textures).length, 74);
  assert.equal(new Set(clips.map(address)).size, 74);
  for (const action of ['melee', 'fall']) {
    const clip = clips.find(value => value.key === contract(action).key); assert.ok(clip, `Mandatory reviewed ${action} source is absent`);
    assert.equal(clip.action, action); assert.equal(clip.frames.length, 4);
    const asset = assets.find(value => value.key === clip.key), atlas = atlases.get(clip.key);
    assert.equal(hash(readFileSync(root(`public/${asset.image}`))), clip.sourceHash);
    assert.equal(atlas.meta.sha256, clip.sourceHash);
    assert.equal(atlas.meta.clips.length, 1);
    assert.equal(atlas.meta.size.w, atlas.meta.size.h);
    for (const [index, frameName] of clip.frames.entries()) {
      const frame = atlas.frames[frameName], cell = atlas.meta.size.w / 2;
      assert.equal(Number.isInteger(cell), true);
      assert.deepEqual(frame.frame, { x: index % 2 * cell, y: Math.floor(index / 2) * cell, w: cell, h: cell });
      assert.equal(frame.rotated, false); assert.equal(frame.trimmed, false);
    }
  }
  assert.equal(clips.find(clip => clip.action === 'melee').referenceHeight, clips.find(clip => clip.action === 'fall').referenceHeight);
}
const preservationFlags = [{}, { paused: true, frozenAction: 'native', frozenPhase: 'last' }, { reducedMotion: true }, { resolving: true, frozenAction: 'native', frozenPhase: 'last' }];
function preservationRows(clip, query, prepared) {
  const rows = [];
  for (const action of clip.action === 'march' ? ['walk', 'route'] : clip.action === 'ready' ? ['idle', 'ready'] : [clip.action])
  for (const frame of [0, 1, 2, 3, 4, 7, -1, 8]) for (const template of preservationFlags) for (const age of [0, .08, .19, .4]) for (const reloadProgress of [undefined, 0, .2, .49, .5, .8, 1]) {
    const options = Object.keys(template).length ? { ...template, ...(template.frozenAction ? { frozenAction: clip.action, frozenPhase: clip.frames.length - 1 } : {}) } : {};
    const figure = { id: 17, direction: clip.direction, action, frame, scale: 1.37, bodyOffsetX: 5, bodyOffsetY: -4, lean: 2 };
    rows.push({ action, frame, flags: options, age, reloadProgress, pose: gettysburgInfantryClipPose('v20-v18-preservation', figure, 999, { scenarioId: 'gettysburg', search: query, side: clip.side, identity: clip.identity, clips: prepared, shootingAge: age, reloadProgress, ...options }) });
  }
  return rows;
}
function unsupportedRows(query, prepared) {
  const rows = [];
  for (const side of ['union', 'confederate']) for (const identity of ['a', 'b'])
  for (let direction = 0; direction < 8; direction++) for (const action of ['melee', 'fall'])
  for (const frame of [0, 1, 2, 3, 4, 7, -1, 8]) for (const options of [{}, { paused: true }, { resolving: true }, { reducedMotion: true }]) {
    const figure = { id: 17, direction, action, frame, fallen: action === 'fall', scale: 1.37 };
    rows.push({ side, identity, direction, action, frame, options, pose: gettysburgInfantryClipPose('v20-unsupported-preservation', figure, 999, { scenarioId: 'gettysburg', search: query, side, identity, clips: prepared, ...options }) });
  }
  return rows;
}

test('v20 routes through a separate explicit extension while legacy inventory, shot identity and default loading stay exact', () => {
  assert.deepEqual(GETTYSBURG_INFANTRY_CLIPS_IDS, baseline.legacyIds);
  assert.deepEqual(GETTYSBURG_INFANTRY_CONTACT_CLIPS_IDS, ['gettysburg-v20']);
  const selected = gettysburgInfantryClipPolicy('gettysburg', search), prior = gettysburgInfantryClipPolicy('gettysburg', priorSearch);
  assert.ok(Object.isFrozen(selected) && Object.isFrozen(selected.atlases) && Object.isFrozen(selected.directions));
  assert.deepEqual({ ...selected, atlases: selected.atlases.slice(0, 36), nativeContactCasualty: undefined }, { ...prior, nativeContactCasualty: undefined });
  assert.deepEqual(assets.slice(0, 36), priorAssets); assert.equal(assets.length, 38);
  assert.equal(selected.shotPresentationId, 'gettysburg-v18'); assert.equal(selected.nativeContactCasualty, true);
  const unavailable = { exists() { assert.fail('disabled query inspected textures'); }, get() { assert.fail('disabled query read metadata'); } };
  for (const query of ['', '?artPass=gettysburg-v19', '?artPass=gettysburg-v20-other', '?other=gettysburg-v20', '?artPass=__proto__', '?artPass=constructor']) {
    assert.equal(gettysburgInfantryClipsEnabled('gettysburg', query), false);
    assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', query), []);
    assert.deepEqual(gettysburgInfantryClipDefinitions('gettysburg', query, unavailable), []);
  }
  for (const scenario of ['gettysburg_jackson', 'gettysburg_meade', 'first_manassas', 'shiloh', null]) {
    assert.equal(gettysburgInfantryClipsEnabled(scenario, search), false);
    assert.deepEqual(gettysburgInfantryClipDefinitions(scenario, search, unavailable), []);
  }
});

test('16 authentic historical policies, 890624 prior poses, 32768 absent actions and 40 native source pairs remain exact', () => {
  assert.equal(baseline.oldPasses.length, 16); assert.equal(baseline.allPriorAssets.length, 40);
  assert.equal(baseline.oldPasses.reduce((sum, pass) => sum + pass.poseRows, 0), 890624);
  assert.equal(baseline.oldPasses.reduce((sum, pass) => sum + pass.unsupportedRows, 0), 32768);
  assert.deepEqual(baseline.allPriorAssets.map(asset => ({ key: asset.key, image: hash(readFileSync(root(`public/${asset.image}`))), json: hash(readFileSync(root(`public/${asset.json}`))) })), baseline.allPriorHashes);
  for (const pass of baseline.oldPasses) {
    const query = `?artPass=${pass.pass}`, prepared = prepare(textures, query), rows = prepared.flatMap(clip => preservationRows(clip, query, prepared)), absent = unsupportedRows(query, prepared);
    assert.deepEqual(gettysburgInfantryClipPolicy('gettysburg', query), pass.policy);
    assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', query), pass.assets);
    assert.equal(prepared.length, pass.clips); assert.equal(jsonHash(prepared), pass.clipHash);
    assert.equal(rows.length, pass.poseRows); assert.equal(jsonHash(rows), pass.poseHash, pass.pass);
    assert.equal(absent.length, pass.unsupportedRows); assert.equal(jsonHash(absent), pass.unsupportedHash, pass.pass);
  }
  assert.equal(jsonHash(prepare(textures, priorSearch)), baseline.clipHash);
});

test('all protected scene/combat/save/visual modules, four older hash fixtures, motion studies and playback remain byte exact', () => {
  for (const record of [...baseline.protectedModules, ...baseline.protectedFixtures]) assertGettysburgV29HistoricalFile(record, root);
  assert.equal(baseline.protectedModules.length, 12); assert.equal(baseline.protectedFixtures.length, 4);
  const presets = getGettysburgMotionPlaybackPresets(GETTYSBURG_MOTION_STUDIES);
  assert.equal(GETTYSBURG_MOTION_STUDIES.length, 202); assert.equal(jsonHash(GETTYSBURG_MOTION_STUDIES), baseline.studyHash);
  assert.equal(presets.length, 125); assert.equal(jsonHash(presets), baseline.presetHash);
  assert.equal(getGettysburgMotionPlaybackInitialPreset(presets).id, baseline.initialPreset);
  assert.deepEqual(createGettysburgMotionPlaybackState(GETTYSBURG_MOTION_STUDIES), baseline.playbackState);
  assert.equal(CAMPAIGN_SAVE_VERSION, 22);
});

for (const action of ['melee', 'fall']) test(`${action} metadata rejects wrong addresses, markers, phase order, approval, pivots and extra firing data`, () => {
  const native = definition(action); assert.deepEqual(validateGettysburgInfantryClip(native), []);
  for (const mutate of [
    clip => { clip.key = 'other'; }, clip => { clip.side = 'union'; }, clip => { clip.identity = 'b'; }, clip => { clip.direction = 7; },
    clip => { clip.action = 'ready'; }, clip => { clip.action = [action]; }, clip => { clip.action = null; },
    clip => { delete clip[contract(action).marker]; }, clip => { clip[contract(action).marker] = 'other'; },
    clip => { clip.nativeReloadSequence = 'gettysburg-v18-confederate-a-e'; },
    clip => { clip[action === 'melee' ? 'nativeCasualtySequence' : 'nativeContactSequence'] = 'borrowed'; },
    clip => { clip.frames.reverse(); }, clip => { clip.frames[2] = clip.frames[1]; }, clip => { delete clip.frames[2]; },
    clip => { clip.frames.pop(); clip.pivots.pop(); }, clip => { clip.frames.push('extra'); clip.pivots.push({ x: .5, y: .9 }); },
    clip => { clip.sourceHash = '0'; }, clip => { clip.referenceHeight = NaN; }, clip => { clip.pivots[0].x = Infinity; },
    clip => { clip.pivots[0].y = -1; }, clip => { delete clip.pivots[1]; }, clip => { clip.approval.reviewed = 1; },
    clip => { clip.approval.rejected = true; }, clip => { clip.muzzles = Array.from({ length: 4 }, () => ({ x: .5, y: .5 })); },
  ]) {
    const damaged = json(native); mutate(damaged);
    assert.ok(validateGettysburgInfantryClip(damaged).length > 0);
    assert.deepEqual(prepareGettysburgInfantryClips([damaged], () => true), []);
  }
  const ready = json(prepare(textures, priorSearch).find(clip => clip.action === 'ready'));
  ready[contract(action).marker] = contract(action).sequence;
  assert.ok(validateGettysburgInfantryClip(ready).length > 0, 'a marker cannot authorize an old address');
});

test('both separately reviewed native source sheets are mandatory and retain full-cell original geometry', requireComplete);

test('native phase selection keeps casualty ground rest terminal and contact cyclic using only supplied simulation frames', () => {
  const prepared = prepareGettysburgInfantryClips([definition('melee'), definition('fall')], () => true);
  for (const [action, frames, phases] of [
    ['melee', [-1, 0, 1, 2, 3, 4, 5, 99], [3, 0, 1, 2, 3, 0, 1, 3]],
    ['fall', [-1, 0, 1, 2, 3, 4, 5, 99], [0, 0, 1, 2, 3, 3, 3, 3]],
  ]) for (const [index, frame] of frames.entries()) {
    const figure = { id: 0, action, fallen: action === 'fall', direction: 0, frame };
    const selected = pose(figure, search, prepared); assert.equal(selected.phase, phases[index]);
    assert.equal(selected.angle, 0); assert.equal(selected.offsetX, 0); assert.equal(selected.offsetY, 0);
    assert.equal(pose(figure, search, prepared, 'confederate', { reducedMotion: true }).phase, action === 'fall' ? 3 : 0);
    assert.deepEqual(pose(figure, search, prepared, 'confederate', { resolving: true, frozenAction: action, frozenPhase: 0 }), selected);
  }
});

test('v20 keeps every v18 ready, gait, fire and ordered loading pose exact', () => {
  requireComplete(); const priorClips = prepare(textures, priorSearch);
  assert.deepEqual(clips.filter(clip => !['melee', 'fall'].includes(clip.action)), priorClips);
  for (const clip of priorClips) for (const frame of [0, 1, 3, 7]) for (const reloadProgress of [0, .2, .5, .8, 1]) {
    const figure = { id: 0, action: clip.action === 'march' ? 'walk' : clip.action, direction: clip.direction, frame };
    const options = { side: clip.side, identity: clip.identity, scenarioId: 'gettysburg', shootingAge: .08, reloadProgress };
    assert.deepEqual(gettysburgInfantryClipPose('retained-v18', figure, 77, { ...options, search, clips }),
      gettysburgInfantryClipPose('retained-v18', figure, 77, { ...options, search: priorSearch, clips: priorClips }));
  }
});

for (const action of ['melee', 'fall']) test(`${action} uses supplied combat phases and exact identity/bearing without a render clock, borrowing or sprite rotation`, () => {
  requireComplete(); const figure = { id: 0, action, fallen: action === 'fall', direction: 0, frame: 0, scale: .82, bodyOffsetX: 8, bodyOffsetY: -5, lean: 40 };
  const selected = new Set();
  for (let frame = 0; frame < 4; frame++) {
    const currentFigure = { ...figure, frame }, expected = pose(currentFigure);
    selected.add(expected.frame); assert.equal(expected.phase, frame); assert.equal(expected.key, contract(action).key);
    assert.equal(expected.angle, 0); assert.equal(expected.offsetX, 0); assert.equal(expected.offsetY, 0); assert.equal(expected.flip, false);
    for (const time of [-10, 1e6]) for (const flags of [{}, { paused: true }, { resolving: true }, { paused: true, frozenAction: action, frozenPhase: (frame + 1) % 4 }]) {
      assert.deepEqual(gettysburgInfantryClipPose(formationId, currentFigure, time, { scenarioId: 'gettysburg', search, side: 'confederate', identity: 'a', versionedIdentity: true, clips, ...flags }), expected);
    }
  }
  assert.equal(selected.size, 4);
  assert.equal(pose({ ...figure, frame: 99 }).phase, 3); assert.equal(pose({ ...figure, frame: -1 }).phase, action === 'fall' ? 0 : 3);
  assert.equal(pose(figure, search, clips, 'confederate', { reducedMotion: true }).phase, action === 'fall' ? 3 : 0);
  for (const direction of [1, 2, 3, 4, 5, 6, 7]) assert.equal(pose({ ...figure, direction }), null);
  assert.equal(pose(figure, search, clips, 'union'), null);
  assert.equal(pose(figure, search, clips, 'confederate', { identity: 'b', versionedIdentity: false }), null);
  assert.equal(pose({ ...figure, fallen: action !== 'fall' }), null);
  for (const pass of baseline.legacyIds) assert.equal(pose(figure, `?artPass=${pass}`, clips), null);
});

for (const action of ['melee', 'fall']) test(`any absent ${action} frame or ambiguous definition withholds its complete native action`, () => {
  requireComplete(); const native = clips.find(clip => clip.action === action), figure = { id: 0, action, fallen: action === 'fall', direction: 0, frame: 0 };
  for (const name of native.frames) {
    const damaged = gettysburgClipTestTextures(atlases); damaged.get(native.key).frames.delete(name);
    const prepared = initialize(damaged); assert.equal(prepared.length, 73);
    for (let frame = 0; frame < 4; frame++) assert.equal(pose({ ...figure, frame }, search, prepared), null);
    assert.ok(pose({ id: 0, action: action === 'melee' ? 'fall' : 'melee', fallen: action === 'melee', direction: 0, frame: 0 }, search, prepared));
  }
  assert.equal(prepareGettysburgInfantryClips([native, native], () => true).length, 0);
  assert.equal(pose(figure, search, [...clips, native]), null);
});

function contactFixture(formationDirection = 2, contactDirection = 0) {
  const { scene, unit, id } = volleyFixture(formationDirection), foe = scene.engine.state.find(value => value.side === 'union' && value.active);
  Object.assign(unit, { x: 400, y: 600, reload: 0, status: 'steady', inMelee: true, meleeWith: foe.id, lastVolleyAt: null });
  Object.assign(foe, { x: unit.x + Math.cos(contactDirection * Math.PI / 4) * 45, y: unit.y + Math.sin(contactDirection * Math.PI / 4) * 45 });
  // Recreate the sampled visual before the fixture's first draw, without
  // changing any renderer or simulation implementation.
  scene.views.delete(id); scene.createFormation(current(scene, id));
  return { scene, unit, id, foe };
}
function drawContact(scene, id, resolving = false) {
  const snapshot = scene.engine.snapshot({ presentation: true }), formation = snapshot.formations.find(value => value.id === id);
  const foe = formation.inMelee && snapshot.formations.find(value => value.id === formation.meleeWith);
  const presented = foe ? { ...formation, contactFacing: Math.atan2(foe.y - formation.y, foe.x - formation.x) } : formation;
  scene.smoke.clear(); scene.shadows.clear(); scene.dust.clear();
  scene.syncFormation(presented, scene.engine.time + (scene.engine.resolutionTime || 0), resolving, []);
  return scene.views.get(id);
}
function fallenFixture() {
  const { scene, unit, id } = volleyFixture(0); scene.speed = 1;
  Object.assign(unit, { reload: 0, status: 'steady', inMelee: false, lastVolleyAt: null }); draw(scene, id);
  unit.strength *= .7; draw(scene, id);
  assert.ok(scene.views.get(id).visual.output.figures.some(figure => figure.fallen));
  return { scene, unit, id, fallenAt: scene.engine.time };
}

test('actual Scene contact points at its opponent independently of formation bearing and JSON-cold-resumes every supplied phase', () => {
  requireComplete(); const { scene, id } = contactFixture(); scene.speed = 1; const seen = new Set();
  for (const time of [7.08, 7.28, 7.48, 7.68]) {
    scene.engine.time = time; const combat = json(scene.engine.checkpoint()), view = drawContact(scene, id);
    const contact = view.visual.output.figures.filter(figure => figure.action === 'melee'); assert.ok(contact.length > 0);
    for (const figure of contact) { assert.equal(figure.direction, 0); const soldier = view.soldiers[figure.id]; assert.equal(soldier.sprite.textureKey, contract('melee').key); assert.equal(soldier.clipPhase, figure.frame); seen.add(soldier.sprite.frameName); }
    assert.equal(view.visual.output.facing, Math.PI / 2);
    scene.speed = 0; const saved = json(scene.checkpoint()), frozen = json(spriteFacts(view)), cold = coldScene(saved, id);
    assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation); drawContact(cold, id);
    assert.deepEqual(json(spriteFacts(cold.views.get(id))), frozen); assert.deepEqual(json(cold.engine.checkpoint()), combat);
    drawContact(scene, id); assert.deepEqual(json(spriteFacts(view)), frozen); scene.speed = 1;
  }
  assert.equal(seen.size, 4);
  const unsupported = contactFixture(0, 7), view = drawContact(unsupported.scene, unsupported.id);
  for (const figure of view.visual.output.figures.filter(figure => figure.action === 'melee')) assert.ok(/^confederate-detailed-/.test(view.soldiers[figure.id].sprite.textureKey));
});

test('actual simultaneous close-combat losses supply native contact and casualty figures without renderer feedback into combat', () => {
  requireComplete(); const { scene, unit, foe, id } = contactFixture(0, 0);
  scene.engine.state = scene.engine.state.filter(value => [unit.id, foe.id].includes(value.id));
  for (const value of scene.engine.state) Object.assign(value, { strength: 3000, initialStrength: 3000, morale: 90, cohesion: 90, fatigue: 0, status: 'steady', order: 'hold', formationMode: 'line', frontage: 150, ammunition: 0, active: true, arrivalTime: null });
  unit.facing = 0; foe.facing = Math.PI; foe.x = unit.x + closeCombatDistance(unit, foe) - 1; foe.y = unit.y;
  scene.views.delete(id); scene.createFormation(current(scene, id)); drawContact(scene, id);
  for (let step = 0; step < 130; step++) { scene.engine.time += .05; resolveContactCombat(scene.engine, .05); drawContact(scene, id); }
  assert.ok(unit.strength < 3000 && foe.strength < 3000); assert.equal(unit.ammunition, 0);
  const combat = json(scene.engine.checkpoint()), view = drawContact(scene, id);
  assert.ok(view.visual.output.figures.some(figure => figure.action === 'melee'));
  assert.ok(view.visual.output.figures.some(figure => figure.fallen));
  for (const figure of view.visual.output.figures.filter(figure => ['melee', 'fall'].includes(figure.action))) assert.equal(view.soldiers[figure.id].sprite.textureKey, contract(figure.action).key);
  assert.deepEqual(json(scene.engine.checkpoint()), combat);
});

test('actual Scene falls preserve saved world anchors, four ordered native poses, fade and first cold draw at every phase', () => {
  requireComplete(); const { scene, unit, id, fallenAt } = fallenFixture(), anchors = json(scene.views.get(id).visual.figures.filter(figure => figure.fallen).map(figure => ({ id: figure.id, ...figure.fallen })));
  for (const [age, phase] of [[0, 0], [.18, 1], [.36, 2], [.55, 3], [2.5, 3]]) {
    scene.engine.time = fallenAt + age; const combat = json(scene.engine.checkpoint()), view = draw(scene, id);
    for (const anchor of anchors) {
      const figure = view.visual.output.figures[anchor.id], soldier = view.soldiers[anchor.id], native = clips.find(clip => clip.action === 'fall');
      assert.equal(figure.fallen, true); assert.equal(figure.direction, 0); assert.equal(soldier.clipPhase, phase);
      assert.equal(soldier.sprite.textureKey, contract('fall').key); assert.equal(soldier.sprite.frameName, native.frames[phase]);
      assert.equal(soldier.sprite.x, anchor.x); assert.equal(soldier.sprite.y, anchor.y); assert.equal(soldier.sprite.angle, 0);
      assert.deepEqual(soldier.sprite.origin, native.pivots[phase]);
      assert.equal(soldier.sprite.alpha, Math.min(1, (3.2 - age) / 1.1));
    }
    scene.speed = 0; const saved = json(scene.checkpoint()), frozen = json(spriteFacts(view)), cold = coldScene(saved, id);
    assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation); draw(cold, id);
    assert.deepEqual(json(spriteFacts(cold.views.get(id))), frozen); assert.deepEqual(json(cold.engine.checkpoint()), combat);
    assert.equal(cold.engine.battleRulesVersion, 18); scene.speed = 1;
  }
  // A later formation turn cannot rotate or relocate previously fallen bodies.
  unit.facing = Math.PI / 2; const retained = draw(scene, id);
  for (const anchor of anchors) assert.equal(retained.soldiers[anchor.id].sprite.textureKey, contract('fall').key);
  scene.engine.time = fallenAt + 3.21; const hidden = draw(scene, id);
  for (const anchor of anchors) assert.equal(hidden.soldiers[anchor.id].sprite.visible, false);
});

test('actual reduced-motion contact and casualty remain static and retain exact cold checkpoint presentation', () => {
  requireComplete();
  for (const make of [contactFixture, fallenFixture]) {
    const { scene, id } = make(); scene.reducedMotion = true;
    for (const elapsed of [0, .2, .5]) {
      scene.engine.time += elapsed; const view = drawContact(scene, id);
      for (const figure of view.visual.output.figures.filter(figure => ['melee', 'fall'].includes(figure.action))) assert.equal(view.soldiers[figure.id].clipPhase, figure.fallen ? 3 : 0);
      const saved = json(scene.checkpoint()), cold = coldScene(saved, id); cold.reducedMotion = true; drawContact(cold, id);
      assert.deepEqual(json(spriteFacts(cold.views.get(id))), json(spriteFacts(view)));
    }
  }
});

test('casualty resolution age advances to ground rest and JSON cold resume reconstructs the saved casualty presentation', () => {
  requireComplete(); const { scene, id } = fallenFixture(); scene.engine.beginResolution('defeat');
  for (const [age, phase] of [[.2, 1], [.4, 2], [.7, 3], [2.5, 3]]) {
    scene.engine.resolutionTime = age; const combat = json(scene.engine.checkpoint()), view = drawContact(scene, id, true);
    for (const figure of view.visual.output.figures.filter(figure => figure.visible)) {
      if (figure.fallen) assert.equal(view.soldiers[figure.id].clipPhase, phase);
      else {
        // Existing post-loss rank closure can still supply a walking pose.
        // Resolution suppresses fresh melee; it does not erase saved gait.
        assert.notEqual(figure.action, 'melee');
        assert.notEqual(view.soldiers[figure.id].sprite.textureKey, contract('melee').key);
      }
    }
    const saved = json(scene.checkpoint()), frozen = json(spriteFacts(view)), cold = coldScene(saved, id);
    assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation); drawContact(cold, id, true);
    assert.deepEqual(json(spriteFacts(cold.views.get(id))), frozen); assert.deepEqual(json(cold.engine.checkpoint()), combat);
  }
});

test('actual native melee transitions to neutral living poses during resolution and keeps them through cold resume', () => {
  requireComplete(); const { scene, id } = contactFixture(); scene.speed = 1;
  const active = drawContact(scene, id); assert.ok(active.visual.output.figures.some(figure => figure.action === 'melee'));
  assert.ok(active.soldiers.some(soldier => soldier.sprite.textureKey === contract('melee').key));
  scene.engine.beginResolution('defeat'); scene.engine.resolutionTime = .2;
  const combat = json(scene.engine.checkpoint()), view = drawContact(scene, id, true);
  const living = view.visual.output.figures.filter(figure => figure.visible && !figure.fallen); assert.ok(living.length > 0);
  for (const figure of living) { assert.equal(figure.action, 'idle'); assert.notEqual(view.soldiers[figure.id].sprite.textureKey, contract('melee').key); }
  const saved = json(scene.checkpoint()), frozen = json(spriteFacts(view)), cold = coldScene(saved, id);
  assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation); drawContact(cold, id, true);
  assert.deepEqual(json(spriteFacts(cold.views.get(id))), frozen); assert.deepEqual(json(cold.engine.checkpoint()), combat);
});

test('actual Scene retains an entire accepted contact/casualty action when any native frame is unavailable', () => {
  requireComplete();
  for (const action of ['melee', 'fall']) for (const frame of clips.find(clip => clip.action === action).frames) {
    const { scene, id } = action === 'melee' ? contactFixture() : fallenFixture(), damaged = gettysburgClipTestTextures(atlases);
    damaged.get(contract(action).key).frames.delete(frame); scene.infantryClips = initialize(damaged);
    for (const elapsed of [0, .2, .4, .6]) {
      scene.engine.time += elapsed; const combat = json(scene.engine.checkpoint()), view = drawContact(scene, id);
      const affected = view.visual.output.figures.filter(figure => figure.action === action); assert.ok(affected.length > 0);
      for (const figure of affected) { assert.equal(view.soldiers[figure.id].clipPhase, undefined); assert.ok(/^confederate-detailed-/.test(view.soldiers[figure.id].sprite.textureKey)); }
      assert.deepEqual(json(scene.engine.checkpoint()), combat);
    }
  }
});

test('existing v18 native volley origins and shot checkpoint identity survive the v20 extension and cold resume', () => {
  requireComplete(); const { scene, id } = volleyFixture(0); draw(scene, id); const saved = json(scene.checkpoint()), shots = json(scene.views.get(id).shots);
  assert.equal(saved.presentation.shots.artPass, 'gettysburg-v18'); assert.ok(shots.figures.some(shot => shot.native));
  const cold = coldScene(saved, id); assert.deepEqual(json(cold.views.get(id).shots), shots); draw(cold, id); assertSmoke(cold, shots);
  assert.deepEqual(json(cold.engine.checkpoint()), json(scene.engine.checkpoint()));
});
