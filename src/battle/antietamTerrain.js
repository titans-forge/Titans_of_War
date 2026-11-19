import { drawNaturalRoad, sceneryNoise } from './realisticScenery.js';

const KEY_LIGHT = { x: -.48, y: -.57, z: .67 };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const bell = distance => Math.exp(-distance * distance);
const middle = (a, b) => (a + b) / 2;

function smooth(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

// The renderer consumes authored zones. These curves and colours do not
// change cover, road bonuses, route costs, or landmark footprints.
export function antietamTerrainPlan(battle) {
  if (battle.scenarioId !== 'antietam' || !battle.fieldBattle) return null;
  const { zones } = battle.fieldBattle;
  const corn = zones.find(zone => zone.kind === 'clearing' && /cornfield/i.test(zone.name));
  const lane = zones.find(zone => zone.kind === 'ravine' && /sunken road/i.test(zone.name));
  const creek = zones.find(zone => zone.kind === 'creek');
  const crossing = zones.find(zone => zone.kind === 'road' && /bridge/i.test(zone.name));
  const heights = zones.find(zone => zone.kind === 'ridge' && /heights/i.test(zone.name));
  if (!corn || !lane || !creek || !crossing || !heights) return null;
  return { world: battle.world, corn, lane, creek, crossing, heights };
}

function distanceInto(zone, x) {
  return (x - zone.left) / (zone.right - zone.left);
}

function edgeTaper(position, span) {
  return smooth(position / span) * smooth((1 - position) / span);
}

function laneBed(zone, x) {
  const p = distanceInto(zone, x);
  return middle(zone.top, zone.bottom) + Math.sin(p * 6.65 - .6) * 15
    + Math.sin(p * 13 + .2) * 5 - p * 8;
}

export function antietamChannel(plan, x) {
  const { creek, crossing } = plan;
  const along = distanceInto(creek, x);
  const reach = Math.min(1, edgeTaper(along, .15));
  const bridgeX = middle(crossing.left, crossing.right);
  const nearBridge = bell((x - bridgeX) / 49);
  const center = middle(creek.top, creek.bottom)
    + (1 - nearBridge) * (Math.sin(along * 6.8 + .5) * 22 + Math.sin(along * 15) * 6);
  const halfWidth = reach * (24 + 5 * Math.sin(along * 7 + .4) + 11 * nearBridge);
  return { x, y: center, halfWidth };
}

function elevation(plan, x, y) {
  const { world, corn, creek, lane, heights } = plan;
  const ridge = middle(heights.top, heights.bottom) + 21 * Math.sin(x / 90);
  const southernRise = 46 * bell((y - ridge) / 87) * bell((x - middle(heights.left, heights.right)) / 310);
  const fieldRise = 31 * bell((y - middle(corn.top, corn.bottom) - 28 * Math.sin(x / 152)) / 120)
    * bell((x - middle(corn.left, corn.right)) / 500);
  const northernFold = 28 * bell((y - world.height * .21 - Math.sin(x / 220 + .8) * 55) / 123);
  const roadCut = 24 * edgeTaper(distanceInto(lane, x), .13) * bell((y - laneBed(lane, x)) / 23);
  const channel = antietamChannel(plan, x);
  const waterCut = 30 * edgeTaper(distanceInto(creek, x), .22) * bell((y - channel.y) / 68);
  const variation = 6 * Math.sin(x / 91 + y / 134) + 7 * Math.cos(x / 164 - y / 82);
  return southernRise + fieldRise + northernFold + variation - roadCut - waterCut;
}

export function shadeAntietamPixels(pixels, width, height, plan) {
  const columns = Math.ceil(width / 6) + 1;
  const rows = Math.ceil(height / 6) + 1;
  const stepX = plan.world.width / (columns - 1), stepY = plan.world.height / (rows - 1);
  const heightGrid = new Float32Array(rows * columns);
  const shades = new Float32Array(rows * columns);
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    heightGrid[row * columns + col] = elevation(plan, col * stepX, row * stepY);
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const west = Math.max(0, col - 1), east = Math.min(columns - 1, col + 1);
    const north = Math.max(0, row - 1), south = Math.min(rows - 1, row + 1);
    const dx = (heightGrid[row * columns + east] - heightGrid[row * columns + west]) / ((east - west) * stepX);
    const dy = (heightGrid[south * columns + col] - heightGrid[north * columns + col]) / ((south - north) * stepY);
    const incident = (KEY_LIGHT.z - KEY_LIGHT.x * dx - KEY_LIGHT.y * dy) / Math.sqrt(1 + dx * dx + dy * dy);
    shades[row * columns + col] = .98 + .61 * (incident - KEY_LIGHT.z);
  }
  for (let y = 0; y < height; y++) {
    const gy = y * (rows - 1) / height;
    const row = Math.floor(gy), v = gy - row;
    for (let x = 0; x < width; x++) {
      const gx = x * (columns - 1) / width;
      const col = Math.floor(gx), u = gx - col;
      const i = row * columns + col, below = i + columns;
      const top = shades[i] + (shades[i + 1] - shades[i]) * u;
      const bottom = shades[below] + (shades[below + 1] - shades[below]) * u;
      const light = top + (bottom - top) * v;
      const pixel = (y * width + x) * 4;
      pixels[pixel] = pixels[pixel] * light + 2;
      pixels[pixel + 1] = pixels[pixel + 1] * light;
      pixels[pixel + 2] = pixels[pixel + 2] * light + 1;
    }
  }
}

