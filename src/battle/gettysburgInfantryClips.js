import { deterministicUnitValue } from './formationMath.js';
import { gettysburgInfantryContactPhase, gettysburgInfantryIdentity } from './gettysburgInfantryFamily.js';
import { gettysburgInfantryClipPolicy } from './gettysburgInfantryClipPolicy.js';
import { gettysburgInfantryShotMotion } from './gettysburgInfantryShotMotion.js';
import { gettysburgInfantryContactClipPose, isGettysburgInfantryContactClip,
  validateGettysburgInfantryContactClip } from './gettysburgInfantryContactClips.js';
import { gettysburgInfantryUnionContactClipPose, isGettysburgInfantryUnionContactClip,
  validateGettysburgInfantryUnionContactClip } from './gettysburgInfantryUnionContactClips.js';
import { gettysburgInfantryCardinalContactClipPose, isGettysburgInfantryCardinalContactClip,
  validateGettysburgInfantryCardinalContactClip } from './gettysburgInfantryCardinalContactClips.js';

import { gettysburgInfantryReverseCardinalContactClipPose, isGettysburgInfantryReverseCardinalContactClip,
  validateGettysburgInfantryReverseCardinalContactClip } from './gettysburgInfantryReverseCardinalContactClips.js';

import { gettysburgInfantryReverseLateralContactClipPose, isGettysburgInfantryReverseLateralContactClip,
  validateGettysburgInfantryReverseLateralContactClip } from './gettysburgInfantryReverseLateralContactClips.js';

import { gettysburgInfantryDiagonalContactClipPose, isGettysburgInfantryDiagonalContactClip,
  validateGettysburgInfantryDiagonalContactClip } from './gettysburgInfantryDiagonalContactClips.js';

import { gettysburgInfantryReverseDiagonalContactClipPose, isGettysburgInfantryReverseDiagonalContactClip,
  validateGettysburgInfantryReverseDiagonalContactClip } from './gettysburgInfantryReverseDiagonalContactClips.js';

import { isGettysburgInfantryUnionNortheastActionClip,
  validateGettysburgInfantryUnionNortheastActionClip } from './gettysburgInfantryUnionNortheastActionClips.js';

import { isGettysburgInfantryUnionNorthernActionClip,
  validateGettysburgInfantryUnionNorthernActionClip } from './gettysburgInfantryUnionNorthernActionClips.js';

import { gettysburgInfantrySoutheastNorthwestContactClipPose, isGettysburgInfantrySoutheastNorthwestContactClip,
  validateGettysburgInfantrySoutheastNorthwestContactClip } from './gettysburgInfantrySoutheastNorthwestContactClips.js';

import { gettysburgInfantryNorthwestSoutheastContactClipPose, isGettysburgInfantryNorthwestSoutheastContactClip,
  validateGettysburgInfantryNorthwestSoutheastContactClip } from './gettysburgInfantryNorthwestSoutheastContactClips.js';

import { gettysburgInfantryUnionBContactClipPose, isGettysburgInfantryUnionBContactClip,
  validateGettysburgInfantryUnionBContactClip } from './gettysburgInfantryUnionBContactClips.js';

export { GETTYSBURG_INFANTRY_CLIPS_IDS } from './gettysburgInfantryClipPolicy.js';

export const GETTYSBURG_INFANTRY_CLIPS_ID = 'gettysburg-v3';
const SIDES = ['union', 'confederate'];
const IDENTITIES = ['a', 'b'];
const ACTION_FRAMES = Object.freeze({ ready: 1, march: 4, fire: 1, reload: 2 });
const NATIVE_RELOAD_KEY = 'confederate-gettysburg-v18-a-actions-e';
const NATIVE_RELOAD_SEQUENCE = 'gettysburg-v18-confederate-a-e';
const NATIVE_RELOAD_FRAMES = Object.freeze(['a-reload-0-0', 'a-reload-0-1', 'a-reload-0-2', 'a-reload-0-3']);
const nativeReloadClip = clip => clip?.key === NATIVE_RELOAD_KEY
  && clip.side === 'confederate' && clip.identity === 'a' && clip.direction === 0
  && clip.action === 'reload' && clip.nativeReloadSequence === NATIVE_RELOAD_SEQUENCE;
