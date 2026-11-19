import { KOLB_FARMHOUSE, kennesawGroundZones, kennesawWorksPath } from './kennesawArt.js';
import { sceneryNoise, stampScenery } from './realisticScenery.js';

const midX = zone => (zone.left + zone.right) / 2;
const midY = zone => (zone.top + zone.bottom) / 2;
const falloff = (dx, dy) => Math.exp(-(dx * dx + dy * dy));

export function kennesawTerrainPlan(battle) {
  if (battle.scenarioId !== 'kennesaw_mountain') return null;
  const zones = kennesawGroundZones(battle.fieldBattle);
  return zones ? { world: battle.world, ...zones } : null;
}

export function kennesawRoadX(road, y) {
  const dy = y - midY(road);
  return midX(road) + .76 * dy + .00044 * dy * dy + 3.8 * Math.sin(dy / 27);
}

function ravineProfile(ravine, x, y) {
  const dy = y - midY(ravine);
  const creekBedX = midX(ravine) + dy * .23 + 24 * Math.sin(dy / 72);
  return falloff((x - creekBedX) / 64, dy / 218);
}

export function kennesawElevation({ hill, ravine }, x, y) {
  const dx = x - midX(hill), dy = y - midY(hill);
  const cheatham = 81 * falloff((dx - 63 + dy * .19) / 197, dy / 249);
  const north = 34 * falloff((x - 1050) / 212, (y - 110) / 180);
  const southernKnolls = 22 * falloff((x - 835) / 237, (y - 825) / 115);
  const ravineCut = 32 * ravineProfile(ravine, x, y);
  const folds = 3.5 * Math.sin(x / 78 + y / 103) * Math.cos(y / 96);
  return cheatham + north + southernKnolls - ravineCut + folds;
}

function paintRelief(ctx, source, plan) {
  const { width, height } = plan.world;
  ctx.drawImage(source, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;
  const tile = 5;
  for (let y = 0; y < height; y += tile) {
    for (let x = 0; x < width; x += tile) {
      const sx = x + tile / 2, sy = y + tile / 2;
      const rise = kennesawElevation(plan, sx, sy);
      const westSample = kennesawElevation(plan, sx - 12, sy - 8);
      const eastSample = kennesawElevation(plan, sx + 12, sy + 8);
      const slope = eastSample - westSample;
      const shade = .94 + Math.max(-.23, Math.min(.22, slope * .035)) + Math.max(0, rise) * .0008;
      const ravine = ravineProfile(plan.ravine, sx, sy);
      const brokenSlope = .56 + .23 * Math.sin(sx / 56 + sy / 29) + .14 * Math.cos(sx / 35 - sy / 63);
      const clay = Math.min(1, Math.max(0, slope * .14)) * brokenSlope;
      for (let py = y; py < Math.min(height, y + tile); py++) {
        for (let px = x; px < Math.min(width, x + tile); px++) {
          const i = (py * width + px) * 4;
          data[i] = data[i] * shade + clay * 29 - ravine * 28;
          data[i + 1] = data[i + 1] * shade + clay * 8 - ravine * 18;
          data[i + 2] = data[i + 2] * shade - clay * 8 - ravine * 11;
        }
      }
    }
  }
  ctx.putImageData(image, 0, 0);
}

function strokePath(ctx, points, layers) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [width, color] of layers) {
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
}

function paintRoad(ctx, { road, world }, seed) {
  const points = [];
  const start = road.top - 78;
  for (let y = start; y <= world.height + 10; y += 5) {
    points.push({ x: kennesawRoadX(road, y), y });
  }
  strokePath(ctx, points, [
    [31, '#8e735442'], [23, '#8f7352a8'], [16, '#bc936bc9'], [9, '#caa578b0'],
  ]);
  for (const offset of [-5, 5]) {
    strokePath(ctx, points.map(point => ({ ...point, x: point.x + offset })), [[2, '#71543867']]);
  }
  for (let i = 0; i < 112; i++) {
    const y = start + sceneryNoise(seed + 13, i) * (world.height - start);
    const x = kennesawRoadX(road, y) + (sceneryNoise(seed + 67, i) - .5) * 24;
    ctx.fillStyle = i % 3 === 0 ? '#b2916b8a' : '#6a50355e';
    ctx.fillRect(x, y, 2 + sceneryNoise(seed + 11, i) * 3, 1.3);
  }
}

