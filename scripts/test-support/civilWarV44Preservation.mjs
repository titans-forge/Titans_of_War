import assert from 'node:assert/strict';
import { readFileSync, lstatSync, readdirSync, realpathSync, openSync, fstatSync, closeSync, constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Only historical metadata/protected-byte checks use this reader. Production
// imports, Vite component/Scene loads and behavioral callbacks read current files.
// This module is bound externally by the frozen acceptance manifest; its exact
// ledger and portable installed-v41 catalog are also bound here by their hashes.
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ledgerPath = 'scripts/fixtures/civil-war-v44-migrations.json';
const ledgerSHA256 = 'ef95e09737ae5c0393eac3242042377eabb7b12a6937efc6ca2ea5b362304b2d';
/* V44_EXPECTED_START */
const expected = {
  "schema": "civil-war-v44-historical-byte-migration-v1",
  "status": "frozen-final-runtime-pins",
  "baselineSHA256": "3c6ac3c2a1596f919f169002a85c250b8d04a4c73f8622224b8f299c1c464d4a",
  "baselineFiles": 1649,
  "baselineBytes": 559653963,
  "fixture": {
    "path": "scripts/fixtures/civil-war-v44-preservation.json",
    "sha256": "3c6ac3c2a1596f919f169002a85c250b8d04a4c73f8622224b8f299c1c464d4a"
  },
  "oldFixturesRefreshed": false,
  "oldMigrationLedgersEdited": false,
  "behavioralAssertionsChanged": true,
  "originalAssertionsRemovedOrWeakened": false,
  "testLifecycleChanged": true,
  "scoringCoverage": {
    "legacyBattleRulesVersion": 17,
    "legacyCases": 440,
    "currentBattleRulesVersion": 18,
    "currentCases": 80,
    "expectedCurrentScores": "independent-literal-matrix"
  },
  "mandatoryRegistration": "package.json",
  "mandatorySuite": "scripts/test-civil-war-v44-preservation.mjs",
  "capturedBeforePaths": [
    "src/game/battles.js",
    "src/game/scenarios.js",
    "src/game/simulationEngine.js",
    "src/game/initialState.js",
    "src/game/campaignSupply.js",
    "src/components/CivilWarBattleEncounter.jsx",
    "src/battle/CivilWarBattlefield.jsx",
    "src/battle/fieldViewCheckpoint.js",
    "src/components/WithdrawalGoals.jsx",
    "scripts/test-gettysburg-v38-command-access.mjs",
    "scripts/test-battle-display-preferences.mjs",
    "scripts/test-support/battleDisplayComponentHarness.mjs",
    "scripts/test-support/gettysburgV41Preservation.mjs",
    "package.json",
    "scripts/test-public-scoring.mjs",
    "scripts/test-assault-sector-presentation.mjs"
  ],
  "archivePins": [
    {
      "path": "src/game/battles.js",
      "archive": "scripts/test-support/civil-war-v44-before/src/game/battles.js",
      "sha256": "19a8dd8e5b985aa4d6e56b0e3762d12d01564e8ce2bc2416bdc2194b85bf8587"
    },
    {
      "path": "src/game/scenarios.js",
      "archive": "scripts/test-support/civil-war-v44-before/src/game/scenarios.js",
      "sha256": "ca144ad3bda8572096da90c45c74f7c1b510ed00885480f894107b0185de02fe"
    },
    {
      "path": "src/game/simulationEngine.js",
      "archive": "scripts/test-support/civil-war-v44-before/src/game/simulationEngine.js",
      "sha256": "70ff904af91e2be59ff922cee8546f96e4ace7a99a488de9902200bfbd1c2a80"
    },
    {
      "path": "src/game/initialState.js",
      "archive": "scripts/test-support/civil-war-v44-before/src/game/initialState.js",
      "sha256": "32b97843ce4419e896dd0407d1ac28163210a169e0af0947eefe1253e8caab04"
    },
    {
      "path": "src/game/campaignSupply.js",
      "archive": "scripts/test-support/civil-war-v44-before/src/game/campaignSupply.js",
      "sha256": "35dbb5a1218eec7ca2c927208863125f991520e4d2a13b63f027879045a48396"
    },
    {
      "path": "src/components/CivilWarBattleEncounter.jsx",
      "archive": "scripts/test-support/civil-war-v44-before/src/components/CivilWarBattleEncounter.jsx",
      "sha256": "7d88976dd0813224f3826ca68344942a026bece0805b0545b8732f8a11eae10e"
    },
    {
      "path": "src/battle/CivilWarBattlefield.jsx",
      "archive": "scripts/test-support/civil-war-v44-before/src/battle/CivilWarBattlefield.jsx",
      "sha256": "5f30baf4b8fa1388c106ed33f1f0f97856faaa3021c2bbf63952dff883b59ec5"
    },
    {
      "path": "src/battle/fieldViewCheckpoint.js",
      "archive": "scripts/test-support/civil-war-v44-before/src/battle/fieldViewCheckpoint.js",
      "sha256": "0535f77a62a6dd421cd4d786a9bb67435976240d1883200a94afb4bc85a54864"
    },
    {
      "path": "src/components/WithdrawalGoals.jsx",
      "archive": "scripts/test-support/civil-war-v44-before/src/components/WithdrawalGoals.jsx",
      "sha256": "8e4e13497798ae7a67bf2167cae80846eb9e9391f9b8479526a8311586e5a10b"
    },
    {
      "path": "scripts/test-gettysburg-v38-command-access.mjs",
      "archive": "scripts/test-support/civil-war-v44-before/scripts/test-gettysburg-v38-command-access.mjs",
      "sha256": "5d5c145d7646dac4ed1745167535b50b51aa8dfc331a9223f038045bb99d7763"
    },
    {
      "path": "scripts/test-battle-display-preferences.mjs",
      "archive": "scripts/test-support/civil-war-v44-before/scripts/test-battle-display-preferences.mjs",
      "sha256": "263473beb6153c963b1ffa8a3a267c76aaf292f6b3c57e4091c0a2e80f3bba4f"
    },
    {
      "path": "scripts/test-support/battleDisplayComponentHarness.mjs",
      "archive": "scripts/test-support/civil-war-v44-before/scripts/test-support/battleDisplayComponentHarness.mjs",
      "sha256": "eb6119cbd1be0a5ac2f5aca72612aa46b6d88a346b7724baab04192bed19200d"
    },
    {
      "path": "scripts/test-support/gettysburgV41Preservation.mjs",
      "archive": "scripts/test-support/civil-war-v44-before/scripts/test-support/gettysburgV41Preservation.mjs",
      "sha256": "50e55e64f21892d7cbad894a0cf91f16d62b5f1da2e67d7b93b09db94557e62a"
    },
    {
      "path": "package.json",
      "archive": "scripts/test-support/civil-war-v44-before/package.json",
      "sha256": "6216a2ea9f00b01553db34c427db3a320eb9221dfdc91d5617b72b446eba2c3c"
    },
    {
      "path": "scripts/test-public-scoring.mjs",
      "archive": "scripts/test-support/civil-war-v44-before/scripts/test-public-scoring.mjs",
      "sha256": "68642dd5843e07f8f1307c7cfb027bc4738ee111b91452b9ea7e3a1c761bc228"
    },
    {
      "path": "scripts/test-assault-sector-presentation.mjs",
      "archive": "scripts/test-support/civil-war-v44-before/scripts/test-assault-sector-presentation.mjs",
      "sha256": "f7f1348ab7badfa5b0cd860cf9432bd847d6268fb1c65f077d04662ca8ffeb88"
    }
  ],
  "metadataOwners": [
    "scripts/test-support/civilWarV44Preservation.mjs",
    "scripts/fixtures/civil-war-v44-migrations.json",
    "scripts/fixtures/civil-war-v44-preservation.json"
  ],
  "migrations": [
    {
      "path": "package.json",
      "archive": "scripts/test-support/civil-war-v44-before/package.json",
      "beforeSHA256": "6216a2ea9f00b01553db34c427db3a320eb9221dfdc91d5617b72b446eba2c3c",
      "currentSHA256": "509d351108f9f139b993119fa8e101df2ad1053cf6846c38cca9bed2a21cdbfb",
      "reason": "Only four mandatory v44 test registrations; version, dependencies and lockfile remain exact."
    },
    {
      "path": "src/game/battles.js",
      "archive": "scripts/test-support/civil-war-v44-before/src/game/battles.js",
      "beforeSHA256": "19a8dd8e5b985aa4d6e56b0e3762d12d01564e8ce2bc2416bdc2194b85bf8587",
      "currentSHA256": "5f4d88af49788a0c403bd5a642d23dfc7088a7d48d18c716afd8cdf682fcdf2a",
      "reason": "Bind current field-result consequences to campaign choices and explain their strategic meaning without changing battle mechanics."
    },
    {
      "path": "src/game/scenarios.js",
      "archive": "scripts/test-support/civil-war-v44-before/src/game/scenarios.js",
      "beforeSHA256": "ca144ad3bda8572096da90c45c74f7c1b510ed00885480f894107b0185de02fe",
      "currentSHA256": "890188e04fb6bd0fc686d453be753003f2ed830d7cf93aa5f9c06acf972bbe33",
      "reason": "Gate current campaign outcome claims and election requirements on recorded field-result consequences while preserving historical saved choices."
    },
    {
      "path": "src/game/simulationEngine.js",
      "archive": "scripts/test-support/civil-war-v44-before/src/game/simulationEngine.js",
      "beforeSHA256": "70ff904af91e2be59ff922cee8546f96e4ace7a99a488de9902200bfbd1c2a80",
      "currentSHA256": "e5c478953f861993654d03501a723b6da9b96e1dbe629641f0fd2d5405c528be",
      "reason": "Versioned field-result-aware current campaign transitions and election credit with legacy saved-history compatibility."
    },
    {
      "path": "src/components/CivilWarBattleEncounter.jsx",
      "archive": "scripts/test-support/civil-war-v44-before/src/components/CivilWarBattleEncounter.jsx",
      "beforeSHA256": "7d88976dd0813224f3826ca68344942a026bece0805b0545b8732f8a11eae10e",
      "currentSHA256": "7cfc41077eae17e1deb928939b504bc80854e3cb16edcf116b94f91bd14ef187",
      "reason": "Capture and restore optional validated field-view context through actual checkpoint ownership; retain combat, save and display preferences."
    },
    {
      "path": "src/battle/CivilWarBattlefield.jsx",
      "archive": "scripts/test-support/civil-war-v44-before/src/battle/CivilWarBattlefield.jsx",
      "beforeSHA256": "5f30baf4b8fa1388c106ed33f1f0f97856faaa3021c2bbf63952dff883b59ec5",
      "currentSHA256": "e3194f28eefbc5df63cfabbef47868dcff3ad08d0d5238057a76e11453448742",
      "reason": "Restore and capture bounded optional selection/camera context in the existing Scene checkpoint and wrapper without changing combat state."
    },
    {
      "path": "src/components/WithdrawalGoals.jsx",
      "archive": "scripts/test-support/civil-war-v44-before/src/components/WithdrawalGoals.jsx",
      "beforeSHA256": "8e4e13497798ae7a67bf2167cae80846eb9e9391f9b8479526a8311586e5a10b",
      "currentSHA256": "4e430e13a90d0fc27d49e1cf00ccaf816ea81c1ffc438bf0453b8ac2833eab18",
      "reason": "Explain missing withdrawal prerequisites after terminal settlement; preserve existing live-state text and calculations."
    },
    {
      "path": "scripts/test-gettysburg-v38-command-access.mjs",
      "archive": "scripts/test-support/civil-war-v44-before/scripts/test-gettysburg-v38-command-access.mjs",
      "beforeSHA256": "5d5c145d7646dac4ed1745167535b50b51aa8dfc331a9223f038045bb99d7763",
      "currentSHA256": "03cac8bb7deb83373bba102634eda519c48b3159d4e6acea22995ccf4ffeb9f7",
      "reason": "Only Node after-hook cleanup timing; every existing callback, assertion, runtime import and witness stays exact."
    },
    {
      "path": "scripts/test-battle-display-preferences.mjs",
      "archive": "scripts/test-support/civil-war-v44-before/scripts/test-battle-display-preferences.mjs",
      "beforeSHA256": "263473beb6153c963b1ffa8a3a267c76aaf292f6b3c57e4091c0a2e80f3bba4f",
      "currentSHA256": "eed78f365fd1ed4e24d693f75415a8e88abcd10d078ca2eaaaacf059322f92bc",
      "reason": "Only sequential suite before/after window ownership; every existing callback, assertion, runtime import and witness stays exact."
    },
    {
      "path": "scripts/test-support/gettysburgV41Preservation.mjs",
      "archive": "scripts/test-support/civil-war-v44-before/scripts/test-support/gettysburgV41Preservation.mjs",
      "beforeSHA256": "50e55e64f21892d7cbad894a0cf91f16d62b5f1da2e67d7b93b09db94557e62a",
      "currentSHA256": "e2d5296aa6e478e68b80bed821d971b82e3f3dbb56d6bbfca7bb6715011d1421",
      "reason": "Only v44 historical-source import and directRead metadata return; every original v41 fixture, ledger and assertion stays exact."
    },
    {
      "path": "scripts/test-public-scoring.mjs",
      "archive": "scripts/test-support/civil-war-v44-before/scripts/test-public-scoring.mjs",
      "beforeSHA256": "68642dd5843e07f8f1307c7cfb027bc4738ee111b91452b9ea7e3a1c761bc228",
      "currentSHA256": "49cc162a0cbc56634dbb41c7113a372c697fe1d5e22e5400a729dfdd0394e4c0",
      "reason": "Bind all original 440 authored field-result cases and unchanged assertions to explicit legacy battle rule 17; add 80 current battle rule 18 cases with independent literal expected scores. No original assertions are removed or weakened."
    },
    {
      "path": "scripts/test-assault-sector-presentation.mjs",
      "archive": "scripts/test-support/civil-war-v44-before/scripts/test-assault-sector-presentation.mjs",
      "beforeSHA256": "f7f1348ab7badfa5b0cd860cf9432bd847d6268fb1c65f077d04662ca8ffeb88",
      "currentSHA256": "16f53c8c8f8aa6f13f9f6c9c3328348b5c185eed0d81ad82a76bc1da7592aa85",
      "reason": "Only Node after-hook cleanup timing with idempotent closeHarness and module-load failure cleanup; every original callback, assertion, production import and witness stays exact."
    }
  ],
  "newSourcePins": [
    {
      "path": "src/game/fieldResultConsequences.js",
      "sha256": "cc54481a25d542cf40438ee4ab9e6cae8b6c90bf103a73731da3566c3bcfa79e"
    },
    {
      "path": "src/battle/fieldViewContext.js",
      "sha256": "21b1888eeee3d4db0be1cedc259d29f32c7a236e62d1152e1adee4014914dc3c"
    },
    {
      "path": "scripts/test-campaign-field-causality.mjs",
      "sha256": "1047d55532a5c30643f4c9b7f6567a7e563fbfea935ed7d89e9fbc90113a11cb"
    },
    {
      "path": "scripts/test-field-view-context.mjs",
      "sha256": "12e6738e8da563a7800ddca74c034bab330f76bec326ecfe647e4a2c07073cd0"
    },
    {
      "path": "scripts/test-withdrawal-goals-ui.mjs",
      "sha256": "45e29d8c13d5114ff6184f0b3746521f5edef1d7cb749e3e35911e49e36e0231"
    },
    {
      "path": "scripts/test-civil-war-v44-preservation.mjs",
      "sha256": "5330eefb8599d6a483e121f06e4aeef293e2a45cc197e292d3a3b6cc4dfa1494"
    },
    {
      "path": "docs/CIVIL_WAR_V44_FINAL_FIXES.md",
      "sha256": "16069e56966e333effba3ad11e51e45c164199715b7b5fae46778ef3127935a6"
    }
  ]
};
/* V44_EXPECTED_END */
const adapterPath = 'scripts/test-support/gettysburgV41Preservation.mjs';
const lifecyclePaths = ['scripts/test-gettysburg-v38-command-access.mjs', 'scripts/test-battle-display-preferences.mjs', 'scripts/test-assault-sector-presentation.mjs'];
const exclusions = ['.git', 'node_modules', 'dist', '__pycache__', '.tmp'];
function canonicalPath(path) {
  assert.ok(typeof path === 'string' && path.length > 0 && path.length <= 512 && !path.startsWith('/') && !path.includes('\\'), 'Canonical relative source path required');
  const parts = path.split('/');
  assert.ok(parts.every(part => part && part !== '.' && part !== '..'), 'Canonical relative source path required');
  return parts;
}
function directRead(path) {
  const parts = canonicalPath(path);
  assert.equal(realpathSync(ROOT), ROOT.replace(/\/$/, ''), 'Physical canonical source root required');
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
    return bytes;
  } finally { closeSync(descriptor); }
}
// Validate descriptors first: no caller accessors, nonplain prototypes,
// sparse arrays, cycles, symbols or inherited migration claims are accepted.
function requirePlainData(value) {
  const seen = new Set(); let count = 0;
  const visit = (item, depth) => {
    assert.ok(++count <= 1024 && depth <= 12, 'Bounded plain migration data required');
    if (item === null || typeof item === 'boolean') return;
    if (typeof item === 'string') { assert.ok(item.length <= 4096); return; }
    if (typeof item === 'number') { assert.ok(Number.isFinite(item)); return; }
    assert.equal(typeof item, 'object', 'Only plain migration data accepted');
    assert.equal(seen.has(item), false, 'No cyclic or shared caller objects'); seen.add(item);
    assert.equal(Object.getOwnPropertySymbols(item).length, 0, 'No symbol metadata');
    if (Array.isArray(item)) {
      assert.equal(Object.getPrototypeOf(item), Array.prototype);
      const length = Object.getOwnPropertyDescriptor(item, 'length');
      assert.ok(length && Object.hasOwn(length, 'value') && Number.isInteger(length.value) && length.value <= 64);
      assert.equal(Object.getOwnPropertyNames(item).length, length.value + 1, 'No sparse or extra array properties');
      for (let i = 0; i < length.value; i++) {
        const descriptor = Object.getOwnPropertyDescriptor(item, String(i));
        assert.ok(descriptor && Object.hasOwn(descriptor, 'value') && descriptor.enumerable, 'Dense data entries required');
        visit(descriptor.value, depth + 1);
      }
    } else {
      assert.equal(Object.getPrototypeOf(item), Object.prototype, 'Plain object required');
      const names = Object.getOwnPropertyNames(item); assert.ok(names.length <= 64, 'Bounded metadata fields');
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
function replaceOnce(text, old, next) {
  assert.equal(text.split(old).length, 2, 'One exact lifecycle/adapter transformation anchor required');
  return text.replace(old, next);
}
function replaceLineOnce(text, old, next) {
  const lines = text.split('\n');
  assert.equal(lines.filter(line => line === old).length, 1, 'One exact metadata adapter line required');
  return lines.map(line => line === old ? next : line).join('\n');
}
function narrowAfter(path, before) {
  if (path === adapterPath) {
    let text = replaceLineOnce(before, "import { fileURLToPath } from 'node:url';", "import { fileURLToPath } from 'node:url';\nimport { v44HistoricalSource } from './civilWarV44Preservation.mjs';");
    return replaceLineOnce(text, '    return bytes;', '    return v44HistoricalSource(path);');
  }
  if (path === lifecyclePaths[0]) {
    let text = replaceOnce(before, "import test from 'node:test';", "import test, { after } from 'node:test';");
    text = replaceOnce(text, '});\nfunction nodes(tree, predicate, parent = null) {', `});
let closed = false;
async function closeHarness() {
  if (closed) return;
  closed = true;
  try { await vite.close(); }
  finally {
    rmSync(cacheDir, { recursive: true, force: true });
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
  }
}
after(closeHarness);
function nodes(tree, predicate, parent = null) {`);
    return replaceOnce(text, `} finally {
  await vite.close(); rmSync(cacheDir, { recursive: true, force: true });
  if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
}`, `} catch (error) {
  await closeHarness();
  throw error;
}`);
  }
  if (path === lifecyclePaths[1]) {
    let text = replaceOnce(before, "import test from 'node:test';", "import test, { after, before, describe } from 'node:test';");
    text = replaceOnce(text, 'const component = await createDisplayHarness(root);\ntry {', `describe('current component display controls', { concurrency: false }, () => {
  let component;
  before(async () => { component = await createDisplayHarness(root); });
  after(async () => { await component?.close(); });`);
    text = replaceOnce(text, '} finally { await component.close(); }', '});');
    text = replaceOnce(text, 'const wrapper = await createDisplayHarness(root, { wrapper: true });\ntry {', `describe('current field wrapper display controls', { concurrency: false }, () => {
  let wrapper;
  before(async () => { wrapper = await createDisplayHarness(root, { wrapper: true }); });
  after(async () => { await wrapper?.close(); });`);
    return replaceOnce(text, '} finally { await wrapper.close(); }', '});');
  }
  if (path === lifecyclePaths[2]) {
    let text = replaceOnce(before, "import test from 'node:test';", "import test, { after } from 'node:test';");
    text = replaceOnce(text, '});\nfunction nodes(root, predicate, parent = null) {', `});
let closed = false;
async function closeHarness() {
  if (closed) return;
  closed = true;
  try { await vite.close(); }
  finally {
    rmSync(cacheDir, { recursive: true, force: true });
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
  }
}
after(closeHarness);
function nodes(root, predicate, parent = null) {`);
    return replaceOnce(text, `} finally {
  await vite.close(); rmSync(cacheDir, { recursive: true, force: true });
  if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
}`, `} catch (error) {
  await closeHarness();
  throw error;
}`);
  }
  assert.fail('No other historical assertion source may receive a narrow adapter/lifecycle migration');
}
function verifyPackage(beforeBytes, currentBytes) {
  const before = JSON.parse(beforeBytes), current = JSON.parse(currentBytes);
  const transformed = JSON.parse(beforeBytes);
  for (const key of ['test', 'test:gettysburg-art-current', 'test:field-continuity']) transformed.scripts[key] += ' && npm run test:civil-war-v44';
  transformed.scripts['test:civil-war-v44'] = 'node --test --test-reporter=spec scripts/test-campaign-field-causality.mjs scripts/test-field-view-context.mjs scripts/test-withdrawal-goals-ui.mjs scripts/test-civil-war-v44-preservation.mjs';
  assert.equal(before.version, '0.31.0');
  assert.deepEqual(current, transformed, 'Only four mandatory v44 script fields may change');
  assert.equal(currentBytes.toString('utf8'), JSON.stringify(transformed, null, 2) + '\n', 'Exact package registration transformation required');
}
function authenticFixture() {
  const raw = directRead(expected.fixture.path);
  assert.ok(raw.length <= 2097152, 'Bounded authentic installed-v41 catalog');
  assert.equal(sha(raw), expected.fixture.sha256, 'Portable catalog is the exact installed baseline bytes');
  assert.equal(expected.fixture.sha256, expected.baselineSHA256);
  const fixture = JSON.parse(raw), names = Object.keys(fixture);
  assert.equal(names.length, 1649); assert.equal(expected.baselineFiles, 1649); assert.equal(expected.baselineBytes, 559653963);
  for (const path of names) { canonicalPath(path); assert.match(fixture[path], /^[0-9a-f]{64}$/); }
  const migrations = new Set(expected.migrations.map(row => row.path));
  assert.equal(migrations.size, expected.migrations.length, 'No duplicate migration authority');
  assert.deepEqual(expected.archivePins.map(row => row.path), expected.capturedBeforePaths);
  for (const row of expected.archivePins) {
    assert.equal(row.archive, 'scripts/test-support/civil-war-v44-before/' + row.path);
    assert.equal(row.sha256, fixture[row.path], 'All before snapshots bind installed baseline bytes');
    assert.equal(sha(directRead(row.archive)), row.sha256, 'Immutable authentic before snapshot: ' + row.path);
  }
  for (const row of expected.migrations) {
    assert.ok(Object.hasOwn(fixture, row.path), 'Only authentic existing source paths may migrate');
    assert.equal(row.beforeSHA256, fixture[row.path]);
    assert.equal(row.archive, 'scripts/test-support/civil-war-v44-before/' + row.path);
    assert.ok(expected.archivePins.some(pin => pin.archive === row.archive && pin.sha256 === row.beforeSHA256));
  }
  return fixture;
}
function exactDraft(ledger) {
  requirePlainData(ledger);
  assert.deepEqual(ledger, expected, 'Only exact declared v44 migrations and explicit pins are accepted');
  return ledger;
}
function readLedger() {
  const raw = directRead(ledgerPath);
  assert.ok(raw.length <= 65536, 'Bounded exact migration ledger');
  assert.equal(sha(raw), ledgerSHA256, 'Exact v44 ledger bytes required');
  return exactDraft(JSON.parse(raw));
}
function pendingError() {
  const error = new Error('V44 preservation awaits final frozen source and package pins.');
  error.code = 'V44_RUNTIME_PINS_PENDING'; return error;
}
export function validateCivilWarV44MigrationLedger(ledger) {
  exactDraft(ledger);
  if (ledger.status !== 'frozen-final-runtime-pins' || ledger.migrations.some(row => row.currentSHA256 === null) || ledger.newSourcePins.some(row => row.sha256 === null)) throw pendingError();
  const fixture = authenticFixture(), started = performance.now();
  let baselineBytes = 0;
  const migrated = new Set(ledger.migrations.map(row => row.path));
  for (const row of ledger.migrations) {
    assert.match(row.currentSHA256, /^[0-9a-f]{64}$/);
    const before = directRead(row.archive), current = directRead(row.path);
    assert.notEqual(row.currentSHA256, row.beforeSHA256, 'Unchanged files do not receive migration authority');
    assert.equal(sha(current), row.currentSHA256, 'Explicit pinned current migration bytes: ' + row.path);
    if (row.path === 'package.json') verifyPackage(before, current);
    if (row.path === adapterPath || lifecyclePaths.includes(row.path)) {
      assert.equal(current.toString('utf8'), narrowAfter(row.path, before.toString('utf8')), 'Every original assertion, callback and import stays exact apart from declared cleanup or metadata delegation');
    }
  }
  for (const row of ledger.newSourcePins) {
    canonicalPath(row.path); assert.match(row.sha256, /^[0-9a-f]{64}$/);
    assert.equal(Object.hasOwn(fixture, row.path), false, 'New-source pins cannot replace a baseline file');
    assert.equal(sha(directRead(row.path)), row.sha256, 'Explicit pinned new source bytes: ' + row.path);
  }
  for (const [path, hash] of Object.entries(fixture)) {
    const row = ledger.migrations.find(value => value.path === path);
    const bytes = directRead(row ? row.archive : path); baselineBytes += bytes.length;
    assert.ok(baselineBytes <= 2147483648 && performance.now() - started <= 90000, 'Bounded complete original baseline');
    assert.equal(sha(bytes), hash, 'Every unrelated protected byte remains installed-baseline exact: ' + path);
  }
  assert.equal(baselineBytes, ledger.baselineBytes);
  const permitted = [...Object.keys(fixture), ...ledger.archivePins.map(row => row.archive), ...ledger.newSourcePins.map(row => row.path), ...ledger.metadataOwners];
  assert.equal(new Set(permitted).size, permitted.length, 'No duplicate/overlapping new-source authority');
  assert.ok(permitted.length <= 2000);
  let actualBytes = 0; const actual = [];
  function walk(relative) {
    assert.ok(performance.now() - started <= 90000, 'Bounded complete current inventory');
    const entries = readdirSync(ROOT + relative, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const path = relative + entry.name, stat = lstatSync(ROOT + path);
      if (stat.isDirectory() && (exclusions.includes(entry.name) || entry.name.includes('before-dist') || entry.name.startsWith('dist-before-'))) continue;
      if (entry.name === 'node_modules' && stat.isSymbolicLink()) continue;
      if (entry.name === '.DS_Store' || entry.name.endsWith('.zip')) continue;
      assert.equal(stat.isSymbolicLink(), false, 'No source symlinks: ' + path);
      if (stat.isDirectory()) { walk(path + '/'); continue; }
      assert.ok(stat.isFile(), 'Only regular source files: ' + path);
      actual.push(path); actualBytes += stat.size;
      assert.ok(actual.length <= 2000 && actualBytes <= 2147483648, 'Bounded complete current file/byte inventory');
    }
  }
  walk('');
  assert.deepEqual(actual.sort(), permitted.sort(), 'No undeclared source additions or deletions');
  assert.equal(migrated.has('scripts/test-support/battleDisplayComponentHarness.mjs'), false, 'The component harness stays byte exact');
  return ledger;
}
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
let checked;
export function civilWarV44MigrationLedger() {
  const ledger = readLedger();
  if (!checked) checked = freeze(validateCivilWarV44MigrationLedger(ledger));
  return checked;
}
export function v44BeforeFile(path) {
  canonicalPath(path);
  const row = expected.migrations.find(record => record.path === path);
  assert.ok(row, 'Only actual declared migrations have a historical reader');
  readLedger();
  const bytes = directRead(row.archive); assert.equal(sha(bytes), row.beforeSHA256); return bytes;
}
function sameRoot(path, requestedPath) {
  canonicalPath(path);
  if (requestedPath !== undefined) {
    const resolved = requestedPath instanceof URL ? fileURLToPath(requestedPath) : requestedPath;
    assert.equal(resolved, ROOT + path, 'Historical/current reader cannot cross source roots');
  }
}
export function v44CurrentFile(path, requestedPath = undefined) {
  sameRoot(path, requestedPath); return directRead(path);
}
export function v44HistoricalSource(path, requestedPath = undefined) {
  sameRoot(path, requestedPath);
  const current = directRead(path), row = expected.migrations.find(record => record.path === path);
  if (!row) return current;
  civilWarV44MigrationLedger();
  assert.equal(sha(current), row.currentSHA256, 'Migrated current source stays explicitly pinned');
  return v44BeforeFile(path);
}
export const CIVIL_WAR_V44_MIGRATION_PATHS = Object.freeze(expected.migrations.map(row => row.path));
