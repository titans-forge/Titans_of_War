import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createGettysburgActionSequence, createGettysburgTurnSequence, createGettysburgActionTurnSequence, createGettysburgMarchComparison,
  getGettysburgMotionPlaybackPresets, getGettysburgMotionPlaybackInitialPreset, createGettysburgMotionPlaybackState, reduceGettysburgMotionPlayback }
  from '../src/battle/gettysburgMotionPlayback.js';
import { GETTYSBURG_MOTION_STUDIES as ALL_GETTYSBURG_MOTION_STUDIES, getGettysburgMotionStudyCell } from '../src/battle/gettysburgMotionStudies.js';

// Historical assertions inspect every prior study; v14 and v15 each have a strict suite.
const GETTYSBURG_MOTION_STUDIES = ALL_GETTYSBURG_MOTION_STUDIES.filter(study => !study.id.endsWith('-v14') && !study.id.endsWith('-v15')); 

// Logical planning fixtures contain no source artwork or visual approval.
const study = (id, changes = {}) => ({ id, status: 'pilot', columns: 2, rows: 2,
  phases: id.includes('-actions-') ? ['Ready', 'Fire', 'Load', 'Ram'] : ['Contact', 'Passing', 'Opposite contact', 'Opposite passing'],
  ...changes });
const family = (version, bearing = 'e') => ['march', 'actions'].map(action => study(`union-${bearing}-${action}-${version}`));
const previous = family('v4');
const complete = [...previous, ...family('v5'), ...family('v5', 'se')];
const apply = (state, ...events) => events.reduce(reduceGettysburgMotionPlayback, state);
const preset = (id, studies = complete) => getGettysburgMotionPlaybackPresets(studies).find(item => item.id === id);

test('coordinate mapping preserves real native cell bounds and rejects malformed source orders', () => {
  const source = GETTYSBURG_MOTION_STUDIES.find(study => study.id === 'union-se-march-v5');
  const nativeBounds = [0, 1, 2, 3].map(phase => getGettysburgMotionStudyCell(source, phase));
  // A coordinate-only fixture over an existing source; this does not approve
  // a changed gait or manufacture any future source pixels or measurements.
  const mapped = { ...source, cellOrder: [0, 3, 2, 1] };
  assert.deepEqual([0, 1, 2, 3].map(phase => getGettysburgMotionStudyCell(mapped, phase)),
    [nativeBounds[0], nativeBounds[3], nativeBounds[2], nativeBounds[1]]);
  for (const cellOrder of [[0, 1, 2], [0, 1, 1, 3], [0, 1, 2, 4], [0, 1, 2, .5]]) {
    assert.equal(getGettysburgMotionStudyCell({ ...source, cellOrder }, 0), null);
  }
  for (const phase of [-1, 4, .5]) assert.equal(getGettysburgMotionStudyCell(source, phase), null);
});

test('an action sequence names separate ready, march, fire, and loading source samples', () => {
  const sequence = createGettysburgActionSequence(previous);
  assert.deepEqual(sequence.map(item => item.action), ['ready', 'march', 'march', 'march', 'march', 'ready', 'fire', 'reload', 'reload', 'ready']);
  assert.deepEqual(sequence.filter(item => item.action === 'march').map(item => item.phase), [0, 1, 2, 3]);
  assert.deepEqual(sequence.filter(item => item.action !== 'march').map(item => item.phase), [0, 0, 1, 2, 3, 0]);
  for (const item of sequence) assert.equal(item.studyId, `union-e-${item.action === 'march' ? 'march' : 'actions'}-v4`);
  assert.deepEqual(createGettysburgActionSequence(complete, 'v5', 'se').map(item => item.bearing), Array(10).fill('SE'));
});

test('incomplete, rejected, or ambiguous sources withhold complete playback families', () => {
  assert.deepEqual(createGettysburgActionSequence(previous.slice(0, 1)), []);
  for (const change of [{ phases: ['Ready'] }, { columns: 1, rows: 1 }, { status: 'rejected' }]) {
    assert.deepEqual(createGettysburgActionSequence([previous[0], study(previous[1].id, change)]), []);
  }
  assert.deepEqual(createGettysburgActionSequence([...previous, { ...previous[1] }]), []);
  assert.deepEqual(createGettysburgTurnSequence(previous), []);
});

