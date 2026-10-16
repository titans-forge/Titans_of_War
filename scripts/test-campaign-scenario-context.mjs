import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import { createFreshCampaignState, createCampaignSnapshot, restoreCampaignFromSnapshot } from '../src/game/campaignStorage.js';
import { getCampaignScenario } from '../src/game/campaignSupply.js';
import { advanceCampaignTurn, getScenarioForState } from '../src/game/headlessCampaign.js';
import { battleForScenario, delegateBattle, applyBattleResolution, battleChoiceSuccessModifier } from '../src/game/battles.js';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const { STATIC_SCENARIOS } = await vite.ssrLoadModule('/src/game/scenarios.js');
const { CivilWarBattleEngine } = await vite.ssrLoadModule('/src/battle/civilWarEngine.js');
await vite.close();
const maneuver = STATIC_SCENARIOS.find(scenario => scenario.id === 'chancellorsville_maneuver');
const aftermath = STATIC_SCENARIOS.find(scenario => scenario.id === 'chancellorsville_aftermath');
const plain = value => JSON.parse(JSON.stringify(value));
const assertions = {
  option_b: /refused the split.*compact defensive line/i,
  option_c: /cavalry feint.*flank probe/i,
  option_d: /direct pressure attack/i,
};
const failedFlankAssertions = {
  'disciplined-withdrawal': /approved Jackson’s concealed flank march.*withdrew in order.*without securing the intended flank victory/i,
  defeat: /approved Jackson’s concealed flank march.*field attack ended without the intended victory/i,
  rout: /approved Jackson’s concealed flank march.*attack collapsed into a rout/i,
};
const fieldOutcomes = ['decisive-win', 'costly-win', 'disciplined-withdrawal', 'defeat', 'rout'];

function arriveWithFieldResult(fieldResult, battleRulesVersion = 18) {
  const state = { ...createFreshCampaignState(1861, maneuver.id, { difficulty: 'story', battleRulesVersion }), currentTurn: 10 };
  // Exercise each recorded outcome through the real field ledger and campaign
  // handoff; an engine-produced resolution is checked separately below.
  const battle = battleForScenario(maneuver, state);
  const field = {
    battleId: battle.id, scenarioId: maneuver.id, choiceId: 'option_a',
    result: fieldResult, score: 50, confederateLossRate: 0.2, unionLossRate: 0.2,
    delegated: false, battleRulesVersion,
  };
  const applied = applyBattleResolution(state, field);
  return advanceCampaignTurn(applied, maneuver, 'option_a', STATIC_SCENARIOS, battleChoiceSuccessModifier(battle, 'option_a', fieldResult));
}

function assertChoiceMechanicsPreserved(contextual) {
  const mechanics = ({ text, costDescription, consequence, ...rest }) => rest;
  assert.equal(contextual.choices.length, aftermath.choices.length);
  for (const [index, choice] of contextual.choices.entries()) {
    assert.deepEqual(mechanics(choice), mechanics(aftermath.choices[index]), 'only choice wording may change');
  }
}

function arrive(choiceId, playField = false) {
  let state = { ...createFreshCampaignState(1861, maneuver.id, { difficulty: 'story' }), currentTurn: 10 };
  let modifier = 0;
  if (playField) {
    const battle = battleForScenario(maneuver, state);
    const field = delegateBattle(state, battle, choiceId);
    state = applyBattleResolution(state, field);
    modifier = battleChoiceSuccessModifier(battle, choiceId, field.result);
  }
  return advanceCampaignTurn(state, maneuver, choiceId, STATIC_SCENARIOS, modifier);
}

