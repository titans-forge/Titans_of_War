import { sceneryNoise } from './realisticScenery.js';
import { createTransparentCanvasTexture } from './transparentCanvasTexture.js';

// Normalized stains inside the basin, representing churned ground. The
// underlying shaded pit is always visible, including after recovery.
const disturbance = {
  contested: [[.47, .47, .26, .22], [.64, .54, .16, .20]],
  contained: [[.34, .45, .19, .25], [.69, .52, .20, .23]],
  overrun: [[.52, .54, .25, .20], [.58, .74, .21, .19], [.66, .87, .14, .12]],
  sealed: [[.40, .66, .17, .15], [.63, .63, .20, .14], [.72, .55, .12, .18]],
};

function stampDisturbance(ctx, width, height, profile, seed) {
  const [nx, ny, spreadX, spreadY] = profile;
  const x = nx * width, y = ny * height, rx = spreadX * width, ry = spreadY * height;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  const wash = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  wash.addColorStop(0, 'rgba(95,67,44,.26)');
  wash.addColorStop(.5, 'rgba(132,92,58,.17)');
  wash.addColorStop(1, 'rgba(144,104,65,0)');
  ctx.fillStyle = wash;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
  for (let i = 0; i < 85; i++) {
    const angle = sceneryNoise(seed, i) * Math.PI * 2;
    const radius = sceneryNoise(seed + 3, i) * .87;
    const fleckX = x + Math.cos(angle) * rx * radius;
    const fleckY = y + Math.sin(angle) * ry * radius;
    const opacity = (1 - radius) * .34;
    ctx.fillStyle = i % 3 ? `rgba(53,36,25,${opacity})` : `rgba(222,177,124,${opacity})`;
    ctx.fillRect(fleckX, fleckY, 1.5 + sceneryNoise(seed + 7, i) * 2, .8);
  }
}

export function createPetersburgGroundState(scene, basin) {
  const width = basin.right - basin.left, height = basin.bottom - basin.top;
  const key = 'petersburg-ground-condition';
  const texture = createTransparentCanvasTexture(scene, key, width, height);
  const context = texture.context;
  const image = scene.add.image(basin.left, basin.top, key).setOrigin(0).setDepth(1).setVisible(false);
  let rendered = null;
  return state => {
    if (state === rendered) return;
    rendered = state;
    const profiles = Object.hasOwn(disturbance, state) ? disturbance[state] : null;
    image.setVisible(Boolean(profiles));
    if (!profiles) return;
    context.clearRect(0, 0, width, height);
    profiles.forEach((profile, index) => stampDisturbance(context, width, height, profile, 600 + index * 7));
    texture.refresh();
  };
}
