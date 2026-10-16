import { mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import { createFreshCampaignState } from '../src/game/campaignStorage.js';
import { buildCampaignChronicle } from '../src/game/chronicleExporter.js';
import { DEFAULT_MAX_DECISIONS, runHeadlessCampaignAsync } from '../src/game/headlessCampaign.js';
import { CAMPAIGN_FINAL_TURN, summarizePoliticalEconomy } from '../src/game/simulationEngine.js';

const OLLAMA_BASE = 'http://localhost:11434';
const OLLAMA_GENERATE = `${OLLAMA_BASE}/api/generate`;
const OLLAMA_TAGS = `${OLLAMA_BASE}/api/tags`;
const DEFAULT_POLICIES = ['balanced', 'hotspur', 'fox', 'wolf'];
const DEFAULT_SEEDS = [1861, 1862, 1863];

const DECISION_SYSTEM_PROMPT = `You are judging one turn of an alternate-history American Civil War strategy simulation.

Choose the single option that best maximizes the campaign's long-run report card:
- Tactical Smarts: sound battlefield decisions, preservation of armies, and correct operational timing
- Strategic Brilliance: political, logistical, diplomatic, food, treasury, and cabinet judgment
- Timeline Fidelity: staying closer to the historical chronology unless divergence is worth the cost
- survival to an actual campaign ending (${CAMPAIGN_FINAL_TURN} chronological stages, with additional interlude decisions)

Return ONLY valid JSON matching this schema:
{"choiceId":"option_a","rationale":"One concise sentence."}

Never invent option ids. Choose only from the options provided.`;

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function parseList(value) {
  return (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseNumberList(value) {
  return parseList(value)
    .map((entry) => Number.parseInt(entry, 10))
    .filter((entry) => Number.isFinite(entry));
}

export function parseArgs(argv) {
  const options = {
    help: false,
    policies: [...DEFAULT_POLICIES],
    models: [],
    useInstalledModels: false,
    seeds: [...DEFAULT_SEEDS],
    maxTurns: DEFAULT_MAX_DECISIONS,
    outputPath: '',
    markdownOutputPath: '',
    markdown: false,
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--policies':
        options.policies = parseList(argv[index + 1]);
        index += 1;
        break;
      case '--models': {
        const value = argv[index + 1] || '';
        if (value === 'installed') {
          options.useInstalledModels = true;
          options.models = [];
        } else {
          options.models = parseList(value);
        }
        index += 1;
        break;
      }
      case '--seeds':
        options.seeds = parseNumberList(argv[index + 1]);
        index += 1;
        break;
      case '--max-turns':
      case '--max-decisions':
        options.maxTurns = Number(argv[index + 1]);
        index += 1;
        break;
      case '--out':
        options.outputPath = argv[index + 1] || '';
        index += 1;
        break;
      case '--out-md':
        options.markdownOutputPath = argv[index + 1] || '';
        index += 1;
        break;
      case '--markdown':
        options.markdown = true;
        break;
      case '--json':
        options.json = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.policies.length && !options.models.length && !options.useInstalledModels) {
    options.policies = [...DEFAULT_POLICIES];
  }

  if (!options.seeds.length) {
    options.seeds = [...DEFAULT_SEEDS];
  }

  if (!Number.isSafeInteger(options.maxTurns) || options.maxTurns < 1) {
    throw new Error('--max-decisions / --max-turns must be a positive integer');
  }

  return options;
}

function printHelp() {
  console.log(`Titans of War benchmark engine

Usage:
  node scripts/benchmark-engine.mjs [options]

Options:
  --policies balanced,hotspur,fox,wolf   Heuristic contestants to run
  --models gemma4:12b-it,qwen2.5:7b      Local Ollama models to benchmark as decision selectors
  --models installed                     Benchmark every installed local Ollama chat model
  --seeds 1861,1862,1863                 Campaign seeds to evaluate
  --max-decisions ${DEFAULT_MAX_DECISIONS}                    Decision cap per run (default ${DEFAULT_MAX_DECISIONS})
  --max-turns N                          Compatibility alias for --max-decisions
  --out benchmark/latest.json            Save full benchmark payload to disk
  --out-md benchmark/latest.md           Save a markdown leaderboard to disk
  --markdown                             Print markdown instead of the console table
  --json                                 Print JSON instead of a table
  --help                                 Show this help text
`);
}

async function loadScenarioCatalog() {
  const viteServer = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { middlewareMode: true },
    appType: 'custom'
  });

  try {
    const scenarioModule = await viteServer.ssrLoadModule('/src/game/scenarios.js');
    return scenarioModule.STATIC_SCENARIOS || [];
  } finally {
    await viteServer.close();
  }
}

async function listInstalledModels() {
  try {
    const response = await fetch(OLLAMA_TAGS, { method: 'GET' });
    if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
    const data = await response.json();
    return (data.models || [])
      .map((entry) => entry.name)
      .filter(Boolean)
      .filter((name) => !/embed/i.test(name));
  } catch (error) {
    throw new Error(`Unable to list local Ollama models: ${error.message}`);
  }
}

function mergeWeightedEffects(target, effects, weight) {
  Object.entries(effects || {}).forEach(([key, value]) => {
    target[key] = (target[key] || 0) + (value * weight);
  });
}

function getExpectedEffects(choice) {
  if (choice.successRate === undefined) {
    return choice.effects || { metrics: {}, shards: {} };
  }

  const successWeight = Math.max(0, Math.min(1, choice.successRate));
  const failureWeight = 1 - successWeight;
  const successEffects = choice.successEffects || choice.effects || { metrics: {}, shards: {} };
  const failureEffects = choice.failureEffects || { metrics: { militaryStrength: -20, publicMorale: -15 }, shards: {} };
  const metrics = {};
  const shards = {};

  mergeWeightedEffects(metrics, successEffects.metrics, successWeight);
  mergeWeightedEffects(metrics, failureEffects.metrics, failureWeight);
  mergeWeightedEffects(shards, successEffects.shards, successWeight);
  mergeWeightedEffects(shards, failureEffects.shards, failureWeight);

  return { metrics, shards };
}

function baselineChoiceScore(state, scenario, choice) {
  const expected = getExpectedEffects(choice);
  const projectedMetrics = {
    militaryStrength: clamp((state.metrics?.militaryStrength || 0) - 5 + (expected.metrics?.militaryStrength || 0)),
    munitions: clamp((state.metrics?.munitions || 0) - 5 + (expected.metrics?.munitions || 0)),
    treasury: clamp((state.metrics?.treasury || 0) - 5 + (expected.metrics?.treasury || 0)),
    foodSupply: clamp((state.metrics?.foodSupply ?? 50) - 2 + (expected.metrics?.foodSupply || 0)),
    publicMorale: clamp((state.metrics?.publicMorale || 0) + (expected.metrics?.publicMorale || 0))
  };
  const projectedDivergence = Math.max(0, Math.min(1, (state.divergenceIndex || 0) + (expected.metrics?.divergenceIndex || 0)));

  let score = 0;
  score += projectedMetrics.militaryStrength * 2.4;
  score += projectedMetrics.publicMorale * 2.2;
  score += projectedMetrics.munitions * 1.8;
  score += projectedMetrics.foodSupply * 1.7;
  score += projectedMetrics.treasury * 1.6;

  if (projectedDivergence > 0.45) {
    score -= (projectedDivergence - 0.45) * 180;
  } else {
    score += projectedDivergence * 15;
  }

  for (const [shardKey, shard] of Object.entries(state.shards || {})) {
    const projectedAlignment = clamp((shard.alignment || 0) + (expected.shards?.[shardKey] || 0));
    if ((shard.alignment || 0) < 30 && projectedAlignment >= 30) {
      score += 70;
    }
    if (projectedAlignment < 30) {
      score -= (30 - projectedAlignment) * 5;
    }
    score += (projectedAlignment - (shard.alignment || 0)) * 0.9;
  }

  if (scenario?.crisisFor) {
    const currentAlignment = state.shards?.[scenario.crisisFor]?.alignment || 0;
    const projectedAlignment = clamp(currentAlignment + (expected.shards?.[scenario.crisisFor] || 0));
    score += projectedAlignment >= 30 ? 120 : projectedAlignment;
  }

  return score;
}

function pickPolicyChoice(policy, state, scenario) {
  const choices = Array.isArray(scenario?.choices) ? scenario.choices : [];
  if (!choices.length) return null;

  const scored = choices.map((choice) => {
    const expected = getExpectedEffects(choice);
    let score = baselineChoiceScore(state, scenario, choice);

    if (policy === 'hotspur') {
      score += choice.proposer === 'hotspur' ? 45 : 0;
      score += (expected.metrics?.publicMorale || 0) * 2.2;
      score += (expected.metrics?.foodSupply || 0) * 0.5;
      score += (expected.metrics?.divergenceIndex || 0) * 120;
      score -= Math.max(0, -(expected.metrics?.militaryStrength || 0)) * 0.6;
    }

    if (policy === 'fox') {
      score += choice.proposer === 'fox' ? 45 : 0;
      score += (expected.metrics?.munitions || 0) * 2.2;
      score += (expected.metrics?.treasury || 0) * 1.5;
      score += (expected.metrics?.foodSupply || 0) * 2;
      score -= (expected.metrics?.divergenceIndex || 0) * 120;
    }

    if (policy === 'wolf') {
      score += choice.proposer === 'wolf' ? 45 : 0;
      score += (expected.metrics?.treasury || 0) * 1.8;
      score += (expected.metrics?.foodSupply || 0);
      score += (expected.metrics?.divergenceIndex || 0) * 80;
      score += (expected.shards?.wolf || 0) * 2.5;
    }

    return { choice, score };
  });

  scored.sort((left, right) => right.score - left.score);
  return scored[0]?.choice || choices[0];
}

function buildModelDecisionPrompt(state, scenario) {
  const history = (state.history || []).slice(-2).map((entry) => {
    const crisisNote = entry.crisisFor ? ` | crisis: ${entry.crisisLabel} (${entry.crisisResolved ? 'resolved' : 'unresolved'})` : '';
    return `Turn ${entry.turn}: ${entry.choiceText} -> ${entry.consequence}${crisisNote}`;
  }).join('\n');
  const unstableFactions = Object.entries(state.shards || {})
    .filter(([, shard]) => (shard.alignment || 0) < 30)
    .map(([, shard]) => `${shard.name} ${shard.alignment}%`)
    .join(', ');
  const choices = (scenario.choices || []).map((choice) => {
    const directEffects = choice.successRate === undefined
      ? choice.effects
      : getExpectedEffects(choice);
    const metrics = Object.entries(directEffects?.metrics || {})
      .map(([key, value]) => `${key} ${value >= 0 ? '+' : ''}${value}`)
      .join(', ') || 'no direct metric change';
    const shards = Object.entries(directEffects?.shards || {})
      .map(([key, value]) => `${key} ${value >= 0 ? '+' : ''}${value}`)
      .join(', ') || 'no shard shift';
    return `- ${choice.id}: proposer=${choice.proposer}; text=${choice.text}; cost=${choice.costDescription || 'n/a'}; expected effects=${metrics}; expected shard effects=${shards}`;
  }).join('\n');

  return `Campaign seed: ${state.seed}\nTurn: ${state.currentTurn}\nActor: ${state.actor} (${state.roleLabel})\nScenario: ${scenario.title}\nDescription: ${scenario.description}\nResources: military ${state.metrics.militaryStrength}, munitions ${state.metrics.munitions}, treasury ${state.metrics.treasury}, food ${state.metrics.foodSupply}, morale ${state.metrics.publicMorale}\nDivergence: ${(state.divergenceIndex * 100).toFixed(1)}%\nUnstable factions: ${unstableFactions || 'none'}\nRecent history:\n${history || 'Campaign just beginning.'}\n\nOptions:\n${choices}\n\nChoose the option id that best preserves long-run strategic stability.`;
}

async function chooseWithModel(model, state, scenario) {
  const fallbackChoice = pickPolicyChoice('balanced', state, scenario);
  if (!fallbackChoice) return null;

  try {
    const response = await fetch(OLLAMA_GENERATE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        system: DECISION_SYSTEM_PROMPT,
        prompt: buildModelDecisionPrompt(state, scenario),
        stream: false,
        format: 'json',
        options: {
          temperature: 0.2,
          top_p: 0.9,
          num_ctx: 4096
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
    }

    const data = await response.json();
    const parsed = JSON.parse((data.response || '').trim());
    const selected = scenario.choices.find((choice) => choice.id === parsed.choiceId);
    return selected?.id || fallbackChoice.id;
  } catch {
    return fallbackChoice.id;
  }
}

export function createContestants(options, models = []) {
  const policyContestants = options.policies.map((policy) => ({
    label: `policy:${policy}`,
    type: 'policy',
    chooseChoice: ({ state, scenario }) => pickPolicyChoice(policy, state, scenario)?.id || null
  }));

  const modelContestants = models.map((model) => ({
    label: `model:${model}`,
    type: 'model',
    chooseChoice: ({ state, scenario }) => chooseWithModel(model, state, scenario)
  }));

  return [...policyContestants, ...modelContestants];
}

export async function benchmarkContestant(contestant, scenarios, seeds, maxTurns = DEFAULT_MAX_DECISIONS) {
  const runs = [];

  for (const seed of seeds) {
    const initialState = createFreshCampaignState(seed, scenarios.find((scenario) => scenario.turn === 1)?.id || scenarios[0]?.id || null);
    const result = await runHeadlessCampaignAsync({
      scenarios,
      initialState,
      chooseChoice: contestant.chooseChoice,
      maxTurns
    });

    runs.push({
      seed,
      turnsPlayed: result.turns.length,
      total: result.campaignScore.total,
      grade: result.campaignScore.grade,
      commandScore: result.campaignScore.commandScore,
      commandGrade: result.campaignScore.commandGrade,
      survived: result.campaignScore.survived,
      decisionsMade: result.decisionsMade,
      chronologicalStage: result.chronologicalStage,
      endingReached: result.endingReached,
      capped: result.capped,
      stopReason: result.stopReason,
      outcome: result.endingReached
        ? result.campaignScore.survived ? 'survived' : 'defeat'
        : result.capped ? 'capped' : 'incomplete',
      completedRequestedTurns: result.turns.length >= maxTurns,
      endingClass: result.campaignScore.endingClass,
      divergence: Number((result.campaignScore.divergence || 0).toFixed(3)),
      crisesFaced: result.campaignScore.crisisSummary.faced,
      crisesResolved: result.campaignScore.crisisSummary.resolved,
      history: result.finalState.history,
      finalState: result.finalState,
    });
  }

  const rankedRuns = [...runs].sort((left, right) => right.total - left.total || right.turnsPlayed - left.turnsPlayed);
  const bestRun = rankedRuns[0] || null;
  const worstRun = rankedRuns[rankedRuns.length - 1] || null;
  const representativeChronicle = bestRun
    ? buildCampaignChronicle(bestRun.finalState, {
        title: `Titans of War — ${contestant.label} Representative Chronicle`,
        subtitle: 'Headless Benchmark Representative Run',
        mediaEmbedFormat: 'markdown',
        includeMediaEmbeds: false,
        filename: `${contestant.label.replace(/[^a-z0-9]+/gi, '_')}_representative_chronicle.md`,
      })
    : null;
  const representativePoliticalEconomy = bestRun
    ? summarizePoliticalEconomy(bestRun.finalState)
    : null;
  const endedRuns = runs.filter((run) => run.endingReached);
  const outcomeCounts = Object.fromEntries(['survived', 'defeat', 'capped', 'incomplete'].map(
    (outcome) => [outcome, runs.filter((run) => run.outcome === outcome).length],
  ));

  return {
    label: contestant.label,
    type: contestant.type,
    runs: runs.map(({ finalState, ...run }) => run),
    averageScore: Math.round(runs.reduce((sum, run) => sum + run.total, 0) / runs.length),
    averageCommandScore: Math.round(runs.reduce((sum, run) => sum + run.commandScore, 0) / runs.length),
    averageDivergence: +(runs.reduce((sum, run) => sum + run.divergence, 0) / runs.length).toFixed(3),
    outcomeCounts,
    survivalRate: endedRuns.length ? +(outcomeCounts.survived / endedRuns.length).toFixed(2) : null,
    survivalRateDenominator: 'ended-runs',
    endingRate: +(endedRuns.length / runs.length).toFixed(2),
    defeatRate: +(outcomeCounts.defeat / runs.length).toFixed(2),
    cappedRate: +(outcomeCounts.capped / runs.length).toFixed(2),
    incompleteRate: +(outcomeCounts.incomplete / runs.length).toFixed(2),
    // Compatibility only: reaching a requested cap is not a campaign completion.
    capCompletionRate: +(runs.filter((run) => run.completedRequestedTurns).length / runs.length).toFixed(2),
    averageCrisesFaced: +(runs.reduce((sum, run) => sum + run.crisesFaced, 0) / runs.length).toFixed(2),
    averageCrisesResolved: +(runs.reduce((sum, run) => sum + run.crisesResolved, 0) / runs.length).toFixed(2),
    representativeRun: bestRun
      ? {
          seed: bestRun.seed,
          total: bestRun.total,
          grade: bestRun.grade,
          commandScore: bestRun.commandScore,
          commandGrade: bestRun.commandGrade,
          outcome: bestRun.outcome,
          stopReason: bestRun.stopReason,
          endingClass: bestRun.endingClass,
          divergence: bestRun.divergence,
          turnsPlayed: bestRun.turnsPlayed,
          summary: representativeChronicle.summary,
          chronicleMarkdown: representativeChronicle.markdown,
          politicalEconomyOverview: representativePoliticalEconomy?.overview || '',
          dominantPoliticalRisks: representativePoliticalEconomy?.dominantRisks || [],
          strongestDecisionExcerpt: formatDecisionExcerpt(bestRun.history, true),
          weakestDecisionExcerpt: formatDecisionExcerpt(worstRun?.history || [], false),
        }
      : null,
  };
}

function formatPercent(value) {
  return value === null ? 'n/a' : `${Math.round(value * 100)}%`;
}

function pad(value, width) {
  return String(value).padEnd(width, ' ');
}

export function formatTable(results, options) {
  const header = [
    pad('Contestant', 28),
    pad('Type', 8),
    pad('Composite', 10),
    pad('Command', 8),
    pad('Survival*', 10),
    pad('Ended', 8),
    pad('Defeat', 8),
    pad('Capped', 8),
    pad('Incomplete', 10),
    pad('Avg Div', 9),
    pad('Crises', 12)
  ].join(' ');
  const separator = '-'.repeat(header.length);
  const rows = results.map((result) => [
    pad(result.label, 28),
    pad(result.type, 8),
    pad(result.averageScore, 10),
    pad(result.averageCommandScore, 8),
    pad(formatPercent(result.survivalRate), 10),
    pad(formatPercent(result.endingRate), 8),
    pad(formatPercent(result.defeatRate), 8),
    pad(formatPercent(result.cappedRate), 8),
    pad(formatPercent(result.incompleteRate), 10),
    pad(result.averageDivergence.toFixed(3), 9),
    pad(`${result.averageCrisesResolved}/${result.averageCrisesFaced}`, 12)
  ].join(' '));

  return [
    'Titans of War benchmark results',
    `Seeds: ${options.seeds.join(', ')} | decision cap: ${options.maxTurns}`,
    '* Survival is among ended runs only (n/a when none ended). Other rates use all runs.',
    'Composite /1000 and Command /100 include provisional scores for unfinished runs; ranked by composite.',
    '',
    header,
    separator,
    ...rows
  ].join('\n');
}

function formatDecisionExcerpt(history, preferSuccess) {
  const entries = Array.isArray(history) ? history : [];
  const chosen = preferSuccess
    ? entries.find((entry) => entry.choiceSucceeded === true) || entries[entries.length - 1]
    : entries.find((entry) => entry.choiceSucceeded === false) || entries[0];

  if (!chosen) {
    return 'No decision excerpt recorded.';
  }

  const outcome = chosen.choiceSucceeded === undefined || chosen.choiceSucceeded === null
    ? 'resolved'
    : chosen.choiceSucceeded ? 'succeeded' : 'failed';
  return `Turn ${chosen.turn} — ${chosen.scenarioTitle}: "${chosen.choiceText}" (${outcome}). ${chosen.consequence}`;
}

export function formatMarkdown(results, options, generatedAt) {
  const lines = [
    '# Titans of War Benchmark League',
    '',
    `*Generated:* ${generatedAt}`,
    `*Seeds:* ${options.seeds.join(', ')} | *Decision cap:* ${options.maxTurns}`,
    'Survival is among ended runs only (n/a when none ended). Other rates use all runs.',
    'Composite /1000 and Command /100 include provisional scores for unfinished runs; ranked by composite.',
    '',
    '| Rank | Contestant | Type | Composite | Command | Survival | Ended | Defeat | Capped | Incomplete | Avg Div | Crises |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
  ];

  results.forEach((result, index) => {
    lines.push(`| ${index + 1} | ${result.label} | ${result.type} | ${result.averageScore} | ${result.averageCommandScore} | ${formatPercent(result.survivalRate)} | ${formatPercent(result.endingRate)} | ${formatPercent(result.defeatRate)} | ${formatPercent(result.cappedRate)} | ${formatPercent(result.incompleteRate)} | ${result.averageDivergence.toFixed(3)} | ${result.averageCrisesResolved}/${result.averageCrisesFaced} |`);
  });

  lines.push('');
  lines.push('## Contestant Summaries');
  lines.push('');

  results.forEach((result, index) => {
    const representative = result.representativeRun;
    lines.push(`### ${index + 1}. ${result.label}`);
    if (!representative) {
      lines.push('No representative run available.');
      lines.push('');
      return;
    }
    lines.push(representative.summary);
    lines.push('');
    lines.push(`- Representative seed: ${representative.seed}`);
    lines.push(`- Run outcome: ${representative.outcome} (${representative.stopReason})`);
    lines.push(`- Political economy: ${representative.politicalEconomyOverview}`);
    lines.push(`- Dominant liabilities: ${representative.dominantPoliticalRisks.join(', ') || 'none'}`);
    lines.push(`- Strongest decision excerpt: ${representative.strongestDecisionExcerpt}`);
    lines.push(`- Weakest decision excerpt: ${representative.weakestDecisionExcerpt}`);
    lines.push('');
  });

  return lines.join('\n');
}

async function writeOutputFile(outputPath, payload) {
  const resolvedPath = resolve(process.cwd(), outputPath);
  mkdirSync(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, JSON.stringify(payload, null, 2), 'utf8');
  return resolvedPath;
}

async function writeTextOutputFile(outputPath, text) {
  const resolvedPath = resolve(process.cwd(), outputPath);
  mkdirSync(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, text, 'utf8');
  return resolvedPath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const scenarios = await loadScenarioCatalog();
  if (!scenarios.length) {
    throw new Error('No scenarios were loaded for benchmarking');
  }

  const models = options.useInstalledModels
    ? await listInstalledModels()
    : options.models;
  const contestants = createContestants(options, models);
  if (!contestants.length) {
    throw new Error('No benchmark contestants selected');
  }

  const results = [];
  for (const contestant of contestants) {
    results.push(await benchmarkContestant(contestant, scenarios, options.seeds, options.maxTurns));
  }
  results.sort((left, right) => right.averageScore - left.averageScore);

  const generatedAt = new Date().toISOString();
  const markdown = formatMarkdown(results, options, generatedAt);

  const payload = {
    generatedAt,
    seeds: options.seeds,
    maxTurns: options.maxTurns,
    maxDecisions: options.maxTurns,
    survivalRateDenominator: 'ended-runs',
    contestants: results
  };

  if (options.outputPath) {
    payload.outputPath = await writeOutputFile(options.outputPath, payload);
  }

  if (options.markdownOutputPath) {
    payload.markdownOutputPath = await writeTextOutputFile(options.markdownOutputPath, markdown);
  }

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (options.markdown) {
    console.log(markdown);
    if (payload.markdownOutputPath) {
      console.log(`\nSaved benchmark markdown to ${payload.markdownOutputPath}`);
    }
    if (payload.outputPath) {
      console.log(`Saved benchmark payload to ${payload.outputPath}`);
    }
    return;
  }

  console.log(formatTable(results, options));
  if (payload.outputPath) {
    console.log(`\nSaved benchmark payload to ${payload.outputPath}`);
  }
  if (payload.markdownOutputPath) {
    console.log(`Saved benchmark markdown to ${payload.markdownOutputPath}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`[benchmark] ${error.message}`);
    process.exitCode = 1;
  });
}
