import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
const cacheDir=mkdtempSync(join(tmpdir(),'civil-readiness-'));
const vite=await createServer({configLoader:'native',cacheDir,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom',logLevel:'silent'});
try {
 const {FormationReadinessCard}=await vite.ssrLoadModule('/src/components/FormationReadinessCard.jsx');
 const base={id:'guns',active:true,strength:400,status:'steady',condition:'steady',pressureReason:'Turning space blocked by a nearby formation',suppression:71,type:'artillery',order:'hold',ammunition:30,readiness:{supported:false,nearestSupportName:'Support brigade',nearestSupportDistance:400,supportRange:340}};
 const render=selected=>renderToStaticMarkup(createElement(FormationReadinessCard,{selected,snapshot:{formations:[]}}));
 test('live pressure, support distance and suppression remain visible',()=>{const html=render(base);assert.match(html,/Turning space blocked/);assert.match(html,/Support brigade: 400/);assert.match(html,/<meter/);assert.match(html,/71%/);});
 for(const [label,patch,expected] of [
  ['organized exit',{active:false,withdrawn:true,withdrawalOrganized:true},'withdrawn in order'],
  ['disordered escape',{active:false,withdrawn:true,withdrawalOrganized:false},'escaped in disorder'],
  ['capture',{active:false,status:'surrendered',strength:0},'captured'],
  ['scheduled reserve',{active:false,arrivalTime:50},'arrives at 50'],
  ['blocked reserve',{active:false,arrivalTime:50,arrivalBlocked:true},'Arrival waiting: clear the deployment area'],
  ['unavailable unit',{active:false},'Not currently on the field'],
 ])test(`${label}: stale battlefield pressure is hidden without mutating the record`,()=>{
  const unit={...structuredClone(base),...patch},before=structuredClone(unit),html=render(unit);assert.ok(html.includes(expected));assert.doesNotMatch(html,/Turning space blocked|Support brigade: 400|No organized formation in support range|<meter/);assert.deepEqual(unit,before);
 });
 test('departed troops retain labeled historical break evidence',()=>{const html=render({...base,active:false,withdrawn:true,routingCause:'Cohesion collapse',incomingFireFrom:'enemy'});assert.match(html,/Last break: Cohesion collapse/);assert.match(html,/Last incoming fire: enemy/);assert.doesNotMatch(html,/<meter/);});
 test('no selection renders without claiming a formation is under pressure',()=>{assert.match(render(null),/Select a formation/);assert.doesNotMatch(render(null),/<meter/);});
} finally {await vite.close();rmSync(cacheDir,{recursive:true,force:true});}
