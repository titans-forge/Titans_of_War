import assert from 'node:assert/strict';
import { readFileSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { v32HistoricalSource } from './gettysburgV32Preservation.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ledgerPath = 'scripts/fixtures/gettysburg-v31-migrations.json';
const ledgerSHA256 = 'e7a00aef7449c1a04c272e9ba51a14d74f24156512554308a93badb0641745d2';
const expected = {
  "schema": "gettysburg-v31-historical-byte-migration-v1",
  "baselineSHA256": "9869bc7964c84a49967172da23e635a04b4263b0259aa6e7b571910a71bc59d9",
  "baselineFiles": 1473,
  "fixture": {
    "path": "scripts/fixtures/gettysburg-v31-preservation.json",
    "sha256": "0b30c2341f0682f97f1223726fb30e5915d8143c8104f867b656a9c888773783"
  },
  "oldFixturesRefreshed": false,
  "oldMigrationLedgersEdited": false,
  "mandatoryRegistration": "package.json",
  "mandatorySuite": "scripts/test-gettysburg-v31-contact.mjs",
  "migrations": [
    {
      "path": "package.json",
      "archive": "scripts/test-support/gettysburg-v31-before/package.json",
      "beforeSHA256": "11ecabaf2714e0a5ab8b459545f211bc5a20d2ca8d7d60c6dbd273ebe1413ae9",
      "currentSHA256": "cf20efa26f7d799db5aff324d42098a40fde6456b54280e4205ad30d4b727ffc",
      "reason": "Only append mandatory v31 art, native and full-pipeline gates, with version and dependencies unchanged."
    },
    {
      "path": "src/battle/gettysburgInfantryClipPolicy.js",
      "archive": "scripts/test-support/gettysburg-v31-before/src/battle/gettysburgInfantryClipPolicy.js",
      "beforeSHA256": "696aebd546ec807a46f98e6af20a22eff503df310c9fde10db935aab3a96aed5",
      "currentSHA256": "4e8db4cd5a9a758e39fd871f3004a1af709fffcdc3d8dde454bcd274ce0e211f",
      "reason": "Add only optional Gettysburg v31 reverse-axis atlases atop exact v30 scale profiles."
    },
    {
      "path": "src/battle/gettysburgInfantryClips.js",
      "archive": "scripts/test-support/gettysburg-v31-before/src/battle/gettysburgInfantryClips.js",
      "beforeSHA256": "5cb8ec2d60fd7f4c49020fd8457ba0c1462fae256fd2ba29000e3c403c9efc1e",
      "currentSHA256": "51eed59a0737e5a6b10d8453d49b52dc72eeae68416f210011c7440e569b47d3",
      "reason": "Register strict native v31 validation and pose dispatch; every prior selector and shot address remains unchanged."
    },
    {
      "path": "scripts/test-gettysburg-v30-contact.mjs",
      "archive": "scripts/test-support/gettysburg-v31-before/scripts/test-gettysburg-v30-contact.mjs",
      "beforeSHA256": "068d853ac23178cc0a1b65debd66df4b8c095b3787d9ebb2d61cdc6bf1add9c5",
      "currentSHA256": "f2c9fe58fabbba41dd78b554811f6e2e9f8bd8f549410f3168f7dae28e67ea95",
      "reason": "Only add the fixed v31 metadata migration import and authentic package before-byte reader; every old behavioral assertion stays active."
    },
    {
      "path": "scripts/test-field-suspend-save.mjs",
      "archive": "scripts/test-support/gettysburg-v31-before/scripts/test-field-suspend-save.mjs",
      "beforeSHA256": "cdf23e1ebd898632bc46c477e64bb3b7d52f4675eb0dbec10f8eaf0852d3d0a5",
      "currentSHA256": "5f4465e3d6d9b2d3bfd2884ef34511f6cc12cc0f5d4c5b11c0bce3ec9c6f67a0",
      "reason": "Only add the fixed v31 before-byte migration import and authentic v30 test before-byte reader; all 67 current save behavior cases remain active."
    }
  ]
};
function safeRead(path) {
  assert.ok(typeof path === 'string' && path.length > 0 && !path.startsWith('/') && !path.includes('\\'));
  const parts = path.split('/');
  assert.ok(parts.every(part => part && part !== '.' && part !== '..'), 'Only canonical source paths are allowed');
  for (let i = 1; i <= parts.length; i++) assert.equal(lstatSync(ROOT + parts.slice(0, i).join('/')).isSymbolicLink(), false, path);
  assert.ok(lstatSync(ROOT + path).isFile(), path);
  return v32HistoricalSource(path);
}
const fixtureBytes = safeRead(expected.fixture.path);
assert.equal(sha(fixtureBytes), expected.fixture.sha256, 'Authentic installed-v30 fixture remains exact');
const fixture = JSON.parse(fixtureBytes);
assert.equal(fixture.baselineFiles, 1473);
const authentic = new Map(fixture.sourceFiles.map(record => [record.path, record]));
assert.equal(authentic.size, 5);

function verifyPackage(beforeBytes, currentBytes) {
  const before = JSON.parse(beforeBytes), current = JSON.parse(currentBytes);
  assert.equal(before.version, '0.31.0'); assert.equal(current.version, '0.31.0');
  assert.equal(current.scripts['test:gettysburg-v31'], 'node --test --test-reporter=spec scripts/test-gettysburg-v31-contact.mjs');
  assert.equal(current.scripts.test, before.scripts.test + ' && npm run test:gettysburg-v31');
  assert.equal(current.scripts['test:gettysburg-art-current'], before.scripts['test:gettysburg-art-current'] + ' scripts/test-gettysburg-v31-contact.mjs');
  assert.equal(current.scripts['validate:gettysburg-native'], before.scripts['validate:gettysburg-native'] + ' && python3 scripts/author-gettysburg-v31-clips.py --check --self-test');
  delete current.scripts['test:gettysburg-v31'];
  for (const key of ['test', 'test:gettysburg-art-current', 'validate:gettysburg-native']) current.scripts[key] = before.scripts[key];
  assert.deepEqual(current, before, 'Only the four declared mandatory v31 registrations may change');
}
function verifyHistoricalTest(path, beforeBytes, currentBytes) {
  const before = beforeBytes.toString('utf8'), current = currentBytes.toString('utf8');
  if (path === 'scripts/test-gettysburg-v30-contact.mjs') {
    const anchor = "import { assertHistoricalCheckpointRepairFile } from './test-support/checkpointRepairPreservation.mjs';";
    const expression = 'JSON.parse(readFileSync(file(record.path)))';
    assert.equal(before.split(anchor).length - 1, 1); assert.equal(before.split(expression).length - 1, 1);
    assert.equal(current, before.replace(anchor, anchor + "\nimport { v31MetadataBefore } from './test-support/gettysburgV31Preservation.mjs';")
      .replace(expression, 'JSON.parse(v31MetadataBefore(record.path))'), 'Every v30 behavior assertion remains current');
  }
  if (path === 'scripts/test-field-suspend-save.mjs') {
    const anchor = "import { checkpointRepairMigrationLedger, validateCheckpointRepairLedger, assertHistoricalCheckpointRepairFile } from './test-support/checkpointRepairPreservation.mjs';";
    const expression = "readFileSync(new URL('./test-gettysburg-v30-contact.mjs', import.meta.url), 'utf8')";
    assert.equal(before.split(anchor).length - 1, 1); assert.equal(before.split(expression).length - 1, 1);
    assert.equal(current, before.replace(anchor, anchor + "\nimport { v31BeforeFile } from './test-support/gettysburgV31Preservation.mjs';")
      .replace(expression, "v31BeforeFile('scripts/test-gettysburg-v30-contact.mjs').toString('utf8')"), 'All 67 actual current save behavior cases remain unchanged');
  }
}
export function validateGettysburgV31MigrationLedger(ledger) {
  assert.deepEqual(ledger, expected, 'Only the exact five-path reviewed migration is accepted');
  for (const record of ledger.migrations) {
    const historical = authentic.get(record.path);
    assert.ok(historical); assert.equal(historical.sha256, record.beforeSHA256); assert.equal(historical.archive, record.archive);
    const before = safeRead(record.archive), current = safeRead(record.path);
    assert.equal(sha(before), record.beforeSHA256, record.path + ' exact installed before bytes');
    assert.equal(sha(current), record.currentSHA256, record.path + ' fixed current bytes');
    if (record.path === 'package.json') verifyPackage(before, current);
    verifyHistoricalTest(record.path, before, current);
  }
  return ledger;
}
let checked;
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
export function gettysburgV31MigrationLedger() {
  if (!checked) {
    const bytes = safeRead(ledgerPath);
    assert.equal(sha(bytes), ledgerSHA256, 'Exact reviewed ledger bytes are required');
    checked = freeze(validateGettysburgV31MigrationLedger(JSON.parse(bytes)));
  }
  return checked;
}
export function v31BeforeFile(path) {
  assert.ok(typeof path === 'string');
  const record = gettysburgV31MigrationLedger().migrations.find(value => value.path === path);
  assert.ok(record, 'Only the five declared before snapshots may be read');
  const bytes = safeRead(record.archive);
  assert.equal(sha(bytes), record.beforeSHA256);
  return bytes;
}
export function v31MetadataBefore(path) {
  if (path === 'package.json') return v31BeforeFile(path);
  assert.equal(path, 'package-lock.json', 'Only authentic package metadata records are allowed');
  return safeRead(path);
}
