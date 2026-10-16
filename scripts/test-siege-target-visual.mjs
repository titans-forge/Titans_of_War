import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { createFreshCampaignState } from '../src/game/campaignStorage.js';
import { sortieTargets } from '../src/battle/siegeCommand.js';
import { SIEGE_TARGET_ASSETS, siegeTargetPlan, siegeTargetAssets, siegeAccessTracks, createSiegeTargetVisual, updateSiegeTargetVisual } from '../src/battle/siegeTargetVisual.js';
const make = (id='petersburg', choice='option_c') => new CivilWarBattleEngine(id, createFreshCampaignState(1861,id),choice);
function scene(missing) {
  const calls=[],sprite={};
  for (const method of ['setDisplaySize','setDepth','setTexture']) sprite[method]=(...args)=>{calls.push({method,args});return sprite;};
  return {calls, textures:{exists:key=>key!==missing},add:{image:(...args)=>{calls.push({method:'image',args});return sprite;}}};
}
test('dedicated yards only replace the two Petersburg sortie targets',()=>{
 const s=make().snapshot(),before=structuredClone(s),plan=siegeTargetPlan(s);
 assert.deepEqual(plan.map(p=>p.id),['union-siege-train-west','union-engineer-depot-east']);assert.deepEqual(s,before);
 assert.equal(siegeTargetAssets(s).length,4);
 for(const c of ['option_a','option_b','option_d'])assert.deepEqual(siegeTargetAssets(make('petersburg',c).snapshot()),[]);
 assert.deepEqual(siegeTargetAssets(make('cold_harbor','option_d').snapshot()),[]);
 assert.deepEqual(siegeTargetAssets({...s,battleRulesVersion:2}),[]);
 assert.deepEqual(siegeTargetPlan({...s,sortieState:undefined}),[]);
});
test('damaged sites and View locations remain at their original anchors after target retreat',()=>{
 const s=make().snapshot(),original=siegeTargetPlan(s);s.sortieTargetsHit=[original[0].id];
 for(const u of s.formations.filter(u=>original.some(p=>p.id===u.id))){u.x=990;u.y=-80;u.active=false;u.withdrawn=true;}
 const plan=siegeTargetPlan(s);assert.deepEqual(plan.map(p=>[p.x,p.y]),original.map(p=>[p.x,p.y]));assert.equal(plan[0].hit,true);assert.equal(plan[1].hit,false);
 assert.deepEqual(sortieTargets(s).map(p=>[p.x,p.y]),original.map(p=>[p.x,p.y]));
});
test('the recorded raid swaps to the aftermath once and never draws or moves a cannon',()=>{
 const site=siegeTargetPlan(make().snapshot())[0],sc=scene(),view=createSiegeTargetVisual(sc,site);
 updateSiegeTargetVisual(view,[]);assert.equal(sc.calls.filter(c=>c.method==='setTexture').length,0);
 updateSiegeTargetVisual(view,[site.id]);updateSiegeTargetVisual(view,[site.id]);assert.equal(view.hit,true);
 assert.deepEqual(sc.calls.filter(c=>c.method==='setTexture'),[{method:'setTexture',args:[site.damagedKey]}]);
 assert.equal(sc.calls.filter(c=>c.method==='image').length,1);
});
test('a restored struck target starts with aftermath artwork',()=>{
 const s=make().snapshot();s.sortieTargetsHit=['union-engineer-depot-east'];const site=siegeTargetPlan(s)[1],sc=scene();createSiegeTargetVisual(sc,site);assert.equal(sc.calls[0].args[2],site.damagedKey);
});
test('missing either half of the asset pair leaves the existing formation renderer available',()=>{
 const site=siegeTargetPlan(make().snapshot())[0];for(const missing of [site.intactKey,site.damagedKey]){const sc=scene(missing);assert.equal(createSiegeTargetVisual(sc,site),null);assert.equal(sc.calls.length,0);}
 assert.equal(createSiegeTargetVisual(scene(),undefined),null);
});
test('work tracks meet the existing central road and stay out of the Crater',()=>{
 const e=make(),s=e.snapshot(),before=structuredClone(s),road=e.config.movement.roadBands.find(r=>r.axis==='x'),crater=e.fieldBattle.zones.find(z=>z.kind==='crater');
 for(const t of siegeAccessTracks(s)){assert.equal(t.points.at(-1).x,road.value);assert.ok(t.points.every(p=>p.y<crater.top&&p.x>0&&p.x<e.world.width));assert.ok(t.width<road.width);}
 assert.deepEqual(e.snapshot(),before);
});
test('all four native PNGs have an RGBA channel and consistent display aspect ratio',()=>{
 for(const asset of SIEGE_TARGET_ASSETS){const b=readFileSync(new URL(`../public/${asset.src}`,import.meta.url));assert.equal(b.subarray(1,4).toString(),'PNG');assert.equal(b[25],6);assert.equal(b.readUInt32BE(16),1536);assert.equal(b.readUInt32BE(20),1024);}
});
