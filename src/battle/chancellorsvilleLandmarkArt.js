export const CHANCELLORSVILLE_LANDMARK_ART = Object.freeze({
  'chancellor-house': {
    src: 'images/battles/landmarks-chancellorsville-v1/chancellor-house.webp',
    labelOffsetY: -112,
    minimumLabelRise: 42,
  },
  'catharine-furnace': {
    src: 'images/battles/landmarks-chancellorsville-v1/catharine-furnace.webp',
    labelOffsetY: 73,
  },
});

export function chancellorsvilleLandmarkArtEnabled(scenarioId, rules, search = '') {
  if (scenarioId !== 'chancellorsville' || !(rules >= 18)) return false;
  return !new URLSearchParams(search).getAll('artPass').includes('chancellorsville-landmarks-classic');
}
