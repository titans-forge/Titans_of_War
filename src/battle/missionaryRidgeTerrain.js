import { sceneryNoise, stampScenery } from './realisticScenery.js';
import { BRAGG_HEADQUARTERS } from './missionaryRidgeArt.js';

const gaussian = value => Math.exp(-value * value);
const midX = zone => (zone.left + zone.right) / 2;
const midY = zone => (zone.top + zone.bottom) / 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function missionaryRidgeTerrainPlan(battle) {
  if (battle?.scenarioId !== 'missionary_ridge' || !battle.fieldBattle) return null;
  const get = name => battle.fieldBattle.zones.find(zone => zone.name === name);
  const orchard = get('Orchard Knob');
  const pits = get('West Rifle Pits');
  const slope = get('Western Slope');
  const crest = get('Crest Works');
  const spur = get('Eastern Spur');
  const road = get('Dalton Road');
  return orchard && pits && slope && crest && spur && road ? { world: battle.world, orchard, pits, slope, crest, spur, road } : null;
}

export function missionaryRidgeCrestX(plan, y) {
  return midX(plan.crest) - 9 + 16 * Math.sin(y / 154) + 8 * Math.cos(y / 54);
}

export function missionaryRidgeRoadY(road, x) {
  return midY(road) - 8 * Math.sin((road.right - x) / 66) + 3 * Math.sin((road.right - x) / 24);
}

export function missionaryRidgeElevation(plan, x, y) {
  const ridgeDistance = x - missionaryRidgeCrestX(plan, y);
  const ridgeFace = 126 * gaussian(ridgeDistance / (ridgeDistance < 0 ? 158 : 238));
  const { orchard, spur } = plan;
  const knob = 34 * gaussian((x - midX(orchard)) / 91) * gaussian((y - midY(orchard)) / 115);
  const rearRise = 28 * gaussian((x - midX(spur) - 43 * Math.sin(y / 125)) / 186)
    * gaussian((y - midY(spur)) / 186);
  const foldCenter = midX(plan.slope) + 24 * Math.sin(y / 106);
  const gullies = 18 * gaussian((x - foldCenter) / 109) * (.55 + .45 * Math.sin((y - (x - foldCenter) * .32) / 41));
  return ridgeFace + knob + rearRise - gullies + 4 * Math.sin(x / 186 - y / 165);
}

function paintRelief(ctx, source, plan) {
  const { width, height } = plan.world;
  ctx.drawImage(source, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height);
  const { data } = pixels;
  const tile = 5;
  for (let y = 0; y < height; y += tile) for (let x = 0; x < width; x += tile) {
    const dx = (missionaryRidgeElevation(plan, x + 8, y) - missionaryRidgeElevation(plan, x - 8, y)) / 16;
    const dy = (missionaryRidgeElevation(plan, x, y + 8) - missionaryRidgeElevation(plan, x, y - 8)) / 16;
    const light = clamp(.94 + .47 * (dx - .42 * dy) / Math.hypot(1, dx, dy), .69, 1.22);
    const heightTint = .04 * clamp(missionaryRidgeElevation(plan, x, y) / 132, 0, 1);
    const fine = .03 * Math.sin(x / 62 + y / 103) - .017 * Math.cos(y / 51 - x / 131);
    for (let row = y; row < Math.min(y + tile, height); row++) for (let col = x; col < Math.min(x + tile, width); col++) {
      const p = (row * width + col) * 4;
      const red = data[p], green = data[p + 1], blue = data[p + 2];
      const neutral = red * .30 + green * .52 + blue * .18;
      data[p] = (red * .76 + neutral * .24) * (light + fine + heightTint) + 9;
      data[p + 1] = (green * .73 + neutral * .27) * (light + fine) + 3;
      data[p + 2] = (blue * .68 + neutral * .32) * (light + fine - heightTint) + 4;
    }
  }
  ctx.putImageData(pixels, 0, 0);
}

