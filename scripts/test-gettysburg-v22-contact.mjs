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
import { GETTYSBURG_INFANTRY_CARDINAL_CONTACT_CLIPS_IDS } from '../src/battle/gettysburgInfantryCardinalContactClips.js';
import { GETTYSBURG_INFANTRY_UNION_CONTACT_CLIPS_IDS } from '../src/battle/gettysburgInfantryUnionContactClips.js';
import { GETTYSBURG_INFANTRY_CONTACT_CLIPS_IDS } from '../src/battle/gettysburgInfantryContactClips.js';
import { closeCombatDistance, resolveContactCombat } from '../src/battle/closeCombat.js';
import { canCommand } from '../src/battle/battleUsability.js';
import { landmarkField, landmarkDestinationError } from '../src/battle/historicalLandmarks.js';

const search = '?artPass=gettysburg-v22';
const priorSearch = '?artPass=gettysburg-v21';
const root = path => new URL(`../${path}`, import.meta.url);
const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.parse(JSON.stringify(value));
const jsonHash = value => hash(JSON.stringify(value));
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);
const assets = gettysburgInfantryClipAssets('gettysburg', search);
const priorAssets = gettysburgInfantryClipAssets('gettysburg', priorSearch);
// Native v22 files are mandatory in integration tests below. Missing sources
// fail those tests; pure negative/preservation checks still run without them.
const baseline = JSON.parse(readFileSync(root('scripts/fixtures/gettysburg-v22-preservation.json')));
const availableAssets = [...new Map([...baseline.allPriorAssets, ...assets].map(asset => [asset.key, asset])).values()];
const atlases = new Map(availableAssets.filter(asset => existsSync(root(`public/${asset.json}`))).map(asset => [asset.key, JSON.parse(readFileSync(root(`public/${asset.json}`)))]));
const textures = gettysburgClipTestTextures(atlases);
const prepare = (loaded = textures, query = search) => prepareGettysburgInfantryClips(
  gettysburgInfantryClipDefinitions('gettysburg', query, loaded),
  (key, frame) => loaded.exists(key) && loaded.get(key).has(frame));
