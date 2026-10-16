import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { gettysburgTerrain, gettysburgLineOfFire, judgeGettysburg, GETTYSBURG_RULES } from '../src/battle/gettysburgMechanics.js';
import { createFreshCampaignState, createCampaignSnapshot, restoreCampaignFromSnapshot, getCampaignSnapshotCompatibility } from '../src/game/campaignStorage.js';
import { getBattleAssessment } from '../src/battle/battleAssessment.js';
const state = { rulesVersion: 2, battleRulesVersion: 3, metrics: { militaryStrength: 85, munitions: 80, publicMorale: 80, foodSupply: 78, treasury: 75 } };
const make = (choice = 'option_a') => new CivilWarBattleEngine('gettysburg', state, choice);
const run = (e, time) => { for (let i = 0; i < Math.round(time / 0.05); i++) e.tick(0.05); };
const unit = (e, id = 'pickett-division') => e.state.find(u => u.id === id);
function empty(e) { e.state.forEach(u => { u.active = false; u.arrivalTime = null; }); }
function place(u, x, y, props = {}) { Object.assign(u, { x, y, active: true, order: 'hold', status: 'steady', target: { x, y }, ...props }); return u; }

test('crossing the old approach line cannot award victory', () => {
 const e = make(); for (const id of e.config.chargeFormationIds) { const u = unit(e, id); u.y = 580; }
 e.assaultState = 'engaged'; e.time = 26; e.judgeOutcome();
 assert.equal(e.pendingOutcome, null); assert.equal(e.gettysburg.held, 0);
});
test('two supported sectors require uninterrupted occupation; a defender resets the clock', () => {
 const e = make(); empty(e);
 place(unit(e), 470, 330); place(unit(e, 'pettigrew-division'), 790, 330);
 judgeGettysburg(e, 10); assert.equal(e.pendingOutcome, null); assert.equal(e.gettysburg.held, 10);
 place(unit(e, 'hays-center'), 800, 340); judgeGettysburg(e, 1); assert.equal(e.gettysburg.held, 0);
 unit(e, 'hays-center').active = false; judgeGettysburg(e, 17.95); assert.equal(e.pendingOutcome, null);
 judgeGettysburg(e, .05); assert.equal(e.pendingOutcome, 'decisive-win');
 assert.equal(getBattleAssessment(e.snapshot(), 'option_a').objective.status, 'achieved');
});
test('an unsupported lone incursion cannot take two sectors', () => {
 const e = make(); empty(e); place(unit(e), 790, 330); judgeGettysburg(e, 30);
 assert.equal(e.gettysburg.held, 0); assert.equal(e.pendingOutcome, null);
});
test('finalization freezes all tactical conditions and cannot rout healthy troops or heal winners', () => {
 for (const decision of ['decisive-win', 'costly-win', 'defeat', 'rout', 'disciplined-withdrawal']) {
  const e = make(); unit(e).status = 'routing'; unit(e).morale = 10;
  const reserve = unit(e, 'hancock-reserve'); reserve.active = false; reserve.arrivalTime = 100;
  const before = structuredClone(e.state); e.beginResolution(decision); run(e, 2);
  assert.deepEqual(e.state, before); assert.equal(e.outcome, decision);
 }
});
test('breaking Cushing causes only local shock, not a remote army-wide retreat', () => {
 const e = make(); unit(e, 'cushing-battery').morale = 0; e.tick(.05);
 assert.equal(unit(e, 'cushing-battery').status, 'routing');
 for (const id of ['gibbon-center', 'hays-center', 'hancock-reserve']) assert.notEqual(unit(e, id).status, 'routing');
 assert.equal(unit(e, 'hancock-reserve').morale, 86);
});
test('legal rear exit gates allow an organized withdrawal without congestion deadlock', () => {
 const e = make('option_c'); e.state.filter(u => u.side === 'confederate').forEach(u => e.order(u.id, 'withdraw')); run(e, 80);
 assert.equal(e.outcome, 'disciplined-withdrawal'); assert.ok(e.gettysburg.escaped >= .7);
 assert.ok(e.state.filter(u => u.withdrawn).every(u => !u.active && u.withdrawalOrganized));
 assert.equal(getBattleAssessment(e.snapshot(), 'option_c').objective.status, 'achieved');
});
test('routed escape cannot earn an organized withdrawal award', () => {
 const e = make(); for (const u of e.state.filter(u => u.side === 'confederate')) { u.status = 'routing'; u.morale = 1; u.cohesion = 1; }
 run(e, 100); assert.notEqual(e.outcome, 'disciplined-withdrawal'); assert.equal(e.gettysburg.escaped, 0);
});
test('fallback remains on the field, distinct from withdraw', () => {
 const e = make(); empty(e); const u = place(unit(e), 600, 600); e.order(u.id, 'fallback'); run(e, 20);
 assert.equal(u.order, 'hold'); assert.equal(u.active, true); assert.ok(Math.abs(u.y - 735) < 3); assert.ok(!u.withdrawn);
});
test('safe supported rally recovers over time without restoring strength or resetting fatigue', () => {
 const e = make(); empty(e); const u = place(unit(e), 470, 700, { morale: 24, cohesion: 18, fatigue: 44, strength: 3000 });
 place(unit(e, 'pettigrew-division'), 700, 710); e.order(u.id, 'rally'); run(e, 8);
 assert.equal(u.strength, 3000); assert.equal(u.morale, 24); run(e, 20);
 assert.ok(u.morale >= 40); assert.ok(u.cohesion >= 35); assert.equal(u.strength, 3000); assert.ok(u.fatigue > 35);
});
test('rally under fire does not provide free recovery', () => {
 const e = make(); empty(e); const u = place(unit(e), 470, 700, { morale: 35, cohesion: 30 });
 place(unit(e, 'pettigrew-division'), 700, 710); place(unit(e, 'gibbon-center'), 470, 500, { ammunition: 0 });
 e.order(u.id, 'rally'); run(e, 20); assert.equal(u.safeTime, 0); assert.ok(u.morale <= 35);
});
test('cover and movement are geometric and faction symmetric; the fence crossing slows both sides', () => {
 const a = { x: 1080, y: 345, side: 'confederate' }, b = { ...a, side: 'union' };
 assert.deepEqual(gettysburgTerrain(a), gettysburgTerrain(b)); assert.ok(gettysburgTerrain(a).defense > 1);
 a.y = 700; assert.equal(gettysburgTerrain(a).defense, 1); a.y = 520; assert.ok(gettysburgTerrain(a).movement < 1);
});
test('the reverse slope and friendly formations block line of fire', () => {
 const e = make(); empty(e); const a = place(unit(e), 790, 650), b = place(unit(e, 'hays-center'), 790, 200);
 assert.equal(gettysburgLineOfFire(e, a, b), false); b.y = 330; assert.equal(gettysburgLineOfFire(e, a, b), true);
 place(unit(e, 'pettigrew-division'), 790, 500); assert.equal(gettysburgLineOfFire(e, a, b), false);
});
test('artillery spends time limbering and unlimbering and cannot fire while towing', () => {
 const e = make(); empty(e); const u = place(unit(e, 'alexander-battalion'), 600, 650); e.move(u.id, { x: 600, y: 550 }); run(e, 4);
 assert.equal(u.y, 650); assert.equal(u.gunState, 'limbering'); run(e, 5); assert.ok(u.y < 650); assert.equal(u.gunState, 'limbered');
 e.order(u.id, 'hold'); run(e, 3); assert.equal(u.gunState, 'unlimbering'); run(e, 5); assert.equal(u.gunState, 'deployed');
});
test('emergency artillery flight accounts for abandoned guns', () => {
 const e = make(); const u = unit(e, 'cushing-battery'); u.morale = 1; e.tick(.05);
 assert.equal(u.gunState, 'abandoned'); assert.equal(e.gettysburg.abandonedGuns, 1);
 const ammo = u.ammunition; run(e, 1); assert.equal(u.ammunition, ammo);
});
test('movement cannot pass through a blocking enemy', () => {
 const e = make(); empty(e); const u = place(unit(e), 600, 600); const v = place(unit(e, 'gibbon-center'), 600, 480, { ammunition: 0 });
 e.move(u.id, { x: 600, y: 400 });
 for (let i = 0; i < 300; i++) { e.tick(.05); assert.ok(Math.hypot(u.x - v.x, u.y - v.y) >= GETTYSBURG_RULES.spacing - .01); }
});
test('a trapped routed formation surrenders instead of crossing its surrounding enemies', () => {
 const e = make(); empty(e); const u = place(unit(e), 600, 600, { status: 'routing', order: 'withdraw', morale: 1, cohesion: 1 });
 const foes = e.state.filter(v => v.side === 'union');
 for(let i=0;i<5;i++) place(foes[i], 600 + Math.cos(i*Math.PI*2/5)*42, 600 + Math.sin(i*Math.PI*2/5)*42, { ammunition: 0 });
 run(e, 12); assert.equal(u.status, 'surrendered'); assert.equal(u.active, false); assert.ok(u.capturedStrength > 0);
});
test('Hancock responds to sector pressure and absent formations cannot take objectives', () => {
 const e = make(); unit(e).y = 500; run(e, 4); assert.equal(e.gettysburg.reserveCommitted, true); assert.match(e.gettysburg.reserveIntent, /Reinforce/);
 const r = unit(e, 'hancock-reserve'); assert.ok(r.x !== r.home.x || r.y !== r.home.y);
 const f = make(); empty(f); unit(f).x = 470; unit(f).y = 330; unit(f, 'pettigrew-division').x = 790; unit(f, 'pettigrew-division').y = 330;
 judgeGettysburg(f, 20); assert.equal(f.gettysburg.held, 0);
});
test('fixed stepping preserves simulation state across speed-sized tick batches', () => {
 const a = make(), b = make(); a.order('pickett-division', 'advance'); b.order('pickett-division', 'advance');
 for(let i=0;i<400;i++) a.tick(.05); for(let i=0;i<100;i++) b.tick(.2);
 assert.deepEqual(a.state,b.state); assert.equal(a.time,b.time); assert.deepEqual(a.events,b.events);
});
test('visible command queue rejects malformed destinations and preserves a pending order against repeat clicks', () => {
 const e=make(); assert.equal(e.move('pickett-division',{x:NaN,y:2}),false);
 e.order('pickett-division','advance'); e.tick(.2); const remaining=unit(e).commandDelay;
 e.order('pickett-division','advance'); assert.equal(unit(e).commandDelay,remaining);
 e.order('pickett-division','fallback'); assert.equal(unit(e).pendingCommand.order,'fallback');
});
test('new Gettysburg metadata is detached in snapshots', () => {
 const e=make(), s=e.snapshot();s.gettysburg.sectors[0].control='forged'; s.formations[0].home.x=-9;
 assert.equal(e.gettysburg.sectors[0].control,'union'); assert.notEqual(e.state[0].home.x,-9);
});
test('v6 saves retain tactical rules 2 while new saves explicitly carry rules 3 in v7', () => {
 const scene={id:'first',title:'First',turn:1,choices:[{id:'option_a',text:'Continue'}]};
 const fresh=createCampaignSnapshot(createFreshCampaignState(1,'first'),scene);assert.equal(fresh.version,22);assert.equal(fresh.state.battleRulesVersion,18);
 const old=structuredClone(fresh);old.version=6;old.state.battleRulesVersion=2;
 assert.equal(restoreCampaignFromSnapshot(old,[scene]).state.battleRulesVersion,2);
 old.state.battleRulesVersion=3;assert.equal(getCampaignSnapshotCompatibility(old).ok,false);
 const other=new CivilWarBattleEngine('first_manassas',state,'option_b');assert.equal(other.battleRulesVersion,2);
});

