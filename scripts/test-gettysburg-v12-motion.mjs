import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gettysburgInfantryClipAssets, gettysburgInfantryClipDefinitions } from '../src/battle/gettysburgInfantryClipAssets.js';
import { gettysburgInfantryClipPolicy } from '../src/battle/gettysburgInfantryClipPolicy.js';
import { GETTYSBURG_INFANTRY_CLIPS_IDS, gettysburgInfantryClipsEnabled, gettysburgInfantryClipPose,
  prepareGettysburgInfantryClips } from '../src/battle/gettysburgInfantryClips.js';
import { gettysburgInfantryShootingAge, gettysburgInfantryShotMotion } from '../src/battle/gettysburgInfantryShotMotion.js';
import { gettysburgInfantryIdentity } from '../src/battle/gettysburgInfantryFamily.js';
import { createFormationVisual, updateFormationVisual } from '../src/battle/formationVisualState.js';
import { deterministicUnitValue } from '../src/battle/formationMath.js';
import { detailedInfantryPose } from '../src/battle/detailedUnitVisual.js';
import { gettysburgClipTestTextures } from './test-support/gettysburgClipTextures.mjs';

const search = '?artPass=gettysburg-v12';
const historicalPasses = Array.from({ length: 9 }, (_, index) => `gettysburg-v${index + 3}`);
const allAssets = new Map([...historicalPasses, 'gettysburg-v12'].flatMap(pass =>
  gettysburgInfantryClipAssets('gettysburg', `?artPass=${pass}`)).map(asset => [asset.key, asset]));
// Missing real native data fails immediately. This is the installed Phaser
// JSONHash parser and Frame fixture, not a fabricated clip or optional skip.
const atlases = new Map([...allAssets.values()].map(asset => [asset.key,
  JSON.parse(readFileSync(new URL(`../public/${asset.json}`, import.meta.url)))]));
const textures = gettysburgClipTestTextures(atlases);
const prepare = query => prepareGettysburgInfantryClips(
  gettysburgInfantryClipDefinitions('gettysburg', query, textures),
  (key, name) => textures.exists(key) && textures.get(key).has(name),
);
const clips = prepare(search);
const formationId = 'v12-native-motion-proof';
const idFor = identity => Array.from({ length: 256 }, (_, id) => id)
  .find(id => gettysburgInfantryIdentity(formationId, id) === identity);
const figureFor = clip => ({ id: idFor(clip.identity), direction: clip.direction,
  action: clip.action === 'march' ? 'walk' : clip.action, frame: 0, scale: 1 });
const pose = (figure, side = 'union', options = {}, query = search, prepared = clips, time = 0) =>
  gettysburgInfantryClipPose(formationId, figure, time, {
    scenarioId: 'gettysburg', search: query, side, identity: 'a', versionedIdentity: true,
    clips: prepared, ...options,
  });
const assertNeutral = value => {
  assert.equal(value.offsetX, 0); assert.equal(value.offsetY, 0); assert.equal(value.angle, 0);
};
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-12,
  message || `${actual} differs from ${expected}`);
const withoutMotion = ({ shotMotion, offsetX, offsetY, ...value }) => value;

