import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(readFileSync(new URL('../docs/FIELD_PNG_REPACK_2026-09-14.json',import.meta.url)));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
// Independent PNG decoder for these native 8-bit RGB/RGBA, noninterlaced sheets.
function decode(bytes){
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 const idat=[],other=[];let header;
 for(let pos=8;pos<bytes.length;){const end=pos+12+bytes.readUInt32BE(pos),kind=bytes.toString('ascii',pos+4,pos+8);assert.ok(end<=bytes.length);
  if(kind==='IHDR')header=bytes.subarray(pos+8,end-4);
  if(kind==='IDAT')idat.push(bytes.subarray(pos+8,end-4));else other.push(bytes.subarray(pos,end));pos=end;
 }
 const width=header.readUInt32BE(0),height=header.readUInt32BE(4);assert.equal(header[8],8);assert.ok([2,6].includes(header[9]));assert.equal(header[10],0);assert.equal(header[11],0);assert.equal(header[12],0);
 const bpp=header[9]===6?4:3,stride=width*bpp,raw=inflateSync(Buffer.concat(idat)),pixels=Buffer.alloc(stride*height);assert.equal(raw.length,(stride+1)*height);
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<height;y++){const filter=raw[y*(stride+1)];assert.ok(filter<=4);for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=bpp?pixels[i-bpp]:0,b=y?pixels[i-stride]:0,c=y&&x>=bpp?pixels[i-stride-bpp]:0;
  const predictor=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c);pixels[i]=(raw[y*(stride+1)+1+x]+predictor)&255;
 }}
 return {pixels,width,height,mode:bpp===4?'RGBA':'RGB',nonIdat:Buffer.concat(other)};
}
for(const row of manifest.files)test(`${row.file}: exact original pixels and PNG metadata survive recompression`,()=>{
 const bytes=readFileSync(new URL('../'+row.file,import.meta.url)),d=decode(bytes);
 assert.equal(hash(bytes),row.afterSha256);assert.equal(bytes.length,row.afterBytes);assert.ok(row.afterBytes<=row.beforeBytes);
 assert.equal(hash(d.pixels),row.pixelSha256);assert.equal(hash(d.nonIdat),row.nonIdatSha256);
 assert.deepEqual([d.width,d.height],row.size);assert.equal(d.mode,row.mode);
});
