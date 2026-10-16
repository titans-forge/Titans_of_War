// Titans of War — Core Game State & Physics Resolution Engine
import { campaignRulesVersion, commitRecoveryAllocation, createCampaignEconomy, applySupplyDeltas, getCampaignUpkeep, getFundedBenefitRatio, getCurrentRecoveryPlan, getRecoveryOptions, getBattleSupplyProfile, getCampaignChoice } from './campaignSupply.js';
import { resolveFieldResultConsequences, satisfiesFieldResultRequirement, fieldElectionFactors, removeUnsupportedFieldScoreCredit } from './fieldResultConsequences.js';

// Clamps a metric between 0 and 100
const clamp = (val) => Math.max(0, Math.min(100, val));
export const CAMPAIGN_FINAL_TURN = 28;

// Returns true if a single history entry satisfies the requirement object.
// requirement can specify scenarioId (required), choiceId, choiceIds[], or
// choiceSucceeded — same semantics used by resolveNextScenario branches.
function historyEntryMatchesRequirement(entry, requirement) {
  if (!requirement || !entry) return false;
  if (entry.scenarioId !== requirement.scenarioId) return false;
  if (requirement.choiceId && entry.choiceId !== requirement.choiceId) return false;
  if (Array.isArray(requirement.choiceIds) && !requirement.choiceIds.includes(entry.choiceId)) return false;
  if (requirement.choiceSucceeded !== undefined && entry.choiceSucceeded !== requirement.choiceSucceeded) return false;
  if (!satisfiesFieldResultRequirement(entry, requirement)) return false;
  return true;
}

function historyHasRequirement(history, requirement) {
  const entries = Array.isArray(history) ? history : [];
  return entries.some((entry) => historyEntryMatchesRequirement(entry, requirement));
}

// Evaluate a requiresHistory descriptor against the campaign history.
// Supported shapes:
//   { allOf: [<requirement|group>...], label?: "human-readable summary" }
// where each item is either a simple requirement (matched directly) or a
// group { anyOf: [requirement, ...], label?: "..." } that satisfies if ANY
// of its sub-requirements is met by history.
// Returns { satisfied: boolean, missingLabels: string[] } so the lock UI can
// explain exactly which historical preconditions have not yet been earned.
export function evaluateRequiresHistory(requiresHistory, history) {
  if (!requiresHistory) return { satisfied: true, missingLabels: [] };
  const clauses = Array.isArray(requiresHistory.allOf) ? requiresHistory.allOf : [];
  if (clauses.length === 0) return { satisfied: true, missingLabels: [] };

  const missingLabels = [];
  let satisfied = true;
  for (const clause of clauses) {
    if (clause && Array.isArray(clause.anyOf) && clause.anyOf.length > 0) {
      const any = clause.anyOf.some((requirement) => historyHasRequirement(history, requirement));
      if (!any) {
        satisfied = false;
        missingLabels.push(clause.label || clause.anyOf.map((requirement) => requirement.label).filter(Boolean).join(' or ') || 'unmet historical condition');
      }
      continue;
    }
    if (!historyHasRequirement(history, clause)) {
      satisfied = false;
      missingLabels.push(clause.label || 'unmet historical condition');
    }
  }
  return { satisfied, missingLabels };
}

export function getChoiceAvailability(choice, scenario, state) {
  const advisor = state?.shards?.[choice?.proposer];
  const alignmentLocked = !scenario?.crisisFor
    && (scenario?.turn || 0) < CAMPAIGN_FINAL_TURN
    && advisor
    && advisor.alignment < 30;
  const divergence = state?.divergenceIndex || 0;
  const divergenceLocked = (choice?.minDivergence !== undefined && divergence < choice.minDivergence)
    || (choice?.maxDivergence !== undefined && divergence > choice.maxDivergence);

  // Historical-precondition gate. Used to lock the full-independence options
  // in southern_independence_1864 unless the player kept A.S. Johnston alive
  // at Shiloh, kept Jackson alive after Chancellorsville, and drove a big
  // Gettysburg win that brought Britain and France toward intervention.
  const historyEvaluation = evaluateRequiresHistory(choice?.requiresHistory, state?.history);
  const historyLocked = !historyEvaluation.satisfied;

  let lockReason = '';
  if (alignmentLocked) {
    lockReason = `${advisor?.name || choice.proposer} is in open resistance and will not support this option.`;
  } else if (choice?.minDivergence !== undefined && divergence < choice.minDivergence) {
    lockReason = `Requires at least ${(choice.minDivergence * 100).toFixed(0)}% timeline divergence to unlock.`;
  } else if (choice?.maxDivergence !== undefined && divergence > choice.maxDivergence) {
    lockReason = `Standard orthodox action unavailable on a ${(divergence * 100).toFixed(0)}% diverged timeline.`;
  } else if (historyLocked) {
    const headline = choice?.requiresHistory?.label || 'Requires specific historical conditions earlier in the campaign.';
    lockReason = `${headline} Still missing: ${historyEvaluation.missingLabels.join('; ')}.`;
  }

  return {
    advisor,
    alignmentLocked: Boolean(alignmentLocked),
    divergenceLocked,
    historyLocked,
    historyMissing: historyEvaluation.missingLabels,
    locked: Boolean(alignmentLocked || divergenceLocked || historyLocked),
    lockReason
  };
}

function applyMetricFloor(metrics, floor = null) {
  if (!floor || typeof floor !== 'object') return;
  for (const [key, minValue] of Object.entries(floor)) {
    if (metrics[key] === undefined || typeof minValue !== 'number') continue;
    metrics[key] = clamp(Math.max(metrics[key], minValue));
  }
}

function applyShardAlignmentFloor(shards, floor = null) {
  if (!floor || typeof floor !== 'object') return;
  for (const [key, minValue] of Object.entries(floor)) {
    if (!shards[key] || typeof minValue !== 'number') continue;
    shards[key].alignment = clamp(Math.max(shards[key].alignment, minValue));
  }
}

// --- Seedable RNG (reproducible campaigns) -------------------------------
// Bare Math.random() made runs impossible to replay, share, or benchmark.
// mulberry32 is a tiny, fast, deterministic PRNG. A campaign stores one seed;
// each turn's roll is derived from (seed, turn) so the same campaign always
// resolves identically — the prerequisite for shareable runs and the
// headless model-tournament grader.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministically mixes a campaign seed with a turn number into a 32-bit seed.
export function deriveSeed(campaignSeed, turn) {
  const base = (campaignSeed >>> 0) || 0;
  return (base ^ Math.imul((turn | 0) + 1, 0x9e3779b1)) >>> 0;
}