test('presets expose only comparisons backed by complete registered sources', () => {
  const oldPresets = getGettysburgMotionPlaybackPresets(previous);
  assert.deepEqual(oldPresets.map(item => item.id), ['v4-actions']);
  assert.equal(oldPresets[0].sequence.length, 10);
  assert.ok(oldPresets[0].sequence.every(item => item.left.studyId === 'union-e-march-v4' && item.left.phase === 0));
  const partial = [...previous, study('union-e-march-v5'), study('union-se-march-v5')];
  const ids = getGettysburgMotionPlaybackPresets(partial).map(item => item.id);
  assert.ok(ids.includes('v4-v5-march'));
  assert.ok(ids.includes('v5-e-se-march'));
  assert.ok(ids.includes('v5-e-se-turn'));
  assert.ok(!ids.includes('v4-v5-actions'));
  assert.ok(!ids.includes('v5-e-se-actions'));
  const comparison = preset('v4-v5-actions');
  assert.deepEqual(comparison.sequence.map(item => item.left.action), comparison.sequence.map(item => item.right.action));
  assert.deepEqual(comparison.sequence.map(item => item.left.phase), comparison.sequence.map(item => item.right.phase));
  assert.ok(comparison.sequence.every(item => item.left.studyId.endsWith('-v4') && item.right.studyId.endsWith('-v5')));
});

test('turn inspection changes E to SE and back at matching gait phases', () => {
  const sequence = createGettysburgTurnSequence(complete);
  const bearings = sequence.map(item => item.bearing).filter((bearing, index, all) => index === 0 || bearing !== all[index - 1]);
  assert.deepEqual(bearings, ['E', 'SE', 'E']);
  const switches = [];
  for (let index = 1; index < sequence.length; index++) {
    if (sequence[index].bearing !== sequence[index - 1].bearing) switches.push([sequence[index - 1].phase, sequence[index].phase]);
  }
  assert.equal(switches.length, 2);
  assert.ok(switches.every(([before, after]) => before === after));
  assert.deepEqual([...new Set(sequence.filter(item => item.bearing === 'SE').map(item => item.phase))].sort(), [0, 1, 2, 3]);
  for (const item of preset('v5-e-se-turn').sequence) {
    assert.equal(item.left.phase, item.right.phase);
    assert.equal(item.left.studyId, 'union-e-march-v5');
  }
});

test('march synchronization maps contact phases and withholds action-sheet or rejected cycles', () => {
  const sequence = createGettysburgMarchComparison(complete, 'union-e-march-v4', 'union-se-march-v5');
  assert.equal(sequence.length, 4);
  assert.deepEqual(sequence.map(item => [item.left.phase, item.right.phase]), [[0, 0], [1, 1], [2, 2], [3, 3]]);
  assert.deepEqual(createGettysburgMarchComparison(complete, 'union-e-actions-v4', 'union-e-march-v5'), []);
  assert.deepEqual(createGettysburgMarchComparison([...complete, study('union-e-strip', { status: 'rejected' })], 'union-e-strip', 'union-e-march-v4'), []);
});

test('manual inspection pauses the sequence and changes only the chosen panel', () => {
  const initial = createGettysburgMotionPlaybackState(complete);
  const running = apply(initial, { type: 'preset', preset: preset('v4-v5-actions') }, { type: 'play' }, { type: 'advance' }, { type: 'advance' });
  const inspected = reduceGettysburgMotionPlayback(running, { type: 'inspect', panel: 'left', sample: { studyId: 'union-e-actions-v4', phase: 3 } });
  assert.deepEqual(inspected.panels.left, { studyId: 'union-e-actions-v4', phase: 3 });
  assert.equal(inspected.panels.right, running.panels.right, 'the other panel keeps its displayed sample');
  assert.equal(inspected.playing, false);
  assert.equal(inspected.presetId, 'inspection');
  assert.equal(inspected.sequence.length, 0);
  assert.equal(reduceGettysburgMotionPlayback(inspected, { type: 'advance' }), inspected, 'a queued timer cannot overwrite manual inspection');
  assert.equal(reduceGettysburgMotionPlayback(inspected, { type: 'play' }), inspected, 'independent sources cannot accidentally cycle action cells');
});

