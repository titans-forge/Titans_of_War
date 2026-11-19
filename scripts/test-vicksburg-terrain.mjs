import assert from 'node:assert/strict';
import test from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { battleLocations } from '../src/battle/battleLocations.js';
import { SECOND_TEXAS_LUNETTE, vicksburgRailY, vicksburgRedoubtFaces } from '../src/battle/vicksburgArt.js';
import {
  drawVicksburgTerrain, vicksburgElevation, vicksburgTerrainPlan, vicksburgTrees,
} from '../src/battle/vicksburgTerrain.js';

const state = { rulesVersion: 2, battleRulesVersion: 18 };
const battle = (choice = 'option_a', id = 'vicksburg') => new CivilWarBattleEngine(id, state, choice);

test('Vicksburg locators tie both earthworks, the breach and the railroad to the playable terrain', () => {
  for (const choice of ['option_a', 'option_b']) {
    const engine = battle(choice);
    const plan = vicksburgTerrainPlan(engine);
    assert.ok(plan);
    const sites = battleLocations(engine.snapshot());
    const find = id => sites.find(site => site.id === id);
    const redoubt = find('Landmark:railroad-redoubt');
    const breach = find('Terrain:southeast-breach');
    const rail = find('Terrain:southern-railroad');
    const lunette = find('Landmark:second-texas-lunette');
    assert.match(redoubt.note, /square earthen fort/);
    assert.match(breach.note, /22nd Iowa/);
    assert.match(rail.note, /Southern Railroad of Mississippi/);
    assert.match(lunette.note, /separate attack on May 22/);
    assert.match(lunette.source, /nps\.gov\/places\/tour-stop-12-2nd-texas-lunette/);
    assert.ok(redoubt.x < breach.x && redoubt.y < breach.y);
    assert.equal(rail.y, vicksburgRailY(plan.rail, rail.x));
    assert.ok(rail.y > breach.y);
    assert.deepEqual([lunette.x, lunette.y], [SECOND_TEXAS_LUNETTE.x, SECOND_TEXAS_LUNETTE.y]);
    assert.ok(lunette.y < redoubt.y);
    assert.ok(find('Terrain:loess-ravine').x > redoubt.x);
    assert.ok(sites.filter(site => site.kind === 'Exit').every(site => site.x < redoubt.x));
  }
  const previous = battle('option_a', 'kennesaw_mountain');
  assert.equal(vicksburgTerrainPlan(previous), null);
  assert.ok(!battleLocations(previous.snapshot()).some(site => site.id === 'Landmark:railroad-redoubt'));
});

test('the southeast corner stays broken and the rail cut is appreciably lower than the fort', () => {
  const plan = vicksburgTerrainPlan(battle());
  const faces = vicksburgRedoubtFaces(plan.redoubt);
  const southEnd = faces[1][0], eastEnd = faces[0].at(-1);
  assert.ok(southEnd.x < plan.breach.left && eastEnd.y < plan.breach.top);
  assert.ok(Math.hypot(southEnd.x - eastEnd.x, southEnd.y - eastEnd.y) > 68);
  assert.ok(vicksburgElevation(plan, 790, 445) - vicksburgElevation(plan, 790, vicksburgRailY(plan.rail, 790)) > 95);
  assert.ok(vicksburgElevation(plan, 790, 445) - vicksburgElevation(plan, 1041, 458) > 80);
  const trees = vicksburgTrees(plan, 1863);
  assert.deepEqual(trees, vicksburgTrees(plan, 1863));
  assert.ok(trees.length > 95);
  for (const tree of trees) {
    assert.ok(Math.abs(tree.y - vicksburgRailY(plan.rail, tree.x)) >= 28 + tree.size / 2);
    assert.ok(Math.hypot(tree.x - SECOND_TEXAS_LUNETTE.x, tree.y - SECOND_TEXAS_LUNETTE.y) >= 83);
  }
});

test('Vicksburg bakes the rails and both works in one texture without changing the combat checkpoint', () => {
  const engine = battle('option_b');
  const checkpoint = engine.checkpoint();
  const plan = vicksburgTerrainPlan(engine);
  const { width, height } = plan.world;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([119, 131, 82, 173], i);
  const strokes = new Map();
  let reads = 0, writes = 0, trenchStamps = 0;
  const terrainImage = {}, worksImage = {}, foliageImage = {};
  const ctx = {
    getImageData: () => { reads++; return { data }; },
    putImageData: () => { writes++; },
    createRadialGradient: () => ({ addColorStop: () => {} }),
  };
  for (const method of ['drawImage', 'save', 'restore', 'beginPath', 'moveTo', 'lineTo', 'stroke',
    'fillRect', 'ellipse', 'fill', 'translate', 'scale', 'rotate']) {
    ctx[method] = (...args) => {
      assert.ok(args.every(arg => typeof arg !== 'number' || Number.isFinite(arg)), `finite ${method} geometry`);
      if (method === 'stroke') strokes.set(ctx.strokeStyle, (strokes.get(ctx.strokeStyle) || 0) + 1);
      if (method === 'drawImage' && args[0] === worksImage) trenchStamps++;
    };
  }
  const frame = { x: 0, y: 0, w: 120, h: 135 };
  const frames = Object.fromEntries(['oak', 'poplar', 'trench'].map(name => [name, frame]));
  const scene = {
    cache: { json: { get: () => frames } },
    textures: { get: key => ({ getSourceImage: () => key === 'earthworks-photo' ? worksImage : foliageImage }) },
  };
  drawVicksburgTerrain(scene, ctx, terrainImage, plan, 1863);
  assert.equal(reads, 1);
  assert.equal(writes, 1);
  assert.equal(strokes.get('#b9af9a'), 2, 'two distinct iron rails');
  assert.ok(trenchStamps > 21, 'the redoubt, lunette and rearward line use textured earthwork art');
  assert.ok(data.every((value, index) => index % 4 !== 3 || value === 173));
  const railY = Math.round(vicksburgRailY(plan.rail, 900));
  const red = y => data[(y * width + 900) * 4];
  assert.ok(red(railY - 45) - red(railY) > 18, 'exposed northern loess bank above the rail bed');
  assert.ok(red(railY + 45) - red(railY) > 18, 'exposed southern loess bank above the rail bed');
  assert.deepEqual(engine.checkpoint(), checkpoint);
});
