import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { createFormationVisual, updateFormationVisual } from '../src/battle/formationVisualState.js';
import { createFormationVisualCheckpoint, restoreFormationVisualFromCheckpoint } from '../src/battle/formationVisualCheckpoint.js';
import { directionIndex } from '../src/battle/formationMath.js';
import * as heading from '../src/battle/gettysburgLocomotionPresentation.js';
import { sampleGettysburgInfantryVolley } from '../src/battle/gettysburgInfantryVolleyPresentation.js';
import { locomotionHarness, dustFacts, plain } from './test-support/gettysburgV40Regression.mjs';
import { drawAll } from './test-support/gettysburgV35Regression.mjs';
import { gettysburgV40MigrationLedger, validateGettysburgV40MigrationLedger } from './test-support/gettysburgV40Preservation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const oldQuery = '?artPass=gettysburg-v32&infantryScale=moderate&contactLayout=v33&standardContinuity=v34&animationContinuity=v35&dustContinuity=v36&rankReadability=v37&viewContinuity=v39';
const query = oldQuery + '&locomotionHeading=v40', campaign = { rulesVersion: 2, battleRulesVersion: 18 }, id = 'pickett-division';
const current = await locomotionHarness(root), before = await locomotionHarness(root, { before: true });
const f = (engine, name = id) => engine.snapshot({ presentation: true }).formations.find(value => value.id === name);
const clock = engine => engine.time + (engine.resolutionTime || 0);
const modes = ['clockwise', 'counterclockwise', 'column', 'line', 'skirmish'];
function issue(engine, kind, name = id) {
  const unit = f(engine, name);
  if (kind === 'clockwise' || kind === 'counterclockwise') assert.equal(engine.face(name, { x: unit.x + (kind === 'clockwise' ? 100 : -100), y: unit.y - 100 }), true);
  else { engine.setFormation(name, kind); assert.equal(f(engine, name).formationMode, kind); }
}
function moduleCase({ reducedMotion = false, startColumn = false, name = id } = {}) {
  const engine = new CivilWarBattleEngine('gettysburg', campaign, 'option_d');
  const initial = f(engine, name); engine.face(name, { x: initial.x, y: initial.y - 100 });
  const state = createFormationVisual(f(engine, name), 32, 0), baseline = structuredClone(state);
  let owner = null;
  const draw = () => {
    const formation = f(engine, name), time = clock(engine), combat = plain(engine.checkpoint());
    const expected = updateFormationVisual(baseline, formation, time, .82, { reducedMotion });
    const sample = heading.sampleGettysburgLocomotion(state, owner, formation, time, .82, { reducedMotion }); owner = sample.heading;
    assert.deepEqual(sample.visual, expected, 'canonical raw output remains exact');
    assert.deepEqual(plain(state), plain(baseline), 'all raw state primitives remain exact');
    assert.deepEqual(plain(engine.checkpoint()), combat, 'presentation does not mutate combat');
    return sample.visual;
  };
  draw();
  for (let n = 0; n < 40 && f(engine, name).reload > 0; n++) { engine.tick(.05); draw(); }
  assert.equal(f(engine, name).reload, 0);
  if (startColumn) {
    issue(engine, 'column', name);
    for (let n = 0; n < 70; n++) { engine.tick(.2); draw(); if (!state.assembling) break; }
    assert.equal(state.assembling, false);
  }
  return { engine, state, baseline, draw, owner: () => owner, name, reducedMotion };
}
function movementWitness(value, kind) {
  const previous = plain(value.state.output), previousFormation = f(value.engine, value.name);
  issue(value.engine, kind, value.name); value.engine.tick(.2); const raw = value.draw(), formation = f(value.engine, value.name);
  assert.equal(formation.order, 'hold'); assert.equal(formation.x, previousFormation.x); assert.equal(formation.y, previousFormation.y);
  const olds = new Map(previous.figures.map(figure => [figure.id, figure])); let meaningful = 0, oldMismatch = 0;
  for (const figure of raw.figures) {
    const old = olds.get(figure.id), draw = heading.gettysburgWalkingFigure(figure, value.owner(), formation, clock(value.engine), { reducedMotion: value.reducedMotion });
    if (!old?.visible || !figure.visible || figure.fallen || figure.action !== 'walk') { assert.equal(draw, figure); continue; }
    const dx = figure.x - old.x, dy = figure.y - old.y;
    if (Math.hypot(dx, dy) <= heading.LOCOMOTION_MIN_TRAVEL) { assert.equal(draw, figure); continue; }
    const expected = directionIndex(Math.atan2(dy, dx)); meaningful++;
    if (figure.direction !== expected) oldMismatch++;
    assert.equal(draw.direction, expected, 'walking drawing sector follows actual raw travel');
    const { direction, ...rest } = draw, { direction: tactical, ...canonical } = figure;
    assert.deepEqual(rest, canonical, 'only the copy direction changes');
  }
  assert.ok(meaningful > 0); assert.ok(oldMismatch > 0, 'the preregistered failure remains in canonical direction');
  return { raw, formation, oldMismatch, meaningful };
}
function readyScene(h = current, search = query, reducedMotion = false) {
  const scene = h.make(null, { query: search, campaign, choiceId: 'option_d', reducedMotion });
  const unit = f(scene.engine); scene.engine.face(id, { x: unit.x, y: unit.y - 100 }); drawAll(scene);
  for (let n = 0; n < 40 && f(scene.engine).reload > 0; n++) { scene.engine.tick(.05); drawAll(scene); }
  assert.equal(f(scene.engine).reload, 0); scene.setSpeed(1); return scene;
}
const checkpointWithoutHeading = scene => { const value = plain(scene.checkpoint()); delete value.presentation.locomotionHeading; return value; };
function unaffected(h, scene) {
  const value = dustFacts(h, scene);
  for (const unit of value.formations) delete unit.bodies;
  return value;
}

