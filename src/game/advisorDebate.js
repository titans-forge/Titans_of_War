import { getChoiceAvailability, summarizeCabinetCrises, summarizePoliticalEconomy } from './simulationEngine.js';

const FACTION_PRIORITIES = {
  hotspur: 'I weigh this motion by its effect on morale and our freedom to take the initiative.',
  fox: 'I weigh this motion by the troops, supplies, and funds it leaves for the next campaign.',
  wolf: 'I weigh this motion by its political leverage, public confidence, and cost.',
};

const FACTION_NAMES = {
  hotspur: 'Hotspur',
  fox: 'Fox',
  wolf: 'Wolf',
};

function sentence(text) {
  const clean = String(text || '').trim();
  if (!clean) return '';
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

function mergeWeightedEffects(target, effects, weight) {
  Object.entries(effects || {}).forEach(([key, value]) => {
    target[key] = (target[key] || 0) + (value * weight);
  });
}

function getExpectedEffects(choice) {
  if (!choice) return { metrics: {}, shards: {} };
  if (choice.successRate === undefined) {
    return choice.effects || { metrics: {}, shards: {} };
  }

  const successWeight = Math.max(0, Math.min(1, choice.successRate));
  const failureWeight = 1 - successWeight;
  const successEffects = choice.successEffects || choice.effects || { metrics: {}, shards: {} };
  const failureEffects = choice.failureEffects || { metrics: {}, shards: {} };
  const metrics = {};
  const shards = {};

  mergeWeightedEffects(metrics, successEffects.metrics, successWeight);
  mergeWeightedEffects(metrics, failureEffects.metrics, failureWeight);
  mergeWeightedEffects(shards, successEffects.shards, successWeight);
  mergeWeightedEffects(shards, failureEffects.shards, failureWeight);

  return { metrics, shards };
}

function formatChoiceLabel(choice) {
  return choice?.id ? choice.id.replace('option_', '').toUpperCase() : '—';
}

function describeExpectedEffects(choice) {
  const expected = getExpectedEffects(choice);
  const metrics = expected.metrics || {};
  const fragments = [];

  if (metrics.militaryStrength) {
    fragments.push(`military ${metrics.militaryStrength >= 0 ? '+' : ''}${Math.round(metrics.militaryStrength)}`);
  }
  if (metrics.munitions) {
    fragments.push(`munitions ${metrics.munitions >= 0 ? '+' : ''}${Math.round(metrics.munitions)}`);
  }
  if (metrics.treasury) {
    fragments.push(`treasury ${metrics.treasury >= 0 ? '+' : ''}${Math.round(metrics.treasury)}`);
  }
  if (metrics.foodSupply) {
    fragments.push(`food ${metrics.foodSupply >= 0 ? '+' : ''}${Math.round(metrics.foodSupply)}`);
  }
  if (metrics.publicMorale) {
    fragments.push(`morale ${metrics.publicMorale >= 0 ? '+' : ''}${Math.round(metrics.publicMorale)}`);
  }
  if (metrics.divergenceIndex) {
    fragments.push(`divergence ${metrics.divergenceIndex >= 0 ? '+' : ''}${(metrics.divergenceIndex * 100).toFixed(0)}%`);
  }

  return fragments.length
    ? `Expected ledger: ${fragments.join(', ')}.`
    : 'Expected ledger: no immediate metric swing.';
}

function latestHistoryLine(state) {
  const recent = Array.isArray(state?.history) && state.history.length
    ? state.history[state.history.length - 1]
    : null;
  if (!recent) {
    return 'The campaign is still in its opening posture.';
  }

  const outcome = recent.choiceSucceeded === true
    ? 'succeeded'
    : recent.choiceSucceeded === false
      ? 'failed'
      : 'resolved';

  return `After ${recent.scenarioTitle}, the last command ${outcome}.`;
}

function factionRiskLine(faction, politicalEconomy) {
  const indicators = politicalEconomy.indicators;
  if (faction === 'hotspur') {
    return `Desertion pressure is ${indicators.desertionPressure.label} and army cohesion is ${indicators.armyCohesion.label}`;
  }
  if (faction === 'fox') {
    return `Governor resistance is ${indicators.governorResistance.label} and bread relief pressure is ${indicators.breadReliefPressure.label}`;
  }
  return `Bond confidence is ${indicators.bondConfidence.label} and civil authority legitimacy is ${indicators.civilAuthorityLegitimacy.label}`;
}

function crisisLine(faction, scenario, crisisSummary) {
  if (scenario?.crisisFor === faction) {
    return `${FACTION_NAMES[faction]} is the active cabinet crisis inside this turn.`;
  }

  const active = (crisisSummary.activeAtEnd || []).find((entry) => entry.key === faction);
  if (active) {
    return `${FACTION_NAMES[faction]} remains unstable at ${active.alignment}% alignment.`;
  }

  if (crisisSummary.faced > 0) {
    return `The cabinet has already faced ${crisisSummary.faced === 1 ? '1 crisis' : `${crisisSummary.faced} crises`} this campaign.`;
  }

  return '';
}

function scoreChoiceForFaction(faction, choice, state, scenario) {
  const expected = getExpectedEffects(choice);
  const metrics = expected.metrics || {};
  const shards = expected.shards || {};
  let score = 0;

  if (choice.proposer === faction) score += 60;
  if (scenario?.crisisFor === faction) score += 25;

  if (faction === 'hotspur') {
    score += (metrics.publicMorale || 0) * 2.2;
    score += (metrics.foodSupply || 0) * 1.2;
    score += (metrics.divergenceIndex || 0) * 120;
    score += (shards.hotspur || 0) * 1.3;
    score -= Math.max(0, -(metrics.militaryStrength || 0)) * 0.45;
  }

  if (faction === 'fox') {
    score += (metrics.militaryStrength || 0) * 2.0;
    score += (metrics.munitions || 0) * 2.0;
    score += (metrics.treasury || 0) * 1.5;
    score += (metrics.foodSupply || 0) * 1.8;
    score -= Math.max(0, metrics.divergenceIndex || 0) * 100;
    score += (shards.fox || 0) * 1.2;
  }

  if (faction === 'wolf') {
    score += (metrics.treasury || 0) * 2.0;
    score += (metrics.foodSupply || 0) * 1.0;
    score += (metrics.publicMorale || 0) * 1.1;
    score += (metrics.divergenceIndex || 0) * 80;
    score += (shards.wolf || 0) * 1.8;
    score -= Math.max(0, -(metrics.treasury || 0)) * 0.6;
  }

  const currentAlignment = state?.shards?.[faction]?.alignment || 50;
  const projectedAlignment = currentAlignment + (shards[faction] || 0);
  if (currentAlignment < 30 && projectedAlignment >= 30) {
    score += 55;
  }

  return score;
}

export function generateAdvisorDebate(state, scenario, model = null) {
  const politicalEconomy = summarizePoliticalEconomy(state);
  const crisisSummary = summarizeCabinetCrises(state);
  const historyContext = latestHistoryLine(state);
  const choices = (Array.isArray(scenario?.choices) ? scenario.choices : [])
    .filter((choice) => !getChoiceAvailability(choice, scenario, state).locked);

  const result = {
    source: model ? 'deterministic-fallback' : 'deterministic',
    politicalEconomy,
    crisisSummary,
    summary: 'No cabinet debate available.',
  };

  ['hotspur', 'fox', 'wolf'].forEach((faction) => {
    const ranked = [...choices]
      .map((choice) => ({ choice, score: scoreChoiceForFaction(faction, choice, state, scenario) }))
      .sort((left, right) => right.score - left.score);

    const backedChoice = ranked[0]?.choice || null;
    const riskContext = sentence(factionRiskLine(faction, politicalEconomy));
    const crisisContext = sentence(crisisLine(faction, scenario, crisisSummary));
    const recommendation = backedChoice
      ? `I back ${formatChoiceLabel(backedChoice)}: ${backedChoice.text}`
      : 'No viable motion is on the table.';

    const argument = [
      sentence(recommendation),
      backedChoice ? FACTION_PRIORITIES[faction] : '',
      historyContext,
      riskContext,
      crisisContext,
      backedChoice ? describeExpectedEffects(backedChoice) : '',
    ]
      .filter(Boolean)
      .join(' ');

    result[faction] = {
      speaker: FACTION_NAMES[faction],
      choiceId: backedChoice?.id || null,
      choiceLabel: formatChoiceLabel(backedChoice),
      choiceText: backedChoice?.text || '',
      argument,
    };
  });

  const supported = ['hotspur', 'fox', 'wolf']
    .map((faction) => `${FACTION_NAMES[faction]} backs ${result[faction]?.choiceLabel || '—'}`)
    .join(' · ');

  result.summary = `${supported}. Debate synthesized from available choices, current pressures, and recent history.`;
  return result;
}
