import { createFreshCampaignState } from './campaignStorage.js';
import { getCampaignScenarioContext } from './campaignScenarioContext.js';
import { usesAssessedFieldConsequences } from './fieldResultConsequences.js';
import { HISTORY_SCORE_CARD_VERSION, calculateCampaignScore, resolveChoiceScoreCard, resolveNextScenario, tickMetrics } from './simulationEngine.js';

export const DEFAULT_MAX_DECISIONS = 80;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const CRISIS_LABELS = {
  hotspur: 'Hotspur Cabinet Crisis',
  fox: 'Fox Supply Crisis',
  wolf: 'Wolf Finance Crisis'
};
const FIELD_INTERLUDES = {
  emancipation_cabinet_debate: { before: ['fredericksburg_winter_politics'], field: 'fredericksburg_field' },
  chancellorsville_aftermath: { before: ['gettysburg_campaign_setup', 'gettysburg_with_jackson_setup'], field: 'vicksburg' },
  chickamauga: { before: ['wilderness_opening'], field: 'missionary_ridge' },
  wilderness: { before: ['new_market'], field: 'spotsylvania' },
  cold_harbor: { before: ['atlanta_election_pressure'], field: 'kennesaw_mountain' },
  richmond_evacuation: { before: ['appomattox_decision'], field: 'sailors_creek' },
};

export function getScenarioForState(state, scenarios) {
  if (!Array.isArray(scenarios) || !scenarios.length) return null;

  if (state?.nextScenarioId) {
    const pending = scenarios.find((scenario) => scenario.id === state.nextScenarioId);
    if (pending) return pending;
  }

  if (state?.scenarioId) {
    const current = scenarios.find((scenario) => scenario.id === state.scenarioId);
    if (current) return current;
  }

  return scenarios.find((scenario) => scenario.turn === state?.currentTurn) || scenarios[0] || null;
}

export function resolveChoiceInput(activeScenario, choiceInput) {
  if (!activeScenario?.choices?.length) return null;

  if (typeof choiceInput === 'string') {
    return activeScenario.choices.find((choice) => choice.id === choiceInput) || null;
  }

  if (choiceInput?.id) {
    return activeScenario.choices.find((choice) => choice.id === choiceInput.id) || choiceInput;
  }

  return null;
}

export function buildHistoryEntry(state, activeScenario, choice, ticked) {
  const crisisFor = activeScenario?.crisisFor || null;
  const crisisAlignmentBefore = crisisFor ? state?.shards?.[crisisFor]?.alignment ?? null : null;
  const crisisAlignmentAfter = crisisFor ? ticked?.shards?.[crisisFor]?.alignment ?? null : null;
  const battleResult = state?.battleCampaign?.results?.[activeScenario?.id] || null;
  const scoreCard = resolveChoiceScoreCard(activeScenario.id, choice, battleResult);

  return {
    turn: state.currentTurn,
    scenarioId: activeScenario.id,
    date: activeScenario.date,
    scenarioTitle: activeScenario.title,
    scenarioRoleLabel: activeScenario.roleLabel,
    scenarioActor: activeScenario.actor,
    choiceId: choice.id,
    choiceText: choice.text,
    choiceProposer: choice.proposer,
    scoreCard,
    scoreCardVersion: HISTORY_SCORE_CARD_VERSION,
    battleResult,
    metricEffects: { ...(ticked.appliedEffects?.metrics || {}) },
    resourceTransitions: ticked.resourceTransitions ? clone(ticked.resourceTransitions) : null,
    choiceSucceeded: ticked.choiceSucceeded,
    consequence: ticked.resolvedConsequence,
    divergence: ticked.divergenceIndex,
    crisisFor,
    crisisLabel: crisisFor ? (CRISIS_LABELS[crisisFor] || `${crisisFor} Crisis`) : null,
    crisisAlignmentBefore,
    crisisAlignmentAfter,
    crisisResolved: crisisFor ? crisisAlignmentAfter !== null && crisisAlignmentAfter >= 30 : false,
    ...(ticked.supplyReport ? { supplyReport: clone(ticked.supplyReport) } : {})
  };
}

