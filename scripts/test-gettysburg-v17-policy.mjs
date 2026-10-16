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

const search = '?artPass=gettysburg-v17';
const priorSearch = '?artPass=gettysburg-v16';
const root = path => new URL(`../${path}`, import.meta.url);
const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.parse(JSON.stringify(value));
const jsonHash = value => hash(JSON.stringify(value));
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);
const assets = gettysburgInfantryClipAssets('gettysburg', search);
const priorAssets = gettysburgInfantryClipAssets('gettysburg', priorSearch);
// Missing native files fail this suite during module load; no generated stand-ins
// or skip flag can replace one real reviewed native SW sheet.
const baseline = JSON.parse(readFileSync(root('scripts/fixtures/gettysburg-v17-preservation.json')));
const availableAssets = [...new Map([...baseline.allPriorAssets, ...assets].map(asset => [asset.key, asset])).values()];
const atlases = new Map(availableAssets.map(asset => [asset.key, JSON.parse(readFileSync(root(`public/${asset.json}`)))]));
const textures = gettysburgClipTestTextures(atlases);
const prepare = (loaded = textures, query = search) => prepareGettysburgInfantryClips(
  gettysburgInfantryClipDefinitions('gettysburg', query, loaded),
  (key, frame) => loaded.exists(key) && loaded.get(key).has(frame));
const clips = prepare();
const formationId = 'v17-confederate-policy';
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
function coldScene(saved, id, pass = 'gettysburg-v17') {
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
  for (const frame of [0, 1, 2, 3, 4, 7, -1, 8]) for (const template of preservationFlags) for (const age of [0, .08, .19, .4]) {
    const flags = Object.keys(template).length ? { ...template, ...(template.frozenAction ? { frozenAction: clip.action, frozenPhase: clip.frames.length - 1 } : {}) } : {};
    const figure = { id: 17, direction: clip.direction, action, frame, scale: 1.37, bodyOffsetX: 5, bodyOffsetY: -4, lean: 2 };
    rows.push({ action, frame, flags, age, pose: gettysburgInfantryClipPose('v17-v16-preservation', figure, 999, {
      scenarioId: 'gettysburg', search: query, side: clip.side, identity: clip.identity, clips: prepared, shootingAge: age, ...flags }) });
  }
  return rows;
}
const requireComplete = () => {
  assert.equal(assets.length, 36); assert.equal(clips.length, 72); assert.equal(initialize(textures).length, 72);
  assert.equal(new Set(clips.map(address)).size, 72);
};

test('v17 is an exact Gettysburg opt-in with the unchanged 36 v16 atlases and 72 complete clips', () => {
  requireComplete();
  const policy = gettysburgInfantryClipPolicy('gettysburg', search), prior = gettysburgInfantryClipPolicy('gettysburg', priorSearch);
  assert.deepEqual(GETTYSBURG_INFANTRY_CLIPS_IDS, [...baseline.oldPasses.map(row => row.pass), 'gettysburg-v17', 'gettysburg-v18']);
  assert.ok(Object.isFrozen(policy) && Object.isFrozen(policy.atlases) && Object.isFrozen(policy.directions));
  assert.equal(policy.monotonicReload, true); assert.equal(policy.shotPresentationId, 'gettysburg-v17');
  assert.deepEqual({ ...policy, monotonicReload: undefined, shotPresentationId: 'gettysburg-v16' }, { ...prior, monotonicReload: undefined });
  assert.deepEqual(assets, priorAssets); assert.deepEqual(clips, prepare(textures, priorSearch));
  const unavailable = { exists() { assert.fail('disabled query inspected texture'); }, get() { assert.fail('disabled query read metadata'); } };
  for (const query of ['', '?artPass=gettysburg-v19', '?artPass=gettysburg-v17-other', '?other=gettysburg-v17', '?artPass=__proto__', '?artPass=constructor']) {
    assert.equal(gettysburgInfantryClipsEnabled('gettysburg', query), false); assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', query), []);
    assert.deepEqual(gettysburgInfantryClipDefinitions('gettysburg', query, unavailable), []); assert.deepEqual(initialize(unavailable, query), []);
  }
  for (const scenario of ['gettysburg_meade', 'gettysburg_jackson', 'first_manassas', 'shiloh', null]) {
    assert.equal(gettysburgInfantryClipsEnabled(scenario, search), false); assert.deepEqual(gettysburgInfantryClipAssets(scenario, search), []);
    assert.deepEqual(initialize(unavailable, search, scenario), []);
  }
});

