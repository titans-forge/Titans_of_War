import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { test } from 'node:test';
import { parseAst } from 'rolldown/parseAst';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { clearFieldCheckpoint } from '../src/game/fieldCheckpoint.js';
import * as storageApi from '../src/game/campaignStorage.js';
import * as supplyApi from '../src/game/campaignSupply.js';
import { createAfterAction } from '../src/game/campaignExperience.js';
import { battleResultLabel } from '../src/game/battles.js';
import { parseLetterSentimentOffline } from '../src/game/simulationEngine.js';
import { advanceCampaignTurn, getScenarioForState } from '../src/game/headlessCampaign.js';
import { createServer } from 'vite';

// Execute the real handlers without mounting App, touching browser storage,
// or starting Vite. This checks handler transitions, not React effect timing.
const source = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const ast = parseAst(source, { lang: 'jsx' });
function findNodes(root, predicate) {
  const found = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) found.push(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  }
  visit(root);
  return found;
}
function only(nodes, label) {
  assert.equal(nodes.length, 1, `Expected one ${label}; update the harness if App structure changes`);
  return nodes[0];
}
const calls = (root, name) => findNodes(root, (node) => node.type === 'CallExpression' && node.callee?.name === name).length > 0;
const slice = (node) => source.slice(node.start, node.end);
const handlers = ['protectCurrentCampaign', 'applyCampaignArchive', 'handleReset', 'resetCampaign', 'handleLoadDemoRoute', 'handleImportCampaignSave', 'handleLoadAutoSave',
  'invalidateLetterRequest', 'setLetterDraft', 'applySentimentMods', 'handleAnalyzeLetter', 'completeCampaignChoice', 'handleExecuteChoice', 'handleUndo', 'loadScenarioForTurn', 'toggleAiPortal', 'handleProceduralGenerate'];
const handlerSource = handlers.map((name) => {
  const node = only(findNodes(ast, (candidate) => candidate.type === 'VariableDeclarator' && candidate.id?.name === name), name);
  return `const ${name} = ${slice(node.init)};`;
}).join('\n');
const initialLoader = only(findNodes(ast, (node) => node.type === 'FunctionDeclaration' && node.id?.name === 'loadInitialCampaign'), 'initial loader');
const autosave = only(findNodes(ast, (node) => node.type === 'CallExpression' && node.callee?.name === 'useEffect'
  && calls(node.arguments[0], 'saveCampaignSnapshot')), 'autosave effect').arguments[0];
const returnDemo = only(findNodes(ast, (node) => node.type === 'JSXAttribute' && node.name?.name === 'onClick'
  && calls(node.value?.expression, 'applyCampaignArchive')
  && findNodes(node.value?.expression, (child) => child.type === 'Identifier' && child.name === 'demoReturnRef').length > 0), 'demo return callback').value.expression;
const restoreCheckpoint = only(findNodes(ast, (node) => node.type === 'JSXAttribute' && node.name?.name === 'onRestore'
  && calls(node.value?.expression, 'setCampaignAction')), 'checkpoint callback').value.expression;
const confirmation = only(findNodes(ast, (node) => node.type === 'JSXAttribute' && node.name?.name === 'onClick'
  && calls(node.value?.expression, 'resetCampaign')), 'confirmation callback').value.expression;
const cancelConfirmation = only(findNodes(ast, (node) => node.type === 'JSXAttribute' && node.name?.name === 'onClose'
  && calls(node.value?.expression, 'setCampaignAction')), 'cancel confirmation callback').value.expression;
const compiled = `${slice(initialLoader)}\n${handlerSource}\nconst runAutosave = ${slice(autosave)};
  const returnDemo = ${slice(returnDemo)};
  const restoreCheckpoint = ${slice(restoreCheckpoint)};
  const confirmCampaignAction = ${slice(confirmation)};
  const cancelCampaignAction = ${slice(cancelConfirmation)};`;
const plain = (value) => JSON.parse(JSON.stringify(value));
const scenarios = ['fort_sumter', 'cedar_creek', 'naval_technology'].map((id, index) => ({
  id, title: id, turn: index === 1 ? 23 : index + 1, actor: 'Fixture actor', roleLabel: 'Army Commander',
  choices: [{ id: 'option_b', text: 'Fixture choice', consequence: 'Fixture resolved.', next: 'naval_technology' }],
}));

