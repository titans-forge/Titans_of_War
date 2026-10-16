const DEFAULTS = Object.freeze({ fireArc: false, missionMarkers: true, tacticalOverlay: false });
const NAMES = ['version', 'scenarioId', ...Object.keys(DEFAULTS)];
const plain = value => value !== null && typeof value === 'object'
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const data = (value, name) => plain(value) ? Object.getOwnPropertyDescriptor(value, name)?.value : undefined;

/** Optional UI choices never participate in combat revival or audio permission. */
export function readBattleDisplayPreferences(checkpoint, scenarioId) {
  try {
    const saved = data(data(checkpoint, 'presentation'), 'displayPreferences');
    if (!plain(saved) || Reflect.ownKeys(saved).length !== NAMES.length
      || !NAMES.every(name => Object.hasOwn(Object.getOwnPropertyDescriptor(saved, name) || {}, 'value'))
      || data(saved, 'version') !== 1 || data(saved, 'scenarioId') !== scenarioId
      || !Object.keys(DEFAULTS).every(name => typeof data(saved, name) === 'boolean')) return { ...DEFAULTS };
    return Object.fromEntries(Object.keys(DEFAULTS).map(name => [name, data(saved, name)]));
  } catch { return { ...DEFAULTS }; }
}

/** The current Scene supplies a trusted plain checkpoint; keep every other owner. */
export function withBattleDisplayPreferences(checkpoint, scenarioId, preferences) {
  if (!checkpoint || typeof scenarioId !== 'string' || !scenarioId || scenarioId.length > 128
    || !Object.keys(DEFAULTS).every(name => typeof preferences?.[name] === 'boolean')) {
    throw new TypeError('The battlefield display choices are not ready to save.');
  }
  return {
    ...checkpoint,
    presentation: {
      ...checkpoint.presentation,
      displayPreferences: { version: 1, scenarioId,
        ...Object.fromEntries(Object.keys(DEFAULTS).map(name => [name, preferences[name]])) },
    },
  };
}
