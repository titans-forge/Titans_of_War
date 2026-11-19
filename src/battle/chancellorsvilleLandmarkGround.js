import { drawNaturalRoad, sceneryNoise } from './realisticScenery.js';

// Short lanes connect the landmarks on the compressed board.
// These surfaces are decorative. The authored zone and building geometry
// remains the authority for movement, cover and obstruction.
const inn = {
  color: '177,145,96',
  apron: { offsetX: -8, offsetY: 35, radiusX: 116, radiusY: 55 },
  lanes: [
    [{ x: 1123, y: 555 }, { x: 1149, y: 573 }, { x: 1184, y: 585 }, { x: 1220, y: 583 }, { x: 1253, y: 569 }],
    [{ x: 1149, y: 573 }, { x: 1159, y: 600 }, { x: 1169, y: 622 }, { x: 1176, y: 655 }, { x: 1203, y: 681 }, { x: 1224, y: 716 }],
  ],
  laneWidth: 23,
};

const furnace = {
  color: '97,83,67',
  apron: { offsetX: -16, offsetY: 30, radiusX: 131, radiusY: 69 },
  lanes: [
    [{ x: 826, y: 824 }, { x: 912, y: 822 }, { x: 995, y: 820 }, { x: 1050, y: 809 }, { x: 1103, y: 788 }, { x: 1161, y: 782 }, { x: 1194, y: 756 }, { x: 1224, y: 716 }],
    [{ x: 995, y: 820 }, { x: 1005, y: 791 }, { x: 1043, y: 770 }, { x: 1071, y: 769 }],
  ],
  laneWidth: 18,
};

function groundWash(ctx, x, y, radiusX, radiusY, color, opacity) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(radiusX, radiusY);
  const tint = ctx.createRadialGradient(0, 0, .16, 0, 0, 1);
  tint.addColorStop(0, `rgba(${color},${opacity})`);
  tint.addColorStop(.62, `rgba(${color},${opacity * .75})`);
  tint.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = tint;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

function drawYard(ctx, site, { apron, color }, seed) {
  const x = site.x + apron.offsetX, y = site.y + apron.offsetY;
  const { radiusX, radiusY } = apron;
  groundWash(ctx, x, y, radiusX, radiusY, color, .68);
  groundWash(ctx, site.x + 8, site.y + site.height / 2 - 10, site.width * .56, 24, '40,33,22', .25);

  // Fine mottling reveals texture at close zoom without erasing the ground plate.
  for (let i = 0; i < 260; i++) {
    const angle = sceneryNoise(seed, i) * Math.PI * 2;
    const distance = Math.sqrt(sceneryNoise(seed + 1, i));
    const grainX = x + Math.cos(angle) * distance * radiusX;
    const grainY = y + Math.sin(angle) * distance * radiusY;
    ctx.fillStyle = i % 3 ? `rgba(57,47,36,${.22 * (1 - distance)})` : `rgba(210,183,130,${.42 * (1 - distance)})`;
    ctx.fillRect(grainX, grainY, 1 + sceneryNoise(seed + 2, i) * 2.5, 1.2);
  }
}

export function drawChancellorsvilleZoneGround(ctx, zone) {
  const { kind, left, right, top, bottom } = zone;
  if (kind !== 'woods' && kind !== 'clearing') return;
  const width = right - left, height = bottom - top;
  const woods = kind === 'woods';
  // Overlapping washes follow the actual cover and clearing with soft edges.
  // The rule overlay continues to show the precise rectangular boundaries.
  const color = woods ? '40,52,35' : '175,155,103';
  groundWash(ctx, left + width * .38, top + height * .38, width * .44, height * .45, color, woods ? .48 : .29);
  groundWash(ctx, left + width * .64, top + height * .66, width * .38, height * .41, color, woods ? .43 : .28);
}

function drawLane(ctx, lane, width, seed) {
  ctx.beginPath();
  ctx.moveTo(lane[0].x, lane[0].y);
  for (const { x, y } of lane.slice(1)) ctx.lineTo(x, y);
  ctx.lineWidth = width - 4;
  ctx.strokeStyle = 'rgba(156,128,89,.25)';
  ctx.stroke();
  for (let i = 1; i < lane.length; i++) {
    drawNaturalRoad(ctx, lane[i - 1], lane[i], width, seed + i);
  }
}

export function drawChancellorsvilleLandmarkGround(ctx, site) {
  const isFurnace = site.id === 'catharine-furnace';
  if (!isFurnace && site.id !== 'chancellor-house') return false;
  const ground = isFurnace ? furnace : inn;
  const seed = isFurnace ? 1863 : 1816;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  drawYard(ctx, site, ground, seed);
  for (const [index, lane] of ground.lanes.entries()) {
    drawLane(ctx, lane, ground.laneWidth - index * 4, seed + index * 7);
  }
  if (isFurnace) {
    // Low, uneven charcoal heaps beside the work tracks, with no new collision.
    for (const [x, y, width, height] of [[1007, 773, 17, 9], [1028, 763, 14, 8], [1047, 752, 16, 10]]) {
      groundWash(ctx, x + 3, y + 3, width + 4, height + 2, '30,25,21', .51);
      groundWash(ctx, x, y, width, height, '41,37,35', .82);
      groundWash(ctx, x - 3, y - 2, width * .7, height * .59, '109,100,87', .49);
    }
  }
  ctx.restore();
  return true;
}
