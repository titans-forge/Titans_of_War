import { chickamaugaPreservation, CHICKAMAUGA_PRESERVATION_BRIEF } from './chickamaugaPreservation.js';
import { usesShilohReserveMission, updateShilohReserve, shilohReserveState, SHILOH_RESERVE_BRIEF } from './shilohReserveObjective.js';
import { landmarkField, landmarksFor, formationLandmarkBlocker } from './historicalLandmarks.js';
import { henryHillObjective } from './henryHillObjective.js';
import { objectiveControl, recordObjectiveProgress } from './objectiveControl.js';
import { coordinateEnemy } from './enemyCoordination.js';
import { initializeTacticalFormations, stepTacticalFormations, GETTYSBURG_RULES, gettysburgOrganized, gettysburgClearance, safeToRallyGettysburg } from './gettysburgMechanics.js';
import { FIELD_BATTLE_PROFILES, insideFieldSector, fieldExitTargets } from './fieldBattleProfiles.js';
import { BATTLE_OBJECTIVES } from './battleAssessment.js';
import { ANTIETAM_MISSIONS, updateAntietamMission } from './antietamMission.js';
import { FIVE_FORKS_MISSIONS, directFiveForksAssaults, updateFiveForksMission } from './fiveForksMission.js';
import { JONESBOROUGH_MISSIONS, directJonesboroughAssaults, updateJonesboroughMission } from './jonesboroughMission.js';
import { SECOND_MANASSAS_MISSIONS, directSecondManassasAssaults, updateSecondManassasMission } from './secondManassasMission.js';
import { FREDERICKSBURG_MISSIONS, directFredericksburgAssaults, updateFredericksburgMission } from './fredericksburgMission.js';
import { GAINES_MILL_MISSIONS, directGainesMillPressure, updateGainesMillMission } from './gainesMillMission.js';
import { NEW_MARKET_MISSIONS, directNewMarketPressure, updateNewMarketMission } from './newMarketMission.js';
import { MISSIONARY_RIDGE_MISSIONS, directMissionaryRidgePressure, updateMissionaryRidgeMission } from './missionaryRidgeMission.js';
import { SPOTSYLVANIA_MISSIONS, directSpotsylvaniaPressure, updateSpotsylvaniaMission } from './spotsylvaniaMission.js';
import { KENNESAW_MISSIONS, directKennesawPressure, updateKennesawMission } from './kennesawMission.js';
import { VICKSBURG_MISSIONS, directVicksburgPressure, updateVicksburgMission } from './vicksburgMission.js';
import { SAILORS_CREEK_MISSIONS, directSailorsCreekPressure, updateSailorsCreekMission } from './sailorsCreekMission.js';
export { fieldTerrain, fieldLineOfFire, fieldExitTargets } from './fieldBattleProfiles.js';
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function initializeFieldBattle(e) {
  const p = FIELD_BATTLE_PROFILES[e.scenarioId];
  if (!p) throw new Error(`Missing field battle profile: ${e.scenarioId}`);
  e.fieldBattle = { version: e.battleRulesVersion, ...(e.battleRulesVersion >= 8 ? { landmarks: landmarksFor(e.scenarioId, e.battleRulesVersion) } : {}), theme: p.theme, subtitle: p.subtitle, sectors: p.sectors.map(s => ({ ...s, control: 'vacant' })), zones: p.zones.map(z => ({ ...z })), advice: [...p.advice],
    defendedUnderFire: false, accumulator: 0, nextAi: 0, abandonedGuns: 0, escaped: 0, reserveIntent: 'Watch the field and reinforcement notices',
    commandPost: { x: e.world.width / 2, y: e.scenarioId === 'shiloh' ? 135 : e.world.height - 135 },
    requireExitIds: e.scenarioId === 'third_winchester' ? e.state.filter(u => u.side === 'confederate').map(u => u.id) : e.scenarioId === 'cold_harbor' ? [...e.config.transferFormationIds] : e.scenarioId === 'petersburg' && e.choiceId === 'option_c' ? [...e.config.sortieFormationIds] : [],
  };
  if (e.battleRulesVersion >= 5 && ['option_a', 'option_c', 'option_d'].includes(e.choiceId)) {
    const attack = e.scenarioId === 'shiloh' && ['option_a', 'option_c'].includes(e.choiceId) || e.scenarioId === 'first_manassas' && ['option_a', 'option_d'].includes(e.choiceId);
    if (attack) {
      e.fieldBattle.advice = e.fieldBattle.advice.filter(text => !text.startsWith('At field minute 105'));
      const shiloh = e.scenarioId === 'shiloh';
      e.fieldBattle.attackObjective = { id: shiloh ? 'right' : 'left', name: shiloh ? 'Pittsburg Landing' : 'Union battery line', x: shiloh ? 1235 : 820, y: shiloh ? 745 : 390, width: shiloh ? 430 : 380, height: shiloh ? 230 : 190, held: 0, required: 8, state: 'Approach with supporting infantry', eligible: 0, defenders: 0 };
      const objective = e.fieldBattle.attackObjective;
      Object.assign(e.fieldBattle.sectors.find(s => s.id === objective.id), { name: objective.name, x: objective.x, y: objective.y, width: objective.width, height: objective.height });
      e.fieldBattle.advice.unshift(`Attack objective: take ${objective.name} with at least two infantry formations supporting each other within 340 field units. Keep the marked area clear of organized enemy formations for eight uninterrupted field minutes. Retreating, rallying and moving troops cannot capture it.`);
    }
  }
  if (e.battleRulesVersion >= 11 && e.scenarioId === 'wilderness') {
    // The same clearing drives cover, movement, canopy exclusion and the rules overlay.
    // Earlier saves retain the continuous thicket zone and original outcomes.
    e.fieldBattle.zones.push({ name: 'Tapp farm clearing', kind: 'clearing', left: 130, top: 410, right: 425, bottom: 599, defense: 1, movement: 1 });
    e.fieldBattle.advice.push('Tapp’s farm clearing opens the left of the screen beside the Orange Plank Road. It offers faster movement but no woodland cover; short visibility limits still apply.');
  }
  if (e.battleRulesVersion >= 5 && e.scenarioId === 'first_manassas' && e.fieldBattle.attackObjective) e.fieldBattle.advice.unshift("Elzey arrives at the left rear at field minute 48. Keep a line together until the fresh brigade can support the counterattack; the attack interval ends at minute 140.");
  if (e.battleRulesVersion >= 5) e.fieldBattle.missionDeadline = e.config.maxTime;
  if (usesShilohReserveMission(e)) { e.fieldBattle.advice = [...SHILOH_RESERVE_BRIEF]; e.fieldBattle.subtitle = 'Command reserve · Keep the army connected'; }
  if (chickamaugaPreservation(e)) { e.fieldBattle.advice = [...CHICKAMAUGA_PRESERVATION_BRIEF]; e.fieldBattle.subtitle = 'Army preservation · Hold or withdraw in order';
    if (e.choiceId === 'option_c') for (const u of e.state.filter(u => u.side === 'confederate' && !u.active && u.arrivalTime != null)) u.arrivalMessage = `${u.name} has arrived after the coordination delay. Keep the division organized or withdraw it in order.`;
  }
  initializeTacticalFormations(e);
  updateFieldSectors(e);
  if (e.scenarioId === 'antietam') {
    const mission = ANTIETAM_MISSIONS[e.choiceId] || ANTIETAM_MISSIONS.option_a;
    e.fieldBattle.advice = [...mission.orders, ...e.fieldBattle.advice];
    updateAntietamMission(e);
  }
  if (e.scenarioId === 'five_forks' && FIVE_FORKS_MISSIONS[e.choiceId]) {
    const mission = FIVE_FORKS_MISSIONS[e.choiceId];
    e.fieldBattle.missionDeadline = mission.deadline;
    e.fieldBattle.advice = [...mission.orders, ...e.fieldBattle.advice];
    e.fieldBattle.commandPost = { x: 780, y: 112 };
    e.fieldBattle.requireExitIds = e.state.filter(unit => unit.side === 'confederate').map(unit => unit.id);
    updateFiveForksMission(e);
  }
  if (e.scenarioId === 'jonesborough' && JONESBOROUGH_MISSIONS[e.choiceId]) {
    const mission = JONESBOROUGH_MISSIONS[e.choiceId];
    e.fieldBattle.missionDeadline = mission.deadline;
    e.fieldBattle.advice = [...mission.orders, ...e.fieldBattle.advice];
    e.fieldBattle.commandPost = { x: 972, y: 746 };
    e.fieldBattle.requireExitIds = e.state.filter(unit => unit.side === 'confederate').map(unit => unit.id);
    updateJonesboroughMission(e);
  }
  if (e.scenarioId === 'second_manassas' && SECOND_MANASSAS_MISSIONS[e.choiceId]) {
    const mission = SECOND_MANASSAS_MISSIONS[e.choiceId];
    e.fieldBattle.missionDeadline = mission.deadline;
    e.fieldBattle.advice = [...mission.orders, ...e.fieldBattle.advice];
    e.fieldBattle.commandPost = { x: 389, y: 584 };
    updateSecondManassasMission(e);
  }
  if (e.scenarioId === 'fredericksburg' && FREDERICKSBURG_MISSIONS[e.choiceId]) {
    const mission = FREDERICKSBURG_MISSIONS[e.choiceId];
    e.fieldBattle.missionDeadline = mission.deadline;
    e.fieldBattle.advice = [...mission.orders, ...e.fieldBattle.advice];
    e.fieldBattle.commandPost = { x: 288, y: 447 };
    updateFredericksburgMission(e);
  }
  if (e.scenarioId === 'gaines_mill' && GAINES_MILL_MISSIONS[e.choiceId]) {
    const mission = GAINES_MILL_MISSIONS[e.choiceId];
    e.fieldBattle.missionDeadline = mission.deadline;
    e.fieldBattle.advice = [...mission.orders, ...e.fieldBattle.advice];
    e.fieldBattle.commandPost = { x: 650, y: 658 };
    if (mission.kind === 'withdraw') e.fieldBattle.requireExitIds = e.state.filter(unit => unit.side === 'confederate').map(unit => unit.id);
    updateGainesMillMission(e);
  }
  if (e.scenarioId === 'new_market' && NEW_MARKET_MISSIONS[e.choiceId]) {
    const mission = NEW_MARKET_MISSIONS[e.choiceId];
    e.fieldBattle.missionDeadline = mission.deadline;
    e.fieldBattle.advice = [...mission.orders, ...e.fieldBattle.advice];
    e.fieldBattle.commandPost = { x: 796, y: 691 };
    updateNewMarketMission(e);
  }
  if (e.scenarioId === 'missionary_ridge' && MISSIONARY_RIDGE_MISSIONS[e.choiceId]) {
    const mission = MISSIONARY_RIDGE_MISSIONS[e.choiceId];
    e.fieldBattle.missionDeadline = mission.deadline;
    e.fieldBattle.advice = [...mission.orders, ...e.fieldBattle.advice];
    e.fieldBattle.commandPost = { x: 1080, y: 225 };
    if (mission.kind === 'withdraw') e.fieldBattle.requireExitIds = e.state.filter(unit => unit.side === 'confederate').map(unit => unit.id);
    updateMissionaryRidgeMission(e);
  }
  if (e.scenarioId === 'spotsylvania' && SPOTSYLVANIA_MISSIONS[e.choiceId]) {
    const mission = SPOTSYLVANIA_MISSIONS[e.choiceId];
    e.fieldBattle.missionDeadline = mission.deadline;
    e.fieldBattle.advice = [...mission.orders, ...e.fieldBattle.advice];
    e.fieldBattle.commandPost = { x: 920, y: 775 };
    updateSpotsylvaniaMission(e);
  }
  if (e.scenarioId === 'kennesaw_mountain' && KENNESAW_MISSIONS[e.choiceId]) {
    const mission = KENNESAW_MISSIONS[e.choiceId];
    e.fieldBattle.missionDeadline = mission.deadline;
    e.fieldBattle.advice = [...mission.orders, ...e.fieldBattle.advice];
    e.fieldBattle.commandPost = { x: 946, y: 645 };
    if (mission.kind === 'withdraw') e.fieldBattle.requireExitIds = e.state.filter(unit => unit.side === 'confederate').map(unit => unit.id);
    updateKennesawMission(e);
  }
  if (e.scenarioId === 'vicksburg' && VICKSBURG_MISSIONS[e.choiceId]) {
    const mission = VICKSBURG_MISSIONS[e.choiceId];
    e.fieldBattle.missionDeadline = mission.deadline;
    e.fieldBattle.advice = [...mission.orders, ...e.fieldBattle.advice];
    e.fieldBattle.commandPost = { x: 502, y: 561 };
    updateVicksburgMission(e);
  }
  if (e.scenarioId === 'sailors_creek' && SAILORS_CREEK_MISSIONS[e.choiceId]) {
    const mission = SAILORS_CREEK_MISSIONS[e.choiceId];
    e.fieldBattle.missionDeadline = mission.deadline;
    e.fieldBattle.advice = [...mission.orders, ...e.fieldBattle.advice];
    e.fieldBattle.commandPost = { x: 661, y: 659 };
    if (mission.kind === 'withdraw') e.fieldBattle.requireExitIds = e.state.filter(unit => unit.side === 'confederate').map(unit => unit.id);
    updateSailorsCreekMission(e);
  }
  if (e.fieldBattle.attackObjective || usesShilohReserveMission(e) || chickamaugaPreservation(e)) updateFieldMission(e);
  e.events.push({ time: 0, type: 'command', message: 'Updated field command: orders arrive by courier. Move does not fire; Assault commits to a marked command sector. Fallback keeps troops available, Rally needs safety and support, and Withdraw leaves the battle.' });
}

