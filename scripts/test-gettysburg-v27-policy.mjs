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
import { GETTYSBURG_INFANTRY_REVERSE_LATERAL_CONTACT_CLIPS_IDS } from '../src/battle/gettysburgInfantryReverseLateralContactClips.js';
import { GETTYSBURG_INFANTRY_DIAGONAL_CONTACT_CLIPS_IDS } from '../src/battle/gettysburgInfantryDiagonalContactClips.js';
import { GETTYSBURG_INFANTRY_REVERSE_DIAGONAL_CONTACT_CLIPS_IDS } from '../src/battle/gettysburgInfantryReverseDiagonalContactClips.js';
import { GETTYSBURG_INFANTRY_REVERSE_CARDINAL_CONTACT_CLIPS_IDS } from '../src/battle/gettysburgInfantryReverseCardinalContactClips.js';
import { GETTYSBURG_INFANTRY_CARDINAL_CONTACT_CLIPS_IDS } from '../src/battle/gettysburgInfantryCardinalContactClips.js';
import { GETTYSBURG_INFANTRY_UNION_CONTACT_CLIPS_IDS } from '../src/battle/gettysburgInfantryUnionContactClips.js';
import { GETTYSBURG_INFANTRY_CONTACT_CLIPS_IDS } from '../src/battle/gettysburgInfantryContactClips.js';
import { GETTYSBURG_INFANTRY_UNION_NORTHEAST_ACTION_CLIPS_IDS } from '../src/battle/gettysburgInfantryUnionNortheastActionClips.js';
import { closeCombatDistance, resolveContactCombat } from '../src/battle/closeCombat.js';
import { canCommand } from '../src/battle/battleUsability.js';
import { landmarkField, landmarkDestinationError } from '../src/battle/historicalLandmarks.js';

const search = '?artPass=gettysburg-v27';
const priorSearch = '?artPass=gettysburg-v26';
const root = path => new URL(`../${path}`, import.meta.url);
const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.parse(JSON.stringify(value));
const jsonHash = value => hash(JSON.stringify(value));
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);
const assets = gettysburgInfantryClipAssets('gettysburg', search);
const priorAssets = gettysburgInfantryClipAssets('gettysburg', priorSearch);
// Native v27 files are mandatory in integration tests below. Missing sources
// fail those tests; pure negative/preservation checks still run without them.
const baseline = JSON.parse(readFileSync(root('scripts/fixtures/gettysburg-v27-preservation.json')));
const availableAssets = [...new Map([...baseline.allPriorAssets, ...assets].map(asset => [asset.key, asset])).values()];
const atlases = new Map(availableAssets.filter(asset => existsSync(root(`public/${asset.json}`))).map(asset => [asset.key, JSON.parse(readFileSync(root(`public/${asset.json}`)))]));
const textures = gettysburgClipTestTextures(atlases);
const prepare = (loaded = textures, query = search) => prepareGettysburgInfantryClips(
  gettysburgInfantryClipDefinitions('gettysburg', query, loaded),
  (key, frame) => loaded.exists(key) && loaded.get(key).has(frame));
const clips = prepare();
const formationId = 'v27-union-policy';
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
  const onSnapshot = scene.onBattleSnapshot;
  scene.publishedSnapshots = [];
  scene.onBattleSnapshot = snapshot => { scene.publishedSnapshots.push(json(snapshot)); onSnapshot?.(snapshot); };
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
function coldScene(saved, id, pass = 'gettysburg-v26') {
  windowState.location.search = `?artPass=${pass}`;
  const cold = attachRenderer(new Scene('gettysburg', campaign, 'option_a', null, null, null, null, json(saved)));
  cold.createFormation(current(cold, id)); return cold;
}
function spriteFacts(view) {
  return Array.from(view.soldiers, ({ sprite }) => ({ x: sprite.x, y: sprite.y, texture: sprite.textureKey, frame: sprite.frameName,
    visible: sprite.visible, originX: sprite.originX, originY: sprite.originY, scaleX: sprite.scaleX,
    scaleY: sprite.scaleY, angle: sprite.angle, alpha: sprite.alpha, flipX: sprite.flipX, tint: sprite.tint }));
}
function assertAcceptedFigure(scene, unit, figure) {
  const soldier = scene.views.get(unit.id).soldiers[figure.id], sprite = soldier.sprite;
  const accepted = detailedInfantryPose(unit.id, figure, scene.engine.time + (scene.engine.resolutionTime || 0), scene.reducedMotion, scene.engine.outcome !== 'undecided');
  const rear = unit.side === 'union' && accepted.useLegacyRearAim;
  assert.equal(soldier.clipPhase, undefined); assert.equal(sprite.textureKey, rear ? `${unit.side}-aim-realistic` : `${unit.side}-detailed-${accepted.page}`);
  assert.equal(sprite.frameName, rear ? '3-6' : accepted.frame); assert.equal(sprite.angle, accepted.angle); assert.equal(sprite.flipX, accepted.flip);
  assert.equal(sprite.tint, accepted.tint); assert.equal(sprite.x, figure.x + (accepted.offsetX ?? figure.bodyOffsetX ?? 0));
  assert.equal(sprite.y, figure.y + (accepted.offsetY ?? figure.bodyOffsetY ?? 0));
  assert.deepEqual(sprite.origin, { x: acceptedFrame.pivotX, y: acceptedFrame.pivotY });
  close(sprite.scaleX, 58 * figure.scale / acceptedFrame.customData.bodyHeight * accepted.width);
  close(sprite.scaleY, 58 * figure.scale / acceptedFrame.customData.bodyHeight * accepted.height);
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
    rows.push({ action, frame, flags: options, age, reloadProgress, pose: gettysburgInfantryClipPose('v27-v26-preservation', figure, 999, { scenarioId: 'gettysburg', search: query, side: clip.side, identity: clip.identity, clips: prepared, shootingAge: age, reloadProgress, ...options }) });
  }
  return rows;
}
function unsupportedRows(query, prepared) {
  const rows = [];
  for (const side of ['union', 'confederate']) for (const identity of ['a', 'b'])
  for (let direction = 0; direction < 8; direction++) for (const action of ['melee', 'fall'])
  for (const frame of [0, 1, 2, 3, 4, 7, -1, 8]) for (const options of [{}, { paused: true }, { resolving: true }, { reducedMotion: true }]) {
    const figure = { id: 17, direction, action, frame, fallen: action === 'fall', scale: 1.37 };
    rows.push({ side, identity, direction, action, frame, options, pose: gettysburgInfantryClipPose('v27-contact-preservation', figure, 999, { scenarioId: 'gettysburg', search: query, side, identity, clips: prepared, ...options }) });
  }
  return rows;
}

