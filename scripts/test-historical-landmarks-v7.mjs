import { gettysburgTerrain } from '../src/battle/gettysburgMechanics.js';
import { closeCombatPairs } from '../src/battle/closeCombat.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { landmarkField, landmarksFor, formationLandmarkBlocker, landmarkMoveClear, landmarkClearance } from '../src/battle/historicalLandmarks.js';
import { gettysburgLineOfFire, resolveGettysburgVolley } from '../src/battle/gettysburgMechanics.js';
import { previewGroupOrder } from '../src/battle/groupOrders.js';
import { createFreshCampaignState, createCampaignSnapshot, getCampaignSnapshotCompatibility, restoreCampaignFromSnapshot } from '../src/game/campaignStorage.js';
const ids=['gettysburg'];
const make=(id,version=17,choice='option_b',enemyDoctrine='reserve')=>new CivilWarBattleEngine(id,{rulesVersion:2,battleRulesVersion:version,enemyDoctrine},choice);
function movementFixture(id,type) {
  const e=make(id),u=e.state.find(v=>v.type===type),site=landmarkField(e).landmarks[0];
  e.state.forEach(v=>{v.active=v.id===u.id;v.arrivalTime=null;});u.side='confederate';
  // Keep the production fixed-step courier/movement/limbering loop; isolate
  // routing geometry from enemy AI, scenario scripts and battle adjudication.
  e.updateFieldCommand=()=>{};e.activateReinforcements=()=>{};e.updateScenarioEvents=()=>{};e.judgeOutcome=()=>{};
  return {e,u,site};
}
test('rules 17 round-trip while envelope 20 preserves rules 16',()=>{
 const scene={id:'first',title:'First',turn:1,choices:[{id:'a',text:'A'}]};
 const save=createCampaignSnapshot(createFreshCampaignState(1,scene.id,{battleRulesVersion:17}),scene);
 assert.equal(save.version,22);assert.equal(save.state.battleRulesVersion,17);assert.equal(restoreCampaignFromSnapshot(save,[scene]).state.battleRulesVersion,17);
 save.version=20;assert.equal(getCampaignSnapshotCompatibility(save).ok,false);save.state.battleRulesVersion=16;
 assert.equal(restoreCampaignFromSnapshot(save,[scene]).state.battleRulesVersion,16);
 for(const id of ids){assert.equal(landmarksFor(id,16).length,1);assert.equal(landmarksFor(id,17).length,2);}
 for(const id of ['third_winchester','first_manassas','shiloh','chickamauga','wilderness','cold_harbor','petersburg','gettysburg_jackson','cedar_creek','chancellorsville'])assert.deepEqual(landmarksFor(id,16),landmarksFor(id,17));
});
test('all openings and doctrines leave initial troops and scheduled arrivals clear of new footprints',()=>{
  for(const id of ids)for(const choice of ['option_a','option_b','option_c','option_d'])for(const doctrine of ['reserve','flank','depth']){
    const e=make(id,17,choice,doctrine);for(const u of e.state)assert.equal(formationLandmarkBlocker(landmarkField(e),u),undefined,`${id}/${choice}/${doctrine}/${u.id}`);
    const snapshot=e.snapshot();landmarkField(snapshot).landmarks[0].width=999;assert.notEqual(landmarkField(e).landmarks[0].width,999);
  }
});
for(const id of ids)for(const type of ['infantry','artillery'])for(const direction of ['east','west','north','south'])test(`${id}: ${type} routes ${direction} around the landmark`,()=>{
  const {e,u,site}=movementFixture(id,type),vertical=['north','south'].includes(direction),axis=vertical?'y':'x',sign=['west','north'].includes(direction)?-1:1;
  const distance=(vertical?site.height:site.width)/2+landmarkClearance(u)+65;
  Object.assign(u,{x:site.x,y:site.y,facing:vertical?sign*Math.PI/2:sign>0?0:Math.PI});u[axis]-=sign*distance;
  const target={x:site.x,y:site.y};target[axis]+=sign*distance;
  assert.equal(formationLandmarkBlocker(landmarkField(e),u),undefined,'route fixture starts clear of every building');
  assert.equal(e.move(u.id,target),true);let detour=0;
  for(let i=0;i<2500&&(u.pendingCommand||u.order!=='hold');i++){
    const previous={...u};e.tick(.05);assert.equal(landmarkMoveClear(landmarkField(e),previous,u),true,'movement segment crosses a building');
    assert.equal(formationLandmarkBlocker(landmarkField(e),u),undefined);detour=Math.max(detour,Math.abs(u[vertical?'x':'y']-site[vertical?'x':'y']));
  }
  assert.ok(Math.hypot(u.x-target.x,u.y-target.y)<8,`${u.x},${u.y}: ${u.pressureReason}`);assert.ok(detour>(vertical?site.width:site.height)/2);
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
test('rules 17 movement and events remain equal under 1x and 4x display steps',()=>{
  for(const id of ids){const a=make(id),b=make(id),u=a.state.find(u=>u.side==='confederate'&&u.active);a.order(u.id,'advance');b.order(u.id,'advance');
    for(let i=0;i<800;i++)a.tick(.05);for(let i=0;i<200;i++)b.tick(.2);assert.deepEqual(a.state,b.state);assert.deepEqual(a.events,b.events);
  }
});
test('Brian farmhouse art ships as original full-resolution RGBA PNGs',()=>{
  for(const id of ids){const site=landmarksFor(id,17)[0],png=readFileSync(new URL(`../public/${site.src}`,import.meta.url));assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png[25],6);assert.ok(png.readUInt32BE(16)>=1024);assert.ok(png.length>100000);}
});

test('Gettysburg reject widening a column into masonry',()=>{
 for(const id of ids){const e=make(id),site=landmarkField(e).landmarks[0],u=e.state.find(v=>v.side==='confederate');e.state=[u];
  Object.assign(u,{x:site.x+site.width/2+60,y:site.y,formationMode:'column'});
  assert.equal(formationLandmarkBlocker(landmarkField(e),u),undefined);
  assert.equal(e.setFormation(u.id,'line'),false);assert.equal(u.formationMode,'column');
 }
});
test('buildings prevent close combat across the Brian farmhouse',()=>{
 for(const id of ids){const e=make(id),site=landmarkField(e).landmarks[0],a=e.state.find(v=>v.side==='confederate'),b=e.state.find(v=>v.side==='union');e.state=[a,b];
  Object.assign(a,{x:site.x,y:site.y+site.height/2+1,facing:-Math.PI/2,formationMode:'column',visibilityLimit:1000});Object.assign(b,{x:site.x,y:site.y-site.height/2-1,facing:Math.PI/2,formationMode:'column',visibilityLimit:1000});
  assert.equal(closeCombatPairs(e).length,0);a.x=b.x=site.x+site.width/2+100;b.y=a.y-50;assert.equal(closeCombatPairs(e).length,1);
 }
});
test('a scheduled arrival inside Brian farmhouse waits until its footprint is clear',()=>{
 for(const id of ids){const e=make(id),site=landmarkField(e).landmarks[0],u=e.state.find(v=>v.side==='union');
  e.state.forEach(v=>{v.arrivalTime=null;});Object.assign(u,{active:false,participated:false,arrivalTime:.05,x:site.x,y:site.y});
  e.tick(.1);assert.equal(u.active,false);
  u.x=site.x+site.width/2+160;e.tick(.1);assert.equal(u.active,true);assert.equal(formationLandmarkBlocker(landmarkField(e),u),undefined);
 }
});



test('a rules-17 battle result requires envelope 21 even when the surrounding campaign remains rules 16',()=>{
 const scene={id:'gettysburg',title:'Cedar Creek',turn:1,choices:[{id:'option_a',text:'Advance'}]};
 const saved=createCampaignSnapshot(createFreshCampaignState(1,scene.id,{battleRulesVersion:16}),scene);
 const result={battleId:'gettysburg',scenarioId:scene.id,choiceId:'option_a',result:'decisive-win',score:100,confederateLossRate:0,unionLossRate:0,delegated:false,battleRulesVersion:17};
 for(const location of ['history','ledger']){
  const s=structuredClone(saved);if(location==='history')s.state.history.push({scenarioId:scene.id,choiceId:'option_a',battleResult:result});else s.state.battleCampaign={version:1,results:{gettysburg:result}};
  assert.equal(getCampaignSnapshotCompatibility(s).ok,true);s.version=20;assert.equal(getCampaignSnapshotCompatibility(s).ok,false);
 }
});
test('connected yards are version gated, stay within the board and do not alter terrain or snapshots',async()=>{
 const {landmarkSurroundings,drawLandmarkSurroundings}=await import('../src/battle/landmarkSurroundings.js');
 for(const id of ids){const e=make(id),before=structuredClone(e.snapshot());
  for(const site of landmarkField(e).landmarks){const old=landmarkSurroundings({...site,mapRules:16}),layout=landmarkSurroundings({...site,mapRules:17});assert.ok(layout);if(site.minimumRules!==17)assert.equal(old,null);
   for(const lane of layout.lanes)for(const p of lane){assert.ok(p.x>0&&p.x<e.world.width&&p.y>0&&p.y<e.world.height);assert.deepEqual(gettysburgTerrain(p,e),gettysburgTerrain(p,make(id,16)));}
   const calls=[],ctx={createRadialGradient:()=>({addColorStop(){}})};for(const name of ['save','restore','beginPath','moveTo','lineTo','closePath','fill','clip','stroke','fillRect','translate','rotate','rect','ellipse'])ctx[name]=(...args)=>calls.push({name,args});
   assert.equal(drawLandmarkSurroundings(ctx,{...site,mapRules:17},81),true);assert.equal(calls.filter(c=>c.name==='save').length,calls.filter(c=>c.name==='restore').length);
   const original=landmarkSurroundings({...site,mapRules:17});layout.lanes[0][0].x=-99;assert.deepEqual(landmarkSurroundings({...site,mapRules:17}),original);
  }assert.deepEqual(e.snapshot(),before);
 }
});
