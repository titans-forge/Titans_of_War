import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { loadFieldSuspension } from '../src/game/fieldSuspendSave.js';
import { loadFieldCheckpoint, FIELD_CHECKPOINT_KEY } from '../src/game/fieldCheckpoint.js';
import { CAMPAIGN_STORAGE_KEY } from '../src/game/campaignStorage.js';
import { dustHarness, dustQuery, dustFacts, assertNonDustEqual, stepScene, snapshotFormation, plain, sha } from './test-support/gettysburgV36Regression.mjs';

const root = new URL('../', import.meta.url).pathname.replace(/\/$/, '');
const capturePath = root + '/scripts/fixtures/gettysburg-v36-owned-save.json';
const capturedBytes = readFileSync(capturePath), captured = JSON.parse(capturedBytes);
assert.equal(sha(capturedBytes), 'c70c58c96ca47705742dfd19fc88436e6d56613113fe70189e5501736ef6b300');
assert.equal(captured.schema, 'gettysburg-v36-owned-input-v1');
assert.deepEqual(Object.keys(captured.values).sort(), [CAMPAIGN_STORAGE_KEY, FIELD_CHECKPOINT_KEY].sort());
assert.equal(sha(captured.values[FIELD_CHECKPOINT_KEY]), '6877a1739bc7b4c44b184d77019a9325e9135d223fc9335db471c24081d2b94d');
assert.equal(sha(captured.values[CAMPAIGN_STORAGE_KEY]), '078e7778c124c95f773f134720bb20214dc828633e059635884ac0e2f2421057');
assert.equal(Buffer.byteLength(captured.values[FIELD_CHECKPOINT_KEY]), 124611);
assert.equal(Buffer.byteLength(captured.values[CAMPAIGN_STORAGE_KEY]), 5694);
const storage = { getItem: key => captured.values[key] ?? null }, loaded = loadFieldSuspension(storage), field = loadFieldCheckpoint(storage);
assert.equal(loaded.error, null); assert.equal(field.error, null); assert.equal(loaded.protectedCampaign, false); assert.ok(loaded.pending);
const context = loaded.pending, original = plain(context.checkpoint);
const ownedOptions = { campaign: context.resumeState, scenarioId: context.battle.id, choiceId: context.choiceId };
const current = await dustHarness(root), before = await dustHarness(root, { before: true });
const options = { reducedMotion: false, resolving: false }, id = 'hancock-reserve';
const owned = (harness = current, query = dustQuery({ contact: true }), checkpoint = original, extra = {}) => harness.make(plain(checkpoint), { ...ownedOptions, query, ...extra });
const draw = (harness, scene) => { scene.update(0, 0); return dustFacts(harness, scene); };
const seeded = (harness = current, query = dustQuery({ contact: true })) => {
  const scene = owned(harness, query); draw(harness, scene); stepScene(scene, 50, 24); return scene;
};
const dustRecord = (presentation, formationId = id) => presentation.travelDust.formations.find(record => record.id === formationId);
const acceptedVisual = (presentation, formation, capacity = 32, time = presentation.time) =>
  current.modules.restoreFormationVisualFromCheckpoint(formation, capacity, time, presentation);
function directRestore(presentation, { formation = snapshotFormation(seeded()), visual, time = presentation.time, motion = options } = {}) {
  return current.modules.restoreGettysburgDustCheckpoint(presentation, formation, visual ?? acceptedVisual(presentation, formation), time, motion);
}

test('immutable portable final field46 input binds exact primitives and actual current Scene imports', () => {
  assert.equal(original.state.time, 46.74999999999948);
  assert.equal(original.presentation.time, original.state.time);
  assert.equal(Object.hasOwn(original.presentation, 'travelDust'), false, 'legacy v35 input has no v36 cosmetic sidecar');
  assert.equal(current.source, readFileSync(root + '/src/battle/CivilWarBattlefield.jsx', 'utf8'));
  assert.equal(sha(before.source), '84ba901a36fc892ff09d26fc09aa0a767f67ea61a21f0eeaa016f6a42cf7b516');
  assert.equal(sha(readFileSync(capturePath)), sha(capturedBytes));
});

