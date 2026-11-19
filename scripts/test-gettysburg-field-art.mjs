import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  GETTYSBURG_FIELD_ART_ID, GETTYSBURG_FIELD_POSES, GETTYSBURG_FIELD_SHEETS,
  gettysburgFieldArtEnabled, mountGettysburgFieldArt, preloadGettysburgFieldArt,
} from '../src/battle/gettysburgFieldArt.js';
import { gettysburgInfantryClipAssets, gettysburgInfantryClipDefinitions } from '../src/battle/gettysburgInfantryClipAssets.js';
import { gettysburgInfantryClipPose, prepareGettysburgInfantryClips } from '../src/battle/gettysburgInfantryClips.js';
import { fieldClothColumn, fieldStandardLean } from '../src/battle/realisticStandards.js';
import { gettysburgOrderReceipt } from '../src/battle/battleFeedback.js';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { createFreshCampaignState } from '../src/game/campaignStorage.js';
import { createFormationVisual } from '../src/battle/formationVisualState.js';
import { sampleGettysburgLocomotion } from '../src/battle/gettysburgLocomotionPresentation.js';

const query = `?artPass=${GETTYSBURG_FIELD_ART_ID}`;
const read = path => readFileSync(new URL(`../public/${path}`, import.meta.url));
const parse = path => JSON.parse(read(path).toString());
const sources = gettysburgInfantryClipAssets('gettysburg', GETTYSBURG_FIELD_POSES);
const sheets = GETTYSBURG_FIELD_SHEETS.map(sheet => ({
  id: `${GETTYSBURG_FIELD_ART_ID}-${sheet}`,
  path: `images/units/${GETTYSBURG_FIELD_ART_ID}/${sheet}`,
})).map(({ id, path }) => ({ id, imageBytes: read(path + '.webp'), manifest: parse(path + '.json') }));
const MiB = 1024 * 1024;

test('the intact Gettysburg encounter chooses the pilot explicitly', () => {
  assert.equal(gettysburgFieldArtEnabled('gettysburg', 18, query + '&fieldProfile=1'), true);
  for (const [board, rules, search] of [
    ['gettysburg', 17, query], ['shiloh', 18, query], ['gettysburg_jackson', 18, query],
    ['gettysburg', 18, ''], ['gettysburg', 18, '?artPass=gettysburg-v32'],
    ['gettysburg', 18, query + '&artPass=gettysburg-v32'],
  ]) assert.equal(gettysburgFieldArtEnabled(board, rules, search), false);
});

test('compact sheets retain every authored address, anchor and proportional reference height', () => {
  const originals = new Map(sources.map(source => [source.key, source]));
  let rgba = 0;
  let bytes = 0;
  for (const { manifest, imageBytes } of sheets) {
    assert.equal(imageBytes.toString('ascii', 8, 12), 'WEBP');
    assert.ok(manifest.width <= 2048 && manifest.height <= 2048);
    rgba += manifest.width * manifest.height * 4;
    bytes += imageBytes.length + Buffer.byteLength(JSON.stringify(manifest));
    for (const [key, atlas] of Object.entries(manifest.atlases)) {
      const original = originals.get(key);
      assert.ok(original, key);
      originals.delete(key);
      const authored = parse(original.json);
      assert.equal(atlas.meta.source.sha256, authored.meta.sha256);
      assert.deepEqual(Object.keys(atlas.frames), Object.keys(authored.frames));
      for (const [name, cell] of Object.entries(atlas.frames)) {
        const native = authored.frames[name].frame;
        assert.equal(cell.sourceSize.h, Math.round(native.h / 4));
        assert.equal(cell.sourceSize.w, Math.round(native.w / 4));
        assert.ok(cell.frame.x + cell.frame.w <= manifest.width);
        assert.ok(cell.frame.y + cell.frame.h <= manifest.height);
        assert.ok(cell.spriteSourceSize.x + cell.frame.w <= cell.sourceSize.w);
        assert.ok(cell.spriteSourceSize.y + cell.frame.h <= cell.sourceSize.h);
      }
      const originalClips = authored.meta.clips || [authored.meta.clip];
      const expected = originalClips.map(clip => {
        const name = clip.frames[0];
        return { ...clip, referenceHeight: clip.referenceHeight * (atlas.frames[name].sourceSize.h / authored.frames[name].frame.h) };
      });
      assert.deepEqual(atlas.meta.clips, expected);
    }
  }
  assert.equal(originals.size, 0);
  assert.ok(rgba < 18 * MiB, `nominal RGBA ${rgba}`);
  assert.ok(bytes < 3 * MiB, `encoded ${bytes}`);
});

