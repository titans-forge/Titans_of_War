import test from 'node:test';
import assert from 'node:assert/strict';
import {CivilWarBattleEngine} from '../src/battle/civilWarEngine.js';
import {BATTLE_SCENARIOS,PRACTICE_BATTLES,battleForScenario,delegateBattle} from '../src/game/battles.js';
import {createFreshCampaignState,createCampaignSnapshot,CAMPAIGN_STORAGE_KEY} from '../src/game/campaignStorage.js';
import {createPracticeState,practiceAmmunitionLabel} from '../src/game/practiceConditions.js';
import {saveFieldCheckpoint,loadFieldCheckpoint,FIELD_CHECKPOINT_KEY} from '../src/game/fieldCheckpoint.js';
import {forecastCampaignChoice} from '../src/game/simulationEngine.js';
for(const battle of Object.values(BATTLE_SCENARIOS))test(`${battle.id}: ammunition presets include reserves and apply campaign readiness and preserve enemy stocks`,()=>{
 const scene={id:battle.scenarioId,turn:5};
 const full=new CivilWarBattleEngine(battle.id,createPracticeState(scene),'option_a');
 const old=new CivilWarBattleEngine(battle.id,{...createPracticeState(scene),rulesVersion:1},'option_a');
 assert.deepEqual(full.state,old.state,'default field setup remains unchanged');
 for(const [preset,multiplier] of [['limited',.675],['depleted',.35]]) {
  const state=createPracticeState(scene,'flank',preset),e=new CivilWarBattleEngine(battle.id,state,'option_a');
  assert.equal(state.currentTurn,5);assert.equal(state.enemyDoctrine,'flank');
  e.state.forEach((u,i)=>{
   const baseline=full.state[i];if(u.side==='confederate')assert.ok(u.strength<baseline.strength&&u.strength>baseline.strength*.95);else assert.equal(u.strength,baseline.strength);assert.equal(u.morale,baseline.morale);
   assert.equal(u.initialAmmunition,u.side==='confederate'?Math.max(1,Math.round(baseline.initialAmmunition*multiplier)):baseline.initialAmmunition);
   assert.equal(u.arrivalTime,baseline.arrivalTime);
  });
 }
});
test('practice setup creates independent state and labels exactly the engine allocation',()=>{
 const a=createPracticeState({id:'x',turn:1}),b=createPracticeState({id:'x',turn:1},'reserve','depleted');
 assert.equal(practiceAmmunitionLabel(a),'100% starting ammunition');assert.equal(practiceAmmunitionLabel(b),'35% starting ammunition');
 b.metrics.munitions=4;assert.equal(a.metrics.munitions,80);
 assert.throws(()=>createPracticeState({id:'x',turn:1},'reserve','unknown'),/Unknown/);
});
test('a depleted practice save resumes with identical ammunition and untouched campaign save',()=>{
 const campaign=createFreshCampaignState(1861),raw=JSON.stringify(createCampaignSnapshot(campaign,null));
 const map=new Map([[CAMPAIGN_STORAGE_KEY,raw]]),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
 const battle=Object.values(BATTLE_SCENARIOS)[0],practice=createPracticeState({id:battle.scenarioId,turn:4},'depth','depleted');
 const e=new CivilWarBattleEngine(battle.id,practice,'option_b');e.tick(.2);
 saveFieldCheckpoint({battle,choiceId:'option_b',practice:true,practiceState:practice},e.checkpoint(),practice,storage);
 const loaded=loadFieldCheckpoint(storage);assert.equal(loaded.error,null);assert.equal(loaded.pending.practice,true);
 const resumed=CivilWarBattleEngine.fromCheckpoint(loaded.pending.checkpoint,battle.id,loaded.pending.resumeState,'option_b');
 assert.deepEqual(resumed.checkpoint(),e.checkpoint());assert.equal(practiceAmmunitionLabel(loaded.pending.resumeState),'35% starting ammunition');
 assert.equal(map.get(CAMPAIGN_STORAGE_KEY),raw);
});
test('Antietam suspends and resumes as a practice field without changing campaign data', () => {
 const scenario = {id:'antietam', turn:8};
 const campaign = createFreshCampaignState(1862, scenario.id);
 const raw = JSON.stringify(createCampaignSnapshot(campaign, null));
 const values = new Map([[CAMPAIGN_STORAGE_KEY, raw]]);
 const storage = {getItem:key => values.get(key) || null, setItem:(key, value) => values.set(key, value)};
 const battle = PRACTICE_BATTLES.antietam;
 const practice = createPracticeState(scenario, 'reserve', 'limited');
 const engine = new CivilWarBattleEngine(battle.id, practice, 'option_a');
 engine.tick(12);
 const checkpoint = engine.checkpoint();
 saveFieldCheckpoint({battle, choiceId:'option_a', practice:true}, checkpoint, practice, storage);
 const loaded = loadFieldCheckpoint(storage);
 assert.equal(loaded.error, null);
 assert.equal(loaded.pending.battle, battle);
 assert.deepEqual(CivilWarBattleEngine.fromCheckpoint(loaded.pending.checkpoint, battle.id, loaded.pending.resumeState, 'option_a').checkpoint(), checkpoint);
 assert.equal(battleForScenario(scenario, campaign, 'option_c'), null);
 assert.notEqual(battleForScenario(scenario, campaign, 'option_a'), battle);
 assert.equal(values.get(CAMPAIGN_STORAGE_KEY), raw);
});