const clips = prepare();
const formationId = 'v22-union-policy';
const idFor = identity => Array.from({ length: 256 }, (_, id) => id).find(id => gettysburgInfantryIdentity(formationId, id) === identity);
const pose = (figure, query = search, prepared = clips, side = 'union', extra = {}) =>
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
  Phaser: { Scene: class {}, Math: { Clamp: (value, low, high) => Math.max(low, Math.min(high, value)) }, BlendModes: { NORMAL: 0 }, Geom: { Rectangle: class { static Contains() {} }, Polygon: class { static Contains() {} } } },
  CivilWarBattleEngine, FieldPresentationCache, getBattleEngineConfig, performance, Map,
  window: windowState, combatCheckpointEnvelope, createFormationVisualCheckpoint, restoreFormationVisualFromCheckpoint,
  updateFormationVisual, sampleGettysburgInfantryVolley, createGettysburgInfantryShotCheckpoint,
  restoreGettysburgInfantryShots, gettysburgInfantryClipPolicy, DETAILED_UNIT_PAGES, gettysburgInfantryFamilyEnabled,
  formationFootprint, deterministicUnitValue, detailedInfantryPose, realisticInfantryPose, updateTravelDust,
  gettysburgInfantryFamilyPose, gettysburgInfantryFamilyTextureKey, gettysburgInfantryStandardAnchor,
  gettysburgInfantryClipPose, gettysburgInfantryShootingAge, gettysburgInfantryReloadProgress, formationStatusLabel, retreatOpacity,
  siegeTargetPlan: () => [], createSiegeTargetVisual: () => null,
  canCommand, landmarkField, landmarkDestinationError,
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
function coldScene(saved, id, pass = 'gettysburg-v22') {
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

const preservationFlags = [{}, { paused: true, frozenAction: 'native', frozenPhase: 'last' }, { reducedMotion: true }, { resolving: true, frozenAction: 'native', frozenPhase: 'last' }];
function poseRows(clip, query, prepared) {
  const rows = [];
  for (const action of clip.action === 'march' ? ['walk', 'route'] : clip.action === 'ready' ? ['idle', 'ready'] : [clip.action])
  for (const frame of [0, 1, 2, 3, 4, 7, -1, 8]) for (const template of preservationFlags) for (const age of [0, .08, .19, .4]) for (const reloadProgress of [undefined, 0, .2, .49, .5, .8, 1]) {
    const options = Object.keys(template).length ? { ...template, ...(template.frozenAction ? { frozenAction: clip.action, frozenPhase: clip.frames.length - 1 } : {}) } : {};
    const figure = { id: 17, direction: clip.direction, action, frame, fallen: clip.action === 'fall', scale: 1.37, bodyOffsetX: 5, bodyOffsetY: -4, lean: 2 };
    rows.push({ action, frame, flags: options, age, reloadProgress, pose: gettysburgInfantryClipPose('v22-v21-preservation', figure, 999, { scenarioId: 'gettysburg', search: query, side: clip.side, identity: clip.identity, clips: prepared, shootingAge: age, reloadProgress, ...options }) });
  }
  return rows;
}
function unsupportedRows(query, prepared) {
  const rows = [];
  for (const side of ['union', 'confederate']) for (const identity of ['a', 'b'])
  for (let direction = 0; direction < 8; direction++) for (const action of ['melee', 'fall'])
  for (const frame of [0, 1, 2, 3, 4, 7, -1, 8]) for (const options of [{}, { paused: true }, { resolving: true }, { reducedMotion: true }]) {
    const figure = { id: 17, direction, action, frame, fallen: action === 'fall', scale: 1.37 };
    rows.push({ side, identity, direction, action, frame, options, pose: gettysburgInfantryClipPose('v22-contact-preservation', figure, 999, { scenarioId: 'gettysburg', search: query, side, identity, clips: prepared, ...options }) });
  }
  return rows;
}

const nativeDirection = side => side === 'union' ? 2 : 6;
const contract = (action, side = 'union') => {
  const bearing = side === 'union' ? 's' : 'n', family = action === 'melee' ? 'contact' : 'casualty';
  return { key: `${side}-gettysburg-v22-a-${family}-${bearing}`, marker: action === 'melee' ? 'nativeContactSequence' : 'nativeCasualtySequence', sequence: `gettysburg-v22-${side}-a-${bearing}-${family}` };
};
const confederateContract = action => contract(action, 'confederate').key;
const ewContract = (action, side) => side === 'union' ? `union-gettysburg-v21-a-${action === 'melee' ? 'contact' : 'casualty'}-w`
  : `confederate-gettysburg-v20-a-${action === 'melee' ? 'contact' : 'casualty'}-e`;
const syntheticDefinition = (action, side = 'union') => ({ side, identity: 'a', direction: nativeDirection(side), action,
  key: contract(action, side).key, [contract(action, side).marker]: contract(action, side).sequence,
  frames: Array.from({ length: 4 }, (_, i) => `a-${action}-${nativeDirection(side)}-${i}`), sourceHash: 'a'.repeat(64),
  referenceHeight: 350, pivots: Array.from({ length: 4 }, () => ({ x: .5, y: .9 })), approval: { reviewed: true, rejected: false } });
const address = clip => JSON.stringify([clip.side, clip.identity, clip.direction, clip.action]);
function requireComplete() {
  assert.equal(assets.length, 44); assert.equal(clips.length, 80); assert.equal(initialize(textures).length, 80);
  assert.equal(new Set(clips.map(address)).size, 80);
  for (const side of ['union', 'confederate']) {
    for (const action of ['melee', 'fall']) {
      const expected = contract(action, side), clip = clips.find(value => value.key === expected.key);
      assert.ok(clip, `Mandatory independently reviewed ${side} ${action} source is absent`);
      assert.equal(clip.side, side); assert.equal(clip.identity, 'a'); assert.equal(clip.direction, nativeDirection(side)); assert.equal(clip.action, action);
      assert.equal(clip[expected.marker], expected.sequence);
      const asset = assets.find(value => value.key === clip.key), atlas = atlases.get(clip.key), png = readFileSync(root(`public/${asset.image}`));
      assert.equal(hash(png), clip.sourceHash); assert.equal(atlas.meta.sha256, clip.sourceHash);
      assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      assert.equal(png.readUInt32BE(16), atlas.meta.size.w); assert.equal(png.readUInt32BE(20), atlas.meta.size.h);
      assert.equal(atlas.meta.clips.length, 1); assert.equal(atlas.meta.size.w, atlas.meta.size.h);
      for (const [index, name] of clip.frames.entries()) {
        const frame = atlas.frames[name], cell = atlas.meta.size.w / 2; assert.ok(Number.isInteger(cell));
        assert.deepEqual(frame.frame, { x: index % 2 * cell, y: Math.floor(index / 2) * cell, w: cell, h: cell });
        assert.equal(frame.rotated, false); assert.equal(frame.trimmed, false); assert.deepEqual(frame.pivot, clip.pivots[index]);
        assert.deepEqual(frame.sourceSize, { w: cell, h: cell });
        assert.deepEqual(frame.spriteSourceSize, { x: 0, y: 0, w: cell, h: cell });
      }
    }
    assert.equal(clips.find(clip => clip.key === contract('melee', side).key).referenceHeight,
      clips.find(clip => clip.key === contract('fall', side).key).referenceHeight);
  }
}

test('v22 adds only the explicit cardinal extension and preserves every old registry, v21 policy and v18 shot identity', () => {
  assert.deepEqual(GETTYSBURG_INFANTRY_CLIPS_IDS, baseline.legacyIds);
  assert.deepEqual(GETTYSBURG_INFANTRY_CONTACT_CLIPS_IDS, baseline.contactIds); assert.deepEqual(baseline.contactIds, ['gettysburg-v20']);
  assert.deepEqual(GETTYSBURG_INFANTRY_UNION_CONTACT_CLIPS_IDS, baseline.unionContactIds); assert.deepEqual(baseline.unionContactIds, ['gettysburg-v21']);
  assert.deepEqual(GETTYSBURG_INFANTRY_CARDINAL_CONTACT_CLIPS_IDS, ['gettysburg-v22']);
  const selected = gettysburgInfantryClipPolicy('gettysburg', search), prior = gettysburgInfantryClipPolicy('gettysburg', priorSearch);
  assert.ok(Object.isFrozen(selected) && Object.isFrozen(selected.atlases) && Object.isFrozen(selected.directions));
  assert.deepEqual({ ...selected, atlases: selected.atlases.slice(0, 40), nativeCardinalContactCasualty: undefined }, { ...prior, nativeCardinalContactCasualty: undefined });
  assert.deepEqual(assets.slice(0, 40), priorAssets); assert.equal(assets.length, 44);
  assert.equal(selected.nativeContactCasualty, true); assert.equal(selected.nativeUnionContactCasualty, true); assert.equal(selected.nativeCardinalContactCasualty, true);
  assert.equal(selected.stableUnionIdentity, true); assert.equal(selected.shotPresentationId, 'gettysburg-v18');
  const unavailable = { exists() { assert.fail('disabled query inspected textures'); }, get() { assert.fail('disabled query read metadata'); } };
  for (const query of ['', '?artPass=gettysburg-v19', '?artPass=gettysburg-v22-other', '?other=gettysburg-v22', '?artPass=constructor', '?artPass=__proto__']) {
    assert.equal(gettysburgInfantryClipsEnabled('gettysburg', query), false);
    assert.deepEqual(gettysburgInfantryClipDefinitions('gettysburg', query, unavailable), []);
    assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', query), []);
  }
  for (const scenario of ['gettysburg_jackson', 'gettysburg_meade', 'first_manassas', 'shiloh', null]) {
    assert.equal(gettysburgInfantryClipsEnabled(scenario, search), false);
    assert.deepEqual(gettysburgInfantryClipDefinitions(scenario, search, unavailable), []);
  }
});

test('18 genuine pre-edit policies, 1089536 prior poses, 36864 contact/casualty outputs and 44 source pairs remain exact', () => {
  assert.equal(baseline.oldPasses.length, 18); assert.equal(baseline.allPriorAssets.length, 44);
  assert.equal(baseline.oldPasses.reduce((sum, pass) => sum + pass.poseRows, 0), 1089536);
  assert.equal(baseline.oldPasses.reduce((sum, pass) => sum + pass.actionRows, 0), 36864);
  assert.deepEqual(baseline.allPriorAssets.map(asset => ({ key: asset.key, image: hash(readFileSync(root(`public/${asset.image}`))), json: hash(readFileSync(root(`public/${asset.json}`))) })), baseline.allPriorHashes);
  for (const pass of baseline.oldPasses) {
    const query = `?artPass=${pass.pass}`, prepared = prepare(textures, query), rows = prepared.flatMap(clip => poseRows(clip, query, prepared)), actions = unsupportedRows(query, prepared);
    assert.deepEqual(gettysburgInfantryClipPolicy('gettysburg', query), pass.policy);
    assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', query), pass.assets);
    assert.equal(prepared.length, pass.clips); assert.equal(jsonHash(prepared), pass.clipHash);
    assert.equal(rows.length, pass.poseRows); assert.equal(jsonHash(rows), pass.poseHash, pass.pass);
    assert.equal(actions.length, pass.actionRows); assert.equal(jsonHash(actions), pass.actionHash, pass.pass);
  }
  assert.equal(jsonHash(prepare(textures, priorSearch)), baseline.clipHash);
});

test('all protected modules, six old fixtures and all 32 v20/v21 helper/source/review/gate files retain original hashes', () => {
  for (const record of [...baseline.protectedModules, ...baseline.protectedFixtures, ...baseline.protectedContactFiles]) assertGettysburgV29HistoricalFile(record, root);
  assert.equal(baseline.protectedModules.length, 12); assert.equal(baseline.protectedFixtures.length, 6); assert.equal(baseline.protectedContactFiles.length, 32);
  const presets = getGettysburgMotionPlaybackPresets(GETTYSBURG_MOTION_STUDIES);
  assert.equal(GETTYSBURG_MOTION_STUDIES.length, 202); assert.equal(jsonHash(GETTYSBURG_MOTION_STUDIES), baseline.studyHash);
  assert.equal(presets.length, 125); assert.equal(jsonHash(presets), baseline.presetHash);
  assert.equal(getGettysburgMotionPlaybackInitialPreset(presets).id, baseline.initialPreset);
  assert.deepEqual(createGettysburgMotionPlaybackState(GETTYSBURG_MOTION_STUDIES), baseline.playbackState); assert.equal(CAMPAIGN_SAVE_VERSION, 22);
});

for (const side of ['union', 'confederate']) for (const action of ['melee', 'fall']) test(`${side} cardinal ${action} metadata rejects borrowed approval, wrong addresses/markers, mixed phases and incomplete registrations`, () => {
  const native = syntheticDefinition(action, side), expected = contract(action, side), other = side === 'union' ? 'confederate' : 'union';
  assert.deepEqual(validateGettysburgInfantryClip(native), []);
  for (const mutate of [
    clip => { clip.key = ewContract(action, side); }, clip => { clip.key = contract(action, other).key; }, clip => { clip.side = other; },
    clip => { clip.side = [side]; }, clip => { clip.identity = 'b'; }, clip => { clip.direction = side === 'union' ? 6 : 2; },
    clip => { clip.action = 'ready'; }, clip => { clip.action = [action]; }, clip => { clip.action = null; },
    clip => { delete clip[expected.marker]; }, clip => { clip[expected.marker] = `gettysburg-v21-union-a-w-${action === 'melee' ? 'contact' : 'casualty'}`; },
    clip => { clip[expected.marker] = contract(action, other).sequence; }, clip => { clip.nativeReloadSequence = 'gettysburg-v18-confederate-a-e'; },
    clip => { clip[action === 'melee' ? 'nativeCasualtySequence' : 'nativeContactSequence'] = 'borrowed'; },
    clip => { clip.frames.reverse(); }, clip => { clip.frames[2] = clip.frames[1]; }, clip => { clip.frames[0] = `a-${action}-0-0`; },
    clip => { delete clip.frames[2]; }, clip => { clip.frames.pop(); clip.pivots.pop(); },
    clip => { clip.frames.push('extra'); clip.pivots.push({ x: .5, y: .9 }); },
    clip => { clip.sourceHash = '0'; }, clip => { clip.sourceHash = 'A'.repeat(64); }, clip => { clip.referenceHeight = NaN; },
    clip => { clip.pivots[0].x = Infinity; }, clip => { clip.pivots[0].y = -1; }, clip => { delete clip.pivots[1]; },
    clip => { clip.approval.reviewed = 1; }, clip => { clip.approval.rejected = true; },
    clip => { clip.muzzles = Array.from({ length: 4 }, () => ({ x: .5, y: .5 })); },
  ]) {
    const damaged = json(native); mutate(damaged); assert.ok(validateGettysburgInfantryClip(damaged).length > 0);
    assert.deepEqual(prepareGettysburgInfantryClips([damaged], () => true), []);
  }
  for (const oldSide of ['union', 'confederate']) {
    const borrowed = json(prepare(textures, priorSearch).find(clip => clip.key === ewContract(action, oldSide)));
    borrowed[expected.marker] = expected.sequence;
    assert.ok(validateGettysburgInfantryClip(borrowed).length > 0, 'a v22 marker cannot borrow either old E/W approval');
  }
  const renamed = json(native); renamed.key = `${side}-gettysburg-v22-a-march-${side === 'union' ? 's' : 'n'}`;
  renamed.action = 'march'; delete renamed[expected.marker];
  renamed.frames = Array.from({ length: 4 }, (_, phase) => `a-march-${nativeDirection(side)}-${phase}`);
  assert.ok(validateGettysburgInfantryClip(renamed).length > 0, 'a malformed v22 key cannot borrow generic historical approval');
});

test('cardinal phase selection preserves stable Union A/B and existing Confederate identity semantics behind the explicit capability', () => {
  const prepared = prepareGettysburgInfantryClips(['union', 'confederate'].flatMap(side => ['melee', 'fall'].map(action => syntheticDefinition(action, side))), () => true);
  for (const side of ['union', 'confederate']) for (const action of ['melee', 'fall']) for (const [frame, phase] of action === 'melee'
    ? [[-1, 3], [0, 0], [1, 1], [2, 2], [3, 3], [4, 0], [99, 3]] : [[-1, 0], [0, 0], [1, 1], [2, 2], [3, 3], [4, 3], [99, 3]]) {
    const figure = { id: idFor('a'), action, fallen: action === 'fall', direction: nativeDirection(side), frame }, selected = pose(figure, search, prepared, side);
    assert.equal(selected.phase, phase); assert.equal(selected.identity, 'a'); assert.equal(selected.angle, 0);
    assert.equal(selected.offsetX, 0); assert.equal(selected.offsetY, 0); assert.equal(selected.flip, false);
    assert.equal(pose(figure, search, prepared, side, { identity: 'b', versionedIdentity: false }), null);
    if (side === 'union') assert.equal(pose({ ...figure, id: idFor('b') }, search, prepared, side), null);
    else assert.equal(pose({ ...figure, id: idFor('b') }, search, prepared, side).identity, 'a');
    assert.equal(pose(figure, search, prepared, side, { reducedMotion: true }).phase, action === 'fall' ? 3 : 0);
    assert.deepEqual(pose(figure, search, prepared, side, { paused: true, resolving: true, frozenAction: action, frozenPhase: 0 }), selected);
    for (const query of baseline.oldPasses.map(pass => `?artPass=${pass.pass}`)) assert.equal(pose(figure, query, prepared, side), null);
    for (const direction of Array.from({ length: 8 }, (_, index) => index).filter(direction => direction !== nativeDirection(side))) assert.equal(pose({ ...figure, direction }, search, prepared, side), null);
  }
});

test('four independently reviewed cardinal sheets retain all 16 full native cells and a common reference per army pair', requireComplete);

test('v22 retains every complete v21 definition and ready/gait/fire/reload/E/W contact/casualty output', () => {
  requireComplete(); const priorClips = prepare(textures, priorSearch);
  assert.deepEqual(clips.filter(clip => !clip.key.includes('gettysburg-v22')), priorClips);
  for (const clip of priorClips) for (const frame of [0, 1, 2, 3, 7]) for (const flags of [{}, { reducedMotion: true }, { paused: true }, { resolving: true }]) {
    const figure = { id: 0, action: clip.action === 'march' ? 'walk' : clip.action, fallen: clip.action === 'fall', direction: clip.direction, frame };
    const options = { side: clip.side, identity: clip.identity, scenarioId: 'gettysburg', shootingAge: .08, reloadProgress: .8, ...flags };
    assert.deepEqual(gettysburgInfantryClipPose('retained-v21', figure, 77, { ...options, search, clips }),
      gettysburgInfantryClipPose('retained-v21', figure, 77, { ...options, search: priorSearch, clips: priorClips }));
  }
});

for (const side of ['union', 'confederate']) for (const action of ['melee', 'fall']) test(`native cardinal ${side} ${action} withholds the whole action for any missing or ambiguous phase`, () => {
  requireComplete(); const native = clips.find(clip => clip.key === contract(action, side).key), figure = { id: idFor('a'), action, fallen: action === 'fall', direction: nativeDirection(side), frame: 0 };
  for (let frame = 0; frame < 4; frame++) { const selected = pose({ ...figure, frame }, search, clips, side); assert.equal(selected.frame, native.frames[frame]); assert.equal(selected.direction, nativeDirection(side)); }
  assert.equal(pose({ ...figure, fallen: action !== 'fall' }, search, clips, side), null);
  assert.equal(pose(figure, search, clips, side, { identity: 'b', versionedIdentity: false }), null);
  for (const name of native.frames) {
    const damaged = gettysburgClipTestTextures(atlases); damaged.get(native.key).frames.delete(name);
    const prepared = initialize(damaged); assert.equal(prepared.length, 79);
    for (let frame = 0; frame < 4; frame++) assert.equal(pose({ ...figure, frame }, search, prepared, side), null);
    assert.ok(pose({ ...figure, action: action === 'melee' ? 'fall' : 'melee', fallen: action === 'melee' }, search, prepared, side));
    for (const oldSide of ['union', 'confederate']) assert.ok(pose({ ...figure, direction: oldSide === 'union' ? 4 : 0 }, search, prepared, oldSide));
  }
  assert.deepEqual(prepareGettysburgInfantryClips([native, native], () => true), []);
  assert.equal(pose(figure, search, [...clips, native], side), null);
});

function pairFixture({ independentFacing = false, pass = 'gettysburg-v22', axis = 'ns' } = {}) {
  windowState.location.search = `?artPass=${pass}`;
  const scene = attachRenderer(new Scene('gettysburg', campaign, 'option_a'));
  const confederate = scene.engine.state.find(value => value.side === 'confederate' && value.type === 'infantry' && value.active);
  const union = scene.engine.state.find(value => value.side === 'union' && value.type === 'infantry' && value.active);
  for (const value of scene.engine.state) if (![union.id, confederate.id].includes(value.id)) value.active = false;
  for (const value of [confederate, union]) Object.assign(value, { strength: 3000, initialStrength: 3000, morale: 90, cohesion: 90, fatigue: 0,
    status: 'steady', order: 'hold', formationMode: 'line', frontage: 150, ammunition: 0, active: true, arrivalTime: null, reload: 0, lastVolleyAt: null });
  if (axis === 'ns') {
    Object.assign(union, { x: 400, y: 400, facing: independentFacing ? 0 : Math.PI / 2, inMelee: true, meleeWith: confederate.id });
    Object.assign(confederate, { x: union.x, y: union.y + 100, facing: independentFacing ? 0 : 3 * Math.PI / 2, inMelee: true, meleeWith: union.id });
    confederate.y = union.y + closeCombatDistance(confederate, union) - 1;
  } else {
    Object.assign(confederate, { x: 400, y: 600, facing: independentFacing ? Math.PI / 2 : 0, inMelee: true, meleeWith: union.id });
    Object.assign(union, { x: confederate.x + 100, y: confederate.y, facing: independentFacing ? Math.PI / 2 : Math.PI, inMelee: true, meleeWith: confederate.id });
    union.x = confederate.x + closeCombatDistance(confederate, union) - 1;
  }
  scene.engine.time = 7.08; scene.speed = 1;
  for (const value of [confederate, union]) scene.createFormation(current(scene, value.id));
  return { scene, confederate, union, ids: [confederate.id, union.id] };
}
function drawPair(scene, ids, resolving = false) {
  const snapshot = scene.engine.snapshot({ presentation: true });
  scene.smoke.clear(); scene.shadows.clear(); scene.dust.clear();
  for (const id of ids) {
    const formation = snapshot.formations.find(value => value.id === id), foe = formation.inMelee && snapshot.formations.find(value => value.id === formation.meleeWith);
    const presented = foe ? { ...formation, contactFacing: Math.atan2(foe.y - formation.y, foe.x - formation.x) } : formation;
    scene.syncFormation(presented, scene.engine.time + (scene.engine.resolutionTime || 0), resolving, []);
  }
  return ids.map(id => scene.views.get(id));
}
function coldPair(saved, ids, pass = 'gettysburg-v22') {
  windowState.location.search = `?artPass=${pass}`;
  const cold = attachRenderer(new Scene('gettysburg', campaign, 'option_a', null, null, null, null, json(saved)));
  for (const id of ids) cold.createFormation(current(cold, id)); return cold;
}
function pairSprites(scene, ids) { return json(ids.map(id => spriteFacts(scene.views.get(id)))); }
function assertNativeFigures(scene, unit, action, { requireBothUnionIdentities = false, requireNativeA = true } = {}) {
  const view = scene.views.get(unit.id), affected = view.visual.output.figures.filter(figure => figure.visible && figure.action === action), identities = new Set();
  assert.ok(affected.length > 0);
  for (const figure of affected) {
    const identity = unit.side === 'union' ? gettysburgInfantryIdentity(unit.id, figure.id) : 'a', sprite = view.soldiers[figure.id].sprite;
    identities.add(identity);
    if (unit.side === 'union' && identity === 'b') { assert.ok(/^union-detailed-/.test(sprite.textureKey)); assert.equal(view.soldiers[figure.id].clipPhase, undefined); }
    else {
      const key = unit.side === 'union' ? contract(action).key : confederateContract(action), native = clips.find(clip => clip.key === key);
      assert.equal(sprite.textureKey, key); assert.equal(sprite.angle, 0); assert.equal(sprite.flipX, false);
      assert.equal(sprite.x, figure.x); assert.equal(sprite.y, figure.y);
      assert.deepEqual(sprite.origin, native.pivots[view.soldiers[figure.id].clipPhase]);
      const individualScale = .95 + deterministicUnitValue(unit.id, figure.id, 215) * .10;
      const expectedScale = 58 * figure.scale * individualScale / native.referenceHeight;
      close(sprite.scaleX, expectedScale); close(sprite.scaleY, expectedScale);
    }
  }
  if (requireNativeA) assert.ok(identities.has('a'));
  if (requireBothUnionIdentities) assert.ok(identities.has('b'));
  return affected;
}
function fallenPair({ pass = 'gettysburg-v22', axis = 'ns' } = {}) {
  const pair = pairFixture({ pass, axis });
  for (const value of [pair.confederate, pair.union]) { value.inMelee = false; value.meleeWith = null; }
  drawPair(pair.scene, pair.ids);
  for (const value of [pair.confederate, pair.union]) value.strength *= .5;
  drawPair(pair.scene, pair.ids);
  return { ...pair, fallenAt: pair.scene.engine.time };
}

test('public Scene move confirmation then Southern ridge assault reaches genuine opposing N/S contact from the untouched roster', () => {
  requireComplete(); windowState.location.search = search;
  const scene = attachRenderer(new Scene('gettysburg', campaign, 'option_a', null, () => {}));
  const confederate = scene.engine.state.find(unit => unit.id === 'pickett-division'), union = scene.engine.state.find(unit => unit.id === 'gibbon-center');
  const ids = [confederate.id, union.id], initial = { x: confederate.x, y: confederate.y, strength: confederate.strength, unionStrength: union.strength };
  assert.equal(scene.engine.time, 0); assert.ok(!confederate.inMelee && !union.inMelee);
  for (const id of ids) scene.createFormation(current(scene, id));
  const stage = { x: union.x, y: 600 }; scene.setSelected(confederate.id); scene.previewDestination(stage);
  assert.deepEqual(json(scene.pendingDestination), stage); assert.equal(scene.speed, 0);
  scene.confirmMove(); assert.equal(scene.pendingDestination, null); assert.equal(confederate.pendingCommand.order, 'move'); scene.setSpeed(1);
  for (let step = 0; step < 600 && Math.hypot(confederate.x - stage.x, confederate.y - stage.y) >= 3; step++) {
    scene.engine.tick(.05); drawPair(scene, ids);
  }
  assert.ok(Math.hypot(confederate.x - stage.x, confederate.y - stage.y) < 3);
  assert.ok(confederate.y < initial.y); assert.equal(union.x, stage.x);
  scene.issueOrder('assault', { sectorId: 'left' }); assert.equal(confederate.pendingCommand.order, 'assault');
  let contactAt;
  const seenContact = new Map(ids.map(id => [id, new Set()])), seenFall = new Map(ids.map(id => [id, new Set()]));
  for (let step = 0; step < 1200; step++) {
    scene.engine.tick(.05); const combat = json(scene.engine.checkpoint()); drawPair(scene, ids);
    assert.deepEqual(json(scene.engine.checkpoint()), combat);
    if (!contactAt && confederate.inMelee && confederate.meleeWith === union.id) contactAt = scene.engine.time;
    if (!contactAt) continue;
    for (const unit of [confederate, union]) {
      assert.equal(unit.inMelee, true); assert.equal(unit.meleeWith, unit.side === 'union' ? confederate.id : union.id);
      const contact = assertNativeFigures(scene, unit, 'melee', { requireBothUnionIdentities: unit.side === 'union' });
      for (const figure of contact) if (unit.side === 'confederate' || gettysburgInfantryIdentity(unit.id, figure.id) === 'a') {
        assert.equal(figure.direction, nativeDirection(unit.side)); seenContact.get(unit.id).add(scene.views.get(unit.id).soldiers[figure.id].clipPhase);
      }
      for (const figure of scene.views.get(unit.id).visual.output.figures.filter(figure => figure.visible && figure.fallen)) {
        const soldier = scene.views.get(unit.id).soldiers[figure.id], sprite = soldier.sprite;
        if (figure.direction !== nativeDirection(unit.side) || (unit.side === 'union' && gettysburgInfantryIdentity(unit.id, figure.id) === 'b')) {
          assert.equal(soldier.clipPhase, undefined); assert.ok(sprite.textureKey.startsWith(`${unit.side}-detailed-`)); continue;
        }
        const native = clips.find(clip => clip.key === contract('fall', unit.side).key);
        assert.equal(sprite.textureKey, native.key); assert.equal(sprite.frameName, native.frames[soldier.clipPhase]);
        assert.deepEqual(sprite.origin, native.pivots[soldier.clipPhase]); assert.equal(sprite.x, figure.x); assert.equal(sprite.y, figure.y);
        assert.equal(sprite.angle, 0); assert.equal(sprite.flipX, false); seenFall.get(unit.id).add(soldier.clipPhase);
      }
    }
    if (scene.engine.time - contactAt >= 20) break;
  }
  assert.ok(contactAt > 0 && contactAt < 30);
  assert.ok(confederate.strength < initial.strength && union.strength < initial.unionStrength);
  for (const id of ids) { assert.deepEqual([...seenContact.get(id)].sort(), [0, 1, 2, 3]); assert.deepEqual([...seenFall.get(id)].sort(), [0, 1, 2, 3]); }
  scene.setSpeed(0); const saved = json(scene.checkpoint()), frozen = pairSprites(scene, ids), cold = coldPair(saved, ids); drawPair(cold, ids);
  // Expired invisible sprites keep stale hot-draw fields; a cold constructor
  // starts those invisible objects afresh. Compare every visibility bit and
  // every rendered attribute, including all still-visible casualty bodies.
  const rendered = armies => armies.map(sprites => sprites.map(sprite => sprite.visible ? sprite : { visible: false }));
  assert.deepEqual(rendered(pairSprites(cold, ids)), rendered(frozen)); assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation);
  assert.deepEqual(json(cold.engine.checkpoint()), json(scene.engine.checkpoint()));
});

