import { closeCombatPairs } from '../src/battle/closeCombat.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { landmarkField, landmarksFor, formationLandmarkBlocker, landmarkMoveClear, landmarkClearance } from '../src/battle/historicalLandmarks.js';
import { gettysburgLineOfFire, resolveGettysburgVolley } from '../src/battle/gettysburgMechanics.js';
import { previewGroupOrder } from '../src/battle/groupOrders.js';
import { createFreshCampaignState, createCampaignSnapshot, getCampaignSnapshotCompatibility, restoreCampaignFromSnapshot } from '../src/game/campaignStorage.js';
const ids=['gettysburg','gettysburg_jackson'];
const make=(id,version=10,choice='option_b',enemyDoctrine='reserve')=>new CivilWarBattleEngine(id,{rulesVersion:2,battleRulesVersion:version,enemyDoctrine},choice);
function movementFixture(id,type) {
  const e=make(id),u=e.state.find(v=>v.type===type),site=landmarkField(e).landmarks[0];
  e.state.forEach(v=>{v.active=v.id===u.id;v.arrivalTime=null;});u.side='confederate';
  // Keep the production fixed-step courier/movement/limbering loop; isolate
  // routing geometry from enemy AI, scenario scripts and battle adjudication.
  e.updateFieldCommand=()=>{};e.activateReinforcements=()=>{};e.updateScenarioEvents=()=>{};e.judgeOutcome=()=>{};
  return {e,u,site};
}
test('rules 10 round-trip; envelope 13 retains rules 9 and its landmark layout',()=>{
  const scene={id:'first',title:'First',turn:1,choices:[{id:'a',text:'A'}]};
  const save=createCampaignSnapshot(createFreshCampaignState(1,scene.id,{battleRulesVersion:10}),scene);
  assert.equal(save.version,22);assert.equal(save.state.battleRulesVersion,10);assert.equal(restoreCampaignFromSnapshot(save,[scene]).state.battleRulesVersion,10);
  save.version=13;assert.equal(getCampaignSnapshotCompatibility(save).ok,false);
  save.state.battleRulesVersion=9;assert.equal(restoreCampaignFromSnapshot(save,[scene]).state.battleRulesVersion,9);
  for(const id of ids){assert.deepEqual(landmarkField(make(id,9))?.landmarks||[],[]);assert.equal(landmarkField(make(id,10)).landmarks.length,1);}
  for(const id of ['first_manassas','third_winchester','cedar_creek','shiloh','chancellorsville','chickamauga'])assert.deepEqual(landmarksFor(id,9),landmarksFor(id,10));
});
test('all openings and doctrines leave initial troops and scheduled arrivals clear of new footprints',()=>{
  for(const id of ids)for(const choice of ['option_a','option_b','option_c','option_d'])for(const doctrine of ['reserve','flank','depth']){
    const e=make(id,10,choice,doctrine);for(const u of e.state)assert.equal(formationLandmarkBlocker(landmarkField(e),u),undefined,`${id}/${choice}/${doctrine}/${u.id}`);
    const snapshot=e.snapshot();landmarkField(snapshot).landmarks[0].width=999;assert.notEqual(landmarkField(e).landmarks[0].width,999);
  }
});
for(const id of ids)for(const type of ['infantry','artillery'])for(const direction of ['east','west','north','south'])test(`${id}: ${type} routes ${direction} around the landmark`,()=>{
  const {e,u,site}=movementFixture(id,type),vertical=['north','south'].includes(direction),axis=vertical?'y':'x',sign=['west','north'].includes(direction)?-1:1;
  const distance=(vertical?site.height:site.width)/2+landmarkClearance(u)+65;
  Object.assign(u,{x:site.x,y:site.y,facing:vertical?sign*Math.PI/2:sign>0?0:Math.PI});u[axis]-=sign*distance;
  const target={x:site.x,y:site.y};target[axis]+=sign*distance;
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
test('rules 10 movement and events remain equal under 1x and 4x display steps',()=>{
  for(const id of ids){const a=make(id),b=make(id),u=a.state.find(u=>u.side==='confederate'&&u.active);a.order(u.id,'advance');b.order(u.id,'advance');
    for(let i=0;i<800;i++)a.tick(.05);for(let i=0;i<200;i++)b.tick(.2);assert.deepEqual(a.state,b.state);assert.deepEqual(a.events,b.events);
  }
});
test('Gettysburg landmark art ships as original full-resolution RGBA PNGs',()=>{
  for(const id of ids){const site=landmarksFor(id,10)[0],png=readFileSync(new URL(`../public/${site.src}`,import.meta.url));assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png[25],6);assert.ok(png.readUInt32BE(16)>=1024);assert.ok(png.length>100000);}
});

test('both Gettysburg systems reject widening a column into masonry',()=>{
 for(const id of ids){const e=make(id),site=landmarkField(e).landmarks[0],u=e.state.find(v=>v.side==='confederate');e.state=[u];
  Object.assign(u,{x:site.x+site.width/2+60,y:site.y,formationMode:'column'});
  assert.equal(formationLandmarkBlocker(landmarkField(e),u),undefined);
  assert.equal(e.setFormation(u.id,'line'),false);assert.equal(u.formationMode,'column');
 }
});
test('masonry prevents close combat across the gatehouse and headquarters',()=>{
 for(const id of ids){const e=make(id),site=landmarkField(e).landmarks[0],a=e.state.find(v=>v.side==='confederate'),b=e.state.find(v=>v.side==='union');e.state=[a,b];
  Object.assign(a,{x:site.x,y:site.y+site.height/2+1,facing:-Math.PI/2,formationMode:'column',visibilityLimit:1000});Object.assign(b,{x:site.x,y:site.y-site.height/2-1,facing:Math.PI/2,formationMode:'column',visibilityLimit:1000});
  assert.equal(closeCombatPairs(e).length,0);a.x=b.x=site.x+site.width/2+100;assert.equal(closeCombatPairs(e).length,1);
 }
});
test('a scheduled arrival inside either landmark waits until its footprint is clear',()=>{
 for(const id of ids){const e=make(id),site=landmarkField(e).landmarks[0],u=e.state.find(v=>v.side==='union');
  e.state.forEach(v=>{v.arrivalTime=null;});Object.assign(u,{active:false,participated:false,arrivalTime:.05,x:site.x,y:site.y});
  e.tick(.1);assert.equal(u.active,false);u.x=site.x+site.width/2+160;e.tick(.1);assert.equal(u.active,true);assert.equal(formationLandmarkBlocker(landmarkField(e),u),undefined);
 }
});
test('the July 3 battle retains ridge masking, sectors, wall cover and rear routes',()=>{
 const e=make('gettysburg');assert.equal(e.fieldBattle,undefined);assert.equal(e.gettysburg.sectors.length,3);
 const a=e.state.find(v=>v.side==='confederate'),b=e.state.find(v=>v.side==='union');e.state=[a,b];
 Object.assign(a,{x:790,y:500});Object.assign(b,{x:790,y:200});assert.equal(gettysburgLineOfFire(e,a,b),false);
 assert.equal(e.terrainDefense({x:1080,y:345}),1.38);
 assert.equal(landmarkMoveClear(landmarkField(e),{...a,x:180,y:260},{x:180,y:25}),true);
 assert.equal(landmarkMoveClear(landmarkField(e),{...a,x:1510,y:260},{x:1510,y:25}),true);
});
