import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createServer } from 'vite';
import { getBattleAssessment } from '../src/battle/battleAssessment.js';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { applyBattleResolution, battleForScenario, delegateBattle } from '../src/game/battles.js';
import { createAfterAction } from '../src/game/campaignExperience.js';
import { CAMPAIGN_STORAGE_KEY, createCampaignSnapshot, createFreshCampaignState, restoreCampaignFromSnapshot } from '../src/game/campaignStorage.js';
import { getCampaignScenario } from '../src/game/campaignSupply.js';
import { loadFieldCheckpoint, saveFieldCheckpoint } from '../src/game/fieldCheckpoint.js';
import { advanceCampaignTurn } from '../src/game/headlessCampaign.js';
import { forecastCampaignChoice, getChoiceAvailability } from '../src/game/simulationEngine.js';

const cacheDir = mkdtempSync(join(tmpdir(), 'civil-war-second-manassas-campaign-'));
const vite = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname, cacheDir,
  server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'silent' });

try {
  const { STATIC_SCENARIOS: scenarios } = await vite.ssrLoadModule('/src/game/scenarios.js');
  const scenario = scenarios.find(scene => scene.id === 'second_manassas');
  const sevenDays = scenarios.find(scene => scene.id === 'seven_days');
  const fresh = createFreshCampaignState(1862, sevenDays.id);
  const arrival = advanceCampaignTurn({ ...fresh, currentTurn: sevenDays.turn,
    metrics: { militaryStrength: 97, munitions: 96, treasury: 94, publicMorale: 95, foodSupply: 96 } },
  sevenDays, 'option_b', scenarios);
  const state = arrival.state;

  function settle(base, choiceId, field) {
    const applied = field ? applyBattleResolution(base, field) : base;
    if (field) assert.equal(applyBattleResolution(applied, field), applied);
    const turn = advanceCampaignTurn(applied, getCampaignScenario(base, scenario), choiceId, scenarios);
    turn.state.pendingDebrief = createAfterAction(base, turn.state, turn.historyEntry, turn.nextScenario, applied);
    const save = createCampaignSnapshot(turn.state, turn.nextScenario);
    const restored = restoreCampaignFromSnapshot(JSON.parse(JSON.stringify(save)), scenarios);
    assert.deepEqual(restored.state.history.at(-1), JSON.parse(JSON.stringify(turn.historyEntry)));
    return { entry: restored.state.history.at(-1), next: getCampaignScenario(restored.state, restored.activeScenario) };
  }

  await test('Second Manassas opens after Seven Days and retains the reconnaissance divergence gate', () => {
    assert.equal(arrival.nextScenario.id, scenario.id);
    const campaign = getCampaignScenario(state, scenario);
    for (const choice of campaign.choices.slice(0, 2)) {
      const battle = battleForScenario(campaign, state, choice.id);
      assert.equal(battle.id, scenario.id);
      const forecast = forecastCampaignChoice(state, campaign, choice);
      assert.equal(forecast.successChance, null);
      assert.deepEqual(forecast.outcomes.map(row => row.result), ['costly-win', 'defeat', 'rout']);
      assert.equal(delegateBattle(state, battle, choice.id).result, 'costly-win');
    }
    const reconnaissance = campaign.choices[1];
    assert.equal(getChoiceAvailability(reconnaissance, campaign, { ...state, divergenceIndex: .40 }).divergenceLocked, false);
    assert.equal(getChoiceAvailability(reconnaissance, campaign, { ...state, divergenceIndex: .41 }).divergenceLocked, true);
  });

  await test('mission evidence reaches Antietam and the alternate Potomac chapter with distinct consequences', () => {
    for (const [choiceId, divergence, title, opening, ammunition, morale] of [
      ['option_a', .02, 'antietam', /^Jackson held the Deep Cut while Longstreet took Chinn Ridge/, -20, 18],
      ['option_b', .26, 'potomac_leverage_campaign', /^Longstreet’s reconnaissance kept the line and reserve intact/, -10, 6],
    ]) {
      const base = { ...state, divergenceIndex: divergence };
      const staff = delegateBattle(base, battleForScenario(scenario, base, choiceId), choiceId);
      const { entry, next } = settle(base, choiceId, staff);
      assert.equal(entry.choiceSucceeded, true);
      assert.deepEqual(entry.metricEffects, { munitions: ammunition, publicMorale: morale });
      assert.equal(entry.battleResult.fieldResultConsequencesVersion, 1);
      assert.equal(next.id, title);
      assert.match(next.description, opening);
      assert.deepEqual(getCampaignScenario({ ...base, history: [entry] }, next), next);

      const unsupported = { ...staff, delegated: false };
      unsupported.assessment = getBattleAssessment(unsupported, choiceId);
      const failed = settle(base, choiceId, unsupported);
      assert.equal(failed.entry.choiceSucceeded, false);
      assert.deepEqual(failed.entry.metricEffects, { munitions: ammunition, publicMorale: -6 });
      assert.match(failed.next.description, /^The Second Manassas field operation fell short/);
    }
  });

  await test('older and narrative choices retain their original resolution and briefing', () => {
    const legacy = { ...state, battleRulesVersion: 17 };
    assert.equal(battleForScenario(scenario, legacy, 'option_a'), null);
    assert.equal(getCampaignScenario(legacy, scenario), scenario);
    const { entry, next } = settle(legacy, 'option_a', null);
    assert.equal(entry.consequence, scenario.choices[0].consequence);
    assert.equal(entry.battleResult, null);
    assert.equal(next.description, scenarios.find(scene => scene.id === next.id).description);
    for (const order of scenario.choices.slice(2)) {
      assert.equal(battleForScenario(scenario, state, order.id), null);
      const narrative = settle(state, order.id, null);
      assert.equal(narrative.entry.consequence, order.consequence);
      assert.equal(narrative.entry.battleResult, null);
    }
  });

  await test('the reconnaissance checkpoint restores the exact engine and rejects a narrative choice', () => {
    const battle = battleForScenario(scenario, state, 'option_b');
    const engine = new CivilWarBattleEngine(battle.id, state, 'option_b');
    engine.tick(1);
    const checkpoint = engine.checkpoint();
    const raw = JSON.stringify(createCampaignSnapshot(state, scenario));
    const values = new Map([[CAMPAIGN_STORAGE_KEY, raw]]);
    const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    const pending = { battle, baseState: state, choiceId: 'option_b' };
    saveFieldCheckpoint(pending, checkpoint, state, storage);
    const restored = loadFieldCheckpoint(storage);
    assert.equal(restored.error, null);
    assert.deepEqual(CivilWarBattleEngine.fromCheckpoint(restored.pending.checkpoint, battle.id, restored.pending.resumeState, 'option_b').checkpoint(), checkpoint);
    saveFieldCheckpoint({ ...pending, choiceId: 'option_d' }, checkpoint, state, storage);
    assert.match(loadFieldCheckpoint(storage).error, /not supported/);
    assert.equal(values.get(CAMPAIGN_STORAGE_KEY), raw);
  });
} finally {
  await vite.close();
  rmSync(cacheDir, { recursive: true, force: true });
}