test('all 14 genuine old policies and 99,584 original pose rows remain exact, along with 39 historical atlas pairs', () => {
  requireComplete(); assert.equal(baseline.schemaVersion, 1); assert.equal(baseline.artPass, 'gettysburg-v16');
  assert.equal(baseline.oldPasses.length, 14); assert.equal(baseline.allPriorAssets.length, 39);
  assert.equal(baseline.oldPasses.reduce((sum, pass) => sum + pass.poseRows, 0), 99584);
  const hashes = selected => selected.map(asset => ({ key: asset.key, image: hash(readFileSync(root(`public/${asset.image}`))), json: hash(readFileSync(root(`public/${asset.json}`))) }));
  assert.deepEqual(hashes(priorAssets), baseline.hashes); assert.deepEqual(hashes(baseline.allPriorAssets), baseline.allPriorHashes);
  assert.equal(jsonHash(clips), baseline.clipHash);
  for (const [index, clip] of clips.entries()) {
    const expected = baseline.addresses[index], rows = preservationRows(clip, priorSearch, clips);
    assert.deepEqual([clip.side, clip.identity, clip.direction, clip.action], expected.address);
    assert.equal(clip.key, expected.key); assert.deepEqual(clip.frames, expected.frames);
    assert.equal(rows.length, expected.rows); assert.equal(jsonHash(rows), expected.poseHash);
  }
  for (const pass of baseline.oldPasses) {
    const query = `?artPass=${pass.pass}`, prepared = prepare(textures, query), rows = prepared.flatMap(clip => preservationRows(clip, query, prepared));
    assert.deepEqual(gettysburgInfantryClipPolicy('gettysburg', query), pass.policy); assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', query), pass.assets);
    assert.equal(prepared.length, pass.clips); assert.equal(jsonHash(prepared), pass.clipHash);
    assert.equal(rows.length, pass.poseRows); assert.equal(jsonHash(rows), pass.poseHash, `${pass.pass} genuine original pose rows`);
  }
});

test('all studies, presets, default playback and six protected combat/save/presentation modules remain byte exact', () => {
  const presets = getGettysburgMotionPlaybackPresets(GETTYSBURG_MOTION_STUDIES);
  assert.equal(GETTYSBURG_MOTION_STUDIES.length, 202); assert.equal(baseline.studyRows, 202);
  assert.equal(jsonHash(GETTYSBURG_MOTION_STUDIES), baseline.studyHash); assert.equal(presets.length, 125); assert.equal(jsonHash(presets), baseline.presetHash);
  assert.equal(getGettysburgMotionPlaybackInitialPreset(presets).id, baseline.initialPreset);
  assert.deepEqual(createGettysburgMotionPlaybackState(GETTYSBURG_MOTION_STUDIES), baseline.playbackState);
  // Only the explicitly scoped pause/presentation adapter and native pose
  // selector change. Earlier poses are frozen above, and actual-scene reload
  // behavior is exercised below; simulation and save schemas stay byte exact.
  const intentionalPresentationChanges = new Set(['src/battle/CivilWarBattlefield.jsx', 'src/battle/gettysburgInfantryClips.js']);
  const protectedRecords = baseline.protectedModules.filter(record => !intentionalPresentationChanges.has(record.path));
  assert.equal(protectedRecords.length, 6);
  for (const record of protectedRecords) assert.equal(hash(readFileSync(root(record.path))), record.sha256, record.path);
});

test('reload facts reject missing, invalid, future and non-infantry histories without inventing a previous shot', () => {
  const valid = { type: 'infantry', lastVolleyAt: 7, reload: 2.4 };
  close(gettysburgInfantryReloadProgress(valid, 8), .5 / 2.9);
  assert.equal(gettysburgInfantryReloadProgress({ ...valid, reload: 0 }, 11), 1);
  assert.equal(gettysburgInfantryReloadProgress({ ...valid, reload: 0 }, 7), 1);
  for (const formation of [null, {}, { ...valid, type: 'artillery' }, { ...valid, lastVolleyAt: -100 }, { ...valid, lastVolleyAt: Infinity },
    { ...valid, lastVolleyAt: NaN }, { ...valid, lastVolleyAt: '7' }, { ...valid, reload: -1 }, { ...valid, reload: Infinity }, { ...valid, reload: NaN }, { ...valid, reload: '2.4' }]) {
    assert.equal(gettysburgInfantryReloadProgress(formation, 8), null);
  }
  for (const time of [-1, NaN, Infinity, '8', 6.99]) assert.equal(gettysburgInfantryReloadProgress(valid, time), null);
});

