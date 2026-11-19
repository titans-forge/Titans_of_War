import { useRef } from 'react';

export function FieldMissionCheckpoints({ battleName, mission, compact = false, cue = null, onLocate }) {
  const details = useRef(null);
  const summary = useRef(null);
  if (!mission) return null;

  const { conditions, deadline, status, title } = mission;
  const regionLabel = `${battleName} mission checkpoints`;
  if (!Array.isArray(conditions) || !conditions.length) {
    return <div className="cw-reserve-progress" aria-label={regionLabel} data-state={status}>
      <strong>{title}</strong><span>{mission.detail}</span>
    </div>;
  }
  const met = conditions.filter(condition => condition.satisfied).length;
  const tracking = status === 'tracking';
  const close = () => {
    if (!details.current?.open) return;
    details.current.open = false;
    summary.current?.focus();
  };
  const deadlineText = tracking && Number.isFinite(deadline) ? `By field minute ${deadline}` : null;
  return <details ref={details} className="cw-field-mission-checks" aria-label={regionLabel} data-state={status}
    data-compact={compact ? '' : undefined} name={compact ? 'cw-field-overlay' : undefined}>
    <summary ref={summary}>
      <span className="cw-mission-summary-main">
        <strong>{tracking ? `Mission checks · ${met} of ${conditions.length} met` : title}</strong>
        {compact && tracking && cue && <span className="cw-compact-order-cue">{cue.short}</span>}
      </span>
      {!compact && deadlineText && <span>{deadlineText}</span>}
    </summary>
    <div className="cw-field-mission-scroll" role="region" aria-label="Current mission requirements" tabIndex={0}>
      {compact && <div className="cw-compact-mission-tools">
        {deadlineText && <span className="cw-compact-mission-deadline">{deadlineText}</span>}
        <button type="button" onClick={close}>Close mission checks</button>
      </div>}
      {compact && tracking && cue && <div className="cw-field-order-cue">
        <p>{cue.text}</p>
        {onLocate && <button type="button" onClick={() => { onLocate(cue.locationId, summary.current); close(); }}>Show {cue.locationLabel}</button>}
      </div>}
      <ul className="cw-mission-checklist" aria-label="Mission checks">
        {conditions.map(({ label, detail, satisfied }) => <li key={label} data-met={satisfied}>
          <span aria-hidden="true">{satisfied ? '✓' : '○'}</span>
          <div><strong>{label}</strong><small>{satisfied ? 'Met' : 'Unmet'} · {detail}</small></div>
        </li>)}
      </ul>
    </div>
  </details>;
}
