import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clothColumn,clothFrame,CLOTH_FRAMES } from '../src/battle/realisticStandards.js';
import { compositeSceneryChroma,roadProfile,createSceneryTextures } from '../src/battle/realisticScenery.js';
import { updatePeriodStandard } from '../src/battle/periodStandards.js';

test('cloth stays pinned, never folds its design backward, and stays inside atlas bounds',()=>{
 for(let p=0;p<Math.PI*2;p+=.09){
  assert.equal(clothColumn(0,p).x,0);assert.equal(clothColumn(0,p).y,0);
  let prev=-1;for(let i=0;i<=192;i++){
   const c=clothColumn(i/192,p);assert.ok(c.x>prev);prev=c.x;
   assert.ok(c.y>=-4.4&&c.y<=6.2);assert.ok(c.light>.45&&c.light<=1.02);
   for(const [w,h,top]of [[48,30,-60],[34,34,-62]]){assert.ok(3+c.x*w>=0&&3+c.x*w<60);assert.ok(top+68+c.y>=0&&top+68+c.y+h<48);}
  }
 }
});
test('flag animation loops, phases independently, and reduced motion is stable',()=>{
 for(const t of [-100,0,.1,3,100,1e6])for(const phase of [0,1,3,5]){const f=clothFrame(t,phase);assert.ok(f>=0&&f<CLOTH_FRAMES);assert.equal(clothFrame(t,phase,true),clothFrame(999,1,true));}
 assert.equal(clothFrame(1,1),clothFrame(1+Math.PI*2/1.65,1));
 const calls=[],g={periodUpdate(...a){calls.push(a);return this;}};assert.equal(updatePeriodStandard(g,'union','gettysburg',1,.3,true),g);assert.deepEqual(calls,[[1,.3,true]]);
});
test('scenery compositor removes magenta and preserves stone, brown earth, green foliage and alpha',()=>{
 const source=new Uint8ClampedArray([255,0,255,255,80,92,58,255,122,107,83,255,155,158,147,255,174,80,174,255,40,50,30,128]);
 compositeSceneryChroma(source);assert.equal(source[3],0);assert.deepEqual([...source.slice(4,16)],[80,92,58,255,122,107,83,255,155,158,147,255]);assert.ok(source[19]>0&&source[19]<255);assert.ok(source[16]-source[17]<=12);assert.equal(source[23],128);
});
test('optional scenery that was not loaded does not allocate a canvas or access a missing texture',()=>{
 const scene={textures:{exists(){return false;},get(){assert.fail('must not read an absent source');},createCanvas(){assert.fail('must not allocate unused scenery');}},cache:{json:{get(){assert.fail('must not read absent frame data');}}}};
 assert.doesNotThrow(()=>createSceneryTextures(scene));
});
test('indexed scenery frames stay in native image bounds and road width cannot exceed rule band',()=>{
 for(const kind of ['foliage','earthworks']){const frames=JSON.parse(readFileSync(new URL(`../public/images/battles/realistic-v2/${kind}.json`,import.meta.url)));assert.equal(Object.keys(frames).length,4);for(const f of Object.values(frames)){assert.ok(f.x>=0&&f.y>=0&&f.w>100&&f.h>100&&f.x+f.w<=1536&&f.y+f.h<=1024);}}
 for(const width of [10,16,25,42,60])assert.ok(roadProfile(width).width<=width);
});
