import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { gettysburgInfantryClipAssets, gettysburgInfantryClipDefinitions } from '../src/battle/gettysburgInfantryClipAssets.js';
import { gettysburgInfantryClipsEnabled, prepareGettysburgInfantryClips, gettysburgInfantryClipPose,
  validateGettysburgInfantryClip } from '../src/battle/gettysburgInfantryClips.js';
import { gettysburgInfantryIdentity, gettysburgInfantryContactPhase, gettysburgInfantryFamilyAssets } from '../src/battle/gettysburgInfantryFamily.js';
import { createFormationVisual, updateFormationVisual as updateActualFormationVisual } from '../src/battle/formationVisualState.js';
import { detailedInfantryPose, detailedUnitAssetDirectory, DETAILED_UNIT_PAGES } from '../src/battle/detailedUnitVisual.js';
import { GETTYSBURG_MOTION_STUDIES as ALL_GETTYSBURG_MOTION_STUDIES, getGettysburgMotionStudyCell } from '../src/battle/gettysburgMotionStudies.js';
import { deterministicUnitValue } from '../src/battle/formationMath.js';
import { formationStatusLabel } from '../src/battle/battleTactics.js';
import { gettysburgClipTestTextures } from './test-support/gettysburgClipTextures.mjs';

// Historical assertions inspect every prior study; v14 and v15 each have a strict suite.
const GETTYSBURG_MOTION_STUDIES = ALL_GETTYSBURG_MOTION_STUDIES.filter(study => !study.id.endsWith('-v14') && !study.id.endsWith('-v15')); 

const search = '?artPass=gettysburg-v7';
const assets = gettysburgInfantryClipAssets('gettysburg', search);
const retainedSearch = gettysburgInfantryClipAssets('gettysburg', '?artPass=gettysburg-v6').length ? '?artPass=gettysburg-v6' : '?artPass=gettysburg-v5';
const retainedAssets = gettysburgInfantryClipAssets('gettysburg', retainedSearch);
const atlases = new Map([...retainedAssets, ...assets].map(asset => [asset.key,
  JSON.parse(readFileSync(new URL(`../public/${asset.json}`, import.meta.url)))]));
const textures = gettysburgClipTestTextures(atlases);
const definitions = gettysburgInfantryClipDefinitions('gettysburg', search, textures);
const retainedDefinitions = gettysburgInfantryClipDefinitions('gettysburg', retainedSearch, textures).filter(clip => clip.identity === 'a');
const hasFrame = (key, name) => Boolean(atlases.get(key)?.frames[name]);
const prepared = prepareGettysburgInfantryClips(definitions, hasFrame);
const aOnly = prepareGettysburgInfantryClips(retainedDefinitions, hasFrame);
const bDefinitions = definitions.filter(clip => clip.side === 'union' && clip.identity === 'b');
const newDefinitions = definitions.filter(clip => clip.key.includes('gettysburg-v7'));
const address = (identity, direction, action, side = 'union') => prepared.find(clip => clip.side === side
  && clip.identity === identity && clip.direction === direction && clip.action === action);
const boardGroups = [{ side: 'union', identity: 'a', direction: 2 }, { side: 'union', identity: 'b', direction: 2 },
  { side: 'confederate', identity: 'a', direction: 6 }];
const completeBoard = boardGroups.every(group => ['ready', 'march', 'fire', 'reload']
  .every(action => address(group.identity, group.direction, action, group.side)));
const requireData = process.env.FORGE_REQUIRE_V7_DATA === '1';
const pendingFamily = { skip: completeBoard || requireData ? false : 'Pending real Union S A/B and Confederate N A action families; no synthetic sources' };
const requireBoard = () => assert.ok(completeBoard, 'real Union S A/B and Confederate N A ready/march/fire/reload sources are required');
const formationId = 'v7-identity-controls';
const idFor = identity => Array.from({ length: 256 }, (_, id) => id).find(id => gettysburgInfantryIdentity(formationId, id) === identity);
const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

