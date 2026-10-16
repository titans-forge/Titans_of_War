import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'vite';
import { assaultSectorPresentation } from '../src/battle/assaultSectorPresentation.js';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { BATTLE_SCENARIOS } from '../src/game/battles.js';
import { createFreshCampaignState } from '../src/game/campaignStorage.js';

const sectors = [{ id: 'left' }, { id: 'center' }, { id: 'angle' }];
const infantry = { id: 'pickett-division', type: 'infantry', order: 'assault', assaultSector: 'left' };
test('received assault is displayed, while obsolete sector facts on other orders are ignored', () => {
  assert.equal(assaultSectorPresentation(infantry, sectors), 'left');
  assert.equal(assaultSectorPresentation({ ...infantry, order: 'hold' }, sectors), 'nearest');
  assert.equal(assaultSectorPresentation({ ...infantry, directMove: true }, sectors), 'nearest');
});
test('queued explicit assault takes precedence over the received assault', () => {
  const unit = { ...infantry, pendingCommand: { order: 'assault', point: { sectorId: 'angle' } } };
  assert.equal(assaultSectorPresentation(unit, sectors), 'angle');
  assert.equal(assaultSectorPresentation({ ...unit, pendingCommand: { order: 'hold' } }, sectors), 'left');
});
test('queued nearest assault does not borrow a received target or infer a sector from coordinates', () => {
  for (const point of [null, undefined, { x: 470, y: 330 }]) {
    assert.equal(assaultSectorPresentation({ ...infantry, pendingCommand: { order: 'assault', point } }, sectors), 'nearest');
  }
});
test('an explicit draft including nearest wins without mutating the received or pending order', () => {
  const unit = { ...infantry, pendingCommand: { order: 'assault', point: { sectorId: 'center' } } };
  const before = structuredClone(unit);
  for (const draft of ['angle', 'nearest']) assert.equal(assaultSectorPresentation(unit, sectors, draft), draft);
  assert.deepEqual(unit, before);
});
test('unknown sectors and malformed drafts fail closed, including a sector removed after selection', () => {
  for (const bad of ['missing', '', null, 1, { sectorId: 'left' }]) {
    assert.equal(assaultSectorPresentation(infantry, sectors, bad), 'nearest');
    assert.equal(assaultSectorPresentation({ ...infantry, assaultSector: bad }, sectors), 'nearest');
    assert.equal(assaultSectorPresentation({ ...infantry, pendingCommand: { order: 'assault', point: { sectorId: bad } } }, sectors), 'nearest');
  }
  assert.equal(assaultSectorPresentation(infantry, [{ id: 'center' }], 'left'), 'nearest');
  assert.equal(assaultSectorPresentation(infantry, null), 'nearest');
});
test('no selection and artillery safely show nearest despite stale assault facts or a draft', () => {
  for (const selected of [null, undefined, { ...infantry, type: 'artillery' }]) {
    assert.equal(assaultSectorPresentation(selected, sectors, 'left'), 'nearest');
  }
});

const battle = Object.values(BATTLE_SCENARIOS).find(value => value.id === 'gettysburg');
function engine(battleId = 'gettysburg') {
  const state = { ...createFreshCampaignState(1861), battleRulesVersion: battleId === 'gettysburg' ? 18 : 17 };
  return { state, battle: Object.values(BATTLE_SCENARIOS).find(value => value.id === battleId), engine: new CivilWarBattleEngine(battleId, state, 'option_a') };
}
for (const phase of ['pending', 'received']) test(`actual engine checkpoint retains ${phase} assault target and is unchanged by presentation`, () => {
  const f = engine();
  assert.equal(f.engine.order('pickett-division', 'assault', { sectorId: 'left' }), true);
  if (phase === 'received') f.engine.tick(2.1);
  const checkpoint = f.engine.checkpoint();
  const restored = CivilWarBattleEngine.fromCheckpoint(checkpoint, 'gettysburg', f.state, 'option_a');
  const snapshot = restored.snapshot();
  const unit = snapshot.formations.find(value => value.id === infantry.id);
  assert.equal(phase === 'pending' ? unit.pendingCommand.order : unit.order, 'assault');
  assert.equal(assaultSectorPresentation(unit, snapshot.gettysburg.sectors), 'left');
  assert.deepEqual(restored.checkpoint(), checkpoint);
});
test('actual nearest command stays nearest while queued, then displays the engine-selected received sector', () => {
  const f = engine(); f.engine.order(infantry.id, 'assault');
  let snapshot = f.engine.snapshot();
  assert.equal(assaultSectorPresentation(snapshot.formations.find(u => u.id === infantry.id), snapshot.gettysburg.sectors), 'nearest');
  f.engine.tick(2.1); snapshot = f.engine.snapshot();
  const unit = snapshot.formations.find(u => u.id === infantry.id);
  assert.ok(snapshot.gettysburg.sectors.some(s => s.id === unit.assaultSector));
  assert.equal(assaultSectorPresentation(unit, snapshot.gettysburg.sectors), unit.assaultSector);
});

