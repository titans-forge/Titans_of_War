import {CivilWarBattleEngine} from '../../src/battle/civilWarEngine.js';
import {createPracticeState} from '../../src/game/practiceConditions.js';
import {fieldAttackPlanFor} from '../../src/battle/fieldAttackPlans.js';

// Ordinary player orders only. Clock, positions and combat state are never edited.
export function runShilohReference({choice='option_a',doctrine='reserve',ammunition='full',commit=20,rules=17,dt=.2,resumeAt=null}={}) {
 const campaign={...createPracticeState({id:'shiloh_army_of_tennessee',turn:4},doctrine,ammunition),battleRulesVersion:rules};
 let engine=new CivilWarBattleEngine('shiloh',campaign,choice),committed=false,resumed=false;
 const plan=fieldAttackPlanFor('shiloh',rules),orders=[];
 for(const step of plan.steps){
  engine.setFormation(step.id,'line');
  orders.push({time:engine.time,id:step.id,order:'move',point:{x:step.x,y:step.y},accepted:engine.move(step.id,{x:step.x,y:step.y})});
 }
 for(let i=0;i<Math.ceil(160/dt)&&engine.outcome==='undecided';i++){
  if(!committed&&engine.time>=commit){
   committed=true;
   for(const step of plan.steps)orders.push({time:engine.time,id:step.id,order:'assault',accepted:engine.order(step.id,'assault',{sectorId:'right'})});
  }
  engine.tick(dt);
  if(resumeAt!=null&&!resumed&&engine.time>=resumeAt){engine=CivilWarBattleEngine.fromCheckpoint(JSON.parse(JSON.stringify(engine.checkpoint())),'shiloh',campaign,choice);resumed=true;}
 }
 return {snapshot:engine.snapshot(),orders,resumed};
}
