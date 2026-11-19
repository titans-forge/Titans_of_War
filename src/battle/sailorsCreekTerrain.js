import {
  HILLSMAN_HOUSE, sailorsCreekHalfWidth, sailorsCreekY, sailorsGroundZones, sailorsRoadY,
} from './sailorsCreekArt.js';
import { sceneryNoise, stampScenery } from './realisticScenery.js';

const hill = (dx, dy) => Math.exp(-(dx * dx + dy * dy));
const centerX = zone => (zone.left + zone.right) / 2;
const centerY = zone => (zone.top + zone.bottom) / 2;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const mix = (a, b, t) => a + t * (b - a);

export function sailorsTerrainPlan(engine) {
  if (engine.scenarioId !== 'sailors_creek') return null;
  const zones = sailorsGroundZones(engine.fieldBattle);
  return zones ? { world: engine.world, ...zones } : null;
}

export function sailorsWetness({ creek, floodplain }, x, y) {
  const dy = y - sailorsCreekY(creek, x);
  const bottomWidth = Math.abs(dy < 0 ? floodplain.top - centerY(creek) : floodplain.bottom - centerY(creek));
  const saturation = Math.exp(-Math.pow(dy / (bottomWidth * .71), 2));
  const pools = .85 + .15 * Math.sin(x / 92 + y / 26);
  return saturation * pools;
}

export function sailorsElevation({ creek, heights }, x, y) {
  const creekY = sailorsCreekY(creek, x);
  const dx = x - centerX(heights), dy = y - centerY(heights) - 32;
  const south = 79 * hill((dx + .28 * dy) / 269, dy / 112);
  const woodedSide = 48 * hill((x - 1350) / 245, (y - 585) / 167);
  const saddle = 27 * hill((x - (1116 + .22 * (y - 610))) / 88, (y - 586) / 167);
  const westTrees = 31 * hill((x - 197) / 198, (y - 543) / 133);
  const farm = 36 * hill((x - HILLSMAN_HOUSE.x) / 336, (y - 166) / 112);
  const oppositeField = 17 * hill((x - 344) / 274, (y - 118) / 146);
  const draw = 22 * hill((x - 831) / 761, (y - creekY) / 50);
  const ripples = 3.5 * Math.sin(x / 83 - y / 57) * Math.sin(y / 79);
  return south + woodedSide + westTrees + farm + oppositeField - draw - saddle + ripples;
}

function tintChannel(data, offset, x, y, { north, south }) {
  const depth = Math.min(y - north, south - y);
  if (depth < -10) return;
  const water = clamp((depth + .5) / 1.6, 0, 1);
  const wetBank = clamp((depth + 10) / 10, 0, 1);
  const silt = .52 + .21 * Math.sin(x / 21 + y / 9) + .14 * Math.cos(x / 57 - y / 7);
  const mud = .58 * wetBank * silt;
  const bed = clamp(depth / 13, 0, 1);
  const eddy = Math.sin(y * 1.68 + x * .12 + 3.2 * Math.sin(x * .049 - y * .21))
    * (3.8 + 2.4 * Math.sin(x / 16 + y / 4));
  const reflection = 12 * Math.sin(x / 27 + y / 12) + 7 * Math.cos(x / 13 - y / 9);
  const shallows = (1 - bed) * (8 + silt * 32);
  data[offset] = mix(mix(data[offset], 59 + 16 * silt, mud), 48 + shallows + reflection + eddy, water);
  data[offset + 1] = mix(mix(data[offset + 1], 61 + 14 * silt, mud), 70 + shallows * .76 + reflection + eddy, water);
  data[offset + 2] = mix(mix(data[offset + 2], 47 + 13 * silt, mud), 64 + shallows * .45 + reflection * .81 + eddy, water);
}

