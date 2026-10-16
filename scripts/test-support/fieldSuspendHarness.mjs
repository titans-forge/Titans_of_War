import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { parseAst } from 'rolldown/parseAst';
import * as campaign from '../../src/game/campaignStorage.js';
import * as field from '../../src/game/fieldCheckpoint.js';
import { loadFieldSuspension, saveFieldSuspension } from '../../src/game/fieldSuspendSave.js';
import { CivilWarBattleEngine } from '../../src/battle/civilWarEngine.js';
import { BATTLE_SCENARIOS, applyBattleResolution, battleChoiceSuccessModifier, battleResultLabel } from '../../src/game/battles.js';
import { advanceCampaignTurn } from '../../src/game/headlessCampaign.js';
import { createAfterAction } from '../../src/game/campaignExperience.js';
import { INITIAL_STATE } from '../../src/game/initialState.js';

export { campaign, field, CivilWarBattleEngine, INITIAL_STATE };
export const scenario = { id: 'checkpoint_fixture', title: 'Field campaign', turn: 1,
  actor: 'Scenario commander', roleLabel: 'Army Commander', choices: [{ id: 'option_b', text: 'Fight', consequence: 'Resolved' }] };
const nodes = (root, predicate) => {
  const found = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) found.push(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  }
  visit(root); return found;
};
const only = (matches, label) => { assert.equal(matches.length, 1, label); return matches[0]; };
const calls = (root, name) => nodes(root, node => node.type === 'CallExpression' && node.callee?.name === name).length > 0;

export function fixture({ old = true, freshInitial = false } = {}) {
  const state = freshInitial ? structuredClone(INITIAL_STATE) : campaign.createFreshCampaignState(1861);
  const battle = Object.values(BATTLE_SCENARIOS).find(value => value.id === 'gettysburg');
  const engine = new CivilWarBattleEngine(battle.id, state, 'option_b'); engine.tick(.2);
  const pending = { battle, choiceId: 'option_b', baseState: state, successModifier: 0, statusNote: '', mode: 'fight' };
  const data = new Map();
  const operations = [];
  const controls = { hook: null };
  const storage = {
    getItem(key) { controls.hook?.('get', key, undefined, data); return data.get(key) ?? null; },
    setItem(key, value) { controls.hook?.('set', key, value, data); operations.push(['set', key, value]); data.set(key, value); },
    removeItem(key) { controls.hook?.('remove', key, undefined, data); operations.push(['remove', key]); data.delete(key); },
  };
  if (old) {
    campaign.saveCampaignSnapshot(campaign.createCampaignSnapshot(state, scenario), storage);
    field.saveFieldCheckpoint(pending, engine.checkpoint(), state, storage);
  }
  operations.length = 0;
  return { state, battle, engine, pending, data, storage, controls, operations,
    snapshot: () => campaign.createCampaignSnapshot({ ...state, statusMessage: 'New field save' }, scenario),
    pair: () => [storage.getItem(campaign.CAMPAIGN_STORAGE_KEY), storage.getItem(field.FIELD_CHECKPOINT_KEY)] };
}

