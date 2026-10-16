import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CommandTrainingEngine,COMMAND_LESSONS,TRAINING_A,TRAINING_B,TRAINING_FOE,TRAINING_GUN} from '../src/battle/commandTraining.js';
import {previewGroupOrder,confirmGroupOrder} from '../src/battle/groupOrders.js';
import {CivilWarBattleEngine} from '../src/battle/civilWarEngine.js';
import {createFormationVisual,updateFormationVisual} from '../src/battle/formationVisualState.js';
const run=(e,n=40)=>{for(let i=0;i<n/.05;i++)e.tick(.05);};
for(const lesson of COMMAND_LESSONS)test(`training ${lesson.id} requires action and completes through real commands`,()=>{
 const idle=new CommandTrainingEngine(lesson.id);run(idle,25);assert.equal(idle.training.complete,false,'time alone cannot complete the exercise');
 const e=new CommandTrainingEngine(lesson.id);const baseline=structuredClone(e.state);
 if(lesson.id==='support'){const plan=previewGroupOrder(e.snapshot(),{ids:[TRAINING_A,TRAINING_B],order:'move',point:lesson.point,layout:'line'},e.world);assert.equal(plan.error,undefined);assert.equal(confirmGroupOrder(e,plan).accepted,2);}
 else if(lesson.point)e.move(TRAINING_A,lesson.point);
 else e.order(TRAINING_A,lesson.id==='contact'?'fallback':lesson.id==='rally'?'rally':'advance');
 run(e);assert.equal(e.training.complete,true,JSON.stringify(e.training));assert.equal(e.outcome,'undecided');assert.equal(e.pendingOutcome,null);
 if(lesson.id==='contact')for(const id of [TRAINING_A,TRAINING_FOE])assert.ok(e.state.find(u=>u.id===id).strength<baseline.find(u=>u.id===id).strength);
 if(lesson.id==='rally'){const u=e.state.find(u=>u.id===TRAINING_A);assert.equal(u.strength,baseline.find(u=>u.id===TRAINING_A).strength);assert.ok(e.time>18);assert.equal(u.order,'hold');}
 const final=e.snapshot();assert.equal(e.move(TRAINING_A,{x:400,y:600}),false);assert.equal(e.order(TRAINING_A,'withdraw'),false);run(e,2);assert.deepEqual(e.snapshot(),final,'completion freezes the exercise');
});
test('a move cannot substitute for the Advance demonstration',()=>{const e=new CommandTrainingEngine('advance');e.move(TRAINING_A,{x:500,y:565});run(e);assert.equal(e.training.complete,false);});
test('training presets never alter a fresh historical battle',()=>{const state={rulesVersion:1,battleRulesVersion:7};const before=new CivilWarBattleEngine('gettysburg',state,'option_a').snapshot();for(const l of COMMAND_LESSONS)run(new CommandTrainingEngine(l.id),2);assert.deepEqual(new CivilWarBattleEngine('gettysburg',state,'option_a').snapshot(),before);assert.equal(before.training,undefined);});
test('preview and cancel do not issue orders; confirmation retains individual courier delays',()=>{
 const e=new CommandTrainingEngine('support'),request={ids:[TRAINING_A,TRAINING_B],order:'move',point:{x:750,y:690},layout:'line'};
 const before=e.snapshot(),plan=previewGroupOrder(before,request,e.world);assert.deepEqual(e.snapshot(),before);assert.equal(confirmGroupOrder(e,plan).accepted,2);
 for(const id of request.ids){const u=e.state.find(u=>u.id===id);assert.equal(u.order,'hold');assert.equal(u.pendingCommand.order,'move');assert.ok(u.commandDelay>0);}
});
test('an unavailable member rejects the whole group without partially ordering the others',()=>{
 const e=new CommandTrainingEngine('support'),request={ids:[TRAINING_A,TRAINING_B],order:'move',point:{x:750,y:690},layout:'line'},plan=previewGroupOrder(e.snapshot(),request,e.world);
 e.state.find(u=>u.id===TRAINING_B).status='routing';assert.match(confirmGroupOrder(e,plan).error,/cannot receive/);assert.equal(e.state.find(u=>u.id===TRAINING_A).pendingCommand,null);
});
test('group bounds and malformed requests cannot silently clamp or overlap destinations',()=>{
 const e=new CommandTrainingEngine('support'),base={ids:[TRAINING_A,TRAINING_B],order:'move',point:{x:750,y:690},layout:'line'};
 for(const change of [{point:{x:70,y:690}},{point:{x:NaN,y:0}},{ids:[TRAINING_A,TRAINING_A]},{order:'teleport'},{layout:'unknown'},{ids:[TRAINING_A,TRAINING_FOE]}])assert.ok(previewGroupOrder(e.snapshot(),{...base,...change},e.world).error);
 assert.equal(e.state.find(u=>u.id===TRAINING_A).pendingCommand,null);
});
test('group Hold, Advance, Fallback, Rally and Withdraw use normal individual orders',()=>{
 for(const order of ['hold','advance','fallback','rally','withdraw']){
  const e=new CommandTrainingEngine('support'),plan=previewGroupOrder(e.snapshot(),{ids:[TRAINING_A,TRAINING_B],order},e.world);assert.equal(confirmGroupOrder(e,plan).accepted,2);
  assert.ok(e.state.filter(u=>[TRAINING_A,TRAINING_B].includes(u.id)).every(u=>u.pendingCommand.order===order));
 }
});
test('group assault rejects guns and requires a valid sector before any unit is ordered',()=>{
 const e=new CommandTrainingEngine('lane');assert.ok(previewGroupOrder(e.snapshot(),{ids:[TRAINING_A,TRAINING_GUN],order:'assault',sectorId:'center'},e.world).error);
 const pair=new CommandTrainingEngine('support');assert.ok(previewGroupOrder(pair.snapshot(),{ids:[TRAINING_A,TRAINING_B],order:'assault',sectorId:'missing'},pair.world).error);
 assert.equal(confirmGroupOrder(pair,previewGroupOrder(pair.snapshot(),{ids:[TRAINING_A,TRAINING_B],order:'assault',sectorId:'center'},pair.world)).accepted,2);
});
test('preserved spacing is revalidated if the group geometry changed after preview',()=>{
 const e=new CommandTrainingEngine('support'),plan=previewGroupOrder(e.snapshot(),{ids:[TRAINING_A,TRAINING_B],order:'move',point:{x:800,y:690},layout:'preserve'},e.world);
 e.state.find(u=>u.id===TRAINING_B).x-=70;assert.match(confirmGroupOrder(e,plan).error,/changed/);assert.equal(e.state.find(u=>u.id===TRAINING_A).pendingCommand,null);
});
test('melee figures at the contact edge face flank or rear attackers without rotating the whole formation',()=>{
 for(const contactFacing of [0,Math.PI/2,Math.PI]){
  const e=new CommandTrainingEngine('contact'),unit={...e.snapshot().formations.find(u=>u.id===TRAINING_A),inMelee:true,contactFacing};const before=structuredClone(unit),v=createFormationVisual(unit,32),out=updateFormationVisual(v,unit,.2,.82);
  const fighting=out.figures.filter(f=>f.action==='melee');assert.equal(fighting.length,8);assert.equal(new Set(fighting.map(f=>f.direction)).size,1);assert.deepEqual(unit,before);assert.equal(out.facing,unit.facing);
  const projections=out.figures.map(f=>({melee:f.action==='melee',toward:(f.x-unit.x)*Math.cos(contactFacing)+(f.y-unit.y)*Math.sin(contactFacing)}));
  assert.ok(Math.min(...projections.filter(p=>p.melee).map(p=>p.toward))>=Math.max(...projections.filter(p=>!p.melee).map(p=>p.toward))-1e-8);
  assert.deepEqual(updateFormationVisual(v,unit,.2,.82),out,'paused poses remain stable');
 }
});
test('rotated group lines preserve spacing and preview orders without changing formation facing',()=>{
 const e=new CommandTrainingEngine('support');const before=e.snapshot();
 for(const angle of [0,Math.PI/2,-Math.PI/4,Math.PI/4]){
  const p=previewGroupOrder(before,{ids:[TRAINING_A,TRAINING_B],order:'move',layout:'line',lineAngle:angle,point:{x:750,y:500}},e.world);
  assert.equal(p.error,undefined);const [a,b]=p.points;const gap=Math.hypot(b.x-a.x,b.y-a.y);assert.ok(gap>=159&&gap<=162);
  assert.ok(Math.abs((b.x-a.x)*Math.sin(angle)-(b.y-a.y)*Math.cos(angle))<1.5);
  assert.deepEqual(e.snapshot(),before);
 }
 const vertical=previewGroupOrder(before,{ids:[TRAINING_A,TRAINING_B],order:'move',layout:'line',lineAngle:Math.PI/2,point:{x:750,y:500}},e.world);
 assert.equal(vertical.points[0].x,vertical.points[1].x);assert.equal(confirmGroupOrder(e,vertical).accepted,2);
 for(const u of e.snapshot().formations)assert.equal(u.facing,before.formations.find(v=>v.id===u.id).facing);
});
test('rotated lines reject nonfinite angles and out-of-field endpoints; completed training rejects group orders',()=>{
 const e=new CommandTrainingEngine('support');const r={ids:[TRAINING_A,TRAINING_B],order:'move',layout:'line',point:{x:750,y:60},lineAngle:Math.PI/2};
 assert.match(previewGroupOrder(e.snapshot(),r,e.world).error,/whole group/);
 for(const lineAngle of [NaN,Infinity,'north'])assert.match(previewGroupOrder(e.snapshot(),{...r,lineAngle},e.world).error,/finite/);
 e.training.complete=true;assert.match(previewGroupOrder(e.snapshot(),{...r,point:{x:750,y:500}},e.world).error,/not accepting/);
});
