import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAMPAIGN_SAVE_VERSION, CAMPAIGN_STORAGE_KEY, createFreshCampaignState, createCampaignSnapshot, getCampaignSnapshotCompatibility, restoreCampaignFromSnapshot, saveCampaignSnapshot } from '../src/game/campaignStorage.js';
import { commitRecoveryAllocation, selectRecoveryAllocation } from '../src/game/campaignSupply.js';
import { delegateBattle, BATTLE_SCENARIOS } from '../src/game/battles.js';
const scenes = [
  { id: 'first', title: 'First scene', turn: 1, choices: [{ id: 'continue', text: 'Continue', consequence: 'Continued.' }] },
  { id: 'branch', title: 'An authored branch', turn: 2, choices: [{ id: 'continue', text: 'Continue', consequence: 'Continued.' }] },
];
const snapshotFor = (scene = scenes[0]) => createCampaignSnapshot(createFreshCampaignState(1861, scene.id), scene);
const storeFor = raw => {
  const data = new Map(raw === undefined ? [] : [[CAMPAIGN_STORAGE_KEY, raw]]);
  const store = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  return { data, store };
};

test('new battle rules are explicit and independent, while archives1–5 retain the original tactical rules', () => {
  assert.equal(CAMPAIGN_SAVE_VERSION, 22);
  assert.equal(createFreshCampaignState().battleRulesVersion, 18);
  assert.equal(createFreshCampaignState(1, null, { rulesVersion: 1 }).battleRulesVersion, 1);
  assert.equal(createFreshCampaignState(1, null, { rulesVersion: 2, battleRulesVersion: 1 }).battleRulesVersion, 1);
  assert.equal(createFreshCampaignState(1, null, { rulesVersion: 1, battleRulesVersion: 2 }).battleRulesVersion, 2);
  assert.throws(() => createFreshCampaignState(1, null, { battleRulesVersion: 19 }));
  for (const version of [1, 2, 3, 4, 5]) {
    const legacy = snapshotFor(); legacy.version = version; delete legacy.state.battleRulesVersion;
    if (version < 5) legacy.state.rulesVersion = 1;
    const before = structuredClone(legacy);
    const restored = restoreCampaignFromSnapshot(legacy, scenes);
    assert.ok(restored, `v${version}`);
    assert.equal(restored.state.battleRulesVersion, 1);
    assert.equal(restored.state.rulesVersion, version < 5 ? 1 : 2, 'campaign economy cannot silently change');
    assert.deepEqual(restored.state.history, legacy.state.history);
    assert.deepEqual(restored.state.metrics, legacy.state.metrics);
    assert.deepEqual(legacy, before);
    assert.equal(createCampaignSnapshot(restored.state, restored.activeScenario).version, 22);
    legacy.state.battleRulesVersion = 2;
    assert.equal(getCampaignSnapshotCompatibility(legacy).ok, false, 'an old envelope cannot opt into unknown tactical behavior');
  }
});

test('future, missing and malformed current tactical versions reject without writing', () => {
  for (const battleRulesVersion of [undefined, 0, 19, '2', null, {}, -1]) {
    const snapshot = snapshotFor(); snapshot.state.battleRulesVersion = battleRulesVersion;
    const { store, data } = storeFor('original raw');
    assert.equal(getCampaignSnapshotCompatibility(snapshot).ok, false);
    assert.equal(restoreCampaignFromSnapshot(snapshot, scenes), null);
    assert.equal(saveCampaignSnapshot(snapshot, store).ok, false);
    assert.equal(data.get(CAMPAIGN_STORAGE_KEY), 'original raw');
  }
});

