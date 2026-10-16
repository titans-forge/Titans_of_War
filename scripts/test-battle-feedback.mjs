import { createFreshCampaignState, createCampaignSnapshot, restoreCampaignFromSnapshot, getCampaignSnapshotCompatibility } from '../src/game/campaignStorage.js';
import { delegateBattle, BATTLE_SCENARIOS } from '../src/game/battles.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { objectiveControl, objectiveEligibility } from '../src/battle/objectiveControl.js';
import { objectiveFeedback, rallyFeedback, armyAttention } from '../src/battle/battleFeedback.js';
import { gettysburgFireStatus, judgeGettysburg } from '../src/battle/gettysburgMechanics.js';
import { updateFieldMission } from '../src/battle/fieldBattleMechanics.js';
import { getBattleAssessment, isBattleAssessment } from '../src/battle/battleAssessment.js';
const campaign = { rulesVersion: 2, battleRulesVersion: 7, metrics: { militaryStrength: 85, munitions: 80, publicMorale: 80, foodSupply: 78, treasury: 75 } };
const make = (id = 'gettysburg') => new CivilWarBattleEngine(id, campaign, 'option_a');
const place = (u, s, extra = {}) => Object.assign(u, { active: true, x: s.x, y: s.y, status: 'steady', morale: 60, cohesion: 60, order: 'hold', directMove: false, ...extra });
const empty = e => e.state.forEach(u => { u.active = false; u.arrivalTime = null; });
test('contact state overrides ready, rally and withdrawal fire messages', () => {
 const e = make(), u = e.state[0]; u.inMelee = true;
 for (const order of ['hold', 'assault', 'rally']) { u.order = order; assert.match(gettysburgFireStatus(e, u), /Close combat/); }
 for (const order of ['withdraw', 'fallback']) { u.order = order; assert.match(gettysburgFireStatus(e, u), /Breaking contact/); }
 u.active = false; u.withdrawn = true; assert.equal(gettysburgFireStatus(e, u), 'Off the field');
});
test('ten safe minutes do not falsely imply a recovered routing unit', () => {
 const r = rallyFeedback({ order: 'rally', safeTime: 10, morale: 45, cohesion: 23, readiness: { rallySafe: true, supported: true } });
 assert.equal(r.checks[2].met, true); assert.equal(r.checks[4].met, false); assert.match(r.message, /Recovering morale and cohesion/);
 assert.match(rallyFeedback({ order: 'rally', safeTime: 0, morale: 20, cohesion: 20, readiness: { rallySafe: false, supported: true } }).message, /blocked/);
});
test('ridge explanations and adjudication agree on supported control and real boundaries', () => {
 const e = make(); empty(e); const s = e.gettysburg.sectors[0], u = e.state[0], friend = e.state[1];
 place(u, s); place(friend, {x:s.x+250,y:s.y}); judgeGettysburg(e);
 const report = objectiveFeedback(e.snapshot(), u.id)[0]; assert.equal(s.control, 'confederate'); assert.deepEqual(report.supported,[u.name]); assert.equal(report.reason,'Counts toward control');
 u.x = s.x+s.width/2+.01; judgeGettysburg(e); assert.equal(s.control,'vacant'); assert.match(objectiveFeedback(e.snapshot(),u.id)[0].reason,/center is outside/);
 u.x=s.x;u.strength=599;assert.match(objectiveEligibility(u,s,'ridge'),/600/);
});
test('attack capture excludes move and retreat orders while ridge preserves its existing rules', () => {
 const e=make('shiloh');empty(e);const s=e.fieldBattle.attackObjective;const pair=e.state.filter(u=>u.side==='confederate'&&u.type==='infantry').slice(0,2);
 pair.forEach((u,i)=>place(u,{x:s.x+i*60,y:s.y}));
 updateFieldMission(e,1);assert.equal(s.eligible,2);assert.equal(s.held,1);
 for (const order of ['rally','fallback','withdraw']) {pair[0].order=order;updateFieldMission(e,1);assert.equal(s.held,0);assert.match(objectiveFeedback(e.snapshot(),pair[0].id)[0].reason,/Finish moving or recovering/);}
 pair[0].order='hold';pair[0].directMove=true;updateFieldMission(e,1);assert.equal(s.eligible,0);
 assert.equal(objectiveEligibility(pair[0],s,'ridge'),null);
 pair[0].directMove=false;const foe=e.state.find(u=>u.side==='union');place(foe,s);updateFieldMission(e,1);assert.equal(s.defenders,1);assert.equal(s.held,0);
});
test('shared ridge rules match original checks across boundary and formation variations', () => {
 const e=make();const s=e.gettysburg.sectors[0];let seed=191;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
 for(let i=0;i<400;i++) {
  e.state.forEach(u=>Object.assign(u,{active:rand()>.2,x:s.x+(rand()-.5)*600,y:s.y+(rand()-.5)*260,strength:Math.floor(rand()*1200),morale:rand()*100,cohesion:rand()*100,status:rand()<.2?'routing':'steady'}));
  const organized=u=>u.active&&u.strength>0&&!['broken','surrendered','routing'].includes(u.status)&&u.morale>=30&&u.cohesion>=25;
  const occupants=e.state.filter(u=>u.type==='infantry'&&organized(u)&&u.strength>=600&&Math.abs(u.x-s.x)<=s.width/2&&Math.abs(u.y-s.y)<=s.height/2);
  const old=occupants.some(u=>u.side==='confederate'&&e.state.some(v=>v.id!==u.id&&v.side===u.side&&organized(v)&&Math.hypot(u.x-v.x,u.y-v.y)<=340));
  assert.equal(objectiveControl(e.state,s,'ridge').supported.length>0,old);
 }
});
test('after-action evidence survives JSON, accepts old saves and rejects malformed new reports', () => {
 const e=make();e.beginResolution('defeat');e.state[0].routingAt=12;e.state[0].routingCause='Cohesion collapse without nearby support';
 e.events=Array.from({length:15},(_,i)=>({time:i,type:'warning',message:`Observed warning ${i}`}));
 const a=getBattleAssessment(e.snapshot(),'option_a');assert.ok(isBattleAssessment(a));assert.equal(a.afterAction.timeline.length,8);assert.equal(a.afterAction.omitted,8);assert.match(a.afterAction.next[0],/two ridge sectors/);assert.match(a.afterAction.next[1],/Fallback/);
 assert.ok(isBattleAssessment(JSON.parse(JSON.stringify(a))));const old=structuredClone(a);delete old.afterAction;assert.ok(isBattleAssessment(old));
 a.afterAction.timeline[0].time=-1;assert.equal(isBattleAssessment(a),false);
});
test('unfinished and delegated assessments do not invent a manual timeline', () => {
 const e=make();assert.equal(getBattleAssessment(e.snapshot(),'option_a').afterAction,undefined);
 const a=getBattleAssessment({...e.snapshot(),delegated:true,outcome:'defeat'},'option_a');assert.equal(a.afterAction,undefined);assert.ok(isBattleAssessment(a));
});