// Derives a human-readable tag describing which routing path the campaign director took.
function resolveDirectorRoute(activeScenario, choice, nextScenario, ticked, fieldInterlude) {
  if (!nextScenario) return 'end-of-campaign';
  if (fieldInterlude?.field === nextScenario.id) return 'field-interlude';
  if (choice?.next && nextScenario.id === choice.next) return 'choice.next';
  if (activeScenario?.electionBranch) return `election-result:${nextScenario.id}`;
  if (nextScenario.crisisFor) return `cabinet-crisis:${nextScenario.crisisFor}`;
  if (Array.isArray(activeScenario?.branches)) {
    const matched = activeScenario.branches.find(
      (b) => b.scenarioId === nextScenario.id && (ticked.divergenceIndex || 0) >= (b.minDivergence || 0)
    );
    if (matched) return `divergence-branch:${(matched.minDivergence * 100).toFixed(0)}%`;
  }
  return 'linear';
}

export function advanceCampaignTurn(state, activeScenario, choiceInput, scenarios, successModifier = 0) {
  if (state?.gameOver) throw new Error('The campaign has concluded; no further decision can be committed.');
  activeScenario = getCampaignScenarioContext(state, activeScenario);
  const choice = resolveChoiceInput(activeScenario, choiceInput);
  if (!choice) {
    throw new Error(`Choice not found for scenario ${activeScenario?.id || 'unknown'}`);
  }

  const rawTicked = tickMetrics(state, choice, successModifier, {
    skipTurnDecay: !!activeScenario?.interlude || !!activeScenario?.crisisFor,
    settlementInterlude: !!activeScenario?.settlementInterlude,
    // Terminal scenarios (Peace Crisis, etc.) end the campaign on any
    // choice regardless of currentTurn so the player lands cleanly on the
    // final grade screen rather than being asked for further turns.
    endsCampaign: !!activeScenario?.endsCampaign || !!choice?.endsCampaign,
    activeScenarioId: activeScenario?.id || null,
  });
  const holdsCampaignTurn = activeScenario?.crisisFor || activeScenario?.interlude;
  const ticked = holdsCampaignTurn
    ? {
      ...rawTicked,
      currentTurn: state.currentTurn,
      statusMessage: activeScenario?.interlude && !rawTicked.gameOver
        ? 'Historical interlude resolved. Returning to the campaign line.'
        : rawTicked.statusMessage,
    }
    : rawTicked;
  const historyEntry = buildHistoryEntry(state, activeScenario, choice, ticked);
  const resolvedHistory = [...(state.history || []), historyEntry];
  // The western interlude occupies the same turn as the pending eastern
  // briefing. Recover the Jackson choice from the journal after save/restore.
  const priorEasternOrder = activeScenario.id === 'vicksburg'
    ? state.history?.findLast(entry => entry.scenarioId === 'chancellorsville_aftermath')
    : null;
  const routingChoice = priorEasternOrder?.choiceId === 'option_b'
    ? { ...choice, next: 'gettysburg_with_jackson_setup' }
    : choice;
  const authoredNextScenario = ticked.gameOver
    ? null
    : resolveNextScenario(
      activeScenario,
      routingChoice,
      ticked.currentTurn,
      scenarios,
      ticked.divergenceIndex,
      ticked.shards,
      resolvedHistory
    );
  // A cabinet hearing interrupts the pending handoff without settling it.
  const interludeSource = activeScenario.crisisFor
    ? state.history?.findLast(entry => !entry.crisisFor)?.scenarioId
    : activeScenario.id;
  const interlude = FIELD_INTERLUDES[interludeSource];
  const nextScenario = interlude?.before.includes(authoredNextScenario?.id)
    && usesAssessedFieldConsequences(state, interlude.field)
    && !resolvedHistory.some(entry => entry.scenarioId === interlude.field)
    ? scenarios.find(scene => scene.id === interlude.field) || authoredNextScenario
    : authoredNextScenario;
  const linearScenario = ticked.gameOver
    ? null
    : scenarios.find((scenario) => scenario.turn === ticked.currentTurn) || null;
  const nextScenarioId = nextScenario && nextScenario.id !== linearScenario?.id
    ? nextScenario.id
    : null;
  const canonicalNextScenario = ticked.gameOver
    ? null
    : (nextScenarioId ? nextScenario : (linearScenario || nextScenario || null));

  const directorRoute = resolveDirectorRoute(activeScenario, routingChoice, canonicalNextScenario, ticked, interlude);

  const nextState = {
    ...clone(state),
    currentTurn: ticked.currentTurn,
    scenarioId: canonicalNextScenario?.id || state.scenarioId || null,
    nextScenarioId,
    metrics: ticked.metrics,
    ...(state.rulesVersion === 2 ? { campaignEconomy: ticked.campaignEconomy, supplyPlan: ticked.supplyPlan } : {}),
    shards: ticked.shards,
    divergenceIndex: ticked.divergenceIndex,
    gameOver: ticked.gameOver,
    statusMessage: ticked.statusMessage,
    history: resolvedHistory
  };

  return {
    state: nextState,
    nextScenario: getCampaignScenarioContext(nextState, canonicalNextScenario),
    historyEntry,
    choice,
    ticked,
    directorRoute
  };
}