test('frozen v40 preserves authentic installed v39 and every protected historical assertion', () => {
  const ledger = gettysburgV40MigrationLedger(); assert.equal(validateGettysburgV40MigrationLedger(ledger), ledger);
  assert.equal(current.source, readFileSync(root + '/src/battle/CivilWarBattlefield.jsx', 'utf8'));
  assert.equal(before.source, readFileSync(root + '/scripts/test-support/gettysburg-v40-before/src/battle/CivilWarBattlefield.jsx', 'utf8'));
});

for (const reducedMotion of [false, true]) for (const kind of modes) {
  test(`movement ${kind} ${reducedMotion ? 'reduced' : 'normal'} preserves raw state and fixes walking sectors`, () => {
    movementWitness(moduleCase({ reducedMotion, startColumn: kind === 'line' }), kind);
  });
}

test('movement Union renderer input follows travel without granting player authority over enemy orders', () => {
  const engine = new CivilWarBattleEngine('gettysburg', campaign, 'option_d');
  const original = f(engine, 'hancock-reserve'); assert.equal(engine.face(original.id, { x: original.x + 100, y: original.y - 100 }), false);
  const formation = { ...original, reload: 0, lastVolleyAt: -100, order: 'hold', active: true, status: 'steady', engagedWith: null, inMelee: false };
  const state = createFormationVisual(formation, 32, 0), raw = plain(updateFormationVisual(state, formation, 0, .82));
  const changed = { ...formation, facing: formation.facing + .122 };
  const sample = heading.sampleGettysburgLocomotion(state, null, changed, .2, .82);
  for (const figure of sample.visual.figures.filter(row => row.visible && !row.fallen && row.action === 'walk')) {
    const prior = raw.figures[figure.id], dx = figure.x-prior.x, dy = figure.y-prior.y;
    if (Math.hypot(dx,dy) > heading.LOCOMOTION_MIN_TRAVEL) assert.equal(heading.gettysburgWalkingFigure(figure,sample.heading,changed,.2).direction,directionIndex(Math.atan2(dy,dx)));
  }
  assert.deepEqual(f(engine, original.id), original, 'draw-input witness does not alter actual Union combat');
});

