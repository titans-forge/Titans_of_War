// Frozen stress policies. These are not human win rates or optimized commanders.
import { writeFileSync, appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { getBattleAssessment } from '../src/battle/battleAssessment.js';
import { BATTLE_SCENARIOS } from '../src/game/battles.js';
import { createPracticeState, PRACTICE_AMMUNITION } from '../src/game/practiceConditions.js';
const output=resolve(process.argv[2] || 'balance-results');mkdirSync(output,{recursive:true});
const rows=resolve(output,'tactical.jsonl');writeFileSync(rows,'');
const policyNames=['no-orders','all-assault','immediate-withdrawal','late-withdrawal'];
const record=(battle,choice,ammunition,policy,doctrine='reserve',commit=65)=>{
 const state=createPracticeState({id:battle.scenarioId,turn:1},doctrine,ammunition);
 const e=new CivilWarBattleEngine(battle.id,state,choice), issued=new Set();let committed=false,reserveCommitted=false,orders=0,rejected=0;
 const order=(u,kind,point)=>{const ok=e.order(u.id,kind,point);orders++;if(ok===false)rejected++;};
 if(policy==='supported-flank')for(const [id,x,y] of [['jackson-brigade',450,620],['bee-evans-line',820,710],['hampton-reserve',650,760]])e.move(id,{x,y});
 for(let i=0;i<2200 && e.outcome==='undecided';i++) {
  for(const u of e.state.filter(u=>u.side==='confederate'&&u.active&&!issued.has(u.id))) {
   if(policy==='no-orders'||policy==='supported-flank')continue;
   if(policy==='late-withdrawal' && e.time<e.config.maxTime*.55)continue;
   order(u,policy==='all-assault'?(u.type==='artillery'?'advance':'assault'):'withdraw');issued.add(u.id);
  }
  if(policy==='supported-flank'){
   const r=e.state.find(u=>u.id==='elzey-reinforcement');
   if(r?.active&&!issued.has(r.id)&&e.time>=51){e.move(r.id,{x:340,y:440});issued.add(r.id);}
   if(!committed&&e.time>=commit){order(e.state.find(u=>u.id==='jackson-brigade'),'assault',{sectorId:'left'});committed=true;}
   if(r?.active&&issued.has(r.id)&&!reserveCommitted&&Math.hypot(r.x-340,r.y-440)<8){order(r,'assault',{sectorId:'left'});reserveCommitted=true;}
  }
  e.tick(.2);
 }
 const s=e.snapshot(),a=getBattleAssessment(s,choice);
 const issues=[];
 if(s.outcome==='undecided')issues.push('nonterminal');
 for(const u of s.formations)if(!['x','y','strength','morale','cohesion','ammunition'].every(k=>Number.isFinite(u[k]))||u.strength<0||u.strength>u.initialStrength||u.ammunition<0)issues.push(`invalid:${u.id}`);
 if(!Number.isFinite(a.commandScore)||a.commandScore<0||a.commandScore>100)issues.push('invalid-score');
 const row={battle:battle.id,choice,ammunition,policy,doctrine,commit:policy==='supported-flank'?commit:null,outcome:s.outcome,mission:a.objective.status,kind:a.objective.kind,score:a.commandScore,time:s.time,loss:s.confederateLossRate,orders,rejected,issues};
 appendFileSync(rows,JSON.stringify(row)+'\n');return row;
};
const records=[];
for(const battle of Object.values(BATTLE_SCENARIOS)) {
 for(const choice of ['option_a','option_b','option_c','option_d'])for(const ammo of Object.keys(PRACTICE_AMMUNITION))for(const policy of policyNames)records.push(record(battle,choice,ammo,policy));
 console.log(`${battle.id}: ${records.length} cases recorded`);
}
const manassas=Object.values(BATTLE_SCENARIOS).find(b=>b.id==='first_manassas');
for(const choice of ['option_a','option_d'])for(const ammo of Object.keys(PRACTICE_AMMUNITION))for(const doctrine of ['reserve','flank','depth'])for(const commit of [65,90])records.push(record(manassas,choice,ammo,'supported-flank',doctrine,commit));
const summary={version:1,release:'0.25.0',battleRules:17,dt:.2,policies:policyNames,limitations:'Deterministic stress policies, not human win rates. Main matrix uses reserve doctrine; the supported Manassas reference varies all three doctrines and two commitment times. Other missions need bespoke competent-play coverage.',scriptSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),cases:records.length,issues:records.filter(r=>r.issues.length),groups:[]};
for(const ammo of Object.keys(PRACTICE_AMMUNITION))for(const policy of [...policyNames,'supported-flank']){const group=records.filter(r=>r.ammunition===ammo&&r.policy===policy);summary.groups.push({ammunition:ammo,policy,n:group.length,achieved:group.filter(r=>r.mission==='achieved').length,meanLoss:group.reduce((n,r)=>n+r.loss,0)/group.length});}
writeFileSync(resolve(output,'tactical-summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
if(summary.issues.length)process.exitCode=1;
