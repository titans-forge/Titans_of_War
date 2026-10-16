import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { BATTLE_SCENARIOS } from '../src/game/battles.js';
import {
  CAMPAIGN_SAVE_VERSION, CAMPAIGN_STORAGE_KEY, createFreshCampaignState,
  createCampaignSnapshot, getCampaignSnapshotCompatibility, restoreCampaignFromSnapshot,
  saveCampaignSnapshot,
} from '../src/game/campaignStorage.js';
import { createPracticeState } from '../src/game/practiceConditions.js';
import { saveFieldCheckpoint, loadFieldCheckpoint, FIELD_CHECKPOINT_KEY } from '../src/game/fieldCheckpoint.js';

const json = value => JSON.parse(JSON.stringify(value));
const scene = { id: 'gettysburg', title: 'Gettysburg', turn: 1, choices: [{ id: 'option_a', text: 'Command the field.' }] };
const battle = BATTLE_SCENARIOS.gettysburg_decision;
const campaignFor = version => ({ ...createPracticeState(scene), battleRulesVersion: version });
const tick = (engine, count) => { for (let i = 0; i < count; i++) engine.tick(.05); };
const pickett = engine => engine.state.find(unit => unit.id === 'pickett-division');
const storageFor = raw => {
  const map = new Map([[CAMPAIGN_STORAGE_KEY, raw]]);
  return { map, storage: { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) } };
};
const pending = campaign => ({ battle, choiceId: 'option_a', practice: true, practiceState: campaign, mode: 'fight' });
function opening(engine) {
  engine.face('pickett-division', { x: 430, y: 870 }); tick(engine, 540);
  engine.move('pickett-division', { x: 850, y: 500 });
}
function activeDetour() {
  const campaign = campaignFor(18), engine = new CivilWarBattleEngine('gettysburg', campaign, 'option_a');
  opening(engine);
  for (let i = 0; i < 2100; i++) {
    engine.tick(.05);
    const unit = pickett(engine);
    if (unit.active && unit.retreatRoute?.length) return { campaign, engine };
  }
  assert.fail('Public Gettysburg practice must exercise a real active retreat detour before field minute 132.');
}

test('fresh campaigns and practice explicitly use rules18; legacy rules1 stay opt-in and future rules reject', () => {
  assert.equal(CAMPAIGN_SAVE_VERSION, 22);
  assert.equal(createFreshCampaignState(1861).battleRulesVersion, 18);
  assert.equal(createPracticeState(scene).battleRulesVersion, 18);
  assert.equal(new CivilWarBattleEngine('gettysburg', campaignFor(18), 'option_a').battleRulesVersion, 18);
  assert.equal(createFreshCampaignState(1861, null, { rulesVersion: 1 }).battleRulesVersion, 1);
  assert.equal(new CivilWarBattleEngine('gettysburg', {}, 'option_a').battleRulesVersion, 1);
  for (const version of [0, 19, 99, 17.5, '18', null]) {
    assert.throws(() => createFreshCampaignState(1861, null, { battleRulesVersion: version }), /Unsupported/);
    assert.throws(() => new CivilWarBattleEngine('gettysburg', { battleRulesVersion: version }, 'option_a'), /Unsupported/);
  }
});

