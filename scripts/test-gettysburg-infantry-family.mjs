import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  GETTYSBURG_INFANTRY_FAMILY_ID,
  GETTYSBURG_INFANTRY_DIRECTIONS,
  gettysburgInfantryFamilyEnabled,
  gettysburgInfantryFamilyAssets,
  gettysburgInfantryFamilyTextureKey,
  gettysburgInfantryIdentity,
  gettysburgInfantryContactPhase,
  gettysburgInfantryStandardAnchor,
  gettysburgInfantryExpectedFrames,
  gettysburgInfantryFamilyPose,
  validateGettysburgInfantryAtlas,
} from '../src/battle/gettysburgInfantryFamily.js';

const optedIn = Object.freeze({ scenarioId: 'gettysburg', search: `?artPass=${GETTYSBURG_INFANTRY_FAMILY_ID}` });
const soldier = Object.freeze({ id: 7, action: 'idle', direction: 0, frame: 0, scale: .82 });
const pose = (figure, options = {}, formationId = 'picketts-division', time = 0) =>
  gettysburgInfantryFamilyPose(formationId, figure, time, { ...optedIn, ...options });

test('the v2 pilot loads only for an exact Gettysburg scenario and query opt-in', () => {
  assert.equal(gettysburgInfantryFamilyEnabled('gettysburg', optedIn.search), true);
  for (const scenario of ['gettysburg_jackson', 'gettysburg_meade', 'manassas', null]) {
    assert.equal(gettysburgInfantryFamilyEnabled(scenario, optedIn.search), false);
    assert.deepEqual(gettysburgInfantryFamilyAssets(scenario, optedIn.search), []);
  }
  for (const search of ['', '?artPass=gettysburg-v1', '?artPass=gettysburg-v2-other', '?other=gettysburg-v2']) {
    assert.equal(gettysburgInfantryFamilyEnabled('gettysburg', search), false);
    assert.deepEqual(gettysburgInfantryFamilyAssets('gettysburg', search), []);
    assert.equal(pose(soldier, { search }), null);
  }
  assert.equal(gettysburgInfantryFamilyPose('a', soldier, 0), null);
});

test('the asset contract covers both sides and pages with canonical URL joining', () => {
  const assets = gettysburgInfantryFamilyAssets('gettysburg', optedIn.search);
  assert.equal(assets.length, 4);
  assert.deepEqual(assets.map(asset => [asset.side, asset.page]), [
    ['union', 'ready'], ['union', 'march'], ['confederate', 'ready'], ['confederate', 'march'],
  ]);
  for (const asset of assets) {
    assert.equal(asset.key, gettysburgInfantryFamilyTextureKey(asset.side, asset.page));
    assert.equal(asset.image, `images/units/gettysburg-v2/${asset.side}-${asset.page}.png`);
    assert.equal(asset.json, `images/units/gettysburg-v2/${asset.side}-${asset.page}.json`);
  }
  for (const base of ['/game', '/game/', 'https://example.test/game/']) {
    const rooted = gettysburgInfantryFamilyAssets('gettysburg', optedIn.search, base);
    assert.equal(rooted[0].image, `${base.replace(/\/$/, '')}/${assets[0].image}`);
  }
  assert.throws(() => gettysburgInfantryFamilyTextureKey('other', 'ready'), RangeError);
  assert.throws(() => gettysburgInfantryFamilyTextureKey('union', 'aim'), RangeError);
});

test('soldier identity remains stable across directions, time, ready, march and routing', () => {
  const identities = new Set();
  const phases = new Set();
  for (let id = 0; id < 100; id++) {
    const identity = gettysburgInfantryIdentity('brigade-one', id);
    identities.add(identity);
    phases.add(gettysburgInfantryContactPhase('brigade-one', id));
    for (let direction = 0; direction < 8; direction++) {
      for (const action of ['ready', 'idle', 'walk', 'route']) {
        const value = pose({ ...soldier, id, direction, action }, {}, 'brigade-one', id * 50);
        assert.equal(value.identity, identity);
        assert.equal(value.direction, direction);
        assert.equal(value.flip, false, 'opposing directions have authored frames');
      }
    }
  }
  assert.deepEqual([...identities].sort(), ['a', 'b']);
  assert.deepEqual([...phases].sort(), [0, 1, 2, 3]);
  const row = Array.from({ length: 20 }, (_, id) => gettysburgInfantryIdentity('brigade-one', id));
  assert.ok(row.some((identity, index) => index > 0 && identity === row[index - 1]), 'sequential soldiers do not form a mechanical ABAB row');
});

