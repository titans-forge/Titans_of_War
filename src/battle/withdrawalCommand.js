import { BATTLE_ENGINE_CONFIGS } from './battleDefinitions.js';

// Presentation of existing rules only; this module never changes orders or resolution.
export function withdrawalBrief(id, choiceId, rulesVersion) {
  if (!(rulesVersion >= 4)) return null;
  if (id === 'wilderness' && choiceId === 'option_d') return {
    title: 'Brock Road · Account for the arriving reserves',
    orders: [
      'Withdraw at least 65% of the starting army in order. This includes the Texas Brigade and Longstreet, who arrive later; an order to the opening formations does not apply to reinforcements.',
      'The Texas Brigade is scheduled at minute 12 and Longstreet at minute 20. Pause on arrival, select each fresh formation and give its own withdrawal order. Clear the arrival area if the roster shows a blocked arrival.',
      'Withdraw leaves the battle; Fallback keeps troops available. Watch organized exits and finish the withdrawal before minute 118. Keep the focus on safe exits; this strategy does not require a counterattack.',
    ],
  };
  if (id === 'third_winchester' && ['option_b','option_d'].includes(choiceId)) {
    const c = BATTLE_ENGINE_CONFIGS.third_winchester;
    return {title:'Winchester corridor · Cover, then bring the screen home', orders:[
      `Cover the retreat before sending everyone away: hold Middle Field with two organized infantry formations under pressure for ${c.middleFieldHoldRequired} field minutes, or use Gordon or Wharton to cover retiring troops in the rearguard sector for ${c.rearguardHoldRequired}. Cover time accumulates.`,
      `Then withdraw at least 65% of starting strength through the lower-left corridor, including Gordon or Wharton. Withdraw takes each formation toward the corridor. Leaving together before cover is earned preserves survivors but fails the mission.`,
      `Watch the cover checkpoint above the field. Once earned, bring the screen out before cavalry pressure at minute ${c.cavalryPressureTime}; the mission deadline is ${c.maxTime}. Retreat distance alone cannot replace the corridor exit.`,
    ]};
  }
  return null;
}

export function withdrawalCommand(snapshot, choiceId) {
  if (!snapshot?.fieldBattle || snapshot.delegated) return null;
  const id = snapshot.scenarioId || snapshot.battleId;
  if (!withdrawalBrief(id,choiceId,snapshot.battleRulesVersion)) return null;
  if (id === 'third_winchester') {
    const p=snapshot.thirdWinchester, c=BATTLE_ENGINE_CONFIGS.third_winchester;
    if (!p) return null;
    const covered=p.middleFieldHeld >= c.middleFieldHoldRequired || p.rearguardHeld >= c.rearguardHoldRequired;
    return {title:covered ? 'Cover earned · Bring the screen home' : 'Cover needed before the final withdrawal',
      progress:`Middle Field ${p.middleFieldHeld.toFixed(1)} / ${c.middleFieldHoldRequired} min · Rearguard ${p.rearguardHeld.toFixed(1)} / ${c.rearguardHoldRequired} min`,
      detail:`Corridor ${Math.floor(p.escapedRatio*100)}% / 65% · Gordon or Wharton home: ${p.rearguardSurvived ? 'yes' : 'not yet'}`};
  }
  const army=snapshot.formations.filter(u=>u.side==='confederate');
  const initial=army.reduce((n,u)=>n+u.initialStrength,0);
  const escaped=army.filter(u=>u.withdrawn && u.withdrawalOrganized && !['routing','broken','surrendered'].includes(u.status)).reduce((n,u)=>n+u.strength,0)/Math.max(1,initial);
  const reserves=army.filter(u=>['texas-brigade','longstreet-first-corps'].includes(u.id));
  const state=u=>u.withdrawn ? u.withdrawalOrganized ? 'home in order' : 'escaped in disorder' : u.active ? ['routing','broken','surrendered'].includes(u.status) ? 'in disorder' : u.order === 'withdraw' || u.pendingCommand?.order === 'withdraw' ? 'withdrawing' : 'on field — needs an exit order' : u.participated ? 'lost from command' : u.arrivalBlocked ? 'arrival blocked — clear the area' : `due at ${u.arrivalTime}`;
  return {title:'Account for the arriving reserves',progress:`Withdrawn in order ${Math.floor(escaped*100)}% / 65% of starting army`,detail:reserves.map(u=>`${u.name}: ${state(u)}`).join(' · ')};
}
