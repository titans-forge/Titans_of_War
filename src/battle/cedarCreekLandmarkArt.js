export const CEDAR_CREEK_LANDMARK_ART = Object.freeze({
  'belle-grove': {
    src: 'images/battles/landmarks-cedar-creek-v1/belle-grove.webp',
    labelOffsetY: -96,
  },
  'heater-house': {
    src: 'images/battles/landmarks-cedar-creek-v1/heater-house.webp',
    labelOffsetY: -102,
  },
});

export function cedarCreekLandmarkArtEnabled(scenarioId, rules, search = '') {
  if (scenarioId !== 'cedar_creek' || !(rules >= 18)) return false;
  return !new URLSearchParams(search).getAll('artPass').includes('cedar-creek-landmarks-classic');
}
