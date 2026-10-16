import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createCampaignSnapshot,
  createFreshCampaignState,
  loadCampaignSnapshot,
  restoreCampaignFromSnapshot,
  saveCampaignSnapshot
} from '../src/game/campaignStorage.js';
import {
  calculateElectionPressure,
  calculateCampaignScore,
  CAMPAIGN_FINAL_TURN,
  classifyCampaignEnding,
  deriveSeed,
  divergenceTier,
  getChoiceAvailability,
  mulberry32,
  resolveNextScenario,
  summarizeCabinetCrises,
  tickMetrics
} from '../src/game/simulationEngine.js';
import { advanceCampaignTurn, getScenarioForState, runHeadlessCampaign, runHeadlessCampaignAsync } from '../src/game/headlessCampaign.js';
import { INITIAL_STATE } from '../src/game/initialState.js';
import { resolveScenarioMediaSet } from '../src/game/mediaCatalog.js';

const baseState = {
  currentTurn: 1,
  seed: 1861,
  divergenceIndex: 0,
  metrics: {
    militaryStrength: 50,
    munitions: 50,
    treasury: 50,
    foodSupply: 50,
    publicMorale: 50
  },
  shards: {
    hotspur: { alignment: 60, influence: 35 },
    fox: { alignment: 60, influence: 40 },
    wolf: { alignment: 60, influence: 25 }
  },
  history: []
};

const firstRoll = mulberry32(deriveSeed(1861, 1))();
const repeatedRoll = mulberry32(deriveSeed(1861, 1))();
assert.equal(firstRoll, repeatedRoll, 'seeded RNG must be reproducible for the same campaign seed and turn');

const successfulChoice = {
  successRate: 1,
  successEffects: {
    metrics: { militaryStrength: 10, munitions: -10, publicMorale: 5, divergenceIndex: 0.1 },
    shards: { hotspur: 10 }
  },
  successConsequence: 'The operation succeeded.'
};
const successfulTick = tickMetrics(baseState, successfulChoice);
assert.equal(successfulTick.choiceSucceeded, true, 'successRate 1 choices must always succeed');
assert.equal(successfulTick.metrics.militaryStrength, 60, 'successful choice effects should apply after turn decay');
assert.equal(successfulTick.metrics.munitions, 35, 'natural munitions decay and choice cost should both apply');
assert.equal(successfulTick.metrics.foodSupply, 48, 'food supply should decay each turn when the metric is active');
assert.equal(successfulTick.divergenceIndex, 0.1, 'divergence deltas should update the campaign index');
assert.equal(successfulTick.shards.hotspur.alignment, 70, 'shard effects should update alignment');

const failedChoice = {
  successRate: 0,
  failureEffects: {
    metrics: { militaryStrength: -500, publicMorale: 500, divergenceIndex: 2 },
    shards: { fox: -500 }
  },
  failureConsequence: 'The operation failed.'
};
const failedTick = tickMetrics(baseState, failedChoice);
assert.equal(failedTick.choiceSucceeded, false, 'successRate 0 choices must always fail');
assert.equal(failedTick.metrics.militaryStrength, 0, 'metrics should clamp at the lower bound');
assert.equal(failedTick.metrics.publicMorale, 100, 'metrics should clamp at the upper bound');
assert.equal(failedTick.shards.fox.alignment, 0, 'shard alignment should clamp at the lower bound');
assert.equal(failedTick.divergenceIndex, 1, 'divergence should clamp at 1.0');
assert.equal(failedTick.gameOver, true, 'a collapsed army should still end the campaign even at full divergence');

const severedButStableTick = tickMetrics(baseState, {
  effects: {
    metrics: { divergenceIndex: 1, militaryStrength: 20, publicMorale: 20, foodSupply: 20 },
    shards: {}
  }
});
assert.equal(severedButStableTick.divergenceIndex, 1, 'divergence should still clamp at 1.0');
assert.equal(severedButStableTick.gameOver, false, '100% divergence alone should not automatically end the campaign');

const scenarios = [
  { id: 'linear_turn_2', turn: 2 },
  { id: 'branch_turn_2', turn: 2 },
  { id: 'high_divergence_branch', turn: 2 },
  { id: 'hotspur_cabinet_crisis', turn: 0, crisisFor: 'hotspur' },
  { id: 'fox_supply_crisis', turn: 0, crisisFor: 'fox' },
  { id: 'wolf_finance_crisis', turn: 0, crisisFor: 'wolf' }
];
assert.equal(
  resolveNextScenario(null, { next: 'branch_turn_2' }, 2, scenarios, 0)?.id,
  'branch_turn_2',
  'explicit choice.next should override linear turn routing'
);
assert.equal(
  resolveNextScenario(
    { branches: [{ minDivergence: 0.4, scenarioId: 'high_divergence_branch' }] },
    {},
    2,
    scenarios,
    0.5
  )?.id,
  'high_divergence_branch',
  'eligible divergence branches should override linear turn routing'
);
assert.equal(
  resolveNextScenario(
    { id: 'manassas_battlefield' },
    {},
    2,
    scenarios,
    0,
    {
      hotspur: { alignment: 22 },
      fox: { alignment: 60 },
      wolf: { alignment: 60 }
    }
  )?.id,
  'hotspur_cabinet_crisis',
  'low hotspur alignment should inject the corresponding cabinet crisis scenario'
);
assert.equal(
  resolveNextScenario(
    { id: 'hotspur_cabinet_crisis', crisisFor: 'hotspur' },
    {},
    2,
    scenarios,
    0,
    {
      hotspur: { alignment: 18 },
      fox: { alignment: 60 },
      wolf: { alignment: 60 }
    }
  )?.id,
  'linear_turn_2',
  'crisis scenarios should not recursively inject themselves on the very next resolution'
);

