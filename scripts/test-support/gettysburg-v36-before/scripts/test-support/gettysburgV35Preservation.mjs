import assert from 'node:assert/strict';
import { readFileSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Independent metadata reader: never imports an older migration helper.
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ledgerPath = 'scripts/fixtures/gettysburg-v35-migrations.json';
const ledgerSHA256 = 'd30dc0bafd1507ad9b588420c66ef1f82a68a960fca7fab8b2b545a9adf58400';
const expected = {
  "schema": "gettysburg-v35-historical-byte-migration-v1",
  "status": "frozen-approved-runtime-pins",
  "baselineSHA256": "3311882e3a8d84e361ea65269a9d685bf4431a9980c73084577b23cfae4dcca8",
  "baselineFiles": 1573,
  "fixture": {
    "path": "scripts/fixtures/gettysburg-v35-preservation.json",
    "sha256": "5aa8267f612bb1e4f21c7e327c76e9cbc7906ba3cc256074ea03b21167f049fd"
  },
  "capture": {
    "path": "scripts/capture-gettysburg-v35-preservation.mjs",
    "sha256": "060ca05d03d965b6454c54063aba24cd2f6b7d394da9b04569c7d39c52fa47d2"
  },
  "oldFixturesRefreshed": false,
  "oldMigrationLedgersEdited": false,
  "behavioralAssertionsChanged": false,
  "mandatoryRegistration": "package.json",
  "mandatorySuite": "scripts/test-gettysburg-v35-animation-continuity.mjs",
  "migrations": [
    {
      "path": "package.json",
      "archive": "scripts/test-support/gettysburg-v35-before/package.json",
      "beforeSHA256": "db71d1598d7a233dee94c817410bbdc736cf558c910115149623b3cc18b91259",
      "currentSHA256": "cfb61c1c4ec8d0eaf64456f2a455507acb4e87d1c30959c7765b42d14029c0e9",
      "reason": "Only four mandatory v35 script registrations; version, dependencies and lockfile unchanged."
    },
    {
      "path": "src/battle/CivilWarBattlefield.jsx",
      "archive": "scripts/test-support/gettysburg-v35-before/src/battle/CivilWarBattlefield.jsx",
      "beforeSHA256": "6cb8988dcac1dbf2296ea5101950211ff7a52dcda336b9eb6b6cfa46084a700e",
      "currentSHA256": "84ba901a36fc892ff09d26fc09aa0a767f67ea61a21f0eeaa016f6a42cf7b516",
      "reason": "Renderer first-draw lifecycle only, independently gated canonical animationContinuity=v35; standardContinuity=v34 and contactLayout=v33 remain independent; no new serialized sidecar."
    },
    {
      "path": "scripts/test-support/gettysburgV34Preservation.mjs",
      "archive": "scripts/test-support/gettysburg-v35-before/scripts/test-support/gettysburgV34Preservation.mjs",
      "beforeSHA256": "5a47243636fb2e1298b792b491398a79da81c61c4626493732e3607ac180e15e",
      "currentSHA256": "395d3fb0e73ccdfe9da510347b6b53fe69d45d475a0be601fd19c7b97480acc6",
      "reason": "Only metadata directRead import and V35 historical reader call; original V34 ledger and every behavioral assertion remain byte exact."
    }
  ]
};

const runtimePaths = ['package.json', 'src/battle/CivilWarBattlefield.jsx'];
function directRead(path) {
  assert.ok(typeof path === 'string' && path.length > 0 && path.length <= 512 && !path.startsWith('/') && !path.includes('\\'), 'Canonical relative source path required');
  const parts = path.split('/');
  assert.ok(parts.every(part => part && part !== '.' && part !== '..'), 'Canonical relative source path required');
  for (let i = 1; i <= parts.length; i++) assert.equal(lstatSync(ROOT + parts.slice(0, i).join('/')).isSymbolicLink(), false, path);
  assert.ok(lstatSync(ROOT + path).isFile(), path);
  return readFileSync(ROOT + path);
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
      for (const name of Object.getOwnPropertyNames(item)) {
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
  assert.equal(path, 'scripts/test-support/gettysburgV34Preservation.mjs', 'Only the declared V34 metadata adapter may transform');
  const anchor = "import { fileURLToPath } from 'node:url';", old = '  return readFileSync(ROOT + path);';
  exactLine(before, anchor); exactLine(before, old);
  return before.replace(anchor, anchor + "\nimport { v35HistoricalSource } from './gettysburgV35Preservation.mjs';")
    .replace(old, '  return v35HistoricalSource(path);');
}
function verifyPackage(beforeBytes, currentBytes) {
  const before = JSON.parse(beforeBytes), current = JSON.parse(currentBytes);
  assert.equal(before.version, '0.31.0'); assert.equal(current.version, before.version);
  const transformed = JSON.parse(beforeBytes);
  for (const key of ['test', 'test:gettysburg-art-current', 'test:field-continuity']) transformed.scripts[key] += ' && npm run test:gettysburg-v35';
  transformed.scripts['test:gettysburg-v35'] = 'node --test --test-reporter=spec scripts/test-gettysburg-v35-animation-continuity.mjs';
  assert.deepEqual(current, transformed, 'Only the four mandatory script fields may change');
  assert.equal(currentBytes.toString('utf8'), JSON.stringify(transformed, null, 2) + '\n', 'Exact whole-file package transformation required');
}
function authenticFixture() {
  const bytes = directRead(expected.fixture.path);
  assert.equal(sha(bytes), expected.fixture.sha256, 'Immutable authentic installed-v34 fixture');
  assert.equal(sha(directRead(expected.capture.path)), expected.capture.sha256, 'Immutable authentic live capture script');
  const fixture = JSON.parse(bytes);
  assert.equal(fixture.schema, 'gettysburg-v35-authentic-installed-v34-baseline-v1');
  assert.equal(fixture.baselineSHA256, expected.baselineSHA256); assert.equal(fixture.baselineFiles, 1573); assert.equal(fixture.baselineBytes, 551190101);
  assert.equal(fixture.sourceFiles.length, 3); assert.equal(fixture.protectedFiles.length, 1570);
  assert.equal(fixture.oldFixturesRefreshed, false); assert.equal(fixture.oldMigrationLedgersEdited, false);
  assert.equal(fixture.freshCanonicalWitnessesEqual, true);
  assert.deepEqual(fixture.sourceFiles.map(value => value.path), expected.migrations.map(value => value.path));
  for (const record of expected.migrations) {
    const original = fixture.sourceFiles.find(value => value.path === record.path);
    assert.equal(original.sha256, record.beforeSHA256); assert.equal(original.candidateCopyBeforeSHA256, record.beforeSHA256);
    assert.equal(original.archive, record.archive);
    assert.equal(sha(directRead(record.archive)), record.beforeSHA256, record.path + ' authentic archive');
  }
  assert.equal(sha(directRead(fixture.oldFixture.path)), fixture.oldFixture.sha256, 'Unchanged canonical V34 fixture');
  return fixture;
}
function exactDraft(ledger) {
  requirePlainData(ledger);
  assert.deepEqual(ledger, expected, 'Only the exact three-path reviewed V35 migration is accepted');
  authenticFixture(); return ledger;
}
function readLedger() {
  const raw = directRead(ledgerPath); assert.equal(sha(raw), ledgerSHA256, 'Exact fixed ledger bytes required');
  return exactDraft(JSON.parse(raw));
}
function pendingError() {
  const error = new Error('V35 Scene and package hashes await explicit approved final pins.');
  error.code = 'V35_RUNTIME_PINS_PENDING'; return error;
}
// Draft inspection approves no runtime. It permits independent review of the
// exact archived bytes, metadata adapter and four registration transformations.
export function verifyGettysburgV35MetadataMigrations() {
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
    runtimePinsPending: expected.migrations.some(record => record.currentSHA256 === null), oldFixturesRefreshed: false, oldMigrationLedgersEdited: false };
}
export function validateGettysburgV35MigrationLedger(ledger) {
  exactDraft(ledger);
  if (ledger.migrations.some(record => record.currentSHA256 === null)) throw pendingError();
  assert.equal(ledger.status, 'frozen-approved-runtime-pins');
  for (const record of ledger.migrations) {
    assert.match(record.currentSHA256, /^[0-9a-f]{64}$/);
    const before = directRead(record.archive), current = directRead(record.path);
    assert.equal(sha(current), record.currentSHA256, record.path + ' explicitly pinned current bytes');
    if (record.path === 'package.json') verifyPackage(before, current);
    if (!runtimePaths.includes(record.path)) assert.equal(current.toString('utf8'), narrowAfter(record.path, before.toString('utf8')));
  }
  const fixture = authenticFixture(), started = performance.now(); let bytes = 0;
  for (const record of fixture.protectedFiles) {
    const current = directRead(record.path); bytes += current.length;
    assert.ok(bytes <= 2147483648 && performance.now() - started <= 90000, 'Bounded complete protected baseline required');
    assert.equal(sha(current), record.sha256, 'Protected current baseline bytes: ' + record.path);
  }
  for (const record of fixture.dependencies) assert.equal(sha(directRead(record.path)), record.sha256, 'Protected current runtime dependency: ' + record.path);
  return ledger;
}
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
let checked;
export function gettysburgV35MigrationLedger() {
  const ledger = readLedger();
  if (!checked) checked = freeze(validateGettysburgV35MigrationLedger(ledger));
  return checked;
}
export function v35BeforeFile(path) {
  assert.ok(typeof path === 'string');
  const record = expected.migrations.find(value => value.path === path);
  assert.ok(record, 'Only three declared authentic snapshots may be read');
  readLedger();
  const bytes = directRead(record.archive); assert.equal(sha(bytes), record.beforeSHA256); return bytes;
}
// Metadata/protected-byte assertions only. Runtime Scene/modules, behavioral
// tests and save/engine imports always consume current physical candidate code.
export function v35HistoricalSource(path, requestedPath = undefined) {
  if (requestedPath !== undefined) {
    const resolved = requestedPath instanceof URL ? fileURLToPath(requestedPath) : requestedPath;
    assert.equal(resolved, ROOT + path, 'Historical reader cannot cross candidate roots');
  }
  const current = directRead(path), record = expected.migrations.find(value => value.path === path);
  if (!record) return current;
  gettysburgV35MigrationLedger();
  assert.equal(sha(current), record.currentSHA256, path + ' current bytes remain pinned');
  return v35BeforeFile(path);
}
export const GETTYSBURG_V35_MIGRATION_PATHS = Object.freeze(expected.migrations.map(record => record.path));
