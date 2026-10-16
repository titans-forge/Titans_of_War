import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { regressionModules, regressionHarness } from './gettysburgV30Regression.mjs';
import { ContactLayoutPresentation } from '../../src/battle/contactLayoutPresentation.js';
import { closeCombatDistance, closeCombatPairs } from '../../src/battle/closeCombat.js';

export const plain = value => JSON.parse(JSON.stringify(value));
export const query = (profile = 'moderate', enabled = true, contact = false) =>
  `?artPass=gettysburg-v32&infantryScale=${profile}${enabled ? '&standardContinuity=v34' : ''}${contact ? '&contactLayout=v33' : ''}`;
export const current = (scene, id) => scene.engine.snapshot({ presentation: true }).formations.find(unit => unit.id === id);

// Import actual candidate production modules. The protected older harnesses
// and authentic archived Scene bytes stay unchanged.
export async function standardHarness(root, before = false) {
  const standard = await import(pathToFileURL(`${root}/src/battle/gettysburgStandardCheckpoint.js`));
  const modules = { ...await regressionModules(root), ...standard, ContactLayoutPresentation };
  const source = readFileSync(`${root}/${before ? 'scripts/test-support/gettysburg-v34-before/' : ''}src/battle/CivilWarBattlefield.jsx`, 'utf8');
  const base = regressionHarness(root, modules, source, query());
  const atlases = new Map(base.atlases);
  for (const side of ['union', 'confederate']) {
    for (const page of modules.DETAILED_UNIT_PAGES) atlases.set(`${side}-detailed-${page}`,
      JSON.parse(readFileSync(`${root}/public/images/units/detailed-v2/${side}-${page}.json`)));
    atlases.set(`${side}-realistic`, JSON.parse(readFileSync(`${root}/public/images/units/realistic-v1/${side}-infantry.json`)));
    atlases.set(`${side}-aim-realistic`, JSON.parse(readFileSync(`${root}/public/images/units/realistic-v1/${side}-aim.json`)));
  }
  const textures = modules.gettysburgClipTestTextures(atlases);
  base.renderingTextures.exists = key => textures.exists(key);
  base.renderingTextures.get = key => textures.get(key);
  const make = (search = query(), side = 'union', direction = 0, checkpoint = null) => base.make(search, side, direction, textures, checkpoint);
  return { ...base, make, modules, textures, atlases, source, before };
}

export function drawPair(value, resolving = false) {
  const { scene } = value, snapshot = scene.engine.snapshot({ presentation: true });
  const time = snapshot.time + (scene.engine.resolutionTime || 0);
  scene.shadows.clear(); scene.smoke.clear(); scene.dust.clear();
  const samples = scene.contactLayoutEnabled ? scene.prepareContactLayout(snapshot, time, resolving) : null;
  for (const id of value.ids) {
    const formation = snapshot.formations.find(unit => unit.id === id);
    const foe = formation.inMelee && snapshot.formations.find(unit => unit.id === formation.meleeWith);
    const presented = foe ? { ...formation, contactFacing: Math.atan2(foe.y - formation.y, foe.x - formation.x) } : formation;
    scene.syncFormation(presented, time, resolving, [], samples?.get(id));
  }
}

export function publicPair(harness, { direction = 1, profile = 'moderate', enabled = true, contact = false, reducedMotion = false } = {}) {
  const search = query(profile, enabled, contact), donor = harness.make(search, 'confederate', (direction + 4) % 8);
  const scene = new harness.Scene('gettysburg', harness.campaign, 'option_a', null, () => {});
  for (const name of ['textures', 'infantryClips', 'add', 'shadows', 'smoke', 'dust', 'cameras']) scene[name] = donor.scene[name];
  scene.reducedMotion = reducedMotion;
  const confederate = scene.engine.state.find(unit => unit.id === 'pickett-division');
  const union = scene.engine.state.find(unit => unit.id === 'gibbon-center');
  assert.equal(scene.engine.time, 0); assert.ok(!union.inMelee && !confederate.inMelee);
  for (const id of [confederate.id, union.id]) scene.createFormation(current(scene, id));
  scene.setSelected(confederate.id);
  return { scene, union, confederate, ids: [confederate.id, union.id], direction, profile, search, reducedMotion };
}

export function coldPair(harness, value, saved, search = value.search) {
  const donor = harness.make(search, 'confederate', (value.direction + 4) % 8, plain(saved));
  const { scene } = donor;
  scene.reducedMotion = value.reducedMotion ?? false;
  for (const id of value.ids) if (!scene.views.has(id)) scene.createFormation(current(scene, id));
  return { ...value, search, scene, union: scene.engine.state.find(unit => unit.id === value.union.id),
    confederate: scene.engine.state.find(unit => unit.id === value.confederate.id) };
}