test('authentic v35 Scene reproduces actual owned-save warm dust versus empty cold; disabled v36 is exact', () => {
  const query = dustQuery({ dust: false, contact: true }), old = seeded(before, query), next = seeded(current, query);
  assert.deepEqual(dustFacts(current, next), dustFacts(before, old));
  const oldSaved = plain(old.checkpoint()), nextSaved = plain(next.checkpoint());
  assert.deepEqual(nextSaved, oldSaved); assert.equal(Object.hasOwn(nextSaved.presentation, 'travelDust'), false);
  const warm = dustFacts(current, next), cold = draw(current, owned(current, query, nextSaved));
  assert.equal(warm.graphics.dust.length, 24); assert.equal(cold.graphics.dust.length, 0);
  assertNonDustEqual(warm, cold);
  assert.ok(warm.cloth.every(flag => Number.isInteger(flag.periodFrame) && flag.frame === flag.periodFrame), 'production cloth updater executes');
});

test('enabled current Scene preserves actual dust, native frames, feet, slots, standards, shots and combat across independent gates', () => {
  for (const contact of [false, true]) for (const standard of [false, true]) for (const animation of [false, true]) {
    const query = dustQuery({ contact, standard, animation }), scene = seeded(current, query), warm = dustFacts(current, scene);
    const authenticWarm = seeded(before, query); assert.deepEqual(warm, dustFacts(before, authenticWarm), 'v36 preserves authentic warm native/carrier/flag/dust facts');
    assert.equal(scene.dustContinuityEnabled, true); assert.equal(scene.contactLayoutEnabled, contact);
    assert.equal(scene.standardContinuityEnabled, standard); assert.equal(scene.animationContinuityEnabled, animation);
    assert.equal(warm.graphics.dust.length, 24);
    const saved = plain(scene.checkpoint()); assert.equal(saved.presentation.travelDust.formations.length, 10);
    assert.ok(dustRecord(saved.presentation).dust.puffs.length > 0);
    const cold = owned(current, query, saved), view = cold.views.get(id);
    assert.equal(view.visual.restoreFrame, true, 'actual base parser accepts current raw visual');
    assert.deepEqual(view.dust, scene.views.get(id).dust); assert.notEqual(view.dust, scene.views.get(id).dust);
    assert.notEqual(view.dust.puffs, scene.views.get(id).dust.puffs);
    const restored = draw(current, cold), authenticCold = draw(before, owned(before, query, saved));
    assertNonDustEqual(restored, authenticCold, 'independent disabled gates retain authentic prior cold behavior');
    assert.deepEqual(restored.graphics.dust, warm.graphics.dust, 'actual dust draws remain equal through every independent gate combination');
    if (standard) assert.deepEqual(restored, warm, `exact first render contact=${contact} standard=${standard} animation=${animation}`);
    assert.equal(Object.hasOwn(saved, 'travelDust'), false, 'renderer metadata stays under optional presentation');
  }
});

test('pre-draw repeated saves, idle, zoom, re-save and second cold reload retain the actual rendered trail', () => {
  for (const contact of [false, true]) {
    const query = dustQuery({ contact }), scene = seeded(current, query), expected = dustFacts(current, scene), saved = plain(scene.checkpoint());
    for (const count of [1, 3, 7]) {
      const cold = owned(current, query, saved), initialDust = plain(cold.views.get(id).dust);
      for (let save = 0; save < count; save++) {
        assert.deepEqual(plain(cold.checkpoint()), saved, 'non-drawing re-save retains all exact checkpoint primitives');
        assert.deepEqual(plain(cold.views.get(id).dust), initialDust, 'Save never emits particles or advances dust clock');
      }
      assert.deepEqual(draw(current, cold), expected);
      cold.update(0, 0); assert.deepEqual(dustFacts(current, cold), expected, 'cached idle');
      cold.cameras.main.zoom += .01; cold.update(0, 0); assert.deepEqual(dustFacts(current, cold), expected, 'zoom forces exact paused drawing');
      const resaved = plain(cold.checkpoint()); assert.deepEqual(resaved, saved);
      assert.deepEqual(draw(current, owned(current, query, resaved)), expected, 'second cold reload');
    }
  }
});