// The fixture executes real syncFormation. Retained A source pixels are real;
// no future geometry, approval, texture, or source hash is manufactured. New
// S/N artwork tests remain pending until the real registry supplies coverage.
class Display {
  constructor() { Object.assign(this, { visible: true, alpha: 1, input: { enabled: true }, scaleX: 1, scaleY: 1 }); }
  setTexture(key, name) {
    const entry = atlases.get(key)?.frames[name];
    assert.ok(!atlases.has(key) || entry, `missing real candidate frame ${key}/${name}`);
    this.textureKey = key; this.frameName = name;
    this.frame = entry ? { pivotX: entry.pivot.x, pivotY: entry.pivot.y, realWidth: entry.frame.w, realHeight: entry.frame.h,
      customData: { bodyHeight: entry.bodyHeight } } : { pivotX: .5, pivotY: .98, realWidth: 100, realHeight: 100, customData: { bodyHeight: 450 } };
    return this;
  }
  setOrigin(x, y) { this.origin = { x, y }; return this; }
  setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setDepth(value) { this.depth = value; return this; }
  setVisible(value) { this.visible = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setAngle() { return this; } setFlipX() { return this; } setTint() { return this; }
  setText() { return this; } setDisplaySize() { return this; }
  disableInteractive() { this.input.enabled = false; return this; }
}
class Graphics {
  constructor() { this.ellipses = []; this.circles = []; }
  fillStyle(color, alpha) { this.style = { color, alpha }; return this; }
  fillEllipse(x, y, width, height) { this.ellipses.push({ x, y, width, height, ...this.style }); return this; }
  fillCircle(x, y, radius) { this.circles.push({ x, y, radius, ...this.style }); return this; }
  clear() { this.ellipses.length = 0; this.circles.length = 0; return this; }
}
const sceneSource = readFileSync(new URL('../src/battle/CivilWarBattlefield.jsx', import.meta.url), 'utf8');
const method = sceneSource.slice(sceneSource.indexOf('  syncFormation('), sceneSource.indexOf('  drawSelection('));
const Renderer = vm.runInNewContext(`(class {${method}})`, {
  updateFormationVisual: (state, formation, time, scale, options) => {
    const output = state.inspectionFigure ? { figures: [state.inspectionFigure], facing: formation.facing, moving: false }
      : updateActualFormationVisual(state, formation, time, scale, options);
    // Hit-area/standard placement is outside this identity test. Figures and
    // casualty/reformation state still come from the actual visual-state code.
    return { ...output, footprint: [] };
  },
  detailedInfantryPose,
  gettysburgInfantryClipPose: (...args) => {
    const pose = gettysburgInfantryClipPose(...args);
    // Exercise an inherited legacy hint without manufacturing candidate data.
    return pose && args[1]?.inheritedRearHint ? { ...pose, useLegacyRearAim: true } : pose;
  },
  deterministicUnitValue, formationStatusLabel,
  updateTravelDust: () => [], updatePeriodStandard() {},
});
function fixture({ identity = 'a', side = 'union', direction = 0, query = search, clips = aOnly, realVisual = false } = {}) {
  const formation = { id: formationId, side, type: 'infantry', active: true, x: 200, y: 200,
    strength: 100, initialStrength: 100, order: 'hold', status: 'steady', name: 'Test', ammunition: 50,
    lastVolleyAt: -Infinity, reload: 0, fatigue: 0, formationMode: 'line', frontage: 120, facing: direction * Math.PI / 4,
    footprint: { width: 120, depth: 40 } };
  const id = idFor(identity); assert.ok(Number.isInteger(id), `stable ${identity} figure exists`);
  const figure = { id, visible: true, frontRank: true, direction, action: 'idle', frame: 0, scale: .82, x: 200, y: 200, alpha: 1 };
  const soldiers = Array.from({ length: Math.max(32, id + 1) }, () => ({ sprite: new Display() }));
  const view = { soldiers, standard: new Display(), standardUI: null, hitArea: new Display(),
    label: new Display(), bar: new Display(), barBack: new Display(), condition: new Display(), flag: {},
    realistic: true, detailed: true, infantryFamily: false,
    visual: realVisual ? createFormationVisual(formation, 32) : { inspectionFigure: figure }, dust: {} };
  const scene = new Renderer();
  Object.assign(scene, { scenarioId: 'gettysburg', artPassSearch: query, infantryClips: clips, tactical: true,
    views: new Map([[formation.id, view]]), speed: 1, reducedMotion: false,
    cameras: { main: { zoom: 1 } }, shadows: new Graphics(), dust: new Graphics(), smoke: new Graphics() });
  const sync = (time = 1, resolving = false) => {
    if (!realVisual) formation.facing = figure.direction * Math.PI / 4;
    scene.smoke.clear(); scene.syncFormation(formation, time, resolving, []);
  };
  return { scene, formation, figure, view, soldier: soldiers[id], sprite: soldiers[id].sprite, sync };
}
function expectAccepted(f, soldier = f.soldier) {
  assert.ok(!soldier.sprite.textureKey.includes('gettysburg-v'), 'missing coverage keeps accepted art without identity or bearing substitution');
  assert.equal(soldier.clipAction, undefined); assert.equal(soldier.clipPhase, undefined);
}
function expectRealBinding(f, identity, action, phase) {
  const definition = address(identity, f.figure.direction, action, f.formation.side);
  assert.ok(definition);
  assert.equal(f.sprite.textureKey, definition.key); assert.equal(f.sprite.frameName, definition.frames[phase]);
  assert.deepEqual(f.sprite.origin, definition.pivots[phase]);
  const pose = gettysburgInfantryClipPose(f.formation.id, f.figure, 0, { side: f.formation.side, scenarioId: 'gettysburg', search,
    clips: f.scene.infantryClips, identity: 'a', versionedIdentity: true });
  assert.equal(pose.identity, identity);
  near(f.sprite.scaleX, 58 * f.figure.scale / definition.referenceHeight * pose.width);
  assert.equal(f.sprite.scaleX, f.sprite.scaleY);
}

test('exact v7 enables stable identity selection only for the historical Gettysburg query', () => {
  assert.equal(gettysburgInfantryClipsEnabled('gettysburg', search), true);
  for (const scenario of ['gettysburg_jackson', 'gettysburg_meade', 'first_manassas', null]) {
    assert.equal(gettysburgInfantryClipsEnabled(scenario, search), false);
    assert.deepEqual(gettysburgInfantryClipAssets(scenario, search), []);
  }
  for (const query of ['', '?artPass=gettysburg-v7-other', '?other=gettysburg-v7']) {
    assert.equal(gettysburgInfantryClipsEnabled('gettysburg', query), false);
    assert.deepEqual(gettysburgInfantryClipAssets('gettysburg', query), []);
  }
});

test('renderer identity stays deterministic across supported actions, bearings, times and frozen phases', () => {
  for (const identity of ['a', 'b']) {
    const f = fixture({ identity });
    for (const definition of retainedDefinitions) {
      f.figure.direction = definition.direction;
      f.figure.action = { ready: 'idle', march: 'walk', fire: 'fire', reload: 'reload' }[definition.action];
      for (const time of [1, 20, 500]) {
        for (let frame = 0; frame < 4; frame++) {
          f.figure.frame = frame; f.sync(time);
          assert.equal(gettysburgInfantryIdentity(f.formation.id, f.figure.id), identity);
          if (identity === 'b') expectAccepted(f);
          else assert.equal(f.sprite.textureKey, definition.key);
        }
      }
    }
    f.scene.speed = 0; f.sync(500, true);
    if (identity === 'b') expectAccepted(f);
  }
});

test('v3 through v6 retain explicit A even for a figure whose stable identity is B', () => {
  for (const version of ['v3', 'v4', 'v5', 'v6']) {
    const f = fixture({ identity: 'b', query: `?artPass=gettysburg-${version}` });
    f.figure.action = 'walk'; f.sync();
    assert.equal(f.sprite.textureKey, retainedDefinitions.find(clip => clip.direction === 0 && clip.action === 'march').key);
    assert.equal(f.soldier.clipAction, 'march');
  }
});

test('a missing B identity clears a previously rendered A phase and cannot reappear during paused fallback', () => {
  const f = fixture({ identity: 'b', query: '?artPass=gettysburg-v6' });
  Object.assign(f.figure, { action: 'reload', frame: 2 }); f.sync();
  assert.equal(f.soldier.clipPhase, 1);
  f.scene.artPassSearch = search; f.scene.speed = 0;
  f.sync(10); expectAccepted(f);
  for (const action of ['idle', 'walk', 'fire', 'reload']) { f.figure.action = action; f.sync(100); expectAccepted(f); }
});

test('actual formation losses and reforming preserve survivor IDs and stable A/B assignment', () => {
  const f = fixture({ realVisual: true });
  const initial = new Map(f.view.visual.figures.map(figure => [figure.id, gettysburgInfantryIdentity(f.formation.id, figure.id)]));
  assert.deepEqual([...new Set(initial.values())].sort(), ['a', 'b']);
  const check = () => {
    for (const figure of f.view.visual.output.figures.filter(figure => figure.visible && !figure.fallen)) {
      assert.equal(gettysburgInfantryIdentity(f.formation.id, figure.id), initial.get(figure.id));
      const soldier = f.view.soldiers[figure.id];
      if (initial.get(figure.id) === 'b') expectAccepted(f, soldier);
      else assert.ok(soldier.sprite.textureKey.includes('gettysburg-v'));
    }
  };
  f.sync(1); check();
  f.formation.strength = 75; f.sync(2); check();
  assert.equal(f.view.visual.figures.filter(figure => figure.alive).length, 24);
  Object.assign(f.formation, { formationMode: 'column', frontage: 40, footprint: { width: 40, depth: 120 } });
  f.sync(3); check();
  f.formation.facing = Math.PI / 4; f.sync(4); check();
  const survivors = f.view.visual.figures.filter(figure => figure.alive).map(figure => figure.id);
  f.scene.speed = 0; f.sync(4); check();
  assert.deepEqual(f.view.visual.figures.filter(figure => figure.alive).map(figure => figure.id), survivors);
});

test('candidate authored frames win over an inherited rear hint while accepted rear fire is unchanged', () => {
  const f = fixture();
  Object.assign(f.figure, { action: 'fire', inheritedRearHint: true }); f.sync();
  const fire = retainedDefinitions.find(clip => clip.direction === 0 && clip.action === 'fire');
  assert.equal(f.sprite.textureKey, fire.key); assert.equal(f.sprite.frameName, fire.frames[0]);
  f.figure.direction = 6; f.sync(); expectAccepted(f);
  assert.equal(f.sprite.textureKey, 'union-aim-realistic'); assert.equal(f.sprite.frameName, '3-6');
});

test('each registered new S/N source binds real native cells, geometry, hashes and review metadata', {
  skip: newDefinitions.length || requireData ? false : 'Pending reviewed S/N source registration',
}, () => {
  assert.ok(newDefinitions.length, 'no reviewed board-facing sources are registered');
  for (const key of new Set(newDefinitions.map(definition => definition.key))) {
    const atlas = atlases.get(key);
    const asset = assets.find(item => item.key === key);
    const bytes = readFileSync(new URL(`../public/${asset.image}`, import.meta.url));
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(bytes[25], 6, 'native RGBA PNG');
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    assert.equal(width % 2, 0); assert.equal(height % 2, 0);
    assert.deepEqual(atlas.meta.size, { w: width, h: height });
    assert.deepEqual(bytes, readFileSync(new URL(`../${atlas.meta.source}`, import.meta.url)));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), atlas.meta.sha256);
    assert.equal(atlas.meta.productionApproved, false);
    const cells = Object.values(atlas.frames);
    assert.equal(cells.length, 4, 'a reviewed native source exposes exactly four cells');
    assert.deepEqual(cells.map(entry => [entry.frame.x, entry.frame.y]).sort(),
      [[0, 0], [0, height / 2], [width / 2, 0], [width / 2, height / 2]].sort());
    for (const entry of cells) {
      assert.equal(entry.frame.w, width / 2); assert.equal(entry.frame.h, height / 2);
      assert.deepEqual(entry.sourceSize, { w: width / 2, h: height / 2 });
      assert.deepEqual(entry.spriteSourceSize, { x: 0, y: 0, w: width / 2, h: height / 2 });
      assert.equal(entry.trimmed, false); assert.equal(entry.rotated, false);
    }
  }
  for (const definition of newDefinitions) {
    assert.deepEqual(validateGettysburgInfantryClip(definition), []);
    assert.ok(prepared.some(clip => clip.key === definition.key && clip.action === definition.action));
    assert.ok(definition.frames.every(name => name.startsWith(`${definition.identity}-`)));
    const atlas = atlases.get(definition.key);
    assert.equal(definition.sourceHash, atlas.meta.sha256);
    for (const [phase, name] of definition.frames.entries()) {
      const entry = atlas.frames[name];
      assert.deepEqual(entry.pivot, definition.pivots[phase]);
      assert.equal(entry.bodyHeight, definition.referenceHeight);
    }
  }
});

