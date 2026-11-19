const GRID_SPACING = 5;
const LIGHT = { x: -.49, y: -.57, z: .66 };
const bell = value => Math.exp(-value * value);
const clamp01 = value => Math.max(0, Math.min(1, value));

function smoothstep(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

export function coldHarborReliefPlan(battle) {
  if (battle.scenarioId !== 'cold_harbor' || !battle.fieldBattle) return null;
  const { zones } = battle.fieldBattle;
  const ravine = zones.find(zone => zone.kind === 'ravine');
  const works = zones.find(zone => zone.kind === 'earthworks');
  const pike = battle.config.movement?.roadBands?.find(road => road.axis === 'x');
  if (!ravine || !works || !pike) return null;
  return { world: battle.world, ravine, works, pike };
}

function landSection(plan, x) {
  const { world, ravine, works, pike } = plan;
  const t = x / world.width;
  const ravineT = (x - ravine.left) / (ravine.right - ravine.left);
  const withinRavine = smoothstep(ravineT / .09) * smoothstep((1 - ravineT) / .1);
  const mainDrain = (ravine.top + ravine.bottom) / 2
    + 36 * Math.sin(t * 7.7 + .4) + 15 * Math.sin(t * 17 - .4);
  // The road crosses a shallow saddle at its existing centerline.
  const shallows = bell((x - pike.value) / (pike.width * .86));
  const northArmPosition = clamp01((x - ravine.left) / (world.width * .52));
  const northArm = mainDrain - 76 * (1 - northArmPosition) - 6
    + 8 * Math.sin(t * 13 + .55);
  const northArmDepth = withinRavine * smoothstep((.57 - t) / .16) * (1 - .86 * shallows);
  const worksRidge = works.top + .53 * (works.bottom - works.top)
    + 13 * Math.sin(t * 9 + .6) + 6 * Math.sin(t * 19);
  return {
    t, withinRavine, mainDrain, northArm, northArmDepth, worksRidge,
    trenchSideStrength: 46 + 13 * Math.sin(t * 6 - .3),
    ravineDepth: withinRavine * (1 - .58 * shallows) * (.91 + .11 * Math.sin(t * 18 + 2.3)),
    ravineWidth: 42 + 10 * Math.sin(t * 13 + .8) - 12 * shallows,
    northernRise: ravine.top - 91 + 51 * Math.sin(t * 6.4 + 1.2) - 52 * t,
    farRise: ravine.top - 271 + 62 * Math.sin(t * 4.8 - .4),
  };
}

function groundProfile(section, y) {
  const north = bell((y - section.northernRise) / 91);
  const far = bell((y - section.farRise) / 90);
  const works = bell((y - section.worksRidge) / 78);
  const drainage = bell((y - section.mainDrain) / section.ravineWidth);
  const tributary = bell((y - section.northArm) / 24);
  const roll = 11 * Math.sin(y / 81 + section.t * 8.9) * Math.sin(section.t * 17 + y / 137)
    + 7 * Math.sin(y / 129 - section.t * 13);
  const elevation = (39 + 14 * Math.sin(section.t * 4.6)) * north
    + 27 * far + section.trenchSideStrength * works + roll
    - 54 * section.ravineDepth * drainage - 29 * section.northArmDepth * tributary;
  const damp = clamp01(section.ravineDepth * drainage + .38 * section.northArmDepth * tributary);
  return { elevation, damp };
}

export function shadeColdHarborPixels(pixels, width, height, plan) {
  const cols = Math.ceil(width / GRID_SPACING) + 1;
  const rows = Math.ceil(height / GRID_SPACING) + 1;
  const dx = plan.world.width / (cols - 1);
  const dy = plan.world.height / (rows - 1);
  const sections = Array.from({ length: cols }, (_, col) => landSection(plan, col * dx));
  const elevations = new Float32Array(cols * rows);
  const dampness = new Float32Array(cols * rows);
  const shades = new Float32Array(cols * rows);
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const at = row * cols + col;
    const ground = groundProfile(sections[col], row * dy);
    elevations[at] = ground.elevation;
    dampness[at] = ground.damp;
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const west = Math.max(0, col - 1);
    const east = Math.min(cols - 1, col + 1);
    const north = Math.max(0, row - 1);
    const south = Math.min(rows - 1, row + 1);
    const slopeX = (elevations[row * cols + east] - elevations[row * cols + west]) / ((east - west) * dx);
    const slopeY = (elevations[south * cols + col] - elevations[north * cols + col]) / ((south - north) * dy);
    // A shared key direction and a broad ambient floor retain unit silhouettes.
    const incident = (LIGHT.z - LIGHT.x * slopeX - LIGHT.y * slopeY)
      / Math.sqrt(1 + slopeX * slopeX + slopeY * slopeY);
    shades[row * cols + col] = 1 + .62 * (incident - LIGHT.z);
  }

  function atPixel(grid, upperLeft, fy, fx) {
    const top = grid[upperLeft] + (grid[upperLeft + 1] - grid[upperLeft]) * fx;
    const bottomLeft = upperLeft + cols;
    const bottom = grid[bottomLeft] + (grid[bottomLeft + 1] - grid[bottomLeft]) * fx;
    return top + (bottom - top) * fy;
  }
  const cellWidth = (cols - 1) / width;
  const cellHeight = (rows - 1) / height;
  for (let y = 0; y < height; y++) {
    const gy = y * cellHeight;
    const row = Math.floor(gy);
    const fy = gy - row;
    for (let x = 0; x < width; x++) {
      const gx = x * cellWidth;
      const col = Math.floor(gx);
      const at = row * cols + col;
      const fx = gx - col;
      const shade = atPixel(shades, at, fy, fx);
      const damp = atPixel(dampness, at, fy, fx);
      const heightTint = Math.tanh(atPixel(elevations, at, fy, fx) / 45);
      const silt = damp * damp * damp;
      const i = (y * width + x) * 4;
      // Preserve the fine photographed grass texture in both dry and damp soil.
      pixels[i] = shade * (pixels[i] * (1 - .13 * damp) + 3 + 9 * heightTint + 18 * silt);
      pixels[i + 1] = shade * (pixels[i + 1] * (1 - .11 * damp) + 1 + 4 * heightTint + 10 * silt);
      pixels[i + 2] = shade * (pixels[i + 2] * (1 - .02 * damp) + 8 * damp - 2 * heightTint);
    }
  }
}

export function drawColdHarborRelief(context, source, plan) {
  const { width, height } = plan.world;
  context.drawImage(source, 0, 0, width, height);
  const image = context.getImageData(0, 0, width, height);
  shadeColdHarborPixels(image.data, width, height, plan);
  context.putImageData(image, 0, 0);
}
