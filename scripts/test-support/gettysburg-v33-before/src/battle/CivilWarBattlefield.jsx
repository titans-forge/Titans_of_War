import { FieldPresentationCache } from './fieldPresentationCache.js';
import { startFieldProfile, recordFieldProfile, attachFieldProfileRenderer, stopFieldProfile } from './fieldPerformance.js';
import { battleLocations } from './battleLocations.js';
import { sortieTargets } from './siegeCommand.js';
import { siegeTargetAssets, siegeTargetPlan, createSiegeTargetVisual, updateSiegeTargetVisual } from './siegeTargetVisual.js';
import { landmarkField, landmarkDestinationError } from './historicalLandmarks.js';
import { createStandardTextures, createRealisticStandard, createStandardPole } from './realisticStandards.js';
import { createSceneryTextures } from './realisticScenery.js';
import { DETAILED_UNIT_PAGES, createDetailedUnitTextures, detailedInfantryPose, detailedUnitAssetDirectory } from './detailedUnitVisual.js';
import { gettysburgInfantryFamilyAssets, gettysburgInfantryFamilyEnabled, gettysburgInfantryFamilyPose, gettysburgInfantryFamilyTextureKey, gettysburgInfantryStandardAnchor } from './gettysburgInfantryFamily.js';
import { prepareGettysburgInfantryClips, gettysburgInfantryClipPose } from './gettysburgInfantryClips.js';
import { gettysburgInfantryClipAssets, gettysburgInfantryClipDefinitions } from './gettysburgInfantryClipAssets.js';
import { gettysburgInfantryClipPolicy } from './gettysburgInfantryClipPolicy.js';
import { gettysburgInfantryShootingAge } from './gettysburgInfantryShotMotion.js';
import { gettysburgInfantryReloadProgress } from './gettysburgInfantryReloadProgress.js';
import { sampleGettysburgInfantryVolley, createGettysburgInfantryShotCheckpoint, restoreGettysburgInfantryShots } from './gettysburgInfantryVolleyPresentation.js';
import { realisticInfantryPose, updateTravelDust } from './realisticUnitVisual.js';
import { CommandTrainingEngine } from './commandTraining.js';
import { previewGroupOrder, confirmGroupOrder } from './groupOrders.js';
import { fieldExitTargets } from './fieldBattleProfiles.js';
import { siegeTerrainAssets } from './siegeTerrainVisual.js';
import { drawFieldTerrain } from './fieldTerrainVisual.js';
import { retreatOpacity } from './retreatPresentation.js';
import { drawPeriodStandard, updatePeriodStandard } from './periodStandards.js';
import { RIDGE_SECTORS, gettysburgOrganized } from './gettysburgMechanics.js';
import { drawGettysburgTerrain } from './gettysburgTerrainVisual.js';
import { createArtilleryVisual, updateArtilleryVisual } from './artilleryVisual.js';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import Phaser from 'phaser';
import { CivilWarBattleEngine } from './civilWarEngine.js';
import { combatCheckpointEnvelope } from './combatCheckpointEnvelope.js';
import { createFormationVisualCheckpoint, restoreFormationVisualFromCheckpoint } from './formationVisualCheckpoint.js';
import { getBattleEngineConfig } from './battleDefinitions.js';
import { deterministicUnitValue, formationFootprint } from './formationMath.js';
import { updateFormationVisual } from './formationVisualState.js';
import { formationStatusLabel } from './battleTactics.js';
import { overviewZoom, boundedZoom, formationFocusZoom, nearestHit, isPanGesture, canCommand } from './battleUsability.js';

const PUBLIC_BASE = import.meta.env.BASE_URL;

function projectedScale(y, projection, world) {
  const depth = Math.max(0, Math.min(1, (y - projection.horizon) / (world.height - projection.horizon)));
  return projection.farScale + (projection.nearScale - projection.farScale) * depth;
}

export const CivilWarBattlefield = forwardRef(function CivilWarBattlefield({ scenarioId, campaignState, choiceId, speed, selectedId, onSelect, onSnapshot, onDestination, onZoom, terrainOverlay = false, missionMarkers = true, onGroupPreview, trainingLesson = null, checkpoint = null }, ref) {
  const host = useRef(null);
  const scene = useRef(null);

  useImperativeHandle(ref, () => ({
    checkpoint: () => scene.current?.checkpoint(),
    order: (order, point) => scene.current?.issueOrder(order, point),
    formation: (mode) => scene.current?.setFormation(mode),
    face: (angle) => scene.current?.faceDirection(angle),
    target: (id) => scene.current?.focusTarget(id),
    zoom: (delta) => scene.current?.changeZoom(delta),
    fit: () => scene.current?.fitCamera(),
    focus: () => scene.current?.focusSelected(),
    landmark: (id) => scene.current?.focusLandmark(id),
    objective: (id) => scene.current?.focusObjective(id),
    locate: (id) => scene.current?.focusLocation(id),
    selectAndFocus: (id) => { scene.current?.setSelected(id); scene.current?.focusSelected(); },
    mode: (mode) => scene.current?.setInputMode(mode),
    range: (show) => { if (scene.current) scene.current.showRange = show; },
    destination: (point) => scene.current?.previewDestination(point),
    confirmMove: () => scene.current?.confirmMove(),
    placeGroup: request => scene.current?.placeGroup(request),
    previewGroup: request => scene.current?.previewGroup(request),
    confirmGroup: () => scene.current?.confirmGroup(),
    cancelGroup: () => scene.current?.clearGroup(),
  }));

  useEffect(() => {
    if (!host.current) return undefined;
    const battleScene = new CivilWarBattleScene(scenarioId, campaignState, choiceId, onSelect, onSnapshot, onDestination, trainingLesson, checkpoint);
    battleScene.onZoom = onZoom;
    battleScene.onGroupPreview = onGroupPreview;
    battleScene.showOverlay = terrainOverlay;
    battleScene.showMissionMarkers = missionMarkers;
    battleScene.setSelected(selectedId);
    battleScene.setSpeed(speed);
    scene.current = battleScene;
    const game = new Phaser.Game({
      // Canvas is deliberate here: the representative formations remain well
      // below its practical sprite limit, while mobile iframe/WebGL contexts
      // can fail framebuffer creation after responsive resizing on itch.io.
      type: Phaser.CANVAS,
      parent: host.current,
      backgroundColor: '#111710',
      scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
      render: { antialias: true, pixelArt: false },
      // Campaign music owns audio; this scene has no Phaser sound assets.
      audio: { noAudio: true },
      scene: battleScene,
    });
    return () => {
      scene.current = null;
      game.destroy(true);
    };
  }, [scenarioId, campaignState, choiceId, onSelect, onSnapshot, trainingLesson, checkpoint]);

  useEffect(() => scene.current?.setSpeed(speed), [speed]);
  useEffect(() => scene.current?.setSelected(selectedId), [selectedId]);
  useEffect(() => { if (scene.current) scene.current.showOverlay = terrainOverlay; }, [terrainOverlay]);

  useEffect(() => { if (scene.current) scene.current.showMissionMarkers = missionMarkers; }, [missionMarkers]);

  return <div ref={host} className="cw-battlefield-host" aria-label={`Command field for ${scenarioId}`} />;
});