// Execute the real encounter component and its actual event handlers with
// controlled React hooks. JSX elements are inspected without a DOM/GPU; effects
// and Phaser are omitted. This verifies selection flow, not browser pixels.
const cacheDir = mkdtempSync(join(tmpdir(), 'civil-assault-sector-'));
const previousWindow = globalThis.window;
globalThis.window = { localStorage: { getItem: () => '1' }, matchMedia: () => ({ matches: false }) };
const hooksSource = `
let slots=[],cursor=0;
export function reset(){slots=[];cursor=0;}
export function begin(){cursor=0;}
export function useState(initial){const index=cursor++;if(!(index in slots))slots[index]=typeof initial==='function'?initial():initial;return [slots[index],value=>{slots[index]=typeof value==='function'?value(slots[index]):value;}];}
export function useRef(value){return useState(()=>({current:value}))[0];}
export function useReducer(reducer,arg,init){const [value,set]=useState(()=>init?init(arg):arg);return [value,action=>set(previous=>reducer(previous,action))];}
export function useMemo(fn){return fn();}
export function useCallback(fn){return fn;}
export function useEffect(){}
`;
const vite = await createServer({
  configLoader: 'native', cacheDir, optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'silent',
  plugins: [{ name: 'assault-sector-component-harness', enforce: 'pre',
    resolveId(id) {
      if (id === 'virtual:assault-sector-hooks') return '\0assault-sector-hooks';
      if (id.endsWith('/battle/CivilWarBattlefield.jsx')) return '\0assault-sector-field';
    },
    load(id) {
      if (id === '\0assault-sector-hooks') return hooksSource;
      if (id === '\0assault-sector-field') return 'export function CivilWarBattlefield(){return null;}';
    },
    transform(code, id) {
      if (id.endsWith('/src/components/CivilWarBattleEncounter.jsx')) return code.replace("from 'react';", "from 'virtual:assault-sector-hooks';");
    },
  }],
});
let closed = false;
async function closeHarness() {
  if (closed) return;
  closed = true;
  try { await vite.close(); }
  finally {
    rmSync(cacheDir, { recursive: true, force: true });
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
  }
}
after(closeHarness);
function nodes(root, predicate, parent = null) {
  if (Array.isArray(root)) return root.flatMap(child => nodes(child, predicate, parent));
  if (!root?.props) return [];
  return [...(predicate(root, parent) ? [root] : []), ...nodes(root.props.children, predicate, root)];
}
try {
  const { CivilWarBattleEncounter } = await vite.ssrLoadModule('/src/components/CivilWarBattleEncounter.jsx');
  const hooks = await vite.ssrLoadModule('virtual:assault-sector-hooks');
  function harness(f = engine()) {
    hooks.reset(); const props = { battle: f.battle || battle, choiceId: 'option_a', campaignState: f.state };
    let tree, calls = [];
    const render = () => { hooks.begin(); tree = CivilWarBattleEncounter(props); return tree; };
    const field = () => nodes(tree, element => element.type?.name === 'CivilWarBattlefield')[0];
    const publish = snapshot => { field().props.onSnapshot(snapshot); render(); };
    render(); field().props.ref.current = { order: (...args) => calls.push(args), selectAndFocus() {} };
    publish(f.engine.snapshot());
    return { f, render, publish, calls, field,
      sector: () => nodes(tree, (element, parent) => element.type === 'select' && parent?.props.className === 'cw-quick-sector')[0],
      roster: () => nodes(tree, (element, parent) => element.type === 'select' && parent?.props.className === 'cw-roster')[0],
      staging: () => nodes(tree, (element, parent) => element.type === 'button' && parent?.props.className === 'cw-staging-list'),
      assault: () => nodes(tree, element => element.type === 'button' && element.props.title === 'Commit this infantry formation to the selected command sector.')[0],
    };
  }
  test('actual component first snapshot reflects a restored received assault', () => {
    const f = engine(); f.engine.order(infantry.id, 'assault', { sectorId: 'left' }); f.engine.tick(2.1);
    f.engine = CivilWarBattleEngine.fromCheckpoint(f.engine.checkpoint(), 'gettysburg', f.state, 'option_a');
    const h = harness(f); assert.equal(h.sector().props.value, 'left');
  });
  test('actual component first snapshot reflects a restored pending assault', () => {
    const f = engine(); f.engine.order(infantry.id, 'assault', { sectorId: 'angle' });
    f.engine = CivilWarBattleEngine.fromCheckpoint(f.engine.checkpoint(), 'gettysburg', f.state, 'option_a');
    const h = harness(f); assert.equal(h.sector().props.value, 'angle');
  });
  test('actual selector draft survives repeated snapshots and submits only the visible choice', () => {
    const h = harness(); h.sector().props.onChange({ target: { value: 'center' } }); h.render();
    h.f.engine.order(infantry.id, 'assault', { sectorId: 'left' }); h.publish(h.f.engine.snapshot());
    assert.equal(h.sector().props.value, 'center', 'pending-order snapshots preserve the draft');
    h.f.engine.tick(2.1); h.publish(h.f.engine.snapshot());
    assert.equal(h.sector().props.value, 'center', 'received-order snapshots preserve the draft');
    for (let i = 0; i < 12; i++) { h.publish(h.f.engine.snapshot()); assert.equal(h.sector().props.value, 'center'); }
    assert.equal(h.calls.length, 0, 'choosing a sector issues no engine order');
    h.assault().props.onClick(); assert.deepEqual(h.calls, [['assault', { sectorId: 'center' }]]);
    h.sector().props.onChange({ target: { value: 'nearest' } }); h.render(); h.assault().props.onClick();
    assert.deepEqual(h.calls.at(-1), ['assault', null]);
  });
  test('roster switches use each unit own recorded or draft target without leaking the previous choice', () => {
    const f = engine(); f.engine.order('pettigrew-division', 'assault', { sectorId: 'angle' });
    const h = harness(f); h.sector().props.onChange({ target: { value: 'left' } }); h.render();
    h.roster().props.onChange({ target: { value: 'pettigrew-division' } }); h.render();
    assert.equal(h.sector().props.value, 'angle');
    h.sector().props.onChange({ target: { value: 'center' } }); h.render();
    h.roster().props.onChange({ target: { value: infantry.id } }); h.render(); assert.equal(h.sector().props.value, 'left');
    h.roster().props.onChange({ target: { value: 'pettigrew-division' } }); h.render(); assert.equal(h.sector().props.value, 'center');
    assert.equal(h.calls.length, 0);
  });
  test('staging buttons assign their draft to the new selection and artillery stays safely disabled', () => {
    const h = harness(); h.sector().props.onChange({ target: { value: 'left' } }); h.render();
    h.staging().find(button => button.key === 'trimble-division').props.onClick(); h.render();
    assert.equal(h.roster().props.value, 'trimble-division'); assert.equal(h.sector().props.value, 'angle');
    h.roster().props.onChange({ target: { value: infantry.id } }); h.render(); assert.equal(h.sector().props.value, 'left');
    h.roster().props.onChange({ target: { value: 'alexander-battalion' } }); h.render();
    assert.equal(h.sector().props.value, 'nearest'); assert.equal(h.sector().props.disabled, true); assert.equal(h.assault().props.disabled, true);
  });
  for (const [battleId, ids, target] of [
    ['first_manassas', ['jackson-brigade', 'bee-evans-line'], 'left'],
    ['shiloh', ['hardee-corps', 'bragg-corps'], 'right'],
  ]) test(`actual ${battleId} field-plan clicks select each step id and retain its own objective draft`, () => {
    const h = harness(engine(battleId));
    const before = h.f.engine.checkpoint();
    assert.equal(h.f.engine.snapshot().fieldBattle.attackObjective.id, target);
    for (const id of ids) {
      const button = h.staging().find(value => value.key === id);
      assert.ok(button, `${id} has a real field-plan staging button`);
      assert.equal(button.props.disabled, false);
      button.props.onClick(); h.render();
      assert.equal(h.roster().props.value, id);
      assert.equal(h.sector().props.value, target);
      assert.equal(h.field().props.speed, 0);
      for (let i = 0; i < 3; i++) { h.publish(h.f.engine.snapshot()); assert.equal(h.sector().props.value, target); }
      h.sector().props.onChange({ target: { value: 'nearest' } }); h.render();
    }
    for (const id of ids) {
      h.roster().props.onChange({ target: { value: id } }); h.render();
      assert.equal(h.sector().props.value, 'nearest', 'each formation retains its explicit nearest draft');
    }
    assert.equal(h.calls.length, 0, 'staging selection and draft changes issue no engine order');
    assert.deepEqual(h.f.engine.checkpoint(), before, 'staging selection leaves saved combat unchanged');
  });
} catch (error) {
  await closeHarness();
  throw error;
}
