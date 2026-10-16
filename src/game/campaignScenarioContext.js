// Branch wording derives from recorded decisions. It changes no choice effects,
// route targets, battle results or saved history, including in older snapshots.
const CHANCELLORSVILLE_APPROACHES = {
  option_b: {
    title: 'Chancellorsville — The Compact Line at Dusk',
    opening: 'You refused the split and formed a compact defensive line near Chancellorsville. Jackson remains with the main army as Hooker holds his prepared position.',
  },
  option_c: {
    title: 'Chancellorsville — Feints and Flank Probes at Dusk',
    opening: 'You ordered a cavalry feint toward United States Ford and a flank probe by Jackson. Stuart’s reports and the Wilderness roads now shape where the army can concentrate its next effort.',
  },
  option_d: {
    title: 'Chancellorsville — After the Direct Pressure Attack',
    opening: 'You ordered a direct pressure attack before Hooker completed his entrenchments. Jackson’s corps remains with the main army, and the fighting has strained its formations.',
  },
};

const CHANCELLORSVILLE_FAILED_FLANKS = {
  'disciplined-withdrawal': {
    title: 'Chancellorsville — After the Flank Withdrawal',
    opening: 'You approved Jackson’s concealed flank march, but his corps withdrew in order without securing the intended flank victory. Its surviving formations remain organized while Lee weighs another effort against the need to consolidate the army.',
  },
  defeat: {
    title: 'Chancellorsville — After the Failed Flank Attack',
    opening: 'You approved Jackson’s concealed flank march, but the field attack ended without the intended victory. Jackson’s surviving formations need to recover their order, and Hooker’s army remains a threat.',
  },
  rout: {
    title: 'Chancellorsville — After the Flank Rout',
    opening: 'You approved Jackson’s concealed flank march, but the attack collapsed into a rout. Jackson’s scattered survivors need to regain contact with the main army before Lee can consider another effort against Hooker.',
  },
};

const CHANCELLORSVILLE_ORDERS = {
  option_a: {
    text: 'Commit Jackson’s corps to renewed pressure on Hooker’s prepared line before darkness ends the opportunity.',
    costDescription: 'High combat cost; seek another opening against the prepared Union line.',
    consequence: 'Jackson’s formations spend men and ammunition renewing pressure on Hooker’s position. The attack seeks to dislodge the Union line before the army loses the remaining light.',
  },
  option_b: {
    text: 'Keep Jackson at headquarters after dusk, consolidate the army, and plan the next campaign.',
    costDescription: 'Preserves strength and keeps Jackson out of a night reconnaissance; he remains available for the next campaign.',
    consequence: 'Jackson stays at headquarters while his formations regain order. The army carries its surviving commands into the next operation with Jackson ready to plan and lead.',
  },
  option_c: {
    text: 'Send dispatches explaining the chosen approach and the battle’s outcome to Europe and Northern peace editors.',
    costDescription: 'Treasury cost and diplomatic divergence; publicize the campaign’s condition and prospects.',
    consequence: 'Dispatches carry the army’s account of its operations and condition to foreign observers and peace editors. The argument seeks political support while commanders prepare the next move.',
  },
  option_d: {
    text: 'Use cavalry and local guides to screen the fords and secure the army’s supply routes.',
    costDescription: 'Operational divergence and supply gain; detached troops thin the main position.',
    consequence: 'Cavalry and guides watch the fords, protect supply routes and report movements near the crossings. Their assignment supports the army’s position while detached troops thin the main line.',
  },
};

const FIELD_RESULTS = new Set(['decisive-win', 'costly-win', 'disciplined-withdrawal', 'defeat', 'rout']);

export function getCampaignScenarioContext(state, scenario) {
  if (scenario?.id !== 'chancellorsville_aftermath') return scenario;
  const previous = state?.history?.findLast(entry => entry.scenarioId === 'chancellorsville_maneuver');
  const fieldResult = previous?.battleResult?.result;
  const approach = previous?.choiceId === 'option_a'
    ? FIELD_RESULTS.has(fieldResult) && CHANCELLORSVILLE_FAILED_FLANKS[fieldResult]
    : CHANCELLORSVILLE_APPROACHES[previous?.choiceId];
  if (!approach) return scenario;
  const outcome = FIELD_RESULTS.has(fieldResult)
    ? ` The fighting ended in a ${fieldResult.replaceAll('-', ' ')}.`
    : '';
  return {
    ...scenario,
    title: approach.title,
    description: `${approach.opening}${outcome} In this alternate campaign, darkness and the Wilderness roads threaten command control. Decide whether to renew pressure, consolidate Jackson’s corps, send dispatches or secure the crossings.`,
    choices: scenario.choices.map(choice => ({ ...choice, ...CHANCELLORSVILLE_ORDERS[choice.id] })),
  };
}