class CivilWarBattleScene extends Phaser.Scene {
  constructor(scenarioId, campaignState, choiceId, onSelect, onSnapshot, onDestination, trainingLesson, checkpoint) {
    super(`civil-war-${scenarioId}`);
    this.presentationCache = new FieldPresentationCache();
    this.profileStart = performance.now();
    this.scenarioId = scenarioId;
    this.config = getBattleEngineConfig(scenarioId);
    this.world = this.config.world;
    this.engine = trainingLesson ? new CommandTrainingEngine(trainingLesson) : checkpoint ? CivilWarBattleEngine.fromCheckpoint(combatCheckpointEnvelope(checkpoint), scenarioId, campaignState, choiceId) : new CivilWarBattleEngine(scenarioId, campaignState, choiceId);
    this.savedPresentation = checkpoint?.presentation;
    if (this.engine.gettysburg) this.config = { ...this.config, terrain: { ...this.config.terrain, key: this.engine.battleRulesVersion >= 10 ? 'gettysburg-terrain-v3' : 'gettysburg-terrain-v2', src: this.engine.battleRulesVersion >= 10 ? 'images/battles/gettysburg-terrain-v3.png' : 'images/battles/gettysburg-terrain-v2.webp' } };
    this.tactical = Boolean(this.engine.gettysburg || this.engine.fieldBattle);
    if (this.engine.fieldBattle) {
      const ground = { first_manassas: 'manassas-ground-v3', shiloh: 'shiloh-ground-v2' }[scenarioId] || 'realistic-v2/pasture';
      this.config = { ...this.config, terrain: { key: ground, src: `images/battles/${ground}.${ground.includes('realistic-v2') || ground === 'manassas-ground-v3' ? 'png' : 'webp'}`, mapMode: false } };
    }
    this.onSelectFormation = onSelect;
    this.onBattleSnapshot = onSnapshot;
    this.onDestination = onDestination;
    this.inputMode = 'move';
    this.artPassSearch = window.location.search;
    const infantryPolicy = gettysburgInfantryClipPolicy(this.scenarioId, this.artPassSearch);
    this.nativeShotMotion = infantryPolicy?.shotMotion === true;
    this.monotonicReload = infantryPolicy?.monotonicReload === true;
    this.shotPresentationId = infantryPolicy?.shotPresentationId;
    this.infantryPresentationScale = infantryPolicy?.infantryPresentationScale ?? 1;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.views = new Map();
    this.selectedId = this.engine.snapshot({ presentation: true }).formations.find((unit) => unit.side === 'confederate')?.id;
    this.speed = 0;
    this.snapshotClock = 0;
  }

  checkpoint() {
    const combat = this.engine.checkpoint();
    const snapshot = this.engine.snapshot({ presentation: true });
    const time = snapshot.time + (this.engine.resolutionTime || 0);
    const visuals = new Map();
    // Commands can arrive between presentation passes. Bring plain visual
    // state to the saved simulation instant without ticking or drawing.
    for (const formation of snapshot.formations) {
      const visual = this.views.get(formation.id)?.visual;
      if (!visual) continue;
      const foe = formation.inMelee && snapshot.formations.find(unit => unit.id === formation.meleeWith);
      const presented = foe ? { ...formation, contactFacing: Math.atan2(foe.y - formation.y, foe.x - formation.x) } : formation;
      const scale = this.tactical ? 0.82 : projectedScale(formation.y, this.config.projection, this.world);
      const sampled = updateFormationVisual(visual, presented, time, scale, { reducedMotion: this.reducedMotion, resolving: snapshot.resolving || snapshot.outcome !== 'undecided' });
      if (this.nativeShotMotion) {
        const view = this.views.get(formation.id);
        view.shots = sampleGettysburgInfantryVolley(view.shots, formation, sampled, time,
          { scenarioId: this.scenarioId, search: this.artPassSearch, clips: this.infantryClips || [], textures: this.textures, scale, infantryPresentationScale: this.infantryPresentationScale });
      }
      visuals.set(formation.id, visual);
    }
    const presentation = createFormationVisualCheckpoint(snapshot.formations, visuals, time);
    if (this.nativeShotMotion && presentation) presentation.shots = createGettysburgInfantryShotCheckpoint(snapshot.formations, this.views, time, this.shotPresentationId);
    return { ...combat, presentation };
  }

  preload() {
    for (const asset of gettysburgInfantryFamilyAssets(this.scenarioId, this.artPassSearch, PUBLIC_BASE)) this.load.atlas(asset.key, asset.image, asset.json);
    for (const asset of gettysburgInfantryClipAssets(this.scenarioId, this.artPassSearch, PUBLIC_BASE)) this.load.atlas(asset.key, asset.image, asset.json);
    for (const asset of siegeTargetAssets(this.engine.snapshot())) this.load.image(asset.key, `${PUBLIC_BASE}${asset.src}`);
    if (this.engine.fieldBattle) for (const asset of siegeTerrainAssets(this.scenarioId)) this.load.image(asset.key, `${PUBLIC_BASE}${asset.src}`);
    for (const site of landmarkField(this.engine)?.landmarks || []) this.load.image(`landmark-${site.id}`, `${PUBLIC_BASE}${site.src}`);
    this.load.image('bunting-material', `${PUBLIC_BASE}images/battles/realistic-v2/bunting.png`);
    // The July 3 terrain plate supplies its grove and orchard; this board only
    // stamps earthworks. Loading the unused foliage also created a full canvas.
    for (const kind of this.scenarioId === 'gettysburg' ? ['earthworks'] : ['foliage', 'earthworks']) {
      this.load.image(`${kind}-photo-source`, `${PUBLIC_BASE}images/battles/realistic-v2/${kind}.png`);
      this.load.json(`${kind}-photo-frames`, `${PUBLIC_BASE}images/battles/realistic-v2/${kind}.json`);
    }
    this.load.image(this.config.terrain.key, `${PUBLIC_BASE}${this.config.terrain.src}`);
    if (this.engine.fieldBattle) this.load.image('field-oak', `${PUBLIC_BASE}images/battles/oak-canopy-v1.webp`);
    this.load.image('confederate-infantry', `${PUBLIC_BASE}images/units/confederate-infantry-v1.webp`);
    this.load.image('union-infantry', `${PUBLIC_BASE}images/units/union-infantry-v1.webp`);
    this.load.image('union-artillery', `${PUBLIC_BASE}images/units/union-artillery-v2.png`);
    for (const side of ['union', 'confederate']) {
      for (const page of DETAILED_UNIT_PAGES) {
        const key = `${side}-detailed-${page}`;
        const directory = detailedUnitAssetDirectory(this.scenarioId, page, this.artPassSearch);
        this.load.image(`${key}-source`, `${PUBLIC_BASE}images/units/${directory}/${side}-${page}.png`);
        this.load.json(key, `${PUBLIC_BASE}images/units/${directory}/${side}-${page}.json`);
      }
      this.load.atlas(`${side}-aim-realistic`, `${PUBLIC_BASE}images/units/realistic-v1/axial-aim.png`, `${PUBLIC_BASE}images/units/realistic-v1/${side}-aim.json`);
      this.load.atlas(`${side}-realistic`, `${PUBLIC_BASE}images/units/realistic-v1/${side}-infantry.png`, `${PUBLIC_BASE}images/units/realistic-v1/${side}-infantry.json`);
      this.load.atlas(`${side}-crew-realistic`, `${PUBLIC_BASE}images/units/realistic-v1/artillery-crew.png`, `${PUBLIC_BASE}images/units/realistic-v1/${side}-crew.json`);
      this.load.atlas(`${side}-melee`, `${PUBLIC_BASE}images/units/directional-melee-v1/${side}-infantry.webp`, `${PUBLIC_BASE}images/units/directional-melee-v1/${side}-infantry.json`);
      this.load.atlas(`${side}-directional`, `${PUBLIC_BASE}images/units/directional-v2/${side}-infantry.webp`, `${PUBLIC_BASE}images/units/directional-v2/${side}-infantry.json`);
    }
  }

