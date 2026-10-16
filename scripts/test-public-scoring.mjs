import assert from 'node:assert/strict';
import { createServer } from 'vite';
import {
  HISTORY_SCORE_CARD_VERSION,
  calculateCampaignScore,
  choiceScoreCard,
  gradeForReportCard,
  gradeForStability,
  resolveChoiceScoreCard,
} from '../src/game/simulationEngine.js';
import { createFreshCampaignState } from '../src/game/campaignStorage.js';
import {
  DEFAULT_MAX_DECISIONS,
  buildHistoryEntry,
  runHeadlessCampaign,
  runHeadlessCampaignAsync,
} from '../src/game/headlessCampaign.js';
import { applyBattleResolution } from '../src/game/battles.js';
import {
  benchmarkContestant,
  createContestants,
  formatMarkdown,
  formatTable,
  parseArgs,
} from './benchmark-engine.mjs';

const fresh = createFreshCampaignState(1861, 'manassas_battlefield');
const manassasEntry = {
  scenarioId: 'manassas_battlefield', choiceId: 'option_b', scenarioRoleLabel: 'Army Commander',
};
assert.deepEqual(resolveChoiceScoreCard('manassas_battlefield', { id: 'option_b' }), { tactical: 12, strategic: 5 });
assert.deepEqual(resolveChoiceScoreCard('manassas_battlefield', {
  id: 'option_b', scoreCard: { tactical: 0 },
}, { tacticalScore: 3 }), { tactical: 3, strategic: 5 }, 'inline zero overrides tactics, not strategy');
assert.deepEqual(resolveChoiceScoreCard('manassas_battlefield', {
  id: 'option_b', scoreCard: { strategic: -7 },
}, { tacticalScore: 3 }), { tactical: 15, strategic: -7 }, 'partial inline strategy retains override tactics');
assert.deepEqual(resolveChoiceScoreCard('custom', { id: 'a', scoreCard: { strategic: 4 } }, { tacticalScore: -6 }),
  { tactical: -6, strategic: 4 });

const legacy = { ...manassasEntry, scoreCard: { tactical: 3 }, battleResult: { tacticalScore: 3 } };
const legacyBefore = structuredClone(legacy);
assert.deepEqual(choiceScoreCard(legacy), { tactical: 15, strategic: 5 });
assert.deepEqual(choiceScoreCard(legacy), { tactical: 15, strategic: 5 }, 'repeated lookup must be idempotent');
assert.deepEqual(legacy, legacyBefore, 'lookup migration must not mutate saved history');
assert.deepEqual(choiceScoreCard({ ...legacy, scoreCard: null }), { tactical: 15, strategic: 5 });
assert.deepEqual(choiceScoreCard({ ...legacy, scoreCard: { tactical: 15, strategic: 5 } }), { tactical: 15, strategic: 5 });
assert.deepEqual(choiceScoreCard({ ...legacy, scoreCard: { tactical: 23, strategic: -2 } }), { tactical: 23, strategic: -2 },
  'legacy inline/computed values must not be overwritten or receive another bonus');
assert.deepEqual(choiceScoreCard({ ...legacy, scoreCard: { tactical: 3, strategic: 0 }, scoreCardVersion: HISTORY_SCORE_CARD_VERSION }),
  { tactical: 3, strategic: 0 }, 'versioned cards preserve explicit zero overrides');
assert.deepEqual(choiceScoreCard({ ...manassasEntry, scoreCard: { strategic: 0 } }), { tactical: 12, strategic: 0 });

const resourceState = { ...fresh, metrics: { militaryStrength: 50, munitions: 50, treasury: 50, foodSupply: 50, publicMorale: 50 } };
const beforeBattle = calculateCampaignScore({ ...resourceState, history: [manassasEntry] });
const afterBattle = calculateCampaignScore({ ...resourceState, history: [legacy] });
assert.ok(afterBattle.reportCards.tacticalSmarts.score > beforeBattle.reportCards.tacticalSmarts.score);
assert.equal(afterBattle.reportCards.strategicBrilliance.score, beforeBattle.reportCards.strategicBrilliance.score);
assert.deepEqual(afterBattle, calculateCampaignScore({
  ...resourceState, history: [{ ...legacy, scoreCard: { tactical: 15, strategic: 5 }, scoreCardVersion: HISTORY_SCORE_CARD_VERSION }],
}), 'legacy and new cards must produce identical campaign grades');

