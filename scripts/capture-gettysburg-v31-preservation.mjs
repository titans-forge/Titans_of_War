import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { regressionModules, regressionHarness } from './test-support/gettysburgV30Regression.mjs';

// One-time capture executes the authentic installed v30 code before v31 is
// selectable. It never derives an oracle from changed candidate selectors.
const LIVE = '/Users/titansforge/Vault/Titans_of_War';
const ROOT = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const WORK = fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '');
const sha = raw => createHash('sha256').update(raw).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
const hash = value => sha(JSON.stringify(plain(value)));
mkdirSync(`${WORK}/evidence`, { recursive: true });
const writeOnceExact = (path, bytes) => {
  if (existsSync(path)) assert.deepEqual(readFileSync(path), Buffer.from(bytes), 'Interrupted capture may only recover identical existing bytes');
  else writeFileSync(path, bytes, { flag: 'wx' });
};
const baselineRaw = readFileSync(`${WORK}/baseline-hashes.json`);
assert.equal(sha(baselineRaw), '9869bc7964c84a49967172da23e635a04b4263b0259aa6e7b571910a71bc59d9');
const baseline = JSON.parse(baselineRaw);
assert.equal(Object.keys(baseline).length, 1473);
const paths = ['package.json', 'src/battle/gettysburgInfantryClipPolicy.js', 'src/battle/gettysburgInfantryClips.js',
  'scripts/test-gettysburg-v30-contact.mjs', 'scripts/test-field-suspend-save.mjs'];
const sourceFiles = paths.map(path => {
  const raw = readFileSync(`${LIVE}/${path}`), sha256 = sha(raw);
  assert.equal(sha256, baseline[path], 'Installed authentic source: ' + path);
  assert.deepEqual(readFileSync(`${ROOT}/${path}`), raw, 'Candidate must still be unchanged: ' + path);
  return { path, sha256, archive: `scripts/test-support/gettysburg-v31-before/${path}`, raw };
});
const modules = await regressionModules(LIVE);
assert.equal(modules.gettysburgInfantryClipPolicy('gettysburg', '?artPass=gettysburg-v31'), null);
const scene = readFileSync(`${LIVE}/src/battle/CivilWarBattlefield.jsx`);
assert.equal(sha(scene), baseline['src/battle/CivilWarBattlefield.jsx']);
const harness = regressionHarness(LIVE, modules, scene.toString('utf8'), '?artPass=gettysburg-v30');
assert.equal(modules.gettysburgInfantryClipAssets('gettysburg', '?artPass=gettysburg-v30').length, 70);
const oldFixture = JSON.parse(readFileSync(`${LIVE}/scripts/fixtures/gettysburg-v30-preservation.json`));
const queries = [...oldFixture.queryRows.map(row => row.query),
  ...['baseline', 'moderate', 'small', 'invalid'].map(profile => `?artPass=gettysburg-v30&infantryScale=${profile}`)];
