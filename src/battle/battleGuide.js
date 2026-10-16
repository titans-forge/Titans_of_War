export const BATTLE_GUIDE_STORAGE_KEY = 'titans-of-war.battle-guide.v1';

export const BATTLE_GUIDE_STEPS = Object.freeze([
  { title: 'Select a formation', text: 'Choose a Confederate formation from the roster or its flag on the field. Check its strength, cohesion, and ammunition before giving orders.' },
  { title: 'Move deliberately', text: 'Select a formation and tap open ground. The battle pauses while you confirm its destination; resume when ready. Drag to pan. For keyboard movement, open Move destination in the inspector. Advance instead orders an attack.' },
  { title: 'Hold the line', text: 'Hold stops the selected formation. It fires automatically when an enemy is in range and reload is ready. Use Range to inspect its reach; repeated Volley orders do not reload faster.' },
  { title: 'Commit a reserve', text: 'Keep an uncommitted formation behind the line. Select it and confirm a move when the front needs support, rather than advancing every formation at once.' },
]);

export function createBattleGuide(seen, results = {}) {
  return { open: !seen && Object.keys(results || {}).length === 0, step: 0 };
}

export function battleGuideReducer(state, action) {
  switch (action) {
    case 'open': return { ...state, open: true };
    case 'dismiss': return { ...state, open: false };
    case 'back': return { ...state, step: Math.max(0, state.step - 1) };
    case 'next': return state.step === BATTLE_GUIDE_STEPS.length - 1
      ? { ...state, open: false }
      : { ...state, step: state.step + 1 };
    default: return state;
  }
}

export function guideSpeed(guide, speed) {
  return guide.open ? 0 : speed;
}

export function reserveGuidance(formations, time = 0) {
  if (!formations?.length) return 'The roster will show reserves and reinforcement arrivals when the field is ready.';
  const friendly = formations.filter((unit) => unit.side === 'confederate' && !['broken', 'routing'].includes(unit.status));
  const reserve = friendly.find((unit) => unit.active && (unit.reserve || unit.id.includes('reserve')))
    || friendly.find((unit) => !unit.active && unit.arrivalTime != null);
  if (!reserve) return 'No separate available reserve is marked here; keep an uncommitted formation ready to support the line.';
  return reserve.active
    ? `${reserve.name} is on the field. Select it in the roster when you are ready to commit it.`
    : `${reserve.name} arrives in ${Math.max(0, Math.ceil(reserve.arrivalTime - time))} field minutes. It cannot receive orders before arrival.`;
}
