import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createServer } from 'vite';
import { getBattleAssessment } from '../src/battle/battleAssessment.js';
import { applyBattleResolution, battleForScenario, delegateBattle, PRACTICE_BATTLES } from '../src/game/battles.js';
import { createAfterAction } from '../src/game/campaignExperience.js';
import { createCampaignSnapshot, createFreshCampaignState, restoreCampaignFromSnapshot } from '../src/game/campaignStorage.js';
import { getCampaignScenario } from '../src/game/campaignSupply.js';
import { advanceCampaignTurn } from '../src/game/headlessCampaign.js';
import { getMapAnnotation } from '../src/game/mapAnnotations.js';
import { forecastCampaignChoice } from '../src/game/simulationEngine.js';

const cacheDir = mkdtempSync(join(tmpdir(), 'civil-war-vicksburg-campaign-'));
const vite = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname, cacheDir,
  server: { middlewareMode: true, ws: false, watch: null }, appType: 'custom', logLevel: 'silent' });

try {
  const { STATIC_SCENARIOS: scenarios } = await vite.ssrLoadModule('/src/game/scenarios.js');
  const find = id => scenarios.find(scene => scene.id === id);
  const aftermath = find('chancellorsville_aftermath');
  const field = find('vicksburg');
  const standardNext = 'gettysburg_campaign_setup';
  const jacksonNext = 'gettysburg_with_jackson_setup';
  const modern = {
    ...createFreshCampaignState(1863, aftermath.id),
    currentTurn: 11,
    metrics: { militaryStrength: 96, munitions: 95, treasury: 90, publicMorale: 89, foodSupply: 74 },
  };
  const advance = (state, scene, order) => advanceCampaignTurn(state, scene, order, scenarios);
  const restore = (state, scene) => restoreCampaignFromSnapshot(
    JSON.parse(JSON.stringify(createCampaignSnapshot(state, scene))), scenarios);
  const entered = choice => advance(modern, aftermath, choice);

  await test('the Vicksburg interlude precedes both Gettysburg paths only once on current rules', () => {
    for (const [order, easternChapter] of [['option_a', standardNext], ['option_b', jacksonNext]]) {
      const arrival = entered(order);
      assert.equal(arrival.nextScenario.id, field.id);
      assert.equal(arrival.state.currentTurn, 12);
      assert.equal(arrival.directorRoute, 'field-interlude');
      assert.equal(restore(arrival.state, field).activeScenario.id, field.id);
      assert.equal(advance({ ...modern, battleRulesVersion: 17 }, aftermath, order).nextScenario.id, easternChapter);
      assert.equal(advance({ ...modern, history: [{ scenarioId: field.id, choiceId: 'option_a' }] }, aftermath, order)
        .nextScenario.id, easternChapter);
    }
  });

  await test('a cabinet crisis before the eastern transition still returns through Vicksburg', () => {
    const lowAlignment = { ...modern.shards, fox: { ...modern.shards.fox, alignment: 2 } };
    const crisis = advance({ ...modern, shards: lowAlignment }, aftermath, 'option_a');
    assert.equal(crisis.nextScenario.crisisFor, 'fox');
    const resumed = advance(crisis.state, crisis.nextScenario, crisis.nextScenario.choices[0].id);
    assert.equal(resumed.nextScenario.id, field.id);
    assert.equal(resumed.state.currentTurn, 12);
    assert.equal(resumed.directorRoute, 'field-interlude');
  });

  await test('briefing, historical context and map represent the same two orders', () => {
    const battle = PRACTICE_BATTLES.vicksburg;
    assert.match(field.description, /surrendered on July 4/);
    assert.equal(field.primerTags[0], 'vicksburg_siege');
    assert.match(field.choices[0].costDescription, /Commits 12 Munitions/);
    assert.match(field.choices[1].costDescription, /Commits 6 Munitions/);
    assert.equal(battle.defaultSelection, 'vicksburg-waul');
    assert.equal(battle.selectionByChoice.option_b, 'vicksburg-battery');
    assert.deepEqual(getMapAnnotation(field.id).labels.map(label => label.text),
      ['RAILROAD REDOUBT', 'INTERIOR LINE', 'SOUTHERN RAILROAD']);
  });

  for (const [order, easternOrder, nextId, outcome, success, failure, opening] of [
    ['option_a', 'option_a', standardNext, 'costly-win', { munitions: -12, publicMorale: 6 },
      { munitions: -12, foodSupply: -4, publicMorale: -8 }, /^The Railroad Redoubt held on May 22/],
    ['option_b', 'option_b', jacksonNext, 'disciplined-withdrawal', { munitions: -6, foodSupply: 6, publicMorale: 2 },
      { munitions: -6, foodSupply: -7, publicMorale: -6 }, /^The guns reached Vicksburg’s inner line/],
  ]) {
    await test(`${order} archives success and failure and restores the correct Gettysburg branch`, () => {
      const state = restore(entered(easternOrder).state, field).state;
      const battle = battleForScenario(field, state, order);
      const choice = field.choices.find(candidate => candidate.id === order);
      const staff = delegateBattle(state, battle, order);
      const forecast = forecastCampaignChoice(state, field, choice);
      assert.equal(staff.result, outcome);
      assert.equal(forecast.successChance, null);
      assert.deepEqual(forecast.outcomes.map(result => result.result), [outcome, 'defeat', 'rout']);

      for (const achieved of [true, false]) {
        const resolution = achieved ? staff : { ...staff, result: 'defeat', delegated: false };
        if (!achieved) resolution.assessment = getBattleAssessment(resolution, order);
        const applied = applyBattleResolution(state, resolution);
        assert.equal(applyBattleResolution(applied, resolution), applied);
        const settled = advance(applied, field, order);
        assert.equal(settled.nextScenario.id, nextId);
        assert.equal(settled.state.currentTurn, 12);
        assert.equal(settled.historyEntry.choiceSucceeded, achieved);
        assert.equal(settled.historyEntry.battleResult.fieldResultConsequencesVersion, 1);
        assert.deepEqual(settled.historyEntry.metricEffects, achieved ? success : failure);
        assert.equal(settled.historyEntry.scoreCard.strategic, achieved ? choice.scoreCard.strategic : -4);
        settled.state.pendingDebrief = createAfterAction(state, settled.state, settled.historyEntry, settled.nextScenario, applied);
        const restored = restore(settled.state, settled.nextScenario);
        assert.equal(restored.activeScenario.id, nextId);
        assert.deepEqual(restored.state.history.at(-1), JSON.parse(JSON.stringify(settled.historyEntry)));
        assert.match(getCampaignScenario(restored.state, restored.activeScenario).description,
          achieved ? opening : /^The order at Vicksburg fell short/);
        assert.equal(battleForScenario(field, restored.state, order), null);
      }
    });
  }
} finally {
  await vite.close();
  rmSync(cacheDir, { recursive: true, force: true });
}
