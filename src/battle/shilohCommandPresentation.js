import { SHILOH_RESERVE_RULES } from './shilohReserveObjective.js';

export const SHILOH_RESERVE_ID = 'breckinridge-reserve';

export function shilohCommandReadout(objective, network) {
  if (!objective || !network) return null;
  const issue = !objective.protectedCommander ? 'Johnston needs to remain protected.'
    : network.frontIssue || network.reserveIssue
      || (network.organizedRatio < SHILOH_RESERVE_RULES.retained ? 'Keep at least 65% of the army organized on the field.' : null);
  const waiting = objective.elapsed < objective.responseTime;
  const complete = objective.held + 1e-8 >= objective.required;
  const status = issue ? waiting ? 'Support needs attention' : 'Support interrupted'
    : waiting ? 'Front and reserve ready'
      : complete ? 'Support established' : 'Building reserve support';
  const detail = issue || (waiting ? `The timer starts at minute ${objective.responseTime}.`
    : complete ? `Hold the line through minute ${objective.deadline}.` : 'Keep the links in place without interruption.');
  const timer = `${objective.held.toFixed(1)} / ${objective.required} min`;
  const compact = !issue && waiting ? `Ready · starts at ${objective.responseTime}`
    : issue ? `${waiting ? 'Re-form support' : 'Support interrupted'} · ${timer}`
      : complete ? `Hold through minute ${objective.deadline} · ${timer}` : `Support · ${timer}`;
  return {
    status, detail, timer, interrupted: Boolean(issue), compact,
  };
}

const FRONT = 0xa9e7d4;
const RESERVE = 0xf3cc78;
const GAP = 0xf2a580;

function drawLink(graphics, from, to, zoom, color, pattern) {
  if (!from || !to) return;
  const dx = to.x - from.x, dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length <= 1) return;
  // Leave room for the formations at either end. Line and dash widths stay
  // legible at overview without growing over the figures at close zoom.
  const margin = Math.min(27, length * .18);
  const end = length - margin;
  const stroke = (width, tint, alpha) => {
    graphics.lineStyle(width / zoom, tint, alpha);
    const segment = pattern ? pattern[0] / zoom : length;
    const gap = pattern ? pattern[1] / zoom : 0;
    for (let start = margin; start < end; start += segment + gap) {
      const finish = Math.min(end, start + segment);
      graphics.lineBetween(from.x + dx * start / length, from.y + dy * start / length,
        from.x + dx * finish / length, from.y + dy * finish / length);
    }
  };
  stroke(4, 0x19251f, .8);
  stroke(2, color, .95);
}

export function drawShilohCommandLinks(graphics, formations, network, zoom) {
  graphics.clear();
  if (!network || !Number.isFinite(zoom) || zoom <= 0) return;
  const units = new Map(formations.map(unit => [unit.id, unit]));
  for (const { from, to } of network.frontLinks) drawLink(graphics, units.get(from), units.get(to), zoom, FRONT);
  for (const { from, to } of network.reserveLinks) drawLink(graphics, units.get(from), units.get(to), zoom, RESERVE, [8, 5]);
  if (network.reserveReady && !network.supported && network.nearestFrontId) {
    drawLink(graphics, units.get(SHILOH_RESERVE_ID), units.get(network.nearestFrontId), zoom, GAP, [2, 5]);
  }
}
