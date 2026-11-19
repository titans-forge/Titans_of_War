import { PRACTICE_AMMUNITION, createPracticeState, practiceAmmunitionLabel } from '../game/practiceConditions.js';
import { CampaignHandoff } from './CampaignHandoff.jsx';
import { siegeBrief } from '../battle/siegeCommand.js';
import { withdrawalBrief } from '../battle/withdrawalCommand.js';
import { CHICKAMAUGA_PRESERVATION_BRIEF } from '../battle/chickamaugaPreservation.js';
import { ENEMY_DOCTRINES } from '../battle/enemyCoordination.js';
import { BattleAssessmentPanel } from './BattleAssessmentPanel';
import CampaignReflection from './CampaignReflection';
import React, { useRef, useState } from 'react';
import { ArrowRight, X, Swords, RotateCcw } from 'lucide-react';
import { useDialogFocus } from './useDialogFocus';
import { battleResultLabel, fieldCommandTitle } from '../game/battles';
import { cedarCreekCampaignReadout } from '../game/campaignExperience.js';
import { groupPracticeBattles } from '../game/practiceBattleLibrary.js';
import './battleLibrary.css';

export function CampaignDialog({ title, onClose, children, className = '' }) {
  const ref = useRef(null);
  useDialogFocus(ref, true, onClose);
  return <div className="campaign-modal-shade">
    <section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`campaign-modal ${className}`}>
      <header><h2>{title}</h2><button onClick={onClose} title="Close" aria-label="Close"><X size={20} /></button></header>
      {children}
    </section>
  </div>;
}

export function AfterAction({ report, onContinue, saveNotice, endingSummary }) {
  const amount = (value) => Number(value.toFixed(2)).toString();
  const signed = (value) => `${value > 0 ? '+' : ''}${amount(value)}`;
  const hasBreakdown = report.deltas.every((item) => item.breakdown);
  const cedarCreek = cedarCreekCampaignReadout(report);
  return <CampaignDialog title="After-action report" onClose={onContinue} className="after-action cw-report-dialog">
    <div className="cw-report-body" role="region" aria-label="Campaign consequences" tabIndex={0}>
      {saveNotice}
      {endingSummary && <section aria-label="Final campaign outcome">
        <h3>Campaign concluded</h3>
        <p className="outcome-copy">{endingSummary}</p>
      </section>}
      <p className="eyebrow">{report.title}</p>
      <h3>Your decision</h3>
      <p>{report.choice}</p>
      <p className="outcome-copy">{report.consequence}</p>
      {cedarCreek && <section className="campaign-handoff" aria-label="Cedar Creek campaign effects">
        <h3>Cedar Creek campaign effects</h3>
        <p><strong>{signed(cedarCreek.electionPressure)} election pressure</strong> · Cedar Creek prerequisite {cedarCreek.prerequisiteMet ? 'met' : 'unmet'}</p>
        {cedarCreek.food && <p><strong>{signed(cedarCreek.food.operation)} food</strong> from the operation after resource caps.</p>}
        {cedarCreek.food?.minimumReserve > 0 && <p><strong>{signed(cedarCreek.food.minimumReserve)} food</strong> from the campaign’s minimum reserve.</p>}
        <p className="muted">{cedarCreek.delegated && 'Field outcome based on a staff estimate. '}The election also depends on whether Atlanta held and the campaign’s total election pressure.</p>
      </section>}
      <CampaignHandoff continuity={report.continuity} />
      {report.battleResult && <><p className="field-result"><Swords size={18} /> {battleResultLabel(report.battleResult.result, report.battleResult.assessment)}</p><BattleAssessmentPanel assessment={report.battleResult.assessment} legacyScore={report.battleResult.score} /></>}
      <dl className="result-deltas">{report.deltas.map((item) => <div key={item.key}>
        <dt>{item.label}</dt><dd>{amount(item.before)} → {amount(item.after)} <strong>{signed(item.exactChange ?? item.change)}</strong></dd>
      </div>)}</dl>
      {hasBreakdown && <details className="resource-breakdown"><summary>Why resources changed</summary>
        <p className="muted">Actual changes after resource caps, in resolution order. Values are rounded to two decimals.</p>
        <div className="resource-breakdown-grid">{report.deltas.map((item) => <section key={item.key}>
          <h4>{item.label}</h4>
          <dl>{[...(Number.isFinite(item.breakdown.allocation) ? [['allocation', 'Supply allocation']] : []), ['battle', 'Field command'], ['upkeep', 'Upkeep'], ['decision', 'Decision'], ['other', item.breakdownExact ? 'Other adjustments' : 'Unattributed / legacy']].filter(([key]) => key !== 'other' || item.breakdown[key] !== 0 || !item.breakdownExact).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{signed(item.breakdown[key])}</dd></div>)}</dl>
        </section>)}</div>
        {!report.breakdownExact && <p className="muted">This older result does not retain every intermediate value. Unattributed changes are shown rather than guessed.</p>}
      </details>}
      <p className="muted">Includes campaign upkeep and field-command effects. Timeline change: {report.divergenceChange > 0 ? '+' : ''}{report.divergenceChange}%.</p>
      {Array.isArray(report.supplyReport?.notes) && report.supplyReport.notes.every(note => typeof note === 'string') && report.supplyReport.notes.length > 0 && <details className="supply-debrief"><summary>Supply consequences</summary>{report.supplyReport.notes.map((note, index) => <p key={index}>{note}</p>)}</details>}
      <CampaignReflection scenarioId={report.scenarioId} />
    </div>
    <footer className="cw-report-footer cw-campaign-report-footer">
      {!report.concluded && <p className="muted">Next · {report.nextTitle}</p>}
      <button className="tactical-button primary" data-dialog-initial-focus onClick={onContinue}>{report.concluded ? 'View campaign report' : 'Continue campaign'} <ArrowRight size={18} /></button>
    </footer>
  </CampaignDialog>;
}

