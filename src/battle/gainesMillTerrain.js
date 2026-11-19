import { drawNaturalRoad, sceneryNoise, stampScenery } from './realisticScenery.js';
import { gainesMillCreekBanks, gainesMillSites, WATT_HOUSE } from './gainesMillArt.js';

const bell = value => Math.exp(-value * value);
const centerY = zone => (zone.top + zone.bottom) / 2;

export function gainesMillTerrainPlan(battle) {
  if (battle?.scenarioId !== 'gaines_mill' || !battle.fieldBattle) return null;
  const { zones } = battle.fieldBattle;
  const creek = zones.find(zone => zone.name === 'Boatswain’s Creek');
  const ravine = zones.find(zone => zone.name === 'Boatswain’s Ravine');
  const ridge = zones.find(zone => zone.name === 'Porter’s Ridge');
  const plateau = zones.find(zone => zone.name === 'Watt Plateau');
  if (!creek || !ravine || !ridge || !plateau) return null;
  return {
    world: battle.world, creek, ravine, ridge, plateau,
    woods: [ravine, ...zones.filter(zone => zone.kind === 'woods')],
    crossings: gainesMillSites(battle.fieldBattle).filter(site => ['ravine-crossing', 'watt-farm-lane'].includes(site.id)),
  };
}

export function gainesMillElevation(plan, x, y) {
  const { creek, plateau, ridge, world } = plan;
  const { center } = gainesMillCreekBanks(creek, x);
  const ridgeSpur = centerY(ridge) + 12 * Math.sin(x / 98);
  const upland = 54 * bell((y - ridgeSpur) / 133) * bell((x - world.width * .49) / 810);
  const farm = 39 * bell((y - centerY(plateau)) / 133) * bell((x - WATT_HOUSE.x) / 265);
  const ravine = 34 * bell((y - center) / 73);
  const northRise = 35 * bell((y - 649 - 14 * Math.sin(x / 86)) / 122);
  return upland + farm + northRise - ravine + 4 * Math.sin(x / 226 + y / 147);
}

function paintGround(ctx, source, plan) {
  const { width, height } = plan.world;
  ctx.drawImage(source, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;
  const step = 5;
  for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
    const dx = (gainesMillElevation(plan, x + 8, y) - gainesMillElevation(plan, x - 8, y)) / 16;
    const dy = (gainesMillElevation(plan, x, y + 8) - gainesMillElevation(plan, x, y - 8)) / 16;
    const shade = (dx * .35 + dy * .53) / Math.hypot(1, dx, dy);
    const damp = 16 * bell((y - gainesMillCreekBanks(plan.creek, x).center) / 51);
    const light = .98 + shade - .13 * bell((y - centerY(plan.ravine)) / 43);
    for (let row = y; row < Math.min(y + step, height); row++) for (let col = x; col < Math.min(x + step, width); col++) {
      const offset = (row * width + col) * 4;
      data[offset] = data[offset] * light - damp * .65;
      data[offset + 1] = data[offset + 1] * light + 8 - damp * .3;
      data[offset + 2] = data[offset + 2] * light + damp * .5 + 2;
    }
  }
  ctx.putImageData(image, 0, 0);
}

