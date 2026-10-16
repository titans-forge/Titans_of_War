import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const cacheDir = mkdtempSync(join(tmpdir(), 'tow-editorial-'));
const vite = await createServer({
  configLoader: 'native',
  cacheDir,
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: 'custom',
  logLevel: 'silent',
});

try {
  const { STATIC_SCENARIOS } = await vite.ssrLoadModule('/src/game/scenarios.js');
  const { HISTORICAL_PRIMERS } = await vite.ssrLoadModule('/src/game/historicalPrimers.js');
  const { generateAdvisorDebate } = await vite.ssrLoadModule('/src/game/advisorDebate.js');
  const { getChoiceAvailability } = await vite.ssrLoadModule('/src/game/simulationEngine.js');
  const { createFreshCampaignState } = await vite.ssrLoadModule('/src/game/campaignStorage.js');
  const { default: ScenarioTheater } = await vite.ssrLoadModule('/src/components/ScenarioTheater.jsx');
  const { SCENARIO_MEDIA_OVERRIDES_EXPORT: overrides } = await vite.ssrLoadModule('/src/game/mediaCatalog.js');
  const factions = ['hotspur', 'fox', 'wolf'];
  const scenarioById = (id) => {
    const scenario = STATIC_SCENARIOS.find((candidate) => candidate.id === id);
    assert.ok(scenario, `scenario ${id} must exist`);
    return scenario;
  };

  const sumter = scenarioById('fort_sumter');
  assert.equal(sumter.date, 'April 13, 1861');
  assert.match(sumter.description, /34 hours/);
  assert.match(sumter.description, /war has begun/i);
  assert.doesNotMatch(sumter.advisors.wolf, /let the south fire|not the aggressors/i);
  assert.doesNotMatch(sumter.choices[2].text, /valve failures/i);
  assert.match(sumter.choices[3].text, /next dawn/i);
  assert.equal(scenarioById('manassas_battlefield').title, 'First Battle of Manassas \u2014 Henry Hill');

  const naval = scenarioById('naval_technology');
  assert.equal(naval.date, 'March 8, 1862');
  assert.match(naval.description, /Pioneer.*1862/);
  assert.match(naval.description, /Hunley.*1863/);
  assert.match(naval.choices[2].text, /precursor.*research.*hypothetical/i);
  for (const key of ['successConsequence', 'failureConsequence']) {
    assert.match(naval.choices[2][key], /^Hypothetical/);
  }
  assert.match(HISTORICAL_PRIMERS.naval_technology.complexity_note, /built.*1863/);
  assert.match(HISTORICAL_PRIMERS.naval_technology.complexity_note, /hypothetical/i);
  const withdrawal = scenarioById('third_winchester').choices.find((choice) => choice.id === 'option_d');
  assert.match(withdrawal.text, /farm roads.*Valley Pike/);
  assert.doesNotMatch(`${withdrawal.text} ${withdrawal.consequence}`, /cavern|tunnel/i);
  const election = HISTORICAL_PRIMERS.election_of_1864.power_analysis;
  assert.doesNotMatch(election, /win one|seventy-two|72 hours/);
  for (const factor of [/Atlanta/, /Sheridan/, /party organization/, /military voting/, /platforms/, /simplified model/]) {
    assert.match(election, factor);
  }

  function checkDebate(state, scenario) {
    const before = JSON.stringify({ state, scenario });
    const debate = generateAdvisorDebate(state, scenario);
    const available = scenario.choices.filter((choice) => !getChoiceAvailability(choice, scenario, state).locked);
    for (const faction of factions) {
      const advisor = debate[faction];
      const backed = available.find((choice) => choice.id === advisor.choiceId);
      if (available.length) {
        assert.ok(backed, `${scenario.id}: ${faction} must back an available choice`);
        assert.equal(advisor.choiceText, backed.text);
        assert.ok(advisor.argument.startsWith(`I back ${advisor.choiceLabel}: ${backed.text}`));
      } else {
        assert.equal(advisor.choiceId, null);
        assert.match(advisor.argument, /No viable motion/);
        assert.doesNotMatch(advisor.argument, /Expected ledger/);
      }
      for (const brief of Object.values(scenario.advisors || {})) {
        assert.ok(!advisor.argument.includes(brief), 'unkeyed scenario briefs must not contradict the backed motion');
      }
    }
    assert.equal(JSON.stringify({ state, scenario }), before, 'debate must not mutate campaign state or authored choices');
    return debate;
  }

  let advisorCases = 0;
  for (const scenario of STATIC_SCENARIOS) {
    for (const divergence of [0, 0.2, 0.8]) {
      const state = createFreshCampaignState(1861, scenario.id);
      state.divergenceIndex = divergence;
      checkDebate(state, scenario);
      advisorCases += 1;
    }
  }

  const state = createFreshCampaignState(1861);
  const locked = {
    id: 'editorial_lock_fixture', turn: 2,
    advisors: Object.fromEntries(factions.map((faction) => [faction, 'INCOMPATIBLE FIXED BRIEF'])),
    choices: [
      { id: 'alignment', text: 'Locked by alignment', proposer: 'hotspur' },
      { id: 'minimum', text: 'Locked by minimum divergence', proposer: 'wolf', minDivergence: 0.5 },
      { id: 'maximum', text: 'Locked by maximum divergence', proposer: 'fox', maxDivergence: 0.1 },
      { id: 'history', text: 'Locked by history', proposer: 'wolf', requiresHistory: { allOf: [{ scenarioId: 'missing' }] } },
      { id: 'open', text: 'Preserve the open route', proposer: 'sovereign', effects: { metrics: { militaryStrength: -1 } } },
    ],
  };
  state.divergenceIndex = 0.2;
  state.shards.hotspur.alignment = 0;
  for (const advisor of factions) assert.equal(checkDebate(state, locked)[advisor].choiceId, 'open');
  checkDebate(state, { ...locked, choices: locked.choices.slice(0, 4) });
  checkDebate(state, { ...locked, choices: [] });
  const crisis = { ...locked, crisisFor: 'hotspur', choices: [locked.choices[0]] };
  assert.equal(checkDebate(state, crisis).hotspur.choiceId, 'alignment', 'crisis exemption must follow the shared helper');

  const render = (scenario) => renderToStaticMarkup(createElement(ScenarioTheater, { scenario, gameState: state }));
  for (const [id, label] of [
    ['naval_technology', 'AI-generated historical interpretation'],
    ['election_1864_mcclellan', 'Generated interpretation'],
    ['manassas_battlefield', 'Historical painting'],
    ['fort_sumter', 'AI-generated historical interpretation'],
  ]) {
    const markup = render(scenarioById(id));
    assert.ok(markup.includes(label), `${id} must have its actual historical-medium label`);
    assert.doesNotMatch(markup, /PERIOD ART|THEATER PHOTO/);
    assert.match(markup, /class="scenario-theater"/);
    assert.match(markup, /class="scenario-visual"/);
    assert.match(markup, /class="scenario-figure"/);
    assert.match(markup, /<figcaption>/, 'caption remains outside the scene image');
  }

  for (const scenario of STATIC_SCENARIOS) {
    const markup = render(scenario);
    const escaped = value => renderToStaticMarkup(createElement('span', null, value)).slice(6, -7);
    assert.ok(markup.includes(escaped(scenario.actor)), `${scenario.id} must identify its active commander even when campaign state retains the previous actor`);
    assert.ok(markup.includes(escaped(scenario.roleLabel)), `${scenario.id} must identify its active command role`);
  }

  const fixture = { id: 'editorial_media_fixture', title: 'Fixture', description: 'Short briefing.' };
  try {
    for (const [medium, label] of [
      ['period-photo', 'Historical photograph'],
      ['reenactment', 'Reenactment photograph'],
      ['map', 'Archive map'],
      ['unknown', 'Unclassified image'],
    ]) {
      overrides[fixture.id] = { historicalMedium: medium, kind: 'art', provenanceStatus: 'verified' };
      assert.ok(render(fixture).includes(label));
    }
    overrides[fixture.id] = { historicalMedium: 'generated-art', kind: 'art', provenanceStatus: 'pending' };
    assert.match(render(fixture), /Generated interpretation.*provenance unverified/);
  } finally {
    delete overrides[fixture.id];
  }
  assert.doesNotMatch(render(fixture), /class="scenario-briefing"/);
  assert.match(render({ ...fixture, image: '/images/example.jpg' }), /Generated interpretation/);
  const longDescription = 'A complete sentence about the command situation. '.repeat(12);
  const longMarkup = render({ ...fixture, description: longDescription });
  assert.match(longMarkup, /<details class="scenario-briefing"><summary>Full briefing<\/summary>/);
  assert.ok(longMarkup.includes(longDescription), 'the disclosure must retain every word');

  console.log(`Editorial coherence checks passed (${STATIC_SCENARIOS.length} scenarios, ${advisorCases} advisor states, locks, media labels, and full briefings).`);
} finally {
  await vite.close();
  rmSync(cacheDir, { recursive: true, force: true });
}

// The current authored settlement route must reach its existing ending artwork.
const { resolveCampaignEndingMedia } = await import('../src/game/mediaCatalog.js');
const settlementArt = resolveCampaignEndingMedia({ history: [{ scenarioId: 'election_1864_mcclellan', choiceId: 'option_d' }] });
assert.ok(settlementArt?.title === 'McClellan Armistice and Conditional Reunion', 'current reunion ending resolves its existing ending artwork');
