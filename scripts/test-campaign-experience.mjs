import assert from 'node:assert/strict';
import { createAfterAction, isAfterActionReport, nextPhasePreview, RESOURCE_LABELS } from '../src/game/campaignExperience.js';
import { CAMPAIGN_STORAGE_KEY, DEMO_STORAGE_KEY, createFreshCampaignState, createCampaignSnapshot, restoreCampaignFromSnapshot, saveCampaignSnapshot, saveCampaignCheckpoint, loadCampaignCheckpoints, loadCampaignSnapshotResult } from '../src/game/campaignStorage.js';
import { advanceCampaignTurn, buildHistoryEntry } from '../src/game/headlessCampaign.js';
import { deriveSeed, mulberry32, tickMetrics } from '../src/game/simulationEngine.js';
import { applyBattleResolution } from '../src/game/battles.js';

const data = new Map();
const storage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
const scene = { id: 'fixture', title: 'Test scenario', turn: 1, choices: [{ id: 'fixture-choice', text: 'Test choice', consequence: 'Test consequence' }] };
const before = createFreshCampaignState(1861, scene.id);
const after = { ...before, metrics: { ...before.metrics, foodSupply: before.metrics.foodSupply - 7 }, divergenceIndex: 0.1 };
const entry = { scenarioId: scene.id, choiceId: 'fixture-choice', scenarioTitle: scene.title, choiceText: 'Test choice', consequence: 'Test consequence' };
const report = createAfterAction(before, after, entry, { title: 'Next fixture' });
assert.equal(report.deltas.find((item) => item.key === 'foodSupply').change, -7);
assert.equal(report.divergenceChange, 10);
assert.equal(report.nextTitle, 'Next fixture');
const snap = createCampaignSnapshot({ ...after, pendingDebrief: report }, scene);
assert.equal(saveCampaignSnapshot(snap, storage).ok, true);
const mainBefore = data.get(CAMPAIGN_STORAGE_KEY);
assert.equal(saveCampaignSnapshot(createCampaignSnapshot(before, scene), storage, DEMO_STORAGE_KEY).ok, true);
assert.equal(data.get(CAMPAIGN_STORAGE_KEY), mainBefore, 'demo must not change normal autosave');
const restored = restoreCampaignFromSnapshot(loadCampaignSnapshotResult(storage).snapshot, [scene]);
assert.deepEqual(restored.state.pendingDebrief, report);
assert.equal(restored.state.metrics.foodSupply, after.metrics.foodSupply, 'restoring debrief must not apply effects again');
const brokenDebrief = createCampaignSnapshot({ ...after, pendingDebrief: { deltas: null } }, scene);
assert.equal(restoreCampaignFromSnapshot(brokenDebrief, [scene]).state.pendingDebrief, null, 'malformed optional debrief dropped safely');
const brokenMetrics = structuredClone(snap);
brokenMetrics.state.metrics.militaryStrength = null;
assert.equal(restoreCampaignFromSnapshot(brokenMetrics, [scene]), null, 'supported-version invalid state must not be restored');
assert.equal(saveCampaignCheckpoint(snap, storage).ok, true);
saveCampaignCheckpoint(snap, storage);
assert.equal(loadCampaignCheckpoints(storage).length, 1, 'duplicate checkpoint replaced');
for (let index = 0; index < 12; index += 1) {
  assert.equal(saveCampaignCheckpoint(createCampaignSnapshot({ ...before, history: Array.from({ length: index }, () => entry) }, scene), storage).ok, true);
}
assert.equal(loadCampaignCheckpoints(storage).length, 8);
assert.match(loadCampaignCheckpoints(storage)[0].label, /Test scenario/);
assert.equal(saveCampaignSnapshot(snap, { setItem() { throw new Error('Quota full'); } }).ok, false);
assert.equal(saveCampaignCheckpoint(snap, { getItem: () => null, setItem() { throw new Error('Quota full'); } }).ok, false, 'checkpoint reports quota failure');
assert.deepEqual(loadCampaignCheckpoints({ getItem: () => '{bad-json' }), []);
assert.equal(nextPhasePreview(scene, { endsCampaign: true }, []), 'Campaign settlement');
assert.equal(nextPhasePreview(scene, { next: 'fixture' }, [scene]), scene.title);