test('pause preserves both samples, resume advances once, and stepping wraps while stopping playback', () => {
  const initial = createGettysburgMotionPlaybackState(previous);
  const running = apply(initial, { type: 'preset', preset: preset('v4-actions', previous) }, { type: 'play' }, { type: 'advance' });
  const paused = reduceGettysburgMotionPlayback(running, { type: 'pause' });
  assert.equal(paused.panels, running.panels);
  assert.equal(paused.sampleIndex, running.sampleIndex);
  assert.equal(reduceGettysburgMotionPlayback(paused, { type: 'advance' }), paused);
  const resumed = apply(paused, { type: 'play' }, { type: 'advance' });
  assert.equal(resumed.sampleIndex, paused.sampleIndex + 1);
  const stepped = reduceGettysburgMotionPlayback(resumed, { type: 'step', delta: -1 });
  assert.equal(stepped.sampleIndex, paused.sampleIndex);
  assert.equal(stepped.playing, false);
  assert.deepEqual(stepped.panels, paused.panels);
  const start = reduceGettysburgMotionPlayback(initial, { type: 'preset', preset: preset('v4-actions', previous) });
  const last = reduceGettysburgMotionPlayback(start, { type: 'step', delta: -1 });
  assert.equal(last.sampleIndex, 9);
  assert.equal(reduceGettysburgMotionPlayback(last, { type: 'step', delta: 1 }).sampleIndex, 0);
});

test('switching to independent inspection retains the current source positions', () => {
  const state = apply(createGettysburgMotionPlaybackState(complete), { type: 'preset', preset: preset('v5-e-se-turn') },
    { type: 'play' }, { type: 'advance' }, { type: 'advance' });
  const inspected = reduceGettysburgMotionPlayback(state, { type: 'inspection' });
  assert.equal(inspected.panels, state.panels);
  assert.equal(inspected.playing, false);
  assert.equal(inspected.sequence.length, 0);
});

test('defaults prefer complete v5 E sources while v4 remains a usable fallback', () => {
  const currentState = createGettysburgMotionPlaybackState(complete);
  assert.equal(currentState.panels.left.studyId, 'union-e-march-v5');
  assert.equal(currentState.panels.right.studyId, 'union-e-actions-v5');
  const fallbackState = createGettysburgMotionPlaybackState(previous);
  assert.equal(fallbackState.panels.left.studyId, 'union-e-march-v4');
  assert.equal(fallbackState.panels.right.studyId, 'union-e-actions-v4');
  const unreviewed = [...previous, ...family('v5').map(source => ({ ...source, status: 'rejected' }))];
  assert.deepEqual(createGettysburgMotionPlaybackState(unreviewed).panels, fallbackState.panels);
});

test('the actual registry preserves v4 playback and prefers complete v11 B E, v10 NE, v9 W, v8 SW, then latest E sources', () => {
  const state = createGettysburgMotionPlaybackState(GETTYSBURG_MOTION_STUDIES);
  const sequence = createGettysburgActionSequence(GETTYSBURG_MOTION_STUDIES);
  for (const [panel, action] of [['left', 'march'], ['right', 'actions']]) {
    const latest = ['v9', 'v8', 'v7', 'v6', 'v5', 'v4'].find(version => GETTYSBURG_MOTION_STUDIES.some(source => source.id === `union-e-${action}-${version}`
      && source.status !== 'rejected' && source.phases.length === 4 && source.columns * source.rows === 4));
    const swReady = createGettysburgActionSequence(GETTYSBURG_MOTION_STUDIES, 'v8', 'sw').length > 0;
    const westReady = createGettysburgActionSequence(GETTYSBURG_MOTION_STUDIES, 'v9', 'w').length > 0;
    const northeastReady = createGettysburgActionSequence(GETTYSBURG_MOTION_STUDIES, 'v10', 'ne', 'a', 'confederate').length > 0;
    const unionBReady = createGettysburgActionSequence(GETTYSBURG_MOTION_STUDIES, 'v11', 'e', 'b').length > 0;
    const confederateEWReady = ['e', 'w'].every(bearing => createGettysburgActionSequence(GETTYSBURG_MOTION_STUDIES, 'v13', bearing, 'a', 'confederate').length > 0);
    assert.equal(state.panels[panel].studyId, confederateEWReady ? `confederate-e-${action}-v13` : unionBReady ? `union-b-e-${action}-v11` : northeastReady ? `confederate-ne-${action}-v10` : westReady ? `union-w-${action}-v9`
      : swReady ? `union-sw-${action}-v8` : `union-e-${action}-${latest}`);
  }
  assert.equal(sequence.length, 10);
  for (const item of sequence) {
    const source = GETTYSBURG_MOTION_STUDIES.find(study => study.id === item.studyId);
    assert.ok(source && source.phases[item.phase]);
  }
});