const nativeDirection = side => side === 'union' ? 7 : 3;
const contract = (action, side = 'union') => {
  const bearing = side === 'union' ? 'ne' : 'sw', family = action === 'melee' ? 'contact' : 'casualty';
  return { key: `${side}-gettysburg-v26-a-${family}-${bearing}`, marker: action === 'melee' ? 'nativeContactSequence' : 'nativeCasualtySequence', sequence: `gettysburg-v26-${side}-a-${bearing}-${family}` };
};
const confederateContract = action => contract(action, 'confederate').key;
const diagonalContract = (action, side) => `${side}-gettysburg-v25-a-${action === 'melee' ? 'contact' : 'casualty'}-${side === 'union' ? 'sw' : 'ne'}`;
const lateralContract = (action, side) => `${side}-gettysburg-v24-a-${action === 'melee' ? 'contact' : 'casualty'}-${side === 'union' ? 'e' : 'w'}`;
const reverseContract = (action, side) => `${side}-gettysburg-v23-a-${action === 'melee' ? 'contact' : 'casualty'}-${side === 'union' ? 'n' : 's'}`;
const primaryContract = (action, side) => `${side}-gettysburg-v22-a-${action === 'melee' ? 'contact' : 'casualty'}-${side === 'union' ? 's' : 'n'}`;
const ewContract = (action, side) => side === 'union' ? `union-gettysburg-v21-a-${action === 'melee' ? 'contact' : 'casualty'}-w`
  : `confederate-gettysburg-v20-a-${action === 'melee' ? 'contact' : 'casualty'}-e`;