test('a coordinated paired assault with a clear battery lane wins through legal orders from untouched deployment', () => {
 const e=make(), infantry=e.state.filter(u=>u.side==='confederate'&&u.type==='infantry');
 infantry.forEach((u,i)=>{e.setFormation(u.id,'line');e.move(u.id,{x:[670,825,1060,1270][i],y:i%2?570:545});});
 e.move('alexander-battalion',{x:950,y:675});run(e,25);e.focusTarget('alexander-battalion','cushing-battery');run(e,15);
 assert.ok(unit(e,'alexander-battalion').volleySerial>=3,'battery preparation must include actual gunfire');
 infantry.forEach((u,i)=>e.order(u.id,'assault',{sectorId:i<2?'center':'angle'}));run(e,203);
 assert.ok(['costly-win','decisive-win'].includes(e.outcome)); assert.equal(e.gettysburg.held,18);
 assert.ok(e.gettysburg.reserveCommitted); assert.ok(e.state.some(u=>u.side==='union'&&u.active&&u.morale>35));
 assert.equal(getBattleAssessment(e.snapshot(),'option_a').objective.status,'achieved');
});
test('stationary formations honor facing commands before enemies enter range', () => {
 const e=make(); e.face('pickett-division',{x:200,y:720}); const before=unit(e).facing; run(e,1);
 assert.notEqual(unit(e).facing,before); assert.equal(unit(e).x,430); assert.equal(unit(e).y,720);
});

