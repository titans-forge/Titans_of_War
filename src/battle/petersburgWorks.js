import { drawNaturalRoad, sceneryNoise } from './realisticScenery.js';

// Relief bands in order from worked grass to inner shadow and tread.
const EARTH_BANDS = [
  [-1.42, 1.4, 'rgba(110,91,61,.19)'],
  [-1.16, 1.26, 'rgba(149,121,85,.24)'],
  [-.94, 1.02, 'rgba(161,124,86,.42)'],
  [-.8, -.30, 'rgba(188,149,104,.47)'],
  [-.32, .26, 'rgba(66,46,33,.76)'],
  [.10, .64, 'rgba(106,73,51,.80)'],
  [.29, .57, 'rgba(151,109,73,.68)'],
  [.64, .86, 'rgba(180,140,95,.41)'],
];

function trenchSamples(anchors, scale, seed) {
  const samples = [];
  for (let segment = 1; segment < anchors.length; segment++) {
    const from = anchors[segment - 1], to = anchors[segment];
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.ceil(distance / 4);
    for (let index = 0; index < steps; index++) {
      const t = index / steps;
      const grain = (sceneryNoise(seed, samples.length) - .5) * 2.4;
      const width = scale * (.94 + .13 * Math.sin(samples.length / 9) + .09 * grain);
      samples.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t + grain, width });
    }
  }
  samples.push({ ...anchors.at(-1), width: scale });
  return samples.map((point, index) => ({ ...point, width: point.width * Math.min(index / 7, (samples.length - 1 - index) / 7, 1) }));
}

function paintCut(ctx, anchors, scale, seed) {
  const samples = trenchSamples(anchors, scale, seed);
  for (const [start, end, color] of EARTH_BANDS) {
    ctx.beginPath();
    ctx.moveTo(samples[0].x, samples[0].y);
    for (const { x, y, width } of samples) ctx.lineTo(x, y + width * start);
    for (let i = samples.length - 1; i >= 0; i--) {
      const { x, y, width } = samples[i];
      ctx.lineTo(x, y + width * end);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  for (let i = 6; i < samples.length - 6; i++) {
    const { x, y, width } = samples[i];
    for (let n = 0; n < 6; n++) {
      const key = 6 * i + n;
      const offset = (sceneryNoise(seed + 3, key) - .5) * width * 2.2;
      const size = .5 + 2 * sceneryNoise(seed + 6, key);
      ctx.fillStyle = n % 3 ? 'rgba(74,55,37,.28)' : 'rgba(210,175,120,.43)';
      ctx.fillRect(x + (n - 3) * .9, y + offset, size, .7 + size * .3);
    }
    if (i % 3 === 0 && Math.sin(i / 6 - seed) > -.37 && sceneryNoise(seed, i) > .25) {
      ctx.fillStyle = '#584533';
      ctx.fillRect(x, y - width * .24, 2, width * .52);
      ctx.fillStyle = '#a48258';
      ctx.fillRect(x, y - width * .24, .8, width * .39);
    }
  }
}

export function drawPetersburgWorks(ctx, zone) {
  const width = zone.right - zone.left;
  const secondary = zone.bottom > 600;
  const y = secondary ? zone.top + 49 : zone.bottom - 37;
  const shape = secondary
    ? [[.02, 8], [.095, 8], [.135, -9], [.22, -8], [.26, 4], [.345, 4], [.38, -9],
      [.44, -8], [.485, 7], [.535, 7], [.57, -6], [.644, -3], [.69, 11], [.76, 10],
      [.8, -3], [.87, -1], [.91, 12], [.98, 15]]
    : [[.02, -11], [.14, -11], [.235, 5], [.39, 5], [.44, -5], [.585, -5],
      [.66, 7], [.79, 9], [.87, -3], [.98, -4]];
  const anchors = shape.map(([progress, offset]) => ({ x: zone.left + width * progress, y: y + offset }));
  const seed = secondary ? 75 : zone.left;
  for (const [progress, offset] of shape.filter((_, index) => index % (secondary ? 4 : 3) === 2)) {
    const startX = zone.left + width * progress, startY = y + offset;
    const turn = secondary ? 1 : -1;
    paintCut(ctx, [
      { x: startX - 12, y: startY },
      { x: startX + 3, y: startY + turn * 16 },
      { x: startX + 16, y: startY + turn * 30 },
      { x: startX + 33, y: startY + turn * 31 },
    ], secondary ? 6.5 : 5.5, seed + startX);
  }
  paintCut(ctx, anchors, secondary ? 16 : 11, seed);
}

function drawScatteredSoil(ctx, basin) {
  const x = (basin.right + basin.left) / 2;
  const y = (basin.bottom + basin.top) / 2;
  const rx = (basin.right - basin.left) * .42;
  const ry = (basin.bottom - basin.top) * .40;
  for (let i = 0; i < 420; i++) {
    const angle = sceneryNoise(722, i) * Math.PI * 2;
    const scatter = .37 + sceneryNoise(719, i) * .75;
    const sx = x + Math.cos(angle) * rx * scatter;
    const sy = y + Math.sin(angle) * ry * scatter;
    const size = .6 + sceneryNoise(718, i) * 2;
    ctx.fillStyle = i % 3 ? 'rgba(82,54,40,.31)' : 'rgba(217,173,124,.37)';
    ctx.fillRect(sx, sy, size * 1.8, size);
    if (i % 37 !== 0) continue;
    // Broken revetment timbers scatter irregularly, below formation scale.
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle * .86);
    const length = 8 + size * 4;
    ctx.fillStyle = 'rgba(49,31,22,.61)';
    ctx.fillRect(2, 2, length, 2.6);
    ctx.fillStyle = 'rgba(169,133,93,.72)';
    ctx.fillRect(0, 0, length, 2.2);
    ctx.restore();
  }
}

function drawApproachScars(ctx, basin, road) {
  if (road.axis !== 'x' || road.value < basin.left || road.value > basin.right) return;
  for (const [edge, sign] of [[basin.top, -1], [basin.bottom, 1]]) {
    for (let i = 0; i < 99; i++) {
      const along = sceneryNoise(120, i);
      const offset = (sceneryNoise(150, i) - .5) * road.width * (.5 + along * .4);
      const x = road.value + offset;
      const y = edge + sign * along * 31;
      const size = .7 + sceneryNoise(170, i) * 3;
      ctx.fillStyle = i % 3 ? 'rgba(109,78,50,.34)' : 'rgba(194,151,104,.42)';
      ctx.fillRect(x, y, size * 1.5, size);
    }
  }
}

export function drawPetersburgSiegeTerrain(ctx, plan, zones) {
  for (const zone of zones) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(zone.left, zone.top, zone.right - zone.left, zone.bottom - zone.top);
    ctx.clip();
    if (zone.kind === 'earthworks') drawPetersburgWorks(ctx, zone);
    if (zone.kind === 'crater') drawScatteredSoil(ctx, zone);
    ctx.restore();
  }
  for (const road of plan.roads) {
    const vertical = road.axis === 'x';
    const { world, basin } = plan;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, world.width, world.height);
    ctx.rect(basin.left, basin.top, basin.right - basin.left, basin.bottom - basin.top);
    ctx.clip('evenodd');
    const start = vertical ? { x: road.value, y: 0 } : { x: 0, y: road.value };
    const end = vertical ? { x: road.value, y: world.height } : { x: world.width, y: road.value };
    drawNaturalRoad(ctx, start, end, road.width, 51);
    drawApproachScars(ctx, basin, road);
    ctx.restore();
  }
}
