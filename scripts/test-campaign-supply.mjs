import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { createServer } from 'vite';
import { INITIAL_STATE } from '../src/game/initialState.js';
import { tickMetrics, forecastCampaignChoice, getChoiceAvailability } from '../src/game/simulationEngine.js';
import { advanceCampaignTurn } from '../src/game/headlessCampaign.js';
import { createFreshCampaignState, createCampaignSnapshot, getCampaignSnapshotCompatibility, restoreCampaignFromSnapshot } from '../src/game/campaignStorage.js';
import { getBattleSupplyProfile, getRecoveryOptions, selectRecoveryAllocation, commitRecoveryAllocation, applySupplyDeltas, getCampaignChoice } from '../src/game/campaignSupply.js';
import { getBattleAssessment } from '../src/battle/battleAssessment.js';

const scene = { id: 'supply-fixture', turn: 1, title: 'Supply fixture', choices: [{ id: 'continue', text: 'Continue the campaign', effects: { metrics: {}, shards: {} }, consequence: 'Continued.' }] };
const fresh = (metrics = {}, difficulty = 'standard') => ({ ...createFreshCampaignState(1861, scene.id, { difficulty }), metrics: { ...INITIAL_STATE.metrics, ...metrics } });
const snapshot = state => createCampaignSnapshot(state, scene);

// Frozen baseline inputs cover upkeep, shortage thresholds, cabinet resistance,
// deterministic successes/failures, clamping, terminal turns and survival floors.
function legacyVectors() {
  return Array.from({ length: 240 }, (_, i) => {
    const state = { ...structuredClone(INITIAL_STATE), seed: i * 7919, currentTurn: i % 28 + 1,
      metrics: { militaryStrength: i * 7 % 101, munitions: i * 11 % 101, treasury: i * 13 % 101, foodSupply: i * 17 % 101, publicMorale: i * 19 % 101 },
      shards: { hotspur: { name: 'A', alignment: i * 3 % 101, influence: 35 }, fox: { name: 'B', alignment: i * 5 % 101, influence: 40 }, wolf: { name: 'C', alignment: i * 7 % 101, influence: 25 } }, divergenceIndex: i % 101 / 100 };
    const choice = i % 6 === 0 ? null : { id: 'fixture', consequence: 'Certain consequence', successRate: i % 3 === 0 ? undefined : 0.45,
      effects: { metrics: { treasury: -12, munitions: -18, militaryStrength: 7, publicMorale: 9, divergenceIndex: 0.06 }, shards: { fox: 12, wolf: -7 } },
      successEffects: { metrics: { treasury: -8, munitions: -16, militaryStrength: 12, publicMorale: 18 }, shards: { hotspur: 15 } },
      failureEffects: { metrics: { treasury: -5, militaryStrength: -14, publicMorale: -9 }, shards: { fox: -11 } },
      successConsequence: 'Succeeded.', failureConsequence: 'Failed.', survivalFloor: i % 7 === 0 ? { militaryStrength: 20, foodSupply: 12 } : undefined };
    return { state, choice, bonus: i % 4 / 20, options: { skipTurnDecay: i % 9 === 0, endsCampaign: i % 23 === 0, activeScenarioId: 'fixture' } };
  });
}

test('legacy rules retain the frozen installed engine results, including missing-version states', () => {
  const digest = versioned => createHash('sha256').update(JSON.stringify(legacyVectors().map(({ state, choice, bonus, options }) => {
    if (!versioned) delete state.rulesVersion;
    return tickMetrics(state, choice, bonus, options);
  }))).digest('hex');
  // Recorded from the installed first-pass engine before this economy change.
  const expected = '3915b240d0e1c27d530f53c52d5bbcf6a80a4d73a206603b2fa9a91631859fe1';
  assert.equal(digest(true), expected);
  assert.equal(digest(false), expected);
});

