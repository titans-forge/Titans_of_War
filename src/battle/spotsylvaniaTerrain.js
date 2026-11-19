import { sceneryNoise, stampScenery } from './realisticScenery.js';
import { MCCOULL_HOUSE, spotsylvaniaAngle, spotsylvaniaGroundZones } from './spotsylvaniaArt.js';

const average = (a, b) => (a + b) / 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const bell = value => Math.exp(-value * value);

export function spotsylvaniaTerrainPlan(battle) {
  if (battle?.scenarioId !== 'spotsylvania') return null;
  const zones = spotsylvaniaGroundZones(battle.fieldBattle);
  return zones ? { ...zones, world: battle.world } : null;
}

export function spotsylvaniaLaneX(lane, y) {
  return average(lane.left, lane.right) + 7 * Math.sin(y / 92) + 4 * Math.sin(y / 31);
}

export function spotsylvaniaSalientShape(plan) {
  const { west, apex, east, interior, lane } = plan;
  const westShoulder = [apex.left + 38, apex.bottom - 8];
  const eastShoulder = [east.left + 10, east.top + 22];
  const interiorY = average(interior.top, interior.bottom);
  const crossing = spotsylvaniaLaneX(lane, interiorY);
  return {
    western: [
      [west.left + 24, west.bottom + 19],
      [west.left + 35, west.bottom - 23],
      [west.left + 66, average(west.top, west.bottom) - 1],
      spotsylvaniaAngle(west),
      [apex.left + 23, west.top - 12],
      westShoulder,
    ],
    apex: [
      westShoulder,
      [apex.left + 69, apex.top + 53],
      [apex.left + 121, apex.top + 31],
      [average(apex.left, apex.right), apex.top + 18],
      [apex.right - 78, apex.top + 32],
      [apex.right - 45, apex.top + 61],
      eastShoulder,
    ],
    eastern: [
      eastShoulder,
      [east.left + 23, east.top + 71],
      [average(east.left, east.right) - 11, average(east.top, east.bottom)],
      [east.right - 29, east.bottom - 46],
      [east.right - 16, east.bottom - 15],
    ],
    shorterWest: [
      [interior.left + 13, interiorY + 18],
      [interior.left + 103, interiorY + 8],
      [interior.left + 208, interiorY - 7],
      [average(interior.left, interior.right) + 29, interiorY - 8],
      [crossing - 23, interiorY + 1],
    ],
    shorterEast: [
      [crossing + 22, interiorY + 2],
      [interior.right - 101, interiorY + 10],
      [interior.right - 57, interiorY + 4],
      [interior.right - 13, interiorY + 11],
    ],
  };
}

export function spotsylvaniaElevation(plan, x, y) {
  const interiorY = average(plan.interior.top, plan.interior.bottom) - 15 * Math.cos(x / 220);
  const shorterRise = 46 * bell((x - average(plan.interior.left, plan.interior.right)) / 460)
    * bell((y - interiorY) / 72);
  const apexRise = 32 * bell((x - average(plan.apex.left, plan.apex.right)) / 164)
    * bell((y - average(plan.apex.top, plan.apex.bottom)) / 162);
  const farmRise = 14 * bell((x - MCCOULL_HOUSE.x) / 124) * bell((y - MCCOULL_HOUSE.y) / 105);
  return shorterRise + apexRise + farmRise + 6 * Math.sin(x / 127 - y / 174) + 3.4 * Math.cos(y / 81 + x / 84);
}

export function spotsylvaniaWetness({ mud }, x, y) {
  const width = (mud.right - mud.left) / 2;
  const centerX = average(mud.left, mud.right) + 18 * Math.sin(y / 78) - 7 * Math.cos(y / 31);
  const centeredY = (y - average(mud.top, mud.bottom)) / ((mud.bottom - mud.top) / 2);
  const centeredX = (x - centerX) / width;
  const organic = .12 * Math.sin(x / 21 + y / 36) + .13 * Math.cos(x / 40 - y / 23);
  return clamp((1.17 - Math.hypot(centeredX, centeredY) + organic) * 1.76, 0, 1);
}

