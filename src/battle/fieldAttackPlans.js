// Optional player reference: preview and confirmation are still required.
export const FIELD_ATTACK_PLANS = Object.freeze({
  first_manassas: {
    instruction: "Form a connected line before considering a counterattack on the Union battery line. Elzey arrives at 48 and needs his own orders. Check for routing or wavering troops before confirming a group assault; a fresh reserve cannot restore an already broken front. These staging points are a practice reference, not a guaranteed victory.",
    steps: [
      { id: 'jackson-brigade', label: 'Jackson', x: 520, y: 640 },
      { id: 'bee-evans-line', label: 'Bee and Evans', x: 740, y: 640 },
      { id: 'hampton-reserve', label: 'Hampton', x: 940, y: 640 },
    ],
  },
  shiloh: {
    instruction: "Concentrate toward the open right in Line formation. This approach can breach a defense in depth, but a mobile Union reserve can strike its flank. Check support and formation condition before committing the group; keep room to fall back and recover. These staging points are a practice reference, not a guaranteed victory.",
    steps: [
      { id: 'hardee-corps', label: 'Hardee', x: 1100, y: 370 },
      { id: 'bragg-corps', label: 'Bragg', x: 1260, y: 420 },
      { id: 'polk-corps', label: 'Polk', x: 1430, y: 560 },
      { id: 'breckinridge-reserve', label: 'Breckinridge', x: 1410, y: 390 },
    ],
  },
});

// The v7 attack includes the representative Confederate gun line. Keep older
// rule sets' staging reference unchanged for legacy battles and saved campaigns.
export const MANASSAS_COMBINED_ARMS_PLAN = Object.freeze({
  instruction: "Pin the Union with Henry Hill Batteries while Jackson and Elzey turn its left. Keep Bee and Hampton back as a supporting reserve. Leave the guns on Hold with a clear firing lane; infantry standing in front of them blocks their fire.",
  steps: [
    { id: 'jackson-brigade', label: 'Jackson', x: 450, y: 620 },
    { id: 'bee-evans-line', label: 'Bee and Evans', x: 820, y: 710 },
    { id: 'hampton-reserve', label: 'Hampton', x: 650, y: 760 },
    { id: 'elzey-reinforcement', label: 'Elzey · after 48', x: 340, y: 440 },
  ],
  followUp: "Stage the first three infantry formations in Line before starting. At minute 48, send Elzey to the western approach shown below. While he moves up the flank, order Jackson to Assault the Union battery line. Once Elzey reaches his staging point, order him to Assault it too. Keep Bee and Hampton covering the guns unless the flank needs help; use Fallback if either starts wavering. The original reference aimed to commit Jackson around minutes 60–70. With current formation spacing, Jackson and Elzey can block one another near the western approach. Watch Army attention and reposition a blocked brigade before reissuing Assault; the timed reference alone is not a verified route to victory.",
});

// Current-rule reference keeps the two attacking brigades on separate approaches.
// These are playable-board coordinates, not a reconstruction of historical orders.
export const MANASSAS_CURRENT_ATTACK_PLAN = Object.freeze({
  instruction: "Keep Jackson and Elzey on separate approaches to the Union battery line. Jackson stages to the right of Henry House; Elzey goes around to the upper approach. Bee and Hampton stay back in support, while the batteries remain on Hold with clear fire lanes.",
  steps: [
    { id: 'jackson-brigade', label: 'Jackson · right approach', x: 1030, y: 610 },
    { id: 'bee-evans-line', label: 'Bee and Evans · support', x: 820, y: 710 },
    { id: 'hampton-reserve', label: 'Hampton · reserve', x: 650, y: 760 },
    { id: 'elzey-reinforcement', label: 'Elzey · upper approach', x: 700, y: 230 },
  ],
  followUp: "Before starting, set Jackson, Bee and Hampton to Line, then preview and confirm their staging moves. When Elzey arrives at minute 48, pause and send him to the upper approach. Around minutes 60–65, order Jackson to Assault the Union battery line. When Elzey reaches his approach, order him to Assault the same objective. Let the supporting pair hold for eight uninterrupted minutes once defenders are cleared; do not move a brigade away while the hold timer is building. Watch condition and ammunition, and adapt if an approach becomes blocked.",
});

// Current-rule Shiloh reference: the staging points guide the opening march.
// Commit before all four reach them; waiting for arrival delays the supported push.
export const SHILOH_CURRENT_ATTACK_PLAN = Object.freeze({
  instruction: "Use the open right approach in Line. Hardee and Bragg form the inner pair; Polk and Breckinridge take the outer approach. Keep space between the corps and watch for the Union reserve moving toward the landing.",
  steps: FIELD_ATTACK_PLANS.shiloh.steps,
  followUp: "Before starting, set all four corps to Line, then preview and confirm each staging move. Around field minutes 20–22, pause and review their condition. With the corps still organized, select Pittsburg Landing and order all four to Assault while paused, then resume. The staging points guide the opening march: do not wait for every corps to arrive before reviewing the attack. Buell is scheduled to arrive at minute 72. Once the landing is clear, keep two supporting infantry inside it for eight uninterrupted minutes. Check Army attention if a corps stalls; preview room to turn or a short move before reissuing Assault. Earlier or later orders, weaker supplies and reserve movements can change the result; recover wavering troops instead of blindly following the clock.",
});

export function fieldPlanStepStatus(snapshot, step) {
  const unit = snapshot?.formations?.find(unit => unit.id === step.id);
  if (!unit) return 'Not in this mission';
  if (unit.withdrawn) return 'Left the field';
  if (['routing', 'broken', 'surrendered'].includes(unit.status)) return 'Cannot stage · check formation';
  if (!unit.active) return unit.arrivalTime == null ? 'Unavailable' : snapshot.time >= unit.arrivalTime ? 'Awaiting clear entry' : `Arrives at ${unit.arrivalTime}`;
  const order = unit.pendingCommand;
  if (order?.order === 'move' && Math.hypot(order.point.x-step.x, order.point.y-step.y)<12) return 'Move order en route';
  if (unit.directMove && Math.hypot(unit.target.x-step.x, unit.target.y-step.y)<12) return 'Moving to approach';
  if (unit.order === 'assault' || order?.order === 'assault') return 'Assault committed';
  if (Math.hypot(unit.x-step.x, unit.y-step.y)<12) return 'At approach';
  return 'Select to review';
}

export function fieldAttackPlanFor(battleId, battleRulesVersion) {
  if (battleId === 'shiloh' && battleRulesVersion >= 17) return SHILOH_CURRENT_ATTACK_PLAN;
  if (battleId === 'first_manassas' && battleRulesVersion >= 17) return MANASSAS_CURRENT_ATTACK_PLAN;
  return battleId === 'first_manassas' && battleRulesVersion >= 7 ? MANASSAS_COMBINED_ARMS_PLAN : FIELD_ATTACK_PLANS[battleId];
}
