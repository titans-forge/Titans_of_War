import { detailedCrewFrame } from './detailedUnitVisual.js';
// Original game artwork: ground-plane cannon geometry, upright crew, and a
// travelling limber. The drawing never feeds positions back into combat.
import { directionIndex } from './formationMath.js';
import { GETTYSBURG_RULES } from './gettysburgMechanics.js';

const TAU = Math.PI * 2;
const COLORS = Object.freeze({
  iron: 0x242824, ironLight: 0x727568, wood: 0x645e44, woodLight: 0x89826a, woodDark: 0x3e422e,
  paintedWood: 0x666e53, shadedPaint: 0x404b38, paintEdge: 0x8d9277,
  bronze: 0x847050, bronzeLight: 0xb0a07d, bronzeDark: 0x514632, shadow: 0x18221a,
});
const BRONZE_TONES = [0x544938, 0x65573d, 0x796749, 0x8c7955, 0x9f8b66, 0xae9e77];
const TARNISHED_BRONZE = [0x515549, 0x5a5b4c, 0x65634f, 0x70705d, 0x7c7b65, 0x868270];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

// Read the field clock and combat timers. Pause and cold resume land on the
// same work phase, without starting a second animation clock.
export function gettysburgBatteryMotion({ gunState, gunTimer, lastVolleyAt, reload, gunsAbandoned }, time, reducedMotion = false) {
  const packing = gunState === 'limbering';
  const deploying = gunState === 'unlimbering';
  const timer = Number.isFinite(gunTimer) ? gunTimer : 0;
  const progress = packing ? 1 - timer / GETTYSBURG_RULES.limberTime
    : deploying ? timer / GETTYSBURG_RULES.unlimberTime : Number(gunState === 'limbered');
  const blend = clamp(progress, 0, 1);
  const limberBlend = reducedMotion ? Number(deploying || gunState === 'limbered') : blend * blend * (3 - 2 * blend);
  const age = time - lastVolleyAt;
  const activeReload = gunState === 'deployed' && !gunsAbandoned && reload > 0 && lastVolleyAt >= 0 && Number.isFinite(age) && age >= .6;
  const loadProgress = activeReload ? clamp((age - .6) / (age - .6 + reload), 0, 1) : -1;
  // Three visual roles take turns around the piece. No synchronized bobbing
  // through the whole reload, and boots remain planted during recoil.
  let workingCrew = -1;
  if ((packing || deploying) && (reducedMotion || blend < .75)) workingCrew = 1;
  else if (loadProgress >= 0 && loadProgress < .86) {
    workingCrew = reducedMotion ? 1 : loadProgress < .34 ? 2 : loadProgress < .67 ? 1 : 0;
  }
  return { limberBlend, workingCrew };
}

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
export function artilleryGeometry({ x = 0, y = 0, facing = 0, scale = 1, groundCompression = 1, recoil = 0, limbered = false, wheelRotation = 0, limberBlend = Number(limbered) } = {}) {
  for (const [name, value] of Object.entries({ x, y, facing, scale, groundCompression, recoil, wheelRotation, limberBlend })) finite(value, name);
  if (scale < 0 || groundCompression <= 0) throw new RangeError('scale must be nonnegative and groundCompression positive');
  const blend = clamp(limberBlend, 0, 1);
  const kick = blend ? 0 : clamp(recoil, 0, 1) * 3;
  const cos = Math.cos(facing), sin = Math.sin(facing);
  const project = (forward, lateral = 0, height = 0) => ({
    x: x + (cos * forward - sin * lateral) * scale,
    y: y + (sin * forward + cos * lateral) * scale * groundCompression - height * scale,
  });
  const turnCos = Math.cos(blend * Math.PI), turnSin = Math.sin(blend * Math.PI);
  const gun = (forward, lateral = 0, height = 0) => {
    if (blend === 0) return project(forward - kick, lateral, height);
    if (blend === 1) return project(-10 - forward, -lateral, height);
    return project(forward * turnCos - lateral * turnSin - 10 * blend, forward * turnSin + lateral * turnCos, height);
  };
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
  const muzzleForward = 26 - 2 * blend;
  const muzzleHeight = 18 - 3 * blend;
  const breechRing = ring(-10, 4.4, 15);
  const muzzleRing = ring(muzzleForward, 3.1, muzzleHeight);
  const equipmentHeading = facing + blend * Math.PI;
  const barrelStrips = [];
  for (let i = 0; i < breechRing.length; i++) {
    const angle = (i + .5) * TAU / breechRing.length;
    // The camera sees the upper surface and the side nearest screen bottom.
    // Light from the upper left picks out a muted highlight on the tube.
    const lateral = Math.cos(angle), top = Math.sin(angle);
    if (lateral * Math.cos(equipmentHeading) + top * groundCompression <= 0) continue;
    const index = (i + 1) % breechRing.length;
    const light = clamp(Math.round(2.4 + 2.4 * top + 1.6 * lateral * Math.sin(equipmentHeading)), 0, 5);
    barrelStrips.push({ points: [breechRing[i], muzzleRing[i], muzzleRing[index], breechRing[index]], light });
  }
  // The rear figure goes around the outside of the turning carriage.
  const crewSlots = [[-17 + 4 * blend, -23 - blend], [8 + 3 * blend, 23], [-33 + 61 * blend, 14 - 35 * blend + 20 * turnSin]];
  const geometry = {
    origin: { x, y }, scale, facing, groundCompression, limbered: Boolean(limbered),
    gunGround: gun(0),
    muzzle: gun(muzzleForward, 0, muzzleHeight),
    muzzleGround: gun(muzzleForward),
    breech: gun(-10, 0, 15),
    barrel: hull([...breechRing, ...muzzleRing]), barrelStrips, muzzleRing,
    noseVisible: Math.sin(equipmentHeading) > 0.03,
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
    footprint: corners(29 + 7 * blend, -36 + 2 * blend, 17 - blend, 0, project),
    shadow: Array.from({ length: 28 }, (_, index) => {
      const angle = index * TAU / 28;
      return project(-5 + 5 * blend + Math.cos(angle) * (29 + 6 * blend), Math.sin(angle) * 13);
    }),
  };
  if (blend > 0) {
    const cart = (forward, lateral = 0, height = 0) => project(forward + 9 * (1 - blend), lateral - 10 * (1 - blend), height);
    geometry.limber = {
      ground: cart(24),
      wheels: [wheel(24, -13, 9, cart), wheel(24, 13, 9, cart)],
      axle: [cart(24, -15, 9), cart(24, 15, 9)],
      chestTop: corners(29, 17, 9, 18, cart),
      chestFront: [cart(29, -9, 18), cart(29, 9, 18), cart(29, 9, 10), cart(29, -9, 10)],
      chestSide: [cart(17, -9, 18), cart(29, -9, 18), cart(29, -9, 10), cart(17, -9, 10)],
      chestBack: [cart(17, -9, 18), cart(17, 9, 18), cart(17, 9, 10), cart(17, -9, 10)],
      chestFarSide: [cart(17, 9, 18), cart(29, 9, 18), cart(29, 9, 10), cart(17, 9, 10)],
      chestStraps: [[cart(27, -9, 18.4), cart(27, 9, 18.4)], [cart(19, -9, 18.4), cart(19, 9, 18.4)]],
      pole: [cart(29, 0, 7), cart(36, 0, 4)],
    };
  }
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
  g.lineStyle(4.9 * width, COLORS.iron, 1).strokePoints(wheel.rim, true);
  g.lineStyle(2.9 * width, COLORS.wood, 1).strokePoints(wheel.rim, true);
  g.lineStyle(1.05 * width, COLORS.woodLight, .85)
    .strokePoints(wheel.rim.slice(wheel.rim.length / 2), false);
  for (const end of wheel.spokes) {
    line(g, [wheel.hub, end], COLORS.woodDark, 2.5 * width);
    line(g, [wheel.hub, end], COLORS.wood, 1.5 * width);
    line(g, [{ x: wheel.hub.x - .45 * scale, y: wheel.hub.y - .38 * scale }, { x: end.x - .45 * scale, y: end.y - .38 * scale }], COLORS.woodLight, .65 * width);
  }
  // Iron tyre joints and worn edges remain attached to the revolving wheel.
  for (const end of wheel.spokes.filter((_, i) => i % 2 === 0)) g.fillStyle(COLORS.ironLight, 1).fillCircle(end.x, end.y, .65 * scale);
  g.fillStyle(COLORS.woodDark, 1).fillCircle(wheel.hub.x, wheel.hub.y, 3.65 * scale);
  g.fillStyle(COLORS.iron, 1).fillCircle(wheel.hub.x, wheel.hub.y, 2.55 * scale);
  g.fillStyle(COLORS.ironLight, 1).fillCircle(wheel.hub.x - scale * 0.6, wheel.hub.y - scale * 0.6, 1.2 * scale);
}

