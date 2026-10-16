import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createServer } from 'vite';
import { createFreshCampaignState, createCampaignSnapshot, restoreCampaignFromSnapshot, CAMPAIGN_SAVE_VERSION } from '../src/game/campaignStorage.js';
import { getCampaignScenario, selectRecoveryAllocation, commitRecoveryAllocation } from '../src/game/campaignSupply.js';
import { getChoiceAvailability } from '../src/game/simulationEngine.js';
import { advanceCampaignTurn, getScenarioForState } from '../src/game/headlessCampaign.js';
import { battleForScenario, delegateBattle, applyBattleResolution, battleChoiceSuccessModifier } from '../src/game/battles.js';
import { createCampaignContinuity } from '../src/game/campaignContinuity.js';
import { createAfterAction } from '../src/game/campaignExperience.js';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
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

for (const seed of [1861, 1862, 1863]) test(`fresh Story/Fox route seed ${seed} reaches Appomattox once through the real campaign director`, () => {
  let state = createFreshCampaignState(seed, STATIC_SCENARIOS[0].id, { difficulty: 'story' });
  let decisions = 0;
  while (!state.gameOver && decisions < 80) {
    const scenario = getCampaignScenario(state, getScenarioForState(state, STATIC_SCENARIOS));
    const legal = scenario.choices.filter(choice => !getChoiceAvailability(choice, scenario, state).locked);
    assert.ok(legal.length > 0, `no legal choice at ${scenario.id}`);
    const choice = legal.find(choice => choice.proposer === 'fox') || legal[0];
    state = selectRecoveryAllocation(state, state.metrics.foodSupply < 30 ? 'emergency' : state.metrics.munitions < 40 ? 'purchase' : 'none');
    const battle = battleForScenario(scenario, state); let modifier = 0;
    if (battle) {
      state = commitRecoveryAllocation(state);
      const field = delegateBattle(state, battle, choice.id);
      state = applyBattleResolution(state, field);
      modifier = battleChoiceSuccessModifier(battle, choice.id, field.result);
    }
    const result = advanceCampaignTurn(state, scenario, choice.id, STATIC_SCENARIOS, modifier);
    state = result.state; decisions++;
  }
  assert.equal(state.gameOver, true); assert.equal(state.history.length, decisions);
  assert.equal(state.history.filter(entry => entry.scenarioId === finale.id).length, 1);
  assert.equal(state.history.at(-1).scenarioId, finale.id);
  assert.equal(decisions, 29, 'the earlier route repeated Appomattox as its thirtieth decision');
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
