import assert from 'node:assert/strict';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { applyBattleResolution, battleChoiceSuccessModifier, battleForScenario, delegateBattle } from '../src/game/battles.js';
import { createCampaignSnapshot, createFreshCampaignState as freshCampaign, restoreCampaignFromSnapshot } from '../src/game/campaignStorage.js';
import { buildHistoryEntry } from '../src/game/headlessCampaign.js';

// Authored legacy scenario outcomes remain pinned to tactical rules 2.
const createFreshCampaignState = (...args) => ({ ...freshCampaign(...args), battleRulesVersion: 2 });

const scenario = {
  id: 'manassas_battlefield',
  turn: 2,
  date: 'July 21, 1861',
  title: 'First Battle of Manassas',
  roleLabel: 'Confederate Brigade Commander',
  choices: [{ id: 'option_b', text: 'Hold Henry Hill.', proposer: 'fox', scoreCard: { tactical: 2 } }],
};

const shilohScenario = {
  id: 'shiloh_army_of_tennessee',
  turn: 4,
  date: 'April 6-7, 1862',
  title: 'Shiloh - The Army of Tennessee',
  roleLabel: 'Western Theater Commander',
  choices: [{ id: 'option_b', text: 'Keep Johnston behind the main line.', proposer: 'fox', scoreCard: { tactical: 3 } }],
};

const chancellorsvilleScenario = {
  id: 'chancellorsville_maneuver',
  turn: 10,
  date: 'May 2, 1863',
  title: "The Chancellorsville Gamble — Jackson's Flank March",
  actor: 'General Robert E. Lee',
  roleLabel: 'Commander of Northern Virginia',
  choices: [{ id: 'option_a', text: "Approve Jackson's concealed flank march.", proposer: 'hotspur', scoreCard: { tactical: 15 } }],
};

const wildernessScenario = {
  id: 'wilderness_opening',
  turn: 15,
  date: 'May 6, 1864',
  title: "Wilderness Crisis — Lee's Line Staggers",
  actor: 'General Robert E. Lee',
  roleLabel: 'Army Commander',
  choices: [{ id: 'option_b', text: 'Have the Texans hold Lee back and wait for Longstreet.', proposer: 'fox', scoreCard: { tactical: 20 } }],
};

const cedarCreekScenario = {
  id: 'cedar_creek',
  turn: 23,
  date: 'October 19, 1864',
  title: 'Cedar Creek — Belle Grove at Dawn',
  actor: 'Lt. Gen. Jubal Early',
  roleLabel: 'Valley District Commander',
  choices: [{ id: 'option_a', text: 'Drive the dawn assault past Belle Grove.', proposer: 'hotspur', scoreCard: { tactical: 18 } }],
};

const gettysburgScenario = {
  id: 'gettysburg_decision',
  turn: 13,
  date: 'July 3, 1863',
  title: 'The Gettysburg Crisis — Cemetery Ridge',
  actor: 'General Robert E. Lee',
  roleLabel: 'Commander of Northern Virginia',
  choices: [{ id: 'option_a', text: "Charge Pickett's Division straight up the center.", proposer: 'hotspur', successRate: 0.35 }],
};

const gettysburgJacksonScenario = {
  id: 'gettysburg_with_jackson',
  turn: 13,
  date: 'July 1-2, 1863',
  title: 'Gettysburg with Jackson — The Unmade Left Hook',
  actor: 'General Robert E. Lee',
  roleLabel: 'Commander of Northern Virginia',
  choices: [{ id: 'option_a', text: 'Let Jackson seize the high ground at once.', proposer: 'hotspur', successRate: 0.5 }],
};

const chickamaugaScenario = {
  id: 'chickamauga',
  turn: 14,
  date: 'September 20, 1863',
  title: 'Battle of Chickamauga — River of Death',
  actor: 'General Braxton Bragg',
  roleLabel: 'Army Commander',
  choices: [{ id: 'option_b', text: "Deploy Longstreet's fresh division in a concentrated column attack through the center gap.", proposer: 'fox' }],
};

const coldHarborScenario = {
  id: 'cold_harbor',
  turn: 18,
  date: 'June 3, 1864',
  title: 'Cold Harbor — Entrenchment, Slaughter, and the Election Clock',
  actor: 'General Robert E. Lee',
  roleLabel: 'Army Commander',
  choices: [{ id: 'option_b', text: 'Deepen the works and conserve the army.', proposer: 'fox' }],
};

const petersburgScenario = {
  id: 'petersburg_siege',
  turn: 20,
  date: 'July 30, 1864',
  title: 'The Siege of Petersburg — The Crater',
  actor: 'General Robert E. Lee',
  roleLabel: 'Army Commander',
  choices: [{ id: 'option_a', text: 'Launch Mahone into the crater breach.', proposer: 'hotspur' }],
};

const state = createFreshCampaignState(1861, scenario.id);
state.currentTurn = 2;
assert.equal(battleForScenario(scenario, state)?.id, 'first_manassas');

