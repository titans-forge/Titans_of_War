import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transformSync } from 'rolldown/experimental';
import { createFieldViewContext, readFieldViewContext, withFieldViewContext, fitFieldViewContextCamera } from '../src/battle/fieldViewContext.js';
import { createFieldViewCheckpoint, readFieldViewCheckpoint } from '../src/battle/fieldViewCheckpoint.js';
import { readBattleDisplayPreferences } from '../src/battle/battleDisplayPreferences.js';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { combatCheckpointEnvelope } from '../src/battle/combatCheckpointEnvelope.js';
import { createFreshCampaignState } from '../src/game/campaignStorage.js';
import { BATTLE_SCENARIOS } from '../src/game/battles.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const clone = value => JSON.parse(JSON.stringify(value));
const campaign = createFreshCampaignState(1861);
const battleFor = id => Object.values(BATTLE_SCENARIOS).find(battle => battle.id === id);
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
const center = camera => ({ x: camera.scrollX + camera.width / 2, y: camera.scrollY + camera.height / 2 });

// Actual Phaser BaseCamera math, with only its unused browser component barrel
// narrowed to the two mixins it imports. No Vite, server, browser or GPU exists.
const cameraPath = root + 'node_modules/phaser/src/cameras/2d/BaseCamera.js';
const require = createRequire(cameraPath);
const cameraModule = { exports: {} };
new Function('module', 'exports', 'require', readFileSync(cameraPath, 'utf8'))(cameraModule, cameraModule.exports,
  name => name === '../../gameobjects/components' ? {
    AlphaSingle: require('../../gameobjects/components/AlphaSingle.js'),
    Visible: require('../../gameobjects/components/Visible.js'),
  } : require(name));
const Camera = cameraModule.exports;

// Transpile the physical production components with the installed Rolldown.
// Controlled hooks expose their actual props and Save callback. Effects create
// the actual Scene and engine through a Phaser Game recorder; no draw is mocked
// as a browser proof. Encounter effects are left to the public production QA.
function hooks() {
  let slots = [], cursor = 0, pending = [], cleanup = [];
  const api = {
    begin() { cursor = 0; },
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(value) { return api.useState(() => ({ current: value }))[0]; },
    useMemo(fn) { return fn(); }, useCallback(fn) { return fn; },
    useReducer(reducer, value, init) { const [state, set] = api.useState(() => init ? init(value) : value); return [state, action => set(old => reducer(old, action))]; },
    useEffect(fn, deps) { const i = cursor++, old = slots[i];
      if (!old || !deps || deps.some((value, j) => !Object.is(value, old.deps[j]))) pending.push(() => {
        old?.cleanup?.(); const dispose = fn(); slots[i] = { deps, cleanup: dispose }; if (dispose) cleanup.push(dispose);
      }); },
    useImperativeHandle(ref, fn) { ref.current = fn(); }, forwardRef(fn) { return fn; },
    flush() { const tasks = pending; pending = []; tasks.forEach(fn => fn()); },
    close() { cleanup.reverse().forEach(fn => fn()); slots = []; pending = []; cleanup = []; },
  };
  return api;
}
const jsx = (type, props) => ({ type, props });
const find = (tree, predicate) => Array.isArray(tree) ? tree.flatMap(node => find(node, predicate)) : !tree?.props ? []
  : [...(predicate(tree) ? [tree] : []), ...find(tree.props.children, predicate)];
