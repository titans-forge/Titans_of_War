import assert from 'node:assert/strict';
import { readFileSync, lstatSync, realpathSync, openSync, fstatSync, closeSync, constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { v40HistoricalSource } from './gettysburgV40Preservation.mjs';

// Independent metadata reader: never imports an older migration helper.
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ledgerPath = 'scripts/fixtures/gettysburg-v39-migrations.json';
const ledgerSHA256 = 'c46b7bb6610d5b26e0660cdf4c24fc02583dab8a3709822c2c80308d7c7c962f';
const expected = {
  "schema": "gettysburg-v39-historical-byte-migration-v1",
  "status": "frozen-approved-runtime-pins",
  "baselineSHA256": "937207353e1f0f69b014090874ff3fec96c1b92231a11dcef753fffe043af923",
  "baselineFiles": 1615,
  "baselineBytes": 558140095,
  "fixture": {
    "path": "scripts/fixtures/gettysburg-v39-preservation.json",
    "sha256": "b24e039932f67e3225e09120446ebf4683c49d467a84c1eb872c45d90739d450"
  },
  "capture": {
    "path": "scripts/capture-gettysburg-v39-preservation.mjs",
    "sha256": "e94a23c3b15c21ad28fb5501c9801db2f45e9a125d95d95bad31918c2295f936"
  },
  "oldFixturesRefreshed": false,
  "oldMigrationLedgersEdited": false,
  "behavioralAssertionsChanged": false,
  "mandatoryRegistration": "package.json",
  "mandatorySuite": "scripts/test-gettysburg-v39-view-continuity.mjs",
  "migrations": [
    {
      "path": "package.json",
      "archive": "scripts/test-support/gettysburg-v39-before/package.json",
      "beforeSHA256": "6bf787c05a5d5d394ed8d5eec65278389c713ad1d6b8db216e12d4d98a8ff174",
      "currentSHA256": "51da7f70d11dc36f11ab4a842b2dbbcf18579414fb2d65afe45e3de8266196e2",
      "reason": "Only four mandatory v39 view-continuity script registrations; version, dependencies and lockfile unchanged."
    },
    {
      "path": "src/battle/CivilWarBattlefield.jsx",
      "archive": "scripts/test-support/gettysburg-v39-before/src/battle/CivilWarBattlefield.jsx",
      "beforeSHA256": "6eafd829c159bc3afe99ed784862dcfae59e4ef40b7210d64b4e02257451b6f8",
      "currentSHA256": "bd4c4a5d4c38332e94769b0cacd6b01406993521b2772d8c7861091c1391bee8",
      "reason": "Optional Gettysburg camera framing checkpoint and restore only; disabled Scene, combat, raw feet, artwork, shots and existing gates remain exact."
    },
    {
      "path": "scripts/test-support/gettysburgV38Preservation.mjs",
      "archive": "scripts/test-support/gettysburg-v39-before/scripts/test-support/gettysburgV38Preservation.mjs",
      "beforeSHA256": "72bb3ca8ee05a638ae28826e40e0815b11509b7e5e66dad94e26e55134601c8f",
      "currentSHA256": "315037b4fd7280d3a99f8305c3600a0f2da44083bedadc696aac86ae380eec38",
      "reason": "Only V39 historical-source import and metadata directRead return; every original V38 fixture, ledger and assertion remains byte exact."
    }
  ],
  "newSourcePins": [
    {
      "path": "src/battle/fieldViewCheckpoint.js",
      "sha256": "0535f77a62a6dd421cd4d786a9bb67435976240d1883200a94afb4bc85a54864"
    },
    {
      "path": "scripts/test-gettysburg-v39-view-continuity.mjs",
      "sha256": "8587ef3382d8e1cffd3e66d52c3ac175d7fc95222eb0e31081d7eec42eee23ec"
    },
    {
      "path": "docs/CIVIL_WAR_V39_VIEW_CONTINUITY.md",
      "sha256": "8f425a844e25b9e2bb3a25baf9bcd12535f0d72f69c7c53dd2a451cca637684c"
    },
    {
      "path": "scripts/test-support/gettysburgV39Regression.mjs",
      "sha256": "2c498c061942a0f44fced4ec91cac7007f7cee54382e461189d1c617a4598ff7"
    }
  ]
};

const runtimePaths = ['package.json', 'src/battle/CivilWarBattlefield.jsx'];
function directRead(path) {
  assert.ok(typeof path === 'string' && path.length > 0 && path.length <= 512 && !path.startsWith('/') && !path.includes('\\'), 'Canonical relative source path required');
  assert.equal(realpathSync(ROOT), ROOT.replace(/\/$/, ''), 'Physical canonical source root required');
  const parts = path.split('/');
  assert.ok(parts.every(part => part && part !== '.' && part !== '..'), 'Canonical relative source path required');
  for (let i = 1; i <= parts.length; i++) {
    const part = lstatSync(ROOT + parts.slice(0, i).join('/'));
    assert.equal(part.isSymbolicLink(), false, path);
    if (i < parts.length) assert.ok(part.isDirectory(), 'Physical source parent directory required');
  }
  const stat = lstatSync(ROOT + path); assert.ok(stat.isFile(), path);
  assert.ok(stat.size <= 2147483648, 'Bounded physical source file');
  const descriptor = openSync(ROOT + path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = fstatSync(descriptor);
    assert.ok(opened.isFile() && opened.size <= 2147483648, 'Bounded physical source descriptor');
    assert.equal(opened.dev, stat.dev); assert.equal(opened.ino, stat.ino); assert.equal(opened.size, stat.size);
    const bytes = readFileSync(descriptor);
    assert.equal(bytes.length, opened.size, 'Physical source size remains stable');
    const after = fstatSync(descriptor);
    assert.equal(after.size, opened.size); assert.equal(after.mtimeMs, opened.mtimeMs);
    return v40HistoricalSource(path);
  } finally { closeSync(descriptor); }
}
// Check descriptors before comparison: caller data must never execute getters.
function requirePlainData(value) {
  const seen = new Set(); let count = 0;
  const visit = (item, depth) => {
    assert.ok(++count <= 512 && depth <= 12, 'Bounded plain migration data required');
    if (item === null || typeof item === 'boolean') return;
    if (typeof item === 'string') { assert.ok(item.length <= 4096); return; }
    if (typeof item === 'number') { assert.ok(Number.isFinite(item)); return; }
    assert.equal(typeof item, 'object', 'Only plain migration data accepted');
    assert.equal(seen.has(item), false, 'No cyclic or shared caller objects'); seen.add(item);
    assert.equal(Object.getOwnPropertySymbols(item).length, 0, 'No symbol metadata');
    if (Array.isArray(item)) {
      assert.equal(Object.getPrototypeOf(item), Array.prototype);
      const length = Object.getOwnPropertyDescriptor(item, 'length');
      assert.ok(length && Object.hasOwn(length, 'value') && Number.isInteger(length.value) && length.value <= 32);
      assert.equal(Object.getOwnPropertyNames(item).length, length.value + 1, 'No sparse or extra array properties');
      for (let i = 0; i < length.value; i++) {
        const descriptor = Object.getOwnPropertyDescriptor(item, String(i));
        assert.ok(descriptor && Object.hasOwn(descriptor, 'value') && descriptor.enumerable, 'Dense data entries required');
        visit(descriptor.value, depth + 1);
      }
    } else {
      assert.equal(Object.getPrototypeOf(item), Object.prototype, 'Plain object required');
      const names = Object.getOwnPropertyNames(item); assert.ok(names.length <= 32, 'Bounded metadata fields');
      for (const name of names) {
        assert.ok(name.length > 0 && name.length <= 512, 'Bounded metadata key');
        assert.ok(!['__proto__', 'constructor', 'prototype'].includes(name), 'Reserved metadata key');
        const descriptor = Object.getOwnPropertyDescriptor(item, name);
        assert.ok(Object.hasOwn(descriptor, 'value') && descriptor.enumerable, 'Enumerable data fields required');
        visit(descriptor.value, depth + 1);
      }
    }
  };
  visit(value, 0);
}
function exactLine(text, line) { assert.equal(text.split('\n').filter(value => value === line).length, 1, line); }
function narrowAfter(path, before) {
  assert.equal(path, 'scripts/test-support/gettysburgV38Preservation.mjs', 'Only the declared V38 metadata adapter may transform');
  const anchor = "import { fileURLToPath } from 'node:url';", old = '    return bytes;';
  exactLine(before, anchor); exactLine(before, old);
  return before.replace(anchor, anchor + "\nimport { v39HistoricalSource } from './gettysburgV39Preservation.mjs';")
    .replace(old, '    return v39HistoricalSource(path);');
}
function verifyPackage(beforeBytes, currentBytes) {
  const before = JSON.parse(beforeBytes), current = JSON.parse(currentBytes);
  assert.equal(before.version, '0.31.0'); assert.equal(current.version, before.version);
  const transformed = JSON.parse(beforeBytes);
  for (const key of ['test', 'test:gettysburg-art-current', 'test:field-continuity']) transformed.scripts[key] += ' && npm run test:gettysburg-v39';
  transformed.scripts['test:gettysburg-v39'] = 'node --test --test-reporter=spec scripts/test-gettysburg-v39-view-continuity.mjs';
  assert.deepEqual(current, transformed, 'Only the four mandatory script fields may change');
  assert.equal(currentBytes.toString('utf8'), JSON.stringify(transformed, null, 2) + '\n', 'Exact whole-file package transformation required');
}
function authenticFixture() {
  const bytes = directRead(expected.fixture.path);
  assert.ok(bytes.length <= 2097152, 'Bounded immutable fixture bytes');
  assert.equal(sha(bytes), expected.fixture.sha256, 'Immutable authentic installed-v38 fixture');
  assert.equal(sha(directRead(expected.capture.path)), expected.capture.sha256, 'Immutable authentic LIVE capture script');
  const fixture = JSON.parse(bytes);
  assert.equal(fixture.schema, 'gettysburg-v39-authentic-installed-v38-baseline-v1');
  assert.equal(fixture.capturedFrom, '/Users/titansforge/Vault/Titans_of_War');
  assert.equal(fixture.artPass, 'gettysburg-v32');
  assert.equal(fixture.baselineSHA256, expected.baselineSHA256);
  assert.equal(fixture.baselineFiles, 1615); assert.equal(fixture.baselineBytes, 558140095);
  assert.equal(fixture.initialCopyReceiptSHA256, 'fae11e0f565eedd71c9d9d56beda0eb5dd15f5a9ac4e7118f99ba285f62e4faa');
  assert.equal(fixture.sourceFiles.length, 3); assert.equal(fixture.protectedFiles.length, 1612);
  assert.ok(fixture.baselineFiles <= 2000 && fixture.baselineBytes <= 2147483648, 'Bounded complete authentic fixture');
  assert.equal(fixture.oldFixturesRefreshed, false); assert.equal(fixture.oldMigrationLedgersEdited, false);
  assert.equal(fixture.behavioralAssertionsChanged, false);
  assert.deepEqual(fixture.sourceFiles.map(value => value.path), expected.migrations.map(value => value.path));
  const scene = fixture.sourceFiles.find(value => value.path === 'src/battle/CivilWarBattlefield.jsx');
  assert.ok(scene, 'Battle Scene belongs to the declared view-continuity migration');
  assert.equal(fixture.sceneSHA256, scene.sha256);
  for (const record of expected.migrations) {
    const original = fixture.sourceFiles.find(value => value.path === record.path);
    assert.equal(original.sha256, record.beforeSHA256); assert.equal(original.candidateCopyBeforeSHA256, record.beforeSHA256);
    assert.equal(original.archive, record.archive);
    const archive = directRead(record.archive);
    assert.equal(sha(archive), record.beforeSHA256, record.path + ' authentic archive');
    assert.equal(archive.length, original.bytes);
  }
  assert.equal(new Set([...fixture.sourceFiles, ...fixture.protectedFiles].map(row => row.path)).size, 1615);
  assert.equal([...fixture.sourceFiles, ...fixture.protectedFiles].reduce((sum, row) => sum + row.bytes, 0), 558140095);
  for (const record of [fixture.oldFixture, fixture.oldLedger]) {
    const original = fixture.protectedFiles.find(row => row.path === record.path);
    assert.ok(original, 'Prior immutable metadata is protected');
    assert.equal(record.sha256, original.sha256);
    assert.equal(sha(directRead(record.path)), record.sha256, 'Unchanged prior fixture or ledger: ' + record.path);
  }
  assert.equal(fixture.oldFixture.path, 'scripts/fixtures/gettysburg-v38-preservation.json');
  assert.equal(fixture.oldLedger.path, 'scripts/fixtures/gettysburg-v38-migrations.json');
  return fixture;
}
function exactDraft(ledger) {
  requirePlainData(ledger);
  assert.deepEqual(ledger, expected, 'Only the exact three-path V39 migration metadata is accepted');
  authenticFixture(); return ledger;
}
function readLedger() {
  const raw = directRead(ledgerPath); assert.ok(raw.length <= 65536, 'Bounded migration ledger bytes'); assert.equal(sha(raw), ledgerSHA256, 'Exact fixed ledger bytes required');
  return exactDraft(JSON.parse(raw));
}
function pendingError() {
  const error = new Error('V39 Production and new source hashes await explicit reviewed final pins.');
  error.code = 'V39_RUNTIME_PINS_PENDING'; return error;
}
// Draft inspection approves no runtime. It permits independent review of the
// exact archived bytes, metadata adapter and four registration transformations.
export function verifyGettysburgV39MetadataMigrations() {
  readLedger();
  const paths = expected.migrations.filter(record => !runtimePaths.includes(record.path));
  for (const record of paths) {
    const before = directRead(record.archive), current = directRead(record.path);
    assert.equal(sha(current), record.currentSHA256, record.path + ' fixed metadata bytes');
    assert.equal(current.toString('utf8'), narrowAfter(record.path, before.toString('utf8')), 'Behavioral assertions/current imports stay byte exact: ' + record.path);
  }
  const record = expected.migrations.find(row => row.path === 'package.json');
  verifyPackage(directRead(record.archive), directRead(record.path));
  return { metadataPaths: paths.map(record => record.path), metadataPathsVerified: 1, packageScriptFieldsVerified: 4, archivedBeforeFiles: 3,
    runtimePinsPending: expected.migrations.some(record => record.currentSHA256 === null) || expected.newSourcePins.some(record => record.sha256 === null), oldFixturesRefreshed: false, oldMigrationLedgersEdited: false };
}
export function validateGettysburgV39MigrationLedger(ledger) {
  exactDraft(ledger);
  if (ledger.migrations.some(record => record.currentSHA256 === null) || ledger.newSourcePins.some(record => record.sha256 === null)) throw pendingError();
  assert.equal(ledger.status, 'frozen-approved-runtime-pins');
  for (const record of ledger.migrations) {
    assert.match(record.currentSHA256, /^[0-9a-f]{64}$/);
    const before = directRead(record.archive), current = directRead(record.path);
    assert.equal(sha(current), record.currentSHA256, record.path + ' explicitly pinned current bytes');
    if (record.path === 'package.json') verifyPackage(before, current);
    if (!runtimePaths.includes(record.path)) assert.equal(current.toString('utf8'), narrowAfter(record.path, before.toString('utf8')));
  }
  for (const record of ledger.newSourcePins) {
    assert.match(record.sha256, /^[0-9a-f]{64}$/);
    assert.equal(sha(directRead(record.path)), record.sha256, record.path + ' explicitly pinned new source bytes');
  }
  const fixture = authenticFixture(), started = performance.now(); let bytes = 0;
  for (const record of fixture.protectedFiles) {
    const current = directRead(record.path); bytes += current.length;
    assert.ok(bytes <= 2147483648 && performance.now() - started <= 90000, 'Bounded complete protected baseline required');
    assert.equal(sha(current), record.sha256, 'Protected current baseline bytes: ' + record.path);
  }
  return ledger;
}
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
let checked;
export function gettysburgV39MigrationLedger() {
  const ledger = readLedger();
  if (!checked) checked = freeze(validateGettysburgV39MigrationLedger(ledger));
  return checked;
}
export function v39BeforeFile(path) {
  assert.ok(typeof path === 'string');
  const record = expected.migrations.find(value => value.path === path);
  assert.ok(record, 'Only three declared authentic snapshots may be read');
  readLedger();
  const bytes = directRead(record.archive); assert.equal(sha(bytes), record.beforeSHA256); return bytes;
}
// Metadata/protected-byte assertions only. Runtime component/Scene/modules, behavioral
// tests and save/engine imports always consume current physical candidate code.
export function v39HistoricalSource(path, requestedPath = undefined) {
  if (requestedPath !== undefined) {
    const resolved = requestedPath instanceof URL ? fileURLToPath(requestedPath) : requestedPath;
    assert.equal(resolved, ROOT + path, 'Historical reader cannot cross candidate roots');
  }
  const current = directRead(path), record = expected.migrations.find(value => value.path === path);
  if (!record) return current;
  gettysburgV39MigrationLedger();
  assert.equal(sha(current), record.currentSHA256, path + ' current bytes remain pinned');
  return v39BeforeFile(path);
}
export const GETTYSBURG_V39_MIGRATION_PATHS = Object.freeze(expected.migrations.map(record => record.path));