test('v7 S A/B playback requires separately named march and action roles', () => {
  const a = [...family('v7'), ...family('v7', 'se'), ...family('v7', 's')];
  const bSouth = family('v7', 'b-s');
  const marchOnly = getGettysburgMotionPlaybackPresets([...a, bSouth[0]]);
  assert.ok(marchOnly.some(item => item.id === 'v7-s-a-b-march'));
  assert.ok(!marchOnly.some(item => item.id === 'v7-s-a-b-actions'));
  const fakeRole = [...a, bSouth[0], study('union-b-s-four-poses-v7')];
  assert.deepEqual(createGettysburgActionSequence(fakeRole, 'v7', 's', 'b'), [], 'four cells without a named action source cannot become loading artwork');
  const full = getGettysburgMotionPlaybackPresets([...a, ...bSouth]);
  const sequence = full.find(item => item.id === 'v7-s-a-b-actions').sequence;
  assert.equal(sequence.length, 10);
  for (const item of sequence) {
    assert.equal(item.left.identity, 'a'); assert.equal(item.right.identity, 'b');
    assert.equal(item.left.action, item.right.action); assert.equal(item.left.phase, item.right.phase);
    assert.equal(item.left.bearing, 'S'); assert.equal(item.right.bearing, 'S');
    assert.ok(item.left.studyId.startsWith('union-s-') && item.right.studyId.startsWith('union-b-s-'));
  }
  assert.ok(!full.some(item => /v7-(e|se)-a-b|v7-b-e-se/.test(item.id)), 'unused B E/SE variation sources do not acquire board-family presets');
});

test('Confederate N inspection remains its own A family and cannot borrow Union S artwork', () => {
  const union = [...family('v7', 's'), ...family('v7', 'b-s')];
  const north = ['march', 'actions'].map(kind => study(`confederate-n-${kind}-v7`));
  assert.deepEqual(createGettysburgActionSequence(union, 'v7', 'n', 'a', 'confederate'), []);
  assert.ok(!getGettysburgMotionPlaybackPresets([...union, north[0]]).some(item => item.id === 'v7-confederate-n-actions'));
  const preset = getGettysburgMotionPlaybackPresets([...union, ...north]).find(item => item.id === 'v7-confederate-n-actions');
  assert.equal(preset.sequence.length, 10);
  assert.ok(preset.sequence.every(item => item.left.side === 'confederate' && item.right.side === 'confederate'
    && item.right.identity === 'a' && item.right.bearing === 'N' && item.right.studyId.startsWith('confederate-n-')));
  const paused = apply(createGettysburgMotionPlaybackState([...union, ...north]), { type: 'preset', preset },
    { type: 'play' }, { type: 'advance' }, { type: 'pause' });
  assert.equal(reduceGettysburgMotionPlayback(paused, { type: 'advance' }), paused);
});

const realBoardStudyIds = ['union-s', 'union-b-s', 'confederate-n'].flatMap(address => ['march', 'actions'].map(kind => `${address}-${kind}-v7`));
const hasRealBoardStudy = GETTYSBURG_MOTION_STUDIES.some(source => realBoardStudyIds.includes(source.id));
test('real v7 board presets reflect source availability and strict validation requires all six new sources', {
  skip: hasRealBoardStudy || process.env.FORGE_REQUIRE_V7_DATA === '1' ? false : 'Pending real reviewed v7 S/N studies',
}, () => {
  const completeSource = id => GETTYSBURG_MOTION_STUDIES.some(source => source.id === id && source.status !== 'rejected'
    && source.phases.length === 4 && source.columns * source.rows === 4);
  if (process.env.FORGE_REQUIRE_V7_DATA === '1') assert.ok(realBoardStudyIds.every(completeSource), 'Union S A/B and Confederate N A each require real march and action studies');
  const presets = getGettysburgMotionPlaybackPresets(GETTYSBURG_MOTION_STUDIES);
  const southReady = ['union-s', 'union-b-s'].every(address => ['march', 'actions'].every(kind => completeSource(`${address}-${kind}-v7`)));
  assert.equal(presets.some(item => item.id === 'v7-s-a-b-actions'), southReady);
  assert.equal(presets.some(item => item.id === 'v7-s-a-b-march'), ['union-s', 'union-b-s'].every(address => completeSource(`${address}-march-v7`)));
  assert.equal(presets.some(item => item.id === 'v7-confederate-n-actions'), ['march', 'actions'].every(kind => completeSource(`confederate-n-${kind}-v7`)));
  assert.ok(!presets.some(item => /v7-(e|se)-a-b|v7-b-e-se/.test(item.id)));
});

