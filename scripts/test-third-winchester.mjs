import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createServer } from 'vite';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { BATTLE_ENGINE_CONFIGS, getBattleEngineConfig } from '../src/battle/battleDefinitions.js';
import { canCommand } from '../src/battle/battleUsability.js';
import { createFormationVisual, updateFormationVisual } from '../src/battle/formationVisualState.js';
import { BATTLE_SCENARIOS, applyBattleResolution, battleChoiceSuccessModifier, battleForScenario, battleReadiness, delegateBattle } from '../src/game/battles.js';
import { CAMPAIGN_SAVE_VERSION, createCampaignSnapshot, createFreshCampaignState, getCampaignSnapshotCompatibility, restoreCampaignFromSnapshot } from '../src/game/campaignStorage.js';
import { advanceCampaignTurn } from '../src/game/headlessCampaign.js';
import { choiceScoreCard, resolveChoiceScoreCard } from '../src/game/simulationEngine.js';

const id = 'third_winchester';
const choices = ['option_a', 'option_b', 'option_c', 'option_d'];
const validResults = new Set(['decisive-win', 'costly-win', 'disciplined-withdrawal', 'defeat', 'rout']);
const profiles = {
  normal: { militaryStrength: 85, munitions: 80, treasury: 75, foodSupply: 78, publicMorale: 80 },
  weak: { militaryStrength: 38, munitions: 34, treasury: 45, foodSupply: 40, publicMorale: 42 },
  strong: { militaryStrength: 96, munitions: 94, treasury: 85, foodSupply: 92, publicMorale: 94 },
};
const config = BATTLE_ENGINE_CONFIGS[id];
const battle = BATTLE_SCENARIOS[id];
const jsonClone = (value) => JSON.parse(JSON.stringify(value));
const approx = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

// Captured before Third Winchester was added. Keep old snapshot keys in their
// original order while permitting new scenario-specific diagnostic fields.
const legacyKeys = ['scenarioId', 'time', 'formations', 'outcome', 'resolving', 'decision', 'confederateLossRate', 'unionLossRate', 'ammunitionRate', 'score', 'commanderStatus', 'reinforcementEta', 'surpriseState', 'assaultState', 'gapState', 'exploitationState', 'entrenchmentState', 'coldHarborAssaultState', 'transferState', 'craterState', 'mineState', 'sortieState', 'sortieTargetsHit', 'disciplineBroken', 'fieldStatus', 'events'];
const legacyDigests = {
  first_manassas: '506a64534fa23954c3e60c237e51759dc8142fa83dbc2e600263105691f83b94',
  // Updated for Shiloh's authored retreat edges.
  shiloh: '2350bd2e399505ffd2266be25e6f55d0fc03fc01d6cdbe103fac9f18d12dda0e',
  chancellorsville: 'e447758e8ee88246f2c095119f7db05939829e949fd005d8d7703c4508b9fc8b',
  wilderness: '0b2e3e8410fcb68d094ea6867b90ed154228ada9ec83065f86764a48130dfb3e',
  cedar_creek: '1db5ced2247f33a2efdda9056aa32aaffe37287b4e8892481489553efcecc514',
  gettysburg: 'e5684344df2c835f0014a33c3e3b1e38d8abf20b57c4144f34b42d7b694eb1e7',
  gettysburg_jackson: '6e644d776b7d96da08e260f4f13d135e1a6657d664817b6b6d2a9c875f1c6a85',
  chickamauga: 'd353b1d17c56f6c521bd3068b97f0f22a917d5e375600daeb6e5196e4bc1fe4b',
  // Updated for real field exits and occupied works at Cold Harbor.
  cold_harbor: 'ef3d79f0ce4336c973cd46c26c0938e2634b12d9a725b50c024c9c8739d6c0d9',
  petersburg: 'ebb7e82b67f53f53fd8f3cf20c1addbe3dded5a12c5a9627d3a2014acf8e6f0f',
};

function commandAll(engine, order) {
  for (const unit of engine.state.filter(canCommand)) engine.order(unit.id, order);
}

