import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createFieldViewCheckpoint, readFieldViewCheckpoint } from '../src/battle/fieldViewCheckpoint.js';
import { loadFieldSuspension } from '../src/game/fieldSuspendSave.js';
import { CAMPAIGN_STORAGE_KEY } from '../src/game/campaignStorage.js';
import { FIELD_CHECKPOINT_KEY } from '../src/game/fieldCheckpoint.js';
import { gettysburgV39MigrationLedger, validateGettysburgV39MigrationLedger } from './test-support/gettysburgV39Preservation.mjs';
import { viewHarness, attachCamera, baseCameraClass, dustFacts, stepScene, plain, sha } from './test-support/gettysburgV39Regression.mjs';

const root = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const query = '?artPass=gettysburg-v32&infantryScale=moderate&contactLayout=v33&standardContinuity=v34&animationContinuity=v35&dustContinuity=v36&rankReadability=v37&viewContinuity=v39';
const oldQuery = query.replace('&viewContinuity=v39', '');
const current = await viewHarness(root), before = await viewHarness(root, { before: true });
const camera = baseCameraClass(root);
const near = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-9, message + ': ' + a + ' / ' + b);
const center = c => ({ x: c.scrollX + c.width / 2, y: c.scrollY + c.height / 2 });
const make = (checkpoint = null, options = {}, width = 1194, height = 670, h = current) => {
  const scene = h.make(checkpoint, { query, ...options }); attachCamera(scene, camera.Camera, width, height); return scene;
};
const view = scene => scene.checkpoint().presentation.fieldView;
function frame(scene, zoom = 1.1, x = 1040, y = 620, mode = 'manual') {
  scene.cameraMode = mode;
  scene.cameras.main.setZoom(zoom); scene.updateCameraBounds(); scene.cameras.main.centerOn(x, y);
  return center(scene.cameras.main);
}
function assertFrame(scene, saved) {
  near(scene.cameras.main.zoom, saved.zoom, 'retained zoom');
  const actual = center(scene.cameras.main); near(actual.x, saved.center.x, 'retained X'); near(actual.y, saved.center.y, 'retained Y');
}

test('frozen v39 preservation binds current physical sources without refreshing older fixtures', () => {
  const ledger = gettysburgV39MigrationLedger(); assert.equal(validateGettysburgV39MigrationLedger(ledger), ledger);
  assert.equal(current.source, readFileSync(root + '/src/battle/CivilWarBattlefield.jsx', 'utf8'));
  assert.equal(before.source, readFileSync(root + '/scripts/test-support/gettysburg-v39-before/src/battle/CivilWarBattlefield.jsx', 'utf8'));
  assert.equal(camera.sha256, '3786cac23e0333d191f1009d5ca267d115e39b7ffa8d247e97bdcdd2b7ac8b83');
});

test('legacy, duplicate, encoded, wrong-version and wrong-battle views retain original checkpoints and raw rendering', () => {
  const disabled = [oldQuery, query.replace('v39', 'v38'), query.replace('v39', 'unknown'), query.replace('v39', 'V39'),
    query.replace('v39', ''), query.replace('v39', '%76%33%39'), query.replace('viewContinuity', 'view%43ontinuity'),
    query + '&viewContinuity=v39', query + '&viewContinuity=off', query + '&artPass=gettysburg-v32',
    query.replace('gettysburg-v32', 'gettysburg-v31'), query.replace('gettysburg-v32', '%67ettysburg-v32'), query + '&unrelated=%31'];
  for (const search of disabled) {
    const a = make(null, { query: search }), b = make(null, { query: search }, 1194, 670, before);
    assert.equal(a.viewContinuityEnabled, false, search); frame(a); frame(b);
    stepScene(a, 50, 4); stepScene(b, 50, 4);
    assert.deepEqual(dustFacts(current, a), dustFacts(before, b), search + ': untouched render facts');
    assert.deepEqual(plain(a.checkpoint()), plain(b.checkpoint()), search + ': original checkpoint');
    assert.equal(view(a), undefined);
  }
  for (const scenarioId of ['first_manassas', 'shiloh', 'third_winchester']) {
    const a = make(null, { scenarioId }), b = make(null, { scenarioId }, 1194, 670, before);
    assert.equal(a.viewContinuityEnabled, false); assert.deepEqual(plain(a.checkpoint()), plain(b.checkpoint()));
  }
});

