import { drawLandmarkSurroundings } from './landmarkSurroundings.js';
import { sceneryNoise } from './realisticScenery.js';

export function cedarCreekLandmarkGround(battle) {
  if (battle.scenarioId !== 'cedar_creek' || !battle.fieldBattle) return null;
  const { landmarks = [], zones } = battle.fieldBattle;
  const manor = landmarks.find(site => site.id === 'belle-grove');
  const farm = landmarks.find(site => site.id === 'heater-house');
  const camps = zones.find(zone => zone.name === 'Camp terraces');
  const creek = zones.find(zone => zone.kind === 'creek');
  const pike = battle.config.movement?.roadBands?.find(band => band.axis === 'x');
  if (!manor || !farm || !camps || !creek || !pike) return null;
  return { manor, farm, camps, creek, pike, world: battle.world, mapRules: battle.battleRulesVersion };
}

function groundWash(ctx, x, y, width, height, rgb, opacity) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(width, height);
  const wash = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  wash.addColorStop(0, `rgba(${rgb},${opacity})`);
  wash.addColorStop(.52, `rgba(${rgb},${opacity * .6})`);
  wash.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = wash;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

function drawStubble(ctx, x, y, width, height, seed) {
  groundWash(ctx, x, y, width, height, '171,140,80', .52);
  const rows = 10;
  const tufts = 20;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < tufts; col++) {
      const texture = sceneryNoise(seed + row, col);
      const along = (col + .5) / tufts * 2 - 1;
      const across = (row + .5) / rows * 2 - 1;
      const fade = Math.max(0, 1 - along * along - across * across);
      const px = x + along * width;
      const py = y + across * height + along * 7;
      ctx.strokeStyle = `rgba(88,65,39,${fade * texture * .29})`;
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + texture * 16, py + 1);
      ctx.stroke();
    }
  }
}

function drawCampCanvas(ctx, x, y, length) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(54,51,38,.33)';
  ctx.fillRect(-4, 2, length + 4, 12);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(length, -2);
  ctx.lineTo(length + 3, 5);
  ctx.lineTo(length, 12);
  ctx.lineTo(0, 14);
  ctx.closePath();
  ctx.fillStyle = '#a5a395';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(length, -2);
  ctx.lineTo(length + 3, 5);
  ctx.lineTo(0, 7);
  ctx.closePath();
  ctx.fillStyle = '#d0c9ac';
  ctx.fill();
  ctx.restore();
}

