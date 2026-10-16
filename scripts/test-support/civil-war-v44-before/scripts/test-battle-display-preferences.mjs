import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { readBattleDisplayPreferences, withBattleDisplayPreferences } from '../src/battle/battleDisplayPreferences.js';
import { combatCheckpointEnvelope } from '../src/battle/combatCheckpointEnvelope.js';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { BATTLE_SCENARIOS } from '../src/game/battles.js';
import { createFreshCampaignState, createCampaignSnapshot, CAMPAIGN_STORAGE_KEY } from '../src/game/campaignStorage.js';
import { saveFieldCheckpoint, loadFieldCheckpoint } from '../src/game/fieldCheckpoint.js';
import { createDisplayHarness, findNodes } from './test-support/battleDisplayComponentHarness.mjs';
import { gettysburgV41MigrationLedger, validateGettysburgV41MigrationLedger } from './test-support/gettysburgV41Preservation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const defaults = { fireArc: false, missionMarkers: true, tacticalOverlay: false };
const choices = { fireArc: true, missionMarkers: false, tacticalOverlay: true };
function fixture(id = 'gettysburg') {
  const campaignState = { ...createFreshCampaignState(1861), battleRulesVersion: id === 'gettysburg' ? 18 : 17 };
  const battle = Object.values(BATTLE_SCENARIOS).find(b => b.id === id);
  const engine = new CivilWarBattleEngine(id, campaignState, 'option_a');
  return { campaignState, battle, engine };
}

test('frozen v41 preserves the installed v40 baseline and untouched historical assertions', () => {
  const ledger = gettysburgV41MigrationLedger();
  assert.equal(validateGettysburgV41MigrationLedger(ledger), ledger);
  assert.equal(ledger.migrations.length, 4);
  assert.equal(ledger.behavioralAssertionsChanged, false);
  assert.equal(ledger.oldFixturesRefreshed, false);
});

test('all eight map-choice combinations round trip without changing combat or existing presentation', () => {
  const { engine } = fixture();
  const base = { ...engine.checkpoint(), presentation: { version: 1, time: 0, formations: [], fieldView: { marker: 'retained' } } };
  const before = structuredClone(base);
  for (const fireArc of [false, true]) for (const missionMarkers of [false, true]) for (const tacticalOverlay of [false, true]) {
    const prefs = { fireArc, missionMarkers, tacticalOverlay };
    const saved = withBattleDisplayPreferences(base, 'gettysburg', prefs);
    assert.deepEqual(readBattleDisplayPreferences(JSON.parse(JSON.stringify(saved)), 'gettysburg'), prefs);
    assert.deepEqual(combatCheckpointEnvelope(saved), combatCheckpointEnvelope(before));
    assert.equal(saved.state, base.state); assert.equal(saved.internal, base.internal);
    assert.equal(saved.presentation.fieldView, base.presentation.fieldView);
    assert.notEqual(saved.presentation, base.presentation);
  }
  assert.deepEqual(base, before);
});

test('legacy and malformed optional preferences retain defaults without invoking getters', () => {
  let reads = 0;
  const accessor = {}; Object.defineProperty(accessor, 'displayPreferences', { enumerable: true, get() { reads++; throw Error('getter invoked'); } });
  const row = { version: 1, scenarioId: 'gettysburg', ...choices };
  const member = { ...row }; Object.defineProperty(member, 'fireArc', { enumerable: true, get() { reads++; return true; } });
  const checkpointAccessor = {}; Object.defineProperty(checkpointAccessor, 'presentation', { enumerable: true, get() { reads++; return {}; } });
  for (const checkpoint of [null, {}, { presentation: accessor }, checkpointAccessor,
    ...[null, [], { ...row, version: 2 }, { ...row, scenarioId: 'shiloh' }, { ...row, fireArc: 1 },
      { ...row, extra: true }, { ...row, [Symbol('extra')]: true }, Object.create(row), member]
      .map(displayPreferences => ({ presentation: { displayPreferences } }))]) {
    assert.deepEqual(readBattleDisplayPreferences(checkpoint, 'gettysburg'), defaults);
  }
  assert.equal(reads, 0);
  const nullPrototype = Object.assign(Object.create(null), row);
  assert.deepEqual(readBattleDisplayPreferences({ presentation: { displayPreferences: nullPrototype } }, 'gettysburg'), choices);
});

