import { drawNaturalRoad, sceneryNoise, stampScenery } from './realisticScenery.js';
import { BUSHONG_HOUSE, newMarketPikeX } from './newMarketArt.js';

const clamp01 = value => Math.max(0, Math.min(1, value));
const bell = value => Math.exp(-value * value);
const midX = zone => (zone.left + zone.right) / 2;
const midY = zone => (zone.top + zone.bottom) / 2;

export function newMarketTerrainPlan(battle) {
  if (battle?.scenarioId !== 'new_market' || !battle.fieldBattle) return null;
  const named = name => battle.fieldBattle.zones.find(zone => zone.name === name);
  const mud = named('Field of Lost Shoes');
  const road = named('Valley Pike');
  const hill = named('Bushong’s Hill');
  const orchard = named('Bushong Orchard');
  const river = named('Shenandoah River');
  const bank = named('Riverbank Woods');
  const reserve = named('Reserve Rise');
  if (!mud || !road || !hill || !orchard || !river || !bank || !reserve) return null;
  return { world: battle.world, mud, road, hill, orchard, river, bank, reserve };
}

export function newMarketRiverBanks(river, y) {
  const width = river.right - river.left;
  const center = midX(river) + width * (.18 * Math.sin(y / 135 + .45) + .029 * Math.sin(y / 48 + 1.6));
  const half = width * (.25 + .035 * Math.sin(y / 109 + .8));
  return { west: center - half, east: center + half };
}

export function newMarketElevation(plan, x, y) {
  const { hill, reserve, river, mud } = plan;
  const northCrest = 57 * bell((y - midY(hill) - 18 * Math.sin(x / 185)) / 145)
    * bell((x - midX(hill)) / 646);
  const reserveCrest = 43 * bell((y - midY(reserve) + 14 * Math.cos(x / 139)) / 148)
    * bell((x - midX(reserve)) / 511);
  const swale = 30 * bell((y - midY(mud) - 25 * Math.sin(x / 163)) / 131) * bell((x - midX(mud)) / 625);
  const bank = newMarketRiverBanks(river, y).east;
  const riverCut = 46 * bell((x - bank + 12) / 118);
  return northCrest + reserveCrest - swale - riverCut + 5 * Math.sin(x / 197 - y / 209);
}

function mudEdges(mud, x) {
  const span = mud.right - mud.left;
  const t = clamp01((x - mud.left) / span);
  const shoulder = 23 * (bell(t / .09) + bell((1 - t) / .13));
  return {
    top: Math.max(mud.top + 3, mud.top + 10 + shoulder + 10 * Math.sin(x / 69) + 5 * Math.cos(x / 28)),
    bottom: Math.min(mud.bottom - 3, mud.bottom - 9 - shoulder + 8 * Math.sin(x / 89 + .8) - 4 * Math.cos(x / 37)),
  };
}

function paintGround(ctx, source, plan) {
  const { width, height } = plan.world;
  const { mud } = plan;
  ctx.drawImage(source, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;
  const step = 5;
  for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
    const dx = (newMarketElevation(plan, x + 7, y) - newMarketElevation(plan, x - 7, y)) / 14;
    const dy = (newMarketElevation(plan, x, y + 7) - newMarketElevation(plan, x, y - 7)) / 14;
    const relief = (.62 * dy - .33 * dx) / Math.hypot(1, dx, dy);
    const { top, bottom } = mudEdges(mud, x);
    const wet = clamp01(Math.min(y - top, bottom - y, x - mud.left - 4, mud.right - x - 4) / 22);
    const light = .86 + .62 * relief + .05 * Math.sin(x / 90 - y / 155);
    for (let row = y; row < Math.min(y + step, height); row++) for (let col = x; col < Math.min(x + step, width); col++) {
      const offset = (row * width + col) * 4;
      const r = data[offset], g = data[offset + 1], b = data[offset + 2];
      // Preserve the ground photograph's grain in both the wet grass and soil.
      const clay = (r * .31 + g * .52 + b * .17) * (.51 + relief * .18);
      data[offset] = (r * light + 5) * (1 - wet) + (clay + 30) * wet;
      data[offset + 1] = (g * light + 11) * (1 - wet) + (clay + 14) * wet;
      data[offset + 2] = (b * light + 12) * (1 - wet) + (clay + 3) * wet;
    }
  }
  ctx.putImageData(image, 0, 0);
}

