import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createServer } from 'vite';
import { getBattleAssessment } from '../src/battle/battleAssessment.js';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { applyBattleResolution, BATTLE_SCENARIOS, delegateBattle } from '../src/game/battles.js';
import { createAfterAction } from '../src/game/campaignExperience.js';
import { getCampaignScenario } from '../src/game/campaignSupply.js';
import { createCampaignSnapshot, createFreshCampaignState, restoreCampaignFromSnapshot } from '../src/game/campaignStorage.js';
import { advanceCampaignTurn } from '../src/game/headlessCampaign.js';
import { calculateElectionPressure, evaluateRequiresHistory, forecastCampaignChoice, resolveNextScenario } from '../src/game/simulationEngine.js';

const cache = mkdtempSync(join(tmpdir(), 'civil-war-shiloh-settlement-'));
const vite = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname,
  cacheDir: cache, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'silent' });
try {
  const { STATIC_SCENARIOS: scenarios } = await vite.ssrLoadModule('/src/game/scenarios.js');
  const { buildCampaignChronicle } = await vite.ssrLoadModule('/src/game/chronicleExporter.js');
  const shiloh = BATTLE_SCENARIOS.shiloh_army_of_tennessee;
  const scene = id => scenarios.find(scenario => scenario.id === id);
  const scenario = scene(shiloh.scenarioId);
  const clone = value => JSON.parse(JSON.stringify(value));

  const start = createFreshCampaignState(1861, 'fort_sumter');
  const sumter = advanceCampaignTurn(start, scene('fort_sumter'), 'option_c', scenarios);
  const manassas = BATTLE_SCENARIOS.manassas_battlefield;
  const staffManassas = applyBattleResolution(sumter.state, delegateBattle(sumter.state, manassas, 'option_b'));
  const afterManassas = advanceCampaignTurn(staffManassas, scene(manassas.scenarioId), 'option_b', scenarios);
  const { state } = advanceCampaignTurn(afterManassas.state, scene('naval_technology'), 'option_b', scenarios);
  assert.equal(state.scenarioId, shiloh.scenarioId);

  function play(choiceId, withdraw = false) {
    const engine = new CivilWarBattleEngine(shiloh.id, state, choiceId);
    if (withdraw) {
      for (const unit of engine.snapshot().formations.filter(unit => unit.side === 'confederate' && unit.active)) {
        assert.equal(engine.order(unit.id, 'withdraw'), true);
      }
    }
    for (let frame = 0; frame < 3000 && engine.outcome === 'undecided'; frame++) engine.tick(.1);
    assert.notEqual(engine.outcome, 'undecided');
    const snapshot = engine.snapshot();
    return {
      battleId: shiloh.id, scenarioId: shiloh.scenarioId, choiceId,
      battleRulesVersion: snapshot.battleRulesVersion, result: snapshot.outcome, score: snapshot.score,
      assessment: getBattleAssessment(snapshot, choiceId),
      commanderStatus: snapshot.commanderStatus, confederateLossRate: snapshot.confederateLossRate,
      unionLossRate: snapshot.unionLossRate, delegated: false,
    };
  }

  function settle(choiceId, field, options) {
    const before = structuredClone(state);
    const applied = applyBattleResolution(state, field, options);
    assert.deepEqual(state, before);
    assert.equal(applyBattleResolution(applied, field), applied);
    const turn = advanceCampaignTurn(applied, scenario, choiceId, scenarios);
    turn.state.pendingDebrief = createAfterAction(state, turn.state, turn.historyEntry, turn.nextScenario, applied);
    const restored = restoreCampaignFromSnapshot(clone(createCampaignSnapshot(turn.state, turn.nextScenario)), scenarios);
    assert.ok(restored);
    assert.deepEqual(restored.state.history, clone(turn.state.history));
    assert.deepEqual(restored.state.pendingDebrief, clone(turn.state.pendingDebrief));
    const { markdown } = buildCampaignChronicle(restored.state, { scenarios, includeMediaEmbeds: false });
    const chapter = markdown.slice(markdown.indexOf(` — ${scenario.title}\n`));
    return { entry: turn.historyEntry, report: restored.state.pendingDebrief, chapter, state: restored.state };
  }

  await test('Shiloh assault distinguishes a staff-estimated limited win and manual defeat', () => {
    const staff = delegateBattle(state, shiloh, 'option_a');
    const manual = play('option_a');
    assert.equal(staff.result, 'costly-win');
    assert.equal(manual.result, 'defeat');
    for (const [field, achieved, commander] of [[staff, true, 'mortally wounded'], [manual, false, 'exposed']]) {
      const { entry, report, chapter } = settle('option_a', field);
      assert.equal(entry.battleResult.fieldResultConsequencesVersion, 2);
      assert.equal(entry.choiceSucceeded, achieved);
      assert.equal(entry.battleResult.commanderStatus, commander);
      assert.equal(entry.metricEffects.munitions, -12);
      assert.equal(entry.metricEffects.militaryStrength, undefined);
      assert.equal(entry.metricEffects.publicMorale, undefined);
      assert.equal(entry.metricEffects.divergenceIndex, achieved ? .08 : undefined);
      assert.equal(report.deltas.find(delta => delta.key === 'publicMorale').breakdown.battle, achieved ? 2 : -6);
      assert.match(entry.consequence, achieved ? /Staff estimate\. .*limited victory.*mortally wounded/ : /field defeat.*fell short.*remained exposed/);
      assert.match(chapter, achieved ? /Staff estimate\*\*: Limited Confederate victory/ : /Field verdict\*\*: Field defeat/);
      assert.match(chapter, achieved ? /Selected mission\*\*: Achieved/ : /Selected mission\*\*: Incomplete/);
      assert.ok(chapter.includes(entry.consequence));
      assert.doesNotMatch(chapter, /Tactical Dice Roll/);
      assert.equal(calculateElectionPressure([entry]).factors.some(factor => /Shiloh|Third Winchester/.test(factor.label)), false);
    }
  });

  await test('failed reserve mission retains actual Johnston protection and discards mission credit', () => {
    const held = play('option_b');
    const withdrew = play('option_b', true);
    assert.equal(held.result, 'disciplined-withdrawal');
    assert.equal(withdrew.result, 'defeat');
    assert.equal(withdrew.confederateLossRate, 0);
    const hold = settle('option_b', held);
    const retreat = settle('option_b', withdrew);
    assert.equal(hold.entry.choiceSucceeded, true);
    assert.equal(retreat.entry.choiceSucceeded, false);
    assert.deepEqual(retreat.entry.metricEffects, { munitions: -6 });
    assert.ok(hold.entry.metricEffects.publicMorale > 0);
    assert.equal(hold.entry.metricEffects.militaryStrength, undefined);
    assert.equal(retreat.entry.scoreCard.tactical, -6);
    assert.equal(retreat.entry.scoreCard.strategic, 0);
    assert.match(hold.chapter, /Field verdict\*\*: Army preserved through the mission/);
    assert.match(retreat.entry.consequence, /partial progress.*remained protected/);

    const requirements = { allOf: [{ scenarioId: shiloh.scenarioId, choiceId: 'option_b' }] };
    const recognition = scene('gettysburg_with_jackson');
    const laterRecord = [
      { scenarioId: 'chancellorsville_aftermath', choiceId: 'option_b' },
      { scenarioId: recognition.id, choiceId: 'option_a', choiceSucceeded: true },
    ];
    const next = entry => resolveNextScenario(recognition, recognition.choices[0], recognition.turn + 1,
      scenarios, .8, null, [entry, ...laterRecord])?.id;
    for (const entry of [hold.entry, retreat.entry]) {
      assert.equal(evaluateRequiresHistory(requirements, [entry]).satisfied, true);
      assert.equal(next(entry), 'gettysburg_recognition_crisis');
    }
    const unprotected = { ...retreat.entry, battleResult: { ...retreat.entry.battleResult, commanderStatus: 'exposed' } };
    assert.equal(evaluateRequiresHistory(requirements, [unprotected]).satisfied, false);
    assert.notEqual(next(unprotected), 'gettysburg_recognition_crisis');
    assert.equal(evaluateRequiresHistory(requirements, [{ ...retreat.entry, battleResult: null }]).satisfied, true);

    // Supply later alternate-history prerequisites as fixtures to probe the
    // real director. Shiloh's entry above came from a played, restored result.
    const branches = [
      { from: recognition, choiceId: 'option_a', history: laterRecord.slice(0, 1), to: 'gettysburg_recognition_crisis' },
      { from: scene('richmond_evacuation'), choiceId: 'option_c', to: 'southern_independence_1864',
        history: [...laterRecord, { scenarioId: 'election_1864_mcclellan', choiceId: 'option_a' },
          { scenarioId: 'atlanta_election_pressure', choiceId: 'option_b' },
          { scenarioId: 'third_winchester', choiceId: 'option_d' }] },
    ];
    for (const branch of branches) {
      const fixture = { ...retreat.state, scenarioId: branch.from.id, currentTurn: branch.from.turn,
        divergenceIndex: .8, nextScenarioId: null, history: [...retreat.state.history, ...branch.history] };
      const directed = advanceCampaignTurn(fixture, branch.from, branch.choiceId, scenarios, 1);
      assert.equal(directed.nextScenario?.id, branch.to);
      assert.match(directed.nextScenario.description, /Johnston survived Shiloh\. The command reserve fell short/);
      assert.doesNotMatch(directed.nextScenario.description, /kept the Western army coherent|Western army held together/);
      const reloaded = restoreCampaignFromSnapshot(clone(createCampaignSnapshot(directed.state, directed.nextScenario)), scenarios);
      assert.ok(reloaded);
      assert.deepEqual(getCampaignScenario(reloaded.state, reloaded.activeScenario), directed.nextScenario);
      const authored = scene(branch.to);
      assert.equal(getCampaignScenario(hold.state, authored).description, authored.description);
      const legacy = { ...retreat.state, history: [{ ...retreat.entry,
        battleResult: { ...retreat.entry.battleResult, fieldResultConsequencesVersion: undefined } }] };
      assert.equal(getCampaignScenario(legacy, authored).description, authored.description);
    }
  });

  await test('unsuccessful evacuation and dispatches pay their costs without receiving objective rewards', () => {
    for (const [choiceId, cost, amount] of [['option_c', 'treasury', -14], ['option_d', 'publicMorale', -5]]) {
      const { entry } = settle(choiceId, play(choiceId));
      assert.equal(entry.choiceSucceeded, false);
      assert.deepEqual(entry.metricEffects, { [cost]: amount });
      assert.equal(entry.scoreCard.strategic, 0);
      if (choiceId === 'option_c') {
        assert.equal(entry.battleResult.commanderStatus, 'distracted');
        assert.match(entry.consequence, /attention was divided/);
      }
    }
    const { entry: evac } = settle('option_d', play('option_d', true));
    assert.equal(evac.choiceSucceeded, true);
    assert.deepEqual(evac.metricEffects, { munitions: 10, treasury: 8, publicMorale: -5 });
  });

  await test('field outlook includes achieved and missed reserve missions for the same favorable verdict', () => {
    const forecast = forecastCampaignChoice(state, scenario, scenario.choices.find(choice => choice.id === 'option_b'));
    assert.equal(forecast.successChance, null);
    assert.match(forecast.scope, /Illustrative ranges across field verdicts/);
    const preservation = forecast.outcomes.filter(outcome => outcome.result === 'disciplined-withdrawal');
    assert.equal(preservation.length, 2);
    assert.ok(preservation[0].metrics.publicMorale > preservation[1].metrics.publicMorale);
  });

  await test('legacy Shiloh preserves its authored history and effects', () => {
    const failed = play('option_a');
    const original = scenario.choices.find(choice => choice.id === 'option_a');
    for (const [field, options] of [
      [failed, { legacyShiloh: true }], [{ ...failed, battleRulesVersion: 17 }, undefined],
    ]) {
      const { entry, chapter } = settle('option_a', field, options);
      assert.equal(entry.battleResult.fieldResultConsequencesVersion, undefined);
      assert.equal(entry.choiceSucceeded, null);
      assert.equal(entry.consequence, original.consequence);
      assert.ok(entry.metricEffects.publicMorale > 0);
      assert.match(chapter, /Resolved Historical Consequence/);
      assert.doesNotMatch(chapter, /Selected mission/);
    }
  });
} finally {
  await vite.close();
  rmSync(cache, { recursive: true, force: true });
}
