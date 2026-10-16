import React, { useMemo } from 'react';
import { campaignRulesVersion, getCurrentRecoveryPlan, getRecoveryOptions, EMERGENCY_RESERVE_LIMIT } from '../game/campaignSupply.js';
import { forecastCampaignChoice } from '../game/simulationEngine.js';
import { getScenarioCorrespondence } from '../game/campaignStorage.js';

const names = { militaryStrength: 'Army', munitions: 'Munitions', treasury: 'Treasury', foodSupply: 'Food', publicMorale: 'Morale' };
const round = value => Math.round(value * 10) / 10;
const signed = value => `${value > 0 ? '+' : ''}${round(value)}`;

export function CampaignLogistics({ state, scenario, choice, onAllocationChange, successModifier }) {
  const bonus = successModifier ?? getScenarioCorrespondence(state, scenario?.id)?.planningBonus ?? 0;
  const forecast = useMemo(() => campaignRulesVersion(state) === 2 && choice ? forecastCampaignChoice(state, scenario, choice, bonus) : null, [state, scenario, choice, bonus]);
  if (campaignRulesVersion(state) === 1) return <p className="muted">This saved campaign retains its original supply rules.</p>;
  const options = getRecoveryOptions(state);
  const plan = getCurrentRecoveryPlan(state);
  const economy = state.campaignEconomy;
  return <section className="campaign-logistics tactical-card" style={{ marginTop: '0.8rem' }}>
    {forecast && <div style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
      <strong>Selected-order forecast</strong>
      <p>{Object.entries(forecast.resources).map(([key, value]) => `${names[key] || key} ${round(value.min)}${value.min !== value.max ? `–${round(value.max)}` : ''}`).join(' · ')}</p>
      {forecast.successChance !== null && <p>Projected chance of success: {Math.round(forecast.successChance * 100)}%, including any submitted-letter bonus. A field result can change it.</p>}
      {forecast.possibleCollapse && <p role="status" style={{ color: 'var(--accent-red, #fb9c91)' }}>At least one projected outcome ends this campaign through depleted Army, Morale or Food. Review another order or a recovery allocation.</p>}
      <p className="muted">Includes planned allocation and upkeep, before unplayed field losses.</p>
    </div>}
    <details>
    <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Order forecast and supply recovery · {EMERGENCY_RESERVE_LIMIT - economy.emergencyUsed} emergency reserves left</summary>
    <p style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>Deferred costs: Treasury {round(economy.treasuryArrears)} · Munitions {round(economy.munitionsArrears)}. Later gains settle these obligations before filling reserve bars. They do not cause an automatic defeat.</p>
    <label style={{ display: 'grid', gap: '0.35rem' }}>
      Recovery allocation for this decision
      <select aria-label="Recovery allocation for this decision" value={plan?.allocationId || 'none'}
        disabled={options.every(option => !option.available)} onChange={event => onAllocationChange(event.target.value)}
        style={{ padding: '0.6rem', width: '100%', color: 'var(--text-primary)', background: 'var(--bg-card, #20252b)', border: '1px solid var(--border-color)' }}>
        {options.map(option => <option key={option.id} value={option.id} disabled={!option.available}>{option.label}{!option.available && option.id !== 'none' ? ' — unavailable' : ''}</option>)}
      </select>
    </label>
    <p style={{ fontSize: '0.8rem' }}>{options.find(option => option.id === (plan?.allocationId || 'none'))?.description}</p>
    {options.filter(option => option.id !== 'none' && !option.available).map(option => <p className="muted" style={{ fontSize: '0.75rem' }} key={option.id}>{option.label}: {option.reason}</p>)}
    <p className="muted" style={{ fontSize: '0.75rem' }}>{plan?.committed ? 'This allocation is already committed to this decision.' : 'Selecting an allocation is a plan. Resources change only when the chosen order is committed.'}</p>
    {forecast ? <>
      <h4>Forecast for the selected order</h4>
      <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
        <caption style={{ textAlign: 'left', paddingBottom: '0.4rem' }}>After allocation, upkeep and the selected order</caption>
        <thead><tr><th scope="col" style={{ textAlign: 'left' }}>Resource</th><th scope="col">Result / 100</th><th scope="col">Change</th></tr></thead>
        <tbody>{Object.entries(forecast.resources).map(([key, value]) => <tr key={key}>
          <th scope="row" style={{ textAlign: 'left', padding: '0.3rem 0' }}>{names[key] || key}</th>
          <td style={{ textAlign: 'center' }}>{round(value.min)}{value.min !== value.max ? `–${round(value.max)}` : ''}</td>
          <td style={{ textAlign: 'center' }}>{signed(value.deltaMin)}{value.deltaMin !== value.deltaMax ? ` to ${signed(value.deltaMax)}` : ''}</td>
        </tr>)}</tbody>
      </table>
      <p style={{ fontSize: '0.8rem' }}>Unavoidable upkeep this decision: {Object.entries(forecast.upkeep || {}).map(([key, value]) => `${names[key] || key} ${signed(value)}`).join(', ') || 'none during this interlude'}.</p>
      <p style={{ fontSize: '0.8rem' }}>Before field losses: {forecast.battleSupply.notes[0]} Delegated supply penalty: {forecast.battleSupply.readinessPenalty + forecast.battleSupply.foodPenalty} points.</p>
      {[...new Set(forecast.outcomes.flatMap(outcome => outcome.supplyReport?.notes || []))].map(note => <p style={{ fontSize: '0.8rem' }} key={note}>{note}</p>)}
      <p className="muted" style={{ fontSize: '0.75rem' }}>{forecast.scope}</p>
    </> : <p className="muted">Select an order to compare its possible outcomes, upkeep and supply consequences.</p>}
    </details>
  </section>;
}

export default CampaignLogistics;
