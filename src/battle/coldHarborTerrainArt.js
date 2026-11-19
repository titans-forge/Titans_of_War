export const COLD_HARBOR_LANDMARK_ART = Object.freeze({
  'garthright-house': {
    src: 'images/battles/landmarks-cold-harbor-v1/garthright-house.webp',
    labelOffsetY: -96,
  },
});

export function coldHarborTerrainArtEnabled(scenarioId, rules, search = '') {
  if (scenarioId !== 'cold_harbor' || !(rules >= 18)) return false;
  return !new URLSearchParams(search).getAll('artPass').includes('cold-harbor-landmarks-classic');
}