  create() {
    createDetailedUnitTextures(this);
    this.infantryClips = prepareGettysburgInfantryClips(
      gettysburgInfantryClipDefinitions(this.scenarioId, this.artPassSearch, this.textures),
      (key, frame) => this.textures.exists(key) && this.textures.get(key).has(frame),
    );
    createStandardTextures(this);
    createSceneryTextures(this);
    this.cameras.main.setBounds(0, 0, this.world.width, this.world.height);
    this.cameras.main.centerOn(this.world.width / 2, this.world.height / 2);
    this.fitCamera();
    this.add.image(0, 0, this.config.terrain.key).setOrigin(0).setDisplaySize(this.world.width, this.world.height);
    if (this.config.terrain.mapMode) {
      this.add.rectangle(0, 0, this.world.width, this.world.height, 0x17150f, 0.12).setOrigin(0).setDepth(1);
    }
    this.overlayExtras = [];
    if (this.config.withdrawalCorridor) {
      const exit = this.config.withdrawalCorridor;
      this.overlayExtras.push(this.add.rectangle(exit.left, exit.top, exit.right - exit.left, this.world.height - exit.top, 0x92c8ac, 0.13)
        .setOrigin(0).setStrokeStyle(2, 0xb6dbc0, 0.7).setDepth(1));
      this.overlayExtras.push(this.add.text((exit.left + exit.right) / 2, this.world.height - 22, 'WINCHESTER WITHDRAWAL', {
        fontFamily: 'Outfit, sans-serif', fontSize: '16px', color: '#e6f5e8',
        backgroundColor: 'rgba(8,22,14,.8)', padding: { x: 7, y: 4 },
      }).setOrigin(0.5, 1).setDepth(1));
    }
    if (this.tactical) {
      this.terrainLayer = this.engine.gettysburg ? drawGettysburgTerrain(this) : drawFieldTerrain(this);
      this.sectorViews = (this.engine.gettysburg ? RIDGE_SECTORS : this.engine.fieldBattle.sectors).map(s => ({ sector: s,
        box: this.add.rectangle(s.x, s.y, s.width, s.height, 0x628ed0, 0.1).setStrokeStyle(2, 0x8cb6ed, 0.9).setDepth(1),
        label: this.add.text(s.x, this.engine.fieldBattle ? s.y + s.height / 2 - 8 : s.y - s.height / 2 - 8, s.name, { fontFamily: 'Outfit, sans-serif', fontSize: '16px', align: 'center', color: '#fff5d8', backgroundColor: '#16251ddd', padding: { x: 5, y: 3 } }).setOrigin(0.5, 1).setDepth(1),
      }));
      if (this.engine.gettysburg) for (const y of [18, this.world.height - 18]) for (const x of [180, 850, 1510]) {
        this.overlayExtras.push(this.add.rectangle(x, y, 140, 32, y < 100 ? 0x456cab : 0xad5350, 0.5).setDepth(1));
        this.overlayExtras.push(this.add.text(x, y, y < 100 ? 'US REAR EXIT' : 'CS REAR EXIT', { fontSize: '13px', color: '#ffffff' }).setOrigin(0.5).setDepth(1));
      }
    }
    this.missionLabels = [];
    for (const site of landmarkField(this.engine)?.landmarks || []) {
      this.add.image(site.x, site.y - 18, `landmark-${site.id}`).setDisplaySize(site.artWidth, site.artHeight).setDepth((site.y + site.height / 2) * 10);
      this.missionLabels.push(this.add.text(site.x, site.y + (site.labelOffsetY ?? site.height / 2 + 20), site.name, { fontFamily: 'Outfit, sans-serif', fontSize: '14px', color: '#ffedc2', stroke: '#1f2119', strokeThickness: 4 }).setOrigin(.5).setDepth(39000));
      const outline = this.add.rectangle(site.x, site.y, site.width, site.height, 0xc5a25e, .08).setStrokeStyle(2, 0xf7d994, .9).setDepth(39000);
      this.overlayExtras.push(outline);
    }
    if (this.tactical) {
      const sortieSites = sortieTargets(this.engine.snapshot());
      const sites = sortieSites.length ? sortieSites : this.engine.gettysburg ? RIDGE_SECTORS : this.engine.fieldBattle.attackObjective ? [this.engine.fieldBattle.attackObjective] : this.engine.fieldBattle.sectors;
      const exits = this.engine.fieldBattle ? fieldExitTargets(this.engine, { side: 'confederate' }) : [{ x: this.world.width / 2, y: this.world.height - 18 }];
      for (const site of sites) {
        const label = this.add.text(site.x, site.y - site.height / 2 - 12, `◇ ${site.name}`, { fontFamily: 'Outfit, sans-serif', fontSize: '13px', color: '#fff0c7', stroke: '#253022', strokeThickness: 4 }).setOrigin(.5, 1).setDepth(sortieSites.length ? 39000 : 1);
        if (sortieSites.length) label.setData('sortieSite', site);
        this.missionLabels.push(label);
      }
      // One direction marker per distinct rear route, without terrain boxes.
      const exit = exits[Math.floor(exits.length / 2)];
      if (exit) this.missionLabels.push(this.add.text(exit.x, exit.y < this.world.height / 2 ? 26 : this.world.height - 26, this.config.withdrawalCorridor ? '↓ Winchester corridor' : exit.y < this.world.height / 2 ? '↑ Confederate rear' : '↓ Confederate rear', { fontFamily: 'Outfit, sans-serif', fontSize: '13px', color: '#d3ead2', stroke: '#253022', strokeThickness: 4 }).setOrigin(.5).setDepth(1));
    }
    this.input.addPointer(1);
    this.activePointers = new Set();
    this.input.setTopOnly(false);
    this.input.on('pointerdown', (pointer, objects) => this.beginFieldGesture(pointer, objects));
    this.input.on('pointermove', pointer => this.moveFieldGesture(pointer));
    this.input.on('pointerup', pointer => this.endFieldGesture(pointer));
    this.input.on('pointerupoutside', pointer => { this.activePointers.delete(pointer.id); this.gesture = null; });
    this.input.on('gameout', () => { this.activePointers.clear(); this.gesture = null; });
    this.groupGraphics = this.add.graphics().setDepth(3);
    if (this.engine.training?.point) { const p=this.engine.training.point;this.add.circle(p.x,p.y,20,0xe4ce79,.2).setStrokeStyle(2,0xffeda8).setDepth(2);this.add.text(p.x,p.y+28,'Practice marker',{fontSize:'15px',color:'#fff4c8',stroke:'#18251b',strokeThickness:4}).setOrigin(.5).setDepth(2); }
    this.shadows = this.add.graphics().setDepth(2);
    this.dust = this.add.graphics().setDepth(3);
    this.selection = this.add.graphics().setDepth(3);
    this.supportLabel = this.add.text(0, 0, '', { fontFamily: 'Outfit, sans-serif', fontSize: '12px', color: '#ffe2a6', backgroundColor: '#27322aeb', padding: { x: 5, y: 3 } }).setOrigin(0.5).setDepth(40001).setVisible(false);
    this.smoke = this.add.graphics().setDepth(45000);
    for (const formation of this.engine.snapshot({ presentation: true }).formations) this.createFormation(formation);
    this.input.on('wheel', (_pointer, _objects, _dx, dy) => this.changeZoom(dy > 0 ? -0.08 : 0.08));
    this.scale.on('resize', () => {
      // Fractional CSS sizes can produce repeated Phaser resize notifications.
      if (this.fittedWidth !== this.scale.width || this.fittedHeight !== this.scale.height) {
        this.resizeCamera();
      }
    });
    this.setSelected(this.selectedId);
    if (this.scale.width <= 700 && !this.engine.training) this.focusSelected();
    this.emitSnapshot();
    this.profile = startFieldProfile(this.game.canvas.parentElement, this.profileStart);
    attachFieldProfileRenderer(this.profile, this.game);
    this.events.once('shutdown', () => stopFieldProfile(this.profile));
  }

  beginFieldGesture(pointer, objects) {
    this.activePointers.add(pointer.id);
    // A second contact cancels the entire gesture; lifting either finger cannot order a move.
    if (this.activePointers.size > 1) { this.gesture = null; return; }
    const point = pointer.positionToCamera(this.cameras.main);
    const formations = this.engine.snapshot({ presentation: true }).formations;
    const friendly = nearestHit(objects, point, 'formationId', formations);
    const inspected = nearestHit(objects, point, 'inspectId', formations);
    this.gesture = { id: pointer.id, x: pointer.x, y: pointer.y, scrollX: this.cameras.main.scrollX, scrollY: this.cameras.main.scrollY, unitId: friendly?.getData('formationId'), inspectId: inspected?.getData('inspectId'), dragged: false };
  }

