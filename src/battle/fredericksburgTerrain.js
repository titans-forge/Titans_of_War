import { drawNaturalRoad, sceneryNoise, stampScenery } from './realisticScenery.js';
import { INNIS_HOUSE } from './fredericksburgArt.js';

const bell = value => Math.exp(-value * value);
const middle = (lo, hi) => (lo + hi) / 2;
const centerX = zone => middle(zone.left, zone.right);
const centerY = zone => middle(zone.top, zone.bottom);

export function fredericksburgTerrainPlan(battle) {
  if (battle?.scenarioId !== 'fredericksburg' || !battle.fieldBattle) return null;
  const zones = battle.fieldBattle.zones;
  const find = name => zones.find(zone => zone.name === name);
  const wall = find('Sunken Road'), heights = find('Marye’s Heights'), prospect = find('Prospect Hill');
  const river = find('Rappahannock River'), town = find('Fredericksburg town');
  const reserve = find('Reserve road'), crossing = find('Pontoon crossing');
  const railroad = find('Richmond, Fredericksburg and Potomac Railroad');
  if (!wall || !heights || !prospect || !river || !town || !reserve || !railroad) return null;
  return { world: battle.world, wall, heights, prospect, river, town, reserve, crossing, railroad,
    woods: zones.filter(zone => zone.kind === 'woods') };
}

export function fredericksburgBanks(river, y) {
  const s = (y - river.top) / (river.bottom - river.top);
  const bend = 11 * Math.sin(s * Math.PI * 1.85 + .15) + 5 * Math.sin(s * Math.PI * 4.25);
  const narrow = 6 * Math.cos(s * Math.PI * 2.5);
  return { west: river.left + bend + narrow, east: river.right + bend - narrow };
}

function elevation(plan, x, y) {
  const { heights, prospect, wall, river, railroad } = plan;
  const ridgeX = centerX(heights) - 12 * Math.cos(y / 72);
  const north = 69 * bell((x - ridgeX) / 139) * bell((y - centerY(heights)) / 218);
  const south = 53 * bell((x - centerX(prospect) - 19 * Math.cos(y / 67)) / 152)
    * bell((y - centerY(prospect)) / 181);
  const wallCut = 15 * bell((x - centerX(wall)) / 20) * bell((y - centerY(wall)) / 145);
  const bank = fredericksburgBanks(river, y);
  const lowland = 17 * bell((x - bank.west) / 127);
  const railRise = 9 * bell((x - centerX(railroad)) / 11) * bell((y - centerY(railroad)) / 162);
  const rolls = 5 * Math.cos(x / 82 + y / 116) + 8 * Math.sin(y / 132 - x / 175);
  return north + south + railRise + rolls - wallCut - lowland;
}

function paintWinterGround(ctx, source, plan) {
  const { width, height } = plan.world;
  ctx.drawImage(source, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;
  // The ground remains readable in winter. Keep the fine photographic grain
  // and use the slope normal for broader shade, with no per-frame pixel reads.
  const step = 5;
  for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
    const dx = (elevation(plan, x + 7, y) - elevation(plan, x - 7, y)) / 14;
    const dy = (elevation(plan, x, y + 7) - elevation(plan, x, y - 7)) / 14;
    const light = .99 + (.59 * dx + .38 * dy) / Math.hypot(1, dx, dy);
    const winter = 5 + 9 * bell((x - 870) / 285) * bell((y - 345) / 233);
    for (let row = y; row < Math.min(y + step, height); row++) for (let col = x; col < Math.min(x + step, width); col++) {
      const i = (row * width + col) * 4;
      const grey = .28 * data[i] + .54 * data[i + 1] + .18 * data[i + 2];
      data[i] = (.52 * data[i] + .48 * grey) * light + winter + 6;
      data[i + 1] = (.49 * data[i + 1] + .51 * grey) * light + winter;
      data[i + 2] = (.56 * data[i + 2] + .44 * grey) * light + winter + 7;
    }
  }
  ctx.putImageData(image, 0, 0);
}

function street(ctx, x, y, endX, endY, width, seed) {
  ctx.lineWidth = width;
  ctx.strokeStyle = 'rgba(117,101,78,.27)';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(endX, endY); ctx.stroke();
  drawNaturalRoad(ctx, { x, y }, { x: endX, y: endY }, width, seed);
}