export function tickMetrics(state, choice = null, successModifier = 0, options = {}) {
  choice = getCampaignChoice(state, { id: options.activeScenarioId || state.scenarioId }, choice);
  const newRules = campaignRulesVersion(state) === 2;
  const prepared = newRules && choice ? commitRecoveryAllocation(state) : state;
  let nextMetrics = { ...prepared.metrics };
  let economy = { ...createCampaignEconomy(), ...prepared.campaignEconomy };
  const resourceTransitions = { version: 1, before: { ...nextMetrics } };
  if (newRules) {
    resourceTransitions.before = { ...state.metrics };
    resourceTransitions.afterAllocation = { ...nextMetrics };
  }
  const supplyReport = newRules ? {
    version: 1, allocationId: getCurrentRecoveryPlan(prepared)?.committed ? getCurrentRecoveryPlan(prepared).allocationId : 'none',
    upkeep: {}, shortages: [], repayments: [], benefitRatio: 1,
    arrearsBefore: { treasury: state.campaignEconomy?.treasuryArrears || 0, munitions: state.campaignEconomy?.munitionsArrears || 0 },
    arrearsAfter: null, notes: [],
  } : null;
  let nextShards = JSON.parse(JSON.stringify(state.shards));
  let divergence = state.divergenceIndex;
  let activeRevolts = { hotspur: false, fox: false, wolf: false };

  // 1. Natural turn decay / consumption
  if (newRules) {
    const upkeep = getCampaignUpkeep(prepared, options);
    const applied = applySupplyDeltas(nextMetrics, economy, upkeep);
    nextMetrics = applied.metrics;
    economy = applied.economy;
    supplyReport.upkeep = upkeep;
    supplyReport.shortages.push(...applied.shortages);
    supplyReport.repayments.push(...applied.repayments);
    if (!options.skipTurnDecay) for (const key of ['hotspur', 'fox', 'wolf']) activeRevolts[key] = state.shards[key].alignment < 30;
  } else if (!options.skipTurnDecay) {
    nextMetrics.munitions = clamp(nextMetrics.munitions - 5);
    nextMetrics.treasury = clamp(nextMetrics.treasury - 5);
    if (nextMetrics.foodSupply !== undefined) {
      nextMetrics.foodSupply = clamp(nextMetrics.foodSupply - 2);
      if (nextMetrics.foodSupply < 40) {
        nextMetrics.publicMorale = clamp(nextMetrics.publicMorale - 4);
      }
      if (nextMetrics.foodSupply < 25) {
        nextMetrics.militaryStrength = clamp(nextMetrics.militaryStrength - 6);
      }
    }

    if (nextMetrics.publicMorale < 40) {
      nextMetrics.militaryStrength = clamp(nextMetrics.militaryStrength - 8);
    }

    // Political backlash tickers (alignment < 30%)
    if (state.shards.hotspur.alignment < 30) {
      activeRevolts.hotspur = true;
      nextMetrics.militaryStrength = clamp(nextMetrics.militaryStrength - 4);
    }
    if (state.shards.fox.alignment < 30) {
      activeRevolts.fox = true;
      nextMetrics.munitions = clamp(nextMetrics.munitions - 4);
    }
    if (state.shards.wolf.alignment < 30) {
      activeRevolts.wolf = true;
      nextMetrics.treasury = clamp(nextMetrics.treasury - 4);
    }

    // 1b. Divergence volatility — a timeline torn off the historical rails is
    // harder to govern. The further you diverge, the more reserves bleed each
    // turn. This makes the Divergence Index a real cost, not just a readout.
    if (divergence >= 0.35) {
      nextMetrics.treasury = clamp(nextMetrics.treasury - 3);
    }
    if (divergence >= 0.6) {
      nextMetrics.publicMorale = clamp(nextMetrics.publicMorale - 3);
    }
  }

  resourceTransitions.afterUpkeep = { ...nextMetrics };
  resourceTransitions.afterDecisionEffects = { ...nextMetrics };

  // 2. Apply choice effects (Stochastic or Deterministic)
  let choiceSucceeded = null;
  let resolvedEffects = null;
  let resolvedConsequence = "";

  if (choice) {
    resolvedEffects = choice.effects;
    resolvedConsequence = choice.consequence;

    if (choice.successRate !== undefined) {
      // Deterministic roll: reproducible for a given (seed, turn).
      const rng = mulberry32(deriveSeed(state.seed ?? 0, state.currentTurn));
      const roll = rng();
      const effectiveSuccessRate = Math.min(1.0, choice.successRate + successModifier);
      if (typeof options.forecastOutcome === 'boolean' ? options.forecastOutcome : roll < effectiveSuccessRate) {
        choiceSucceeded = true;
        resolvedEffects = choice.successEffects || choice.effects;
        resolvedConsequence = choice.successConsequence || choice.consequence;
      } else {
        choiceSucceeded = false;
        resolvedEffects = choice.failureEffects || {
          metrics: { militaryStrength: -20, publicMorale: -15 },
          shards: {}
        };
        resolvedConsequence = choice.failureConsequence || `The strategic operation failed: ${choice.consequence}`;
      }
    }

    const fieldConsequences = resolveFieldResultConsequences(state, options.activeScenarioId || state.scenarioId, choice);
    if (fieldConsequences) {
      choiceSucceeded = fieldConsequences.choiceSucceeded;
      resolvedEffects = fieldConsequences.effects;
      resolvedConsequence = fieldConsequences.consequence;
    }

    if (resolvedEffects) {
      if (newRules) {
        const benefitRatio = getFundedBenefitRatio(nextMetrics, resolvedEffects);
        supplyReport.benefitRatio = benefitRatio;
        resolvedEffects = { ...resolvedEffects, metrics: { ...resolvedEffects.metrics }, shards: { ...resolvedEffects.shards } };
        for (const key of ['militaryStrength', 'publicMorale']) if (resolvedEffects.metrics[key] > 0) resolvedEffects.metrics[key] *= benefitRatio;
        for (const key of Object.keys(resolvedEffects.shards)) if (resolvedEffects.shards[key] > 0) resolvedEffects.shards[key] *= benefitRatio;
        const applied = applySupplyDeltas(nextMetrics, economy, resolvedEffects.metrics);
        nextMetrics = applied.metrics;
        economy = applied.economy;
        supplyReport.shortages.push(...applied.shortages);
        supplyReport.repayments.push(...applied.repayments);
      } else if (resolvedEffects.metrics) {
        Object.keys(resolvedEffects.metrics).forEach(key => {
          if (nextMetrics[key] !== undefined) {
            nextMetrics[key] = clamp(nextMetrics[key] + resolvedEffects.metrics[key]);
          }
        });
      }

      if (resolvedEffects.shards) {
        Object.keys(resolvedEffects.shards).forEach(key => {
          if (nextShards[key]) {
            nextShards[key].alignment = clamp(nextShards[key].alignment + resolvedEffects.shards[key]);
          }
        });
      }

      if (resolvedEffects.metrics && resolvedEffects.metrics.divergenceIndex !== undefined) {
        divergence = Math.max(0, Math.min(1.0, divergence + resolvedEffects.metrics.divergenceIndex));
      }
    }

    resourceTransitions.afterDecisionEffects = { ...nextMetrics };

    // Some authored stabilization choices are meant to guarantee survival
    // into the next scenario even from a dangerously weak state.
    applyMetricFloor(nextMetrics, choice.survivalFloor);
    applyShardAlignmentFloor(nextShards, choice.shardAlignmentFloor);
  }
  resourceTransitions.afterDecision = { ...nextMetrics };
  if (newRules) {
    supplyReport.arrearsAfter = { treasury: economy.treasuryArrears, munitions: economy.munitionsArrears };
    if (supplyReport.shortages.length) supplyReport.notes.push('Unfunded Treasury and Munitions costs are deferred obligations. Later gains repay them before replenishing the reserve bars.');
    if (supplyReport.benefitRatio < 1) supplyReport.notes.push(`Insufficient funding reduced positive Army, Morale and cabinet-alignment gains to ${Math.round(supplyReport.benefitRatio * 100)}% of the authored benefit. Losses were not increased.`);
    if (options.activeScenarioId === 'fort_sumter' && choice?.id === 'option_b') supplyReport.notes.push('New-rules Sumter evacuation models the Northern rally with +8 Public Morale rather than the legacy penalty.');
  }

  // 3. Evaluate failure criteria / campaign ending
  let gameOver = false;
  let statusMessage = "";

  let won = false;
  const alternateTimeline = divergence >= 0.6;

  // Terminal scenarios (the Peace Crisis, etc.) close the campaign on any
  // choice. The campaign also ends on the final turn or when a metric floor
  // is breached. The terminal flag is passed by advanceCampaignTurn after
  // reading scenario.endsCampaign / choice.endsCampaign.
  if (options.endsCampaign && choice) {
    gameOver = true;
    won = nextMetrics.militaryStrength > 10
      && nextMetrics.publicMorale > 10
      && (nextMetrics.foodSupply === undefined || nextMetrics.foodSupply > 5);
    statusMessage = finalTurnStatusMessage(state, choice, divergence);
  } else if (state.currentTurn >= CAMPAIGN_FINAL_TURN && choice) {
    gameOver = true;
    won = nextMetrics.militaryStrength > 10
      && nextMetrics.publicMorale > 10
      && (nextMetrics.foodSupply === undefined || nextMetrics.foodSupply > 5);
    statusMessage = finalTurnStatusMessage(state, choice, divergence);
  } else if (nextMetrics.militaryStrength <= 10) {
    gameOver = true;
    statusMessage = "DEFEAT: Desertion, straggling, expiring enlistments, and battlefield losses have left you without a field army capable of continuing the campaign.";
  } else if (nextMetrics.publicMorale <= 10) {
    gameOver = true;
    statusMessage = "DEFEAT: Bread riots, draft resistance, and collapsing civilian confidence have broken the home front. The war effort can no longer be sustained.";
  } else if (nextMetrics.foodSupply !== undefined && nextMetrics.foodSupply <= 5) {
    gameOver = true;
    statusMessage = 'DEFEAT: Granaries, wagon parks, and livestock reserves have collapsed. The army can no longer feed itself into another campaign.';
  } else {
    statusMessage = divergence >= 1.0
      ? `Turn ${state.currentTurn + (choice ? 1 : 0)} initialized. Timeline fully severed from the historical record, but the campaign continues under alternate-history conditions.`
      : `Turn ${state.currentTurn + (choice ? 1 : 0)} initialized. Recalibrating tactical grids.`;
  }

  return {
    currentTurn: Math.min(CAMPAIGN_FINAL_TURN, state.currentTurn + (choice ? 1 : 0)),
    metrics: nextMetrics,
    shards: nextShards,
    divergenceIndex: divergence,
    gameOver,
    won,
    alternateTimeline,
    statusMessage,
    choiceSucceeded,
    appliedEffects: resolvedEffects,
    resourceTransitions,
    resolvedConsequence,
    activeRevolts,
    ...(newRules ? { campaignEconomy: economy, supplyPlan: prepared.supplyPlan || null, supplyReport } : {})
  };
}

