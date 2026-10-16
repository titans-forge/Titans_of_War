import assert from 'node:assert/strict';
import test from 'node:test';
import { PRESENTATION_ART, resolvePresentationArt, resolveEndingPresentationArt } from '../src/game/presentationArt.js';

const completed = (scenarioId, choiceId, overrides = {}) => ({
  gameOver: true,
  currentTurn: 28,
  divergenceIndex: 0.4,
  metrics: { militaryStrength: 50, publicMorale: 50, foodSupply: 50 },
  history: [{ scenarioId, choiceId }],
  ...overrides,
});

test('only the three reviewed scenarios replace scene art; archive fallback stays available elsewhere', () => {
  assert.equal(resolvePresentationArt('fort_sumter'), PRESENTATION_ART.sumter);
  assert.equal(resolvePresentationArt('naval_technology'), PRESENTATION_ART.hamptonRoads);
  assert.equal(resolvePresentationArt('appomattox_decision'), PRESENTATION_ART.appomattox);
  for (const id of [undefined, null, {}, 'constructor', '__proto__', 'radical_republican_crisis', 'greensboro_convention', 'southern_independence_1864', 'ai_generated_scenario']) {
    assert.equal(resolvePresentationArt(id), null, String(id));
  }
});

test('scene metadata is explicit created art with actual dimensions and scoped historical evidence', () => {
  const records = Object.values(PRESENTATION_ART);
  assert.equal(records.length, 3);
  assert.equal(new Set(records.map((art) => art.src)).size, 3);
  for (const art of records) {
    assert.equal(art.kind, 'generated-art');
    assert.match(art.label, /AI-generated.*interpretation/);
    assert.equal(art.width, 1672);
    assert.equal(art.height, 941);
    assert.equal(art.cropMode, 'contain');
    assert.ok(art.alt && art.caption && art.scopeNote);
    assert.ok(art.sourceLinks.length);
    for (const source of art.sourceLinks) {
      assert.equal(new URL(source.url).protocol, 'https:');
      assert.ok(source.title && source.supports && source.evidenceType);
    }
  }
  assert.match(PRESENTATION_ART.hamptonRoads.caption, /March 9, 1862/);
  assert.match(PRESENTATION_ART.hamptonRoads.caption, /March 8 naval decision/);
  assert.match(PRESENTATION_ART.appomattox.caption, /can lead elsewhere/);
});

test('completed historical parole ending receives art with outcome-specific copy', () => {
  const art = resolveEndingPresentationArt(completed('appomattox_decision', 'option_b'));
  assert.equal(art.src, PRESENTATION_ART.appomattox.src);
  assert.match(art.caption, /Army of Northern Virginia/);
  assert.doesNotMatch(art.caption, /choices.*can lead elsewhere/);
});

test('all other authored ending choices retain their own existing ending media', () => {
  for (const scenarioId of ['appomattox_decision', 'greensboro_convention', 'southern_independence_1864', 'election_1864_mcclellan', 'gettysburg_recognition_crisis']) {
    for (const choiceId of ['option_a', 'option_b', 'option_c', 'option_d']) {
      if (scenarioId === 'appomattox_decision' && choiceId === 'option_b') continue;
      assert.equal(resolveEndingPresentationArt(completed(scenarioId, choiceId)), null, `${scenarioId}:${choiceId}`);
    }
  }
});

test('unfinished games, early collapses and stale earlier parole entries never acquire a surrender ending', () => {
  for (const state of [null, {}, completed('appomattox_decision', 'option_b', { gameOver: false }), completed('appomattox_decision', 'option_b', { currentTurn: 12, metrics: { militaryStrength: 0 } }), completed('appomattox_decision', 'option_b', { currentTurn: undefined }), completed('appomattox_decision', 'option_b', { history: [] }), completed('appomattox_decision', 'option_b', { history: [{ scenarioId: 'appomattox_decision', choiceId: 'option_b' }, { scenarioId: 'southern_independence_1864', choiceId: 'option_a' }] })]) {
    assert.equal(resolveEndingPresentationArt(state), null);
  }
});

test('installed presentation plates match the reviewed image hashes and WebP format', async () => {
  const { readFile } = await import('node:fs/promises');
  const { createHash } = await import('node:crypto');
  const manifest = JSON.parse(await readFile(new URL('../docs/presentation-art-manifest.json', import.meta.url), 'utf8'));
  for (const art of Object.values(PRESENTATION_ART)) {
    const row = manifest.find(item => item.id === art.id);
    assert.ok(row, art.id);
    assert.equal(row.runtime, art.src);
    const bytes = await readFile(new URL(`../public${art.src}`, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), row.runtimeSha256);
    assert.ok(bytes.length < 400000, 'each runtime plate stays within the 400 KB budget');
  }
});
