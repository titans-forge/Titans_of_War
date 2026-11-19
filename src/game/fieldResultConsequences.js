// A per-result policy boundary keeps completed journals and earlier tactical
// rules unchanged. Only applyBattleResolution opts a genuinely new result in.
const MANASSAS = 'manassas_battlefield';
const SHILOH = 'shiloh_army_of_tennessee';
const ANTIETAM = 'antietam';
const FIVE_FORKS = 'five_forks';
const ATLANTA = 'fall_of_atlanta';
const SECOND_MANASSAS = 'second_manassas';
const FREDERICKSBURG = 'fredericksburg_field';
const SEVEN_DAYS = 'seven_days';
const NEW_MARKET = 'new_market';
const MISSIONARY_RIDGE = 'missionary_ridge';
const SPOTSYLVANIA = 'spotsylvania';
const KENNESAW_MOUNTAIN = 'kennesaw_mountain';
const VICKSBURG = 'vicksburg';
const SAILORS_CREEK = 'sailors_creek';
const POLICY_VERSIONS = { cedar_creek: 1, third_winchester: 1, [MANASSAS]: 2, [SHILOH]: 2, [ANTIETAM]: 1, [FIVE_FORKS]: 1, [ATLANTA]: 1, [SECOND_MANASSAS]: 1, [FREDERICKSBURG]: 1, [SEVEN_DAYS]: 1, [NEW_MARKET]: 1, [MISSIONARY_RIDGE]: 1, [SPOTSYLVANIA]: 1, [KENNESAW_MOUNTAIN]: 1, [VICKSBURG]: 1, [SAILORS_CREEK]: 1 };
const WINS = new Set(['decisive-win', 'costly-win']);
const LOSSES = new Set(['defeat', 'rout']);
const RESULTS = new Set([...WINS, ...LOSSES, 'disciplined-withdrawal']);

export const CEDAR_CREEK_ELECTION_FIELD_REQUIREMENTS = [
  { scenarioId: 'cedar_creek', choiceId: 'option_a', fieldResultRequirement: 'field-victory', label: 'Cedar Creek — Confederate field victory' },
  { scenarioId: 'cedar_creek', choiceId: 'option_c', fieldResultRequirement: 'ordered-supply-withdrawal', label: 'Cedar Creek — organized withdrawal with prisoners and supply' },
];

export function fieldConsequencesVersion(state, scenarioId) {
  if (state?.rulesVersion !== 2 || !(state.battleRulesVersion >= 18)) return null;
  return Object.hasOwn(POLICY_VERSIONS, scenarioId) ? POLICY_VERSIONS[scenarioId] : null;
}

export function usesManassasFieldConsequences(state, scenarioId) {
  return scenarioId === MANASSAS && fieldConsequencesVersion(state, scenarioId) === POLICY_VERSIONS[MANASSAS];
}

const FIELD_MISSIONS = {
  [ANTIETAM]: { battleId: 'antietam', outcomes: { option_a: 'costly-win', option_b: 'disciplined-withdrawal' } },
  [FIVE_FORKS]: { battleId: 'five_forks', outcomes: { option_a: 'costly-win', option_b: 'disciplined-withdrawal', option_c: 'disciplined-withdrawal' } },
  [ATLANTA]: { battleId: 'jonesborough', outcomes: { option_a: 'costly-win', option_b: 'disciplined-withdrawal' } },
  [SECOND_MANASSAS]: { battleId: SECOND_MANASSAS, outcomes: { option_a: 'costly-win', option_b: 'costly-win' } },
  [FREDERICKSBURG]: { battleId: 'fredericksburg', outcomes: { option_a: 'costly-win', option_b: 'costly-win' } },
  [SEVEN_DAYS]: { battleId: 'gaines_mill', outcomes: { option_a: 'costly-win' } },
  [NEW_MARKET]: { battleId: NEW_MARKET, outcomes: { option_a: 'costly-win', option_b: 'costly-win' } },
  [MISSIONARY_RIDGE]: { battleId: MISSIONARY_RIDGE, outcomes: { option_a: 'costly-win', option_b: 'disciplined-withdrawal' } },
  [SPOTSYLVANIA]: { battleId: SPOTSYLVANIA, outcomes: { option_a: 'costly-win', option_b: 'costly-win' } },
  [KENNESAW_MOUNTAIN]: { battleId: KENNESAW_MOUNTAIN, outcomes: { option_a: 'costly-win', option_b: 'disciplined-withdrawal' } },
  [VICKSBURG]: { battleId: VICKSBURG, outcomes: { option_a: 'costly-win', option_b: 'disciplined-withdrawal' } },
  [SAILORS_CREEK]: { battleId: SAILORS_CREEK, outcomes: { option_a: 'costly-win', option_b: 'disciplined-withdrawal' } },
};

