import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createGettysburgStandardAnchorCheckpoint, restoreGettysburgStandardAnchorCheckpoint,
  GETTYSBURG_STANDARD_CHECKPOINT_VERSION, GETTYSBURG_STANDARD_CONTINUITY_ID } from '../src/battle/gettysburgStandardCheckpoint.js';
import { restoreFormationVisualFromCheckpoint } from '../src/battle/formationVisualCheckpoint.js';
import { createFormationVisual } from '../src/battle/formationVisualState.js';
import { gettysburgInfantryStandardAnchor } from '../src/battle/gettysburgInfantryFamily.js';
import { regressionHarness } from './test-support/gettysburgV30Regression.mjs';
import * as legacyPair from './test-support/gettysburgV32Regression.mjs';
import { standardHarness, plain, query, current, publicPair, controlledPair, source104, drawPair, coldPair,
  advance, standardFacts, rawFacts, bodyFacts, graphicsFacts } from './test-support/gettysburgV34Regression.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const sha = value => createHash('sha256').update(value).digest('hex');
const hash = value => sha(JSON.stringify(plain(value)));
const harness = await standardHarness(ROOT), before = await standardHarness(ROOT, true);
const fixture = JSON.parse(readFileSync(`${ROOT}/scripts/fixtures/gettysburg-v34-preservation.json`));
const fixtureHarness = regressionHarness(ROOT, harness.modules, harness.source, '?artPass=gettysburg-v32');
const saved = value => plain(value.scene.checkpoint());
const anchorRecord = (checkpoint, id) => checkpoint.presentation.standardAnchors.formations.find(record => record.id === id);
const baseRecord = (checkpoint, id) => checkpoint.presentation.formations.find(record => record.id === id);
const baseWithoutAnchors = checkpoint => { const result = plain(checkpoint); delete result.presentation.standardAnchors; return result; };
const physical = value => ({ raw: rawFacts(value), body: bodyFacts(harness, value), graphics: graphicsFacts(value), combat: plain(value.scene.engine.checkpoint()) });
const recordIds = checkpoint => checkpoint.presentation.standardAnchors.formations.map(record => record.id);

function assertRawStandard(value) {
  for (const id of value.ids) {
    const view = value.scene.views.get(id), formation = current(value.scene, id);
    const foot = gettysburgInfantryStandardAnchor(formation, view.visual.output.figures, view.standardAnchorId);
    assert.ok(foot); assert.equal(foot.id, view.standardAnchorId);
    assert.equal(view.standard.x, foot.x + 4 * .82); assert.equal(view.standard.y, foot.y);
    assert.equal(view.standard.depth, foot.y * 10 + 3);
    assert.equal(view.standardUI.x, view.standard.x); assert.equal(view.standardUI.y, view.standard.y);
    assert.equal(view.standardUI.depth, 40000);
  }
}

test('v34 constants and authentic installed-v33 fixture/archive/current pins remain independently inspectable', async () => {
  assert.equal(GETTYSBURG_STANDARD_CHECKPOINT_VERSION, 1);
  assert.equal(GETTYSBURG_STANDARD_CONTINUITY_ID, 'gettysburg-standard-continuity-v34');
  const preservation = await import('./test-support/gettysburgV34Preservation.mjs');
  assert.equal(sha(readFileSync(`${ROOT}/scripts/fixtures/gettysburg-v34-preservation.json`)), '2541d91c4b1a055a00ba60a0563e003c86d11b4d22dbc36d791a7793414543cc');
  assert.equal(fixture.schema, 'gettysburg-v34-authentic-installed-v33-baseline-v1');
  assert.equal(fixture.baselineFiles, 1562); assert.equal(fixture.sourceFiles.length, 3); assert.equal(fixture.protectedFiles.length, 1559);
  assert.equal(fixture.oldFixturesRefreshed, false); assert.equal(fixture.oldMigrationLedgersEdited, false);
  preservation.verifyGettysburgV34MetadataMigrations();
  const ledger = preservation.gettysburgV34MigrationLedger();
  assert.equal(ledger.migrations.length, 3);
  for (const row of fixture.sourceFiles) assert.equal(sha(preservation.v34BeforeFile(row.path)), row.sha256);
  for (const row of fixture.protectedFiles) assert.equal(sha(preservation.v34HistoricalSource(row.path)), row.sha256, row.path);
});

