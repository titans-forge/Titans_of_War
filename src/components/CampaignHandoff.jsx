import React from 'react';
import { isCampaignContinuity } from '../game/campaignContinuity.js';
export function CampaignHandoff({ continuity }) {
  if (!isCampaignContinuity(continuity)) return null;
  const { next, from, changed, obligations, supply, explanation } = continuity;
  const amount = n => Number(n.toFixed(1));
  return <section className="campaign-handoff" aria-label={next ? 'Next command and carried consequences' : 'Campaign settlement'}>
    <h3>{next ? changed ? 'Command handoff' : 'Next command' : 'Campaign settled'}</h3>
    {next && <>
      {changed && (from.actor || from.role) && <p className="muted">Leaving: {[from.actor, from.role].filter(Boolean).join(' · ')}</p>}
      <p><strong>{[next.actor, next.role].filter(Boolean).join(' · ') || next.title}</strong></p>
      <p>{next.date && `${next.date} · `}{next.title}</p>
    </>}
    <p className="muted">{explanation}</p>
    {obligations && <details open={obligations.treasury > 0 || obligations.ammunition > 0}>
      <summary>{obligations.treasury > 0 || obligations.ammunition > 0 ? next ? 'Unpaid supply obligations carry forward' : 'Unpaid supply obligations at settlement' : 'Supply account · no unpaid obligations'}</summary>
      <p>Unpaid Treasury: {amount(obligations.treasury)} · Unpaid Ammunition: {amount(obligations.ammunition)} · Emergency reserves remaining: {obligations.reserves}</p>
      {next && (obligations.treasury > 0 || obligations.ammunition > 0) && <p>Later gains pay these obligations before replenishing the resource bars.</p>}
    </details>}
    {supply && <p><strong>Next field preparation: {supply.label}.</strong> Current supplies provide {supply.ammunitionPercent}% of the formations’ authored ammunition. Supply planning before commitment can change this.</p>}
  </section>;
}