const electionScenarios = [
  { id: 'election_1864_lincoln', turn: 24 },
  { id: 'election_1864_mcclellan', turn: 24 }
];
const electionBranchScenario = {
  id: 'cedar_creek',
  turn: 23,
  electionBranch: {
    threshold: 7,
    lincolnScenarioId: 'election_1864_lincoln',
    mcclellanScenarioId: 'election_1864_mcclellan'
  }
};
const historicalElectionHistory = [
  { scenarioId: 'atlanta_election_pressure', choiceId: 'option_a' },
  { scenarioId: 'petersburg_siege', choiceId: 'option_a', choiceSucceeded: false },
  { scenarioId: 'fall_of_atlanta', choiceId: 'option_b' },
  { scenarioId: 'third_winchester', choiceId: 'option_a' },
  { scenarioId: 'cedar_creek', choiceId: 'option_b' }
];
const alternateElectionHistory = [
  { scenarioId: 'cold_harbor', choiceId: 'option_b' },
  { scenarioId: 'atlanta_election_pressure', choiceId: 'option_b' },
  { scenarioId: 'petersburg_siege', choiceId: 'option_b' },
  { scenarioId: 'fall_of_atlanta', choiceId: 'option_d', choiceSucceeded: true },
  { scenarioId: 'third_winchester', choiceId: 'option_d' },
  { scenarioId: 'cedar_creek', choiceId: 'option_a' }
];
assert.equal(
  calculateElectionPressure(historicalElectionHistory).winner,
  'lincoln',
  'historical Confederate reverses should preserve Lincoln as the 1864 election winner'
);
assert.equal(
  calculateElectionPressure(alternateElectionHistory).winner,
  'mcclellan',
  'a rare sequence of Atlanta and Valley successes should permit a McClellan victory'
);
assert.equal(
  resolveNextScenario(
    electionBranchScenario,
    {},
    24,
    electionScenarios,
    0.4,
    baseState.shards,
    historicalElectionHistory
  )?.id,
  'election_1864_lincoln',
  'Cedar Creek should route historical campaign results to the Lincoln election stage'
);
assert.equal(
  resolveNextScenario(
    electionBranchScenario,
    {},
    24,
    electionScenarios,
    0.5,
    baseState.shards,
    alternateElectionHistory
  )?.id,
  'election_1864_mcclellan',
  'Cedar Creek should route qualifying alternate results to the McClellan election stage'
);

const endingScenarios = [
  { id: 'appomattox_decision', turn: 28 },
  { id: 'greensboro_convention', turn: 28 },
  { id: 'southern_independence_1864', turn: 28 }
];
const richmondEndingRouter = {
  id: 'richmond_evacuation',
  turn: 27,
  branches: [
    {
      minDivergence: 0.72,
      scenarioId: 'southern_independence_1864',
      requiredScenarios: ['gettysburg_with_jackson', 'shiloh_army_of_tennessee', 'election_1864_mcclellan'],
      requiredChoices: [
        { scenarioId: 'shiloh_army_of_tennessee', choiceId: 'option_b' },
        { scenarioId: 'chancellorsville_aftermath', choiceId: 'option_b' },
        { scenarioId: 'gettysburg_with_jackson', choiceId: 'option_a', choiceSucceeded: true }
      ],
      requiredChoiceGroups: [
        { any: [{ scenarioId: 'atlanta_election_pressure', choiceId: 'option_b' }] },
        { any: [{ scenarioId: 'third_winchester', choiceId: 'option_d' }] }
      ]
    },
    { minDivergence: 0.55, scenarioId: 'greensboro_convention' }
  ]
};
const rareEndingHistory = [
  { scenarioId: 'shiloh_army_of_tennessee', choiceId: 'option_b' },
  { scenarioId: 'chancellorsville_aftermath', choiceId: 'option_b' },
  { scenarioId: 'gettysburg_with_jackson', choiceId: 'option_a', choiceSucceeded: true },
  { scenarioId: 'atlanta_election_pressure', choiceId: 'option_b' },
  { scenarioId: 'third_winchester', choiceId: 'option_d' },
  { scenarioId: 'election_1864_mcclellan', choiceId: 'option_b' }
];
const rareEndingNearMissHistory = rareEndingHistory.map((entry) => (
  entry.scenarioId === 'gettysburg_with_jackson'
    ? { scenarioId: 'gettysburg_with_jackson', choiceId: 'option_c' }
    : entry
));
assert.equal(
  resolveNextScenario(richmondEndingRouter, {}, 28, endingScenarios, 0.5, null, [])?.id,
  'appomattox_decision',
  'sub-55% divergence should route to the ordinary Appomattox ending'
);
assert.equal(
  resolveNextScenario(
    richmondEndingRouter,
    { next: 'appomattox_decision' },
    28,
    endingScenarios,
    0.8,
    null,
    []
  )?.id,
  'appomattox_decision',
  'the immediate Richmond evacuation choice should explicitly reach Appomattox even on a diverged timeline'
);
assert.equal(
  resolveNextScenario(richmondEndingRouter, {}, 28, endingScenarios, 0.6, null, [])?.id,
  'greensboro_convention',
  '55% or greater divergence without the rare chain should route to Greensboro'
);
assert.equal(
  resolveNextScenario(richmondEndingRouter, {}, 28, endingScenarios, 0.8, null, rareEndingHistory)?.id,
  'southern_independence_1864',
  'the full high-divergence military and election chain should unlock the rare peace-crisis ending'
);
assert.equal(
  resolveNextScenario(richmondEndingRouter, {}, 28, endingScenarios, 0.8, null, rareEndingNearMissHistory)?.id,
  'greensboro_convention',
  'only the successful Jackson-at-Gettysburg flank assault should unlock the rare peace-crisis ending'
);