function harness({ rawSave, failCheckpoints = false, unavailable = false, archiveProtected = false } = {}) {
  const data = new Map(rawSave === undefined ? [] : [[storageApi.CAMPAIGN_STORAGE_KEY, rawSave]]);
  const controls = { failCheckpoints, unavailable };
  const writes = [];
  const storage = {
    getItem(key) {
      if (controls.unavailable) throw new Error('Storage blocked');
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      if (controls.unavailable || (controls.failCheckpoints && key.endsWith(':checkpoints'))) throw new Error('Quota full');
      writes.push(key);
      data.set(key, value);
    },
  };
  const state = storageApi.createFreshCampaignState(1861, scenarios[0].id);
  const context = createContext({
    ...storageApi,
    initialField: {error:null}, clearFieldCheckpoint: () => clearFieldCheckpoint(storage),
    ...supplyApi,
    STATIC_SCENARIOS: scenarios,
    gameState: { ...state, actor: scenarios[0].actor, roleLabel: scenarios[0].roleLabel, pendingDebrief: null },
    activeScenario: scenarios[0], isDemo: false, archiveProtected,
    aiPortalEngaged: false, selectedModel: '', archiveMessage: '',
    undoStack: [{ state }], pendingBattle: null, showJournal: true,
    campaignAction: null, operationError: '',
    letterRequestRef: { current: 0 }, isLoadingModel: false,
    modelRequestRef: { current: null }, importRequestRef: { current: null }, AbortController, TextEncoder,
    archiveContextRef: { get current() { return { gameState: context.gameState, activeScenario: context.activeScenario }; } },
    selectedChoiceId: null, confirmExecution: false, needsConfirmation: false,
    parseLetterSentimentOffline, advanceCampaignTurn, getScenarioForState, createAfterAction,
    battleForScenario: () => context.battleFixture || null,
    updateContextualMusic() {}, logLine() {}, setTimeout() {},
    demoReturnRef: { current: null }, skipNextScenarioEffect: { current: false },
    buildDemoHistory: () => [{ scenarioId: 'demo_fixture', choiceId: 'option_b' }],
    window: { confirm: () => assert.fail('Save flows must not call native confirm'), alert: () => assert.fail('Save flows must not call native alert') },
    FileReader: class {
      abort() {}
      readAsText(file) { this.result = file.content; this.onload(); }
    },
    loadCampaignSnapshotResult: () => storageApi.loadCampaignSnapshotResult(storage),
    backupOriginalCampaignRaw: () => storageApi.backupOriginalCampaignRaw(storage),
    saveCampaignCheckpoint: (snapshot) => storageApi.saveCampaignCheckpoint(snapshot, storage),
    saveCampaignSnapshot: (snapshot, unused, key) => storageApi.saveCampaignSnapshot(snapshot, storage, key),
  });
  for (const name of ['campaignSaveStatus', 'gameState', 'activeScenario', 'isDemo', 'archiveProtected', 'pendingBattle', 'undoStack', 'selectedChoiceId', 'archiveMessage', 'showJournal', 'campaignAction', 'operationError', 'isLoadingModel', 'aiStatus', 'needsConfirmation', 'aiPortalEngaged', 'availableModels', 'selectedModel']) {
    context[`set${name[0].toUpperCase()}${name.slice(1)}`] = (value) => {
      context[name] = typeof value === 'function' ? value(context[name]) : value;
    };
  }
  Object.defineProperties(context, {
    correspondence: { get: () => storageApi.getScenarioCorrespondence(context.gameState, context.activeScenario.id) },
    letterDraft: { get: () => context.correspondence?.draft || '' },
    sentimentResult: { get: () => context.correspondence?.result || null },
  });
  runInContext(compiled, context);
  return {
    context, controls, data, writes,
    run: (code) => runInContext(code, context),
    snapshot: () => storageApi.createCampaignSnapshot(context.gameState, context.activeScenario),
  };
}
function position(h) {
  return plain({ state: h.context.gameState, scenario: h.context.activeScenario, demo: h.context.isDemo,
    protected: h.context.archiveProtected, undo: h.context.undoStack, battle: h.context.pendingBattle });
}

test('current saves reject missing core data before defaults can conceal corruption', () => {
  const original = harness().snapshot();
  const mutations = [
    (snap) => { snap.state = {}; },
    (snap) => { snap.state = []; },
    ...['seed', 'currentTurn', 'divergenceIndex', 'history', 'gameOver', 'metrics', 'shards', 'correspondence']
      .map((key) => (snap) => { delete snap.state[key]; }),
    ...Object.keys(original.state.metrics).map((key) => (snap) => { delete snap.state.metrics[key]; }),
    (snap) => { snap.state.shards.fox = {}; },
    (snap) => { delete snap.state.shards.wolf.influence; },
    (snap) => { snap.state.history = {}; },
    (snap) => { snap.state.correspondence = { scenarioId: 'fort_sumter' }; },
    (snap) => { snap.state.history = [null]; },
    (snap) => { snap.state.history = [{ scenarioId: 'fort_sumter', choiceId: 'option_b', consequence: { bad: true } }]; },
    (snap) => { snap.state.history = [{ scenarioId: 'fort_sumter', choiceId: 'option_b', scoreCard: { tactical: '100' } }]; },
    (snap) => { snap.state.statusMessage = { bad: true }; },
    (snap) => { snap.state.metrics.treasury = 1e100; },
    (snap) => { snap.activeScenario.title = { bad: true }; },
    (snap) => { snap.activeScenario.choices = { length: 4 }; },
    (snap) => { snap.activeScenario.choices[0].requiresHistory = { allOf: [null] }; },
    (snap) => { snap.state.battleCampaign.results = { fort_sumter: null }; },
    (snap) => { snap.state.shards.unknown = null; },
    (snap) => { snap.state.metrics.unknown = {}; },
  ];
  for (const mutate of mutations) {
    const invalid = structuredClone(original);
    mutate(invalid);
    assert.equal(storageApi.getCampaignSnapshotCompatibility(invalid).ok, false);
    assert.equal(storageApi.restoreCampaignFromSnapshot(invalid, scenarios), null);
    const rawSave = JSON.stringify(invalid);
    const h = harness({ rawSave });
    const loaded = h.run('loadInitialCampaign()');
    assert.equal(loaded.protectSave, true);
    h.context.archiveProtected = loaded.protectSave;
    h.run('runAutosave()');
    assert.equal(h.data.get(storageApi.CAMPAIGN_STORAGE_KEY), rawSave);
  }
});

test('explicit v1-v3 migrations preserve genuine campaigns without inventing core state', () => {
  for (const version of [1, 2, 3]) {
    const legacy = harness().snapshot();
    legacy.version = version;
    legacy.state.rulesVersion = 1;
    legacy.state.battleRulesVersion = 1;
    delete legacy.state.correspondence;
    legacy.state.metrics.treasury = 41;
    legacy.state.history = [{ scenarioId: 'older-decision', choiceId: 'option_b' }];
    if (version === 1) delete legacy.state.metrics.foodSupply;
    if (version < 3) { delete legacy.state.battleCampaign; delete legacy.state.pendingDebrief; }
    const before = structuredClone(legacy);
    const restored = storageApi.restoreCampaignFromSnapshot(legacy, scenarios);
    assert.ok(restored, `genuine v${version} save must load`);
    assert.equal(restored.migratedFromVersion, version);
    assert.equal(restored.state.metrics.treasury, 41);
    assert.equal(restored.state.metrics.foodSupply, 78);
    assert.deepEqual(restored.state.history, legacy.state.history);
    assert.equal(restored.state.correspondence, null, 'old saves cannot reconstruct unsaved submission status');
    assert.deepEqual(legacy, before, 'migration must not mutate the input');
    assert.equal(storageApi.restoreCampaignFromSnapshot({ version, state: {} }, scenarios), null);
    delete legacy.state.metrics.munitions;
    assert.equal(storageApi.restoreCampaignFromSnapshot(legacy, scenarios), null);
  }
  const missingFood = harness().snapshot();
  missingFood.version = 2;
  delete missingFood.state.metrics.foodSupply;
  assert.equal(storageApi.restoreCampaignFromSnapshot(missingFood, scenarios), null, 'only v1 introduced the food default');
});