function validateDecisionCap(maxTurns) {
  if (!Number.isSafeInteger(maxTurns) || maxTurns < 1) {
    throw new Error('maxTurns must be a positive integer decision cap');
  }
}

function summarizeRun(state, scenario, turns, maxTurns) {
  const endingReached = !!state.gameOver;
  const capped = !endingReached && !!scenario && turns.length >= maxTurns;
  return {
    finalState: state,
    finalScenario: scenario,
    turns,
    decisionsMade: turns.length,
    chronologicalStage: state.currentTurn,
    endingReached,
    capped,
    stopReason: endingReached ? 'ending-reached' : capped ? 'decision-cap' : scenario ? 'no-choice' : 'no-scenario',
    campaignScore: calculateCampaignScore(state),
  };
}

export function runHeadlessCampaign({ scenarios, initialState = null, chooseChoice = null, maxTurns = DEFAULT_MAX_DECISIONS }) {
  validateDecisionCap(maxTurns);
  if (!Array.isArray(scenarios) || !scenarios.length) {
    throw new Error('runHeadlessCampaign requires a non-empty scenario array');
  }

  let state = clone(
    initialState || createFreshCampaignState(1861, scenarios.find((scenario) => scenario.turn === 1)?.id || scenarios[0].id)
  );
  let scenario = getScenarioForState(state, scenarios);
  const turns = [];

  while (scenario && !state.gameOver && turns.length < maxTurns) {
    const selected = chooseChoice
      ? chooseChoice({ state: clone(state), scenario, step: turns.length })
      : scenario.choices?.[0]?.id;

    if (!selected) break;

    const result = advanceCampaignTurn(state, scenario, selected, scenarios);
    turns.push({
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      choiceId: result.historyEntry.choiceId,
      crisisFor: result.historyEntry.crisisFor,
      divergence: result.historyEntry.divergence,
      directorRoute: result.directorRoute
    });

    state = result.state;
    scenario = result.nextScenario;
  }

  return summarizeRun(state, scenario, turns, maxTurns);
}

export async function runHeadlessCampaignAsync({ scenarios, initialState = null, chooseChoice = null, maxTurns = DEFAULT_MAX_DECISIONS }) {
  validateDecisionCap(maxTurns);
  if (!Array.isArray(scenarios) || !scenarios.length) {
    throw new Error('runHeadlessCampaignAsync requires a non-empty scenario array');
  }

  let state = clone(
    initialState || createFreshCampaignState(1861, scenarios.find((scenario) => scenario.turn === 1)?.id || scenarios[0].id)
  );
  let scenario = getScenarioForState(state, scenarios);
  const turns = [];

  while (scenario && !state.gameOver && turns.length < maxTurns) {
    const selected = chooseChoice
      ? await chooseChoice({ state: clone(state), scenario, step: turns.length })
      : scenario.choices?.[0]?.id;

    if (!selected) break;

    const result = advanceCampaignTurn(state, scenario, selected, scenarios);
    turns.push({
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      choiceId: result.historyEntry.choiceId,
      crisisFor: result.historyEntry.crisisFor,
      divergence: result.historyEntry.divergence,
      directorRoute: result.directorRoute
    });

    state = result.state;
    scenario = result.nextScenario;
  }

  return summarizeRun(state, scenario, turns, maxTurns);
}
