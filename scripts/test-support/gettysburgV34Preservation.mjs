import assert from 'node:assert/strict';
import { readFileSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { v35HistoricalSource } from './gettysburgV35Preservation.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ledgerPath = 'scripts/fixtures/gettysburg-v34-migrations.json';
const ledgerSHA256 = '4652b7c1b7d52643cd76bc0f6a8458e3c654e10c19bad7f73ce3769d791f34cc';
const runtimePaths = ['package.json', 'src/battle/CivilWarBattlefield.jsx'];
const expected = {
  "schema": "gettysburg-v34-historical-byte-migration-v1",
  "status": "frozen-approved-runtime-pins",
  "baselineSHA256": "6b1a15053d54150ddbbc3145f962383bfef452a7f25ca20b9fce74a76b396f6a",
  "baselineFiles": 1562,
  "fixture": {
    "path": "scripts/fixtures/gettysburg-v34-preservation.json",
    "sha256": "2541d91c4b1a055a00ba60a0563e003c86d11b4d22dbc36d791a7793414543cc"
  },
  "capture": {
    "path": "scripts/capture-gettysburg-v34-preservation.mjs",
    "sha256": "3e8dcfa3960328aafc438ba1c01b2fd83ad4177df3292b23ed540df2739074cc"
  },
  "oldFixturesRefreshed": false,
  "oldMigrationLedgersEdited": false,
  "behavioralAssertionsChanged": false,
  "mandatoryRegistration": "package.json",
  "mandatorySuite": "scripts/test-gettysburg-v34-standard-continuity.mjs",
  "migrations": [
    {
      "path": "package.json",
      "archive": "scripts/test-support/gettysburg-v34-before/package.json",
      "beforeSHA256": "d9a09499b9ff24ab5eca6ec852f230eb706d29971aadec2fb1d137fb79bb7e1e",
      "currentSHA256": "db71d1598d7a233dee94c817410bbdc736cf558c910115149623b3cc18b91259",
      "reason": "Only four mandatory v34 script registrations; version, dependencies and lockfile unchanged."
    },
    {
      "path": "src/battle/CivilWarBattlefield.jsx",
      "archive": "scripts/test-support/gettysburg-v34-before/src/battle/CivilWarBattlefield.jsx",
      "beforeSHA256": "005e7cebd723eb3ec399c117b8e47e5ba588c107dfb0d77cb0c049b5ecb885bd",
      "currentSHA256": "6cb8988dcac1dbf2296ea5101950211ff7a52dcda336b9eb6b6cfa46084a700e",
      "reason": "Root-approved renderer-only standard carrier checkpoint and cold restore; independently gated canonical v34 sidecar with authentic legacy witnesses and unchanged raw combat."
    },
    {
      "path": "scripts/test-support/gettysburgV33Preservation.mjs",
      "archive": "scripts/test-support/gettysburg-v34-before/scripts/test-support/gettysburgV33Preservation.mjs",
      "beforeSHA256": "9643734692916b11864674c793ade745da885cf8c1c0c137e6d2bc12a85134d7",
      "currentSHA256": "c8a95cf590ce866f1d5bd810251bb8e0299de0e57ee2e6a95bfd1ea9a0525ae8",
      "reason": "Only metadata directRead import and V34 historical reader call; original V33 ledger and every behavioral assertion remain byte exact."
    }
  ],
  "productionHelper": {
    "path": "src/battle/gettysburgStandardCheckpoint.js",
    "sha256": "22f7d361b8636344cff577fd8779ab1d1b089b44229100b3830ca0907709ea6e"
  }
};

function directRead(path) {
  assert.ok(typeof path === 'string' && path.length > 0 && !path.startsWith('/') && !path.includes('\\'), 'Canonical relative source path required');
  const parts = path.split('/');
  assert.ok(parts.every(part => part && part !== '.' && part !== '..'), 'Canonical relative source path required');
  for (let i = 1; i <= parts.length; i++) assert.equal(lstatSync(ROOT + parts.slice(0, i).join('/')).isSymbolicLink(), false, path);
  assert.ok(lstatSync(ROOT + path).isFile(), path);
  return v35HistoricalSource(path);
}
function exactLine(text, line) { assert.equal(text.split('\n').filter(value => value === line).length, 1, line); }
function narrowAfter(path, before) {
  assert.equal(path, 'scripts/test-support/gettysburgV33Preservation.mjs', 'Only the declared V33 metadata adapter may transform');
  const anchor = "import {fileURLToPath} from 'node:url';", old = '  return readFileSync(ROOT+path);';
  exactLine(before, anchor); exactLine(before, old);
  return before.replace(anchor, anchor + "\nimport { v34HistoricalSource } from './gettysburgV34Preservation.mjs';")
    .replace(old, '  return v34HistoricalSource(path);');
}
function verifyPackage(beforeBytes, currentBytes) {
  const before = JSON.parse(beforeBytes), current = JSON.parse(currentBytes);
  assert.equal(before.version, '0.31.0'); assert.equal(current.version, before.version);
  const required = 'node --test --test-reporter=spec scripts/test-gettysburg-v34-standard-continuity.mjs';
  const transformed = JSON.parse(beforeBytes);
  for (const key of ['test', 'test:gettysburg-art-current', 'test:field-continuity']) transformed.scripts[key] += ' && npm run test:gettysburg-v34';
  transformed.scripts['test:gettysburg-v34'] = required;
  assert.deepEqual(current, transformed, 'Only the four mandatory script fields may change');
  assert.equal(currentBytes.toString('utf8'), JSON.stringify(transformed, null, 2) + '\n', 'Exact whole-file package transformation required');
}
function authenticFixture() {
  const bytes = directRead(expected.fixture.path);
  assert.equal(sha(bytes), expected.fixture.sha256, 'Immutable authentic installed-v33 fixture');
  assert.equal(sha(directRead(expected.capture.path)), expected.capture.sha256, 'Immutable authentic live capture script');
  const fixture = JSON.parse(bytes);
  assert.equal(fixture.schema, 'gettysburg-v34-authentic-installed-v33-baseline-v1');
  assert.equal(fixture.baselineSHA256, expected.baselineSHA256); assert.equal(fixture.baselineFiles, 1562);
  assert.equal(fixture.sourceFiles.length, 3); assert.equal(fixture.protectedFiles.length, 1559);
  assert.equal(fixture.oldFixturesRefreshed, false); assert.equal(fixture.oldMigrationLedgersEdited, false);
  assert.deepEqual(fixture.sourceFiles.map(value => value.path), expected.migrations.map(value => value.path));
  for (const record of expected.migrations) {
    const original = fixture.sourceFiles.find(value => value.path === record.path);
    assert.equal(original.sha256, record.beforeSHA256); assert.equal(original.candidateCopyBeforeSHA256, record.beforeSHA256);
    assert.equal(original.archive, record.archive);
    assert.equal(sha(directRead(record.archive)), record.beforeSHA256, record.path + ' authentic archive');
  }
  return fixture;
}
function exactDraft(ledger) {
  assert.deepEqual(ledger, expected, 'Only the exact three-path reviewed V34 migration is accepted');
  authenticFixture(); return ledger;
}
function pendingError() {
  const error = new Error('V34 Scene and package hashes await explicit approved final pins.');
  error.code = 'V34_RUNTIME_PINS_PENDING'; return error;
}
// Draft inspection verifies immutable before bytes, one whole-file metadata
// adapter and the exact four package script fields. It approves no runtime.
export function verifyGettysburgV34MetadataMigrations() {
  const raw = directRead(ledgerPath); assert.equal(sha(raw), ledgerSHA256); exactDraft(JSON.parse(raw));
  const paths = expected.migrations.filter(record => !runtimePaths.includes(record.path));
  for (const record of paths) {
    const before = directRead(record.archive), current = directRead(record.path);
    assert.equal(sha(current), record.currentSHA256, record.path + ' fixed metadata bytes');
    assert.equal(current.toString('utf8'), narrowAfter(record.path, before.toString('utf8')), 'Every behavioral assertion and current import stays byte exact: ' + record.path);
  }
  const packageRecord = expected.migrations.find(row => row.path === 'package.json');
  verifyPackage(directRead(packageRecord.archive), directRead(packageRecord.path));
  return { metadataPaths: paths.map(record => record.path), metadataPathsVerified: 1, packageScriptFieldsVerified: 4, archivedBeforeFiles: 3,
    runtimePinsPending: expected.migrations.some(record => record.currentSHA256 === null), oldFixturesRefreshed: false, oldMigrationLedgersEdited: false };
}
export function validateGettysburgV34MigrationLedger(ledger) {
  exactDraft(ledger);
  if (ledger.migrations.some(record => record.currentSHA256 === null)) throw pendingError();
  assert.equal(ledger.status, 'frozen-approved-runtime-pins');
  assert.equal(sha(directRead(expected.productionHelper.path)), expected.productionHelper.sha256, 'Root-approved current production helper remains exact');
  for (const record of ledger.migrations) {
    assert.match(record.currentSHA256, /^[0-9a-f]{64}$/);
    const before = directRead(record.archive), current = directRead(record.path);
    assert.equal(sha(current), record.currentSHA256, record.path + ' explicitly pinned current bytes');
    if (record.path === 'package.json') verifyPackage(before, current);
    if (!runtimePaths.includes(record.path)) assert.equal(current.toString('utf8'), narrowAfter(record.path, before.toString('utf8')));
  }
  const fixture = authenticFixture();
  for (const record of fixture.protectedFiles) assert.equal(sha(directRead(record.path)), record.sha256, 'Protected current baseline bytes: ' + record.path);
  for (const record of fixture.dependencies) assert.equal(sha(directRead(record.path)), record.sha256, 'Protected current runtime dependency: ' + record.path);
  return ledger;
}
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
let checked;
export function gettysburgV34MigrationLedger() {
  const raw = directRead(ledgerPath); assert.equal(sha(raw), ledgerSHA256, 'Exact fixed ledger bytes required');
  if (!checked) checked = freeze(validateGettysburgV34MigrationLedger(JSON.parse(raw)));
  return checked;
}
export function v34BeforeFile(path) {
  assert.ok(typeof path === 'string');
  const record = expected.migrations.find(value => value.path === path);
  assert.ok(record, 'Only the three declared authentic snapshots may be read');
  const raw = directRead(ledgerPath); assert.equal(sha(raw), ledgerSHA256); exactDraft(JSON.parse(raw));
  const bytes = directRead(record.archive); assert.equal(sha(bytes), record.beforeSHA256); return bytes;
}
// Only metadata/protected-byte assertions consume this view. Current Scene,
// selector, save and engine imports never read archived bytes through it.
export function v34HistoricalSource(path, requestedPath = undefined) {
  if (requestedPath !== undefined) {
    const resolved = requestedPath instanceof URL ? fileURLToPath(requestedPath) : requestedPath;
    assert.equal(resolved, ROOT + path, 'Historical reader cannot cross candidate roots');
  }
  const current = directRead(path), record = expected.migrations.find(value => value.path === path);
  if (!record) return current;
  gettysburgV34MigrationLedger();
  assert.equal(sha(current), record.currentSHA256, path + ' current bytes remain pinned');
  return v34BeforeFile(path);
}
export const GETTYSBURG_V34_MIGRATION_PATHS = Object.freeze(expected.migrations.map(record => record.path));
