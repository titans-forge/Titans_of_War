import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { regressionModules, regressionHarness } from './test-support/gettysburgV30Regression.mjs';

// One-time authentic installed-v29 capture. This script never reads changed
// selector code as an oracle and refuses an already enabled live v30 policy.
const LIVE = '/Users/titansforge/Vault/Titans_of_War';
const CANDIDATE = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const WORK = fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '');
const sha = raw => createHash('sha256').update(raw).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
const hashJSON = value => sha(JSON.stringify(plain(value)));
const baselineRaw = readFileSync(`${WORK}/baseline-hashes.json`);
const baseline = JSON.parse(baselineRaw);
assert.equal(Object.keys(baseline).length, 1430);
const paths = ['src/battle/CivilWarBattlefield.jsx', 'src/battle/gettysburgInfantryVolleyPresentation.js',
  'src/battle/gettysburgInfantryClipPolicy.js', 'src/battle/gettysburgInfantryClips.js',
  'scripts/test-gettysburg-v29-readability.mjs'];
const before = paths.map(path => {
  const raw = readFileSync(`${LIVE}/${path}`), sha256 = sha(raw);
  assert.equal(sha256, baseline[path], 'Authentic installed baseline: ' + path);
  assert.deepEqual(readFileSync(`${CANDIDATE}/${path}`), raw, 'Prechange candidate: ' + path);
  return { path, raw, sha256, archive: `scripts/test-support/gettysburg-v30-before/${path}` };
});
const modules = await regressionModules(LIVE);
assert.equal(modules.gettysburgInfantryClipPolicy('gettysburg', '?artPass=gettysburg-v30'), null);
const harness = regressionHarness(LIVE, modules, before[0].raw.toString('utf8'));
const passIds = [...new Set(before[2].raw.toString('utf8').match(/gettysburg-v\d+/g))]
  .sort((a, b) => Number(a.split('-v')[1]) - Number(b.split('-v')[1]));
const queries = [...passIds.map(pass => `?artPass=${pass}`),
  '?artPass=gettysburg-v29&infantryScale=baseline', '?artPass=gettysburg-v29&infantryScale=moderate',
  '?artPass=gettysburg-v29&infantryScale=small', '?artPass=gettysburg-v29&infantryScale=invalid', '', '?artPass=invalid'];