test('fresh games explicitly select new rules and Story; old envelopes always retain legacy rules', () => {
  assert.equal(fresh().rulesVersion, 2);
  assert.equal(fresh().difficulty, 'standard');
  assert.equal(fresh({}, 'story').difficulty, 'story');
  assert.throws(() => createFreshCampaignState(1, scene.id, { difficulty: 'impossible' }));
  const original = snapshot(fresh());
  assert.equal(original.version, 22);
  for (const version of [1, 2, 3, 4]) {
    const old = structuredClone(original); old.version = version;
    delete old.state.battleRulesVersion; delete old.state.rulesVersion; delete old.state.difficulty; delete old.state.campaignEconomy; delete old.state.supplyPlan;
    if (version < 4) delete old.state.correspondence;
    const restored = restoreCampaignFromSnapshot(old, [scene]);
    assert.ok(restored); assert.equal(restored.state.rulesVersion, 1);
    assert.equal(restored.state.difficulty, 'standard');
    assert.equal(restored.migratedFromVersion, version);
    assert.equal(tickMetrics(restored.state).metrics.munitions, 75, 'legacy upkeep remains five');
    old.state.rulesVersion = 2;
    assert.equal(getCampaignSnapshotCompatibility(old).ok, false, 'a legacy envelope cannot silently introduce different economics');
  }
});

test('zero resources defer actual costs and reduce benefits rather than making offensives free', () => {
  const choice = { id: 'offensive', effects: { metrics: { treasury: -20, munitions: -20, militaryStrength: 10, publicMorale: 20 }, shards: { hotspur: 20 } }, consequence: 'Attack.' };
  const empty = tickMetrics(fresh({ treasury: 0, munitions: 0, militaryStrength: 60, publicMorale: 60 }), choice);
  const funded = tickMetrics(fresh({ treasury: 100, munitions: 100, militaryStrength: 60, publicMorale: 60 }), choice);
  assert.equal(empty.campaignEconomy.treasuryArrears, 23);
  assert.equal(empty.campaignEconomy.munitionsArrears, 23);
  assert.equal(empty.supplyReport.benefitRatio, 0.4);
  assert.ok(funded.metrics.militaryStrength > empty.metrics.militaryStrength);
  assert.ok(funded.metrics.publicMorale > empty.metrics.publicMorale);
  assert.equal(empty.gameOver, false, 'arrears alone never force defeat');
  const repaid = applySupplyDeltas(empty.metrics, empty.campaignEconomy, { treasury: 30, munitions: 30 });
  assert.equal(repaid.metrics.treasury, 7); assert.equal(repaid.metrics.munitions, 7);
  assert.equal(repaid.economy.treasuryArrears, 0); assert.equal(repaid.economy.munitionsArrears, 0);
  assert.equal(funded.campaignEconomy.treasuryArrears, 0);
});

test('planning and toggling allocations grants nothing; a purchase is paid exactly once across restore', () => {
  const original = fresh({ treasury: 12, munitions: 0, foodSupply: 30, militaryStrength: 40 });
  let plan = original;
  for (let i = 0; i < 20; i++) plan = selectRecoveryAllocation(plan, ['purchase', 'emergency', 'none'][i % 3]);
  assert.deepEqual(plan.metrics, original.metrics); assert.deepEqual(plan.campaignEconomy, original.campaignEconomy);
  plan = selectRecoveryAllocation(plan, 'purchase');
  const committed = commitRecoveryAllocation(plan);
  assert.equal(committed.metrics.treasury, 0); assert.equal(committed.metrics.munitions, 18);
  assert.equal(committed.metrics.foodSupply, 42); assert.equal(committed.metrics.militaryStrength, 44);
  assert.equal(commitRecoveryAllocation(committed), committed);
  assert.equal(selectRecoveryAllocation(committed, 'emergency'), committed);
  const restored = restoreCampaignFromSnapshot(snapshot(committed), [scene]).state;
  assert.deepEqual(commitRecoveryAllocation(restored), restored, 'reload/import/checkpoint preserve the commitment marker');
  const direct = tickMetrics(plan, scene.choices[0]);
  const staged = tickMetrics(committed, scene.choices[0]);
  assert.deepEqual(direct.metrics, staged.metrics, 'battle-staged and direct order commitment charge once');
  assert.deepEqual(direct.campaignEconomy, staged.campaignEconomy);
  assert.deepEqual(original.metrics, fresh({ treasury: 12, munitions: 0, foodSupply: 30, militaryStrength: 40 }).metrics, 'ephemeral cancelled allocation never mutates source');
});

