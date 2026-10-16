import { drawNaturalRoad } from './realisticScenery.js';

// Illustrative farm surfaces on compressed boards, not surveyed roads or new cover.
// Keep this presentation data outside engine snapshots and simulation zones.
const layouts = {
  'widow-tapp-house': { minimumRules:17, lanes: [[{x:295,y:540},{x:330,y:565},{x:320,y:625}]], plot:{x:150,y:440,width:80,height:115}, fences:[] },
  'garthright-house': { minimumRules:17, lanes: [[{x:445,y:229},{x:520,y:280},{x:900,y:280},{x:1360,y:280}]], plot:{x:280,y:175,width:85,height:70}, fences:[] },
  'shiloh-church': { minimumRules:17, kind:'meeting-ground', lanes: [[{x:455,y:631},{x:535,y:665},{x:730,y:665},{x:805,y:610}]], plot:{x:490,y:568,width:100,height:67}, fences:[] },

  'brian-house': { minimumRules:17, lanes: [[{x:1310,y:419},{x:1400,y:455},{x:1480,y:455},{x:1480,y:520}]], plot:{x:1435,y:350,width:130,height:60}, fences:[] },
  'leister-house': { minimumRules:17, lanes: [[{x:1167,y:195},{x:1220,y:180},{x:1480,y:180},{x:1480,y:455}]], plot:{x:990,y:160,width:65,height:64}, fences:[] },

  'heater-house': { lanes: [[{x:1270,y:514},{x:1230,y:540},{x:760,y:540}]], plot:{x:1345,y:490,width:116,height:62}, fences:[[{x:1336,y:476},{x:1460,y:476}],[{x:1464,y:485},{x:1464,y:557}]] },
  'catharine-furnace': { kind:'industrial', lanes: [[{x:1115,y:784},{x:1050,y:825},{x:820,y:825},{x:820,y:760}]], plot:{x:975,y:765,width:74,height:54}, fences:[] },
  'belle-grove': { minimumRules:16, lanes: [[{x:635,y:508},{x:675,y:540},{x:760,y:540}]], plot:{x:460,y:478,width:76,height:58}, fences:[[{x:455,y:468},{x:535,y:468}]] },
  'chancellor-house': { minimumRules:16, lanes: [[{x:1220,y:580},{x:1280,y:635},{x:1280,y:745},{x:1115,y:784}]], plot:{x:1320,y:580,width:84,height:70}, fences:[[{x:1410,y:572},{x:1410,y:655}]] },

  'stone-house': { lanes: [[{x:320,y:364},{x:355,y:410},{x:470,y:435}], [{x:470,y:435},{x:485,y:490},{x:590,y:562}]], plot:{x:215,y:340,width:62,height:54} },
  'snodgrass-house': { lanes: [[{x:500,y:185},{x:585,y:240},{x:760,y:240}]], plot:{x:565,y:135,width:84,height:56} },
};
export function landmarkSurroundings(site) {
  const layout = layouts[site.id];
  return layout && (!layout.minimumRules || site.mapRules >= layout.minimumRules) ? structuredClone(layout) : null;
}
export function drawLandmarkSurroundings(ctx, site, seed) {
  const layout = landmarkSurroundings(site);
  if (!layout) return false;
  ctx.save();
  // Irregular cultivation and worn yard edges blend into the existing ground plate.
  const p=layout.plot;
  ctx.fillStyle=layout.kind === 'meeting-ground' ? 'rgba(156,136,96,.24)' : layout.fences ? 'rgba(112,87,54,.32)' : 'rgba(112,87,54,.15)';ctx.beginPath();
  ctx.moveTo(p.x,p.y+6);ctx.lineTo(p.x+p.width-5,p.y);ctx.lineTo(p.x+p.width,p.y+p.height-7);ctx.lineTo(p.x+3,p.y+p.height);ctx.closePath();ctx.fill();
  ctx.clip();
  for(let y=['industrial','meeting-ground'].includes(layout.kind) ? p.y+p.height : p.y+6;y<p.y+p.height;y+=7){ctx.strokeStyle=layout.fences ? 'rgba(81,66,42,.42)' : 'rgba(81,66,42,.22)';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(p.x+2,y);ctx.lineTo(p.x+p.width-2,y-4);ctx.stroke();}
  ctx.restore();
  if (layout.kind === 'industrial') {
    // Low charcoal stockpiles identify a work yard; no extra structures or obstacles.
    for (let i=0;i<3;i++) { ctx.fillStyle='rgba(39,35,29,.55)';ctx.beginPath();ctx.ellipse(p.x+14+i*20,p.y+25+(i%2)*12,12,7,0,0,Math.PI*2);ctx.fill(); }
  }
  for(const lane of layout.lanes) {
    if (layout.fences) {
      ctx.save();ctx.beginPath();lane.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
      ctx.strokeStyle='rgba(165,139,96,.4)';ctx.lineWidth=8;ctx.lineJoin='round';ctx.stroke();ctx.restore();
    }
    for(let i=1;i<lane.length;i++)drawNaturalRoad(ctx,lane[i-1],lane[i],12,seed+i);
  }
  for (const [a,b] of layout.fences || []) {
    ctx.save();ctx.strokeStyle='rgba(81,64,41,.65)';ctx.lineWidth=1.6;
    for (const offset of [-2,2]) {ctx.beginPath();ctx.moveTo(a.x,a.y+offset);ctx.lineTo(b.x,b.y+offset);ctx.stroke();}
    const count=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/16);
    for(let i=0;i<=count;i++){const x=a.x+(b.x-a.x)*i/count,y=a.y+(b.y-a.y)*i/count;ctx.fillStyle='#69553c';ctx.fillRect(x-1.2,y-5,2.4,10);}
    ctx.restore();
  }
  return true;
}
