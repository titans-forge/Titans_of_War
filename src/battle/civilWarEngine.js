import { chickamaugaPreservation } from './chickamaugaPreservation.js';
import { landmarkField, formationLandmarkBlocker } from './historicalLandmarks.js';
import { henryHillObjective } from './henryHillObjective.js';
import { initializeEnemyCoordination } from './enemyCoordination.js';
import { initializeFieldBattle, tickFieldBattle, updateFieldCommand, fieldTerrain, fieldLineOfFire, fieldExitTargets, fieldArrivalClear, judgeFieldExit, fieldResolution, updateFieldMission } from './fieldBattleMechanics.js';
import { initializeGettysburg, commandGettysburg, tickGettysburg, judgeGettysburg, finishGettysburg, gettysburgTerrain, gettysburgFireStatus, resolveGettysburgVolley, gettysburgReadiness, gettysburgFootprint, gettysburgRange, tacticalPressure } from './gettysburgMechanics.js';
import { getBattleEngineConfig } from './battleDefinitions.js';
import { getBattleAssessment } from './battleAssessment.js';
import { getBattleSupplyProfile } from '../game/campaignSupply.js';
import { angularDistance, bearingTo, fireArcDegrees, inFireArc, organizedFormation, turnToward } from './battleTactics.js';