test('normal, non-line, suppressed and moving-fire reload durations advance load to ram once, independent of frame or cadence', () => {
  requireComplete();
  for (const duration of [3.4, 4.1, 3.4 * 1.6, 3.4 * 1.6 * 1.8]) {
    let previousProgress = -1, previousPhase = 0, transitions = 0;
    for (let step = 0; step <= Math.ceil(duration * 100); step++) {
      const elapsed = Math.min(duration, step / 100), formation = { type: 'infantry', lastVolleyAt: 7, reload: Math.max(0, duration - elapsed) };
      const progress = gettysburgInfantryReloadProgress(formation, 7 + elapsed);
      assert.ok(progress >= previousProgress - 1e-12); previousProgress = progress;
      for (const frame of [0, 3, 7, 999, -17]) {
        const selected = pose({ id: 0, direction: 3, action: 'reload', frame }, search, clips, 'confederate', { reloadProgress: progress });
        const expected = elapsed - .5 >= duration - elapsed ? 1 : 0;
        // Decimal engine times can lie a few ulps either side of halfway.
        // Both adjacent phases are valid at that boundary; the sequence must
        // still advance only once, which is checked independently below.
        if (Math.abs(2 * elapsed - .5 - duration) > 1e-9) assert.equal(selected.phase, expected, `${duration} seconds at ${elapsed} stays in an ordered phase`);
      }
      const phase = progress < .5 ? 0 : 1;
      assert.ok(phase >= previousPhase); if (phase !== previousPhase) transitions++;
      previousPhase = phase;
    }
    assert.equal(transitions, 1);
    const sample = cadence => Array.from({ length: 25 }, (_, index) => {
      const elapsed = index / 24 * duration;
      return pose({ id: 0, direction: 3, action: 'reload', frame: Math.floor(elapsed * cadence * 2) }, search, clips, 'confederate', {
        reloadProgress: gettysburgInfantryReloadProgress({ type: 'infantry', lastVolleyAt: 7, reload: Math.max(0, duration - elapsed) }, 7 + elapsed),
      });
    });
    assert.deepEqual(sample(1), sample(4));
  }
});

test('actual Gettysburg volleys supply normal, suppressed/non-line and moving fallback timers that preserve one ordered phase transition', () => {
  for (const spec of [{ suppression: 0, mode: 'line', order: 'hold' },
    { suppression: 75, mode: 'column', order: 'hold' }, { suppression: 0, mode: 'line', order: 'fallback' }]) {
    const engine = new CivilWarBattleEngine('gettysburg', campaign, 'option_a');
    const unit = engine.state.find(unit => unit.side === 'confederate' && unit.type === 'infantry' && unit.active);
    const enemy = engine.state.find(unit => unit.side === 'union' && unit.type === 'infantry' && unit.active);
    for (const formation of engine.state) formation.active = [unit.id, enemy.id].includes(formation.id);
    Object.assign(unit, { x: 400, y: 700, facing: 0, facingOrder: 0, formationMode: spec.mode, order: spec.order,
      target: { x: 200, y: 700 }, reload: 0, suppression: spec.suppression, cohesion: 95, morale: 95 });
    Object.assign(enemy, { x: 600, y: 700, order: 'hold', ammunition: 0, reload: 10, facing: Math.PI });
    const ammunition = unit.ammunition; engine.tick(.05);
    assert.equal(unit.ammunition, ammunition - 1); assert.equal(unit.lastVolleyAt, engine.time);
    const initialDuration = (spec.mode === 'line' ? 3.4 : 4.1) * (1 + unit.suppression / 125) * (spec.order === 'fallback' ? 1.8 : 1);
    close(unit.reload, initialDuration); if (spec.order === 'fallback') assert.ok(unit.x < 400, 'fallback really moved before its volley');
    const volleyAt = unit.lastVolleyAt; unit.ammunition = 0;
    let previousProgress = -1, previousPhase = 0, transitions = 0;
    for (let step = 0; step <= Math.ceil(initialDuration / .05) + 1 && unit.reload > 0; step++) {
      const before = json(engine.checkpoint()), progress = gettysburgInfantryReloadProgress(unit, engine.time);
      const selected = pose({ id: 0, direction: 0, action: 'reload', frame: step * 7 }, search, clips, 'confederate', { reloadProgress: progress });
      assert.deepEqual(json(engine.checkpoint()), before, 'sampling presentation does not alter the live combat timer');
      assert.ok(progress >= previousProgress - 1e-12); assert.ok(selected.phase >= previousPhase);
      if (selected.phase !== previousPhase) transitions++;
      previousProgress = progress; previousPhase = selected.phase; engine.tick(.05);
      assert.equal(unit.lastVolleyAt, volleyAt);
    }
    assert.equal(unit.reload, 0); assert.equal(transitions, 1); assert.equal(gettysburgInfantryReloadProgress(unit, engine.time), 1);
  }
});

