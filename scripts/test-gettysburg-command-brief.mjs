import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { GETTYSBURG_STAGING_PLAN, getGettysburgCommandBrief, getGettysburgForceReport, getGettysburgFormationAdvice } from '../src/battle/gettysburgCommandBrief.js';

const unit = (id, values = {}) => ({ id, name: id, side: 'confederate', active: true, initialStrength: 1000, strength: 900, status: 'steady', condition: 'steady', order: 'hold', ammunition: 20, fatigue: 10, ...values });

test('an isolated ridge foothold explains how to reconnect support instead of repeating the opening brief', () => {
  const formation = unit('Wilcox', { type: 'infantry', x: 1170, y: 390, readiness: { supported: false, nearestSupportName: 'Pettigrew', nearestSupportDistance: 352.4, supportRange: 340 } });
  const live = { time: 150, outcome: 'undecided', formations: [formation], gettysburg: { held: 0, sectors: [{ x: 1080, y: 345, width: 250, height: 150 }] } };
  assert.equal(getGettysburgCommandBrief(live, 'option_a').phase, 'Connect the foothold');
  assert.match(getGettysburgFormationAdvice(formation), /Pettigrew, 353 field units/);
  assert.match(getGettysburgFormationAdvice(formation), /340/);
});

test('force debrief partitions survivors, captures and casualties without double counting', () => {
  const snapshot = { outcome: 'rout', formations: [
    unit('field'), unit('routed', { status: 'routing' }), unit('organized', { active: false, withdrawn: true, withdrawalOrganized: true }),
    unit('escaped', { active: false, withdrawn: true, withdrawalOrganized: false }), unit('reserve', { active: false }),
    unit('captured', { active: false, status: 'surrendered', strength: 0, capturedStrength: 900 }),
    unit('enemy', { side: 'union' }),
  ] };
  const frozen = JSON.stringify(snapshot);
  const report = getGettysburgForceReport(snapshot);
  assert.equal(report.initial, 6000);
  assert.equal(report.onField, 900);
  assert.equal(report.disordered, 1800);
  assert.equal(report.escaped, 900);
  assert.equal(report.reserve, 900);
  assert.equal(report.captured, 900);
  assert.equal(report.casualties, 600);
  assert.equal(report.rows.reduce((sum, row) => sum + row.value, 0), report.initial);
  assert.ok(Math.abs(report.rows.reduce((sum, row) => sum + row.percent, 0) - 100) < 1e-9);
  assert.equal(JSON.stringify(snapshot), frozen, 'presentation must never alter battle state');
});

test('a low-loss rout explains formation collapse instead of inventing destruction', () => {
  const report = getGettysburgForceReport({ outcome: 'rout', formations: [unit('A', { strength: 970, status: 'routing' })] });
  assert.equal(report.casualties, 30);
  assert.equal(report.disordered, 970);
  assert.match(report.headline, /before the army was destroyed/);
  assert.match(report.explanation, /loss of organized combat power/);
});

test('break evidence uses the preserved cause rather than pressure after retreat', () => {
  const report = getGettysburgForceReport({ outcome: 'rout', formations: [
    unit('Late break', { routingCause: 'Cohesion collapse', routingAt: 55, pressureReason: 'Clear of nearby enemies' }),
    unit('Early break', { routingCause: 'Sustained suppression', routingAt: 29, pressureReason: 'Rallying near friendly support' }),
    unit('No recorded cause', { pressureReason: 'Exhausted' }),
  ] });
  assert.deepEqual(report.breaks.map(entry => [entry.name, entry.cause, entry.at]), [['Early break', 'Sustained suppression', 29], ['Late break', 'Cohesion collapse', 55]]);
});

test('undecided and absent snapshots cannot claim an objective was secured', () => {
  for (const snapshot of [null, {}, { outcome: 'undecided', formations: [] }]) {
    const report = getGettysburgForceReport(snapshot);
    assert.match(report.headline, /undecided/);
    assert.ok(report.rows.every(row => Number.isFinite(row.percent)));
  }
});

