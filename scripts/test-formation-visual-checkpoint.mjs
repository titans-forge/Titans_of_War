import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { BATTLE_ENGINE_CONFIGS } from '../src/battle/battleDefinitions.js';
import { createFormationVisual, updateFormationVisual } from '../src/battle/formationVisualState.js';
import { createFormationVisualCheckpoint, restoreFormationVisualFromCheckpoint } from '../src/battle/formationVisualCheckpoint.js';

const json = value => JSON.parse(JSON.stringify(value));
const livingIds = state => state.figures.filter(figure => figure.alive).map(figure => figure.id);
const deadIds = state => state.figures.filter(figure => !figure.alive).map(figure => figure.id);
const visualTime = engine => engine.time + (engine.resolutionTime || 0);
const getFormation = (engine, id) => engine.snapshot({ presentation: true }).formations.find(formation => formation.id === id);
const capture = (formation, state, time) => json(createFormationVisualCheckpoint([formation], new Map([[formation.id, state]]), time));
const fixture = overrides => ({ id: 'checkpoint-fixture', side: 'union', type: 'infantry', active: true,
  x: 500, y: 400, facing: Math.PI / 2, frontage: 220, formationMode: 'line',
  strength: 100, initialStrength: 100, status: 'steady', order: 'hold',
  engagedWith: null, lastVolleyAt: -Infinity, reload: 0,
  footprint: { width: 124, depth: 32 }, ...overrides });

test('public Gettysburg casualties and column reform retain survivor IDs through JSON resume and subsequent real losses', () => {
  const campaign = { battleRulesVersion: 17 };
  const original = new CivilWarBattleEngine('gettysburg', campaign, 'option_a');
  const id = 'pickett-division';
  const state = createFormationVisual(getFormation(original, id), 32);
  updateFormationVisual(state, getFormation(original, id), 0, .82);
  for (const formation of original.state.filter(unit => unit.side === 'confederate' && unit.active)) original.order(formation.id, 'advance');
  let reformed = false;
  for (let step = 0; step < 300; step += 1) {
    original.tick(.2);
    updateFormationVisual(state, getFormation(original, id), visualTime(original), .82);
    if (!reformed && livingIds(state).length < 32) { original.setFormation(id, 'column'); reformed = true; }
    if (reformed && livingIds(state).length <= 30) break;
  }
  assert.equal(reformed, true);
  assert.deepEqual(deadIds(state), [3, 4], 'the scenario must exercise the previously observed identity defect');
  const formation = getFormation(original, id);
  assert.equal(formation.formationMode, 'column');
  const engineCheckpoint = original.checkpoint();
  const presentation = capture(formation, state, visualTime(original));
  assert.deepEqual(original.checkpoint(), engineCheckpoint, 'presentation capture cannot mutate combat');
  const resumed = CivilWarBattleEngine.fromCheckpoint({ ...json(engineCheckpoint), presentation }, 'gettysburg', campaign, 'option_a');
  assert.deepEqual(resumed.checkpoint(), engineCheckpoint, 'the renderer section is not engine state');
  const recreated = createFormationVisual(getFormation(resumed, id), 32, visualTime(resumed));
  assert.deepEqual(deadIds(recreated), [1, 3], 'legacy reconstruction alone would swap survivors');
  const restored = restoreFormationVisualFromCheckpoint(getFormation(resumed, id), 32, visualTime(resumed), presentation);
  assert.deepEqual(livingIds(restored), livingIds(state));
  const paused = updateFormationVisual(restored, getFormation(resumed, id), visualTime(resumed), .82);
  assert.deepEqual(paused, state.output, 'the first paused resume rebuilds the same pose without cached output');
  let furtherLoss = false;
  for (let step = 0; step < 600; step += 1) {
    original.tick(.2); resumed.tick(.2);
    const a = updateFormationVisual(state, getFormation(original, id), visualTime(original), .82);
    const b = updateFormationVisual(restored, getFormation(resumed, id), visualTime(resumed), .82);
    assert.deepEqual(b, a);
    assert.deepEqual(resumed.checkpoint(), original.checkpoint());
    if (deadIds(state).length > 2) { furtherLoss = true; break; }
  }
  assert.equal(furtherLoss, true, 'continuation must encounter another actual casualty');
});