for (const resource of [0, 20, 50, 100]) {
  for (const divergenceIndex of [0, 0.5, 1]) {
    const score = calculateCampaignScore({
      ...fresh, gameOver: true, divergenceIndex,
      metrics: Object.fromEntries(Object.keys(resourceState.metrics).map((key) => [key, resource])),
    });
    assert.equal(score.commandScore, Math.round((score.reportCards.tacticalSmarts.score * 350 + score.reportCards.strategicBrilliance.score * 400) / 750));
    assert.ok(score.commandScore >= 0 && score.commandScore <= 100);
    assert.equal(score.commandGrade, gradeForReportCard(score.commandScore));
    assert.equal(score.total, score.breakdown.reduce((sum, item) => sum + item.points, 0));
    assert.equal(score.grade, gradeForStability(score.total));
  }
}
const excellentDivergence = calculateCampaignScore({
  ...fresh, gameOver: true, divergenceIndex: 1,
  metrics: Object.fromEntries(Object.keys(resourceState.metrics).map((key) => [key, 100])),
  history: [{ ...manassasEntry, scoreCard: { tactical: 40, strategic: 40 } }],
});
assert.equal(excellentDivergence.commandScore, 100);
assert.equal(excellentDivergence.commandGrade, 'A');
assert.equal(excellentDivergence.reportCards.timelineFidelity.grade, 'F');
assert.equal(excellentDivergence.total, 750);
assert.equal(excellentDivergence.grade, 'C', 'historical composite fields remain compatible');

const noEndingYet = calculateCampaignScore({ ...fresh, currentTurn: 28 });
assert.equal(noEndingYet.campaignConcluded, false);
assert.equal(noEndingYet.survived, false);
assert.equal(noEndingYet.endingClass, 'Campaign In Progress');

// Independent expected judgments cover every tactical choice, including penalties.
const authoredCards = {
  manassas_battlefield: [[-4, 2], [12, 5], [-12, -8], [3, 1]],
  shiloh_army_of_tennessee: [[-9, -4], [14, 8], [0, 6], [3, 10]],
  chancellorsville_maneuver: [[15, 8], [6, -2], [9, 7], [-7, -4]],
  wilderness_opening: [[-25, -16], [20, 8], [-12, -6], [-5, -3]],
  cedar_creek: [[18, 17], [-17, -13], [11, 9], [13, 7]],
  gettysburg_decision: [[-22, -14], [17, 10], [9, 4], [1, 2]],
  gettysburg_with_jackson: [[4, 3], [16, 11], [0, 8], [6, 5]],
  chickamauga: [[-9, -5], [16, 8], [-3, -2], [6, 11]],
  cold_harbor: [[-10, -4], [15, 10], [0, 8], [9, 12]],
  petersburg_siege: [[11, 5], [10, 5], [8, 7], [7, 6]],
  third_winchester: [[-20, -14], [7, -2], [0, 2], [11, 5]],
};
const bonuses = { 'decisive-win': 12, 'costly-win': 7, 'disciplined-withdrawal': 3, defeat: -6, rout: -12 };

const options = parseArgs([]);
assert.equal(DEFAULT_MAX_DECISIONS, 80);
assert.equal(options.maxTurns, DEFAULT_MAX_DECISIONS);
assert.equal(parseArgs(['--max-turns', '1']).maxTurns, 1);
assert.equal(parseArgs(['--max-decisions', '100']).maxTurns, 100);
for (const value of ['0', '-1', '1.5', '80oops', 'NaN', 'Infinity']) {
  assert.throws(() => parseArgs(['--max-turns', value]), /positive integer/);
}
assert.throws(() => parseArgs(['--max-turns']), /positive integer/);