for (const choiceId of Object.keys(assertions)) {
  test(`real Chancellorsville ${choiceId} handoff retains the chosen approach rather than asserting Jackson's completed flank rupture`, () => {
    const result = arrive(choiceId);
    assert.equal(result.nextScenario.id, aftermath.id);
    assert.match(result.nextScenario.description, assertions[choiceId]);
    assert.doesNotMatch(result.nextScenario.title, /Breakthrough/);
    assert.doesNotMatch(result.nextScenario.description, /march has reached the Union flank|Howard's XI Corps is exposed|Lee waits with a thin line/);
    assert.match(result.nextScenario.description, /alternate campaign/i);
    assert.equal(result.nextScenario.actor, aftermath.actor);
    for (const [index, choice] of result.nextScenario.choices.entries()) {
      const canonical = aftermath.choices[index];
      assert.equal(choice.id, canonical.id); assert.equal(choice.proposer, canonical.proposer);
      assert.deepEqual(choice.effects, canonical.effects); assert.equal(choice.next, canonical.next);
      assert.doesNotMatch(choice.text, /after the flank rupture|Exploit the victory|exposed XI Corps|before Hooker can retreat/);
      assert.doesNotMatch(choice.consequence, /Union right collapses|battlefield success becomes/);
      const resolved = advanceCampaignTurn(result.state, aftermath, choice.id, STATIC_SCENARIOS);
      assert.equal(resolved.historyEntry.choiceText, choice.text, 'the canonical caller uses the same contextual order as the public UI');
      assert.equal(resolved.historyEntry.consequence, choice.consequence);
    }
    assert.equal(getCampaignScenario(result.state, aftermath).description, result.nextScenario.description);
  });

  test(`${choiceId} context survives a cold pre-upgrade snapshot without changing its recorded field result`, () => {
    const result = arrive(choiceId, true), originalState = structuredClone(result.state), originalScenario = structuredClone(aftermath);
    const snapshot = createCampaignSnapshot(result.state, aftermath);
    const cold = restoreCampaignFromSnapshot(plain(snapshot), STATIC_SCENARIOS);
    assert.ok(cold);
    const contextual = getCampaignScenario(cold.state, getScenarioForState(cold.state, STATIC_SCENARIOS));
    assert.match(contextual.description, assertions[choiceId]);
    const field = cold.state.history.at(-1).battleResult;
    assert.ok(field?.result);
    assert.ok(contextual.description.includes(field.result.replaceAll('-', ' ')), 'report the actual recorded outcome, including a withdrawal or defeat');
    assert.deepEqual(cold.state.history.at(-1).battleResult, plain(originalState.history.at(-1).battleResult));
    assert.deepEqual(result.state, originalState); assert.deepEqual(aftermath, originalScenario);
    const resolved = advanceCampaignTurn(cold.state, cold.activeScenario, 'option_b', STATIC_SCENARIOS);
    assert.match(resolved.historyEntry.choiceText, /Jackson at headquarters/);
    assert.equal(resolved.nextScenario.id, 'gettysburg_with_jackson_setup');
  });
}

for (const fieldResult of fieldOutcomes) {
  test(`flank A with ${fieldResult} reports its recorded field outcome and preserves campaign choices`, () => {
    const result = arriveWithFieldResult(fieldResult);
    const beforeState = structuredClone(result.state), beforeScenario = structuredClone(aftermath);
    assert.equal(result.nextScenario.id, aftermath.id);
    assert.equal(result.historyEntry.battleResult.result, fieldResult);
    assert.equal(result.nextScenario.actor, aftermath.actor);
    assertChoiceMechanicsPreserved(result.nextScenario);
    if (failedFlankAssertions[fieldResult]) {
      assert.match(result.nextScenario.description, failedFlankAssertions[fieldResult]);
      assert.ok(result.nextScenario.description.includes(fieldResult.replaceAll('-', ' ')));
      assert.doesNotMatch(result.nextScenario.title, /Breakthrough/);
      assert.doesNotMatch(result.nextScenario.description, /march has reached the Union flank|Howard's XI Corps is exposed|Lee waits with a thin line/);
      assert.match(result.nextScenario.description, /alternate campaign/i);
      for (const choice of result.nextScenario.choices) {
        assert.doesNotMatch(choice.text, /after the flank rupture|Exploit the victory|exposed XI Corps|before Hooker can retreat/);
        assert.doesNotMatch(choice.consequence, /Union right collapses|battlefield success becomes/);
        const resolved = advanceCampaignTurn(result.state, aftermath, choice.id, STATIC_SCENARIOS);
        const historical = advanceCampaignTurn({ ...result.state, history: [] }, aftermath, choice.id, STATIC_SCENARIOS);
        assert.equal(resolved.historyEntry.choiceText, choice.text, 'the canonical caller records the contextual order');
        assert.equal(resolved.historyEntry.consequence, choice.consequence);
        const { resolvedConsequence: contextualConsequence, ...contextualEffects } = resolved.ticked;
        const { resolvedConsequence: historicalConsequence, ...historicalEffects } = historical.ticked;
        assert.deepEqual(contextualEffects, historicalEffects, 'context must not change the campaign effects');
        assert.equal(resolved.nextScenario.id, historical.nextScenario.id, 'context must not change the route');
      }
    } else {
      assert.deepEqual(result.nextScenario, aftermath, 'recorded wins retain the exact historical wording');
    }
    assert.deepEqual(getCampaignScenario(result.state, aftermath), result.nextScenario);
    assert.deepEqual(getCampaignScenario(result.state, result.nextScenario), result.nextScenario, 'context is idempotent');
    assert.deepEqual(result.state, beforeState); assert.deepEqual(aftermath, beforeScenario);
  });

  test(`flank A ${fieldResult} survives a cold v21 save with its authored aftermath and recorded result intact`, () => {
    const result = arriveWithFieldResult(fieldResult, 17);
    const snapshot = createCampaignSnapshot(result.state, aftermath); snapshot.version = 21;
    const before = plain(snapshot);
    const cold = restoreCampaignFromSnapshot(plain(snapshot), STATIC_SCENARIOS);
    assert.ok(cold);
    assert.equal(cold.migratedFromVersion, 21);
    assert.deepEqual(cold.activeScenario, aftermath, 'the old authored scenario is resolved from the campaign bundle');
    const contextual = getCampaignScenario(cold.state, getScenarioForState(cold.state, STATIC_SCENARIOS));
    if (failedFlankAssertions[fieldResult]) assert.match(contextual.description, failedFlankAssertions[fieldResult]);
    else assert.deepEqual(contextual, aftermath);
    assertChoiceMechanicsPreserved(contextual);
    assert.deepEqual(cold.state.history.at(-1).battleResult, before.state.history.at(-1).battleResult);
    assert.deepEqual(cold.state.battleCampaign, before.state.battleCampaign);
    assert.deepEqual(snapshot, before, 'context and restoration do not rewrite the legacy save');
    const resolved = advanceCampaignTurn(cold.state, cold.activeScenario, 'option_b', STATIC_SCENARIOS);
    assert.equal(resolved.nextScenario.id, 'gettysburg_with_jackson_setup');
    assert.equal(resolved.historyEntry.choiceText, contextual.choices.find(choice => choice.id === 'option_b').text);
  });
}

test('an actual unsuccessful flank A field command reaches causal aftermath and the Jackson-survival route', () => {
  const state = { ...createFreshCampaignState(1861, maneuver.id, { difficulty: 'story' }), currentTurn: 10 };
  const battle = battleForScenario(maneuver, state);
  const engine = new CivilWarBattleEngine(battle.id, state, 'option_a');
  // Leave the concealed march without attack orders until its existing field
  // rules resolve the missed opportunity, rather than choosing a result here.
  for (let step = 0; step < 5000 && engine.outcome === 'undecided'; step += 1) engine.tick(0.05);
  const snapshot = engine.snapshot();
  assert.ok(failedFlankAssertions[snapshot.outcome], `field commands should end unsuccessfully, received ${snapshot.outcome}`);
  const field = {
    battleId: battle.id, scenarioId: maneuver.id, choiceId: 'option_a',
    result: snapshot.outcome, score: snapshot.score,
    confederateLossRate: snapshot.confederateLossRate, unionLossRate: snapshot.unionLossRate,
    delegated: false, battleRulesVersion: state.battleRulesVersion,
  };
  const applied = applyBattleResolution(state, field);
  const arrived = advanceCampaignTurn(applied, maneuver, 'option_a', STATIC_SCENARIOS, battleChoiceSuccessModifier(battle, 'option_a', field.result));
  assert.equal(arrived.nextScenario.id, aftermath.id);
  assert.match(arrived.nextScenario.description, failedFlankAssertions[field.result]);
  assert.deepEqual(arrived.historyEntry.battleResult, applied.battleCampaign.results[maneuver.id]);
  const resolved = advanceCampaignTurn(arrived.state, aftermath, 'option_b', STATIC_SCENARIOS);
  assert.equal(resolved.nextScenario.id, 'gettysburg_with_jackson_setup');
  assert.match(resolved.historyEntry.choiceText, /Jackson at headquarters/);
});

test('legacy historical flank choice, missing history, unknown result, unknown choice and unrelated scenario retain the exact authored default', () => {
  const a = arrive('option_a');
  assert.deepEqual(a.nextScenario, aftermath);
  const legacy = createCampaignSnapshot(a.state, aftermath); legacy.version = 21; legacy.state.battleRulesVersion = 17;
  const cold = restoreCampaignFromSnapshot(plain(legacy), STATIC_SCENARIOS);
  assert.ok(cold);
  assert.equal(cold.migratedFromVersion, 21);
  assert.equal(cold.state.history.at(-1).battleResult, null);
  assert.equal(getCampaignScenario(cold.state, cold.activeScenario), aftermath);
  for (const result of ['unrecorded', 'toString']) {
    const unrecordedResult = { ...a.state, history: [{ ...a.historyEntry, battleResult: { result } }] };
    assert.equal(getCampaignScenario(unrecordedResult, aftermath), aftermath);
  }
  const fresh = createFreshCampaignState(1861, aftermath.id, { difficulty: 'story' });
  assert.equal(getCampaignScenario(fresh, aftermath), aftermath);
  const unknown = { ...fresh, history: [{ scenarioId: maneuver.id, choiceId: 'unrecorded' }] };
  assert.equal(getCampaignScenario(unknown, aftermath), aftermath);
  assert.equal(getCampaignScenario(a.state, STATIC_SCENARIOS[0]).id, STATIC_SCENARIOS[0].id);
});

test('only the most recent maneuver choice supplies the context and applying it twice stays deterministic', () => {
  const b = arrive('option_b'), c = arrive('option_c');
  const state = { ...c.state, history: [b.historyEntry, c.historyEntry] };
  const first = getCampaignScenario(state, aftermath), second = getCampaignScenario(state, first);
  assert.match(first.description, assertions.option_c); assert.doesNotMatch(first.description, assertions.option_b);
  assert.deepEqual(first, second);
  const failed = arriveWithFieldResult('defeat'), victorious = arriveWithFieldResult('decisive-win');
  const recovered = { ...victorious.state, history: [failed.historyEntry, victorious.historyEntry] };
  assert.equal(getCampaignScenario(recovered, aftermath), aftermath, 'an earlier failed flank must not override the latest victory');
});

test('the real App scenario memo observes history changes that can change branch context', () => {
  const source = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(source, /getCampaignScenario\(gameState, storedScenario\), \[gameState\.rulesVersion, gameState\.history, storedScenario\]/);
});
