import { overviewZoom, boundedZoom } from './battleUsability.js';

// Optional display metadata. Camera framing never enters combat or selection.
const VERSION = 1;
const CONTINUITY_ID = 'field-view-continuity-v39';
const plain = value => value !== null && typeof value === 'object'
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const data = (value, key) => plain(value) ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined;
const keys = (value, names) => plain(value) && Reflect.ownKeys(value).length === names.length
  && names.every(name => Object.hasOwn(Object.getOwnPropertyDescriptor(value, name) || {}, 'value'));
const positive = value => Number.isFinite(value) && value > 0 && value <= 1e6;
const timeValue = value => Number.isFinite(value) && value >= 0 && value <= 1e7;
const worldValid = world => keys(world, ['width', 'height']) && positive(world.width) && positive(world.height);
const centerValid = (center, world) => keys(center, ['x', 'y']) && Number.isFinite(center.x) && Number.isFinite(center.y)
  && center.x >= 0 && center.x <= world.width && center.y >= 0 && center.y <= world.height;

function valid(view, world, scenarioId, time) {
  return keys(view, ['version', 'continuityId', 'scenarioId', 'time', 'world', 'mode', 'zoom', 'center'])
    && view.version === VERSION && view.continuityId === CONTINUITY_ID && view.scenarioId === scenarioId
    && scenarioId === 'gettysburg' && timeValue(time) && view.time === time && worldValid(world)
    && worldValid(view.world) && view.world.width === world.width && view.world.height === world.height
    && ['overview', 'free'].includes(view.mode) && Number.isFinite(view.zoom) && view.zoom > 0 && view.zoom <= 64
    && centerValid(view.center, world);
}

/** Capture the current scroll, including a pan before the next camera render. */
export function createFieldViewCheckpoint(camera, mode, world, scenarioId, time) {
  try {
    if (!camera || !positive(camera.width) || !positive(camera.height)
      || !Number.isFinite(camera.scrollX) || !Number.isFinite(camera.scrollY)) return null;
    const scrollX = camera.useBounds && typeof camera.clampX === 'function' ? camera.clampX(camera.scrollX) : camera.scrollX;
    const scrollY = camera.useBounds && typeof camera.clampY === 'function' ? camera.clampY(camera.scrollY) : camera.scrollY;
    const view = {
      version: VERSION, continuityId: CONTINUITY_ID, scenarioId, time,
      world: { width: world.width, height: world.height }, mode: mode === 'overview' ? 'overview' : 'free',
      zoom: camera.zoom, center: { x: scrollX + camera.width / 2, y: scrollY + camera.height / 2 },
    };
    return valid(view, world, scenarioId, time) ? view : null;
  } catch { return null; }
}

/** Legacy or invalid metadata leaves the normal initial camera untouched. */
export function readFieldViewCheckpoint(presentation, world, scenarioId, time, viewport) {
  try {
    if (data(presentation, 'version') !== 1 || data(presentation, 'time') !== time
      || !positive(viewport?.width) || !positive(viewport?.height)) return null;
    const view = data(presentation, 'fieldView');
    if (!valid(view, world, scenarioId, time)) return null;
    const minimum = overviewZoom(viewport, world);
    return view.mode === 'overview'
      ? { mode: 'overview', zoom: minimum, center: { x: world.width / 2, y: world.height / 2 } }
      : { mode: 'free', zoom: boundedZoom(view.zoom, 0, minimum), requestedZoom: view.zoom,
        center: { x: view.center.x, y: view.center.y } };
  } catch { return null; }
}
