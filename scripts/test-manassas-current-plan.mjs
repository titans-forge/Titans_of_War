import test from 'node:test';
import assert from 'node:assert/strict';
import {runManassasReference} from './lib/manassas-reference-run.mjs';
import {fieldAttackPlanFor,fieldPlanStepStatus,MANASSAS_COMBINED_ARMS_PLAN,MANASSAS_CURRENT_ATTACK_PLAN} from '../src/battle/fieldAttackPlans.js';
import {battleLocations} from '../src/battle/battleLocations.js';
import {getBattleAssessment} from '../src/battle/battleAssessment.js';
import {CivilWarBattleEngine} from '../src/battle/civilWarEngine.js';
import {createPracticeState} from '../src/game/practiceConditions.js';
for(const doctrine of ['reserve','flank','depth'])for(const choice of ['option_a','option_d'])for(const commit of [60,65])test(`${choice}/${doctrine}/${commit}: separated approaches complete a supported current-rule assault`,()=>{
 const {snapshot:s,orders}=runManassasReference({choice,doctrine,commit});
 assert.equal(getBattleAssessment(s,choice).objective.status,'achieved');assert.equal(s.fieldBattle.attackObjective.held,8);
 assert.ok(orders.every(o=>o.accepted===true));assert.ok(s.confederateLossRate>0&&s.confederateLossRate<.3);
 assert.ok(s.fieldBattle.attackObjective.eligible>=2);assert.equal(s.fieldBattle.attackObjective.defenders,0);
 assert.equal(orders.filter(o=>o.order==='assault').length,2);
});
for(const ammunition of ['limited','depleted'])for(const doctrine of ['reserve','flank','depth'])for(const choice of ['option_a','option_d'])test(`${ammunition}/${doctrine}/${choice}: impaired supply stays bounded and is honestly assessed`,()=>{
 const {snapshot:s}=runManassasReference({ammunition,doctrine,choice});assert.notEqual(s.outcome,'undecided');
 assert.equal(getBattleAssessment(s,choice).objective.status==='achieved',s.fieldBattle.attackObjective.held>=8);
 assert.ok(s.formations.every(u=>u.ammunition>=0&&u.strength>=0&&u.strength<=u.initialStrength));
});
test('old route failure under current rules remains a recorded comparison',()=>{
 const {snapshot}=runManassasReference({plan:MANASSAS_COMBINED_ARMS_PLAN,commit:65});assert.equal(snapshot.fieldBattle.attackObjective.held,0);
 assert.equal(snapshot.outcome,'defeat');
});
test('revised route resumes deterministically while both attacking brigades are moving',()=>{
 const a=runManassasReference({commit:65}),b=runManassasReference({commit:65,resumeAt:61});assert.ok(b.resumed);assert.deepEqual(b.snapshot,a.snapshot);assert.deepEqual(b.orders,a.orders);
});
test('legacy guidance is preserved and camera-only plan positions match the current reference',()=>{
 assert.equal(fieldAttackPlanFor('first_manassas',16),MANASSAS_COMBINED_ARMS_PLAN);
 assert.equal(fieldAttackPlanFor('first_manassas',17),MANASSAS_CURRENT_ATTACK_PLAN);
 const e=new CivilWarBattleEngine('first_manassas',createPracticeState({id:'manassas_battlefield',turn:4}),'option_a');
 const before=e.checkpoint(),sites=battleLocations(e.snapshot()).filter(p=>p.kind==='Plan');
 assert.deepEqual(sites.map(p=>[p.x,p.y]),MANASSAS_CURRENT_ATTACK_PLAN.steps.map(p=>[p.x,p.y]));assert.deepEqual(e.checkpoint(),before);
 const d=new CivilWarBattleEngine('first_manassas',createPracticeState({id:'manassas_battlefield',turn:4}),'option_b');assert.equal(battleLocations(d.snapshot()).filter(p=>p.kind==='Plan').length,0);
});
test('staging status distinguishes reserve arrival, march, arrival and committed assault without issuing an order',()=>{
 const step=MANASSAS_CURRENT_ATTACK_PLAN.steps[3],e=new CivilWarBattleEngine('first_manassas',createPracticeState({id:'manassas_battlefield',turn:4}),'option_a');
 let s=e.snapshot();assert.equal(fieldPlanStepStatus(s,step),'Arrives at 48');
 const u=s.formations.find(u=>u.id===step.id);u.active=true;u.directMove=true;u.target={x:step.x,y:step.y};assert.equal(fieldPlanStepStatus(s,step),'Moving to approach');
 u.directMove=false;u.x=step.x;u.y=step.y;assert.equal(fieldPlanStepStatus(s,step),'At approach');
 u.order='assault';const before=structuredClone(s);assert.equal(fieldPlanStepStatus(s,step),'Assault committed');assert.deepEqual(s,before);
 u.status='routing';assert.match(fieldPlanStepStatus(s,step),/Cannot stage/);u.withdrawn=true;assert.equal(fieldPlanStepStatus(s,step),'Left the field');
});
