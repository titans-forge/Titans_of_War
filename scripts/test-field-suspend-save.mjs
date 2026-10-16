import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { parseAst } from 'rolldown/parseAst';
import { fixture, appHarness, campaign, field, CivilWarBattleEngine, INITIAL_STATE, scenario } from './test-support/fieldSuspendHarness.mjs';
import { loadFieldSuspension, saveFieldSuspension } from '../src/game/fieldSuspendSave.js';
import { createPracticeState } from '../src/game/practiceConditions.js';
import { advanceCampaignTurn } from '../src/game/headlessCampaign.js';
import { checkpointRepairMigrationLedger, validateCheckpointRepairLedger, assertHistoricalCheckpointRepairFile } from './test-support/checkpointRepairPreservation.mjs';
import { v31BeforeFile } from './test-support/gettysburgV31Preservation.mjs';

const { CAMPAIGN_STORAGE_KEY: C } = campaign, { FIELD_CHECKPOINT_KEY: F } = field;
const plain = value => JSON.parse(JSON.stringify(value));
function save(f) { f.engine.tick(.2); return saveFieldSuspension(f.snapshot(), f.pending, f.engine.checkpoint(), f.state, f.storage, f.owner); }
function failSave(f) { let failure; try { save(f); } catch (error) { failure = error; } assert.ok(failure, 'The forged/failed save must be rejected'); return failure; }
function assertPair(f, old) { assert.deepEqual(f.pair(), old); }
function actualSave(h, f) { h.context.checkpoint = f.engine.checkpoint(); h.context.resumeState = f.state; return h.run('handleSuspendBattle(checkpoint,resumeState)'); }
function practice(f) {
  const state = createPracticeState({ id: f.battle.scenarioId, turn: 13 }, 'reserve', 'full');
  const engine = new CivilWarBattleEngine(f.battle.id, state, 'option_a');
  engine.order('pickett-division', 'move', { x: 650, y: 600 });
  return { ...f, state, engine, pending: { battle: f.battle, choiceId: 'option_a', openingOrder: 'Charge the center',
    practice: true, mode: 'fight', practiceState: state } };
}
function advancedPractice(f, state) {
  field.clearFieldCheckpoint(f.storage);
  const advanced = advanceCampaignTurn(state, scenario, 'option_b', [scenario]);
  const snapshot = campaign.createCampaignSnapshot(advanced.state, advanced.nextScenario || scenario);
  assert.equal(campaign.saveCampaignSnapshot(snapshot, f.storage).ok, true);
  const next = practice(f);
  saveFieldSuspension(snapshot, next.pending, next.engine.checkpoint(), next.state, f.storage);
  assert.ok(loadFieldSuspension(f.storage).pending);
  return { ...next, campaign: advanced.state };
}

test('actual App binds Save & Leave to the staged pair helper and its checkpoint-owned autosave guard', () => {
  const h = appHarness(fixture());
  const handler = h.source.slice(h.suspend.init.start, h.suspend.init.end);
  assert.equal(handler.match(/saveFieldSuspension\(/g)?.length, 1);
  assert.equal(handler.includes('saveCampaignSnapshot('), false);
  assert.equal(handler.includes('saveFieldCheckpoint('), false);
  assert.ok(h.source.slice(h.effectCall.arguments[0].start, h.effectCall.arguments[0].end).includes('if (!isDemo && pendingBattle?.checkpoint) return;'));
  assert.ok(h.source.slice(h.effectCall.arguments[1].start, h.effectCall.arguments[1].end).includes('pendingBattle'));
  assert.match(h.source, /onSuspend=\{!isDemo && !archiveProtected \? handleSuspendBattle : undefined\}/);
  assert.match(h.source, /const fieldOwnerRef = useRef\(initialField.owner\)/);
  assert.match(handler, /undefined, fieldOwnerRef.current\)/);
});

test('repeated actual App reload/resume/autosave preserves fresh INITIAL_STATE normalization and engine orders', () => {
  const f = fixture({ freshInitial: true }); const old = f.pair();
  assert.equal(f.state.actor, INITIAL_STATE.actor);
  for (let restart = 0; restart < 12; restart++) {
    const h = appHarness(f);
    assert.ok(h.context.pendingBattle);
    assert.equal(h.context.gameState.actor, scenario.actor);
    assert.ok(Object.hasOwn(h.context.gameState, 'pendingDebrief'));
    assert.equal(Object.hasOwn(f.state, 'pendingDebrief'), false);
    h.run('runAutosave()'); h.run('resumeBattle()');
    assert.equal(h.context.pendingBattle.mode, 'fight');
    for (const name of ['selectedModel', 'archiveMessage', 'saveRetry']) { h.context[name] = `changed-${restart}`; h.run('runAutosave()'); }
    assertPair(f, old); assert.equal(f.operations.length, 0);
    const pending = field.loadFieldCheckpoint(f.storage).pending;
    const restored = CivilWarBattleEngine.fromCheckpoint(pending.checkpoint, pending.battle.id, pending.resumeState, pending.choiceId);
    assert.deepEqual(restored.checkpoint(), f.engine.checkpoint());
  }
});

