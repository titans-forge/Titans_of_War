export const BURNT_QUARTER = Object.freeze({
  id: 'burnt-quarter',
  name: 'Burnt Quarter · Gilliam House',
  x: 485, y: 548, width: 168, height: 95, labelOffsetY: -72,
  src: 'images/battles/landmarks-five-forks-v1/burnt-quarter.webp',
  scenic: true,
  note: 'The Gilliam family’s house stood southwest of the crossroads. It served as a Union headquarters and a military hospital during the battle. This is an illustrative reconstruction with compressed placement.',
  source: 'https://www.nps.gov/articles/burntquar.htm',
});

export const FIVE_FORKS_ROAD_SOURCE = 'https://www.nps.gov/places/the-intersection-five-forks.htm';

export function fiveForksSites(field) {
  const road = field?.zones.find(zone => zone.kind === 'road' && /White Oak/i.test(zone.name));
  if (!road) return [];
  return [BURNT_QUARTER, {
    id: 'white-oak-road',
    name: 'White Oak Road',
    x: road.right * .55,
    y: (road.top + road.bottom) / 2,
    width: 170,
    height: road.bottom - road.top,
    labelOffsetY: 24,
    scenic: true,
    note: 'White Oak Road met Ford’s Road, the road to Dinwiddie Court House and Scott’s Road at Five Forks.',
    source: FIVE_FORKS_ROAD_SOURCE,
  }];
}
