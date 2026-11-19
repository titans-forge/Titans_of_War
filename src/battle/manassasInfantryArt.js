const ATLAS_DIRECTORY = 'images/units/manassas-infantry-v1';
const SIDES = ['union', 'confederate'];
// The three westward bearings mirror eastward views around the ground anchor.
const SOURCE_BEARING = [0, 1, 2, 1, 0, 7, 6, 7];
const textureKey = side => `manassas-1861-${side}`;

export function preloadManassasInfantry(loader, base) {
  for (const side of SIDES) {
    const stem = `${base}${ATLAS_DIRECTORY}/${side}`;
    loader.atlas(textureKey(side), `${stem}.webp`, `${stem}.json`);
  }
}

export function manassasInfantryPose(textures, side, figure, { resolving = false, reducedMotion = false } = {}) {
  if (resolving || !SIDES.includes(side) || figure.action !== 'walk' || !figure.visible || figure.fallen
    || !Number.isInteger(figure.frame) || figure.frame < 0 || figure.frame > 3) return null;
  const direction = SOURCE_BEARING[figure.direction];
  if (direction === undefined) return null;
  const key = textureKey(side);
  if (!textures.exists(key)) return null;
  const atlas = textures.get(key);
  const phase = reducedMotion ? 0 : figure.frame;
  const march = `march-${direction}-${phase}`;
  const pivotFrame = `pivot-${direction}`;
  // A turning rank still walks. Add the pivot on one passing phase so the
  // figures plant and turn between contact steps instead of sliding sideways.
  const names = figure.stationaryTurn && phase === 1 ? [pivotFrame, march] : [march];
  for (const frame of names) {
    if (!atlas.has(frame)) continue;
    const data = atlas.get(frame);
    const height = data?.customData?.bodyHeight;
    if (!data?.customPivot || !Number.isFinite(height) || height <= 0 || height > data.realHeight
      || !Number.isFinite(data.pivotX) || data.pivotX <= 0 || data.pivotX >= 1
      || !Number.isFinite(data.pivotY) || data.pivotY <= 0 || data.pivotY >= 1) continue;
    return { key, frame, referenceHeight: height, pivot: { x: data.pivotX, y: data.pivotY }, flip: figure.direction >= 3 && figure.direction <= 5 };
  }
  return null;
}