const safeEffects = { metrics: { militaryStrength: 10, munitions: 10, treasury: 10, foodSupply: 10, publicMorale: 10 } };
const longScenarios = Array.from({ length: 35 }, (_, index) => ({
  id: `interlude_${index}`, turn: 1, interlude: true, endsCampaign: index === 34,
  choices: [{ id: 'continue', next: index < 34 ? `interlude_${index + 1}` : undefined, effects: safeEffects }],
}));
const fullSync = runHeadlessCampaign({ scenarios: longScenarios });
const fullAsync = await runHeadlessCampaignAsync({ scenarios: longScenarios });
assert.deepEqual(fullSync, fullAsync);
assert.equal(fullSync.decisionsMade, 35);
assert.equal(fullSync.chronologicalStage, 1, 'interlude decisions must not be confused with stages');
assert.equal(fullSync.endingReached, true);
assert.equal(fullSync.stopReason, 'ending-reached');
assert.equal(fullSync.campaignScore.decisionsMade, 35);
assert.equal(fullSync.campaignScore.survived, true);
for (const run of [runHeadlessCampaign, runHeadlessCampaignAsync]) {
  const capped = await run({ scenarios: longScenarios, maxTurns: 28 });
  assert.equal(capped.stopReason, 'decision-cap');
  assert.equal(capped.capped, true);
  assert.equal(capped.endingReached, false);
  assert.equal(capped.campaignScore.survived, false);
  const exactEnding = await run({ scenarios: longScenarios, maxTurns: 35 });
  assert.equal(exactEnding.capped, false, 'ending at the cap takes precedence over capping');
  assert.equal(exactEnding.stopReason, 'ending-reached');
  const stopped = await run({ scenarios: longScenarios, chooseChoice: () => null });
  assert.equal(stopped.stopReason, 'no-choice');
  assert.equal(stopped.capped, false);
  const resumed = await run({ scenarios: longScenarios, initialState: fullSync.finalState });
  assert.equal(resumed.decisionsMade, 0);
  assert.equal(resumed.endingReached, true);
  const missingNext = await run({ scenarios: [{ id: 'only', turn: 1, choices: [{ id: 'next', effects: safeEffects }] }] });
  assert.equal(missingNext.stopReason, 'no-scenario');
  assert.equal(missingNext.endingReached, false);
  assert.equal(missingNext.capped, false);
  const finalStages = [27, 28].map((turn) => ({ id: `stage_${turn}`, turn, choices: [{ id: 'next', effects: safeEffects }] }));
  const beforeFinalDecision = await run({
    scenarios: finalStages, initialState: { ...fresh, scenarioId: 'stage_27', currentTurn: 27 }, maxTurns: 1,
  });
  assert.equal(beforeFinalDecision.chronologicalStage, 28);
  assert.equal(beforeFinalDecision.stopReason, 'decision-cap');
  assert.equal(beforeFinalDecision.campaignScore.survived, false, 'arriving at stage 28 is not a completed campaign');
  await assert.rejects(async () => run({ scenarios: longScenarios, maxTurns: -1 }), /positive integer/);
}