test('v6 E/SE action comparison preserves semantic actions and exact loading-state mapping', () => {
  const studies = [...complete, ...family('v6'), ...family('v6', 'se')];
  const sequence = getGettysburgMotionPlaybackPresets(studies).find(item => item.id === 'v6-e-se-actions').sequence;
  assert.equal(sequence.length, 10);
  for (const item of sequence) {
    assert.equal(item.left.action, item.right.action);
    assert.equal(item.left.phase, item.right.phase);
    assert.equal(item.left.bearing, 'E'); assert.equal(item.right.bearing, 'SE');
    assert.ok(item.left.studyId.endsWith('-v6') && item.right.studyId.endsWith('-v6'));
  }
  assert.deepEqual(sequence.filter(item => item.right.action === 'reload').map(item => item.right.phase), [2, 3]);
  const initial = createGettysburgMotionPlaybackState(studies);
  assert.equal(initial.panels.left.studyId, 'union-e-march-v6');
  assert.equal(initial.panels.right.studyId, 'union-e-actions-v6');
});

test('v6 action turns hold the matching action and phase at every E/SE switch', () => {
  const studies = [...family('v6'), ...family('v6', 'se')];
  const sequence = createGettysburgActionTurnSequence(studies);
  assert.equal(sequence.length, 30);
  for (let index = 0; index < sequence.length; index += 3) {
    const group = sequence.slice(index, index + 3);
    assert.deepEqual(group.map(item => item.bearing), ['E', 'SE', 'E']);
    assert.ok(group.every(item => item.action === group[0].action && item.phase === group[0].phase));
  }
  const preset = getGettysburgMotionPlaybackPresets(studies).find(item => item.id === 'v6-e-se-action-turn');
  assert.ok(preset.sequence.every(item => item.left.action === item.right.action && item.left.phase === item.right.phase));
  const moving = apply(createGettysburgMotionPlaybackState(studies), { type: 'preset', preset }, { type: 'play' }, { type: 'advance' });
  const paused = reduceGettysburgMotionPlayback(moving, { type: 'pause' });
  assert.equal(paused.panels.right.bearing, 'SE');
  assert.equal(reduceGettysburgMotionPlayback(paused, { type: 'advance' }), paused);
});

test('missing or rejected v6 action sources withhold action turns while retaining complete march inspection', () => {
  const studies = [...family('v6'), study('union-se-march-v6')];
  const getIds = registry => getGettysburgMotionPlaybackPresets(registry).map(item => item.id);
  assert.ok(getIds(studies).includes('v6-e-se-turn'));
  assert.ok(!getIds(studies).includes('v6-e-se-actions'));
  assert.ok(!getIds(studies).includes('v6-e-se-action-turn'));
  assert.deepEqual(createGettysburgActionTurnSequence(studies), []);
  const rejected = [...studies, study('union-se-actions-v6', { status: 'rejected' })];
  assert.deepEqual(createGettysburgActionTurnSequence(rejected), []);
  const incomplete = [...studies, study('union-se-actions-v6', { phases: ['Ready', 'Fire', 'Load'] })];
  assert.deepEqual(createGettysburgActionTurnSequence(incomplete), []);
});

const hasRealV6Actions = GETTYSBURG_MOTION_STUDIES.some(source => source.id === 'union-se-actions-v6');
test('the real v6 registry exposes complete E/SE action and turn inspection', {
  skip: hasRealV6Actions || process.env.FORGE_REQUIRE_V6_DATA === '1' || process.env.FORGE_REQUIRE_V7_DATA === '1'
    ? false : 'Pending real reviewed v6 SE action study and registry',
}, () => {
  const presets = getGettysburgMotionPlaybackPresets(GETTYSBURG_MOTION_STUDIES);
  for (const id of ['v6-e-se-march', 'v6-e-se-actions', 'v6-e-se-turn', 'v6-e-se-action-turn']) assert.ok(presets.some(item => item.id === id), id);
  const sequence = presets.find(item => item.id === 'v6-e-se-actions').sequence;
  assert.equal(sequence.length, 10);
  assert.ok(sequence.every(item => item.left.studyId.startsWith('union-e-') && item.right.studyId.startsWith('union-se-')));
});

