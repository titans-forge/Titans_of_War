import { fieldTerrain, fieldExitTargets } from '../src/battle/fieldBattleProfiles.js';
import { closeCombatPairs } from '../src/battle/closeCombat.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { landmarkField, landmarksFor, formationLandmarkBlocker, landmarkMoveClear, landmarkClearance } from '../src/battle/historicalLandmarks.js';
import { gettysburgLineOfFire, resolveGettysburgVolley } from '../src/battle/gettysburgMechanics.js';
import { previewGroupOrder } from '../src/battle/groupOrders.js';
import { createFreshCampaignState, createCampaignSnapshot, getCampaignSnapshotCompatibility, restoreCampaignFromSnapshot } from '../src/game/campaignStorage.js';
const ids=['first_manassas','chickamauga'];
const make=(id,version=13,choice='option_b',enemyDoctrine='reserve')=>new CivilWarBattleEngine(id,{rulesVersion:2,battleRulesVersion:version,enemyDoctrine},choice);
function movementFixture(id,type) {
  const e=make(id),u=e.state.find(v=>v.type===type),site=landmarkField(e).landmarks[0];
  e.state.forEach(v=>{v.active=v.id===u.id;v.arrivalTime=null;});u.side='confederate';
  // Keep the production fixed-step courier/movement/limbering loop; isolate
  // routing geometry from enemy AI, scenario scripts and battle adjudication.
  e.updateFieldCommand=()=>{};e.activateReinforcements=()=>{};e.updateScenarioEvents=()=>{};e.judgeOutcome=()=>{};
  return {e,u,site};
}
test('new rules 13 round-trip while envelope 16 preserves the previous maps',()=>{
 const scene={id:'first',title:'First',turn:1,choices:[{id:'a',text:'A'}]};
 const save=createCampaignSnapshot(createFreshCampaignState(1,scene.id,{battleRulesVersion:13}),scene);
 assert.equal(save.version,22);assert.equal(save.state.battleRulesVersion,13);assert.equal(restoreCampaignFromSnapshot(save,[scene]).state.battleRulesVersion,13);
 save.version=16;assert.equal(getCampaignSnapshotCompatibility(save).ok,false);save.state.battleRulesVersion=12;
 assert.equal(restoreCampaignFromSnapshot(save,[scene]).state.battleRulesVersion,12);
 for(const id of ids){assert.equal(landmarksFor(id,12).length,1);assert.equal(landmarksFor(id,13).length,2);}
 for(const id of ['third_winchester','cedar_creek','shiloh','chancellorsville','wilderness','cold_harbor','petersburg','gettysburg','gettysburg_jackson'])assert.deepEqual(landmarksFor(id,12),landmarksFor(id,13));
});
test('all openings and doctrines leave initial troops and scheduled arrivals clear of new footprints',()=>{
  for(const id of ids)for(const choice of ['option_a','option_b','option_c','option_d'])for(const doctrine of ['reserve','flank','depth']){
    const e=make(id,13,choice,doctrine);for(const u of e.state)assert.equal(formationLandmarkBlocker(landmarkField(e),u),undefined,`${id}/${choice}/${doctrine}/${u.id}`);
    const snapshot=e.snapshot();landmarkField(snapshot).landmarks[0].width=999;assert.notEqual(landmarkField(e).landmarks[0].width,999);
  }
});
for(const id of ids)for(const type of ['infantry','artillery'])for(const direction of ['east','west','north','south'])test(`${id}: ${type} routes ${direction} around the landmark`,()=>{
  const {e,u,site}=movementFixture(id,type),vertical=['north','south'].includes(direction),axis=vertical?'y':'x',sign=['west','north'].includes(direction)?-1:1;
  const distance=(vertical?site.height:site.width)/2+landmarkClearance(u)+65;
  Object.assign(u,{x:site.x,y:site.y,facing:vertical?sign*Math.PI/2:sign>0?0:Math.PI});u[axis]-=sign*distance;
  const target={x:site.x,y:site.y};target[axis]+=sign*distance;
  if(vertical){u.y=sign<0?(id==='first_manassas'?700:410):40;target.y=sign<0?40:(id==='first_manassas'?700:410);}
  assert.equal(formationLandmarkBlocker(landmarkField(e),u),undefined,'route fixture starts clear of every building');
  assert.equal(e.move(u.id,target),true);let detour=0;
  for(let i=0;i<2500&&(u.pendingCommand||u.order!=='hold');i++){
    const previous={...u};e.tick(.05);assert.equal(landmarkMoveClear(landmarkField(e),previous,u),true,'movement segment crosses a building');
    assert.equal(formationLandmarkBlocker(landmarkField(e),u),undefined);detour=Math.max(detour,Math.abs(u[vertical?'x':'y']-site[vertical?'x':'y']));
  }
  assert.ok(Math.hypot(u.x-target.x,u.y-target.y)<3,`${u.x},${u.y}: ${u.pressureReason}`);assert.ok(detour>(vertical?site.width:site.height)/2);
  if(type==='artillery'){for(let i=0;i<110;i++)e.tick(.05);assert.equal(u.gunState,'deployed');assert.equal(formationLandmarkBlocker(landmarkField(e),u),undefined);}
});
test('new landmark destinations reject individual and group commands without sending a courier',()=>{
  for(const id of ids){const e=make(id),site=landmarkField(e).landmarks[0],units=e.state.filter(u=>u.side==='confederate'&&u.active).slice(0,2),before=structuredClone(e.state);
    assert.equal(e.move(units[0].id,site),false);
    const plan=previewGroupOrder(e.snapshot(),{ids:units.map(u=>u.id),order:'move',layout:'line',point:{x:site.x+80,y:site.y}},e.world);
    assert.ok(plan.error?.includes(site.name));assert.deepEqual(e.state,before);
  }
});
test('new houses block bilateral volleys but leave adjacent firing lanes open',()=>{
  for(const id of ids){const e=make(id),site=landmarkField(e).landmarks[0],a=e.state.find(u=>u.side==='confederate'),b=e.state.find(u=>u.side==='union');e.state=[a,b];
    // Isolate masonry occlusion from the battles' independent woodland visibility caps.
    Object.assign(a,{x:site.x,y:site.y+site.height/2+75,facing:-Math.PI/2,visibilityLimit:1000});Object.assign(b,{x:site.x,y:site.y-site.height/2-75,facing:Math.PI/2,visibilityLimit:1000});
    assert.equal(gettysburgLineOfFire(e,a,b),false);assert.equal(gettysburgLineOfFire(e,b,a),false);const before=structuredClone(e.state);
    resolveGettysburgVolley(e,a,b);resolveGettysburgVolley(e,b,a);assert.deepEqual(e.state,before);
    a.x=b.x=site.x+site.width/2+75;assert.equal(gettysburgLineOfFire(e,a,b),true);
  }
});
test('rules 13 movement and events remain equal under 1x and 4x display steps',()=>{
  for(const id of ids){const a=make(id),b=make(id),u=a.state.find(u=>u.side==='confederate'&&u.active);a.order(u.id,'advance');b.order(u.id,'advance');
    for(let i=0;i<800;i++)a.tick(.05);for(let i=0;i<200;i++)b.tick(.2);assert.deepEqual(a.state,b.state);assert.deepEqual(a.events,b.events);
  }
});
test('Stone House and Snodgrass art ships as original full-resolution RGBA PNGs',()=>{
  for(const id of ids){const site=landmarksFor(id,13)[0],png=readFileSync(new URL(`../public/${site.src}`,import.meta.url));assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png[25],6);assert.ok(png.readUInt32BE(16)>=1024);assert.ok(png.length>100000);}
});