test('v17 changes only the ordered reload phase; unsupported directions, missing phases and all other native actions retain their accepted path', () => {
  requireComplete();
  for (const clip of clips) for (const frame of [0, 1, 2, 3, 7]) {
    const figure = { id: 0, direction: clip.direction, action: clip.action === 'march' ? 'walk' : clip.action, frame };
    const options = { side: clip.side, scenarioId: 'gettysburg', clips, identity: clip.identity, shootingAge: .08, reloadProgress: .8 };
    const selected = gettysburgInfantryClipPose('comparison', figure, 999, { ...options, search });
    const prior = gettysburgInfantryClipPose('comparison', figure, 999, { ...options, search: priorSearch });
    if (clip.action === 'reload') {
      assert.equal(selected.phase, 1); assert.equal(selected.frame, clip.frames[1]); assert.deepEqual(selected.pivot, clip.pivots[1]);
      const { phase, frame: name, pivot, muzzle, ...unchanged } = selected;
      const { phase: oldPhase, frame: oldName, pivot: oldPivot, muzzle: oldMuzzle, ...oldUnchanged } = prior;
      assert.deepEqual(unchanged, oldUnchanged);
    } else assert.deepEqual(selected, prior);
  }
  const clip = clips.find(clip => clip.side === 'confederate' && clip.direction === 3 && clip.action === 'reload');
  for (const frameName of clip.frames) {
    const damaged = gettysburgClipTestTextures(atlases); damaged.get(clip.key).frames.delete(frameName);
    const prepared = initialize(damaged); assert.equal(prepared.length, 71);
    assert.equal(pose({ id: 0, direction: 3, action: 'reload', frame: 3 }, search, prepared, 'confederate', { reloadProgress: .8 }), null);
    assert.ok(pose({ id: 0, direction: 3, action: 'fire', frame: 0 }, search, prepared));
  }
  for (const direction of [-1, 8, .5, NaN, undefined, '3']) assert.equal(pose({ id: 0, direction, action: 'reload', frame: 0 }, search, clips, 'confederate', { reloadProgress: .8 }), null);
});

test('paused and resolving reload preserve a valid frozen phase; cold unsampled reload derives progress, and reduced motion remains static', () => {
  const figure = { id: 0, direction: 3, action: 'reload', frame: 99 };
  for (const flag of ['paused', 'resolving']) {
    assert.equal(pose(figure, search, clips, 'confederate', { [flag]: true, reloadProgress: .8 }).phase, 1);
    assert.equal(pose(figure, search, clips, 'confederate', { [flag]: true, reloadProgress: .8, frozenPhase: 0, frozenAction: 'reload' }).phase, 0);
    assert.equal(pose(figure, search, clips, 'confederate', { [flag]: true, reloadProgress: .2, frozenPhase: 1, frozenAction: 'reload' }).phase, 1);
    assert.equal(pose(figure, search, clips, 'confederate', { [flag]: true, reloadProgress: .8, frozenPhase: 0, frozenAction: 'march' }).phase, 1);
  }
  for (const reloadProgress of [undefined, null, NaN, Infinity, -Infinity, '1']) assert.equal(pose(figure, search, clips, 'confederate', { reloadProgress }).phase, 0);
  assert.equal(pose(figure, search, clips, 'confederate', { reloadProgress: -1 }).phase, 0);
  assert.equal(pose(figure, search, clips, 'confederate', { reloadProgress: 2 }).phase, 1);
  assert.equal(pose(figure, search, clips, 'confederate', { reloadProgress: .8, reducedMotion: true }).phase, 0);
  // The historical selector must ignore the new parameter entirely.
  for (const row of baseline.oldPasses) for (const reloadProgress of [undefined, .2, .8]) {
    const prepared = prepare(textures, `?artPass=${row.pass}`);
    assert.deepEqual(pose(figure, `?artPass=${row.pass}`, prepared, 'confederate', { reloadProgress }), pose(figure, `?artPass=${row.pass}`, prepared));
  }
});

