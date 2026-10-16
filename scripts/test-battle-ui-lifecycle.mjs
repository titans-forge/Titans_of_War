import { FieldPresentationCache } from '../src/battle/fieldPresentationCache.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { boundedZoom, overviewZoom } from '../src/battle/battleUsability.js';
import { landmarkField, landmarkDestinationError } from '../src/battle/historicalLandmarks.js';

// Exercise the production scene's actual frame methods without a GPU/DOM renderer.
const source = fs.readFileSync(new URL('../src/battle/CivilWarBattlefield.jsx', import.meta.url), 'utf8');
const update = source.slice(source.indexOf('  update(_time, delta) {'), source.indexOf('  createFormation(formation) {'));
const emit = source.slice(source.indexOf('  emitSnapshot('), source.lastIndexOf('\n}'));
const setSpeedBlock = source.slice(source.indexOf('  setSpeed(speed) {'), source.indexOf('  setSelected(id)'));
test('opening or closing the field desk preserves a manually chosen close-up', () => {
  const block = source.slice(source.indexOf('  resizeCamera() {'), source.indexOf('  fitCamera() {'));
  const Scene = vm.runInNewContext(`(class {${block}})`, { boundedZoom, overviewZoom });
  const scene = new Scene();
  let fitted = 0, centered;
  Object.assign(scene, { cameraMode: 'manual', scale: { width: 1200, height: 500 }, world: { width: 1700, height: 900 },
    cameras: { main: { zoom: 1.4, midPoint: { x: 720, y: 600 }, setZoom(z) { this.zoom = z; }, centerOn(x, y) { centered = [x, y]; } } },
    updateCameraBounds() {}, fitCamera() { fitted++; }, onZoom() {} });
  scene.resizeCamera(); assert.equal(scene.cameras.main.zoom, 1.4); assert.deepEqual(centered, [720, 600]); assert.equal(fitted, 0);
  scene.cameraMode = 'overview'; scene.resizeCamera(); assert.equal(fitted, 1);
});
function scene({ outcome = 'undecided', pending = false, speed = 0, hidden = false } = {}) {
  const document = { hidden };
  const methods = vm.runInNewContext(`({${update},\n${emit}})`, { document, recordFieldProfile() {} });
  let ticks = 0, callbacks = 0;
  const snapshot = { outcome, time: 0, formations: [] };
  const context = {
    ...methods, speed, snapshotClock: 0, presentationCache: new FieldPresentationCache(), views: new Map(), cameras: {main:{zoom:1}},
    engine: { pendingOutcome: pending, tick() { ticks++; }, snapshot: () => snapshot },
    shadows: { clear() {} }, dust: { clear() {} }, smoke: { clear() {} }, drawSelection() {},
    onBattleSnapshot() { callbacks++; },
  };
  return { context, document, snapshot, stats: () => ({ ticks, callbacks }) };
}

test('completed field emits its result once while the renderer continues', () => {
  const s = scene({ outcome: 'withdrawal' });
  for (let i = 0; i < 600; i++) s.context.update(i * 16, 16);
  assert.deepEqual(s.stats(), { ticks: 0, callbacks: 1 });
});
test('result transition is delivered immediately after a throttled live snapshot', () => {
  const s = scene({ speed: 1 });
  s.context.update(140, 140);
  assert.equal(s.stats().callbacks, 1);
  s.snapshot.outcome = 'decisive-win';
  s.context.update(156, 16);
  assert.equal(s.stats().callbacks, 2);
  assert.equal(s.context.speed, 0);
  for (let i = 0; i < 120; i++) s.context.update(i * 16, 16);
  assert.equal(s.stats().callbacks, 2);
});
test('hidden tab freezes both live combat and the final routing animation', () => {
  for (const pending of [false, true]) {
    const s = scene({ speed: 4, pending, hidden: true });
    for (let i = 0; i < 600; i++) s.context.update(i * 16, 16);
    assert.deepEqual(s.stats(), { ticks: 0, callbacks: 0 });
    s.document.hidden = false;
    s.context.update(10000, 16);
    assert.ok(s.stats().ticks > 0);
  }
});

