import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { standardHarness } from './gettysburgV34Regression.mjs';
import { animationQuery, fullFacts, plain, sha } from './gettysburgV35Regression.mjs';
import * as artillery from '../../src/battle/artilleryVisual.js';
import * as standards from '../../src/battle/realisticStandards.js';
import * as periods from '../../src/battle/periodStandards.js';
import * as fieldView from '../../src/battle/fieldViewCheckpoint.js';
import * as locomotion from '../../src/battle/gettysburgLocomotionPresentation.js';

export { plain, sha };
export const dustQuery = ({ dust = true, ...options } = {}) => animationQuery(options) + (dust ? '&dustContinuity=v36' : '');

// The current physical Scene and native modules run in the importing realm so
// strict plain-object validators see the same object prototypes as production.
// Only display/camera plumbing is recorded. Real cloth sprite functions replace
// the older recorder's standard stubs; no protected helper is edited or adapted.
export async function locomotionHarness(root, { before = false, source } = {}) {
  const accepted = await standardHarness(root);
  const dust = await import(pathToFileURL(root + '/src/battle/gettysburgDustCheckpoint.js'));
  const sceneSource = source ?? readFileSync(root + (before
    ? '/scripts/test-support/gettysburg-v40-before/src/battle/CivilWarBattlefield.jsx'
    : '/src/battle/CivilWarBattlefield.jsx'), 'utf8');
  const donor = accepted.make(animationQuery(), 'confederate', 5);
  const Display = donor.view.standard.constructor, Graphics = donor.scene.shadows.constructor;
  Display.prototype.setFrame = function(frame) { this.frameName = frame; return this; };
  Display.prototype.add = function(value) { (this.children ??= []).push(value); return this; };
  Display.prototype.sort = function() { return this; };
  Graphics.prototype.setScale = function(x, y = x) { this.scaleX = x; this.scaleY = y; return this; };
  Graphics.prototype.setY = function(y) { this.y = y; return this; };
  for (const name of ['setDepth', 'setVisible', 'setPosition', 'lineStyle', 'strokePoints', 'fillPoints', 'strokeCircle',
    'fillRect', 'fillRoundedRect', 'strokeRoundedRect', 'beginPath', 'moveTo', 'lineTo', 'strokePath', 'closePath', 'lineBetween', 'arc']) {
    if (!Graphics.prototype[name]) Graphics.prototype[name] = function(...args) { this.draws.push({ shape: name, args }); return this; };
  }
  const clothKey = key => /^cloth-(us-national-34|us-national-35|anv-13|first-national-(11|13))$/.test(key);
  const textures = { exists: key => clothKey(key) || accepted.textures.exists(key), get: key => accepted.textures.get(key) };
  const windowState = { location: { search: dustQuery() }, matchMedia: () => ({ matches: false }) };
  const modules = { ...accepted.modules, ...artillery, ...standards, ...periods, ...dust, ...fieldView, ...locomotion };
  const poseCalls = []; let observe = false;
  const selectors = Object.fromEntries(['detailedInfantryPose', 'realisticInfantryPose', 'gettysburgInfantryFamilyPose', 'gettysburgInfantryClipPose'].map(name => [name, (...args) => {
    const result = modules[name](...args);
    if (observe) { assert.ok(poseCalls.length < 4096, 'Bounded current-selector observation'); poseCalls.push({ name, unitId: args[0], figure: plain(args[1]), pose: plain(result) }); }
    return result;
  }]));
  const context = { ...modules, ...selectors,
    Phaser: { Scene: class {}, Math: { Clamp: (v, low, high) => Math.max(low, Math.min(high, v)) },
      BlendModes: { NORMAL: 0 }, Geom: { Rectangle: class { static Contains() {} }, Polygon: class { static Contains() {} } } },
    window: windowState, document: { hidden: false }, recordFieldProfile: () => {},
    siegeTargetPlan: () => [], createSiegeTargetVisual: () => null };
  const Scene = new Function(...Object.keys(context), sceneSource.slice(sceneSource.indexOf('class CivilWarBattleScene'))
    + '; return CivilWarBattleScene;')(...Object.values(context));
  function make(checkpoint, { query = dustQuery(), campaign = accepted.campaign, scenarioId = 'gettysburg', choiceId = 'option_a', reducedMotion = false, all = true } = {}) {
    windowState.location.search = query;
    const scene = new Scene(scenarioId, campaign, choiceId, null, () => {}, null, null, checkpoint);
    scene.textures = textures;
    scene.add = { ...donor.scene.add, graphics: () => new Graphics(),
      image: (x, y, key, frame) => {
        const display = new Display(x, y);
        if (clothKey(key)) { display.textureKey = key; display.frameName = frame; }
        return display;
      }, container: (x, y, children) => { const display = new Display(x, y); display.children = children; return display; } };
    scene.shadows = new Graphics(); scene.smoke = new Graphics(); scene.dust = new Graphics(); scene.selection = new Graphics();
    scene.cameras = { main: { zoom: 1 } };
    scene.onBattleSnapshot = () => {};
    scene.infantryClips = modules.prepareGettysburgInfantryClips(modules.gettysburgInfantryClipDefinitions(scenarioId, query, textures),
      (key, frame) => textures.exists(key) && textures.get(key).has(frame));
    scene.reducedMotion = reducedMotion;
    if (all) for (const formation of scene.engine.snapshot({ presentation: true }).formations) scene.createFormation(formation);
    scene.setSelected('pickett-division');
    return scene;
  }
  return { ...accepted, Scene, modules, source: sceneSource, before, make, textures, poseCalls, observePoses(value) { observe = Boolean(value); poseCalls.length = 0; } };
}

