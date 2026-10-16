// A per-result policy boundary keeps completed journals and earlier tactical
// rules unchanged. Only applyBattleResolution opts a genuinely new result in.
export const FIELD_RESULT_CONSEQUENCES_VERSION = 1;
const SCENARIOS = new Set(['cedar_creek', 'third_winchester']);
const WINS = new Set(['decisive-win', 'costly-win']);
const LOSSES = new Set(['defeat', 'rout']);
const RESULTS = new Set([...WINS, ...LOSSES, 'disciplined-withdrawal']);

export function usesCurrentFieldConsequences(state, scenarioId) {
  return state?.rulesVersion === 2 && state?.battleRulesVersion >= 18 && SCENARIOS.has(scenarioId);
}

export function hasFieldResultConsequences(result) {
  return result?.fieldResultConsequencesVersion === FIELD_RESULT_CONSEQUENCES_VERSION
    && SCENARIOS.has(result?.scenarioId) && RESULTS.has(result?.result);
}

function missionSucceeded(scenarioId, choiceId, result) {
  const withdrawal = scenarioId === 'cedar_creek'
    ? ['option_c', 'option_d'].includes(choiceId)
    : ['option_b', 'option_d'].includes(choiceId);
  return withdrawal ? result === 'disciplined-withdrawal' : WINS.has(result);
}

export function resolveFieldResultConsequences(state, scenarioId, choice) {
  const field = state?.battleCampaign?.results?.[scenarioId];
  if (!choice || !usesCurrentFieldConsequences(state, scenarioId) || !hasFieldResultConsequences(field)) return null;
  const result = field.result;
  const choiceSucceeded = missionSucceeded(scenarioId, choice.id, result);
  const baseMetrics = choice.effects?.metrics || {};
  const effects = { metrics: { ...baseMetrics }, shards: { ...choice.effects?.shards } };
  let consequence;

  if (LOSSES.has(result)) {
    // Cedar's field ledger already applies army casualties. Its campaign adds
    // lost stores and confidence, never the authored victory's recovered train.
    if (scenarioId === 'cedar_creek') {
      effects.metrics = {
        militaryStrength: 0,
        munitions: baseMetrics.munitions || 0,
        ...(baseMetrics.treasury ? { treasury: baseMetrics.treasury } : {}),
        publicMorale: result === 'rout' ? -10 : -6,
        foodSupply: result === 'rout' ? -16 : -8,
      };
      effects.shards = choice.proposer === 'sovereign' ? { fox: -6, wolf: -4 } : { [choice.proposer]: -8 };
    }
    consequence = scenarioId === 'cedar_creek'
      ? result === 'rout'
        ? 'The Cedar Creek operation collapses into a rout. Sheridan holds the field, the Confederate columns scatter, and captured wagons and food are abandoned. Richmond receives a battlefield defeat, not the political victory it sought.'
        : 'The Cedar Creek operation ends in a field defeat. Sheridan retains the battlefield, the Confederate survivors fall back, and the intended recovery of prisoners, wagons, and food is not secured. The failed operation gives Richmond no battlefield victory to use in the election campaign.'
      : result === 'rout'
        ? 'The Third Winchester operation ends in a rout. Sheridan takes the field as the Confederate line scatters; the ordered escape and its promised preservation are not achieved. Stores and the lower Valley supply roads are lost.'
        : 'The Third Winchester operation ends in a field defeat. Sheridan takes the battlefield, and the surviving Confederate columns fall back without completing the selected field mission. The intended defense or covered escape does not earn battlefield success credit.';
    if (scenarioId === 'third_winchester' && choice.id === 'option_c') {
      // The authored independent publicity action is not a field victory.
      consequence += ' Political messages still circulate among supporters, but those reports neither reverse the defeat nor secure the Valley.';
    }
  } else if (result === 'disciplined-withdrawal') {
    if (choiceSucceeded) {
      consequence = choice.consequence;
    } else {
      if (scenarioId === 'cedar_creek') {
        effects.metrics = { militaryStrength: 0, munitions: baseMetrics.munitions || 0,
          ...(baseMetrics.treasury ? { treasury: baseMetrics.treasury } : {}), publicMorale: -4, foodSupply: -4 };
      }
      consequence = `The army withdraws in order from ${scenarioId === 'cedar_creek' ? 'Cedar Creek' : 'Third Winchester'}, preserving an organized force while conceding the battlefield. The selected attack or defense did not win the field; the orderly exit does not establish the promised capture of stores or a Confederate battlefield victory.`;
    }
  } else if (scenarioId === 'cedar_creek') {
    const decisive = result === 'decisive-win';
    effects.metrics = { militaryStrength: decisive ? 4 : 0, munitions: baseMetrics.munitions || 0,
      publicMorale: decisive ? 30 : 12, foodSupply: decisive ? 22 : 10, divergenceIndex: decisive ? 0.16 : 0.06 };
    consequence = decisive
      ? 'The Cedar Creek field command wins a decisive Confederate victory. The Union line is driven from the battlefield before Sheridan can restore it, and captured wagons and food are secured. This result gives Richmond a substantial battlefield success for its election campaign.'
      : 'The Cedar Creek field command wins a limited Confederate victory at heavy cost. Confederate forces secure local ground and some wagons and food, but Sheridan retains an army capable of renewing the fight. Richmond gains a smaller election advantage than a decisive defeat of the Union army would provide.';
  } else {
    // Third Winchester's adjacent review changes narrative and credit only;
    // its authored resource commitments and cabinet effects remain intact.
    consequence = `The Third Winchester field command wins a ${result === 'decisive-win' ? 'decisive' : 'limited'} Confederate victory. Sheridan's advance is checked on the battlefield, though the larger Valley campaign and its supply demands remain unresolved.`;
    if (choice.id === 'option_c') consequence += ' The independent political messages circulate alongside this actual field success.';
  }
  if (scenarioId === 'third_winchester' && choice.id === 'option_c' && result === 'disciplined-withdrawal') {
    consequence += ' Political messages continue independently of this withdrawal, without establishing a field victory.';
  }
  return { choiceSucceeded, effects, consequence };
}

