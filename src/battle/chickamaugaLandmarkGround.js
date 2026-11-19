import { landmarkSurroundings } from './landmarkSurroundings.js';
import { drawNaturalRoad, sceneryNoise } from './realisticScenery.js';

export function chickamaugaLandmarkGround(engine) {
  if (engine.scenarioId !== 'chickamauga' || !engine.fieldBattle) return null;
  const { zones, landmarks = [] } = engine.fieldBattle;
  const clearing = zones.find(zone => zone.kind === 'clearing' && zone.name === 'Brotherton clearing');
  const ridge = zones.find(zone => zone.kind === 'ridge' && zone.name === 'Horseshoe Ridge');
  const road = engine.config.movement?.roadBands?.find(band => band.axis === 'x');
  const cabin = landmarks.find(site => site.id === 'brotherton-cabin');
  const house = landmarks.find(site => site.id === 'snodgrass-house');
  const ridgeLane = house && landmarkSurroundings({ id: house.id, mapRules: engine.battleRulesVersion })?.lanes[0];
  if (!clearing || !ridge || !road || !cabin || !house || !ridgeLane) return null;
  return { clearing, ridge, road, cabin, house, ridgeLane };
}

function groundWash(ctx, x, y, radiusX, radiusY, color, opacity) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(radiusX, radiusY);
  const gradient = ctx.createRadialGradient(0, 0, .08, 0, 0, 1);
  gradient.addColorStop(0, `rgba(${color},${opacity})`);
  gradient.addColorStop(.55, `rgba(${color},${opacity * .68})`);
  gradient.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

function clipGround(ctx, { left, top, right, bottom }) {
  ctx.beginPath();
  ctx.rect(left, top, right - left, bottom - top);
  ctx.clip();
}

function drawBrothertonField(ctx, zone, cabin, seed) {
  const width = zone.right - zone.left;
  const height = zone.bottom - zone.top;
  ctx.save();
  clipGround(ctx, zone);
  groundWash(ctx, zone.left + width * .30, zone.top + height * .53, width * .35, height * .52, '174,155,95', .53);
  groundWash(ctx, cabin.x + 84, zone.top + height * .54, width * .32, height * .57, '188,160,100', .64);
  groundWash(ctx, cabin.x + 8, cabin.y + 18, cabin.artWidth * .58, 41, '160,122,77', .62);
  groundWash(ctx, cabin.x + 6, cabin.y + 20, cabin.width * .58, 20, '52,40,24', .31);

  // A small, faded patch of stubble leaves the open gap itself uncluttered.
  const start = cabin.x + cabin.artWidth * .56;
  const end = zone.right - 14;
  for (let row = 0; row < 13; row++) {
    const y = zone.top + height * .27 + row * 7;
    for (let x = start, i = 0; x < end; x += 13, i++) {
      const grain = sceneryNoise(seed + row, i);
      if (grain < .24) continue;
      ctx.strokeStyle = `rgba(107,82,47,${.11 + grain * .12})`;
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      ctx.moveTo(x, y + (x - start) * .035);
      const next = Math.min(end, x + grain * 14);
      ctx.lineTo(next, y + (next - start) * .035);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawSnodgrassYard(ctx, ridge, house) {
  const width = ridge.right - ridge.left;
  const height = ridge.bottom - ridge.top;
  ctx.save();
  clipGround(ctx, ridge);
  // Cooler, more subdued tones carry the shape of the ridge toward the farm.
  groundWash(ctx, ridge.left + width * .45, ridge.top + height * .38, width * .5, height * .45, '151,157,117', .55);
  groundWash(ctx, ridge.left + width * .55, ridge.top + height * .72, width * .51, height * .33, '56,73,52', .33);
  groundWash(ctx, house.x - 18, house.y + 23, house.artWidth * .53, 55, '181,172,126', .68);
  groundWash(ctx, house.x + 5, house.y + 22, house.width * .55, 22, '52,46,33', .28);
  ctx.restore();
}

function drawTrack(ctx, points, width, seed) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(157,126,78,.38)';
  ctx.lineWidth = width - 1;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.stroke();
  for (let i = 1; i < points.length; i++) drawNaturalRoad(ctx, points[i - 1], points[i], width, seed + i);
  ctx.restore();
}

export function drawChickamaugaLandmarkGround(ctx, { clearing, ridge, road, cabin, house, ridgeLane }, seed) {
  drawBrothertonField(ctx, clearing, cabin, seed);
  drawSnodgrassYard(ctx, ridge, house);
  // Decorative approaches meet the playable road at its existing centerline.
  const doorstep = { x: cabin.x - 3, y: cabin.y + cabin.height / 2 };
  drawTrack(ctx, [
    { x: road.value, y: doorstep.y + 2 },
    { x: road.value + (doorstep.x - road.value) * .30, y: doorstep.y + 8 },
    { x: road.value + (doorstep.x - road.value) * .72, y: doorstep.y + 7 },
    doorstep,
  ], 17, seed + 17);
  drawTrack(ctx, ridgeLane, 13, seed + 29);
}