test('a real envelope21/rules17 archive loads and resaves without changing tactical rules or its original raw backup', () => {
  const legacyCampaign = campaignFor(17), legacy = createCampaignSnapshot(legacyCampaign, scene); legacy.version = 21;
  const raw = JSON.stringify(legacy, null, 2), before = json(legacy), { storage, map } = storageFor(raw);
  assert.equal(getCampaignSnapshotCompatibility(legacy).ok, true);
  const restored = restoreCampaignFromSnapshot(json(JSON.parse(raw)), [scene]);
  assert.equal(restored.migratedFromVersion, 21);
  assert.equal(restored.state.battleRulesVersion, 17);
  assert.deepEqual(legacy, before);
  const engine = new CivilWarBattleEngine('gettysburg', restored.state, 'option_a');
  assert.equal(engine.battleRulesVersion, 17);
  assert.ok(engine.state.every(unit => !Object.hasOwn(unit, 'retreatRoute')));
  const current = createCampaignSnapshot(restored.state, restored.activeScenario);
  assert.equal(current.version, 22); assert.equal(current.state.battleRulesVersion, 17);
  assert.equal(saveCampaignSnapshot(current, storage).ok, true);
  assert.equal(JSON.parse(map.get(CAMPAIGN_STORAGE_KEY)).state.battleRulesVersion, 17);
  assert.deepEqual([...map].filter(([key]) => key.includes(':recovery:')).map(([, value]) => value), [raw]);
  assert.equal(restoreCampaignFromSnapshot(json(current), [scene]).state.battleRulesVersion, 17);
});

test('envelope22/rules18 JSON export-import preserves all campaign data and leaves the portable input unchanged', () => {
  const current = createCampaignSnapshot(campaignFor(18), scene), before = json(current);
  assert.equal(getCampaignSnapshotCompatibility(current).ok, true);
  const restored = restoreCampaignFromSnapshot(JSON.parse(JSON.stringify(current)), [scene]);
  assert.deepEqual(restored.state, { ...current.state, pendingDebrief: null });
  assert.equal(restored.migratedFromVersion, null);
  assert.equal(new CivilWarBattleEngine('gettysburg', restored.state, 'option_a').battleRulesVersion, 18);
  assert.deepEqual(current, before);
});

test('old envelopes reject rules18 in state and either result ledger, and future envelopes preserve the original autosave', () => {
  for (const place of ['state', 'history', 'battleCampaign']) {
    const archive = createCampaignSnapshot(campaignFor(17), scene); archive.version = 21;
    const result = { battleId: 'gettysburg', scenarioId: scene.id, choiceId: 'option_a', result: 'decisive-win', score: 100, battleRulesVersion: 18 };
    if (place === 'state') archive.state.battleRulesVersion = 18;
    if (place === 'history') archive.state.history.push({ scenarioId: scene.id, choiceId: 'option_a', battleResult: result });
    if (place === 'battleCampaign') archive.state.battleCampaign.results.gettysburg = result;
    const { storage, map } = storageFor('original raw');
    assert.equal(getCampaignSnapshotCompatibility(archive).ok, false, place);
    assert.equal(restoreCampaignFromSnapshot(archive, [scene]), null);
    assert.equal(saveCampaignSnapshot(archive, storage).ok, false);
    assert.equal(map.get(CAMPAIGN_STORAGE_KEY), 'original raw');
    archive.version = 22;
    assert.equal(getCampaignSnapshotCompatibility(archive).ok, true, 'the new envelope explicitly admits recorded18');
  }
  for (const mutate of [s => s.version = 23, s => s.state.battleRulesVersion = 19]) {
    const archive = createCampaignSnapshot(campaignFor(18), scene); mutate(archive);
    const { storage, map } = storageFor('original raw');
    assert.equal(getCampaignSnapshotCompatibility(archive).ok, false);
    assert.equal(saveCampaignSnapshot(archive, storage).ok, false);
    assert.equal(map.get(CAMPAIGN_STORAGE_KEY), 'original raw');
  }
});

