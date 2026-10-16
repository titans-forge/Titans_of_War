import { INITIAL_STATE } from './initialState.js';
import { isAfterActionReport } from './campaignExperience.js';
import { MAX_CAMPAIGN_BYTES, isBoundedJson, isValidHistoryEntry, isValidScenario, isValidBattleResult, number, text } from './archiveValidation.js';
import { createCampaignEconomy, CAMPAIGN_DIFFICULTIES, RECOVERY_ALLOCATION_IDS, EMERGENCY_RESERVE_LIMIT } from './campaignSupply.js';
import { isBattleAssessment, BATTLE_OBJECTIVES } from '../battle/battleAssessment.js';
export { MAX_CAMPAIGN_BYTES } from './archiveValidation.js';

export const CAMPAIGN_SAVE_VERSION = 22;
export const CAMPAIGN_STORAGE_KEY = 'titans-of-war:campaign:auto-save';
export const DEMO_STORAGE_KEY = 'titans-of-war:campaign:demo';
const CHECKPOINT_STORAGE_KEY = 'titans-of-war:campaign:checkpoints';
const SUPPORTED_SAVE_VERSIONS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, CAMPAIGN_SAVE_VERSION]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getDefaultStorage() {
  try { return typeof window === 'undefined' ? null : window.localStorage; }
  catch { return null; }
}

export function createFreshCampaignState(seed = Math.floor(Math.random() * 1e9), firstScenarioId = null, { difficulty = 'standard', rulesVersion = 2, battleRulesVersion = rulesVersion === 1 ? 1 : 18 } = {}) {
  if (![1, 2].includes(rulesVersion) || ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].includes(battleRulesVersion) || !CAMPAIGN_DIFFICULTIES.includes(difficulty) || (rulesVersion === 1 && difficulty !== 'standard')) throw new Error('Unsupported campaign rules or difficulty');
  return {
    ...clone(INITIAL_STATE),
    seed,
    rulesVersion,
    battleRulesVersion,
    difficulty,
    campaignEconomy: createCampaignEconomy(),
    supplyPlan: null,
    scenarioId: firstScenarioId,
    nextScenarioId: null,
    correspondence: null,
    history: [],
    consultedPrimerIds: [],
    gameOver: false
  };
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function correspondencePlanningBonus(result) {
  if (!result || result.skipped) return 0;
  if (result.tone === 'Heartfelt' || result.tone === 'Resolute') return 0.10;
  return result.tone === 'Standard Brief' ? 0.05 : 0;
}

function isValidCorrespondence(value) {
  if (value === null) return true;
  if (!isRecord(value) || typeof value.scenarioId !== 'string' || !value.scenarioId
    || !Number.isSafeInteger(value.decisionIndex) || value.decisionIndex < 0
    || !text(value.draft, 100000) || !Number.isFinite(value.planningBonus)) return false;
  const result = value.result;
  if (result !== null && (!isRecord(result) || !text(result.description)
    || (result.skipped !== true && (typeof result.tone !== 'string'
      || !number(result.moraleMod) || !number(result.strengthMod)))
    || ['tone', 'ideology', 'rationale', 'source'].some(key => result[key] != null && !text(result[key])))) return false;
  return value.planningBonus === correspondencePlanningBonus(result);
}

export function getScenarioCorrespondence(state, scenarioId = state?.scenarioId) {
  const value = state?.correspondence;
  return value && value.scenarioId === scenarioId && value.decisionIndex === (state.history?.length || 0)
    ? value : null;
}