const queryRows = queries.map(query => {
  const clips = modules.prepareGettysburgInfantryClips(modules.gettysburgInfantryClipDefinitions('gettysburg', query, harness.textures),
    (key, frame) => harness.textures.exists(key) && harness.textures.get(key).has(frame));
  const poses = clips.flatMap(clip => [0, 1, 2, 3].flatMap(frame => [{}, { paused: true }, { reducedMotion: true }, { resolving: true }].map(flags =>
    modules.gettysburgInfantryClipPose('v30-authentic-v29', { id: 17, direction: clip.direction,
      action: clip.action === 'march' ? 'walk' : clip.action, frame, fallen: clip.action === 'fall', scale: 1.37 }, 999,
    { scenarioId: 'gettysburg', search: query, side: clip.side, identity: clip.identity, versionedIdentity: true,
      clips, shootingAge: .08, reloadProgress: .7, ...flags }))));
  return { query, policy: modules.gettysburgInfantryClipPolicy('gettysburg', query),
    assets: modules.gettysburgInfantryClipAssets('gettysburg', query), clips: clips.length,
    clipsSHA256: hashJSON(clips), poseRows: poses.length, posesSHA256: hashJSON(poses) };
});
const sceneRows = [];
for (const profile of ['baseline', 'moderate', 'small']) for (const side of ['union', 'confederate'])
for (let direction = 0; direction < 8; direction++) for (const state of ['ready', 'fire', 'reload', 'walk', 'melee', 'fall']) {
  const query = `?artPass=gettysburg-v29&infantryScale=${profile}`;
  const value = harness.make(query, side, direction); value.scene.speed = 1;
  if (state === 'ready') Object.assign(value.unit, { lastVolleyAt: 0, reload: 0, status: 'idle' });
  if (state === 'reload') Object.assign(value.unit, { lastVolleyAt: 5, reload: 6, status: 'firing' });
  if (state === 'melee') Object.assign(value.unit, { lastVolleyAt: 0, reload: 0, inMelee: true, status: 'fighting' });
  if (state === 'walk') Object.assign(value.unit, { lastVolleyAt: 0, reload: 0, status: 'moving', destination: { x: value.unit.x + 100, y: value.unit.y } });
  if (state === 'fall') { value.draw(); value.unit.strength *= .5; }
  const view = value.draw(), facts = plain(harness.facts(view));
  sceneRows.push({ query, side, direction, state, factsSHA256: hashJSON(facts),
    shadowsSHA256: hashJSON(value.scene.shadows.draws), smokeSHA256: hashJSON(value.scene.smoke.draws),
    checkpointSHA256: hashJSON(value.scene.checkpoint()), figureSlots: facts.soldiers.length,
    nativeVisible: facts.soldiers.filter(body => body.visible && body.texture?.includes('-gettysburg-')).length,
    fallbackVisible: facts.soldiers.filter(body => body.visible && !body.texture?.includes('-gettysburg-')).length });
}
const exceptions = new Set(['package.json', 'src/battle/gettysburgInfantryClipPolicy.js', 'src/battle/gettysburgInfantryClips.js', 'scripts/test-gettysburg-v29-readability.mjs']);
const protectedFiles = Object.entries(baseline).filter(([path]) => !exceptions.has(path)).map(([path, sha256]) => ({ path, sha256 }));
for (const record of before) {
  assert.equal(sha(readFileSync(`${LIVE}/${record.path}`)), record.sha256);
  mkdirSync(`${CANDIDATE}/${record.archive.substring(0, record.archive.lastIndexOf('/'))}`, { recursive: true });
  writeFileSync(`${CANDIDATE}/${record.archive}`, record.raw, { flag: 'wx' });
}
const fixture = { schema: 'gettysburg-v30-authentic-installed-v29-baseline-v1', capturedFrom: LIVE,
  artPass: 'gettysburg-v29', baselineFiles: 1430, baselineSHA256: sha(baselineRaw),
  sourceFiles: before.map(({ raw, ...record }) => record), protectedFiles, queryRows, sceneRows,
  migration: { path: 'scripts/test-gettysburg-v29-readability.mjs',
    beforeToken: '?artPass=gettysburg-v30&infantryScale=small', afterToken: '?artPass=permanently-invalid-art-pass&infantryScale=small',
    reason: 'The future-version negative becomes a valid opt-in selector; only its deliberately invalid token changes.' },
  limitations: ['Direct installed module and Scene geometry/behavior witnesses; synthetic display objects and accepted legacy frame stand-ins are not visual or human validation.',
    'This bounded capture stores complete-output hashes, not every output value. Historical unchanged fixtures and broader current behavioral tests remain mandatory.'] };
const fixturePath = 'scripts/fixtures/gettysburg-v30-preservation.json';
writeFileSync(`${CANDIDATE}/${fixturePath}`, `${JSON.stringify(fixture, null, 2)}\n`, { flag: 'wx' });
const receipt = { schema: 'gettysburg-v30-authentic-capture-receipt-v1', liveWrites: false,
  fixture: fixturePath, fixtureSHA256: sha(readFileSync(`${CANDIDATE}/${fixturePath}`)),
  baselineSHA256: fixture.baselineSHA256, baselineFiles: 1430, queryRows: queryRows.length,
  poseRows: queryRows.reduce((sum, row) => sum + row.poseRows, 0), sceneRows: sceneRows.length,
  archivedBeforeFiles: fixture.sourceFiles, protectedFiles: protectedFiles.length,
  runtime: process.version, captureSHA256: sha(readFileSync(import.meta.filename)),
  supportSHA256: sha(readFileSync(`${CANDIDATE}/scripts/test-support/gettysburgV30Regression.mjs`)) };
writeFileSync(`${WORK}/evidence/v30-authentic-capture-receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify(receipt));