function pairFixture({ independentFacing = false, pass = 'gettysburg-v27', axis = 'reverse-diagonal' } = {}) {
  windowState.location.search = `?artPass=${pass}`;
  const scene = attachRenderer(new Scene('gettysburg', campaign, 'option_a'));
  const confederate = scene.engine.state.find(value => value.side === 'confederate' && value.type === 'infantry' && value.active);
  const union = scene.engine.state.find(value => value.side === 'union' && value.type === 'infantry' && value.active);
  for (const value of scene.engine.state) if (![union.id, confederate.id].includes(value.id)) value.active = false;
  for (const value of [confederate, union]) Object.assign(value, { strength: 3000, initialStrength: 3000, morale: 90, cohesion: 90, fatigue: 0,
    status: 'steady', order: 'hold', formationMode: 'line', frontage: 150, ammunition: 0, active: true, arrivalTime: null, reload: 0, lastVolleyAt: null });
  if (axis === 'reverse-diagonal') {
    Object.assign(confederate, { x: 400, y: 400, facing: independentFacing ? 0 : 3 * Math.PI / 4, inMelee: true, meleeWith: union.id });
    Object.assign(union, { x: confederate.x - 100, y: confederate.y + 100, facing: independentFacing ? 0 : 7 * Math.PI / 4, inMelee: true, meleeWith: confederate.id });
    const separation = (closeCombatDistance(confederate, union) - 1) / Math.SQRT2; union.x = confederate.x - separation; union.y = confederate.y + separation;
  } else if (axis === 'diagonal') {
    Object.assign(confederate, { x: 400, y: 600, facing: independentFacing ? 0 : 7 * Math.PI / 4, inMelee: true, meleeWith: union.id });
    Object.assign(union, { x: confederate.x + 100, y: confederate.y - 100, facing: independentFacing ? 0 : 3 * Math.PI / 4, inMelee: true, meleeWith: confederate.id });
    const separation = (closeCombatDistance(confederate, union) - 1) / Math.SQRT2; union.x = confederate.x + separation; union.y = confederate.y - separation;
  } else if (axis === 'lateral') {
    Object.assign(union, { x: 300, y: 600, facing: 0, inMelee: true, meleeWith: confederate.id });
    Object.assign(confederate, { x: union.x + 100, y: union.y, facing: independentFacing ? 0 : Math.PI, inMelee: true, meleeWith: union.id });
    confederate.x = union.x + closeCombatDistance(confederate, union) - 1;
  } else if (axis === 'reverse') {
    Object.assign(confederate, { x: 400, y: 400, facing: independentFacing ? 0 : Math.PI / 2, inMelee: true, meleeWith: union.id });
    Object.assign(union, { x: confederate.x, y: confederate.y + 100, facing: independentFacing ? 0 : 3 * Math.PI / 2, inMelee: true, meleeWith: confederate.id });
    union.y = confederate.y + closeCombatDistance(confederate, union) - 1;
  } else if (axis === 'ns') {
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
function coldPair(saved, ids, pass = 'gettysburg-v27') {
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
    if (unit.side === 'union' && identity === 'b') assertAcceptedFigure(scene, unit, figure);
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
function fallenPair({ pass = 'gettysburg-v27', axis = 'reverse-diagonal' } = {}) {
  const pair = pairFixture({ pass, axis });
  for (const value of [pair.confederate, pair.union]) { value.inMelee = false; value.meleeWith = null; }
  drawPair(pair.scene, pair.ids);
  for (const value of [pair.confederate, pair.union]) value.strength *= .5;
  drawPair(pair.scene, pair.ids);
  return { ...pair, fallenAt: pair.scene.engine.time };
}

const renderedSprites = armies => armies.map(sprites => sprites.map(sprite => sprite.visible ? sprite : { visible: false }));
function publicContactFixture(pass = 'gettysburg-v27', axis = 'reverse-diagonal') {
  windowState.location.search = `?artPass=${pass}`;
  const scene = attachRenderer(new Scene('gettysburg', campaign, 'option_a', null, () => {}));
  const confederate = scene.engine.state.find(unit => unit.id === 'pickett-division'), union = scene.engine.state.find(unit => unit.id === 'gibbon-center');
  const ids = [confederate.id, union.id], initial = { confederateStrength: confederate.strength, unionStrength: union.strength };
  const seenOrdinary = new Map(Object.keys(ordinaryActions).map(action => [action, new Set()]));
  function recordOrdinary() {
    for (const figure of scene.views.get(union.id).visual.output.figures.filter(figure => figure.visible && newGraphic(union, figure))) {
      const identity = gettysburgInfantryIdentity(union.id, figure.id), soldier = scene.views.get(union.id).soldiers[figure.id];
      if (pass === 'gettysburg-v27') assertOrdinaryFigure(scene, union, figure);
      seenOrdinary.get(aliases[figure.action]).add(`${identity}:${soldier.clipPhase ?? 'fallback'}`);
    }
  }
  assert.equal(scene.engine.time, 0); assert.ok(!confederate.inMelee && !union.inMelee);
  for (const id of ids) scene.createFormation(current(scene, id)); scene.setSelected(confederate.id);
  const stages = axis === 'reverse-diagonal' ? [{ x: 220, y: 620 }, { x: 220, y: 170 }, { x: 580, y: 170 }] : axis === 'diagonal' ? [{ x: 300, y: 500 }] : axis === 'lateral' ? [{ x: 650, y: 600 }, { x: 650, y: union.y }] : axis === 'reverse' ? [{ x: 220, y: 620 }, { x: 220, y: 170 }, { x: union.x, y: 170 }]
    : axis === 'ns' ? [{ x: union.x, y: 600 }] : [{ x: 220, y: 620 }, { x: 220, y: union.y }];
  for (const stage of stages) {
    scene.setSpeed(0); scene.previewDestination(stage); assert.deepEqual(json(scene.pendingDestination), stage);
    scene.confirmMove(); assert.equal(scene.pendingDestination, null); assert.equal(confederate.pendingCommand.order, 'move'); scene.setSpeed(1);
    for (let step = 0; step < 1500 && Math.hypot(confederate.x - stage.x, confederate.y - stage.y) >= 3; step++) {
      scene.engine.tick(.05); drawPair(scene, ids); recordOrdinary();
    }
    assert.ok(Math.hypot(confederate.x - stage.x, confederate.y - stage.y) < 3);
  }
  scene.issueOrder('assault', { sectorId: 'left' }); assert.equal(confederate.pendingCommand.order, 'assault');
  let contactAt;
  const seenContact = new Map(ids.map(id => [id, new Set()])), seenFall = new Map(ids.map(id => [id, new Set()]));
  const directions = axis === 'reverse-diagonal' ? { union: 7, confederate: 3 } : axis === 'diagonal' ? { union: 3, confederate: 7 } : axis === 'lateral' ? { union: 0, confederate: 4 } : axis === 'reverse' ? { union: 6, confederate: 2 } : axis === 'ns' ? { union: 2, confederate: 6 } : { union: 4, confederate: 0 };
  for (let step = 0; step < 1500; step++) {
    scene.engine.tick(.05); const combat = json(scene.engine.checkpoint()); drawPair(scene, ids); recordOrdinary(); assert.deepEqual(json(scene.engine.checkpoint()), combat);
    if (!contactAt && confederate.inMelee && confederate.meleeWith === union.id) contactAt = scene.engine.time;
    if (!contactAt) continue;
    for (const unit of [confederate, union]) {
      assert.equal(unit.inMelee, true); assert.equal(unit.meleeWith, unit.side === 'union' ? confederate.id : union.id);
      const view = scene.views.get(unit.id);
      for (const figure of view.visual.output.figures.filter(figure => figure.visible && ['melee', 'fall'].includes(figure.action))) {
        const soldier = view.soldiers[figure.id], sprite = soldier.sprite, identity = unit.side === 'union' ? gettysburgInfantryIdentity(unit.id, figure.id) : 'a';
        const native = scene.infantryClips.find(clip => clip.side === unit.side && clip.identity === identity && clip.action === figure.action && clip.direction === figure.direction);
        if (figure.action === 'melee') assert.equal(figure.direction, directions[unit.side]);
        if (!native) { assertAcceptedFigure(scene, unit, figure); continue; }
        assert.equal(sprite.textureKey, native.key); assert.equal(sprite.frameName, native.frames[soldier.clipPhase]);
        assert.deepEqual(sprite.origin, native.pivots[soldier.clipPhase]); assert.equal(sprite.x, figure.x); assert.equal(sprite.y, figure.y);
        assert.equal(sprite.angle, 0); assert.equal(sprite.flipX, false);
        if (figure.direction === directions[unit.side]) (figure.fallen ? seenFall : seenContact).get(unit.id).add(soldier.clipPhase);
      }
    }
    if (scene.engine.time - contactAt >= 20) break;
  }
  assert.ok(contactAt > 0 && contactAt < 60);
  assert.ok(confederate.strength < initial.confederateStrength && union.strength < initial.unionStrength);
  return { scene, ids, confederate, union, contactAt, seenContact, seenFall, seenOrdinary };
}
function assertPublicCold(pair, pass = 'gettysburg-v27') {
  pair.scene.setSpeed(0); const saved = json(pair.scene.checkpoint()), frozen = pairSprites(pair.scene, pair.ids), cold = coldPair(saved, pair.ids, pass);
  drawPair(pair.scene, pair.ids); assert.deepEqual(pairSprites(pair.scene, pair.ids), frozen);
  drawPair(cold, pair.ids);
  // Expired invisible hot objects retain stale fields. Check all visibility
  // bits and every rendered attribute, including every visible casualty.
  assert.deepEqual(renderedSprites(pairSprites(cold, pair.ids)), renderedSprites(frozen));
  assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation);
  assert.deepEqual(json(cold.engine.checkpoint()), json(pair.scene.engine.checkpoint()));
  return { saved, cold };
}

function inheritedColdResaveCase(pass, axis) {
  const pair = fallenPair({ pass, axis }); pair.scene.engine.time = pair.fallenAt + 2.5; drawPair(pair.scene, pair.ids);
  const combat = json(pair.scene.engine.checkpoint()), frozen = pairSprites(pair.scene, pair.ids), saved = json(pair.scene.checkpoint());
  const cold = coldPair(saved, pair.ids, pass);
  const restoreFlags = scene => pair.ids.map(id => ({ truthy: Boolean(scene.views.get(id).visual.restoreFrame), propertyPresent: Object.hasOwn(scene.views.get(id).visual, 'restoreFrame') }));
  const restoreFrameBefore = restoreFlags(cold);
  assert.deepEqual(restoreFrameBefore, pair.ids.map(() => ({ truthy: true, propertyPresent: true })));
  assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation);
  const restoreFrameAfter = restoreFlags(cold);
  assert.deepEqual(restoreFrameAfter, pair.ids.map(() => ({ truthy: false, propertyPresent: false })));
  drawPair(cold, pair.ids); const after = pairSprites(cold, pair.ids), changes = [], fallen = [];
  for (const [armyIndex, id] of pair.ids.entries()) for (const [figureId, before] of frozen[armyIndex].entries()) {
    const figure = pair.scene.views.get(id).visual.output.figures[figureId], sprite = after[armyIndex][figureId];
    if (figure.fallen) {
      assert.deepEqual(sprite, before);
      fallen.push({ formationId: id, figureId, native: before.texture.includes('-gettysburg-v2'), before, after: sprite });
    } else if (jsonHash(before) !== jsonHash(sprite)) {
      assert.equal(figure.action, 'walk'); assert.equal(figure.fallen, false);
      changes.push({ formationId: id, figureId, action: figure.action, fallen: Boolean(figure.fallen), before, after: sprite });
    }
  }
  assert.ok(changes.length > 0 && fallen.length > 0); assert.deepEqual(json(cold.engine.checkpoint()), combat);
  const ordinary = coldPair(saved, pair.ids, pass); drawPair(ordinary, pair.ids);
  assert.deepEqual(pairSprites(ordinary, pair.ids), frozen);
  assert.deepEqual(json(ordinary.checkpoint()).presentation, saved.presentation);
  assert.deepEqual(json(ordinary.engine.checkpoint()), combat);
  return { pass, axis, time: pair.scene.engine.time, casualtyAge: 2.5, formationIds: pair.ids,
    immediatePreFirstDrawResave: { restoreFrameBefore, restoreFrameAfter, presentationExact: true, combatExact: true,
      changedSpriteCount: changes.length, changedActions: [...new Set(changes.map(change => change.action))], changes,
      fallenCount: fallen.length, nativeFallenCount: fallen.filter(body => body.native).length, fallbackFallenCount: fallen.filter(body => !body.native).length, fallenExact: true, fallen },
    publicFirstColdDrawThenResave: { allSpritesExact: true, presentationExact: true, combatExact: true } };
}

const ordinaryActions = Object.freeze({ ready: 1, fire: 1, reload: 2 });
const aliases = Object.freeze({ idle: 'ready', ready: 'ready', fire: 'fire', reload: 'reload' });
const axes = ['reverse-diagonal', 'diagonal', 'lateral', 'reverse', 'ns', 'ew'];
const northeastKey = identity => `union-gettysburg-v27-${identity}-actions-ne`;
const isNew = clip => clip.key.startsWith('union-gettysburg-v27-');
const address = clip => JSON.stringify([clip.side, clip.identity, clip.direction, clip.action]);
const ordinaryDefinition = (identity, action) => ({ side: 'union', identity, direction: 7, action,
  key: northeastKey(identity, action), nativeUnionNortheastSequence: `gettysburg-v27-union-${identity}-ne`,
  frames: Array.from({ length: ordinaryActions[action] }, (_, phase) => `${identity}-${action}-7-${phase}`),
  sourceHash: 'a'.repeat(64), referenceHeight: 350,
  pivots: Array.from({ length: ordinaryActions[action] }, () => ({ x: .5, y: .9 })),
  ...(action === 'fire' ? { muzzles: [{ x: .8, y: .3 }] } : {}), approval: { reviewed: true, rejected: false } });
const newGraphic = (unit, figure) => unit.side === 'union' && figure.direction === 7 && !figure.fallen && Object.hasOwn(aliases, figure.action);

function requireComplete() {
  assert.equal(assets.length, 62); assert.equal(clips.length, 102); assert.equal(initialize(textures).length, 102);
  assert.equal(new Set(clips.map(address)).size, 102);
  const native = clips.filter(isNew); assert.equal(native.length, 6);
  for (const identity of ['a', 'b']) {
    const group = 'actions';
    const key = northeastKey(identity, group), asset = assets.find(value => value.key === key), atlas = atlases.get(key);
    assert.ok(asset && atlas, `Mandatory ${identity} ${group} source absent`);
    const png = readFileSync(root(`public/${asset.image}`)), candidate = readFileSync(root(`docs/art-pass/candidates/gettysburg-v27/union-${identity}-${group}-ne-candidate.png`));
    assert.deepEqual(png, candidate); assert.equal(hash(png), atlas.meta.sha256);
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(png.readUInt32BE(16), atlas.meta.size.w); assert.equal(png.readUInt32BE(20), atlas.meta.size.h);
    assert.equal(atlas.meta.size.w, atlas.meta.size.h); const cell = atlas.meta.size.w / 2; assert.ok(Number.isInteger(cell));
    const actionNames = ['ready', 'fire', 'reload'];
    assert.equal(atlas.meta.clips.length, actionNames.length);
    const frameNames = actionNames.flatMap(action => Array.from({ length: ordinaryActions[action] }, (_, phase) => `${identity}-${action}-7-${phase}`));
    assert.deepEqual(Object.keys(atlas.frames), frameNames); assert.equal(frameNames.length, 4);
    for (const [index, name] of frameNames.entries()) {
      const frame = atlas.frames[name]; assert.deepEqual(frame.frame, { x: index % 2 * cell, y: Math.floor(index / 2) * cell, w: cell, h: cell });
      assert.equal(frame.rotated, false); assert.equal(frame.trimmed, false);
      assert.deepEqual(frame.sourceSize, { w: cell, h: cell }); assert.deepEqual(frame.spriteSourceSize, { x: 0, y: 0, w: cell, h: cell });
    }
    for (const action of actionNames) {
      const clip = native.find(value => value.identity === identity && value.action === action);
      assert.deepEqual(validateGettysburgInfantryClip(clip), []); assert.equal(clip.key, key); assert.equal(clip.side, 'union'); assert.equal(clip.direction, 7);
      assert.equal(clip.sourceHash, hash(png)); assert.equal(clip.nativeUnionNortheastSequence, `gettysburg-v27-union-${identity}-ne`);
      assert.equal(clip.nativeReloadSequence, undefined); assert.equal(clip.frames.length, ordinaryActions[action]);
      for (const [phase, name] of clip.frames.entries()) assert.deepEqual(clip.pivots[phase], atlas.frames[name].pivot);
      if (action === 'fire') assert.equal(clip.muzzles.length, 1); else assert.equal(clip.muzzles, undefined);
    }
    const reference = native.find(value => value.identity === identity && value.action === 'ready').referenceHeight;
    for (const clip of native.filter(value => value.identity === identity)) assert.equal(clip.referenceHeight, reference);
  }
}

test('v27 adds only two explicit stationary Union NE sources and preserves all old registries, capabilities and shot18 identity', () => {
  assert.deepEqual(GETTYSBURG_INFANTRY_CLIPS_IDS, baseline.legacyIds);
  for (const [currentIds, savedIds] of [[GETTYSBURG_INFANTRY_CONTACT_CLIPS_IDS, baseline.contactIds], [GETTYSBURG_INFANTRY_UNION_CONTACT_CLIPS_IDS, baseline.unionContactIds],
    [GETTYSBURG_INFANTRY_CARDINAL_CONTACT_CLIPS_IDS, baseline.cardinalContactIds], [GETTYSBURG_INFANTRY_REVERSE_CARDINAL_CONTACT_CLIPS_IDS, baseline.reverseCardinalContactIds],
    [GETTYSBURG_INFANTRY_REVERSE_LATERAL_CONTACT_CLIPS_IDS, baseline.reverseLateralContactIds], [GETTYSBURG_INFANTRY_DIAGONAL_CONTACT_CLIPS_IDS, baseline.diagonalContactIds],
    [GETTYSBURG_INFANTRY_REVERSE_DIAGONAL_CONTACT_CLIPS_IDS, baseline.reverseDiagonalContactIds]]) assert.deepEqual(currentIds, savedIds);
  assert.deepEqual(GETTYSBURG_INFANTRY_UNION_NORTHEAST_ACTION_CLIPS_IDS, ['gettysburg-v27']);
  const policy = gettysburgInfantryClipPolicy('gettysburg', search), prior = gettysburgInfantryClipPolicy('gettysburg', priorSearch);
  assert.ok(Object.isFrozen(policy) && Object.isFrozen(policy.atlases));
  assert.deepEqual({ ...policy, atlases: policy.atlases.slice(0, 60), nativeUnionNortheastActions: undefined }, { ...prior, nativeUnionNortheastActions: undefined });
  assert.deepEqual(assets.slice(0, 60), priorAssets); assert.equal(assets.length, 62);
  assert.deepEqual(assets.slice(60).map(asset => asset.key), ['union-gettysburg-v27-a-actions-ne', 'union-gettysburg-v27-b-actions-ne']);
  assert.equal(policy.nativeUnionNortheastActions, true); assert.equal(policy.stableUnionIdentity, true);
  assert.equal(policy.monotonicReload, true); assert.equal(policy.nativeReloadSequence, true); assert.equal(policy.shotPresentationId, 'gettysburg-v18');
  const disabled = { exists() { assert.fail('disabled lookup'); }, get() { assert.fail('disabled metadata'); } };
  for (const query of ['', '?artPass=gettysburg-v19', '?artPass=gettysburg-v27-other', '?other=gettysburg-v27', '?artPass=constructor', '?artPass=__proto__']) {
    assert.equal(gettysburgInfantryClipsEnabled('gettysburg', query), false); assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', query), []);
    assert.deepEqual(gettysburgInfantryClipDefinitions('gettysburg', query, disabled), []);
  }
  for (const scenario of ['gettysburg_jackson', 'gettysburg_meade', 'first_manassas', 'shiloh', null]) assert.deepEqual(initialize(disabled, search, scenario), []);
});

test('23 authentic old policies, 1645056 poses, 47104 contact outputs and 64 source pairs remain exact', () => {
  assert.equal(baseline.oldPasses.length, 23); assert.equal(baseline.allPriorAssets.length, 64);
  assert.equal(baseline.oldPasses.reduce((sum, value) => sum + value.poseRows, 0), 1645056);
  assert.equal(baseline.oldPasses.reduce((sum, value) => sum + value.actionRows, 0), 47104);
  assert.deepEqual(baseline.allPriorAssets.map(asset => ({ key: asset.key, image: hash(readFileSync(root(`public/${asset.image}`))), json: hash(readFileSync(root(`public/${asset.json}`))) })), baseline.allPriorHashes);
  for (const pass of baseline.oldPasses) {
    const query = `?artPass=${pass.pass}`, prepared = prepare(textures, query), rows = prepared.flatMap(clip => poseRows(clip, query, prepared)), actions = unsupportedRows(query, prepared);
    assert.deepEqual(gettysburgInfantryClipPolicy('gettysburg', query), pass.policy); assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', query), pass.assets);
    assert.equal(prepared.length, pass.clips); assert.equal(jsonHash(prepared), pass.clipHash);
    assert.equal(rows.length, pass.poseRows); assert.equal(jsonHash(rows), pass.poseHash, pass.pass);
    assert.equal(actions.length, pass.actionRows); assert.equal(jsonHash(actions), pass.actionHash, pass.pass);
  }
});

test('all 22 protected runtime/readers/audio modules, 11 old fixtures and 159 prior contact files retain exact bytes', () => {
  assert.equal(baseline.protectedModules.length, 22); assert.equal(baseline.protectedFixtures.length, 11); assert.equal(baseline.protectedContactFiles.length, 159);
  for (const record of [...baseline.protectedModules, ...baseline.protectedFixtures, ...baseline.protectedContactFiles]) assertGettysburgV29HistoricalFile(record, root);
  const presets = getGettysburgMotionPlaybackPresets(GETTYSBURG_MOTION_STUDIES);
  assert.equal(jsonHash(GETTYSBURG_MOTION_STUDIES), baseline.studyHash); assert.equal(jsonHash(presets), baseline.presetHash);
  assert.equal(getGettysburgMotionPlaybackInitialPreset(presets).id, baseline.initialPreset);
  assert.deepEqual(createGettysburgMotionPlaybackState(GETTYSBURG_MOTION_STUDIES), baseline.playbackState); assert.equal(CAMPAIGN_SAVE_VERSION, 22);
});

for (const identity of ['a', 'b']) for (const action of Object.keys(ordinaryActions)) test(`Union NE ${identity} ${action} strict metadata rejects foreign markers/addresses while retaining shared validation`, () => {
  const native = ordinaryDefinition(identity, action); assert.deepEqual(validateGettysburgInfantryClip(native), []);
  for (const mutate of [
    clip => { clip.key = 'union-gettysburg-v8-a-actions-sw'; }, clip => { clip.side = 'confederate'; }, clip => { clip.direction = 6; },
    clip => { clip.identity = identity === 'a' ? 'b' : 'a'; }, clip => { clip.identity = [identity]; }, clip => { clip.action = [action]; },
    clip => { delete clip.nativeUnionNortheastSequence; }, clip => { clip.nativeUnionNortheastSequence = 'gettysburg-v27-union-c-ne'; },
    clip => { clip.nativeReloadSequence = 'gettysburg-v18-confederate-a-e'; }, clip => { clip.nativeContactSequence = 'gettysburg-v26-union-a-ne-contact'; },
    clip => { clip.nativeCasualtySequence = 'borrowed'; }, clip => { clip.frames[0] = `${identity}-${action}-6-0`; },
    clip => { if (clip.frames.length > 1) clip.frames.reverse(); else clip.frames[0] = 'wrong'; }, clip => { delete clip.frames[0]; },
    clip => { clip.frames.push('extra'); clip.pivots.push({ x: .5, y: .9 }); }, clip => { clip.sourceHash = 'bad'; },
    clip => { clip.referenceHeight = 0; }, clip => { clip.pivots[0].x = Infinity; }, clip => { clip.pivots[0].y = -1; },
    clip => { clip.approval.reviewed = 1; }, clip => { clip.approval.rejected = true; },
    clip => { if (action === 'fire') delete clip.muzzles; else clip.muzzles = [{ x: .8, y: .3 }]; },
    clip => { if (action === 'fire') clip.muzzles[0].x = NaN; else clip.pivots.pop(); },
  ]) {
    const damaged = json(native); mutate(damaged); assert.ok(validateGettysburgInfantryClip(damaged).length > 0);
    assert.deepEqual(prepareGettysburgInfantryClips([damaged], () => true), []);
  }
  const borrowed = json(prepare(textures, priorSearch).find(clip => clip.action === 'march')); borrowed.nativeUnionNortheastSequence = native.nativeUnionNortheastSequence;
  assert.ok(validateGettysburgInfantryClip(borrowed).length > 0);
  const generic = json(native); generic.key = `confederate-gettysburg-v27-${identity}-actions-ne`; delete generic.nativeUnionNortheastSequence;
  assert.ok(validateGettysburgInfantryClip(generic).length > 0);
});

test('shared NE aliases, stable A/B, ordered 0.5 reload boundary, reduced/paused/resolving/frozen phases and old-policy guard remain exact', () => {
  const prepared = prepareGettysburgInfantryClips(['a', 'b'].flatMap(identity => Object.keys(ordinaryActions).map(action => ordinaryDefinition(identity, action))), () => true);
  assert.equal(prepared.length, 6);
  for (const identity of ['a', 'b']) for (const key of [`union-gettysburg-v27-${identity}-march-ne`, northeastKey(identity)]) {
    const march = { ...ordinaryDefinition(identity, 'ready'), key, action: 'march', frames: Array.from({ length: 4 }, (_, phase) => `${identity}-march-7-${phase}`), pivots: Array.from({ length: 4 }, () => ({ x: .5, y: .9 })) };
    assert.ok(validateGettysburgInfantryClip(march).length); assert.deepEqual(prepareGettysburgInfantryClips([march], () => true), []);
  }
  for (const identity of ['a', 'b']) for (const action of ['walk', 'route']) for (const frame of [-1, 0, 1, 2, 3, 4, 99]) {
    const figure = { id: idFor(identity), action, direction: 7, frame };
    for (const options of [{}, { paused: true, frozenPhase: 3 }, { resolving: true }, { reducedMotion: true }]) {
      assert.equal(pose(figure, search, prepared, 'union', options), null);
      assert.deepEqual(pose(figure, search, clips, 'union', options), pose(figure, priorSearch, prepare(textures, priorSearch), 'union', options));
    }
  }
  for (const identity of ['a', 'b']) for (const alias of Object.keys(aliases)) {
    const action = aliases[alias], id = idFor(identity), figure = { id, action: alias, direction: 7, frame: 3, scale: 1.37 };
    const selected = pose(figure, search, prepared); assert.equal(selected.identity, identity); assert.equal(selected.page, action); assert.equal(selected.key, northeastKey(identity, action));
    for (const old of baseline.oldPasses) assert.equal(pose(figure, `?artPass=${old.pass}`, prepared), null, 'old policy cannot borrow new prepared clips');
    assert.equal(pose({ ...figure, fallen: true }, search, prepared), null); assert.equal(pose({ ...figure, direction: 6 }, search, prepared), null);
    const fixed = action === 'march' ? gettysburgInfantryContactPhase(formationId, id) : 0;
    assert.equal(pose(figure, search, prepared, 'union', { reducedMotion: true, reloadProgress: 1 }).phase, fixed);
    for (const flag of ['paused', 'resolving']) for (const phase of Array.from({ length: ordinaryActions[action] }, (_, index) => index)) {
      const frozen = pose(figure, search, prepared, 'union', { [flag]: true, frozenPhase: phase, frozenAction: alias, reloadProgress: 1 }); assert.equal(frozen.phase, phase);
    }
    if (action === 'march') for (const frame of [-9, -1, 0, 1, 2, 3, 4, 999]) assert.equal(pose({ ...figure, frame }, search, prepared).phase, ((frame + fixed) % 4 + 4) % 4);
    if (action === 'reload') for (const [progress, phase] of [[-1, 0], [0, 0], [.499999, 0], [.5, 1], [.99999, 1], [1, 1], [2, 1]]) {
      assert.equal(pose(figure, search, prepared, 'union', { reloadProgress: progress }).phase, phase);
      assert.equal(pose(figure, search, prepared, 'union', { paused: true, reloadProgress: progress, frozenPhase: 0, frozenAction: 'fire' }).phase, phase);
    }
    assert.equal(pose(figure, search, [...prepared, prepared.find(clip => clip.identity === identity && clip.action === action)]), null);
  }
});

test('two authentic whole stationary NE sheets supply eight full cells, six exact clips and independent common references for A and B', requireComplete);

test('v27 retains all 96 v26 definitions, pose outputs, v18 four-stage Con east reload, Con north fire and Union north fallback', () => {
  requireComplete(); const prior = prepare(textures, priorSearch); assert.deepEqual(clips.filter(clip => !isNew(clip)), prior);
  for (const clip of prior) for (const frame of [0, 1, 3, 7]) for (const progress of [0, .49, .5, 1]) {
    const figure = { id: 0, direction: clip.direction, action: clip.action === 'march' ? 'walk' : clip.action, fallen: clip.action === 'fall', frame };
    const options = { side: clip.side, identity: clip.identity, scenarioId: 'gettysburg', reloadProgress: progress, shootingAge: .08 };
    assert.deepEqual(gettysburgInfantryClipPose('retained-v26', figure, 77, { ...options, search, clips }), gettysburgInfantryClipPose('retained-v26', figure, 77, { ...options, search: priorSearch, clips: prior }));
  }
  const east = clips.find(clip => clip.key === 'confederate-gettysburg-v18-a-actions-e' && clip.action === 'reload'); assert.equal(east.frames.length, 4);
  assert.equal(clips.filter(clip => clip.action === 'reload' && clip.frames.length === 4).length, 1);
  for (const side of ['confederate', 'union']) {
    const figure = { id: 0, direction: 6, action: 'fire', frame: 0 }, options = { scenarioId: 'gettysburg', side, identity: 'a' };
    const before = gettysburgInfantryClipPose('north-regression', figure, 7, { ...options, search: priorSearch, clips: prior });
    assert.deepEqual(gettysburgInfantryClipPose('north-regression', figure, 7, { ...options, search, clips }), before);
    if (side === 'confederate') assert.equal(before.key, 'confederate-gettysburg-v7-a-actions-n'); else assert.equal(before, null);
  }
});

for (const identity of ['a', 'b']) for (const action of Object.keys(ordinaryActions)) test(`Union NE ${identity} ${action} missing any native phase withholds the complete action and preserves siblings/identity`, () => {
  requireComplete(); const native = clips.find(clip => isNew(clip) && clip.identity === identity && clip.action === action), id = idFor(identity), alias = action === 'march' ? 'walk' : action;
  for (const name of native.frames) {
    const damaged = gettysburgClipTestTextures(atlases); damaged.get(native.key).frames.delete(name); const prepared = initialize(damaged);
    assert.equal(prepared.length, 101);
    for (const frame of [0, 1, 2, 3, 999]) assert.equal(pose({ id, action: alias, direction: 7, frame }, search, prepared), null);
    for (const sibling of Object.keys(ordinaryActions).filter(value => value !== action)) assert.ok(pose({ id, action: sibling === 'march' ? 'walk' : sibling, direction: 7, frame: 0 }, search, prepared));
    assert.ok(pose({ id: idFor(identity === 'a' ? 'b' : 'a'), action: alias, direction: 7, frame: 0 }, search, prepared));
  }
  assert.deepEqual(prepareGettysburgInfantryClips([native, native], () => true), []);
});

function ordinaryFixture(pass = 'gettysburg-v27', action = 'idle', direction = 7) {
  const pair = pairFixture({ pass });
  for (const unit of [pair.confederate, pair.union]) { unit.inMelee = false; unit.meleeWith = null; }
  Object.assign(pair.union, { facing: direction * Math.PI / 4, engagedWith: action === 'reload' || action === 'fire' ? pair.confederate.id : null,
    lastVolleyAt: action === 'reload' || action === 'fire' ? 7 : null, reload: action === 'reload' ? 1.4 : action === 'fire' ? 10 : 0 });
  if (action === 'reload') pair.scene.engine.time = 9;
  drawPair(pair.scene, pair.ids); return pair;
}
function assertOrdinaryFigure(scene, unit, figure) {
  assert.ok(newGraphic(unit, figure)); const soldier = scene.views.get(unit.id).soldiers[figure.id], sprite = soldier.sprite;
  const presented = current(scene, unit.id), battleTime = scene.engine.time + (scene.engine.resolutionTime || 0);
  const native = gettysburgInfantryClipPose(unit.id, figure, battleTime, {
    scenarioId: 'gettysburg', search, clips: scene.infantryClips, side: 'union', identity: 'a', versionedIdentity: true,
    reducedMotion: scene.reducedMotion, paused: scene.speed === 0, resolving: scene.engine.outcome !== 'undecided',
    frozenPhase: soldier.clipPhase, frozenAction: soldier.clipAction,
    shootingAge: gettysburgInfantryShootingAge(presented, figure.id, battleTime), reloadProgress: gettysburgInfantryReloadProgress(presented, scene.engine.time),
  });
  assert.ok(native); assert.equal(native.identity, gettysburgInfantryIdentity(unit.id, figure.id));
  assert.equal(sprite.textureKey, native.key); assert.equal(sprite.frameName, native.frame); assert.equal(soldier.clipPhase, native.phase);
  assert.deepEqual(sprite.origin, native.pivot); assert.equal(sprite.x, figure.x + native.offsetX); assert.equal(sprite.y, figure.y + native.offsetY);
  close(sprite.scaleX, 58 * figure.scale / native.referenceHeight * native.width); close(sprite.scaleY, 58 * figure.scale / native.referenceHeight * native.height);
  assert.equal(sprite.tint, native.tint); assert.equal(sprite.angle, 0); assert.equal(sprite.flipX, false); return native;
}
function assertOrdinaryView(pair, action) {
  const affected = pair.scene.views.get(pair.union.id).visual.output.figures.filter(figure => figure.visible && newGraphic(pair.union, figure)
    && (action === undefined || aliases[figure.action] === action)); assert.ok(affected.length > 0);
  const identities = new Set(); for (const figure of affected) identities.add(assertOrdinaryFigure(pair.scene, pair.union, figure).identity);
  assert.deepEqual([...identities].sort(), ['a', 'b']); return affected;
}
function plainPresentation(pair) { const saved = json(pair.scene.checkpoint()); delete saved.presentation.shots; return saved.presentation; }
function assertComparedPair(old, next) {
  assert.deepEqual(json(next.scene.engine.checkpoint()), json(old.scene.engine.checkpoint()));
  assert.deepEqual(plainPresentation(next), plainPresentation(old));
  for (const id of next.ids) {
    const unit = current(next.scene, id), before = old.scene.views.get(id), after = next.scene.views.get(id);
    assert.deepEqual(json(after.visual.output), json(before.visual.output));
    const previous = spriteFacts(before), sprites = spriteFacts(after);
    for (const figure of after.visual.output.figures) {
      assert.equal(sprites[figure.id].visible, previous[figure.id].visible);
      if (!figure.visible) continue;
      if (newGraphic(unit, figure)) assertOrdinaryFigure(next.scene, unit, figure);
      else assert.deepEqual(sprites[figure.id], previous[figure.id]);
    }
  }
}

test('actual Scene NE ready, fire and ordered reload use stable A and B with exact source pivots, references and measured muzzle smoke', () => {
  requireComplete();
  for (const action of ['ready', 'fire', 'reload']) {
    const pair = ordinaryFixture('gettysburg-v27', action); assertOrdinaryView(pair, action);
    if (action !== 'fire') continue;
    const view = pair.scene.views.get(pair.union.id), shots = view.shots; assert.ok(shots.figures.length > 0);
    for (const shot of shots.figures) {
      const figure = view.visual.output.figures[shot.id], identity = gettysburgInfantryIdentity(pair.union.id, shot.id), native = clips.find(clip => clip.key === northeastKey(identity, 'fire') && clip.action === 'fire');
      const frame = renderingTextures.get(native.key).get(native.frames[0]), scale = 58 * figure.scale / native.referenceHeight * (.95 + deterministicUnitValue(pair.union.id, shot.id, 215) * .10);
      assert.equal(shot.native, true); assert.equal(shot.bearing, 7 * Math.PI / 4);
      close(shot.x, figure.x + (native.muzzles[0].x - native.pivots[0].x) * frame.realWidth * scale);
      close(shot.y, figure.y + (native.muzzles[0].y - native.pivots[0].y) * frame.realHeight * scale);
    }
    assertSmoke(pair.scene, shots);
    for (const [time, reload, phase] of [[7.65, 2.75, 0], [8.7, 1.7, 0], [9, 1.4, 1], [9.9, .5, 1]]) {
      pair.scene.engine.time = time; pair.union.reload = reload; drawPair(pair.scene, pair.ids);
      for (const figure of assertOrdinaryView(pair, 'reload')) assert.equal(pair.scene.views.get(pair.union.id).soldiers[figure.id].clipPhase, phase);
      if (time - shots.at < 1.25) assert.deepEqual(json(view.shots), json(shots)); else assert.equal(view.shots, null);
    }
  }
});

test('actual Scene NE travel, all accepted march phases and march cold/pause/reduced output remain byte equal to v26 for stable A and B', () => {
  requireComplete(); const prior = ordinaryFixture('gettysburg-v26'), next = ordinaryFixture(), seen = new Map(['a', 'b'].map(identity => [identity, new Set()]));
  for (let step = 0; step < 48; step++) {
    for (const pair of [prior, next]) { pair.union.x += 1; pair.union.y -= 1; pair.scene.engine.time += .08; drawPair(pair.scene, pair.ids); }
    assertComparedPair(prior, next);
    for (const figure of next.scene.views.get(next.union.id).visual.output.figures.filter(value => value.visible && value.action === 'walk')) {
      assertAcceptedFigure(next.scene, next.union, figure); seen.get(gettysburgInfantryIdentity(next.union.id, figure.id)).add(figure.frame);
      assert.equal(gettysburgInfantryClipPose(next.union.id, figure, next.scene.engine.time, { scenarioId: 'gettysburg', search, clips, side: 'union', versionedIdentity: true }), null);
    }
  }
  for (const phases of seen.values()) assert.deepEqual([...phases].sort(), [0, 1, 2, 3]);
  for (const pair of [prior, next]) {
    pair.scene.setSpeed(0); const frozen = pairSprites(pair.scene, pair.ids), saved = json(pair.scene.checkpoint()), cold = coldPair(saved, pair.ids, pair === prior ? 'gettysburg-v26' : 'gettysburg-v27');
    drawPair(pair.scene, pair.ids); assert.deepEqual(pairSprites(pair.scene, pair.ids), frozen); drawPair(cold, pair.ids); assert.deepEqual(pairSprites(cold, pair.ids), frozen);
    assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation); pair.scene.reducedMotion = true; drawPair(pair.scene, pair.ids);
  }
  assertComparedPair(prior, next);
  for (const pair of [prior, next]) { pair.scene.setSpeed(1); pair.scene.reducedMotion = false; }
  for (let step = 0; step < 120; step++) for (const pair of [prior, next]) { pair.scene.engine.time += .1; drawPair(pair.scene, pair.ids); }
  assertComparedPair(prior, next); assertOrdinaryView(next, 'ready');
});

