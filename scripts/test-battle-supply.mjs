import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { BATTLE_ENGINE_CONFIGS } from '../src/battle/battleDefinitions.js';
import { BATTLE_SCENARIOS, applyBattleResolution, battleReadiness, delegateBattle } from '../src/game/battles.js';
import { getBattleSupplyProfile } from '../src/game/campaignSupply.js';
import { isBattleAssessment } from '../src/battle/battleAssessment.js';

const campaign = (rulesVersion, munitions = 0, foodSupply = 20) => ({
  ...(rulesVersion === undefined ? {} : { rulesVersion }),
  metrics: { militaryStrength: 65, publicMorale: 65, treasury: 60, munitions, foodSupply },
});

test('all 44 manual postures use the shared new-rule ammunition allocation and preserve every other deployment value', () => {
  for (const [id, config] of Object.entries(BATTLE_ENGINE_CONFIGS)) for (const choice of Object.keys(config.postures)) {
    for (const reserve of [0, 30, 60, 100]) {
      const oldEngine = new CivilWarBattleEngine(id, campaign(1, reserve), choice);
      const newState = campaign(2, reserve);
      const newEngine = new CivilWarBattleEngine(id, newState, choice);
      const multiplier = getBattleSupplyProfile(newState).ammunitionMultiplier;
      for (const unit of newEngine.state) {
        const legacy = oldEngine.state.find((item) => item.id === unit.id);
        const expected = unit.side === 'confederate' ? Math.max(1, Math.round(legacy.initialAmmunition * multiplier)) : legacy.initialAmmunition;
        assert.equal(unit.initialAmmunition, expected, `${id}:${choice}:${reserve}:${unit.id}`);
        assert.equal(unit.ammunition, expected);
        const omitAmmunition = ({ ammunition, initialAmmunition, ...rest }) => rest;
        assert.deepEqual(omitAmmunition(unit), omitAmmunition(legacy), 'supply must not apply a second troop, morale or cohesion penalty');
      }
      assert.ok(isBattleAssessment(newEngine.snapshot().assessment));
    }
  }
});

test('missing and explicit legacy rules reproduce identical manual snapshots after combat and identical delegation', () => {
  for (const battle of Object.values(BATTLE_SCENARIOS)) for (const choice of ['option_a', 'option_b', 'option_c', 'option_d']) {
    const old = new CivilWarBattleEngine(battle.id, campaign(undefined), choice);
    const explicit = new CivilWarBattleEngine(battle.id, campaign(1), choice);
    for (let step = 0; step < 900; step += 1) { old.tick(0.05); explicit.tick(0.05); }
    assert.deepEqual(explicit.snapshot(), old.snapshot());
    assert.equal(old.snapshot().assessment, undefined);
    assert.deepEqual(delegateBattle(campaign(1), battle, choice), delegateBattle(campaign(undefined), battle, choice));
    assert.equal(battleReadiness(campaign(1), choice, battle).supplyProfile, undefined);
  }
});

test('all 44 delegated choices apply one shared shortage penalty before resolving the result', () => {
  for (const battle of Object.values(BATTLE_SCENARIOS)) for (const choice of ['option_a', 'option_b', 'option_c', 'option_d']) {
    const low = campaign(2);
    const profile = getBattleSupplyProfile(low);
    const old = delegateBattle(campaign(1), battle, choice);
    const revised = delegateBattle(low, battle, choice);
    assert.ok(old.score > profile.readinessPenalty + profile.foodPenalty && old.score < 100, 'fixture stays away from score clamping boundaries');
    assert.equal(revised.score, old.score - profile.readinessPenalty - profile.foodPenalty);
    const rich = delegateBattle(campaign(2, 60, 40), battle, choice);
    const { assessment, ...unchanged } = rich;
    assert.deepEqual(unchanged, delegateBattle(campaign(1, 60, 40), battle, choice), 'fully supplied delegation retains its prior outcome and score');
    assert.ok(isBattleAssessment(assessment));
  }
});

test('the shortage has an observable sustained-fire consequence and a visible delegated outcome consequence', () => {
  const battle = BATTLE_SCENARIOS.manassas_battlefield;
  const old = new CivilWarBattleEngine(battle.id, campaign(1), 'option_b');
  const limited = new CivilWarBattleEngine(battle.id, campaign(2), 'option_b');
  for (let step = 0; step < 1600; step += 1) { old.tick(0.05); limited.tick(0.05); }
  const oldFront = old.state.find((unit) => unit.id === 'bee-evans-line');
  const limitedFront = limited.state.find((unit) => unit.id === 'bee-evans-line');
  assert.equal(limitedFront.ammunition, 0);
  assert.ok(oldFront.ammunition > 0);
  assert.ok(oldFront.volleySerial > limitedFront.volleySerial, 'empty ammunition reduces sustained fire rather than merely relabeling supply');
  assert.equal(delegateBattle(campaign(1), battle, 'option_b').result, 'costly-win');
  assert.equal(delegateBattle(campaign(2), battle, 'option_b').result, 'defeat');
  assert.match(limited.events.find((event) => event.type === 'supply').message, /35%.*19 supply penalty points/);
});

test('new-rule battle costs remain recorded as obligations at zero reserves and cannot be applied twice', () => {
  const before = { ...campaign(2), campaignEconomy: { treasuryArrears: 0, munitionsArrears: 2, emergencyUsed: 0 }, currentTurn: 2 };
  const resolution = { battleId: 'first_manassas', scenarioId: 'manassas_battlefield', result: 'costly-win', score: 60 };
  const after = applyBattleResolution(before, resolution);
  assert.equal(after.metrics.munitions, 0);
  assert.equal(after.campaignEconomy.munitionsArrears, 6, 'four battle supply points are added to the existing obligation');
  assert.equal(after.campaignEconomy.treasuryArrears, 0);
  assert.equal(after.metrics.militaryStrength, before.metrics.militaryStrength - 2);
  assert.equal(applyBattleResolution(after, resolution), after);
  const legacy = applyBattleResolution({ ...before, rulesVersion: 1 }, resolution);
  assert.deepEqual(legacy.campaignEconomy, before.campaignEconomy, 'legacy costs retain their previous clamp semantics');
});
