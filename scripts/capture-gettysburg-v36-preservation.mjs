import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

// One-time authentic installed-v35 capture. Current candidate code is not an oracle.
const LIVE = '/Users/titansforge/Vault/Titans_of_War';
const ROOT = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const WORK = fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '');
const sha = raw => createHash('sha256').update(raw).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
const hash = value => sha(JSON.stringify(plain(value)));
const BASELINE_SHA256 = '3e8971398ca8bba9ddf4238ea2c549e5012b1b0ff441473a531d331f54160894';
const baselineRaw = readFileSync(WORK + '/baseline-hashes.json');
assert.equal(sha(baselineRaw), BASELINE_SHA256);
const baseline = JSON.parse(baselineRaw); assert.equal(Object.keys(baseline).length, 1584);
const snapshot = JSON.parse(readFileSync(WORK + '/snapshot-receipt.json'));
assert.equal(snapshot.complete, true); assert.equal(snapshot.beforeAfterAndCopyExact, true);
assert.equal(snapshot.live, LIVE); assert.equal(snapshot.candidate, ROOT);
assert.equal(snapshot.files, 1584); assert.equal(snapshot.bytes, 554162121);
const paths = ['package.json', 'src/battle/CivilWarBattlefield.jsx', 'scripts/test-support/gettysburgV35Preservation.mjs'];
const started = performance.now(); let inventoriedBytes = 0;
for (const [path, digest] of Object.entries(baseline)) {
  const bytes = readFileSync(LIVE + '/' + path); inventoriedBytes += bytes.length;
  assert.ok(inventoriedBytes <= 2147483648, 'Bounded baseline bytes');
  assert.ok(performance.now() - started <= 90000, 'Bounded baseline time');
  assert.equal(sha(bytes), digest, 'Authentic current-before baseline: ' + path);
}
assert.equal(inventoriedBytes, 554162121);
const writeOnceExact = (name, bytes) => {
  if (existsSync(name)) {
    assert.equal(lstatSync(name).isSymbolicLink(), false);
    assert.deepEqual(readFileSync(name), Buffer.from(bytes), 'Capture is immutable: ' + name);
  } else {
    mkdirSync(name.substring(0, name.lastIndexOf('/')), { recursive: true });
    writeFileSync(name, bytes, { flag: 'wx' });
  }
};
const sourceFiles = paths.map(path => {
  const raw = readFileSync(LIVE + '/' + path); assert.equal(sha(raw), baseline[path]);
  const archive = 'scripts/test-support/gettysburg-v36-before/' + path;
  writeOnceExact(ROOT + '/' + archive, raw);
  assert.deepEqual(readFileSync(ROOT + '/' + archive), raw);
  return { path, sha256: sha(raw), bytes: raw.length, archive, candidateCopyBeforeSHA256: baseline[path] };
});
const dependencyPaths = ['scripts/test-support/gettysburgV30Regression.mjs', 'scripts/test-support/gettysburgV32Regression.mjs',
  'scripts/test-support/gettysburgV33Regression.mjs', 'scripts/test-support/gettysburgV34Regression.mjs',
  'scripts/test-support/gettysburgV35Regression.mjs', 'src/battle/artilleryVisual.js',
  'scripts/test-support/gettysburgClipTextures.mjs', 'scripts/test-support/fieldSuspendHarness.mjs',
  'src/App.jsx', 'src/battle/civilWarEngine.js', 'src/battle/contactLayoutPresentation.js',
  'src/battle/gettysburgStandardCheckpoint.js', 'src/battle/formationVisualCheckpoint.js', 'src/battle/formationVisualState.js',
  'src/battle/combatCheckpointEnvelope.js', 'src/battle/gettysburgInfantryVolleyPresentation.js',
  'src/battle/gettysburgInfantryShotMotion.js', 'src/battle/gettysburgInfantryClipPolicy.js', 'src/battle/gettysburgInfantryClips.js',
  'src/game/fieldCheckpoint.js', 'src/game/fieldSuspendSave.js', 'src/game/campaignStorage.js'];