test('canonical view selector preserves all existing independent art and continuity gates', () => {
  for (let mask = 0; mask < 32; mask++) {
    const names = ['contactLayout=v33', 'standardContinuity=v34', 'animationContinuity=v35', 'dustContinuity=v36', 'rankReadability=v37'];
    const search = '?artPass=gettysburg-v32&infantryScale=moderate&viewContinuity=v39' + names.flatMap((s, i) => mask & (1 << i) ? ['&' + s] : []).join('');
    const a = make(null, { query: search }), b = make(null, { query: search.replace('&viewContinuity=v39', '') });
    assert.equal(a.viewContinuityEnabled, true);
    for (const key of ['contactLayoutEnabled', 'standardContinuityEnabled', 'animationContinuityEnabled', 'dustContinuityEnabled', 'rankReadabilityEnabled', 'infantryPresentationScale']) assert.equal(a[key], b[key], key);
    stepScene(a, 50, 2); stepScene(b, 50, 2);
    assert.deepEqual(dustFacts(current, a), dustFacts(current, b));
    const checkpoint = plain(a.checkpoint()); delete checkpoint.presentation.fieldView;
    assert.deepEqual(checkpoint, plain(b.checkpoint()), 'only optional framing metadata added');
  }
  assert.equal(make(null, { query: '?viewContinuity=v39&artPass=gettysburg-v32' }).viewContinuityEnabled, true);
});

test('manual zoom and pan survive cold Resume and immediate re-save before first draw', () => {
  const warm = make(); stepScene(warm, 50, 6); frame(warm);
  const checkpoint = plain(warm.checkpoint()), cold = make(checkpoint);
  assert.equal(cold.restoreFieldView(), true); assertFrame(cold, checkpoint.presentation.fieldView);
  assert.equal(cold.cameraMode, 'free'); assert.equal(cold.speed, 0);
  const beforeDraw = plain(cold.checkpoint()); assert.deepEqual(beforeDraw, checkpoint, 'canonical pre-draw re-save');
  const coldAgain = make(beforeDraw); assert.equal(coldAgain.restoreFieldView(), true); assertFrame(coldAgain, checkpoint.presentation.fieldView);
  warm.update(0, 0); cold.update(0, 0); coldAgain.update(0, 0);
  assert.deepEqual(dustFacts(current, cold), dustFacts(current, warm));
  assert.deepEqual(dustFacts(current, coldAgain), dustFacts(current, cold));
});

test('capture uses current scroll even when camera midpoint is stale after a pan', () => {
  const scene = make(); frame(scene); const c = scene.cameras.main;
  const stale = { ...c.midPoint }; c.setScroll(c.scrollX - 37, c.scrollY - 19);
  const captured = view(scene), actual = center(c);
  near(captured.center.x, actual.x, 'new pan X'); near(captured.center.y, actual.y, 'new pan Y');
  assert.notEqual(captured.center.x, stale.x); assert.notEqual(captured.center.y, stale.y);
  const cold = make(plain(scene.checkpoint())); assert.equal(cold.restoreFieldView(), true); assertFrame(cold, captured);
});

