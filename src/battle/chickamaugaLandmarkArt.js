export const CHICKAMAUGA_LANDMARK_ART = Object.freeze({
  'snodgrass-house': {
    src: 'images/battles/landmarks-chickamauga-v1/snodgrass-house.webp',
    labelOffsetY: -94,
    shortViewCameraLift: 28,
  },
  'brotherton-cabin': {
    src: 'images/battles/landmarks-chickamauga-v1/brotherton-cabin.webp',
    labelOffsetY: 61,
  },
});

export function chickamaugaLandmarkArtEnabled(scenarioId, rules, search = '') {
  if (scenarioId !== 'chickamauga' || !(rules >= 18)) return false;
  return !new URLSearchParams(search).getAll('artPass').includes('chickamauga-landmarks-classic');
}
