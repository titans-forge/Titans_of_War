import {
  SECOND_TEXAS_LUNETTE, vicksburgGroundZones, vicksburgGullyX, vicksburgRailY, vicksburgRedoubtFaces,
} from './vicksburgArt.js';
import { sceneryNoise, stampScenery } from './realisticScenery.js';

const falloff = (dx, dy) => Math.exp(-(dx * dx + dy * dy));
const centerX = zone => (zone.left + zone.right) / 2;
const centerY = zone => (zone.top + zone.bottom) / 2;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export function vicksburgTerrainPlan(engine) {
  if (engine.scenarioId !== 'vicksburg') return null;
  const zones = vicksburgGroundZones(engine.fieldBattle);
  return zones ? { world: engine.world, ...zones } : null;
}

export function vicksburgElevation({ rail, redoubt, approach }, x, y) {
  const rx = x - centerX(redoubt), ry = y - centerY(redoubt);
  const railDistance = y - vicksburgRailY(rail, x);
  const strongpoint = 104 * falloff((rx + .24 * ry) / 186, ry / 251);
  const shoulder = 36 * falloff((x - 485 + .27 * (y - 565)) / 201, (y - 565) / 245);
  const opposingRidge = 51 * falloff((x - 1307 - .46 * (y - 391)) / 202, (y - 391) / 235);
  const oppositeBank = 41 * falloff((x - 1072) / 454, (railDistance - 107) / 52);
  const railCut = 42 * falloff(railDistance / 68, (x - 828) / 775);
  const ravine = 45 * falloff((x - vicksburgGullyX(approach, y)) / 69, (y - 481) / 295);
  const northernDraw = 28 * falloff((x - (560 + y * .22)) / 78, (y - 188) / 152);
  const minorFolds = Math.sin(x / 69 - y / 104) * Math.cos(y / 90) * 5;
  return strongpoint + shoulder + opposingRidge + oppositeBank - railCut - ravine - northernDraw + minorFolds;
}

function paintRelief(ctx, source, plan) {
  const { width, height } = plan.world;
  ctx.drawImage(source, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;
  const tile = 5;
  for (let x = 0; x < width; x += tile) {
    const sx = x + tile / 2;
    const railY = vicksburgRailY(plan.rail, sx);
    for (let y = 0; y < height; y += tile) {
      const sy = y + tile / 2;
      const rise = vicksburgElevation(plan, sx, sy);
      const slope = vicksburgElevation(plan, sx + 8, sy + 13) - vicksburgElevation(plan, sx - 8, sy - 13);
      const distance = Math.abs(sy - railY);
      const bankShoulder = 44 + 5 * Math.sin(sx / 53) + 3 * Math.cos(sx / 23 + sy / 21);
      const bank = falloff((distance - bankShoulder) / 15, (sx - 864) / 680);
      const floorShadow = falloff((distance - 21) / 21, (sx - 855) / 697);
      const shade = .92 + clamp(slope * .022, -.23, .21) + clamp(rise * .0014, -.055, .115) - floorShadow * .17;
      const scallop = .59 + .22 * Math.sin(sx / 47 + sy / 22) + .15 * Math.cos(sx / 23 - sy / 87);
      const bare = clamp((Math.abs(slope) - 3) * .029 + bank * .79, 0, .87) * scallop;
      for (let py = y; py < Math.min(height, y + tile); py++) {
        for (let px = x; px < Math.min(width, x + tile); px++) {
          const offset = (py * width + px) * 4;
          data[offset] = data[offset] * shade * (1 - bare) + 169 * bare;
          data[offset + 1] = data[offset + 1] * shade * (1 - bare) + 136 * bare;
          data[offset + 2] = data[offset + 2] * shade * (1 - bare) + 90 * bare;
        }
      }
    }
  }
  ctx.putImageData(image, 0, 0);
}

function strokeLayers(ctx, points, layers) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const { x, y } of points.slice(1)) ctx.lineTo(x, y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [width, color] of layers) {
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
}

