import test from 'node:test';
import assert from 'node:assert/strict';
import {CivilWarBattleEngine} from '../src/battle/civilWarEngine.js';
import {BATTLE_SCENARIOS} from '../src/game/battles.js';
import {createFreshCampaignState,createCampaignSnapshot,CAMPAIGN_STORAGE_KEY} from '../src/game/campaignStorage.js';
import {createPracticeState,practiceAmmunitionLabel} from '../src/game/practiceConditions.js';
import {saveFieldCheckpoint,loadFieldCheckpoint} from '../src/game/fieldCheckpoint.js';
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