const FIGURE_ACTIONS = Object.freeze({ ready: 'ready', idle: 'ready', walk: 'march', route: 'march', fire: 'fire', reload: 'reload' });
const phaseIndex = (value, count) => ((value % count) + count) % count;

export function gettysburgInfantryClipsEnabled(scenarioId, search = '') {
  return gettysburgInfantryClipPolicy(scenarioId, search) !== null;
}

// A definition binds a reviewed source to a complete action. Availability is
// checked separately at texture creation; neither metadata nor a passing test
// establishes visual approval. Every action requires its own definition:
// ready/fire have one frame, march four, and historical reloads two. The v18
// Confederate A east pilot alone binds four separately authored loading poses.
export function validateGettysburgInfantryClip(clip) {
  if (isGettysburgInfantryUnionBContactClip(clip)) return validateGettysburgInfantryUnionBContactClip(clip);
  if (isGettysburgInfantryNorthwestSoutheastContactClip(clip)) return validateGettysburgInfantryNorthwestSoutheastContactClip(clip);
  if (isGettysburgInfantrySoutheastNorthwestContactClip(clip)) return validateGettysburgInfantrySoutheastNorthwestContactClip(clip);
  const unionNorthern = isGettysburgInfantryUnionNorthernActionClip(clip);
  const unionNortheast = !unionNorthern && isGettysburgInfantryUnionNortheastActionClip(clip);
  if (!unionNorthern && !unionNortheast) {
    if (isGettysburgInfantryReverseDiagonalContactClip(clip)) return validateGettysburgInfantryReverseDiagonalContactClip(clip);
    if (isGettysburgInfantryDiagonalContactClip(clip)) return validateGettysburgInfantryDiagonalContactClip(clip);
    if (isGettysburgInfantryReverseLateralContactClip(clip)) return validateGettysburgInfantryReverseLateralContactClip(clip);
    if (isGettysburgInfantryReverseCardinalContactClip(clip)) return validateGettysburgInfantryReverseCardinalContactClip(clip);
    if (isGettysburgInfantryCardinalContactClip(clip)) return validateGettysburgInfantryCardinalContactClip(clip);
    if (isGettysburgInfantryUnionContactClip(clip)) return validateGettysburgInfantryUnionContactClip(clip);
    if (isGettysburgInfantryContactClip(clip)) return validateGettysburgInfantryContactClip(clip);
  }
  const errors = unionNorthern ? validateGettysburgInfantryUnionNorthernActionClip(clip)
    : unionNortheast ? validateGettysburgInfantryUnionNortheastActionClip(clip) : [];
  if (!clip || typeof clip !== 'object') return ['Clip definition is required'];
  if (!SIDES.includes(clip.side)) errors.push('Unknown side');
  if (!IDENTITIES.includes(clip.identity)) errors.push('Unknown identity');
  if (!Number.isInteger(clip.direction) || clip.direction < 0 || clip.direction > 7) errors.push('Invalid direction');
  if (clip.key === NATIVE_RELOAD_KEY && (clip.side !== 'confederate' || clip.identity !== 'a' || clip.direction !== 0
    || !['ready', 'fire', 'reload'].includes(clip.action))) errors.push('Native v18 stationary atlas requires its exact Confederate A east action address');
  const nativeReload = nativeReloadClip(clip);
  if ((clip.nativeReloadSequence !== undefined || (clip.key === NATIVE_RELOAD_KEY && clip.action === 'reload'))
    && !nativeReload) errors.push('Four-stage reload requires the exact native v18 address and sequence marker');
  const count = nativeReload ? 4 : Object.hasOwn(ACTION_FRAMES, clip.action) ? ACTION_FRAMES[clip.action] : 0;
  if (!count) errors.push('Unknown action');
  if (typeof clip.key !== 'string' || !clip.key.trim()) errors.push('Texture key is required');
  if (!Array.isArray(clip.frames) || clip.frames.length !== count
    || Array.from(clip.frames).some(frame => typeof frame !== 'string' || !frame.trim())
    || new Set(clip.frames).size !== count) errors.push('Complete distinct action frames are required');
  const nativeFrames = clip.key !== NATIVE_RELOAD_KEY ? null : clip.action === 'reload' ? NATIVE_RELOAD_FRAMES
    : clip.action === 'ready' ? ['a-ready-0-0'] : clip.action === 'fire' ? ['a-fire-0-0'] : null;
  if (nativeFrames && (!Array.isArray(clip.frames)
    || nativeFrames.some((frame, index) => clip.frames[index] !== frame))) errors.push('Native stationary poses must keep their authored action and order');
  if (typeof clip.sourceHash !== 'string' || !/^[a-f0-9]{64}$/i.test(clip.sourceHash)) errors.push('Source SHA-256 is required');
  if (!Number.isFinite(clip.referenceHeight) || clip.referenceHeight <= 0) errors.push('Positive reference height is required');
  if (!Array.isArray(clip.pivots) || clip.pivots.length !== count
    || Array.from(clip.pivots).some(pivot => !Number.isFinite(pivot?.x) || !Number.isFinite(pivot?.y)
      || pivot.x < 0 || pivot.x > 1 || pivot.y < 0 || pivot.y > 1)) errors.push('Normalized pivots are required for every frame');
  // Optional artwork anchor for smoke/flash placement, not ballistics.
  if (clip.muzzles !== undefined && (!Array.isArray(clip.muzzles) || clip.muzzles.length !== count
    || Array.from(clip.muzzles).some(muzzle => !Number.isFinite(muzzle?.x) || !Number.isFinite(muzzle?.y)
      || muzzle.x < 0 || muzzle.x > 1 || muzzle.y < 0 || muzzle.y > 1))) errors.push('Muzzles must contain one normalized point per frame');
  if (clip.approval?.reviewed !== true || clip.approval?.rejected !== false) errors.push('Explicit reviewed approval is required');
  return errors;
}