test('the live loaders mount four sources and resolve marching, firing, reloading and contact on both sides', () => {
  const calls = [];
  preloadGettysburgFieldArt({ load: {
    image(key, url) { calls.push([key, url]); },
    json(key, url) { calls.push([key, url]); },
  } }, './');
  assert.equal(calls.length, sheets.length * 2);
  assert.ok(calls.every(([, url]) => url.startsWith('./images/units/gettysburg-field-v1/')));

  const manifests = new Map(sheets.map(sheet => [sheet.id, sheet.manifest]));
  const textures = new Map(sheets.map(({ id }) => [id, {
    getSourceImage: () => images.get(id),
  }]));
  const images = new Map(sheets.map(({ id, manifest: { width, height } }) => [id, { width, height }]));
  const mountedSources = new Set();
  const scene = {
    cache: { json: { get: id => manifests.get(id) } },
    textures: {
      exists: key => textures.has(key),
      get: key => textures.get(key),
      addAtlas(key, image, atlas) {
        mountedSources.add(image);
        textures.set(key, { customData: { meta: atlas.meta }, has: name => Boolean(atlas.frames[name]) });
      },
    },
  };
  mountGettysburgFieldArt(scene);
  assert.equal(textures.size, sources.length + sheets.length);
  assert.equal(mountedSources.size, sheets.length);
  const definitions = gettysburgInfantryClipDefinitions('gettysburg', GETTYSBURG_FIELD_POSES, scene.textures);
  const clips = prepareGettysburgInfantryClips(definitions, (key, frame) => textures.get(key).has(frame));
  assert.equal(clips.length, definitions.length, 'every packed clip passes the normal eligibility checks');

  for (const [side, direction] of [['union', 2], ['confederate', 6]]) {
    for (const action of ['idle', 'walk', 'fire', 'reload', 'melee']) {
      const pose = gettysburgInfantryClipPose('test-formation', { id: 0, direction, action, frame: 2 }, 12, {
        scenarioId: 'gettysburg', search: GETTYSBURG_FIELD_POSES, clips, side, identity: 'a',
      });
      assert.ok(pose, `${side} ${action}`);
      assert.ok(textures.get(pose.key).has(pose.frame));
    }
  }
});

test('standards keep a fixed hoist and permit a still flag in reduced motion', () => {
  for (const phase of [0, 1, 3, 6]) {
    const start = fieldClothColumn(0, phase);
    assert.equal(start.x, 0);
    assert.ok(start.y === 0);
    assert.ok(fieldClothColumn(.5, phase).x < fieldClothColumn(1, phase).x);
    assert.equal(fieldStandardLean(12, phase, true, true), 0);
    assert.ok(Math.abs(fieldStandardLean(12, phase, true, false)) < .06);
  }
});

test('the live pilot skips empty motion records and preserves actual pivot and paused poses', () => {
  const e = new CivilWarBattleEngine('gettysburg', createFreshCampaignState(1861), 'option_b');
  const formation = e.snapshot({ presentation: true }).formations.find(unit => unit.id === 'pickett-division');
  const start = { ...formation, reload: 0 };
  const ordinary = createFormationVisual(start, 32, 0);
  const pilot = createFormationVisual(start, 32, 0);
  const position = { ...start, x: start.x + 35, order: 'advance' };
  const turn = { ...position, order: 'hold', facing: start.facing + Math.PI / 3 };
  let before = null, after = null;
  for (const [formation, time] of [[start, 0], [position, 3], [turn, 5], [turn, 5]]) {
    before = sampleGettysburgLocomotion(ordinary, before?.heading, formation, time, .82);
    after = sampleGettysburgLocomotion(pilot, after?.heading, formation, time, .82, { skipEmptyHeading: true });
    assert.deepEqual(after.visual, before.visual);
    if (before.heading?.headings.some(direction => direction !== null)) assert.deepEqual(after.heading, before.heading);
    else assert.equal(after.heading, null);
  }
  assert.ok(after.heading?.headings.some(direction => direction !== null));
});

test('order feedback distinguishes movement, a blocked order and a completed withdrawal', () => {
  const unit = { active: true, order: 'hold', status: 'steady' };
  assert.equal(gettysburgOrderReceipt(unit), 'Holding position');
  assert.equal(gettysburgOrderReceipt({ ...unit, pendingCommand: { order: 'advance' } }), 'Order en route');
  assert.equal(gettysburgOrderReceipt({ ...unit, directMove: true }), 'Moving to destination');
  assert.equal(gettysburgOrderReceipt({ ...unit, turnBlocked: true, directMove: true }), 'Maneuver blocked');
  assert.equal(gettysburgOrderReceipt({ ...unit, order: 'withdraw', inMelee: true }), 'In close contact');
  assert.equal(gettysburgOrderReceipt({ ...unit, status: 'routing', order: 'withdraw' }), 'Routing');
  assert.equal(gettysburgOrderReceipt({ ...unit, order: 'withdraw' }), 'Withdrawing to the rear');
  assert.equal(gettysburgOrderReceipt({ ...unit, active: false, withdrawn: true, withdrawalOrganized: true }), 'Exited in order');
});

test('battery receipts distinguish prebattle readiness, setup and a recorded reload', () => {
  const gun = { active: true, order: 'hold', status: 'steady', gunState: 'deployed', reload: 2.5, lastVolleyAt: -100 };
  assert.equal(gettysburgOrderReceipt(gun), 'Guns deployed');
  assert.equal(gettysburgOrderReceipt({ ...gun, lastVolleyAt: 8 }), 'Crew reloading');
  assert.equal(gettysburgOrderReceipt({ ...gun, gunState: 'limbering', order: 'withdraw' }), 'Limbering guns');
  assert.equal(gettysburgOrderReceipt({ ...gun, gunState: 'unlimbering' }), 'Deploying guns');
});
