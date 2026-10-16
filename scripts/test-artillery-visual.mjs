import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { artilleryGeometry, createArtilleryVisual, updateArtilleryVisual } from '../src/battle/artilleryVisual.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('wheel rotation changes spokes without moving the muzzle or collision footprint', () => {
  const a = artilleryGeometry({ facing: .7 }), b = artilleryGeometry({ facing: .7, wheelRotation: .3 });
  assert.deepEqual(a.muzzle, b.muzzle); assert.deepEqual(a.footprint, b.footprint);
  assert.deepEqual(a.wheels[0].rim, b.wheels[0].rim); assert.notDeepEqual(a.wheels[0].spokes, b.wheels[0].spokes);
});

test('realistic crews use native boot anchors, freeze on pause, and disappear when guns are abandoned', () => {
  const scene = fakeScene();
  const atlas = JSON.parse(readFileSync(new URL('../public/images/units/realistic-v1/union-crew.json', import.meta.url)));
  scene.textures.exists = () => true;
  const image = scene.add.image;
  scene.add.image = () => {
    const sprite = image();
    sprite.setTexture = (texture, key) => {
      const f = atlas.frames[key]; assert.ok(f, key);
      Object.assign(sprite, { texture, key, frame: { realHeight: f.frame.h, pivotX: f.pivot.x, pivotY: f.pivot.y } });
      return sprite;
    };
    return sprite;
  };
  const view = createArtilleryVisual(scene, 'union', { crewTexture: 'union-crew-realistic', realisticCrew: true });
  const options = { x: 100, y: 200, time: 1, crewAction: 'reload', facing: .5 };
  updateArtilleryVisual(view, options);
  const snapshot = () => view.crewSprites.map(s => ({ key: s.key, x: s.x, y: s.y, scale: s.scale, originX: s.originX, originY: s.originY, angle: s.angle }));
  const before = snapshot();
  for (let i = 0; i < 50; i++) updateArtilleryVisual(view, options);
  assert.deepEqual(snapshot(), before);
  assert.ok(before.every(s => Number.isFinite(s.scale) && s.originY > .95));
  updateArtilleryVisual(view, { ...options, reducedMotion: true, time: 2 });
  const reduced = snapshot();
  updateArtilleryVisual(view, { ...options, reducedMotion: true, time: 10 });
  assert.deepEqual(snapshot(), reduced);
  updateArtilleryVisual(view, { ...options, abandoned: true });
  assert.ok(view.crewSprites.every(s => !s.visible));
});

test('deployed muzzle follows every engine heading with no hidden ground compression', () => {
  for (let index = 0; index < 16; index++) {
    const facing = index * Math.PI / 8;
    const g = artilleryGeometry({ x: 400, y: 300, facing });
    close(g.muzzleGround.x, 400 + Math.cos(facing) * 26);
    close(g.muzzleGround.y, 300 + Math.sin(facing) * 26);
    close(g.muzzle.x, g.muzzleGround.x);
    close(g.muzzle.y, g.muzzleGround.y - 18);
    close(g.wheels[0].hub.y, g.wheels[0].ground.y - 10.5);
    assert.equal(g.limber, undefined);
  }
});

test('projection rotates the ground before optional y compression and never rotates height', () => {
  const g = artilleryGeometry({ x: 17, y: 91, facing: Math.PI / 4, scale: 0.82, groundCompression: 0.72 });
  close(g.muzzleGround.x, 17 + Math.cos(Math.PI / 4) * 26 * 0.82);
  close(g.muzzleGround.y, 91 + Math.sin(Math.PI / 4) * 26 * 0.82 * 0.72);
  close(g.muzzleGround.y - g.muzzle.y, 18 * 0.82);
});

