import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { regressionModules, regressionHarness } from './test-support/gettysburgV29Regression.mjs';

// Authentic live source, captured before integration changes. Never recapture
// the fixture against a finished v29 candidate to satisfy a regression.
const LIVE = '/Users/titansforge/Vault/Titans_of_War';
const CANDIDATE = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const sha = raw => createHash('sha256').update(raw).digest('hex');
const runtimePaths = ['src/battle/CivilWarBattlefield.jsx', 'src/battle/gettysburgInfantryVolleyPresentation.js', 'src/battle/gettysburgInfantryClipPolicy.js'];
const testPaths = [20, 21, 22, 23, 24, 25, 26].map(v => `scripts/test-gettysburg-v${v}-contact.mjs`)
  .concat([27, 28].map(v => `scripts/test-gettysburg-v${v}-policy.mjs`));
const before = [...runtimePaths, ...testPaths].map(path => {
  const raw = readFileSync(`${LIVE}/${path}`);
  assert.deepEqual(readFileSync(`${CANDIDATE}/${path}`), raw, 'Capture requires original candidate: ' + path);
  return { path, raw, sha256: sha(raw), archive: `scripts/test-support/gettysburg-v29-before/${path}` };
});
const modules = await regressionModules(LIVE);
assert.equal(modules.gettysburgInfantryClipPolicy('gettysburg', '?artPass=gettysburg-v29'), null);
const sceneSource = before[0].raw.toString('utf8');
const harness = regressionHarness(LIVE, modules, sceneSource);
const passIds = [...new Set(before[2].raw.toString('utf8').match(/gettysburg-v\d+/g))].sort((a, b) => Number(a.split('-v')[1]) - Number(b.split('-v')[1]));
const queryRows = [];
for (const pass of passIds) {
  const query = `?artPass=${pass}`;
  const assets = modules.gettysburgInfantryClipAssets('gettysburg', query);
  const clips = modules.prepareGettysburgInfantryClips(modules.gettysburgInfantryClipDefinitions('gettysburg', query, harness.textures),
    (key, frame) => harness.textures.exists(key) && harness.textures.get(key).has(frame));
  queryRows.push({ query, policy: modules.gettysburgInfantryClipPolicy('gettysburg', query), assets, clipsSHA256: sha(JSON.stringify(clips)), clips: clips.length });
}
const sceneRows = [];
for (const query of [...passIds.map(pass => `?artPass=${pass}`), '', '?artPass=invalid', '?artPass=gettysburg-v28&infantryScale=small'])
for (const side of ['union', 'confederate']) for (let direction = 0; direction < 8; direction++) {
  const { scene, unit, draw } = harness.make(query, side, direction);
  scene.speed = 1;
  const view = draw();
  sceneRows.push({ query, side, direction, formationId: unit.id,
    facts: JSON.parse(JSON.stringify(harness.facts(view))), shadows: scene.shadows.draws,
    smoke: scene.smoke.draws, checkpoint: JSON.parse(JSON.stringify(scene.checkpoint())) });
}
const oldFixturePaths = readdirSync(`${LIVE}/scripts/fixtures`).filter(name => /^gettysburg-v\d+-preservation\.json$/.test(name));
const fixture = { schema: 'gettysburg-v29-authentic-live-baseline-v1', artPass: 'gettysburg-v28', capturedFrom: LIVE,
  capture: 'Actual live pre-v29 module query and Scene render/checkpoint outputs; before-image bytes are preserved separately.',
  sourceFiles: before.map(({ raw, ...record }) => record), queryRows, sceneRows,
  protectedFixtures: oldFixturePaths.map(name => ({ path: `scripts/fixtures/${name}`, sha256: sha(readFileSync(`${LIVE}/scripts/fixtures/${name}`)) })),
  limitations: ['Node Scene harness records geometry and behavior using actual native atlas JSON plus accepted fallback frame stand-ins; it is not browser or human visual validation.', 'Original native PNG/JSON assets are unchanged and broader old pose assertions remain in their historical tests.'] };
for (const record of before) {
  assert.equal(sha(readFileSync(`${LIVE}/${record.path}`)), record.sha256);
  mkdirSync(`${CANDIDATE}/${record.archive.substring(0, record.archive.lastIndexOf('/'))}`, { recursive: true });
  writeFileSync(`${CANDIDATE}/${record.archive}`, record.raw, { flag: 'wx' });
}
const path = 'scripts/fixtures/gettysburg-v29-preservation.json';
writeFileSync(`${CANDIDATE}/${path}`, `${JSON.stringify(fixture, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ fixture: path, fixtureSHA256: sha(readFileSync(`${CANDIDATE}/${path}`)), archivedBeforeFiles: before.length,
  oldPolicies: queryRows.length, sceneRows: sceneRows.length, oldFixtures: fixture.protectedFixtures.length,
  sourceHashes: fixture.sourceFiles, liveWrites: false }));