const engineA = new CivilWarBattleEngine('first_manassas', state, 'option_b');
const engineB = new CivilWarBattleEngine('first_manassas', state, 'option_b');
assert.deepEqual(engineA.snapshot(), engineB.snapshot(), 'equal inputs must produce equal opening formations');

for (let index = 0; index < 900; index += 1) {
  engineA.tick(0.05);
  engineB.tick(0.05);
}
assert.deepEqual(engineA.snapshot(), engineB.snapshot(), 'battle ticks must remain deterministic');
assert.ok(engineA.snapshot().formations.some((formation) => formation.ammunition < formation.initialAmmunition), 'formations should expend ammunition');
assert.ok(engineA.snapshot().formations.some((formation) => formation.strength < formation.initialStrength), 'volley fire should cause losses');

const battle = battleForScenario(scenario, state);
const delegatedA = delegateBattle(state, battle, 'option_b');
const delegatedB = delegateBattle(state, battle, 'option_b');
assert.deepEqual(delegatedA, delegatedB, 'delegation must be deterministic');

const resolved = applyBattleResolution(state, delegatedA);
assert.ok(resolved.battleCampaign.results.manassas_battlefield, 'battle result should be recorded by authored scenario id');
assert.notDeepEqual(resolved.metrics, state.metrics, 'battle outcome should affect campaign metrics');
assert.deepEqual(applyBattleResolution(resolved, delegatedA), resolved, 'battle effects must be idempotent');

const historyEntry = buildHistoryEntry(resolved, scenario, scenario.choices[0], {
  shards: resolved.shards,
  appliedEffects: { metrics: {} },
  choiceSucceeded: true,
  resolvedConsequence: 'The line held.',
  divergenceIndex: resolved.divergenceIndex,
});
assert.equal(historyEntry.scoreCard.tactical, 2 + resolved.battleCampaign.results.manassas_battlefield.tacticalScore, 'battle score should contribute to tactical grading');
assert.equal(historyEntry.battleResult.result, delegatedA.result);

const shilohState = createFreshCampaignState(1862, shilohScenario.id);
shilohState.currentTurn = 4;
const shilohBattle = battleForScenario(shilohScenario, shilohState);
assert.equal(shilohBattle?.id, 'shiloh');
const shilohA = new CivilWarBattleEngine('shiloh', shilohState, 'option_b');
const shilohB = new CivilWarBattleEngine('shiloh', shilohState, 'option_b');
for (const formationId of ['hardee-corps', 'bragg-corps', 'polk-corps', 'breckinridge-reserve']) {
  shilohA.order(formationId, 'advance');
  shilohB.order(formationId, 'advance');
}
for (let index = 0; index < 1700; index += 1) {
  shilohA.tick(0.05);
  shilohB.tick(0.05);
}
assert.deepEqual(shilohA.snapshot(), shilohB.snapshot(), 'Shiloh must remain deterministic');
assert.equal(shilohA.snapshot().formations.find((formation) => formation.id === 'buell-vanguard')?.active, true, 'Buell should arrive on schedule');
assert.ok(shilohA.snapshot().events.some((event) => event.type === 'reinforcement'), 'the reinforcement arrival should be recorded');
assert.equal(shilohA.snapshot().commanderStatus, 'protected', 'the command-reserve choice should preserve Johnston');
assert.ok(shilohA.snapshot().formations.some((formation) => formation.strength < formation.initialStrength), 'Shiloh should produce battlefield losses');

const delegatedShiloh = delegateBattle(shilohState, shilohBattle, 'option_b');
assert.equal(delegatedShiloh.commanderStatus, 'protected');
const resolvedShiloh = applyBattleResolution(shilohState, delegatedShiloh);
assert.ok(resolvedShiloh.battleCampaign.results.shiloh_army_of_tennessee, 'Shiloh should write to the battle ledger');
assert.equal(battleForScenario(shilohScenario, resolvedShiloh), null, 'a completed Shiloh battle must not reopen');

const chancellorsvilleState = createFreshCampaignState(1863, chancellorsvilleScenario.id);
chancellorsvilleState.currentTurn = 10;
const chancellorsvilleBattle = battleForScenario(chancellorsvilleScenario, chancellorsvilleState);
assert.equal(chancellorsvilleBattle?.id, 'chancellorsville');
const chancellorsvilleA = new CivilWarBattleEngine('chancellorsville', chancellorsvilleState, 'option_a');
const chancellorsvilleB = new CivilWarBattleEngine('chancellorsville', chancellorsvilleState, 'option_a');
assert.match(chancellorsvilleA.snapshot().fieldStatus.label, /Flank column in 20/);
for (let index = 0; index < 520; index += 1) {
  chancellorsvilleA.tick(0.05);
  chancellorsvilleB.tick(0.05);
}
assert.equal(chancellorsvilleA.snapshot().formations.find((formation) => formation.id === 'jackson-rodes')?.active, true, 'Rodes should clear the flank march first');
assert.equal(chancellorsvilleA.snapshot().formations.find((formation) => formation.id === 'ap-hill-reserve')?.active, false, 'A. P. Hill should remain in the marching column at minute 26');
for (const formationId of ['jackson-rodes', 'jackson-colston']) {
  chancellorsvilleA.order(formationId, 'advance');
  chancellorsvilleB.order(formationId, 'advance');
}
for (let index = 0; index < 500; index += 1) {
  chancellorsvilleA.tick(0.05);
  chancellorsvilleB.tick(0.05);
}
assert.deepEqual(chancellorsvilleA.snapshot(), chancellorsvilleB.snapshot(), 'Chancellorsville must remain deterministic');
assert.equal(chancellorsvilleA.snapshot().surpriseState, 'triggered', 'timely contact should surprise the XI Corps');
assert.ok(chancellorsvilleA.snapshot().events.some((event) => event.type === 'surprise'), 'the flank shock should be recorded');
assert.equal(chancellorsvilleA.snapshot().fieldStatus.label, 'XI Corps surprised');

