import { CivilWarBattleEngine } from '../battle/civilWarEngine.js';
import { combatCheckpointEnvelope } from '../battle/combatCheckpointEnvelope.js';
import { BATTLE_SCENARIOS } from './battles.js';
import { CAMPAIGN_STORAGE_KEY } from './campaignStorage.js';
export const FIELD_CHECKPOINT_KEY = 'titans-of-war:field-checkpoint:v1';
const MAX_BYTES = 3000000;
function defaultStorage() { try { return window.localStorage; } catch { return null; } }
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
function campaignAnchor(raw) {
  const save = JSON.parse(raw);
  if (!save?.state) throw new Error('Save the campaign before suspending its battle.');
  return JSON.stringify(canonical({ state: save.state, activeScenarioId: save.activeScenarioId }));
}
// Accidental corruption check, not a security signature.
function checksum(text) { let hash = 2166136261; for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619); return (hash >>> 0).toString(16); }
export function saveFieldCheckpoint(pending, checkpoint, campaignState, storage = defaultStorage()) {
  if (!storage) throw new Error('Device storage is unavailable. Stay in battle and try again.');
  const context = { ...pending, mode: 'suspended', checkpoint, resumeState: campaignState };
  const payload = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), anchor: campaignAnchor(storage.getItem(CAMPAIGN_STORAGE_KEY)), context });
  const raw = JSON.stringify({ payload, checksum: checksum(payload) });
  if (raw.length > MAX_BYTES) throw new Error('This field checkpoint is too large to save on this device.');
  storage.setItem(FIELD_CHECKPOINT_KEY, raw);
  if (storage.getItem(FIELD_CHECKPOINT_KEY) !== raw) throw new Error('The field checkpoint could not be verified. Stay in battle and try again.');
  return context;
}
export function loadFieldCheckpoint(storage = defaultStorage()) {
  try {
    const raw = storage?.getItem(FIELD_CHECKPOINT_KEY);
    if (!raw) return { pending: null, error: null };
    if (raw.length > MAX_BYTES) throw new Error('Field checkpoint exceeds the supported size.');
    const envelope = JSON.parse(raw);
    if (typeof envelope.payload !== 'string' || envelope.checksum !== checksum(envelope.payload)) throw new Error('The field checkpoint is damaged.');
    const saved = JSON.parse(envelope.payload), context = saved.context;
    if (saved.version !== 1) throw new Error('This field checkpoint needs a different game version.');
    if (saved.anchor !== campaignAnchor(storage.getItem(CAMPAIGN_STORAGE_KEY))) throw new Error('This field checkpoint belongs to an earlier campaign state.');
    const battle = Object.values(BATTLE_SCENARIOS).find(b => b.id === context?.battle?.id);
    if (!battle || !['option_a','option_b','option_c','option_d'].includes(context.choiceId)) throw new Error('The saved battle is not supported.');
    CivilWarBattleEngine.fromCheckpoint(combatCheckpointEnvelope(context.checkpoint), battle.id, context.resumeState, context.choiceId);
    return { pending: { ...context, battle, mode: 'suspended' }, error: null };
  } catch (error) { return { pending: null, error: `${error.message} Your campaign is preserved; the field checkpoint has not been overwritten.` }; }
}
export function clearFieldCheckpoint(storage = defaultStorage()) {
  if (!storage) throw new Error('Device storage is unavailable.');
  storage.removeItem(FIELD_CHECKPOINT_KEY);
  if (storage.getItem(FIELD_CHECKPOINT_KEY) !== null) throw new Error('The saved battle could not be removed.');
}
