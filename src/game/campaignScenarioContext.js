import { hasAssessedFieldConsequences } from './fieldResultConsequences.js';

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
const SHILOH_FOLLOWUPS = {
  gettysburg_recognition_crisis: 'Albert Sidney Johnston survived Shiloh and kept the Western army coherent; ',
  southern_independence_1864: 'The Western army held together after Shiloh because Johnston never rode into the kill zone. ',
};
const EMANCIPATION_OPENING = 'After the Maryland Campaign gives Washington a battlefield footing, Lincoln brings the cabinet back to a question he has already been carrying: whether emancipation should now be announced as a war measure.';
const RICHMOND_OPENING = 'The Petersburg line has cracked and Richmond can no longer be defended as a capital, depot, and symbol at the same time.';
const WINCHESTER_OPENING = "Sheridan's army has crossed Opequon Creek and pushed through the crowded Berryville approach.";
const FREDERICKSBURG_WINTER_OPENING = "Burnside's assaults have been smashed against Marye's Heights, and the Army of Northern Virginia stands victorious above the Rappahannock. Yet victory has not solved the Confederacy's real winter problems.";
const ANTIETAM_OPENING = 'Your army is backed against the Potomac River near Sharpsburg.';
const POTOMAC_OPENING = 'Victory at Second Manassas has not yet funneled you into the historical killing ground at Sharpsburg.';
const FIVE_FORKS_RICHMOND_OPENINGS = {
  option_a: 'Pickett’s line bought time at Five Forks. Lee still has to evacuate Richmond as the Petersburg defenses give way.',
  option_b: 'The rear guard at Five Forks bought time for an organized withdrawal. Lee must use that breathing room to evacuate Richmond.',
  option_c: 'Pickett’s troops left Five Forks in order. Lee still has an organized force as he faces the evacuation of Richmond.',
};

