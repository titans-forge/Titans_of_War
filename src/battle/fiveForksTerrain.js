import { sceneryNoise, stampScenery } from './realisticScenery.js';
import { BURNT_QUARTER } from './fiveForksArt.js';

const midpoint = (a, b) => (a + b) / 2;
const clamp = (value, lower, upper) => Math.max(lower, Math.min(upper, value));
const bell = value => Math.exp(-value * value);
const point = (x, y) => ({ x, y });

export function fiveForksTerrainPlan(battle) {
  if (battle.scenarioId !== 'five_forks' || !battle.fieldBattle) return null;
  const { zones } = battle.fieldBattle;
  const find = (kind, name) => zones.find(zone => zone.kind === kind && name.test(zone.name));
  const whiteOak = find('road', /White Oak/i);
  const ford = find('road', /Ford/i);
  const line = find('earthworks', /White Oak/i);
  const angle = find('earthworks', /Angle/i);
  const woods = find('woods', /pine/i);
  if (!whiteOak || !ford || !line || !angle || !woods) return null;
  const { world } = battle;
  const x = midpoint(ford.left, ford.right), y = midpoint(whiteOak.top, whiteOak.bottom);
  const junction = point(x, y);
  // The three through roads are compressed into the tactical board. The two
  // southern spokes and the farm lane are scenery. Rules use the authored road bands.
  const roads = [
    { width: 33, path: [point(-25, y - 6), point(202, y + 5), point(472, y - 6), junction,
      point(1012, y + 3), point(1266, y - 3), point(world.width + 24, y + 5)] },
    { width: 31, path: [point(x - 2, -26), point(x - 6, 89), point(x + 8, 225),
      point(x - 3, 350), junction] },
    { width: 24, path: [junction, point(x + 24, 548), point(x + 67, 695), point(x + 134, world.height + 18)] },
    { width: 20, path: [junction, point(x - 66, 536), point(x - 125, 655),
      point(x - 201, 765), point(x - 360, world.height + 30)] },
    { width: 9, path: [point(530, y - 3), point(514, 478), point(BURNT_QUARTER.x + 11, BURNT_QUARTER.y + 12)] },
  ];
  const bendX = midpoint(angle.left, angle.right), bed = midpoint(line.top, line.bottom);
  const works = [
    [point(line.left + 10, bed + 7), point(492, bed - 3), point(639, bed + 1), point(ford.left - 5, bed - 2)],
    [point(ford.right + 7, bed + 3), point(914, bed - 4), point(996, bed + 3),
      point(bendX, bed), point(bendX + 1, midpoint(angle.top, angle.bottom)), point(bendX + 11, angle.top + 12)],
  ];
  return { world, junction, roads, works, woods, clearings: zones.filter(zone => zone.kind === 'clearing') };
}

function elevation(plan, x, y) {
  const saddle = plan.junction.y - 35 + 21 * Math.sin(x / 240) - 8 * Math.sin(x / 71);
  const ridge = 42 * bell((y - saddle) / 117) * (.83 + .17 * Math.cos((x - 722) / 230));
  const northKnoll = 27 * bell((x - 1138) / 270) * bell((y - 174) / 116);
  const farmHill = 19 * bell((x - 478) / 187) * bell((y - 520) / 133);
  const dampSwell = 16 * bell((y - 696 - (x - 800) * .12) / 75);
  return ridge + northKnoll + farmHill - dampSwell + 4 * Math.sin(x / 82 + y / 69);
}

function paintGround(ctx, source, plan) {
  const { width, height } = plan.world;
  ctx.drawImage(source, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;
  const step = 5;
  // Relief is much lower-frequency than the source grain, so shade in strips.
  for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
    const dx = (elevation(plan, x + 6, y) - elevation(plan, x - 6, y)) / 12;
    const dy = (elevation(plan, x, y + 6) - elevation(plan, x, y - 6)) / 12;
    const light = clamp(.92 + (.34 * dx + .57 * dy) / Math.hypot(1, dx, dy), .68, 1.2);
    const cool = .54 + .46 * Math.cos(x / 240 + .7) * Math.cos(y / 197);
    for (let row = y; row < Math.min(y + step, height); row++) for (let col = x; col < Math.min(x + step, width); col++) {
      const pixel = (row * width + col) * 4;
      data[pixel] = data[pixel] * light + 8 - cool * 8;
      data[pixel + 1] = data[pixel + 1] * light + cool * 6;
      data[pixel + 2] = data[pixel + 2] * light + 2 + cool * 9;
    }
  }
  ctx.putImageData(image, 0, 0);
}