test('mid-reformation slots, fallen world anchors, and loss timers survive while output and opaque objects are excluded', () => {
  const initial = fixture({ engagedWith: 'enemy' });
  const state = createFormationVisual(initial, 32);
  updateFormationVisual(state, initial, 0, .82);
  const hurt = { ...initial, strength: 75 };
  updateFormationVisual(state, hurt, .1, .82);
  const column = { ...hurt, formationMode: 'column', frontage: 40, footprint: { width: 40, depth: 120 } };
  updateFormationVisual(state, column, .2, .82);
  assert.equal(state.assembling, true);
  assert.ok(state.figures.some(figure => figure.localMoving));
  state.opaque = new Map([['Phaser', 'must not be saved']]);
  const before = structuredClone(state);
  const saved = capture(column, state, .2);
  assert.equal(JSON.stringify(saved).includes('Phaser'), false);
  assert.equal(Object.hasOwn(saved.formations[0].state, 'output'), false);
  assert.equal(Object.hasOwn(saved.formations[0].state, 'opaque'), false);
  const restored = restoreFormationVisualFromCheckpoint(column, 32, .2, saved);
  assert.deepEqual(restored.figures, before.figures);
  assert.equal(restored.lastLoss, before.lastLoss);
  assert.equal(restored.lastContact, before.lastContact);
  assert.equal(restored.assembling, before.assembling);
  const paused = updateFormationVisual(restored, column, .2, .82);
  assert.deepEqual(paused, state.output);
  for (const time of [.3, .8, 1.4, 3.5]) {
    const formation = { ...column, strength: time >= 1.4 ? 60 : 75, x: time >= .8 ? 510 : 500 };
    assert.deepEqual(updateFormationVisual(restored, formation, time, .82), updateFormationVisual(state, formation, time, .82));
  }
  assert.equal(restored.figures.filter(figure => figure.alive).length, 19);
  assert.deepEqual(state.opaque, before.opaque, 'capture and restore do not mutate the source state');
});

test('paused movement, turn-only movement, routing spread, and legacy reduced-motion headings rebuild from primitive facts', () => {
  for (const kind of ['march', 'turn', 'route', 'legacy-reduced']) {
    const initial = fixture(kind === 'legacy-reduced' ? { footprint: undefined, facing: 0 } : {});
    const state = createFormationVisual(initial, 32);
    const options = { reducedMotion: kind === 'legacy-reduced' };
    updateFormationVisual(state, initial, 0, .82, options);
    const formation = kind === 'turn' ? { ...initial, facing: Math.PI / 4 }
      : { ...initial, x: 505, y: 407, status: kind === 'route' ? 'routing' : 'steady' };
    const first = updateFormationVisual(state, formation, 1, .82, options);
    const saved = capture(formation, state, 1);
    const restored = restoreFormationVisualFromCheckpoint(formation, 32, 1, saved);
    const distance = restored.distance, turnDistance = restored.turnDistance;
    assert.deepEqual(updateFormationVisual(restored, formation, 1, .82, options), first, kind);
    assert.equal(restored.distance, distance); assert.equal(restored.turnDistance, turnDistance);
    assert.equal(Object.hasOwn(restored, 'restoreFrame'), false);
    const changed = { ...formation, x: 508, y: 412 };
    assert.deepEqual(updateFormationVisual(restored, changed, 1.2, .82, options), updateFormationVisual(state, changed, 1.2, .82, options));
  }
});

test('no-loss Infinity timer has an explicit nullable JSON sentinel; cached fields never enter the save', () => {
  const formation = fixture();
  const state = createFormationVisual(formation, 32);
  updateFormationVisual(state, formation, 0, .82);
  const saved = capture(formation, state, 0);
  assert.equal(saved.formations[0].state.lastLoss, null);
  assert.equal(restoreFormationVisualFromCheckpoint(formation, 32, 0, saved).lastLoss, -Infinity);
  assert.equal(Object.hasOwn(saved.formations[0].state, 'lastFacing'), false);
  assert.equal(Object.hasOwn(saved.formations[0].state, 'lastVolley'), false);
});

