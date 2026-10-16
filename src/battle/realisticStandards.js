import { drawPeriodStandard, periodStandardFor } from './periodStandards.js';
import { createTransparentCanvasTexture } from './transparentCanvasTexture.js';

export const CLOTH_FRAMES = 32;
const SCALE = 4, FRAME_W = 240, FRAME_H = 192, TAU = Math.PI * 2;
export function clothFrame(time, phase, reducedMotion = false) {
  const angle = reducedMotion ? 0.8 : time * 1.65 + phase;
  return Math.floor(((angle % TAU + TAU) % TAU) / TAU * CLOTH_FRAMES) % CLOTH_FRAMES;
}
// Positive derivative along x keeps the design readable without fold inversions.
// A fixed hoist, a sagging fly, and moving light/shadow replace flat icon colors.
export function clothColumn(u, phase) {
  const wave = phase - u * 7.4;
  return { x: u * .88 + .018 * (Math.sin(wave) - Math.sin(phase)),
    y: u * (3.6 * Math.sin(wave) + .7 * Math.sin(wave * 2)) + u * u * 1.8,
    light: .73 + .245 * Math.cos(wave) + .025 * Math.sin(wave * 2) };
}
function adapter(ctx) {
  const g = {
    fillStyle(c, a = 1) { ctx.fillStyle = `rgba(${c >> 16},${c >> 8 & 255},${c & 255},${a})`; return g; },
    lineStyle(w, c, a = 1) { ctx.lineWidth = w; ctx.strokeStyle = `rgba(${c >> 16},${c >> 8 & 255},${c & 255},${a})`; return g; },
    fillRect(...v) { ctx.fillRect(...v); return g; },
    fillPoints(p) { ctx.beginPath(); p.forEach((v,i) => i ? ctx.lineTo(v.x,v.y) : ctx.moveTo(v.x,v.y)); ctx.closePath(); ctx.fill(); return g; },
    lineBetween(x,y,a,b) { ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(a,b);ctx.stroke();return g; },
  }; return g;
}
function keyFor(side, id) { const p = periodStandardFor(side,id); return `cloth-${p.pattern}-${p.stars}`; }
export function createStandardTextures(scene) {
  const material = scene.textures.get('bunting-material').getSourceImage();
  // A scene needs its own two period designs, not every other battlefield's
  // canvases. Omitted IDs retain periodStandardFor's documented Gettysburg
  // default for standalone callers; a later scene can add its own missing keys.
  const id = scene.scenarioId || 'gettysburg';
  for (const side of ['union', 'confederate']) {
    const key = keyFor(side,id); if (scene.textures.exists(key)) continue;
    const square = periodStandardFor(side,id).pattern === 'anv';
    const w = square ? 34 : 48, h = square ? 34 : 30, top = square ? -62 : -60;
    const flat = document.createElement('canvas');flat.width=w*SCALE;flat.height=h*SCALE;
    const c=flat.getContext('2d',{alpha:true});c.scale(SCALE,SCALE);c.translate(-3,-top);drawPeriodStandard(adapter(c),side,id);c.setTransform(1,0,0,1,0,0);
    c.globalCompositeOperation='multiply';c.globalAlpha=.42;c.drawImage(material,0,0,flat.width,flat.height);c.globalAlpha=1;c.globalCompositeOperation='source-over';
    // Hem and stitches belong to the flat cloth before deformation.
    c.strokeStyle='rgba(41,31,22,.26)';c.lineWidth=2;c.strokeRect(3,3,flat.width-6,flat.height-6);
    c.strokeStyle='rgba(246,232,199,.55)';c.lineWidth=1;c.setLineDash([2,3]);c.strokeRect(5,5,flat.width-10,flat.height-10);c.setLineDash([]);
    const atlas=createTransparentCanvasTexture(scene,key,FRAME_W*8,FRAME_H*4);const out=atlas.context;
    for(let frame=0;frame<CLOTH_FRAMES;frame++){
      const ox=(frame%8)*FRAME_W,oy=Math.floor(frame/8)*FRAME_H,phase=frame/CLOTH_FRAMES*TAU;
      for(let sx=0;sx<flat.width;sx++){
        const p=clothColumn(sx/flat.width,phase),q=clothColumn((sx+1)/flat.width,phase);
        const dx=ox+12+p.x*flat.width,dy=oy+(top+68)*SCALE+p.y*SCALE,dw=Math.max(.3,(q.x-p.x)*flat.width+.25);
        out.drawImage(flat,sx,0,1,flat.height,dx,dy,dw,flat.height);
        out.fillStyle=`rgba(16,13,10,${1-p.light})`;out.fillRect(dx,dy,dw,flat.height);
      }
      atlas.add(frame,0,ox,oy,FRAME_W,FRAME_H);
    }
    atlas.refresh();
  }
}
export function createRealisticStandard(scene, side, id) {
  const key=keyFor(side,id);
  if(!scene.textures.exists(key)) return drawPeriodStandard(scene.add.graphics(),side,id);
  const sprite=scene.add.image(0,-68,key,0).setOrigin(0,0).setScale(1/SCALE);
  sprite.periodUpdate=(time,phase,reducedMotion)=>{const frame=clothFrame(time,phase,reducedMotion);if(sprite.periodFrame!==frame){sprite.setFrame(frame);sprite.periodFrame=frame;}return sprite;};
  return sprite;
}
export function createStandardPole(scene) {
  const g=scene.add.graphics();
  g.fillStyle(0x554331).fillRect(-1.2,-62,2.4,62);
  g.fillStyle(0xb09a71,.8).fillRect(-.9,-62,.7,62);
  g.fillStyle(0x897347).fillEllipse(0,-64,3,5);
  g.lineStyle(.65,0xb8ad8a,.85).lineBetween(0,-59,3,-59).lineBetween(0,-32,3,-32);
  return g;
}
