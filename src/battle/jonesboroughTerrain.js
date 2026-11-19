import { sceneryNoise, stampScenery } from './realisticScenery.js';
import { jonesboroughSites, WARREN_HOUSE } from './jonesboroughArt.js';

const mid = (one, two) => (one + two) / 2;
const bell = value => Math.exp(-value * value);
const clamp = (number, min, max) => Math.max(min, Math.min(max, number));

export function jonesboroughTerrainPlan(battle) {
  if (battle?.scenarioId !== 'jonesborough' || !battle.fieldBattle) return null;
  const { world, fieldBattle } = battle;
  const { zones } = fieldBattle;
  const zone = name => zones.find(area => area.name === name);
  const rail = zone('Rail embankment');
  const crossing = zone('Rail crossing');
  const river = zone('Flint River');
  const road = zone('Lovejoy Road');
  const works = zone('Warren House salient');
  const depot = jonesboroughSites(fieldBattle).find(site => site.id === 'old-depot-site');
  if (!rail || !crossing || !river || !road || !works || !depot) return null;
  return {
    world, rail, river, crossing, road, works, depot,
    railX: mid(rail.left, rail.right),
    crossingY: mid(crossing.top, crossing.bottom),
    roadX: mid(road.left, road.right),
    woods: zones.filter(area => area.kind === 'woods'),
    clearings: zones.filter(area => area.kind === 'clearing'),
  };
}

export function flintRiverX(plan, y) {
  const progress = y / plan.world.height;
  const meander = .55 * Math.sin(10.6 * progress + .44) + .31 * Math.cos(17.5 * progress - .31)
    + .14 * Math.sin(28 * progress);
  return mid(plan.river.left, plan.river.right) + (plan.river.right - plan.river.left) * .19 * meander;
}

function heightAt(plan, x, y) {
  const floodplain = 24 * bell((x - flintRiverX(plan, y)) / 125);
  const terrace = 28 * bell((x - 480 - Math.sin(y / 145) * 65) / 190);
  const townRise = 26 * bell((x - 1080) / 400) * bell((y - 415) / 295);
  const baseSlope = (x / plan.world.width) * 27 + 5 * Math.sin(x / 103 + y / 120);
  const bank = 11 * bell((x - plan.railX) / 19) * (1 - .82 * bell((y - plan.crossingY) / 56));
  return baseSlope + townRise + terrace + bank - floodplain;
}

function paintGround(ctx, source, plan) {
  const { width, height } = plan.world;
  ctx.drawImage(source, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;
  const step = 5;
  for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
    const dx = (heightAt(plan, x + 7, y) - heightAt(plan, x - 7, y)) / 14;
    const dy = (heightAt(plan, x, y + 7) - heightAt(plan, x, y - 7)) / 14;
    const light = clamp(.97 + (.48 * dx + .32 * dy) / Math.hypot(1, dx, dy), .76, 1.19);
    const wet = bell((x - flintRiverX(plan, y)) / 141);
    const clay = bell((y - plan.crossingY - Math.sin(x / 135) * 38) / 184) * bell((x - 1140) / 330);
    for (let row = y; row < Math.min(y + step, height); row++) for (let col = x; col < Math.min(x + step, width); col++) {
      const i = (row * width + col) * 4;
      data[i] = data[i] * light + 7 * clay - wet * 10;
      data[i + 1] = data[i + 1] * light - 4 * clay + wet * 1;
      data[i + 2] = data[i + 2] * light - 5 * clay + wet * 9;
    }
  }
  ctx.putImageData(image, 0, 0);
}

