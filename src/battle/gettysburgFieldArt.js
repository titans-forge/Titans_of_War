import { gettysburgInfantryClipPolicy } from './gettysburgInfantryClipPolicy.js';

export const GETTYSBURG_FIELD_ART_ID = 'gettysburg-field-v1';
export const GETTYSBURG_FIELD_TERRAIN = 'gettysburg-terrain-field-v1';
// Carry forward the reviewed directional pose families and their motion
// readers. Free camera context still uses the ordinary save path.
export const GETTYSBURG_FIELD_POSES = '?artPass=gettysburg-v32&infantryScale=moderate&contactLayout=v33&standardContinuity=v34&animationContinuity=v35&dustContinuity=v36&locomotionHeading=v40';
export const GETTYSBURG_FIELD_SHEETS = Object.freeze([
  'confederate-drill', 'confederate-contact', 'union-drill', 'union-contact',
]);

export function gettysburgFieldArtEnabled(scenarioId, rules, search = '') {
  if (scenarioId !== 'gettysburg' || !(rules >= 18)) return false;
  const choices = new URLSearchParams(search).getAll('artPass');
  return choices.length === 1 && choices[0] === GETTYSBURG_FIELD_ART_ID;
}

export function preloadGettysburgFieldArt(scene, publicBase) {
  for (const sheet of GETTYSBURG_FIELD_SHEETS) {
    const key = `${GETTYSBURG_FIELD_ART_ID}-${sheet}`;
    const src = `${publicBase}images/units/${GETTYSBURG_FIELD_ART_ID}/${sheet}`;
    scene.load.image(key, `${src}.webp`);
    scene.load.json(key, `${src}.json`);
  }
}

// Reuse the existing action selectors and name-bound checkpoint readers.
// With the Canvas renderer, these logical atlases share one decoded bitmap
// per sheet. The accepted full-size atlases still serve their original URLs.
export function mountGettysburgFieldArt(scene) {
  const supported = gettysburgInfantryClipPolicy('gettysburg', GETTYSBURG_FIELD_POSES).atlases;
  const remaining = new Set(supported.map(({ key }) => key));
  for (const sheet of GETTYSBURG_FIELD_SHEETS) {
    const id = `${GETTYSBURG_FIELD_ART_ID}-${sheet}`;
    if (!scene.textures.exists(id)) continue;
    const image = scene.textures.get(id).getSourceImage();
    const manifest = scene.cache.json.get(id);
    if (manifest?.version !== 1 || manifest.width !== image.width || manifest.height !== image.height) continue;
    for (const [key, atlas] of Object.entries(manifest.atlases || {})) {
      const clips = atlas?.meta?.clips;
      if (!remaining.has(key) || !atlas?.frames || !Array.isArray(clips)
        || !clips.length || !clips.every(clip => clip?.key === key)) continue;
      scene.textures.addAtlas(key, image, atlas);
      remaining.delete(key);
    }
  }
  if (remaining.size) console.warn(`Gettysburg art preview: ${remaining.size} pose atlases unavailable. Using the existing artwork for those poses.`);
}
