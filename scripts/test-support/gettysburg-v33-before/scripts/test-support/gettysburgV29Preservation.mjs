import assert from 'node:assert/strict';
import { readFileSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';

export const GETTYSBURG_V29_MIGRATION_PATHS = Object.freeze([
  'src/battle/CivilWarBattlefield.jsx', 'src/battle/gettysburgInfantryVolleyPresentation.js',
  'scripts/test-gettysburg-v18-policy.mjs',
  ...[20, 21, 22, 23, 24, 25, 26].map(v => `scripts/test-gettysburg-v${v}-contact.mjs`),
  ...[27, 28].map(v => `scripts/test-gettysburg-v${v}-policy.mjs`),
]);
const ledgerPath = 'scripts/fixtures/gettysburg-v29-preservation-migrations.json';
const sha = raw => createHash('sha256').update(raw).digest('hex');
const safeRead = (root, path) => {
  assert.ok(typeof path === 'string' && !path.includes('..') && !path.includes('\\') && !path.startsWith('/'));
  const url = root(path);
  assert.ok(!lstatSync(url).isSymbolicLink(), path);
  return readFileSync(url);
};
export function gettysburgV29MigrationLedger(root, supplied) {
  const ledger = supplied ?? JSON.parse(safeRead(root, ledgerPath));
  assert.equal(ledger.schema, 'gettysburg-v29-historical-hash-migration-v1');
  assert.equal(ledger.reason, 'Authorized v29 presentation-scale runtime change with immutable historical fixtures and mandatory before/current legacy behavior differential');
  assert.equal(ledger.historicalFixturesRefreshed, false);
  assert.equal(ledger.mandatoryDifferentialGate, 'scripts/test-gettysburg-v29-readability.mjs');
  assert.equal(ledger.supplement.path, 'scripts/fixtures/gettysburg-v29-preservation-supplement.json');
  assert.equal(sha(safeRead(root, ledger.supplement.path)), ledger.supplement.sha256);
  const supplement = JSON.parse(safeRead(root, ledger.supplement.path));
  assert.equal(supplement.schema, 'gettysburg-v29-authentic-baseline-supplement-v1');
  assert.equal(supplement.sourceFiles.length, 1);
  assert.equal(supplement.sourceFiles[0].path, 'scripts/test-gettysburg-v18-policy.mjs');
  assert.equal(supplement.originalFixture.sha256, sha(safeRead(root, supplement.originalFixture.path)));
  assert.equal(ledger.migrations.length, GETTYSBURG_V29_MIGRATION_PATHS.length);
  assert.deepEqual(ledger.migrations.map(record => record.path).sort(), [...GETTYSBURG_V29_MIGRATION_PATHS].sort());
  for (const record of ledger.migrations) {
    assert.match(record.beforeSHA256, /^[0-9a-f]{64}$/);
    assert.match(record.currentSHA256, /^[0-9a-f]{64}$/);
    assert.equal(record.archive, `scripts/test-support/gettysburg-v29-before/${record.path}`);
    assert.ok(typeof record.reason === 'string' && record.reason.length > 20);
    assert.equal(sha(safeRead(root, record.archive)), record.beforeSHA256, record.path + ' authentic archive');
    assert.equal(sha(safeRead(root, record.path)), record.currentSHA256, record.path + ' declared current bytes');
    if (record.path === 'scripts/test-gettysburg-v18-policy.mjs') {
      assert.equal(record.beforeSHA256, supplement.sourceFiles[0].sha256);
      assert.equal(record.beforeSHA256, supplement.sourceFiles[0].rootBaselineEntrySHA256);
    }
  }
  return ledger;
}
export function assertGettysburgV29HistoricalFile(record, root) {
  assert.match(record.sha256, /^[0-9a-f]{64}$/);
  if (!GETTYSBURG_V29_MIGRATION_PATHS.includes(record.path)) {
    assert.equal(sha(safeRead(root, record.path)), record.sha256, record.path);
    return;
  }
  const migrated = gettysburgV29MigrationLedger(root).migrations.find(entry => entry.path === record.path);
  assert.equal(migrated.beforeSHA256, record.sha256, record.path + ' historical fixture hash');
  assert.equal(sha(safeRead(root, migrated.archive)), record.sha256, record.path + ' archived historical bytes');
  assert.equal(sha(safeRead(root, record.path)), migrated.currentSHA256, record.path + ' reviewed migration bytes');
}
