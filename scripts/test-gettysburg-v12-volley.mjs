import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { FieldPresentationCache } from '../src/battle/fieldPresentationCache.js';
import { getBattleEngineConfig } from '../src/battle/battleDefinitions.js';
import { combatCheckpointEnvelope } from '../src/battle/combatCheckpointEnvelope.js';
import { updateFormationVisual } from '../src/battle/formationVisualState.js';
import { createFormationVisualCheckpoint, restoreFormationVisualFromCheckpoint } from '../src/battle/formationVisualCheckpoint.js';
import { deterministicUnitValue, formationFootprint } from '../src/battle/formationMath.js';
import { detailedInfantryPose, DETAILED_UNIT_PAGES } from '../src/battle/detailedUnitVisual.js';
import { realisticInfantryPose, updateTravelDust } from '../src/battle/realisticUnitVisual.js';
import { gettysburgInfantryFamilyEnabled, gettysburgInfantryFamilyPose, gettysburgInfantryFamilyTextureKey,
  gettysburgInfantryIdentity, gettysburgInfantryStandardAnchor } from '../src/battle/gettysburgInfantryFamily.js';
import { gettysburgInfantryClipAssets, gettysburgInfantryClipDefinitions } from '../src/battle/gettysburgInfantryClipAssets.js';
import { gettysburgInfantryClipPolicy } from '../src/battle/gettysburgInfantryClipPolicy.js';
import { prepareGettysburgInfantryClips, gettysburgInfantryClipPose } from '../src/battle/gettysburgInfantryClips.js';
import { gettysburgInfantryShootingAge, gettysburgInfantryShotMotion } from '../src/battle/gettysburgInfantryShotMotion.js';
import { sampleGettysburgInfantryVolley, createGettysburgInfantryShotCheckpoint,
  restoreGettysburgInfantryShots } from '../src/battle/gettysburgInfantryVolleyPresentation.js';
import { formationStatusLabel } from '../src/battle/battleTactics.js';
import { retreatOpacity } from '../src/battle/retreatPresentation.js';
import { createFreshCampaignState } from '../src/game/campaignStorage.js';
import { gettysburgClipTestTextures } from './test-support/gettysburgClipTextures.mjs';

const query = '?artPass=gettysburg-v12';
const scale = .82;
const json = value => JSON.parse(JSON.stringify(value));
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-10,
  message || `${actual} differs from ${expected}`);
const campaign = { ...createFreshCampaignState(1861), battleRulesVersion: 17 };
const source = readFileSync(new URL('../src/battle/CivilWarBattlefield.jsx', import.meta.url), 'utf8');
const assets = new Map(Array.from({ length: 10 }, (_, index) => `?artPass=gettysburg-v${index + 3}`)
  .flatMap(search => gettysburgInfantryClipAssets('gettysburg', search)).map(asset => [asset.key, asset]));
// Native dimensions/pivots come from installed Phaser JSONHash and Frame.
// Missing native files are an error, never an optional test skip.
const nativeTextures = gettysburgClipTestTextures(new Map([...assets.values()].map(asset => [asset.key,
  JSON.parse(readFileSync(new URL(`../public/${asset.json}`, import.meta.url)))])));
const acceptedFrame = { realWidth: 64, realHeight: 96, pivotX: .5, pivotY: .9, customData: { bodyHeight: 96 } };
const acceptedTexture = { has: () => true, get: () => acceptedFrame };
const acceptedKey = key => /^(union|confederate)-(realistic|aim-realistic|detailed-(body|aim|melee|crew))$/.test(key)
  || DETAILED_UNIT_PAGES.some(page => key === `union-detailed-${page}` || key === `confederate-detailed-${page}`);
const textures = {
  exists: key => nativeTextures.exists(key) || acceptedKey(key),
  get: key => nativeTextures.get(key) || acceptedTexture,
};
const prepared = search => prepareGettysburgInfantryClips(
  gettysburgInfantryClipDefinitions('gettysburg', search, nativeTextures),
  (key, frame) => nativeTextures.exists(key) && nativeTextures.get(key).has(frame));
const shootingCalls = [];