export function drawAntietamRelief(ctx, source, plan) {
  const { width, height } = plan.world;
  ctx.drawImage(source, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  shadeAntietamPixels(image.data, width, height, plan);
  ctx.putImageData(image, 0, 0);
}

function cornEdge(zone, x, fraction) {
  const p = distanceInto(zone, x);
  // An imperfect field boundary, with furrow ends following the headland.
  return zone.top + (zone.bottom - zone.top) * fraction + Math.sin(p * 4.1 - .3) * 10
    + Math.sin(p * 13) * 4 + p * 7;
}

function drawCornfield(ctx, zone, seed) {
  const left = zone.left + 12, right = zone.right - 12;
  ctx.save();
  ctx.beginPath();
  for (let x = left; x <= right; x += 8) {
    const y = cornEdge(zone, x, .075);
    if (x === left) ctx.moveTo(x, y + 9);
    else ctx.lineTo(x, y);
  }
  for (let x = right; x >= left; x -= 8) ctx.lineTo(x, cornEdge(zone, x, .82));
  ctx.closePath();
  ctx.clip();
  const headland = ctx.createLinearGradient(zone.left, zone.top, zone.right, zone.bottom);
  headland.addColorStop(0, 'rgba(131,112,52,.35)');
  headland.addColorStop(.36, 'rgba(141,115,53,.63)');
  headland.addColorStop(.79, 'rgba(150,123,66,.48)');
  headland.addColorStop(1, 'rgba(113,109,56,.34)');
  ctx.fillStyle = headland;
  ctx.fillRect(zone.left, zone.top, zone.right - zone.left, zone.bottom - zone.top);
  for (let row = 0; row < 16; row++) {
    const fraction = .09 + row * .046;
    for (let i = 0, x = left + 1; x < right; i++, x += 5.5) {
      const jitter = sceneryNoise(seed + 2 * row, i);
      if (jitter < .1) continue;
      const y = cornEdge(zone, x, fraction) + jitter * 2.9;
      const height = 2 + (jitter > .7 ? jitter * 7 : jitter * 4);
      ctx.fillStyle = 'rgba(60,57,30,.29)';
      ctx.fillRect(x + 1.1, y + .4, 2.6 + jitter * 2.5, 1.2);
      ctx.strokeStyle = jitter > .51 ? 'rgba(205,178,89,.67)' : 'rgba(163,143,65,.73)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 1.4 - jitter, y - height);
      ctx.lineTo(x - 3 - jitter, y - height * .64);
      ctx.stroke();
      ctx.fillStyle = 'rgba(204,181,91,.44)';
      ctx.fillRect(x - .5, y - height * .52, 2.3, 1);
    }
  }
  ctx.restore();
}

function traceBand(ctx, points, offsetTop, offsetBottom, seed) {
  ctx.beginPath();
  for (const [i, { x, y, halfWidth }] of points.entries()) {
    const edge = y - halfWidth * offsetTop * (.94 + .12 * sceneryNoise(seed, i));
    if (i === 0) ctx.moveTo(x, edge);
    else ctx.lineTo(x, edge);
  }
  for (let i = points.length - 1; i >= 0; i--) {
    const { x, y, halfWidth } = points[i];
    ctx.lineTo(x, y + halfWidth * offsetBottom * (.94 + .12 * sceneryNoise(seed + 3, i)));
  }
  ctx.closePath();
  ctx.fill();
}

function drawSurfaceBands(ctx, points, bands, seed) {
  for (const [top, bottom, rgb, opacity] of bands) {
    const gradient = ctx.createLinearGradient(points[0].x, 0, points.at(-1).x, 0);
    for (const [distance, factor] of [[0, 0], [.08, .36], [.2, 1], [.66, .92], [.8, 1], [.94, .31], [1, 0]]) {
      gradient.addColorStop(distance, `rgba(${rgb},${opacity * factor})`);
    }
    ctx.fillStyle = gradient;
    traceBand(ctx, points, top, bottom, seed);
  }
}

function drawSunkenRoad(ctx, zone, seed) {
  const into = x => distanceInto(zone, x);
  const count = Math.ceil((zone.right - zone.left) / 6);
  const points = Array.from({ length: count + 1 }, (_, i) => {
    const x = zone.left + (zone.right - zone.left) * i / count;
    const halfWidth = edgeTaper(into(x), .14) * (17 + 3 * Math.sin(i * .23) + sceneryNoise(seed + 5, i) * 2);
    return { x, y: laneBed(zone, x), halfWidth };
  });
  drawSurfaceBands(ctx, points, [
    [1.60, 1.65, '88,70,45', .09],
    [1.41, 1.47, '100,76,48', .13],
    [1.21, 1.26, '119,90,57', .18],
    [1.02, 1.08, '133,98,61', .32],
    [.94, .43, '58,45,33', .41],
    [.71, .85, '154,111,70', .30],
    [.57, .62, '156,116,75', .19],
  ], seed + 8);
  for (let i = 2; i < points.length - 2; i++) {
    const { x, y, halfWidth } = points[i];
    const alpha = edgeTaper(into(x), .24);
    for (let grit = 0; grit < 8; grit++) {
      const index = i * 8 + grit;
      const noise = sceneryNoise(seed + 13, index);
      const side = (sceneryNoise(seed + 17, index) * 2 - 1) * 1.3;
      ctx.fillStyle = grit % 3 === 0 ? `rgba(56,48,34,${.32 * alpha})` : `rgba(184,150,105,${.29 * alpha})`;
      ctx.fillRect(x + noise * 3, y + halfWidth * side, .5 + noise * 2.9, .65 + noise * .7);
    }
    // Discontinuous wheel marks stay in the lane bed. Evidence of traffic
    // is especially visible on the lighter bank opposite the shadow.
    const ahead = points[i + 1], rut = 4.8 + Math.sin(i * .17);
    for (const side of [-1, 1]) {
      const noise = sceneryNoise(seed + 22 + side, i);
      if (noise < .17) continue;
      ctx.strokeStyle = `rgba(64,48,31,${alpha * (.18 + .18 * noise)})`;
      ctx.lineWidth = .72 + noise * 1.18;
      ctx.beginPath();
      ctx.moveTo(x, y + rut * side);
      ctx.lineTo(ahead.x - .4, ahead.y + rut * side);
      ctx.stroke();
    }
  }
}

function drawApproach(ctx, x, approachStart, approachEnd, width, fadeFromTop, seed) {
  const wash = ctx.createLinearGradient(0, approachStart, 0, approachEnd);
  const shade = '152,131,92';
  wash.addColorStop(0, `rgba(${shade},${fadeFromTop ? 0 : .36})`);
  wash.addColorStop(.46, `rgba(${shade},.26)`);
  wash.addColorStop(1, `rgba(${shade},${fadeFromTop ? .36 : 0})`);
  ctx.fillStyle = wash;
  ctx.fillRect(x - width * .37, approachStart, width * .74, approachEnd - approachStart);
  drawNaturalRoad(ctx, { x, y: approachStart }, { x, y: approachEnd }, width, seed);
}

function drawCreek(ctx, plan, seed) {
  const { creek, crossing } = plan;
  const count = Math.ceil((creek.right - creek.left) / 5);
  const points = Array.from({ length: count + 1 }, (_, i) => {
    const x = creek.left + (creek.right - creek.left) * i / count;
    return antietamChannel(plan, x);
  });
  ctx.save();
  ctx.beginPath();
  ctx.rect(creek.left, creek.top, creek.right - creek.left, creek.bottom - creek.top);
  ctx.clip();
  drawSurfaceBands(ctx, points, [
    [1.44, 1.39, '62,66,40', .13],
    [1.29, 1.31, '86,83,54', .17],
    [1.12, 1.16, '125,116,74', .27],
    [1.02, 1.04, '72,77,57', .31],
    [.99, .98, '43,61,52', .74],
    [.79, .82, '55,79,70', .55],
    [.53, .65, '74,98,87', .41],
    [.27, .37, '101,119,99', .23],
  ], seed + 2);
  const bridgeX = middle(crossing.left, crossing.right);
  for (let i = 2; i < points.length - 2; i++) {
    const { x, y, halfWidth } = points[i];
    const alpha = edgeTaper(distanceInto(creek, x), .27);
    for (let silt = 0; silt < 10; silt++) {
      const index = i * 10 + silt;
      const noise = sceneryNoise(seed + 9, index);
      const side = silt % 2 === 0 ? -1 : 1;
      if (silt < 6) {
        ctx.fillStyle = silt % 3 === 0 ? `rgba(55,64,40,${.33 * alpha})` : `rgba(158,151,102,${.41 * alpha})`;
        ctx.fillRect(x + noise * 4, y + side * halfWidth * (.93 + .42 * noise), .7 + noise * 3.3, .65 + noise * .95);
      } else if (Math.abs(x - bridgeX) > 25 && noise > .24) {
        ctx.fillStyle = `rgba(164,181,151,${alpha * (.15 + noise * .12)})`;
        ctx.fillRect(x, y + (noise * 1.7 - .7) * halfWidth, 1.7 + noise * 5, .8);
      }
    }
  }
  ctx.restore();
  // Each approach stops at its bank; only the stone bridge spans water.
  const channel = antietamChannel(plan, bridgeX);
  const approachWidth = Math.min(34, (crossing.right - crossing.left) * .5);
  drawApproach(ctx, bridgeX, crossing.top - 32, channel.y - channel.halfWidth, approachWidth, true, seed + 29);
  drawApproach(ctx, bridgeX, channel.y + channel.halfWidth, crossing.bottom + 39, approachWidth, false, seed + 31);
}

export function drawAntietamGround(ctx, plan, seed) {
  drawCornfield(ctx, plan.corn, seed);
  drawSunkenRoad(ctx, plan.lane, seed + 17);
  drawCreek(ctx, plan, seed + 22);
}