function isValidState(state, version = CAMPAIGN_SAVE_VERSION) {
  return Boolean(
    isRecord(state)
    && isValidEconomyState(state, version)
    && Number.isSafeInteger(state.currentTurn) && state.currentTurn >= 1 && state.currentTurn <= 10000
    && Number.isSafeInteger(state.seed)
    && number(state.divergenceIndex, 0, 1)
    && typeof state.gameOver === 'boolean'
    && ['actor', 'roleLabel', 'statusMessage', 'scenarioId', 'nextScenarioId', 'letterText'].every(key => state[key] == null || text(state[key], 100000))
    && (state.alternateTimeline === undefined || typeof state.alternateTimeline === 'boolean')
    && Array.isArray(state.history) && state.history.length <= 1000 && state.history.every(entry => isValidHistoryEntry(entry)
      && (entry.supplyReport === undefined || isValidSupplyReport(entry.supplyReport))
      && (entry.battleResult == null || isValidSavedBattle(entry.battleResult, version)))
    && (state.consultedPrimerIds === undefined || (Array.isArray(state.consultedPrimerIds) && state.consultedPrimerIds.length <= 100
      && state.consultedPrimerIds.every(id => text(id, 200))))
    && (state.battleCampaign == null || (isRecord(state.battleCampaign) && state.battleCampaign.version === 1
      && isRecord(state.battleCampaign.results) && Object.values(state.battleCampaign.results).every(result => isValidSavedBattle(result, version))))
    && isRecord(state.metrics)
    && Object.keys(state.metrics).every(key => Object.hasOwn(INITIAL_STATE.metrics, key))
    && Object.keys(INITIAL_STATE.metrics).every((key) =>
      (version === 1 && key === 'foodSupply' && !Object.hasOwn(state.metrics, key))
      || number(state.metrics[key], 0, 100))
    && isRecord(state.shards)
    && Object.keys(state.shards).every(key => Object.hasOwn(INITIAL_STATE.shards, key))
    && Object.keys(INITIAL_STATE.shards).every((key) => isRecord(state.shards[key])
      && typeof state.shards[key].name === 'string'
      && number(state.shards[key].alignment, 0, 100)
      && number(state.shards[key].influence, 0, 100))
    && (version < 4 || isValidCorrespondence(state.correspondence))
  );
}

function isValidSavedBattle(value, version = CAMPAIGN_SAVE_VERSION) {
  return isValidBattleResult(value) && (value.battleRulesVersion === undefined || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].includes(value.battleRulesVersion))
    && (version >= 22 || value.battleRulesVersion !== 18)
    && (version >= 21 || value.battleRulesVersion !== 17)
    && (version >= 20 || value.battleRulesVersion !== 16)
    && (version >= 19 || value.battleRulesVersion !== 15)
    && (version >= 18 || value.battleRulesVersion !== 14)
    && (value.assessment === undefined || (isBattleAssessment(value.assessment) && value.assessment.objective.status !== 'in-progress'
    && Boolean(BATTLE_OBJECTIVES[value.assessment.objective.id.split(':')[0]]?.[value.assessment.objective.id.split(':')[1]])
    && (!value.battleId || value.assessment.objective.id.startsWith(`${value.battleId}:`))
    && (!value.choiceId || !value.battleId || value.assessment.objective.id === `${value.battleId}:${value.choiceId}`)));
}

function isValidSupplyReport(report) {
  const account = value => isRecord(value) && Object.keys(value).length === 2 && number(value.treasury, 0, 1000000) && number(value.munitions, 0, 1000000);
  const transactions = value => Array.isArray(value) && value.length <= 20 && value.every(item => isRecord(item) && Object.keys(item).length === 2
    && ['treasury', 'munitions'].includes(item.resource) && number(item.amount, Number.MIN_VALUE, 1000));
  return isRecord(report) && Object.keys(report).length === 9 && report.version === 1
    && RECOVERY_ALLOCATION_IDS.includes(report.allocationId)
    && isRecord(report.upkeep) && Object.entries(report.upkeep).every(([key, value]) => Object.hasOwn(INITIAL_STATE.metrics, key) && number(value, -100, 0))
    && transactions(report.shortages) && transactions(report.repayments) && number(report.benefitRatio, 0.4, 1)
    && account(report.arrearsBefore) && account(report.arrearsAfter)
    && Array.isArray(report.notes) && report.notes.length <= 10 && report.notes.every(note => text(note, 1000));
}

