const WATT_HOUSE_SOURCE = 'https://www.nps.gov/places/gaines-mill-battlefield-united-states-position.htm';
const BATTLEFIELD_SOURCE = 'https://www.nps.gov/rich/learn/historyculture/gainesmillbull.htm';

export const WATT_HOUSE = Object.freeze({
  id: 'watt-house', kind: 'Landmark', name: 'Watt House',
  x: 1180, y: 214, width: 126, height: 101, labelOffsetY: 48, scenic: true,
  src: 'images/battles/landmarks-gaines-mill-v1/watt-house.webp',
  note: 'Fitz John Porter used the Watt House as headquarters. It later served as a field hospital. The house stands on the plateau south of Boatswain’s Creek, which appears above the creek on this south-up battlefield.',
  source: WATT_HOUSE_SOURCE,
});

export function gainesMillCreekBanks(creek, x) {
  const progress = (x - creek.left) / (creek.right - creek.left);
  const center = (creek.top + creek.bottom) / 2
    + 15 * Math.sin(progress * 2.3 * Math.PI + .4)
    + 9 * Math.sin(progress * 6.1 * Math.PI - .6)
    + 3 * Math.sin(progress * 15 * Math.PI);
  const taper = Math.min(1, Math.max(0, Math.min(x - creek.left, creek.right - x) / 55));
  const halfWidth = (7 + 3 * Math.cos(progress * 5 * Math.PI)) * (.13 + .87 * taper);
  return { upper: center - halfWidth, lower: center + halfWidth, center, taper };
}

export function gainesMillSites(field) {
  const creek = field?.zones.find(zone => zone.name === 'Boatswain’s Creek');
  const crossing = field?.zones.find(zone => zone.name === 'Ravine Crossing');
  const lane = field?.zones.find(zone => zone.name === 'Watt Farm Lane');
  if (!creek || !crossing || !lane) return [];
  const creekX = creek.left + (creek.right - creek.left) * .22;
  const crossingX = (crossing.left + crossing.right) / 2;
  const laneX = (lane.left + lane.right) / 2;
  return [
    WATT_HOUSE,
    {
      id: 'boatswains-creek', kind: 'Terrain', name: 'Boatswain’s Creek', scenic: true,
      x: creekX, y: gainesMillCreekBanks(creek, creekX).center, width: 178, height: 120, labelOffsetY: -25,
      note: 'The creek and wooded ravine lay below Porter’s line. The playable map compresses the approaches and makes the creek bed more visible.',
      source: BATTLEFIELD_SOURCE,
    },
    {
      id: 'ravine-crossing', kind: 'Terrain', name: 'Ravine Crossing', scenic: true, showMapLabel: false,
      x: crossingX, y: gainesMillCreekBanks(creek, crossingX).center, width: 125, height: 122, labelOffsetY: 0, route: crossing,
      note: 'A shallow approach through the ravine gives formations room to regroup. This crossing represents the terrain and is positioned for play.',
      source: BATTLEFIELD_SOURCE,
    },
    {
      id: 'watt-farm-lane', kind: 'Terrain', name: 'Watt Farm Lane', scenic: true,
      x: laneX, y: gainesMillCreekBanks(creek, laneX).center, width: 106, height: 126, labelOffsetX: 42, labelOffsetY: -43, route: lane,
      note: 'The track marks a second playable approach up from the ravine toward the Watt farm. Its route is illustrative.',
      source: WATT_HOUSE_SOURCE,
    },
  ];
}