test('movement continuation covers first and final assembly steps without creating new gait', () => {
  const value = moduleCase(); movementWitness(value, 'column'); let corrected = 0, ended = false;
  for (let n = 0; n < 70; n++) {
    const previous = plain(value.state.output); value.engine.tick(.2); const raw = value.draw(), formation = f(value.engine);
    for (const figure of raw.figures.filter(row => row.visible && !row.fallen && row.action === 'walk')) {
      const old = previous.figures[figure.id], dx = figure.x - old.x, dy = figure.y - old.y;
      if (Math.hypot(dx, dy) > heading.LOCOMOTION_MIN_TRAVEL) {
        assert.equal(heading.gettysburgWalkingFigure(figure, value.owner(), formation, clock(value.engine)).direction, directionIndex(Math.atan2(dy, dx))); corrected++;
      }
    }
    if (!value.state.assembling) { ended = true; break; }
  }
  assert.ok(corrected > 0); assert.ok(ended);
  value.engine.tick(.2); const settled = value.draw();
  assert.ok(value.owner().headings.every(value => value === null));
  assert.ok(settled.figures.every(figure => heading.gettysburgWalkingFigure(figure, value.owner(), f(value.engine), clock(value.engine)) === figure));
});

test('current Scene selectors consume walk copies while feet, standards, effects, shots and combat stay exact', () => {
  for (const kind of ['clockwise', 'counterclockwise', 'column']) {
    const a = readyScene(), b = readyScene(before);
    issue(a.engine, kind); issue(b.engine, kind); a.engine.tick(.2); b.engine.tick(.2);
    drawAll(a); drawAll(b);
    assert.deepEqual(unaffected(current, a), unaffected(before, b));
    assert.deepEqual(checkpointWithoutHeading(a), checkpointWithoutHeading(b));
    assert.ok(a.views.get(id).locomotionHeading.headings.some(value => value !== null));
    assert.notDeepEqual(current.facts(a.views.get(id)).soldiers, before.facts(b.views.get(id)).soldiers);
  }
});

test('current native/detailed selector results actually reach the recorded sprites', () => {
  const scene = readyScene(); issue(scene.engine, 'clockwise'); scene.engine.tick(.2);
  current.observePoses(true); drawAll(scene); const calls = current.poseCalls.slice(); current.observePoses(false);
  const view = scene.views.get(id), bodies = current.facts(view).soldiers;
  const native = calls.filter(call => call.name === 'gettysburgInfantryClipPose' && call.unitId === id && call.pose);
  assert.ok(native.length > 0);
  for (const call of native) {
    const raw = view.visual.output.figures.find(figure => figure.id === call.figure.id);
    assert.equal(call.figure.direction, heading.gettysburgWalkingFigure(raw, view.locomotionHeading, f(scene.engine), clock(scene.engine)).direction);
    assert.equal(bodies[call.figure.id].texture, call.pose.key); assert.equal(bodies[call.figure.id].frame, call.pose.frame);
  }
});

test('same-time changes of order, engagement and safety facts revoke cached walking authority', () => {
  const value = moduleCase(); movementWitness(value, 'clockwise'); const raw = value.state.output, formation = f(value.engine), owner = value.owner();
  const mutations = [{ order: 'fallback' }, { order: 'withdraw' }, { order: 'rally' }, { order: 'advance' },
    { engagedWith: 'hancock-reserve' }, { inMelee: true }, { status: 'routing' }, { active: false },
    { reload: 1 }, { lastVolleyAt: clock(value.engine) }];
  for (const patch of mutations) {
    const changed = { ...formation, ...patch };
    for (const figure of raw.figures) assert.equal(heading.gettysburgWalkingFigure(figure, owner, changed, clock(value.engine)), figure);
    const state = structuredClone(value.state), result = heading.sampleGettysburgLocomotion(state, owner, changed, clock(value.engine), .82);
    assert.ok(result.heading?.headings.every(value => value === null) ?? result.heading === null);
  }
  for (const options of [{ resolving: true }, { reducedMotion: true }]) for (const figure of raw.figures)
    assert.equal(heading.gettysburgWalkingFigure(figure, owner, formation, clock(value.engine), options), figure);
});

test('zero time and paused geometry changes invent no travel heading', () => {
  const value = moduleCase(); issue(value.engine, 'column'); const raw = value.draw();
  assert.ok(value.owner().headings.every(value => value === null));
  for (const figure of raw.figures) assert.equal(heading.gettysburgWalkingFigure(figure, value.owner(), f(value.engine), clock(value.engine)), figure);
  for (const dt of [0, 1e-8, .01]) { const time = clock(value.engine); value.engine.tick(dt); value.draw(); assert.equal(clock(value.engine), time); }
});