export function getCampaignScenarioContext(state, scenario) {
  if (scenario?.id === 'fredericksburg_winter_politics' && scenario.description?.startsWith(FREDERICKSBURG_WINTER_OPENING)) {
    const previous = state?.history?.findLast(entry => entry.scenarioId === 'fredericksburg_field');
    const field = previous?.battleResult;
    if (field?.scenarioId === 'fredericksburg_field' && field.choiceId === previous.choiceId && hasAssessedFieldConsequences(field)) {
      const succeeded = previous.choiceSucceeded === true;
      const opening = succeeded
        ? field.choiceId === 'option_a' ? 'The line held at Marye’s Heights.' : 'The reserve steadied the line at Prospect Hill.'
        : 'The Fredericksburg field operation fell short.';
      const setback = {
        option_a: {
          text: 'Prepare a winter stroke while both armies regroup on the Rappahannock.',
          consequence: 'Richmond presses for another operation after a difficult field result. The army regains some confidence, but winter roads and shortages make the effort expensive.',
        },
        option_c: {
          text: 'Publicize the cost of the fighting, press for prisoner exchange, and widen Northern peace agitation.',
          consequence: 'Richmond turns the cost of the fighting into an argument for negotiation. Peace editors and exchange advocates gain material while the military situation remains unsettled.',
        },
      };
      return {
        ...scenario,
        description: scenario.description.replace(FREDERICKSBURG_WINTER_OPENING,
          `${opening} Winter now tests the army and the government behind it.`),
        choices: succeeded ? scenario.choices : scenario.choices.map(choice => setback[choice.id] ? { ...choice, ...setback[choice.id] } : choice),
        advisors: {
          ...scenario.advisors,
          hotspur: succeeded
            ? 'We held the ground we set out to defend. Use that breathing room before the Union recovers.'
            : 'The line fell short of our orders. Regroup before spending the army on another winter operation.',
          fox: 'Use the pause for shoes, rations, and camp discipline. The next campaign will depend on the army we carry through winter.',
        },
      };
    }
  }
  const marylandOpening = scenario?.id === 'antietam' ? ANTIETAM_OPENING
    : scenario?.id === 'potomac_leverage_campaign' ? POTOMAC_OPENING : null;
  if (marylandOpening && scenario.description?.startsWith(marylandOpening)) {
    const previous = state?.history?.findLast(entry => entry.scenarioId === 'second_manassas');
    const field = previous?.battleResult;
    if (field?.scenarioId === 'second_manassas' && field.choiceId === previous.choiceId && hasAssessedFieldConsequences(field)) {
      const opening = previous.choiceSucceeded !== true
        ? 'The Second Manassas field operation fell short. Lee enters Maryland with a more strained army.'
        : field.choiceId === 'option_a'
          ? 'Jackson held the Deep Cut while Longstreet took Chinn Ridge.'
          : 'Longstreet’s reconnaissance kept the line and reserve intact.';
      const description = scenario.id === 'antietam' ? scenario.description
        : scenario.description.replace(POTOMAC_OPENING, 'The campaign in Maryland now diverges from the historical march to Sharpsburg.');
      return { ...scenario, description: `${opening} ${description}` };
    }
  }
  if (scenario?.id === 'third_winchester' && scenario.description?.startsWith(WINCHESTER_OPENING)) {
    const previous = state?.history?.findLast(entry => entry.scenarioId === 'fall_of_atlanta');
    const field = previous?.battleResult;
    if (field?.scenarioId === previous?.scenarioId && field?.choiceId === previous?.choiceId && hasAssessedFieldConsequences(field)) {
      const opening = previous.choiceSucceeded !== true
        ? 'The Jonesborough field operation fell short. Atlanta’s loss adds to the pressure on the Confederacy.'
        : field.choiceId === 'option_a'
          ? 'Hardee briefly reopened the railroad at Jonesborough. The supply window has closed and the focus now shifts to the Shenandoah Valley.'
          : 'Hardee’s force withdrew from Jonesborough in order. With Atlanta evacuated, the focus shifts to Early’s separate army in the Shenandoah Valley.';
      return { ...scenario, description: `${opening} ${scenario.description}` };
    }
  }
  if (scenario?.id === 'richmond_evacuation' && scenario.description?.startsWith(RICHMOND_OPENING)) {
    const previous = state?.history?.findLast(entry => entry.scenarioId === 'five_forks');
    const field = previous?.battleResult;
    if (field?.scenarioId === 'five_forks' && field.choiceId === previous.choiceId && hasAssessedFieldConsequences(field)) {
      const opening = previous.choiceSucceeded === true
        ? FIVE_FORKS_RICHMOND_OPENINGS[previous.choiceId]
        : 'The Five Forks field operation fell short. The Petersburg line is breaking and Lee must evacuate Richmond.';
      return { ...scenario, description: scenario.description.replace(RICHMOND_OPENING, opening) };
    }
  }
  if (scenario?.id === 'emancipation_cabinet_debate' && typeof scenario.description === 'string') {
    const previous = state?.history?.findLast(entry => entry.scenarioId === 'antietam');
    const field = previous?.battleResult;
    if (scenario.description.startsWith(EMANCIPATION_OPENING) && field?.scenarioId === 'antietam'
      && field.choiceId === previous.choiceId && hasAssessedFieldConsequences(field)) {
      const opening = previous.choiceSucceeded === true
        ? field.choiceId === 'option_b'
          ? 'The Confederate army has withdrawn from Antietam in order, ending its Maryland offensive.'
          : 'The Confederate line held the Bloody Lane in your engagement. The Union army remains in the field.'
        : field.result === 'rout'
          ? 'The Confederate line broke at Antietam and its scattered units must regroup.'
          : field.result === 'defeat'
            ? 'The Confederate operation at Antietam ended in defeat.'
            : 'The Antietam engagement ended without the Confederate army meeting its objective.';
      const description = scenario.description.replace(EMANCIPATION_OPENING,
        `${opening} Lincoln returns to a question already before his cabinet: whether to announce emancipation as a war measure.`);
      return { ...scenario, description };
    }
  }
  if (Object.hasOwn(SHILOH_FOLLOWUPS, scenario?.id) && typeof scenario.description === 'string') {
    const previous = state?.history?.findLast(entry => entry.scenarioId === 'shiloh_army_of_tennessee');
    const field = previous?.battleResult;
    if (previous?.choiceId === 'option_b' && previous.choiceSucceeded === false
      && field?.scenarioId === previous.scenarioId && field.commanderStatus === 'protected' && hasAssessedFieldConsequences(field)) {
      const description = scenario.description.replace(SHILOH_FOLLOWUPS[scenario.id],
        'Albert Sidney Johnston survived Shiloh. The command reserve fell short of its field objective. ');
      return { ...scenario, description };
    }
  }
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
