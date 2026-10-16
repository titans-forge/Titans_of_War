import { detailedCrewFrame } from './detailedUnitVisual.js';
// Original game artwork: ground-plane cannon geometry, upright crew, and a
// travelling limber. The drawing never feeds positions back into combat.
import { directionIndex } from './formationMath.js';

const TAU = Math.PI * 2;
const COLORS = Object.freeze({ iron: 0x252927, ironLight: 0x5b625a, wood: 0x515744, woodLight: 0x83856a, woodDark: 0x333d31, bronze: 0xb38b45, bronzeLight: 0xe4bc73, bronzeDark: 0x715228, shadow: 0x18221a });
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function finite(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  return value;
}

function hull(points) {
  const sorted = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const half = (items) => {
    const result = [];
    for (const point of items) {
      while (result.length > 1 && cross(result.at(-2), result.at(-1), point) <= 0) result.pop();
      result.push(point);
    }
    return result;
  };
  return [...half(sorted).slice(0, -1), ...half(sorted.slice().reverse()).slice(0, -1)];
}

/** Facing uses engine coordinates: 0 east, PI/2 south. Height is visual only.
 * `muzzleGround` has no height offset and shares the engine's ground direction.
 * `muzzle` is the actual visible barrel opening, including recoil and height.
 */
export function artilleryGeometry({ x = 0, y = 0, facing = 0, scale = 1, groundCompression = 1, recoil = 0, limbered = false, wheelRotation = 0 } = {}) {
  for (const [name, value] of Object.entries({ x, y, facing, scale, groundCompression, recoil, wheelRotation })) finite(value, name);
  if (scale < 0 || groundCompression <= 0) throw new RangeError('scale must be nonnegative and groundCompression positive');
  const kick = limbered ? 0 : clamp(recoil, 0, 1) * 3;
  const project = (forward, lateral = 0, height = 0) => ({
    x: x + (Math.cos(facing) * forward - Math.sin(facing) * lateral) * scale,
    y: y + (Math.sin(facing) * forward + Math.cos(facing) * lateral) * scale * groundCompression - height * scale,
  });
  const gun = (forward, lateral = 0, height = 0) => limbered
    ? project(-10 - forward, -lateral, height)
    : project(forward - kick, lateral, height);
  const ring = (forward, radius, height, at = gun) => Array.from({ length: 18 }, (_, index) => {
    const angle = index * TAU / 18;
    return at(forward, Math.cos(angle) * radius, height + Math.sin(angle) * radius);
  });
  const wheel = (forward, lateral, radius, at = gun) => ({
    ground: at(forward, lateral, 0),
    hub: at(forward, lateral, radius),
    rim: Array.from({ length: 24 }, (_, index) => {
      const angle = index * TAU / 24;
      return at(forward + Math.cos(angle) * radius, lateral, radius + Math.sin(angle) * radius);
    }),
    spokes: Array.from({ length: 10 }, (_, index) => {
      const angle = index * TAU / 10 + wheelRotation;
      return at(forward + Math.cos(angle) * (radius - 1), lateral, radius + Math.sin(angle) * (radius - 1));
    }),
  });
  const corners = (front, back, width, height, at = gun) => [at(front, -width, height), at(front, width, height), at(back, width, height), at(back, -width, height)];
  const muzzleForward = limbered ? 24 : 26;
  const muzzleHeight = limbered ? 15 : 18;
  const breechRing = ring(-10, 4.4, 15);
  const muzzleRing = ring(muzzleForward, 3.1, muzzleHeight);
  const crewSlots = limbered ? [[-13, -24], [11, 23], [28, -21]] : [[-17, -23], [8, 23], [-33, 14]];
  const geometry = {
    origin: { x, y }, scale, facing, groundCompression, limbered: Boolean(limbered),
    gunGround: gun(0),
    muzzle: gun(muzzleForward, 0, muzzleHeight),
    muzzleGround: gun(muzzleForward),
    breech: gun(-10, 0, 15),
    barrel: hull([...breechRing, ...muzzleRing]), muzzleRing,
    muzzleBore: ring(muzzleForward + 0.05, 1.85, muzzleHeight),
    barrelHighlight: [gun(-8, -1.8, 18.6), gun(muzzleForward - 2, -1.4, muzzleHeight + 2.1)],
    barrelShade: [gun(-8, 1.8, 12), gun(muzzleForward - 1.2, 1.4, muzzleHeight - 2.1)],
    barrelBand: ring(muzzleForward - 2.3, 3.7, muzzleHeight - 0.2),
    cascabel: gun(-15, 0, 15),
    axle: [gun(0, -16, 10), gun(0, 16, 10)],
    cheeks: [corners(9, -16, 5.5, 11), corners(8, -15, 5.5, 7)],
    trail: [gun(-11, -5.5, 10), gun(-11, 5.5, 10), gun(-35, 2.8, 2), gun(-35, -2.8, 2)],
    trailHighlight: [gun(-13, -3, 10.4), gun(-32, -1.4, 3.4)],
    trailRing: gun(-35, 0, 2),
    wheels: [wheel(0, -14, 10.5), wheel(0, 14, 10.5)],
    crew: crewSlots.map(([forward, lateral], index) => ({ ...project(forward, lateral), index, orientation: Math.cos(facing + (limbered ? 0 : Math.PI)) < 0 ? -1 : 1 })),
    // This footprint describes the apparatus, not standing crew or gun height.
    footprint: corners(limbered ? 36 : 29, limbered ? -34 : -36, limbered ? 16 : 17, 0, project),
    shadow: Array.from({ length: 28 }, (_, index) => {
      const angle = index * TAU / 28;
      return project((limbered ? 0 : -5) + Math.cos(angle) * (limbered ? 35 : 29), Math.sin(angle) * 13);
    }),
  };
  if (limbered) geometry.limber = {
    ground: project(24),
    wheels: [wheel(24, -13, 9, project), wheel(24, 13, 9, project)],
    axle: [project(24, -15, 9), project(24, 15, 9)],
    chestTop: corners(29, 17, 9, 18, project),
    chestFront: [project(29, -9, 18), project(29, 9, 18), project(29, 9, 10), project(29, -9, 10)],
    chestSide: [project(17, -9, 18), project(29, -9, 18), project(29, -9, 10), project(17, -9, 10)],
    chestStraps: [[project(27, -9, 18.4), project(27, 9, 18.4)], [project(19, -9, 18.4), project(19, 9, 18.4)]],
    pole: [project(29, 0, 7), project(36, 0, 4)],
  };
  return geometry;
}

