import { getCampaignScenarioContext } from './campaignScenarioContext.js';
import { hasAssessedFieldConsequences, usesAssessedFieldConsequences } from './fieldResultConsequences.js';

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
  if (scenario?.id === 'appomattox_decision') {
    const previous = state?.history?.findLast(entry => entry.scenarioId === 'sailors_creek');
    const field = previous?.battleResult;
    if (field?.battleId === 'sailors_creek' && field.choiceId === previous.choiceId && hasAssessedFieldConsequences(field)) {
      const opening = previous.choiceSucceeded === true
        ? previous.choiceId === 'option_a'
          ? 'A local screen at Sailor’s Creek kept the aid route open as the army fell back. '
          : 'Some formations escaped Sailor’s Creek in order, preserving supplies for the last march. '
        : 'The local order fell short at Sailor’s Creek, leaving the army in worse shape for the last march. ';
      return { ...scenario, description: opening + scenario.description };
    }
  }
  if (['gettysburg_campaign_setup', 'gettysburg_with_jackson_setup'].includes(scenario?.id)) {
    const previous = state?.history?.findLast(entry => entry.scenarioId === 'vicksburg');
    const field = previous?.battleResult;
    if (field?.battleId === 'vicksburg' && field.choiceId === previous.choiceId && hasAssessedFieldConsequences(field)) {
      const opening = previous.choiceSucceeded === true
        ? previous.choiceId === 'option_a'
          ? 'The Railroad Redoubt held on May 22, and Grant shifted to siege. '
          : 'The guns reached Vicksburg’s inner line, preserving stores for the siege. '
        : 'The order at Vicksburg fell short, leaving fewer supplies for the siege. ';
      return { ...scenario, description: opening + scenario.description };
    }
  }
  if (scenario?.id === 'wilderness_opening') {
    const previous = state?.history?.findLast(entry => entry.scenarioId === 'missionary_ridge');
    const field = previous?.battleResult;
    if (field?.battleId === 'missionary_ridge' && field.choiceId === previous.choiceId && hasAssessedFieldConsequences(field)) {
      const opening = previous.choiceSucceeded === true
        ? previous.choiceId === 'option_a'
          ? 'The defense at Missionary Ridge bought time to save supplies as the army left the ridge. '
          : 'The ordered withdrawal from Missionary Ridge saved supplies as the Union secured Chattanooga. '
        : 'The retreat from Missionary Ridge left supplies behind as the Union secured Chattanooga. ';
      return { ...scenario, description: opening + scenario.description };
    }
  }
  if (scenario?.id === 'new_market' && usesAssessedFieldConsequences(state, scenario.id)) {
    const previous = state?.history?.findLast(entry => entry.scenarioId === 'spotsylvania');
    const field = previous?.battleResult;
    const settledSpotsylvania = field?.battleId === 'spotsylvania' && field.choiceId === previous.choiceId && hasAssessedFieldConsequences(field);
    const opening = settledSpotsylvania
      ? previous.choiceSucceeded === true
        ? previous.choiceId === 'option_a'
          ? 'The shorter line at Spotsylvania held, and supplies remain available for the Valley campaign. '
          : 'The West Face counterstroke slowed the attack at Spotsylvania, preserving some supplies for the campaign. '
        : 'The defense at Spotsylvania fell short, and fewer supplies are available for the Valley campaign. '
      : '';
    const fieldOrders = {
      option_a: {
        text: 'Advance on Bushong Farm with the regulars. Bring up the cadet reserve to close the gap.',
        costDescription: 'Commits 10 Munitions. Taking the farm approach can add 18 Food Supply. A failed advance loses 10 Food Supply.',
      },
      option_b: {
        text: 'Hold the Valley Pike with the regulars and keep the cadets organized in reserve.',
        costDescription: 'Commits 6 Munitions. Keeping the road open can add 16 Food Supply. A failed defense loses 6 Food Supply.',
      },
    };
    return { ...scenario,
      description: opening + 'Sigel’s line waits on the rise north of Bushong Farm. Rain has turned the plowed field to mud, while the Valley Pike still carries wagons. Breckinridge has to decide when to call up the cadets and how to keep the army’s supply route open.',
      choices: scenario.choices.map(choice => fieldOrders[choice.id] ? { ...choice, ...fieldOrders[choice.id] } : choice),
    };
  }
  if (scenario?.id === 'cold_harbor') {
    const previous = state?.history?.findLast(entry => entry.scenarioId === 'new_market');
    const field = previous?.battleResult;
    if (field?.battleId === 'new_market' && field.choiceId === previous.choiceId && hasAssessedFieldConsequences(field)) {
      const opening = previous.choiceSucceeded === true
        ? previous.choiceId === 'option_a'
          ? 'The advance at New Market kept the Valley supply route open. '
          : 'The Valley Pike held at New Market, and supply wagons are getting through. '
        : 'The New Market objective fell short, and fewer supplies are coming through the Valley. ';
      return { ...scenario, description: opening + scenario.description };
    }
  }
  if (scenario?.id === 'seven_days' && usesAssessedFieldConsequences(state, scenario.id)) {
    return { ...scenario, choices: scenario.choices.map(choice => choice.id === 'option_a' ? {
      ...choice,
      text: 'Carry the offensive to Gaines’ Mill. Cross Boatswain’s Creek and break Porter’s ridge line with supported infantry.',
      costDescription: 'Commits 20 Munitions. A supported breach can lift morale and keep the offensive moving.',
    } : choice) };
  }
  if (scenario?.id === 'second_manassas' && usesAssessedFieldConsequences(state, scenario.id)) {
    const previous = state.history?.findLast(entry => entry.scenarioId === 'seven_days');
    const field = previous?.battleResult;
    const openedAtGainesMill = field?.battleId === 'gaines_mill' && field.choiceId === previous.choiceId
      && hasAssessedFieldConsequences(field);
    const opening = openedAtGainesMill ? previous.choiceSucceeded === true
      ? 'At Gaines’ Mill, the assault opened a breach in Porter’s line. '
      : 'The attack at Gaines’ Mill fell short. Lee has fewer resources for the next offensive. '
      : '';
    const fieldOrders = {
      option_a: {
        text: 'Hold Jackson’s line at the Deep Cut and send Longstreet against Chinn Ridge.',
        costDescription: 'Commits 20 Munitions. Coordinating both wings can lift morale and earn a field victory.',
      },
      option_b: {
        text: 'Approve Longstreet’s reconnaissance in force and keep the reserve intact behind Jackson’s line.',
        costDescription: 'Commits 10 Munitions. Cover Jackson with artillery and preserve enough of the reserve to hold the line. Available through 40% divergence.',
      },
    };
    return {
      ...scenario,
      date: 'August 29–30, 1862',
      description: `${opening}Pope’s forces keep pressing Jackson along the unfinished railroad grade north of the Warrenton Turnpike. Longstreet has arrived on Jackson’s right, opposite the exposed Union left. Lee must decide whether to coordinate both wings in an attack or test the position and keep a reserve in hand.`,
      choices: scenario.choices.map(choice => fieldOrders[choice.id] ? { ...choice, ...fieldOrders[choice.id] } : choice),
    };
  }
  if (scenario?.id === 'atlanta_election_pressure' && usesAssessedFieldConsequences(state, 'fall_of_atlanta')) {
    const previous = state?.history?.findLast(entry => entry.scenarioId === 'kennesaw_mountain');
    const field = previous?.battleResult;
    const settledKennesaw = field?.battleId === 'kennesaw_mountain' && field.choiceId === previous.choiceId && hasAssessedFieldConsequences(field);
    const opening = settledKennesaw
      ? previous.choiceSucceeded === true
        ? previous.choiceId === 'option_a'
          ? 'The Dead Angle held at Kennesaw Mountain, buying time to move some campaign supplies. '
          : 'The covered withdrawal at Kennesaw Mountain saved guns and stores for the Atlanta campaign. '
        : 'The Kennesaw Mountain order fell short, leaving fewer supplies for the Atlanta campaign. '
      : '';
    return { ...scenario, description: opening + scenario.description, choices: scenario.choices.map(choice => choice.id === 'option_a' ? { ...choice,
      costDescription: 'Commits 16 Munitions, raises morale, and opens the playable Jonesborough field decision.',
    } : choice) };
  }
  if (scenario?.id === 'antietam' && usesAssessedFieldConsequences(state, scenario.id)) {
    return { ...scenario, choices: scenario.choices.map(choice => {
      if (choice.id === 'option_a') return { ...choice,
        text: 'Stand firm at the Bloody Lane and hold the Sunken Road under assault.',
        costDescription: 'Commits 25 Munitions. The field decides whether the line holds and how the army fares.',
      };
      if (choice.id === 'option_b') return { ...choice,
        text: 'Order an organized withdrawal from the field and end the Maryland offensive.',
        costDescription: 'Costs 20 home-front Morale. An organized withdrawal preserves the army and returns 5 Treasury.',
      };
      return choice;
    }) };
  }
  if (scenario?.id === 'fall_of_atlanta' && usesAssessedFieldConsequences(state, scenario.id)) {
    const fieldOrders = {
      option_a: {
        text: 'Counterattack at Jonesborough and reopen the railroad long enough to move stores.',
        costDescription: 'Commits 14 Munitions. Holding the crossing buys a short supply window and softens the political shock of Atlanta’s loss.',
      },
      option_b: {
        text: 'Evacuate Atlanta and bring Hardee’s formations and guns out in order.',
        costDescription: 'Costs 24 home-front Morale. An organized exit with a battery preserves the force and recovers 4 Munitions.',
      },
    };
    return { ...scenario, choices: scenario.choices.map(choice => fieldOrders[choice.id] ? { ...choice, ...fieldOrders[choice.id] } : choice) };
  }
  if (scenario?.id === 'five_forks' && usesAssessedFieldConsequences(state, scenario.id)) {
    const fieldOrders = {
      option_a: {
        text: 'Hold the extended White Oak Road line, including the crossroads and the Angle.',
        costDescription: 'Commits 16 Munitions. Holding both positions under pressure buys time for the evacuation.',
      },
      option_b: {
        text: 'Refuse the left and hold Ford’s Road with a rear guard before withdrawing.',
        costDescription: 'Commits 10 Munitions. An orderly exit under cover buys time and preserves the army.',
      },
      option_c: {
        text: 'Withdraw early through Ford’s Road and concede the crossroads.',
        costDescription: 'Costs 22 home-front Morale. An organized exit preserves the army and recovers 2 Munitions.',
      },
    };
    return { ...scenario, choices: scenario.choices.map(choice => fieldOrders[choice.id] ? { ...choice, ...fieldOrders[choice.id] } : choice) };
  }
  if (['manassas_battlefield', 'shiloh_army_of_tennessee'].includes(scenario?.id)
    && usesAssessedFieldConsequences(state, scenario.id)) {
    const tradeoffs = scenario.id === 'shiloh_army_of_tennessee' ? {
      option_a: 'Commits 12 Munitions. Pressing the assault exposes Johnston. A field success can lift morale.',
      option_b: 'Commits 6 Munitions. Keep Johnston protected and the reserve ready to earn the preservation benefit.',
      option_c: 'Commits 14 Treasury to dispatches. Holding a credible position determines what they can achieve.',
      option_d: 'Costs 5 Morale. Securing the depot mission recovers Munitions and Treasury.',
    } : {
      option_a: 'Commits 10 Munitions to the counterattack. The field decides whether it succeeds.',
      option_b: 'Commits 5 Munitions to the defense. The field decides whether Henry Hill holds.',
      option_c: 'Costs home-front morale. Completing the withdrawal recovers some Treasury.',
      option_d: 'Commits 20 Munitions to the diversion. The field decides whether it pays off.',
    };
    return { ...scenario, choices: scenario.choices.map(choice => ({
      ...choice, costDescription: tradeoffs[choice.id] || choice.costDescription,
    })) };
  }
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
