import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Run once against the unmodified isolated snapshot, before v24 integration.
// The capture rejects an already-enabled v24 selector; never regenerate the
// authentic fixture from the finished candidate to make a regression pass.
const original = fileURLToPath(new URL('../', import.meta.url));
const modules = path => import(`${original}${path}`);
const { gettysburgInfantryClipPolicy, GETTYSBURG_INFANTRY_CLIPS_IDS } = await modules('src/battle/gettysburgInfantryClipPolicy.js');
const { GETTYSBURG_INFANTRY_CONTACT_CLIPS_IDS } = await modules('src/battle/gettysburgInfantryContactClips.js');
const { GETTYSBURG_INFANTRY_UNION_CONTACT_CLIPS_IDS } = await modules('src/battle/gettysburgInfantryUnionContactClips.js');
const { GETTYSBURG_INFANTRY_CARDINAL_CONTACT_CLIPS_IDS } = await modules('src/battle/gettysburgInfantryCardinalContactClips.js');
const { GETTYSBURG_INFANTRY_REVERSE_CARDINAL_CONTACT_CLIPS_IDS } = await modules('src/battle/gettysburgInfantryReverseCardinalContactClips.js');
const passIds = [...GETTYSBURG_INFANTRY_CLIPS_IDS, ...GETTYSBURG_INFANTRY_CONTACT_CLIPS_IDS, ...GETTYSBURG_INFANTRY_UNION_CONTACT_CLIPS_IDS, ...GETTYSBURG_INFANTRY_CARDINAL_CONTACT_CLIPS_IDS, ...GETTYSBURG_INFANTRY_REVERSE_CARDINAL_CONTACT_CLIPS_IDS];
const { gettysburgInfantryClipAssets, gettysburgInfantryClipDefinitions } = await modules('src/battle/gettysburgInfantryClipAssets.js');
const { prepareGettysburgInfantryClips, gettysburgInfantryClipPose } = await modules('src/battle/gettysburgInfantryClips.js');
const { GETTYSBURG_MOTION_STUDIES } = await modules('src/battle/gettysburgMotionStudies.js');
const { getGettysburgMotionPlaybackPresets, getGettysburgMotionPlaybackInitialPreset, createGettysburgMotionPlaybackState } = await modules('src/battle/gettysburgMotionPlayback.js');
const { gettysburgClipTestTextures } = await modules('scripts/test-support/gettysburgClipTextures.mjs');
const sha = value => createHash('sha256').update(value).digest('hex');
const jsonHash = value => sha(JSON.stringify(value));
const search = '?artPass=gettysburg-v23';
if (gettysburgInfantryClipPolicy('gettysburg', '?artPass=gettysburg-v24') !== null) throw new Error('Capture requires an unmodified pre-v24 snapshot');
const assets = gettysburgInfantryClipAssets('gettysburg', search);
const allPriorAssets = [...new Map(passIds.flatMap(pass => gettysburgInfantryClipAssets('gettysburg', `?artPass=${pass}`)).map(asset => [asset.key, asset])).values()];
const atlases = new Map(allPriorAssets.map(asset => [asset.key, JSON.parse(readFileSync(`${original}public/${asset.json}`))]));
const textures = gettysburgClipTestTextures(atlases);
const prepare = query => prepareGettysburgInfantryClips(gettysburgInfantryClipDefinitions('gettysburg', query, textures), (key, frame) => textures.exists(key) && textures.get(key).has(frame));
const clips = prepare(search);
const flags = [{}, { paused: true, frozenAction: 'native', frozenPhase: 'last' }, { reducedMotion: true }, { resolving: true, frozenAction: 'native', frozenPhase: 'last' }];
function poseRows(clip, query, prepared) {
  const rows = [];
  for (const action of clip.action === 'march' ? ['walk', 'route'] : clip.action === 'ready' ? ['idle', 'ready'] : [clip.action])
  for (const frame of [0, 1, 2, 3, 4, 7, -1, 8]) for (const template of flags) for (const age of [0, .08, .19, .4]) for (const reloadProgress of [undefined, 0, .2, .49, .5, .8, 1]) {
    const options = Object.keys(template).length ? { ...template, ...(template.frozenAction ? { frozenAction: clip.action, frozenPhase: clip.frames.length - 1 } : {}) } : {};
    const figure = { id: 17, direction: clip.direction, action, frame, fallen: clip.action === 'fall', scale: 1.37, bodyOffsetX: 5, bodyOffsetY: -4, lean: 2 };
    rows.push({ action, frame, flags: options, age, reloadProgress, pose: gettysburgInfantryClipPose('v24-v23-preservation', figure, 999, { scenarioId: 'gettysburg', search: query, side: clip.side, identity: clip.identity, clips: prepared, shootingAge: age, reloadProgress, ...options }) });
  }
  return rows;
}
function unsupportedRows(query, prepared) {
  const rows = [];
  for (const side of ['union', 'confederate']) for (const identity of ['a', 'b'])
  for (let direction = 0; direction < 8; direction++) for (const action of ['melee', 'fall'])
  for (const frame of [0, 1, 2, 3, 4, 7, -1, 8]) for (const options of [{}, { paused: true }, { resolving: true }, { reducedMotion: true }]) {
    const figure = { id: 17, direction, action, frame, fallen: action === 'fall', scale: 1.37 };
    rows.push({ side, identity, direction, action, frame, options, pose: gettysburgInfantryClipPose('v24-contact-preservation', figure, 999, { scenarioId: 'gettysburg', search: query, side, identity, clips: prepared, ...options }) });
  }
  return rows;
}
const oldPasses = passIds.map(pass => {
  const query = `?artPass=${pass}`, prepared = prepare(query), rows = prepared.flatMap(clip => poseRows(clip, query, prepared)), unsupported = unsupportedRows(query, prepared);
  return { pass, policy: gettysburgInfantryClipPolicy('gettysburg', query), assets: gettysburgInfantryClipAssets('gettysburg', query), clips: prepared.length, clipHash: jsonHash(prepared), poseRows: rows.length, poseHash: jsonHash(rows), actionRows: unsupported.length, actionHash: jsonHash(unsupported) };
});
const presets = getGettysburgMotionPlaybackPresets(GETTYSBURG_MOTION_STUDIES);
const protectedPaths = ['src/battle/CivilWarBattlefield.jsx', 'src/battle/formationVisualState.js', 'src/battle/formationVisualCheckpoint.js', 'src/battle/gettysburgInfantryShotMotion.js', 'src/battle/civilWarEngine.js', 'src/battle/gettysburgMechanics.js', 'src/game/campaignStorage.js', 'src/battle/gettysburgInfantryFamily.js', 'src/battle/realisticUnitVisual.js', 'src/battle/detailedUnitVisual.js', 'src/battle/gettysburgMotionStudies.js', 'src/battle/gettysburgMotionPlayback.js'];
const legacyFixtures = ['scripts/fixtures/gettysburg-v15-preservation.json', 'scripts/fixtures/gettysburg-v16-preservation.json', 'scripts/fixtures/gettysburg-v17-preservation.json', 'scripts/fixtures/gettysburg-v18-preservation.json', 'scripts/fixtures/gettysburg-v20-preservation.json', 'scripts/fixtures/gettysburg-v21-preservation.json', 'scripts/fixtures/gettysburg-v22-preservation.json', 'scripts/fixtures/gettysburg-v23-preservation.json'];
// Protect every prior contact source, generated original, prompt, annotation,
// measurement, review, author, test, capture and fixture, including all four helpers.
const filesBelow = directory => readdirSync(`${original}${directory}`, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? filesBelow(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]);
const protectedContactPaths = [...new Set([
  'src/battle/gettysburgInfantryContactClips.js', 'src/battle/gettysburgInfantryUnionContactClips.js', 'src/battle/gettysburgInfantryCardinalContactClips.js', 'src/battle/gettysburgInfantryReverseCardinalContactClips.js',
  ...['scripts', 'docs/art-pass', 'public/images/units'].flatMap(filesBelow).filter(path => /gettysburg-v(?:20|21|22|23)(?:[-/]|\.)/.test(path)),
])].sort();
const fileHash = path => ({ path, sha256: sha(readFileSync(`${original}${path}`)) });
const fixture = { schemaVersion: 1, capturedFrom: original, artPass: 'gettysburg-v23', capture: 'Direct pre-edit candidate snapshot module outputs and native file bytes; real Scene tests are separate.', assets: assets.length, clips: clips.length, legacyIds: GETTYSBURG_INFANTRY_CLIPS_IDS, contactIds: GETTYSBURG_INFANTRY_CONTACT_CLIPS_IDS, unionContactIds: GETTYSBURG_INFANTRY_UNION_CONTACT_CLIPS_IDS, cardinalContactIds: GETTYSBURG_INFANTRY_CARDINAL_CONTACT_CLIPS_IDS, reverseCardinalContactIds: GETTYSBURG_INFANTRY_REVERSE_CARDINAL_CONTACT_CLIPS_IDS, allPriorAssets,
  allPriorHashes: allPriorAssets.map(asset => ({ key: asset.key, image: sha(readFileSync(`${original}public/${asset.image}`)), json: sha(readFileSync(`${original}public/${asset.json}`)) })), protectedModules: protectedPaths.map(fileHash), protectedFixtures: legacyFixtures.map(fileHash), protectedContactFiles: protectedContactPaths.map(fileHash), integrationModulesBefore: ['src/battle/gettysburgInfantryClipPolicy.js', 'src/battle/gettysburgInfantryClips.js', 'src/battle/gettysburgInfantryClipAssets.js'].map(fileHash), clipHash: jsonHash(clips), oldPasses,
  studyRows: GETTYSBURG_MOTION_STUDIES.length, studyHash: jsonHash(GETTYSBURG_MOTION_STUDIES), presetRows: presets.length, presetHash: jsonHash(presets), initialPreset: getGettysburgMotionPlaybackInitialPreset(presets).id, playbackState: createGettysburgMotionPlaybackState(GETTYSBURG_MOTION_STUDIES) };
if (fixture.assets !== 48 || fixture.clips !== 84 || oldPasses.length !== 20 || allPriorAssets.length !== 52 || oldPasses[0].clips !== 1) throw new Error('Original v23 capture is not complete');
writeFileSync(new URL('./fixtures/gettysburg-v24-preservation.json', import.meta.url), `${JSON.stringify(fixture, null, 2)}\n`);
console.log(JSON.stringify({ assets: fixture.assets, clips: fixture.clips, oldPasses: oldPasses.length, nativeSourcePairs: allPriorAssets.length, poseRows: oldPasses.reduce((sum, row) => sum + row.poseRows, 0), contactCasualtyRows: oldPasses.reduce((sum, row) => sum + row.actionRows, 0), protectedModules: fixture.protectedModules.length, oldFixtures: fixture.protectedFixtures.length, priorContactFiles: fixture.protectedContactFiles.length, studyRows: fixture.studyRows, presetRows: fixture.presetRows, fixtureSHA256: sha(readFileSync(new URL('./fixtures/gettysburg-v24-preservation.json', import.meta.url))) }));
