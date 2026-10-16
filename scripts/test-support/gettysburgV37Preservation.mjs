import assert from 'node:assert/strict';
import { readFileSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { v38HistoricalSource } from './gettysburgV38Preservation.mjs';

// Independent metadata reader: never imports an older migration helper.
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ledgerPath = 'scripts/fixtures/gettysburg-v37-migrations.json';
const ledgerSHA256 = 'ecffb5dc52a6535b6588558d1191a011e9cbbaec5350605ba85fa0c5eaadc0f5';
const expected = {
  "schema": "gettysburg-v37-historical-byte-migration-v1",
  "status": "frozen-approved-runtime-pins",
  "baselineSHA256": "5d173c32873db1d5a2d82dc9d3f692a4f8e83ad879f5089f6084833aef985d65",
  "baselineFiles": 1596,
  "baselineBytes": 557196222,
  "fixture": {
    "path": "scripts/fixtures/gettysburg-v37-preservation.json",
    "sha256": "1f7c3dbfc7eb4bac60dbd6bf44457a97a95531fcd319f083ccfb2664b1db434e"
  },
  "capture": {
    "path": "scripts/capture-gettysburg-v37-preservation.mjs",
    "sha256": "7ffb7696e36087dad20a3c9e76742f62f7cb5882a863ab39e2ff26d6a87271f9"
  },
  "oldFixturesRefreshed": false,
  "oldMigrationLedgersEdited": false,
  "behavioralAssertionsChanged": false,
  "mandatoryRegistration": "package.json",
  "mandatorySuite": "scripts/test-gettysburg-v37-rank-readability.mjs",
  "migrations": [
    {
      "path": "package.json",
      "archive": "scripts/test-support/gettysburg-v37-before/package.json",
      "beforeSHA256": "be299127e141ec1f282c6306dea5b69c04441f06c696e79b7215d25433e30df4",
      "currentSHA256": "96fa03c5ae8c1165c56cdd664ba2ddee4f4727a2198c4522600448068119d458",
      "reason": "Only four mandatory v37 script registrations; version, dependencies and lockfile unchanged."
    },
    {
      "path": "src/battle/CivilWarBattlefield.jsx",
      "archive": "scripts/test-support/gettysburg-v37-before/src/battle/CivilWarBattlefield.jsx",
      "beforeSHA256": "6e3e7db89428b1d87db551a5945b92e96b88fd2dac3ffdd26023b761efdc166a",
      "currentSHA256": "6eafd829c159bc3afe99ed784862dcfae59e4ef40b7210d64b4e02257451b6f8",
      "reason": "Independent canonical rankReadability=v37 gate with artPass=gettysburg-v32 enables the existing uniform 0.74 infantry presentation scale for every pose and fresh shot geometry; optional gate absence preserves installed v36."
    },
    {
      "path": "scripts/test-support/gettysburgV36Preservation.mjs",
      "archive": "scripts/test-support/gettysburg-v37-before/scripts/test-support/gettysburgV36Preservation.mjs",
      "beforeSHA256": "a75e8a6bd2e3236c4c08e243ed203e4551a560950b662b468876b67a414c2f81",
      "currentSHA256": "463db0cac6a15fb51b97b190d848842aad3b7c258b14510aa951f3565eab375e",
      "reason": "Only metadata directRead import and V37 historical reader call; original V36 ledger, fixtures and every behavioral assertion remain byte exact."
    }
  ],
  "newSourcePins": [
    {
      "path": "scripts/test-gettysburg-v37-rank-readability.mjs",
      "sha256": "717e895d0195df188068e039c2699285978859348f447ee6bfc74dd3d9372115"
    },
    {
      "path": "docs/CIVIL_WAR_V37_RANK_READABILITY.md",
      "sha256": "3852027e26e34a91910b8c662a762d96831179c927693eeb09d3af5f996bc275"
    }
  ]
};

const runtimePaths = ['package.json', 'src/battle/CivilWarBattlefield.jsx'];
function directRead(path) {
  assert.ok(typeof path === 'string' && path.length > 0 && path.length <= 512 && !path.startsWith('/') && !path.includes('\\'), 'Canonical relative source path required');
  const parts = path.split('/');
  assert.ok(parts.every(part => part && part !== '.' && part !== '..'), 'Canonical relative source path required');
  for (let i = 1; i <= parts.length; i++) assert.equal(lstatSync(ROOT + parts.slice(0, i).join('/')).isSymbolicLink(), false, path);
  const stat = lstatSync(ROOT + path); assert.ok(stat.isFile(), path);
  assert.ok(stat.size <= 2147483648, 'Bounded physical source file');
  return v38HistoricalSource(path);
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
  assert.equal(path, 'scripts/test-support/gettysburgV36Preservation.mjs', 'Only the declared V36 metadata adapter may transform');
  const anchor = "import { fileURLToPath } from 'node:url';", old = '  return readFileSync(ROOT + path);';
  exactLine(before, anchor); exactLine(before, old);
  return before.replace(anchor, anchor + "\nimport { v37HistoricalSource } from './gettysburgV37Preservation.mjs';")
    .replace(old, '  return v37HistoricalSource(path);');
}
function verifyPackage(beforeBytes, currentBytes) {
  const before = JSON.parse(beforeBytes), current = JSON.parse(currentBytes);
  assert.equal(before.version, '0.31.0'); assert.equal(current.version, before.version);
  const transformed = JSON.parse(beforeBytes);
  for (const key of ['test', 'test:gettysburg-art-current', 'test:field-continuity']) transformed.scripts[key] += ' && npm run test:gettysburg-v37';
  transformed.scripts['test:gettysburg-v37'] = 'node --test --test-reporter=spec scripts/test-gettysburg-v37-rank-readability.mjs';
  assert.deepEqual(current, transformed, 'Only the four mandatory script fields may change');
  assert.equal(currentBytes.toString('utf8'), JSON.stringify(transformed, null, 2) + '\n', 'Exact whole-file package transformation required');
}
function authenticFixture() {
  const bytes = directRead(expected.fixture.path);
  assert.ok(bytes.length <= 2097152, 'Bounded immutable fixture bytes');
  assert.equal(sha(bytes), expected.fixture.sha256, 'Immutable authentic installed-v36 fixture');
  assert.equal(sha(directRead(expected.capture.path)), expected.capture.sha256, 'Immutable authentic LIVE capture script');
  const fixture = JSON.parse(bytes);
  assert.equal(fixture.schema, 'gettysburg-v37-authentic-installed-v36-baseline-v1');
  assert.equal(fixture.capturedFrom, '/Users/titansforge/Vault/Titans_of_War');
  assert.equal(fixture.artPass, 'gettysburg-v32');
  assert.equal(fixture.baselineSHA256, expected.baselineSHA256);
  assert.equal(fixture.baselineFiles, 1596); assert.equal(fixture.baselineBytes, 557196222);
  assert.equal(fixture.initialCopyReceiptSHA256, 'a50ea4d59e2da7ec9d920a62ca4aa3226ab86e39f6cfcf8698cb354074f10401');
  assert.equal(fixture.sourceFiles.length, 3); assert.equal(fixture.protectedFiles.length, 1593);
  assert.equal(fixture.oldFixturesRefreshed, false); assert.equal(fixture.oldMigrationLedgersEdited, false);
  assert.equal(fixture.behavioralAssertionsChanged, false);
  assert.deepEqual(fixture.sourceFiles.map(value => value.path), expected.migrations.map(value => value.path));
  assert.equal(fixture.sceneSHA256, expected.migrations.find(value => value.path === 'src/battle/CivilWarBattlefield.jsx').beforeSHA256);
  for (const record of expected.migrations) {
    const original = fixture.sourceFiles.find(value => value.path === record.path);
    assert.equal(original.sha256, record.beforeSHA256); assert.equal(original.candidateCopyBeforeSHA256, record.beforeSHA256);
    assert.equal(original.archive, record.archive);
    const archive = directRead(record.archive);
    assert.equal(sha(archive), record.beforeSHA256, record.path + ' authentic archive');
    assert.equal(archive.length, original.bytes);
  }
  assert.equal(new Set([...fixture.sourceFiles, ...fixture.protectedFiles].map(row => row.path)).size, 1596);
  assert.equal([...fixture.sourceFiles, ...fixture.protectedFiles].reduce((sum, row) => sum + row.bytes, 0), 557196222);
  for (const record of [fixture.oldFixture, fixture.oldLedger]) {
    const original = fixture.protectedFiles.find(row => row.path === record.path);
    assert.ok(original, 'Prior immutable metadata is protected');
    assert.equal(record.sha256, original.sha256);
    assert.equal(sha(directRead(record.path)), record.sha256, 'Unchanged prior fixture or ledger: ' + record.path);
  }
  assert.equal(fixture.oldFixture.path, 'scripts/fixtures/gettysburg-v36-preservation.json');
  assert.equal(fixture.oldLedger.path, 'scripts/fixtures/gettysburg-v36-migrations.json');
  return fixture;
}
function exactDraft(ledger) {
  requirePlainData(ledger);
  assert.deepEqual(ledger, expected, 'Only the exact three-path V37 migration metadata is accepted');
  authenticFixture(); return ledger;
}
function readLedger() {
  const raw = directRead(ledgerPath); assert.ok(raw.length <= 65536, 'Bounded migration ledger bytes'); assert.equal(sha(raw), ledgerSHA256, 'Exact fixed ledger bytes required');
  return exactDraft(JSON.parse(raw));
}
function pendingError() {
  const error = new Error('V37 Scene and new source hashes await explicit reviewed final pins.');
  error.code = 'V37_RUNTIME_PINS_PENDING'; return error;
}
// Draft inspection approves no runtime. It permits independent review of the
// exact archived bytes, metadata adapter and four registration transformations.
export function verifyGettysburgV37MetadataMigrations() {
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
export function validateGettysburgV37MigrationLedger(ledger) {
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
export function gettysburgV37MigrationLedger() {
  const ledger = readLedger();
  if (!checked) checked = freeze(validateGettysburgV37MigrationLedger(ledger));
  return checked;
}
export function v37BeforeFile(path) {
  assert.ok(typeof path === 'string');
  const record = expected.migrations.find(value => value.path === path);
  assert.ok(record, 'Only three declared authentic snapshots may be read');
  readLedger();
  const bytes = directRead(record.archive); assert.equal(sha(bytes), record.beforeSHA256); return bytes;
}
// Metadata/protected-byte assertions only. Runtime Scene/modules, behavioral
// tests and save/engine imports always consume current physical candidate code.
export function v37HistoricalSource(path, requestedPath = undefined) {
  if (requestedPath !== undefined) {
    const resolved = requestedPath instanceof URL ? fileURLToPath(requestedPath) : requestedPath;
    assert.equal(resolved, ROOT + path, 'Historical reader cannot cross candidate roots');
  }
  const current = directRead(path), record = expected.migrations.find(value => value.path === path);
  if (!record) return current;
  gettysburgV37MigrationLedger();
  assert.equal(sha(current), record.currentSHA256, path + ' current bytes remain pinned');
  return v37BeforeFile(path);
}
export const GETTYSBURG_V37_MIGRATION_PATHS = Object.freeze(expected.migrations.map(record => record.path));
