import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadFieldSuspension } from '../src/game/fieldSuspendSave.js';
import { closeCombatDistance } from '../src/battle/closeCombat.js';
import { drawAll } from './test-support/gettysburgV35Regression.mjs';
import { dustHarness, dustQuery, dustFacts, stepScene, plain, sha } from './test-support/gettysburgV36Regression.mjs';

// Actual current Scene/native clip modules and Phaser atlas parsing in the
// existing same-realm display recorder. These checks do not prove pixels,
// human readability, browser behavior or a repair of the v36 raster anomaly.
const root = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const beforePath = root + '/scripts/test-support/gettysburg-v37-before/src/battle/CivilWarBattlefield.jsx';
const beforeSource = readFileSync(beforePath, 'utf8');
assert.equal(sha(beforeSource), '6e3e7db89428b1d87db551a5945b92e96b88fd2dac3ffdd26023b761efdc166a');
const current = await dustHarness(root), before = await dustHarness(root, { source: beforeSource });
const capturedBytes = readFileSync(root + '/scripts/fixtures/gettysburg-v36-owned-save.json');
assert.equal(sha(capturedBytes), 'c70c58c96ca47705742dfd19fc88436e6d56613113fe70189e5501736ef6b300');
const captured = JSON.parse(capturedBytes), loaded = loadFieldSuspension({ getItem: key => captured.values[key] ?? null });
assert.equal(loaded.error, null); assert.ok(loaded.pending);
const context = loaded.pending, original = plain(context.checkpoint);
const ownedOptions = { campaign: context.resumeState, scenarioId: context.battle.id, choiceId: context.choiceId };
const ids = ['gibbon-center', 'pickett-division'];
const query = ({ rank = true, ...options } = {}) => dustQuery(options) + (rank ? '&rankReadability=v37' : '');
const owned = (harness, search, checkpoint = original, extra = {}) => harness.make(plain(checkpoint), { ...ownedOptions, query: search, ...extra });
const draw = (harness, scene) => { scene.update(0, 0); return dustFacts(harness, scene); };
const facts = scene => dustFacts(current, scene);
const smallQuery = search => search.replace(/&rankReadability=v37$/, '').replace('infantryScale=moderate', 'infantryScale=small');
const rawBodies = scene => ids.flatMap(id => scene.views.get(id).visual.output.figures.filter(body => body.visible));

// Body offsets/scales, projected shadows and fresh muzzle/smoke origins
// intentionally vary with size. Every other recorded native, raw, standard, cloth and combat fact must
// remain exact, including slot membership, raw feet, body depth and art frame.
function sizeIndependent(value) {
  const { graphics: { smoke, shadows, ...graphics }, formations, ...rest } = value;
  return { ...rest, graphics, formations: formations.map(({ bodies, shots, ...formation }) => ({ ...formation,
    bodies: bodies.map(({ x, y, scaleX, scaleY, ...body }) => body) })) };
}
function equivalent(compact, small, moderate, label) {
  assert.deepEqual(facts(compact), facts(small), label + ': current gated geometry equals existing small profile');
  assert.deepEqual(sizeIndependent(facts(compact)), sizeIndependent(facts(moderate)), label + ': feet, slots, frames, depths, standards, cloth and combat unchanged');
  assert.equal(compact.infantryPresentationScale, .74);
  assert.equal(small.infantryPresentationScale, .74);
  assert.equal(moderate.infantryPresentationScale, .86);
  for (const id of ids) {
    const a = compact.views.get(id), b = moderate.views.get(id);
    for (let index = 0; index < a.soldiers.length; index++) {
      const body = a.soldiers[index].sprite, old = b.soldiers[index].sprite;
      if (!body.visible) continue;
      assert.ok(Number.isFinite(body.scaleX) && body.scaleX > 0, label + ': parsed visible scale');
      assert.ok(Math.abs(body.scaleX / old.scaleX - .74 / .86) < 1e-12, label + ': uniform width');
      assert.ok(Math.abs(body.scaleY / old.scaleY - .74 / .86) < 1e-12, label + ': uniform height');
      assert.equal(body.frame, current.textures.get(body.textureKey).get(body.frameName), label + ': actual parsed atlas frame');
    }
  }
}

