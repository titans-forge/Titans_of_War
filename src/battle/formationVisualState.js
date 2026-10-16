import { approachAngle, casualtyOrder, deterministicUnitValue, directionIndex, formationFootprint, generateFormationSlots, projectedFormationSlot, visibleFigureCount } from './formationMath.js';
import { isVisuallyRouting } from './battleTactics.js';

// Gettysburg supplies its physical footprint. Fit feet inside that same ground
// plane; artwork size must never change the distance between formations.
function fittedSlots(formation, count, frontage = formation.frontage) {
  const slots = generateFormationSlots(formation.id, formation.formationMode, count, frontage, 1);
  if (!formation.footprint || !slots.length) return slots;
  const lateralMin = Math.min(...slots.map(slot => slot.lateral));
  const lateralMax = Math.max(...slots.map(slot => slot.lateral));
  const forwardMin = Math.min(...slots.map(slot => slot.forward));
  const forwardMax = Math.max(...slots.map(slot => slot.forward));
  const lateral = Math.max(1, (lateralMax - lateralMin) / 2);
  const forward = Math.max(1, (forwardMax - forwardMin) / 2);
  return slots.map(slot => ({ ...slot,
    lateral: (slot.lateral - (lateralMax + lateralMin) / 2) / lateral * Math.max(0, formation.footprint.width / 2 - 8),
    forward: (slot.forward - (forwardMax + forwardMin) / 2) / forward * Math.max(0, formation.footprint.depth / 2 - 6),
  }));
}

function groundSlot(formation, facing, slot, scale) {
  return formation.footprint
    ? projectedFormationSlot(formation, facing, slot, 1, 1)
    : projectedFormationSlot(formation, facing, slot, scale);
}

function physicalFootprint(formation, facing) {
  const { width, depth } = formation.footprint;
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) =>
    groundSlot(formation, facing, { lateral: x * width / 2, forward: y * depth / 2 }, 1));
}

export function createFormationVisual(formation, capacity, time = 0) {
  const slots = fittedSlots(formation, capacity);
  const count = visibleFigureCount(formation.strength, formation.initialStrength, capacity);
  const absent = new Set(casualtyOrder(slots, formation.id).slice(0, capacity - count));
  return {
    capacity, time, x: formation.x, y: formation.y, facing: formation.facing, distance: 0, turnDistance: 0, assembling: false,
    mode: formation.formationMode, lastContact: time, lastLoss: -Infinity, routingDistance: 0,
    figures: slots.map((slot, id) => ({ id, slot, alive: !absent.has(id), fallen: null, stepDistance: 0 })),
  };
}

