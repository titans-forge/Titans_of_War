import { formationStatusLabel } from '../battle/battleTactics.js';
import { getGettysburgFormationAdvice } from '../battle/gettysburgCommandBrief.js';
import { canCommand } from '../battle/battleUsability.js';

const onField = unit => Boolean(unit?.active && unit.strength > 0 && !unit.withdrawn && !['broken', 'surrendered'].includes(unit.status));

function retreatGuidanceFor(selected, snapshot) {
  const current = snapshot?.formations?.find(unit => unit.id === selected?.id);
  const guidance = current?.readiness?.retreatGuidance;
  if (snapshot?.scenarioId !== 'gettysburg' || !(snapshot.battleRulesVersion >= 18) || !snapshot.gettysburg || snapshot.resolving
    || snapshot.outcome !== 'undecided' || !onField(selected) || (selected.order !== 'withdraw' && selected.status !== 'routing')
    || !onField(current) || (current.order !== 'withdraw' && current.status !== 'routing')
    || !guidance || guidance.formationId !== selected.id) return null;
  return guidance.blocked || guidance.detouring || guidance.exitThreatened || guidance.underFire || guidance.closeEnemyName ? guidance : null;
}

// Recheck the current formation record when rendering and when selecting. Advice
// cannot grant orders to a routed, departed, enemy, or newly unavailable blocker.
export function selectableRetreatBlocker(selected, snapshot, blockerId) {
  const guidance = retreatGuidanceFor(selected, snapshot);
  if (!guidance?.blocked || guidance.detouring || guidance.pendingOrder || selected.pendingCommand
    || guidance.blockerKind !== 'formation' || !guidance.blockerAvailable || guidance.blockerId !== blockerId
    || guidance.blockerSide !== selected.side) return null;
  const blocker = snapshot.formations.find(unit => unit.id === blockerId);
  return blocker?.id !== selected.id && onField(blocker) && blocker.side === selected.side && canCommand(blocker) && !blocker.pendingCommand ? blocker : null;
}

// Display the current participation state without changing the preserved battle record.
export function FormationReadinessCard({ selected, snapshot, fieldBattle = false, onSelectRetreatBlocker = null, selectionDisabled = false }) {
  const present = onField(selected);
  const retreat = retreatGuidanceFor(selected, snapshot);
  const blocker = retreat && selectableRetreatBlocker(selected, snapshot, retreat.blockerId);
  const pendingBlocker = retreat?.blockerKind === 'formation' && snapshot.formations.find(unit => unit.id === retreat.blockerId)?.pendingCommand;
  const detouring = Boolean(retreat?.detouring && retreat.nextWaypoint && Number.isFinite(retreat.nextWaypoint.x) && Number.isFinite(retreat.nextWaypoint.y)
    && Array.isArray(retreat.corridor) && retreat.corridor.length > 0);
  return (
            <div className="cw-readiness-card" data-condition={present ? selected.condition : 'departed'}>
              <strong>{present ? selected.condition || 'Formation condition' : formationStatusLabel(selected)}</strong>
              <span>{present ? selected.pressureReason : selected?.arrivalBlocked ? 'Arrival waiting: clear the deployment area' : selected?.withdrawn ? 'Off the field' : selected?.status === 'surrendered' ? 'No longer available for orders' : 'Not currently on the field'}</span>
              {present && selected?.readiness && <span>{selected.readiness.supported ? `Supported by ${selected.readiness.supportCount} nearby formation${selected.readiness.supportCount === 1 ? '' : 's'}` : 'No organized formation in support range'}</span>}
              {present && selected?.readiness?.supported === false && Number.isFinite(selected.readiness.nearestSupportDistance) && <span>{selected.readiness.nearestSupportName}: {Math.ceil(selected.readiness.nearestSupportDistance)} field units away · Support range {selected.readiness.supportRange || 340}</span>}
              {selected?.incomingFireFrom && <span>Last incoming fire: {snapshot.formations.find(unit => unit.id === selected.incomingFireFrom)?.name || selected.incomingFireFrom}</span>}
              {selected?.routingCause && <span>Last break: {selected.routingCause}</span>}
              {present && <label>Suppression <span>{Math.round(selected?.suppression || 0)}%</span><meter min="0" max="100" low="35" high="65" optimum="0" value={selected?.suppression || 0} /></label>}
              {retreat && <section className="cw-clearance-advice" aria-label="Retreat route guidance">
                <strong>{detouring ? 'Taking a detour to the rear' : retreat.blocked ? 'Retreat route blocked' : 'Retreat still exposed'}</strong>
                {retreat.blockerName && <p>{retreat.blockerName} {retreat.blockerKind === 'landmark' ? 'obstructs the direct rear route.' : retreat.blockerSide === selected.side ? 'is in the direct rear route.' : 'blocks the direct rear route.'}</p>}
                {detouring ? <p>The formation is following a clear next step around the obstruction. Keep the rear corridor open while it clears the engagement or reaches a usable rear exit.</p> : retreat.blocked && <p>{blocker ? 'Select the blocking formation, then preview and confirm a Move to make room. Check the destination and keep a passage open to the rear.' : pendingBlocker ? 'The blocking formation has an order on its way. Let it receive that order, then check whether the rear passage has opened.' : retreat.blockerKind === 'landmark' ? 'The formation is looking for room around the obstacle. Keep nearby formations clear of its rear passage.' : retreat.blockerSide && retreat.blockerSide !== selected.side ? 'Support this retreat and keep an opening to the rear. Enemy formations cannot be moved by your orders.' : 'Keep nearby formations clear of the rear passage. Routed formations cannot receive a Move order.'}</p>}
                {retreat.exitThreatened && <p>{retreat.threatName ? `${retreat.threatName} is close to the chosen rear exit.` : 'An enemy formation is close to the chosen rear exit.'} Keep an opening for the retreat.</p>}
                {retreat.underFire && <p>{retreat.fireThreatName ? `Still within firing reach of ${retreat.fireThreatName}.` : 'Still within enemy firing reach.'} Reaching the retreat distance alone does not allow it to leave safely.</p>}
                {retreat.closeEnemyName && <p>{retreat.closeEnemyName} is too close to leave the engagement. The retreat must open more separation.</p>}
                {(retreat.pendingOrder || selected.pendingCommand) && <p>A replacement order is on its way. These warnings describe the withdrawal happening now; reassess when that order arrives.</p>}
                {blocker && onSelectRetreatBlocker && <button className="cw-preview-staging" disabled={selectionDisabled} onClick={() => onSelectRetreatBlocker(blocker.id, selected.id)}>Select {blocker.name}</button>}
              </section>}
              <p>{fieldBattle ? getGettysburgFormationAdvice(selected).replaceAll('foothold', 'line').replaceAll('ridge', 'front') : getGettysburgFormationAdvice(selected)}</p>
            </div>
  );
}