test('real v7 coverage is retained Union A E/SE, Union S A/B and Confederate N A only', pendingFamily, () => {
  assert.equal(completeBoard, true);
  assert.equal(definitions.length, 20); assert.equal(prepared.length, 20); assert.equal(assets.length, 10);
  assert.equal(newDefinitions.length, 12); assert.equal(bDefinitions.length, 4);
  const keys = ['union-gettysburg-v7-a-march-s', 'union-gettysburg-v7-a-actions-s',
    'union-gettysburg-v7-b-march-s', 'union-gettysburg-v7-b-actions-s',
    'confederate-gettysburg-v7-a-march-n', 'confederate-gettysburg-v7-a-actions-n'];
  assert.deepEqual([...new Set(newDefinitions.map(clip => clip.key))].sort(), keys.sort());
  assert.ok(bDefinitions.every(clip => clip.direction === 2));
  assert.ok(definitions.filter(clip => clip.side === 'confederate').every(clip => clip.direction === 6 && clip.identity === 'a'));
  for (const retained of retainedDefinitions) {
    const current = address(retained.identity, retained.direction, retained.action, retained.side);
    for (const field of ['key', 'frames', 'sourceHash', 'referenceHeight', 'pivots', 'muzzles']) assert.deepEqual(current[field], retained[field]);
  }
  for (const group of boardGroups) {
    const reference = address(group.identity, group.direction, 'ready', group.side).referenceHeight;
    for (const action of ['ready', 'fire', 'reload']) assert.equal(address(group.identity, group.direction, action, group.side).referenceHeight, reference);
    assert.equal(address(group.identity, group.direction, 'fire', group.side).muzzles.length, 1);
  }
  assert.equal(address('b', 0, 'march'), undefined); assert.equal(address('b', 1, 'march'), undefined);
  assert.equal(address('b', 6, 'march', 'confederate'), undefined);
});