test('same-time geometry or raw-foot changes cannot reuse an accepted drawing heading', () => {
  const value = moduleCase(); movementWitness(value, 'clockwise');
  const formation = f(value.engine), owner = value.owner();
  const figure = value.state.output.figures.find(row => row.visible && row.action === 'walk' && owner.headings[row.id] !== null);
  assert.ok(figure);
  for (const patch of [{ x: formation.x + 1 }, { y: formation.y + 1 }, { facing: formation.facing + .1 },
    { strength: formation.strength - 1 }, { footprint: { ...formation.footprint, width: formation.footprint.width + 1 } }])
    assert.equal(heading.gettysburgWalkingFigure(figure, owner, { ...formation, ...patch }, clock(value.engine)), figure);
  const movedFoot = { ...figure, x: figure.x + .1 };
  assert.equal(heading.gettysburgWalkingFigure(movedFoot, owner, formation, clock(value.engine)), movedFoot);
});

test('actual advance, volley and fighting fallback keep the canonical tactical directions', () => {
  const value = moduleCase(); assert.equal(value.engine.order(id, 'advance'), true);
  let fired = false;
  for (let n = 0; n < 500; n++) {
    value.engine.tick(.05); const raw = value.draw(), formation = f(value.engine);
    assert.ok(value.owner().headings.every(value => value === null));
    for (const figure of raw.figures) assert.equal(heading.gettysburgWalkingFigure(figure, value.owner(), formation, clock(value.engine)), figure);
    if (formation.lastVolleyAt >= 0) { fired = true; break; }
  }
  assert.ok(fired, 'real engine trace encounters a volley');
  assert.equal(value.engine.order(id, 'fallback'), true); let walking = 0;
  for (let n = 0; n < 100; n++) {
    value.engine.tick(.05); const raw = value.draw(), formation = f(value.engine);
    assert.ok(value.owner().headings.every(value => value === null));
    for (const figure of raw.figures) {
      assert.equal(heading.gettysburgWalkingFigure(figure, value.owner(), formation, clock(value.engine)), figure);
      if (figure.action === 'walk') { walking++; assert.equal(figure.direction, directionIndex(formation.facing)); }
    }
    if (walking) break;
  }
  assert.ok(walking > 0, 'fighting fallback still walks with its tactical front');
});

test('latest sampled phase intent belongs only to qualifying heading episodes and the actual view state', () => {
  const scene = readyScene(), view = scene.views.get(id);
  issue(scene.engine, 'column'); scene.engine.tick(.2);
  const sampled = plain(scene.checkpoint());
  assert.ok(view.animationRestoreFrame); const pending = view.animationRestoreFrame;
  assert.equal(pending.visual, view.visual);
  assert.deepEqual(plain(scene.checkpoint()), sampled); assert.equal(view.animationRestoreFrame, pending);
  assert.equal(scene.animationRestoringFrame(view, { ...f(scene.engine), reload: 1 }, clock(scene.engine), false), false);
  assert.equal(view.animationRestoreFrame, undefined);
  scene.sampleFormationVisual(structuredClone(view.visual), f(scene.engine), clock(scene.engine) + .05, .82, false);
  assert.equal(view.animationRestoreFrame, undefined, 'a detached state cannot mint view phase intent');
  const advancing = readyScene(); assert.equal(advancing.engine.order(id, 'advance'), true); advancing.engine.tick(.2);
  advancing.checkpoint();
  assert.ok(advancing.views.get(id).locomotionHeading.headings.every(value => value === null));
  assert.equal(advancing.views.get(id).animationRestoreFrame, undefined, 'ordinary march phase behavior is unchanged');
  const still = readyScene(); still.engine.tick(.2); still.checkpoint();
  assert.equal(still.views.get(id).animationRestoreFrame, undefined, 'a positive no-motion sample creates no phase intent');
});