test('emergency reserves have a real morale price, a campaign limit, and persistent decision accounting', () => {
  let state = fresh();
  for (let i = 0; i < 2; i++) {
    state = selectRecoveryAllocation(state, 'emergency');
    const before = state.metrics.publicMorale;
    const committed = commitRecoveryAllocation(state);
    assert.equal(committed.metrics.publicMorale, before - 4);
    assert.equal(committed.campaignEconomy.emergencyUsed, i + 1);
    state = advanceCampaignTurn(committed, scene, scene.choices[0], [scene]).state;
    assert.equal(state.campaignEconomy.emergencyUsed, i + 1);
    assert.ok(getCampaignSnapshotCompatibility(snapshot(state)).ok);
  }
  assert.equal(getRecoveryOptions(state).find(option => option.id === 'emergency').available, false);
  assert.equal(selectRecoveryAllocation(state, 'emergency'), state);
  const unavailable = fresh({ treasury: 0 });
  assert.equal(selectRecoveryAllocation(unavailable, 'purchase'), unavailable);
  assert.equal(getRecoveryOptions(unavailable).find(option => option.id === 'emergency').available, true, 'zero treasury still has a limited recovery option');
});

test('supply levy eligibility uses exact shortage, morale and food thresholds without free stockpiling', () => {
  const eligible = state => getRecoveryOptions(state).find(option => option.id === 'levy').available;
  assert.equal(eligible(fresh({ treasury: 19, publicMorale: 20, foodSupply: 12 })), true);
  assert.equal(eligible(fresh({ treasury: 20, publicMorale: 20, foodSupply: 12 })), false);
  assert.equal(eligible(fresh({ treasury: 0, publicMorale: 19, foodSupply: 12 })), false);
  assert.equal(eligible(fresh({ treasury: 0, publicMorale: 20, foodSupply: 11 })), false);
  const indebted = { ...fresh({ treasury: 20, publicMorale: 20, foodSupply: 12 }), campaignEconomy: { treasuryArrears: 1, munitionsArrears: 0, emergencyUsed: 0 } };
  assert.equal(eligible(indebted), true, 'outstanding debt permits the levy above the stock threshold');
  const paid = commitRecoveryAllocation(selectRecoveryAllocation(fresh({ treasury: 19, publicMorale: 70, foodSupply: 70 }), 'levy'));
  assert.equal(paid.metrics.treasury, 39);
  assert.equal(paid.metrics.publicMorale, 62);
  assert.equal(paid.metrics.foodSupply, 64);
  const next = advanceCampaignTurn(paid, scene, scene.choices[0], [scene]).state;
  assert.equal(eligible(next), false, 'a funded next decision cannot repeatedly stockpile levy income');
  const nearCap = { ...fresh({ treasury: 99 }), campaignEconomy: { treasuryArrears: 1, munitionsArrears: 0, emergencyUsed: 0 } };
  assert.equal(commitRecoveryAllocation(selectRecoveryAllocation(nearCap, 'levy')).metrics.treasury, 100, 'ordinary resource caps still apply');
  assert.equal(eligible({ ...indebted, rulesVersion: 1 }), false);
});

