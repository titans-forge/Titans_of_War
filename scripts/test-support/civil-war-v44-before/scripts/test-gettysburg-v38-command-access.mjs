import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { BATTLE_SCENARIOS } from '../src/game/battles.js';
import { createFreshCampaignState } from '../src/game/campaignStorage.js';
import { gettysburgV38MigrationLedger, validateGettysburgV38MigrationLedger } from './test-support/gettysburgV38Preservation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
test('frozen V38 preservation checks current physical sources and unchanged historical metadata', () => {
  const ledger = gettysburgV38MigrationLedger();
  assert.equal(ledger.migrations.length, 4);
  assert.equal(ledger.oldFixturesRefreshed, false);
  assert.equal(ledger.oldMigrationLedgersEdited, false);
  assert.ok(ledger.migrations.some(row => row.path === 'src/components/CivilWarBattleEncounter.jsx'));
});
test('V38 metadata rejects accessors without invoking them and rejects changed declared pins', () => {
  let reads = 0;
  const accessor = {}; Object.defineProperty(accessor, 'schema', { enumerable: true, get() { reads++; return 'ignored'; } });
  assert.throws(() => validateGettysburgV38MigrationLedger(accessor)); assert.equal(reads, 0);
  const ledger = structuredClone(gettysburgV38MigrationLedger()); ledger.migrations[0].currentSHA256 = '0'.repeat(64);
  assert.throws(() => validateGettysburgV38MigrationLedger(ledger));
});