const chancellorsvilleLate = new CivilWarBattleEngine('chancellorsville', chancellorsvilleState, 'option_a');
for (let index = 0; index < 1060; index += 1) chancellorsvilleLate.tick(0.05);
assert.equal(chancellorsvilleLate.snapshot().surpriseState, 'expired', 'an idle flank column should lose surprise');
assert.equal(chancellorsvilleLate.snapshot().fieldStatus.label, 'Union right alerted');

const delegatedChancellorsville = delegateBattle(chancellorsvilleState, chancellorsvilleBattle, 'option_a');
const resolvedChancellorsville = applyBattleResolution(chancellorsvilleState, delegatedChancellorsville);
assert.ok(resolvedChancellorsville.battleCampaign.results.chancellorsville_maneuver, 'Chancellorsville should write to the battle ledger');
assert.equal(battleForScenario(chancellorsvilleScenario, resolvedChancellorsville), null, 'a completed Chancellorsville battle must not reopen');

const wildernessState = createFreshCampaignState(1864, wildernessScenario.id);
wildernessState.currentTurn = 15;
const wildernessBattle = battleForScenario(wildernessScenario, wildernessState);
assert.equal(wildernessBattle?.id, 'wilderness');
const wildernessA = new CivilWarBattleEngine('wilderness', wildernessState, 'option_b');
const wildernessB = new CivilWarBattleEngine('wilderness', wildernessState, 'option_b');
assert.match(wildernessA.snapshot().fieldStatus.label, /Texans in 10/);
assert.equal(wildernessA.snapshot().commanderStatus, 'held by the Texans');
for (let index = 0; index < 240; index += 1) {
  wildernessA.tick(0.05);
  wildernessB.tick(0.05);
}
assert.equal(wildernessA.snapshot().formations.find((formation) => formation.id === 'texas-brigade')?.active, true, 'the Texas Brigade should reach the line first');
assert.equal(wildernessA.snapshot().formations.find((formation) => formation.id === 'longstreet-first-corps')?.active, false, 'Longstreet should still be approaching at field minute 12');
assert.match(wildernessA.snapshot().fieldStatus.label, /Longstreet in 6/);
for (let index = 0; index < 140; index += 1) {
  wildernessA.tick(0.05);
  wildernessB.tick(0.05);
}
assert.deepEqual(wildernessA.snapshot(), wildernessB.snapshot(), 'the Wilderness reinforcement crisis must remain deterministic');
assert.equal(wildernessA.snapshot().formations.find((formation) => formation.id === 'longstreet-first-corps')?.active, true, 'Longstreet should reach the field on schedule');
assert.equal(wildernessA.snapshot().fieldStatus.label, 'First Corps on field');
assert.ok(wildernessA.snapshot().score >= 8, 'waiting for Longstreet should earn the objective bonus');
for (let index = 0; index < 2200; index += 1) {
  wildernessA.tick(0.05);
  wildernessB.tick(0.05);
}
assert.deepEqual(wildernessA.snapshot(), wildernessB.snapshot(), 'the complete Wilderness holding action must remain deterministic');
assert.notEqual(wildernessA.snapshot().outcome, 'undecided', 'the Wilderness holding action should always resolve');

const wildernessEarly = new CivilWarBattleEngine('wilderness', wildernessState, 'option_b');
wildernessEarly.order('hill-heth-line', 'advance');
assert.equal(wildernessEarly.prematureCommitment, true, 'advancing Hill before Longstreet should mark a premature commitment');
assert.equal(wildernessEarly.snapshot().fieldStatus.label, 'Line committed early');
assert.ok(wildernessEarly.snapshot().events.some((event) => event.type === 'warning'), 'the premature counterstroke should be recorded');
const roadUnit = wildernessEarly.state.find((formation) => formation.id === 'hill-heth-line');
assert.equal(wildernessEarly.terrainMovementMultiplier(roadUnit), 1.12, 'the Orange Plank Road band should avoid the woods movement penalty');
roadUnit.y = 780;
roadUnit.x = 1200;
assert.equal(wildernessEarly.terrainMovementMultiplier(roadUnit), 0.72, 'off-road movement should be slowed by the Wilderness thickets');

