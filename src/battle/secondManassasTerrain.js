import { sceneryNoise, stampScenery } from './realisticScenery.js';
import { SECOND_MANASSAS_HOUSES } from './secondManassasArt.js';

const mid = (a, b) => (a + b) / 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const bell = value => Math.exp(-value * value);
const smooth = value => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

export function secondManassasTerrainPlan(battle) {
  if (battle?.scenarioId !== 'second_manassas' || !battle.fieldBattle) return null;
  const { world, fieldBattle } = battle;
  const cut = fieldBattle.zones.find(zone => zone.name === 'Unfinished Railroad · Deep Cut');
  const pike = fieldBattle.zones.find(zone => zone.name === 'Warrenton Turnpike');
  const ridge = fieldBattle.zones.find(zone => zone.name === 'Chinn Ridge');
  if (!cut || !pike || !ridge) return null;
  const midPike = mid(pike.top, pike.bottom);
  const road = [
    [-10, midPike], [250, midPike - 1], [540, midPike - 3], [720, midPike + 6],
    [955, midPike - 6], [1140, midPike - 18], [world.width + 10, midPike - 20],
  ];
  return {
    world, cut, pike, ridge, road,
    woods: fieldBattle.zones.filter(zone => zone.kind === 'woods'),
    roads: [
      { path: road, width: 31 },
      { path: [[540, midPike - 3], [518, 405], [520, 346]], width: 14 },
      { path: [[1140, midPike - 18], [1128, 338], [1154, 175], [1166, -10]], width: 16 },
      { path: [[1140, midPike - 18], [1151, 571], [1193, 717], [1223, world.height + 10]], width: 16 },
    ],
  };
}

// The north-east scar is an unfinished grade. The deepest part cuts Stony
// Ridge around the tactical sector while the two ends taper into grassy fill.
export function secondManassasGrade(x) {
  const along = (x - 250) / 590;
  const taper = smooth(along / .13) * smooth((1 - along) / .14);
  const swell = Math.sin(along * Math.PI) ** 2;
  return {
    y: 405 - 295 * along + 50 * swell,
    halfWidth: taper * (12 + 18 * swell),
    depth: taper * (13 + 31 * swell),
  };
}

function elevation(plan, x, y, grade) {
  const crest = mid(plan.ridge.left, plan.ridge.right) - 17 * Math.sin(y / 76);
  const ridgeRise = 69 * bell((x - crest) / 117) * bell((y - mid(plan.ridge.top, plan.ridge.bottom)) / 174);
  const bench = 34 * bell((x - 560) / 286) * bell((y - 307 + x * .13) / 136);
  const rolls = 9 * Math.cos(x / 140 + y / 121) + 7 * Math.sin(y / 118 - x / 177);
  const excavation = grade.depth * bell((y - grade.y) / (17 + grade.halfWidth * .48));
  return ridgeRise + bench + rolls - excavation;
}