function paintBarrel(g, local, abandoned, scale) {
  const width = Math.max(.65, scale);
  const tones = abandoned ? TARNISHED_BRONZE : BRONZE_TONES;
  polygon(g, local.barrel, abandoned ? 0x6f6b5a : COLORS.bronze, COLORS.bronzeDark, .72 * width);
  for (const { points, light } of local.barrelStrips) polygon(g, points, tones[light], 0, 0);
  line(g, local.barrelShade, abandoned ? 0x575b50 : COLORS.bronzeDark, .74 * width);
  line(g, local.barrelHighlight, abandoned ? 0x878878 : COLORS.bronzeLight, .65 * width);
  g.lineStyle(1.18 * width, COLORS.bronzeDark, 1).strokePoints(local.barrelBand, true);
  g.lineStyle(.47 * width, COLORS.bronzeLight, .82).strokePoints(local.barrelBand.slice(1, 9), false);
  if (local.noseVisible) {
    polygon(g, local.muzzleRing, abandoned ? 0x6f6b5a : COLORS.bronze, COLORS.bronzeLight, .62 * width);
    polygon(g, local.muzzleBore, 0x222520, 0, 0);
  }
  g.fillStyle(COLORS.bronzeDark, 1).fillCircle(local.cascabel.x, local.cascabel.y, 2.6 * scale);
  g.fillStyle(tones[4], 1).fillCircle(local.cascabel.x - .55 * scale, local.cascabel.y - .5 * scale, 1.4 * scale);
}