test('recoil shifts the complete deployed gun back along its heading and keeps crew planted', () => {
  for (const facing of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const rest = artilleryGeometry({ facing });
    const kick = artilleryGeometry({ facing, recoil: 1 });
    close(rest.muzzle.x - kick.muzzle.x, Math.cos(facing) * 3);
    close(rest.muzzle.y - kick.muzzle.y, Math.sin(facing) * 3);
    close(rest.wheels[0].hub.x - kick.wheels[0].hub.x, Math.cos(facing) * 3);
    assert.deepEqual(rest.crew, kick.crew);
    assert.deepEqual(artilleryGeometry({ facing, recoil: 5 }), kick);
  }
});

test('limber reverses the barrel relative to travel and adds the forward ammunition carriage', () => {
  for (const facing of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const g = artilleryGeometry({ facing, limbered: true, recoil: 1 });
    close(g.muzzleGround.x, Math.cos(facing) * -34);
    close(g.muzzleGround.y, Math.sin(facing) * -34);
    close(g.limber.ground.x, Math.cos(facing) * 24);
    close(g.limber.ground.y, Math.sin(facing) * 24);
    assert.equal(g.limber.wheels.length, 2);
    assert.deepEqual(g, artilleryGeometry({ facing, limbered: true, recoil: 0 }));
  }
});

test('art stays within the declared apparatus footprint and never mutates input options', () => {
  const options = Object.freeze({ x: 600, y: 400, facing: 0, scale: 1 });
  const g = artilleryGeometry(options);
  assert.deepEqual(g.footprint, [{ x: 629, y: 383 }, { x: 629, y: 417 }, { x: 564, y: 417 }, { x: 564, y: 383 }]);
  assert.ok(g.barrel.every(point => point.x >= 564 && point.x <= 629));
  assert.deepEqual(g, artilleryGeometry(options));
  assert.throws(() => artilleryGeometry({ facing: NaN }), /finite/);
  assert.throws(() => artilleryGeometry({ scale: -1 }), /nonnegative/);
  assert.throws(() => artilleryGeometry({ groundCompression: 0 }), /positive/);
});

function fakeScene() {
  const nodes = [];
  const make = (kind) => {
    const node = { kind, commands: [], children: [], visible: true, x: 0, y: 0, depth: 0, alpha: 1 };
    for (const method of ['fillStyle', 'lineStyle', 'fillPoints', 'strokePoints', 'lineBetween', 'fillCircle', 'strokeCircle', 'fillEllipse', 'fillRect']) node[method] = (...args) => { node.commands.push([method, ...args]); return node; };
    node.clear = () => { node.commands = []; return node; };
    node.setPosition = (x, y) => { Object.assign(node, { x, y }); return node; };
    node.setDepth = depth => { node.depth = depth; return node; };
    node.setAlpha = alpha => { node.alpha = alpha; return node; };
    node.setVisible = visible => { node.visible = visible; return node; };
    node.setTexture = (texture, frame) => { Object.assign(node, { texture, frame }); return node; };
    node.setOrigin = (originX, originY) => { Object.assign(node, { originX, originY }); return node; };
    node.setScale = scale => { node.scale = scale; return node; };
    node.setAngle = angle => { node.angle = angle; return node; };
    node.setFlipX = flipX => { node.flipX = flipX; return node; };
    node.add = child => { node.children.push(child); return node; };
    node.sort = property => { node.children.sort((a, b) => a[property] - b[property]); return node; };
    nodes.push(node);
    return node;
  };
  return { nodes, textures: { exists: key => ['union-directional', 'confederate-directional'].includes(key) }, add: { container: () => make('container'), graphics: () => make('graphics'), image: () => make('image') } };
}

test('artillery display lifecycle reuses bounded objects and returns the muzzle actually drawn', () => {
  const scene = fakeScene();
  const view = createArtilleryVisual(scene, 'confederate');
  const count = scene.nodes.length;
  const options = { x: 500, y: 400, facing: Math.PI / 4, scale: 0.82, recoil: 0.3, alpha: 0.45, depth: 4077 };
  for (let i = 0; i < 100; i++) updateArtilleryVisual(view, { ...options, time: i });
  assert.equal(scene.nodes.length, count, 'updates create no new scene objects');
  assert.deepEqual(view.geometry.muzzle, artilleryGeometry(options).muzzle);
  assert.equal(view.container.alpha, 0.45);
  assert.equal(view.container.depth, 4077);
  assert.equal(view.container.x, 500);
  assert.ok(view.parts.barrel.commands.some(([method]) => method === 'fillPoints'));
  assert.equal(view.parts.limber.visible, false);
});