// Only display containers are doubles. Constructor, formation creation,
// rendering, visual state, checkpoint writing and combat revival are actual code.
class Display {
  constructor(x = 0, y = 0) {
    Object.assign(this, { x, y, alpha: 1, visible: true, scaleX: 1, scaleY: 1, frame: acceptedFrame,
      input: { enabled: true }, data: new Map() });
  }
  setTexture(key, frame) { this.texture = key; this.frameName = frame; this.frame = textures.get(key).get(frame); assert.ok(this.frame, `${key}/${frame}`); return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setOrigin(x, y = x) { this.originX = x; this.originY = y; return this; }
  setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }
  setAngle(angle) { this.angle = angle; return this; }
  setFlipX(value) { this.flipX = value; return this; }
  setTint(tint) { this.tint = tint; return this; }
  setAlpha(alpha) { this.alpha = alpha; return this; }
  setVisible(visible) { this.visible = visible; return this; }
  setY(y) { this.y = y; return this; }
  setDepth(depth) { this.depth = depth; return this; }
  setRotation(rotation) { this.rotation = rotation; return this; }
  setText(text) { this.text = text; return this; }
  setSize(width, height) { this.width = width; this.height = height; return this; }
  setDisplaySize(width, height) { return this.setSize(width, height); }
  setData(key, value) { this.data.set(key, value); return this; }
  setInteractive() { this.input.enabled = true; return this; }
  disableInteractive() { this.input.enabled = false; return this; }
  setBlendMode() { return this; }
  setStrokeStyle() { return this; }
  on() { return this; }
}
class Graphics extends Display {
  constructor() { super(); this.draws = []; }
  clear() { this.draws = []; return this; }
  fillStyle(color, alpha) { this.style = { color, alpha }; return this; }
  fillCircle(x, y, radius) { this.draws.push({ shape: 'circle', ...this.style, x, y, radius }); return this; }
  fillEllipse(x, y, width, height) { this.draws.push({ shape: 'ellipse', ...this.style, x, y, width, height }); return this; }
}
const windowState = { location: { search: query }, matchMedia: () => ({ matches: false }) };
const Phaser = { Scene: class {}, BlendModes: { NORMAL: 0 }, Geom: {
  Rectangle: class { static Contains() {} }, Polygon: class { static Contains() {} },
} };
const Scene = vm.runInNewContext(source.slice(source.indexOf('class CivilWarBattleScene')) + '; CivilWarBattleScene', {
  Phaser, CivilWarBattleEngine, FieldPresentationCache, getBattleEngineConfig, performance, Map,
  window: windowState, combatCheckpointEnvelope, createFormationVisualCheckpoint, restoreFormationVisualFromCheckpoint,
  updateFormationVisual, sampleGettysburgInfantryVolley, createGettysburgInfantryShotCheckpoint,
  restoreGettysburgInfantryShots, gettysburgInfantryClipPolicy, DETAILED_UNIT_PAGES, deterministicUnitValue,
  formationFootprint, detailedInfantryPose, realisticInfantryPose, updateTravelDust, gettysburgInfantryFamilyEnabled,
  gettysburgInfantryFamilyPose, gettysburgInfantryFamilyTextureKey, gettysburgInfantryStandardAnchor,
  gettysburgInfantryClipPose, gettysburgInfantryShootingAge: (...args) => {
    const age = gettysburgInfantryShootingAge(...args); shootingCalls.push({ id: args[1], time: args[2], age }); return age;
  }, formationStatusLabel, retreatOpacity,
  siegeTargetPlan: () => [], createSiegeTargetVisual: () => null,
  createStandardPole: () => new Display(), createRealisticStandard: () => new Display(), updatePeriodStandard: () => {},
});

