import { getCampaignScenarioContext } from './campaignScenarioContext.js';

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
export const CAMPAIGN_RULES_VERSION = 2;
export const CAMPAIGN_DIFFICULTIES = ['story', 'standard'];
export const RECOVERY_ALLOCATION_IDS = ['none', 'purchase', 'emergency', 'levy'];
export const EMERGENCY_RESERVE_LIMIT = 2;
export const createCampaignEconomy = () => ({ treasuryArrears: 0, munitionsArrears: 0, emergencyUsed: 0 });
export const campaignRulesVersion = state => state?.rulesVersion === 2 ? 2 : 1;

export function getCampaignChoice(state, scenario, choice) {
  if (!choice || campaignRulesVersion(state) === 1 || scenario?.id !== 'fort_sumter' || choice.id !== 'option_b') return choice;
  return { ...choice, effects: { ...choice.effects, metrics: { ...choice.effects?.metrics, publicMorale: 8 } },
    costDescription: 'Preserve the garrison. Evacuation adds 8 Public Morale as the bombardment rallies the Union; other resource and cabinet effects still apply.',
    consequence: 'Anderson accepts evacuation with honors, preserving the garrison. The bombardment rallied Northern support for the Union. This rules version models that mobilization with +8 Public Morale; the value is a game assumption, not a measured historical percentage.' };
}

export function getCampaignScenario(state, scenario) {
  scenario = getCampaignScenarioContext(state, scenario);
  if (!scenario || campaignRulesVersion(state) === 1 || scenario.id !== 'fort_sumter') return scenario;
  return { ...scenario, choices: scenario.choices.map(choice => getCampaignChoice(state, scenario, choice)) };
}

export function getBattleSupplyProfile(state = {}) {
  if (campaignRulesVersion(state) === 1) return { rulesVersion: 1, ammunitionMultiplier: 1, readinessPenalty: 0, foodPenalty: 0, label: 'Legacy supply rules', notes: [] };
  const ammunition = clamp(Number.isFinite(state.metrics?.munitions) ? state.metrics.munitions : 0);
  const food = clamp(Number.isFinite(state.metrics?.foodSupply) ? state.metrics.foodSupply : 0);
  const ammunitionMultiplier = 0.35 + 0.65 * clamp(ammunition / 60, 0, 1);
  const readinessPenalty = Math.round((1 - ammunitionMultiplier) * 24);
  const foodPenalty = Math.round((1 - clamp(food / 40, 0, 1)) * 6);
  return {
    rulesVersion: 2, ammunitionMultiplier, readinessPenalty, foodPenalty,
    label: ammunition < 20 ? 'Severe ammunition shortage' : ammunition < 60 ? 'Limited ammunition' : 'Supplied for battle',
    notes: [
      `Field formations receive ${Math.round(ammunitionMultiplier * 100)}% of their authored ammunition.`,
      `Delegated command has ${readinessPenalty + foodPenalty} supply penalty points (${readinessPenalty} ammunition, ${foodPenalty} food).`,
      'The minimum field allocation is 35%; national reserve exhaustion does not remove all legal actions.',
    ],
  };
}

// Negative treasury/ammunition costs beyond the available stock become explicit
// obligations. Later gains settle those obligations before replenishing the bar.
// Arrears do not cause an automatic defeat or additional health/morale attrition.
export function applySupplyDeltas(metrics, economy, deltas = {}) {
  const next = { ...metrics };
  const account = { ...createCampaignEconomy(), ...economy };
  const shortages = [];
  const repayments = [];
  for (const [key, delta] of Object.entries(deltas)) {
    if (!(key in next) || !Number.isFinite(delta)) continue;
    const debtKey = key === 'treasury' ? 'treasuryArrears' : key === 'munitions' ? 'munitionsArrears' : null;
    if (debtKey && delta < 0) {
      const unfunded = Math.max(0, -delta - next[key]);
      account[debtKey] += unfunded;
      if (unfunded > 0) shortages.push({ resource: key, amount: unfunded });
      next[key] = clamp(next[key] + delta);
    } else if (debtKey && delta > 0) {
      const repaid = Math.min(account[debtKey], delta);
      account[debtKey] -= repaid;
      next[key] = clamp(next[key] + delta - repaid);
      if (repaid > 0) repayments.push({ resource: key, amount: repaid });
    } else next[key] = clamp(next[key] + delta);
  }
  return { metrics: next, economy: account, shortages, repayments };
}