test('both new battlefields reject widening a column into masonry',()=>{
 for(const id of ids){const e=make(id),site=landmarkField(e).landmarks[0],u=e.state.find(v=>v.side==='confederate');e.state=[u];
  Object.assign(u,{x:site.x+site.width/2+60,y:site.y,formationMode:'column'});
  assert.equal(formationLandmarkBlocker(landmarkField(e),u),undefined);
  assert.equal(e.setFormation(u.id,'line'),false);assert.equal(u.formationMode,'column');
 }
});
test('buildings prevent close combat across the two houses',()=>{
 for(const id of ids){const e=make(id),site=landmarkField(e).landmarks[0],a=e.state.find(v=>v.side==='confederate'),b=e.state.find(v=>v.side==='union');e.state=[a,b];
  Object.assign(a,{x:site.x,y:site.y+site.height/2+1,facing:-Math.PI/2,formationMode:'column',visibilityLimit:1000});Object.assign(b,{x:site.x,y:site.y-site.height/2-1,facing:Math.PI/2,formationMode:'column',visibilityLimit:1000});
  assert.equal(closeCombatPairs(e).length,0);a.x=b.x=site.x+site.width/2+100;assert.equal(closeCombatPairs(e).length,1);
 }
});
test('a scheduled arrival inside either landmark waits until its footprint is clear',()=>{
 for(const id of ids){const e=make(id),site=landmarkField(e).landmarks[0],u=e.state.find(v=>v.side==='union');
  e.state.forEach(v=>{v.arrivalTime=null;v.active=false;});Object.assign(u,{active:false,participated:false,arrivalTime:.05,x:site.x,y:site.y});
  e.time=.1;e.activateReinforcements();assert.equal(u.active,false);assert.equal(u.arrivalBlocked,true);
  u.x=site.x+site.width/2+160;e.activateReinforcements();assert.equal(u.active,true);assert.equal(u.arrivalBlocked,false);assert.equal(formationLandmarkBlocker(landmarkField(e),u),undefined);
 }
});


test('farm surroundings preserve terrain rules and their drawing balances canvas state',async()=>{
 const {landmarkSurroundings,drawLandmarkSurroundings}=await import('../src/battle/landmarkSurroundings.js');
 for(const id of ids){
  const e=make(id),old=make(id,12),site=landmarkField(e).landmarks[0],before=JSON.stringify(e.snapshot());
  assert.deepEqual(e.fieldBattle.zones,old.fieldBattle.zones);
  const layout=landmarkSurroundings(site),fresh=landmarkSurroundings(site);layout.lanes[0][0].x=-999;assert.notEqual(fresh.lanes[0][0].x,-999);
  let depth=0;const ctx=new Proxy({save(){depth++;},restore(){depth--;assert.ok(depth>=0);}},{get:(o,k)=>o[k]||(()=>{})});
  assert.equal(drawLandmarkSurroundings(ctx,site,7),true);assert.equal(depth,0);assert.equal(JSON.stringify(e.snapshot()),before);
  assert.equal(drawLandmarkSurroundings(ctx,{id:'unknown'},7),false);
 }
});
