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
import { forecastCampaignChoice } from '../src/game/simulationEngine.js';

const cacheDir = mkdtempSync(join(tmpdir(), 'civil-war-fredericksburg-campaign-'));
const vite = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname, cacheDir,
  server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'silent' });

try {
  const { STATIC_SCENARIOS: scenarios } = await vite.ssrLoadModule('/src/game/scenarios.js');
  const emancipation = scenarios.find(scene => scene.id === 'emancipation_cabinet_debate');
  const field = scenarios.find(scene => scene.id === 'fredericksburg_field');
  const winter = scenarios.find(scene => scene.id === 'fredericksburg_winter_politics');
  const modern = { ...createFreshCampaignState(1862, emancipation.id), currentTurn: emancipation.turn,
    metrics: { militaryStrength: 93, munitions: 92, treasury: 90, publicMorale: 92, foodSupply: 91 } };
  const arrived = advanceCampaignTurn(modern, emancipation, 'option_b', scenarios);
  const state = arrived.state;

  function settle(choiceId, resolution) {
    const applied = applyBattleResolution(state, resolution);
    assert.equal(applyBattleResolution(applied, resolution), applied);
    const turn = advanceCampaignTurn(applied, field, choiceId, scenarios);
    assert.equal(turn.nextScenario.id, winter.id);
    assert.equal(turn.state.currentTurn, field.turn);
    turn.state.pendingDebrief = createAfterAction(state, turn.state, turn.historyEntry, turn.nextScenario, applied);
    const saved = createCampaignSnapshot(turn.state, turn.nextScenario);
    const restored = restoreCampaignFromSnapshot(JSON.parse(JSON.stringify(saved)), scenarios);
    assert.deepEqual(restored.state.history.at(-1), JSON.parse(JSON.stringify(turn.historyEntry)));
    return { entry: restored.state.history.at(-1), state: restored.state,
      next: getCampaignScenario(restored.state, restored.activeScenario) };
  }

  await test('the new battle occurs once between Emancipation and winter on the current campaign rules', () => {
    for (const choice of emancipation.choices) {
      const current = advanceCampaignTurn(modern, emancipation, choice.id, scenarios);
      assert.equal(current.nextScenario.id, field.id);
      assert.equal(current.state.currentTurn, 9);
      assert.equal(current.directorRoute, 'field-interlude');
      const legacy = advanceCampaignTurn({ ...modern, battleRulesVersion: 17 }, emancipation, choice.id, scenarios);
      assert.equal(legacy.nextScenario.id, winter.id);
    }
    const alreadyPlayed = { ...modern, history: [{ scenarioId: field.id, choiceId: 'option_a' }] };
    assert.equal(advanceCampaignTurn(alreadyPlayed, emancipation, 'option_b', scenarios).nextScenario.id, winter.id);
    const settledBeforeUpgrade = { ...modern, scenarioId: winter.id };
    assert.equal(getCampaignScenario(settledBeforeUpgrade, winter), winter);
    assert.equal(PRACTICE_BATTLES[field.id].practiceChoices.length, 2);
  });

  await test('both field orders record their own winter briefing without changing the four policy effects', () => {
    for (const [choiceId, opening, ammo, morale] of [
      ['option_a', /^The line held at Marye’s Heights/, -8, 4],
      ['option_b', /^The reserve steadied the line at Prospect Hill/, -6, 3],
    ]) {
      const choice = field.choices.find(order => order.id === choiceId);
      const battle = battleForScenario(field, state, choiceId);
      assert.equal(battle.id, 'fredericksburg');
      assert.deepEqual(forecastCampaignChoice(state, field, choice).outcomes.map(outcome => outcome.result), ['costly-win', 'defeat', 'rout']);
      const staff = delegateBattle(state, battle, choiceId);
      assert.equal(staff.result, 'costly-win');
      const result = settle(choiceId, staff);
      assert.equal(result.entry.choiceSucceeded, true);
      assert.deepEqual(result.entry.metricEffects, { munitions: ammo, publicMorale: morale });
      assert.match(result.next.description, opening);
      assert.deepEqual(result.next.choices, winter.choices);
      const continued = advanceCampaignTurn(result.state, result.next, 'option_b', scenarios);
      assert.equal(continued.nextScenario.id, 'chancellorsville_maneuver');
      assert.equal(continued.state.currentTurn, 10);

      const loss = { ...staff, result: 'defeat', delegated: false };
      loss.assessment = getBattleAssessment(loss, choiceId);
      const failed = settle(choiceId, loss);
      assert.equal(failed.entry.choiceSucceeded, false);
      assert.deepEqual(failed.entry.metricEffects, { munitions: ammo, publicMorale: -5 });
      assert.match(failed.next.description, /^The Fredericksburg field operation fell short/);
      assert.match(failed.next.choices[0].text, /^Prepare a winter stroke/);
      assert.deepEqual(failed.next.choices.map(order => [order.id, order.effects]), winter.choices.map(order => [order.id, order.effects]));
    }
  });

  await test('the Fredericksburg alias restores an exact battle checkpoint inside turn nine', () => {
    const battle = battleForScenario(field, state, 'option_b');
    const engine = new CivilWarBattleEngine(battle.id, state, 'option_b');
    engine.tick(1);
    const checkpoint = engine.checkpoint();
    const raw = JSON.stringify(createCampaignSnapshot(state, field));
    const values = new Map([[CAMPAIGN_STORAGE_KEY, raw]]);
    const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    const pending = { battle, baseState: state, choiceId: 'option_b' };
    saveFieldCheckpoint(pending, checkpoint, state, storage);
    const restored = loadFieldCheckpoint(storage);
    assert.equal(restored.error, null);
    assert.deepEqual(CivilWarBattleEngine.fromCheckpoint(restored.pending.checkpoint, battle.id, restored.pending.resumeState, 'option_b').checkpoint(), checkpoint);
    saveFieldCheckpoint({ ...pending, baseState: { ...state, scenarioId: winter.id } }, checkpoint, state, storage);
    assert.match(loadFieldCheckpoint(storage).error, /not supported/);
    assert.equal(values.get(CAMPAIGN_STORAGE_KEY), raw);
  });
} finally {
  await vite.close();
  rmSync(cacheDir, { recursive: true, force: true });
}
