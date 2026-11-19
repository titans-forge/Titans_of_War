import { drawLandmarkSurroundings } from './landmarkSurroundings.js';
import { stampScenery, drawNaturalRoad, drawNaturalCreek } from './realisticScenery.js';
import { hasSiegeTerrain, drawSiegeTerrain, clipDestroyedRoads } from './siegeTerrainVisual.js';
import { fieldExitTargets } from './fieldBattleProfiles.js';
import { drawSiegeTargetAccess } from './siegeTargetVisual.js';
import { createTransparentCanvasTexture } from './transparentCanvasTexture.js';
import { drawManassasRoadsAndYards } from './manassasFieldArt.js';
import { drawShilohLandingArt } from './shilohLandingArt.js';
import { drawChancellorsvilleLandmarkGround, drawChancellorsvilleZoneGround } from './chancellorsvilleLandmarkGround.js';
import { chickamaugaLandmarkGround, drawChickamaugaLandmarkGround } from './chickamaugaLandmarkGround.js';
import { drawWildernessLandmarkGround, drawWildernessWoodland, wildernessLandmarkGround } from './wildernessLandmarkGround.js';
import { drawWinchesterLandmarkGround, winchesterLandmarkGround } from './winchesterLandmarkGround.js';
import { cedarCreekLandmarkGround, drawCedarCreekDawnGround, drawCedarCreekLandmarkYards, drawCedarCreekWater } from './cedarCreekLandmarkGround.js';
import { coldHarborReliefPlan, drawColdHarborRelief } from './coldHarborRelief.js';
import { petersburgReliefPlan, drawPetersburgRelief } from './petersburgRelief.js';
import { createPetersburgGroundState } from './petersburgGroundState.js';
import { antietamTerrainPlan, drawAntietamRelief, drawAntietamGround } from './antietamTerrain.js';
import { drawFiveForksTerrain, fiveForksTerrainPlan } from './fiveForksTerrain.js';
import { drawJonesboroughTerrain, jonesboroughTerrainPlan } from './jonesboroughTerrain.js';
import { drawSecondManassasTerrain, secondManassasTerrainPlan } from './secondManassasTerrain.js';
import { drawFredericksburgTerrain, fredericksburgTerrainPlan } from './fredericksburgTerrain.js';
import { drawGainesMillTerrain, gainesMillTerrainPlan } from './gainesMillTerrain.js';
import { drawNewMarketTerrain, newMarketTerrainPlan } from './newMarketTerrain.js';
import { drawMissionaryRidgeTerrain, missionaryRidgeTerrainPlan } from './missionaryRidgeTerrain.js';
import { drawSpotsylvaniaTerrain, spotsylvaniaTerrainPlan } from './spotsylvaniaTerrain.js';
import { drawKennesawTerrain, kennesawTerrainPlan } from './kennesawTerrain.js';
import { drawVicksburgTerrain, vicksburgTerrainPlan } from './vicksburgTerrain.js';
import { drawSailorsTerrain, sailorsTerrainPlan } from './sailorsCreekTerrain.js';

const color = { woods: 0x28472c, ridge: 0xa3a574, clearing: 0xb7ab71, creek: 0x638b93, ravine: 0x805e45, earthworks: 0x62452f, crater: 0x413027, road: 0xbba27b, mud: 0x80614e };
const noise = (seed, i) => { const x = Math.sin(seed * 37.719 + i * 78.233) * 43758.5453; return x - Math.floor(x); };