// Explicit synthetic diagnostic inputs; production updater and Scene decide
// all slots, feet, art, shot origins and standards. No historical fixture edit.
function controlled(search, direction, { reducedMotion = false } = {}) {
  const scene = current.make(null, { query: search, all: false, reducedMotion });
  const theta = direction * Math.PI / 4;
  scene.engine.time = 10;
  for (const formation of scene.engine.state) formation.active = ids.includes(formation.id);
  for (const [index, id] of ids.entries()) Object.assign(scene.engine.state.find(formation => formation.id === id), {
    strength: 3000, initialStrength: 3000, morale: 90, cohesion: 90, fatigue: 0,
    status: 'steady', order: 'hold', formationMode: 'line', frontage: 150,
    ammunition: 40, active: true, arrivalTime: null, reload: 0, lastVolleyAt: null,
    facing: theta + index * Math.PI, inMelee: false, meleeWith: null, engagedWith: null,
    x: 400 + index * 200 * Math.cos(theta), y: 400 + index * 200 * Math.sin(theta),
  });
  for (const formation of scene.engine.snapshot({ presentation: true }).formations) scene.createFormation(formation);
  scene.speed = 1;
  drawAll(scene);
  return scene;
}
const units = scene => ids.map(id => scene.engine.state.find(formation => formation.id === id));
function volley(scene, at, age, reload) {
  scene.engine.time = at + age;
  for (const [index, formation] of units(scene).entries()) Object.assign(formation, {
    lastVolleyAt: at, reload, status: 'firing', order: 'hold', inMelee: false,
    meleeWith: null, engagedWith: ids[1 - index],
  });
  drawAll(scene);
}
function contact(scene, direction) {
  const [union, confederate] = units(scene), theta = direction * Math.PI / 4;
  scene.engine.time += .2;
  for (const [formation, foe] of [[union, confederate], [confederate, union]]) Object.assign(formation, {
    lastVolleyAt: null, reload: 0, inMelee: true, meleeWith: foe.id, engagedWith: foe.id, status: 'fighting',
  });
  Object.assign(union, { x: 400, y: 400 });
  const separation = closeCombatDistance(union, confederate) - 1;
  Object.assign(confederate, { x: 400 + separation * Math.cos(theta), y: 400 + separation * Math.sin(theta) });
  drawAll(scene);
}

const stages = [
  ['fire-early', .14, 19.86], ['fire-late', .39, 19.61],
  ['reload-early', .72, 19.28], ['reload-middle', 10, 10], ['reload-late', 18, 2],
];

test('current physical Scene and authentic v36 source are bound without changing the portable owned input', () => {
  assert.equal(current.source, readFileSync(root + '/src/battle/CivilWarBattlefield.jsx', 'utf8'));
  assert.equal(before.source, beforeSource);
  assert.equal(original.state.time, 46.74999999999948);
  assert.equal(sha(readFileSync(root + '/scripts/fixtures/gettysburg-v36-owned-save.json')), sha(capturedBytes));
  assert.equal(before.make(null, { query: query(), all: false }).rankReadabilityEnabled, undefined);
});

test('absent, duplicate, encoded, wrong-version and unknown v37 selectors retain authentic v36 facts and checkpoints', () => {
  const good = query({ contact: true });
  const disabled = [
    query({ rank: false, contact: true }), good.replace('rankReadability=v37', 'rankReadability=v36'),
    good.replace('rankReadability=v37', 'rankReadability=unknown'), good.replace('rankReadability=v37', 'rankReadability='),
    good.replace('rankReadability=v37', 'rankReadability=V37'), good.replace('rankReadability=v37', 'rankReadability=v370'),
    good.replace('rankReadability=v37', 'rankReadability=v37=extra'), good + '&rankReadability=v37', good + '&rankReadability=off',
    good.replace('rankReadability=v37', 'rankReadability=%76%33%37'), good.replace('rankReadability=v37', 'rank%52eadability=v37'),
    good.replace('artPass=gettysburg-v32', 'artPass=gettysburg-v31'), good.replace('artPass=gettysburg-v32', 'artPass=%67ettysburg-v32'),
    good + '&artPass=gettysburg-v32', good + '&artPass=unknown', good + '&unrelated=%31',
  ];
  for (const search of disabled) {
    const scene = owned(current, search), authentic = owned(before, search);
    assert.equal(scene.rankReadabilityEnabled, false, search);
    assert.deepEqual(draw(current, scene), draw(before, authentic), search + ': authentic disabled facts');
    assert.deepEqual(plain(scene.checkpoint()), plain(authentic.checkpoint()), search + ': authentic disabled checkpoint');
  }
});