function polygon(g, points, color, outline = COLORS.iron, width = 1) {
  g.fillStyle(color, 1).fillPoints(points, true);
  if (width > 0) g.lineStyle(width, outline, 1).strokePoints(points, true);
}

function line(g, points, color, width = 1) {
  g.lineStyle(width, color, 1).lineBetween(points[0].x, points[0].y, points[1].x, points[1].y);
}

function paintWheel(g, wheel, scale) {
  const width = Math.max(0.65, scale);
  g.lineStyle(4 * width, COLORS.iron, 1).strokePoints(wheel.rim, true);
  g.lineStyle(2.4 * width, COLORS.woodLight, 1).strokePoints(wheel.rim, true);
  for (const end of wheel.spokes) {
    line(g, [wheel.hub, end], COLORS.woodDark, 2.1 * width);
    line(g, [{ x: wheel.hub.x - .4 * scale, y: wheel.hub.y - .4 * scale }, { x: end.x - .4 * scale, y: end.y - .4 * scale }], COLORS.woodLight, .7 * width);
  }
  // Iron tyre joints and worn edges remain attached to the revolving wheel.
  for (const end of wheel.spokes.filter((_, i) => i % 2 === 0)) g.fillStyle(COLORS.ironLight, 1).fillCircle(end.x, end.y, .65 * scale);
  g.fillStyle(COLORS.iron, 1).fillCircle(wheel.hub.x, wheel.hub.y, 2.8 * scale);
  g.fillStyle(COLORS.ironLight, 1).fillCircle(wheel.hub.x - scale * 0.6, wheel.hub.y - scale * 0.6, 1.2 * scale);
}