function attachRenderer(scene) {
  scene.textures = textures;
  scene.infantryClips = prepared(scene.artPassSearch);
  scene.add = Object.fromEntries(['image', 'rectangle', 'text', 'container', 'zone'].map(kind => [kind, (x, y) => new Display(x, y)]));
  scene.shadows = new Graphics(); scene.dust = new Graphics(); scene.smoke = new Graphics();
  scene.cameras = { main: { zoom: 1 } };
  return scene;
}
function fixture({ search = query, reducedMotion = false, side = 'union', direction = 0, time = 7.08 } = {}) {
  windowState.location.search = search; windowState.matchMedia = () => ({ matches: reducedMotion });
  const scene = attachRenderer(new Scene('gettysburg', campaign, 'option_a'));
  scene.engine.time = time;
  const unit = scene.engine.state.find(value => value.type === 'infantry' && value.side === side && value.active);
  const enemy = scene.engine.state.find(value => value.side !== side && value.active);
  Object.assign(unit, { facing: direction * Math.PI / 4, formationMode: 'line', lastVolleyAt: 7,
    status: 'firing', reload: 10, inMelee: false, engagedWith: enemy.id });
  const formation = current(scene, unit.id);
  scene.createFormation(formation);
  return { scene, id: unit.id, unit };
}
function current(scene, id) { return scene.engine.snapshot({ presentation: true }).formations.find(value => value.id === id); }
function draw(scene, id, resolving = false) {
  scene.smoke.clear(); scene.shadows.clear(); scene.dust.clear();
  shootingCalls.length = 0;
  scene.syncFormation(current(scene, id), scene.engine.time + (scene.engine.resolutionTime || 0), resolving);
  return scene.views.get(id);
}
function cold(saved, id, search = query, reducedMotion = false) {
  windowState.location.search = search; windowState.matchMedia = () => ({ matches: reducedMotion });
  const scene = attachRenderer(new Scene('gettysburg', campaign, 'option_a', null, null, null, null, json(saved)));
  scene.createFormation(current(scene, id));
  return scene;
}
function spriteFacts(view) {
  return Array.from(view.soldiers, ({ sprite }) => ({ x: sprite.x, y: sprite.y, texture: sprite.texture, frame: sprite.frameName,
    visible: sprite.visible, originX: sprite.originX, originY: sprite.originY, scaleX: sprite.scaleX,
    scaleY: sprite.scaleY, angle: sprite.angle, alpha: sprite.alpha, flipX: sprite.flipX, tint: sprite.tint }));
}
const frontIds = view => view.visual.output.figures.filter(figure => figure.visible && !figure.fallen && figure.frontRank).map(figure => figure.id);
function assertSmoke(scene, shots, time) {
  const age = time - shots.at;
  const ellipses = scene.smoke.draws.filter(draw => draw.shape === 'ellipse');
  assert.equal(ellipses.length, shots.figures.length * 3, 'every original participant emits all three smoke lobes');
  shots.figures.forEach((shot, index) => {
    close(ellipses[index * 3].x, shot.x + Math.cos(shot.bearing) * age * 14 * shot.scale);
    close(ellipses[index * 3].y, shot.y - age * 9);
  });
}

test('actual native muzzle flashes use measured neutral fire mouths on every reviewed bearing', () => {
  const seen = new Set();
  for (const [side, directions] of [['union', [0, 1, 2, 3, 4]], ['confederate', [5, 6, 7]]]) for (const direction of directions) {
    const { scene, id } = fixture({ side, direction });
    const combat = scene.engine.checkpoint();
    const view = draw(scene, id);
    const definitions = gettysburgInfantryClipDefinitions('gettysburg', query, nativeTextures);
    assert.ok(view.shots.figures.length > 0);
    assert.deepEqual(view.shots.figures.map(shot => shot.id), frontIds(view));
    const circles = scene.smoke.draws.filter(draw => draw.shape === 'circle');
    assert.equal(circles.length, view.shots.figures.length);
    view.shots.figures.forEach((shot, index) => {
      const figure = view.visual.output.figures.find(value => value.id === shot.id);
      const identity = side === 'union' ? gettysburgInfantryIdentity(id, shot.id) : 'a';
      const clip = definitions.find(value => value.side === side && value.identity === identity && value.direction === direction && value.action === 'fire');
      assert.ok(clip, `${side}/${identity}/${direction}`); seen.add(`${side}/${identity}/${direction}`);
      const frame = nativeTextures.get(clip.key).get(clip.frames[0]);
      const authoredScale = 58 * figure.scale / clip.referenceHeight * (.95 + deterministicUnitValue(id, shot.id, 215) * .1);
      close(shot.x, figure.x + (clip.muzzles[0].x - clip.pivots[0].x) * frame.realWidth * authoredScale);
      close(shot.y, figure.y + (clip.muzzles[0].y - clip.pivots[0].y) * frame.realHeight * authoredScale);
      close(shot.bearing, direction * Math.PI / 4); assert.equal(shot.native, true);
      close(circles[index].x, shot.x); close(circles[index].y, shot.y);
    });
    assertSmoke(scene, view.shots, scene.engine.time);
    assert.deepEqual(scene.engine.checkpoint(), combat, 'sampling and drawing cannot mutate combat');
  }
  assert.equal(seen.size, 13, 'both Union identities and all Confederate native views were measured');
});