function bakeRelief(ctx, source, plan) {
  const { width, height } = plan.world;
  ctx.drawImage(source, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;
  const step = 5;
  for (let x = 0; x < width; x += step) {
    const grade = secondManassasGrade(x);
    const gradeWest = secondManassasGrade(x - 6), gradeEast = secondManassasGrade(x + 6);
    for (let y = 0; y < height; y += step) {
      const dx = (elevation(plan, x + 6, y, gradeEast) - elevation(plan, x - 6, y, gradeWest)) / 12;
      const dy = (elevation(plan, x, y + 6, grade) - elevation(plan, x, y - 6, grade)) / 12;
      const light = clamp(.98 + (.59 * dx + .48 * dy) / Math.hypot(1, dx, dy), .56, 1.28);
      const rise = bell((x - 1060) / 297) * bell((y - 670) / 248);
      const shadow = bell((x - 500) / 327) * bell((y - 268) / 163);
      for (let row = y; row < Math.min(y + step, height); row++) for (let col = x; col < Math.min(x + step, width); col++) {
        const i = (row * width + col) * 4;
        data[i] = data[i] * light + 12 * rise - 8 * shadow;
        data[i + 1] = data[i + 1] * light + 4 * rise - 2 * shadow;
        data[i + 2] = data[i + 2] * light + 2 + 7 * shadow;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
}

function gradeEdge(ctx, direction, offset, seed, reverse = false) {
  const step = reverse ? -5 : 5;
  for (let x = reverse ? 840 : 250; x >= 250 && x <= 840; x += step) {
    const grade = secondManassasGrade(x);
    const texture = (sceneryNoise(seed, x) - .5) * 4.2 * grade.halfWidth / 30;
    ctx.lineTo(x, grade.y + direction * (grade.halfWidth * offset + texture));
  }
}

function drawCut(ctx, seed) {
  // Irregular earthen shoulders, sharply shaded faces and an exposed bed.
  // All marks are earth layers, scree or brush. No ties or steel were laid.
  for (const [near, far, color] of [
    [1.48, 1.45, 'rgba(63,57,39,.30)'],
    [1.18, 1.10, 'rgba(108,81,51,.74)'],
    [1.05, -.39, 'rgba(153,115,76,.68)'],
    [-.38, 1.04, 'rgba(62,47,34,.83)'],
    [.43, .27, '#74604b'],
    [.24, .13, 'rgba(167,137,102,.29)'],
  ]) {
    ctx.beginPath();
    ctx.moveTo(250, 405);
    gradeEdge(ctx, 1, near, seed);
    gradeEdge(ctx, -1, far, seed + 1, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  for (let i = 0; i < 1940; i++) {
    const x = 251 + 588 * sceneryNoise(seed + 12, i);
    const grade = secondManassasGrade(x);
    const depth = (sceneryNoise(seed + 15, i) - .5) * 2.53;
    const y = grade.y + depth * grade.halfWidth;
    const size = .7 + sceneryNoise(seed + 42, i) * 3.8;
    ctx.fillStyle = i % 5 === 0 ? 'rgba(174,157,119,.58)' : depth > 0 ? 'rgba(86,63,46,.40)' : 'rgba(50,42,30,.49)';
    ctx.fillRect(x, y, size, .5 + (i % 3) * .66);
  }
}

function traceRoad(ctx, path, offset) {
  ctx.beginPath();
  path.forEach(([x, y], index) => index ? ctx.lineTo(x, y + offset) : ctx.moveTo(x, y + offset));
  ctx.stroke();
}

function drawRoad(ctx, path, width, seed) {
  ctx.save();
  ctx.lineJoin = 'round';
  for (const [factor, color] of [
    [1.1, 'rgba(92,76,53,.22)'], [.99, 'rgba(132,107,74,.47)'],
    [.78, 'rgba(171,145,105,.56)'], [.52, 'rgba(192,167,123,.29)'],
  ]) {
    ctx.lineWidth = width * factor;
    ctx.strokeStyle = color;
    traceRoad(ctx, path, 0);
  }
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, ay] = path[i], [bx, by] = path[i + 1];
    const length = Math.hypot(bx - ax, by - ay);
    const normalX = (ay - by) / length, normalY = (bx - ax) / length;
    const dx = (bx - ax) / length, dy = (by - ay) / length;
    for (let step = 0; step < length; step += 4) {
      const n = i * 800 + step;
      const edge = (sceneryNoise(seed + 7, n) - .5) * width * .94;
      const x = ax + step * dx + edge * normalX;
      const y = ay + step * dy + edge * normalY;
      ctx.fillStyle = n % 3 ? 'rgba(91,72,48,.18)' : 'rgba(227,203,151,.34)';
      ctx.fillRect(x, y, 2.3, 1.1);
    }
    for (const rut of [-width * .18, width * .18]) {
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = 'rgba(98,80,53,.28)';
      traceRoad(ctx, [[ax + normalX * rut, ay + normalY * rut], [bx + normalX * rut, by + normalY * rut]], 0);
    }
  }
  ctx.restore();
}

function distanceToRoad(x, y, path) {
  let min = Infinity;
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1], [bx, by] = path[i];
    const dx = bx - ax, dy = by - ay;
    const fraction = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1);
    min = Math.min(min, Math.hypot(x - ax - dx * fraction, y - ay - dy * fraction));
  }
  return min;
}

export function secondManassasTrees(plan, seed) {
  const trees = [];
  for (const [index, zone] of plan.woods.entries()) {
    for (let y = zone.top + 23, row = 0; y < zone.bottom - 20; y += 25, row++) {
      for (let x = zone.left + 24, col = 0; x < zone.right - 20; x += 23, col++) {
        const i = index * 2200 + row * 76 + col;
        const px = x + 19 * (sceneryNoise(seed + 8, i) - .5);
        const py = y + 18 * (sceneryNoise(seed + 11, i) - .5);
        const size = 28 + sceneryNoise(seed + 20, i) * 31, radius = size * .51;
        const grade = secondManassasGrade(px);
        if (sceneryNoise(seed + 24, i) > .67 + .16 * Math.sin(px / 90 + py / 104)) continue;
        if (grade.halfWidth && Math.abs(py - grade.y) < grade.halfWidth * 1.45 + radius + 9) continue;
        if (plan.roads.some(road => distanceToRoad(px, py, road.path) < road.width / 2 + radius)) continue;
        if (SECOND_MANASSAS_HOUSES.some(house => Math.abs(px - house.x) < house.width / 2 + radius
          && Math.abs(py - house.y) < house.height / 2 + radius)) continue;
        const type = sceneryNoise(seed + 30, i);
        trees.push({ x: px, y: py, size, type: type < .49 ? 'oak' : type < .7 ? 'cedar' : 'poplar', flip: type > .53 });
      }
    }
  }
  return trees.sort((a, b) => a.y - b.y);
}

export function drawSecondManassasTerrain(scene, ctx, source, plan, seed) {
  bakeRelief(ctx, source, plan);
  drawCut(ctx, seed);
  for (const [i, road] of plan.roads.entries()) drawRoad(ctx, road.path, road.width, seed + i);
  for (const house of SECOND_MANASSAS_HOUSES) {
    const yard = ctx.createRadialGradient(house.x, house.y + 13, 6, house.x, house.y + 13, house.width * .52);
    yard.addColorStop(0, 'rgba(155,126,85,.40)');
    yard.addColorStop(1, 'rgba(155,126,85,0)');
    ctx.fillStyle = yard;
    ctx.fillRect(house.x - house.width / 2, house.y - house.height / 2, house.width, house.height * 1.45);
  }
  for (const { x, y, size, type, flip } of secondManassasTrees(plan, seed)) {
    ctx.beginPath();
    ctx.ellipse(x + 6, y + 9, size * .46, size * .36, .19, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(35,44,24,.29)';
    ctx.fill();
    stampScenery(scene, ctx, 'foliage', type, x - size / 2, y - size / 2, size, size, flip);
  }
}