export const isChoiceGatedField = scenarioId => Object.hasOwn(FIELD_MISSIONS, scenarioId);
export const fieldMissionRules = scenarioId => isChoiceGatedField(scenarioId) ? FIELD_MISSIONS[scenarioId] : null;

export function usesAssessedFieldConsequences(state, scenarioId, choiceId) {
  return usesManassasFieldConsequences(state, scenarioId)
    || (scenarioId === SHILOH && fieldConsequencesVersion(state, scenarioId) !== null)
    || (isChoiceGatedField(scenarioId) && fieldConsequencesVersion(state, scenarioId) !== null
      && (choiceId === undefined || Object.hasOwn(FIELD_MISSIONS[scenarioId].outcomes, choiceId)));
}

export function hasFieldResultConsequences(result) {
  const mission = fieldMissionRules(result?.scenarioId);
  return Object.hasOwn(POLICY_VERSIONS, result?.scenarioId)
    && result.fieldResultConsequencesVersion === POLICY_VERSIONS[result.scenarioId]
    && RESULTS.has(result.result)
    && (!mission || (result.battleId === mission.battleId
      && Object.hasOwn(mission.outcomes, result.choiceId)
      && (result.battleRulesVersion === undefined || result.battleRulesVersion >= 18)));
}

export function hasAssessedFieldConsequences(result) {
  return (result?.scenarioId === MANASSAS || result?.scenarioId === SHILOH || isChoiceGatedField(result?.scenarioId))
    && hasFieldResultConsequences(result);
}

function missionSucceeded(field, choiceId) {
  const mission = fieldMissionRules(field.scenarioId);
  if (mission) {
    const accepted = field.result === mission.outcomes[choiceId];
    return accepted && field.choiceId === choiceId && field.assessment?.objective?.id === `${field.battleId}:${choiceId}`
      && field.assessment.objective.status === 'achieved';
  }
  if (field.scenarioId === SHILOH) {
    const withdrew = field.result === 'disciplined-withdrawal';
    const protectedCommander = field.commanderStatus === 'protected';
    const accepted = choiceId === 'option_b' ? protectedCommander && (withdrew || WINS.has(field.result))
      : choiceId === 'option_d' ? protectedCommander && withdrew : WINS.has(field.result);
    return accepted && field.assessment?.objective?.id === `shiloh:${choiceId}`
      && field.assessment.objective.status === 'achieved';
  }
  const withdrawal = field.scenarioId === MANASSAS ? choiceId === 'option_c' : field.scenarioId === 'cedar_creek'
    ? ['option_c', 'option_d'].includes(choiceId)
    : ['option_b', 'option_d'].includes(choiceId);
  const accepted = withdrawal ? field.result === 'disciplined-withdrawal' : WINS.has(field.result);
  if (field.scenarioId !== MANASSAS) return accepted;
  return accepted && field.assessment?.objective?.id === `first_manassas:${choiceId}`
    && field.assessment.objective.status === 'achieved';
}

function resolveManassas(field, choice) {
  const choiceSucceeded = missionSucceeded(field, choice.id);
  const order = choice.effects || choice.successEffects;
  // The common field settlement already applies the army and morale impact
  // of the verdict. The decision pays for the operation and cabinet response.
  const { munitions, treasury, divergenceIndex } = order.metrics;
  const metrics = {
    ...(munitions === undefined ? {} : { munitions }),
    ...(choiceSucceeded && treasury !== undefined ? { treasury } : {}),
    ...(choiceSucceeded && divergenceIndex !== undefined ? { divergenceIndex } : {}),
    ...(choice.id === 'option_c' ? { publicMorale: order.metrics.publicMorale } : {}),
  };
  const response = choiceSucceeded || choice.id === 'option_c' ? order.shards
    : choice.failureEffects?.shards || {};

  const outcome = {
    'decisive-win': 'Confederate forces won a decisive victory at First Manassas.',
    'costly-win': 'Confederate forces won a limited victory at First Manassas.',
    'disciplined-withdrawal': 'The army left First Manassas in order, conceding the ground while preserving an organized force.',
    defeat: 'The Confederate operation at First Manassas ended in field defeat.',
    rout: 'The Confederate line at First Manassas broke into a rout.',
  }[field.result];
  const achievement = {
    option_a: 'The counterattack secured its objective.',
    option_b: 'The defense of Henry Hill met its objective.',
    option_c: 'The withdrawal met its preservation objective.',
    option_d: 'The diversion earned the field result required by the selected plan.',
  }[choice.id];
  const progress = field.assessment?.objective?.status === 'partial'
    ? 'The selected mission made partial progress and remained incomplete.'
    : 'The selected mission was not achieved.';
  const reaction = choice.id === 'option_c' ? ' Choosing to yield ground also cost confidence on the home front.' : '';
  return {
    choiceSucceeded,
    effects: { metrics, shards: { ...response } },
    consequence: `${field.delegated ? 'Staff estimate. ' : ''}${outcome} ${choiceSucceeded ? achievement : progress}${reaction}`,
  };
}