test('the actual partial SE family enables march and turn inspection without inventing SE action playback', () => {
  const presets = getGettysburgMotionPlaybackPresets(GETTYSBURG_MOTION_STUDIES);
  const march = presets.find(item => item.id === 'v5-e-se-march');
  const turn = presets.find(item => item.id === 'v5-e-se-turn');
  assert.ok(march && turn, 'the real registered SE march must enable both inspection presets');
  assert.equal(march.sequence.length, 4);
  assert.ok(march.sequence.every(item => item.left.studyId === 'union-e-march-v5'
    && item.right.studyId === 'union-se-march-v5' && item.left.phase === item.right.phase));
  assert.deepEqual([...new Set(turn.sequence.map(item => item.right.studyId))], ['union-e-march-v5', 'union-se-march-v5']);
  assert.ok(!presets.some(item => item.id === 'v5-e-se-actions'), 'missing SE actions cannot borrow E artwork');
});

const v8Family = [...family('v8', 's'), ...family('v8', 'sw'), ...family('v8', 'b-s'), ...family('v8', 'b-sw')];
const v8PairPresetIds = ['v8-s-sw', 'v8-b-s-sw'].flatMap(prefix => ['march', 'actions', 'turn', 'action-turn'].map(kind => `${prefix}-${kind}`));

test('parameterized S/SW turns preserve identity, action and phase without changing E/SE defaults', () => {
  for (const identity of ['a', 'b']) {
    const turn = createGettysburgTurnSequence(v8Family, 'v8', identity, ['s', 'sw']);
    assert.equal(turn.length, 14);
    assert.deepEqual(turn.map(item => item.bearing).filter((bearing, index, all) => index === 0 || bearing !== all[index - 1]), ['S', 'SW', 'S']);
    assert.ok(turn.every(item => item.identity === identity && item.action === 'march'));
    for (let index = 1; index < turn.length; index++) {
      if (turn[index].bearing !== turn[index - 1].bearing) assert.equal(turn[index].phase, turn[index - 1].phase);
    }
    const actions = createGettysburgActionTurnSequence(v8Family, 'v8', identity, ['S', 'SW']);
    assert.equal(actions.length, 30);
    for (let index = 0; index < actions.length; index += 3) {
      const group = actions.slice(index, index + 3);
      assert.deepEqual(group.map(item => item.bearing), ['S', 'SW', 'S']);
      assert.ok(group.every(item => item.identity === identity && item.action === group[0].action && item.phase === group[0].phase));
    }
  }
  assert.deepEqual(createGettysburgTurnSequence(complete), createGettysburgTurnSequence(complete, 'v5', 'a', ['e', 'se']));
  const old = [...family('v6'), ...family('v6', 'se')];
  assert.deepEqual(createGettysburgActionTurnSequence(old), createGettysburgActionTurnSequence(old, 'v6', 'a', ['e', 'se']));
});

test('malformed bearing pairs withhold whole turn sequences', () => {
  for (const pair of [null, 's-sw', [], ['s'], ['s', 'sw', 'w'], ['s', 's'], ['S', 's'], ['s', null], ['s', 3], ['s', 'unknown'], ['s', '']]) {
    assert.deepEqual(createGettysburgTurnSequence(v8Family, 'v8', 'a', pair), []);
    assert.deepEqual(createGettysburgActionTurnSequence(v8Family, 'v8', 'a', pair), []);
  }
  for (const identity of [null, 'c']) {
    assert.deepEqual(createGettysburgTurnSequence(v8Family, 'v8', identity, ['s', 'sw']), []);
    assert.deepEqual(createGettysburgActionTurnSequence(v8Family, 'v8', identity, ['s', 'sw']), []);
  }
  assert.deepEqual(createGettysburgActionSequence(v8Family, 'v8', null), []);
});