test('restored emission cadence and 1.25-second expiry remain equal through actual further Scene combat', () => {
  const query = dustQuery({ contact: true }), warm = seeded(current, query), saved = plain(warm.checkpoint()), cold = owned(current, query, saved);
  draw(current, cold); const priorSeeds = new Set(warm.views.get(id).dust.puffs.map(puff => puff.seed));
  for (let tick = 0; tick < 32; tick++) {
    stepScene(warm, 50); stepScene(cold, 50);
    assert.deepEqual(dustFacts(current, cold), dustFacts(current, warm), `continued combat tick ${tick}`);
    const trail = warm.views.get(id).dust;
    assert.ok(trail.puffs.length <= 12);
    assert.ok(trail.puffs.every(puff => trail.time - puff.time < 1.25));
    assert.ok(trail.puffs.every((puff, index) => index === 0 || puff.seed === trail.puffs[index - 1].seed + 1));
  }
  assert.ok(warm.views.get(id).dust.puffs.length > 0, 'the actual moving reserve emits new particles');
  assert.ok(warm.views.get(id).dust.puffs.every(puff => !priorSeeds.has(puff.seed)), 'original puffs expire rather than being duplicated or kept alive');
  const state = structuredClone(cold.views.get(id).dust), time = state.time;
  assert.deepEqual(current.modules.updateTravelDust(state, { x: state.x, y: state.y, time: time + 1.25, moving: false }), [], 'unchanged updater expires the final trail at its actual duration');
});

test('Save after an engine step but before the next draw preserves a legitimate earlier dust timestamp', () => {
  const query = dustQuery({ contact: true }), warm = seeded(current, query), oldDust = plain(warm.views.get(id).dust);
  // Controlled actual-engine ordering witness; it does not claim public timing.
  warm.engine.tick(.05);
  const saved = plain(warm.checkpoint()), savedDust = dustRecord(saved.presentation).dust;
  assert.equal(savedDust.time, oldDust.time); assert.ok(savedDust.time < saved.presentation.time);
  assert.deepEqual(plain(warm.views.get(id).dust), oldDust, 'checkpoint sampling remains non-drawing');
  const cold = owned(current, query, saved);
  warm.emitSnapshot(); warm.setSpeed(1); cold.setSpeed(1);
  assert.deepEqual(draw(current, cold), draw(current, warm), 'both draw the next actual sample from the same retained dust clock');
  warm.setSpeed(0); cold.setSpeed(0);
});

test('actual hold, face and reform commands preserve prior native/combat behavior while retaining the unrelated moving reserve trail', () => {
  const query = dustQuery({ contact: true });
  for (const [name, command] of [['hold', scene => scene.issueOrder('hold')],
    ['face', scene => scene.faceDirection(Math.PI / 2)], ['reform', scene => scene.setFormation('column')]]) {
    const scene = seeded(current, query), authentic = seeded(before, query);
    command(scene); command(authentic); scene.update(0, 0); authentic.update(0, 0);
    assert.deepEqual(dustFacts(current, scene), dustFacts(before, authentic), name + ' unchanged command result');
    const saved = plain(scene.checkpoint()), legacy = plain(saved); delete legacy.presentation.travelDust;
    assert.deepEqual(legacy, plain(authentic.checkpoint()), name + ' changes only optional dust checkpoint state');
    const restored = draw(current, owned(current, query, saved)), oldCold = draw(before, owned(before, query, legacy));
    assertNonDustEqual(restored, oldCold, name + ' native cold command result');
    assert.deepEqual(restored.graphics.dust, dustFacts(current, scene).graphics.dust, name + ' retained reserve trail');
  }
});