const FieldStub = function CivilWarBattlefield() {};
const emptyExports = new Proxy({}, { get: (_target, key) => key === '__esModule' ? true : function Placeholder() {} });
async function component(path, react, games = []) {
  const source = readFileSync(root + path, 'utf8');
  const transformed = transformSync(path, source.replace('import.meta.env.BASE_URL', "'/'"), { lang: 'jsx', jsx: { runtime: 'automatic', development: false } });
  assert.deepEqual(transformed.errors, []);
  const imports = [];
  const code = transformed.code.replace(/import\s+(?:(\{[^}]*\}|[A-Za-z_$][\w$]*)\s+from\s+["']([^"']+)["']|["']([^"']+)["']);?/g,
    (_match, bindings, name, sideEffect) => { imports.push({ bindings, name: name || sideEffect }); return ''; })
    .replace(/\bexport (?=(?:const|function|class)\b)/g, '');
  const names = [...new Set(imports.map(entry => entry.name))];
  const modules = new Map();
  for (const name of names) {
    if (name === 'react') modules.set(name, react);
    else if (name === 'react/jsx-runtime') modules.set(name, { jsx, jsxs: jsx, Fragment: 'fragment' });
    else if (name === 'phaser') modules.set(name, { __esModule: true, default: {
      Scene: class {}, CANVAS: 1, Scale: { RESIZE: 1 }, Game: class { constructor(config) { this.config = config; games.push(this); } destroy() { this.destroyed = true; } },
    } });
    else if (name.endsWith('/CivilWarBattlefield.jsx')) modules.set(name, { CivilWarBattlefield: FieldStub });
    else if (name.endsWith('.jsx') || name.endsWith('.css') || name === 'lucide-react') modules.set(name, emptyExports);
    else modules.set(name, await import(new URL(name, pathToFileURL(root + path))));
  }
  const parameters = [], values = [];
  for (const { bindings, name } of imports) {
    if (!bindings) continue;
    const module = modules.get(name);
    if (bindings.trim().startsWith('{')) {
      for (const binding of bindings.replace(/[{}]/g, '').split(',').filter(value => value.trim())) {
        const [original, local = original] = binding.trim().split(/\s+as\s+/); parameters.push(local); values.push(module[original]);
      }
    } else { parameters.push(bindings.trim()); values.push(module.default); }
  }
  const exported = [...source.matchAll(/export (?:const|function) (\w+)/g)].map(match => match[1]);
  return new Function(...parameters, code + '\nreturn {' + exported.join(',') + '};')(...values);
}
const previousWindow = globalThis.window;
globalThis.window = { location: { search: '' }, localStorage: { getItem: () => '1' }, matchMedia: () => ({ matches: false }) };
test.after(() => { if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; });

async function wrapper({ scenarioId = 'gettysburg', selectedId = battleFor(scenarioId).defaultSelection, checkpoint = null,
  search = '', width = 1194, height = 670, preferences = {} } = {}) {
  globalThis.window.location.search = search;
  const react = hooks(), games = [], { CivilWarBattlefield } = await component('src/battle/CivilWarBattlefield.jsx', react, games);
  const ref = { current: null }, props = { scenarioId, campaignState: campaign, choiceId: 'option_a', speed: 0, selectedId,
    onSelect() {}, onSnapshot() {}, onDestination() {}, onZoom() {}, checkpoint,
    showRange: preferences.fireArc ?? false, missionMarkers: preferences.missionMarkers ?? true, terrainOverlay: preferences.tacticalOverlay ?? false };
  react.begin(); const tree = CivilWarBattlefield(props, ref); tree.props.ref.current = {}; react.flush();
  const scene = games[0].config.scene;
  scene.scale = { width, height }; scene.cameras = { main: new Camera(0, 0, width, height) }; scene.fitCamera();
  return { scene, ref, react, games, props, render(next) { Object.assign(props, next); react.begin(); CivilWarBattlefield(props, ref); react.flush(); }, close() { react.close(); } };
}
function frame(scene, zoom = 1.1, x = 1040, y = 620) {
  scene.cameraMode = 'manual'; scene.cameras.main.setZoom(zoom); scene.updateCameraBounds(); scene.cameras.main.centerOn(x, y);
}
async function encounter(checkpoint, scenarioId = 'gettysburg') {
  const react = hooks(), { CivilWarBattleEncounter } = await component('src/components/CivilWarBattleEncounter.jsx', react);
  react.begin(); const tree = CivilWarBattleEncounter({ battle: battleFor(scenarioId), campaignState: campaign,
    choiceId: 'option_a', onResolve() {}, onClose() {}, onSuspend() {}, checkpoint });
  const field = find(tree, node => node.type === FieldStub)[0]; assert.ok(field);
  return { tree, field, react };
}

test('production Save wrapper captures Pettigrew, focused framing and preferences at unchanged combat time', async () => {
  const warm = await wrapper({ selectedId: 'pettigrew-division', preferences: { fireArc: true, missionMarkers: false, tacticalOverlay: true } });
  try {
    warm.scene.engine.tick(.2); warm.scene.engine.order('pettigrew-division', 'advance'); frame(warm.scene);
    const combat = warm.scene.engine.checkpoint(), raw = warm.scene.checkpoint();
    assert.equal(raw.presentation.fieldViewContext, undefined, 'direct Scene format stays unchanged');
    const saved = warm.ref.current.checkpoint();
    assert.deepEqual(combatCheckpointEnvelope(saved), combat);
    assert.equal(saved.presentation.fieldView, undefined, 'ordinary URL needs no experimental metadata');
    assert.equal(saved.presentation.fieldViewContext.selectedId, 'pettigrew-division');
    assert.deepEqual(saved.presentation.fieldViewContext.camera.center, center(warm.scene.cameras.main));
    assert.deepEqual(readBattleDisplayPreferences(saved, 'gettysburg'), { fireArc: true, missionMarkers: false, tacticalOverlay: true });
    assert.deepEqual(warm.scene.engine.checkpoint(), combat, 'Save advances no time and issues no order');
  } finally { warm.close(); }
});