function resolveShiloh(field, choice) {
  const choiceSucceeded = missionSucceeded(field, choice.id);
  const order = choice.effects;
  // The field verdict has already settled the army and battlefield morale.
  // The campaign order adds its commitments and any earned strategic return.
  const decisiveAssault = field.result === 'decisive-win' && field.commanderStatus !== 'mortally wounded';
  const metrics = {};
  for (const [key, value] of Object.entries(order.metrics)) {
    if (key === 'militaryStrength') continue;
    const fullAssaultMorale = key === 'publicMorale' && choice.id === 'option_a';
    if (value < 0 || (choiceSucceeded && (!fullAssaultMorale || decisiveAssault))) metrics[key] = value;
  }

  const preserved = field.assessment?.evidence?.some(item => item.label === 'Field outcome' && item.value === 'Army preserved through the mission');
  const outcome = {
    'decisive-win': 'Confederate forces won a decisive victory at Shiloh.',
    'costly-win': 'Confederate forces won a limited victory at Shiloh.',
    'disciplined-withdrawal': preserved
      ? 'The army stayed organized through the Shiloh engagement.'
      : 'The army withdrew from Shiloh in order.',
    defeat: 'The Confederate operation at Shiloh ended in field defeat.',
    rout: 'The Confederate line at Shiloh broke into a rout.',
  }[field.result];
  const achievement = {
    option_a: 'The attack met its field objective.',
    option_b: 'The command reserve met its preservation objective.',
    option_c: 'The field success strengthened the case for mediation dispatches.',
    option_d: 'The army preserved its force for depot and crossing duties.',
  }[choice.id];
  const progress = field.assessment?.objective?.status === 'partial'
    ? 'The selected mission remained incomplete after partial progress.'
    : 'The selected mission fell short.';
  const commander = {
    'mortally wounded': 'Albert Sidney Johnston was mortally wounded.',
    exposed: 'Albert Sidney Johnston remained exposed during the engagement.',
    protected: 'Albert Sidney Johnston remained protected during the engagement.',
    distracted: 'Albert Sidney Johnston’s attention was divided during the engagement.',
  }[field.commanderStatus];
  const dispatch = choice.id === 'option_c' && !choiceSucceeded
    ? 'The Treasury still paid for the dispatch effort.' : '';
  return {
    choiceSucceeded,
    effects: { metrics, shards: { ...order.shards } },
    consequence: [field.delegated && 'Staff estimate.', outcome, choiceSucceeded ? achievement : progress, commander, dispatch]
      .filter(Boolean).join(' '),
  };
}

function resolveAntietam(field, choice) {
  const choiceSucceeded = missionSucceeded(field, choice.id);
  const order = choice.effects;
  const withdrawing = choice.id === 'option_b';
  // Common field effects settle army strength and battlefield morale. The
  // campaign effects cover ammunition committed or the cost of giving ground.
  const metrics = withdrawing
    ? { publicMorale: order.metrics.publicMorale, ...(choiceSucceeded ? { treasury: order.metrics.treasury } : {}) }
    : { munitions: order.metrics.munitions };
  const consequence = choiceSucceeded
    ? withdrawing
      ? 'The army withdrew in order from the Antietam field and preserved its organized formations. Ending the Maryland offensive costs confidence at home.'
      : 'The Confederate line held the Bloody Lane against the Union attack in this engagement. The local success leaves the wider campaign unresolved.'
    : field.result === 'rout'
      ? 'The Confederate line broke into a rout at Antietam. The selected objective went unmet.'
      : field.result === 'defeat'
        ? 'The operation ended in field defeat at Antietam. The selected objective went unmet.'
        : 'The field engagement ended without meeting the selected objective at Antietam.';
  return {
    choiceSucceeded,
    effects: { metrics, shards: { ...order.shards } },
    consequence: `${field.delegated ? 'Staff estimate. ' : ''}${consequence}`,
  };
}

const FIVE_FORKS_SUCCESSES = {
  option_a: 'Pickett’s line held the crossroads and the Angle long enough to slow the advance. The railroad is still in danger.',
  option_b: 'The rear guard held Ford’s Road under pressure, then drew off in order. Pickett concedes the crossroads and buys Lee time to organize the evacuation.',
  option_c: 'Pickett’s troops left in order, saving the force and recovering some ammunition. The Union gains the crossroads without a prolonged fight.',
};