const approx = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-10, `${message}: ${actual} != ${expected}`);
function reconcile(value) {
  assert.ok(isAfterActionReport(value));
  for (const item of value.deltas) {
    approx(item.exactChange, item.after - item.before, `${item.key} observed total`);
    approx(Object.values(item.breakdown).reduce((sum, component) => sum + component, 0), item.exactChange, `${item.key} components reconcile`);
    assert.equal(item.change, Math.round(item.exactChange * 10) / 10, 'legacy rounded change remains compatible');
  }
}
const resourceState = (metrics = {}) => ({
  ...createFreshCampaignState(1861, 'fixture', { rulesVersion: 1 }),
  metrics: { militaryStrength: 50, munitions: 50, treasury: 50, foodSupply: 50, publicMorale: 50, ...metrics },
});
function advanceAndReport(state, choice, scenarioOptions = {}, original = state, explicitBase = null) {
  const scenario = { ...scene, roleLabel: 'Army Commander', ...scenarioOptions, choices: [{ text: 'Test choice', consequence: 'Test outcome', ...choice }] };
  const result = advanceCampaignTurn(state, scenario, scenario.choices[0], [scenario]);
  const report = createAfterAction(original, result.state, result.historyEntry, result.nextScenario, explicitBase);
  reconcile(report);
  assert.ok(report.breakdownExact);
  return { ...result, report };
}
const row = (value, key) => value.deltas.find((item) => item.key === key);

// Upkeep clamps each deduction before the choice; requested effects are not
// necessarily the amounts applied, and floors happen after those effects.
const depleted = resourceState({ militaryStrength: 3, munitions: 2, treasury: 1, foodSupply: 1, publicMorale: 2 });
depleted.divergenceIndex = 0.7;
for (const shard of Object.values(depleted.shards)) shard.alignment = 20;
const depletedBefore = structuredClone(depleted);
const clamped = advanceAndReport(depleted, {
  id: 'recover', effects: { metrics: { militaryStrength: 150, munitions: 7, treasury: 300, foodSupply: -10, publicMorale: 15 } },
  survivalFloor: { foodSupply: 8 },
});
assert.deepEqual(depleted, depletedBefore, 'instrumentation/reporting must not mutate input state');
assert.deepEqual(clamped.historyEntry.resourceTransitions.afterUpkeep,
  { militaryStrength: 0, munitions: 0, treasury: 0, foodSupply: 0, publicMorale: 0 });
assert.deepEqual(clamped.state.metrics, { militaryStrength: 100, munitions: 7, treasury: 100, foodSupply: 8, publicMorale: 15 });
assert.deepEqual(row(clamped.report, 'militaryStrength').breakdown, { battle: 0, upkeep: -3, decision: 100, other: 0 });
assert.deepEqual(row(clamped.report, 'foodSupply').breakdown, { battle: 0, upkeep: -1, decision: 8, other: 0 });
assert.equal(clamped.historyEntry.metricEffects.militaryStrength, 150, 'authored scoring effects remain unchanged');
assert.notEqual(clamped.historyEntry.resourceTransitions, clamped.ticked.resourceTransitions);
assert.notEqual(clamped.historyEntry.resourceTransitions.before, clamped.ticked.resourceTransitions.before);
assert.notEqual(clamped.ticked.resourceTransitions.afterDecision, clamped.ticked.metrics);

const floorResult = advanceAndReport(resourceState({ militaryStrength: 20, foodSupply: 15 }), {
  id: 'stabilize', effects: { metrics: { militaryStrength: -90, publicMorale: -90, foodSupply: -50 } },
  survivalFloor: { militaryStrength: 12, publicMorale: 14, foodSupply: 8 },
});
assert.equal(floorResult.historyEntry.resourceTransitions.afterUpkeep.militaryStrength, 14);
assert.equal(floorResult.historyEntry.resourceTransitions.afterDecisionEffects.militaryStrength, 0);
assert.equal(floorResult.historyEntry.resourceTransitions.afterDecision.militaryStrength, 12);
assert.deepEqual(row(floorResult.report, 'militaryStrength').breakdown, { battle: 0, upkeep: -6, decision: -2, other: 0 });

const stressed = resourceState({ militaryStrength: 50, munitions: 50, treasury: 50, foodSupply: 20, publicMorale: 35 });
stressed.divergenceIndex = 0.7;
for (const shard of Object.values(stressed.shards)) shard.alignment = 20;
const stressResult = advanceAndReport(stressed, { id: 'wait', effects: { metrics: {} } });
for (const [key, upkeep] of Object.entries({ militaryStrength: -18, munitions: -9, treasury: -12, foodSupply: -2, publicMorale: -7 })) {
  assert.deepEqual(row(stressResult.report, key).breakdown, { battle: 0, upkeep, decision: 0, other: 0 });
}
for (const scenarioOptions of [{ interlude: true }, { crisisFor: 'fox' }]) {
  const result = advanceAndReport(stressed, { id: 'talk', effects: { metrics: { foodSupply: 10 } } }, scenarioOptions);
  assert.equal(result.state.currentTurn, stressed.currentTurn);
  for (const item of result.report.deltas) assert.equal(item.breakdown.upkeep, 0, 'interludes and crises skip all upkeep');
}
const idleTick = tickMetrics(stressed);
assert.deepEqual(idleTick.resourceTransitions.afterUpkeep, idleTick.resourceTransitions.afterDecision);

