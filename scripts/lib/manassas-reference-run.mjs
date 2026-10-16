import { CivilWarBattleEngine } from '../../src/battle/civilWarEngine.js';
import { createPracticeState } from '../../src/game/practiceConditions.js';
import { fieldAttackPlanFor } from '../../src/battle/fieldAttackPlans.js';

// Reproducible player orders only. No position, strength, facing or clock edits.
export function runManassasReference({ choice='option_a', doctrine='reserve', ammunition='full', commit=60, reserveAt=51, dt=.2, rules=17, plan=fieldAttackPlanFor('first_manassas',rules), resumeAt=null }={}) {
 const campaign={...createPracticeState({id:'manassas_battlefield',turn:4},doctrine,ammunition),battleRulesVersion:rules};
 let engine=new CivilWarBattleEngine('first_manassas',campaign,choice),sentReserve=false,sentJackson=false,sentElzey=false,resumed=false;
 const orders=[];
 const move=step=>orders.push({time:engine.time,id:step.id,order:'move',point:{x:step.x,y:step.y},accepted:engine.move(step.id,{x:step.x,y:step.y})});
 const assault=id=>orders.push({time:engine.time,id,order:'assault',accepted:engine.order(id,'assault',{sectorId:'left'})});
 for(const step of plan.steps.filter(step=>step.id!=='elzey-reinforcement')){engine.setFormation(step.id,'line');move(step);}
 const reserveStep=plan.steps.find(step=>step.id==='elzey-reinforcement');
 for(let i=0;i<Math.ceil(440/dt)&&engine.outcome==='undecided';i++){
  const elzey=engine.state.find(unit=>unit.id===reserveStep.id);
  if(elzey.active&&!sentReserve&&engine.time>=reserveAt){sentReserve=true;move(reserveStep);}
  if(!sentJackson&&engine.time>=commit){sentJackson=true;assault('jackson-brigade');}
  if(sentReserve&&!sentElzey&&Math.hypot(elzey.x-reserveStep.x,elzey.y-reserveStep.y)<8){sentElzey=true;assault(elzey.id);}
  engine.tick(dt);
  if(resumeAt!=null&&!resumed&&engine.time>=resumeAt){engine=CivilWarBattleEngine.fromCheckpoint(JSON.parse(JSON.stringify(engine.checkpoint())),'first_manassas',campaign,choice);resumed=true;}
 }
 return {snapshot:engine.snapshot(),orders,resumed};
}
