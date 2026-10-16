// Shared period standards. Star layout is illustrative, not regimental provenance.
// Smithsonian flag chronology; NPS Flags at Antietam and 13th Alabama Battle Flag.
export const PERIOD_STANDARDS = Object.freeze({ union: { stars: 34, label: 'US', description: '34-star United States national color' }, confederate: { stars: 13, label: 'CS', description: 'Square Army of Northern Virginia battle flag' } });
// Representative national or army patterns; individual regiments often kept
// older colors or carried different designs. No exact regimental attribution.
const LATE_FIELDS = new Set(['third_winchester', 'wilderness', 'cedar_creek', 'cold_harbor', 'petersburg', 'chickamauga']);
export function periodStandardFor(side, scenarioId = 'gettysburg') {
  if (side === 'union') {
    const stars = LATE_FIELDS.has(scenarioId) ? 35 : 34;
    return { pattern: 'us-national', stars, description: `${stars}-star United States national color` };
  }
  if (['first_manassas', 'shiloh', 'chickamauga'].includes(scenarioId)) {
    const stars = scenarioId === 'first_manassas' ? 11 : 13;
    return { pattern: 'first-national', stars, description: `Representative ${stars}-star Confederate First National color; western commands used varied patterns` };
  }
  return { pattern: 'anv', stars: 13, description: 'Square Army of Northern Virginia battle flag' };
}
// The hoist stays pinned at x=3. Every stripe, star and seam uses the same
// deformation, so the design moves with the cloth rather than floating over it.
export function flagClothPoint(x, y, time, phase, width = 48) {
  const u = Math.max(0, Math.min(1, (x - 3) / width));
  const wave = time * 1.65 + phase - u * 5.2;
  const ripple = Math.sin(wave) * 1.8 + Math.sin(wave * 1.7 + .8) * .45;
  return { x: x - u * .65 * (1 + Math.sin(wave)), y: y + u * ripple * (1 + (y + 45) * .009) };
}

function clothSurface(graphics, time, phase, width) {
  const point = (x, y) => flagClothPoint(x, y, time, phase, width);
  const surface = {
    fillStyle(...args) { graphics.fillStyle(...args); return surface; },
    lineStyle(...args) { graphics.lineStyle(...args); return surface; },
    fillPoints(points, close) { graphics.fillPoints(points.map(p => point(p.x, p.y)), close); return surface; },
    fillRect(x, y, w, h) {
      const segments = Math.max(1, Math.ceil(w / 3));
      const top = Array.from({ length: segments + 1 }, (_, i) => point(x + w * i / segments, y));
      const bottom = Array.from({ length: segments + 1 }, (_, i) => point(x + w * (1 - i / segments), y + h));
      graphics.fillPoints([...top, ...bottom], true); return surface;
    },
    lineBetween(x1, y1, x2, y2) {
      const segments = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 3));
      graphics.beginPath();
      for (let i = 0; i <= segments; i++) {
        const p = point(x1 + (x2 - x1) * i / segments, y1 + (y2 - y1) * i / segments);
        if (i === 0) graphics.moveTo(p.x, p.y); else graphics.lineTo(p.x, p.y);
      }
      graphics.strokePath(); return surface;
    },
  };
  return surface;
}

// Scene-owned graphics, no extra textures, timers or tweens. Cache the field
// clock so paused battles do not rebuild their flags on every browser frame.
export function updatePeriodStandard(g, side, scenarioId, time, phase, reducedMotion = false) {
  if (g.periodUpdate) return g.periodUpdate(time, phase, reducedMotion);
  const clock = reducedMotion ? 0 : time;
  const key = `${side}:${scenarioId}:${clock}:${phase}:${reducedMotion}`;
  if (g.periodClothKey === key) return g;
  g.clear();
  drawPeriodStandard(g, side, scenarioId, reducedMotion ? null : { time: clock, phase });
  g.periodClothKey = key;
  return g;
}

function star(g, x, y, radius) {
  const points = Array.from({ length: 10 }, (_, i) => ({ x: x + Math.cos(-Math.PI / 2 + i * Math.PI / 5) * radius * (i % 2 ? 0.42 : 1), y: y + Math.sin(-Math.PI / 2 + i * Math.PI / 5) * radius * (i % 2 ? 0.42 : 1) }));
  g.fillStyle(0xffffff, 1); g.fillPoints(points, true);
}
export function drawPeriodStandard(g, side, scenarioId = 'gettysburg', cloth = null) {
  const graphics = g;
  const standard = periodStandardFor(side, scenarioId);
  if (cloth) g = clothSurface(g, cloth.time, cloth.phase, standard.pattern === 'anv' ? 34 : 48);
  if (side === 'union') {
    g.fillStyle(0xf4efdf, 1).fillRect(3, -60, 48, 30);
    for (let i = 0; i < 13; i += 2) g.fillStyle(0xa52c36, 1).fillRect(3, -60 + i * 30 / 13, 48, 30 / 13);
    g.fillStyle(0x233f6d, 1).fillRect(3, -60, 23, 30 * 7 / 13);
    (standard.stars === 35 ? [6, 6, 6, 6, 6, 5] : [6, 5, 6, 6, 5, 6]).forEach((count, row) => { for (let col = 0; col < count; col++) star(g, 4.7 + col * 3.7 + (count === 5 ? 1.8 : 0), -58.4 + row * 2.6, 1); });
  } else if (standard.pattern === 'first-national') {
    g.fillStyle(0xa52c36, 1).fillRect(3, -60, 48, 30);
    g.fillStyle(0xf4efdf, 1).fillRect(3, -50, 48, 10);
    g.fillStyle(0x233f6d, 1).fillRect(3, -60, 21, 20);
    for (let i = 0; i < standard.stars; i++) {
      const angle = -Math.PI / 2 + i * Math.PI * 2 / standard.stars;
      star(g, 13.5 + Math.cos(angle) * 7.2, -50 + Math.sin(angle) * 7.2, 1.15);
    }
  } else {
    g.fillStyle(0xf4efdf, 1).fillRect(3, -62, 34, 34);
    g.fillStyle(0xa52c36, 1).fillRect(4, -61, 32, 32);
    for (const [a, b] of [[[4, -61], [36, -29]], [[4, -29], [36, -61]]]) {
      g.lineStyle(7, 0xf4efdf, 1).lineBetween(...a, ...b); g.lineStyle(5, 0x233f6d, 1).lineBetween(...a, ...b);
    }
    star(g, 20, -45, 1.5);
    for (const d of [-12, -8, -4, 4, 8, 12]) { star(g, 20 + d, -45 + d, 1.35); star(g, 20 + d, -45 - d, 1.35); }
  }
  // Short ties meet the pole; the upper cloth edge no longer floats above it.
  g.lineStyle(.8, 0xd7c992, .9).lineBetween(0, -59, 3, -59);
  g.lineBetween(0, -32, 3, -32);
  return graphics;
}
