import { realisticInfantryPose } from './realisticUnitVisual.js';

export const DETAILED_UNIT_PAGES = Object.freeze(['ready', 'walk', 'aim', 'crew']);
export const GETTYSBURG_ART_PASS_ID = 'gettysburg-v1';

// Candidate art is deliberately opt-in while it is judged at gameplay scale.
// Only Gettysburg's ready page changes; every action page and every other board
// continues to use the accepted detailed-v2 set. Removing the query parameter
// is therefore a complete visual rollback.
export function detailedUnitAssetDirectory(scenarioId, page, search = '') {
  const requested = new URLSearchParams(search).get('artPass');
  return scenarioId === 'gettysburg' && page === 'ready' && requested === GETTYSBURG_ART_PASS_ID
    ? GETTYSBURG_ART_PASS_ID
    : 'detailed-v2';
}

// A one-time texture compositor for the native chroma-backed generated sheets.
// This runs at scene creation, never in the animation loop. Neutral cloth, skin,
// wood and metal are retained; only excess green is keyed and edge spill removed.
export function compositeUnitChroma(pixels) {
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const excess = g - Math.max(r, b);
    if (excess <= 18) continue;
    const t = Math.max(0, Math.min(1, (excess - 18) / 82));
    pixels[i + 3] = Math.round(pixels[i + 3] * (1 - t * t * (3 - 2 * t)));
    pixels[i + 1] = Math.min(g, Math.max(r, b));
  }
  return pixels;
}

export function createDetailedUnitTextures(scene) {
  for (const side of ['union', 'confederate']) for (const page of DETAILED_UNIT_PAGES) {
    const key = `${side}-detailed-${page}`;
    if (!scene.textures.exists(`${key}-source`)) continue;
    const source = scene.textures.get(`${key}-source`)?.getSourceImage();
    const atlas = scene.cache.json.get(key);
    if (!source || !atlas) continue;
    const canvas = document.createElement('canvas');
    canvas.width = source.width; canvas.height = source.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(source, 0, 0);
    const buffer = context.getImageData(0, 0, canvas.width, canvas.height);
    compositeUnitChroma(buffer.data);
    context.putImageData(buffer, 0, 0);
    scene.textures.addAtlas(key, canvas, atlas);
    scene.textures.remove(`${key}-source`);
  }
}

export function detailedInfantryPose(formationId, figure, time, reducedMotion = false, resolving = false) {
  const pose = realisticInfantryPose(formationId, figure, time, reducedMotion, resolving);
  const walking = ['walk', 'route'].includes(figure.action) && !reducedMotion && !resolving;
  const firing = ['fire', 'melee'].includes(figure.action);
  let direction = figure.direction;
  let flip = false;
  let page = firing ? 'aim' : walking && figure.frame % 2 === 0 ? 'walk' : 'ready';
  if (page === 'walk' && figure.frame === 2) {
    // Opposing views mirrored for the alternate contact, with the ready pose
    // as a passing frame. Limited-frame gait; not skeletal limb animation.
    direction = [4, 3, 2, 1, 0, 7, 6, 5][direction];
    flip = true;
  }
  let frame = String(direction);
  if (firing) {
    frame = String([0, 1, 2, 1, 0, 3, 4, 5][direction]);
    flip = direction === 3 || direction === 4;
  }
  return { ...pose, page, frame, flip, axialAim: false, useLegacyRearAim: firing && direction === 6 };
}

export function detailedCrewFrame(direction, working) {
  // Front/back tool work is foreshortened. The new rear working plate kept
  // its tool sideways, so retain the upright rear pose instead of showing
  // a false ramming direction.
  const view = [0, 1, 1, 1, 0, 2, 2, 2][direction];
  return { frame: String((working && view !== 2 ? 3 : 0) + view), flip: direction === 4 };
}