function paintGround(ctx, source, plan) {
  const { width, height } = plan.world;
  ctx.drawImage(source, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height);
  const { data } = pixels;
  const tile = 5;
  for (let y = 0; y < height; y += tile) for (let x = 0; x < width; x += tile) {
    const dx = (spotsylvaniaElevation(plan, x + 8, y) - spotsylvaniaElevation(plan, x - 8, y)) / 16;
    const dy = (spotsylvaniaElevation(plan, x, y + 8) - spotsylvaniaElevation(plan, x, y - 8)) / 16;
    const wet = spotsylvaniaWetness(plan, x, y);
    const dim = Math.min(1, .18 + .31 * Math.cos(x / 131 - y / 163));
    const light = clamp(.93 + .48 * (.48 * dx + dy) / Math.hypot(1, dx, dy) - .062 * dim, .70, 1.12);
    const wetShade = 4 * Math.sin(x / 11 + y / 16) * wet;
    for (let row = y; row < Math.min(y + tile, height); row++) for (let col = x; col < Math.min(x + tile, width); col++) {
      const index = (row * width + col) * 4;
      const red = data[index], green = data[index + 1], blue = data[index + 2];
      const neutral = red * .28 + green * .54 + blue * .18;
      data[index] = (red * .79 + neutral * .21) * light * (1 - .29 * wet) + 5 + wetShade;
      data[index + 1] = (green * .77 + neutral * .23) * light * (1 - .41 * wet) + wetShade;
      data[index + 2] = (blue * .73 + neutral * .27) * light * (1 - .35 * wet) + 8;
    }
  }
  ctx.putImageData(pixels, 0, 0);
}

function strokePath(ctx, points, layers) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [width, color] of layers) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function workedSegments(anchors, seed) {
  const points = [anchors[0]];
  for (let index = 1; index < anchors.length; index++) {
    const [startX, startY] = anchors[index - 1];
    const [x, y] = anchors[index];
    const dx = x - startX, dy = y - startY;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 7));
    for (let step = 1; step < steps; step++) {
      const t = step / steps;
      const jitter = (sceneryNoise(seed + index, step) - .5) * 3;
      points.push([startX + dx * t + jitter, startY + dy * t - jitter]);
    }
    points.push([x, y]);
  }
  return points;
}

function paintEarthworks(ctx, shape, seed) {
  const salient = [...shape.western, ...shape.apex.slice(1), ...shape.eastern.slice(1)];
  for (const [index, anchors] of [salient, shape.shorterWest, shape.shorterEast].entries()) {
    const points = workedSegments(anchors, seed + index * 11);
    const bank = points.map(([x, y]) => [x - 3, y - 5]);
    strokePath(ctx, points, [[33, 'rgba(37,33,30,.26)'], [21, '#5d4b3c'], [12, '#332b25'], [3, '#292824']]);
    strokePath(ctx, bank, [[8, '#6c5844'], [3, 'rgba(168,142,110,.66)']]);

    // Speckled damp earth and split timber keep the works readable at closer zoom.
    for (let step = 1; step < points.length; step++) {
      const [x, y] = points[step];
      const [previousX, previousY] = points[step - 1];
      const dx = x - previousX, dy = y - previousY;
      const length = Math.hypot(dx, dy);
      for (let grain = 0; grain < 6; grain++) {
        const key = step * 6 + grain;
        const cross = (sceneryNoise(seed + 17 + index, key) - .5) * 28;
        const along = sceneryNoise(seed + 33, key);
        const px = previousX + dx * along + dy / length * cross;
        const py = previousY + dy * along - dx / length * cross;
        ctx.fillStyle = key % 3 ? 'rgba(132,110,88,.44)' : 'rgba(32,27,23,.49)';
        ctx.fillRect(px, py, 1 + 2.1 * sceneryNoise(seed + index + 40, key), .8 + sceneryNoise(seed + 18, key));
      }
      if (step % 3 === 0) {
        const timber = 1.7 + sceneryNoise(seed + index, step) * 2.3;
        strokePath(ctx, [[previousX - 2.4, previousY - 5], [x - 2.4, y - 5]], [[timber + 1.5, '#514337'], [timber, '#8f7558']]);
      }
    }
  }
}

