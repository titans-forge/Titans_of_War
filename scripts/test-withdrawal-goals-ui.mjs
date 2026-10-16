import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withdrawalGoals } from '../src/battle/withdrawalGoals.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const cacheDir = mkdtempSync(join(tmpdir(), 'civil-war-withdrawal-ui-'));
const server = await createServer({ root, configFile: false, plugins: [react()], cacheDir,
  server: { middlewareMode: true, ws: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] } });
after(async () => { await server.close(); rmSync(cacheDir, { recursive: true, force: true }); });
const { WithdrawalGoals } = await server.ssrLoadModule('/src/components/WithdrawalGoals.jsx');
const html = report => renderToStaticMarkup(React.createElement(WithdrawalGoals, { report }));
const snapshot = outcome => ({ scenarioId: 'third_winchester', fieldBattle: {}, outcome,
  formations: ['one', 'two', 'guns'].map((id, index) => ({ id, type: index === 2 ? 'artillery' : 'infantry',
    side: 'confederate', initialStrength: 100, strength: 100, withdrawn: true,
    withdrawalOrganized: true, status: 'steady' })) });

test('failed mission explains unearned goals even when all preservation criteria are met', () => {
  const report = withdrawalGoals(snapshot('defeat'), { kind: 'withdraw' }, false);
  const rendered = html(report);
  assert.equal(report.goals.filter(goal => goal.status === 'not-earned').length, 3);
  assert.match(rendered, /100% of starting strength withdrawn in order/);
  assert.match(rendered, /3 \/ 3 formations withdrawn in order/);
  assert.match(rendered, /1 \/ 1 artillery formations withdrawn without abandoning guns/);
  assert.equal((rendered.match(/Not earned/g) || []).length, 3);
  assert.match(rendered, /Goals require mission success and the listed preservation conditions/);
  assert.match(rendered, /Meeting a preservation condition alone does not earn a goal/);
});

test('achieved mission retains earned rewards and the same terminal prerequisite', () => {
  const report = withdrawalGoals(snapshot('disciplined-withdrawal'), { kind: 'withdraw' }, true);
  const rendered = html(report);
  assert.equal(report.goals.filter(goal => goal.status === 'achieved').length, 3);
  assert.match(rendered, /Withdrawal goals · 3\/3/);
  assert.doesNotMatch(rendered, /Not earned/);
  assert.match(rendered, /Goals require mission success/);
});

test('live planning advice remains visible and ineligible reports render nothing', () => {
  const report = withdrawalGoals(snapshot('undecided'), { kind: 'withdraw' }, false);
  assert.match(html(report), /Plan departures together/);
  assert.match(html(report), /require mission success/);
  assert.equal(html(null), '');
});