function paintCrew(g, side, index, scale, orientation, phase, working) {
  const s = scale;
  const uniform = side === 'union' ? 0x283e5c : (index === 2 ? 0x786e56 : 0x717773);
  const lit = side === 'union' ? 0x476387 : 0x92938a;
  const trousers = side === 'union' ? 0x768894 : 0x686c62;
  const skin = index === 1 ? 0xbc946e : 0xd0ac85;
  const stride = Math.sin(phase) * 2.5;
  const point = (px, py) => ({ x: px * s, y: py * s });
  const poly = (pts, color, outline = 0x293029) => polygon(g, pts.map(([px, py]) => point(px, py)), color, outline, 0.7 * s);
  g.fillStyle(COLORS.shadow, 0.24).fillEllipse(1 * s, 1 * s, 13 * s, 5 * s);
  line(g, [point(-2.5, -13), point(-3.5 + stride, -2)], trousers, 4 * s);
  line(g, [point(2.5, -13), point(3.5 - stride, -2)], trousers, 4 * s);
  line(g, [point(-4 + stride, -1), point(-1 + stride + orientation * 2, -1)], 0x252b2a, 3 * s);
  line(g, [point(2 - stride, -1), point(5 - stride + orientation * 2, -1)], 0x252b2a, 3 * s);
  poly([[-4, -28], [3.5, -28], [5, -12], [-5.2, -12]], uniform);
  line(g, [point(-2, -26), point(-2.4, -14)], lit, 1.7 * s);
  line(g, [point(-4.4, -17), point(4.4, -17)], 0x2b302c, 1.5 * s);
  g.fillStyle(0xb39d69, 1).fillRect(-0.6 * s, -17.8 * s, 1.6 * s, 1.5 * s);
  const handX = working ? orientation * 9 : orientation * (4 + stride * 0.35);
  const handY = working ? -20 : -16;
  line(g, [point(orientation * 3, -26), point(orientation * 7, -21)], lit, 3.2 * s);
  line(g, [point(orientation * 7, -21), point(handX, handY)], uniform, 3 * s);
  g.fillStyle(skin, 1).fillCircle(handX * s, handY * s, 1.4 * s);
  g.fillStyle(0x322f29, 1).fillEllipse(0, -31 * s, 8 * s, 10 * s);
  g.fillStyle(skin, 1).fillEllipse(orientation * 1.2 * s, -31 * s, 6 * s, 7.5 * s);
  g.fillStyle(uniform, 1).fillEllipse(0, -35 * s, 8.7 * s, 4.5 * s);
  line(g, [point(-4, -34), point(orientation * 6, -34)], 0x252c2c, 1.4 * s);
  if (working && index === 1) {
    line(g, [point(handX, -26), point(handX + orientation * 3, -8)], 0x8c7960, 1.4 * s);
    g.fillStyle(0x423f33, 1).fillEllipse(handX * s, -26 * s, 3.2 * s, 5 * s);
  }
}

/** Creates only scene-owned display objects. Destroy the returned container to
 * release the complete visual; no timers, textures, tweens or events are added.
 */
export function createArtilleryVisual(scene, side, { crewTexture = null, crewScale = 0.6, realisticCrew = false, detailedCrew = false } = {}) {
  const container = scene.add.container(0, 0);
  const parts = {};
  for (const name of ['shadow', 'trail', 'body', 'barrel', 'wheel0', 'wheel1', 'limber', 'limberWheel0', 'limberWheel1', 'crew0', 'crew1', 'crew2']) {
    parts[name] = scene.add.graphics();
    container.add(parts[name]);
  }
  const view = { container, parts, scene, side: side === 'confederate' ? 'confederate' : 'union', geometry: null, crewTexture, crewScale, realisticCrew, detailedCrew, crewSprites: [] };
  ensureCrewSprites(view, crewTexture);
  return view;
}

function ensureCrewSprites(view, texture) {
  if (!texture || !view.scene.textures?.exists(texture)) return false;
  if (!view.crewSprites.length) {
    for (let index = 0; index < 3; index++) {
      const sprite = view.scene.add.image(0, 0, texture, view.detailedCrew ? '0' : view.realisticCrew ? '0-0' : 'idle-0-0').setOrigin(0.5, 0.8);
      view.container.add(sprite);
      view.crewSprites.push(sprite);
    }
  }
  return true;
}

