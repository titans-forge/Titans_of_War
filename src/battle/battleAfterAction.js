// A bounded account of observed events, not an invented causal explanation.
export function battleAfterAction(snapshot, mission, achieved) {
  const routs = (snapshot.formations || []).filter(u => u.side === 'confederate' && Number.isFinite(u.routingAt) && u.routingCause).map(u => ({ time: u.routingAt, message: `${u.name}: ${u.routingCause}.` }));
  const meaningful = (snapshot.events || []).filter(e => !/order received\.|Formation positions and conditions are preserved\./.test(e.message) && (['objective', 'raid', 'warning', 'withdrawal', 'reinforcement', 'surprise', 'breakthrough', 'repulse', 'counterattack', 'containment', 'mine', 'gap'].includes(e.type) || /rallied;|withdrew in order|escaped in disorder|survivors captured|falling back under pressure/.test(e.message)));
  const controlEvents = (snapshot.gettysburg || snapshot.fieldBattle)?.controlEvents || [];
  const unique = [...meaningful, ...routs, ...controlEvents].filter(e => Number.isFinite(e.time) && e.time >= 0 && typeof e.message === 'string').sort((a, b) => a.time - b.time).filter((e, i, all) => !all.slice(0, i).some(v => v.time === e.time && v.message === e.message));
  const sampled = unique.length <= 8 ? unique : [...unique.slice(0, 4), ...unique.slice(-4)];
  const timeline = sampled.map(e => ({ time: Math.round(e.time * 10) / 10, message: e.message.slice(0, 500) }));
  const next = [];
  if (!achieved && snapshot.fieldBattle?.jonesborough?.replay) next.push(snapshot.fieldBattle.jonesborough.replay);
  if (!achieved && snapshot.fieldBattle?.fredericksburg?.replay) next.push(snapshot.fieldBattle.fredericksburg.replay);
  if (!achieved && snapshot.fieldBattle?.gainesMill?.replay) next.push(snapshot.fieldBattle.gainesMill.replay);
  if (!achieved && snapshot.fieldBattle?.newMarket?.replay) next.push(snapshot.fieldBattle.newMarket.replay);
  if (!achieved && snapshot.fieldBattle?.sailorsCreek?.replay) next.push(snapshot.fieldBattle.sailorsCreek.replay);
  else if (!achieved && snapshot.fieldBattle?.vicksburg?.replay) next.push(snapshot.fieldBattle.vicksburg.replay);
  else if (!achieved && snapshot.fieldBattle?.kennesaw?.replay) next.push(snapshot.fieldBattle.kennesaw.replay);
  else if (!achieved && snapshot.fieldBattle?.spotsylvania?.replay) next.push(snapshot.fieldBattle.spotsylvania.replay);
  else if (!achieved && snapshot.fieldBattle?.missionaryRidge?.replay) next.push(snapshot.fieldBattle.missionaryRidge.replay);
  else if (!achieved && snapshot.fieldBattle?.secondManassas?.replay) next.push(snapshot.fieldBattle.secondManassas.replay);
  else if (!achieved && snapshot.fieldBattle?.fiveForks?.replay) next.push(snapshot.fieldBattle.fiveForks.replay);
  else if (!achieved && snapshot.gettysburg && mission.kind === 'attack') next.push('Stage infantry in two ridge sectors, each with at least 600 troops, morale 30 and cohesion 25, plus an organized friend within 340. Clear eligible Union infantry and keep both sectors for 18 uninterrupted field minutes. Inspect Objective conditions before the assault.');
  else if (!achieved && snapshot.fieldBattle?.attackObjective) next.push(`At ${snapshot.fieldBattle.attackObjective.name}, bring two organized infantry formations inside the marked boundary and within 340 of each other. Finish direct moves, use Hold or Assault, and clear organized defenders for eight uninterrupted field minutes.`);
  else if (!achieved && snapshot.fieldBattle?.defenseObjective) next.push('At minute 105, keep two organized infantry formations on Henry Hill within 340 of each other, and clear organized Union troops from the hill. The hill defense must have come under fire during the battle. Bring a fresh reserve into support before the front breaks.');
  else if (!achieved && snapshot.fieldBattle?.reserveObjective) next.push('Keep two of Hardee, Bragg and Polk connected within 340, with Breckinridge in support and at least 65% of the starting army organized on the field. Complete eight uninterrupted support minutes after minute 48 and hold through minute 128. Rally early enough to return to a fighting posture before the deadline.');
  else if (!achieved && snapshot.fieldBattle?.preservationObjective) next.push('Retain at least 65% of starting strength in organized formations on the field or withdrawn in order. Rally shaken troops before they rout, account for arriving divisions, and avoid sacrificing the army to an optional attack on the gap.');
  else if (!achieved && snapshot.scenarioId === 'antietam' && snapshot.fieldBattle?.antietam?.replay) next.push(snapshot.fieldBattle.antietam.replay);
  else if (!achieved && snapshot.fieldBattle && snapshot.scenarioId === 'petersburg' && mission.kind === 'raid') next.push('Advance Mahone toward the Western Siege Train and Eastern Engineer Depot; strike both before minute 54. Then order both brigades to Withdraw and reach rear exits in order before minute 86. Watch the target checklist and return count.');
  else if (!achieved && snapshot.fieldBattle && snapshot.scenarioId === 'petersburg' && snapshot.battleRulesVersion >= 18) {
    if (mission.kind === 'attack') next.push('Hold the secondary line while Mahone’s Virginia and Alabama brigades arrive. Pause, select the Crater breach assault sector, and order both brigades to Assault before minute 48. Keep their approaches clear until both reach the breach.');
    else if (mission.signals?.includes('mines')) next.push('Hold the secondary line. Watch for the recorded mine shock and keep enough defenders ready to close the perimeter before minute 62.');
    else next.push('Keep at least three secondary defenders active through minute 68. Prevent the Federal assault formations from reaching the far side of the line. Containing them around the crater is enough for this objective.');
  }
  else if (!achieved && snapshot.fieldBattle && snapshot.scenarioId === 'cold_harbor' && mission.kind === 'withdraw') next.push('Withdraw Breckinridge and Hill through the rear exits before minute 54, while at least two organized infantry formations keep holding the works. Preserve more than 68% of the starting army organized and hold the screen through minute 32. A wholesale retreat cannot complete the transfer.');
  else if (!achieved && snapshot.fieldBattle && snapshot.scenarioId === 'cold_harbor' && mission.kind === 'hold') {
    const repulsed = snapshot.coldHarborAssaultState === 'repulsed';
    next.push(`${repulsed ? 'The Federal assault was repulsed. The defense also requires a field victory. ' : ''}Use Tactical overlay to find the cover boundary. Keep at least two organized defending infantry formations in the works and retain enough strength to hold the position.`);
  }
  else if (!achieved && snapshot.fieldBattle && snapshot.scenarioId === 'wilderness' && mission.kind === 'withdraw') next.push('Account for both arriving reserves: the Texas Brigade at minute 12 and Longstreet at minute 20. Give each its own withdrawal order after arrival and bring at least 65% of starting strength out in order. Orders to the opening formations do not include later arrivals.');
  else if (!achieved && mission.kind === 'withdraw') next.push(snapshot.thirdWinchester ? 'Use Middle Field or the rearguard to cover the columns, then bring the required formations through the lower-left Winchester corridor. Distance from the enemy alone does not count as a corridor exit.' : 'Plan the rear route before withdrawing. Keep an organized screen between retiring troops and the enemy, and check the mission brief for required exits and force thresholds.');
  else if (!achieved) next.push('Review the unmet mission evidence above before replaying. Stage supporting formations and a fresh reserve while paused, then watch the mission deadline as you commit.');
  if (routs.length) next.push('At the first wavering warning, use Fallback before the formation breaks. Rally in safety near organized support; the safe interval, morale 40 and cohesion 35 must all be satisfied.');
  if ((snapshot.formations || []).some(u => u.side === 'confederate' && u.ammunition <= 0)) next.push('Some formations exhausted their ammunition. Use their remaining strength to support or withdraw; reserve loaded infantry and deployed guns for the decisive ground.');
  if (!next.length) next.push('The selected mission was achieved. On the next attempt, compare casualties and ammunition retained while repeating the successful mission conditions.');
  return { timeline, omitted: unique.length - sampled.length, next: next.slice(0, 3) };
}
