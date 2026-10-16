// Presentation is optional and never participates in combat-state revival.
// The engine revives its Map/Set markers while cloning the entire input, so
// pass only the engine-owned envelope even when a scene save has extra data.
export function combatCheckpointEnvelope(checkpoint) {
  return {
    version: checkpoint?.version,
    state: checkpoint?.state,
    internal: checkpoint?.internal,
  };
}
