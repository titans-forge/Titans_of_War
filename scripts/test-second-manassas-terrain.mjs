import assert from 'node:assert/strict';
import test from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { battleLocations } from '../src/battle/battleLocations.js';
import { SECOND_MANASSAS_HOUSES } from '../src/battle/secondManassasArt.js';
import {
  drawSecondManassasTerrain, secondManassasGrade, secondManassasTerrainPlan, secondManassasTrees,
} from '../src/battle/secondManassasTerrain.js';

const state = { rulesVersion: 2, battleRulesVersion: 18 };
const makeBattle = () => new CivilWarBattleEngine('second_manassas', state, 'option_a');

test('Second Manassas grade, Chinn Ridge, roads, and house locators share the authored field', () => {
  const engine = makeBattle();
  const plan = secondManassasTerrainPlan(engine);
  assert.equal(plan.ridge.name, 'Chinn Ridge');
  const deep = engine.fieldBattle.sectors.find(sector => sector.id === 'left');
  assert.ok(Math.abs(secondManassasGrade(deep.x).y - deep.y) < 8);
  assert.ok(secondManassasGrade(560).depth > 35);
  assert.equal(secondManassasGrade(250).depth, 0);
  assert.equal(secondManassasGrade(840).halfWidth, 0);
  assert.ok(plan.road.every(([,y]) => y >= plan.pike.top && y <= plan.pike.bottom));
  const locations = battleLocations(engine.snapshot());
  const location = id => locations.find(site => site.id === id);
  const [stone, dogan] = SECOND_MANASSAS_HOUSES;
  const [, , groveton] = plan.road;
  const [, , , , , easternCrossroads] = plan.road;
  assert.ok(stone.x > easternCrossroads[0] && stone.y < easternCrossroads[1]);
  assert.ok(dogan.x < groveton[0] && dogan.y < groveton[1]);
  assert.equal(location('Landmark:stone-house').source, stone.source);
  assert.match(location('Landmark:lucinda-dogan-house').note, /only surviving original building/);
  assert.match(location('Terrain:unfinished-railroad-cut').note, /before laying track/);
  assert.equal(location('Sector:right').name, 'Chinn Ridge');
  assert.ok(engine.fieldBattle.landmarks.every(site => !SECOND_MANASSAS_HOUSES.some(house => house.id === site.id)));
  assert.equal(secondManassasTerrainPlan(new CivilWarBattleEngine('first_manassas', state, 'option_a')), null);
});

test('Second Manassas trees leave the earth cut and houses legible and stay deterministic', () => {
  const plan = secondManassasTerrainPlan(makeBattle());
  const trees = secondManassasTrees(plan, 771);
  assert.deepEqual(secondManassasTrees(plan, 771), trees);
  assert.notDeepEqual(secondManassasTrees(plan, 772), trees);
  assert.ok(trees.length > 50 && trees.length < 210);
  for (const { x, y, size } of trees) {
    const grade = secondManassasGrade(x);
    if (grade.halfWidth) assert.ok(Math.abs(y - grade.y) >= grade.halfWidth * 1.45 + size * .51 + 9);
    assert.ok(SECOND_MANASSAS_HOUSES.every(house => Math.abs(x - house.x) >= house.width / 2
      || Math.abs(y - house.y) >= house.height / 2));
  }
});

test('Second Manassas draw shades relief and bakes a tapered cut without modifying tactical state', () => {
  const engine = makeBattle();
  const before = engine.checkpoint();
  const plan = secondManassasTerrainPlan(engine);
  const { width, height } = plan.world;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([130, 118, 70, 177], i);
  const gradients = [];
  const fills = [];
  const paths = [];
  let path;
  const context = { getImageData: () => ({ data }), putImageData: () => {},
    createRadialGradient: (...args) => { gradients.push(args); return { addColorStop: () => {} }; },
  };
  for (const method of ['save', 'restore', 'translate', 'scale', 'drawImage', 'ellipse', 'beginPath',
    'moveTo', 'lineTo', 'closePath', 'stroke', 'fillRect', 'fill']) {
    context[method] = (...args) => {
      assert.ok(args.every(arg => typeof arg !== 'number' || Number.isFinite(arg)), method + ' geometry must be finite');
      if (method === 'beginPath') path = [];
      if (method === 'moveTo' || method === 'lineTo') path.push(args);
      if (method === 'stroke') paths.push(path);
      if (method === 'fill') fills.push({ path, color: context.fillStyle });
    };
  }
  const image = {};
  const frames = Object.fromEntries(['cedar', 'oak', 'poplar'].map(name => [name, { x: 0, y: 0, w: 140, h: 135 }]));
  const scene = { cache: { json: { get: () => frames } }, textures: { get: () => ({ getSourceImage: () => image }) } };
  drawSecondManassasTerrain(scene, context, image, plan, 771);
  assert.equal(gradients.length, SECOND_MANASSAS_HOUSES.length);
  const cutFill = fills.find(layer => layer.color === '#74604b');
  assert.deepEqual(cutFill.path[0], [250, 405]);
  assert.ok(cutFill.path.some(([x,y]) => x > 835 && y < 117));
  for (const road of plan.roads) assert.ok(paths.some(stroke => JSON.stringify(stroke) === JSON.stringify(road.path)));
  assert.ok(data.every((channel, i) => i % 4 !== 3 || channel === 177));
  assert.notEqual(data[(308 * width + 565) * 4], data[(264 * width + 565) * 4]);
  assert.deepEqual(engine.checkpoint(), before);
});