function paintCarriage(parts, local, scale) {
  const width = Math.max(.65, scale);
  const { trail, body } = parts;
  trail.setDepth(local.trailRing.y - .1);
  const underside = local.trail.map(({ x, y }, index) => ({ x, y: y + (index > 1 ? .8 : 2.5) * scale }));
  polygon(trail, underside, COLORS.shadedPaint, COLORS.iron, .74 * width);
  polygon(trail, local.trail, COLORS.paintedWood, COLORS.woodDark, .65 * width);
  line(trail, local.trailHighlight, COLORS.paintEdge, .88 * width);
  for (let grain = 1; grain < 5; grain++) {
    const f = grain / 5;
    line(trail, [lerp(local.trail[0], local.trail[1], f), lerp(local.trail[3], local.trail[2], f)],
      grain % 2 ? COLORS.shadedPaint : COLORS.paintEdge, .44 * width);
  }
  trail.lineStyle(1.4 * width, COLORS.ironLight, 1).strokeCircle(local.trailRing.x, local.trailRing.y, 2.2 * scale);
  body.setDepth(local.gunGround.y);
  line(body, local.axle, COLORS.iron, 4 * width);
  line(body, local.axle.map(({ x, y }) => ({ x, y: y - .75 * scale })), COLORS.ironLight, 1.05 * width);
  const [top, bottom] = local.cheeks;
  polygon(body, bottom, COLORS.woodDark, COLORS.iron, width);
  polygon(body, [top[0], top[3], bottom[3], bottom[0]], COLORS.shadedPaint, COLORS.iron, .64 * width);
  polygon(body, [top[1], top[2], bottom[2], bottom[1]], COLORS.shadedPaint, COLORS.iron, .64 * width);
  polygon(body, top, COLORS.paintedWood, COLORS.woodDark, .64 * width);
  line(body, [top[0], top[3]], COLORS.paintEdge, .82 * width);
  for (const point of top) body.fillStyle(COLORS.iron, 1).fillCircle(point.x, point.y, .9 * scale);
}

