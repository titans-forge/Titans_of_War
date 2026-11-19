import { canCommand } from './battleUsability.js';

// A bearing to the confirmed destination. The simulation remains responsible
// for steering around terrain and formations.
export function drawConfirmedMoveCue(graphics, unit, zoom) {
  if (!canCommand(unit) || unit.status === 'surrendered') return;
  const queued = unit.pendingCommand;
  const destination = queued
    ? (queued.order === 'move' ? queued.point : null)
    : (unit.directMove && unit.order === 'advance' ? unit.target : null);
  if (!Number.isFinite(destination?.x) || !Number.isFinite(destination?.y)) return;

  const scale = 1 / Math.max(.01, zoom);
  const color = 0xf2d996;
  graphics.lineStyle(1.6 * scale, color, queued ? .84 : .9);
  graphics.lineBetween(unit.x, unit.y, destination.x, destination.y);
  graphics.strokeCircle(destination.x, destination.y, 7 * scale);
  if (!queued) graphics.fillStyle(color, .9).fillCircle(destination.x, destination.y, 2 * scale);
}