export function drawCedarCreekDawnGround(ctx, { world, camps, creek }, seed) {
  // Tint the ground beneath the roads, creek, markers and formations.
  const light = ctx.createLinearGradient(0, 125, world.width, world.height * .68);
  light.addColorStop(0, 'rgba(74,96,110,.30)');
  light.addColorStop(.45, 'rgba(103,115,105,.13)');
  light.addColorStop(.84, 'rgba(196,151,86,.19)');
  light.addColorStop(1, 'rgba(206,159,91,.22)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, world.width, world.height);

  const lowGround = creek.top + (creek.bottom - creek.top) * .32;
  groundWash(ctx, world.width * .36, lowGround, world.width * .39, 97, '145,163,169', .28);
  groundWash(ctx, world.width * .76, lowGround + 13, world.width * .26, 85, '175,180,168', .21);
  drawStubble(ctx, camps.left + 135, camps.top - 90, 224, 91, seed + 1);
  drawStubble(ctx, world.width * .80, camps.top - 91, 245, 103, seed + 3);
}

export function drawCedarCreekWater(ctx, { creek, pike }, seed) {
  const span = creek.right - creek.left;
  const middle = (creek.top + creek.bottom) / 2;
  const sampleCount = Math.ceil(span / 6);
  const banks = Array.from({ length: sampleCount + 1 }, (_, i) => {
    const progress = i / sampleCount;
    const x = creek.left + progress * span;
    const fromPike = (x - pike.value) / span * Math.PI * 2;
    const y = middle + 16 * Math.sin(fromPike * 1.28) + 6 * Math.sin(fromPike * 3.3);
    const crossingOffset = (x - pike.value) / 30;
    const shallows = Math.exp(-crossingOffset * crossingOffset);
    const taper = Math.min(1, progress * 21, (1 - progress) * 21);
    const width = taper * (12 + 2.8 * Math.sin(fromPike * 2.6 + .6) - 3.4 * shallows);
    const ragged = sceneryNoise(seed, i) - .5;
    return { x, y, north: width + 1.8 * ragged, south: width * .86 - 1.8 * ragged, taper };
  });

  // Feather the channel into the scene edges. These strokes stay within the
  // authored creek approaches and put the bright shallows on the existing pike.
  for (const [edge, tint] of [
    [8.5, [115, 109, 78, .34]],
    [4, [167, 133, 91, .54]],
    [1.5, [70, 75, 56, .74]],
    [0, [63, 93, 93, .92]],
    [-3.5, [102, 128, 119, .58]],
  ]) {
    const [r, g, b, alpha] = tint;
    const ends = ctx.createLinearGradient(creek.left, middle, creek.right, middle);
    ends.addColorStop(0, `rgba(${r},${g},${b},0)`);
    ends.addColorStop(.043, `rgba(${r},${g},${b},${alpha})`);
    ends.addColorStop(.957, `rgba(${r},${g},${b},${alpha})`);
    ends.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.beginPath();
    ctx.moveTo(banks[0].x, banks[0].y);
    for (const { x, y, north, taper } of banks) ctx.lineTo(x, y - Math.max(0, north + edge) * taper);
    for (let i = banks.length - 1; i >= 0; i--) {
      const { x, y, south, taper } = banks[i];
      ctx.lineTo(x, y + Math.max(0, south + edge) * taper);
    }
    ctx.closePath();
    ctx.fillStyle = ends;
    ctx.fill();
  }
  groundWash(ctx, pike.value, middle, 29, 8, '199,172,122', .32);
  for (let i = 4; i < banks.length - 4; i += 2) {
    const { x, y, north, south, taper } = banks[i];
    const ripple = sceneryNoise(seed + 2, i);
    ctx.fillStyle = `rgba(209,214,177,${taper * ripple * .30})`;
    ctx.fillRect(x, y - north * .44 + ripple * south, 4 + ripple * 9, 1);
  }
}

export function drawCedarCreekLandmarkYards(ctx, { world, manor, farm, camps, mapRules }, seed) {
  // Illustrative campsite traces sit behind the formations in the authored terrace.
  const campX = camps.left + 42, campY = camps.top + 20;
  groundWash(ctx, campX + 92, campY + 23, 127, 55, '157,139,104', .35);
  for (let row = 0; row < 2; row++) {
    for (let index = 0; index < 5 - row; index++) {
      const jitter = sceneryNoise(seed + 4, index + row * 5);
      drawCampCanvas(ctx, campX + 42 * index + 7 * row, campY + 25 * row + 5 * jitter, 17 + 6 * jitter);
    }
  }

  groundWash(ctx, manor.x + 3, manor.y + 17, manor.artWidth * .68, 57, '191,181,145', .64);
  groundWash(ctx, manor.x + 28, manor.y + 52, 83, 31, '174,157,115', .58);
  groundWash(ctx, manor.x + 8, manor.y + 24, manor.width * .58, 20, '57,56,43', .27);
  groundWash(ctx, farm.x + 34, farm.y + 27, farm.artWidth * .69, 53, '162,117,73', .60);
  groundWash(ctx, farm.x + 3, farm.y + 17, farm.width * .62, 24, '52,51,31', .31);
  drawStubble(ctx, Math.min(world.width - 132, farm.x + 140), farm.y + 39, 105, 31, seed + 9);

  for (const site of [manor, farm]) drawLandmarkSurroundings(ctx, { ...site, mapRules }, seed + 17);
}
