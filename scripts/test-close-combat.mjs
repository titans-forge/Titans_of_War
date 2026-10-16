import test from 'node:test';
import assert from 'node:assert/strict';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { closeCombatDistance, closeCombatPairs, resolveContactCombat } from '../src/battle/closeCombat.js';
import { createFormationVisual, updateFormationVisual } from '../src/battle/formationVisualState.js';
import { periodStandardFor, drawPeriodStandard, flagClothPoint, updatePeriodStandard } from '../src/battle/periodStandards.js';
import { synthesizeMelee, BattleAudioManager } from '../src/engine/BattleAudioManager.js';
import { createFreshCampaignState, createCampaignSnapshot, getCampaignSnapshotCompatibility, restoreCampaignFromSnapshot } from '../src/game/campaignStorage.js';
const metrics={militaryStrength:85,munitions:80,foodSupply:78,publicMorale:80,treasury:75};
test('flag cloth stays pinned to its pole with bounded, individually phased ripples', () => {
 for (const width of [34,48]) for (const time of [0,.1,1,5,100]) for (const phase of [0,1,3,5]) {
  for (const y of [-62,-45,-28]) assert.deepEqual(flagClothPoint(3,y,time,phase,width),{x:3,y});
  for (let x=3;x<=3+width;x++) {
   const p=flagClothPoint(x,-45,time,phase,width);
   assert.ok(Math.abs(p.x-x)<=1.31 && Math.abs(p.y+45)<=2.26);
  }
 }
 assert.notDeepEqual(flagClothPoint(51,-45,1,0),flagClothPoint(51,-45,1,3));
});
test('all flag designs ripple coherently; pause and reduced motion reuse the drawing', () => {
 for (const side of ['union','confederate']) for (const field of ['gettysburg','first_manassas','third_winchester']) {
  const g={calls:[],clears:0,clear(){this.calls=[];this.clears++;return this;}};
  for (const name of ['fillStyle','lineStyle','fillPoints','fillRect','lineBetween','beginPath','moveTo','lineTo','strokePath']) g[name]=(...args)=>{g.calls.push([name,...args]);return g;};
  updatePeriodStandard(g,side,field,1,.7);const a=JSON.stringify(g.calls);
  updatePeriodStandard(g,side,field,1,.7);assert.equal(g.clears,1);assert.equal(JSON.stringify(g.calls),a);
  updatePeriodStandard(g,side,field,2,.7);assert.notEqual(JSON.stringify(g.calls),a);
  updatePeriodStandard(g,side,field,2,.7,true);const still=JSON.stringify(g.calls),clears=g.clears;
  updatePeriodStandard(g,side,field,3,.7,true);assert.equal(g.clears,clears);assert.equal(JSON.stringify(g.calls),still);
  assert.ok(g.calls.some(call=>call[0]==='fillRect'),'reduced motion uses the original flat design');
 }
});
const make=(version=7)=>new CivilWarBattleEngine('third_winchester',{rulesVersion:2,battleRulesVersion:version,seed:1861,metrics},'option_a');
function fixture() {
 const e=make();e.state=e.state.filter(u=>u.type==='infantry').filter((u,i,all)=>all.findIndex(v=>v.side===u.side)===i);
 const [a,b]=e.state;a.x=650;a.y=600;b.x=650;b.y=500;a.facing=-Math.PI/2;b.facing=Math.PI/2;
 for(const u of e.state)Object.assign(u,{strength:3000,initialStrength:3000,morale:90,cohesion:90,fatigue:0,status:'steady',order:'hold',formationMode:'line',frontage:150,ammunition:0,active:true,arrivalTime:null});
 b.y=a.y-closeCombatDistance(a,b)+1;e.fieldLineOfFire=()=>true;return e;
}
test('enemy contact harms both formations, spends no ammunition, and leaves positions intact',()=>{
 const e=fixture(),before=structuredClone(e.state);e.time=1;resolveContactCombat(e,.05);
 for(const [i,u]of e.state.entries()){assert.ok(u.strength<before[i].strength);assert.ok(u.cohesion<before[i].cohesion);assert.ok(u.inMelee);assert.equal(u.ammunition,0);assert.equal(u.x,before[i].x);assert.equal(u.y,before[i].y);}
 assert.equal(e.snapshot({presentation:true}).combatEvents.filter(v=>v.type==='melee').length,1);
});
test('contact losses are independent of formation iteration order',()=>{
 const a=fixture(),b=fixture();b.state.reverse();for(let i=0;i<100;i++){a.time+=.05;b.time+=.05;resolveContactCombat(a,.05);resolveContactCombat(b,.05);}
 assert.deepEqual(a.state.map(u=>[u.id,u.strength,u.morale,u.cohesion]).sort(),b.state.map(u=>[u.id,u.strength,u.morale,u.cohesion]).sort());
});
for(const kind of ['friendly','distant','departed','routed-both','blocked-terrain'])test(`${kind} formations cannot create a fresh melee`,()=>{
 const e=fixture(),[a,b]=e.state;
 if(kind==='friendly')b.side=a.side;if(kind==='distant')b.y-=100;if(kind==='departed')b.active=false;if(kind==='routed-both')for(const u of e.state)u.status='routing';if(kind==='blocked-terrain')e.fieldLineOfFire=()=>false;
 const before=e.state.map(u=>u.strength);resolveContactCombat(e,.05);assert.equal(closeCombatPairs(e).length,0);assert.deepEqual(e.state.map(u=>u.strength),before);
});
test('fallback retains its order, can defend, and stops taking melee damage after separation',()=>{
 const e=fixture(),a=e.state[0];a.order='fallback';e.time=1;resolveContactCombat(e,.05);assert.equal(a.order,'fallback');assert.ok(a.strength<3000);
 a.y+=120;const hp=e.state.map(u=>u.strength);e.time+=1;resolveContactCombat(e,.05);assert.deepEqual(e.state.map(u=>u.strength),hp);assert.ok(e.state.every(u=>!u.inMelee));
});
test('contact does not multiply outgoing strength against several opponents',()=>{
 const a=fixture(),b=fixture();b.state.push({...b.state[1],id:'second-enemy',x:b.state[1].x+5});resolveContactCombat(a,.05);resolveContactCombat(b,.05);
 const single=3000-a.state[1].strength,multiple=b.state.slice(1).reduce((n,u)=>n+3000-u.strength,0);assert.ok(Math.abs(single-multiple)<.00001);
});
test('version 6 and completed battles retain their original state',()=>{
 for(const version of [6,7]){const e=fixture();e.battleRulesVersion=version;if(version===7)e.pendingOutcome='defeat';const before=structuredClone(e.state);resolveContactCombat(e,.05);assert.deepEqual(e.state,before);}
});
test('real contact losses remove visible figures on both sides; melee poses freeze when paused',()=>{
 const e=fixture(),visual=e.state.map(u=>createFormationVisual(u,32));for(let i=0;i<200;i++){e.time+=.05;resolveContactCombat(e,.05);}
 for(const [i,u] of e.state.entries()){
  const frame={...u,footprint:{width:160,depth:36}};const out=updateFormationVisual(visual[i],frame,e.time,.82);
  assert.ok(out.figures.filter(f=>f.visible&&!f.fallen).length<32);assert.ok(out.figures.some(f=>f.action==='melee'));
  assert.deepEqual(updateFormationVisual(visual[i],frame,e.time,.82),out);
 }
});
test('new engine stays deterministic at 1x and 4x, across Winchester and Gettysburg',()=>{
 for(const id of ['third_winchester','gettysburg']){
  const a=new CivilWarBattleEngine(id,{rulesVersion:2,battleRulesVersion:7,metrics},'option_a'),b=new CivilWarBattleEngine(id,{rulesVersion:2,battleRulesVersion:7,metrics},'option_a');
  for(const e of [a,b])for(const u of e.state.filter(u=>u.active&&u.side==='confederate'&&u.type==='infantry'))e.order(u.id,'assault');
  for(let i=0;i<600;i++)a.tick(.05);for(let i=0;i<150;i++)b.tick(.2);assert.deepEqual(a.state,b.state);assert.deepEqual(a.events,b.events);assert.equal(a.time,b.time);assert.equal(a.outcome,b.outcome);assert.ok(Math.abs((a.fieldBattle||a.gettysburg).accumulator-(b.fieldBattle||b.gettysburg).accumulator)<1e-12);
 }
});
test('new saves retain current rules while envelope 10 rejects them and accepts earlier rules',()=>{
 const scene={id:'first',title:'First',turn:1,choices:[{id:'a',text:'A'}]};const snap=createCampaignSnapshot(createFreshCampaignState(1,'first'),scene);assert.equal(snap.version,22);assert.equal(snap.state.battleRulesVersion,18);assert.equal(restoreCampaignFromSnapshot(snap,[scene]).state.battleRulesVersion,18);snap.version=10;assert.equal(getCampaignSnapshotCompatibility(snap).ok,false);snap.state.battleRulesVersion=6;assert.equal(getCampaignSnapshotCompatibility(snap).ok,true);
});
test('all eleven fields have period flag patterns; Winchester has 35 stars',()=>{
 for(const id of ['first_manassas','shiloh','chancellorsville','wilderness','third_winchester','cedar_creek','gettysburg','gettysburg_jackson','chickamauga','cold_harbor','petersburg'])for(const side of ['union','confederate'])assert.ok(['us-national','first-national','anv'].includes(periodStandardFor(side,id).pattern));
 assert.equal(periodStandardFor('union','third_winchester').stars,35);assert.equal(periodStandardFor('union','gettysburg').stars,34);assert.equal(periodStandardFor('confederate','first_manassas').pattern,'first-national');
 const g={stars:0,fillStyle(){return this},fillRect(){return this},lineStyle(){return this},lineBetween(){return this},fillPoints(){this.stars++;return this}};drawPeriodStandard(g,'union','third_winchester');assert.equal(g.stars,35);
});
test('metallic impact synthesis is finite, bounded, non-silent, and deterministic',()=>{
 const a=synthesizeMelee(44100),b=synthesizeMelee(44100);assert.deepEqual(a,b);assert.ok(a.every(Number.isFinite));assert.ok(Math.max(...a)<.81);assert.ok(Math.min(...a)>-.81);assert.ok(a.reduce((n,v)=>n+v*v,0)>1);
});
test('melee audio follows event IDs, is throttled, and is silenced on pause',async()=>{
 let played=0;const m=new BattleAudioManager();m.context={state:'running',currentTime:1};m.master={gain:{setTargetAtTime(){},cancelScheduledValues(){},setValueAtTime(){}}};m.play=key=>{assert.equal(key,'melee');played++;};const opts={enabled:true,speed:4};m.update([],opts);m.update([{id:1,type:'melee'},{id:2,type:'melee'}],opts);assert.equal(played,1);m.context.currentTime+=1;m.update([{id:3,type:'melee'}],{...opts,paused:true});m.update([{id:3,type:'melee'}],opts);assert.equal(played,1);
});