test('actual Scene NE ordinary phases pause, cold first draw/resave, reduced motion and resolution through the inherited common renderer', () => {
  requireComplete();
  for (const action of ['ready', 'fire', 'reload']) {
    const pair = ordinaryFixture('gettysburg-v27', action);
    assertOrdinaryView(pair, action); pair.scene.setSpeed(0); const frozen = pairSprites(pair.scene, pair.ids), saved = json(pair.scene.checkpoint());
    assert.equal(pair.scene.publishedSnapshots.at(-1).time, pair.scene.engine.time);
    drawPair(pair.scene, pair.ids); assert.deepEqual(pairSprites(pair.scene, pair.ids), frozen);
    const cold = coldPair(saved, pair.ids); drawPair(cold, pair.ids); assert.deepEqual(pairSprites(cold, pair.ids), frozen);
    assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation); assert.deepEqual(json(cold.engine.checkpoint()), json(pair.scene.engine.checkpoint()));
    pair.scene.reducedMotion = true; drawPair(pair.scene, pair.ids);
    for (const figure of assertOrdinaryView(pair, action)) {
      const expected = 0;
      assert.equal(pair.scene.views.get(pair.union.id).soldiers[figure.id].clipPhase, expected);
    }
    pair.scene.reducedMotion = false; const combat = json(pair.scene.engine.checkpoint()); drawPair(pair.scene, pair.ids, true);
    assert.deepEqual(json(pair.scene.engine.checkpoint()), combat);
    for (const figure of pair.scene.views.get(pair.union.id).visual.output.figures.filter(figure => figure.visible && newGraphic(pair.union, figure))) assertOrdinaryFigure(pair.scene, pair.union, figure);
  }
});

