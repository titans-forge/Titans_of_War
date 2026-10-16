import assert from 'node:assert/strict';
import {test} from 'node:test';
import {writeFileSync} from 'node:fs';
import {createServer} from 'vite';
const vite = await createServer({server:{middlewareMode:true},appType:'custom'});
const {STATIC_SCENARIOS} = await vite.ssrLoadModule('/src/game/scenarios.js');
await vite.close();
import {createFreshCampaignState,createCampaignSnapshot,restoreCampaignFromSnapshot} from '../src/game/campaignStorage.js';
import {getCampaignScenario,selectRecoveryAllocation,commitRecoveryAllocation} from '../src/game/campaignSupply.js';
import {getChoiceAvailability} from '../src/game/simulationEngine.js';
import {advanceCampaignTurn,getScenarioForState} from '../src/game/headlessCampaign.js';
import {battleForScenario,delegateBattle,applyBattleResolution,battleChoiceSuccessModifier} from '../src/game/battles.js';
import {createAfterAction,isAfterActionReport} from '../src/game/campaignExperience.js';
import {createCampaignContinuity,isCampaignContinuity} from '../src/game/campaignContinuity.js';
const records=[];
const gameplay=s=>JSON.parse(JSON.stringify(Object.fromEntries(['metrics','history','currentTurn','nextScenarioId','scenarioId','gameOver','shards','campaignEconomy','battleCampaign','divergenceIndex'].map(k=>[k,s[k]]))));
for(const difficulty of ['story','standard'])for(const seed of [1861,1862,1863])for(const proposer of ['hotspur','fox','wolf','sovereign']) {
 test(`${difficulty}/${seed}/${proposer}: complete route survives a debrief reload at every decision`,()=>{
  let a=createFreshCampaignState(seed,STATIC_SCENARIOS[0].id,{difficulty}),b=structuredClone(a),steps=0,battles=0,handoffs=0,crises=0;
  while(!a.gameOver && steps<80){
   const scene=getCampaignScenario(a,getScenarioForState(a,STATIC_SCENARIOS));
   const legal=scene.choices.filter(c=>!getChoiceAvailability(c,scene,a).locked);
   assert.ok(legal.length,`No available choice at ${scene.id}`);
   const choice=legal.find(c=>c.proposer===proposer)||legal[0];
   const resolve=state=>{
    const before=state;
    state=selectRecoveryAllocation(state,state.metrics.foodSupply<30?'emergency':state.metrics.munitions<40?'purchase':'none');
    const battle=battleForScenario(scene,state);let base=null,postBattle=null,modifier=0;
    if(battle){base=commitRecoveryAllocation(state);const field=delegateBattle(base,battle,choice.id);state=applyBattleResolution(base,field);postBattle=state;modifier=battleChoiceSuccessModifier(battle,choice.id,field.result);}
    const result=advanceCampaignTurn(state,scene,choice,STATIC_SCENARIOS,modifier);
    const report=createAfterAction(before,result.state,result.historyEntry,result.nextScenario,postBattle,base);
    return {...result,report,battle};
   };
   const x=resolve(a),y=resolve(b);assert.deepEqual(gameplay(x.state),gameplay(y.state));
   assert.ok(isAfterActionReport(y.report));assert.ok(isCampaignContinuity(y.report.continuity));
   assert.equal(y.report.continuity.next?.actor??null,y.state.gameOver?null:y.nextScenario?.actor||'');
   const saved=createCampaignSnapshot({...y.state,pendingDebrief:y.report},y.nextScenario||scene);
   const restored=restoreCampaignFromSnapshot(JSON.parse(JSON.stringify(saved)),STATIC_SCENARIOS);
   assert.ok(restored,`Restore failed at ${scene.id}`);assert.deepEqual(restored.state.pendingDebrief,JSON.parse(JSON.stringify(y.report)));
   assert.deepEqual(gameplay(restored.state),gameplay(x.state));
   a=x.state;b={...restored.state,pendingDebrief:null};steps++;battles+=Boolean(x.battle);handoffs+=Boolean(y.report.continuity.changed);crises+=Boolean(scene.crisisFor);
  }
  assert.ok(a.gameOver,'Route did not reach an ending');assert.equal(b.history.length,steps);
  records.push({difficulty,seed,proposer,steps,battles,handoffs,crises,ended:a.gameOver,finalScenario:a.scenarioId,metrics:a.metrics});
 });
}
test('handoff, debt, field preparation and settlement describe existing state without mutating it',()=>{
 const state=createFreshCampaignState(7);state.metrics.munitions=0;state.campaignEconomy={treasuryArrears:17,munitionsArrears:9,emergencyUsed:1};
 const original=structuredClone(state),entry={scenarioActor:'Previous commander',scenarioRoleLabel:'Fort Commander'};
 const next=STATIC_SCENARIOS.find(s=>s.id==='shiloh_army_of_tennessee');
 const c=createCampaignContinuity(state,entry,next);assert.ok(c.changed);assert.equal(c.supply.ammunitionPercent,35);assert.equal(c.obligations.reserves,1);assert.equal(c.obligations.treasury,17);assert.deepEqual(state,original);
 const end=createCampaignContinuity({...state,gameOver:true},entry,next);assert.equal(end.next,null);assert.equal(end.supply,null);
 assert.equal(isCampaignContinuity({...c,obligations:{...c.obligations,treasury:NaN}}),false);
 assert.equal(isCampaignContinuity({...c,next:{actor:42}}),false);
});
process.on('exit',()=>{if(process.env.CW_CONTINUITY_REPORT)writeFileSync(process.env.CW_CONTINUITY_REPORT,JSON.stringify(records,null,2)+'\n');});
test('older debriefs remain readable and malformed handoffs are rejected safely',()=>{
 const before=createFreshCampaignState(1861,STATIC_SCENARIOS[0].id);
 const result=advanceCampaignTurn(before,STATIC_SCENARIOS[0],STATIC_SCENARIOS[0].choices[0],STATIC_SCENARIOS);
 const report=createAfterAction(before,result.state,result.historyEntry,result.nextScenario);
 delete report.continuity;
 assert.ok(isAfterActionReport(report));
 const saved=createCampaignSnapshot({...result.state,pendingDebrief:report},result.nextScenario);
 assert.deepEqual(restoreCampaignFromSnapshot(saved,STATIC_SCENARIOS).state.pendingDebrief,JSON.parse(JSON.stringify(report)));
 saved.state.pendingDebrief.continuity={version:1,next:{actor:{}}};
 const restored=restoreCampaignFromSnapshot(saved,STATIC_SCENARIOS);
 assert.equal(restored.state.pendingDebrief,null);assert.deepEqual(restored.state.metrics,result.state.metrics);
 const legacy=createCampaignContinuity({...before,rulesVersion:1},result.historyEntry,result.nextScenario);
 assert.equal(legacy.obligations,null);assert.doesNotMatch(legacy.explanation,/obligations/);
});
