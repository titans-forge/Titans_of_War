import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createServer } from 'vite';
import { getBattleAssessment } from '../src/battle/battleAssessment.js';
import { periodStandardFor } from '../src/battle/periodStandards.js';
import { applyBattleResolution, battleForScenario, delegateBattle, PRACTICE_BATTLES } from '../src/game/battles.js';
import { createAfterAction } from '../src/game/campaignExperience.js';
import { createCampaignSnapshot, createFreshCampaignState, restoreCampaignFromSnapshot } from '../src/game/campaignStorage.js';
import { getCampaignScenario } from '../src/game/campaignSupply.js';
import { advanceCampaignTurn } from '../src/game/headlessCampaign.js';
import { getMapAnnotation } from '../src/game/mapAnnotations.js';
import { forecastCampaignChoice } from '../src/game/simulationEngine.js';

const cacheDir = mkdtempSync(join(tmpdir(), 'civil-war-sailors-campaign-'));
const vite = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname, cacheDir,
  server: { middlewareMode: true, ws: false, watch: null }, appType: 'custom', logLevel: 'silent' });
const plain = value => JSON.parse(JSON.stringify(value));

try {
  const { STATIC_SCENARIOS: scenarios } = await vite.ssrLoadModule('/src/game/scenarios.js');
  const find = id => scenarios.find(scene => scene.id === id);
  const richmond = find('richmond_evacuation');
  const field = find('sailors_creek');
  const finale = find('appomattox_decision');
  const modern = {
    ...createFreshCampaignState(1865, richmond.id),
    currentTurn: 27,
    metrics: { militaryStrength: 76, munitions: 75, treasury: 73, publicMorale: 82, foodSupply: 70 },
  };
  const advance = (state, scene, order) => advanceCampaignTurn(state, scene, order, scenarios);
  const restore = (state, scene) => restoreCampaignFromSnapshot(plain(createCampaignSnapshot(state, scene)), scenarios);
  const entered = advance(modern, richmond, 'option_b');

  await test('the current Richmond route enters Sailor’s Creek once and alternate endings stay reachable', () => {
    assert.equal(entered.nextScenario.id, field.id);
    assert.equal(entered.directorRoute, 'field-interlude');
    assert.equal(entered.state.currentTurn, 28);
    assert.equal(restore(entered.state, field).activeScenario.id, field.id);
    assert.equal(advance({ ...modern, battleRulesVersion: 17 }, richmond, 'option_b').nextScenario.id, finale.id);
    assert.equal(advance({ ...modern, history: [{ scenarioId: field.id }] }, richmond, 'option_b').nextScenario.id, finale.id);
    assert.equal(advance({ ...modern, divergenceIndex: .62 }, richmond, 'option_c').nextScenario.id, 'greensboro_convention');
    const independence = {
      ...modern, divergenceIndex: .8, history: [
        { scenarioId: 'shiloh_army_of_tennessee', choiceId: 'option_b' },
        { scenarioId: 'chancellorsville_aftermath', choiceId: 'option_b' },
        { scenarioId: 'gettysburg_with_jackson', choiceId: 'option_a', choiceSucceeded: true },
        { scenarioId: 'atlanta_election_pressure', choiceId: 'option_b' },
        { scenarioId: 'third_winchester', choiceId: 'option_d' },
        { scenarioId: 'election_1864_mcclellan', choiceId: 'option_a' },
      ],
    };
    assert.equal(advance(independence, richmond, 'option_c').nextScenario.id, 'southern_independence_1864');
  });

  await test('the briefing, map and flags support a local mission separate from the hospital', () => {
    const battle = PRACTICE_BATTLES.sailors_creek;
    assert.match(battle.context, /field hospital that treated men from both armies/);
    assert.equal(battle.defaultSelection, 'sailors-kershaw');
    assert.equal(battle.selectionByChoice.option_b, 'sailors-lee');
    assert.deepEqual(getMapAnnotation(field.id).labels.map(label => label.text),
      ['OVERTON–HILLSMAN HOUSE', 'SOUTH BANK', 'WEST ROAD', 'AID STAGING']);
    assert.equal(periodStandardFor('union', battle.id).stars, 35);
    assert.equal(periodStandardFor('confederate', battle.id).pattern, 'anv');
  });

  for (const [order, outcome, success, failure, opening] of [
    ['option_a', 'costly-win', { munitions: -5, publicMorale: 4 },
      { munitions: -5, publicMorale: -4 }, /^A local screen at Sailor’s Creek kept the aid route open/],
    ['option_b', 'disciplined-withdrawal', { munitions: -3, foodSupply: 4, publicMorale: 2 },
      { munitions: -3, foodSupply: -4, publicMorale: -6 }, /^Some formations escaped Sailor’s Creek in order/],
  ]) {
    await test(`${order} archives victory and defeat before a single Appomattox decision`, () => {
      const state = restore(entered.state, field).state;
      const choice = field.choices.find(candidate => candidate.id === order);
      const battle = battleForScenario(field, state, order);
      const staff = delegateBattle(state, battle, order);
      assert.equal(staff.result, outcome);
      const forecast = forecastCampaignChoice(state, field, choice);
      assert.equal(forecast.successChance, null);
      assert.deepEqual(forecast.outcomes.map(row => row.result), [outcome, 'defeat', 'rout']);
      assert.ok(forecast.outcomes.every(row => !row.gameOver));

      for (const achieved of [true, false]) {
        const resolution = achieved ? staff : { ...staff, result: 'defeat', delegated: false };
        if (!achieved) resolution.assessment = getBattleAssessment(resolution, order);
        const applied = applyBattleResolution(state, resolution);
        assert.equal(applyBattleResolution(applied, resolution), applied);
        const settled = advance(applied, field, order);
        assert.equal(settled.state.gameOver, false);
        assert.equal(settled.nextScenario.id, finale.id);
        assert.equal(settled.state.currentTurn, 28);
        assert.equal(settled.historyEntry.choiceSucceeded, achieved);
        assert.equal(settled.historyEntry.battleResult.fieldResultConsequencesVersion, 1);
        assert.deepEqual(settled.historyEntry.metricEffects, achieved ? success : failure);
        settled.state.pendingDebrief = createAfterAction(state, settled.state, settled.historyEntry, settled.nextScenario, applied);
        const restored = restore(settled.state, settled.nextScenario);
        assert.deepEqual(restored.state.history.at(-1), plain(settled.historyEntry));
        assert.match(getCampaignScenario(restored.state, restored.activeScenario).description,
          achieved ? opening : /^The local order fell short at Sailor’s Creek/);
        assert.equal(battleForScenario(field, restored.state, order), null);
        const concluded = advance(restored.state, finale, 'option_b');
        assert.equal(concluded.state.gameOver, true);
        assert.equal(concluded.nextScenario, null);
        assert.equal(concluded.state.history.filter(entry => entry.scenarioId === finale.id).length, 1);
      }
    });
  }

  await test('a depleted rear guard rout carries the actual losses to settlement even across old turn offsets', () => {
    const order = 'option_b';
    const choice = field.choices.find(candidate => candidate.id === order);
    for (const currentTurn of [27, 28]) {
      const state = { ...entered.state, currentTurn,
        metrics: { militaryStrength: 11, munitions: 0, treasury: 0, publicMorale: 11, foodSupply: 6 } };
      const battle = battleForScenario(field, state, order);
      const staff = delegateBattle(state, battle, order);
      assert.equal(staff.result, 'rout');
      assert.equal(forecastCampaignChoice(state, field, choice).possibleCollapse, false);
      const settled = advance(applyBattleResolution(state, staff), field, order);
      assert.equal(settled.state.currentTurn, currentTurn);
      assert.equal(settled.state.gameOver, false);
      assert.equal(settled.historyEntry.battleResult.result, 'rout');
      assert.ok(settled.state.metrics.publicMorale <= 10);
      assert.ok(settled.state.metrics.foodSupply <= 5);
      assert.equal(settled.nextScenario.id, finale.id);
      assert.equal(advance(settled.state, finale, 'option_b').state.gameOver, true);
    }
  });
} finally {
  await vite.close();
  rmSync(cacheDir, { recursive: true, force: true });
}