// These controlled placements and strength edits are synthetic diagnostics.
// The actual engine resolver establishes mutual contact and losses.
export function controlledPair(harness, options = {}) {
  const value = publicPair(harness, options), { scene, union, confederate, direction } = value;
  const theta = direction * Math.PI / 4;
  for (const unit of scene.engine.state) if (!value.ids.includes(unit.id)) unit.active = false;
  for (const [unit, facing] of [[union, theta], [confederate, theta + Math.PI]]) Object.assign(unit,
    { strength: 3000, initialStrength: 3000, morale: 90, cohesion: 90, fatigue: 0, status: 'steady', order: 'hold',
      formationMode: 'line', frontage: 150, ammunition: 0, active: true, arrivalTime: null, reload: 0, lastVolleyAt: null,
      facing, inMelee: false, meleeWith: null });
  Object.assign(union, { x: 400, y: 400 });
  Object.assign(confederate, { x: 400 + 100 * Math.cos(theta), y: 400 + 100 * Math.sin(theta) });
  const radius = closeCombatDistance(union, confederate);
  Object.assign(confederate, { x: 400 + (radius - 1) * Math.cos(theta), y: 400 + (radius - 1) * Math.sin(theta) });
  assert.equal(closeCombatPairs(scene.engine).length, 1);
  scene.views.clear();
  for (const id of value.ids) scene.createFormation(current(scene, id));
  drawPair(value); scene.engine.tick(.05); drawPair(value);
  assert.ok(union.inMelee && confederate.inMelee && union.strength < 3000 && confederate.strength < 3000);
  return value;
}

export function advance(value, seconds, resolving = false) {
  for (let step = 0; step < Math.round(seconds / .05); step++) { value.scene.engine.tick(.05); drawPair(value, resolving); }
}

// Authentic untouched-roster public Move/Assault schedule. A nominal bound
// avoids the prior exact-floating-time loop failure; engine-produced time is
// asserted with an epsilon only for the target, never for rendering values.
export function source104(harness, options = {}) {
  const value = publicPair(harness, options); drawPair(value);
  value.scene.previewDestination({ x: 650, y: 600 }); value.scene.confirmMove(); value.scene.setSpeed(1);
  while (value.scene.engine.time < 63 - 1e-6) { value.scene.engine.tick(.05); drawPair(value); }
  value.scene.setSpeed(0); value.scene.issueOrder('assault', { sectorId: 'left' }); value.scene.setSpeed(1);
  let contactAt = null;
  for (let step = 0; value.scene.engine.time < 104.05 - 1e-6 && step < 2200; step++) {
    const before = value.scene.engine.time; value.scene.engine.tick(.05); drawPair(value);
    assert.ok(value.scene.engine.time > before);
    if (contactAt === null && value.union.inMelee && value.confederate.inMelee) contactAt = value.scene.engine.time;
  }
  assert.ok(Math.abs(value.scene.engine.time - 104.05) < 1e-6);
  assert.ok(contactAt !== null && value.union.active && value.confederate.active);
  value.scene.setSpeed(0); drawPair(value);
  return { ...value, contactAt };
}

export function standardFacts(value) {
  const display = layer => layer ? { x: layer.x, y: layer.y, depth: layer.depth,
    scaleX: layer.scaleX, scaleY: layer.scaleY, visible: layer.visible, alpha: layer.alpha, interactive: layer.input.enabled } : null;
  return plain(value.ids.map(id => { const view = value.scene.views.get(id);
    return { id, carrierId: view.standardAnchorId ?? null, standard: display(view.standard), standardUI: display(view.standardUI) }; }));
}

export function rawFacts(value) {
  return plain(value.ids.map(id => { const view = value.scene.views.get(id); return { id,
    feet: view.visual.output.figures.map(f => f.visible ? { id: f.id, visible: true, x: f.x, y: f.y, fallen: f.fallen,
      action: f.action, frame: f.frame } : { id: f.id, visible: false }),
    // Explicit canonical field order preserves every number without rounding.
    figures: view.visual.figures.map(f => ({ id: f.id, alive: f.alive, slot: f.slot, fallen: f.fallen === null ? null :
      { x: f.fallen.x, y: f.fallen.y, time: f.fallen.time, facing: f.fallen.facing, scale: f.fallen.scale } })),
    footprint: view.footprint, shots: view.shots }; }));
}

export function bodyFacts(harness, value) {
  return plain(value.ids.map(id => { const facts = harness.facts(value.scene.views.get(id)); return { id,
    // The inherited renderer keeps stale transforms on expired invisible
    // sprites. Compare their visibility, and every field of visible sprites.
    soldiers: facts.soldiers.map(body => body.visible ? body : { visible: false }), shots: facts.shots }; }));
}

export const graphicsFacts = value => plain({ shadows: value.scene.shadows.draws, smoke: value.scene.smoke.draws, dust: value.scene.dust.draws });
