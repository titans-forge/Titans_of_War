import assert from 'node:assert/strict';
import { BATTLE_GUIDE_STEPS, battleGuideReducer, createBattleGuide, guideSpeed, reserveGuidance } from '../src/battle/battleGuide.js';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';

assert.deepEqual(BATTLE_GUIDE_STEPS.map((step) => step.title), ['Select a formation', 'Move deliberately', 'Hold the line', 'Commit a reserve']);
assert.equal(createBattleGuide(false).open, true);
assert.equal(createBattleGuide(false, null).open, true);
assert.equal(createBattleGuide(true).open, false, 'Dismissed guide must not auto-open');
assert.equal(createBattleGuide(false, { first_manassas: { result: 'decisive-win' } }).open, false, 'Existing battle history skips automatic onboarding');

for (let step = 0; step < BATTLE_GUIDE_STEPS.length; step += 1) {
  const state = Object.freeze({ open: true, step });
  const dismissed = battleGuideReducer(state, 'dismiss');
  assert.equal(dismissed.open, false, 'Every step can be dismissed without performing an order');
  assert.deepEqual(battleGuideReducer(dismissed, 'open'), state, 'Reopen preserves the reading position');
  for (const speed of [0, 1, 2, 4]) {
    assert.equal(guideSpeed(state, speed), 0, 'Reading always pauses simulation');
    assert.equal(guideSpeed(dismissed, speed), speed);
  }
}
let state = createBattleGuide(false);
assert.equal(battleGuideReducer(state, 'back').step, 0);
for (let step = 1; step < BATTLE_GUIDE_STEPS.length; step += 1) {
  state = battleGuideReducer(state, 'next');
  assert.deepEqual(state, { open: true, step });
}
state = battleGuideReducer(state, 'next');
assert.deepEqual(state, { open: false, step: 3 });
assert.equal(battleGuideReducer(state, 'next').step, 3);
assert.equal(battleGuideReducer(state, 'back').step, 2);
assert.equal(battleGuideReducer(state, 'unknown'), state);

const active = Object.freeze({ id: 'hampton-reserve', name: 'Hampton Reserve', side: 'confederate', active: true, status: 'steady' });
const arriving = Object.freeze({ id: 'reinforcement', name: 'Later Brigade', side: 'confederate', active: false, arrivalTime: 12, status: 'steady' });
assert.match(reserveGuidance([active]), /Hampton Reserve is on the field/);
assert.match(reserveGuidance([arriving], 7.5), /arrives in 5 field minutes/);
assert.match(reserveGuidance([arriving], 20), /arrives in 0 field minutes/);
assert.match(reserveGuidance([{ ...active, side: 'union' }]), /No separate available reserve/);
assert.match(reserveGuidance([{ ...active, status: 'routing' }]), /No separate available reserve/);
assert.match(reserveGuidance([{ ...active, active: false }]), /No separate available reserve/);
assert.match(reserveGuidance([]), /when the field is ready/);

const engine = new CivilWarBattleEngine('first_manassas', {}, 'option_b');
const before = engine.snapshot();
reserveGuidance(before.formations, before.time);
let reading = createBattleGuide(false);
for (let step = 0; step < 4; step += 1) {
  engine.tick(0.05 * guideSpeed(reading, 4));
  reading = battleGuideReducer(reading, 'next');
}
assert.deepEqual(engine.snapshot(), before, 'Reading the guide changes no mechanics, orders, resources, or field time');
console.log('Battle guide checks passed: first-use policy, four steps, dismiss/reopen, pause, reserves, and unchanged mechanics.');
