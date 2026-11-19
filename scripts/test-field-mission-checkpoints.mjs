import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { createPracticeState } from '../src/game/practiceConditions.js';
import { PRACTICE_BATTLES } from '../src/game/battles.js';

const cacheDir = mkdtempSync(join(tmpdir(), 'civil-field-checks-ui-'));
const vite = await createServer({
  configLoader: 'native', cacheDir, optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'silent',
});
try {
  const { FieldMissionCheckpoints } = await vite.ssrLoadModule('/src/components/FieldMissionCheckpoints.jsx');
  const render = (mission, battleName) => renderToStaticMarkup(createElement(FieldMissionCheckpoints, { mission, battleName }));
  const battleFields = [
    ['antietam', 'antietam'], ['five_forks', 'fiveForks'], ['fall_of_atlanta', 'jonesborough'],
    ['second_manassas', 'secondManassas'], ['fredericksburg_field', 'fredericksburg'], ['seven_days', 'gainesMill'],
    ['new_market', 'newMarket'], ['missionary_ridge', 'missionaryRidge'], ['spotsylvania', 'spotsylvania'],
    ['kennesaw_mountain', 'kennesaw'],
    ['vicksburg', 'vicksburg'],
    ['sailors_creek', 'sailorsCreek'],
  ];
  for (const [id, missionKey] of battleFields) {
    const battle = PRACTICE_BATTLES[id];
    const battleName = battle.title.split(' — ')[0];
    for (const choice of battle.practiceChoices) {
      test(`${battle.id} / ${choice.id} renders every live condition and deadline`, () => {
        const state = createPracticeState({ id, turn: 1 });
        const engine = new CivilWarBattleEngine(battle.id, state, choice.id);
        const mission = engine.snapshot().fieldBattle[missionKey];
        const html = render(mission, battleName);
        const met = mission.conditions.filter(condition => condition.satisfied).length;
        assert.ok(html.includes(`aria-label="${battleName} mission checkpoints"`));
        assert.ok(html.includes(`Mission checks · ${met} of ${mission.conditions.length} met`));
        assert.ok(html.includes(`By field minute ${mission.deadline}`));
        assert.equal((html.match(/<li data-met=/g) || []).length, mission.conditions.length);
        assert.doesNotMatch(html, /<details[^>]* open/);
        assert.match(html, /Unmet · /);
      });
    }
  }

  test('a failed mission retains the field evidence and clears the countdown', () => {
    const html = render({
      title: 'Field objective incomplete', deadline: 51, status: 'failed',
      conditions: [{ label: 'Enforce hold', satisfied: false, detail: '0 / 7 min' }],
    }, 'Gaines’ Mill');
    assert.match(html, /data-state="failed"/);
    assert.match(html, /Field objective incomplete/);
    assert.match(html, /Unmet · 0 \/ 7 min/);
    assert.doesNotMatch(html, /By field minute/);
  });

  test('missing and summary-only reports remain readable', () => {
    assert.equal(render(null, 'Gaines’ Mill'), '');
    const html = render({ title: 'Cross the ravine', detail: '0 / 2 formations', status: 'tracking' }, 'Gaines’ Mill');
    assert.match(html, /0 \/ 2 formations/);
    assert.doesNotMatch(html, /<details/);
  });
} finally {
  await vite.close();
  rmSync(cacheDir, { recursive: true, force: true });
}