test('real source annotations bind each new stationary reference, root and barrel mouth without invented geometry', pendingFamily, () => {
  requireBoard();
  const record = JSON.parse(readFileSync(new URL('../docs/art-pass/manifests/gettysburg-v7-source-annotations.json', import.meta.url)));
  const normalized = (value, cell) => Math.round(value / cell * 1e6) / 1e6;
  for (const key of new Set(newDefinitions.map(clip => clip.key))) {
    const atlas = atlases.get(key);
    const annotation = record.sources.find(source => source.source === atlas.meta.source && source.sha256 === atlas.meta.sha256);
    assert.ok(annotation, `recorded real source measurement required for ${key}`);
    assert.equal(annotation.cell * 2, atlas.meta.size.w); assert.equal(annotation.cell * 2, atlas.meta.size.h);
    for (const [action, cells] of annotation.actions) {
      const definition = address(annotation.identity, annotation.direction, action, annotation.side);
      assert.equal(definition.key, key); assert.equal(definition.referenceHeight, annotation.referenceHeight);
      for (const [phase, index] of cells.entries()) {
        assert.deepEqual(atlas.frames[definition.frames[phase]].frame, { x: index % 2 * annotation.cell,
          y: Math.floor(index / 2) * annotation.cell, w: annotation.cell, h: annotation.cell });
        assert.deepEqual(definition.pivots[phase], { x: normalized(annotation.roots[index][0], annotation.cell),
          y: normalized(annotation.roots[index][1], annotation.cell) });
      }
      if (action === 'fire') assert.deepEqual(definition.muzzles[0], { x: normalized(annotation.muzzle[0], annotation.cell),
        y: normalized(annotation.muzzle[1], annotation.cell) });
    }
  }
});