test('canonical reordered v37 gate is independent of all sixteen v33-v36 continuity combinations', () => {
  for (const contact of [false, true]) for (const standard of [false, true])
    for (const animation of [false, true]) for (const dust of [false, true]) {
      const search = query({ contact, standard, animation, dust });
      const scene = owned(current, search), small = owned(current, smallQuery(search));
      assert.equal(scene.rankReadabilityEnabled, true);
      assert.equal(scene.contactLayoutEnabled, contact); assert.equal(scene.standardContinuityEnabled, standard);
      assert.equal(scene.animationContinuityEnabled, animation); assert.equal(scene.dustContinuityEnabled, dust);
      assert.deepEqual(draw(current, scene), draw(current, small), search + ': independent native geometry');
      assert.deepEqual(plain(scene.checkpoint()), plain(small.checkpoint()), search + ': no new checkpoint format');
    }
  for (const search of ['?rankReadability=v37&artPass=gettysburg-v32', '?artPass=gettysburg-v32&rankReadability=v37&unrelated=1']) {
    const scene = owned(current, search); assert.equal(scene.rankReadabilityEnabled, true); assert.equal(scene.infantryPresentationScale, .74);
  }
});

test('other battles and unsupported art-pass versions cannot activate compact rank readability', () => {
  for (const scenarioId of ['first_manassas', 'shiloh', 'third_winchester']) {
    const scene = current.make(null, { query: query(), scenarioId, all: false });
    const authentic = before.make(null, { query: query(), scenarioId, all: false });
    assert.equal(scene.rankReadabilityEnabled, false, scenarioId);
    assert.equal(scene.infantryPresentationScale, authentic.infantryPresentationScale);
    assert.deepEqual(plain(scene.checkpoint()), plain(authentic.checkpoint()), scenarioId + ': exact combat/empty presentation');
  }
});