test('actual App preserves owned checkpoint bytes through suspended/fight/resolving and status retries', () => {
  const f = fixture(); const old = f.pair(); const h = appHarness(f);
  for (const mode of ['suspended', 'fight', 'resolving']) {
    h.context.pendingBattle.mode = mode;
    h.context.gameState.statusMessage = `status ${mode}`;
    h.context.aiPortalEngaged = !h.context.aiPortalEngaged;
    h.context.selectedModel = mode; h.context.saveRetry++;
    h.run('runAutosave()'); assertPair(f, old);
  }
  assert.equal(f.operations.length, 0);
});

test('actual App successful Save & Leave creates owned suspension and survives repeated reloads after a second save', () => {
  const f = fixture({ old: false }); const h = appHarness(f);
  h.context.gameState = f.state; h.context.activeScenario = scenario; h.context.pendingBattle = f.pending;
  actualSave(h, f); assert.equal(h.context.pendingBattle.mode, 'suspended');
  assert.equal(field.loadFieldCheckpoint(f.storage).error, null);
  let saved = f.pair(); h.run('runAutosave()'); assertPair(f, saved);
  h.run('resumeBattle()'); f.engine.tick(.4);
  actualSave(h, f); assert.notEqual(f.pair()[1], saved[1]); saved = f.pair();
  for (let i = 0; i < 5; i++) { const reloaded = appHarness(f); reloaded.run('resumeBattle()'); reloaded.run('runAutosave()'); assertPair(f, saved); }
});

test('actual App remembered campaign owner rejects an identical deterministic practice belonging to an advanced real campaign', () => {
  const f = fixture({ old: false }), first = practice(f);
  const start = appHarness(f); start.context.gameState = f.state; start.context.activeScenario = scenario; start.context.pendingBattle = first.pending;
  actualSave(start, first);
  const a = appHarness(f); a.run('resumeBattle()');
  const previousOwner = a.context.fieldOwnerRef.current; assert.equal(typeof previousOwner, 'string');
  const second = advancedPractice(f, f.state), latest = loadFieldSuspension(f.storage), old = f.pair();
  assert.equal(latest.pending.battle.id, a.context.pendingBattle.battle.id);
  assert.equal(latest.pending.choiceId, a.context.pendingBattle.choiceId);
  assert.deepEqual(latest.pending.checkpoint, plain(a.context.pendingBattle.checkpoint));
  assert.deepEqual(latest.pending.resumeState, plain(a.context.pendingBattle.resumeState));
  assert.notEqual(latest.owner, previousOwner);
  assert.equal(second.campaign.currentTurn, 2); assert.equal(second.campaign.history.length, 1);
  f.operations.length = 0;
  assert.throws(() => actualSave(a, first), /changed since this battle was loaded.*Reload before saving/);
  assertPair(f, old); assert.equal(f.operations.length, 0); assert.equal(a.context.fieldOwnerRef.current, previousOwner);
  assert.equal(a.context.pendingBattle.mode, 'fight');
  a.run('runAutosave()'); assertPair(f, old);
  assert.equal(JSON.parse(f.data.get(C)).state.currentTurn, 2); assert.equal(JSON.parse(f.data.get(C)).state.history.length, 1);
});

test('actual App re-save refreshes owner only on verified success; later cold loads preserve it without serializing ownership', () => {
  const f = fixture(); const a = appHarness(f); const initialOwner = a.context.fieldOwnerRef.current;
  a.run('resumeBattle()'); actualSave(a, f); const owner = a.context.fieldOwnerRef.current;
  assert.equal(owner, loadFieldSuspension(f.storage).owner); assert.notEqual(owner, initialOwner);
  assert.equal(Object.hasOwn(a.context.pendingBattle, 'owner'), false);
  const saved = JSON.parse(JSON.parse(f.data.get(F)).payload);
  assert.equal(Object.hasOwn(saved.context, 'owner'), false);
  assert.equal(Object.hasOwn(JSON.parse(f.data.get(C)).state, 'checkpointCampaignSnapshot'), false);
  for (let cycle = 0; cycle < 4; cycle++) {
    const cold = appHarness(f); assert.equal(cold.context.fieldOwnerRef.current, owner); cold.run('resumeBattle()'); cold.run('runAutosave()');
    assert.equal(cold.context.archiveProtected, false); assert.equal(loadFieldSuspension(f.storage).owner, owner);
  }
  a.run('resumeBattle()'); const previousPending = plain(a.context.pendingBattle), old = f.pair();
  f.controls.hook = (op, key) => { if (op === 'set' && key === F) throw Error('Quota'); };
  assert.throws(() => actualSave(a, f)); assert.equal(a.context.fieldOwnerRef.current, owner);
  assert.deepEqual(plain(a.context.pendingBattle), previousPending); assertPair(f, old);
});

