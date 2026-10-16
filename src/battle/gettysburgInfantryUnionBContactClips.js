import { deterministicUnitValue } from './formationMath.js';
import { gettysburgInfantryIdentity } from './gettysburgInfantryFamily.js';

// Only Union B southeast/northwest contact and casualty use this source family.
// All other identities, bearings and missing assets retain their accepted paths.
export const GETTYSBURG_INFANTRY_UNION_B_CONTACT_CLIPS_IDS = Object.freeze(['gettysburg-v32']);
const contract = (side, bearing, direction, action) => Object.freeze({
  side, direction, action, key: `${side}-gettysburg-v32-b-${action === 'melee' ? 'contact' : 'casualty'}-${bearing}`,
  marker: action === 'melee' ? 'nativeContactSequence' : 'nativeCasualtySequence',
  sequence: `gettysburg-v32-${side}-b-${bearing}-${action === 'melee' ? 'contact' : 'casualty'}`,
  frames: Object.freeze(Array.from({ length: 4 }, (_, phase) => `b-${action}-${direction}-${phase}`)),
});
const CONTRACTS = Object.freeze({
  1: Object.freeze({ melee: contract('union', 'se', 1, 'melee'), fall: contract('union', 'se', 1, 'fall') }),
  5: Object.freeze({ melee: contract('union', 'nw', 5, 'melee'), fall: contract('union', 'nw', 5, 'fall') }),
});
const actionContract = (side, action, direction) => side === 'union' && Number.isInteger(direction)
  && Object.hasOwn(CONTRACTS, direction) && typeof action === 'string' && Object.hasOwn(CONTRACTS[direction], action)
  ? CONTRACTS[direction][action] : null;

export function isGettysburgInfantryUnionBContactClip(clip) {
  return clip && (Object.values(CONTRACTS).some(actions => Object.values(actions).some(value => clip.key === value.key))
    || (typeof clip.key === 'string' && /^(union|confederate)-gettysburg-v32-/.test(clip.key))
    || [clip.nativeContactSequence, clip.nativeCasualtySequence].some(marker => typeof marker === 'string' && marker.startsWith('gettysburg-v32-')));
}

export function validateGettysburgInfantryUnionBContactClip(clip) {
  if (!clip || typeof clip !== 'object' || Array.isArray(clip)) return ['Native Union B southeast/northwest contact/casualty clip is required'];
  const errors = [], expected = actionContract(clip.side, clip.action, clip.direction);
  if (!expected || clip.key !== expected.key || clip.identity !== 'b' || clip.direction !== expected.direction) {
    errors.push('Native Union B southeast/northwest contact/casualty requires its exact Union B southeast or northwest action address');
  }
  if (!expected || clip[expected.marker] !== expected.sequence || clip.nativeReloadSequence !== undefined
    || clip.nativeUnionNortheastSequence !== undefined || clip.nativeUnionNorthernSequence !== undefined
    || (expected.marker === 'nativeContactSequence' ? clip.nativeCasualtySequence !== undefined : clip.nativeContactSequence !== undefined)) {
    errors.push('Native Union B southeast/northwest contact/casualty requires its exact separate sequence marker');
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

export function gettysburgInfantryUnionBContactClipPose(formationId, figure, {
  side, policy, clips = [], identity, versionedIdentity = false, reducedMotion = false,
} = {}) {
  const expected = actionContract(side, figure?.action, figure?.direction);
  if (policy?.nativeUnionBContactCasualty !== true || !expected || !figure
    || figure.direction !== expected.direction || !Array.isArray(clips)
    || (figure.action === 'fall' ? figure.fallen !== true : Boolean(figure.fallen))) return null;
  const chosenIdentity = versionedIdentity === true && policy.stableUnionIdentity
    ? side === 'union' ? gettysburgInfantryIdentity(formationId, figure.id) : 'a'
    : identity === undefined ? gettysburgInfantryIdentity(formationId, figure.id) : identity;
  if (chosenIdentity !== 'b') return null;
  const candidates = clips.filter(clip => clip?.ready === true && clip.side === side
    && clip.identity === chosenIdentity && clip.direction === figure.direction && clip.action === figure.action);
  if (candidates.length !== 1 || validateGettysburgInfantryUnionBContactClip(candidates[0]).length) return null;
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