export function fieldArrivalClear(e, u) {
  return !formationLandmarkBlocker(landmarkField(e), u) && e.state.every(v => !v.active || v.id === u.id || ['broken', 'surrendered'].includes(v.status) || distance(u, v) >= gettysburgClearance(u, v));
}

export function updateFieldCommand(e) {
  const f = e.fieldBattle;
  if (e.time < f.nextAi) return;
  f.nextAi = e.time + 2;
  if (usesShilohReserveMission(e) && !f.reserveResponse && e.time >= 48) {
    f.reserveResponse = true;
    const advanced = [];
    for (const id of ['sherman-division', 'mcclernand-division']) {
      const u = e.state.find(unit => unit.id === id);
      if (gettysburgOrganized(u) && u.order === 'hold' && !['shaken', 'wavering'].includes(u.condition)) {
        u.order = 'advance'; u.directMove = false; advanced.push(u.name);
      }
    }
    e.events.push({ time:e.time, type:'counterattack', message:advanced.length ? `${advanced.join(' and ')}: limited advance ordered. Connect the front and keep Breckinridge in support.` : 'The planned Union probe could not form; its divisions are already committed or recovering. Keep the front and reserve connected.' });
  }
  const foes = e.state.filter(u => u.side === 'confederate' && gettysburgOrganized(u) && u.order !== 'withdraw');
  for (const u of e.state.filter(u => u.side === 'union' && gettysburgOrganized(u))) {
    const target = [...foes].sort((a, b) => distance(u, a) - distance(u, b))[0];
    const mustAdvance = e.config.unionAdvance || u.id === 'buell-vanguard' || (e.scenarioId === 'cold_harbor' && e.coldHarborAssaultState === 'engaged') || (e.scenarioId === 'petersburg' && e.craterState === 'contested');
    if (u.condition === 'wavering' && !['fallback', 'rally', 'withdraw'].includes(u.order)) {
      const exit = fieldExitTargets(e, u).sort((a, b) => distance(u, a) - distance(u, b))[0];
      u.order = 'fallback';
      u.directMove = false;
      u.target = ['fredericksburg', 'missionary_ridge', 'vicksburg'].includes(e.scenarioId)
        ? { x: Math.max(35, Math.min(e.world.width - 35, u.x + Math.sign(exit.x - u.x) * 135)), y: u.y }
        : { x: u.x, y: Math.max(35, Math.min(e.world.height - 35, u.y + Math.sign(exit.y - u.y) * 135)) };
    } else if (u.order === 'hold' && u.condition === 'shaken' && safeToRallyGettysburg(e, u)) {
      u.order = 'rally'; u.safeTime = 0;
    } else if (mustAdvance && target && u.type !== 'artillery' && u.order === 'hold' && e.time > 3.2) {
      u.order = 'advance'; u.directMove = false;
    }
    // A threatened landing draws the nearby defender back onto the objective.
    // This is a visible movement order, not a strength or morale bonus.
    if (e.battleRulesVersion === 5 && e.scenarioId === 'shiloh' && f.attackObjective && u.id === 'hurlbut-division'
      && !f.landingResponseCommitted && u.order === 'hold' && !['shaken', 'wavering'].includes(u.condition)
      && foes.some(v => distance(v, f.attackObjective) <= 350)) {
      u.order = 'assault'; u.directMove = false; u.assaultSector = f.attackObjective.id;
      u.target = { x: f.attackObjective.x, y: f.attackObjective.y }; f.landingResponseCommitted = true;
      e.events.push({ time: e.time, type: 'counterattack', message: "Hurlbut is shifting back to defend the threatened landing. Support the attack and leave a clear route for your reserve." });
    }
    // Scenario arrivals can order a counterattack, but may never turn an
    // explicit combat advance into a helpless direct move through the enemy.
    if (u.order === 'advance' && !u.pendingCommand) u.directMove = false;
    if (e.scenarioId === 'cold_harbor' && e.coldHarborAssaultState === 'engaged' && target && u.type === 'infantry' && ['hold', 'advance', 'assault'].includes(u.order) && !['shaken', 'wavering'].includes(u.condition)) {
      u.order = 'assault'; u.directMove = false; u.assaultSector = null;
      u.target = { x: target.x, y: target.y };
    }
  }
  if (e.scenarioId === 'five_forks' && e.time > 3.2) directFiveForksAssaults(e);
  if (e.scenarioId === 'jonesborough' && e.time > 3.2) directJonesboroughAssaults(e);
  if (e.scenarioId === 'second_manassas' && e.time > 3.2) directSecondManassasAssaults(e);
  if (e.scenarioId === 'fredericksburg' && e.time > 3.2) directFredericksburgAssaults(e);
  if (e.scenarioId === 'gaines_mill' && e.time > 3.2) directGainesMillPressure(e);
  if (e.scenarioId === 'new_market' && e.time > 3.2) directNewMarketPressure(e);
  if (e.scenarioId === 'missionary_ridge' && e.time > 3.2) directMissionaryRidgePressure(e);
  if (e.scenarioId === 'spotsylvania' && e.time > 3.2) directSpotsylvaniaPressure(e);
  if (e.scenarioId === 'kennesaw_mountain' && e.time > 3.2) directKennesawPressure(e);
  if (e.scenarioId === 'vicksburg' && e.time > 3.2) directVicksburgPressure(e);
  if (e.scenarioId === 'sailors_creek' && e.time > 3.2) directSailorsCreekPressure(e);
  coordinateEnemy(e);
  f.reserveIntent = e.events.filter(v => ['reinforcement', 'assault', 'counterattack', 'gap', 'warning', 'dispatch'].includes(v.type)).at(-1)?.message || 'No new enemy movement reported';
}