test('the pinned rules17 congestion replay and its JSON field checkpoint preserve the pre-upgrade trajectory exactly', () => {
  const campaign = campaignFor(17), engine = new CivilWarBattleEngine('gettysburg', campaign, 'option_a');
  opening(engine); tick(engine, 1860); // field120: the existing friendly corridor obstruction.
  const unit = pickett(engine);
  assert.equal(unit.active, true); assert.equal(unit.status, 'routing'); assert.equal(unit.path, null);
  assert.match(unit.pressureReason, /Route blocked by formations/);
  assert.ok(!Object.hasOwn(unit, 'retreatRoute'));
  const archive = createCampaignSnapshot(campaign, scene); archive.version = 21;
  const { storage, map } = storageFor(JSON.stringify(archive));
  const raw = map.get(CAMPAIGN_STORAGE_KEY), saved = json(engine.checkpoint());
  saveFieldCheckpoint(pending(campaign), saved, campaign, storage);
  const loaded = loadFieldCheckpoint(storage);
  assert.equal(loaded.error, null); assert.equal(loaded.pending.resumeState.battleRulesVersion, 17);
  assert.deepEqual(loaded.pending.checkpoint, saved);
  const cold = CivilWarBattleEngine.fromCheckpoint(json(loaded.pending.checkpoint), 'gettysburg', loaded.pending.resumeState, 'option_a');
  tick(engine, 200); tick(cold, 200); assert.deepEqual(cold.checkpoint(), engine.checkpoint());
  // Captured from the pre-upgrade public practice replay; do not regenerate from the new implementation.
  assert.equal(createHash('sha256').update(JSON.stringify(engine.checkpoint())).digest('hex'),
    '79523fb0fbd0fa1d2f60d3ec4eb4b010103ee38aa5309ffee1572d0b8e323b1a');
  assert.equal(map.get(CAMPAIGN_STORAGE_KEY), raw);
});

test('an actual rules18 detour survives JSON storage, cold revival and repeated resaving exactly through the result freeze', () => {
  const { campaign, engine } = activeDetour();
  assert.ok(pickett(engine).retreatRoute.length > 0);
  const saved = json(engine.checkpoint()), inputBefore = json(saved);
  const { storage, map } = storageFor(JSON.stringify(createCampaignSnapshot(campaign, scene)));
  const campaignRaw = map.get(CAMPAIGN_STORAGE_KEY);
  saveFieldCheckpoint(pending(campaign), saved, campaign, storage);
  const loaded = loadFieldCheckpoint(storage); assert.equal(loaded.error, null);
  assert.deepEqual(loaded.pending.checkpoint, saved);
  let cold = CivilWarBattleEngine.fromCheckpoint(json(loaded.pending.checkpoint), 'gettysburg', loaded.pending.resumeState, 'option_a');
  assert.deepEqual(cold.checkpoint(), saved); assert.deepEqual(saved, inputBefore);
  for (let i = 0; i < 6000 && engine.outcome === 'undecided'; i++) {
    engine.tick(.05); cold.tick(.05);
    if (i % 137 === 0) cold = CivilWarBattleEngine.fromCheckpoint(json(cold.checkpoint()), 'gettysburg', campaign, 'option_a');
    assert.deepEqual(cold.checkpoint(), engine.checkpoint());
  }
  assert.notEqual(engine.outcome, 'undecided');
  const final = json(engine.checkpoint()); cold = CivilWarBattleEngine.fromCheckpoint(final, 'gettysburg', campaign, 'option_a');
  const before = cold.checkpoint();
  tick(cold, 100); cold.order('pickett-division', 'hold'); cold.move('pickett-division', { x: 700, y: 700 });
  assert.deepEqual(cold.checkpoint(), before, 'terminal combat and route data freeze together');
  assert.equal(map.get(CAMPAIGN_STORAGE_KEY), campaignRaw);
});