test('actual Scene missing NE phases use whole-action accepted fallback for A or B while preserving native siblings and the other identity', () => {
  requireComplete();
  for (const identity of ['a', 'b']) for (const action of Object.keys(ordinaryActions)) {
    const pair = ordinaryFixture('gettysburg-v27', action);
    pair.scene.infantryClips = pair.scene.infantryClips.filter(clip => !(isNew(clip) && clip.identity === identity && clip.action === action));
    drawPair(pair.scene, pair.ids); const affected = pair.scene.views.get(pair.union.id).visual.output.figures.filter(figure => figure.visible && aliases[figure.action] === action);
    assert.ok(affected.some(figure => gettysburgInfantryIdentity(pair.union.id, figure.id) === identity));
    assert.ok(affected.some(figure => gettysburgInfantryIdentity(pair.union.id, figure.id) !== identity));
    for (const figure of affected) if (gettysburgInfantryIdentity(pair.union.id, figure.id) === identity) assertAcceptedFigure(pair.scene, pair.union, figure); else assertOrdinaryFigure(pair.scene, pair.union, figure);
  }
});

test('v26 cached NE fallback volleys cold-load unchanged under v27 until a fresh volley measures new native A/B muzzle positions', () => {
  requireComplete(); const prior = ordinaryFixture('gettysburg-v26', 'fire'), native = ordinaryFixture('gettysburg-v27', 'fire');
  assertComparedPair(prior, native); const oldShots = json(prior.scene.views.get(prior.union.id).shots), nextShots = json(native.scene.views.get(native.union.id).shots);
  assert.ok(oldShots.figures.every(shot => !shot.native)); assert.ok(nextShots.figures.every(shot => shot.native));
  assert.deepEqual(oldShots.figures.map(({ id, scale }) => ({ id, scale })), nextShots.figures.map(({ id, scale }) => ({ id, scale })));
  assert.equal(oldShots.at, nextShots.at); assert.equal(oldShots.capturedAt, nextShots.capturedAt); assert.notDeepEqual(oldShots, nextShots);
  prior.scene.setSpeed(0); const saved = json(prior.scene.checkpoint()); assert.equal(saved.presentation.shots.artPass, 'gettysburg-v18');
  const cold = coldPair(saved, prior.ids); drawPair(cold, prior.ids); assert.deepEqual(json(cold.views.get(prior.union.id).shots), oldShots);
  assert.deepEqual(json(cold.engine.checkpoint()), json(prior.scene.engine.checkpoint())); assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation);
  cold.engine.time = 7.4; const unit = cold.engine.state.find(value => value.id === prior.union.id); unit.lastVolleyAt = 7.35; drawPair(cold, prior.ids);
  assert.ok(cold.views.get(prior.union.id).shots.figures.every(shot => shot.native)); assert.equal(cold.views.get(prior.union.id).shots.at, 7.35);
});

