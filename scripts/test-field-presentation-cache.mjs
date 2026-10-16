import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {CivilWarBattleEngine} from '../src/battle/civilWarEngine.js';
import {createFreshCampaignState} from '../src/game/campaignStorage.js';
import {BATTLE_SCENARIOS} from '../src/game/battles.js';
import {FieldPresentationCache} from '../src/battle/fieldPresentationCache.js';
import {percentile} from '../src/battle/fieldPerformance.js';
const source=fs.readFileSync(new URL('../src/battle/CivilWarBattlefield.jsx',import.meta.url),'utf8');
const Scene=vm.runInNewContext(source.slice(source.indexOf('class CivilWarBattleScene'))+'; CivilWarBattleScene',{Phaser:{Scene:class{}},document:{hidden:false},recordFieldProfile(){}});
function fixture(engine){
 const scene=Object.create(Scene.prototype);let passes=0,snapshots=0;const snapshot=engine.snapshot.bind(engine);engine.snapshot=(...args)=>{snapshots++;return snapshot(...args);};
 Object.assign(scene,{engine,presentationCache:new FieldPresentationCache(),speed:0,snapshotClock:0,views:new Map(),cameras:{main:{zoom:.4}},shadows:{clear(){}},dust:{clear(){}},smoke:{clear(){}},syncFormation(){passes++;},drawSelection(){},onBattleSnapshot(){},clearDestination(){},selectedId:engine.state.find(u=>u.side==='confederate').id});
 return {scene,counts:()=>({passes,snapshots})};
}
for(const battle of Object.values(BATTLE_SCENARIOS))test(`${battle.id}: repeated paused frames preserve tactical state and reuse presentation`,()=>{
 const engine=new CivilWarBattleEngine(battle.id,createFreshCampaignState(1861),'option_b');const {scene,counts}=fixture(engine),before=engine.checkpoint();
 scene.update(0,16);const first=counts();for(let i=0;i<120;i++)scene.update(i*16,16);
 assert.deepEqual(counts(),first);assert.deepEqual(engine.checkpoint(),before);
 scene.cameras.main.zoom=.8;scene.update(0,16);assert.equal(counts().snapshots,first.snapshots);assert.equal(counts().passes,first.passes*2);
});
test('paused commands refresh cached state, and resumed simulation matches an uncached engine',()=>{
 const state=createFreshCampaignState(1861),a=new CivilWarBattleEngine('shiloh',state,'option_a'),b=new CivilWarBattleEngine('shiloh',state,'option_a');const {scene,counts}=fixture(a);
 scene.update(0,16);const before=counts();scene.issueOrder('assault',{sectorId:'right'});b.order(scene.selectedId,'assault',{sectorId:'right'});
 scene.update(0,16);assert.ok(counts().snapshots>before.snapshots);assert.equal(scene.presentationCache.current.formations.find(u=>u.id===scene.selectedId).pendingCommand.order,'assault');
 scene.speed=1;for(let i=0;i<120;i++){scene.update(i*16,16);b.tick(.016);}assert.deepEqual(a.checkpoint(),b.checkpoint());
 scene.speed=0;scene.update(0,16);const stopped=counts();scene.update(0,16);assert.deepEqual(counts(),stopped);
});
test('hover and touch inspection refresh sprites without rebuilding a paused snapshot',()=>{
 const {scene,counts}=fixture(new CivilWarBattleEngine('shiloh',createFreshCampaignState(1861),'option_a'));
 scene.views.set('hardee-corps',{hovered:false});scene.update(0,16);const first=counts();
 scene.views.get('hardee-corps').hovered=true;scene.update(0,16);assert.equal(counts().passes,first.passes*2);
 scene.touchInspectId='bragg-corps';scene.update(0,16);assert.equal(counts().passes,first.passes*3);assert.equal(counts().snapshots,first.snapshots);
});
test('diagnostic percentile is nonmutating and handles an empty sample',()=>{const a=[4,1,3,2];assert.equal(percentile(a,.95),4);assert.deepEqual(a,[4,1,3,2]);assert.equal(percentile([], .95),0);});