export function updateFieldSectors(e) {
  for (const s of e.fieldBattle.sectors) {
    const units = e.state.filter(u => (u.type === 'infantry' || e.battleRulesVersion >= 5 && u.type === 'artillery' && !u.gunsAbandoned) && gettysburgOrganized(u) && insideFieldSector(u, s));
    const cs = units.some(u => u.side === 'confederate'), us = units.some(u => u.side === 'union');
    s.control = cs && us ? 'contested' : cs ? 'confederate' : us ? 'union' : 'vacant';
  }
  const started = e.state.filter(u => u.side === 'confederate' && u.participated).reduce((n, u) => n + u.initialStrength, 0);
  e.fieldBattle.escaped = e.state.filter(u => u.side === 'confederate' && u.withdrawn && u.withdrawalOrganized).reduce((n, u) => n + u.strength, 0) / Math.max(1, started);
}

export function judgeFieldExit(e) {
  const force = e.state.filter(u => u.side === 'confederate');
  const waiting = force.some(u => !u.participated && u.arrivalTime != null && u.arrivalTime <= e.config.maxTime);
  if (force.some(u => u.active && !['broken', 'surrendered'].includes(u.status)) || waiting) return false;
  // Specialized withdrawals still require their authored corridor, screen,
  // transfer or raid conditions. Merely saving soldiers is not mission success.
  if (['third_winchester', 'cold_harbor', 'petersburg', 'antietam', 'five_forks', 'jonesborough', 'second_manassas', 'fredericksburg', 'gaines_mill', 'new_market', 'missionary_ridge', 'spotsylvania', 'kennesaw_mountain', 'vicksburg', 'sailors_creek'].includes(e.scenarioId)) return false;
  const mission = BATTLE_OBJECTIVES[e.scenarioId]?.[e.choiceId];
  const escaped = force.filter(u => u.withdrawn && u.withdrawalOrganized).reduce((n, u) => n + u.strength, 0) / Math.max(1, e.initialConfederate);
  const preservationMission = ['withdraw', 'preserve'].includes(mission?.kind) && !mission?.signals.includes('fullInterval');
  e.beginResolution(preservationMission && escaped >= .65 ? 'disciplined-withdrawal' : escaped >= .4 ? 'defeat' : 'rout');
  return true;
}