function strokePath(ctx, points, layers) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [width, style, offset = 0] of layers) {
    ctx.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x + offset, y);
      else ctx.lineTo(x + offset, y);
    });
    ctx.lineWidth = width;
    ctx.strokeStyle = style;
    ctx.stroke();
  }
}

function dressEarthworks(ctx, points, seed) {
  const tones = ['rgba(39,31,23,.43)', 'rgba(169,144,93,.40)', 'rgba(203,186,140,.40)', 'rgba(87,64,42,.49)'];
  for (let index = 0; index < points.length - 1; index++) {
    const [x, y] = points[index];
    const [nextX, nextY] = points[index + 1];
    const length = Math.hypot(nextX - x, nextY - y);
    const sidewaysX = (nextY - y) / length;
    const sidewaysY = (x - nextX) / length;
    for (let grain = 0; grain < 13; grain++) {
      const key = index * 13 + grain;
      const along = sceneryNoise(seed + 1, key);
      const shoulder = (sceneryNoise(seed + 6, key) - .5) * 22;
      const px = x + (nextX - x) * along + sidewaysX * shoulder;
      const py = y + (nextY - y) * along + sidewaysY * shoulder;
      ctx.fillStyle = tones[key % tones.length];
      ctx.fillRect(px, py, .7 + 3.3 * sceneryNoise(seed + 13, key), .55 + 1.7 * sceneryNoise(seed + 22, key));
    }
  }
}

function paintWorks(ctx, plan, seed) {
  const layers = [
    [23, 'rgba(54,49,33,.27)', 2], [16, 'rgba(117,102,78,.87)'], [10, '#493c2c', 2],
    [4, 'rgba(169,148,109,.78)', -6], [1.5, 'rgba(193,174,132,.49)', -7],
  ];
  for (const [zone, center, phase] of [
    [plan.pits, y => midX(plan.pits) + 8 * Math.sin(y / 31) + 6 * Math.cos(y / 67), 4],
    [plan.crest, y => missionaryRidgeCrestX(plan, y) - 10, 17],
  ]) {
    for (let segment = 0, start = zone.top + 17; start < zone.bottom - 30; segment++) {
      const end = Math.min(zone.bottom - 9, start + 49 + 53 * sceneryNoise(seed + phase, segment));
      const points = [];
      for (let y = start; y <= end; y += 6) {
        points.push([center(y) + 6 * (sceneryNoise(seed + phase + segment, y) - .5), y]);
      }
      strokePath(ctx, points, layers);
      dressEarthworks(ctx, points, seed + phase + segment);
      start = end + 14 + 15 * sceneryNoise(seed + phase + 6, segment);
    }
  }
  const { orchard } = plan;
  const hillX = midX(orchard), hillY = midY(orchard);
  // A broken curving bank evokes the surviving works on Orchard Knob.
  for (const [first, last] of [[-.52, .26], [.47, 1.26], [2.18, 2.93], [3.16, 3.7]]) {
    const arc = [];
    for (let a = first; a <= last; a += .07) {
      const r = 1 + .055 * Math.sin(a * 16 + 1);
      arc.push([hillX + 63 * r * Math.cos(a), hillY + 67 * r * Math.sin(a)]);
    }
    strokePath(ctx, arc, [[16, 'rgba(54,49,33,.34)'], [11, '#6b5a41'], [4, '#43382a'], [2, '#a18c65', -4]]);
    dressEarthworks(ctx, arc, seed + Math.round(first * 10));
  }
}

function paintRoad(ctx, plan, seed) {
  const { road } = plan;
  const points = [];
  for (let x = road.left; x <= road.right + 4; x += 5) points.push([x, missionaryRidgeRoadY(road, x)]);
  strokePath(ctx, points, [[35, 'rgba(95,77,52,.26)'], [28, 'rgba(145,124,87,.66)'], [18, 'rgba(177,153,109,.52)']]);
  for (const offset of [-6, 6]) {
    const ruts = points.map(([x, y]) => [x, y + offset + 1.2 * Math.sin(x / 18 + offset)]);
    strokePath(ctx, ruts, [[1.8, 'rgba(77,57,37,.39)']]);
  }
  for (let index = 0; index < 860; index++) {
    const x = road.left + (road.right - road.left) * sceneryNoise(seed + 4, index);
    const y = missionaryRidgeRoadY(road, x) + 25 * (sceneryNoise(seed + 10, index) - .5);
    ctx.fillStyle = index % 3 ? 'rgba(203,183,147,.28)' : 'rgba(62,46,32,.24)';
    ctx.fillRect(x, y, 1 + sceneryNoise(seed + 12, index) * 1.6, .8);
  }
}

