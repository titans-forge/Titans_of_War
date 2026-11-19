export const WILDERNESS_LANDMARK_ART = Object.freeze({
  'widow-tapp-house': {
    src: 'images/battles/landmarks-wilderness-v1/widow-tapp-house.webp',
    labelOffsetY: -98,
    minimumLabelRise: 36,
    shortViewCameraLift: 28,
  },
});

export const WILDERNESS_ROAD_LOCATION = 'Sector:center';
export const WILDERNESS_ROAD_LABEL_OFFSET = 70;

export function wildernessLandmarkArtEnabled(scenarioId, rules, search = '') {
  if (scenarioId !== 'wilderness' || !(rules >= 18)) return false;
  return !new URLSearchParams(search).getAll('artPass').includes('wilderness-landmarks-classic');
}