function drawTracks(ctx, { rail, world }, seed) {
  const railY = x => vicksburgRailY(rail, x);
  const points = [];
  for (let x = 0; x <= world.width; x += 8) points.push({ x, y: railY(x) });
  strokeLayers(ctx, points, [[55, '#7c63416c'], [42, '#513d294f'], [32, '#79634aa3'], [24, '#746556d9']]);
  for (let x = 4; x < world.width; x += 10) {
    const y = railY(x);
    const theta = Math.atan2(railY(x + 6) - railY(x - 6), 12);
    const wear = sceneryNoise(seed + 16, x);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(theta + .08 * (wear - .5));
    ctx.fillStyle = '#34291fd9';
    ctx.fillRect(-3, -10, 5.5, 20 + wear * 3);
    ctx.fillStyle = wear > .68 ? '#9b876bd6' : '#6e5a468c';
    ctx.fillRect(-2.4, -9.9, 2.8, 19 + wear * 3);
    ctx.restore();
  }
  for (const side of [-1, 1]) {
    const shifted = points.map(({ x, y }) => ({ x, y: y + side * 7.3 }));
    strokeLayers(ctx, shifted, [[3.1, '#343335'], [1.2, '#b9af9a']]);
  }
}

function outlineTexture(scene, ctx, points, width, seed) {
  strokeLayers(ctx, points, [[width + 10, '#6a523b53'], [width - 2, '#b48c63be'], [width - 10, '#59442eab']]);
  for (const [index, end] of points.slice(1).entries()) {
    const start = points[index];
    const dx = end.x - start.x, dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    const count = Math.ceil(length / 55);
    const theta = Math.atan2(dy, dx);
    for (let i = 0; i < count; i++) {
      const u = (i + .5) / count;
      const wear = sceneryNoise(seed + index, i);
      const cutWidth = width * (.84 + .17 * wear);
      ctx.save();
      ctx.translate(start.x + u * dx, start.y + u * dy);
      ctx.rotate(theta + .09 * (wear - .5));
      stampScenery(scene, ctx, 'earthworks', 'trench', -length / (2 * count) - 3,
        -cutWidth * .52, length / count + 6, cutWidth, false, true);
      ctx.restore();
    }
  }
}

function paintRedoubt(scene, ctx, { redoubt, breach }, seed) {
  const faces = vicksburgRedoubtFaces(redoubt);
  const x = centerX(redoubt), y = centerY(redoubt);
  const yard = ctx.createRadialGradient(x, y, 28, x, y, 121);
  yard.addColorStop(0, '#9f826769');
  yard.addColorStop(.65, '#a0846252');
  yard.addColorStop(1, '#a0846200');
  ctx.fillStyle = yard;
  ctx.fillRect(redoubt.left, redoubt.top, redoubt.right - redoubt.left, redoubt.bottom - redoubt.top);
  for (const [index, face] of faces.entries()) outlineTexture(scene, ctx, face, 29, seed + index);
  const gap = ctx.createRadialGradient(centerX(breach), centerY(breach), 3, centerX(breach), centerY(breach), 39);
  gap.addColorStop(0, '#ad89628c');
  gap.addColorStop(1, '#ad896200');
  ctx.fillStyle = gap;
  ctx.fillRect(breach.left - 11, breach.top - 10, 77, 93);
  for (let i = 0; i < 33; i++) {
    const rx = sceneryNoise(seed + 37, i), ry = sceneryNoise(seed + 41, i);
    ctx.save();
    ctx.translate(centerX(breach) + 49 * (rx - .5), centerY(breach) + 53 * (ry - .5));
    ctx.rotate(2 * (rx - ry));
    ctx.fillStyle = i % 3 ? '#8d694aa2' : '#554435ba';
    ctx.fillRect(0, 0, 1.3 + rx * 7, 1.1 + ry * 3);
    ctx.restore();
  }
}

