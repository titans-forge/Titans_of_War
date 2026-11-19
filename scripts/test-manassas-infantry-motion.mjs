import assert from 'node:assert/strict';
import test from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { directionIndex } from '../src/battle/formationMath.js';
import { createFormationVisual, updateFormationVisual } from '../src/battle/formationVisualState.js';
import { createFormationVisualCheckpoint, restoreFormationVisualFromCheckpoint } from '../src/battle/formationVisualCheckpoint.js';
import {
  LOCOMOTION_MIN_TRAVEL, sampleGettysburgLocomotion, gettysburgWalkingFigure,
  createGettysburgLocomotionCheckpoint, restoreGettysburgLocomotionCheckpoint,
} from '../src/battle/gettysburgLocomotionPresentation.js';

const scenarioId = 'first_manassas';
const campaign = { rulesVersion: 2, battleRulesVersion: 18 };
const id = 'jackson-brigade';
const readFormation = engine => engine.snapshot({ presentation: true }).formations.find(unit => unit.id === id);
const roundTrip = value => JSON.parse(JSON.stringify(value));

for (const reducedMotion of [false, true]) {
  test(`Manassas wheel and formation change preserve combat and paused poses (reduced motion: ${reducedMotion})`, () => {
    const engine = new CivilWarBattleEngine(scenarioId, campaign, 'option_b');
    const options = { scenarioId, reducedMotion, skipEmptyHeading: true };
    const initial = readFormation(engine);
    const state = createFormationVisual(initial, 32, 0);
    const control = structuredClone(state);
    let sample = null, wheelCorrections = 0, reformCorrections = 0;
    let savedTurn = false;

    function draw() {
      const formation = readFormation(engine);
      const time = engine.time;
      const before = engine.checkpoint();
      const previous = sample?.visual;
      sample = sampleGettysburgLocomotion(state, sample?.heading, formation, time, .82, options);
      assert.deepEqual(sample.visual, updateFormationVisual(control, formation, time, .82, options));
      assert.deepEqual(engine.checkpoint(), before);
      let corrections = 0;
      if (previous && sample.heading) for (const figure of sample.visual.figures) {
        const prior = previous.figures[figure.id];
        if (!prior.visible || !figure.visible || figure.action !== 'walk') continue;
        const dx = figure.x - prior.x, dy = figure.y - prior.y;
        if (Math.hypot(dx, dy) <= LOCOMOTION_MIN_TRAVEL) continue;
        const drawn = gettysburgWalkingFigure(figure, sample.heading, formation, time, options);
        assert.deepEqual(drawn, { ...figure, direction: directionIndex(Math.atan2(dy, dx)) });
        const painted = gettysburgWalkingFigure(figure, sample.heading, formation, time,
          { ...options, annotateStationaryTurn: true });
        assert.deepEqual(painted, sample.heading.base.state.lastMotion.turning
          ? { ...drawn, stationaryTurn: true } : drawn);
        if (drawn.direction !== figure.direction) corrections++;
        if (reducedMotion) assert.equal(drawn.frame, 0);
      }

      if (corrections && !savedTurn) {
        savedTurn = true;
        const heading = sample.heading;
        const paused = sampleGettysburgLocomotion(state, heading, formation, time, .82, options);
        assert.deepEqual(paused.heading, heading);
        assert.deepEqual(paused.visual, sample.visual);

        const presentation = createFormationVisualCheckpoint([formation], new Map([[id, state]]), time);
        const headings = createGettysburgLocomotionCheckpoint(presentation, [formation], new Map([[id, { locomotionHeading: heading }]]), time, options);
        assert.equal(headings.scenarioId, scenarioId);
        assert.equal(headings.continuityId, 'manassas-infantry-heading-v1');
        assert.equal(headings.formations.length, 1);
        const saved = roundTrip({ ...presentation, locomotionHeading: headings });
        const loaded = CivilWarBattleEngine.fromCheckpoint(roundTrip(before), scenarioId, campaign, 'option_b');
        const loadedFormation = readFormation(loaded);
        const revived = restoreFormationVisualFromCheckpoint(loadedFormation, 32, time, saved);
        assert.equal(revived.restoreFrame, true);
        assert.equal(restoreGettysburgLocomotionCheckpoint(saved, loadedFormation, revived, time), null);
        assert.equal(restoreGettysburgLocomotionCheckpoint(presentation, loadedFormation, revived, time, options), null);
        const loadedHeading = restoreGettysburgLocomotionCheckpoint(saved, loadedFormation, revived, time, options);
        assert.deepEqual(loadedHeading, heading);
        const frame = sampleGettysburgLocomotion(revived, loadedHeading, loadedFormation, time, .82, options);
        assert.deepEqual(frame, paused);
      }
      return corrections;
    }

    draw();
    assert.equal(engine.face(id, { x: initial.x + 150, y: initial.y + 10 }), true);
    for (let step = 0; step < 30; step++) {
      engine.tick(.1);
      wheelCorrections += draw();
    }
    assert.equal(readFormation(engine).x, initial.x);
    assert.equal(readFormation(engine).y, initial.y);
    assert.ok(wheelCorrections > 32);
    assert.ok(savedTurn);

    engine.setFormation(id, 'column');
    assert.equal(readFormation(engine).formationMode, 'column');
    for (let step = 0; step < 24; step++) {
      engine.tick(.1);
      reformCorrections += draw();
    }
    if (!reducedMotion) assert.ok(reformCorrections > 32);
  });
}