test('a larger corps cannot multiply melee power through an unchanged physical frontage',()=>{
 const a=fixture(),b=fixture();a.state[0].strength=a.state[0].initialStrength=6000;b.state[0].strength=b.state[0].initialStrength=18000;resolveContactCombat(a,.05);resolveContactCombat(b,.05);assert.equal(a.state[1].strength,b.state[1].strength);
});

test('Cold Harbor counts a sustained physical break-off, while preserving retreat orders',()=>{
 const e=new CivilWarBattleEngine('cold_harbor',{rulesVersion:2,battleRulesVersion:7,metrics},'option_b');e.coldHarborAssaultState='engaged';e.time=60;e.coldHarborCrossfireTriggered=true;
 const corps=e.state.filter(u=>e.config.assaultFormationIds.includes(u.id));for(const u of corps)Object.assign(u,{morale:80,cohesion:80,order:'hold',lastMeleeAt:59,y:650});for(const u of corps.slice(0,3))Object.assign(u,{order:'fallback',y:500,lastMeleeAt:53,inMelee:false});
 e.updateColdHarborEvents();assert.equal(e.coldHarborAssaultState,'engaged');e.time=61;e.updateColdHarborEvents();assert.equal(e.coldHarborAssaultState,'repulsed');assert.ok(corps.slice(0,3).every(u=>u.order==='fallback'));
});

