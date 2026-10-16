import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const cacheDir = mkdtempSync(join(tmpdir(), 'tow-map-learning-'));
const vite = await createServer({
  configLoader: 'native', cacheDir,
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: 'custom', logLevel: 'silent',
});

try {
  const { STATIC_SCENARIOS } = await vite.ssrLoadModule('/src/game/scenarios.js');
  const { MEDIA_CATALOG, resolveScenarioMediaSet } = await vite.ssrLoadModule('/src/game/mediaCatalog.js');
  const { LEARNING_REFLECTIONS, LEARNING_SOURCES, getLearningReflection } = await vite.ssrLoadModule('/src/game/learningReflections.js');
  const { default: BattlefieldMap } = await vite.ssrLoadModule('/src/components/BattlefieldMap.jsx');
  const { default: CampaignReflection } = await vite.ssrLoadModule('/src/components/CampaignReflection.jsx');
  const scenarioIds = new Set(STATIC_SCENARIOS.map((scenario) => scenario.id));

  // Wrong-place regressions: no borrowed archival plate may return here.
  for (const id of ['radical_republican_crisis', 'naval_technology', 'emancipation_cabinet_debate',
    'gettysburg_recognition_crisis', 'susquehanna_offensive', 'black_confederate_debate',
    'richmond_evacuation', 'greensboro_convention', 'cold_harbor', 'petersburg_siege']) {
    const media = resolveScenarioMediaSet(id).tacticalMap;
    assert.equal(media.src, '', `${id} must not borrow another battlefield`);
    assert.equal(media.geographicScope, 'game-schematic');
  }

  const originallyDisabled = ['map_first_manassas', 'map_seven_days', 'map_chancellorsville',
    'map_third_winchester', 'map_first_winchester_reference', 'map_new_market_reference',
    'map_cedar_creek_reference', 'map_virginia_campaigns_reference'];
  for (const id of [...originallyDisabled, 'map_petersburg_crater']) {
    assert.equal(MEDIA_CATALOG[id].useInApp, false, `${id} stays disabled`);
  }
  assert.match(MEDIA_CATALOG.map_petersburg_crater.title, /Richmond/);
  assert.equal(MEDIA_CATALOG.map_petersburg_crater.provenanceStatus, 'needs-review');
  assert.equal(MEDIA_CATALOG.map_gettysburg_cemetery_ridge.historicalMedium, 'map');
  assert.equal(MEDIA_CATALOG.map_gettysburg_cemetery_ridge.sourceUrl, 'https://www.loc.gov/item/99447495/');
  assert.match(resolveScenarioMediaSet('fort_sumter').tacticalMap.mapScopeLabel, /Regional context.*1863/);
  assert.match(resolveScenarioMediaSet('gettysburg_decision').tacticalMap.mapScopeLabel, /East Cavalry Field.*not Cemetery Ridge/);
  assert.match(resolveScenarioMediaSet('wilderness').tacticalMap.mapScopeLabel, /May 4 approach/);

  // Test the renderer, not only metadata: source maps cannot receive an
  // unregistered game canvas; illustrative fallbacks retain their diagram.
  let historicalViews = 0;
  for (const id of scenarioIds) {
    const media = resolveScenarioMediaSet(id).tacticalMap;
    const html = renderToStaticMarkup(createElement(BattlefieldMap, { scenarioId: id, selectedChoiceId: 'option_b' }));
    assert.ok(media.mapScopeLabel, `${id} has a visible geographic scope`);
    if (media.src) {
      historicalViews++;
      assert.equal(media.provenanceStatus, 'verified');
      assert.equal(media.showGameOverlay, false);
      assert.match(html, /<img/);
      assert.doesNotMatch(html, /<canvas/);
      assert.match(html, /NO GAME OVERLAY/);
      assert.match(html, /Source ·/);
    } else {
      assert.match(html, /<canvas/);
      assert.match(html, /not to scale|NOT TO SCALE/);
      assert.match(html, /not a surveyed map/);
      assert.doesNotMatch(html, /INSPECT MAP/);
    }
  }

  assert.equal(LEARNING_REFLECTIONS.length, 5);
  assert.equal(new Set(LEARNING_REFLECTIONS.map((item) => item.id)).size, 5);
  const mappedIds = new Set();
  for (const reflection of LEARNING_REFLECTIONS) {
    for (const id of reflection.scenarioIds) {
      assert.ok(scenarioIds.has(id), `reflection uses a real scenario: ${id}`);
      assert.ok(!mappedIds.has(id), `scenario has one reflection: ${id}`);
      mappedIds.add(id);
      assert.equal(getLearningReflection(id), reflection);
    }
    for (const id of reflection.sourceIds) {
      const source = LEARNING_SOURCES[id];
      assert.ok(source?.evidenceType && source?.section && source?.limitation);
      assert.match(new URL(source.url).hostname, /(^|\.)(nps\.gov|archives\.gov|loc\.gov)$/);
    }
    const html = renderToStaticMarkup(createElement(CampaignReflection, { scenarioId: reflection.scenarioIds[0] }));
    assert.match(html, /Historical record/);
    assert.match(html, /This simulation/);
    assert.match(html, /Consider a changed situation/);
    assert.match(html, /Compare your reasoning/);
    assert.match(html, /does not measure learning/);
    assert.doesNotMatch(html, /<form|<input|<textarea/);
  }
  for (const id of [null, undefined, {}, '__proto__', 'unknown_generated_scenario']) {
    assert.equal(getLearningReflection(id), null);
    assert.equal(renderToStaticMarkup(createElement(CampaignReflection, { scenarioId: id })), '');
  }
  console.log(`Map and learning checks passed (${scenarioIds.size} rendered scenarios; ${historicalViews} scoped historical views; ${LEARNING_REFLECTIONS.length} reflections covering ${mappedIds.size} hinges).`);
} finally {
  await vite.close();
  rmSync(cacheDir, { recursive: true, force: true });
}
