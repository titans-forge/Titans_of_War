import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { regressionModules, regressionHarness } from './test-support/gettysburgV29Regression.mjs';
import { gettysburgV29MigrationLedger, assertGettysburgV29HistoricalFile, GETTYSBURG_V29_MIGRATION_PATHS } from './test-support/gettysburgV29Preservation.mjs';

const directory = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const root = path => new URL(`../${path}`, import.meta.url);
const sha = raw => createHash('sha256').update(raw).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
const fixture = JSON.parse(readFileSync(root('scripts/fixtures/gettysburg-v29-preservation.json')));
const supplement = JSON.parse(readFileSync(root('scripts/fixtures/gettysburg-v29-preservation-supplement.json')));
const modules = await regressionModules(directory);
const beforeRecord = path => [...fixture.sourceFiles, ...supplement.sourceFiles].find(record => record.path === path);
const beforeText = path => readFileSync(root(beforeRecord(path).archive), 'utf8');
const beforePolicyModule = await import(`data:text/javascript;base64,${Buffer.from(beforeText('src/battle/gettysburgInfantryClipPolicy.js')).toString('base64')}`);
const beforeVolleySource = beforeText('src/battle/gettysburgInfantryVolleyPresentation.js');
// Link the archived module's sole relative import to the byte-preserved clip
// dependency; no archived function body or runtime behavior is replaced.
const linkedBeforeVolley = beforeVolleySource.replace("'./gettysburgInfantryClips.js'", JSON.stringify(root('src/battle/gettysburgInfantryClips.js').href));
const beforeVolley = await import(`data:text/javascript;base64,${Buffer.from(linkedBeforeVolley).toString('base64')}`);
const before = regressionHarness(directory, modules, beforeText('src/battle/CivilWarBattlefield.jsx'), beforePolicyModule.gettysburgInfantryClipPolicy, beforeVolley.sampleGettysburgInfantryVolley);
const current = regressionHarness(directory, modules, readFileSync(root('src/battle/CivilWarBattlefield.jsx'), 'utf8'));
const query = profile => `?artPass=gettysburg-v29&infantryScale=${profile}`;
const currentFactors = { baseline: 1, moderate: .86, small: .74 };

function run(harness, search, side, direction, state = 'fire', loaded, checkpoint) {
  const value = harness.make(search, side, direction, loaded, checkpoint);
  value.scene.speed = 1;
  if (!checkpoint) {
    if (state === 'ready') Object.assign(value.unit, { lastVolleyAt: 0, reload: 0, status: 'idle' });
    if (state === 'reload') Object.assign(value.unit, { lastVolleyAt: 5, reload: 6, status: 'firing' });
    if (state === 'melee') Object.assign(value.unit, { lastVolleyAt: 0, reload: 0, inMelee: true, status: 'fighting' });
    if (state === 'walk') Object.assign(value.unit, { lastVolleyAt: 0, reload: 0, status: 'moving', destination: { x: value.unit.x + 100, y: value.unit.y } });
    if (state === 'fall') { value.draw(); value.unit.strength *= .5; }
  }
  value.view = value.draw();
  return value;
}
function scaledBodies(reference, reduced, factor, harnessA = before, harnessB = current) {
  const a = plain(harnessA.facts(reference.view)), b = plain(harnessB.facts(reduced.view));
  assert.equal(a.capacity, b.capacity);
  assert.deepEqual(a.footprint, b.footprint);
  assert.deepEqual(a.visual, b.visual, 'World figures, scales, feet, slots, casualty anchors and frozen phases');
  let native = 0, fallback = 0, fallen = 0;
  for (let id = 0; id < a.soldiers.length; id++) {
    const expected = { ...a.soldiers[id] }, actual = b.soldiers[id];
    if (expected.visible) {
      const figure = reference.view.visual.output.figures[id];
      expected.x = figure.x + (expected.x - figure.x) * factor;
      expected.y = figure.y + (expected.y - figure.y) * factor;
      expected.scaleX *= factor; expected.scaleY *= factor;
      if (expected.texture?.includes('-gettysburg-')) native++; else fallback++;
      if (figure.fallen) fallen++;
    }
    for (const field of ['x', 'y', 'scaleX', 'scaleY']) { close(actual[field], expected[field]); delete actual[field]; delete expected[field]; }
    assert.deepEqual(actual, expected, 'Frame, pivot, phase, stable identity, recoil, angle, tint and depth');
  }
  assert.equal(reference.scene.shadows.draws.length, reduced.scene.shadows.draws.length);
  for (let i = 0; i < reference.scene.shadows.draws.length; i++) {
    const aShadow = reference.scene.shadows.draws[i], bShadow = reduced.scene.shadows.draws[i];
    close(bShadow.width, aShadow.width * factor); close(bShadow.height, aShadow.height * factor);
    assert.deepEqual({ ...bShadow, width: 0, height: 0 }, { ...aShadow, width: 0, height: 0 });
  }
  return { native, fallback, fallen };
}

