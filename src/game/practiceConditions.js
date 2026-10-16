import { createFreshCampaignState } from './campaignStorage.js';
import { getBattleSupplyProfile } from './campaignSupply.js';

export const PRACTICE_AMMUNITION = Object.freeze({
  full: { label: 'Full ammunition', munitions: 80 },
  limited: { label: 'Limited ammunition', munitions: 30 },
  depleted: { label: 'Depleted ammunition', munitions: 0 },
});
export function createPracticeState(scenario, enemyDoctrine = 'reserve', ammunition = 'full') {
  if (!Object.hasOwn(PRACTICE_AMMUNITION, ammunition)) throw new Error('Unknown practice ammunition condition');
  const state = createFreshCampaignState(1861, scenario.id);
  return { ...state, currentTurn: scenario.turn, enemyDoctrine,
    metrics: { ...state.metrics, munitions: PRACTICE_AMMUNITION[ammunition].munitions } };
}
export function practiceAmmunitionLabel(state) {
  return `${Math.round(getBattleSupplyProfile(state).ammunitionMultiplier * 100)}% starting ammunition`;
}