test('actual opposing S/N contact uses each army source, independent contact facing and stable Union A/B through four phases and cold pause', () => {
  requireComplete(); const pair = pairFixture({ independentFacing: true }), seen = new Map(pair.ids.map(id => [id, new Set()]));
  for (const time of [7.08, 7.28, 7.48, 7.68]) {
    pair.scene.engine.time = time; const combat = json(pair.scene.engine.checkpoint()); drawPair(pair.scene, pair.ids);
    for (const unit of [pair.confederate, pair.union]) {
      const contact = assertNativeFigures(pair.scene, unit, 'melee', { requireBothUnionIdentities: unit.side === 'union' });
      assert.equal(pair.scene.views.get(unit.id).visual.output.facing, 0);
      for (const figure of contact) {
        assert.equal(figure.direction, nativeDirection(unit.side));
        if (unit.side === 'confederate' || gettysburgInfantryIdentity(unit.id, figure.id) === 'a') seen.get(unit.id).add(pair.scene.views.get(unit.id).soldiers[figure.id].sprite.frameName);
      }
    }
    pair.scene.speed = 0; const saved = json(pair.scene.checkpoint()), frozen = pairSprites(pair.scene, pair.ids), cold = coldPair(saved, pair.ids);
    assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation); drawPair(cold, pair.ids);
    assert.deepEqual(pairSprites(cold, pair.ids), frozen); assert.deepEqual(json(cold.engine.checkpoint()), combat);
    drawPair(pair.scene, pair.ids); assert.deepEqual(pairSprites(pair.scene, pair.ids), frozen); pair.scene.speed = 1;
  }
  for (const phases of seen.values()) assert.equal(phases.size, 4);
});