const gettysburgRecognitionScenarios = [
  { id: 'chickamauga', turn: 14 },
  { id: 'gettysburg_recognition_crisis', turn: 14, interlude: true }
];
const gettysburgRecognitionRouter = {
  id: 'gettysburg_with_jackson',
  turn: 13,
  branches: [
    {
      minDivergence: 0,
      scenarioId: 'gettysburg_recognition_crisis',
      requiredChoices: [
        { scenarioId: 'shiloh_army_of_tennessee', choiceId: 'option_b' },
        { scenarioId: 'chancellorsville_aftermath', choiceId: 'option_b' },
        { scenarioId: 'gettysburg_with_jackson', choiceId: 'option_a', choiceSucceeded: true }
      ]
    }
  ]
};
const recognitionHistory = [
  { scenarioId: 'shiloh_army_of_tennessee', choiceId: 'option_b' },
  { scenarioId: 'chancellorsville_aftermath', choiceId: 'option_b' },
  { scenarioId: 'gettysburg_with_jackson', choiceId: 'option_a', choiceSucceeded: true }
];
assert.equal(
  resolveNextScenario(
    gettysburgRecognitionRouter,
    { id: 'option_a' },
    14,
    gettysburgRecognitionScenarios,
    0.5,
    baseState.shards,
    recognitionHistory
  )?.id,
  'gettysburg_recognition_crisis',
  'Johnston and Jackson surviving plus a successful Gettysburg option A should open international recognition'
);
assert.equal(
  resolveNextScenario(
    gettysburgRecognitionRouter,
    { id: 'option_a' },
    14,
    gettysburgRecognitionScenarios,
    0.5,
    baseState.shards,
    recognitionHistory.filter((entry) => entry.scenarioId !== 'shiloh_army_of_tennessee')
  )?.id,
  'chickamauga',
  'Gettysburg success without Johnston surviving Shiloh should continue directly to Chickamauga'
);

const recognitionStage = {
  id: 'gettysburg_recognition_crisis',
  turn: 14,
  interlude: true,
  title: 'International Recognition',
  date: 'July 1863',
  choices: [
    {
      id: 'option_a',
      endsCampaign: true,
      text: 'Accept recognition and armistice.',
      proposer: 'wolf',
      effects: { metrics: { publicMorale: 10 }, shards: {} },
      consequence: 'The campaign concludes in recognized independence.'
    },
    {
      id: 'option_b',
      next: 'chickamauga',
      text: 'Continue the war.',
      proposer: 'hotspur',
      effects: { metrics: { militaryStrength: 5 }, shards: {} },
      consequence: 'The war continues.'
    }
  ]
};
const recognitionState = {
  ...baseState,
  currentTurn: 14,
  scenarioId: 'gettysburg_recognition_crisis',
  history: recognitionHistory
};
const recognizedIndependence = advanceCampaignTurn(
  recognitionState,
  recognitionStage,
  'option_a',
  [recognitionStage, ...gettysburgRecognitionScenarios]
);
assert.equal(recognizedIndependence.state.gameOver, true, 'accepting the recognition armistice should end the campaign');
assert.equal(recognizedIndependence.nextScenario, null, 'accepted recognition must not expose Chickamauga as a next stage');
assert.match(recognizedIndependence.state.statusMessage, /Britain and France recognize/, 'terminal recognition should preserve its authored ending message');
assert.equal(
  classifyCampaignEnding(recognizedIndependence.state).endingClass,
  'Recognized Independence at Gettysburg',
  'the Gettysburg recognition ending should receive a specific ending classification'
);
const recognitionWarContinues = advanceCampaignTurn(
  recognitionState,
  recognitionStage,
  'option_b',
  [recognitionStage, ...gettysburgRecognitionScenarios]
);
assert.equal(recognitionWarContinues.state.gameOver, false, 'declining the immediate armistice should keep the campaign active');
assert.equal(recognitionWarContinues.nextScenario.id, 'chickamauga', 'continuing after recognition should resume at Chickamauga');