export function tickFieldBattle(e, dt) {
  if (e.pendingOutcome) {
    e.resolutionTime += dt;
    if (e.resolutionTime >= 1) { e.outcome = e.pendingOutcome; e.pendingOutcome = null; }
    return;
  }
  e.fieldBattle.accumulator += Math.min(dt, 60);
  while (e.fieldBattle.accumulator + 1e-9 >= GETTYSBURG_RULES.step && !e.pendingOutcome && e.outcome === 'undecided') {
    e.fieldBattle.accumulator = Math.max(0, e.fieldBattle.accumulator - GETTYSBURG_RULES.step);
    stepTacticalFormations(e, GETTYSBURG_RULES.step);
  }
  updateFieldSectors(e);
}

// Apply mission evidence before accepting a legacy scenario's outcome category.
export function updateFieldMission(e, dt = 0) {
  if (e.scenarioId === 'antietam') { updateAntietamMission(e, dt); return true; }
  if (e.scenarioId === 'five_forks') return updateFiveForksMission(e, dt);
  if (e.scenarioId === 'jonesborough') return updateJonesboroughMission(e, dt);
  if (e.scenarioId === 'second_manassas') return updateSecondManassasMission(e, dt);
  if (e.scenarioId === 'fredericksburg') return updateFredericksburgMission(e, dt);
  if (e.scenarioId === 'gaines_mill') return updateGainesMillMission(e, dt);
  if (e.scenarioId === 'new_market') return updateNewMarketMission(e, dt);
  if (e.scenarioId === 'missionary_ridge') return updateMissionaryRidgeMission(e, dt);
  if (e.scenarioId === 'spotsylvania') return updateSpotsylvaniaMission(e, dt);
  if (e.scenarioId === 'kennesaw_mountain') return updateKennesawMission(e, dt);
  if (e.scenarioId === 'vicksburg') return updateVicksburgMission(e, dt);
  if (e.scenarioId === 'sailors_creek') return updateSailorsCreekMission(e, dt);
  const preservation = chickamaugaPreservation(e);
  if (preservation) {
    e.fieldBattle.preservationObjective = preservation;
    if (preservation.intervalComplete && preservation.ready) { e.beginResolution('disciplined-withdrawal'); return true; }
  }
  const reserve = updateShilohReserve(e, dt);
  if (reserve?.achieved) {
    e.events.push({ time:e.time, type:'objective', message:'The organized front and effective command reserve held through the defensive interval.' });
    e.beginResolution('disciplined-withdrawal'); return true;
  }
  const objective = e.fieldBattle.attackObjective;
  if (objective) {
    const { supported, defenders } = objectiveControl(e.state, objective, 'attack');
    objective.eligible = supported.length; objective.defenders = defenders.length;
    objective.state = defenders.length ? 'Contested by organized defenders' : supported.length < 2 ? 'Needs two supporting infantry formations' : 'Securing the objective';
    const previouslyHeld = objective.held;
    objective.held = supported.length >= 2 && !defenders.length ? Math.min(objective.required, objective.held + dt) : 0;
    recordObjectiveProgress(e.fieldBattle, e.time, previouslyHeld, objective.held, objective.name);
    if (objective.held + 1e-8 >= objective.required) {
      objective.held = objective.required; objective.state = 'Objective secured';
      e.events.push({ time: e.time, type: 'objective', message: `${objective.name} secured by supporting infantry for eight uninterrupted field minutes.` });
      e.beginResolution(e.sideStrength('confederate') / e.initialConfederate >= .75 ? 'decisive-win' : 'costly-win'); return true;
    }
  }
  if (e.scenarioId !== 'first_manassas' || e.choiceId !== 'option_b') return false;
  const defense = henryHillObjective(e);
  e.fieldBattle.defendedUnderFire = defense.underFire;
  if (defense.achieved) {
    e.events.push({ time: e.time, type: 'objective', message: 'At the defensive deadline, two supporting infantry formations hold Henry Hill with no organized Union troops on it. Defense under fire was recorded during the battle.' });
    e.beginResolution('costly-win'); return true;
  }
  return false;
}