test('unfinished custom scenarios cannot import an empty choice list, while terminal archives can', () => {
  const snapshot = harness().snapshot();
  snapshot.activeScenarioId = snapshot.state.scenarioId = 'custom-empty';
  snapshot.activeScenario = { id: 'custom-empty', title: 'Custom ending', choices: [] };
  for (const version of [1, 2, 3, 4, 5, 6]) {
    const unfinished = { ...snapshot, version, state: { ...snapshot.state, rulesVersion: version < 5 ? 1 : 2, battleRulesVersion: version < 6 ? 1 : 2 } };
    assert.equal(storageApi.getCampaignSnapshotCompatibility(unfinished).ok, false);
    assert.equal(storageApi.restoreCampaignFromSnapshot(unfinished, scenarios), null);
    const h = harness();
    const before = position(h);
    h.context.incoming = unfinished;
    assert.equal(h.run('applyCampaignArchive(incoming, "imported")'), false);
    assert.deepEqual(position(h), before, 'rejected import must leave the active campaign unchanged');
    assert.equal(h.writes.length, 0, 'rejected import must not create checkpoints or save');
    const terminal = { ...unfinished, state: { ...unfinished.state, gameOver: true } };
    assert.equal(storageApi.getCampaignSnapshotCompatibility(terminal).ok, true);
    const restored = storageApi.restoreCampaignFromSnapshot(terminal, scenarios);
    assert.equal(restored.state.gameOver, true);
    assert.deepEqual(restored.activeScenario.choices, []);
  }
});

test('stored falsy JSON and empty raw text remain protected instead of being treated as absent', () => {
  for (const rawSave of ['null', 'false', '0', '""', '']) {
    const h = harness({ rawSave });
    const loaded = h.run('loadInitialCampaign()');
    assert.equal(loaded.protectSave, true, JSON.stringify(rawSave));
    assert.equal(storageApi.loadCampaignSnapshotResult({ getItem: () => rawSave }).hasStoredSave, true);
    h.context.archiveProtected = loaded.protectSave;
    h.context.gameState = loaded.state;
    h.context.activeScenario = loaded.activeScenario;
    h.run('runAutosave()');
    assert.equal(h.data.get(storageApi.CAMPAIGN_STORAGE_KEY), rawSave, 'original raw must survive startup');
    assert.equal(h.writes.length, 0);
  }
  const emptyBrowser = harness();
  assert.equal(emptyBrowser.run('loadInitialCampaign()').protectSave, false);
  assert.equal(storageApi.loadCampaignSnapshotResult({ getItem: () => null }).hasStoredSave, false);
});

test('protected reset clears protection only after a successful checkpoint', () => {
  const h = harness({ archiveProtected: true, failCheckpoints: true });
  const before = position(h);
  h.run('handleReset(); confirmCampaignAction()');
  assert.deepEqual(position(h), before);
  assert.equal(h.context.archiveProtected, true);
  h.controls.failCheckpoints = false;
  h.run('handleReset(); confirmCampaignAction(); runAutosave()');
  assert.equal(h.context.archiveProtected, false);
  assert.equal(h.writes[0], 'titans-of-war:campaign:checkpoints');
  assert.equal(h.writes[1], storageApi.CAMPAIGN_STORAGE_KEY);
  assert.equal(JSON.parse(h.data.get(storageApi.CAMPAIGN_STORAGE_KEY)).state.seed, h.context.gameState.seed);
});

test('correspondence and planning bonus survive reload, checkpoint, import and demo return once', async () => {
  for (const action of ['reload', 'checkpoint', 'import', 'demo']) {
    const h = harness();
    h.run('setLetterDraft("My dearest family, I love and miss our home.")');
    await h.run('handleAnalyzeLetter()');
    assert.equal(h.context.gameState.metrics.publicMorale, 85);
    assert.equal(h.context.correspondence.planningBonus, 0.1);
    const original = h.snapshot();
    h.context.incoming = original;
    if (action === 'reload') {
      h.run('runAutosave()');
      const loaded = h.run('loadInitialCampaign()');
      h.context.gameState = loaded.state;
      h.context.activeScenario = loaded.activeScenario;
    }
    if (action === 'checkpoint') h.run('restoreCheckpoint({snapshot:incoming}); confirmCampaignAction()');
    if (action === 'import') h.run('handleImportCampaignSave({target:{files:[{name:"letter.json",content:JSON.stringify(incoming)}],value:"letter.json"}})');
    if (action === 'demo') {
      h.run('handleLoadDemoRoute()');
      assert.equal(h.context.sentimentResult, null);
      h.run('returnDemo()');
    }
    assert.deepEqual(plain(h.context.correspondence), original.state.correspondence, action);
    await h.run('handleAnalyzeLetter()');
    h.run('applySentimentMods(sentimentResult); setLetterDraft("Replacement")');
    assert.equal(h.context.gameState.metrics.publicMorale, 85, `${action}: no duplicate reward`);
    assert.equal(h.context.letterDraft, original.state.correspondence.draft);
    h.context.selectedChoiceId = 'option_b';
    h.context.battleFixture = { id: 'fixture-battle' };
    h.run('handleExecuteChoice()');
    assert.equal(h.context.pendingBattle.successModifier, 0.1, `${action}: battle receives restored planning bonus`);
    assert.equal(h.context.undoStack.at(-1).state.correspondence.planningBonus, 0.1);
  }
});