function isValidEconomyState(state, version) {
  if (version < 6 && state.battleRulesVersion !== undefined && state.battleRulesVersion !== 1) return false;
  if (version === 6 && ![1, 2].includes(state.battleRulesVersion)) return false;
  if (version === 7 && ![1, 2, 3].includes(state.battleRulesVersion)) return false;
  if (version === 8 && ![1, 2, 3, 4].includes(state.battleRulesVersion)) return false;
  if (version === 9 && ![1, 2, 3, 4, 5].includes(state.battleRulesVersion)) return false;
  if (version === 10 && ![1, 2, 3, 4, 5, 6].includes(state.battleRulesVersion)) return false;
  if (version === 11 && ![1, 2, 3, 4, 5, 6, 7].includes(state.battleRulesVersion)) return false;
  if (version === 12 && ![1, 2, 3, 4, 5, 6, 7, 8].includes(state.battleRulesVersion)) return false;
  if (version === 13 && ![1, 2, 3, 4, 5, 6, 7, 8, 9].includes(state.battleRulesVersion)) return false;
  if (version === 14 && ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(state.battleRulesVersion)) return false;
  if (version === 15 && ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].includes(state.battleRulesVersion)) return false;
  if (version === 16 && ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(state.battleRulesVersion)) return false;
  if (version === 17 && ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].includes(state.battleRulesVersion)) return false;
  if (version === 18 && ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(state.battleRulesVersion)) return false;
  if (version === 19 && state.battleRulesVersion >= 16) return false;
  if (version === 20 && state.battleRulesVersion >= 17) return false;
  if (version === 21 && state.battleRulesVersion >= 18) return false;
  if (version >= 19 && ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].includes(state.battleRulesVersion)) return false;
  if (version < 5 && state.rulesVersion !== undefined && state.rulesVersion !== 1) return false;
  if (version >= 5 && ![1, 2].includes(state.rulesVersion)) return false;
  const rules = state.rulesVersion ?? 1;
  if (state.difficulty !== undefined && (!CAMPAIGN_DIFFICULTIES.includes(state.difficulty) || (rules === 1 && state.difficulty !== 'standard'))) return false;
  if (version >= 5 && state.difficulty === undefined) return false;
  const economy = state.campaignEconomy;
  if (economy === undefined) { if (version >= 5) return false; }
  else if (!isRecord(economy) || Object.keys(economy).length !== 3
    || !number(economy.treasuryArrears, 0, 1000000) || !number(economy.munitionsArrears, 0, 1000000)
    || !Number.isInteger(economy.emergencyUsed) || economy.emergencyUsed < 0 || economy.emergencyUsed > EMERGENCY_RESERVE_LIMIT) return false;
  if (rules === 1 && economy && Object.values(economy).some(value => value !== 0)) return false;
  const plan = state.supplyPlan;
  if (plan == null) return version < 5 || plan === null;
  return rules === 2 && isRecord(plan) && Object.keys(plan).length === 4
    && text(plan.scenarioId, 200) && Boolean(plan.scenarioId)
    && Number.isInteger(plan.decisionIndex) && plan.decisionIndex >= 0 && plan.decisionIndex <= state.history?.length
    && RECOVERY_ALLOCATION_IDS.includes(plan.allocationId) && typeof plan.committed === 'boolean'
    && (plan.decisionIndex < state.history.length || plan.scenarioId === state.scenarioId)
    && (!plan.committed || plan.allocationId !== 'emergency' || economy?.emergencyUsed > 0);
}