test('representative standards draw 34 Union stars and 13 Confederate stars', async () => {
 const { drawPeriodStandard }=await import('../src/battle/periodStandards.js');
 for(const [side,count]of[['union',34],['confederate',13]]){
  let stars=0;const g={fillStyle(){return this},fillRect(){return this},lineStyle(){return this},lineBetween(){return this},fillPoints(p){assert.equal(p.length,10);stars++;return this}};
  drawPeriodStandard(g,side);assert.equal(stars,count);
 }
});

test('safe withdrawals leave after the distance threshold on either side, preserving survivors and condition', async () => {
 const {canDisengageGettysburg}=await import('../src/battle/gettysburgMechanics.js');
 for(const side of ['confederate','union']) {
  const e=make();empty(e);const u=place(unit(e,side==='union'?'gibbon-center':'pickett-division'),400,side==='union'?140:720,{order:'withdraw',retreatOrigin:{x:400,y:side==='union'?360:500},retreatExit:{x:180,y:side==='union'?18:882},strength:3000,morale:67,cohesion:61});
  assert.equal(canDisengageGettysburg(e,u),true);const before={strength:u.strength,morale:u.morale,cohesion:u.cohesion};e.tick(.05);
  assert.equal(u.active,false);assert.equal(u.withdrawn,true);assert.equal(u.departureReason,'disengaged');assert.equal(u.withdrawalOrganized,true);
  assert.deepEqual({strength:u.strength,morale:u.morale,cohesion:u.cohesion},before);
  const pos={x:u.x,y:u.y};run(e,3);assert.deepEqual({x:u.x,y:u.y},pos);
  assert.equal(e.snapshot({presentation:true}).combatEvents.filter(v=>v.type==='departure').length,1);
 }
});
test('a threshold-boundary, lateral movement, pursuit or a live artillery shot prevents disappearance', async () => {
 const {canDisengageGettysburg}=await import('../src/battle/gettysburgMechanics.js');
 const e=make();empty(e);const u=place(unit(e),500,719,{order:'withdraw',retreatOrigin:{x:500,y:500}});
 assert.equal(canDisengageGettysburg(e,u),false);u.x=900;u.y=600;assert.equal(canDisengageGettysburg(e,u),false,'sideways travel cannot substitute for rearward progress');
 u.x=500;u.y=720;const pursuer=place(unit(e,'gibbon-center'),500,500,{ammunition:0});assert.equal(canDisengageGettysburg(e,u),false);
 pursuer.active=false;const gun=place(unit(e,'cushing-battery'),500,355);assert.equal(canDisengageGettysburg(e,u),false,'still exposed to artillery');
 gun.ammunition=0;assert.equal(canDisengageGettysburg(e,u),true);
});
test('fallback, explicit rally and unarrived troops cannot be removed by the retreat threshold', async () => {
 const {canDisengageGettysburg}=await import('../src/battle/gettysburgMechanics.js');
 const e=make();empty(e);const u=place(unit(e),500,750,{retreatOrigin:{x:500,y:400}});
 for(const order of ['hold','fallback','rally']) {u.order=order;assert.equal(canDisengageGettysburg(e,u),false);}
 u.order='rally';u.status='routing';assert.equal(canDisengageGettysburg(e,u),false,'requested rally stays available');
 u.order='withdraw';u.active=false;assert.equal(canDisengageGettysburg(e,u),false);
});
test('a safely disengaged routed unit remains a disordered escape, not an organized withdrawal', () => {
 const e=make();empty(e);const u=place(unit(e),500,730,{status:'routing',order:'withdraw',morale:8,cohesion:8,retreatOrigin:{x:500,y:500}});
 e.tick(.05);assert.equal(u.active,false);assert.equal(u.withdrawn,true);assert.equal(u.withdrawalOrganized,false);assert.equal(e.gettysburg.escaped,0);
});
test('retreat route remains stable until the chosen exit becomes threatened', () => {
 const e=make();empty(e);const u=place(unit(e),700,500);e.order(u.id,'withdraw');run(e,2);const chosen={...u.retreatExit};
 u.x=1400;u.y=500;e.tick(.05);assert.deepEqual(u.retreatExit,chosen);
 place(unit(e,'gibbon-center'),chosen.x,chosen.y-50,{ammunition:0});e.tick(.05);assert.notDeepEqual(u.retreatExit,chosen);
});
test('reserve commitment resists rapid sector switching while retaining a response to changed pressure', () => {
 const e=make();const left=unit(e);left.y=500;e.tick(.05);assert.equal(e.gettysburg.reserveSector,'left');
 left.strength=1000;const right=unit(e,'pettigrew-division');right.x=1080;right.y=500;right.strength=10000;
 run(e,2);assert.equal(e.gettysburg.reserveSector,'left');run(e,10);assert.equal(e.gettysburg.reserveSector,'angle');
});
test('retreat fade lasts one field second, respects pause and reduced motion, and never revives an absent formation', async () => {
 const {retreatOpacity}=await import('../src/battle/retreatPresentation.js');const u={withdrawn:true,retiredAt:10};
 assert.equal(retreatOpacity(u,10),1);assert.equal(retreatOpacity(u,10.5),.5);assert.equal(retreatOpacity(u,10.5),.5);
 assert.equal(retreatOpacity(u,11),0);assert.equal(retreatOpacity(u,20),0);assert.equal(retreatOpacity(u,10,true),0);assert.equal(retreatOpacity({active:false},10),0);
});

