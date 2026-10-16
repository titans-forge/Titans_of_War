import assert from 'node:assert/strict';
import { readFileSync, lstatSync, realpathSync, openSync, fstatSync, closeSync, constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { v41HistoricalSource } from './gettysburgV41Preservation.mjs';

// Independent metadata reader: never imports an older migration helper.
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ledgerPath = 'scripts/fixtures/gettysburg-v40-migrations.json';
const ledgerSHA256 = '3694a806bd286bebc3536e400a9fb11b111aced888f0b2cd0a0039387b401a08';
const expected = {
  "schema": "gettysburg-v40-historical-byte-migration-v1",
  "status": "frozen-approved-runtime-pins",
  "baselineSHA256": "d628f9a648e07a804e4317dad75e87e583e32ffe90c0a5b8b47163d451d6ad60",
  "baselineFiles": 1626,
  "baselineBytes": 558615779,
  "fixture": {
    "path": "scripts/fixtures/gettysburg-v40-preservation.json",
    "sha256": "4e36fee8b437db82ebc047bbd43ec3d647a743616836f2227b024fb241c51cca"
  },
  "capture": {
    "path": "scripts/capture-gettysburg-v40-preservation.mjs",
    "sha256": "72be12aa93fab91b4717f663e3a629677a7c189f8f72c0b20958f1a0253ff172"
  },
  "oldFixturesRefreshed": false,
  "oldMigrationLedgersEdited": false,
  "behavioralAssertionsChanged": false,
  "mandatoryRegistration": "package.json",
  "mandatorySuite": "scripts/test-gettysburg-v40-locomotion.mjs",
  "migrations": [
    {
      "path": "package.json",
      "archive": "scripts/test-support/gettysburg-v40-before/package.json",
      "beforeSHA256": "51da7f70d11dc36f11ab4a842b2dbbcf18579414fb2d65afe45e3de8266196e2",
      "currentSHA256": "46d8f733dfef8b39a3dd42e34e16300081307631ac09ac4b3f75d09c071881f2",
      "reason": "Only four mandatory v40 locomotion script registrations; version, dependencies and lockfile unchanged."
    },
    {
      "path": "src/battle/CivilWarBattlefield.jsx",
      "archive": "scripts/test-support/gettysburg-v40-before/src/battle/CivilWarBattlefield.jsx",
      "beforeSHA256": "bd4c4a5d4c38332e94769b0cacd6b01406993521b2772d8c7861091c1391bee8",
      "currentSHA256": "e36fadd98d455d9462487be3ede3950bf8b32e75e7d193faee639be234a36510",
      "reason": "Optional per-soldier drawing locomotion heading for stationary noncombat turns/reformation only; tactical raw visual direction, geometry, combat, fire/reload/contact/fall, shot origins, standards and prior gates remain exact."
    },
    {
      "path": "scripts/test-support/gettysburgV39Preservation.mjs",
      "archive": "scripts/test-support/gettysburg-v40-before/scripts/test-support/gettysburgV39Preservation.mjs",
      "beforeSHA256": "5788051eade94d08419d331932c63bbb038e5ebf44e46781e9b85a2e64b610e3",
      "currentSHA256": "cdbb7b6c9d3dea9ef357cbc06d068c1a08d8e8bf6c44300cd7cd5b0f85b5aafe",
      "reason": "Only V40 historical-source import and metadata directRead return; every original V39 fixture, ledger and assertion remains byte exact."
    }
  ],
  "newSourcePins": [
    {
      "path": "src/battle/gettysburgLocomotionPresentation.js",
      "sha256": "28cb96e17736ceccc4306577eb9fe9970fffac50df4b9cb92bc6dc6d5028a332"
    },
    {
      "path": "scripts/test-gettysburg-v40-locomotion.mjs",
      "sha256": "4e0d99ec32bd7c3c98c7c2b2a19ae510ef088bb9019cfe42a87f13cfddfd02c7"
    },
    {
      "path": "docs/CIVIL_WAR_V40_LOCOMOTION.md",
      "sha256": "23556dada5a8d84a7798d07007eda3832d9af75096805ee90789e438844f6e21"
    },
    {
      "path": "scripts/test-support/gettysburgV40Regression.mjs",
      "sha256": "ad593f80b3b45eb83654da86d92832a8ca16d66454736820dbc4533eea263732"
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
    return v41HistoricalSource(path);
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
  assert.equal(path, 'scripts/test-support/gettysburgV39Preservation.mjs', 'Only the declared V39 metadata adapter may transform');
  const anchor = "import { fileURLToPath } from 'node:url';", old = '    return bytes;';
  exactLine(before, anchor); exactLine(before, old);
  return before.replace(anchor, anchor + "\nimport { v40HistoricalSource } from './gettysburgV40Preservation.mjs';")
    .replace(old, '    return v40HistoricalSource(path);');
}
function verifyPackage(beforeBytes, currentBytes) {
  const before = JSON.parse(beforeBytes), current = JSON.parse(currentBytes);
  assert.equal(before.version, '0.31.0'); assert.equal(current.version, before.version);
  const transformed = JSON.parse(beforeBytes);
  for (const key of ['test', 'test:gettysburg-art-current', 'test:field-continuity']) transformed.scripts[key] += ' && npm run test:gettysburg-v40';
  transformed.scripts['test:gettysburg-v40'] = 'node --test --test-reporter=spec scripts/test-gettysburg-v40-locomotion.mjs';
  assert.deepEqual(current, transformed, 'Only the four mandatory script fields may change');
  assert.equal(currentBytes.toString('utf8'), JSON.stringify(transformed, null, 2) + '\n', 'Exact whole-file package transformation required');
}
function authenticFixture() {
  const bytes = directRead(expected.fixture.path);
  assert.ok(bytes.length <= 2097152, 'Bounded immutable fixture bytes');
  assert.equal(sha(bytes), expected.fixture.sha256, 'Immutable authentic installed-v39 fixture');
  assert.equal(sha(directRead(expected.capture.path)), expected.capture.sha256, 'Immutable authentic LIVE capture script');
  const fixture = JSON.parse(bytes);
  assert.equal(fixture.schema, 'gettysburg-v40-authentic-installed-v39-baseline-v1');
  assert.equal(fixture.capturedFrom, '/Users/titansforge/Vault/Titans_of_War');
  assert.equal(fixture.artPass, 'gettysburg-v32');
  assert.equal(fixture.baselineSHA256, expected.baselineSHA256);
  assert.equal(fixture.baselineFiles, 1626); assert.equal(fixture.baselineBytes, 558615779);
  assert.equal(fixture.initialCopyReceiptSHA256, '31a0c25534bc06933e0714e56c8f85722e8cf35db1e04305dcf24cdb96475e5e');
  assert.equal(fixture.sourceFiles.length, 3); assert.equal(fixture.protectedFiles.length, 1623);
  assert.ok(fixture.baselineFiles <= 2000 && fixture.baselineBytes <= 2147483648, 'Bounded complete authentic fixture');
  assert.equal(fixture.oldFixturesRefreshed, false); assert.equal(fixture.oldMigrationLedgersEdited, false);
  assert.equal(fixture.behavioralAssertionsChanged, false);
  assert.deepEqual(fixture.sourceFiles.map(value => value.path), expected.migrations.map(value => value.path));
  const scene = fixture.sourceFiles.find(value => value.path === 'src/battle/CivilWarBattlefield.jsx');
  assert.ok(scene, 'Battle Scene belongs to the declared locomotion migration');
  assert.equal(fixture.sceneSHA256, scene.sha256);
  for (const record of expected.migrations) {
    const original = fixture.sourceFiles.find(value => value.path === record.path);
    assert.equal(original.sha256, record.beforeSHA256); assert.equal(original.candidateCopyBeforeSHA256, record.beforeSHA256);
    assert.equal(original.archive, record.archive);
    const archive = directRead(record.archive);
    assert.equal(sha(archive), record.beforeSHA256, record.path + ' authentic archive');
    assert.equal(archive.length, original.bytes);
  }
  assert.equal(new Set([...fixture.sourceFiles, ...fixture.protectedFiles].map(row => row.path)).size, 1626);
  assert.equal([...fixture.sourceFiles, ...fixture.protectedFiles].reduce((sum, row) => sum + row.bytes, 0), 558615779);
  for (const record of [fixture.oldFixture, fixture.oldLedger]) {
    const original = fixture.protectedFiles.find(row => row.path === record.path);
    assert.ok(original, 'Prior immutable metadata is protected');
    assert.equal(record.sha256, original.sha256);
    assert.equal(sha(directRead(record.path)), record.sha256, 'Unchanged prior fixture or ledger: ' + record.path);
  }
  assert.equal(fixture.oldFixture.path, 'scripts/fixtures/gettysburg-v39-preservation.json');
  assert.equal(fixture.oldLedger.path, 'scripts/fixtures/gettysburg-v39-migrations.json');
  return fixture;
}
function exactDraft(ledger) {
  requirePlainData(ledger);
  assert.deepEqual(ledger, expected, 'Only the exact three-path V40 migration metadata is accepted');
  authenticFixture(); return ledger;
}
function readLedger() {
  const raw = directRead(ledgerPath); assert.ok(raw.length <= 65536, 'Bounded migration ledger bytes'); assert.equal(sha(raw), ledgerSHA256, 'Exact fixed ledger bytes required');
  return exactDraft(JSON.parse(raw));
}
function pendingError() {
  const error = new Error('V40 Production and new source hashes await explicit reviewed final pins.');
  error.code = 'V40_RUNTIME_PINS_PENDING'; return error;
}
// Draft inspection approves no runtime. It permits independent review of the
// exact archived bytes, metadata adapter and four registration transformations.
export function verifyGettysburgV40MetadataMigrations() {
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
export function validateGettysburgV40MigrationLedger(ledger) {
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
export function gettysburgV40MigrationLedger() {
  const ledger = readLedger();
  if (!checked) checked = freeze(validateGettysburgV40MigrationLedger(ledger));
  return checked;
}
export function v40BeforeFile(path) {
  assert.ok(typeof path === 'string');
  const record = expected.migrations.find(value => value.path === path);
  assert.ok(record, 'Only three declared authentic snapshots may be read');
  readLedger();
  const bytes = directRead(record.archive); assert.equal(sha(bytes), record.beforeSHA256); return bytes;
}
// Metadata/protected-byte assertions only. Runtime component/Scene/modules, behavioral
// tests and save/engine imports always consume current physical candidate code.
export function v40HistoricalSource(path, requestedPath = undefined) {
  if (requestedPath !== undefined) {
    const resolved = requestedPath instanceof URL ? fileURLToPath(requestedPath) : requestedPath;
    assert.equal(resolved, ROOT + path, 'Historical reader cannot cross candidate roots');
  }
  const current = directRead(path), record = expected.migrations.find(value => value.path === path);
  if (!record) return current;
  gettysburgV40MigrationLedger();
  assert.equal(sha(current), record.currentSHA256, path + ' current bytes remain pinned');
  return v40BeforeFile(path);
}
export const GETTYSBURG_V40_MIGRATION_PATHS = Object.freeze(expected.migrations.map(record => record.path));
