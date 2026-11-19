import { drawLandmarkSurroundings } from './landmarkSurroundings.js';
import { landmarkField } from './historicalLandmarks.js';
import { drawNaturalRoad, stampScenery } from './realisticScenery.js';
import { GETTYSBURG_TERRAIN } from './gettysburgMechanics.js';
import { createTransparentCanvasTexture } from './transparentCanvasTexture.js';

// Physical scenery and the optional tactical tint share the simulation's bounds.
// The terrain plate contains no fences or walls: their locations stay exact.
export function drawGettysburgTerrain(scene) {
  const { ridge, wall, road } = GETTYSBURG_TERRAIN;
  const key='gettysburg-physical-scenery-v2';
  const texture=createTransparentCanvasTexture(scene,key,scene.world.width,scene.world.height),ctx=texture.context;
  const fieldArt = scene.gettysburgFieldArt === true;
  if (fieldArt) {
    const center = (road.top + road.bottom) / 2;
    ctx.save();
    ctx.globalAlpha = .48;
    drawNaturalRoad(ctx, { x: 0, y: center }, { x: scene.world.width, y: center }, 28, 1863);
    ctx.restore();
  }
  for(const y of [road.top+4,road.bottom-4]) {
    for(let x=8,i=0;x<scene.world.width;x+=238,i++) {
      for (const offset of [0, 136]) {
        const start = x + offset;
        if (fieldArt) {
          ctx.fillStyle = 'rgba(39, 33, 23, .17)';
          ctx.beginPath();
          ctx.moveTo(start + 2, y + 1);
          ctx.lineTo(start + 97, y + 1);
          ctx.lineTo(start + 103, y + 5);
          ctx.lineTo(start + 8, y + 5);
          ctx.fill();
        }
        stampScenery(scene, ctx, 'earthworks', 'fence', start, y - 11, 99, 18, Boolean(i % 2));
      }
    }
  }
  ctx.save();ctx.beginPath();ctx.rect(wall.left,wall.top,wall.right-wall.left,wall.bottom-wall.top);ctx.clip();
  // A short return makes the angle visible within the authored cover area.
  if (fieldArt) {
    ctx.save();
    ctx.translate(1103, wall.bottom - 10);
    ctx.rotate(-Math.PI / 2);
    stampScenery(scene, ctx, 'earthworks', 'wall', 0, -7, 46, 15);
    ctx.restore();
  }
  for(let x=wall.left,i=0;x<wall.right;x+=90,i++)stampScenery(scene,ctx,'earthworks','wall',x,wall.bottom-17,Math.min(100,wall.right-x),17,Boolean(i%2));
  ctx.restore();
  for (const site of landmarkField(scene.engine)?.landmarks || []) {
    ctx.save();
    const yard = ctx.createRadialGradient(site.x, site.y + 8, 8, site.x, site.y + 8, site.artWidth * .65);
    yard.addColorStop(0, 'rgba(132,112,74,.3)'); yard.addColorStop(1, 'rgba(132,112,74,0)');
    ctx.fillStyle = yard; ctx.fillRect(site.x-site.artWidth, site.y-site.artHeight, site.artWidth*2, site.artHeight*2);
    const connected = drawLandmarkSurroundings(ctx, { ...site, mapRules: scene.engine.battleRulesVersion }, 173);
    if (!connected) {
    ctx.strokeStyle = 'rgba(162,140,94,.45)'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(site.x + site.width / 2, site.y); ctx.quadraticCurveTo(site.x + 90, site.y - 20, site.x + 115, 25); ctx.stroke();
    }
    ctx.restore();
  }
  texture.refresh();scene.add.image(0,0,key).setOrigin(0).setDepth(1);
  const layer = scene.add.container(0, 0).setDepth(1);
  const tint = scene.add.graphics();
  tint.fillStyle(0xb2c58b, 0.09).fillRect(ridge.left, ridge.top, ridge.right - ridge.left, ridge.bottom - ridge.top);
  tint.lineStyle(1, 0xd9dab0, 0.45).strokeRect(ridge.left, ridge.top, ridge.right - ridge.left, ridge.bottom - ridge.top);
  tint.fillStyle(0xd6b775, 0.1).fillRect(0, road.top, scene.world.width, road.bottom - road.top);
  tint.fillStyle(0xcac4a2, 0.12).fillRect(wall.left, wall.top, wall.right - wall.left, wall.bottom - wall.top);
  layer.add(tint);
  for (const [x, y, text] of [[330, 571, 'FENCED ROAD · SLOW CROSSING'], [1345, 380, 'STONE WALL · COVER']]) {
    layer.add(scene.add.text(x, y, text, { fontFamily: 'Outfit, sans-serif', fontSize: '16px', color: '#e8ddbc', backgroundColor: '#19241edb', padding: { x: 7, y: 4 } }).setOrigin(0.5));
  }
  return layer;
}