test('v8 S/SW presets require complete roles and never form half action sequences', () => {
  const presets = getGettysburgMotionPlaybackPresets(v8Family);
  for (const id of [...v8PairPresetIds, 'v8-sw-a-b-march', 'v8-sw-a-b-actions']) assert.ok(presets.some(item => item.id === id), id);
  for (const identity of ['a', 'b']) {
    const prefix = `v8${identity === 'a' ? '' : '-b'}-s-sw`;
    for (const kind of ['actions', 'action-turn']) {
      const sequence = presets.find(item => item.id === `${prefix}-${kind}`).sequence;
      assert.equal(sequence.length, kind === 'actions' ? 10 : 30);
      assert.ok(sequence.every(item => item.left.identity === identity && item.right.identity === identity
        && item.left.action === item.right.action && item.left.phase === item.right.phase));
    }
    const actionId = `union-${identity === 'a' ? '' : 'b-'}sw-actions-v8`;
    const missing = v8Family.filter(source => source.id !== actionId);
    for (const sources of [missing, [...missing, study(actionId, { status: 'rejected' })], [...missing, study(actionId, { phases: ['Ready', 'Fire', 'Load'] })]]) {
      const ids = getGettysburgMotionPlaybackPresets(sources).map(item => item.id);
      assert.ok(ids.includes(`${prefix}-march`) && ids.includes(`${prefix}-turn`));
      assert.ok(!ids.includes(`${prefix}-actions`) && !ids.includes(`${prefix}-action-turn`));
      assert.ok(!ids.includes('v8-sw-a-b-actions'));
      assert.deepEqual(createGettysburgActionTurnSequence(sources, 'v8', identity, ['s', 'sw']), []);
    }
    const malformed = v8Family.map(source => source.id === actionId ? { ...source, cellOrder: [0, 1, 1, 3] } : source);
    assert.deepEqual(createGettysburgActionTurnSequence(malformed, 'v8', identity, ['s', 'sw']), []);
  }
});

test('reviewer startup prefers complete SW A/B, falls back to A S/SW, and preserves older defaults', () => {
  const choose = sources => getGettysburgMotionPlaybackInitialPreset(getGettysburgMotionPlaybackPresets(sources));
  const old = [...family('v7'), ...family('v7', 'se'), ...family('v7', 's'), ...family('v7', 'b-s')];
  const full = [...old, ...v8Family];
  assert.equal(choose(full).id, 'v8-sw-a-b-actions');
  const started = reduceGettysburgMotionPlayback(createGettysburgMotionPlaybackState(full), { type: 'preset', preset: choose(full) });
  assert.equal(started.panels.left.bearing, 'SW'); assert.equal(started.panels.right.bearing, 'SW');
  assert.equal(started.panels.left.identity, 'a'); assert.equal(started.panels.right.identity, 'b');
  const aOnly = [...old, ...v8Family.filter(source => !source.id.startsWith('union-b-'))];
  assert.equal(choose(aOnly).id, 'v8-s-sw-actions');
  const partial = [...old, study('union-sw-march-v8')];
  assert.equal(choose(partial).id, 'v7-s-a-b-actions');
  assert.deepEqual(createGettysburgMotionPlaybackState(partial).panels, createGettysburgMotionPlaybackState(old).panels,
    'one SW sheet cannot mix a new march default with an older action default');
  assert.equal(choose(complete).id, 'v5-actions'); assert.equal(choose(previous).id, 'v4-actions');
  assert.equal(choose([]), null);
});

test('v8 retains the exact ten v7 source studies with explicit retained coverage', () => {
  const v7 = GETTYSBURG_MOTION_STUDIES.filter(source => source.id.endsWith('-v7'));
  assert.equal(v7.length, 10);
  for (const prior of v7) {
    const retained = GETTYSBURG_MOTION_STUDIES.find(source => source.id === prior.id.replace(/-v7$/, '-v8'));
    assert.ok(retained, prior.id);
    for (const field of ['source', 'receipt', 'sourceSha256', 'width', 'height', 'columns', 'rows', 'cellOrder', 'phaseRoots', 'referenceHeight']) {
      assert.deepEqual(retained[field], prior[field], `${prior.id} ${field}`);
    }
    assert.equal(retained.retainedFrom, prior.id);
    assert.equal(retained.approved, false);
    assert.ok(retained.limitations.some(line => line.includes('adds no new bearing, identity, action or production approval')));
  }
});

