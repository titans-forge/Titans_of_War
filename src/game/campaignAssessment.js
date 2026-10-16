// A transparent game-outcome rubric. These weights are design choices, not
// validated measures of historical judgment, civilian welfare, or learning.
export const CAMPAIGN_ASSESSMENT_VERSION = 1;
export const CAMPAIGN_ASSESSMENT_WEIGHTS = Object.freeze({ supply: 40, force: 30, completion: 30 });
const bounded = (value, max = 100) => Number.isFinite(value) && value >= 0 && value <= max;
const round = value => Math.round(value * 100) / 100;
const metricKeys = ['militaryStrength', 'foodSupply', 'publicMorale'];
const limit = 'A game outcome rubric, not a validated measure of learning, historical judgment, or civilian welfare. Timeline divergence does not change this assessment. Compare runs with the same campaign and battle rules and difficulty.';

export function calculateCampaignAssessment(state) {
  const rulesVersion = state?.rulesVersion ?? 1;
  const battleRulesVersion = state?.battleRulesVersion ?? 1;
  const difficulty = state?.difficulty ?? 'standard';
  const evidence = {
    treasuryArrears: rulesVersion === 2 && bounded(state?.campaignEconomy?.treasuryArrears, 1000000) ? state.campaignEconomy.treasuryArrears : null,
    munitionsArrears: rulesVersion === 2 && bounded(state?.campaignEconomy?.munitionsArrears, 1000000) ? state.campaignEconomy.munitionsArrears : null,
    army: bounded(state?.metrics?.militaryStrength) ? state.metrics.militaryStrength : null,
    food: bounded(state?.metrics?.foodSupply) ? state.metrics.foodSupply : null,
    morale: bounded(state?.metrics?.publicMorale) ? state.metrics.publicMorale : null,
    decisions: Array.isArray(state?.history) ? state.history.length : null,
  };
  const base = { version: CAMPAIGN_ASSESSMENT_VERSION, rulesVersion, battleRulesVersion, difficulty, evidence, limitations: limit };
  if (rulesVersion !== 2 || ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].includes(battleRulesVersion) || !['story', 'standard'].includes(difficulty)
    || typeof state?.gameOver !== 'boolean' || metricKeys.some(key => !bounded(state?.metrics?.[key]))
    || evidence.treasuryArrears === null || evidence.munitionsArrears === null) {
    return { ...base, status: 'unavailable', score: null, components: [], explanation: rulesVersion === 1
      ? 'Legacy rules did not record unpaid supply obligations. A new outcome score cannot be reconstructed without inventing evidence; the original scores remain available.'
      : 'The recorded state is missing valid rules, supply obligations, or force-condition evidence. No outcome score is assigned.' };
  }
  const debt = evidence.treasuryArrears + evidence.munitionsArrears;
  const supply = Math.max(0, 100 - debt);
  const force = (evidence.army + evidence.food + evidence.morale) / 3;
  const survived = evidence.army > 10 && evidence.morale > 10 && evidence.food > 5;
  const completion = state.gameOver ? (survived ? 100 : 0) : null;
  const component = (id, label, score, explanation) => ({ id, label, weight: CAMPAIGN_ASSESSMENT_WEIGHTS[id],
    score: score === null ? null : round(score), contribution: score === null ? null : round(score * CAMPAIGN_ASSESSMENT_WEIGHTS[id] / 100), explanation });
  const components = [
    component('supply', 'Supply stewardship', supply,
      `100 minus unpaid Treasury (${round(evidence.treasuryArrears)}) and Ammunition (${round(evidence.munitionsArrears)}), with a floor of 0. Each modeled unpaid point removes one stewardship point; total obligations of 100 or more earn 0 of the 40 available points. Repayment improves this component. The raw obligations remain visible even after the score reaches its floor.`),
    component('force', 'Force condition', force,
      `The mean of the remaining Army (${round(evidence.army)}), Food (${round(evidence.food)}) and Morale (${round(evidence.morale)}) bars. All three have equal weight. These are game resources, not measured civilian welfare.`),
    component('completion', 'Campaign completion', completion, state.gameOver
      ? survived ? 'An ending was reached with Army above 10, Morale above 10 and Food above 5. This records reaching an ending without resource collapse, not a moral or historical endorsement of its political terms.'
        : 'An ending was reached at or below an existing collapse threshold: Army 10, Morale 10, or Food 5. Completion earns no points; remaining condition and paid obligations still retain their separate contributions.'
      : 'No ending has been reached. Completion and the overall score remain unscored; unfinished play is not treated as a failed campaign.'),
  ];
  return { ...base, status: state.gameOver ? (survived ? 'complete' : 'collapsed') : 'in-progress',
    score: state.gameOver ? Math.round(supply * 0.4 + force * 0.3 + completion * 0.3) : null,
    components, explanation: 'Supply stewardship contributes 40%, Force condition 30%, and Campaign completion 30%. The final total is rounded to the nearest whole point. These weights and the 100-obligation cutoff are explicit design choices, not validated grading norms.' };
}

export function formatCampaignAssessment(assessment) {
  const heading = `Campaign outcome assessment v${assessment.version}: ${assessment.score === null ? assessment.status === 'in-progress' ? 'In progress — not yet scored' : 'Unavailable' : `${assessment.score}/100`}`;
  return [heading, `Campaign rules ${assessment.rulesVersion}; battle rules ${assessment.battleRulesVersion}; difficulty ${assessment.difficulty}.`,
    assessment.explanation,
    ...assessment.components.map(item => `${item.label}: ${item.score === null ? 'Not yet scored' : `${item.score}/100 · ${item.contribution}/${item.weight} points`}. ${item.explanation}`),
    assessment.limitations].join('\n');
}