test('loaded checkpoint without a remembered owner or with the wrong owner fails closed before any write', () => {
  const f = fixture(); const loaded = loadFieldSuspension(f.storage); const old = f.pair();
  for (const owner of [null, undefined, '', {}, 'wrong owner', loaded.owner + 'changed']) {
    assert.throws(() => saveFieldSuspension(f.snapshot(), loaded.pending, f.engine.checkpoint(), f.state, f.storage, owner));
    assertPair(f, old); assert.equal(f.operations.length, 0);
  }
  const h = appHarness(f); h.run('resumeBattle()'); h.context.fieldOwnerRef.current = null;
  assert.throws(() => actualSave(h, f)); assertPair(f, old); assert.ok(h.context.pendingBattle.checkpoint);
});

test('exact remembered anchors permit timestamp-only metadata changes and preserve current campaign compatibility', () => {
  const f = fixture(); const h = appHarness(f), owner = h.context.fieldOwnerRef.current;
  const before = JSON.parse(f.data.get(C)); before.exportedAt = 'timestamp-only'; before.metadata.selectedModel = 'different status';
  f.data.set(C, JSON.stringify(before));
  assert.equal(loadFieldSuspension(f.storage).owner, owner); h.run('resumeBattle()');
  actualSave(h, f); assert.equal(field.loadFieldCheckpoint(f.storage).error, null);
  assert.equal(h.context.fieldOwnerRef.current, loadFieldSuspension(f.storage).owner);
});

test('actual App initialization protects newer B campaign/field on A-to-B identical practice, first field, and absent-to-B interleaves', () => {
  for (const initial of ['saved-practice', 'campaign-only', 'absent']) {
    const f = fixture({ old: false });
    if (initial !== 'absent') assert.equal(campaign.saveCampaignSnapshot(campaign.createCampaignSnapshot(f.state, scenario), f.storage).ok, true);
    if (initial === 'saved-practice') {
      const first = practice(f); saveFieldSuspension(campaign.createCampaignSnapshot(f.state, scenario), first.pending, first.engine.checkpoint(), first.state, f.storage);
    }
    let switched = false, latest;
    f.controls.hook = (op, key) => {
      if (!switched && op === 'get' && key === F) { switched = true; advancedPractice(f, f.state); latest = f.pair(); }
    };
    const a = appHarness(f); assert.equal(switched, true);
    assert.equal(a.context.archiveProtected, true); assert.equal(a.context.initialField.protectedCampaign, true);
    assert.equal(a.context.pendingBattle, null); assert.equal(a.context.fieldOwnerRef.current, null);
    assert.match(a.context.initialField.error, /changed while loading/);
    const writes = f.operations.length; a.run('runAutosave()'); assertPair(f, latest); assert.equal(f.operations.length, writes);
    assert.throws(() => actualSave(a, practice(f)), /protected archive/); assertPair(f, latest);
    assert.equal(JSON.parse(f.data.get(C)).state.currentTurn, 2); assert.equal(JSON.parse(f.data.get(C)).state.history.length, 1);
  }
});

test('load capture refuses mixed raw pairs and blocks stale original expectations while stable corrupt fields keep prior behavior', () => {
  const f = fixture(); const snapshot = JSON.parse(f.data.get(C)); let switched = false, latest;
  f.controls.hook = (op, key) => {
    if (!switched && op === 'get' && key === C) { switched = true; advancedPractice(f, f.state); latest = f.pair(); }
  };
  const mixed = loadFieldSuspension(f.storage, snapshot);
  assert.equal(mixed.pending, null); assert.equal(mixed.owner, null); assert.equal(mixed.protectedCampaign, true); assertPair(f, latest);
  const stable = fixture(), old = stable.pair(); stable.data.set(F, '{damaged');
  const corrupt = loadFieldSuspension(stable.storage, JSON.parse(old[0]));
  assert.equal(corrupt.pending, null); assert.equal(corrupt.owner, null); assert.equal(corrupt.protectedCampaign, false); assert.ok(corrupt.error);
  const valid = fixture();
  assert.ok(loadFieldSuspension(valid.storage).pending);
  const missing = loadFieldSuspension(valid.storage, null); assert.equal(missing.pending, null); assert.equal(missing.protectedCampaign, true);
});

test('actual App initialization protects B published after an empty field read before verification', () => {
  for (const initial of ['campaign-only', 'absent']) {
    const f = fixture({ old: false });
    if (initial === 'campaign-only') assert.equal(campaign.saveCampaignSnapshot(campaign.createCampaignSnapshot(f.state, scenario), f.storage).ok, true);
    const get = f.storage.getItem; let switched = false, latest;
    f.storage.getItem = key => {
      const value = get(key);
      if (!switched && key === F) {
        assert.equal(value, null); switched = true; advancedPractice(f, f.state); latest = f.pair();
      }
      return value;
    };
    const a = appHarness(f); assert.equal(switched, true); assert.equal(a.context.initialField.protectedCampaign, true);
    assert.equal(a.context.archiveProtected, true); assert.equal(a.context.pendingBattle, null); assert.equal(a.context.fieldOwnerRef.current, null);
    a.run('runAutosave()'); assertPair(f, latest);
    assert.throws(() => actualSave(a, practice(f)), /protected archive/); assertPair(f, latest);
    assert.equal(JSON.parse(f.data.get(C)).state.currentTurn, 2);
  }
});

