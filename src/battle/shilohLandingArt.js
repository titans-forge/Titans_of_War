import { drawNaturalRoad } from './realisticScenery.js';

export const SHILOH_LANDING_ART = Object.freeze({
  key: 'shiloh-pittsburg-landing',
  src: 'images/battles/shiloh-pittsburg-landing-v1.webp',
});
export const SHILOH_LANDING_LABEL = Object.freeze({ x: 1305, y: 800 });

export function shilohLandingArtEnabled(scenarioId, rules, search = '') {
  if (scenarioId !== 'shiloh' || !(rules >= 18)) return false;
  const passes = new URLSearchParams(search).getAll('artPass');
  return passes.length !== 1 || passes[0] !== 'shiloh-landmarks-classic';
}

// These coordinates are illustrative on the compressed 1500 × 900 board.
// The river edge leaves the movement area, Buell's arrival and all three
// south-edge Union withdrawals on land, including the rightmost exit sign.
const shoreline = [
  [1500, 650], [1486, 672], [1477, 702], [1472, 728],
  [1470, 752], [1474, 783], [1470, 808], [1474, 832],
  [1470, 857], [1471, 865], [1467, 875], [1460, 882],
  [1440, 889], [1420, 895], [1398, 900],
];
const approach = [
  { x: 1102, y: 753 }, { x: 1160, y: 769 }, { x: 1206, y: 797 },
  { x: 1255, y: 822 }, { x: 1300, y: 836 }, { x: 1351, y: 843 },
  { x: 1400, y: 855 }, { x: 1461, y: 882 },
];
const waterArea = { x: 1398, y: 650, width: 102, height: 250 };

function trace(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
}

function drawApproach(ctx) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(188, 154, 106, .22)';
  ctx.lineWidth = 29;
  trace(ctx, approach.map(point => [point.x, point.y]));
  ctx.stroke();
  const apron = ctx.createRadialGradient(1419, 868, 5, 1419, 868, 48);
  apron.addColorStop(0, 'rgba(205, 177, 130, .54)');
  apron.addColorStop(1, 'rgba(205, 177, 130, 0)');
  ctx.fillStyle = apron;
  ctx.fillRect(1371, 820, 96, 80);
  for (let index = 1; index < approach.length; index++) {
    drawNaturalRoad(ctx, approach[index - 1], approach[index], 23 + index * 3, 1862 + index);
  }
  ctx.restore();
}

function drawWater(ctx, image) {
  ctx.save();
  ctx.lineJoin = 'round';
  for (const [width, color] of [
    [25, 'rgba(76, 63, 44, .17)'],
    [16, 'rgba(173, 142, 101, .44)'],
    [7, 'rgba(95, 79, 54, .64)'],
  ]) {
    trace(ctx, shoreline);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  trace(ctx, shoreline);
  ctx.lineTo(1500, 900);
  ctx.closePath();
  ctx.clip();
  const { x, y, width, height } = waterArea;
  const scale = Math.max(width / image.width, height / image.height);
  const drawnWidth = image.width * scale, drawnHeight = image.height * scale;
  ctx.drawImage(image, x + (width - drawnWidth) / 2, y + (height - drawnHeight) / 2, drawnWidth, drawnHeight);
  ctx.fillStyle = 'rgba(75, 125, 150, .32)';
  ctx.fillRect(x, y, width, height);
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = 'rgba(194, 219, 221, .37)';
  for (const ripple of [
    [[1486, 718], [1483, 732], [1484, 741]],
    [[1492, 755], [1493, 765], [1491, 775]],
    [[1481, 805], [1484, 817], [1483, 821]],
    [[1490, 847], [1488, 858], [1483, 867]],
  ]) {
    trace(ctx, ripple);
    ctx.stroke();
  }
  trace(ctx, shoreline);
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(193, 198, 154, .33)';
  ctx.stroke();
  ctx.restore();
}

/** Bake the river and wagon approach under the game pieces, with no rule data. */
export function drawShilohLandingArt(scene, ctx) {
  const { scenarioId, battleRulesVersion } = scene.engine;
  if (!shilohLandingArtEnabled(scenarioId, battleRulesVersion, scene.artPassSearch)
      || !scene.textures.exists(SHILOH_LANDING_ART.key)) return false;
  const image = scene.textures.get(SHILOH_LANDING_ART.key).getSourceImage();
  if (!(image?.width > 0 && image?.height > 0)) return false;
  drawApproach(ctx);
  drawWater(ctx, image);
  return true;
}
