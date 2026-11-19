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
import { getCampaignScenario } from '../src/game/campaignSupply.js';
import { createCampaignSnapshot, createFreshCampaignState, restoreCampaignFromSnapshot } from '../src/game/campaignStorage.js';
import { advanceCampaignTurn } from '../src/game/headlessCampaign.js';
import { usesAssessedFieldConsequences } from '../src/game/fieldResultConsequences.js';
import { forecastCampaignChoice } from '../src/game/simulationEngine.js';

const cacheDir = mkdtempSync(join(tmpdir(), 'civil-war-antietam-settlement-'));
const vite = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname,
  cacheDir, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'silent' });

try {
  const { STATIC_SCENARIOS: scenarios } = await vite.ssrLoadModule('/src/game/scenarios.js');
  const { buildCampaignChronicle } = await vite.ssrLoadModule('/src/game/chronicleExporter.js');
  const antietam = scenarios.find(scenario => scenario.id === 'antietam');
  const emancipation = scenarios.find(scenario => scenario.id === 'emancipation_cabinet_debate');
  const state = { ...createFreshCampaignState(1862, antietam.id), currentTurn: antietam.turn };

  function play(choiceId, withdraw = false) {
    const engine = new CivilWarBattleEngine(antietam.id, state, choiceId);
    if (withdraw) {
      for (const unit of engine.state.filter(unit => unit.side === 'confederate' && unit.active)) {
        assert.equal(engine.order(unit.id, 'withdraw'), true);
      }
    }
    let reserveOrdered = false;
    for (let frame = 0; frame < 2100 && engine.outcome === 'undecided'; frame++) {
      if (withdraw && !reserveOrdered && engine.state.find(unit => unit.id === 'antietam-light-division').active) {
        assert.equal(engine.order('antietam-light-division', 'withdraw'), true);
        reserveOrdered = true;
      }
      engine.tick(.05);
    }
    assert.notEqual(engine.outcome, 'undecided');
    const snapshot = engine.snapshot();
    return { battleId: antietam.id, scenarioId: antietam.id, choiceId,
      battleRulesVersion: snapshot.battleRulesVersion, result: snapshot.outcome, score: snapshot.score,
      assessment: getBattleAssessment(snapshot, choiceId), delegated: false,
      confederateLossRate: snapshot.confederateLossRate, unionLossRate: snapshot.unionLossRate };
  }

  function settle(choiceId, field, base = state) {
    const applied = field ? applyBattleResolution(base, field) : base;
    if (field) assert.equal(applyBattleResolution(applied, field), applied);
    const turn = advanceCampaignTurn(applied, getCampaignScenario(base, antietam), choiceId, scenarios);
    assert.equal(turn.nextScenario?.id, emancipation.id);
    assert.equal(getCampaignScenario(turn.state, turn.nextScenario), turn.nextScenario);
    turn.state.pendingDebrief = createAfterAction(base, turn.state, turn.historyEntry, turn.nextScenario, applied);
    const save = createCampaignSnapshot(turn.state, turn.nextScenario);
    const restored = restoreCampaignFromSnapshot(JSON.parse(JSON.stringify(save)), scenarios);
    assert.ok(restored);
    assert.deepEqual(restored.state.pendingDebrief, JSON.parse(JSON.stringify(turn.state.pendingDebrief)));
    const entry = restored.state.history.at(-1);
    const { markdown } = buildCampaignChronicle(restored.state, { scenarios, includeMediaEmbeds: false });
    return { entry, markdown, followup: getCampaignScenario(restored.state, restored.activeScenario) };
  }

  await test('Antietam stand firm settles the played defense rather than an authored tactical loss', () => {
    const held = play('option_a');
    assert.equal(held.result, 'costly-win');
    const { entry, markdown, followup } = settle('option_a', held);
    assert.equal(entry.battleResult.fieldResultConsequencesVersion, 1);
    assert.equal(entry.choiceSucceeded, true);
    assert.deepEqual(entry.metricEffects, { munitions: -25 });
    assert.deepEqual(entry.scoreCard, { tactical: 7, strategic: -10 });
    assert.match(markdown, /Field verdict\*\*: Limited Confederate victory/);
    assert.match(markdown, /Selected mission\*\*: Achieved/);
    assert.doesNotMatch(markdown, /Tactical Dice Roll/);
    assert.match(followup.description, /^The Confederate line held the Bloody Lane.*Lincoln returns/);

    const abandoned = play('option_a', true);
    const failure = settle('option_a', abandoned);
    assert.equal(failure.entry.choiceSucceeded, false);
    assert.deepEqual(failure.entry.metricEffects, { munitions: -25 });
    assert.deepEqual(failure.entry.scoreCard, { tactical: -6, strategic: -10 });
    assert.match(failure.markdown, /Selected mission\*\*: Incomplete/);
    assert.match(failure.followup.description, /^The Confederate operation at Antietam ended in defeat/);
  });

  await test('treasury and strategic credit require an organized Antietam withdrawal', () => {
    const organized = play('option_b', true);
    assert.equal(organized.result, 'disciplined-withdrawal');
    const recovered = settle('option_b', organized);
    assert.equal(recovered.entry.choiceSucceeded, true);
    assert.deepEqual(recovered.entry.metricEffects, { publicMorale: -20, treasury: 5 });
    assert.deepEqual(recovered.entry.scoreCard, { tactical: 15, strategic: 7 });
    assert.match(recovered.followup.description, /^The Confederate army has withdrawn from Antietam in order/);

    const idle = settle('option_b', play('option_b'));
    assert.equal(idle.entry.choiceSucceeded, false);
    assert.deepEqual(idle.entry.metricEffects, { publicMorale: -20 });
    assert.deepEqual(idle.entry.scoreCard, { tactical: -6, strategic: 0 });
    assert.doesNotMatch(idle.followup.description, /withdrawn from Antietam in order/);
  });

  await test('staff estimates and forecasts honor the two distinct Antietam mission verdicts', () => {
    for (const [choiceId, result] of [['option_a', 'costly-win'], ['option_b', 'disciplined-withdrawal']]) {
      const choice = antietam.choices.find(choice => choice.id === choiceId);
      const battle = battleForScenario(antietam, state, choiceId);
      const estimate = delegateBattle(state, battle, choiceId);
      assert.equal(estimate.result, result);
      const { entry, markdown } = settle(choiceId, estimate);
      assert.equal(entry.battleResult.assessment.source, 'delegated');
      assert.equal(entry.choiceSucceeded, true);
      assert.match(markdown, /Staff estimate\*\*:/);
      const forecast = forecastCampaignChoice(state, antietam, choice);
      assert.deepEqual(forecast.outcomes.map(outcome => outcome.result), [result, 'defeat', 'rout']);
    }
  });

  await test('Antietam legacy and C/D choices retain authored consequences and reject practice results', () => {
    const legacy = { ...state, battleRulesVersion: 17 };
    assert.equal(usesAssessedFieldConsequences(legacy, antietam.id, 'option_a'), false);
    assert.equal(getCampaignScenario(legacy, antietam), antietam);
    const historicalOrder = antietam.choices[0];
    for (const [base, field] of [[legacy, null], [state, null]]) {
      const { entry, followup } = settle(historicalOrder.id, field, base);
      assert.equal(entry.consequence, historicalOrder.consequence);
      assert.deepEqual(entry.metricEffects, historicalOrder.effects.metrics);
      assert.equal(followup.description, emancipation.description);
    }
    const oldResult = { ...play('option_a'), battleRulesVersion: 17 };
    const replayedLegacy = settle('option_a', oldResult);
    assert.equal(replayedLegacy.entry.battleResult?.fieldResultConsequencesVersion, undefined);
    assert.equal(replayedLegacy.entry.consequence, historicalOrder.consequence);
    assert.equal(replayedLegacy.followup.description, emancipation.description);
    for (const authored of antietam.choices.slice(2)) {
      assert.equal(usesAssessedFieldConsequences(state, antietam.id, authored.id), false);
      assert.equal(getCampaignScenario(state, antietam).choices.find(choice => choice.id === authored.id), authored);
      const rejected = applyBattleResolution(state, { battleId: antietam.id, scenarioId: antietam.id,
        choiceId: authored.id, battleRulesVersion: 18, result: 'costly-win' });
      assert.equal(rejected, state);
      const { entry, followup } = settle(authored.id, null);
      assert.equal(entry.consequence, authored.consequence);
      assert.deepEqual(entry.metricEffects, authored.effects.metrics);
      assert.equal(followup.description, emancipation.description);
    }
  });
} finally {
  await vite.close();
  rmSync(cacheDir, { recursive: true, force: true });
}
