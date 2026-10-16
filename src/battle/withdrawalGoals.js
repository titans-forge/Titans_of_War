// Optional observed outcomes. These never alter battle resolution or campaign rewards.
export function withdrawalGoals(snapshot, mission, achieved = false) {
  if (mission?.kind !== 'withdraw' || snapshot?.delegated || !(snapshot?.fieldBattle || snapshot?.gettysburg)
    || snapshot.scenarioId === 'cold_harbor' || !Array.isArray(snapshot.formations)) return null;
  const army = snapshot.formations.filter(u => u.side === 'confederate');
  if (!army.length || army.some(u => !Number.isFinite(u.initialStrength) || u.initialStrength <= 0 || !Number.isFinite(u.strength) || u.strength < 0)) return null;
  const safe = u => u.withdrawn === true && u.withdrawalOrganized === true && !['routing', 'broken', 'surrendered'].includes(u.status);
  const initial = army.reduce((n,u) => n + u.initialStrength, 0);
  const escaped = army.filter(safe).reduce((n,u) => n + u.strength, 0) / initial;
  const guns = army.filter(u => u.type === 'artillery');
  const recovered = guns.filter(u => safe(u) && !u.gunsAbandoned).length;
  const finished = ['decisive-win','costly-win','disciplined-withdrawal','defeat','rout'].includes(snapshot.decision || snapshot.outcome || snapshot.result);
  const goal = (id,label,met,detail) => ({id,label,status:finished ? achieved && met ? 'achieved' : 'not-earned' : 'tracking',detail});
  return {version:1,finished,goals:[
    goal('army','Bring 90% home in order',escaped >= .9,`${Math.floor(Math.min(100,escaped * 100))}% of starting strength withdrawn in order`),
    goal('formations','Bring every formation out in order',army.every(safe),`${army.filter(safe).length} / ${army.length} formations withdrawn in order, including scheduled arrivals`),
    ...(guns.length ? [goal('guns','Recover every gun formation',recovered === guns.length,`${recovered} / ${guns.length} artillery formations withdrawn without abandoning guns`)] : []),
  ]};
}
export function isWithdrawalGoals(value) {
  const ids=['army','formations','guns'];
  return value?.version === 1 && typeof value.finished === 'boolean' && Array.isArray(value.goals) && value.goals.length >= 2 && value.goals.length <= 3
    && value.goals.every((g,i) => g && g.id === ids[i] && typeof g.label === 'string' && g.label.length > 0 && g.label.length <= 100
      && typeof g.detail === 'string' && g.detail.length > 0 && g.detail.length <= 240 && (value.finished ? ['achieved','not-earned'].includes(g.status) : g.status === 'tracking'));
}