test('drafts, skipped letters and zero-reward briefs retain their distinct saved states', async () => {
  const h = harness();
  h.run('setLetterDraft("Routine dispatch.")');
  const draft = storageApi.restoreCampaignFromSnapshot(h.snapshot(), scenarios);
  assert.equal(draft.state.correspondence.draft, 'Routine dispatch.');
  assert.equal(draft.state.correspondence.result, null);
  await h.run('handleAnalyzeLetter()');
  assert.equal(h.context.gameState.metrics.publicMorale, 80);
  assert.equal(h.context.correspondence.planningBonus, 0.05);
  assert.equal(storageApi.restoreCampaignFromSnapshot(h.snapshot(), scenarios).state.correspondence.result.tone, 'Standard Brief');
  const skipped = harness();
  skipped.run('applySentimentMods({skipped:true,description:"Letter skipped."})');
  const restored = storageApi.restoreCampaignFromSnapshot(skipped.snapshot(), scenarios);
  assert.equal(restored.state.correspondence.result.skipped, true);
  assert.equal(restored.state.correspondence.planningBonus, 0);
  const invalid = h.snapshot();
  invalid.state.correspondence.planningBonus = 1;
  assert.equal(storageApi.restoreCampaignFromSnapshot(invalid, scenarios), null);
});

test('same-scenario refresh and undo preserve submission; resolution and a new visit clear it', async () => {
  const h = harness();
  h.run('setLetterDraft("My dear family, love from home.")');
  await h.run('handleAnalyzeLetter()');
  const original = plain(h.context.correspondence);
  h.run('loadScenarioForTurn(gameState.currentTurn, gameState)');
  assert.deepEqual(plain(h.context.correspondence), original);
  h.context.selectedChoiceId = 'option_b';
  h.run('handleExecuteChoice()');
  assert.equal(h.context.gameState.correspondence, null);
  assert.ok(h.context.gameState.pendingDebrief);
  const restored = storageApi.restoreCampaignFromSnapshot(h.snapshot(), scenarios);
  assert.equal(restored.state.correspondence, null);
  assert.deepEqual(plain(restored.state.pendingDebrief), plain(h.context.gameState.pendingDebrief));
  h.run('handleUndo()');
  assert.deepEqual(plain(h.context.correspondence), original);
  assert.equal(h.context.gameState.metrics.publicMorale, 85);
  h.context.gameState.history.push({ scenarioId: 'fort_sumter', choiceId: 'option_b' });
  assert.equal(h.context.correspondence, null, 'same id at a new decision is not the previous visit');
  h.run('loadScenarioForTurn(gameState.currentTurn, gameState)');
  assert.equal(h.context.gameState.correspondence, null);
});

test('delayed AI classification cannot reward a replaced campaign or a changed draft', async () => {
  for (const action of ['reset', 'restore', 'demo-return', 'decision', 'edit']) {
    const h = harness();
    h.run('setLetterDraft("My dear family, I love home.")');
    h.context.aiPortalEngaged = true;
    h.context.selectedModel = 'fixture-model';
    let resolve;
    h.context.classifyLetterSentiment = () => new Promise((done) => { resolve = done; });
    const pending = h.run('handleAnalyzeLetter()');
    if (action === 'reset') h.run('resetCampaign()');
    if (action === 'restore') { h.context.incoming = h.snapshot(); h.run('applyCampaignArchive(incoming,"restored")'); }
    if (action === 'demo-return') h.run('handleLoadDemoRoute(); returnDemo()');
    if (action === 'decision') { h.context.selectedChoiceId = 'option_b'; h.run('handleExecuteChoice()'); }
    if (action === 'edit') h.run('setLetterDraft("Changed dispatch.")');
    const before = plain(h.context.gameState);
    resolve(parseLetterSentimentOffline('My dear family, I love home.'));
    await pending;
    assert.deepEqual(plain(h.context.gameState), before, action);
    assert.equal(h.context.isLoadingModel, false);
  }
});

test('startup protects supported-version invalid states and unreadable/incompatible saves', () => {
  const invalid = storageApi.createCampaignSnapshot(storageApi.createFreshCampaignState(1861, 'fort_sumter'), scenarios[0]);
  invalid.state.metrics.militaryStrength = null;
  for (const rawSave of [JSON.stringify(invalid), JSON.stringify({ ...invalid, version: 999 }), '{broken']) {
    const h = harness({ rawSave });
    const loaded = h.run('loadInitialCampaign()');
    assert.equal(loaded.protectSave, true);
    h.context.gameState = loaded.state;
    h.context.activeScenario = loaded.activeScenario;
    h.context.archiveProtected = loaded.protectSave;
    h.run('runAutosave()');
    assert.equal(h.data.get(storageApi.CAMPAIGN_STORAGE_KEY), rawSave);
    assert.equal(h.writes.length, 0);
  }
  assert.equal(harness({ unavailable: true }).run('loadInitialCampaign().protectSave'), true);
  assert.equal(harness().run('Boolean(loadInitialCampaign().protectSave)'), false);
});

test('reset, import, autosave load and checkpoint restore abort on protective checkpoint failure', () => {
  for (const action of ['reset', 'import', 'autosave', 'checkpoint']) {
    const h = harness({ failCheckpoints: true });
    h.context.incoming = storageApi.createCampaignSnapshot(storageApi.createFreshCampaignState(77, scenarios[2].id), scenarios[2]);
    h.data.set(storageApi.CAMPAIGN_STORAGE_KEY, JSON.stringify(h.context.incoming));
    const before = position(h);
    const saved = h.data.get(storageApi.CAMPAIGN_STORAGE_KEY);
    if (action === 'reset') h.run('handleReset(); confirmCampaignAction()');
    if (action === 'import') h.run('handleImportCampaignSave({target:{files:[{name:"import.json",content:JSON.stringify(incoming)}],value:"import.json"}})');
    if (action === 'autosave') h.run('handleLoadAutoSave()');
    if (action === 'checkpoint') h.run('restoreCheckpoint({snapshot:incoming}); confirmCampaignAction()');
    assert.deepEqual(position(h), before, action);
    assert.equal(h.data.get(storageApi.CAMPAIGN_STORAGE_KEY), saved);
    assert.equal(h.writes.length, 0);
    assert.match(h.context.operationError, /protective checkpoint/);
    assert.equal(h.context.campaignAction, null);
    assert.match(h.context.archiveMessage, /protective checkpoint/);
    assert.equal(h.context.showJournal, action !== 'checkpoint');
  }
});