const address = clip => JSON.stringify([clip.side, clip.identity, clip.direction, clip.action]);

// Call once after atlas load with hasFrame(textureKey, frameName). A missing
// phase withholds the entire clip, so rendering never mixes candidate and
// accepted artwork within one cycle. Copies prevent later registry mutation
// from changing the prepared animation or its recorded approval.
export function prepareGettysburgInfantryClips(definitions, hasFrame) {
  if (!Array.isArray(definitions) || typeof hasFrame !== 'function') return Object.freeze([]);
  const valid = definitions.filter(clip => validateGettysburgInfantryClip(clip).length === 0);
  const counts = new Map();
  for (const clip of valid) counts.set(address(clip), (counts.get(address(clip)) || 0) + 1);
  return Object.freeze(valid.filter(clip => {
    if (counts.get(address(clip)) !== 1) return false;
    try { return clip.frames.every(frame => hasFrame(clip.key, frame) === true); }
    catch { return false; }
  }).map(clip => Object.freeze({
    ...clip,
    ready: true,
    frames: Object.freeze([...clip.frames]),
    pivots: Object.freeze(clip.pivots.map(pivot => Object.freeze({ x: pivot.x, y: pivot.y }))),
    ...(clip.muzzles ? { muzzles: Object.freeze(clip.muzzles.map(muzzle => Object.freeze({ x: muzzle.x, y: muzzle.y }))) } : {}),
    approval: Object.freeze({ reviewed: true, rejected: false }),
  })));
}

