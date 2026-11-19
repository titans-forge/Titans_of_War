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

const cacheDir = mkdtempSync(join(tmpdir(), 'civil-war-spotsylvania-campaign-'));
const vite = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname, cacheDir,
  server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'silent' });

try {
  const { STATIC_SCENARIOS: scenarios } = await vite.ssrLoadModule('/src/game/scenarios.js');
  const wilderness = scenarios.find(scene => scene.id === 'wilderness');
  const field = scenarios.find(scene => scene.id === 'spotsylvania');
  const newMarket = scenarios.find(scene => scene.id === 'new_market');
  const modern = { ...createFreshCampaignState(1864, wilderness.id), currentTurn: 16, divergenceIndex: .18,
    metrics: { militaryStrength: 92, munitions: 94, treasury: 90, publicMorale: 88, foodSupply: 68 } };
  const arrived = advanceCampaignTurn(modern, wilderness, 'option_b', scenarios);
  const state = arrived.state;

  function settle(choiceId, resolution) {
    const applied = applyBattleResolution(state, resolution);
    assert.equal(applyBattleResolution(applied, resolution), applied);
    const turn = advanceCampaignTurn(applied, field, choiceId, scenarios);
    assert.equal(turn.nextScenario.id, newMarket.id);
    assert.equal(turn.state.currentTurn, 17);
    turn.state.pendingDebrief = createAfterAction(state, turn.state, turn.historyEntry, turn.nextScenario, applied);
    const archive = JSON.parse(JSON.stringify(createCampaignSnapshot(turn.state, turn.nextScenario)));
    const restored = restoreCampaignFromSnapshot(archive, scenarios);
    assert.deepEqual(restored.state.history.at(-1), archive.state.history.at(-1));
    return { entry: restored.state.history.at(-1), state: restored.state,
      next: getCampaignScenario(restored.state, restored.activeScenario) };
  }

  await test('the Wilderness opens the interlude once, before New Market on current rules', () => {
    assert.equal(arrived.nextScenario.id, 'spotsylvania');
    assert.equal(arrived.state.currentTurn, 17);
    assert.equal(arrived.directorRoute, 'field-interlude');
    assert.equal(advanceCampaignTurn({ ...modern, battleRulesVersion: 17 }, wilderness, 'option_b', scenarios).nextScenario.id, 'new_market');
    const alreadyPlayed = { ...modern, history: [{ scenarioId: field.id, choiceId: 'option_a' }] };
    assert.equal(advanceCampaignTurn(alreadyPlayed, wilderness, 'option_b', scenarios).nextScenario.id, newMarket.id);
  });

  await test('the two briefing costs and the map use Spotsylvania’s authored data', () => {
    const displayed = getCampaignScenario(state, field);
    assert.match(displayed.choices[0].costDescription, /Commits 9 Munitions/);
    assert.match(displayed.choices[1].costDescription, /Commits 12 Munitions/);
    assert.deepEqual(getMapAnnotation(field.id).labels.map(label => label.text),
      ['MULE SHOE', 'WEST FACE', 'MCCOULL HOUSE', 'INTERIOR LINE']);
    assert.equal(getMapAnnotation(field.id).troops.confederate.label, 'LEE');
  });

  for (const [id, won, lost, opening] of [
    ['option_a', { munitions: -9, foodSupply: 4, publicMorale: 5 }, { munitions: -9, foodSupply: -3, publicMorale: -6 },
      /^The shorter line at Spotsylvania held, and supplies remain available/],
    ['option_b', { munitions: -12, foodSupply: 2, publicMorale: 11 }, { munitions: -12, foodSupply: -6, publicMorale: -9 },
      /^The West Face counterstroke slowed the attack at Spotsylvania/],
  ]) {
    await test(`${id} changes the New Market supply ledger and preserves the field record`, () => {
      const battle = battleForScenario(field, state, id);
      assert.equal(battle, PRACTICE_BATTLES.spotsylvania);
      const choice = field.choices.find(order => order.id === id);
      const forecast = forecastCampaignChoice(state, field, choice);
      assert.equal(forecast.successChance, null);
      assert.deepEqual(forecast.outcomes.map(caseResult => caseResult.result), ['costly-win', 'defeat', 'rout']);
      const staff = delegateBattle(state, battle, id);
      assert.equal(staff.result, 'costly-win');
      const victory = settle(id, staff);
      assert.equal(victory.entry.choiceSucceeded, true);
      assert.equal(victory.entry.battleResult.fieldResultConsequencesVersion, 1);
      assert.deepEqual(victory.entry.metricEffects, won);
      assert.match(victory.next.description, opening);
      assert.equal(battleForScenario(field, victory.state, id), null);

      const failed = { ...staff, result: 'defeat', delegated: false };
      failed.assessment = getBattleAssessment(failed, id);
      const defeat = settle(id, failed);
      assert.equal(defeat.entry.choiceSucceeded, false);
      assert.deepEqual(defeat.entry.metricEffects, lost);
      assert.match(defeat.next.description, /^The defense at Spotsylvania fell short, and fewer supplies are available/);
      assert.deepEqual(defeat.next.choices, getCampaignScenario(state, newMarket).choices);
      assert.ok(defeat.state.metrics.foodSupply < victory.state.metrics.foodSupply);
    });
  }

  await test('both campaign and practice checkpoints preserve exact battle state and the campaign save', () => {
    const battle = PRACTICE_BATTLES.spotsylvania;
    const saved = JSON.stringify(createCampaignSnapshot(state, field));
    const bytes = new Map([[CAMPAIGN_STORAGE_KEY, saved]]);
    const storage = { getItem: key => bytes.get(key) ?? null, setItem: (key, value) => bytes.set(key, value) };
    for (const practice of [true, false]) for (const choiceId of ['option_a', 'option_b']) {
      const resumeState = practice ? createPracticeState(field) : state;
      const engine = new CivilWarBattleEngine(battle.id, resumeState, choiceId);
      engine.tick(1);
      const checkpoint = engine.checkpoint();
      saveFieldCheckpoint({ battle, baseState: state, choiceId, practice }, checkpoint, resumeState, storage);
      const restored = loadFieldCheckpoint(storage);
      assert.equal(restored.error, null);
      assert.deepEqual(CivilWarBattleEngine.fromCheckpoint(restored.pending.checkpoint, battle.id,
        restored.pending.resumeState, choiceId).checkpoint(), checkpoint);
    }
    assert.equal(bytes.get(CAMPAIGN_STORAGE_KEY), saved);
  });
} finally {
  await vite.close();
  rmSync(cacheDir, { recursive: true, force: true });
}
