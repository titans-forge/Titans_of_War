import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ContactLayoutPresentation, CONTACT_LAYOUT_ID, CONTACT_LAYOUT_VERSION, CONTACT_LAYOUT_MAX_OFFSET } from '../src/battle/contactLayoutPresentation.js';
import { closeCombatPairs } from '../src/battle/closeCombat.js';
import { regressionHarness } from './test-support/gettysburgV30Regression.mjs';
import { isolated } from './test-support/gettysburgV32Regression.mjs';
import { verifyGettysburgV33MetadataMigrations, gettysburgV33MigrationLedger, v33BeforeFile, v33HistoricalSource } from './test-support/gettysburgV33Preservation.mjs';
import { layoutHarness, plain, query, current, controlledPair, drawPair, coldPair, pairFacts, visibleFacts, publicPair, routeToContact } from './test-support/gettysburgV33Regression.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const sha = value => createHash('sha256').update(value).digest('hex');
const hash = value => sha(JSON.stringify(plain(value)));
const fixture = JSON.parse(readFileSync(`${ROOT}/scripts/fixtures/gettysburg-v33-preservation.json`));
const harness = await layoutHarness(ROOT), before = await layoutHarness(ROOT, true);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} differs from ${b}`);
const advance = (value, seconds, resolving = false) => { for (let step = 0; step < Math.round(seconds / .05); step++) { value.scene.engine.tick(.05); drawPair(value, resolving); } };
function settled(direction = 1, profile = 'moderate') { const value = controlledPair(harness, direction, profile); advance(value, .55); return value; }
const vector = (value, id) => value.scene.contactLayout.formations.get(id).offset;
const rawFrames = value => value.ids.map(id => plain(value.scene.views.get(id).visual.output));
function assertContained(value) {
  for (const id of value.ids) {
    const formation = current(value.scene, id), view = value.scene.views.get(id), theta = view.visual.output.facing;
    for (const foot of view.visual.output.figures.filter(f => f.visible && !f.fallen)) {
      const ground = value.scene.contactLayout.groundPoint(id, foot), x = ground.x - formation.x, y = ground.y - formation.y;
      assert.ok(Math.abs(-Math.sin(theta) * x + Math.cos(theta) * y) <= formation.footprint.width / 2 + 1e-10);
      assert.ok(Math.abs(Math.cos(theta) * x + Math.sin(theta) * y) <= formation.footprint.depth / 2 + 1e-10);
    }
  }
}
function fallen(value) {
  return value.ids.flatMap(id => value.scene.views.get(id).visual.output.figures.filter(f => f.visible && f.fallen).map(f =>
    ({ formationId: id, raw: plain(f), body: plain(harness.facts(value.scene.views.get(id)).soldiers[f.id]),
      ground: value.scene.contactLayout.groundPoint(id, f) })));
}
function makeFalls(value) { const offsets = value.ids.map(id => plain(vector(value, id))); for (const unit of [value.union, value.confederate]) unit.strength *= .5; drawPair(value); return offsets; }
function restoreBundle(value, saved) {
  const cold = coldPair(harness, value, saved), scene = cold.scene;
  return { cold, scene, formations: scene.engine.snapshot({ presentation: true }).formations, views: scene.views, time: scene.engine.time + (scene.engine.resolutionTime || 0) };
}
function helperSample(value, instance, time = value.scene.engine.time, resolving = false) {
  const snapshot = value.scene.engine.snapshot({ presentation: true });
  const samples = value.scene.prepareContactLayout(snapshot, value.scene.engine.time, false);
  instance.sample(value.scene.engine, snapshot.formations, samples, time, resolving); return samples;
}

test('authentic v32 fixture and all declared original archives remain immutable with exact current migration pins', () => {
  assert.equal(sha(readFileSync(`${ROOT}/scripts/fixtures/gettysburg-v33-preservation.json`)), '62cab66694c9fb1b11431a0b3c241950b3031a001a31249c12718501a5cba9d4');
  assert.equal(fixture.baselineFiles, 1548); assert.equal(fixture.sourceFiles.length, 6); assert.equal(fixture.protectedFiles.length, 1542);
  assert.equal(fixture.oldFixturesRefreshed, false); assert.equal(fixture.oldMigrationLedgersEdited, false);
  const metadata = verifyGettysburgV33MetadataMigrations(); assert.equal(metadata.metadataPathsVerified, 4);
  const ledger = gettysburgV33MigrationLedger(); assert.equal(ledger.migrations.length, 6);
  for (const row of fixture.sourceFiles) assert.equal(sha(v33BeforeFile(row.path)), row.sha256);
  for (const row of fixture.protectedFiles) assert.equal(sha(v33HistoricalSource(row.path)), row.sha256, row.path);
});
test('all44 prior policy/asset queries and native clip/pose witnesses execute byte-exact current behavior', () => {
  assert.equal(fixture.queryRows.length, 44);
  for (const row of fixture.queryRows) {
    const modules = harness.modules;
    assert.deepEqual(modules.gettysburgInfantryClipPolicy('gettysburg', row.query), row.policy);
    assert.deepEqual(modules.gettysburgInfantryClipAssets('gettysburg', row.query), row.assets);
    const clips = modules.prepareGettysburgInfantryClips(modules.gettysburgInfantryClipDefinitions('gettysburg', row.query, harness.textures),
      (key, frame) => harness.textures.exists(key) && harness.textures.get(key).has(frame));
    assert.equal(clips.length, row.clips); assert.equal(hash(clips), row.clipsSHA256);
    const poses = clips.flatMap(clip => [0, 1, 2, 3].flatMap(frame => [{}, { paused: true }, { reducedMotion: true }, { resolving: true }].map(flags =>
      modules.gettysburgInfantryClipPose('v33-authentic-v32', { id: 17, direction: clip.direction, action: clip.action === 'march' ? 'walk' : clip.action,
        frame, fallen: clip.action === 'fall', scale: 1.37 }, 999, { scenarioId: 'gettysburg', search: row.query, side: clip.side,
          identity: clip.identity, versionedIdentity: true, clips, shootingAge: .08, reloadProgress: .7, ...flags }))));
    assert.equal(poses.length, row.poseRows); assert.equal(hash(poses), row.posesSHA256, row.query);
  }
});
test('all336 authentic ordinary Scene witnesses preserve physical feet, body/shadow/world-muzzle/combat/checkpoint outputs', () => {
  // The authentic fixture explicitly used the original accepted legacy-frame
  // stand-ins. Execute that same boundary, separately from real-frame tests.
  const actual = regressionHarness(ROOT, harness.modules, harness.source, query('baseline', false));
  assert.equal(fixture.sceneRows.length, 336);
  for (const row of fixture.sceneRows) {
    const value = isolated(actual, row.query, row.side, row.direction, row.state);
    assert.equal(hash(actual.facts(value.view)), row.factsSHA256, JSON.stringify(row));
    assert.equal(hash(value.scene.shadows.draws), row.shadowsSHA256); assert.equal(hash(value.scene.smoke.draws), row.smokeSHA256);
    assert.equal(hash(value.scene.checkpoint()), row.checkpointSHA256); assert.equal(hash(value.scene.engine.checkpoint()), row.rawCombatSHA256);
  }
});
test('strict optional canonical query disables missing, duplicated, encoded, other-pass and other-scenario variants', () => {
  const bad = ['', query('moderate', false), '?artPass=gettysburg-v31&contactLayout=v33', '?artPass=gettysburg-v33&contactLayout=v33',
    query() + '&contactLayout=v33', query() + '&artPass=gettysburg-v32', query().replace('v33', 'V33'),
    query().replace('contactLayout', 'contact%4cayout'), query() + '&unrelated=%31', '?artPass=gettysburg-v32&contactLayout=v33-other'];
  for (const search of bad) assert.equal(harness.make(search).scene.contactLayoutEnabled, false, search);
  for (const search of [query(), '?contactLayout=v33&artPass=gettysburg-v32', query() + '&unrelated=plain']) assert.equal(harness.make(search).scene.contactLayoutEnabled, true, search);
  harness.windowState.location.search = query(); const field = new harness.Scene('first_manassas', harness.campaign, 'option_a', null, () => {});
  assert.equal(field.contactLayoutEnabled, false);
  assert.equal(CONTACT_LAYOUT_VERSION, 1); assert.equal(CONTACT_LAYOUT_ID, 'gettysburg-contact-layout-v33'); assert.equal(CONTACT_LAYOUT_MAX_OFFSET, 3);
});
for (const direction of [0, 1, 2, 3, 4, 5, 6, 7]) test(`actual Scene opposing bearing${direction} uses one common whole-living3px offset across all4 contact phases and compression1 raw containment`, () => {
  const value = settled(direction);
  const a = vector(value, value.union.id), b = vector(value, value.confederate.id), theta = direction * Math.PI / 4;
  close(Math.hypot(a.x, a.y), 3); close(a.x, -3 * Math.cos(theta)); close(a.y, -3 * Math.sin(theta)); close(a.x, -b.x); close(a.y, -b.y);
  assertContained(value);
  for (const id of value.ids) {
    const view = value.scene.views.get(id), offset = vector(value, id); assert.equal(view.capacity, 32);
    for (const figure of view.visual.output.figures.filter(f => f.visible && !f.fallen)) {
      const ground = value.scene.contactLayout.groundPoint(id, figure); close(ground.x - figure.x, offset.x); close(ground.y - figure.y, offset.y);
    }
  }
  const front = value.scene.views.get(value.union.id).visual.output.figures.find(f => f.visible && f.action === 'melee');
  const phases = new Set();
  for (let step = 0; step < 32 && phases.size < 4; step++) {
    drawPair(value); assertContained(value);
    phases.add(value.scene.views.get(value.union.id).visual.output.figures.find(f => f.id === front.id).frame);
    close(Math.hypot(...Object.values(vector(value, value.union.id))), 3);
    if (phases.size < 4) value.scene.engine.tick(.05);
  }
  assert.equal(phases.size, 4);
});
test('actual helper bound is common to both armies and shrinks rather than individually clamping tight raw feet', () => {
  const value = settled(0), snapshot = value.scene.engine.snapshot({ presentation: true });
  const samples = value.scene.prepareContactLayout(snapshot, value.scene.engine.time, false);
  // Synthetic geometric challenge uses the actual current raw sample. Keep
  // the original width and depth for every other point; one rear foot limits
  // BOTH opposing translations to1px. No bodies are individually repaired.
  const own = samples.get(value.union.id), shifted = plain(own);
  const rear = shifted.visual.figures.find(f => f.visible && !f.fallen); rear.x = value.union.x - current(value.scene, value.union.id).footprint.depth / 2 + 1;
  rear.y = value.union.y; samples.set(value.union.id, shifted);
  const instance = new ContactLayoutPresentation(); instance.sample(value.scene.engine, snapshot.formations, samples, 0); instance.sample(value.scene.engine, snapshot.formations, samples, .5);
  const a = instance.formations.get(value.union.id).offset, b = instance.formations.get(value.confederate.id).offset;
  close(Math.hypot(a.x, a.y), 1); close(a.x, -b.x); close(a.y, -b.y);
  shifted.visual.figures.find(f => f.id === rear.id).x = value.union.x - current(value.scene, value.union.id).footprint.depth / 2 - 1;
  instance.sample(value.scene.engine, snapshot.formations, samples, 1); assert.deepEqual(instance.formations.get(value.union.id).offset, { x: 0, y: 0 });
});
test('null volley is safe, fresh finite volley or a current fire pose immediately releases BOTH bodies without shifting shots', () => {
  for (const unsafe of ['volley', 'fire']) {
    const value = settled(), instance = value.scene.contactLayout; assert.equal(value.union.lastVolleyAt, null);
    if (unsafe === 'volley') { value.union.lastVolleyAt = value.scene.engine.time; drawPair(value); }
    else {
      const snapshot = value.scene.engine.snapshot({ presentation: true }), samples = value.scene.prepareContactLayout(snapshot, value.scene.engine.time, false);
      samples.get(value.union.id).visual.figures.find(f => f.visible && !f.fallen).action = 'fire';
      instance.sample(value.scene.engine, snapshot.formations, samples, value.scene.engine.time);
    }
    for (const id of value.ids) assert.deepEqual(vector(value, id), { x: 0, y: 0 });
  }
  const value = settled(); value.union.lastVolleyAt = value.scene.engine.time - 1.25; drawPair(value);
  close(Math.hypot(...Object.values(vector(value, value.union.id))), 3);
});
test('nonmutual contacts, retreating/broken states, resolving and extra real neighbors withhold layout', () => {
  for (const mode of ['nonmutual', 'withdraw', 'broken', 'resolving', 'extra-neighbor']) {
    const value = settled();
    if (mode === 'nonmutual') value.union.meleeWith = null;
    if (mode === 'withdraw') value.union.order = 'withdraw';
    if (mode === 'broken') value.union.status = 'broken';
    if (mode === 'extra-neighbor') {
      const extra = value.scene.engine.state.find(unit => unit.side === 'union' && unit.id !== value.union.id && unit.type === 'infantry');
      Object.assign(extra, { active: true, arrivalTime: null, strength: 1000, x: value.confederate.x, y: value.confederate.y, status: 'steady' });
      assert.ok(closeCombatPairs(value.scene.engine).length > 1);
    }
    value.scene.engine.time += .5; drawPair(value, mode === 'resolving');
    for (const id of value.ids) assert.deepEqual(vector(value, id), { x: 0, y: 0 }, mode);
  }
});
test('all real parsed current native/fallback frames retain art, pivots, physical slots, projection scales and simulation facts', () => {
  for (const profile of ['baseline', 'moderate', 'small']) for (let direction = 0; direction < 8; direction++) {
    const enabled = settled(direction, profile), disabled = controlledPair(before, direction, profile, false); advance(disabled, .55);
    assert.deepEqual(enabled.scene.engine.checkpoint(), disabled.scene.engine.checkpoint());
    assert.deepEqual(rawFrames(enabled), rawFrames(disabled));
    for (const id of enabled.ids) {
      const next = enabled.scene.views.get(id), old = disabled.scene.views.get(id), offset = vector(enabled, id);
      assert.deepEqual(plain(next.footprint), plain(old.footprint));
      for (const key of ['standard', 'flag', 'hitArea', 'bar', 'label']) for (const field of ['x', 'y', 'depth', 'scaleX', 'scaleY']) assert.equal(next[key]?.[field], old[key]?.[field]);
      for (const figure of next.visual.output.figures.filter(f => f.visible && !f.fallen)) {
        const a = plain(harness.facts(next).soldiers[figure.id]), b = plain(before.facts(old).soldiers[figure.id]);
        close(a.x - b.x, offset.x); close(a.y - b.y, offset.y); close(a.depth - b.depth, offset.y * 10);
        for (const field of ['x', 'y', 'depth']) { delete a[field]; delete b[field]; } assert.deepEqual(a, b);
        const sprite = next.soldiers[figure.id].sprite, frame = harness.atlases.get(sprite.textureKey).frames[sprite.frameName].frame;
        assert.equal(sprite.frame.realWidth, frame.w); assert.equal(sprite.frame.realHeight, frame.h);
      }
    }
  }
});
test('two actual Scene shadow ellipses follow each moved body ground without altering dimensions or raw standards', () => {
  const value = settled(5), old = controlledPair(before, 5, 'moderate', false); advance(old, .55);
  assert.equal(value.scene.shadows.draws.length, 128); assert.equal(old.scene.shadows.draws.length, 128);
  for (let i = 0; i < 128; i++) {
    const id = value.ids[Math.floor(i / 64)], offset = vector(value, id), a = plain(value.scene.shadows.draws[i]), b = plain(old.scene.shadows.draws[i]);
    close(a.x - b.x, offset.x); close(a.y - b.y, offset.y); delete a.x; delete a.y; delete b.x; delete b.y; assert.deepEqual(a, b);
  }
});
test('previous displayed common vector is frozen for each casualty before current fire/contact release, with no raw fall mutation', () => {
  const value = settled(1), offsets = value.ids.map(id => plain(vector(value, id)));
  value.union.lastVolleyAt = value.scene.engine.time; for (const unit of [value.union, value.confederate]) unit.strength *= .5;
  drawPair(value); const bodies = fallen(value); assert.equal(bodies.length, 32);
  for (const body of bodies) { const offset = offsets[value.ids.indexOf(body.formationId)]; close(body.ground.x - body.raw.x, offset.x); close(body.ground.y - body.raw.y, offset.y); }
  for (const id of value.ids) assert.deepEqual(vector(value, id), { x: 0, y: 0 });
  const raw = plain(value.ids.map(id => value.scene.views.get(id).visual.figures.filter(f => f.fallen).map(f => f.fallen)));
  value.scene.engine.time += .5; drawPair(value);
  assert.deepEqual(plain(value.ids.map(id => value.scene.views.get(id).visual.figures.filter(f => f.fallen).map(f => f.fallen))), raw);
  for (const body of fallen(value)) { const offset = offsets[value.ids.indexOf(body.formationId)]; close(body.ground.x - body.raw.x, offset.x); close(body.ground.y - body.raw.y, offset.y); }
});
test('casualty four phases, reduced final rest, pause and fade use a single frozen displaced foot without moving combat anchors', () => {
  const value = settled(5); makeFalls(value); const first = fallen(value); assert.equal(first.length, 32);
  const fallTime = first[0].raw.time;
  for (const age of [0, .17, .34, .51, 2.5, 3.19]) {
    value.scene.engine.time = fallTime + age; drawPair(value);
    for (const body of fallen(value)) {
      const anchor = first.find(f => f.formationId === body.formationId && f.raw.id === body.raw.id);
      assert.deepEqual(body.ground, anchor.ground); assert.equal(body.raw.frame, Math.min(3, Math.floor(age * 6)));
    }
  }
  value.scene.reducedMotion = true; drawPair(value); for (const body of fallen(value)) assert.equal(body.raw.frame, 3);
  const paused = pairFacts(harness, value); drawPair(value); assert.deepEqual(pairFacts(harness, value), paused);
  value.scene.engine.time = fallTime + 3.21; drawPair(value); assert.equal(fallen(value).length, 0);
});
for (const direction of [1, 5]) for (const profile of ['moderate', 'small']) test(`same-time JSON cold ${direction}/${profile} re-save BEFORE first draw preserves exact raw visual and32 displaced fall tuples`, () => {
  const value = settled(direction, profile); makeFalls(value); value.scene.engine.time += .2; drawPair(value); value.scene.setSpeed(0);
  const facts = visibleFacts(pairFacts(harness, value)), saved = plain(value.scene.checkpoint()); assert.equal(saved.presentation.contactLayout.layoutId, CONTACT_LAYOUT_ID);
  const cold = coldPair(harness, value, saved); assert.equal(cold.scene.speed, 0);
  const immediate = plain(cold.scene.checkpoint()); assert.deepEqual(immediate, saved);
  const secondCold = coldPair(harness, value, immediate); drawPair(secondCold);
  assert.deepEqual(visibleFacts(pairFacts(harness, secondCold)), facts); assert.deepEqual(plain(secondCold.scene.checkpoint()), saved);
  assert.equal(fallen(secondCold).length, 32); assert.deepEqual(secondCold.scene.engine.checkpoint(), value.scene.engine.checkpoint());
});
test('ordinary first cold draw then re-save is exact; absent/malformed optional sidecar preserves valid raw combat and base visual restore', () => {
  const value = settled(); makeFalls(value); const saved = plain(value.scene.checkpoint()), cold = coldPair(harness, value, saved);
  drawPair(cold); assert.deepEqual(plain(cold.scene.checkpoint()), saved);
  for (const optional of [undefined, null, { version: 1 }, { ...saved.presentation.contactLayout, version: 99 }]) {
    const altered = plain(saved); if (optional === undefined) delete altered.presentation.contactLayout; else altered.presentation.contactLayout = optional;
    const fallback = coldPair(harness, value, altered); drawPair(fallback);
    assert.deepEqual(fallback.scene.engine.checkpoint(), value.scene.engine.checkpoint());
    assert.deepEqual(rawFrames(fallback), rawFrames(value));
    for (const body of fallen(fallback)) assert.deepEqual(body.ground, { x: body.raw.x, y: body.raw.y });
  }
});
test('arbitrary bearing own checkpoints including34.8 degrees stay strictly within3px and restore displaced living/casualty points', () => {
  for (const degrees of [3.1, 17.3, 34.8, 56.9, 89.1, 123.4, 176.7, 214.8, 271.2, 317.9, 354.2]) {
    const value = settled(degrees / 45); makeFalls(value);
    const saved = plain(value.scene.checkpoint());
    for (const record of saved.presentation.contactLayout.formations) {
      assert.ok(Math.hypot(record.offset.x, record.offset.y) <= 3, degrees);
      for (const figure of record.figures) assert.ok(Math.hypot(figure.offset.x, figure.offset.y) <= 3, degrees);
    }
    const b = restoreBundle(value, saved), instance = new ContactLayoutPresentation();
    assert.equal(instance.restore(saved.presentation, b.formations, b.views, b.time), true, degrees);
    assert.deepEqual(plain(b.scene.checkpoint()), saved, degrees); drawPair(b.cold);
    assert.deepEqual(visibleFacts(pairFacts(harness, b.cold)), visibleFacts(pairFacts(harness, value)), degrees);
    assertContained(b.cold);
  }
});
test('actual public movement pre-first-draw re-save retains walking phase and primitive visual checkpoint at the same saved instant', () => {
  const value = publicPair(harness, 1); value.scene.previewDestination({ x: 650, y: 600 }); value.scene.confirmMove();
  value.scene.setSpeed(1); advance(value, 2); value.scene.setSpeed(0);
  assert.ok(value.scene.views.get(value.confederate.id).visual.output.figures.some(f => f.visible && f.action === 'walk'));
  const saved = plain(value.scene.checkpoint()), facts = visibleFacts(pairFacts(harness, value));
  const cold = coldPair(harness, value, saved), immediate = plain(cold.scene.checkpoint());
  assert.deepEqual(immediate, saved); const second = coldPair(harness, value, immediate); drawPair(second);
  assert.deepEqual(visibleFacts(pairFacts(harness, second)), facts); assert.deepEqual(plain(second.scene.checkpoint()), saved);
});
test('simulation-time smoothing advances at6px per second and repeated paused samples preserve exact body/layout facts', () => {
  const value = controlledPair(harness, 1);
  close(Math.hypot(...Object.values(vector(value, value.union.id))), .3);
  const facts = pairFacts(harness, value), layout = plain([...value.scene.contactLayout.formations]);
  drawPair(value); assert.deepEqual(pairFacts(harness, value), facts); assert.deepEqual(plain([...value.scene.contactLayout.formations]), layout);
  advance(value, .05); close(Math.hypot(...Object.values(vector(value, value.union.id))), .6);
});
test('strict actual sidecar parser rejects malformed finite values, duplicate/missing identities, mismatched base/fall tuples and getters atomically', () => {
  const value = settled(); makeFalls(value); const saved = plain(value.scene.checkpoint());
  const mutations = [v => v.version = 2, v => v.layoutId = 'borrowed', v => v.time += 1, v => v.extra = true,
    v => v.formations.pop(), v => v.formations.push(v.formations[0]), v => v.formations[0].id = 'missing',
    v => v.formations[0].capacity = 33, v => v.formations[0].capacity = true, v => v.formations[0].time += 1,
    v => v.formations[0].formation.strength += 1, v => v.formations[0].formation.footprint.width += 1,
    v => v.formations[0].formation.extra = true, v => v.formations[0].offset.x = 3.1, v => v.formations[0].offset.y = Infinity,
    v => v.formations[0].offset.x = NaN, v => v.formations[0].offset.x = true, v => v.formations[0].offset.x = '0',
    v => v.formations[0].offset.x = 1e8, v => v.formations[0].offset = { x: 3.0000000000000004, y: 0 }, v => v.formations[0].offset.extra = 0,
    v => v.formations[0].figures.pop(), v => v.formations[0].figures[1].id = v.formations[0].figures[0].id,
    v => v.formations[0].figures[0].alive = 1, v => v.formations[0].figures[0].id = -1,
    v => { const f = v.formations[0].figures.find(f => f.alive); f.offset.x = 1; },
    v => { const f = v.formations[0].figures.find(f => f.fallen); f.fallen.x += 1; },
    v => { const f = v.formations[0].figures.find(f => f.fallen); f.fallen.time += 1; },
    v => { const f = v.formations[0].figures.find(f => f.fallen); f.fallen.scale = Infinity; },
    v => { const f = v.formations[0].figures.find(f => f.fallen); f.offset.x = 3.1; },
    v => delete v.formations[0].figures[0], v => v.formations[0].figures.extra = 1,
    v => Object.setPrototypeOf(v, { inherited: true }), v => Object.defineProperty(v, 'time', { get() { throw Error('getter must not execute'); } })];
  for (const mutate of mutations) {
    const altered = plain(saved); mutate(altered.presentation.contactLayout);
    // The base parser receives valid serialized combat/visual data. Challenge
    // the optional helper directly so a getter is never pre-read by JSON.
    const b = restoreBundle(value, saved), instance = new ContactLayoutPresentation();
    assert.equal(instance.restore(altered.presentation, b.formations, b.views, b.time), false); assert.equal(instance.formations.size, 0);
    assert.deepEqual(b.scene.engine.checkpoint(), value.scene.engine.checkpoint());
  }
  const b = restoreBundle(value, saved), instance = new ContactLayoutPresentation(); assert.equal(instance.restore(saved.presentation, b.formations, b.views, b.time), true);
  b.views.get(value.ids[0]).visual.restoreFrame = false; assert.equal(instance.restore(saved.presentation, b.formations, b.views, b.time), false); assert.equal(instance.formations.size, 0);
});
for (const direction of [1, 5]) test(`untouched-roster public Scene Move/Assault ${direction} retains both resolver losses, paused save/cold restoration and continued contact`, () => {
  const enabled = publicPair(harness, direction), disabled = publicPair(before, direction, 'moderate', false);
  const reached = routeToContact(enabled), oldReached = routeToContact(disabled); assert.equal(reached, oldReached);
  advance(enabled, 2); advance(disabled, 2);
  assert.deepEqual(enabled.scene.engine.checkpoint(), disabled.scene.engine.checkpoint());
  const beforeDraw = plain(enabled.scene.engine.checkpoint()); drawPair(enabled); assert.deepEqual(enabled.scene.engine.checkpoint(), beforeDraw);
  enabled.scene.setSpeed(0); const saved = plain(enabled.scene.checkpoint()), cold = coldPair(harness, enabled, saved);
  assert.equal(cold.scene.speed, 0); assert.deepEqual(plain(cold.scene.checkpoint()), saved); drawPair(cold);
  assert.deepEqual(visibleFacts(pairFacts(harness, cold)), visibleFacts(pairFacts(harness, enabled)));
  assert.equal(cold.confederate.assaultSector, 'left'); const strengths = [cold.union.strength, cold.confederate.strength];
  advance(cold, .5); assert.ok(cold.union.strength < strengths[0] && cold.confederate.strength < strengths[1]);
  assert.ok(cold.union.inMelee && cold.confederate.inMelee); assertContained(cold);
});
test('fresh/cached world muzzle shots retain exact shot18 coordinates and raw projection scale under safety release and cold restore', () => {
  const enabled = settled(0), disabled = controlledPair(before, 0, 'moderate', false); advance(disabled, .55);
  for (const value of [enabled, disabled]) { value.union.inMelee = false; value.confederate.inMelee = false; value.union.lastVolleyAt = value.scene.engine.time; value.union.reload = 10; value.union.status = 'firing'; drawPair(value); }
  const next = enabled.scene.views.get(enabled.union.id).shots, old = disabled.scene.views.get(disabled.union.id).shots;
  assert.ok(next?.figures.length); assert.deepEqual(plain(next), plain(old)); assert.equal(enabled.scene.shotPresentationId, 'gettysburg-v18');
  const saved = plain(enabled.scene.checkpoint()), cold = coldPair(harness, enabled, saved); drawPair(cold);
  assert.deepEqual(plain(cold.scene.views.get(cold.union.id).shots), plain(next));
  const at = next.at; enabled.union.facing += Math.PI / 4; enabled.scene.engine.time += .1; drawPair(enabled);
  assert.equal(enabled.scene.views.get(enabled.union.id).shots.at, at); assert.deepEqual(plain(enabled.scene.views.get(enabled.union.id).shots.figures), plain(next.figures));
});
