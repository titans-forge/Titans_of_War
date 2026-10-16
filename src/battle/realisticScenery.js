import { createTransparentCanvasTexture } from './transparentCanvasTexture.js';

// Native generated imagery is keyed once at load; the original files stay intact.
export function compositeSceneryChroma(pixels) {
  for(let i=0;i<pixels.length;i+=4){
    const r=pixels[i],g=pixels[i+1],b=pixels[i+2],excess=Math.min(r,b)-g;
    if(excess<=15)continue;
    const t=Math.min(1,(excess-15)/105),alpha=1-t*t*(3-2*t);
    pixels[i+3]=Math.round(pixels[i+3]*alpha);
    // Magenta spill affects both red and blue, preserving natural brown/green.
    const spill=Math.max(0,excess-12);pixels[i]=Math.max(0,r-spill);pixels[i+2]=Math.max(0,b-spill);
  }
  return pixels;
}
export function createSceneryTextures(scene) {
  for(const kind of ['foliage','earthworks']){
    const key=`${kind}-photo`;if(scene.textures.exists(key)||!scene.textures.exists(`${key}-source`))continue;
    const source=scene.textures.get(`${key}-source`).getSourceImage();
    const texture=createTransparentCanvasTexture(scene,key,source.width,source.height),ctx=texture.context;
    ctx.drawImage(source,0,0);const data=ctx.getImageData(0,0,source.width,source.height);compositeSceneryChroma(data.data);ctx.putImageData(data,0,0);
    const frames=scene.cache.json.get(`${key}-frames`);for(const [name,f] of Object.entries(frames))texture.add(name,0,f.x,f.y,f.w,f.h);
    texture.refresh();scene.textures.remove(`${key}-source`);
  }
}
export function stampScenery(scene,ctx,kind,name,x,y,w,h,flip=false,centerOnly=false) {
  const f=scene.cache.json.get(`${kind}-photo-frames`)[name],image=scene.textures.get(`${kind}-photo`).getSourceImage();
  ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);ctx.drawImage(image,f.x+(centerOnly?f.w*.15:0),f.y,f.w*(centerOnly?.7:1),f.h,flip?-w:0,0,w,h);ctx.restore();
}
export const sceneryNoise=(seed,i)=>{const x=Math.sin(seed*37.719+i*78.233)*43758.5453;return x-Math.floor(x);};
export function roadProfile(width){return {width:Math.min(42,width),rut:Math.min(5,width*.2)};}
export function drawNaturalRoad(ctx,a,b,width,seed=1) {
  const length=Math.hypot(b.x-a.x,b.y-a.y),angle=Math.atan2(b.y-a.y,b.x-a.x),{width:w,rut}=roadProfile(width);
  if (!Number.isFinite(length) || length<.001 || !Number.isFinite(width) || width<=0) return;
  ctx.save();ctx.translate(a.x,a.y);ctx.rotate(angle);
  // Clip all layers and ruts to the actual endpoints and declared road width.
  ctx.beginPath();ctx.rect(0,-w/2,length,w);ctx.clip();
  // Soft ragged shoulders, always inside the existing road band.
  for(let layer=0;layer<7;layer++){
    const half=w/2-layer*.85;ctx.beginPath();
    for(let x=0,i=0;x<=length+8;x+=8,i++){const y=-half+(sceneryNoise(seed,i)-.5)*2.2;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
    for(let x=length,i=0;x>=-8;x-=8,i++)ctx.lineTo(x,half+(sceneryNoise(seed+2,i)-.5)*2.2);
    ctx.closePath();ctx.fillStyle=layer<2?'rgba(95,76,49,.055)':'rgba(164,143,103,.11)';ctx.fill();
  }
  for(let i=0;i<length*2;i++){
    const x=sceneryNoise(seed+4,i)*length,y=(sceneryNoise(seed+7,i)-.5)*(w-3);
    ctx.fillStyle=i%3?'rgba(75,61,44,.1)':'rgba(205,189,151,.17)';ctx.fillRect(x,y,.4+sceneryNoise(seed+5,i)*1.8,.6);
  }
  for(const offset of [-rut,rut])for(let x=0,i=0;x<length;x+=8,i++){
    ctx.strokeStyle=`rgba(69,56,42,${.06+sceneryNoise(seed+12,i)*.13})`;ctx.lineWidth=.7+sceneryNoise(seed+9,i)*.8;ctx.beginPath();ctx.moveTo(x,offset+Math.sin(x*.03)*.6);ctx.lineTo(x+6,offset+Math.sin((x+6)*.03)*.6);ctx.stroke();
  }ctx.restore();
}
export function drawNaturalCreek(ctx,z,seed=1){
  const width=z.right-z.left,mid=(z.top+z.bottom)/2;
  const path=()=>{ctx.beginPath();for(let i=0;i<=100;i++){const x=z.left+width*i/100,y=mid+Math.sin(i*.24)*7;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}};
  for(const [w,c] of [[26,'rgba(71,67,42,.13)'],[22,'rgba(111,101,66,.23)'],[17,'rgba(84,89,65,.5)'],[12,'rgba(68,89,82,.64)'],[7,'rgba(84,106,95,.32)']]){path();ctx.lineWidth=w;ctx.strokeStyle=c;ctx.stroke();}
  for(let i=0;i<width;i++){
    const x=z.left+i,y=mid+Math.sin(i/width*24)*7;
    ctx.fillStyle=i%3?'rgba(205,207,171,.16)':'rgba(34,50,37,.2)';ctx.fillRect(x,y+(sceneryNoise(seed,i)-.5)*16,1.5,.6);
  }
}