  moveFieldGesture(pointer) {
    const start = this.gesture;
    if (!start || start.id !== pointer.id || !pointer.isDown) return;
    start.dragged ||= isPanGesture(start, pointer);
    if (!start.dragged) return;
    this.cameraMode = 'manual';
    this.cameras.main.setScroll(start.scrollX - (pointer.x - start.x) / this.cameras.main.zoom, start.scrollY - (pointer.y - start.y) / this.cameras.main.zoom);
  }

  endFieldGesture(pointer) {
    const start = this.gesture;
    this.activePointers.delete(pointer.id);
    this.gesture = null;
    if (!start || start.id !== pointer.id || this.activePointers.size || start.dragged || isPanGesture(start, pointer)) return;
    if (this.pendingGroup?.placing) { this.previewGroup({...this.pendingGroup.request, point: pointer.positionToCamera(this.cameras.main)}); return; }
    this.touchInspectId = pointer.wasTouch ? start.inspectId || null : null;
    if (pointer.wasTouch && start.inspectId && !start.unitId) return;
    if (start.unitId) { this.onSelectFormation(start.unitId); return; }
    if (this.inputMode === 'move') this.previewDestination(pointer.positionToCamera(this.cameras.main));
  }

  resizeCamera() {
    if (!this.cameraMode || this.cameraMode === 'overview') return this.fitCamera();
    const camera = this.cameras.main;
    const center = { x: camera.midPoint.x, y: camera.midPoint.y };
    const zoom = boundedZoom(camera.zoom, 0, overviewZoom(this.scale, this.world));
    this.fittedWidth = this.scale.width;
    this.fittedHeight = this.scale.height;
    camera.setZoom(zoom);
    this.updateCameraBounds();
    if (this.cameraMode === 'focus') this.focusSelected();
    else if (this.cameraMode === 'landmark') this.focusLandmark(this.focusedLandmarkId);
    else if (this.cameraMode === 'location') this.focusLocation(this.focusedLocationId, false);
    else if (this.cameraMode === 'objective') this.focusObjective(this.focusedObjectiveId);
    else camera.centerOn(center.x, center.y);
    this.onZoom?.(camera.zoom / overviewZoom(this.scale, this.world));
  }

  fitCamera() {
    this.clearLocation();
    this.cameraMode = 'overview';
    this.fittedWidth = this.scale.width;
    this.fittedHeight = this.scale.height;
    const zoom = overviewZoom(this.scale, this.world);
    this.cameras.main.setZoom(zoom);
    this.updateCameraBounds();
    this.cameras.main.centerOn(this.world.width / 2, this.world.height / 2);
    if(this.engine.training){const units=this.engine.state.filter(u=>u.active);const xs=units.map(u=>u.x),ys=units.map(u=>u.y);const left=Math.min(...xs)-160,right=Math.max(...xs)+160,top=Math.min(...ys)-120,bottom=Math.max(...ys)+120;this.cameras.main.setZoom(Math.min(1.4,this.scale.width/(right-left),this.scale.height/(bottom-top)));this.updateCameraBounds();this.cameras.main.centerOn((left+right)/2,(top+bottom)/2);}
    this.onZoom?.(1);
  }

  updateCameraBounds() {
    const camera = this.cameras.main;
    // Phaser pins an undersized world to its top-left unless bounds include the letterbox.
    const padX = Math.max(0, (camera.width / camera.zoom - this.world.width) / 2);
    const padY = Math.max(0, (camera.height / camera.zoom - this.world.height) / 2);
    camera.setBounds(-padX, -padY, this.world.width + padX * 2, this.world.height + padY * 2);
  }

  update(_time, delta) {
    if (document.hidden) return;
    const profileStart = this.profile ? performance.now() : 0;
    const advancing = this.speed > 0 || Boolean(this.engine.pendingOutcome);
    if (advancing) {
      const effectiveSpeed = this.engine.pendingOutcome ? 1 : this.speed;
      let remaining = delta / 1000 * effectiveSpeed;
      while (remaining > 0) {
        const step = Math.min(remaining, 0.05);
        this.engine.tick(step);
        remaining -= step;
      }
      this.snapshotClock += delta;
    }
    const snapshotBuilt = advancing || !this.presentationCache.current;
    const snapshot = this.presentationCache.snapshot(this.engine, advancing);
    const inspection = `${this.selectedId}|${this.touchInspectId}|${this.reducedMotion}|${[...this.views].filter(([, view]) => view.hovered).map(([id]) => id).join(',')}`;
    const formationPass = this.presentationCache.needsFormationPass(snapshot, this.cameras.main.zoom, inspection);
    if (formationPass) {
      this.shadows.clear();
      this.dust.clear();
      this.smoke.clear();
      const visualTime = snapshot.time + (this.engine.resolutionTime || 0);
      for (const formation of snapshot.formations) {
        const foe = formation.inMelee && snapshot.formations.find(u => u.id === formation.meleeWith);
        this.syncFormation(foe ? {...formation,contactFacing:Math.atan2(foe.y-formation.y,foe.x-formation.x)} : formation, visualTime, snapshot.resolving || snapshot.outcome !== 'undecided', snapshot.sortieTargetsHit);
      }
    }
    this.terrainLayer?.setVisible(Boolean(this.showOverlay));
    for (const item of this.overlayExtras || []) item.setVisible(Boolean(this.showOverlay));
    for (const view of this.sectorViews || []) {
      view.box.setVisible(Boolean(this.showOverlay));
      view.label.setVisible(Boolean(this.showOverlay));
      const control = (snapshot.gettysburg || snapshot.fieldBattle).sectors.find(s => s.id === view.sector.id)?.control || 'vacant';
      const color = { union: 0x8cb6ed, confederate: 0xe5a198, contested: 0xffd46a, vacant: 0xb4b6ac }[control];
      view.box.setStrokeStyle(control === 'contested' ? 4 : 2, color, 0.95).setFillStyle(color, 0.10);
      view.label.setText(this.engine.fieldBattle ? view.sector.name : `${view.sector.name}\n${{union: 'US', confederate: 'CS', contested: 'CONTESTED', vacant: 'VACANT'}[control]}`);
      view.label.setScale(Math.min(2, 1 / this.cameras.main.zoom, (view.sector.width - 16) / view.label.width));
    }
    for (const label of this.missionLabels || []) {
      const site = label.getData('sortieSite');
      if (site) label.setText(`${snapshot.sortieTargetsHit?.includes(site.id) ? '✓' : '◇'} ${site.name}${snapshot.sortieTargetsHit?.includes(site.id) ? ' · Struck' : ''}`);
      label.setVisible(Boolean(this.showMissionMarkers) && !this.showOverlay).setScale(Math.min(1.5, 1 / this.cameras.main.zoom));
    }
    this.groupGraphics?.clear();
    for(const point of this.pendingGroup?.points || []) {const unit=snapshot.formations.find(u=>u.id===point.id);if(unit){this.groupGraphics.lineStyle(2,0xf1dfa4,.8).lineBetween(unit.x,unit.y,point.x,point.y).strokeCircle(point.x,point.y,18);}}
    this.drawSelection(snapshot);
    if (this.snapshotClock >= 140 || (snapshot.outcome !== 'undecided' && snapshot.outcome !== this.lastEmittedOutcome)) {
      this.emitSnapshot(snapshot);
      this.snapshotClock = 0;
      if (snapshot.outcome !== 'undecided') this.speed = 0;
    }
    recordFieldProfile(this.profile, this.speed > 0 ? 'running' : 'paused', delta, this.profile ? performance.now()-profileStart : 0, Number(snapshotBuilt), Number(formationPass));
  }