for (const direction of [0, 1, 2, 3, 4, 5, 6, 7]) test(`actual Scene direction ${direction} renders one load/ram sequence and cold JSON resumes before draw without changing combat`, () => {
  requireComplete(); const { scene, unit, id } = volleyFixture(direction); scene.speed = 1;
  const timeline = [[7.65, 2.75, 0], [8.7, 1.7, 0], [9.0, 1.4, 1], [9.9, .5, 1]];
  const reload = clips.find(clip => clip.side === 'confederate' && clip.direction === direction && clip.action === 'reload'); assert.ok(reload);
  for (const [time, remaining, phase] of timeline) {
    scene.engine.time = time; unit.reload = remaining;
    const combat = json(scene.engine.checkpoint()), view = draw(scene, id);
    const front = view.visual.output.figures.filter(figure => figure.visible && !figure.fallen && figure.action === 'reload'); assert.ok(front.length > 0);
    for (const figure of front) {
      const soldier = view.soldiers[figure.id]; assert.equal(soldier.clipPhase, phase);
      assert.equal(soldier.sprite.textureKey, reload.key); assert.equal(soldier.sprite.frameName, reload.frames[phase]);
    }
    assert.deepEqual(json(scene.engine.checkpoint()), combat);
    scene.speed = 0; const frozen = json(spriteFacts(view));
    for (let index = 0; index < 3; index++) draw(scene, id);
    assert.deepEqual(json(spriteFacts(view)), frozen);
    const saved = json(scene.checkpoint()), cold = coldScene(saved, id);
    assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation, 'save immediately before first cold draw retains plain presentation');
    assert.deepEqual(json(cold.engine.checkpoint()), combat); draw(cold, id);
    assert.deepEqual(json(spriteFacts(cold.views.get(id))), frozen, 'cold first draw selects the current ordered native reload phase');
    assert.deepEqual(json(cold.engine.checkpoint()), combat); scene.speed = 1;
  }
  assert.equal(CAMPAIGN_SAVE_VERSION, 22); assert.equal(scene.engine.battleRulesVersion, 18);
});

test('actual reduced-motion Scene stays static through reload and cold resume; battle resolution keeps its existing neutral pose', () => {
  const reduced = volleyFixture(3); reduced.scene.reducedMotion = true; reduced.scene.speed = 1;
  for (const [time, remaining] of [[7.65, 2.75], [9.0, 1.4], [9.9, .5]]) {
    reduced.scene.engine.time = time; reduced.unit.reload = remaining;
    const view = draw(reduced.scene, reduced.id), reloaders = view.visual.output.figures.filter(figure => figure.visible && !figure.fallen && figure.action === 'reload');
    assert.ok(reloaders.length > 0); for (const figure of reloaders) assert.equal(view.soldiers[figure.id].clipPhase, 0);
    reduced.scene.speed = 0; const saved = json(reduced.scene.checkpoint()), cold = coldScene(saved, reduced.id);
    cold.reducedMotion = true; draw(cold, reduced.id);
    assert.deepEqual(json(spriteFacts(cold.views.get(reduced.id))), json(spriteFacts(view))); reduced.scene.speed = 1;
  }
  const active = volleyFixture(3); active.scene.speed = 1; active.scene.engine.time = 9; active.unit.reload = 1.4; draw(active.scene, active.id);
  active.scene.engine.beginResolution('defeat'); active.scene.engine.resolutionTime = .3;
  const drawResolution = scene => {
    scene.smoke.clear(); scene.shadows.clear(); scene.dust.clear();
    scene.syncFormation(current(scene, active.id), scene.engine.time + scene.engine.resolutionTime, true, []);
    return scene.views.get(active.id);
  };
  const before = json(active.scene.engine.checkpoint()), resolved = drawResolution(active.scene);
  assert.ok(resolved.visual.output.figures.every(figure => !figure.visible || figure.fallen || figure.action === 'idle'));
  const frozen = json(spriteFacts(resolved)); for (let sample = 0; sample < 3; sample++) drawResolution(active.scene);
  assert.deepEqual(json(spriteFacts(resolved)), frozen); assert.deepEqual(json(active.scene.engine.checkpoint()), before);
  const saved = json(active.scene.checkpoint()), cold = coldScene(saved, active.id);
  assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation); drawResolution(cold);
  assert.deepEqual(json(spriteFacts(cold.views.get(active.id))), frozen); assert.deepEqual(json(cold.engine.checkpoint()), before);
});