test('authentic live before-images, unchanged baseline/supplement, all old fixtures and explicit twelve-path migration ledger are bound', () => {
  assert.equal(fixture.capturedFrom, '/Users/titansforge/Vault/Titans_of_War');
  assert.equal(fixture.sourceFiles.length, 12); assert.equal(fixture.queryRows.length, 25); assert.equal(fixture.sceneRows.length, 448);
  for (const record of fixture.sourceFiles) assert.equal(sha(readFileSync(root(record.archive))), record.sha256, record.path);
  assert.equal(sha(readFileSync(root('scripts/fixtures/gettysburg-v29-preservation.json'))), 'e76989be5369db4a97f85d83ed852e59b28708f708493fac3efa58f2b06224db');
  assert.equal(supplement.schema, 'gettysburg-v29-authentic-baseline-supplement-v1');
  assert.equal(supplement.rootBaseline.files, 1409);
  assert.equal(supplement.sourceFiles.length, 1);
  for (const record of supplement.sourceFiles) {
    assert.equal(record.path, 'scripts/test-gettysburg-v18-policy.mjs');
    assert.equal(sha(readFileSync(root(record.archive))), record.sha256);
    assert.equal(record.sha256, record.rootBaselineEntrySHA256);
  }
  for (const record of fixture.protectedFixtures) assert.equal(sha(readFileSync(root(record.path))), record.sha256, record.path);
  const ledger = gettysburgV29MigrationLedger(root);
  assert.equal(ledger.migrations.length, 12);
  const addedImport = "import { assertGettysburgV29HistoricalFile } from './test-support/gettysburgV29Preservation.mjs';\n";
  for (const path of GETTYSBURG_V29_MIGRATION_PATHS.filter(path => path.startsWith('scripts/'))) {
    const original = beforeText(path);
    const expression = 'assert.equal(hash(readFileSync(root(record.path))), record.sha256, record.path);';
    assert.equal(original.split(expression).length - 1, 1);
    assert.equal(readFileSync(root(path), 'utf8'), addedImport + original.replace(expression, 'assertGettysburgV29HistoricalFile(record, root);'),
      'Only import plus narrow preservation assertion migration; no historical behavioral test changes');
  }
});

test('migration helper refuses undeclared paths, stale current/before bytes, duplicate ledger paths and false historical hashes', () => {
  const ledger = gettysburgV29MigrationLedger(root);
  for (const mutation of [l => l.migrations.push({ ...l.migrations[0], path: 'src/battle/civilWarEngine.js' }),
    l => { l.migrations[1].path = l.migrations[0].path; },
    l => { l.migrations[0].currentSHA256 = '0'.repeat(64); },
    l => { l.migrations[0].beforeSHA256 = '0'.repeat(64); },
    l => { l.historicalFixturesRefreshed = true; }]) {
    const forged = plain(ledger); mutation(forged); assert.throws(() => gettysburgV29MigrationLedger(root, forged));
  }
  assert.throws(() => assertGettysburgV29HistoricalFile({ path: 'src/battle/CivilWarBattlefield.jsx', sha256: '0'.repeat(64) }, root));
  assert.throws(() => assertGettysburgV29HistoricalFile({ ...fixture.protectedFixtures[0], sha256: '0'.repeat(64) }, root));
});

test('all 25 authentic legacy policy/asset/clip queries stay exact, including ignored scale parameters', () => {
  for (const row of fixture.queryRows) for (const suffix of ['', '&infantryScale=moderate', '&infantryScale=small', '&infantryScale=invalid']) {
    const search = row.query + suffix;
    assert.deepEqual(modules.gettysburgInfantryClipPolicy('gettysburg', search), row.policy);
    assert.deepEqual(modules.gettysburgInfantryClipAssets('gettysburg', search), row.assets);
    const clips = modules.prepareGettysburgInfantryClips(modules.gettysburgInfantryClipDefinitions('gettysburg', search, current.textures),
      (key, frame) => current.textures.exists(key) && current.textures.get(key).has(frame));
    assert.equal(clips.length, row.clips); assert.equal(sha(JSON.stringify(clips)), row.clipsSHA256);
  }
});

