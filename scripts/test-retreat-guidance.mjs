import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { canCommand } from '../src/battle/battleUsability.js';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';

// Render the production React component and invoke its production button handler.
// The encounter callback is executed from its source with state/scene doubles.
// These checks do not claim browser layout, Phaser pixels, or human usability.
const cacheDir = mkdtempSync(join(tmpdir(), 'civil-retreat-guidance-'));
const vite = await createServer({ configLoader: 'native', cacheDir,
  plugins: [{ name: 'retreat-test-no-phaser', enforce: 'pre',
    resolveId(id) { if (id.endsWith('/battle/CivilWarBattlefield.jsx')) return '\0retreat-test-battlefield'; },
    load(id) { if (id === '\0retreat-test-battlefield') return 'export function CivilWarBattlefield() { return null; }'; },
  }], optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'silent' });
try {
  const { FormationReadinessCard, selectableRetreatBlocker } = await vite.ssrLoadModule('/src/components/FormationReadinessCard.jsx');
  const { BattleMechanicsUpgrade } = await vite.ssrLoadModule('/src/components/CivilWarBattleEncounter.jsx');
  const fixture = () => {
    const blocker = { id: 'alexander', name: "Alexander's Artillery", side: 'confederate', active: true, strength: 400, status: 'steady', order: 'hold', pendingCommand: null };
    const selected = { id: 'pickett', name: "Pickett's Division", side: 'confederate', active: true, strength: 4800, status: 'routing', order: 'withdraw', condition: 'routing',
      pressureReason: 'Route blocked by formations', ammunition: 37, suppression: 40, readiness: { supported: false, retreatGuidance: {
        formationId: 'pickett', blocked: true, blockerId: blocker.id, blockerKind: 'formation', blockerName: blocker.name, blockerSide: blocker.side,
        blockerStatus: blocker.status, blockerOrder: blocker.order, blockerAvailable: true, reason: 'formation', detouring: false, nextWaypoint: null,
        corridor: [], exitThreatened: false, threatId: null, threatName: null, underFire: false, fireThreatId: null, fireThreatName: null,
        closeEnemyId: null, closeEnemyName: null, pendingOrder: null,
      } } };
    const snapshot = { scenarioId: 'gettysburg', battleRulesVersion: 18, gettysburg: {}, resolving: false, outcome: 'undecided', formations: [selected, blocker] };
    return { selected, blocker, snapshot };
  };
  const render = (f, props = {}) => renderToStaticMarkup(createElement(FormationReadinessCard, { ...f, onSelectRetreatBlocker() {}, ...props }));
  function buttons(node) {
    if (Array.isArray(node)) return node.flatMap(buttons);
    if (!node?.props) return [];
    return [...(node.type === 'button' ? [node] : []), ...buttons(node.props.children)];
  }
  test('real readiness panel names the friendly obstruction and explains normal Move confirmation without mutating the snapshot', () => {
    const f = fixture(), before = structuredClone(f), html = render(f);
    assert.match(html, /Retreat route blocked/); assert.match(html, /Alexander&#x27;s Artillery is in the direct rear route/);
    assert.match(html, /preview and confirm a Move/); assert.match(html, /Select Alexander&#x27;s Artillery/);
    assert.deepEqual(f, before); assert.equal(selectableRetreatBlocker(f.selected, f.snapshot, f.blocker.id), f.blocker);
  });
  test('real button handler supplies only blocker and source IDs; the routed source gains no Move authority', () => {
    const f = fixture(), calls = [], before = structuredClone(f);
    const tree = FormationReadinessCard({ ...f, onSelectRetreatBlocker: (...ids) => calls.push(ids) });
    const actions = buttons(tree); assert.equal(actions.length, 1); actions[0].props.onClick();
    assert.deepEqual(calls, [[f.blocker.id, f.selected.id]]); assert.equal(canCommand(f.selected), false); assert.deepEqual(f, before);
  });
  test('enemy blocker and live fire threat are named without an enemy selection action or a promise of safety', () => {
    const f = fixture(); f.blocker.side = 'union'; Object.assign(f.selected.readiness.retreatGuidance, { blockerSide: 'union', blockerAvailable: false, underFire: true, fireThreatName: "Cushing's Battery" });
    const html = render(f); assert.match(html, /Alexander&#x27;s Artillery blocks the direct rear route/); assert.match(html, /Enemy formations cannot be moved/);
    assert.match(html, /firing reach of Cushing&#x27;s Battery/); assert.match(html, /retreat distance alone does not allow/); assert.doesNotMatch(html, /<button/);
  });
  test('actual landmark obstruction is named and does not invent a formation-selection action', () => {
    const f = fixture(); Object.assign(f.selected.readiness.retreatGuidance, { blockerKind: 'landmark', blockerId: 'stone-wall', blockerName: 'The Angle stone wall', blockerSide: null, blockerAvailable: false });
    const html = render(f); assert.match(html, /The Angle stone wall obstructs/); assert.match(html, /room around the obstacle/); assert.doesNotMatch(html, /<button/);
  });
  test('a real active corridor is described as a clear next step while preserving both engagement clearance and usable rear exits', () => {
    const f = fixture(); Object.assign(f.selected.readiness.retreatGuidance, { detouring: true, nextWaypoint: { x: 920, y: 760 }, corridor: [{ x: 920, y: 760 }] });
    const html = render(f); assert.match(html, /Taking a detour to the rear/); assert.match(html, /clear next step/); assert.match(html, /clears the engagement or reaches a usable rear exit/);
    assert.doesNotMatch(html, /<button|safe path|safe route/); assert.equal(selectableRetreatBlocker(f.selected, f.snapshot, f.blocker.id), null);
  });
  for (const malformed of [{ nextWaypoint: null }, { nextWaypoint: { x: NaN, y: 760 } }, { corridor: [] }]) {
    test(`malformed corridor does not announce a detour: ${JSON.stringify(malformed)}`, () => {
      const f = fixture(); Object.assign(f.selected.readiness.retreatGuidance, { detouring: true, nextWaypoint: { x: 920, y: 760 }, corridor: [{ x: 920, y: 760 }], ...malformed });
      assert.doesNotMatch(render(f), /Taking a detour|clear next step/);
    });
  }
  test('fire exposure alone explains the remaining exit requirement without claiming a blocked route', () => {
    const f = fixture(); Object.assign(f.selected.readiness.retreatGuidance, { blocked: false, blockerId: null, blockerName: null, blockerKind: null, blockerAvailable: false, underFire: true, fireThreatName: 'Union battery' });
    const html = render(f); assert.match(html, /Retreat still exposed/); assert.match(html, /firing reach of Union battery/); assert.doesNotMatch(html, /Retreat route blocked|<button/);
  });
  test('exit proximity is distinct from firing reach and close-contact separation', () => {
    const f = fixture(); Object.assign(f.selected.readiness.retreatGuidance, { blocked: false, blockerName: null, exitThreatened: true, threatName: 'Rear enemy', closeEnemyName: 'Nearby infantry' });
    const html = render(f); assert.match(html, /Rear enemy is close to the chosen rear exit/); assert.match(html, /Nearby infantry is too close to leave/);
    assert.doesNotMatch(html, /firing reach|can still fire|<button/);
  });
  test('a replacement courier order retains the current warning but withholds blocker selection until it arrives', () => {
    const f = fixture(); f.selected.pendingCommand = { order: 'rally' }; f.selected.readiness.retreatGuidance.pendingOrder = 'rally';
    const html = render(f); assert.match(html, /replacement order is on its way/); assert.match(html, /withdrawal happening now/); assert.doesNotMatch(html, /<button/);
  });
  test('a blocker with a pending courier order is explained and cannot be selected by the clearance action', () => {
    const f = fixture(); f.blocker.pendingCommand = { order: 'move' };
    const html = render(f); assert.match(html, /blocking formation has an order on its way/); assert.doesNotMatch(html, /<button/);
    assert.equal(selectableRetreatBlocker(f.selected, f.snapshot, f.blocker.id), null);
  });
  for (const patch of [{ active: false }, { strength: 0 }, { withdrawn: true }, { status: 'routing' }, { status: 'broken' }, { status: 'surrendered' }, { side: 'union' }]) {
    test(`stale available flag cannot authorize a blocker now unavailable: ${JSON.stringify(patch)}`, () => {
      const f = fixture(); Object.assign(f.blocker, patch); assert.doesNotMatch(render(f), /<button/);
      assert.equal(selectableRetreatBlocker(f.selected, f.snapshot, f.blocker.id), null);
    });
  }
  test('a disappeared blocker or mismatched ID cannot be selected', () => {
    const f = fixture(); f.snapshot.formations = [f.selected]; assert.doesNotMatch(render(f), /<button/);
    assert.equal(selectableRetreatBlocker(f.selected, f.snapshot, 'different-unit'), null);
  });
  test('a stale selected object cannot show a retreat warning once its snapshot record has departed', () => {
    const f = fixture(); f.snapshot.formations[0] = { ...f.selected, active: false, withdrawn: true };
    assert.doesNotMatch(render(f), /Retreat route guidance|<button/);
  });
  for (const patch of [{ active: false }, { withdrawn: true }, { strength: 0 }, { status: 'surrendered' }, { status: 'steady', order: 'hold', pendingCommand: { order: 'withdraw' } }]) {
    test(`current-retreat panel is omitted for a departed or not-yet-withdrawing source: ${JSON.stringify(patch)}`, () => {
      const f = fixture(); Object.assign(f.selected, patch); assert.doesNotMatch(render(f), /Retreat route guidance|Select Alexander/);
    });
  }
  for (const patch of [{ scenarioId: 'shiloh' }, { battleRulesVersion: 17 }, { battleRulesVersion: undefined }, { gettysburg: null }, { resolving: true }, { outcome: 'defeat' }]) {
    test(`unsupported or decided battle cannot expose stale retreat advice: ${JSON.stringify(patch)}`, () => {
      const f = fixture(); Object.assign(f.snapshot, patch); assert.doesNotMatch(render(f), /Retreat route guidance|Select Alexander/);
    });
  }
  test('missing, stale-source, and clear-route advisory records do not produce a panel', () => {
    for (const advice of [undefined, { ...fixture().selected.readiness.retreatGuidance, formationId: 'previous-selection' }, { ...fixture().selected.readiness.retreatGuidance, blocked: false }]) {
      const f = fixture(); f.selected.readiness.retreatGuidance = advice; assert.doesNotMatch(render(f), /Retreat route guidance/);
    }
  });
  test('read-only consumer has no selection button; reviewed move keeps action disabled', () => {
    const f = fixture(); assert.doesNotMatch(render(f, { onSelectRetreatBlocker: null }), /<button/);
    assert.match(render(f, { selectionDisabled: true }), /<button[^>]+disabled/);
  });

  const encounter = readFileSync(new URL('../src/components/CivilWarBattleEncounter.jsx', import.meta.url), 'utf8');
  const callbackMatch = encounter.match(/  const selectRetreatBlocker = \(id, formationId\) => \{([\s\S]*?)\n  \};/);
  assert.ok(callbackMatch, 'production encounter callback is present');
  const callback = (f, patch = {}) => {
    const calls = [], context = { selected: f.selected, snapshot: f.snapshot, resolving: false, completed: false, reviewingOrder: false, guide: { open: false },
      selectableRetreatBlocker, setSpeed: value => calls.push(['speed', value]), selectFromRoster: id => calls.push(['roster', id]),
      setInspectorOpen: value => calls.push(['inspector', value]), closeGuide: () => calls.push(['close-guide']), ...patch };
    return { calls, invoke: vm.runInNewContext(`(id, formationId) => {${callbackMatch[1]}\n}`, context) };
  };
  test('actual parent callback pauses, selects and opens details without sending a command', () => {
    const f = fixture(), c = callback(f, { guide: { open: true } }); c.invoke(f.blocker.id, f.selected.id);
    assert.deepEqual(c.calls, [['close-guide'], ['speed', 0], ['roster', f.blocker.id], ['inspector', true]]);
  });
  test('actual callback rejects stale source/blocker, unavailable blocker, result and unconfirmed command states', () => {
    const f = fixture();
    for (const [patch, id, source] of [[{}, f.blocker.id, 'previous-selection'], [{}, 'previous-blocker', f.selected.id], [{ completed: true }, f.blocker.id, f.selected.id],
      [{ resolving: true }, f.blocker.id, f.selected.id], [{ reviewingOrder: true }, f.blocker.id, f.selected.id]]) {
      const c = callback(f, patch); c.invoke(id, source); assert.deepEqual(c.calls, []);
    }
    f.blocker.active = false; const c = callback(f); c.invoke(f.blocker.id, f.selected.id); assert.deepEqual(c.calls, []);
  });
  test('parent uses the existing roster/focus route and guards any unconfirmed command preview', () => {
    assert.match(encounter, /selectFromRoster = \(id\) => \{ setMarkedLocation\(null\); setSelectedId\(id\); battlefield\.current\?\.selectAndFocus\(id\); \}/);
    assert.match(encounter, /onSelectRetreatBlocker=\{selectRetreatBlocker\} selectionDisabled=\{reviewingOrder \|\| resolving \|\| completed\}/);
    assert.doesNotMatch(callbackMatch[1], /\.order\(|\.move\(|\.destination\(|\.confirmMove\(/);
  });
  test('legacy update remains explicit and scoped: Gettysburg can opt into18; other fields retain17', () => {
    const expression = encounter.match(/const effectiveCampaignState = useMemo\(\(\) => (.*), \[campaignState,/)[1];
    for (const [id, target] of [['gettysburg', 18], ['shiloh', 17]]) {
      const campaignState = { battleRulesVersion: 16, metrics: { morale: 80 } }, before = structuredClone(campaignState);
      assert.equal(vm.runInNewContext(expression, { campaignState, upgradeGettysburg: false, battle: { id }, checkpoint: null }), campaignState);
      const upgraded = vm.runInNewContext(expression, { campaignState, upgradeGettysburg: true, battle: { id }, checkpoint: null });
      assert.equal(upgraded.battleRulesVersion, target); assert.equal(upgraded.metrics, campaignState.metrics); assert.deepEqual(campaignState, before);
      for (const version of [16, 17, 18]) for (const time of [0, 1]) {
        const shown = renderToStaticMarkup(createElement(BattleMechanicsUpgrade, { snapshot: { battleRulesVersion: version, time }, battleId: id, checkpoint: null, onUpgrade() {} })).includes('Use updated battle mechanics');
        assert.equal(shown, !time && version < target);
      }
    }
    assert.match(encounter, /<BattleMechanicsUpgrade battleId=\{battle\.id\} snapshot=\{snapshot\} checkpoint=\{checkpoint\}/);
  });
  for (const [battleId, version] of [['gettysburg', 17], ['gettysburg', 16], ['shiloh', 16], ['first_manassas', 16]]) {
    test(`real React upgrade control distinguishes a prebattle opening from a time0 resumed checkpoint: ${battleId}/${version}`, () => {
      const campaignState = { rulesVersion: 2, battleRulesVersion: version, metrics: { militaryStrength: 85, munitions: 80, publicMorale: 80, foodSupply: 78, treasury: 75 } };
      const original = new CivilWarBattleEngine(battleId, campaignState, 'option_a'), snapshot = original.snapshot(), checkpoint = original.checkpoint(), before = structuredClone(checkpoint);
      assert.equal(snapshot.time, 0); assert.equal(snapshot.battleRulesVersion, version);
      const prompt = props => renderToStaticMarkup(createElement(BattleMechanicsUpgrade, { battleId, snapshot, onUpgrade() {}, ...props }));
      assert.match(prompt({ checkpoint: null }), /<button[^>]*>Use updated battle mechanics<\/button>/);
      assert.doesNotMatch(prompt({ checkpoint }), /Use updated battle mechanics|<button/);
      const expression = encounter.match(/const effectiveCampaignState = useMemo\(\(\) => (.*), \[campaignState,/)[1];
      const effective = vm.runInNewContext(expression, { campaignState, upgradeGettysburg: true, battle: { id: battleId }, checkpoint });
      assert.equal(effective, campaignState, 'even a stale upgrade flag cannot change checkpoint inputs');
      const restored = CivilWarBattleEngine.fromCheckpoint(JSON.parse(JSON.stringify(checkpoint)), battleId, effective, 'option_a');
      assert.equal(restored.battleRulesVersion, version); assert.equal(restored.time, 0); assert.deepEqual(restored.checkpoint(), checkpoint);
      assert.deepEqual(checkpoint, before, 'the suspended record is not migrated or restarted');
    });
  }
  test('actual upgrade callback refuses a checkpoint even if a stale button handler is invoked', () => {
    const body = encounter.match(/onUpgrade=\{\(\) => \{([\s\S]*?)\}\} \/>/)[1];
    for (const checkpoint of [null, { version: 1 }]) {
      const calls = [], invoke = vm.runInNewContext(`() => {${body}}`, { checkpoint, setSpeed: value => calls.push(['speed', value]), setUpgradeGettysburg: value => calls.push(['upgrade', value]) });
      invoke(); assert.deepEqual(calls, checkpoint ? [] : [['speed', 0], ['upgrade', true]]);
    }
  });
  test('real engine advisory reaches the actual React panel and selects only the actual friendly obstruction', () => {
    const engine = new CivilWarBattleEngine('gettysburg', { rulesVersion: 2, battleRulesVersion: 18, metrics: { militaryStrength: 85, munitions: 80, publicMorale: 80, foodSupply: 78, treasury: 75 } }, 'option_a');
    engine.state.forEach(unit => { unit.active = false; unit.arrivalTime = null; });
    const selected = engine.state.find(unit => unit.id === 'pickett-division'), blocker = engine.state.find(unit => unit.id === 'alexander-battalion');
    Object.assign(selected, { active: true, x: 850, y: 740, facing: Math.PI / 2, order: 'withdraw', status: 'routing', target: { x: 850, y: 882 }, retreatExit: { x: 850, y: 882 }, pendingCommand: null });
    Object.assign(blocker, { active: true, x: 850, y: 840, facing: Math.PI / 2, order: 'hold', status: 'steady', pendingCommand: null });
    const before = structuredClone(engine.state), snapshot = engine.snapshot(), live = snapshot.formations.find(unit => unit.id === selected.id);
    assert.equal(snapshot.battleRulesVersion, 18); assert.equal(live.readiness.retreatGuidance.blockerId, blocker.id);
    const html = render({ selected: live, snapshot }); assert.match(html, /Retreat route blocked/); assert.match(html, /Select Alexander/);
    assert.equal(selectableRetreatBlocker(live, snapshot, blocker.id)?.id, blocker.id); assert.deepEqual(engine.state, before);
  });
} finally { await vite.close(); rmSync(cacheDir, { recursive: true, force: true }); }
