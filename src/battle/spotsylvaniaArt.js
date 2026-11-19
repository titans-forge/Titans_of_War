const BATTLEFIELD_SOURCE = 'https://www.nps.gov/frsp/learn/photosmultimedia/spotsylvania-battlefield-tour.htm';

export const MCCOULL_HOUSE = Object.freeze({
  id: 'mccoull-house', kind: 'Landmark', name: 'McCoull House',
  x: 805, y: 455, width: 128, height: 90, labelOffsetX: -26, labelOffsetY: 57, scenic: true,
  src: 'images/battles/landmarks-spotsylvania-v1/mccoull-house.webp',
  note: 'Edward Johnson used the farmhouse as headquarters while members of the McCoull family sheltered in the cellar. The illustration draws on the park’s architectural survey and period photograph.',
  source: 'https://www.nps.gov/places/mccoull-house-site.htm',
});

const center = zone => [(zone.left + zone.right) / 2, (zone.top + zone.bottom) / 2];

export function spotsylvaniaGroundZones(field) {
  const find = name => field?.zones.find(zone => zone.name === name);
  const west = find('West Face Works');
  const apex = find('Salient Apex Works');
  const east = find('East Face Works');
  const interior = find('Interior Line Works');
  const mud = find('Rain-Soaked Fields');
  const lane = find('Harrison Farm Lane');
  const orchard = find('McCoull Orchard');
  return west && apex && east && interior && mud && lane && orchard
    ? { west, apex, east, interior, mud, lane, orchard }
    : null;
}

export function spotsylvaniaAngle(west) {
  return [(west.left + west.right) / 2 - 5, west.top + 23];
}

export function spotsylvaniaSites(field) {
  const zones = spotsylvaniaGroundZones(field);
  if (!zones) return [];
  const [angleX, angleY] = spotsylvaniaAngle(zones.west);
  const [mudX, mudY] = center(zones.mud);
  const [laneX, laneY] = center(zones.lane);
  return [
    MCCOULL_HOUSE,
    {
      id: 'bloody-angle', kind: 'Terrain', name: 'Bloody Angle', scenic: true,
      x: angleX, y: angleY, width: 174, height: 150, labelOffsetX: 185, labelOffsetY: -35,
      focusLabelOffsetX: 126,
      note: 'The Bloody Angle was a bend in the west face of the Mule Shoe. Fighting there continued while a shorter line was prepared across the base of the salient.',
      source: BATTLEFIELD_SOURCE,
    },
    {
      id: 'rain-soaked-fields', kind: 'Terrain', name: 'Rain-Soaked Fields', scenic: true,
      x: mudX, y: mudY, width: 136, height: 205, labelOffsetX: -92, labelOffsetY: 16,
      note: 'The rain soaked the ground during the fighting on May 12. Here, wet fields slow formations approaching the Mule Shoe.',
      source: BATTLEFIELD_SOURCE,
    },
    {
      id: 'harrison-farm-lane', kind: 'Terrain', name: 'Harrison Farm Lane', scenic: true,
      x: laneX, y: laneY + 62, width: 128, height: 152, labelOffsetX: 223, labelOffsetY: 38,
      note: 'The lane leads toward the site of Lee’s shorter line near the Harrison farm. The route is compressed and its bends are illustrative.',
      source: BATTLEFIELD_SOURCE,
    },
  ];
}
