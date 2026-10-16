import { drawNaturalRoad } from './realisticScenery.js';

export const SIEGE_TERRAIN_ASSETS = ['ravine', 'earthwork', 'crater'].map(id => ({ id, key: `siege-${id}`, src: `images/battles/siege-v1/${id}.png` }));
export const hasSiegeTerrain = id => ['cold_harbor', 'petersburg'].includes(id);
export const siegeTerrainAssets = id => hasSiegeTerrain(id) ? SIEGE_TERRAIN_ASSETS.filter(a => a.id === 'earthwork' || a.id === (id === 'petersburg' ? 'crater' : 'ravine')) : [];

// Presentation only. Every stamp is clipped to its existing simulation zone.
// No new cover, impassable trench, firing obstruction or movement corridor is added.
export function siegeTerrainPlan(id, zones) {
  if (!hasSiegeTerrain(id)) return [];
  return zones.filter(z => ['ravine', 'earthworks', 'crater'].includes(z.kind)).map(zone => {
    const width = zone.right-zone.left, height = zone.bottom-zone.top, sprites = [];
    const add = (asset,x,y,w,h,angle=0) => sprites.push({asset,x,y,width:w,height:h,angle});
    if (zone.kind === 'crater') add('crater',(zone.left+zone.right)/2,(zone.top+zone.bottom)/2,width-8,height-8);
    else if (zone.kind === 'ravine') {
      const count = Math.max(1,Math.ceil(width/550)), step = (width-24)/count;
      for(let i=0;i<count;i++) add('ravine',zone.left+12+step*(i+.5),zone.top+height*[.4,.62,.45][i%3],step*.82,height*[.58,.49,.66][i%3]);
    } else {
      const union = zone.bottom < 300, front = union ? zone.bottom-37 : zone.top+37;
      const count=Math.max(1,Math.ceil((width-24)/190)),step=(width-24)/count;
      for(let i=0;i<count;i++) add('earthwork',zone.left+12+step*(i+.5),front,step+30,64,union?Math.PI:0);
      // Short traverses connect firing bays to the interior of the same cover zone.
      const reach=Math.min(86,height-74), rear=front+(union?-1:1)*reach;
      for(let x=zone.left+100;x<zone.right-70;x+=285) {
        add('earthwork',x,(front+rear)/2,reach+30,33,Math.PI/2);
      }
    }
    return {zone:{...zone},sprites};
  });
}

export function clipDestroyedRoads(ctx,e) {
  if(e.scenarioId !== 'petersburg' || e.battleRulesVersion < 12) return;
  for(const z of e.fieldBattle.zones.filter(z=>z.kind==='crater')) {
    ctx.beginPath();ctx.rect(0,0,e.world.width,e.world.height);
    ctx.rect(z.left,z.top,z.right-z.left,z.bottom-z.top);ctx.clip('evenodd');
  }
}

export function drawSiegeTerrain(scene,ctx) {
  const e=scene.engine;
  if (!hasSiegeTerrain(e.scenarioId)) return;
  for(const {zone,sprites} of siegeTerrainPlan(e.scenarioId,e.fieldBattle.zones)) {
    ctx.save();ctx.beginPath();ctx.rect(zone.left,zone.top,zone.right-zone.left,zone.bottom-zone.top);ctx.clip();
    // Trampled interiors distinguish the full defended area from adjacent pasture.
    if(zone.kind==='earthworks') {
      const x=(zone.left+zone.right)/2,y=(zone.top+zone.bottom)/2;
      ctx.save();ctx.translate(x,y);ctx.scale((zone.right-zone.left)/2,(zone.bottom-zone.top)/2);
      const wash=ctx.createRadialGradient(0,0,.2,0,0,1);wash.addColorStop(0,'rgba(122,98,58,.28)');wash.addColorStop(1,'rgba(122,98,58,0)');
      ctx.fillStyle=wash;ctx.fillRect(-1,-1,2,2);ctx.restore();
    }
    for(const s of sprites) {
      ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.angle);
      ctx.drawImage(scene.textures.get(`siege-${s.asset}`).getSourceImage(),-s.width/2,-s.height/2,s.width,s.height);ctx.restore();
    }
    ctx.restore();
  }
  // Keep existing roads visibly continuous through both earthwork and ravine art.
  for(const road of e.config.movement?.roadBands || []) {
    const vertical=road.axis==='x';
    ctx.save();
    clipDestroyedRoads(ctx,e);
    drawNaturalRoad(ctx,vertical?{x:road.value,y:0}:{x:0,y:road.value},vertical?{x:road.value,y:e.world.height}:{x:e.world.width,y:road.value},road.width,51);
    ctx.restore();
  }
}

export function siegeTerrainGuide(id) {
  if(id==='cold_harbor') return {
    title:'Ravines and interlocking works',
    history:'Ravines divided the Federal attack columns and exposed them to overlapping Confederate fire. These reconstructed earthworks show connected firing bays and short traverses within the game’s defended ground.',
    tactics:'Broken assault ground slows movement and increases exposure. Cover applies throughout the marked earthwork zone. The Petersburg road remains the route for transferring reserves.',
    source:'https://www.nps.gov/rich/learn/historyculture/cold-harbor-tour.htm',
  };
  if(id==='petersburg') return {
    title:'Elliott’s Salient and the Crater',
    history:'The Federal mine shattered Elliott’s Salient. Surviving defenses and secondary works helped Confederate troops contain the breach while Mahone’s men arrived. The elongated pit and timber debris are illustrative reconstructions.',
    tactics:'The Crater basin is slow and exposed. Hold the secondary works and bring the reserve brigades forward together. The upper siege works remain the objectives for the night sortie.',
    source:'https://www.nps.gov/pete/learn/historyculture/battle-of-the-crater.htm',
  };
  return null;
}