test('all46 authentic policy/asset queries and59744 native pose witnesses preserve current byte-exact behavior', () => {
  assert.equal(fixture.queryRows.length, 46); let total = 0;
  for (const row of fixture.queryRows) {
    const modules = harness.modules;
    assert.deepEqual(modules.gettysburgInfantryClipPolicy('gettysburg', row.query), row.policy);
    assert.deepEqual(modules.gettysburgInfantryClipAssets('gettysburg', row.query), row.assets);
    const clips = modules.prepareGettysburgInfantryClips(modules.gettysburgInfantryClipDefinitions('gettysburg', row.query, fixtureHarness.textures),
      (key, frame) => fixtureHarness.textures.exists(key) && fixtureHarness.textures.get(key).has(frame));
    assert.equal(clips.length, row.clips); assert.equal(hash(clips), row.clipsSHA256);
    const poses = clips.flatMap(clip => [0, 1, 2, 3].flatMap(frame => [{}, { paused: true }, { reducedMotion: true }, { resolving: true }].map(flags =>
      modules.gettysburgInfantryClipPose('v34-authentic-v33', { id: 17, direction: clip.direction, action: clip.action === 'march' ? 'walk' : clip.action,
        frame, fallen: clip.action === 'fall', scale: 1.37 }, 999, { scenarioId: 'gettysburg', search: row.query, side: clip.side,
        identity: clip.identity, versionedIdentity: true, clips, shootingAge: .08, reloadProgress: .7, ...flags }))));
    assert.equal(poses.length, row.poseRows); assert.equal(hash(poses), row.posesSHA256, row.query); total += poses.length;
  }
  assert.equal(total, 59744);
});

test('all336 authentic gate-absent Scene witnesses preserve raw feet, muzzle, body, graphics, combat and whole-checkpoint hashes', () => {
  assert.equal(fixture.sceneRows.length, 336);
  for (const row of fixture.sceneRows) {
    const value = legacyPair.isolated(fixtureHarness, row.query, row.side, row.direction, row.state), facts = plain(fixtureHarness.facts(value.view));
    assert.equal(hash(facts), row.factsSHA256, JSON.stringify(row));
    assert.equal(hash(facts.visual.output.figures.map(f => ({ id: f.id, x: f.x, y: f.y, scale: f.scale, fallen: f.fallen, visible: f.visible }))), row.feetSHA256);
    assert.equal(hash(facts.soldiers.map(body => ({ clipVolleyMuzzle: body.clipVolleyMuzzle, clipVolleyAt: body.clipVolleyAt }))), row.muzzlesSHA256);
    assert.equal(hash(value.scene.shadows.draws), row.shadowsSHA256); assert.equal(hash(value.scene.smoke.draws), row.smokeSHA256);
    const checkpoint = plain(value.scene.checkpoint());
    assert.equal(hash(checkpoint), row.checkpointSHA256); assert.equal(hash(harness.modules.combatCheckpointEnvelope(checkpoint)), row.rawCombatSHA256);
  }
});

