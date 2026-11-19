import assert from 'node:assert/strict';
import {test} from 'node:test';
import {withdrawalBrief,withdrawalCommand} from '../src/battle/withdrawalCommand.js';
import {CivilWarBattleEngine} from '../src/battle/civilWarEngine.js';
import {createFreshCampaignState} from '../src/game/campaignStorage.js';
import {getBattleAssessment} from '../src/battle/battleAssessment.js';
const engine=(id,choice)=>new CivilWarBattleEngine(id,createFreshCampaignState(1861,id),choice);
function run(e,policy){const ordered=new Set();for(let i=0;i<5000&&e.outcome==='undecided';i++){
 const covered=e.thirdWinchester&&(e.thirdWinchester.middleFieldHeld>=e.config.middleFieldHoldRequired||e.thirdWinchester.rearguardHeld>=e.config.rearguardHoldRequired);
 if(policy==='arrivals'||policy==='initial'&&i===0||policy==='covered'&&covered)for(const u of e.state.filter(u=>u.side==='confederate'&&u.active&&!ordered.has(u.id))){e.order(u.id,'withdraw');ordered.add(u.id);}
 e.tick(.05);
}assert.notEqual(e.outcome,'undecided');return e.snapshot();}
test('withdrawal guidance excludes other missions, legacy tactical rules and delegation',()=>{
 assert.equal(withdrawalBrief('wilderness','option_b',15),null);assert.equal(withdrawalBrief('wilderness','option_d',2),null);assert.equal(withdrawalBrief('third_winchester','option_a',15),null);
 const e=engine('wilderness','option_d');assert.equal(withdrawalCommand({...e.snapshot(),delegated:true},'option_d'),null);
});
test('Wilderness checkpoint accounts for scheduled reserves without inventing arrival or exit',()=>{
 const e=engine('wilderness','option_d'),s=e.snapshot(),r=withdrawalCommand(s,'option_d');assert.match(r.detail,/due at 12/);assert.match(r.detail,/due at 20/);assert.match(r.progress,/0%/);
 const u=s.formations.find(u=>u.id==='texas-brigade');u.arrivalBlocked=true;assert.match(withdrawalCommand(s,'option_d').detail,/arrival blocked/);u.active=true;u.arrivalBlocked=false;assert.match(withdrawalCommand(s,'option_d').detail,/needs an exit order/);u.pendingCommand={order:'withdraw'};assert.match(withdrawalCommand(s,'option_d').detail,/withdrawing/);
});
test('Winchester cover threshold does not award rounded-up time or confuse cover with escape',()=>{
 const s=engine('third_winchester','option_b').snapshot();
 s.thirdWinchester.middleFieldHeld=17.99;
 const pending=withdrawalCommand(s,'option_b');
 assert.match(pending.title,/Cover needed/);
 assert.match(pending.progress,/Middle Field 17\.9 \/ 18 min/);
 s.thirdWinchester.middleFieldHeld=18;
 const r=withdrawalCommand(s,'option_b');
 assert.match(r.title,/Cover earned/);
 assert.match(r.detail,/0% \/ 65%/);
 assert.match(r.detail,/not yet/);
});
test('Winchester debrief reports the exact withdrawal checkpoints and leaves the result intact', () => {
  const s = engine('third_winchester', 'option_d').snapshot();
  s.outcome = 'defeat';
  Object.assign(s.thirdWinchester, { rearguardHeld: 8, escapedRatio: .649 });
  const copy = structuredClone(s);
  const result = withdrawalCommand(s, 'option_d');
  assert.equal(result.final, true);
  assert.equal(result.title, 'Withdrawal results · Cover earned');
  assert.equal(result.detail, 'Withdrawn in order 64% / 65% · Gordon or Wharton home: no');
  const assessment = getBattleAssessment(s, 'option_d');
  assert.equal(assessment.objective.status, 'failed');
  assert.equal(assessment.evidence.find(item => item.label === 'Covered corridor exit').value,
    '64% withdrawn in order / 65% required');
  assert.deepEqual(s, copy);
});
test('command presentation is read only and preserves the snapshot',()=>{const s=engine('wilderness','option_d').snapshot(),copy=structuredClone(s);withdrawalCommand(s,'option_d');withdrawalBrief('wilderness','option_d',15);assert.deepEqual(s,copy);});

test('short Winchester readout reflects the more advanced cover checkpoint and organized exits', () => {
  const s = engine('third_winchester', 'option_d').snapshot();
  Object.assign(s.thirdWinchester, { middleFieldHeld: 3, rearguardHeld: 6, escapedRatio: .649 });
  assert.equal(withdrawalCommand(s, 'option_d').compactProgress, 'Cover 75% · 64% / 65% out');
  Object.assign(s.thirdWinchester, { rearguardHeld: 8, escapedRatio: .65 });
  assert.equal(withdrawalCommand(s, 'option_d').compactProgress, 'Cover earned · 65% / 65% out');
});
test('withdrawing Wilderness arrivals completes the existing mission; ignoring them fails',()=>{
 const failed=run(engine('wilderness','option_d'),'initial');assert.equal(failed.outcome,'rout');const a=getBattleAssessment(failed,'option_d');assert.match(a.afterAction.next[0],/Texas Brigade at minute 12/);
 const passed=run(engine('wilderness','option_d'),'arrivals');assert.equal(passed.outcome,'disciplined-withdrawal');assert.equal(passed.confederateLossRate,0);assert.equal(getBattleAssessment(passed,'option_d').objective.status,'achieved');assert.match(withdrawalCommand(passed,'option_d').progress,/100%/);
});
for(const choice of ['option_b','option_d'])test(`Winchester ${choice} succeeds with earned cover and fails an immediate unsupported exit`,()=>{
 const failed=run(engine('third_winchester',choice),'initial');assert.equal(failed.outcome,'defeat');
 const passed=run(engine('third_winchester',choice),'covered');assert.equal(passed.outcome,'disciplined-withdrawal');assert.equal(getBattleAssessment(passed,choice).objective.status,'achieved');assert.equal(passed.thirdWinchester.withdrawalState,'secured');assert.match(withdrawalCommand(passed,choice).title,/Cover earned/);
});