export function updateArtilleryVisual(view, { x = 0, y = 0, facing = 0, scale = 1, groundCompression = 1, recoil = 0, limbered = false, moving = false, abandoned = false, alpha = 1, depth = y * 10 + 2, time = 0, reducedMotion = false, visible = true, crewTexture = view.crewTexture, crewScale = view.crewScale, crewAction = moving ? 'walk' : 'idle' } = {}) {
  for (const [name, value] of Object.entries({ alpha, depth, time, crewScale })) finite(value, name);
  if (crewScale < 0) throw new RangeError('crewScale must be nonnegative');
  if (view.lastPosition && time > view.lastPosition.time && moving && !reducedMotion) view.wheelRotation = (view.wheelRotation || 0) + Math.hypot(x - view.lastPosition.x, y - view.lastPosition.y) / Math.max(1, 10.5 * scale);
  view.lastPosition = { x, y, time };
  const wheelRotation = reducedMotion ? 0 : (view.wheelRotation || 0);
  const geometry = artilleryGeometry({ x, y, facing, scale, groundCompression, wheelRotation, recoil: reducedMotion ? 0 : recoil, limbered });
  const local = artilleryGeometry({ facing, scale, groundCompression, wheelRotation, recoil: reducedMotion ? 0 : recoil, limbered });
  const { container, parts } = view;
  const useCrewSprites = ensureCrewSprites(view, crewTexture);
  container.setPosition(x, y).setDepth(depth).setAlpha(clamp(alpha, 0, 1)).setVisible(Boolean(visible) && scale > 0 && alpha > 0);
  for (const g of Object.values(parts)) g.clear().setVisible(true).setPosition(0, 0);
  const s = scale;
  const w = Math.max(0.65, s);
  parts.shadow.setDepth(-1000);
  parts.shadow.fillStyle(COLORS.shadow, 0.13).fillPoints(local.shadow, true);
  parts.shadow.fillStyle(COLORS.shadow, 0.22).fillEllipse(local.gunGround.x + 2 * s, local.gunGround.y + 2 * s, 38 * s, 12 * s);
  for (const wheel of [...local.wheels, ...(local.limber?.wheels || [])]) parts.shadow.fillStyle(COLORS.shadow, 0.25).fillEllipse(wheel.ground.x, wheel.ground.y + s, 8 * s, 3.2 * s);
  parts.trail.setDepth(local.trailRing.y - 0.1);
  polygon(parts.trail, local.trail, COLORS.wood, COLORS.iron, w);
  line(parts.trail, local.trailHighlight, COLORS.woodLight, 1.6 * w);
  for (let grain = 1; grain < 5; grain++) {
    const f = grain / 5;
    const lerp = (a, b) => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
    line(parts.trail, [lerp(local.trail[0], local.trail[1]), lerp(local.trail[3], local.trail[2])], grain % 2 ? COLORS.woodDark : COLORS.woodLight, .35 * w);
  }
  for (const point of local.cheeks[0]) parts.body.fillStyle(COLORS.iron, 1).fillCircle(point.x, point.y, .9 * s);
  parts.trail.lineStyle(1.4 * w, COLORS.ironLight, 1).strokeCircle(local.trailRing.x, local.trailRing.y, 2.2 * s);
  parts.body.setDepth(local.gunGround.y);
  line(parts.body, local.axle, COLORS.iron, 4 * w);
  polygon(parts.body, local.cheeks[1], COLORS.woodDark, COLORS.iron, w);
  polygon(parts.body, local.cheeks[0], COLORS.woodLight, COLORS.woodDark, w);
  parts.barrel.setDepth(local.gunGround.y + 0.2);
  polygon(parts.barrel, local.barrel, abandoned ? 0x7e765d : COLORS.bronze, COLORS.bronzeDark, w);
  line(parts.barrel, local.barrelShade, abandoned ? 0x696650 : COLORS.bronzeDark, 2.1 * w);
  line(parts.barrel, local.barrelHighlight, abandoned ? 0x9a967a : COLORS.bronzeLight, 1.7 * w);
  parts.barrel.lineStyle(1.2 * w, COLORS.bronzeLight, 1).strokePoints(local.barrelBand, true);
  polygon(parts.barrel, local.muzzleRing, COLORS.bronzeDark, COLORS.bronzeLight, 0.7 * w);
  polygon(parts.barrel, local.muzzleBore, 0x292a22, 0x292a22, 0);
  parts.barrel.fillStyle(COLORS.bronzeDark, 1).fillCircle(local.cascabel.x, local.cascabel.y, 2.6 * s);
  local.wheels.forEach((wheel, index) => {
    parts[`wheel${index}`].setDepth(wheel.ground.y + 0.4);
    paintWheel(parts[`wheel${index}`], wheel, s);
  });
  parts.limber.setVisible(limbered);
  parts.limberWheel0.setVisible(limbered);
  parts.limberWheel1.setVisible(limbered);
  if (local.limber) {
    const limber = local.limber;
    parts.limber.setDepth(limber.ground.y);
    line(parts.limber, limber.axle, COLORS.iron, 3 * w);
    line(parts.limber, limber.pole, COLORS.woodLight, 3 * w);
    polygon(parts.limber, limber.chestSide, COLORS.woodDark, COLORS.iron, w);
    polygon(parts.limber, limber.chestFront, COLORS.wood, COLORS.iron, w);
    polygon(parts.limber, limber.chestTop, COLORS.woodLight, COLORS.iron, w);
    for (const strap of limber.chestStraps) line(parts.limber, strap, COLORS.iron, 1.5 * w);
    limber.wheels.forEach((wheel, index) => {
      parts[`limberWheel${index}`].setDepth(wheel.ground.y + 0.4);
      paintWheel(parts[`limberWheel${index}`], wheel, s);
    });
  }
  for (const crew of local.crew) {
    const graphic = parts[`crew${crew.index}`];
    graphic.setPosition(crew.x, crew.y).setDepth(crew.y + 0.6).setVisible(!abandoned && !useCrewSprites);
    if (!abandoned && !useCrewSprites) paintCrew(graphic, view.side, crew.index, s, crew.orientation, !reducedMotion && moving ? time * 7 + crew.index * 2 : 0, !limbered && !moving);
    const sprite = view.crewSprites[crew.index];
    if (sprite) {
      sprite.setVisible(!abandoned && useCrewSprites);
      if (useCrewSprites && !abandoned) {
        const bearing = moving || limbered ? facing : Math.atan2(local.gunGround.y - crew.y, local.gunGround.x - crew.x);
        const action = ['idle', 'walk', 'reload'].includes(crewAction) ? crewAction : 'idle';
        const frame = reducedMotion || action === 'idle' ? 0 : Math.floor(Math.max(0, time) * 6 + crew.index) % 4;
        if (view.realisticCrew) {
          const working = action === 'reload' && !limbered && !moving && (reducedMotion || Math.sin(time * 3 + crew.index * 2) > -.25);
          const direction = directionIndex(bearing);
          const detail = view.detailedCrew ? detailedCrewFrame(direction, working) : null;
          sprite.setTexture(crewTexture, detail ? detail.frame : `${working ? 1 : 0}-${direction === 4 ? 0 : direction === 7 ? 5 : direction}`);
          const poseScale = (view.detailedCrew ? 58 : 62) * s / (sprite.frame.customData?.bodyHeight || sprite.frame.realHeight);
          sprite.setOrigin(sprite.frame.pivotX, sprite.frame.pivotY).setScale(poseScale * (0.96 + crew.index * .025));
          const sway = reducedMotion ? 0 : Math.sin(time * (moving ? 6 : 1.3) + crew.index * 2.4);
          sprite.setPosition(crew.x, crew.y - (moving ? Math.abs(sway) * .7 * s : 0)).setAngle(sway * (moving ? 1.2 : .3));
          parts.shadow.fillStyle(COLORS.shadow, .20).fillEllipse(crew.x + 2 * s, crew.y + s, 13 * s, 4 * s);
        } else {
          sprite.setTexture(crewTexture, `${action}-${directionIndex(bearing)}-${frame}`)
            .setPosition(crew.x, crew.y).setOrigin(0.5, 0.8).setScale(crewScale * s).setAngle(0);
        }
        sprite.setFlipX(view.detailedCrew ? detailedCrewFrame(directionIndex(bearing), false).flip : view.realisticCrew && [4, 7].includes(directionIndex(bearing))).setDepth(crew.y + 0.6);
      }
    }
  }
  container.sort('depth');
  view.geometry = geometry;
  return geometry;
}
