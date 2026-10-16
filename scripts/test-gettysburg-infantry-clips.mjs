import test from 'node:test';
import assert from 'node:assert/strict';
import {
  gettysburgInfantryClipsEnabled,
  validateGettysburgInfantryClip,
  prepareGettysburgInfantryClips,
  gettysburgInfantryClipPose,
} from '../src/battle/gettysburgInfantryClips.js';
import { deterministicUnitValue } from '../src/battle/formationMath.js';
import { gettysburgInfantryContactPhase, gettysburgInfantryIdentity } from '../src/battle/gettysburgInfantryFamily.js';
import { createFormationVisual, updateFormationVisual } from '../src/battle/formationVisualState.js';

const definition = (changes = {}) => ({
  side: 'union', identity: 'a', direction: 0, action: 'march', key: 'test-union-march',
  frames: ['left-contact', 'left-passing', 'right-contact', 'right-passing'],
  sourceHash: 'a'.repeat(64), referenceHeight: 240,
  pivots: Array.from({ length: 4 }, () => ({ x: .5, y: .85 })),
  approval: { reviewed: true, rejected: false }, ...changes,
});
const readyDefinition = (changes = {}) => definition({
  action: 'ready', key: 'test-union-ready', frames: ['ready'], pivots: [{ x: .5, y: .85 }], ...changes,
});
const fireDefinition = (changes = {}) => definition({
  action: 'fire', key: 'test-union-fire', frames: ['shoulder-aim'], pivots: [{ x: .5, y: .85 }], ...changes,
});
const reloadDefinition = (changes = {}) => definition({
  action: 'reload', key: 'test-union-reload', frames: ['loading', 'ramrod'],
  pivots: [{ x: .5, y: .85 }, { x: .5, y: .85 }], ...changes,
});
const soldier = Object.freeze({ id: 7, direction: 0, action: 'walk', frame: 0 });
const optedIn = Object.freeze({ scenarioId: 'gettysburg', search: '?artPass=gettysburg-v3', side: 'union', identity: 'a' });
const allReady = prepareGettysburgInfantryClips([definition(), readyDefinition()], () => true);
const actionFamily = prepareGettysburgInfantryClips([definition(), readyDefinition(), fireDefinition(), reloadDefinition()], () => true);
const pose = (figure = soldier, options = {}, time = 0, formationId = 'brigade') =>
  gettysburgInfantryClipPose(formationId, figure, time, { ...optedIn, clips: allReady, ...options });

test('the query pilot is scoped to exact historical Gettysburg', () => {
  for (const search of ['?artPass=gettysburg-v3', '?artPass=gettysburg-v4']) {
    assert.equal(gettysburgInfantryClipsEnabled('gettysburg', search), true);
    assert.ok(pose(soldier, { search }));
    assert.equal(gettysburgInfantryClipsEnabled('gettysburg_meade', search), false);
  }
  for (const scenarioId of ['gettysburg_meade', 'gettysburg_jackson', 'first_manassas', null]) {
    assert.equal(gettysburgInfantryClipsEnabled(scenarioId, optedIn.search), false);
    assert.equal(pose(soldier, { scenarioId }), null);
  }
  for (const search of ['', '?artPass=gettysburg-v2', '?artPass=gettysburg-v3-other', '?artPass=gettysburg-v4-other', '?other=gettysburg-v3']) {
    assert.equal(gettysburgInfantryClipsEnabled('gettysburg', search), false);
    assert.equal(pose(soldier, { search }), null);
  }
});

test('each action has its exact authored frame count and independent review', () => {
  for (const source of [readyDefinition(), definition(), fireDefinition(), reloadDefinition()]) {
    assert.deepEqual(validateGettysburgInfantryClip(source), []);
    for (const bad of [
      { ...source, frames: [...source.frames, 'extra'], pivots: [...source.pivots, { x: .5, y: .85 }] },
      { ...source, frames: source.frames.slice(1), pivots: source.pivots.slice(1) },
      { ...source, approval: undefined },
      { ...source, approval: { reviewed: true, rejected: true } },
    ]) {
      assert.ok(validateGettysburgInfantryClip(bad).length > 0);
      assert.deepEqual(prepareGettysburgInfantryClips([bad], () => true), []);
    }
  }
  assert.ok(validateGettysburgInfantryClip(fireDefinition({ frames: ['fire-0', 'fire-1'], pivots: [{ x: .5, y: .85 }, { x: .5, y: .85 }] })).length > 0);
  assert.ok(validateGettysburgInfantryClip(reloadDefinition({ frames: ['same', 'same'] })).length > 0);
});