  createFormation(formation) {
    const site = siegeTargetPlan(this.engine.snapshot()).find(site => site.id === formation.id);
    const siegeSite = createSiegeTargetVisual(this, site);
    if (siegeSite) {
      this.views.set(formation.id, { siegeSite });
      return;
    }
    // Stable density keeps losses and footprints unchanged across orientation changes.
    const capacity = formation.type === 'artillery' ? 1 : 32;
    const texture = formation.type === 'artillery'
      ? 'union-artillery'
      : formation.side === 'confederate'
        ? 'confederate-infantry'
        : 'union-infantry';
    const directionalTexture = `${formation.side}-directional`;
    const directional = formation.type !== 'artillery' && this.textures.exists(directionalTexture);
    const soldiers = Array.from({ length: capacity }, () => {
      const sprite = this.add.image(formation.x, formation.y, texture)
        .setOrigin(0.5, formation.type === 'artillery' ? 0.7 : 0.82)
        .setBlendMode(Phaser.BlendModes.NORMAL);
      return { sprite };
    });
    const pole = createStandardPole(this);
    const flag = createRealisticStandard(this, formation.side, this.scenarioId);
    const groundStandard = this.scenarioId === 'gettysburg' && formation.type !== 'artillery';
    if (groundStandard) {
      // A longer staff keeps the cloth above heads once its base is on the
      // soldier's ground slot; raising the whole container would float it again.
      pole.setScale(1, 1.45);
      flag.setY(flag.y - 28);
    }
    const barBack = this.add.rectangle(-22, 6, 44, 6, 0x080b0e, 0.95).setOrigin(0, 0.5).setStrokeStyle(1, 0xd4af37, 0.75);
    const bar = this.add.rectangle(-21, 6, 42, 4, formation.side === 'confederate' ? 0xd06055 : 0x5d84d3).setOrigin(0, 0.5);
    const label = this.add.text(0, -61, formation.name, { fontFamily: 'Outfit, sans-serif', fontSize: '14px', color: '#f5ecd6', backgroundColor: 'rgba(8,11,15,.9)', padding: { x: 7, y: 4 } }).setOrigin(0.5, 1);
    if (groundStandard) label.setY(-95);
    const condition = this.add.text(0, 18, '', { fontFamily: 'Outfit, sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#ffe5b8', backgroundColor: '#39291de8', padding: { x: 5, y: 2 } }).setOrigin(0.5, 0).setVisible(false);
    const standard = this.add.container(formation.x, formation.y, groundStandard ? [pole, flag] : [pole, flag, barBack, bar, label, condition]).setDepth(groundStandard ? formation.y * 10 + 3 : 40000);
    // Inspection stays above the field, while the grounded staff and cloth sort
    // with the soldier beside them and can pass behind nearer people or trees.
    const standardUI = groundStandard ? this.add.container(formation.x, formation.y, [barBack, bar, label, condition]).setDepth(40000) : null;
    const standardInput = standardUI || standard;
    standardInput.setInteractive(new Phaser.Geom.Rectangle(-24, groundStandard ? -98 : -58, 65, groundStandard ? 116 : 76), Phaser.Geom.Rectangle.Contains);
    standardInput.setData('inspectId', formation.id);
    standardInput.setData('selectionAnchor', true);
    if (formation.side === 'confederate') standardInput.setData('formationId', formation.id);
    standardInput.on('pointerover', (pointer) => { if (pointer.wasTouch) return; this.views.get(formation.id).hovered = true; });
    standardInput.on('pointerout', () => { this.views.get(formation.id).hovered = false; });
    const hitArea = this.add.zone(formation.x, formation.y, Math.max(115, formation.frontage), formation.type === 'artillery' ? 100 : 115).setInteractive({ cursor: formation.side === 'confederate' ? 'pointer' : 'default' });
    hitArea.setData('inspectId', formation.id);
    if (formation.side === 'confederate') hitArea.setData('formationId', formation.id);
    hitArea.on('pointerover', (pointer) => { if (pointer.wasTouch) return; this.views.get(formation.id).hovered = true; });
    hitArea.on('pointerout', () => { this.views.get(formation.id).hovered = false; });
    const artillery = this.tactical && formation.type === 'artillery' ? createArtilleryVisual(this, formation.side, { crewTexture: this.textures.exists(`${formation.side}-detailed-crew`) ? `${formation.side}-detailed-crew` : `${formation.side}-crew-realistic`, realisticCrew: true, detailedCrew: this.textures.exists(`${formation.side}-detailed-crew`) }) : null;
    this.views.set(formation.id, { soldiers, standard, standardUI, flag, barBack, bar, label, condition, artillery, hitArea, hovered: false, capacity, texture, directionalTexture, directional, realistic: this.textures.exists(`${formation.side}-realistic`), detailed: DETAILED_UNIT_PAGES.every(page => this.textures.exists(`${formation.side}-detailed-${page}`)), infantryFamily: formation.type !== 'artillery' && gettysburgInfantryFamilyEnabled(this.scenarioId, this.artPassSearch), dust: {}, visual: restoreFormationVisualFromCheckpoint(formation, capacity, this.engine.time + (this.engine.resolutionTime || 0), this.savedPresentation), footprint: [] });
    if (this.nativeShotMotion) this.views.get(formation.id).shots = restoreGettysburgInfantryShots(formation, capacity, this.engine.time + (this.engine.resolutionTime || 0), this.savedPresentation, this.shotPresentationId);
  }