const mcclellanStage = {
  id: 'election_1864_mcclellan',
  turn: 24,
  title: 'McClellan Presidency',
  date: 'November 8, 1864',
  choices: [
    {
      id: 'option_b',
      next: 'black_confederate_debate',
      text: 'Continue the war through inauguration.',
      proposer: 'fox',
      effects: { metrics: {}, shards: {} },
      consequence: 'The war continues.'
    },
    {
      id: 'option_d',
      endsCampaign: true,
      text: 'Accept conditional reunion.',
      proposer: 'sovereign',
      effects: { metrics: { publicMorale: 10 }, shards: {} },
      consequence: 'The campaign concludes in conditional reunion.'
    }
  ]
};
const postElectionStage = {
  id: 'black_confederate_debate',
  turn: 25,
  title: 'Recruiting Colored Troops',
  date: 'March 1865',
  choices: []
};
const mcclellanState = {
  ...baseState,
  currentTurn: 24,
  scenarioId: 'election_1864_mcclellan',
  history: []
};
const continuedWar = advanceCampaignTurn(
  mcclellanState,
  mcclellanStage,
  'option_b',
  [mcclellanStage, postElectionStage]
);
assert.equal(continuedWar.state.gameOver, false, 'continuing the war under McClellan should proceed as a normal campaign stage');
assert.equal(continuedWar.nextScenario.id, 'black_confederate_debate', 'continued war should advance to the next authored stage');
const conditionalReunion = advanceCampaignTurn(
  mcclellanState,
  mcclellanStage,
  'option_d',
  [mcclellanStage, postElectionStage]
);
assert.equal(conditionalReunion.state.gameOver, true, 'accepting reunion under McClellan should end non-AI campaign play');
assert.equal(conditionalReunion.nextScenario, null, 'a terminal McClellan reunion must not route to another stage');
assert.equal(
  classifyCampaignEnding(conditionalReunion.state).endingClass,
  'Concurrent Majority Reunion',
  'the terminal McClellan settlement should receive its own ending classification'
);
assert.equal(
  calculateCampaignScore(conditionalReunion.state).survived,
  true,
  'an early terminal political settlement should count as a concluded campaign rather than a collapse'
);
assert.equal(
  getChoiceAvailability(
    { id: 'option_a', proposer: 'hotspur', minDivergence: 0.35 },
    { id: 'appomattox_decision', turn: CAMPAIGN_FINAL_TURN },
    {
      ...baseState,
      divergenceIndex: 0.5,
      shards: {
        ...baseState.shards,
        hotspur: { ...baseState.shards.hotspur, alignment: 10 }
      }
    }
  ).locked,
  false,
  'final settlement choices should not be vetoed by a cabinet faction in resistance'
);

const crisisRoutingScenarios = [
  { id: 'main_turn_5', turn: 5 },
  { id: 'hotspur_cabinet_crisis', turn: 0, crisisFor: 'hotspur' }
];
const lowHotspur = {
  hotspur: { alignment: 20 },
  fox: { alignment: 60 },
  wolf: { alignment: 60 }
};
const recentHotspurCrisisHistory = [
  { scenarioId: 'hotspur_cabinet_crisis', crisisFor: 'hotspur' },
  { scenarioId: 'main_turn_2' },
  { scenarioId: 'main_turn_3' }
];
assert.equal(
  resolveNextScenario(
    { id: 'main_turn_4', turn: 4 },
    {},
    5,
    crisisRoutingScenarios,
    0,
    lowHotspur,
    recentHotspurCrisisHistory
  )?.id,
  'main_turn_5',
  'a faction should not trigger another cabinet crisis after its first hearing'
);
assert.equal(
  resolveNextScenario(
    { id: 'main_turn_4', turn: 4 },
    {},
    5,
    crisisRoutingScenarios,
    0,
    lowHotspur,
    [...recentHotspurCrisisHistory, { scenarioId: 'main_turn_4' }]
  )?.id,
  'main_turn_5',
  'a faction crisis should not recur even after several intervening main stages'
);

const stabilizedCrisisTick = tickMetrics(
  {
    ...baseState,
    shards: {
      ...baseState.shards,
      hotspur: { ...baseState.shards.hotspur, alignment: 12 }
    }
  },
  {
    effects: { metrics: {}, shards: { hotspur: 8 } },
    shardAlignmentFloor: { hotspur: 35 }
  },
  0,
  { skipTurnDecay: true }
);
assert.equal(
  stabilizedCrisisTick.shards.hotspur.alignment,
  35,
  'cabinet settlement choices should restore the affected faction above the crisis threshold'
);
const lateCampaignScenario = { id: 'petersburg_siege', turn: 20 };
assert.equal(
  resolveNextScenario(
    lateCampaignScenario,
    {},
    21,
    [
      { id: 'fall_of_atlanta', turn: 21 },
      { id: 'hotspur_cabinet_crisis', turn: 0, crisisFor: 'hotspur' }
    ],
    0.4,
    lowHotspur,
    []
  )?.id,
  'fall_of_atlanta',
  'cabinet crises should not interrupt the final campaign sequence after turn 19'
);

assert.equal(divergenceTier(0.7).tier, 'severed', 'high divergence should classify as a severed timeline');
const finalScore = calculateCampaignScore({ ...baseState, currentTurn: CAMPAIGN_FINAL_TURN });
assert.equal(finalScore.breakdown.length, 3, 'campaign score should expose three composite score components');
assert.equal(finalScore.reportCards.timelineFidelity.grade, 'A', 'zero divergence should preserve an A timeline fidelity grade');
assert.equal(typeof finalScore.reportCards.tacticalSmarts.score, 'number', 'campaign score should expose tactical report-card scoring');