test('all12 authentic legacy cold witnesses retain original saves and carrier fallback while current behavior stays active', () => {
  assert.equal(fixture.coldRows.length, 12);
  const anchors = value => value.ids.map(formationId => ({ formationId, anchorId: value.scene.views.get(formationId).standardAnchorId ?? null }));
  for (const row of fixture.coldRows) {
    const value = legacyPair.syntheticPair(fixtureHarness, row.profile, 'gettysburg-v32', row.fall, row.direction); value.scene.speed = 0;
    assert.deepEqual(anchors(value), row.beforeAnchors);
    const checkpoint = plain(value.scene.checkpoint()); assert.equal(hash(checkpoint), row.checkpointSHA256);
    assert.equal(hash(legacyPair.visibleFacts(legacyPair.pairFacts(fixtureHarness, value))), row.beforeFactsSHA256);
    const cold = legacyPair.coldPair(fixtureHarness, checkpoint, value); cold.scene.speed = 0;
    assert.deepEqual(anchors(cold), row.preDrawAnchors); assert.equal(hash(plain(cold.scene.checkpoint())), row.coldPreDrawCheckpointSHA256);
    legacyPair.drawPair(cold); assert.deepEqual(anchors(cold), row.coldAnchors);
    assert.equal(hash(legacyPair.visibleFacts(legacyPair.pairFacts(fixtureHarness, cold))), row.coldFactsSHA256);
    assert.equal(hash(cold.scene.engine.checkpoint()), row.rawCombatSHA256);
  }
});

for (const contact of [false, true]) test(`authentic public Move/Assault at104 demonstrates old16→19/18 cold defect and repaired standard/raw/body/shot/combat continuity, contact=${contact}`, () => {
  const old = source104(before, { enabled: false, contact });
  const off = source104(harness, { enabled: false, contact });
  const repaired = source104(harness, { enabled: true, contact });
  assert.deepEqual(standardFacts(off), standardFacts(old)); assert.deepEqual(physical(off), physical(old));
  assert.deepEqual(standardFacts(repaired), standardFacts(old)); assert.deepEqual(physical(repaired), physical(old));
  const oldSave = saved(old), offSave = saved(off), nextSave = saved(repaired);
  assert.deepEqual(offSave, oldSave); assert.deepEqual(baseWithoutAnchors(nextSave), oldSave);
  assert.deepEqual(standardFacts(old).map(row => row.carrierId), [16, 16]);
  assert.deepEqual(old.ids.map(id => gettysburgInfantryStandardAnchor(current(old.scene, id), old.scene.views.get(id).visual.output.figures).id), [19, 18]);
  const oldCold = coldPair(before, old, oldSave); drawPair(oldCold);
  assert.deepEqual(standardFacts(oldCold).map(row => row.carrierId), [19, 18]);
  assert.deepEqual(physical(oldCold), physical(old));
  assert.deepEqual(standardFacts(oldCold).map((row, i) => ({ x: row.standard.x - standardFacts(old)[i].standard.x,
    y: row.standard.y - standardFacts(old)[i].standard.y })), [
    { x: 27.887861525821563, y: -36.798809590953795 }, { x: -14.76475582161413, y: 20.064273897260932 },
  ]);
  assert.deepEqual(recordIds(nextSave), nextSave.presentation.formations.map(row => row.id));
  assert.deepEqual(repaired.ids.map(id => anchorRecord(nextSave, id).anchorId), [16, 16]);
  let cold = coldPair(harness, repaired, nextSave);
  for (let attempt = 0; attempt < 3; attempt++) {
    assert.deepEqual(standardFacts(cold).map(row => row.carrierId), [16, 16], 'carrier restored before first draw');
    const immediate = saved(cold); assert.deepEqual(immediate, nextSave, 'same-time pre-draw re-save must preserve metadata');
    cold = coldPair(harness, repaired, immediate);
  }
  drawPair(cold); assert.deepEqual(standardFacts(cold), standardFacts(repaired)); assert.deepEqual(physical(cold), physical(repaired));
  assertRawStandard(cold); assert.deepEqual(saved(cold), nextSave);
  const paused = standardFacts(cold), raw = rawFacts(cold);
  drawPair(cold); assert.deepEqual(standardFacts(cold), paused); assert.deepEqual(rawFacts(cold), raw);
  for (let step = 0; step < 20; step++) {
    repaired.scene.engine.tick(.05); cold.scene.engine.tick(.05); drawPair(repaired); drawPair(cold);
    assert.deepEqual(standardFacts(cold), standardFacts(repaired)); assert.deepEqual(physical(cold), physical(repaired));
  }
});

