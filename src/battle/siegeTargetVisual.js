import { sortieTargets } from './siegeCommand.js';
import { drawNaturalRoad } from './realisticScenery.js';

// Illustrative material yards for the game's two abstract sortie objectives.
// Art, labels and access tracks never change the engine's target or terrain rules.
const names = {
  'union-siege-train-west': 'western-siege-train',
  'union-engineer-depot-east': 'eastern-engineer-depot',
};
export const SIEGE_TARGET_ASSETS = Object.entries(names).flatMap(([id, name]) =>
  [false, true].map(damaged => ({ id, damaged, key: `siege-target-${name}${damaged ? '-damaged' : ''}`,
    src: `images/battles/siege-targets-v1/${name}${damaged ? '-damaged' : ''}.png` })));

export function siegeTargetPlan(snapshot) {
  if (!(snapshot?.battleRulesVersion >= 4)) return [];
  return sortieTargets(snapshot).filter(site => names[site.id]).map(site => ({
    ...site, width: 270, height: 180,
    intactKey: `siege-target-${names[site.id]}`,
    damagedKey: `siege-target-${names[site.id]}-damaged`,
  }));
}
export const siegeTargetAssets = snapshot => siegeTargetPlan(snapshot).length ? SIEGE_TARGET_ASSETS : [];
export const siegeTargetReady = (textures, site) => textures.exists(site.intactKey) && textures.exists(site.damagedKey);

export function createSiegeTargetVisual(scene, site) {
  if (!site || !siegeTargetReady(scene.textures, site)) return null;
  const sprite = scene.add.image(site.x, site.y, site.hit ? site.damagedKey : site.intactKey)
    .setDisplaySize(site.width, site.height).setDepth((site.y + site.height * .3) * 10);
  return { site, sprite, hit: site.hit };
}

export function updateSiegeTargetVisual(view, hits) {
  const hit = hits?.includes(view.site.id) === true;
  if (view.hit !== hit) {
    view.sprite.setTexture(hit ? view.site.damagedKey : view.site.intactKey)
      .setDisplaySize(view.site.width, view.site.height);
    view.hit = hit;
  }
  // Sites remain anchored, including when their simulation proxies leave the field.
}

export function siegeAccessTracks(snapshot) {
  return siegeTargetPlan(snapshot).map(site => ({ id: site.id, width: 17,
    points: [{ x: site.x + 12, y: site.y + 74 }, { x: site.x + 28, y: 292 }, { x: 930, y: 292 }],
  }));
}

export function drawSiegeTargetAccess(scene, ctx) {
  const snapshot = scene.engine.snapshot(), sites = siegeTargetPlan(snapshot);
  for (const track of siegeAccessTracks(snapshot)) {
    if (!siegeTargetReady(scene.textures, sites.find(site => site.id === track.id))) continue;
    // Small worn work tracks join the existing central supply road. Decorative only.
    ctx.save();ctx.beginPath();
    track.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.lineJoin = 'round';ctx.lineCap = 'round';ctx.lineWidth = track.width * .65;
    ctx.strokeStyle = 'rgba(164,139,96,.58)';ctx.stroke();ctx.restore();
    for (let i = 1; i < track.points.length; i++) drawNaturalRoad(ctx, track.points[i - 1], track.points[i], track.width, 151 + i);
  }
}