const dependencies = dependencyPaths.map(path => {
  const bytes = readFileSync(LIVE + '/' + path); assert.equal(sha(bytes), baseline[path]);
  assert.deepEqual(readFileSync(ROOT + '/' + path), bytes, 'Authentic current dependency: ' + path);
  return { path, sha256: sha(bytes), bytes: bytes.length };
});
const { regressionModules, regressionHarness } = await import(pathToFileURL(LIVE + '/scripts/test-support/gettysburgV30Regression.mjs'));
const modules = await regressionModules(LIVE);
const legacy = await import(pathToFileURL(LIVE + '/scripts/test-support/gettysburgV32Regression.mjs'));
const standard = await import(pathToFileURL(LIVE + '/scripts/test-support/gettysburgV34Regression.mjs'));
const campaign = await import(pathToFileURL(LIVE + '/src/game/campaignStorage.js'));
const field = await import(pathToFileURL(LIVE + '/src/game/fieldCheckpoint.js'));
const suspend = await import(pathToFileURL(LIVE + '/src/game/fieldSuspendSave.js'));
const { BATTLE_SCENARIOS } = await import(pathToFileURL(LIVE + '/src/game/battles.js'));
const scene = readFileSync(LIVE + '/src/battle/CivilWarBattlefield.jsx');
const harness = regressionHarness(LIVE, modules, scene.toString(), '?artPass=gettysburg-v32');
const oldFixturePath = 'scripts/fixtures/gettysburg-v35-preservation.json';
const oldFixtureBytes = readFileSync(LIVE + '/' + oldFixturePath);
assert.equal(sha(oldFixtureBytes), baseline[oldFixturePath]);
assert.deepEqual(readFileSync(ROOT + '/' + oldFixturePath), oldFixtureBytes);
const oldFixture = JSON.parse(oldFixtureBytes);
assert.equal(oldFixture.queryRows.length, 46); assert.equal(oldFixture.sceneRows.length, 336); assert.equal(oldFixture.coldRows.length, 12);