test('objective timeline records actual acquisition and timer reset, without changing victory timing', () => {
 const e=make();empty(e);const [a,b]=e.state;place(a,e.gettysburg.sectors[0]);place(b,e.gettysburg.sectors[1]);
 e.time=4;judgeGettysburg(e,4);e.time=5;judgeGettysburg(e,1);assert.equal(e.gettysburg.controlEvents.length,1);
 a.status='routing';e.time=6;judgeGettysburg(e,1);assert.equal(e.gettysburg.held,0);assert.equal(e.gettysburg.controlEvents.length,2);assert.match(e.gettysburg.controlEvents[1].message,/lost after 5.0/);
 e.beginResolution('defeat');const report=getBattleAssessment(e.snapshot(),'option_a').afterAction;assert.ok(report.timeline.some(e=>e.message.includes('hold timer reset')));
});

test('campaign export and restore retain the manual report in both battle ledgers', () => {
 const scene={id:'first',title:'First',turn:1,choices:[{id:'continue',text:'Continue'}]};
 const state=createFreshCampaignState(1861,scene.id), battle=Object.values(BATTLE_SCENARIOS).find(b=>b.id==='gettysburg');
 const e=make();e.beginResolution('defeat');const assessment=getBattleAssessment(e.snapshot(),'option_a');
 const result={...delegateBattle(state,battle,'option_a'),result:'defeat',delegated:false,assessment,battleRulesVersion:7};
 state.history.push({scenarioId:battle.scenarioId,choiceId:'option_a',battleResult:result});
 state.battleCampaign.results[battle.scenarioId]=result;
 const saved=JSON.parse(JSON.stringify(createCampaignSnapshot(state,scene)));assert.equal(getCampaignSnapshotCompatibility(saved).ok,true);
 const restored=restoreCampaignFromSnapshot(saved,[scene]);assert.deepEqual(restored.state.history.at(-1).battleResult.assessment.afterAction,assessment.afterAction);assert.deepEqual(restored.state.battleCampaign.results[battle.scenarioId].assessment.afterAction,assessment.afterAction);
});