test('Antietam routes, forecasts, and restores only its two current campaign field orders', () => {
 const scenario = {id:'antietam', turn:8};
 const campaign = {...createFreshCampaignState(1862, scenario.id), currentTurn:scenario.turn};
 const raw = JSON.stringify(createCampaignSnapshot(campaign, scenario));
 const values = new Map([[CAMPAIGN_STORAGE_KEY, raw]]);
 const storage = {getItem:key => values.get(key) || null, setItem:(key, value) => values.set(key, value)};
 for (const [choiceId, success] of [['option_a', 'costly-win'], ['option_b', 'disciplined-withdrawal']]) {
  const battle = battleForScenario(scenario, campaign, choiceId);
  assert.equal(battle.id, 'antietam');
  assert.notEqual(battle, PRACTICE_BATTLES.antietam);
  assert.equal(battleForScenario(scenario, {...campaign, battleRulesVersion:17}, choiceId), null);
  const forecast = forecastCampaignChoice(campaign, scenario, {id:choiceId, effects:{metrics:{}, shards:{}}});
  assert.deepEqual(forecast.outcomes.map(option => option.result), [success, 'defeat', 'rout']);
  const staff = delegateBattle({...campaign, metrics:{militaryStrength:96, munitions:95, foodSupply:95, publicMorale:95, treasury:95}}, battle, choiceId);
  assert.equal(staff.choiceId, choiceId);
  assert.equal(staff.result, success);
  assert.equal(staff.assessment.source, 'delegated');
  const engine = new CivilWarBattleEngine(battle.id, campaign, choiceId);
  engine.tick(12);
  const checkpoint = engine.checkpoint();
  const pending = {battle, choiceId, baseState:campaign};
  saveFieldCheckpoint(pending, checkpoint, campaign, storage);
  const loaded = loadFieldCheckpoint(storage);
  assert.equal(loaded.error, null);
  assert.equal(loaded.pending.battle, battle);
  assert.deepEqual(loaded.pending.checkpoint, checkpoint);
  saveFieldCheckpoint({...pending, choiceId:'option_c'}, checkpoint, campaign, storage);
  const unsupported = values.get(FIELD_CHECKPOINT_KEY);
  assert.match(loadFieldCheckpoint(storage).error, /not supported/);
  assert.equal(values.get(FIELD_CHECKPOINT_KEY), unsupported);
 }
 for (const choiceId of ['option_c', 'option_d']) {
  assert.equal(battleForScenario(scenario, campaign, choiceId), null);
  const forecast = forecastCampaignChoice(campaign, scenario, {id:choiceId, effects:{metrics:{}, shards:{}}});
  assert.deepEqual(forecast.outcomes.map(option => option.result), ['certain']);
 }
 assert.equal(values.get(CAMPAIGN_STORAGE_KEY), raw);
});
