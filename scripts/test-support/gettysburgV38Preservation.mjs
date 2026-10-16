import assert from 'node:assert/strict';
import { readFileSync, lstatSync, realpathSync, openSync, fstatSync, closeSync, constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { v39HistoricalSource } from './gettysburgV39Preservation.mjs';

// Independent metadata reader: never imports an older migration helper.
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ledgerPath = 'scripts/fixtures/gettysburg-v38-migrations.json';
const ledgerSHA256 = '458443c2c986a562effad755f3de8c892f42db0c07a3ebd8d5bd9a0fc1c156cc';
const expected = {
  "schema": "gettysburg-v38-historical-byte-migration-v1",
  "status": "frozen-approved-runtime-pins",
  "baselineSHA256": "fad3c5e4d7f92dda84bd4789a583ed966a486dbd3672b85c45d5c708bede90e0",
  "baselineFiles": 1605,
  "baselineBytes": 557654585,
  "fixture": {
    "path": "scripts/fixtures/gettysburg-v38-preservation.json",
    "sha256": "f2515d9eb418fb38c705542f970757f4df356a07b06accb621f5be8fa19dcb27"
  },
  "capture": {
    "path": "scripts/capture-gettysburg-v38-preservation.mjs",
    "sha256": "88397ca5630fff83b7e34760f13de5caff8fa7766af0fd167e1d5f049fd3046f"
  },
  "oldFixturesRefreshed": false,
  "oldMigrationLedgersEdited": false,
  "behavioralAssertionsChanged": false,
  "mandatoryRegistration": "package.json",
  "mandatorySuite": "scripts/test-gettysburg-v38-command-access.mjs",
  "migrations": [
    {
      "path": "package.json",
      "archive": "scripts/test-support/gettysburg-v38-before/package.json",
      "beforeSHA256": "96fa03c5ae8c1165c56cdd664ba2ddee4f4727a2198c4522600448068119d458",
      "currentSHA256": "6bf787c05a5d5d394ed8d5eec65278389c713ad1d6b8db216e12d4d98a8ff174",
      "reason": "Only four mandatory v38 command-access script registrations; version, dependencies and lockfile unchanged."
    },
    {
      "path": "src/components/CivilWarBattleEncounter.jsx",
      "archive": "scripts/test-support/gettysburg-v38-before/src/components/CivilWarBattleEncounter.jsx",
      "beforeSHA256": "0eb74307c7e1d697c1c2523e3921f53d6bb318bd296a35d94d34a96527140273",
      "currentSHA256": "ebacdb09a6845f648a7a9f8713bd64e365c7d6c5817b764ea9c87b8225e4f018",
      "reason": "Relocate the existing Line/Column/Skirmish controls to the start of formation details; selection, dispatch, disabled and ARIA behavior remain exact."
    },
    {
      "path": "src/battle/battleUsability.css",
      "archive": "scripts/test-support/gettysburg-v38-before/src/battle/battleUsability.css",
      "beforeSHA256": "ccfee5e4b0140aec186ab9f06338f2ba3bce6b1ff259582ae5548df00cec8dc9",
      "currentSHA256": "0b1a788f76430bcd8b398fa271acc43fa7074b4c8e8e85388142a24a923e3da7",
      "reason": "Sticky command presentation and 44-pixel targets make existing formation controls reachable on desktop and phone; no battle or artwork change."
    },
    {
      "path": "scripts/test-support/gettysburgV37Preservation.mjs",
      "archive": "scripts/test-support/gettysburg-v38-before/scripts/test-support/gettysburgV37Preservation.mjs",
      "beforeSHA256": "86a401079186d4e015c4cf11c048d80fca9347ddea58338eeecb550295e71394",
      "currentSHA256": "9d572de4c8f5bae778619c052b08e271a26afda290f8c5ee0091de6f0317c742",
      "reason": "Only metadata directRead import and V38 historical reader call; original V37 ledger, fixtures and every behavioral assertion remain byte exact."
    }
  ],
  "newSourcePins": [
    {
      "path": "scripts/test-gettysburg-v38-command-access.mjs",
      "sha256": "5d5c145d7646dac4ed1745167535b50b51aa8dfc331a9223f038045bb99d7763"
    },
    {
      "path": "docs/CIVIL_WAR_V38_COMMAND_ACCESS.md",
      "sha256": "6f1d140ae2da114f591cfa86aad65108380e7a39bc7a65253bc60d91a631474b"
    }
  ]
};

const runtimePaths = ['package.json', 'src/components/CivilWarBattleEncounter.jsx', 'src/battle/battleUsability.css'];
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
    return v39HistoricalSource(path);
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
  assert.equal(path, 'scripts/test-support/gettysburgV37Preservation.mjs', 'Only the declared V37 metadata adapter may transform');
  const anchor = "import { fileURLToPath } from 'node:url';", old = '  return readFileSync(ROOT + path);';
  exactLine(before, anchor); exactLine(before, old);
  return before.replace(anchor, anchor + "\nimport { v38HistoricalSource } from './gettysburgV38Preservation.mjs';")
    .replace(old, '  return v38HistoricalSource(path);');
}
function verifyPackage(beforeBytes, currentBytes) {
  const before = JSON.parse(beforeBytes), current = JSON.parse(currentBytes);
  assert.equal(before.version, '0.31.0'); assert.equal(current.version, before.version);
  const transformed = JSON.parse(beforeBytes);
  for (const key of ['test', 'test:gettysburg-art-current', 'test:field-continuity']) transformed.scripts[key] += ' && npm run test:gettysburg-v38';
  transformed.scripts['test:gettysburg-v38'] = 'node --test --test-reporter=spec scripts/test-gettysburg-v38-command-access.mjs';
  assert.deepEqual(current, transformed, 'Only the four mandatory script fields may change');
  assert.equal(currentBytes.toString('utf8'), JSON.stringify(transformed, null, 2) + '\n', 'Exact whole-file package transformation required');
}
function authenticFixture() {
  const bytes = directRead(expected.fixture.path);
  assert.ok(bytes.length <= 2097152, 'Bounded immutable fixture bytes');
  assert.equal(sha(bytes), expected.fixture.sha256, 'Immutable authentic installed-v37 fixture');
  assert.equal(sha(directRead(expected.capture.path)), expected.capture.sha256, 'Immutable authentic LIVE capture script');
  const fixture = JSON.parse(bytes);
  assert.equal(fixture.schema, 'gettysburg-v38-authentic-installed-v37-baseline-v1');
  assert.equal(fixture.capturedFrom, '/Users/titansforge/Vault/Titans_of_War');
  assert.equal(fixture.artPass, 'gettysburg-v32');
  assert.equal(fixture.baselineSHA256, expected.baselineSHA256);
  assert.equal(fixture.baselineFiles, 1605); assert.equal(fixture.baselineBytes, 557654585);
  assert.equal(fixture.initialCopyReceiptSHA256, 'ac1e01903635dbcdef9ad88c6e23be034ef1c18c9fd3dad416695b5a793419e4');
  assert.equal(fixture.sourceFiles.length, 4); assert.equal(fixture.protectedFiles.length, 1601);
  assert.ok(fixture.baselineFiles <= 2000 && fixture.baselineBytes <= 2147483648, 'Bounded complete authentic fixture');
  assert.equal(fixture.oldFixturesRefreshed, false); assert.equal(fixture.oldMigrationLedgersEdited, false);
  assert.equal(fixture.behavioralAssertionsChanged, false);
  assert.deepEqual(fixture.sourceFiles.map(value => value.path), expected.migrations.map(value => value.path));
  const scene = fixture.protectedFiles.find(value => value.path === 'src/battle/CivilWarBattlefield.jsx');
  assert.ok(scene, 'Battle Scene is outside the command-access migration');
  assert.equal(fixture.sceneSHA256, scene.sha256);
  assert.equal(sha(directRead(scene.path)), scene.sha256, 'Current physical Scene remains byte exact');
  for (const record of expected.migrations) {
    const original = fixture.sourceFiles.find(value => value.path === record.path);
    assert.equal(original.sha256, record.beforeSHA256); assert.equal(original.candidateCopyBeforeSHA256, record.beforeSHA256);
    assert.equal(original.archive, record.archive);
    const archive = directRead(record.archive);
    assert.equal(sha(archive), record.beforeSHA256, record.path + ' authentic archive');
    assert.equal(archive.length, original.bytes);
  }
  assert.equal(new Set([...fixture.sourceFiles, ...fixture.protectedFiles].map(row => row.path)).size, 1605);
  assert.equal([...fixture.sourceFiles, ...fixture.protectedFiles].reduce((sum, row) => sum + row.bytes, 0), 557654585);
  for (const record of [fixture.oldFixture, fixture.oldLedger]) {
    const original = fixture.protectedFiles.find(row => row.path === record.path);
    assert.ok(original, 'Prior immutable metadata is protected');
    assert.equal(record.sha256, original.sha256);
    assert.equal(sha(directRead(record.path)), record.sha256, 'Unchanged prior fixture or ledger: ' + record.path);
  }
  assert.equal(fixture.oldFixture.path, 'scripts/fixtures/gettysburg-v37-preservation.json');
  assert.equal(fixture.oldLedger.path, 'scripts/fixtures/gettysburg-v37-migrations.json');
  return fixture;
}
function exactDraft(ledger) {
  requirePlainData(ledger);
  assert.deepEqual(ledger, expected, 'Only the exact four-path V38 migration metadata is accepted');
  authenticFixture(); return ledger;
}
function readLedger() {
  const raw = directRead(ledgerPath); assert.ok(raw.length <= 65536, 'Bounded migration ledger bytes'); assert.equal(sha(raw), ledgerSHA256, 'Exact fixed ledger bytes required');
  return exactDraft(JSON.parse(raw));
}
function pendingError() {
  const error = new Error('V38 Production and new source hashes await explicit reviewed final pins.');
  error.code = 'V38_RUNTIME_PINS_PENDING'; return error;
}
// Draft inspection approves no runtime. It permits independent review of the
// exact archived bytes, metadata adapter and four registration transformations.
export function verifyGettysburgV38MetadataMigrations() {
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
export function validateGettysburgV38MigrationLedger(ledger) {
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
export function gettysburgV38MigrationLedger() {
  const ledger = readLedger();
  if (!checked) checked = freeze(validateGettysburgV38MigrationLedger(ledger));
  return checked;
}
export function v38BeforeFile(path) {
  assert.ok(typeof path === 'string');
  const record = expected.migrations.find(value => value.path === path);
  assert.ok(record, 'Only four declared authentic snapshots may be read');
  readLedger();
  const bytes = directRead(record.archive); assert.equal(sha(bytes), record.beforeSHA256); return bytes;
}
// Metadata/protected-byte assertions only. Runtime component/Scene/modules, behavioral
// tests and save/engine imports always consume current physical candidate code.
export function v38HistoricalSource(path, requestedPath = undefined) {
  if (requestedPath !== undefined) {
    const resolved = requestedPath instanceof URL ? fileURLToPath(requestedPath) : requestedPath;
    assert.equal(resolved, ROOT + path, 'Historical reader cannot cross candidate roots');
  }
  const current = directRead(path), record = expected.migrations.find(value => value.path === path);
  if (!record) return current;
  gettysburgV38MigrationLedger();
  assert.equal(sha(current), record.currentSHA256, path + ' current bytes remain pinned');
  return v38BeforeFile(path);
}
export const GETTYSBURG_V38_MIGRATION_PATHS = Object.freeze(expected.migrations.map(record => record.path));