test('real simultaneous contact losses produce both army contact and casualty poses with stable Union identity and no combat feedback', () => {
  requireComplete(); const pair = pairFixture(), seenFallPhases = new Map(pair.ids.map(id => [id, new Set()])); drawPair(pair.scene, pair.ids);
  // Casualties appear at loss thresholds and fade after 3.2 seconds. Collect
  // actual native phase evidence while visible instead of assuming a body
  // must still be on screen at one arbitrary final sampling instant.
  for (let step = 0; step < 400; step++) {
    pair.scene.engine.time += .05; resolveContactCombat(pair.scene.engine, .05); drawPair(pair.scene, pair.ids);
    for (const unit of [pair.confederate, pair.union]) {
      const view = pair.scene.views.get(unit.id), fallen = view.visual.output.figures.filter(figure => figure.visible && figure.fallen);
      if (!fallen.length) continue;
      assertNativeFigures(pair.scene, unit, 'fall', { requireNativeA: false });
      for (const figure of fallen) if (unit.side === 'confederate' || gettysburgInfantryIdentity(unit.id, figure.id) === 'a') seenFallPhases.get(unit.id).add(view.soldiers[figure.id].clipPhase);
    }
  }
  assert.ok(pair.confederate.strength < 3000 && pair.union.strength < 3000);
  const combat = json(pair.scene.engine.checkpoint()); drawPair(pair.scene, pair.ids);
  for (const unit of [pair.confederate, pair.union]) {
    assert.equal(unit.ammunition, 0); assertNativeFigures(pair.scene, unit, 'melee');
    assert.deepEqual([...seenFallPhases.get(unit.id)].sort(), [0, 1, 2, 3], unit.side);
  }
  assert.deepEqual(json(pair.scene.engine.checkpoint()), combat);
});