const goodDecisionScore = calculateCampaignScore({
  ...baseState,
  currentTurn: CAMPAIGN_FINAL_TURN,
  divergenceIndex: 0.2,
  history: [
    { scenarioId: 'wilderness_opening', choiceId: 'option_b', choiceProposer: 'fox', scenarioRoleLabel: 'Army Commander', metricEffects: { militaryStrength: 10, munitions: -8, publicMorale: 14, divergenceIndex: 0.03 } },
    { scenarioId: 'gettysburg_decision', choiceId: 'option_b', choiceProposer: 'fox', scenarioRoleLabel: 'Commander of Northern Virginia', metricEffects: { militaryStrength: -5, munitions: -5, publicMorale: 15 } }
  ]
});
const badDecisionScore = calculateCampaignScore({
  ...baseState,
  currentTurn: CAMPAIGN_FINAL_TURN,
  divergenceIndex: 0.2,
  history: [
    { scenarioId: 'wilderness_opening', choiceId: 'option_a', choiceProposer: 'hotspur', scenarioRoleLabel: 'Army Commander', metricEffects: { militaryStrength: -72, munitions: -18, publicMorale: -8 } },
    { scenarioId: 'gettysburg_decision', choiceId: 'option_a', choiceProposer: 'hotspur', scenarioRoleLabel: 'Commander of Northern Virginia', metricEffects: { militaryStrength: -20, munitions: -20, publicMorale: 40, divergenceIndex: 0.4 } }
  ]
});
assert.ok(
  goodDecisionScore.reportCards.tacticalSmarts.score > badDecisionScore.reportCards.tacticalSmarts.score + 20,
  'audited tactical choices should materially outperform reckless tactical choices'
);
assert.equal(
  classifyCampaignEnding({
    ...baseState,
    currentTurn: 6,
    metrics: { ...baseState.metrics, publicMorale: 5 }
  }).endingClass,
  'Home Front Fracture',
  'morale collapse should classify as home-front failure rather than a coup-state ending'
);
assert.equal(
  classifyCampaignEnding({
    ...baseState,
    currentTurn: CAMPAIGN_FINAL_TURN,
    history: [{ scenarioId: 'greensboro_convention', choiceId: 'option_d' }],
    divergenceIndex: 0.7
  }).endingClass,
  'State Demobilization',
  'alternative final scenarios should produce specific ending classes'
);

const crisisState = {
  ...baseState,
  shards: {
    hotspur: { alignment: 28, influence: 35, name: 'Hotspur' },
    fox: { alignment: 60, influence: 40, name: 'Fox' },
    wolf: { alignment: 18, influence: 25, name: 'Wolf' }
  },
  history: [
    { crisisFor: 'hotspur', crisisResolved: true, crisisLabel: 'Hotspur Cabinet Crisis', turn: 3 },
    { crisisFor: 'wolf', crisisResolved: false, crisisLabel: 'Wolf Finance Crisis', turn: 6 }
  ]
};
const crisisSummary = summarizeCabinetCrises(crisisState);
assert.equal(crisisSummary.faced, 2, 'cabinet crisis summary should count all crisis sessions in history');
assert.equal(crisisSummary.resolved, 1, 'cabinet crisis summary should count resolved crises');
assert.equal(crisisSummary.activeAtEnd.length, 2, 'cabinet crisis summary should report factions still below the crisis threshold');