const preBattle = resourceState({ militaryStrength: 99, munitions: 1, publicMorale: 98, foodSupply: 24 });
const postBattle = applyBattleResolution(preBattle, { scenarioId: 'fixture', battleId: 'fixture', result: 'decisive-win', score: 90 });
const battleChoice = { id: 'exploit', effects: { metrics: { militaryStrength: 20, munitions: 6, treasury: 3, foodSupply: 5, publicMorale: 20 } } };
const battleRun = advanceAndReport(postBattle, battleChoice, {}, preBattle, postBattle);
assert.deepEqual(row(battleRun.report, 'militaryStrength').breakdown, { battle: 1, upkeep: -6, decision: 6, other: 0 });
assert.deepEqual(row(battleRun.report, 'munitions').breakdown, { battle: -1, upkeep: 0, decision: 6, other: 0 });
assert.deepEqual(row(battleRun.report, 'publicMorale').breakdown, { battle: 2, upkeep: -4, decision: 4, other: 0 });
assert.deepEqual(createAfterAction(preBattle, battleRun.state, battleRun.historyEntry, battleRun.nextScenario), battleRun.report,
  'four-argument calls infer the post-battle base from the tick snapshot');
const alreadyApplied = createAfterAction(postBattle, battleRun.state, battleRun.historyEntry, battleRun.nextScenario);
reconcile(alreadyApplied);
assert.ok(alreadyApplied.deltas.every((item) => item.breakdown.battle === 0), 'already-applied battle effects are not counted twice');
for (const outcome of ['decisive-win', 'costly-win', 'disciplined-withdrawal', 'defeat', 'rout']) {
  const battleState = applyBattleResolution(preBattle, { scenarioId: 'fixture', battleId: 'fixture', result: outcome });
  const result = advanceAndReport(battleState, battleChoice, {}, preBattle);
  for (const item of result.report.deltas) assert.equal(item.breakdown.battle, battleState.metrics[item.key] - preBattle.metrics[item.key]);
}

const randomChoice = {
  id: 'random', text: 'Random test', consequence: 'Default consequence', successRate: 0.47,
  successEffects: { metrics: { militaryStrength: 70, munitions: 60, treasury: -150, foodSupply: 80, publicMorale: 20 } },
  failureEffects: { metrics: { militaryStrength: -100, munitions: -80, treasury: 60, foodSupply: -70, publicMorale: -30 } },
  successConsequence: 'Succeeded', failureConsequence: 'Failed', survivalFloor: { militaryStrength: 12, foodSupply: 8 },
};
const observedOutcomes = new Set();
for (let seed = 0; seed < 40; seed += 1) {
  const state = { ...resourceState({ militaryStrength: 48.25, treasury: 97.75, foodSupply: 28.5 }), seed, divergenceIndex: 0.7 };
  for (const successModifier of [-1, 0, 1]) {
    const scenario = { ...scene, choices: [randomChoice] };
    const result = advanceCampaignTurn(state, scenario, randomChoice, [scenario], successModifier);
    const succeeded = mulberry32(deriveSeed(seed, state.currentTurn))() < Math.min(1, randomChoice.successRate + successModifier);
    observedOutcomes.add(succeeded);
    assert.equal(result.historyEntry.choiceSucceeded, succeeded);
    assert.equal(result.historyEntry.consequence, succeeded ? 'Succeeded' : 'Failed');
    const expectedEffects = succeeded ? randomChoice.successEffects.metrics : randomChoice.failureEffects.metrics;
    const report = createAfterAction(state, result.state, result.historyEntry, result.nextScenario);
    reconcile(report);
    const trace = result.historyEntry.resourceTransitions;
    for (const key of Object.keys(RESOURCE_LABELS)) {
      const postEffect = Math.max(0, Math.min(100, trace.afterUpkeep[key] + expectedEffects[key]));
      const postFloor = Math.max(postEffect, randomChoice.survivalFloor[key] || 0);
      assert.equal(trace.afterDecisionEffects[key], postEffect);
      assert.equal(result.state.metrics[key], postFloor);
      approx(row(report, key).breakdown.decision, postFloor - trace.afterUpkeep[key], `${key} resolved random outcome`);
    }
  }
}
assert.equal(observedOutcomes.size, 2);
const failedDefault = advanceAndReport(resourceState(), { id: 'fallback', successRate: 0 });
assert.equal(row(failedDefault.report, 'militaryStrength').breakdown.decision, -20);
assert.equal(row(failedDefault.report, 'publicMorale').breakdown.decision, -15);

