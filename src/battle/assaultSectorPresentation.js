// UI-only choice: a local draft takes precedence over the selected unit's
// recorded order. Nothing here changes an order or adds checkpoint fields.
export function assaultSectorPresentation(selected, sectors, draft) {
  if (!selected || selected.type === 'artillery') return 'nearest';
  const valid = value => typeof value === 'string'
    && (value === 'nearest' || (Array.isArray(sectors) && sectors.some(sector => sector?.id === value)));
  if (draft !== undefined) return valid(draft) ? draft : 'nearest';
  if (selected.pendingCommand?.order === 'assault') {
    const pending = selected.pendingCommand.point?.sectorId;
    return valid(pending) ? pending : 'nearest';
  }
  if (selected.order === 'assault' && !selected.directMove && valid(selected.assaultSector)) {
    return selected.assaultSector;
  }
  return 'nearest';
}