// Travel/reload progress supplies figure.frame. Render time cannot advance a
// phase. frozenAction names the clip action in pose.page; figure aliases also
// work. Omitting it preserves the v3 caller's existing frozen-phase behavior.
// These narrow pilots may explicitly select identity a; absent that option it
// retains stable A/B identity selection and never substitutes A for missing B.
// The scene's versioned policy keeps explicit A for v3-v6 and enables the
// stable Union hash for v7/v8; Confederate remains explicit A. Missing
// B never substitutes another identity. V7 additionally permits reviewed S/N
// clips with exact side/direction addresses. V5/v6 stay E/SE and V3/v4 E-only;
// V8 adds SW. Unsupported directions never borrow another view.
export function gettysburgInfantryClipPose(formationId, figure, _time, {
  side,
  scenarioId,
  search = '',
  clips = [],
  identity,
  versionedIdentity = false,
  reducedMotion = false,
  paused = false,
  resolving = false,
  frozenPhase,
  frozenAction,
  shootingAge,
  reloadProgress,
} = {}) {
  const policy = gettysburgInfantryClipPolicy(scenarioId, search);
  if (figure && ['melee', 'fall'].includes(figure.action)) {
    const unionB = gettysburgInfantryUnionBContactClipPose(formationId, figure,
      { side, policy, clips, identity, versionedIdentity, reducedMotion });
    if (unionB) return unionB;
    const northwestSoutheast = gettysburgInfantryNorthwestSoutheastContactClipPose(formationId, figure,
      { side, policy, clips, identity, versionedIdentity, reducedMotion });
    if (northwestSoutheast) return northwestSoutheast;
    const southeastNorthwest = gettysburgInfantrySoutheastNorthwestContactClipPose(formationId, figure,
      { side, policy, clips, identity, versionedIdentity, reducedMotion });
    if (southeastNorthwest) return southeastNorthwest;
    const reverseDiagonal = gettysburgInfantryReverseDiagonalContactClipPose(formationId, figure,
      { side, policy, clips, identity, versionedIdentity, reducedMotion });
    if (reverseDiagonal) return reverseDiagonal;
    const diagonal = gettysburgInfantryDiagonalContactClipPose(formationId, figure,
      { side, policy, clips, identity, versionedIdentity, reducedMotion });
    if (diagonal) return diagonal;
    const reverseLateral = gettysburgInfantryReverseLateralContactClipPose(formationId, figure,
      { side, policy, clips, identity, versionedIdentity, reducedMotion });
    if (reverseLateral) return reverseLateral;
    const reverseCardinal = gettysburgInfantryReverseCardinalContactClipPose(formationId, figure,
      { side, policy, clips, identity, versionedIdentity, reducedMotion });
    if (reverseCardinal) return reverseCardinal;
    const cardinal = gettysburgInfantryCardinalContactClipPose(formationId, figure,
      { side, policy, clips, identity, versionedIdentity, reducedMotion });
    if (cardinal) return cardinal;
  }
  if (side === 'union' && figure && ['melee', 'fall'].includes(figure.action)) return gettysburgInfantryUnionContactClipPose(formationId, figure,
    { side, policy, clips, identity, versionedIdentity, reducedMotion });
  if (figure && ['melee', 'fall'].includes(figure.action)) return gettysburgInfantryContactClipPose(formationId, figure,
    { side, policy, clips, identity, versionedIdentity, reducedMotion });
  if (!policy || !SIDES.includes(side)
    || !figure || figure.fallen || !Array.isArray(clips)) return null;
  if (!policy.directions.includes(figure.direction)) return null;
  const action = Object.hasOwn(FIGURE_ACTIONS, figure.action) ? FIGURE_ACTIONS[figure.action] : null;
  if (!action) return null;
  const chosenIdentity = versionedIdentity === true && policy.stableUnionIdentity
    ? side === 'union' ? gettysburgInfantryIdentity(formationId, figure.id) : 'a'
    : identity === undefined ? gettysburgInfantryIdentity(formationId, figure.id) : identity;
  if (!IDENTITIES.includes(chosenIdentity)) return null;
  const clip = clips.find(value => value?.ready === true && value.side === side
    && value.identity === chosenIdentity && value.direction === figure.direction && value.action === action);
  if (!clip || clip.approval?.reviewed !== true || clip.approval?.rejected !== false) return null;
  if (isGettysburgInfantryUnionNorthernActionClip(clip) && (policy.nativeUnionNorthernActions !== true
    || validateGettysburgInfantryClip(clip).length
    || clips.filter(value => value?.ready === true && value.side === side && value.identity === chosenIdentity
      && value.direction === figure.direction && value.action === action).length !== 1)) return null;
  if (isGettysburgInfantryUnionNortheastActionClip(clip) && (policy.nativeUnionNortheastActions !== true
    || validateGettysburgInfantryClip(clip).length
    || clips.filter(value => value?.ready === true && value.side === side && value.identity === chosenIdentity
      && value.direction === figure.direction && value.action === action).length !== 1)) return null;
  // Prepared definitions validate every phase together. Only the explicitly
  // selected v18 pilot can use its four-stage loading sequence; earlier passes
  // cannot borrow it, and every other bearing retains the v17 two-stage drill.
  const nativeReload = nativeReloadClip(clip);
  if (clip.key === NATIVE_RELOAD_KEY && policy.nativeReloadSequence !== true) return null;
  if (nativeReload && (clip.frames.length !== 4 || clip.pivots.length !== 4)) return null;
  const count = nativeReload ? clip.frames.length : ACTION_FRAMES[action];
  const fixedPhase = action === 'march' ? gettysburgInfantryContactPhase(formationId, figure.id) : 0;
  const frame = Number.isFinite(figure.frame) ? Math.floor(figure.frame) : 0;
  const frozenClipAction = Object.hasOwn(FIGURE_ACTIONS, frozenAction) ? FIGURE_ACTIONS[frozenAction] : frozenAction;
  const validFrozen = (frozenAction === undefined || frozenClipAction === action)
    && Number.isInteger(frozenPhase) && frozenPhase >= 0 && frozenPhase < count;
  const orderedReload = action === 'reload' && policy.monotonicReload === true;
  const reloadPhase = Number.isFinite(reloadProgress)
    ? Math.min(count - 1, Math.floor(Math.max(0, Math.min(1, reloadProgress)) * count)) : 0;
  const livePhase = action === 'march' ? phaseIndex(frame + fixedPhase, count)
    : action === 'reload' ? orderedReload ? reloadPhase : phaseIndex(Math.floor(frame / 2), count) : 0;
  const phase = count === 1 ? 0 : reducedMotion ? fixedPhase
    : paused || resolving ? (validFrozen ? frozenPhase : orderedReload ? livePhase : fixedPhase) : livePhase;
  const scale = 0.95 + deterministicUnitValue(formationId, figure.id, 215) * 0.10;
  const tintSeed = deterministicUnitValue(formationId, figure.id, 211);
  return {
    identity: chosenIdentity,
    page: action,
    key: clip.key,
    direction: figure.direction,
    phase,
    frame: clip.frames[phase],
    sourceHash: clip.sourceHash,
    referenceHeight: clip.referenceHeight,
    pivot: clip.pivots[phase],
    muzzle: clip.muzzles?.[phase],
    width: scale,
    height: scale,
    tint: [0xfff8ef, 0xf3f1e9, 0xddd6c9, 0xf0dec0][Math.floor(tintSeed * 4) % 4],
    flip: false,
    axialAim: false,
    useLegacyRearAim: false,
    angle: 0,
    offsetX: 0,
    offsetY: 0,
    ...(policy.shotMotion ? { shotMotion: true,
      ...gettysburgInfantryShotMotion(figure, { shootingAge, reducedMotion, resolving }) } : {}),
  };
}