function pathSamples(path, step = 6) {
  const samples = [];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const span = Math.hypot(b.x - a.x, b.y - a.y);
    const count = Math.ceil(span / step);
    const normalX = (a.y - b.y) / span, normalY = (b.x - a.x) / span;
    for (let j = i === 1 ? 0 : 1; j <= count; j++) {
      const t = j / count;
      samples.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, normalX, normalY });
    }
  }
  return samples;
}

function trace(ctx, samples, width, color, offset = 0) {
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.beginPath();
  for (const [i, pos] of samples.entries()) {
    const x = offset ? pos.x + offset * pos.normalX : pos.x;
    const y = offset ? pos.y + offset * pos.normalY : pos.y;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
}

function distToPath(x, y, path) {
  let distance = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = clamp(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy), 0, 1);
    distance = Math.min(distance, Math.hypot(a.x + t * dx - x, a.y + t * dy - y));
  }
  return distance;
}

function drawRoutes(ctx, plan, seed) {
  const roads = plan.roads.map((road, i) => ({
    ...road,
    samples: pathSamples(road.path).map((pos, j) => {
      const drift = Math.sin(j * .19 + i) * 1.12 + (sceneryNoise(seed + i, j) - .5) * 1.8;
      return { ...pos, x: pos.x + pos.normalX * drift, y: pos.y + pos.normalY * drift };
    }),
  }));
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // Paint each coat across the entire junction to avoid seams between spokes.
  for (const [scale, color] of [
    [1.4, 'rgba(71,60,44,.22)'], [1.22, 'rgba(118,96,67,.45)'],
    [1.02, 'rgba(169,145,105,.61)'], [.77, 'rgba(193,168,130,.40)'],
    [.51, 'rgba(200,179,142,.35)'],
  ]) for (const road of roads) trace(ctx, road.samples, road.width * scale, color);
  for (const [i, road] of roads.entries()) {
    for (const [j, pos] of road.samples.entries()) {
      const scatter = sceneryNoise(seed + 7 + i, j);
      if (Math.hypot(pos.x - plan.junction.x, pos.y - plan.junction.y) > 35 && scatter > .25) {
        for (const side of [-1, 1]) {
          trace(ctx, road.samples.slice(j, j + 2), 1.5 + scatter, 'rgba(76,61,42,.23)', road.width * .22 * side);
        }
      }
      for (let k = 0; k < 6; k++) {
        const offset = (sceneryNoise(seed + 26 + i, j * 8 + k) - .5) * road.width;
        ctx.fillStyle = k % 3 ? 'rgba(78,61,43,.15)' : 'rgba(229,205,162,.34)';
        ctx.fillRect(pos.x + pos.normalX * offset, pos.y + pos.normalY * offset, .8 + 1.6 * scatter, 1.2);
      }
    }
  }
  ctx.restore();
}

function drawFields(ctx, clearings, seed) {
  for (const [fieldIndex, z] of clearings.entries()) {
    const width = z.right - z.left, height = z.bottom - z.top;
    const cx = midpoint(z.left, z.right), cy = midpoint(z.top, z.bottom);
    const falloff = ctx.createRadialGradient(cx, cy, 8, cx, cy, Math.max(width, height) * .54);
    falloff.addColorStop(0, 'rgba(159,126,77,.49)');
    falloff.addColorStop(.70, 'rgba(139,118,68,.26)');
    falloff.addColorStop(1, 'rgba(139,118,68,0)');
    ctx.fillStyle = falloff;
    ctx.fillRect(z.left - 12, z.top - 12, width + 24, height + 24);
    for (let row = 0; row < 18; row++) {
      const t = row / 17, length = width * Math.sin((.07 + t * .87) * Math.PI) * .40;
      const y = z.top + height * (.12 + t * .73);
      for (let x = cx - length, j = 0; x < cx + length; x += 7, j++) {
        const grit = sceneryNoise(seed + fieldIndex * 23 + row, j);
        if (grit < .26) continue;
        ctx.fillStyle = grit > .75 ? 'rgba(190,160,106,.34)' : 'rgba(91,74,45,.26)';
        ctx.fillRect(x, y + Math.sin(x / 44) * 2 + (x - cx) * .11, 2 + grit * 3, .6 + grit * .8);
      }
    }
  }
}