test('strict raw canonical query enables v34 independently of contactLayout and keeps gate-absent Scene/save behavior exact', () => {
  const bad = ['', query('moderate', false), '?artPass=gettysburg-v31&standardContinuity=v34', '?artPass=gettysburg-v34&standardContinuity=v34',
    query() + '&standardContinuity=v34', query() + '&artPass=gettysburg-v32', query().replace('v34', 'V34'),
    query().replace('standardContinuity', 'standard%43ontinuity'), query() + '&unrelated=%31', query() + '-other'];
  for (const search of bad) {
    const value = harness.make(search); value.draw();
    assert.equal(Object.hasOwn(value.scene.checkpoint().presentation, 'standardAnchors'), false, search);
  }
  for (const search of [query(), query('moderate', true, true), '?standardContinuity=v34&artPass=gettysburg-v32', query() + '&unrelated=plain']) {
    const value = harness.make(search); value.draw(); assert.ok(value.scene.checkpoint().presentation.standardAnchors, search);
  }
  harness.windowState.location.search = query();
  const field = new harness.Scene('first_manassas', harness.campaign, 'option_a', null, () => {});
  assert.equal(Object.hasOwn(field.checkpoint().presentation, 'standardAnchors'), false);
});

for (const direction of [1, 5]) for (const contact of [false, true]) for (const reducedMotion of [false, true])
  test(`both actual Scene identities preserve saved carriers before draw and resumed contact ${direction}/${contact}/${reducedMotion}`, () => {
    const value = controlledPair(harness, { direction, contact, reducedMotion }); advance(value, .55); value.scene.setSpeed(0);
    const checkpoint = saved(value), facts = standardFacts(value), exact = physical(value);
    const cold = coldPair(harness, value, checkpoint);
    assert.deepEqual(standardFacts(cold).map(row => row.carrierId), facts.map(row => row.carrierId));
    assert.deepEqual(saved(cold), checkpoint); drawPair(cold);
    assert.deepEqual(standardFacts(cold), facts); assert.deepEqual(physical(cold), exact);
    advance(value, .15); advance(cold, .15);
    assert.deepEqual(standardFacts(cold), standardFacts(value)); assert.deepEqual(physical(cold), physical(value));
  });

for (const contact of [false, true]) for (const drawBeforeSave of [false, true])
  test(`a living carrier dies through actual Scene loss sampling; Save selects no replacement, contact=${contact},draw=${drawBeforeSave}`, () => {
    const value = controlledPair(harness, { contact });
    assert.deepEqual(standardFacts(value).map(row => row.carrierId), [16, 16]);
    for (const unit of [value.union, value.confederate]) unit.strength *= .5;
    const beforeDisplay = standardFacts(value), beforeCombat = plain(value.scene.engine.checkpoint());
    if (drawBeforeSave) drawPair(value);
    const checkpoint = saved(value);
    assert.deepEqual(value.scene.engine.checkpoint(), beforeCombat);
    assert.ok(value.ids.every(id => value.scene.views.get(id).visual.figures[16].alive === false));
    if (drawBeforeSave) assert.deepEqual(value.ids.map(id => anchorRecord(checkpoint, id).anchorId), [17, 26]);
    else {
      assert.deepEqual(standardFacts(value), beforeDisplay, 'Save must neither move standards nor pick replacement carriers');
      assert.deepEqual(value.ids.map(id => anchorRecord(checkpoint, id).anchorId), [null, null]);
    }
    const cold = coldPair(harness, value, checkpoint);
    assert.deepEqual(saved(cold), checkpoint, 'null decisions survive an immediate pre-draw re-save');
    drawPair(value); drawPair(cold);
    assert.deepEqual(standardFacts(value).map(row => row.carrierId), [17, 26]);
    assert.deepEqual(standardFacts(cold), standardFacts(value)); assert.deepEqual(physical(cold), physical(value));
    const reassigned = saved(cold); assert.deepEqual(value.ids.map(id => anchorRecord(reassigned, id).anchorId), [17, 26]);
    const second = coldPair(harness, cold, reassigned); drawPair(second); assert.deepEqual(standardFacts(second), standardFacts(cold));
  });