test('canonical v36 selector rejects absent, wrong, duplicate and encoded queries and other scenarios', () => {
  const good = dustQuery({ contact: true });
  const disabled = [dustQuery({ dust: false, contact: true }), good.replace('dustContinuity=v36', 'dustContinuity=v35'),
    good + '&dustContinuity=v36', good + '&dustContinuity=off', good.replace('dustContinuity=v36', 'dustContinuity=%76%33%36'),
    good.replace('dustContinuity=v36', 'dust%43ontinuity=v36'), good.replace('dustContinuity=v36', 'dustContinuity=V36'),
    good.replace('dustContinuity=v36', 'dustContinuity=v360'), good.replace('artPass=gettysburg-v32', 'artPass=gettysburg-v31'),
    good + '&artPass=gettysburg-v32', good + '&unrelated=%31'];
  for (const query of disabled) {
    const scene = owned(current, query), old = owned(before, query);
    assert.equal(Boolean(scene.dustContinuityEnabled), false, query);
    assert.deepEqual(draw(current, scene), draw(before, old), query + ' retains authentic disabled renderer');
    assert.deepEqual(plain(scene.checkpoint()), plain(old.checkpoint()), query + ' retains authentic disabled checkpoint');
  }
  const other = current.make(null, { query: good, scenarioId: 'first_manassas', all: false });
  assert.equal(other.dustContinuityEnabled, false);
  const minimal = owned(current, '?dustContinuity=v36&artPass=gettysburg-v32'); assert.equal(minimal.dustContinuityEnabled, true);
  const independent = owned(current, good + '&standardContinuity=v34'); assert.equal(independent.dustContinuityEnabled, true); assert.equal(independent.standardContinuityEnabled, false);
});

test('legacy or absent dust keeps accepted raw/native/combat restoration without inventing a trail', () => {
  const scene = seeded(), saved = plain(scene.checkpoint()), reference = plain(saved); delete reference.presentation.travelDust;
  for (const value of [undefined, null, { version: 99 }]) {
    const damaged = plain(saved); if (value === undefined) delete damaged.presentation.travelDust; else damaged.presentation.travelDust = value;
    const next = owned(current, dustQuery({ contact: true }), damaged), fallback = owned(current, dustQuery({ contact: true }), reference);
    assert.ok([...next.views.values()].every(view => Object.keys(view.dust).length === 0));
    assert.deepEqual(draw(current, next), draw(current, fallback)); assert.equal(next.engine.time, saved.presentation.time);
  }
});

test('malformed, stale, mismatched and oversized optional metadata rejects dust without invalidating combat or base records', () => {
  const scene = seeded(), saved = plain(scene.checkpoint()), formation = snapshotFormation(scene);
  const cases = [
    ['version', p => { p.travelDust.version = 99; }], ['continuity', p => { p.travelDust.continuityId = 'wrong'; }],
    ['time', p => { p.travelDust.time += .01; }], ['unknown root key', p => { p.travelDust.extra = true; }],
    ['duplicate formation', p => { p.travelDust.formations[1] = plain(p.travelDust.formations[0]); }],
    ['missing formation', p => { p.travelDust.formations.pop(); }],
    ['too many formations', p => { p.travelDust.formations = Array.from({ length: 33 }, () => plain(p.travelDust.formations[0])); }],
    ['capacity', p => { dustRecord(p).capacity = 31; }], ['formation', p => { dustRecord(p).formation.x += 1; }],
    ['siege-site type', p => { dustRecord(p).formation.type = 'siegeSite'; }],
    ['unknown state key', p => { dustRecord(p).dust.extra = true; }], ['nonfinite coordinate', p => { dustRecord(p).dust.x = Infinity; }],
    ['future state', p => { dustRecord(p).dust.time = p.time + .01; }], ['stale state', p => { dustRecord(p).dust.time = p.time - 1.26; }],
    ['future emission', p => { dustRecord(p).dust.emittedAt = p.time + .01; }], ['timer pair', p => { dustRecord(p).dust.serial = null; }],
    ['too many puffs', p => { dustRecord(p).dust.puffs = Array.from({ length: 13 }, () => plain(dustRecord(p).dust.puffs[0])); }],
    ['negative puff time', p => { dustRecord(p).dust.puffs[0].time = -1; }],
    ['future puff', p => { dustRecord(p).dust.puffs[0].time = p.time + 1; }],
    ['expired puff', p => { dustRecord(p).dust.puffs[0].time = dustRecord(p).dust.time - 1.25; }],
    ['duplicate seed', p => { dustRecord(p).dust.puffs[1].seed = dustRecord(p).dust.puffs[0].seed; }],
    ['duplicate time', p => { dustRecord(p).dust.puffs[1].time = dustRecord(p).dust.puffs[0].time; }],
    ['last emission mismatch', p => { dustRecord(p).dust.emittedAt -= .01; }],
    ['unknown puff key', p => { dustRecord(p).dust.puffs[0].radius = 1; }],
    ['sparse puffs', p => { delete dustRecord(p).dust.puffs[0]; }],
    ['extra array key', p => { dustRecord(p).dust.puffs.extra = true; }],
  ];
  for (const [name, mutate] of cases) {
    const presentation = plain(saved.presentation); mutate(presentation);
    const visual = acceptedVisual(presentation, formation); assert.equal(visual.restoreFrame, true, name + ' base still accepted');
    assert.equal(directRestore(presentation, { formation, visual }), null, name);
    const checkpoint = { ...plain(saved), presentation };
    assert.deepEqual(plain(owned(current, dustQuery({ contact: true }), checkpoint).engine.checkpoint()), plain(scene.engine.checkpoint()), name + ' combat remains valid');
  }
});