function drawWorks(ctx, paths, seed) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const [i, path] of paths.entries()) {
    const line = pathSamples(path, 4).map((pos, j) => {
      const edge = (sceneryNoise(seed + i + 37, j) - .5) * 4 + Math.sin(j * .15) * 1.7;
      return { ...pos, x: pos.x + pos.normalX * edge, y: pos.y + pos.normalY * edge };
    });
    for (const [width, color, offset] of [
      [28, 'rgba(47,40,29,.29)', 5], [24, 'rgba(106,77,49,.58)', 3],
      [14, 'rgba(142,105,65,.79)', -4], [6, 'rgba(48,39,29,.89)', 0],
      [3, 'rgba(174,139,89,.87)', -1],
    ]) trace(ctx, line, width, color, offset);
    for (const [j, pos] of line.entries()) {
      const timber = sceneryNoise(seed + 12 + i, j);
      if (j % 3 === 0) trace(ctx, [pos, point(pos.x - pos.normalX * 6, pos.y - pos.normalY * 6)], 2, '#6f573b');
      for (let k = 0; k < 6; k++) {
        const spread = (sceneryNoise(seed + 23 + k, j) - .5) * 28;
        ctx.fillStyle = timber < .45 ? 'rgba(226,181,112,.31)' : 'rgba(51,42,29,.29)';
        ctx.fillRect(pos.x + pos.normalX * spread, pos.y + pos.normalY * spread, 1 + timber * 2.8, 1.2);
      }
    }
  }
  ctx.restore();
}

export function fiveForksTrees(plan, seed) {
  const { woods, clearings } = plan;
  const trees = [];
  for (let row = 0, i = 0, y = woods.top + 23; y < woods.bottom - 16; row++, y += 25) {
    for (let x = woods.left + 18; x < woods.right - 16; x += 24, i++) {
      const variant = sceneryNoise(seed + 3, i), draw = sceneryNoise(seed + 17, i);
      const px = x + (sceneryNoise(seed + 9, i) - .5) * 27, py = y + (sceneryNoise(seed + 14, i) - .5) * 24;
      const density = .47 + .18 * Math.sin(px / 97 + py / 68) + .21 * Math.cos(px / 183 - py / 88)
        - .13 * Number(row === 0 || px < woods.left + 54 || py > woods.bottom - 47);
      if (draw > density) continue;
      const size = 25 + sceneryNoise(seed + 25, i) * 32, radius = size * .44;
      if (plan.roads.some(road => distToPath(px, py, road.path) < road.width / 2 + radius + 3)) continue;
      if (plan.works.some(path => distToPath(px, py, path) < radius + 13)) continue;
      if (Math.abs(px - BURNT_QUARTER.x) < BURNT_QUARTER.width / 2 + radius + 4
        && Math.abs(py - BURNT_QUARTER.y) < BURNT_QUARTER.height / 2 + radius + 5) continue;
      if (clearings.some(z => {
        const u = (px - midpoint(z.left, z.right)) / ((z.right - z.left) * .53);
        const v = (py - midpoint(z.top, z.bottom)) / ((z.bottom - z.top) * .53);
        return u * u + v * v < 1 + .12 * Math.sin(px / 31 + py / 50);
      })) continue;
      trees.push({ x: px, y: py, size, variant: variant < .47 ? 'cedar' : variant < .79 ? 'oak' : variant < .93 ? 'poplar' : 'scrub',
        flip: variant < .27 || variant > .62 });
    }
  }
  return trees.sort((a, b) => a.y - b.y);
}

function drawTrees(scene, ctx, plan, seed) {
  for (const { x, y, size, variant, flip } of fiveForksTrees(plan, seed)) {
    const w = variant === 'poplar' ? size * .72 : size;
    const h = variant === 'cedar' ? size * 1.14 : size;
    ctx.fillStyle = 'rgba(32,37,21,.34)';
    ctx.beginPath();
    ctx.ellipse(x + 6, y + 8, w * .49, h * .35, .3, 0, Math.PI * 2);
    ctx.fill();
    stampScenery(scene, ctx, 'foliage', variant, x - w / 2, y - h / 2, w, h, flip);
  }
}

export function drawFiveForksTerrain(scene, ctx, source, plan, seed) {
  paintGround(ctx, source, plan);
  drawFields(ctx, plan.clearings, seed);
  drawRoutes(ctx, plan, seed);
  drawWorks(ctx, plan.works, seed);
  drawTrees(scene, ctx, plan, seed);
}
