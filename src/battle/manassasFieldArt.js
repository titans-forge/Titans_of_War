import { drawNaturalRoad } from './realisticScenery.js';

export const MANASSAS_FIELD_ART_ID = 'manassas-field-v1';
export const MANASSAS_FIELD_TERRAIN = 'manassas-ground-field-v1';

export function manassasFieldArtEnabled(scenarioId, rules, search = '') {
  if (scenarioId !== 'first_manassas' || !(rules >= 18)) return false;
  const choices = new URLSearchParams(search).getAll('artPass');
  return choices.length === 1 && choices[0] === MANASSAS_FIELD_ART_ID;
}

// The road junction sits southwest of the existing Stone House footprint.
// These traces are illustrative locations on the compressed board.
const turnpike = [
  [-20, 389], [125, 384], [237, 384], [405, 391], [645, 402],
  [930, 413], [1260, 432], [1520, 447],
];
const sudleyRoad = [
  [220, -20], [222, 115], [229, 235], [234, 343], [237, 384],
  [247, 464], [267, 548], [309, 703], [337, 920],
];

function drawLane(ctx, path, width, seed, opacity = 1) {
  const points = path.map(([x, y]) => ({ x, y }));
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.strokeStyle = 'rgba(78, 65, 40, .13)';
  ctx.lineWidth = width + 4;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(184, 154, 107, .23)';
  ctx.lineWidth = width - 3;
  ctx.stroke();
  for (let index = 1; index < points.length; index++) {
    drawNaturalRoad(ctx, points[index - 1], points[index], width, seed + index);
  }
  ctx.restore();
}

function drawYard(ctx, site, color) {
  const radius = site.width * .78;
  ctx.save();
  ctx.translate(site.x, site.y + site.height * .25);
  ctx.scale(1, .58);
  const soil = ctx.createRadialGradient(0, 0, 8, 0, 0, radius);
  soil.addColorStop(0, color);
  soil.addColorStop(.55, 'rgba(134, 108, 72, .27)');
  soil.addColorStop(1, 'rgba(134, 108, 72, 0)');
  ctx.fillStyle = soil;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.restore();
}

export function drawManassasRoadsAndYards(ctx, landmarks = []) {
  drawLane(ctx, turnpike, 23, 1861);
  drawLane(ctx, sudleyRoad, 17, 1912, .9);
  const stone = landmarks.find(site => site.id === 'stone-house');
  const henry = landmarks.find(site => site.id === 'henry-house');
  if (stone) {
    drawYard(ctx, stone, 'rgba(169, 138, 92, .51)');
    drawLane(ctx, [[stone.x + 9, stone.y + stone.height / 2], [326, 378], [349, 389]], 12, 2070, .72);
  }
  if (henry) {
    drawYard(ctx, henry, 'rgba(170, 144, 104, .45)');
    drawLane(ctx, [
      [henry.x + 8, henry.y + henry.height / 2], [625, 579], [690, 602],
      [762, 632], [851, 672], [932, 716], [1025, 765],
    ], 10, 2541, .65);
  }
}