// Visual state follows simulation time and measured displacement, never browser time.
// It does not write to a formation or feed any geometry back into combat.
export function updateFormationVisual(state, formation, time, scale, { reducedMotion = false, resolving = false } = {}) {
  const dt = Math.max(0, time - state.time);
  const distance = Math.hypot(formation.x - state.x, formation.y - state.y);
  if (dt === 0 && distance === 0 && state.mode === formation.formationMode && state.lastStatus === formation.status && state.lastPresentationStatus === formation.presentationStatus && state.lastStrength === formation.strength && state.lastScale === scale && state.lastResolving === resolving && state.lastReducedMotion === reducedMotion && state.lastFacing === formation.facing && state.lastReload === formation.reload && state.lastVolley === formation.lastVolleyAt && state.lastMelee === formation.inMelee && state.lastContactFacing === formation.contactFacing && state.output) return state.output;
  const facingChange = Math.atan2(Math.sin(formation.facing - state.facing), Math.cos(formation.facing - state.facing));
  // A restored paused frame rebuilds its last pose from primitive motion facts,
  // not cached sprites/output, without adding travel or advancing animation.
  const restoringFrame = state.restoreFrame === true && dt === 0 && distance === 0
    && state.mode === formation.formationMode && state.lastMotion?.reducedMotion === reducedMotion
    && state.lastMotion?.resolving === resolving;
  const turning = restoringFrame ? state.lastMotion.turning : Boolean(formation.footprint) && dt > 0 && Math.abs(facingChange) > .001;
  state.turnDistance += turning ? Math.abs(facingChange) * Math.max(12, formation.footprint.width / 4) : 0;
  const moving = restoringFrame ? state.lastMotion.moving : dt > 0 && distance > 0.001;
  const engaged = !resolving && (Boolean(formation.engagedWith) || formation.status === 'firing');
  if (engaged) state.lastContact = time;
  state.distance += distance;
  state.routingDistance = isVisuallyRouting(formation) ? (state.lastStatus === 'routing' ? state.routingDistance : 0) + distance : 0;
  // A fallback is a fighting withdrawal: feet move rearward while the front
  // continues to face the enemy, exactly as the firing arc does.
  const targetFacing = formation.footprint ? formation.facing : restoringFrame ? state.facing : moving ? Math.atan2(formation.y - state.y, formation.x - state.x) : formation.facing;
  state.facing = formation.footprint || reducedMotion ? targetFacing : approachAngle(state.facing, targetFacing, dt * 2.6);
  const alive = state.figures.filter((figure) => figure.alive);
  const count = visibleFigureCount(formation.strength, formation.initialStrength, state.capacity);
  const losses = Math.max(0, alive.length - count);
  for (const position of casualtyOrder(alive.map((figure) => figure.slot), formation.id).slice(0, losses)) {
    const figure = alive[position];
    const point = groundSlot(formation, state.facing, figure.slot, scale);
    figure.alive = false;
    figure.fallen = { ...point, time, facing: state.facing, scale };
    state.lastLoss = time;
  }
  const remaining = state.figures.filter((figure) => figure.alive);
  const reforming = state.mode !== formation.formationMode;
  if (reforming && formation.footprint) state.assembling = true;
  if (reforming || state.assembling || (!engaged && (moving || time - state.lastContact > 2) && time - state.lastLoss > 1.1)) {
    const ratio = remaining.length / state.capacity;
    const frontage = formation.frontage * (formation.formationMode === 'column' ? 1 : Math.sqrt(ratio));
    const targets = fittedSlots(formation, remaining.length, frontage);
    remaining.forEach((figure, index) => {
      const target = targets[index];
      const blend = reducedMotion || (reforming && !formation.footprint) ? 1 : 1 - Math.exp(-dt * (state.assembling ? 2.4 : 4));
      const before = figure.slot;
      const lateral = before.lateral + (target.lateral - before.lateral) * blend;
      const forward = before.forward + (target.forward - before.forward) * blend;
      // The simulation changes footprint when the order arrives. Keep the
      // re-forming feet inside that footprint while ranks close their gaps.
      const nextLateral = formation.footprint ? Math.max(-formation.footprint.width / 2 + 8, Math.min(formation.footprint.width / 2 - 8, lateral)) : lateral;
      const nextForward = formation.footprint ? Math.max(-formation.footprint.depth / 2 + 6, Math.min(formation.footprint.depth / 2 - 6, forward)) : forward;
      if (!restoringFrame) figure.localMoving = Boolean(formation.footprint) && dt > 0 && Math.hypot(nextLateral - before.lateral, nextForward - before.forward) > .015;
      figure.stepDistance += dt > 0 ? Math.hypot(nextLateral - before.lateral, nextForward - before.forward) : 0;
      figure.slot = { ...target, lateral: nextLateral, forward: nextForward };
    });
    state.assembling = Boolean(formation.footprint) && remaining.some((figure, i) => Math.hypot(figure.slot.lateral - targets[i].lateral, figure.slot.forward - targets[i].forward) > .05);
  } else if (!restoringFrame) remaining.forEach(figure => { figure.localMoving = false; });
  const direction = directionIndex(state.facing);
  const volleyAge = time - formation.lastVolleyAt;
  const contactFacing = Number.isFinite(formation.contactFacing) ? formation.contactFacing : state.facing;
  const contactRanks = new Set(formation.inMelee && Number.isFinite(formation.contactFacing) ? remaining.map(figure => {
    const p = groundSlot(formation, state.facing, figure.slot, scale);
    return { id:figure.id, toward:(p.x-formation.x)*Math.cos(contactFacing)+(p.y-formation.y)*Math.sin(contactFacing) };
  }).sort((a,b)=>b.toward-a.toward || a.id-b.id).slice(0,Math.max(1,Math.ceil(remaining.length/4))).map(f=>f.id) : []);
  const figures = state.figures.map((figure) => {
    if (!figure.alive) {
      const fall = figure.fallen;
      if (!fall || time - fall.time > 3.2) return { id: figure.id, visible: false };
      const age = time - fall.time;
      return { id: figure.id, visible: true, ...fall, direction: directionIndex(fall.facing), action: 'fall', frame: reducedMotion ? 3 : Math.min(3, Math.floor(age * 6)), alpha: Math.min(1, (3.2 - age) / 1.1), fallen: true };
    }
    // Broken survivors are off the active field, not additional casualties.
    // Resolution may bring their retreat back into view with the same identities.
    if (formation.status === 'broken') return { id: figure.id, visible: false };
    const slot = figure.slot;
    const point = groundSlot(formation, state.facing, slot, scale);
    const routing = isVisuallyRouting(formation);
    const spread = routing ? Math.min(1, state.routingDistance / 45) * scale : 0;
    point.x += (deterministicUnitValue(formation.id, figure.id, 47) - 0.5) * 38 * spread;
    point.y += (deterministicUnitValue(formation.id, figure.id, 49) - 0.5) * 22 * spread;
    let action = 'idle';
    let frame = 0;
    const gait = (state.distance + state.turnDistance + (figure.stepDistance || 0)) * (formation.footprint ? .94 + deterministicUnitValue(formation.id, figure.id, 149) * .12 : 1);
    const shootingAge = volleyAge - (formation.footprint ? deterministicUnitValue(formation.id, figure.id, 123) * .09 : 0);
    const stepping = moving || turning || figure.localMoving;
    // Visible firing wins over gait for the front rank, including fallback fire.
    if (!resolving && !routing && formation.inMelee && (Number.isFinite(formation.contactFacing) ? contactRanks.has(figure.id) : slot.frontRank)) {
      action = 'melee'; frame = Math.floor(time * 5 + deterministicUnitValue(formation.id, figure.id, 131) * 4) % 4;
    } else if (!resolving && !routing && slot.frontRank && shootingAge >= 0 && shootingAge < .5) {
      action = 'fire'; frame = Math.min(3, Math.floor(shootingAge * 8));
    } else if (stepping) {
      action = routing ? 'route' : 'walk';
      frame = Math.floor(gait / 5 + deterministicUnitValue(formation.id, figure.id, 101) * 4) % 4;
    } else if (!resolving && slot.frontRank && formation.reload > 0 && (formation.engagedWith || (formation.footprint && Number.isFinite(formation.lastVolleyAt)))) {
      action = 'reload';
      frame = Math.floor(Math.max(0, volleyAge - .5) * 2) % 4;
    } else if (formation.footprint && !resolving) frame = Math.floor(time * .6 + deterministicUnitValue(formation.id, figure.id, 107) * 4) % 4;
    const phase = gait / 5 * Math.PI / 2 + deterministicUnitValue(formation.id, figure.id, 101) * Math.PI * 2;
    const enabled = !reducedMotion && !resolving;
    const energy = 1 - Math.min(.5, (formation.fatigue || 0) / 180);
    const lift = enabled && stepping ? Math.abs(Math.sin(phase)) * (routing ? 1.5 : .85) * energy * scale : 0;
    const recoil = enabled && action === 'fire' ? Math.max(0, 1 - Math.abs(shootingAge - .16) / .16) * 1.4 * scale : 0;
    const lean = enabled && stepping && action !== 'fire' ? Math.sin(phase) * (routing ? 2.2 : .9) : 0;
    if (reducedMotion) frame = action === 'fire' ? 1 : 0;
    return { id: figure.id, visible: true, ...point, scale, direction: action === 'melee' ? directionIndex(contactFacing) : direction, action, frame, alpha: 1, bodyOffsetX: -Math.cos(state.facing) * recoil, bodyOffsetY: -lift - Math.sin(state.facing) * recoil * .5, lean, frontRank: slot.frontRank, fallen: false };
  });
  const ground = figures.filter((figure) => figure.visible && !figure.fallen);
  state.time = time; state.x = formation.x; state.y = formation.y; state.mode = formation.formationMode;
  state.lastStatus = formation.status; state.lastStrength = formation.strength;
  state.lastPresentationStatus = formation.presentationStatus;
  state.lastFacing = formation.facing; state.lastReload = formation.reload; state.lastVolley = formation.lastVolleyAt; state.lastMelee = formation.inMelee; state.lastContactFacing = formation.contactFacing;
  state.lastScale = scale; state.lastResolving = resolving; state.lastReducedMotion = reducedMotion;
  state.lastMotion = { moving, turning, reducedMotion, resolving };
  delete state.restoreFrame;
  state.output = { figures, footprint: formation.footprint && ground.length ? physicalFootprint(formation, state.facing) : formationFootprint(ground, 9 * scale), moving, facing: state.facing };
  return state.output;
}