test('actual App initialization protects changed campaigns even with stable empty or corrupt field bytes', () => {
  for (const initialField of [null, '{unchanged corrupt field']) {
    const f = fixture({ old: false }); const first = campaign.createCampaignSnapshot(f.state, scenario);
    assert.equal(campaign.saveCampaignSnapshot(first, f.storage).ok, true);
    if (initialField !== null) f.data.set(F, initialField);
    let campaignReads = 0, latest;
    f.controls.hook = (op, key) => {
      if (op === 'get' && key === C && ++campaignReads === 2) {
        const advanced = advanceCampaignTurn(f.state, scenario, 'option_b', [scenario]);
        assert.equal(campaign.saveCampaignSnapshot(campaign.createCampaignSnapshot(advanced.state, advanced.nextScenario || scenario), f.storage).ok, true);
        latest = f.pair();
      }
    };
    const a = appHarness(f); assert.equal(a.context.initialField.protectedCampaign, true); assert.equal(a.context.archiveProtected, true);
    a.run('runAutosave()'); assertPair(f, latest);
    assert.throws(() => actualSave(a, f), /protected archive/); assertPair(f, latest);
    assert.equal(f.data.get(F) ?? null, initialField);
  }
  const stable = fixture({ old: false }); assert.equal(campaign.saveCampaignSnapshot(campaign.createCampaignSnapshot(stable.state, scenario), stable.storage).ok, true);
  const normal = appHarness(stable); assert.equal(normal.context.archiveProtected, false); assert.equal(normal.context.initialField.error, null);
  normal.run('runAutosave()'); assert.equal(stable.data.has(F), false);
});

test('actual App suspension preserves a confirmed Pickett Move650600 order and unchanged field time on every cold reload', () => {
  const f = fixture({ old: false }); f.engine.order('pickett-division', 'move', { x: 650, y: 600 });
  const order = plain(f.engine.state.find(unit => unit.id === 'pickett-division').pendingCommand);
  assert.ok(order); assert.equal(order.order, 'move'); assert.deepEqual(order.point, { x: 650, y: 600 });
  const h = appHarness(f); h.context.gameState = f.state; h.context.activeScenario = scenario; h.context.pendingBattle = f.pending;
  actualSave(h, f); const saved = f.pair(), checkpoint = f.engine.checkpoint();
  for (let cycle = 0; cycle < 6; cycle++) {
    const reloaded = appHarness(f); reloaded.run('resumeBattle()'); reloaded.run('runAutosave()'); assertPair(f, saved);
    assert.deepEqual(plain(reloaded.context.pendingBattle.checkpoint), checkpoint);
    const restored = CivilWarBattleEngine.fromCheckpoint(reloaded.context.pendingBattle.checkpoint, f.battle.id, f.state, f.pending.choiceId);
    assert.deepEqual(restored.state.find(unit => unit.id === 'pickett-division').pendingCommand, order);
    assert.equal(restored.time, f.engine.time);
  }
});

test('actual App Save & Leave failure retains active handler state and its previous valid saved pair', () => {
  const f = fixture(); const h = appHarness(f); h.run('resumeBattle()');
  const old = f.pair(), pending = plain(h.context.pendingBattle);
  h.context.gameState.statusMessage = 'new active state';
  f.controls.hook = (op, key) => { if (op === 'set' && key === F) throw Error('Quota'); };
  assert.throws(() => actualSave(h, f), /previous campaign and field save are preserved/);
  assert.deepEqual(plain(h.context.pendingBattle), pending); assertPair(f, old);
  assert.ok(field.loadFieldCheckpoint(f.storage).pending);
  h.run('runAutosave()'); assertPair(f, old);
});

