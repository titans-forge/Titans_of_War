import { PRACTICE_BATTLES } from './battles.js';

const MONTHS = 'January February March April May June July August September October November December'.split(' ');

function normalizeSearch(value) {
  return value.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function battleDate(date) {
  // Ranged dates use the first day, including ranges that cross a month.
  const match = /^(\w+) (\d{1,2})\b.*\b(\d{4})$/.exec(date);
  const month = match ? MONTHS.indexOf(match[1]) + 1 : 0;
  if (!month) return { year: 'Other dates', order: Number.MAX_SAFE_INTEGER };
  const [, , day, year] = match;
  return { year, order: Number(year) * 10000 + month * 100 + Number(day) };
}

export function groupPracticeBattles(scenarios, search = '') {
  const scenarioById = new Map(scenarios.map(scenario => [scenario.id, scenario]));
  const terms = normalizeSearch(search).split(' ').filter(Boolean);
  const entries = [];
  for (const battle of Object.values(PRACTICE_BATTLES)) {
    const campaignScenario = scenarioById.get(battle.scenarioId);
    if (!campaignScenario) continue;
    const choices = battle.practiceChoices ?? campaignScenario.choices;
    if (!choices?.length) continue;
    const searchable = normalizeSearch([battle.title, battle.date, battle.context, campaignScenario.title].join(' '));
    if (!terms.every(term => searchable.includes(term))) continue;
    const defaultChoice = battle.practiceChoices ? choices[0] : choices.find(choice => choice.id === 'option_b') ?? choices[0];
    entries.push({ battle, scenario: { ...campaignScenario, choices }, defaultChoice, ...battleDate(battle.date) });
  }
  entries.sort((a, b) => a.order - b.order || a.battle.title.localeCompare(b.battle.title));
  const groups = new Map();
  for (const entry of entries) {
    if (!groups.has(entry.year)) groups.set(entry.year, []);
    groups.get(entry.year).push(entry);
  }
  return [...groups];
}
