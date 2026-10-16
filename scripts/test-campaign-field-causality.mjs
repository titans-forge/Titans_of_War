import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';
import { BATTLE_SCENARIOS, applyBattleResolution, battleChoiceSuccessModifier, delegateBattle } from '../src/game/battles.js';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { getBattleAssessment } from '../src/battle/battleAssessment.js';
import { createCampaignSnapshot, createFreshCampaignState, restoreCampaignFromSnapshot } from '../src/game/campaignStorage.js';
import { advanceCampaignTurn } from '../src/game/headlessCampaign.js';
import { calculateElectionPressure, resolveNextScenario } from '../src/game/simulationEngine.js';
import { createAfterAction } from '../src/game/campaignExperience.js';

// Production scenarios include image imports. This owned SSR instance exposes
// no websocket/listener, changes no source, and is closed after awaited tests.
const cache = mkdtempSync(join(tmpdir(), 'civil-war-field-causality-'));
const vite = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname,
  cacheDir: cache, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'silent' });
try {
  const { STATIC_SCENARIOS } = await vite.ssrLoadModule('/src/game/scenarios.js');
  const scene = id => STATIC_SCENARIOS.find(s => s.id === id);
  const clone = value => JSON.parse(JSON.stringify(value));
  // Earlier history is a declared targeted fixture, not a played campaign.
  const prerequisites = [
    { scenarioId: 'cold_harbor', choiceId: 'option_b' },
    { scenarioId: 'atlanta_election_pressure', choiceId: 'option_b' },
    { scenarioId: 'atlanta_holds_october', choiceId: 'option_b' },
    { scenarioId: 'third_winchester', choiceId: 'option_d' },
  ];
  function stateAt(id, readiness = null, options = {}) {
    const state = createFreshCampaignState(1861, id, { difficulty: 'story', ...options });
    state.currentTurn = scene(id).turn;
    state.actor = scene(id).actor;
    state.roleLabel = scene(id).roleLabel;
    state.divergenceIndex = 0.2;
    if (readiness !== null) state.metrics = Object.fromEntries(Object.keys(state.metrics).map(key => [key, readiness]));
    state.history = id === 'cedar_creek' ? clone(prerequisites) : [];
    return state;
  }
  function finish(state, choiceId, resolution) {
    const before = clone(state);
    const applied = applyBattleResolution(state, resolution);
    assert.deepEqual(state, before, 'the caller state must not be mutated');
    assert.equal(applyBattleResolution(applied, { ...resolution, result: 'rout' }), applied, 'a settled field result cannot be replaced');
    const turn = advanceCampaignTurn(applied, scene(state.scenarioId), choiceId, STATIC_SCENARIOS,
      battleChoiceSuccessModifier(BATTLE_SCENARIOS[state.scenarioId], choiceId, resolution.result));
    turn.state.pendingDebrief = createAfterAction(before, turn.state, turn.historyEntry, turn.nextScenario, applied);
    const restored = restoreCampaignFromSnapshot(clone(createCampaignSnapshot(turn.state, turn.nextScenario || scene(state.scenarioId))), STATIC_SCENARIOS);
    assert.ok(restored, 'the production save validator must accept the field result, director state and debrief');
    assert.deepEqual(restored.state.history, clone(turn.state.history), 'cold restore preserves the complete serialized journal');
    assert.deepEqual(restored.state.pendingDebrief, clone(turn.state.pendingDebrief), 'cold restore preserves the displayed consequence and assessment');
    assert.equal(restored.activeScenario?.id, turn.nextScenario?.id || state.scenarioId);
    assert.deepEqual(calculateElectionPressure(restored.state.history), calculateElectionPressure(turn.state.history));
    return turn;
  }
  const newResult = (id, result) => ({ battleId: id, scenarioId: id, result, score: 60,
    confederateLossRate: 0.2, unionLossRate: 0.2, delegated: false, battleRulesVersion: 18 });

  await test('real delegation produces all five Cedar outcomes with coherent journal, debrief, election and cold restore', () => {
    const observed = new Set();
    for (const readiness of [10, 30, 50, 85]) for (const choiceId of ['option_a', 'option_b', 'option_c', 'option_d']) {
      const state = stateAt('cedar_creek', readiness);
      const field = delegateBattle(state, BATTLE_SCENARIOS.cedar_creek, choiceId);
      observed.add(field.result);
      const turn = finish(state, choiceId, field);
      const entry = turn.historyEntry;
      assert.equal(entry.battleResult.result, field.result);
      assert.equal(entry.battleResult.fieldResultConsequencesVersion, 1);
      const factors = calculateElectionPressure(turn.state.history).factors.filter(f => f.scenarioId === 'cedar_creek');
      if (['defeat', 'rout'].includes(field.result)) {
        assert.equal(entry.choiceSucceeded, false);
        assert.match(entry.consequence, field.result === 'rout' ? /collapses into a rout/ : /ends in a field defeat/);
        for (const resource of ['militaryStrength', 'publicMorale', 'foodSupply']) assert.ok((entry.metricEffects[resource] || 0) <= 0, resource);
        assert.ok(entry.scoreCard.tactical < 0);
        assert.ok(entry.scoreCard.strategic <= 0);
        assert.ok(factors.every(f => f.points < 0));
        assert.equal(turn.nextScenario?.id, 'election_1864_lincoln');
      } else if (['decisive-win', 'costly-win'].includes(field.result)) {
        assert.match(entry.consequence, field.result === 'decisive-win' ? /decisive Confederate victory/ : /limited Confederate victory at heavy cost/);
        assert.ok(entry.metricEffects.publicMorale > 0);
        assert.equal(factors[0].points, field.result === 'decisive-win' ? 3 : 1);
      } else {
        assert.match(entry.consequence, /without the historical rout|rear guard keeps the retreat|withdraws in order/);
        assert.equal(factors[0].points, -1);
        assert.equal(entry.choiceSucceeded, ['option_c', 'option_d'].includes(choiceId));
      }
    }
    assert.deepEqual([...observed].sort(), ['costly-win', 'decisive-win', 'defeat', 'disciplined-withdrawal', 'rout']);
  });

  await test('Cedar hard prerequisites reject field losses even when independent pressure exceeds the threshold', () => {
    // Boundary fixtures exercise the campaign contract for rare field results;
    // they do not claim these synthetic terminal records were played outcomes.
    const expectedRoutes = {
      option_a: { 'decisive-win': 'mcclellan', 'costly-win': 'mcclellan', 'disciplined-withdrawal': 'lincoln', defeat: 'lincoln', rout: 'lincoln' },
      option_b: { 'decisive-win': 'lincoln', 'costly-win': 'lincoln', 'disciplined-withdrawal': 'lincoln', defeat: 'lincoln', rout: 'lincoln' },
      option_c: { 'decisive-win': 'lincoln', 'costly-win': 'lincoln', 'disciplined-withdrawal': 'mcclellan', defeat: 'lincoln', rout: 'lincoln' },
      option_d: { 'decisive-win': 'lincoln', 'costly-win': 'lincoln', 'disciplined-withdrawal': 'lincoln', defeat: 'lincoln', rout: 'lincoln' },
    };
    for (const [choiceId, results] of Object.entries(expectedRoutes)) for (const [result, winner] of Object.entries(results)) {
      const state = stateAt('cedar_creek');
      state.history.push({ scenarioId: 'fall_of_atlanta', choiceId: 'option_d', choiceSucceeded: true });
      const turn = finish(state, choiceId, newResult('cedar_creek', result));
      assert.equal(calculateElectionPressure(turn.state.history).winner, 'mcclellan', 'this fixture isolates the prerequisite gate from the numeric threshold');
      assert.equal(turn.nextScenario?.id, `election_1864_${winner}`, `${choiceId}:${result}`);
    }
  });

  await test('Third Winchester rejects failed preservation credit and labels independent political messaging', () => {
    // Published pre-fix resource commitments remain the adjacent-review
    // preservation boundary; these values are not generated from the helper.
    const publishedEffects = {
      option_a: { militaryStrength: -30, munitions: -20, publicMorale: -5, foodSupply: -18 },
      option_b: { militaryStrength: -10, publicMorale: -15, munitions: -5, foodSupply: -12 },
      option_c: { treasury: -15, publicMorale: 10, foodSupply: -8 },
      option_d: { militaryStrength: -5, munitions: -5, foodSupply: -6, divergenceIndex: 0.2 },
    };
    for (const choiceId of ['option_a', 'option_b', 'option_c', 'option_d']) for (const result of ['decisive-win', 'costly-win', 'disciplined-withdrawal', 'defeat', 'rout']) {
      const turn = finish(stateAt('third_winchester'), choiceId, newResult('third_winchester', result));
      const entry = turn.historyEntry;
      assert.deepEqual(entry.metricEffects, publishedEffects[choiceId], 'result wording and credit must not rebalance Winchester resource commitments');
      const factors = calculateElectionPressure(turn.state.history).factors.filter(f => f.scenarioId === 'third_winchester');
      const fieldFactors = factors.filter(f => !f.label.includes('political messaging'));
      if (['defeat', 'rout'].includes(result)) {
        assert.equal(entry.choiceSucceeded, false);
        assert.ok(fieldFactors.every(f => f.points < 0));
        assert.match(entry.consequence, /ends in a (field defeat|rout)/);
        assert.ok(entry.scoreCard.tactical < 0);
        // The published C strategic card credits the independent messaging
        // action; other failed field missions retain no positive strategy credit.
        if (choiceId === 'option_c') assert.equal(entry.scoreCard.strategic, 2);
        else assert.ok(entry.scoreCard.strategic <= 0);
      }
      if (choiceId === 'option_c') {
        const political = factors.find(f => f.label.includes('political messaging'));
        assert.equal(political.points, 1);
        assert.match(political.label, /independent of the field result/);
      }
      if (choiceId === 'option_d' && result === 'disciplined-withdrawal') {
        assert.equal(fieldFactors[0].points, 2);
        assert.equal(entry.choiceSucceeded, true);
        assert.match(entry.consequence, /preserves the army/);
      }
    }
  });

  await test('fresh default current rules apply the same policy to actual player commands and staff delegation', () => {
    for (const [id, choiceId, policy, expected] of [
      ['cedar_creek', 'option_a', 'advance', 'decisive-win'],
      ['cedar_creek', 'option_c', 'withdraw', 'disciplined-withdrawal'],
      ['third_winchester', 'option_b', 'covered', 'disciplined-withdrawal'],
    ]) {
      const state = stateAt(id);
      const engine = new CivilWarBattleEngine(id, state, choiceId);
      const issued = new Set();
      for (let step = 0; step < 5000 && engine.outcome === 'undecided'; step += 1) {
        for (const unit of engine.state.filter(u => u.side === 'confederate' && u.active)) {
          if (issued.has(unit.id)) continue;
          issued.add(unit.id);
          if (policy !== 'covered') engine.order(unit.id, policy);
        }
        if (policy === 'covered' && (engine.thirdWinchester.rearguardHeld >= engine.config.rearguardHoldRequired
          || engine.thirdWinchester.middleFieldHeld >= engine.config.middleFieldHoldRequired)) {
          for (const unit of engine.state.filter(u => u.side === 'confederate' && u.active)) engine.order(unit.id, 'withdraw');
        }
        engine.tick(0.05);
      }
      const snapshot = engine.snapshot();
      assert.equal(snapshot.outcome, expected, `${id}:${choiceId}:${policy}`);
      const resolution = { battleId: id, scenarioId: id, choiceId, result: snapshot.outcome,
        score: snapshot.score, confederateLossRate: snapshot.confederateLossRate, unionLossRate: snapshot.unionLossRate,
        delegated: false, battleRulesVersion: snapshot.battleRulesVersion, assessment: getBattleAssessment(snapshot, choiceId) };
      const turn = finish(state, choiceId, resolution);
      assert.equal(turn.historyEntry.battleResult.fieldResultConsequencesVersion, 1);
      assert.equal(turn.historyEntry.choiceSucceeded, true);
      assert.equal(turn.state.pendingDebrief.battleResult.assessment.objective.status, 'achieved');
    }
  });

  await test('older rules and unmarked recorded results retain their original story, score and election credit', () => {
    for (const options of [{ rulesVersion: 1, difficulty: 'standard', battleRulesVersion: 1 }, { battleRulesVersion: 17 }]) {
      const state = stateAt('cedar_creek', 50, options);
      const turn = finish(state, 'option_a', { ...newResult('cedar_creek', 'defeat'), battleRulesVersion: options.battleRulesVersion });
      assert.equal(turn.historyEntry.battleResult.fieldResultConsequencesVersion, undefined);
      assert.equal(turn.historyEntry.consequence, scene('cedar_creek').choices[0].consequence);
      assert.equal(turn.historyEntry.choiceSucceeded, null);
      assert.equal(calculateElectionPressure(turn.state.history).score, 11);
      assert.equal(turn.nextScenario.id, 'election_1864_mcclellan');
      const olderSnapshot = clone(createCampaignSnapshot(turn.state, turn.nextScenario));
      olderSnapshot.version = options.rulesVersion === 1 ? 6 : 21;
      const olderRestored = restoreCampaignFromSnapshot(olderSnapshot, STATIC_SCENARIOS);
      assert.ok(olderRestored, `older save envelope ${olderSnapshot.version}`);
      assert.deepEqual(olderRestored.state.history, clone(turn.state.history));
      assert.equal(olderRestored.state.battleRulesVersion, options.battleRulesVersion);
      assert.equal(calculateElectionPressure(olderRestored.state.history).score, 11);
      assert.equal(olderRestored.activeScenario.id, 'election_1864_mcclellan');
    }
    const olderManual = finish(stateAt('cedar_creek'), 'option_a', { ...newResult('cedar_creek', 'defeat'), battleRulesVersion: 17 });
    assert.equal(olderManual.historyEntry.battleResult.fieldResultConsequencesVersion, undefined, 'an older suspended field retains its original campaign contract');
    assert.equal(olderManual.historyEntry.consequence, scene('cedar_creek').choices[0].consequence);
    const legacyState = stateAt('cedar_creek');
    const recorded = { ...newResult('cedar_creek', 'defeat'), title: 'Cedar Creek — Belle Grove at Dawn', completedTurn: 23, tacticalScore: -6 };
    legacyState.battleCampaign.results.cedar_creek = clone(recorded);
    const restoredPending = restoreCampaignFromSnapshot(clone(createCampaignSnapshot(legacyState, scene('cedar_creek'))), STATIC_SCENARIOS);
    assert.deepEqual(restoredPending.state.battleCampaign.results.cedar_creek, recorded);
    const turn = finish(restoredPending.state, 'option_a', recorded);
    const recordedHistory = clone(turn.state.history);
    assert.equal(turn.historyEntry.consequence, scene('cedar_creek').choices[0].consequence);
    assert.equal(calculateElectionPressure(recordedHistory).score, 11);
    assert.equal(turn.nextScenario.id, 'election_1864_mcclellan');
    // The new descriptor accepts unmarked historical A/C entries, even after
    // a cold restore that uses current scenario definitions.
    assert.equal(resolveNextScenario(scene('cedar_creek'), scene('cedar_creek').choices[0], 24,
      STATIC_SCENARIOS, 0.2, turn.state.shards, recordedHistory).id, 'election_1864_mcclellan');
    assert.deepEqual(turn.state.history, recordedHistory);
  });
} finally {
  await vite.close();
  rmSync(cache, { recursive: true, force: true });
}
