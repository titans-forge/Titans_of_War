import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { animationHarness, animationQuery, plain, sha, fullFacts, changedBodies, assertRawUnchanged, drawAll } from './test-support/gettysburgV35Regression.mjs';
import { loadFieldSuspension } from '../src/game/fieldSuspendSave.js';
import { loadFieldCheckpoint, FIELD_CHECKPOINT_KEY } from '../src/game/fieldCheckpoint.js';
import { CAMPAIGN_STORAGE_KEY } from '../src/game/campaignStorage.js';
import { updateFormationVisual } from '../src/battle/formationVisualState.js';

const root = new URL('../', import.meta.url).pathname.replace(/\/$/, '');
const capturePath = root + '/scripts/fixtures/gettysburg-v35-owned-save.json';
const capturedBytes = readFileSync(capturePath);
assert.equal(sha(capturedBytes), '4057eb1d793c402b2aea992672c7e379f60af4995dec315c839e9073e5e9c30e');
const captured = JSON.parse(capturedBytes);
assert.equal(captured.schema, 'gettysburg-v35-authentic-owned-save-input-v1');
assert.equal(captured.sourceCaptureSHA256, 'c17b6f42e83435236610aa48664bc8c274ab31f267a611baef9b717bf36881e0');
assert.deepEqual(Object.keys(captured.values).sort(), [CAMPAIGN_STORAGE_KEY, FIELD_CHECKPOINT_KEY].sort());
for (const value of Object.values(captured.values)) {
  assert.equal(sha(value.value), value.SHA256); assert.equal(Buffer.byteLength(value.value), value.bytes);
}
const input = new Map([CAMPAIGN_STORAGE_KEY, FIELD_CHECKPOINT_KEY].map(key => [key, captured.values[key].value]));
assert.equal(sha(input.get(FIELD_CHECKPOINT_KEY)), '7739444f47f7226cf9f1a99593a0bb2035e56d19c6e2aa227b8187007fe623ec');
assert.equal(sha(input.get(CAMPAIGN_STORAGE_KEY)), '1794a51c375829f6bbcb0151f8e57ef4b8ecb0eec5c95821dd98b3cf41628701');
const storage = { getItem: key => input.get(key) ?? null }, loaded = loadFieldSuspension(storage), field = loadFieldCheckpoint(storage);
assert.equal(loaded.error, null); assert.equal(field.error, null); assert.equal(loaded.protectedCampaign, false); assert.ok(loaded.pending);
const context = loaded.pending, original = plain(context.checkpoint);
const ownedOptions = { campaign: context.resumeState, scenarioId: context.battle.id, choiceId: context.choiceId };
const oldSource = readFileSync(root + '/scripts/test-support/gettysburg-v35-before/src/battle/CivilWarBattlefield.jsx', 'utf8');
assert.equal(sha(oldSource), '6cb8988dcac1dbf2296ea5101950211ff7a52dcda336b9eb6b6cfa46084a700e');
const before = await animationHarness(root, { source: oldSource });
const current = await animationHarness(root);

function owned(harness, query = animationQuery(), checkpoint = original, extra = {}) {
  return harness.make(plain(checkpoint), { ...ownedOptions, query, ...extra });
}
function successfulFirstDraw(harness, scene) { scene.update(0, 0); return fullFacts(harness, scene); }
const absentPending = scene => [...scene.views.values()].every(view => !view.animationRestoreFrame);

test('immutable installed-v34 witness reproduces actual owned-save 1 Pickett / 24 Hancock phase defect', () => {
  const query = animationQuery({ animation: false });
  const fresh = owned(before, query), delayed = owned(before, query);
  assert.equal([...fresh.views.values()].filter(view => view.visual.restoreFrame === true).length, 10);
  assert.equal([...delayed.views.values()].filter(view => view.visual.restoreFrame === true).length, 10);
  const a = successfulFirstDraw(before, fresh);
  assert.deepEqual(plain(delayed.checkpoint()), original);
  assert.equal([...delayed.views.values()].filter(view => view.visual.restoreFrame === true).length, 0);
  assert.ok([...delayed.views.values()].every(view => view.soldiers.every(soldier => soldier.clipPhase === undefined)));
  const b = successfulFirstDraw(before, delayed);
  assert.deepEqual(changedBodies(a, b), [
    { id: 'pickett-division', bodyIds: [23] },
    { id: 'hancock-reserve', bodyIds: [2, 4, 5, 6, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24, 26, 27, 29, 30, 31] },
  ]);
  assertRawUnchanged(a, b, 'actual defect changes native body phases only');
});