// Forecast both possible tactical results without exposing the seeded roll.
// It calls the same resolution function used on commitment, including clamping,
// allocation, upkeep, obligations, survival floors and new-rules corrections.
export function forecastCampaignChoice(state, scenario, choice, successModifier = 0) {
  const options = { skipTurnDecay: Boolean(scenario?.interlude || scenario?.crisisFor), endsCampaign: Boolean(scenario?.endsCampaign || choice?.endsCampaign), activeScenarioId: scenario?.id || state.scenarioId };
  const chance = choice?.successRate === undefined ? null : Math.max(0, Math.min(1, choice.successRate + successModifier));
  const alternatives = chance === null ? [null] : chance <= 0 ? [false] : chance >= 1 ? [true] : [false, true];
  const outcomes = alternatives.map(result => {
    const resolved = tickMetrics(state, choice, successModifier, { ...options, ...(result === null ? {} : { forecastOutcome: result }) });
    return { result: result === null ? 'certain' : result ? 'success' : 'failure', metrics: resolved.metrics,
      gameOver: resolved.gameOver, won: resolved.won, statusMessage: resolved.statusMessage, supplyReport: resolved.supplyReport || null,
      campaignEconomy: resolved.campaignEconomy || state.campaignEconomy || null, resourceTransitions: resolved.resourceTransitions };
  });
  const resources = Object.fromEntries(Object.keys(state.metrics).map(key => {
    const values = outcomes.map(outcome => outcome.metrics[key]);
    return [key, { min: Math.min(...values), max: Math.max(...values), deltaMin: Math.min(...values) - state.metrics[key], deltaMax: Math.max(...values) - state.metrics[key] }];
  }));
  const prepared = choice ? commitRecoveryAllocation(state) : state;
  return { rulesVersion: campaignRulesVersion(state), difficulty: state.difficulty || 'standard', successChance: chance,
    resources, outcomes, allocationId: getCurrentRecoveryPlan(state)?.allocationId || 'none',
    allocationOptions: getRecoveryOptions(state), battleSupply: getBattleSupplyProfile(prepared),
    upkeep: outcomes[0]?.supplyReport?.upkeep || null, possibleCollapse: outcomes.some(outcome => outcome.gameOver && !outcome.won && !state.gameOver),
    scope: 'Campaign resolution before any unplayed field battle. Field losses and its success modifier can change these ranges.' };
}

// --- Divergence tiers (the index becomes narratively + mechanically meaningful) ---
export function divergenceTier(divergence) {
  const d = divergence || 0;
  if (d >= 0.6) return { tier: 'severed', label: 'Severed Timeline', note: 'Campaigns, diplomacy, and civilian endurance now unfold far outside the historical record, but the game no longer ends solely for that reason.' };
  if (d >= 0.35) return { tier: 'branching', label: 'Branching Timeline', note: 'Counterfactual decisions are materially changing strategy, politics, and war-weariness.' };
  if (d >= 0.12) return { tier: 'drifting', label: 'Drifting Timeline', note: 'Localized deviations from the historical record.' };
  return { tier: 'tethered', label: 'Tethered to History', note: 'Events track the orthodox chronology.' };
}

function finalTurnStatusMessage(state, choice, divergence) {
  const key = `${state.scenarioId || 'campaign'}:${choice?.id || 'option'}`;

  switch (key) {
    case 'appomattox_decision:option_a':
      return 'CAMPAIGN CONCLUDED — surrender is refused. Organized armies give way to scattered resistance, desertion, and partisan violence as conventional war dissolves into local conflict.';
    case 'appomattox_decision:option_b':
      return 'CAMPAIGN CONCLUDED — Grant\'s parole terms are accepted. The Army of Northern Virginia lays down its arms. This campaign ends with paroles; other Confederate forces and the work of Reconstruction remain beyond this ending.';
    case 'appomattox_decision:option_c':
      return 'CAMPAIGN CONCLUDED — a conditional settlement is sought, but not independence. The military end still comes under Union supremacy, though the political terms remain contested.';
    case 'appomattox_decision:option_d':
      return 'CAMPAIGN CONCLUDED — the final breakout fails. Exhaustion, casualties, and capture end organized resistance in the field.';
    case 'greensboro_convention:option_a':
      return 'CAMPAIGN CONCLUDED — the convention breaks toward continued resistance, but expiring enlistments and straggling splinter the effort into state-level holdouts rather than a coherent national army.';
    case 'greensboro_convention:option_b':
      return 'CAMPAIGN CONCLUDED — departmental paroles and supervised demobilization preserve the remaining armies and avert a wider collapse of civil order.';
    case 'greensboro_convention:option_c':
      return 'CAMPAIGN CONCLUDED — a temporary armistice and relief convention interrupt the final collapse, sending the war into a negotiated and deeply unfamiliar ending.';
    case 'greensboro_convention:option_d':
      return 'CAMPAIGN CONCLUDED — soldiers are sent home under state authority as food networks and enlistments outrun the Confederate center. The war ends through demobilization and exhaustion more than battlefield annihilation.';
    case 'election_1864_mcclellan:option_d':
      return "CAMPAIGN CONCLUDED — conditional reunion under a McClellan presidency. Confederate commissioners accept restoration of the Union while McClellan promises to submit a Concurrent Majority amendment to Congress and the states. Advocacy is secured; ratification is not.";
    case 'gettysburg_recognition_crisis:option_a':
      return "CAMPAIGN CONCLUDED — Britain and France recognize the Confederacy and Richmond accepts their mediated armistice. A decisive Gettysburg victory is converted into recognized independence before the military advantage can be lost.";
    case 'southern_independence_1864:option_a':
      return 'CAMPAIGN CONCLUDED — An alternate history is forged. Davis proclaimed Confederate independence as Northern war-weariness reached its breaking point, and the South stands as a recognized sovereign nation.';
    case 'southern_independence_1864:option_b':
      return 'CAMPAIGN CONCLUDED — European mediation produced a binding armistice along the existing lines. Southern independence is recognized by a world that respected four years of Confederate battlefield record.';
    case 'southern_independence_1864:option_c':
      return "CAMPAIGN CONCLUDED \u2014 ALTERNATE HISTORY SETTLEMENT. McClellan won the election and Confederate envoys were waiting. He accepts an armistice framework and promises to ask Congress and the states for a Concurrent Majority compact: no federal act touching sectional sovereignty would pass without concurrent consent of both sections. McClellan supports the proposal; ratification by Congress and the states is not guaranteed. The South does not gain independence; it gambles on reunion through amendment rather than surrender by exhaustion.";
    case 'southern_independence_1864:option_d':
      return "CAMPAIGN CONCLUDED \u2014 A modified compact settled the war before McClellan could win it. Permanent state sovereignty is embedded in the post-war constitutional language, and a reunited republic emerges that Lincoln would barely recognize as the one he fought to preserve.";
    default:
      return divergence >= 0.6
        ? `CAMPAIGN CONCLUDED — a new history is written. The war ended on a timeline ${(divergence * 100).toFixed(0)}% removed from our own.`
        : `CAMPAIGN CONCLUDED! You guided your army through the critical historical thresholds. Final Divergence Index: ${(divergence * 100).toFixed(0)}%.`;
  }
}