const wildernessLee = new CivilWarBattleEngine('wilderness', wildernessState, 'option_c');
for (const formation of wildernessLee.state.filter((unit) => unit.wildernessFront)) formation.strength *= 0.84;
wildernessLee.tick(0.05);
assert.equal(wildernessLee.snapshot().commanderStatus, 'nearly lost at the line', "heavy early losses should expose Lee before the Texans arrive");
assert.ok(wildernessLee.snapshot().events.some((event) => event.type === 'command'), "Lee's exposure should be recorded");
for (let index = 0; index < 300; index += 1) wildernessLee.tick(0.05);
assert.equal(wildernessLee.snapshot().commanderStatus, 'pulled back by the Texans', 'the Texas Brigade arrival should remove Lee from the immediate front');

const wildernessWithdrawal = new CivilWarBattleEngine('wilderness', wildernessState, 'option_d');
wildernessWithdrawal.move('hill-heth-line', { x: 790, y: 820 });
assert.equal(wildernessWithdrawal.prematureCommitment, false, 'an ordered withdrawal should not be treated as a premature counterattack');
const withdrawalStart = wildernessWithdrawal.state.find((formation) => formation.id === 'hill-heth-line').y;
wildernessWithdrawal.order('hill-heth-line', 'withdraw');
for (let index = 0; index < 40; index += 1) wildernessWithdrawal.tick(0.05);
assert.ok(wildernessWithdrawal.state.find((formation) => formation.id === 'hill-heth-line').y > withdrawalStart, 'a withdrawing formation must keep moving while inside enemy range');

const delegatedWilderness = delegateBattle(wildernessState, wildernessBattle, 'option_b');
assert.equal(delegatedWilderness.commanderStatus, 'held by the Texans');
assert.ok(['costly-win', 'disciplined-withdrawal'].includes(delegatedWilderness.result), 'sound Wilderness delegation should preserve the army');
const resolvedWilderness = applyBattleResolution(wildernessState, delegatedWilderness);
assert.ok(resolvedWilderness.battleCampaign.results.wilderness_opening, 'the Wilderness should write to the battle ledger');
assert.equal(battleForScenario(wildernessScenario, resolvedWilderness), null, 'a completed Wilderness battle must not reopen');

const cedarCreekState = createFreshCampaignState(1864, cedarCreekScenario.id);
cedarCreekState.currentTurn = 23;
const cedarCreekBattle = battleForScenario(cedarCreekScenario, cedarCreekState);
assert.equal(cedarCreekBattle?.id, 'cedar_creek');
const cedarCreekA = new CivilWarBattleEngine('cedar_creek', cedarCreekState, 'option_a');
const cedarCreekB = new CivilWarBattleEngine('cedar_creek', cedarCreekState, 'option_a');
for (const formationId of ['gordon-division', 'ramseur-division', 'kershaw-division', 'wharton-division']) {
  cedarCreekA.order(formationId, 'advance');
  cedarCreekB.order(formationId, 'advance');
}
for (let index = 0; index < 1800 && cedarCreekA.snapshot().outcome === 'undecided'; index += 1) {
  cedarCreekA.tick(0.05);
  cedarCreekB.tick(0.05);
}
assert.deepEqual(cedarCreekA.snapshot(), cedarCreekB.snapshot(), 'Cedar Creek must remain deterministic');
assert.equal(cedarCreekA.snapshot().surpriseState, 'triggered', 'a prompt dawn attack should break into the Union camps');
assert.ok(['decisive-win', 'costly-win'].includes(cedarCreekA.snapshot().outcome), 'a disciplined prompt attack must be able to convert the morning surprise');
assert.equal(cedarCreekA.snapshot().formations.find((formation) => formation.id === 'sheridan-rally-line')?.active, false, 'a converted morning victory should resolve before Sheridan reforms the army');

const cedarCreekHistorical = new CivilWarBattleEngine('cedar_creek', cedarCreekState, 'option_b');
for (const formationId of ['gordon-division', 'ramseur-division', 'kershaw-division', 'wharton-division']) cedarCreekHistorical.order(formationId, 'advance');
for (let index = 0; index < 1120; index += 1) cedarCreekHistorical.tick(0.05);
assert.equal(cedarCreekHistorical.snapshot().disciplineBroken, true, 'the historical pause should erode Confederate cohesion among the captured camps');
assert.equal(cedarCreekHistorical.snapshot().formations.find((formation) => formation.id === 'sheridan-rally-line')?.active, true, 'Sheridan should return on the historical timetable');
assert.equal(cedarCreekHistorical.snapshot().fieldStatus.label, 'Union counterattack');

const cedarCreekWithdrawal = new CivilWarBattleEngine('cedar_creek', cedarCreekState, 'option_c');
for (const formationId of ['gordon-division', 'ramseur-division', 'kershaw-division', 'wharton-division']) cedarCreekWithdrawal.order(formationId, 'withdraw');
for (let index = 0; index < 1000 && cedarCreekWithdrawal.snapshot().outcome === 'undecided'; index += 1) cedarCreekWithdrawal.tick(0.05);
assert.equal(cedarCreekWithdrawal.snapshot().outcome, 'disciplined-withdrawal', 'the early withdrawal route should preserve the army and captured supply train');

