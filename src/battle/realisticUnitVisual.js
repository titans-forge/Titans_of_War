import { deterministicUnitValue } from './formationMath.js';

// Presentation only. Stable proportions and cloth tones belong to a soldier,
// not a frame; nothing here changes the formation's feet or combat footprint.
export function realisticInfantryPose(formationId, figure, time, reducedMotion = false, resolving = false) {
  const seed = deterministicUnitValue(formationId, figure.id, 211);
  const width = 0.94 + deterministicUnitValue(formationId, figure.id, 213) * 0.10;
  const height = 0.95 + deterministicUnitValue(formationId, figure.id, 215) * 0.10;
  const active = !reducedMotion && !resolving;
  const stepping = ['walk', 'route'].includes(figure.action);
  const restRow = seed < .18 ? 1 : seed > .82 ? 2 : 0;
  const row = stepping ? [1, 0, 2, 0][figure.frame % 4] : ['fire', 'melee'].includes(figure.action) ? 3 : figure.action === 'idle' ? restRow : 0;
  const breath = active && figure.action === 'idle' ? Math.sin(time * (1.25 + seed * 0.5) + seed * 17) : 0;
  const thrust = active && figure.action === 'melee' ? Math.sin(time * 8 + seed * 15) : 0;
  const bearing = figure.direction * Math.PI / 4;
  const tint = [0xfff8ef, 0xf3f1e9, 0xddd6c9, 0xf0dec0][Math.floor(seed * 4) % 4];
  return {
    frame: `${row}-${figure.direction === 4 ? 0 : figure.direction === 7 ? 5 : figure.direction}`, flip: figure.direction === 4 || figure.direction === 7, axialAim: row === 3 && [2, 6].includes(figure.direction), width, height, tint,
    angle: figure.fallen ? (reducedMotion ? 82 : Math.min(82, 25 + figure.frame * 22)) : (figure.lean || 0) + breath * 0.65 + thrust * 1.5,
    offsetX: figure.fallen ? 0 : (figure.bodyOffsetX || 0) + Math.cos(bearing) * thrust * 1.8 * figure.scale,
    offsetY: figure.fallen ? 0 : (figure.bodyOffsetY || 0) - breath * 0.2 * figure.scale + Math.sin(bearing) * thrust * 1.1 * figure.scale,
  };
}

// Bounded ground-level dust follows actual travel. Pausing cannot add particles,
// and stopping leaves a short fading trail instead of an instant vanishing puff.
export function updateTravelDust(state, { x, y, time, moving, reducedMotion = false, resolving = false }) {
  state.puffs ||= [];
  if (reducedMotion || resolving || (state.time != null && time < state.time)) state.puffs = [];
  state.puffs = state.puffs.filter(puff => time - puff.time < 1.25);
  if (!reducedMotion && !resolving && moving && state.time != null && time > state.time
    && Math.hypot(x - state.x, y - state.y) >= 0.3 && time - (state.emittedAt ?? -Infinity) >= 0.12) {
    state.puffs.push({ x, y, time, seed: (state.serial = (state.serial || 0) + 1) });
    state.puffs = state.puffs.slice(-12);
    state.emittedAt = time;
  }
  state.x = x; state.y = y; state.time = time;
  return state.puffs.map(puff => ({ ...puff, age: Math.max(0, time - puff.time), alpha: Math.max(0, 1 - (time - puff.time) / 1.25) * 0.055 }));
}