test('levy first pays treasury debt, keeps civilian costs, and commits once across reload and resolution', () => {
  const state = { ...fresh({ treasury: 0, publicMorale: 70, foodSupply: 70 }), campaignEconomy: { treasuryArrears: 25, munitionsArrears: 7, emergencyUsed: 2 } };
  const plan = selectRecoveryAllocation(state, 'levy');
  assert.deepEqual(plan.metrics, state.metrics);
  assert.deepEqual(plan.campaignEconomy, state.campaignEconomy);
  const paid = commitRecoveryAllocation(plan);
  assert.equal(paid.metrics.treasury, 0);
  assert.equal(paid.campaignEconomy.treasuryArrears, 5);
  assert.equal(paid.campaignEconomy.munitionsArrears, 7);
  assert.equal(paid.campaignEconomy.emergencyUsed, 2, 'levy does not consume another depot reserve');
  assert.equal(paid.metrics.publicMorale, 62); assert.equal(paid.metrics.foodSupply, 64);
  assert.equal(commitRecoveryAllocation(paid), paid);
  assert.equal(selectRecoveryAllocation(paid, 'levy'), paid);
  assert.equal(selectRecoveryAllocation(paid, 'none'), paid);
  for (const value of [plan, paid]) {
    const archive = snapshot(value);
    assert.equal(getCampaignSnapshotCompatibility(archive).ok, true);
    const restored = restoreCampaignFromSnapshot(archive, [scene]).state;
    const committed = commitRecoveryAllocation(restored);
    assert.deepEqual(committed.metrics, paid.metrics);
    assert.deepEqual(committed.campaignEconomy, paid.campaignEconomy);
    assert.deepEqual(committed.supplyPlan, paid.supplyPlan);
    assert.equal(commitRecoveryAllocation(committed), committed, 'restored commitment cannot be applied twice');
    if (value === paid) assert.equal(committed, restored, 'already-paid restored state is unchanged');
  }
  const direct = advanceCampaignTurn(plan, scene, scene.choices[0], [scene]);
  const staged = advanceCampaignTurn(paid, scene, scene.choices[0], [scene]);
  assert.deepEqual(direct.state.metrics, staged.state.metrics);
  assert.deepEqual(direct.state.campaignEconomy, staged.state.campaignEconomy);
  assert.equal(direct.historyEntry.supplyReport.allocationId, 'levy');
  assert.equal(getCampaignSnapshotCompatibility(snapshot(direct.state)).ok, true);
});

test('levy forecasts include repayment and civilian costs, including a risky low-food commitment', () => {
  const state = { ...fresh({ treasury: 5, publicMorale: 70, foodSupply: 70 }), campaignEconomy: { treasuryArrears: 12, munitionsArrears: 0, emergencyUsed: 0 } };
  const planned = selectRecoveryAllocation(state, 'levy');
  const forecast = forecastCampaignChoice(planned, scene, scene.choices[0]);
  const actual = advanceCampaignTurn(planned, scene, scene.choices[0], [scene]);
  assert.deepEqual(forecast.outcomes[0].metrics, actual.state.metrics);
  assert.deepEqual(forecast.outcomes[0].campaignEconomy, actual.state.campaignEconomy);
  assert.equal(forecast.resources.treasury.min, 10, '20 raised repays12 debt, then the3 upkeep cost');
  assert.equal(forecast.resources.publicMorale.min, 62);
  assert.equal(forecast.resources.foodSupply.min, 62);
  const borderline = selectRecoveryAllocation(fresh({ treasury: 0, publicMorale: 20, foodSupply: 12 }), 'levy');
  assert.equal(forecastCampaignChoice(borderline, scene, scene.choices[0]).possibleCollapse, true, 'the allowed allocation still discloses danger after unavoidable upkeep');
});

test('new supply affects manual and delegated entry through one profile without changing legacy profiles', () => {
  const empty = getBattleSupplyProfile(fresh({ munitions: 0, foodSupply: 0 }));
  const full = getBattleSupplyProfile(fresh({ munitions: 100, foodSupply: 100 }));
  assert.equal(empty.ammunitionMultiplier, 0.35); assert.equal(full.ammunitionMultiplier, 1);
  assert.equal(empty.readinessPenalty, 16); assert.equal(empty.foodPenalty, 6);
  assert.equal(full.readinessPenalty + full.foodPenalty, 0);
  assert.equal(getBattleSupplyProfile({ ...fresh({ munitions: 0 }), rulesVersion: 1 }).ammunitionMultiplier, 1);
  assert.equal(getBattleSupplyProfile({ metrics: { munitions: 0 } }).readinessPenalty, 0);
  const planned = selectRecoveryAllocation(fresh({ munitions: 0 }), 'purchase');
  assert.equal(getBattleSupplyProfile(planned).ammunitionMultiplier, empty.ammunitionMultiplier, 'profiles never grant an uncommitted plan');
  assert.ok(getBattleSupplyProfile(commitRecoveryAllocation(planned)).ammunitionMultiplier > empty.ammunitionMultiplier);
});