assert.equal(delegateBattle(cedarCreekState, cedarCreekBattle, 'option_b').result, 'defeat', 'delegating the historical pause should preserve the historical defeat');
assert.equal(delegateBattle(cedarCreekState, cedarCreekBattle, 'option_c').result, 'disciplined-withdrawal', 'delegating the early withdrawal should preserve its bounded result');
const resolvedCedarCreek = applyBattleResolution(cedarCreekState, delegateBattle(cedarCreekState, cedarCreekBattle, 'option_c'));
assert.ok(resolvedCedarCreek.battleCampaign.results.cedar_creek, 'Cedar Creek should write to the battle ledger');
assert.equal(battleForScenario(cedarCreekScenario, resolvedCedarCreek), null, 'a completed Cedar Creek battle must not reopen');

const gettysburgState = createFreshCampaignState(1863, gettysburgScenario.id);
gettysburgState.currentTurn = 13;
const gettysburgBattle = battleForScenario(gettysburgScenario, gettysburgState);
assert.equal(gettysburgBattle?.id, 'gettysburg');
const gettysburgA = new CivilWarBattleEngine('gettysburg', gettysburgState, 'option_a');
const gettysburgB = new CivilWarBattleEngine('gettysburg', gettysburgState, 'option_a');
for (const formationId of ['pickett-division', 'pettigrew-division', 'trimble-division']) {
  gettysburgA.order(formationId, 'advance');
  gettysburgB.order(formationId, 'advance');
}
for (let index = 0; index < 1800 && gettysburgA.snapshot().outcome === 'undecided'; index += 1) {
  gettysburgA.tick(0.05);
  gettysburgB.tick(0.05);
}
assert.deepEqual(gettysburgA.snapshot(), gettysburgB.snapshot(), 'the Gettysburg assault must remain deterministic');
assert.equal(gettysburgA.snapshot().assaultState, 'engaged', 'coordinated divisions should cross the Emmitsburg Road inside the assault window');
assert.ok(['decisive-win', 'costly-win'].includes(gettysburgA.snapshot().outcome), 'coordinating all three assault divisions must make a counterfactual breakthrough possible');

const gettysburgWithdrawal = new CivilWarBattleEngine('gettysburg', gettysburgState, 'option_c');
for (const formationId of ['pickett-division', 'pettigrew-division', 'trimble-division', 'wilcox-support']) gettysburgWithdrawal.order(formationId, 'withdraw');
for (let index = 0; index < 1000 && gettysburgWithdrawal.snapshot().outcome === 'undecided'; index += 1) gettysburgWithdrawal.tick(0.05);
assert.equal(gettysburgWithdrawal.snapshot().outcome, 'disciplined-withdrawal', 'the orderly retreat option should preserve the army rather than demand an impossible victory');

const gettysburgJacksonState = createFreshCampaignState(1863, gettysburgJacksonScenario.id);
gettysburgJacksonState.currentTurn = 13;
const gettysburgJacksonBattle = battleForScenario(gettysburgJacksonScenario, gettysburgJacksonState);
assert.equal(gettysburgJacksonBattle?.id, 'gettysburg_jackson');
const gettysburgJacksonA = new CivilWarBattleEngine('gettysburg_jackson', gettysburgJacksonState, 'option_a');
const gettysburgJacksonB = new CivilWarBattleEngine('gettysburg_jackson', gettysburgJacksonState, 'option_a');
const jacksonObjectives = {
  'jackson-rodes-gettysburg': { x: 1050, y: 380 },
  'jackson-early-gettysburg': { x: 1270, y: 330 },
  'jackson-johnson-gettysburg': { x: 1180, y: 390 },
  'hill-support-gettysburg': { x: 920, y: 430 },
};
for (const [formationId, point] of Object.entries(jacksonObjectives)) {
  gettysburgJacksonA.move(formationId, point);
  gettysburgJacksonB.move(formationId, point);
}
for (let index = 0; index < 1800 && gettysburgJacksonA.snapshot().outcome === 'undecided'; index += 1) {
  gettysburgJacksonA.tick(0.05);
  gettysburgJacksonB.tick(0.05);
}
assert.deepEqual(gettysburgJacksonA.snapshot(), gettysburgJacksonB.snapshot(), 'the Jackson-survives Gettysburg field must remain deterministic');
assert.equal(gettysburgJacksonA.snapshot().surpriseState, 'triggered', 'Jackson should be able to reach the heights before the Union line closes');
assert.equal(gettysburgJacksonA.snapshot().outcome, 'decisive-win', 'only a genuinely decisive Jackson result should satisfy the recognition gate');
assert.equal(gettysburgJacksonA.snapshot().formations.find((formation) => formation.id === 'hancock-arrival-gettysburg')?.active, false, 'a decisive Jackson result should resolve before Hancock restores the fishhook');

