import assert from 'node:assert/strict';
import { readFileSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ledgerPath = 'scripts/fixtures/gettysburg-v32-migrations.json';
const ledgerSHA256 = "704dd32440ab3ab93817441679058d82836cdbdbb36169140729c0613a789b40";
const expected = {
  "schema": "gettysburg-v32-historical-byte-migration-v1",
  "baselineSHA256": "10512b3980c230d393534020499a92ccd56042c04993ee8926e2c6b2bd937f87",
  "baselineFiles": 1507,
  "fixture": {
    "path": "scripts/fixtures/gettysburg-v32-preservation.json",
    "sha256": "6d8f7a518291d8acbeddadaa1f0fe145fc4d35e9821d248d153441172f7a89e2"
  },
  "oldFixturesRefreshed": false,
  "oldMigrationLedgersEdited": false,
  "mandatoryRegistration": "package.json",
  "mandatorySuite": "scripts/test-gettysburg-v32-contact.mjs",
  "migrations": [
    {
      "path": "package.json",
      "archive": "scripts/test-support/gettysburg-v32-before/package.json",
      "beforeSHA256": "cf20efa26f7d799db5aff324d42098a40fde6456b54280e4205ad30d4b727ffc",
      "currentSHA256": "a79baf25996a54c90397e606ba821eb494b3554d992d26b82cd7a9df6b41b0c0",
      "reason": "Only mandatory v32 art, native and UI gate registrations; package version and dependencies unchanged."
    },
    {
      "path": "src/battle/gettysburgInfantryClipPolicy.js",
      "archive": "scripts/test-support/gettysburg-v32-before/src/battle/gettysburgInfantryClipPolicy.js",
      "beforeSHA256": "4e8db4cd5a9a758e39fd871f3004a1af709fffcdc3d8dde454bcd274ce0e211f",
      "currentSHA256": "bf5ad6bdaa5c87c59c0ffc39f01945480cc7bd063ea97d24d2f53ddc2ca464c3",
      "reason": "Only additive optional v32 Union B SE/NW atlases atop exact v31 profiles."
    },
    {
      "path": "src/battle/gettysburgInfantryClips.js",
      "archive": "scripts/test-support/gettysburg-v32-before/src/battle/gettysburgInfantryClips.js",
      "beforeSHA256": "51eed59a0737e5a6b10d8453d49b52dc72eeae68416f210011c7440e569b47d3",
      "currentSHA256": "8383e1685be3b9415a7921d87ec229fbf99a0b2e87ab2cdcdfcb301ef2436bf5",
      "reason": "Only strict v32 Union B validation and dispatch; all older addresses remain current and unchanged."
    },
    {
      "path": "src/components/CivilWarBattleEncounter.jsx",
      "archive": "scripts/test-support/gettysburg-v32-before/src/components/CivilWarBattleEncounter.jsx",
      "beforeSHA256": "919e6ee7a566286b13a0c068550b82bc2711b90291b19edd238aea515a3bf6c6",
      "currentSHA256": "0eb74307c7e1d697c1c2523e3921f53d6bb318bd296a35d94d34a96527140273",
      "reason": "Restore pending/received assault target presentation with per-formation explicit drafts, no order or checkpoint changes."
    },
    {
      "path": "scripts/test-support/gettysburgV31Preservation.mjs",
      "archive": "scripts/test-support/gettysburg-v32-before/scripts/test-support/gettysburgV31Preservation.mjs",
      "beforeSHA256": "e71ddc00748d32584c79d344dade342b1fbff7c600593b87f3311968f024f374",
      "currentSHA256": "d957ecaf9c015808302adde35ba8413202e66549c470cedb4b68f565ec367b7a",
      "reason": "Only fixed v32 historical-byte reader adapter; original v31 ledger and every behavior assertion preserved."
    },
    {
      "path": "scripts/test-support/checkpointRepairPreservation.mjs",
      "archive": "scripts/test-support/gettysburg-v32-before/scripts/test-support/checkpointRepairPreservation.mjs",
      "beforeSHA256": "0385d6c1fca48b3887368a1abdf85697c1e31dc62dd0186a17a5f3301db3699b",
      "currentSHA256": "08be5117e5b5639a93eaabf57e4e216debbf8e8f88bbec77f29188db39b5d32c",
      "reason": "Only fixed v32 historical-byte reader adapter; owner-v2 repair, original ledger and current save behavior preserved."
    },
    {
      "path": "scripts/test-gettysburg-v31-contact.mjs",
      "archive": "scripts/test-support/gettysburg-v32-before/scripts/test-gettysburg-v31-contact.mjs",
      "beforeSHA256": "8c11f87b7862989e6abbfb8c512ed38cbbe60476d0036ac0c146b1cb1e9b1bd0",
      "currentSHA256": "92520cf4f6e3be2da56d441465581d69464f5efea294ca37357045f8235d715c",
      "reason": "Only migration import and protected historical-byte reader; current Scene/selector and all 25 v31 behavior cases remain active."
    }
  ]
};
function safeRead(path) {
  assert.ok(typeof path === 'string' && path.length > 0 && !path.startsWith('/') && !path.includes('\\'));
  const parts = path.split('/');
  assert.ok(parts.every(part => part && part !== '.' && part !== '..'), 'Only canonical source paths are allowed');
  for (let i = 1; i <= parts.length; i++) assert.equal(lstatSync(ROOT + parts.slice(0, i).join('/')).isSymbolicLink(), false, path);
  assert.ok(lstatSync(ROOT + path).isFile(), path);
  return readFileSync(ROOT + path);
}
const fixtureBytes = safeRead(expected.fixture.path);
assert.equal(sha(fixtureBytes), expected.fixture.sha256, 'Authentic installed-v31 fixture remains exact');
const fixture = JSON.parse(fixtureBytes);
const authentic = new Map(fixture.sourceFiles.map(record => [record.path, record]));
assert.equal(fixture.baselineFiles, 1507); assert.equal(authentic.size, 8);
function verifyPackage(beforeBytes, currentBytes) {
  const before = JSON.parse(beforeBytes), current = JSON.parse(currentBytes);
  assert.equal(before.version, '0.31.0'); assert.equal(current.version, '0.31.0');
  assert.equal(current.scripts['test:gettysburg-v32'], 'node --test --test-reporter=spec scripts/test-gettysburg-v32-contact.mjs');
  assert.equal(current.scripts['test:assault-sector'], 'node --test --test-reporter=spec scripts/test-assault-sector-presentation.mjs');
  assert.equal(current.scripts.test, before.scripts.test + ' && npm run test:gettysburg-v32 && npm run test:assault-sector');
  assert.equal(current.scripts['test:gettysburg-art-current'], before.scripts['test:gettysburg-art-current'] + ' scripts/test-gettysburg-v32-contact.mjs');
  assert.equal(current.scripts['validate:gettysburg-native'], before.scripts['validate:gettysburg-native'] + ' && python3 scripts/author-gettysburg-v32-clips.py --check --self-test');
  delete current.scripts['test:gettysburg-v32']; delete current.scripts['test:assault-sector'];
  for (const key of ['test', 'test:gettysburg-art-current', 'validate:gettysburg-native']) current.scripts[key] = before.scripts[key];
  assert.deepEqual(current, before, 'Only the five mandatory script fields may change');
}
function verifyHistoricalAdapter(path, beforeBytes, currentBytes) {
  const before = beforeBytes.toString('utf8'), current = currentBytes.toString('utf8');
  if (['scripts/test-support/gettysburgV31Preservation.mjs', 'scripts/test-support/checkpointRepairPreservation.mjs'].includes(path)) {
    const anchor = "import { fileURLToPath } from 'node:url';", old = '  return readFileSync(ROOT + path);';
    assert.equal(before.split(anchor).length - 1, 1); assert.equal(before.split(old).length - 1, 1);
    assert.equal(current, before.replace(anchor, anchor + "\nimport { v32HistoricalSource } from './gettysburgV32Preservation.mjs';")
      .replace(old, '  return v32HistoricalSource(path);'), 'Only declared historical byte reads may migrate');
  }
  if (path === 'scripts/test-gettysburg-v31-contact.mjs') {
    const anchor = before.split('\n')[0];
    const old = 'for (const record of fixture.protectedFiles) assert.equal(sha(readFileSync(file(record.path))), record.sha256, record.path);';
    assert.equal(before.split(old).length - 1, 1);
    assert.equal(current, before.replace(anchor, anchor + "\nimport { v32HistoricalSource } from './test-support/gettysburgV32Preservation.mjs';")
      .replace(old, 'for (const record of fixture.protectedFiles) assert.equal(sha(v32HistoricalSource(record.path)), record.sha256, record.path);'),
      'All 25 actual-current v31 behavior cases remain unchanged');
  }
}
export function validateGettysburgV32MigrationLedger(ledger) {
  assert.deepEqual(ledger, expected, 'Only the exact reviewed seven-path migration is accepted');
  for (const record of ledger.migrations) {
    const original = authentic.get(record.path);
    assert.ok(original); assert.equal(original.sha256, record.beforeSHA256); assert.equal(original.archive, record.archive);
    const before = safeRead(record.archive), current = safeRead(record.path);
    assert.equal(sha(before), record.beforeSHA256, record.path + ' authentic before');
    assert.equal(sha(current), record.currentSHA256, record.path + ' fixed v32 current bytes');
    if (record.path === 'package.json') verifyPackage(before, current);
    verifyHistoricalAdapter(record.path, before, current);
  }
  return ledger;
}
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
let checked;
export function gettysburgV32MigrationLedger() {
  if (!checked) {
    const raw = safeRead(ledgerPath); assert.equal(sha(raw), ledgerSHA256, 'Fixed reviewed ledger bytes are required');
    checked = freeze(validateGettysburgV32MigrationLedger(JSON.parse(raw)));
  }
  return checked;
}
export function v32BeforeFile(path) {
  assert.ok(typeof path === 'string');
  const record = gettysburgV32MigrationLedger().migrations.find(row => row.path === path);
  assert.ok(record, 'Only the seven declared before snapshots may be read');
  const before = safeRead(record.archive); assert.equal(sha(before), record.beforeSHA256); return before;
}
// Only metadata/protected-byte assertions consume this view. Behavioral tests
// continue importing current modules, current Scene and current save lifecycle.
export function v32HistoricalSource(path) {
  const record = gettysburgV32MigrationLedger().migrations.find(row => row.path === path);
  if (!record) return safeRead(path);
  assert.equal(sha(safeRead(path)), record.currentSHA256, 'Current scoped bytes remain fixed: ' + path);
  return v32BeforeFile(path);
}
