import { landmarkField, formationLandmarkBlocker } from '../src/battle/historicalLandmarks.js';
import {GETTYSBURG_RULES} from '../src/battle/gettysburgMechanics.js';
import {writeFileSync} from 'node:fs';
import {CivilWarBattleEngine} from '../src/battle/civilWarEngine.js';
import {BATTLE_SCENARIOS} from '../src/game/battles.js';
import {getBattleAssessment,isBattleAssessment} from '../src/battle/battleAssessment.js';
const battleRulesVersion=Number(process.env.BATTLE_RULES_VERSION || 7);
if (![7,8,9,10,11,12,13,14,15,16,17,18].includes(battleRulesVersion)) throw new Error('Audit supports battle rules 7 through 18');
const results=[];
for(const battle of Object.values(BATTLE_SCENARIOS).filter(b=>!process.argv[3]||b.id===process.argv[3]))for(const choice of ['option_a','option_b','option_c','option_d'])for(const doctrine of ['reserve','flank','depth'])for(const readiness of [50,85]){
 const e=new CivilWarBattleEngine(battle.id,{rulesVersion:2,battleRulesVersion,enemyDoctrine:doctrine,metrics:{militaryStrength:readiness,munitions:readiness,publicMorale:readiness,foodSupply:readiness,treasury:readiness}},choice);
 const orders={option_a:'advance',option_b:'hold',option_c:'withdraw',option_d:'assault'};const order=orders[choice];const commanded=new Set();const issues=[];let ticks=0;
 try{
 while(e.outcome==='undecided'&&e.time<(e.gettysburg?GETTYSBURG_RULES.duration:e.config.maxTime)+30&&ticks++<5000){
  for(const u of e.state.filter(u=>u.side==='confederate'&&u.active&&!commanded.has(u.id))){commanded.add(u.id);e.order(u.id,order==='assault'&&u.type!=='infantry'?'advance':order);}
  e.tick(.2);
  if(ticks%10===0)for(const u of e.state){
   if(!['x','y','strength','morale','cohesion','ammunition'].every(k=>Number.isFinite(u[k])))issues.push('nonfinite:'+u.id);
   if(u.active && u.strength>0 && !['broken','surrendered'].includes(u.status) && formationLandmarkBlocker(landmarkField(e),u))issues.push('building-overlap:'+u.id);
   if(u.strength<0||u.strength>u.initialStrength+.01)issues.push('invalid-strength:'+u.id);
   if(u.active&&u.strength>0&&(u.x < -200||u.y < -200||u.x>e.world.width+200||u.y>e.world.height+200))issues.push('outside-field:'+u.id);
  }
 }
 const s=e.snapshot(),a=getBattleAssessment(s,choice);if(s.outcome==='undecided')issues.push('not-terminal');if(!isBattleAssessment(a))issues.push('invalid-assessment');
 if(['decisive-win','costly-win'].includes(s.outcome)&&a?.objective.status==='failed')issues.push('win-with-failed-objective');
 results.push({battle:battle.id,choice,doctrine,readiness,order,outcome:s.outcome,time:s.time,objective:a?.objective,score:a?.commandScore,losses:s.confederateLossRate,issues:[...new Set(issues)],exits:s.formations.filter(u=>u.side==='confederate').map(u=>({id:u.id,active:u.active,status:u.status,withdrawn:u.withdrawn,strength:u.strength}))});
 }catch(err){results.push({battle:battle.id,choice,doctrine,readiness,issues:['exception:'+err.stack]});}
 if(results.length%12===0){writeFileSync(process.argv[2],JSON.stringify({complete:false,battleRulesVersion,results},null,2));console.log(results.length,results.at(-1).battle,'flagged',results.filter(r=>r.issues.length).length);}
}
writeFileSync(process.argv[2],JSON.stringify({complete:true,battleRulesVersion,interpretation:'Deterministic command stress matrix: opening choices crossed with enemy doctrine and readiness. Fixed order A Advance/B Hold/C Withdraw/D Assault; not authored strategy guidance or a human win-rate estimate.',results},null,2));
