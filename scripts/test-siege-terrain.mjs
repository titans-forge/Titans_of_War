import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { drawNaturalRoad } from '../src/battle/realisticScenery.js';
import { siegeTerrainPlan, clipDestroyedRoads, drawSiegeTerrain, siegeTerrainGuide, siegeTerrainAssets, SIEGE_TERRAIN_ASSETS } from '../src/battle/siegeTerrainVisual.js';

function context() {
 const calls=[],ctx={calls};
 for(const name of ['save','restore','beginPath','rect','clip','translate','rotate','scale','fillRect','drawImage','moveTo','lineTo','closePath','fill','stroke'])ctx[name]=(...args)=>calls.push({name,args});
 ctx.createRadialGradient=()=>({addColorStop(){}});return ctx;
}
for(const id of ['cold_harbor','petersburg'])test(`${id}: drawing remains confined to existing terrain without changing any opening`,()=>{
 for(const rules of [7,10,11,12])for(const choice of ['option_a','option_b','option_c','option_d']){
  const e=new CivilWarBattleEngine(id,{rulesVersion:2,battleRulesVersion:rules},choice),before=structuredClone(e.snapshot()),ctx=context(),scene={engine:e,textures:{get:key=>({getSourceImage:()=>({key})})}};
  const plan=siegeTerrainPlan(id,e.fieldBattle.zones);
  assert.ok(plan.length>=2);assert.ok(plan.flatMap(p=>p.sprites).length<65);
  for(const {zone,sprites} of plan){assert.ok(e.fieldBattle.zones.some(z=>JSON.stringify(z)===JSON.stringify(zone)));for(const s of sprites){assert.ok(s.x>=zone.left&&s.x<=zone.right&&s.y>=zone.top&&s.y<=zone.bottom);assert.ok(s.width>0&&s.height>0&&Number.isFinite(s.angle));}}
  drawSiegeTerrain(scene,ctx);assert.deepEqual(e.snapshot(),before);
  const clips=ctx.calls.filter(c=>c.name==='rect').map(c=>c.args);
  for(const {zone} of plan)assert.ok(clips.some(r=>r[0]===zone.left&&r[1]===zone.top&&r[2]===zone.right-zone.left&&r[3]===zone.bottom-zone.top));
  assert.equal(ctx.calls.filter(c=>c.name==='drawImage').length,plan.flatMap(p=>p.sprites).length);
  assert.equal(ctx.calls.filter(c=>c.name==='save').length,ctx.calls.filter(c=>c.name==='restore').length);
 }
});
test('other battlefields retain their terrain; generated plans are stable and do not share mutable zones',()=>{
 const e=new CivilWarBattleEngine('petersburg',{battleRulesVersion:11},'option_b'),a=siegeTerrainPlan(e.scenarioId,e.fieldBattle.zones),b=siegeTerrainPlan(e.scenarioId,e.fieldBattle.zones);
 assert.deepEqual(a,b);a[0].zone.left=0;assert.notEqual(e.fieldBattle.zones[0].left,0);assert.notEqual(b[0].zone.left,0);
 for(const id of ['first_manassas','shiloh','wilderness','cedar_creek','gettysburg','gettysburg_jackson','chickamauga','third_winchester','chancellorsville']){assert.deepEqual(siegeTerrainPlan(id,e.fieldBattle.zones),[]);assert.equal(siegeTerrainGuide(id),null);}
});
for(const [name,a,b] of [
 ['Tapp farm lane',{x:295,y:540},{x:320,y:625}],['reverse diagonal',{x:100,y:90},{x:20,y:30}],['vertical south',{x:20,y:5},{x:20,y:100}],['vertical north',{x:20,y:100},{x:20,y:5}],['horizontal west',{x:100,y:5},{x:20,y:5}],
])test(`${name}: the painted road reaches its endpoint within its clipped width`,()=>{
 const ctx=context();drawNaturalRoad(ctx,a,b,5,71);
 const angle=ctx.calls.find(c=>c.name==='rotate').args[0],origin=ctx.calls.find(c=>c.name==='translate').args,clip=ctx.calls.find(c=>c.name==='rect').args;
 assert.ok(Math.abs(origin[0]+Math.cos(angle)*clip[2]-b.x)<1e-8);assert.ok(Math.abs(origin[1]+Math.sin(angle)*clip[2]-b.y)<1e-8);
 assert.deepEqual([clip[0],clip[1],clip[3]],[0,-2.5,5]);assert.ok(ctx.calls.findIndex(c=>c.name==='clip')<ctx.calls.findIndex(c=>c.name==='fill'));
});
test('empty and invalid road segments do not send nonfinite coordinates to canvas',()=>{
 for(const [a,b,w]of [[{x:1,y:1},{x:1,y:1},5],[{x:0,y:0},{x:NaN,y:5},5],[{x:0,y:0},{x:5,y:5},0]]){const ctx=context();drawNaturalRoad(ctx,a,b,w);assert.equal(ctx.calls.length,0);}
});
test('three original native PNG assets and primary historical references are available',()=>{
 assert.deepEqual(siegeTerrainAssets('cold_harbor').map(a=>a.id),['ravine','earthwork']);assert.deepEqual(siegeTerrainAssets('petersburg').map(a=>a.id),['earthwork','crater']);assert.deepEqual(siegeTerrainAssets('wilderness'),[]);
 for(const a of SIEGE_TERRAIN_ASSETS){const png=readFileSync(new URL(`../public/${a.src}`,import.meta.url));assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png[25],6);assert.ok(png.readUInt32BE(16)>=1024);assert.ok(png.readUInt32BE(20)>=600);}
 for(const id of ['cold_harbor','petersburg'])assert.equal(new URL(siegeTerrainGuide(id).source).hostname,'www.nps.gov');
});

