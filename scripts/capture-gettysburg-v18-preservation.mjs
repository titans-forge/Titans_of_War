import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const original = '/Users/titansforge/Vault/Titans_of_War';
const modules = path => import(`${original}/${path}`);
const { gettysburgInfantryClipPolicy, GETTYSBURG_INFANTRY_CLIPS_IDS } = await modules('src/battle/gettysburgInfantryClipPolicy.js');
const { gettysburgInfantryClipAssets, gettysburgInfantryClipDefinitions } = await modules('src/battle/gettysburgInfantryClipAssets.js');
const { prepareGettysburgInfantryClips, gettysburgInfantryClipPose } = await modules('src/battle/gettysburgInfantryClips.js');
const { GETTYSBURG_MOTION_STUDIES } = await modules('src/battle/gettysburgMotionStudies.js');
const { getGettysburgMotionPlaybackPresets, getGettysburgMotionPlaybackInitialPreset, createGettysburgMotionPlaybackState } = await modules('src/battle/gettysburgMotionPlayback.js');
const { gettysburgClipTestTextures } = await modules('scripts/test-support/gettysburgClipTextures.mjs');
const sha = value => createHash('sha256').update(value).digest('hex');
const jsonHash = value => sha(JSON.stringify(value));
const search = '?artPass=gettysburg-v17';
const assets = gettysburgInfantryClipAssets('gettysburg', search);
const allPriorAssets = [...new Map(GETTYSBURG_INFANTRY_CLIPS_IDS.flatMap(pass => gettysburgInfantryClipAssets('gettysburg', `?artPass=${pass}`)).map(asset => [asset.key, asset])).values()];
const atlases = new Map(allPriorAssets.map(asset => [asset.key, JSON.parse(readFileSync(`${original}/public/${asset.json}`))]));
const textures = gettysburgClipTestTextures(atlases);
const prepare = query => prepareGettysburgInfantryClips(gettysburgInfantryClipDefinitions('gettysburg', query, textures), (key, frame) => textures.exists(key) && textures.get(key).has(frame));
const clips = prepare(search);
const flags = [{}, { paused: true, frozenAction: 'native', frozenPhase: 'last' }, { reducedMotion: true }, { resolving: true, frozenAction: 'native', frozenPhase: 'last' }];
const poseRows = (clip, query, prepared) => {
  const rows = [];
  for (const action of clip.action === 'march' ? ['walk', 'route'] : clip.action === 'ready' ? ['idle', 'ready'] : [clip.action])
  for (const frame of [0, 1, 2, 3, 4, 7, -1, 8]) for (const template of flags) for (const age of [0, .08, .19, .4]) for (const reloadProgress of [undefined, 0, .2, .49, .5, .8, 1]) {
    const options = Object.keys(template).length ? { ...template, ...(template.frozenAction ? { frozenAction: clip.action, frozenPhase: clip.frames.length - 1 } : {}) } : {};
    const figure = { id: 17, direction: clip.direction, action, frame, scale: 1.37, bodyOffsetX: 5, bodyOffsetY: -4, lean: 2 };
    rows.push({ action, frame, flags: options, age, reloadProgress, pose: gettysburgInfantryClipPose('v18-v17-preservation', figure, 999, { scenarioId: 'gettysburg', search: query, side: clip.side, identity: clip.identity, clips: prepared, shootingAge: age, reloadProgress, ...options }) });
  }
  return rows;
};
const addresses = clips.map(clip => {
  const rows = poseRows(clip, search, clips);
  return { address: [clip.side, clip.identity, clip.direction, clip.action], key: clip.key, frames: clip.frames, rows: rows.length, poseHash: jsonHash(rows) };
});
const oldPasses = GETTYSBURG_INFANTRY_CLIPS_IDS.map(pass => {
  const query = `?artPass=${pass}`, prepared = prepare(query);
  const rows = prepared.flatMap(clip => poseRows(clip, query, prepared));
  return { pass, policy: gettysburgInfantryClipPolicy('gettysburg', query), assets: gettysburgInfantryClipAssets('gettysburg', query), clips: prepared.length, clipHash: jsonHash(prepared), poseRows: rows.length, poseHash: jsonHash(rows) };
});
const presets = getGettysburgMotionPlaybackPresets(GETTYSBURG_MOTION_STUDIES);
const fixture = { schemaVersion: 1, capturedFrom: original, artPass: 'gettysburg-v17', capture: 'Direct original module outputs and native file bytes, before candidate v18 implementation; actual scene tests are separate.', assets: assets.length, clips: clips.length,
  hashes: assets.map(asset => ({ key: asset.key, image: sha(readFileSync(`${original}/public/${asset.image}`)), json: sha(readFileSync(`${original}/public/${asset.json}`)) })),
  allPriorAssets, allPriorHashes: allPriorAssets.map(asset => ({ key: asset.key, image: sha(readFileSync(`${original}/public/${asset.image}`)), json: sha(readFileSync(`${original}/public/${asset.json}`)) })),
  protectedModules: ['src/battle/CivilWarBattlefield.jsx', 'src/battle/formationVisualState.js', 'src/battle/formationVisualCheckpoint.js', 'src/battle/gettysburgInfantryClips.js', 'src/battle/gettysburgInfantryShotMotion.js', 'src/battle/civilWarEngine.js', 'src/battle/gettysburgMechanics.js', 'src/game/campaignStorage.js'].map(path => ({ path, sha256: sha(readFileSync(`${original}/${path}`)) })),
  clipHash: jsonHash(clips), addresses, oldPasses, studyRows: GETTYSBURG_MOTION_STUDIES.length, studyHash: jsonHash(GETTYSBURG_MOTION_STUDIES), presetRows: presets.length, presetHash: jsonHash(presets), initialPreset: getGettysburgMotionPlaybackInitialPreset(presets).id, playbackState: createGettysburgMotionPlaybackState(GETTYSBURG_MOTION_STUDIES) };
if (fixture.assets !== 36 || fixture.clips !== 72 || addresses.length !== 72 || oldPasses.length !== 15 || oldPasses[0].clips !== 1) throw new Error('Original v17 capture is not complete');
writeFileSync(new URL('./fixtures/gettysburg-v18-preservation.json', import.meta.url), `${JSON.stringify(fixture, null, 2)}\n`);
console.log(JSON.stringify({ assets: fixture.assets, clips: fixture.clips, addresses: addresses.length, oldPasses: oldPasses.length, poseRows: oldPasses.reduce((sum, row) => sum + row.poseRows, 0), studyRows: fixture.studyRows, presetRows: fixture.presetRows }));
