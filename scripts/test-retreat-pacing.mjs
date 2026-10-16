import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { BATTLE_ENGINE_CONFIGS } from '../src/battle/battleDefinitions.js';

const approx = (actual, expected, message = '') => {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${message}: ${actual} != ${expected}`);
};
const traveled = (before, after) => Math.hypot(after.x - before.x, after.y - before.y);
const modes = { line: 1, column: 1.18, skirmish: 1.08, deep: 0.9 };
const deployments = Object.entries(BATTLE_ENGINE_CONFIGS).flatMap(([scenarioId, config]) =>
  Object.keys(config.postures).map((choiceId) => ({ scenarioId, choiceId })));
const decisions = ['decisive-win', 'costly-win', 'disciplined-withdrawal', 'defeat', 'rout'];

function retreatFixture({ routing = false, type = 'infantry', mode = 'line' } = {}) {
  const engine = new CivilWarBattleEngine('first_manassas', {}, 'option_b');
  // Keep actual tick/command/routing logic, but prevent unrelated fire and contact.
  for (const unit of engine.state) {
    unit.x = unit.side === 'confederate' ? 100 : 1450;
    unit.y = 300;
    unit.ammunition = 0;
  }
  const unit = engine.state.find((candidate) => candidate.side === 'confederate' && candidate.active);
  Object.assign(unit, { type, formationMode: mode, fatigue: 10, morale: routing ? 17 : 70, cohesion: 70 });
  if (routing) engine.checkRouting(unit);
  else engine.order(unit.id, 'withdraw');
  return { engine, unit };
}

test('Shiloh ordered withdrawal reaches its own rear without crossing the Union line', () => {
  const engine = new CivilWarBattleEngine('shiloh', {}, 'option_d');
  const opening = engine.snapshot();
  for (const unit of engine.state.filter((unit) => unit.side === 'confederate')) {
    engine.order(unit.id, 'withdraw');
    assert.ok(unit.target.y < 0, `${unit.id} must retire toward the Confederate rear`);
  }
  for (let step = 0; step < 1100 && engine.outcome === 'undecided'; step += 1) engine.tick(0.05);
  const result = engine.snapshot();
  assert.equal(result.outcome, 'disciplined-withdrawal');
  assert.ok(result.time > 42 && result.time < 42.1, 'the authored withdrawal window must recognize the retreat');
  assert.equal(result.confederateLossRate, 0, 'retiring directly into a clear rear must not pass through Union fire');
  assert.equal(result.unionLossRate, 0);
  for (const unit of result.formations.filter((unit) => unit.side === 'confederate')) {
    assert.ok(unit.y < 245, 'the completed exit remains on the objective side');
    assert.ok(unit.y < opening.formations.find((entry) => entry.id === unit.id).y);
  }
});

test('Shiloh routing and decided retreats use the same side-specific rear as withdrawal orders', () => {
  for (const side of ['confederate', 'union']) {
    const engine = new CivilWarBattleEngine('shiloh', {}, 'option_b');
    const unit = engine.state.find((entry) => entry.side === side && entry.active);
    unit.morale = 17;
    engine.checkRouting(unit);
    assert.equal(unit.status, 'routing');
    assert.ok(side === 'confederate' ? unit.target.y < 0 : unit.target.y > engine.world.height);
    const y = unit.y;
    engine.moveUnit(unit, 0.05);
    assert.ok(side === 'confederate' ? unit.y < y : unit.y > y);
    engine.beginResolution(side === 'confederate' ? 'defeat' : 'decisive-win');
    const retreating = engine.state.filter((entry) => entry.side === side);
    assert.ok(retreating.every((entry) => side === 'confederate' ? entry.target.y < 0 : entry.target.y > engine.world.height));
  }
});

test('shared retreat targeting preserves the Winchester corridor and standard-map rear edges', () => {
  const winchester = new CivilWarBattleEngine('third_winchester', {}, 'option_b');
  const unit = winchester.state.find((entry) => entry.side === 'confederate' && entry.active);
  const corridor = winchester.winchesterRetreatTarget(unit);
  winchester.order(unit.id, 'withdraw');
  assert.deepEqual(unit.target, corridor);
  unit.morale = 17;
  winchester.checkRouting(unit);
  assert.deepEqual(unit.target, corridor);
  winchester.beginResolution('defeat');
  assert.equal(unit.target.x, corridor.x);
  assert.equal(unit.target.y, winchester.world.height + 100);

  for (const scenarioId of Object.keys(BATTLE_ENGINE_CONFIGS).filter((id) => !['shiloh', 'third_winchester'].includes(id))) {
    const engine = new CivilWarBattleEngine(scenarioId, {}, 'option_b');
    for (const formation of engine.state) {
      const target = engine.retreatTarget(formation, 85);
      assert.deepEqual(target, { x: formation.x, y: formation.side === 'confederate' ? engine.world.height + 85 : -85 });
    }
  }
});

test('Cold Harbor cannot award a holding victory after every defender leaves the field', () => {
  const engine = new CivilWarBattleEngine('cold_harbor', {}, 'option_b');
  for (const unit of engine.state.filter((unit) => unit.side === 'confederate')) engine.order(unit.id, 'withdraw');
  for (let step = 0; step < 3000 && engine.outcome === 'undecided'; step += 1) engine.tick(0.05);
  const result = engine.snapshot();
  assert.equal(result.outcome, 'defeat');
  assert.equal(result.entrenchmentState, 'abandoned');
  const departed = result.formations.filter((unit) => unit.side === 'confederate');
  assert.ok(departed.every((unit) => unit.withdrawn && !unit.active && unit.y > engine.world.height));
  assert.ok(departed.every((unit) => unit.order === 'hold' && unit.engagedWith === null && unit.defenseMultiplier === 1));
  assert.ok(!engine.coldHarborCrossfireTriggered, 'empty works cannot inflict an automatic crossfire shock');
});

test('a departed Cold Harbor unit cannot fire, take fire, reactivate, or be commanded during the remaining battle', () => {
  const engine = new CivilWarBattleEngine('cold_harbor', {}, 'option_b');
  const unit = engine.state.find((entry) => entry.id === 'kershaw-cold-harbor');
  engine.order(unit.id, 'withdraw');
  while (unit.active && engine.time < 20) engine.tick(0.05);
  assert.equal(unit.active, false);
  const departed = structuredClone(unit);
  engine.order(unit.id, 'advance');
  engine.move(unit.id, { x: 300, y: 650 });
  engine.setFormation(unit.id, 'column');
  while (engine.time < 60 && !engine.pendingOutcome) engine.tick(0.05);
  assert.deepEqual(unit, departed, 'departure freezes field participation while the remaining formations fight');
  assert.equal(engine.terrainDefense(unit), 1);
});

test('Cold Harbor still rewards a held defense and the authored organized Petersburg transfer', () => {
  for (const choiceId of ['option_b', 'option_d']) {
    const engine = new CivilWarBattleEngine('cold_harbor', {}, choiceId);
    if (choiceId === 'option_d') {
      for (const id of engine.config.transferFormationIds) engine.order(id, 'withdraw');
    }
    for (let step = 0; step < 3000 && engine.outcome === 'undecided'; step += 1) engine.tick(0.05);
    assert.equal(engine.outcome, choiceId === 'option_b' ? 'decisive-win' : 'disciplined-withdrawal');
    if (choiceId === 'option_d') {
      assert.equal(engine.transferState, 'transferred');
      assert.ok(engine.time >= engine.coldHarborAssaultStartTime + 20);
      assert.ok(engine.state.filter((unit) => engine.config.transferFormationIds.includes(unit.id)).every((unit) => unit.withdrawn && unit.withdrawalOrganized && !unit.active));
    } else assert.ok(engine.coldHarborWorksOccupied());
  }
});

test('routed or broken Cold Harbor transfer formations do not count as an organized operational withdrawal', () => {
  for (const condition of ['routing', 'broken']) {
    const engine = new CivilWarBattleEngine('cold_harbor', {}, 'option_d');
    const failedTransfer = engine.state.find((unit) => unit.id === engine.config.transferFormationIds[0]);
    failedTransfer.morale = 17;
    if (condition === 'broken') failedTransfer.strength = 0;
    engine.checkRouting(failedTransfer);
    for (const unit of engine.state.filter((unit) => unit.side === 'confederate')) engine.order(unit.id, 'withdraw');
    for (let step = 0; step < 3000 && engine.outcome === 'undecided'; step += 1) engine.tick(0.05);
    assert.notEqual(engine.transferState, 'transferred');
    assert.ok(['defeat', 'rout'].includes(engine.outcome));
  }
});

test('a Cold Harbor transfer that subsequently routs loses its withdrawal credit', () => {
  const engine = new CivilWarBattleEngine('cold_harbor', {}, 'option_d');
  for (const unit of engine.state.filter((unit) => unit.side === 'confederate')) engine.order(unit.id, 'withdraw');
  while (engine.transferState !== 'transferred' && engine.time < 10) engine.tick(0.05);
  assert.equal(engine.transferState, 'transferred');
  const exposedTransfer = engine.state.find((unit) => unit.id === engine.config.transferFormationIds[0]);
  assert.equal(exposedTransfer.active, true, 'the transfer has passed the staging line but not yet exited');
  exposedTransfer.morale = 17;
  engine.checkRouting(exposedTransfer);
  for (let step = 0; step < 3000 && engine.outcome === 'undecided'; step += 1) engine.tick(0.05);
  assert.ok(['defeat', 'rout'].includes(engine.outcome));
  assert.equal(exposedTransfer.withdrawalOrganized, false);
});

test('movement multiplier changes displacement only and defaults preserve previous speeds', () => {
  assert.equal(deployments.length, 44);
  for (const { scenarioId, choiceId } of deployments) {
    const engine = new CivilWarBattleEngine(scenarioId, {}, choiceId);
    for (const type of ['infantry', 'artillery']) for (const [formationMode, modeSpeed] of Object.entries(modes)) {
      for (const order of ['advance', 'withdraw']) {
        const original = {
          ...structuredClone(engine.state[0]), type, formationMode, order, fatigue: 10,
          target: { x: engine.state[0].x + 600, y: engine.state[0].y + 800 },
        };
        const normal = structuredClone(original);
        const explicit = structuredClone(original);
        const slower = structuredClone(original);
        const dt = 0.05;
        const base = order === 'withdraw' ? 38 : type === 'artillery' ? 13 : 25;
        const expected = base * modeSpeed * engine.terrainMovementMultiplier(original) * dt;
        engine.moveUnit(normal, dt);
        engine.moveUnit(explicit, dt, 1);
        engine.moveUnit(slower, dt, 0.85);
        assert.deepEqual(normal, explicit, 'omitted multiplier must remain exactly equivalent to 1');
        approx(traveled(original, normal), expected, `${scenarioId}:${choiceId}:${type}:${formationMode}:${order}`);
        approx(slower.x - original.x, (normal.x - original.x) * 0.85);
        approx(slower.y - original.y, (normal.y - original.y) * 0.85);
        approx(normal.fatigue, 10 + dt * (order === 'withdraw' ? 0.72 : 0.38));
        const { x: normalX, y: normalY, ...normalRest } = normal;
        const { x: slowerX, y: slowerY, ...slowerRest } = slower;
        assert.deepEqual(slowerRest, normalRest, 'speed scaling must not scale fatigue or other unit state');
        assert.ok(Number.isFinite(normalX + normalY + slowerX + slowerY));
      }
    }
  }
});

test('active routed withdrawal is 15 percent slower than unchanged manual withdrawal', () => {
  for (const type of ['infantry', 'artillery']) for (const [mode, modeSpeed] of Object.entries(modes)) {
    const normal = retreatFixture({ type, mode });
    const routed = retreatFixture({ routing: true, type, mode });
    const normalStart = structuredClone(normal.unit);
    const routedStart = structuredClone(routed.unit);
    assert.equal(routed.unit.status, 'routing');
    for (let step = 0; step < 20; step += 1) {
      normal.engine.tick(0.05);
      routed.engine.tick(0.05);
      const elapsed = (step + 1) * 0.05;
      approx(traveled(normalStart, normal.unit), 38 * modeSpeed * elapsed, 'manual retreat speed');
      approx(traveled(routedStart, routed.unit), traveled(normalStart, normal.unit) * 0.85, 'routed retreat speed');
      approx(normal.unit.fatigue, 10 + elapsed * 0.72);
      approx(routed.unit.fatigue, normal.unit.fatigue, 'routed fatigue must not receive the speed multiplier');
      assert.equal(routed.unit.status, 'routing', 'routing status must survive the withdrawal branch');
      assert.equal(normal.unit.status, 'steady');
      for (const { engine, unit } of [normal, routed]) {
        assert.equal(unit.strength, unit.initialStrength);
        assert.equal(unit.ammunition, 0);
        assert.equal(unit.volleySerial, 0);
        assert.equal(engine.outcome, 'undecided');
      }
    }
  }
});

test('withdrawal captures routing status before resetting it and applies slowing on the next routed tick', () => {
  const { engine, unit } = retreatFixture();
  unit.morale = 17;
  const start = structuredClone(unit);
  assert.equal(unit.status, 'steady');
  engine.tick(0.05);
  approx(traveled(start, unit), 38 * 0.05, 'not yet routing at tick entry');
  assert.equal(unit.status, 'routing');
  const routedStart = structuredClone(unit);
  engine.tick(0.05);
  approx(traveled(routedStart, unit), 38 * 0.05 * 0.85, 'already routing at tick entry');
  approx(unit.fatigue, start.fatigue + 0.1 * 0.72);
});

test('morale 18, cohesion 13, strength 12 percent and broken 4.5 percent boundaries are unchanged', () => {
  const engine = new CivilWarBattleEngine('first_manassas', {}, 'option_b');
  const cases = [
    [{ morale: 18, cohesion: 13 }, 'steady'],
    [{ morale: 18 - 1e-6 }, 'routing'],
    [{ morale: 18 + 1e-6 }, 'steady'],
    [{ cohesion: 13 - 1e-6 }, 'routing'],
    [{ cohesion: 13 + 1e-6 }, 'steady'],
    [{ strength: 120 + 1e-6 }, 'steady'],
    [{ strength: 120 }, 'routing'],
    [{ strength: 120 - 1e-6 }, 'routing'],
    [{ strength: 45 + 1e-6 }, 'routing'],
    [{ strength: 45 }, 'broken'],
    [{ strength: 45 - 1e-6 }, 'broken'],
    [{ strength: 0 }, 'broken'],
    [{ morale: 0, strength: 1000 }, 'routing'],
  ];
  for (const side of ['confederate', 'union']) for (const [changes, expected] of cases) {
    const unit = {
      ...structuredClone(engine.state[0]), side, initialStrength: 1000, strength: 1000,
      morale: 70, cohesion: 70, status: 'steady', order: 'hold', ...changes,
    };
    const before = structuredClone(unit);
    engine.checkRouting(unit);
    assert.equal(unit.status, expected, `${side}:${JSON.stringify(changes)}`);
    assert.equal(unit.strength, before.strength);
    assert.equal(unit.morale, before.morale);
    assert.equal(unit.cohesion, before.cohesion);
    assert.equal(unit.ammunition, before.ammunition);
    if (expected === 'steady') assert.deepEqual(unit, before);
    else {
      assert.equal(unit.order, 'withdraw');
      assert.deepEqual(unit.target, { x: unit.x, y: side === 'confederate' ? engine.world.height + 85 : -85 });
    }
  }
});

test('broken and inactive formations do not acquire retreat movement in active battle ticks', () => {
  for (const change of [{ active: false }, { status: 'broken' }]) {
    const { engine, unit } = retreatFixture({ routing: true });
    Object.assign(unit, change);
    const before = structuredClone(unit);
    engine.tick(0.05);
    assert.deepEqual(unit, before);
  }
});

test('pause and terminal ticks remain inert for active retreats and resolution', () => {
  for (const resolution of [false, true]) {
    const { engine } = retreatFixture({ routing: true });
    if (resolution) engine.beginResolution('defeat');
    const before = engine.snapshot();
    const resolutionTime = engine.resolutionTime;
    for (const dt of [0, -1, NaN, Infinity]) engine.tick(dt);
    assert.deepEqual(engine.snapshot(), before);
    assert.equal(engine.resolutionTime, resolutionTime);
  }
});

const combatValues = (snapshot) => ({
  time: snapshot.time, score: snapshot.score, commanderStatus: snapshot.commanderStatus,
  confederateLossRate: snapshot.confederateLossRate, unionLossRate: snapshot.unionLossRate,
  ammunitionRate: snapshot.ammunitionRate, events: snapshot.events,
  formations: snapshot.formations.map((unit) => ({
    id: unit.id, active: unit.active, strength: unit.strength, initialStrength: unit.initialStrength,
    ammunition: unit.ammunition, reload: unit.reload, volleySerial: unit.volleySerial,
    lastVolleyAt: unit.lastVolleyAt, morale: unit.morale, cohesion: unit.cohesion,
  })),
});

for (const { scenarioId, choiceId } of deployments) {
  test(`resolution pacing preserves the decided result and combat values: ${scenarioId}:${choiceId}`, () => {
    for (const decision of decisions) {
      const engine = new CivilWarBattleEngine(scenarioId, {}, choiceId);
      // Nonzero losses/ammunition use make preservation checks meaningful without replaying a whole battle.
      for (const unit of engine.state) { unit.strength *= 0.8; unit.ammunition = Math.max(0, unit.ammunition - 2); }
      const before = engine.snapshot();
      const preserved = structuredClone(combatValues(before));
      engine.beginResolution(decision);
      assert.equal(engine.resolutionDuration, 5.4);
      const opening = engine.snapshot();
      assert.deepEqual(combatValues(opening), preserved);
      const losingSide = ['decisive-win', 'costly-win'].includes(decision) ? 'union' : 'confederate';
      const winners = opening.formations.filter((unit) => unit.side !== losingSide);
      assert.ok(winners.length > 0);
      assert.ok(winners.every((unit) => unit.order === 'hold'));

      const commandUnit = opening.formations.find((unit) => unit.side === 'confederate' && unit.active);
      engine.order(commandUnit.id, 'advance');
      engine.move(commandUnit.id, { x: 300, y: 300 });
      engine.setFormation(commandUnit.id, 'column');
      assert.deepEqual(engine.snapshot(), opening, 'commands cannot reopen the decided battle');

      engine.tick(0.05);
      const first = engine.snapshot();
      for (const unit of first.formations.filter((candidate) => candidate.side === losingSide)) {
        const start = opening.formations.find((candidate) => candidate.id === unit.id);
        if (scenarioId === 'third_winchester' && !start.active) {
          assert.deepEqual(unit, start, 'Winchester inactive reserves and escaped units remain stationary');
          continue;
        }
        const oldPace = 38 * modes[start.formationMode] * start.movementMultiplier * 0.05 * 4.4;
        const expected = oldPace * (2.8 / 4.4);
        approx(traveled(start, unit), expected, `${decision}:${unit.id}: finale speed is 36.36 percent lower`);
        if (scenarioId === 'third_winchester' && decision === 'disciplined-withdrawal') {
          assert.equal(unit.status, 'steady');
          assert.equal(unit.order, 'withdraw');
        }
      }
      assert.deepEqual(combatValues(first), preserved);

      let ticks = 1;
      while (engine.pendingOutcome && ticks < 120) {
        const snapshot = engine.snapshot();
        assert.deepEqual(snapshot.formations.filter((unit) => unit.side !== losingSide), winners, 'victors stay locked in place');
        if (scenarioId === 'third_winchester') {
          assert.deepEqual(snapshot.formations.filter((unit) => !unit.active), opening.formations.filter((unit) => !unit.active), 'inactive Winchester formations remain fixed throughout resolution');
        }
        assert.deepEqual(combatValues(snapshot), preserved, 'resolution cannot add combat, losses, or ammunition use');
        assert.equal(snapshot.decision, decision);
        if (engine.resolutionTime < 5.4) assert.equal(snapshot.outcome, 'undecided');
        engine.tick(0.05);
        ticks += 1;
      }
      const final = engine.snapshot();
      assert.equal(final.outcome, decision);
      assert.equal(final.resolving, false);
      assert.equal(final.decision, null);
      assert.ok(engine.resolutionTime >= 5.4 && engine.resolutionTime <= 5.45 + 1e-8, 'finish at 5.4 seconds, allowing one floating-point substep');
      assert.deepEqual(final.formations.filter((unit) => unit.side !== losingSide), winners);
      assert.deepEqual(combatValues(final), preserved);
      engine.tick(1);
      engine.order(commandUnit.id, 'withdraw');
      assert.deepEqual(engine.snapshot(), final, 'completed resolution remains immutable');
    }
  });
}
