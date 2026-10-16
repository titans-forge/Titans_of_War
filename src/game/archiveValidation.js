// Portable saves and local-model replies are untrusted JSON, even when produced locally.
export const MAX_CAMPAIGN_BYTES = 4 * 1024 * 1024;
export const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const text = (value, max = 16000) => typeof value === 'string' && value.length <= max;
export const number = (value, min = -100, max = 100) => Number.isFinite(value) && value >= min && value <= max;
const optional = (value, check) => value === undefined || value === null || check(value);
const texts = (value, keys) => keys.every(key => optional(value[key], text));
const numericMap = (value, min = -100, max = 100) => isRecord(value)
  && Object.values(value).every(item => number(item, min, max));

export function isBoundedJson(value) {
  let nodes = 0;
  const ancestors = new Set();
  function visit(item, depth) {
    if (++nodes > 100000 || depth > 24) return false;
    if (item === null || item === undefined || typeof item === 'boolean') return true;
    if (typeof item === 'string') return item.length <= 100000;
    if (typeof item === 'number') return Number.isFinite(item);
    if (typeof item !== 'object' || ancestors.has(item)) return false;
    ancestors.add(item);
    const entries = Object.entries(item);
    const valid = entries.length <= 10000 && entries.every(([key, child]) =>
      !['__proto__', 'prototype', 'constructor'].includes(key) && visit(child, depth + 1));
    ancestors.delete(item);
    return valid;
  }
  return visit(value, 0);
}

export function isValidBattleResult(value) {
  return isRecord(value) && texts(value, ['scenarioId', 'battleId', 'choiceId', 'result', 'source', 'summary', 'consequence', 'title'])
    && ['score', 'tacticalScore', 'elapsed'].every(key => optional(value[key], item => number(item, -100, 100000)))
    && optional(value.readiness, item => isRecord(item) && ['preparation', 'cohesion', 'supply', 'morale'].every(key => optional(item[key], n => number(n, 0, 100)))
      && optional(item.notes, notes => Array.isArray(notes) && notes.every(note => text(note))));
}

export function isValidHistoryEntry(entry) {
  return isRecord(entry) && text(entry.scenarioId, 200) && text(entry.choiceId, 200)
    && texts(entry, ['date', 'scenarioTitle', 'scenarioRoleLabel', 'choiceText', 'choiceProposer', 'consequence', 'crisisFor', 'crisisLabel', 'directorRoute'])
    && optional(entry.turn, n => Number.isSafeInteger(n) && n >= 0 && n <= 10000)
    && optional(entry.divergence, n => number(n, 0, 1))
    && ['crisisAlignmentBefore', 'crisisAlignmentAfter'].every(key => optional(entry[key], n => number(n, 0, 100)))
    && ['choiceSucceeded', 'crisisResolved'].every(key => optional(entry[key], value => typeof value === 'boolean'))
    && optional(entry.scoreCard, value => numericMap(value, -1000, 1000))
    && optional(entry.scoreCardVersion, n => Number.isSafeInteger(n) && n >= 1 && n <= 2)
    && optional(entry.metricEffects, numericMap)
    && optional(entry.resourceTransitions, value => isRecord(value) && value.version === 1
      && Object.entries(value).every(([key, map]) => key === 'version' || numericMap(map, 0, 100)))
    && optional(entry.battleResult, isValidBattleResult);
}

function isValidEffects(value) {
  return isRecord(value) && optional(value.metrics, numericMap) && optional(value.shards, numericMap);
}

function isHistoryRequirement(value) {
  return isRecord(value) && texts(value, ['scenarioId', 'choiceId', 'label'])
    && optional(value.choiceSucceeded, item => typeof item === 'boolean')
    && ['choiceIds', 'requiredScenarios'].every(key => optional(value[key], items => Array.isArray(items) && items.every(item => text(item, 200))))
    && ['allOf', 'anyOf', 'any', 'requiredChoices', 'requiredChoiceGroups'].every(key => optional(value[key], items => Array.isArray(items) && items.every(isHistoryRequirement)));
}

export function isValidScenario(value, { generated = false } = {}) {
  if (!isBoundedJson(value) || !isRecord(value) || !text(value.id, 200) || !value.id || !text(value.title, 500) || !value.title
    || !texts(value, ['date', 'description', 'narrative', 'actor', 'roleLabel', 'letterTarget', 'sourceNotes', 'banner', 'bannerNote', 'crisisFor', 'source', 'generatedAt', 'image', 'period_voice'])
    || !Array.isArray(value.choices) || value.choices.length > 12
    || !optional(value.turn, n => Number.isSafeInteger(n) && n >= 0 && n <= 10000)
    || !optional(value.advisors, advisors => isRecord(advisors) && Object.values(advisors).every(advice => text(advice)))
    || !optional(value.branches, branches => Array.isArray(branches) && branches.every(branch => isHistoryRequirement(branch) && optional(branch.minDivergence, n => number(n, 0, 1))))
    || !optional(value.primerTags, tags => Array.isArray(tags) && tags.every(tag => text(tag, 200)))) return false;
  const ids = new Set();
  if (!value.choices.every(choice => {
    if (!isRecord(choice) || !text(choice.id, 200) || !choice.id || ids.has(choice.id)
      || !text(choice.text) || !texts(choice, ['proposer', 'costDescription', 'consequence', 'successConsequence', 'failureConsequence', 'next'])
      || !['effects', 'successEffects', 'failureEffects'].every(key => optional(choice[key], isValidEffects))
      || !['minDivergence', 'maxDivergence', 'baseSuccessChance', 'successRate'].every(key => optional(choice[key], n => number(n, 0, 1)))
      || !optional(choice.requiresHistory, isHistoryRequirement)
      || !optional(choice.scoreCard, card => numericMap(card, -1000, 1000))) return false;
    ids.add(choice.id);
    return true;
  })) return false;
  if (generated) {
    if (value.choices.length !== 4 || !text(value.narrative) || !value.narrative.trim()) return false;
    const voices = new Set(value.choices.map(choice => choice.proposer));
    if (!['hotspur', 'fox', 'wolf'].every(voice => voices.has(voice))) return false;
    if (!value.choices.every(choice => ['hotspur', 'fox', 'wolf', 'sovereign'].includes(choice.proposer) && isValidEffects(choice.effects))) return false;
  }
  return isBoundedJson(value);
}
