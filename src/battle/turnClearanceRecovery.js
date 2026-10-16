// Presentation state only. A clearance move and resumed attack are ordinary,
// separately confirmed commands; this never advances or changes the engine.
const pointMatches = (a, b) => Number.isFinite(a?.x) && Number.isFinite(a?.y)
  && Number.isFinite(b?.x) && Number.isFinite(b?.y)
  && Math.hypot(a.x - b.x, a.y - b.y) <= 1;
const usable = unit => unit?.active && unit.strength > 0
  && !['broken', 'routing', 'surrendered'].includes(unit.status);

export function rememberTurnClearance(unit) {
  const point = unit?.readiness?.turnClearance;
  if (!usable(unit) || unit.pendingCommand || unit.directMove
    || !['advance', 'assault'].includes(unit.order) || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return null;
  return {
    id: unit.id, name: unit.name, order: unit.order,
    point: unit.order === 'assault' && unit.assaultSector ? { sectorId: unit.assaultSector } : null,
    clearance: { x: Math.round(point.x), y: Math.round(point.y) }, phase: 'preview',
  };
}

export function confirmTurnClearance(record, destination) {
  return record?.phase === 'preview' && !destination?.error && pointMatches(record.clearance, destination)
    ? { ...record, phase: 'confirmed' } : null;
}

export function updateTurnClearance(record, snapshot) {
  if (!record || snapshot?.resolving || (snapshot?.outcome && snapshot.outcome !== 'undecided')) return null;
  const unit = snapshot?.formations?.find(unit => unit.id === record.id);
  if (!usable(unit)) return null;
  if (record.phase === 'preview') return record;
  if (unit.pendingCommand) {
    return unit.pendingCommand.order === 'move' && pointMatches(unit.pendingCommand.point, record.clearance) ? record : null;
  }
  if (unit.directMove && pointMatches(unit.target, record.clearance)) {
    return record.phase === 'moving' ? record : { ...record, phase: 'moving' };
  }
  if (unit.order !== 'hold' || Math.hypot(unit.x - record.clearance.x, unit.y - record.clearance.y) > 6) return null;
  const phase = unit.turnBlocked || unit.inMelee ? 'waiting' : 'ready';
  return record.phase === phase ? record : { ...record, phase };
}

export function turnClearanceResume(record, snapshot) {
  const current = updateTurnClearance(record, snapshot);
  if (current?.phase !== 'ready') return null;
  return { order: current.order, point: current.point ? { ...current.point } : null };
}

export function clearancePreviewMatches(record, destination) {
  return record?.phase === 'preview' && !destination?.error && pointMatches(record.clearance, destination);
}