test('real v7 reviewer studies preserve the source measurements and named semantic cell ordering', pendingFamily, () => {
  requireBoard();
  const record = JSON.parse(readFileSync(new URL('../docs/art-pass/manifests/gettysburg-v7-source-annotations.json', import.meta.url)));
  for (const key of new Set(newDefinitions.map(clip => clip.key))) {
    const atlas = atlases.get(key);
    const annotation = record.sources.find(source => source.source === atlas.meta.source && source.sha256 === atlas.meta.sha256);
    assert.ok(annotation, key);
    const actions = Object.fromEntries(annotation.actions);
    const kind = Object.hasOwn(actions, 'march') ? 'march' : 'actions';
    if (kind === 'march') {
      assert.deepEqual(Object.keys(actions), ['march']);
      assert.deepEqual([...actions.march].sort(), [0, 1, 2, 3], 'a march maps four chronological phases to four distinct native cells');
    } else assert.deepEqual(actions, { ready: [0], fire: [1], reload: [2, 3] }, 'named stationary playback requires recorded ready/fire/load/ram cells');
    const logicalCells = kind === 'march' ? actions.march : [actions.ready[0], actions.fire[0], ...actions.reload];
    const prefix = annotation.side === 'confederate' ? 'confederate-n' : annotation.identity === 'b' ? 'union-b-s' : 'union-s';
    const matches = GETTYSBURG_MOTION_STUDIES.filter(study => study.id === `${prefix}-${kind}-v7`);
    assert.equal(matches.length, 1, `unique source role required: ${prefix}-${kind}-v7`);
    const study = matches[0];
    assert.notEqual(study.status, 'rejected'); assert.equal(study.approved, false);
    assert.equal(study.source, `/${annotation.source}`); assert.equal(study.receipt, `/${atlas.meta.measurementReview}`);
    assert.deepEqual([study.width, study.height, study.columns, study.rows], [annotation.cell * 2, annotation.cell * 2, 2, 2]);
    assert.equal(study.referenceHeight, annotation.referenceHeight); assert.equal(study.phases.length, 4);
    for (const [phase, nativeIndex] of logicalCells.entries()) {
      assert.deepEqual(getGettysburgMotionStudyCell(study, phase), { x: nativeIndex % 2 * annotation.cell,
        y: Math.floor(nativeIndex / 2) * annotation.cell, w: annotation.cell, h: annotation.cell });
      const [x, y] = annotation.roots[nativeIndex];
      const root = study.phaseRoots?.[phase] || study.root;
      near(root.x, x / annotation.cell, 1e-6); near(root.y, y / annotation.cell, 1e-6);
    }
  }
});

