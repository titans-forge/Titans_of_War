import assert from 'node:assert/strict';
import { readFileSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { v37HistoricalSource } from './gettysburgV37Preservation.mjs';

// Independent metadata reader: never imports an older migration helper.
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ledgerPath = 'scripts/fixtures/gettysburg-v36-migrations.json';
const ledgerSHA256 = '4046733a1825d347d5947363ed96be211d265412b1f8c2748e0529710ef6695b';
const expected = {
  "schema": "gettysburg-v36-historical-byte-migration-v1",
  "status": "frozen-approved-runtime-pins",
  "baselineSHA256": "3e8971398ca8bba9ddf4238ea2c549e5012b1b0ff441473a531d331f54160894",
  "baselineFiles": 1584,
  "fixture": {
    "path": "scripts/fixtures/gettysburg-v36-preservation.json",
    "sha256": "cff10ef54fe5813aaf6daddaab62bf5aa1686a58b76b31361f9b54d13d95d566"
  },
  "capture": {
    "path": "scripts/capture-gettysburg-v36-preservation.mjs",
    "sha256": "538c3b07a6e72884ff40258347800add17e0d00b709bedc205f0e5479d7e3115"
  },
  "oldFixturesRefreshed": false,
  "oldMigrationLedgersEdited": false,
  "behavioralAssertionsChanged": false,
  "mandatoryRegistration": "package.json",
  "mandatorySuite": "scripts/test-gettysburg-v36-dust-continuity.mjs",
  "migrations": [
    {
      "path": "package.json",
      "archive": "scripts/test-support/gettysburg-v36-before/package.json",
      "beforeSHA256": "cfb61c1c4ec8d0eaf64456f2a455507acb4e87d1c30959c7765b42d14029c0e9",
      "currentSHA256": "be299127e141ec1f282c6306dea5b69c04441f06c696e79b7215d25433e30df4",
      "reason": "Only four mandatory v36 script registrations; version, dependencies and lockfile unchanged."
    },
    {
      "path": "src/battle/CivilWarBattlefield.jsx",
      "archive": "scripts/test-support/gettysburg-v36-before/src/battle/CivilWarBattlefield.jsx",
      "beforeSHA256": "84ba901a36fc892ff09d26fc09aa0a767f67ea61a21f0eeaa016f6a42cf7b516",
      "currentSHA256": "6e3e7db89428b1d87db551a5945b92e96b88fd2dac3ffdd26023b761efdc166a",
      "reason": "Cosmetic transient travel-dust checkpoint continuity only, independently gated canonical dustContinuity=v36 with artPass=gettysburg-v32; raw formation/body/standard/shots/combat and other optional gates remain preserved."
    },
    {
      "path": "scripts/test-support/gettysburgV35Preservation.mjs",
      "archive": "scripts/test-support/gettysburg-v36-before/scripts/test-support/gettysburgV35Preservation.mjs",
      "beforeSHA256": "12d5d85f1258ae138eab3ba6ecde03010c252784a75a34eb74ed8e93ab581920",
      "currentSHA256": "faaf8bf9688aba0f2bf7c6837538cfad7059096c9341c400e6d96516ff4ee341",
      "reason": "Only metadata directRead import and V36 historical reader call; original V35 ledger, fixtures and every behavioral assertion remain byte exact."
    }
  ],
  "newSourcePins": [
    {
      "path": "src/battle/gettysburgDustCheckpoint.js",
      "sha256": "e293eedf3127f9c02638f4c597747bd5e456db7c1a7ca38673fa8f444c5b2baa"
    },
    {
      "path": "scripts/test-gettysburg-v36-dust-continuity.mjs",
      "sha256": "715367eaa512a22df2e371ddd39e106e264ac3e0367df3a645ff86eb3f950147"
    },
    {
      "path": "scripts/test-support/gettysburgV36Regression.mjs",
      "sha256": "d13588deb475c7f77532158a87f208a47c5d72bb7df6b59517a68e7405c3f81a"
    },
    {
      "path": "scripts/fixtures/gettysburg-v36-owned-save.json",
      "sha256": "c70c58c96ca47705742dfd19fc88436e6d56613113fe70189e5501736ef6b300"
    },
    {
      "path": "docs/CIVIL_WAR_V36_DUST_CONTINUITY.md",
      "sha256": "0763336b73f5ea74a0fd543b0e430882ea6d5de1daed12a382a0a87060b11bbd"
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
  return v37HistoricalSource(path);
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
  assert.equal(path, 'scripts/test-support/gettysburgV35Preservation.mjs', 'Only the declared V35 metadata adapter may transform');
  const anchor = "import { fileURLToPath } from 'node:url';", old = '  return readFileSync(ROOT + path);';
  exactLine(before, anchor); exactLine(before, old);
  return before.replace(anchor, anchor + "\nimport { v36HistoricalSource } from './gettysburgV36Preservation.mjs';")
    .replace(old, '  return v36HistoricalSource(path);');
}
function verifyPackage(beforeBytes, currentBytes) {
  const before = JSON.parse(beforeBytes), current = JSON.parse(currentBytes);
  assert.equal(before.version, '0.31.0'); assert.equal(current.version, before.version);
  const transformed = JSON.parse(beforeBytes);
  for (const key of ['test', 'test:gettysburg-art-current', 'test:field-continuity']) transformed.scripts[key] += ' && npm run test:gettysburg-v36';
  transformed.scripts['test:gettysburg-v36'] = 'node --test --test-reporter=spec scripts/test-gettysburg-v36-dust-continuity.mjs';
  assert.deepEqual(current, transformed, 'Only the four mandatory script fields may change');
  assert.equal(currentBytes.toString('utf8'), JSON.stringify(transformed, null, 2) + '\n', 'Exact whole-file package transformation required');
}
function authenticFixture() {
  const bytes = directRead(expected.fixture.path);
  assert.equal(sha(bytes), expected.fixture.sha256, 'Immutable authentic installed-v35 fixture');
  assert.equal(sha(directRead(expected.capture.path)), expected.capture.sha256, 'Immutable authentic live capture script');
  const fixture = JSON.parse(bytes);
  assert.equal(fixture.schema, 'gettysburg-v36-authentic-installed-v35-baseline-v1');
  assert.equal(fixture.baselineSHA256, expected.baselineSHA256); assert.equal(fixture.baselineFiles, 1584); assert.equal(fixture.baselineBytes, 554162121);
  assert.equal(fixture.sourceFiles.length, 3); assert.equal(fixture.protectedFiles.length, 1581);
  assert.equal(fixture.oldFixturesRefreshed, false); assert.equal(fixture.oldMigrationLedgersEdited, false);
  assert.equal(fixture.freshCanonicalWitnessesEqual, true);
  assert.equal(fixture.queryRows.length, 46); assert.equal(fixture.sceneRows.length, 336); assert.equal(fixture.coldRows.length, 12);
  assert.equal(fixture.v34GateRows.length, 4); assert.equal(fixture.v35GateRows.length, 8);
  assert.equal(sha(directRead(fixture.v35OwnedSave.path)), fixture.v35OwnedSave.sha256, 'Immutable native v35 owned primitive save');
  assert.deepEqual(fixture.sourceFiles.map(value => value.path), expected.migrations.map(value => value.path));
  for (const record of expected.migrations) {
    const original = fixture.sourceFiles.find(value => value.path === record.path);
    assert.equal(original.sha256, record.beforeSHA256); assert.equal(original.candidateCopyBeforeSHA256, record.beforeSHA256);
    assert.equal(original.archive, record.archive);
    assert.equal(sha(directRead(record.archive)), record.beforeSHA256, record.path + ' authentic archive');
  }
  assert.equal(sha(directRead(fixture.oldFixture.path)), fixture.oldFixture.sha256, 'Unchanged canonical V35 fixture');
  return fixture;
}
function exactDraft(ledger) {
  requirePlainData(ledger);
  assert.deepEqual(ledger, expected, 'Only the exact three-path reviewed V36 migration is accepted');
  authenticFixture(); return ledger;
}
function readLedger() {
  const raw = directRead(ledgerPath); assert.equal(sha(raw), ledgerSHA256, 'Exact fixed ledger bytes required');
  return exactDraft(JSON.parse(raw));
}
function pendingError() {
  const error = new Error('V36 Scene and new source hashes await explicit reviewed final pins.');
  error.code = 'V36_RUNTIME_PINS_PENDING'; return error;
}
// Draft inspection approves no runtime. It permits independent review of the
// exact archived bytes, metadata adapter and four registration transformations.
export function verifyGettysburgV36MetadataMigrations() {
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
export function validateGettysburgV36MigrationLedger(ledger) {
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
  for (const record of fixture.dependencies) assert.equal(sha(directRead(record.path)), record.sha256, 'Protected current runtime dependency: ' + record.path);
  return ledger;
}
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
let checked;
export function gettysburgV36MigrationLedger() {
  const ledger = readLedger();
  if (!checked) checked = freeze(validateGettysburgV36MigrationLedger(ledger));
  return checked;
}
export function v36BeforeFile(path) {
  assert.ok(typeof path === 'string');
  const record = expected.migrations.find(value => value.path === path);
  assert.ok(record, 'Only three declared authentic snapshots may be read');
  readLedger();
  const bytes = directRead(record.archive); assert.equal(sha(bytes), record.beforeSHA256); return bytes;
}
// Metadata/protected-byte assertions only. Runtime Scene/modules, behavioral
// tests and save/engine imports always consume current physical candidate code.
export function v36HistoricalSource(path, requestedPath = undefined) {
  if (requestedPath !== undefined) {
    const resolved = requestedPath instanceof URL ? fileURLToPath(requestedPath) : requestedPath;
    assert.equal(resolved, ROOT + path, 'Historical reader cannot cross candidate roots');
  }
  const current = directRead(path), record = expected.migrations.find(value => value.path === path);
  if (!record) return current;
  gettysburgV36MigrationLedger();
  assert.equal(sha(current), record.currentSHA256, path + ' current bytes remain pinned');
  return v36BeforeFile(path);
}
export const GETTYSBURG_V36_MIGRATION_PATHS = Object.freeze(expected.migrations.map(record => record.path));