test('invalid save inputs fail without mutating the current checkpoint', () => {
  const base = fixture().engine.checkpoint(), before = structuredClone(base);
  for (const prefs of [null, {}, { ...choices, fireArc: 'true' }]) assert.throws(() => withBattleDisplayPreferences(base, 'gettysburg', prefs));
  assert.throws(() => withBattleDisplayPreferences(base, '', choices));
  assert.deepEqual(base, before);
});

for (const id of ['gettysburg', 'first_manassas', 'shiloh', 'third_winchester']) {
  test(`${id} actual field save/load retains display choices and the exact engine checkpoint`, () => {
    const f = fixture(id), campaign = createCampaignSnapshot(f.campaignState, { id, choices: [] });
    const entries = new Map([[CAMPAIGN_STORAGE_KEY, JSON.stringify(campaign)]]);
    const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
    const base = f.engine.checkpoint();
    const checkpoint = withBattleDisplayPreferences(base, id, choices);
    saveFieldCheckpoint({ battle: f.battle, choiceId: 'option_a' }, checkpoint, f.campaignState, storage);
    const loaded = loadFieldCheckpoint(storage);
    assert.equal(loaded.error, null); assert.ok(loaded.pending);
    assert.deepEqual(readBattleDisplayPreferences(loaded.pending.checkpoint, id), choices);
    const cold = CivilWarBattleEngine.fromCheckpoint(combatCheckpointEnvelope(loaded.pending.checkpoint), id, f.campaignState, 'option_a');
    assert.deepEqual(cold.checkpoint(), base);
  });
}

test('malformed optional display choices still load the valid field and exact combat state', () => {
  const f = fixture(), campaign = createCampaignSnapshot(f.campaignState, { id: 'gettysburg', choices: [] });
  const entries = new Map([[CAMPAIGN_STORAGE_KEY, JSON.stringify(campaign)]]);
  const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
  const base = f.engine.checkpoint(), checkpoint = { ...base, presentation: {
    displayPreferences: { version: 1, scenarioId: 'gettysburg', ...choices, fireArc: 'yes' },
  } };
  saveFieldCheckpoint({ battle: f.battle, choiceId: 'option_a' }, checkpoint, f.campaignState, storage);
  const loaded = loadFieldCheckpoint(storage);
  assert.equal(loaded.error, null); assert.ok(loaded.pending);
  assert.deepEqual(readBattleDisplayPreferences(loaded.pending.checkpoint, 'gettysburg'), defaults);
  assert.deepEqual(CivilWarBattleEngine.fromCheckpoint(combatCheckpointEnvelope(loaded.pending.checkpoint), 'gettysburg', f.campaignState, 'option_a').checkpoint(), base);
});

