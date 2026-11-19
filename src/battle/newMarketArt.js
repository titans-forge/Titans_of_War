const BATTLEFIELD_SOURCE = 'https://history.army.mil/Publications/Publications-Catalog/The-Battle-of-New-Market-Self-Guided-Tour/';
const FIELD_SOURCE = 'https://libguides.vmi.edu/archives-research-guides/New-Market';

export const BUSHONG_HOUSE = Object.freeze({
  id: 'bushong-house', kind: 'Landmark', name: 'Bushong House',
  x: 578, y: 486, width: 138, height: 107, labelOffsetY: 55, scenic: true,
  src: 'images/battles/landmarks-new-market-v1/bushong-house.webp',
  note: 'Three generations of the Bushong family sheltered in the basement while the battle reached their farm. The house and orchard mark the center of this condensed field.',
  source: 'https://www.vmi.edu/museums-and-archives/virginia-museum-of-the-civil-war/visit/index.php',
});

export function newMarketPikeX(road, y) {
  return (road.left + road.right) / 2 + 5 * Math.sin(y / 150) + 2 * Math.sin(y / 63);
}

export function newMarketSites(field) {
  const plots = field?.zones;
  const mud = plots?.find(zone => zone.name === 'Field of Lost Shoes');
  const pike = plots?.find(zone => zone.name === 'Valley Pike');
  const orchard = plots?.find(zone => zone.name === 'Bushong Orchard');
  if (!mud || !pike || !orchard) return [];
  const pikeY = pike.top + (pike.bottom - pike.top) * .49;
  return [
    BUSHONG_HOUSE,
    {
      id: 'field-of-lost-shoes', kind: 'Terrain', name: 'Field of Lost Shoes', scenic: true,
      x: mud.left + (mud.right - mud.left) * .26, y: (mud.top + mud.bottom) / 2,
      width: 164, height: 122, labelOffsetX: -92, labelOffsetY: -28,
      note: 'Rain soaked the freshly plowed soil. Some cadets lost their shoes as they advanced through the mud. The rough plowed field slows formations in this battle.',
      source: FIELD_SOURCE,
    },
    {
      id: 'valley-pike', kind: 'Terrain', name: 'Valley Pike', scenic: true, showMapLabel: false,
      x: newMarketPikeX(pike, pikeY), y: pikeY, width: 100, height: 146, labelOffsetY: 35,
      note: 'The stone-surfaced Valley Pike connected the Shenandoah Valley towns. Here its firm surface lets formations travel faster than through wet plowed ground.',
      source: BATTLEFIELD_SOURCE,
    },
    {
      id: 'bushong-orchard', kind: 'Terrain', name: 'Bushong Orchard', scenic: true,
      x: orchard.left + 34, y: orchard.top + 38, width: 116, height: 102, labelOffsetX: -24, labelOffsetY: 0,
      note: 'This farm orchard was part of the fighting around the house. The tree rows and rail fence are representative of the period landscape.',
      source: BATTLEFIELD_SOURCE,
    },
  ];
}