export function getRecoveryOptions(state) {
  const newRules = campaignRulesVersion(state) === 2;
  const economy = { ...createCampaignEconomy(), ...state?.campaignEconomy };
  const committed = getCurrentRecoveryPlan(state)?.committed === true;
  const locked = !newRules || Boolean(state?.gameOver || state?.pendingDebrief || committed);
  const specs = [
    { id: 'none', label: 'Keep current allocation', description: 'Commit the selected order without a separate recovery allocation.', deltas: {}, available: true },
    { id: 'purchase', label: 'Purchase supplies and replacements', description: 'Pay 12 Treasury for 18 Munitions, 12 Food and 4 Army. Supply gains first settle outstanding obligations.', deltas: { treasury: -12, munitions: 18, foodSupply: 12, militaryStrength: 4 }, available: (state?.metrics?.treasury ?? 0) >= 12, reason: 'Requires 12 available Treasury.' },
    { id: 'emergency', label: 'Release an emergency reserve', description: `Use one of ${EMERGENCY_RESERVE_LIMIT} campaign reserves: gain 18 Munitions, 16 Food, 10 Treasury and 6 Army; lose 4 Morale. Supply gains first settle obligations.`, deltas: { munitions: 18, foodSupply: 16, treasury: 10, militaryStrength: 6, publicMorale: -4 }, available: economy.emergencyUsed < EMERGENCY_RESERVE_LIMIT && (state?.metrics?.publicMorale ?? 0) >= 15, reason: economy.emergencyUsed >= EMERGENCY_RESERVE_LIMIT ? 'Both emergency reserves have been used.' : 'Requires at least 15 Morale so mobilization does not itself collapse the home front.' },
    { id: 'levy', label: 'Raise an emergency supply levy', description: 'Gain 20 Treasury; lose 8 Morale and 6 Food as civilians bear the levy. Funds repay Treasury obligations first. Available only below 20 Treasury or with outstanding Treasury obligations; requires at least 20 Morale and 12 Food. This uses this decision’s allocation, not a depot reserve.', deltas: { treasury: 20, publicMorale: -8, foodSupply: -6 },
      available: ((state?.metrics?.treasury ?? 0) < 20 || economy.treasuryArrears > 0) && (state?.metrics?.publicMorale ?? 0) >= 20 && (state?.metrics?.foodSupply ?? 0) >= 12,
      reason: !((state?.metrics?.treasury ?? 0) < 20 || economy.treasuryArrears > 0) ? 'Requires Treasury below 20 or outstanding Treasury obligations.' : 'Requires at least 20 Morale and 12 Food to bear the civilian costs.' },
  ];
  return specs.map(option => ({ ...option, available: !locked && option.available,
    reason: locked ? (committed ? 'This decision allocation has already been committed.' : 'Allocations are available only during an open new-rules decision.') : option.available ? '' : option.reason }));
}

export function getCurrentRecoveryPlan(state) {
  const plan = state?.supplyPlan;
  return plan && plan.scenarioId === state.scenarioId && plan.decisionIndex === (state.history?.length || 0) ? plan : null;
}

export function selectRecoveryAllocation(state, allocationId) {
  if (!getRecoveryOptions(state).some(option => option.id === allocationId && option.available)) return state;
  return { ...state, supplyPlan: { scenarioId: state.scenarioId, decisionIndex: state.history?.length || 0, allocationId, committed: false } };
}

// This is also used on an ephemeral battle base state. Cancelling that battle
// discards its allocation together with its uncommitted result; no benefit leaks.
export function commitRecoveryAllocation(state) {
  const plan = getCurrentRecoveryPlan(state);
  if (campaignRulesVersion(state) === 1 || !plan || plan.committed) return state;
  const option = getRecoveryOptions(state).find(entry => entry.id === plan.allocationId && entry.available);
  if (!option) return state;
  const applied = applySupplyDeltas(state.metrics, state.campaignEconomy, option.deltas);
  return {
    ...state, metrics: applied.metrics,
    campaignEconomy: { ...applied.economy, emergencyUsed: applied.economy.emergencyUsed + (option.id === 'emergency' ? 1 : 0) },
    supplyPlan: { ...plan, committed: true },
  };
}

export function getCampaignUpkeep(state, { skipTurnDecay = false } = {}) {
  if (skipTurnDecay) return {};
  const story = state.difficulty === 'story';
  const deltas = { munitions: story ? -1 : -3, treasury: story ? -1 : -3, foodSupply: story ? -1 : -2 };
  const foodAfter = clamp(state.metrics.foodSupply + deltas.foodSupply);
  if (foodAfter < 40) deltas.publicMorale = story ? -1 : -2;
  if (foodAfter < 25) deltas.militaryStrength = story ? -1 : -3;
  if (clamp(state.metrics.publicMorale + (deltas.publicMorale || 0)) < 40) deltas.militaryStrength = (deltas.militaryStrength || 0) - (story ? 2 : 4);
  if (state.shards.hotspur.alignment < 30) deltas.militaryStrength = (deltas.militaryStrength || 0) - (story ? 1 : 2);
  if (state.shards.fox.alignment < 30) deltas.munitions -= story ? 1 : 2;
  if (state.shards.wolf.alignment < 30) deltas.treasury -= story ? 1 : 2;
  if (state.divergenceIndex >= 0.35) deltas.treasury -= story ? 1 : 2;
  if (state.divergenceIndex >= 0.6) deltas.publicMorale = (deltas.publicMorale || 0) - (story ? 1 : 2);
  return deltas;
}

export function getFundedBenefitRatio(metrics, effects) {
  const costs = ['treasury', 'munitions'].map(key => ({ key, cost: Math.max(0, -(effects?.metrics?.[key] || 0)) }));
  const requested = costs.reduce((sum, item) => sum + item.cost, 0);
  if (!requested) return 1;
  const funded = costs.reduce((sum, item) => sum + Math.min(metrics[item.key], item.cost), 0);
  return 0.4 + 0.6 * funded / requested;
}
