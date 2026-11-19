const CAMPAIGN_SOURCE = 'https://www.nps.gov/parkhistory/online_books/chch/hrs/chapter1.pdf';
const ORCHARD_KNOB_SOURCE = 'https://www.nps.gov/places/orchardknob.htm';

export const BRAGG_HEADQUARTERS = Object.freeze({
  id: 'bragg-headquarters', kind: 'Landmark', name: 'Bragg’s Headquarters Site',
  x: 1080, y: 225, width: 128, height: 100, labelOffsetX: 55, labelOffsetY: -55, scenic: true,
  src: 'images/battles/landmarks-missionary-ridge-v1/bragg-headquarters.webp',
  note: 'Bragg directed the defense from this part of the ridge. An 1863 account mentions a house here. Its exact appearance is undocumented, and the pictured house is a game illustration.',
  source: 'https://irma.nps.gov/DataStore/Reference/Profile/2195946',
});

export function missionaryRidgeSites(field) {
  const orchard = field?.zones.find(zone => zone.name === 'Orchard Knob');
  const slope = field?.zones.find(zone => zone.name === 'Western Slope');
  const road = field?.zones.find(zone => zone.name === 'Dalton Road');
  if (!orchard || !slope || !road) return [];
  return [
    BRAGG_HEADQUARTERS,
    {
      id: 'orchard-knob', kind: 'Terrain', name: 'Orchard Knob', scenic: true,
      x: (orchard.left + orchard.right) / 2, y: (orchard.top + orchard.bottom) / 2,
      width: 170, height: 140, labelOffsetY: 95,
      note: 'The hill west of the ridge became Grant’s observation post. Union troops took the knob on November 23 and strengthened the rifle pits before the attack two days later.',
      source: ORCHARD_KNOB_SOURCE,
    },
    {
      id: 'western-slope', kind: 'Terrain', name: 'Western Slope', scenic: true,
      x: (slope.left + slope.right) / 2, y: (slope.top + slope.bottom) / 2,
      width: 180, height: 195, labelOffsetY: 112,
      note: 'The ridge rises steeply east of the lower rifle pits. Folds in the ground sheltered many of the attacking Union formations during the climb.',
      source: CAMPAIGN_SOURCE,
    },
    {
      id: 'dalton-road', kind: 'Terrain', name: 'Dalton Road', scenic: true, showMapLabel: false,
      x: (road.left + road.right) / 2, y: (road.top + road.bottom) / 2,
      width: 144, height: 96, labelOffsetY: 47,
      note: 'The eastern track represents the retreat toward Chickamauga Station and eventually north Georgia. Its exact course is compressed for play.',
      source: CAMPAIGN_SOURCE,
    },
  ];
}
