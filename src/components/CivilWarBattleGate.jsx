import { siegeBrief } from '../battle/siegeCommand.js';
import { withdrawalBrief } from '../battle/withdrawalCommand.js';
import { CHICKAMAUGA_PRESERVATION_BRIEF } from '../battle/chickamaugaPreservation.js';
import { SHILOH_RESERVE_BRIEF } from '../battle/shilohReserveObjective.js';
import { Shield, Swords, X } from 'lucide-react';
import { useRef } from 'react';
import { useDialogFocus } from './useDialogFocus';
import { BATTLE_OBJECTIVES } from '../battle/battleAssessment.js';
import { fieldCommandTitle } from '../game/battles.js';

export function CivilWarBattleGate({ battle, readiness, choiceId, choiceText, onFight, onDelegate, onCancel, saveNotice, battleRulesVersion, canSuspend = false, fieldDecides = false }) {
  const dialogRef = useRef(null);
  useDialogFocus(dialogRef, true, onCancel);
  const mission = BATTLE_OBJECTIVES[battle.id]?.[choiceId];
  const objective = fieldDecides && battle.id === 'first_manassas' && ['option_a', 'option_d'].includes(choiceId)
    ? 'Secure the Union battery line with supporting infantry for eight field minutes'
    : mission?.label || choiceText;
  const withdrawalOrders = siegeBrief(battle.id, choiceId, battleRulesVersion) || withdrawalBrief(battle.id, choiceId, battleRulesVersion);
  const fieldOrders = withdrawalOrders?.orders || (battle.id === 'chickamauga' && ['option_c', 'option_d'].includes(choiceId) && battleRulesVersion >= 15 ? CHICKAMAUGA_PRESERVATION_BRIEF : battle.id === 'shiloh' && choiceId === 'option_b' && battleRulesVersion >= 14 ? SHILOH_RESERVE_BRIEF : battle.fieldOrdersByChoice?.[choiceId] || []);

  return (
    <div ref={dialogRef} tabIndex={-1} className="cw-battle-overlay cw-battle-gate-overlay" role="dialog" aria-modal="true" aria-labelledby="cw-battle-gate-title">
      <section className="cw-battle-gate">
        <button className="cw-battle-close" onClick={onCancel} aria-label="Return to strategic choices"><X /></button>
        <div className="cw-battle-gate-mark"><Swords /></div>
        <div className="cw-battle-gate-copy">
          <p className="cw-battle-eyebrow">{battle.eyebrow}</p>
          <h2 id="cw-battle-gate-title">{fieldCommandTitle(battle, choiceId, battleRulesVersion)}</h2>
          <p className="cw-selected-mission"><strong>{fieldDecides ? 'Your objective · ' : 'Selected mission: '}</strong>{objective}</p>
          <div className="cw-selected-posture"><strong>Selected strategy</strong><span>{choiceText}</span></div>
          {fieldDecides && <details className="cw-field-orders">
            <summary>What carries into the campaign</summary>
            <p>The field verdict and your objective decide campaign credit. Army strength, ammunition and morale carry forward. Delegating gives a staff estimate.</p>
            <p>{battle.id === 'shiloh'
              ? 'Johnston’s status is recorded separately from the mission. Keeping him protected is possible even if the reserve objective falls short.'
              : 'An orderly exit preserves your force. It fulfills the mission when you chose withdrawal.'}</p>
          </details>}
          {fieldOrders.length > 0 && (
            <div className="cw-gate-orders">
              <strong>Orders for this mission</strong>
              <ol>{fieldOrders.map((order) => <li key={order}>{order}</li>)}</ol>
            </div>
          )}
          <details className="cw-field-orders cw-battle-context">
            <summary>Battlefield context · general situation</summary>
            <p>These describe the wider battle and possible operations. Follow your selected mission above.</p>
            <p>{battle.objective}</p>
            {battle.fieldOrders?.length > 0 && <ul>{battle.fieldOrders.map((order) => <li key={order}>{order}</li>)}</ul>}
          </details>
          <div className="cw-battle-readiness" aria-label="Field force readiness">
            <span>Preparation <strong>{readiness.preparation}</strong></span>
            <span>Cohesion <strong>{readiness.cohesion}</strong></span>
            <span>Supply <strong>{readiness.supply}</strong></span>
            <span>Morale <strong>{readiness.morale}</strong></span>
          </div>
          <small>{readiness.notes.join(' ')}</small>
        </div>
        <div className="cw-battle-gate-actions">
          {saveNotice}
          <button className="tactical-button primary" onClick={onFight}><Swords /> Command the field</button>
          <button className="tactical-button" onClick={onDelegate}><Shield /> Delegate to staff</button>
          <p className="cw-save-boundary">{canSuspend ? 'Your campaign saves between decisions. In battle, choose Leave battle → Save and leave before closing this page. A saved battle resumes paused on this device.' : 'Your campaign saves between decisions. Battlefield progress is not saved in this mode: finish the battle and return its consequences before closing or reloading.'}</p>
          <small>{battle.context}</small>
        </div>
      </section>
    </div>
  );
}