test('Story reduces unavoidable upkeep and weakness attrition; recovery never introduces choice locks', () => {
  const metrics = { militaryStrength: 40, publicMorale: 30, foodSupply: 20, treasury: 20, munitions: 20 };
  const standard = tickMetrics(fresh(metrics), scene.choices[0]);
  const story = tickMetrics(fresh(metrics, 'story'), scene.choices[0]);
  for (const key of Object.keys(metrics)) assert.ok(story.metrics[key] >= standard.metrics[key], key);
  const legacy = tickMetrics({ ...fresh(metrics), rulesVersion: 1 }, scene.choices[0]);
  for (const key of Object.keys(metrics)) assert.ok(standard.metrics[key] >= legacy.metrics[key], `new upkeep does not intensify old unavoidable collapse: ${key}`);
  const poor = fresh({ treasury: 0, munitions: 0 });
  assert.equal(getChoiceAvailability(scene.choices[0], scene, poor).locked, false);
});

test('forecast contains actual outcomes, applies submitted-letter probability, and never exposes the roll', () => {
  const choice = { id: 'risky', successRate: 0.95, effects: { metrics: {} }, successEffects: { metrics: { treasury: -20, publicMorale: 10 } }, failureEffects: { metrics: { militaryStrength: -40, publicMorale: -10 } } };
  const state = selectRecoveryAllocation(fresh({ munitions: 0, treasury: 20 }), 'purchase');
  const forecast = forecastCampaignChoice(state, scene, choice, 0.1);
  assert.equal(forecast.successChance, 1); assert.equal(forecast.outcomes.length, 1);
  assert.equal(forecast.outcomes[0].result, 'success');
  const actual = tickMetrics(state, choice, 0.1, { activeScenarioId: scene.id });
  assert.deepEqual(actual.metrics, forecast.outcomes[0].metrics);
  const risky = forecastCampaignChoice(state, scene, choice);
  assert.equal(risky.outcomes.length, 2);
  assert.deepEqual(risky.resources, forecastCampaignChoice({ ...state, seed: 999 }, scene, choice).resources);
  assert.deepEqual(state.metrics, fresh({ munitions: 0, treasury: 20 }).metrics, 'forecast is pure');
});

test('rules2 Sumter evacuation copy and effect agree while legacy penalty is preserved', () => {
  const scenario = { id: 'fort_sumter' };
  const choice = { id: 'option_b', text: 'Evacuate', costDescription: 'Legacy penalty', consequence: 'Legacy consequence', effects: { metrics: { publicMorale: -25, treasury: 10, militaryStrength: -5 } } };
  const modern = fresh(); const legacy = { ...modern, rulesVersion: 1 };
  assert.equal(getCampaignChoice(modern, scenario, choice).effects.metrics.publicMorale, 8);
  assert.match(getCampaignChoice(modern, scenario, choice).costDescription, /adds 8/);
  assert.equal(getCampaignChoice(legacy, scenario, choice), choice);
  assert.equal(tickMetrics(modern, choice, 0, { activeScenarioId: 'fort_sumter' }).metrics.publicMorale, 88);
  assert.equal(tickMetrics(legacy, choice, 0, { activeScenarioId: 'fort_sumter' }).metrics.publicMorale, 55);
});

test('save validation rejects unknown/future rules, malformed obligations and inconsistent allocation bindings', () => {
  const valid = snapshot(fresh());
  const mutations = [
    value => { value.state.rulesVersion = 3; }, value => { delete value.state.rulesVersion; },
    value => { value.state.difficulty = 'expert'; }, value => { delete value.state.difficulty; },
    value => { value.state.campaignEconomy.treasuryArrears = -1; }, value => { value.state.campaignEconomy.munitionsArrears = '3'; },
    value => { value.state.campaignEconomy.emergencyUsed = 3; }, value => { value.state.campaignEconomy.emergencyUsed = 0.5; },
    value => { value.state.campaignEconomy.extra = 0; }, value => { delete value.state.campaignEconomy; },
    value => { value.state.supplyPlan = { scenarioId: scene.id, decisionIndex: 0, allocationId: 'free', committed: false }; },
    value => { value.state.supplyPlan = { scenarioId: 'another', decisionIndex: 0, allocationId: 'purchase', committed: false }; },
    value => { value.state.supplyPlan = { scenarioId: scene.id, decisionIndex: 1, allocationId: 'purchase', committed: false }; },
    value => { value.state.supplyPlan = { scenarioId: scene.id, decisionIndex: 0, allocationId: 'emergency', committed: true }; },
  ];
  for (const mutate of mutations) {
    const value = structuredClone(valid); mutate(value);
    assert.equal(getCampaignSnapshotCompatibility(value).ok, false);
    assert.equal(restoreCampaignFromSnapshot(value, [scene]), null);
  }
});