test('focus on a non-default formation restores its framing without changing selection or tracking the default on resize', () => {
  const warm = make(), target = warm.engine.snapshot().formations.find(f => f.side === 'confederate' && f.type === 'infantry' && f.id !== warm.selectedId);
  assert.ok(target); warm.setSelected(target.id); warm.focusSelected(); const saved = plain(warm.checkpoint());
  const cold = make(saved), defaultSelection = cold.selectedId; assert.notEqual(defaultSelection, target.id);
  const combat = plain(cold.engine.checkpoint()); assert.equal(cold.restoreFieldView(), true); assertFrame(cold, saved.presentation.fieldView);
  assert.equal(cold.selectedId, defaultSelection); assert.equal(cold.cameraMode, 'free');
  assert.deepEqual(plain(cold.engine.checkpoint()), combat);
  const oldCenter = center(cold.cameras.main);
  cold.scale = { width: 1100, height: 640 }; cold.cameras.main.setSize(1100, 640); cold.resizeCamera();
  const actual = center(cold.cameras.main); near(actual.x, oldCenter.x, 'resize retains independent X'); near(actual.y, oldCenter.y, 'resize retains independent Y');
  assert.equal(cold.selectedId, defaultSelection); assert.deepEqual(plain(cold.engine.checkpoint()), combat);
});

for (const [width, height] of [[390, 520], [1366, 430], [2300, 1600]]) test(`cold restore is bounded for ${width}x${height}`, () => {
  const warm = make(); frame(warm, 1.65, 1560, 790); const saved = plain(warm.checkpoint());
  const cold = make(saved, {}, width, height); assert.equal(cold.restoreFieldView(), true);
  const c = cold.cameras.main, minimum = Math.min(width / cold.world.width, height / cold.world.height);
  assert.ok(c.zoom >= minimum && c.zoom <= Math.max(1.7, minimum));
  assert.equal(c.scrollX, c.clampX(c.scrollX)); assert.equal(c.scrollY, c.clampY(c.scrollY));
  const resaved = view(cold); assert.ok(resaved); assert.equal(resaved.mode, 'free');
  const second = make(plain(cold.checkpoint()), {}, width, height); assert.equal(second.restoreFieldView(), true); assertFrame(second, resaved);
});

test('overview intent refits a changed viewport instead of restoring a stale desktop zoom', () => {
  const warm = make(), saved = plain(warm.checkpoint()); assert.equal(saved.presentation.fieldView.mode, 'overview');
  const cold = make(saved, {}, 390, 520); assert.equal(cold.restoreFieldView(), true);
  near(cold.cameras.main.zoom, 390 / cold.world.width, 'phone overview');
  assert.deepEqual(center(cold.cameras.main), { x: cold.world.width / 2, y: cold.world.height / 2 });
  assert.equal(cold.cameraMode, 'overview');
});

for (const [width, height, interimWidth, interimHeight] of [[1194, 704, 1194, 818], [390, 308, 390, 462], [1194, 704, 2300, 1600]]) test(`restored free view survives automatic ${width}x${height} to ${interimWidth}x${interimHeight} layout roundtrip`, () => {
  const warm = make(null, {}, width, height); frame(warm, 1.1, 1000, 850);
  const checkpoint = plain(warm.checkpoint()), cold = make(checkpoint, {}, width, height);
  assert.equal(cold.restoreFieldView(), true); const combat = plain(cold.engine.checkpoint());
  cold.scale = { width: interimWidth, height: interimHeight }; cold.cameras.main.setSize(interimWidth, interimHeight); cold.resizeCamera();
  const c = cold.cameras.main, temporary = view(cold);
  assert.equal(c.scrollX, c.clampX(c.scrollX)); assert.equal(c.scrollY, c.clampY(c.scrollY));
  near(temporary.zoom, c.zoom, 'checkpoint records current bounded zoom');
  assert.deepEqual(temporary.center, center(c), 'checkpoint records current bounded center');
  assert.deepEqual(cold.restoredFreeView, { zoom: checkpoint.presentation.fieldView.zoom, center: checkpoint.presentation.fieldView.center }, 'validated original intent remains independent of temporary clamp');
  cold.scale = { width, height }; c.setSize(width, height); cold.resizeCamera();
  assertFrame(cold, checkpoint.presentation.fieldView);
  assert.deepEqual(plain(cold.checkpoint()), checkpoint, 'same-size return restores complete canonical checkpoint');
  assert.deepEqual(plain(cold.engine.checkpoint()), combat); assert.equal(cold.cameraMode, 'free');
});

