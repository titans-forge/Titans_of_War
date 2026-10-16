import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { createPracticeState } from '../src/game/practiceConditions.js';
import { canDisengageGettysburg, gettysburgClearance, gettysburgFootprint, gettysburgRetreatGuidance, gettysburgLineOfFire, gettysburgRange } from '../src/battle/gettysburgMechanics.js';
import { landmarkMoveClear, landmarkField } from '../src/battle/historicalLandmarks.js';
import { findRetreatCorridor, retreatSegmentBlocker, sweptFormationContact, retreatTurnClear, RETREAT_CORRIDOR_LIMITS } from '../src/battle/retreatCorridors.js';
const gap = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const unit = (engine,id='pickett-division') => engine.state.find(formation=>formation.id===id);
const campaign = version => ({...createPracticeState({id:'gettysburg',turn:1},'reserve','full'),battleRulesVersion:version});
const make = (version=18) => new CivilWarBattleEngine('gettysburg',campaign(version),'option_a');
const tick = (engine,steps) => {for(let index=0;index<steps;index++) engine.tick(.05);};
function empty(engine){for(const formation of engine.state)Object.assign(formation,{active:false,arrivalTime:null,participated:false});}
function place(formation,x,y,props={}) {return Object.assign(formation,{x,y,active:true,participated:true,target:{x,y},order:'hold',status:'steady',facingOrder:formation.facing,ammunition:0,...props});}
function opening(version){const engine=make(version);engine.face('pickett-division',{x:430,y:870});tick(engine,540);engine.move('pickett-division',{x:850,y:500});return engine;}
function originalBlocked(){const engine=opening(17);tick(engine,1860);assert.equal(hash(engine.checkpoint()),'5c559d9e1e4cc900218aa8341843098ed3802a1fd9292400500fa79f6566c59d');return engine;}
function pilotFromBlocked(){const legacy=originalBlocked(), saved=legacy.checkpoint();saved.state.battleRulesVersion=18;for(const formation of saved.state.state)Object.assign(formation,{retreatRoute:null,retreatRouteKey:null,retreatReplanAt:0});return CivilWarBattleEngine.fromCheckpoint(saved,'gettysburg',campaign(18),'option_a');}
const descriptor = (id,x,y,props={}) => ({id,x,y,side:'confederate',type:'infantry',formationMode:'line',facing:Math.PI/2,active:true,strength:1000,status:'steady',...props});
const geometric = units => ({state:units,world:{width:1700,height:900},gettysburg:{landmarks:[]}});
const block = (engine,formation,point) => retreatSegmentBlocker(engine,formation,point,gettysburgClearance,gettysburgFootprint);