test('both armies preserve grounded casualty pivots, terminal phases, fade and saved facing through phase-by-phase JSON cold resume', () => {
  requireComplete(); const pair = fallenPair(), anchors = pair.ids.map(id => pair.scene.views.get(id).visual.figures.filter(figure => figure.fallen).map(figure => ({ id: figure.id, ...figure.fallen })));
  for (const [age, phase] of [[0, 0], [.18, 1], [.36, 2], [.55, 3], [2.5, 3]]) {
    pair.scene.engine.time = pair.fallenAt + age; const combat = json(pair.scene.engine.checkpoint()); drawPair(pair.scene, pair.ids);
    for (const [index, unit] of [pair.confederate, pair.union].entries()) {
      assertNativeFigures(pair.scene, unit, 'fall', { requireBothUnionIdentities: unit.side === 'union' });
      for (const anchor of anchors[index]) {
        const view = pair.scene.views.get(unit.id), figure = view.visual.output.figures[anchor.id], soldier = view.soldiers[anchor.id];
        assert.equal(figure.direction, nativeDirection(unit.side)); assert.equal(figure.x, anchor.x); assert.equal(figure.y, anchor.y);
        if (unit.side === 'union' && gettysburgInfantryIdentity(unit.id, anchor.id) === 'b') continue;
        const native = clips.find(clip => clip.key === (unit.side === 'union' ? contract('fall').key : confederateContract('fall')));
        assert.equal(soldier.clipPhase, phase); assert.equal(soldier.sprite.frameName, native.frames[phase]); assert.deepEqual(soldier.sprite.origin, native.pivots[phase]);
        assert.equal(soldier.sprite.x, anchor.x); assert.equal(soldier.sprite.y, anchor.y); assert.equal(soldier.sprite.angle, 0); close(soldier.sprite.alpha, Math.min(1, (3.2 - age) / 1.1));
      }
    }
    pair.scene.speed = 0; const saved = json(pair.scene.checkpoint()), frozen = pairSprites(pair.scene, pair.ids), cold = coldPair(saved, pair.ids);
    // The public resume draws before the next Save action. Verify the first
    // cold draw including retained gait, then verify an immediate re-save.
    drawPair(cold, pair.ids); assert.deepEqual(pairSprites(cold, pair.ids), frozen);
    assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation);
    assert.deepEqual(json(cold.engine.checkpoint()), combat); pair.scene.speed = 1;
  }
  pair.union.facing = 3 * Math.PI / 2; pair.confederate.facing = Math.PI / 2; drawPair(pair.scene, pair.ids);
  assertNativeFigures(pair.scene, pair.union, 'fall'); assertNativeFigures(pair.scene, pair.confederate, 'fall');
  pair.scene.engine.time = pair.fallenAt + 3.21; drawPair(pair.scene, pair.ids);
  for (const [index, id] of pair.ids.entries()) for (const anchor of anchors[index]) assert.equal(pair.scene.views.get(id).soldiers[anchor.id].sprite.visible, false);
});