function paintPlowRows(ctx, mud, seed) {
  const { left, right, top, bottom } = mud;
  const trace = (height, row) => {
    ctx.beginPath();
    let inRow = false;
    for (let x = left + 10; x <= right - 9; x += 8) {
      const { top: upper, bottom: lower } = mudEdges(mud, x);
      const y = height + 5 * Math.sin(x / 94 + row * .067) + 2 * Math.sin(x / 37 + row * .13);
      if (y < upper + 5 || y > lower - 5) {
        inRow = false;
      } else {
        if (inRow) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
        inRow = true;
      }
    }
  };
  for (let row = 0, y = top + 16; y < bottom - 11; row++, y += 6.4) {
    trace(y, row);
    ctx.strokeStyle = 'rgba(55,39,28,.44)';
    ctx.lineWidth = 2.4 + 1.5 * sceneryNoise(seed, row);
    ctx.stroke();
    trace(y + 2.3, row);
    ctx.strokeStyle = 'rgba(182,153,120,.24)';
    ctx.lineWidth = 1.25;
    ctx.stroke();
  }
  for (let i = 0; i < 96; i++) {
    const x = left + 28 + (right - left - 56) * sceneryNoise(seed + 7, i);
    const { top: upper, bottom: lower } = mudEdges(mud, x);
    const y = upper + 13 + (lower - upper - 26) * sceneryNoise(seed + 12, i);
    const length = 2 + 11 * sceneryNoise(seed + 26, i);
    ctx.beginPath();
    ctx.ellipse(x, y, length, 1.5 + 1.9 * sceneryNoise(seed + 30, i), .10, 0, Math.PI * 2);
    ctx.fillStyle = i % 4 ? 'rgba(120,132,124,.26)' : 'rgba(146,158,148,.37)';
    ctx.fill();
  }
}