function bankLine(ctx, river, side, offset) {
  ctx.beginPath();
  for (let y = river.top; y <= river.bottom; y += 5) {
    const x = fredericksburgBanks(river, y)[side] + offset;
    if (y === river.top) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
}

function waterBand(ctx, river, width, color) {
  ctx.beginPath();
  for (let y = river.top; y <= river.bottom; y += 5) {
    const west = fredericksburgBanks(river, y).west - width;
    if (y === river.top) ctx.moveTo(west, y);
    else ctx.lineTo(west, y);
  }
  for (let y = river.bottom; y >= river.top; y -= 5) {
    ctx.lineTo(fredericksburgBanks(river, y).east + width, y);
  }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}

function paintRiver(ctx, river, seed) {
  waterBand(ctx, river, 20, 'rgba(96,87,70,.30)');
  waterBand(ctx, river, 11, 'rgba(151,139,111,.70)');
  waterBand(ctx, river, 4, '#655d51');
  const water = ctx.createLinearGradient(river.left, 0, river.right, 0);
  water.addColorStop(0, '#687879');
  water.addColorStop(.14, '#4e666f');
  water.addColorStop(.46, '#415762');
  water.addColorStop(.83, '#4d6670');
  water.addColorStop(1, '#657c7e');
  waterBand(ctx, river, 0, water);
  for (const side of ['west', 'east']) {
    bankLine(ctx, river, side, side === 'west' ? 3 : -3);
    ctx.strokeStyle = 'rgba(175,179,161,.35)';
    ctx.lineWidth = 2.5; ctx.stroke();
  }
  for (const [phase, color] of [[0, 'rgba(182,205,203,.14)'], [1, 'rgba(23,49,63,.17)']]) {
    ctx.beginPath();
    for (let i = phase; i < 770; i += 2) {
      const y = river.top + (river.bottom - river.top - 27) * sceneryNoise(seed, i);
      const { west, east } = fredericksburgBanks(river, y);
      const x = west + 9 + (east - west - 20) * sceneryNoise(seed + 18, i);
      const drift = (sceneryNoise(seed + 90, i) - .5) * 3.2;
      const flow = 3 + 22 * sceneryNoise(seed + 95, i);
      ctx.moveTo(x, y); ctx.lineTo(x + drift, y + flow);
    }
    ctx.lineWidth = .85; ctx.strokeStyle = color; ctx.stroke();
  }
}

export function fredericksburgPontoon(plan) {
  if (!plan.crossing) return null;
  const y = centerY(plan.crossing);
  const bank = fredericksburgBanks(plan.river, y);
  return { y, start: bank.west - 13, end: bank.east + 13, width: Math.min(19, plan.crossing.bottom - plan.crossing.top - 2) };
}

function paintPontoon(ctx, bridge, seed) {
  const { start, end, y, width } = bridge;
  const left = y - width / 2;
  ctx.fillStyle = 'rgba(21,32,39,.30)'; ctx.fillRect(start, left + 8, end - start, width + 2);
  for (let x = start + 12; x < end - 8; x += 22) {
    ctx.beginPath(); ctx.ellipse(x, y + 2, 4.9, width * .8, 0, 0, 2 * Math.PI);
    ctx.fillStyle = '#51433a'; ctx.fill();
  }
  ctx.fillStyle = '#6c5946'; ctx.fillRect(start, left, end - start, width);
  for (let x = start; x <= end - 3; x += 4) {
    ctx.fillStyle = sceneryNoise(seed + 37, x) > .5 ? '#9d876a' : '#826e53';
    ctx.fillRect(x, left + 2, 3.2, width - 4);
  }
  ctx.fillStyle = '#b1a08a';
  ctx.fillRect(start, left + 1, end - start, 1.4);
  ctx.fillRect(start, left + width - 2, end - start, 1.4);
}

function exactWallX(wall, y) {
  return centerX(wall) + 7 + 2.2 * Math.sin(y / 23);
}

function paintSunkenRoad(ctx, road, seed) {
  const x = centerX(road);
  ctx.save(); ctx.lineCap = 'round';
  street(ctx, x - 9, road.top - 42, x - 9, road.bottom + 13, 22, seed);
  const foot = road.bottom - road.top;
  for (const [offset, width, color] of [[3, 19, 'rgba(47,42,36,.42)'], [0, 11, '#594f45'], [-2, 4, '#948573']]) {
    ctx.beginPath();
    for (let i = 0; i <= foot; i += 5) {
      const y = road.top + i;
      const xx = exactWallX(road, y) + offset;
      if (i === 0) ctx.moveTo(xx, y);
      else ctx.lineTo(xx, y);
    }
    ctx.lineWidth = width; ctx.strokeStyle = color; ctx.stroke();
  }
  // Irregular sandstone blocks, mortar and top-edge chips at inspection zoom.
  for (let y = road.top + 3, i = 0; y < road.bottom - 3; i++) {
    const span = 3.3 + sceneryNoise(seed + 44, i) * 7;
    const xx = exactWallX(road, y);
    const tint = Math.floor(sceneryNoise(seed + 28, i) * 32);
    ctx.fillStyle = `rgb(${111 + tint},${100 + tint},${84 + tint})`;
    ctx.fillRect(xx - 3.7, y, 7.1 + sceneryNoise(seed + 29, i), span - .9);
    ctx.fillStyle = 'rgba(203,188,154,.43)';
    ctx.fillRect(xx - 3.8, y, 1.2, span - 1);
    y += span;
  }
  ctx.restore();
}

function paintRailroad(ctx, road, seed) {
  const x = centerX(road);
  street(ctx, x, road.top, x, road.bottom, 22, seed);
  ctx.fillStyle = '#74695e'; ctx.fillRect(x - 6.3, road.top, 12.6, road.bottom - road.top);
  for (let y = road.top; y < road.bottom; y += 6) {
    ctx.fillStyle = sceneryNoise(seed + 21, y) < .5 ? '#4c4035' : '#605346';
    ctx.fillRect(x - 8, y, 16, 2.4);
  }
  for (const offset of [-4.3, 4.3]) {
    ctx.fillStyle = '#3f3b37'; ctx.fillRect(x + offset, road.top, 1.8, road.bottom - road.top);
    ctx.fillStyle = '#aaa096'; ctx.fillRect(x + offset - .28, road.top, .7, road.bottom - road.top);
  }
}

export function fredericksburgTownBlocks(town, seed) {
  const buildings = [];
  for (let row = 0; row < 5; row++) for (let col = 0; col < 4; col++) {
    const i = 7 * row + col;
    if (sceneryNoise(seed + 17, i) < .22) continue;
    buildings.push({
      x: town.left + 131 + col * 38 + sceneryNoise(seed + 28, i) * 7,
      y: town.top + 28 + row * 43 + sceneryNoise(seed + 13, i) * 10,
      w: 15 + 8 * sceneryNoise(seed + 8, i),
      h: 14 + 9 * sceneryNoise(seed + 25, i),
      brick: sceneryNoise(seed + 53, i) > .36,
    });
  }
  return buildings;
}

function lineRoof(ctx, points, color) {
  ctx.beginPath();
  for (const [i, [x, y]] of points.entries()) i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}

function paintTown(ctx, town, seed) {
  for (const y of [town.top + 9, town.top + 104, town.top + 189, town.top + 268]) {
    street(ctx, town.left + 19, y, town.right + 11, y - 9, 12, seed);
  }
  for (const x of [town.left + 118, town.left + 196, town.left + 272]) {
    street(ctx, x + 5, town.top - 29, x - 3, town.bottom - 4, 11, seed);
  }
  for (const { x, y, w, h, brick } of fredericksburgTownBlocks(town, seed)) {
    const rise = 5;
    ctx.fillStyle = 'rgba(40,43,38,.31)'; ctx.fillRect(x + 5, y + 7, w, h + 4);
    ctx.fillStyle = brick ? '#7d5a4a' : '#918a77'; ctx.fillRect(x, y + 2, w, h + 4);
    lineRoof(ctx, [[x - 2, y], [x + w * .42, y - rise], [x + w * .42, y + h - rise], [x - 2, y + h]],
      brick ? '#6d493c' : '#676153');
    lineRoof(ctx, [[x + w * .42, y - rise], [x + w + 2, y], [x + w + 2, y + h], [x + w * .42, y + h - rise]],
      brick ? '#8c6756' : '#817967');
    ctx.fillStyle = '#433c35'; ctx.fillRect(x + 4, y + h, 2, 2);
    ctx.fillRect(x + w - 5, y + h, 2, 2);
  }
}

export function fredericksburgWinterTrees(plan, seed) {
  const trees = [];
  for (const [index, zone] of plan.woods.entries()) {
    for (let y = zone.top + 19, row = 0; y < zone.bottom - 17; y += 22, row++) {
      for (let x = zone.left + 21, col = 0; x < zone.right - 17; x += 21, col++) {
        const i = index * 1250 + row * 60 + col;
        const px = x + 14 * (sceneryNoise(seed + 2, i) - .5);
        const py = y + 16 * (sceneryNoise(seed + 7, i) - .5);
        const size = 21 + 31 * sceneryNoise(seed + 18, i);
        if (sceneryNoise(seed + 26, i) > .69) continue;
        if (Math.hypot((px - 663) / 79, (py - 650) / 114) < 1) continue;
        if (Math.abs(px - centerX(plan.railroad)) < 19 + size * .49) continue;
        if (Math.abs(py - centerY(plan.reserve)) < 20 + size * .49) continue;
        trees.push({ x: px, y: py, size, bare: sceneryNoise(seed + 19, i) < .84, key: i });
      }
    }
  }
  return trees.sort((a, b) => a.y - b.y);
}

function paintWinterTree(scene, ctx, tree, seed) {
  const { x, y, size, bare, key } = tree;
  ctx.beginPath(); ctx.ellipse(x + size * .19, y + 4, size * .43, size * .32, .31, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(49,47,46,.21)'; ctx.fill();
  if (!bare) {
    stampScenery(scene, ctx, 'foliage', 'cedar', x - size / 2, y - size / 2, size, size, key % 2 === 0);
    return;
  }
  const crown = size * .43;
  const lean = (sceneryNoise(seed, key) - .5) * size * .28;
  ctx.beginPath();
  ctx.moveTo(x, y + crown * .51); ctx.lineTo(x + lean, y - crown * .75);
  ctx.lineWidth = 1.8; ctx.strokeStyle = 'rgba(60,55,51,.76)'; ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const angle = 2 * Math.PI * i / 9 + sceneryNoise(seed + 43, i + key) * .62;
    const length = crown * (.39 + .61 * sceneryNoise(seed + 53, i + key));
    const branchX = x + Math.cos(angle) * length;
    const branchY = y + Math.sin(angle) * length * .73 - crown * .33;
    ctx.beginPath();
    ctx.moveTo(x + lean * .48, y - crown * .28); ctx.lineTo(branchX, branchY);
    ctx.lineTo(branchX + (branchX - x) * .35, branchY - crown * .24);
    ctx.moveTo(branchX, branchY); ctx.lineTo(branchX - crown * .14, branchY + crown * .28);
    ctx.lineWidth = .65; ctx.strokeStyle = 'rgba(79,72,66,.74)'; ctx.stroke();
  }
}

export function drawFredericksburgTerrain(scene, ctx, source, plan, seed) {
  paintWinterGround(ctx, source, plan);
  const y = centerY(plan.reserve);
  street(ctx, plan.reserve.left, y + 3, plan.reserve.right, y - 4, 20, seed);
  paintSunkenRoad(ctx, plan.wall, seed);
  paintRailroad(ctx, plan.railroad, seed + 12);
  paintTown(ctx, plan.town, seed + 22);
  street(ctx, centerX(plan.wall) + 12, INNIS_HOUSE.y + 25, INNIS_HOUSE.x, INNIS_HOUSE.y + 20, 8, seed + 5);
  paintRiver(ctx, plan.river, seed + 47);
  const bridge = fredericksburgPontoon(plan);
  if (bridge) {
    street(ctx, plan.crossing.left, bridge.y, plan.crossing.right, bridge.y, bridge.width, seed + 17);
    paintPontoon(ctx, bridge, seed);
  }
  for (const tree of fredericksburgWinterTrees(plan, seed)) paintWinterTree(scene, ctx, tree, seed);
}