test('muzzle anchors are optional but supplied anchors must cover every frame with normalized finite points', () => {
  for (const source of [readyDefinition(), definition(), fireDefinition(), reloadDefinition()]) {
    assert.deepEqual(validateGettysburgInfantryClip(source), []);
    const muzzles = source.frames.map(() => ({ x: .8, y: .4 }));
    assert.deepEqual(validateGettysburgInfantryClip({ ...source, muzzles }), []);
  }
  assert.deepEqual(validateGettysburgInfantryClip(fireDefinition({ muzzles: [{ x: 0, y: 1 }] })), []);
  for (const muzzles of [
    null, { x: .5, y: .5 }, [], Array(1), [{ x: .5, y: .5 }, { x: .6, y: .5 }],
    [{ x: NaN, y: .5 }], [{ x: .5, y: Infinity }], [{ x: .5 }],
    [{ x: -.01, y: .5 }], [{ x: .5, y: 1.001 }], [{ x: '0.5', y: .5 }],
  ]) {
    const source = fireDefinition({ muzzles });
    assert.ok(validateGettysburgInfantryClip(source).some(error => error.includes('Muzzles')));
    assert.deepEqual(prepareGettysburgInfantryClips([source], () => true), []);
  }
  const sparse = [{ x: .5, y: .5 }, , { x: .5, y: .5 }, { x: .5, y: .5 }];
  assert.ok(validateGettysburgInfantryClip(definition({ muzzles: sparse })).some(error => error.includes('Muzzles')));
});

test('prepared muzzle anchors are immutable copies and follow the selected action phase', () => {
  const reloadSource = reloadDefinition({ muzzles: [{ x: .2, y: .3 }, { x: .7, y: .1 }] });
  const marchSource = definition({ muzzles: Array.from({ length: 4 }, (_, phase) => ({ x: .1 + phase * .2, y: .4 })) });
  const fireSource = fireDefinition({ muzzles: [{ x: .8, y: .4 }] });
  const clips = prepareGettysburgInfantryClips([reloadSource, marchSource, fireSource], () => true);
  reloadSource.muzzles[0].x = .9;
  assert.deepEqual(clips[0].muzzles[0], { x: .2, y: .3 });
  assert.ok(Object.isFrozen(clips[0].muzzles) && Object.isFrozen(clips[0].muzzles[0]));
  const options = { clips, search: '?artPass=gettysburg-v4' };
  const loading = pose({ ...soldier, action: 'reload', frame: 0 }, options);
  const ramrod = pose({ ...soldier, action: 'reload', frame: 3 }, options);
  assert.deepEqual(loading.muzzle, { x: .2, y: .3 });
  assert.deepEqual(ramrod.muzzle, { x: .7, y: .1 });
  assert.deepEqual(pose({ ...soldier, action: 'reload', frame: 0 }, { ...options, paused: true, frozenAction: 'reload', frozenPhase: 1 }).muzzle, ramrod.muzzle);
  for (let frame = 0; frame < 4; frame++) {
    const value = pose({ ...soldier, frame }, options);
    assert.equal(value.muzzle, clips[1].muzzles[value.phase]);
    assert.deepEqual(pose({ ...soldier, action: 'fire', frame }, options).muzzle, { x: .8, y: .4 });
  }
  assert.equal(pose(soldier).muzzle, undefined, 'existing clips do not acquire an invented artwork anchor');
});