test('actual owned-save all-roster first draw survives repeated pre-draw saves, idle, zoom, re-save and fresh reload', () => {
  for (const contact of [false, true]) for (const standard of [false, true]) {
    const query = animationQuery({ contact, standard }), fresh = owned(current, query);
    assert.equal(fresh.animationContinuityEnabled, true);
    const expected = successfulFirstDraw(current, fresh), canonical = plain(fresh.checkpoint());
    for (const count of [1, 3, 7]) {
      const delayed = owned(current, query);
      assert.equal([...delayed.views.values()].filter(view => view.visual.restoreFrame === true).length, 10);
      assert.equal([...delayed.views.values()].filter(view => view.animationRestoreFrame).length, 8, 'eight active infantry renderer markers; both artillery base records remain accepted');
      const combat = plain(delayed.engine.checkpoint());
      for (let save = 0; save < count; save++) {
        assert.deepEqual(plain(delayed.checkpoint()), canonical, `non-drawing save ${save} contact=${contact} standard=${standard}`);
        assert.equal([...delayed.views.values()].filter(view => view.animationRestoreFrame).length, 8);
        assert.ok([...delayed.views.values()].every(view => view.soldiers.every(soldier => soldier.clipPhase === undefined && soldier.clipAction === undefined)));
      }
      assert.deepEqual(successfulFirstDraw(current, delayed), expected, `pre-draw save count=${count} contact=${contact} standard=${standard}`);
      assert.ok(absentPending(delayed));
      delayed.update(0, 0); assert.deepEqual(fullFacts(current, delayed), expected, 'cached idle frame');
      delayed.cameras.main.zoom += .01; delayed.update(0, 0); assert.deepEqual(fullFacts(current, delayed), expected, 'zoom-forced paused draw');
      assert.deepEqual(plain(delayed.engine.checkpoint()), combat);
      const resave = plain(delayed.checkpoint()); assert.deepEqual(resave, canonical);
      assert.deepEqual(successfulFirstDraw(current, owned(current, query, resave)), expected, 'fresh saved reload');
      assert.equal(JSON.stringify(resave).includes('animationRestoreFrame'), false);
      assert.equal(Object.hasOwn(resave.presentation, 'animationContinuity'), false, 'no serialized animation sidecar');
    }
  }
  assert.equal(sha(readFileSync(capturePath)), sha(capturedBytes), 'immutable portable owned-save fixture remains untouched');
});

test('v35 fresh first draw matches authentic installed-v34 body/raw/standard/shots/graphics/combat facts', () => {
  for (const contact of [false, true]) for (const standard of [false, true]) for (const reducedMotion of [false, true]) {
    const query = animationQuery({ contact, standard });
    const old = owned(before, query, original, { reducedMotion }), next = owned(current, query, original, { reducedMotion });
    assert.deepEqual(successfulFirstDraw(current, next), successfulFirstDraw(before, old));
    assert.deepEqual(plain(next.checkpoint()), plain(old.checkpoint()));
  }
});

// Synthetic primitive checkpoints exercise all supported native directions,
// stable identities and authored phase choices without inventing GPU evidence.
function motionCheckpoint(harness, side, direction, travel, reducedMotion) {
  const scene = harness.make(null, { query: animationQuery(), reducedMotion, all: false });
  const id = side === 'union' ? 'hancock-reserve' : 'pickett-division';
  const unit = scene.engine.state.find(formation => formation.id === id);
  scene.engine.time = 10;
  Object.assign(unit, { active: true, arrivalTime: null, facing: direction * Math.PI / 4, status: 'steady', order: 'hold',
    formationMode: 'line', frontage: 160, reload: 0, lastVolleyAt: null, inMelee: false, meleeWith: null, engagedWith: null,
    strength: unit.initialStrength });
  const formation = () => scene.engine.snapshot({ presentation: true }).formations.find(value => value.id === id);
  scene.createFormation(formation());
  const view = scene.views.get(id);
  updateFormationVisual(view.visual, formation(), 10, .82, { reducedMotion });
  unit.x += travel; scene.engine.time = 10.5;
  updateFormationVisual(view.visual, formation(), 10.5, .82, { reducedMotion });
  assert.equal(view.visual.lastMotion.moving, true);
  return { id, checkpoint: plain(scene.checkpoint()) };
}