test('map placement arms and cancels without moving units; field clicks preview before confirmation',()=>{
 const orderCalls=[];const seen=[];const published=[];
 const block=source.slice(source.indexOf('  clearDestination() {'),source.indexOf('  setInputMode(mode)'));
 const methods=vm.runInNewContext(`({${setSpeedBlock},\n${emit},\n${block.replaceAll(' }\n  ', ' },\n  ')}})`,{structuredClone,previewGroupOrder:(_s,r)=>({request:r,points:[r.point]}),confirmGroupOrder:()=>({accepted:2})});
 const context={...methods,speed:4,snapshotClock:90,presentationCache:new FieldPresentationCache(),engine:{snapshot:()=>({}),move:(...args)=>orderCalls.push(args)},onGroupPreview:p=>seen.push(p),onBattleSnapshot:p=>published.push(p),world:{width:1700,height:900}};
 const request={ids:['a','b'],order:'move',layout:'line'};
 context.placeGroup(request);assert.equal(context.speed,0);assert.equal(context.pendingGroup.placing,true);assert.equal(orderCalls.length,0);
 assert.equal(published.length,1);assert.equal(context.snapshotClock,0);assert.equal(context.presentationCache.current,published[0]);
 request.ids.push('c');assert.equal(context.pendingGroup.request.ids.length,2);
 const body=source.slice(source.indexOf('  endFieldGesture(pointer) {'),source.indexOf('  resizeCamera() {'));
 const Scene=vm.runInNewContext(`(class {${body}})`,{isPanGesture:()=>false});
 const pointerup=Scene.prototype.endFieldGesture;
 context.activePointers=new Set();
 context.cameras={main:{}};context.gesture={id:1,dragged:true};pointerup.call(context,{id:1});assert.equal(context.pendingGroup.placing,true);
 context.gesture={id:1,dragged:false,unitId:'a'};pointerup.call(context,{id:1,positionToCamera:()=>({x:700,y:500})});
 assert.equal(context.pendingGroup.points[0].x,700);assert.equal(context.pendingGroup.placing,undefined);assert.equal(orderCalls.length,0);
 context.clearGroup();assert.equal(context.pendingGroup,null);assert.equal(seen.at(-1),null);
});

test('pending individual or group previews block simulation resume until cleared',()=>{
 const Scene=vm.runInNewContext(`(class {${setSpeedBlock}\n${emit}})`);const scene=new Scene();const published=[];
 Object.assign(scene,{snapshotClock:90,presentationCache:new FieldPresentationCache(),engine:{snapshot:()=>({})},onBattleSnapshot:p=>published.push(p)});
 for(const field of ['pendingDestination','pendingGroup']){scene[field]={};scene.setSpeed(4);assert.equal(scene.speed,0);scene.setSpeed(0);assert.equal(scene.speed,0);scene[field]=null;scene.setSpeed(2);assert.equal(scene.speed,2);}
 assert.equal(published.length,1,'only the running-to-blocked transition publishes');
});
test('an individual destination replaces a group preview rather than leaving two confirmations',()=>{
 const block=source.slice(source.indexOf('  previewDestination(point) {'),source.indexOf('  confirmMove()'));
 const Scene=vm.runInNewContext(`(class {${setSpeedBlock}\n${emit}\n${block}})`,{landmarkField,landmarkDestinationError,canCommand:()=>true,Phaser:{Math:{Clamp:(n,min,max)=>Math.max(min,Math.min(max,n))}}});const scene=new Scene();const published=[];
 Object.assign(scene,{selectedId:'a',speed:4,snapshotClock:90,presentationCache:new FieldPresentationCache(),engine:{state:[{id:'a'}],outcome:'undecided',snapshot:()=>({})},onBattleSnapshot:p=>published.push(p),world:{width:1700,height:900},pendingGroup:{request:{}},clearGroup(){this.pendingGroup=null;},onDestination(p){this.observed=p;}});
 scene.previewDestination({x:500,y:600});assert.equal(scene.pendingGroup,null);assert.equal(scene.observed.x,500);assert.equal(scene.speed,0);
 assert.equal(published.length,1);assert.equal(scene.presentationCache.current,published[0]);
});