test('actual encounter Save and leave callback stays paused and displays failure while the App keeps the active field', () => {
  const f = fixture(); const h = appHarness(f); h.run('resumeBattle()'); const old = f.pair();
  const source = readFileSync(new URL('../src/components/CivilWarBattleEncounter.jsx', import.meta.url), 'utf8');
  const ast = parseAst(source, { lang: 'jsx' }); const found = [];
  function visit(node) { if (!node || typeof node !== 'object') return;
    if (node.type === 'VariableDeclarator' && node.id?.name === 'suspend') found.push(node);
    for (const child of Object.values(node)) { if (Array.isArray(child)) child.forEach(visit); else if (child && typeof child === 'object') visit(child); }
  }
  visit(ast); assert.equal(found.length, 1);
  assert.ok(source.includes('const [speed, setSpeed] = useState(0)'));
  const callback = createContext({ speed: 1, error: '', battlefield: { current: { checkpoint: () => f.engine.checkpoint() } }, effectiveCampaignState: f.state,
    onSuspend: (checkpoint, state) => { h.context.checkpoint = checkpoint; h.context.resumeState = state; h.run('handleSuspendBattle(checkpoint,resumeState)'); },
    setSpeed(value) { callback.speed = value; }, setSaveError(value) { callback.error = value; },
  });
  runInContext(`const suspend=${source.slice(found[0].init.start, found[0].init.end)};`, callback);
  f.controls.hook = (op, key) => { if (op === 'set' && key === F) throw Error('Quota'); };
  runInContext('suspend()', callback);
  assert.equal(callback.speed, 0); assert.match(callback.error, /Battle not saved:.*previous campaign and field save are preserved/);
  assert.equal(h.context.pendingBattle.mode, 'fight'); assertPair(f, old);
});

test('actual App demo/protected suspension rejects before mutation; demo autosave keeps the real pair', () => {
  for (const protectedMode of [false, true]) {
    const f = fixture(); const old = f.pair(); const h = appHarness(f);
    h.context.isDemo = !protectedMode; h.context.archiveProtected = protectedMode;
    assert.throws(() => actualSave(h, f), /unavailable/); assertPair(f, old);
    h.run('runAutosave()'); assertPair(f, old);
    if (!protectedMode) assert.ok(f.data.has(campaign.DEMO_STORAGE_KEY));
  }
});

test('actual App discard and encounter close release ownership only after verified field removal', () => {
  for (const callback of ['discardBattle()', 'closeBattle()']) {
    const f = fixture(); const h = appHarness(f); h.run(callback);
    assert.equal(f.data.has(F), false);
    assert.ok(!h.context.pendingBattle?.checkpoint);
    h.run('runAutosave()'); assert.equal(field.loadFieldCheckpoint(f.storage).pending, null);
  }
  const f = fixture(); const h = appHarness(f); const old = f.pair();
  f.controls.hook = op => { if (op === 'remove') throw Error('Blocked removal'); };
  h.run('discardBattle()'); assert.match(h.context.operationError, /Blocked/);
  assert.ok(h.context.pendingBattle.checkpoint); h.run('runAutosave()'); assertPair(f, old);
});

test('actual App resolution clears owned pending checkpoint and autosave invalidates/removes completed field state', () => {
  const f = fixture(); const h = appHarness(f); const old = f.pair(); const turn = h.context.gameState.currentTurn;
  h.run('handleBattleResolution({result:"victory"})'); assert.equal(h.context.pendingBattle, null);
  assert.equal(h.context.gameState.currentTurn, turn + 1);
  h.run('runAutosave()'); assert.notEqual(f.pair()[0], old[0]); assert.equal(f.data.has(F), false);
  const practice = fixture(); const p = appHarness(practice); p.context.pendingBattle.practice = true;
  const state = plain(p.context.gameState); p.run('handleBattleResolution({result:"victory"})');
  assert.equal(p.context.pendingBattle, null); assert.deepEqual(plain(p.context.gameState), state);
});

test('actual App valid import releases field ownership while rejected imports preserve it', () => {
  const f = fixture(); const h = appHarness(f); const old = f.pair();
  h.context.incoming = { version: 999, state: {} };
  assert.equal(h.run('applyCampaignArchive(incoming,"import")'), false); assertPair(f, old); assert.ok(h.context.pendingBattle.checkpoint);
  h.context.incoming = campaign.createCampaignSnapshot({ ...f.state, currentTurn: 2 }, scenario);
  assert.equal(h.run('applyCampaignArchive(incoming,"import")'), true); assert.equal(h.context.pendingBattle, null);
  h.run('runAutosave()'); assert.equal(f.data.has(F), false); assert.equal(field.loadFieldCheckpoint(f.storage).pending, null);
});

test('genuine campaign state/scenario changes still reject old anchors; timestamp changes alone remain compatible', () => {
  for (const mutate of [raw => raw.state.currentTurn++, raw => raw.activeScenarioId = 'other', raw => raw.state.metrics.munitions--]) {
    const f = fixture(); const old = f.pair(); const raw = JSON.parse(old[0]); mutate(raw); f.data.set(C, JSON.stringify(raw));
    assert.match(field.loadFieldCheckpoint(f.storage).error, /earlier campaign/); assert.equal(f.data.get(F), old[1]);
  }
  const f = fixture(); const raw = JSON.parse(f.data.get(C)); raw.exportedAt = 'metadata-only'; f.data.set(C, JSON.stringify(raw));
  assert.ok(field.loadFieldCheckpoint(f.storage).pending);
});

