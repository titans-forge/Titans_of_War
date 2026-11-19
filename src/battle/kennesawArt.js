const CHEATHAM_HILL_SOURCE = 'https://irma.nps.gov/DataStore/Reference/Profile/2229913';

export const KOLB_FARMHOUSE = Object.freeze({
  id: 'kolb-farmhouse', kind: 'Landmark', name: 'Kolb Farmhouse',
  x: 410, y: 742, width: 156, height: 104, labelOffsetY: 68, scenic: true,
  src: 'images/battles/landmarks-kennesaw-v1/kolb-farmhouse.webp',
  note: 'The surviving farmhouse stands farther south. Fighting took place at the farm on June 22, five days before the assault at Cheatham Hill. The map brings the two places closer together.',
  source: 'https://www.nps.gov/places/kolb-farmhouse.htm',
});

export function kennesawGroundZones(field) {
  const find = name => field?.zones.find(zone => zone.name === name);
  const works = find('Dead Angle Works');
  const hill = find('Cheatham Hill');
  const ravine = find('Wooded Ravine');
  const road = find('Southern Road');
  return works && hill && ravine && road ? { works, hill, ravine, road } : null;
}

export function kennesawWorksPath({ works }) {
  const width = works.right - works.left;
  const height = works.bottom - works.top;
  return [
    [1.08, -.11], [.93, -.04], [.77, .04], [.60, .13], [.39, .27], [.11, .48],
    [.27, .63], [.43, .72], [.63, .84], [.80, .92], [1.03, 1.02], [1.16, 1.07],
  ].map(([u, v]) => ({ x: works.left + u * width, y: works.top + v * height }));
}

export function kennesawSites(field) {
  const zones = kennesawGroundZones(field);
  if (!zones) return [];
  const { road, ravine } = zones;
  const angle = kennesawWorksPath(zones)[5];
  return [
    KOLB_FARMHOUSE,
    {
      id: 'dead-angle', kind: 'Terrain', name: 'Dead Angle', scenic: true,
      ...angle, width: 146, height: 138, labelOffsetX: 145, labelOffsetY: -45, focusLabelOffsetX: -95,
      note: 'A bend in the Confederate earthworks projected toward the approaching Union troops. On June 27 the line held, and some Union soldiers dug in below the works.',
      source: 'https://www.nps.gov/places/the-dead-angle.htm',
    },
    {
      id: 'wooded-ravine', kind: 'Terrain', name: 'Wooded Ravine', scenic: true,
      x: (ravine.left + ravine.right) / 2, y: (ravine.top + ravine.bottom) / 2,
      width: 156, height: 154, labelOffsetX: -22, labelOffsetY: 50,
      note: 'Wooded gullies and rolling hills broke up the ground around Cheatham Hill. The ravine and exposed approach mark a change in elevation.',
      source: CHEATHAM_HILL_SOURCE,
    },
    {
      id: 'southern-road', kind: 'Terrain', name: 'Southern Road', scenic: true, showMapLabel: false,
      x: (road.left + road.right) / 2, y: (road.top + road.bottom) / 2,
      width: 134, height: 160, labelOffsetY: 36,
      note: 'The dirt road gives this scenario a southern approach and exit. Its location and bends are compressed for play.',
      source: CHEATHAM_HILL_SOURCE,
    },
  ];
}
