import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

// Render the real gate/encounter UI. The Phaser renderer alone is replaced;
// this check makes no claim about battlefield pixels or control interactions.
const cacheDir = mkdtempSync(join(tmpdir(), 'tow-selected-mission-'));
const previousWindow = globalThis.window;
globalThis.window = { localStorage: { getItem: () => '1' }, matchMedia: () => ({ matches: false }) };
const vite = await createServer({
  configLoader: 'native', cacheDir,
  plugins: [{
    name: 'mission-test-no-phaser', enforce: 'pre',
    resolveId(id) { if (id.endsWith('/battle/CivilWarBattlefield.jsx')) return '\0mission-test-battlefield'; },
    load(id) { if (id === '\0mission-test-battlefield') return 'export function CivilWarBattlefield() { return null; }'; },
  }],
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: 'custom', logLevel: 'silent',
});

try {
  const { CivilWarBattleGate } = await vite.ssrLoadModule('/src/components/CivilWarBattleGate.jsx');
  const { CivilWarBattleEncounter } = await vite.ssrLoadModule('/src/components/CivilWarBattleEncounter.jsx');
  const { BATTLE_SCENARIOS } = await vite.ssrLoadModule('/src/game/battles.js');
  const { BATTLE_OBJECTIVES } = await vite.ssrLoadModule('/src/battle/battleAssessment.js');
  const text = (value) => renderToStaticMarkup(createElement('span', null, value)).slice(6, -7);
  let count = 0;
  for (const battle of Object.values(BATTLE_SCENARIOS)) {
    for (const [choiceId, mission] of Object.entries(BATTLE_OBJECTIVES[battle.id])) {
      for (const Component of [CivilWarBattleGate, CivilWarBattleEncounter]) {
        const html = renderToStaticMarkup(createElement(Component, {
          battle, choiceId, choiceText: 'Chosen strategy', campaignState: {},
          readiness: { preparation: 50, cohesion: 50, supply: 50, morale: 50, notes: [] },
        }));
        const context = html.match(/<details class="cw-field-orders cw-battle-context"[^>]*>[\s\S]*?<\/details>/)?.[0];
        assert.ok(context, `${battle.id}/${choiceId}: general context is available`);
        assert.doesNotMatch(context.split('>')[0], /\bopen(?:=|\s|$)/, 'general directives start collapsed');
        assert.ok(context.includes(text(battle.objective)));
        const main = html.replace(context, '');
        assert.ok(main.includes(text(mission.label)), `${battle.id}/${choiceId}: foreground shared mission`);
        assert.ok(!main.includes(text(battle.objective)), `${battle.id}/${choiceId}: generic objective is not the main mission`);
        const selectedOrders = battle.fieldOrdersByChoice?.[choiceId] || [];
        for (const order of selectedOrders) assert.ok(main.includes(text(order)), 'selected orders remain available');
        for (const order of battle.fieldOrders || []) {
          assert.ok(context.includes(text(order)), 'general orders retain context');
          if (!selectedOrders.includes(order)) assert.ok(!main.includes(text(order)), `${battle.id}/${choiceId}: no generic directive before the context disclosure`);
        }
      }
      count++;
    }
  }
  assert.equal(count, 44);
  console.log(`Selected mission UI checks passed (${count} postures, gate and initial encounter rendered; general directives collapsed).`);
} finally {
  await vite.close();
  rmSync(cacheDir, { recursive: true, force: true });
  if (previousWindow === undefined) delete globalThis.window;
  else globalThis.window = previousWindow;
}
