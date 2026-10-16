import { deterministicUnitValue } from './formationMath.js';
import { gettysburgInfantryIdentity } from './gettysburgInfantryFamily.js';

// Separate from both historical and Confederate v20 clip registries. Exact
// Union A west addresses bind two independently reviewed whole native sheets.
// Other actions or bearings cannot opt in by attaching a sequence marker.
export const GETTYSBURG_INFANTRY_UNION_CONTACT_CLIPS_IDS = Object.freeze(['gettysburg-v21']);
const CONTRACTS = Object.freeze({
  melee: Object.freeze({ key: 'union-gettysburg-v21-a-contact-w', marker: 'nativeContactSequence',
    sequence: 'gettysburg-v21-union-a-w-contact', frames: Object.freeze(['a-melee-4-0', 'a-melee-4-1', 'a-melee-4-2', 'a-melee-4-3']) }),
  fall: Object.freeze({ key: 'union-gettysburg-v21-a-casualty-w', marker: 'nativeCasualtySequence',
    sequence: 'gettysburg-v21-union-a-w-casualty', frames: Object.freeze(['a-fall-4-0', 'a-fall-4-1', 'a-fall-4-2', 'a-fall-4-3']) }),
});

export function isGettysburgInfantryUnionContactClip(clip) {
  return clip && (Object.values(CONTRACTS).some(contract => clip.key === contract.key)
    || (clip.side === 'union' && (clip.nativeContactSequence !== undefined || clip.nativeCasualtySequence !== undefined))
    || [clip.nativeContactSequence, clip.nativeCasualtySequence].some(marker => typeof marker === 'string' && marker.startsWith('gettysburg-v21-')));
}

export function validateGettysburgInfantryUnionContactClip(clip) {
  if (!clip || typeof clip !== 'object') return ['Native contact/casualty clip is required'];
  const errors = [], contract = typeof clip.action === 'string' && Object.hasOwn(CONTRACTS, clip.action) ? CONTRACTS[clip.action] : null;
  if (!contract || clip.key !== contract.key || clip.side !== 'union' || clip.identity !== 'a' || clip.direction !== 4) {
    errors.push('Native contact/casualty requires its exact Union A west action address');
  }
  if (!contract || clip[contract.marker] !== contract.sequence
    || clip.nativeReloadSequence !== undefined
    || (contract.marker === 'nativeContactSequence' ? clip.nativeCasualtySequence !== undefined : clip.nativeContactSequence !== undefined)) {
    errors.push('Native contact/casualty requires its exact separate sequence marker');
  }
  if (!Array.isArray(clip.frames) || clip.frames.length !== 4 || !contract
    || contract.frames.some((frame, index) => clip.frames[index] !== frame)) errors.push('Four distinct native poses must retain authored action and order');
  if (typeof clip.sourceHash !== 'string' || !/^[a-f0-9]{64}$/.test(clip.sourceHash)) errors.push('Native source SHA-256 is required');
  if (!Number.isFinite(clip.referenceHeight) || clip.referenceHeight <= 0) errors.push('Positive common source reference height is required');
  if (!Array.isArray(clip.pivots) || clip.pivots.length !== 4
    || Array.from(clip.pivots).some(pivot => !Number.isFinite(pivot?.x) || !Number.isFinite(pivot?.y)
      || pivot.x < 0 || pivot.x > 1 || pivot.y < 0 || pivot.y > 1)) errors.push('Normalized native ground pivots are required for every frame');
  if (clip.muzzles !== undefined) errors.push('Contact/casualty artwork cannot supply firing muzzles');
  if (clip.approval?.reviewed !== true || clip.approval?.rejected !== false) errors.push('Explicit reviewed native approval is required');
  return errors;
}

export function gettysburgInfantryUnionContactClipPose(formationId, figure, {
  side, policy, clips = [], identity, versionedIdentity = false, reducedMotion = false,
} = {}) {
  if (policy?.nativeUnionContactCasualty !== true || side !== 'union' || !figure
    || figure.direction !== 4 || !Array.isArray(clips) || !Object.hasOwn(CONTRACTS, figure.action)
    || (figure.action === 'fall' ? figure.fallen !== true : Boolean(figure.fallen))) return null;
  const chosenIdentity = versionedIdentity === true && policy.stableUnionIdentity ? gettysburgInfantryIdentity(formationId, figure.id)
    : identity === undefined ? gettysburgInfantryIdentity(formationId, figure.id) : identity;
  if (chosenIdentity !== 'a') return null;
  const candidates = clips.filter(clip => clip?.ready === true && clip.side === side
    && clip.identity === chosenIdentity && clip.direction === figure.direction && clip.action === figure.action);
  if (candidates.length !== 1 || validateGettysburgInfantryUnionContactClip(candidates[0]).length) return null;
  const clip = candidates[0], frame = Number.isFinite(figure.frame) ? Math.floor(figure.frame) : 0;
  // The unchanged visual-state adapter supplies contact frames from actual
  // combat time/facing and casualty frames from saved fall.time. A casualty
  // clamps at ground rest and continues the existing resolution-age fade.
  // Sprite-local frozen phases are deliberately unnecessary: they are not
  // saved, and using one during resolution would break the first cold draw.
  const phase = reducedMotion ? figure.action === 'fall' ? 3 : 0
    : figure.action === 'fall' ? Math.max(0, Math.min(3, frame)) : ((frame % 4) + 4) % 4;
  const scale = 0.95 + deterministicUnitValue(formationId, figure.id, 215) * .10;
  const tintSeed = deterministicUnitValue(formationId, figure.id, 211);
  return {
    identity: chosenIdentity, page: figure.action, key: clip.key, direction: 4,
    phase, frame: clip.frames[phase], sourceHash: clip.sourceHash,
    referenceHeight: clip.referenceHeight, pivot: clip.pivots[phase], width: scale, height: scale,
    tint: [0xfff8ef, 0xf3f1e9, 0xddd6c9, 0xf0dec0][Math.floor(tintSeed * 4) % 4],
    flip: false, axialAim: false, useLegacyRearAim: false, angle: 0, offsetX: 0, offsetY: 0,
  };
}
