import { getBattleSupplyProfile, EMERGENCY_RESERVE_LIMIT } from './campaignSupply.js';
import { BATTLE_SCENARIOS } from './battles.js';

export function createCampaignContinuity(after, entry, nextScenario) {
  const next = !after.gameOver && nextScenario ? {
    title: nextScenario.title || 'Next decision', actor: nextScenario.actor || '',
    role: nextScenario.roleLabel || '', date: nextScenario.date || '',
  } : null;
  const from = { actor: entry.scenarioActor || '', role: entry.scenarioRoleLabel || '' };
  const changed = Boolean(next && ((from.actor && next.actor && from.actor !== next.actor) || (from.role && next.role && from.role !== next.role)));
  const modern = after.rulesVersion === 2;
  const economy = after.campaignEconomy;
  const obligations = modern && economy ? {
    treasury: economy.treasuryArrears, ammunition: economy.munitionsArrears,
    reserves: Math.max(0, EMERGENCY_RESERVE_LIMIT - economy.emergencyUsed),
  } : null;
  const nextBattle = next && Object.hasOwn(BATTLE_SCENARIOS, nextScenario.id);
  const supply = nextBattle && modern ? getBattleSupplyProfile(after) : null;
  const carried = modern ? 'Campaign resources, obligations and recorded decisions' : 'Campaign resources and recorded decisions';
  const timelineNote = next && entry.scenarioId === 'atlanta_holds_october' && nextScenario.id === 'third_winchester'
    ? 'Historical flashback: this route now revisits Winchester on September 19, 1864, before the alternate Atlanta outcome dated October-November. '
    : '';
  return {
    version: 1, from, next, changed, obligations,
    supply: supply ? { label: supply.label, ammunitionPercent: Math.round(supply.ammunitionMultiplier * 100) } : null,
    explanation: timelineNote + (after.gameOver
      ? `These are the final campaign resources${modern ? ' and obligations' : ''}. No further command is assigned.`
      : changed
        ? `You now take a different command perspective. ${carried} carry forward; this does not transfer the same troops between armies.`
        : `${carried} carry into the next decision.`),
  };
}

export function isCampaignContinuity(value) {
  const person = p => p && typeof p.actor === 'string' && typeof p.role === 'string';
  return Boolean(value?.version === 1 && person(value.from) && typeof value.changed === 'boolean'
    && typeof value.explanation === 'string'
    && (value.next === null || (person(value.next) && typeof value.next.title === 'string' && typeof value.next.date === 'string'))
    && (value.obligations === null || ['treasury','ammunition','reserves'].every(k => Number.isFinite(value.obligations?.[k]) && value.obligations[k] >= 0))
    && (value.supply === null || (typeof value.supply?.label === 'string' && Number.isFinite(value.supply.ammunitionPercent) && value.supply.ammunitionPercent >= 35 && value.supply.ammunitionPercent <= 100)));
}
