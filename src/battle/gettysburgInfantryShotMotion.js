import { deterministicUnitValue } from './formationMath.js';

// Match formationVisualState's firing window and per-figure stagger. The
// caller supplies battle time, so paused presentation cannot start a clock.
export function gettysburgInfantryShootingAge(formation, figureId, battleTime) {
  if (!formation || !Number.isFinite(formation.lastVolleyAt) || !Number.isFinite(battleTime)) return null;
  const stagger = formation.footprint ? deterministicUnitValue(formation.id, figureId, 123) * .09 : 0;
  return battleTime - formation.lastVolleyAt - stagger;
}

const smoothstep = value => value * value * (3 - 2 * value);
const ZERO_MOTION = Object.freeze({ offsetX: 0, offsetY: 0, angle: 0 });
const PEAK_AGE = .08;
const SETTLED_AGE = .40;
const MAX_RECOIL = 1.1;

// Translate the whole firing source a small distance behind its authored
// bearing. Both ends and the peak have zero slope; the body has settled before
// the .5 firing window ends. Native pivots, aim, and march geometry stay intact.
export function gettysburgInfantryShotMotion(figure, {
  shootingAge, reducedMotion = false, resolving = false,
} = {}) {
  if (!figure || figure.action !== 'fire' || reducedMotion || resolving
    || !Number.isFinite(shootingAge) || shootingAge <= 0 || shootingAge >= SETTLED_AGE
    || !Number.isInteger(figure.direction) || figure.direction < 0 || figure.direction > 7) return ZERO_MOTION;
  const scale = figure.scale === undefined ? 1 : figure.scale;
  if (!Number.isFinite(scale) || scale <= 0) return ZERO_MOTION;
  const pulse = shootingAge <= PEAK_AGE ? smoothstep(shootingAge / PEAK_AGE)
    : 1 - smoothstep((shootingAge - PEAK_AGE) / (SETTLED_AGE - PEAK_AGE));
  const recoil = MAX_RECOIL * scale * pulse;
  const bearing = figure.direction * Math.PI / 4;
  return { offsetX: -Math.cos(bearing) * recoil, offsetY: -Math.sin(bearing) * recoil * .5, angle: 0 };
}
