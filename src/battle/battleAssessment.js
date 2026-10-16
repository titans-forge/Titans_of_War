import { withdrawalGoals, isWithdrawalGoals } from './withdrawalGoals.js';
import { chickamaugaPreservationConditions } from './chickamaugaPreservation.js';
import { shilohReserveConditions } from './shilohReserveObjective.js';
import { henryHillConditions } from './henryHillObjective.js';
import { battleAfterAction } from './battleAfterAction.js';
import { BATTLE_ENGINE_CONFIGS } from './battleDefinitions.js';
import { getGettysburgJacksonMissionPresentation } from './gettysburgJacksonMission.js';

export const BATTLE_ASSESSMENT_VERSION = 1;
const WIN = ['decisive-win', 'costly-win'];
const WITHDRAW = ['disciplined-withdrawal'];
const PRESERVED = [...WIN, ...WITHDRAW];
const objective = (label, kind, outcomes, signals = []) => ({ label, kind, outcomes, signals });

// These are selected missions, not a universal victory/kill-count rubric.
// The mission definitions follow the campaign choices and the engine's authored
// success conditions. Political/cavalry work outside the field is not invented.
export const BATTLE_OBJECTIVES = {
  first_manassas: {
    option_a: objective('Break the Union attack with a counterstroke', 'attack', WIN),
    option_b: objective('Hold Henry Hill against the Union attack', 'hold', WIN),
    option_c: objective('Preserve the army in withdrawal toward Manassas Junction', 'withdraw', WITHDRAW),
    option_d: objective('Turn the diversion into a favorable field result', 'attack', WIN),
  },
  shiloh: {
    option_a: objective('Drive Grant away from Pittsburg Landing', 'attack', WIN),
    option_b: objective('Protect Johnston and preserve an effective command reserve', 'preserve', PRESERVED, ['johnston']),
    option_c: objective('Earn a field success to support the mediation dispatches', 'attack', WIN),
    option_d: objective('Preserve the army for the depot and crossing priorities', 'withdraw', WITHDRAW, ['johnston']),
  },
  chancellorsville: {
    option_a: objective('Turn Jackson’s timely flank contact into a field victory', 'attack', WIN, ['surprise']),
    option_b: objective('Keep the compact army intact through the defensive interval', 'preserve', PRESERVED, ['fullInterval']),
    option_c: objective('Convert the feint and flank probe into a field victory', 'attack', WIN, ['surprise']),
    option_d: objective('Win the direct pressure attack against Hooker', 'attack', WIN),
  },
  wilderness: {
    option_a: objective('Make the early counterstroke succeed', 'attack', WIN),
    option_b: objective('Wait for Longstreet and stabilize the army without committing early', 'preserve', PRESERVED, ['longstreet', 'waited']),
    option_c: objective('Restore the field position with the personal rally', 'attack', WIN),
    option_d: objective('Preserve the army while yielding ground toward Brock Road', 'withdraw', WITHDRAW),
  },
  third_winchester: {
    option_a: objective('Win the counterattack toward the Berryville approach', 'attack', WIN),
    option_b: objective('Cover the army and bring the rearguard through the Winchester corridor', 'withdraw', WITHDRAW, ['coveredExit']),
    option_c: objective('Maintain a successful field defense while political messages circulate', 'hold', WIN),
    option_d: objective('Bring the retiring columns and their screen through the Winchester corridor', 'withdraw', WITHDRAW, ['coveredExit']),
  },
  cedar_creek: {
    option_a: objective('Convert the dawn surprise into a field victory', 'attack', WIN, ['surprise']),
    option_b: objective('Hold the field against Sheridan’s restored line', 'hold', WIN),
    option_c: objective('Withdraw with the army and captured train intact', 'withdraw', WITHDRAW),
    option_d: objective('Preserve the army through a fighting withdrawal', 'withdraw', WITHDRAW),
  },
  gettysburg: {
    option_a: objective('Break the Union center with the coordinated assault', 'attack', WIN, ['assault']),
    option_b: objective('Disengage in order for the repositioning south', 'withdraw', WITHDRAW),
    option_c: objective('Preserve the army for its retreat toward Virginia', 'withdraw', WITHDRAW),
    option_d: objective('Disengage the field army under the diversion’s cover', 'withdraw', WITHDRAW),
  },
  gettysburg_jackson: {
    option_a: objective('Convert the heights attack into a decisive victory with timely surprise', 'attack', ['decisive-win'], ['surprise']),
    option_b: objective('Win through the coordinated envelopment', 'attack', WIN, ['surprise']),
    option_c: objective('Earn a favorable field result for the Baltimore Pike threat', 'attack', WIN),
    option_d: objective('Force a favorable result with the turning movement', 'attack', WIN),
  },
  chickamauga: {
    option_a: objective('Win the frontal attacks through the woods', 'attack', WIN),
    option_b: objective('Break the Brotherton gap with the concentrated column', 'attack', WIN, ['gap']),
    option_c: objective('Preserve an effective army while seeking coordination', 'preserve', PRESERVED),
    option_d: objective('Preserve the field army while the rail diversion proceeds', 'preserve', PRESERVED),
  },
  cold_harbor: {
    option_a: objective('Win the counterattack beyond the works', 'attack', WIN),
    option_b: objective('Hold the works and repulse the Federal assault', 'hold', WIN, ['repulse']),
    option_c: objective('Hold the works to support the political dispatches', 'hold', WIN, ['repulse']),
    option_d: objective('Complete the organized transfer toward Petersburg', 'withdraw', WITHDRAW, ['transfer']),
  },
  petersburg: {
    option_a: objective('Seal the crater breach with Mahone’s counterattack', 'attack', WIN, ['sealed']),
    option_b: objective('Contain the lodgment behind the secondary works', 'hold', WIN, ['contained']),
    option_c: objective('Strike both siege sectors and return the sortie safely', 'raid', ['costly-win'], ['raided', 'returned']),
    option_d: objective('Stop the assault in the mine lanes and seal the breach', 'hold', WIN, ['mines', 'sealed']),
  },
};