test('the actual renderer fades withdrawn sprites, disables their targets and restores arriving standards', async () => {
 const fs=await import('node:fs'),vm=await import('node:vm');const {retreatOpacity}=await import('../src/battle/retreatPresentation.js');
 const source=fs.readFileSync(new URL('../src/battle/CivilWarBattlefield.jsx',import.meta.url),'utf8');
 const prefix=source.slice(source.indexOf('  syncFormation('),source.indexOf('    const scale = this.tactical', source.indexOf('  syncFormation(')));
 const methods=vm.runInNewContext(`({${prefix}\n}})`,{retreatOpacity});
 const display=alpha=>({visible:true,alpha,input:{enabled:true},setVisible(v){this.visible=v;return this},setAlpha(v){this.alpha=v;return this},disableInteractive(){this.input.enabled=false;return this}});
 const view={soldiers:[{sprite:display(1)},{sprite:display(.4)}],standard:display(1),hitArea:display(1)};
 const scene={...methods,engine:{gettysburg:{}},tactical:true,views:new Map([['unit',view]]),reducedMotion:false};
 scene.syncFormation({id:'unit',active:false,withdrawn:true,retiredAt:10},10.5,false);
 assert.equal(view.soldiers[0].sprite.alpha,.5);assert.equal(view.soldiers[1].sprite.alpha,.2);assert.equal(view.standard.input.enabled,false);assert.equal(view.hitArea.input.enabled,false);
 scene.syncFormation({id:'unit',active:false,withdrawn:true,retiredAt:10},11,false);assert.equal(view.standard.visible,false);
 scene.syncFormation({id:'unit',active:true},12,false);assert.equal(view.standard.alpha,1);assert.equal(view.standard.visible,true);assert.equal(view.standard.input.enabled,true);
});