test('immediate re-save before the first cold draw preserves every native and Union B fallback casualty phase', () => {
  requireComplete(); const pair = fallenPair();
  const fallenIds = pair.ids.map(id => pair.scene.views.get(id).visual.figures.filter(figure => figure.fallen).map(figure => figure.id));
  const fallenSprites = scene => json(pair.ids.map((id, index) => {
    const facts = spriteFacts(scene.views.get(id)); return fallenIds[index].map(figureId => facts[figureId]);
  }));
  for (const [age, phase] of [[0, 0], [.18, 1], [.36, 2], [.55, 3], [2.5, 3]]) {
    pair.scene.engine.time = pair.fallenAt + age; drawPair(pair.scene, pair.ids);
    const combat = json(pair.scene.engine.checkpoint()), frozen = fallenSprites(pair.scene), saved = json(pair.scene.checkpoint());
    const cold = coldPair(saved, pair.ids);
    assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation); drawPair(cold, pair.ids);
    assert.deepEqual(fallenSprites(cold), frozen);
    for (const unit of [pair.confederate, pair.union]) {
      const fallen = assertNativeFigures(cold, unit, 'fall', { requireBothUnionIdentities: unit.side === 'union' });
      for (const figure of fallen) if (unit.side === 'confederate' || gettysburgInfantryIdentity(unit.id, figure.id) === 'a') {
        assert.equal(cold.views.get(unit.id).soldiers[figure.id].clipPhase, phase);
      }
    }
    assert.deepEqual(json(cold.engine.checkpoint()), combat);
  }
});