test('actual v12 sprite rendering supplies formation shooting age to bounded native recoil while mouths remain neutral', () => {
  for (const [side, direction] of [['union', 0], ['union', 1], ['union', 2], ['union', 3], ['union', 4],
    ['confederate', 5], ['confederate', 6], ['confederate', 7]]) {
    const { scene, id } = fixture({ side, direction, time: 7.18 });
    const view = draw(scene, id);
    for (const figure of view.visual.output.figures.filter(figure => figure.action === 'fire')) {
      const age = scene.engine.time - 7 - deterministicUnitValue(id, figure.id, 123) * .09;
      const call = shootingCalls.find(value => value.id === figure.id);
      assert.ok(call, 'the renderer must pass a figure-specific battle age'); close(call.age, age);
      const motion = gettysburgInfantryShotMotion(figure, { shootingAge: age });
      assert.ok(Math.hypot(motion.offsetX, motion.offsetY) > 0, 'test exercises displaced fire');
      const sprite = view.soldiers[figure.id].sprite;
      close(sprite.x - figure.x, motion.offsetX); close(sprite.y - figure.y, motion.offsetY); assert.equal(sprite.angle, 0);
      assert.equal(sprite.frame, nativeTextures.get(sprite.texture).get(sprite.frameName));
      const shot = view.shots.figures.find(value => value.id === figure.id);
      const pose = gettysburgInfantryClipPose(id, figure, scene.engine.time, {
        side, scenarioId: 'gettysburg', search: query, clips: scene.infantryClips, identity: 'a', versionedIdentity: true,
      });
      close(shot.x, sprite.x - motion.offsetX + (pose.muzzle.x - sprite.originX) * sprite.frame.realWidth * sprite.scaleX);
      close(shot.y, sprite.y - motion.offsetY + (pose.muzzle.y - sprite.originY) * sprite.frame.realHeight * sprite.scaleY);
    }
  }
});

test('movement, turns, reform and casualties preserve volley origin, bearing and membership through smoke expiry', () => {
  const { scene, id, unit } = fixture();
  const view = draw(scene, id), reference = view.shots, original = json(view.shots);
  scene.engine.time = 7.72;
  Object.assign(unit, { x: unit.x + 91, y: unit.y + 36, facing: Math.PI / 2, formationMode: 'column',
    strength: unit.initialStrength * .55, status: 'moving' });
  draw(scene, id);
  assert.equal(view.shots, reference, 'the same observed volley is sampled only once');
  assert.deepEqual(view.shots, original);
  assert.ok(original.figures.some(shot => !view.visual.figures.find(figure => figure.id === shot.id).alive), 'a shooter became a casualty');
  assert.ok(original.figures.length > frontIds(view).length, 'reform and losses changed current front-rank membership');
  assertSmoke(scene, original, 7.72);
  assert.equal(scene.smoke.draws.filter(draw => draw.shape === 'circle').length, 0);
  scene.engine.time = 8.249; draw(scene, id); assert.equal(view.shots, reference); assertSmoke(scene, original, 8.249);
  scene.engine.time = 8.25; draw(scene, id); assert.equal(view.shots, null); assert.deepEqual(scene.smoke.draws, []);
  scene.engine.time = 8.33; unit.lastVolleyAt = 8.3; draw(scene, id);
  assert.notEqual(view.shots, reference); assert.equal(view.shots.at, 8.3);
  assert.deepEqual(view.shots.figures.map(shot => shot.id), frontIds(view));
  assert.ok(view.shots.figures.every(shot => shot.bearing === Math.PI / 2));
});

