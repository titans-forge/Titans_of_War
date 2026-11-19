import { fieldExitTargets } from './fieldBattleProfiles.js';
import { drawNaturalRoad, sceneryNoise } from './realisticScenery.js';

export function winchesterLandmarkGround(battle) {
  if (battle.scenarioId !== 'third_winchester' || !battle.fieldBattle) return null;
  const house = battle.fieldBattle.landmarks?.find(site => site.id === 'hackwood');
  const corridor = battle.config.withdrawalCorridor;
  const road = battle.config.movement?.roadBands?.find(band => band.axis === 'x');
  if (!house || !corridor || !road) return null;
  return { house, corridor, road, exits: fieldExitTargets(battle, { side: 'confederate' }), bottom: battle.world.height };
}

function groundWash(ctx, x, y, rx, ry, color, opacity) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  const gradient = ctx.createRadialGradient(0, 0, .08, 0, 0, 1);
  gradient.addColorStop(0, `rgba(${color},${opacity})`);
  gradient.addColorStop(.55, `rgba(${color},${opacity * .62})`);
  gradient.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

function drawTrack(ctx, points, width, seed) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(154,128,82,.36)';
  ctx.lineWidth = width + 4;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.stroke();
  for (let i = 1; i < points.length; i++) drawNaturalRoad(ctx, points[i - 1], points[i], width, seed + i);
  ctx.restore();
}

function drawHackwood(ctx, house, seed) {
  const doorstep = { x: house.x - 3, y: house.y + house.height / 2 };
  groundWash(ctx, house.x - 14, house.y + 13, house.artWidth * .71, 75, '147,143,93', .58);
  groundWash(ctx, house.x + 26, house.y + 49, house.artWidth * .51, 62, '170,140,91', .62);
  groundWash(ctx, house.x + 9, house.y + 22, house.width * .56, 26, '55,50,31', .34);

  // Scattered pale grit and ochre grass leave the shape of the house distinct.
  for (let i = 0; i < 170; i++) {
    const angle = sceneryNoise(seed, i) * Math.PI * 2;
    const radius = Math.sqrt(sceneryNoise(seed + 1, i));
    const x = house.x + 11 + Math.cos(angle) * radius * 101;
    const y = doorstep.y - 1 + Math.sin(angle) * radius * 49;
    ctx.fillStyle = i % 3 ? `rgba(122,106,72,${.24 * (1 - radius)})` : `rgba(209,190,140,${.47 * (1 - radius)})`;
    ctx.fillRect(x, y, 1 + sceneryNoise(seed + 2, i) * 2, .9);
  }
  drawTrack(ctx, [
    doorstep,
    { x: house.x + 18, y: doorstep.y + 20 },
    { x: house.x + 14, y: doorstep.y + 49 },
    { x: house.x - 11, y: doorstep.y + 66 },
    { x: house.x - 48, y: doorstep.y + 78 },
  ], 16, seed + 16);
}

function drawWithdrawal(ctx, { corridor, road, exits, bottom }, seed) {
  const width = corridor.right - corridor.left;
  // The approach is illustrative, but ends at the same marked points the game
  // uses for withdrawals. These tracks do not define or expand the valid area.
  groundWash(ctx, road.value, corridor.top + 36, width * .49, 69, '153,137,87', .40);
  groundWash(ctx, road.value, corridor.top - 32, 48, 61, '178,146,96', .39);
  for (const [index, exit] of exits.entries()) {
    if (exit.x === road.value) {
      drawTrack(ctx, [{ x: road.value, y: corridor.top - 90 }, exit, { x: exit.x, y: bottom }], 36, seed + index * 9);
      continue;
    }
    const offset = exit.x - road.value;
    drawTrack(ctx, [
      { x: road.value, y: corridor.top - 56 },
      { x: road.value + offset * .29, y: corridor.top - 23 },
      { x: road.value + offset * .79, y: corridor.top + 8 },
      exit,
      { x: exit.x + offset * .08, y: bottom },
    ], 21, seed + index * 9);
  }
}

export function drawWinchesterLandmarkGround(ctx, plan, seed) {
  drawHackwood(ctx, plan.house, seed);
  drawWithdrawal(ctx, plan, seed + 31);
}