test('all eight directions select their own ready and opposing march contact keys', () => {
  assert.deepEqual(GETTYSBURG_INFANTRY_DIRECTIONS, ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']);
  const readyKeys = new Set(gettysburgInfantryExpectedFrames('ready'));
  const marchKeys = new Set(gettysburgInfantryExpectedFrames('march'));
  assert.equal(readyKeys.size, 16);
  assert.equal(marchKeys.size, 32);
  for (let direction = 0; direction < 8; direction++) {
    assert.ok(readyKeys.has(pose({ ...soldier, direction }).frame));
    const first = pose({ ...soldier, action: 'walk', direction, frame: 0 });
    const opposite = pose({ ...soldier, action: 'walk', direction, frame: 2 });
    const fullCycle = pose({ ...soldier, action: 'walk', direction, frame: 4 });
    assert.equal(opposite.contact, 1 - first.contact);
    assert.equal(fullCycle.contact, first.contact);
    assert.equal(first.angle, 0);
    assert.equal(first.offsetX, 0);
    assert.equal(first.offsetY, 0);
    assert.ok(marchKeys.has(first.frame));
    assert.ok(marchKeys.has(opposite.frame));
    assert.equal(pose({ ...soldier, action: 'route', direction, frame: 0 }).frame, first.frame);
  }
  for (const direction of [-1, 8, 1.5, NaN, Infinity, undefined]) assert.equal(pose({ ...soldier, direction }), null);
});

test('render time does not animate contact and reduced motion or pause freezes stepping', () => {
  const walking = { ...soldier, action: 'walk', frame: 1 };
  assert.deepEqual(pose(walking, {}, undefined, 0), pose(walking, {}, undefined, 100));
  const reduced = pose(walking, { reducedMotion: true });
  const paused = pose(walking, { paused: true });
  for (let frame = 0; frame < 8; frame++) {
    assert.deepEqual(pose({ ...walking, frame }, { reducedMotion: true }), reduced);
    assert.deepEqual(pose({ ...walking, frame }, { paused: true }), paused);
    assert.deepEqual(pose({ ...walking, frame }, { resolving: true }), paused);
    assert.equal(pose({ ...walking, frame }, { paused: true, frozenContact: 1 }).contact, 1);
    assert.equal(pose({ ...walking, frame }, { resolving: true, frozenContact: 0 }).contact, 0);
  }
  const lastLive = pose(walking);
  const frozen = pose({ ...walking, frame: 7 }, { paused: true, frozenContact: lastLive.contact });
  assert.equal(frozen.frame, lastLive.frame, 'explicit pause retains the contact visible before pause');
});

test('the authored family preserves body proportions across every supported pose', () => {
  for (let id = 0; id < 40; id++) {
    const reference = pose({ ...soldier, id });
    assert.equal(reference.width, reference.height);
    for (const action of ['idle', 'walk', 'route']) for (let frame = 0; frame < 4; frame++) {
      const current = pose({ ...soldier, id, action, frame });
      assert.equal(current.width, reference.width);
      assert.equal(current.height, reference.height);
    }
  }
});

test('unsupported actions explicitly fall back without mutating figure or options', () => {
  for (const action of ['fire', 'reload', 'melee', 'fall', 'aim', 'new-action', undefined]) {
    assert.equal(pose(Object.freeze({ ...soldier, action })), null);
  }
  assert.equal(pose({ ...soldier, fallen: true }), null);
  assert.equal(pose(null), null);
  const options = Object.freeze({ ...optedIn, paused: true, frozenContact: 1 });
  const beforeFigure = JSON.stringify(soldier);
  const beforeOptions = JSON.stringify(options);
  gettysburgInfantryFamilyPose('formation', soldier, 4, options);
  assert.equal(JSON.stringify(soldier), beforeFigure);
  assert.equal(JSON.stringify(options), beforeOptions);
});

test('standard adjacency retains the surviving soldier and selects a stable central replacement', () => {
  const formation = Object.freeze({ x: 100, y: 200 });
  const figures = Object.freeze([
    Object.freeze({ id: 9, x: 80, y: 200, visible: true, action: 'idle' }),
    Object.freeze({ id: 3, x: 105, y: 200, visible: true, action: 'walk' }),
    Object.freeze({ id: 2, x: 95, y: 200, visible: true, action: 'idle' }),
    Object.freeze({ id: 1, x: 100, y: 200, visible: true, action: 'fall', fallen: true }),
    Object.freeze({ id: 0, x: 100, y: 200, visible: false, action: 'idle' }),
  ]);
  const before = JSON.stringify({ formation, figures });
  assert.deepEqual(gettysburgInfantryStandardAnchor(formation, figures), { id: 2, x: 95, y: 200 });
  assert.deepEqual(gettysburgInfantryStandardAnchor(formation, [...figures].reverse()), { id: 2, x: 95, y: 200 });
  assert.deepEqual(gettysburgInfantryStandardAnchor(formation, figures, 9), { id: 9, x: 80, y: 200 });
  assert.deepEqual(gettysburgInfantryStandardAnchor(formation, figures, 1), { id: 2, x: 95, y: 200 });
  assert.deepEqual(gettysburgInfantryStandardAnchor(formation, figures, 0), { id: 2, x: 95, y: 200 });
  assert.deepEqual(gettysburgInfantryStandardAnchor(formation, figures.filter(figure => figure.id !== 2), 2), { id: 3, x: 105, y: 200 });
  assert.equal(gettysburgInfantryStandardAnchor(formation, figures.filter(figure => figure.id <= 1)), null);
  assert.equal(gettysburgInfantryStandardAnchor(formation, []), null);
  assert.equal(gettysburgInfantryStandardAnchor(formation, null), null);
  assert.equal(gettysburgInfantryStandardAnchor({}, figures), null);
  assert.equal(gettysburgInfantryStandardAnchor(formation, [{ id: 'bad', x: NaN, y: 200, visible: true }]), null);
  assert.equal(JSON.stringify({ formation, figures }), before);
});

function authoredAtlas(page) {
  const keys = gettysburgInfantryExpectedFrames(page);
  return {
    meta: { size: { w: 800, h: page === 'ready' ? 200 : 400 } },
    frames: Object.fromEntries(keys.map((key, index) => [key, {
      frame: { x: index % 8 * 100, y: Math.floor(index / 8) * 100, w: 100, h: 100 },
      pivot: { x: .5, y: .95 },
      bodyHeight: 90,
      sourceSize: { w: 100, h: 100 },
      rotated: false,
    }])),
  };
}

test('atlas geometry validation detects incomplete coverage and unsafe crops without mutation', () => {
  for (const page of ['ready', 'march']) {
    const atlas = authoredAtlas(page);
    const original = JSON.stringify(atlas);
    assert.deepEqual(validateGettysburgInfantryAtlas(atlas, page), []);
    assert.equal(JSON.stringify(atlas), original);
  }
  const atlas = authoredAtlas('march');
  const first = 'a-march-0-0';
  atlas.frames[first].frame.x = 780;
  atlas.frames[first].pivot.y = 1.1;
  atlas.frames[first].bodyHeight = 120;
  delete atlas.frames['b-march-7-1'];
  atlas.frames.unexpected = {};
  const errors = validateGettysburgInfantryAtlas(atlas, 'march');
  for (const fragment of ['exceeds atlas bounds', 'pivot', 'bodyHeight', 'Missing frame b-march-7-1', 'Unexpected frame']) {
    assert.ok(errors.some(error => error.includes(fragment)), fragment);
  }
  const reused = authoredAtlas('march');
  reused.frames['a-march-0-1'].frame = { ...reused.frames[first].frame };
  assert.ok(validateGettysburgInfantryAtlas(reused, 'march').some(error => error.includes('opposing contacts reuse')));
  assert.ok(validateGettysburgInfantryAtlas({}, 'ready').length >= 2);
  assert.deepEqual(validateGettysburgInfantryAtlas({}, 'bad'), ['Unknown Gettysburg infantry page']);
});

test('all four authored Gettysburg v2 atlases match their native PNG hash, dimensions and frame contract', () => {
  for (const asset of gettysburgInfantryFamilyAssets('gettysburg', optedIn.search)) {
    const jsonUrl = new URL(`../public/${asset.json}`, import.meta.url);
    const pngUrl = new URL(`../public/${asset.image}`, import.meta.url);
    const atlas = JSON.parse(readFileSync(jsonUrl, 'utf8'));
    const png = readFileSync(pngUrl);
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], asset.image);
    assert.equal(createHash('sha256').update(png).digest('hex'), atlas.meta.sha256, asset.image);
    assert.equal(png.readUInt32BE(16), atlas.meta.size.w, `${asset.image}: width`);
    assert.equal(png.readUInt32BE(20), atlas.meta.size.h, `${asset.image}: height`);
    assert.deepEqual(validateGettysburgInfantryAtlas(atlas, asset.page), [], asset.json);
  }
});
