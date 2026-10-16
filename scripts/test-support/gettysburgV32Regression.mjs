import assert from 'node:assert/strict';
import { closeCombatDistance } from '../../src/battle/closeCombat.js';

export const plain = value => JSON.parse(JSON.stringify(value));
export const query = (profile = 'baseline', pass = 'gettysburg-v32') => `?artPass=${pass}&infantryScale=${profile}`;
export const contract = (direction, action) => {
  const cardinal = direction === 1 ? 'se' : 'nw', role = action === 'melee' ? 'contact' : 'casualty';
  return { key: `union-gettysburg-v32-b-${role}-${cardinal}`, cardinal, role,
    marker: action === 'melee' ? 'nativeContactSequence' : 'nativeCasualtySequence',
    sequence: `gettysburg-v32-union-b-${cardinal}-${role}` };
};
export const current = (scene, id) => scene.engine.snapshot({ presentation: true }).formations.find(unit => unit.id === id);
export function drawPair(value, resolving = false) {
  const snapshot = value.scene.engine.snapshot({ presentation: true });
  value.scene.smoke.clear(); value.scene.shadows.clear(); value.scene.dust.clear();
  for (const id of value.ids) {
    const formation = snapshot.formations.find(unit => unit.id === id);
    const foe = formation.inMelee && snapshot.formations.find(unit => unit.id === formation.meleeWith);
    value.scene.syncFormation(foe ? { ...formation, contactFacing: Math.atan2(foe.y - formation.y, foe.x - formation.x) } : formation,
      value.scene.engine.time + (value.scene.engine.resolutionTime || 0), resolving, []);
  }
}
export const pairFacts = (harness, value) => plain(value.ids.map(id => harness.facts(value.scene.views.get(id))));
export const visibleFacts = armies => armies.map(army => ({ ...army, soldiers: army.soldiers.map(body => body.visible ? body : { visible: false }) }));
export function coldPair(harness, saved, original) {
  const donor = harness.make(original.search, 'confederate', (original.direction + 4) % 8, undefined, plain(saved));
  const scene = donor.scene;
  for (const id of original.ids) if (!scene.views.has(id)) scene.createFormation(current(scene, id));
  return { ...original, scene, confederate: scene.engine.state.find(unit => unit.id === original.confederate.id),
    union: scene.engine.state.find(unit => unit.id === original.union.id) };
}
// Controlled two-unit action fixture, not a public maneuver or pixel renderer.
export function syntheticPair(harness, profile = 'baseline', pass = 'gettysburg-v32', fall = false, direction = 5) {
  const search = query(profile, pass), donor = harness.make(search, 'confederate', (direction + 4) % 8);
  const scene = donor.scene, confederate = donor.unit;
  const union = scene.engine.state.find(unit => unit.side === 'union' && unit.type === 'infantry' && unit.active);
  for (const unit of scene.engine.state) if (![confederate.id, union.id].includes(unit.id)) unit.active = false;
  for (const unit of [confederate, union]) Object.assign(unit, { strength: 3000, initialStrength: 3000, morale: 90, cohesion: 90,
    fatigue: 0, status: 'steady', order: 'hold', formationMode: 'line', frontage: 150, ammunition: 0, active: true,
    arrivalTime: null, reload: 0, lastVolleyAt: null, facing: (unit === union ? direction : (direction + 4) % 8) * Math.PI / 4,
    inMelee: true, meleeWith: unit === union ? confederate.id : union.id });
  Object.assign(union, { x: 400, y: 400 });
  const sign = direction === 1 ? 1 : -1;
  // Clearance depends on the centers' bearing as well as both facings. Set
  // that bearing before measuring, rather than using the untouched roster.
  Object.assign(confederate, { x: 400 + sign * 100, y: 400 + sign * 100 });
  const separation = (closeCombatDistance(confederate, union) - 1) / Math.SQRT2;
  Object.assign(confederate, { x: 400 + sign * separation, y: 400 + sign * separation });
  scene.speed = 1; scene.views.clear();
  for (const unit of [confederate, union]) scene.createFormation(current(scene, unit.id));
  const value = { scene, union, confederate, ids: [confederate.id, union.id], search, direction }; drawPair(value);
  if (fall) {
    for (const unit of [confederate, union]) { unit.inMelee = false; unit.meleeWith = null; } drawPair(value);
    for (const unit of [confederate, union]) unit.strength *= .5; drawPair(value);
  }
  return value;
}
export function isolated(harness, search, side, direction, state, loaded, checkpoint) {
  const value = harness.make(search, side, direction, loaded, checkpoint); value.scene.speed = 1;
  if (!checkpoint) {
    if (state === 'ready') Object.assign(value.unit, { lastVolleyAt: 0, reload: 0, status: 'idle' });
    if (state === 'reload') Object.assign(value.unit, { lastVolleyAt: 5, reload: 6, status: 'firing' });
    if (state === 'melee') Object.assign(value.unit, { lastVolleyAt: 0, reload: 0, inMelee: true, status: 'fighting' });
    if (state === 'walk') Object.assign(value.unit, { lastVolleyAt: 0, reload: 0, status: 'moving', destination: { x: value.unit.x + 100, y: value.unit.y } });
    if (state === 'fall') { value.draw(); value.unit.strength *= .5; }
  }
  value.view = value.draw(); return value;
}
export function publicPair(harness, search, direction) {
  const donor = harness.make(search, 'confederate', (direction + 4) % 8);
  const scene = new harness.Scene('gettysburg', harness.campaign, 'option_a', null, () => {});
  for (const field of ['textures', 'infantryClips', 'add', 'shadows', 'smoke', 'dust', 'cameras']) scene[field] = donor.scene[field];
  const confederate = scene.engine.state.find(unit => unit.id === 'pickett-division');
  const union = scene.engine.state.find(unit => unit.id === 'gibbon-center');
  assert.equal(scene.engine.time, 0); assert.ok(!union.inMelee && !confederate.inMelee);
  for (const id of [confederate.id, union.id]) scene.createFormation(current(scene, id)); scene.setSelected(confederate.id);
  return { scene, confederate, union, ids: [confederate.id, union.id], search, direction };
}
