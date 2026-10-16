import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { standardHarness, plain } from './gettysburgV34Regression.mjs';
import { regressionHarness } from './gettysburgV30Regression.mjs';
import * as artillery from '../../src/battle/artilleryVisual.js';

export { plain };
export const sha = value => createHash('sha256').update(value).digest('hex');
export const hash = value => sha(JSON.stringify(plain(value)));
export const animationQuery = ({ animation = true, standard = true, contact = false, profile = 'moderate' } = {}) =>
  '?artPass=gettysburg-v32&infantryScale=' + profile + (standard ? '&standardContinuity=v34' : '')
  + (contact ? '&contactLayout=v33' : '') + (animation ? '&animationContinuity=v35' : '');

// Production Scene/native clips in a display-command recorder. Actual owned
// save probes use the original immutable captured primitive input separately.
export async function animationHarness(root, { before = false, search = animationQuery(), source } = {}) {
  const accepted = await standardHarness(root);
  const sceneSource = source ?? (before
    ? readFileSync(root + '/scripts/test-support/gettysburg-v35-before/src/battle/CivilWarBattlefield.jsx', 'utf8')
    : accepted.source);
  const base = regressionHarness(root, { ...accepted.modules, ...artillery,
    document: { hidden: false }, recordFieldProfile: () => {} }, sceneSource, search);
  base.renderingTextures.exists = key => accepted.textures.exists(key);
  base.renderingTextures.get = key => accepted.textures.get(key);
  const donor = base.make(search, 'confederate', 5, accepted.textures);
  const Display = donor.view.standard.constructor, Graphics = donor.scene.shadows.constructor;
  Display.prototype.add = function(value) { (this.children ??= []).push(value); return this; };
  Display.prototype.sort = function() { return this; };
  for (const name of ['setDepth', 'setVisible', 'setPosition', 'lineStyle', 'strokePoints', 'fillPoints', 'strokeCircle', 'fillRect', 'fillRoundedRect', 'strokeRoundedRect', 'beginPath', 'moveTo', 'lineTo', 'strokePath', 'closePath', 'lineBetween', 'arc']) {
    if (!Graphics.prototype[name]) Graphics.prototype[name] = function(...args) { this.draws.push({ shape: name, args }); return this; };
  }
  function make(checkpoint, { query = search, campaign = base.campaign, scenarioId = 'gettysburg', choiceId = 'option_a', reducedMotion = false, all = true } = {}) {
    base.windowState.location.search = query;
    const scene = new base.Scene(scenarioId, campaign, choiceId, null, () => {}, null, null, checkpoint);
    for (const name of ['textures', 'add', 'shadows', 'smoke', 'dust', 'cameras']) scene[name] = donor.scene[name];
    scene.infantryClips = accepted.modules.prepareGettysburgInfantryClips(
      accepted.modules.gettysburgInfantryClipDefinitions(scenarioId, query, accepted.textures),
      (key, frame) => accepted.textures.exists(key) && accepted.textures.get(key).has(frame));
    scene.reducedMotion = reducedMotion;
    scene.add.graphics = () => new Graphics(); scene.selection = new Graphics(); scene.onBattleSnapshot = () => {};
    if (all) for (const formation of scene.engine.snapshot({ presentation: true }).formations) scene.createFormation(formation);
    scene.setSelected('pickett-division');
    return scene;
  }
  return { ...base, modules: accepted.modules, textures: accepted.textures, source: sceneSource, before, make };
}

export function drawAll(scene) {
  const snapshot = scene.engine.snapshot({ presentation: true });
  const time = snapshot.time + (scene.engine.resolutionTime || 0), resolving = snapshot.resolving || snapshot.outcome !== 'undecided';
  scene.shadows.clear(); scene.smoke.clear(); scene.dust.clear();
  const samples = scene.contactLayoutEnabled ? scene.prepareContactLayout(snapshot, time, resolving) : null;
  for (const formation of snapshot.formations) {
    const foe = formation.inMelee && snapshot.formations.find(unit => unit.id === formation.meleeWith);
    const presented = foe ? { ...formation, contactFacing: Math.atan2(foe.y - formation.y, foe.x - formation.x) } : formation;
    scene.syncFormation(presented, time, resolving, snapshot.sortieTargetsHit, samples?.get(formation.id));
  }
}
export function fullFacts(harness, scene) {
  const display = value => value ? { x: value.x, y: value.y, depth: value.depth,
    scaleX: value.scaleX, scaleY: value.scaleY, visible: value.visible, alpha: value.alpha, input: value.input.enabled } : null;
  return plain({ formations: scene.engine.snapshot({ presentation: true }).formations.map(formation => {
    const view = scene.views.get(formation.id), facts = harness.facts(view);
    return { id: formation.id,
      raw: view.visual.output,
      figures: view.visual.figures.map(figure => ({ id: figure.id, slot: figure.slot, alive: figure.alive,
        fallen: figure.fallen, stepDistance: figure.stepDistance ?? 0, localMoving: figure.localMoving ?? false })),
      bodies: facts.soldiers.map(body => body.visible ? body : { visible: false }),
      shots: view.shots, carrier: view.standardAnchorId ?? null, standard: display(view.standard), standardUI: display(view.standardUI),
      flag: { angle: view.flag.angle, scaleX: view.flag.scaleX, scaleY: view.flag.scaleY } };
  }), graphics: { shadows: scene.shadows.draws, smoke: scene.smoke.draws, dust: scene.dust.draws },
  combat: scene.engine.checkpoint() });
}
export function nativeFacts(harness, scene) {
  return fullFacts(harness, scene).formations.map(({ id, bodies }) => ({ id, bodies }));
}
export function changedBodies(left, right) {
  return left.formations.flatMap((formation, i) => {
    const ids = formation.bodies.flatMap((body, j) => hash(body) === hash(right.formations[i].bodies[j]) ? [] : [j]);
    return ids.length ? [{ id: formation.id, bodyIds: ids }] : [];
  });
}
export function assertRawUnchanged(left, right, message = 'renderer changes preserve raw facts') {
  const raw = value => plain({ formations: value.formations.map(({ id, raw, figures, shots, carrier, standard, standardUI, flag }) =>
    ({ id, raw, figures, shots, carrier, standard, standardUI, flag })), graphics: value.graphics, combat: value.combat });
  assert.deepEqual(raw(left), raw(right), message);
}
