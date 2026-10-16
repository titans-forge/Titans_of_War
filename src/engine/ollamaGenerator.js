/**
 * Titans of War — Real Ollama Procedural Generator
 *
 * Uses whatever chat model is actually installed in the local Ollama daemon
 * (discovered at runtime via /api/tags — never a hardcoded assumption).
 * Takes the current State Vector + optional letter sentiment and returns
 * a structured next crisis in the exact shape the UI expects.
 *
 * No new models are pulled. If Ollama is unreachable or has no models, the
 * caller cleanly falls back to the authored scripted scenarios.
 *
 * Future: Hook Aether WorldModel here for persistent campaign memory
 * (live assumptions, contradictions, and taste across an entire alternate-history run).
 * Example (commented — ready to wire):
 *   // import { AetherStore } from '../../aether/storage';
 *   // const store = new AetherStore();
 *   // const wm = store.get_or_create_world_model('titans_campaign_1861', 'civil_war_alt');
 *   // wm.anchor_assumption(ass_id);
 *   // wm.anchor_hypothesis(hyp_id);
 *   // wm.sync_from_taste(tasteProfile);
 *   // store.save_world_model(wm);
 * The generator can call Aether to load/save WorldModel state for a running campaign.
 */
import { STATIC_SCENARIOS } from '../game/scenarios.js';
import { divergenceTier, summarizeCabinetCrises, summarizePoliticalEconomy } from '../game/simulationEngine.js';
import { buildPrimerContextNote } from '../game/historicalPrimers.js';
import { isValidScenario, isRecord, text as isText } from '../game/archiveValidation.js';


const OLLAMA_BASE = 'http://localhost:11434';
const OLLAMA_GENERATE = `${OLLAMA_BASE}/api/generate`;
const OLLAMA_TAGS = `${OLLAMA_BASE}/api/tags`;

// Last-resort fallback only. We do NOT assume any specific model is installed —
// the UI should call listOllamaModels() and let the user pick what's actually present.
const FALLBACK_MODEL = 'llama3.2';