function normalizeState(rawState) {
  const state = {
    ...clone(INITIAL_STATE),
    ...clone(rawState),
    metrics: {
      ...INITIAL_STATE.metrics,
      ...(rawState.metrics || {})
    },
    shards: {
      ...clone(INITIAL_STATE.shards),
      ...(rawState.shards || {})
    },
    battleCampaign: {
      version: 1,
      results: { ...(rawState.battleCampaign?.results || {}) }
    },
    history: Array.isArray(rawState.history) ? rawState.history : []
  };

  state.scenarioId = state.scenarioId || null;
  state.rulesVersion = rawState.rulesVersion ?? 1;
  state.battleRulesVersion = rawState.battleRulesVersion ?? 1;
  state.difficulty = rawState.difficulty ?? 'standard';
  state.campaignEconomy = rawState.campaignEconomy ?? createCampaignEconomy();
  state.supplyPlan = rawState.supplyPlan ?? null;
  state.consultedPrimerIds = rawState.consultedPrimerIds || [];
  state.pendingDebrief = isAfterActionReport(rawState.pendingDebrief) ? clone(rawState.pendingDebrief) : null;
  state.nextScenarioId = state.nextScenarioId || null;
  return state;
}

export function createCampaignSnapshot(state, activeScenario, metadata = {}) {
  return {
    version: CAMPAIGN_SAVE_VERSION,
    exportedAt: new Date().toISOString(),
    metadata: {
      engine: 'titans-of-war',
      mode: metadata.aiPortalEngaged ? 'ollama-or-fallback' : 'scripted',
      selectedModel: metadata.selectedModel || null
    },
    state: clone({ ...state, correspondence: getScenarioCorrespondence(state, activeScenario?.id || state.scenarioId) }),
    activeScenarioId: activeScenario?.id || state.scenarioId || null,
    activeScenario: activeScenario ? clone(activeScenario) : null
  };
}

export function getCampaignSnapshotCompatibility(snapshot) {
  if (!isRecord(snapshot) || !isBoundedJson(snapshot)) {
    return { ok: false, reason: 'Save data is missing or is not a campaign snapshot.' };
  }
  if (!Number.isInteger(snapshot.version)) {
    return { ok: false, reason: 'Save data does not identify a supported format version.' };
  }
  if (snapshot.version > CAMPAIGN_SAVE_VERSION) {
    return {
      ok: false,
      reason: `Save version ${snapshot.version} was created by a newer Titans of War build. This build supports version ${CAMPAIGN_SAVE_VERSION}.`
    };
  }
  if (!SUPPORTED_SAVE_VERSIONS.has(snapshot.version)) {
    return {
      ok: false,
      reason: `Save version ${snapshot.version} is no longer supported. Supported versions: ${Array.from(SUPPORTED_SAVE_VERSIONS).join(', ')}.`
    };
  }
  if (!isRecord(snapshot.state)) {
    return { ok: false, reason: 'Save data does not contain a campaign state.' };
  }
  if (!isValidState(snapshot.state, snapshot.version)) {
    return { ok: false, reason: 'Save data contains an incomplete or invalid campaign state.' };
  }
  if ((snapshot.activeScenario != null && !isValidScenario(snapshot.activeScenario))
    || (snapshot.activeScenarioId != null && !text(snapshot.activeScenarioId, 200))) {
    return { ok: false, reason: 'Save data contains an invalid active scenario.' };
  }
  if (!snapshot.state.gameOver && snapshot.activeScenario != null && snapshot.activeScenario.choices.length === 0) {
    return { ok: false, reason: 'An unfinished campaign must have at least one active scenario choice.' };
  }
  if (snapshot.activeScenarioId && snapshot.activeScenario && snapshot.activeScenarioId !== snapshot.activeScenario.id) {
    return { ok: false, reason: 'Save data identifies conflicting active scenarios. The original campaign is preserved.' };
  }
  const activeId = snapshot.activeScenarioId || snapshot.activeScenario?.id;
  if (snapshot.version >= 6 && activeId && snapshot.state.scenarioId && activeId !== snapshot.state.scenarioId) {
    return { ok: false, reason: 'Save state and active scenario disagree. The original campaign is preserved.' };
  }
  return {
    ok: true,
    reason: null,
    migratedFromVersion: snapshot.version < CAMPAIGN_SAVE_VERSION ? snapshot.version : null
  };
}