test('448 authentic before/current Scene render, volley and checkpoint witnesses remain exact for every legacy selector', () => {
  for (const row of fixture.sceneRows) {
    const old = run(before, row.query, row.side, row.direction), next = run(current, row.query, row.side, row.direction);
    for (const [harness, value] of [[before, old], [current, next]]) {
      assert.deepEqual(plain(harness.facts(value.view)), row.facts, `${row.query}/${row.side}/${row.direction}`);
      assert.deepEqual(plain(value.scene.shadows.draws), row.shadows);
      assert.deepEqual(plain(value.scene.smoke.draws), row.smoke);
      assert.deepEqual(plain(value.scene.checkpoint()), row.checkpoint);
    }
  }
});

test('v29 profile is explicit Gettysburg-only with strict names, v28 atlases and shot18/checkpoint identities', () => {
  const policy = modules.gettysburgInfantryClipPolicy('gettysburg', '?artPass=gettysburg-v28');
  for (const [profile, factor] of Object.entries(currentFactors)) {
    assert.deepEqual(modules.gettysburgInfantryClipPolicy('gettysburg', query(profile)),
      { ...policy, infantryScaleProfile: profile, infantryPresentationScale: factor });
    assert.deepEqual(modules.gettysburgInfantryClipAssets('gettysburg', query(profile)), modules.gettysburgInfantryClipAssets('gettysburg', '?artPass=gettysburg-v28'));
    const value = run(current, query(profile), 'union', 6);
    assert.equal(value.scene.infantryPresentationScale, factor);
    assert.equal(value.scene.shotPresentationId, 'gettysburg-v18');
    assert.equal(value.scene.engine.checkpoint().version, 1);
    assert.equal(value.scene.engine.checkpoint().state.battleRulesVersion, 18);
    assert.equal(modules.CAMPAIGN_SAVE_VERSION, 22);
  }
  for (const profile of ['', 'SMALL', '0.74', '.74', 'NaN', 'Infinity', 'invalid', 'small%20']) {
    const value = modules.gettysburgInfantryClipPolicy('gettysburg', query(profile));
    assert.equal(value.infantryPresentationScale, 1); assert.equal(value.infantryScaleProfile, 'baseline');
  }
  for (const scenario of ['shiloh', 'first_manassas', '', null]) assert.equal(modules.gettysburgInfantryClipPolicy(scenario, query('small')), null);
  for (const search of ['', '?artPass=invalid', '?artPass=permanently-invalid-art-pass&infantryScale=small']) assert.equal(modules.gettysburgInfantryClipPolicy('gettysburg', search), null);
});

for (const [profile, factor] of Object.entries(currentFactors)) test(`${profile} scales every native/fallback bearing and ready/fire/reload/walk/melee/fall body around unchanged feet`, () => {
  const count = { native: 0, fallback: 0, fallen: 0 };
  for (const side of ['union', 'confederate']) for (let direction = 0; direction < 8; direction++)
  for (const state of ['ready', 'fire', 'reload', 'walk', 'melee', 'fall']) {
    const old = run(before, '?artPass=gettysburg-v28', side, direction, state), next = run(current, query(profile), side, direction, state);
    const measured = scaledBodies(old, next, factor);
    for (const key of Object.keys(count)) count[key] += measured[key];
    assert.deepEqual(plain(old.scene.engine.checkpoint()), plain(next.scene.engine.checkpoint()));
  }
  assert.ok(count.native > 0 && count.fallback > 0 && count.fallen > 0, JSON.stringify(count));
});

test('fresh native and fallback muzzle offsets scale equally while shot effect scale/bearing/id and checkpoint serialization remain unchanged', () => {
  let native = 0, fallback = 0;
  const missing = { exists: key => !key.includes('-gettysburg-') && current.renderingTextures.exists(key), get: key => current.renderingTextures.get(key) };
  for (const [profile, factor] of Object.entries(currentFactors)) for (const side of ['union', 'confederate']) for (let direction = 0; direction < 8; direction++) for (const loaded of [undefined, missing]) {
    const old = run(before, '?artPass=gettysburg-v28', side, direction, 'fire', loaded), next = run(current, query(profile), side, direction, 'fire', loaded);
    const a = old.view.shots, b = next.view.shots;
    assert.equal(a.at, b.at); assert.equal(a.capturedAt, b.capturedAt); assert.equal(a.figures.length, b.figures.length);
    for (let i = 0; i < a.figures.length; i++) {
      const original = a.figures[i], actual = b.figures[i], foot = old.view.visual.output.figures[original.id];
      close(actual.x, foot.x + (original.x - foot.x) * factor); close(actual.y, foot.y + (original.y - foot.y) * factor);
      assert.deepEqual({ ...actual, x: 0, y: 0 }, { ...original, x: 0, y: 0 });
      if (actual.native) native++; else fallback++;
    }
    next.view.shots = null; const saved = plain(next.scene.checkpoint());
    assert.equal(saved.presentation.shots.artPass, 'gettysburg-v18');
    assert.deepEqual(saved.presentation.shots.formations.find(record => record.id === next.unit.id).volley, plain(b), 'Checkpoint second sampler call uses same factor as draw');
  }
  assert.ok(native > 0 && fallback > 0);
});