const headlessScenarios = [
  {
    id: 'opening',
    turn: 1,
    title: 'Opening',
    date: 'Day 1',
    choices: [
      {
        id: 'option_a',
        text: 'Trigger the Hotspur backlash.',
        proposer: 'hotspur',
        effects: {
          metrics: { divergenceIndex: 0.1 },
          shards: { hotspur: -40 }
        },
        consequence: 'The camps demand action.'
      }
    ]
  },
  {
    id: 'hotspur_cabinet_crisis',
    turn: 0,
    crisisFor: 'hotspur',
    title: 'Hotspur Cabinet Crisis',
    date: 'Emergency Session',
    choices: [
      {
        id: 'option_a',
        text: 'Placate the fire-eaters.',
        proposer: 'hotspur',
        effects: {
          metrics: { publicMorale: 5 },
          shards: { hotspur: +25 }
        },
        consequence: 'The cabinet steadies the camps.'
      }
    ]
  },
  {
    id: 'linear_turn_2',
    turn: 2,
    title: 'Turn Two',
    date: 'Day 2',
    choices: [
      {
        id: 'option_a',
        text: 'Continue the campaign.',
        proposer: 'fox',
        effects: {
          metrics: { publicMorale: 1 },
          shards: { fox: +1 }
        },
        consequence: 'The campaign continues.'
      }
    ]
  }
];
const headlessStart = {
  ...baseState,
  currentTurn: 1,
  scenarioId: 'opening',
  history: []
};
const firstAdvance = advanceCampaignTurn(headlessStart, headlessScenarios[0], 'option_a', headlessScenarios);
assert.equal(firstAdvance.nextScenario.id, 'hotspur_cabinet_crisis', 'headless turn advancement should inject crisis scenarios just like the UI flow');
const crisisAdvance = advanceCampaignTurn(firstAdvance.state, headlessScenarios[1], 'option_a', headlessScenarios);
assert.equal(crisisAdvance.historyEntry.crisisFor, 'hotspur', 'history entries should record which cabinet crisis was faced');
assert.equal(crisisAdvance.historyEntry.crisisResolved, true, 'history entries should record whether the crisis was stabilized');
assert.equal(
  crisisAdvance.ticked.metrics.munitions,
  firstAdvance.state.metrics.munitions,
  'cabinet crisis resolution should not apply a second round of campaign attrition'
);
const interludeScenarios = [
  {
    id: 'opening',
    turn: 1,
    title: 'Opening',
    date: 'Day 1',
    choices: [
      {
        id: 'option_a',
        text: 'Route to the interlude.',
        proposer: 'fox',
        next: 'emancipation_cabinet_debate',
        effects: { metrics: {}, shards: {} },
        consequence: 'The cabinet meets.'
      }
    ]
  },
  {
    id: 'emancipation_cabinet_debate',
    turn: 2,
    interlude: true,
    title: 'Interlude',
    date: 'Day 2',
    choices: [
      {
        id: 'option_a',
        text: 'Resume the main campaign.',
        proposer: 'wolf',
        next: 'linear_turn_2',
        effects: { metrics: { militaryStrength: 1 }, shards: {} },
        consequence: 'The main campaign resumes.'
      }
    ]
  },
  {
    id: 'linear_turn_2',
    turn: 2,
    title: 'Turn Two',
    date: 'Day 2',
    choices: [
      {
        id: 'option_a',
        text: 'Continue.',
        proposer: 'fox',
        effects: { metrics: {}, shards: {} },
        consequence: 'Continue.'
      }
    ]
  }
];
const interludeStart = {
  ...baseState,
  currentTurn: 1,
  scenarioId: 'opening',
  history: []
};
const interludeEntry = advanceCampaignTurn(interludeStart, interludeScenarios[0], 'option_a', interludeScenarios);
assert.equal(interludeEntry.nextScenario.id, 'emancipation_cabinet_debate', 'choice.next should be able to route into an interlude');
const interludeExit = advanceCampaignTurn(interludeEntry.state, interludeScenarios[1], 'option_a', interludeScenarios);
assert.equal(interludeExit.state.currentTurn, 2, 'interlude scenarios should not consume a campaign turn');
assert.equal(interludeExit.nextScenario.id, 'linear_turn_2', 'interlude choices should resume the main campaign scenario on the same turn');
assert.equal(
  getScenarioForState(interludeExit.state, interludeScenarios).id,
  'linear_turn_2',
  'same-turn scenario resolution should preserve the routed scenario id instead of snapping back to the first scenario on that turn'
);
const duplicateTurnScenarios = [
  {
    id: 'chattanooga_stranglehold',
    turn: 15,
    interlude: true,
    title: 'Chattanooga Stranglehold',
    date: 'October 1863',
    choices: [
      {
        id: 'option_b',
        text: 'Tighten the rail siege.',
        proposer: 'fox',
        next: 'wilderness_opening',
        effects: { metrics: { divergenceIndex: 0.08 }, shards: { fox: 5 } },
        consequence: 'The route moves to the Overland opening.'
      }
    ]
  },
  {
    id: 'wilderness_opening',
    turn: 15,
    title: 'Wilderness Crisis',
    date: 'May 6, 1864',
    choices: []
  },
  {
    id: 'wilderness',
    turn: 16,
    title: 'Wilderness Aftermath',
    date: 'May 6, 1864',
    choices: []
  }
];
const chattanoogaScenario = duplicateTurnScenarios[0];
const chattanoogaAdvance = advanceCampaignTurn(
  {
    ...baseState,
    currentTurn: chattanoogaScenario.turn,
    scenarioId: 'chattanooga_stranglehold',
    divergenceIndex: 0.4,
    history: []
  },
  chattanoogaScenario,
  'option_b',
  duplicateTurnScenarios
);
assert.equal(
  chattanoogaAdvance.nextScenario.id,
  'wilderness_opening',
  'Chattanooga should route to the Lee-to-the-rear Wilderness opening before the aftermath stage'
);
assert.equal(
  chattanoogaAdvance.state.currentTurn,
  15,
  'Chattanooga should remain on turn 15 so the same-turn Wilderness opening does not advance the campaign clock twice'
);
assert.equal(
  getScenarioForState(chattanoogaAdvance.state, duplicateTurnScenarios).id,
  'wilderness_opening',
  'off-turn Chattanooga route should preserve wilderness_opening in UI scenario resolution'
);
const fragileInterludeExit = advanceCampaignTurn(
  {
    ...baseState,
    currentTurn: 2,
    scenarioId: 'emancipation_cabinet_debate',
    metrics: {
      ...baseState.metrics,
      militaryStrength: 14,
      publicMorale: 35,
      foodSupply: 50,
    },
    history: [],
  },
  interludeScenarios[1],
  'option_a',
  interludeScenarios
);
assert.equal(fragileInterludeExit.state.gameOver, false, 'interlude choices should not apply full turn attrition before resuming play');
assert.equal(fragileInterludeExit.nextScenario.id, 'linear_turn_2', 'fragile interlude state should still route to the next authored scenario');
const headlessRun = runHeadlessCampaign({
  scenarios: headlessScenarios,
  initialState: headlessStart,
  chooseChoice: ({ scenario }) => scenario.choices[0].id,
  maxTurns: 2
});
assert.equal(headlessRun.turns.length, 2, 'headless campaign runner should execute successive turns without the React app');
assert.equal(headlessRun.turns[1].crisisFor, 'hotspur', 'headless campaign runner should surface crisis turns in its execution log');
const asyncHeadlessRun = await runHeadlessCampaignAsync({
  scenarios: headlessScenarios,
  initialState: headlessStart,
  chooseChoice: async ({ scenario }) => scenario.choices[0].id,
  maxTurns: 2
});
assert.equal(asyncHeadlessRun.turns.length, 2, 'async headless campaign runner should support awaited choice providers for model benchmarking');
assert.equal(asyncHeadlessRun.turns[1].crisisFor, 'hotspur', 'async headless campaign runner should preserve crisis metadata');