// Retain each original primitive address and comparison seed. Re-execute the
// installed-v35 implementation and require equality with the immutable chain.
const queryRows = oldFixture.queryRows.map(row => {
  const query = row.query;
  const clips = modules.prepareGettysburgInfantryClips(modules.gettysburgInfantryClipDefinitions('gettysburg', query, harness.textures),
    (key, frame) => harness.textures.exists(key) && harness.textures.get(key).has(frame));
  const poses = clips.flatMap(clip => [0, 1, 2, 3].flatMap(frame => [{}, { paused: true }, { reducedMotion: true }, { resolving: true }].map(flags =>
    modules.gettysburgInfantryClipPose('v34-authentic-v33', { id: 17, direction: clip.direction,
      action: clip.action === 'march' ? 'walk' : clip.action, frame, fallen: clip.action === 'fall', scale: 1.37 }, 999,
    { scenarioId: 'gettysburg', search: query, side: clip.side, identity: clip.identity, versionedIdentity: true,
      clips, shootingAge: .08, reloadProgress: .7, ...flags }))));
  const current = { query, policy: modules.gettysburgInfantryClipPolicy('gettysburg', query),
    assets: modules.gettysburgInfantryClipAssets('gettysburg', query), clips: clips.length, clipsSHA256: hash(clips),
    poseRows: poses.length, posesSHA256: hash(poses) };
  assert.deepEqual(current, row, 'Fresh installed-v35 generic policy and pose witness: ' + query); return current;
});
assert.equal(queryRows.reduce((sum, row) => sum + row.poseRows, 0), 59744);
const sceneRows = oldFixture.sceneRows.map(row => {
  const value = legacy.isolated(harness, row.query, row.side, row.direction, row.state), facts = plain(harness.facts(value.view));
  const checkpoint = plain(value.scene.checkpoint());
  const current = { query: row.query, side: row.side, direction: row.direction, state: row.state,
    factsSHA256: hash(facts), feetSHA256: hash(facts.visual.output.figures.map(f => ({ id: f.id, x: f.x, y: f.y,
      scale: f.scale, fallen: f.fallen, visible: f.visible }))),
    muzzlesSHA256: hash(facts.soldiers.map(body => ({ clipVolleyMuzzle: body.clipVolleyMuzzle, clipVolleyAt: body.clipVolleyAt }))),
    shadowsSHA256: hash(value.scene.shadows.draws), smokeSHA256: hash(value.scene.smoke.draws),
    checkpointSHA256: hash(checkpoint), rawCombatSHA256: hash(modules.combatCheckpointEnvelope(checkpoint)), figureSlots: facts.soldiers.length };
  assert.deepEqual(current, row, 'Fresh installed-v35 gate-absent Scene witness'); return current;
});
const anchors = value => value.ids.map(formationId => ({ formationId, anchorId: value.scene.views.get(formationId).standardAnchorId ?? null }));
const coldRows = oldFixture.coldRows.map(row => {
  const warm = legacy.syntheticPair(harness, row.profile, 'gettysburg-v32', row.fall, row.direction); warm.scene.speed = 0;
  const checkpoint = plain(warm.scene.checkpoint()), facts = legacy.visibleFacts(legacy.pairFacts(harness, warm));
  const cold = legacy.coldPair(harness, checkpoint, warm); cold.scene.speed = 0;
  const preDrawAnchors = anchors(cold), preDrawCheckpoint = plain(cold.scene.checkpoint()); legacy.drawPair(cold);
  const coldFacts = legacy.visibleFacts(legacy.pairFacts(harness, cold));
  const current = { profile: row.profile, direction: row.direction, fall: row.fall, checkpoint, checkpointSHA256: hash(checkpoint),
    beforeFactsSHA256: hash(facts), coldPreDrawCheckpointSHA256: hash(preDrawCheckpoint), coldFactsSHA256: hash(coldFacts),
    coldFactsEqualBefore: hash(coldFacts) === hash(facts), beforeAnchors: anchors(warm), preDrawAnchors,
    coldAnchors: anchors(cold), rawCombatSHA256: hash(modules.combatCheckpointEnvelope(checkpoint)) };
  assert.deepEqual(current, row, 'Fresh installed-v35 legacy cold witness'); return current;
});
const native = await standard.standardHarness(LIVE);
const v34GateRows = [];
for (const direction of [1, 5]) for (const contact of [false, true]) {
  const warm = standard.controlledPair(native, { direction, contact }); standard.advance(warm, .55); warm.scene.setSpeed(0);
  const checkpoint = plain(warm.scene.checkpoint());
  assert.ok(checkpoint.presentation.standardAnchors);
  const cold = standard.coldPair(native, warm, checkpoint), beforeDrawCheckpoint = plain(cold.scene.checkpoint());
  assert.deepEqual(beforeDrawCheckpoint, checkpoint); standard.drawPair(cold);
  assert.deepEqual(standard.standardFacts(cold), standard.standardFacts(warm));
  assert.deepEqual(standard.rawFacts(cold), standard.rawFacts(warm));
  assert.deepEqual(cold.scene.engine.checkpoint(), warm.scene.engine.checkpoint());
  v34GateRows.push({ direction, contact, query: warm.search, checkpoint, checkpointSHA256: hash(checkpoint),
    rawCombatSHA256: hash(warm.scene.engine.checkpoint()), standardFactsSHA256: hash(standard.standardFacts(warm)),
    rawFactsSHA256: hash(standard.rawFacts(warm)), bodyFactsSHA256: hash(standard.bodyFacts(native, warm)),
    graphicsFactsSHA256: hash(standard.graphicsFacts(warm)), coldBeforeDrawCheckpointSHA256: hash(beforeDrawCheckpoint),
    coldStandardFactsSHA256: hash(standard.standardFacts(cold)), coldRawFactsSHA256: hash(standard.rawFacts(cold)),
    coldBodyFactsSHA256: hash(standard.bodyFacts(native, cold)), coldGraphicsFactsSHA256: hash(standard.graphicsFacts(cold)) });
}
// Execute untouched installed-v35 against the immutable owned primitive save.
// This authentic input remains separate from synthetic fresh-native pairs.
const animation = await import(pathToFileURL(LIVE + '/scripts/test-support/gettysburgV35Regression.mjs'));
const ownedPath = 'scripts/fixtures/gettysburg-v35-owned-save.json';
const ownedBytes = readFileSync(LIVE + '/' + ownedPath);
assert.equal(sha(ownedBytes), baseline[ownedPath]);
assert.deepEqual(readFileSync(ROOT + '/' + ownedPath), ownedBytes);
const owned = JSON.parse(ownedBytes), ownedData = new Map();
for (const [key, record] of Object.entries(owned.values)) {
  assert.equal(sha(record.value), record.SHA256); assert.equal(Buffer.byteLength(record.value), record.bytes);
  ownedData.set(key, record.value);
}
const ownedStorage = { getItem: key => ownedData.get(key) ?? null };
const loadedOwned = suspend.loadFieldSuspension(ownedStorage);
assert.equal(loadedOwned.error, null); assert.ok(loadedOwned.pending);
const context = loadedOwned.pending, originalOwned = plain(context.checkpoint);
const ownedOptions = { campaign: context.resumeState, scenarioId: context.battle.id, choiceId: context.choiceId };
const animationNative = await animation.animationHarness(LIVE);
const v35GateRows = [];
for (const contact of [false, true]) for (const standards of [false, true]) for (const reducedMotion of [false, true]) {
  const query = animation.animationQuery({ contact, standard: standards });
  const fresh = animationNative.make(plain(originalOwned), { ...ownedOptions, query, reducedMotion });
  fresh.update(0, 0); const facts = animation.fullFacts(animationNative, fresh), checkpoint = plain(fresh.checkpoint());
  const delayed = animationNative.make(plain(originalOwned), { ...ownedOptions, query, reducedMotion });
  for (let i = 0; i < 3; i++) assert.deepEqual(plain(delayed.checkpoint()), checkpoint);
  delayed.update(0, 0); assert.deepEqual(animation.fullFacts(animationNative, delayed), facts);
  v35GateRows.push({ query, contact, standard: standards, reducedMotion,
    checkpointSHA256: hash(checkpoint), fullFactsSHA256: hash(facts),
    nativeBodySHA256: hash(animation.nativeFacts(animationNative, fresh)),
    rawCombatSHA256: hash(fresh.engine.checkpoint()),
    delayedFirstDrawSHA256: hash(animation.fullFacts(animationNative, delayed)),
    repeatedPreDrawSaves: 3, delayedFirstDrawEqual: true });
}
const v35OwnedSave = { path: ownedPath, sha256: sha(ownedBytes),
  campaignSHA256: sha(ownedData.get(campaign.CAMPAIGN_STORAGE_KEY)),
  fieldSHA256: sha(ownedData.get(field.FIELD_CHECKPOINT_KEY)),
  rawCombatSHA256: hash(modules.combatCheckpointEnvelope(originalOwned)), owner: loadedOwned.owner };

