export const WINCHESTER_LANDMARK_ART = Object.freeze({
  hackwood: {
    src: 'images/battles/landmarks-winchester-v1/hackwood.webp',
    labelOffsetY: -105,
    shortViewCameraLift: 25,
  },
});

export const WINCHESTER_CORRIDOR_LOCATION = 'Exit:1';
export const WINCHESTER_CORRIDOR_LABEL_GAP = 26;

export function winchesterLandmarkArtEnabled(scenarioId, rules, search = '') {
  if (scenarioId !== 'third_winchester' || !(rules >= 18)) return false;
  return !new URLSearchParams(search).getAll('artPass').includes('winchester-landmarks-classic');
}
