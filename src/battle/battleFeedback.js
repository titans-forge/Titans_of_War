import { objectiveControl, objectiveEligibility } from './objectiveControl.js';

export function rallyFeedback(unit) {
  if (!unit || unit.order !== 'rally') return null;
  const ready = unit.readiness || {};
  const checks = [
    { label: 'Clear of nearby enemies and enemy fire', met: ready.rallySafe === true },
    { label: 'Organized friendly support within 340', met: ready.supported === true },
    { label: `Safe interval ${Math.min(10, unit.safeTime || 0).toFixed(1)} / 10 field minutes`, met: unit.safeTime >= 10 },
    { label: `Morale ${Math.floor(unit.morale)} / 40`, met: unit.morale >= 40 },
    { label: `Cohesion ${Math.floor(unit.cohesion)} / 35`, met: unit.cohesion >= 35 },
  ];
  return { checks, message: !ready.rallySafe ? 'Rally blocked: get clear of nearby enemies and enemy fire.' : !ready.supported ? 'Rally blocked: bring an organized friend within 340.' : unit.safeTime < 10 ? 'Establishing a safe rally interval; morale and cohesion recover afterward.' : 'Recovering morale and cohesion; returns to Hold when both thresholds are reached.' };
}
export function objectiveFeedback(snapshot, selectedId) {
  const mode = snapshot?.gettysburg ? 'ridge' : snapshot?.fieldBattle?.attackObjective ? 'attack' : null;
  if (!mode) return [];
  const selected = snapshot.formations.find(u => u.id === selectedId);
  return (mode === 'ridge' ? snapshot.gettysburg.sectors : [snapshot.fieldBattle.attackObjective]).map(sector => {
    const { candidates, supported, defenders } = objectiveControl(snapshot.formations, sector, mode);
    const reason = selected ? objectiveEligibility(selected, sector, mode) || (!supported.some(u => u.id === selectedId) ? mode === 'ridge' ? 'Needs an organized friend within 340 (the friend can be outside this sector)' : 'Needs another eligible infantry formation inside this objective and within 340' : 'Counts toward control') : 'Select an infantry formation to inspect its eligibility';
    return { id: sector.id, name: sector.name, candidates: candidates.map(u => u.name), supported: supported.map(u => u.name), defenders: defenders.map(u => u.name), reason };
  });
}

// Advisory only: no orders or simulation changes. Show actual observed pressure.
export function armyAttention(snapshot) {
  if (!snapshot || snapshot.resolving || snapshot.outcome !== 'undecided') return [];
  return snapshot.formations.filter(u=>u.side==='confederate' && u.active && u.strength>0 && !['broken','surrendered'].includes(u.status)).flatMap(u=>{
    let priority=0,reason='',advice='';
    if(u.status==='routing'){priority=4;reason='Routing';advice=u.order==='rally' ? rallyFeedback(u)?.message : 'Select this formation to assess safety and support, then explicitly order Rally if you want to recover it.';}
    else if(u.condition==='wavering' || u.morale<38 || u.cohesion<32 || u.suppression>65){priority=3;reason='At risk of routing';advice='Check the retreat path. Consider Fallback and a supported recovery before committing again.';}
    else if(u.flanked){priority=3;reason='Flank or rear threatened';advice='Inspect nearby enemies. Turn if there is room, support the exposed flank, or fall back.';}
    else if(u.pressureReason === 'Turning space blocked by a nearby formation'){priority=2;reason='Turning space blocked';advice='This formation cannot turn into its order. Pause, inspect nearby troops, and preview a short move into open ground before reissuing the attack.';}
    else if(u.suppression>35){priority=2;reason='Under heavy fire';advice='Check cover and friendly support; continued exposure can break this formation.';}
    else if(u.ammunition===0){priority=2;reason='Out of ammunition';advice='This formation cannot fire. Consider replacing it in the firing line.';}
    else if(u.readiness?.supported===false && (u.order==='assault' || u.directMove)){priority=1;reason='Moving without support';advice='Keep an organized friend within 340 before meeting the enemy.';}
    return priority ? [{id:u.id,name:u.name,priority,reason,advice}] : [];
  }).sort((a,b)=>b.priority-a.priority || a.id.localeCompare(b.id));
}