test('definitions require complete source, geometry, and explicit review evidence', () => {
  assert.deepEqual(validateGettysburgInfantryClip(definition()), []);
  assert.deepEqual(validateGettysburgInfantryClip(readyDefinition()), []);
  for (const changes of [
    { side: 'other' }, { identity: 'c' }, { direction: 1.5 }, { action: 'fire' },
    { key: '' }, { frames: ['one', 'two', 'three'] }, { frames: ['same', 'same', 'same', 'same'] },
    { frames: ['one', 'two', 'three', ,] }, { pivots: Array(4) },
    { sourceHash: 'unbound' }, { referenceHeight: 0 }, { referenceHeight: NaN },
    { pivots: [{ x: .5, y: .8 }] }, { pivots: Array(4).fill({ x: 1.1, y: .8 }) },
    { approval: undefined }, { approval: { reviewed: true } },
    { approval: { reviewed: false, rejected: false } }, { approval: { reviewed: true, rejected: true } },
  ]) {
    assert.ok(validateGettysburgInfantryClip(definition(changes)).length > 0, JSON.stringify(changes));
    assert.deepEqual(prepareGettysburgInfantryClips([definition(changes)], () => true), []);
  }
  assert.ok(validateGettysburgInfantryClip(null).length > 0);
});

test('one unavailable phase withholds the whole clip at every travel phase', () => {
  const calls = [];
  const clips = prepareGettysburgInfantryClips([definition()], (key, frame) => {
    calls.push([key, frame]);
    return frame !== 'right-passing';
  });
  assert.equal(calls.length, 4);
  assert.deepEqual(clips, []);
  for (let frame = 0; frame < 8; frame++) assert.equal(pose({ ...soldier, frame }, { clips }), null);
  assert.deepEqual(prepareGettysburgInfantryClips([definition()], () => { throw new Error('Missing texture'); }), []);
  assert.deepEqual(prepareGettysburgInfantryClips([definition()]), []);
});

test('one missing reload frame withholds both reload phases without borrowing the fire or march clip', () => {
  const clips = prepareGettysburgInfantryClips([definition(), fireDefinition(), reloadDefinition()], (_, frame) => frame !== 'ramrod');
  assert.equal(clips.length, 2);
  for (let frame = 0; frame < 4; frame++) {
    assert.equal(pose({ ...soldier, action: 'reload', frame }, { clips, search: '?artPass=gettysburg-v4' }), null);
  }
  assert.ok(pose({ ...soldier, action: 'fire' }, { clips, search: '?artPass=gettysburg-v4' }));
  const unreviewed = reloadDefinition({ approval: { reviewed: false, rejected: false } });
  const rejected = fireDefinition({ approval: { reviewed: true, rejected: true } });
  assert.deepEqual(prepareGettysburgInfantryClips([unreviewed, rejected], () => true), []);
});

test('readiness runs once and copies keep a prepared clip stable', () => {
  const source = definition();
  let checks = 0;
  const clips = prepareGettysburgInfantryClips([source], () => { checks++; return true; });
  assert.equal(checks, 4);
  source.frames[0] = 'changed';
  source.pivots[0].x = .1;
  source.approval.rejected = true;
  assert.equal(clips[0].frames[0], 'left-contact');
  assert.equal(clips[0].pivots[0].x, .5);
  for (let frame = 0; frame < 20; frame++) assert.ok(pose({ ...soldier, frame }, { clips }));
  assert.equal(checks, 4, 'rendering does not repeat atlas availability checks');
  assert.ok(Object.isFrozen(clips[0]) && Object.isFrozen(clips[0].frames) && Object.isFrozen(clips[0].pivots[0]));
});

test('duplicate action definitions cannot choose a clip by registry order', () => {
  const first = definition();
  const second = definition({ key: 'another-strip', sourceHash: 'b'.repeat(64) });
  assert.deepEqual(prepareGettysburgInfantryClips([first, second], () => true), []);
  assert.deepEqual(prepareGettysburgInfantryClips([second, first], () => true), []);
});

test('all four authored phases follow the supplied travel frame and ignore render time', () => {
  const offset = gettysburgInfantryContactPhase('brigade', soldier.id);
  for (let frame = 0; frame < 8; frame++) {
    const figure = { ...soldier, frame };
    const value = pose(figure);
    assert.equal(value.phase, (frame + offset) % 4);
    assert.equal(value.frame, allReady[0].frames[value.phase]);
    assert.deepEqual(pose(figure, {}, 900), value);
    assert.equal(pose({ ...figure, action: 'route' }).frame, value.frame);
  }
  const four = Array.from({ length: 4 }, (_, frame) => pose({ ...soldier, frame }).frame);
  assert.equal(new Set(four).size, 4, 'passing poses are distinct from contacts');
});

