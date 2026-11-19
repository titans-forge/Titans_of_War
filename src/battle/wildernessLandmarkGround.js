import { landmarkSurroundings } from './landmarkSurroundings.js';
import { drawNaturalRoad, sceneryNoise, stampScenery } from './realisticScenery.js';

export function wildernessLandmarkGround(engine) {
  const { zones, landmarks = [] } = engine.fieldBattle;
  const roads = engine.config.movement?.roadBands || [];
  const route = zones.find(zone => zone.kind === 'road' && zone.name === 'Orange Plank Road');
  const mainRoad = route && roads.find(road => road.axis === 'y'
    && road.value === (route.top + route.bottom) / 2);
  const clearing = zones.find(zone => zone.kind === 'clearing' && zone.name === 'Tapp farm clearing');
  const woods = zones.find(zone => zone.kind === 'woods' && zone.name === 'Wilderness thickets');
  const house = landmarks.find(site => site.id === 'widow-tapp-house');
  const surroundings = house && landmarkSurroundings({ id: house.id, mapRules: engine.battleRulesVersion });
  if (!mainRoad || !clearing || !surroundings || !woods) return null;
  return { route, mainRoad, clearing, house, surroundings, woods, roads, ...engine.world };
}

const unit = value => Math.min(1, Math.max(0, value));

function roadClearance(roads, x, y) {
  return Math.min(...roads.map(road => Math.abs((road.axis === 'x' ? x : y) - road.value) - road.width));
}

function clearingClearance(clearing, x, y) {
  return Math.hypot(Math.max(clearing.left - x, x - clearing.right, 0),
    Math.max(clearing.top - y, y - clearing.bottom, 0));
}

export function wildernessWoodlandWeight({ woods, clearing, roads }, x, y) {
  const edge = Math.min(x - woods.left, woods.right - x, y - woods.top, woods.bottom - y);
  const scallop = 15 + 14 * Math.sin(x / 61 + y / 90) ** 2 + 9 * Math.sin(x / 34 - y / 100) ** 2;
  const border = unit((edge - 5) / scallop);
  const openings = unit(clearingClearance(clearing, x, y) / 40)
    * unit((roadClearance(roads, x, y) + 13) / 28);
  const stand = .70 + .14 * Math.sin(x / 95 + y / 44) + .13 * Math.cos(x / 63 - y / 71)
    + .08 * Math.sin(x / 23 - y / 36);
  return border * openings * unit(stand);
}

export function wildernessCrownBounds({ x, y, size }) {
  // Include both the raised canopy image and its offset ground shadow.
  return { left: x - size / 2, right: x + size / 2 + 7, top: y - size * .75, bottom: y + size * .38 + 8 };
}

export function wildernessCrowns(plan, seed) {
  const { woods, roads, clearing } = plan;
  const trees = [];
  for (let y = woods.top + 17, row = 0; y < woods.bottom; y += 31, row++) {
    for (let x = woods.left + 17, col = 0; x < woods.right; x += 31, col++) {
      const i = row * 89 + col;
      const px = x + 25 * (sceneryNoise(seed + 5, i) - .5);
      const py = y + 25 * (sceneryNoise(seed + 19, i) - .5);
      const weight = wildernessWoodlandWeight(plan, px, py);
      if (sceneryNoise(seed + 37, i) > weight * .91) continue;
      const form = sceneryNoise(seed + 12, i);
      const size = 29 + form * 44;
      const { left, right, top, bottom } = wildernessCrownBounds({ x: px, y: py, size });
      if (left <= woods.left || right >= woods.right || top <= woods.top || bottom >= woods.bottom) continue;
      if (left < clearing.right && right > clearing.left && top < clearing.bottom && bottom > clearing.top) continue;
      if (roads.some(road => {
        const [start, end] = road.axis === 'x' ? [left, right] : [top, bottom];
        return start < road.value + road.width && end > road.value - road.width;
      })) continue;
      const species = sceneryNoise(seed + 44, i);
      const kind = form < .28 ? 'scrub' : species < .44 ? 'oak' : species < .73 ? 'poplar' : 'cedar';
      trees.push({ x: px, y: py, size, kind, flip: i % 2 === 0 });
    }
  }
  return trees.sort((a, b) => a.y - b.y);
}

