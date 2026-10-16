// Exact stationary source addresses for the Union northeast action opt-in.
// Marching retains the previous pass's fallback artwork and timing.
// Common scale, approval, pivots, timing and shot motion remain in the shared
// clip validator and pose selector.
export const GETTYSBURG_INFANTRY_UNION_NORTHEAST_ACTION_CLIPS_IDS = Object.freeze(['gettysburg-v27']);

const COUNTS = Object.freeze({ ready: 1, fire: 1, reload: 2 });
const expected = clip => typeof clip?.identity === 'string' && ['a', 'b'].includes(clip.identity)
  && typeof clip?.action === 'string' && Object.hasOwn(COUNTS, clip.action) ? {
    key: `union-gettysburg-v27-${clip.identity}-actions-ne`,
    sequence: `gettysburg-v27-union-${clip.identity}-ne`,
    frames: Array.from({ length: COUNTS[clip.action] }, (_, phase) => `${clip.identity}-${clip.action}-7-${phase}`),
  } : null;

export function isGettysburgInfantryUnionNortheastActionClip(clip) {
  return Boolean(clip && typeof clip === 'object' && (
    (typeof clip.key === 'string' && /^(union|confederate)-gettysburg-v27-/.test(clip.key))
    || Object.hasOwn(clip, 'nativeUnionNortheastSequence')));
}

export function validateGettysburgInfantryUnionNortheastActionClip(clip) {
  if (!clip || typeof clip !== 'object') return ['Native Union northeast action clip is required'];
  const errors = [], address = expected(clip);
  if (!address || clip.key !== address.key || clip.side !== 'union' || clip.direction !== 7) {
    errors.push('Native Union northeast actions require their exact A or B action address');
  }
  if (!address || clip.nativeUnionNortheastSequence !== address.sequence
    || clip.nativeReloadSequence !== undefined || clip.nativeContactSequence !== undefined
    || clip.nativeCasualtySequence !== undefined) {
    errors.push('Native Union northeast actions require their separate identity sequence marker');
  }
  if (!address || !Array.isArray(clip.frames) || clip.frames.length !== address.frames.length
    || address.frames.some((frame, phase) => clip.frames[phase] !== frame)) {
    errors.push('Native Union northeast actions must retain their authored frames and order');
  }
  if (clip.action === 'fire' ? !Array.isArray(clip.muzzles) || clip.muzzles.length !== 1 : clip.muzzles !== undefined) {
    errors.push('Only native Union northeast fire supplies one reviewed muzzle');
  }
  return errors;
}