function paintOutworks(scene, ctx, { interior }, seed) {
  const { x, y } = SECOND_TEXAS_LUNETTE;
  const lunette = [[-54, -46], [-20, -51], [18, -36], [41, -12], [44, 13], [27, 38], [-15, 53], [-51, 44]]
    .map(([dx, dy]) => ({ x: x + dx, y: y + dy }));
  outlineTexture(scene, ctx, lunette, 19, seed + 10);
  const rearwardLine = [[.18, .18], [.44, .27], [.59, .45], [.38, .57], [.47, .77], [.66, .90]]
    .map(([u, v]) => ({ x: interior.left + u * (interior.right - interior.left), y: interior.top + v * (interior.bottom - interior.top) }));
  outlineTexture(scene, ctx, rearwardLine, 18, seed + 14);
}

export function vicksburgTrees(plan, seed) {
  const trees = [];
  for (let y = 21, row = 0; y < plan.world.height; y += 27, row++) {
    for (let x = 21, col = 0; x < plan.world.width; x += 27, col++) {
      const marker = row * 97 + col;
      const px = x + 23 * (sceneryNoise(seed + 2, marker) - .5);
      const py = y + 23 * (sceneryNoise(seed + 3, marker) - .5);
      const size = 26 + sceneryNoise(seed + 8, marker) * 30;
      const railDelta = py - vicksburgRailY(plan.rail, px);
      const edge = px < 143 || px > 1500 || py < 78 || py > 829;
      const nearCut = Math.abs(railDelta) > 38 && Math.abs(railDelta) < 105 && py > 665;
      const behindWorks = px < 317 && py < 368;
      const density = edge ? .54 : nearCut ? .23 : behindWorks ? .15 : .003;
      if (Math.abs(railDelta) < 28 + size / 2 || sceneryNoise(seed + 11, marker) > density) continue;
      const nearWork = [plan.redoubt, plan.interior, plan.breach].some(zone => px > zone.left - size / 2
        && px < zone.right + size / 2 && py > zone.top - size / 2 && py < zone.bottom + size / 2);
      if (nearWork || Math.hypot(px - SECOND_TEXAS_LUNETTE.x, py - SECOND_TEXAS_LUNETTE.y) < 83) continue;
      trees.push({ x: px, y: py, size, kind: marker % 4 === 0 ? 'poplar' : 'oak', flip: marker % 2 === 0 });
    }
  }
  return trees.sort((a, b) => a.y - b.y);
}

function paintLooseSoil(ctx, plan, seed) {
  // Scattered disturbed soil emphasizes the steep ground without a solid
  // line that could be confused with the edges of the simulation zones.
  for (let i = 0; i < 335; i++) {
    const x = 95 + sceneryNoise(seed + 39, i) * (plan.world.width - 190);
    const variation = sceneryNoise(seed + 51, i);
    const railY = vicksburgRailY(plan.rail, x);
    const y = railY + (i % 2 ? -1 : 1) * (35 + 28 * variation);
    ctx.fillStyle = i % 4 === 0 ? '#5b4a3770' : '#b2966c7b';
    ctx.fillRect(x, y, 1.1 + 4.3 * variation, 1.2 + variation);
  }
  for (let i = 0; i < 41; i++) {
    const y = 300 + 310 * sceneryNoise(seed + 62, i);
    const x = vicksburgGullyX(plan.approach, y) + 89 * (sceneryNoise(seed + 72, i) - .5);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-.53);
    ctx.fillStyle = i % 4 ? '#8a745648' : '#bc9d6453';
    ctx.fillRect(0, 0, 2.2, 6 + sceneryNoise(seed + 77, i) * 8);
    ctx.restore();
  }
}

export function drawVicksburgTerrain(scene, ctx, source, plan, seed) {
  paintRelief(ctx, source, plan);
  ctx.save();
  paintLooseSoil(ctx, plan, seed);
  drawTracks(ctx, plan, seed);
  paintRedoubt(scene, ctx, plan, seed);
  paintOutworks(scene, ctx, plan, seed);
  for (const tree of vicksburgTrees(plan, seed)) {
    ctx.beginPath();
    ctx.ellipse(tree.x + 8, tree.y + 5, tree.size * .47, tree.size * .31, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#27301f53';
    ctx.fill();
    stampScenery(scene, ctx, 'foliage', tree.kind, tree.x - tree.size / 2, tree.y - tree.size * .74,
      tree.size, tree.size * .90, tree.flip);
  }
  ctx.restore();
}