// Bound both fetch and body reading. Abort also settles callers if a transport ignores its signal.
async function requestJson(url, init, { signal, timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  let timer;
  let cancel;
  const stopped = new Promise((_, reject) => {
    cancel = () => { controller.abort(); reject(new DOMException('Request cancelled', 'AbortError')); };
    timer = setTimeout(() => { controller.abort(); reject(new Error('Local model request timed out')); }, timeoutMs);
    if (signal?.aborted) cancel();
    else signal?.addEventListener('abort', cancel, { once: true });
  });
  try {
    if (signal?.aborted) return await stopped;
    return await Promise.race([stopped, (async () => {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
      return response.json();
    })()]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

/**
 * Discover the models actually installed in the local Ollama daemon.
 * Returns { ok, models: string[], error } — never throws.
 * This replaces the old hardcoded model-name assumption that silently
 * failed (and fell back to canned scenarios) on every machine but one.
 */
export async function listOllamaModels(options = {}) {
  try {
    const data = await requestJson(OLLAMA_TAGS, { method: 'GET' }, { timeoutMs: 5000, ...options });
    const models = (Array.isArray(data?.models) ? data.models : []).slice(0, 1000)
      .map((m) => m?.name)
      .filter(name => isText(name, 200) && name.length > 0)
      // de-prioritise pure embedding models for chat/generation
      .filter((n) => !/embed/i.test(n));
    return { ok: true, models, error: null };
  } catch (err) {
    return { ok: false, models: [], error: err.message };
  }
}

const SYSTEM_PROMPT = `You are the Titans of War procedural scenario engine for an alternate-history American Civil War grand strategy game.

You receive the current State Vector and must generate the SINGLE next logical crisis/decision point.

Output MUST be valid JSON matching this exact schema (no extra text outside the JSON):
{
  "title": "Short dramatic title",
  "date": "Month Day, Year (e.g. June 25, 1862)",
  "narrative": "2-4 sentences of rich historical texture describing the situation, pressures, and stakes. Write in the voice of a 19th-century war correspondent.",
  "advisors": {
    "hotspur": "2 sentences of aggressive, attack-now advice from the Radical Attackers shard",
    "fox": "2 sentences of pragmatic, defensive, logistics-first advice from the Tactical Pragmatists shard",
    "wolf": "2 sentences of diplomatic, foreign-recognition, or cunning maneuver advice from the Diplomatic Strategists shard"
  },
  "choices": [
    {
      "id": "option_a",
      "text": "Bold, high-risk action (Hotspur flavor)",
      "proposer": "hotspur",
      "costDescription": "Short mechanical summary (e.g. 'Heavy Military Strength cost, high divergence')",
      "effects": {
        "metrics": { "militaryStrength": -20, "munitions": -15, "publicMorale": 15, "divergenceIndex": 0.08 },
        "shards": { "hotspur": 25, "fox": -15 }
      }
    },
    { ... similarly for option_b (fox), option_c (wolf), option_d (wild sovereign card) }
  ]
}

Rules:
- Every value inside effects.metrics is a DELTA applied to the current state, not a new absolute. Use small signed integers (typically -25 to +25 per metric).
- Current state metrics (militaryStrength, munitions, treasury, foodSupply, publicMorale) are clamped 0-100 after deltas apply.
- divergenceIndex deltas should be 0.03–0.15 per turn.
- The four advisors must feel distinct in voice. Choices MUST cover all three of hotspur, fox, and wolf among the first three, with option_d carrying proposer "sovereign".
- Use period-appropriate language. Frame consequences in terms of incentives, logistics, sectional interests, and structural realities of the 1861-1865 American war. Do not import modern academic vocabulary.
- If the player just wrote a letter, the tone of the crisis should subtly reflect the emotional/ideological state expressed in that letter.
- If cabinet crises are active or recently faced, the crisis must reflect those pressures through desertion, straggling, supply resistance, governor interference, bond panic, bread relief politics, or civilian-authority conflict appropriate to the unstable faction.
- Output ONLY the JSON object. No markdown, no explanations.`;

function buildCabinetPressureNote(state) {
  const crisisSummary = summarizeCabinetCrises(state);
  const active = crisisSummary.activeAtEnd.length
    ? crisisSummary.activeAtEnd.map((entry) => `${entry.label} ${entry.alignment}%`).join(', ')
    : 'none';
  const recentEntries = crisisSummary.entries.slice(-2).map((entry) => {
    const before = entry.crisisAlignmentBefore ?? 'n/a';
    const after = entry.crisisAlignmentAfter ?? 'n/a';
    return `Turn ${entry.turn}: ${entry.crisisLabel} (${entry.crisisResolved ? 'stabilized' : 'unresolved'}, alignment ${before} -> ${after})`;
  });

  if (!crisisSummary.faced && !crisisSummary.activeAtEnd.length) {
    return '\n\nCabinet pressure: no open faction crisis is currently destabilizing the war effort.';
  }

  return `\n\nCabinet pressure:\n- Crises faced: ${crisisSummary.faced}\n- Crises resolved: ${crisisSummary.resolved}\n- Active unstable factions: ${active}\n- Recent crisis record:\n${recentEntries.length ? recentEntries.map((entry) => `  - ${entry}`).join('\n') : '  - No prior cabinet sessions recorded.'}\nThese pressures should materially shape the next crisis rather than appearing as background flavor.`;
}

function buildFallbackCabinetNote(state) {
  const crisisSummary = summarizeCabinetCrises(state);
  const politicalEconomy = summarizePoliticalEconomy(state);
  if (crisisSummary.activeAtEnd.length) {
    return ` Cabinet pressure remains active from ${crisisSummary.activeAtEnd.map((entry) => `${entry.label} (${entry.alignment}%)`).join(', ')}. ${politicalEconomy.overview}`;
  }
  if (crisisSummary.faced) {
    return ` Cabinet crisis history so far: ${crisisSummary.faced} faced, ${crisisSummary.resolved} resolved. ${politicalEconomy.overview}`;
  }
  return ` ${politicalEconomy.overview}`;
}

function buildPoliticalEconomyNote(state) {
  const politicalEconomy = summarizePoliticalEconomy(state);
  return `\n\nPolitical economy:\n- ${politicalEconomy.summaryLines.join('\n- ')}\nDominant liabilities: ${politicalEconomy.dominantRisks.join(', ')}. Use these liabilities to shape cabinet pressure, scenario stakes, and the downstream consequences of inaction.`;
}

/**
 * Build the user prompt from current state + optional letter sentiment.
 * The optional activeScenario argument carries forward primer tags so the
 * model receives the same sourced ground-truth context the player can see
 * in the in-game Historical Context panel.
 */
function buildPrompt(state, letterSentiment = null, activeScenario = null) {
  const { metrics, shards, divergenceIndex, history, actor, roleLabel } = state;
  const divergenceState = divergenceTier(divergenceIndex);

  let letterNote = '';
  if (letterSentiment && !letterSentiment.skipped) {
    letterNote = `\n\nThe commander just sent a letter home. Sentiment analysis: tone="${letterSentiment.tone}", ideology="${letterSentiment.ideology}". This emotional/ideological state should color the next crisis.`;
  }

  const cabinetPressureNote = buildCabinetPressureNote(state);
  const politicalEconomyNote = buildPoliticalEconomyNote(state);
  const primerContextNote = activeScenario ? buildPrimerContextNote(activeScenario) : '';

  const recentHistory = (history || []).slice(-3).map((entry) => {
    const outcomeNote = typeof entry.choiceSucceeded === 'boolean'
      ? ` [${entry.choiceSucceeded ? 'success' : 'failure'}]`
      : '';
    const crisisNote = entry.crisisFor
      ? ` [cabinet: ${entry.crisisLabel} ${entry.crisisResolved ? 'stabilized' : 'still unstable'}]`
      : '';
    return `Turn ${entry.turn} (${entry.date}): ${entry.choiceText}${outcomeNote}${crisisNote} -> ${entry.consequence}`;
  }
  ).join('\n');

  return `Current State Vector:
Actor: ${actor} (${roleLabel})
Divergence from real history: ${(divergenceIndex * 100).toFixed(1)}% (${divergenceState.label})
Timeline note: ${divergenceState.note}
Resources: Military ${metrics.militaryStrength} | Munitions ${metrics.munitions} | Treasury ${metrics.treasury} | Food ${metrics.foodSupply} | Morale ${metrics.publicMorale}
Faction Shards: Hotspur=${shards.hotspur.alignment}%, Fox=${shards.fox.alignment}%, Wolf=${shards.wolf.alignment}%

Recent history:
${recentHistory || 'Campaign just beginning.'}

${cabinetPressureNote}

${politicalEconomyNote}
${primerContextNote}

${letterNote}

Generate the next crisis now.`;
}

/**
 * Call the local Ollama model with the State Vector and get structured JSON.
 * Falls back to a high-quality static mutation if Ollama is unreachable (keeps the game playable).
 */
export async function generateNextScenario(state, letterSentiment = null, model = FALLBACK_MODEL, activeScenario = null, options = {}) {
  const prompt = buildPrompt(state, letterSentiment, activeScenario);
  const startedAt = Date.now();

  try {
    if (!model) throw new Error('No local model selected');
    const data = await requestJson(OLLAMA_GENERATE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        system: SYSTEM_PROMPT,
        prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.75,
          top_p: 0.9,
          num_ctx: 4096,
        },
      }),
    }, options);
    let raw = data.response || '';
    if (!isText(raw, 100000)) throw new Error('Model response is too large or is not text');

    // Clean any accidental markdown or extra text
    raw = raw.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

    const parsed = JSON.parse(raw);

    // Basic schema validation / repair
    if (!isRecord(parsed) || !isText(parsed.title, 500) || !parsed.title.trim() || !Array.isArray(parsed.choices) || parsed.choices.length !== 4) {
      throw new Error('Model returned malformed scenario');
    }

    // The Python contributor validator (tools/agents/validators.py) requires
    // 3+ choice scenarios to cover hotspur, fox, and wolf. Mirror that rule
    // here so a misbehaving local model cannot smuggle four identical
    // advisor voices into the live game.
    const proposers = new Set(parsed.choices.map((choice) => choice?.proposer));
    if (!['hotspur', 'fox', 'wolf'].every((voice) => proposers.has(voice))) {
      throw new Error('Generated scenario missing required hotspur/fox/wolf voices');
    }

    // Ensure every choice has effects (defensive)
    parsed.choices.forEach(c => {
      c.effects = c.effects || { metrics: {}, shards: {} };
    });

    // Stable identifiers so chronicleExporter, classifyCampaignEnding, and
    // replay determinism can recognize a generated turn rather than silently
    // keep the previous scenarioId in state.
    parsed.id = parsed.id || `gen_${state.seed}_${state.currentTurn}`;
    parsed.actor = parsed.actor || state.actor;
    parsed.roleLabel = parsed.roleLabel || state.roleLabel;
    parsed.letterTarget = parsed.letterTarget || 'your wife';
    // Rubric honesty: a generated turn is not a sourced historical claim.
    parsed.sourceNotes = parsed.sourceNotes
      || 'Procedurally generated by the local model. Not a sourced historical claim; treat as counterfactual extension of the campaign.';
    if (!isValidScenario(parsed, { generated: true })) throw new Error('Model returned invalid scenario fields');

    // Real telemetry from Ollama's response (no fabricated numbers).
    const telemetry = {
      model,
      latencyMs: Date.now() - startedAt,
      promptTokens: data.prompt_eval_count ?? null,
      outputTokens: data.eval_count ?? null,
      tokensPerSec: data.eval_count && data.eval_duration
        ? +(data.eval_count / (data.eval_duration / 1e9)).toFixed(1)
        : null,
    };

    return {
      ...parsed,
      source: `ollama:${model}`,
      live: true,
      telemetry,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    if (options.signal?.aborted) throw err;
    console.warn('[Titans of War] Ollama generation unavailable, using scripted scenario:', err.message);

    // Honest offline fallback: this is the authored scenario for the turn, not AI output.
    const branchedScenario = state.nextScenarioId
      ? STATIC_SCENARIOS.find((scenario) => scenario.id === state.nextScenarioId)
      : null;
    const currentScenario = activeScenario?.id === state.scenarioId && isValidScenario(activeScenario)
      ? activeScenario
      : STATIC_SCENARIOS.find((scenario) => scenario.id === state.scenarioId);
    const base = branchedScenario
      || currentScenario
      || STATIC_SCENARIOS.find((scenario) => scenario.turn === state.currentTurn)
      || STATIC_SCENARIOS[STATIC_SCENARIOS.length - 1];

    const divergence = (state.divergenceIndex || 0) * 100;
    const sentimentNote = letterSentiment
      ? ` The commander’s recent letter (${letterSentiment.tone}, ${letterSentiment.ideology}) colors the mood of the army and cabinet.`
      : '';
    const cabinetNote = buildFallbackCabinetNote(state);

    // Preserve the authored period-fidelity prose untouched. The banner and
    // bannerNote fields carry the cabinet/sentiment context without rewriting
    // the original description that the UI is about to render.
    return {
      ...base,
      banner: `[offline] ${base.title}`,
      bannerNote: `${sentimentNote}${cabinetNote} Timeline divergence stands at ${divergence.toFixed(0)}%.`,
      source: 'fallback:scripted',
      live: false,
      telemetry: { model, latencyMs: Date.now() - startedAt, reason: err.message },
      generatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Classify a player's letter through the local model (real inference).
 * Returns { tone, ideology, rationale, moraleMod, strengthMod, source } or null.
 * Falls back to the offline keyword heuristic if Ollama is unreachable, and
 * labels the source honestly so the UI never claims "Gemma" when it was keywords.
 */
const SENTIMENT_SYSTEM = `You classify a 19th-century military commander's personal letter home.
Return ONLY JSON: {"tone":"Heartfelt|Resolute|Melancholic","ideology":"Diplomatic|Practical|Radical","rationale":"one short sentence"}.
Heartfelt = warm/affectionate, Resolute = stoic/duty-bound, Melancholic = fearful/despairing.`;

export async function classifyLetterSentiment(text, model = FALLBACK_MODEL, options = {}) {
  const clean = (text || '').trim();
  if (!clean) return null;

  try {
    const data = await requestJson(OLLAMA_GENERATE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        system: SENTIMENT_SYSTEM,
        prompt: `Letter:\n"""${clean}"""\n\nClassify it now.`,
        stream: false,
        format: 'json',
        options: { temperature: 0.2, num_ctx: 2048 },
      }),
    }, options);
    if (!isText(data.response, 16000)) throw new Error('Invalid letter response');
    const parsed = JSON.parse((data.response || '').trim());
    if (!isRecord(parsed) || !['Heartfelt', 'Resolute', 'Melancholic', 'Standard Brief'].includes(parsed.tone)
      || !['Diplomatic', 'Practical', 'Radical', 'Balanced'].includes(parsed.ideology)
      || !isText(parsed.rationale)) throw new Error('Invalid letter classification');

    const tone = parsed.tone || 'Standard Brief';
    const moraleMod = tone === 'Heartfelt' ? +5 : tone === 'Melancholic' ? -10 : tone === 'Resolute' ? -5 : 0;
    const strengthMod = tone === 'Resolute' ? +5 : 0;

    return {
      tone,
      ideology: parsed.ideology || 'Balanced',
      rationale: parsed.rationale || '',
      moraleMod,
      strengthMod,
      description: `${model} read this as ${tone.toLowerCase()} (${parsed.ideology || 'balanced'}). ${moraleMod >= 0 ? '+' : ''}${moraleMod} Morale${strengthMod ? `, +${strengthMod} Military` : ''}.`,
      source: `ollama:${model}`,
    };
  } catch (err) {
    return { error: err.message, source: 'fallback:keywords' };
  }
}
