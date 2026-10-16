import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';

const modulePaths = ['gettysburgInfantryClipPolicy', 'gettysburgInfantryClipAssets', 'gettysburgInfantryClips',
  'gettysburgInfantryFamily', 'gettysburgInfantryShotMotion', 'gettysburgInfantryReloadProgress',
  'gettysburgInfantryVolleyPresentation', 'gettysburgMotionStudies', 'gettysburgMotionPlayback',
  'civilWarEngine', 'fieldPresentationCache', 'battleDefinitions', 'combatCheckpointEnvelope',
  'formationVisualState', 'formationVisualCheckpoint', 'detailedUnitVisual', 'formationMath',
  'realisticUnitVisual', 'retreatPresentation', 'battleTactics', 'battleUsability', 'historicalLandmarks'];
export async function regressionModules(root) {
  const modules = await Promise.all(modulePaths.map(name => import(pathToFileURL(`${root}/src/battle/${name}.js`))));
  modules.push(await import(pathToFileURL(`${root}/src/game/campaignStorage.js`)));
  modules.push(await import(pathToFileURL(`${root}/scripts/test-support/gettysburgClipTextures.mjs`)));
  return Object.assign({}, ...modules);
}
export function regressionHarness(root, modules, sceneSource, policy = modules.gettysburgInfantryClipPolicy,
  sampler = modules.sampleGettysburgInfantryVolley) {
  const assets = modules.gettysburgInfantryClipAssets('gettysburg', '?artPass=gettysburg-v28');
  const atlases = new Map(assets.map(asset => [asset.key, JSON.parse(readFileSync(`${root}/public/${asset.json}`))]));
  const textures = modules.gettysburgClipTestTextures(atlases);
  const acceptedFrame = { realWidth: 64, realHeight: 96, pivotX: .5, pivotY: .9, customData: { bodyHeight: 96 } };
  const acceptedKey = key => /^(union|confederate)-(realistic|aim-realistic|detailed-(body|aim|melee|crew))$/.test(key)
    || modules.DETAILED_UNIT_PAGES.some(page => key === `union-detailed-${page}` || key === `confederate-detailed-${page}`);
  const renderingTextures = { exists: key => textures.exists(key) || acceptedKey(key),
    get: key => textures.get(key) || (acceptedKey(key) ? { has: () => true, get: () => acceptedFrame } : undefined) };
  class Display {
    constructor(x = 0, y = 0) { Object.assign(this, { x, y, visible: true, alpha: 1, input: { enabled: true }, scaleX: 1, scaleY: 1, frame: acceptedFrame }); }
    setTexture(key, frame) { this.textureKey = key; this.frameName = frame; this.frame = renderingTextures.get(key)?.get(frame); assert.ok(this.frame); return this; }
    setOrigin(x, y = x) { this.origin = { x, y }; this.originX = x; this.originY = y; return this; }
    setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }
    setPosition(x, y) { this.x = x; this.y = y; return this; }
    setVisible(value) { this.visible = value; return this; } setAlpha(value) { this.alpha = value; return this; }
    setDepth(value) { this.depth = value; return this; } setAngle(value) { this.angle = value; return this; }
    setFlipX(value) { this.flipX = value; return this; } setTint(value) { this.tint = value; return this; }
    setText() { return this; } setDisplaySize() { return this; } disableInteractive() { this.input.enabled = false; return this; }
    setY(y) { this.y = y; return this; } setBlendMode() { return this; } setStrokeStyle() { return this; }
    setInteractive() { this.input.enabled = true; return this; } setData() { return this; } on() { return this; }
    setRotation() { return this; } setSize() { return this; }
  }
  class Graphics {
    constructor() { this.draws = []; } clear() { this.draws = []; return this; }
    fillStyle(color, alpha) { this.style = { color, alpha }; return this; }
    fillCircle(x, y, radius) { this.draws.push({ shape: 'circle', ...this.style, x, y, radius }); return this; }
    fillEllipse(x, y, width, height) { this.draws.push({ shape: 'ellipse', ...this.style, x, y, width, height }); return this; }
  }
  const windowState = { location: { search: '?artPass=gettysburg-v28' }, matchMedia: () => ({ matches: false }) };
  const Scene = vm.runInNewContext(sceneSource.slice(sceneSource.indexOf('class CivilWarBattleScene')) + '; CivilWarBattleScene', {
    ...modules, Phaser: { Scene: class {}, Math: { Clamp: (v, low, high) => Math.max(low, Math.min(high, v)) },
      BlendModes: { NORMAL: 0 }, Geom: { Rectangle: class { static Contains() {} }, Polygon: class { static Contains() {} } } },
    performance, Map, window: windowState, gettysburgInfantryClipPolicy: policy,
    sampleGettysburgInfantryVolley: sampler, siegeTargetPlan: () => [], createSiegeTargetVisual: () => null,
    createStandardPole: () => new Display(), createRealisticStandard: () => new Display(), updatePeriodStandard() {},
  });
  const campaign = { ...modules.createFreshCampaignState(1861), battleRulesVersion: 18 };
  function make(query, side = 'union', direction = 0, loaded = renderingTextures, checkpoint = null) {
    windowState.location.search = query;
    const scene = new Scene('gettysburg', campaign, 'option_a', null, null, null, null, checkpoint);
    scene.publishedSnapshots = [];
    scene.onBattleSnapshot = snapshot => scene.publishedSnapshots.push(JSON.parse(JSON.stringify(snapshot)));
    scene.textures = loaded;
    scene.infantryClips = modules.prepareGettysburgInfantryClips(modules.gettysburgInfantryClipDefinitions('gettysburg', query, loaded),
      (key, frame) => loaded.exists(key) && loaded.get(key).has(frame));
    scene.add = Object.fromEntries(['image', 'rectangle', 'text', 'container', 'zone'].map(kind => [kind, (x, y) => new Display(x, y)]));
    scene.shadows = new Graphics(); scene.smoke = new Graphics(); scene.dust = new Graphics();
    scene.cameras = { main: { zoom: 1 } };
    if (!checkpoint) scene.engine.time = 7.08;
    const unit = scene.engine.state.find(value => value.side === side && value.type === 'infantry' && value.active);
    if (!checkpoint) Object.assign(unit, { facing: direction * Math.PI / 4, formationMode: 'line', lastVolleyAt: 7,
      status: 'firing', reload: 10, inMelee: false });
    const snapshot = () => scene.engine.snapshot({ presentation: true }).formations.find(value => value.id === unit.id);
    scene.createFormation(snapshot());
    function draw() { scene.smoke.clear(); scene.shadows.clear(); scene.dust.clear(); scene.syncFormation(snapshot(), scene.engine.time + (scene.engine.resolutionTime || 0), false); return scene.views.get(unit.id); }
    return { scene, unit, snapshot, draw, view: scene.views.get(unit.id) };
  }
  const facts = view => ({ capacity: view.capacity, footprint: view.footprint, visual: view.visual,
    soldiers: view.soldiers.map(({ sprite, clipPhase, clipAction, clipVolleyMuzzle, clipVolleyAt }) => ({
      x: sprite.x, y: sprite.y, texture: sprite.textureKey, frame: sprite.frameName, visible: sprite.visible,
      originX: sprite.originX, originY: sprite.originY, scaleX: sprite.scaleX, scaleY: sprite.scaleY,
      angle: sprite.angle, alpha: sprite.alpha, flipX: sprite.flipX, tint: sprite.tint, depth: sprite.depth,
      clipPhase, clipAction, clipVolleyMuzzle, clipVolleyAt })), shots: view.shots });
  return { Scene, make, facts, textures, renderingTextures, atlases, campaign, windowState };
}