export function missionaryRidgeTrees(plan, seed) {
  const { world, orchard, pits, crest, road } = plan;
  const trees = [];
  for (let y = 27, row = 0; y < world.height - 22; y += 27, row++) {
    for (let x = 22, col = 0; x < world.width - 24; x += 26, col++) {
      const key = row * 101 + col;
      const px = x + 23 * (sceneryNoise(seed + 4, key) - .5);
      const py = y + 24 * (sceneryNoise(seed + 8, key) - .5);
      const size = 23 + 23 * sceneryNoise(seed + 19, key);
      if (Math.abs(px - missionaryRidgeCrestX(plan, py)) < 56) continue;
      if (px + size / 2 > pits.left && px - size / 2 < pits.right && py > pits.top - 20 && py < pits.bottom + 20) continue;
      if (Math.abs(px - BRAGG_HEADQUARTERS.x) < BRAGG_HEADQUARTERS.width / 2 + size
        && Math.abs(py - BRAGG_HEADQUARTERS.y) < BRAGG_HEADQUARTERS.height / 2 + size) continue;
      if (px + size / 2 > road.left && Math.abs(py - missionaryRidgeRoadY(road, px)) < 22 + size / 2) continue;
      const knobCore = Math.hypot((px - midX(orchard)) / 1.06, (py - midY(orchard)) / 1.25);
      if (knobCore < 73) continue;
      const eastWoods = px > crest.right + 64;
      const southGully = px > 738 && px < 921 && py > 674;
      const northGully = px > 730 && px < 899 && py < 183;
      const valleyMargin = px < 155 || py < 92 || py > world.height - 70;
      const variation = .15 * Math.sin(px / 52 + py / 63) + .12 * Math.cos(py / 41 - px / 69);
      const density = eastWoods ? .47 + variation
        : southGully || northGully ? .26 + variation
          : valleyMargin ? .25 + variation
            : knobCore < 118 ? .25 : .012;
      if (sceneryNoise(seed + 23, key) > density) continue;
      const species = sceneryNoise(seed + 25, key);
      trees.push({ x: px, y: py, size, type: species < .50 ? 'oak' : species < .77 ? 'poplar' : 'cedar', flip: key % 2 !== 0 });
    }
  }
  return trees.sort((a, b) => a.y - b.y);
}

export function drawMissionaryRidgeTerrain(scene, ctx, source, plan, seed) {
  paintRelief(ctx, source, plan);
  ctx.save();
  paintRoad(ctx, plan, seed);
  paintWorks(ctx, plan, seed);
  ctx.restore();

  const { x, y } = BRAGG_HEADQUARTERS;
  const yard = ctx.createRadialGradient(x, y + 14, 10, x, y + 14, 78);
  yard.addColorStop(0, 'rgba(167,141,97,.57)');
  yard.addColorStop(1, 'rgba(167,141,97,0)');
  ctx.fillStyle = yard;
  ctx.fillRect(x - 80, y - 66, 160, 162);
  for (const tree of missionaryRidgeTrees(plan, seed)) {
    ctx.beginPath();
    ctx.ellipse(tree.x + 9, tree.y + 8, tree.size * .48, tree.size * .26, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(24,32,22,.33)';
    ctx.fill();
    stampScenery(scene, ctx, 'foliage', tree.type, tree.x - tree.size / 2, tree.y - tree.size * .71,
      tree.size, tree.size * .91, tree.flip);
  }
}