test('cold Resume initially on a larger screen retains the original zoom intent on returning to the saved size', () => {
  const warm = make(null, {}, 1194, 704); frame(warm, 1.1, 1000, 850); const checkpoint = plain(warm.checkpoint());
  const cold = make(checkpoint, {}, 2300, 1600); assert.equal(cold.restoreFieldView(), true);
  const actual = view(cold); near(actual.zoom, 2300 / cold.world.width, 'initial viewport minimum applied');
  near(cold.restoredFreeView.zoom, 1.1, 'validated original zoom remains the target');
  assert.deepEqual(actual.center, center(cold.cameras.main));
  cold.scale = { width: 1194, height: 704 }; cold.cameras.main.setSize(1194, 704); cold.resizeCamera();
  assertFrame(cold, checkpoint.presentation.fieldView); assert.deepEqual(plain(cold.checkpoint()), checkpoint);
  assert.deepEqual(plain(cold.engine.checkpoint()), plain(warm.engine.checkpoint()));
});

test('explicit player zoom and pan leave restored free intent and do not snap back on resize', () => {
  const warm = make(); frame(warm, 1.1, 1000, 850); const checkpoint = plain(warm.checkpoint()), cold = make(checkpoint);
  assert.equal(cold.restoreFieldView(), true); cold.changeZoom(.15);
  assert.equal(cold.cameraMode, 'manual'); near(cold.cameras.main.zoom, 1.25, 'player zoom used');
  cold.activePointers = new Set(); // Scene.create normally initializes pointer tracking.
  const pointer = { id: 1, x: 350, y: 240, isDown: true, positionToCamera: () => center(cold.cameras.main) };
  cold.beginFieldGesture(pointer, []); cold.moveFieldGesture({ ...pointer, x: 370, y: 260 }); cold.endFieldGesture({ ...pointer, x: 370, y: 260 });
  assert.equal(cold.cameraMode, 'manual'); const requested = center(cold.cameras.main);
  // BaseCamera has no render loop; set the midpoint that its rendered Camera supplies.
  cold.cameras.main.midPoint.set(requested.x, requested.y);
  cold.scale = { width: 1150, height: 650 }; cold.cameras.main.setSize(1150, 650); cold.resizeCamera();
  near(cold.cameras.main.zoom, 1.25, 'explicit zoom retained');
  assert.deepEqual(center(cold.cameras.main), requested, 'explicit pan retained rather than restored intent');
  assert.notDeepEqual(requested, checkpoint.presentation.fieldView.center);
});

test('missing, malformed, mismatched-time/world/scenario view data falls back without mutating combat or camera', () => {
  const warm = make(); frame(warm); const checkpoint = plain(warm.checkpoint());
  const invalid = [undefined, null, {}, { ...checkpoint.presentation.fieldView, version: 2 },
    { ...checkpoint.presentation.fieldView, time: 100 }, { ...checkpoint.presentation.fieldView, scenarioId: 'shiloh' },
    { ...checkpoint.presentation.fieldView, continuityId: 'other' }, { ...checkpoint.presentation.fieldView, world: { width: 1, height: 1 } },
    { ...checkpoint.presentation.fieldView, zoom: 0 }, { ...checkpoint.presentation.fieldView, zoom: NaN },
    { ...checkpoint.presentation.fieldView, zoom: 100 }, { ...checkpoint.presentation.fieldView, mode: 'focus' },
    { ...checkpoint.presentation.fieldView, center: { x: -1, y: 20 } }, { ...checkpoint.presentation.fieldView, extra: true }];
  for (const fieldView of invalid) {
    const saved = plain(checkpoint); saved.presentation.fieldView = fieldView;
    const cold = make(saved), combat = plain(cold.engine.checkpoint()), before = [cold.cameras.main.zoom, center(cold.cameras.main)];
    assert.equal(cold.restoreFieldView(), false); assert.deepEqual([cold.cameras.main.zoom, center(cold.cameras.main)], before);
    assert.deepEqual(plain(cold.engine.checkpoint()), combat);
  }
});

