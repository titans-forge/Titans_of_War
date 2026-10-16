import { CAMPAIGN_STORAGE_KEY, saveCampaignSnapshot } from './campaignStorage.js';
import { FIELD_CHECKPOINT_KEY, saveFieldCheckpoint, loadFieldCheckpoint } from './fieldCheckpoint.js';

function defaultStorage() { try { return window.localStorage; } catch { return null; } }
const ownedKeys = [CAMPAIGN_STORAGE_KEY, FIELD_CHECKPOINT_KEY];
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
// Exactly the unchanged fieldCheckpoint campaignAnchor semantics. This also
// binds initial campaign ownership when no valid field checkpoint exists.
function campaignOwner(snapshot) {
  if (snapshot === null) return null;
  if (!snapshot?.state) throw new Error('The campaign snapshot has no state.');
  return JSON.stringify(canonical({ state: snapshot.state, activeScenarioId: snapshot.activeScenarioId }));
}

// Ownership is the already validated, exact saved anchor. It remains in
// memory; it is never added to either storage format or the pending context.
export function loadFieldSuspension(storage = defaultStorage(), expectedSnapshot = undefined) {
  if (!storage) return { ...loadFieldCheckpoint(storage), owner: null, protectedCampaign: false };
  const changed = () => ({ pending: null, owner: null, protectedCampaign: true,
    error: 'The campaign or field save changed while loading. Reload before saving; the stored campaign and field checkpoint are preserved.' });
  try {
    const campaignRaw = storage.getItem(CAMPAIGN_STORAGE_KEY);
    const fieldRaw = storage.getItem(FIELD_CHECKPOINT_KEY);
    const captured = { getItem: key => key === FIELD_CHECKPOINT_KEY ? fieldRaw : campaignRaw };
    const loaded = loadFieldCheckpoint(captured);
    let mismatchedCampaign = false;
    if (expectedSnapshot !== undefined) {
      mismatchedCampaign = campaignOwner(campaignRaw === null ? null : JSON.parse(campaignRaw)) !== campaignOwner(expectedSnapshot);
      if (!mismatchedCampaign && loaded.pending && !loadFieldCheckpoint({ getItem: key => key === FIELD_CHECKPOINT_KEY ? fieldRaw : JSON.stringify(expectedSnapshot) }).pending) mismatchedCampaign = true;
    }
    const fieldNow = storage.getItem(FIELD_CHECKPOINT_KEY), campaignNow = storage.getItem(CAMPAIGN_STORAGE_KEY);
    if (fieldNow !== fieldRaw || campaignNow !== campaignRaw || mismatchedCampaign) return changed();
    if (!loaded.pending) return { ...loaded, owner: null, protectedCampaign: false };
    const owner = JSON.parse(JSON.parse(fieldRaw).payload).anchor;
    return { ...loaded, owner, protectedCampaign: false };
  } catch {
    return changed();
  }
}

