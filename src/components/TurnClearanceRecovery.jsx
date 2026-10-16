export function TurnClearanceRecovery({ record, sectors = [], disabled = false, onResume, onDismiss }) {
  if (!record || record.phase === 'preview') return null;
  const sector = sectors.find(sector => sector.id === record.point?.sectorId);
  const destination = sector ? ` on ${sector.name}` : '';
  return <section className="cw-saved-attack" aria-label="Saved attack order">
    <p>{record.phase === 'ready' ? 'Turning move complete. Review and resume your saved order.'
      : record.phase === 'waiting' ? 'Move complete, but the formation still needs turning room or space to break contact.'
        : 'Making turning room. The battle will pause when this move finishes.'} Saved order: {record.order}{destination}.</p>
    <button disabled={disabled || record.phase !== 'ready'} onClick={onResume}>Resume {record.order}{destination}</button>
    <button onClick={onDismiss}>Forget saved attack</button>
    <small>This reminder lasts while this battlefield is open. Resuming sends a normal delayed order.</small>
  </section>;
}
