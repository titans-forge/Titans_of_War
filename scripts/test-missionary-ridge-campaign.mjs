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
import { getMapAnnotation } from '../src/game/mapAnnotations.js';
import { createPracticeState } from '../src/game/practiceConditions.js';
import { forecastCampaignChoice } from '../src/game/simulationEngine.js';

const cacheDir = mkdtempSync(join(tmpdir(), 'civil-war-missionary-ridge-campaign-'));
const vite = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname, cacheDir,
  server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'silent' });

try {
  const { STATIC_SCENARIOS: scenarios } = await vite.ssrLoadModule('/src/game/scenarios.js');
  const chickamauga = scenarios.find(scene => scene.id === 'chickamauga');
  const field = scenarios.find(scene => scene.id === 'missionary_ridge');
  const wilderness = scenarios.find(scene => scene.id === 'wilderness_opening');
  const modern = { ...createFreshCampaignState(1863, chickamauga.id), currentTurn: 14, divergenceIndex: .2,
    metrics: { militaryStrength: 94, munitions: 94, treasury: 90, publicMorale: 90, foodSupply: 74 } };
  const arrived = advanceCampaignTurn(modern, chickamauga, 'option_b', scenarios);
  const state = arrived.state;

  function settle(choiceId, resolution) {
    const applied = applyBattleResolution(state, resolution);
    assert.equal(applyBattleResolution(applied, resolution), applied);
    const turn = advanceCampaignTurn(applied, field, choiceId, scenarios);
    assert.equal(turn.nextScenario.id, wilderness.id);
    assert.equal(turn.state.currentTurn, 15);
    turn.state.pendingDebrief = createAfterAction(state, turn.state, turn.historyEntry, turn.nextScenario, applied);
    const archive = JSON.parse(JSON.stringify(createCampaignSnapshot(turn.state, turn.nextScenario)));
    const restored = restoreCampaignFromSnapshot(archive, scenarios);
    assert.deepEqual(restored.state.history.at(-1), archive.state.history.at(-1));
    return { entry: restored.state.history.at(-1), state: restored.state,
      next: getCampaignScenario(restored.state, restored.activeScenario) };
  }

  await test('the ordinary campaign visits the new field once and keeps divergent and legacy Chattanooga routes', () => {
    assert.equal(arrived.nextScenario.id, field.id);
    assert.equal(arrived.state.currentTurn, 15);
    assert.equal(arrived.directorRoute, 'field-interlude');
    const legacy = advanceCampaignTurn({ ...modern, battleRulesVersion: 17 }, chickamauga, 'option_b', scenarios);
    assert.equal(legacy.nextScenario.id, wilderness.id);
    assert.equal(getCampaignScenario(legacy.state, wilderness), wilderness);
    const alternative = advanceCampaignTurn({ ...modern, divergenceIndex: .36 }, chickamauga, 'option_b', scenarios);
    assert.equal(alternative.nextScenario.id, 'chattanooga_stranglehold');
    const later = advanceCampaignTurn(alternative.state, alternative.nextScenario, 'option_b', scenarios);
    assert.equal(later.nextScenario.id, wilderness.id);
    assert.equal(later.state.currentTurn, 15);
    const alreadyPlayed = { ...modern, history: [{ scenarioId: field.id, choiceId: 'option_a' }] };
    assert.equal(advanceCampaignTurn(alreadyPlayed, chickamauga, 'option_b', scenarios).nextScenario.id, wilderness.id);
  });

  await test('the orders show their authored costs and the schematic uses its own locations', () => {
    const current = getCampaignScenario(state, field);
    assert.match(current.choices[0].costDescription, /Commits 8 Munitions/);
    assert.match(current.choices[1].costDescription, /Commits 4 Munitions/);
    const fredericksburg = scenarios.find(scene => scene.id === 'fredericksburg_field');
    assert.equal(getCampaignScenario(state, fredericksburg), fredericksburg);
    assert.deepEqual(getMapAnnotation(field.id).labels.map(label => label.text),
      ['ORCHARD KNOB', 'MAIN CREST', 'EASTERN ROAD']);
    assert.ok(getMapAnnotation('new_market').labels.some(label => label.text.includes('BUSHONG FARM')));
    assert.ok(getMapAnnotation('cedar_creek').labels.some(label => label.text === 'BELLE GROVE'));
    assert.ok(getMapAnnotation('gettysburg_decision').labels.length);
  });

  for (const [choiceId, outcome, values, lost, opening] of [
    ['option_a', 'costly-win', { munitions: -8, foodSupply: 5, publicMorale: 6 },
      { munitions: -8, foodSupply: -7, publicMorale: -7 }, /^The defense at Missionary Ridge bought time/],
    ['option_b', 'disciplined-withdrawal', { munitions: -4, foodSupply: 11, publicMorale: 2 },
      { munitions: -4, foodSupply: -4, publicMorale: -6 }, /^The ordered withdrawal from Missionary Ridge saved supplies/],
  ]) {
    await test(`${choiceId} settles actual field evidence and keeps the next chronological stage`, () => {
      const battle = battleForScenario(field, state, choiceId);
      assert.equal(battle, PRACTICE_BATTLES.missionary_ridge);
      const choice = field.choices.find(order => order.id === choiceId);
      const forecast = forecastCampaignChoice(state, field, choice);
      assert.equal(forecast.successChance, null);
      assert.deepEqual(forecast.outcomes.map(result => result.result), [outcome, 'defeat', 'rout']);
      const staff = delegateBattle(state, battle, choiceId);
      assert.equal(staff.result, outcome);
      const resolved = settle(choiceId, staff);
      assert.equal(resolved.entry.choiceSucceeded, true);
      assert.deepEqual(resolved.entry.metricEffects, values);
      assert.equal(resolved.entry.battleResult.fieldResultConsequencesVersion, 1);
      assert.match(resolved.entry.consequence, /Chattanooga/);
      assert.match(resolved.next.description, opening);
      assert.deepEqual(resolved.next.choices, wilderness.choices);
      assert.equal(battleForScenario(field, resolved.state, choiceId), null);

      const failed = { ...staff, result: 'defeat', delegated: false };
      failed.assessment = getBattleAssessment(failed, choiceId);
      const missed = settle(choiceId, failed);
      assert.equal(missed.entry.choiceSucceeded, false);
      assert.deepEqual(missed.entry.metricEffects, lost);
      assert.match(missed.next.description, /^The retreat from Missionary Ridge left supplies behind as the Union secured Chattanooga\./);
      assert.deepEqual(missed.next.choices, wilderness.choices);
      assert.ok(missed.state.metrics.foodSupply < resolved.state.metrics.foodSupply);
    });
  }

  await test('a field checkpoint in either mission restores on turn 15 without mutating the campaign save', () => {
    const battle = PRACTICE_BATTLES.missionary_ridge;
    const saved = JSON.stringify(createCampaignSnapshot(state, field));
    const relay = new Map([[CAMPAIGN_STORAGE_KEY, saved]]);
    const storage = { getItem: key => relay.get(key) ?? null, setItem: (key, value) => relay.set(key, value) };
    for (const practice of [true, false]) for (const choiceId of ['option_a', 'option_b']) {
      const resumeState = practice ? createPracticeState(field) : state;
      const engine = new CivilWarBattleEngine(battle.id, resumeState, choiceId);
      engine.tick(1);
      const checkpoint = engine.checkpoint();
      saveFieldCheckpoint({ battle, baseState: state, choiceId, practice }, checkpoint, resumeState, storage);
      const restored = loadFieldCheckpoint(storage);
      assert.equal(restored.error, null);
      assert.deepEqual(CivilWarBattleEngine.fromCheckpoint(restored.pending.checkpoint, battle.id, restored.pending.resumeState, choiceId).checkpoint(), checkpoint);
    }
    assert.equal(relay.get(CAMPAIGN_STORAGE_KEY), saved);
  });
} finally {
  await vite.close();
  rmSync(cacheDir, { recursive: true, force: true });
}