test('real formation travel advances the clip and stopping restores accepted ready art when unmatched', () => {
  const formation = {
    id: 'travel-proof', x: 200, y: 200, facing: 0, strength: 100, initialStrength: 100,
    formationMode: 'line', frontage: 40, footprint: { width: 40, depth: 20 },
    status: 'moving', reload: 0, lastVolleyAt: -Infinity, fatigue: 0,
  };
  const visual = createFormationVisual(formation, 1);
  const factor = .94 + deterministicUnitValue(formation.id, 0, 149) * .12;
  const marchOnly = prepareGettysburgInfantryClips([definition()], () => true);
  const phases = [];
  for (let step = 1; step <= 4; step++) {
    const moving = { ...formation, x: formation.x + step * 5.01 / factor };
    const figure = updateFormationVisual(visual, moving, step, .82).figures[0];
    assert.equal(figure.action, 'walk');
    phases.push(pose(figure, { clips: marchOnly }, step, formation.id).phase);
  }
  for (let step = 1; step < phases.length; step++) assert.equal(phases[step], (phases[step - 1] + 1) % 4);
  const stopped = { ...formation, x: visual.x, status: 'holding' };
  const figure = updateFormationVisual(visual, stopped, 5, .82).figures[0];
  assert.equal(figure.action, 'idle');
  assert.equal(pose(figure, { clips: marchOnly }, 5, formation.id), null);
});

test('pause and resolution retain the rendered phase; reduced motion uses a stable phase', () => {
  const first = pose({ ...soldier, frame: 1 });
  const fixed = pose(soldier, { reducedMotion: true });
  for (let frame = 0; frame < 8; frame++) {
    const figure = { ...soldier, frame };
    for (const flag of ['paused', 'resolving']) {
      assert.equal(pose(figure, { [flag]: true, frozenPhase: first.phase }).phase, first.phase);
      assert.equal(pose(figure, { [flag]: true, frozenPhase: 4 }).phase, fixed.phase);
    }
    assert.equal(pose(figure, { reducedMotion: true }).phase, fixed.phase);
  }
});

test('action-bound pause does not inherit a phase from a different action', () => {
  const options = { clips: actionFamily, search: '?artPass=gettysburg-v4' };
  const fixedMarch = gettysburgInfantryContactPhase('brigade', soldier.id);
  for (const flag of ['paused', 'resolving']) {
    assert.equal(pose({ ...soldier, action: 'reload', frame: 3 }, { ...options, [flag]: true, frozenPhase: 1, frozenAction: 'march' }).phase, 0);
    assert.equal(pose({ ...soldier, action: 'reload', frame: 0 }, { ...options, [flag]: true, frozenPhase: 1, frozenAction: 'reload' }).phase, 1);
    assert.equal(pose(soldier, { ...options, [flag]: true, frozenPhase: (fixedMarch + 1) % 4, frozenAction: 'reload' }).phase, fixedMarch);
    assert.equal(pose(soldier, { ...options, [flag]: true, frozenPhase: 2, frozenAction: 'walk' }).phase, 2);
    assert.equal(pose({ ...soldier, action: 'route' }, { ...options, [flag]: true, frozenPhase: 2, frozenAction: 'march' }).phase, 2);
    assert.equal(pose({ ...soldier, action: 'reload' }, { ...options, [flag]: true, frozenPhase: 2, frozenAction: 'reload' }).phase, 0);
  }
  assert.equal(pose(soldier, { paused: true, frozenPhase: 3 }).phase, 3, 'existing v3 caller without frozenAction remains compatible');
});

