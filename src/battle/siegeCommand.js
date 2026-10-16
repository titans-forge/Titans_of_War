import { BATTLE_ENGINE_CONFIGS } from './battleDefinitions.js';

// Observed command guidance; combat and mission adjudication stay in the engine.
export function siegeBrief(id, choice, rules) {
  if (!(rules >= 4)) return null;
  if (id === 'petersburg' && choice === 'option_c') return {
    title: 'Night sortie · Strike both targets, then return',
    selection: 'mahone-virginia-brigade',
    orders: [
      "Send Mahone's Virginia and Alabama brigades toward the Western Siege Train and Eastern Engineer Depot. Strike both before minute 54; watch the two target checkpoints, not the Crater's control sectors.",
      'Advance engages threats on the approach. A raid is recorded when a sortie brigade reaches within 245 field units of a target. View locates each target without issuing an order.',
      'When both targets are struck, order both brigades to Withdraw. They must reach a rear exit in order before minute 86; Fallback or distance from the enemy alone does not complete their return. Retain more than 70% of starting strength for mission success.',
    ],
  };
  if (id === 'cold_harbor' && choice === 'option_d') return {
    title: 'Petersburg transfer · Send reserves, hold the screen',
    selection: 'breckinridge-cold-harbor',
    orders: [
      "Order Breckinridge's Division and A. P. Hill's Reserve to Withdraw through the rear exits before minute 54. This transfers two reserve formations; sending the whole army away abandons the screen and fails the mission.",
      'Keep at least two of Kershaw, Hoke and Field organized in the rear works. Hold the screen through minute 32, when a completed transfer can resolve, and retain more than 68% of the starting army organized on the field or withdrawn in order.',
      'Watch both reserve exits and the screen count. Once the columns are clear, continue holding the works until the result is recorded; a repulsed assault by itself does not complete the selected transfer.',
    ],
  };
  return null;
}
export function sortieTargets(snapshot) {
  if (!snapshot?.fieldBattle || snapshot.scenarioId !== 'petersburg' || !snapshot.sortieState || snapshot.sortieState === 'not-applicable') return [];
  return BATTLE_ENGINE_CONFIGS.petersburg.siegeObjectiveIds.map(id => {
    const u=snapshot.formations.find(u=>u.id===id);
    const anchor=BATTLE_ENGINE_CONFIGS.petersburg.formations.find(u=>u.id===id);
    return u ? {id,name:u.name,x:anchor.x,y:anchor.y,height:180,hit:snapshot.sortieTargetsHit?.includes(id) === true} : null;
  }).filter(Boolean);
}
const orderly = u => u?.withdrawn && u.withdrawalOrganized === true;
const organized = u => u.withdrawn ? u.withdrawalOrganized === true : u.active && !['broken','routing'].includes(u.status) && u.morale >= 18 && u.cohesion >= 13 && u.strength > u.initialStrength * .12;
export function siegeCommand(snapshot, choice) {
  if (!snapshot?.fieldBattle || snapshot.delegated || !siegeBrief(snapshot.scenarioId,choice,snapshot.battleRulesVersion)) return null;
  const c=BATTLE_ENGINE_CONFIGS[snapshot.scenarioId], army=snapshot.formations.filter(u=>u.side==='confederate');
  if(snapshot.scenarioId==='petersburg') {
    const targets=sortieTargets(snapshot),returned=c.sortieFormationIds.filter(id=>orderly(army.find(u=>u.id===id))).length;
    const raided=['raided','withdrawn','trapped'].includes(snapshot.sortieState),deadline=c.postures.option_c.sortieDeadline+(raided?32:0);
    return {title:snapshot.sortieState === 'missed' ? 'Raid window missed' : snapshot.sortieState === 'trapped' ? 'Return window missed' : raided ? 'Both targets struck · Bring both brigades home' : 'Strike both siege targets',
      progress:`Targets ${targets.filter(t=>t.hit).length} / 2 · Brigades returned in order ${returned} / 2`,
      detail:`${raided?'Return':'Raid'} deadline ${deadline} · ${Math.max(0,Math.ceil(deadline-snapshot.time))} field minutes left`,targets};
  }
  const screen=army.filter(u=>u.type==='infantry' && u.entrenchDefender && u.active && organized(u) && u.x >= 0 && u.x <= c.world.width && u.y >= 615 && u.y <= c.world.height).length;
  const ratio=army.filter(organized).reduce((n,u)=>n+u.strength,0)/Math.max(1,army.reduce((n,u)=>n+u.initialStrength,0));
  const reserves=c.transferFormationIds.map(id=>army.find(u=>u.id===id));
  const describe=u=>orderly(u)?'clear in order':u?.withdrawn?'escaped in disorder':u?.order==='withdraw'||u?.pendingCommand?.order==='withdraw'?'withdrawing':'not clear';
  return {title:snapshot.transferState==='missed'?'Transfer window missed':snapshot.transferState==='transferred'?'Reserves clear · Keep holding the works':'Send the two reserves · Hold the works',
    progress:`Screen ${screen} / 2 formations · Organized army ${Math.floor(ratio*100)}% (must exceed 68%)`,
    detail:`${reserves.map(u=>`${u?.name || 'Reserve'}: ${describe(u)}`).join(' · ')}. ${snapshot.transferState==='pending'?`Transfer by 54 · ${Math.max(0,Math.ceil(54-snapshot.time))} min left`:'Screen required through minute 32'}`,
    screen,organizedRatio:ratio,targets:[]};
}
