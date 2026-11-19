import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { battleLocations } from '../src/battle/battleLocations.js';
import { createPracticeState } from '../src/game/practiceConditions.js';
const cacheDir=mkdtempSync(join(tmpdir(),'civil-readiness-'));
const vite=await createServer({configLoader:'native',cacheDir,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,watch:null},appType:'custom',logLevel:'silent'});
try {
 const {FormationReadinessCard,FormationWithdrawalReadout}=await vite.ssrLoadModule('/src/components/FormationReadinessCard.jsx');
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

 function withdrawing(id, turn, choice, formationId) {
   const state = createPracticeState({ id, turn }, 'reserve', 'full');
   const engine = new CivilWarBattleEngine(id, state, choice);
   assert.equal(engine.order(formationId, 'withdraw'), true);
   for (let step = 0; step < 40; step++) engine.tick(.05);
   const snapshot = engine.snapshot();
   const selected = snapshot.formations.find(unit => unit.id === formationId);
   assert.equal(selected.order, 'withdraw');
   return { selected, fieldBattle: snapshot.fieldBattle, locations: battleLocations(snapshot) };
 }
 const renderWithdraw = props => renderToStaticMarkup(createElement(FormationWithdrawalReadout, props));
 for (const [id, turn, formationId, marker] of [
   ['kennesaw_mountain', 16, 'kennesaw-reserve', { x: 1090, y: 882, name: 'Confederate rear · left' }],
   ['sailors_creek', 22, 'sailors-escort', { x: 18, y: 722, name: 'Confederate rear · right' }],
 ]) {
   test(`${id} uses the exit selected by the live withdrawal order and the map’s marker name`, () => {
     const props = withdrawing(id, turn, 'option_b', formationId);
     const before = structuredClone(props);
     assert.deepEqual(props.selected.retreatExit, { x: marker.x, y: marker.y });
     const distance = Math.round(Math.hypot(props.selected.x - marker.x, props.selected.y - marker.y));
     const html = renderWithdraw(props);
     assert.ok(html.includes(`Marked exit required · ${marker.name} (${marker.x}, ${marker.y})`));
     assert.ok(html.includes(`About ${distance} field units straight to the marker`));
     assert.match(html, /Keep the exit clear of nearby enemy formations/);
     assert.doesNotMatch(html, /Retreat distance|220|180/);
     assert.deepEqual(props, before);
   });
 }
 test('ordinary withdrawal retains the early disengagement conditions', () => {
   const props = withdrawing('kennesaw_mountain', 16, 'option_a', 'kennesaw-reserve');
   assert.match(renderWithdraw(props), /Retreat distance \d+ \/ 220\. To leave before reaching an exit, move at least 180 field units toward your rear and clear enemy fire and pursuit/);
   assert.doesNotMatch(renderWithdraw(props), /Marked exit required/);
 });
 test('a missing exit target does not invent a distance and a departed formation has no retreat readout', () => {
   const props = withdrawing('kennesaw_mountain', 16, 'option_b', 'kennesaw-reserve');
   const withoutExit = renderWithdraw({ ...props, selected: { ...props.selected, retreatExit: undefined } });
   assert.match(withoutExit, /Marked exit required/);
   assert.doesNotMatch(withoutExit, /field units straight|Retreat distance|NaN/);
   assert.equal(renderWithdraw({ ...props, selected: { ...props.selected, active: false, withdrawn: true } }), '');
 });
} finally {await vite.close();rmSync(cacheDir,{recursive:true,force:true});}
