import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { regressionModules, regressionHarness } from './test-support/gettysburgV30Regression.mjs';
import { plain, query, contract, current, drawPair, pairFacts, visibleFacts, coldPair, syntheticPair, isolated, publicPair } from './test-support/gettysburgV32Regression.mjs';
import { closeCombatPairs, resolveContactCombat } from '../src/battle/closeCombat.js';
import { GETTYSBURG_INFANTRY_UNION_B_CONTACT_CLIPS_IDS } from '../src/battle/gettysburgInfantryUnionBContactClips.js';
import { gettysburgV32MigrationLedger, validateGettysburgV32MigrationLedger, v32BeforeFile, v32HistoricalSource } from './test-support/gettysburgV32Preservation.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const file = path => `${ROOT}/${path}`, sha = raw => createHash('sha256').update(raw).digest('hex');
const hash = value => sha(JSON.stringify(plain(value)));
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} differs from ${b}`);
const fixture = JSON.parse(readFileSync(file('scripts/fixtures/gettysburg-v32-preservation.json')));
const modules = await regressionModules(ROOT), source = readFileSync(file('src/battle/CivilWarBattlefield.jsx'), 'utf8');
const prior = regressionHarness(ROOT, modules, source, query('baseline', 'gettysburg-v31'));
const assets = modules.gettysburgInfantryClipAssets('gettysburg', query()), added = assets.filter(a => a.key.includes('gettysburg-v32'));
const exported = added.length === 4 && added.every(a => existsSync(file(`public/${a.json}`)) && existsSync(file(`public/${a.image}`)));
// Loading the old harness permits metadata/preservation work before export.
// Every native-dependent case explicitly requires the real four exports.
const native = exported ? regressionHarness(ROOT, modules, source, query()) : prior;
const prepare = (search = query(), loaded = native.textures) => modules.prepareGettysburgInfantryClips(
  modules.gettysburgInfantryClipDefinitions('gettysburg', search, loaded), (key, frame) => loaded.exists(key) && loaded.get(key).has(frame));
const clips = prepare();
function requireNative() { assert.equal(exported, true, 'Four actual v32 PNG/JSON exports are required'); assert.equal(assets.length, 78); assert.equal(clips.length, 126); }
const stableId = (formationId, identity) => Array.from({ length: 256 }, (_, id) => id).find(id => modules.gettysburgInfantryIdentity(formationId, id) === identity);
// Synthetic metadata is used only to challenge validation/dispatch, not as art.
const synthetic = (direction, action) => ({ side: 'union', identity: 'b', direction, action, key: contract(direction, action).key,
  [contract(direction, action).marker]: contract(direction, action).sequence,
  frames: Array.from({ length: 4 }, (_, phase) => `b-${action}-${direction}-${phase}`),
  pivots: Array.from({ length: 4 }, () => ({ x: .5, y: .9 })), referenceHeight: 350,
  sourceHash: 'a'.repeat(64), approval: { reviewed: true, rejected: false } });

test('authentic installed-v31 baseline, old fixtures and1499 protected files retain their exact before bytes', () => {
  assert.equal(fixture.schema, 'gettysburg-v32-authentic-installed-v31-baseline-v1');
  assert.equal(fixture.capturedFrom, '/Users/titansforge/Vault/Titans_of_War');
  assert.equal(fixture.baselineFiles, 1507); assert.equal(fixture.sourceFiles.length, 8); assert.equal(fixture.protectedFiles.length, 1499);
  assert.equal(sha(readFileSync(file('scripts/fixtures/gettysburg-v32-preservation.json'))), '6d8f7a518291d8acbeddadaa1f0fe145fc4d35e9821d248d153441172f7a89e2');
  for (const row of fixture.sourceFiles) assert.equal(sha(readFileSync(file(row.archive))), row.sha256, row.path);
  for (const row of fixture.protectedFiles) assert.equal(sha(v32HistoricalSource(row.path)), row.sha256, row.path);
  assert.equal(sha(readFileSync(file('src/battle/CivilWarBattlefield.jsx'))), fixture.sceneSHA256);
  assert.equal(fixture.oldFixturesRefreshed, false); assert.equal(fixture.oldMigrationLedgersEdited, false);
});
test('fixed seven-path migration rejects expanded scope, false provenance and missing mandatory current registrations', () => {
  const ledger = gettysburgV32MigrationLedger(); assert.equal(ledger.migrations.length, 7);
  const mutations = [v => v.migrations.pop(), v => v.migrations.push(v.migrations[0]), v => v.migrations[0].path = 'src/App.jsx',
    v => v.migrations[0].archive = 'package.json', v => v.migrations[0].currentSHA256 = v.migrations[0].beforeSHA256,
    v => v.fixture.sha256 = '0'.repeat(64), v => v.baselineFiles = 1, v => v.oldFixturesRefreshed = true,
    v => v.oldMigrationLedgersEdited = true, v => v.mandatorySuite = 'optional.mjs', v => v.extraApproval = true];
  for (const mutate of mutations) { const forged = plain(ledger); mutate(forged); assert.throws(() => validateGettysburgV32MigrationLedger(forged)); }
  for (const path of ['src/App.jsx', '../package.json', '', null]) assert.throws(() => v32BeforeFile(path));
});
test('all40 old queries and47648 pose witnesses remain exact on current selectors', () => {
  assert.equal(fixture.queryRows.length, 40); assert.equal(fixture.queryRows.reduce((sum, row) => sum + row.poseRows, 0), 47648);
  for (const row of fixture.queryRows) {
    const prepared = prepare(row.query, prior.textures);
    assert.deepEqual(modules.gettysburgInfantryClipPolicy('gettysburg', row.query), row.policy);
    assert.deepEqual(modules.gettysburgInfantryClipAssets('gettysburg', row.query), row.assets);
    assert.equal(prepared.length, row.clips); assert.equal(hash(prepared), row.clipsSHA256);
    const poses = prepared.flatMap(clip => [0, 1, 2, 3].flatMap(frame => [{}, { paused: true }, { reducedMotion: true }, { resolving: true }].map(flags =>
      modules.gettysburgInfantryClipPose('v32-authentic-v31', { id: 17, direction: clip.direction, action: clip.action === 'march' ? 'walk' : clip.action,
        frame, fallen: clip.action === 'fall', scale: 1.37 }, 999,
      { scenarioId: 'gettysburg', search: row.query, side: clip.side, identity: clip.identity, versionedIdentity: true,
        clips: prepared, shootingAge: .08, reloadProgress: .7, ...flags }))));
    assert.equal(poses.length, row.poseRows); assert.equal(hash(poses), row.posesSHA256, row.query);
  }
});
test('all288 authentic v31 Scene/body/shadow/volley/checkpoint witnesses still execute exactly on current code', () => {
  assert.equal(fixture.sceneRows.length, 288);
  for (const row of fixture.sceneRows) {
    const value = isolated(prior, row.query, row.side, row.direction, row.state), facts = plain(prior.facts(value.view));
    assert.equal(hash(facts), row.factsSHA256, JSON.stringify(row));
    assert.equal(hash(value.scene.shadows.draws), row.shadowsSHA256); assert.equal(hash(value.scene.smoke.draws), row.smokeSHA256);
    assert.equal(hash(value.scene.checkpoint()), row.checkpointSHA256); assert.equal(facts.soldiers.length, 32);
  }
});
test('v32 adds four exact B addresses atop every v31 profile and keeps shot18, disabled scenarios and strict tokens', () => {
  assert.deepEqual(GETTYSBURG_INFANTRY_UNION_B_CONTACT_CLIPS_IDS, ['gettysburg-v32']);
  for (const [profile, factor] of [['baseline', 1], ['moderate', .86], ['small', .74]]) {
    const old = modules.gettysburgInfantryClipPolicy('gettysburg', query(profile, 'gettysburg-v31'));
    const next = modules.gettysburgInfantryClipPolicy('gettysburg', query(profile));
    assert.deepEqual({ ...next, atlases: next.atlases.slice(0, 74), nativeUnionBContactCasualty: undefined }, { ...old, nativeUnionBContactCasualty: undefined });
    assert.equal(next.infantryPresentationScale, factor); assert.equal(next.shotPresentationId, 'gettysburg-v18');
    assert.ok(Object.isFrozen(next) && Object.isFrozen(next.atlases));
  }
  assert.deepEqual(assets.slice(0, 74), modules.gettysburgInfantryClipAssets('gettysburg', query('baseline', 'gettysburg-v31')));
  assert.deepEqual(added.map(a => a.key).sort(), [1, 5].flatMap(d => ['melee', 'fall'].map(a => contract(d, a).key)).sort());
  for (const profile of ['', 'SMALL', '.74', 'NaN', 'small%20', 'invalid']) assert.equal(modules.gettysburgInfantryClipPolicy('gettysburg', query(profile)).infantryPresentationScale, 1);
  const unavailable = { exists() { assert.fail('Disabled policy accessed textures'); }, get() { assert.fail('Disabled policy accessed atlas data'); } };
  for (const search of ['', '?artPass=permanently-invalid-art-pass', '?artPass=gettysburg-v32-other', '?other=gettysburg-v32', '?artPass=constructor']) {
    assert.equal(modules.gettysburgInfantryClipPolicy('gettysburg', search), null); assert.deepEqual(modules.gettysburgInfantryClipDefinitions('gettysburg', search, unavailable), []);
  }
  for (const scenario of ['shiloh', 'first_manassas', 'gettysburg_jackson', '', null]) assert.deepEqual(modules.gettysburgInfantryClipAssets(scenario, query()), []);
});
for (const direction of [1, 5]) for (const action of ['melee', 'fall']) test(`synthetic B${direction} ${action} metadata rejects wrong address, borrowed approval/marker, missing or duplicated phases`, () => {
  const original = synthetic(direction, action), c = contract(direction, action);
  assert.deepEqual(modules.validateGettysburgInfantryClip(original), []);
  const mutations = [v => v.direction = true, v => v.direction = direction === 1 ? 5 : 1, v => v.identity = 'a',
    v => v.side = 'confederate', v => v.action = 'march', v => v.key = c.key.replace('v32', 'v31'),
    v => delete v[c.marker], v => v[c.marker] = c.sequence.replace('v32', 'v31'),
    v => v.nativeReloadSequence = 'borrowed', v => v.nativeUnionNorthernSequence = 'borrowed', v => v.nativeUnionNortheastSequence = 'borrowed',
    v => v[action === 'melee' ? 'nativeCasualtySequence' : 'nativeContactSequence'] = 'borrowed',
    v => v.frames.reverse(), v => v.frames[1] = v.frames[0], v => delete v.frames[1], v => v.frames.pop(),
    v => v.frames[0] = `a-${action}-${direction}-0`, v => v.sourceHash = 'A'.repeat(64), v => v.sourceHash = true,
    v => v.referenceHeight = true, v => v.referenceHeight = Infinity, v => v.pivots[0].x = true, v => v.pivots[0].y = -1,
    v => delete v.pivots[1], v => v.approval.reviewed = 1, v => v.approval.rejected = true, v => v.muzzles = [{ x: .5, y: .5 }]];
  for (const mutate of mutations) {
    const forged = plain(original); mutate(forged);
    assert.ok(modules.validateGettysburgInfantryClip(forged).length); assert.deepEqual(modules.prepareGettysburgInfantryClips([forged], () => true), []);
  }
});
test('synthetic prepared clips require explicit v32 capability and stable B; no A substitution, mirror or invented bearing', () => {
  const formationId = 'v32-stable', id = stableId(formationId, 'b'), a = stableId(formationId, 'a');
  for (const direction of [1, 5]) for (const action of ['melee', 'fall']) {
    const prepared = modules.prepareGettysburgInfantryClips([synthetic(direction, action)], () => true);
    const figure = { id, direction, action, frame: 2, fallen: action === 'fall' };
    const options = { scenarioId: 'gettysburg', search: query(), side: 'union', clips: prepared, versionedIdentity: true, identity: 'a' };
    assert.equal(modules.gettysburgInfantryClipPose(formationId, figure, 0, options).identity, 'b');
    for (const search of [query('baseline', 'gettysburg-v31'), '']) assert.equal(modules.gettysburgInfantryClipPose(formationId, figure, 0, { ...options, search }), null);
    for (const patch of [{ id: a }, { direction: 3 }, { direction: 7 }, { fallen: action !== 'fall' }]) assert.equal(modules.gettysburgInfantryClipPose(formationId, { ...figure, ...patch }, 0, options), null);
    assert.equal(modules.gettysburgInfantryClipPose(formationId, figure, 0, { ...options, side: 'confederate' }), null);
  }
});
test('four real whole sources retain16 native cells, source/review hashes, independent casualty roots and fresh per-bearing contact medians', () => {
  requireNative(); const config = JSON.parse(readFileSync(file('docs/art-pass/manifests/gettysburg-v32-source-annotations.json')));
  const reviewRaw = readFileSync(file(config.sourceReview)), review = JSON.parse(reviewRaw);
  assert.equal(sha(reviewRaw), config.sourceReviewSHA256); assert.equal(review.sourceOnly, true); assert.equal(review.localInstall, false);
  assert.deepEqual(review.pairScaleAccepted, { se: true, nw: true });
  assert.equal(review.reviewerModel, 'gpt-6-astra'); assert.equal(review.reasoningEffort, 'max');
  for (const object of [config, review]) for (const flag of ['familyComplete', 'productionApproved', 'defaultApproved', 'humanCertified', 'physicalAnatomyCertified', 'historicalDrillCertified']) assert.equal(object[flag], false);
  assert.equal(config.sources.length, 4); assert.equal(new Set(config.sources.map(s => s.sha256)).size, 4);
  assert.deepEqual(Object.keys(config.referenceHeights).sort(), ['nw', 'se']);
  for (const record of config.sources) {
    assert.equal(record.side, 'union'); assert.equal(record.identity, 'b'); assert.ok([1, 5].includes(record.direction));
    const action = record.role === 'contact' ? 'melee' : 'fall', c = contract(record.direction, action);
    assert.equal(record.cardinal, c.cardinal);
    const asset = added.find(a => a.key === c.key), atlas = native.atlases.get(c.key), clip = clips.find(v => v.key === c.key);
    const png = readFileSync(file(`public/${asset.image}`)); assert.deepEqual(png, readFileSync(file(record.source))); assert.equal(sha(png), record.sha256);
    assert.equal(png.readUInt32BE(16), record.cell * 2); assert.equal(png.readUInt32BE(20), record.cell * 2); assert.equal(png[25], 6, 'Whole source remains RGBA');
    assert.equal(atlas.meta.sha256, record.sha256); assert.equal(atlas.meta.sourceReviewSHA256, config.sourceReviewSHA256);
    assert.equal(atlas.meta.clips.length, 1); assert.equal(clip[c.marker], c.sequence); assert.equal(clip.referenceHeight, config.referenceHeights[c.cardinal]);
    assert.equal(record.referenceHeight, config.referenceHeights[c.cardinal]);
    for (let phase = 0; phase < 4; phase++) {
      const name = `b-${action}-${record.direction}-${phase}`, frame = atlas.frames[name]; assert.equal(clip.frames[phase], name);
      assert.deepEqual(frame.frame, { x: phase % 2 * record.cell, y: Math.floor(phase / 2) * record.cell, w: record.cell, h: record.cell });
      assert.equal(frame.rotated, false); assert.equal(frame.trimmed, false);
      assert.deepEqual(frame.spriteSourceSize, { x: 0, y: 0, w: record.cell, h: record.cell }); assert.deepEqual(frame.sourceSize, { w: record.cell, h: record.cell });
      assert.deepEqual(frame.pivot, { x: Math.round(record.roots[phase][0] / record.cell * 1e6) / 1e6, y: Math.round(record.roots[phase][1] / record.cell * 1e6) / 1e6 });
    }
    const measurement = JSON.parse(readFileSync(file(`docs/art-pass/reviews/gettysburg-v32-union-b-${record.role}-${c.cardinal}-measurement.json`)));
    assert.equal(measurement.sourceSHA256, record.sha256); assert.equal(measurement.sourceReviewSHA256, config.sourceReviewSHA256);
    assert.equal(measurement.referenceHeight, config.referenceHeights[c.cardinal]); assert.equal(measurement.nativePixelChanges, false); assert.equal(measurement.phaseScaleNormalization, false);
    assert.equal(measurement.cells.length, 4);
    for (const cell of measurement.cells) {
      assert.ok(Math.min(...cell.solidPadding) >= 16); assert.deepEqual(cell.ground, record.roots[cell.cell]);
      assert.deepEqual(cell.groundROI, record.groundROIs[cell.cell]); assert.equal(cell.groundMethod, record.groundMethods[cell.cell]);
      if (record.role === 'contact') {
        assert.equal(cell.capTop, record.capTop[cell.cell]); assert.equal(cell.referenceSoleGroundY, record.referenceSoleGroundY[cell.cell]);
        assert.equal(cell.bodySpan, record.bodySpans[cell.cell]); assert.equal(cell.bodySpan, cell.referenceSoleGroundY - cell.capTop);
      }
    }
    if (record.role === 'contact') { const spans = [...record.bodySpans].sort((a, b) => a - b); assert.equal(config.referenceHeights[c.cardinal], Math.floor((spans[1] + spans[2] + 1) / 2)); }
  }
});
test('real B phase selection keeps stable identities and frozen/reduced semantics while all other addresses are exact v31', () => {
  requireNative(); const old = prepare(query('baseline', 'gettysburg-v31'));
  assert.deepEqual(clips.filter(v => !v.key.includes('gettysburg-v32')), old);
  const formationId = 'v32-real-phase', id = stableId(formationId, 'b');
  for (const direction of [1, 5]) for (const action of ['melee', 'fall']) for (const frame of [-1, 0, 1, 2, 3, 4, 99]) {
    const figure = { id, direction, action, frame, fallen: action === 'fall' }, options = { scenarioId: 'gettysburg', search: query(), side: 'union', clips, versionedIdentity: true };
    const actual = modules.gettysburgInfantryClipPose(formationId, figure, 9, options);
    assert.equal(actual.key, contract(direction, action).key); assert.equal(actual.phase, action === 'fall' ? Math.min(3, Math.max(0, frame)) : ((frame % 4) + 4) % 4);
    assert.equal(actual.angle, 0); assert.equal(actual.flip, false); assert.equal(actual.offsetX, 0); assert.equal(actual.offsetY, 0);
    assert.equal(modules.gettysburgInfantryClipPose(formationId, figure, 9, { ...options, reducedMotion: true }).phase, action === 'fall' ? 3 : 0);
    assert.deepEqual(modules.gettysburgInfantryClipPose(formationId, figure, 9, { ...options, paused: true, resolving: true }), actual);
  }
  for (const clip of old) for (const frame of [0, 1, 2, 3, 7]) {
    const figure = { id: 17, direction: clip.direction, action: clip.action === 'march' ? 'walk' : clip.action, frame, fallen: clip.action === 'fall' };
    const options = { scenarioId: 'gettysburg', side: clip.side, identity: clip.identity, shootingAge: .08, reloadProgress: .8 };
    assert.deepEqual(modules.gettysburgInfantryClipPose('v32-retained', figure, 9, { ...options, search: query(), clips }),
      modules.gettysburgInfantryClipPose('v32-retained', figure, 9, { ...options, search: query('baseline', 'gettysburg-v31'), clips: old }));
  }
});
for (const direction of [1, 5]) for (const action of ['melee', 'fall']) test(`real B${direction} ${action} withholds the whole action for each missing phase or duplicate definition`, () => {
  requireNative(); const clip = clips.find(v => v.key === contract(direction, action).key);
  for (const frame of clip.frames) {
    const damaged = modules.gettysburgClipTestTextures(native.atlases); damaged.get(clip.key).frames.delete(frame);
    const prepared = prepare(query(), damaged); assert.equal(prepared.length, 125); assert.equal(prepared.some(v => v.key === clip.key), false);
    assert.equal(prepared.some(v => v.key === contract(direction, action === 'melee' ? 'fall' : 'melee').key), true);
  }
  const formationId = 'v32-duplicate', id = stableId(formationId, 'b');
  assert.equal(modules.gettysburgInfantryClipPose(formationId, { id, direction, action, frame: 1, fallen: action === 'fall' }, 0,
    { scenarioId: 'gettysburg', search: query(), side: 'union', versionedIdentity: true, clips: [...clips, clip] }), null);
});

function assertB(value, action, factor) {
  const view = value.scene.views.get(value.union.id); assert.equal(view.soldiers.length, 32); let nativeB = 0, retainedA = 0;
  const clip = clips.find(v => v.key === contract(value.direction, action).key);
  for (const figure of view.visual.output.figures.filter(f => f.visible && f.action === action)) {
    const soldier = view.soldiers[figure.id], sprite = soldier.sprite;
    assert.equal(figure.direction, value.direction);
    if (modules.gettysburgInfantryIdentity(value.union.id, figure.id) === 'a') { assert.ok(!sprite.textureKey.includes('v32')); retainedA++; continue; }
    assert.equal(sprite.textureKey, clip.key); assert.equal(sprite.frameName, clip.frames[soldier.clipPhase]); assert.deepEqual(sprite.origin, clip.pivots[soldier.clipPhase]);
    assert.equal(sprite.x, figure.x); assert.equal(sprite.y, figure.y); assert.equal(sprite.angle, 0); assert.equal(sprite.flipX, false);
    const individual = .95 + modules.deterministicUnitValue(value.union.id, figure.id, 215) * .10;
    close(sprite.scaleX, 58 * figure.scale * individual / clip.referenceHeight * factor); close(sprite.scaleY, sprite.scaleX); nativeB++;
  }
  assert.ok(nativeB > 0 && retainedA > 0); return { nativeB, retainedA };
}
function comparePhysical(next, old) {
  assert.deepEqual(plain(next.scene.engine.checkpoint()), plain(old.scene.engine.checkpoint()));
  assert.deepEqual(plain(next.scene.shadows.draws), plain(old.scene.shadows.draws));
  assert.deepEqual(plain(next.scene.smoke.draws), plain(old.scene.smoke.draws));
  for (const id of next.ids) {
    const view = next.scene.views.get(id), previous = old.scene.views.get(id);
    assert.deepEqual(plain(view.visual), plain(previous.visual)); assert.deepEqual(view.footprint, previous.footprint);
    for (const figure of view.visual.output.figures.filter(f => f.visible)) {
      if (id !== next.union.id || modules.gettysburgInfantryIdentity(id, figure.id) === 'a') {
        assert.deepEqual(plain(native.facts(view).soldiers[figure.id]), plain(native.facts(previous).soldiers[figure.id]));
      }
    }
  }
}
for (const [profile, factor] of [['baseline', 1], ['moderate', .86], ['small', .74]]) test(`${profile} B contact/all grounded fall phases preserve32slots, A bodies, physical feet/shadows/combat, pause and ordinary first cold draw`, () => {
  requireNative();
  for (const direction of [1, 5]) for (const fall of [false, true]) {
    const next = syntheticPair(native, profile, 'gettysburg-v32', fall, direction), old = syntheticPair(native, profile, 'gettysburg-v31', fall, direction);
    const action = fall ? 'fall' : 'melee';
    for (const age of [0, .18, .36, .55, 2.5]) {
      next.scene.engine.time = old.scene.engine.time = 7.08 + age; const combat = plain(next.scene.engine.checkpoint());
      drawPair(next); drawPair(old); assert.deepEqual(plain(next.scene.engine.checkpoint()), combat); assertB(next, action, factor); comparePhysical(next, old);
      next.scene.speed = 0; const saved = plain(next.scene.checkpoint()), frozen = pairFacts(native, next), cold = coldPair(native, saved, next);
      drawPair(next); assert.deepEqual(pairFacts(native, next), frozen); drawPair(cold); assert.deepEqual(pairFacts(native, cold), frozen);
      assert.deepEqual(plain(cold.scene.engine.checkpoint()), combat); assert.deepEqual(plain(cold.scene.checkpoint()).presentation, saved.presentation); next.scene.speed = 1;
    }
  }
});
test('actual simultaneous resolver losses select all eight B casualty phases without draw feedback; reduced/resolution keep grounded rest', () => {
  requireNative();
  for (const direction of [1, 5]) {
    const value = syntheticPair(native, 'baseline', 'gettysburg-v32', false, direction), seen = new Set();
    assert.equal(closeCombatPairs(value.scene.engine).length, 1, 'the final diagonal is inside actual resolver contact range');
    for (let step = 0; step < 400; step++) {
      value.scene.engine.time += .05; resolveContactCombat(value.scene.engine, .05); const combat = plain(value.scene.engine.checkpoint()); drawPair(value);
      assert.deepEqual(plain(value.scene.engine.checkpoint()), combat);
      for (const soldier of value.scene.views.get(value.union.id).soldiers) if (soldier.sprite.visible && soldier.sprite.textureKey === contract(direction, 'fall').key) seen.add(soldier.clipPhase);
    }
    assert.deepEqual([...seen].sort(), [0, 1, 2, 3]); assert.ok(value.union.strength < 3000 && value.confederate.strength < 3000);
    for (const fall of [false, true]) {
      const reduced = syntheticPair(native, 'small', 'gettysburg-v32', fall, direction); reduced.scene.reducedMotion = true; drawPair(reduced);
      for (const soldier of reduced.scene.views.get(reduced.union.id).soldiers) if (soldier.sprite.visible && soldier.sprite.textureKey.includes('v32')) assert.equal(soldier.clipPhase, fall ? 3 : 0);
      const cold = coldPair(native, plain(reduced.scene.checkpoint()), reduced); cold.scene.reducedMotion = true; drawPair(cold);
      assert.deepEqual(pairFacts(native, cold), pairFacts(native, reduced));
    }
    const fallen = syntheticPair(native, 'moderate', 'gettysburg-v32', true, direction); fallen.scene.engine.beginResolution('defeat');
    for (const [age, phase] of [[.2, 1], [.4, 2], [.7, 3], [2.5, 3]]) {
      fallen.scene.engine.resolutionTime = age; drawPair(fallen, true); assertB(fallen, 'fall', .86);
      for (const soldier of fallen.scene.views.get(fallen.union.id).soldiers) if (soldier.sprite.visible && soldier.sprite.textureKey === contract(direction, 'fall').key) assert.equal(soldier.clipPhase, phase);
    }
  }
});
test('all native/fallback firing directions, shot18 schema and cached world muzzles remain exact through profiles and cold restore', () => {
  requireNative(); let nativeMuzzles = 0, fallbackMuzzles = 0;
  const missing = { exists: key => !key.includes('-gettysburg-') && native.renderingTextures.exists(key), get: key => native.renderingTextures.get(key) };
  for (const profile of ['baseline', 'moderate', 'small']) for (const side of ['union', 'confederate']) for (let direction = 0; direction < 8; direction++) for (const loaded of [undefined, missing]) {
    const next = isolated(native, query(profile), side, direction, 'fire', loaded), old = isolated(native, query(profile, 'gettysburg-v31'), side, direction, 'fire', loaded);
    assert.deepEqual(plain(native.facts(next.view)), plain(native.facts(old.view)));
    for (const shot of next.view.shots.figures) { if (shot.native) nativeMuzzles++; else fallbackMuzzles++; }
    const saved = plain(next.scene.checkpoint()); assert.equal(saved.presentation.shots.artPass, 'gettysburg-v18');
    const cached = next.view.shots; native.windowState.location.search = query(profile === 'small' ? 'moderate' : 'small'); next.draw(); assert.equal(next.view.shots, cached);
    const cold = isolated(native, query(profile), side, direction, 'fire', loaded, saved); assert.deepEqual(plain(cold.view.shots), plain(cached));
    assert.deepEqual(plain(cold.scene.engine.checkpoint()), plain(next.scene.engine.checkpoint()));
  }
  assert.ok(nativeMuzzles > 0 && fallbackMuzzles > 0);
});
test('every missing phase restores exact stable B fallback at each profile and keeps A/opposing accepted bodies', () => {
  requireNative();
  for (const profile of ['baseline', 'moderate', 'small']) for (const direction of [1, 5]) for (const action of ['melee', 'fall']) {
    const clip = clips.find(v => v.key === contract(direction, action).key);
    for (const frame of clip.frames) {
      const next = syntheticPair(native, profile, 'gettysburg-v32', action === 'fall', direction), old = syntheticPair(native, profile, 'gettysburg-v31', action === 'fall', direction);
      const damaged = modules.gettysburgClipTestTextures(native.atlases); damaged.get(clip.key).frames.delete(frame); next.scene.infantryClips = prepare(next.search, damaged);
      for (const elapsed of [0, .2, .4, .6]) {
        next.scene.engine.time = old.scene.engine.time = 7.08 + elapsed; drawPair(next); drawPair(old); comparePhysical(next, old);
        const view = next.scene.views.get(next.union.id), previous = old.scene.views.get(old.union.id);
        for (const figure of view.visual.output.figures.filter(f => f.visible && f.action === action)) if (modules.gettysburgInfantryIdentity(next.union.id, figure.id) === 'b') {
          assert.equal(view.soldiers[figure.id].clipPhase, undefined); assert.deepEqual(plain(native.facts(view).soldiers[figure.id]), plain(native.facts(previous).soldiers[figure.id]));
        }
      }
    }
  }
});
test('pre-first-draw re-save preserves all32 fallen bodies and the exact inherited surviving walk-phase edge versus v31', () => {
  requireNative();
  for (const direction of [1, 5]) {
    const changes = [];
    for (const pass of ['gettysburg-v31', 'gettysburg-v32']) {
      const value = syntheticPair(native, 'moderate', pass, true, direction); value.scene.engine.time = 9.58; drawPair(value);
      const saved = plain(value.scene.checkpoint()), frozen = pairFacts(native, value), cold = coldPair(native, saved, value);
      assert.deepEqual(plain(cold.scene.checkpoint()).presentation, saved.presentation); drawPair(cold);
      const actual = pairFacts(native, cold), changed = []; let fallen = 0;
      for (let army = 0; army < 2; army++) for (let id = 0; id < 32; id++) {
        const figure = value.scene.views.get(value.ids[army]).visual.output.figures[id];
        if (figure.fallen) { assert.deepEqual(actual[army].soldiers[id], frozen[army].soldiers[id]); fallen++; }
        else if (hash(actual[army].soldiers[id]) !== hash(frozen[army].soldiers[id])) { assert.equal(figure.action, 'walk'); changed.push({ army, id, before: frozen[army].soldiers[id], after: actual[army].soldiers[id] }); }
      }
      assert.equal(fallen, 32); changes.push(changed); assert.deepEqual(plain(cold.scene.engine.checkpoint()), plain(value.scene.engine.checkpoint()));
      const ordinary = coldPair(native, saved, value); drawPair(ordinary); assert.deepEqual(pairFacts(native, ordinary), frozen);
    }
    assert.deepEqual(changes[1], changes[0]);
  }
});
test('rank losses/reformation retain A/B identity and all six other B bearings remain exact v31 bodies', () => {
  requireNative();
  for (const direction of [1, 5]) {
    const next = syntheticPair(native, 'baseline', 'gettysburg-v32', false, direction), old = syntheticPair(native, 'baseline', 'gettysburg-v31', false, direction);
    const identities = next.scene.views.get(next.union.id).visual.figures.map(f => modules.gettysburgInfantryIdentity(next.union.id, f.id));
    for (const value of [next, old]) { value.union.strength *= .7; value.union.formationMode = 'column'; value.scene.engine.time += .2; drawPair(value); }
    assert.deepEqual(next.scene.views.get(next.union.id).visual.figures.map(f => modules.gettysburgInfantryIdentity(next.union.id, f.id)), identities); assertB(next, 'melee', 1); comparePhysical(next, old);
  }
  for (const direction of [0, 2, 3, 4, 6, 7]) for (const state of ['ready', 'fire', 'reload', 'walk', 'melee', 'fall']) {
    const next = isolated(native, query(), 'union', direction, state), old = isolated(native, query('baseline', 'gettysburg-v31'), 'union', direction, state);
    assert.deepEqual(plain(native.facts(next.view)), plain(native.facts(old.view))); assert.deepEqual(plain(next.scene.checkpoint()), plain(old.scene.checkpoint()));
  }
});
for (const direction of [5, 1]) test(`real current public Scene Move/Assault from untouched roster reaches Union${direction} B contact/fall, both losses and cold saved rest`, () => {
  requireNative(); const value = publicPair(native, query('moderate'), direction), old = publicPair(native, query('moderate', 'gettysburg-v31'), direction);
  const strength = [value.confederate.strength, value.union.strength];
  const destinations = direction === 5 ? [{ x: 150, y: 600 }, { x: 150, y: 150 }, { x: 350, y: 230 }] : [{ x: 650, y: 600 }];
  for (const destination of destinations) {
    for (const pair of [value, old]) { pair.scene.setSpeed(0); pair.scene.previewDestination(destination); pair.scene.confirmMove(); assert.equal(pair.confederate.pendingCommand.order, 'move'); pair.scene.setSpeed(1); }
    for (let step = 0; step < 3000 && Math.hypot(value.confederate.x - destination.x, value.confederate.y - destination.y) >= 3; step++) {
      for (const pair of [value, old]) { pair.scene.engine.tick(.05); drawPair(pair); }
    }
    assert.ok(Math.hypot(value.confederate.x - destination.x, value.confederate.y - destination.y) < 3);
  }
  for (const pair of [value, old]) { pair.scene.issueOrder('assault', { sectorId: 'left' }); assert.equal(pair.confederate.pendingCommand.order, 'assault'); }
  let contactAt; const seen = new Map(['melee', 'fall'].map(action => [contract(direction, action).key, new Set()]));
  for (let step = 0; step < 1500; step++) {
    for (const pair of [value, old]) { pair.scene.engine.tick(.05); const combat = plain(pair.scene.engine.checkpoint()); drawPair(pair); assert.deepEqual(plain(pair.scene.engine.checkpoint()), combat); }
    assert.deepEqual(plain(value.scene.engine.checkpoint()), plain(old.scene.engine.checkpoint()));
    if (!contactAt && value.confederate.inMelee && value.confederate.meleeWith === value.union.id) { assert.equal(value.union.inMelee, true); contactAt = value.scene.engine.time; }
    if (!contactAt) continue;
    const view = value.scene.views.get(value.union.id);
    for (const figure of view.visual.output.figures.filter(f => f.visible && ['melee', 'fall'].includes(f.action))) {
      const soldier = view.soldiers[figure.id];
      if (figure.action === 'melee') assert.equal(figure.direction, direction);
      if (seen.has(soldier.sprite.textureKey)) { assert.equal(modules.gettysburgInfantryIdentity(value.union.id, figure.id), 'b'); seen.get(soldier.sprite.textureKey).add(soldier.clipPhase); }
    }
    if (value.scene.engine.time - contactAt >= 20) break;
  }
  assert.ok(contactAt > 0 && contactAt < 80); assert.ok(value.confederate.strength < strength[0] && value.union.strength < strength[1]);
  for (const [key, phases] of seen) assert.deepEqual([...phases].sort(), [0, 1, 2, 3], key);
  value.scene.setSpeed(0); const saved = plain(value.scene.checkpoint()), frozen = pairFacts(native, value), cold = coldPair(native, saved, value); drawPair(cold);
  assert.deepEqual(visibleFacts(pairFacts(native, cold)), visibleFacts(frozen)); assert.deepEqual(plain(cold.scene.engine.checkpoint()), plain(value.scene.engine.checkpoint()));
  assert.deepEqual(plain(cold.scene.checkpoint()).presentation, saved.presentation);
});