const freshCampaign = createFreshCampaignState(12345, 'fort_sumter');
assert.equal(freshCampaign.seed, 12345, 'fresh campaign state should preserve the requested seed');
assert.equal(freshCampaign.currentTurn, 1, 'fresh campaign state should start at turn 1');

const fortSumterScenarioSource = readFileSync(new URL('../src/game/scenarios.js', import.meta.url), 'utf8');
const fortSumterSource = fortSumterScenarioSource.slice(
  fortSumterScenarioSource.indexOf('id: "fort_sumter"'),
  fortSumterScenarioSource.indexOf('id: "radical_republican_crisis"')
);
function extractChoiceSource(source, choiceId) {
  const start = source.indexOf(`id: "${choiceId}"`);
  assert.ok(start >= 0, `expected Fort Sumter ${choiceId} choice to exist`);
  const nextChoice = source.indexOf('id: "option_', start + choiceId.length + 6);
  return source.slice(start, nextChoice >= 0 ? nextChoice : source.length);
}
assert.match(
  extractChoiceSource(fortSumterSource, 'option_a'),
  /next:\s*"manassas_battlefield"/,
  'Fort Sumter aggressive defense should route to First Manassas, not the Radical Republicans crisis'
);
assert.match(
  extractChoiceSource(fortSumterSource, 'option_b'),
  /next:\s*"radical_republican_crisis"/,
  'Fort Sumter negotiated evacuation should be the Radical Republicans crisis route'
);
assert.match(
  extractChoiceSource(fortSumterSource, 'option_c'),
  /next:\s*"manassas_battlefield"/,
  'Fort Sumter delay should route to First Manassas, not the Radical Republicans crisis'
);
assert.match(
  extractChoiceSource(fortSumterSource, 'option_d'),
  /next:\s*"charleston_harbor_escape"/,
  'Fort Sumter barge escape should keep its Charleston Harbor escape branch'
);

const snapshot = createCampaignSnapshot(
  { ...freshCampaign, currentTurn: 2, scenarioId: 'charleston_harbor_escape' },
  { id: 'charleston_harbor_escape', title: 'Charleston Harbor Escape', choices: [{ id: 'fixture-choice', text: 'Continue the harbor escape.' }] },
  { selectedModel: 'llama3.2', aiPortalEngaged: true }
);
const restored = restoreCampaignFromSnapshot(snapshot, [
  { id: 'fort_sumter', turn: 1 },
  { id: 'charleston_harbor_escape', turn: 2, choices: [] }
]);
assert.equal(restored.state.seed, 12345, 'campaign snapshots should restore the saved seed');
assert.equal(restored.activeScenario.id, 'charleston_harbor_escape', 'campaign snapshots should restore the active scenario');
assert.equal(restored.state.scenarioId, 'charleston_harbor_escape', 'campaign snapshots should restore the scenario id');
const migratedV1 = restoreCampaignFromSnapshot(
  {
    ...snapshot,
    version: 1,
    state: {
      ...snapshot.state,
      rulesVersion: 1,
      battleRulesVersion: 1,
      metrics: {
        militaryStrength: snapshot.state.metrics.militaryStrength,
        munitions: snapshot.state.metrics.munitions,
        treasury: snapshot.state.metrics.treasury,
        publicMorale: snapshot.state.metrics.publicMorale
      }
    }
  },
  [{ id: 'charleston_harbor_escape', turn: 2, choices: [] }]
);
assert.equal(migratedV1.migratedFromVersion, 1, 'version 1 saves should report migration to the current format');
assert.equal(migratedV1.state.metrics.foodSupply, INITIAL_STATE.metrics.foodSupply, 'version 1 saves should receive the current food-supply default');
assert.equal(
  restoreCampaignFromSnapshot({ ...snapshot, version: 0 }, []),
  null,
  'unsupported legacy campaign saves should be rejected'
);
assert.equal(
  restoreCampaignFromSnapshot({ ...snapshot, version: snapshot.version + 1 }, []),
  null,
  'campaign saves from newer builds should be rejected'
);

const memoryStorage = new Map();
const storageAdapter = {
  getItem: (key) => memoryStorage.get(key) || null,
  setItem: (key, value) => memoryStorage.set(key, value)
};
assert.equal(saveCampaignSnapshot(snapshot, storageAdapter).ok, true, 'campaign snapshots should save through a storage adapter');
assert.equal(loadCampaignSnapshot(storageAdapter).state.seed, 12345, 'campaign snapshots should load through a storage adapter');

