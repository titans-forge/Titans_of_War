const REDOUBT_SOURCE = 'https://www.nps.gov/vick/learn/historyculture/tour-stop-13-railroad-redoubt.htm';
const TERRAIN_SOURCE = 'https://www.nps.gov/vick/learn/management/landscapemgt.htm';
const RAIL_KNOTS = [[0, -42], [220, -32], [595, 2], [900, -29], [1240, -94], [1600, -141]];

const centerX = zone => (zone.left + zone.right) / 2;
const centerY = zone => (zone.top + zone.bottom) / 2;

export const SECOND_TEXAS_LUNETTE = Object.freeze({
  id: 'second-texas-lunette', kind: 'Landmark', name: 'Second Texas Lunette', scenic: true,
  x: 730, y: 210, width: 145, height: 115, labelOffsetX: -125, labelOffsetY: -50, focusLabelOffsetX: -118,
  note: 'This crescent-shaped earthwork guarded Baldwin Ferry Road and came under a separate attack on May 22. The compressed field brings it closer to the Railroad Redoubt.',
  source: 'https://www.nps.gov/places/tour-stop-12-2nd-texas-lunette.htm',
});

export function vicksburgGroundZones(field) {
  const find = name => field?.zones.find(zone => zone.name === name);
  const redoubt = find('Railroad Redoubt Works');
  const breach = find('Southeast Breach');
  const interior = find('Interior Line Works');
  const rail = find('Railroad Ravine');
  const approach = find('East Approach Slope');
  return redoubt && breach && interior && rail && approach ? { redoubt, breach, interior, rail, approach } : null;
}

export function vicksburgRailY(rail, x) {
  const index = Math.max(0, RAIL_KNOTS.findLastIndex(([position]) => position <= x));
  const [x0, y0] = RAIL_KNOTS[Math.min(index, RAIL_KNOTS.length - 2)];
  const [x1, y1] = RAIL_KNOTS[Math.min(index + 1, RAIL_KNOTS.length - 1)];
  const [xp, yp] = RAIL_KNOTS[Math.max(0, index - 1)];
  const [xn, yn] = RAIL_KNOTS[Math.min(index + 2, RAIL_KNOTS.length - 1)];
  const distance = x1 - x0;
  const t = Math.min(1, Math.max(0, (x - x0) / distance));
  // Match the slope across joints so the railway stays continuous around bends.
  const m0 = (y1 - yp) / (x1 - xp) * distance;
  const m1 = (yn - y0) / (xn - x0) * distance;
  const t2 = t * t, t3 = t2 * t;
  return centerY(rail) + (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * m0
    + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * m1;
}

export function vicksburgRedoubtFaces(redoubt) {
  const point = ([u, v]) => ({
    x: redoubt.left + (redoubt.right - redoubt.left) * u,
    y: redoubt.top + (redoubt.bottom - redoubt.top) * v,
  });
  return [
    [[.10, .16], [.37, .06], [.64, .09], [.91, .21], [.94, .42], [.92, .62]],
    [[.73, .92], [.46, .96], [.20, .91], [.08, .80], [.07, .66]],
    [[.07, .53], [.08, .33], [.10, .16]],
  ].map(face => face.map(point));
}

export function vicksburgGullyX(approach, y) {
  const relativeY = y - centerY(approach);
  return approach.left + 116 - relativeY * .31 + 25 * Math.sin(relativeY / 87);
}

export function vicksburgSites(field) {
  const zones = vicksburgGroundZones(field);
  if (!zones) return [];
  const { redoubt, breach, approach, rail } = zones;
  const ravineY = approach.bottom - 46;
  const railX = 1150;
  return [
    {
      id: 'railroad-redoubt', kind: 'Landmark', name: 'Railroad Redoubt', scenic: true,
      x: centerX(redoubt), y: centerY(redoubt), width: 252, height: 230, labelOffsetY: -134,
      note: 'This square earthen fort overlooked the Southern Railroad of Mississippi, an approach to Vicksburg. Confederate troops retook the portion briefly entered by Union infantry on May 22.',
      source: REDOUBT_SOURCE,
    },
    SECOND_TEXAS_LUNETTE,
    {
      id: 'southeast-breach', kind: 'Terrain', name: 'Southeast Breach', scenic: true,
      x: centerX(breach), y: centerY(breach), width: 130, height: 122,
      labelOffsetX: 132, labelOffsetY: 27, focusLabelOffsetX: 102,
      note: 'Federal artillery partly broke the southeast angle. Men of the 22nd Iowa gained a foothold through that opening before the Confederate counterattack.',
      source: REDOUBT_SOURCE,
    },
    {
      id: 'southern-railroad', kind: 'Terrain', name: 'Southern Railroad', scenic: true,
      x: railX, y: vicksburgRailY(rail, railX), width: 220, height: 118, labelOffsetY: 50,
      note: 'The Southern Railroad of Mississippi entered Vicksburg below the redoubt. This stretch of track and its grade are compressed for the battlefield.',
      source: REDOUBT_SOURCE,
    },
    {
      id: 'loess-ravine', kind: 'Terrain', name: 'Loess Ravine', scenic: true,
      x: vicksburgGullyX(approach, ravineY), y: ravineY, width: 144, height: 170,
      labelOffsetX: -48, labelOffsetY: 61, focusLabelOffsetX: -85,
      note: 'Erosion carved deep gullies with steep sides into Vicksburg’s wind-deposited soil. The ridges and ravine shown here represent that terrain.',
      source: TERRAIN_SOURCE,
    },
  ];
}
