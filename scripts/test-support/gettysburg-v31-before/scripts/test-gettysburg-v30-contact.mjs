import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { regressionModules, regressionHarness } from './test-support/gettysburgV30Regression.mjs';
import { closeCombatDistance, resolveContactCombat } from '../src/battle/closeCombat.js';
import { GETTYSBURG_INFANTRY_SOUTHEAST_NORTHWEST_CONTACT_CLIPS_IDS } from '../src/battle/gettysburgInfantrySoutheastNorthwestContactClips.js';
import { assertHistoricalCheckpointRepairFile } from './test-support/checkpointRepairPreservation.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const file = path => `${ROOT}/${path}`;
const sha = raw => createHash('sha256').update(raw).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
const hashJSON = value => sha(JSON.stringify(plain(value)));
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} differs from ${b}`);
const fixture = JSON.parse(readFileSync(file('scripts/fixtures/gettysburg-v30-preservation.json')));
const modules = await regressionModules(ROOT);
const source = readFileSync(file('src/battle/CivilWarBattlefield.jsx'), 'utf8');
// Every behavior comparison below executes current modules and the current
// Scene directly. Archived modules are evidence bytes, never substituted.
const legacy = regressionHarness(ROOT, modules, source);
const query = (profile = 'baseline', pass = 'gettysburg-v30') => `?artPass=${pass}&infantryScale=${profile}`;
const assets = modules.gettysburgInfantryClipAssets('gettysburg', query());
const added = assets.filter(asset => asset.key.includes('gettysburg-v30'));
const exported = added.length === 4 && added.every(asset => existsSync(file(`public/${asset.json}`)));
const native = exported ? regressionHarness(ROOT, modules, source, query()) : legacy;
const prepare = (harness = native, search = query(), loaded = harness.textures) => modules.prepareGettysburgInfantryClips(
  modules.gettysburgInfantryClipDefinitions('gettysburg', search, loaded),
  (key, frame) => loaded.exists(key) && loaded.get(key).has(frame));
const clips = prepare();
const direction = side => side === 'union' ? 1 : 5;
const contract = (side, action) => {
  const bearing = side === 'union' ? 'se' : 'nw', role = action === 'melee' ? 'contact' : 'casualty';
  return { key: `${side}-gettysburg-v30-a-${role}-${bearing}`,
    marker: action === 'melee' ? 'nativeContactSequence' : 'nativeCasualtySequence',
    sequence: `gettysburg-v30-${side}-a-${bearing}-${role}` };
};
const synthetic = (side, action) => ({ side, identity: 'a', direction: direction(side), action,
  key: contract(side, action).key, [contract(side, action).marker]: contract(side, action).sequence,
  frames: Array.from({ length: 4 }, (_, phase) => `a-${action}-${direction(side)}-${phase}`),
  pivots: Array.from({ length: 4 }, () => ({ x: .5, y: .9 })), referenceHeight: 350,
  sourceHash: 'a'.repeat(64), approval: { reviewed: true, rejected: false } });
function requireComplete() { assert.equal(assets.length, 70); assert.equal(clips.length, 118); assert.equal(added.length, 4); assert.equal(exported, true); }
function run(harness, search, side, bearing, state = 'fire', loaded, checkpoint) {
  const value = harness.make(search, side, bearing, loaded, checkpoint); value.scene.speed = 1;
  if (!checkpoint) {
    if (state === 'ready') Object.assign(value.unit, { lastVolleyAt: 0, reload: 0, status: 'idle' });
    if (state === 'reload') Object.assign(value.unit, { lastVolleyAt: 5, reload: 6, status: 'firing' });
    if (state === 'melee') Object.assign(value.unit, { lastVolleyAt: 0, reload: 0, inMelee: true, status: 'fighting' });
    if (state === 'walk') Object.assign(value.unit, { lastVolleyAt: 0, reload: 0, status: 'moving', destination: { x: value.unit.x + 100, y: value.unit.y } });
    if (state === 'fall') { value.draw(); value.unit.strength *= .5; }
  }
  value.view = value.draw(); return value;
}

test('authentic installed-v29 baseline, all1426 protected files and the one-token future-negative migration remain exact', () => {
  assert.equal(fixture.schema, 'gettysburg-v30-authentic-installed-v29-baseline-v1');
  assert.equal(fixture.capturedFrom, '/Users/titansforge/Vault/Titans_of_War');
  assert.equal(fixture.baselineFiles, 1430); assert.equal(fixture.sourceFiles.length, 5);
  assert.equal(fixture.protectedFiles.length, 1426);
  assert.equal(sha(readFileSync(file('scripts/fixtures/gettysburg-v30-preservation.json'))), 'e637d09ccf13e0cb2ff48376a0462e102d42589135e9a8f417bf183ff0467355');
  for (const record of fixture.sourceFiles) assert.equal(sha(readFileSync(file(record.archive))), record.sha256, record.path);
  for (const record of fixture.protectedFiles) {
    // Preserve the authentic lock SHA in the fixture. Root's separately
    // declared version migration is checked structurally in the next test.
    if (record.path === 'package-lock.json') continue;
    assertHistoricalCheckpointRepairFile(record);
  }
  const migration = fixture.migration, record = fixture.sourceFiles.find(row => row.path === migration.path);
  const before = readFileSync(file(record.archive), 'utf8');
  assert.equal(before.split(migration.beforeToken).length - 1, 1);
  assert.equal(readFileSync(file(migration.path), 'utf8'), before.replace(migration.beforeToken, migration.afterToken));
  assert.equal(modules.gettysburgInfantryClipPolicy('gettysburg', migration.afterToken), null);
});

test('separate authentic metadata supplement permits only declared package versions and exact mandatory gate additions', () => {
  const metadata = JSON.parse(readFileSync(file('scripts/fixtures/gettysburg-v30-metadata-preservation.json')));
  assert.equal(metadata.baselineSHA256, fixture.baselineSHA256); assert.equal(metadata.sourceFiles.length, 2);
  assert.equal(metadata.oldFixturesRefreshed, false); assert.equal(metadata.oldMigrationLedgerEdited, false);
  for (const record of metadata.sourceFiles) {
    const original = readFileSync(file(record.archive)); assert.equal(sha(original), record.sha256);
    const before = JSON.parse(original), current = JSON.parse(readFileSync(file(record.path)));
    assert.equal(before.version, '0.30.0'); assert.equal(current.version, '0.31.0');
    if (record.path === 'package-lock.json') {
      assert.equal(record.sha256, fixture.protectedFiles.find(value => value.path === record.path).sha256);
      assert.equal(before.packages[''].version, '0.30.0'); assert.equal(current.packages[''].version, '0.31.0');
      current.version = before.version; current.packages[''].version = before.packages[''].version;
      assert.deepEqual(current, before, 'No dependency or lockfile content changed');
    } else {
      const old = before.scripts, next = current.scripts;
      assert.equal(next['test:gettysburg-v30'], 'node --test --test-reporter=spec scripts/test-gettysburg-v30-contact.mjs');
      assert.equal(next['test:gettysburg-art-current'], old['test:gettysburg-art-current'] + ' scripts/test-gettysburg-v30-contact.mjs');
      assert.equal(next['validate:gettysburg-native'], old['validate:gettysburg-native'] + ' && python3 scripts/author-gettysburg-v30-clips.py --check --self-test');
      assert.ok([old.test + ' && npm run test:gettysburg-v30', old.test + ' && npm run test:gettysburg-v29 && npm run test:gettysburg-v30'].includes(next.test));
      for (const key of Object.keys(next)) if (key !== 'test:gettysburg-v30') assert.ok(Object.hasOwn(old, key), key);
      current.version = before.version; current.scripts = before.scripts;
      assert.deepEqual(current, before, 'No other package metadata changed');
      for (const key of Object.keys(old)) if (!['test', 'test:gettysburg-art-current', 'validate:gettysburg-native'].includes(key)) assert.equal(next[key], old[key], key);
    }
  }
});

test('all32 authentic old queries and32288 pose witnesses execute against current selectors unchanged', () => {
  assert.equal(fixture.queryRows.length, 32); assert.equal(fixture.queryRows.reduce((sum, row) => sum + row.poseRows, 0), 32288);
  for (const row of fixture.queryRows) {
    const prepared = prepare(legacy, row.query);
    assert.deepEqual(modules.gettysburgInfantryClipPolicy('gettysburg', row.query), row.policy);
    assert.deepEqual(modules.gettysburgInfantryClipAssets('gettysburg', row.query), row.assets);
    assert.equal(prepared.length, row.clips); assert.equal(hashJSON(prepared), row.clipsSHA256);
    const poses = prepared.flatMap(clip => [0, 1, 2, 3].flatMap(frame => [{}, { paused: true }, { reducedMotion: true }, { resolving: true }].map(flags =>
      modules.gettysburgInfantryClipPose('v30-authentic-v29', { id: 17, direction: clip.direction,
        action: clip.action === 'march' ? 'walk' : clip.action, frame, fallen: clip.action === 'fall', scale: 1.37 }, 999,
      { scenarioId: 'gettysburg', search: row.query, side: clip.side, identity: clip.identity, versionedIdentity: true,
        clips: prepared, shootingAge: .08, reloadProgress: .7, ...flags }))));
    assert.equal(poses.length, row.poseRows); assert.equal(hashJSON(poses), row.posesSHA256, row.query);
  }
});

test('all288 authentic v29 Scene/body/shadow/smoke/volley/checkpoint witnesses remain exact on current code', () => {
  assert.equal(fixture.sceneRows.length, 288);
  for (const row of fixture.sceneRows) {
    const value = run(legacy, row.query, row.side, row.direction, row.state), facts = plain(legacy.facts(value.view));
    assert.equal(hashJSON(facts), row.factsSHA256, JSON.stringify(row));
    assert.equal(hashJSON(value.scene.shadows.draws), row.shadowsSHA256);
    assert.equal(hashJSON(value.scene.smoke.draws), row.smokeSHA256);
    assert.equal(hashJSON(value.scene.checkpoint()), row.checkpointSHA256);
    assert.equal(facts.soldiers.length, row.figureSlots);
  }
});

test('v30 adds exactly four addresses with v29 profiles, unchanged shot18 identity and strict invalid/scenario defaults', () => {
  assert.deepEqual(GETTYSBURG_INFANTRY_SOUTHEAST_NORTHWEST_CONTACT_CLIPS_IDS, ['gettysburg-v30']);
  for (const [profile, factor] of [['baseline', 1], ['moderate', .86], ['small', .74]]) {
    const old = modules.gettysburgInfantryClipPolicy('gettysburg', query(profile, 'gettysburg-v29'));
    const next = modules.gettysburgInfantryClipPolicy('gettysburg', query(profile));
    assert.deepEqual({ ...next, atlases: next.atlases.slice(0, 66), nativeSoutheastNorthwestContactCasualty: undefined }, { ...old, nativeSoutheastNorthwestContactCasualty: undefined });
    assert.equal(next.infantryPresentationScale, factor); assert.equal(next.infantryScaleProfile, profile); assert.equal(next.shotPresentationId, 'gettysburg-v18');
    assert.ok(Object.isFrozen(next) && Object.isFrozen(next.atlases));
  }
  assert.deepEqual(assets.slice(0, 66), modules.gettysburgInfantryClipAssets('gettysburg', query('baseline', 'gettysburg-v29')));
  for (const profile of ['', 'SMALL', '.74', '0.74', 'NaN', 'Infinity', 'small%20', 'invalid']) {
    const policy = modules.gettysburgInfantryClipPolicy('gettysburg', query(profile));
    assert.equal(policy.infantryScaleProfile, 'baseline'); assert.equal(policy.infantryPresentationScale, 1);
  }
  const unavailable = { exists() { assert.fail('Disabled selector read textures'); }, get() { assert.fail('Disabled selector read atlas metadata'); } };
  for (const search of ['', '?artPass=permanently-invalid-art-pass', '?artPass=gettysburg-v30-other', '?other=gettysburg-v30', '?artPass=constructor', '?artPass=__proto__']) {
    assert.equal(modules.gettysburgInfantryClipPolicy('gettysburg', search), null);
    assert.deepEqual(modules.gettysburgInfantryClipDefinitions('gettysburg', search, unavailable), []);
  }
  for (const scenario of ['shiloh', 'first_manassas', 'gettysburg_jackson', '', null]) {
    assert.equal(modules.gettysburgInfantryClipPolicy(scenario, query('small')), null);
    assert.deepEqual(modules.gettysburgInfantryClipAssets(scenario, query()), []);
  }
});

for (const side of ['union', 'confederate']) for (const action of ['melee', 'fall']) test(`${side} ${action} rejects forged addresses, borrowed markers, phases, approval and registrations`, () => {
  const original = synthetic(side, action), c = contract(side, action);
  assert.deepEqual(modules.validateGettysburgInfantryClip(original), []);
  const mutations = [clip => { clip.direction = true; }, clip => { clip.direction = false; },
    clip => { clip.direction = side === 'union' ? 5 : 1; }, clip => { clip.identity = 'b'; },
    clip => { clip.side = [side]; }, clip => { clip.action = [action]; }, clip => { clip.action = 'march'; },
    clip => { clip.key = c.key.replace('v30', 'v26'); }, clip => { delete clip[c.marker]; },
    clip => { clip[c.marker] = c.sequence.replace('v30', 'v26'); },
    clip => { clip.nativeReloadSequence = 'borrowed'; }, clip => { clip.nativeUnionNortheastSequence = 'borrowed'; },
    clip => { clip.nativeUnionNorthernSequence = 'borrowed'; },
    clip => { clip[action === 'melee' ? 'nativeCasualtySequence' : 'nativeContactSequence'] = 'borrowed'; },
    clip => { clip.frames.reverse(); }, clip => { clip.frames[1] = clip.frames[0]; },
    clip => { clip.frames.pop(); clip.pivots.pop(); }, clip => { delete clip.frames[1]; },
    clip => { clip.frames[0] = `b-${action}-${direction(side)}-0`; },
    clip => { clip.sourceHash = 'A'.repeat(64); }, clip => { clip.sourceHash = true; },
    clip => { clip.referenceHeight = true; }, clip => { clip.referenceHeight = Infinity; },
    clip => { clip.pivots[0].x = true; }, clip => { clip.pivots[0].y = -1; },
    clip => { delete clip.pivots[1]; }, clip => { clip.approval.reviewed = 1; },
    clip => { clip.approval.rejected = true; }, clip => { clip.muzzles = [{ x: .5, y: .5 }]; }];
  for (const mutate of mutations) {
    const forged = plain(original); mutate(forged);
    assert.ok(modules.validateGettysburgInfantryClip(forged).length > 0);
    assert.deepEqual(modules.prepareGettysburgInfantryClips([forged], () => true), []);
  }
});

test('four whole source exports retain byte identity, full native16 cells, independent pivots and each army contact median', () => {
  requireComplete();
  const configRaw = readFileSync(file('docs/art-pass/manifests/gettysburg-v30-source-annotations.json'));
  const config = JSON.parse(configRaw), reviewRaw = readFileSync(file(config.sourceReview)), review = JSON.parse(reviewRaw);
  assert.equal(sha(reviewRaw), config.sourceReviewSHA256); assert.equal(review.sourceOnly, true); assert.equal(review.localInstall, false);
  assert.equal(review.reviewerModel, 'gpt-6-astra'); assert.equal(review.reasoningEffort, 'max');
  for (const object of [config, review]) for (const flag of ['familyComplete', 'productionApproved', 'defaultApproved', 'humanCertified', 'physicalAnatomyCertified', 'historicalDrillCertified']) assert.equal(object[flag], false);
  assert.equal(config.sources.length, 4); assert.equal(new Set(config.sources.map(record => record.sha256)).size, 4);
  for (const record of config.sources) {
    const action = record.role === 'contact' ? 'melee' : 'fall', c = contract(record.side, action);
    const asset = added.find(value => value.key === c.key), atlas = native.atlases.get(c.key), clip = clips.find(value => value.key === c.key);
    const png = readFileSync(file(`public/${asset.image}`)), original = readFileSync(file(record.source));
    assert.deepEqual(png, original); assert.equal(sha(png), record.sha256); assert.equal(atlas.meta.sha256, record.sha256);
    assert.equal(atlas.meta.clips.length, 1); assert.equal(clip[c.marker], c.sequence);
    assert.equal(clip.direction, direction(record.side)); assert.equal(clip.referenceHeight, config.referenceHeights[record.side]);
    assert.equal(atlas.meta.sourceReviewSHA256, config.sourceReviewSHA256);
    for (let phase = 0; phase < 4; phase++) {
      const name = `a-${action}-${direction(record.side)}-${phase}`, frame = atlas.frames[name];
      assert.equal(clip.frames[phase], name); assert.deepEqual(frame.frame, { x: phase % 2 * record.cell, y: Math.floor(phase / 2) * record.cell, w: record.cell, h: record.cell });
      assert.equal(frame.rotated, false); assert.equal(frame.trimmed, false);
      assert.deepEqual(frame.spriteSourceSize, { x: 0, y: 0, w: record.cell, h: record.cell });
      assert.deepEqual(frame.sourceSize, { w: record.cell, h: record.cell });
      assert.deepEqual(frame.pivot, { x: Math.round(record.roots[phase][0] / record.cell * 1e6) / 1e6, y: Math.round(record.roots[phase][1] / record.cell * 1e6) / 1e6 });
    }
    const measurement = JSON.parse(readFileSync(file(`docs/art-pass/reviews/gettysburg-v30-${record.side}-${record.role}-measurement.json`)));
    assert.equal(measurement.sourceSHA256, record.sha256); assert.equal(measurement.sourceReviewSHA256, config.sourceReviewSHA256);
    assert.equal(measurement.nativePixelChanges, false); assert.equal(measurement.phaseScaleNormalization, false);
    for (const cell of measurement.cells) assert.ok(Math.min(...cell.solidPadding) >= 16);
    if (record.role === 'contact') { const spans = [...record.bodySpans].sort((a, b) => a - b); assert.equal(config.referenceHeights[record.side], Math.floor((spans[1] + spans[2] + 1) / 2)); }
  }
});

test('new phase selection has exact stable identity, reduced-motion and pause/resolution semantics; all other old addresses remain exact', () => {
  requireComplete(); const prior = prepare(native, query('baseline', 'gettysburg-v29'));
  assert.deepEqual(clips.filter(clip => !clip.key.includes('gettysburg-v30')), prior);
  const formationId = 'v30-phase', idFor = identity => Array.from({ length: 256 }, (_, id) => id).find(id => modules.gettysburgInfantryIdentity(formationId, id) === identity);
  for (const side of ['union', 'confederate']) for (const action of ['melee', 'fall']) for (const frame of [-1, 0, 1, 2, 3, 4, 99]) {
    const figure = { id: idFor('a'), action, fallen: action === 'fall', direction: direction(side), frame };
    const options = { scenarioId: 'gettysburg', search: query(), side, clips, versionedIdentity: true };
    const actual = modules.gettysburgInfantryClipPose(formationId, figure, 9, options);
    assert.equal(actual.phase, action === 'fall' ? Math.min(3, Math.max(0, frame)) : ((frame % 4) + 4) % 4);
    assert.equal(actual.angle, 0); assert.equal(actual.flip, false); assert.equal(actual.offsetX, 0); assert.equal(actual.offsetY, 0);
    assert.equal(modules.gettysburgInfantryClipPose(formationId, figure, 9, { ...options, reducedMotion: true }).phase, action === 'fall' ? 3 : 0);
    assert.deepEqual(modules.gettysburgInfantryClipPose(formationId, figure, 9, { ...options, paused: true, resolving: true }), actual);
    if (side === 'union') assert.equal(modules.gettysburgInfantryClipPose(formationId, { ...figure, id: idFor('b') }, 9, options), null);
    assert.equal(modules.gettysburgInfantryClipPose(formationId, figure, 9, { ...options, search: query('baseline', 'gettysburg-v29') }), null);
  }
  for (const clip of prior) for (const frame of [0, 1, 2, 3, 7]) {
    const figure = { id: 17, action: clip.action === 'march' ? 'walk' : clip.action, fallen: clip.action === 'fall', direction: clip.direction, frame };
    const options = { scenarioId: 'gettysburg', side: clip.side, identity: clip.identity, shootingAge: .08, reloadProgress: .8 };
    assert.deepEqual(modules.gettysburgInfantryClipPose('retained-v29', figure, 9, { ...options, search: query(), clips }),
      modules.gettysburgInfantryClipPose('retained-v29', figure, 9, { ...options, search: query('baseline', 'gettysburg-v29'), clips: prior }));
  }
});

for (const side of ['union', 'confederate']) for (const action of ['melee', 'fall']) test(`${side} ${action} withholds a whole action for every missing phase and duplicate definition`, () => {
  requireComplete(); const clip = clips.find(value => value.key === contract(side, action).key);
  for (const name of clip.frames) {
    const damaged = modules.gettysburgClipTestTextures(native.atlases); damaged.get(clip.key).frames.delete(name);
    const prepared = prepare(native, query(), damaged); assert.equal(prepared.length, 117);
    assert.equal(prepared.some(value => value.key === clip.key), false);
    assert.equal(prepared.some(value => value.key === contract(side, action === 'melee' ? 'fall' : 'melee').key), true);
  }
  const formationId = 'v30-missing', id = Array.from({ length: 256 }, (_, id) => id).find(id => modules.gettysburgInfantryIdentity(formationId, id) === 'a');
  assert.equal(modules.gettysburgInfantryClipPose(formationId, { id, action, fallen: action === 'fall', direction: direction(side), frame: 1 }, 0,
    { scenarioId: 'gettysburg', search: query(), side, versionedIdentity: true, clips: [...clips, clip] }), null);
});

function pair(profile = 'baseline', pass = 'gettysburg-v30', fall = false, axis = 'se-nw') {
  const search = query(profile, pass), value = native.make(search, 'confederate', 5);
  const { scene } = value, confederate = value.unit, union = scene.engine.state.find(unit => unit.side === 'union' && unit.type === 'infantry' && unit.active);
  for (const unit of scene.engine.state) if (![confederate.id, union.id].includes(unit.id)) unit.active = false;
  const facing = side => axis === 'ne-sw' ? side === 'union' ? 7 : 3 : direction(side);
  for (const unit of [confederate, union]) Object.assign(unit, { strength: 3000, initialStrength: 3000, morale: 90, cohesion: 90, fatigue: 0, status: 'steady', order: 'hold', formationMode: 'line', frontage: 150, ammunition: 0, active: true, arrivalTime: null, reload: 0, lastVolleyAt: null, facing: facing(unit.side) * Math.PI / 4, inMelee: true, meleeWith: unit === union ? confederate.id : union.id });
  Object.assign(union, { x: 400, y: 400 }); Object.assign(confederate, { x: 500, y: 500 });
  const separation = (closeCombatDistance(confederate, union) - 1) / Math.SQRT2;
  confederate.x = union.x + separation; confederate.y = union.y + separation;
  if (axis === 'ne-sw') { confederate.x = 400; confederate.y = 400; union.x = confederate.x - separation; union.y = confederate.y + separation; }
  scene.speed = 1;
  scene.views.clear(); for (const unit of [confederate, union]) scene.createFormation(current(scene, unit.id));
  const result = { scene, union, confederate, ids: [confederate.id, union.id], search }; drawPair(result);
  if (fall) { for (const unit of [confederate, union]) { unit.inMelee = false; unit.meleeWith = null; } drawPair(result); for (const unit of [confederate, union]) unit.strength *= .5; drawPair(result); }
  return result;
}
const current = (scene, id) => scene.engine.snapshot({ presentation: true }).formations.find(unit => unit.id === id);
function drawPair(pair, resolving = false) {
  const snapshot = pair.scene.engine.snapshot({ presentation: true });
  pair.scene.smoke.clear(); pair.scene.shadows.clear(); pair.scene.dust.clear();
  for (const id of pair.ids) {
    const formation = snapshot.formations.find(unit => unit.id === id), foe = formation.inMelee && snapshot.formations.find(unit => unit.id === formation.meleeWith);
    pair.scene.syncFormation(foe ? { ...formation, contactFacing: Math.atan2(foe.y - formation.y, foe.x - formation.x) } : formation,
      pair.scene.engine.time + (pair.scene.engine.resolutionTime || 0), resolving, []);
  }
}
const pairFacts = pair => plain(pair.ids.map(id => native.facts(pair.scene.views.get(id))));
function coldPair(saved, original) {
  const value = native.make(original.search, 'confederate', 5, undefined, plain(saved)), scene = value.scene;
  for (const id of original.ids) if (!scene.views.has(id)) scene.createFormation(current(scene, id));
  return { ...original, scene, confederate: scene.engine.state.find(unit => unit.id === original.confederate.id), union: scene.engine.state.find(unit => unit.id === original.union.id) };
}
function assertNative(pair, action, factor) {
  let count = 0, fallback = 0;
  for (const unit of [pair.union, pair.confederate]) {
    const view = pair.scene.views.get(unit.id);
    assert.equal(view.soldiers.length, 32);
    for (const figure of view.visual.output.figures.filter(figure => figure.visible && figure.action === action)) {
      const soldier = view.soldiers[figure.id], sprite = soldier.sprite;
      assert.equal(figure.direction, direction(unit.side));
      if (unit.side === 'union' && modules.gettysburgInfantryIdentity(unit.id, figure.id) === 'b') { assert.equal(soldier.clipPhase, undefined); fallback++; continue; }
      const clip = clips.find(clip => clip.key === contract(unit.side, action).key);
      assert.equal(sprite.textureKey, clip.key); assert.equal(sprite.frameName, clip.frames[soldier.clipPhase]);
      assert.equal(sprite.x, figure.x); assert.equal(sprite.y, figure.y); assert.equal(sprite.angle, 0); assert.equal(sprite.flipX, false);
      assert.deepEqual(sprite.origin, clip.pivots[soldier.clipPhase]);
      const individual = .95 + modules.deterministicUnitValue(unit.id, figure.id, 215) * .10;
      close(sprite.scaleX, 58 * figure.scale * individual / clip.referenceHeight * factor);
      close(sprite.scaleY, sprite.scaleX); count++;
    }
  }
  assert.ok(count > 0 && fallback > 0); return { count, fallback };
}

test('native contact faces its opposing target independently of the saved formation facing and retains exact physical anchors', () => {
  requireComplete(); const value = pair();
  for (const unit of [value.union, value.confederate]) unit.facing = 0;
  const combat = plain(value.scene.engine.checkpoint()); drawPair(value); assertNative(value, 'melee', 1);
  for (const id of value.ids) assert.equal(value.scene.views.get(id).visual.output.facing, 0);
  assert.deepEqual(plain(value.scene.engine.checkpoint()), combat);
  const saved = plain(value.scene.checkpoint()), cold = coldPair(saved, value); drawPair(cold);
  assert.deepEqual(pairFacts(cold), pairFacts(value));
});

for (const [profile, factor] of [['baseline', 1], ['moderate', .86], ['small', .74]]) test(`${profile} native contact and grounded casualty phases preserve32slots, feet, Union B, combat, pause and first cold draw`, () => {
  requireComplete();
  for (const fall of [false, true]) {
    const next = pair(profile, 'gettysburg-v30', fall), prior = pair(profile, 'gettysburg-v29', fall), identities = next.ids.map(id => next.scene.views.get(id).visual.figures.map(figure => modules.gettysburgInfantryIdentity(id, figure.id)));
    const action = fall ? 'fall' : 'melee';
    for (const age of [0, .18, .36, .55, 2.5]) {
      next.scene.engine.time = prior.scene.engine.time = 7.08 + age;
      const combat = plain(next.scene.engine.checkpoint()); drawPair(next); drawPair(prior);
      assert.deepEqual(plain(next.scene.engine.checkpoint()), combat); assert.deepEqual(combat, plain(prior.scene.engine.checkpoint()));
      assertNative(next, action, factor);
      for (let army = 0; army < 2; army++) {
        const id = next.ids[army], view = next.scene.views.get(id), old = prior.scene.views.get(id);
        assert.deepEqual(plain(view.visual), plain(old.visual)); assert.deepEqual(view.footprint, old.footprint);
        assert.deepEqual(view.visual.figures.map(figure => modules.gettysburgInfantryIdentity(id, figure.id)), identities[army]);
        for (const figure of view.visual.output.figures.filter(figure => figure.visible && (!figure.fallen || fall))) if (army === 1 && modules.gettysburgInfantryIdentity(id, figure.id) === 'b') assert.deepEqual(plain(native.facts(view).soldiers[figure.id]), plain(native.facts(old).soldiers[figure.id]));
      }
      next.scene.speed = 0; const saved = plain(next.scene.checkpoint()), frozen = pairFacts(next), cold = coldPair(saved, next);
      drawPair(next); assert.deepEqual(pairFacts(next), frozen); drawPair(cold); assert.deepEqual(pairFacts(cold), frozen);
      assert.deepEqual(plain(cold.scene.engine.checkpoint()), combat); assert.deepEqual(plain(cold.scene.checkpoint()).presentation, saved.presentation); next.scene.speed = 1;
    }
  }
});

test('real simultaneous contact losses select both new casualty sheets without rendering feedback and reduced motion/resolution preserve fall grounding', () => {
  requireComplete(); const next = pair(), seen = new Map(['union', 'confederate'].map(side => [contract(side, 'fall').key, new Set()]));
  // Sample all visible loss phases over20s using actual simultaneous contact
  // resolution, as the existing contact regression does. The public test
  // separately runs the whole engine from the untouched roster.
  for (let step = 0; step < 400; step++) {
    next.scene.engine.time += .05; resolveContactCombat(next.scene.engine, .05); const combat = plain(next.scene.engine.checkpoint()); drawPair(next);
    assert.deepEqual(plain(next.scene.engine.checkpoint()), combat);
    for (const id of next.ids) for (const soldier of next.scene.views.get(id).soldiers) if (soldier.sprite.visible && seen.has(soldier.sprite.textureKey)) seen.get(soldier.sprite.textureKey).add(soldier.clipPhase);
  }
  for (const [key, phases] of seen) assert.deepEqual([...phases].sort(), [0, 1, 2, 3], key);
  assert.ok(next.union.strength < 3000 && next.confederate.strength < 3000);
  for (const fall of [false, true]) {
    const value = pair('small', 'gettysburg-v30', fall); value.scene.reducedMotion = true; drawPair(value);
    for (const id of value.ids) for (const soldier of value.scene.views.get(id).soldiers) if (soldier.sprite.visible && soldier.sprite.textureKey?.includes('-v30-')) assert.equal(soldier.clipPhase, fall ? 3 : 0);
    const saved = plain(value.scene.checkpoint()), cold = coldPair(saved, value); cold.scene.reducedMotion = true; drawPair(cold); assert.deepEqual(pairFacts(cold), pairFacts(value));
  }
  const fallen = pair('moderate', 'gettysburg-v30', true); fallen.scene.engine.beginResolution('defeat');
  for (const [age, phase] of [[.2, 1], [.4, 2], [.7, 3], [2.5, 3]]) {
    fallen.scene.engine.resolutionTime = age; drawPair(fallen, true); assertNative(fallen, 'fall', .86);
    for (const id of fallen.ids) for (const soldier of fallen.scene.views.get(id).soldiers) if (soldier.sprite.visible && soldier.sprite.textureKey?.includes('-v30-a-casualty')) assert.equal(soldier.clipPhase, phase);
  }
});

test('v30 retains every fresh native/fallback mouth, shot18 checkpoint and cached world muzzle through profile query changes', () => {
  requireComplete(); let nativeMouths = 0, fallbackMouths = 0;
  const missing = { exists: key => !key.includes('-gettysburg-') && native.renderingTextures.exists(key), get: key => native.renderingTextures.get(key) };
  for (const profile of ['baseline', 'moderate', 'small']) for (const side of ['union', 'confederate']) for (let bearing = 0; bearing < 8; bearing++) for (const loaded of [undefined, missing]) {
    const next = run(native, query(profile), side, bearing, 'fire', loaded), prior = run(native, query(profile, 'gettysburg-v29'), side, bearing, 'fire', loaded);
    assert.deepEqual(plain(next.view.shots), plain(prior.view.shots)); assert.deepEqual(plain(native.facts(next.view)), plain(native.facts(prior.view)));
    for (const shot of next.view.shots.figures) { if (shot.native) nativeMouths++; else fallbackMouths++; }
    const saved = plain(next.scene.checkpoint()); assert.equal(saved.presentation.shots.artPass, 'gettysburg-v18');
    native.windowState.location.search = query(profile === 'small' ? 'moderate' : 'small');
    const cached = next.view.shots; next.draw(); assert.equal(next.view.shots, cached);
    const cold = run(native, query(profile), side, bearing, 'fire', loaded, saved);
    assert.deepEqual(plain(cold.view.shots), plain(cached)); assert.deepEqual(plain(cold.scene.engine.checkpoint()), plain(next.scene.engine.checkpoint()));
  }
  assert.ok(nativeMouths > 0 && fallbackMouths > 0);
});

test('each missing native phase restores the same identity fallback at every profile while the opposing new source survives', () => {
  requireComplete();
  for (const profile of ['baseline', 'moderate', 'small']) for (const side of ['union', 'confederate'])
  for (const action of ['melee', 'fall']) for (const frame of clips.find(clip => clip.key === contract(side, action).key).frames) {
    const next = pair(profile, 'gettysburg-v30', action === 'fall'), prior = pair(profile, 'gettysburg-v29', action === 'fall');
    const damaged = modules.gettysburgClipTestTextures(native.atlases); damaged.get(contract(side, action).key).frames.delete(frame);
    next.scene.infantryClips = prepare(native, next.search, damaged);
    for (const elapsed of [0, .2, .4, .6]) {
      next.scene.engine.time = prior.scene.engine.time = 7.08 + elapsed; drawPair(next); drawPair(prior);
      const view = next.scene.views.get(next[side].id), old = prior.scene.views.get(prior[side].id);
      for (const figure of view.visual.output.figures.filter(figure => figure.visible && figure.action === action)) {
        assert.equal(view.soldiers[figure.id].clipPhase, undefined);
        assert.deepEqual(plain(native.facts(view).soldiers[figure.id]), plain(native.facts(old).soldiers[figure.id]));
      }
      const opposing = side === 'union' ? 'confederate' : 'union', otherView = next.scene.views.get(next[opposing].id);
      assert.ok(otherView.soldiers.some(soldier => soldier.sprite.visible && soldier.sprite.textureKey === contract(opposing, action).key));
      assert.deepEqual(plain(next.scene.engine.checkpoint()), plain(prior.scene.engine.checkpoint()));
    }
  }
});

test('pre-first-draw re-save retains every grounded casualty and explicitly preserves the inherited surviving walk-phase restore edge', () => {
  requireComplete();
  for (const profile of ['baseline', 'moderate', 'small']) for (const axis of ['se-nw', 'ne-sw']) {
    const changesByPass = [];
    for (const pass of ['gettysburg-v29', 'gettysburg-v30']) {
      const next = pair(profile, pass, true, axis); next.scene.engine.time = 9.58; drawPair(next);
      const saved = plain(next.scene.checkpoint()), frozen = pairFacts(next), cold = coldPair(saved, next);
      assert.ok(next.ids.every(id => cold.scene.views.get(id).visual.restoreFrame));
      assert.deepEqual(plain(cold.scene.checkpoint()).presentation, saved.presentation);
      assert.ok(next.ids.every(id => !Object.hasOwn(cold.scene.views.get(id).visual, 'restoreFrame')));
      drawPair(cold); const actual = pairFacts(cold); let fallen = 0; const changes = [];
      for (let army = 0; army < 2; army++) for (let id = 0; id < 32; id++) {
        const figure = next.scene.views.get(next.ids[army]).visual.output.figures[id];
        if (figure.fallen) { assert.deepEqual(actual[army].soldiers[id], frozen[army].soldiers[id]); fallen++; }
        else if (hashJSON(actual[army].soldiers[id]) !== hashJSON(frozen[army].soldiers[id])) {
          assert.equal(figure.action, 'walk'); changes.push({ army, id, before: frozen[army].soldiers[id], after: actual[army].soldiers[id] });
        }
      }
      assert.equal(fallen, 32); if (axis === 'ne-sw') assert.ok(changes.length > 0);
      changesByPass.push(changes);
      assert.deepEqual(plain(cold.scene.engine.checkpoint()), plain(next.scene.engine.checkpoint()));
      const ordinary = coldPair(saved, next); drawPair(ordinary); assert.deepEqual(pairFacts(ordinary), frozen);
      assert.deepEqual(plain(ordinary.scene.checkpoint()).presentation, saved.presentation);
    }
    assert.deepEqual(changesByPass[1], changesByPass[0], 'Exact current-v29 inherited survivor restore behavior; every fallen body remains exact');
  }
});

test('survivor loss and rank reformation keep identities fixed, and reverse NW/SE remains exact v29 fallback', () => {
  requireComplete();
  for (const profile of ['baseline', 'moderate', 'small']) {
    const next = pair(profile), prior = pair(profile, 'gettysburg-v29');
    const ids = next.scene.views.get(next.union.id).visual.figures.map(figure => modules.gettysburgInfantryIdentity(next.union.id, figure.id));
    for (const value of [next, prior]) { value.union.strength *= .7; value.union.formationMode = 'column'; value.scene.engine.time += .2; drawPair(value); }
    assertNative(next, 'melee', modules.gettysburgInfantryClipPolicy('gettysburg', next.search).infantryPresentationScale);
    assert.deepEqual(next.scene.views.get(next.union.id).visual.figures.map(figure => modules.gettysburgInfantryIdentity(next.union.id, figure.id)), ids);
    for (const value of [next, prior]) {
      const gap = Math.abs(value.confederate.x - value.union.x);
      value.confederate.x = value.union.x - gap; value.confederate.y = value.union.y - gap;
      value.scene.engine.time += .2; drawPair(value);
    }
    for (const id of next.ids) {
      const view = next.scene.views.get(id), old = prior.scene.views.get(id);
      assert.deepEqual(plain(view.visual), plain(old.visual));
      for (const figure of view.visual.output.figures.filter(figure => figure.visible && !figure.fallen)) assert.deepEqual(plain(native.facts(view).soldiers[figure.id]), plain(native.facts(old).soldiers[figure.id]));
    }
    for (const unit of [next.union, next.confederate]) for (const figure of next.scene.views.get(unit.id).visual.output.figures.filter(figure => figure.visible && !figure.fallen && figure.action === 'melee')) {
      assert.equal(figure.direction, unit.side === 'union' ? 5 : 1);
      assert.equal(next.scene.views.get(unit.id).soldiers[figure.id].clipPhase, undefined);
    }
    assert.deepEqual(plain(next.scene.engine.checkpoint()), plain(prior.scene.engine.checkpoint()));
  }
});

test('public Scene Move650600 then left Assault reaches genuine opposing SE/NW contact, losses and every new phase from the untouched roster', () => {
  requireComplete(); const donor = native.make(query(), 'confederate', 5);
  const scene = new native.Scene('gettysburg', native.campaign, 'option_a', null, () => {});
  for (const field of ['textures', 'infantryClips', 'add', 'shadows', 'smoke', 'dust', 'cameras']) scene[field] = donor.scene[field];
  const confederate = scene.engine.state.find(unit => unit.id === 'pickett-division'), union = scene.engine.state.find(unit => unit.id === 'gibbon-center');
  const value = { scene, confederate, union, ids: [confederate.id, union.id], search: query() };
  assert.equal(scene.engine.time, 0); assert.ok(!union.inMelee && !confederate.inMelee);
  const strength = [confederate.strength, union.strength];
  for (const id of value.ids) scene.createFormation(current(scene, id)); scene.setSelected(confederate.id);
  scene.setSpeed(0); scene.previewDestination({ x: 650, y: 600 });
  scene.confirmMove(); assert.equal(confederate.pendingCommand.order, 'move'); scene.setSpeed(1);
  for (let step = 0; step < 1500 && Math.hypot(confederate.x - 650, confederate.y - 600) >= 3; step++) { scene.engine.tick(.05); drawPair(value); }
  assert.ok(Math.hypot(confederate.x - 650, confederate.y - 600) < 3);
  scene.issueOrder('assault', { sectorId: 'left' }); assert.equal(confederate.pendingCommand.order, 'assault');
  let contactAt; const seen = new Map(added.map(asset => [asset.key, new Set()]));
  for (let step = 0; step < 1500; step++) {
    scene.engine.tick(.05); const combat = plain(scene.engine.checkpoint()); drawPair(value); assert.deepEqual(plain(scene.engine.checkpoint()), combat);
    if (!contactAt && confederate.inMelee && confederate.meleeWith === union.id) contactAt = scene.engine.time;
    if (!contactAt) continue;
    for (const unit of [union, confederate]) {
      const view = scene.views.get(unit.id);
      for (const figure of view.visual.output.figures.filter(figure => figure.visible && ['melee', 'fall'].includes(figure.action))) {
        const soldier = view.soldiers[figure.id], sprite = soldier.sprite;
        if (figure.action === 'melee') assert.equal(figure.direction, direction(unit.side));
        if (seen.has(sprite.textureKey)) seen.get(sprite.textureKey).add(soldier.clipPhase);
      }
    }
    if (scene.engine.time - contactAt >= 20) break;
  }
  assert.ok(contactAt > 0 && contactAt < 60);
  assert.ok(confederate.strength < strength[0] && union.strength < strength[1]);
  for (const [key, phases] of seen) assert.deepEqual([...phases].sort(), [0, 1, 2, 3], key);
  scene.setSpeed(0); const saved = plain(scene.checkpoint()), frozen = pairFacts(value), cold = coldPair(saved, value);
  drawPair(cold);
  const visible = armies => armies.map(army => ({ ...army, soldiers: army.soldiers.map(body => body.visible ? body : { visible: false }) }));
  assert.deepEqual(visible(pairFacts(cold)), visible(frozen));
  assert.deepEqual(plain(cold.scene.engine.checkpoint()), plain(scene.engine.checkpoint()));
});
