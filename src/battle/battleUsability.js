export function overviewZoom(viewport, world) {
  return Math.min(viewport.width / world.width, viewport.height / world.height);
}

export function boundedZoom(current, delta, minimum) {
  return Math.max(minimum, Math.min(Math.max(1.7, minimum), current + delta));
}

export function isPanGesture(start, point) {
  return Math.hypot(point.x - start.x, point.y - start.y) > 8;
}

export function canCommand(unit) {
  return Boolean(unit?.active && unit.side === 'confederate' && !['routing', 'broken'].includes(unit.status));
}

// Keep a formation legible on a narrow field without discarding a closer view.
export function formationFocusZoom(current, viewport, world, frontage = 115) {
  const overview = overviewZoom(viewport, world);
  const readable = viewport.width <= 700 ? Math.max(.8, Math.min(1.2, 90 / Math.max(80, frontage))) : Math.min(1.2, overview * 2);
  return boundedZoom(Math.max(current, readable), 0, overview);
}

// Hit zones can overlap along a trench. Resolve by proximity, not render depth.
export function nearestHit(objects, point, key, formations) {
  const hits = objects.filter(object => object.getData(key) && formations.some(unit => unit.id === object.getData(key) && unit.active));
  const standards = hits.filter(object => object.getData('selectionAnchor'));
  // An explicit flag tap belongs to its formation even when another rank is beneath it.
  return (standards.length ? standards : hits).reduce((nearest, object) => {
    const unit = formations.find(unit => unit.id === object.getData(key));
    if (!unit?.active) return nearest;
    const distance = Math.hypot(unit.x - point.x, unit.y - point.y);
    return !nearest || distance < nearest.distance ? { object, distance } : nearest;
  }, null)?.object;
}