test('public column reformation preserves figureID17 although its slot index is1 and fresh nearest is27', () => {
  const value = publicPair(harness); drawPair(value);
  // Synthetic loss amount, followed by a public actual Scene formation order.
  value.confederate.strength = 2400; drawPair(value);
  const view = value.scene.views.get(value.confederate.id); assert.equal(view.standardAnchorId, 17);
  value.scene.setFormation('column'); advance(value, 3); value.scene.setSpeed(0);
  const carrier = view.visual.figures.find(figure => figure.id === 17);
  assert.equal(carrier.alive, true); assert.equal(carrier.slot.index, 1); assert.equal(view.standardAnchorId, 17);
  assert.equal(gettysburgInfantryStandardAnchor(current(value.scene, value.confederate.id), view.visual.output.figures).id, 27);
  const checkpoint = saved(value); assert.equal(anchorRecord(checkpoint, value.confederate.id).anchorId, 17);
  const cold = coldPair(harness, value, checkpoint); assert.equal(cold.scene.views.get(value.confederate.id).standardAnchorId, 17);
  assert.deepEqual(saved(cold), checkpoint); drawPair(cold);
  assert.deepEqual(standardFacts(cold), standardFacts(value)); assert.deepEqual(physical(cold), physical(value));
});

test('temporarily hidden living carrier survives metadata while inactive and artillery records remain null', () => {
  const value = controlledPair(harness); value.confederate.status = 'broken'; drawPair(value);
  const view = value.scene.views.get(value.confederate.id); assert.equal(view.visual.figures[16].alive, true);
  assert.equal(view.visual.output.figures[16].visible, false); assert.equal(view.standardAnchorId, 16);
  const checkpoint = saved(value); assert.equal(anchorRecord(checkpoint, value.confederate.id).anchorId, 16);
  const cold = coldPair(harness, value, checkpoint); assert.equal(cold.scene.views.get(value.confederate.id).standardAnchorId, 16);
  assert.deepEqual(saved(cold), checkpoint);
  value.confederate.status = 'steady'; cold.confederate.status = 'steady'; drawPair(value); drawPair(cold);
  assert.deepEqual(physical(cold), physical(value));
  // The decorative ground standard is disabled when broken. The inherited
  // active path re-enables only standardUI, so warm/cold ground input flags
  // differ after unhide. Prove both exact behaviors against genuine before
  // source rather than dropping this field or claiming whole-display parity.
  const old = controlledPair(before, { enabled: false }); old.confederate.status = 'broken'; drawPair(old);
  const oldCold = coldPair(before, old, saved(old));
  old.confederate.status = 'steady'; oldCold.confederate.status = 'steady'; drawPair(old); drawPair(oldCold);
  assert.deepEqual(standardFacts(value), standardFacts(old)); assert.deepEqual(standardFacts(cold), standardFacts(oldCold));
  assert.equal(value.scene.views.get(value.confederate.id).standard.input.enabled, false);
  assert.equal(cold.scene.views.get(value.confederate.id).standard.input.enabled, true);
  value.confederate.active = false; const inactive = saved(value); assert.equal(anchorRecord(inactive, value.confederate.id).anchorId, null);
  const artillery = value.scene.engine.snapshot({ presentation: true }).formations.find(unit => unit.type === 'artillery');
  value.scene.views.set(artillery.id, { visual: createFormationVisual(artillery, 1, value.scene.engine.time), standardAnchorId: 0 });
  assert.equal(anchorRecord(saved(value), artillery.id).anchorId, null);
});

