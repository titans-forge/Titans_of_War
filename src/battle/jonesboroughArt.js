const HISTORIC_DISTRICT = 'https://npgallery.nps.gov/NRHP/GetAsset/NRHP/72000381_text';
const mid = (a, b) => (a + b) / 2;

export const WARREN_HOUSE = Object.freeze({
  id: 'warren-house',
  kind: 'Landmark',
  name: 'Warren House',
  x: 655, y: 540, width: 118, height: 102, labelOffsetY: 68,
  src: 'images/battles/landmarks-jonesborough-v1/warren-house.webp',
  scenic: true,
  note: 'The Warren House served as a headquarters and hospital during the battle. The house and its grounds are reconstructed at a compressed scale.',
  source: HISTORIC_DISTRICT,
});

export function jonesboroughSites(field) {
  const rail = field?.zones.find(zone => zone.name === 'Rail embankment');
  const crossing = field?.zones.find(zone => zone.name === 'Rail crossing');
  const depot = field?.zones.find(zone => zone.name === 'Depot yard');
  const river = field?.zones.find(zone => zone.name === 'Flint River');
  if (!rail || !crossing || !depot || !river) return [];
  return [WARREN_HOUSE, {
    id: 'macon-western-railroad', kind: 'Terrain', name: 'Macon & Western Railroad',
    x: mid(rail.left, rail.right), y: mid(crossing.top, crossing.bottom) - 153,
    width: 124, height: 148, labelOffsetY: -35, scenic: true,
    note: 'The rail line linked Atlanta with Macon. The game compresses the approaches to its crossing and depot site.',
    source: 'https://www.nps.gov/civilwar/search-battles-detail.htm?battleCode=ga022',
  }, {
    id: 'old-depot-site', kind: 'Landmark', name: 'Old depot site',
    x: depot.left + 53, y: depot.top + 59, width: 87, height: 96, labelOffsetY: 56, scenic: true,
    note: 'The original wooden station burned before the battle. These remnants are illustrative. The surviving stone depot dates to 1867.',
    source: HISTORIC_DISTRICT,
  }, {
    id: 'flint-river', kind: 'Terrain', name: 'Flint River',
    x: mid(river.left, river.right), y: river.top + (river.bottom - river.top) * .44,
    width: 114, height: 145, labelOffsetY: -45, scenic: true,
    note: 'Union troops approached Jonesborough from the Flint River. The river and town are closer together on this board.',
    source: 'https://www.loc.gov/item/2006459222/',
  }];
}