function resolveFiveForks(field, choice) {
  const choiceSucceeded = missionSucceeded(field, choice.id);
  const order = choice.effects;
  const metrics = choice.id === 'option_c'
    ? { publicMorale: order.metrics.publicMorale, ...(choiceSucceeded ? { munitions: order.metrics.munitions } : {}) }
    : { munitions: order.metrics.munitions, ...(choiceSucceeded && choice.id === 'option_b'
      ? { divergenceIndex: order.metrics.divergenceIndex } : {}) };
  const consequence = choiceSucceeded ? FIVE_FORKS_SUCCESSES[choice.id]
    : field.result === 'rout' ? 'The line broke at Five Forks. Survivors fall back as the Union gains the approaches to the railroad.'
      : 'Pickett’s command fell short of its objective at Five Forks. Union pressure on the railroad leaves Petersburg exposed.';
  return {
    choiceSucceeded,
    effects: { metrics, shards: { ...order.shards } },
    consequence: `${field.delegated ? 'Staff estimate. ' : ''}${consequence}`,
  };
}

function resolveJonesborough(field, choice) {
  const choiceSucceeded = missionSucceeded(field, choice.id);
  const withdrawing = choice.id === 'option_b';
  const order = choice.effects || choice.successEffects;
  const metrics = withdrawing
    ? { publicMorale: order.metrics.publicMorale, ...(choiceSucceeded ? { munitions: order.metrics.munitions } : {}) }
    : { munitions: order.metrics.munitions, ...(choiceSucceeded
      ? { publicMorale: 10, divergenceIndex: order.metrics.divergenceIndex } : { publicMorale: -8 }) };
  const success = withdrawing
    ? 'Hardee’s columns reached the road toward Lovejoy’s Station in order. The army preserves guns and ammunition as Hood abandons Atlanta.'
    : 'Hardee held the crossing long enough to reopen the railroad briefly and move stores. The Union armies remain in Georgia, and Atlanta is still exposed.';
  const failure = withdrawing
    ? 'Hardee’s command failed to bring out the required strength and guns in order. Hood still evacuates Atlanta, with fewer resources for the next campaign.'
    : 'The counterattack failed to hold the crossing. The railroad stays cut and Hood must evacuate Atlanta.';
  return {
    choiceSucceeded,
    effects: { metrics, shards: { ...(!choiceSucceeded && choice.failureEffects ? choice.failureEffects : order).shards } },
    consequence: `${field.delegated ? 'Staff estimate. ' : ''}${choiceSucceeded ? success : failure}`,
  };
}

function resolveSecondManassas(field, choice) {
  const choiceSucceeded = missionSucceeded(field, choice.id);
  const flank = choice.id === 'option_a';
  const publicMorale = choiceSucceeded ? (flank ? 18 : 6) : -6;
  const consequence = choiceSucceeded
    ? flank
      ? 'Jackson held the Deep Cut while Longstreet took Chinn Ridge. The two wings secured the field objectives and put Pope under pressure.'
      : 'Longstreet’s reconnaissance kept the line and reserve intact. Pope’s army remained able to disengage.'
    : flank
      ? 'The two wings failed to secure the Deep Cut and Chinn Ridge together. Pope’s army escaped the intended trap.'
      : 'The reconnaissance fell short. The line or its covering reserve was unable to hold the required position under pressure.';
  return {
    choiceSucceeded,
    effects: { metrics: { munitions: choice.effects.metrics.munitions, publicMorale }, shards: { ...choice.effects.shards } },
    consequence: `${field.delegated ? 'Staff estimate. ' : ''}${consequence}`,
  };
}

function resolveFredericksburg(field, choice) {
  const choiceSucceeded = missionSucceeded(field, choice.id);
  const maryesHeights = choice.id === 'option_a';
  const consequence = choiceSucceeded
    ? maryesHeights
      ? 'The line held at Marye’s Heights under successive Union attacks. The army still has to replace supplies and rest its men over winter.'
      : 'The reserve steadied the line at Prospect Hill and checked the Union advance there. The fighting has taken a toll on Jackson’s troops.'
    : maryesHeights
      ? 'The Sunken Road defense fell short. The army enters winter with an exposed line and less confidence.'
      : 'The reserve failed to secure the threatened sector at Prospect Hill. The army enters winter under greater pressure.';
  return {
    choiceSucceeded,
    effects: {
      metrics: { ...choice.effects.metrics, publicMorale: choiceSucceeded ? choice.effects.metrics.publicMorale : -5 },
      shards: { ...choice.effects.shards },
    },
    consequence: `${field.delegated ? 'Staff estimate. ' : ''}${consequence}`,
  };
}

function resolveGainesMill(field, choice) {
  const choiceSucceeded = missionSucceeded(field, choice.id);
  const consequence = choiceSucceeded
    ? 'The assault crossed the ravine and opened a breach in Porter’s line. The Union position is under pressure, and the fighting around Richmond continues.'
    : 'The attacking formations failed to secure a supported foothold beyond Boatswain’s Creek. Porter’s line holds in this engagement and the offensive loses momentum.';
  return {
    choiceSucceeded,
    effects: {
      metrics: { munitions: choice.effects.metrics.munitions, publicMorale: choiceSucceeded ? 16 : -7 },
      shards: { ...choice.effects.shards },
    },
    consequence: `${field.delegated ? 'Staff estimate. ' : ''}${consequence}`,
  };
}