test('cancelled reset and rejected imports do not mutate the campaign or create checkpoints', () => {
  const h = harness();
  const before = position(h);
  h.run('handleReset()');
  assert.deepEqual(plain(h.context.campaignAction), { type: 'reset' });
  assert.deepEqual(position(h), before, 'opening confirmation must not reset anything');
  assert.equal(h.writes.length, 0);
  h.run('cancelCampaignAction()');
  assert.equal(h.context.campaignAction, null);
  h.context.incoming = h.snapshot();
  h.run('restoreCheckpoint({snapshot:incoming})');
  assert.equal(h.context.campaignAction.type, 'restore');
  assert.deepEqual(position(h), before, 'selecting a checkpoint only opens confirmation');
  assert.equal(h.writes.length, 0);
  h.run('cancelCampaignAction()');
  assert.equal(h.run('applyCampaignArchive({version:999,state:{}}, "invalid")'), false);
  h.context.incoming = h.snapshot();
  h.context.incoming.state.metrics.militaryStrength = null;
  assert.equal(h.run('applyCampaignArchive(incoming, "invalid state")'), false);
  assert.deepEqual(position(h), before);
  assert.equal(h.writes.length, 0);
});

test('demo returns exact unsaved state and protection flag without requiring storage', () => {
  for (const archiveProtected of [false, true]) {
    const h = harness({ unavailable: true, archiveProtected });
    h.context.gameState.metrics.foodSupply = 37;
    h.context.gameState.history = [{ scenarioId: 'fort_sumter', choiceId: 'option_b' }];
    const original = h.snapshot();
    h.run('handleLoadDemoRoute()');
    assert.equal(h.context.isDemo, true);
    assert.deepEqual(plain(h.context.demoReturnRef.current.snapshot.state), original.state);
    assert.equal(h.context.demoReturnRef.current.archiveProtected, archiveProtected);
    h.run('handleLoadDemoRoute()');
    assert.deepEqual(plain(h.context.demoReturnRef.current.snapshot.state), original.state, 'reloading demo must not replace the return position');
    h.run('returnDemo()');
    assert.equal(h.context.isDemo, false);
    assert.equal(h.context.archiveProtected, archiveProtected);
    assert.equal(h.context.demoReturnRef.current, null);
    assert.deepEqual(plain(h.context.gameState), storageApi.restoreCampaignFromSnapshot(original, scenarios).state);
    assert.equal(h.context.operationError, '', 'return does not require a protective checkpoint');
    assert.equal(h.writes.length, 0);
  }
});

test('demo autosave never overwrites main save', () => {
  const h = harness();
  h.run('runAutosave()');
  const main = h.data.get(storageApi.CAMPAIGN_STORAGE_KEY);
  h.run('handleLoadDemoRoute(); runAutosave()');
  assert.equal(h.data.get(storageApi.CAMPAIGN_STORAGE_KEY), main);
  assert.equal(JSON.parse(h.data.get(storageApi.DEMO_STORAGE_KEY)).activeScenarioId, 'cedar_creek');
  h.run('returnDemo(); runAutosave()');
  assert.equal(JSON.parse(h.data.get(storageApi.CAMPAIGN_STORAGE_KEY)).activeScenarioId, 'fort_sumter');
});

test('successful reset/import/load exits demo and protects the original main campaign', () => {
  for (const action of ['reset', 'import', 'autosave', 'checkpoint']) {
    const h = harness();
    h.run('runAutosave()');
    const original = h.snapshot();
    h.run('handleLoadDemoRoute()');
    h.context.incoming = storageApi.createCampaignSnapshot(storageApi.createFreshCampaignState(77, scenarios[2].id), scenarios[2]);
    if (action === 'reset') h.run('handleReset(); confirmCampaignAction()');
    if (action === 'import') h.run('handleImportCampaignSave({target:{files:[{name:"import.json",content:JSON.stringify(incoming)}],value:"import.json"}})');
    if (action === 'autosave') h.run('handleLoadAutoSave()');
    if (action === 'checkpoint') h.run('restoreCheckpoint({snapshot:incoming}); confirmCampaignAction()');
    assert.equal(h.context.isDemo, false, action);
    const checkpoints = storageApi.loadCampaignCheckpoints({ getItem: (key) => h.data.get(key) });
    assert.deepEqual(checkpoints[0].snapshot.state, original.state, `${action} protects main campaign, not demo`);
    h.run('runAutosave()');
    const saved = JSON.parse(h.data.get(storageApi.CAMPAIGN_STORAGE_KEY));
    assert.equal(saved.state.seed, h.context.gameState.seed);
    assert.equal(saved.activeScenarioId, action === 'import' || action === 'checkpoint' ? 'naval_technology' : 'fort_sumter');
  }
});

test('failed replacement from demo preserves both demo and its original return snapshot', () => {
  const h = harness({ failCheckpoints: true });
  h.run('handleLoadDemoRoute()');
  const before = position(h);
  const savedReturn = plain(h.context.demoReturnRef.current);
  h.run('handleReset(); confirmCampaignAction()');
  assert.deepEqual(position(h), before);
  assert.deepEqual(plain(h.context.demoReturnRef.current), savedReturn);
  h.run('returnDemo()');
  assert.equal(h.context.isDemo, false);
});