const checkpoint = v34GateRows[0].checkpoint, state = native.campaign;
const battle = Object.values(BATTLE_SCENARIOS).find(value => value.id === 'gettysburg');
const pending = { battle, choiceId: 'option_a', baseState: state, mode: 'fight', practice: true, statusNote: '' };
const scenario = { id: 'checkpoint_fixture', title: 'Field campaign', turn: 1, actor: 'Scenario commander',
  roleLabel: 'Army Commander', choices: [{ id: 'option_b', text: 'Fight', consequence: 'Resolved' }] };
const snapshotValue = campaign.createCampaignSnapshot(state, scenario), data = new Map();
const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
const saved = suspend.saveFieldSuspension(snapshotValue, pending, checkpoint, state, storage);
const originalSnapshot = campaign.loadCampaignSnapshotResult(storage).snapshot;
const loaded = suspend.loadFieldSuspension(storage, originalSnapshot);
assert.equal(loaded.error, null); assert.equal(loaded.owner, saved.owner); assert.deepEqual(loaded.pending.checkpoint, checkpoint);
const campaignRaw = data.get(campaign.CAMPAIGN_STORAGE_KEY), fieldRaw = data.get(field.FIELD_CHECKPOINT_KEY);
const envelope = JSON.parse(fieldRaw), payload = JSON.parse(envelope.payload);
assert.equal(loaded.owner, payload.anchor); assert.equal(payload.version, 1); assert.equal(checkpoint.presentation.version, 1);
const rawSaveWitness = { campaignKey: campaign.CAMPAIGN_STORAGE_KEY, fieldKey: field.FIELD_CHECKPOINT_KEY, campaignRaw, fieldRaw,
  campaignSHA256: sha(campaignRaw), fieldSHA256: sha(fieldRaw), fieldVersion: payload.version, presentationVersion: checkpoint.presentation.version,
  fieldChecksum: envelope.checksum, owner: loaded.owner, protectedCampaign: loaded.protectedCampaign,
  rawCombatSHA256: hash(modules.combatCheckpointEnvelope(loaded.pending.checkpoint)), originalSnapshotSHA256: hash(originalSnapshot),
  pendingOwnerStored: Object.hasOwn(loaded.pending, 'owner'), limitations: 'Owned Map storage with actual unchanged APIs; not public browser usability.' };