test('reduced-motion opposing contact and casualties select fixed native phases and cold-resume both stable identities', () => {
  requireComplete();
  for (const make of [pairFixture, fallenPair]) {
    const pair = make(); pair.scene.reducedMotion = true;
    for (const elapsed of [0, .2, .5]) {
      pair.scene.engine.time += elapsed; drawPair(pair.scene, pair.ids);
      for (const unit of [pair.confederate, pair.union]) for (const figure of pair.scene.views.get(unit.id).visual.output.figures.filter(figure => ['melee', 'fall'].includes(figure.action))) {
        if (unit.side === 'union' && gettysburgInfantryIdentity(unit.id, figure.id) === 'b') continue;
        assert.equal(pair.scene.views.get(unit.id).soldiers[figure.id].clipPhase, figure.fallen ? 3 : 0);
      }
      const saved = json(pair.scene.checkpoint()), cold = coldPair(saved, pair.ids); cold.reducedMotion = true; drawPair(cold, pair.ids);
      assert.deepEqual(pairSprites(cold, pair.ids), pairSprites(pair.scene, pair.ids));
    }
  }
});

test('both native contacts stop on resolution while saved casualties advance and first cold draws retain exact presentation', () => {
  requireComplete();
  for (const make of [pairFixture, fallenPair]) {
    const pair = make(); drawPair(pair.scene, pair.ids); pair.scene.engine.beginResolution('defeat');
    for (const [age, phase] of [[.2, 1], [.4, 2], [.7, 3], [2.5, 3]]) {
      pair.scene.engine.resolutionTime = age; const combat = json(pair.scene.engine.checkpoint()); drawPair(pair.scene, pair.ids, true);
      for (const unit of [pair.confederate, pair.union]) for (const figure of pair.scene.views.get(unit.id).visual.output.figures.filter(figure => figure.visible)) {
        const soldier = pair.scene.views.get(unit.id).soldiers[figure.id];
        if (figure.fallen) { if (unit.side === 'confederate' || gettysburgInfantryIdentity(unit.id, figure.id) === 'a') assert.equal(soldier.clipPhase, phase); }
        else { assert.notEqual(figure.action, 'melee'); assert.notEqual(soldier.sprite.textureKey, contract('melee').key); assert.notEqual(soldier.sprite.textureKey, confederateContract('melee')); }
      }
      const saved = json(pair.scene.checkpoint()), frozen = pairSprites(pair.scene, pair.ids), cold = coldPair(saved, pair.ids);
      assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation); drawPair(cold, pair.ids, true);
      assert.deepEqual(pairSprites(cold, pair.ids), frozen); assert.deepEqual(json(cold.engine.checkpoint()), combat);
    }
  }
});