test('restored debrief field-result labels are safe React children', () => {
  const h = harness();
  const report = createAfterAction(h.context.gameState, h.context.gameState, {
    scenarioTitle: 'Fixture', choiceText: 'Choice', consequence: 'Result',
  }, scenarios[2]);
  for (const result of [{ invalid: true }, [{ invalid: true }]]) {
    const snapshot = h.snapshot();
    snapshot.state.pendingDebrief = { ...report, battleResult: { result } };
    const restored = storageApi.restoreCampaignFromSnapshot(snapshot, scenarios);
    assert.ok(restored, 'malformed optional debrief must not discard the campaign');
    const battle = restored.state.pendingDebrief?.battleResult;
    assert.doesNotThrow(() => renderToStaticMarkup(React.createElement('p', null,
      battle ? battleResultLabel(battle.result) : null,
    )), 'drop or sanitize malformed nested field results before rendering the restored report');
  }
});

test('dialog trap includes summary, wraps correctly, and restores focus/inert state', () => {
  const hookSource = readFileSync(new URL('../src/components/useDialogFocus.js', import.meta.url), 'utf8');
  const hookAst = parseAst(hookSource);
  const hook = only(findNodes(hookAst, (node) => node.type === 'FunctionDeclaration' && node.id?.name === 'useDialogFocus'), 'dialog hook');
  let listener;
  let cleanup;
  let closed = 0;
  const document = { activeElement: null, body: { style: { overflow: 'auto' }, parentElement: null },
    addEventListener: (type, fn) => { listener = fn; }, removeEventListener: () => { listener = null; } };
  const control = () => ({ disabled: false, isConnected: true, hasAttribute: () => false, getClientRects: () => [{}], focus() { document.activeElement = this; } });
  const previous = control();
  const closeButton = control();
  const summary = control();
  const sibling = { inert: false };
  const panel = { parentElement: document.body, contains: (node) => [closeButton, summary].includes(node),
    querySelectorAll(selector) {
      assert.ok(selector.split(',').map((part) => part.trim()).includes('summary'));
      return [closeButton, summary];
    } };
  document.body.children = [panel, sibling];
  previous.focus();
  const context = createContext({ document, useRef: (value) => ({ current: value }), useEffect: (effect) => { cleanup = effect(); } });
  runInContext(hookSource.slice(hook.start, hook.end), context);
  context.ref = { current: panel };
  context.onClose = () => { closed += 1; };
  runInContext('useDialogFocus(ref, true, onClose)', context);
  assert.equal(document.activeElement, closeButton);
  assert.equal(sibling.inert, true);
  let prevented = false;
  const tab = (shiftKey = false) => { prevented = false; listener({ key: 'Tab', shiftKey, preventDefault: () => { prevented = true; } }); };
  tab();
  assert.equal(prevented, false, 'native Tab can reach the collapsed checkpoint summary');
  summary.focus();
  tab();
  assert.equal(prevented, true);
  assert.equal(document.activeElement, closeButton);
  tab(true);
  assert.equal(document.activeElement, summary);
  listener({ key: 'Escape', preventDefault() {}, stopImmediatePropagation() {} });
  assert.equal(closed, 1);
  cleanup();
  assert.equal(sibling.inert, false);
  assert.equal(document.body.style.overflow, 'auto');
  assert.equal(document.activeElement, previous);
  summary.hasAttribute = key => key === 'data-dialog-initial-focus';
  runInContext('useDialogFocus(ref, true, onClose)', context);
  assert.equal(document.activeElement, summary, 'An explicitly nominated action receives initial focus');
  cleanup();
  assert.equal(document.activeElement, previous);
});

test('file reads are bounded and only the latest unchanged-campaign request may apply', () => {
  const h = harness();
  const readers = [];
  h.context.FileReader = class {
    constructor() { readers.push(this); }
    abort() { this.aborted = true; }
    readAsText(file) { this.result = file.content; }
  };
  const first = h.snapshot(); first.state.seed = 100;
  const second = h.snapshot(); second.state.seed = 200;
  h.context.first = JSON.stringify(first); h.context.second = JSON.stringify(second);
  h.run('handleImportCampaignSave({target:{files:[{name:"first.json",content:first}],value:""}})');
  h.run('handleImportCampaignSave({target:{files:[{name:"second.json",content:second}],value:""}})');
  assert.equal(readers[0].aborted, true);
  readers[1].onload(); readers[0].onload();
  assert.equal(h.context.gameState.seed, 200);
  h.run('handleImportCampaignSave({target:{files:[{name:"old.json",content:first}],value:""}})');
  const before = h.context.gameState;
  h.context.gameState = { ...before, correspondence: { scenarioId: before.scenarioId, decisionIndex: 0, draft: 'New draft', result: null, planningBonus: 0 } };
  readers[2].onload();
  assert.equal(h.context.gameState.correspondence.draft, 'New draft');
  assert.match(h.context.archiveMessage, /campaign changed/);
  h.run('handleImportCampaignSave({target:{files:[{name:"huge.json",size:MAX_CAMPAIGN_BYTES+1}],value:""}})');
  assert.equal(readers.length, 3, 'oversized files must be rejected before reading');
  assert.match(h.context.archiveMessage, /exceeds 4 MiB/);
});

test('late generation cannot cross reset, restore, AI off, or an edited campaign', async () => {
  for (const action of ['resetCampaign()', 'applyCampaignArchive(incoming,"restored")', 'toggleAiPortal()', 'setLetterDraft("New draft")']) {
    const h = harness();
    h.context.aiPortalEngaged = true; h.context.selectedModel = 'mock';
    h.context.incoming = h.snapshot(); h.context.incoming.state.seed = 77;
    let resolve; let signal;
    h.context.generateNextScenario = (...args) => { signal = args[4].signal; return new Promise(done => { resolve = done; }); };
    const pending = h.run('handleProceduralGenerate()');
    await h.run(action);
    const expected = position(h);
    resolve({ id: 'late', title: 'Late reply', narrative: 'Old campaign', choices: [], live: false });
    await pending;
    assert.deepEqual(position(h), expected, action);
    assert.equal(h.context.isLoadingModel, false, action);
    if (!action.startsWith('setLetterDraft')) assert.equal(signal.aborted, true, action);
  }
});