function migrateCampaignSnapshot(snapshot) {
  if (snapshot.version === CAMPAIGN_SAVE_VERSION) return snapshot;

  const migrated = clone(snapshot);
  if (migrated.version === 1) {
    if (!Object.hasOwn(migrated.state.metrics, 'foodSupply')) {
      migrated.state.metrics.foodSupply = INITIAL_STATE.metrics.foodSupply;
    }
    migrated.version = 2;
  }
  if (migrated.version === 2) {
    migrated.state.battleCampaign ??= { version: 1, results: {} };
    migrated.state.pendingDebrief ??= null;
    migrated.version = 3;
  }
  if (migrated.version === 3) {
    // Older saves never recorded a scenario-bound submission or planning bonus.
    migrated.state.correspondence = null;
    migrated.version = 4;
  }
  if (migrated.version === 4) {
    migrated.state.rulesVersion = 1;
    migrated.state.difficulty = 'standard';
    migrated.state.campaignEconomy = createCampaignEconomy();
    migrated.state.supplyPlan = null;
    migrated.version = 5;
  }
  if (migrated.version === 5) {
    // The campaign economy version cannot determine which tactical engine ran.
    // Existing archives retain the original combat behavior explicitly.
    migrated.state.battleRulesVersion = 1;
    migrated.version = 6;
  }
  if (migrated.version === 6) migrated.version = 7; // Preserve the recorded tactical rules.
  return {
    ...migrated,
    metadata: {
      engine: 'titans-of-war',
      mode: 'scripted',
      selectedModel: null,
      ...(snapshot.metadata || {}),
      migratedFromVersion: snapshot.version
    }
  };
}

export function restoreCampaignFromSnapshot(snapshot, scenarios = []) {
  const compatibility = getCampaignSnapshotCompatibility(snapshot);
  if (!compatibility.ok) return null;
  const migratedSnapshot = migrateCampaignSnapshot(snapshot);

  const state = normalizeState(migratedSnapshot.state);
  if (!isValidState(state)) return null;

  const scenarioId = migratedSnapshot.activeScenarioId || state.scenarioId || migratedSnapshot.activeScenario?.id || state.nextScenarioId;
  const staticScenario = scenarioId ? scenarios.find((scenario) => scenario.id === scenarioId) : null;
  const embeddedScenario = migratedSnapshot.activeScenario && (!scenarioId || migratedSnapshot.activeScenario.id === scenarioId) ? migratedSnapshot.activeScenario : null;
  // A missing named branch must not quietly become a same-turn authored scene.
  // Only archives without any scenario identity may use historical turn fallback.
  if (scenarioId && !staticScenario && !embeddedScenario) return null;
  const turnScenario = scenarios.find((scenario) => scenario.turn === state.currentTurn);
  const activeScenario = staticScenario
    || embeddedScenario
    || turnScenario
    || scenarios[0]
    || null;

  return {
    state: {
      ...state,
      scenarioId: activeScenario?.id || state.scenarioId || null,
      nextScenarioId: state.nextScenarioId || null,
      actor: activeScenario?.actor || state.actor,
      roleLabel: activeScenario?.roleLabel || state.roleLabel,
      correspondence: getScenarioCorrespondence(state, activeScenario?.id || state.scenarioId)
    },
    activeScenario,
    migratedFromVersion: compatibility.migratedFromVersion
  };
}