test('melee formations turn toward contact without moving or firing a volley',()=>{
 for(const side of ['confederate','union']){
  const e=new CivilWarBattleEngine('gettysburg',{rulesVersion:2,battleRulesVersion:7,metrics},'option_a');
  e.state.forEach(u=>{u.active=false;u.arrivalTime=null;});
  e.gettysburg.nextAi=1000;
  const a=e.state.find(u=>u.side===side&&u.type==='infantry'), b=e.state.find(u=>u.side!==side&&u.type==='infantry');
  Object.assign(a,{active:true,x:700,y:600,facing:Math.PI,order:'hold',status:'steady',ammunition:100});
  Object.assign(b,{active:true,x:653,y:600,facing:0,order:'hold',status:'steady',ammunition:100});
  a.facing=Math.PI-.1;
  const before={x:a.x,y:a.y,facing:a.facing,ammunition:a.ammunition};e.tick(.05);
  assert.ok(Math.abs(a.facing-Math.PI)<Math.abs(before.facing-Math.PI));
  assert.equal(a.x,before.x);assert.equal(a.y,before.y);assert.equal(a.ammunition,before.ammunition);
  assert.ok(a.inMelee&&b.inMelee);
 }
});
test('melee turning respects a player-locked heading',()=>{
 const e=new CivilWarBattleEngine('gettysburg',{rulesVersion:2,battleRulesVersion:7,metrics},'option_a');
 e.state.forEach(u=>{u.active=false;u.arrivalTime=null;});e.gettysburg.nextAi=1000;
 const a=e.state[0],b=e.state.find(u=>u.side==='union'&&u.type==='infantry');
 Object.assign(a,{active:true,x:700,y:600,facing:Math.PI-.1,facingOrder:Math.PI-.1,order:'hold'});
 Object.assign(b,{active:true,x:653,y:600,facing:0,order:'hold'});
 const facing=a.facing;e.tick(.05);assert.equal(a.facing,facing);assert.ok(a.inMelee);
});
test('assault approach preserves left-to-right order independent of roster order',()=>{
 for(const reverse of [false,true]){
  const e=new CivilWarBattleEngine('first_manassas',{rulesVersion:2,battleRulesVersion:7,metrics},'option_a');
  e.state.forEach(u=>{if(u.side==='union'){u.active=false;u.arrivalTime=null;}});
  const ids=['jackson-brigade','bee-evans-line','hampton-reserve'];
  ids.forEach((id,i)=>{const u=e.state.find(v=>v.id===id);u.x=650+i*150;u.y=700;});
  if(reverse)e.state.reverse();
  for(const id of ids)assert.equal(e.order(id,'assault',{sectorId:'left'}),true);
  for(let i=0;i<45;i++)e.tick(.05);
  const targets=ids.map(id=>e.state.find(u=>u.id===id).target);
  assert.deepEqual(targets.map(p=>p.x),[665,800,950]);
  assert.ok(targets.every(p=>p.y===465));
 }
});
test('assault approach enters from the near edge when attacking northward or southward',()=>{
 for(const [y,expected] of [[700,465],[100,315]]){
  const e=new CivilWarBattleEngine('first_manassas',{rulesVersion:2,battleRulesVersion:7,metrics},'option_a');
  e.state.forEach(u=>{if(u.side==='union'){u.active=false;u.arrivalTime=null;}});
  const u=e.state.find(v=>v.id==='jackson-brigade');u.x=800;u.y=y;
  e.order(u.id,'assault',{sectorId:'left'});for(let i=0;i<45;i++)e.tick(.05);
  assert.equal(u.target.y,expected);assert.equal(u.target.x,800);
 }
});

 test('a blocked advance can fire down a clear lane without cancelling its destination; legacy rules remain unchanged',()=>{
for(const version of [6,7]){
const e=new CivilWarBattleEngine('gettysburg',{rulesVersion:2,battleRulesVersion:version,metrics:{militaryStrength:85,munitions:80,publicMorale:80,foodSupply:78,treasury:75}},'option_a');e.gettysburg.nextAi=1000;e.state.forEach(u=>{u.active=false;u.arrivalTime=null;});
const a=e.state[0],b=e.state.find(u=>u.side==='union'&&u.type==='infantry'),friend=e.state[1];
Object.assign(a,{active:true,x:700,y:700,facing:-Math.PI/2,order:'advance',directMove:true,target:{x:700,y:200},blockedTime:1,nextRouteAt:1000,reload:0});
Object.assign(b,{active:true,x:890,y:590,facing:Math.PI/2,order:'hold',ammunition:0});
Object.assign(friend,{active:true,x:700,y:656,facing:-Math.PI/2,order:'hold',ammunition:0});
let before=a.ammunition;for(let i=0;i<200;i++)e.tick(.05);assert.equal(a.order,'advance');assert.ok(a.blockedTime>0.5);assert.ok(Math.hypot(a.x-700,a.y-700)<3);if(version===7){assert.ok(a.ammunition<before);assert.ok(b.strength<b.initialStrength);}else assert.equal(a.ammunition,before);
}

});

