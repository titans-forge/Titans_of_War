import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createServer } from 'vite';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { getBattleAssessment } from '../src/battle/battleAssessment.js';
import { applyBattleResolution, battleForScenario, delegateBattle, PRACTICE_BATTLES } from '../src/game/battles.js';
import { createAfterAction } from '../src/game/campaignExperience.js';
import { CAMPAIGN_STORAGE_KEY, createCampaignSnapshot, createFreshCampaignState, restoreCampaignFromSnapshot } from '../src/game/campaignStorage.js';
import { getCampaignScenario } from '../src/game/campaignSupply.js';
import { loadFieldCheckpoint, saveFieldCheckpoint } from '../src/game/fieldCheckpoint.js';
import { advanceCampaignTurn } from '../src/game/headlessCampaign.js';
import { createPracticeState } from '../src/game/practiceConditions.js';
import { forecastCampaignChoice } from '../src/game/simulationEngine.js';

const cacheDir = mkdtempSync(join(tmpdir(), 'civil-war-new-market-campaign-'));
const vite = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname, cacheDir,
  server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'silent' });

try {
  const { STATIC_SCENARIOS: scenarios } = await vite.ssrLoadModule('/src/game/scenarios.js');
  const scenario = scenarios.find(candidate => candidate.id === 'new_market');
  const wilderness = scenarios.find(candidate => candidate.id === 'wilderness');
  const coldHarbor = scenarios.find(candidate => candidate.id === 'cold_harbor');
  const state = { ...createFreshCampaignState(1864, scenario.id), currentTurn: scenario.turn, divergenceIndex: .16,
    metrics: { militaryStrength: 95, munitions: 94, treasury: 90, publicMorale: 94, foodSupply: 68 } };
  const current = getCampaignScenario(state, scenario);
  const battle = PRACTICE_BATTLES.new_market;

  function settle(base, choiceId, result) {
    const withField = result ? applyBattleResolution(base, result) : base;
    if (result) assert.equal(applyBattleResolution(withField, result), withField);
    const turn = advanceCampaignTurn(withField, getCampaignScenario(base, scenario), choiceId, scenarios);
    assert.equal(turn.nextScenario.id, coldHarbor.id);
    assert.equal(turn.state.currentTurn, 18);
    turn.state.pendingDebrief = createAfterAction(base, turn.state, turn.historyEntry, turn.nextScenario, withField);
    const archive = JSON.parse(JSON.stringify(createCampaignSnapshot(turn.state, turn.nextScenario)));
    const restored = restoreCampaignFromSnapshot(archive, scenarios);
    assert.deepEqual(restored.state.history.at(-1), archive.state.history.at(-1));
    return { entry: restored.state.history.at(-1), next: getCampaignScenario(restored.state, coldHarbor),
      food: restored.state.metrics.foodSupply };
  }

  await test('the Wilderness and Spotsylvania lead to both New Market field orders, each with a verdict-based forecast', () => {
    const arrived = advanceCampaignTurn({ ...state, scenarioId: wilderness.id, currentTurn: wilderness.turn }, wilderness, 'option_b', scenarios);
    assert.equal(arrived.nextScenario.id, 'spotsylvania');
    const earlierBattle = battleForScenario(arrived.nextScenario, arrived.state, 'option_a');
    const staff = delegateBattle(arrived.state, earlierBattle, 'option_a');
    const followed = advanceCampaignTurn(applyBattleResolution(arrived.state, staff), arrived.nextScenario, 'option_a', scenarios);
    assert.equal(followed.nextScenario.id, scenario.id);
    assert.equal(followed.state.currentTurn, 17);
    assert.equal(arrived.state.currentTurn, 17);
    assert.equal(battle.id, 'new_market');
    for (const choiceId of ['option_a', 'option_b']) {
      assert.equal(battleForScenario(scenario, state, choiceId), battle);
      assert.equal(battleForScenario(scenario, { ...state, battleRulesVersion: 17 }, choiceId), null);
      const choice = current.choices.find(order => order.id === choiceId);
      const forecast = forecastCampaignChoice(state, current, choice);
      assert.equal(forecast.successChance, null);
      assert.deepEqual(forecast.outcomes.map(outcome => outcome.result), ['costly-win', 'defeat', 'rout']);
      assert.ok(forecast.resources.foodSupply.max > forecast.resources.foodSupply.min);
    }
  });

  for (const [choiceId, munitions, foodWon, foodLost, moraleWon, moraleLost, opening] of [
    ['option_a', -10, 18, -10, 18, -8, /^The advance at New Market kept the Valley supply route open/],
    ['option_b', -6, 16, -6, 10, -5, /^The Valley Pike held at New Market/],
  ]) {
    await test(`${choiceId} carries earned supplies and its record into Cold Harbor`, () => {
      const staff = delegateBattle(state, battle, choiceId);
      assert.equal(staff.result, 'costly-win');
      const success = settle(state, choiceId, staff);
      assert.equal(success.entry.choiceSucceeded, true);
      assert.equal(success.entry.battleResult.fieldResultConsequencesVersion, 1);
      assert.match(success.entry.consequence, /^Staff estimate/);
      assert.match(success.next.description, opening);
      assert.equal(success.entry.metricEffects.foodSupply, foodWon);
      assert.equal(success.entry.metricEffects.munitions, munitions);
      assert.equal(success.entry.metricEffects.publicMorale, moraleWon);

      const failedField = { ...staff, result: 'defeat', delegated: false };
      failedField.assessment = getBattleAssessment(failedField, choiceId);
      const failed = settle(state, choiceId, failedField);
      assert.equal(failed.entry.choiceSucceeded, false);
      assert.match(failed.next.description, /^The New Market objective fell short, and fewer supplies are coming through the Valley\./);
      assert.equal(failed.entry.metricEffects.foodSupply, foodLost);
      assert.equal(failed.entry.metricEffects.munitions, munitions);
      assert.equal(failed.entry.metricEffects.publicMorale, moraleLost);
      assert.ok(success.food > failed.food);
    });
  }

  await test('older, recorded and non-field decisions retain their authored outcomes', () => {
    const old = { ...state, battleRulesVersion: 17 };
    assert.equal(getCampaignScenario(old, scenario), scenario);
    for (const [base, id] of [[old, 'option_b'], [state, 'option_c'], [state, 'option_d']]) {
      const original = scenario.choices.find(choice => choice.id === id);
      assert.equal(battleForScenario(scenario, base, id), null);
      const settled = settle(base, id);
      assert.equal(settled.entry.battleResult, null);
      assert.equal(settled.entry.consequence, original.consequence);
      assert.deepEqual(settled.entry.metricEffects, original.effects.metrics);
      assert.equal(settled.next.description, coldHarbor.description);
    }
    const staff = delegateBattle(state, battle, 'option_b');
    assert.equal(applyBattleResolution(state, { ...staff, choiceId: 'option_c' }), state);
    assert.equal(battleForScenario(scenario, applyBattleResolution(state, staff), 'option_b'), null);
  });

  await test('campaign and Quick Battle both resume without touching the stored campaign', () => {
    const savedCampaign = JSON.stringify(createCampaignSnapshot(state, scenario));
    const values = new Map([[CAMPAIGN_STORAGE_KEY, savedCampaign]]);
    const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    for (const practice of [false, true]) for (const choiceId of ['option_a', 'option_b']) {
      const resumeState = practice ? createPracticeState(scenario) : state;
      const engine = new CivilWarBattleEngine(battle.id, resumeState, choiceId);
      engine.tick(1);
      const checkpoint = engine.checkpoint();
      saveFieldCheckpoint({ battle, baseState: state, choiceId, practice }, checkpoint, resumeState, storage);
      const restored = loadFieldCheckpoint(storage);
      assert.equal(restored.error, null);
      assert.deepEqual(CivilWarBattleEngine.fromCheckpoint(restored.pending.checkpoint, battle.id, restored.pending.resumeState, choiceId).checkpoint(), checkpoint);
    }
    assert.equal(values.get(CAMPAIGN_STORAGE_KEY), savedCampaign);
  });
} finally {
  await vite.close();
  rmSync(cacheDir, { recursive: true, force: true });
}
