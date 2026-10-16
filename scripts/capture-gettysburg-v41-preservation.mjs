import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync, lstatSync, readdirSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// One-time byte capture from untouched installed v40. No candidate behavior is an oracle.
const LIVE = '/Users/titansforge/Vault/Titans_of_War';
const ROOT = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const WORK = fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '');
assert.equal(ROOT, '/Users/titansforge/Vault/Titans_of_War_Art_Work/civil-war-v41-20261007/candidate');
assert.notEqual(ROOT, LIVE, 'Capture cannot write into LIVE');
for (const root of [ROOT, WORK, LIVE]) assert.equal(realpathSync(root), root, 'Physical canonical capture root required');
const sha = raw => createHash('sha256').update(raw).digest('hex');
const BASELINE_SHA256 = '795e6607b02618f83c937c4475b3271f4b2aaeebd096f986a3d11ca9a5f3a2bc';
const PATHS = ["package.json", "src/components/CivilWarBattleEncounter.jsx", "src/battle/CivilWarBattlefield.jsx", "scripts/test-support/gettysburgV40Preservation.mjs"];
const fixturePath = 'scripts/fixtures/gettysburg-v41-preservation.json';
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
assert.equal(names.length, 1637); assert.ok(names.length <= 2000);
const snapshotRaw = read(WORK, 'snapshot-receipt.json'), snapshot = JSON.parse(snapshotRaw);
assert.equal(snapshot.complete, true); assert.equal(snapshot.beforeAfterAndCopyExact, true);
assert.equal(snapshot.live, LIVE); assert.equal(snapshot.candidate, ROOT);
assert.equal(snapshot.files, 1637); assert.equal(snapshot.bytes, 559111430);
assert.deepEqual(snapshot.budgets, { files: 2000, bytes: 2147483648, seconds: 90 });
const exclusions = ['.git', 'node_modules', 'dist', '__pycache__', '.tmp', '.DS_Store', '*.zip', '*before-dist*', 'dist-before-*'];
assert.deepEqual(snapshot.exclusions, exclusions);
const outputPaths = [fixturePath, ...PATHS.map(path => 'scripts/test-support/gettysburg-v41-before/' + path)];
for (const path of outputPaths) assert.equal(existsSync(ROOT + '/' + path), false, 'Authentic capture is write-once: ' + path);
assert.equal(existsSync(receiptPath), false, 'Authentic receipt is write-once');
// Traverse the actual physical LIVE inventory before and after capture: name drift
// must fail alongside hash drift. The exclusions exactly match the fresh snapshot.
function liveInventory() {
  const rows = new Map(); let bytes = 0;
  function walk(relative) {
    assert.ok(performance.now() - started <= 90000, 'Bounded full LIVE traversal');
    const directory = LIVE + (relative ? '/' + relative : '');
    const entries = readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const path = (relative ? relative + '/' : '') + entry.name;
      const stat = lstatSync(LIVE + '/' + path);
      if (stat.isDirectory() && (['.git', 'node_modules', 'dist', '__pycache__', '.tmp'].includes(entry.name) || entry.name.includes('before-dist') || entry.name.startsWith('dist-before-'))) continue;
      // node_modules may be a runtime symlink, and is excluded as in the snapshot.
      if (entry.name === 'node_modules' && stat.isSymbolicLink()) continue;
      if (entry.name === '.DS_Store' || entry.name.endsWith('.zip')) continue;
      assert.equal(stat.isSymbolicLink(), false, 'No source symlinks: ' + path);
      if (stat.isDirectory()) { walk(path); continue; }
      assert.ok(stat.isFile(), 'Only regular source entries: ' + path);
      assert.ok(rows.size < 2000 && bytes + stat.size <= 2147483648, 'Bounded complete source inventory');
      const raw = read(LIVE, path); bytes += raw.length;
      assert.ok(bytes <= 2147483648 && performance.now() - started <= 90000, 'Bounded complete source inventory');
      rows.set(path, { path, sha256: sha(raw), bytes: raw.length });
    }
  }
  walk('');
  assert.deepEqual([...rows.keys()].sort(), names.slice().sort(), 'Full LIVE source name inventory remains baseline exact');
  for (const path of names) assert.equal(rows.get(path).sha256, baseline[path], 'Untouched installed-v40 bytes: ' + path);
  assert.equal(bytes, 559111430);
  return names.map(path => rows.get(path));
}
const inventory = liveInventory();
const baselineBytes = inventory.reduce((sum, row) => sum + row.bytes, 0);
assert.equal(baselineBytes, 559111430);
for (const path of PATHS) assert.equal(sha(read(ROOT, path)), baseline[path], 'Candidate copy is authentic before changed-path capture: ' + path);
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
  const raw = read(LIVE, path), archive = 'scripts/test-support/gettysburg-v41-before/' + path;
  assert.equal(sha(raw), baseline[path]);
  writeOnce(ROOT + '/' + archive, raw);
  return { path, sha256: baseline[path], bytes: raw.length, archive, candidateCopyBeforeSHA256: baseline[path] };
});
const oldFixture = { path: 'scripts/fixtures/gettysburg-v40-preservation.json' };
const oldLedger = { path: 'scripts/fixtures/gettysburg-v40-migrations.json' };
for (const record of [oldFixture, oldLedger]) {
  record.sha256 = baseline[record.path];
  assert.equal(sha(read(LIVE, record.path)), record.sha256);
  assert.equal(sha(read(ROOT, record.path)), record.sha256, 'Prior immutable metadata remains exact');
}
assert.deepEqual(liveInventory(), inventory, 'Full LIVE before and after bytes remain exact');
const authenticScene = read(LIVE, 'src/battle/CivilWarBattlefield.jsx').toString('utf8');
const sceneClassMarker = 'class CivilWarBattleScene extends Phaser.Scene {';
assert.equal(authenticScene.split(sceneClassMarker).length, 2, 'One authentic Scene class boundary');
const sceneClassSHA256 = sha(authenticScene.slice(authenticScene.indexOf(sceneClassMarker)));
const fixture = {
  schema: 'gettysburg-v41-authentic-installed-v40-baseline-v1', capturedFrom: LIVE, artPass: 'gettysburg-v32',
  baselineFiles: 1637, baselineBytes, baselineSHA256: BASELINE_SHA256,
  initialCopyReceiptSHA256: sha(snapshotRaw), sceneSHA256: baseline['src/battle/CivilWarBattlefield.jsx'], sceneClassSHA256, sourceFiles,
  protectedFiles: inventory.filter(row => !PATHS.includes(row.path)), oldFixture, oldLedger,
  oldFixturesRefreshed: false, oldMigrationLedgersEdited: false, behavioralAssertionsChanged: false,
  limitations: ['Authentic byte-preservation capture only; behavioral acceptance consumes current physical candidate code.',
    'No pixel, GPU, public-play, human-usability or performance claim.']
};
writeOnce(ROOT + '/' + fixturePath, JSON.stringify(fixture, null, 2) + '\n');
const receipt = {
  schema: 'v41-authentic-preservation-capture-receipt-1', complete: true, baselineFiles: 1637, baselineBytes,
  baselineSHA256: BASELINE_SHA256, initialCopyReceiptSHA256: sha(snapshotRaw),
  fixture: fixturePath, fixtureSHA256: sha(read(ROOT, fixturePath)),
  captureSHA256: sha(readFileSync(fileURLToPath(import.meta.url))), sourceFiles, protectedFiles: 1633,
  budgets: { files: 2000, bytes: 2147483648, seconds: 90 }, exclusions, fullLiveBeforeAfterExact: true,
  runtime: process.version, seconds: (performance.now() - started) / 1000,
  liveWrites: false, oldFixturesRefreshed: false, oldMigrationLedgersEdited: false, behavioralAssertionsChanged: false
};
writeOnce(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