  syncFormation(formation, battleTime, resolving, sortieHits) {
    const view = this.views.get(formation.id);
    if (!view) return;
    if (view.siegeSite) {
      updateSiegeTargetVisual(view.siegeSite, sortieHits);
      return;
    }
    const standardLayers = view.standardUI ? [view.standard, view.standardUI] : [view.standard];
    if (!formation.active) {
      view.hovered = false;
      for (const item of [view.label, view.bar, view.barBack, view.condition]) item?.setVisible(false);
      if (this.touchInspectId === formation.id) this.touchInspectId = null;
      const opacity = this.tactical ? retreatOpacity(formation, battleTime, this.reducedMotion) : 0;
      view.departureAlphas ||= view.soldiers.map(soldier => soldier.sprite.alpha);
      for (const [index, soldier] of view.soldiers.entries()) {
        soldier.sprite.setAlpha(view.departureAlphas[index] * opacity).setVisible(soldier.sprite.visible && opacity > 0);
      }
      view.artillery?.container.setAlpha(opacity).setVisible(opacity > 0);
      for (const layer of standardLayers) {
        layer.setAlpha(opacity).setVisible(layer.visible && opacity > 0);
        layer.disableInteractive();
      }
      view.hitArea.setVisible(false);
      view.hitArea.disableInteractive();
      return;
    }
    view.departureAlphas = null;
    for (const layer of standardLayers) layer.setAlpha(1).setVisible(true);
    (view.standardUI || view.standard).input.enabled = true;
    view.hitArea.setVisible(true);
    view.hitArea.input.enabled = true;
    const scale = this.tactical ? 0.82 : projectedScale(formation.y, this.config.projection, this.world);
    const bodyScale = formation.type === 'infantry' ? this.infantryPresentationScale ?? 1 : 1;
    const restoringFrame = Boolean(view.visual.restoreFrame);
    const visual = updateFormationVisual(view.visual, formation, battleTime, scale, { reducedMotion: this.reducedMotion, resolving });
    view.footprint = visual.footprint;
    const volleyAge = battleTime - formation.lastVolleyAt;
    if (this.nativeShotMotion) view.shots = sampleGettysburgInfantryVolley(view.shots, formation, visual, battleTime,
      { scenarioId: this.scenarioId, search: this.artPassSearch, clips: this.infantryClips || [], textures: this.textures, scale, infantryPresentationScale: this.infantryPresentationScale });

    if (view.artillery) {
      updateArtilleryVisual(view.artillery, { x: formation.x, y: formation.y, facing: formation.facing, scale,
        limbered: formation.gunState === 'limbered', moving: visual.moving, abandoned: formation.gunsAbandoned,
        time: battleTime, reducedMotion: this.reducedMotion, crewAction: formation.reload > 0 ? 'reload' : 'idle', recoil: volleyAge >= 0 && volleyAge < 0.6 ? 1 - volleyAge / 0.6 : 0 });
    }

    for (const figure of visual.figures) {
      const soldier = view.soldiers[figure.id];
      const { sprite } = soldier;
      if (!figure.visible || view.artillery) {
        sprite.setVisible(false);
        continue;
      }
      let pose = view.realistic && formation.type !== 'artillery' ? (view.detailed ? detailedInfantryPose : realisticInfantryPose)(formation.id, figure, battleTime, this.reducedMotion, resolving) : null;
      const familyPose = view.infantryFamily && pose ? gettysburgInfantryFamilyPose(formation.id, figure, battleTime, {
        scenarioId: this.scenarioId, search: this.artPassSearch, reducedMotion: this.reducedMotion,
        paused: this.speed === 0 && !restoringFrame, resolving, frozenContact: soldier.familyContact,
      }) : null;
      const familyTexture = familyPose ? gettysburgInfantryFamilyTextureKey(formation.side, familyPose.page) : null;
      // Missing candidate assets or individual frames retain the accepted pose.
      // Candidate failure never downgrades the accepted detailed texture set.
      const familyAvailable = familyTexture && this.textures.exists(familyTexture) && this.textures.get(familyTexture).has(familyPose.frame);
      if (familyAvailable) {
        pose = { ...pose, ...familyPose };
        if (familyPose.contact !== null) soldier.familyContact = familyPose.contact;
      }
      const clipPose = this.infantryClips?.length > 0 && formation.type !== 'artillery' && pose ? gettysburgInfantryClipPose(formation.id, figure, battleTime, {
        side: formation.side, scenarioId: this.scenarioId, search: this.artPassSearch,
        clips: this.infantryClips, identity: 'a', versionedIdentity: true, reducedMotion: this.reducedMotion,
        paused: this.speed === 0 && !restoringFrame, resolving, frozenPhase: soldier.clipPhase, frozenAction: soldier.clipAction,
        shootingAge: this.nativeShotMotion ? gettysburgInfantryShootingAge(formation, figure.id, battleTime) : undefined,
        reloadProgress: this.monotonicReload ? gettysburgInfantryReloadProgress(formation, this.engine.time) : undefined,
      }) : null;
      // V3-v6 use A; v7/v8 assign stable Union A/B, with Confederate A. A
      // missing identity/action/bearing keeps accepted artwork directly, and
      // never borrows a different identity or a rejected movement study.
      if (clipPose) {
        pose = { ...pose, ...clipPose };
        soldier.clipPhase = clipPose.phase;
        soldier.clipAction = clipPose.page;
      } else {
        soldier.clipPhase = undefined;
        soldier.clipAction = undefined;
      }
      const variation = 0.97 + deterministicUnitValue(formation.id, figure.id, 53) * 0.06;
      if (pose) {
        const legacyRear = pose.useLegacyRearAim && formation.side === 'union';
        const texture = clipPose ? clipPose.key : familyAvailable ? familyTexture : view.detailed ? (legacyRear ? `${formation.side}-aim-realistic` : `${formation.side}-detailed-${pose.page}`) : `${formation.side}-${pose.axialAim ? 'aim-realistic' : 'realistic'}`;
        sprite.setTexture(texture, clipPose ? clipPose.frame : legacyRear ? '3-6' : pose.frame);
        const unitScale = (view.detailed ? 58 : 62) * figure.scale / (clipPose?.referenceHeight || sprite.frame.customData?.bodyHeight || sprite.frame.realHeight);
        sprite.setOrigin(clipPose?.pivot.x ?? sprite.frame.pivotX, clipPose?.pivot.y ?? sprite.frame.pivotY).setScale(unitScale * pose.width * bodyScale, unitScale * pose.height * bodyScale)
          .setAngle(pose.angle).setFlipX(pose.flip).setTint(pose.tint);
      } else if (view.directional) {
        const frame = `${figure.action}-${figure.direction}-${figure.frame}`;
        sprite.setTexture(figure.action === 'melee' ? `${formation.side}-melee` : view.directionalTexture, frame).setOrigin(0.5, 0.8)
          .setScale(0.6 * figure.scale * variation * bodyScale).setAngle(figure.lean || 0).setFlipX(false);
      } else {
        sprite.setScale((formation.type === 'artillery' ? 0.085 : 0.125) * figure.scale * variation * bodyScale)
          .setAngle(figure.fallen ? 75 : 0).setFlipX(false);
      }
      sprite.setVisible(true).setPosition(figure.x + (pose?.offsetX ?? figure.bodyOffsetX ?? 0) * bodyScale, figure.y + (pose?.offsetY ?? figure.bodyOffsetY ?? 0) * bodyScale).setDepth(figure.y * 10 + (figure.fallen ? 0 : 2)).setAlpha(figure.alpha);
      if (!this.nativeShotMotion && clipPose?.muzzle && figure.action === 'fire') {
        // Measured barrel mouth, not bayonet tip. Retain the shot's origin
        // through reload so its remaining smoke cannot jump to legacy art.
        soldier.clipVolleyMuzzle = {
          x: sprite.x + (clipPose.muzzle.x - clipPose.pivot.x) * sprite.frame.realWidth * sprite.scaleX,
          y: sprite.y + (clipPose.muzzle.y - clipPose.pivot.y) * sprite.frame.realHeight * sprite.scaleY,
        };
        soldier.clipVolleyAt = formation.lastVolleyAt;
      }
      this.shadows.fillStyle(0x152014, 0.08 * figure.alpha).fillEllipse(figure.x + 6 * scale, figure.y + 3 * scale, 27 * figure.scale * bodyScale, 11 * figure.scale * bodyScale);
      this.shadows.fillStyle(0x080b08, 0.28 * figure.alpha).fillEllipse(figure.x + 3 * scale, figure.y + 2 * scale, (formation.type === 'artillery' ? 58 : 17) * figure.scale * bodyScale, (formation.type === 'artillery' ? 17 : 6) * figure.scale * bodyScale);
    }

    for (const puff of updateTravelDust(view.dust, { x: formation.x, y: formation.y, time: battleTime, moving: visual.moving, reducedMotion: this.reducedMotion, resolving })) {
      for (let i = 0; i < 3; i++) {
        const lateral = (i - 1) * Math.min(45, formation.frontage / 3);
        const px = puff.x - Math.sin(visual.facing) * lateral + puff.age * 7;
        const py = puff.y + Math.cos(visual.facing) * lateral - puff.age * 3;
        this.dust.fillStyle(0xd5c19a, puff.alpha).fillEllipse(px, py, (22 + puff.age * 25) * scale, (8 + puff.age * 10) * scale);
      }
    }

    if (view.artillery && !resolving && volleyAge >= 0 && volleyAge < 2.4) {
      const { muzzle } = view.artillery.geometry;
      const fade = 1 - volleyAge / 2.4;
      for (let i = 0; i < 5; i++) {
        const spread = (i - 2) * (formation.lastShotType === 'canister' ? 0.22 : 0.1);
        const travel = (8 + volleyAge * (18 + i * 3)) * scale;
        const x = muzzle.x + Math.cos(formation.facing + spread) * travel + volleyAge * 5;
        const y = muzzle.y + Math.sin(formation.facing + spread) * travel - volleyAge * 7;
        for (let lobe = 0; lobe < 3; lobe++) {
          const radius = (16 + volleyAge * 23) * scale * (1 + lobe * .28);
          this.smoke.fillStyle(i % 2 ? 0xcac6b7 : 0xe7dfc9, fade * (0.10 - lobe * .025))
            .fillEllipse(x + Math.sin(i * 2 + lobe) * volleyAge * 6, y - lobe * volleyAge * 3, radius, radius * .7);
        }
      }
      if (volleyAge < 0.12 && !this.reducedMotion) this.smoke.fillStyle(0xffd88b, 0.85).fillCircle(muzzle.x, muzzle.y, 6 * scale);
    } else if (!view.artillery && !resolving && volleyAge >= 0 && volleyAge < 1.25) {
      const fade = 1 - volleyAge / 1.25;
      if (this.nativeShotMotion) {
        // A volley keeps its original membership, barrel mouths and bearing,
        // even after movement, turning, casualties or a cold checkpoint restore.
        for (const shot of view.shots?.figures || []) {
          const x = shot.x + Math.cos(shot.bearing) * volleyAge * 14 * shot.scale;
          const y = shot.y - volleyAge * 9;
          if (shot.native && volleyAge < .12 && !this.reducedMotion) this.smoke.fillStyle(0xffdc91, .8).fillCircle(shot.x, shot.y, 2.1 * shot.scale);
          for (let lobe = 0; lobe < 3; lobe++) this.smoke.fillStyle(lobe === 0 ? 0xf0eadd : 0xcac6b8, fade * (0.085 - lobe * .02))
            .fillEllipse(x + lobe * volleyAge * 4, y - lobe * volleyAge * 3, (13 + volleyAge * 18 + lobe * 6) * shot.scale, (9 + volleyAge * 14 + lobe * 4) * shot.scale);
        }
      } else {
        const fronts = visual.figures.filter((figure) => figure.visible && !figure.fallen && (figure.frontRank || formation.type === 'artillery'));
        for (const figure of fronts) {
          const soldier = view.soldiers[figure.id];
          const muzzle = soldier.clipVolleyAt === formation.lastVolleyAt ? soldier.clipVolleyMuzzle : null;
          const x = (muzzle?.x ?? figure.x + Math.cos(visual.facing) * 15 * scale) + Math.cos(visual.facing) * volleyAge * 14 * scale;
          const y = (muzzle?.y ?? figure.y - 24 * scale + Math.sin(visual.facing) * 10 * scale) - volleyAge * 9;
          if (muzzle && volleyAge < .12 && !this.reducedMotion) this.smoke.fillStyle(0xffdc91, .8).fillCircle(muzzle.x, muzzle.y, 2.1 * scale);
          for (let lobe = 0; lobe < 3; lobe++) this.smoke.fillStyle(lobe === 0 ? 0xf0eadd : 0xcac6b8, fade * (0.085 - lobe * .02))
            .fillEllipse(x + lobe * volleyAge * 4, y - lobe * volleyAge * 3, (13 + volleyAge * 18 + lobe * 6) * scale, (9 + volleyAge * 14 + lobe * 4) * scale);
        }
      }
    }

    if (view.footprint.length) {
      const top = Math.min(...view.footprint.map((point) => point.y));
      const hitPoints = formationFootprint(view.footprint.flatMap((point) => [point, { x: point.x, y: point.y - 45 * scale }]), 5);
      view.hitArea.setPosition(0, 0).setOrigin(0).setRotation(0).setSize(this.world.width, this.world.height).setDepth(formation.y * 10 + 5);
      view.hitArea.input.hitArea = new Phaser.Geom.Polygon(hitPoints);
      view.hitArea.input.hitAreaCallback = Phaser.Geom.Polygon.Contains;
      const standardAnchor = this.scenarioId === 'gettysburg' && formation.type !== 'artillery'
        ? gettysburgInfantryStandardAnchor(formation, visual.figures, view.standardAnchorId) : null;
      if (standardAnchor) view.standardAnchorId = standardAnchor.id;
      // Place the staff beside a stable living soldier's ground slot; its depth
      // follows those feet rather than the raised cloth or inspection label.
      for (const layer of standardLayers) layer.setPosition(standardAnchor ? standardAnchor.x + 4 * scale : formation.x, standardAnchor ? standardAnchor.y : top - 13 * scale).setScale(Math.max(0.8, scale));
      if (view.standardUI) view.standard.setDepth((standardAnchor?.y ?? formation.y) * 10 + 3);
    } else {
      view.hitArea.disableInteractive();
      for (const layer of standardLayers) {
        layer.setVisible(false);
        layer.disableInteractive();
      }
    }
    const inspected = view.hovered || this.touchInspectId === formation.id;
    view.bar.setVisible(inspected); view.barBack.setVisible(inspected);
    updatePeriodStandard(view.flag, formation.side, this.scenarioId, battleTime, deterministicUnitValue(formation.id, 0, 503) * Math.PI * 2, this.reducedMotion);
    view.bar.setDisplaySize(42 * Math.max(0, formation.strength / formation.initialStrength), 4);
    const cue = !this.tactical ? '' : formation.inMelee ? 'CLOSE COMBAT' : formation.status === 'routing' ? 'ROUTING' : formation.order === 'withdraw' ? 'WITHDRAWING' : formation.pinned ? 'PINNED' : ['limbering', 'unlimbering'].includes(formation.gunState) ? formation.gunState.toUpperCase() : '';
    view.condition.setText(cue).setVisible(inspected && Boolean(cue)).setScale(Math.min(1.8, 1 / Math.max(0.01, this.cameras.main.zoom * view.standard.scaleX)));
    view.label.setScale(Math.min(4, 1 / Math.max(0.01, this.cameras.main.zoom * view.standard.scaleX)));
    view.label.setVisible(inspected);
    view.label.setText(`${formation.name} · ${Math.round(formation.strength)}${['routing', 'withdrawing in order', 'withdrawn in order'].includes(formationStatusLabel(formation)) ? ` · ${formationStatusLabel(formation).toUpperCase()}` : formation.ammunition <= 0 ? ' · AMMO OUT' : ''}`);
  }