function paintRelief(ctx, source, plan) {
  const { width, height } = plan.world;
  ctx.drawImage(source, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;
  const banks = Array.from({ length: width }, (_, x) => {
    const center = sailorsCreekY(plan.creek, x);
    const halfWidth = sailorsCreekHalfWidth(x);
    return {
      north: center - halfWidth + 1.4 * Math.sin(x / 6) + .8 * Math.cos(x / 3.1),
      south: center + halfWidth + 1.3 * Math.cos(x / 7) + .9 * Math.sin(x / 2.9),
    };
  });
  const tile = 5;
  for (let y = 0; y < height; y += tile) {
    for (let x = 0; x < width; x += tile) {
      const sx = x + tile / 2, sy = y + tile / 2;
      const slope = sailorsElevation(plan, sx + 10, sy + 15) - sailorsElevation(plan, sx - 10, sy - 15);
      const wet = sailorsWetness(plan, sx, sy);
      const light = .94 + clamp(slope * .023, -.23, .21) - wet * .21;
      const bare = clamp((Math.abs(slope) - 7) * .014, 0, .26) * (.75 + .25 * Math.sin(sx / 33 + sy / 29));
      for (let py = y; py < Math.min(height, y + tile); py++) {
        for (let px = x; px < Math.min(width, x + tile); px++) {
          const i = (py * width + px) * 4;
          data[i] = data[i] * (light - bare) + bare * 152;
          data[i + 1] = data[i + 1] * (light - bare) + bare * 123;
          data[i + 2] = data[i + 2] * (light - bare) + bare * 88 + wet * 9;
          const bank = banks[px];
          if (py >= bank.north - 10 && py <= bank.south + 10) tintChannel(data, i, px, py, bank);
        }
      }
    }
  }
  ctx.putImageData(image, 0, 0);
}

function strokePath(ctx, points, layers) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const { x, y } of points.slice(1)) ctx.lineTo(x, y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const [width, color] of layers) {
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
}

function paintWetBottom(ctx, plan, seed) {
  const { creek, floodplain } = plan;
  for (let i = 0; i < 91; i++) {
    const x = floodplain.left + sceneryNoise(seed + 27, i) * (floodplain.right - floodplain.left);
    const spread = sceneryNoise(seed + 50, i);
    const y = sailorsCreekY(creek, x) - sailorsCreekHalfWidth(x) - 7 - 47 * spread;
    const size = 3 + sceneryNoise(seed + 16, i) * 20;
    ctx.beginPath();
    ctx.ellipse(x, y, size, 1.2 + 3.8 * spread, .23 * Math.sin(x / 92), 0, Math.PI * 2);
    ctx.fillStyle = i % 4 === 0 ? '#84999258' : '#3c4f43a3';
    ctx.fill();
  }
  for (let i = 0; i < 162; i++) {
    const x = floodplain.left + sceneryNoise(seed + 81, i) * (floodplain.right - floodplain.left);
    const edge = sailorsCreekY(creek, x) - sailorsCreekHalfWidth(x);
    const base = edge - 1 - 10 * sceneryNoise(seed + 12, i);
    strokePath(ctx, [{ x, y: base }, { x: x + 2, y: base - 2 }, { x: x + 4, y: base - 5 - (i % 3) }],
      [[1.3, i % 3 ? '#7d77549e' : '#aba775a6']]);
  }
}

function paintRipples(ctx, { creek, world }, seed) {
  for (let i = 0; i < 215; i++) {
    const x = sceneryNoise(seed + 34, i) * world.width;
    const halfWidth = sailorsCreekHalfWidth(x);
    const y = sailorsCreekY(creek, x) + (sceneryNoise(seed + 59, i) - .5) * halfWidth * 1.67;
    const dx = 2 + 10 * sceneryNoise(seed + 65, i);
    const dy = sailorsCreekY(creek, x + dx) - sailorsCreekY(creek, x);
    const waterColor = i % 4 ? '#c1cbb038' : '#293e3972';
    strokePath(ctx, [{ x, y }, { x: x + dx * .64, y: y + dy * .46 + .6 }, { x: x + dx, y: y + dy }],
      [[i % 5 ? .7 : 1.2, waterColor]]);
  }
}

