const LIGHT = { x: -.46, y: -.59, z: .66 };
const clamp01 = value => Math.min(1, Math.max(0, value));
const bell = distance => Math.exp(-distance * distance);

function smooth(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function grainAt(x, y) {
  const seed = Math.imul(x + 71, 73856093) ^ Math.imul(y + 29, 19349663);
  const mixed = Math.imul(seed ^ (seed >>> 13), 1274126177);
  return ((mixed ^ (mixed >>> 16)) >>> 0) / 4294967296 - .5;
}

function sedimentNoise(x, y) {
  const col = Math.floor(x), row = Math.floor(y);
  const tx = smooth(x - col), ty = smooth(y - row);
  const nw = grainAt(col, row), sw = grainAt(col, row + 1);
  const north = nw + (grainAt(col + 1, row) - nw) * tx;
  const south = sw + (grainAt(col + 1, row + 1) - sw) * tx;
  return north + (south - north) * ty;
}

export function petersburgReliefPlan(battle) {
  if (battle.scenarioId !== 'petersburg' || !battle.fieldBattle) return null;
  const basin = battle.fieldBattle.zones.find(zone => zone.kind === 'crater');
  if (!basin) return null;
  const halfWidth = (basin.right - basin.left) * .445;
  const halfHeight = (basin.bottom - basin.top) * .42;
  return {
    world: battle.world,
    basin,
    center: { x: (basin.left + basin.right) / 2, y: (basin.top + basin.bottom) / 2 },
    halfWidth,
    halfHeight,
    roads: battle.config.movement?.roadBands ?? [],
  };
}

function groundAt(plan, x, y) {
  const nx = (x - plan.center.x) / plan.halfWidth;
  const cantedY = plan.center.y + 10 * Math.sin(nx * 1.8) - 4 * Math.sin(nx * 5);
  const ny = (y - cantedY) / plan.halfHeight;
  const angle = Math.atan2(ny, nx);
  const fracturedRim = 1 + .064 * Math.cos(angle * 5 + .6) + .047 * Math.sin(angle * 9)
    + .024 * Math.sin(nx * 17 + ny * 14);
  const radius = Math.hypot(nx, ny) / fracturedRim;

  // A higher secondary shoulder beyond the breach and softly rolling
  // approaches. The elevation values are painter units, not terrain rules.
  const rise = 28 * bell((y - 680 + 40 * Math.cos(x / 370)) / 140);
  const fold = 14 * bell((y - 305 - 30 * Math.cos(x / 305)) / 126);
  const uneven = 6 * Math.sin(x / 111 + y / 86) + 5 * Math.cos(x / 201 - y / 91);
  const bowl = 62 * (1 - smooth((radius - .32) / .69));
  const spoils = bell((radius - .94) / .14) * (9 + 5 * Math.sin(angle * 4 + nx * 5));
  const gullies = 4 * Math.sin(angle * 11 + radius * 5) * bell((radius - .72) / .25);
  const clay = 1 - smooth((radius - .86) / .29);
  // Larger clay and silt patches have rounded edges. On the exposed walls,
  // faint bedding follows the cut and breaks up with the surrounding soil.
  const mottling = clay > 0
    ? 46 * sedimentNoise(x / 40, y / 29) + 24 * sedimentNoise(x / 14 + 7, y / 12)
    : 0;
  const bedding = 6 * Math.sin(radius * 23 + nx * 7 + .9 * Math.cos(ny * 7)) * bell((radius - .76) / .15);
  return {
    height: rise + fold + uneven - bowl + spoils + gullies,
    clay,
    bowl: 1 - smooth(radius / .7),
    sediment: mottling + bedding,
  };
}

export function shadePetersburgPixels(pixels, width, height, plan) {
  const cols = Math.ceil(width / 5) + 1;
  const rows = Math.ceil(height / 5) + 1;
  const stepX = plan.world.width / (cols - 1);
  const stepY = plan.world.height / (rows - 1);
  const elevation = new Float32Array(rows * cols);
  const clay = new Float32Array(rows * cols);
  const bowl = new Float32Array(rows * cols);
  const sediment = new Float32Array(rows * cols);
  const light = new Float32Array(rows * cols);
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const at = row * cols + col;
    const ground = groundAt(plan, col * stepX, row * stepY);
    elevation[at] = ground.height;
    clay[at] = ground.clay;
    bowl[at] = ground.bowl;
    sediment[at] = ground.sediment;
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const west = Math.max(0, col - 1), east = Math.min(cols - 1, col + 1);
    const north = Math.max(0, row - 1), south = Math.min(rows - 1, row + 1);
    const dx = (elevation[row * cols + east] - elevation[row * cols + west]) / ((east - west) * stepX);
    const dy = (elevation[south * cols + col] - elevation[north * cols + col]) / ((south - north) * stepY);
    const incident = (LIGHT.z - LIGHT.x * dx - LIGHT.y * dy) / Math.hypot(1, dx, dy);
    light[row * cols + col] = 1 + .66 * (incident - LIGHT.z);
  }

  function interpolate(grid, at, fx, fy) {
    const top = grid[at] + (grid[at + 1] - grid[at]) * fx;
    const below = at + cols;
    const bottom = grid[below] + (grid[below + 1] - grid[below]) * fx;
    return top + (bottom - top) * fy;
  }
  const scaleX = (cols - 1) / width;
  const scaleY = (rows - 1) / height;
  for (let y = 0; y < height; y++) {
    const gy = y * scaleY, row = Math.floor(gy), fy = gy - row;
    for (let x = 0; x < width; x++) {
      const gx = x * scaleX, col = Math.floor(gx), fx = gx - col;
      const at = row * cols + col;
      const soil = interpolate(clay, at, fx, fy);
      const index = (y * width + x) * 4;
      let shade = interpolate(light, at, fx, fy);
      if (soil <= 0) {
        pixels[index] *= shade;
        pixels[index + 1] *= shade;
        pixels[index + 2] *= shade;
        continue;
      }
      const floor = interpolate(bowl, at, fx, fy);
      shade *= (1 - .22 * floor);
      const bare = smooth((soil - .30) / .70);
      const pastureLuma = pixels[index] * .38 + pixels[index + 1] * .51 + pixels[index + 2] * .11;
      const grit = (pastureLuma - 116) * (.60 - .53 * bare)
        + interpolate(sediment, at, fx, fy) * bare + grainAt(x, y) * 9 * bare;
      pixels[index] = (pixels[index] * (1 - soil) + (153 + grit - 8 * floor) * soil) * shade;
      pixels[index + 1] = (pixels[index + 1] * (1 - soil) + (106 + grit - 4 * floor) * soil) * shade;
      pixels[index + 2] = (pixels[index + 2] * (1 - soil) + (77 + grit + 3 * floor) * soil) * shade;
    }
  }
}

export function drawPetersburgRelief(context, source, plan) {
  const { width, height } = plan.world;
  context.drawImage(source, 0, 0, width, height);
  const image = context.getImageData(0, 0, width, height);
  shadePetersburgPixels(image.data, width, height, plan);
  context.putImageData(image, 0, 0);
}
