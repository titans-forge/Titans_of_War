import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { calculateCampaignAssessment, formatCampaignAssessment, CAMPAIGN_ASSESSMENT_VERSION } from '../src/game/campaignAssessment.js';
import { createFreshCampaignState, createCampaignSnapshot, restoreCampaignFromSnapshot } from '../src/game/campaignStorage.js';
import { calculateCampaignScore } from '../src/game/simulationEngine.js';
import { advanceCampaignTurn } from '../src/game/headlessCampaign.js';

const scene = { id: 'assessment-fixture', title: 'A campaign settlement', turn: 28, endsCampaign: true,
  choices: [{ id: 'settle', text: 'Accept the settlement', consequence: 'The campaign concludes.', effects: { metrics: {}, shards: {} } }] };
const stateFor = (metrics = {}, debt = {}, extra = {}) => ({ ...createFreshCampaignState(1861, scene.id), currentTurn: 28, gameOver: true,
  metrics: { militaryStrength: 100, foodSupply: 100, publicMorale: 100, treasury: 0, munitions: 0, ...metrics },
  campaignEconomy: { treasuryArrears: 0, munitionsArrears: 0, emergencyUsed: 0, ...debt }, ...extra });

test('unpaid obligations meaningfully reduce completed assessments even when the old grade stays high', () => {
  const funded = stateFor();
  const unpaid = stateFor({}, { treasuryArrears: 146 });
  assert.equal(calculateCampaignScore(funded).commandScore, calculateCampaignScore(unpaid).commandScore, 'frozen command formula omits debt');
  assert.equal(calculateCampaignAssessment(funded).score, 100);
  const assessed = calculateCampaignAssessment(unpaid);
  assert.equal(assessed.score, 60, 'unpaid100+ cannot earn any of the40 stewardship points');
  assert.equal(assessed.evidence.treasuryArrears, 146, 'score floor must not hide actual obligations');
  assert.equal(assessed.components[0].contribution, 0);
  assert.equal(calculateCampaignAssessment(stateFor({}, { treasuryArrears: 10, munitionsArrears: 15 })).score, 90);
});

test('force condition and completion contribute exactly and reflect the existing collapse boundaries', () => {
  const state = stateFor({ militaryStrength: 60, foodSupply: 40, publicMorale: 20 }, { treasuryArrears: 25 });
  const result = calculateCampaignAssessment(state);
  assert.equal(result.version, CAMPAIGN_ASSESSMENT_VERSION);
  assert.equal(result.score, 72); // stewardship30 + mean-condition12 + completion30
  assert.deepEqual(result.components.map(item => item.contribution), [30, 12, 30]);
  for (const [key, floor] of [['militaryStrength', 10], ['foodSupply', 5], ['publicMorale', 10]]) {
    const collapsed = calculateCampaignAssessment(stateFor({ [key]: floor }));
    assert.equal(collapsed.status, 'collapsed');
    assert.equal(collapsed.components[2].score, 0);
    assert.equal(calculateCampaignAssessment(stateFor({ [key]: floor + 0.01 })).components[2].score, 100);
  }
});

test('unfinished, legacy, and missing evidence never receive a fabricated final assessment', () => {
  const unfinished = calculateCampaignAssessment(stateFor({}, {}, { gameOver: false }));
  assert.equal(unfinished.score, null); assert.equal(unfinished.status, 'in-progress');
  assert.equal(unfinished.components[2].score, null);
  for (const rulesVersion of [1, undefined]) {
    const legacy = calculateCampaignAssessment(stateFor({}, {}, { rulesVersion }));
    assert.equal(legacy.score, null); assert.equal(legacy.evidence.treasuryArrears, null);
    assert.match(legacy.explanation, /without inventing evidence/);
  }
  for (const mutation of [state => { delete state.campaignEconomy; }, state => { state.campaignEconomy.treasuryArrears = -1; }, state => { state.metrics.publicMorale = NaN; }, state => { state.battleRulesVersion = 99; }]) {
    const state = stateFor(); mutation(state);
    assert.equal(calculateCampaignAssessment(state).status, 'unavailable');
  }
});

test('the assessment is pure, debt-monotone, bounded, and unaffected by timeline fidelity or authored grade bonuses', () => {
  let previous = 101;
  for (const debt of [0, 0.5, 12, 25, 50, 99, 100, 146, 1000000]) {
    const state = stateFor({ militaryStrength: 60, foodSupply: 55, publicMorale: 70 }, { treasuryArrears: debt });
    const copy = structuredClone(state);
    const result = calculateCampaignAssessment(state);
    assert.ok(result.score <= previous && result.score >= 0 && result.score <= 100);
    previous = result.score;
    assert.deepEqual(state, copy);
    assert.deepEqual(calculateCampaignAssessment(state), result);
    assert.equal(calculateCampaignAssessment({ ...state, divergenceIndex: 1, history: [{ scenarioId: 'fort_sumter', choiceId: 'option_b', scoreCard: { tactical: 1000, strategic: 1000 } }] }).score, result.score);
  }
});

test('an actual engine ending and portable round trip retain exactly the observed assessment and original scores', () => {
  const start = stateFor({ militaryStrength: 60, foodSupply: 40, publicMorale: 50 }, { treasuryArrears: 10, munitionsArrears: 20 }, { gameOver: false });
  const next = advanceCampaignTurn(start, scene, 'settle', [scene]).state;
  assert.equal(next.gameOver, true);
  const original = calculateCampaignScore(next);
  const assessment = calculateCampaignAssessment(next);
  // Standard upkeep adds3+3 unpaid costs and removes2Food: supply64, condition148/3.
  assert.equal(assessment.score, 70);
  const restored = restoreCampaignFromSnapshot(JSON.parse(JSON.stringify(createCampaignSnapshot(next, scene))), [scene]);
  assert.ok(restored);
  assert.deepEqual(calculateCampaignAssessment(restored.state), assessment);
  assert.deepEqual(calculateCampaignScore(restored.state), original);
});

test('portable assessment text discloses weights, raw debts, unscored play and comparison limits', () => {
  const report = formatCampaignAssessment(calculateCampaignAssessment(stateFor({}, { treasuryArrears: 146 })));
  assert.match(report, /60\/100/); assert.match(report, /Treasury \(146\)/);
  assert.match(report, /40%/); assert.match(report, /not validated grading norms/);
  assert.match(report, /same campaign and battle rules and difficulty/);
  assert.match(formatCampaignAssessment(calculateCampaignAssessment(stateFor({}, {}, { gameOver: false }))), /In progress — not yet scored/);
});

test('the rendered panel exposes stewardship costs and separates original score formulas', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { CampaignAssessmentPanel } = await vite.ssrLoadModule('/src/components/CampaignAssessmentPanel.jsx');
    const html = renderToStaticMarkup(React.createElement(CampaignAssessmentPanel, { state: stateFor({}, { treasuryArrears: 146 }) }));
    assert.match(html, /aria-label="Campaign outcome assessment"/);
    assert.match(html, /60\/100/); assert.match(html, /Treasury 146/);
    assert.match(html, /Original command and historical composite scores/);
    assert.match(html, /Force condition/); assert.match(html, /not measured civilian welfare/);
  } finally { await vite.close(); }
});