test('optional saved-view readers reject accessors without executing them', () => {
  const scene = make(), p = plain(scene.checkpoint()).presentation; let calls = 0;
  for (const key of ['version', 'time', 'fieldView']) {
    const object = { ...p }; Object.defineProperty(object, key, { enumerable: true, get() { calls++; throw Error('getter'); } });
    assert.equal(readFieldViewCheckpoint(object, scene.world, 'gettysburg', scene.engine.time, scene.scale), null);
  }
  for (const [target, key] of [['fieldView', 'zoom'], ['world', 'width'], ['center', 'x']]) {
    const object = plain(p), nested = target === 'fieldView' ? object.fieldView : object.fieldView[target];
    Object.defineProperty(nested, key, { enumerable: true, get() { calls++; throw Error('getter'); } });
    assert.equal(readFieldViewCheckpoint(object, scene.world, 'gettysburg', scene.engine.time, scene.scale), null);
  }
  assert.equal(calls, 0);
});

test('invalid or not-yet-created cameras produce no optional view metadata', () => {
  const scene = make(), c = scene.cameras.main;
  for (const bad of [null, {}, { ...c, zoom: NaN }, { ...c, width: 0 }, { ...c, scrollX: Infinity }]) assert.equal(createFieldViewCheckpoint(bad, 'free', scene.world, 'gettysburg', 0), null);
  const fresh = current.make(null, { query }); assert.equal(fresh.checkpoint().presentation.fieldView, undefined);
});

test('a pan beyond the map captures the actual bounded next-frame center without mutating the camera', () => {
  const scene = make(); frame(scene, 1.7); const c = scene.cameras.main;
  c.setScroll(5000, -5000); const raw = [c.scrollX, c.scrollY], captured = view(scene);
  assert.ok(captured); near(captured.center.x, c.clampX(c.scrollX) + c.width / 2, 'bounded X');
  near(captured.center.y, c.clampY(c.scrollY) + c.height / 2, 'bounded Y'); assert.deepEqual([c.scrollX, c.scrollY], raw);
  const cold = make(plain(scene.checkpoint())); assert.equal(cold.restoreFieldView(), true); assertFrame(cold, captured);
});

for (const reducedMotion of [false, true]) test(`owned field46 native bodies, falls and saved shots survive framing restore with reduced motion ${reducedMotion}`, () => {
  const bytes = readFileSync(root + '/scripts/fixtures/gettysburg-v36-owned-save.json'), fixture = JSON.parse(bytes);
  const values = new Map([CAMPAIGN_STORAGE_KEY, FIELD_CHECKPOINT_KEY].map(key => [key, fixture.values[key]]));
  const loaded = loadFieldSuspension({ getItem: key => values.get(key) ?? null }); assert.equal(loaded.error, null); assert.ok(loaded.pending);
  const input = loaded.pending;
  const scene = make(plain(input.checkpoint), { reducedMotion, campaign: input.resumeState, scenarioId: input.battle.id, choiceId: input.choiceId });
  scene.update(0, 0); assert.equal(scene.engine.time, 46.74999999999948); frame(scene);
  const parsed = plain(scene.checkpoint()); assert.ok(parsed.presentation.shots); assert.ok(parsed.presentation.contactLayout);
  const checkpoint = plain(scene.checkpoint()), cold = make(checkpoint, { reducedMotion, campaign: input.resumeState, scenarioId: input.battle.id, choiceId: input.choiceId }); assert.equal(cold.restoreFieldView(), true);
  scene.update(0, 0); cold.update(0, 0);
  assert.deepEqual(dustFacts(current, cold), dustFacts(current, scene)); assertFrame(cold, checkpoint.presentation.fieldView);
  assert.equal(sha(JSON.stringify(plain(cold.engine.checkpoint()))), sha(JSON.stringify(plain(scene.engine.checkpoint()))));
  assert.equal(sha(readFileSync(root + '/scripts/fixtures/gettysburg-v36-owned-save.json')), sha(bytes));
});