const percent = (value) => Math.round(Math.max(0, Math.min(100, value)));
const resultLabels = {
  'decisive-win': 'Decisive field victory', 'costly-win': 'Limited field victory',
  'disciplined-withdrawal': 'Organized withdrawal', defeat: 'Field defeat', rout: 'Army routed',
};

function readSignal(id, snapshot, config) {
  const value = (label, satisfied, detail) => ({ label, satisfied, detail });
  switch (id) {
    case 'attackGround': return value('Supported objective held', snapshot.fieldBattle?.attackObjective?.held >= snapshot.fieldBattle?.attackObjective?.required, `${(snapshot.fieldBattle?.attackObjective?.held || 0).toFixed(1)} / ${snapshot.fieldBattle?.attackObjective?.required || 8} field minutes`);
    case 'surprise': return value('Timely surprise contact', snapshot.surpriseState === 'triggered', snapshot.surpriseState === 'triggered' ? 'Window used' : snapshot.surpriseState === 'expired' ? 'Window missed' : 'Not yet recorded');
    case 'johnston': return value('Johnston protected', snapshot.commanderStatus === 'protected', snapshot.commanderStatus === 'protected' ? 'Protected' : 'Protection not established');
    case 'fullInterval': return value('Defensive interval completed', snapshot.time >= config.maxTime, `${Math.floor(snapshot.time || 0)} / ${config.maxTime} field minutes`);
    case 'longstreet': {
      const arrived = snapshot.formations?.some((unit) => unit.id === config.longstreetFormationId && unit.active);
      return value('Longstreet arrived', arrived, arrived ? 'Arrival recorded' : 'Arrival not yet recorded');
    }
    case 'waited': {
      // New engines supply the flag directly. Legacy/practice snapshots have
      // the corresponding authored dispatch, so no new combat state is needed.
      const early = snapshot.prematureCommitment === true || snapshot.events?.some((event) => event.message === "Hill's battered front has advanced before Longstreet can support it.");
      return value('No premature commitment', !early, early ? 'Front committed before support arrived' : 'No early commitment recorded');
    }
    case 'coveredExit': return value('Covered corridor exit', snapshot.thirdWinchester?.withdrawalState === 'secured', `${percent((snapshot.thirdWinchester?.escapedRatio || 0) * 100)}% cleared the corridor`);
    case 'ridge': return value('Sustained ridge control', snapshot.gettysburg?.held >= snapshot.gettysburg?.holdRequired, `${(snapshot.gettysburg?.held || 0).toFixed(1)} / ${snapshot.gettysburg?.holdRequired || 18} field minutes`);
    case 'escapeGettysburg': return value('Force safely withdrawn in order', snapshot.gettysburg?.escaped >= 0.7, `${Math.round((snapshot.gettysburg?.escaped || 0) * 100)}% / 70% required`);
    case 'assault': return value('Assault contact', snapshot.assaultState === 'engaged', snapshot.assaultState === 'engaged' ? 'Contact within the assault window' : 'Timed contact not established');
    case 'gap': return value('Brotherton gap breached', snapshot.gapState === 'breached', snapshot.gapState === 'breached' ? 'Breach recorded' : 'Breach not established');
    case 'repulse': return value('Federal assault repulsed', snapshot.coldHarborAssaultState === 'repulsed', snapshot.coldHarborAssaultState === 'repulsed' ? 'Repulse recorded' : 'Repulse not established');
    case 'transfer': return value('Petersburg transfer', snapshot.transferState === 'transferred', snapshot.transferState === 'transferred' ? 'Transfer staging line reached' : 'Transfer not established');
    case 'sealed': return value('Crater breach sealed', snapshot.craterState === 'sealed', snapshot.craterState === 'sealed' ? 'Breach sealed' : 'Breach not sealed');
    case 'contained': return value('Federal lodgment contained', ['contained', 'sealed'].includes(snapshot.craterState), ['contained', 'sealed'].includes(snapshot.craterState) ? 'Lodgment contained' : 'Containment not established');
    case 'mines': return value('Assault entered the mine lanes', snapshot.mineState === 'detonated', snapshot.mineState === 'detonated' ? 'Mine shock recorded' : 'Mine effect not established');
    case 'raided': return value('Both siege sectors struck', snapshot.sortieTargetsHit?.length === config.siegeObjectiveIds?.length, `${snapshot.sortieTargetsHit?.length || 0} / ${config.siegeObjectiveIds?.length || 2} sectors recorded`);
    case 'returned': return value('Sortie returned', snapshot.sortieState === 'withdrawn', snapshot.sortieState === 'withdrawn' ? 'Return recorded' : 'Return not established');
    default: throw new Error(`Unknown assessment signal: ${id}`);
  }
}

