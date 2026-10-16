// Reproducible scripted policy comparison, not a human skill or enjoyment study.
import {writeFileSync} from 'node:fs';
import {CivilWarBattleEngine} from '../src/battle/civilWarEngine.js';
import {FIELD_ATTACK_PLANS} from '../src/battle/fieldAttackPlans.js';
import {GETTYSBURG_STAGING_PLAN} from '../src/battle/gettysburgCommandBrief.js';
import {previewGroupOrder,confirmGroupOrder} from '../src/battle/groupOrders.js';
import {getBattleAssessment} from '../src/battle/battleAssessment.js';
const results=[];
const metrics={militaryStrength:85,munitions:80,publicMorale:80,foodSupply:78,treasury:75};
for(const battle of ['gettysburg','shiloh','first_manassas']) for(const doctrine of battle==='gettysburg'?['authored']:['reserve','flank','depth']) for(const policy of ['advance','supported-groups']) {
 const e=new CivilWarBattleEngine(battle,{rulesVersion:1,battleRulesVersion:7,metrics,enemyDoctrine:doctrine},'option_a');
 const initial=e.state.filter(u=>u.side==='confederate'&&u.active);const introduced=new Set(initial.map(u=>u.id));const errors=[];
 for(const u of initial)e.setFormation(u.id,'line');
 if(policy==='advance')for(const u of initial)e.order(u.id,'advance');
 else for(const p of battle==='gettysburg'?GETTYSBURG_STAGING_PLAN:FIELD_ATTACK_PLANS[battle].steps)e.move(p.id,{x:p.x,y:p.y});
 let committed=false,focused=false,peakHold=0,firstRout=null;
 const group=(ids,sectorId)=>{const p=previewGroupOrder(e.snapshot(),{ids,order:'assault',sectorId},e.world);const r=confirmGroupOrder(e,p);if(r.error)errors.push(r.error);};
 for(let i=0;i<6000 && e.outcome==='undecided';i++) {
  if(policy==='supported-groups' && battle==='gettysburg' && !focused && e.time>=30){focused=true;e.focusTarget('alexander-battalion','cushing-battery');}
  if(policy==='supported-groups' && !committed && e.time>=(battle==='shiloh'?25:45)){
   committed=true;
   if(battle==='gettysburg'){group(['pickett-division','pettigrew-division'],'center');group(['trimble-division','wilcox-support'],'angle');}
   else group(initial.filter(u=>u.type==='infantry').map(u=>u.id),e.fieldBattle.attackObjective.id);
  }
  for(const u of e.state.filter(u=>u.side==='confederate'&&u.active&&!introduced.has(u.id))){introduced.add(u.id);e.setFormation(u.id,'line');e.order(u.id,policy==='advance'?'advance':'assault',policy==='advance'?null:{sectorId:e.fieldBattle.attackObjective.id});}
  e.tick(.05);peakHold=Math.max(peakHold,e.gettysburg?.held||e.fieldBattle?.attackObjective?.held||0);
  if(!firstRout){const u=e.state.find(u=>u.side==='confederate'&&u.status==='routing');if(u)firstRout={time:e.time,name:u.name,cause:u.routingCause};}
 }
 const s=e.snapshot(),a=getBattleAssessment(s,'option_a');
 results.push({battle,doctrine,policy,outcome:s.outcome,objective:a.objective.status,commandScore:a.commandScore,time:s.time,peakHold,confederateLossRate:s.confederateLossRate,unionLossRate:s.unionLossRate,firstRout,errors});
}
const report={kind:'scripted-policy-comparison',battleRulesVersion:7,readiness:metrics,interpretation:'Fixed legal orders from untouched deployments. No rebalancing, human participants, statistical uncertainty estimates or grades. Failed outcomes retained.',results};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2));
for(const r of results)console.log(`${r.battle}/${r.doctrine}/${r.policy}: ${r.objective}, ${r.outcome}; peak hold ${r.peakHold.toFixed(1)}; CS losses ${(r.confederateLossRate*100).toFixed(1)}%; ${r.errors.length} command errors`);