test('continuous swept rectangles detect a middle collision despite both endpoints being clear',()=>{
 const moving=descriptor('moving',300,300), other=descriptor('other',500,300), end={x:700,y:300};
 assert.equal(sweptFormationContact(moving,moving,other,gettysburgFootprint),null);
 assert.equal(sweptFormationContact({...moving,...end},end,other,gettysburgFootprint),null);
 const contact=sweptFormationContact(moving,end,other,gettysburgFootprint);assert.ok(contact.enter>0&&contact.exit<1);
 assert.equal(block(geometric([moving,other]),moving,end).obstacle.id,'other');
});
test('swept checks use the actual candidate facing and preserve historical radial clearance',()=>{
 const moving=descriptor('moving',300,300,{facing:0}),other=descriptor('other',350,380,{facing:0});
 const engine=geometric([moving,other]),end={x:330,y:300};
 assert.equal(block(engine,moving,end)?.obstacle.id,'other');
 const frontChanged={...moving,facing:Math.PI/2};
 assert.notEqual(gettysburgClearance(moving,other),gettysburgClearance(frontChanged,other));
 const exact=pilotFromBlocked(),formation=unit(exact),point={x:formation.x+.8364938247478,y:formation.y+1.04733259351};
 assert.ok(gap(point,unit(exact,'alexander-battalion'))<Math.min(gettysburgClearance({...formation,...point},unit(exact,'alexander-battalion')),gap(formation,unit(exact,'alexander-battalion'))-.001));
 assert.equal(block(exact,formation,point)?.obstacle.id,'alexander-battalion');
});
test('landmark clearance checks the entire padded segment and a corner turn',()=>{
 const moving=descriptor('moving',250,400),engine=geometric([moving]);engine.gettysburg.landmarks=[{id:'house',name:'House',x:500,y:400,width:80,height:60}];
 const end={x:750,y:400};assert.equal(block(engine,moving,end)?.kind,'landmark');assert.equal(block(engine,moving,end)?.obstacle.id,'house');
 const safe={x:250,y:550};assert.equal(block(engine,moving,safe),null);
 assert.equal(landmarkMoveClear(engine.gettysburg,moving,end),false);
});
test('a source already inside masonry or outside the field never becomes a snapped route origin',()=>{
 const moving=descriptor('moving',500,400),engine=geometric([moving]);engine.gettysburg.landmarks=[{id:'house',name:'House',x:500,y:400,width:80,height:60}];
 assert.equal(findRetreatCorridor(engine,moving,{x:850,y:882},gettysburgClearance,gettysburgFootprint).path,null);
 moving.x=10;engine.gettysburg.landmarks=[];assert.equal(findRetreatCorridor(engine,moving,{x:850,y:882},gettysburgClearance,gettysburgFootprint).path,null);
});
test('rotation checks intermediate faces without granting room through adjacent formations',()=>{
 const moving=descriptor('moving',600,600,{facing:0}),other=descriptor('other',660,645,{facing:0}),engine=geometric([moving,other]);
 assert.equal(retreatTurnClear(engine,moving,Math.PI/2,gettysburgClearance,gettysburgFootprint),false);
 other.x=900;assert.equal(retreatTurnClear(engine,moving,Math.PI/2,gettysburgClearance,gettysburgFootprint),true);
});
test('existing close contact may escape outward but cannot translate through the opposing body',()=>{
 const moving=descriptor('moving',600,600),other=descriptor('other',640,600,{side:'union'}),engine=geometric([moving,other]);
 assert.equal(block(engine,moving,{x:560,y:600}),null);
 assert.equal(block(engine,moving,{x:720,y:600})?.obstacle.id,'other');
});
test('pure advisory names Alexander and current Cushing safety gate without changing checkpoint bytes',()=>{
 const engine=pilotFromBlocked(),formation=unit(engine),before=hash(engine.checkpoint());
 for(let index=0;index<8;index++){
  const guidance=gettysburgRetreatGuidance(engine,formation);assert.equal(guidance.blockerId,'alexander-battalion');assert.equal(guidance.blockerKind,'formation');
  assert.equal(guidance.blockerAvailable,true);assert.equal(guidance.detouring,false);assert.equal(guidance.underFire,true);assert.equal(guidance.fireThreatId,'cushing-battery');assert.equal(guidance.exitThreatened,false);
 }
 assert.equal(hash(engine.checkpoint()),before);
});
test('exact public Gettysburg blocked state obtains a bounded real corridor and escapes without moving Alexander',()=>{
 const engine=pilotFromBlocked(),formation=unit(engine),alexander=unit(engine,'alexander-battalion'),originalPosition={x:formation.x,y:formation.y},blockerPosition={x:alexander.x,y:alexander.y};
 const start=performance.now(),result=findRetreatCorridor(engine,formation,formation.target,gettysburgClearance,gettysburgFootprint);
 assert.ok(result.path?.length);assert.ok(result.path.length<=RETREAT_CORRIDOR_LIMITS.waypoints);assert.ok(result.nodesExpanded<=RETREAT_CORRIDOR_LIMITS.expanded);assert.ok(result.segmentsChecked<=RETREAT_CORRIDOR_LIMITS.segments);
 assert.deepEqual(findRetreatCorridor(engine,formation,formation.target,gettysburgClearance,gettysburgFootprint),result);
 let from={...formation};for(const point of result.path){assert.equal(block(engine,from,point),null);from={...from,...point};}
 let detourSeen=false;for(let index=0;index<200&&formation.active;index++){
  const before={...formation};engine.tick(.05);assert.ok(gap(before,formation)<=28*.05+1e-8,'one fixed-step maximum speed, never teleport');
  if(gettysburgRetreatGuidance(engine,formation)?.detouring)detourSeen=true;
 }
 assert.ok(detourSeen);assert.ok(gap(originalPosition,formation)>50);assert.equal(formation.withdrawn,true);assert.equal(formation.withdrawalOrganized,false);
 assert.equal(formation.departureReason,'disengaged');assert.equal(formation.retiredAt,122.79999999999517);assert.deepEqual({x:alexander.x,y:alexander.y},blockerPosition);
 assert.ok(performance.now()-start<2000,'bounded fixture work; diagnostic timing is not a device frame-rate claim');
});
test('a new untouched public practice takes the detour and never retires while an enemy fire gate remains live',()=>{
 const engine=opening(18),formation=unit(engine);let seenDetour=false,seenAlexander=false;
 for(let index=0;index<2200&&formation.active;index++){
  const before={...formation};const fireGate=engine.state.some(enemy=>enemy.active&&enemy.side!==formation.side&&enemy.strength>0&&!['broken','surrendered','routing'].includes(enemy.status)&&enemy.ammunition>0&&!enemy.gunsAbandoned&&(enemy.type!=='artillery'||enemy.gunState==='deployed')&&gap(formation,enemy)<=gettysburgRange(enemy)&&gettysburgLineOfFire(engine,enemy,formation));
  engine.tick(.05);const guidance=gettysburgRetreatGuidance(engine,formation);if(guidance?.detouring)seenDetour=true;if(guidance?.blockerId==='alexander-battalion')seenAlexander=true;
  assert.ok(gap(before,formation)<=29*.05*1.12+1e-8);
  if(!formation.active&&formation.departureReason==='disengaged'){
   assert.equal(engine.state.some(enemy=>enemy.active&&enemy.side!==formation.side&&enemy.strength>0&&!['broken','surrendered','routing'].includes(enemy.status)&&enemy.ammunition>0&&!enemy.gunsAbandoned&&(enemy.type!=='artillery'||enemy.gunState==='deployed')&&gap(formation,enemy)<=gettysburgRange(enemy)&&gettysburgLineOfFire(engine,enemy,formation)),false);
   assert.ok(!fireGate||gap(before,formation)>0);
  }
 }
 assert.ok(seenDetour&&seenAlexander);assert.equal(formation.withdrawn,true);assert.equal(formation.departureReason,'disengaged');assert.equal(formation.retiredAt,81.7999999999975);assert.equal(formation.withdrawalOrganized,false);
});
test('actual pilot movement retains original endpoint clearance and additional swept protection around static formations',()=>{
 const engine=make();empty(engine);const formation=place(unit(engine),850,630,{facing:Math.PI/2,facingOrder:null,retreatOrigin:{x:850,y:630},retreatExit:{x:850,y:882},target:{x:850,y:882},order:'withdraw'});
 const blocker=place(unit(engine,'alexander-battalion'),850,810,{facing:Math.PI/2,facingOrder:Math.PI/2});
 const others=[blocker];let moved=0;for(let index=0;index<450&&formation.active;index++){
  const before={...formation};engine.tick(.05);if(gap(before,formation)===0)continue;moved++;
  const oriented={...before,facing:formation.facing};assert.equal(block(engine,oriented,{x:formation.x,y:formation.y}),null);
  for(const other of others)assert.ok(gap(formation,other)>=Math.min(gettysburgClearance(formation,other),gap(before,other)-.001));
 }
 assert.ok(moved>50);assert.equal(formation.withdrawn,true);assert.equal(formation.withdrawalOrganized,true);
});
test('a masonry detour stays outside expanded footprints on each actual segment',()=>{
 const engine=make();empty(engine);const formation=place(unit(engine),850,630,{facing:Math.PI/2,facingOrder:null,order:'withdraw',retreatOrigin:{x:850,y:630},retreatExit:{x:850,y:882},target:{x:850,y:882}});
 engine.gettysburg.landmarks=[{id:'test-house',name:'Test house',x:850,y:760,width:100,height:60}];let detourSeen=false;
 for(let index=0;index<600&&formation.active;index++){
  const before={...formation};engine.tick(.05);assert.equal(landmarkMoveClear(landmarkField(engine),before,formation),true);if(gettysburgRetreatGuidance(engine,formation)?.detouring)detourSeen=true;
 }
 assert.ok(detourSeen);assert.equal(formation.withdrawn,true);
});
test('all opposed exit endpoints produce no promised route and cannot bypass capture contact',()=>{
 const engine=make();empty(engine);const formation=place(unit(engine),850,800,{facing:Math.PI/2,facingOrder:null,status:'routing',order:'withdraw',morale:1,cohesion:1,retreatOrigin:{x:850,y:650},retreatExit:{x:850,y:882},target:{x:850,y:882}});
 const defenders=engine.state.filter(other=>other.side==='union');
 for(const [index,x] of [180,850,1510].entries())place(defenders[index],x,850,{facing:-Math.PI/2,facingOrder:-Math.PI/2,ammunition:0});
 place(defenders[3],790,800,{facing:0,facingOrder:0});place(defenders[4],910,800,{facing:Math.PI,facingOrder:Math.PI});
 const result=findRetreatCorridor(engine,formation,formation.target,gettysburgClearance,gettysburgFootprint);assert.equal(result.path,null);
 const guidance=gettysburgRetreatGuidance(engine,formation);assert.equal(guidance.exitThreatened,true);assert.equal(guidance.blockerAvailable,false);assert.equal(guidance.detouring,false);
 tick(engine,240);assert.equal(formation.withdrawn,undefined);assert.equal(formation.active,false);assert.equal(formation.status,'surrendered');assert.ok(formation.capturedStrength>0);
});
test('failed searches have a fixed retry deadline rather than repeating each frame',()=>{
 const engine=make();empty(engine);const formation=place(unit(engine),850,800,{status:'routing',order:'withdraw',morale:1,cohesion:1,facing:Math.PI/2,facingOrder:null,retreatOrigin:{x:850,y:650},retreatExit:{x:850,y:882},target:{x:850,y:882}});
 const defenders=engine.state.filter(other=>other.side==='union');for(const [index,x] of [180,850,1510].entries())place(defenders[index],x,850,{facing:0,facingOrder:0});engine.tick(.05);const deadline=formation.retreatReplanAt;assert.equal(deadline,4.05);tick(engine,20);assert.equal(formation.retreatReplanAt,deadline);
});
test('cold pause/resume preserves an active partial corridor byte-for-byte through repeated saves',()=>{
 const engine=pilotFromBlocked();tick(engine,20);assert.ok(unit(engine).retreatRoute?.length);
 const saved=JSON.parse(JSON.stringify(engine.checkpoint())),cold=CivilWarBattleEngine.fromCheckpoint(saved,'gettysburg',campaign(18),'option_a');assert.deepEqual(cold.checkpoint(),engine.checkpoint());
 for(let index=0;index<20;index++){tick(engine,4);tick(cold,4);assert.deepEqual(cold.checkpoint(),engine.checkpoint());}
 const again=CivilWarBattleEngine.fromCheckpoint(JSON.parse(JSON.stringify(cold.checkpoint())),'gettysburg',campaign(18),'option_a');tick(engine,20);tick(again,20);assert.deepEqual(again.checkpoint(),engine.checkpoint());
});
test('speed-sized batches retain exact tactical state and events with only existing accumulator roundoff',()=>{
 const a=pilotFromBlocked(),b=pilotFromBlocked();for(let index=0;index<20;index++){a.tick(.2);tick(b,4);assert.deepEqual(a.state,b.state);assert.deepEqual(a.events,b.events);assert.equal(a.time,b.time);assert.ok(Math.abs(a.gettysburg.accumulator-b.gettysburg.accumulator)<1e-12);}
});
test('advisory pending, completed, resolved, legacy and unsupported battle gates are read-only and precise',()=>{
 const engine=pilotFromBlocked(),formation=unit(engine);formation.pendingCommand={order:'rally',point:null};formation.commandDelay=1;
 assert.equal(gettysburgRetreatGuidance(engine,formation).pendingOrder,'rally');const before=hash(engine.checkpoint());gettysburgRetreatGuidance(engine,formation);assert.equal(hash(engine.checkpoint()),before);
 engine.pendingOutcome='defeat';assert.equal(gettysburgRetreatGuidance(engine,formation),null);engine.pendingOutcome=null;engine.outcome='defeat';assert.equal(gettysburgRetreatGuidance(engine,formation),null);engine.outcome='undecided';formation.active=false;assert.equal(gettysburgRetreatGuidance(engine,formation),null);
 const old=originalBlocked();assert.equal(gettysburgRetreatGuidance(old,unit(old)),null);assert.ok(old.state.every(formation=>!Object.hasOwn(formation,'retreatRoute')));
 const other=new CivilWarBattleEngine('shiloh',campaign(18),'option_a');assert.equal(gettysburgRetreatGuidance(other,other.state[0]),null);assert.ok(other.state.every(formation=>!Object.hasOwn(formation,'retreatRoute')));
 const queued=make();queued.order('pickett-division','withdraw');assert.equal(gettysburgRetreatGuidance(queued,unit(queued)),null);
});
test('fallback firing front and nonretreat movements remain exact against rules17',()=>{
 for(const order of ['fallback','move']){
  const a=make(17),b=make(18);for(const engine of [a,b]){empty(engine);place(unit(engine),600,600,{facing:-Math.PI/2,facingOrder:-Math.PI/2});if(order==='move')engine.move('pickett-division',{x:700,y:570});else engine.order('pickett-division','fallback');}
  tick(a,240);tick(b,240);const strip=formation=>{const {retreatRoute,retreatRouteKey,retreatReplanAt,...old}=formation;return old;};assert.deepEqual(b.state.map(strip),a.state);
  if(order==='fallback')assert.equal(unit(b).facing,-Math.PI/2);
 }
});
test('rules17 public reproduction retains its exact checkpoint and historical retirement time',()=>{
 const engine=originalBlocked();tick(engine,200);assert.equal(hash(engine.checkpoint()),'79523fb0fbd0fa1d2f60d3ec4eb4b010103ee38aa5309ffee1572d0b8e323b1a');
 while(unit(engine).active&&engine.time<240)engine.tick(.05);assert.equal(unit(engine).retiredAt,172.80000000000504);assert.equal(unit(engine).departureReason,'disengaged');
});
test('resolved battles freeze new corridor data, units, events and casualty state',()=>{
 const engine=pilotFromBlocked();tick(engine,10);assert.ok(unit(engine).retreatRoute?.length);engine.beginResolution('defeat');const units=structuredClone(engine.state),events=structuredClone(engine.events),time=engine.time;
 tick(engine,50);assert.deepEqual(engine.state,units);assert.deepEqual(engine.events,events);assert.equal(engine.time,time);assert.equal(engine.outcome,'defeat');assert.equal(gettysburgRetreatGuidance(engine,unit(engine)),null);
});
