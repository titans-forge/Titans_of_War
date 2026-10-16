import test from 'node:test';import assert from 'node:assert/strict';
import {CivilWarBattleEngine} from '../src/battle/civilWarEngine.js';import {coordinateEnemy} from '../src/battle/enemyCoordination.js';
import {createFormationVisual,updateFormationVisual} from '../src/battle/formationVisualState.js';
import {createFreshCampaignState,createCampaignSnapshot,getCampaignSnapshotCompatibility,restoreCampaignFromSnapshot} from '../src/game/campaignStorage.js';
const make=(id='shiloh',style='reserve',version=6)=>new CivilWarBattleEngine(id,{rulesVersion:2,battleRulesVersion:version,seed:1861,enemyDoctrine:style,metrics:{militaryStrength:85,munitions:80,foodSupply:78,publicMorale:80,treasury:75}},'option_a');
const threaten=e=>{e.time=40;e.state.filter(u=>u.side==='confederate').forEach((u,i)=>{if(u.active){u.x=e.fieldBattle.attackObjective.x+70+i*25;u.y=e.fieldBattle.attackObjective.y-120;}});};
test('three doctrines issue different physical assignments against the same concentration',()=>{
 const assignments=[];for(const style of ['reserve','flank','depth']){const e=make('shiloh',style);threaten(e);coordinateEnemy(e);assignments.push(e.fieldBattle.coordination.assignments);assert.ok(e.fieldBattle.coordination.assignments['hurlbut-division']);}assert.notDeepEqual(assignments[0],assignments[1]);assert.notDeepEqual(assignments[1],assignments[2]);
});
test('coordination never teleports, grants supplies, edits player orders, or replaces units',()=>{
 const e=make();threaten(e);const before=structuredClone(e.state);coordinateEnemy(e);assert.equal(e.state.length,before.length);for(const [i,u]of e.state.entries()){for(const k of ['x','y','strength','morale','cohesion','ammunition','active'])assert.equal(u[k],before[i][k],`${u.id}/${k}`);if(u.side==='confederate')assert.deepEqual(u,before[i]);}
});
for(const order of ['withdraw','fallback','rally'])test(`enemy ${order} orders are not cancelled`,()=>{const e=make();threaten(e);for(const u of e.state.filter(u=>u.side==='union'))u.order=order;coordinateEnemy(e);assert.ok(e.state.filter(u=>u.side==='union').every(u=>u.order===order));});
test('routing, ammunition-exhausted and low-cohesion defenders cannot be sent into fresh assaults',()=>{
 const e=make();threaten(e);e.state.find(u=>u.id==='hurlbut-division').status='routing';e.state.find(u=>u.id==='prentiss-division').ammunition=0;e.state.find(u=>u.id==='mcclernand-division').cohesion=20;coordinateEnemy(e);assert.deepEqual(e.fieldBattle.coordination.assignments,{});
});
test('stable planning intervals avoid repeated order spam',()=>{
 const e=make();threaten(e);coordinateEnemy(e);const before=structuredClone(e.fieldBattle.coordination),events=structuredClone(e.events);for(let i=0;i<100;i++)coordinateEnemy(e);assert.deepEqual(e.fieldBattle.coordination,before);assert.deepEqual(e.events,events);e.time+=8;coordinateEnemy(e);assert.deepEqual(e.events,events);
});
for(const id of ['first_manassas','shiloh'])test(`${id}: coordination is deterministic across display speeds`,()=>{const a=make(id),b=make(id);for(const e of [a,b])for(const u of e.state.filter(u=>u.side==='confederate'&&u.active))e.order(u.id,'advance');for(let i=0;i<800;i++)a.tick(.05);for(let i=0;i<200;i++)b.tick(.2);assert.deepEqual(a.state,b.state);assert.deepEqual(a.events,b.events);assert.deepEqual(a.fieldBattle.coordination,b.fieldBattle.coordination);});
test('v5 has no coordinator and its save envelope rejects v6',()=>{
 assert.equal(make('shiloh','reserve',5).fieldBattle.coordination,undefined);const scene={id:'first',title:'First',turn:1,choices:[{id:'a',text:'A'}]},snap=createCampaignSnapshot(createFreshCampaignState(1,'first'),scene);assert.equal(snap.version,22);assert.equal(snap.state.battleRulesVersion,18);snap.version=9;assert.equal(getCampaignSnapshotCompatibility(snap).ok,false);snap.state.battleRulesVersion=5;assert.equal(restoreCampaignFromSnapshot(snap,[scene]).state.battleRulesVersion,5);
});
const unit=(extra={})=>({id:'animation-fixture',side:'confederate',type:'infantry',active:true,x:500,y:500,facing:0,frontage:160,formationMode:'line',footprint:{width:160,depth:36},strength:1000,initialStrength:1000,status:'steady',order:'hold',engagedWith:null,lastVolleyAt:-100,reload:0,...extra});
test('turning in place steps feet within the physical footprint',()=>{
 const u=unit(),v=createFormationVisual(u,32);updateFormationVisual(v,u,0,.82);const out=updateFormationVisual(v,{...u,facing:.2},.1,.82);assert.equal(out.moving,false);assert.ok(out.figures.some(f=>f.action==='walk'));assert.equal(out.facing,.2);for(const f of out.figures){const x=f.x-u.x,y=f.y-u.y;assert.ok(Math.abs(-Math.sin(.2)*x+Math.cos(.2)*y)<=80);assert.ok(Math.abs(Math.cos(.2)*x+Math.sin(.2)*y)<=18);}
});
test('firing fallback shows front-rank shots and marching rear ranks together',()=>{
 const u=unit({order:'fallback'}),v=createFormationVisual(u,32);updateFormationVisual(v,u,0,.82);const out=updateFormationVisual(v,{...u,x:497,lastVolleyAt:.1,reload:3,engagedWith:'foe'},.3,.82);assert.ok(out.figures.filter(f=>f.frontRank).every(f=>f.action==='fire'));assert.ok(out.figures.filter(f=>!f.frontRank).every(f=>f.action==='walk'));assert.ok(out.figures.some(f=>f.bodyOffsetX<0));
});
test('formation transitions preserve identities and close ranks over time',()=>{
 const u=unit(),v=createFormationVisual(u,32);updateFormationVisual(v,u,0,.82);const c={...u,formationMode:'column',footprint:{width:60,depth:100}};const first=structuredClone(updateFormationVisual(v,c,.05,.82));assert.ok(v.assembling);const later=updateFormationVisual(v,c,1,.82);assert.deepEqual(first.figures.map(f=>f.id),later.figures.map(f=>f.id));assert.notDeepEqual(first.figures.map(f=>[f.x,f.y]),later.figures.map(f=>[f.x,f.y]));for(const f of later.figures){assert.ok(Math.abs(f.y-c.y)<=30);assert.ok(Math.abs(f.x-c.x)<=50);}
});
test('pause freezes motion; changed facing invalidates the cached pose',()=>{
 const u=unit(),v=createFormationVisual(u,32);updateFormationVisual(v,u,0,.82);const moved={...u,x:510},out=structuredClone(updateFormationVisual(v,moved,.5,.82));for(let n=0;n<20;n++)assert.deepEqual(updateFormationVisual(v,moved,.5,.82),out);const faced=updateFormationVisual(v,{...moved,facing:Math.PI/2},.5,.82);assert.equal(faced.facing,Math.PI/2);assert.ok(faced.figures.every(f=>f.direction===2));
});
test('reduced motion removes bounce, lean and recoil without moving feet or changing the simulation',()=>{
 const u=Object.freeze(unit()),a=createFormationVisual(u,32),b=createFormationVisual(u,32);updateFormationVisual(a,u,0,.82);updateFormationVisual(b,u,0,.82);const moved=Object.freeze({...u,x:513}),before=structuredClone(moved),x=updateFormationVisual(a,moved,1,.82),y=updateFormationVisual(b,moved,1,.82,{reducedMotion:true});assert.deepEqual(moved,before);assert.deepEqual(x.footprint,y.footprint);assert.deepEqual(x.figures.map(f=>[f.x,f.y]),y.figures.map(f=>[f.x,f.y]));assert.ok(x.figures.some(f=>f.bodyOffsetY<0));assert.ok(y.figures.every(f=>!f.bodyOffsetX&&!f.bodyOffsetY&&!f.lean));
});