test('v12 reuses the exact 26 v11 atlas descriptors and all 52 installed native clips', () => {
  const current = gettysburgInfantryClipPolicy('gettysburg', search);
  const previous = gettysburgInfantryClipPolicy('gettysburg', '?artPass=gettysburg-v11');
  assert.deepEqual(GETTYSBURG_INFANTRY_CLIPS_IDS, [...historicalPasses, 'gettysburg-v12', 'gettysburg-v13', 'gettysburg-v14', 'gettysburg-v15', 'gettysburg-v16', 'gettysburg-v17', 'gettysburg-v18']);
  assert.ok(gettysburgInfantryClipsEnabled('gettysburg', search));
  assert.equal(current.shotMotion, true);
  assert.equal(current.atlases, previous.atlases, 'the same immutable atlas list is reused');
  assert.deepEqual(current.directions, previous.directions);
  assert.equal(current.stableUnionIdentity, previous.stableUnionIdentity);
  assert.ok(Object.isFrozen(current) && Object.isFrozen(current.atlases));
  assert.equal(current.atlases.length, 26);
  const assets = gettysburgInfantryClipAssets('gettysburg', search);
  assert.deepEqual(assets, gettysburgInfantryClipAssets('gettysburg', '?artPass=gettysburg-v11'));
  assert.equal(new Set(assets.map(asset => asset.image)).size, 26);
  assert.ok(assets.every(asset => !asset.image.includes('/gettysburg-v12/')));
  assert.equal(clips.length, 52);
  assert.deepEqual(clips, prepare('?artPass=gettysburg-v11'));
  assert.deepEqual([...new Set(clips.map(clip => `${clip.side}:${clip.identity}:${clip.direction}`))].sort(),
    ['confederate:a:5', 'confederate:a:6', 'confederate:a:7',
      'union:a:0', 'union:a:1', 'union:a:2', 'union:a:3', 'union:a:4',
      'union:b:0', 'union:b:1', 'union:b:2', 'union:b:3', 'union:b:4']);
  for (const pass of historicalPasses) {
    const old = gettysburgInfantryClipPolicy('gettysburg', `?artPass=${pass}`);
    assert.deepEqual(Object.keys(old).sort(), ['atlases', 'directions', 'stableUnionIdentity']);
    assert.equal(Object.hasOwn(old, 'shotMotion'), false);
  }
});

test('v3-v11 retain a pre-change snapshot of all policy, asset and native pose outputs', () => {
  const rows = [];
  for (const pass of historicalPasses) {
    const query = `?artPass=${pass}`;
    const prepared = prepare(query);
    rows.push({ pass, policy: gettysburgInfantryClipPolicy('gettysburg', query),
      assets: gettysburgInfantryClipAssets('gettysburg', query) });
    for (const clip of prepared) for (const frame of [0, 1, 2, 3, 7]) for (const flags of [{},
      { paused: true, frozenAction: clip.action, frozenPhase: clip.frames.length - 1 },
      { reducedMotion: true }, { resolving: true, frozenAction: clip.action, frozenPhase: clip.frames.length - 1 }]) {
      const figure = { id: 17, direction: clip.direction, action: clip.action === 'march' ? 'walk' : clip.action,
        frame, scale: 1.37, bodyOffsetX: 5, bodyOffsetY: -4, lean: 2 };
      rows.push({ pass, key: clip.key, action: clip.action, frame, flags,
        pose: gettysburgInfantryClipPose('v12-historical-proof', figure, 999, {
          scenarioId: 'gettysburg', search: query, side: clip.side, identity: clip.identity,
          clips: prepared, shootingAge: .08, ...flags,
        }) });
    }
  }
  assert.equal(rows.length, 3969);
  // Captured from the unmodified v11 implementation before this pass.
  assert.equal(createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
    '27e45760a575ee0f5313fa0aad0a3505b910056dc15efbf3a65604a5571e32b5');
});

test('every reviewed native fire view recoils behind its authored bearing with no rotation or metadata changes', () => {
  const fireClips = clips.filter(clip => clip.action === 'fire');
  assert.equal(fireClips.length, 13);
  for (const clip of fireClips) {
    const figure = { ...figureFor(clip), bodyOffsetX: 999, bodyOffsetY: 999, lean: 999 };
    const previous = pose(figure, clip.side, { shootingAge: .08 }, '?artPass=gettysburg-v11');
    const value = pose(figure, clip.side, { shootingAge: .08 });
    assert.equal(value.shotMotion, true);
    assert.equal(value.angle, 0);
    assert.deepEqual(withoutMotion(value), withoutMotion(previous));
    assert.equal(value.pivot, clip.pivots[0]); assert.equal(value.muzzle, clip.muzzles[0]);
    const bearing = figure.direction * Math.PI / 4;
    close(value.offsetX, -Math.cos(bearing) * 1.1);
    close(value.offsetY, -Math.sin(bearing) * .55);
    close(value.offsetX * Math.cos(bearing) + value.offsetY * 2 * Math.sin(bearing), -1.1);
    close(value.offsetX * Math.sin(bearing) - value.offsetY * 2 * Math.cos(bearing), 0);
    assert.ok(Math.hypot(value.offsetX, value.offsetY) <= 1.1 + 1e-12);
    assert.equal(Object.hasOwn(previous, 'shotMotion'), false);
    assertNeutral(previous);
  }
});

