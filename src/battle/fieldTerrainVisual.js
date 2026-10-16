import { drawLandmarkSurroundings } from './landmarkSurroundings.js';
import { stampScenery, drawNaturalRoad, drawNaturalCreek } from './realisticScenery.js';
import { hasSiegeTerrain, drawSiegeTerrain, clipDestroyedRoads } from './siegeTerrainVisual.js';
import { fieldExitTargets } from './fieldBattleProfiles.js';
import { drawSiegeTargetAccess } from './siegeTargetVisual.js';
import { createTransparentCanvasTexture } from './transparentCanvasTexture.js';

const color = { woods: 0x28472c, ridge: 0xa3a574, clearing: 0xb7ab71, creek: 0x638b93, ravine: 0x805e45, earthworks: 0x62452f, crater: 0x413027, road: 0xbba27b };
const noise = (seed, i) => { const x = Math.sin(seed * 37.719 + i * 78.233) * 43758.5453; return x - Math.floor(x); };

// Scenery is baked once to a texture. It shares the simulation's zones and
// roads; toggling rule labels never makes a physical trench or road disappear.
export function drawFieldTerrain(scene) {
  const e = scene.engine, f = e.fieldBattle, w = e.world;
  const scenery = scene.add.graphics().setDepth(1);
  const rules = scene.add.graphics();
  const labels = [], trees = [];
  const paintedGround = ['first_manassas', 'shiloh'].includes(e.scenarioId);
  const seed = [...e.scenarioId].reduce((n, c) => n + c.charCodeAt(0), 0);
  const label = (x, y, text) => scene.add.text(x, y, text, { fontFamily: 'Outfit, sans-serif', fontSize: '13px', color: '#eee3bf', backgroundColor: '#17221cd9', padding: { x: 5, y: 3 } }).setOrigin(.5);
  for (const [index, z] of f.zones.entries()) {
    const width = z.right - z.left, height = z.bottom - z.top;
    // Physical ground has organic edges; rectangular boundaries belong only to the optional rules overlay.
    if (z.kind === 'woods') {
      const count = Math.min(360, Math.round(width * height / 1500));
      for (let i = 0; i < count; i++) {
        const size = 40 + noise(seed + 9, i) * 28, radius=size*.58;
        if(width<radius*2 || height<radius*2)continue;
        const x = z.left + radius + noise(seed + index, i * 2) * (width - radius*2), y = z.top + radius + noise(seed + index, i * 2 + 1) * (height - radius*2);
        if ((f.landmarks || []).some(site => Math.abs(x - site.x) < site.artWidth / 2 + radius && Math.abs(y - site.y) < site.artHeight / 2 + radius)) continue;
        // Whole canopies stay inside cover. Avoid sawing trees into rectangular edges.
        if (f.zones.some(zone => zone.kind !== 'woods' && x+radius>zone.left && x-radius<zone.right && y+radius>zone.top && y-radius<zone.bottom) || e.config.movement?.roadBands?.some(road => Math.abs((road.axis === 'x' ? x : y) - road.value) < road.width+radius)) continue;
        scenery.fillStyle(0x0f2012, .22).fillEllipse(x + 7, y + 9, size * .95, size * .68);
        trees.push({ x, y, size, zone: z });
      }
    } else if (['earthworks', 'crater', 'creek'].includes(z.kind)) {
      // Photographic surfaces are composited below after the geometry layer.
    } else if (z.kind === 'ridge' || z.kind === 'ravine') {
      for (let j = 0; j < 5; j++) {
        scenery.fillStyle(z.kind==='ridge'?0xd4c6a0:0x342e20,paintedGround?.012:.025)
          .fillEllipse((z.left+z.right)/2,(z.top+z.bottom)/2,width*(.98-j*.06),height*(.85-j*.11));
      }
    }
    rules.fillStyle(color[z.kind], .07).fillRect(z.left, z.top, width, height).lineStyle(1.5, 0xd8d0a4, .55).strokeRect(z.left, z.top, width, height);
    labels.push(label((z.left + z.right) / 2, z.bottom - 12, `${z.name} · ${z.defense < 1 ? 'EXPOSED' : z.defense > 1 ? 'COVER' : 'OPEN'}`));
  }
  const key = `field-scenery-${e.scenarioId}`;
  // Graphics.generateTexture otherwise obtains an arbitrary pooled Canvas.
  // Its existing-key path draws the same geometry into our alpha-enabled one.
  createTransparentCanvasTexture(scene, key, w.width, w.height);
  scenery.generateTexture(key, w.width, w.height); scenery.destroy();
  // Bake alpha foliage once; no per-frame forest sprites or pixel reads.
  const canopyKey = `${key}-canopy`, canopy = createTransparentCanvasTexture(scene, canopyKey, w.width, w.height);
  const context = canopy.context;
  context.drawImage(scene.textures.get(key).getSourceImage(), 0, 0);
  for(const road of e.config.movement?.roadBands || []) {
    const vertical=road.axis==='x';
    context.save();clipDestroyedRoads(context,e);
    drawNaturalRoad(context,vertical?{x:road.value,y:0}:{x:0,y:road.value},vertical?{x:road.value,y:w.height}:{x:w.width,y:road.value},road.width,seed);
    context.restore();
  }
  for (const [index,z] of f.zones.entries()) {
    const width=z.right-z.left,height=z.bottom-z.top;
    context.save(); context.beginPath(); context.rect(z.left,z.top,width,height); context.clip();
    if(hasSiegeTerrain(e.scenarioId) && ['earthworks','crater','ravine'].includes(z.kind)) {
      // Dedicated siege artwork is composited once below.
    } else if(z.kind==='earthworks') {
      const y=z.top<300?z.bottom-23:z.top+23;
      for(let x=z.left+3,i=0;x<z.right-3;x+=84,i++) {
        const span=Math.min(96,z.right-x-3);
        if(span>4) stampScenery(scene,context,'earthworks','trench',x,y-19,span,39,Boolean(i%2),true);
      }
    } else if(z.kind==='crater') stampScenery(scene,context,'earthworks','crater',z.left+2,z.top+2,width-4,height-4);
    else if(z.kind==='creek') drawNaturalCreek(context,z,seed+index);
    context.restore();
  }
  drawSiegeTerrain(scene, context);
  drawSiegeTargetAccess(scene, context);
  for (const { x, y, size, zone } of trees) {
    context.save(); context.beginPath(); context.rect(zone.left, zone.top, zone.right - zone.left, zone.bottom - zone.top); context.clip();
    for (const opening of f.zones.filter(z => z.kind !== 'woods')) {
      context.beginPath(); context.rect(0, 0, w.width, w.height);
      context.rect(opening.left, opening.top, opening.right - opening.left, opening.bottom - opening.top); context.clip('evenodd');
    }
    for (const road of e.config.movement?.roadBands || []) {
      context.beginPath(); context.rect(0, 0, w.width, w.height);
      if (road.axis === 'x') context.rect(road.value - road.width, 0, road.width * 2, w.height);
      else context.rect(0, road.value - road.width, w.width, road.width * 2);
      context.clip('evenodd');
    }
    const variant=['oak','oak','poplar','cedar','scrub'][Math.floor(noise(seed,Math.round(x+y))*5)];
    stampScenery(scene,context,'foliage',variant,x-size*.58,y-size*.58,size*1.16,size*1.16,noise(seed,Math.round(x))>.5); context.restore();
  }
  for (const site of f.landmarks || []) {
    context.save();
    const yard = context.createRadialGradient(site.x, site.y + 8, 10, site.x, site.y + 8, site.artWidth * .65);
    yard.addColorStop(0, 'rgba(132,112,74,.35)'); yard.addColorStop(1, 'rgba(132,112,74,0)');
    context.fillStyle = yard; context.fillRect(site.x-site.artWidth, site.y-site.artHeight, site.artWidth*2, site.artHeight*2);
    if (!drawLandmarkSurroundings(context, { ...site, mapRules: e.battleRulesVersion }, seed + 91)) drawNaturalRoad(context, { x: site.x + 10, y: site.y + site.height / 2 }, site.approachX != null ? { x: site.approachX, y: site.approachY } : { x: site.x + 34, y: site.y + site.height / 2 + 65 }, 5, seed + 71);
    context.restore();
  }
  canopy.refresh();
  scene.add.image(0, 0, canopyKey).setOrigin(0).setDepth(1);
  for (const side of ['union', 'confederate']) for (const exit of fieldExitTargets(e, { side })) {
    labels.push(scene.add.rectangle(exit.x, exit.y, 120, 28, side === 'union' ? 0x476c9a : 0x8d4545, .5).setDepth(1));
    labels.push(scene.add.text(exit.x, exit.y, side === 'union' ? 'US REAR' : 'CS REAR', { fontFamily: 'Outfit, sans-serif', fontSize: '13px', color: '#fff5d8' }).setOrigin(.5).setDepth(1));
  }
  return scene.add.container(0, 0, [rules, ...labels]).setDepth(1);
}

export function drawFactionColor(g, side) {
  const points = [{ x: 3, y: -62 }, { x: 44, y: -62 }, { x: 37, y: -47 }, { x: 44, y: -32 }, { x: 3, y: -32 }];
  g.fillStyle(side === 'union' ? 0x304e7d : 0x923b43, 1).fillPoints(points, true);
  g.lineStyle(2, 0xe8d29b, .9).strokePoints(points, true);
  g.lineStyle(1, 0xffffff, .35).lineBetween(7, -58, 38, -58);
  return g;
}