export function clothFacts(scene) {
  return plain([...scene.views].map(([id, view]) => ({ id, texture: view.flag.textureKey, frame: view.flag.frameName,
    periodFrame: view.flag.periodFrame, x: view.flag.x, y: view.flag.y, originX: view.flag.originX,
    originY: view.flag.originY, scaleX: view.flag.scaleX, scaleY: view.flag.scaleY })));
}
export function dustFacts(harness, scene) {
  return { ...fullFacts(harness, scene), cloth: clothFacts(scene),
    dustStates: plain([...scene.views].map(([id, view]) => ({ id, state: view.dust }))) };
}
export function assertNonDustEqual(left, right, message = 'dust changes preserve native bodies, feet, slots, standards, shots and combat') {
  const unaffected = ({ dustStates, graphics: { dust, ...graphics }, ...rest }) => ({ ...rest, graphics });
  assert.deepEqual(unaffected(left), unaffected(right), message);
}
export function stepScene(scene, milliseconds = 50, count = 1) {
  scene.setSpeed(1);
  for (let step = 0; step < count; step++) scene.update(step * milliseconds, milliseconds);
  scene.setSpeed(0); scene.update(0, 0);
}
export const snapshotFormation = (scene, id = 'hancock-reserve') => scene.engine.snapshot({ presentation: true }).formations.find(f => f.id === id);

// Evaluate the unchanged Phaser BaseCamera with its actual pure mixins instead
// of the component barrel, whose unused browser feature checks need a DOM.
// This exercises real center/scroll/zoom/bounds math, not the GPU render loop.
export function baseCameraClass(root) {
  const path = root + '/node_modules/phaser/src/cameras/2d/BaseCamera.js';
  const require = createRequire(pathToFileURL(path));
  const components = Object.fromEntries(['AlphaSingle', 'Visible'].map(name =>
    [name, require('../../gameobjects/components/' + name + '.js')]));
  const module = { exports: {} };
  const source = readFileSync(path, 'utf8');
  new Function('module', 'exports', 'require', source)(module, module.exports,
    name => name === '../../gameobjects/components' ? components : require(name));
  return { Camera: module.exports, source, sha256: sha(source), path };
}

export function attachCamera(scene, Camera, width = 1194, height = 670) {
  scene.scale = { width, height };
  scene.cameras = { main: new Camera(0, 0, width, height) };
  scene.fitCamera();
  return scene.cameras.main;
}
