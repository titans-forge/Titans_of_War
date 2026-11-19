const BATTLE_SOURCE = 'https://npgallery.nps.gov/NRHP/GetAsset/NHLS/85002436_text';

const centerX = zone => (zone.left + zone.right) / 2;
const centerY = zone => (zone.top + zone.bottom) / 2;

export const HILLSMAN_HOUSE = Object.freeze({
  id: 'hillsman-house', kind: 'Landmark', name: 'Overton–Hillsman House', scenic: true,
  x: 1140, y: 207, width: 166, height: 112, labelOffsetY: 65, labelOffsetX: 62, focusLabelOffsetX: 0,
  src: 'images/battles/landmarks-sailors-creek-v1/hillsman-house.webp',
  note: 'The Union VI Corps used this farmhouse and its grounds as a field hospital. Medical staff treated wounded men from both armies.',
  source: 'https://www.dcr.virginia.gov/state-parks/sailors-creek',
});

export function sailorsGroundZones(field) {
  const find = name => field?.zones.find(zone => zone.name === name);
  const creek = find('Little Sailor’s Creek');
  const floodplain = find('North Bank Floodplain');
  const heights = find('South Bank Heights');
  const road = find('West Road');
  const woods = find('South Woods');
  const staging = find('Aid Staging');
  return creek && floodplain && heights && road && woods && staging ? { creek, floodplain, heights, road, woods, staging } : null;
}

export function sailorsCreekY(creek, x) {
  return centerY(creek) + 10 * Math.sin(x / 159 + .3) + 7 * Math.sin(x / 74 + .72);
}

export function sailorsCreekHalfWidth(x) {
  return 17 + 3.6 * Math.sin(x / 173 + 1.6) + 2.9 * Math.sin(x / 57) + 1.2 * Math.cos(x / 19);
}

export function sailorsRoadY(road, x) {
  const u = x / road.right;
  return centerY(road) - 12 + 21 * Math.sin(u * Math.PI) - 25 * u * u;
}

export function sailorsSites(field) {
  const zones = sailorsGroundZones(field);
  if (!zones) return [];
  const { creek, heights, road } = zones;
  const crossingX = 486, roadX = 413;
  return [
    HILLSMAN_HOUSE,
    {
      id: 'little-sailors-creek', kind: 'Terrain', name: 'Little Sailor’s Creek', scenic: true,
      x: crossingX, y: sailorsCreekY(creek, crossingX), width: 208, height: 120,
      labelOffsetX: -36, labelOffsetY: -50, focusLabelOffsetX: -39,
      note: 'Recent rain swelled the creek and soaked the flat north bank. The Union VI Corps crossed here and re-formed below the Confederate position.',
      source: BATTLE_SOURCE,
    },
    {
      id: 'south-bank-heights', kind: 'Terrain', name: 'South Bank Heights', scenic: true,
      x: centerX(heights), y: centerY(heights) + 34, width: 272, height: 156,
      labelOffsetX: 21, labelOffsetY: 49, focusLabelOffsetX: 43,
      note: 'Confederate troops lined the heights across the creek. The open face below their line gave way to woods along the crest and beyond.',
      source: BATTLE_SOURCE,
    },
    {
      id: 'west-road', kind: 'Terrain', name: 'West Road', scenic: true,
      x: roadX, y: sailorsRoadY(road, roadX), width: 183, height: 108,
      labelOffsetX: 81, labelOffsetY: 60, focusLabelOffsetX: -34,
      note: 'Confederate columns marched toward Rice’s Station. The short west road on this board represents a possible local route within the game.',
      source: BATTLE_SOURCE,
    },
  ];
}
