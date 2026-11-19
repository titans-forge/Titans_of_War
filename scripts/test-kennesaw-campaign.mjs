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

const cacheDir = mkdtempSync(join(tmpdir(), 'civil-war-kennesaw-campaign-'));
const vite = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname, cacheDir,
  server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'silent' });

try {
  const { STATIC_SCENARIOS: scenarios } = await vite.ssrLoadModule('/src/game/scenarios.js');
  const coldHarbor = scenarios.find(scene => scene.id === 'cold_harbor');
  const field = scenarios.find(scene => scene.id === 'kennesaw_mountain');
  const atlanta = scenarios.find(scene => scene.id === 'atlanta_election_pressure');
  const modern = { ...createFreshCampaignState(1864, coldHarbor.id), currentTurn: 18, divergenceIndex: .2,
    metrics: { militaryStrength: 95, munitions: 94, treasury: 90, publicMorale: 90, foodSupply: 72 } };
  const staffAtColdHarbor = delegateBattle(modern, battleForScenario(coldHarbor, modern, 'option_b'), 'option_b');
  const arrived = advanceCampaignTurn(applyBattleResolution(modern, staffAtColdHarbor), coldHarbor, 'option_b', scenarios);
  const state = arrived.state;

  function settle(choiceId, resolution) {
    const applied = applyBattleResolution(state, resolution);
    assert.equal(applyBattleResolution(applied, resolution), applied);
    const turn = advanceCampaignTurn(applied, field, choiceId, scenarios);
    assert.equal(turn.nextScenario.id, atlanta.id);
    assert.equal(turn.state.currentTurn, 19);
    turn.state.pendingDebrief = createAfterAction(state, turn.state, turn.historyEntry, turn.nextScenario, applied);
    const archive = JSON.parse(JSON.stringify(createCampaignSnapshot(turn.state, turn.nextScenario)));
    const restored = restoreCampaignFromSnapshot(archive, scenarios);
    assert.deepEqual(restored.state.history.at(-1), archive.state.history.at(-1));
    return { entry: restored.state.history.at(-1), state: restored.state,
      next: getCampaignScenario(restored.state, restored.activeScenario) };
  }

  await test('Cold Harbor opens the new Atlanta interlude once on current rules', () => {
    assert.equal(arrived.nextScenario.id, field.id);
    assert.equal(arrived.state.currentTurn, 19);
    assert.equal(arrived.directorRoute, 'field-interlude');
    assert.equal(advanceCampaignTurn({ ...modern, battleRulesVersion: 17 }, coldHarbor, 'option_b', scenarios).nextScenario.id, atlanta.id);
    const alreadyPlayed = { ...modern, history: [{ scenarioId: field.id, choiceId: 'option_a' }] };
    assert.equal(advanceCampaignTurn(alreadyPlayed, coldHarbor, 'option_b', scenarios).nextScenario.id, atlanta.id);
  });

  await test('Kennesaw briefing costs and scheme stay attached to their own campaign scene', () => {
    const current = getCampaignScenario(state, field);
    assert.match(current.choices[0].costDescription, /Commits 10 Munitions/);
    assert.match(current.choices[1].costDescription, /Commits 5 Munitions/);
    assert.deepEqual(getMapAnnotation(field.id).labels.map(label => label.text), ['UPPER APPROACH', 'DEAD ANGLE', 'SOUTHERN ROAD']);
    assert.equal(getMapAnnotation(field.id).troops.confederate.label, 'JOHNSTON');
  });

  for (const [id, outcome, won, lost, opening] of [
    ['option_a', 'costly-win', { munitions: -10, foodSupply: 3, publicMorale: 8 },
      { munitions: -10, foodSupply: -5, publicMorale: -7 }, /^The Dead Angle held at Kennesaw Mountain/],
    ['option_b', 'disciplined-withdrawal', { munitions: -5, foodSupply: 9, publicMorale: 1 },
      { munitions: -5, foodSupply: -7, publicMorale: -5 }, /^The covered withdrawal at Kennesaw Mountain saved guns and stores/],
  ]) {
    await test(`${id} settles its field result into Atlanta with the archived evidence`, () => {
      const battle = battleForScenario(field, state, id);
      assert.equal(battle, PRACTICE_BATTLES.kennesaw_mountain);
      const choice = field.choices.find(order => order.id === id);
      const forecast = forecastCampaignChoice(state, field, choice);
      assert.equal(forecast.successChance, null);
      assert.deepEqual(forecast.outcomes.map(result => result.result), [outcome, 'defeat', 'rout']);
      const staff = delegateBattle(state, battle, id);
      assert.equal(staff.result, outcome);
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
      assert.match(defeat.next.description, /^The Kennesaw Mountain order fell short, leaving fewer supplies/);
      assert.deepEqual(defeat.next.choices, getCampaignScenario(state, atlanta).choices);
      assert.ok(defeat.state.metrics.foodSupply < victory.state.metrics.foodSupply);
    });
  }

  await test('campaign and practice checkpoints preserve both missions and the saved campaign', () => {
    const battle = PRACTICE_BATTLES.kennesaw_mountain;
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
