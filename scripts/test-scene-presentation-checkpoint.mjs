import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { FieldPresentationCache } from '../src/battle/fieldPresentationCache.js';
import { getBattleEngineConfig } from '../src/battle/battleDefinitions.js';
import { createFormationVisual, updateFormationVisual } from '../src/battle/formationVisualState.js';
import { createFormationVisualCheckpoint, restoreFormationVisualFromCheckpoint } from '../src/battle/formationVisualCheckpoint.js';
import { gettysburgInfantryClipPolicy } from '../src/battle/gettysburgInfantryClipPolicy.js';
import { combatCheckpointEnvelope } from '../src/battle/combatCheckpointEnvelope.js';
import { createFreshCampaignState, createCampaignSnapshot, CAMPAIGN_STORAGE_KEY } from '../src/game/campaignStorage.js';
import { saveFieldCheckpoint, loadFieldCheckpoint, FIELD_CHECKPOINT_KEY } from '../src/game/fieldCheckpoint.js';
import { BATTLE_SCENARIOS } from '../src/game/battles.js';

const json = value => JSON.parse(JSON.stringify(value));
const source = fs.readFileSync(new URL('../src/battle/CivilWarBattlefield.jsx', import.meta.url), 'utf8');
const Scene = vm.runInNewContext(source.slice(source.indexOf('class CivilWarBattleScene')) + '; CivilWarBattleScene', {
  Phaser: { Scene: class {} }, CivilWarBattleEngine, FieldPresentationCache, getBattleEngineConfig,
  performance, Map, window: { location: { search: '?artPass=gettysburg-v8' }, matchMedia: () => ({ matches: false }) },
  combatCheckpointEnvelope, createFormationVisualCheckpoint, restoreFormationVisualFromCheckpoint, updateFormationVisual, gettysburgInfantryClipPolicy,
});
const campaign = { ...createFreshCampaignState(1861), battleRulesVersion: 17 };
const visualTime = engine => engine.time + (engine.resolutionTime || 0);
const dead = visual => visual.figures.filter(figure => !figure.alive).map(figure => figure.id);

test('actual scene checkpoint captures current views, preserves survivors, and leaves combat checkpoint unchanged', () => {
  const scene = new Scene('gettysburg', campaign, 'option_a');
  const id = 'pickett-division';
  const current = () => scene.engine.snapshot({ presentation: true }).formations.find(unit => unit.id === id);
  const visual = createFormationVisual(current(), 32);
  scene.views.set(id, { visual });
  updateFormationVisual(visual, current(), 0, .82);
  for (const unit of scene.engine.state.filter(unit => unit.side === 'confederate' && unit.active)) scene.engine.order(unit.id, 'advance');
  let reform = false;
  for (let i = 0; i < 300; i++) {
    scene.engine.tick(.2);
    updateFormationVisual(visual, current(), visualTime(scene.engine), .82);
    if (!reform && dead(visual).length) { scene.engine.setFormation(id, 'column'); reform = true; }
    if (reform && dead(visual).length >= 2) break;
  }
  assert.deepEqual(dead(visual), [3, 4]);
  const combat = scene.engine.checkpoint();
  const saved = json(scene.checkpoint());
  assert.deepEqual(scene.engine.checkpoint(), combat);
  assert.deepEqual(combatCheckpointEnvelope(saved), combat);
  assert.equal(saved.presentation.formations.length, 1);
  const recreated = new Scene('gettysburg', campaign, 'option_a', null, null, null, null, saved);
  const formation = recreated.engine.snapshot({ presentation: true }).formations.find(unit => unit.id === id);
  const restored = restoreFormationVisualFromCheckpoint(formation, 32, visualTime(recreated.engine), recreated.savedPresentation);
  assert.deepEqual(dead(restored), dead(visual));
  assert.deepEqual(updateFormationVisual(restored, formation, visualTime(recreated.engine), .82), visual.output);
  assert.deepEqual(recreated.engine.checkpoint(), combat);
  assert.ok(source.includes('checkpoint: () => scene.current?.checkpoint()'), 'the React imperative ref must use the actual scene wrapper');
});

test('scene constructor isolates optional presentation before engine Map/Set revival', () => {
  const combat = new CivilWarBattleEngine('gettysburg', campaign, 'option_a').checkpoint();
  for (const presentation of [{ $fieldMap: 'bad' }, { $fieldSet: {} }, { version: 99, nested: { $fieldMap: false } }]) {
    const scene = new Scene('gettysburg', campaign, 'option_a', null, null, null, null, { ...json(combat), presentation });
    assert.deepEqual(scene.engine.checkpoint(), combat);
    const formation = scene.engine.snapshot({ presentation: true }).formations[0];
    assert.deepEqual(restoreFormationVisualFromCheckpoint(formation, 32, 0, scene.savedPresentation), createFormationVisual(formation, 32, 0));
  }
});

test('device storage retains valid presentation, but damaged optional presentation does not reject valid combat', () => {
  const battle = Object.values(BATTLE_SCENARIOS).find(value => value.id === 'gettysburg');
  const engine = new CivilWarBattleEngine(battle.id, campaign, 'option_a');
  const snapshot = engine.snapshot({ presentation: true });
  const visuals = new Map(snapshot.formations.map(formation => {
    const visual = createFormationVisual(formation, formation.type === 'artillery' ? 1 : 32);
    updateFormationVisual(visual, formation, 0, .82);
    return [formation.id, visual];
  }));
  const presentation = createFormationVisualCheckpoint(snapshot.formations, visuals, 0);
  assert.equal(presentation.formations.length, snapshot.formations.length);
  const data = new Map([[CAMPAIGN_STORAGE_KEY, JSON.stringify(createCampaignSnapshot(campaign, null))]]);
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  const pending = { battle, choiceId: 'option_a', baseState: campaign, mode: 'fight' };
  for (const optional of [presentation, { $fieldMap: 'bad' }, { version: 99, nested: { $fieldSet: {} } }]) {
    const checkpoint = { ...engine.checkpoint(), presentation: optional };
    saveFieldCheckpoint(pending, checkpoint, campaign, storage);
    const loaded = loadFieldCheckpoint(storage);
    assert.equal(loaded.error, null);
    assert.deepEqual(loaded.pending.checkpoint, json(checkpoint));
    assert.deepEqual(CivilWarBattleEngine.fromCheckpoint(combatCheckpointEnvelope(loaded.pending.checkpoint), battle.id, campaign, 'option_a').checkpoint(), engine.checkpoint());
    assert.ok(data.get(FIELD_CHECKPOINT_KEY).length < 100000, 'bounded presentation stays comfortably inside the existing device-save limit');
  }
});

test('an invalid combat checkpoint remains invalid even when presentation is absent or valid', () => {
  const combat = new CivilWarBattleEngine('gettysburg', campaign, 'option_a').checkpoint();
  for (const version of [2, null]) {
    assert.throws(() => new Scene('gettysburg', campaign, 'option_a', null, null, null, null, { ...combat, version, presentation: { version: 1, time: 0, formations: [] } }), /checkpoint/);
  }
});