for (let direction = 0; direction < 8; direction++) test(`bearing ${direction}: both armies keep raw ranks through every pose while gated bodies match existing small`, () => {
  for (const contactEnabled of [false, true]) {
    const search = query({ contact: contactEnabled });
    const scenes = [controlled(search, direction), controlled(smallQuery(search), direction), controlled(search.replace('&rankReadability=v37', ''), direction)];
    const check = label => equivalent(...scenes, `bearing ${direction}, contact ${contactEnabled}, ${label}`);
    check('idle'); assert.ok(rawBodies(scenes[0]).some(body => body.action === 'idle'));
    for (const scene of scenes) {
      scene.engine.time += .2;
      for (const formation of units(scene)) { formation.x += 20 * Math.cos(formation.facing); formation.y += 20 * Math.sin(formation.facing); }
      drawAll(scene);
    }
    check('march'); assert.ok(rawBodies(scenes[0]).some(body => body.action === 'walk'));
    for (const [name, age, reload] of stages) {
      for (const scene of scenes) volley(scene, 20, age, reload);
      check(name);
      assert.ok(rawBodies(scenes[0]).some(body => body.action === (name.startsWith('fire') ? 'fire' : 'reload')), name + ': actual action present');
      if (name === 'fire-early') for (const id of ids) assert.ok(scenes[0].views.get(id).shots.figures.length > 0, id + ': real fresh volley recorded');
    }
    for (const scene of scenes) contact(scene, direction);
    check('melee'); assert.ok(rawBodies(scenes[0]).some(body => body.action === 'melee'));
    const fallTime = scenes[0].engine.time + .01;
    for (const scene of scenes) { scene.engine.time = fallTime; for (const formation of units(scene)) formation.strength *= .7; drawAll(scene); }
    for (const age of [0, .2, .4, .65]) {
      for (const scene of scenes) { scene.engine.time = fallTime + age; drawAll(scene); }
      check('fall age ' + age); assert.ok(rawBodies(scenes[0]).some(body => body.fallen && body.action === 'fall'), 'actual casualty path present');
    }
    // Confederate mode uses the actual engine command; Union mode is an
    // explicit diagnostic input. The real snapshot/updater derive footprints
    // and moving slots for both sides, with no overwritten visual output.
    const reform = [controlled(search, direction), controlled(smallQuery(search), direction), controlled(search.replace('&rankReadability=v37', ''), direction)];
    for (const scene of reform) {
      scene.setSelected('pickett-division'); scene.setFormation('column');
      units(scene)[0].formationMode = 'column';
    }
    for (const age of [.05, .25, .8, 1.5]) {
      for (const scene of reform) { scene.engine.time = 10 + age; drawAll(scene); }
      equivalent(...reform, `bearing ${direction}, contact ${contactEnabled}, column reform ${age}`);
      assert.ok(units(reform[0]).every(formation => formation.formationMode === 'column'));
    }
    assert.ok(ids.every(id => reform[0].views.get(id).visual.figures.some(figure => figure.stepDistance > 0)), 'both armies actually moved slots during reform');
  }
});

test('all eight bearings retain compact geometry and raw/flag/combat preservation under reduced motion and resolution', () => {
  for (let direction = 0; direction < 8; direction++) for (const reducedMotion of [false, true]) {
    const search = query({ contact: true });
    const scenes = [controlled(search, direction, { reducedMotion }), controlled(smallQuery(search), direction, { reducedMotion }),
      controlled(search.replace('&rankReadability=v37', ''), direction, { reducedMotion })];
    for (const scene of scenes) { contact(scene, direction); for (const formation of units(scene)) formation.strength *= .8; scene.engine.time += .05; drawAll(scene); }
    equivalent(...scenes, `bearing ${direction}, reduced ${reducedMotion}, casualties`);
    for (const scene of scenes) { scene.engine.beginResolution('defeat'); scene.engine.resolutionTime = .4; drawAll(scene); }
    equivalent(...scenes, `bearing ${direction}, reduced ${reducedMotion}, resolving`);
    assert.ok(scenes[0].engine.pendingOutcome);
  }
});

test('owned combat saves preserve gated native facts through pre-draw re-save, idle, zoom, reload and further movement', () => {
  for (const contact of [false, true]) for (const reducedMotion of [false, true]) {
    const search = query({ contact }), warm = owned(current, search, original, { reducedMotion });
    draw(current, warm); stepScene(warm, 50, 24);
    const expected = facts(warm), saved = plain(warm.checkpoint());
    const cold = owned(current, search, saved, { reducedMotion });
    for (let count = 0; count < 3; count++) assert.deepEqual(plain(cold.checkpoint()), saved, 'non-drawing checkpoint remains exact');
    assert.deepEqual(draw(current, cold), expected, 'first gated cold draw');
    cold.update(0, 0); assert.deepEqual(facts(cold), expected, 'cached idle');
    cold.cameras.main.zoom += .01; cold.update(0, 0); assert.deepEqual(facts(cold), expected, 'paused zoom');
    const resaved = plain(cold.checkpoint()); assert.deepEqual(resaved, saved, 're-save does not add rank metadata');
    assert.deepEqual(draw(current, owned(current, search, resaved, { reducedMotion })), expected, 'second cold reload');
    const priorTime = warm.engine.time;
    for (let tick = 0; tick < 32; tick++) {
      stepScene(warm, 50); stepScene(cold, 50);
      assert.deepEqual(facts(cold), facts(warm), `contact ${contact}, reduced ${reducedMotion}, continued tick ${tick}`);
    }
    assert.ok(warm.engine.time > priorTime, 'actual engine continued');
    assert.ok(facts(warm).formations.some(formation => formation.raw?.moving), 'actual further movement was covered');
  }
});

