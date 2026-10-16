export const INITIAL_STATE = {
  // Historical seed state remains rules 1; createFreshCampaignState explicitly
  // starts new campaigns on rules 2. Missing fields in old archives never opt in.
  rulesVersion: 1,
  battleRulesVersion: 1,
  difficulty: 'standard',
  campaignEconomy: { treasuryArrears: 0, munitionsArrears: 0, emergencyUsed: 0 },
  supplyPlan: null,
  currentTurn: 1,
  actor: 'Major Robert Anderson',
  roleLabel: 'Fort Commander',
  divergenceIndex: 0.0,
  seed: 1861,
  alternateTimeline: false,
  metrics: {
    militaryStrength: 85,
    munitions: 80,
    treasury: 75,
    foodSupply: 78,
    publicMorale: 80
  },
  shards: {
    hotspur: { name: 'Radical Attackers', alignment: 70, influence: 35 },
    fox: { name: 'Tactical Pragmatists', alignment: 70, influence: 40 },
    wolf: { name: 'Diplomatic Strategists', alignment: 60, influence: 25 }
  },
  letterText: '',
  letterSentiment: null,
  history: [],
  battleCampaign: { version: 1, results: {} },
  gameOver: false,
  statusMessage: 'Secession crisis resolved into flashpoint. Fort Sumter isolated in Charleston Harbor.'
};