assert.equal(battleChoiceSuccessModifier(gettysburgBattle, 'option_a', 'costly-win', 0.1), 1, 'a historical breakthrough should replace the authored success roll');
assert.equal(battleChoiceSuccessModifier(gettysburgJacksonBattle, 'option_a', 'costly-win', 0.1), -1, 'a merely costly Jackson success must not unlock recognition');
assert.equal(battleChoiceSuccessModifier(gettysburgJacksonBattle, 'option_a', 'decisive-win', 0.1), 1, 'a decisive Jackson victory should satisfy the authored success gate');
const resolvedGettysburgJackson = applyBattleResolution(gettysburgJacksonState, {
  battleId: gettysburgJacksonBattle.id,
  scenarioId: gettysburgJacksonBattle.scenarioId,
  result: 'decisive-win',
  score: gettysburgJacksonA.snapshot().score,
  confederateLossRate: gettysburgJacksonA.snapshot().confederateLossRate,
  unionLossRate: gettysburgJacksonA.snapshot().unionLossRate,
});
assert.ok(resolvedGettysburgJackson.battleCampaign.results.gettysburg_with_jackson, 'the Jackson-survives battle should write to its authored scenario ledger');
assert.equal(battleForScenario(gettysburgJacksonScenario, resolvedGettysburgJackson), null, 'a completed alternate Gettysburg battle must not reopen');

const chickamaugaState = createFreshCampaignState(1863, chickamaugaScenario.id);
chickamaugaState.currentTurn = 14;
const chickamaugaBattle = battleForScenario(chickamaugaScenario, chickamaugaState);
assert.equal(chickamaugaBattle?.id, 'chickamauga');
const chickamaugaA = new CivilWarBattleEngine('chickamauga', chickamaugaState, 'option_b');
const chickamaugaB = new CivilWarBattleEngine('chickamauga', chickamaugaState, 'option_b');
const chickamaugaObjectives = {
  'bushrod-johnson-column': { x: 760, y: 320 },
  'hindman-chickamauga': { x: 920, y: 325 },
  'kershaw-chickamauga': { x: 1070, y: 335 },
};
for (const [formationId, point] of Object.entries(chickamaugaObjectives)) {
  chickamaugaA.move(formationId, point);
  chickamaugaB.move(formationId, point);
}
for (let index = 0; index < 1800 && chickamaugaA.snapshot().outcome === 'undecided'; index += 1) {
  chickamaugaA.tick(0.05);
  chickamaugaB.tick(0.05);
}
assert.deepEqual(chickamaugaA.snapshot(), chickamaugaB.snapshot(), 'the Chickamauga breakthrough must remain deterministic');
assert.equal(chickamaugaA.snapshot().gapState, 'breached', 'Longstreet should be able to pass through the Brotherton gap');
assert.equal(chickamaugaA.snapshot().exploitationState, 'exploited', 'a concentrated column should be able to exploit beyond the first Union line');
assert.equal(chickamaugaA.snapshot().outcome, 'decisive-win', 'reaching Dyer Field before Thomas forms should produce the rare decisive result');
assert.equal(chickamaugaA.snapshot().formations.find((formation) => formation.id === 'horseshoe-ridge-line')?.active, false, 'decisive exploitation should resolve before the Horseshoe Ridge rally');

const chickamaugaHistorical = new CivilWarBattleEngine('chickamauga', chickamaugaState, 'option_b');
for (const formationId of ['bushrod-johnson-column', 'hindman-chickamauga', 'kershaw-chickamauga']) chickamaugaHistorical.order(formationId, 'advance');
for (let index = 0; index < 1800 && chickamaugaHistorical.snapshot().outcome === 'undecided'; index += 1) chickamaugaHistorical.tick(0.05);
assert.equal(chickamaugaHistorical.snapshot().gapState, 'breached', 'the historical concentrated attack should break the Union center');
assert.equal(chickamaugaHistorical.snapshot().outcome, 'costly-win', 'failing to exploit beyond the breakthrough should preserve the historical bounded victory');
assert.equal(delegateBattle(chickamaugaState, chickamaugaBattle, 'option_a').result, 'defeat', 'delegating disconnected frontal assaults should preserve their poor tactical result');
assert.equal(delegateBattle(chickamaugaState, chickamaugaBattle, 'option_b').result, 'decisive-win', 'delegating Longstreet concentration should preserve the historical breakthrough');
const resolvedChickamauga = applyBattleResolution(chickamaugaState, delegateBattle(chickamaugaState, chickamaugaBattle, 'option_b'));
assert.ok(resolvedChickamauga.battleCampaign.results.chickamauga, 'Chickamauga should write to the battle ledger');
assert.equal(battleForScenario(chickamaugaScenario, resolvedChickamauga), null, 'a completed Chickamauga battle must not reopen');