test('resolving gated saves rebuild the same compact casualties and continue the actual resolution', () => {
  const search = query({ contact: true }), warm = owned(current, search);
  draw(current, warm); stepScene(warm, 50, 24); warm.engine.beginResolution('defeat'); warm.engine.resolutionTime = .2; warm.emitSnapshot();
  const expected = draw(current, warm), saved = plain(warm.checkpoint()), cold = owned(current, search, saved);
  assert.ok(saved.presentation.travelDust.formations.every(record => record.dust === null), 'v36 resolving checkpoint intentionally stores no live trail');
  const rendered = value => {
    assert.equal(value.graphics.dust.length, 0, 'resolution draws no travel dust');
    return { ...value, dustStates: value.dustStates.map(record => {
      if (!Array.isArray(record.state.puffs)) return record;
      assert.equal(record.state.puffs.length, 0, 'resolution retains no visible puffs');
      // Existing v36 cold reconstruction drops these inert counters because
      // the resolving checkpoint deliberately stores null trail records.
      // Position, time, puffs and every raw/rendered/combat fact stay exact.
      const { emittedAt, serial, ...state } = record.state;
      return { ...record, state };
    }) };
  };
  assert.deepEqual(rendered(draw(current, cold)), rendered(expected));
  for (let tick = 0; tick < 8; tick++) { stepScene(warm, 50); stepScene(cold, 50); assert.deepEqual(rendered(facts(cold)), rendered(facts(warm)), 'resolution tick ' + tick); }
});

test('cross-profile saves retain historical world-shot origins and use compact geometry only for a subsequent fresh volley', () => {
  for (let direction = 0; direction < 8; direction++) for (const profile of ['baseline', 'moderate', 'small']) {
    const search = query({ rank: false, contact: true, profile }), source = controlled(search, direction);
    volley(source, 10, .14, 19.86);
    const saved = plain(source.checkpoint()), historical = ids.map(id => plain(source.views.get(id).shots));
    assert.ok(historical.every(record => record.figures.length > 0));
    const compactSearch = query({ contact: true }), cold = current.make(saved, { query: compactSearch });
    const small = current.make(plain(saved), { query: smallQuery(compactSearch) });
    for (const [index, id] of ids.entries()) assert.deepEqual(plain(cold.views.get(id).shots), historical[index], profile + ': restore keeps source world origins');
    drawAll(cold); drawAll(small);
    assert.deepEqual(facts(cold), facts(small));
    for (const [index, id] of ids.entries()) assert.deepEqual(plain(cold.views.get(id).shots), historical[index], profile + ': drawing does not shrink cached volley');
    // Save samples all raw visuals, including inactive formations. Apply the
    // same real checkpoint action to both paths before comparing later draws.
    const resaved = plain(cold.checkpoint()), smallResaved = plain(small.checkpoint());
    assert.deepEqual(resaved.presentation.shots, saved.presentation.shots, profile + ': re-save preserves cached shot metadata');
    assert.deepEqual(smallResaved, resaved, profile + ': matched re-save actions preserve the entire checkpoint');
    for (const scene of [cold, small]) volley(scene, 12, .14, 19.86);
    assert.deepEqual(facts(cold), facts(small), profile + ': fresh volley uses existing compact origins');
    for (const [index, id] of ids.entries()) { assert.equal(cold.views.get(id).shots.at, 12); assert.notEqual(cold.views.get(id).shots.at, historical[index].at); }
    if (profile !== 'small') {
      const unchangedProfile = current.make(plain(saved), { query: search }); drawAll(unchangedProfile); volley(unchangedProfile, 12, .14, 19.86);
      assert.ok(ids.some(id => JSON.stringify(cold.views.get(id).shots.figures) !== JSON.stringify(unchangedProfile.views.get(id).shots.figures)), profile + ': fresh compact offsets differ from larger profile');
    }
  }
});