export function BattleLibrary({ scenarios, onStart, onClose, onTraining, previousSetup = null }) {
  const [scenarioId, setScenarioId] = useState(previousSetup?.battle?.scenarioId || 'manassas_battlefield');
  const [selectedChoiceId, setSelectedChoiceId] = useState(previousSetup?.choiceId || null);
  const [enemyDoctrine, setEnemyDoctrine] = useState(previousSetup?.practiceState?.enemyDoctrine || 'reserve');
  const [ammunition, setAmmunition] = useState(() => Object.entries(PRACTICE_AMMUNITION)
    .find(([, condition]) => condition.munitions === previousSetup?.practiceState?.metrics?.munitions)?.[0] || 'full');
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);
  const groups = groupPracticeBattles(scenarios, search);
  const matches = groups.flatMap(([, entries]) => entries);
  const selection = matches.find(entry => entry.battle.scenarioId === scenarioId);
  const { battle, scenario } = selection ?? {};
  const choiceId = scenario?.choices.find(choice => choice.id === selectedChoiceId)?.id ?? selection?.defaultChoice.id;
  const firstOrder = battle && (
    siegeBrief(battle.id, choiceId, 15)?.orders[0]
    || withdrawalBrief(battle.id, choiceId, 15)?.orders[0]
    || (battle.id === 'chickamauga' && ['option_c', 'option_d'].includes(choiceId) ? CHICKAMAUGA_PRESERVATION_BRIEF[0] : null)
    || battle.fieldOrdersByChoice?.[choiceId]?.[0]
    || battle.objective
  );
  const searchStatus = matches.length === 0 ? 'No battlefields match. Clear the search to see all battles.'
    : search.trim() ? `${matches.length} matching ${matches.length === 1 ? 'battlefield' : 'battlefields'}` : '';

  return <CampaignDialog title="Quick battle" onClose={onClose} className="cw-battle-library">
    <div className="cw-battle-library-body" role="region" aria-label="Battle setup" tabIndex={0}>
      <p className="muted">Practice field command. Your campaign and its saves are unchanged.</p>
      <div>
        <div className="cw-battle-library-search">
          <label>Search battlefields<input ref={searchRef} type="search" value={search} onChange={event => setSearch(event.target.value)} /></label>
          {search && <button type="button" className="tactical-button" onClick={() => { setSearch(''); searchRef.current?.focus(); }}>Clear search</button>}
        </div>
        <p className="muted cw-battle-library-status" role="status">{searchStatus}</p>
        <label>Battle<select value={selection ? scenarioId : ''} disabled={!matches.length} onChange={event => { setScenarioId(event.target.value); setSelectedChoiceId(null); }}>
          {!selection && <option value="" disabled>{matches.length ? 'Choose a matching battlefield' : 'No matching battlefields'}</option>}
          {groups.map(([year, entries]) => <optgroup key={year} label={year}>
            {entries.map(({ battle: entry }) => <option key={entry.scenarioId} value={entry.scenarioId}>{entry.title}</option>)}
          </optgroup>)}
        </select></label>
        {battle && <p className="muted cw-battle-library-date">{battle.date}</p>}
      </div>
      {selection && <>
        <fieldset><legend>Opening strategy</legend>{scenario.choices.map((choice) => <label className="practice-choice" key={choice.id}>
          <input type="radio" name="practice-posture" checked={choiceId === choice.id} onChange={() => setSelectedChoiceId(choice.id)} />{choice.text}
        </label>)}</fieldset>
        <section className="outcome-copy" aria-label="Opening brief"><p aria-live="polite">{firstOrder}</p></section>
        {['first_manassas','shiloh'].includes(battle.id) && ['option_a','option_c','option_d'].includes(choiceId) && !(battle.id === 'first_manassas' && choiceId === 'option_c') && !(battle.id === 'shiloh' && choiceId === 'option_d') && <label>Union command approach<select value={enemyDoctrine} onChange={event => setEnemyDoctrine(event.target.value)}>{Object.entries(ENEMY_DOCTRINES).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label>}
        <label>Starting ammunition<select value={ammunition} onChange={event => setAmmunition(event.target.value)}>
          {Object.entries(PRACTICE_AMMUNITION).map(([id, condition]) => <option key={id} value={id}>{condition.label}</option>)}
        </select></label>
        <p className="muted">{practiceAmmunitionLabel(createPracticeState(scenario, enemyDoctrine, ammunition))}. Applies to your army, including arriving reserves. Campaign readiness also slightly reduces your starting troop strength when ammunition is scarce. Enemy ammunition stays the same. Mission requirements are unchanged; depleted ammunition can make an attack much harder.</p>
      </>}
      {onTraining && <section className="cw-training-invite"><h3>Learn field command by doing</h3><p>Six short exercises cover movement, support, firing range, battery lanes, disengagement and recovery.</p><button className="tactical-button" onClick={onTraining}>Start command training</button></section>}
    </div>
    <footer className="cw-battle-library-footer">
      <button className="tactical-button primary" disabled={!selection} onClick={() => onStart(battle, scenario, choiceId, enemyDoctrine, ammunition)}><Swords size={18} /> Command this battle</button>
    </footer>
  </CampaignDialog>;
}