test('pause is stable; reduced motion suppresses flash and recoil; resolution suppresses flash and smoke', () => {
  const { scene, id } = fixture();
  const view = draw(scene, id), sprites = json(spriteFacts(view)), smoke = json(scene.smoke.draws), shots = view.shots;
  assert.equal(scene.speed, 0); draw(scene, id);
  assert.equal(view.shots, shots); assert.deepEqual(spriteFacts(view), sprites); assert.deepEqual(scene.smoke.draws, smoke);
  const reduced = fixture({ reducedMotion: true });
  const reducedView = draw(reduced.scene, reduced.id);
  assertSmoke(reduced.scene, reducedView.shots, reduced.scene.engine.time);
  assert.equal(reduced.scene.smoke.draws.some(draw => draw.shape === 'circle'), false);
  for (const figure of reducedView.visual.output.figures.filter(figure => figure.visible && !figure.fallen)) {
    close(reducedView.soldiers[figure.id].sprite.x, figure.x); close(reducedView.soldiers[figure.id].sprite.y, figure.y);
  }
  draw(scene, id, true); assert.deepEqual(scene.smoke.draws, []);
  assert.ok(view.visual.output.figures.every(figure => figure.action !== 'fire'));
});

test('unsupported native bearings and withheld fire clips retain fallback smoke without native flash', () => {
  for (const withheld of [false, true]) {
    const { scene, id } = fixture({ direction: withheld ? 0 : 6 });
    if (withheld) scene.infantryClips = scene.infantryClips.filter(clip => clip.action !== 'fire');
    const view = draw(scene, id);
    assert.ok(view.shots.figures.length > 0); assert.ok(view.shots.figures.every(shot => shot.native === false));
    for (const shot of view.shots.figures) {
      const figure = view.visual.output.figures.find(value => value.id === shot.id);
      close(shot.x, figure.x + Math.cos(view.visual.output.facing) * 15 * scale);
      close(shot.y, figure.y - 24 * scale + Math.sin(view.visual.output.facing) * 10 * scale);
    }
    assert.equal(scene.smoke.draws.some(draw => draw.shape === 'circle'), false);
    assertSmoke(scene, view.shots, scene.engine.time);
  }
});

for (const age of [.18, .8]) test(`cold JSON checkpoint at volley age ${age} preserves sprites and smoke, including immediate re-save`, () => {
  const { scene, id, unit } = fixture(); draw(scene, id);
  scene.engine.time = 7 + age;
  Object.assign(unit, { x: unit.x + 23, y: unit.y + 11, facing: Math.PI / 4,
    ...(age > .5 ? { formationMode: 'column', strength: unit.initialStrength * .72 } : {}) });
  const view = draw(scene, id);
  const sprites = json(spriteFacts(view)), smoke = json(scene.smoke.draws), expectedShots = json(view.shots);
  const combat = scene.engine.checkpoint(), saved = json(scene.checkpoint());
  assert.deepEqual(scene.engine.checkpoint(), combat); assert.deepEqual(combatCheckpointEnvelope(saved), combat);
  assert.equal(saved.presentation.shots.formations.length, 1);
  assert.ok(JSON.stringify(saved.presentation.shots).length < 12000);
  const restored = cold(saved, id);
  assert.deepEqual(restored.views.get(id).shots, expectedShots);
  const resaved = json(restored.checkpoint()); // Save before any draw has run.
  assert.deepEqual(resaved.presentation, saved.presentation);
  assert.deepEqual(restored.engine.checkpoint(), combat);
  const restoredView = draw(restored, id);
  assert.deepEqual(spriteFacts(restoredView), sprites); assert.deepEqual(restored.smoke.draws, smoke);
  assert.deepEqual(restoredView.shots, expectedShots);
  const resavedCold = cold(resaved, id); draw(resavedCold, id);
  assert.deepEqual(resavedCold.smoke.draws, smoke);
  for (let i = 0; i < 8; i++) {
    scene.engine.tick(.2); restored.engine.tick(.2);
    assert.deepEqual(restored.engine.checkpoint(), scene.engine.checkpoint(), 'presentation leaves subsequent combat deterministic');
    draw(scene, id); draw(restored, id);
    assert.deepEqual(restored.smoke.draws, scene.smoke.draws);
  }
});

