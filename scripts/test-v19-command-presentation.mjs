import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { createPracticeState } from '../src/game/practiceConditions.js';
import { getGettysburgJacksonMissionPresentation } from '../src/battle/gettysburgJacksonMission.js';
const cacheDir = mkdtempSync(join(tmpdir(), 'civil-v19-ui-'));
const vite = await createServer({ configLoader: 'native', cacheDir, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'silent' });
try {
  const { TurnClearanceRecovery } = await vite.ssrLoadModule('/src/components/TurnClearanceRecovery.jsx');
  const { GettysburgJacksonMissionConditions } = await vite.ssrLoadModule('/src/components/GettysburgJacksonMissionConditions.jsx');
  const render = (component, props) => renderToStaticMarkup(createElement(component, props));
  for (const phase of ['confirmed', 'moving', 'waiting', 'ready']) test(`${phase}: saved sector and deliberate resume remain explicit`, () => {
    const html = render(TurnClearanceRecovery, { record: { phase, order: 'assault', point: { sectorId: 'east' } }, sectors: [{ id: 'east', name: 'Dyer Field' }] });
    assert.match(html, /Saved attack order/); assert.match(html, /Resume assault on Dyer Field/); assert.match(html, /Forget saved attack/);
    assert.match(html, /reminder lasts while this battlefield is open/);
    assert.equal(/<button disabled=""[^>]*>Resume/.test(html), phase !== 'ready');
  });
  test('a ready reminder cannot resume while another move or resolution is being reviewed', () => assert.match(render(TurnClearanceRecovery, { record: { phase: 'ready', order: 'advance' }, disabled: true }), /<button disabled=""[^>]*>Resume/));
  test('no recovery card appears before a move is confirmed or when the record is absent', () => {
    assert.equal(render(TurnClearanceRecovery, { record: null }), '');
    assert.equal(render(TurnClearanceRecovery, { record: { phase: 'preview' } }), '');
  });
  for (const choice of ['option_a', 'option_b', 'option_c', 'option_d']) test(`${choice}: real Jackson mission conditions render without claiming hill ownership`, () => {
    const engine = new CivilWarBattleEngine('gettysburg_jackson', createPracticeState({ id: 'gettysburg_with_jackson', turn: 14 }), choice);
    const mission = getGettysburgJacksonMissionPresentation(engine.snapshot(), choice);
    const html = render(GettysburgJacksonMissionConditions, { mission });
    assert.match(html, /Jackson mission conditions/); assert.match(html, /actual presence, including contested ground/);
    assert.match(html, /Other field result conditions/); assert.doesNotMatch(html, /<details[^>]* open/);
    assert.match(html, /Unmet:/); assert.match(html, /Selected mission:/);
  });
  test('after-action explanation opens while incomplete imported facts remain explicitly unknown', () => {
    const mission = getGettysburgJacksonMissionPresentation({ scenarioId: 'gettysburg_jackson', outcome: 'defeat', formations: [], time: 100 }, 'option_a');
    const html = render(GettysburgJacksonMissionConditions, { mission, completed: true });
    assert.match(html, /<details[^>]* open=""/); assert.match(html, /does not establish the exact deciding condition/);
  });
  test('other battles receive no Jackson checklist', () => assert.equal(render(GettysburgJacksonMissionConditions, { mission: null }), ''));
} finally { await vite.close(); rmSync(cacheDir, { recursive: true, force: true }); }