test('optional metadata and option accessors are rejected without executing getters', () => {
  const scene = seeded(), saved = plain(scene.checkpoint()), formation = snapshotFormation(scene); let calls = 0;
  const getter = () => { calls++; throw new Error('getter must not execute'); };
  const cases = [p => Object.defineProperty(p, 'travelDust', { enumerable: true, get: getter }),
    p => Object.defineProperty(p.travelDust, 'time', { enumerable: true, get: getter }),
    p => Object.defineProperty(dustRecord(p), 'dust', { enumerable: true, get: getter }),
    p => Object.defineProperty(dustRecord(p).dust, 'x', { enumerable: true, get: getter }),
    p => Object.defineProperty(dustRecord(p).dust.puffs, '0', { enumerable: true, get: getter })];
  for (const mutate of cases) { const p = plain(saved.presentation); mutate(p); assert.equal(directRestore(p, { formation }), null); }
  const motion = { resolving: false }; Object.defineProperty(motion, 'reducedMotion', { enumerable: true, get: getter });
  assert.equal(directRestore(saved.presentation, { formation, motion }), null);
  assert.equal(calls, 0);
});

test('actual base acceptance, compatible capacity/time and matching motion options are mandatory', () => {
  const scene = seeded(), p = plain(scene.checkpoint().presentation), formation = snapshotFormation(scene), originalVisual = acceptedVisual(p, formation);
  assert.ok(directRestore(p, { formation, visual: originalVisual }));
  for (const mutate of [v => { delete v.restoreFrame; }, v => { v.capacity = 31; }, v => { v.time -= .01; },
    v => { v.x += 1; }, v => { v.mode = 'column'; }, v => { v.lastMotion.reducedMotion = true; }, v => { v.lastMotion.resolving = true; }]) {
    const visual = structuredClone(originalVisual); mutate(visual); assert.equal(directRestore(p, { formation, visual }), null);
  }
  for (const motion of [{ reducedMotion: true, resolving: false }, { reducedMotion: false, resolving: true },
    { reducedMotion: false, resolving: false, extra: true }, { reducedMotion: 0, resolving: false }]) assert.equal(directRestore(p, { formation, motion }), null);
  for (const mutate of [p => { p.version = 99; }, p => { p.time += .01; }, p => { p.formations.find(r => r.id === id).state.figures[0].stepDistance = -1; }]) {
    const damaged = plain(p); mutate(damaged); const visual = acceptedVisual(damaged, formation, 32, p.time);
    assert.notEqual(visual.restoreFrame, true); assert.equal(directRestore(damaged, { formation, visual, time: p.time }), null);
  }
});

test('capture never mutates trails; damaged view state becomes null dust and cannot leak display objects', () => {
  const scene = seeded(), beforeState = structuredClone(scene.views.get(id).dust), p = plain(scene.checkpoint().presentation);
  assert.deepEqual(scene.views.get(id).dust, beforeState);
  const snapshot = scene.engine.snapshot({ presentation: true }), view = scene.views.get(id), pristine = view.dust;
  for (const damaged of [{ ...pristine, sprite: view.soldiers[0].sprite }, { ...pristine, time: p.time + 1 }, { ...pristine, serial: -1 }]) {
    view.dust = damaged;
    const result = current.modules.createGettysburgDustCheckpoint(p, snapshot.formations, scene.views, p.time, options);
    assert.ok(result); assert.equal(result.formations.find(record => record.id === id).dust, null);
  }
  let reads = 0; const damaged = { ...pristine }; Object.defineProperty(damaged, 'puffs', { enumerable: true, get() { reads++; throw new Error('no getter'); } });
  view.dust = damaged;
  assert.equal(current.modules.createGettysburgDustCheckpoint(p, snapshot.formations, scene.views, p.time, options).formations.find(record => record.id === id).dust, null);
  assert.equal(reads, 0); view.dust = pristine;
  assert.deepEqual(scene.views.get(id).dust, beforeState);
});