  drawSelection(snapshot) {
    this.selection.clear();
    this.supportLabel?.setVisible(false);
    const selected = snapshot.formations.find((unit) => unit.id === this.selectedId && unit.status !== 'broken');
    if (!selected?.active) return;
    // A short ground arc identifies the selected formation without a unit box.
    this.selection.lineStyle(2 / this.cameras.main.zoom, 0xf2d996, .7);
    this.selection.beginPath();
    this.selection.arc(selected.x, selected.y, 30, .2, Math.PI - .2, false);
    this.selection.strokePath();
    if (this.showOverlay && this.tactical && selected.type === 'infantry' && (this.engine.fieldBattle || selected.y < 500) && gettysburgOrganized(selected) && selected.readiness?.supported === false) {
      const friend = snapshot.formations.filter(unit => unit.id !== selected.id && unit.side === selected.side && gettysburgOrganized(unit)).sort((a, b) => Math.hypot(selected.x - a.x, selected.y - a.y) - Math.hypot(selected.x - b.x, selected.y - b.y))[0];
      const gap = friend ? Math.hypot(selected.x - friend.x, selected.y - friend.y) : Infinity;
      if (friend && gap < 650) {
        this.selection.lineStyle(2, 0xe3bd79, 0.8);
        for (let d = 0; d < gap; d += 18) {
          const a = d / gap, b = Math.min(gap, d + 9) / gap;
          this.selection.lineBetween(selected.x + (friend.x - selected.x) * a, selected.y + (friend.y - selected.y) * a, selected.x + (friend.x - selected.x) * b, selected.y + (friend.y - selected.y) * b);
        }
        this.supportLabel.setText(`SUPPORT GAP · ${Math.ceil(gap)} / ${selected.readiness.supportRange || 340}`).setPosition((selected.x + friend.x) / 2, (selected.y + friend.y) / 2 + 22).setScale(Math.min(2, 1 / this.cameras.main.zoom)).setVisible(true);
      }
    }
    const destination = this.pendingDestination || (['advance', 'assault', 'fallback', 'withdraw'].includes(selected.order) ? selected.target : null);
    if (this.showRange) {
      this.selection.lineStyle(2, 0x83d7df, 0.8);
      if (selected.tactics) {
        const half = selected.tactics.arcDegrees * Math.PI / 360;
        const arc = [{ x: selected.x, y: selected.y }];
        for (let i = 0; i <= 24; i += 1) {
          const angle = selected.facing - half + i / 24 * half * 2;
          arc.push({ x: selected.x + Math.cos(angle) * selected.firingRange, y: selected.y + Math.sin(angle) * selected.firingRange });
        }
        this.selection.fillStyle(0x83d7df, 0.09).fillPoints(arc, true).strokePoints(arc, true);
      } else this.selection.strokeCircle(selected.x, selected.y, selected.firingRange);
    }
    if (this.showOverlay && selected.tactics) {
      const length = selected.type === 'artillery' ? 95 : 75;
      const end = { x: selected.x + Math.cos(selected.facing) * length, y: selected.y + Math.sin(selected.facing) * length };
      this.selection.lineStyle(4, 0xffdd80, 0.95).lineBetween(selected.x, selected.y, end.x, end.y);
      for (const offset of [-0.55, 0.55]) this.selection.lineBetween(end.x, end.y, end.x - Math.cos(selected.facing + offset) * 15, end.y - Math.sin(selected.facing + offset) * 15);
      const target = snapshot.formations.find(unit => unit.id === selected.tactics.targetId && unit.active);
      if (target) this.selection.lineStyle(2, 0xf6a095, 0.8).strokeCircle(target.x, target.y, 23);
    }
    if (destination && (this.pendingDestination || this.showOverlay)) {
      this.selection.lineStyle(3, this.pendingDestination ? 0xffffff : 0xd4af37, 0.95);
      const route = !this.pendingDestination && selected.path?.length ? [{ x: selected.x, y: selected.y }, ...selected.path, destination] : [selected, destination];
      for (let i = 1; i < route.length; i++) this.selection.lineBetween(route[i - 1].x, route[i - 1].y, route[i].x, route[i].y);
      this.selection.strokeCircle(destination.x, destination.y, 14);
      this.selection.lineBetween(destination.x - 22, destination.y, destination.x + 22, destination.y);
      this.selection.lineBetween(destination.x, destination.y - 22, destination.x, destination.y + 22);
    }

  }