test('corrupt field startup is not checkpoint ownership; corrupt/protected campaign and ordinary gate edges remain safe', () => {
  const f = fixture(); f.data.set(F, '{damaged'); const h = appHarness(f);
  assert.equal(h.context.pendingBattle, null); assert.ok(h.context.initialField.error);
  h.run('runAutosave()'); assert.equal(f.data.get(F), '{damaged');
  const corrupt = fixture(); corrupt.data.set(C, '{damaged campaign'); const old = corrupt.pair(); const p = appHarness(corrupt);
  assert.equal(p.context.archiveProtected, true); p.run('runAutosave()'); assertPair(corrupt, old);
  const fresh = fixture({ old: false }); const gate = appHarness(fresh); gate.context.pendingBattle = { ...fresh.pending, mode: 'gate' };
  gate.run('runAutosave()'); assert.ok(fresh.data.has(C)); assert.equal(fresh.data.has(F), false);
});

test('staged suspension preserves native campaign/field formats and validates the engine before writes', () => {
  const f = fixture(); const result = save(f); const saved = field.loadFieldCheckpoint(f.storage);
  assert.equal(saved.error, null); assert.equal(result.pending.mode, 'suspended');
  assert.equal(Object.hasOwn(result.pending, 'owner'), false);
  const envelope = JSON.parse(f.data.get(F)); assert.deepEqual(Object.keys(envelope), ['payload', 'checksum']);
  assert.equal(JSON.parse(envelope.payload).version, 1); assert.equal(JSON.parse(f.data.get(C)).version, campaign.CAMPAIGN_SAVE_VERSION);
  assert.deepEqual(saved.pending.checkpoint, f.engine.checkpoint());
  const invalids = [
    f => { f.engine.checkpoint = () => ({ version: 999 }); },
    f => { f.pending.choiceId = 'invalid'; },
    f => { f.pending.battle = { id: 'missing' }; },
    f => { f.state.battleRulesVersion = 999; },
    f => { f.snapshot = () => ({ version: 999, state: {} }); },
    f => { const valid = f.snapshot(); valid.state.statusMessage = 'x'.repeat(4 * 1024 * 1024); f.snapshot = () => valid; },
    f => { f.pending.statusNote = 'x'.repeat(3000001); },
    f => { f.pending.circular = f.pending; },
  ];
  for (const mutate of invalids) { const f = fixture(); const old = f.pair(); mutate(f); const err = failSave(f); assert.equal(err.rollbackComplete, true); assertPair(f, old); assert.equal(f.operations.length, 0); }
});

test('first campaign quota failure and second field quota failure restore prior owned pair', () => {
  for (const failKey of [C, F]) {
    const f = fixture(); const old = f.pair();
    f.controls.hook = (op, key) => { if (op === 'set' && key === failKey) throw Error('Quota'); };
    const error = failSave(f); assert.equal(error.rollbackComplete, true); assertPair(f, old);
    assert.ok(field.loadFieldCheckpoint(f.storage).pending);
  }
});

test('unavailable default/explicit storage refuses saving without changing the active field', () => {
  const f = fixture(); const old = f.pair();
  for (const storage of [null, undefined]) assert.throws(() => saveFieldSuspension(f.snapshot(), f.pending, f.engine.checkpoint(), f.state, storage), /unavailable/);
  assertPair(f, old); assert.equal(f.operations.length, 0);
});

test('partial writes that throw after changing bytes are recovered only while still owned', () => {
  for (const failKey of [C, F]) {
    const f = fixture(); const old = f.pair(); let first = true;
    f.controls.hook = (op, key, value, data) => { if (first && op === 'set' && key === failKey) { first = false; data.set(key, value); throw Error('Write committed then failed'); } };
    const error = failSave(f); assert.equal(error.rollbackComplete, true); assertPair(f, old);
  }
});

test('silently dropped campaign/field writes fail verification without harming old pair', () => {
  for (const failKey of [C, F]) {
    const f = fixture(); const old = f.pair(); let first = true;
    const set = f.storage.setItem;
    f.storage.setItem = (key, value) => { if (first && key === failKey) { first = false; return; } return set(key, value); };
    const error = failSave(f); assert.equal(error.rollbackComplete, true); assertPair(f, old);
  }
});

test('corrupted written bytes are not overwritten during rollback; failure is explicitly partial', () => {
  const f = fixture(); const old = f.pair(); const original = f.storage.setItem;
  f.storage.setItem = (key, value) => { original(key, value); if (key === F) f.data.set(F, 'unowned damaged bytes'); };
  const error = failSave(f); assert.equal(error.rollbackComplete, false); assert.equal(error.concurrentDrift, true);
  assert.match(error.message, /could not be fully restored/); assert.equal(f.data.get(C), old[0]); assert.equal(f.data.get(F), 'unowned damaged bytes');
});

test('no previous pair is rolled back to absence on second-write failure', () => {
  const f = fixture({ old: false }); f.controls.hook = (op, key) => { if (op === 'set' && key === F) throw Error('Quota'); };
  const error = failSave(f); assert.equal(error.rollbackComplete, true); assertPair(f, [null, null]);
});

