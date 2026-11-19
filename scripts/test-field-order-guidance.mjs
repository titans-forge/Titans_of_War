import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { fieldOrderGuidance } from '../src/battle/fieldOrderGuidance.js';
import { battleLocations } from '../src/battle/battleLocations.js';
import { createPracticeState } from '../src/game/practiceConditions.js';

function setup(id, choiceId) {
  const state = createPracticeState({ id }, 'reserve', 'full');
  const engine = new CivilWarBattleEngine(id, state, choiceId);
  const check = (expected, location) => {
    const checkpoint = engine.checkpoint();
    const current = engine.snapshot();
    const cue = fieldOrderGuidance(current, choiceId);
    assert.equal(cue?.short, expected);
    assert.equal(cue?.locationId, location);
    assert.ok(battleLocations(current).some(site => site.id === cue.locationId));
    assert.deepEqual(engine.checkpoint(), checkpoint);
  };
  return { engine, check };
}

function until(engine, condition) {
  for (let step = 0; step < 2100 && engine.outcome === 'undecided' && !condition(); step += 1) engine.tick(.15);
  assert.ok(condition());
}

test('Kennesaw waits for the battery’s order before releasing the screen', () => {
  const { engine, check } = setup('kennesaw_mountain', 'option_b');
  const mission = () => engine.fieldBattle.kennesaw;
  check('Move Mebane’s battery', 'Sector:right');
  assert.equal(engine.move('kennesaw-mebane', { x: 1155, y: 695 }), true);
  check('Let Mebane’s battery arrive', 'Sector:right');
  until(engine, () => mission().held === 6 && mission().gunsReachedRoad);
  check('Withdraw Mebane first', 'Sector:right');
  assert.equal(engine.order('kennesaw-mebane', 'withdraw'), true);
  check('Keep the rear guard in place', 'Sector:center');
  until(engine, () => mission().gunsLeading);
  check('Withdraw Maney', 'Sector:right');
});

test('Vicksburg names the breach, deployment, and covered fallback in their live order', () => {
  const attack = setup('vicksburg', 'option_a');
  attack.check('Assault with Waul', 'Sector:center');
  assert.equal(attack.engine.order('vicksburg-waul', 'assault', { sectorId: 'center' }), true);
  attack.check('Let Waul arrive', 'Sector:center');

  const fallback = setup('vicksburg', 'option_b');
  const { engine, check } = fallback;
  check('Move the field guns', 'Sector:left');
  until(engine, () => engine.fieldBattle.vicksburg.covered);
  assert.equal(engine.move('vicksburg-battery', { x: 402, y: 587 }), true);
  until(engine, () => engine.fieldBattle.vicksburg.screened);
  check('Move the 30th Alabama', 'Sector:left');
});

test('Sailor’s Creek cues reconstruct from the saved engine state and disappear at resolution', () => {
  const { engine, check } = setup('sailors_creek', 'option_b');
  check('Withdraw Custis Lee first', 'Sector:left');
  assert.equal(engine.order('sailors-lee', 'withdraw'), true);
  check('Withdraw the casualty escort', 'Sector:left');
  assert.equal(engine.order('sailors-escort', 'withdraw'), true);
  check('Keep Kershaw on the bank', 'Sector:center');
  until(engine, () => engine.fieldBattle.sailorsCreek.screened);
  check('Withdraw Kershaw', 'Sector:left');
  const restored = CivilWarBattleEngine.fromCheckpoint(JSON.parse(JSON.stringify(engine.checkpoint())),
    engine.scenarioId, createPracticeState({ id: engine.scenarioId }, 'reserve', 'full'), engine.choiceId);
  assert.deepEqual(fieldOrderGuidance(restored.snapshot(), engine.choiceId), fieldOrderGuidance(engine.snapshot(), engine.choiceId));
  assert.equal(engine.order('sailors-kershaw', 'withdraw'), true);
  until(engine, () => engine.outcome !== 'undecided' || engine.pendingOutcome !== null);
  assert.equal(fieldOrderGuidance(engine.snapshot(), engine.choiceId), null);
});

test('unrelated or inactive missions have no authored cue', () => {
  const engine = new CivilWarBattleEngine('gettysburg', createPracticeState({ id: 'gettysburg' }), 'option_a');
  assert.equal(fieldOrderGuidance(engine.snapshot(), 'option_a'), null);
  assert.equal(fieldOrderGuidance(null, 'option_a'), null);
});
