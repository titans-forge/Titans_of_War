import { overviewZoom, boundedZoom, canCommand } from './battleUsability.js';

// UI-owned choices: these never enter the engine checkpoint or issue an order.
const CONTEXT_ID = 'field-command-context-v44';
const plain = value => value !== null && typeof value === 'object'
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const data = (value, key) => plain(value) ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined;
const keys = (value, names) => plain(value) && Reflect.ownKeys(value).length === names.length
  && names.every(name => Object.hasOwn(Object.getOwnPropertyDescriptor(value, name) || {}, 'value'));
const positive = value => Number.isFinite(value) && value > 0 && value <= 1e6;
const timeValue = value => Number.isFinite(value) && value >= 0 && value <= 1e7;
const idValue = value => typeof value === 'string' && value.length > 0 && value.length <= 128;
const worldValid = value => keys(value, ['width', 'height']) && positive(value.width) && positive(value.height);
const cameraValid = value => keys(value, ['mode', 'zoom', 'center'])
  && ['overview', 'free'].includes(value.mode) && Number.isFinite(value.zoom) && value.zoom > 0 && value.zoom <= 64
  && keys(value.center, ['x', 'y']) && Number.isFinite(value.center.x) && Number.isFinite(value.center.y)
  && Math.abs(value.center.x) <= 1e6 && Math.abs(value.center.y) <= 1e6;

function checkpointTime(checkpoint, scenarioId) {
  const state = data(checkpoint, 'state'), time = data(state, 'time');
  const resolution = data(state, 'resolutionTime') ?? 0;
  return data(checkpoint, 'version') === 1 && data(state, 'scenarioId') === scenarioId
    && timeValue(time) && timeValue(resolution) && timeValue(time + resolution) ? time + resolution : null;
}

function eligibleSelection(checkpoint, selectedId) {
  if (!idValue(selectedId)) return null;
  const formations = data(data(checkpoint, 'state'), 'state');
  if (!Array.isArray(formations) || formations.length > 256) return null;
  const formation = formations.find(unit => data(unit, 'id') === selectedId);
  const unit = { active: data(formation, 'active'), side: data(formation, 'side'), status: data(formation, 'status') };
  return canCommand(unit) && unit.status !== 'surrendered' && data(formation, 'withdrawn') !== true ? selectedId : null;
}

/** Keep the requested world point visible safely after a viewport change. */
export function fitFieldViewContextCamera(camera, world, viewport) {
  try {
    if (!cameraValid(camera) || !worldValid(world) || !positive(viewport?.width) || !positive(viewport?.height)) return null;
    const minimum = overviewZoom(viewport, world);
    if (camera.mode === 'overview') return { mode: 'overview', zoom: minimum, center: { x: world.width / 2, y: world.height / 2 } };
    const zoom = boundedZoom(camera.zoom, 0, minimum);
    const clampCenter = (point, extent, pixels) => {
      const half = Math.min(extent / 2, pixels / (2 * zoom));
      return Math.max(half, Math.min(extent - half, point));
    };
    return { mode: 'free', zoom, center: {
      x: clampCenter(camera.center.x, world.width, viewport.width),
      y: clampCenter(camera.center.y, world.height, viewport.height),
    } };
  } catch { return null; }
}

/** Selection and camera may fall back independently; optional metadata never rejects combat. */
export function readFieldViewContext(checkpoint, world, scenarioId) {
  try {
    const time = checkpointTime(checkpoint, scenarioId), presentation = data(checkpoint, 'presentation');
    const context = data(presentation, 'fieldViewContext');
    if (time === null || !idValue(scenarioId) || !worldValid(world)
      || data(presentation, 'version') !== 1 || data(presentation, 'time') !== time
      || !keys(context, ['version', 'contextId', 'scenarioId', 'time', 'world', 'selectedId', 'camera'])
      || context.version !== 1 || context.contextId !== CONTEXT_ID || context.scenarioId !== scenarioId || context.time !== time
      || !worldValid(context.world) || context.world.width !== world.width || context.world.height !== world.height) return null;
    return { selectedId: eligibleSelection(checkpoint, context.selectedId),
      camera: cameraValid(context.camera) ? { mode: context.camera.mode, zoom: context.camera.zoom, center: { ...context.camera.center } } : null };
  } catch { return null; }
}

/** Capture current scroll, including a pan before Phaser's next render. */
export function createFieldViewContext(checkpoint, camera, mode, world, scenarioId, selectedId) {
  try {
    const time = checkpointTime(checkpoint, scenarioId);
    if (time === null || !idValue(scenarioId) || !worldValid(world)) return null;
    let framing = null;
    if (camera && positive(camera.width) && positive(camera.height)
      && Number.isFinite(camera.scrollX) && Number.isFinite(camera.scrollY)) {
      const scrollX = camera.useBounds && typeof camera.clampX === 'function' ? camera.clampX(camera.scrollX) : camera.scrollX;
      const scrollY = camera.useBounds && typeof camera.clampY === 'function' ? camera.clampY(camera.scrollY) : camera.scrollY;
      framing = fitFieldViewContextCamera({ mode: mode === 'overview' ? 'overview' : 'free', zoom: camera.zoom,
        center: { x: scrollX + camera.width / 2, y: scrollY + camera.height / 2 } }, world, camera);
    }
    return { version: 1, contextId: CONTEXT_ID, scenarioId, time, world: { ...world },
      selectedId: eligibleSelection(checkpoint, selectedId), camera: framing };
  } catch { return null; }
}

/** The React Save wrapper supplies a trusted plain Scene checkpoint. */
export function withFieldViewContext(checkpoint, camera, mode, world, scenarioId, selectedId) {
  const context = createFieldViewContext(checkpoint, camera, mode, world, scenarioId, selectedId);
  return context ? { ...checkpoint, presentation: { ...checkpoint.presentation, fieldViewContext: context } } : checkpoint;
}