function tintWoodlandFloor(ctx, source, plan) {
  const { width, height, woods } = plan;
  ctx.drawImage(source, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;
  const tile = 5;
  for (let y = woods.top; y < woods.bottom; y += tile) {
    for (let x = woods.left; x < woods.right; x += tile) {
      const sx = x + tile / 2, sy = y + tile / 2;
      const weight = wildernessWoodlandWeight(plan, sx, sy);
      if (weight <= .012) continue;
      const mottling = .69 + .15 * Math.sin(sx / 47 + sy / 61) + .11 * Math.sin(sx / 23 - sy / 37);
      const shade = weight * mottling;
      const fallenLeaves = weight * (.5 + .5 * Math.cos(sx / 46 - sy / 23));
      for (let py = y; py < Math.min(woods.bottom, y + tile); py++) {
        for (let px = x; px < Math.min(woods.right, x + tile); px++) {
          const key = (py * width + px) * 4;
          data[key] = data[key] * (1 - shade * .49) + fallenLeaves * 11;
          data[key + 1] = data[key + 1] * (1 - shade * .48) + fallenLeaves * 4;
          data[key + 2] = data[key + 2] * (1 - shade * .34) + fallenLeaves * 3;
        }
      }
    }
  }
  ctx.putImageData(image, 0, 0);
}

function scatterFallenLeaves(ctx, plan, seed) {
  const { woods } = plan;
  for (let i = 0; i < 1420; i++) {
    const x = woods.left + sceneryNoise(seed + 63, i) * (woods.right - woods.left);
    const y = woods.top + sceneryNoise(seed + 77, i) * (woods.bottom - woods.top);
    const weight = wildernessWoodlandWeight(plan, x, y);
    if (weight < .36) continue;
    const size = sceneryNoise(seed + 82, i);
    ctx.fillStyle = i % 3 ? '#a28a5276' : '#4036237d';
    ctx.fillRect(x, y, 1.4 + size * 2.6, 1.1 + size);
  }
}

export function drawWildernessWoodland(scene, ctx, source, plan, seed) {
  tintWoodlandFloor(ctx, source, plan);
  ctx.save();
  scatterFallenLeaves(ctx, plan, seed);
  const trees = wildernessCrowns(plan, seed);
  for (const tree of trees) {
    ctx.beginPath();
    ctx.ellipse(tree.x + 6, tree.y + 8, tree.size * .5, tree.size * .31, -.13, 0, Math.PI * 2);
    ctx.fillStyle = '#19251a3c';
    ctx.fill();
  }
  for (const tree of trees) {
    stampScenery(scene, ctx, 'foliage', tree.kind, tree.x - tree.size / 2, tree.y - tree.size * .75,
      tree.size, tree.size * .89, tree.flip);
  }
  ctx.restore();
}

function wash(ctx, x, y, radiusX, radiusY, color, strength) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(radiusX, radiusY);
  const gradient = ctx.createRadialGradient(0, 0, .16, 0, 0, 1);
  gradient.addColorStop(0, `rgba(${color},${strength})`);
  gradient.addColorStop(.6, `rgba(${color},${strength * .74})`);
  gradient.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

function drawFarmClearing(ctx, { house, clearing, surroundings }, seed) {
  const { left, top, right, bottom } = clearing;
  const width = right - left;
  const height = bottom - top;
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();
  wash(ctx, left + width * .48, top + height * .55, width * .55, height * .56, '181,165,105', .62);
  wash(ctx, left + width * .68, top + height * .62, width * .39, height * .45, '161,153,91', .40);
  wash(ctx, house.x + 4, house.y + 25, house.artWidth * .54, 38, '158,123,77', .64);
  wash(ctx, house.x + 7, house.y + 17, house.width * .66, house.height * .48, '45,38,24', .30);
  ctx.restore();

  // Connect the farm lane that already runs from the yard to the fast road.
  const { lanes, plot } = surroundings;
  wash(ctx, plot.x + plot.width / 2, plot.y + plot.height / 2, plot.width * .52, plot.height * .49, '124,96,59', .29);
  ctx.save();
  ctx.strokeStyle = 'rgba(86,70,46,.24)';
  ctx.lineWidth = 1.35;
  for (let y = plot.y + 15; y < plot.y + plot.height - 12; y += 7) {
    ctx.beginPath();
    ctx.moveTo(plot.x + 12, y + 4);
    ctx.lineTo(plot.x + plot.width - 9, y - 4);
    ctx.stroke();
  }
  for (const lane of lanes) {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(169,133,83,.55)';
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(lane[0].x, lane[0].y);
    for (const point of lane.slice(1)) ctx.lineTo(point.x, point.y);
    ctx.stroke();
    for (let index = 1; index < lane.length; index++) {
      drawNaturalRoad(ctx, lane[index - 1], lane[index], 13, seed + index);
    }
  }
  ctx.restore();
}

function fillRoadStrip(ctx, length, radius, color, seed) {
  const edge = (x, side) => side * (radius + (sceneryNoise(seed + side, x) - .5) * 4.4)
    + Math.sin(x * .014) * 1.5 + Math.sin(x * .033) * .8;
  ctx.beginPath();
  ctx.moveTo(0, edge(0, -1));
  for (let x = 14; x < length; x += 14) ctx.lineTo(x, edge(x, -1));
  ctx.lineTo(length, edge(length, -1));
  for (let x = length; x > 0; x -= 14) ctx.lineTo(x, edge(x, 1));
  ctx.lineTo(0, edge(0, 1));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawWornSurface(ctx, width, radius, seed) {
  // Broader soil stains preserve the grass and gravel detail of the base plate.
  for (let i = 0; i < 62; i++) {
    const x = sceneryNoise(seed, i) * width;
    const y = (sceneryNoise(seed + 1, i) - .5) * radius * 1.42;
    const warm = i % 3 === 0;
    wash(ctx, x, y, 11 + sceneryNoise(seed + 2, i) * 29, 2 + sceneryNoise(seed + 3, i) * 5,
      warm ? '200,161,105' : '82,66,45', warm ? .23 : .16);
  }
  for (let i = 0; i < width * .9; i++) {
    const x = sceneryNoise(seed + 4, i) * width;
    const y = (sceneryNoise(seed + 5, i) - .5) * radius * 1.58;
    ctx.fillStyle = i % 3 ? 'rgba(75,61,44,.12)' : 'rgba(203,174,125,.19)';
    ctx.fillRect(x, y, .7 + sceneryNoise(seed + 6, i) * 1.6, .8);
  }
  for (const track of [-1, 1]) {
    const rut = x => track * radius * .35 + Math.sin(x * .024) * .9 + Math.sin(x * .009 + track) * 1.2;
    ctx.lineWidth = 1.4;
    for (let x = 0, i = 0; x < width; x += 11, i++) {
      const strength = sceneryNoise(seed + track, i);
      if (strength < .18) continue;
      const end = Math.min(width, x + 8 + strength * 3);
      ctx.beginPath();
      ctx.moveTo(x, rut(x));
      ctx.lineTo(end, rut(end));
      ctx.strokeStyle = `rgba(71,54,37,${.07 + strength * .14})`;
      ctx.stroke();
    }
  }
}

function drawPlankRemnants(ctx, width, radius, seed) {
  // The road originally had one wooden lane. By 1864 it was in disrepair.
  // These remaining patches suggest its construction without mapping specific boards.
  const patches = [[.08, 8], [.26, 6], [.43, 7], [.59, 10], [.79, 6], [.91, 8]];
  for (const [index, [position, count]] of patches.entries()) {
    const jitter = sceneryNoise(seed, index);
    ctx.save();
    ctx.translate(width * position, -radius * (.49 + jitter * .22));
    ctx.rotate((jitter - .5) * .13);
    for (let i = 0, x = 0; i < count; i++) {
      const variation = sceneryNoise(seed + index + 31, i);
      const boardWidth = 2.7 + variation * 2.2;
      if (variation < .84) {
        const edge = (variation - .5) * 5;
        const length = radius * (.49 + variation * .25);
        ctx.fillStyle = 'rgba(62,49,35,.29)';
        ctx.fillRect(x + 1, edge + 1, boardWidth, length);
        ctx.fillStyle = `rgba(138,125,103,${.32 + variation * .26})`;
        ctx.fillRect(x, edge, boardWidth, length);
      }
      x += boardWidth + 1.2;
    }
    ctx.restore();
  }
}

function drawPlankRoad(ctx, { route, mainRoad, width }, seed) {
  const y = mainRoad.value;
  const radius = Math.min(mainRoad.width, (route.bottom - route.top) / 2);
  ctx.save();
  ctx.translate(0, y);
  ctx.beginPath();
  ctx.rect(0, -radius, width, radius * 2);
  ctx.clip();
  fillRoadStrip(ctx, width, radius - 4, 'rgba(121,99,65,.18)', seed);
  fillRoadStrip(ctx, width, radius - 7, 'rgba(166,130,86,.39)', seed + 1);
  fillRoadStrip(ctx, width, radius - 10, 'rgba(182,145,93,.33)', seed + 2);
  fillRoadStrip(ctx, width, radius - 13, 'rgba(190,151,95,.19)', seed + 3);
  drawWornSurface(ctx, width, radius, seed + 13);
  drawPlankRemnants(ctx, width, radius, seed + 29);
  ctx.restore();
}

export function drawWildernessLandmarkGround(ctx, plan, seed) {
  drawFarmClearing(ctx, plan, seed);
  drawPlankRoad(ctx, plan, seed + 11);
}