test('actual v7 preload requests ten unique atlases only on exact opt-in and retains every accepted fallback', pendingFamily, () => {
  requireBoard();
  const preload = sceneSource.slice(sceneSource.indexOf('  preload() {'), sceneSource.indexOf('  create() {'));
  const collect = (query, scenario = 'gettysburg', base = '/') => {
    const Loader = vm.runInNewContext(`(class {${preload}})`, {
      gettysburgInfantryFamilyAssets, gettysburgInfantryClipAssets, DETAILED_UNIT_PAGES, detailedUnitAssetDirectory,
      siegeTargetAssets: () => [], siegeTerrainAssets: () => [], landmarkField: () => ({ landmarks: [] }), PUBLIC_BASE: base,
    });
    const loader = new Loader(); const requests = [];
    Object.assign(loader, { scenarioId: scenario, artPassSearch: query, engine: { fieldBattle: false, snapshot: () => ({}) },
      config: { terrain: { key: 'terrain', src: 'images/battles/gettysburg-terrain-v3.png' } },
      load: { image(key, image) { requests.push({ kind: 'image', key, image }); },
        json(key, json) { requests.push({ kind: 'json', key, json }); },
        atlas(key, image, json) { requests.push({ kind: 'atlas', key, image, json }); } } });
    loader.preload(); return requests;
  };
  for (const base of ['/', '/nested-game/']) {
    const normal = collect('', 'gettysburg', base); const candidate = collect(search, 'gettysburg', base);
    const candidateAtlases = candidate.filter(request => assets.some(asset => request.key === asset.key));
    assert.equal(candidateAtlases.length, 10); assert.equal(new Set(candidateAtlases.map(request => request.key)).size, 10);
    assert.deepEqual(candidateAtlases, gettysburgInfantryClipAssets('gettysburg', search, base).map(asset => ({ kind: 'atlas', ...asset })));
    for (const request of normal) assert.ok(candidate.some(item => JSON.stringify(item) === JSON.stringify(request)), 'accepted fallback preload is unchanged');
    assert.ok(!normal.some(request => /\/gettysburg-v[3-7]\//.test(request.image || request.json || '')));
    const v6 = collect('?artPass=gettysburg-v6', 'gettysburg', base);
    const added = candidateAtlases.filter(request => !v6.some(previous => previous.key === request.key));
    assert.equal(added.length, 6); assert.ok(added.every(request => request.image.startsWith(`${base}images/units/gettysburg-v7/`)));
  }
  for (const scenario of ['gettysburg_jackson', 'gettysburg_meade', 'first_manassas', 'shiloh']) {
    assert.ok(!collect(search, scenario).some(request => /\/gettysburg-v[3-7]\//.test(request.image || request.json || '')));
  }
  for (const query of ['?artPass=gettysburg-v7-other', '?other=gettysburg-v7']) {
    assert.ok(!collect(query).some(request => /\/gettysburg-v[3-7]\//.test(request.image || request.json || '')));
  }
});

test('actual scene create initialization prepares real loaded clips and withholds an incomplete B loading action', pendingFamily, () => {
  requireBoard();
  const start = sceneSource.indexOf('  create() {');
  const end = sceneSource.indexOf('    createStandardTextures(this);', start);
  assert.ok(start >= 0 && end > start);
  // Execute the actual clip-initialization prefix, before unrelated cameras,
  // UI and game input. Texture frames come only from the real registered JSON.
  const initializer = `${sceneSource.slice(start, end)}  }`;
  const Initializer = vm.runInNewContext(`(class {${initializer}})`, {
    createDetailedUnitTextures() {}, prepareGettysburgInfantryClips, gettysburgInfantryClipDefinitions,
  });
  const initialize = (query, available) => {
    const scene = new Initializer();
    Object.assign(scene, { scenarioId: 'gettysburg', artPassSearch: query,
      textures: { exists: key => textures.exists(key), get: key => ({ customData: textures.get(key).customData,
        has: name => textures.get(key).has(name) && available(key, name) }) } });
    scene.create(); return scene.infantryClips;
  };
  assert.equal(initialize(search, () => true).length, 20);
  assert.equal(initialize('', () => true).length, 0);
  const reload = address('b', 2, 'reload');
  const incomplete = initialize(search, (key, name) => !(key === reload.key && name === reload.frames[1]));
  assert.equal(incomplete.length, 19);
  assert.ok(!incomplete.some(clip => clip.side === 'union' && clip.identity === 'b' && clip.direction === 2 && clip.action === 'reload'));
  const f = fixture({ identity: 'b', direction: 2, clips: incomplete });
  f.figure.action = 'reload';
  for (let frame = 0; frame < 4; frame++) { f.figure.frame = frame; f.sync(); expectAccepted(f); }
  f.figure.action = 'fire'; f.sync(); expectRealBinding(f, 'b', 'fire', 0);
});

test('actual renderer selects all real Union S A/B and Confederate N A action phases, pause and reduced motion', pendingFamily, () => {
  requireBoard();
  for (const group of boardGroups) {
    // Confederate deliberately uses a figure hashing B: the scene must keep A.
    const hashIdentity = group.side === 'confederate' ? 'b' : group.identity;
    const f = fixture({ ...group, identity: hashIdentity, clips: prepared });
    const contact = gettysburgInfantryContactPhase(f.formation.id, f.figure.id);
    const scales = [];
    for (const [action, frame, page, phase] of [['idle', 0, 'ready', 0], ['walk', 0, 'march', contact],
      ['walk', 1, 'march', (1 + contact) % 4], ['walk', 2, 'march', (2 + contact) % 4], ['walk', 3, 'march', (3 + contact) % 4],
      ['fire', 3, 'fire', 0], ['reload', 0, 'reload', 0], ['reload', 1, 'reload', 0], ['reload', 2, 'reload', 1], ['reload', 3, 'reload', 1]]) {
      Object.assign(f.figure, { action, frame }); f.sync(100); expectRealBinding(f, group.identity, page, phase);
      if (page !== 'march') scales.push(f.sprite.scaleX);
      assert.equal(gettysburgInfantryIdentity(f.formation.id, f.figure.id), hashIdentity);
    }
    assert.ok(scales.every(scale => scale === scales[0]), 'one stationary reference prevents per-action resizing');
    f.scene.speed = 0; f.figure.frame = 0; f.sync(200); expectRealBinding(f, group.identity, 'reload', 1);
    f.sync(250, true); expectRealBinding(f, group.identity, 'reload', 1);
    f.scene.reducedMotion = true; f.sync(300); expectRealBinding(f, group.identity, 'reload', 0);
    f.figure.action = 'walk'; f.sync(350); expectRealBinding(f, group.identity, 'march', contact);
  }
});

test('real Union B S identity survives losses, reformation and S to E/SE fallback without choosing A', pendingFamily, () => {
  requireBoard();
  const f = fixture({ direction: 2, clips: prepared, realVisual: true });
  const initial = new Map(f.view.visual.figures.map(figure => [figure.id, gettysburgInfantryIdentity(f.formation.id, figure.id)]));
  const check = () => {
    for (const figure of f.view.visual.output.figures.filter(figure => figure.visible && !figure.fallen)) {
      const identity = initial.get(figure.id);
      assert.equal(gettysburgInfantryIdentity(f.formation.id, figure.id), identity);
      const soldier = f.view.soldiers[figure.id];
      const action = { idle: 'ready', walk: 'march', route: 'march', fire: 'fire', reload: 'reload' }[figure.action];
      const definition = address(identity, figure.direction, action);
      if (!definition) expectAccepted(f, soldier);
      else assert.equal(soldier.sprite.textureKey, definition.key);
    }
  };
  f.sync(1); check(); f.formation.strength = 75; f.sync(2); check();
  assert.equal(f.view.visual.figures.filter(figure => figure.alive).length, 24);
  Object.assign(f.formation, { formationMode: 'column', frontage: 40, footprint: { width: 40, depth: 120 } });
  f.sync(3); check();
  for (const facing of [0, Math.PI / 4, Math.PI / 2]) { f.formation.facing = facing; f.sync(4); check(); }
  const survivors = f.view.visual.figures.filter(figure => figure.alive).map(figure => figure.id);
  f.scene.speed = 0; f.sync(4); check();
  assert.deepEqual(f.view.visual.figures.filter(figure => figure.alive).map(figure => figure.id), survivors);
});

test('missing B phases, wrong side/bearing and previous versions return accepted art and clear retained state', pendingFamily, () => {
  requireBoard();
  const reload = address('b', 2, 'reload');
  const incomplete = prepareGettysburgInfantryClips(definitions, (key, name) => hasFrame(key, name)
    && !(key === reload.key && name === reload.frames[1]));
  const f = fixture({ identity: 'b', direction: 2, clips: prepared });
  Object.assign(f.figure, { action: 'reload', frame: 2 }); f.sync(); expectRealBinding(f, 'b', 'reload', 1);
  f.scene.infantryClips = incomplete;
  for (let frame = 0; frame < 4; frame++) { f.figure.frame = frame; f.sync(); expectAccepted(f); }
  f.figure.action = 'fire'; f.sync(); expectRealBinding(f, 'b', 'fire', 0);
  const loadingTurn = fixture({ identity: 'b', direction: 2, clips: prepared });
  Object.assign(loadingTurn.figure, { action: 'reload', frame: 2 }); loadingTurn.sync(); expectRealBinding(loadingTurn, 'b', 'reload', 1);
  loadingTurn.scene.speed = 0; loadingTurn.figure.direction = 0; loadingTurn.sync(200); expectAccepted(loadingTurn);
  loadingTurn.figure.direction = 2; loadingTurn.sync(300); expectRealBinding(loadingTurn, 'b', 'reload', 0);
  for (const direction of [0, 1, 6, 3, 4, 5, 7]) {
    const turned = fixture({ identity: 'b', direction: 2, clips: prepared }); turned.sync();
    turned.scene.speed = 0; turned.figure.direction = direction; turned.sync(200); expectAccepted(turned);
    turned.figure.direction = 2; turned.sync(300); expectRealBinding(turned, 'b', 'ready', 0);
  }
  for (const sideDirection of [{ side: 'union', direction: 6 }, { side: 'confederate', direction: 2 },
    { side: 'confederate', direction: 0 }, { side: 'confederate', direction: 1 }]) {
    const wrong = fixture({ ...sideDirection, clips: prepared }); wrong.sync(); expectAccepted(wrong);
  }
  for (const change of [{ action: 'melee' }, { action: 'fall', fallen: true }]) {
    const unsupported = fixture({ identity: 'b', direction: 2, clips: prepared }); unsupported.sync();
    Object.assign(unsupported.figure, change); unsupported.sync(); expectAccepted(unsupported);
  }
  for (const version of ['v3', 'v4', 'v5', 'v6']) {
    for (const group of boardGroups) {
      const older = fixture({ ...group, query: `?artPass=gettysburg-${version}`, clips: prepared }); older.sync(); expectAccepted(older);
    }
  }
});

test('real S/N muzzle anchors place candidate flash and smoke at each measured mouth and retain the volley origin', pendingFamily, () => {
  requireBoard();
  for (const group of boardGroups) {
    const f = fixture({ ...group, clips: prepared });
    f.figure.action = 'fire'; f.formation.lastVolleyAt = 10; f.sync(10); expectRealBinding(f, group.identity, 'fire', 0);
    const fire = address(group.identity, group.direction, 'fire', group.side);
    const mouth = { x: f.figure.x + (fire.muzzles[0].x - fire.pivots[0].x) * f.sprite.frame.realWidth * f.sprite.scaleX,
      y: f.figure.y + (fire.muzzles[0].y - fire.pivots[0].y) * f.sprite.frame.realHeight * f.sprite.scaleY };
    near(f.soldier.clipVolleyMuzzle.x, mouth.x); near(f.soldier.clipVolleyMuzzle.y, mouth.y);
    assert.equal(f.scene.smoke.circles.length, 1); assert.equal(f.scene.smoke.ellipses.length, 3);
    near(f.scene.smoke.circles[0].x, mouth.x); near(f.scene.smoke.circles[0].y, mouth.y);
    f.sync(10.05); const age = 10.05 - 10;
    near(f.scene.smoke.ellipses[0].x, mouth.x + Math.cos(group.direction * Math.PI / 4) * age * 14 * .82);
    near(f.scene.smoke.ellipses[0].y, mouth.y - age * 9);
    Object.assign(f.figure, { action: 'reload', frame: 2, x: 220, y: 220 }); f.sync(10.25);
    near(f.soldier.clipVolleyMuzzle.x, mouth.x); near(f.soldier.clipVolleyMuzzle.y, mouth.y);
    f.figure.action = 'fire'; f.formation.lastVolleyAt = 20; f.scene.reducedMotion = true; f.sync(20.05);
    assert.equal(f.scene.smoke.circles.length, 0); assert.equal(f.scene.smoke.ellipses.length, 3);
    f.scene.reducedMotion = false; f.sync(20.05, true);
    assert.equal(f.scene.smoke.circles.length, 0); assert.equal(f.scene.smoke.ellipses.length, 0);
  }
});