export function classifyCampaignEnding(state) {
  const metrics = state.metrics || {};
  const lastEntry = Array.isArray(state.history) && state.history.length
    ? state.history[state.history.length - 1]
    : null;

  if ((metrics.militaryStrength || 0) <= 10 && (state.currentTurn || 0) < CAMPAIGN_FINAL_TURN) {
    return {
      endingClass: 'Army Exhausted',
      endingNote: 'Desertion, straggling, expiring enlistments, and battlefield attrition left no field army capable of continuing the campaign.'
    };
  }

  if ((metrics.publicMorale || 0) <= 10 && (state.currentTurn || 0) < CAMPAIGN_FINAL_TURN) {
    return {
      endingClass: 'Home Front Fracture',
      endingNote: 'Bread riots, draft resistance, and evaporating civilian confidence broke the ability to sustain the war.'
    };
  }

  if ((metrics.foodSupply || 0) <= 5 && (state.currentTurn || 0) < CAMPAIGN_FINAL_TURN) {
    return {
      endingClass: 'Granary Collapse',
        endingNote: "The Valley's granaries and field depots failed, leaving the armies too hungry to continue coherent operations."
    };
  }

  switch (`${lastEntry?.scenarioId || ''}:${lastEntry?.choiceId || ''}`) {
    case 'appomattox_decision:option_a':
      return {
        endingClass: 'Guerrilla Fragmentation',
        endingNote: 'Formal surrender is rejected, but coherent field armies do not survive. Commands splinter into deserters, holdouts, and local partisan violence.'
      };
    case 'appomattox_decision:option_b':
      return {
        endingClass: 'Parole and Reunion',
        endingNote: 'The campaign ends in formal surrender, paroles, and a return of soldiers to civilian life under American civil authority.'
      };
    case 'appomattox_decision:option_c':
      return {
        endingClass: 'Conditional Reunion Appeal',
        endingNote: 'A negotiated military convention is sought to soften reunion terms, but recognized independence is no longer a plausible outcome at Appomattox.'
      };
    case 'appomattox_decision:option_d':
      return {
        endingClass: 'Final Charge',
        endingNote: 'A last battlefield gamble fails, ending the campaign in exhaustion and capture rather than negotiated preservation.'
      };
    case 'greensboro_convention:option_a':
      return {
        endingClass: 'State Resistance',
        endingNote: 'Governors and commanders try to continue the struggle, but desertion and expiring enlistments reduce the war to scattered state-level resistance.'
      };
    case 'greensboro_convention:option_b':
      return {
        endingClass: 'Departmental Paroles',
        endingNote: 'The armies are paroled by department before the remaining rail and food networks collapse, preserving lives and civil order.'
      };
    case 'greensboro_convention:option_c':
      return {
        endingClass: 'Armistice Convention',
        endingNote: 'A temporary armistice and relief convention carry the war into an unfamiliar negotiated ending.'
      };
    case 'greensboro_convention:option_d':
      return {
        endingClass: 'State Demobilization',
        endingNote: 'Soldiers drift home under state authority as enlistments expire and harvest, relief, and civilian order take priority over continued campaigning.'
      };
    case 'election_1864_mcclellan:option_d':
      return {
        endingClass: 'Concurrent Majority Reunion',
        endingNote: "The Confederacy accepts restoration of the Union under a McClellan presidency. McClellan promises to submit a Concurrent Majority amendment to Congress and the states, but cannot guarantee ratification."
      };
    case 'gettysburg_recognition_crisis:option_a':
      return {
        endingClass: 'Recognized Independence at Gettysburg',
        endingNote: 'Britain and France recognize the Confederacy after the alternate Gettysburg victory, and Richmond accepts a mediated armistice while its military leverage is at its height.'
      };
    case 'southern_independence_1864:option_a':
      return {
        endingClass: 'Southern Independence — Proclaimed',
        endingNote: "Davis's proclamation forced the world to choose. Britain and France recognized the Confederacy as Northern political will finally fractured beyond recovery."
      };
    case 'southern_independence_1864:option_b':
      return {
        endingClass: 'Southern Independence — Mediated Armistice',
        endingNote: 'European mediation ratified the war\'s final lines as a permanent boundary. The Confederacy emerged from the armistice as a recognized sovereign state.'
      };
    case 'southern_independence_1864:option_c':
      return {
        endingClass: 'Alternate History Settlement',
        endingNote: "McClellan's election and Confederate diplomacy produce an armistice tied to a proposed constitutional compact. McClellan supports submitting Calhoun's Concurrent Majority principle to Congress and the states; ratification remains a political fight rather than a guaranteed settlement. The campaign closes on a settlement framework no Reconstruction history actually records."
      };
    case 'southern_independence_1864:option_d':
      return {
        endingClass: 'Modified Constitutional Compact',
        endingNote: 'A pre-election compact with Lincoln embedded permanent state sovereignty into post-war constitutional language. The republic is reunited but restructured — neither the Union Lincoln started the war to preserve nor the Confederacy Davis proclaimed.'
      };
    default: {
      const tier = divergenceTier(state.divergenceIndex);
      return { endingClass: tier.label, endingNote: tier.note };
    }
  }
}

export function summarizeCabinetCrises(state) {
  const history = Array.isArray(state?.history) ? state.history : [];
  const entries = history.filter((entry) => entry.crisisFor);
  const byFaction = {
    hotspur: { label: 'Hotspur', faced: 0, resolved: 0 },
    fox: { label: 'Fox', faced: 0, resolved: 0 },
    wolf: { label: 'Wolf', faced: 0, resolved: 0 }
  };

  entries.forEach((entry) => {
    if (!byFaction[entry.crisisFor]) return;
    byFaction[entry.crisisFor].faced += 1;
    if (entry.crisisResolved) {
      byFaction[entry.crisisFor].resolved += 1;
    }
  });

  const faced = entries.length;
  const resolved = entries.filter((entry) => entry.crisisResolved).length;
  const unresolved = faced - resolved;
  const activeAtEnd = Object.entries(state?.shards || {})
    .filter(([, shard]) => (shard?.alignment || 0) < 30)
    .map(([key, shard]) => ({ key, label: shard?.name || key, alignment: shard?.alignment || 0 }));

  return {
    faced,
    resolved,
    unresolved,
    activeAtEnd,
    byFaction,
    entries
  };
}

function labelPressure(value) {
  if (value >= 75) return 'critical';
  if (value >= 55) return 'severe';
  if (value >= 35) return 'elevated';
  return 'contained';
}

function labelConfidence(value) {
  if (value >= 70) return 'strong';
  if (value >= 50) return 'stable';
  if (value >= 30) return 'fragile';
  return 'panicked';
}

function labelCohesion(value) {
  if (value >= 70) return 'solid';
  if (value >= 50) return 'fraying';
  if (value >= 30) return 'brittle';
  return 'splintering';
}

function labelLegitimacy(value) {
  if (value >= 70) return 'secure';
  if (value >= 50) return 'strained';
  if (value >= 30) return 'contested';
  return 'breaking';
}

export function summarizePoliticalEconomy(state) {
  const metrics = state?.metrics || {};
  const shards = state?.shards || {};
  const hotspur = shards.hotspur?.alignment || 0;
  const fox = shards.fox?.alignment || 0;
  const wolf = shards.wolf?.alignment || 0;
  const divergence = state?.divergenceIndex || 0;
  const morale = metrics.publicMorale || 0;
  const treasury = metrics.treasury || 0;
  const munitions = metrics.munitions || 0;
  const foodSupply = metrics.foodSupply || 0;
  const militaryStrength = metrics.militaryStrength || 0;
  const averageAlignment = (hotspur + fox + wolf) / 3;
  const crisisSummary = summarizeCabinetCrises(state);
  const activeCrises = crisisSummary.activeAtEnd.length;

  const desertionPressureValue = clamp(Math.round(
    ((100 - militaryStrength) * 0.34)
    + ((100 - morale) * 0.24)
    + ((100 - foodSupply) * 0.16)
    + (Math.max(0, 35 - hotspur) * 1.2)
    + (divergence * 24)
  ));

  const governorResistanceValue = clamp(Math.round(
    ((100 - munitions) * 0.2)
    + ((100 - treasury) * 0.16)
    + ((100 - foodSupply) * 0.14)
    + (Math.max(0, 35 - fox) * 1.35)
    + ((100 - morale) * 0.12)
    + (activeCrises * 6)
  ));

  const bondConfidenceValue = clamp(Math.round(
    (treasury * 0.44)
    + (foodSupply * 0.08)
    + (wolf * 0.22)
    + (morale * 0.1)
    + ((100 - (divergence * 100)) * 0.16)
    - (activeCrises * 5)
  ));

  const breadReliefPressureValue = clamp(Math.round(
    ((100 - morale) * 0.32)
    + ((100 - treasury) * 0.16)
    + ((100 - munitions) * 0.08)
    + ((100 - foodSupply) * 0.32)
    + (Math.max(0, 35 - fox) * 0.8)
    + (divergence * 14)
  ));

  const armyCohesionValue = clamp(Math.round(
    (militaryStrength * 0.31)
    + (morale * 0.2)
    + (foodSupply * 0.12)
    + (hotspur * 0.15)
    + (fox * 0.1)
    + ((100 - (divergence * 100)) * 0.1)
    - (activeCrises * 5)
  ));

  const civilAuthorityLegitimacyValue = clamp(Math.round(
    (morale * 0.24)
    + (treasury * 0.14)
    + (foodSupply * 0.12)
    + (averageAlignment * 0.26)
    + ((100 - (divergence * 100)) * 0.14)
    - (activeCrises * 8)
  ));

  const indicators = {
    desertionPressure: {
      value: desertionPressureValue,
      label: labelPressure(desertionPressureValue),
      note: 'Field strength, morale, rations, and Hotspur alignment determine how close the army is to straggling and desertion.'
    },
    governorResistance: {
      value: governorResistanceValue,
      label: labelPressure(governorResistanceValue),
      note: 'Fox alignment, supply strain, grain shortages, and treasury weakness drive state-level resistance to new levies and requisitions.'
    },
    bondConfidence: {
      value: bondConfidenceValue,
      label: labelConfidence(bondConfidenceValue),
      note: 'Treasury health, harvest security, Wolf alignment, and timeline stability determine whether Confederate finance still looks credible.'
    },
    breadReliefPressure: {
      value: breadReliefPressureValue,
      label: labelPressure(breadReliefPressureValue),
      note: 'Low morale, empty granaries, and poor treasury capacity push the home front toward bread riots, relief demands, and civilian unrest.'
    },
    armyCohesion: {
      value: armyCohesionValue,
      label: labelCohesion(armyCohesionValue),
      note: 'Cohesion reflects whether armies still behave like disciplined field forces rather than disconnected local commands, especially when rations run short.'
    },
    civilAuthorityLegitimacy: {
      value: civilAuthorityLegitimacyValue,
      label: labelLegitimacy(civilAuthorityLegitimacyValue),
      note: 'Civil legitimacy measures whether Richmond and the state apparatus still command obedience across the war effort when bread, pay, and order all come under strain.'
    }
  };

  const dominantRisks = [
    { key: 'desertionPressure', urgency: indicators.desertionPressure.value },
    { key: 'governorResistance', urgency: indicators.governorResistance.value },
    { key: 'breadReliefPressure', urgency: indicators.breadReliefPressure.value },
    { key: 'bondConfidence', urgency: 100 - indicators.bondConfidence.value },
    { key: 'armyCohesion', urgency: 100 - indicators.armyCohesion.value },
    { key: 'civilAuthorityLegitimacy', urgency: 100 - indicators.civilAuthorityLegitimacy.value },
  ]
    .sort((left, right) => right.urgency - left.urgency)
    .slice(0, 3)
    .map((entry) => entry.key);

  const overview = `Desertion pressure is ${indicators.desertionPressure.label}, governor resistance is ${indicators.governorResistance.label}, bond confidence is ${indicators.bondConfidence.label}, bread relief pressure is ${indicators.breadReliefPressure.label}, army cohesion is ${indicators.armyCohesion.label}, and civil authority legitimacy is ${indicators.civilAuthorityLegitimacy.label}.`;

  const summaryLines = [
    `Desertion pressure ${indicators.desertionPressure.value}/100 (${indicators.desertionPressure.label})`,
    `Governor resistance ${indicators.governorResistance.value}/100 (${indicators.governorResistance.label})`,
    `Bond confidence ${indicators.bondConfidence.value}/100 (${indicators.bondConfidence.label})`,
    `Bread relief pressure ${indicators.breadReliefPressure.value}/100 (${indicators.breadReliefPressure.label})`,
    `Army cohesion ${indicators.armyCohesion.value}/100 (${indicators.armyCohesion.label})`,
    `Civil authority legitimacy ${indicators.civilAuthorityLegitimacy.value}/100 (${indicators.civilAuthorityLegitimacy.label})`
  ];

  return {
    indicators,
    overview,
    summaryLines,
    dominantRisks,
    activeCrises,
  };
}

