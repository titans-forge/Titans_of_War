import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createServer } from 'vite';
import { createFreshCampaignState, createCampaignSnapshot, restoreCampaignFromSnapshot, CAMPAIGN_SAVE_VERSION } from '../src/game/campaignStorage.js';
import { getCampaignScenario, selectRecoveryAllocation, commitRecoveryAllocation } from '../src/game/campaignSupply.js';
import { calculateCampaignScore, getChoiceAvailability } from '../src/game/simulationEngine.js';
import { advanceCampaignTurn, getScenarioForState } from '../src/game/headlessCampaign.js';
import { battleForScenario, delegateBattle, applyBattleResolution, battleChoiceSuccessModifier } from '../src/game/battles.js';
import { createCampaignContinuity } from '../src/game/campaignContinuity.js';
import { createAfterAction } from '../src/game/campaignExperience.js';
import { buildCampaignBundle } from '../src/game/campaignBundle.js';

const vite = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' });
const { STATIC_SCENARIOS } = await vite.ssrLoadModule('/src/game/scenarios.js');
await vite.close();
const finale = STATIC_SCENARIOS.find(scenario => scenario.id === 'appomattox_decision');
const plain = value => JSON.parse(JSON.stringify(value));
const beforeFinale = (currentTurn = 27) => ({ ...createFreshCampaignState(1861, finale.id, { difficulty: 'story' }), currentTurn,
  divergenceIndex: .4, metrics: { militaryStrength: 98, publicMorale: 98, foodSupply: 98, treasury: 98, munitions: 98 } });

for (const choice of finale.choices) test(`Appomattox ${choice.id} settles exactly once after an early branch arrival`, () => {
  const state = beforeFinale(), original = plain(state);
  const result = advanceCampaignTurn(state, finale, choice.id, STATIC_SCENARIOS);
  assert.equal(result.state.gameOver, true); assert.equal(result.nextScenario, null);
  assert.equal(result.state.nextScenarioId, null); assert.equal(result.directorRoute, 'end-of-campaign');
  assert.equal(result.state.history.length, state.history.length + 1);
  assert.equal(result.state.history.at(-1).scenarioId, finale.id); assert.equal(result.state.history.at(-1).choiceId, choice.id);
  assert.deepEqual(state, original, 'resolving the decision does not mutate its prior save');
  const settled = plain(result.state);
  assert.throws(() => advanceCampaignTurn(result.state, finale, choice.id, STATIC_SCENARIOS), /concluded/i);
  assert.deepEqual(result.state, settled, 'a late commit cannot reapply surrender gains or losses');
});

test('a completed campaign cannot accept an unrelated later order either', () => {
  const settled = advanceCampaignTurn(beforeFinale(), finale, 'option_b', STATIC_SCENARIOS).state;
  const original = plain(settled);
  assert.throws(() => advanceCampaignTurn(settled, STATIC_SCENARIOS[0], 'option_b', STATIC_SCENARIOS), /concluded/i);
  assert.deepEqual(settled, original);
});