test('production Encounter cold initialization exposes the restored roster, paused field and preferences', async () => {
  const warm = await wrapper({ selectedId: 'pettigrew-division', preferences: { fireArc: true, missionMarkers: false } });
  try {
    frame(warm.scene); const saved = clone(warm.ref.current.checkpoint()); const cold = await encounter(saved);
    try {
      assert.equal(cold.field.props.selectedId, 'pettigrew-division'); assert.equal(cold.field.props.speed, 0);
      assert.equal(cold.field.props.showRange, true); assert.equal(cold.field.props.missionMarkers, false);
      assert.equal(find(cold.tree, node => node.type === 'select' && node.props.value === 'pettigrew-division').length, 1);
    } finally { cold.react.close(); }
  } finally { warm.close(); }
});

test('actual Scene restores ordinary context before drawing and immediate cold Save preserves checkpoint and context', async () => {
  const warm = await wrapper({ selectedId: 'pettigrew-division' });
  let cold;
  try {
    warm.scene.engine.tick(.2); warm.scene.engine.order('pettigrew-division', 'advance'); frame(warm.scene);
    const saved = clone(warm.ref.current.checkpoint());
    cold = await wrapper({ selectedId: readFieldViewContext(saved, warm.scene.world, 'gettysburg').selectedId, checkpoint: saved });
    const combat = cold.scene.engine.checkpoint();
    assert.equal(cold.scene.viewContinuityEnabled, false); assert.equal(cold.scene.restoreCommandView(), true);
    assert.equal(cold.scene.speed, 0); assert.equal(cold.scene.selectedId, 'pettigrew-division');
    near(cold.scene.cameras.main.zoom, saved.presentation.fieldViewContext.camera.zoom);
    assert.deepEqual(center(cold.scene.cameras.main), saved.presentation.fieldViewContext.camera.center);
    assert.deepEqual(cold.ref.current.checkpoint(), saved); assert.deepEqual(cold.scene.engine.checkpoint(), combat);
  } finally { cold?.close(); warm.close(); }
});

test('second field restores nondefault selection and clamps requested framing for compact and larger viewports', async () => {
  const warm = await wrapper({ scenarioId: 'third_winchester' }); let cold;
  try {
    const selected = warm.scene.engine.state.find(unit => unit.id !== warm.props.selectedId && unit.side === 'confederate' && unit.active);
    assert.ok(selected); warm.render({ selectedId: selected.id }); frame(warm.scene, 1.4, 12, 12);
    const saved = clone(warm.ref.current.checkpoint()), ui = await encounter(saved, 'third_winchester');
    assert.equal(ui.field.props.selectedId, selected.id); ui.react.close();
    cold = await wrapper({ scenarioId: 'third_winchester', selectedId: selected.id, checkpoint: saved, width: 390, height: 296 });
    const combat = cold.scene.engine.checkpoint(); assert.equal(cold.scene.restoreCommandView(), true);
    for (const [width, height] of [[390, 296], [1600, 900], [340, 270]]) {
      cold.scene.scale = { width, height }; cold.scene.cameras.main.setSize(width, height); cold.scene.resizeCamera();
      const expected = fitFieldViewContextCamera(saved.presentation.fieldViewContext.camera, cold.scene.world, cold.scene.scale);
      near(cold.scene.cameras.main.zoom, expected.zoom); near(center(cold.scene.cameras.main).x, expected.center.x); near(center(cold.scene.cameras.main).y, expected.center.y);
      assert.deepEqual(cold.scene.engine.checkpoint(), combat); assert.equal(cold.scene.selectedId, selected.id);
    }
  } finally { cold?.close(); warm.close(); }
});

test('all eleven supported fields admit UI context with exact field/world/time binding', async () => {
  const fields = [...new Set(Object.values(BATTLE_SCENARIOS).map(battle => battle.id))]; assert.equal(fields.length, 11);
  for (const scenarioId of fields) {
    const field = await wrapper({ scenarioId });
    try {
      const selected = field.scene.engine.state.find(unit => unit.side === 'confederate' && unit.active);
      assert.ok(selected, scenarioId); field.render({ selectedId: selected.id }); frame(field.scene, 1.2, 600, 400);
      const saved = field.ref.current.checkpoint(), view = readFieldViewContext(saved, field.scene.world, scenarioId);
      assert.equal(view.selectedId, selected.id, scenarioId); assert.ok(view.camera, scenarioId);
      assert.deepEqual(combatCheckpointEnvelope(saved), field.scene.engine.checkpoint(), scenarioId);
    } finally { field.close(); }
  }
});

