const SUNKEN_ROAD_SOURCE = 'https://www.nps.gov/places/the-sunken-road.htm';

export const INNIS_HOUSE = Object.freeze({
  id: 'innis-house', kind: 'Landmark', name: 'Innis House',
  x: 654, y: 347, width: 103, height: 109, labelOffsetY: -59, scenic: true,
  src: 'images/battles/landmarks-fredericksburg-v1/innis-house.webp',
  note: 'John and Ellen Innis lived in this small frame house beside the Sunken Road. It survived the fighting despite heavy damage. The house and its placement are reconstructed for this compressed battlefield.',
  source: 'https://www.nps.gov/places/innis-house.htm',
});

export function fredericksburgSites(field) {
  const zones = field?.zones || [];
  const road = zones.find(zone => zone.name === 'Sunken Road');
  const river = zones.find(zone => zone.name === 'Rappahannock River');
  const heights = zones.find(zone => zone.name === 'Marye’s Heights');
  const prospect = zones.find(zone => zone.name === 'Prospect Hill');
  if (!road || !river || !heights || !prospect) return [];
  const center = zone => (zone.left + zone.right) / 2;
  return [
    INNIS_HOUSE,
    {
      id: 'sunken-road-wall', kind: 'Terrain', name: 'Sunken Road stone wall', scenic: true,
      x: center(road) + 8, y: 245, width: 82, height: 164, labelOffsetY: 4,
      note: 'The stone retaining wall and the lowered road gave Confederate infantry cover from successive assaults. The in-game wall represents a shortened section of the position.',
      source: SUNKEN_ROAD_SOURCE,
    },
    {
      id: 'maryes-heights', kind: 'Terrain', name: 'Marye’s Heights', scenic: true, showMapLabel: false,
      x: center(heights) - 38, y: 167, width: 174, height: 110, labelOffsetY: -41,
      note: 'The ridge rose west of the Sunken Road and overlooked the open approaches between the town and the Confederate position.',
      source: 'https://www.nps.gov/places/maryes-heights.htm',
    },
    {
      id: 'rappahannock-river', kind: 'Terrain', name: 'Rappahannock River', scenic: true,
      x: center(river), y: 213, width: 183, height: 170, labelOffsetY: -25,
      note: 'Union engineers laid pontoon bridges across the river before the fighting on December 13. One representative crossing appears on this condensed map.',
      source: 'https://home.nps.gov/civilwar/search-battles-detail.htm?battleCode=va028',
    },
    {
      id: 'prospect-hill', kind: 'Terrain', name: 'Prospect Hill', scenic: true, showMapLabel: false,
      x: center(prospect) - 35, y: (prospect.top + prospect.bottom) / 2,
      width: 187, height: 154, labelOffsetY: 48,
      note: 'Jackson’s line occupied the wooded slopes at the southern end of the Confederate position. The crest and adjacent rail corridor are condensed into this playable sector.',
      source: 'https://home.nps.gov/places/prospect-hill.htm',
    },
  ];
}