test('the score records Richmond resource collapse on turn 28 and preserves a selected settlement ending', () => {
  const richmond = STATIC_SCENARIOS.find(scenario => scenario.id === 'richmond_evacuation');
  for (const [metrics, order, ending] of [
    [{ militaryStrength: 25 }, 'option_a', 'Army Exhausted'],
    [{ publicMorale: 20 }, 'option_b', 'Home Front Fracture'],
    [{ foodSupply: 4 }, 'option_d', 'Granary Collapse'],
  ]) {
    const base = beforeFinale(richmond.turn);
    const result = advanceCampaignTurn({ ...base, scenarioId: richmond.id, divergenceIndex: .8,
      metrics: { ...base.metrics, ...metrics } }, richmond, order, STATIC_SCENARIOS);
    assert.equal(result.state.currentTurn, finale.turn);
    assert.equal(result.state.gameOver, true);
    assert.equal(result.nextScenario, null);
    assert.match(result.state.statusMessage, /^DEFEAT:/);
    const cold = restoreCampaignFromSnapshot(createCampaignSnapshot(result.state, richmond), STATIC_SCENARIOS);
    const score = calculateCampaignScore(cold.state);
    assert.equal(score.endingClass, ending);
    assert.equal(score.survived, false);
  }
  const base = beforeFinale(26);
  const settled = advanceCampaignTurn({ ...base, metrics: { ...base.metrics, militaryStrength: 30 } }, finale, 'option_a', STATIC_SCENARIOS);
  assert.equal(settled.state.currentTurn, 27);
  assert.ok(settled.state.metrics.militaryStrength <= 10);
  assert.match(settled.state.statusMessage, /^CAMPAIGN CONCLUDED/);
  assert.equal(calculateCampaignScore(settled.state).endingClass, 'Guerrilla Fragmentation');
});

function followStoryFoxRoute(seed, richmondOrder = null, stopBefore = null) {
  let state = createFreshCampaignState(seed, STATIC_SCENARIOS[0].id, { difficulty: 'story' });
  let decisions = 0;
  while (!state.gameOver && decisions < 80) {
    const scenario = getCampaignScenario(state, getScenarioForState(state, STATIC_SCENARIOS));
    if (scenario.id === stopBefore) return { state, decisions, scenario };
    const legal = scenario.choices.filter(choice => !getChoiceAvailability(choice, scenario, state).locked);
    assert.ok(legal.length > 0, `no legal choice at ${scenario.id}`);
    const choice = scenario.id === 'richmond_evacuation' && richmondOrder
      ? legal.find(choice => choice.id === richmondOrder)
      : legal.find(choice => choice.proposer === 'fox') || legal[0];
    assert.ok(choice, `the requested order is unavailable at ${scenario.id}`);
    state = selectRecoveryAllocation(state, state.metrics.foodSupply < 30 ? 'emergency' : state.metrics.munitions < 40 ? 'purchase' : 'none');
    const battle = battleForScenario(scenario, state, choice.id); let modifier = 0;
    if (battle) {
      state = commitRecoveryAllocation(state);
      const field = delegateBattle(state, battle, choice.id);
      state = applyBattleResolution(state, field);
      modifier = battleChoiceSuccessModifier(battle, choice.id, field.result);
    }
    const result = advanceCampaignTurn(state, scenario, choice.id, STATIC_SCENARIOS, modifier);
    state = result.state; decisions++;
  }
  return { state, decisions, scenario: null };
}

for (const seed of [1861, 1862, 1863]) test(`fresh Story/Fox route seed ${seed} reaches Appomattox once through the real campaign director`, () => {
  const { state, decisions } = followStoryFoxRoute(seed);
  assert.equal(state.gameOver, true); assert.equal(state.history.length, decisions);
  assert.equal(state.history.filter(entry => entry.scenarioId === finale.id).length, 1);
  assert.equal(state.history.at(-1).scenarioId, finale.id);
  assert.equal(state.history.filter(entry => entry.scenarioId === 'sailors_creek').length, 1);
  assert.equal(state.history.at(-2).scenarioId, 'sailors_creek');
});