const queryRows = queries.map(query => {
  const clips = modules.prepareGettysburgInfantryClips(modules.gettysburgInfantryClipDefinitions('gettysburg', query, harness.textures),
    (key, frame) => harness.textures.exists(key) && harness.textures.get(key).has(frame));
  const poses = clips.flatMap(clip => [0, 1, 2, 3].flatMap(frame => [{}, { paused: true }, { reducedMotion: true }, { resolving: true }].map(flags =>
    modules.gettysburgInfantryClipPose('v31-authentic-v30', { id: 17, direction: clip.direction,
      action: clip.action === 'march' ? 'walk' : clip.action, frame, fallen: clip.action === 'fall', scale: 1.37 }, 999,
    { scenarioId: 'gettysburg', search: query, side: clip.side, identity: clip.identity, versionedIdentity: true,
      clips, shootingAge: .08, reloadProgress: .7, ...flags }))));
  return { query, policy: modules.gettysburgInfantryClipPolicy('gettysburg', query), assets: modules.gettysburgInfantryClipAssets('gettysburg', query),
    clips: clips.length, clipsSHA256: hash(clips), poseRows: poses.length, posesSHA256: hash(poses) };
});
const sceneRows = [];
for (const profile of ['baseline', 'moderate', 'small']) for (const side of ['union', 'confederate'])
for (let direction = 0; direction < 8; direction++) for (const state of ['ready', 'fire', 'reload', 'walk', 'melee', 'fall']) {
  const query = `?artPass=gettysburg-v30&infantryScale=${profile}`, value = harness.make(query, side, direction);
  value.scene.speed = 1;
  if (state === 'ready') Object.assign(value.unit, { lastVolleyAt: 0, reload: 0, status: 'idle' });
  if (state === 'reload') Object.assign(value.unit, { lastVolleyAt: 5, reload: 6, status: 'firing' });
  if (state === 'melee') Object.assign(value.unit, { lastVolleyAt: 0, reload: 0, inMelee: true, status: 'fighting' });
  if (state === 'walk') Object.assign(value.unit, { lastVolleyAt: 0, reload: 0, status: 'moving', destination: { x: value.unit.x + 100, y: value.unit.y } });
  if (state === 'fall') { value.draw(); value.unit.strength *= .5; }
  const view = value.draw(), facts = plain(harness.facts(view));
  sceneRows.push({ query, side, direction, state, factsSHA256: hash(facts), shadowsSHA256: hash(value.scene.shadows.draws),
    smokeSHA256: hash(value.scene.smoke.draws), checkpointSHA256: hash(value.scene.checkpoint()), figureSlots: facts.soldiers.length });
}
for (const record of sourceFiles) {
  assert.equal(sha(readFileSync(`${LIVE}/${record.path}`)), record.sha256);
  mkdirSync(`${ROOT}/${record.archive.substring(0, record.archive.lastIndexOf('/'))}`, { recursive: true });
  writeOnceExact(`${ROOT}/${record.archive}`, record.raw);
}
const fixture = { schema: 'gettysburg-v31-authentic-installed-v30-baseline-v1', capturedFrom: LIVE, artPass: 'gettysburg-v30',
  baselineFiles: 1473, baselineSHA256: sha(baselineRaw), sceneSHA256: sha(scene),
  sourceFiles: sourceFiles.map(({ raw, ...record }) => record),
  protectedFiles: Object.entries(baseline).filter(([path]) => !paths.includes(path)).map(([path, sha256]) => ({ path, sha256 })),
  queryRows, sceneRows, oldFixturesRefreshed: false, oldMigrationLedgersEdited: false,
  limitations: ['Installed module and current Scene geometry/behavior hashes, with synthetic display objects and accepted legacy-frame stand-ins; not GPU, human or anatomy validation.',
    'Authentic full-output hashes do not substitute for mandatory current behavioral, save ownership or public play checks.'] };
const fixturePath = 'scripts/fixtures/gettysburg-v31-preservation.json';
writeOnceExact(`${ROOT}/${fixturePath}`, `${JSON.stringify(fixture, null, 2)}\n`);
const receipt = { schema: 'gettysburg-v31-authentic-capture-receipt-v1', liveWrites: false, baselineFiles: 1473, baselineSHA256: fixture.baselineSHA256,
  fixture: fixturePath, fixtureSHA256: sha(readFileSync(`${ROOT}/${fixturePath}`)), archivedBeforeFiles: fixture.sourceFiles,
  protectedFiles: fixture.protectedFiles.length, queryRows: queryRows.length, poseRows: queryRows.reduce((sum, row) => sum + row.poseRows, 0),
  sceneRows: sceneRows.length, runtime: process.version, captureSHA256: sha(readFileSync(import.meta.filename)),
  supportSHA256: sha(readFileSync(`${ROOT}/scripts/test-support/gettysburgV30Regression.mjs`)) };
writeOnceExact(`${WORK}/evidence/v31-authentic-capture-receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt));
