import { gettysburgInfantryClipPose } from './gettysburgInfantryClips.js';

// Renderer-owned, short-lived volley geometry. Never enters combat revival.
const LIFETIME = 1.25;
const MAX_FORMATIONS = 32;
const MAX_CAPACITY = 32;
const MAX_FIGURES = 700;
const bounded = value => Number.isFinite(value) && Math.abs(value) <= 1e7;
const nonnegative = value => bounded(value) && value >= 0;
const plain = value => value !== null && typeof value === 'object'
  && [Object.prototype, null].includes(Object.getPrototypeOf(value))
  && !Object.hasOwn(value, '$fieldMap') && !Object.hasOwn(value, '$fieldSet');
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 128;
const capacityOK = value => Number.isInteger(value) && value > 0 && value <= MAX_CAPACITY;
const shotArtPassOK = value => value === 'gettysburg-v12' || value === 'gettysburg-v13' || value === 'gettysburg-v14' || value === 'gettysburg-v15' || value === 'gettysburg-v16' || value === 'gettysburg-v17' || value === 'gettysburg-v18';

function identity(formation) {
  const { id, side, type, strength, initialStrength, x, y, facing, frontage, formationMode, status, active, lastVolleyAt } = formation;
  if (!text(id) || !['union', 'confederate'].includes(side) || type !== 'infantry'
    || ![strength, initialStrength, frontage, lastVolleyAt].every(nonnegative)
    || ![x, y, facing].every(bounded) || !['line', 'column', 'deep', 'skirmish'].includes(formationMode)
    || !text(status) || typeof active !== 'boolean') return null;
  let footprint = null;
  if (formation.footprint != null) {
    if (!plain(formation.footprint) || !nonnegative(formation.footprint.width) || !nonnegative(formation.footprint.depth)) return null;
    footprint = { width: formation.footprint.width, depth: formation.footprint.depth };
  }
  return { id, side, type, strength, initialStrength, x, y, facing, frontage, formationMode, status, active, lastVolleyAt, footprint };
}
function sameIdentity(saved, formation) {
  const current = identity(formation);
  return plain(saved) && current && Object.entries(current).every(([key, value]) => key === 'footprint'
    ? value === null ? saved[key] === null : plain(saved[key]) && saved[key].width === value.width && saved[key].depth === value.depth
    : saved[key] === value);
}
function readVolley(value, capacity, lastVolleyAt, time) {
  if (!plain(value) || value.at !== lastVolleyAt || !nonnegative(value.at)
    || !nonnegative(value.capturedAt) || value.capturedAt < value.at || value.capturedAt > time
    || time < value.at || time - value.at >= LIFETIME || !Array.isArray(value.figures)
    || value.figures.length > capacity) return null;
  const ids = new Set();
  const figures = [];
  for (const figure of value.figures) {
    if (!plain(figure) || !Number.isInteger(figure.id) || figure.id < 0 || figure.id >= capacity || ids.has(figure.id)
      || ![figure.x, figure.y, figure.bearing].every(bounded) || !nonnegative(figure.scale) || figure.scale === 0
      || figure.scale > 4 || typeof figure.native !== 'boolean') return null;
    ids.add(figure.id);
    figures.push({ id: figure.id, x: figure.x, y: figure.y, bearing: figure.bearing, scale: figure.scale, native: figure.native });
  }
  return { at: value.at, capturedAt: value.capturedAt, figures };
}

/** Sample once per observed volley. Existing geometry and membership stay fixed.
 * If historical data is missing, the current neutral pose is an approximation;
 * lastVolleyAt alone cannot reconstruct soldiers' earlier world positions.
 */
export function sampleGettysburgInfantryVolley(previous, formation, visual, time, { scenarioId, search, clips, textures, scale }) {
  const age = time - formation.lastVolleyAt;
  if (formation.type !== 'infantry' || !formation.active || !nonnegative(formation.lastVolleyAt)
    || !nonnegative(time) || age < 0 || age >= LIFETIME) return null;
  if (previous?.at === formation.lastVolleyAt) return previous;
  const figures = [];
  for (const figure of visual.figures) {
    if (!figure.visible || figure.fallen || !figure.frontRank) continue;
    const pose = gettysburgInfantryClipPose(formation.id, { ...figure, action: 'fire', frame: 0 }, time,
      { side: formation.side, scenarioId, search, clips, identity: 'a', versionedIdentity: true, reducedMotion: true });
    const frame = pose?.shotMotion && pose.muzzle && textures.get(pose.key)?.get(pose.frame);
    let x, y, bearing;
    if (frame) {
      const unitScale = 58 * figure.scale / pose.referenceHeight;
      x = figure.x + (pose.muzzle.x - pose.pivot.x) * frame.realWidth * unitScale * pose.width;
      y = figure.y + (pose.muzzle.y - pose.pivot.y) * frame.realHeight * unitScale * pose.height;
      bearing = pose.direction * Math.PI / 4;
    } else {
      // Unsupported native bearings keep the accepted fallback barrel estimate.
      bearing = visual.facing;
      x = figure.x + Math.cos(bearing) * 15 * scale;
      y = figure.y - 24 * scale + Math.sin(bearing) * 10 * scale;
    }
    figures.push({ id: figure.id, x, y, bearing, scale, native: Boolean(frame) });
  }
  return { at: formation.lastVolleyAt, capturedAt: time, figures };
}

export function createGettysburgInfantryShotCheckpoint(formations, views, time, artPass = 'gettysburg-v12') {
  if (!shotArtPassOK(artPass) || !Array.isArray(formations) || formations.length > MAX_FORMATIONS || !(views instanceof Map) || !nonnegative(time)) return null;
  const records = [], ids = new Set();
  let figures = 0;
  for (const formation of formations) {
    const view = views.get(formation.id), savedIdentity = identity(formation);
    if (!savedIdentity || !view?.shots || !capacityOK(view.capacity)) continue;
    const volley = readVolley(view.shots, view.capacity, formation.lastVolleyAt, time);
    if (!volley) continue;
    if (ids.has(formation.id)) return null;
    ids.add(formation.id); figures += volley.figures.length;
    if (figures > MAX_FIGURES) return null;
    records.push({ id: formation.id, capacity: view.capacity, formation: savedIdentity, volley });
  }
  return { version: 1, artPass, time, formations: records };
}

/** Fail soft: bad optional shots neither reject combat nor other visual data. */
export function restoreGettysburgInfantryShots(formation, capacity, time, presentation, artPass = 'gettysburg-v12') {
  const checkpoint = presentation?.shots;
  if (!shotArtPassOK(artPass) || !plain(presentation) || presentation.version !== 1 || presentation.time !== time
    || !plain(checkpoint) || checkpoint.version !== 1 || checkpoint.artPass !== artPass
    || checkpoint.time !== time || !nonnegative(time) || !capacityOK(capacity)
    || !Array.isArray(checkpoint.formations) || checkpoint.formations.length > MAX_FORMATIONS) return null;
  const ids = new Set(); let figures = 0; let matching = null;
  for (const record of checkpoint.formations) {
    if (!plain(record) || !text(record.id) || ids.has(record.id) || !capacityOK(record.capacity)
      || !plain(record.formation) || record.formation.id !== record.id || !identity(record.formation)) return null;
    ids.add(record.id);
    const volley = readVolley(record.volley, record.capacity, record.formation.lastVolleyAt, time);
    if (!volley) return null;
    figures += volley.figures.length;
    if (figures > MAX_FIGURES) return null;
    if (record.id === formation.id && record.capacity === capacity && sameIdentity(record.formation, formation)) matching = volley;
  }
  return matching;
}