export function getBattleAssessment(snapshot, choiceId) {
  if (!snapshot || !choiceId) return null;
  const battleId = snapshot.battleId || snapshot.scenarioId;
  let mission = Object.hasOwn(BATTLE_OBJECTIVES, battleId) && Object.hasOwn(BATTLE_OBJECTIVES[battleId], choiceId)
    ? BATTLE_OBJECTIVES[battleId][choiceId] : null;
  const config = Object.hasOwn(BATTLE_ENGINE_CONFIGS, battleId) ? BATTLE_ENGINE_CONFIGS[battleId] : null;
  if (!mission || !config) return null;
  if (snapshot.gettysburg) mission = choiceId === 'option_a' ? objective('Hold two ridge sectors with supported infantry for 18 field minutes', 'attack', WIN, ['ridge']) : objective('Withdraw 70% of the starting force in order to safety', 'withdraw', WITHDRAW, ['escapeGettysburg']);
  if (snapshot.fieldBattle?.attackObjective) mission = objective(`Secure ${snapshot.fieldBattle.attackObjective.name} with supporting infantry for eight field minutes`, 'attack', WIN, ['attackGround']);
  const source = snapshot.delegated === true ? 'delegated' : 'manual';
  const result = snapshot.decision || snapshot.outcome || snapshot.result;
  const preservedInPlace = snapshot.fieldBattle && mission.kind === 'preserve' && result === 'disciplined-withdrawal' && snapshot.fieldBattle.escaped < .65;
  const outcomeLabel = preservedInPlace ? 'Army preserved through the mission' : resultLabels[result];
  const finished = Object.hasOwn(resultLabels, result);
  const signals = source === 'manual' ? [...mission.signals.map((id) => readSignal(id, snapshot, config)), ...shilohReserveConditions(snapshot.fieldBattle?.reserveObjective), ...chickamaugaPreservationConditions(snapshot.fieldBattle?.preservationObjective)] : [];
  const accepted = finished && mission.outcomes.includes(result);
  const matched = signals.filter((signal) => signal.satisfied).length;
  const achieved = accepted && signals.every((signal) => signal.satisfied);
  const partial = finished && !achieved && result !== 'rout' && (accepted || WIN.includes(result) || matched > 0);
  const status = !finished ? 'in-progress' : achieved ? 'achieved' : partial ? 'partial' : 'failed';
  const objectiveScore = !finished ? null : achieved ? 100 : partial ? 50 : 0;
  const progress = percent(100 * (matched + Number(accepted)) / (signals.length + 1));
  const armyRetained = percent(100 * (1 - (Number.isFinite(snapshot.confederateLossRate) ? snapshot.confederateLossRate : 0)));
  const ammunitionRetained = source === 'manual' && Number.isFinite(snapshot.ammunitionRate) ? percent(snapshot.ammunitionRate * 100) : null;
  const preservationScore = ammunitionRetained === null ? armyRetained : percent(armyRetained * 0.85 + ammunitionRetained * 0.15);
  const commandScore = finished ? percent(objectiveScore * 0.75 + preservationScore * 0.25) : null;
  const expectation = mission.outcomes.map((outcome) => resultLabels[outcome].toLowerCase()).join(' or ');
  const explanation = [!finished ? 'The mission is still in progress; no command grade has been assigned.'
    : achieved ? 'The selected mission’s outcome and available completion evidence are satisfied.'
      : partial ? 'Some value was retained, but the selected mission was not completed.'
        : 'The selected mission was not completed.'];
  explanation.push(`Mission: ${expectation}. Objective achievement is 75% of the command assessment; preservation is 25%.`);
  if (source === 'delegated') explanation.push('Staff estimate based on the delegated outcome and estimated army losses. Formation movement, timing and ammunition use were not observed.');
  else explanation.push('Preservation combines the retained army (85%) and remaining field ammunition (15%); it is separate from objective achievement.');
  if (finished && !accepted && result === 'disciplined-withdrawal') explanation.push('An organized retreat preserved the army but did not accomplish this selected mission.');
  const jackson = source === 'manual' ? getGettysburgJacksonMissionPresentation(snapshot, choiceId) : null;
  if (jackson?.resultRationale) explanation.push(jackson.resultRationale);
  const evidence = [
    { label: source === 'delegated' ? 'Staff outcome estimate' : 'Field outcome', value: finished ? outcomeLabel : 'Undecided' },
    ...signals.map((signal) => ({ label: signal.label, value: signal.detail })),
    ...henryHillConditions(source === 'manual' ? snapshot.fieldBattle?.defenseObjective : null).map(condition => ({ label: condition.label, value: `${condition.satisfied ? 'Met' : 'Unmet'}: ${condition.detail}` })),
    { label: source === 'delegated' ? 'Estimated army retained' : 'Army retained', value: `${armyRetained}%` },
    { label: 'Field ammunition retained', value: ammunitionRetained === null ? 'Not observed' : `${ammunitionRetained}%` },
  ];
  return {
    version: BATTLE_ASSESSMENT_VERSION, source,
    objective: { id: `${battleId}:${choiceId}`, label: mission.label, kind: mission.kind, status, progress, score: objectiveScore },
    preservation: { score: preservationScore, armyRetained, ammunitionRetained },
    commandScore, explanation, evidence,
    ...(withdrawalGoals(snapshot, mission, achieved) ? { withdrawalGoals: withdrawalGoals(snapshot, mission, achieved) } : {}),
    ...(finished && source === 'manual' ? { afterAction: battleAfterAction(snapshot, mission, achieved) } : {}),
  };
}