const coldHarborState = createFreshCampaignState(1864, coldHarborScenario.id);
coldHarborState.currentTurn = 18;
const coldHarborBattle = battleForScenario(coldHarborScenario, coldHarborState);
assert.equal(coldHarborBattle?.id, 'cold_harbor');
const coldHarborA = new CivilWarBattleEngine('cold_harbor', coldHarborState, 'option_b');
const coldHarborB = new CivilWarBattleEngine('cold_harbor', coldHarborState, 'option_b');
for (let index = 0; index < 2600 && coldHarborA.snapshot().outcome === 'undecided'; index += 1) {
  coldHarborA.tick(0.05);
  coldHarborB.tick(0.05);
}
assert.deepEqual(coldHarborA.snapshot(), coldHarborB.snapshot(), 'the Cold Harbor defense must remain deterministic');
assert.equal(coldHarborA.snapshot().coldHarborAssaultState, 'repulsed', 'the prepared works should break the main Federal assault');
assert.equal(coldHarborA.snapshot().entrenchmentState, 'prepared', 'the defensive choice should retain the earthwork advantage');
assert.equal(coldHarborA.snapshot().outcome, 'decisive-win', 'holding the works with low losses should produce the strongest defensive result');

const coldHarborCounterattack = new CivilWarBattleEngine('cold_harbor', coldHarborState, 'option_a');
for (const formationId of ['kershaw-cold-harbor', 'hoke-cold-harbor', 'field-cold-harbor', 'breckinridge-cold-harbor']) coldHarborCounterattack.order(formationId, 'advance');
for (let index = 0; index < 2600 && coldHarborCounterattack.snapshot().outcome === 'undecided'; index += 1) coldHarborCounterattack.tick(0.05);
assert.equal(coldHarborCounterattack.snapshot().entrenchmentState, 'abandoned', 'the counterattack should surrender the earthwork defense');
assert.equal(coldHarborCounterattack.snapshot().outcome, 'defeat', 'a routine counterattack should not outperform the prepared defensive line');

const coldHarborTransfer = new CivilWarBattleEngine('cold_harbor', coldHarborState, 'option_d');
for (const formationId of ['breckinridge-cold-harbor', 'hill-reserve-cold-harbor']) coldHarborTransfer.order(formationId, 'withdraw');
for (let index = 0; index < 1800 && coldHarborTransfer.snapshot().outcome === 'undecided'; index += 1) coldHarborTransfer.tick(0.05);
assert.equal(coldHarborTransfer.snapshot().transferState, 'transferred', 'the Petersburg-bound formations should clear the trench screen');
assert.equal(coldHarborTransfer.snapshot().outcome, 'disciplined-withdrawal', 'the operational pivot should preserve the army rather than require a battlefield annihilation');
assert.equal(delegateBattle(coldHarborState, coldHarborBattle, 'option_a').result, 'defeat', 'delegating the counterattack should preserve its tactical danger');
assert.equal(delegateBattle(coldHarborState, coldHarborBattle, 'option_b').result, 'decisive-win', 'delegating the prepared defense should preserve its battlefield advantage');
assert.equal(delegateBattle(coldHarborState, coldHarborBattle, 'option_d').result, 'disciplined-withdrawal', 'delegating the Petersburg pivot should preserve its operational objective');
const resolvedColdHarbor = applyBattleResolution(coldHarborState, delegateBattle(coldHarborState, coldHarborBattle, 'option_b'));
assert.ok(resolvedColdHarbor.battleCampaign.results.cold_harbor, 'Cold Harbor should write to the battle ledger');
assert.equal(battleForScenario(coldHarborScenario, resolvedColdHarbor), null, 'a completed Cold Harbor battle must not reopen');

const petersburgState = createFreshCampaignState(1864, petersburgScenario.id);
petersburgState.currentTurn = 20;
const petersburgBattle = battleForScenario(petersburgScenario, petersburgState);
assert.equal(petersburgBattle?.id, 'petersburg');

const petersburgMahoneA = new CivilWarBattleEngine('petersburg', petersburgState, 'option_a');
const petersburgMahoneB = new CivilWarBattleEngine('petersburg', petersburgState, 'option_a');
let mahoneCommitted = false;
for (let index = 0; index < 2400 && petersburgMahoneA.snapshot().outcome === 'undecided'; index += 1) {
  if (!mahoneCommitted && petersburgMahoneA.snapshot().time > 16) {
    for (const engine of [petersburgMahoneA, petersburgMahoneB]) {
      engine.move('mahone-virginia-brigade', { x: 680, y: 545 });
      engine.move('mahone-alabama-brigade', { x: 1000, y: 560 });
    }
    mahoneCommitted = true;
  }
  petersburgMahoneA.tick(0.05);
  petersburgMahoneB.tick(0.05);
}
assert.deepEqual(petersburgMahoneA.snapshot(), petersburgMahoneB.snapshot(), 'Mahone counterattack timing must remain deterministic');
assert.equal(petersburgMahoneA.snapshot().craterState, 'sealed', 'Mahone should seal the breach when both brigades reach the crater shoulders');
assert.equal(petersburgMahoneA.snapshot().outcome, 'decisive-win', 'a coordinated Mahone counterattack should earn the strongest Crater result');