// localStorage has no transaction or compare-and-swap. Stage the unchanged
// storage formats first, then verify each write and recover only bytes still
// owned by this attempt. Another tab can still act between a check and a write.
export function saveFieldSuspension(snapshot, pending, checkpoint, resumeState, storage = defaultStorage(), owner = null) {
  if (!storage) throw new Error('Device storage is unavailable. Stay in battle and try again.');
  const before = new Map();
  const staged = new Map();
  const attempted = [];
  let context;
  const readBefore = key => {
    if (!before.has(key)) before.set(key, storage.getItem(key));
    return before.get(key);
  };
  try {
    for (const key of ownedKeys) readBefore(key);
    const preparation = {
      getItem: key => staged.has(key) ? staged.get(key) : readBefore(key),
      setItem: (key, value) => { readBefore(key); staged.set(key, value); },
    };
    if (pending?.checkpoint) {
      const previousLoad = loadFieldSuspension(preparation);
      const previous = previousLoad.pending;
      if (typeof owner !== 'string' || !owner || previousLoad.owner !== owner
        || !previous || previous.battle.id !== pending.battle?.id || previous.choiceId !== pending.choiceId
        || JSON.stringify(previous.checkpoint) !== JSON.stringify(pending.checkpoint)
        || JSON.stringify(previous.resumeState) !== JSON.stringify(pending.resumeState)) {
        const error = new Error('The previously loaded field checkpoint changed.');
        error.code = 'FIELD_OWNER_CHANGED';
        throw error;
      }
    }
    const campaign = saveCampaignSnapshot(snapshot, preparation);
    if (!campaign.ok) throw new Error(campaign.error);
    context = saveFieldCheckpoint(pending, checkpoint, resumeState, preparation);
    const validation = loadFieldCheckpoint(preparation);
    if (!validation.pending || validation.error) throw new Error('The proposed field checkpoint is invalid.');

    // Older campaigns retain the existing recovery-backup semantics. A
    // verified recovery is deliberately retained even if suspension fails.
    const keys = [...staged.keys()].filter(key => !ownedKeys.includes(key)).concat(ownedKeys);
    for (const key of keys) {
      if (storage.getItem(key) !== before.get(key)) throw new Error('Storage changed during the save.');
      if (key === FIELD_CHECKPOINT_KEY && storage.getItem(CAMPAIGN_STORAGE_KEY) !== staged.get(CAMPAIGN_STORAGE_KEY)) {
        throw new Error('The campaign changed during the save.');
      }
      attempted.push(key);
      storage.setItem(key, staged.get(key));
      if (storage.getItem(key) !== staged.get(key)) throw new Error('The saved bytes could not be verified.');
    }
    for (const key of ownedKeys) {
      if (storage.getItem(key) !== staged.get(key)) throw new Error('The saved pair changed during verification.');
    }
    if (!loadFieldCheckpoint(storage).pending) throw new Error('The saved field checkpoint could not be loaded.');
    for (const key of ownedKeys) {
      if (storage.getItem(key) !== staged.get(key)) throw new Error('The saved pair changed after validation.');
    }
    return { pending: context, owner: JSON.parse(JSON.parse(staged.get(FIELD_CHECKPOINT_KEY)).payload).anchor };
  } catch (cause) {
    let concurrentDrift = false;
    for (const key of [...attempted].reverse().filter(key => ownedKeys.includes(key))) {
      try {
        const current = storage.getItem(key);
        if (current === before.get(key)) continue;
        if (current !== staged.get(key)) { concurrentDrift = true; continue; }
        // Recheck ownership immediately before restoration. This narrows the
        // uncoordinated race; it cannot make two localStorage writes atomic.
        if (storage.getItem(key) !== staged.get(key)) { concurrentDrift = true; continue; }
        if (before.get(key) === null) storage.removeItem(key);
        else storage.setItem(key, before.get(key));
      } catch { /* The final read reports a blocked or incomplete recovery. */ }
    }
    let rollbackComplete = before.size >= ownedKeys.length;
    for (const key of ownedKeys) {
      try {
        const current = storage.getItem(key);
        if (!before.has(key) || current !== before.get(key)) rollbackComplete = false;
        if (before.has(key) && current !== before.get(key) && current !== staged.get(key)) concurrentDrift = true;
      } catch { rollbackComplete = false; }
    }
    const message = rollbackComplete
      ? cause?.code === 'FIELD_OWNER_CHANGED'
        ? 'Battle was not saved. The campaign or field save changed since this battle was loaded. Reload before saving; the stored campaign and field save are preserved.'
        : 'Battle was not saved. Your previous campaign and field save are preserved. Stay in battle and try again.'
      : 'Battle was not saved. Storage changed or recovery was blocked; the previous save pair could not be fully restored. Stay in battle and export your campaign before retrying.';
    const error = new Error(message, { cause });
    error.rollbackComplete = rollbackComplete;
    error.concurrentDrift = concurrentDrift;
    throw error;
  }
}