function paintWorks(scene, ctx, plan, seed) {
  const anchors = kennesawWorksPath(plan);
  const points = [anchors[0]];
  for (const [index, end] of anchors.slice(1).entries()) {
    const { x, y } = anchors[index];
    const count = Math.ceil(Math.hypot(end.x - x, end.y - y) / 7);
    for (let i = 1; i <= count; i++) {
      const u = i / count;
      points.push({ x: x + (end.x - x) * u, y: y + (end.y - y) * u + (i === count ? 0 : 3.8 * (sceneryNoise(seed + index, i) - .5)) });
    }
  }
  const offset = (dx, dy) => points.map(({ x, y }) => ({ x: x + dx, y: y + dy }));
  strokePath(ctx, offset(-4, -2), [[28, '#72583b38'], [16, '#6c503c6e'], [8, '#483526a0']]);
  strokePath(ctx, points, [[14, '#905f46a0'], [8, '#ab745290']]);

  // Dapple the parapet and excavated ditch with the existing keyed earthwork
  // texture. The overlapping pieces taper toward each end of the line.
  for (const [index, end] of anchors.slice(1).entries()) {
    const start = anchors[index];
    const dx = end.x - start.x, dy = end.y - start.y;
    const theta = Math.atan2(dy, dx);
    const length = Math.hypot(dx, dy);
    const shoulder = index === 0 || index === anchors.length - 2;
    const wear = sceneryNoise(seed + 34, index);
    const width = (shoulder ? 16 : 24) + 6 * wear;
    ctx.save();
    ctx.translate((start.x + end.x) / 2, (start.y + end.y) / 2);
    ctx.rotate(theta);
    ctx.globalAlpha = shoulder ? .60 : .94;
    stampScenery(scene, ctx, 'earthworks', 'trench', -length / 2 - 4, -width * .5,
      length + 8, width, false, true);
    ctx.restore();
  }

  for (const [index, {x, y}] of points.slice(1).entries()) {
    const { x: lastX, y: lastY } = points[index];
    const theta = Math.atan2(y - lastY, x - lastX);
    const wear = sceneryNoise(seed + 78, index);
    const side = index % 2 ? 1 : -1;
    ctx.save();
    ctx.translate((x + lastX) / 2, (y + lastY) / 2);
    ctx.rotate(theta);
    ctx.fillStyle = wear > .58 ? '#be8d5e84' : '#67553d80';
    ctx.fillRect(-2.9, side * (9 + 7 * wear), 2.4 + 3.5 * wear, 1.3 + wear * 2);
    if (wear > .79) {
      ctx.fillStyle = '#54402bce';
      ctx.fillRect(-2.3, -7 - wear, 4.7, 2.6);
    }
    ctx.restore();
  }
}

function paintSlopeDetail(ctx, plan, seed) {
  const { ravine, hill } = plan;
  const strata = [ravine, hill];
  for (const [stratum, zone] of strata.entries()) {
    for (let i = 0; i < 64; i++) {
      const x = zone.left + sceneryNoise(seed + 97 + stratum, i) * (zone.right - zone.left);
      const y = zone.top + sceneryNoise(seed + 33 + stratum, i) * (zone.bottom - zone.top);
      if (stratum === 0 && ravineProfile(ravine, x, y) < .43) continue;
      const size = 1.5 + sceneryNoise(seed + 51, i) * 4.9;
      ctx.beginPath();
      ctx.ellipse(x + 1.6, y + 1.1, size, size * .52, -.38, 0, 2 * Math.PI);
      ctx.fillStyle = '#3c35276b';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x, y, size * .87, size * .39, -.38, 0, 2 * Math.PI);
      ctx.fillStyle = i % 3 === 0 ? '#b5a694aa' : '#877e6d92';
      ctx.fill();
    }
  }
}