test('opening instructions preserve pause and do not equate a posture with an order', () => {
  const engine = new CivilWarBattleEngine('gettysburg', { battleRulesVersion: 3 }, 'option_a');
  const before = JSON.stringify(engine.snapshot());
  assert.match(getGettysburgCommandBrief(engine.snapshot(), 'option_a').phase, /paused/);
  assert.match(getGettysburgCommandBrief(engine.snapshot(), 'option_a').message, /individual orders/);
  assert.equal(JSON.stringify(engine.snapshot()), before);
  engine.order('pickett-division', 'assault', { sectorId: 'center' });
  const pending = engine.snapshot();
  assert.equal(pending.time, 0);
  assert.match(getGettysburgCommandBrief(pending, 'option_a').phase, /Orders queued/);
  assert.equal(pending.formations.find(entry => entry.id === 'pickett-division').order, 'hold');
});

test('the assault brief follows actual control and pressure while withdrawal teaches its own objective', () => {
  const live = { time: 40, outcome: 'undecided', formations: [unit('A', { order: 'assault' })], gettysburg: { held: 0 } };
  assert.equal(getGettysburgCommandBrief(live, 'option_a').phase, 'Assault underway');
  live.formations[0].condition = 'wavering';
  assert.equal(getGettysburgCommandBrief(live, 'option_a').phase, 'Line under pressure');
  live.gettysburg.held = 7;
  assert.equal(getGettysburgCommandBrief(live, 'option_a').phase, 'Hold the foothold');
  for (const choice of ['option_b', 'option_c', 'option_d']) assert.match(getGettysburgCommandBrief(live, choice).message, /leave in order/);
});

test('formation advice distinguishes routed recovery, safe escape, pinning and exhausted ammunition', () => {
  assert.match(getGettysburgFormationAdvice(unit('A', { status: 'routing' })), /only available recovery order/);
  assert.match(getGettysburgFormationAdvice(unit('A', { withdrawn: true, withdrawalOrganized: false })), /do not count/);
  assert.match(getGettysburgFormationAdvice(unit('A', { withdrawn: true, withdrawalOrganized: true })), /count toward/);
  assert.match(getGettysburgFormationAdvice(unit('A', { readiness: { pinned: true } })), /Pinned/);
  assert.match(getGettysburgFormationAdvice(unit('A', { ammunition: 0 })), /Ammunition is exhausted/);
  assert.doesNotMatch(getGettysburgFormationAdvice(unit('A', { status: 'routing' })), /Use Fallback/);
});

test('optional staging reference covers actual formations with bounded independent destinations', () => {
  const engine = new CivilWarBattleEngine('gettysburg', { battleRulesVersion: 3 }, 'option_a');
  assert.equal(GETTYSBURG_STAGING_PLAN.length, 5);
  for (const step of GETTYSBURG_STAGING_PLAN) {
    assert.ok(engine.state.some(entry => entry.id === step.id));
    assert.ok(step.x >= 70 && step.x <= engine.world.width - 70 && step.y >= 45 && step.y <= engine.world.height - 35);
    assert.equal(Object.isFrozen(step), true);
  }
  assert.equal(new Set(GETTYSBURG_STAGING_PLAN.map(step => step.id)).size, 5);
  assert.ok(engine.state.every(entry => entry.order === 'hold'), 'reading the reference does not issue a group move');
});

test('the real after-action component renders captured troops separately from casualties', async () => {
  const cacheDir = mkdtempSync(join(tmpdir(), 'tow-command-brief-'));
  const vite = await createServer({ configLoader: 'native', cacheDir, plugins: [{
    name: 'brief-test-no-phaser', enforce: 'pre',
    resolveId(id) { if (id.endsWith('/battle/CivilWarBattlefield.jsx')) return '\0brief-test-field'; },
    load(id) { if (id === '\0brief-test-field') return 'export function CivilWarBattlefield() { return null; }'; },
  }], optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'silent' });
  try {
    const { GettysburgDebrief } = await vite.ssrLoadModule('/src/components/CivilWarBattleEncounter.jsx');
    const report = getGettysburgForceReport({ outcome: 'rout', formations: [unit('Captured brigade', { active: false, strength: 0, capturedStrength: 900, status: 'surrendered' })] });
    const html = renderToStaticMarkup(createElement(GettysburgDebrief, { report, assessment: { objective: { status: 'failed' } } }));
    assert.match(html, /data-state="captured"><dt>Captured<\/dt><dd>900/);
    assert.match(html, /data-state="casualties"><dt>Casualties<\/dt><dd>100/);
    assert.match(html, /Mission not completed/);
    assert.match(html, /75%/);
  } finally { await vite.close(); rmSync(cacheDir, { recursive: true, force: true }); }
});