test('resolved battle provenance accepts legacy absence or known versions and rejects malformed versions in both ledgers', () => {
  const result = delegateBattle(createFreshCampaignState(1861, 'manassas_battlefield'), BATTLE_SCENARIOS.manassas_battlefield, 'option_b');
  for (const battleRulesVersion of [undefined, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, '2', null]) {
    for (const place of ['history', 'battleCampaign']) {
      const snapshot = snapshotFor();
      const savedResult = { ...result, battleRulesVersion };
      if (place === 'history') snapshot.state.history.push({ scenarioId: 'manassas_battlefield', choiceId: 'option_b', battleResult: savedResult });
      else snapshot.state.battleCampaign.results.manassas_battlefield = savedResult;
      const expected = battleRulesVersion === undefined || battleRulesVersion === 1 || battleRulesVersion === 2 || battleRulesVersion === 3 || battleRulesVersion === 4 || battleRulesVersion === 5 || battleRulesVersion === 6 || battleRulesVersion === 7 || battleRulesVersion === 8 || battleRulesVersion === 9 || battleRulesVersion === 10 || battleRulesVersion === 11 || battleRulesVersion === 12 || battleRulesVersion === 13 || battleRulesVersion === 14 || battleRulesVersion === 15 || battleRulesVersion === 16 || battleRulesVersion === 17 || battleRulesVersion === 18;
      assert.equal(getCampaignSnapshotCompatibility(snapshot).ok, expected, `${place}: ${String(battleRulesVersion)}`);
      assert.equal(Boolean(restoreCampaignFromSnapshot(snapshot, scenes)), expected);
    }
  }
});

test('envelope22 round-trips tactical rules18 while envelope17 remains capped at13', () => {
  const current = snapshotFor();
  assert.equal(current.version, 22);
  assert.equal(current.state.battleRulesVersion, 18);
  const copy = structuredClone(current);
  assert.deepEqual(restoreCampaignFromSnapshot(current, scenes).state, { ...current.state, pendingDebrief: null });
  assert.deepEqual(current, copy, 'round trip cannot mutate the portable archive');
  const old = structuredClone(current); old.version = 17;
  assert.equal(getCampaignSnapshotCompatibility(old).ok, false);
  assert.equal(restoreCampaignFromSnapshot(old, scenes), null);
  old.state.battleRulesVersion = 13;
  assert.equal(getCampaignSnapshotCompatibility(old).ok, true);
  const restored = restoreCampaignFromSnapshot(old, scenes);
  assert.equal(restored.state.battleRulesVersion, 13);
  const resaved = createCampaignSnapshot(restored.state, restored.activeScenario);
  assert.equal(resaved.version, 22);
  assert.equal(resaved.state.battleRulesVersion, 13, 'resaving an older campaign must not upgrade combat rules');
});

test('envelope17 rejects future tactical result provenance in either ledger without replacing the autosave', () => {
  const result = delegateBattle(createFreshCampaignState(1861, 'manassas_battlefield'), BATTLE_SCENARIOS.manassas_battlefield, 'option_b');
  for (const place of ['history', 'battleCampaign']) {
    const snapshot = snapshotFor(); snapshot.state.battleRulesVersion = 13;
    const savedResult = { ...result, battleRulesVersion: 14 };
    if (place === 'history') snapshot.state.history.push({ scenarioId: 'manassas_battlefield', choiceId: 'option_b', battleResult: savedResult });
    else snapshot.state.battleCampaign.results.manassas_battlefield = savedResult;
    assert.equal(getCampaignSnapshotCompatibility(snapshot).ok, true, 'envelope18 retains recorded current battle provenance in older campaigns');
    const restored = restoreCampaignFromSnapshot(snapshot, scenes);
    assert.equal(place === 'history' ? restored.state.history[0].battleResult.battleRulesVersion : restored.state.battleCampaign.results.manassas_battlefield.battleRulesVersion, 14);
    snapshot.version = 17;
    const { store, data } = storeFor('preserved original');
    assert.equal(getCampaignSnapshotCompatibility(snapshot).ok, false);
    assert.equal(restoreCampaignFromSnapshot(snapshot, scenes), null);
    assert.equal(saveCampaignSnapshot(snapshot, store).ok, false);
    assert.equal(data.get(CAMPAIGN_STORAGE_KEY), 'preserved original');
    savedResult.battleRulesVersion = 13;
    assert.equal(getCampaignSnapshotCompatibility(snapshot).ok, true);
  }
});

