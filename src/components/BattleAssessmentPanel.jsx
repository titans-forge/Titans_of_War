import { WithdrawalGoals } from './WithdrawalGoals.jsx';
import { isBattleAssessment } from '../battle/battleAssessment.js';

export function BattleAssessmentPanel({ assessment, legacyScore }) {
  if (!isBattleAssessment(assessment)) return Number.isFinite(legacyScore)
    ? <p className="muted">Legacy field score: {legacyScore}/100. This saved result does not include an objective breakdown.</p> : null;
  return <section className="battle-assessment" aria-label="Battle assessment">
    <div className="battle-assessment-heading"><strong>Command assessment</strong><span>{assessment.commandScore == null ? 'In progress' : `${assessment.commandScore}/100`}</span></div>
    <p>{assessment.objective.label}</p>
    <dl className="result-deltas">
      <div><dt>Objective · {assessment.objective.status.replaceAll('-', ' ')}</dt><dd>{assessment.objective.score == null ? 'Not yet decided' : `${assessment.objective.score}/100`}</dd></div>
      <div><dt>Force preservation</dt><dd>{assessment.preservation.score}/100</dd></div>
    </dl>
    <p className="muted">Objective achievement carries 75% of the assessment; preservation carries 25%. This measures mission completion, not mission difficulty.</p>
    <details><summary>Why this assessment</summary><ul>{assessment.explanation.map((line, index) => <li key={index}>{line}</li>)}</ul>
      <dl>{assessment.evidence.map((item, index) => <div key={index}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
    </details>
    <WithdrawalGoals report={assessment.withdrawalGoals} />
    {assessment.afterAction && <div className="cw-after-action">
      <h3>Next attempt</h3><ul>{assessment.afterAction.next.map(line => <li key={line}>{line}</li>)}</ul>
      <details><summary>Recorded turning points · {assessment.afterAction.timeline.length}</summary>
        <p className="muted">Observed field events; these do not establish every cause of the result.{assessment.afterAction.omitted > 0 ? ` Showing the first and last four; ${assessment.afterAction.omitted} intervening events omitted.` : ''}</p>
        {assessment.afterAction.timeline.length ? <ol>{assessment.afterAction.timeline.map((e, i) => <li key={i}><strong>{e.time.toFixed(1)} min</strong> · {e.message}</li>)}</ol> : <p>No turning-point events were recorded.</p>}
      </details>
    </div>}
    {assessment.source === 'delegated' && <p className="muted">Staff estimate from delegated command. Individual formation movements were not observed.</p>}
  </section>;
}