for (const richmondOrder of ['option_c', 'option_d']) test(`Richmond ${richmondOrder} reaches an early Greensboro settlement that concludes the campaign`, () => {
  const { state, scenario } = followStoryFoxRoute(1861, richmondOrder, 'greensboro_convention');
  assert.equal(scenario?.id, 'greensboro_convention');
  assert.equal(state.currentTurn, 27);
  assert.equal(state.history.at(-1).scenarioId, 'richmond_evacuation');
  assert.equal(state.history.at(-1).choiceId, richmondOrder);
  const embedded = plain(scenario);
  delete embedded.endsCampaign;
  const save = createCampaignSnapshot(state, embedded);
  const original = plain(save);
  const restored = restoreCampaignFromSnapshot(plain(save), STATIC_SCENARIOS);
  assert.equal(restored.activeScenario.id, scenario.id);
  const endings = {
    option_b: /departmental paroles/,
    option_a: /state-level holdouts/,
    option_c: /temporary armistice/,
    option_d: /sent home under state authority/,
  };
  for (const [choiceId, message] of Object.entries(endings)) {
    const result = advanceCampaignTurn(restored.state, restored.activeScenario, choiceId, STATIC_SCENARIOS);
    assert.equal(result.state.gameOver, true);
    assert.equal(result.nextScenario, null);
    assert.equal(result.state.nextScenarioId, null);
    assert.equal(result.directorRoute, 'end-of-campaign');
    assert.match(result.state.statusMessage, message);
    assert.equal(result.state.history.length, state.history.length + 1);
    assert.equal(result.historyEntry.scenarioId, scenario.id);
    assert.equal(result.historyEntry.choiceId, choiceId);
    assert.ok(!result.state.history.some(entry => entry.scenarioId === finale.id));
    const concluded = restoreCampaignFromSnapshot(createCampaignSnapshot(result.state, scenario), STATIC_SCENARIOS);
    assert.equal(concluded.state.gameOver, true);
    assert.deepEqual(concluded.state.history, result.state.history);
    assert.equal(concluded.state.statusMessage, result.state.statusMessage);
    assert.throws(() => advanceCampaignTurn(concluded.state, finale, 'option_b', STATIC_SCENARIOS), /concluded/i);
  }
  assert.deepEqual(save, original);
});