test('abandoned guns remove crew; movement adds limber; reduced motion freezes stride and recoil', () => {
  const scene = fakeScene();
  const view = createArtilleryVisual(scene, 'union');
  updateArtilleryVisual(view, { abandoned: true });
  assert.equal(view.parts.crew0.visible, false);
  assert.equal(view.parts.crew1.visible, false);
  assert.equal(view.parts.crew2.visible, false);
  assert.equal(view.parts.barrel.visible, true);
  updateArtilleryVisual(view, { limbered: true, moving: true, time: 3 });
  assert.equal(view.parts.limber.visible, true);
  assert.equal(view.parts.limberWheel0.visible, true);
  assert.equal(view.parts.crew0.visible, true);
  updateArtilleryVisual(view, { moving: true, time: 5, reducedMotion: true, recoil: 1 });
  const reduced = JSON.stringify(view.parts.crew0.commands);
  close(view.geometry.muzzleGround.x, 26);
  updateArtilleryVisual(view, { moving: true, time: 19, reducedMotion: true });
  assert.equal(JSON.stringify(view.parts.crew0.commands), reduced);
  updateArtilleryVisual(view, { alpha: 0 });
  assert.equal(view.container.visible, false);
});

test('faction uniforms are distinct without changing gun geometry or equipment silhouette', () => {
  const union = createArtilleryVisual(fakeScene(), 'union');
  const confederate = createArtilleryVisual(fakeScene(), 'confederate');
  const gu = updateArtilleryVisual(union, { facing: 2 });
  const gc = updateArtilleryVisual(confederate, { facing: 2 });
  assert.deepEqual(gu, gc);
  assert.notDeepEqual(union.parts.crew0.commands, confederate.parts.crew0.commands);
  assert.deepEqual(union.parts.barrel.commands, confederate.parts.barrel.commands);
});

test('optional atlas crew share the infantry scale, ground anchors, upright bearing frames and parent lifetime', () => {
  const scene = fakeScene();
  const view = createArtilleryVisual(scene, 'union', { crewTexture: 'union-directional' });
  const nodeCount = scene.nodes.length;
  const options = { x: 800, y: 360, scale: 0.82, facing: Math.PI / 2, moving: true, limbered: true, time: 0.75 };
  for (let i = 0; i < 30; i++) updateArtilleryVisual(view, options);
  assert.equal(scene.nodes.length, nodeCount);
  assert.equal(view.crewSprites.length, 3);
  for (const [index, sprite] of view.crewSprites.entries()) {
    assert.ok(view.container.children.includes(sprite));
    assert.equal(view.parts[`crew${index}`].visible, false);
    assert.equal(sprite.visible, true);
    assert.match(sprite.frame, /^walk-2-[0-3]$/);
    close(sprite.scale, 0.6 * 0.82);
    close(sprite.x + view.container.x, view.geometry.crew[index].x);
    close(sprite.y + view.container.y, view.geometry.crew[index].y);
    assert.equal(sprite.angle, 0);
    assert.equal(sprite.flipX, false);
    assert.equal(sprite.originY, 0.8);
  }
  updateArtilleryVisual(view, { ...options, reducedMotion: true, time: 100, crewAction: 'reload' });
  assert.ok(view.crewSprites.every(sprite => sprite.frame === 'reload-2-0'));
  updateArtilleryVisual(view, { ...options, abandoned: true });
  assert.ok(view.crewSprites.every(sprite => !sprite.visible));
  updateArtilleryVisual(view, { ...options, crewTexture: 'missing' });
  assert.ok(view.crewSprites.every(sprite => !sprite.visible));
  assert.equal(view.parts.crew0.visible, true);
});