test('actual Scene retains accepted artwork for any missing cardinal phase and preserves the opposing native action', () => {
  requireComplete();
  for (const side of ['union', 'confederate']) for (const action of ['melee', 'fall']) for (const frame of clips.find(clip => clip.key === contract(action, side).key).frames) {
    const pair = action === 'melee' ? pairFixture() : fallenPair(), damaged = gettysburgClipTestTextures(atlases), unit = pair[side];
    damaged.get(contract(action, side).key).frames.delete(frame); pair.scene.infantryClips = initialize(damaged);
    for (const elapsed of [0, .2, .4, .6]) {
      pair.scene.engine.time += elapsed; const combat = json(pair.scene.engine.checkpoint()); drawPair(pair.scene, pair.ids);
      const affected = pair.scene.views.get(unit.id).visual.output.figures.filter(figure => figure.action === action); assert.ok(affected.length > 0);
      for (const figure of affected) { const soldier = pair.scene.views.get(unit.id).soldiers[figure.id]; assert.equal(soldier.clipPhase, undefined); assert.ok(soldier.sprite.textureKey.startsWith(`${side}-detailed-`)); }
      assertNativeFigures(pair.scene, pair[side === 'union' ? 'confederate' : 'union'], action); assert.deepEqual(json(pair.scene.engine.checkpoint()), combat);
    }
  }
});

test('actual Scene E/W contact and casualty output under v22 remains exact to v21 through every native phase and first cold draw', () => {
  requireComplete();
  for (const make of [pairFixture, fallenPair]) {
    const prior = make({ pass: 'gettysburg-v21', axis: 'ew' }), next = make({ pass: 'gettysburg-v22', axis: 'ew' });
    for (const age of [0, .18, .36, .55, 2.5]) {
      prior.scene.engine.time = next.scene.engine.time = 7.08 + age; drawPair(prior.scene, prior.ids); drawPair(next.scene, next.ids);
      assert.deepEqual(pairSprites(next.scene, next.ids), pairSprites(prior.scene, prior.ids));
      assert.deepEqual(json(next.scene.engine.checkpoint()), json(prior.scene.engine.checkpoint()));
      const saved = json(next.scene.checkpoint()), cold = coldPair(saved, next.ids); drawPair(cold, next.ids);
      assert.deepEqual(pairSprites(cold, next.ids), pairSprites(next.scene, next.ids));
      assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation);
    }
  }
});

test('stable Union identities survive survivor loss, rank reformation and a change to an unsupported contact bearing', () => {
  requireComplete(); const pair = pairFixture(); drawPair(pair.scene, pair.ids);
  const identities = new Map(pair.scene.views.get(pair.union.id).visual.output.figures.filter(figure => figure.visible).map(figure => [figure.id, gettysburgInfantryIdentity(pair.union.id, figure.id)]));
  pair.union.strength *= .7; pair.union.formationMode = 'column'; pair.scene.engine.time += .2; drawPair(pair.scene, pair.ids); assertNativeFigures(pair.scene, pair.union, 'melee');
  for (const figure of pair.scene.views.get(pair.union.id).visual.output.figures.filter(figure => figure.visible && !figure.fallen)) assert.equal(gettysburgInfantryIdentity(pair.union.id, figure.id), identities.get(figure.id));
  pair.confederate.x += 150; pair.scene.engine.time += .2; drawPair(pair.scene, pair.ids);
  const contact = pair.scene.views.get(pair.union.id).visual.output.figures.filter(figure => figure.action === 'melee'); assert.ok(contact.length > 0);
  for (const figure of contact) { assert.notEqual(figure.direction, 2); assert.equal(pair.scene.views.get(pair.union.id).soldiers[figure.id].clipPhase, undefined); assert.ok(/^union-detailed-/.test(pair.scene.views.get(pair.union.id).soldiers[figure.id].sprite.textureKey)); }
});

test('reversing the primary N/S contact bearing keeps both armies on accepted fallback with their stable identities', () => {
  requireComplete(); const pair = pairFixture(), prior = pairFixture({ pass: 'gettysburg-v21' });
  drawPair(pair.scene, pair.ids); drawPair(prior.scene, prior.ids);
  for (const unit of [pair.confederate, pair.union]) assertNativeFigures(pair.scene, unit, 'melee');
  const identities = new Map(pair.scene.views.get(pair.union.id).visual.output.figures.map(figure => [figure.id, gettysburgInfantryIdentity(pair.union.id, figure.id)]));
  for (const fixture of [pair, prior]) { fixture.confederate.y = fixture.union.y - 75; fixture.scene.engine.time += .2; drawPair(fixture.scene, fixture.ids); }
  // Retain the actual v21 fallback, including Union's legacy rear aim page.
  assert.deepEqual(pairSprites(pair.scene, pair.ids), pairSprites(prior.scene, prior.ids));
  for (const unit of [pair.confederate, pair.union]) {
    const view = pair.scene.views.get(unit.id), affected = view.visual.output.figures.filter(figure => figure.visible && figure.action === 'melee');
    assert.ok(affected.length > 0);
    for (const figure of affected) {
      assert.equal(figure.direction, unit.side === 'union' ? 6 : 2);
      assert.equal(view.soldiers[figure.id].clipPhase, undefined);
      if (unit.side === 'union') assert.equal(gettysburgInfantryIdentity(unit.id, figure.id), identities.get(figure.id));
    }
  }
});

test('retained Union and Confederate volley mouths and v18 shot checkpoint identity cold-resume through v22', () => {
  requireComplete(); const pair = pairFixture();
  for (const unit of [pair.confederate, pair.union]) Object.assign(unit, { inMelee: false, meleeWith: null, lastVolleyAt: 7, reload: 10, status: 'firing', engagedWith: unit.side === 'union' ? pair.confederate.id : pair.union.id });
  drawPair(pair.scene, pair.ids); const saved = json(pair.scene.checkpoint()); assert.equal(saved.presentation.shots.artPass, 'gettysburg-v18');
  const before = pair.ids.map(id => json(pair.scene.views.get(id).shots)); assert.ok(before.every(shots => shots.figures.some(shot => shot.native)));
  const cold = coldPair(saved, pair.ids); assert.deepEqual(pair.ids.map(id => json(cold.views.get(id).shots)), before); drawPair(cold, pair.ids);
  assert.deepEqual(pairSprites(cold, pair.ids), pairSprites(pair.scene, pair.ids)); assert.deepEqual(json(cold.engine.checkpoint()), json(pair.scene.engine.checkpoint()));
  assert.equal(cold.engine.battleRulesVersion, 18);
});