test('the rare April Peace Crisis follows McClellan’s inauguration and Richmond’s evacuation', () => {
  const richmond = STATIC_SCENARIOS.find(scenario => scenario.id === 'richmond_evacuation');
  const base = { ...beforeFinale(richmond.turn), scenarioId: richmond.id, divergenceIndex: .9, history: [
    { scenarioId: 'shiloh_army_of_tennessee', choiceId: 'option_b' },
    { scenarioId: 'chancellorsville_aftermath', choiceId: 'option_b' },
    { scenarioId: 'gettysburg_with_jackson', choiceId: 'option_a', choiceSucceeded: true },
    { scenarioId: 'atlanta_election_pressure', choiceId: 'option_b' },
    { scenarioId: 'third_winchester', choiceId: 'option_d' },
    { scenarioId: 'election_1864_mcclellan', choiceId: 'option_b' },
  ] };
  const evacuated = advanceCampaignTurn(base, richmond, 'option_c', STATIC_SCENARIOS);
  const peace = evacuated.nextScenario;
  assert.equal(peace.id, 'southern_independence_1864');
  assert.match(peace.date, /April 1865/);
  assert.match(peace.description, /McClellan has taken office/);
  assert.match(peace.description, /evacuated Richmond/);
  assert.match(peace.choices.find(choice => choice.id === 'option_d').text, /President McClellan/);
  const result = advanceCampaignTurn(evacuated.state, peace, 'option_d', STATIC_SCENARIOS);
  assert.equal(result.state.gameOver, true);
  assert.match(result.state.statusMessage, /McClellan.*reunion/);
  assert.match(result.historyEntry.consequence, /McClellan.*reunion/);
  assert.equal(calculateCampaignScore(result.state).endingClass, 'Modified Constitutional Compact');
  assert.match(calculateCampaignScore(result.state).endingNote, /McClellan.*reunion/);

  const legacyHistory = [...result.state.history.slice(0, -1), { ...result.historyEntry,
    choiceText: 'Offer Lincoln a modified federal compact before McClellan can win.',
    consequence: 'Lincoln accepts the framework over his own cabinet’s objections.',
  }];
  const legacyState = { ...result.state, battleRulesVersion: 17, history: legacyHistory,
    statusMessage: 'CAMPAIGN CONCLUDED — A modified compact settled the war before McClellan could win it.' };
  const legacySave = createCampaignSnapshot(legacyState, peace);
  legacySave.version = 21;
  const legacy = restoreCampaignFromSnapshot(legacySave, STATIC_SCENARIOS);
  assert.deepEqual(legacy.state.history, legacyHistory);
  assert.equal(legacy.state.statusMessage, legacyState.statusMessage);
  assert.match(calculateCampaignScore(legacy.state).endingNote, /pre-election compact with Lincoln/);

  const armistice = advanceCampaignTurn(evacuated.state, peace, 'option_b', STATIC_SCENARIOS);
  const armisticeSave = createCampaignSnapshot(armistice.state, peace);
  const reopened = restoreCampaignFromSnapshot(armisticeSave, STATIC_SCENARIOS).state;
  assert.equal(reopened.gameOver, true);
  assert.match(reopened.statusMessage, /Sovereignty and a permanent boundary remain open/);
  assert.match(reopened.history.at(-1).consequence, /sovereignty remains open to negotiation/);
  const newScore = calculateCampaignScore(reopened);
  assert.equal(newScore.endingClass, 'Southern Independence — Mediated Armistice');
  assert.equal(newScore.endingLabel, 'European-Mediated Armistice');
  assert.match(newScore.endingNote, /will negotiate sovereignty/);
  const bundle = buildCampaignBundle(reopened, peace, { scenarios: STATIC_SCENARIOS });
  assert.match(bundle.summary, /Ending: European-Mediated Armistice/);
  assert.match(bundle.chronicle.markdown, /\*\*European-Mediated Armistice\*\*/);
  assert.doesNotMatch(bundle.chronicle.markdown, /CSA Independence|Armistice\.jpeg/);

  const oldArmistice = plain(armisticeSave);
  oldArmistice.state.statusMessage = 'CAMPAIGN CONCLUDED — European mediation produced a binding armistice along the existing lines. Southern independence is recognized by a world that respected four years of Confederate battlefield record.';
  oldArmistice.state.history.at(-1).consequence = 'Commissioners use the ceasefire lines as the basis for a boundary treaty.';
  const reopenedOldArmistice = restoreCampaignFromSnapshot(oldArmistice, STATIC_SCENARIOS).state;
  assert.equal(reopenedOldArmistice.statusMessage, oldArmistice.state.statusMessage);
  assert.deepEqual(reopenedOldArmistice.history, oldArmistice.state.history);
  const oldScore = calculateCampaignScore(reopenedOldArmistice);
  assert.equal(oldScore.endingClass, newScore.endingClass);
  assert.equal(oldScore.endingLabel, oldScore.endingClass);
  assert.match(oldScore.endingNote, /recognized sovereign state/);
  assert.deepEqual(oldScore.reportCards, newScore.reportCards);
});

test('an existing Appomattox save with an embedded pre-fix scenario remains readable and settles once after cold restore', () => {
  const oldScenario = plain(finale); delete oldScenario.endsCampaign;
  const existing = createCampaignSnapshot(beforeFinale(), oldScenario);
  const original = plain(existing), restored = restoreCampaignFromSnapshot(plain(existing), STATIC_SCENARIOS);
  assert.ok(restored); assert.equal(restored.state.currentTurn, 27);
  assert.equal(restored.activeScenario.id, finale.id);
  const result = advanceCampaignTurn(restored.state, restored.activeScenario, 'option_b', STATIC_SCENARIOS);
  assert.equal(result.state.gameOver, true); assert.equal(result.state.history.filter(entry => entry.scenarioId === finale.id).length, 1);
  const settledSave = createCampaignSnapshot(result.state, restored.activeScenario);
  const cold = restoreCampaignFromSnapshot(plain(settledSave), STATIC_SCENARIOS);
  assert.ok(cold); assert.equal(cold.state.gameOver, true); assert.deepEqual(cold.state.history, result.state.history);
  assert.deepEqual(existing, original, 'reading an earlier save never rewrites its stored history');
  assert.equal(CAMPAIGN_SAVE_VERSION, 22); assert.equal(result.state.battleRulesVersion, 18);
});

