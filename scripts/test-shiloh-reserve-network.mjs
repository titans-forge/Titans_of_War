import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { objectiveOrganized } from '../src/battle/objectiveControl.js';
import { shilohReserveNetwork, shilohReserveState } from '../src/battle/shilohReserveObjective.js';

const ids = ['hardee-corps', 'bragg-corps', 'polk-corps'];
const reserveId = 'breckinridge-reserve';
const edge = (from, to) => ({ from, to });
const unit = (id, x, y) => ({
  id, x, y, side: 'confederate', active: true, strength: 1000, initialStrength: 1000,
  morale: 75, cohesion: 65, order: 'hold', status: 'steady', directMove: false, ammunition: 10,
});
const line = () => [unit(ids[0], 0, 0), unit(ids[1], 340, 0), unit(ids[2], 680, 0), unit(reserveId, 0, 340)];

test('the support map emits unique links and uses the inclusive 340 range', () => {
  const army = line();
  const enemy = Object.freeze({ ...unit('enemy', 0, 0), side: 'union' });
  const formations = Object.freeze([...army.map(Object.freeze), enemy]);
  const network = shilohReserveNetwork(formations);
  assert.deepEqual(network.frontLinks, [edge(ids[0], ids[1]), edge(ids[1], ids[2])]);
  assert.deepEqual(network.reserveLinks, [edge(reserveId, ids[0])]);
  assert.equal(network.supporting, 3);
  assert.equal(network.organizedRatio, 1);
  assert.equal(network.reserveReady, true);
  assert.equal(network.supported, true);
  assert.equal(network.nearestFrontId, ids[0]);
  assert.equal(network.nearestSupportDistance, 340);
  assert.equal(network.frontIssue, null);
  assert.equal(network.reserveIssue, null);
});

test('the nearest connected corps can differ from the nearest formation', () => {
  const army = [unit(ids[0], 0, 0), unit(ids[1], 1000, 0), unit(ids[2], 1200, 0), unit(reserveId, 0, 10)];
  const network = shilohReserveNetwork(army);
  assert.deepEqual(network.frontLinks, [edge(ids[1], ids[2])]);
  assert.deepEqual(network.reserveLinks, []);
  assert.equal(network.nearestFrontId, ids[1]);
  assert.equal(network.nearestSupportDistance, Math.hypot(1000, 10));
  assert.equal(network.frontIssue, null);
  assert.match(network.reserveIssue, /1001 field units.*340/);
  army[1].x = 800;
  assert.match(shilohReserveNetwork(army).frontIssue, /within 340/);
  assert.equal(shilohReserveNetwork(army).nearestFrontId, null);
  assert.equal(shilohReserveNetwork(army).nearestSupportDistance, null);
  assert.match(shilohReserveNetwork(army).reserveIssue, /Link two front corps/);
  army[1].order = 'move';
  army[2].status = 'routing';
  assert.match(shilohReserveNetwork(army).frontIssue, /organized and in a fighting posture/);
});

test('unready reserve reports the cause without inventing a support link', () => {
  for (const [patch, reason] of [
    [{ directMove: true }, /moving/],
    [{ order: 'fallback' }, /falling back/],
    [{ order: 'withdraw' }, /withdrawing/],
    [{ order: 'rally' }, /rallying/],
    [{ ammunition: 0 }, /out of ammunition/],
    [{ strength: 599 }, /at least 60%/],
    [{ status: 'routing' }, /routing/],
    [{ active: false }, /off the field/],
    [{ cohesion: 24 }, /25 cohesion/],
  ]) {
    const army = line();
    Object.assign(army.at(-1), patch);
    const network = shilohReserveNetwork(army);
    assert.match(network.reserveIssue, reason);
    assert.equal(network.reserveReady, false);
    assert.equal(network.supported, false);
    assert.deepEqual(network.reserveLinks, []);
    assert.equal(network.nearestSupportDistance, 340);
    assert.equal(network.nearestFrontId, ids[0]);
  }
});

// The pre-network adjudication computes a count with directional checks.
// Compare that independent expression with the shared undirected graph.
function priorFactors(formations) {
  const army = formations.filter(formation => formation.side === 'confederate');
  const holding = formation => objectiveOrganized(formation) && !formation.directMove
    && !['move', 'withdraw', 'fallback', 'rally'].includes(formation.order);
  const isNearby = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) <= 340;
  const organizedRatio = army.filter(holding).reduce((total, formation) => total + formation.strength, 0)
    / Math.max(1, army.reduce((total, formation) => total + formation.initialStrength, 0));
  const front = army.filter(formation => ids.includes(formation.id) && holding(formation));
  const pair = front.filter(a => front.some(b => a.id !== b.id && isNearby(a, b)));
  const reserve = army.find(formation => formation.id === reserveId);
  const reserveReady = Boolean(reserve && holding(reserve) && reserve.strength >= reserve.initialStrength * .6 && reserve.ammunition > 0);
  return { organizedRatio, supporting: pair.length, reserveReady, supported: reserveReady && pair.some(unit => isNearby(unit, reserve)) };
}

const factors = ({ organizedRatio, supporting, reserveReady, supported }) => ({ organizedRatio, supporting, reserveReady, supported });
const campaign = { rulesVersion: 2, battleRulesVersion: 18, seed: 1862,
  metrics: { militaryStrength: 85, munitions: 85, foodSupply: 85, treasury: 85, publicMorale: 85 } };

test('live and revived Shiloh views match the existing mission factors', () => {
  const engine = new CivilWarBattleEngine('shiloh', campaign, 'option_b');
  assert.equal(engine.order(reserveId, 'move', { x: 450, y: 120 }), true);
  for (let frame = 0; frame < 1300 && engine.outcome === 'undecided'; frame++) {
    engine.tick(.1);
    if (frame % 80 !== 0) continue;
    const snapshot = engine.snapshot({ presentation: true });
    const authored = priorFactors(engine.state);
    assert.deepEqual(factors(shilohReserveNetwork(engine.state)), authored);
    assert.deepEqual(factors(shilohReserveNetwork(snapshot.formations)), authored);
    assert.deepEqual(factors(shilohReserveState(engine)), authored);
  }
  const checkpoint = JSON.parse(JSON.stringify(engine.checkpoint()));
  const replay = CivilWarBattleEngine.fromCheckpoint(checkpoint, 'shiloh', campaign, 'option_b');
  const beforeRead = replay.checkpoint();
  assert.deepEqual(shilohReserveNetwork(replay.snapshot().formations), shilohReserveNetwork(engine.snapshot().formations));
  assert.deepEqual(replay.checkpoint(), beforeRead);
  assert.equal(Object.hasOwn(replay.snapshot().fieldBattle.reserveObjective, 'frontLinks'), false);
});