const fractional = advanceAndReport(resourceState({ treasury: 50.12 }), { id: 'fraction', effects: { metrics: { treasury: 0.26 } } });
approx(row(fractional.report, 'treasury').exactChange, -4.74, 'unrounded total');
assert.equal(row(fractional.report, 'treasury').change, -4.7);
const extraState = { ...fractional.state, metrics: { ...fractional.state.metrics, treasury: fractional.state.metrics.treasury + 2 } };
const extraReport = createAfterAction(resourceState({ treasury: 50.12 }), extraState, fractional.historyEntry, null);
reconcile(extraReport);
approx(row(extraReport, 'treasury').breakdown.other, 2, 'out-of-tick changes remain separate');
const originalNonbattle = resourceState();
const nonbattleBase = { ...originalNonbattle, metrics: { ...originalNonbattle.metrics, treasury: 53 } };
const nonbattleResult = advanceAndReport(nonbattleBase, { id: 'supply', effects: { metrics: { treasury: 2 } } }, {}, originalNonbattle);
assert.deepEqual(row(nonbattleResult.report, 'treasury').breakdown, { battle: 0, upkeep: -5, decision: 2, other: 3 },
  'a nonbattle change before tick entry is other, never inferred field command');
assert.deepEqual(createAfterAction(originalNonbattle, nonbattleResult.state, nonbattleResult.historyEntry, null, nonbattleBase), nonbattleResult.report,
  'passing an explicit base does not relabel nonbattle changes');

// Old histories have requested effects, not exact applied transitions.
const oldNonbattle = createAfterAction(before, after, { ...entry, metricEffects: { foodSupply: 999 } }, { title: 'Next fixture' });
reconcile(oldNonbattle);
assert.equal(oldNonbattle.breakdownExact, false);
assert.deepEqual(row(oldNonbattle, 'foodSupply').breakdown, { battle: 0, upkeep: 0, decision: 0, other: -7 },
  'legacy nonbattle histories retain the observed net change as unattributed');
const oldHistory = { ...battleRun.historyEntry, resourceTransitions: undefined, metricEffects: { militaryStrength: 999 } };
for (const base of [null, postBattle]) {
  const legacyReport = createAfterAction(preBattle, battleRun.state, oldHistory, null, base);
  reconcile(legacyReport);
  assert.equal(legacyReport.breakdownExact, false);
  assert.equal(row(legacyReport, 'militaryStrength').breakdown.battle, base ? 1 : 0);
  assert.ok(legacyReport.deltas.every((item) => item.breakdown.upkeep === 0 && item.breakdown.decision === 0));
}
const brokenTrace = createAfterAction(preBattle, battleRun.state, { ...oldHistory, resourceTransitions: { version: 1, before: null } }, null);
reconcile(brokenTrace);
assert.equal(brokenTrace.breakdownExact, false);
const oldReport = structuredClone(report);
delete oldReport.breakdownExact;
for (const item of oldReport.deltas) {
  delete item.exactChange;
  delete item.breakdown;
  delete item.breakdownExact;
}
assert.ok(isAfterActionReport(oldReport), 'legacy report schema stays valid');
const badBreakdown = structuredClone(battleRun.report);
badBreakdown.deltas[0].breakdown.decision = null;
assert.equal(isAfterActionReport(badBreakdown), false, 'invalid optional breakdown cannot reach the overlay');
const savedReport = createCampaignSnapshot({ ...battleRun.state, pendingDebrief: battleRun.report }, scene);
const loadedReport = restoreCampaignFromSnapshot(JSON.parse(JSON.stringify(savedReport)), [scene]);
assert.deepEqual(loadedReport.state.pendingDebrief, battleRun.report);
assert.deepEqual(loadedReport.state.history.at(-1).resourceTransitions, battleRun.historyEntry.resourceTransitions);
assert.deepEqual(buildHistoryEntry(before, scene, { id: 'old' }, { shards: before.shards }).resourceTransitions, null);

console.log('Campaign experience passed: persistence, save protection, exact clamped battle/decision/upkeep breakdowns, floors, 120 random resolutions, and total reconciliation.');