test('the authored October-November Atlanta branch explicitly labels its earlier Winchester handoff and retains it after cold restore', () => {
  const atlanta = STATIC_SCENARIOS.find(scenario => scenario.id === 'atlanta_holds_october');
  const winchester = STATIC_SCENARIOS.find(scenario => scenario.id === 'third_winchester');
  assert.equal(atlanta.date, 'October-November 1864'); assert.equal(winchester.date, 'September 19, 1864');
  const fresh = createFreshCampaignState(1861, atlanta.id, { difficulty: 'story' });
  const state = { ...fresh, currentTurn: 21,
    shards: Object.fromEntries(Object.entries(fresh.shards).map(([id, shard]) => [id, { ...shard, alignment: 90 }])) };
  const original = plain(state), result = advanceCampaignTurn(state, atlanta, 'option_b', STATIC_SCENARIOS);
  assert.equal(result.nextScenario.id, winchester.id);
  const report = createAfterAction(state, result.state, result.historyEntry, result.nextScenario);
  assert.match(report.continuity.explanation, /Historical flashback:.*September 19, 1864.*October-November/);
  assert.match(report.continuity.explanation, /resources, obligations and recorded decisions carry forward/);
  const saved = createCampaignSnapshot({ ...result.state, pendingDebrief: report }, result.nextScenario);
  const cold = restoreCampaignFromSnapshot(plain(saved), STATIC_SCENARIOS);
  assert.ok(cold); assert.equal(cold.state.pendingDebrief.continuity.explanation, report.continuity.explanation);
  assert.deepEqual(state, original);
  const ordinary = createCampaignContinuity(result.state, { ...result.historyEntry, scenarioId: 'fall_of_atlanta' }, winchester);
  assert.doesNotMatch(ordinary.explanation, /flashback/);
  const concluded = createCampaignContinuity({ ...result.state, gameOver: true }, result.historyEntry, winchester);
  assert.doesNotMatch(concluded.explanation, /flashback/); assert.equal(concluded.next, null);
});

const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const handlerStart = appSource.indexOf('  const handleExecuteChoice = () => {');
const handlerEnd = appSource.indexOf('\n\n\n', handlerStart);
assert.ok(handlerStart >= 0 && handlerEnd > handlerStart);
const handlerCode = appSource.slice(handlerStart, handlerEnd) + '\nhandleExecuteChoice;';
const disabledExpression = appSource.match(/onClick=\{handleExecuteChoice\}\s+disabled=\{([^\n]+)\}/)?.[1];
assert.ok(disabledExpression, 'the real commit control must expose its disabled condition');

for (const phase of ['terminal', 'debrief', 'battle', 'unselected']) test(`actual App commit control and handler reject the ${phase} phase without writing or enacting orders`, () => {
  const state = beforeFinale();
  if (phase === 'terminal') state.gameOver = true;
  if (phase === 'debrief') state.pendingDebrief = { version: 1 };
  const context = { gameState: state, selectedChoiceId: phase === 'unselected' ? null : 'option_b', pendingBattle: phase === 'battle' ? { mode: 'gate' } : null,
    Boolean, confirmExecution: false, needsConfirmation: false,
    setNeedsConfirmation() { assert.fail('blocked commit changed confirmation'); },
    saveCampaignCheckpoint() { assert.fail('blocked commit wrote a checkpoint'); },
    setUndoStack() { assert.fail('blocked commit wrote undo history'); },
    completeCampaignChoice() { assert.fail('blocked commit enacted a decision'); },
  };
  assert.equal(Boolean(vm.runInNewContext(disabledExpression, context)), true);
  vm.runInNewContext(handlerCode, context)();
});
