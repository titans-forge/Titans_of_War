import React from 'react';
import { CampaignDialog } from './CampaignOverlays.jsx';

export function CampaignStart({ state, scenario, protectedSave, onContinue, onTraining, onQuickBattle, onNewCampaign, onGuide, onKeys, onDifficulty }) {
  const fresh = !state.history.length && !state.gameOver;
  const action = state.gameOver ? 'View campaign report' : fresh ? 'Begin campaign' : 'Continue campaign';
  return <CampaignDialog title="Civil War" className="campaign-start" onClose={onContinue}>
    <p className="start-intro">Choose your next command.</p>
    <section className="start-campaign" aria-label="Your campaign">
      <p className="eyebrow">{protectedSave ? 'Protected archive' : fresh ? 'A campaign begins · 1861' : `${state.history.length} decision${state.history.length === 1 ? '' : 's'} recorded`}</p>
      <h3>{scenario.title}</h3>
      <p>{[scenario.actor, scenario.roleLabel].filter(Boolean).join(' · ')}</p>
      {fresh && state.rulesVersion === 2 && <label className="start-challenge">Starting challenge<select aria-label="Starting challenge" value={state.difficulty || 'standard'} onChange={event => onDifficulty(event.target.value)}><option value="standard">Standard</option><option value="story">Story</option></select><small>{state.difficulty === 'story' ? 'Lighter upkeep and shortage pressure.' : 'Full supply planning and campaign pressure.'}</small></label>}
      <button data-dialog-initial-focus className="tactical-button primary" onClick={onContinue}>{action}</button>
      {fresh && <p className="start-caption">Read the briefing, choose a strategy, then commit your decision.</p>}
    </section>
    <div className="start-practice">
      <section><h3>Learn field command</h3><p>Six guided exercises, starting with your first move.</p><button className="tactical-button" onClick={onTraining}>Learn command</button></section>
      <section><h3>Choose a battlefield</h3><p>Practice an encounter with no campaign consequences.</p><button className="tactical-button" onClick={onQuickBattle}>Quick battle</button></section>
    </div>
    <nav className="start-tools" aria-label="Campaign help and setup"><button onClick={onGuide}>Campaign guide</button><button onClick={onKeys}>Keyboard controls</button>{(!fresh || protectedSave) && <button onClick={onNewCampaign}>New campaign</button>}</nav>
  </CampaignDialog>;
}