// Scenery is baked once to a texture. It shares the simulation's zones and
// roads; toggling rule labels never makes a physical trench or road disappear.
export function drawFieldTerrain(scene) {
  const e = scene.engine, f = e.fieldBattle, w = e.world;
  const scenery = scene.add.graphics().setDepth(1);
  const rules = scene.add.graphics();
  const labels = [], trees = [];
  const fiveForksGround = fiveForksTerrainPlan(e);
  const jonesboroughGround = jonesboroughTerrainPlan(e);
  const secondManassasGround = secondManassasTerrainPlan(e);
  const fredericksburgGround = fredericksburgTerrainPlan(e);
  const gainesMillGround = gainesMillTerrainPlan(e);
  const newMarketGround = newMarketTerrainPlan(e);
  const missionaryRidgeGround = missionaryRidgeTerrainPlan(e);
  const spotsylvaniaGround = spotsylvaniaTerrainPlan(e);
  const kennesawGround = kennesawTerrainPlan(e);
  const vicksburgGround = vicksburgTerrainPlan(e);
  const sailorsGround = sailorsTerrainPlan(e);
  const wildernessGround = scene.wildernessLandmarksArt && wildernessLandmarkGround(e);
  const usesOwnGround = fiveForksGround || jonesboroughGround || secondManassasGround || fredericksburgGround
    || gainesMillGround || newMarketGround || missionaryRidgeGround || spotsylvaniaGround || kennesawGround || vicksburgGround || sailorsGround;
  const paintedGround = ['first_manassas', 'shiloh'].includes(e.scenarioId);
  const seed = [...e.scenarioId].reduce((n, c) => n + c.charCodeAt(0), 0);
  const label = (x, y, text) => scene.add.text(x, y, text, { fontFamily: 'Outfit, sans-serif', fontSize: '13px', color: '#eee3bf', backgroundColor: '#17221cd9', padding: { x: 5, y: 3 } }).setOrigin(.5);
  for (const [index, z] of f.zones.entries()) {
    const width = z.right - z.left, height = z.bottom - z.top;
    // Physical ground has organic edges; rectangular boundaries belong only to the optional rules overlay.
    if (z.kind === 'woods' && !usesOwnGround && !wildernessGround) {
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
    } else if (!usesOwnGround && (z.kind === 'ridge' || z.kind === 'ravine')) {
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
  const relief = scene.coldHarborTerrainArt && coldHarborReliefPlan(e);
  if (relief) drawColdHarborRelief(context, scene.textures.get(scene.config.terrain.key).getSourceImage(), relief);
  const petersburgRelief = scene.petersburgTerrainArt && petersburgReliefPlan(e);
  if (petersburgRelief) drawPetersburgRelief(context, scene.textures.get(scene.config.terrain.key).getSourceImage(), petersburgRelief);
  const antietamGround = scene.antietamTerrainArt && antietamTerrainPlan(e);
  if (antietamGround) drawAntietamRelief(context, scene.textures.get(scene.config.terrain.key).getSourceImage(), antietamGround);
  if (fiveForksGround) drawFiveForksTerrain(scene, context, scene.textures.get(scene.config.terrain.key).getSourceImage(), fiveForksGround, seed);
  if (jonesboroughGround) drawJonesboroughTerrain(scene, context, scene.textures.get(scene.config.terrain.key).getSourceImage(), jonesboroughGround, seed);
  if (secondManassasGround) drawSecondManassasTerrain(scene, context, scene.textures.get(scene.config.terrain.key).getSourceImage(), secondManassasGround, seed);
  if (fredericksburgGround) drawFredericksburgTerrain(scene, context, scene.textures.get(scene.config.terrain.key).getSourceImage(), fredericksburgGround, seed);
  if (gainesMillGround) drawGainesMillTerrain(scene, context, scene.textures.get(scene.config.terrain.key).getSourceImage(), gainesMillGround, seed);
  if (newMarketGround) drawNewMarketTerrain(scene, context, scene.textures.get(scene.config.terrain.key).getSourceImage(), newMarketGround, seed);
  if (missionaryRidgeGround) drawMissionaryRidgeTerrain(scene, context, scene.textures.get(scene.config.terrain.key).getSourceImage(), missionaryRidgeGround, seed);
  if (spotsylvaniaGround) drawSpotsylvaniaTerrain(scene, context, scene.textures.get(scene.config.terrain.key).getSourceImage(), spotsylvaniaGround, seed);
  if (kennesawGround) drawKennesawTerrain(scene, context, scene.textures.get(scene.config.terrain.key).getSourceImage(), kennesawGround, seed);
  if (vicksburgGround) drawVicksburgTerrain(scene, context, scene.textures.get(scene.config.terrain.key).getSourceImage(), vicksburgGround, seed);
  if (sailorsGround) drawSailorsTerrain(scene, context, scene.textures.get(scene.config.terrain.key).getSourceImage(), sailorsGround, seed);
  if (wildernessGround) drawWildernessWoodland(scene, context, scene.textures.get(scene.config.terrain.key).getSourceImage(), wildernessGround, seed);
  context.drawImage(scene.textures.get(key).getSourceImage(), 0, 0);
  if (antietamGround) drawAntietamGround(context, antietamGround, seed);
  const cedarGround = scene.cedarCreekLandmarksArt && cedarCreekLandmarkGround(e);
  if (cedarGround) drawCedarCreekDawnGround(context, cedarGround, seed);
  for(const road of e.config.movement?.roadBands || []) {
    if (usesOwnGround || road === wildernessGround?.mainRoad || road === relief?.pike || petersburgRelief?.roads?.includes(road)) continue;
    const vertical=road.axis==='x';
    context.save();clipDestroyedRoads(context,e);
    drawNaturalRoad(context,vertical?{x:road.value,y:0}:{x:0,y:road.value},vertical?{x:road.value,y:w.height}:{x:w.width,y:road.value},road.width,seed);
    context.restore();
  }
  if (wildernessGround) drawWildernessLandmarkGround(context, wildernessGround, seed);
  const chickamaugaGround = scene.chickamaugaLandmarksArt && chickamaugaLandmarkGround(e);
  if (chickamaugaGround) drawChickamaugaLandmarkGround(context, chickamaugaGround, seed);
  const winchesterGround = scene.winchesterLandmarksArt && winchesterLandmarkGround(e);
  if (winchesterGround) drawWinchesterLandmarkGround(context, winchesterGround, seed);
  for (const [index,z] of f.zones.entries()) {
    if (usesOwnGround) continue;
    const width=z.right-z.left,height=z.bottom-z.top;
    context.save(); context.beginPath(); context.rect(z.left,z.top,width,height); context.clip();
    if (scene.chancellorsvilleLandmarksArt) drawChancellorsvilleZoneGround(context, z);
    if(hasSiegeTerrain(e.scenarioId) && ['earthworks','crater','ravine'].includes(z.kind)) {
      // Dedicated siege artwork is composited once below.
    } else if(z.kind==='earthworks') {
      const y=z.top<300?z.bottom-23:z.top+23;
      for(let x=z.left+3,i=0;x<z.right-3;x+=84,i++) {
        const span=Math.min(96,z.right-x-3);
        if(span>4) stampScenery(scene,context,'earthworks','trench',x,y-19,span,39,Boolean(i%2),true);
      }
    } else if(z.kind==='crater') stampScenery(scene,context,'earthworks','crater',z.left+2,z.top+2,width-4,height-4);
    else if (z === cedarGround?.creek) drawCedarCreekWater(context, cedarGround, seed + index);
    else if(z.kind==='creek' && z !== antietamGround?.creek) drawNaturalCreek(context,z,seed+index);
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
  if (scene.manassasFieldArt) drawManassasRoadsAndYards(context, f.landmarks);
  drawShilohLandingArt(scene, context);
  if (cedarGround) drawCedarCreekLandmarkYards(context, cedarGround, seed);
  for (const site of f.landmarks || []) {
    if (scene.manassasFieldArt && ['stone-house', 'henry-house'].includes(site.id)) continue;
    if (scene.chancellorsvilleLandmarksArt && drawChancellorsvilleLandmarkGround(context, site)) continue;
    if (site === wildernessGround?.house) continue;
    if (site === chickamaugaGround?.house || site === chickamaugaGround?.cabin) continue;
    if (site === winchesterGround?.house) continue;
    if (site === cedarGround?.manor || site === cedarGround?.farm) continue;
    context.save();
    const yard = context.createRadialGradient(site.x, site.y + 8, 10, site.x, site.y + 8, site.artWidth * .65);
    yard.addColorStop(0, 'rgba(132,112,74,.35)'); yard.addColorStop(1, 'rgba(132,112,74,0)');
    context.fillStyle = yard; context.fillRect(site.x-site.artWidth, site.y-site.artHeight, site.artWidth*2, site.artHeight*2);
    if (!drawLandmarkSurroundings(context, { ...site, mapRules: e.battleRulesVersion }, seed + 91)) drawNaturalRoad(context, { x: site.x + 10, y: site.y + site.height / 2 }, site.approachX != null ? { x: site.approachX, y: site.approachY } : { x: site.x + 34, y: site.y + site.height / 2 + 65 }, 5, seed + 71);
    context.restore();
  }
  canopy.refresh();
  scene.add.image(0, 0, canopyKey).setOrigin(0).setDepth(1);
  if (petersburgRelief) scene.petersburgGroundState = createPetersburgGroundState(scene, petersburgRelief.basin);
  for (const side of ['union', 'confederate']) for (const exit of fieldExitTargets(e, { side })) {
    labels.push(scene.add.rectangle(exit.x, exit.y, jonesboroughGround ? 72 : fiveForksGround || fredericksburgGround ? 80 : 120, 28, side === 'union' ? 0x476c9a : 0x8d4545, .5).setDepth(1));
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