test('saved supply reports and resolved battle assessments reject malformed nested data and context mismatches', () => {
  const resolved = advanceCampaignTurn(fresh({ treasury: 0 }), scene, { ...scene.choices[0], effects: { metrics: { treasury: -10 } } }, [scene]);
  const valid = snapshot(resolved.state);
  assert.equal(getCampaignSnapshotCompatibility(valid).ok, true);
  for (const mutate of [
    report => { report.shortages = [null]; }, report => { report.arrearsAfter.treasury = '10'; },
    report => { report.benefitRatio = 2; }, report => { report.notes = [{}]; }, report => { report.extra = true; },
  ]) {
    const invalid = structuredClone(valid); mutate(invalid.state.history[0].supplyReport);
    assert.equal(getCampaignSnapshotCompatibility(invalid).ok, false);
  }
  const assessment = getBattleAssessment({ battleId: 'first_manassas', outcome: 'decisive-win', confederateLossRate: 0.1, ammunitionRate: 0.5 }, 'option_b');
  const battleSave = snapshot(fresh());
  battleSave.state.battleCampaign.results.manassas_battlefield = { battleId: 'first_manassas', scenarioId: 'manassas_battlefield', choiceId: 'option_b', result: 'decisive-win', assessment };
  assert.equal(getCampaignSnapshotCompatibility(battleSave).ok, true);
  for (const mutate of [
    value => { value.assessment.commandScore = 999; }, value => { value.choiceId = 'option_a'; },
    value => { value.battleId = 'cold_harbor'; }, value => { value.assessment.objective.id = 'unknown:option_b'; },
  ]) {
    const invalid = structuredClone(battleSave); mutate(invalid.state.battleCampaign.results.manassas_battlefield);
    assert.equal(getCampaignSnapshotCompatibility(invalid).ok, false);
  }
});

test('actual authored choices forecast deterministically and persist their economy reports across varied states', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { STATIC_SCENARIOS } = await vite.ssrLoadModule('/src/game/scenarios.js');
    let checked = 0;
    for (const scenario of STATIC_SCENARIOS) for (const choice of scenario.choices) for (const seed of [7, 41, 1861]) {
      let state = { ...fresh({ treasury: seed % 101, munitions: seed * 7 % 101, militaryStrength: 55, publicMorale: 60, foodSupply: 35 }, seed === 7 ? 'story' : 'standard'),
        seed, scenarioId: scenario.id, currentTurn: scenario.turn || 12 };
      if (seed === 7) state = selectRecoveryAllocation(state, 'emergency');
      const forecast = forecastCampaignChoice(state, scenario, choice, 0.1);
      const actual = advanceCampaignTurn(state, scenario, choice, STATIC_SCENARIOS, 0.1);
      for (const key of Object.keys(state.metrics)) assert.ok(actual.state.metrics[key] >= forecast.resources[key].min && actual.state.metrics[key] <= forecast.resources[key].max, `${scenario.id}:${choice.id}:${key}`);
      assert.deepEqual(advanceCampaignTurn(state, scenario, choice, STATIC_SCENARIOS, 0.1), actual);
      const archive = createCampaignSnapshot(actual.state, actual.nextScenario || scenario);
      assert.ok(getCampaignSnapshotCompatibility(archive).ok, `${scenario.id}:${choice.id}:save`);
      assert.deepEqual(restoreCampaignFromSnapshot(archive, STATIC_SCENARIOS).state.campaignEconomy, actual.state.campaignEconomy);
      checked++;
    }
    assert.ok(checked >= 500, 'broad authored outcomes must be covered');
  } finally { await vite.close(); }
});