test('routed troops keep retiring instead of automatically stopping to rally beside friendly troops', () => {
 const e=make();empty(e);const u=place(unit(e),500,500,{status:'routing',order:'withdraw',morale:8,cohesion:8,retreatOrigin:{x:500,y:500}});
 place(unit(e,'pettigrew-division'),600,700);run(e,25);
 assert.equal(u.withdrawn,true);assert.equal(u.active,false);assert.equal(u.withdrawalOrganized,false);assert.equal(u.morale,8);
});
test('an explicit rally can still recover routed troops with safe friendly support', () => {
 const e=make();empty(e);const u=place(unit(e),500,500,{status:'routing',order:'withdraw',morale:18,cohesion:14});
 place(unit(e,'pettigrew-division'),600,650);e.order(u.id,'rally');run(e,32);
 assert.equal(u.active,true);assert.equal(u.withdrawn,undefined);assert.equal(u.status,'steady');assert.ok(u.morale>=40&&u.cohesion>=35);
});

test('Gettysburg automatic targeting prefers an enemy in its firing arc over a closer flank target', () => {
 const e=make();empty(e);const u=place(unit(e),700,650,{facing:-Math.PI/2,reload:0});
 const front=place(unit(e,'gibbon-center'),700,450,{ammunition:0});
 place(unit(e,'hays-center'),810,650,{ammunition:0});
 e.tick(.05);assert.equal(u.engagedWith,front.id);assert.ok(u.ammunition<42);
});
test('Focus fire releases a previously locked front without moving the formation', () => {
 const e=make();empty(e);const u=place(unit(e),700,650);const foe=place(unit(e,'gibbon-center'),850,650,{ammunition:0});
 e.face(u.id,{x:700,y:400});assert.notEqual(u.facingOrder,null);
 e.focusTarget(u.id,foe.id);assert.equal(u.facingOrder,null);const before={x:u.x,y:u.y};run(e,5);
 assert.deepEqual({x:u.x,y:u.y},before);assert.equal(u.aimTargetId,foe.id);assert.ok(u.ammunition<42);
});
test('rally cannot recover under a deployed battery beyond the infantry separation threshold', () => {
 const e=make();empty(e);const u=place(unit(e),700,750,{morale:35,cohesion:30});
 place(unit(e,'pettigrew-division'),900,800);
 place(unit(e,'cushing-battery'),700,350,{ammunition:99,reload:999,gunState:'deployed'});
 e.order(u.id,'rally');run(e,22);assert.equal(u.safeTime,0);assert.equal(u.morale,35);assert.equal(u.cohesion,30);
});
test('firing feedback distinguishes reload, blocked sight, range and a locked front', () => {
 const e=make();empty(e);const u=place(unit(e),700,650,{facing:-Math.PI/2,reload:3});const foe=place(unit(e,'gibbon-center'),700,450,{ammunition:0});
 const feedback=()=>e.snapshot().formations.find(v=>v.id===u.id).fireStatus;
 assert.match(feedback(),/reloading/);
 const block=place(unit(e,'pettigrew-division'),700,550);assert.match(feedback(),/line of fire blocked/);
 block.active=false;foe.y=300;assert.match(feedback(),/out of range/);
 foe.y=450;e.face(u.id,{x:700,y:900});u.facing=Math.PI/2;assert.match(feedback(),/outside locked fire arc/);
});

test('a departed focus target returns the formation to automatic targeting', () => {
 const e=make();empty(e);const u=place(unit(e),700,650);const foe=place(unit(e,'gibbon-center'),700,450,{ammunition:0});
 e.focusTarget(u.id,foe.id);foe.active=false;e.tick(.05);assert.equal(u.focusTargetId,null);assert.equal(u.aimTargetId,null);
});

test('withdrawal field status shows the selected mission rather than ridge control', () => {
 const e=make('option_c');assert.match(e.snapshot().fieldStatus.label,/Force withdrawn: 0% \/ 70%/);
 e.state.filter(u=>u.side==='confederate').forEach(u=>e.order(u.id,'withdraw'));run(e,40);
 assert.match(e.snapshot().fieldStatus.label,/Force withdrawn:/);assert.equal(e.outcome,'disciplined-withdrawal');
});