const scenariosSource = readFileSync(new URL('../src/game/scenarios.js', import.meta.url), 'utf8');
assert.equal(
  scenariosSource.includes('image: "/src/assets/images/'),
  false,
  'scenario cards should use imported Vite assets, not raw /src image strings'
);
const atlantaPressureSource = scenariosSource.slice(
  scenariosSource.indexOf('id: "atlanta_election_pressure"'),
  scenariosSource.indexOf('id: "atlanta_holds_october"')
);
assert.match(
  extractChoiceSource(atlantaPressureSource, 'option_a'),
  /next:\s*"fall_of_atlanta"/,
  'Replacing Johnston with Hood should explicitly route into the Fall of Atlanta scenario'
);
const recognitionCrisisSource = scenariosSource.slice(
  scenariosSource.indexOf('id: "gettysburg_recognition_crisis"'),
  scenariosSource.indexOf('id: "chickamauga"')
);
assert.match(
  recognitionCrisisSource,
  /turn:\s*0/,
  'Gettysburg recognition crisis should be branch-only, not the default linear turn 14 scenario'
);
const petersburgSource = scenariosSource.slice(
  scenariosSource.indexOf('id: "petersburg_siege"'),
  scenariosSource.indexOf('id: "five_forks"')
);
assert.equal(
  /rail\s*guns?|railway\s*guns?/i.test(petersburgSource),
  false,
  'Petersburg should not use rail-gun technology in the Crater options'
);
assert.equal(
  /ceasefire|cease-fire/i.test(extractChoiceSource(petersburgSource, 'option_c')),
  false,
  'Petersburg option C should be an aggressive sortie path, not a cease-fire proposal'
);

const mappedTacticalMedia = resolveScenarioMediaSet('antietam').tacticalMap;
assert.equal(mappedTacticalMedia.kind, 'map', 'mapped tactical scenarios should use verified terrain maps');
assert.equal(
  mappedTacticalMedia.src.includes('map_antietam_sharpsburg_loc.jpg'),
  true,
  'Antietam tactical mode should use the Sharpsburg terrain map'
);

const proceduralTacticalMedia = resolveScenarioMediaSet('chickamauga').tacticalMap;
assert.equal(proceduralTacticalMedia.isProcedural, true, 'unmapped tactical scenarios should use procedural terrain');
assert.equal(proceduralTacticalMedia.src, '', 'procedural tactical fallback should not reuse theater/card art');

const greensboroMedia = resolveScenarioMediaSet('greensboro_convention').theater;
assert.equal(
  greensboroMedia.src.includes('Davis and Lee.jpeg'),
  true,
  'Greensboro should use the Davis and Lee late-war strategy image'
);
const chancellorsvilleOpeningMedia = resolveScenarioMediaSet('chancellorsville_maneuver').theater;
assert.ok(
  chancellorsvilleOpeningMedia.cropFocus.y <= 0.36,
  'Chancellorsville opening art should retain enough upper framing to show Lee’s full forehead'
);
const coldHarborMedia = resolveScenarioMediaSet('cold_harbor').theater;
assert.equal(
  coldHarborMedia.src.includes('Grant at Cold Harbor.jpeg'),
  true,
  'Cold Harbor should use the sharper Grant image as its primary theater art'
);
assert.equal(
  scenariosSource.includes('image: "/images/cw_pictures/Grant at Cold Harbor.jpeg"'),
  true,
  'Cold Harbor should use the single high-resolution Grant image for its scenario thumbnail'
);
const appomattoxMedia = resolveScenarioMediaSet('appomattox_decision').theater;
assert.equal(
  appomattoxMedia.src.includes('Appomattox.jpeg'),
  true,
  'Appomattox should use the dedicated Appomattox theater image instead of the Christmas Truce art'
);

const cedarCreekContinuationChoices = [
  {
    id: 'option_a',
    effects: {
      metrics: { militaryStrength: 4, munitions: -16, publicMorale: 30, foodSupply: 22, divergenceIndex: 0.16 },
      shards: { hotspur: 24, fox: 16, wolf: 16 }
    },
    survivalFloor: { militaryStrength: 18, publicMorale: 18, foodSupply: 12 }
  },
  {
    id: 'option_b',
    effects: {
      metrics: { militaryStrength: -22, munitions: -14, publicMorale: -14, foodSupply: -16 },
      shards: { fox: -8, hotspur: -6 }
    },
    survivalFloor: { militaryStrength: 12, publicMorale: 12, foodSupply: 8 }
  },
  {
    id: 'option_c',
    effects: {
      metrics: { militaryStrength: -8, munitions: -8, publicMorale: 4, foodSupply: 14, divergenceIndex: 0.06 },
      shards: { wolf: 24, fox: 12, hotspur: -8 }
    },
    survivalFloor: { militaryStrength: 14, publicMorale: 14, foodSupply: 10 }
  },
  {
    id: 'option_d',
    effects: {
      metrics: { militaryStrength: -12, munitions: -10, publicMorale: -4, foodSupply: 8, divergenceIndex: 0.04 },
      shards: { fox: 18, wolf: 10 }
    },
    survivalFloor: { militaryStrength: 14, publicMorale: 14, foodSupply: 10 }
  }
];
for (const choice of cedarCreekContinuationChoices) {
  const fragileCedarState = {
    ...baseState,
    currentTurn: 23,
    scenarioId: 'cedar_creek',
    metrics: {
      ...baseState.metrics,
      militaryStrength: 15,
      publicMorale: 18,
      foodSupply: 16
    }
  };
  const cedarTick = tickMetrics(fragileCedarState, choice);
  assert.equal(cedarTick.gameOver, false, `Cedar Creek ${choice.id} should continue into the election stage`);
}
assert.ok(
  cedarCreekContinuationChoices[0].effects.shards.hotspur > 0
    && cedarCreekContinuationChoices[0].effects.shards.fox > 0
    && cedarCreekContinuationChoices[0].effects.shards.wolf > 0,
  'Cedar Creek option A should increase support across all three cabinet blocs'
);

console.log('Smoke tests passed.');
