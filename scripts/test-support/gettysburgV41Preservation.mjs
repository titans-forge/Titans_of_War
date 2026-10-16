import assert from 'node:assert/strict';
import { readFileSync, lstatSync, realpathSync, openSync, fstatSync, closeSync, constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { v44HistoricalSource } from './civilWarV44Preservation.mjs';

// Independent metadata reader: never imports an older migration helper.
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ledgerPath = 'scripts/fixtures/gettysburg-v41-migrations.json';
const ledgerSHA256 = 'a700e88be23ad9340898f2932ed2c3fd28ae3499d7f7eb6735fbc6c0e95e90e3';
const expected = {
  "schema": "gettysburg-v41-historical-byte-migration-v1",
  "status": "frozen-approved-runtime-pins",
  "baselineSHA256": "795e6607b02618f83c937c4475b3271f4b2aaeebd096f986a3d11ca9a5f3a2bc",
  "baselineFiles": 1637,
  "baselineBytes": 559111430,
  "fixture": {
    "path": "scripts/fixtures/gettysburg-v41-preservation.json",
    "sha256": "327ba76d9dd5c23f872a324f96e0ac6d9cd7ad550b3805d5cadbb4c27f561fb7"
  },
  "capture": {
    "path": "scripts/capture-gettysburg-v41-preservation.mjs",
    "sha256": "f15392f8daed28a9dc4c409567401c590149114e8c4f69a37682743254a654f2"
  },
  "oldFixturesRefreshed": false,
  "oldMigrationLedgersEdited": false,
  "behavioralAssertionsChanged": false,
  "mandatoryRegistration": "package.json",
  "mandatorySuite": "scripts/test-battle-display-preferences.mjs",
  "migrations": [
    {
      "path": "package.json",
      "archive": "scripts/test-support/gettysburg-v41-before/package.json",
      "beforeSHA256": "46d8f733dfef8b39a3dd42e34e16300081307631ac09ac4b3f75d09c071881f2",
      "currentSHA256": "6216a2ea9f00b01553db34c427db3a320eb9221dfdc91d5617b72b446eba2c3c",
      "reason": "Only four mandatory battle-display script registrations; version, dependencies and lockfile unchanged."
    },
    {
      "path": "src/components/CivilWarBattleEncounter.jsx",
      "archive": "scripts/test-support/gettysburg-v41-before/src/components/CivilWarBattleEncounter.jsx",
      "beforeSHA256": "ebacdb09a6845f648a7a9f8713bd64e365c7d6c5817b764ea9c87b8225e4f018",
      "currentSHA256": "7d88976dd0813224f3826ca68344942a026bece0805b0545b8732f8a11eae10e",
      "reason": "Persist bounded optional display preferences and move existing heading/target controls without changing command handlers, combat, save transaction or historical assertions."
    },
    {
      "path": "src/battle/CivilWarBattlefield.jsx",
      "archive": "scripts/test-support/gettysburg-v41-before/src/battle/CivilWarBattlefield.jsx",
      "beforeSHA256": "e36fadd98d455d9462487be3ede3950bf8b32e75e7d193faee639be234a36510",
      "currentSHA256": "5f30baf4b8fa1388c106ed33f1f0f97856faaa3021c2bbf63952dff883b59ec5",
      "reason": "React wrapper only: initialize and synchronize the declarative showRange prop; the entire CivilWarBattleScene class remains byte exact."
    },
    {
      "path": "scripts/test-support/gettysburgV40Preservation.mjs",
      "archive": "scripts/test-support/gettysburg-v41-before/scripts/test-support/gettysburgV40Preservation.mjs",
      "beforeSHA256": "92ae66bce38348cc23eb9c41d61534b31a8cd853025029bea6a37b0d60956651",
      "currentSHA256": "f2f0d77228a8809b3dd4c31eaec7639e652a75d609880a86ccd8839da1eb6f74",
      "reason": "Only V41 historical-source import and metadata directRead return; every original V40 fixture, ledger and assertion remains byte exact."
    }
  ],
  "newSourcePins": [
    {
      "path": "src/battle/battleDisplayPreferences.js",
      "sha256": "70e0e131790606418255eff63430455df317baacd97f25068ad820c4b2546446"
    },
    {
      "path": "scripts/test-battle-display-preferences.mjs",
      "sha256": "263473beb6153c963b1ffa8a3a267c76aaf292f6b3c57e4091c0a2e80f3bba4f"
    },
    {
      "path": "scripts/test-support/battleDisplayComponentHarness.mjs",
      "sha256": "eb6119cbd1be0a5ac2f5aca72612aa46b6d88a346b7724baab04192bed19200d"
    },
    {
      "path": "docs/CIVIL_WAR_V41_DISPLAY_CONTINUITY.md",
      "sha256": "44864bc1fd0cf5f7e91c3fae8d8ff96f8a93846e961877cc60e499d8eb423f60"
    }
  ]
};

const runtimePaths = ['package.json', 'src/components/CivilWarBattleEncounter.jsx', 'src/battle/CivilWarBattlefield.jsx'];
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
    return v44HistoricalSource(path);
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
  assert.equal(path, 'scripts/test-support/gettysburgV40Preservation.mjs', 'Only the declared V40 metadata adapter may transform');
  const anchor = "import { fileURLToPath } from 'node:url';", old = '    return bytes;';
  exactLine(before, anchor); exactLine(before, old);
  return before.replace(anchor, anchor + "\nimport { v41HistoricalSource } from './gettysburgV41Preservation.mjs';")
    .replace(old, '    return v41HistoricalSource(path);');
}
function verifyPackage(beforeBytes, currentBytes) {
  const before = JSON.parse(beforeBytes), current = JSON.parse(currentBytes);
  assert.equal(before.version, '0.31.0'); assert.equal(current.version, before.version);
  const transformed = JSON.parse(beforeBytes);
  for (const key of ['test', 'test:gettysburg-art-current', 'test:field-continuity']) transformed.scripts[key] += ' && npm run test:battle-display';
  transformed.scripts['test:battle-display'] = 'node --test --test-reporter=spec scripts/test-battle-display-preferences.mjs';
  assert.deepEqual(current, transformed, 'Only the four mandatory script fields may change');
  assert.equal(currentBytes.toString('utf8'), JSON.stringify(transformed, null, 2) + '\n', 'Exact whole-file package transformation required');
}
function authenticFixture() {
  const bytes = directRead(expected.fixture.path);
  assert.ok(bytes.length <= 2097152, 'Bounded immutable fixture bytes');
  assert.equal(sha(bytes), expected.fixture.sha256, 'Immutable authentic installed-v40 fixture');
  assert.equal(sha(directRead(expected.capture.path)), expected.capture.sha256, 'Immutable authentic LIVE capture script');
  const fixture = JSON.parse(bytes);
  assert.equal(fixture.schema, 'gettysburg-v41-authentic-installed-v40-baseline-v1');
  assert.equal(fixture.capturedFrom, '/Users/titansforge/Vault/Titans_of_War');
  assert.equal(fixture.artPass, 'gettysburg-v32');
  assert.equal(fixture.baselineSHA256, expected.baselineSHA256);
  assert.equal(fixture.baselineFiles, 1637); assert.equal(fixture.baselineBytes, 559111430);
  assert.equal(fixture.initialCopyReceiptSHA256, '39aac54f47a12676c639ac09b1a5569b9a13ac019f9c0acdc8292c394cfed2ce');
  assert.equal(fixture.sourceFiles.length, 4); assert.equal(fixture.protectedFiles.length, 1633);
  assert.ok(fixture.baselineFiles <= 2000 && fixture.baselineBytes <= 2147483648, 'Bounded complete authentic fixture');
  assert.equal(fixture.oldFixturesRefreshed, false); assert.equal(fixture.oldMigrationLedgersEdited, false);
  assert.equal(fixture.behavioralAssertionsChanged, false);
  assert.deepEqual(fixture.sourceFiles.map(value => value.path), expected.migrations.map(value => value.path));
  const scene = fixture.sourceFiles.find(value => value.path === 'src/battle/CivilWarBattlefield.jsx');
  assert.ok(scene, 'Battle Scene belongs to the declared locomotion migration');
  assert.equal(fixture.sceneSHA256, scene.sha256);
  const marker = 'class CivilWarBattleScene extends Phaser.Scene {';
  const originalScene = directRead(scene.archive).toString('utf8'), currentScene = directRead(scene.path).toString('utf8');
  assert.equal(originalScene.split(marker).length, 2); assert.equal(currentScene.split(marker).length, 2);
  assert.equal(sha(originalScene.slice(originalScene.indexOf(marker))), fixture.sceneClassSHA256, 'Authentic Scene class hash');
  assert.equal(sha(currentScene.slice(currentScene.indexOf(marker))), fixture.sceneClassSHA256, 'V41 React wrapper changes must preserve the entire Scene class');
  for (const record of expected.migrations) {
    const original = fixture.sourceFiles.find(value => value.path === record.path);
    assert.equal(original.sha256, record.beforeSHA256); assert.equal(original.candidateCopyBeforeSHA256, record.beforeSHA256);
    assert.equal(original.archive, record.archive);
    const archive = directRead(record.archive);
    assert.equal(sha(archive), record.beforeSHA256, record.path + ' authentic archive');
    assert.equal(archive.length, original.bytes);
  }
  assert.equal(new Set([...fixture.sourceFiles, ...fixture.protectedFiles].map(row => row.path)).size, 1637);
  assert.equal([...fixture.sourceFiles, ...fixture.protectedFiles].reduce((sum, row) => sum + row.bytes, 0), 559111430);
  for (const record of [fixture.oldFixture, fixture.oldLedger]) {
    const original = fixture.protectedFiles.find(row => row.path === record.path);
    assert.ok(original, 'Prior immutable metadata is protected');
    assert.equal(record.sha256, original.sha256);
    assert.equal(sha(directRead(record.path)), record.sha256, 'Unchanged prior fixture or ledger: ' + record.path);
  }
  assert.equal(fixture.oldFixture.path, 'scripts/fixtures/gettysburg-v40-preservation.json');
  assert.equal(fixture.oldLedger.path, 'scripts/fixtures/gettysburg-v40-migrations.json');
  return fixture;
}
function exactDraft(ledger) {
  requirePlainData(ledger);
  assert.deepEqual(ledger, expected, 'Only the exact four-path V41 migration metadata is accepted');
  authenticFixture(); return ledger;
}
function readLedger() {
  const raw = directRead(ledgerPath); assert.ok(raw.length <= 65536, 'Bounded migration ledger bytes'); assert.equal(sha(raw), ledgerSHA256, 'Exact fixed ledger bytes required');
  return exactDraft(JSON.parse(raw));
}
function pendingError() {
  const error = new Error('V41 Production and new source hashes await explicit reviewed final pins.');
  error.code = 'V41_RUNTIME_PINS_PENDING'; return error;
}
// Draft inspection approves no runtime. It permits independent review of the
// exact archived bytes, metadata adapter and four registration transformations.
export function verifyGettysburgV41MetadataMigrations() {
  readLedger();
  const paths = expected.migrations.filter(record => !runtimePaths.includes(record.path));
  for (const record of paths) {
    const before = directRead(record.archive), current = directRead(record.path);
    assert.equal(sha(current), record.currentSHA256, record.path + ' fixed metadata bytes');
    assert.equal(current.toString('utf8'), narrowAfter(record.path, before.toString('utf8')), 'Behavioral assertions/current imports stay byte exact: ' + record.path);
  }
  const record = expected.migrations.find(row => row.path === 'package.json');
  verifyPackage(directRead(record.archive), directRead(record.path));
  return { metadataPaths: paths.map(record => record.path), metadataPathsVerified: 1, packageScriptFieldsVerified: 4, archivedBeforeFiles: 4,
    runtimePinsPending: expected.migrations.some(record => record.currentSHA256 === null) || expected.newSourcePins.some(record => record.sha256 === null), oldFixturesRefreshed: false, oldMigrationLedgersEdited: false };
}
export function validateGettysburgV41MigrationLedger(ledger) {
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
export function gettysburgV41MigrationLedger() {
  const ledger = readLedger();
  if (!checked) checked = freeze(validateGettysburgV41MigrationLedger(ledger));
  return checked;
}
export function v41BeforeFile(path) {
  assert.ok(typeof path === 'string');
  const record = expected.migrations.find(value => value.path === path);
  assert.ok(record, 'Only four declared authentic snapshots may be read');
  readLedger();
  const bytes = directRead(record.archive); assert.equal(sha(bytes), record.beforeSHA256); return bytes;
}
// Metadata/protected-byte assertions only. Runtime component/Scene/modules, behavioral
// tests and save/engine imports always consume current physical candidate code.
export function v41HistoricalSource(path, requestedPath = undefined) {
  if (requestedPath !== undefined) {
    const resolved = requestedPath instanceof URL ? fileURLToPath(requestedPath) : requestedPath;
    assert.equal(resolved, ROOT + path, 'Historical reader cannot cross candidate roots');
  }
  const current = directRead(path), record = expected.migrations.find(value => value.path === path);
  if (!record) return current;
  gettysburgV41MigrationLedger();
  assert.equal(sha(current), record.currentSHA256, path + ' current bytes remain pinned');
  return v41BeforeFile(path);
}
export const GETTYSBURG_V41_MIGRATION_PATHS = Object.freeze(expected.migrations.map(record => record.path));
