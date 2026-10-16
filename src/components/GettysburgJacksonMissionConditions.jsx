export function GettysburgJacksonMissionConditions({ mission, completed = false }) {
  if (!mission) return null;
  return <details className="cw-mission-conditions" open={completed}>
    <summary>{mission.title} · {mission.summary}</summary>
    <div className="cw-mission-scroll" role="region" aria-label={`${mission.title} details`} tabIndex={0}>
    <p className="cw-mission-note">{mission.note}</p>
    <ul className="cw-mission-checklist" aria-label="Jackson mission conditions">
      {mission.conditions.map(condition => <li key={condition.label} data-met={condition.satisfied}>
        <span aria-hidden="true">{condition.satisfied ? '✓' : '○'}</span>
        <div><strong>{condition.label}</strong><small>{condition.satisfied ? 'Met' : 'Unmet'}: {condition.detail}</small></div>
      </li>)}
    </ul>
    <p>{mission.missionRequirement}</p>
    {mission.resultRationale && <p>{mission.resultRationale}</p>}
    <details><summary>Other field result conditions</summary><ul>{mission.routes.map(route => <li key={route}>{route}</li>)}</ul></details>
    </div>
  </details>;
}