// --- Campaign report card (0-100 grades plus 0-1000 composite) --------------
// One transparent composite score so human runs AND model-tournament runs are comparable.
const REPORT_CARD_WEIGHTS = {
  tacticalSmarts: 350,
  strategicBrilliance: 400,
  timelineFidelity: 250,
};

const CHOICE_SCORE_CARD_OVERRIDES = {
  'fort_sumter:option_a': { tactical: -8, strategic: 4 },
  'fort_sumter:option_b': { tactical: 10, strategic: 8 },
  'fort_sumter:option_c': { tactical: -6, strategic: -5 },
  'fort_sumter:option_d': { tactical: 4, strategic: -8 },

  'radical_republican_crisis:option_a': { tactical: 0, strategic: 5 },
  'radical_republican_crisis:option_b': { tactical: 2, strategic: 12 },
  'radical_republican_crisis:option_c': { tactical: 0, strategic: 9 },
  'radical_republican_crisis:option_d': { tactical: 0, strategic: 4 },

  'manassas_battlefield:option_a': { tactical: -4, strategic: 2 },
  'manassas_battlefield:option_b': { tactical: 12, strategic: 5 },
  'manassas_battlefield:option_c': { tactical: -12, strategic: -8 },
  'manassas_battlefield:option_d': { tactical: 3, strategic: 1 },

  'charleston_harbor_escape:option_a': { tactical: -2, strategic: 2 },
  'charleston_harbor_escape:option_b': { tactical: 9, strategic: 8 },
  'charleston_harbor_escape:option_c': { tactical: 0, strategic: 5 },
  'charleston_harbor_escape:option_d': { tactical: 2, strategic: -2 },

  'naval_technology:option_a': { tactical: 7, strategic: 4 },
  'naval_technology:option_b': { tactical: 9, strategic: 10 },
  'naval_technology:option_c': { tactical: -3, strategic: 1 },
  'naval_technology:option_d': { tactical: 4, strategic: 3 },

  'shiloh_army_of_tennessee:option_a': { tactical: -9, strategic: -4 },
  'shiloh_army_of_tennessee:option_b': { tactical: 14, strategic: 8 },
  'shiloh_army_of_tennessee:option_c': { tactical: 0, strategic: 6 },
  'shiloh_army_of_tennessee:option_d': { tactical: 3, strategic: 10 },

  'first_winchester:option_a': { tactical: 7, strategic: 5 },
  'first_winchester:option_b': { tactical: 12, strategic: 10 },
  'first_winchester:option_c': { tactical: 5, strategic: 7 },
  'first_winchester:option_d': { tactical: 4, strategic: 11 },

  'seven_days:option_a': { tactical: 4, strategic: 8 },
  'seven_days:option_b': { tactical: 7, strategic: -2 },
  'seven_days:option_c': { tactical: 0, strategic: -4 },
  'seven_days:option_d': { tactical: 8, strategic: 5 },

  'second_manassas:option_a': { tactical: 13, strategic: 6 },
  'second_manassas:option_b': { tactical: 4, strategic: 2 },
  'second_manassas:option_c': { tactical: 0, strategic: 5 },
  'second_manassas:option_d': { tactical: 7, strategic: 9 },

  'antietam:option_a': { tactical: -18, strategic: -10 },
  'antietam:option_b': { tactical: 12, strategic: 7 },
  'antietam:option_c': { tactical: 0, strategic: 4 },
  'antietam:option_d': { tactical: -6, strategic: -6 },

  'potomac_leverage_campaign:option_a': { tactical: 2, strategic: 5 },
  'potomac_leverage_campaign:option_b': { tactical: 11, strategic: 8 },
  'potomac_leverage_campaign:option_c': { tactical: 0, strategic: 7 },
  'potomac_leverage_campaign:option_d': { tactical: 5, strategic: 10 },

  'emancipation_cabinet_debate:option_a': { tactical: 2, strategic: 10 },
  'emancipation_cabinet_debate:option_b': { tactical: 0, strategic: 3 },
  'emancipation_cabinet_debate:option_c': { tactical: 1, strategic: 12 },
  'emancipation_cabinet_debate:option_d': { tactical: 0, strategic: -2 },

  'fredericksburg_winter_politics:option_a': { tactical: -7, strategic: -3 },
  'fredericksburg_winter_politics:option_b': { tactical: 8, strategic: 13 },
  'fredericksburg_winter_politics:option_c': { tactical: 0, strategic: 8 },
  'fredericksburg_winter_politics:option_d': { tactical: 3, strategic: 12 },

  'chancellorsville_maneuver:option_a': { tactical: 15, strategic: 8 },
  'chancellorsville_maneuver:option_b': { tactical: 6, strategic: -2 },
  'chancellorsville_maneuver:option_c': { tactical: 9, strategic: 7 },
  'chancellorsville_maneuver:option_d': { tactical: -7, strategic: -4 },

  'chancellorsville_aftermath:option_a': { tactical: 6, strategic: 4 },
  'chancellorsville_aftermath:option_b': { tactical: 17, strategic: 9 },
  'chancellorsville_aftermath:option_c': { tactical: 0, strategic: 7 },
  'chancellorsville_aftermath:option_d': { tactical: 9, strategic: 6 },

  'gettysburg_campaign_setup:option_a': { tactical: -3, strategic: 1 },
  'gettysburg_campaign_setup:option_b': { tactical: 12, strategic: 9 },
  'gettysburg_campaign_setup:option_c': { tactical: 0, strategic: 7 },
  'gettysburg_campaign_setup:option_d': { tactical: 5, strategic: 10 },

  'gettysburg_with_jackson_setup:option_a': { tactical: 7, strategic: 4 },
  'gettysburg_with_jackson_setup:option_b': { tactical: 14, strategic: 10 },
  'gettysburg_with_jackson_setup:option_c': { tactical: 5, strategic: 8 },
  'gettysburg_with_jackson_setup:option_d': { tactical: 3, strategic: 9 },

  'gettysburg_with_jackson:option_a': { tactical: 4, strategic: 3 },
  'gettysburg_with_jackson:option_b': { tactical: 16, strategic: 11 },
  'gettysburg_with_jackson:option_c': { tactical: 0, strategic: 8 },
  'gettysburg_with_jackson:option_d': { tactical: 6, strategic: 5 },
  'gettysburg_recognition_crisis:option_a': { tactical: 4, strategic: 20 },
  'gettysburg_recognition_crisis:option_b': { tactical: 7, strategic: -4 },

  'gettysburg_decision:option_a': { tactical: -22, strategic: -14 },
  'gettysburg_decision:option_b': { tactical: 17, strategic: 10 },
  'gettysburg_decision:option_c': { tactical: 9, strategic: 4 },
  'gettysburg_decision:option_d': { tactical: 1, strategic: 2 },

  'susquehanna_offensive:option_a': { tactical: 1, strategic: 6 },
  'susquehanna_offensive:option_b': { tactical: 12, strategic: 8 },
  'susquehanna_offensive:option_c': { tactical: 0, strategic: 8 },
  'susquehanna_offensive:option_d': { tactical: 6, strategic: 10 },

  'chickamauga:option_a': { tactical: -9, strategic: -5 },
  'chickamauga:option_b': { tactical: 16, strategic: 8 },
  'chickamauga:option_c': { tactical: -3, strategic: -2 },
  'chickamauga:option_d': { tactical: 6, strategic: 11 },

  'chattanooga_stranglehold:option_a': { tactical: -3, strategic: 3 },
  'chattanooga_stranglehold:option_b': { tactical: 12, strategic: 11 },
  'chattanooga_stranglehold:option_c': { tactical: 0, strategic: 8 },
  'chattanooga_stranglehold:option_d': { tactical: 4, strategic: 9 },

  'wilderness_opening:option_a': { tactical: -25, strategic: -16 },
  'wilderness_opening:option_b': { tactical: 20, strategic: 8 },
  'wilderness_opening:option_c': { tactical: -12, strategic: -6 },
  'wilderness_opening:option_d': { tactical: -5, strategic: -3 },

  'wilderness:option_a': { tactical: -7, strategic: -3 },
  'wilderness:option_b': { tactical: 13, strategic: 8 },
  'wilderness:option_c': { tactical: 3, strategic: 9 },
  'wilderness:option_d': { tactical: 7, strategic: 9 },

  'cold_harbor:option_a': { tactical: -10, strategic: -4 },
  'cold_harbor:option_b': { tactical: 15, strategic: 10 },
  'cold_harbor:option_c': { tactical: 0, strategic: 8 },
  'cold_harbor:option_d': { tactical: 9, strategic: 12 },

  'new_market:option_a': { tactical: 1, strategic: 4 },
  'new_market:option_b': { tactical: 13, strategic: 12 },
  'new_market:option_c': { tactical: 2, strategic: 9 },
  'new_market:option_d': { tactical: 5, strategic: 11 },

  'atlanta_election_pressure:option_a': { tactical: -9, strategic: -7 },
  'atlanta_election_pressure:option_b': { tactical: 11, strategic: 14 },
  'atlanta_election_pressure:option_c': { tactical: 0, strategic: 12 },
  'atlanta_election_pressure:option_d': { tactical: 4, strategic: 13 },

  'fall_of_atlanta:option_a': { tactical: -4, strategic: 2 },
  'fall_of_atlanta:option_b': { tactical: 10, strategic: 3 },
  'fall_of_atlanta:option_c': { tactical: 7, strategic: 11 },
  'fall_of_atlanta:option_d': { tactical: -2, strategic: 8 },

  'third_winchester:option_a': { tactical: -20, strategic: -14 },
  'third_winchester:option_b': { tactical: 7, strategic: -2 },
  'third_winchester:option_c': { tactical: 0, strategic: 2 },
  'third_winchester:option_d': { tactical: 11, strategic: 5 },

  'cedar_creek:option_a': { tactical: 18, strategic: 17 },
  'cedar_creek:option_b': { tactical: -17, strategic: -13 },
  'cedar_creek:option_c': { tactical: 11, strategic: 9 },
  'cedar_creek:option_d': { tactical: 13, strategic: 7 },

  'election_1864_lincoln:option_a': { tactical: 1, strategic: 2 },
  'election_1864_lincoln:option_b': { tactical: 0, strategic: 9 },
  'election_1864_lincoln:option_c': { tactical: 1, strategic: 12 },
  'election_1864_lincoln:option_d': { tactical: 1, strategic: 10 },

  'election_1864_mcclellan:option_a': { tactical: 0, strategic: 14 },
  'election_1864_mcclellan:option_b': { tactical: 3, strategic: 13 },
  'election_1864_mcclellan:option_c': { tactical: 0, strategic: -8 },
  'election_1864_mcclellan:option_d': { tactical: 0, strategic: 16 },

  'black_confederate_debate:option_a': { tactical: 5, strategic: 2 },
  'black_confederate_debate:option_b': { tactical: 7, strategic: 14 },
  'black_confederate_debate:option_c': { tactical: 4, strategic: 13 },
  'black_confederate_debate:option_d': { tactical: -8, strategic: -12 },

  'petersburg_siege:option_a': { tactical: 11, strategic: 5 },
  'petersburg_siege:option_b': { tactical: 10, strategic: 5 },
  'petersburg_siege:option_c': { tactical: 8, strategic: 7 },
  'petersburg_siege:option_d': { tactical: 7, strategic: 6 },

  'five_forks:option_a': { tactical: -22, strategic: -14 },
  'five_forks:option_b': { tactical: 17, strategic: 10 },
  'five_forks:option_c': { tactical: 9, strategic: -2 },
  'five_forks:option_d': { tactical: 5, strategic: 6 },

  'richmond_evacuation:option_a': { tactical: -10, strategic: -7 },
  'richmond_evacuation:option_b': { tactical: 16, strategic: 8 },
  'richmond_evacuation:option_c': { tactical: 0, strategic: 7 },
  'richmond_evacuation:option_d': { tactical: 7, strategic: 10 },

  'appomattox_decision:option_a': { tactical: -16, strategic: -18 },
  'appomattox_decision:option_b': { tactical: 10, strategic: 14 },
  'appomattox_decision:option_c': { tactical: 2, strategic: 8 },
  'appomattox_decision:option_d': { tactical: -22, strategic: -16 },

  'southern_independence_1864:option_a': { tactical: 0, strategic: -3 },
  'southern_independence_1864:option_b': { tactical: 4, strategic: 12 },
  'southern_independence_1864:option_c': { tactical: 3, strategic: 16 },
  'southern_independence_1864:option_d': { tactical: 2, strategic: 7 },

  'greensboro_convention:option_a': { tactical: -12, strategic: -15 },
  'greensboro_convention:option_b': { tactical: 8, strategic: 13 },
  'greensboro_convention:option_c': { tactical: 0, strategic: 8 },
  'greensboro_convention:option_d': { tactical: 3, strategic: 9 },
};