const clamp = (value, minimum = 0, maximum = 100) => Math.max(minimum, Math.min(maximum, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const ROUTING_LIMITS = { morale: 18, cohesion: 13, strengthRatio: 0.12, brokenRatio: 0.045 };
export const REFORM_DURATION = 6;

function preferredRange(unit) {
  if (unit.type === 'artillery') return 390;
  return unit.formationMode === 'skirmish' ? 220 : 170;
}

function rangeLimit(unit) {
  const base = unit.type === 'artillery' ? 485 : unit.formationMode === 'skirmish' ? 275 : 235;
  return unit.visibilityLimit ? Math.min(base, unit.visibilityLimit) : base;
}

// The Gettysburg corridor pilot adds bounded route data only to rules 18.
// Old checkpoint fields and their trajectory are deliberately left untouched.
function validateRetreatRouteCheckpoint(state, engine) {
  const keys = ['retreatRoute', 'retreatRouteKey', 'retreatReplanAt'];
  const pilot = engine.battleRulesVersion === 18 && engine.scenarioId === 'gettysburg';
  const point = value => value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === 2 && Object.hasOwn(value, 'x') && Object.hasOwn(value, 'y')
    && Number.isFinite(value.x) && value.x >= 15 && value.x <= engine.world.width - 15
    && Number.isFinite(value.y) && value.y >= 15 && value.y <= engine.world.height - 15;
  for (const unit of state.state) {
    if (!pilot) {
      if (keys.some(key => Object.hasOwn(unit, key))) throw new Error('Retreat route data requires Gettysburg battle rules 18.');
      continue;
    }
    if (keys.some(key => !Object.hasOwn(unit, key))
      || (unit.retreatRoute !== null && (!Array.isArray(unit.retreatRoute)
        || unit.retreatRoute.length > 64 || !unit.retreatRoute.every(point)))
      || (unit.retreatRouteKey !== null && (typeof unit.retreatRouteKey !== 'string'
        || unit.retreatRouteKey.length > 40 || !/^\d+,\d+$/.test(unit.retreatRouteKey)))
      || !Number.isFinite(unit.retreatReplanAt) || unit.retreatReplanAt < 0 || unit.retreatReplanAt > 245) {
      throw new Error('Unsupported or incomplete Gettysburg retreat route checkpoint.');
    }
  }
}

export class CivilWarBattleEngine {
  #explicitDestinations = new Set();
  #departurePresentation = new Map();
  #combatEvents = [];
  #nextCombatEvent = 1;
  #routingCues = new Map();

  // Checkpoints contain engine data, never Phaser objects or derived display snapshots.
  checkpoint() {
    const { config, world, ...state } = this;
    return JSON.parse(JSON.stringify({ version: 1, state, internal: {
      explicitDestinations: [...this.#explicitDestinations],
      departurePresentation: [...this.#departurePresentation],
      combatEvents: this.#combatEvents, nextCombatEvent: this.#nextCombatEvent,
      routingCues: [...this.#routingCues],
    } }, (_key, value) => value instanceof Map ? { $fieldMap: [...value] } : value instanceof Set ? { $fieldSet: [...value] } : value));
  }

  static fromCheckpoint(checkpoint, scenarioId, campaignState, choiceId) {
    const saved = JSON.parse(JSON.stringify(checkpoint), (_key, value) => value?.$fieldMap ? new Map(value.$fieldMap) : value?.$fieldSet ? new Set(value.$fieldSet) : value);
    const engine = new CivilWarBattleEngine(scenarioId, campaignState, choiceId);
    const state = saved?.state, internal = saved?.internal;
    if (saved?.version !== 1 || !state || !internal
      || state.scenarioId !== scenarioId || state.choiceId !== choiceId
      || state.battleRulesVersion !== engine.battleRulesVersion || state.rulesVersion !== engine.rulesVersion
      || !Number.isFinite(state.time) || state.time < 0
      || !Array.isArray(state.state) || state.state.length !== engine.state.length
      || state.state.some((unit, i) => unit.id !== engine.state[i].id
        || !['x', 'y', 'strength', 'morale', 'cohesion', 'ammunition'].every(key => Number.isFinite(unit[key])))
      || !Array.isArray(state.events)
      || !['explicitDestinations', 'departurePresentation', 'combatEvents', 'routingCues'].every(key => Array.isArray(internal[key]))
      || !Number.isSafeInteger(internal.nextCombatEvent)) throw new Error('Unsupported or incomplete field checkpoint.');
    validateRetreatRouteCheckpoint(state, engine);
    // Prototype and authored configuration must never be replaced by stored data.
    for (const key of Object.keys(state)) {
      if (['__proto__', 'constructor', 'prototype', 'config', 'world'].includes(key)
        || typeof engine[key] === 'function') throw new Error('Invalid field checkpoint data.');
      engine[key] = state[key];
    }
    engine.#explicitDestinations = new Set(internal.explicitDestinations);
    engine.#departurePresentation = new Map(internal.departurePresentation);
    engine.#combatEvents = internal.combatEvents;
    engine.#nextCombatEvent = internal.nextCombatEvent;
    engine.#routingCues = new Map(internal.routingCues);
    // Exercise the same read path the field uses before admitting the save.
    engine.snapshot({ presentation: true });
    return engine;
  }

  constructor(scenarioId, campaignState, choiceId) {
    this.config = getBattleEngineConfig(scenarioId);
    this.scenarioId = scenarioId;
    this.world = this.config.world;
    this.choiceId = choiceId;
    this.rulesVersion = campaignState?.rulesVersion === 2 ? 2 : 1;
    if (campaignState?.battleRulesVersion !== undefined && (!Number.isInteger(campaignState.battleRulesVersion)
      || campaignState.battleRulesVersion < 1 || campaignState.battleRulesVersion > 18)) throw new Error('Unsupported battle rules version.');
    this.battleRulesVersion = campaignState?.battleRulesVersion === 18 ? 18 : campaignState?.battleRulesVersion >= 17 ? 17 : campaignState?.battleRulesVersion >= 16 ? 16 : campaignState?.battleRulesVersion >= 15 ? 15 : campaignState?.battleRulesVersion >= 14 ? 14 : campaignState?.battleRulesVersion >= 13 ? 13 : campaignState?.battleRulesVersion >= 12 ? 12 : campaignState?.battleRulesVersion >= 11 ? 11 : campaignState?.battleRulesVersion >= 10 ? 10 : campaignState?.battleRulesVersion >= 9 ? 9 : campaignState?.battleRulesVersion >= 8 ? 8 : campaignState?.battleRulesVersion >= 7 ? 7 : campaignState?.battleRulesVersion >= 3 && scenarioId === 'gettysburg' ? 3 : campaignState?.battleRulesVersion >= 6 && ['first_manassas', 'shiloh'].includes(scenarioId) ? 6 : campaignState?.battleRulesVersion >= 5 && ['first_manassas', 'shiloh'].includes(scenarioId) ? 5 : campaignState?.battleRulesVersion >= 4 ? 4 : campaignState?.battleRulesVersion >= 2 ? 2 : 1;
    if (this.battleRulesVersion >= 5 && scenarioId === 'first_manassas' && ['option_a', 'option_d'].includes(choiceId)) {
      // NPS records the late Shenandoah brigade extending the Confederate left.
      // This compressed arrival and representative strength are game parameters.
      this.config = { ...this.config, maxTime: 140, formations: [...this.config.formations, { id: 'elzey-reinforcement', name: "Elzey's Shenandoah Brigade", side: 'confederate', type: 'infantry', x: 260, y: 780, facing: -Math.PI / 2, frontage: 190, mode: 'line', strength: 2000, morale: 82, cohesion: 78, ammunition: 42, active: false, arrivalTime: 48, activationOrder: 'hold', arrivalMessage: "Elzey's Shenandoah Brigade has reached the left rear. Deploy the fresh brigade to support your counterattack." }] };
    }
    if (this.battleRulesVersion >= 7 && scenarioId === 'first_manassas' && ['option_a', 'option_d'].includes(choiceId)) {
      // Representative combined battery: Henry Hill's Confederate artillery
      // participated in the duel with Ricketts and Griffin (NPS First Manassas).
      this.config = { ...this.config, formations: [...this.config.formations, {
        id: 'henry-hill-batteries', name: 'Henry Hill Batteries', side: 'confederate', type: 'artillery',
        x: 790, y: 610, facing: -Math.PI / 2, frontage: 105, mode: 'line',
        strength: 220, morale: 76, cohesion: 76, ammunition: 28,
      }] };
    }
    this.supplyProfile = getBattleSupplyProfile(campaignState);
    this.time = 0;
    this.outcome = 'undecided';
    this.pendingOutcome = null;
    this.resolutionTime = 0;
    this.resolutionDuration = 5.4;
    this.events = [];
    if (this.rulesVersion === 2) this.events.push({ time: 0, type: 'supply', message: this.supplyProfile.notes.join(' ') });
    const posture = this.config.postures[choiceId] || this.config.postures.option_b;
    const deployment = this.config.choiceDeployments?.[choiceId] || {};
    this.commanderStatus = posture.commanderStatus;
    this.surpriseDeadline = posture.surpriseDeadline ?? null;
    this.surpriseState = this.surpriseDeadline == null ? 'not-applicable' : 'pending';
    this.assaultDeadline = posture.assaultDeadline ?? null;
    this.assaultState = this.assaultDeadline == null ? 'not-applicable' : 'pending';
    this.gapOpenTime = posture.gapOpenTime ?? null;
    this.gapDeadline = posture.gapDeadline ?? null;
    this.gapState = this.gapDeadline == null ? 'not-applicable' : 'pending';
    this.chickamaugaExploitationState = 'pending';
    this.chickamaugaRallyTriggered = false;
    this.coldHarborAssaultStartTime = posture.assaultStartTime ?? null;
    this.coldHarborAssaultState = this.scenarioId === 'cold_harbor' ? 'pending' : 'not-applicable';
    this.entrenchmentState = posture.entrenchmentState ?? 'not-applicable';
    this.transferDeadline = posture.transferDeadline ?? null;
    this.transferState = this.transferDeadline == null ? 'not-applicable' : 'pending';
    this.coldHarborCrossfireTriggered = false;
    this.craterAssaultStartTime = posture.assaultStartTime ?? null;
    this.craterDeadline = posture.craterDeadline ?? null;
    this.craterPosture = posture.craterPosture ?? 'not-applicable';
    this.craterState = this.scenarioId === 'petersburg' && this.craterPosture !== 'night-sortie' ? 'breached' : 'not-applicable';
    this.mineState = posture.mineState ?? 'not-applicable';
    this.sortieDeadline = posture.sortieDeadline ?? null;
    this.sortieState = this.craterPosture === 'night-sortie' ? 'approaching' : 'not-applicable';
    this.sortieTargetsHit = [];
    this.prematureCommitment = this.scenarioId === 'wilderness' && ['option_a', 'option_c'].includes(choiceId);
    this.leeCrisisTriggered = false;
    this.cedarDisciplineBroken = false;
    this.cedarRecoveryTriggered = false;
    this.gettysburgCannonadeComplete = false;
    this.gettysburgRecoveryTriggered = false;
    const campaignReadiness = clamp((campaignState?.metrics?.militaryStrength ?? 70) * 0.55 + (campaignState?.metrics?.munitions ?? 70) * 0.25 + (campaignState?.metrics?.publicMorale ?? 70) * 0.2);

    this.state = this.config.formations.map((formation) => {
      const deployed = { ...formation, ...(deployment.formations?.[formation.id] || {}) };
      const confederateScale = deployed.side === 'confederate' ? 0.88 + campaignReadiness / 520 : 1;
      const strength = Math.round(deployed.strength * confederateScale);
      const isConfederate = deployed.side === 'confederate';
      const reserve = deployed.reserve || ['hampton-reserve', 'breckinridge-reserve', 'ap-hill-reserve'].includes(deployed.id);
      const authoredAmmunition = deployed.ammunition + (isConfederate ? posture.ammunition || 0 : 0);
      const initialAmmunition = isConfederate && this.rulesVersion === 2
        ? Math.max(1, Math.round(authoredAmmunition * this.supplyProfile.ammunitionMultiplier)) : authoredAmmunition;
      return {
        ...deployed,
        formationMode: reserve ? posture.reserveMode : deployed.mode,
        initialStrength: strength,
        strength,
        cohesion: clamp(deployed.cohesion + (isConfederate ? posture.cohesion : 0)),
        morale: clamp(deployed.morale + (isConfederate ? posture.morale : 0)),
        fatigue: isConfederate ? posture.fatigue : 3,
        initialAmmunition,
        ammunition: initialAmmunition,
        reload: deployed.type === 'artillery' ? 2.5 : 1.2,
        reformRemaining: 0,
        order: 'hold',
        status: 'steady',
        active: deployed.active !== false,
        target: { x: deployed.x, y: deployed.y },
        lastVolleyAt: -100,
        volleySerial: 0,
        flanked: false,
        ...(this.battleRulesVersion >= 2 ? { facingOrder: null, focusTargetId: null, aimTargetId: null, turning: false } : {}),
      };
    });
    this.initialConfederate = this.sideStrength('confederate');
    this.initialUnion = this.sideStrength('union');
    if (this.scenarioId === 'third_winchester') {
      this.thirdWinchester = {
        middleFieldHeld: 0, rearguardHeld: 0, flankState: 'pending',
        cavalryPressureState: 'pending', cavalryPulses: 0, withdrawalState: 'holding',
        escapedStrength: 0, escapedRatio: 0, rearguardSurvived: false,
      };
      this.events.push({ time: 0, type: 'objective', message: 'Hold Middle Field under pressure, or cover the retiring columns with Gordon and Wharton. Bring the army through the lower-left Winchester corridor before the northern flank closes.' });
      if (choiceId === 'option_c') this.events.push({ time: 0, type: 'dispatch', message: "Political rumors do not change Sheridan's deployment or Crook's arrival." });
      if (choiceId === 'option_a') {
        for (const unit of this.state.filter((unit) => unit.side === 'confederate' && unit.type === 'infantry' && unit.id !== 'wharton-winchester')) this.order(unit.id, 'advance');
      }
      if (choiceId === 'option_d') {
        for (const id of ['ramseur-winchester', 'rodes-winchester']) this.order(id, 'withdraw');
      }
    }
    if (this.scenarioId === 'shiloh') this.events.push({ time: 0, type: 'objective', message: "Buell's vanguard is expected within seventy-two field minutes." });
    if (this.scenarioId === 'chancellorsville') {
      this.events.push({
        time: 0,
        type: 'objective',
        message: this.surpriseState === 'pending'
          ? `Jackson's concealed column must strike before the surprise window closes at field minute ${this.surpriseDeadline}.`
          : choiceId === 'option_b'
            ? "The army has refused the split and formed a compact line in the Wilderness."
            : "The direct pressure attack has begun without the protection of a concealed flank march.",
      });
    }
    if (this.scenarioId === 'wilderness') {
      this.events.push({
        time: 0,
        type: 'objective',
        message: choiceId === 'option_b'
          ? "Hill's line must hold until the Texas Brigade and Longstreet reach the Orange Plank Road."
          : choiceId === 'option_d'
            ? 'The battered divisions must retire toward the Brock Road without dissolving in the thickets.'
            : "The front has been committed before Longstreet's arrival; the army must survive the interval.",
      });
    }
    if (this.scenarioId === 'cedar_creek') {
      this.events.push({
        time: 0,
        type: 'objective',
        message: ['option_c', 'option_d'].includes(choiceId)
          ? 'Carry the captured supply train back across Cedar Creek before Sheridan can turn pursuit into a rout.'
          : `Break the camps around Belle Grove before the surprise window closes at field minute ${this.surpriseDeadline}.`,
      });
    }
    if (this.scenarioId === 'gettysburg') {
      this.events.push({
        time: 0,
        type: 'objective',
        message: choiceId === 'option_a'
          ? `The cannonade must open a path before the assault window closes at field minute ${this.assaultDeadline}.`
          : 'Disengage the infantry from Seminary Ridge without allowing Union pressure to turn withdrawal into rout.',
      });
    }
    if (this.scenarioId === 'gettysburg_jackson') {
      this.events.push({
        time: 0,
        type: 'objective',
        message: `Jackson must break the Union high ground before the opportunity window closes at field minute ${this.surpriseDeadline}.`,
      });
    }
    if (this.scenarioId === 'chickamauga') {
      this.events.push({
        time: 0,
        type: 'objective',
        message: this.gapState === 'pending'
          ? `Keep Longstreet's wing concentrated until the Union opening develops near Brotherton Farm at field minute ${this.gapOpenTime}.`
          : 'The attack is entering the woods without a concentrated breakthrough point; preserve cohesion and avoid isolated division fights.',
      });
    }
    if (this.scenarioId === 'cold_harbor') {
      this.events.push({
        time: 0,
        type: 'objective',
        message: choiceId === 'option_a'
          ? `Strike before Grant's assault begins at field minute ${this.coldHarborAssaultStartTime}, but crossing the works gives up their protection.`
          : choiceId === 'option_d'
            ? `Hold the trench screen while Breckinridge and Hill's reserve clear the Petersburg road before field minute ${this.transferDeadline}.`
            : `Keep the interlocking works intact when Grant's assault begins at field minute ${this.coldHarborAssaultStartTime}.`,
      });
    }
    if (this.scenarioId === 'petersburg') {
      this.events.push({
        time: 0,
        type: 'objective',
        message: choiceId === 'option_a'
          ? `Hold the secondary line until Mahone arrives, then seal the crater breach before field minute ${this.craterDeadline}.`
          : choiceId === 'option_b'
            ? `Contain Burnside's divisions in the broken works until field minute ${this.craterDeadline}; do not spend the reserve in a premature counterattack.`
            : choiceId === 'option_c'
              ? `Reach both Union siege-work sectors before field minute ${this.sortieDeadline}, then withdraw the sortie through the covered way.`
              : `Keep the line steady while the Federal assault enters the marked mine lanes before field minute ${this.craterDeadline}.`,
      });
    }
    if (scenarioId === 'gettysburg' && this.battleRulesVersion >= 3) initializeGettysburg(this);
    if (this.battleRulesVersion >= 4 && !this.gettysburg) initializeFieldBattle(this);
    if (this.battleRulesVersion >= 6 && this.fieldBattle?.attackObjective) initializeEnemyCoordination(this, campaignState);
  }

  fieldTerrain(unit) { return fieldTerrain(this, unit); }
  fieldLineOfFire(a, b) { return fieldLineOfFire(this, a, b); }
  fieldExitTargets(unit) { return fieldExitTargets(this, unit); }
  updateFieldCommand() { updateFieldCommand(this); }

  sideStrength(side) {
    return this.state.filter((unit) => unit.side === side).reduce((sum, unit) => sum + unit.strength, 0);
  }

  order(id, order, point = null) {
    if (this.gettysburg || this.fieldBattle) return commandGettysburg(this, id, order, point);
    if (this.pendingOutcome || this.outcome !== 'undecided') return;
    if (!['hold', 'advance', 'volley', 'reform', 'withdraw'].includes(order)) return;
    const unit = this.state.find((formation) => formation.id === id && formation.side === 'confederate' && formation.active && formation.status !== 'broken');
    if (!unit || unit.status === 'routing') return;
    if (order === 'reform' && unit.order === 'reform') return;
    this.#explicitDestinations.delete(id);
    if (this.battleRulesVersion >= 2) { unit.facingOrder = null; unit.focusTargetId = null; }
    unit.reformRemaining = 0;
    if (order === 'advance') this.recordWildernessCommitment(unit);
    if (order === 'volley') {
      // Volley is a stationary fire order, never a reload shortcut.
      unit.order = 'volley';
      unit.target = { x: unit.x, y: unit.y };
      return;
    }
    unit.order = order;
    if (order === 'hold') unit.target = { x: unit.x, y: unit.y };
    if (order === 'withdraw') unit.target = this.retreatTarget(unit, 70);
    if (order === 'advance') {
      const enemy = this.nearestEnemy(unit);
      if (enemy) this.setAdvanceTarget(unit, enemy);
    }
    if (order === 'reform') {
      unit.reformRemaining = REFORM_DURATION;
      unit.target = { x: unit.x, y: unit.y };
    }
  }

  setFormation(id, mode) {
    if (this.pendingOutcome || this.outcome !== 'undecided') return;
    const unit = this.state.find((formation) => formation.id === id && formation.side === 'confederate' && formation.active && formation.type === 'infantry' && formation.status !== 'broken');
    if (!unit || unit.status === 'routing' || !['line', 'column', 'skirmish'].includes(mode) || unit.formationMode === mode) return;
    const widened = { ...unit, formationMode: mode };
    const moveTarget = unit.pendingCommand?.order === 'move' ? unit.pendingCommand.point : unit.directMove ? unit.target : null;
    const building = formationLandmarkBlocker(landmarkField(this), widened)
      || (moveTarget && formationLandmarkBlocker(landmarkField(this), widened, moveTarget));
    if (building) {
      unit.pressureReason = `${building.name} blocks the wider formation or its destination; move clear before changing formation.`;
      this.events.push({ time: this.time, type: 'command', message: `${unit.name}: ${unit.pressureReason}` });
      return false;
    }
    unit.formationMode = mode;
    unit.frontage = mode === 'line' ? 220 : mode === 'column' ? 115 : mode === 'skirmish' ? 250 : 155;
    unit.cohesion = clamp(unit.cohesion - 2);
  }

  move(id, point) {
    if (this.gettysburg || this.fieldBattle) return commandGettysburg(this, id, 'move', point);
    if (this.pendingOutcome || this.outcome !== 'undecided') return;
    const unit = this.state.find((formation) => formation.id === id && formation.side === 'confederate' && formation.active && formation.status !== 'broken');
    if (!unit || unit.status === 'routing' || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return;
    unit.reformRemaining = 0;
    this.recordWildernessCommitment(unit);
    unit.target = { x: clamp(point.x, 70, this.world.width - 70), y: clamp(point.y, 45, this.world.height - 35) };
    if (this.battleRulesVersion === 1) unit.facing = Math.atan2(unit.target.y - unit.y, unit.target.x - unit.x);
    else { unit.facingOrder = null; unit.focusTargetId = null; }
    unit.order = 'advance';
    this.#explicitDestinations.add(id);
  }

  nearestEnemy(unit) {
    return this.state
      .filter((other) => other.side !== unit.side && other.active && other.status !== 'broken')
      .sort((a, b) => distance(unit, a) - distance(unit, b))[0];
  }

  validTarget(unit, target) {
    return Boolean(unit.active && unit.x >= 0 && unit.x <= this.world.width && unit.y >= 0 && unit.y <= this.world.height
      && target && target.side !== unit.side && target.active && target.status !== 'broken' && target.strength > 0
      && target.x >= 0 && target.x <= this.world.width && target.y >= 0 && target.y <= this.world.height);
  }

  selectTarget(unit) {
    const focused = this.state.find((target) => target.id === unit.focusTargetId);
    if (this.validTarget(unit, focused)) return focused;
    unit.focusTargetId = null;
    const enemies = this.state.filter((target) => this.validTarget(unit, target)).sort((a, b) => distance(unit, a) - distance(unit, b));
    return enemies.find((target) => distance(unit, target) <= rangeLimit(unit) && inFireArc(unit, target)) || enemies[0];
  }

  face(id, point) {
    if (this.battleRulesVersion < 2 || this.pendingOutcome || this.outcome !== 'undecided'
      || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return false;
    const unit = this.state.find((candidate) => candidate.id === id && candidate.side === 'confederate' && candidate.active && !['routing', 'broken'].includes(candidate.status));
    if (!unit || distance(unit, point) < 1) return false;
    this.order(id, 'hold');
    if (this.gettysburg || this.fieldBattle) { unit.pendingCommand = null; unit.order = 'hold'; unit.directMove = false; }
    unit.facingOrder = bearingTo(unit, point);
    unit.turning = angularDistance(unit.facing, unit.facingOrder) > 0.01;
    return true;
  }

  focusTarget(id, targetId = null) {
    if (this.battleRulesVersion < 2 || this.pendingOutcome || this.outcome !== 'undecided') return false;
    const unit = this.state.find((candidate) => candidate.id === id && candidate.side === 'confederate' && candidate.active && !['routing', 'broken'].includes(candidate.status));
    if (!unit || (targetId !== null && !this.validTarget(unit, this.state.find((target) => target.id === targetId)))) return false;
    this.order(id, 'hold');
    if (this.gettysburg || this.fieldBattle) { unit.pendingCommand = null; unit.order = 'hold'; unit.directMove = false; }
    if (this.gettysburg || this.fieldBattle) unit.facingOrder = null;
    unit.focusTargetId = targetId;
    const target = this.state.find(candidate => candidate.id === targetId);
    unit.aimTargetId = targetId;
    unit.turning = Boolean(target && angularDistance(unit.facing, bearingTo(unit, target)) > 0.01);
    return true;
  }

  aimUnit(unit, target, dt) {
    unit.aimTargetId = target?.id || null;
    const desired = unit.facingOrder ?? (target ? bearingTo(unit, target) : unit.facing);
    unit.facing = turnToward(unit, desired, dt);
    unit.turning = angularDistance(unit.facing, desired) > 0.01;
  }

  recordCombatEvent(type, unit, target = null, extra = {}) {
    this.#combatEvents.push({ id: this.#nextCombatEvent++, time: this.time, type,
      formationId: unit.id, side: unit.side, weapon: unit.type,
      position: { x: unit.x, y: unit.y },
      ...(target ? { targetId: target.id, targetPosition: { x: target.x, y: target.y } } : {}), ...extra });
    if (this.#combatEvents.length > 128) this.#combatEvents.shift();
  }

  setAdvanceTarget(unit, enemy) {
    const gap = preferredRange(unit);
    const angle = Math.atan2(enemy.y - unit.y, enemy.x - unit.x);
    unit.target = { x: enemy.x - Math.cos(angle) * gap, y: enemy.y - Math.sin(angle) * gap };
    if (this.battleRulesVersion === 1) unit.facing = angle;
  }

  recordWildernessCommitment(unit) {
    if (this.scenarioId !== 'wilderness' || this.choiceId === 'option_d' || this.prematureCommitment || !unit.wildernessFront) return;
    const longstreet = this.state.find((formation) => formation.id === this.config.longstreetFormationId);
    if (longstreet?.active) return;
    this.prematureCommitment = true;
    for (const formation of this.state.filter((entry) => entry.side === 'confederate' && entry.active)) {
      formation.cohesion = clamp(formation.cohesion - 5);
      formation.morale = clamp(formation.morale - 3);
    }
    this.events.push({ time: this.time, type: 'warning', message: "Hill's battered front has advanced before Longstreet can support it." });
  }

  tick(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    if (this.outcome !== 'undecided') return;
    if (this.gettysburg) return tickGettysburg(this, dt);
    if (this.fieldBattle) return tickFieldBattle(this, dt);
    if (this.pendingOutcome) {
      this.advanceResolution(dt);
      return;
    }
    this.time += dt;
    this.activateReinforcements();
    for (const unit of this.state) {
      this.registerColdHarborExit(unit);
      if (!unit.active || ['broken', 'routing'].includes(unit.status) || unit.order !== 'advance') this.#explicitDestinations.delete(unit.id);
      if (!unit.active || unit.status === 'broken') continue;
      unit.reload = Math.max(0, unit.reload - dt);
      if (unit.order === 'reform' && unit.status !== 'routing') {
        // Recovery costs field time and prevents firing or moving while reforming.
        const elapsed = Math.min(dt, unit.reformRemaining);
        unit.cohesion = clamp(unit.cohesion + elapsed * 9 / REFORM_DURATION);
        unit.fatigue = clamp(unit.fatigue + elapsed * 3 / REFORM_DURATION);
        unit.reformRemaining = Math.max(0, unit.reformRemaining - elapsed);
        unit.status = 'reforming';
        unit.engagedWith = null;
        if (unit.reformRemaining === 0) { unit.order = 'hold'; unit.status = 'steady'; }
        this.checkRouting(unit);
        continue;
      }
      // Direct destinations are movement orders, not attack-advance orders.
      // Incoming fire still resolves on the enemy's turn in this tick.
      if (this.#explicitDestinations.has(unit.id)) {
        this.checkRouting(unit);
        if (this.#explicitDestinations.has(unit.id)) {
          unit.status = 'steady';
          unit.engagedWith = null;
          this.moveUnit(unit, dt);
          continue;
        }
      }
      const enemy = this.battleRulesVersion >= 2 ? this.selectTarget(unit) : this.nearestEnemy(unit);
      if (!enemy) { if (this.battleRulesVersion >= 2) this.aimUnit(unit, null, dt); continue; }

      const shouldUnionAdvance = this.config.unionAdvance
        || (this.scenarioId === 'shiloh' && unit.id === 'buell-vanguard')
        || (this.scenarioId === 'cold_harbor' && this.coldHarborAssaultState === 'engaged')
        || (this.scenarioId === 'petersburg' && this.craterState === 'contested');
      if (unit.side === 'union' && shouldUnionAdvance && this.time > (unit.type === 'artillery' ? 0.6 : 3.2) && unit.order === 'hold') {
        unit.order = unit.type === 'artillery' ? 'hold' : 'advance';
        if (unit.type !== 'artillery') this.setAdvanceTarget(unit, enemy);
      }

      if (unit.order === 'withdraw') {
        const retreatSpeed = unit.status === 'routing' ? 0.85 : 1;
        unit.status = 'steady';
        unit.engagedWith = null;
        this.moveUnit(unit, dt, retreatSpeed);
        this.checkRouting(unit);
        continue;
      }

      const gap = distance(unit, enemy);
      if (this.battleRulesVersion >= 2 && (unit.order !== 'advance' || (gap <= rangeLimit(unit) && unit.ammunition > 0))) this.aimUnit(unit, enemy, dt);
      if (gap <= rangeLimit(unit) && unit.ammunition > 0 && (this.battleRulesVersion === 1 || inFireArc(unit, enemy))) {
        unit.status = 'firing';
        unit.engagedWith = enemy.id;
        if (unit.reload <= 0) this.resolveVolley(unit, enemy);
        if (unit.order === 'advance' && gap <= preferredRange(unit)) unit.order = 'hold';
      } else {
        if (unit.status === 'firing') unit.status = 'steady';
        unit.engagedWith = null;
        if (unit.order === 'advance' && unit.side === 'union') this.setAdvanceTarget(unit, enemy);
        if (this.battleRulesVersion === 1 || gap > rangeLimit(unit) || unit.ammunition <= 0) this.moveUnit(unit, dt);
      }

      if (gap < 58 && unit.type === 'infantry') this.resolveCloseCombat(unit, enemy, dt);
      this.checkRouting(unit);
    }
    this.updateScenarioEvents(dt);
    this.judgeOutcome();
  }

  activateReinforcements() {
    for (const unit of this.state) {
      if (unit.active || unit.arrivalTime == null || this.time < unit.arrivalTime) continue;
      if (this.fieldBattle && (unit.participated || unit.withdrawn || ['broken', 'surrendered'].includes(unit.status))) continue;
      if (this.fieldBattle && !fieldArrivalClear(this, unit)) {
        if (!unit.arrivalBlocked) this.events.push({ time: this.time, type: 'warning', message: `${unit.name} is waiting for its deployment area to clear. Move nearby formations to open an entry lane.` });
        unit.arrivalBlocked = true; continue;
      }
      if (this.fieldBattle) unit.arrivalBlocked = false;
      if (this.fieldBattle) unit.participated = true;
      unit.active = true;
      this.recordCombatEvent('reinforcement', unit);
      unit.order = unit.activationOrder || (unit.side === 'union' ? 'advance' : 'hold');
      const enemy = this.nearestEnemy(unit);
      if (enemy && unit.order === 'advance') this.setAdvanceTarget(unit, enemy);
      this.events.push({
        time: this.time,
        type: 'reinforcement',
        message: unit.arrivalMessage || `${unit.name} has reached the field.`,
      });
      if (this.scenarioId === 'wilderness' && unit.reinforcementRole === 'texans' && this.choiceId === 'option_c') {
        this.commanderStatus = 'pulled back by the Texans';
      }
      if (this.scenarioId === 'cedar_creek' && unit.reinforcementRole === 'sheridan') this.activateCedarCreekRecovery();
      if (this.scenarioId === 'gettysburg_jackson' && unit.reinforcementRole === 'hancock-gettysburg') this.activateGettysburgRecovery();
      if (this.scenarioId === 'chickamauga' && unit.reinforcementRole === 'thomas-rally') this.activateChickamaugaRally();
    }
  }

  activateCedarCreekRecovery() {
    if (this.cedarRecoveryTriggered) return;
    this.cedarRecoveryTriggered = true;
    for (const unit of this.state.filter((formation) => formation.side === 'union' && formation.active && formation.status !== 'broken')) {
      unit.morale = clamp(unit.morale + 12);
      unit.cohesion = clamp(unit.cohesion + 10);
      unit.order = unit.type === 'artillery' ? 'hold' : 'advance';
      const enemy = this.nearestEnemy(unit);
      if (enemy && unit.order === 'advance') this.setAdvanceTarget(unit, enemy);
    }
    this.events.push({ time: this.time, type: 'command', message: 'Sheridan has restored the Union line and ordered the afternoon counterattack toward Middletown and Belle Grove.' });
  }

  activateGettysburgRecovery() {
    if (this.gettysburgRecoveryTriggered) return;
    this.gettysburgRecoveryTriggered = true;
    for (const unit of this.state.filter((formation) => formation.side === 'union' && formation.active && formation.status !== 'broken')) {
      unit.morale = clamp(unit.morale + 10);
      unit.cohesion = clamp(unit.cohesion + 9);
    }
    this.events.push({ time: this.time, type: 'command', message: 'Hancock has restored the Union command line; the high ground is becoming a continuous fishhook rather than isolated positions.' });
  }

  activateChickamaugaRally() {
    if (this.chickamaugaRallyTriggered) return;
    this.chickamaugaRallyTriggered = true;
    for (const unit of this.state.filter((formation) => formation.side === 'union' && formation.active && formation.status !== 'broken')) {
      unit.morale = clamp(unit.morale + 10);
      unit.cohesion = clamp(unit.cohesion + 8);
    }
    this.events.push({ time: this.time, type: 'command', message: 'Thomas has formed a final line on Horseshoe Ridge and Snodgrass Hill, buying the broken Union army a route toward Chattanooga.' });
  }

  updateScenarioEvents(dt = 0) {
    if (this.scenarioId === 'third_winchester') {
      this.updateThirdWinchesterEvents(dt);
      return;
    }
    if (this.scenarioId === 'wilderness') {
      this.updateWildernessEvents();
      return;
    }
    if (this.scenarioId === 'cedar_creek') {
      this.updateCedarCreekEvents();
      return;
    }
    if (this.scenarioId === 'gettysburg') {
      this.updateGettysburgEvents();
      return;
    }
    if (this.scenarioId === 'gettysburg_jackson') {
      this.updateGettysburgJacksonEvents();
      return;
    }
    if (this.scenarioId === 'chickamauga') {
      this.updateChickamaugaEvents();
      return;
    }
    if (this.scenarioId === 'cold_harbor') {
      this.updateColdHarborEvents();
      return;
    }
    if (this.scenarioId === 'petersburg') {
      this.updatePetersburgEvents();
      return;
    }
    if (this.scenarioId !== 'chancellorsville' || this.surpriseState !== 'pending') return;
    const flank = this.state.filter((unit) => this.config.flankFormationIds.includes(unit.id) && unit.active && unit.status !== 'broken');
    const targets = this.state.filter((unit) => unit.flankTarget && unit.active && unit.status !== 'broken');
    const madeContact = flank.some((unit) => targets.some((target) => distance(unit, target) <= rangeLimit(unit) + 22));
    if (madeContact && this.time <= this.surpriseDeadline) {
      this.surpriseState = 'triggered';
      for (const unit of targets) {
        unit.morale = clamp(unit.morale - 18);
        unit.cohesion = clamp(unit.cohesion - 12);
      }
      this.events.push({ time: this.time, type: 'surprise', message: "Jackson's line has struck Howard's exposed flank before the XI Corps can reverse its front." });
      return;
    }
    if (this.time < this.surpriseDeadline) return;
    this.surpriseState = 'expired';
    for (const unit of targets) {
      unit.morale = clamp(unit.morale + 4);
      unit.cohesion = clamp(unit.cohesion + 8);
    }
    this.events.push({ time: this.time, type: 'warning', message: "The surprise window has closed; Howard's divisions are turning toward the threatened flank." });
  }

  updateCedarCreekEvents() {
    if (this.surpriseState === 'pending') {
      const attackers = this.state.filter((unit) => this.config.surpriseFormationIds.includes(unit.id) && unit.active && unit.status !== 'broken');
      const targets = this.state.filter((unit) => unit.surpriseTarget && unit.active && unit.status !== 'broken');
      const madeContact = attackers.some((unit) => targets.some((target) => distance(unit, target) <= rangeLimit(unit) + 18));
      if (madeContact && this.time <= this.surpriseDeadline) {
        this.surpriseState = 'triggered';
        for (const unit of targets) {
          unit.morale = clamp(unit.morale - 17);
          unit.cohesion = clamp(unit.cohesion - 14);
        }
        this.events.push({ time: this.time, type: 'surprise', message: "Early's columns have broken into the VIII and XIX Corps camps before the Union line can form." });
      } else if (this.time >= this.surpriseDeadline) {
        this.surpriseState = 'expired';
        for (const unit of targets) unit.cohesion = clamp(unit.cohesion + 8);
        this.events.push({ time: this.time, type: 'warning', message: 'The dawn advantage has expired; the Union corps are forming above Cedar Creek.' });
      }
    }

    if (this.choiceId !== 'option_b' || this.cedarDisciplineBroken || this.time < 34) return;
    this.cedarDisciplineBroken = true;
    for (const unit of this.state.filter((formation) => formation.side === 'confederate' && formation.active && formation.status !== 'broken')) {
      unit.morale = clamp(unit.morale - 9);
      unit.cohesion = clamp(unit.cohesion - 11);
      unit.fatigue = clamp(unit.fatigue + 5);
    }
    this.events.push({ time: this.time, type: 'warning', message: 'The advance has stalled among captured tents, wagons, and food; the ranks are losing cohesion while Sheridan rides south.' });
  }

  updateGettysburgEvents() {
    if (this.choiceId !== 'option_a') return;
    if (!this.gettysburgCannonadeComplete && this.time >= 16) {
      this.gettysburgCannonadeComplete = true;
      const artillery = this.state.find((unit) => unit.id === 'alexander-battalion');
      if (artillery) artillery.ammunition = Math.max(0, artillery.ammunition - 9);
      for (const unit of this.state.filter((formation) => formation.unionCenter)) unit.cohesion = clamp(unit.cohesion - 3);
      this.events.push({ time: this.time, type: 'command', message: "Alexander's cannonade is lifting. The infantry must cross the Emmitsburg Road before the Union batteries recover." });
    }
    if (this.assaultState !== 'pending') return;
    const attackers = this.state.filter((unit) => this.config.chargeFormationIds.includes(unit.id) && unit.active && unit.status !== 'broken');
    const center = this.state.filter((unit) => this.config.unionCenterIds.includes(unit.id) && unit.active && unit.status !== 'broken');
    const madeContact = attackers.some((unit) => center.some((target) => distance(unit, target) <= rangeLimit(unit) + 18));
    if (madeContact && this.time <= this.assaultDeadline) {
      this.assaultState = 'engaged';
      this.events.push({ time: this.time, type: 'assault', message: 'The assault has crossed the Emmitsburg Road and entered the canister zone below Cemetery Ridge.' });
      return;
    }
    if (this.time < this.assaultDeadline) return;
    this.assaultState = 'expired';
    for (const unit of attackers) {
      unit.morale = clamp(unit.morale - 8);
      unit.cohesion = clamp(unit.cohesion - 6);
    }
    this.events.push({ time: this.time, type: 'warning', message: 'The assault window has closed in the open field; Union infantry and artillery have recovered behind the ridge line.' });
  }

  updateGettysburgJacksonEvents() {
    if (this.surpriseState !== 'pending') return;
    const attackers = this.state.filter((unit) => this.config.surpriseFormationIds.includes(unit.id) && unit.active && unit.status !== 'broken');
    const targets = this.state.filter((unit) => this.config.unionCenterIds.includes(unit.id) && unit.active && unit.status !== 'broken');
    const madeContact = attackers.some((unit) => targets.some((target) => distance(unit, target) <= rangeLimit(unit) + 20));
    if (madeContact && this.time <= this.surpriseDeadline) {
      this.surpriseState = 'triggered';
      for (const unit of targets) {
        unit.morale = clamp(unit.morale - 14);
        unit.cohesion = clamp(unit.cohesion - 12);
      }
      this.events.push({ time: this.time, type: 'surprise', message: "Jackson's corps has reached Cemetery Hill and Culp's Hill before the Union fishhook is fully joined." });
      return;
    }
    if (this.time < this.surpriseDeadline) return;
    this.surpriseState = 'expired';
    for (const unit of targets) unit.cohesion = clamp(unit.cohesion + 7);
    this.events.push({ time: this.time, type: 'warning', message: 'The opportunity has narrowed; Union reinforcements are linking Cemetery Hill to Culp\'s Hill and Cemetery Ridge.' });
  }

  updateChickamaugaEvents() {
    if (this.gapState === 'pending' && this.time >= this.gapOpenTime) {
      this.gapState = 'open';
      const wood = this.state.find((unit) => unit.id === 'wood-division-gap');
      if (wood) {
        wood.x = 610;
        wood.y = 335;
        wood.target = { x: wood.x, y: wood.y };
        wood.cohesion = clamp(wood.cohesion - 8);
      }
      for (const unit of this.state.filter((formation) => ['davis-division-gap', 'sheridan-division-gap'].includes(formation.id))) {
        unit.cohesion = clamp(unit.cohesion - 10);
        unit.morale = clamp(unit.morale - 5);
      }
      this.events.push({ time: this.time, type: 'gap', message: "Wood's movement has opened the Union center near the Brotherton cabin. Longstreet's column has a short interval to pass through it." });
    }

    const attackers = this.state.filter((unit) => this.config.longstreetFormationIds.includes(unit.id) && unit.active && !['broken', 'routing'].includes(unit.status));
    const throughCorridor = attackers.filter((unit) => unit.x >= 560 && unit.x <= 1190 && unit.y <= 640).length;
    if (this.gapState === 'open' && throughCorridor >= 2 && this.time <= this.gapDeadline) {
      this.gapState = 'breached';
      for (const unit of this.state.filter((formation) => this.config.gapTargetIds.includes(formation.id))) {
        unit.morale = clamp(unit.morale - 17);
        unit.cohesion = clamp(unit.cohesion - 15);
      }
      this.events.push({ time: this.time, type: 'breakthrough', message: "Longstreet's divisions have passed through the Brotherton gap and split the Union right from Thomas's line." });
    } else if (this.gapState === 'open' && this.time >= this.gapDeadline) {
      this.gapState = 'closed';
      for (const unit of this.state.filter((formation) => this.config.gapTargetIds.includes(formation.id))) unit.cohesion = clamp(unit.cohesion + 8);
      this.events.push({ time: this.time, type: 'warning', message: 'The Union center has closed the accidental opening; the attack is becoming another disconnected fight in the woods.' });
    }

    if (this.gapState !== 'breached' || this.chickamaugaExploitationState !== 'pending') return;
    const exploiting = attackers.filter((unit) => unit.y <= 520).length;
    if (exploiting < 2) return;
    this.chickamaugaExploitationState = 'exploited';
    this.events.push({ time: this.time, type: 'exploitation', message: "The concentrated column has crossed Dyer Field before Thomas can seal Horseshoe Ridge; the Union right is in flight toward Rossville." });
  }

  updateColdHarborEvents() {
    if (this.coldHarborAssaultState === 'pending' && this.time >= this.coldHarborAssaultStartTime) {
      this.coldHarborAssaultState = 'engaged';
      for (const unit of this.state.filter((formation) => formation.side === 'union' && formation.type === 'infantry' && formation.active && formation.status !== 'broken')) {
        unit.order = 'advance';
        const enemy = this.nearestEnemy(unit);
        if (enemy) this.setAdvanceTarget(unit, enemy);
      }
      this.events.push({ time: this.time, type: 'assault', message: "Grant's corps are advancing from the mist across broken ground toward Lee's interlocking works." });
    }

    const assaultFormations = this.state.filter((unit) => this.config.assaultFormationIds.includes(unit.id));
    const committed = assaultFormations.filter((unit) => unit.active && !['broken', 'routing'].includes(unit.status) && unit.y >= 430);
    if (this.coldHarborAssaultState === 'engaged' && !this.coldHarborCrossfireTriggered && committed.length >= 3 && this.coldHarborWorksOccupied()) {
      this.coldHarborCrossfireTriggered = true;
      for (const unit of committed) {
        unit.cohesion = clamp(unit.cohesion - 9);
        unit.morale = clamp(unit.morale - 6);
      }
      this.events.push({ time: this.time, type: 'crossfire', message: 'The ravines have split the assault columns and the Confederate traverses are bringing overlapping fire across the open approaches.' });
    }

    if (this.coldHarborAssaultState === 'engaged' && this.time >= this.coldHarborAssaultStartTime + 18) {
      const initial = assaultFormations.reduce((sum, unit) => sum + unit.initialStrength, 0);
      const current = assaultFormations.reduce((sum, unit) => sum + unit.strength, 0);
      // A corps that has physically broken off for a sustained interval has
      // been repulsed even if it saved enough cohesion to avoid a rout.
      const brokenOff = unit => this.battleRulesVersion >= 7 && unit.participated
        && ['fallback', 'rally', 'withdraw'].includes(unit.order) && unit.y < 615
        && !unit.inMelee && Number.isFinite(unit.lastMeleeAt) && this.time - unit.lastMeleeAt >= 8;
      const shaken = assaultFormations.filter((unit) => ['broken', 'routing'].includes(unit.status) || unit.morale <= 34 || unit.cohesion <= 28 || brokenOff(unit)).length;
      if (shaken >= 3 || current / Math.max(1, initial) < 0.74) {
        this.coldHarborAssaultState = 'repulsed';
        for (const unit of assaultFormations.filter((formation) => formation.active && !['broken', 'routing'].includes(formation.status) && (this.battleRulesVersion < 7 || !['fallback', 'rally', 'withdraw'].includes(formation.order)))) {
          unit.order = 'hold';
          unit.target = { x: unit.x, y: unit.y };
        }
        this.events.push({ time: this.time, type: 'repulse', message: 'The main Federal assault has stopped short of the works; survivors are digging shallow cover where they fell.' });
      }
    }

    if (this.transferState === 'pending') {
      const transfers = this.state.filter((unit) => this.config.transferFormationIds.includes(unit.id));
      const clear = transfers.every((unit) => (this.fieldBattle ? unit.withdrawn : unit.y >= 820) && this.coldHarborOrganized(unit));
      if (clear) {
        this.transferState = 'transferred';
        this.events.push({ time: this.time, type: 'movement', message: 'The reserve columns and wagons have cleared the Cold Harbor screen and are moving toward the Petersburg approaches.' });
      } else if (this.time >= this.transferDeadline) {
        this.transferState = 'missed';
        this.events.push({ time: this.time, type: 'warning', message: 'The Petersburg movement window has closed while reserve formations remain tied to the Cold Harbor line.' });
      }
    }
  }

  coldHarborOrganized(unit) {
    return unit.withdrawn ? unit.withdrawalOrganized === true
      : unit.active && !['broken', 'routing'].includes(unit.status)
        && unit.morale >= ROUTING_LIMITS.morale && unit.cohesion >= ROUTING_LIMITS.cohesion
        && unit.strength > unit.initialStrength * ROUTING_LIMITS.strengthRatio;
  }

  coldHarborWorksOccupied() {
    return this.state.filter((unit) => unit.side === 'confederate' && unit.type === 'infantry'
      && unit.entrenchDefender && unit.active && this.coldHarborOrganized(unit)
      && unit.x >= 0 && unit.x <= this.world.width && unit.y >= 615 && unit.y <= this.world.height).length >= 2;
  }

  registerColdHarborExit(unit) {
    if (this.scenarioId !== 'cold_harbor' || this.pendingOutcome || this.outcome !== 'undecided' || !unit.active) return;
    if (unit.x >= 0 && unit.x <= this.world.width && unit.y >= 0 && unit.y <= this.world.height) return;
    unit.withdrawalOrganized = this.coldHarborOrganized(unit);
    unit.withdrawn = true;
    unit.active = false;
    unit.arrivalTime = null;
    unit.order = 'hold';
    unit.target = { x: unit.x, y: unit.y };
    unit.engagedWith = null;
    this.#explicitDestinations.delete(unit.id);
    this.events.push({ time: this.time, type: 'withdrawal', message: `${unit.name} has left the Cold Harbor field${unit.withdrawalOrganized ? ' in order' : ' in disorder'} and can no longer hold or fire from the works.` });
  }

  updatePetersburgEvents() {
    if (this.craterPosture === 'night-sortie') {
      const sortie = this.state.filter((unit) => this.config.sortieFormationIds.includes(unit.id) && (unit.active || (this.fieldBattle && unit.withdrawn && unit.withdrawalOrganized)) && !['broken', 'routing'].includes(unit.status));
      const objectives = this.state.filter((unit) => this.config.siegeObjectiveIds.includes(unit.id) && unit.active && unit.status !== 'broken');
      for (const objective of objectives) {
        if (this.sortieTargetsHit.includes(objective.id)) continue;
        if (!sortie.some((unit) => distance(unit, objective) <= 245)) continue;
        this.sortieTargetsHit.push(objective.id);
        objective.strength = Math.max(1, objective.initialStrength * 0.18);
        objective.morale = 8;
        objective.cohesion = 10;
        this.events.push({ time: this.time, type: 'raid', message: `${objective.name} has been overrun; gabions, tools, and exposed siege material are burning.` });
      }
      if (this.sortieState === 'approaching' && this.sortieTargetsHit.length >= this.config.siegeObjectiveIds.length) {
        this.sortieState = 'raided';
        this.events.push({ time: this.time, type: 'objective', message: 'Both siege-work sectors have been struck. Withdraw Mahone through the covered approach before Union reinforcements close the route.' });
      }
      if (this.sortieState === 'raided' && sortie.length && (this.fieldBattle ? this.config.sortieFormationIds.every(id => sortie.some(unit => unit.id === id && unit.withdrawn && unit.withdrawalOrganized)) : sortie.every((unit) => unit.y >= 760))) {
        this.sortieState = 'withdrawn';
        this.events.push({ time: this.time, type: 'withdrawal', message: 'The sortie has returned behind the Petersburg works with its formations intact.' });
      } else if (this.sortieState === 'approaching' && this.time >= this.sortieDeadline) {
        this.sortieState = 'missed';
        this.events.push({ time: this.time, type: 'warning', message: 'The raid window has closed before both siege sectors were struck.' });
      } else if (this.sortieState === 'raided' && this.time >= this.sortieDeadline + 32) {
        this.sortieState = 'trapped';
        this.events.push({ time: this.time, type: 'warning', message: 'Union reinforcements have closed the route back to the covered way.' });
      }
      return;
    }

    if (this.craterState === 'breached' && this.time >= this.craterAssaultStartTime) {
      this.craterState = 'contested';
      for (const unit of this.state.filter((formation) => this.config.craterAttackerIds.includes(formation.id) && formation.active && formation.status !== 'broken')) {
        unit.order = 'advance';
        const enemy = this.nearestEnemy(unit);
        if (enemy) this.setAdvanceTarget(unit, enemy);
      }
      this.events.push({ time: this.time, type: 'assault', message: "Burnside's divisions are moving through and around the crater toward the secondary Confederate works." });
    }

    const attackers = this.state.filter((unit) => this.config.craterAttackerIds.includes(unit.id) && unit.active);
    const mahone = this.state.filter((unit) => this.config.mahoneFormationIds.includes(unit.id) && unit.active && !['broken', 'routing'].includes(unit.status));

    if (this.mineState === 'armed') {
      const inMarkedLanes = attackers.filter((unit) => !['broken', 'routing'].includes(unit.status) && unit.y >= 445 && unit.y <= 610);
      if (inMarkedLanes.length >= 2) {
        this.mineState = 'detonated';
        for (const unit of inMarkedLanes) {
          unit.strength = Math.max(1, unit.strength - unit.initialStrength * 0.045);
          unit.morale = clamp(unit.morale - 17);
          unit.cohesion = clamp(unit.cohesion - 21);
        }
        this.events.push({ time: this.time, type: 'mine', message: 'The marked lanes have erupted beneath the crowded assault; buried shells and torpedoes break its order without replacing the defensive line.' });
      } else if (this.time >= this.craterDeadline) {
        this.mineState = 'missed';
        this.events.push({ time: this.time, type: 'warning', message: 'The mine window has closed without catching enough of the assault in the marked lanes.' });
      }
    }

    if (this.craterPosture === 'counterattack' && this.craterState === 'contested') {
      const atBreach = mahone.filter((unit) => unit.y <= 725 && unit.x >= 470 && unit.x <= 1210);
      if (atBreach.length >= 2) {
        this.craterState = 'sealed';
        for (const unit of attackers.filter((formation) => formation.y >= 380)) {
          unit.morale = clamp(unit.morale - 18);
          unit.cohesion = clamp(unit.cohesion - 16);
        }
        this.events.push({ time: this.time, type: 'counterattack', message: "Mahone's brigades have reached the breach together, sealing its shoulders and trapping the disordered Union divisions around the crater." });
      }
    }

    if (this.craterPosture === 'containment' && this.craterState === 'contested' && this.time >= this.craterDeadline) {
      const defenders = this.state.filter((unit) => unit.secondaryDefender && unit.active && !['broken', 'routing'].includes(unit.status));
      const throughLine = attackers.filter((unit) => !['broken', 'routing'].includes(unit.status) && unit.y >= 655);
      this.craterState = defenders.length >= 3 && !throughLine.length ? 'contained' : 'overrun';
      this.events.push({ time: this.time, type: this.craterState === 'contained' ? 'containment' : 'warning', message: this.craterState === 'contained' ? 'The secondary works have held; the Union lodgment remains trapped around the crater without access to the Petersburg heights.' : 'Union formations have passed the secondary line and are opening the road toward the Petersburg heights.' });
    }

    if (this.craterPosture === 'mine-channel' && this.craterState === 'contested' && this.mineState === 'detonated' && this.time >= this.craterAssaultStartTime + 28) {
      const shaken = attackers.filter((unit) => ['broken', 'routing'].includes(unit.status) || unit.morale <= 34 || unit.cohesion <= 28).length;
      if (shaken >= 2) {
        this.craterState = 'sealed';
        this.events.push({ time: this.time, type: 'containment', message: 'The mine shock and defensive fire have stopped the assault short of the secondary works; reserves are closing the crater perimeter.' });
      }
    }

    if (['counterattack', 'mine-channel'].includes(this.craterPosture) && ['breached', 'contested'].includes(this.craterState) && this.time >= this.craterDeadline) {
      this.craterState = 'overrun';
      this.events.push({ time: this.time, type: 'warning', message: 'The breach has remained open too long; organized Union formations are moving beyond the crater toward the high ground.' });
    }
  }

  updateWildernessEvents() {
    if (this.choiceId !== 'option_c' || this.leeCrisisTriggered) return;
    const texans = this.state.find((unit) => unit.id === this.config.texasFormationId);
    if (texans?.active) return;
    const front = this.state.filter((unit) => unit.wildernessFront);
    const current = front.reduce((sum, unit) => sum + unit.strength, 0);
    const initial = front.reduce((sum, unit) => sum + unit.initialStrength, 0);
    if (current / Math.max(1, initial) > 0.88) return;
    this.leeCrisisTriggered = true;
    this.commanderStatus = 'nearly lost at the line';
    for (const formation of this.state.filter((unit) => unit.side === 'confederate' && unit.active)) {
      formation.morale = clamp(formation.morale - 6);
      formation.cohesion = clamp(formation.cohesion - 4);
    }
    this.events.push({ time: this.time, type: 'command', message: 'Lee has ridden into the broken front; staff officers and the approaching Texans struggle to pull him back.' });
  }

  winchesterRetreatTarget(unit) {
    const exit = this.config.withdrawalCorridor;
    return { x: clamp(unit.x, exit.left + 40, exit.right - 40), y: exit.top + 35 };
  }

  retreatTarget(unit, margin, resolutionSpread = null) {
    // Shiloh's Confederate rear is above the field; most maps face the
    // opposite way. Keep command, routing, and the final exit consistent.
    if (this.scenarioId === 'third_winchester' && unit.side === 'confederate') {
      const target = this.winchesterRetreatTarget(unit);
      return resolutionSpread === null ? target : { ...target, y: this.world.height + margin };
    }
    const edge = this.config.retreatEdges?.[unit.side] || (unit.side === 'confederate' ? 'bottom' : 'top');
    return {
      x: resolutionSpread === null ? unit.x : clamp(unit.x + resolutionSpread, 40, this.world.width - 40),
      y: edge === 'top' ? -margin : this.world.height + margin,
    };
  }

  updateThirdWinchesterEvents(dt) {
    const progress = this.thirdWinchester;
    const organized = (unit) => unit.active && !['broken', 'routing'].includes(unit.status) && unit.morale >= ROUTING_LIMITS.morale && unit.cohesion >= ROUTING_LIMITS.cohesion && unit.strength > unit.initialStrength * ROUTING_LIMITS.strengthRatio;
    const inside = (unit, area) => unit.x >= area.left && unit.x <= area.right && unit.y >= area.top && unit.y <= area.bottom;
    const enemies = this.state.filter((unit) => unit.side === 'union' && organized(unit));
    const defenders = this.state.filter((unit) => unit.side === 'confederate' && unit.type === 'infantry' && organized(unit));
    const underPressure = (unit) => enemies.some((enemy) => distance(unit, enemy) <= 330);
    const middleHeld = defenders.filter((unit) => unit.order !== 'withdraw' && inside(unit, this.config.middleField) && underPressure(unit)).length >= 2;
    const covering = defenders.some((unit) => this.config.rearguardFormationIds.includes(unit.id) && unit.order !== 'withdraw' && inside(unit, this.config.rearguardSector) && underPressure(unit));
    const retiring = this.state.some((unit) => unit.side === 'confederate' && ((unit.withdrawn && unit.withdrawalOrganized) || (organized(unit) && unit.order === 'withdraw')));
    const oldMiddle = progress.middleFieldHeld;
    const oldRear = progress.rearguardHeld;
    progress.middleFieldHeld = Math.min(this.config.middleFieldHoldRequired, oldMiddle + (middleHeld ? dt : 0));
    progress.rearguardHeld = Math.min(this.config.rearguardHoldRequired, oldRear + (covering && retiring ? dt : 0));
    if (oldMiddle < this.config.middleFieldHoldRequired && progress.middleFieldHeld >= this.config.middleFieldHoldRequired) this.events.push({ time: this.time, type: 'objective', message: 'The Middle Field defense has bought time. Withdraw through Winchester or hold against the coming northern flank.' });
    if (oldRear < this.config.rearguardHoldRequired && progress.rearguardHeld >= this.config.rearguardHoldRequired) this.events.push({ time: this.time, type: 'objective', message: 'The rearguard has covered the retiring columns. Bring Gordon and Wharton out before they are isolated.' });

    const crook = this.state.filter((unit) => this.config.crookFormationIds.includes(unit.id));
    if (crook.some((unit) => unit.active)) progress.flankState = crook.every((unit) => unit.active) ? 'engaged' : 'arriving';
    if (this.time >= this.config.cavalryPressureTime) {
      progress.cavalryPressureState = 'pressing';
      const pulsesDue = 1 + Math.floor((Math.min(this.time, this.config.maxTime) - this.config.cavalryPressureTime) / 20);
      while (progress.cavalryPulses < pulsesDue) {
        progress.cavalryPulses += 1;
        this.events.push({ time: this.time, type: 'dispatch', message: 'Off-map dispatch: Federal cavalry presses south toward Fort Collier. Northern units face mounting pressure; the Winchester withdrawal corridor remains to the lower left.' });
        for (const unit of defenders.filter((unit) => unit.x >= 850 && unit.y < 810)) {
          unit.morale = clamp(unit.morale - (covering ? 3 : 9));
          unit.cohesion = clamp(unit.cohesion - (covering ? 2 : 7));
          this.checkRouting(unit);
        }
      }
    }

    // Removed from combat only after physically reaching the marked exit.
    // Routed survivors escape too, but do not count as an organized withdrawal.
    const exit = this.config.withdrawalCorridor;
    for (const unit of this.state.filter((unit) => unit.side === 'confederate' && unit.active && unit.status !== 'broken')) {
      if (unit.x < exit.left || unit.x > exit.right || unit.y < exit.top) continue;
      if (this.fieldBattle && ((!['withdraw'].includes(unit.order) && unit.status !== 'routing') || enemies.some(v => distance(unit, v) < 80))) continue;
      if (this.fieldBattle) { unit.retiredAt = this.time; this.recordCombatEvent('departure', unit); }
      unit.withdrawalOrganized = organized(unit);
      unit.withdrawn = true;
      this.#explicitDestinations.delete(unit.id);
      unit.active = false;
      unit.arrivalTime = null;
      unit.engagedWith = null;
      unit.order = 'hold';
      unit.target = { x: unit.x, y: unit.y };
      this.events.push({ time: this.time, type: 'withdrawal', message: `${unit.name} has reached the Winchester corridor${unit.withdrawalOrganized ? ' in order' : ' in disorder'}.` });
    }
    progress.escapedStrength = this.state.filter((unit) => unit.withdrawn && unit.withdrawalOrganized).reduce((sum, unit) => sum + unit.strength, 0);
    progress.escapedRatio = progress.escapedStrength / this.initialConfederate;
    progress.rearguardSurvived = this.state.some((unit) => this.config.rearguardFormationIds.includes(unit.id) && unit.withdrawn && unit.withdrawalOrganized);
    const covered = progress.middleFieldHeld >= this.config.middleFieldHoldRequired || progress.rearguardHeld >= this.config.rearguardHoldRequired;
    progress.withdrawalState = covered && progress.escapedRatio >= 0.65 && progress.rearguardSurvived ? 'secured' : this.state.some((unit) => unit.withdrawn || (unit.side === 'confederate' && unit.order === 'withdraw')) ? 'withdrawing' : 'holding';
  }

  moveUnit(unit, dt, speedMultiplier = 1) {
    if (!['advance', 'withdraw'].includes(unit.order)) return;
    const dx = unit.target.x - unit.x;
    const dy = unit.target.y - unit.y;
    const length = Math.hypot(dx, dy);
    if (this.battleRulesVersion >= 2 && length >= 5) {
      unit.facing = turnToward(unit, Math.atan2(dy, dx), dt);
      unit.turning = angularDistance(unit.facing, Math.atan2(dy, dx)) > 0.01;
    }
    if (length < 5) {
      if (this.#explicitDestinations.delete(unit.id)) {
        unit.x = unit.target.x;
        unit.y = unit.target.y;
      }
      unit.order = 'hold';
      return;
    }
    const base = unit.order === 'withdraw' ? 38 : unit.type === 'artillery' ? 13 : 25;
    const speed = base * speedMultiplier
      * (unit.formationMode === 'column' ? 1.18 : unit.formationMode === 'skirmish' ? 1.08 : unit.formationMode === 'deep' ? 0.9 : 1)
      * this.terrainMovementMultiplier(unit);
    if (this.#explicitDestinations.has(unit.id)) {
      const step = Math.min(length, speed * dt);
      unit.x += dx / length * step;
      unit.y += dy / length * step;
      if (step === length) {
        unit.x = unit.target.x;
        unit.y = unit.target.y;
        unit.order = 'hold';
        this.#explicitDestinations.delete(unit.id);
      }
    } else {
      unit.x += dx / length * speed * dt;
      unit.y += dy / length * speed * dt;
    }
    unit.fatigue = clamp(unit.fatigue + dt * (unit.order === 'withdraw' ? 0.72 : 0.38));
    this.registerColdHarborExit(unit);
  }

  terrainMovementMultiplier(unit) {
    if (this.gettysburg) return gettysburgTerrain(unit).movement;
    if (this.fieldBattle) return fieldTerrain(this, unit).movement;
    const movement = this.config.movement;
    if (!movement) return 1;
    let multiplier = movement.baseMultiplier ?? 1;
    for (const band of movement.roadBands || []) {
      const coordinate = band.axis === 'x' ? unit.x : unit.y;
      if (Math.abs(coordinate - band.value) <= band.width) multiplier = Math.max(multiplier, band.multiplier);
    }
    return multiplier;
  }

  resolveVolley(attacker, defender) {
    if (this.gettysburg || this.fieldBattle) return resolveGettysburgVolley(this, attacker, defender);
    if (this.battleRulesVersion >= 2 && (!this.validTarget(attacker, defender) || !inFireArc(attacker, defender)
      || distance(attacker, defender) > rangeLimit(attacker) || attacker.ammunition <= 0 || attacker.reload > 0
      || !attacker.active || ['routing', 'broken'].includes(attacker.status))) return;
    const gap = distance(attacker, defender);
    const rangeFalloff = clamp(1.22 - gap / Math.max(rangeLimit(attacker), 1) * 0.55, 0.5, 1.1);
    const formationFire = attacker.type === 'artillery'
      ? 1.55
      : attacker.formationMode === 'line'
        ? 1.14
        : attacker.formationMode === 'skirmish'
          ? 0.78
          : attacker.formationMode === 'column'
            ? 0.55
            : 0.82;
    const quality = (attacker.cohesion * 0.58 + attacker.morale * 0.42) / 100;
    const fatigue = 1 - attacker.fatigue / 150;
    const base = attacker.type === 'artillery' ? 34 : Math.max(7, attacker.strength / 125);
    const cover = this.terrainDefense(defender);
    const losses = Math.max(2, base * formationFire * quality * fatigue * rangeFalloff / cover);

    defender.strength = Math.max(0, defender.strength - losses);
    defender.cohesion = clamp(defender.cohesion - losses * (attacker.type === 'artillery' ? 0.13 : 0.075));
    defender.morale = clamp(defender.morale - losses * (attacker.type === 'artillery' ? 0.09 : 0.052));
    attacker.ammunition = Math.max(0, attacker.ammunition - 1);
    attacker.reload = attacker.type === 'artillery' ? 5.1 : attacker.formationMode === 'line' ? 3.4 : 4.1;
    attacker.lastVolleyAt = this.time;
    attacker.volleySerial += 1;
    this.recordCombatEvent('volley', attacker, defender);
    attacker.fatigue = clamp(attacker.fatigue + (attacker.type === 'artillery' ? 0.7 : 0.42));
  }

  terrainDefense(unit) {
    if (this.gettysburg) return gettysburgTerrain(unit).defense;
    if (this.fieldBattle) return fieldTerrain(this, unit).defense;
    if (this.scenarioId === 'third_winchester') {
      if (unit.side === 'confederate' && unit.x >= 300 && unit.x <= 1250 && unit.y >= 550 && unit.y <= 730) return 1.22;
      if (unit.x >= 1250 && unit.y >= 290 && unit.y <= 620) return 1.08;
      if (unit.y >= 180 && unit.y <= 280) return 1.12;
      return 1;
    }
    if (this.scenarioId === 'shiloh') {
      if (unit.y >= 500 && unit.y <= 650) return 1.12;
      if (unit.side === 'union' && unit.y >= 700) return 1.16;
      return 1.03;
    }
    if (this.scenarioId === 'chancellorsville') {
      if (unit.flankTarget && this.surpriseState === 'triggered') return 0.94;
      if (unit.x <= 720) return 1.1;
      return 1.04;
    }
    if (this.scenarioId === 'wilderness') {
      if (unit.wildernessFront) return 1.08;
      if (unit.reinforcementRole) return 1.04;
      return 1.1;
    }
    if (this.scenarioId === 'cedar_creek') {
      if (unit.surpriseTarget && this.surpriseState === 'triggered') return 0.92;
      if (unit.side === 'union' && unit.y >= 300 && unit.y <= 470) return 1.12;
      if (unit.y >= 555 && unit.y <= 650) return 1.08;
      return 1.02;
    }
    if (this.scenarioId === 'gettysburg') {
      if (unit.stoneWall) return 1.3;
      if (unit.ridgeDefender) return 1.22;
      if (unit.y >= 485 && unit.y <= 555) return 1.05;
      return 1.01;
    }
    if (this.scenarioId === 'gettysburg_jackson') {
      if (unit.hillDefender && this.surpriseState === 'triggered') return 1.04;
      if (unit.hillDefender) return 1.2;
      if (unit.ridgeDefender) return 1.16;
      return 1.02;
    }
    if (this.scenarioId === 'chickamauga') {
      if (unit.gapTarget && ['open', 'breached'].includes(this.gapState)) return 0.94;
      if (unit.ridgeDefender) return 1.2;
      if (unit.woodedFront) return 1.1;
      return 1.06;
    }
    if (this.scenarioId === 'cold_harbor') {
      if (!unit.active || unit.x < 0 || unit.x > this.world.width || unit.y < 0 || unit.y > this.world.height) return 1;
      if (unit.side === 'confederate' && unit.entrenchDefender && ['prepared', 'screening'].includes(this.entrenchmentState) && unit.y >= 615) return 1.48;
      if (unit.side === 'union' && unit.y >= 410 && unit.y <= 620) return 0.94;
      if (unit.side === 'union' && unit.y < 410) return 1.04;
      return 1.02;
    }
    if (this.scenarioId === 'petersburg') {
      if (unit.secondaryDefender && unit.y >= 640) return this.craterState === 'overrun' ? 1.08 : 1.38;
      if (unit.mahoneReserve && this.craterState === 'sealed') return 1.18;
      if (unit.craterAttacker && unit.y >= 380 && unit.y <= 590) return 0.82;
      if (unit.sortieFormation) return 1.04;
      if (unit.siegeObjective) return 1.12;
      return 1.02;
    }
    if (unit.side === 'confederate' && unit.y >= 535 && unit.y <= 720) return 1.16;
    if (unit.y >= 430 && unit.y <= 520) return 1.07;
    return 1;
  }

  resolveCloseCombat(attacker, defender, dt) {
    const pressure = (attacker.strength / Math.max(1, attacker.initialStrength)) * ((attacker.morale + attacker.cohesion) / 200);
    const losses = Math.max(0.08, pressure * dt * 3.2);
    defender.strength = Math.max(0, defender.strength - losses);
    defender.cohesion = clamp(defender.cohesion - losses * 0.2 - dt * 0.35);
    defender.morale = clamp(defender.morale - losses * 0.12 - dt * 0.18);
    attacker.fatigue = clamp(attacker.fatigue + dt * 0.7);
  }

  checkRouting(unit) {
    if (this.fieldBattle) { if (unit.active) tacticalPressure(this, unit, 0); return; }
    if (unit.morale >= ROUTING_LIMITS.morale && unit.cohesion >= ROUTING_LIMITS.cohesion && unit.strength > unit.initialStrength * ROUTING_LIMITS.strengthRatio) { this.#routingCues.delete(unit.id); return; }
    this.#explicitDestinations.delete(unit.id);
    unit.status = unit.strength <= unit.initialStrength * ROUTING_LIMITS.brokenRatio ? 'broken' : 'routing';
    if (this.#routingCues.get(unit.id) !== unit.status) this.recordCombatEvent(unit.status, unit);
    this.#routingCues.set(unit.id, unit.status);
    unit.order = 'withdraw';
    unit.target = this.retreatTarget(unit, 85);
    unit.facing = Math.atan2(unit.target.y - unit.y, unit.target.x - unit.x);
  }

  judgeOutcome(dt = 0) {
    if (this.gettysburg) return judgeGettysburg(this);
    if (this.fieldBattle && (judgeFieldExit(this) || updateFieldMission(this, dt))) return;
    const confederateRatio = this.sideStrength('confederate') / this.initialConfederate;
    const unionRatio = this.sideStrength('union') / this.initialUnion;
    const confederates = this.state.filter((unit) => unit.side === 'confederate' && !['broken', 'routing'].includes(unit.status) && (!this.fieldBattle || (!unit.withdrawn && unit.status !== 'surrendered')));
    const union = this.state.filter((unit) => unit.side === 'union' && !['broken', 'routing'].includes(unit.status) && (!this.fieldBattle || (!unit.withdrawn && unit.status !== 'surrendered')));
    let decision = null;
    if (this.scenarioId === 'third_winchester') {
      const progress = this.thirdWinchester;
      const fieldArmy = confederates.filter((unit) => unit.active);
      const federalField = union.filter((unit) => unit.active);
      const crookCommitted = this.config.crookFormationIds.every((id) => this.state.find((unit) => unit.id === id)?.active);
      if (progress.withdrawalState === 'secured') decision = 'disciplined-withdrawal';
      else if (confederateRatio < 0.3 || (!fieldArmy.length && progress.escapedRatio < 0.45)) decision = 'rout';
      else if (crookCommitted && progress.middleFieldHeld >= this.config.middleFieldHoldRequired && fieldArmy.length >= 2 && (!federalField.length || unionRatio < 0.38)) decision = confederateRatio > 0.72 ? 'decisive-win' : 'costly-win';
      else if (!fieldArmy.length || this.time >= this.config.maxTime) decision = progress.escapedRatio >= 0.45 || confederateRatio > 0.45 ? 'defeat' : 'rout';
      if (decision) this.beginResolution(decision);
      return;
    }
    if (this.scenarioId === 'shiloh') {
      const atLanding = confederates.some((unit) => unit.y >= 735);
      if ((!union.length || unionRatio < 0.3 || (atLanding && unionRatio < 0.58))) decision = confederateRatio > 0.63 ? 'decisive-win' : 'costly-win';
      else if (!confederates.length || confederateRatio < 0.29) decision = 'rout';
      else if (this.choiceId === 'option_d' && this.time > 42 && this.state.filter((unit) => unit.side === 'confederate').every((unit) => unit.y < 245 || unit.status === 'broken')) decision = confederateRatio > 0.7 ? 'disciplined-withdrawal' : 'defeat';
      else if (this.time >= this.config.maxTime) decision = unionRatio + 0.06 < confederateRatio ? (unionRatio < 0.58 ? 'costly-win' : 'disciplined-withdrawal') : confederateRatio > 0.6 ? 'disciplined-withdrawal' : 'defeat';
      this.updateCommanderStatus(confederateRatio);
      if (decision) this.beginResolution(decision);
      return;
    }
    if (this.scenarioId === 'chancellorsville') {
      const flankTargets = this.state.filter((unit) => unit.flankTarget);
      const flankInitial = flankTargets.reduce((sum, unit) => sum + unit.initialStrength, 0);
      const flankRatio = flankTargets.reduce((sum, unit) => sum + unit.strength, 0) / Math.max(1, flankInitial);
      const flankStillOrganized = flankTargets.some((unit) => !['broken', 'routing'].includes(unit.status));
      const shakenFlankFormations = flankTargets.filter((unit) => ['broken', 'routing'].includes(unit.status) || unit.morale <= 30 || unit.cohesion <= 22).length;
      if (this.surpriseState === 'triggered' && (!flankStillOrganized || flankRatio < 0.42 || shakenFlankFormations >= 2)) decision = confederateRatio > 0.64 ? 'decisive-win' : 'costly-win';
      else if (!confederates.length || confederateRatio < 0.3) decision = 'rout';
      else if (this.time >= this.config.maxTime) {
        if (this.choiceId === 'option_b') decision = confederateRatio >= 0.72 ? 'disciplined-withdrawal' : 'defeat';
        else if (this.surpriseState === 'triggered' && unionRatio < confederateRatio) decision = unionRatio < 0.62 ? 'costly-win' : 'disciplined-withdrawal';
        else decision = confederateRatio > 0.62 ? 'disciplined-withdrawal' : 'defeat';
      }
      if (decision) this.beginResolution(decision);
      return;
    }
    if (this.scenarioId === 'wilderness') {
      const longstreet = this.state.find((unit) => unit.id === this.config.longstreetFormationId);
      const longstreetArrived = Boolean(longstreet?.active);
      if (!union.length || unionRatio < 0.36) decision = confederateRatio > 0.63 ? 'decisive-win' : 'costly-win';
      else if (!confederates.length || confederateRatio < 0.3) decision = 'rout';
      else if (this.choiceId === 'option_d' && this.time > 48) {
        const exposedFront = this.state.filter((unit) => unit.side === 'confederate' && unit.active && unit.status !== 'broken' && unit.y < 600);
        if (!exposedFront.length) decision = confederateRatio > 0.65 ? 'disciplined-withdrawal' : 'defeat';
      }
      if (!decision && this.time >= this.config.maxTime) {
        if (this.choiceId === 'option_b' && longstreetArrived && !this.prematureCommitment) {
          decision = unionRatio < 0.7 && confederateRatio > 0.6 ? 'costly-win' : confederateRatio > 0.58 ? 'disciplined-withdrawal' : 'defeat';
        } else if (this.choiceId === 'option_d') {
          decision = confederateRatio > 0.62 ? 'disciplined-withdrawal' : 'defeat';
        } else {
          decision = unionRatio + 0.03 < confederateRatio ? (confederateRatio > 0.64 ? 'costly-win' : 'disciplined-withdrawal') : confederateRatio > 0.56 ? 'defeat' : 'rout';
        }
      }
      if (decision) this.beginResolution(decision);
      return;
    }
    if (this.scenarioId === 'cedar_creek') {
      const withdrawing = ['option_c', 'option_d'].includes(this.choiceId);
      const sheridan = this.state.find((unit) => unit.id === this.config.sheridanFormationId);
      const activeConfederates = this.state.filter((unit) => unit.side === 'confederate' && unit.active && unit.status !== 'broken');
      const withdrawalComplete = activeConfederates.every((unit) => unit.y >= 770 || unit.status === 'routing');
      const surpriseTargets = this.state.filter((unit) => unit.surpriseTarget);
      const shakenCamps = surpriseTargets.filter((unit) => ['broken', 'routing'].includes(unit.status) || unit.morale <= 32 || unit.cohesion <= 26).length;
      const pressingBelleGrove = activeConfederates.filter((unit) => unit.type === 'infantry' && unit.y <= 625).length >= 2;
      if (this.choiceId === 'option_a' && this.surpriseState === 'triggered' && !sheridan?.active && pressingBelleGrove && shakenCamps >= 2) {
        decision = confederateRatio > 0.66 ? 'decisive-win' : 'costly-win';
      } else if (!union.length || unionRatio < 0.3) decision = confederateRatio > 0.62 ? 'decisive-win' : 'costly-win';
      else if (!confederates.length || confederateRatio < 0.3) decision = 'rout';
      else if (withdrawing && this.time > 35 && withdrawalComplete) decision = confederateRatio > 0.64 ? 'disciplined-withdrawal' : 'defeat';
      else if (this.time >= this.config.maxTime) {
        if (withdrawing) decision = confederateRatio > 0.62 ? 'disciplined-withdrawal' : confederateRatio > 0.48 ? 'defeat' : 'rout';
        else if (this.surpriseState === 'triggered' && unionRatio < 0.58 && confederateRatio > 0.58) decision = confederateRatio > 0.69 ? 'decisive-win' : 'costly-win';
        else if (!sheridan?.active && unionRatio + 0.05 < confederateRatio) decision = 'costly-win';
        else decision = confederateRatio > 0.58 ? 'defeat' : 'rout';
      }
      if (decision) this.beginResolution(decision);
      return;
    }
    if (this.scenarioId === 'gettysburg') {
      const withdrawing = ['option_b', 'option_c', 'option_d'].includes(this.choiceId);
      const activeConfederates = this.state.filter((unit) => unit.side === 'confederate' && unit.active && unit.status !== 'broken');
      const withdrawalComplete = activeConfederates.every((unit) => unit.type === 'artillery' || unit.y >= 820 || unit.status === 'routing');
      const center = this.state.filter((unit) => this.config.unionCenterIds.includes(unit.id));
      const centerInitial = center.reduce((sum, unit) => sum + unit.initialStrength, 0);
      const centerRatio = center.reduce((sum, unit) => sum + unit.strength, 0) / Math.max(1, centerInitial);
      const shakenCenter = center.filter((unit) => ['broken', 'routing'].includes(unit.status) || unit.morale <= 28 || unit.cohesion <= 22).length;
      const coordinatedWave = this.config.chargeFormationIds
        .map((id) => this.state.find((unit) => unit.id === id))
        .every((unit) => unit?.active && !['broken', 'routing'].includes(unit.status) && unit.y <= 590);
      if (this.choiceId === 'option_a' && this.assaultState === 'engaged' && coordinatedWave && this.time <= this.assaultDeadline) {
        decision = shakenCenter >= 2 || centerRatio < 0.72 ? 'decisive-win' : 'costly-win';
      } else if (!union.length || centerRatio < 0.32 || shakenCenter >= 3) decision = confederateRatio > 0.58 ? 'decisive-win' : 'costly-win';
      else if (!confederates.length || confederateRatio < 0.27) decision = 'rout';
      else if (withdrawing && this.time > 30 && withdrawalComplete) decision = confederateRatio > 0.65 ? 'disciplined-withdrawal' : 'defeat';
      else if (this.time >= this.config.maxTime) {
        if (withdrawing) decision = confederateRatio > 0.6 ? 'disciplined-withdrawal' : confederateRatio > 0.46 ? 'defeat' : 'rout';
        else if (this.assaultState === 'engaged' && centerRatio < 0.58 && confederateRatio > 0.52) decision = 'costly-win';
        else decision = confederateRatio > 0.48 ? 'defeat' : 'rout';
      }
      if (decision) this.beginResolution(decision);
      return;
    }
    if (this.scenarioId === 'gettysburg_jackson') {
      const hancock = this.state.find((unit) => unit.id === this.config.hancockFormationId);
      const center = this.state.filter((unit) => this.config.unionCenterIds.includes(unit.id));
      const centerInitial = center.reduce((sum, unit) => sum + unit.initialStrength, 0);
      const centerRatio = center.reduce((sum, unit) => sum + unit.strength, 0) / Math.max(1, centerInitial);
      const shakenCenter = center.filter((unit) => ['broken', 'routing'].includes(unit.status) || unit.morale <= 30 || unit.cohesion <= 24).length;
      const attackersOnHeights = this.state.filter((unit) => this.config.surpriseFormationIds.includes(unit.id) && unit.active && unit.status !== 'broken' && unit.y <= 475).length;
      if (this.choiceId === 'option_a' && this.surpriseState === 'triggered' && !hancock?.active && attackersOnHeights >= 2 && shakenCenter >= 2) {
        decision = confederateRatio > 0.64 ? 'decisive-win' : 'costly-win';
      } else if (!union.length || centerRatio < 0.3 || shakenCenter >= 3) decision = confederateRatio > 0.6 ? 'decisive-win' : 'costly-win';
      else if (!confederates.length || confederateRatio < 0.28) decision = 'rout';
      else if (this.time >= this.config.maxTime) {
        if (this.surpriseState === 'triggered' && centerRatio < 0.6 && confederateRatio > 0.56) decision = this.choiceId === 'option_a' ? 'costly-win' : 'decisive-win';
        else if (unionRatio + 0.04 < confederateRatio) decision = 'costly-win';
        else decision = confederateRatio > 0.55 ? 'disciplined-withdrawal' : confederateRatio > 0.42 ? 'defeat' : 'rout';
      }
      if (decision) this.beginResolution(decision);
      return;
    }
    if (this.scenarioId === 'chickamauga') {
      const thomas = this.state.find((unit) => unit.id === this.config.thomasFormationId);
      const longstreetThrough = this.state.filter((unit) => this.config.longstreetFormationIds.includes(unit.id) && unit.active && !['broken', 'routing'].includes(unit.status) && unit.y <= 640).length;
      if (this.choiceId === 'option_b' && this.gapState === 'breached' && this.chickamaugaExploitationState === 'exploited' && !thomas?.active) {
        decision = confederateRatio > 0.64 ? 'decisive-win' : 'costly-win';
      } else if (this.gapState === 'breached' && longstreetThrough >= 2 && (thomas?.active || this.time >= 58)) {
        decision = this.choiceId === 'option_b' && confederateRatio > 0.58 ? 'costly-win' : confederateRatio > 0.62 ? 'costly-win' : 'disciplined-withdrawal';
      } else if (!union.length || unionRatio < 0.31) decision = confederateRatio > 0.6 ? 'decisive-win' : 'costly-win';
      else if (!confederates.length || confederateRatio < 0.29) decision = 'rout';
      else if (this.time >= this.config.maxTime) {
        if (this.gapState === 'breached' && unionRatio + 0.03 < confederateRatio) decision = 'costly-win';
        else if (this.choiceId === 'option_d' && confederateRatio > 0.58) decision = 'disciplined-withdrawal';
        else decision = confederateRatio > 0.55 ? 'defeat' : 'rout';
      }
      if (decision) this.beginResolution(decision);
      return;
    }
    if (this.scenarioId === 'cold_harbor') {
      const transferComplete = this.transferState === 'transferred'
        && this.state.filter((unit) => this.config.transferFormationIds.includes(unit.id)).every((unit) => this.coldHarborOrganized(unit));
      const fieldArmy = confederates.filter((unit) => unit.active);
      const holdingWorks = this.coldHarborWorksOccupied();
      const organizedRatio = this.state.filter((unit) => unit.side === 'confederate' && this.coldHarborOrganized(unit))
        .reduce((sum, unit) => sum + unit.strength, 0) / this.initialConfederate;
      if (this.choiceId === 'option_d' && transferComplete && (!this.fieldBattle || holdingWorks) && this.time >= this.coldHarborAssaultStartTime + 20) {
        decision = organizedRatio > 0.68 ? 'disciplined-withdrawal' : confederateRatio > 0.52 ? 'defeat' : 'rout';
      } else if (!fieldArmy.length) {
        this.entrenchmentState = 'abandoned';
        // A valid operational transfer keeps its existing time requirement.
        // Other postures have conceded the field, regardless of preserved strength.
        if (!this.fieldBattle && this.choiceId === 'option_d' && transferComplete && organizedRatio > 0.68) return;
        decision = organizedRatio > 0.52 ? 'defeat' : 'rout';
      } else if (this.choiceId === 'option_a') {
        if (!union.length || unionRatio < 0.48) decision = confederateRatio > 0.68 ? 'decisive-win' : 'costly-win';
        else if (!confederates.length || confederateRatio < 0.34) decision = 'rout';
        else if (this.time >= this.config.maxTime) decision = unionRatio + 0.08 < confederateRatio ? 'costly-win' : confederateRatio > 0.5 ? 'defeat' : 'rout';
      } else {
        if (this.coldHarborAssaultState === 'repulsed' && holdingWorks) {
          decision = this.choiceId === 'option_b' && confederateRatio > 0.82 && this.coldHarborCrossfireTriggered ? 'decisive-win' : confederateRatio > 0.62 ? 'costly-win' : 'defeat';
        } else if (!confederates.length || confederateRatio < 0.34) decision = 'rout';
        else if (this.time >= this.config.maxTime) decision = holdingWorks && unionRatio + 0.03 < confederateRatio && confederateRatio > 0.62 ? 'costly-win' : confederateRatio > 0.5 ? 'defeat' : 'rout';
      }
      if (decision) this.beginResolution(decision);
      return;
    }
    if (this.scenarioId === 'petersburg') {
      if (this.craterPosture === 'night-sortie') {
        if (this.sortieState === 'withdrawn') decision = confederateRatio > 0.7 ? 'costly-win' : 'defeat';
        else if (!confederates.length || confederateRatio < 0.34) decision = 'rout';
        else if (['missed', 'trapped'].includes(this.sortieState)) decision = confederateRatio > 0.48 ? 'defeat' : 'rout';
        else if (this.time >= this.config.maxTime) decision = this.sortieTargetsHit.length >= 2 && confederateRatio > 0.62 ? 'costly-win' : confederateRatio > 0.48 ? 'defeat' : 'rout';
      } else if (this.craterState === 'sealed') {
        if (this.choiceId === 'option_a') decision = confederateRatio > 0.72 ? 'decisive-win' : confederateRatio > 0.54 ? 'costly-win' : 'defeat';
        else if (this.choiceId === 'option_d') decision = this.mineState === 'detonated' && confederateRatio > 0.7 ? 'decisive-win' : confederateRatio > 0.54 ? 'costly-win' : 'defeat';
        else decision = confederateRatio > 0.58 ? 'costly-win' : 'defeat';
      } else if (this.craterState === 'contained') decision = confederateRatio > 0.58 ? 'costly-win' : 'defeat';
      else if (this.craterState === 'overrun') decision = confederateRatio > 0.42 ? 'defeat' : 'rout';
      else if (!confederates.length || confederateRatio < 0.3) decision = 'rout';
      else if (!union.length || unionRatio < 0.3) decision = confederateRatio > 0.64 ? 'decisive-win' : 'costly-win';
      else if (this.time >= this.config.maxTime) decision = confederateRatio > 0.58 && unionRatio < confederateRatio ? 'costly-win' : confederateRatio > 0.45 ? 'defeat' : 'rout';
      if (decision) this.beginResolution(decision);
      return;
    }
    if (!union.length || unionRatio < 0.32) decision = confederateRatio > 0.67 ? 'decisive-win' : 'costly-win';
    else if (!confederates.length || confederateRatio < 0.3) decision = 'rout';
    else if (this.choiceId === 'option_c' && this.time > 28 && this.state.filter((unit) => unit.side === 'confederate').every((unit) => unit.y > 760 || unit.status === 'broken')) decision = confederateRatio > 0.68 ? 'disciplined-withdrawal' : 'defeat';
    else if (this.time >= this.config.maxTime) decision = unionRatio < confederateRatio ? (confederateRatio > 0.68 ? 'decisive-win' : 'costly-win') : confederateRatio > 0.58 ? 'disciplined-withdrawal' : 'defeat';
    if (decision) this.beginResolution(decision);
  }

  updateCommanderStatus(confederateRatio) {
    if (this.scenarioId !== 'shiloh' || this.commanderStatus !== 'exposed' || confederateRatio > 0.82) return;
    this.commanderStatus = 'mortally wounded';
    this.events.push({ time: this.time, type: 'command', message: 'Johnston has fallen while directing the front line; command passes to Beauregard.' });
    for (const unit of this.state.filter((formation) => formation.side === 'confederate' && formation.active)) {
      unit.morale = clamp(unit.morale - 8);
      unit.cohesion = clamp(unit.cohesion - 5);
    }
  }

  beginResolution(decision) {
    if (this.fieldBattle) { decision = fieldResolution(this, decision); if (!decision) return; }
    if (this.gettysburg || this.fieldBattle) return finishGettysburg(this, decision);
    this.#explicitDestinations.clear();
    this.pendingOutcome = decision;
    this.resolutionTime = 0;
    const confederateWin = ['decisive-win', 'costly-win'].includes(decision);
    const losingSide = confederateWin ? 'union' : 'confederate';
    const orderedWinchesterRetreat = this.scenarioId === 'third_winchester' && decision === 'disciplined-withdrawal';
    for (const [index, unit] of this.state.entries()) {
      if (unit.side === 'confederate' && decision === 'disciplined-withdrawal' && (unit.active || unit.withdrawn)) {
        const organized = unit.withdrawn ? unit.withdrawalOrganized : organizedFormation(unit);
        this.#departurePresentation.set(unit.id, organized ? unit.withdrawn ? 'withdrawn in order' : 'withdrawing in order' : unit.status === 'broken' ? 'broken' : 'routing');
        if (unit.active || unit.withdrawn) this.recordCombatEvent('departure', unit, null, { organized: Boolean(organized) });
      }
      unit.engagedWith = null;
      unit.target = { x: unit.x, y: unit.y };
      if (['third_winchester', 'cold_harbor'].includes(this.scenarioId) && unit.withdrawn) {
        unit.order = 'hold';
        continue;
      }
      if (unit.side !== losingSide || unit.strength <= 0) {
        unit.order = 'hold';
        unit.status = unit.strength > 0 ? 'steady' : 'broken';
        continue;
      }
      unit.status = orderedWinchesterRetreat && !['routing', 'broken'].includes(unit.status) ? 'steady' : 'routing';
      unit.order = 'withdraw';
      unit.target = this.retreatTarget(unit, 100, ((index % 3) - 1) * 62);
      unit.facing = Math.atan2(unit.target.y - unit.y, unit.target.x - unit.x);
    }
  }

  advanceResolution(dt) {
    this.resolutionTime += dt;
    for (const unit of this.state) {
      if (['third_winchester', 'cold_harbor'].includes(this.scenarioId) && !unit.active) continue;
      const orderedWinchesterRetreat = this.scenarioId === 'third_winchester' && this.pendingOutcome === 'disciplined-withdrawal' && unit.status === 'steady' && unit.order === 'withdraw';
      if ((unit.status === 'routing' || orderedWinchesterRetreat) && unit.strength > 0) this.moveUnit(unit, dt * 2.8);
    }
    if (this.resolutionTime < this.resolutionDuration) return;
    this.outcome = this.pendingOutcome;
    this.pendingOutcome = null;
  }

  snapshot({ presentation = false } = {}) {
    const confederateStrength = this.sideStrength('confederate');
    const unionStrength = this.sideStrength('union');
    const confederateLossRate = 1 - confederateStrength / this.initialConfederate;
    const unionLossRate = 1 - unionStrength / this.initialUnion;
    const ammunitionRate = this.state
      .filter((unit) => unit.side === 'confederate')
      .reduce((sum, unit) => sum + unit.ammunition / Math.max(1, unit.initialAmmunition), 0)
      / Math.max(1, this.state.filter((unit) => unit.side === 'confederate').length);
    const wildernessObjective = this.scenarioId === 'wilderness'
      ? this.choiceId === 'option_b' && !this.prematureCommitment && this.state.find((unit) => unit.id === this.config.longstreetFormationId)?.active
        ? 8
        : this.prematureCommitment ? -6 : 0
      : 0;
    const cedarCreekObjective = this.scenarioId === 'cedar_creek'
      ? ['option_c', 'option_d'].includes(this.choiceId)
        ? confederateLossRate < 0.28 ? 7 : -3
        : this.surpriseState === 'triggered' ? this.cedarDisciplineBroken ? 1 : 8 : -6
      : 0;
    const gettysburgObjective = this.scenarioId === 'gettysburg'
      ? ['option_b', 'option_c', 'option_d'].includes(this.choiceId)
        ? confederateLossRate < 0.25 ? 7 : -4
        : this.assaultState === 'engaged' ? 5 : -7
      : this.scenarioId === 'gettysburg_jackson'
        ? this.surpriseState === 'triggered' ? this.gettysburgRecoveryTriggered ? 3 : 9 : -6
        : 0;
    const chickamaugaObjective = this.scenarioId === 'chickamauga'
      ? this.chickamaugaExploitationState === 'exploited' ? 10 : this.gapState === 'breached' ? 6 : this.gapState === 'closed' ? -6 : 0
      : 0;
    const coldHarborObjective = this.scenarioId === 'cold_harbor'
      ? this.choiceId === 'option_d'
        ? this.transferState === 'transferred' ? 9 : this.transferState === 'missed' ? -7 : 0
        : this.coldHarborAssaultState === 'repulsed' && this.entrenchmentState === 'prepared' ? 10 : this.entrenchmentState === 'abandoned' ? -7 : 0
      : 0;
    const petersburgObjective = this.scenarioId === 'petersburg'
      ? this.craterPosture === 'night-sortie'
        ? this.sortieState === 'withdrawn' ? 10 : this.sortieState === 'raided' ? 5 : ['missed', 'trapped'].includes(this.sortieState) ? -8 : 0
        : this.craterState === 'sealed' ? 10 : this.craterState === 'contained' ? 7 : this.craterState === 'overrun' ? -9 : 0
      : 0;
    const winchesterObjective = this.scenarioId === 'third_winchester'
      ? (this.thirdWinchester.middleFieldHeld / this.config.middleFieldHoldRequired) * 4
        + (this.thirdWinchester.rearguardHeld / this.config.rearguardHoldRequired) * 4
        + (this.thirdWinchester.withdrawalState === 'secured' ? 12 : 0)
      : 0;
    const score = clamp(Math.round((1 - confederateLossRate) * 52 + unionLossRate * 36 + ammunitionRate * 12 + wildernessObjective + cedarCreekObjective + gettysburgObjective + chickamaugaObjective + coldHarborObjective + petersburgObjective + winchesterObjective));
    const snapshot = {
      ...(this.gettysburg ? { gettysburg: structuredClone(this.gettysburg) } : {}),
      ...(this.fieldBattle ? { fieldBattle: { ...structuredClone(this.fieldBattle), ...(chickamaugaPreservation(this) ? { preservationObjective: chickamaugaPreservation(this) } : {}), ...(henryHillObjective(this) ? { defenseObjective: henryHillObjective(this) } : {}) } } : {}),
      scenarioId: this.scenarioId,
      time: this.time,
      formations: this.state.map((unit) => ({
        ...(this.gettysburg || this.fieldBattle ? structuredClone(unit) : unit), target: { ...unit.target },
        firingRange: this.fieldBattle ? gettysburgRange(unit) : rangeLimit(unit),
        ...(this.fieldBattle ? { terrainName: this.fieldTerrain(unit).name } : {}),
        ...(this.gettysburg || this.fieldBattle ? { fireStatus: gettysburgFireStatus(this, unit), readiness: gettysburgReadiness(this, unit), footprint: gettysburgFootprint(unit) } : {}),
        defenseMultiplier: this.terrainDefense(unit),
        movementMultiplier: this.terrainMovementMultiplier(unit),
        ...(presentation && this.#departurePresentation.has(unit.id) ? { presentationStatus: this.#departurePresentation.get(unit.id) } : {}),
        ...(this.battleRulesVersion >= 2 ? { tactics: {
          arcDegrees: fireArcDegrees(unit), frontLocked: unit.facingOrder !== null, turning: unit.turning,
          desiredFacing: unit.facingOrder ?? (() => {
            const target = this.state.find(candidate => candidate.id === (unit.focusTargetId || unit.aimTargetId));
            return target ? bearingTo(unit, target) : unit.facing;
          })(),
          targetId: unit.focusTargetId || unit.aimTargetId || unit.engagedWith || null,
        } } : {}),
      })),
      outcome: this.outcome,
      resolving: Boolean(this.pendingOutcome),
      decision: this.pendingOutcome,
      confederateLossRate,
      unionLossRate,
      ammunitionRate,
      score,
      commanderStatus: this.commanderStatus,
      reinforcementEta: this.reinforcementEta(),
      surpriseState: this.surpriseState,
      assaultState: this.assaultState,
      gapState: this.gapState,
      exploitationState: this.chickamaugaExploitationState,
      entrenchmentState: this.entrenchmentState,
      coldHarborAssaultState: this.coldHarborAssaultState,
      transferState: this.transferState,
      craterState: this.craterState,
      mineState: this.mineState,
      sortieState: this.sortieState,
      sortieTargetsHit: [...this.sortieTargetsHit],
      ...(this.scenarioId === 'third_winchester' ? { thirdWinchester: { ...this.thirdWinchester } } : {}),
      disciplineBroken: this.cedarDisciplineBroken,
      fieldStatus: this.fieldStatus(),
      events: [...this.events],
      ...(presentation ? { combatEvents: this.#combatEvents.map((event) => ({ ...event, position: { ...event.position }, ...(event.targetPosition ? { targetPosition: { ...event.targetPosition } } : {}) })) } : {}),
      ...(this.battleRulesVersion >= 2 ? { battleRulesVersion: this.battleRulesVersion } : {}),
    };
    return this.rulesVersion === 2 ? {
      ...snapshot,
      assessment: getBattleAssessment({ ...snapshot, prematureCommitment: this.prematureCommitment }, this.choiceId),
    } : snapshot;
  }

  reinforcementEta() {
    if (this.scenarioId === 'third_winchester') {
      const arrivals = this.state.filter((unit) => this.config.crookFormationIds.includes(unit.id) && !unit.active && unit.arrivalTime != null).map((unit) => unit.arrivalTime);
      return arrivals.length ? Math.max(0, Math.min(...arrivals) - this.time) : 0;
    }
    if (this.scenarioId === 'wilderness') {
      const longstreet = this.state.find((unit) => unit.id === this.config.longstreetFormationId);
      return longstreet?.active || longstreet?.arrivalTime == null ? 0 : Math.max(0, longstreet.arrivalTime - this.time);
    }
    if (this.scenarioId === 'cedar_creek') {
      const sheridan = this.state.find((unit) => unit.id === this.config.sheridanFormationId);
      return sheridan?.active || sheridan?.arrivalTime == null ? 0 : Math.max(0, sheridan.arrivalTime - this.time);
    }
    if (this.scenarioId === 'gettysburg_jackson') {
      const hancock = this.state.find((unit) => unit.id === this.config.hancockFormationId);
      return hancock?.active || hancock?.arrivalTime == null ? 0 : Math.max(0, hancock.arrivalTime - this.time);
    }
    if (this.scenarioId === 'chickamauga') {
      const thomas = this.state.find((unit) => unit.id === this.config.thomasFormationId);
      return thomas?.active || thomas?.arrivalTime == null ? 0 : Math.max(0, thomas.arrivalTime - this.time);
    }
    if (this.scenarioId === 'petersburg') {
      const mahone = this.state.find((unit) => this.config.mahoneFormationIds.includes(unit.id) && !unit.active && unit.arrivalTime != null);
      return mahone ? Math.max(0, mahone.arrivalTime - this.time) : 0;
    }
    return this.config.reinforcementTime == null ? null : Math.max(0, this.config.reinforcementTime - this.time);
  }

  fieldStatus() {
    if (this.gettysburg) return this.choiceId === 'option_a'
      ? { label: `Ridge control: ${this.gettysburg.held.toFixed(1)} / ${this.gettysburg.holdRequired}`, message: this.gettysburg.reserveIntent }
      : { label: `Force withdrawn: ${Math.round(this.gettysburg.escaped * 100)}% / 70%`, message: 'Only survivors withdrawn in order count toward preserving the army.' };
    const latest = this.events.at(-1)?.message || '';
    if (this.scenarioId === 'third_winchester') {
      const progress = this.thirdWinchester;
      const escaped = Math.round(progress.escapedRatio * 100);
      if (progress.withdrawalState === 'secured') return { label: `Army preserved: ${escaped}% clear`, message: latest };
      if (progress.cavalryPressureState === 'pressing') return { label: `Northern cavalry pressure: ${escaped}% clear`, message: latest };
      if (progress.flankState !== 'pending') return { label: `Crook on the northern flank: ${escaped}% clear`, message: latest };
      return { label: `Middle Field ${Math.floor(progress.middleFieldHeld)}/${this.config.middleFieldHoldRequired}; rearguard ${Math.floor(progress.rearguardHeld)}/${this.config.rearguardHoldRequired}; Crook in ${Math.ceil(this.reinforcementEta())}`, message: latest };
    }
    if (chickamaugaPreservation(this)) {
      const p = chickamaugaPreservation(this);
      return { label: `Organized army ${Math.round(p.retained * 100)}% / 65%`, message: 'Hold through minute 126 or complete an organized exit. Coordination and rail operations are campaign consequences.' };
    }
    if (this.fieldBattle?.reserveObjective) {
      const r = this.fieldBattle.reserveObjective;
      return { label: `Command reserve ${r.held.toFixed(1)}/${r.required} · Hold to ${r.deadline}`, message: this.time < r.responseTime ? `A limited Union advance is expected at minute ${r.responseTime}. Keep the front connected and Breckinridge in support.` : latest };
    }
    if (this.scenarioId === 'shiloh') {
      const eta = Math.max(0, (this.config.reinforcementTime || 0) - this.time);
      return { label: eta > 0 ? `Buell in ${Math.ceil(eta)}` : 'Buell has arrived', message: latest };
    }
    if (this.scenarioId === 'wilderness') {
      const texans = this.state.find((unit) => unit.id === this.config.texasFormationId);
      const longstreet = this.state.find((unit) => unit.id === this.config.longstreetFormationId);
      if (this.prematureCommitment && !longstreet?.active) return { label: 'Line committed early', message: latest };
      if (!texans?.active) return { label: `Texans in ${Math.max(0, Math.ceil((texans?.arrivalTime || 0) - this.time))}`, message: latest };
      if (!longstreet?.active) return { label: `Longstreet in ${Math.max(0, Math.ceil((longstreet?.arrivalTime || 0) - this.time))}`, message: latest };
      return { label: this.choiceId === 'option_d' ? 'Withdrawal covered' : 'First Corps on field', message: latest };
    }
    if (this.scenarioId === 'cedar_creek') {
      const sheridan = this.state.find((unit) => unit.id === this.config.sheridanFormationId);
      if (['option_c', 'option_d'].includes(this.choiceId) && !sheridan?.active) return { label: `Withdrawal window ${Math.max(0, Math.ceil((sheridan?.arrivalTime || 0) - this.time))}`, message: latest };
      if (this.surpriseState === 'pending') return { label: `Dawn surprise ${Math.max(0, Math.ceil(this.surpriseDeadline - this.time))}`, message: latest };
      if (!sheridan?.active) return { label: `Sheridan in ${Math.max(0, Math.ceil((sheridan?.arrivalTime || 0) - this.time))}`, message: latest };
      return { label: 'Union counterattack', message: this.events.findLast((event) => event.type === 'command')?.message || latest };
    }
    if (this.scenarioId === 'gettysburg') {
      if (this.choiceId !== 'option_a') return { label: 'Disengage from Seminary Ridge', message: latest };
      if (!this.gettysburgCannonadeComplete) return { label: `Cannonade ${Math.max(0, Math.ceil(16 - this.time))}`, message: latest };
      if (this.assaultState === 'pending') return { label: `Assault window ${Math.max(0, Math.ceil(this.assaultDeadline - this.time))}`, message: latest };
      if (this.assaultState === 'engaged') return { label: 'Center engaged', message: this.events.findLast((event) => event.type === 'assault')?.message || latest };
      return { label: 'Assault window lost', message: latest };
    }
    if (this.scenarioId === 'gettysburg_jackson') {
      const hancock = this.state.find((unit) => unit.id === this.config.hancockFormationId);
      if (this.surpriseState === 'pending') return { label: `Heights window ${Math.max(0, Math.ceil(this.surpriseDeadline - this.time))}`, message: latest };
      if (!hancock?.active) return { label: `Hancock in ${Math.max(0, Math.ceil((hancock?.arrivalTime || 0) - this.time))}`, message: latest };
      return { label: 'Union fishhook restored', message: this.events.findLast((event) => event.type === 'command')?.message || latest };
    }
    if (this.scenarioId === 'chickamauga') {
      const thomas = this.state.find((unit) => unit.id === this.config.thomasFormationId);
      if (this.gapState === 'pending') return { label: `Gap develops in ${Math.max(0, Math.ceil(this.gapOpenTime - this.time))}`, message: latest };
      if (this.gapState === 'open') return { label: `Brotherton gap ${Math.max(0, Math.ceil(this.gapDeadline - this.time))}`, message: latest };
      if (this.gapState === 'breached' && this.chickamaugaExploitationState !== 'exploited' && !thomas?.active) return { label: `Thomas in ${Math.max(0, Math.ceil((thomas?.arrivalTime || 0) - this.time))}`, message: latest };
      if (this.chickamaugaExploitationState === 'exploited') return { label: 'Union right in flight', message: this.events.findLast((event) => event.type === 'exploitation')?.message || latest };
      if (thomas?.active) return { label: 'Horseshoe Ridge formed', message: this.events.findLast((event) => event.type === 'command')?.message || latest };
      return { label: this.gapState === 'closed' ? 'Gap closed' : 'Fight in the woods', message: latest };
    }
    if (this.scenarioId === 'cold_harbor') {
      if (this.choiceId === 'option_d' && this.transferState === 'pending') return { label: `Petersburg window ${Math.max(0, Math.ceil(this.transferDeadline - this.time))}`, message: latest };
      if (this.transferState === 'transferred') return { label: 'Petersburg column clear', message: this.events.findLast((event) => event.type === 'movement')?.message || latest };
      if (this.coldHarborAssaultState === 'pending') return { label: `Federal assault in ${Math.max(0, Math.ceil(this.coldHarborAssaultStartTime - this.time))}`, message: latest };
      if (this.coldHarborAssaultState === 'engaged') return { label: this.coldHarborCrossfireTriggered ? 'Assault in the crossfire' : 'Federal assault advancing', message: latest };
      if (this.coldHarborAssaultState === 'repulsed') return { label: 'Federal assault repulsed', message: this.events.findLast((event) => event.type === 'repulse')?.message || latest };
      return { label: 'Cold Harbor line', message: latest };
    }
    if (this.scenarioId === 'petersburg') {
      if (this.craterPosture === 'night-sortie') {
        if (this.sortieState === 'approaching') return { label: `Raid window ${Math.max(0, Math.ceil(this.sortieDeadline - this.time))}`, message: latest };
        if (this.sortieState === 'raided') return { label: 'Withdraw the sortie', message: this.events.findLast((event) => event.type === 'objective')?.message || latest };
        if (this.sortieState === 'withdrawn') return { label: 'Sortie returned', message: this.events.findLast((event) => event.type === 'withdrawal')?.message || latest };
        return { label: this.sortieState === 'trapped' ? 'Sortie trapped' : 'Raid window lost', message: latest };
      }
      const mahone = this.state.find((unit) => this.config.mahoneFormationIds.includes(unit.id) && !unit.active && unit.arrivalTime != null);
      if (this.craterState === 'breached') return { label: `Federal assault in ${Math.max(0, Math.ceil(this.craterAssaultStartTime - this.time))}`, message: latest };
      if (this.craterState === 'contested' && this.mineState === 'armed') return { label: `Mine lanes ${Math.max(0, Math.ceil(this.craterDeadline - this.time))}`, message: latest };
      if (this.craterState === 'contested' && mahone) return { label: `Mahone in ${Math.max(0, Math.ceil(mahone.arrivalTime - this.time))}`, message: latest };
      if (this.craterState === 'contested') return { label: `Seal breach ${Math.max(0, Math.ceil(this.craterDeadline - this.time))}`, message: latest };
      if (this.craterState === 'sealed') return { label: 'Crater breach sealed', message: this.events.findLast((event) => ['counterattack', 'containment'].includes(event.type))?.message || latest };
      if (this.craterState === 'contained') return { label: 'Lodgment contained', message: this.events.findLast((event) => event.type === 'containment')?.message || latest };
      return { label: 'Petersburg heights exposed', message: latest };
    }
    if (this.scenarioId !== 'chancellorsville') return null;
    if (this.surpriseState === 'pending') {
      const nextArrival = this.state
        .filter((unit) => !unit.active && unit.arrivalTime != null)
        .map((unit) => unit.arrivalTime)
        .sort((a, b) => a - b)[0];
      if (nextArrival != null && nextArrival > this.time) return { label: `Flank column in ${Math.ceil(nextArrival - this.time)}`, message: latest };
      return { label: `Surprise window ${Math.max(0, Math.ceil(this.surpriseDeadline - this.time))}`, message: latest };
    }
    if (this.surpriseState === 'triggered') return { label: 'XI Corps surprised', message: this.events.findLast((event) => event.type === 'surprise')?.message || latest };
    if (this.surpriseState === 'expired') return { label: 'Union right alerted', message: this.events.findLast((event) => event.type === 'warning')?.message || latest };
    return { label: this.choiceId === 'option_b' ? 'Compact line engaged' : 'Direct attack committed', message: latest };
  }
}
