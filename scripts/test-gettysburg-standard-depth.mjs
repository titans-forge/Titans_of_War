import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { updateFormationVisual } from '../src/battle/formationVisualState.js';
import { restoreFormationVisualFromCheckpoint } from '../src/battle/formationVisualCheckpoint.js';
import { deterministicUnitValue, formationFootprint } from '../src/battle/formationMath.js';
import { gettysburgInfantryFamilyEnabled, gettysburgInfantryStandardAnchor } from '../src/battle/gettysburgInfantryFamily.js';
import { formationStatusLabel } from '../src/battle/battleTactics.js';
import { isPanGesture, nearestHit } from '../src/battle/battleUsability.js';
import { retreatOpacity } from '../src/battle/retreatPresentation.js';
import { gettysburgInfantryClipPose } from '../src/battle/gettysburgInfantryClips.js';

// Exercise the actual scene methods and visual-state geometry without mounting
// React or a browser canvas. These display objects retain Phaser's relevant
// transforms, container ownership, input state and event callbacks.
class Display {
  constructor(x = 0, y = 0) {
    Object.assign(this, { x, y, alpha: 1, visible: true, scaleX: 1, scaleY: 1, depth: 0, data: new Map(), events: new Map() });
  }
  setOrigin() { return this; }
  setBlendMode() { return this; }
  setStrokeStyle() { return this; }
  setAngle() { return this; }
  setFlipX() { return this; }
  setRotation() { return this; }
  setSize() { return this; }
  setY(y) { this.y = y; return this; }
  setPosition(x, y) { Object.assign(this, { x, y }); return this; }
  setScale(x, y = x) { Object.assign(this, { scaleX: x, scaleY: y }); return this; }
  setDepth(depth) { this.depth = depth; return this; }
  setVisible(visible) { this.visible = visible; return this; }
  setAlpha(alpha) { this.alpha = alpha; return this; }
  setText(text) { this.text = text; return this; }
  setDisplaySize(width, height) { Object.assign(this, { width, height }); return this; }
  setInteractive(hitArea, hitAreaCallback) { this.input = { enabled: true, hitArea, hitAreaCallback }; return this; }
  disableInteractive() { if (this.input) this.input.enabled = false; return this; }
  setData(key, value) { this.data.set(key, value); return this; }
  getData(key) { return this.data.get(key); }
  on(name, callback) { this.events.set(name, callback); return this; }
}
class Rectangle {
  constructor(x, y, width, height) { Object.assign(this, { x, y, width, height }); }
  static Contains(area, x, y) { return x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height; }
}
class Polygon {
  constructor(points) { this.points = points; }
  static Contains() { return true; }
}
const source = readFileSync(new URL('../src/battle/CivilWarBattlefield.jsx', import.meta.url), 'utf8');
const Scene = vm.runInNewContext(`${source.slice(source.indexOf('class CivilWarBattleScene'))}; CivilWarBattleScene`, {
  Phaser: { Scene: class {}, BlendModes: { NORMAL: 0 }, Geom: { Rectangle, Polygon } },
  siegeTargetPlan: () => [], createSiegeTargetVisual: () => null,
  createStandardPole: () => Object.assign(new Display(), { kind: 'pole' }),
  createRealisticStandard: () => Object.assign(new Display(0, -68), { kind: 'cloth' }),
  createArtilleryVisual: () => null,
  DETAILED_UNIT_PAGES: ['ready', 'march'],
  restoreFormationVisualFromCheckpoint, updateFormationVisual, deterministicUnitValue, formationFootprint,
  gettysburgInfantryFamilyEnabled, gettysburgInfantryStandardAnchor, formationStatusLabel,
  gettysburgInfantryClipPose,
  updateTravelDust: () => [], updatePeriodStandard() {}, retreatOpacity, nearestHit, isPanGesture,
});