test('malformed route checkpoints and mismatched rules reject without overwriting their stored evidence', () => {
  const { campaign, engine } = activeDetour(), original = json(engine.checkpoint());
  assert.throws(() => CivilWarBattleEngine.fromCheckpoint(original, 'gettysburg', campaignFor(17), 'option_a'), /Unsupported/);
  const invalid = [
    u => delete u.retreatRoute,
    u => u.retreatRoute = [null],
    u => u.retreatRoute = Array.from({ length: 65 }, () => ({ x: 850, y: 800 })),
    u => u.retreatRoute = [{ x: 0, y: 850 }],
    u => u.retreatRoute = [{ x: 850, y: 886 }],
    u => u.retreatRoute = [{ x: '850', y: 800 }],
    u => u.retreatRoute = [{ x: 850, y: 800, injected: true }],
    u => u.retreatRouteKey = 'not,a,route',
    u => u.retreatRouteKey = Array(42).fill('1').join(''),
    u => u.retreatReplanAt = -1,
    u => u.retreatReplanAt = 246,
  ];
  for (const mutate of invalid) {
    const checkpoint = json(original); mutate(checkpoint.state.state.find(u => u.id === 'pickett-division'));
    const { storage, map } = storageFor(JSON.stringify(createCampaignSnapshot(campaign, scene)));
    saveFieldCheckpoint(pending(campaign), checkpoint, campaign, storage);
    const raw = map.get(FIELD_CHECKPOINT_KEY), campaignRaw = map.get(CAMPAIGN_STORAGE_KEY);
    assert.throws(() => CivilWarBattleEngine.fromCheckpoint(checkpoint, 'gettysburg', campaign, 'option_a'), /retreat route checkpoint/);
    assert.match(loadFieldCheckpoint(storage).error, /retreat route checkpoint/);
    assert.equal(map.get(FIELD_CHECKPOINT_KEY), raw); assert.equal(map.get(CAMPAIGN_STORAGE_KEY), campaignRaw);
  }
  const legacy = json(original); legacy.state.battleRulesVersion = 17;
  assert.throws(() => CivilWarBattleEngine.fromCheckpoint(legacy, 'gettysburg', campaignFor(17), 'option_a'), /requires Gettysburg battle rules 18/);
  for (const mutate of [checkpoint => checkpoint.version = 2,
    checkpoint => checkpoint.state.battleRulesVersion = 17, checkpoint => checkpoint.state.battleRulesVersion = 19]) {
    const checkpoint = json(original); mutate(checkpoint);
    const { storage, map } = storageFor(JSON.stringify(createCampaignSnapshot(campaign, scene)));
    saveFieldCheckpoint(pending(campaign), checkpoint, campaign, storage);
    const raw = map.get(FIELD_CHECKPOINT_KEY);
    assert.match(loadFieldCheckpoint(storage).error, /Unsupported or incomplete/);
    assert.equal(map.get(FIELD_CHECKPOINT_KEY), raw);
  }
  const nonPilot = new CivilWarBattleEngine('first_manassas', campaign, 'option_b').checkpoint();
  Object.assign(nonPilot.state.state[0], { retreatRoute: null, retreatRouteKey: null, retreatReplanAt: 0 });
  assert.throws(() => CivilWarBattleEngine.fromCheckpoint(nonPilot, 'first_manassas', campaign, 'option_b'), /requires Gettysburg battle rules 18/);
});

for (const battle of Object.values(BATTLE_SCENARIOS).filter(b => b.id !== 'gettysburg')) {
  test(`${battle.id}: rules18 leaves non-pilot formation movement, damage and command replay identical to17`, () => {
    const old = new CivilWarBattleEngine(battle.id, campaignFor(17), 'option_b');
    const current = new CivilWarBattleEngine(battle.id, campaignFor(18), 'option_b');
    for (let i = 0; i < 800; i++) {
      if (i === 10 || i === 150) for (const engine of [old, current]) {
        const unit = engine.state.find(u => u.side === 'confederate' && u.active);
        engine.order(unit.id, i === 10 ? 'advance' : 'withdraw');
      }
      old.tick(.05); current.tick(.05);
      assert.deepEqual(current.state, old.state);
      assert.deepEqual(current.events, old.events);
      assert.equal(current.time, old.time); assert.equal(current.outcome, old.outcome);
    }
    assert.ok(current.state.every(unit => !Object.hasOwn(unit, 'retreatRoute')));
    assert.deepEqual(CivilWarBattleEngine.fromCheckpoint(json(current.checkpoint()), battle.id, campaignFor(18), 'option_b').checkpoint(), current.checkpoint());
  });
}