test('rules 12 make the whole Crater slow while preserving road speeds outside the basin and rules 11',()=>{
 const a=new CivilWarBattleEngine('petersburg',{battleRulesVersion:12},'option_b'),b=new CivilWarBattleEngine('petersburg',{battleRulesVersion:11},'option_b');
 for(const x of [595,800,862,930,998,1100])for(const y of [380,500,590]){assert.equal(a.fieldTerrain({x,y}).movement,.72);assert.equal(a.fieldTerrain({x,y}).defense,.82);}
 assert.equal(b.fieldTerrain({x:930,y:500}).movement,1.16);
 for(const point of [{x:930,y:350},{x:930,y:620},{x:1200,y:735}])assert.deepEqual(a.fieldTerrain(point),b.fieldTerrain(point));
 const ctx=context();clipDestroyedRoads(ctx,a);assert.ok(ctx.calls.some(c=>c.name==='clip'&&c.args[0]==='evenodd'));
 const old=context();clipDestroyedRoads(old,b);assert.equal(old.calls.length,0);
});
test('new campaigns round-trip rules 12; envelope 15 keeps earlier movement behavior',async()=>{
 const {createCampaignSnapshot,createFreshCampaignState,restoreCampaignFromSnapshot,getCampaignSnapshotCompatibility}=await import('../src/game/campaignStorage.js');
 const scene={id:'first',title:'First',turn:1,choices:[{id:'a',text:'A'}]};const save=createCampaignSnapshot(createFreshCampaignState(1,scene.id,{battleRulesVersion:12}),scene);
 assert.equal(save.version,22);assert.equal(restoreCampaignFromSnapshot(save,[scene]).state.battleRulesVersion,12);
 save.version=15;assert.equal(getCampaignSnapshotCompatibility(save).ok,false);save.state.battleRulesVersion=11;assert.equal(restoreCampaignFromSnapshot(save,[scene]).state.battleRulesVersion,11);
});
