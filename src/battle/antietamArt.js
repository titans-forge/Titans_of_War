export const DUNKER_CHURCH = Object.freeze({
  id: 'dunker-church', name: 'Dunker Church', minimumRules: 18,
  x: 167, y: 497, width: 88, height: 58, artWidth: 146, artHeight: 120,
  labelOffsetY: -82,
  src: 'images/battles/landmarks-antietam-v1/dunker-church.webp',
  note: 'The small, whitewashed brick Dunker Church served as a landmark near the West Woods during the morning fighting. This reconstruction follows Alexander Gardner’s September 1862 photographs.',
  source: 'https://www.nps.gov/anti/learn/historyculture/dunkerchurch.htm',
});

export const ANTIETAM_BRIDGE = Object.freeze({
  id: 'lower-bridge', name: 'Lower Bridge',
  src: 'images/battles/landmarks-antietam-v1/lower-bridge.webp',
  width: 91, height: 137, labelOffsetY: -91,
});

export function antietamBridgeLocation(field) {
  const crossing = field?.zones.find(zone => zone.name === 'Lower Bridge crossing');
  if (!crossing) return null;
  return {
    ...ANTIETAM_BRIDGE, x: (crossing.left + crossing.right) / 2,
    y: (crossing.top + crossing.bottom) / 2, scenic: true,
  };
}
