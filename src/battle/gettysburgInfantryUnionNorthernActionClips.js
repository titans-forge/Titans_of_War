// Exact stationary north/northwest addresses for a separate Union opt-in.
// Shared validation, scale, timing and shot motion stay in the main selector;
// all marching and earlier action sources retain their existing behavior.
export const GETTYSBURG_INFANTRY_UNION_NORTHERN_ACTION_CLIPS_IDS = Object.freeze(['gettysburg-v28']);

const COUNTS = Object.freeze({ ready: 1, fire: 1, reload: 2 });
const BEARINGS = Object.freeze({ 5: 'nw', 6: 'n' });
const expected = clip => typeof clip?.identity === 'string' && ['a', 'b'].includes(clip.identity)
  && Number.isInteger(clip?.direction) && Object.hasOwn(BEARINGS, clip.direction)
  && typeof clip?.action === 'string' && Object.hasOwn(COUNTS, clip.action) ? {
    key: `union-gettysburg-v28-${clip.identity}-actions-${BEARINGS[clip.direction]}`,
    sequence: `gettysburg-v28-union-${clip.identity}-${BEARINGS[clip.direction]}`,
    frames: Array.from({ length: COUNTS[clip.action] }, (_, phase) => `${clip.identity}-${clip.action}-${clip.direction}-${phase}`),
  } : null;

export function isGettysburgInfantryUnionNorthernActionClip(clip) {
  return Boolean(clip && typeof clip === 'object' && (
    (typeof clip.key === 'string' && /^(union|confederate)-gettysburg-v28-/.test(clip.key))
    || Object.hasOwn(clip, 'nativeUnionNorthernSequence')));
}

export function validateGettysburgInfantryUnionNorthernActionClip(clip) {
  if (!clip || typeof clip !== 'object') return ['Native Union northern action clip is required'];
  const errors = [], address = expected(clip);
  if (!address || clip.key !== address.key || clip.side !== 'union') {
    errors.push('Native Union northern actions require their exact A/B north or northwest address');
  }
  if (!address || clip.nativeUnionNorthernSequence !== address.sequence
    || clip.nativeUnionNortheastSequence !== undefined || clip.nativeReloadSequence !== undefined
    || clip.nativeContactSequence !== undefined || clip.nativeCasualtySequence !== undefined) {
    errors.push('Native Union northern actions require their separate identity and bearing marker');
  }
  if (!address || !Array.isArray(clip.frames) || clip.frames.length !== address.frames.length
    || address.frames.some((frame, phase) => clip.frames[phase] !== frame)) {
    errors.push('Native Union northern actions must retain their authored frames and order');
  }
  if (clip.action === 'fire' ? !Array.isArray(clip.muzzles) || clip.muzzles.length !== 1 : clip.muzzles !== undefined) {
    errors.push('Only native Union northern fire supplies one reviewed muzzle');
  }
  return errors;
}
