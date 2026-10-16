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
const ids=['wilderness','cold_harbor'];
const make=(id,version=11,choice='option_b',enemyDoctrine='reserve')=>new CivilWarBattleEngine(id,{rulesVersion:2,battleRulesVersion:version,enemyDoctrine},choice);
function movementFixture(id,type) {
  const e=make(id),u=e.state.find(v=>v.type===type),site=landmarkField(e).landmarks[0];
  e.state.forEach(v=>{v.active=v.id===u.id;v.arrivalTime=null;});u.side='confederate';
  // Keep the production fixed-step courier/movement/limbering loop; isolate
  // routing geometry from enemy AI, scenario scripts and battle adjudication.
  e.updateFieldCommand=()=>{};e.activateReinforcements=()=>{};e.updateScenarioEvents=()=>{};e.judgeOutcome=()=>{};
  return {e,u,site};
}
test('rules 11 round-trip while envelope 14 preserves the original Wilderness and Cold Harbor',()=>{
 const scene={id:'first',title:'First',turn:1,choices:[{id:'a',text:'A'}]};
 const save=createCampaignSnapshot(createFreshCampaignState(1,scene.id,{battleRulesVersion:11}),scene);
 assert.equal(save.version,22);assert.equal(save.state.battleRulesVersion,11);assert.equal(restoreCampaignFromSnapshot(save,[scene]).state.battleRulesVersion,11);
 save.version=14;assert.equal(getCampaignSnapshotCompatibility(save).ok,false);save.state.battleRulesVersion=10;
 assert.equal(restoreCampaignFromSnapshot(save,[scene]).state.battleRulesVersion,10);
 for(const id of ids){assert.deepEqual(landmarkField(make(id,10)).landmarks,[]);assert.equal(landmarkField(make(id,11)).landmarks.length,1);}
 for(const id of ['first_manassas','third_winchester','cedar_creek','shiloh','chancellorsville','chickamauga','gettysburg','gettysburg_jackson'])assert.deepEqual(landmarksFor(id,10),landmarksFor(id,11));
});
test('all openings and doctrines leave initial troops and scheduled arrivals clear of new footprints',()=>{
  for(const id of ids)for(const choice of ['option_a','option_b','option_c','option_d'])for(const doctrine of ['reserve','flank','depth']){
    const e=make(id,11,choice,doctrine);for(const u of e.state)assert.equal(formationLandmarkBlocker(landmarkField(e),u),undefined,`${id}/${choice}/${doctrine}/${u.id}`);
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
test('rules 11 movement and events remain equal under 1x and 4x display steps',()=>{
  for(const id of ids){const a=make(id),b=make(id),u=a.state.find(u=>u.side==='confederate'&&u.active);a.order(u.id,'advance');b.order(u.id,'advance');
    for(let i=0;i<800;i++)a.tick(.05);for(let i=0;i<200;i++)b.tick(.2);assert.deepEqual(a.state,b.state);assert.deepEqual(a.events,b.events);
  }
});
test('Tapp and Garthright art ships as original full-resolution RGBA PNGs',()=>{
  for(const id of ids){const site=landmarksFor(id,11)[0],png=readFileSync(new URL(`../public/${site.src}`,import.meta.url));assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png[25],6);assert.ok(png.readUInt32BE(16)>=1024);assert.ok(png.length>100000);}
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

test('Tapp clearing changes cover and pace without changing visibility or the Plank Road',()=>{
 const e=make('wilderness'),old=make('wilderness',10),point={x:370,y:500};
 assert.equal(e.fieldBattle.zones.filter(z=>z.name==='Tapp farm clearing').length,1);
 assert.equal(fieldTerrain(e,point).defense,1);assert.equal(fieldTerrain(e,point).movement,1);
 assert.equal(fieldTerrain(old,point).defense,1.1);assert.equal(fieldTerrain(old,point).movement,.72);
 assert.equal(fieldTerrain(e,{x:370,y:625}).name,'Orange Plank Road');
 const u=e.state.find(v=>v.id==='hill-heth-line');assert.equal(u.visibilityLimit,old.state.find(v=>v.id===u.id).visibilityLimit);
 assert.equal(landmarkMoveClear(e.fieldBattle,{...u,x:100,y:625},{x:1500,y:625}),true);
 assert.equal(landmarkMoveClear(e.fieldBattle,{...u,x:910,y:850},{x:910,y:400}),true);
 const copy=e.snapshot();copy.fieldBattle.zones.at(-1).left=0;assert.equal(e.fieldBattle.zones.at(-1).left,130);
});
test('waiting at the Wilderness still delivers Texans and Longstreet with clear deployment space',()=>{
 const e=make('wilderness');
 for(let i=0;i<401;i++)e.tick(.05);
 for(const id of ['texas-brigade','longstreet-first-corps']){const u=e.state.find(v=>v.id===id);assert.equal(u.active,true);assert.equal(formationLandmarkBlocker(e.fieldBattle,u),undefined);}
 assert.equal(e.prematureCommitment,false);
});
test('Cold Harbor retains prepared works and both Petersburg transfer lanes',()=>{
 const e=make('cold_harbor',11,'option_d'),old=make('cold_harbor',10,'option_d');
 assert.deepEqual(e.fieldBattle.zones,old.fieldBattle.zones);
 for(const id of e.config.transferFormationIds){const u=e.state.find(v=>v.id===id);for(const target of fieldExitTargets(e,u))assert.equal(landmarkMoveClear(e.fieldBattle,u,target),true);}
 assert.equal(make('cold_harbor').terrainDefense({x:600,y:650}),make('cold_harbor',10).terrainDefense({x:600,y:650}));
 assert.equal(fieldTerrain(e,{x:550,y:170}).defense,1);
});