function paintRiver(ctx, river, seed) {
  const ribbon = (margin, color) => {
    ctx.beginPath();
    for (let y = river.top; y <= river.bottom; y += 4) {
      const x = newMarketRiverBanks(river, y).west - margin;
      if (y === river.top) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let y = river.bottom; y >= river.top; y -= 4) {
      ctx.lineTo(newMarketRiverBanks(river, y).east + margin, y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  ribbon(18, 'rgba(68,65,51,.38)');
  ribbon(8, '#646853');
  ribbon(0, '#4b6663');
  ribbon(-5, '#425b5d');
  for (let i = 0; i < 1000; i++) {
    const y = river.top + (river.bottom - river.top) * sceneryNoise(seed, i);
    const { west, east } = newMarketRiverBanks(river, y);
    const x = west + 4 + (east - west - 8) * sceneryNoise(seed + 5, i);
    ctx.fillStyle = i % 3 ? 'rgba(174,184,169,.18)' : 'rgba(16,43,47,.20)';
    ctx.fillRect(x, y, .85, 1.3 + 5 * sceneryNoise(seed + 8, i));
  }
}

function paintPike(ctx, road, seed) {
  const trace = offset => {
    ctx.beginPath();
    for (let y = road.top; y <= road.bottom; y += 5) {
      const x = newMarketPikeX(road, y) + offset;
      if (y === road.top) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  };
  for (const [width, color] of [[49, 'rgba(89,80,63,.31)'], [43, 'rgba(154,145,117,.68)'], [32, '#a9a087']]) {
    trace(0);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  for (const offset of [-8, 8]) {
    trace(offset);
    ctx.strokeStyle = 'rgba(65,59,49,.34)';
    ctx.lineWidth = 2.8;
    ctx.stroke();
  }
  for (let i = 0; i < 1200; i++) {
    const y = road.top + (road.bottom - road.top) * sceneryNoise(seed, i);
    const x = newMarketPikeX(road, y) + 30 * (sceneryNoise(seed + 11, i) - .5);
    ctx.fillStyle = i % 3 ? 'rgba(225,219,198,.28)' : 'rgba(58,53,44,.27)';
    ctx.fillRect(x, y, .7 + 1.7 * sceneryNoise(seed + 8, i), .8);
  }
}

function paintFarm(ctx, plan, seed) {
  const { x, y } = BUSHONG_HOUSE;
  const yard = ctx.createRadialGradient(x + 25, y + 12, 17, x + 25, y + 12, 99);
  yard.addColorStop(0, 'rgba(161,142,103,.53)');
  yard.addColorStop(1, 'rgba(161,142,103,0)');
  ctx.fillStyle = yard;
  ctx.fillRect(x - 75, y - 87, 201, 199);
  const bend = { x: plan.orchard.right + 39, y: y + 25 };
  const roadJoin = { x: newMarketPikeX(plan.road, y + 22), y: y + 22 };
  drawNaturalRoad(ctx, { x: x + 31, y: y + 19 }, bend, 17, seed);
  drawNaturalRoad(ctx, bend, roadJoin, 14, seed + 4);

  const fenceY = plan.orchard.top + 3;
  const gate = x + 74;
  for (const [start, end] of [[plan.orchard.left + 7, gate - 13], [gate + 13, plan.orchard.right - 7]]) {
    for (const [offset, color] of [[3, 'rgba(28,32,25,.38)'], [0, '#75644b']]) {
      ctx.beginPath();
      ctx.moveTo(start, fenceY + offset);
      ctx.quadraticCurveTo((start + end) / 2, fenceY + offset + 3, end, fenceY + offset);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
    for (let post = start; post <= end; post += 13) {
      ctx.fillStyle = '#55472f';
      ctx.fillRect(post, fenceY - 3, 1.8, 6);
    }
  }
}

export function newMarketTrees(plan, seed) {
  const trees = [];
  for (const [index, zone] of [plan.bank, plan.orchard].entries()) {
    const orchard = index === 1;
    const step = orchard ? 27 : 25;
    for (let y = zone.top + 14, row = 0; y < zone.bottom - 11; y += step, row++) {
      for (let x = zone.left + 14, col = 0; x < zone.right - 12; x += step, col++) {
        const key = index * 7000 + row * 120 + col;
        const jitter = orchard ? 4 : 21;
        const px = x + jitter * (sceneryNoise(seed + 4, key) - .5);
        const py = y + jitter * (sceneryNoise(seed + 7, key) - .5);
        const size = orchard ? 21 + 11 * sceneryNoise(seed + 15, key) : 29 + 23 * sceneryNoise(seed + 15, key);
        if (orchard) {
          const { x: houseX, y: houseY, width, height } = BUSHONG_HOUSE;
          if (Math.abs(px - houseX) < width / 2 + size * .52 && Math.abs(py - houseY) < height / 2 + size * .35) continue;
          if (px > houseX && py > houseY + 5) continue;
        } else {
          if (px - size * .52 <= newMarketRiverBanks(plan.river, py).east) continue;
          const density = .66 + .24 * Math.sin(py / 58 + px / 50);
          if (sceneryNoise(seed + 23, key) > density) continue;
        }
        const species = orchard ? 'oak' : ['oak', 'oak', 'poplar', 'cedar', 'scrub'][Math.floor(sceneryNoise(seed + 39, key) * 5)];
        trees.push({ x: px, y: py, size, species, orchard, key });
      }
    }
  }
  return trees.sort((a, b) => a.y - b.y);
}

export function drawNewMarketTerrain(scene, ctx, source, plan, seed) {
  paintGround(ctx, source, plan);
  paintPlowRows(ctx, plan.mud, seed + 1);
  paintRiver(ctx, plan.river, seed + 2);
  paintFarm(ctx, plan, seed + 3);
  paintPike(ctx, plan.road, seed + 4);
  for (const { x, y, size, species, key } of newMarketTrees(plan, seed)) {
    ctx.beginPath();
    ctx.ellipse(x + size * .15, y + size * .17, size * .48, size * .30, .4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(27,41,30,.37)';
    ctx.fill();
    stampScenery(scene, ctx, 'foliage', species, x - size / 2, y - size / 2, size, size, key % 2 === 0);
  }
}
