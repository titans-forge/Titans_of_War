import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { formationFocusZoom, overviewZoom, boundedZoom, nearestHit, isPanGesture } from '../src/battle/battleUsability.js';
import { BATTLE_ENGINE_CONFIGS } from '../src/battle/battleDefinitions.js';
const source = fs.readFileSync(new URL('../src/battle/CivilWarBattlefield.jsx', import.meta.url), 'utf8');
const gestures = source.slice(source.indexOf('  beginFieldGesture('), source.indexOf('  resizeCamera() {'));
const focus = source.slice(source.indexOf('  focusSelected() {'), source.indexOf('  emitSnapshot('));
const Scene = vm.runInNewContext(`(class {${gestures}\n${focus}})`, { nearestHit, isPanGesture, formationFocusZoom, overviewZoom, landmarkField:e=>e.fieldBattle });
const units = [{id:'a',x:100,y:100,active:true,frontage:115},{id:'b',x:150,y:100,active:true},{id:'reserve',x:200,y:200,active:false}];
const hit = id => ({x:0,y:0,getData:key=>key==='formationId'||key==='inspectId'?id:null});
function fixture() {
  const scene = new Scene(); const selected=[],destinations=[],groups=[];
  const camera = {zoom:.4,scrollX:10,scrollY:20,setZoom(z){this.zoom=z;},centerOn(x,y){this.center=[x,y];},setScroll(x,y){this.scrollX=x;this.scrollY=y;}};
  Object.assign(scene,{activePointers:new Set(),cameras:{main:camera},scale:{width:390,height:320},world:{width:1700,height:900},selectedId:'a',engine:{snapshot:()=>({formations:units})},inputMode:'move',onSelectFormation:id=>selected.push(id),previewDestination:p=>destinations.push(p),previewGroup:p=>groups.push(p),updateCameraBounds(){},onZoom(){}});
  const pointer=(id=1,x=101,y=100)=>({id,x,y,isDown:true,wasTouch:true,positionToCamera:()=>({x,y})});
  return {scene,camera,selected,destinations,groups,pointer};
}
test('phone focus gives 90 field pixels of frontage across all worlds and preserves closer zoom',()=>{
  for(const {world} of Object.values(BATTLE_ENGINE_CONFIGS)) for(const width of [320,390,700]) {
    const viewport={width,height:296},minimum=overviewZoom(viewport,world),zoom=formationFocusZoom(minimum,viewport,world,115);
    assert.ok(zoom*115>=90-1e-8);assert.ok(formationFocusZoom(minimum,viewport,world,400)>=.8);assert.ok(zoom>=minimum);assert.equal(formationFocusZoom(1.6,viewport,world,115),1.6);
  }
});
test('desktop focus keeps the existing context and all zoom values remain bounded',()=>{
  const viewport={width:1200,height:600},world={width:1700,height:900};
  assert.equal(formationFocusZoom(.8,viewport,world),1.2);
  assert.equal(formationFocusZoom(5,viewport,world),boundedZoom(5,0,overviewZoom(viewport,world)));
});
test('overlapping polygon hits use actual formation centers and exclude inactive units',()=>{
  assert.equal(nearestHit([hit('b'),hit('reserve'),hit('a')],{x:102,y:100},'formationId',units).getData('formationId'),'a');
  assert.equal(nearestHit([hit('reserve')],{x:200,y:200},'formationId',units),undefined);
});
test('a tap selects the nearest friendly without placing a move',()=>{
  const f=fixture(),p=f.pointer(); f.scene.beginFieldGesture(p,[hit('b'),hit('a')]); f.scene.endFieldGesture(p);
  assert.deepEqual(f.selected,['a']);assert.equal(f.destinations.length,0);
});
test('a drag that starts on a unit pans without selecting or placing orders',()=>{
  const f=fixture();f.scene.beginFieldGesture(f.pointer(),[hit('a')]);const p=f.pointer(1,141,120);f.scene.moveFieldGesture(p);f.scene.endFieldGesture(p);
  assert.equal(f.camera.scrollX,-90);assert.equal(f.camera.scrollY,-30);assert.equal(f.scene.cameraMode,'manual');assert.equal(f.selected.length+f.destinations.length,0);
});
test('a second touch cancels the entire gesture in either release order and a fresh tap recovers',()=>{
  for(const order of [[1,2],[2,1]]) {const f=fixture();f.scene.beginFieldGesture(f.pointer(1),[]);f.scene.beginFieldGesture(f.pointer(2),[]);
    for(const id of order)f.scene.endFieldGesture(f.pointer(id));assert.equal(f.destinations.length,0);
    f.scene.beginFieldGesture(f.pointer(),[]);f.scene.endFieldGesture(f.pointer());assert.equal(f.destinations.length,1);
  }
});
test('pan mode never previews an order on empty ground',()=>{
  const f=fixture();f.scene.inputMode='pan';f.scene.beginFieldGesture(f.pointer(),[]);f.scene.endFieldGesture(f.pointer());assert.equal(f.destinations.length,0);
});
test('touching an enemy inspects it without sending a friendly unit to that location',()=>{
  const f=fixture();const enemy={getData:key=>key==='inspectId'?'a':null};f.scene.beginFieldGesture(f.pointer(),[enemy]);f.scene.endFieldGesture(f.pointer());
  assert.equal(f.scene.touchInspectId,'a');assert.equal(f.destinations.length+f.selected.length,0);
});
test('group placement still previews on a formation tap before committing any order',()=>{
  const f=fixture();f.scene.pendingGroup={placing:true,request:{ids:['a','b']}};f.scene.beginFieldGesture(f.pointer(),[hit('a')]);f.scene.endFieldGesture(f.pointer());
  assert.equal(f.groups.length,1);assert.equal(f.selected.length+f.destinations.length,0);
});
test('focusing a reserve leaves the camera alone; focusing an active unit centers on it',()=>{
  const f=fixture();f.scene.selectedId='reserve';f.scene.focusSelected();assert.equal(f.camera.zoom,.4);assert.equal(f.camera.center,undefined);
  f.scene.selectedId='b';f.scene.focusSelected();assert.deepEqual(f.camera.center,[150,100]);assert.equal(f.scene.cameraMode,'focus');
});

test('an explicit flag hit takes precedence over a nearer overlapping rank',()=>{
  const standard={getData:key=>key==='selectionAnchor'?true:key==='formationId'||key==='inspectId'?'b':null};
  assert.equal(nearestHit([hit('a'),standard],{x:100,y:100},'formationId',units),standard);
});

test('landmark focus centers the site without changing unit selection or orders',()=>{
 const f=fixture();f.scene.engine.fieldBattle={landmarks:[{id:'house',x:600,y:300}]};
 assert.equal(f.scene.focusLandmark('missing'),false);assert.equal(f.camera.center,undefined);
 assert.equal(f.scene.focusLandmark('house'),true);assert.deepEqual(f.camera.center,[600,300]);assert.equal(f.scene.cameraMode,'landmark');assert.equal(f.scene.selectedId,'a');assert.equal(f.selected.length+f.destinations.length,0);
});