export function saveCampaignSnapshot(snapshot, storage = getDefaultStorage(), key = CAMPAIGN_STORAGE_KEY) {
  if (!storage) return { ok: false, error: 'localStorage unavailable' };

  try {
    if (!getCampaignSnapshotCompatibility(snapshot).ok) return { ok: false, error: 'Invalid campaign snapshot; previous save preserved' };
    const raw = JSON.stringify(snapshot);
    if (new TextEncoder().encode(raw).byteLength > MAX_CAMPAIGN_BYTES) return { ok: false, error: 'Campaign exceeds the 4 MiB save limit; previous save preserved' };
    if (key === CAMPAIGN_STORAGE_KEY && storage.getItem) {
      let previous = null;
      try { previous = JSON.parse(storage.getItem(key)); } catch { /* Protected unreadable saves are handled by the caller. */ }
      if (previous && Number.isInteger(previous.version) && previous.version >= 1 && previous.version < CAMPAIGN_SAVE_VERSION) {
        const backup = backupOriginalCampaignRaw(storage);
        if (!backup.ok) return { ok: false, error: `Original pre-migration save could not be backed up: ${backup.error}` };
      }
    }
    storage.setItem(key, raw);
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export function loadCampaignCheckpoints(storage = getDefaultStorage()) {
  try {
    const entries = JSON.parse(storage?.getItem(CHECKPOINT_STORAGE_KEY) || '[]');
    return Array.isArray(entries) ? entries.filter((entry) => text(entry?.id, 500) && text(entry?.label, 1000) && getCampaignSnapshotCompatibility(entry.snapshot).ok).slice(0, 8) : [];
  } catch { return []; }
}

export function saveCampaignCheckpoint(snapshot, storage = getDefaultStorage()) {
  if (!storage) return { ok: false, error: 'Browser storage unavailable' };
  if (!getCampaignSnapshotCompatibility(snapshot).ok) return { ok: false, error: 'Invalid checkpoint' };
  const id = `${snapshot.state.seed}:${snapshot.activeScenarioId}:${snapshot.state.history?.length || 0}`;
  const entry = { id, label: `${snapshot.activeScenario?.title || 'Campaign'} · decision ${(snapshot.state.history?.length || 0) + 1}`, snapshot };
  try {
    storage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify([entry, ...loadCampaignCheckpoints(storage).filter((item) => item.id !== id)].slice(0, 8)));
    return { ok: true };
  } catch (error) { return { ok: false, error: error.message }; }
}

export function loadCampaignSnapshot(storage = getDefaultStorage()) {
  return loadCampaignSnapshotResult(storage).snapshot;
}

export function loadCampaignSnapshotResult(storage = getDefaultStorage()) {
  if (!storage) {
    return {
      snapshot: null,
      error: 'Browser storage is unavailable.',
      hasStoredSave: false
    };
  }

  let hasStoredSave = false;
  try {
    const raw = storage.getItem(CAMPAIGN_STORAGE_KEY);
    hasStoredSave = raw !== null;
    if (raw && new TextEncoder().encode(raw).byteLength > MAX_CAMPAIGN_BYTES) return { snapshot: null, hasStoredSave, error: 'Stored auto-save exceeds the 4 MiB import limit. Original save preserved.' };
    return {
      snapshot: raw === null ? null : JSON.parse(raw),
      error: null,
      hasStoredSave
    };
  } catch (err) {
    return {
      snapshot: null,
      error: `Stored auto-save could not be read: ${err.message}`,
      hasStoredSave
    };
  }
}

export function readOriginalCampaignRaw(storage = getDefaultStorage()) {
  try { return { raw: storage?.getItem(CAMPAIGN_STORAGE_KEY) ?? null, error: null }; }
  catch (error) { return { raw: null, error: error.message }; }
}

// A protected, unreadable archive must survive an intentional reset/import too.
// Preserve each distinct original under a separate key; never overwrite a previous recovery.
export function backupOriginalCampaignRaw(storage = getDefaultStorage()) {
  if (!storage) return { ok: false, error: 'Browser storage unavailable' };
  try {
    const raw = storage.getItem(CAMPAIGN_STORAGE_KEY);
    if (raw === null) return { ok: true, key: null };
    let hash = 2166136261;
    for (let i = 0; i < raw.length; i++) hash = Math.imul(hash ^ raw.charCodeAt(i), 16777619) >>> 0;
    const key = `${CAMPAIGN_STORAGE_KEY}:recovery:${raw.length}:${hash.toString(16)}`;
    const existing = storage.getItem(key);
    if (existing !== null && existing !== raw) return { ok: false, error: 'Recovery key conflict; original archive preserved' };
    if (existing === null) storage.setItem(key, raw);
    if (storage.getItem(key) !== raw) return { ok: false, error: 'Recovery backup could not be verified' };
    return { ok: true, key };
  } catch (error) { return { ok: false, error: error.message }; }
}