test('AI discovery and letter requests are cancelled by turning the portal off', async () => {
  const h = harness();
  let resolve; let signal;
  h.context.listOllamaModels = (options) => { signal = options.signal; return new Promise(done => { resolve = done; }); };
  const discovery = h.run('toggleAiPortal()');
  await h.run('toggleAiPortal()');
  resolve({ ok: true, models: ['late-model'] }); await discovery;
  assert.equal(signal.aborted, true);
  assert.equal(h.context.aiPortalEngaged, false);
  assert.equal(h.context.selectedModel, '');
  assert.equal(h.context.isLoadingModel, false);
  h.context.aiPortalEngaged = true; h.context.selectedModel = 'mock';
  h.run('setLetterDraft("Dear family")');
  h.context.classifyLetterSentiment = (...args) => { signal = args[2].signal; return new Promise(done => { resolve = done; }); };
  const letter = h.run('handleAnalyzeLetter()');
  await h.run('toggleAiPortal()');
  resolve({ tone: 'Heartfelt', moraleMod: 5, strengthMod: 0, description: 'Late reward' }); await letter;
  assert.equal(signal.aborted, true);
  assert.equal(h.context.gameState.metrics.publicMorale, 80);
  assert.equal(h.context.correspondence.result, null);
});

test('import is a keyboard-operable button that opens the named file input', () => {
  const trigger = only(findNodes(ast, node => node.type === 'JSXElement'
    && node.openingElement?.name?.name === 'button'
    && node.children.some(child => child.type === 'JSXText' && child.value.includes('IMPORT SAVE JSON'))), 'import button');
  const onClick = trigger.openingElement.attributes.find(attribute => attribute.name?.name === 'onClick').value.expression;
  let clicked = false;
  runInContext(`(${slice(onClick)})()`, createContext({ importInputRef: { current: { click() { clicked = true; } } } }));
  assert.equal(clicked, true);
});

test('authored scenarios, generated battle records, legacy versions, and the actual demo history round-trip', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { STATIC_SCENARIOS } = await vite.ssrLoadModule('/src/game/scenarios.js');
    const { delegateBattle, applyBattleResolution, battleForScenario } = await vite.ssrLoadModule('/src/game/battles.js');
    for (const scenario of STATIC_SCENARIOS) {
      let state = { ...storageApi.createFreshCampaignState(1861, scenario.id), currentTurn: scenario.turn || 12 };
      if (battleForScenario(scenario.id)) state = applyBattleResolution(state, delegateBattle(state, scenario.id, 'option_b'));
      const snapshot = storageApi.createCampaignSnapshot(state, scenario);
      assert.ok(storageApi.getCampaignSnapshotCompatibility(snapshot).ok, scenario.id);
      for (const version of [1, 2, 3, 4, 5, 6]) {
        assert.ok(storageApi.restoreCampaignFromSnapshot({ ...snapshot, version, state: { ...snapshot.state, rulesVersion: version < 5 ? 1 : 2, battleRulesVersion: version < 6 ? 1 : 2 } }, STATIC_SCENARIOS), `${scenario.id} v${version}`);
      }
      for (const choice of scenario.choices) {
        const next = advanceCampaignTurn(state, scenario, choice, STATIC_SCENARIOS);
        assert.ok(storageApi.restoreCampaignFromSnapshot(storageApi.createCampaignSnapshot(next.state, next.nextScenario || scenario), STATIC_SCENARIOS), `${scenario.id}:${choice.id} completed save`);
      }
    }
    const demoDecisions = only(findNodes(ast, node => node.type === 'VariableDeclarator' && node.id?.name === 'DEMO_ROUTE_DECISIONS'), 'demo decisions');
    const buildDemo = only(findNodes(ast, node => node.type === 'FunctionDeclaration' && node.id?.name === 'buildDemoHistory'), 'demo history');
    const history = runInContext(`const DEMO_ROUTE_DECISIONS = ${slice(demoDecisions.init)}; ${slice(buildDemo)}; buildDemoHistory(scenarios)`, createContext({ scenarios: STATIC_SCENARIOS }));
    const demo = storageApi.createCampaignSnapshot({ ...storageApi.createFreshCampaignState(1864, 'cedar_creek'), history }, STATIC_SCENARIOS.find(s => s.id === 'cedar_creek'));
    assert.ok(storageApi.restoreCampaignFromSnapshot(demo, STATIC_SCENARIOS), 'demo preserves the turn-zero recognition interlude');
  } finally { await vite.close(); }
});