for (const axis of axes) test(`genuine public ${axis} Move/Assault contact, resolver losses, all contact/fall phases and paused cold saves retain v26 output under v27`, () => {
  requireComplete(); const prior = publicContactFixture('gettysburg-v26', axis), next = publicContactFixture('gettysburg-v27', axis);
  assert.equal(next.contactAt, prior.contactAt); assertComparedPair(prior, next);
  for (const id of next.ids) { assert.deepEqual([...next.seenContact.get(id)].sort(), [0, 1, 2, 3]); assert.deepEqual([...next.seenFall.get(id)].sort(), [0, 1, 2, 3]); }
  if (axis === 'reverse-diagonal') for (const [action, count] of Object.entries(ordinaryActions)) for (const identity of ['a', 'b']) for (let phase = 0; phase < count; phase++) assert.ok(next.seenOrdinary.get(action).has(`${identity}:${phase}`));
  assertPublicCold(prior, 'gettysburg-v26'); assertPublicCold(next);
});

test('all six retained axes preserve every native and fallback casualty phase, sole anchor, age fade, reduced/resolution output and ordinary first cold draw/resave', () => {
  requireComplete();
  for (const axis of axes) {
    const prior = fallenPair({ pass: 'gettysburg-v26', axis }), next = fallenPair({ axis });
    for (const age of [0, .18, .36, .55, 2.5]) {
      for (const pair of [prior, next]) { pair.scene.engine.time = pair.fallenAt + age; drawPair(pair.scene, pair.ids); }
      assertComparedPair(prior, next);
      const count = { native: 0, fallback: 0 };
      for (const id of next.ids) for (const figure of next.scene.views.get(id).visual.output.figures.filter(value => value.fallen)) {
        const native = next.scene.views.get(id).soldiers[figure.id].sprite.textureKey.includes('-gettysburg-v2'); count[native ? 'native' : 'fallback']++;
        if (native) assert.equal(next.scene.views.get(id).soldiers[figure.id].clipPhase, Math.min(3, Math.floor(age * 6)));
      }
      assert.deepEqual(count, { native: 24, fallback: 8 });
      for (const pair of [prior, next]) {
        pair.scene.setSpeed(0); const saved = json(pair.scene.checkpoint()), cold = coldPair(saved, pair.ids, pair === prior ? 'gettysburg-v26' : 'gettysburg-v27'); drawPair(cold, pair.ids);
        assert.deepEqual(pairSprites(cold, pair.ids), pairSprites(pair.scene, pair.ids)); assert.deepEqual(json(cold.checkpoint()).presentation, saved.presentation); pair.scene.setSpeed(1);
      }
    }
    for (const pair of [prior, next]) pair.scene.reducedMotion = true; drawPair(prior.scene, prior.ids, true); drawPair(next.scene, next.ids, true); assertComparedPair(prior, next);
  }
});