test('old, missing, foreign and malformed context falls back without rejecting a valid combat checkpoint', async () => {
  const warm = await wrapper({ selectedId: 'pettigrew-division' });
  try {
    frame(warm.scene); const saved = clone(warm.ref.current.checkpoint()), combat = warm.scene.engine.checkpoint();
    const mutations = [s => { delete s.presentation.fieldViewContext; }, s => { s.presentation.fieldViewContext = null; },
      s => { s.presentation.fieldViewContext.version = 0; }, s => { s.presentation.fieldViewContext.scenarioId = 'shiloh'; },
      s => { s.presentation.fieldViewContext.time += 1; }, s => { s.presentation.time += 1; },
      s => { s.presentation.fieldViewContext.world.width += 1; }, s => { s.presentation.fieldViewContext.extra = true; }];
    for (const mutate of mutations) {
      const invalid = clone(saved); mutate(invalid);
      assert.equal(readFieldViewContext(invalid, warm.scene.world, 'gettysburg'), null);
      assert.deepEqual(CivilWarBattleEngine.fromCheckpoint(combatCheckpointEnvelope(invalid), 'gettysburg', campaign, 'option_a').checkpoint(), combat);
      const cold = await encounter(invalid); assert.equal(cold.field.props.selectedId, battleFor('gettysburg').defaultSelection); cold.react.close();
    }
  } finally { warm.close(); }
});

test('enemy, missing, inactive, routed, broken, surrendered and withdrawn selections retain safe defaults', async () => {
  const warm = await wrapper({ selectedId: 'pettigrew-division' });
  try {
    frame(warm.scene); const saved = clone(warm.ref.current.checkpoint());
    const choices = [null, '', 'not-a-formation', warm.scene.engine.state.find(unit => unit.side === 'union').id];
    for (const id of choices) {
      const invalid = clone(saved); invalid.presentation.fieldViewContext.selectedId = id;
      const view = readFieldViewContext(invalid, warm.scene.world, 'gettysburg'); assert.equal(view.selectedId, null); assert.ok(view.camera);
      const cold = await encounter(invalid); assert.equal(cold.field.props.selectedId, battleFor('gettysburg').defaultSelection); cold.react.close();
    }
    for (const [key, value] of [['active', false], ['status', 'routing'], ['status', 'broken'], ['status', 'surrendered'], ['withdrawn', true]]) {
      const invalid = clone(saved); invalid.state.state.find(unit => unit.id === 'pettigrew-division')[key] = value;
      assert.equal(readFieldViewContext(invalid, warm.scene.world, 'gettysburg').selectedId, null);
      const cold = await encounter(invalid); assert.equal(cold.field.props.selectedId, battleFor('gettysburg').defaultSelection); cold.react.close();
    }
  } finally { warm.close(); }
});

test('invalid camera falls back independently of valid selection and hostile accessors never execute', async () => {
  const warm = await wrapper({ selectedId: 'pettigrew-division' });
  try {
    frame(warm.scene); const saved = clone(warm.ref.current.checkpoint());
    for (const camera of [null, {}, [], { mode: 'free', zoom: NaN, center: { x: 500, y: 500 } },
      { mode: 'free', zoom: 65, center: { x: 500, y: 500 } }, { mode: 'free', zoom: 1, center: { x: Infinity, y: 500 } }]) {
      const invalid = clone(saved); invalid.presentation.fieldViewContext.camera = camera;
      assert.deepEqual(readFieldViewContext(invalid, warm.scene.world, 'gettysburg'), { selectedId: 'pettigrew-division', camera: null });
    }
    let reads = 0;
    for (const path of [['presentation'], ['presentation', 'fieldViewContext'], ['presentation', 'fieldViewContext', 'camera'], ['presentation', 'fieldViewContext', 'camera', 'center']]) {
      const invalid = clone(saved); let owner = invalid; for (const part of path.slice(0, -1)) owner = owner[part];
      Object.defineProperty(owner, path.at(-1), { enumerable: true, get() { reads++; throw new Error('accessor must not run'); } });
      readFieldViewContext(invalid, warm.scene.world, 'gettysburg');
      const cold = await wrapper({ checkpoint: invalid });
      try { assert.deepEqual(cold.scene.engine.checkpoint(), combatCheckpointEnvelope(saved)); }
      finally { cold.close(); }
    }
    assert.equal(reads, 0);
    const scene = warm.scene, before = scene.engine.checkpoint(); scene.savedViewContext = { selectedId: 'pettigrew-division', camera: null };
    scene.fitCamera(); const initial = center(scene.cameras.main); assert.equal(scene.restoreCommandView(), false);
    assert.deepEqual(center(scene.cameras.main), initial); assert.deepEqual(scene.engine.checkpoint(), before);
  } finally { warm.close(); }
});