  setSpeed(speed) {
    const wasAdvancing = this.speed > 0;
    this.speed = speed > 0 && (this.pendingDestination || this.pendingGroup) ? 0 : speed;
    if (wasAdvancing && this.speed === 0) {
      // The inspector is throttled while running. Pausing must publish the
      // actual simulation instant, which is also the instant saved on exit.
      this.snapshotClock = 0;
      this.emitSnapshot();
    }
  }
  setSelected(id) { if (id && id !== this.selectedId) { this.selectedId = id; this.clearDestination(); } }
  clearDestination() { this.pendingDestination = null; this.onDestination?.(null); this.clearGroup(); }
  clearGroup() { if(this.pendingGroup){this.pendingGroup=null;this.onGroupPreview?.(null);} }
  placeGroup(request) { this.clearDestination();this.setSpeed(0);this.pendingGroup={placing:true,request:structuredClone(request)};this.onGroupPreview?.(this.pendingGroup); }
  previewGroup(request) { this.clearDestination();this.setSpeed(0);this.pendingGroup=previewGroupOrder(this.engine.snapshot(),request,this.world);this.onGroupPreview?.(this.pendingGroup);return this.pendingGroup; }
  confirmGroup() { const result=confirmGroupOrder(this.engine,this.pendingGroup);this.clearGroup();this.emitSnapshot();return result; }
  setInputMode(mode) { this.inputMode = mode; this.clearDestination(); }
  previewDestination(point) {
    const unit = this.engine.state.find((formation) => formation.id === this.selectedId);
    if (!canCommand(unit) || this.engine.pendingOutcome || this.engine.outcome !== 'undecided' || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return;
    this.clearGroup();
    this.pendingDestination = { x: Math.round(Phaser.Math.Clamp(point.x, 70, this.world.width - 70)), y: Math.round(Phaser.Math.Clamp(point.y, 45, this.world.height - 35)) };
    this.setSpeed(0);
    const error = landmarkDestinationError(landmarkField(this.engine), unit, this.pendingDestination);
    if (error) this.pendingDestination.error = error;
    this.onDestination?.(this.pendingDestination);
  }
  confirmMove() {
    if (!this.pendingDestination || this.pendingDestination.error) return;
    this.engine.move(this.selectedId, this.pendingDestination);
    this.clearDestination();
    this.emitSnapshot();
  }
  issueOrder(order, point) { this.clearDestination(); this.engine.order(this.selectedId, order, point); this.emitSnapshot(); }
  faceDirection(angle) {
    const unit = this.engine.state.find(formation => formation.id === this.selectedId);
    if (!unit || !Number.isFinite(angle)) return;
    this.clearDestination();
    this.engine.face(unit.id, { x: unit.x + Math.cos(angle) * 100, y: unit.y + Math.sin(angle) * 100 });
    this.showRange = true;
    this.emitSnapshot();
  }
  focusTarget(id) { this.clearDestination(); this.engine.focusTarget(this.selectedId, id); this.showRange = true; this.emitSnapshot(); }
  setFormation(mode) { this.clearDestination(); this.engine.setFormation(this.selectedId, mode); this.emitSnapshot(); }
  changeZoom(delta) {
    this.cameraMode = 'manual';
    const camera = this.cameras.main;
    const center = camera.getWorldPoint(camera.width / 2, camera.height / 2);
    camera.setZoom(boundedZoom(camera.zoom, delta, overviewZoom(this.scale, this.world)));
    this.updateCameraBounds();
    camera.centerOn(center.x, center.y);
    this.onZoom?.(camera.zoom / overviewZoom(this.scale, this.world));
  }
  focusSelected() {
    const unit = this.engine.snapshot({ presentation: true }).formations.find((formation) => formation.id === this.selectedId);
    if (!unit?.active) return;
    const camera = this.cameras.main;
    const overview = overviewZoom(this.scale, this.world);
    this.clearLocation();
    this.cameraMode = 'focus';
    camera.setZoom(formationFocusZoom(camera.zoom, this.scale, this.world, unit.frontage));
    this.updateCameraBounds();
    camera.centerOn(unit.x, unit.y);
    this.onZoom?.(camera.zoom / overview);
  }
  focusObjective(id) {
    const target = sortieTargets(this.engine.snapshot()).find(target => target.id === id);
    if (!target) return false;
    const camera = this.cameras.main;
    this.cameraMode = 'objective'; this.focusedObjectiveId = id;
    camera.setZoom(formationFocusZoom(camera.zoom, this.scale, this.world));
    this.updateCameraBounds(); camera.centerOn(target.x, target.y);
    this.onZoom?.(camera.zoom / overviewZoom(this.scale, this.world));
    return true;
  }
  focusLandmark(id) {
    const site = landmarkField(this.engine)?.landmarks?.find(site => site.id === id);
    if (!site) return false;
    const camera = this.cameras.main;
    this.cameraMode = 'landmark';
    this.focusedLandmarkId = id;
    camera.setZoom(formationFocusZoom(camera.zoom, this.scale, this.world));
    this.updateCameraBounds();
    camera.centerOn(site.x, site.y);
    this.onZoom?.(camera.zoom / overviewZoom(this.scale, this.world));
    return true;
  }
  clearLocation() {
    this.locationOutline?.destroy(); this.locationLabel?.destroy();
    this.locationOutline = null; this.locationLabel = null;
  }
  focusLocation(id, pause = true) {
    const site = battleLocations(this.engine.snapshot()).find(site => site.id === id);
    if (!site) return false;
    if (pause) this.setSpeed(0);
    this.clearLocation();
    this.cameraMode = 'location'; this.focusedLocationId = id;
    const camera = this.cameras.main;
    const overview = overviewZoom(this.scale, this.world);
    // Fit the whole site with room to see nearby formations, including on phones.
    camera.setZoom(Math.max(overview, Math.min(1.2,
      this.scale.width / (site.width + 200), this.scale.height / (site.height + 180))));
    this.updateCameraBounds(); camera.centerOn(site.x, site.y);
    this.locationOutline = this.add.graphics().setDepth(39010);
    this.locationOutline.lineStyle(4 / camera.zoom, 0xffe6a1, 1);
    this.locationOutline.strokeRoundedRect(site.x - site.width / 2, site.y - site.height / 2, site.width, site.height, 10);
    const below = site.y < this.world.height / 2;
    this.locationLabel = this.add.text(site.x, site.y + (below ? 1 : -1) * (site.height / 2 + 12), site.name,
      { fontFamily: 'Georgia', fontSize: '14px', color: '#fff1c5', backgroundColor: '#18231f', padding: { x: 8, y: 5 }, align: 'center', wordWrap: { width: 240 } })
      .setOrigin(.5, below ? 0 : 1).setScale(1 / camera.zoom).setDepth(39011);
    this.onZoom?.(camera.zoom / overview);
    return true;
  }
  emitSnapshot(snapshot = this.engine.snapshot({ presentation: true })) {
    this.presentationCache.replace(snapshot);
    this.lastEmittedOutcome = snapshot.outcome;
    this.onBattleSnapshot(snapshot);
  }
}
