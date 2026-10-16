import test from 'node:test';
import assert from 'node:assert/strict';
import {runShilohReference} from './lib/shiloh-reference-run.mjs';
import {fieldAttackPlanFor,FIELD_ATTACK_PLANS,SHILOH_CURRENT_ATTACK_PLAN} from '../src/battle/fieldAttackPlans.js';
import {battleLocations} from '../src/battle/battleLocations.js';
import {getBattleAssessment} from '../src/battle/battleAssessment.js';
import {CivilWarBattleEngine} from '../src/battle/civilWarEngine.js';
import {createPracticeState} from '../src/game/practiceConditions.js';
for(const doctrine of ['reserve','flank','depth'])for(const choice of ['option_a','option_c'])for(const commit of [20,22])test(`${choice}/${doctrine}/${commit}: current Shiloh reference secures supported control`,()=>{
 const {snapshot:s,orders}=runShilohReference({choice,doctrine,commit});
 assert.equal(getBattleAssessment(s,choice).objective.status,'achieved');assert.equal(s.fieldBattle.attackObjective.held,8);
 assert.ok(s.fieldBattle.attackObjective.eligible>=2);assert.equal(s.fieldBattle.attackObjective.defenders,0);
 assert.equal(orders.length,8);assert.ok(orders.every(o=>o.accepted===true));assert.ok(s.confederateLossRate>0&&s.confederateLossRate<.3);
});
for(const ammunition of ['full','limited','depleted'])for(const doctrine of ['reserve','flank','depth'])for(const choice of ['option_a','option_c'])test(`${ammunition}/${doctrine}/${choice}: intermediate timing retains honest outcomes and finite combat state`,()=>{
 const {snapshot:s}=runShilohReference({ammunition,doctrine,choice,commit:21});assert.notEqual(s.outcome,'undecided');
 assert.equal(getBattleAssessment(s,choice).objective.status==='achieved',s.fieldBattle.attackObjective.held>=8);
 assert.ok(s.formations.every(u=>[u.x,u.y,u.morale,u.cohesion,u.ammunition,u.strength].every(Number.isFinite)&&u.ammunition>=0&&u.strength>=0&&u.strength<=u.initialStrength));
});
test('delayed reserve-counterstroke failures remain visible rather than receiving victory credit',()=>{
 for(const choice of ['option_a','option_c']){const {snapshot:s}=runShilohReference({choice,commit:25});assert.equal(s.outcome,'defeat');assert.equal(getBattleAssessment(s,choice).objective.status,'failed');}
});
test('save/resume during the opening march produces the same orders and final state',()=>{
 const a=runShilohReference({commit:20}),b=runShilohReference({commit:20,resumeAt:16});assert.ok(b.resumed);assert.deepEqual(b.orders,a.orders);assert.deepEqual(b.snapshot,a.snapshot);
});
test('current Shiloh attack markers are read-only, legacy guidance and other missions are preserved',()=>{
 assert.equal(fieldAttackPlanFor('shiloh',16),FIELD_ATTACK_PLANS.shiloh);assert.equal(fieldAttackPlanFor('shiloh',17),SHILOH_CURRENT_ATTACK_PLAN);
 const campaign=createPracticeState({id:'shiloh_army_of_tennessee',turn:4});
 for(const choice of ['option_a','option_b','option_c','option_d']){
  const e=new CivilWarBattleEngine('shiloh',campaign,choice),before=e.checkpoint(),sites=battleLocations(e.snapshot()).filter(p=>p.kind==='Plan');
  assert.deepEqual(e.checkpoint(),before);
  assert.deepEqual(sites.map(p=>[p.x,p.y]),['option_a','option_c'].includes(choice)?SHILOH_CURRENT_ATTACK_PLAN.steps.map(p=>[p.x,p.y]):[]);
 }
 const old=new CivilWarBattleEngine('shiloh',{...campaign,battleRulesVersion:16},'option_a');assert.equal(battleLocations(old.snapshot()).filter(p=>p.kind==='Plan').length,0);
});
