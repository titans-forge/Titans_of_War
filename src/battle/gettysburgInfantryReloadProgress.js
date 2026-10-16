// Gettysburg records the volley time and remaining reload in combat state.
// The timer is initialized once, including suppression and moving-fire costs,
// then counts down. Its elapsed plus remaining duration therefore supplies an
// ordered presentation without another clock or checkpoint field. The first
// half second belongs to the existing firing pose.
export function gettysburgInfantryReloadProgress(formation, time) {
  if (!formation || formation.type !== 'infantry'
    || !Number.isFinite(time) || time < 0
    || !Number.isFinite(formation.lastVolleyAt) || formation.lastVolleyAt < 0
    || formation.lastVolleyAt > time
    || !Number.isFinite(formation.reload) || formation.reload < 0) return null;
  const elapsed = Math.max(0, time - formation.lastVolleyAt - 0.5);
  const duration = elapsed + formation.reload;
  if (!Number.isFinite(duration)) return null;
  if (duration === 0) return 1;
  return Math.max(0, Math.min(1, elapsed / duration));
}