test('army attention prioritizes routing, excludes departed/enemy units, and does not issue commands',()=>{
 const e=make(); const units=e.state.filter(u=>u.side==='confederate'&&u.active); const a=units[0],b=units[1];
 a.status='routing';a.order='withdraw';b.condition='wavering';b.morale=30;
 const snapshot=e.snapshot(),before=JSON.stringify(snapshot), notices=armyAttention(snapshot);
 assert.equal(notices[0].id,a.id);assert.match(notices[0].advice,/explicitly order Rally/);assert.ok(notices.some(n=>n.id===b.id&&n.priority===3));assert.equal(JSON.stringify(snapshot),before);
 snapshot.formations.find(u=>u.id===a.id).active=false;assert.ok(!armyAttention(snapshot).some(n=>n.id===a.id));
 snapshot.outcome='defeat';assert.deepEqual(armyAttention(snapshot),[]);
});
test('army attention explains active rally safety instead of promising instant recovery',()=>{
 const u={id:'a',name:'A',side:'confederate',active:true,strength:100,status:'routing',order:'rally',morale:22,cohesion:20,safeTime:0,readiness:{rallySafe:false,supported:true}};
 assert.match(armyAttention({outcome:'undecided',formations:[u]})[0].advice,/Rally blocked/);
 u.status='steady';u.order='hold';u.morale=80;u.cohesion=80;u.flanked=true;
 assert.match(armyAttention({outcome:'undecided',formations:[u]})[0].reason,/Flank/);
});


test('turning obstruction surfaces without changing orders or alerting for departed formations',()=>{
 const e=make();const s=e.snapshot(),u=s.formations.find(u=>u.side==='confederate'&&u.active);
 Object.assign(u,{status:'steady',condition:'steady',strength:100,morale:80,cohesion:80,suppression:0,flanked:false,ammunition:20,order:'assault',pressureReason:'Turning space blocked by a nearby formation'});
 const before=structuredClone(s);const alert=armyAttention(s).find(a=>a.id===u.id);
 assert.equal(alert.reason,'Turning space blocked');assert.match(alert.advice,/preview a short move/);assert.deepEqual(s,before);
 u.pressureReason='Enemy nearby';assert.ok(!armyAttention(s).some(a=>a.id===u.id&&a.reason==='Turning space blocked'));
 u.pressureReason='Turning space blocked by a nearby formation';u.active=false;assert.ok(!armyAttention(s).some(a=>a.id===u.id));
});