test('existing malformed raw pair is restored byte-for-byte when explicit replacement fails', () => {
  const f = fixture({ old: false }); f.data.set(C, '{prior raw'); f.data.set(F, '{prior field'); const old = f.pair();
  f.controls.hook = (op, key) => { if (op === 'set' && key === F) throw Error('Quota'); };
  assert.equal(failSave(f).rollbackComplete, true); assertPair(f, old);
});

test('current saved checkpoint changed before saving is refused without clobbering its new owner', () => {
  const f = fixture(); const previous = loadFieldSuspension(f.storage); f.pending = previous.pending; f.owner = previous.owner;
  f.engine.tick(.4); field.saveFieldCheckpoint({ ...f.pending, checkpoint: null }, f.engine.checkpoint(), f.state, f.storage);
  f.operations.length = 0; const drifted = f.pair(); const error = failSave(f);
  assert.equal(error.rollbackComplete, true); assertPair(f, drifted); assert.equal(f.operations.length, 0);
});

test('during-copy campaign or field concurrent drift is preserved and reports incomplete recovery', () => {
  for (const driftKey of [C, F]) {
    const f = fixture(); const old = f.pair(); const set = f.storage.setItem; let changed = false;
    f.storage.setItem = (key, value) => { set(key, value); if (!changed && key === C) { changed = true; f.data.set(driftKey, `another tab ${driftKey}`); } };
    const error = failSave(f); assert.equal(error.rollbackComplete, false);
    assert.equal(f.data.get(driftKey), `another tab ${driftKey}`);
    assert.equal(f.data.get(driftKey === C ? F : C), old[driftKey === C ? 1 : 0]);
  }
});

test('drift during field verification and immediately before rollback is preserved', () => {
  const f = fixture(); const set = f.storage.setItem; let written = false;
  f.storage.setItem = (key, value) => { set(key, value); if (key === F) { written = true; f.data.set(C, 'concurrent campaign'); throw Error('Field post-write failure'); } };
  assert.equal(failSave(f).rollbackComplete, false); assert.equal(written, true); assert.equal(f.data.get(C), 'concurrent campaign');
  const r = fixture(); let fieldFailed = false, ownershipReads = 0;
  r.controls.hook = (op, key, value, data) => {
    if (op === 'set' && key === F) { fieldFailed = true; throw Error('Quota'); }
    if (fieldFailed && op === 'get' && key === C && ++ownershipReads === 2) data.set(C, 'changed before restore');
  };
  const error = failSave(r); assert.equal(error.rollbackComplete, false); assert.equal(error.concurrentDrift, true); assert.equal(r.data.get(C), 'changed before restore');
});

test('blocked reads, rollback writes and removal failures never claim complete restoration', () => {
  const blocked = fixture(); blocked.controls.hook = op => { if (op === 'get') throw Error('Storage blocked'); };
  assert.equal(failSave(blocked).rollbackComplete, false);
  for (const absent of [false, true]) {
    const f = fixture({ old: !absent }); const old = f.pair(); let failed = false;
    f.controls.hook = (op, key, value) => {
      if (op === 'set' && key === F) { failed = true; throw Error('Quota'); }
      if (failed && key === C && (op === 'remove' || (op === 'set' && value === old[0]))) throw Error('Rollback blocked');
    };
    const error = failSave(f); assert.equal(error.rollbackComplete, false); assert.notEqual(f.data.get(C) ?? null, old[0]);
    assert.equal(f.data.get(F) ?? null, old[1]);
  }
});

test('final field-load verification failure restores both exact prior values', () => {
  const f = fixture(); const old = f.pair(); const get = f.storage.getItem; const set = f.storage.setItem;
  let fieldWritten = false, fieldReads = 0;
  f.storage.setItem = (key, value) => { set(key, value); if (key === F) fieldWritten = true; };
  f.storage.getItem = key => {
    if (fieldWritten && key === F && ++fieldReads === 3) return '{"payload":"corrupt","checksum":"wrong"}';
    return get(key);
  };
  const error = failSave(f); assert.equal(error.rollbackComplete, true); assertPair(f, old);
  assert.ok(field.loadFieldCheckpoint(f.storage).pending);
});

test('blocked reads during recovery report partial recovery and preserve any unowned bytes', () => {
  const f = fixture(); let fieldFailed = false;
  f.controls.hook = (op, key) => {
    if (op === 'set' && key === F) { fieldFailed = true; throw Error('Field quota'); }
    if (fieldFailed && op === 'get' && key === C) throw Error('Recovery read blocked');
  };
  const error = failSave(f); assert.equal(error.rollbackComplete, false); assert.match(error.message, /could not be fully restored/);
  const blocked = fixture(); const old = blocked.pair(); let afterField = false;
  const set = blocked.storage.setItem;
  blocked.storage.setItem = (key, value) => { set(key, value); if (key === F) afterField = true; };
  blocked.controls.hook = op => { if (afterField && op === 'get') throw Error('Post-write storage blocked'); };
  assert.equal(failSave(blocked).rollbackComplete, false);
  assert.notEqual(blocked.data.get(C), old[0]);
});