test('missing, malformed and legacy optional continuity data preserve accepted base/raw combat and inherited nearest fallback', () => {
  const value = source104(harness), checkpoint = saved(value), raw = rawFacts(value), combat = plain(value.scene.engine.checkpoint());
  for (const optional of [undefined, null, {}, { version: 99 }, { $fieldMap: 'bad' }]) {
    const altered = plain(checkpoint); if (optional === undefined) delete altered.presentation.standardAnchors; else altered.presentation.standardAnchors = optional;
    const cold = coldPair(harness, value, altered); drawPair(cold);
    assert.deepEqual(cold.scene.engine.checkpoint(), combat); assert.deepEqual(rawFacts(cold), raw);
    assert.deepEqual(standardFacts(cold).map(row => row.carrierId), [19, 18]);
  }
  const off = coldPair(harness, value, checkpoint, query('moderate', false)); drawPair(off);
  assert.deepEqual(off.scene.engine.checkpoint(), combat); assert.deepEqual(rawFacts(off), raw);
  assert.deepEqual(standardFacts(off).map(row => row.carrierId), [19, 18]);
  assert.equal(Object.hasOwn(saved(off).presentation, 'standardAnchors'), false);
  const legacy = plain(checkpoint); delete legacy.presentation;
  const coldLegacy = coldPair(harness, value, legacy); drawPair(coldLegacy);
  assert.deepEqual(coldLegacy.scene.engine.checkpoint(), combat);
  for (const id of value.ids) {
    const view = coldLegacy.scene.views.get(id), formation = current(coldLegacy.scene, id);
    const expected = createFormationVisual(formation, 32, coldLegacy.scene.engine.time);
    assert.deepEqual(view.visual.figures.map(f => ({ id: f.id, alive: f.alive })), expected.figures.map(f => ({ id: f.id, alive: f.alive })));
  }
});

test('actual optional parser rejects unknown, duplicate, invalid IDs, mismatched binding, sparse/accessor data atomically without damaging base', () => {
  const value = publicPair(harness); drawPair(value); const checkpoint = saved(value);
  const mutations = [
    s => s.version = 2, s => s.continuityId = 'borrowed', s => s.time += 1, s => s.extra = true,
    s => s.formations.pop(), s => s.formations.push(plain(s.formations[0])), s => s.formations[0].id = 'unknown',
    s => s.formations[0].capacity = 33, s => s.formations[0].capacity = true,
    s => s.formations[0].formation.x += 1, s => s.formations[0].formation.active = false,
    s => s.formations[0].anchorId = -1, s => s.formations[0].anchorId = 32,
    s => s.formations[0].anchorId = 1.5, s => s.formations[0].anchorId = '16', s => s.formations[0].anchorId = true,
    s => s.formations[0].extra = true, s => s.formations[0].formation.extra = true,
    s => { delete s.formations[0]; },
  ];
  for (const mutate of mutations) {
    const altered = plain(checkpoint); mutate(altered.presentation.standardAnchors);
    const cold = coldPair(harness, value, altered);
    assert.deepEqual(standardFacts(cold).map(row => row.carrierId), [null, null], mutate.toString());
    drawPair(cold); assert.deepEqual(rawFacts(cold), rawFacts(value)); assert.deepEqual(cold.scene.engine.checkpoint(), value.scene.engine.checkpoint());
  }
  let invoked = 0;
  for (const target of ['sidecar', 'record', 'array', 'identity', 'array-extra']) {
    const altered = plain(checkpoint), sidecar = altered.presentation.standardAnchors;
    if (target === 'sidecar') Object.defineProperty(altered.presentation, 'standardAnchors', { enumerable: true, get() { invoked++; throw Error('must not read accessor'); } });
    if (target === 'record') Object.defineProperty(sidecar.formations[0], 'anchorId', { enumerable: true, get() { invoked++; throw Error('must not read accessor'); } });
    if (target === 'array') Object.defineProperty(sidecar.formations, '0', { enumerable: true, get() { invoked++; throw Error('must not read accessor'); } });
    if (target === 'identity') Object.defineProperty(sidecar.formations[0].formation, 'x', { enumerable: true, get() { invoked++; throw Error('must not read accessor'); } });
    if (target === 'array-extra') sidecar.formations.extra = true;
    for (const id of value.ids) {
      const formation = current(value.scene, id), visual = restoreFormationVisualFromCheckpoint(formation, 32, value.scene.engine.time, altered.presentation);
      assert.equal(visual.restoreFrame, true);
      assert.equal(restoreGettysburgStandardAnchorCheckpoint(altered.presentation, formation, visual, value.scene.engine.time), null);
    }
  }
  assert.equal(invoked, 0);
});