test('all native fire curves start neutral, rise smoothly, remain bounded and settle before fire ends', () => {
  for (const clip of clips.filter(clip => clip.action === 'fire')) for (const scale of [.5, .82, 1, 1.5]) {
    const figure = { ...figureFor(clip), scale };
    const samples = Array.from({ length: 101 }, (_, index) => {
      const value = pose(figure, clip.side, { shootingAge: index / 200 });
      assert.equal(value.angle, 0);
      assert.ok(Math.hypot(value.offsetX, value.offsetY * 2) <= 1.1 * scale + 1e-12);
      return Math.hypot(value.offsetX, value.offsetY * 2);
    });
    close(samples[16], 1.1 * scale);
    for (let index = 1; index <= 16; index++) assert.ok(samples[index] >= samples[index - 1]);
    for (let index = 17; index <= 80; index++) assert.ok(samples[index] <= samples[index - 1]);
    for (const age of [-10, -Number.EPSILON, 0, .4, .49, .5, 100]) assertNeutral(pose(figure, clip.side, { shootingAge: age }));
    for (const age of [Number.EPSILON, .4 - Number.EPSILON]) {
      const value = pose(figure, clip.side, { shootingAge: age });
      assert.ok(Math.hypot(value.offsetX, value.offsetY) < 1e-12, 'no discontinuity at an endpoint');
    }
    const nearPeak = pose(figure, clip.side, { shootingAge: .08 - 1e-7 });
    const pastPeak = pose(figure, clip.side, { shootingAge: .08 + 1e-7 });
    assert.ok(Math.abs(Math.hypot(nearPeak.offsetX, nearPeak.offsetY * 2)
      - Math.hypot(pastPeak.offsetX, pastPeak.offsetY * 2)) < 1e-9, 'smooth peak');
  }
});

test('pause retains the age-derived native fire pose; reduced motion and resolution suppress displacement', () => {
  for (const clip of clips.filter(clip => clip.action === 'fire')) for (const age of [.03, .08, .19, .37]) {
    const figure = figureFor(clip);
    const options = { shootingAge: age };
    const value = pose(figure, clip.side, options);
    for (const time of [0, 100, 999999]) {
      assert.deepEqual(pose(figure, clip.side, { ...options, paused: true }, search, clips, time), value);
      assertNeutral(pose(figure, clip.side, { ...options, reducedMotion: true }, search, clips, time));
      assertNeutral(pose(figure, clip.side, { ...options, resolving: true }, search, clips, time));
      assertNeutral(pose(figure, clip.side, { ...options, paused: true, resolving: true }, search, clips, time));
    }
  }
});

test('march, routing, ready and reload preserve all native authored phases, pivots and zero transforms', () => {
  for (const clip of clips.filter(clip => clip.action !== 'fire')) for (let frame = 0; frame < 8; frame++) {
    const figure = { ...figureFor(clip), frame, bodyOffsetX: 99, bodyOffsetY: -99, lean: 70 };
    for (const action of clip.action === 'march' ? ['walk', 'route'] : [figure.action]) for (const flags of [{},
      { paused: true, frozenAction: clip.action, frozenPhase: clip.frames.length - 1 },
      { reducedMotion: true }, { resolving: true }]) {
      const options = { shootingAge: .08, ...flags };
      const value = pose({ ...figure, action }, clip.side, options);
      const old = pose({ ...figure, action }, clip.side, options, '?artPass=gettysburg-v11');
      assert.equal(value.shotMotion, true);
      assertNeutral(value);
      assert.deepEqual(withoutMotion(value), withoutMotion(old));
      assert.equal(value.pivot, clip.pivots[value.phase]);
    }
  }
});