const petersburgPassive = new CivilWarBattleEngine('petersburg', petersburgState, 'option_a');
for (let index = 0; index < 2600 && petersburgPassive.snapshot().outcome === 'undecided'; index += 1) petersburgPassive.tick(0.05);
assert.equal(petersburgPassive.snapshot().craterState, 'overrun', 'failing to commit Mahone should leave the mine breach open');
assert.equal(petersburgPassive.snapshot().outcome, 'defeat', 'an unsealed breach should expose the Petersburg heights');

const petersburgContainment = new CivilWarBattleEngine('petersburg', petersburgState, 'option_b');
for (let index = 0; index < 2800 && petersburgContainment.snapshot().outcome === 'undecided'; index += 1) petersburgContainment.tick(0.05);
assert.equal(petersburgContainment.snapshot().craterState, 'contained', 'the secondary works should be able to contain the Union lodgment');
assert.equal(petersburgContainment.snapshot().outcome, 'costly-win', 'passive containment should preserve Petersburg without matching Mahone decisive result');

const petersburgSortie = new CivilWarBattleEngine('petersburg', petersburgState, 'option_c');
petersburgSortie.move('mahone-virginia-brigade', { x: 330, y: 190 });
petersburgSortie.move('mahone-alabama-brigade', { x: 1275, y: 200 });
let sortieWithdrawing = false;
for (let index = 0; index < 2600 && petersburgSortie.snapshot().outcome === 'undecided'; index += 1) {
  if (!sortieWithdrawing && petersburgSortie.snapshot().sortieState === 'raided') {
    petersburgSortie.move('mahone-virginia-brigade', { x: 650, y: 820 });
    petersburgSortie.move('mahone-alabama-brigade', { x: 1000, y: 830 });
    sortieWithdrawing = true;
  }
  petersburgSortie.tick(0.05);
}
assert.deepEqual([...petersburgSortie.snapshot().sortieTargetsHit].sort(), ['union-engineer-depot-east', 'union-siege-train-west'], 'the night sortie must reach both siege sectors');
assert.equal(petersburgSortie.snapshot().sortieState, 'withdrawn', 'the sortie must return behind the covered way after the raid');
assert.equal(petersburgSortie.snapshot().outcome, 'costly-win', 'a successful bounded raid should not become a fictitious siege-breaking victory');

const petersburgMines = new CivilWarBattleEngine('petersburg', petersburgState, 'option_d');
for (let index = 0; index < 2600 && petersburgMines.snapshot().outcome === 'undecided'; index += 1) petersburgMines.tick(0.05);
assert.equal(petersburgMines.snapshot().mineState, 'detonated', 'the experimental mine branch should trigger only after the assault enters the marked lanes');
assert.equal(petersburgMines.snapshot().craterState, 'sealed', 'mine shock plus the defensive line should seal the breach');
assert.equal(petersburgMines.snapshot().outcome, 'decisive-win', 'a well-timed mine-channel defense should earn its alternate-history result');

assert.equal(delegateBattle(petersburgState, petersburgBattle, 'option_a').result, 'decisive-win', 'delegating Mahone should preserve the historical counterattack advantage');
assert.equal(delegateBattle(petersburgState, petersburgBattle, 'option_b').result, 'costly-win', 'delegating containment should preserve its bounded defensive result');
assert.equal(delegateBattle(petersburgState, petersburgBattle, 'option_c').result, 'costly-win', 'delegating the night sortie should preserve its bounded objective');
assert.equal(delegateBattle(petersburgState, petersburgBattle, 'option_d').result, 'decisive-win', 'delegating the mine-channel defense should preserve its engineered advantage');
const resolvedPetersburg = applyBattleResolution(petersburgState, delegateBattle(petersburgState, petersburgBattle, 'option_a'));
assert.ok(resolvedPetersburg.battleCampaign.results.petersburg_siege, 'Petersburg should write to the battle ledger');
assert.equal(battleForScenario(petersburgScenario, resolvedPetersburg), null, 'a completed Petersburg battle must not reopen');

const oldSnapshot = { ...createCampaignSnapshot(state, scenario), version: 2 };
oldSnapshot.state.rulesVersion = 1;
oldSnapshot.state.battleRulesVersion = 1;
delete oldSnapshot.state.battleCampaign;
const migrated = restoreCampaignFromSnapshot(oldSnapshot, [scenario]);
assert.equal(migrated.migratedFromVersion, 2);
assert.deepEqual(migrated.state.battleCampaign, { version: 1, results: {} }, 'version-2 saves should gain an empty battle ledger');

const staleActorSnapshot = createCampaignSnapshot(
  { ...chancellorsvilleState, actor: 'Major Robert Anderson', roleLabel: 'Fort Commander' },
  chancellorsvilleScenario,
);
const restoredChancellorsville = restoreCampaignFromSnapshot(staleActorSnapshot, [chancellorsvilleScenario]);
assert.equal(restoredChancellorsville.state.actor, 'General Robert E. Lee', 'save restore should synchronize the actor to the active scenario');
assert.equal(restoredChancellorsville.state.roleLabel, 'Commander of Northern Virginia', 'save restore should synchronize the role to the active scenario');

console.log('Civil War battle engine checks passed.');
