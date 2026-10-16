import test from 'node:test';
import assert from 'node:assert/strict';
import {CivilWarBattleEngine} from '../src/battle/civilWarEngine.js';
import {landmarkSurroundings,drawLandmarkSurroundings} from '../src/battle/landmarkSurroundings.js';
for(const id of ['shiloh','wilderness','cold_harbor'])test(`${id}: connected ground stays within map and rendering never changes tactical state`,()=>{
 const e=new CivilWarBattleEngine(id,{rulesVersion:2,battleRulesVersion:17},'option_b'),site=e.fieldBattle.landmarks[0],layout=landmarkSurroundings({...site,mapRules:17});assert.ok(layout);assert.equal(landmarkSurroundings({...site,mapRules:16}),null);
 const points=layout.lanes.flat();for(const p of points)assert.ok(p.x>=0&&p.y>=0&&p.x<=e.world.width&&p.y<=e.world.height);
 const plot=layout.plot;assert.ok(plot.x>=0&&plot.y>=0&&plot.x+plot.width<=e.world.width&&plot.y+plot.height<=e.world.height);
 // The farm lanes at these two sites reach an existing fast road; Shiloh has no road-speed zone.
 const end=points.at(-1);if(id!=='shiloh')assert.ok(e.config.movement.roadBands.some(r=>Math.abs(end[r.axis]-r.value)<=r.width));
 if(id==='wilderness') {const clearing=e.fieldBattle.zones.find(z=>z.name==='Tapp farm clearing');assert.ok(plot.x>=clearing.left&&plot.y>=clearing.top&&plot.x+plot.width<=clearing.right&&plot.y+plot.height<=clearing.bottom);}
 if(id==='shiloh')assert.equal(layout.kind,'meeting-ground');
 const before=e.snapshot(),terrain=points.map(p=>e.fieldTerrain(p)),calls=[];const ctx={};for(const name of ['save','restore','beginPath','moveTo','lineTo','closePath','fill','clip','stroke','fillRect','translate','rotate','rect','ellipse'])ctx[name]=(...args)=>calls.push({name,args});
 assert.equal(drawLandmarkSurroundings(ctx,{...site,mapRules:17},123),true);assert.equal(calls.filter(c=>c.name==='save').length,calls.filter(c=>c.name==='restore').length);assert.deepEqual(e.snapshot(),before);assert.deepEqual(points.map(p=>e.fieldTerrain(p)),terrain);
 const first=structuredClone(calls);calls.length=0;drawLandmarkSurroundings(ctx,{...site,mapRules:17},123);assert.deepEqual(calls,first,'static canvas art remains deterministic');
});