// Actual current component/handlers and actual engine snapshots; controlled
// React hooks omit effects and Phaser. Public browser checks verify CSS/viewport
// access separately. Historical assertions and fixtures remain unmodified.
const hooksSource = `
let slots=[],cursor=0;
export function reset(){slots=[];cursor=0;}
export function begin(){cursor=0;}
export function useState(initial){const index=cursor++;if(!(index in slots))slots[index]=typeof initial==='function'?initial():initial;return[slots[index],value=>{slots[index]=typeof value==='function'?value(slots[index]):value;}];}
export function useRef(value){return useState(()=>({current:value}))[0];}
export function useReducer(reducer,arg,init){const[value,set]=useState(()=>init?init(arg):arg);return[value,action=>set(previous=>reducer(previous,action))];}
export function useMemo(fn){return fn();}
export function useCallback(fn){return fn;}
export function useEffect(){}
`;
const cacheDir = mkdtempSync(join(tmpdir(), 'civil-command-access-'));
const previousWindow = globalThis.window;
globalThis.window = { localStorage: { getItem: () => '1' }, matchMedia: () => ({ matches: false }) };
const vite = await createServer({ root, configLoader: 'native', cacheDir,
  optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'silent',
  plugins: [{ name: 'command-access-component-harness', enforce: 'pre',
    resolveId(id) { if (id === 'virtual:command-access-hooks') return '\0command-access-hooks'; if (id.endsWith('/battle/CivilWarBattlefield.jsx')) return '\0command-access-field'; },
    load(id) { if (id === '\0command-access-hooks') return hooksSource; if (id === '\0command-access-field') return 'export function CivilWarBattlefield(){return null;}'; },
    transform(code, id) { if (id.endsWith('/src/components/CivilWarBattleEncounter.jsx')) return code.replace("from 'react';", "from 'virtual:command-access-hooks';"); },
  }],
});
function nodes(tree, predicate, parent = null) {
  if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, predicate, parent));
  if (!tree?.props) return [];
  return [...(predicate(tree, parent) ? [tree] : []), ...nodes(tree.props.children, predicate, tree)];
}
try {
  const { CivilWarBattleEncounter } = await vite.ssrLoadModule('/src/components/CivilWarBattleEncounter.jsx');
  const hooks = await vite.ssrLoadModule('virtual:command-access-hooks');
  function harness(battleId = 'gettysburg') {
    hooks.reset();
    const campaignState = { ...createFreshCampaignState(1861), battleRulesVersion: battleId === 'gettysburg' ? 18 : 17 };
    const battle = Object.values(BATTLE_SCENARIOS).find(b => b.id === battleId);
    assert.ok(battle, battleId);
    const engine = new CivilWarBattleEngine(battleId, campaignState, 'option_a');
    const props = { battle, campaignState, choiceId: 'option_a' };
    let tree, calls = [];
    const render = () => { hooks.begin(); tree = CivilWarBattleEncounter(props); return tree; };
    const field = () => nodes(tree, node => node.type?.name === 'CivilWarBattlefield')[0];
    const group = () => nodes(tree, node => node.props.role === 'group' && node.props['aria-label'] === 'Formation order')[0];
    const buttons = () => nodes(group(), node => node.type === 'button');
    const roster = () => nodes(tree, (node, parent) => node.type === 'select' && parent?.props.className === 'cw-roster')[0];
    const publish = (snapshot = engine.snapshot()) => { field().props.onSnapshot(snapshot); render(); };
    render();
    field().props.ref.current = { selectAndFocus() {}, clearDestination() {}, formation(mode) {
      const selected = roster().props.value; calls.push([selected, mode]); engine.setFormation(selected, mode);
    }};
    publish();
    return { engine, calls, render, publish, field, group, buttons, roster, tree: () => tree };
  }
  for (const battleId of ['gettysburg', 'first_manassas', 'shiloh', 'third_winchester']) {
    test(`actual ${battleId} formation buttons submit the selected infantry order and report received mode`, () => {
      const h = harness(battleId);
      const infantry = h.engine.snapshot().formations.find(f => f.side === 'confederate' && f.type === 'infantry' && f.active && f.status !== 'routing');
      assert.ok(infantry);
      h.roster().props.onChange({ target: { value: infantry.id } }); h.render();
      assert.deepEqual(h.buttons().map(b => b.props.children), ['line', 'column', 'skirmish']);
      for (const mode of ['column', 'line', 'skirmish']) {
        const button = h.buttons().find(b => b.props.children === mode); assert.equal(button.props.disabled, false);
        button.props.onClick(); h.publish();
        assert.deepEqual(h.calls.at(-1), [infantry.id, mode]);
        assert.equal(h.engine.snapshot().formations.find(f => f.id === infantry.id).formationMode, mode);
        assert.deepEqual(h.buttons().map(b => b.props['aria-pressed']), ['line', 'column', 'skirmish'].map(value => value === mode));
      }
      assert.equal(h.calls.length, 3);
    });
  }
  test('formation controls are one accessible group before long briefing content, without duplicate handlers', () => {
    const h = harness();
    assert.equal(nodes(h.tree(), n => n.props['aria-label'] === 'Formation order').length, 1);
    const details = nodes(h.tree(), n => n.props.id === 'cw-inspector-details')[0];
    const children = nodes(details, n => n === h.group() || n.props.className === 'cw-army-attention');
    assert.equal(children[0], h.group());
    assert.equal(h.buttons().length, 3);
  });
  test('selecting a different unit preserves its own mode and does not issue an order', () => {
    const h = harness(), units = h.engine.snapshot().formations.filter(f => f.side === 'confederate' && f.type === 'infantry' && f.active);
    assert.ok(units.length >= 2);
    h.engine.setFormation(units[0].id, 'column'); h.engine.setFormation(units[1].id, 'line'); h.publish();
    const saved = h.engine.checkpoint();
    for (const unit of units.slice(0, 2)) {
      h.roster().props.onChange({ target: { value: unit.id } }); h.render();
      const expected = h.engine.snapshot().formations.find(f => f.id === unit.id).formationMode;
      assert.equal(h.buttons().find(b => b.props.children === expected).props['aria-pressed'], true);
    }
    assert.equal(h.calls.length, 0); assert.deepEqual(h.engine.checkpoint(), saved);
  });
  test('artillery and inactive infantry retain disabled formation controls', () => {
    const h = harness(), snapshot = h.engine.snapshot();
    const gun = snapshot.formations.find(f => f.side === 'confederate' && f.type === 'artillery'); assert.ok(gun);
    h.roster().props.onChange({ target: { value: gun.id } }); h.render();
    assert.ok(h.buttons().every(b => b.props.disabled === true));
    const unit = snapshot.formations.find(f => f.side === 'confederate' && f.type === 'infantry');
    const altered = structuredClone(snapshot); altered.formations.find(f => f.id === unit.id).active = false;
    h.publish(altered); h.roster().props.onChange({ target: { value: unit.id } }); h.render();
    assert.ok(h.buttons().every(b => b.props.disabled === true)); assert.equal(h.calls.length, 0);
  });
  test('completed battle retains disabled mode controls', () => {
    const h = harness(); h.publish({ ...h.engine.snapshot(), outcome: 'confederate_victory', resolving: false });
    assert.ok(h.buttons().every(b => b.props.disabled === true)); assert.equal(h.calls.length, 0);
  });
} finally {
  await vite.close(); rmSync(cacheDir, { recursive: true, force: true });
  if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
}
