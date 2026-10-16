// Presentation only: a departing formation is already absent from combat.
export const RETREAT_FADE_DURATION = 1;
export function retreatOpacity(unit, fieldTime, reducedMotion = false) {
  if (!unit.withdrawn || !Number.isFinite(unit.retiredAt) || reducedMotion) return 0;
  return Math.max(0, Math.min(1, 1 - (fieldTime - unit.retiredAt) / RETREAT_FADE_DURATION));
}