function paintMudAndLane(ctx, plan, seed) {
  const { mud, lane } = plan;
  for (let index = 0; index < 49; index++) {
    const x = mud.left + (mud.right - mud.left) * sceneryNoise(seed + 8, index);
    const y = mud.top + (mud.bottom - mud.top) * sceneryNoise(seed + 12, index);
    if (spotsylvaniaWetness(plan, x, y) < .49) continue;
    const size = 1 + 9 * sceneryNoise(seed + 16, index);
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * .24, -.1 + .35 * sceneryNoise(seed + 21, index), 0, Math.PI * 2);
    ctx.fillStyle = index % 3 ? 'rgba(90,103,111,.46)' : 'rgba(64,76,83,.68)';
    ctx.fill();
  }
  const road = [];
  for (let y = lane.top; y < plan.world.height + 5; y += 5) road.push([spotsylvaniaLaneX(lane, y), y]);
  strokePath(ctx, road, [[36, 'rgba(81,70,55,.24)'], [26, 'rgba(111,87,63,.62)'], [16, 'rgba(153,128,97,.53)']]);
  for (const offset of [-5, 6]) {
    const rut = road.map(([x, y]) => [x + offset + 1.5 * Math.sin(y / 21 + offset), y]);
    strokePath(ctx, rut, [[1.8, 'rgba(52,44,39,.47)']]);
  }
  for (let i = 0; i < 470; i++) {
    const y = lane.top + (plan.world.height - lane.top) * sceneryNoise(seed + 27, i);
    const x = spotsylvaniaLaneX(lane, y) + (sceneryNoise(seed + 57, i) - .5) * 25;
    ctx.fillStyle = i % 3 ? 'rgba(175,151,116,.31)' : 'rgba(54,44,34,.37)';
    ctx.fillRect(x, y, 1 + sceneryNoise(seed + 61, i), .8);
  }
}

export function spotsylvaniaTrees(plan, seed) {
  const { world, orchard, lane, west, apex, east, interior } = plan;
  const trees = [];
  for (let y = 23, row = 0; y < world.height - 20; y += 27, row++) {
    for (let x = 24, col = 0; x < world.width - 20; x += 27, col++) {
      const key = row * 97 + col;
      const px = x + 23 * (sceneryNoise(seed + 4, key) - .5);
      const py = y + 23 * (sceneryNoise(seed + 17, key) - .5);
      const size = 22 + sceneryNoise(seed + 9, key) * 18;
      const inZone = zone => px > zone.left - size / 2 && px < zone.right + size / 2
        && py > zone.top - size / 2 && py < zone.bottom + size / 2;
      if ([west, apex, east, interior].some(inZone)) continue;
      if (spotsylvaniaWetness(plan, px, py) > .06) continue;
      if (py > lane.top - size && Math.abs(px - spotsylvaniaLaneX(lane, py)) < 21 + size / 2) continue;
      if (Math.abs(px - MCCOULL_HOUSE.x) < MCCOULL_HOUSE.width / 2 + size / 2
        && Math.abs(py - MCCOULL_HOUSE.y) < MCCOULL_HOUSE.height / 2 + size / 2) continue;
      const woodEdge = px < 295 || px > 1165;
      const farWood = py < 80 && (px < 480 || px > 930);
      const density = inZone(orchard) ? .41 : woodEdge || farWood ? .39 + .14 * Math.sin(px / 67 + py / 118) : .011;
      if (sceneryNoise(seed + 43, key) > density) continue;
      const species = sceneryNoise(seed + 51, key);
      trees.push({ x: px, y: py, size, type: species < .58 ? 'oak' : species < .86 ? 'poplar' : 'cedar', flip: key % 2 !== 0 });
    }
  }
  return trees.sort((a, b) => a.y - b.y);
}

export function drawSpotsylvaniaTerrain(scene, ctx, source, plan, seed) {
  paintGround(ctx, source, plan);
  ctx.save();
  paintMudAndLane(ctx, plan, seed);
  paintEarthworks(ctx, spotsylvaniaSalientShape(plan), seed);
  const { x, y } = MCCOULL_HOUSE;
  const yard = ctx.createRadialGradient(x, y + 15, 9, x, y + 15, 75);
  yard.addColorStop(0, 'rgba(133,117,91,.74)');
  yard.addColorStop(1, 'rgba(133,117,91,0)');
  ctx.fillStyle = yard;
  ctx.fillRect(x - 78, y - 65, 156, 151);
  for (const tree of spotsylvaniaTrees(plan, seed)) {
    ctx.beginPath();
    ctx.ellipse(tree.x + 6, tree.y + 6, tree.size * .48, tree.size * .31, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(19,30,25,.29)';
    ctx.fill();
    stampScenery(scene, ctx, 'foliage', tree.type, tree.x - tree.size / 2, tree.y - tree.size * .73,
      tree.size, tree.size * .89, tree.flip);
  }
  ctx.restore();
}