function resolveNewMarket(field, choice) {
  const choiceSucceeded = missionSucceeded(field, choice.id);
  const advance = choice.id === 'option_a';
  const choiceEffects = advance ? (choiceSucceeded ? choice.successEffects : choice.failureEffects) : choice.effects;
  const foodSupply = advance || choiceSucceeded ? choiceEffects.metrics.foodSupply : -6;
  const consequence = choiceSucceeded
    ? advance
      ? 'The cadets helped the regular infantry secure the farm approach. The army can move its supplies through the Valley again.'
      : 'The regulars held the Valley Pike with the cadets in reserve. The road stays open for the army’s supply wagons.'
    : advance
      ? 'The farm advance fell short. The army loses supplies when wagons cannot get through.'
      : 'The pike defense fell short of its objective. The army moves fewer supplies south through the Valley.';
  return {
    choiceSucceeded,
    effects: {
      // The battle ledger accounts for losses. This decision settles the wagons and cabinet response.
      metrics: { munitions: advance ? choice.successEffects.metrics.munitions : choiceEffects.metrics.munitions,
        foodSupply, publicMorale: choiceSucceeded ? (advance ? 18 : 10) : (advance ? -8 : -5),
        ...(choiceSucceeded && advance ? { divergenceIndex: choiceEffects.metrics.divergenceIndex } : {}) },
      shards: { ...(!advance && !choiceSucceeded ? { fox: -8 } : choiceEffects.shards) },
    },
    consequence: `${field.delegated ? 'Staff estimate. ' : ''}${consequence}`,
  };
}

function resolveMissionaryRidge(field, choice) {
  const choiceSucceeded = missionSucceeded(field, choice.id);
  const holding = choice.id === 'option_a';
  const consequence = choiceSucceeded
    ? holding
      ? 'The local crest defense bought time for wagons to clear the rear. The Confederates still leave the ridge, and Chattanooga stays in Union hands.'
      : 'The rear guard held long enough for troops and wagons to leave in order. The Union holds Chattanooga as Bragg’s army falls back toward Georgia.'
    : holding
      ? 'The crest defense fell short, and some wagons were lost in the retreat. The Union holds Chattanooga.'
      : 'The rear guard failed to organize the withdrawal, and stores were left behind. The Union holds Chattanooga.';
  const { munitions } = choice.effects.metrics;
  return {
    choiceSucceeded,
    effects: {
      metrics: choiceSucceeded ? { ...choice.effects.metrics }
        : { munitions, foodSupply: holding ? -7 : -4, publicMorale: holding ? -7 : -6 },
      shards: choiceSucceeded ? { ...choice.effects.shards } : { [choice.proposer]: -5 },
    },
    consequence: `${field.delegated ? 'Staff estimate. ' : ''}${consequence}`,
  };
}

function resolveSpotsylvania(field, choice) {
  const choiceSucceeded = missionSucceeded(field, choice.id);
  const interior = choice.id === 'option_a';
  const consequence = choiceSucceeded
    ? interior
      ? 'Infantry and guns held the shorter line. The army gets more of its wagons and stores away from the exposed salient.'
      : 'The counterstroke regained a section of the West Face and slowed the Union advance. The reserve is still organized when the army falls back to the shorter line.'
    : interior
      ? 'The shorter line failed to hold on the assigned front. More stores are lost as the defenders fall back.'
      : 'The counterstroke failed to stabilize the West Face. The army spends ammunition and loses stores in the fighting.';
  return {
    choiceSucceeded,
    effects: {
      metrics: choiceSucceeded ? { ...choice.effects.metrics }
        : { munitions: choice.effects.metrics.munitions, foodSupply: interior ? -3 : -6, publicMorale: interior ? -6 : -9 },
      shards: choiceSucceeded ? { ...choice.effects.shards } : { [choice.proposer]: -5 },
    },
    consequence: `${field.delegated ? 'Staff estimate. ' : ''}${consequence}`,
  };
}

function resolveKennesawMountain(field, choice) {
  const choiceSucceeded = missionSucceeded(field, choice.id);
  const hold = choice.id === 'option_a';
  const consequence = choiceSucceeded
    ? hold
      ? 'The line held the Dead Angle under pressure and bought time for wagons to clear. Sherman’s army is still moving toward Atlanta.'
      : 'The battery cleared the Southern Road under cover. The rear guard followed in order, and the army kept more of its stores.'
    : hold
      ? 'The defense fell short at the Dead Angle, costing supplies as the army prepared for the next moves toward Atlanta.'
      : 'The Southern Road order fell short, and the withdrawal left guns or stores behind.';
  return {
    choiceSucceeded,
    effects: {
      metrics: choiceSucceeded ? { ...choice.effects.metrics }
        : { munitions: choice.effects.metrics.munitions, foodSupply: hold ? -5 : -7, publicMorale: hold ? -7 : -5 },
      shards: choiceSucceeded ? { ...choice.effects.shards } : { [choice.proposer]: -5 },
    },
    consequence: `${field.delegated ? 'Staff estimate. ' : ''}${consequence}`,
  };
}

