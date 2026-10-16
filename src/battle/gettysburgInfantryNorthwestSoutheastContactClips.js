import { deterministicUnitValue } from './formationMath.js';
import { gettysburgInfantryIdentity } from './gettysburgInfantryFamily.js';

// Only these four reviewed NW/SE action addresses may use this source family.
// Union B and every other missing address retain the accepted fallback.
export const GETTYSBURG_INFANTRY_NORTHWEST_SOUTHEAST_CONTACT_CLIPS_IDS = Object.freeze(['gettysburg-v31']);
const contract = (side, bearing, direction, action) => Object.freeze({
  side, direction, action, key: `${side}-gettysburg-v31-a-${action === 'melee' ? 'contact' : 'casualty'}-${bearing}`,
  marker: action === 'melee' ? 'nativeContactSequence' : 'nativeCasualtySequence',
  sequence: `gettysburg-v31-${side}-a-${bearing}-${action === 'melee' ? 'contact' : 'casualty'}`,
  frames: Object.freeze(Array.from({ length: 4 }, (_, phase) => `a-${action}-${direction}-${phase}`)),
});
const CONTRACTS = Object.freeze({
  union: Object.freeze({ melee: contract('union', 'nw', 5, 'melee'), fall: contract('union', 'nw', 5, 'fall') }),
  confederate: Object.freeze({ melee: contract('confederate', 'se', 1, 'melee'), fall: contract('confederate', 'se', 1, 'fall') }),
});
const actionContract = (side, action) => typeof side === 'string' && Object.hasOwn(CONTRACTS, side)
  && typeof action === 'string' && Object.hasOwn(CONTRACTS[side], action) ? CONTRACTS[side][action] : null;

export function isGettysburgInfantryNorthwestSoutheastContactClip(clip) {
  return clip && (Object.values(CONTRACTS).some(actions => Object.values(actions).some(value => clip.key === value.key))
    || (typeof clip.key === 'string' && /^(union|confederate)-gettysburg-v31-/.test(clip.key))
    || [clip.nativeContactSequence, clip.nativeCasualtySequence].some(marker => typeof marker === 'string' && marker.startsWith('gettysburg-v31-')));
}

export function validateGettysburgInfantryNorthwestSoutheastContactClip(clip) {
  if (!clip || typeof clip !== 'object') return ['Native northwest/southeast contact/casualty clip is required'];
  const errors = [], expected = actionContract(clip.side, clip.action);
  if (!expected || clip.key !== expected.key || clip.identity !== 'a' || clip.direction !== expected.direction) {
    errors.push('Native northwest/southeast contact/casualty requires its exact Union A northwest or Confederate A southeast action address');
  }
  if (!expected || clip[expected.marker] !== expected.sequence || clip.nativeReloadSequence !== undefined
    || clip.nativeUnionNortheastSequence !== undefined || clip.nativeUnionNorthernSequence !== undefined
    || (expected.marker === 'nativeContactSequence' ? clip.nativeCasualtySequence !== undefined : clip.nativeContactSequence !== undefined)) {
    errors.push('Native northwest/southeast contact/casualty requires its exact separate sequence marker');
  }
  if (!Array.isArray(clip.frames) || clip.frames.length !== 4 || !expected
    || expected.frames.some((frame, index) => clip.frames[index] !== frame)) errors.push('Four distinct native poses must retain authored action and order');
  if (typeof clip.sourceHash !== 'string' || !/^[a-f0-9]{64}$/.test(clip.sourceHash)) errors.push('Native source SHA-256 is required');
  if (!Number.isFinite(clip.referenceHeight) || clip.referenceHeight <= 0) errors.push('Positive common source reference height is required');
  if (!Array.isArray(clip.pivots) || clip.pivots.length !== 4
    || Array.from(clip.pivots).some(pivot => !Number.isFinite(pivot?.x) || !Number.isFinite(pivot?.y)
      || pivot.x < 0 || pivot.x > 1 || pivot.y < 0 || pivot.y > 1)) errors.push('Normalized native ground pivots are required for every frame');
  if (clip.muzzles !== undefined) errors.push('Contact/casualty artwork cannot supply firing muzzles');
  if (clip.approval?.reviewed !== true || clip.approval?.rejected !== false) errors.push('Explicit reviewed native approval is required');
  return errors;
}

export function gettysburgInfantryNorthwestSoutheastContactClipPose(formationId, figure, {
  side, policy, clips = [], identity, versionedIdentity = false, reducedMotion = false,
} = {}) {
  const expected = actionContract(side, figure?.action);
  if (policy?.nativeNorthwestSoutheastContactCasualty !== true || !expected || !figure
    || figure.direction !== expected.direction || !Array.isArray(clips)
    || (figure.action === 'fall' ? figure.fallen !== true : Boolean(figure.fallen))) return null;
  const chosenIdentity = versionedIdentity === true && policy.stableUnionIdentity
    ? side === 'union' ? gettysburgInfantryIdentity(formationId, figure.id) : 'a'
    : identity === undefined ? gettysburgInfantryIdentity(formationId, figure.id) : identity;
  if (chosenIdentity !== 'a') return null;
  const candidates = clips.filter(clip => clip?.ready === true && clip.side === side
    && clip.identity === chosenIdentity && clip.direction === figure.direction && clip.action === figure.action);
  if (candidates.length !== 1 || validateGettysburgInfantryNorthwestSoutheastContactClip(candidates[0]).length) return null;
  const clip = candidates[0], frame = Number.isFinite(figure.frame) ? Math.floor(figure.frame) : 0;
  // Existing visual state supplies contact phase and saved fall.time. Keep its
  // ground rest, resolution-age fade, paused phase and reduced-motion semantics.
  const phase = reducedMotion ? figure.action === 'fall' ? 3 : 0
    : figure.action === 'fall' ? Math.max(0, Math.min(3, frame)) : ((frame % 4) + 4) % 4;
  const scale = 0.95 + deterministicUnitValue(formationId, figure.id, 215) * .10;
  const tintSeed = deterministicUnitValue(formationId, figure.id, 211);
  return {
    identity: chosenIdentity, page: figure.action, key: clip.key, direction: figure.direction,
    phase, frame: clip.frames[phase], sourceHash: clip.sourceHash,
    referenceHeight: clip.referenceHeight, pivot: clip.pivots[phase], width: scale, height: scale,
    tint: [0xfff8ef, 0xf3f1e9, 0xddd6c9, 0xf0dec0][Math.floor(tintSeed * 4) % 4],
    flip: false, axialAim: false, useLegacyRearAim: false, angle: 0, offsetX: 0, offsetY: 0,
  };
}
