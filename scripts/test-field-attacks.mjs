import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { FIELD_ATTACK_PLANS } from '../src/battle/fieldAttackPlans.js';
import { updateFieldMission, updateFieldCommand } from '../src/battle/fieldBattleMechanics.js';
import { getBattleAssessment } from '../src/battle/battleAssessment.js';
import { createFreshCampaignState, createCampaignSnapshot, restoreCampaignFromSnapshot, getCampaignSnapshotCompatibility } from '../src/game/campaignStorage.js';
const ready={militaryStrength:85,munitions:80,foodSupply:78,publicMorale:80,treasury:75};
const make=(id='first_manassas',choice='option_a',metrics=ready,version=5)=>new CivilWarBattleEngine(id,{rulesVersion:2,battleRulesVersion:version,metrics},choice);
const results=[];
function play(id,choice,policy='staged',metrics=ready,commit=id==='shiloh'?25:45){
 const e=make(id,choice,metrics),initial=e.state.filter(u=>u.side==='confederate'&&u.active),issued=new Set();
 for(const u of initial){e.setFormation(u.id,'line');if(policy==='staged'){const p=FIELD_ATTACK_PLANS[id].steps.find(p=>p.id===u.id);e.move(u.id,{x:p.x,y:p.y});}else if(policy!=='hold')e.order(u.id,policy);}
 let committed=false;
 for(let i=0;i<6500&&e.outcome==='undecided';i++){
  if(policy==='staged'&&!committed&&e.time>=commit){committed=true;for(const u of initial)if(u.active)e.order(u.id,'assault',{sectorId:e.fieldBattle.attackObjective.id});}
  for(const u of e.state.filter(u=>u.side==='confederate'&&u.active&&!initial.includes(u)&&!issued.has(u.id))){issued.add(u.id);e.setFormation(u.id,'line');if(policy==='staged')e.order(u.id,'assault',{sectorId:e.fieldBattle.attackObjective.id});else if(policy!=='hold')e.order(u.id,policy);}
  e.tick(.05);for(const u of e.state)for(const key of ['x','y','strength','morale','cohesion','suppression'])assert.ok(Number.isFinite(u[key]),`${id}/${u.id}/${key}`);
 }
 const s=e.snapshot(),a=getBattleAssessment(s,choice);assert.notEqual(e.outcome,'undecided');
 results.push({id,choice,policy,commit,metrics,outcome:e.outcome,mission:a.objective.status,score:a.commandScore,loss:s.confederateLossRate,unionLoss:s.unionLossRate,time:s.time,objective:s.fieldBattle.attackObjective,events:s.events});return {e,s,a};
}
for(const [id,choices]of [['first_manassas',['option_a','option_d']],['shiloh',['option_a','option_c']]])for(const choice of choices){
 await test(`${id}/${choice}: explicit staging and supported Assault complete the objective`,()=>{
  const {e,s,a}=play(id,choice);assert.equal(a.objective.status,'achieved');assert.equal(s.fieldBattle.attackObjective.held,8);assert.equal(s.fieldBattle.attackObjective.defenders,0);assert.ok(s.fieldBattle.attackObjective.eligible>=2);
  const before=structuredClone(e.state);for(let i=0;i<100;i++)e.tick(.05);assert.deepEqual(e.state,before);
 });
 for(const policy of ['hold','withdraw','advance'])await test(`${id}/${choice}: ${policy} cannot receive unsupported capture credit`,()=>assert.notEqual(play(id,choice,policy).a.objective.status,'achieved'));
}
function isolated(){
 const e=make();for(const u of e.state){u.active=false;u.arrivalTime=null;}
 const pair=e.state.filter(u=>u.side==='confederate').slice(0,2),objective=e.fieldBattle.attackObjective;
 pair.forEach((u,i)=>Object.assign(u,{active:true,status:'steady',order:'hold',directMove:false,x:objective.x-70+i*140,y:objective.y,morale:80,cohesion:80}));return {e,pair,objective};
}
await test('capture requires support and eight continuous minutes, with no credit on observation',()=>{
 const {e,pair,objective}=isolated();pair[1].active=false;updateFieldMission(e,1);assert.equal(objective.held,0);
 pair[1].active=true;updateFieldMission(e,3);assert.equal(objective.held,3);for(let i=0;i<10;i++)updateFieldMission(e);assert.equal(objective.held,3);
 pair[1].x=objective.x+190;pair[0].x=objective.x-190;updateFieldMission(e,1);assert.equal(objective.held,0);
 pair[1].x=objective.x+70;pair[0].x=objective.x-70;for(let i=0;i<159;i++)updateFieldMission(e,.05);assert.equal(e.pendingOutcome,null);updateFieldMission(e,.05);assert.equal(objective.held,8);assert.equal(e.pendingOutcome,'decisive-win');
});
for(const mutation of [{order:'withdraw'},{order:'fallback'},{order:'rally'},{directMove:true},{status:'routing'},{status:'broken'},{type:'artillery'}])await test(`capture excludes ${JSON.stringify(mutation)}`,()=>{
 const {e,pair,objective}=isolated();updateFieldMission(e,2);assert.equal(objective.held,2);Object.assign(pair[1],mutation);updateFieldMission(e,1);assert.equal(objective.held,0);
});
await test('enemy infantry and deployed guns reset the timer; abandoned guns do not hold ground',()=>{
 for(const type of ['infantry','artillery']){const {e,objective}=isolated();updateFieldMission(e,4);const enemy=e.state.find(u=>u.side==='union');Object.assign(enemy,{active:true,status:'steady',type,x:objective.x,y:objective.y,morale:80,cohesion:80});updateFieldMission(e,1);assert.equal(objective.held,0);assert.equal(objective.defenders,1);enemy.gunsAbandoned=true;enemy.type='artillery';updateFieldMission(e,1);assert.equal(objective.held,1);}
});
await test('casualty-only wins cannot bypass capture; an incomplete deadline is defeat',()=>{
 const e=make();e.beginResolution('decisive-win');assert.equal(e.pendingOutcome,null);e.time=e.config.maxTime;e.beginResolution('costly-win');assert.equal(e.pendingOutcome,'defeat');
});
await test('Elzey waits for minute 48 and a clear footprint, then cannot respawn',()=>{
 const e=make(),r=e.state.find(u=>u.id==='elzey-reinforcement'),u=e.state.find(u=>u.side==='confederate'&&u.active);
 assert.equal(e.initialConfederate,e.state.filter(u=>u.side==='confederate').reduce((n,u)=>n+u.initialStrength,0));
 e.time=47.95;e.activateReinforcements();assert.equal(r.active,false);Object.assign(u,{x:r.x,y:r.y});e.time=48;e.activateReinforcements();assert.equal(r.active,false);assert.equal(r.arrivalBlocked,true);
 Object.assign(u,{x:700,y:700});e.activateReinforcements();assert.equal(r.active,true);assert.equal(r.order,'hold');assert.equal(r.strength,r.initialStrength);r.withdrawn=true;r.active=false;e.activateReinforcements();assert.equal(r.active,false);
});
await test('new rules are scoped and old envelopes retain their battle version',()=>{
 for(const id of ['first_manassas','shiloh'])for(const version of [1,2,3,4]){const e=make(id,'option_a',ready,version);assert.equal(e.fieldBattle?.attackObjective,undefined);assert.equal(e.state.find(u=>u.id==='elzey-reinforcement'),undefined);}
 assert.equal(make('gettysburg').battleRulesVersion,3);assert.equal(make('wilderness').battleRulesVersion,4);assert.equal(make('first_manassas','option_b').config.maxTime,105);
 const scene={id:'first',title:'First',turn:1,choices:[{id:'a',text:'A'}]},snap=createCampaignSnapshot(createFreshCampaignState(1861,'first'),scene);assert.equal(snap.version,22);assert.equal(snap.state.battleRulesVersion,18);
 const old=structuredClone(snap);old.version=8;old.state.battleRulesVersion=4;assert.equal(restoreCampaignFromSnapshot(old,[scene]).state.battleRulesVersion,4);old.state.battleRulesVersion=5;assert.equal(getCampaignSnapshotCompatibility(old).ok,false);
});
await test('the paused objective identifies defending guns before time begins',()=>{const e=make();assert.equal(e.fieldBattle.attackObjective.defenders,1);assert.equal(e.fieldBattle.attackObjective.held,0);assert.equal(e.fieldBattle.sectors.find(s=>s.id==='left').control,'union');});
await test('Hurlbut visibly repositions once to defend a threatened landing without receiving new strength',()=>{
 const e=make('shiloh'),h=e.state.find(u=>u.id==='hurlbut-division'),u=e.state.find(u=>u.side==='confederate');
 Object.assign(u,{x:1410,y:520});const before={x:h.x,y:h.y,strength:h.strength,morale:h.morale};
 updateFieldCommand(e);assert.equal(h.order,'assault');assert.equal(h.assaultSector,'right');assert.deepEqual(h.target,{x:1235,y:745});assert.equal(h.x,before.x);assert.equal(h.y,before.y);assert.equal(h.strength,before.strength);assert.equal(h.morale,before.morale);
 e.time=3;updateFieldCommand(e);assert.equal(e.events.filter(v=>v.message.startsWith('Hurlbut is shifting')).length,1);
});
for(const id of ['first_manassas','shiloh'])await test(`${id}: v5 movement and capture clocks do not depend on display speed`,()=>{
 const a=make(id),b=make(id);for(const e of [a,b])for(const p of FIELD_ATTACK_PLANS[id].steps){e.setFormation(p.id,'line');e.move(p.id,{x:p.x,y:p.y});}
 for(let i=0;i<400;i++)a.tick(.05);for(let i=0;i<100;i++)b.tick(.2);assert.deepEqual(b.state,a.state);assert.deepEqual(b.events,a.events);assert.equal(b.fieldBattle.attackObjective.held,a.fieldBattle.attackObjective.held);
});
// Frozen readiness cohort: retain failures rather than tune them away.
for(const [profile,metrics]of Object.entries({ordinary:{militaryStrength:70,munitions:70,foodSupply:70,publicMorale:70,treasury:70},strained:{militaryStrength:55,munitions:45,foodSupply:50,publicMorale:55,treasury:45},depleted:{militaryStrength:35,munitions:25,foodSupply:30,publicMorale:35,treasury:25}}))for(const [id,choice]of [['first_manassas','option_a'],['first_manassas','option_d'],['shiloh','option_a'],['shiloh','option_c']])await test(`${id}/${choice}: ${profile} readiness remains bounded and honestly assessed`,()=>{const {s,a}=play(id,choice,'staged',metrics);assert.equal(a.objective.status==='achieved',s.fieldBattle.attackObjective.held===8&&['decisive-win','costly-win'].includes(s.outcome));});
if(process.env.ATTACK_REPORT)writeFileSync(process.env.ATTACK_REPORT,JSON.stringify({engineVersion:5,trials:results.length,results},null,2));
