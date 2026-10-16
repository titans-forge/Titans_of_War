import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// One-time byte capture from untouched installed v36. No candidate behavior is an oracle.
const LIVE = '/Users/titansforge/Vault/Titans_of_War';
const ROOT = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const WORK = fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '');
assert.equal(ROOT, '/Users/titansforge/Vault/Titans_of_War_Art_Work/civil-war-v37-20261006/candidate');
assert.notEqual(ROOT, LIVE, 'Capture cannot write into LIVE');
const sha = raw => createHash('sha256').update(raw).digest('hex');
const BASELINE_SHA256 = '5d173c32873db1d5a2d82dc9d3f692a4f8e83ad879f5089f6084833aef985d65';
const PATHS = ['package.json', 'src/battle/CivilWarBattlefield.jsx', 'scripts/test-support/gettysburgV36Preservation.mjs'];
const fixturePath = 'scripts/fixtures/gettysburg-v37-preservation.json';
const receiptPath = WORK + '/preservation/authentic-capture.receipt.json';
const started = performance.now();
function read(root, path) {
  assert.ok(typeof path === 'string' && path.length > 0 && path.length <= 512 && !path.startsWith('/') && !path.includes('\\'));
  const parts = path.split('/');
  assert.ok(parts.every(part => part && part !== '.' && part !== '..'));
  for (let i = 1; i <= parts.length; i++) assert.equal(lstatSync(root + '/' + parts.slice(0, i).join('/')).isSymbolicLink(), false, path);
  const stat = lstatSync(root + '/' + path); assert.ok(stat.isFile(), path);
  assert.ok(stat.size <= 2147483648, 'Bounded source file');
  return readFileSync(root + '/' + path);
}
const baselineRaw = read(WORK, 'baseline-hashes.json');
assert.equal(sha(baselineRaw), BASELINE_SHA256);
const baseline = JSON.parse(baselineRaw), names = Object.keys(baseline);
assert.equal(names.length, 1596); assert.ok(names.length <= 2000);
const snapshotRaw = read(WORK, 'snapshot-receipt.json'), snapshot = JSON.parse(snapshotRaw);
assert.equal(snapshot.complete, true); assert.equal(snapshot.beforeAfterAndCopyExact, true);
assert.equal(snapshot.live, LIVE); assert.equal(snapshot.candidate, ROOT);
assert.equal(snapshot.files, 1596); assert.equal(snapshot.bytes, 557196222);
const outputPaths = [fixturePath, ...PATHS.map(path => 'scripts/test-support/gettysburg-v37-before/' + path)];
for (const path of outputPaths) assert.equal(existsSync(ROOT + '/' + path), false, 'Authentic capture is write-once: ' + path);
assert.equal(existsSync(receiptPath), false, 'Authentic receipt is write-once');
const inventory = []; let inventoriedBytes = 0;
for (const path of names) {
  const raw = read(LIVE, path);
  assert.equal(sha(raw), baseline[path], 'Untouched installed-v36 bytes: ' + path);
  inventory.push({ path, sha256: baseline[path], bytes: raw.length });
  inventoriedBytes += raw.length; assert.ok(inventoriedBytes <= 2147483648);
  assert.ok(performance.now() - started <= 90000, 'Bounded complete authentic capture');
}
const baselineBytes = inventory.reduce((sum, row) => sum + row.bytes, 0);
assert.equal(baselineBytes, 557196222);
function writeOnce(path, raw) {
  assert.equal(existsSync(path), false, 'Never overwrite an authentic capture');
  for (let parent = path.slice(0, path.lastIndexOf('/')); parent; parent = parent.slice(0, parent.lastIndexOf('/'))) {
    if (existsSync(parent)) {
      const stat = lstatSync(parent); assert.equal(stat.isSymbolicLink(), false, parent); assert.ok(stat.isDirectory(), parent);
    }
  }
  mkdirSync(path.slice(0, path.lastIndexOf('/')), { recursive: true });
  writeFileSync(path, raw, { flag: 'wx' });
  assert.deepEqual(readFileSync(path), Buffer.from(raw));
}
const sourceFiles = PATHS.map(path => {
  const raw = read(LIVE, path), archive = 'scripts/test-support/gettysburg-v37-before/' + path;
  assert.equal(sha(raw), baseline[path]);
  writeOnce(ROOT + '/' + archive, raw);
  return { path, sha256: baseline[path], bytes: raw.length, archive, candidateCopyBeforeSHA256: baseline[path] };
});
const oldFixture = { path: 'scripts/fixtures/gettysburg-v36-preservation.json' };
const oldLedger = { path: 'scripts/fixtures/gettysburg-v36-migrations.json' };
for (const record of [oldFixture, oldLedger]) {
  record.sha256 = baseline[record.path];
  assert.equal(sha(read(LIVE, record.path)), record.sha256);
  assert.equal(sha(read(ROOT, record.path)), record.sha256, 'Prior immutable metadata remains exact');
}
for (const row of inventory) {
  assert.ok(performance.now() - started <= 90000, 'Bounded final LIVE recheck');
  assert.equal(sha(read(LIVE, row.path)), row.sha256, 'LIVE remained untouched during capture: ' + row.path);
}
const fixture = {
  schema: 'gettysburg-v37-authentic-installed-v36-baseline-v1', capturedFrom: LIVE, artPass: 'gettysburg-v32',
  baselineFiles: 1596, baselineBytes, baselineSHA256: BASELINE_SHA256,
  initialCopyReceiptSHA256: sha(snapshotRaw), sceneSHA256: baseline['src/battle/CivilWarBattlefield.jsx'], sourceFiles,
  protectedFiles: inventory.filter(row => !PATHS.includes(row.path)), oldFixture, oldLedger,
  oldFixturesRefreshed: false, oldMigrationLedgersEdited: false, behavioralAssertionsChanged: false,
  limitations: ['Authentic byte-preservation capture only; behavioral acceptance consumes current physical candidate code.',
    'No pixel, GPU, public-play, human-usability or performance claim.']
};
writeOnce(ROOT + '/' + fixturePath, JSON.stringify(fixture, null, 2) + '\n');
const receipt = {
  schema: 'v37-authentic-preservation-capture-receipt-1', complete: true, baselineFiles: 1596, baselineBytes,
  baselineSHA256: BASELINE_SHA256, initialCopyReceiptSHA256: sha(snapshotRaw),
  fixture: fixturePath, fixtureSHA256: sha(read(ROOT, fixturePath)),
  captureSHA256: sha(readFileSync(fileURLToPath(import.meta.url))), sourceFiles, protectedFiles: 1593,
  runtime: process.version, seconds: (performance.now() - started) / 1000,
  liveWrites: false, oldFixturesRefreshed: false, oldMigrationLedgersEdited: false, behavioralAssertionsChanged: false
};
writeOnce(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
