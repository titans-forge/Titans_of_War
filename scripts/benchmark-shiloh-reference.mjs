import {mkdirSync,writeFileSync,appendFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {runShilohReference} from './lib/shiloh-reference-run.mjs';
const output=resolve(process.argv[2]||'shiloh-reference-results');
if(existsSync(output))throw new Error('Choose a new output directory to preserve earlier evidence');
mkdirSync(output,{recursive:true});const rows=[];
for(const [reference,times]of [['legacy-test-timing',[25,35,45]],['revised-review-window',[20,21,22]]])for(const doctrine of ['reserve','flank','depth'])for(const choice of ['option_a','option_c'])for(const ammunition of ['full','limited','depleted'])for(const commit of times){
 const {snapshot:s,orders}=runShilohReference({choice,doctrine,ammunition,commit});
 const row={reference,doctrine,choice,ammunition,commit,outcome:s.outcome,held:s.fieldBattle.attackObjective.held,loss:s.confederateLossRate,time:s.time,orders};rows.push(row);appendFileSync(resolve(output,'reference-cases.jsonl'),JSON.stringify(row)+'\n');
}
const summary={rules:17,dt:.2,cases:rows.length,limitations:'Fixed player-order checks, not human win rates. Same staging positions in both groups. Legacy tests committed at 25; 35 and 45 also measure delayed commitment. The former UI did not specify a commitment time. No simulation changes.',groups:[]};
for(const reference of ['legacy-test-timing','revised-review-window'])for(const ammunition of ['full','limited','depleted']){const g=rows.filter(r=>r.reference===reference&&r.ammunition===ammunition);summary.groups.push({reference,ammunition,cases:g.length,achieved:g.filter(r=>r.held>=8).length,meanLoss:g.reduce((n,r)=>n+r.loss,0)/g.length});}
writeFileSync(resolve(output,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));if(rows.some(r=>r.outcome==='undecided'))process.exitCode=1;