test('turn-clearance advice is a non-mutating, collision-clear nearby move',async()=>{
 const {gettysburgTurnClearance,gettysburgClearance}=await import('../src/battle/gettysburgMechanics.js');
 const e=new CivilWarBattleEngine('first_manassas',{rulesVersion:2,battleRulesVersion:7,metrics},'option_a');
 e.state.forEach(u=>{u.active=false;u.arrivalTime=null;});
 const u=e.state.find(v=>v.id==='elzey-reinforcement'),friend=e.state.find(v=>v.id==='jackson-brigade'),enemy=e.state.find(v=>v.id==='sherman-brigade');
 Object.assign(u,{active:true,x:668,y:483,facing:-.08,formationMode:'line',order:'assault',turnBlocked:true,turnBlockerId:friend.id,inMelee:false,pendingCommand:null});
 Object.assign(friend,{active:true,x:710,y:480,facing:-.08,formationMode:'line'});
 Object.assign(enemy,{active:true,x:504,y:479,facing:.027,formationMode:'line'});
 const before=structuredClone(e.state),point=gettysburgTurnClearance(e,u);assert.ok(point);assert.deepEqual(e.state,before);assert.equal(point.blockerName,friend.name);assert.ok(Math.hypot(point.x-u.x,point.y-u.y)<=97);
 for(let i=0;i<72;i++)for(const v of [friend,enemy])assert.ok(Math.hypot(point.x-v.x,point.y-v.y)>=gettysburgClearance({...u,...point,facing:i*Math.PI/36},v));
 for(let i=1;i<=24;i++)for(const v of [friend,enemy]){const q={...u,x:u.x+(point.x-u.x)*i/24,y:u.y+(point.y-u.y)*i/24};assert.ok(Math.hypot(q.x-v.x,q.y-v.y)>=gettysburgClearance(q,v));}
 for(const props of [{status:'routing'},{inMelee:true},{order:'withdraw'},{order:'rally'},{pendingCommand:{order:'hold'}}]){const clone={...u,...props};assert.equal(gettysburgTurnClearance(e,clone),null);}
 u.turnBlocked=false;u.blockedTime=3;u.turnBlockerId=null;assert.ok(gettysburgTurnClearance(e,u));
 u.blockedTime=0;assert.equal(gettysburgTurnClearance(e,u),null);
 e.battleRulesVersion=6;assert.equal(gettysburgTurnClearance(e,u),null);
});
test('turn-clearance advice refuses a surrounded formation',async()=>{
 const {gettysburgTurnClearance}=await import('../src/battle/gettysburgMechanics.js');
 const e=new CivilWarBattleEngine('gettysburg',{rulesVersion:2,battleRulesVersion:7,metrics},'option_a');const u=e.state[0];
 Object.assign(u,{x:700,y:600,turnBlocked:true,turnBlockerId:e.state[1].id});
 for(const [i,v] of e.state.slice(1).entries())Object.assign(v,{active:true,x:700+70*Math.cos(i*Math.PI/4),y:600+70*Math.sin(i*Math.PI/4)});
 assert.equal(gettysburgTurnClearance(e,u),null);
});
test('assault firing status uses the same contact boundary as the melee engine',async()=>{
 const {gettysburgFireStatus}=await import('../src/battle/gettysburgMechanics.js');
 const e=new CivilWarBattleEngine('gettysburg',{rulesVersion:2,battleRulesVersion:7,metrics},'option_a');e.state.forEach(u=>{u.active=false;u.arrivalTime=null;});
 const u=e.state[0],v=e.state.find(u=>u.side==='union');
 Object.assign(u,{active:true,x:700,y:600,facing:-Math.PI/2,order:'assault',blockedTime:0,inMelee:false});Object.assign(v,{active:true,x:700,y:540,facing:Math.PI/2});
 assert.equal(gettysburgFireStatus(e,u),'Moving — halt to fire');
});