const realV8SwStudyIds = ['union-sw', 'union-b-sw'].flatMap(address => ['march', 'actions'].map(kind => `${address}-${kind}-v8`));
const hasRealV8SwStudy = GETTYSBURG_MOTION_STUDIES.some(source => realV8SwStudyIds.includes(source.id));
test('real v8 SW sources enable both identity comparisons and strict validation requires all four images and receipts', {
  skip: hasRealV8SwStudy || process.env.FORGE_REQUIRE_V8_DATA === '1' ? false : 'Pending real annotated v8 SW studies',
}, () => {
  const completeSource = id => GETTYSBURG_MOTION_STUDIES.some(source => source.id === id && source.status !== 'rejected'
    && source.phases.length === 4 && source.columns * source.rows === 4);
  const presets = getGettysburgMotionPlaybackPresets(GETTYSBURG_MOTION_STUDIES);
  if (process.env.FORGE_REQUIRE_V8_DATA === '1') {
    assert.ok(realV8SwStudyIds.every(completeSource), 'Union A/B SW each require their own real march and action study');
    for (const id of realV8SwStudyIds) {
      const source = GETTYSBURG_MOTION_STUDIES.find(item => item.id === id);
      const file = new URL(`../${source.source.slice(1)}`, import.meta.url);
      assert.ok(existsSync(file), `${id} native source image`);
      assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), source.sourceSha256, `${id} source hash`);
      const receiptFile = new URL(`../${source.receipt.slice(1)}`, import.meta.url);
      assert.ok(existsSync(receiptFile), `${id} measurement receipt`);
      const receipt = JSON.parse(readFileSync(receiptFile, 'utf8'));
      assert.equal(receipt.source, source.source.slice(1));
      assert.equal(receipt.sourceHash, source.sourceSha256);
      assert.deepEqual(receipt.nativeSize, { w: source.width, h: source.height });
      for (let phase = 0; phase < 4; phase++) {
        const nativeCell = source.cellOrder[phase];
        const root = receipt.cells.find(cell => cell.index === nativeCell).rootPixels;
        const cell = getGettysburgMotionStudyCell(source, phase);
        assert.deepEqual(cell, { x: nativeCell % 2 * source.width / 2, y: Math.floor(nativeCell / 2) * source.height / 2, w: source.width / 2, h: source.height / 2 });
        assert.deepEqual(source.phaseRoots[phase], { x: root[0] / cell.w, y: root[1] / cell.h }, `${id} registered chronological phase ${phase}`);
      }
    }
    for (const id of [...v8PairPresetIds, 'v8-sw-a-b-march', 'v8-sw-a-b-actions']) {
      const preset = presets.find(item => item.id === id);
      assert.ok(preset, id);
      for (const item of preset.sequence) {
        assert.equal(item.left.phase, item.right.phase, `${id} matched phase`);
        assert.equal(item.left.action, item.right.action, `${id} matched action`);
        for (const panel of [item.left, item.right]) {
          assert.ok(panel.studyId.endsWith('-v8') && completeSource(panel.studyId), `${id} registered v8 source`);
          assert.ok(Number.isInteger(panel.phase) && panel.phase >= 0 && panel.phase < 4, `${id} bounded phase`);
          assert.equal(panel.action === 'march', panel.studyId.includes('-march-'), `${id} named source role`);
          if (panel.bearing) assert.equal(panel.bearing, panel.studyId.split('-').at(-3).toUpperCase(), `${id} source bearing`);
        }
      }
    }
  }
  for (const identity of ['a', 'b']) {
    const address = identity === 'a' ? 'union' : 'union-b';
    const prefix = `v8${identity === 'a' ? '' : '-b'}-s-sw`;
    const marchReady = ['s', 'sw'].every(bearing => completeSource(`${address}-${bearing}-march-v8`));
    const actionReady = ['s', 'sw'].every(bearing => ['march', 'actions'].every(kind => completeSource(`${address}-${bearing}-${kind}-v8`)));
    assert.equal(presets.some(item => item.id === `${prefix}-march`), marchReady);
    assert.equal(presets.some(item => item.id === `${prefix}-turn`), marchReady);
    assert.equal(presets.some(item => item.id === `${prefix}-actions`), actionReady);
    assert.equal(presets.some(item => item.id === `${prefix}-action-turn`), actionReady);
  }
});
