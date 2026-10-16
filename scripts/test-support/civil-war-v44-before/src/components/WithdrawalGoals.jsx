import React from 'react';
import { isWithdrawalGoals } from '../battle/withdrawalGoals.js';
export function WithdrawalGoals({ report }) {
  if (!isWithdrawalGoals(report)) return null;
  return <details className="cw-withdrawal-goals" open={report.finished || undefined}>
    <summary>{report.finished ? 'Withdrawal goals · ' + report.goals.filter(g=>g.status === 'achieved').length + '/' + report.goals.length : 'Optional withdrawal goals'}</summary>
    <p>Optional replay goals. Your mission, score and campaign rewards are unchanged. A safe retreat needs no extra fighting.</p>
    <ul>{report.goals.map(g=><li key={g.id}><strong>{g.status === 'achieved' ? '✓ ' : ''}{g.label}{g.status === 'not-earned' ? ' · Not earned' : ''}</strong><span>{g.detail}</span></li>)}</ul>
    {!report.finished && <p>Plan departures together: the battle ends when its mission resolves. Goals are recorded at that point and require mission success.</p>}
  </details>;
}