function assertFinite(snapshot) {
  for (const key of ['time', 'score', 'confederateLossRate', 'unionLossRate', 'ammunitionRate']) assert.ok(Number.isFinite(snapshot[key]), key);
  for (const unit of snapshot.formations) {
    for (const key of ['x', 'y', 'facing', 'strength', 'morale', 'cohesion', 'ammunition', 'fatigue']) assert.ok(Number.isFinite(unit[key]), `${unit.id}:${key}`);
  }
}

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  const { STATIC_SCENARIOS } = await vite.ssrLoadModule('/src/game/scenarios.js');
  const scenario = STATIC_SCENARIOS.find((entry) => entry.id === id);
  const stateFor = (profile = 'normal') => ({
    ...createFreshCampaignState(1861, id, { battleRulesVersion: 2 }), currentTurn: scenario.turn,
    actor: scenario.actor, roleLabel: scenario.roleLabel, divergenceIndex: 0.2,
    metrics: { ...profiles[profile] },
  });
  const played = new Map();

  await test('Third Winchester config, campaign scenario, choices and opening selection agree', () => {
    assert.ok(config, 'Galileo must register the Third Winchester engine config');
    assert.ok(battle, 'Hypatia must register the campaign battle');
    assert.ok(scenario);
    assert.equal(config.id, id);
    assert.equal(battle.id, id);
    assert.equal(battle.scenarioId, id);
    assert.equal(getBattleEngineConfig(id), config);
    assert.notEqual(config, getBattleEngineConfig('first_manassas'));
    assert.throws(() => getBattleEngineConfig('unsupported-battle'), /Unsupported Civil War battle/);
    assert.deepEqual(Object.keys(config.postures).sort(), choices);
    assert.deepEqual(scenario.choices.map((choice) => choice.id).sort(), choices);
    assert.equal(battle.defaultSelection, config.defaultSelection);
    const opening = new CivilWarBattleEngine(id, stateFor(), 'option_b').snapshot();
    assert.equal(opening.scenarioId, id);
    assert.ok(opening.formations.find((unit) => unit.id === battle.defaultSelection && canCommand(unit)));
    assert.ok(!opening.formations.some((unit) => unit.id === 'jackson-brigade'));
    assert.equal(new Set(opening.formations.map((unit) => unit.id)).size, opening.formations.length);
    assert.ok(opening.formations.reduce((sum, unit) => sum + (unit.type === 'artillery' ? 1 : 32), 0) <= 700);
    assert.ok(config.maxTime > 0 && config.maxTime < 300);
    assertFinite(opening);
  });

  for (const [legacyId, digest] of Object.entries(legacyDigests)) {
    await test(`frozen battle replay: ${legacyId}, all four choices`, () => {
      const outcomes = [];
      for (const choice of choices) {
        const engine = new CivilWarBattleEngine(legacyId, { metrics: { militaryStrength: 85, munitions: 80, publicMorale: 80 } }, choice);
        const cap = Math.ceil((engine.config.maxTime + engine.resolutionDuration + 2) / 0.05);
        for (let step = 0; step < cap && engine.outcome === 'undecided'; step += 1) {
          if ([0, 200, 400].includes(step)) commandAll(engine, step === 0 ? 'advance' : step === 200 ? 'withdraw' : 'hold');
          engine.tick(0.05);
        }
        const snapshot = engine.snapshot();
        assert.ok(validResults.has(snapshot.outcome));
        outcomes.push(Object.fromEntries(legacyKeys.map((key) => [key, snapshot[key]])));
      }
      assert.equal(createHash('sha256').update(JSON.stringify(outcomes)).digest('hex'), digest);
    });
  }

  for (const profile of Object.keys(profiles)) for (const choice of choices) {
    await test(`deterministic bounded outcomes for defaults and four command policies: ${profile}:${choice}`, (context) => {
      const outcomes = {};
      for (const policy of ['default', 'hold', 'advance', 'withdraw', 'covered']) {
        const state = stateFor(profile);
        const before = structuredClone(state);
        const engines = [new CivilWarBattleEngine(id, state, choice), new CivilWarBattleEngine(id, structuredClone(state), choice)];
        assert.deepEqual(engines[0].snapshot(), engines[1].snapshot());
        const cap = Math.ceil((config.maxTime + engines[0].resolutionDuration + 2) / 0.05);
        for (let step = 0; step < cap && engines[0].outcome === 'undecided'; step += 1) {
          for (const engine of engines) {
            if (step === 0 && !['default', 'covered'].includes(policy)) commandAll(engine, policy);
            if (step === 0 && policy === 'covered' && choice !== 'option_d') commandAll(engine, 'hold');
            if (policy === 'covered' && !engine.pendingOutcome
              && (engine.thirdWinchester.middleFieldHeld >= config.middleFieldHoldRequired || engine.thirdWinchester.rearguardHeld >= config.rearguardHoldRequired)) commandAll(engine, 'withdraw');
            engine.tick(0.05);
          }
          if (step % 20 === 0) {
            assert.deepEqual(engines[0].snapshot(), engines[1].snapshot());
            assertFinite(engines[0].snapshot());
          }
        }
        const snapshot = engines[0].snapshot();
        assert.deepEqual(snapshot, engines[1].snapshot());
        assert.deepEqual(state, before, 'field play must not mutate the campaign input');
        assert.ok(validResults.has(snapshot.outcome), `${policy} must terminate within the authored time cap`);
        assert.equal(snapshot.resolving, false);
        assert.ok(snapshot.time <= config.maxTime + 0.05 + 1e-8);
        assertFinite(snapshot);
        engines[0].tick(1);
        assert.deepEqual(engines[0].snapshot(), snapshot, 'finished battle must remain immutable');
        played.set(`${profile}:${choice}:${policy}`, snapshot);
        outcomes[policy] = `${snapshot.outcome}, loss=${snapshot.confederateLossRate.toFixed(3)}, time=${snapshot.time.toFixed(1)}`;
      }
      context.diagnostic(JSON.stringify(outcomes));
    });
  }

  await test('holding under pressure earns a useful withdrawal, unlike an unsupported immediate escape', () => {
    for (const profile of Object.keys(profiles)) for (const choice of ['option_b', 'option_d']) {
      const covered = played.get(`${profile}:${choice}:covered`);
      const immediate = played.get(`${profile}:${choice}:withdraw`);
      const held = played.get(`${profile}:${choice}:hold`);
      assert.equal(covered.outcome, 'disciplined-withdrawal');
      assert.equal(covered.thirdWinchester.withdrawalState, 'secured');
      assert.ok(covered.thirdWinchester.escapedRatio >= 0.65);
      assert.ok(covered.confederateLossRate < held.confederateLossRate);
      assert.ok(covered.score > immediate.score, 'earned covering objectives must improve tactical grading');
      assert.notEqual(immediate.outcome, 'disciplined-withdrawal');
      assert.ok(covered.thirdWinchester.middleFieldHeld >= config.middleFieldHoldRequired
        || covered.thirdWinchester.rearguardHeld >= config.rearguardHoldRequired);
    }
    for (const choice of choices) {
      const weak = played.get(`weak:${choice}:covered`);
      const strong = played.get(`strong:${choice}:covered`);
      assert.ok(strong.formations.filter((unit) => unit.side === 'confederate').reduce((sum, unit) => sum + unit.initialStrength, 0)
        > weak.formations.filter((unit) => unit.side === 'confederate').reduce((sum, unit) => sum + unit.initialStrength, 0));
      assert.ok(strong.confederateLossRate < weak.confederateLossRate, 'readiness affects actual field losses, not just labels');
    }
  });

  await test('secured Winchester survivors finish in orderly withdrawal poses, not routing poses', () => {
    for (const choice of ['option_b', 'option_d']) {
      const engine = new CivilWarBattleEngine(id, stateFor(), choice);
      let previous = engine.snapshot();
      for (let step = 0; step < 3000 && !engine.pendingOutcome && engine.outcome === 'undecided'; step += 1) {
        if (engine.thirdWinchester.middleFieldHeld >= config.middleFieldHoldRequired
          || engine.thirdWinchester.rearguardHeld >= config.rearguardHoldRequired) commandAll(engine, 'withdraw');
        previous = engine.snapshot();
        engine.tick(0.05);
      }
      assert.equal(engine.pendingOutcome, 'disciplined-withdrawal');
      const opening = engine.snapshot();
      assert.equal(opening.thirdWinchester.withdrawalState, 'secured');
      const returningIds = previous.formations.filter((unit) => unit.side === 'confederate' && unit.active && !['routing', 'broken'].includes(unit.status)).map((unit) => unit.id);
      const escaped = opening.formations.filter((unit) => unit.withdrawn);
      assert.ok(escaped.length > 0);
      const views = new Map(previous.formations.map((unit) => {
        const view = createFormationVisual(unit, unit.type === 'artillery' ? 1 : 32, previous.time);
        updateFormationVisual(view, unit, previous.time, 1);
        return [unit.id, view];
      }));
      const values = (snapshot) => ({
        time: snapshot.time, score: snapshot.score, confederateLossRate: snapshot.confederateLossRate,
        unionLossRate: snapshot.unionLossRate,
        units: snapshot.formations.map(({ id: unitId, strength, ammunition }) => ({ id: unitId, strength, ammunition })),
      });
      let sawOrderlyWalking = false;
      for (let tick = 0; tick < 120 && engine.pendingOutcome; tick += 1) {
        engine.tick(0.05);
        const snapshot = engine.snapshot();
        assert.deepEqual(values(snapshot), values(opening));
        assert.deepEqual(snapshot.formations.filter((unit) => unit.withdrawn), escaped, 'already escaped formations stay off-field and stationary');
        for (const unit of snapshot.formations.filter((entry) => returningIds.includes(entry.id) && entry.active)) {
          assert.notEqual(unit.status, 'routing');
          const output = updateFormationVisual(views.get(unit.id), unit, snapshot.time + engine.resolutionTime, 1, { resolving: true });
          const survivors = output.figures.filter((figure) => figure.visible && !figure.fallen);
          assert.ok(survivors.every((figure) => figure.action !== 'route'));
          sawOrderlyWalking ||= survivors.some((figure) => figure.action === 'walk');
        }
      }
      assert.ok(sawOrderlyWalking, 'the surviving rear guard must visibly walk out, not freeze');
      assert.equal(engine.outcome, 'disciplined-withdrawal');
    }
  });

  await test('Winchester time-cap and objectives cannot fall through to the default Manassas result', () => {
    for (const choice of choices) {
      const engine = new CivilWarBattleEngine(id, stateFor(), choice);
      assert.match(engine.fieldStatus().label, /Middle Field/);
      assert.deepEqual(engine.snapshot().thirdWinchester, engine.thirdWinchester);
      engine.time = config.maxTime;
      engine.judgeOutcome();
      assert.equal(engine.pendingOutcome, 'defeat', 'an unearned intact army at the time cap is not a default Manassas withdrawal');
    }
  });

  await test('terrain is the approved asset and coordinates put Winchester lower-left and Crook on the right', () => {
    const terrain = readFileSync(new URL(`../public/${config.terrain.src}`, import.meta.url));
    assert.equal(terrain.length, 412750);
    assert.equal(createHash('sha256').update(terrain).digest('hex'), '868367c311d8f6a8d9a1c260b1b83a9923d48d81f0aeb7a93e71c40b79382bad');
    assert.ok(config.withdrawalCorridor.right < config.world.width / 2);
    assert.ok(config.withdrawalCorridor.top > config.world.height * 0.75);
    for (const choice of choices) {
      const engine = new CivilWarBattleEngine(id, stateFor(), choice);
      for (const unit of engine.state.filter((entry) => entry.side === 'confederate' && canCommand(entry))) {
        const before = { x: unit.x, y: unit.y };
        engine.order(unit.id, 'withdraw');
        assert.ok(unit.target.x >= config.withdrawalCorridor.left && unit.target.x <= config.withdrawalCorridor.right);
        assert.ok(unit.target.y > config.withdrawalCorridor.top && unit.target.y <= config.world.height, 'target stays inside the visible lower-left exit');
        engine.moveUnit(unit, 0.05);
        assert.ok(unit.y > before.y, 'screen Y increases toward the lower exit');
        assert.ok(unit.x <= before.x, 'right-side formations move left, never toward Crook');
      }
      for (const crookId of config.crookFormationIds) {
        const unit = engine.state.find((entry) => entry.id === crookId);
        assert.equal(unit.active, false);
        assert.ok(unit.x > config.world.width * 0.8);
        assert.ok(unit.y < config.world.height / 2);
        assert.ok(Math.cos(unit.facing) < 0, 'Crook faces inward from the right side');
      }
    }
  });

  await test('Crook arrives at 60 and 66 field seconds, unchanged by the rumor choice', () => {
    for (const choice of choices) {
      const engine = new CivilWarBattleEngine(id, stateFor(), choice);
      const arrivals = config.crookFormationIds.map((crookId) => engine.state.find((unit) => unit.id === crookId));
      assert.deepEqual(arrivals.map((unit) => unit.arrivalTime), [60, 66]);
      assert.equal(engine.reinforcementEta(), 60);
      for (const [time, activeCount, flankState] of [[60 - 1e-6, 0, 'pending'], [60, 1, 'arriving'], [66 - 1e-6, 1, 'arriving'], [66, 2, 'engaged']]) {
        engine.time = time;
        engine.activateReinforcements();
        engine.updateThirdWinchesterEvents(0);
        assert.equal(arrivals.filter((unit) => unit.active).length, activeCount);
        assert.equal(engine.thirdWinchester.flankState, flankState);
      }
      assert.equal(engine.reinforcementEta(), 0);
      const events = structuredClone(engine.events);
      engine.activateReinforcements();
      engine.updateThirdWinchesterEvents(0);
      assert.deepEqual(engine.events, events, 'arrival events are emitted once');
      assert.ok(arrivals.every((unit) => unit.target.x < unit.x));
      assert.match(engine.fieldStatus().label, /Crook/);
    }
  });

  await test('off-map cavalry pressure starts at the timed boundary and affects the exposed right, not the exit', () => {
    const engine = new CivilWarBattleEngine(id, stateFor(), 'option_b');
    for (const rearguardId of config.rearguardFormationIds) engine.order(rearguardId, 'withdraw');
    const exposed = engine.state.find((unit) => unit.id === 'gordon-winchester');
    const left = engine.state.find((unit) => unit.id === 'ramseur-winchester');
    const lower = engine.state.find((unit) => unit.id === 'rodes-winchester');
    Object.assign(exposed, { x: 1000, y: 500, morale: 70, cohesion: 70 });
    Object.assign(left, { x: 400, y: 500, morale: 70, cohesion: 70 });
    Object.assign(lower, { x: 1000, y: 820, morale: 70, cohesion: 70 });
    engine.time = config.cavalryPressureTime - 1e-6;
    engine.updateThirdWinchesterEvents(0);
    assert.equal(engine.thirdWinchester.cavalryPulses, 0);
    assert.equal(exposed.morale, 70);
    engine.time = config.cavalryPressureTime;
    engine.updateThirdWinchesterEvents(0);
    assert.equal(engine.thirdWinchester.cavalryPressureState, 'pressing');
    assert.equal(engine.thirdWinchester.cavalryPulses, 1);
    assert.equal(exposed.morale, 61);
    assert.equal(exposed.cohesion, 63);
    for (const unit of [left, lower]) { assert.equal(unit.morale, 70); assert.equal(unit.cohesion, 70); }
    engine.updateThirdWinchesterEvents(0);
    assert.equal(exposed.morale, 61, 'repeated frame must not repeat a pressure pulse');
    engine.time += 20 - 1e-6;
    engine.updateThirdWinchesterEvents(0);
    assert.equal(engine.thirdWinchester.cavalryPulses, 1);
    engine.time = config.cavalryPressureTime + 20;
    engine.updateThirdWinchesterEvents(0);
    assert.equal(engine.thirdWinchester.cavalryPulses, 2);
    assert.equal(exposed.morale, 52);
  });

  await test('withdrawal requires crossing the lower-left corridor, not merely receiving an order', () => {
    const exit = config.withdrawalCorridor;
    for (const [x, y, accepted] of [
      [exit.left - 0.01, exit.top + 1, false], [exit.right + 0.01, exit.top + 1, false],
      [400, exit.top - 0.01, false], [exit.left, exit.top, true], [exit.right, exit.top, true],
    ]) {
      const engine = new CivilWarBattleEngine(id, stateFor(), 'option_b');
      const unit = engine.state.find((entry) => entry.id === 'ramseur-winchester');
      engine.order(unit.id, 'withdraw');
      assert.equal(Boolean(unit.withdrawn), false);
      Object.assign(unit, { x, y });
      const strength = unit.strength;
      const ammunition = unit.ammunition;
      engine.updateThirdWinchesterEvents(0);
      assert.equal(Boolean(unit.withdrawn), accepted);
      assert.equal(unit.active, !accepted);
      assert.equal(unit.strength, strength);
      assert.equal(unit.ammunition, ammunition);
      if (accepted) {
        assert.equal(unit.withdrawalOrganized, true);
        approx(engine.thirdWinchester.escapedStrength, strength);
        engine.time = config.maxTime;
        engine.activateReinforcements();
        assert.equal(unit.active, false, 'escaped units cannot reactivate as reinforcements');
      }
    }
    const engine = new CivilWarBattleEngine(id, stateFor(), 'option_b');
    const routed = engine.state.find((unit) => unit.id === 'ramseur-winchester');
    Object.assign(routed, { x: 400, y: exit.top, status: 'routing', order: 'withdraw' });
    engine.updateThirdWinchesterEvents(0);
    assert.equal(routed.withdrawn, true);
    assert.equal(routed.withdrawalOrganized, false);
    assert.equal(engine.thirdWinchester.escapedStrength, 0, 'disorganized survivors are not credited as an organized escape');
  });

  await test('45 percent escaped distinguishes defeat from rout without granting an unearned withdrawal', () => {
    for (const [ratio, expected] of [[0.45 - 1e-6, 'rout'], [0.45, 'defeat'], [0.45 + 1e-6, 'defeat']]) {
      const engine = new CivilWarBattleEngine(id, stateFor(), 'option_b');
      for (const unit of engine.state.filter((unit) => unit.side === 'confederate')) unit.active = false;
      engine.thirdWinchester.escapedRatio = ratio;
      engine.thirdWinchester.withdrawalState = 'withdrawing';
      engine.judgeOutcome();
      assert.equal(engine.pendingOutcome, expected);
    }
  });

  await test('secured withdrawal needs the 65 percent organized threshold and an earned covering objective', () => {
    for (const covered of [false, true]) for (const ratio of [0.65 - 1e-6, 0.65 + 1e-6]) {
      const engine = new CivilWarBattleEngine(id, stateFor(), 'option_d');
      for (const unit of engine.state.filter((unit) => unit.side === 'confederate')) {
        unit.strength = unit.initialStrength * ratio;
        unit.active = false;
        unit.withdrawn = true;
        unit.withdrawalOrganized = true;
      }
      if (covered) engine.thirdWinchester.rearguardHeld = config.rearguardHoldRequired;
      engine.updateThirdWinchesterEvents(0);
      approx(engine.thirdWinchester.escapedRatio, ratio);
      assert.equal(engine.thirdWinchester.rearguardSurvived, true);
      assert.equal(engine.thirdWinchester.withdrawalState, covered && ratio > 0.65 ? 'secured' : 'withdrawing');
      engine.judgeOutcome();
      assert.equal(engine.pendingOutcome, covered && ratio > 0.65 ? 'disciplined-withdrawal' : 'defeat');
    }
  });

  await test('Middle Field hold credit requires two organized defenders under actual pressure', () => {
    const engine = new CivilWarBattleEngine(id, stateFor(), 'option_b');
    const enemies = engine.state.filter((unit) => unit.side === 'union');
    for (const unit of enemies) { unit.x = 0; unit.y = 0; }
    engine.time = 1;
    engine.updateThirdWinchesterEvents(1);
    assert.equal(engine.thirdWinchester.middleFieldHeld, 0, 'idling beyond pressure range cannot earn hold credit');
    const defenders = ['ramseur-winchester', 'rodes-winchester'].map((unitId) => engine.state.find((unit) => unit.id === unitId));
    for (const unit of engine.state.filter((entry) => entry.side === 'confederate' && !defenders.includes(entry))) engine.order(unit.id, 'withdraw');
    for (const [index, unit] of defenders.entries()) Object.assign(enemies[index], { x: unit.x, y: unit.y - 100 });
    engine.time = 2;
    engine.updateThirdWinchesterEvents(1);
    assert.equal(engine.thirdWinchester.middleFieldHeld, 1);
    engine.order(defenders[0].id, 'withdraw');
    engine.time = 3;
    engine.updateThirdWinchesterEvents(1);
    assert.equal(engine.thirdWinchester.middleFieldHeld, 1, 'one remaining defender cannot accumulate a two-formation objective');
  });

  await test('begin/resume, destination confirmation and objective tracker share the ordered overlay stack', () => {
    const source = readFileSync(new URL('../src/components/CivilWarBattleEncounter.jsx', import.meta.url), 'utf8');
    const css = readFileSync(new URL('../src/battle/battleUsability.css', import.meta.url), 'utf8');
    const start = source.indexOf('<div className="cw-field-overlays">');
    const footer = source.indexOf('<footer', start);
    assert.ok(start >= 0 && footer > start);
    const overlay = source.slice(start, footer);
    const begin = overlay.indexOf('className="cw-begin-battle"');
    const destination = overlay.indexOf('className="cw-destination-confirm"');
    const status = overlay.indexOf('className="cw-field-status"');
    assert.ok(begin >= 0 && destination > begin && status > destination);
    assert.match(css, /\.cw-field-overlays\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/);
    for (const selector of ['cw-field-status', 'cw-begin-battle', 'cw-destination-confirm']) {
      assert.match(css, new RegExp(`\\.cw-field-overlays \\.${selector}\\s*\\{[^}]*position:\\s*static;`));
    }
  });

  await test('delegation uses Winchester readiness and preserves distinct withdrawal objectives', () => {
    for (const choice of choices) {
      const readiness = battleReadiness(stateFor(), choice, battle);
      assert.notDeepEqual(readiness, battleReadiness(stateFor(), choice, BATTLE_SCENARIOS.manassas_battlefield));
      assert.doesNotMatch(readiness.notes.join(' '), /Henry Hill|Johnston|Buell/);
      const results = Object.fromEntries(Object.keys(profiles).map((profile) => [profile, delegateBattle(stateFor(profile), battle, choice)]));
      assert.deepEqual(results.normal, delegateBattle(stateFor(), battle, choice));
      assert.ok(results.strong.score >= results.normal.score && results.normal.score >= results.weak.score);
      for (const result of Object.values(results)) {
        assert.equal(result.battleId, id);
        assert.equal(result.scenarioId, id);
        assert.ok(validResults.has(result.result));
      }
      if (['option_b', 'option_d'].includes(choice)) {
        assert.equal(results.normal.result, 'disciplined-withdrawal');
        assert.equal(results.strong.result, 'disciplined-withdrawal');
        assert.ok(results.weak.score < results.normal.score, 'weak readiness reduces the score even when the covered-withdrawal choice remains viable');
        const depleted = stateFor();
        depleted.metrics = Object.fromEntries(Object.keys(depleted.metrics).map((key) => [key, 20]));
        assert.ok(['defeat', 'rout'].includes(delegateBattle(depleted, battle, choice).result), 'a severely depleted army cannot delegate a guaranteed clean escape');
        assert.equal(battleChoiceSuccessModifier(battle, choice, 'disciplined-withdrawal'), 1);
        assert.equal(battleChoiceSuccessModifier(battle, choice, 'rout'), -1);
      }
    }
  });

  await test('manual and delegated results integrate once, preserve authored scores, and advance to Cedar Creek', () => {
    for (const choiceId of choices) for (const delegated of [false, true]) {
      const state = stateFor();
      const snapshot = played.get(`normal:${choiceId}:hold`);
      assert.ok(snapshot);
      const result = delegated ? delegateBattle(state, battle, choiceId) : {
        battleId: id, scenarioId: id, result: snapshot.outcome, score: snapshot.score,
        confederateLossRate: snapshot.confederateLossRate, unionLossRate: snapshot.unionLossRate,
        commanderStatus: snapshot.commanderStatus, delegated: false,
      };
      const before = structuredClone(state);
      assert.equal(battleForScenario(scenario, state), battle);
      const resolved = applyBattleResolution(state, result);
      assert.deepEqual(state, before);
      assert.deepEqual(Object.keys(resolved.battleCampaign.results), [id]);
      assert.equal(resolved.battleCampaign.results[id].battleId, id);
      assert.equal(battleForScenario(scenario, resolved), null);
      assert.equal(applyBattleResolution(resolved, result), resolved);
      assert.equal(applyBattleResolution(resolved, { ...result, result: 'rout' }), resolved, 'a second result cannot overwrite the first');
      const modifier = battleChoiceSuccessModifier(battle, choiceId, result.result);
      const advanced = advanceCampaignTurn(resolved, scenario, choiceId, STATIC_SCENARIOS, modifier);
      assert.equal(advanced.nextScenario?.id, 'cedar_creek');
      assert.equal(advanced.historyEntry.battleResult.battleId, id);
      const authored = resolveChoiceScoreCard(id, scenario.choices.find((choice) => choice.id === choiceId));
      assert.deepEqual(advanced.historyEntry.scoreCard, { ...authored, tactical: authored.tactical + resolved.battleCampaign.results[id].tacticalScore });
      assert.deepEqual(choiceScoreCard(advanced.historyEntry), advanced.historyEntry.scoreCard);
    }
  });

  await test('current saves round-trip Winchester results, prior battle ledgers, correspondence, and old saves', () => {
    assert.equal(CAMPAIGN_SAVE_VERSION, 22, 'versioned tactical rules now require the new save envelope');
    const state = stateFor();
    state.battleCampaign.results.manassas_battlefield = { battleId: 'first_manassas', scenarioId: 'manassas_battlefield', result: 'costly-win', tacticalScore: 7 };
    state.correspondence = {
      scenarioId: id, decisionIndex: 0, draft: 'Hold the road south.', planningBonus: 0.1,
      result: { tone: 'Resolute', moraleMod: 5, strengthMod: 0, description: 'Orders delivered.' },
    };
    const priorLedger = jsonClone(state.battleCampaign.results);
    const preBattleSave = jsonClone(createCampaignSnapshot(state, scenario));
    const unresolved = restoreCampaignFromSnapshot(preBattleSave, STATIC_SCENARIOS);
    assert.equal(unresolved.activeScenario.id, id);
    assert.equal(battleForScenario(unresolved.activeScenario, unresolved.state), battle);
    assert.deepEqual(unresolved.state.metrics, state.metrics);
    assert.deepEqual(unresolved.state.battleCampaign.results, priorLedger);
    const resolved = applyBattleResolution(state, delegateBattle(state, battle, 'option_b'));
    const saved = jsonClone(createCampaignSnapshot(resolved, scenario));
    assert.equal(getCampaignSnapshotCompatibility(saved).ok, true);
    const restored = restoreCampaignFromSnapshot(saved, STATIC_SCENARIOS);
    assert.equal(restored.activeScenario.id, id);
    assert.deepEqual(restored.state.metrics, resolved.metrics);
    assert.deepEqual(restored.state.battleCampaign, jsonClone(resolved.battleCampaign));
    assert.deepEqual(restored.state.correspondence, state.correspondence);
    assert.deepEqual(restored.state.battleCampaign.results.manassas_battlefield, priorLedger.manassas_battlefield);
    assert.equal(battleForScenario(restored.activeScenario, restored.state), null);
    for (const version of [1, 2, 3]) {
      const legacy = jsonClone(preBattleSave);
      legacy.version = version;
      legacy.state.rulesVersion = 1;
      legacy.state.battleRulesVersion = 1;
      delete legacy.state.correspondence;
      if (version === 1) delete legacy.state.metrics.foodSupply;
      if (version <= 2) delete legacy.state.battleCampaign;
      const loaded = restoreCampaignFromSnapshot(legacy, STATIC_SCENARIOS);
      assert.ok(loaded, `supported v${version} save remains loadable`);
      assert.equal(loaded.activeScenario.id, id);
      assert.equal(loaded.migratedFromVersion, version);
      assert.equal(loaded.state.seed, state.seed);
    }
    assert.equal(restoreCampaignFromSnapshot({ version: 4, state: {} }, STATIC_SCENARIOS), null);
    assert.deepEqual(state.battleCampaign.results, priorLedger);
  });
} finally {
  await vite.close();
}