test('missing native sources and frames retain the same accepted identity/action fallback, scaled equally', () => {
  const missing = { exists: key => !key.includes('-gettysburg-') && current.renderingTextures.exists(key), get: key => current.renderingTextures.get(key) };
  for (const [profile, factor] of Object.entries(currentFactors)) for (const side of ['union', 'confederate']) for (const direction of [0, 3, 5, 6, 7]) {
    const old = run(before, '?artPass=gettysburg-v28', side, direction, 'fire', missing), next = run(current, query(profile), side, direction, 'fire', missing);
    const counts = scaledBodies(old, next, factor);
    assert.equal(counts.native, 0); assert.ok(counts.fallback > 0);
    assert.ok(next.view.shots.figures.every(shot => shot.native === false));
  }
});

test('profile query changes, pause and cold restore preserve already cached shot18 world coordinates exactly', () => {
  for (const direction of [0, 5, 6, 7]) {
    const original = run(before, '?artPass=gettysburg-v28', 'union', direction);
    original.scene.setSpeed(0); const saved = plain(original.scene.checkpoint()), shots = plain(original.view.shots);
    for (const profile of ['moderate', 'small']) {
      const cold = run(current, query(profile), 'union', direction, 'fire', undefined, saved);
      assert.deepEqual(plain(cold.view.shots), shots);
      cold.scene.setSpeed(0); assert.deepEqual(plain(cold.scene.checkpoint()).presentation.shots, saved.presentation.shots);
      const previous = cold.view.shots;
      current.windowState.location.search = query(profile === 'small' ? 'moderate' : 'small');
      cold.draw(); assert.equal(cold.view.shots, previous);
      assert.equal(cold.scene.infantryPresentationScale, currentFactors[profile], 'Constructor-captured factor survives later URL query changes');
    }
  }
});

test('scaled paused/cold sprites keep fixed phases and footsteps after first draw and resave; reduced motion keeps its inherited phase', () => {
  for (const profile of ['moderate', 'small']) for (const state of ['ready', 'reload', 'melee', 'fall']) {
    const value = run(current, query(profile), 'union', 6, state);
    value.scene.setSpeed(0); value.draw();
    const sprites = plain(current.facts(value.view).soldiers), saved = plain(value.scene.checkpoint());
    const cold = run(current, query(profile), 'union', 6, state, undefined, saved);
    cold.scene.setSpeed(0); cold.draw();
    assert.deepEqual(plain(current.facts(cold.view).soldiers), sprites);
    assert.deepEqual(plain(cold.scene.checkpoint()).presentation, saved.presentation);
    const old = run(before, '?artPass=gettysburg-v28', 'union', 6, state), next = run(current, query(profile), 'union', 6, state);
    old.scene.reducedMotion = next.scene.reducedMotion = true; old.draw(); next.draw();
    scaledBodies(old, next, currentFactors[profile]);
  }
});

test('sampler rejects arbitrary numeric factors without changing its historical default behavior', () => {
  const value = run(before, '?artPass=gettysburg-v28', 'union', 6);
  const options = { scenarioId: 'gettysburg', search: '?artPass=gettysburg-v28', clips: value.scene.infantryClips,
    textures: value.scene.textures, scale: .82 };
  const original = beforeVolley.sampleGettysburgInfantryVolley(null, value.snapshot(), value.view.visual.output, value.scene.engine.time, options);
  for (const factor of [undefined, null, 0, -1, 1.1, '0.74', NaN, Infinity]) {
    assert.deepEqual(plain(modules.sampleGettysburgInfantryVolley(null, value.snapshot(), value.view.visual.output, value.scene.engine.time,
      { ...options, infantryPresentationScale: factor })), plain(original));
  }
});
