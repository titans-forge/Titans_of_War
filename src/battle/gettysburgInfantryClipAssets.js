import { gettysburgInfantryClipPolicy } from './gettysburgInfantryClipPolicy.js';

// Phaser's JSONHash parser retains atlas metadata in texture.customData.meta.
// Read only selected, loaded textures during scene creation. Missing metadata
// and metadata pointing at another texture cannot create a candidate clip.
export function gettysburgInfantryClipDefinitions(scenarioId, search = '', textures) {
  const selected = gettysburgInfantryClipPolicy(scenarioId, search)?.atlases || [];
  if (!textures || typeof textures.exists !== 'function' || typeof textures.get !== 'function') return [];
  return selected.flatMap(({ key }) => {
    try {
      if (!textures.exists(key)) return [];
      const meta = textures.get(key)?.customData?.meta;
      const clips = Array.isArray(meta?.clips) ? meta.clips : meta?.clip ? [meta.clip] : [];
      return clips.filter(clip => clip?.key === key);
    } catch { return []; }
  });
}

export function gettysburgInfantryClipAssets(scenarioId, search = '', publicBase = '') {
  const base = publicBase ? `${publicBase.replace(/\/$/, '')}/` : '';
  // Three stationary actions share one atlas; preload its PNG/JSON only once.
  return (gettysburgInfantryClipPolicy(scenarioId, search)?.atlases || []).map(({ directory, key, image }) => ({
    key,
    image: `${base}images/units/${directory}/${image}`,
    json: `${base}images/units/${directory}/${image.replace(/\.png$/, '.json')}`,
  }));
}
