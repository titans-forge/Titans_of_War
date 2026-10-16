import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFreshCampaignState, createCampaignSnapshot, restoreCampaignFromSnapshot } from '../src/game/campaignStorage.js';
import { selectRecoveryAllocation, commitRecoveryAllocation } from '../src/game/campaignSupply.js';
import { advanceCampaignTurn } from '../src/game/headlessCampaign.js';
import { applyBattleResolution } from '../src/game/battles.js';
import { createAfterAction, isAfterActionReport } from '../src/game/campaignExperience.js';

const scene = { id: 'debrief-fixture', title: 'Allocation test', turn: 1, choices: [{ id: 'wait', text: 'Wait', consequence: 'Waited', effects: { metrics: {} } }] };
const row = (report, key) => report.deltas.find(item => item.key === key);
function reconcile(report) {
  assert.ok(isAfterActionReport(report));
  for (const item of report.deltas) {
    assert.ok(Math.abs(Object.values(item.breakdown).reduce((sum, part) => sum + part, 0) - (item.after - item.before)) < 1e-10, `${item.key} must reconcile`);
    assert.equal(item.breakdown.other, 0, `${item.key} has no unexplained changes`);
  }
}

for (const difficulty of ['story', 'standard']) {
  for (const allocation of ['purchase', 'emergency', 'levy']) {
    for (const battle of [false, true]) {
      test(`${difficulty} ${allocation}: ${battle ? 'battle' : 'campaign'} debrief separates recovery, losses and upkeep`, () => {
        const initial = createFreshCampaignState(1861, scene.id, { difficulty });
        if (allocation === 'levy') initial.metrics.treasury = 10;
        const planned = selectRecoveryAllocation(initial, allocation);
        const untouched = structuredClone(planned);
        assert.deepEqual(planned.metrics, initial.metrics, 'selection is only a plan');
        const funded = commitRecoveryAllocation(planned);
        const battleState = battle ? applyBattleResolution(funded, { scenarioId: scene.id, battleId: scene.id, result: 'costly-win', score: 60 }) : null;
        const result = advanceCampaignTurn(battleState || planned, scene, scene.choices[0], [scene]);
        const report = createAfterAction(planned, result.state, result.historyEntry, result.nextScenario, battleState, battle ? funded : null);
        reconcile(report);
        for (const item of report.deltas) {
          assert.equal(item.breakdown.allocation || 0, funded.metrics[item.key] - planned.metrics[item.key], `${item.key} recovery credit`);
          assert.equal(item.breakdown.battle, battle ? battleState.metrics[item.key] - funded.metrics[item.key] : 0, `${item.key} battle credit`);
        }
        assert.equal(row(report, 'treasury').breakdown.upkeep, difficulty === 'story' ? -1 : -3);
        assert.deepEqual(planned, untouched, 'resolution leaves the precommit state intact');
        assert.equal(result.state.campaignEconomy.emergencyUsed, allocation === 'emergency' ? 1 : 0, 'one allocation per completed decision');
        const snapshot = createCampaignSnapshot({ ...result.state, pendingDebrief: report }, scene);
        const restored = restoreCampaignFromSnapshot(JSON.parse(JSON.stringify(snapshot)), [scene]);
        assert.ok(restored, 'new-rules report can be restored');
        assert.deepEqual(restored.state.pendingDebrief, report, 'saved report preserves exact attribution');
      });
    }
  }
}

test('an allocation at the resource cap reports only the applied recovery', () => {
  const initial = createFreshCampaignState(1861, scene.id);
  initial.metrics = { militaryStrength: 99, munitions: 99, treasury: 99, foodSupply: 99, publicMorale: 99 };
  const planned = selectRecoveryAllocation(initial, 'purchase');
  const result = advanceCampaignTurn(planned, scene, scene.choices[0], [scene]);
  const report = createAfterAction(planned, result.state, result.historyEntry, result.nextScenario);
  reconcile(report);
  for (const key of ['militaryStrength', 'munitions', 'foodSupply']) assert.equal(row(report, key).breakdown.allocation, 1);
  assert.equal(row(report, 'treasury').breakdown.allocation, -12);
});