const resaved = suspend.saveFieldSuspension(originalSnapshot, loaded.pending, checkpoint, loaded.pending.resumeState, storage, loaded.owner);
const reloaded = suspend.loadFieldSuspension(storage, originalSnapshot);
assert.equal(reloaded.error, null); assert.equal(reloaded.owner, resaved.owner); assert.equal(resaved.owner, loaded.owner);
assert.deepEqual(reloaded.pending.checkpoint, checkpoint); assert.equal(data.get(campaign.CAMPAIGN_STORAGE_KEY), campaignRaw);
rawSaveWitness.resaveFieldRaw = data.get(field.FIELD_CHECKPOINT_KEY); rawSaveWitness.resaveFieldSHA256 = sha(rawSaveWitness.resaveFieldRaw);
rawSaveWitness.resaveChecksum = JSON.parse(rawSaveWitness.resaveFieldRaw).checksum; rawSaveWitness.ownerPreservedOnResave = true;
const inheritedRaw = oldFixture.rawSaveWitness;
const legacyStorage = { getItem: key => key === inheritedRaw.fieldKey ? inheritedRaw.fieldRaw : inheritedRaw.campaignRaw };
const legacySnapshot = campaign.loadCampaignSnapshotResult(legacyStorage).snapshot;
const inheritedLoad = suspend.loadFieldSuspension(legacyStorage, legacySnapshot);
assert.equal(inheritedLoad.error, null); assert.equal(inheritedLoad.owner, inheritedRaw.owner);
assert.equal(hash(modules.combatCheckpointEnvelope(inheritedLoad.pending.checkpoint)), inheritedRaw.rawCombatSHA256);
for (const [path, digest] of Object.entries(baseline)) {
  assert.ok(performance.now() - started <= 90000, 'Bounded capture time');
  assert.equal(sha(readFileSync(LIVE + '/' + path)), digest, 'Live baseline remained exact during capture: ' + path);
}
const fixture = { schema: 'gettysburg-v36-authentic-installed-v35-baseline-v1', capturedFrom: LIVE, artPass: 'gettysburg-v32',
  baselineFiles: 1584, baselineBytes: inventoriedBytes, baselineSHA256: BASELINE_SHA256, sceneSHA256: sha(scene), sourceFiles, dependencies,
  oldFixture: { path: oldFixturePath, sha256: sha(oldFixtureBytes) },
  protectedFiles: Object.entries(baseline).filter(([path]) => !paths.includes(path)).map(([path, sha256]) => ({ path, sha256 })),
  queryRows, sceneRows, coldRows, v34GateRows, v35GateRows, v35OwnedSave, rawSaveWitness,
  inheritedRawSave: { fixture: oldFixturePath, campaignSHA256: inheritedRaw.campaignSHA256, fieldSHA256: inheritedRaw.fieldSHA256,
    rawCombatSHA256: inheritedRaw.rawCombatSHA256, owner: inheritedLoad.owner, loadedUsingCurrentAPIs: true },
  freshCanonicalWitnessesEqual: true, oldFixturesRefreshed: false, oldMigrationLedgersEdited: false,
  limitations: ['Actual installed-v35 Scene/modules with synthetic display objects; no pixel/GPU equality claim.',
    'The inherited cold body behavior is recorded exactly, including retained disagreements.',
    'Controlled native pairs are synthetic diagnostics using actual engine contact/loss; not public play or performance certification.'] };
const fixturePath = 'scripts/fixtures/gettysburg-v36-preservation.json';
writeOnceExact(ROOT + '/' + fixturePath, JSON.stringify(fixture, null, 2) + '\n');
const receipt = { schema: 'v36-authentic-preservation-capture-receipt-1', baselineFiles: 1584, baselineBytes: inventoriedBytes,
  baselineSHA256: BASELINE_SHA256, fixture: fixturePath, fixtureSHA256: sha(readFileSync(ROOT + '/' + fixturePath)),
  captureSHA256: sha(readFileSync(fileURLToPath(import.meta.url))), sourceFiles, dependencies, protectedFiles: 1581,
  complete: true, queryRows: queryRows.length, poseRows: 59744, sceneRows: sceneRows.length, coldRows: coldRows.length,
  v34GateRows: v34GateRows.length, v35GateRows: v35GateRows.length, freshCanonicalWitnessesEqual: true, rawSaveBytes: { campaign: campaignRaw.length, field: fieldRaw.length },
  runtime: process.version, seconds: (performance.now() - started) / 1000, liveWrites: false, oldFixturesRefreshed: false,
  oldMigrationLedgersEdited: false, sourceOnly: true, localInstall: false };
writeOnceExact(WORK + '/preservation-attempt01/authentic-capture.receipt.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