function paintWaterBand(ctx, banks, margin, color) {
  ctx.beginPath();
  for (const [index, { x, upper, taper }] of banks.entries()) {
    const y = upper - margin * taper;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let index = banks.length - 1; index >= 0; index--) {
    const { x, lower, taper } = banks[index];
    ctx.lineTo(x, lower + margin * taper);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function paintCreek(ctx, creek, seed) {
  const spans = Math.ceil((creek.right - creek.left) / 4);
  const banks = Array.from({ length: spans + 1 }, (_, index) => {
    const x = creek.left + index * (creek.right - creek.left) / spans;
    return { x, ...gainesMillCreekBanks(creek, x) };
  });
  paintWaterBand(ctx, banks, 17, 'rgba(63,57,37,.29)');
  paintWaterBand(ctx, banks, 10, 'rgba(108,98,71,.63)');
  paintWaterBand(ctx, banks, 4, '#776c4f');
  paintWaterBand(ctx, banks, 0, '#526c6b');
  paintWaterBand(ctx, banks, -3, '#4b615e');
  for (let i = 0; i < 520; i++) {
    const x = creek.left + 14 + (creek.right - creek.left - 29) * sceneryNoise(seed, i);
    const { upper, lower } = gainesMillCreekBanks(creek, x);
    const y = upper + (lower - upper) * sceneryNoise(seed + 1, i);
    ctx.fillStyle = i % 3 ? 'rgba(189,198,159,.25)' : 'rgba(20,52,52,.25)';
    ctx.fillRect(x, y, 1.6 + 6 * sceneryNoise(seed + 2, i), .7);
  }
}

function paintWattGround(ctx, seed) {
  const { x, y } = WATT_HOUSE;
  const yard = ctx.createRadialGradient(x, y + 9, 17, x, y + 9, 82);
  yard.addColorStop(0, 'rgba(158,130,89,.46)');
  yard.addColorStop(1, 'rgba(158,130,89,0)');
  ctx.fillStyle = yard;
  ctx.fillRect(x - 83, y - 74, 166, 166);
  drawNaturalRoad(ctx, { x: x + 23, y: y + 17 }, { x: x + 156, y: y + 64 }, 12, seed);
  // A short strip of farm rows picks the clearing out of the surrounding green.
  for (let row = 0; row < 14; row++) {
    const left = x + 93 + 1.8 * row;
    const top = y - 70 + 5.4 * row;
    const length = 116 + 19 * Math.sin(row * .24) + 6 * sceneryNoise(seed, row);
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.quadraticCurveTo(left + length * .57, top + 8, left + length, top + 16);
    ctx.strokeStyle = row % 2 ? 'rgba(79,70,39,.29)' : 'rgba(182,159,99,.35)';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
}

export function gainesMillRavineTrees(plan, seed) {
  const trees = [];
  for (const [index, zone] of plan.woods.entries()) {
    for (let y = zone.top + 14, row = 0; y < zone.bottom - 14; y += 24, row++) {
      for (let x = zone.left + 16, col = 0; x < zone.right - 14; x += 26, col++) {
        const key = index * 5200 + row * 110 + col;
        const px = x + 17 * (sceneryNoise(seed + 6, key) - .5);
        const py = y + 17 * (sceneryNoise(seed + 8, key) - .5);
        const size = 25 + 28 * sceneryNoise(seed + 19, key);
        const bed = gainesMillCreekBanks(plan.creek, px);
        const canopy = .62 + .19 * Math.sin(px / 91 + py / 37) + .16 * Math.cos(px / 151);
        if (sceneryNoise(seed + 21, key) > canopy) continue;
        if (py > bed.upper - size * .38 && py < bed.lower + size * .38) continue;
        if (plan.crossings.some(site => Math.abs(site.x - px) < 19 + size * .52 && Math.abs(site.y - py) < 124)) continue;
        if (Math.hypot((px - WATT_HOUSE.x - 22) / 107, (py - WATT_HOUSE.y) / 78) < 1) continue;
        const species = ['oak', 'oak', 'poplar', 'cedar', 'scrub'][Math.floor(sceneryNoise(seed + 39, key) * 5)];
        trees.push({ x: px, y: py, size, species, key });
      }
    }
  }
  return trees.sort((a, b) => a.y - b.y);
}

export function drawGainesMillTerrain(scene, ctx, source, plan, seed) {
  paintGround(ctx, source, plan);
  paintWattGround(ctx, seed);
  paintCreek(ctx, plan.creek, seed + 17);
  for (const [index, site] of plan.crossings.entries()) {
    const { upper, lower } = gainesMillCreekBanks(plan.creek, site.x);
    const drift = index ? 25 : -16;
    const entry = { x: site.x + drift, y: site.route.top };
    const departure = { x: site.x - drift, y: site.route.bottom };
    drawNaturalRoad(ctx, entry, { x: site.x, y: upper }, 19, seed + index);
    drawNaturalRoad(ctx, { x: site.x, y: lower }, departure, 20, seed + 3 + index);
    // Shallow gravel shows through the water. There is no bridge deck.
    for (let i = 0; i < 94; i++) {
      const x = site.x + 21 * (sceneryNoise(seed + index, i) - .5);
      const banks = gainesMillCreekBanks(plan.creek, x);
      const y = banks.upper + (banks.lower - banks.upper) * sceneryNoise(seed + 5, i);
      ctx.fillStyle = i % 3 ? 'rgba(160,149,111,.49)' : 'rgba(86,78,55,.40)';
      ctx.fillRect(x, y, 1.4 + 2 * sceneryNoise(seed + 7, i), .9);
    }
  }
  for (const { x, y, size, species, key } of gainesMillRavineTrees(plan, seed)) {
    ctx.beginPath();
    ctx.ellipse(x + size * .2, y + size * .12, size * .49, size * .34, .36, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(31,43,26,.32)';
    ctx.fill();
    stampScenery(scene, ctx, 'foliage', species, x - size / 2, y - size / 2, size, size, key % 2 === 0);
  }
}