test('Gettysburg volley pressure scales with formation losses and is faction symmetric', async () => {
 const {resolveGettysburgVolley}=await import('../src/battle/gettysburgMechanics.js');
 const shoot=(side,size=5000)=>{
  const e=make();empty(e);const a=place(unit(e),700,700,{side,facing:-Math.PI/2,strength:4000,initialStrength:4000,morale:80,cohesion:80,fatigue:0,reload:0,ammunition:40});
  const b=place(unit(e,'gibbon-center'),700,500,{side:side==='union'?'confederate':'union',facing:Math.PI/2,strength:size,initialStrength:size,morale:80,cohesion:80,ammunition:0});
  resolveGettysburgVolley(e,a,b);return{loss:size-b.strength,cohesionLoss:80-b.cohesion,moraleLoss:80-b.morale,suppression:b.suppression};
 };
 assert.deepEqual(shoot('union'),shoot('confederate'));
 const full=shoot('confederate',10000),half=shoot('confederate',5000);
 assert.ok(Math.abs(full.loss-half.loss)<1e-9);assert.ok(Math.abs(full.cohesionLoss*2-half.cohesionLoss)<1e-9);
});
test('suppression reduces return fire and lengthens loading instead of being only an invisible rout countdown', async()=>{
 const {resolveGettysburgVolley}=await import('../src/battle/gettysburgMechanics.js');
 const shot=suppression=>{const e=make();empty(e);const a=place(unit(e),700,700,{suppression,reload:0,facing:-Math.PI/2});const b=place(unit(e,'gibbon-center'),700,500,{ammunition:0});const before=b.strength;resolveGettysburgVolley(e,a,b);return{loss:before-b.strength,reload:a.reload};};
 const steady=shot(0),suppressed=shot(75);assert.ok(suppressed.loss<steady.loss*.75);assert.ok(suppressed.reload>steady.reload*1.4);
});
test('columns expose more men to fire; skirmishers trade lower exposure for weaker volleys', async()=>{
 const {resolveGettysburgVolley}=await import('../src/battle/gettysburgMechanics.js');
 const shot=(attackerMode,targetMode)=>{const e=make();empty(e);const a=place(unit(e),700,700,{formationMode:attackerMode,reload:0,facing:-Math.PI/2});const b=place(unit(e,'gibbon-center'),700,500,{formationMode:targetMode,ammunition:0});const before=b.strength;resolveGettysburgVolley(e,a,b);return before-b.strength;};
 assert.ok(shot('line','column')>shot('line','line'));assert.ok(shot('line','skirmish')<shot('line','line'));assert.ok(shot('skirmish','line')<shot('line','line'));
});
test('a battery fires canister only at close range and cannot fire while limbered', async()=>{
 const {resolveGettysburgVolley}=await import('../src/battle/gettysburgMechanics.js');
 const e=make();empty(e);const a=place(unit(e,'alexander-battalion'),700,700,{reload:0,facing:-Math.PI/2});const b=place(unit(e,'gibbon-center'),700,560,{ammunition:0});
 resolveGettysburgVolley(e,a,b);assert.equal(a.lastShotType,'canister');const close= b.initialStrength-b.strength;
 b.y=300;b.strength=b.initialStrength;a.reload=0;resolveGettysburgVolley(e,a,b);assert.equal(a.lastShotType,'shell');assert.ok(close>(b.initialStrength-b.strength)*1.4);
 a.gunState='limbered';a.reload=0;const before={ammo:a.ammunition,strength:b.strength};resolveGettysburgVolley(e,a,b);assert.deepEqual({ammo:a.ammunition,strength:b.strength},before);
});
test('suppression can recover during a pause in incoming fire without secretly restoring morale or men',()=>{
 const e=make();empty(e);const a=place(unit(e),700,700,{suppression:70,lastIncomingAt:-100,morale:50,cohesion:50,strength:3000,ammunition:0});
 place(unit(e,'gibbon-center'),700,470,{ammunition:0});run(e,5);
 assert.ok(a.suppression<60);assert.equal(a.morale,50);assert.equal(a.cohesion,50);assert.equal(a.strength,3000);
});
test('routing cause records the actual break threshold and survives the retreat',()=>{
 const e=make();empty(e);const a=place(unit(e),700,550,{suppression:95,lastIncomingAt:0});e.tick(.05);
 assert.equal(a.status,'routing');assert.match(a.routingCause,/Sustained suppression/);const cause=a.routingCause,at=a.routingAt;run(e,8);assert.equal(a.routingCause,cause);assert.equal(a.routingAt,at);
});
test('organized enemies take priority over fleeing troops; pursuit requires explicit focus',async()=>{
 const {selectGettysburgTarget}=await import('../src/battle/gettysburgMechanics.js');
 const e=make();empty(e);const a=place(unit(e),700,700,{facing:-Math.PI/2});
 const fleeing=place(unit(e,'gibbon-center'),700,550,{status:'routing',order:'withdraw',ammunition:0});
 const threat=place(unit(e,'hays-center'),700,490,{ammunition:0});assert.equal(selectGettysburgTarget(e,a).id,threat.id);
 threat.active=false;assert.equal(selectGettysburgTarget(e,a),undefined);e.focusTarget(a.id,fleeing.id);assert.equal(selectGettysburgTarget(e,a).id,fleeing.id);
});
test('Advance does not chase a routing enemy away from the objective',()=>{
 const e=make();empty(e);const a=place(unit(e),700,700);place(unit(e,'gibbon-center'),700,300,{status:'routing',order:'withdraw',ammunition:0});
 e.order(a.id,'advance');run(e,3);assert.ok(Math.abs(a.y-700)<1);assert.doesNotThrow(()=>e.snapshot());
});
test('wide friendly ranks block fire across their actual frontage, while an open lane stays clear',async()=>{
 const {gettysburgFootprint,gettysburgClearance}=await import('../src/battle/gettysburgMechanics.js');
 const e=make();empty(e);const a=place(unit(e),700,700),b=place(unit(e,'gibbon-center'),700,470);const screen=place(unit(e,'pettigrew-division'),745,550,{formationMode:'line',facing:-Math.PI/2});
 assert.equal(gettysburgLineOfFire(e,a,b),false);screen.x=790;assert.equal(gettysburgLineOfFire(e,a,b),true);
 assert.ok(gettysburgFootprint(screen).width>gettysburgFootprint({...screen,formationMode:'column'}).width);
 const sideways={...a,x:screen.x+200,y:screen.y,facing:-Math.PI/2};assert.ok(gettysburgClearance(screen,sideways)>120);
});
test('supported infantry reduce incoming suppression, without negating damage',async()=>{
 const {resolveGettysburgVolley}=await import('../src/battle/gettysburgMechanics.js');
 const shot=supported=>{const e=make();empty(e);const a=place(unit(e),700,700,{reload:0,facing:-Math.PI/2});const b=place(unit(e,'gibbon-center'),700,500,{ammunition:0});if(supported)place(unit(e,'hays-center'),960,500,{ammunition:0});const before=b.strength;resolveGettysburgVolley(e,a,b);return{loss:before-b.strength,suppression:b.suppression};};
 const alone=shot(false),supported=shot(true);assert.equal(alone.loss,supported.loss);assert.ok(supported.suppression<alone.suppression);
});
test('supported assaults survive a lost supporting formation through explicit regrouping across campaign supply states',()=>{
 for(const [metrics,focus]of [[state.metrics,15],[{militaryStrength:70,munitions:60,publicMorale:60,foodSupply:60,treasury:60},25]]){
  const e=new CivilWarBattleEngine('gettysburg',{rulesVersion:2,battleRulesVersion:3,metrics},'option_a');const inf=e.state.filter(u=>u.side==='confederate'&&u.type==='infantry');
  inf.forEach((u,i)=>{e.setFormation(u.id,'line');e.move(u.id,{x:[670,825,1060,1270][i],y:i%2?570:545});});e.move('alexander-battalion',{x:950,y:675});let regrouped=false;
  for(let i=0;i<4900&&e.outcome==='undecided';i++){
   if(i===focus*20)e.focusTarget('alexander-battalion','cushing-battery');
   if(i===45*20)inf.forEach((u,j)=>e.order(u.id,'assault',{sectorId:j<2?'center':'angle'}));
   if(i%20===0&&e.time>60&&!regrouped&&(!inf[2].active||inf[2].status==='routing')){
    const reserve=[inf[1],inf[0]].find(u=>u.active&&u.status!=='routing'&&u.morale>=30&&u.cohesion>=25);
    if(reserve){e.move(reserve.id,{x:900,y:375});regrouped=true;}
   }
   e.tick(.05);
  }
  assert.equal(regrouped,true);assert.ok(['decisive-win','costly-win'].includes(e.outcome));assert.equal(e.gettysburg.held,18);assert.ok(e.time<210);assert.ok(e.gettysburg.reserveCommitted);
 }
});