function resolveVicksburg(field, choice) {
  const choiceSucceeded = missionSucceeded(field, choice.id);
  const retake = choice.id === 'option_a';
  const consequence = choiceSucceeded
    ? retake
      ? 'Waul’s infantry cleared the Railroad Redoubt and held it against renewed pressure. Grant settled in for a siege.'
      : 'The battery reached the Interior Line under cover and the infantry rejoined it in order. The garrison saved supplies for the siege.'
    : retake
      ? 'The counterattack could not hold the redoubt. The local fighting cost supplies and confidence as the siege began.'
      : 'The fallback failed to bring the guns and infantry together in good order. Fewer stores remained for the siege.';
  return {
    choiceSucceeded,
    effects: {
      metrics: choiceSucceeded ? { ...choice.effects.metrics }
        : { munitions: choice.effects.metrics.munitions, foodSupply: retake ? -4 : -7, publicMorale: retake ? -8 : -6 },
      shards: choiceSucceeded ? { ...choice.effects.shards } : { [choice.proposer]: -5 },
    },
    consequence: `${field.delegated ? 'Staff estimate. ' : ''}${consequence}`,
  };
}

function resolveSailorsCreek(field, choice) {
  const choiceSucceeded = missionSucceeded(field, choice.id);
  const aid = choice.id === 'option_a';
  const consequence = choiceSucceeded
    ? aid
      ? 'The screen held long enough for the escort to secure the aid route. The wider retreat continued toward Appomattox.'
      : 'The lead formations and rear guard got away in order, preserving some supplies for the last march.'
    : aid
      ? 'The escort lost its screen and the aid route could not be secured.'
      : 'The withdrawal fell short and the retreating formations lost supplies.';
  return {
    choiceSucceeded,
    effects: {
      metrics: choiceSucceeded ? { ...choice.effects.metrics } : aid
        ? { munitions: choice.effects.metrics.munitions, publicMorale: -4 }
        : { munitions: choice.effects.metrics.munitions, foodSupply: -4, publicMorale: -6 },
      shards: choiceSucceeded ? { ...choice.effects.shards } : { [choice.proposer]: -4 },
    },
    consequence: `${field.delegated ? 'Staff estimate. ' : ''}${consequence}`,
  };
}