test('actual formation fire and reload progress selects the small action family without render-clock animation', () => {
  const formation = {
    id: 'action-proof', x: 200, y: 200, facing: 0, strength: 100, initialStrength: 100,
    formationMode: 'line', frontage: 40, footprint: { width: 40, depth: 20 },
    status: 'firing', engagedWith: 'enemy', reload: 10, lastVolleyAt: 0, fatigue: 0,
  };
  const visual = createFormationVisual(formation, 1);
  const options = { clips: actionFamily, search: '?artPass=gettysburg-v4' };
  const firing = updateFormationVisual(visual, formation, .25, .82).figures[0];
  assert.equal(firing.action, 'fire');
  const firePose = pose(firing, options, .25, formation.id);
  assert.equal(firePose.page, 'fire');
  assert.equal(firePose.frame, 'shoulder-aim');
  assert.equal(firePose.phase, 0);
  assert.deepEqual(pose(firing, options, 100, formation.id), firePose);
  const frames = [];
  for (const time of [.7, 1.2, 1.7, 2.2]) {
    const reloading = updateFormationVisual(visual, formation, time, .82).figures[0];
    assert.equal(reloading.action, 'reload');
    const value = pose(reloading, options, time, formation.id);
    frames.push(value.frame);
    assert.equal(value.phase, Math.floor(reloading.frame / 2) % 2);
    assert.deepEqual(pose(reloading, options, time + 100, formation.id), value);
    assert.equal(pose(reloading, { ...options, reducedMotion: true }, time, formation.id).frame, 'loading');
  }
  assert.deepEqual(frames, ['loading', 'loading', 'ramrod', 'ramrod']);
  for (const action of ['ready', 'fire']) {
    for (let frame = 0; frame < 4; frame++) {
      assert.equal(pose({ ...soldier, action, frame }, { ...options, reducedMotion: true }).phase, 0);
    }
  }
});

test('ready requires its own reviewed frame and never borrows a march contact', () => {
  const clips = prepareGettysburgInfantryClips([definition()], () => true);
  assert.equal(pose({ ...soldier, action: 'ready' }, { clips }), null);
  assert.equal(pose({ ...soldier, action: 'idle' }, { clips }), null);
  for (const action of ['ready', 'idle']) {
    const value = pose({ ...soldier, action, frame: 3 });
    assert.equal(value.frame, 'ready');
    assert.equal(value.phase, 0);
    assert.equal(value.key, 'test-union-ready');
  }
});

test('side, identity, action, and E bearing are explicit without old march substitutions', () => {
  for (const side of ['confederate', 'other', undefined]) assert.equal(pose(soldier, { side }), null);
  for (const direction of [-1, 1, 2, 7, .5, undefined]) assert.equal(pose({ ...soldier, direction }), null);
  for (const action of ['fire', 'reload', 'melee', 'fall', undefined]) assert.equal(pose({ ...soldier, action }), null);
  assert.equal(pose({ ...soldier, fallen: true }), null);
  assert.equal(pose(null), null);
  for (const identity of ['b', 'other', null]) assert.equal(pose(soldier, { identity }), null);
  const confederate = prepareGettysburgInfantryClips([definition({ side: 'confederate', key: 'test-confederate-march' })], () => true);
  assert.equal(pose(soldier, { side: 'confederate', clips: confederate }).key, 'test-confederate-march');
  const missingB = Array.from({ length: 100 }, (_, id) => id).find(id => gettysburgInfantryIdentity('brigade', id) === 'b');
  assert.equal(pose({ ...soldier, id: missingB }, { identity: undefined }), null);
  assert.ok(pose({ ...soldier, id: missingB }, { identity: 'a' }), 'explicit one-identity proof is supported');
});

test('stable variation preserves aspect ratio, equipment side, and authored ground registration', () => {
  const first = pose(soldier);
  for (let frame = 0; frame < 8; frame++) {
    const value = pose({ ...soldier, frame });
    assert.equal(value.width, value.height);
    assert.equal(value.width, first.width);
    assert.equal(value.tint, first.tint);
    assert.equal(value.flip, false);
    assert.equal(value.angle, 0);
    assert.equal(value.offsetX, 0);
    assert.equal(value.offsetY, 0);
    assert.equal(value.referenceHeight, 240);
    assert.deepEqual(value.pivot, { x: .5, y: .85 });
  }
});