const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, max) => typeof value === 'string' && value.length > 0 && value.length <= max;
const score = (value) => Number.isInteger(value) && value >= 0 && value <= 100;

export function isBattleAssessment(value) {
  if (!record(value) || value.version !== BATTLE_ASSESSMENT_VERSION || !['manual', 'delegated'].includes(value.source)) return false;
  if (value.withdrawalGoals !== undefined && (!isWithdrawalGoals(value.withdrawalGoals) || value.source !== 'manual' || value.objective?.kind !== 'withdraw'
    || value.withdrawalGoals.finished !== (value.objective?.status !== 'in-progress')
    || value.objective?.status !== 'achieved' && value.withdrawalGoals.goals.some(g => g.status === 'achieved'))) return false;
  const goal = value.objective, retained = value.preservation;
  if (!record(goal) || !text(goal.id, 100) || !text(goal.label, 240)
    || !['attack', 'hold', 'preserve', 'withdraw', 'raid'].includes(goal.kind)
    || !['in-progress', 'achieved', 'partial', 'failed'].includes(goal.status) || !score(goal.progress)) return false;
  if (!record(retained) || !score(retained.score) || !score(retained.armyRetained)
    || !(retained.ammunitionRetained === null || score(retained.ammunitionRetained))) return false;
  if (value.source === 'delegated' && retained.ammunitionRetained !== null) return false;
  if (retained.score !== (retained.ammunitionRetained === null ? retained.armyRetained : percent(retained.armyRetained * 0.85 + retained.ammunitionRetained * 0.15))) return false;
  if (goal.status === 'in-progress') {
    if (goal.score !== null || value.commandScore !== null) return false;
  } else {
    if (goal.score !== ({ achieved: 100, partial: 50, failed: 0 })[goal.status]
      || value.commandScore !== percent(goal.score * 0.75 + retained.score * 0.25)) return false;
  }
  if (value.afterAction !== undefined) {
    const report = value.afterAction;
    if (value.source !== 'manual' || goal.status === 'in-progress' || !record(report) || !Number.isInteger(report.omitted) || report.omitted < 0
      || !Array.isArray(report.timeline) || report.timeline.length > 8
      || !report.timeline.every(e => record(e) && Number.isFinite(e.time) && e.time >= 0 && text(e.message, 500))
      || !Array.isArray(report.next) || !report.next.length || report.next.length > 3 || !report.next.every(line => text(line, 500))) return false;
  }
  return Array.isArray(value.explanation) && value.explanation.length > 0 && value.explanation.length <= 6
    && value.explanation.every((line) => text(line, 500))
    && Array.isArray(value.evidence) && value.evidence.length > 0 && value.evidence.length <= 12
    && value.evidence.every((item) => record(item) && text(item.label, 120) && text(item.value, 240));
}