export function resolveFieldResultConsequences(state, scenarioId, choice) {
  const field = state?.battleCampaign?.results?.[scenarioId];
  if (!choice || !fieldConsequencesVersion(state, scenarioId) || !hasFieldResultConsequences(field)) return null;
  if (scenarioId === MANASSAS) return resolveManassas(field, choice);
  if (scenarioId === SHILOH) return resolveShiloh(field, choice);
  if (scenarioId === ANTIETAM) return field.choiceId === choice.id ? resolveAntietam(field, choice) : null;
  if (scenarioId === FIVE_FORKS) return field.choiceId === choice.id ? resolveFiveForks(field, choice) : null;
  if (scenarioId === ATLANTA) return field.choiceId === choice.id ? resolveJonesborough(field, choice) : null;
  if (scenarioId === SECOND_MANASSAS) return field.choiceId === choice.id ? resolveSecondManassas(field, choice) : null;
  if (scenarioId === FREDERICKSBURG) return field.choiceId === choice.id ? resolveFredericksburg(field, choice) : null;
  if (scenarioId === SEVEN_DAYS) return field.choiceId === choice.id ? resolveGainesMill(field, choice) : null;
  if (scenarioId === NEW_MARKET) return field.choiceId === choice.id ? resolveNewMarket(field, choice) : null;
  if (scenarioId === MISSIONARY_RIDGE) return field.choiceId === choice.id ? resolveMissionaryRidge(field, choice) : null;
  if (scenarioId === SPOTSYLVANIA) return field.choiceId === choice.id ? resolveSpotsylvania(field, choice) : null;
  if (scenarioId === KENNESAW_MOUNTAIN) return field.choiceId === choice.id ? resolveKennesawMountain(field, choice) : null;
  if (scenarioId === VICKSBURG) return field.choiceId === choice.id ? resolveVicksburg(field, choice) : null;
  if (scenarioId === SAILORS_CREEK) return field.choiceId === choice.id ? resolveSailorsCreek(field, choice) : null;
  const result = field.result;
  const choiceSucceeded = missionSucceeded(field, choice.id);
  const baseMetrics = choice.effects?.metrics || {};
  const effects = { metrics: { ...baseMetrics }, shards: { ...choice.effects?.shards } };
  let consequence;

  if (LOSSES.has(result)) {
    // Cedar's field ledger already applies army casualties. Its campaign adds
    // lost stores and confidence, never the authored victory's recovered train.
    if (scenarioId === 'cedar_creek') {
      effects.metrics = {
        militaryStrength: 0,
        munitions: baseMetrics.munitions || 0,
        ...(baseMetrics.treasury ? { treasury: baseMetrics.treasury } : {}),
        publicMorale: result === 'rout' ? -10 : -6,
        foodSupply: result === 'rout' ? -16 : -8,
      };
      effects.shards = choice.proposer === 'sovereign' ? { fox: -6, wolf: -4 } : { [choice.proposer]: -8 };
    }
    consequence = scenarioId === 'cedar_creek'
      ? result === 'rout'
        ? 'The Cedar Creek operation collapses into a rout. Sheridan holds the field, the Confederate columns scatter, and captured wagons and food are abandoned. Richmond receives a battlefield defeat, not the political victory it sought.'
        : 'The Cedar Creek operation ends in a field defeat. Sheridan retains the battlefield, the Confederate survivors fall back, and the intended recovery of prisoners, wagons, and food is not secured. The failed operation gives Richmond no battlefield victory to use in the election campaign.'
      : result === 'rout'
        ? 'The Third Winchester operation ends in a rout. Sheridan takes the field as the Confederate line scatters; the ordered escape and its promised preservation are not achieved. Stores and the lower Valley supply roads are lost.'
        : 'The Third Winchester operation ends in a field defeat. Sheridan takes the battlefield, and the surviving Confederate columns fall back without completing the selected field mission. The intended defense or covered escape does not earn battlefield success credit.';
    if (scenarioId === 'third_winchester' && choice.id === 'option_c') {
      // The authored independent publicity action is not a field victory.
      consequence += ' Political messages still circulate among supporters, but those reports neither reverse the defeat nor secure the Valley.';
    }
  } else if (result === 'disciplined-withdrawal') {
    if (choiceSucceeded) {
      consequence = choice.consequence;
    } else {
      if (scenarioId === 'cedar_creek') {
        effects.metrics = { militaryStrength: 0, munitions: baseMetrics.munitions || 0,
          ...(baseMetrics.treasury ? { treasury: baseMetrics.treasury } : {}), publicMorale: -4, foodSupply: -4 };
      }
      consequence = `The army withdraws in order from ${scenarioId === 'cedar_creek' ? 'Cedar Creek' : 'Third Winchester'}, preserving an organized force while conceding the battlefield. The selected attack or defense did not win the field; the orderly exit does not establish the promised capture of stores or a Confederate battlefield victory.`;
    }
  } else if (scenarioId === 'cedar_creek') {
    const decisive = result === 'decisive-win';
    effects.metrics = { militaryStrength: decisive ? 4 : 0, munitions: baseMetrics.munitions || 0,
      publicMorale: decisive ? 30 : 12, foodSupply: decisive ? 22 : 10, divergenceIndex: decisive ? 0.16 : 0.06 };
    consequence = decisive
      ? 'The Cedar Creek field command wins a decisive Confederate victory. The Union line is driven from the battlefield before Sheridan can restore it, and captured wagons and food are secured. This result gives Richmond a substantial battlefield success for its election campaign.'
      : 'The Cedar Creek field command wins a limited Confederate victory at heavy cost. Confederate forces secure local ground and some wagons and food, but Sheridan retains an army capable of renewing the fight. Richmond gains a smaller election advantage than a decisive defeat of the Union army would provide.';
  } else {
    // Third Winchester's adjacent review changes narrative and credit only;
    // its authored resource commitments and cabinet effects remain intact.
    consequence = `The Third Winchester field command wins a ${result === 'decisive-win' ? 'decisive' : 'limited'} Confederate victory. Sheridan's advance is checked on the battlefield, though the larger Valley campaign and its supply demands remain unresolved.`;
    if (choice.id === 'option_c') consequence += ' The independent political messages circulate alongside this actual field success.';
  }
  if (scenarioId === 'third_winchester' && choice.id === 'option_c' && result === 'disciplined-withdrawal') {
    consequence += ' Political messages continue independently of this withdrawal, without establishing a field victory.';
  }
  return { choiceSucceeded, effects, consequence };
}

// Unmarked history retains the authored branch contract under which it was
// recorded. New entries must support the named prerequisite with a real result.
export function satisfiesFieldResultRequirement(entry, requirement) {
  if (!hasFieldResultConsequences(entry?.battleResult)) return true;
  // Recognition and armistice branches track Johnston's survival separately
  // from the outcome of the wider command-reserve mission.
  if (entry.scenarioId === SHILOH && requirement?.choiceId === 'option_b'
    && entry.battleResult.commanderStatus !== 'protected') return false;
  if (!requirement?.fieldResultRequirement) return true;
  if (requirement.fieldResultRequirement === 'field-victory') return WINS.has(entry.battleResult.result);
  if (requirement.fieldResultRequirement === 'ordered-supply-withdrawal') return entry.battleResult.result === 'disciplined-withdrawal';
  return false;
}

