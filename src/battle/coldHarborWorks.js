import { sceneryNoise } from './realisticScenery.js';

// The bays turn along one connected cut. These are painter coordinates inside
// the authored cover zone and have no role in movement, fire or protection.
const FRONT_PROFILE = [
  [0, 17], [.10, 16], [.14, 9], [.24, 10], [.28, -5], [.35, -6],
  [.39, 14], [.47, 14], [.50, -6], [.58, -8], [.62, 7], [.70, 8],
  [.74, -7], [.81, -6], [.85, 12], [.92, 10], [.96, 18], [1, 17],
];

function frontAt(progress) {
  const index = FRONT_PROFILE.findIndex(([end]) => end >= progress);
  if (index <= 0) return FRONT_PROFILE[0][1];
  const [start, lower] = FRONT_PROFILE[index - 1];
  const [end, upper] = FRONT_PROFILE[index];
  return lower + (upper - lower) * (progress - start) / (end - start);
}

function bankSamples(length, seed, at) {
  const steps = Math.ceil(length / 3);
  return Array.from({ length: steps + 1 }, (_, index) => {
    const progress = index / steps;
    const distance = progress * length;
    const taper = Math.min(1, distance / 24, (length - distance) / 24);
    const spread = .94 + .11 * Math.sin(distance / 21) + .05 * Math.sin(distance / 6);
    const shoulderWear = 2 * Math.sin(distance / 7.4) + 2.7 * Math.sin(distance / 18) + (sceneryNoise(seed, index) - .5) * 2.8;
    return { ...at(distance, progress), spread: taper * spread, shoulderWear };
  });
}

const banks = [
  [-43, 43, [103, 85, 52], .14],
  [-36, 37, [106, 84, 54], .16],
  [-30, 33, [112, 85, 54], .24],
  [-25, 28, [153, 122, 80], .46],
  [-20, -8, [161, 130, 85], .46],
  [-14, -6, [190, 157, 107], .48],
  [-7, 4, [75, 57, 40], .82],
  [-2, 19, [86, 66, 45], .85],
  [5, 17, [124, 95, 64], .73],
  [8, 15, [144, 111, 77], .48],
  [19, 26, [142, 112, 73], .37],
];

function paintBank(ctx, samples, normal, start, end, rgb, opacity, scale, seed) {
  const trace = (sample, offset, begin = false) => {
    const wornEdge = Math.min(1, Math.abs(offset) / 31);
    const distance = sample.spread * scale * (offset + sample.shoulderWear * wornEdge);
    const x = sample.x + normal.x * distance, y = sample.y + normal.y * distance;
    if (begin) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  };
  ctx.beginPath();
  for (const [index, sample] of samples.entries()) trace(sample, start, index === 0);
  for (let index = samples.length - 1; index >= 0; index--) trace(samples[index], end);
  ctx.closePath();
  const first = samples[0], last = samples.at(-1);
  const light = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
  const variationSteps = Math.max(3, Math.ceil(samples.length / 28));
  for (let index = 0; index <= variationSteps; index++) {
    const tone = sceneryNoise(seed, index);
    const shift = (tone - .5) * 22;
    const alpha = opacity * (.76 + .24 * sceneryNoise(seed + 3, index));
    light.addColorStop(index / variationSteps, `rgba(${rgb.map(channel => Math.round(channel + shift)).join(',')},${alpha})`);
  }
  ctx.fillStyle = light;
  ctx.fill();
}

function textureBanks(ctx, samples, normal, seed, scale) {
  const shades = ['rgba(56,44,31,.35)', 'rgba(217,190,143,.40)', 'rgba(94,88,47,.57)'];
  for (let index = 1; index < samples.length - 1; index++) {
    const sample = samples[index];
    const power = sceneryNoise(seed, index);
    for (let chip = 0; chip < 9; chip++) {
      const key = index * 9 + chip;
      const distance = (sceneryNoise(seed + 2, key) - .49) * 61 * sample.spread * scale;
      const x = sample.x + distance * normal.x;
      const y = sample.y + distance * normal.y;
      ctx.fillStyle = shades[chip % shades.length];
      ctx.fillRect(x, y, .45 + power * 2.4, .65 + sceneryNoise(seed + 4, key) * 1.35);
    }
    // Grass and displaced clay catch at the scraped soil edge instead of
    // forming an uninterrupted bright stripe along the lip.
    if (power < .46) continue;
    const offset = (22 + sceneryNoise(seed + 6, index) * 15)
      * (power > .73 ? -1 : 1) * sample.spread * scale;
    const x = sample.x + offset * normal.x, y = sample.y + offset * normal.y;
    ctx.fillStyle = 'rgba(81,79,45,.27)';
    ctx.fillRect(x, y, 1.5 + power * 4, 2.1 + power * 1.4);
    ctx.fillStyle = 'rgba(192,170,113,.35)';
    ctx.fillRect(x - 1, y - 1, 1 + power * 4, 1.1);
  }
}

function renderCut(ctx, samples, normal, scale, seed) {
  for (const [index, [start, end, rgb, opacity]] of banks.entries()) {
    paintBank(ctx, samples, normal, start, end, rgb, opacity, scale, seed + index);
  }
  textureBanks(ctx, samples, normal, seed, scale);
}

export function drawColdHarborWorks(ctx, zone) {
  const left = zone.left + 14;
  const length = zone.right - left - 14;
  const front = zone.top + 40;
  const frontSamples = bankSamples(length, 31, (distance, progress) => ({
    x: left + distance,
    y: front + frontAt(progress) + 1.45 * Math.sin(distance / 17) + .55 * Math.sin(distance / 3.7),
  }));
  // Narrow traverses sit under the main bays so their junction remains a
  // continuous depression rather than two overlapping cutout images.
  for (let x = zone.left + 100; x < zone.right - 70; x += 285) {
    const y = front + frontAt((x - left) / length);
    const reach = Math.min(77, zone.bottom - y - 11);
    const samples = bankSamples(reach, x, (distance, progress) => ({
      x: x + 12 * progress + Math.sin(distance / 12),
      y: y + distance,
    }));
    renderCut(ctx, samples, { x: 1, y: 0 }, .47, x);
  }
  renderCut(ctx, frontSamples, { x: 0, y: 1 }, 1, 29);

  // Sparse weathered revetment timbers and scattered knots emphasize the
  // depth of the inner face, leaving long runs of bare soil visible.
  for (let index = 9; index < frontSamples.length - 9; index += 2) {
    if (Math.sin(index / 14) < -.24 || sceneryNoise(41, index) < .17) continue;
    const { x, y, spread } = frontSamples[index];
    const length = 4 + sceneryNoise(43, index) * 4;
    ctx.fillStyle = '#4f4131';
    ctx.fillRect(x, y - 3 * spread, 2.2, length);
    ctx.fillStyle = '#998465';
    ctx.fillRect(x, y - 3 * spread, 1, length - 1);
  }
}
