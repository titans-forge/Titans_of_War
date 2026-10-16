import assert from 'node:assert/strict';
import {test} from 'node:test';
import {CivilWarBattleEngine} from '../src/battle/civilWarEngine.js';
import {createFreshCampaignState} from '../src/game/campaignStorage.js';
import {getBattleAssessment} from '../src/battle/battleAssessment.js';
import {siegeBrief,siegeCommand,sortieTargets} from '../src/battle/siegeCommand.js';
const make=id=>new CivilWarBattleEngine(id,createFreshCampaignState(1861,id),id==='petersburg'?'option_c':'option_d');
function play(e,policy){let returning=false;for(const u of e.state.filter(u=>u.side==='confederate'&&u.active)){
 if(policy==='all')e.order(u.id,'withdraw');
 if(policy==='mission'&&(e.config.sortieFormationIds||e.config.transferFormationIds).includes(u.id))e.order(u.id,e.scenarioId==='petersburg'?'advance':'withdraw');
}for(let i=0;i<5000&&e.outcome==='undecided';i++) {if(policy==='mission'&&e.sortieState==='raided'&&!returning){for(const id of e.config.sortieFormationIds)e.order(id,'withdraw');returning=true;}e.tick(.05);}assert.notEqual(e.outcome,'undecided');return e.snapshot();}
test('specialized mission openings select an available commanded formation',()=>{for(const id of ['petersburg','cold_harbor']){const e=make(id),b=siegeBrief(id,e.choiceId,15);assert.ok(e.state.find(u=>u.id===b.selection&&u.active&&u.side==='confederate'));}});
test('unrelated and legacy missions keep their existing brief and progress paths',()=>{assert.equal(siegeBrief('petersburg','option_b',15),null);assert.equal(siegeBrief('cold_harbor','option_d',2),null);const s=make('petersburg').snapshot();assert.equal(siegeCommand({...s,delegated:true},'option_c'),null);});
test('target locations remain available after a raid and are read without mutation',()=>{const s=make('petersburg').snapshot(),original=structuredClone(s);const t=sortieTargets(s);assert.equal(t.length,2);assert.ok(t.every(t=>!t.hit&&Number.isFinite(t.x)&&Number.isFinite(t.y)));assert.deepEqual(s,original);s.sortieTargetsHit=[t[0].id];s.formations.find(u=>u.id===t[0].id).active=false;assert.equal(sortieTargets(s)[0].hit,true);assert.equal(sortieTargets(s)[1].hit,false);});
test('raid-to-return transition uses absolute deadlines 54 and 86',()=>{const s=make('petersburg').snapshot();s.time=20;assert.match(siegeCommand(s,'option_c').detail,/Raid deadline 54 · 34/);s.sortieState='raided';assert.match(siegeCommand(s,'option_c').detail,/Return deadline 86 · 66/);s.time=90;s.sortieState='trapped';assert.match(siegeCommand(s,'option_c').title,/Return window missed/);assert.match(siegeCommand(s,'option_c').detail,/0 field minutes/);});
test('Cold Harbor screen display matches engine occupancy and organization at boundaries',()=>{
 const e=make('cold_harbor');for(const mode of ['opening','outside','routing','withdrawn']){
  if(mode==='outside')for(const u of e.state.filter(u=>u.entrenchDefender))u.y=614;
  if(mode==='routing')for(const u of e.state.filter(u=>u.entrenchDefender)){u.y=650;u.status='routing';}
  if(mode==='withdrawn')for(const u of e.state.filter(u=>u.side==='confederate')){u.active=false;u.withdrawn=true;u.withdrawalOrganized=true;}
  const s=e.snapshot(),r=siegeCommand(s,'option_d');assert.equal(r.screen>=2,e.coldHarborWorksOccupied());const ratio=e.state.filter(u=>u.side==='confederate'&&e.coldHarborOrganized(u)).reduce((n,u)=>n+u.strength,0)/e.initialConfederate;assert.ok(Math.abs(r.organizedRatio-ratio)<1e-9);
 }
});
test('Petersburg raid and return earns success and preserves both named raid events',()=>{
 const e=make('petersburg'),s=play(e,'mission'),a=getBattleAssessment(s,e.choiceId);assert.equal(a.objective.status,'achieved');assert.equal(s.sortieState,'withdrawn');assert.match(siegeCommand(s,e.choiceId).progress,/Targets 2 \/ 2 · Brigades returned in order 2 \/ 2/);for(const name of ['Western Siege Train','Eastern Engineer Depot'])assert.ok(a.afterAction.timeline.some(t=>t.message.includes(name)));
});
test('Cold Harbor transfer succeeds with a screen; wholesale retreat cannot substitute',()=>{
 const e=make('cold_harbor'),s=play(e,'mission');assert.equal(getBattleAssessment(s,e.choiceId).objective.status,'achieved');const r=siegeCommand(s,e.choiceId);assert.ok(r.screen>=2);assert.match(r.title,/Reserves clear/);
 const failed=play(make('cold_harbor'),'all');assert.notEqual(getBattleAssessment(failed,'option_d').objective.status,'achieved');assert.equal(siegeCommand(failed,'option_d').screen,0);
});
test('idle sortie reports explain the missed raid rather than generic withdrawal advice',()=>{const s=play(make('petersburg'),'hold');assert.equal(s.sortieState,'missed');assert.match(getBattleAssessment(s,'option_c').afterAction.next[0],/Western Siege Train/);});