test('legacy v39 camera-only metadata and query gate remain valid without a new UI context', async () => {
  const search = '?artPass=gettysburg-v32&viewContinuity=v39'; const warm = await wrapper({ search }); let cold;
  try {
    frame(warm.scene); const old = clone(warm.scene.checkpoint()); assert.ok(old.presentation.fieldView); assert.equal(old.presentation.fieldViewContext, undefined);
    assert.ok(readFieldViewCheckpoint(old.presentation, warm.scene.world, 'gettysburg', warm.scene.engine.time, warm.scene.scale));
    cold = await wrapper({ search, checkpoint: old }); assert.equal(cold.scene.savedViewContext, null);
    assert.equal(cold.scene.viewContinuityEnabled, true); assert.equal(cold.scene.restoreCommandView(), false); assert.equal(cold.scene.restoreFieldView(), true);
    assert.deepEqual(cold.scene.checkpoint(), old);
    const legacy = createFieldViewCheckpoint(warm.scene.cameras.main, 'manual', warm.scene.world, 'gettysburg', warm.scene.engine.time);
    assert.deepEqual(old.presentation.fieldView, legacy);
  } finally { cold?.close(); warm.close(); }
});

test('current scroll is captured after a pan while Phaser midpoint is stale', async () => {
  const warm = await wrapper({ selectedId: 'pettigrew-division' });
  try {
    frame(warm.scene); const camera = warm.scene.cameras.main, stale = { ...camera.midPoint };
    camera.setScroll(camera.scrollX - 30, camera.scrollY - 20);
    const view = warm.ref.current.checkpoint().presentation.fieldViewContext.camera;
    const actual = center(camera); near(view.center.x, actual.x); near(view.center.y, actual.y);
    assert.notEqual(view.center.x, stale.x); assert.notEqual(view.center.y, stale.y);
  } finally { warm.close(); }
});

test('finite extreme framing is clamped and overview refits on a changed viewport', () => {
  const world = { width: 1700, height: 900 }, viewport = { width: 390, height: 296 };
  const view = fitFieldViewContextCamera({ mode: 'free', zoom: 64, center: { x: -500, y: 999999 } }, world, viewport);
  assert.equal(view.zoom, 1.7); near(view.center.x, viewport.width / (2 * 1.7)); near(view.center.y, world.height - viewport.height / (2 * 1.7));
  const overview = fitFieldViewContextCamera({ mode: 'overview', zoom: .5, center: { x: 15, y: 20 } }, world, viewport);
  assert.deepEqual(overview.center, { x: 850, y: 450 }); near(overview.zoom, Math.min(390 / 1700, 296 / 900));
  assert.equal(fitFieldViewContextCamera(view, world, { width: 0, height: 296 }), null);
});

test('helper capture and read return owned copies while all other presentation owners remain exact', async () => {
  const warm = await wrapper({ selectedId: 'pettigrew-division' });
  try {
    frame(warm.scene); const raw = warm.scene.checkpoint(), before = clone(raw);
    raw.presentation.unrelated = { retained: [1, 2, 3] };
    const saved = withFieldViewContext(raw, warm.scene.cameras.main, warm.scene.cameraMode, warm.scene.world, 'gettysburg', 'pettigrew-division');
    assert.deepEqual(saved.presentation.unrelated, { retained: [1, 2, 3] }); assert.equal(raw.presentation.fieldViewContext, undefined);
    assert.deepEqual(combatCheckpointEnvelope(saved), combatCheckpointEnvelope(before));
    const read = readFieldViewContext(saved, warm.scene.world, 'gettysburg'); read.camera.center.x = -10;
    assert.notEqual(saved.presentation.fieldViewContext.camera.center.x, -10);
    assert.equal(createFieldViewContext(raw, warm.scene.cameras.main, 'manual', warm.scene.world, 'shiloh', 'pettigrew-division'), null);
  } finally { warm.close(); }
});