test('v17 shot geometry remains latched, optional identity is strict, and malformed or cross-pass records cannot affect combat', () => {
  const { scene, unit, id } = volleyFixture(3), before = json(scene.engine.checkpoint());
  const view = draw(scene, id), shots = json(view.shots); assert.ok(shots.figures.length > 0); assertSmoke(scene, shots);
  const saved = json(scene.checkpoint()); assert.equal(saved.presentation.shots.artPass, 'gettysburg-v17');
  assert.deepEqual(json(combatCheckpointEnvelope(saved)), before);
  const cold = coldScene(saved, id); assert.deepEqual(json(cold.views.get(id).shots), shots);
  assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation); draw(cold, id); assertSmoke(cold, shots);
  const formation = current(scene, id), capacity = view.capacity;
  assert.deepEqual(json(restoreGettysburgInfantryShots(formation, capacity, scene.engine.time, saved.presentation, 'gettysburg-v17')), shots);
  for (const pass of ['gettysburg-v12', 'gettysburg-v13', 'gettysburg-v14', 'gettysburg-v15', 'gettysburg-v16', 'gettysburg-v19']) {
    assert.equal(restoreGettysburgInfantryShots(formation, capacity, scene.engine.time, saved.presentation, pass), null);
  }
  for (const mutate of [saved => { saved.shots.artPass = 'gettysburg-v19'; }, saved => { saved.shots.formations[0].volley.figures[0].x = Infinity; },
    saved => { saved.shots.formations[0].volley.figures.push(saved.shots.formations[0].volley.figures[0]); }, saved => { saved.shots.time += .1; }]) {
    const damaged = structuredClone(saved.presentation); mutate(damaged);
    assert.equal(restoreGettysburgInfantryShots(formation, capacity, scene.engine.time, damaged, 'gettysburg-v17'), null);
  }
  scene.speed = 1; scene.engine.time = 7.8; unit.reload = 2.6; draw(scene, id);
  assert.deepEqual(json(view.shots), shots); assertSmoke(scene, shots);
  assert.equal(scene.smoke.draws.some(mark => mark.shape === 'circle'), false);
  scene.engine.time = 8.25; unit.reload = 2.15; draw(scene, id); assert.equal(view.shots, null); assert.deepEqual(scene.smoke.draws, []);
});

test('selected texture count and nominal RGBA allocation are identical to v16 with no additional source', () => {
  const selectedTextures = gettysburgClipTestTextures(new Map(assets.map(asset => [asset.key, atlases.get(asset.key)])));
  for (const asset of assets) selectedTextures.get(asset.key).source[0].image = readFileSync(root(`public/${asset.image}`));
  const budget = fieldTextureBudget({ list: Object.fromEntries(selectedTextures.loaded) });
  assert.equal(budget.candidateAtlases, 36); assert.equal(budget.candidateClips, 72); assert.equal(budget.sources, 36);
  const pixels = assets.reduce((sum, asset) => { const { w, h } = atlases.get(asset.key).meta.size; return sum + w * h; }, 0);
  assert.equal(budget.pixels, pixels); assert.equal(budget.nominalRgbaBytes, pixels * 4);
  const priorPixels = priorAssets.reduce((sum, asset) => { const { w, h } = atlases.get(asset.key).meta.size; return sum + w * h; }, 0);
  assert.equal(pixels, priorPixels);
});
