import { createCampaignContinuity, isCampaignContinuity } from './campaignContinuity.js';
export const RESOURCE_LABELS = {
  militaryStrength: 'Army strength', munitions: 'Ammunition', treasury: 'Treasury',
  foodSupply: 'Food', publicMorale: 'Morale',
};

function isResourceBreakdown(item) {
  if (item.breakdown === undefined && item.exactChange === undefined && item.breakdownExact === undefined) return true;
  return Number.isFinite(item.exactChange) && typeof item.breakdownExact === 'boolean'
    && (item.breakdown?.allocation === undefined || Number.isFinite(item.breakdown.allocation))
    && item.breakdown && ['battle', 'upkeep', 'decision', 'other'].every((key) => Number.isFinite(item.breakdown[key]));
}

export function isAfterActionReport(value) {
  return Boolean(value && (value.continuity === undefined || isCampaignContinuity(value.continuity)) && ['title', 'choice', 'consequence', 'nextTitle'].every((key) => typeof value[key] === 'string')
    && (value.battleResult == null || (typeof value.battleResult === 'object' && !Array.isArray(value.battleResult) && typeof value.battleResult.result === 'string'))
    && Number.isFinite(value.divergenceChange) && Array.isArray(value.deltas)
    && value.deltas.length === Object.keys(RESOURCE_LABELS).length
    && value.deltas.every((item) => item && item.key in RESOURCE_LABELS && typeof item.label === 'string'
      && ['before', 'after', 'change'].every((key) => Number.isFinite(item[key])) && isResourceBreakdown(item)));
}

// The optional fifth argument is the campaign state immediately after battle
// resolution, before tickMetrics. New history snapshots supply it implicitly.
export function createAfterAction(before, after, entry, nextScenario, baseAfterBattle = null, baseBeforeBattle = null) {
  const trace = entry.resourceTransitions;
  const deltas = Object.entries(RESOURCE_LABELS).map(([key, label]) => {
    const start = before.metrics[key];
    const end = after.metrics[key];
    const exactChange = end - start;
    const hasTrace = trace?.version === 1
      && ['before', 'afterUpkeep', 'afterDecision'].every((stage) => Number.isFinite(trace[stage]?.[key]));
    const base = Number.isFinite(baseAfterBattle?.metrics?.[key]) ? baseAfterBattle.metrics[key]
      : hasTrace ? trace.before[key] : null;
    const allocation = entry.battleResult && Number.isFinite(baseBeforeBattle?.metrics?.[key])
      ? baseBeforeBattle.metrics[key] - start
      : hasTrace && Number.isFinite(trace.afterAllocation?.[key]) ? trace.afterAllocation[key] - trace.before[key] : 0;
    const battle = entry.battleResult && base !== null ? base - start - allocation : 0;
    const upkeep = hasTrace ? trace.afterUpkeep[key] - (trace.afterAllocation?.[key] ?? trace.before[key]) : 0;
    const decision = hasTrace ? trace.afterDecision[key] - trace.afterUpkeep[key] : 0;
    // Legacy authored effects cannot recover clamping or upkeep order. Keep
    // unassigned changes in other, including any changes outside the tick.
    const other = exactChange - (allocation + battle + upkeep + decision);
    return {
      key, label, before: start, after: end,
      change: Math.round(exactChange * 10) / 10,
      exactChange,
      breakdown: { battle, upkeep, decision, other, ...(allocation !== 0 ? { allocation } : {}) },
      breakdownExact: hasTrace && (!entry.battleResult || base !== null),
    };
  });
  return {
    continuity: createCampaignContinuity(after, entry, nextScenario),
    scenarioId: entry.scenarioId,
    title: entry.scenarioTitle,
    choice: entry.choiceText,
    consequence: entry.consequence,
    battleResult: entry.battleResult || null,
    supplyReport: entry.supplyReport || null,
    deltas,
    breakdownExact: deltas.every((item) => item.breakdownExact),
    divergenceChange: Math.round(((after.divergenceIndex || 0) - (before.divergenceIndex || 0)) * 100),
    nextTitle: after.gameOver ? 'Campaign report' : nextScenario?.title || 'Next decision',
    concluded: after.gameOver,
  };
}

export function nextPhasePreview(scenario, selectedChoice, scenarios) {
  if (selectedChoice?.endsCampaign) return 'Campaign settlement';
  if (selectedChoice?.next) return scenarios.find((entry) => entry.id === selectedChoice.next)?.title || 'A new branch';
  return 'Next phase depends on your decision and the campaign situation.';
}