test('fresh volley captured by Save before a drawing pass uses compact origins and remains immutable on subsequent draws', () => {
  const search = query({ contact: true }), compact = controlled(search, 0), small = controlled(smallQuery(search), 0);
  for (const scene of [compact, small]) {
    scene.engine.time = 10.14;
    for (const formation of units(scene)) Object.assign(formation, { lastVolleyAt: 10, reload: 19.86, status: 'firing' });
  }
  const saved = plain(compact.checkpoint()), reference = plain(small.checkpoint());
  assert.deepEqual(saved, reference, 'actual checkpoint sampler captures compact fresh origins');
  assert.equal(saved.presentation.shots.formations.length, 2);
  const held = ids.map(id => compact.views.get(id).shots);
  drawAll(compact);
  for (const [index, id] of ids.entries()) assert.equal(compact.views.get(id).shots, held[index], 'same cached volley object is retained');
});

test('v37 preservation binds three authentic v36 archives, protected bytes and mandatory current pins', async () => {
  const preservation = await import('./test-support/gettysburgV37Preservation.mjs');
  const raw = readFileSync(root + '/scripts/fixtures/gettysburg-v37-preservation.json');
  assert.equal(sha(raw), '1f7c3dbfc7eb4bac60dbd6bf44457a97a95531fcd319f083ccfb2664b1db434e');
  const fixture = JSON.parse(raw);
  assert.equal(fixture.schema, 'gettysburg-v37-authentic-installed-v36-baseline-v1');
  assert.equal(fixture.baselineFiles, 1596); assert.equal(fixture.baselineBytes, 557196222);
  assert.equal(fixture.sourceFiles.length, 3); assert.equal(fixture.protectedFiles.length, 1593);
  assert.equal(fixture.oldFixturesRefreshed, false); assert.equal(fixture.oldMigrationLedgersEdited, false);
  assert.equal(fixture.behavioralAssertionsChanged, false);
  for (const record of fixture.sourceFiles) assert.equal(sha(preservation.v37BeforeFile(record.path)), record.sha256);
  const metadata = preservation.verifyGettysburgV37MetadataMigrations();
  assert.equal(metadata.metadataPathsVerified, 1); assert.equal(metadata.packageScriptFieldsVerified, 4); assert.equal(metadata.archivedBeforeFiles, 3);
  assert.equal(metadata.oldFixturesRefreshed, false); assert.equal(metadata.oldMigrationLedgersEdited, false);
  const ledger = preservation.gettysburgV37MigrationLedger();
  assert.equal(ledger.status, 'frozen-approved-runtime-pins'); assert.equal(ledger.migrations.length, 3);
  assert.ok(ledger.newSourcePins.some(record => record.path === 'scripts/test-gettysburg-v37-rank-readability.mjs' && record.sha256 === sha(readFileSync(fileURLToPath(import.meta.url)))));
  assert.throws(() => preservation.v37BeforeFile('../src/battle/CivilWarBattlefield.jsx'));
});

test('v37 malformed migration metadata and root/nested accessors fail closed without executing getters', async () => {
  const preservation = await import('./test-support/gettysburgV37Preservation.mjs');
  const valid = preservation.gettysburgV37MigrationLedger();
  for (const mutate of [value => { value.baselineFiles = 0; }, value => { value.status = 'draft'; },
    value => { value.migrations[0].beforeSHA256 = '0'.repeat(64); }, value => { value.newSourcePins.pop(); },
    value => { value.extra = true; }, value => { value.self = value; }, value => { value[Symbol('extra')] = true; }]) {
    const value = plain(valid); mutate(value); assert.throws(() => preservation.validateGettysburgV37MigrationLedger(value));
  }
  let reads = 0;
  for (const nested of [false, true]) {
    const value = plain(valid), target = nested ? value.migrations[0] : value, key = nested ? 'beforeSHA256' : 'baselineFiles';
    Object.defineProperty(target, key, { enumerable: true, configurable: true, get() { reads++; throw new Error('getter must remain unexecuted'); } });
    assert.throws(() => preservation.validateGettysburgV37MigrationLedger(value)); assert.equal(reads, 0);
  }
});