test('fire, reload, contact and frozen falls never receive a locomotion drawing copy', () => {
  const value = moduleCase(); movementWitness(value, 'clockwise'); const owner = value.owner(), formation = f(value.engine), original = value.state.output.figures[0];
  for (const action of ['idle', 'fire', 'reload', 'melee', 'fall', 'route']) {
    const figure = { ...original, action, fallen: action === 'fall' };
    assert.equal(heading.gettysburgWalkingFigure(figure, owner, formation, clock(value.engine)), figure);
  }
  const dead = { ...formation, strength: formation.strength * .7 };
  const a = structuredClone(value.state), b = structuredClone(value.state);
  const sample = heading.sampleGettysburgLocomotion(a, owner, dead, clock(value.engine) + .2, .82);
  const raw = updateFormationVisual(b, dead, clock(value.engine) + .2, .82);
  assert.deepEqual(sample.visual, raw); assert.deepEqual(plain(a), plain(b));
  assert.ok(raw.figures.some(figure => figure.fallen));
});

test('fresh native and fallback volley geometry and existing shot caches remain canonical', () => {
  const scene = readyScene(); issue(scene.engine, 'clockwise'); scene.engine.tick(.2); drawAll(scene);
  const view = scene.views.get(id), visual = view.visual.output, formation = { ...f(scene.engine), lastVolleyAt: clock(scene.engine), reload: 1 };
  const options = { scenarioId: 'gettysburg', search: query, clips: scene.infantryClips, textures: scene.textures, scale: .82, infantryPresentationScale: .74 };
  for (const clips of [options.clips, []]) {
    const a = sampleGettysburgInfantryVolley(null, formation, visual, clock(scene.engine), { ...options, clips });
    const b = sampleGettysburgInfantryVolley(null, formation, plain(visual), clock(scene.engine), { ...options, clips });
    assert.deepEqual(a, b); assert.ok(a.figures.length > 0);
    assert.equal(sampleGettysburgInfantryVolley(a, { ...formation, facing: formation.facing + .2 }, visual, clock(scene.engine), { ...options, clips }), a);
  }
  const b = readyScene(before); issue(b.engine, 'clockwise'); b.engine.tick(.2); drawAll(b);
  assert.deepEqual(unaffected(current, scene), unaffected(before, b));
});

test('heading checkpoint round trips through repeated pre-draw saves with independent contact and phase flags', () => {
  for (const reducedMotion of [false, true]) for (const contact of [false, true]) for (const animation of [false, true]) {
    const search = query.replace(contact ? '\0' : '&contactLayout=v33', '').replace(animation ? '\0' : '&animationContinuity=v35', '');
    const warm = readyScene(current, search, reducedMotion); issue(warm.engine, 'clockwise'); warm.engine.tick(.2); drawAll(warm); warm.setSpeed(0);
    const checkpoint = plain(warm.checkpoint()); assert.ok(checkpoint.presentation.locomotionHeading.formations.some(row => row.id === id));
    let saved = checkpoint;
    for (let n = 0; n < 3; n++) {
      const cold = current.make(saved, { query: search, campaign, choiceId: 'option_d', reducedMotion });
      assert.deepEqual(plain(cold.checkpoint()), checkpoint, 'paused immediate re-save is exact');
      assert.deepEqual(plain(cold.checkpoint()), checkpoint, 'second pre-draw sample is exact');
      saved = plain(cold.checkpoint()); drawAll(cold);
      assert.deepEqual(cold.views.get(id).locomotionHeading.headings, warm.views.get(id).locomotionHeading.headings);
      if (animation) assert.deepEqual(dustFacts(current, cold), dustFacts(current, warm), 'combined accepted profile preserves recorded render facts');
    }
  }
});

test('checkpoint samples an engine advance before any draw and resumes the same heading', () => {
  const warm = readyScene(); issue(warm.engine, 'column'); warm.engine.tick(.2);
  const saved = plain(warm.checkpoint()); warm.setSpeed(0); const cold = current.make(saved, { query, campaign, choiceId: 'option_d' });
  assert.deepEqual(plain(cold.checkpoint()), saved); drawAll(warm); drawAll(cold);
  assert.deepEqual(dustFacts(current, cold), dustFacts(current, warm));
  warm.setSpeed(1); cold.setSpeed(1); warm.engine.tick(.2); cold.engine.tick(.2); drawAll(warm); drawAll(cold); warm.setSpeed(0); cold.setSpeed(0);
  assert.deepEqual(dustFacts(current, cold), dustFacts(current, warm));
  assert.deepEqual(plain(warm.checkpoint()), plain(cold.checkpoint()));
});

