import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),records=JSON.parse(readFileSync(new URL('docs/field-art-v2-manifest.json',root)));
for(const asset of records)test(`${asset.id}: reviewed bytes, WebP format, and provenance are preserved`,()=>{
 const bytes=readFileSync(new URL(asset.file,root));assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);assert.equal(bytes.length,asset.bytes);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.match(asset.kind,/AI-generated/);assert.match(asset.scope,/not a surveyed historical map/);if(asset.alpha){assert.equal(bytes.toString('ascii',12,16),'VP8X');assert.ok(bytes[20]&0x10,'foliage needs true alpha, not a baked background');}
});