test('missing, legacy, future, incompatible, malformed, and engine-reviver-marker presentation falls back safely', () => {
  const formation = fixture({ strength: 75 });
  const state = createFormationVisual(formation, 32, 4);
  updateFormationVisual(state, formation, 4, .82);
  const valid = capture(formation, state, 4);
  const invalid = [null, undefined, {}, { version: 2 }, { $fieldMap: 'bad' }, { $fieldSet: {} }];
  const mutate = change => { const value = json(valid); change(value); invalid.push(value); };
  mutate(value => { value.version = 2; });
  mutate(value => { value.time = 3; });
  mutate(value => { value.formations[0].capacity = 31; });
  mutate(value => { value.formations[0].formation.strength = 90; });
  mutate(value => { value.formations[0].formation.footprint.width = 400; });
  mutate(value => { value.formations[0].state.figures[0].id = 1; });
  mutate(value => { value.formations[0].state.figures[0].slot.lateral = Infinity; });
  mutate(value => { value.formations[0].state.lastLoss = Infinity; });
  mutate(value => { value.formations[0].state.lastContact = 5; });
  mutate(value => { value.formations[0].state.figures[0].stepDistance = -1; });
  mutate(value => { value.formations[0].state.figures[0].alive = !value.formations[0].state.figures[0].alive; });
  mutate(value => { value.formations.push(value.formations[0]); });
  mutate(value => { value.$fieldMap = 'bad'; });
  mutate(value => { value.formations[0].state.$fieldSet = {}; });
  for (const value of invalid) {
    const restored = restoreFormationVisualFromCheckpoint(formation, 32, 4, value);
    assert.deepEqual(restored, createFormationVisual(formation, 32, 4));
    assert.ok(restored.figures.filter(figure => !figure.alive).every(figure => figure.fallen === null));
  }
});

test('bounded records reject oversized allocation and do not expose source or checkpoint references', () => {
  const formation = fixture();
  const state = createFormationVisual(formation, 32);
  updateFormationVisual(state, formation, 0, .82);
  const saved = createFormationVisualCheckpoint([formation], new Map([[formation.id, state]]), 0);
  saved.formations[0].state.figures[0].slot.lateral += 5;
  assert.notEqual(saved.formations[0].state.figures[0].slot.lateral, state.figures[0].slot.lateral);
  const restored = restoreFormationVisualFromCheckpoint(formation, 32, 0, saved);
  restored.figures[0].slot.lateral += 3;
  assert.notEqual(restored.figures[0].slot.lateral, saved.formations[0].state.figures[0].slot.lateral);
  const formations = Array.from({ length: 22 }, (_, index) => fixture({ id: `fixture-${index}` }));
  const states = new Map(formations.map(value => [value.id, createFormationVisual(value, 32)]));
  assert.equal(createFormationVisualCheckpoint(formations, states, 0), null, '704 pooled figures exceed the authored 700 limit');
  assert.equal(createFormationVisualCheckpoint(Array(33).fill(formation), new Map(), 0), null);
  const oversized = { ...saved, formations: Array.from({ length: 22 }, (_, index) => ({ ...json(saved.formations[0]), id: `fixture-${index}` })) };
  assert.deepEqual(restoreFormationVisualFromCheckpoint(formation, 32, 0, oversized), createFormationVisual(formation, 32));
});

test('a restored pose respects changed presentation settings instead of forcing old motion', () => {
  const formation = fixture();
  const state = createFormationVisual(formation, 32);
  updateFormationVisual(state, formation, 0, .82);
  const moving = { ...formation, x: 508 };
  updateFormationVisual(state, moving, 1, .82);
  const restored = restoreFormationVisualFromCheckpoint(moving, 32, 1, capture(moving, state, 1));
  const changed = updateFormationVisual(restored, moving, 1, .82, { reducedMotion: true, resolving: true });
  assert.equal(changed.moving, false);
  assert.ok(changed.figures.filter(figure => figure.visible).every(figure => figure.frame === 0));
  assert.equal(Object.hasOwn(restored, 'restoreFrame'), false);
});

test('all authored opening deployments, artillery anchors, and dormant reserves fit the same presentation format', () => {
  let checked = 0;
  for (const scenarioId of Object.keys(BATTLE_ENGINE_CONFIGS)) for (const choiceId of ['option_a', 'option_b', 'option_c', 'option_d']) {
    const engine = new CivilWarBattleEngine(scenarioId, { battleRulesVersion: 17 }, choiceId);
    const formations = engine.snapshot({ presentation: true }).formations;
    const states = new Map(formations.map(formation => [formation.id, createFormationVisual(formation, formation.type === 'artillery' ? 1 : 32)]));
    const saved = json(createFormationVisualCheckpoint(formations, states, 0));
    assert.ok(saved, `${scenarioId}/${choiceId}`);
    assert.equal(saved.formations.length, formations.length, `${scenarioId}/${choiceId}: no authored formation silently omitted`);
    for (const formation of formations) {
      const capacity = formation.type === 'artillery' ? 1 : 32;
      const restored = restoreFormationVisualFromCheckpoint(formation, capacity, 0, saved);
      assert.equal(restored.restoreFrame, true, `${scenarioId}/${choiceId}/${formation.id}: format accepted`);
      assert.deepEqual(livingIds(restored), livingIds(states.get(formation.id)));
    }
    checked += 1;
  }
  assert.equal(checked, 44);
});