const component = await createDisplayHarness(root);
try {
  const make = (checkpoint = null, compact = false) => {
    component.hooks.reset(); globalThis.window.matchMedia = () => ({ matches: compact });
    const f = fixture(), saved = [], props = { ...f, checkpoint, choiceId: 'option_a', onSuspend: (...args) => saved.push(args) };
    let tree;
    const render = () => { component.hooks.begin(); tree = component.module.CivilWarBattleEncounter(props); return tree; };
    const nodes = predicate => findNodes(tree, predicate);
    const field = () => nodes(n => n.type?.name === 'CivilWarBattlefield')[0];
    const labels = () => nodes(n => n.type === 'label' && n.props.className === 'cw-range-toggle');
    const toggle = text => {
      const label = labels().find(n => findNodes(n, c => c.type === 'input').length && JSON.stringify(n.props.children).includes(text));
      return findNodes(label, n => n.type === 'input')[0];
    };
    render(); const calls = [];
    field().props.ref.current = { checkpoint: () => withBattleDisplayPreferences(f.engine.checkpoint(), f.battle.id, { fireArc: field().props.showRange, missionMarkers: field().props.missionMarkers, tacticalOverlay: field().props.terrainOverlay }), range() {}, face: angle => { calls.push(angle); f.engine.face(f.battle.defaultSelection, angle); } };
    field().props.onSnapshot(f.engine.snapshot()); render();
    return { ...f, render, nodes, field, toggle, saved, calls };
  };
  test('actual component restores three checkboxes and passes matching renderer inputs', () => {
    const h = make(withBattleDisplayPreferences(fixture().engine.checkpoint(), 'gettysburg', choices));
    assert.equal(h.toggle('Fire arc').props.checked, true);
    assert.equal(h.toggle('Mission markers').props.checked, false);
    assert.equal(h.toggle('Tactical overlay').props.checked, true);
    assert.equal(h.field().props.showRange, true); assert.equal(h.field().props.missionMarkers, false); assert.equal(h.field().props.terrainOverlay, true);
    assert.equal(h.toggle('Battle sound').props.checked, false);
    assert.equal(h.field().props.speed, 0);
  });
  test('actual toggles enter Save and leave and preserve legacy defaults on a fresh mount', () => {
    const h = make();
    for (const text of ['Fire arc', 'Mission markers', 'Tactical overlay']) {
      const input = h.toggle(text); input.props.onChange({ target: { checked: !input.props.checked } }); h.render();
    }
    h.nodes(n => n.props['aria-label'] === 'Leave battle')[0].props.onClick(); h.render();
    h.nodes(n => n.type === 'button' && n.props.children === 'Save and leave')[0].props.onClick();
    assert.equal(h.saved.length, 1); assert.deepEqual(readBattleDisplayPreferences(h.saved[0][0], 'gettysburg'), choices);
    assert.deepEqual(combatCheckpointEnvelope(h.saved[0][0]), h.engine.checkpoint());
    const legacy = make(fixture().engine.checkpoint());
    assert.equal(legacy.toggle('Fire arc').props.checked, false); assert.equal(legacy.toggle('Mission markers').props.checked, true);
  });
  test('all eight actual compass handlers remain available and enable the arc', () => {
    const h = make(), expected = [-135, -90, -45, 180, 0, 135, 90, 45];
    const group = () => h.nodes(n => n.props['aria-label'] === 'Face direction')[0];
    const before = h.engine.time;
    for (const [index, button] of findNodes(group(), n => n.type === 'button').entries()) {
      assert.equal(button.props.disabled, false); button.props.onClick(); h.render();
      assert.equal(h.calls.at(-1), expected[index] * Math.PI / 180); assert.equal(h.field().props.showRange, true);
    }
    assert.equal(h.engine.time, before);
  });
  test('phone facing controls precede long content and open on the compact first render', () => {
    const h = make(null, true), details = h.nodes(n => n.props.id === 'cw-inspector-details')[0];
    const order = findNodes(details, n => ['Formation order', 'Facing and target control'].includes(n.props['aria-label']) || n.props.className === 'cw-army-attention');
    assert.equal(order[0].props['aria-label'], 'Formation order'); assert.equal(order[1].props['aria-label'], 'Facing and target control');
    assert.equal(order[1].props.open, true);
    assert.equal(findNodes(order[1], n => n.props['aria-label'] === 'Face direction').length, 1);
    const desktop = make(); assert.equal(desktop.nodes(n => n.props['aria-label'] === 'Facing and target control')[0].props.open, undefined);
  });
} finally { await component.close(); }

const wrapper = await createDisplayHarness(root, { wrapper: true });
try {
  test('actual field wrapper initializes, toggles and recreates the Scene with the declared Fire arc', () => {
    wrapper.hooks.reset(); const f = fixture(), ref = { current: null };
    const props = { scenarioId: 'gettysburg', campaignState: f.campaignState, choiceId: 'option_a', speed: 0,
      selectedId: f.battle.defaultSelection, onSelect() {}, onSnapshot() {}, onDestination() {}, showRange: true, missionMarkers: false, terrainOverlay: true };
    const render = () => {
      wrapper.hooks.begin(); wrapper.module.CivilWarBattlefield(props, ref);
      wrapper.hooks.references()[0].current = {}; wrapper.hooks.flush();
      return wrapper.games.at(-1).config.scene;
    };
    const first = render(); assert.equal(first.showRange, true);
    assert.deepEqual(readBattleDisplayPreferences(ref.current.checkpoint(), 'gettysburg'), choices);
    props.showRange = false; props.missionMarkers = true; props.terrainOverlay = false;
    assert.equal(render(), first); assert.equal(first.showRange, false);
    assert.deepEqual(readBattleDisplayPreferences(ref.current.checkpoint(), 'gettysburg'), defaults);
    props.showRange = true; props.missionMarkers = false; props.terrainOverlay = true; props.campaignState = { ...f.campaignState };
    const cold = render(); assert.notEqual(cold, first); assert.equal(cold.showRange, true);
    assert.equal(wrapper.games.at(-2).destroyed, true);
    assert.deepEqual(cold.engine.checkpoint(), f.engine.checkpoint());
    assert.deepEqual(readBattleDisplayPreferences(ref.current.checkpoint(), 'gettysburg'), choices);
    assert.deepEqual(combatCheckpointEnvelope(ref.current.checkpoint()), f.engine.checkpoint());
  });
} finally { await wrapper.close(); }
