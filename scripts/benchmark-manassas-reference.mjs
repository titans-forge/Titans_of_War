import {mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {runManassasReference} from './lib/manassas-reference-run.mjs';
import {MANASSAS_CURRENT_ATTACK_PLAN,MANASSAS_COMBINED_ARMS_PLAN} from '../src/battle/fieldAttackPlans.js';
const output=resolve(process.argv[2]||'manassas-reference-results');mkdirSync(output,{recursive:true});
const file=resolve(output,'reference-cases.jsonl');writeFileSync(file,'');const rows=[];
for(const [reference,plan] of [['previous',MANASSAS_COMBINED_ARMS_PLAN],['revised',MANASSAS_CURRENT_ATTACK_PLAN]])for(const doctrine of ['reserve','flank','depth'])for(const choice of ['option_a','option_d'])for(const ammunition of ['full','limited','depleted'])for(const commit of [60,65]){
 const {snapshot:s,orders}=runManassasReference({choice,doctrine,ammunition,commit,plan});
 const row={reference,doctrine,choice,ammunition,commit,reserveAt:51,outcome:s.outcome,held:s.fieldBattle.attackObjective.held,loss:s.confederateLossRate,time:s.time,orders};rows.push(row);appendFileSync(file,JSON.stringify(row)+'\n');
}
const summary={rules:17,dt:.2,cases:rows.length,limitations:'Fixed reference orders, not human win rates. Reserve dispatched at minute 51; timing sensitivity and broader supply cases are separate evidence. No simulation changes.',groups:[]};
for(const reference of ['previous','revised'])for(const ammunition of ['full','limited','depleted']){const group=rows.filter(r=>r.reference===reference&&r.ammunition===ammunition);summary.groups.push({reference,ammunition,cases:group.length,achieved:group.filter(r=>r.held>=8).length,meanLoss:group.reduce((n,r)=>n+r.loss,0)/group.length});}
writeFileSync(resolve(output,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
if(rows.some(r=>r.outcome==='undecided'))process.exitCode=1;
