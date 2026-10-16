import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { henryHillObjective, henryHillConditions } from '../src/battle/henryHillObjective.js';
import { updateFieldMission } from '../src/battle/fieldBattleMechanics.js';
import { getBattleAssessment, isBattleAssessment } from '../src/battle/battleAssessment.js';
import { getGettysburgForceReport } from '../src/battle/gettysburgCommandBrief.js';
const make = (choice = 'option_b', version = 7) => new CivilWarBattleEngine('first_manassas', { rulesVersion:2, battleRulesVersion:version }, choice);
function setup() {
  const e=make();e.state.forEach(u=>{u.active=false;});
  const pair=e.state.filter(u=>u.side==='confederate'&&u.type==='infantry').slice(0,2);
  pair.forEach((u,i)=>Object.assign(u,{active:true,status:'steady',morale:60,cohesion:60,x:600+i*200,y:620,order:'hold',lastIncomingAt:-1000}));
  e.time=105;e.fieldBattle.defendedUnderFire=true;return {e,pair};
}
test('Henry Hill requires the deadline, connected infantry, no organized enemy, and defense under fire',()=>{
  const {e,pair}=setup();assert.equal(henryHillObjective(e).achieved,true);
  for (const mutation of [e=>{e.time=104.99;},e=>{e.fieldBattle.defendedUnderFire=false;},()=>{pair[1].x=1000;},()=>{pair[1].order='fallback';},()=>{pair[1].status='routing';},()=>{pair[1].morale=29;},()=>{pair[1].cohesion=24;},()=>{pair[1].type='artillery';}]) {
    const saved=structuredClone({state:e.state,time:e.time,field:e.fieldBattle});mutation(e);assert.equal(henryHillObjective(e).achieved,false);e.state=saved.state;e.time=saved.time;e.fieldBattle=saved.field;
    // Refresh the original references for the next mutation.
    pair.splice(0,pair.length,...e.state.filter(u=>u.side==='confederate'&&u.type==='infantry').slice(0,2));
  }
  const foe=e.state.find(u=>u.side==='union');Object.assign(foe,{active:true,status:'steady',morale:60,cohesion:60,x:700,y:620});assert.equal(henryHillObjective(e).enemies,1);assert.equal(henryHillObjective(e).achieved,false);
});
test('formation centers and support range include their exact authored boundaries',()=>{
 const {e,pair}=setup();Object.assign(pair[0],{x:380,y:535});Object.assign(pair[1],{x:720,y:535});assert.equal(henryHillObjective(e).supporting,2);pair[1].x+=.01;assert.equal(henryHillObjective(e).supporting,0);pair[1].x=600;pair[0].y=534.99;assert.equal(henryHillObjective(e).supporting,0);
});
test('observed fire persists, but reading objective conditions never changes engine state',()=>{
 const {e,pair}=setup();e.fieldBattle.defendedUnderFire=false;pair[0].lastIncomingAt=104;const before=JSON.stringify(e.state);assert.equal(henryHillObjective(e).underFire,true);assert.equal(e.fieldBattle.defendedUnderFire,false);assert.equal(JSON.stringify(e.state),before);updateFieldMission(e);assert.equal(e.fieldBattle.defendedUnderFire,true);assert.equal(e.pendingOutcome,'costly-win');
});
test('snapshots expose detached mission evidence and preserve existing command scoring',()=>{
 const {e}=setup();updateFieldMission(e);const s=e.snapshot();const assessment=getBattleAssessment(s,'option_b');assert.equal(s.fieldBattle.defenseObjective.achieved,true);assert.equal(assessment.objective.status,'achieved');assert.equal(isBattleAssessment(assessment),true);assert.equal(assessment.evidence.length,7);
 const legacy=structuredClone(s);delete legacy.fieldBattle.defenseObjective;assert.equal(getBattleAssessment(legacy,'option_b').commandScore,assessment.commandScore);s.fieldBattle.defenseObjective.supporting=999;assert.equal(e.snapshot().fieldBattle.defenseObjective.supporting,2);
});
test('defense criteria never appear on Manassas attack, withdrawal, or legacy non-tactical missions',()=>{
 for(const choice of ['option_a','option_c','option_d']) { const e=make(choice);assert.equal(henryHillObjective(e),null);assert.equal(e.snapshot().fieldBattle.defenseObjective,undefined);if(e.fieldBattle.attackObjective)assert.ok(e.fieldBattle.advice.every(t=>!t.startsWith('At field minute 105'))); }
 assert.equal(henryHillObjective(make('option_b',2)),null);
});
test('a defensive defeat teaches Henry Hill and records unmet support without Gettysburg assault instructions',()=>{
 const {e,pair}=setup();pair[1].status='routing';e.beginResolution('defeat');const s=e.snapshot();const a=getBattleAssessment(s,'option_b');const report=getGettysburgForceReport(s,a);assert.match(report.explanation,/Henry Hill/);assert.doesNotMatch(report.explanation,/ridge hold|assault formations/);assert.match(a.afterAction.next[0],/minute 105/);assert.ok(a.evidence.some(v=>/Supporting infantry/.test(v.label)&&v.value.startsWith('Unmet')));assert.equal(henryHillConditions(s.fieldBattle.defenseObjective).filter(c=>!c.satisfied).length,1);assert.ok(isBattleAssessment(a));
});
test('preserving an army in place never falsely reports an organized escape',()=>{
 const s={outcome:'disciplined-withdrawal',fieldBattle:{escaped:0},formations:[]};const report=getGettysburgForceReport(s,{objective:{kind:'preserve'}});assert.match(report.headline,/remained effective/);assert.doesNotMatch(report.headline,/escaped/);assert.match(report.explanation,/preservation in place/);
});
test('new Manassas ground has exact reviewed bytes, native PNG dimensions and provenance',()=>{
 for(const art of JSON.parse(readFileSync(new URL('../docs/field-art-v3-manifest.json',import.meta.url)))) {
 const bytes=readFileSync(new URL('../'+art.file,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),art.sha256);assert.equal(bytes.length,art.bytes);assert.equal(bytes.toString('ascii',1,4),'PNG');assert.equal(bytes.readUInt32BE(16),art.width);assert.equal(bytes.readUInt32BE(20),art.height);assert.match(art.kind,/AI-generated/);assert.match(art.scope,/not a surveyed historical map/);
 }
});