test('dead saved IDs, invalid base visual, stale actual restore and oversize optional data cannot confer a carrier', () => {
  const value = controlledPair(harness); for (const unit of [value.union, value.confederate]) unit.strength *= .5;
  drawPair(value); const checkpoint = saved(value), dead = plain(checkpoint);
  for (const id of value.ids) anchorRecord(dead, id).anchorId = 16;
  const rejected = coldPair(harness, value, dead); assert.deepEqual(standardFacts(rejected).map(row => row.carrierId), [null, null]);
  const invalid = plain(checkpoint); baseRecord(invalid, value.confederate.id).state.figures[0].slot.lateral = null;
  const baseFallback = coldPair(harness, value, invalid); const fallbackView = baseFallback.scene.views.get(value.confederate.id);
  assert.equal(fallbackView.visual.restoreFrame, undefined); assert.equal(fallbackView.standardAnchorId, null);
  assert.deepEqual(baseFallback.scene.engine.checkpoint(), value.scene.engine.checkpoint());
  const formation = current(value.scene, value.confederate.id), visual = restoreFormationVisualFromCheckpoint(formation, 32, value.scene.engine.time, checkpoint.presentation);
  assert.equal(restoreGettysburgStandardAnchorCheckpoint(checkpoint.presentation, formation, visual, value.scene.engine.time), 17);
  delete visual.restoreFrame; assert.equal(restoreGettysburgStandardAnchorCheckpoint(checkpoint.presentation, formation, visual, value.scene.engine.time), null);
  const oversized = plain(checkpoint); oversized.presentation.standardAnchors.formations = Array(33).fill(oversized.presentation.standardAnchors.formations[0]);
  const overCold = coldPair(harness, value, oversized); assert.deepEqual(standardFacts(overCold).map(row => row.carrierId), [null, null]);
});

test('actual writer copies bounded primitive identities, binds base/current metadata, and never mutates carrier/display/combat', () => {
  const value = controlledPair(harness); const checkpoint = saved(value), snapshot = value.scene.engine.snapshot({ presentation: true });
  const displays = standardFacts(value), combat = plain(value.scene.engine.checkpoint());
  const write = () => createGettysburgStandardAnchorCheckpoint(checkpoint.presentation, snapshot.formations, value.scene.views, snapshot.time);
  assert.deepEqual(plain(write()), checkpoint.presentation.standardAnchors);
  assert.deepEqual(standardFacts(value), displays); assert.deepEqual(value.scene.engine.checkpoint(), combat);
  const result = write(); result.formations[0].formation.footprint.width += 1;
  assert.notEqual(result.formations[0].formation.footprint.width, checkpoint.presentation.standardAnchors.formations[0].formation.footprint.width);
  const duplicate = [...snapshot.formations, snapshot.formations[0]];
  assert.equal(createGettysburgStandardAnchorCheckpoint(checkpoint.presentation, duplicate, value.scene.views, snapshot.time), null);
  assert.equal(createGettysburgStandardAnchorCheckpoint(checkpoint.presentation, snapshot.formations, value.scene.views, snapshot.time + 1), null);
  const altered = plain(checkpoint.presentation); altered.formations[0].formation.x += 1;
  assert.equal(createGettysburgStandardAnchorCheckpoint(altered, snapshot.formations, value.scene.views, snapshot.time), null);
});