test('diagonal formation clearance separates the rendered rectangles, including their corners',async()=>{
 const {gettysburgClearance,gettysburgFootprint}=await import('../src/battle/gettysburgMechanics.js');
 const corners=u=>{const f=gettysburgFootprint(u);return[-1,1].flatMap(x=>[-1,1].map(y=>({x:u.x+Math.cos(u.facing)*x*f.depth/2-Math.sin(u.facing)*y*f.width/2,y:u.y+Math.sin(u.facing)*x*f.depth/2+Math.cos(u.facing)*y*f.width/2})));};
 for(const facing of [0,.4,Math.PI/4,1.2,Math.PI/2])for(const direction of [.2,.7,1.1,1.8,2.4]){
  const a={x:0,y:0,facing,formationMode:'line',type:'infantry'};const b={...a,x:Math.cos(direction)*500,y:Math.sin(direction)*500,facing:-facing};const distance=gettysburgClearance(a,b);b.x=Math.cos(direction)*distance;b.y=Math.sin(direction)*distance;
  const project=p=>p.x*Math.cos(direction)+p.y*Math.sin(direction);
  assert.ok(Math.max(...corners(a).map(project))<=Math.min(...corners(b).map(project))-7.99);
 }
});
test('an assault can engage at the touching frontage of a turned enemy instead of freezing with blocked weapons',()=>{
 const e=make();empty(e);const a=place(unit(e),700,700,{facing:-Math.PI/2,reload:0});const b=place(unit(e,'gibbon-center'),790,650,{facing:0,ammunition:0});
 const before=b.morale;e.order(a.id,'assault',{sectorId:'angle'});run(e,5);assert.ok(b.morale<before);assert.ok(a.lastVolleyAt>0||b.strength<b.initialStrength);
});

