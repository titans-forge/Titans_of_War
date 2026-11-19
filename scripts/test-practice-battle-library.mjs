import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PRACTICE_BATTLES } from '../src/game/battles.js';
import { groupPracticeBattles } from '../src/game/practiceBattleLibrary.js';

const campaignScenarios = Object.values(PRACTICE_BATTLES).map(battle => ({
  id: battle.scenarioId,
  title: battle.title,
  choices: [{ id: 'option_a' }, { id: 'option_b' }],
}));

test('groups all registered practice fields by year and sorts by their opening date', () => {
  const groups = groupPracticeBattles(campaignScenarios);
  assert.deepEqual(groups.map(([year]) => year), ['1861', '1862', '1863', '1864', '1865']);
  const fields = groups.flatMap(([, entries]) => entries);
  assert.deepEqual(new Set(fields.map(({ battle }) => battle.scenarioId)), new Set(Object.keys(PRACTICE_BATTLES)));
  const ids = fields.map(({ battle }) => battle.id);
  assert.ok(ids.indexOf('gettysburg_jackson') < ids.indexOf('gettysburg'), 'July 1–2 precedes July 3');
  assert.ok(ids.indexOf('chancellorsville') < ids.indexOf('vicksburg') && ids.indexOf('vicksburg') < ids.indexOf('gettysburg_jackson'),
    'the May 22 assault fits between Chancellorsville and Gettysburg');
  assert.ok(ids.indexOf('wilderness') < ids.indexOf('new_market') && ids.indexOf('new_market') < ids.indexOf('cold_harbor'),
    'New Market falls between the Wilderness and Cold Harbor');
  assert.ok(ids.indexOf('chickamauga') < ids.indexOf('missionary_ridge') && ids.indexOf('missionary_ridge') < ids.indexOf('wilderness'),
    'Missionary Ridge follows Chickamauga in 1863');
  assert.ok(ids.indexOf('wilderness') < ids.indexOf('spotsylvania') && ids.indexOf('spotsylvania') < ids.indexOf('new_market'),
    'Spotsylvania fits between the Wilderness and New Market in May 1864');
  assert.ok(ids.indexOf('cold_harbor') < ids.indexOf('kennesaw_mountain') && ids.indexOf('kennesaw_mountain') < ids.indexOf('petersburg'),
    'Kennesaw Mountain follows Cold Harbor in June');
  assert.ok(ids.indexOf('petersburg') < ids.indexOf('jonesborough'), 'July 30 precedes August 31');
  assert.ok(ids.indexOf('five_forks') < ids.indexOf('sailors_creek'), 'Sailor’s Creek follows Five Forks in April 1865');
  assert.ok(ids.indexOf('jonesborough') < ids.indexOf('third_winchester'), 'August 31–September 1 precedes September 19');
});

test('search handles historical names, curly apostrophes, locations and years', () => {
  for (const search of ["Gaines' Mill", 'Gaines’ MILL', 'gaines mill', 'WATT HOUSE 1862']) {
    const result = groupPracticeBattles(campaignScenarios, search);
    assert.deepEqual(result.map(([year, entries]) => [year, entries.map(({ battle }) => battle.id)]), [['1862', ['gaines_mill']]], search);
  }
  for (const search of ['Bushong House', 'Field of Lost Shoes']) {
    const fields = groupPracticeBattles(campaignScenarios, search).flatMap(([, entries]) => entries);
    assert.deepEqual(fields.map(({ battle }) => battle.id), ['new_market'], search);
  }
  assert.deepEqual(groupPracticeBattles(campaignScenarios, 'Orchard Knob').flatMap(([, entries]) =>
    entries.map(({ battle }) => battle.id)), ['missionary_ridge']);
  assert.deepEqual(groupPracticeBattles(campaignScenarios, 'McCoull House').flatMap(([, entries]) =>
    entries.map(({ battle }) => battle.id)), ['spotsylvania']);
  assert.deepEqual(groupPracticeBattles(campaignScenarios, 'Kolb Farmhouse').flatMap(([, entries]) =>
    entries.map(({ battle }) => battle.id)), ['kennesaw_mountain']);
  assert.deepEqual(groupPracticeBattles(campaignScenarios, 'Second Texas Lunette').flatMap(([, entries]) =>
    entries.map(({ battle }) => battle.id)), ['vicksburg']);
  assert.deepEqual(groupPracticeBattles(campaignScenarios, 'Hillsman House').flatMap(([, entries]) =>
    entries.map(({ battle }) => battle.id)), ['sailors_creek']);
  assert.deepEqual(groupPracticeBattles(campaignScenarios, 'zero results'), []);
  assert.deepEqual(groupPracticeBattles(campaignScenarios, '   '), groupPracticeBattles(campaignScenarios));
});

test('practice starts with a valid order and does not mutate campaign choices', () => {
  const standard = [{ id: 'option_a' }, { id: 'option_b' }];
  const lone = [{ id: 'option_d' }];
  const entries = [
    { id: 'manassas_battlefield', choices: standard },
    { id: 'seven_days', choices: lone },
    { id: 'gettysburg_decision', choices: lone },
    { id: 'chickamauga', choices: [] },
  ];
  const before = structuredClone(entries);
  const choices = Object.fromEntries(groupPracticeBattles(entries).flatMap(([, fields]) =>
    fields.map(({ battle, scenario, defaultChoice }) => [battle.id, { options: scenario.choices.map(choice => choice.id), default: defaultChoice.id }]),
  ));
  assert.deepEqual(choices, {
    first_manassas: { options: ['option_a', 'option_b'], default: 'option_b' },
    gaines_mill: { options: ['option_a', 'option_b'], default: 'option_a' },
    gettysburg: { options: ['option_d'], default: 'option_d' },
  });
  assert.deepEqual(entries, before);
});
