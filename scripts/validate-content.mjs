/**
 * Titans of War — Content Validator
 *
 * Validates all authored scenarios against structural, semantic, and
 * mechanical constraints. Run as part of `npm test` to catch authoring
 * mistakes before they silently corrupt campaign runs.
 *
 * Usage:
 *   node scripts/validate-content.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';

// ── Allowed values ────────────────────────────────────────────────────────────

const VALID_PROPOSERS = new Set(['hotspur', 'fox', 'wolf', 'sovereign']);
const VALID_METRIC_KEYS = new Set([
  'militaryStrength', 'munitions', 'treasury', 'foodSupply', 'publicMorale', 'divergenceIndex',
]);
const VALID_SHARD_KEYS = new Set(['hotspur', 'fox', 'wolf']);
const VALID_CROP_MODES = new Set(['wide', 'portrait', 'contain']);
const VALID_TOPOGRAPHY_TYPES = new Set(['contours', 'harbor-fort', 'trench-crater', 'forest-fire']);
const VALID_CONTOUR_SHAPES = new Set(['arc', 'ellipse']);
const VALID_MANEUVER_KEYS = new Set(['option_a', 'option_b', 'option_c', 'option_d']);
const VALID_PROVENANCE_STATUSES = new Set(['verified', 'needs-review']);
const VALID_HISTORICAL_MEDIA = new Set(['period-photo', 'period-art', 'modern-photo', 'reenactment', 'generated-art', 'map', 'unknown']);
const VALID_ASSET_ROLES = new Set(['theater', 'tactical-underlay', 'card', 'chronicle']);
const VALID_AUDIO_TYPES = new Set(['music', 'ambient']);
const VALID_AUDIO_LICENSE_STATUSES = new Set(['verified-public-domain', 'verified-cc0', 'verified-free-license', 'recording-needed']);
const VALID_SCORE_CARD_KEYS = new Set(['tactical', 'strategic']);
const PRIMER_REQUIRED_FIELDS = new Set([
  'id', 'topic', 'summary', 'period_voice', 'power_analysis', 'complexity_note', 'sourceNotes', 'relatedScenarios',
]);
const REQUIRED_LATE_WAR_SPINE = new Map([
  [17, ['new_market']],
  [18, ['cold_harbor']],
  [19, ['atlanta_election_pressure']],
  [20, ['petersburg_siege']],
  [21, ['fall_of_atlanta']],
  [22, ['third_winchester']],
  [23, ['cedar_creek']],
  [24, ['election_1864_lincoln', 'election_1864_mcclellan']],
  [25, ['black_confederate_debate']],
  [26, ['five_forks']],
  [27, ['richmond_evacuation']],
  [28, ['appomattox_decision', 'southern_independence_1864', 'greensboro_convention']],
]);

const MAX_METRIC_DELTA = 85;        // absolute delta cap for non-divergence metrics (end-game scenarios are intentionally extreme)
const MAX_DIVERGENCE_DELTA = 0.65;  // absolute delta cap for divergenceIndex (Appomattox / Gettysburg can reach 0.6)
const MAP_PADDING = 80;
const ROOT = process.cwd();

// ── Loader ────────────────────────────────────────────────────────────────────

async function loadAuthoringSurface() {
  const viteServer = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  });
  try {
    const [scenarioMod, mediaMod, mapMod, audioMod, primerMod] = await Promise.all([
      viteServer.ssrLoadModule('/src/game/scenarios.js'),
      viteServer.ssrLoadModule('/src/game/mediaCatalog.js'),
      viteServer.ssrLoadModule('/src/game/mapAnnotations.js'),
      viteServer.ssrLoadModule('/src/game/audioCatalog.js'),
      viteServer.ssrLoadModule('/src/game/historicalPrimers.js'),
    ]);

    return {
      scenarios: scenarioMod.STATIC_SCENARIOS || [],
      mediaCatalog: mediaMod.MEDIA_CATALOG || {},
      scenarioAssetMap: mediaMod.SCENARIO_ASSET_MAP_EXPORT || {},
      scenarioMediaOverrides: mediaMod.SCENARIO_MEDIA_OVERRIDES_EXPORT || {},
      mapAnnotations: mapMod.MAP_ANNOTATIONS || {},
      mapPlateCaptions: mapMod.MAP_PLATE_CAPTIONS || {},
      mapInspectorPins: mapMod.MAP_INSPECTOR_PINS || {},
      mapCanvasSize: mapMod.MAP_CANVAS_SIZE || { width: 600, height: 320 },
      audioCatalog: audioMod.AUDIO_TRACK_LIBRARY || [],
      primerCatalog: primerMod.HISTORICAL_PRIMERS || {},
    };
  } finally {
    await viteServer.close();
  }
}

// ── Validation helpers ────────────────────────────────────────────────────────

function validateEffects(effects, prefix, errors) {
  if (!effects || typeof effects !== 'object') return;
  const { metrics = {}, shards = {} } = effects;

  for (const [key, val] of Object.entries(metrics)) {
    if (!VALID_METRIC_KEYS.has(key)) {
      errors.push(`${prefix}: unknown metric key "${key}"`);
    }
    if (typeof val !== 'number') {
      errors.push(`${prefix}: metric "${key}" must be a number, got ${typeof val}`);
      continue;
    }
    if (key === 'divergenceIndex' && Math.abs(val) > MAX_DIVERGENCE_DELTA) {
      errors.push(
        `${prefix}: divergenceIndex delta ${val} outside expected range (±${MAX_DIVERGENCE_DELTA})`
      );
    }
    if (key !== 'divergenceIndex' && Math.abs(val) > MAX_METRIC_DELTA) {
      errors.push(
        `${prefix}: metric "${key}" delta ${val} is extreme (expected ±${MAX_METRIC_DELTA})`
      );
    }
  }

  for (const key of Object.keys(shards)) {
    if (!VALID_SHARD_KEYS.has(key)) {
      errors.push(`${prefix}: unknown shard key "${key}"`);
    }
  }
}

function validateChoice(choice, scenarioPrefix, allIds, errors) {
  const prefix = `${scenarioPrefix} > choice "${choice.id || '(no id)'}"`;

  if (!choice.id)   errors.push(`${prefix}: missing id`);
  if (!choice.text) errors.push(`${prefix}: missing text`);

  if (!choice.proposer) {
    errors.push(`${prefix}: missing proposer`);
  } else if (!VALID_PROPOSERS.has(choice.proposer)) {
    errors.push(
      `${prefix}: unknown proposer "${choice.proposer}" ` +
      `(valid: ${[...VALID_PROPOSERS].join(', ')})`
    );
  }

  if (choice.next && !allIds.has(choice.next)) {
    errors.push(`${prefix}: branch target "${choice.next}" has no matching scenario id`);
  }
  if (choice.endsCampaign !== undefined && typeof choice.endsCampaign !== 'boolean') {
    errors.push(`${prefix}: endsCampaign must be a boolean when provided`);
  }
  if (choice.endsCampaign && choice.next) {
    errors.push(`${prefix}: terminal choices must not define a next scenario`);
  }

  if (choice.successRate !== undefined) {
    if (typeof choice.successRate !== 'number' || choice.successRate < 0 || choice.successRate > 1) {
      errors.push(`${prefix}: successRate must be a number 0–1, got ${choice.successRate}`);
    }
    if (!choice.successEffects && !choice.effects) {
      errors.push(`${prefix}: has successRate but neither successEffects nor effects defined`);
    }
  }

  validateEffects(choice.effects,         `${prefix} .effects`,         errors);
  validateEffects(choice.successEffects,  `${prefix} .successEffects`,  errors);
  validateEffects(choice.failureEffects,  `${prefix} .failureEffects`,  errors);

  if (choice.survivalFloor !== undefined) {
    if (!choice.survivalFloor || typeof choice.survivalFloor !== 'object' || Array.isArray(choice.survivalFloor)) {
      errors.push(`${prefix}: survivalFloor must be an object of metric minimums`);
    } else {
      for (const [key, val] of Object.entries(choice.survivalFloor)) {
        if (!VALID_METRIC_KEYS.has(key) || key === 'divergenceIndex') {
          errors.push(`${prefix}: survivalFloor key "${key}" must be a supported non-divergence metric`);
        }
        if (typeof val !== 'number' || val < 0 || val > 100) {
          errors.push(`${prefix}: survivalFloor "${key}" must be a number 0-100, got ${val}`);
        }
      }
    }
  }

  if (choice.scoreCard !== undefined) {
    if (!choice.scoreCard || typeof choice.scoreCard !== 'object' || Array.isArray(choice.scoreCard)) {
      errors.push(`${prefix}: scoreCard must be an object`);
    } else {
      for (const [key, val] of Object.entries(choice.scoreCard)) {
        if (!VALID_SCORE_CARD_KEYS.has(key)) {
          errors.push(`${prefix}: scoreCard key "${key}" must be tactical or strategic`);
        }
        if (typeof val !== 'number' || val < -40 || val > 40) {
          errors.push(`${prefix}: scoreCard "${key}" must be a number from -40 to 40, got ${val}`);
        }
      }
    }
  }

  if (
    choice.minDivergence !== undefined &&
    choice.maxDivergence !== undefined &&
    choice.minDivergence >= choice.maxDivergence
  ) {
    errors.push(
      `${prefix}: minDivergence (${choice.minDivergence}) must be < maxDivergence (${choice.maxDivergence})`
    );
  }
}

function validateScenario(scenario, allIds, primerCatalog, errors) {
  const prefix = `Scenario "${scenario.id || '(no id)'}"`;

  if (!scenario.id)          errors.push(`${prefix}: missing id`);
  if (!scenario.title)       errors.push(`${prefix}: missing title`);
  if (!scenario.description) errors.push(`${prefix}: missing description`);
  if (!scenario.date)        errors.push(`${prefix}: missing date`);
  if (!scenario.actor)       errors.push(`${prefix}: missing actor`);
  if (!scenario.roleLabel)   errors.push(`${prefix}: missing roleLabel`);
  if (scenario.endsCampaign !== undefined && typeof scenario.endsCampaign !== 'boolean') {
    errors.push(`${prefix}: endsCampaign must be a boolean when provided`);
  }

  const choices = scenario.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    errors.push(`${prefix}: must have at least one choice`);
  } else {
    if (choices.length < 2) {
      errors.push(`${prefix}: only ${choices.length} choice — scenarios need ≥2 choices`);
    }
    const seenChoiceIds = new Set();
    for (const choice of choices) {
      if (choice.id) {
        if (seenChoiceIds.has(choice.id)) {
          errors.push(`${prefix}: duplicate choice id "${choice.id}"`);
        }
        seenChoiceIds.add(choice.id);
      }
      validateChoice(choice, prefix, allIds, errors);
    }
  }

  if (Array.isArray(scenario.branches)) {
    for (const branch of scenario.branches) {
      if (branch.scenarioId && !allIds.has(branch.scenarioId)) {
        errors.push(`${prefix}: branch.scenarioId "${branch.scenarioId}" has no matching scenario`);
      }
    }
  }

  if (scenario.electionBranch !== undefined) {
    const branch = scenario.electionBranch;
    if (!branch || typeof branch !== 'object' || Array.isArray(branch)) {
      errors.push(`${prefix}: electionBranch must be an object`);
    } else {
      if (typeof branch.threshold !== 'number' || !Number.isFinite(branch.threshold)) {
        errors.push(`${prefix}: electionBranch.threshold must be a finite number`);
      }
      for (const key of ['lincolnScenarioId', 'mcclellanScenarioId']) {
        if (!branch[key] || typeof branch[key] !== 'string') {
          errors.push(`${prefix}: electionBranch.${key} must be a scenario id`);
        } else if (!allIds.has(branch[key])) {
          errors.push(`${prefix}: electionBranch.${key} "${branch[key]}" has no matching scenario`);
        }
      }
      if (
        branch.lincolnScenarioId &&
        branch.mcclellanScenarioId &&
        branch.lincolnScenarioId === branch.mcclellanScenarioId
      ) {
        errors.push(`${prefix}: electionBranch targets must be different scenarios`);
      }
    }
  }

  if (scenario.crisisFor && !VALID_SHARD_KEYS.has(scenario.crisisFor)) {
    errors.push(`${prefix}: crisisFor "${scenario.crisisFor}" is not a valid shard key`);
  }

  if (scenario.primerTags !== undefined) {
    if (!Array.isArray(scenario.primerTags)) {
      errors.push(`${prefix}: primerTags must be an array when provided`);
    } else {
      const seenPrimerTags = new Set();
      for (const tag of scenario.primerTags) {
        if (typeof tag !== 'string') {
          errors.push(`${prefix}: primerTags entries must be strings`);
          continue;
        }
        if (seenPrimerTags.has(tag)) {
          errors.push(`${prefix}: duplicate primer tag "${tag}"`);
        }
        seenPrimerTags.add(tag);
        if (!primerCatalog[tag]) {
          errors.push(`${prefix}: primerTags references unknown primer "${tag}"`);
        }
      }
      if (scenario.primerTags.length > 3) {
        errors.push(`${prefix}: primerTags should surface at most 3 primers to avoid overloading the turn UI`);
      }
    }
  }
}

function validateHistoricalPrimers(primerCatalog, allIds, errors) {
  const seenIds = new Set();

  for (const [key, primer] of Object.entries(primerCatalog)) {
    const prefix = `Historical primer "${key}"`;
    if (!primer || typeof primer !== 'object') {
      errors.push(`${prefix}: must be an object`);
      continue;
    }

    for (const field of PRIMER_REQUIRED_FIELDS) {
      if (!(field in primer)) {
        errors.push(`${prefix}: missing required field "${field}"`);
      }
    }

    if (primer.id !== key) {
      errors.push(`${prefix}: id "${primer.id}" must match its catalog key`);
    }
    if (typeof primer.id === 'string') {
      if (seenIds.has(primer.id)) {
        errors.push(`${prefix}: duplicate primer id "${primer.id}"`);
      }
      seenIds.add(primer.id);
      if (!/^[a-z][a-z0-9_]*$/.test(primer.id)) {
        errors.push(`${prefix}: id must be snake_case`);
      }
    }

    const lengthChecks = [
      ['topic', 12],
      ['summary', 400],
      ['period_voice', 60],
      ['power_analysis', 200],
      ['complexity_note', 120],
      ['sourceNotes', 40],
    ];
    for (const [field, minLength] of lengthChecks) {
      if (typeof primer[field] !== 'string' || primer[field].trim().length < minLength) {
        errors.push(`${prefix}: ${field} should be at least ${minLength} characters`);
      }
    }

    if (!Array.isArray(primer.relatedScenarios)) {
      errors.push(`${prefix}: relatedScenarios must be an array`);
    } else {
      for (const scenarioId of primer.relatedScenarios) {
        if (!allIds.has(scenarioId)) {
          errors.push(`${prefix}: relatedScenarios references unknown scenario "${scenarioId}"`);
        }
      }
    }
  }
}

function validateFocusPoint(focus, prefix, errors) {
  if (!focus || typeof focus !== 'object') {
    errors.push(`${prefix}: must be an object with x/y in the 0–1 range`);
    return;
  }

  for (const axis of ['x', 'y']) {
    const value = focus[axis];
    if (typeof value !== 'number' || value < 0 || value > 1) {
      errors.push(`${prefix}: ${axis} must be a number in the 0–1 range, got ${value}`);
    }
  }
}

function validateOpacity(value, prefix, errors) {
  if (typeof value !== 'number' || value < 0 || value > 1) {
    errors.push(`${prefix}: must be a number in the 0–1 range, got ${value}`);
  }
}

function validateTacticalView(view, prefix, errors) {
  if (!view || typeof view !== 'object') return;

  if (view.focus !== undefined) {
    validateFocusPoint(view.focus, `${prefix}.focus`, errors);
  }

  if (view.zoom !== undefined && (typeof view.zoom !== 'number' || view.zoom < 1 || view.zoom > 2.5)) {
    errors.push(`${prefix}.zoom: must be a number between 1 and 2.5, got ${view.zoom}`);
  }
}

function validateFiniteNumber(value, prefix, errors) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(`${prefix}: must be a finite number, got ${value}`);
    return false;
  }
  return true;
}

function validateCanvasCoordinate(value, axis, prefix, limit, errors) {
  if (!validateFiniteNumber(value, `${prefix}.${axis}`, errors)) {
    return;
  }

  if (value < -MAP_PADDING || value > limit + MAP_PADDING) {
    errors.push(`${prefix}.${axis}: ${value} falls outside the tactical canvas range`);
  }
}

function validatePointArray(point, prefix, errors, canvasSize) {
  if (!Array.isArray(point) || point.length !== 2) {
    errors.push(`${prefix}: must be a [x, y] tuple`);
    return;
  }

  validateCanvasCoordinate(point[0], 'x', prefix, canvasSize.width, errors);
  validateCanvasCoordinate(point[1], 'y', prefix, canvasSize.height, errors);
}

function validateMapLabel(label, prefix, errors, canvasSize) {
  if (!label || typeof label !== 'object') {
    errors.push(`${prefix}: must be an object`);
    return;
  }

  if (!label.text || typeof label.text !== 'string') {
    errors.push(`${prefix}: missing text`);
  }
  validateCanvasCoordinate(label.x, 'x', prefix, canvasSize.width, errors);
  validateCanvasCoordinate(label.y, 'y', prefix, canvasSize.height, errors);
}

function validateTopography(topography, prefix, errors, canvasSize) {
  if (!topography || typeof topography !== 'object') {
    errors.push(`${prefix}: must be an object`);
    return;
  }

  if (!VALID_TOPOGRAPHY_TYPES.has(topography.type)) {
    errors.push(`${prefix}: unknown type "${topography.type}"`);
    return;
  }

  if (topography.type === 'contours') {
    if (!VALID_CONTOUR_SHAPES.has(topography.shape)) {
      errors.push(`${prefix}: contours shape "${topography.shape}" is invalid`);
    }
    validateFiniteNumber(topography.centerX, `${prefix}.centerX`, errors);
    validateFiniteNumber(topography.centerY, `${prefix}.centerY`, errors);
    validateFiniteNumber(topography.layers, `${prefix}.layers`, errors);
    if (topography.shape === 'ellipse') {
      validateFiniteNumber(topography.radiusX, `${prefix}.radiusX`, errors);
      validateFiniteNumber(topography.radiusY, `${prefix}.radiusY`, errors);
    } else {
      validateFiniteNumber(topography.radius, `${prefix}.radius`, errors);
    }
  }

  if (topography.type === 'harbor-fort' && topography.polygon !== undefined) {
    if (!Array.isArray(topography.polygon) || topography.polygon.length < 3) {
      errors.push(`${prefix}.polygon: must contain at least 3 points`);
    } else {
      topography.polygon.forEach((point, index) => {
        validatePointArray(point, `${prefix}.polygon[${index}]`, errors, canvasSize);
      });
    }
  }

  if (topography.type === 'trench-crater') {
    if (topography.trench) {
      validateFiniteNumber(topography.trench.startY, `${prefix}.trench.startY`, errors);
      validateFiniteNumber(topography.trench.stepY, `${prefix}.trench.stepY`, errors);
      validateFiniteNumber(topography.trench.xStep, `${prefix}.trench.xStep`, errors);
      validateFiniteNumber(topography.trench.amplitude, `${prefix}.trench.amplitude`, errors);
    }
    if (topography.crater) {
      validateCanvasCoordinate(topography.crater.x, 'x', `${prefix}.crater`, canvasSize.width, errors);
      validateCanvasCoordinate(topography.crater.y, 'y', `${prefix}.crater`, canvasSize.height, errors);
      validateFiniteNumber(topography.crater.radius, `${prefix}.crater.radius`, errors);
    }
  }

  if (topography.type === 'forest-fire') {
    if (topography.forestGrid) {
      validateFiniteNumber(topography.forestGrid.startX, `${prefix}.forestGrid.startX`, errors);
      validateFiniteNumber(topography.forestGrid.startY, `${prefix}.forestGrid.startY`, errors);
      validateFiniteNumber(topography.forestGrid.stepX, `${prefix}.forestGrid.stepX`, errors);
      validateFiniteNumber(topography.forestGrid.stepY, `${prefix}.forestGrid.stepY`, errors);
      validateFiniteNumber(topography.forestGrid.radius, `${prefix}.forestGrid.radius`, errors);
    }
    if (Array.isArray(topography.fireZones)) {
      topography.fireZones.forEach((zone, index) => {
        validateCanvasCoordinate(zone.x, 'x', `${prefix}.fireZones[${index}]`, canvasSize.width, errors);
        validateCanvasCoordinate(zone.y, 'y', `${prefix}.fireZones[${index}]`, canvasSize.height, errors);
        validateFiniteNumber(zone.radius, `${prefix}.fireZones[${index}].radius`, errors);
      });
    }
  }
}

function validateWaterways(waterways, prefix, errors, canvasSize) {
  if (!Array.isArray(waterways)) {
    errors.push(`${prefix}: must be an array`);
    return;
  }

  waterways.forEach((waterway, index) => {
    const waterwayPrefix = `${prefix}[${index}]`;
    if (!waterway || typeof waterway !== 'object') {
      errors.push(`${waterwayPrefix}: must be an object`);
      return;
    }
    if (waterway.type !== 'bezier') {
      errors.push(`${waterwayPrefix}: only "bezier" waterways are supported`);
      return;
    }
    validatePointArray(waterway.start, `${waterwayPrefix}.start`, errors, canvasSize);
    validatePointArray(waterway.cp1, `${waterwayPrefix}.cp1`, errors, canvasSize);
    validatePointArray(waterway.cp2, `${waterwayPrefix}.cp2`, errors, canvasSize);
    validatePointArray(waterway.end, `${waterwayPrefix}.end`, errors, canvasSize);
    if (waterway.label !== undefined) {
      validateMapLabel(waterway.label, `${waterwayPrefix}.label`, errors, canvasSize);
    }
  });
}

function validateTroops(troops, prefix, errors, canvasSize) {
  if (troops === null) return;
  if (!troops || typeof troops !== 'object') {
    errors.push(`${prefix}: must be an object or null`);
    return;
  }

  for (const side of ['union', 'confederate']) {
    const troop = troops[side];
    if (!troop || typeof troop !== 'object') {
      errors.push(`${prefix}.${side}: missing troop block`);
      continue;
    }
    if (!troop.label || typeof troop.label !== 'string') {
      errors.push(`${prefix}.${side}: missing label`);
    }
    validateCanvasCoordinate(troop.x, 'x', `${prefix}.${side}`, canvasSize.width, errors);
    validateCanvasCoordinate(troop.y, 'y', `${prefix}.${side}`, canvasSize.height, errors);
    if (troop.width !== undefined) {
      validateFiniteNumber(troop.width, `${prefix}.${side}.width`, errors);
    }
    if (troop.height !== undefined) {
      validateFiniteNumber(troop.height, `${prefix}.${side}.height`, errors);
    }
  }
}

function validateManeuvers(maneuvers, prefix, errors) {
  if (!maneuvers || typeof maneuvers !== 'object') {
    errors.push(`${prefix}: must be an object`);
    return;
  }

  for (const [key, maneuver] of Object.entries(maneuvers)) {
    if (!VALID_MANEUVER_KEYS.has(key)) {
      errors.push(`${prefix}: unknown maneuver key "${key}"`);
      continue;
    }
    if (!maneuver || typeof maneuver !== 'object') {
      errors.push(`${prefix}.${key}: must be an object`);
      continue;
    }
    for (const [optionKey, value] of Object.entries(maneuver)) {
      if (typeof value === 'number' && !Number.isFinite(value)) {
        errors.push(`${prefix}.${key}.${optionKey}: must be a finite number, got ${value}`);
      }
    }
  }
}

function validateInspectorPins(mapInspectorPins, allIds, errors) {
  for (const [scenarioId, pins] of Object.entries(mapInspectorPins)) {
    if (!allIds.has(scenarioId)) {
      errors.push(`Map inspector pins: scenario "${scenarioId}" has no matching authored scenario`);
      continue;
    }
    if (!Array.isArray(pins)) {
      errors.push(`Map inspector pins: scenario "${scenarioId}" must map to an array`);
      continue;
    }
    pins.forEach((pin, index) => {
      const prefix = `Map inspector pin "${scenarioId}"[${index}]`;
      if (!pin.label || typeof pin.label !== 'string') {
        errors.push(`${prefix}: missing label`);
      }
      if (!pin.desc || typeof pin.desc !== 'string') {
        errors.push(`${prefix}: missing desc`);
      }
      if (typeof pin.x !== 'number' || pin.x < 0 || pin.x > 100) {
        errors.push(`${prefix}: x must be a percentage between 0 and 100, got ${pin.x}`);
      }
      if (typeof pin.y !== 'number' || pin.y < 0 || pin.y > 100) {
        errors.push(`${prefix}: y must be a percentage between 0 and 100, got ${pin.y}`);
      }
    });
  }
}

function validateMapCoverage(scenarios, mapAnnotations, mapPlateCaptions, mapInspectorPins, mapCanvasSize, errors) {
  const allIds = new Set(scenarios.map((scenario) => scenario.id));

  if (
    !mapCanvasSize ||
    typeof mapCanvasSize.width !== 'number' ||
    typeof mapCanvasSize.height !== 'number' ||
    mapCanvasSize.width <= 0 ||
    mapCanvasSize.height <= 0
  ) {
    errors.push('Map annotations: MAP_CANVAS_SIZE must define positive width and height');
    return;
  }

  for (const scenario of scenarios) {
    const caption = mapPlateCaptions[scenario.id];
    if (!caption || typeof caption !== 'string') {
      errors.push(`Map captions: scenario "${scenario.id}" is missing a plate caption`);
    }
  }

  for (const [scenarioId, caption] of Object.entries(mapPlateCaptions)) {
    if (!allIds.has(scenarioId)) {
      errors.push(`Map captions: scenario "${scenarioId}" has no matching authored scenario`);
    }
    if (!caption || typeof caption !== 'string') {
      errors.push(`Map captions: scenario "${scenarioId}" must have a non-empty caption`);
    }
  }

  validateInspectorPins(mapInspectorPins, allIds, errors);

  for (const [scenarioId, annotation] of Object.entries(mapAnnotations)) {
    const prefix = `Map annotation "${scenarioId}"`;

    if (!allIds.has(scenarioId)) {
      errors.push(`${prefix}: has no matching authored scenario`);
      continue;
    }

    if (!annotation || typeof annotation !== 'object') {
      errors.push(`${prefix}: must be an object`);
      continue;
    }

    validateTopography(annotation.topography || { type: 'contours', shape: 'arc', centerX: 0, centerY: 0, radius: 0, layers: 0 }, `${prefix}.topography`, errors, mapCanvasSize);
    validateWaterways(annotation.waterways || [], `${prefix}.waterways`, errors, mapCanvasSize);

    if (annotation.labels !== undefined && !Array.isArray(annotation.labels)) {
      errors.push(`${prefix}.labels: must be an array when provided`);
    } else {
      (annotation.labels || []).forEach((label, index) => {
        validateMapLabel(label, `${prefix}.labels[${index}]`, errors, mapCanvasSize);
      });
    }

    validateTroops(annotation.troops ?? null, `${prefix}.troops`, errors, mapCanvasSize);
    validateManeuvers(annotation.maneuvers || {}, `${prefix}.maneuvers`, errors);
  }
}

function validateMediaCoverage(scenarios, mediaCatalog, scenarioAssetMap, scenarioMediaOverrides, errors) {
  const allIds = new Set(scenarios.map((scenario) => scenario.id));

  if (!mediaCatalog.unknown) {
    errors.push('Media catalog: missing required fallback asset "unknown"');
  }

  for (const [assetKey, asset] of Object.entries(mediaCatalog)) {
    const prefix = `Media asset "${assetKey}"`;

    if (!asset || typeof asset !== 'object') {
      errors.push(`${prefix}: must be an object`);
      continue;
    }

    if (!asset.src) {
      errors.push(`${prefix}: missing src`);
    } else if (asset.src.startsWith('/images/')) {
      const localPath = path.join(ROOT, 'public', asset.src);
      if (!fs.existsSync(localPath)) {
        errors.push(`${prefix}: src points to missing public file "${asset.src}"`);
      }
    }

    if (!VALID_CROP_MODES.has(asset.cropMode)) {
      errors.push(`${prefix}: cropMode "${asset.cropMode}" is invalid`);
    }

    validateFocusPoint(asset.cropFocus, `${prefix}.cropFocus`, errors);
    validateOpacity(asset.theaterOpacity, `${prefix}.theaterOpacity`, errors);
    validateOpacity(asset.overlayOpacity, `${prefix}.overlayOpacity`, errors);
    validateTacticalView(asset.tacticalView, `${prefix}.tacticalView`, errors);

    if (!VALID_PROVENANCE_STATUSES.has(asset.provenanceStatus)) {
      errors.push(`${prefix}: provenanceStatus "${asset.provenanceStatus}" is invalid`);
    }

    if (!VALID_HISTORICAL_MEDIA.has(asset.historicalMedium)) {
      errors.push(`${prefix}: historicalMedium "${asset.historicalMedium}" is invalid`);
    }

    if (!Array.isArray(asset.assetRoles) || asset.assetRoles.length === 0) {
      errors.push(`${prefix}: assetRoles must be a non-empty array`);
    } else {
      for (const role of asset.assetRoles) {
        if (!VALID_ASSET_ROLES.has(role)) {
          errors.push(`${prefix}: assetRoles contains invalid role "${role}"`);
        }
      }
    }

    if (asset.provenanceStatus === 'verified') {
      if (!asset.sourceUrl) errors.push(`${prefix}: verified assets must include sourceUrl`);
      if (!asset.sourceInstitution) errors.push(`${prefix}: verified assets must include sourceInstitution`);
      if (!asset.license || /review/i.test(asset.license)) errors.push(`${prefix}: verified assets must include a concrete license`);
    }

    if (asset.useInApp === true && asset.provenanceStatus !== 'verified') {
      errors.push(`${prefix}: active in-app assets must have verified provenance`);
    }

    if (!Array.isArray(asset.bestFor)) {
      errors.push(`${prefix}: bestFor must be an array`);
      continue;
    }

    for (const scenarioId of asset.bestFor) {
      if (!allIds.has(scenarioId)) {
        errors.push(`${prefix}: bestFor references unknown scenario "${scenarioId}"`);
      }
    }
  }

  for (const scenario of scenarios) {
    if (!scenarioAssetMap[scenario.id]) {
      errors.push(`Scenario "${scenario.id}": no canonical media mapping in src/game/mediaCatalog.js`);
    }
  }

  for (const [scenarioId, assetKey] of Object.entries(scenarioAssetMap)) {
    if (!allIds.has(scenarioId)) {
      errors.push(`Media mapping: scenario "${scenarioId}" has no matching authored scenario`);
    }
    if (!mediaCatalog[assetKey]) {
      errors.push(`Media mapping: scenario "${scenarioId}" points to missing asset "${assetKey}"`);
    } else if (mediaCatalog[assetKey].useInApp === false || mediaCatalog[assetKey].provenanceStatus !== 'verified') {
      errors.push(`Media mapping: scenario "${scenarioId}" points to non-release asset "${assetKey}"`);
    }
  }

  for (const [scenarioId, override] of Object.entries(scenarioMediaOverrides)) {
    if (!allIds.has(scenarioId)) {
      errors.push(`Media override: scenario "${scenarioId}" has no matching authored scenario`);
      continue;
    }
    validateTacticalView(override?.tacticalView, `Media override "${scenarioId}".tacticalView`, errors);
  }
}

function validateAudioCatalog(audioCatalog, errors) {
  if (!Array.isArray(audioCatalog) || audioCatalog.length === 0) {
    errors.push('Audio catalog: expected at least one track definition');
    return;
  }

  const seenKeys = new Set();
  const seenSrcs = new Set();

  audioCatalog.forEach((track, index) => {
    const prefix = `Audio track "${track?.key || index}"`;
    if (!track || typeof track !== 'object') {
      errors.push(`${prefix}: must be an object`);
      return;
    }

    if (!track.key) {
      errors.push(`${prefix}: missing key`);
    } else if (seenKeys.has(track.key)) {
      errors.push(`${prefix}: duplicate key "${track.key}"`);
    }
    seenKeys.add(track.key);

    if (!track.title) errors.push(`${prefix}: missing title`);
    if (!track.src || !track.src.startsWith('/audio/') || !track.src.endsWith('.mp3')) {
      errors.push(`${prefix}: src must be an /audio/*.mp3 path`);
    } else if (seenSrcs.has(track.src)) {
      errors.push(`${prefix}: duplicate src "${track.src}"`);
    }
    seenSrcs.add(track.src);

    if (!VALID_AUDIO_TYPES.has(track.type)) {
      errors.push(`${prefix}: type "${track.type}" is invalid`);
    }

    if (!VALID_AUDIO_LICENSE_STATUSES.has(track.licenseStatus)) {
      errors.push(`${prefix}: licenseStatus "${track.licenseStatus}" is invalid`);
    }

    if (track.licenseStatus !== 'recording-needed') {
      if (!track.sourceUrl) errors.push(`${prefix}: verified recordings must include sourceUrl`);
      if (!track.sourceInstitution) errors.push(`${prefix}: verified recordings must include sourceInstitution`);
    }

    if (!Array.isArray(track.bestFor) || track.bestFor.length === 0) {
      errors.push(`${prefix}: bestFor must be a non-empty array`);
    }
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  process.stdout.write('Validating content... ');

  let authoringSurface;
  try {
    authoringSurface = await loadAuthoringSurface();
  } catch (err) {
    console.error(`\n[validate-content] Failed to load authoring surface: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  const {
    scenarios,
    mediaCatalog,
    scenarioAssetMap,
    scenarioMediaOverrides,
    mapAnnotations,
    mapPlateCaptions,
    mapInspectorPins,
    mapCanvasSize,
    audioCatalog,
    primerCatalog,
  } = authoringSurface;

  if (!scenarios.length) {
    console.error('\n[validate-content] No scenarios loaded — check scenarios.js export.');
    process.exitCode = 1;
    return;
  }

  const errors = [];

  // Duplicate scenario id check
  const idCounts = {};
  for (const s of scenarios) {
    idCounts[s.id] = (idCounts[s.id] || 0) + 1;
  }
  for (const [id, count] of Object.entries(idCounts)) {
    if (count > 1) {
      errors.push(`Duplicate scenario id: "${id}" (appears ${count} times)`);
    }
  }

  const allIds = new Set(scenarios.map((s) => s.id));
  for (const [turn, requiredIds] of REQUIRED_LATE_WAR_SPINE) {
    const turnIds = new Set(scenarios.filter((scenario) => scenario.turn === turn).map((scenario) => scenario.id));
    for (const requiredId of requiredIds) {
      if (!turnIds.has(requiredId)) {
        errors.push(`Late-war spine: turn ${turn} must include scenario "${requiredId}"`);
      }
    }
  }
  for (const scenario of scenarios) {
    validateScenario(scenario, allIds, primerCatalog, errors);
  }
  validateHistoricalPrimers(primerCatalog, allIds, errors);
  validateMediaCoverage(scenarios, mediaCatalog, scenarioAssetMap, scenarioMediaOverrides, errors);
  validateMapCoverage(scenarios, mapAnnotations, mapPlateCaptions, mapInspectorPins, mapCanvasSize, errors);
  validateAudioCatalog(audioCatalog, errors);

  if (errors.length > 0) {
    console.log('FAILED\n');
    for (const e of errors) {
      console.error(`  ✗ ${e}`);
    }
    console.error(
      `\n${errors.length} content error${errors.length === 1 ? '' : 's'} ` +
      `found across ${scenarios.length} scenarios.`
    );
    process.exitCode = 1;
  } else {
    console.log(`OK  (${scenarios.length} scenarios, 0 errors)`);
  }
}

main().catch((err) => {
  console.error(`[validate-content] Unexpected error: ${err.message}`);
  process.exitCode = 1;
});