test('conflicting explicit scene identities are rejected rather than teleporting active progress', () => {
  const conflict = snapshotFor(); conflict.activeScenarioId = scenes[1].id;
  assert.equal(getCampaignSnapshotCompatibility(conflict).ok, false);
  assert.equal(restoreCampaignFromSnapshot(conflict, scenes), null);
  const stateConflict = snapshotFor(); stateConflict.state.scenarioId = scenes[1].id;
  assert.equal(getCampaignSnapshotCompatibility(stateConflict).ok, false);
  const { store, data } = storeFor('original');
  assert.equal(saveCampaignSnapshot(conflict, store).ok, false);
  assert.equal(data.get(CAMPAIGN_STORAGE_KEY), 'original');
});

test('an unresolved named branch never silently falls back to a different same-turn or initial scene', () => {
  const missing = createCampaignSnapshot({ ...createFreshCampaignState(1861, 'missing-branch'), currentTurn: 2 }, null);
  assert.equal(restoreCampaignFromSnapshot(missing, scenes), null);
  const custom = { id: 'custom-branch', title: 'Portable custom scene', turn: 2, choices: [{ id: 'continue', text: 'Continue' }] };
  const embedded = createCampaignSnapshot({ ...createFreshCampaignState(1861, custom.id), currentTurn: 2 }, custom);
  assert.equal(restoreCampaignFromSnapshot(embedded, scenes).activeScenario.id, custom.id);
  const authored = snapshotFor(scenes[1]);
  assert.equal(restoreCampaignFromSnapshot(authored, scenes).activeScenario.id, scenes[1].id);
  // Very old snapshots without any ID keep their documented chronological fallback.
  const noId = createCampaignSnapshot({ ...createFreshCampaignState(1, null, { rulesVersion: 1 }), currentTurn: 2 }, null);
  noId.version = 1;
  assert.equal(restoreCampaignFromSnapshot(noId, scenes).activeScenario.id, scenes[1].id);
});

test('v5 migration keeps paid recovery, debt and exact old raw before overwriting the autosave', () => {
  let state = createFreshCampaignState(1861, scenes[0].id, { battleRulesVersion: 1 });
  state = { ...state, metrics: { ...state.metrics, treasury: 0 }, campaignEconomy: { treasuryArrears: 25, munitionsArrears: 7, emergencyUsed: 2 } };
  state = commitRecoveryAllocation(selectRecoveryAllocation(state, 'levy'));
  const old = createCampaignSnapshot(state, scenes[0]); old.version = 5; delete old.state.battleRulesVersion;
  const raw = JSON.stringify(old, null, 2);
  const { store, data } = storeFor(raw);
  const restored = restoreCampaignFromSnapshot(old, scenes);
  assert.equal(commitRecoveryAllocation(restored.state), restored.state);
  assert.deepEqual(restored.state.campaignEconomy, state.campaignEconomy);
  assert.deepEqual(restored.state.metrics, state.metrics);
  const current = createCampaignSnapshot(restored.state, restored.activeScenario);
  assert.equal(saveCampaignSnapshot(current, store).ok, true);
  const backups = [...data].filter(([key]) => key.includes(':recovery:'));
  assert.equal(backups.length, 1); assert.equal(backups[0][1], raw);
  assert.equal(JSON.parse(data.get(CAMPAIGN_STORAGE_KEY)).version, 22);
  assert.equal(saveCampaignSnapshot(current, store).ok, true);
  assert.equal([...data].filter(([key]) => key.includes(':recovery:')).length, 1);
});

test('failed pre-migration recovery prevents overwriting the original and does not mutate playable state', () => {
  const old = snapshotFor(); old.version = 5; delete old.state.battleRulesVersion;
  const raw = JSON.stringify(old);
  const { store, data } = storeFor(raw);
  const write = store.setItem;
  store.setItem = (key, value) => { if (key.includes(':recovery:')) throw new Error('Recovery quota full'); write(key, value); };
  const restored = restoreCampaignFromSnapshot(old, scenes);
  const before = structuredClone(restored.state);
  const result = saveCampaignSnapshot(createCampaignSnapshot(restored.state, restored.activeScenario), store);
  assert.equal(result.ok, false); assert.match(result.error, /pre-migration/);
  assert.equal(data.get(CAMPAIGN_STORAGE_KEY), raw);
  assert.deepEqual(restored.state, before);
});