function paintLimber(g, local, scale) {
  const width = Math.max(.65, scale);
  const { limber } = local;
  g.setDepth(limber.ground.y);
  line(g, limber.axle, COLORS.iron, 3.55 * width);
  line(g, limber.pole, COLORS.woodDark, 3.3 * width);
  line(g, limber.pole.map(({ x, y }) => ({ x, y: y - .65 * scale })), COLORS.woodLight, .96 * width);
  const nearEnd = Math.sin(local.facing) >= 0 ? limber.chestFront : limber.chestBack;
  const nearSide = Math.cos(local.facing) >= 0 ? limber.chestFarSide : limber.chestSide;
  polygon(g, nearSide, COLORS.shadedPaint, COLORS.iron, .68 * width);
  polygon(g, nearEnd, COLORS.paintedWood, COLORS.iron, .68 * width);
  polygon(g, limber.chestTop, COLORS.woodDark, COLORS.iron, .72 * width);
  line(g, [limber.chestTop[0], limber.chestTop[3]], COLORS.paintEdge, .82 * width);
  line(g, [lerp(nearSide[0], nearSide[3], .25), lerp(nearSide[1], nearSide[2], .25)], COLORS.paintEdge, .57 * width);
  for (const strap of limber.chestStraps) {
    line(g, strap, COLORS.iron, 2.2 * width);
    line(g, strap.map(({ x, y }) => ({ x: x - .25 * scale, y })), COLORS.ironLight, .72 * width);
  }
  const chestFastener = lerp(lerp(nearSide[0], nearSide[1], .55), lerp(nearSide[3], nearSide[2], .55), .46);
  g.fillStyle(COLORS.iron, 1).fillCircle(chestFastener.x, chestFastener.y, 1.42 * scale);
  g.fillStyle(COLORS.ironLight, 1).fillCircle(chestFastener.x - .25 * scale, chestFastener.y - .42 * scale, .66 * scale);
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

export function updateArtilleryVisual(view, { x = 0, y = 0, facing = 0, scale = 1, groundCompression = 1, recoil = 0, limbered = false, moving = false, abandoned = false, alpha = 1, depth = y * 10 + 2, time = 0, reducedMotion = false, visible = true, crewTexture = view.crewTexture, crewScale = view.crewScale, crewAction = moving ? 'walk' : 'idle', limberBlend = Number(limbered), workingCrew = null } = {}) {
  for (const [name, value] of Object.entries({ alpha, depth, time, crewScale })) finite(value, name);
  if (crewScale < 0) throw new RangeError('crewScale must be nonnegative');
  if (view.lastPosition && time > view.lastPosition.time && moving && !reducedMotion) view.wheelRotation = (view.wheelRotation || 0) + Math.hypot(x - view.lastPosition.x, y - view.lastPosition.y) / Math.max(1, 10.5 * scale);
  view.lastPosition = { x, y, time };
  const wheelRotation = reducedMotion ? 0 : (view.wheelRotation || 0);
  const geometry = artilleryGeometry({ x, y, facing, scale, groundCompression, wheelRotation, recoil: reducedMotion ? 0 : recoil, limbered, limberBlend });
  const local = artilleryGeometry({ facing, scale, groundCompression, wheelRotation, recoil: reducedMotion ? 0 : recoil, limbered, limberBlend });
  const { container, parts } = view;
  const useCrewSprites = ensureCrewSprites(view, crewTexture);
  container.setPosition(x, y).setDepth(depth).setAlpha(clamp(alpha, 0, 1)).setVisible(Boolean(visible) && scale > 0 && alpha > 0);
  for (const g of Object.values(parts)) g.clear().setVisible(true).setPosition(0, 0);
  const s = scale;
  parts.shadow.setDepth(-1000);
  parts.shadow.fillStyle(COLORS.shadow, 0.13).fillPoints(local.shadow, true);
  parts.shadow.fillStyle(COLORS.shadow, 0.22).fillEllipse(local.gunGround.x + 2 * s, local.gunGround.y + 2 * s, 38 * s, 12 * s);
  for (const wheel of local.wheels) parts.shadow.fillStyle(COLORS.shadow, 0.25).fillEllipse(wheel.ground.x, wheel.ground.y + s, 8 * s, 3.2 * s);
  const cartAlpha = clamp(limberBlend * 3, 0, 1);
  for (const wheel of local.limber?.wheels || []) parts.shadow.fillStyle(COLORS.shadow, 0.25 * cartAlpha).fillEllipse(wheel.ground.x, wheel.ground.y + s, 8 * s, 3.2 * s);
  paintCarriage(parts, local, s);
  parts.barrel.setDepth(local.gunGround.y + 0.2);
  paintBarrel(parts.barrel, local, abandoned, s);
  local.wheels.forEach((wheel, index) => {
    parts[`wheel${index}`].setDepth(wheel.ground.y + 0.4);
    paintWheel(parts[`wheel${index}`], wheel, s);
  });
  for (const part of [parts.limber, parts.limberWheel0, parts.limberWheel1]) part.setVisible(Boolean(local.limber)).setAlpha(cartAlpha);
  if (local.limber) {
    const limber = local.limber;
    paintLimber(parts.limber, local, s);
    limber.wheels.forEach((wheel, index) => {
      parts[`limberWheel${index}`].setDepth(wheel.ground.y + 0.4);
      paintWheel(parts[`limberWheel${index}`], wheel, s);
    });
  }
  for (const crew of local.crew) {
    const graphic = parts[`crew${crew.index}`];
    graphic.setPosition(crew.x, crew.y).setDepth(crew.y + 0.6).setVisible(!abandoned && !useCrewSprites);
    const atWork = workingCrew === crew.index;
    if (!abandoned && !useCrewSprites) paintCrew(graphic, view.side, crew.index, s, crew.orientation, !reducedMotion && moving ? time * 7 + crew.index * 2 : 0, workingCrew === null ? !limbered && !moving : atWork);
    const sprite = view.crewSprites[crew.index];
    if (sprite) {
      sprite.setVisible(!abandoned && useCrewSprites);
      if (useCrewSprites && !abandoned) {
        const bearing = moving || limbered ? facing : Math.atan2(local.gunGround.y - crew.y, local.gunGround.x - crew.x);
        const action = ['idle', 'walk', 'reload'].includes(crewAction) ? crewAction : 'idle';
        const frame = reducedMotion || action === 'idle' ? 0 : Math.floor(Math.max(0, time) * 6 + crew.index) % 4;
        if (view.realisticCrew) {
          const working = workingCrew === null
            ? action === 'reload' && !limbered && !moving && (reducedMotion || Math.sin(time * 3 + crew.index * 2) > -.25)
            : atWork;
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