test('unknown ages, malformed motion input and disabled passes cannot synthesize recoil', () => {
  const figure = { id: idFor('a'), direction: 0, action: 'fire', frame: 0, scale: 1 };
  for (const shootingAge of [undefined, null, NaN, Infinity, -Infinity, '0.08']) {
    assertNeutral(pose(figure, 'union', { shootingAge }));
  }
  for (const scale of [0, -1, NaN, Infinity, null, '1']) {
    assertNeutral(pose({ ...figure, scale }, 'union', { shootingAge: .08 }));
  }
  for (const direction of [-1, 8, .5, NaN, undefined, '0']) {
    assertNeutral(gettysburgInfantryShotMotion({ ...figure, direction }, { shootingAge: .08 }));
  }
  assertNeutral(gettysburgInfantryShotMotion(null, { shootingAge: .08 }));
  assertNeutral(gettysburgInfantryShotMotion({ ...figure, action: 'reload' }, { shootingAge: .08 }));
  for (const query of ['', '?artPass=gettysburg-v19', '?artPass=gettysburg-v12-other', '?other=gettysburg-v12']) {
    assert.equal(gettysburgInfantryClipsEnabled('gettysburg', query), false);
    assert.equal(pose(figure, 'union', { shootingAge: .08 }, query), null);
  }
  for (const scenarioId of ['gettysburg_meade', 'gettysburg_jackson', 'first_manassas', 'shiloh', null]) {
    assert.equal(pose(figure, 'union', { scenarioId, shootingAge: .08 }), null);
  }
});

test('v12 keeps missing identity, action and bearing on accepted fallback art', () => {
  for (const clip of clips) {
    const figure = figureFor(clip);
    const incomplete = clips.filter(value => value !== clip);
    assert.equal(pose(figure, clip.side, { shootingAge: .08 }, search, incomplete), null);
  }
  const unsupported = [
    { side: 'union', figure: { id: idFor('a'), direction: 6, action: 'fire', frame: 0, scale: 1 } },
    { side: 'confederate', figure: { id: idFor('a'), direction: 0, action: 'fire', frame: 0, scale: 1 } },
    { side: 'union', figure: { id: idFor('b'), direction: 0, action: 'melee', frame: 0, scale: 1 } },
  ];
  for (const { side, figure } of unsupported) {
    assert.equal(pose(figure, side, { shootingAge: .08 }), null);
    const accepted = detailedInfantryPose(formationId, figure, .08, false, false);
    assert.deepEqual({ ...accepted, ...(pose(figure, side, { shootingAge: .08 }) || {}) }, accepted);
  }
  assert.equal(pose({ ...figureFor(clips[0]), fallen: true }, clips[0].side, { shootingAge: .08 }), null);
});

test('shooting-age helper matches actual formation stagger and firing boundaries without mutating combat facts', () => {
  const base = { id: 'v12-stagger-proof', x: 200, y: 200, facing: 0, strength: 100, initialStrength: 100,
    formationMode: 'line', frontage: 100, status: 'firing', engagedWith: 'enemy', reload: 10,
    lastVolleyAt: 7, fatigue: 0, footprint: { width: 100, depth: 30 } };
  for (const formation of [base, { ...base, footprint: undefined }]) {
    const before = structuredClone(formation);
    const state = createFormationVisual(formation, 12, 7);
    const frontIds = state.figures.filter(figure => figure.slot.frontRank).map(figure => figure.id);
    for (const id of frontIds) {
      const stagger = formation.footprint ? deterministicUnitValue(formation.id, id, 123) * .09 : 0;
      const firingAt = formation.lastVolleyAt + stagger + .08;
      const age = gettysburgInfantryShootingAge(formation, id, firingAt);
      close(age, .08);
      const atTime = time => updateFormationVisual(createFormationVisual(formation, 12, 6), formation, time, 1)
        .figures.find(figure => figure.id === id);
      const figure = atTime(firingAt);
      assert.equal(figure.action, 'fire');
      const value = gettysburgInfantryClipPose(formation.id, figure, firingAt, {
        scenarioId: 'gettysburg', search, clips, side: 'union', identity: 'a', shootingAge: age,
      });
      close(value.offsetX, -1.1); close(value.offsetY, 0);
      const beforeShot = atTime(formation.lastVolleyAt + stagger - .001);
      assert.notEqual(beforeShot.action, 'fire');
      const afterShot = atTime(formation.lastVolleyAt + stagger + .501);
      assert.notEqual(afterShot.action, 'fire');
    }
    assert.deepEqual(formation, before);
  }
  for (const formation of [null, {}, { lastVolleyAt: NaN }, { lastVolleyAt: Infinity }, { lastVolleyAt: -Infinity }]) {
    assert.equal(gettysburgInfantryShootingAge(formation, 0, 10), null);
  }
  for (const time of [undefined, NaN, Infinity, -Infinity, '10']) {
    assert.equal(gettysburgInfantryShootingAge(base, 0, time), null);
  }
});
