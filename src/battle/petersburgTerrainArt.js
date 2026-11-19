export const BLANDFORD_CHURCH = Object.freeze({
  id: 'blandford-church',
  name: 'Blandford Church',
  src: 'images/battles/landmarks-petersburg-v1/blandford-church.webp',
  x: 220,
  y: 828,
  width: 185,
  height: 134,
  labelOffsetY: -102,
  scenic: true,
});

export function petersburgTerrainArtEnabled(scenarioId, rules, search = '') {
  if (scenarioId !== 'petersburg' || !(rules >= 18)) return false;
  return !new URLSearchParams(search).getAll('artPass').includes('petersburg-landmarks-classic');
}
