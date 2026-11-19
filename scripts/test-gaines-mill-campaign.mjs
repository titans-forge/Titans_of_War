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
import { loadFieldCheckpoint, saveFieldCheckpoint } from '../src/game/fieldCheckpoint.js';
import { advanceCampaignTurn } from '../src/game/headlessCampaign.js';
import { createPracticeState } from '../src/game/practiceConditions.js';
import { forecastCampaignChoice } from '../src/game/simulationEngine.js';

const cacheDir = mkdtempSync(join(tmpdir(), 'civil-war-gaines-mill-campaign-'));
const vite = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname, cacheDir,
  server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'silent' });

try {
  const { STATIC_SCENARIOS: scenarios } = await vite.ssrLoadModule('/src/game/scenarios.js');
  const scene = scenarios.find(candidate => candidate.id === 'seven_days');
  const secondManassas = scenarios.find(candidate => candidate.id === 'second_manassas');
  const state = { ...createFreshCampaignState(1862, scene.id), currentTurn: scene.turn, divergenceIndex: .16,
    metrics: { militaryStrength: 95, munitions: 94, treasury: 90, publicMorale: 94, foodSupply: 95 } };
  const campaign = getCampaignScenario(state, scene);
  const battle = battleForScenario(scene, state, 'option_a');

  function settle(base, choiceId, field) {
    const applied = field ? applyBattleResolution(base, field) : base;
    if (field) assert.equal(applyBattleResolution(applied, field), applied);
    const turn = advanceCampaignTurn(applied, getCampaignScenario(base, scene), choiceId, scenarios);
    assert.equal(turn.nextScenario.id, secondManassas.id);
    assert.equal(turn.state.currentTurn, 7);
    turn.state.pendingDebrief = createAfterAction(base, turn.state, turn.historyEntry, turn.nextScenario, applied);
    const saved = createCampaignSnapshot(turn.state, turn.nextScenario);
    const restored = restoreCampaignFromSnapshot(JSON.parse(JSON.stringify(saved)), scenarios);
    assert.deepEqual(restored.state.history.at(-1), JSON.parse(JSON.stringify(turn.historyEntry)));
    return { entry: restored.state.history.at(-1), next: getCampaignScenario(restored.state, restored.activeScenario) };
  }

  await test('only the modern Seven Days offensive opens Gaines’ Mill in the campaign', () => {
    const previous = scenarios.find(candidate => candidate.id === 'first_winchester');
    const arrived = advanceCampaignTurn({ ...state, scenarioId: previous.id, currentTurn: previous.turn }, previous, 'option_b', scenarios);
    assert.equal(arrived.nextScenario.id, scene.id);
    assert.equal(battle.id, 'gaines_mill');
    assert.equal(battle.scenarioId, 'seven_days');
    assert.match(campaign.choices[0].text, /^Carry the offensive to Gaines’ Mill/);
    const forecast = forecastCampaignChoice(state, scene, campaign.choices[0]);
    assert.deepEqual(forecast.outcomes.map(outcome => outcome.result), ['costly-win', 'defeat', 'rout']);
    assert.equal(forecast.successChance, null);
    assert.equal(battleForScenario(scene, { ...state, battleRulesVersion: 17 }, 'option_a'), null);
    assert.deepEqual(PRACTICE_BATTLES.seven_days.practiceChoices.map(choice => choice.id), ['option_a', 'option_b']);
    for (const choice of scene.choices.slice(1)) {
      assert.equal(battleForScenario(scene, state, choice.id), null);
      assert.equal(campaign.choices.find(order => order.id === choice.id), choice);
    }
  });

  await test('field credit and the Second Manassas briefing match the recorded Gaines’ Mill result', () => {
    const staff = delegateBattle(state, battle, 'option_a');
    assert.equal(staff.result, 'costly-win');
    const breakthrough = settle(state, 'option_a', staff);
    assert.equal(breakthrough.entry.choiceSucceeded, true);
    assert.equal(breakthrough.entry.battleResult.battleId, 'gaines_mill');
    assert.equal(breakthrough.entry.battleResult.fieldResultConsequencesVersion, 1);
    assert.deepEqual(breakthrough.entry.metricEffects, { munitions: -20, publicMorale: 16 });
    assert.match(breakthrough.next.description, /^At Gaines’ Mill, the assault opened a breach/);
    const unsupported = { ...staff, delegated: false };
    unsupported.assessment = getBattleAssessment(unsupported, 'option_a');
    const failure = settle(state, 'option_a', unsupported);
    assert.equal(failure.entry.choiceSucceeded, false);
    assert.deepEqual(failure.entry.metricEffects, { munitions: -20, publicMorale: -7 });
    assert.match(failure.next.description, /^The attack at Gaines’ Mill fell short/);
  });

  await test('older and non-field Seven Days choices retain the authored effects', () => {
    for (const [base, choice] of [[{ ...state, battleRulesVersion: 17 }, scene.choices[0]],
      ...scene.choices.slice(1).map(choice => [state, choice])]) {
      const result = settle(base, choice.id);
      assert.equal(result.entry.consequence, choice.consequence);
      assert.deepEqual(result.entry.metricEffects, choice.effects.metrics);
      assert.equal(result.entry.battleResult, null);
    }
    assert.equal(applyBattleResolution(state, { scenarioId: scene.id, battleId: battle.id, choiceId:'option_b', result: 'disciplined-withdrawal' }), state);
  });

  await test('both legal checkpoint contexts restore and the practice option cannot enter the campaign', () => {
    const raw = JSON.stringify(createCampaignSnapshot(state, scene));
    const values = new Map([[CAMPAIGN_STORAGE_KEY, raw]]);
    const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    for (const [choiceId, resumeState, practice] of [
      ['option_a', state, false],
      ['option_b', createPracticeState(scene, 'reserve', 'full'), true],
    ]) {
      const engine = new CivilWarBattleEngine(battle.id, resumeState, choiceId);
      engine.tick(1);
      const checkpoint = engine.checkpoint();
      saveFieldCheckpoint({ battle, baseState: state, choiceId, practice }, checkpoint, resumeState, storage);
      const restored = loadFieldCheckpoint(storage);
      assert.equal(restored.error, null);
      assert.deepEqual(CivilWarBattleEngine.fromCheckpoint(restored.pending.checkpoint, battle.id, restored.pending.resumeState, choiceId).checkpoint(), checkpoint);
      if (practice) {
        saveFieldCheckpoint({ battle, baseState: state, choiceId, practice: false }, checkpoint, state, storage);
        assert.match(loadFieldCheckpoint(storage).error, /not supported/);
      }
    }
    assert.equal(values.get(CAMPAIGN_STORAGE_KEY), raw);
  });
} finally {
  await vite.close();
  rmSync(cacheDir, { recursive: true, force: true });
}
