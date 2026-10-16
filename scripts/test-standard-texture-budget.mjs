import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';
import { BATTLE_SCENARIOS } from '../src/game/battles.js';
import { createStandardTextures, createRealisticStandard, CLOTH_FRAMES, clothFrame } from '../src/battle/realisticStandards.js';
import { periodStandardFor } from '../src/battle/periodStandards.js';
import { createSceneryTextures } from '../src/battle/realisticScenery.js';
import { drawGettysburgTerrain } from '../src/battle/gettysburgTerrainVisual.js';
import { drawFieldTerrain } from '../src/battle/fieldTerrainVisual.js';
import { createTransparentCanvasTexture } from '../src/battle/transparentCanvasTexture.js';

function context() {
  return { scale() {}, translate() {}, setTransform() {}, drawImage() {}, fillRect() {}, strokeRect() {}, setLineDash() {}, beginPath() {}, lineTo() {}, moveTo() {}, closePath() {}, fill() {}, stroke() {}, save() {}, restore() {}, rect() {}, clip() {}, getImageData() { return { data: new Uint8ClampedArray([255, 0, 255, 255]) }; }, putImageData(data) { this.lastPixels = data.data; } };
}
class CanvasFixture {
  constructor() { this.width = 0; this.height = 0; this.requested = []; this.context = null; }
  getContext(type, options = {}) {
    assert.equal(type, '2d');
    this.requested.push(options);
    if (!this.context) {
      const alpha = options.alpha !== false;
      this.context = { ...context(), getContextAttributes: () => ({ alpha }) };
    }
    return this.context;
  }
}
function fixture(scenarioId) {
  const created = [], textures = new Map();
  globalThis.document = { createElement() { return new CanvasFixture(); } };
  const scene = { scenarioId, textures: {
    get(key) { return key === 'bunting-material' ? { getSourceImage: () => ({}) } : textures.get(key); },
    exists(key) { return textures.has(key); },
    createCanvas() { assert.fail('transparent standard sources must not use the renderer canvas pool'); },
    addCanvas(key, canvas) {
      const texture = { key, canvas, width: canvas.width, height: canvas.height, context: canvas.getContext('2d', { willReadFrequently: true }), frames: [], refreshes: 0, add(...args) { this.frames.push(args); }, refresh() { this.refreshes++; }, getSourceImage() { return canvas; } };
      created.push(texture); textures.set(key, texture); return texture;
    },
  }, add: { image(x, y, key, frame) {
    return { x, y, key, frame, origin: null, scale: null, setOrigin(...v) { this.origin = v; return this; }, setScale(v) { this.scale = v; return this; }, setFrame(v) { this.frame = v; return this; } };
  } } };
  return { scene, created, textures };
}
const expectedKey = (side, id) => { const pattern = periodStandardFor(side, id); return `cloth-${pattern.pattern}-${pattern.stars}`; };

for (const battle of Object.values(BATTLE_SCENARIOS)) test(`${battle.id}: only both current period colors allocate, with unchanged cloth frames`, () => {
  const { scene, created } = fixture(battle.id);
  createStandardTextures(scene);
  assert.equal(created.length, 2);
  assert.deepEqual(created.map(value => value.key), ['union', 'confederate'].map(side => expectedKey(side, battle.id)));
  for (const atlas of created) {
    assert.equal(atlas.width, 1920);
    assert.equal(atlas.height, 768);
    assert.equal(atlas.refreshes, 1);
    assert.equal(atlas.context.getContextAttributes().alpha, true);
    assert.deepEqual(atlas.canvas.requested[0], { alpha: true }, 'alpha must be enabled before Phaser retrieves the existing context');
    assert.equal(atlas.frames.length, CLOTH_FRAMES);
    assert.deepEqual(atlas.frames, Array.from({ length: 32 }, (_, i) => [i, 0, i % 8 * 240, Math.floor(i / 8) * 192, 240, 192]));
  }
  createStandardTextures(scene);
  assert.equal(created.length, 2, 'repeated creation reuses current atlases');
  for (const side of ['union', 'confederate']) {
    const sprite = createRealisticStandard(scene, side, battle.id);
    assert.equal(sprite.key, expectedKey(side, battle.id));
    assert.equal(sprite.scale, .25);
    assert.deepEqual(sprite.origin, [0, 0]);
    sprite.periodUpdate(5.5, .2, false);
    assert.equal(sprite.frame, clothFrame(5.5, .2, false));
    sprite.periodUpdate(100, .2, true);
    assert.equal(sprite.frame, clothFrame(100, .2, true));
  }
});

test('standalone scene defaults to Gettysburg, and a later period adds only its missing designs', () => {
  const { scene, created } = fixture(undefined);
  createStandardTextures(scene);
  assert.deepEqual(created.map(value => value.key), ['cloth-us-national-34', 'cloth-anv-13']);
  scene.scenarioId = 'wilderness';
  createStandardTextures(scene);
  assert.deepEqual(created.map(value => value.key), ['cloth-us-national-34', 'cloth-anv-13', 'cloth-us-national-35']);
  scene.scenarioId = 'first_manassas';
  createStandardTextures(scene);
  assert.deepEqual(created.map(value => value.key), ['cloth-us-national-34', 'cloth-anv-13', 'cloth-us-national-35', 'cloth-first-national-11']);
});

test('Gettysburg saves exactly the three unused nominal atlas allocations', () => {
  const { scene, created } = fixture('gettysburg');
  createStandardTextures(scene);
  const pixels = created.reduce((sum, value) => sum + value.width * value.height, 0);
  assert.equal(pixels * 4, 11796480);
  assert.equal((5 * 1920 * 768 - pixels) * 4, 17694720);
});

