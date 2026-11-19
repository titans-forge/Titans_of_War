const inset = 4;
const gap = 4;
const ranks = { Objective: 0, Landmark: 1, Sector: 2, Exit: 3, Terrain: 4 };
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

function collides(a, b) {
  return a.left < b.right + gap && a.right + gap > b.left
    && a.top < b.bottom + gap && a.bottom + gap > b.top;
}

// The overview camera centers the whole board, possibly with letterboxing.
// Work in screen pixels so position choices and spacing match the player's view.
export function fitOverviewLabels(markers, viewport, world, zoom, control = null) {
  const mapLeft = (viewport.width - world.width * zoom) / 2;
  const mapTop = (viewport.height - world.height * zoom) / 2;
  const left = Math.max(0, mapLeft) + inset;
  const right = Math.min(viewport.width, viewport.width - mapLeft) - inset;
  const top = Math.max(0, mapTop) + inset;
  const bottom = Math.min(viewport.height, viewport.height - mapTop) - inset;
  const placed = control ? [control] : [];
  const layout = new Map();
  const ordered = [...markers].sort((a, b) => (ranks[a.kind] ?? ranks.Terrain) - (ranks[b.kind] ?? ranks.Terrain));
  for (const marker of ordered) {
    const { key, x, y, width, height, originX, originY } = marker;
    if (width > right - left || height > bottom - top) continue;
    const authored = { x: mapLeft + x * zoom, y: mapTop + y * zoom };
    const baseLeft = clamp(authored.x - originX * width, left, right - width);
    const baseTop = clamp(authored.y - originY * height, top, bottom - height);
    const baseBox = { left: baseLeft, right: baseLeft + width, top: baseTop, bottom: baseTop + height };
    const maxOffset = control && collides(baseBox, control)
      ? Math.max(2 * (height + gap), control.bottom - control.top + 2 * gap)
      : 2 * (height + gap);
    // Try the anchor first, then the nearest clear edge. A narrow gap between
    // an existing label and a control can fit even if whole-row shifts cannot.
    const rows = [baseTop, ...placed.flatMap(box => [box.top - gap - height - .05, box.bottom + gap + .05])]
      .filter(row => row >= top && row <= bottom - height && Math.abs(baseTop - row) <= maxOffset)
      .sort((a, b) => Math.abs(a - baseTop) - Math.abs(b - baseTop) || a - b);
    for (const lineTop of rows) {
      const box = { left: baseLeft, right: baseLeft + width, top: lineTop, bottom: lineTop + height };
      if (placed.some(other => collides(box, other))) continue;
      const labelX = box.left + originX * width;
      const labelY = box.top + originY * height;
      const nearestX = clamp(authored.x, box.left, box.right);
      const nearestY = clamp(authored.y, box.top, box.bottom);
      const leader = Math.hypot(nearestX - authored.x, nearestY - authored.y) >= 5
        ? { x: (nearestX - mapLeft) / zoom, y: (nearestY - mapTop) / zoom } : null;
      layout.set(key, { x: (labelX - mapLeft) / zoom, y: (labelY - mapTop) / zoom, leader });
      placed.push(box);
      break;
    }
  }
  return layout;
}
