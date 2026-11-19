import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createServer } from 'vite';
import { getBattleAssessment } from '../src/battle/battleAssessment.js';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { applyBattleResolution, battleForScenario, delegateBattle, PRACTICE_BATTLES } from '../src/game/battles.js';
import { createAfterAction } from '../src/game/campaignExperience.js';
import { CAMPAIGN_STORAGE_KEY, createCampaignSnapshot, createFreshCampaignState, restoreCampaignFromSnapshot } from '../src/game/campaignStorage.js';
import { getCampaignScenario } from '../src/game/campaignSupply.js';
import { FIELD_CHECKPOINT_KEY, loadFieldCheckpoint, saveFieldCheckpoint } from '../src/game/fieldCheckpoint.js';
import { advanceCampaignTurn } from '../src/game/headlessCampaign.js';
import { calculateElectionPressure, forecastCampaignChoice, resolveNextScenario } from '../src/game/simulationEngine.js';

const cacheDir = mkdtempSync(join(tmpdir(), 'civil-war-jonesborough-campaign-'));
const vite = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname, cacheDir,
  server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'silent' });

try {
  const { STATIC_SCENARIOS: scenarios } = await vite.ssrLoadModule('/src/game/scenarios.js');
  const scenario = scenarios.find(scene => scene.id === 'fall_of_atlanta');
  const winchester = scenarios.find(scene => scene.id === 'third_winchester');
  const atlantaApproach = scenarios.find(scene => scene.id === 'atlanta_election_pressure');
  const fresh = createFreshCampaignState(1864, scenario.id);
  const state = { ...fresh, currentTurn: scenario.turn,
    metrics: { militaryStrength: 96, munitions: 95, publicMorale: 94, treasury: 90, foodSupply: 94 } };
  const campaign = getCampaignScenario(state, scenario);
  const verdicts = { option_a: 'costly-win', option_b: 'disciplined-withdrawal' };

  function settle(base, choiceId, field) {
    const applied = field ? applyBattleResolution(base, field) : base;
    if (field) assert.equal(applyBattleResolution(applied, field), applied);
    const turn = advanceCampaignTurn(applied, getCampaignScenario(base, scenario), choiceId, scenarios);
    assert.equal(turn.nextScenario.id, winchester.id);
    turn.state.pendingDebrief = createAfterAction(base, turn.state, turn.historyEntry, turn.nextScenario, applied);
    const save = createCampaignSnapshot(turn.state, turn.nextScenario);
    const restored = restoreCampaignFromSnapshot(JSON.parse(JSON.stringify(save)), scenarios);
    assert.deepEqual(restored.state.history.at(-1), JSON.parse(JSON.stringify(turn.historyEntry)));
    return { entry: restored.state.history.at(-1), next: getCampaignScenario(restored.state, restored.activeScenario) };
  }

  await test('the modern field is reached through the Atlanta campaign and forecasts just its two missions', () => {
    const approach = { ...state, currentTurn: atlantaApproach.turn, scenarioId: atlantaApproach.id };
    const history = [];
    assert.match(getCampaignScenario(approach, atlantaApproach).choices[0].costDescription, /playable Jonesborough/);
    assert.equal(getCampaignScenario({ ...approach, battleRulesVersion: 17 }, atlantaApproach), atlantaApproach);
    assert.equal(resolveNextScenario(atlantaApproach, atlantaApproach.choices[0], 20, scenarios, 0, approach.shards, history).id, scenario.id);
    assert.equal(resolveNextScenario(atlantaApproach, atlantaApproach.choices[1], 20, scenarios, 0, approach.shards, history).id, 'atlanta_holds_october');
    for (const [choiceId, result] of Object.entries(verdicts)) {
      const choice = campaign.choices.find(order => order.id === choiceId);
      const battle = battleForScenario(campaign, state, choiceId);
      assert.equal(battle.id, 'jonesborough');
      assert.equal(battle.scenarioId, scenario.id);
      const forecast = forecastCampaignChoice(state, campaign, choice);
      assert.equal(forecast.successChance, null);
      assert.deepEqual(forecast.outcomes.map(row => row.result), [result, 'defeat', 'rout']);
      assert.equal(delegateBattle(state, battle, choiceId).result, result);
    }
    assert.equal(battleForScenario(campaign, state, 'option_c'), null);
    assert.equal(battleForScenario(campaign, state, 'option_d'), null);
    assert.equal(forecastCampaignChoice(state, campaign, campaign.choices[3]).successChance, .30);
    assert.equal(PRACTICE_BATTLES.fall_of_atlanta.practiceChoices.length, 2);
  });

  await test('Atlanta C and D route through July Petersburg to the September chapter', () => {
    const approach = { ...state, currentTurn: atlantaApproach.turn, scenarioId: atlantaApproach.id };
    for (const order of ['option_c', 'option_d']) {
      const crater = advanceCampaignTurn(approach, atlantaApproach, order, scenarios);
      assert.equal(crater.nextScenario.id, 'petersburg_siege');
      const restored = restoreCampaignFromSnapshot(createCampaignSnapshot(crater.state, crater.nextScenario), scenarios);
      for (const choice of restored.activeScenario.choices) {
        const resolved = advanceCampaignTurn(restored.state, restored.activeScenario, choice.id, scenarios);
        assert.equal(resolved.nextScenario.id, scenario.id);
        assert.equal(resolved.historyEntry.scenarioId, 'petersburg_siege');
        assert.equal(resolved.state.history.at(-2).choiceId, order);
        assert.equal(battleForScenario(resolved.nextScenario, resolved.state, 'option_a').id, 'jonesborough');
      }
    }
  });

  await test('keeping Johnston still opens October Atlanta and Lincoln can win without taking the city', () => {
    const cedar = scenarios.find(scene => scene.id === 'cedar_creek');
    const approach = { ...state, currentTurn: atlantaApproach.turn, scenarioId: atlantaApproach.id };
    const holdout = advanceCampaignTurn(approach, atlantaApproach, 'option_b', scenarios);
    assert.equal(holdout.nextScenario.id, 'atlanta_holds_october');
    const olderSave = createCampaignSnapshot({ ...holdout.state, battleRulesVersion: 17 }, holdout.nextScenario);
    olderSave.version = 21;
    const cold = restoreCampaignFromSnapshot(olderSave, scenarios);
    assert.equal(cold.activeScenario.id, holdout.nextScenario.id);
    assert.deepEqual(cold.state.history, holdout.state.history);
    const october = advanceCampaignTurn(cold.state, cold.activeScenario, 'option_b', scenarios);
    assert.equal(october.nextScenario.id, winchester.id);
    const election = advanceCampaignTurn({ ...october.state, currentTurn: cedar.turn, scenarioId: cedar.id }, cedar, 'option_b', scenarios);
    assert.equal(election.nextScenario.id, 'election_1864_lincoln');
    assert.doesNotMatch(election.nextScenario.description, /Atlanta['’]s fall/);
    assert.equal(calculateElectionPressure(election.state.history).factors.find(factor => factor.scenarioId === holdout.nextScenario.id).points, 3);
  });

  await test('rail success buys a local reprieve while a covered evacuation preserves supplies', () => {
    const limits = [/^Hardee briefly reopened the railroad/, /^Hardee’s force withdrew from Jonesborough in order/];
    const metrics = [{ munitions: -14, publicMorale: 10, divergenceIndex: .10 }, { publicMorale: -24, munitions: 4 }];
    for (const [index, choiceId] of Object.keys(verdicts).entries()) {
      const battle = battleForScenario(campaign, state, choiceId);
      const field = delegateBattle(state, battle, choiceId);
      const { entry, next } = settle(state, choiceId, field);
      assert.equal(entry.choiceSucceeded, true);
      assert.equal(entry.battleResult.battleId, 'jonesborough');
      assert.equal(entry.battleResult.scenarioId, scenario.id);
      assert.equal(entry.battleResult.fieldResultConsequencesVersion, 1);
      assert.deepEqual(entry.metricEffects, metrics[index]);
      assert.match(next.description, limits[index]);
      assert.equal(getCampaignScenario({ ...state, history: [entry] }, next), next);
      const political = calculateElectionPressure([entry]).factors[0];
      assert.equal(political.points, index === 0 ? 2 : -3);
      const incomplete = { ...field, delegated: false };
      incomplete.assessment = getBattleAssessment(incomplete, choiceId);
      const failed = settle(state, choiceId, incomplete);
      assert.equal(failed.entry.choiceSucceeded, false, 'a nominal verdict needs its matching mission evidence');
      assert.match(failed.next.description, /^The Jonesborough field operation fell short/);
      assert.ok(!Object.hasOwn(failed.entry.metricEffects, 'divergenceIndex'));
      if (index === 1) assert.deepEqual(failed.entry.metricEffects, { publicMorale: -24 });
    }
  });

  await test('earlier campaign records and the industrial and political decisions retain their original effects', () => {
    const legacy = { ...state, battleRulesVersion: 17 };
    assert.equal(battleForScenario(scenario, legacy, 'option_a'), null);
    assert.equal(getCampaignScenario(legacy, scenario), scenario);
    const { entry, next } = settle(legacy, 'option_a', null);
    assert.equal(entry.battleResult, null);
    assert.equal(next.description, winchester.description);
    assert.equal(calculateElectionPressure([{ ...entry, choiceSucceeded: true }]).factors[0].points, 4);
    for (const choice of scenario.choices.slice(2)) {
      assert.equal(campaign.choices.find(order => order.id === choice.id), choice);
      assert.equal(settle(state, choice.id, null).entry.battleResult, null);
      assert.equal(applyBattleResolution(state, { battleId: 'jonesborough', scenarioId: scenario.id, choiceId: choice.id, result: 'costly-win' }), state);
    }
    assert.equal(applyBattleResolution(state, { battleId: scenario.id, scenarioId: scenario.id, choiceId: 'option_a', result: 'costly-win' }), state);
  });

  await test('the Jonesborough field checkpoint is paired with the Atlanta campaign chapter', () => {
    const battle = battleForScenario(campaign, state, 'option_b');
    const engine = new CivilWarBattleEngine(battle.id, state, 'option_b');
    engine.tick(1);
    const checkpoint = engine.checkpoint();
    const raw = JSON.stringify(createCampaignSnapshot(state, campaign));
    const values = new Map([[CAMPAIGN_STORAGE_KEY, raw]]);
    const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    const pending = { battle, baseState: state, choiceId: 'option_b' };
    saveFieldCheckpoint(pending, checkpoint, state, storage);
    const restored = loadFieldCheckpoint(storage);
    assert.equal(restored.error, null);
    assert.deepEqual(CivilWarBattleEngine.fromCheckpoint(restored.pending.checkpoint, battle.id, restored.pending.resumeState, 'option_b').checkpoint(), checkpoint);
    for (const rejected of [{ ...pending, choiceId: 'option_c' }, { ...pending, baseState: { ...state, scenarioId: 'jonesborough' } }]) {
      saveFieldCheckpoint(rejected, checkpoint, state, storage);
      const saved = values.get(FIELD_CHECKPOINT_KEY);
      assert.match(loadFieldCheckpoint(storage).error, /not supported/);
      assert.equal(values.get(FIELD_CHECKPOINT_KEY), saved);
    }
    assert.equal(values.get(CAMPAIGN_STORAGE_KEY), raw);
  });
} finally {
  await vite.close();
  rmSync(cacheDir, { recursive: true, force: true });
}