test('a save between presentation passes samples the new volley at saved geometry without ticking combat', () => {
  const { scene, id, unit } = fixture(); const view = draw(scene, id), previous = view.shots;
  scene.engine.time = 7.48;
  Object.assign(unit, { lastVolleyAt: 7.4, x: unit.x + 57, y: unit.y + 19, facing: Math.PI / 4 });
  const combat = scene.engine.checkpoint(); const saved = json(scene.checkpoint());
  assert.deepEqual(scene.engine.checkpoint(), combat);
  assert.notEqual(view.shots, previous); assert.equal(view.shots.at, 7.4); assert.equal(view.shots.capturedAt, 7.48);
  assert.deepEqual(view.shots.figures.map(shot => shot.id), frontIds(view));
  assert.ok(view.shots.figures.every(shot => shot.bearing === Math.PI / 4));
  const restored = cold(saved, id); assert.deepEqual(restored.engine.checkpoint(), combat);
  draw(scene, id); draw(restored, id); assert.deepEqual(restored.smoke.draws, scene.smoke.draws);
  // First ever sampling can also happen on a save before the first render.
  const first = fixture(); const firstCombat = first.scene.engine.checkpoint();
  assert.equal(first.scene.views.get(first.id).shots, null);
  const firstSaved = json(first.scene.checkpoint());
  assert.ok(firstSaved.presentation.shots.formations[0].volley.figures.length > 0);
  assert.deepEqual(first.scene.engine.checkpoint(), firstCombat);
  const firstCold = cold(firstSaved, first.id); draw(firstCold, first.id);
  assert.deepEqual(firstCold.views.get(first.id).shots, first.scene.views.get(first.id).shots);
});

test('bad, stale, duplicate, oversized and revival-marker optional shot records fail soft without changing combat', () => {
  const { scene, id } = fixture(); draw(scene, id);
  const saved = json(scene.checkpoint()), combat = scene.engine.checkpoint();
  const mutations = [
    shots => { shots.version = 2; }, shots => { shots.artPass = 'gettysburg-v11'; },
    shots => { shots.time += .01; }, shots => { shots.formations[0].volley.at -= .1; },
    shots => { shots.formations[0].volley.capturedAt = shots.time + .01; },
    shots => { shots.formations[0].formation.x += 1; },
    shots => { shots.formations.push(json(shots.formations[0])); },
    shots => { shots.formations[0].volley.figures.push(json(shots.formations[0].volley.figures[0])); },
    shots => { shots.formations[0].capacity = 33; },
    shots => { shots.formations[0].volley.figures[0].x = 1e8; },
    shots => { shots.formations[0].volley.figures[0].scale = 0; },
    shots => { shots.formations[0].volley.figures[0].id = 32; },
    shots => { shots.formations = Array.from({ length: 33 }, () => json(shots.formations[0])); },
    shots => { shots.$fieldMap = 'malformed'; }, shots => { shots.formations[0].$fieldSet = {}; },
    shots => { shots.formations[0].formation.$fieldMap = false; },
    shots => { shots.formations[0].volley.$fieldSet = {}; },
    shots => { shots.formations[0].volley.figures[0].$fieldMap = []; },
    shots => {
      const record = shots.formations[0], shot = record.volley.figures[0];
      shots.formations = Array.from({ length: 23 }, (_, index) => ({ ...json(record), id: index ? `extra-${index}` : id,
        formation: { ...json(record.formation), id: index ? `extra-${index}` : id },
        volley: { ...json(record.volley), figures: Array.from({ length: 32 }, (_, figureId) => ({ ...shot, id: figureId })) } }));
    },
  ];
  for (const mutate of mutations) {
    const damaged = json(saved); mutate(damaged.presentation.shots);
    const resumed = cold(damaged, id), clean = cold(saved, id);
    assert.equal(resumed.views.get(id).shots, null);
    assert.deepEqual(resumed.engine.checkpoint(), combat);
    assert.deepEqual(resumed.views.get(id).visual.figures, clean.views.get(id).visual.figures, 'other valid visual history survives bad shots');
    draw(resumed, id); assert.ok(resumed.views.get(id).shots, 'missing optional history gets a current neutral approximation');
    resumed.engine.tick(.2); clean.engine.tick(.2);
    assert.deepEqual(resumed.engine.checkpoint(), clean.engine.checkpoint());
  }
  for (const shots of [undefined, null, { $fieldSet: [] }]) {
    const damaged = json(saved); damaged.presentation.shots = shots;
    const resumed = cold(damaged, id); assert.equal(resumed.views.get(id).shots, null); assert.deepEqual(resumed.engine.checkpoint(), combat);
  }
  const stale = json(saved); stale.presentation.time = stale.presentation.shots.time = stale.state.time = 8.25;
  const expired = cold(stale, id); assert.equal(expired.views.get(id).shots, null); draw(expired, id); assert.deepEqual(expired.smoke.draws, []);
  for (const presentation of [{ $fieldMap: 'malformed' }, { $fieldSet: {} }]) {
    const resumed = cold({ ...saved, presentation }, id); assert.deepEqual(resumed.engine.checkpoint(), combat);
  }
});

