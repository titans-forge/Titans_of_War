import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appHarness, campaign, CivilWarBattleEngine, field, fixture, scenario } from './test-support/fieldSuspendHarness.mjs';
import { loadFieldSuspension, saveFieldSuspension } from '../src/game/fieldSuspendSave.js';
import { createPracticeState } from '../src/game/practiceConditions.js';

const campaignKey = campaign.CAMPAIGN_STORAGE_KEY;
const fieldKey = field.FIELD_CHECKPOINT_KEY;
const resolve = 'handleBattleResolution({result:"victory"})';

function replacePair(f, seed) {
  const state = { ...f.state, seed };
  const engine = new CivilWarBattleEngine(f.battle.id, state, f.pending.choiceId);
  engine.tick(0.6);
  saveFieldSuspension(campaign.createCampaignSnapshot(state, scenario), { ...f.pending, baseState: state }, engine.checkpoint(), state, f.storage);
  assert.equal(loadFieldSuspension(f.storage).pending.resumeState.seed, seed);
  return f.pair();
}

for (const command of ['discardBattle()', 'closeBattle()', resolve]) {
  for (const differentCampaign of [false, true]) {
    test(`stale ${command} preserves a newer field for the ${differentCampaign ? 'other' : 'same'} campaign`, () => {
      const f = fixture();
      const app = appHarness(f);
      if (command !== 'discardBattle()') app.run('resumeBattle()');
      const before = app.context.gameState, pending = app.context.pendingBattle;
      const previous = f.pair();
      const newer = replacePair(f, differentCampaign ? 1862 : 1861);
      assert.notEqual(previous[1], newer[1]);
      f.operations.length = 0;

      if (command === 'closeBattle()') assert.throws(() => app.run(command), /changed since this battle was loaded/);
      else {
        app.run(command);
        assert.match(app.context.operationError, /changed since this battle was loaded/);
      }
      app.run('runAutosave()');
      assert.deepEqual(f.pair(), newer);
      assert.equal(f.operations.length, 0);
      assert.equal(app.context.gameState, before);
      assert.equal(app.context.pendingBattle, pending);
    });
  }
}

for (const command of ['discardBattle()', 'closeBattle()', resolve]) {
  test(`owned ${command} completes before autosave and does not repeat the write`, () => {
    const f = fixture();
    const app = appHarness(f);
    if (command !== 'discardBattle()') app.run('resumeBattle()');
    app.run(command);
    assert.equal(app.context.operationError, '');
    assert.equal(app.context.fieldOwnerRef.current, null);
    assert.equal(app.context.pendingBattle?.checkpoint ?? null, null);
    assert.equal(f.storage.getItem(fieldKey), null);
    const settled = JSON.parse(f.storage.getItem(campaignKey));
    assert.equal(settled.state.currentTurn, command === resolve ? 2 : 1);
    if (command === resolve) {
      assert.equal(settled.state.pendingDebrief.title, scenario.title);
      assert.equal(appHarness(f).context.gameState.pendingDebrief.title, scenario.title);
    }

    const newPair = replacePair(f, 1862);
    f.operations.length = 0;
    app.run('runAutosave()');
    assert.equal(f.operations.length, 0);
    assert.deepEqual(f.pair(), newPair);
  });
}

test('field removal failure rolls back the campaign settlement before changing the live battle', () => {
  const f = fixture();
  const app = appHarness(f), pair = f.pair();
  app.run('resumeBattle()');
  f.controls.hook = (op, key) => { if (op === 'remove' && key === fieldKey) throw new Error('Blocked removal'); };
  app.run(resolve);
  app.run('runAutosave()');
  assert.match(app.context.operationError, /Blocked removal/);
  assert.equal(app.context.gameState.currentTurn, 1);
  assert.equal(app.context.pendingBattle.mode, 'fight');
  assert.deepEqual(f.pair(), pair);

  f.controls.hook = null;
  app.run(resolve);
  assert.equal(app.context.gameState.currentTurn, 2);
  assert.equal(app.context.pendingBattle, null);
  assert.equal(f.storage.getItem(fieldKey), null);
});

