import test from 'node:test';
import assert from 'node:assert/strict';
import {CivilWarBattleEngine} from '../src/battle/civilWarEngine.js';
import {fieldAttackPlanFor, FIELD_ATTACK_PLANS} from '../src/battle/fieldAttackPlans.js';
import {getBattleAssessment} from '../src/battle/battleAssessment.js';
const metrics={militaryStrength:85,munitions:80,publicMorale:80,foodSupply:78,treasury:75};
const make=(choice='option_a',doctrine='reserve',version=7,id='first_manassas')=>new CivilWarBattleEngine(id,{rulesVersion:1,battleRulesVersion:version,enemyDoctrine:doctrine,metrics},choice);
function play(choice,doctrine,attack=true){
 const e=make(choice,doctrine);let reserveOrdered=false,committed=false,reserveCommitted=false;
 const plan=fieldAttackPlanFor('first_manassas',7);
 if(attack)for(const p of plan.steps.filter(p=>p.id!=='elzey-reinforcement')){e.setFormation(p.id,'line');assert.equal(e.move(p.id,{x:p.x,y:p.y}),true);}
 for(let i=0;i<3000&&e.outcome==='undecided';i++){
  const r=e.state.find(u=>u.id==='elzey-reinforcement');
  if(attack&&r.active&&!reserveOrdered&&e.time>=51){reserveOrdered=true;assert.equal(e.move(r.id,{x:340,y:440}),true);}
  if(attack&&!committed&&e.time>=65){committed=true;assert.equal(e.order('jackson-brigade','assault',{sectorId:'left'}),true);}
  if(attack&&reserveOrdered&&!reserveCommitted&&Math.hypot(r.x-340,r.y-440)<8){reserveCommitted=true;assert.equal(e.order(r.id,'assault',{sectorId:'left'}),true);}
  e.tick(.05);
 }
 return e;
}
test('representative gun line is confined to current Manassas attack missions',()=>{
 for(const choice of ['option_a','option_d']){
  const e=make(choice),g=e.state.find(u=>u.id==='henry-hill-batteries');assert.equal(g.type,'artillery');assert.equal(g.gunState,'deployed');assert.equal(g.order,'hold');assert.equal(g.initialAmmunition,28);
  assert.equal(e.initialConfederate,e.state.filter(u=>u.side==='confederate').reduce((s,u)=>s+u.initialStrength,0));
  assert.equal(e.fieldBattle.attackObjective.required,8);assert.equal(e.config.maxTime,140);
 }
 for(const version of [1,2,3,4,5,6])assert.equal(make('option_a','reserve',version).state.some(u=>u.id==='henry-hill-batteries'),false);
 for(const choice of ['option_b','option_c'])assert.equal(make(choice).state.some(u=>u.id==='henry-hill-batteries'),false);
 assert.equal(make('option_a','reserve',7,'shiloh').state.some(u=>u.id==='henry-hill-batteries'),false);
 assert.equal(fieldAttackPlanFor('first_manassas',6),FIELD_ATTACK_PLANS.first_manassas);
 assert.equal(fieldAttackPlanFor('shiloh',7),FIELD_ATTACK_PLANS.shiloh);
});
for(const choice of ['option_a','option_d'])for(const doctrine of ['reserve','flank','depth'])test(`${choice}/${doctrine}: delayed reserve orders still complete the supported flank counterattack`,()=>{
 const e=play(choice,doctrine),s=e.snapshot(),a=getBattleAssessment(s,choice);
 assert.equal(a.objective.status,'achieved');assert.equal(s.fieldBattle.attackObjective.held,8);assert.ok(s.fieldBattle.attackObjective.eligible>=2);assert.equal(s.fieldBattle.attackObjective.defenders,0);
 assert.ok(s.confederateLossRate>.03&&s.confederateLossRate<.3,'real casualties remain part of the attack');
 const g=e.state.find(u=>u.id==='henry-hill-batteries');assert.ok(g.ammunition<g.initialAmmunition,'guns actually supported the fight');
 const b=e.state.find(u=>u.id==='bee-evans-line'),h=e.state.find(u=>u.id==='hampton-reserve');assert.notEqual(b.order,'assault');assert.notEqual(h.order,'assault');
 for(const u of e.state){assert.ok([u.x,u.y,u.strength,u.morale,u.cohesion].every(Number.isFinite));assert.ok(u.strength<=u.initialStrength);assert.ok(u.ammunition<=u.initialAmmunition);}
 const frozen=structuredClone(e.state);for(let i=0;i<40;i++)e.tick(.05);assert.deepEqual(e.state,frozen);
});
for(const doctrine of ['reserve','flank','depth'])test(`${doctrine}: supporting guns do not win an attack without player counterattack orders`,()=>{
 const e=play('option_a',doctrine,false),s=e.snapshot();assert.notEqual(s.outcome,'undecided');assert.equal(getBattleAssessment(s,'option_a').objective.status,'failed');assert.equal(s.fieldBattle.attackObjective.held,0);
});