// Unmarked history retains the authored branch contract under which it was
// recorded. New entries must support the named prerequisite with a real result.
export function satisfiesFieldResultRequirement(entry, requirement) {
  if (!requirement?.fieldResultRequirement || !hasFieldResultConsequences(entry?.battleResult)) return true;
  if (requirement.fieldResultRequirement === 'field-victory') return WINS.has(entry.battleResult.result);
  if (requirement.fieldResultRequirement === 'ordered-supply-withdrawal') return entry.battleResult.result === 'disciplined-withdrawal';
  return false;
}

export function fieldElectionFactors(entry) {
  if (!hasFieldResultConsequences(entry?.battleResult)) return null;
  const result = entry.battleResult.result;
  const name = entry.scenarioId === 'cedar_creek' ? 'Cedar Creek' : 'Third Winchester';
  const factors = [];
  if (entry.scenarioId === 'third_winchester' && entry.choiceId === 'option_c') {
    factors.push({ points: 1, label: 'Third Winchester political messaging (independent of the field result)' });
  }
  const points = result === 'decisive-win' ? 3 : result === 'costly-win' ? 1
    : result === 'rout' ? -4 : result === 'defeat' ? -3
      : entry.scenarioId === 'third_winchester' && entry.choiceId === 'option_d' ? 2 : -1;
  const label = result === 'decisive-win' ? 'decisive field victory' : result === 'costly-win' ? 'limited field victory'
    : result === 'rout' ? 'field rout' : result === 'defeat' ? 'field defeat' : 'organized withdrawal';
  factors.push({ points, label: `${name} ${label}` });
  return factors;
}

export function removeUnsupportedFieldScoreCredit(card, choiceId, field) {
  if (!hasFieldResultConsequences(field)) return card;
  if (LOSSES.has(field.result) || !missionSucceeded(field.scenarioId, choiceId, field.result)) {
    // Winchester C's authored strategic card credits independent political
    // messaging, not battlefield success. Its failed field still loses tactics.
    const independentMessaging = field.scenarioId === 'third_winchester' && choiceId === 'option_c';
    return { ...card, tactical: Math.min(0, card.tactical || 0),
      strategic: independentMessaging ? (card.strategic || 0) : Math.min(0, card.strategic || 0) };
  }
  return card;
}