test('inherited v26/v27 immediate-before-first-draw resave WALK edge is separate from exact 32 fallen bodies and ordinary first-draw/resave', () => {
  requireComplete();
  for (const axis of axes) {
    const prior = inheritedColdResaveCase('gettysburg-v26', axis), next = inheritedColdResaveCase('gettysburg-v27', axis);
    for (const diagnostic of [prior, next]) {
      assert.equal(diagnostic.immediatePreFirstDrawResave.fallenCount, 32); assert.equal(diagnostic.immediatePreFirstDrawResave.nativeFallenCount, 24);
      assert.equal(diagnostic.immediatePreFirstDrawResave.fallbackFallenCount, 8); assert.deepEqual(diagnostic.immediatePreFirstDrawResave.changedActions, ['walk']);
      assert.equal(diagnostic.publicFirstColdDrawThenResave.allSpritesExact, true);
    }
    assert.deepEqual(next.immediatePreFirstDrawResave.fallen, prior.immediatePreFirstDrawResave.fallen);
    assert.deepEqual(next.immediatePreFirstDrawResave.changes, prior.immediatePreFirstDrawResave.changes);
  }
});

test('all unaffected ordinary bearings, surviving stable identities, unsupported NW/SE contact and retained v18 shots stay exact', () => {
  requireComplete();
  for (const direction of [0, 1, 2, 3, 4, 5, 6]) for (const action of ['idle', 'fire', 'reload']) {
    const prior = ordinaryFixture('gettysburg-v26', action, direction), next = ordinaryFixture('gettysburg-v27', action, direction); assertComparedPair(prior, next);
    assert.deepEqual(json(next.scene.views.get(next.union.id).shots), json(prior.scene.views.get(prior.union.id).shots));
  }
  const pair = ordinaryFixture(); const identities = new Map(pair.scene.views.get(pair.union.id).visual.output.figures.map(figure => [figure.id, gettysburgInfantryIdentity(pair.union.id, figure.id)]));
  pair.union.strength *= .75; drawPair(pair.scene, pair.ids);
  for (const figure of pair.scene.views.get(pair.union.id).visual.output.figures.filter(value => value.visible && !value.fallen)) {
    assert.equal(gettysburgInfantryIdentity(pair.union.id, figure.id), identities.get(figure.id));
    if (newGraphic(pair.union, figure)) assertOrdinaryFigure(pair.scene, pair.union, figure); else assertAcceptedFigure(pair.scene, pair.union, figure);
  }
  for (const direction of [1, 5]) for (const side of ['union', 'confederate']) for (const identity of ['a', 'b']) for (const action of ['melee', 'fall']) {
    const figure = { id: 5, direction, action, fallen: action === 'fall', frame: 3 };
    const options = { scenarioId: 'gettysburg', side, identity }; assert.equal(gettysburgInfantryClipPose('unsupported', figure, 9, { ...options, search, clips }), null);
    assert.deepEqual(gettysburgInfantryClipPose('unsupported', figure, 9, { ...options, search, clips }), gettysburgInfantryClipPose('unsupported', figure, 9, { ...options, search: priorSearch, clips: prepare(textures, priorSearch) }));
  }
});