test('local-model replies reject invalid titles/nested choices and requests settle on timeout or abort', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  const originalFetch = globalThis.fetch;
  try {
    const ollama = await vite.ssrLoadModule('/src/engine/ollamaGenerator.js');
    const fresh = storageApi.createFreshCampaignState(1861, 'fort_sumter');
    const valid = { title: 'Mock crisis', narrative: 'A synthetic model response used only by tests.', choices: ['hotspur', 'fox', 'wolf', 'sovereign'].map((proposer, i) => ({ id: `option_${i}`, text: 'Synthetic choice', proposer, effects: { metrics: {}, shards: {} } })) };
    for (const mutate of [value => { value.title = { bad: true }; }, value => { value.choices[0].text = {}; }, value => { value.choices[0].effects.metrics.treasury = '100'; }, value => { value.choices[1].id = value.choices[0].id; }]) {
      const reply = structuredClone(valid); mutate(reply);
      globalThis.fetch = async () => ({ ok: true, json: async () => ({ response: JSON.stringify(reply) }) });
      const next = await ollama.generateNextScenario(fresh, null, 'mock');
      assert.equal(next.live, false);
      assert.equal(typeof next.title, 'string');
    }
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ response: JSON.stringify(valid) }) });
    const live = await ollama.generateNextScenario(fresh, null, 'mock');
    assert.equal(live.live, true);
    assert.ok(storageApi.getCampaignSnapshotCompatibility(storageApi.createCampaignSnapshot({ ...fresh, scenarioId: live.id }, live)).ok, 'the actual generation handler binds state to the accepted generated scene');
    const { STATIC_SCENARIOS } = await vite.ssrLoadModule('/src/game/scenarios.js');
    for (const scenarioId of ['manassas_battlefield', 'gettysburg_recognition_crisis', 'hotspur_cabinet_crisis']) {
      const current = STATIC_SCENARIOS.find(scenario => scenario.id === scenarioId);
      const state = { ...fresh, scenarioId, currentTurn: current.turn || 12, nextScenarioId: null };
      globalThis.fetch = () => assert.fail('No selected model must use the authored fallback without a request');
      const fallback = await ollama.generateNextScenario(state, null, '', current);
      assert.equal(fallback.id, scenarioId, 'fallback must retain the current branch/interlude');
      globalThis.fetch = async () => { throw new Error('Synthetic offline failure'); };
      const offline = await ollama.generateNextScenario(state, null, 'mock', current);
      assert.equal(offline.id, scenarioId);
      const queued = await ollama.generateNextScenario({ ...state, nextScenarioId: 'naval_technology' }, null, '', current);
      assert.equal(queued.id, 'naval_technology', 'an explicit pending route still takes precedence');
    }
    let signal;
    globalThis.fetch = (_, options) => { signal = options.signal; return new Promise(() => {}); };
    const timeout = await ollama.listOllamaModels({ timeoutMs: 5 });
    assert.equal(timeout.ok, false); assert.match(timeout.error, /timed out/); assert.equal(signal.aborted, true);
    const controller = new AbortController();
    const request = ollama.generateNextScenario(fresh, null, 'mock', null, { signal: controller.signal });
    controller.abort();
    await assert.rejects(request, { name: 'AbortError' });
    assert.equal(signal.aborted, true);
  } finally { globalThis.fetch = originalFetch; await vite.close(); }
});

test('protected originals survive replacement verbatim, and failed raw backups block replacement', () => {
  const rawSave = '{unreadable original';
  const h = harness({ rawSave, archiveProtected: true });
  h.run('resetCampaign(); runAutosave()');
  const backups = [...h.data.entries()].filter(([key]) => key.includes(':recovery:'));
  assert.equal(backups.length, 1);
  assert.equal(backups[0][1], rawSave);
  assert.notEqual(h.data.get(storageApi.CAMPAIGN_STORAGE_KEY), rawSave);
  const blocked = harness({ rawSave, archiveProtected: true, unavailable: true });
  const before = position(blocked);
  blocked.run('resetCampaign()');
  assert.deepEqual(position(blocked), before);
  assert.match(blocked.context.archiveMessage, /could not be backed up/);
  assert.equal(blocked.data.get(storageApi.CAMPAIGN_STORAGE_KEY), rawSave);
});

test('consulted primer provenance follows save/restore/reset rather than the browser session', () => {
  const h = harness();
  h.context.gameState = { ...h.context.gameState, consultedPrimerIds: ['fixture-primer'] };
  const saved = h.snapshot();
  assert.deepEqual(storageApi.restoreCampaignFromSnapshot(saved, scenarios).state.consultedPrimerIds, ['fixture-primer']);
  h.run('resetCampaign()');
  assert.deepEqual(plain(h.context.gameState.consultedPrimerIds), []);
  h.context.incoming = saved;
  h.run('applyCampaignArchive(incoming, "restored")');
  assert.deepEqual(plain(h.context.gameState.consultedPrimerIds), ['fixture-primer']);
  const legacy = { ...saved, state: { ...saved.state } };
  delete legacy.state.consultedPrimerIds;
  assert.deepEqual(storageApi.restoreCampaignFromSnapshot(legacy, scenarios).state.consultedPrimerIds, []);
});

test('error-boundary restart preserves the original first and aborts on backup/clear failure', () => {
  const boundarySource = readFileSync(new URL('../src/components/AppErrorBoundary.jsx', import.meta.url), 'utf8');
  const boundaryAst = parseAst(boundarySource, { lang: 'jsx' });
  const property = only(findNodes(boundaryAst, node => node.key?.name === 'clearSaveAndReload' && node.value?.type === 'ArrowFunctionExpression'), 'error boundary restart');
  for (const failure of ['backup', 'clear', null]) {
    const raw = '{unreadable original';
    const data = new Map([[storageApi.CAMPAIGN_STORAGE_KEY, raw]]);
    const storage = {
      getItem: key => data.get(key) ?? null,
      setItem(key, value) { if (failure === 'backup') throw new Error('Quota full'); data.set(key, value); },
      removeItem(key) { if (failure === 'clear') throw new Error('Storage blocked'); data.delete(key); },
    };
    let reloads = 0;
    const component = { state: {}, setState(update) { Object.assign(this.state, update); } };
    const context = createContext({ component, CAMPAIGN_STORAGE_KEY: storageApi.CAMPAIGN_STORAGE_KEY,
      backupOriginalCampaignRaw: () => storageApi.backupOriginalCampaignRaw(storage),
      window: { localStorage: storage, location: { reload() { reloads++; } } }, console: { error() {} } });
    const handler = boundarySource.slice(property.value.start, property.value.end);
    runInContext(`(function () { return (${handler}); }).call(component)()`, context);
    assert.equal(reloads, failure ? 0 : 1, failure || 'success');
    if (failure) assert.equal(data.get(storageApi.CAMPAIGN_STORAGE_KEY), raw);
    if (failure !== 'backup') assert.ok([...data].some(([key, value]) => key.includes(':recovery:') && value === raw));
  }
});


test('save failure is observable and retry clears it without changing campaign consequences', () => {
  const h = harness();
  h.run('runAutosave()');
  assert.equal(h.context.campaignSaveStatus.ok, true);
  const campaign = position(h);
  h.controls.unavailable = true;
  h.run('runAutosave()');
  assert.equal(h.context.campaignSaveStatus.ok, false);
  assert.match(h.context.campaignSaveStatus.error, /Quota full/);
  h.controls.unavailable = false;
  h.run('runAutosave()');
  assert.equal(h.context.campaignSaveStatus.ok, true);
  assert.deepEqual(position(h), campaign);
});