test('a closer frontal enemy cannot hide a second enemy on the rear flank',()=>{
 const e=make();empty(e);const a=place(unit(e),700,650,{facing:-Math.PI/2,ammunition:0});
 place(unit(e,'gibbon-center'),700,510,{ammunition:0});place(unit(e,'hays-center'),700,810,{ammunition:0});const before=a.morale;run(e,2);
 assert.equal(a.flanked,true);assert.ok(a.morale<before);assert.match(a.pressureReason,/flank or rear/);
});

test('a routed unit already at a guarded rear gate is captured instead of waiting forever',()=>{
 const e=make();empty(e);const a=place(unit(e),850,882,{status:'routing',order:'withdraw',morale:18,cohesion:14,retreatOrigin:{x:850,y:700},retreatExit:{x:850,y:882}});
 place(unit(e,'gibbon-center'),850,817,{ammunition:0});place(unit(e,'hays-center'),180,817,{ammunition:0});place(unit(e,'webb-angle'),1510,817,{ammunition:0});
 run(e,20);assert.equal(a.status,'surrendered');assert.equal(a.active,false);assert.ok(a.capturedStrength>0);assert.equal(a.withdrawn,undefined);
});
test('repeating a received Rally preserves its accumulated progress and can cancel a pending replacement',()=>{
 const e=make();empty(e);const a=place(unit(e),500,600,{morale:24,cohesion:18});place(unit(e,'pettigrew-division'),710,600);
 e.order(a.id,'rally');run(e,8);const before=a.safeTime;e.order(a.id,'rally');run(e,3);assert.ok(a.safeTime>before+2.9);run(e,1);assert.ok(a.morale>24);
 e.order(a.id,'withdraw');assert.equal(a.pendingCommand.order,'withdraw');const progress=a.safeTime;e.order(a.id,'rally');assert.equal(a.pendingCommand,null);assert.equal(a.safeTime,progress);
});
test('an explicit Move cannot inflict offensive melee while marching past an enemy but remains vulnerable',()=>{
 const e=make();empty(e);const a=place(unit(e),700,650,{facing:-Math.PI/2,ammunition:0});const b=place(unit(e,'gibbon-center'),700,582,{facing:Math.PI/2,ammunition:0});
 e.move(a.id,{x:850,y:650});while(a.pendingCommand)e.tick(.05);const before={enemy:b.strength,own:a.strength,x:a.x};e.tick(.05);
 assert.equal(a.directMove,true);assert.ok(a.x>before.x);assert.equal(b.strength,before.enemy);assert.ok(a.strength<before.own);
});

test('Hancock halts his counterattack to fight nearby invaders rather than marching helplessly into an occupied destination',()=>{
 const e=make();empty(e);const attacker=place(unit(e),1135,370,{ammunition:0});const reserve=place(unit(e,'hancock-reserve'),1285,350,{ammunition:40,reload:0});
 const before=attacker.strength;run(e,4);assert.equal(e.gettysburg.reserveIntent,'Counterattack The Angle');assert.equal(reserve.directMove,false);assert.ok(attacker.strength<before);assert.equal(reserve.x,1285);assert.equal(reserve.y,350);
});

test('readiness explains the nearest support gap even outside the support radius',async()=>{
 const {gettysburgReadiness}=await import('../src/battle/gettysburgMechanics.js');const e=make();empty(e);const a=place(unit(e),600,600);const b=place(unit(e,'pettigrew-division'),952,600);
 const isolated=gettysburgReadiness(e,a);assert.equal(isolated.supported,false);assert.equal(isolated.nearestSupportId,b.id);assert.equal(isolated.nearestSupportName,b.name);assert.equal(isolated.nearestSupportDistance,352);assert.equal(isolated.supportRange,340);
 b.x=939;assert.equal(gettysburgReadiness(e,a).supported,true);b.active=false;assert.equal(gettysburgReadiness(e,a).nearestSupportDistance,null);
});

test('a formation pauses its pivot before its frontage cuts through an adjacent friendly rectangle',()=>{
 const e=make();empty(e);const a=place(unit(e),700,650,{facing:0,formationMode:'line'});place(unit(e,'pettigrew-division'),755,650,{facing:0,formationMode:'line'});
 e.face(a.id,{x:700,y:850});
 for(let i=0;i<100;i++){
  e.tick(.05);
  const corners=[-1,1].flatMap(depth=>[-1,1].map(width=>700+Math.cos(a.facing)*depth*16-Math.sin(a.facing)*width*62));
  assert.ok(Math.max(...corners)<739,'the pivoting rectangle must stay left of the adjacent unit');
 }
 assert.equal(a.turnBlocked,true);assert.equal(a.turning,true);assert.ok(a.facing>0&&a.facing<Math.PI/2);assert.equal(a.x,700);assert.equal(a.y,650);
});