test('invalid optional headings fail soft without replacing accepted base state or other saved presentation', () => {
  const warm = readyScene(); issue(warm.engine, 'clockwise'); warm.engine.tick(.2); drawAll(warm);
  const original = plain(warm.checkpoint()), malformed = [];
  const mutate = fn => { const value = plain(original); fn(value.presentation.locomotionHeading); malformed.push(value); };
  mutate(v => { v.version = 2; }); mutate(v => { v.time += .05; }); mutate(v => { v.scenarioId = 'shiloh'; });
  mutate(v => { v.formations.push(plain(v.formations[0])); }); mutate(v => { v.formations[0].headings[0] = 8; });
  mutate(v => { v.formations[0].headings[0] = NaN; }); mutate(v => { v.formations[0].headings.pop(); });
  mutate(v => { v.formations[0].base.state.figures[0].slot.lateral += 1; }); mutate(v => { v.formations[0].facts.order = 'advance'; });
  let getterCalls = 0;
  const accessor = plain(original); Object.defineProperty(accessor.presentation.locomotionHeading.formations[0].headings, '0', { enumerable: true, get() { getterCalls++; return 2; } }); malformed.push(accessor);
  const fallback = plain(original); delete fallback.presentation.locomotionHeading; const legacy = current.make(fallback, { query, campaign, choiceId: 'option_d' });
  drawAll(legacy);
  for (const saved of malformed) {
    const cold = current.make(saved, { query, campaign, choiceId: 'option_d' }); drawAll(cold);
    assert.ok(cold.views.get(id).locomotionHeading.headings.every(value => value === null));
    assert.deepEqual(dustFacts(current, cold), dustFacts(current, legacy));
    assert.deepEqual(checkpointWithoutHeading(cold), checkpointWithoutHeading(legacy));
  }
  assert.equal(getterCalls, 0);
  const rejected = plain(original); rejected.presentation.formations.find(row => row.id === id).state.figures.pop();
  const cold = current.make(rejected, { query, campaign, choiceId: 'option_d' }); assert.equal(cold.views.get(id).locomotionHeading, null);
});

test('strict selector gates retain exact disabled historical rendering and checkpoints', () => {
  const disabled = [oldQuery, query.replace('v40', 'v39'), query.replace('v40', 'unknown'), query.replace('v40', '%76%34%30'),
    query.replace('locomotionHeading', 'locomotion%48eading'), query + '&locomotionHeading=v40', query + '&locomotionHeading=off',
    query + '&artPass=gettysburg-v32', query.replace('gettysburg-v32', 'gettysburg-v31'), query + '&other=%31'];
  for (const search of disabled) {
    const a = readyScene(current, search), b = readyScene(before, search); assert.equal(a.locomotionHeadingEnabled, false);
    issue(a.engine, 'clockwise'); issue(b.engine, 'clockwise'); a.engine.tick(.2); b.engine.tick(.2); drawAll(a); drawAll(b);
    assert.deepEqual(dustFacts(current, a), dustFacts(before, b)); assert.deepEqual(plain(a.checkpoint()), plain(b.checkpoint()));
  }
  for (const scenarioId of ['first_manassas', 'shiloh', 'third_winchester']) {
    const a = current.make(null, { query, scenarioId }), b = before.make(null, { query, scenarioId }); assert.equal(a.locomotionHeadingEnabled, false);
    assert.deepEqual(plain(a.checkpoint()), plain(b.checkpoint()));
  }
});

test('locomotion selector does not silently enable any other art or continuity feature', () => {
  const search = '?locomotionHeading=v40&artPass=gettysburg-v32';
  const a = current.make(null, { query: search }), b = current.make(null, { query: search.replace('locomotionHeading=v40&', '') });
  assert.equal(a.locomotionHeadingEnabled, true);
  for (const key of ['contactLayoutEnabled','standardContinuityEnabled','animationContinuityEnabled','dustContinuityEnabled','rankReadabilityEnabled','viewContinuityEnabled','infantryPresentationScale']) assert.equal(a[key], b[key]);
  assert.deepEqual(checkpointWithoutHeading(a), checkpointWithoutHeading(b));
});
