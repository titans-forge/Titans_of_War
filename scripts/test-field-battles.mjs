import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { FIELD_BATTLE_PROFILES, fieldTerrain, fieldExitTargets } from '../src/battle/fieldBattleProfiles.js';
import { getBattleAssessment } from '../src/battle/battleAssessment.js';
import { gettysburgLineOfFire, gettysburgRange, gettysburgClearance, gettysburgOrganized } from '../src/battle/gettysburgMechanics.js';
import { createFreshCampaignState, createCampaignSnapshot, restoreCampaignFromSnapshot, getCampaignSnapshotCompatibility } from '../src/game/campaignStorage.js';
import { calculateCampaignAssessment } from '../src/game/campaignAssessment.js';
const state = { rulesVersion: 2, battleRulesVersion: 4, metrics: { militaryStrength: 85, munitions: 80, foodSupply: 78, publicMorale: 80, treasury: 75 } };
const ids = Object.keys(FIELD_BATTLE_PROFILES), results = [];
const make = (id, choice = 'option_b') => new CivilWarBattleEngine(id, state, choice);
const run = (e, minutes) => { for(let i=0;i<Math.round(minutes/.05);i++)e.tick(.05); };
function play(id, choice, policy) {
 const e = make(id, choice), issued = new Set();
 for(let step=0;step<6500 && e.outcome==='undecided';step++) {
  for(const [n,u] of e.state.filter(u=>u.side==='confederate').entries()) if(u.active&&!issued.has(u.id)) {
   issued.add(u.id); e.setFormation(u.id,'line');
   if(['advance','withdraw'].includes(policy)) e.order(u.id,policy);
   if(policy==='spread') e.move(u.id,{x:[520,740,940][n],y:640});
   if(policy==='assault-center') e.order(u.id,u.type==='infantry'?'assault':'advance',u.type==='infantry'?{sectorId:'center'}:null);
   if(policy==='transfer'&&e.config.transferFormationIds.includes(u.id))e.order(u.id,'withdraw');
   if(policy==='sortie'&&e.config.sortieFormationIds.includes(u.id))e.order(u.id,'advance');
  }
  const covered=policy==='covered'&&(e.thirdWinchester.middleFieldHeld>=e.config.middleFieldHoldRequired||e.thirdWinchester.rearguardHeld>=e.config.rearguardHoldRequired);
  const returning=policy==='sortie'&&e.sortieState==='raided';
  if(covered||returning) for(const u of e.state.filter(u=>u.side==='confederate'&&u.active&&(covered||e.config.sortieFormationIds.includes(u.id))))if(u.order!=='withdraw'&&u.pendingCommand?.order!=='withdraw')e.order(u.id,'withdraw');
  e.tick(.05);
  for(const u of e.state) for(const k of ['x','y','strength','morale','cohesion','suppression'])assert.ok(Number.isFinite(u[k]),`${id}/${u.id}/${k}`);
 }
 assert.notEqual(e.outcome,'undecided');
 const s=e.snapshot(), assessment=getBattleAssessment(s,choice);
 results.push({id,choice,policy,time:e.time,outcome:e.outcome,mission:assessment.objective.status,command:assessment.commandScore,loss:s.confederateLossRate,escaped:s.fieldBattle.escaped,events:s.events,signals:{winchester:s.thirdWinchester,assault:s.coldHarborAssaultState,transfer:s.transferState,sortie:s.sortieState}});
 return {e,s,assessment};
}
for(const id of ids) {
 await test(`${id}: v4 uses its own terrain, sectors, and detached snapshots`,()=>{
  const e=make(id), s=e.snapshot();assert.equal(e.battleRulesVersion,4);assert.equal(s.fieldBattle.sectors.length,3);assert.equal(s.gettysburg,undefined);
  s.fieldBattle.sectors[0].x=-100;s.fieldBattle.zones[0].defense=99;s.formations[0].home.x=-1;
  assert.notEqual(e.fieldBattle.sectors[0].x,-100);assert.notEqual(e.fieldBattle.zones[0].defense,99);assert.notEqual(e.state[0].home.x,-1);
  for(const u of e.state) assert.equal(e.snapshot().formations.find(v=>v.id===u.id).firingRange,gettysburgRange(u));
  const z=e.fieldBattle.zones[0], point={x:(z.left+z.right)/2,y:(z.top+z.bottom)/2};assert.deepEqual(fieldTerrain(e,{...point,side:'union'}),fieldTerrain(e,{...point,side:'confederate'}));
  assert.equal(fieldTerrain(e,{x:0,y:0,entrenchDefender:true,ridgeDefender:true}).defense,1,'cover cannot travel with a formation');
 });
 await test(`${id}: fixed steps give the same state at different display speeds`,()=>{
  const a=make(id),b=make(id);const u=a.state.find(u=>u.active&&u.side==='confederate');a.order(u.id,'fallback');b.order(u.id,'fallback');
  for(let i=0;i<160;i++)a.tick(.05);for(let i=0;i<40;i++)b.tick(.2);
  assert.deepEqual(a.state,b.state);assert.deepEqual(a.events,b.events);assert.equal(a.time,b.time);
 });
 await test(`${id}: finalization freezes formations and never launches a healthy army away`,()=>{
  const e=make(id), before=structuredClone(e.state);e.beginResolution('defeat');run(e,2);assert.deepEqual(e.state,before);assert.equal(e.outcome,'defeat');
 });
 for(const choice of ['option_a','option_b','option_c','option_d'])await test(`${id}/${choice}: idle policy terminates without invalid state`,()=>{play(id,choice,'hold');});
}
const missions=[
 ['first_manassas','option_b','spread'],['first_manassas','option_c','withdraw'],
 ['shiloh','option_d','withdraw'],['shiloh','option_b','hold'],
 ['chancellorsville','option_a','assault-center'],['chancellorsville','option_b','hold'],
 ['wilderness','option_b','hold'],['wilderness','option_d','withdraw'],
 ['third_winchester','option_b','covered'],['third_winchester','option_d','covered'],
 ['cedar_creek','option_a','advance'],['cedar_creek','option_c','withdraw'],
 ['gettysburg_jackson','option_b','advance'],['chickamauga','option_b','advance'],
 ['cold_harbor','option_b','hold'],['cold_harbor','option_d','transfer'],
 ['petersburg','option_a','advance'],['petersburg','option_b','hold'],['petersburg','option_c','sortie'],
];
for(const [id,choice,policy]of missions)await test(`${id}/${choice}: legal ${policy} commands complete the authored mission`,()=>{
 const {e,assessment}=play(id,choice,policy);assert.equal(assessment.objective.status,'achieved');
 if(policy==='withdraw')assert.ok(e.fieldBattle.escaped>=.65);
 if(policy==='covered')assert.equal(e.thirdWinchester.withdrawalState,'secured');
 if(policy==='sortie')assert.ok(e.config.sortieFormationIds.every(id=>e.state.find(u=>u.id===id).withdrawn));
 if(policy==='transfer'){assert.ok(e.config.transferFormationIds.every(id=>e.state.find(u=>u.id===id).withdrawn));assert.ok(e.coldHarborWorksOccupied());}
});
await test('a wholesale Cold Harbor exit cannot substitute for a covered transfer',()=>{
 const {assessment}=play('cold_harbor','option_d','withdraw');assert.notEqual(assessment.objective.status,'achieved');
});
await test('idle armies cannot receive credit for withdrawal missions',()=>{
 for(const [id,choice]of [['first_manassas','option_c'],['shiloh','option_d'],['wilderness','option_d'],['cedar_creek','option_c'],['cedar_creek','option_d']]){
  const row=results.find(r=>r.id===id&&r.choice===choice&&r.policy==='hold');assert.notEqual(row.outcome,'disciplined-withdrawal');assert.notEqual(row.mission,'achieved');
 }
});
await test('Shiloh and Winchester use the authored rear and corridor, not Gettysburg exits',()=>{
 const sh=make('shiloh');assert.ok(fieldExitTargets(sh,{side:'confederate'}).every(p=>p.y<30));assert.ok(fieldExitTargets(sh,{side:'union'}).every(p=>p.y>800));
 const w=make('third_winchester');assert.ok(fieldExitTargets(w,{side:'confederate'}).every(p=>p.x>=w.config.withdrawalCorridor.left&&p.x<=w.config.withdrawalCorridor.right&&p.y>=w.config.withdrawalCorridor.top));
 assert.deepEqual(w.fieldBattle.requireExitIds,w.state.filter(u=>u.side==='confederate').map(u=>u.id));
});
await test('reinforcements wait for an open footprint and cannot respawn after leaving',()=>{
 const e=make('wilderness'),r=e.state.find(u=>!u.active&&u.side==='confederate'), blocker=e.state.find(u=>u.active&&u.side==='confederate');
 blocker.x=r.x;blocker.y=r.y;e.time=r.arrivalTime;e.activateReinforcements();assert.equal(r.active,false);assert.equal(r.arrivalBlocked,true);
 blocker.x=100;blocker.y=100;e.activateReinforcements();assert.equal(r.active,true);assert.equal(r.participated,true);assert.equal(r.arrivalBlocked,false);
 r.active=false;r.withdrawn=true;e.activateReinforcements();assert.equal(r.active,false);
});
await test('field formations block friendly fire and cannot move through an enemy',()=>{
 const e=make('cold_harbor');e.state.forEach(u=>{u.active=false;u.arrivalTime=null;});
 const [a,b]=e.state.filter(u=>u.side==='confederate'),foe=e.state.find(u=>u.side==='union');
 Object.assign(a,{active:true,x:600,y:700,target:{x:600,y:700}});Object.assign(b,{active:true,x:600,y:600});Object.assign(foe,{active:true,x:600,y:480,ammunition:0});
 assert.equal(gettysburgLineOfFire(e,a,foe),false);b.active=false;assert.equal(gettysburgLineOfFire(e,a,foe),true);e.move(a.id,{x:600,y:400});
 for(let i=0;i<300;i++){e.tick(.05);assert.ok(Math.hypot(a.x-foe.x,a.y-foe.y)>=gettysburgClearance(a,foe)-.1);}
});
await test('new save envelopes opt in while old envelopes and past results retain their rules',()=>{
 const scene={id:'first',title:'First',turn:1,choices:[{id:'a',text:'A'}]},fresh=createFreshCampaignState(1861,'first');assert.equal(fresh.battleRulesVersion,18);assert.notEqual(calculateCampaignAssessment(fresh).status,'unavailable');
 const snap=createCampaignSnapshot(fresh,scene);assert.equal(snap.version,22);assert.equal(restoreCampaignFromSnapshot(snap,[scene]).state.battleRulesVersion,18);
 for(const version of [6,7]){const old=structuredClone(snap);old.version=version;old.state.battleRulesVersion=version===6?2:3;assert.equal(restoreCampaignFromSnapshot(old,[scene]).state.battleRulesVersion,old.state.battleRulesVersion);old.state.battleRulesVersion=4;assert.equal(getCampaignSnapshotCompatibility(old).ok,false);}
 assert.equal(new CivilWarBattleEngine('gettysburg',fresh,'option_a').battleRulesVersion,18);
});
if(process.env.FIELD_REPORT)writeFileSync(process.env.FIELD_REPORT,JSON.stringify({engineVersion:4,profiles:ids.length,trials:results.length,results},null,2));