function fixture({ scenarioId = 'gettysburg', side = 'confederate', type = 'infantry', search = '' } = {}) {
  const unit = { id: 'test-formation', name: 'Test Formation', side, type, active: true, x: 500, y: 400,
    facing: -Math.PI / 2, frontage: 124, formationMode: 'line', footprint: { width: 124, depth: 32 },
    strength: 180, initialStrength: 180, status: 'steady', order: 'hold', ammunition: 30,
    engagedWith: null, lastVolleyAt: -100, volleySerial: 0, reload: 0, fatigue: 0 };
  const scene = Object.create(Scene.prototype);
  const graphics = { fillStyle() { return this; }, fillEllipse() { return this; } };
  Object.assign(scene, { scenarioId, artPassSearch: search, views: new Map(), tactical: true, reducedMotion: false, speed: 0,
    engine: { time: 0, resolutionTime: 0, snapshot: () => ({ formations: [unit] }) }, textures: { exists: () => false },
    cameras: { main: { zoom: 1 } }, world: { width: 1700, height: 900 }, shadows: graphics, dust: graphics, smoke: graphics,
    activePointers: new Set(), onSelectFormation(id) { this.selectedId = id; },
    add: {
      image: (x, y) => new Display(x, y), rectangle: (x, y) => new Display(x, y),
      text: (x, y, text) => new Display(x, y).setText(text), zone: (x, y) => new Display(x, y),
      container(x, y, children) {
        const container = Object.assign(new Display(x, y), { list: children });
        children.forEach(child => { child.parentContainer = container; });
        return container;
      },
    },
  });
  scene.createFormation(unit);
  scene.syncFormation(unit, 0, false, []);
  return { scene, unit, view: scene.views.get(unit.id) };
}

test('Gettysburg pole and cloth follow living ground depth while inspection stays above the field', () => {
  for (const search of ['', '?artPass=gettysburg-v1', '?artPass=gettysburg-v2']) for (const side of ['union', 'confederate']) {
    const { scene, unit, view } = fixture({ search, side });
    assert.equal(view.standard.list.length, 2);
    assert.equal(view.flag.parentContainer, view.standard);
    for (const item of [view.label, view.bar, view.barBack, view.condition]) assert.equal(item.parentContainer, view.standardUI);
    assert.equal(view.standardUI.depth, 40000);
    assert.equal(view.standard.list[0].scaleY, 1.45);
    assert.equal(view.flag.y, -96, 'the raised cloth keeps its local height');
    const anchorId = view.standardAnchorId;
    for (const [time, x, y, facing] of [[0, 500, 400, -Math.PI / 2], [1, 520, 430, 0], [2, 520, 430, Math.PI / 4]]) {
      Object.assign(unit, { x, y, facing });
      scene.syncFormation(unit, time, false, []);
      const anchor = gettysburgInfantryStandardAnchor(unit, view.visual.output.figures, anchorId);
      assert.equal(view.standardAnchorId, anchorId, 'turning and movement retain the surviving anchor');
      assert.equal(view.standard.x, anchor.x + 4 * .82);
      assert.equal(view.standard.y, anchor.y);
      assert.equal(view.standard.depth, anchor.y * 10 + 3);
      assert.equal(view.standard.depth, view.soldiers[anchor.id].sprite.depth + 1);
      assert.deepEqual([view.standardUI.x, view.standardUI.y, view.standardUI.scaleX], [view.standard.x, view.standard.y, view.standard.scaleX]);
      assert.equal(view.standardUI.depth, 40000);
      assert.ok(view.standard.depth < (anchor.y + 1) * 10 + 2, 'a nearer soldier sorts over the staff');
      assert.ok(view.standard.depth < (anchor.y + 1) * 10, 'nearer scenery sorts over the staff');
    }
    assert.equal(view.label.visible, false, 'names remain inspection-only');
  }
});