export function fieldResolution(e, decision) {
  const preservation = chickamaugaPreservation(e);
  if (preservation && ['decisive-win', 'costly-win', 'disciplined-withdrawal'].includes(decision) && !preservation.ready) return 'defeat';
  const mission = BATTLE_OBJECTIVES[e.scenarioId]?.[e.choiceId];
  if (usesShilohReserveMission(e) && ['decisive-win', 'costly-win', 'disciplined-withdrawal'].includes(decision) && !shilohReserveState(e).achieved) return e.time < e.config.maxTime && e.state.some(u => u.side === 'confederate' && u.active && gettysburgOrganized(u)) ? null : 'defeat';
  if (e.fieldBattle.attackObjective && ['decisive-win', 'costly-win'].includes(decision) && e.fieldBattle.attackObjective.held < e.fieldBattle.attackObjective.required) return e.time < e.config.maxTime ? null : 'defeat';
  if (decision !== 'disciplined-withdrawal' || ['third_winchester', 'cold_harbor'].includes(e.scenarioId)) return decision;
  const escaped = e.state.filter(u => u.side === 'confederate' && u.withdrawn && u.withdrawalOrganized).reduce((n, u) => n + u.strength, 0) / Math.max(1, e.initialConfederate);
  if (mission?.kind === 'preserve' || escaped >= .65) return decision;
  // A stationary army has not withdrawn. Keep the clock running so players
  // can still execute their orders; an uncompleted exit fails at the deadline.
  if (e.time < e.config.maxTime) return null;
  return 'defeat';
}
