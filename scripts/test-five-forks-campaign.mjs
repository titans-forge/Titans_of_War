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
import { forecastCampaignChoice } from '../src/game/simulationEngine.js';

const cacheDir = mkdtempSync(join(tmpdir(), 'civil-war-five-forks-campaign-'));
const vite = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname,
  cacheDir, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'silent' });

try {
  const { STATIC_SCENARIOS: scenarios } = await vite.ssrLoadModule('/src/game/scenarios.js');
  const scenario = scenarios.find(scene => scene.id === 'five_forks');
  const richmond = scenarios.find(scene => scene.id === 'richmond_evacuation');
  const prior = scenarios.find(scene => scene.turn === 25);
  const fresh = createFreshCampaignState(1865, prior.id);
  const ready = { militaryStrength: 96, munitions: 95, publicMorale: 95, treasury: 90, foodSupply: 94 };
  const arrived = advanceCampaignTurn({ ...fresh, currentTurn: prior.turn, metrics: ready }, prior, 'option_b', scenarios);
  const state = arrived.state;
  const campaign = getCampaignScenario(state, scenario);
  const verdicts = { option_a: 'costly-win', option_b: 'disciplined-withdrawal', option_c: 'disciplined-withdrawal' };

  function settle(base, choiceId, field) {
    const applied = field ? applyBattleResolution(base, field) : base;
    if (field) assert.equal(applyBattleResolution(applied, field), applied);
    const turn = advanceCampaignTurn(applied, getCampaignScenario(base, scenario), choiceId, scenarios);
    assert.equal(turn.nextScenario.id, richmond.id);
    turn.state.pendingDebrief = createAfterAction(base, turn.state, turn.historyEntry, turn.nextScenario, applied);
    const save = createCampaignSnapshot(turn.state, turn.nextScenario);
    const restored = restoreCampaignFromSnapshot(JSON.parse(JSON.stringify(save)), scenarios);
    assert.deepEqual(restored.state.history.at(-1), JSON.parse(JSON.stringify(turn.historyEntry)));
    return { entry: restored.state.history.at(-1), next: getCampaignScenario(restored.state, restored.activeScenario) };
  }

  await test('the ordinary late campaign reaches Five Forks with three distinct field outlooks', () => {
    assert.equal(arrived.nextScenario.id, scenario.id);
    for (const [choiceId, result] of Object.entries(verdicts)) {
      const choice = campaign.choices.find(order => order.id === choiceId);
      const battle = battleForScenario(campaign, state, choiceId);
      assert.equal(battle.id, 'five_forks');
      assert.deepEqual(forecastCampaignChoice(state, campaign, choice).outcomes.map(row => row.result), [result, 'defeat', 'rout']);
      assert.equal(delegateBattle(state, battle, choiceId).result, result);
    }
    assert.equal(battleForScenario(campaign, state, 'option_d'), null);
    assert.equal(forecastCampaignChoice(state, campaign, campaign.choices[3]).successChance, .40);
    assert.equal(PRACTICE_BATTLES.five_forks.practiceChoices.length, 3);
  });

  await test('field credit and Richmond briefing reflect each Five Forks result', () => {
    const openings = [/^Pickett’s line bought time/, /^The rear guard at Five Forks/, /^Pickett’s troops left Five Forks in order/];
    const metrics = [{ munitions: -16 }, { munitions: -10, divergenceIndex: .05 }, { publicMorale: -22, munitions: 2 }];
    for (const [i, choiceId] of Object.keys(verdicts).entries()) {
      const battle = battleForScenario(campaign, state, choiceId);
      const field = delegateBattle(state, battle, choiceId);
      const { entry, next } = settle(state, choiceId, field);
      assert.equal(entry.choiceSucceeded, true);
      assert.equal(entry.battleResult.assessment.source, 'delegated');
      assert.equal(entry.battleResult.fieldResultConsequencesVersion, 1);
      assert.deepEqual(entry.metricEffects, metrics[i]);
      assert.match(next.description, openings[i]);
      const defeat = { ...field, result: 'defeat', delegated: false };
      defeat.assessment = getBattleAssessment(defeat, choiceId);
      const failed = settle(state, choiceId, defeat);
      assert.equal(failed.entry.choiceSucceeded, false);
      assert.match(failed.next.description, /^The Five Forks field operation fell short/);
      assert.ok(failed.entry.scoreCard.tactical < entry.scoreCard.tactical);
      assert.ok(!Object.hasOwn(failed.entry.metricEffects, 'divergenceIndex'));
      if (choiceId === 'option_c') assert.deepEqual(failed.entry.metricEffects, { publicMorale: -22 });
    }
  });

  await test('older rules and the fourth story choice keep their authored resolution', () => {
    const legacy = { ...state, battleRulesVersion: 17 };
    assert.equal(battleForScenario(scenario, legacy, 'option_a'), null);
    const { entry, next } = settle(legacy, 'option_a', null);
    assert.equal(entry.consequence, scenario.choices[0].consequence);
    assert.deepEqual(entry.metricEffects, scenario.choices[0].effects.metrics);
    assert.equal(next.description, richmond.description);
    const story = settle(state, 'option_d', null);
    assert.equal(story.entry.battleResult, null);
    assert.equal(story.next.description, richmond.description);
    assert.equal(applyBattleResolution(state, { battleId: scenario.id, scenarioId: scenario.id, choiceId: 'option_d', result: 'costly-win' }), state);
  });

  await test('campaign suspension resumes exact field state and rejects a story-choice checkpoint', () => {
    const battle = battleForScenario(scenario, state, 'option_c');
    const engine = new CivilWarBattleEngine(battle.id, state, 'option_c');
    engine.tick(1);
    const checkpoint = engine.checkpoint();
    const raw = JSON.stringify(createCampaignSnapshot(state, campaign));
    const values = new Map([[CAMPAIGN_STORAGE_KEY, raw]]);
    const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    const pending = { battle, baseState: state, choiceId: 'option_c' };
    saveFieldCheckpoint(pending, checkpoint, state, storage);
    const restored = loadFieldCheckpoint(storage);
    assert.equal(restored.error, null);
    assert.deepEqual(CivilWarBattleEngine.fromCheckpoint(restored.pending.checkpoint, battle.id, restored.pending.resumeState, 'option_c').checkpoint(), checkpoint);
    saveFieldCheckpoint({ ...pending, choiceId: 'option_d' }, checkpoint, state, storage);
    const rejected = values.get(FIELD_CHECKPOINT_KEY);
    assert.match(loadFieldCheckpoint(storage).error, /not supported/);
    assert.equal(values.get(FIELD_CHECKPOINT_KEY), rejected);
    assert.equal(values.get(CAMPAIGN_STORAGE_KEY), raw);
  });
} finally {
  await vite.close();
  rmSync(cacheDir, { recursive: true, force: true });
}