export function PracticeBattleReport({ result, onRetry, onChoose, onClose }) {
  return <CampaignDialog title="Practice battle report" onClose={onClose} className="cw-report-dialog">
    <div className="cw-report-body" role="region" aria-label="Practice assessment" tabIndex={0}>
      <p className="eyebrow">{fieldCommandTitle(result.setup.battle, result.setup.choiceId, result.setup.practiceState?.battleRulesVersion)}</p>
      {result.ammunitionLabel && <p>Practice conditions: {result.ammunitionLabel}.</p>}
      {result.enemyDoctrineLabel && <p>Union command approach: {result.enemyDoctrineLabel}</p>}
      <h3>{battleResultLabel(result.result, result.assessment)}</h3>
      <BattleAssessmentPanel assessment={result.assessment} legacyScore={result.score} prioritizeNextAttempt />
      {result.openingOrder && <p><strong>Opening order: </strong>{result.openingOrder}</p>}
      <dl className="result-deltas">{[['Confederate losses', result.confederateLossRate], ['Union losses', result.unionLossRate]]
        .filter(([, rate]) => Number.isFinite(rate)).map(([label, rate]) => <div key={label}><dt>{label}</dt><dd>{Math.round(rate * 100)}%</dd></div>)}</dl>
      <p>Your campaign is unchanged.</p>
    </div>
    <footer className="cw-report-footer">
      <button className="tactical-button primary" data-dialog-initial-focus onClick={onRetry}><RotateCcw size={16} /> Retry same setup</button>
      <button className="tactical-button" onClick={onChoose}>Choose another battle</button>
    </footer>
  </CampaignDialog>;
}

export function CampaignJournal({ history, checkpoints, onRestore, onClose }) {
  return <CampaignDialog title="Campaign journal" onClose={onClose}>
    {checkpoints.length > 0 && <details><summary>Return to a checkpoint</summary>
      <p className="muted">Restoring keeps a checkpoint of your current campaign. Recent checkpoints are stored on this device.</p>
      {checkpoints.map((entry) => <button className="checkpoint-row" key={entry.id} onClick={() => onRestore(entry)}><RotateCcw size={16} />{entry.label}</button>)}
    </details>}
    {!history.length && <p>Your decisions and their consequences will appear here.</p>}
    {[...history].reverse().map((entry, index) => <article className="journal-entry" key={`${entry.scenarioId}-${index}`}>
      <span className="muted">Decision {history.length - index} · {entry.date}</span>
      <h3>{entry.scenarioTitle}</h3>{(entry.scenarioActor || entry.scenarioRoleLabel) && <p className="muted">{[entry.scenarioActor, entry.scenarioRoleLabel].filter(Boolean).join(' · ')}</p>}<p>{entry.choiceText}</p><p>{entry.consequence}</p>
      {entry.battleResult && <details className="journal-battle-report">
        <summary>Field report · {battleResultLabel(entry.battleResult.result, entry.battleResult.assessment)}</summary>
        <p>{entry.battleResult.delegated ? 'Delegated to staff' : 'Commanded in the field'}{Number.isFinite(entry.battleResult.confederateLossRate) ? ` · Confederate losses ${Math.round(entry.battleResult.confederateLossRate * 100)}%` : ''}{Number.isFinite(entry.battleResult.unionLossRate) ? ` · Union losses ${Math.round(entry.battleResult.unionLossRate * 100)}%` : ''}</p>
        <BattleAssessmentPanel assessment={entry.battleResult.assessment} legacyScore={entry.battleResult.score} />
      </details>}
    </article>)}
  </CampaignDialog>;
}
