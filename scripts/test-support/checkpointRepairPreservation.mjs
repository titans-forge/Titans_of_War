import assert from 'node:assert/strict';
import { readFileSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { v32HistoricalSource } from './gettysburgV32Preservation.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ledgerPath = 'scripts/fixtures/checkpoint-repair-migrations.json';
const ledgerSHA256 = '414eb712566fa3cbbfc617c92cb40be5ac6c879c8748426cecf9b8cbae10071d';
const expected = {
  schema: 'checkpoint-repair-historical-preservation-v1',
  baselineSHA256: '89588f397ab5c8523a56b42c913a5cb5d68e2258c910169c4f2b20534ec03194',
  baselineFiles: 1464,
  fixture: { path: 'scripts/fixtures/gettysburg-v30-preservation.json', sha256: 'e637d09ccf13e0cb2ff48376a0462e102d42589135e9a8f417bf183ff0467355' },
  oldFixturesRefreshed: false,
  oldMigrationLedgersEdited: false,
  mandatoryRegistration: 'scripts/test-save-flow-source.mjs',
  mandatorySuite: 'scripts/test-field-suspend-save.mjs',
  gateBefore: { path: 'scripts/test-support/checkpoint-repair-before/scripts/test-gettysburg-v30-contact.mjs', sha256: '4d4558e0cb3910f9895ce9d140effdfefe8952d6e7bd3f34e8e50dc79195c356' },
  migrations: [
    { path: 'src/App.jsx', archive: 'scripts/test-support/checkpoint-repair-before/src/App.jsx',
      beforeSHA256: 'a542d8c772190d905014933749d2a27fdbdc1659d4be5493b28376180e69be9f',
      currentSHA256: '8d0b7556a667b5bc928da73c39e9f7638791830b929f13705e08b015d25faf90',
      reason: 'Authorized checkpoint ownership autosave guard, remembered campaign owner and staged Save & Leave handler; exact anchors and storage formats unchanged.' },
    { path: 'scripts/test-save-flow-source.mjs', archive: 'scripts/test-support/checkpoint-repair-before/scripts/test-save-flow-source.mjs',
      beforeSHA256: '5ec504418ceac84571bf5a9fdcdb4bebb4e40f28afcfa7dd46fc140f110a897d',
      currentSHA256: 'e4de80c31ae72c18238ca7e38d73b2107bf384d2ad18bf00ef04f50e6472a6b1',
      reason: 'Mandatory registration of the current-App checkpoint lifecycle and storage-fault suite; every original behavior assertion retained.' },
  ],
};
function safeRead(path) {
  assert.ok(typeof path === 'string' && path.length > 0 && !path.startsWith('/') && !path.includes('\\'));
  const parts = path.split('/');
  assert.ok(parts.every(part => part && part !== '.' && part !== '..'), 'Only canonical source paths are allowed');
  for (let i = 1; i <= parts.length; i++) assert.equal(lstatSync(ROOT + parts.slice(0, i).join('/')).isSymbolicLink(), false, path);
  assert.ok(lstatSync(ROOT + path).isFile(), path);
  return v32HistoricalSource(path);
}
const historicalBytes = safeRead(expected.fixture.path);
assert.equal(sha(historicalBytes), expected.fixture.sha256, 'The original v30 fixture remains byte exact');
const fixture = JSON.parse(historicalBytes);
const historical = new Map(fixture.protectedFiles.map(record => [record.path, record.sha256]));
assert.equal(historical.size, 1426);

export function validateCheckpointRepairLedger(ledger) {
  // Exact two-path allowlist, immutable original hashes and fixed repaired
  // hashes. Reject extra fields, paths, duplicates and self-refreshed hashes.
  assert.deepEqual(ledger, expected, 'Only the declared checkpoint repair migration is accepted');
  for (const record of ledger.migrations) {
    assert.equal(record.beforeSHA256, historical.get(record.path), record.path);
    assert.equal(sha(safeRead(record.archive)), record.beforeSHA256, record.path + ' authentic before bytes');
    assert.equal(sha(safeRead(record.path)), record.currentSHA256, record.path + ' fixed repaired bytes');
  }
  assert.equal(sha(safeRead(ledger.gateBefore.path)), ledger.gateBefore.sha256);
  return ledger;
}
let checkedLedger;
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
export function checkpointRepairMigrationLedger() {
  if (!checkedLedger) {
    const bytes = safeRead(ledgerPath);
    assert.equal(sha(bytes), ledgerSHA256, 'The exact reviewed ledger bytes are required');
    checkedLedger = freeze(validateCheckpointRepairLedger(JSON.parse(bytes)));
  }
  return checkedLedger;
}
export function assertHistoricalCheckpointRepairFile(record) {
  assert.ok(record && typeof record === 'object' && !Array.isArray(record));
  assert.deepEqual(Object.keys(record).sort(), ['path', 'sha256']);
  assert.equal(record.sha256, historical.get(record.path), 'The record must come from the unchanged original v30 fixture');
  assert.ok(historical.has(record.path), 'Unrecognized historical path');
  const migrated = checkpointRepairMigrationLedger().migrations.find(value => value.path === record.path);
  if (migrated) {
    assert.equal(sha(safeRead(migrated.archive)), record.sha256, record.path + ' original fixture binding');
    assert.equal(sha(safeRead(record.path)), migrated.currentSHA256, record.path + ' explicit repair binding');
  } else {
    assert.equal(sha(safeRead(record.path)), record.sha256, record.path);
  }
}