// Extract and execute the current real App loader, effect and handlers. The
// before source is used only by the explicitly named external reproduction.
export function appHarness(f, source = readFileSync(new URL('../../src/App.jsx', import.meta.url), 'utf8')) {
  const ast = parseAst(source, { lang: 'jsx' });
  const slice = node => source.slice(node.start, node.end);
  const loader = only(nodes(ast, node => node.type === 'FunctionDeclaration' && node.id?.name === 'loadInitialCampaign'), 'actual App loader');
  const effectCall = only(nodes(ast, node => node.type === 'CallExpression' && node.callee?.name === 'useEffect' && calls(node.arguments[0], 'saveCampaignSnapshot')), 'actual App autosave');
  const suspend = only(nodes(ast, node => node.type === 'VariableDeclarator' && node.id?.name === 'handleSuspendBattle'), 'actual App Save & Leave handler');
  const resolution = only(nodes(ast, node => node.type === 'VariableDeclarator' && node.id?.name === 'handleBattleResolution'), 'actual App resolution handler');
  const complete = only(nodes(ast, node => node.type === 'VariableDeclarator' && node.id?.name === 'completeCampaignChoice'), 'actual App campaign settlement handler');
  const restore = only(nodes(ast, node => node.type === 'VariableDeclarator' && node.id?.name === 'applyCampaignArchive'), 'actual App archive handler');
  const protect = only(nodes(ast, node => node.type === 'VariableDeclarator' && node.id?.name === 'protectCurrentCampaign'), 'actual App archive protection handler');
  const initialField = only(nodes(ast, node => node.type === 'VariableDeclarator' && node.id?.type === 'ArrayPattern' && node.id.elements[0]?.name === 'initialField'), 'actual App field initializer');
  const archiveProtection = only(nodes(ast, node => node.type === 'VariableDeclarator' && node.id?.type === 'ArrayPattern' && node.id.elements[0]?.name === 'archiveProtected'), 'actual App archive protection initializer');
  const resume = nodes(ast, node => node.type === 'JSXAttribute' && node.name?.name === 'onClose' && calls(node.value?.expression, 'setPendingBattle')
    && slice(node.value.expression).includes("mode: 'fight'"));
  const discard = only(nodes(ast, node => node.type === 'JSXAttribute' && node.name?.name === 'onClick' && calls(node.value?.expression, 'clearFieldCheckpoint') && calls(node.value?.expression, 'setOperationError')), 'actual App discard callback');
  const close = only(nodes(ast, node => node.type === 'JSXAttribute' && node.name?.name === 'onClose' && calls(node.value?.expression, 'clearFieldCheckpoint')), 'actual App encounter close callback');
  const context = createContext({ ...campaign, ...field, STATIC_SCENARIOS: [scenario],
    initialField: null, initialCampaign: null, fieldOwnerRef: { current: null }, pendingBattle: null, archiveProtected: false, isDemo: false,
    aiPortalEngaged: false, selectedModel: '', archiveMessage: '', saveRetry: 0, campaignSaveStatus: null,
    operationError: '', practiceResult: null, undoStack: [], selectedChoiceId: null, needsConfirmation: false,
    showJournal: false, demoReturnRef: { current: null }, skipNextScenarioEffect: { current: false },
    loadCampaignSnapshotResult: () => campaign.loadCampaignSnapshotResult(f.storage),
    loadFieldCheckpoint: () => field.loadFieldCheckpoint(f.storage),
    saveCampaignSnapshot: (snapshot, unused, key) => campaign.saveCampaignSnapshot(snapshot, f.storage, key),
    saveFieldCheckpoint: (pending, checkpoint, state) => field.saveFieldCheckpoint(pending, checkpoint, state, f.storage),
    loadFieldSuspension: (unused, expected) => loadFieldSuspension(f.storage, expected),
    saveFieldSuspension: (snapshot, pending, checkpoint, state, unused, owner) => saveFieldSuspension(snapshot, pending, checkpoint, state, f.storage, owner),
    clearFieldCheckpoint: () => field.clearFieldCheckpoint(f.storage),
    saveCampaignCheckpoint: snapshot => campaign.saveCampaignCheckpoint(snapshot, f.storage),
    backupOriginalCampaignRaw: () => campaign.backupOriginalCampaignRaw(f.storage),
    invalidateLetterRequest() {}, battleResultLabel, battleChoiceSuccessModifier, practiceAmmunitionLabel: () => 'Standard',
    applyBattleResolution, advanceCampaignTurn, createAfterAction, logLine() {}, setTimeout() {}, updateContextualMusic() {},
  });
  let updates = null;
  for (const name of ['gameState', 'activeScenario', 'pendingBattle', 'campaignSaveStatus', 'archiveMessage', 'operationError', 'practiceResult', 'showBattleLibrary', 'isDemo', 'archiveProtected', 'undoStack', 'selectedChoiceId', 'needsConfirmation', 'showJournal']) {
    context[`set${name[0].toUpperCase()}${name.slice(1)}`] = value => {
      const update = () => { context[name] = typeof value === 'function' ? value(context[name]) : value; };
      if (updates) updates.push(update); else update();
    };
  }
  const compiled = `${slice(loader)}\nconst runAutosave=${slice(effectCall.arguments[0])};\nconst handleSuspendBattle=${slice(suspend.init)};\nconst completeCampaignChoice=${slice(complete.init)};\nconst handleBattleResolution=${slice(resolution.init)};\nconst protectCurrentCampaign=${slice(protect.init)};\nconst applyCampaignArchive=${slice(restore.init)};\nconst resumeBattle=${slice(only(resume, 'actual App resume callback').value.expression)};\nconst discardBattle=${slice(discard.value.expression)};\nconst closeBattle=${slice(close.value.expression)};`;
  runInContext(compiled, context);
  const loaded = runInContext('loadInitialCampaign()', context);
  context.initialCampaign = loaded;
  context.initialField = runInContext(`(${slice(initialField.init.arguments[0])})()`, context);
  context.fieldOwnerRef.current = context.initialField.owner ?? null;
  context.gameState = loaded.state; context.activeScenario = loaded.activeScenario;
  context.archiveProtected = runInContext(slice(archiveProtection.init.arguments[0]), context); context.pendingBattle = context.initialField.pending;
  // React setters commit after the handler/effect finishes. Preserve the
  // render's captured values during each actual callback, then apply updates.
  const run = code => {
    updates = [];
    try { return runInContext(code, context); }
    finally { const pendingUpdates = updates; updates = null; pendingUpdates.forEach(update => update()); }
  };
  return { context, run, ast, source, effectCall, suspend };
}