export function fieldElectionFactors(entry) {
  if (entry?.scenarioId === ATLANTA && entry.battleResult?.scenarioId === ATLANTA
    && entry.battleResult.choiceId === entry.choiceId && hasFieldResultConsequences(entry.battleResult)) {
    if (entry.choiceId === 'option_a') return missionSucceeded(entry.battleResult, entry.choiceId)
      ? [{ points: 2, label: 'Brief rail reprieve at Jonesborough' }]
      : [{ points: -2, label: 'Railroad lost at Jonesborough' }];
    return [{ points: -3, label: 'Atlanta evacuated' }];
  }
  if (!hasFieldResultConsequences(entry?.battleResult) || !['cedar_creek', 'third_winchester'].includes(entry.scenarioId)) return null;
  const result = entry.battleResult.result;
  const name = entry.scenarioId === 'cedar_creek' ? 'Cedar Creek' : 'Third Winchester';
  const factors = [];
  if (entry.scenarioId === 'third_winchester' && entry.choiceId === 'option_c') {
    factors.push({ points: 1, label: 'Third Winchester political messaging (independent of the field result)' });
  }
  const points = result === 'decisive-win' ? 3 : result === 'costly-win' ? 1
    : result === 'rout' ? -4 : result === 'defeat' ? -3
      : entry.scenarioId === 'third_winchester' && entry.choiceId === 'option_d' ? 2 : -1;
  const label = result === 'decisive-win' ? 'decisive field victory' : result === 'costly-win' ? 'limited field victory'
    : result === 'rout' ? 'field rout' : result === 'defeat' ? 'field defeat' : 'organized withdrawal';
  factors.push({ points, label: `${name} ${label}` });
  return factors;
}

export function removeUnsupportedFieldScoreCredit(card, choiceId, field) {
  if (!hasFieldResultConsequences(field)) return card;
  if (field.scenarioId === ANTIETAM) {
    if (field.choiceId !== choiceId) return card;
    // The old Bloody Lane card charged an assumed battlefield loss. The new
    // card receives the actual field verdict separately from the strategic cost.
    if (choiceId === 'option_a') return { ...card, tactical: 0 };
  }
  if (field.scenarioId === FIVE_FORKS && field.choiceId === choiceId) {
    return { ...card, tactical: 0,
      strategic: choiceId === 'option_c' ? -2 : missionSucceeded(field, choiceId) ? (choiceId === 'option_b' ? 10 : 6) : -6 };
  }
  if (field.scenarioId === ATLANTA && field.choiceId === choiceId) {
    return { ...card, tactical: 0, strategic: missionSucceeded(field, choiceId) ? (card.strategic || 0) : -4 };
  }
  if (field.scenarioId === SECOND_MANASSAS && field.choiceId === choiceId) {
    return { ...card, tactical: 0, strategic: missionSucceeded(field, choiceId) ? (card.strategic || 0) : -3 };
  }
  if (field.scenarioId === SEVEN_DAYS && field.choiceId === choiceId) {
    return { ...card, tactical: 0, strategic: missionSucceeded(field, choiceId) ? (card.strategic || 0) : -4 };
  }
  if (field.scenarioId === NEW_MARKET && field.choiceId === choiceId) {
    return { ...card, tactical: 0, strategic: missionSucceeded(field, choiceId) ? (card.strategic || 0) : -4 };
  }
  if (field.scenarioId === MISSIONARY_RIDGE && field.choiceId === choiceId) {
    return { ...card, tactical: 0, strategic: missionSucceeded(field, choiceId) ? (card.strategic || 0) : -4 };
  }
  if (field.scenarioId === SPOTSYLVANIA && field.choiceId === choiceId) {
    return { ...card, tactical: 0, strategic: missionSucceeded(field, choiceId) ? (card.strategic || 0) : -4 };
  }
  if ([KENNESAW_MOUNTAIN, VICKSBURG, SAILORS_CREEK].includes(field.scenarioId) && field.choiceId === choiceId) {
    return { ...card, tactical: 0, strategic: missionSucceeded(field, choiceId) ? (card.strategic || 0) : -4 };
  }
  if (LOSSES.has(field.result) || !missionSucceeded(field, choiceId)) {
    // Winchester C's authored strategic card credits independent political
    // messaging, not battlefield success. Its failed field still loses tactics.
    const independentMessaging = field.scenarioId === 'third_winchester' && choiceId === 'option_c';
    return { ...card, tactical: Math.min(0, card.tactical || 0),
      strategic: independentMessaging ? (card.strategic || 0) : Math.min(0, card.strategic || 0) };
  }
  return card;
}
