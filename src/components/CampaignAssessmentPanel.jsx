import React, { useMemo } from 'react';
import { calculateCampaignAssessment } from '../game/campaignAssessment.js';
import { calculateCampaignScore } from '../game/simulationEngine.js';

export function CampaignAssessmentPanel({ state, legacyScore }) {
  const assessment = useMemo(() => calculateCampaignAssessment(state), [state]);
  const legacy = useMemo(() => legacyScore || calculateCampaignScore(state), [state, legacyScore]);
  return <section className="battle-assessment" aria-label="Campaign outcome assessment">
    <div className="battle-assessment-heading"><strong>Campaign outcome assessment</strong><span>{assessment.score === null ? assessment.status === 'in-progress' ? 'In progress' : 'Unavailable' : `${assessment.score}/100`}</span></div>
    <p className="muted">{assessment.difficulty === 'story' ? 'Story' : 'Standard'} campaign · {assessment.status === 'collapsed' ? 'Resource collapse' : assessment.status === 'complete' ? 'Ending reached' : 'Recorded outcome'}</p>
    <p>{assessment.components.length ? 'Your result reflects paid supplies, the condition of your forces, and reaching an ending without resource collapse.' : assessment.explanation}</p>
    {assessment.components.length > 0 && <>
      <p>Unpaid obligations: Treasury {Number(assessment.evidence.treasuryArrears.toFixed(2))}; Ammunition {Number(assessment.evidence.munitionsArrears.toFixed(2))}.</p>
      <dl className="result-deltas">{assessment.components.map(item => <div key={item.id}><dt>{item.label} · {item.weight}%</dt><dd>{item.contribution === null ? 'Not yet scored' : `${item.contribution} / ${item.weight} points`}</dd></div>)}</dl>
      <details><summary>How the assessment is calculated</summary><p>{assessment.explanation}</p>{assessment.components.map(item => <section key={item.id}><h4>{item.label}{item.score === null ? '' : ` · ${item.score}/100`}</h4><p>{item.explanation}</p></section>)}<p>{assessment.limitations}</p><p>Rubric v{assessment.version} · Campaign rules {assessment.rulesVersion} · Battle rules {assessment.battleRulesVersion}</p></details>
    </>}
    <details><summary>Original command and historical composite scores</summary>
      <p>Original command performance: {legacy.commandScore}/100 ({legacy.commandGrade}). Historical composite: {legacy.total}/1000 ({legacy.grade}). These existing formulas are retained for comparison; they do not include unpaid supply obligations. The historical composite also includes timeline fidelity.</p>
    </details>
  </section>;
}
export default CampaignAssessmentPanel;