export function gradeForStability(total) {
  if (total >= 900) return 'A';
  if (total >= 800) return 'B';
  if (total >= 700) return 'C';
  if (total >= 600) return 'D';
  return 'F';
}

export function gradeForReportCard(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function clampScore(score) {
  return clamp(Math.round(score));
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function isTacticalEntry(entry) {
  const role = entry?.scenarioRoleLabel || '';
  return !entry?.crisisFor && /Commander/i.test(role);
}

export const HISTORY_SCORE_CARD_VERSION = 2;

export function resolveChoiceScoreCard(scenarioId, choice, battleResult = null) {
  const key = `${scenarioId || ''}:${choice?.id || ''}`;
  const card = removeUnsupportedFieldScoreCredit({ ...CHOICE_SCORE_CARD_OVERRIDES[key], ...choice?.scoreCard }, choice?.id, battleResult);
  if (battleResult) {
    card.tactical = (card.tactical || 0) + (battleResult.tacticalScore || 0);
  }
  return card;
}

export function choiceScoreCard(entry) {
  const key = `${entry?.scenarioId || ''}:${entry?.choiceId || ''}`;
  const authored = CHOICE_SCORE_CARD_OVERRIDES[key] || {};
  const stored = entry?.scoreCard;
  const battle = entry?.battleResult;
  if (entry?.scoreCardVersion >= HISTORY_SCORE_CARD_VERSION) {
    return { ...authored, ...stored };
  }

  // Old battle cards already include the bonus. Only a bonus-only card can
  // be identified as missing authored tactics without guessing at inline edits.
  if (battle && (!stored || (
    Object.keys(stored).length === 1
    && stored.tactical === (battle.tacticalScore || 0)
  ))) {
    return resolveChoiceScoreCard(entry.scenarioId, { id: entry.choiceId }, battle);
  }
  return { ...authored, ...stored };
}

function scoreTacticalEntry(entry) {
  const effects = entry?.metricEffects || {};
  const explicit = choiceScoreCard(entry).tactical || 0;
  let score = explicit;
  score += (effects.militaryStrength || 0) * 0.9;
  score += (effects.munitions || 0) * 0.35;
  score += (effects.publicMorale || 0) * 0.25;
  score += (effects.foodSupply || 0) * 0.15;
  if (entry?.choiceSucceeded === true) score += 10;
  if (entry?.choiceSucceeded === false) score -= 12;
  if (entry?.choiceProposer === 'fox') score += 2;
  if (entry?.choiceProposer === 'hotspur') score -= 1;
  return Math.max(-40, Math.min(40, score));
}

function scoreStrategicEntry(entry) {
  const effects = entry?.metricEffects || {};
  const explicit = choiceScoreCard(entry).strategic || 0;
  let score = explicit;
  score += (effects.treasury || 0) * 0.55;
  score += (effects.foodSupply || 0) * 0.7;
  score += (effects.publicMorale || 0) * 0.45;
  score += (effects.munitions || 0) * 0.2;
  score += (effects.militaryStrength || 0) * 0.15;
  score -= (effects.divergenceIndex || 0) * 35;
  if (entry?.crisisResolved) score += 8;
  if (entry?.choiceSucceeded === false) score -= 6;
  if (entry?.choiceProposer === 'wolf') score += 2;
  if (entry?.choiceProposer === 'fox') score += 1;
  return Math.max(-40, Math.min(40, score));
}

function calculateReportCards(state, crisisSummary, politicalEconomy) {
  const history = Array.isArray(state?.history) ? state.history : [];
  const metrics = state?.metrics || {};
  const tacticalEntries = history.filter(isTacticalEntry);
  const tacticalJudgment = average(tacticalEntries.map(scoreTacticalEntry));
  const strategicJudgment = average(history.map(scoreStrategicEntry));
  const crisisResolutionRatio = crisisSummary.faced === 0 ? 1 : crisisSummary.resolved / crisisSummary.faced;

  const tacticalSmartsScore = clampScore(
    48
    + tacticalJudgment
    + (metrics.militaryStrength || 0) * 0.3
    + (metrics.munitions || 0) * 0.16
    + (politicalEconomy.indicators.armyCohesion.value || 0) * 0.18
    - (crisisSummary.activeAtEnd.length * 4)
  );

  const strategicBrillianceScore = clampScore(
    36
    + strategicJudgment
    + (metrics.treasury || 0) * 0.18
    + (metrics.foodSupply || 0) * 0.2
    + (metrics.publicMorale || 0) * 0.16
    + (politicalEconomy.indicators.civilAuthorityLegitimacy.value || 0) * 0.18
    + (politicalEconomy.indicators.bondConfidence.value || 0) * 0.12
    + (crisisResolutionRatio * 18)
  );

  const timelineFidelityScore = clampScore(100 - ((state.divergenceIndex || 0) * 100));

  return {
    tacticalSmarts: {
      label: 'Tactical Smarts',
      score: tacticalSmartsScore,
      grade: gradeForReportCard(tacticalSmartsScore),
    },
    strategicBrilliance: {
      label: 'Strategic Brilliance',
      score: strategicBrillianceScore,
      grade: gradeForReportCard(strategicBrillianceScore),
    },
    timelineFidelity: {
      label: 'Timeline Fidelity',
      score: timelineFidelityScore,
      grade: gradeForReportCard(timelineFidelityScore),
    },
  };
}

export function calculateCampaignScore(state) {
  const m = state.metrics || {};
  const shards = state.shards || {};
  const turn = state.currentTurn || 0;
  const campaignConcluded = !!state.gameOver;
  const survived = campaignConcluded && (m.militaryStrength || 0) > 10 && (m.publicMorale || 0) > 10 && (m.foodSupply || 0) > 5;
  const turnsCompleted = Math.min(CAMPAIGN_FINAL_TURN, turn);
  const crisisSummary = summarizeCabinetCrises(state);
  const politicalEconomy = summarizePoliticalEconomy(state);
  const reportCards = calculateReportCards(state, crisisSummary, politicalEconomy);
  const tacticalPts = Math.round((reportCards.tacticalSmarts.score / 100) * REPORT_CARD_WEIGHTS.tacticalSmarts);
  const strategicPts = Math.round((reportCards.strategicBrilliance.score / 100) * REPORT_CARD_WEIGHTS.strategicBrilliance);
  const timelinePts = Math.round((reportCards.timelineFidelity.score / 100) * REPORT_CARD_WEIGHTS.timelineFidelity);
  const total = tacticalPts + strategicPts + timelinePts;
  const commandScore = clampScore(
    (reportCards.tacticalSmarts.score * REPORT_CARD_WEIGHTS.tacticalSmarts
      + reportCards.strategicBrilliance.score * REPORT_CARD_WEIGHTS.strategicBrilliance)
    / (REPORT_CARD_WEIGHTS.tacticalSmarts + REPORT_CARD_WEIGHTS.strategicBrilliance)
  );
  const ending = campaignConcluded ? classifyCampaignEnding(state) : {
    endingClass: 'Campaign In Progress',
    endingNote: 'No campaign ending has been reached.',
  };

  return {
    total,
    grade: gradeForStability(total),
    commandScore,
    commandGrade: gradeForReportCard(commandScore),
    campaignConcluded,
    chronologicalStage: turn,
    decisionsMade: Array.isArray(state.history) ? state.history.length : 0,
    survived,
    turnsCompleted,
    divergence: state.divergenceIndex || 0,
    endingClass: ending.endingClass,
    endingNote: ending.endingNote,
    crisisSummary,
    reportCards,
    breakdown: [
      { label: 'Tactical Smarts', points: tacticalPts, max: REPORT_CARD_WEIGHTS.tacticalSmarts },
      { label: 'Strategic Brilliance', points: strategicPts, max: REPORT_CARD_WEIGHTS.strategicBrilliance },
      { label: 'Timeline Fidelity', points: timelinePts, max: REPORT_CARD_WEIGHTS.timelineFidelity }
    ]
  };
}

// --- Branching resolver (deterministic-layer alternate history) -------------
const CABINET_CRISIS_SCENARIOS = {
  hotspur: 'hotspur_cabinet_crisis',
  fox: 'fox_supply_crisis',
  wolf: 'wolf_finance_crisis'
};

const CABINET_CRISIS_MAX_PER_FACTION = 1;
const CABINET_CRISIS_LAST_TRIGGER_TURN = 19;

function resolveCabinetCrisisScenario(currentScenario, nextShards, scenarios, history = []) {
  if (!nextShards || currentScenario?.crisisFor) return null;
  if (currentScenario?.suppressCabinetCrisisAfter) return null;
  if ((currentScenario?.turn || 0) >= CABINET_CRISIS_LAST_TRIGGER_TURN + 1) return null;

  const historyEntries = Array.isArray(history) ? history : [];
  const pending = Object.entries(CABINET_CRISIS_SCENARIOS)
    .map(([shard, scenarioId]) => ({
      shard,
      scenarioId,
      alignment: nextShards[shard]?.alignment ?? 100,
      crisisIndexes: historyEntries
        .map((entry, index) => (entry?.crisisFor === shard ? index : -1))
        .filter((index) => index >= 0)
    }))
    .filter((entry) => entry.alignment < 30)
    .filter((entry) => entry.crisisIndexes.length < CABINET_CRISIS_MAX_PER_FACTION)
    .sort((a, b) => a.alignment - b.alignment);

  if (!pending.length) return null;

  return scenarios.find((scenario) => scenario.id === pending[0].scenarioId) || null;
}

export function calculateElectionPressure(history = [], threshold = 7) {
  const entries = Array.isArray(history) ? history : [];
  let score = 0;
  const factors = [];
  const add = (entry, points, label) => {
    if (!entry || !points) return;
    score += points;
    factors.push({ scenarioId: entry.scenarioId, choiceId: entry.choiceId, points, label });
  };
  const latest = (scenarioId) => [...entries].reverse().find((entry) => entry?.scenarioId === scenarioId);

  const coldHarbor = latest('cold_harbor');
  if (coldHarbor?.choiceId === 'option_b') add(coldHarbor, 1, 'Cold Harbor defensive success');
  if (coldHarbor?.choiceId === 'option_c') add(coldHarbor, 1, 'Cold Harbor political pressure');

  const atlantaApproach = latest('atlanta_election_pressure');
  const atlantaApproachScores = { option_a: -1, option_b: 2, option_c: 2, option_d: 1 };
  add(atlantaApproach, atlantaApproachScores[atlantaApproach?.choiceId] || 0, 'Atlanta campaign timing');

  // The delayed-Atlanta turn (atlanta_holds_october) only enters history when
  // the player kept Johnston in command at the orthodox decision and Atlanta
  // is still contested into October-November 1864. Every option on that
  // scenario meaningfully damages Lincoln's coalition; option_b (hold the
  // line through the election clock) and option_c (back-channel talks with
  // McClellan's campaign) are the strongest political moves.
  const atlantaHoldsOctober = latest('atlanta_holds_october');
  if (atlantaHoldsOctober?.choiceId === 'option_a') {
    add(atlantaHoldsOctober, atlantaHoldsOctober.choiceSucceeded ? 4 : 1, 'Allatoona supply strike');
  } else if (atlantaHoldsOctober?.choiceId === 'option_b') {
    add(atlantaHoldsOctober, 3, 'Atlanta held past the October state elections');
  } else if (atlantaHoldsOctober?.choiceId === 'option_c') {
    add(atlantaHoldsOctober, 4, 'Back-channel talks with the McClellan campaign');
  } else if (atlantaHoldsOctober?.choiceId === 'option_d') {
    add(atlantaHoldsOctober, 2, 'Material consolidation under cover of the Atlanta holdout');
  }

  const crater = latest('petersburg_siege');
  if (crater?.choiceId === 'option_a') add(crater, crater.choiceSucceeded === false ? -1 : 1, 'Crater containment');
  if (crater?.choiceId === 'option_b' || crater?.choiceId === 'option_c') add(crater, 1, 'Petersburg endurance');

  const atlantaFall = latest('fall_of_atlanta');
  if (atlantaFall?.choiceId === 'option_a') {
    add(atlantaFall, atlantaFall.choiceSucceeded ? 4 : -2, 'Jonesborough and Atlanta');
  } else if (atlantaFall?.choiceId === 'option_b') {
    add(atlantaFall, -3, 'Atlanta evacuated');
  } else if (atlantaFall?.choiceId === 'option_c') {
    add(atlantaFall, -2, 'Atlanta lost after industrial evacuation');
  } else if (atlantaFall?.choiceId === 'option_d') {
    add(atlantaFall, atlantaFall.choiceSucceeded ? 5 : -3, 'Atlanta held or lost through election season');
  }

  const thirdWinchester = latest('third_winchester');
  const winchesterScores = { option_a: -2, option_b: -1, option_c: 1, option_d: 2 };
  const winchesterFieldFactors = fieldElectionFactors(thirdWinchester);
  if (winchesterFieldFactors) for (const factor of winchesterFieldFactors) add(thirdWinchester, factor.points, factor.label);
  else add(thirdWinchester, winchesterScores[thirdWinchester?.choiceId] || 0, 'Third Winchester result');

  const cedarCreek = latest('cedar_creek');
  const cedarCreekScores = { option_a: 3, option_b: -3, option_c: -1, option_d: -1 };
  const cedarFieldFactors = fieldElectionFactors(cedarCreek);
  if (cedarFieldFactors) for (const factor of cedarFieldFactors) add(cedarCreek, factor.points, factor.label);
  else add(cedarCreek, cedarCreekScores[cedarCreek?.choiceId] || 0, 'Cedar Creek result');

  return {
    score,
    threshold,
    winner: score >= threshold ? 'mcclellan' : 'lincoln',
    factors
  };
}

// Resolves which scenario comes next WITHOUT requiring the LLM. Supports:
//   - choice.next: explicit scenario id to branch to
//   - scenario.branches: [{ minDivergence, scenarioId }] divergence-gated forks
//   - branch.requiredScenarios / requiredChoices / requiredChoiceGroups for rare alternate-history gates
//   - forced cabinet crisis scenarios when a faction falls into open resistance
//   - default: linear by turn number
// Backward compatible: scenarios with neither field fall through to linear order.
export function resolveNextScenario(currentScenario, choice, nextTurn, scenarios, divergence = 0, nextShards = null, history = []) {
  const byId = (id) => scenarios.find((s) => s.id === id);

  if (currentScenario?.crisisFor) {
    const historyEntries = Array.isArray(history) ? history : [];
    const priorMainEntry = [...historyEntries]
      .reverse()
      .find((entry) => entry?.scenarioId && !entry.crisisFor && entry.scenarioId !== currentScenario.id);
    const priorMainScenario = priorMainEntry ? byId(priorMainEntry.scenarioId) : null;
    const resumeTurn = Number.isFinite(priorMainScenario?.turn) && priorMainScenario.turn > 0
      ? priorMainScenario.turn + 1
      : nextTurn;
    const resumeScenario = scenarios.find((s) => s.turn === resumeTurn) || null;
    if (resumeScenario) return resumeScenario;
  }

  if (choice && choice.next) {
    const target = byId(choice.next);
    if (target) return target;
  }

  if (currentScenario?.electionBranch) {
    const threshold = currentScenario.electionBranch.threshold ?? 7;
    const assessment = calculateElectionPressure(history, threshold);

    // McClellan victory is gated on two hard historical conditions:
    //   1. Atlanta did not fall on schedule (Keep Johnston at the orthodox
    //      decision turned the campaign into a political contest), AND
    //   2. Cedar Creek's attack won the field, or its early withdrawal
    //      preserved the army and supply train. Newly recorded results must
    //      support the selected prerequisite. Legacy history retains the
    //      branch contract under which it was recorded. A high score alone
    //      cannot replace the prerequisites and returns to
    //      the Lincoln branch — the structural argument is that one win
    //      alone could not break the Northern coalition.
    let winner = assessment.winner;
    const mcclellanRequiredAll = currentScenario.electionBranch.mcclellanRequiredAll || [];
    const mcclellanRequiredAnyOf = currentScenario.electionBranch.mcclellanRequiredAnyOf || [];
    if (winner === 'mcclellan') {
      const allOk = mcclellanRequiredAll.every((requirement) => history.some((entry) => historyEntryMatchesRequirement(entry, requirement)));
      const anyOk = mcclellanRequiredAnyOf.length === 0
        || mcclellanRequiredAnyOf.some((requirement) => history.some((entry) => historyEntryMatchesRequirement(entry, requirement)));
      if (!allOk || !anyOk) {
        winner = 'lincoln';
      }
    }

    const targetId = winner === 'mcclellan'
      ? currentScenario.electionBranch.mcclellanScenarioId
      : currentScenario.electionBranch.lincolnScenarioId;
    const target = byId(targetId);
    if (target) return target;
  }

  if (currentScenario && Array.isArray(currentScenario.branches)) {
    const historyEntries = Array.isArray(history) ? history : [];
    const historyIds = new Set(historyEntries.map(h => h.scenarioId).filter(Boolean));
    const historyHasChoice = (requirement) => historyEntries.some((entry) => {
      if (!requirement || entry.scenarioId !== requirement.scenarioId) return false;
      if (requirement.choiceId && entry.choiceId !== requirement.choiceId) return false;
      if (Array.isArray(requirement.choiceIds) && !requirement.choiceIds.includes(entry.choiceId)) return false;
      if (requirement.choiceSucceeded !== undefined && entry.choiceSucceeded !== requirement.choiceSucceeded) return false;
      return true;
    });
    const eligible = currentScenario.branches
      .filter((b) => {
        if ((divergence || 0) < (b.minDivergence || 0)) return false;
        if (Array.isArray(b.requiredScenarios) && b.requiredScenarios.length > 0) {
          if (!b.requiredScenarios.every(id => historyIds.has(id))) return false;
        }
        if (Array.isArray(b.requiredChoices) && b.requiredChoices.length > 0) {
          if (!b.requiredChoices.every(historyHasChoice)) return false;
        }
        if (Array.isArray(b.requiredChoiceGroups) && b.requiredChoiceGroups.length > 0) {
          if (!b.requiredChoiceGroups.every((group) => {
            const choices = Array.isArray(group?.any) ? group.any : [];
            return choices.length > 0 && choices.some(historyHasChoice);
          })) return false;
        }
        return true;
      })
      .sort((a, b) => (b.minDivergence || 0) - (a.minDivergence || 0));
    if (eligible.length && eligible[0].scenarioId) {
      const target = byId(eligible[0].scenarioId);
      if (target) return target;
    }
  }

  const cabinetCrisis = resolveCabinetCrisisScenario(currentScenario, nextShards, scenarios, history);
  if (cabinetCrisis) return cabinetCrisis;

  const linearTurn = Number.isFinite(currentScenario?.turn) && currentScenario.turn > 0
    ? currentScenario.turn + 1
    : nextTurn;
  return scenarios.find((s) => s.turn === linearTurn) || null;
}

// Interactive Offline Sentiment Parser
// Runs immediately in browser using keyword heuristics, matching the layout triggers
export function parseLetterSentimentOffline(text) {
  const clean = (text || "").toLowerCase().trim();
  if (!clean) return null;

  // Heartfelt terms
  const heartfeltKeywords = ["love", "dear", "heartfelt", "wife", "pray", "miss", "affection", "family", "darling", "beloved", "child", "home"];
  // Resolute / Cold terms
  const resoluteKeywords = ["duty", "combat", "orders", "war", "iron", "resolute", "fight", "defense", "secure", "victory", "force", "enemy"];
  // Melancholic / Fearful terms
  const melancholicKeywords = ["retreat", "fear", "dark", "blood", "death", "wound", "doom", "hopeless", "cold", "despair", "lost", "grave"];

  let heartfeltCount = 0;
  let resoluteCount = 0;
  let melancholicCount = 0;

  heartfeltKeywords.forEach(k => { if (clean.includes(k)) heartfeltCount++; });
  resoluteKeywords.forEach(k => { if (clean.includes(k)) resoluteCount++; });
  melancholicKeywords.forEach(k => { if (clean.includes(k)) melancholicCount++; });

  if (heartfeltCount > resoluteCount && heartfeltCount > melancholicCount) {
    return {
      tone: "Heartfelt",
      ideology: "Diplomatic",
      moraleMod: +5,
      strengthMod: 0,
      description: "A moving letter home. The cabinet is rallied by your warmth. (+5 Public Morale)"
    };
  }

  if (resoluteCount > heartfeltCount && resoluteCount > melancholicCount) {
    return {
      tone: "Resolute",
      ideology: "Practical",
      moraleMod: -5,
      strengthMod: +5,
      description: "A stoic, severe tactical briefly. Tactical focus hardens your military resolve. (+5 Military Strength, -5 Morale)"
    };
  }

  if (melancholicCount > 0) {
    return {
      tone: "Melancholic",
      ideology: "Radical",
      moraleMod: -10,
      strengthMod: 0,
      description: "A dark letter expressing heavy dread. Rumors of despair leak out, worrying the home front. (-10 Public Morale)"
    };
  }

  // Default Baseline
  return {
    tone: "Standard Brief",
    ideology: "Balanced",
    moraleMod: 0,
    strengthMod: 0,
    description: "A formal communication. Telemetry indices remain stable."
  };
}
