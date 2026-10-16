import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { battleLocations } from '../src/battle/battleLocations.js';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { BATTLE_SCENARIOS } from '../src/game/battles.js';
import { createFreshCampaignState } from '../src/game/campaignStorage.js';
import { fieldExitTargets } from '../src/battle/fieldBattleProfiles.js';
import { overviewZoom } from '../src/battle/battleUsability.js';
import { FieldPresentationCache } from '../src/battle/fieldPresentationCache.js';
const source = fs.readFileSync(new URL('../src/battle/CivilWarBattlefield.jsx', import.meta.url), 'utf8');
const methods = source.slice(source.indexOf('  clearLocation() {'), source.indexOf('  emitSnapshot('));
const setSpeedBlock = source.slice(source.indexOf('  setSpeed(speed) {'), source.indexOf('  setSelected(id)'));
const emit = source.slice(source.indexOf('  emitSnapshot('), source.lastIndexOf('\n}'));
const Scene = vm.runInNewContext(`(class {${setSpeedBlock}\n${methods}\n${emit}})`, { battleLocations, overviewZoom });
function fixture(engine, width=390) {
 const scene = new Scene(), drawings=[], published=[];
 const graphic = () => {const g={destroy(){g.destroyed=true;}}; for(const k of ['setDepth','lineStyle','strokeRoundedRect','setOrigin','setScale'])g[k]=()=>g;drawings.push(g);return g;};
 const camera={zoom:.4,setZoom(v){this.zoom=v;},centerOn(x,y){this.center=[x,y];}};
 Object.assign(scene,{engine,world:engine.world,scale:{width,height:340},speed:4,snapshotClock:90,presentationCache:new FieldPresentationCache(),onBattleSnapshot:p=>published.push(p),cameras:{main:camera},add:{graphics:graphic,text:graphic},updateCameraBounds(){},onZoom(){},selectedId:'unchanged'});
 return {scene,camera,drawings,published};
}
for (const rules of [1,3,4,9,12,17]) for(const battle of Object.values(BATTLE_SCENARIOS)) {
 test(`${battle.id} rules ${rules}: locate every available place without mutating the battle`,()=>{
  const engine=new CivilWarBattleEngine(battle.id,createFreshCampaignState(1861,null,{battleRulesVersion:rules}),'option_c');
  const before=engine.checkpoint(), locations=battleLocations(engine.snapshot());
  assert.equal(new Set(locations.map(p=>p.id)).size,locations.length);
  for(const width of [390,1280]) {const {scene,camera,published}=fixture(engine,width);
   for(const p of locations) {
    assert.ok(p.x>=0&&p.y>=0&&p.x<=engine.world.width&&p.y<=engine.world.height);
    assert.equal(scene.focusLocation(p.id),true);assert.deepEqual(camera.center,[p.x,p.y]);
    assert.equal(scene.speed,0);assert.equal(scene.selectedId,'unchanged');
    assert.ok(Number.isFinite(camera.zoom)&&camera.zoom>0);
   }
   assert.equal(published.length,locations.length ? 1 : 0,'only the first running-to-paused location visit publishes');
   assert.equal(scene.focusLocation('absent'),false);
   scene.clearLocation();assert.equal(scene.locationOutline,null);
  }
  if(engine.fieldBattle)assert.deepEqual(locations.filter(p=>p.kind==='Exit').map(({x,y})=>({x,y})),fieldExitTargets(engine,{side:'confederate'}));
  else if(engine.gettysburg)assert.deepEqual(locations.filter(p=>p.kind==='Exit').map(p=>p.x),[180,850,1510]);
  else assert.deepEqual(locations,[]);
  assert.deepEqual(engine.checkpoint(),before);
 });
}
test('Petersburg sortie locations exist only for the selected supported sortie mission',()=>{
 for(const choice of ['option_a','option_b','option_c','option_d']) {
  const e=new CivilWarBattleEngine('petersburg',createFreshCampaignState(22),choice);
  const names=battleLocations(e.snapshot()).filter(p=>p.kind==='Objective').map(p=>p.name);
  assert.equal(names.includes('Western Siege Train'),choice==='option_c');
  assert.equal(names.includes('Eastern Engineer Depot'),choice==='option_c');
 }
});
test('location refocus destroys old markers and preserves the target across viewport changes',()=>{
 const e=new CivilWarBattleEngine('third_winchester',createFreshCampaignState(22),'option_c');
 const {scene,drawings,published}=fixture(e);const target=battleLocations(e.snapshot()).find(p=>p.kind==='Exit');
 scene.focusLocation(target.id);scene.scale.width=1280;scene.speed=4;scene.focusLocation(scene.focusedLocationId, false);
 assert.equal(scene.speed,4,'resizing after resume must not silently pause the simulation');
 assert.equal(published.length,1,'refocusing without pause must not publish another snapshot');
 assert.ok(drawings[0].destroyed&&drawings[1].destroyed);assert.equal(scene.cameraMode,'location');
 assert.deepEqual(scene.cameras.main.center,[target.x,target.y]);
});
test('an unloaded battle has no locations',()=>assert.deepEqual(battleLocations(null),[]));