const contestant = { label: 'fixture', type: 'policy', chooseChoice: ({ scenario }) => scenario.choices[0].id };
const cappedBenchmark = await benchmarkContestant(contestant, longScenarios, [1861], 1);
assert.deepEqual(cappedBenchmark.outcomeCounts, { survived: 0, defeat: 0, capped: 1, incomplete: 0 });
assert.equal(cappedBenchmark.survivalRate, null);
assert.equal(cappedBenchmark.runs[0].endingClass, 'Campaign In Progress');
const endedBenchmark = await benchmarkContestant(contestant, longScenarios, [1861], 35);
assert.deepEqual(endedBenchmark.outcomeCounts, { survived: 1, defeat: 0, capped: 0, incomplete: 0 });
assert.equal(endedBenchmark.survivalRate, 1);
const defeatScenarios = [{ id: 'defeat', turn: 1, choices: [{ id: 'lose', effects: { metrics: { militaryStrength: -100 } } }] }];
const defeatedBenchmark = await benchmarkContestant(contestant, defeatScenarios, [1861]);
assert.deepEqual(defeatedBenchmark.outcomeCounts, { survived: 0, defeat: 1, capped: 0, incomplete: 0 });
assert.equal(defeatedBenchmark.survivalRate, 0);
assert.equal(defeatedBenchmark.runs[0].stopReason, 'ending-reached');
const incompleteBenchmark = await benchmarkContestant({ ...contestant, chooseChoice: () => null }, longScenarios, [1861]);
assert.deepEqual(incompleteBenchmark.outcomeCounts, { survived: 0, defeat: 0, capped: 0, incomplete: 1 });
assert.equal(incompleteBenchmark.survivalRate, null);
const mixedScenarios = [{
  id: 'mixed', turn: 1, interlude: true,
  choices: [
    { id: 'finish', endsCampaign: true, effects: safeEffects },
    { id: 'lose', effects: { metrics: { militaryStrength: -100 } } },
    { id: 'wait', next: 'mixed', effects: safeEffects },
  ],
}];
const mixedBenchmark = await benchmarkContestant({
  ...contestant, chooseChoice: ({ state }) => ({ 1861: 'finish', 1862: 'lose', 1863: 'wait' }[state.seed] || null),
}, mixedScenarios, [1861, 1862, 1863, 1864], 1);
assert.deepEqual(mixedBenchmark.outcomeCounts, { survived: 1, defeat: 1, capped: 1, incomplete: 1 });
assert.equal(mixedBenchmark.survivalRate, 0.5, 'only the two actual endings belong in the survival denominator');
assert.equal(mixedBenchmark.survivalRateDenominator, 'ended-runs');
assert.equal(mixedBenchmark.endingRate, 0.5);
assert.equal(mixedBenchmark.defeatRate, 0.25);
assert.equal(mixedBenchmark.cappedRate, 0.25);
assert.equal(mixedBenchmark.incompleteRate, 0.25);
for (const formatted of [formatTable([cappedBenchmark], options), formatMarkdown([cappedBenchmark], options, 'test')]) {
  assert.match(formatted, /Capped/);
  assert.match(formatted, /Defeat/);
  assert.match(formatted, /Incomplete/);
  assert.match(formatted, /n\/a/);
  assert.match(formatted, /ended runs only/);
}

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  const { STATIC_SCENARIOS } = await vite.ssrLoadModule('/src/game/scenarios.js');
  // Preserve the original 440 authored merges on the rule contract under which
  // they were published. New result causality has a separate literal matrix.
  const legacyFieldFixture = createFreshCampaignState(1861, 'manassas_battlefield', { rulesVersion: 2, battleRulesVersion: 17 });
  let checkedChoices = 0;
  for (const [scenarioId, cards] of Object.entries(authoredCards)) {
    const scenario = STATIC_SCENARIOS.find((entry) => entry.id === scenarioId);
    for (const [index, [tactical, strategic]] of cards.entries()) {
      const choice = scenario.choices.find((entry) => entry.id === `option_${'abcd'[index]}`);
      checkedChoices += 1;
      assert.deepEqual(resolveChoiceScoreCard(scenarioId, choice), { tactical, strategic }, `${scenarioId}:${choice.id}`);
      for (const [result, bonus] of Object.entries(bonuses)) {
        for (const source of ['manual', 'delegated']) {
          const battleState = applyBattleResolution(legacyFieldFixture, { scenarioId, result, source });
          const entry = buildHistoryEntry(battleState, scenario, choice, { shards: fresh.shards });
          assert.equal(entry.battleResult.fieldResultConsequencesVersion, undefined, 'legacy rule 17 merges remain unmarked');
          assert.deepEqual(entry.scoreCard, { tactical: tactical + bonus, strategic }, `${scenarioId}:${choice.id}:${result}:${source}`);
          assert.deepEqual(choiceScoreCard(entry), entry.scoreCard);
          const restored = JSON.parse(JSON.stringify(entry));
          assert.deepEqual(choiceScoreCard(restored), entry.scoreCard, 'serialized cards must not double-add');
          const oldEntry = { ...entry, scoreCardVersion: undefined, scoreCard: { ...choice.scoreCard, tactical: (choice.scoreCard?.tactical || 0) + bonus } };
          assert.deepEqual(choiceScoreCard(oldEntry), entry.scoreCard, 'legacy tactical cards must recover authored strategy and tactics');
        }
      }
    }
  }
  assert.equal(checkedChoices, 44);

  // Independently judged current cards. Each literal separates an actual
  // field result from the selected mission: an attack that withdraws earns no
  // victory bonus; a withdrawal mission that wins the field receives the field
  // bonus but no authored withdrawal credit. Winchester C's strategy 2 is its
  // independent messaging action. Neither this table nor its expectations use
  // the production consequence helper or regenerate authored judgments.
  const currentCausalCards = {
    cedar_creek: {
      option_a: { 'decisive-win': [30, 17], 'costly-win': [25, 17], 'disciplined-withdrawal': [3, 0], defeat: [-6, 0], rout: [-12, 0] },
      option_b: { 'decisive-win': [-5, -13], 'costly-win': [-10, -13], 'disciplined-withdrawal': [-14, -13], defeat: [-23, -13], rout: [-29, -13] },
      option_c: { 'decisive-win': [12, 0], 'costly-win': [7, 0], 'disciplined-withdrawal': [14, 9], defeat: [-6, 0], rout: [-12, 0] },
      option_d: { 'decisive-win': [12, 0], 'costly-win': [7, 0], 'disciplined-withdrawal': [16, 7], defeat: [-6, 0], rout: [-12, 0] },
    },
    third_winchester: {
      option_a: { 'decisive-win': [-8, -14], 'costly-win': [-13, -14], 'disciplined-withdrawal': [-17, -14], defeat: [-26, -14], rout: [-32, -14] },
      option_b: { 'decisive-win': [12, -2], 'costly-win': [7, -2], 'disciplined-withdrawal': [10, -2], defeat: [-6, -2], rout: [-12, -2] },
      option_c: { 'decisive-win': [12, 2], 'costly-win': [7, 2], 'disciplined-withdrawal': [3, 2], defeat: [-6, 2], rout: [-12, 2] },
      option_d: { 'decisive-win': [12, 0], 'costly-win': [7, 0], 'disciplined-withdrawal': [14, 5], defeat: [-6, 0], rout: [-12, 0] },
    },
  };
  let checkedCurrentMerges = 0;
  for (const [scenarioId, choices] of Object.entries(currentCausalCards)) {
    const scenario = STATIC_SCENARIOS.find(entry => entry.id === scenarioId);
    const currentFieldFixture = createFreshCampaignState(1861, scenarioId);
    assert.equal(currentFieldFixture.rulesVersion, 2);
    assert.equal(currentFieldFixture.battleRulesVersion, 18);
    for (const [choiceId, outcomes] of Object.entries(choices)) {
      const choice = scenario.choices.find(entry => entry.id === choiceId);
      assert.ok(choice);
      for (const [result, [tactical, strategic]] of Object.entries(outcomes)) for (const source of ['manual', 'delegated']) {
        const resolution = { scenarioId, result, source };
        const battleState = applyBattleResolution(currentFieldFixture, resolution);
        assert.equal(applyBattleResolution(battleState, { ...resolution, result: 'rout' }), battleState, 'a current settled result cannot be replaced');
        const entry = buildHistoryEntry(battleState, scenario, choice, { shards: currentFieldFixture.shards });
        const expected = { tactical, strategic };
        assert.equal(entry.battleResult.fieldResultConsequencesVersion, 1, 'fresh current scoped results must opt in');
        assert.deepEqual(entry.scoreCard, expected, `${scenarioId}:${choiceId}:${result}:${source}:current`);
        const beforeLookup = JSON.stringify(entry);
        assert.deepEqual(choiceScoreCard(entry), expected);
        assert.deepEqual(choiceScoreCard(entry), expected, 'repeated current lookup must not add field credit twice');
        assert.equal(JSON.stringify(entry), beforeLookup, 'current lookup must not mutate stored history');
        const restored = JSON.parse(beforeLookup);
        assert.deepEqual(choiceScoreCard(restored), expected, 'serialized current cards preserve the judged result');
        assert.deepEqual(choiceScoreCard(restored), expected, 'serialized current lookup remains idempotent');
        checkedCurrentMerges += 1;
      }
    }
  }
  assert.equal(checkedCurrentMerges, 80);
  const results = [];
  for (const policy of createContestants(options)) {
    const result = await benchmarkContestant(policy, STATIC_SCENARIOS, [1861, 1862, 1863, 1864, 1865]);
    assert.equal(result.cappedRate, 0, `${policy.label} default must reach actual endings`);
    assert.equal(result.incompleteRate, 0);
    assert.equal(result.endingRate, 1);
    assert.ok(result.runs.every((run) => run.endingReached && run.stopReason === 'ending-reached'));
    results.push(result);
  }
  console.log(formatTable(results, { ...options, seeds: [1861, 1862, 1863, 1864, 1865] }));
  console.log('Public scoring checks passed (44 choices, 440 unchanged legacy field-result merges, 80 current causal merges, legacy lookup, command grades, sync/async termination, 20 full-campaign benchmarks).');
} finally {
  await vite.close();
}
