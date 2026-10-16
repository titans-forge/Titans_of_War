import {writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {createFreshCampaignState} from '../src/game/campaignStorage.js';
import {getCampaignScenario,getRecoveryOptions,selectRecoveryAllocation,commitRecoveryAllocation} from '../src/game/campaignSupply.js';
import {getChoiceAvailability,calculateCampaignScore} from '../src/game/simulationEngine.js';
import {advanceCampaignTurn,getScenarioForState} from '../src/game/headlessCampaign.js';
import {battleForScenario,delegateBattle,applyBattleResolution,battleChoiceSuccessModifier} from '../src/game/battles.js';
const output=resolve(process.argv[2]||'balance-results');mkdirSync(output,{recursive:true});
const vite=await createServer({server:{middlewareMode:true},appType:'custom'});
const {STATIC_SCENARIOS}=await vite.ssrLoadModule('/src/game/scenarios.js');await vite.close();
function expectedMetrics(choice) {
 const rate=choice.successRate ?? 1, yes=choice.successEffects?.metrics || choice.effects?.metrics || {}, no=choice.failureEffects?.metrics || (rate<1?{militaryStrength:-20,publicMorale:-15}:{});
 return Object.fromEntries([...new Set([...Object.keys(yes),...Object.keys(no)])].map(k=>[k,(yes[k]||0)*rate+(no[k]||0)*(1-rate)]));
}
function utility(state,deltas) {
 return Object.entries({militaryStrength:3,publicMorale:3,foodSupply:3,munitions:1.5,treasury:1.5}).reduce((sum,[key,w])=>{
 const value=Math.max(0,Math.min(100,state.metrics[key]+(deltas[key]||0)));
 const threshold=key==='foodSupply'?6:['militaryStrength','publicMorale'].includes(key)?11:0;
 return sum+w*Math.log(1+value)-(value<threshold?100:0);
 },0);
}
const records=[],path=resolve(output,'campaign.jsonl');writeFileSync(path,'');
for(const difficulty of ['story','standard'])for(let seed=1861;seed<1885;seed++)for(const proposer of ['hotspur','fox','wolf','sovereign','adaptive']) {
 let state=createFreshCampaignState(seed,STATIC_SCENARIOS[0].id,{difficulty}),steps=[];
 while(!state.gameOver&&steps.length<80){
  const scene=getCampaignScenario(state,getScenarioForState(state,STATIC_SCENARIOS));
  const legal=scene.choices.filter(c=>!getChoiceAvailability(c,scene,state).locked);
  if(!legal.length)break;
  const choice=proposer==='adaptive'?[...legal].sort((a,b)=>utility(state,expectedMetrics(b))-utility(state,expectedMetrics(a)))[0]:legal.find(c=>c.proposer===proposer)||legal[0];
  const allocation=proposer==='adaptive'?getRecoveryOptions(state).filter(o=>o.available).sort((a,b)=>(utility(state,b.deltas)-(b.id==='emergency'?1.5:0))-(utility(state,a.deltas)-(a.id==='emergency'?1.5:0)))[0]?.id:state.metrics.foodSupply<30?'emergency':state.metrics.munitions<40?'purchase':'none';
  state=selectRecoveryAllocation(state,allocation||'none');
  const battle=battleForScenario(scene,state);let modifier=0,field=null;
  if(battle){state=commitRecoveryAllocation(state);field=delegateBattle(state,battle,choice.id);state=applyBattleResolution(state,field);modifier=battleChoiceSuccessModifier(battle,choice.id,field.result);}
  const result=advanceCampaignTurn(state,scene,choice,STATIC_SCENARIOS,modifier);state=result.state;
  steps.push({scenario:scene.id,choice:choice.id,crisis:scene.crisisFor||null,battle:field?.result||null,metrics:state.metrics});
 }
 const score=calculateCampaignScore(state);const row={difficulty,seed,proposer,ended:state.gameOver,survived:score.survived,ending:score.endingClass,reason:state.statusMessage,metrics:state.metrics,steps};
 records.push(row);appendFileSync(path,JSON.stringify(row)+'\n');
}
const summary={version:1,seeds:[1861,1884],cases:records.length,limitations:'Four fixed advisor preferences with simple supply recovery plus an adaptive policy using expected resource effects and available allocations; battles delegated. These are campaign policy stress tests, not complete human routes or tactical win rates.',nonterminal:records.filter(r=>!r.ended).length,groups:[]};
for(const difficulty of ['story','standard'])for(const proposer of ['hotspur','fox','wolf','sovereign','adaptive']){const group=records.filter(r=>r.difficulty===difficulty&&r.proposer===proposer);summary.groups.push({difficulty,proposer,n:group.length,survived:group.filter(r=>r.survived).length,meanDecisions:group.reduce((n,r)=>n+r.steps.length,0)/group.length});}
writeFileSync(resolve(output,'campaign-summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
if(summary.nonterminal)process.exitCode=1;