test('native march phases for both sides/stable Union identities and eight bearings survive pre-draw saving', () => {
  const identities = new Set(), phases = new Set(), nativeDirections = new Set();
  for (const side of ['union', 'confederate']) for (let direction = 0; direction < 8; direction++) for (const travel of [1, 6, 11, 16]) for (const reducedMotion of [false, true]) {
    const { id, checkpoint } = motionCheckpoint(current, side, direction, travel, reducedMotion);
    const fresh = current.make(checkpoint, { reducedMotion }), delayed = current.make(checkpoint, { reducedMotion });
    const expected = successfulFirstDraw(current, fresh);
    for (let save = 0; save < 3; save++) delayed.checkpoint();
    assert.deepEqual(successfulFirstDraw(current, delayed), expected, `${side} bearing${direction} travel${travel} reduced${reducedMotion}`);
    const saved = plain(delayed.checkpoint());
    assert.deepEqual(successfulFirstDraw(current, current.make(saved, { reducedMotion })), expected);
    const bodies = expected.formations.find(value => value.id === id).bodies;
    for (const body of bodies.filter(value => value.visible && value.clipAction === 'march')) {
      phases.add(body.clipPhase); nativeDirections.add(direction);
      const clip = current.modules.gettysburgInfantryClipDefinitions('gettysburg', animationQuery(), current.textures).find(value => value.key === body.texture);
      if (clip) identities.add(side + ':' + clip.identity);
    }
  }
  assert.deepEqual([...phases].sort(), [0, 1, 2, 3]);
  assert.deepEqual([...nativeDirections].sort(), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual([...identities].sort(), ['confederate:a', 'union:a', 'union:b']);
});

test('raw restore acceptance is required; absent or damaged optional data never invents pending animation state', () => {
  const malformed = [undefined, null, { version: 99 }, { ...plain(original.presentation), time: original.presentation.time + 1 }];
  const brokenRecord = plain(original.presentation); brokenRecord.formations[0].state.figures[0].stepDistance = -1; malformed.push(brokenRecord);
  for (const presentation of malformed) {
    const checkpoint = plain(original); if (presentation === undefined) delete checkpoint.presentation; else checkpoint.presentation = presentation;
    const next = owned(current, animationQuery(), checkpoint), old = owned(before, animationQuery(), checkpoint);
    for (const [id, view] of next.views) {
      if (view.animationRestoreFrame) assert.equal(view.visual.restoreFrame, true, id + ' pending requires accepted base');
      if (view.visual.restoreFrame !== true) assert.equal(view.animationRestoreFrame, undefined, id + ' rejected base cannot be made pending');
    }
    next.checkpoint();
    assert.deepEqual(successfulFirstDraw(current, next), successfulFirstDraw(before, old));
    assert.deepEqual(plain(next.engine.checkpoint()), plain(old.engine.checkpoint()));
  }
});

test('canonical animation gate rejects duplicate, encoded, malformed, wrong-art and wrong-scenario selectors', () => {
  const good = animationQuery();
  const disabled = [animationQuery({ animation: false }), good + '&animationContinuity=v35', good + '&animationContinuity=bad',
    good.replace('animationContinuity=v35', 'animationContinuity=%76%33%35'), good.replace('animationContinuity=v35', 'animation%43ontinuity=v35'),
    good.replace('animationContinuity=v35', 'animationContinuity=v350'), good.replace('animationContinuity=v35', 'animationContinuity=V35'),
    good.replace('artPass=gettysburg-v32', 'artPass=gettysburg-v31'), good + '&artPass=gettysburg-v32',
    good.replace('artPass=gettysburg-v32', 'artPass=gettysburg-v%33%32'), good + '&unrelated=%31'];
  for (const query of disabled) {
    const next = owned(current, query), old = owned(before, query);
    assert.equal(Boolean(next.animationContinuityEnabled), false, query); assert.ok(absentPending(next));
    next.checkpoint(); old.checkpoint();
    assert.deepEqual(successfulFirstDraw(current, next), successfulFirstDraw(before, old), query);
    assert.deepEqual(plain(next.checkpoint()), plain(old.checkpoint()), query);
  }
  for (const contact of [false, true]) for (const standard of [false, true]) {
    const scene = owned(current, animationQuery({ contact, standard }));
    assert.equal(scene.animationContinuityEnabled, true); assert.equal(scene.contactLayoutEnabled, contact); assert.equal(scene.standardContinuityEnabled, standard);
  }
  const wrong = current.make(null, { query: good, scenarioId: 'first_manassas', all: false });
  assert.equal(Boolean(wrong.animationContinuityEnabled), false);
  for (const query of [animationQuery() + '&standardContinuity=v34', animationQuery({ contact: true }) + '&contactLayout=v33',
    '?animationContinuity=v35&artPass=gettysburg-v32']) {
    const scene = owned(current, query); assert.equal(scene.animationContinuityEnabled, true, 'independent gate with ' + query);
  }
});

test('accepted but stale or differently sampled raw restores cannot arm the v35 first-render marker', () => {
  for (const kind of ['lagged-time', 'saved-reducedMotion', 'saved-resolving']) {
    const checkpoint = plain(original);
    for (const record of checkpoint.presentation.formations) {
      if (kind === 'lagged-time') {
        record.state.time -= .01; record.state.lastContact = Math.min(record.state.lastContact, record.state.time);
        if (record.state.lastLoss !== null) record.state.lastLoss = Math.min(record.state.lastLoss, record.state.time);
        for (const figure of record.state.figures) if (figure.fallen) figure.fallen.time = Math.min(figure.fallen.time, record.state.time);
      } else record.state.lastMotion[kind === 'saved-reducedMotion' ? 'reducedMotion' : 'resolving'] = true;
    }
    const next = owned(current, animationQuery(), checkpoint), old = owned(before, animationQuery(), checkpoint);
    assert.equal([...next.views.values()].filter(view => view.visual.restoreFrame === true).length, 10, 'generic base acceptance remains compatible');
    assert.ok(absentPending(next), kind);
    next.checkpoint(); old.checkpoint();
    assert.deepEqual(successfulFirstDraw(current, next), successfulFirstDraw(before, old), kind + ' matched legacy rendering');
    assert.deepEqual(plain(next.checkpoint()), plain(old.checkpoint()), kind + ' matched legacy serialization');
  }
});

test('pending restore binding expires permanently on time, movement, command, reform, status, casualty and option changes', () => {
  const changes = [
    ['time', (scene, unit) => { scene.engine.time += .05; }],
    ['resolutionTime', scene => { scene.engine.resolutionTime = .1; }],
    ['movement', (scene, unit) => { unit.x += 1; }],
    ['face command', (scene, unit) => { unit.facing += .2; }],
    ['reform command', (scene, unit) => { scene.engine.setFormation(unit.id, 'column'); }],
    ['status', (scene, unit) => { unit.status = 'routing'; }],
    ['casualty', (scene, unit) => { unit.strength *= .8; }],
    ['inactive', (scene, unit) => { unit.active = false; }],
    ['reload', (scene, unit) => { unit.reload += 1; }],
    ['volley', (scene, unit) => { unit.lastVolleyAt = scene.engine.time; }],
    ['fatigue', (scene, unit) => { unit.fatigue += 10; }],
    ['reducedMotion', scene => { scene.reducedMotion = true; }],
    ['resolving', scene => { scene.engine.outcome = 'victory'; }],
  ];
  for (const contact of [false, true]) for (const [name, mutate] of changes) {
    const query = animationQuery({ contact }), scene = owned(current, query), old = owned(before, query), id = 'pickett-division';
    const unit = scene.engine.state.find(value => value.id === id), view = scene.views.get(id);
    assert.ok(view.animationRestoreFrame, name);
    const savedUnit = { ...unit }, savedTime = scene.engine.time, savedResolution = scene.engine.resolutionTime, savedOutcome = scene.engine.outcome;
    mutate(scene, unit); scene.checkpoint();
    mutate(old, old.engine.state.find(value => value.id === id)); old.checkpoint();
    assert.equal(view.animationRestoreFrame, undefined, `${name} contact${contact}`);
    drawAll(scene); drawAll(old);
    assert.deepEqual(fullFacts(current, scene).formations.find(value => value.id === id),
      fullFacts(before, old).formations.find(value => value.id === id), name + ' retains matched legacy behavior');
    Object.assign(unit, savedUnit); scene.engine.time = savedTime; scene.engine.resolutionTime = savedResolution; scene.engine.outcome = savedOutcome; scene.reducedMotion = false;
    scene.checkpoint(); assert.equal(view.animationRestoreFrame, undefined, name + ' never resurrects');
  }
});

test('pending marker cannot cross a replaced raw visual object or changed capacity', () => {
  for (const change of ['replace', 'capacity']) {
    const scene = owned(current), id = 'pickett-division', view = scene.views.get(id);
    scene.checkpoint(); assert.ok(view.animationRestoreFrame);
    if (change === 'replace') view.visual = structuredClone(view.visual); else view.visual.capacity -= 1;
    scene.checkpoint();
    assert.equal(view.animationRestoreFrame, undefined, change);
  }
});

test('renderer failure preserves pending restoration; only a completed body render consumes it', () => {
  const query = animationQuery(), scene = owned(current, query), id = 'pickett-division', view = scene.views.get(id);
  scene.checkpoint(); assert.ok(view.animationRestoreFrame);
  const sprite = view.soldiers[0].sprite, setTexture = sprite.setTexture;
  sprite.setTexture = () => { throw new Error('injected renderer failure'); };
  assert.throws(() => drawAll(scene), /injected renderer failure/);
  assert.ok(view.animationRestoreFrame, 'render failure retains pending native phase');
  sprite.setTexture = setTexture;
  const fresh = owned(current, query); drawAll(fresh); drawAll(scene);
  assert.deepEqual(fullFacts(current, scene), fullFacts(current, fresh));
  assert.ok(absentPending(scene));
});

test('v35 preservation requires immutable authentic capture/archives and approved exact runtime pins', async () => {
  const preservation = await import('./test-support/gettysburgV35Preservation.mjs');
  const fixtureBytes = readFileSync(root + '/scripts/fixtures/gettysburg-v35-preservation.json');
  assert.equal(sha(fixtureBytes), '5aa8267f612bb1e4f21c7e327c76e9cbc7906ba3cc256074ea03b21167f049fd');
  const fixture = JSON.parse(fixtureBytes);
  assert.equal(fixture.schema, 'gettysburg-v35-authentic-installed-v34-baseline-v1');
  assert.equal(fixture.baselineFiles, 1573); assert.equal(fixture.baselineBytes, 551190101);
  assert.equal(fixture.sourceFiles.length, 3); assert.equal(fixture.protectedFiles.length, 1570);
  assert.equal(fixture.queryRows.length, 46); assert.equal(fixture.sceneRows.length, 336); assert.equal(fixture.coldRows.length, 12);
  assert.equal(fixture.v34GateRows.length, 4);
  assert.equal(fixture.oldFixturesRefreshed, false); assert.equal(fixture.oldMigrationLedgersEdited, false);
  assert.equal(fixture.freshCanonicalWitnessesEqual, true);
  const metadata = preservation.verifyGettysburgV35MetadataMigrations();
  assert.equal(metadata.metadataPathsVerified, 1); assert.equal(metadata.packageScriptFieldsVerified, 4);
  assert.equal(metadata.oldFixturesRefreshed, false); assert.equal(metadata.oldMigrationLedgersEdited, false);
  for (const row of fixture.sourceFiles) assert.equal(sha(preservation.v35BeforeFile(row.path)), row.sha256, row.path + ' authentic archived bytes');
  const ledger = preservation.gettysburgV35MigrationLedger();
  assert.equal(ledger.migrations.length, 3); assert.equal(ledger.status, 'frozen-approved-runtime-pins');
});
