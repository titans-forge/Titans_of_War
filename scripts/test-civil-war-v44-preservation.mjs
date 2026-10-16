import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { civilWarV44MigrationLedger, validateCivilWarV44MigrationLedger, v44BeforeFile,
  v44CurrentFile, v44HistoricalSource, CIVIL_WAR_V44_MIGRATION_PATHS } from './test-support/civilWarV44Preservation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const baselineSHA256 = '3c6ac3c2a1596f919f169002a85c250b8d04a4c73f8622224b8f299c1c464d4a';

test('frozen v44 has one portable installed baseline and only exact actual source migrations', () => {
  const ledger = civilWarV44MigrationLedger();
  assert.equal(ledger.status, 'frozen-final-runtime-pins');
  assert.equal(ledger.baselineSHA256, baselineSHA256);
  assert.equal(ledger.baselineFiles, 1649); assert.equal(ledger.baselineBytes, 559653963);
  assert.equal(ledger.oldFixturesRefreshed, false); assert.equal(ledger.oldMigrationLedgersEdited, false);
  assert.equal(ledger.behavioralAssertionsChanged, true); assert.equal(ledger.testLifecycleChanged, true);
  assert.equal(ledger.originalAssertionsRemovedOrWeakened, false);
  assert.deepEqual(ledger.scoringCoverage, { legacyBattleRulesVersion: 17, legacyCases: 440, currentBattleRulesVersion: 18,
    currentCases: 80, expectedCurrentScores: 'independent-literal-matrix' });
  assert.equal(sha(readFileSync(root + ledger.fixture.path)), baselineSHA256);
  assert.deepEqual(ledger.migrations.map(row => row.path), CIVIL_WAR_V44_MIGRATION_PATHS);
  assert.equal(ledger.migrations.some(row => row.path === 'scripts/test-support/battleDisplayComponentHarness.mjs'), false);
  assert.equal(ledger.migrations.length, 12); assert.equal(ledger.archivePins.length, 16);
  assert.equal(Object.isFrozen(ledger), true); assert.equal(Object.isFrozen(ledger.migrations[0]), true);
});

test('the additive historical chain returns authentic before bytes while current readers return physical runtime bytes', () => {
  const ledger = civilWarV44MigrationLedger();
  for (const row of ledger.migrations) {
    const physical = readFileSync(root + row.path);
    const current = v44CurrentFile(row.path, root + row.path);
    const historical = v44HistoricalSource(row.path, new URL('../' + row.path, import.meta.url));
    assert.deepEqual(current, physical); assert.equal(sha(current), row.currentSHA256);
    assert.equal(sha(historical), row.beforeSHA256); assert.deepEqual(historical, v44BeforeFile(row.path));
    assert.notDeepEqual(current, historical, row.path + ' must represent an actual migration');
  }
  const unchanged = 'src/battle/civilWarEngine.js';
  assert.deepEqual(v44HistoricalSource(unchanged), readFileSync(root + unchanged));
  assert.deepEqual(v44HistoricalSource('scripts/fixtures/gettysburg-v41-migrations.json'), readFileSync(root + 'scripts/fixtures/gettysburg-v41-migrations.json'));
});

test('every original lifecycle assertion and callback remains byte exact outside its cleanup transformation', () => {
  for (const path of ['scripts/test-gettysburg-v38-command-access.mjs', 'scripts/test-battle-display-preferences.mjs', 'scripts/test-assault-sector-presentation.mjs']) {
    const old = v44BeforeFile(path).toString('utf8'), current = v44CurrentFile(path).toString('utf8');
    assert.deepEqual(current.split('\n').filter(line => line.includes('assert.')), old.split('\n').filter(line => line.includes('assert.')));
    assert.ok(current.includes("from 'node:test';"));
    assert.ok(current.includes("vite.ssrLoadModule('/src/components/CivilWarBattleEncounter.jsx')") || current.includes('component.module.CivilWarBattleEncounter(props)'));
  }
  const current = v44CurrentFile('scripts/test-battle-display-preferences.mjs').toString('utf8');
  assert.ok(current.includes("before(async () => { component = await createDisplayHarness(root); });"));
  assert.ok(current.includes("after(async () => { await component?.close(); });"));
  assert.ok(current.includes("before(async () => { wrapper = await createDisplayHarness(root, { wrapper: true }); });"));
  assert.ok(current.includes("after(async () => { await wrapper?.close(); });"));
});

test('v44 rejects changed, extra, missing, inherited and sparse authority claims', () => {
  const original = civilWarV44MigrationLedger();
  const changes = [
    ledger => { ledger.migrations[0].currentSHA256 = '0'.repeat(64); },
    ledger => { ledger.migrations[0].beforeSHA256 = '0'.repeat(64); },
    ledger => { ledger.migrations[0].archive = 'scripts/test-support/civil-war-v44-before/package-lock.json'; },
    ledger => { ledger.migrations.push({ path: 'src/battle/civilWarEngine.js', archive: 'invented', beforeSHA256: '0'.repeat(64), currentSHA256: '0'.repeat(64), reason: 'undeclared' }); },
    ledger => { ledger.migrations.pop(); },
    ledger => { ledger.newSourcePins[0].sha256 = '0'.repeat(64); },
    ledger => { ledger.status = 'draft-runtime-pins-pending'; },
    ledger => { ledger.oldFixturesRefreshed = true; },
    ledger => { ledger.behavioralAssertionsChanged = false; },
    ledger => { ledger.originalAssertionsRemovedOrWeakened = true; },
    ledger => { ledger.scoringCoverage.currentCases = 0; },
    ledger => { ledger.extra = true; },
    ledger => { ledger[Symbol('extra')] = true; },
    ledger => { delete ledger.archivePins[0]; },
    ledger => { Object.setPrototypeOf(ledger, { inherited: true }); },
    ledger => { ledger.migrations[0] = ledger; },
  ];
  for (const change of changes) {
    const ledger = structuredClone(original); change(ledger);
    assert.throws(() => validateCivilWarV44MigrationLedger(ledger));
  }
});

test('v44 rejects caller accessors without invoking them at the root or nested pin', () => {
  let reads = 0;
  const rootAccessor = {}; Object.defineProperty(rootAccessor, 'schema', { enumerable: true, get() { reads++; throw Error('caller getter executed'); } });
  assert.throws(() => validateCivilWarV44MigrationLedger(rootAccessor));
  const nested = structuredClone(civilWarV44MigrationLedger());
  Object.defineProperty(nested.migrations[0], 'currentSHA256', { enumerable: true, get() { reads++; throw Error('caller getter executed'); } });
  assert.throws(() => validateCivilWarV44MigrationLedger(nested));
  assert.equal(reads, 0);
});

test('historical and current readers reject noncanonical and cross-root paths', () => {
  for (const path of ['../package.json', '/package.json', './package.json', 'scripts//fixtures/gettysburg-v41-migrations.json', 'scripts\\fixtures\\gettysburg-v41-migrations.json', '']) {
    assert.throws(() => v44HistoricalSource(path)); assert.throws(() => v44CurrentFile(path));
  }
  const foreignFile = new URL('../../package.json', import.meta.url);
  assert.throws(() => v44HistoricalSource('package.json', fileURLToPath(foreignFile)));
  assert.throws(() => v44CurrentFile('package.json', foreignFile));
  assert.throws(() => v44BeforeFile('src/battle/civilWarEngine.js'));
});