test('null timers reconstruct as absent properties and empty live trails stay bounded primitive data', () => {
  const scene = seeded(), p = plain(scene.checkpoint().presentation), formation = snapshotFormation(scene, 'pickett-division');
  const record = dustRecord(p, formation.id); assert.equal(record.dust.emittedAt, null); assert.equal(record.dust.serial, null); assert.deepEqual(record.dust.puffs, []);
  const restored = directRestore(p, { formation, visual: acceptedVisual(p, formation) }); assert.ok(restored);
  assert.equal(Object.hasOwn(restored, 'emittedAt'), false); assert.equal(Object.hasOwn(restored, 'serial'), false);
  assert.deepEqual(Object.keys(record.dust).sort(), ['x', 'y', 'time', 'emittedAt', 'serial', 'puffs'].sort());
});

test('inactive formations and reduced-motion/resolution checkpoints cannot revive dusty presentation', () => {
  for (const kind of ['inactive', 'reducedMotion', 'resolving']) {
    const scene = seeded();
    if (kind === 'inactive') scene.engine.state.find(f => f.id === id).active = false;
    else if (kind === 'reducedMotion') scene.reducedMotion = true;
    else scene.engine.outcome = 'victory';
    const saved = plain(scene.checkpoint()); assert.equal(dustRecord(saved.presentation).dust, null, kind);
    if (kind !== 'inactive') assert.ok(saved.presentation.travelDust.formations.every(record => record.dust === null), kind);
    const formation = snapshotFormation(scene), visual = acceptedVisual(saved.presentation, formation);
    assert.equal(directRestore(saved.presentation, { formation, visual, motion: { reducedMotion: kind === 'reducedMotion', resolving: kind === 'resolving' } }), null, kind);
  }
});

test('v36 preservation binds authentic v35 archives, protected bytes and final current source pins', async () => {
  const preservation = await import('./test-support/gettysburgV36Preservation.mjs');
  const bytes = readFileSync(root + '/scripts/fixtures/gettysburg-v36-preservation.json');
  assert.equal(sha(bytes), 'cff10ef54fe5813aaf6daddaab62bf5aa1686a58b76b31361f9b54d13d95d566');
  const fixture = JSON.parse(bytes); assert.equal(fixture.schema, 'gettysburg-v36-authentic-installed-v35-baseline-v1');
  assert.equal(fixture.baselineFiles, 1584); assert.equal(fixture.baselineBytes, 554162121);
  assert.equal(fixture.sourceFiles.length, 3); assert.equal(fixture.protectedFiles.length, 1581);
  assert.equal(fixture.queryRows.length, 46); assert.equal(fixture.sceneRows.length, 336); assert.equal(fixture.coldRows.length, 12);
  assert.equal(fixture.v34GateRows.length, 4); assert.equal(fixture.v35GateRows.length, 8);
  const metadata = preservation.verifyGettysburgV36MetadataMigrations(); assert.equal(metadata.metadataPathsVerified, 1); assert.equal(metadata.packageScriptFieldsVerified, 4);
  assert.equal(metadata.oldFixturesRefreshed, false); assert.equal(metadata.oldMigrationLedgersEdited, false);
  for (const record of fixture.sourceFiles) assert.equal(sha(preservation.v36BeforeFile(record.path)), record.sha256);
  const ledger = preservation.gettysburgV36MigrationLedger(); assert.equal(ledger.status, 'frozen-approved-runtime-pins');
  assert.equal(ledger.newSourcePins.length, 5); assert.equal(ledger.migrations.length, 3);
});