function strokeLine(ctx, x1, y1, x2, y2, width, color) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function drawRiver(ctx, plan, seed) {
  const bands = [
    [84, 'rgba(48,57,33,.20)'], [68, 'rgba(57,62,35,.42)'],
    [57, '#645c46'], [49, '#42483d'], [44, '#394d45'], [36, '#3e524a'],
    [22, 'rgba(89,112,100,.30)'],
  ];
  for (const [width, color] of bands) {
    ctx.beginPath();
    ctx.moveTo(flintRiverX(plan, -8), -8);
    for (let y = 0; y <= plan.world.height + 8; y += 8) ctx.lineTo(flintRiverX(plan, y), y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  for (let i = 0; i < 1050; i++) {
    const y = sceneryNoise(seed + 51, i) * plan.world.height;
    const edge = i % 3 === 0;
    const x = flintRiverX(plan, y) + (edge ? (i % 2 ? 1 : -1) * (22 + sceneryNoise(seed + 7, i) * 13)
      : (sceneryNoise(seed + 6, i) - .5) * 39);
    ctx.fillStyle = edge ? 'rgba(165,146,102,.30)' : i % 4 ? 'rgba(112,142,125,.23)' : 'rgba(33,47,39,.35)';
    ctx.fillRect(x, y, edge ? 3.2 : .8 + sceneryNoise(seed + 9, i) * 2, edge ? 1 : 2.6);
  }
}

function drawClearings(ctx, plan, seed) {
  plan.clearings.forEach((area, index) => {
    const x = mid(area.left, area.right), y = mid(area.top, area.bottom);
    const radius = Math.max(area.right - area.left, area.bottom - area.top) * .62;
    const yard = ctx.createRadialGradient(x, y, radius * .12, x, y, radius);
    yard.addColorStop(0, 'rgba(144,96,62,.48)');
    yard.addColorStop(.62, 'rgba(164,122,75,.31)');
    yard.addColorStop(1, 'rgba(144,96,62,0)');
    ctx.fillStyle = yard;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    for (let i = 0; i < 260; i++) {
      const a = sceneryNoise(seed + 21, i + index * 260) * Math.PI * 2;
      const r = Math.sqrt(sceneryNoise(seed + 54, i + index * 260)) * .86;
      const px = x + Math.cos(a) * (area.right - area.left) * r / 2;
      const py = y + Math.sin(a) * (area.bottom - area.top) * r / 2;
      ctx.fillStyle = i % 4 ? 'rgba(104,72,49,.12)' : 'rgba(213,175,125,.28)';
      ctx.fillRect(px, py, 1.6 + i % 3, .8);
    }
  });
}

function drawRoad(ctx, x1, y1, x2, y2, width, seed) {
  const span = Math.hypot(x2 - x1, y2 - y1);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.save();
  ctx.translate(x1, y1);
  ctx.rotate(angle);
  for (const [w, color] of [
    [1.15, 'rgba(101,68,49,.23)'], [1, 'rgba(148,97,61,.49)'], [.75, 'rgba(178,126,85,.57)'],
    [.44, 'rgba(202,152,105,.38)'],
  ]) strokeLine(ctx, 0, 0, span, 0, width * w, color);
  for (const edge of [-1, 1]) strokeLine(ctx, 0, edge * width * .2, span, edge * width * .2, 1.5, 'rgba(85,57,41,.30)');
  for (let i = 0; i < span * 1.25; i++) {
    const x = sceneryNoise(seed + 11, i) * span;
    const y = (sceneryNoise(seed + 16, i) - .5) * width;
    ctx.fillStyle = i % 4 ? 'rgba(95,74,51,.28)' : 'rgba(220,182,126,.39)';
    ctx.fillRect(x, y, 1 + sceneryNoise(seed + 8, i) * 2, .8);
  }
  ctx.restore();
}

function drawRails(ctx, plan, seed) {
  const x = plan.railX, { top, bottom } = plan.rail;
  for (const [offset, width, color] of [
    [4, 44, 'rgba(62,44,31,.24)'], [3, 36, 'rgba(84,56,40,.43)'],
    [-2, 29, 'rgba(151,107,72,.64)'], [0, 23, 'rgba(93,82,69,.75)'],
    [0, 18, '#72665b'],
  ]) strokeLine(ctx, x + offset, top, x + offset, bottom, width, color);

  for (let i = 0; i < 1800; i++) {
    const offset = (sceneryNoise(seed + 82, i) - .5) * 31;
    const y = top + sceneryNoise(seed + 83, i) * (bottom - top);
    ctx.fillStyle = i % 3 ? 'rgba(52,50,44,.28)' : 'rgba(203,180,147,.39)';
    ctx.fillRect(x + offset, y, 1 + (i % 3) * .65, .8 + sceneryNoise(seed + 16, i));
  }

  for (let y = top, i = 0; y < bottom; y += 9, i++) {
    const wear = sceneryNoise(seed + 3, i);
    ctx.fillStyle = wear > .53 ? '#695345' : '#4e4036';
    ctx.fillRect(x - 10.5 - wear, y, 20.8 + wear, 3);
    ctx.fillStyle = 'rgba(212,161,112,.32)';
    ctx.fillRect(x - 10, y, 20, .7);
  }

  // Planks in the grade crossing sit under both unbroken rails.
  for (let y = plan.crossingY - 12; y <= plan.crossingY + 12; y += 4) {
    ctx.fillStyle = y % 2 ? '#8a6f54' : '#947a61';
    ctx.fillRect(x - 13, y, 26, 3.5);
  }
  for (const offset of [-6, 6]) {
    strokeLine(ctx, x + offset, top, x + offset, bottom, 2.9, '#2b2926');
    strokeLine(ctx, x + offset - .6, top, x + offset - .6, bottom, 1.0, '#c2b6a0');
  }
}

function drawDepotSite(ctx, depot, seed) {
  const { x, y } = depot;
  const ash = ctx.createRadialGradient(x + 4, y, 7, x, y, 48);
  ash.addColorStop(0, 'rgba(49,42,36,.68)');
  ash.addColorStop(.7, 'rgba(71,58,45,.37)');
  ash.addColorStop(1, 'rgba(71,58,45,0)');
  ctx.fillStyle = ash;
  ctx.fillRect(x - 49, y - 54, 98, 108);
  // Low stone piers, blistered timber and platform remnants. This structure
  // burned before the battle and is represented as an illustrative site.
  for (let i = 0; i < 10; i++) {
    const row = y - 37 + i * 7.9;
    const wear = sceneryNoise(seed + 112, i);
    ctx.fillStyle = wear > .52 ? '#6d6050' : '#453c34';
    ctx.fillRect(x - 22, row, 8 + wear * 3, 4);
    ctx.fillRect(x + 14, row + 2, 6 + wear * 2, 3);
    ctx.fillStyle = i % 3 ? '#796450' : '#423d32';
    ctx.fillRect(x - 34, row - 1, 9 + wear * 4, 6.7);
  }
  for (let i = 0; i < 125; i++) {
    const px = x + (sceneryNoise(seed + 22, i) - .5) * 55;
    const py = y + (sceneryNoise(seed + 8, i) - .5) * 92;
    ctx.fillStyle = i % 3 ? 'rgba(42,36,30,.54)' : 'rgba(183,153,119,.38)';
    ctx.fillRect(px, py, 1 + i % 5, 1.5);
  }
}

function drawTownLots(ctx, plan, seed) {
  // Irregular traces of the small settlement remain after the August raid.
  // No surviving structure or exact lot is inferred from these scenic marks.
  const fronts = [
    { x: plan.crossing.right + 48, y: plan.crossingY - 47, width: 45, height: 26 },
    { x: plan.crossing.right + 125, y: plan.crossingY - 59, width: 58, height: 33 },
    { x: plan.crossing.right + 92, y: plan.crossingY + 35, width: 52, height: 24 },
  ];
  for (const [index, lot] of fronts.entries()) {
    const { x, y, width, height } = lot;
    const dust = ctx.createRadialGradient(x, y, 3, x, y, width * .85);
    dust.addColorStop(0, 'rgba(110,74,50,.49)');
    dust.addColorStop(1, 'rgba(110,74,50,0)');
    ctx.fillStyle = dust;
    ctx.fillRect(x - width, y - height * 1.8, width * 2, height * 3.6);
    for (let i = 0; i < 48; i++) {
      const px = x + (sceneryNoise(seed + 19, i + index * 91) - .5) * width;
      const py = y + (sceneryNoise(seed + 45, i + index * 91) - .5) * height;
      const fragments = i % 5;
      ctx.fillStyle = fragments ? 'rgba(89,66,47,.34)' : 'rgba(162,131,104,.51)';
      ctx.fillRect(px, py, 1.4 + fragments, 1.2);
    }
    strokeLine(ctx, x - width * .43, y - height * .55, x + width * .22, y - height * .51, 3.4, 'rgba(72,58,43,.68)');
    strokeLine(ctx, x - width * .43, y - height * .55, x - width * .49, y + height * .29, 3.1, 'rgba(76,63,51,.55)');
  }
}

function drawSalient(ctx, plan, seed) {
  const { works } = plan;
  const start = works.left + 12, end = works.right - 13, y = mid(works.top, works.bottom) - 8;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const [width, color, offset] of [
    [27, 'rgba(50,39,29,.38)', 4], [21, 'rgba(126,85,56,.78)', 1],
    [12, 'rgba(168,119,77,.75)', -3], [5, '#463d33', 3],
  ]) {
    ctx.beginPath();
    ctx.moveTo(start, y + offset + 22);
    for (let x = start + 9; x < end; x += 8) {
      ctx.lineTo(x, y + offset + 5 * Math.sin((x - start) / 39) + (sceneryNoise(seed, x) - .5) * 3);
    }
    ctx.lineTo(end, y + offset + 14);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  for (let x = start + 9; x < end - 4; x += 7) {
    ctx.fillStyle = 'rgba(174,133,87,.49)';
    ctx.fillRect(x, y + 4 + 5 * Math.sin((x - start) / 39), 2.4, 2);
  }
  ctx.restore();
}

export function jonesboroughTrees(plan, seed) {
  const trees = [];
  const bufferY = plan.crossingY + 54;
  for (const [index, zone] of plan.woods.entries()) {
    for (let y = zone.top + 23, row = 0; y < zone.bottom - 18; y += 26, row++) {
      for (let x = zone.left + 18, col = 0; x < zone.right - 17; x += 23, col++) {
        const id = row * 99 + col + index * 1300;
        const px = x + (sceneryNoise(seed + 26, id) - .5) * 16;
        const py = y + (sceneryNoise(seed + 57, id) - .5) * 17;
        const type = sceneryNoise(seed + 74, id);
        const size = 26 + sceneryNoise(seed + 83, id) * 29;
        const radius = size * .52;
        if (sceneryNoise(seed + 88, id) > .67 + .13 * Math.sin(px / 91 + py / 94)) continue;
        if (Math.abs(px - flintRiverX(plan, py)) < radius + 27) continue;
        if (Math.abs(px - plan.railX) < radius + 28) continue;
        if (py > bufferY && Math.abs(px - plan.roadX) < radius + 23) continue;
        if (plan.clearings.some(area => px + radius > area.left && px - radius < area.right
          && py + radius > area.top && py - radius < area.bottom)) continue;
        if (Math.abs(px - WARREN_HOUSE.x) < WARREN_HOUSE.width / 2 + radius
          && Math.abs(py - WARREN_HOUSE.y) < WARREN_HOUSE.height / 2 + radius) continue;
        trees.push({ x: px, y: py, size, variant: type < .46 ? 'oak' : type < .78 ? 'cedar' : 'poplar', flip: type > .52 });
      }
    }
  }
  return trees.sort((one, two) => one.y - two.y);
}

export function drawJonesboroughTerrain(scene, ctx, source, plan, seed) {
  paintGround(ctx, source, plan);
  drawClearings(ctx, plan, seed);
  drawRiver(ctx, plan, seed);
  const { crossing, crossingY, road, roadX, world } = plan;
  drawRoad(ctx, crossing.left - 170, crossingY + 28, crossing.left, crossingY, 27, seed + 1);
  drawRoad(ctx, crossing.left, crossingY, crossing.right, crossingY, 36, seed);
  drawRoad(ctx, crossing.right, crossingY, world.width + 5, crossingY - 23, 31, seed + 2);
  drawRoad(ctx, roadX, crossingY, roadX, road.bottom + 5, 24, seed + 3);
  drawRoad(ctx, WARREN_HOUSE.x + 14, WARREN_HOUSE.y + 32, roadX, road.top + 37, 8, seed + 5);
  drawRails(ctx, plan, seed);
  drawDepotSite(ctx, plan.depot, seed);
  drawTownLots(ctx, plan, seed);
  drawSalient(ctx, plan, seed);
  for (const { x, y, size, variant, flip } of jonesboroughTrees(plan, seed)) {
    ctx.fillStyle = 'rgba(31,37,23,.31)';
    ctx.beginPath();
    ctx.ellipse(x + 6, y + 9, size * .46, size * .34, .27, 0, Math.PI * 2);
    ctx.fill();
    stampScenery(scene, ctx, 'foliage', variant, x - size / 2, y - size / 2, size, size, flip);
  }
}