export function kennesawTrees(plan, seed) {
  const { world, ravine, road, works, hill } = plan;
  const trees = [];
  for (let y = 24, row = 0; y < world.height - 20; y += 29, row++) {
    for (let x = 24, col = 0; x < world.width - 20; x += 29, col++) {
      const key = row * 97 + col;
      const px = x + 24 * (sceneryNoise(seed + 9, key) - .5);
      const py = y + 24 * (sceneryNoise(seed + 19, key) - .5);
      const size = 26 + sceneryNoise(seed + 29, key) * 29;
      const radius = size / 2;
      if (py >= road.top - 95 && Math.abs(px - kennesawRoadX(road, py)) < 17 + radius) continue;
      if (Math.hypot((px - KOLB_FARMHOUSE.x) * .8, py - KOLB_FARMHOUSE.y) < 96 + radius) continue;
      if (px > works.left - 18 - radius && py > works.top - 28 - radius
        && px < works.right + 60 + radius && py < hill.bottom + radius) continue;
      const west = px < 225 + 70 * Math.sin(py / 153);
      const north = py < 140 + 70 * Math.sin(px / 156);
      const east = px > 1460 + 42 * Math.cos(py / 61);
      const draw = ravineProfile(ravine, px, py);
      const woodedApproach = py < ravine.top + 8 && px > ravine.left - 28 && px < hill.left - 115;
      const wooded = west || east || north || woodedApproach;
      const density = (wooded ? .48 : .042) + draw * .67;
      if (sceneryNoise(seed + 48, key) >= density) continue;
      const species = sceneryNoise(seed + 64, key);
      trees.push({ x: px, y: py, size, type: species < .54 ? 'oak' : species < .87 ? 'poplar' : 'cedar', flip: key % 2 !== 0 });
    }
  }
  return trees.sort((a, b) => a.y - b.y);
}

function paintFarmClearing(ctx) {
  const { x, y } = KOLB_FARMHOUSE;
  const yard = ctx.createRadialGradient(x, y + 23, 6, x, y + 23, 106);
  yard.addColorStop(0, '#b08a60b0');
  yard.addColorStop(.6, '#9f875060');
  yard.addColorStop(1, '#9f875000');
  ctx.fillStyle = yard;
  ctx.fillRect(x - 107, y - 84, 214, 213);
  strokePath(ctx, [
    { x: x - 64, y: y + 45 }, { x: x - 24, y: y + 47 }, { x: x + 4, y: y + 58 },
    { x: x + 20, y: y + 80 }, { x: x + 41, y: y + 115 }, { x: x + 74, y: y + 164 },
  ], [[12, '#88684829'], [6, '#b1966a94']]);
}

export function drawKennesawTerrain(scene, ctx, source, plan, seed) {
  paintRelief(ctx, source, plan);
  ctx.save();
  paintRoad(ctx, plan, seed);
  paintFarmClearing(ctx);
  paintSlopeDetail(ctx, plan, seed);
  paintWorks(scene, ctx, plan, seed);
  for (const tree of kennesawTrees(plan, seed)) {
    ctx.beginPath();
    ctx.ellipse(tree.x + 7, tree.y + 5, tree.size * .46, tree.size * .32, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#20302046';
    ctx.fill();
    stampScenery(scene, ctx, 'foliage', tree.type, tree.x - tree.size / 2, tree.y - tree.size * .75,
      tree.size, tree.size * .91, tree.flip);
  }
  ctx.restore();
}