test('a fresh battle can save, cold resume, save again, and settle its campaign', () => {
  const f = fixture({ old: false });
  const app = appHarness(f);
  app.context.gameState = f.state;
  app.context.activeScenario = scenario;
  app.context.pendingBattle = f.pending;
  app.context.resumeState = f.state;
  app.context.checkpoint = f.engine.checkpoint();
  app.run('handleSuspendBattle(checkpoint,resumeState)');
  const first = f.pair();

  const resumed = appHarness(f);
  resumed.run('resumeBattle()');
  f.engine.tick(0.4);
  resumed.context.resumeState = f.state;
  resumed.context.checkpoint = f.engine.checkpoint();
  resumed.run('handleSuspendBattle(checkpoint,resumeState)');
  assert.notEqual(f.pair()[1], first[1]);

  const finished = appHarness(f);
  finished.run('resumeBattle()');
  finished.run(resolve);
  assert.equal(finished.context.gameState.currentTurn, 2);
  assert.equal(f.storage.getItem(fieldKey), null);
  assert.equal(appHarness(f).context.gameState.history.length, 1);
});

test('finishing owned practice keeps the campaign bytes and reports the result', () => {
  const f = fixture({ old: false });
  const practiceState = createPracticeState({ id: f.battle.scenarioId, turn: 13 });
  const engine = new CivilWarBattleEngine(f.battle.id, practiceState, f.pending.choiceId);
  const pending = { battle: f.battle, choiceId: f.pending.choiceId, practice: true, practiceState, mode: 'fight' };
  saveFieldSuspension(campaign.createCampaignSnapshot(f.state, scenario), pending, engine.checkpoint(), practiceState, f.storage);
  const raw = f.storage.getItem(campaignKey);
  const resumed = appHarness(f);
  resumed.run('resumeBattle()');
  resumed.run(resolve);
  resumed.run('runAutosave()');
  assert.equal(f.storage.getItem(campaignKey), raw);
  assert.equal(f.storage.getItem(fieldKey), null);
  assert.equal(resumed.context.practiceResult.result, 'victory');
  assert.equal(resumed.context.gameState.history.length, 0);
});

test('owned settlement persists the branch commander and debrief before the next campaign edit', () => {
  const f = fixture({ old: false });
  const opening = { ...scenario, choices: scenario.choices.map(choice => ({ ...choice, next: 'relief_fixture' })) };
  const next = { ...scenario, id: 'relief_fixture', title: 'Relief decision', turn: 2, actor: 'Relief commander' };
  const linear = { ...next, id: 'linear_fixture' };
  const scenarios = [opening, linear, next];
  saveFieldSuspension(campaign.createCampaignSnapshot(f.state, opening), f.pending, f.engine.checkpoint(), f.state, f.storage);
  const resumed = appHarness(f);
  resumed.context.STATIC_SCENARIOS = scenarios;
  resumed.context.activeScenario = opening;
  resumed.run('resumeBattle()');
  resumed.run(resolve);

  const save = campaign.loadCampaignSnapshot(f.storage);
  const restored = campaign.restoreCampaignFromSnapshot(save, scenarios);
  assert.equal(resumed.context.activeScenario.id, next.id);
  assert.equal(save.state.actor, next.actor);
  assert.equal(restored.state.pendingDebrief.nextTitle, next.title);
  assert.equal(restored.activeScenario.id, next.id);
  assert.equal(resumed.context.skipNextScenarioEffect.current, true);

  resumed.run('setGameState(current => ({ ...current, pendingDebrief: null }))');
  resumed.run('runAutosave()');
  assert.equal(campaign.loadCampaignSnapshot(f.storage).state.pendingDebrief, null);
});