test('pre-migration recovery backup semantics are retained, verified and never overwritten on conflict', () => {
  const f = fixture(); const legacy = JSON.parse(f.data.get(C)); legacy.version = 21; f.data.set(C, JSON.stringify(legacy));
  const old = f.pair(); save(f);
  const recovery = [...f.data].filter(([key]) => key.startsWith(`${C}:recovery:`));
  assert.equal(recovery.length, 1); assert.equal(recovery[0][1], old[0]); assert.ok(field.loadFieldCheckpoint(f.storage).pending);
  for (const method of ['quota', 'conflict', 'corrupt']) {
    const f = fixture(); const raw = JSON.parse(f.data.get(C)); raw.version = 21; f.data.set(C, JSON.stringify(raw)); const old = f.pair();
    f.controls.hook = (op, key, value, data) => { if (!key.includes(':recovery:')) return;
      if (method === 'quota' && op === 'set') throw Error('Recovery quota');
      if (method === 'conflict' && op === 'get') data.set(key, 'other archive');
    };
    if (method === 'corrupt') { const set = f.storage.setItem; f.storage.setItem = (key, value) => { set(key, value); if (key.includes(':recovery:')) f.data.set(key, 'damaged recovery'); }; }
    const error = failSave(f); assert.equal(error.rollbackComplete, true); assertPair(f, old);
  }
});

test('mandatory save-flow registration retains every original behavior assertion without source substitution', () => {
  const before = readFileSync(new URL('./test-support/checkpoint-repair-before/scripts/test-save-flow-source.mjs', import.meta.url), 'utf8');
  const current = readFileSync(new URL('./test-save-flow-source.mjs', import.meta.url), 'utf8');
  assert.equal(current, "import './test-field-suspend-save.mjs';\n" + before);
});

test('v30 protected-file migration changes only its import and current-file assertion; all old fixtures and ledger bytes remain bound', () => {
  const ledger = checkpointRepairMigrationLedger();
  assert.equal(ledger.migrations.length, 2);
  const before = readFileSync(new URL('./test-support/checkpoint-repair-before/scripts/test-gettysburg-v30-contact.mjs', import.meta.url), 'utf8');
  const current = v31BeforeFile('scripts/test-gettysburg-v30-contact.mjs').toString('utf8');
  const assertion = '    assert.equal(sha(readFileSync(file(record.path))), record.sha256, record.path);';
  assert.equal(before.split(assertion).length - 1, 1);
  const line = "import { GETTYSBURG_INFANTRY_SOUTHEAST_NORTHWEST_CONTACT_CLIPS_IDS } from '../src/battle/gettysburgInfantrySoutheastNorthwestContactClips.js';";
  assert.equal(current, before.replace(line, line + "\nimport { assertHistoricalCheckpointRepairFile } from './test-support/checkpointRepairPreservation.mjs';")
    .replace(assertion, '    assertHistoricalCheckpointRepairFile(record);'));
  for (const record of ledger.migrations) assertHistoricalCheckpointRepairFile({ path: record.path, sha256: record.beforeSHA256 });
});

test('migration validator rejects forged hashes, extra/duplicate/unknown paths, changed fixture/baseline and false provenance claims', () => {
  const ledger = checkpointRepairMigrationLedger();
  const mutations = [
    value => value.migrations.push(value.migrations[0]),
    value => value.migrations[1] = structuredClone(value.migrations[0]),
    value => value.migrations.pop(),
    value => value.migrations[0].path = 'src/game/fieldCheckpoint.js',
    value => value.migrations[0].path = '../src/App.jsx',
    value => value.migrations[0].archive = 'src/App.jsx',
    value => value.migrations[0].beforeSHA256 = '0'.repeat(64),
    value => value.migrations[0].currentSHA256 = value.migrations[0].beforeSHA256,
    value => value.migrations[0].reason = 'approved',
    value => value.fixture.sha256 = '0'.repeat(64),
    value => value.baselineSHA256 = '0'.repeat(64),
    value => value.baselineFiles = 1430,
    value => value.oldFixturesRefreshed = true,
    value => value.oldMigrationLedgersEdited = true,
    value => value.mandatorySuite = 'optional.mjs',
    value => value.gateBefore.sha256 = '0'.repeat(64),
    value => value.extraApproval = true,
  ];
  for (const mutate of mutations) { const forged = structuredClone(ledger); mutate(forged); assert.throws(() => validateCheckpointRepairLedger(forged)); }
  for (const record of [null, [], { path: 'unknown', sha256: '0'.repeat(64) }, { path: '../src/App.jsx', sha256: ledger.migrations[0].beforeSHA256 },
    { path: 'src/App.jsx', sha256: ledger.migrations[0].currentSHA256 }, { path: 'src/App.jsx', sha256: ledger.migrations[0].beforeSHA256, approved: true }]) {
    assert.throws(() => assertHistoricalCheckpointRepairFile(record));
  }
});
