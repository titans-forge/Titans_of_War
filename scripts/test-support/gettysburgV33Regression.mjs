import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { regressionModules, regressionHarness } from './gettysburgV30Regression.mjs';
import { closeCombatDistance, closeCombatPairs } from '../../src/battle/closeCombat.js';
import { ContactLayoutPresentation } from '../../src/battle/contactLayoutPresentation.js';

export const plain = value => JSON.parse(JSON.stringify(value));
export const query = (profile = 'moderate', enabled = true) => `?artPass=gettysburg-v32&infantryScale=${profile}${enabled ? '&contactLayout=v33' : ''}`;
export const current = (scene, id) => scene.engine.snapshot({ presentation: true }).formations.find(unit => unit.id === id);
// Real Phaser JSONHash/Frame parsing at the texture boundary; Display remains
// a synthetic command recorder. These are current-Scene tests, not GPU play.
export async function layoutHarness(root, before = false) {
  const modules = { ...await regressionModules(root), ContactLayoutPresentation };
  const source = readFileSync(`${root}/${before ? 'scripts/test-support/gettysburg-v33-before/' : ''}src/battle/CivilWarBattlefield.jsx`, 'utf8');
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
  const scene = value.scene, snapshot = scene.engine.snapshot({ presentation: true });
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
// Controlled placement is explicitly synthetic; the real resolver establishes
// contact and both losses. The separate public route never injects positions.
export function controlledPair(harness, direction = 1, profile = 'moderate', enabled = true) {
  const donor = harness.make(query(profile, enabled), 'confederate', (direction + 4) % 8);
  const scene = donor.scene, confederate = donor.unit;
  const union = scene.engine.state.find(unit => unit.side === 'union' && unit.type === 'infantry' && unit.active);
  const theta = direction * Math.PI / 4;
  for (const unit of scene.engine.state) if (![union.id, confederate.id].includes(unit.id)) unit.active = false;
  for (const [unit, facing] of [[union, theta], [confederate, theta + Math.PI]]) Object.assign(unit,
    { strength: 3000, initialStrength: 3000, morale: 90, cohesion: 90, fatigue: 0, status: 'steady', order: 'hold',
      formationMode: 'line', frontage: 150, ammunition: 0, active: true, arrivalTime: null, reload: 0, lastVolleyAt: null,
      facing, inMelee: false, meleeWith: null });
  Object.assign(union, { x: 400, y: 400 });
  Object.assign(confederate, { x: 400 + 100 * Math.cos(theta), y: 400 + 100 * Math.sin(theta) });
  const radius = closeCombatDistance(union, confederate);
  Object.assign(confederate, { x: 400 + (radius - 1) * Math.cos(theta), y: 400 + (radius - 1) * Math.sin(theta) });
  assert.equal(closeCombatPairs(scene.engine).length, 1, 'Actual initial opposing contact pair');
  scene.views.clear();
  for (const id of [confederate.id, union.id]) scene.createFormation(current(scene, id));
  const value = { scene, union, confederate, ids: [confederate.id, union.id], direction, profile, search: query(profile, enabled) };
  drawPair(value); scene.engine.tick(.05); drawPair(value);
  assert.ok(union.inMelee && confederate.inMelee && union.strength < 3000 && confederate.strength < 3000);
  return value;
}
export function coldPair(harness, value, saved) {
  const donor = harness.make(value.search, 'confederate', (value.direction + 4) % 8, plain(saved));
  const scene = donor.scene;
  for (const id of value.ids) if (!scene.views.has(id)) scene.createFormation(current(scene, id));
  return { ...value, scene, union: scene.engine.state.find(unit => unit.id === value.union.id),
    confederate: scene.engine.state.find(unit => unit.id === value.confederate.id) };
}
export const pairFacts = (harness, value) => plain(value.ids.map(id => harness.facts(value.scene.views.get(id))));
// Expired invisible Display objects retain stale fields in the inherited Scene.
// Visible body/state/shot assertions remain exact; no epsilon is used here.
export const visibleFacts = facts => facts.map(army => ({ ...army, soldiers: army.soldiers.map(body => body.visible ? body : { visible: false }) }));
export function samples(value) {
  const snapshot = value.scene.engine.snapshot({ presentation: true });
  return value.scene.prepareContactLayout(snapshot, snapshot.time + (value.scene.engine.resolutionTime || 0), false);
}
export function publicPair(harness, direction = 1, profile = 'moderate', enabled = true) {
  const search = query(profile, enabled); const donor = harness.make(search, 'confederate', (direction + 4) % 8);
  const scene = new harness.Scene('gettysburg', harness.campaign, 'option_a', null, () => {});
  for (const name of ['textures', 'infantryClips', 'add', 'shadows', 'smoke', 'dust', 'cameras']) scene[name] = donor.scene[name];
  const confederate = scene.engine.state.find(unit => unit.id === 'pickett-division');
  const union = scene.engine.state.find(unit => unit.id === 'gibbon-center');
  assert.equal(scene.engine.time, 0); assert.ok(!union.inMelee && !confederate.inMelee);
  for (const id of [confederate.id, union.id]) scene.createFormation(current(scene, id)); scene.setSelected(confederate.id);
  return { scene, union, confederate, ids: [confederate.id, union.id], direction, profile, search };
}
export function routeToContact(value) {
  const destinations = value.direction === 5 ? [{ x: 150, y: 600 }, { x: 150, y: 150 }, { x: 350, y: 230 }] : [{ x: 650, y: 600 }];
  const initial = [value.union.strength, value.confederate.strength];
  for (const destination of destinations) {
    value.scene.setSpeed(0); value.scene.previewDestination(destination); value.scene.confirmMove();
    assert.equal(value.confederate.pendingCommand.order, 'move'); value.scene.setSpeed(1);
    for (let step = 0; step < 3000 && Math.hypot(value.confederate.x - destination.x, value.confederate.y - destination.y) >= 3; step++) {
      value.scene.engine.tick(.05); drawPair(value);
    }
    assert.ok(Math.hypot(value.confederate.x - destination.x, value.confederate.y - destination.y) < 3);
  }
  value.scene.issueOrder('assault', { sectorId: 'left' });
  for (let step = 0; step < 1600; step++) {
    value.scene.engine.tick(.05); drawPair(value);
    if (value.union.inMelee && value.confederate.inMelee && value.union.meleeWith === value.confederate.id) {
      assert.ok(value.union.strength < initial[0] && value.confederate.strength < initial[1]);
      return value.scene.engine.time;
    }
  }
  assert.fail('Untouched roster public Scene route failed to reach mutual contact');
}