test('the raised cloth rectangle preserves hover, touch inspection and formation selection', () => {
  const { scene, unit, view } = fixture();
  const input = view.standardUI;
  assert.equal(view.standard.input, undefined);
  assert.deepEqual([input.input.hitArea.x, input.input.hitArea.y, input.input.hitArea.width, input.input.hitArea.height], [-24, -98, 65, 116]);
  assert.equal(Rectangle.Contains(input.input.hitArea, 20, -90), true, 'raised cloth remains inside the input area');
  input.events.get('pointerover')({ wasTouch: false });
  scene.syncFormation(unit, 0, false, []);
  for (const item of [view.label, view.bar, view.barBack]) assert.equal(item.visible, true);
  input.events.get('pointerout')();
  input.events.get('pointerover')({ wasTouch: true });
  scene.syncFormation(unit, 0, false, []);
  assert.equal(view.label.visible, false);
  const pointer = { id: 1, x: input.x + 20 * input.scaleX, y: input.y - 90 * input.scaleY, wasTouch: true,
    positionToCamera() { return { x: this.x, y: this.y }; } };
  scene.beginFieldGesture(pointer, [view.hitArea, input]);
  scene.endFieldGesture(pointer);
  assert.equal(scene.selectedId, unit.id);
  assert.equal(scene.touchInspectId, unit.id);
  scene.syncFormation(unit, 0, false, []);
  assert.equal(view.label.visible, true);
  assert.equal(input.getData('selectionAnchor'), true);
  assert.equal(input.getData('formationId'), unit.id);
});

test('departure fades both layers, disables selection and restores a returning active formation', () => {
  const { scene, unit, view } = fixture();
  scene.touchInspectId = unit.id;
  view.hovered = true;
  Object.assign(unit, { active: false, withdrawn: true, retiredAt: 2 });
  scene.syncFormation(unit, 2.5, false, []);
  for (const layer of [view.standard, view.standardUI]) {
    assert.equal(layer.alpha, .5);
    assert.equal(layer.visible, true);
  }
  assert.equal(view.standardUI.input.enabled, false);
  assert.equal(view.hitArea.input.enabled, false);
  assert.equal(scene.touchInspectId, null);
  for (const item of [view.label, view.bar, view.barBack, view.condition]) assert.equal(item.visible, false);
  scene.syncFormation(unit, 3, false, []);
  for (const layer of [view.standard, view.standardUI]) assert.equal(layer.visible, false);
  Object.assign(unit, { active: true, withdrawn: false });
  scene.syncFormation(unit, 4, false, []);
  for (const layer of [view.standard, view.standardUI]) {
    assert.equal(layer.alpha, 1);
    assert.equal(layer.visible, true);
  }
  assert.equal(view.standardUI.input.enabled, true);
  assert.equal(view.hitArea.input.enabled, true);
  assert.equal(view.label.visible, false);
});

test('broken formations hide both layers and disable their input until survivors return', () => {
  const { scene, unit, view } = fixture();
  unit.status = 'broken';
  scene.syncFormation(unit, 1, false, []);
  assert.equal(view.footprint.length, 0);
  for (const layer of [view.standard, view.standardUI]) assert.equal(layer.visible, false);
  assert.equal(view.standardUI.input.enabled, false);
  assert.equal(view.hitArea.input.enabled, false);
  unit.status = 'routing';
  scene.syncFormation(unit, 2, true, []);
  for (const layer of [view.standard, view.standardUI]) assert.equal(layer.visible, true);
  assert.equal(view.standardUI.input.enabled, true);
  assert.equal(view.hitArea.input.enabled, true);
});

test('escaped units and reduced-motion departures remove both layers immediately', () => {
  for (const reducedMotion of [false, true]) {
    const { scene, unit, view } = fixture();
    scene.reducedMotion = reducedMotion;
    Object.assign(unit, { active: false, withdrawn: reducedMotion, retiredAt: 2 });
    scene.syncFormation(unit, 2, false, []);
    for (const layer of [view.standard, view.standardUI]) {
      assert.equal(layer.alpha, 0);
      assert.equal(layer.visible, false);
    }
    assert.equal(view.standardUI.input.enabled, false);
    assert.equal(view.hitArea.input.enabled, false);
  }
});

test('Gettysburg artillery and other scenario standards retain their existing single overlay', () => {
  for (const options of [{ type: 'artillery' }, { scenarioId: 'gettysburg_meade' }, { scenarioId: 'gettysburg_jackson' }, { scenarioId: 'shiloh' }]) {
    const { view } = fixture(options);
    assert.equal(view.standardUI, null);
    assert.equal(view.standard.depth, 40000);
    assert.equal(view.standard.list.length, 6);
    assert.equal(view.label.parentContainer, view.standard);
    assert.equal(view.flag.y, -68);
    assert.equal(view.standard.input.enabled, true);
    assert.deepEqual([view.standard.input.hitArea.y, view.standard.input.hitArea.height], [-58, 76]);
  }
});