test('v3-v11 scene paths omit shot checkpoints and preserve the existing native muzzle and live-front smoke calculation', () => {
  for (let version = 3; version <= 11; version++) {
    const { scene, id, unit } = fixture({ search: `?artPass=gettysburg-v${version}` });
    const view = draw(scene, id);
    assert.equal(scene.nativeShotMotion, false); assert.equal(Object.hasOwn(view, 'shots'), false);
    assert.equal(Object.hasOwn(scene.checkpoint().presentation, 'shots'), false);
    for (const figure of view.visual.output.figures.filter(figure => figure.action === 'fire')) {
      const soldier = view.soldiers[figure.id], sprite = soldier.sprite;
      const clip = gettysburgInfantryClipPose(id, figure, scene.engine.time, {
        side: unit.side, scenarioId: 'gettysburg', search: scene.artPassSearch, clips: scene.infantryClips,
        identity: 'a', versionedIdentity: true,
      });
      if (!clip) { assert.equal(soldier.clipVolleyAt, undefined); continue; }
      assert.equal(soldier.clipVolleyAt, 7);
      close(soldier.clipVolleyMuzzle.x, sprite.x + (clip.muzzle.x - sprite.originX) * sprite.frame.realWidth * sprite.scaleX);
      close(soldier.clipVolleyMuzzle.y, sprite.y + (clip.muzzle.y - sprite.originY) * sprite.frame.realHeight * sprite.scaleY);
    }
    scene.engine.time = 7.8; Object.assign(unit, { facing: Math.PI / 2, strength: unit.initialStrength * .7, formationMode: 'column' });
    draw(scene, id);
    const fronts = view.visual.output.figures.filter(figure => figure.visible && !figure.fallen && figure.frontRank);
    const ellipses = scene.smoke.draws.filter(draw => draw.shape === 'ellipse');
    assert.equal(ellipses.length, fronts.length * 3);
    fronts.forEach((figure, index) => {
      const soldier = view.soldiers[figure.id], muzzle = soldier.clipVolleyAt === 7 ? soldier.clipVolleyMuzzle : null;
      const facing = view.visual.output.facing, age = scene.engine.time - 7;
      close(ellipses[index * 3].x, (muzzle?.x ?? figure.x + Math.cos(facing) * 15 * scale) + Math.cos(facing) * age * 14 * scale);
      close(ellipses[index * 3].y, (muzzle?.y ?? figure.y - 24 * scale + Math.sin(facing) * 10 * scale) - age * 9);
    });
    assert.equal(Object.hasOwn(view, 'shots'), false);
  }
});