function paintRoad(ctx, { road }, seed) {
  const points = [];
  for (let x = -6; x <= road.right; x += 5) points.push({ x, y: sailorsRoadY(road, x) });
  strokePath(ctx, points, [[27, '#665d436b'], [21, '#8c7a5cc0'], [14, '#aba07ab0']]);
  for (const dy of [-5, 5]) {
    strokePath(ctx, points.map(point => ({ x: point.x, y: point.y + dy })), [[1.8, '#5e5143ad']]);
  }
  for (let i = 0; i < 96; i++) {
    const x = sceneryNoise(seed + 13, i) * road.right;
    const y = sailorsRoadY(road, x) + (sceneryNoise(seed + 36, i) - .5) * 22;
    ctx.fillStyle = i % 3 ? '#8d806470' : '#b9a586a0';
    ctx.fillRect(x, y, 1.5 + sceneryNoise(seed + 57, i) * 4, 1.2);
  }
}

function paintFarmyard(ctx) {
  const { x, y } = HILLSMAN_HOUSE;
  const soil = ctx.createRadialGradient(x, y + 30, 9, x, y + 30, 112);
  soil.addColorStop(0, '#ab9c766b');
  soil.addColorStop(.55, '#99866553');
  soil.addColorStop(1, '#99866500');
  ctx.fillStyle = soil;
  ctx.fillRect(x - 114, y - 85, 228, 224);
  strokePath(ctx, [
    { x: x + 64, y: y + 25 }, { x: x + 99, y: y + 20 }, { x: x + 150, y: y + 2 },
    { x: x + 194, y: y - 8 }, { x: x + 227, y: y - 18 },
  ], [[10, '#6d604550'], [5, '#a6987079']]);
}

export function sailorsTrees(plan, seed) {
  const { world, heights, woods, staging, road, creek } = plan;
  const trees = [];
  for (let y = 19, row = 0; y < world.height - 8; y += 29, row++) {
    for (let x = 19, col = 0; x < world.width - 8; x += 29, col++) {
      const key = row * 97 + col;
      const px = x + 25 * (sceneryNoise(seed + 2, key) - .5);
      const py = y + 25 * (sceneryNoise(seed + 6, key) - .5);
      const size = 24 + sceneryNoise(seed + 9, key) * 30;
      const radius = size / 2;
      const creekDistance = Math.abs(py - sailorsCreekY(creek, px));
      const inZone = zone => px > zone.left - radius && px < zone.right + radius
        && py > zone.top - radius && py < zone.bottom + radius;
      if (creekDistance < 26 + radius || inZone(staging)) continue;
      if (px <= road.right + radius && Math.abs(py - sailorsRoadY(road, px)) < 17 + radius) continue;
      if (Math.hypot((px - HILLSMAN_HOUSE.x) * .72, py - HILLSMAN_HOUSE.y) < 79 + radius) continue;
      const fieldEdge = px < 146 + 58 * Math.sin(py / 132) || px > 1513 || py < 51 || py > 828;
      const crestWoods = py > heights.bottom - 2 && py < heights.bottom + 48 && px > 583 && px < 954;
      const outlyingWood = py > 486 && py < 620 && px < 303 + 55 * Math.sin(py / 46);
      const density = inZone(woods) ? .68 : crestWoods ? .23 : fieldEdge || outlyingWood ? .37 : .009;
      if (sceneryNoise(seed + 39, key) >= density) continue;
      const species = sceneryNoise(seed + 43, key);
      trees.push({ x: px, y: py, size, type: species < .42 ? 'oak' : species < .72 ? 'poplar' : 'cedar', flip: key % 2 === 0 });
    }
  }
  return trees.sort((a, b) => a.y - b.y);
}

export function drawSailorsTerrain(scene, ctx, source, plan, seed) {
  paintRelief(ctx, source, plan);
  ctx.save();
  paintWetBottom(ctx, plan, seed);
  paintRipples(ctx, plan, seed);
  paintRoad(ctx, plan, seed);
  paintFarmyard(ctx);
  for (const tree of sailorsTrees(plan, seed)) {
    ctx.beginPath();
    ctx.ellipse(tree.x + 7, tree.y + 5, tree.size * .46, tree.size * .32, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#26332a47';
    ctx.fill();
    stampScenery(scene, ctx, 'foliage', tree.type, tree.x - tree.size / 2, tree.y - tree.size * .75,
      tree.size, tree.size * .91, tree.flip);
  }
  ctx.restore();
}