test('repeated encounters bypass an installed Phaser pool canvas with an immutable opaque renderer context', () => {
  const require = createRequire(import.meta.url);
  const CanvasPool = require('phaser/src/display/canvas/CanvasPool.js');
  globalThis.HTMLCanvasElement = CanvasFixture;
  const { scene, created } = fixture('gettysburg');
  const parent = {};
  const opaque = CanvasPool.create(parent, 800, 600);
  opaque.getContext('2d', { alpha: false });
  CanvasPool.remove(opaque);
  const reused = CanvasPool.create({}, 1920, 768);
  assert.equal(reused, opaque, 'the actual installed pool reuses the released Canvas identity');
  assert.equal(reused.getContext('2d', { alpha: true }).getContextAttributes().alpha, false,
    'requesting alpha after resize cannot replace the fixture\'s established context');
  CanvasPool.remove(reused);
  createStandardTextures(scene);
  for (const atlas of created) {
    assert.notEqual(atlas.canvas, opaque);
    assert.equal(atlas.context.getContextAttributes().alpha, true);
  }
  const priorSources = created.map(atlas => atlas.canvas);
  const second = fixture('gettysburg');
  createStandardTextures(second.scene);
  for (const atlas of second.created) {
    assert.notEqual(atlas.canvas, opaque);
    assert.equal(priorSources.includes(atlas.canvas), false);
    assert.equal(atlas.context.getContextAttributes().alpha, true);
  }
});

test('flag, keyed scenery, Gettysburg overlay and generated field layers all bypass an opaque pooled renderer canvas', () => {
  const require = createRequire(import.meta.url);
  const CanvasPool = require('phaser/src/display/canvas/CanvasPool.js');
  globalThis.HTMLCanvasElement = CanvasFixture;
  const source = fs.readFileSync(require.resolve('phaser/src/gameobjects/graphics/Graphics.js'), 'utf8');
  const start = source.indexOf('generateTexture: function (key, width, height)');
  const end = source.indexOf('\n    },', start);
  assert.ok(start > 0 && end > start);
  const generate = vm.runInNewContext(`(${source.slice(start + 'generateTexture: '.length, end + 6)})`, {
    HTMLCanvasElement: CanvasFixture,
    Graphics: { TargetCamera: { setScene() {}, setViewport() {} } },
  });
  for (const encounter of [1, 2]) {
    const { scene, created, textures } = fixture('gettysburg');
    const pooled = CanvasPool.create({}, 800, 600);
    pooled.getContext('2d', { alpha: false });
    CanvasPool.remove(pooled);
    let graphicsBakes = 0;
    scene.sys = { textures: scene.textures, game: { renderer: {} }, scale: { width: 1700, height: 1000 } };
    scene.add.graphics = () => {
      const graphic = { scene, x: 0, y: 0, setDepth() { return this; }, fillStyle() { return this; }, fillRect() { return this; }, lineStyle() { return this; }, strokeRect() { return this; }, setOrigin() { return this; }, destroy() {}, generateTexture: generate,
        renderCanvas(_renderer, _source, _camera, _matrix, ctx) { assert.equal(ctx.getContextAttributes().alpha, true); graphicsBakes++; } };
      return graphic;
    };
    const drawable = () => ({ setOrigin() { return this; }, setDepth() { return this; }, add() { return this; } });
    scene.add.image = drawable;
    scene.add.container = drawable;
    scene.add.rectangle = drawable;
    scene.add.text = drawable;
    const image = { width: 1536, height: 1024 };
    for (const kind of ['foliage', 'earthworks']) textures.set(`${kind}-photo-source`, { getSourceImage: () => image });
    const frames = Object.fromEntries(['fence', 'wall', 'trench', 'crater'].map(key => [key, { x: 0, y: 0, w: 4, h: 4 }]));
    scene.cache = { json: { get: () => frames } };
    scene.textures.remove = key => textures.delete(key);
    scene.world = { width: 1700, height: 1000 };
    scene.engine = { gettysburg: { landmarks: [] }, world: scene.world };
    createStandardTextures(scene);
    createSceneryTextures(scene);
    assert.equal(textures.has('foliage-photo-source'), false);
    assert.equal(textures.has('earthworks-photo-source'), false);
    assert.equal(textures.get('foliage-photo').context.lastPixels[3], 0, 'keyed pixel alpha is preserved');
    drawGettysburgTerrain(scene);
    scene.engine = { scenarioId: 'first_manassas', world: scene.world, fieldBattle: { zones: [], landmarks: [] }, config: {}, snapshot: () => ({ scenarioId: 'first_manassas' }) };
    drawFieldTerrain(scene);
    assert.equal(graphicsBakes, 1, 'the actual installed Graphics existing-key path rendered once');
    assert.deepEqual(created.map(texture => texture.key), ['cloth-us-national-34', 'cloth-anv-13', 'foliage-photo', 'earthworks-photo', 'gettysburg-physical-scenery-v2', 'field-scenery-first_manassas', 'field-scenery-first_manassas-canopy'], `encounter ${encounter}`);
    for (const texture of created) {
      assert.notEqual(texture.canvas, pooled);
      assert.equal(texture.canvas.requested[0].alpha, true);
      assert.equal(texture.context.getContextAttributes().alpha, true);
    }
    assert.equal(created[2].width, 1536); assert.equal(created[2].height, 1024);
    for (const texture of created.slice(4)) { assert.equal(texture.width, 1700); assert.equal(texture.height, 1000); }
    const count = created.length;
    assert.equal(createTransparentCanvasTexture(scene, created[4].key, 1700, 1000), created[4]);
    assert.equal(created.length, count, 'existing keyed layers remain idempotent');
    assert.equal(CanvasPool.first().canvas, pooled, 'custom layers never consume the opaque renderer source');
  }
});
