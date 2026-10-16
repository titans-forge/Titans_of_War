import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
});

try {
  const { STATIC_SCENARIOS } = await vite.ssrLoadModule('/src/game/scenarios.js');
  const { CivilWarBattleEngine } = await vite.ssrLoadModule('/src/battle/civilWarEngine.js');
  const {
    BATTLE_SCENARIOS,
    applyBattleResolution,
    battleChoiceSuccessModifier,
    battleForScenario,
    battleReadiness,
    delegateBattle,
  } = await vite.ssrLoadModule('/src/game/battles.js');
  const { createFreshCampaignState, createCampaignSnapshot, restoreCampaignFromSnapshot, saveCampaignSnapshot, loadCampaignSnapshotResult } = await vite.ssrLoadModule('/src/game/campaignStorage.js');
  const { createAfterAction } = await vite.ssrLoadModule('/src/game/campaignExperience.js');
  const { advanceCampaignTurn } = await vite.ssrLoadModule('/src/game/headlessCampaign.js');
  const { choiceScoreCard, resolveChoiceScoreCard } = await vite.ssrLoadModule('/src/game/simulationEngine.js');

  const validResults = new Set(['decisive-win', 'costly-win', 'disciplined-withdrawal', 'defeat', 'rout']);
  const standardMetrics = {
    militaryStrength: 85,
    munitions: 80,
    treasury: 75,
    foodSupply: 78,
    publicMorale: 80,
  };
  const weakMetrics = {
    militaryStrength: 38,
    munitions: 34,
    treasury: 45,
    foodSupply: 40,
    publicMorale: 42,
  };
  const strongMetrics = {
    militaryStrength: 96,
    munitions: 94,
    treasury: 85,
    foodSupply: 92,
    publicMorale: 94,
  };

  const createScenarioState = (scenario, metrics = standardMetrics) => ({
    ...createFreshCampaignState(1861, scenario.id),
    currentTurn: scenario.turn,
    scenarioId: scenario.id,
    actor: scenario.actor,
    roleLabel: scenario.roleLabel,
    metrics: { ...metrics },
  });

  let checkedChoices = 0;
  const outcomeCounts = {
    weak: Object.fromEntries([...validResults].map((result) => [result, 0])),
    standard: Object.fromEntries([...validResults].map((result) => [result, 0])),
    strong: Object.fromEntries([...validResults].map((result) => [result, 0])),
  };

  for (const [scenarioId, battle] of Object.entries(BATTLE_SCENARIOS)) {
    const scenario = STATIC_SCENARIOS.find((candidate) => candidate.id === scenarioId);
    assert.ok(scenario, `${scenarioId} must resolve to an authored campaign scenario`);
    assert.ok(scenario.choices?.length, `${scenarioId} must expose campaign choices`);
    assert.equal(battle.scenarioId, scenarioId, `${battle.id} must write to its authored scenario ledger key`);
    assert.ok(battle.fieldOrders?.length >= 2, `${battle.id} must explain its field command problem`);
    for (const [choiceId, orders] of Object.entries(battle.fieldOrdersByChoice || {})) {
      assert.ok(scenario.choices.some((choice) => choice.id === choiceId), `${battle.id} has field orders for unknown choice ${choiceId}`);
      assert.ok(orders.length > 0, `${battle.id}:${choiceId} must include at least one choice-specific order`);
    }

    const openingState = createScenarioState(scenario);
    assert.equal(battleForScenario(scenario, openingState)?.id, battle.id, `${battle.id} must open before field resolution`);

    for (const choice of scenario.choices) {
      checkedChoices += 1;
      const state = createScenarioState(scenario);
      const readiness = battleReadiness(state, choice.id, battle);
      const repeatedReadiness = battleReadiness(state, choice.id, battle);
      assert.deepEqual(readiness, repeatedReadiness, `${battle.id}:${choice.id} readiness must be deterministic`);

      const weak = delegateBattle(createScenarioState(scenario, weakMetrics), battle, choice.id);
      const standardA = delegateBattle(state, battle, choice.id);
      const standardB = delegateBattle(state, battle, choice.id);
      const strong = delegateBattle(createScenarioState(scenario, strongMetrics), battle, choice.id);
      outcomeCounts.weak[weak.result] += 1;
      outcomeCounts.standard[standardA.result] += 1;
      outcomeCounts.strong[strong.result] += 1;
      assert.deepEqual(standardA, standardB, `${battle.id}:${choice.id} delegation must be deterministic`);
      assert.ok(validResults.has(standardA.result), `${battle.id}:${choice.id} returned an unknown field result`);
      assert.ok(strong.score >= standardA.score, `${battle.id}:${choice.id} stronger readiness must not lower delegation score`);
      assert.ok(standardA.score >= weak.score, `${battle.id}:${choice.id} weaker readiness must not improve delegation score`);

      const engine = new CivilWarBattleEngine(battle.id, state, choice.id);
      const opening = engine.snapshot();
      assert.ok(opening.formations.length > 0, `${battle.id}:${choice.id} must load representative formations`);
      assert.ok(
        opening.formations.some((formation) => formation.id === battle.defaultSelection),
        `${battle.id}:${choice.id} must include its default selected formation`,
      );

      const modifier = battleChoiceSuccessModifier(battle, choice.id, standardA.result, 0);
      assert.ok([-1, 0, 1].includes(modifier), `${battle.id}:${choice.id} returned an invalid success modifier`);
      const battleState = applyBattleResolution(state, standardA);
      assert.ok(battleState.battleCampaign.results[scenarioId], `${battle.id}:${choice.id} must write a battle result`);
      assert.equal(battleForScenario(scenario, battleState), null, `${battle.id}:${choice.id} must not reopen after resolution`);
      assert.deepEqual(applyBattleResolution(battleState, standardA), battleState, `${battle.id}:${choice.id} resolution must be idempotent`);

      const advanced = advanceCampaignTurn(battleState, scenario, choice.id, STATIC_SCENARIOS, modifier);
      assert.equal(advanced.historyEntry.battleResult?.battleId, battle.id, `${battle.id}:${choice.id} history must retain the battle result`);
      // Round-trip the real returned result, resource ledger and still-open debrief.
      const report = createAfterAction(state, advanced.state, advanced.historyEntry, advanced.nextScenario, battleState, state);
      const returned = { ...advanced.state, pendingDebrief: report, correspondence: null };
      const archiveScenario = advanced.nextScenario || scenario;
      const memory = new Map();
      const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
      assert.equal(saveCampaignSnapshot(createCampaignSnapshot(returned, archiveScenario), storage).ok, true);
      const restored = restoreCampaignFromSnapshot(loadCampaignSnapshotResult(storage).snapshot, STATIC_SCENARIOS);
      assert.ok(restored, `${battle.id}:${choice.id} must reload`);
      assert.deepEqual(restored.state.metrics, returned.metrics);
      assert.deepEqual(restored.state.history, JSON.parse(JSON.stringify(returned.history)));
      assert.deepEqual(restored.state.pendingDebrief, JSON.parse(JSON.stringify(report)));
      assert.deepEqual(restored.state.battleCampaign, JSON.parse(JSON.stringify(returned.battleCampaign)));
      assert.equal(restored.activeScenario.id, archiveScenario.id);
      const dismissed = { ...restored.state, pendingDebrief: null };
      assert.equal(saveCampaignSnapshot(createCampaignSnapshot(dismissed, restored.activeScenario), storage).ok, true);
      const resumed = restoreCampaignFromSnapshot(loadCampaignSnapshotResult(storage).snapshot, STATIC_SCENARIOS);
      assert.equal(resumed.state.pendingDebrief, null);
      assert.deepEqual(resumed.state.history.at(-1).battleResult, JSON.parse(JSON.stringify(returned.history.at(-1).battleResult)));
      const authored = resolveChoiceScoreCard(scenarioId, choice);
      assert.deepEqual(
        advanced.historyEntry.scoreCard,
        { ...authored, tactical: (authored.tactical || 0) + battleState.battleCampaign.results[scenarioId].tacticalScore },
        `${battle.id}:${choice.id} field grading must preserve the complete authored scorecard`,
      );
      assert.deepEqual(choiceScoreCard(advanced.historyEntry), advanced.historyEntry.scoreCard, 'lookup must not add the field bonus twice');
      assert.notEqual(advanced.nextScenario?.id, scenarioId, `${battle.id}:${choice.id} must return to the campaign instead of looping`);
    }
  }

  assert.ok(
    outcomeCounts.weak.defeat + outcomeCounts.weak.rout >= 14,
    'weak field forces should face material defeat risk across the tactical campaign',
  );
  assert.ok(
    outcomeCounts.standard['decisive-win'] + outcomeCounts.standard['costly-win'] + outcomeCounts.standard['disciplined-withdrawal'] >= 30,
    'standard field forces should preserve a viable campaign across most delegated postures',
  );
  assert.equal(outcomeCounts.strong.rout, 0, 'strong field forces should not suffer an automatic delegated rout');
  assert.ok(outcomeCounts.standard['decisive-win'] <= 20, 'delegation should not turn most standard postures into decisive victories');

  const jacksonScenario = STATIC_SCENARIOS.find((scenario) => scenario.id === 'gettysburg_with_jackson');
  const jacksonBattle = BATTLE_SCENARIOS.gettysburg_with_jackson;
  const jacksonState = createScenarioState(jacksonScenario);
  assert.equal(delegateBattle(jacksonState, jacksonBattle, 'option_a').result, 'decisive-win', 'Jackson immediate seizure should retain the rare decisive delegated result');
  for (const choiceId of ['option_b', 'option_c', 'option_d']) {
    assert.notEqual(
      delegateBattle(jacksonState, jacksonBattle, choiceId).result,
      'decisive-win',
      `${choiceId} should not duplicate the recognition-grade immediate seizure result`,
    );
  }

  console.log(`Civil War tactical campaign integration checks passed (${Object.keys(BATTLE_SCENARIOS).length} battles, ${checkedChoices} choices).`);
} finally {
  await vite.close();
}
