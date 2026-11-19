import { getBattleAssessment } from '../battle/battleAssessment.js';
import { applySupplyDeltas, getBattleSupplyProfile } from './campaignSupply.js';
import { getGettysburgJacksonBrief } from '../battle/gettysburgJacksonMission.js';
import { fieldConsequencesVersion, fieldMissionRules, isChoiceGatedField, usesAssessedFieldConsequences } from './fieldResultConsequences.js';
import { ANTIETAM_MISSIONS } from '../battle/antietamMission.js';
import { FIVE_FORKS_MISSIONS } from '../battle/fiveForksMission.js';
import { JONESBOROUGH_MISSIONS } from '../battle/jonesboroughMission.js';
import { SECOND_MANASSAS_MISSIONS } from '../battle/secondManassasMission.js';
import { FREDERICKSBURG_MISSIONS } from '../battle/fredericksburgMission.js';
import { GAINES_MILL_MISSIONS } from '../battle/gainesMillMission.js';
import { NEW_MARKET_MISSIONS } from '../battle/newMarketMission.js';
import { MISSIONARY_RIDGE_MISSIONS } from '../battle/missionaryRidgeMission.js';
import { SPOTSYLVANIA_MISSIONS } from '../battle/spotsylvaniaMission.js';
import { KENNESAW_MISSIONS } from '../battle/kennesawMission.js';
import { VICKSBURG_MISSIONS } from '../battle/vicksburgMission.js';
import { SAILORS_CREEK_MISSIONS } from '../battle/sailorsCreekMission.js';

const clamp = (value, minimum = 0, maximum = 100) => Math.max(minimum, Math.min(maximum, value));

export const createBattleCampaignState = () => ({ version: 1, results: {} });

export const BATTLE_SCENARIOS = {
  manassas_battlefield: {
    id: 'first_manassas',
    scenarioId: 'manassas_battlefield',
    title: 'First Manassas — Command Henry Hill',
    date: 'July 21, 1861',
    eyebrow: 'Optional field command',
    objective: "Hold Henry Hill, steady Bee's exhausted line, and commit Hampton's reserve when McDowell's attack loses cohesion.",
    context: 'The battlefield is representative rather than a literal order of battle. Formations stand for larger commands; the tactical result returns to the authored campaign choice you selected.',
    defaultSelection: 'jackson-brigade',
    fieldOrders: [
      'Keep Jackson and Bee organized on Henry Hill while the Union attack spends its cohesion.',
      "Commit Hampton's reserve against a weakened assault instead of feeding it into the opening volleys.",
    ],
  },
  shiloh_army_of_tennessee: {
    id: 'shiloh',
    scenarioId: 'shiloh_army_of_tennessee',
    title: 'Shiloh — Break the Landing Line',
    date: 'April 6, 1862',
    eyebrow: 'Optional field command',
    objective: "Coordinate Hardee, Bragg, and Polk; preserve Breckinridge's reserve; break Grant's line before Buell crosses the Tennessee.",
    context: 'The representative terrain and corps show the operational problem: surprise created an opening, but woods, disordered command, the landing batteries, and Union reinforcements narrowed it by the hour.',
    defaultSelection: 'hardee-corps',
    fieldOrders: [
      'Advance Hardee, Bragg, and Polk on a common front; isolated corps lose time and cohesion in the woods.',
      "Break the landing line before Buell arrives, while keeping Breckinridge available for the decisive pressure or withdrawal.",
    ],
  },
  chancellorsville_maneuver: {
    id: 'chancellorsville',
    scenarioId: 'chancellorsville_maneuver',
    title: "Chancellorsville — Jackson's Flank March",
    date: 'May 2, 1863',
    eyebrow: 'Optional field command',
    objective: "Bring Jackson's concealed column onto Howard's exposed right before the surprise window closes, while Lee's holding force fixes Hooker's center.",
    context: "The tactical map and representative divisions turn Lee's operational gamble into a timing problem. The field result leads into the authored dusk decision, where the player separately decides whether Jackson continues into the darkness.",
    defaultSelection: 'lee-holding-line',
    fieldOrders: [
      "Keep Lee's thin force fixed near Chancellorsville while Jackson's divisions complete the march.",
      'Drive the arriving flank column into the Union right before the surprise window closes and Howard can reform.',
    ],
  },
  wilderness_opening: {
    id: 'wilderness',
    scenarioId: 'wilderness_opening',
    title: 'The Wilderness — Hold Until Longstreet',
    date: 'May 6, 1864',
    eyebrow: 'Optional field command',
    objective: "Keep Hill's battered divisions intact, hold Lee behind the line, and counterattack only after the Texas Brigade and Longstreet reach the Orange Plank Road.",
    context: "Dense second-growth timber limits fire and movement. The tactical result returns to the authored aftermath; it does not replace the next decision over pursuit, roads, fire, and truce.",
    defaultSelection: 'hill-heth-line',
    fieldOrders: [
      "Do not spend Hill's battered line in a premature advance; use the road corridors and hold until the field dispatch confirms reinforcement.",
      'Commit the Texas Brigade and Longstreet together once First Corps reaches the Orange Plank Road.',
    ],
  },
  third_winchester: {
    id: 'third_winchester',
    scenarioId: 'third_winchester',
    title: 'Third Winchester — The Middle Field',
    date: 'September 19, 1864',
    eyebrow: 'Optional field command',
    objective: "Hold Early's divisions together, or cover an orderly withdrawal toward Winchester before Sheridan's northern pressure breaks the flank.",
    context: 'Representative formations compress the fighting around the Berryville approach, Middle Field, and Winchester into a command problem. Political rumors do not delay Union movement; preserving the army requires a defended route and formations that reach it in order.',
    defaultSelection: 'ramseur-winchester',
    fieldOrders: [
      'Keep the Berryville approach and Middle Field connected; an isolated counterattack exposes the remaining line to Union reserves.',
      'Crook approaches from the right, the northern flank. The lower-left marked corridor leads toward Winchester and the route south.',
    ],
    fieldOrdersByChoice: {
      option_a: ['Concentrate any attack toward the Berryville approach and keep a reserve; charging into fresh Union formations risks losing the army.'],
      option_b: ['Keep Gordon and Wharton covering the retiring columns, then bring the rearguard through the lower-left corridor. The defenses south of town are beyond this field.'],
      option_c: ['Manage the actual defense while political messages circulate. Rumors do not stop Union attacks, postpone reinforcements, or secure the road south.'],
      option_d: ['Ramseur and Rodes begin withdrawing. Gordon and Wharton provide the controllable infantry screen; cavalry operations remain off-map. Bring the screen out before it is isolated.'],
    },
    successResultsByChoice: {
      option_a: ['decisive-win', 'costly-win'],
      option_b: ['disciplined-withdrawal'],
      option_c: ['decisive-win', 'costly-win'],
      option_d: ['disciplined-withdrawal'],
    },
  },
  cedar_creek: {
    id: 'cedar_creek',
    scenarioId: 'cedar_creek',
    title: 'Cedar Creek — Belle Grove at Dawn',
    date: 'October 19, 1864',
    eyebrow: 'Optional field command',
    objective: "Convert Early's dawn surprise before Sheridan can restore the Union line, or preserve the army and captured supply train through an ordered withdrawal.",
    context: 'Representative formations compress a day-long battle into the crisis around Belle Grove, Middletown, and the Valley Pike. Under current campaign rules, the field result determines the battlefield consequence and election credit. An attack must win the field, or the early withdrawal must preserve the army and train, to satisfy the authored election prerequisite.',
    defaultSelection: 'gordon-division',
    fieldOrders: [
      'Keep Gordon, Ramseur, and Kershaw moving through Belle Grove while dawn surprise still dislocates the Union line.',
      'If the attack stalls, preserve the captured train and army before Sheridan turns recovery into a general rout.',
    ],
  },
  gettysburg_decision: {
    id: 'gettysburg',
    scenarioId: 'gettysburg_decision',
    title: 'Gettysburg — The Field Between the Ridges',
    date: 'July 3, 1863',
    eyebrow: 'Optional field command',
    objective: "Break Hancock's center before the assault dissolves, or preserve the army through an orderly disengagement from Seminary Ridge.",
    context: 'The representative field preserves the central tactical problem: a long advance across open ground, fences and the Emmitsburg Road against artillery and infantry posted on Cemetery Ridge.',
    defaultSelection: 'pickett-division',
    fieldOrders: [
      'If attacking, move Pickett, Pettigrew, and Trimble as one assault so the Emmitsburg Road does not split the formation.',
      'If preserving the army, disengage in order before cohesion collapses under the ridge artillery.',
    ],
    successResultsByChoice: { option_a: ['decisive-win', 'costly-win'] },
  },
  gettysburg_with_jackson: {
    id: 'gettysburg_jackson',
    scenarioId: 'gettysburg_with_jackson',
    title: 'Gettysburg with Jackson — Race for the Heights',
    date: 'July 1-2, 1863',
    eyebrow: 'Optional alternate-history field command',
    objective: "Use Jackson's surviving corps to disrupt the Union center around Cemetery Hill and Culp's Hill. Timely surprise and pressure while Hancock's rally line is inactive can decide the immediate heights attack; a center collapse or sustained pressure can also win later.",
    context: "Jackson's survival changes command tempo, not the ground or the Union army. Only a decisive tactical result can satisfy the authored recognition branch; a costly local success is not enough.",
    defaultSelection: 'jackson-rodes-gettysburg',
    fieldOrders: [
      "Use timely surprise and connected divisions to disrupt the Union center before Hancock reinforces it.",
      "The hill markers show actual force presence; victory does not separately require clearing both marked sectors.",
    ],
    fieldOrdersByChoice: Object.fromEntries(['option_a', 'option_b', 'option_c', 'option_d'].map(choiceId => [choiceId, getGettysburgJacksonBrief(choiceId).orders])),
    successResultsByChoice: { option_a: ['decisive-win'] },
  },
  chickamauga: {
    id: 'chickamauga',
    scenarioId: 'chickamauga',
    title: 'Chickamauga — Break the Brotherton Gap',
    date: 'September 20, 1863',
    eyebrow: 'Optional field command',
    objective: "Concentrate Longstreet's wing through the opening near Brotherton Farm, split the Union army, and exploit into Dyer Field before Thomas closes Horseshoe Ridge.",
    context: 'Dense woods and irregular clearings make control as important as strength. A breakthrough can rout the Union right, but exhausting the column against Thomas turns tactical success into another missed strategic opportunity.',
    defaultSelection: 'bushrod-johnson-column',
    fieldOrders: [
      "Keep Bushrod Johnson, Hindman, and Kershaw concentrated through the Brotherton gap instead of scattering attacks through the woods.",
      'Exploit into Dyer Field before Thomas establishes the Horseshoe Ridge line.',
    ],
    successResultsByChoice: { option_b: ['decisive-win', 'costly-win'] },
  },
  cold_harbor: {
    id: 'cold_harbor',
    scenarioId: 'cold_harbor',
    title: 'Cold Harbor — Hold the Interlocking Works',
    date: 'June 3, 1864',
    eyebrow: 'Optional field command',
    objective: "Keep Lee's earthworks intact while Grant's assault crosses the ravines and open pine ground, or screen an orderly transfer toward Petersburg.",
    context: 'Representative corps compress the long Bethesda Church-Cold Harbor front into the decisive problem of June 3: exhausted attackers, limited reconnaissance, broken approaches, and overlapping Confederate fields of fire.',
    defaultSelection: 'hoke-cold-harbor',
    fieldOrders: [
      'Hold the interlocking works and let the broken approaches disrupt the Federal assault; advancing abandons the strongest advantage.',
      "For the Petersburg pivot, withdraw Breckinridge and Hill's reserve down the rear road while the remaining line screens them.",
    ],
    successResultsByChoice: {
      option_a: ['decisive-win', 'costly-win'],
      option_b: ['decisive-win', 'costly-win'],
      option_c: ['decisive-win', 'costly-win'],
      option_d: ['disciplined-withdrawal'],
    },
  },
  petersburg_siege: {
    id: 'petersburg',
    scenarioId: 'petersburg_siege',
    title: 'Petersburg — Seal the Crater Breach',
    date: 'July 30, 1864',
    eyebrow: 'Optional field command',
    objective: "Hold the secondary works, bring Mahone through the covered way, and prevent Burnside's divisions from converting the mine breach into the heights above Petersburg.",
    context: 'Representative formations compress the Crater sector into its decisive command problem: a successful mine explosion, attackers trapped in broken ground, Confederate reserves arriving through covered approaches, and a narrowing interval before the breach becomes a general breakthrough.',
    defaultSelection: 'bushrod-johnson-line',
    fieldOrders: [
      'The Crater branches use different objectives and should not be played as one general counterattack.',
      'Watch the field dispatch for the breach, covered-way arrivals, raid completion, or mine lanes before committing reserves.',
    ],
    fieldOrdersByChoice: {
      option_a: ['Bring both Mahone brigades onto the crater shoulders together; one brigade alone cannot seal the breach.'],
      option_b: ['Keep enough strength in the secondary works until the Federal lodgment is contained.'],
      option_c: ["Strike both siege sectors, then return Mahone's brigades behind the covered way before daylight."],
      option_d: ['Keep Confederate formations clear while Federal columns enter the marked mine lanes.'],
    },
    successResultsByChoice: {
      option_a: ['decisive-win', 'costly-win'],
      option_b: ['costly-win'],
      option_c: ['costly-win'],
      option_d: ['decisive-win', 'costly-win'],
    },
  },
};

const antietamField = {
  id: 'antietam',
  scenarioId: 'antietam',
  title: 'Antietam — The Sharpsburg Line',
  date: 'September 17, 1862',
  defaultSelection: 'antietam-hill',
};

const missionSuccessResults = scenarioId => Object.fromEntries(
  Object.entries(fieldMissionRules(scenarioId).outcomes).map(([id, verdict]) => [id, [verdict]]));

const antietamCampaignBattle = {
  ...antietamField,
  eyebrow: 'Optional field command',
  objective: 'Hold the Sunken Road under assault or bring the army off the field in order.',
  context: 'The map compresses the Cornfield, Sunken Road and Lower Bridge. The field result records your army’s performance at Sharpsburg and carries forward into the campaign.',
  fieldOrdersByChoice: {
    option_a: ANTIETAM_MISSIONS.option_a.orders,
    option_b: ANTIETAM_MISSIONS.option_b.orders,
  },
  successResultsByChoice: missionSuccessResults('antietam'),
};

const fiveForksBattle = {
  id: 'five_forks',
  scenarioId: 'five_forks',
  title: 'Five Forks — The Road to Ford’s Depot',
  date: 'April 1, 1865',
  defaultSelection: 'five-forks-steuart',
  eyebrow: 'Optional field command',
  objective: 'Delay the Union advance at the crossroads, cover an ordered exit with a rear guard, or preserve the force by leaving early.',
  context: 'The map compresses White Oak Road and the approaches to Ford’s Depot. Sheridan’s cavalry presses from the south as Warren’s infantry threatens the exposed Confederate left. The single marked exit is a gameplay abstraction.',
  fieldOrdersByChoice: Object.fromEntries(Object.entries(FIVE_FORKS_MISSIONS).map(([id, mission]) => [id, mission.orders])),
  successResultsByChoice: missionSuccessResults('five_forks'),
  practiceChoices: [
    { id: 'option_a', text: 'Hold the crossroads and the Angle.' },
    { id: 'option_b', text: 'Cover an organized withdrawal with a rear guard.' },
    { id: 'option_c', text: 'Withdraw early through Ford’s Road.' },
  ],
};

const jonesboroughBattle = {
  id: 'jonesborough',
  scenarioId: 'fall_of_atlanta',
  title: 'Jonesborough — The Last Railroad',
  date: 'August 31–September 1, 1864',
  defaultSelection: 'jonesborough-govan',
  eyebrow: 'Optional field command',
  objective: 'Reopen a window on the Macon & Western Railroad or bring Hardee’s formations and guns out toward Lovejoy’s Station.',
  context: 'Hood makes the campaign decision in Atlanta. On this compressed battlefield, you command Hardee’s force around Jonesborough, where the Union advance threatened the railroad that supplied the city.',
  fieldOrdersByChoice: Object.fromEntries(Object.entries(JONESBOROUGH_MISSIONS).map(([id, mission]) => [id, mission.orders])),
  successResultsByChoice: missionSuccessResults('fall_of_atlanta'),
  practiceChoices: [
    { id: 'option_a', text: 'Counterattack and hold the rail crossing.' },
    { id: 'option_b', text: 'Bring Hardee’s formations and guns out in order.' },
  ],
};

const secondManassasBattle = {
  id: 'second_manassas',
  scenarioId: 'second_manassas',
  title: 'Second Manassas — The Deep Cut and Chinn Ridge',
  date: 'August 30, 1862',
  defaultSelection: 'second-manassas-starke',
  eyebrow: 'Optional field command',
  objective: 'Keep Jackson’s position at the Deep Cut while Longstreet attacks Chinn Ridge, or cover the line with artillery and hold the reserve.',
  context: 'The map compresses the unfinished railroad grade, Groveton and Chinn Ridge. Porter attacks Jackson’s position as Longstreet’s wing threatens the Union left. The reconnaissance mission is an alternate command choice.',
  fieldOrdersByChoice: Object.fromEntries(Object.entries(SECOND_MANASSAS_MISSIONS).map(([id, mission]) => [id, mission.orders])),
  successResultsByChoice: missionSuccessResults('second_manassas'),
  practiceChoices: [
    { id: 'option_a', text: 'Hold the Deep Cut and take Chinn Ridge.' },
    { id: 'option_b', text: 'Cover the Deep Cut and keep the reserve ready.' },
  ],
};

const fredericksburgBattle = {
  id: 'fredericksburg',
  scenarioId: 'fredericksburg_field',
  title: 'Fredericksburg — The Sunken Road and Prospect Hill',
  date: 'December 13, 1862',
  defaultSelection: 'fredericksburg-cobb',
  eyebrow: 'Optional field command',
  objective: 'Support the defenders at the Sunken Road or bring the reserve up to Prospect Hill in time to hold the line.',
  context: 'The battlefield compresses the Rappahannock riverfront, Marye’s Heights and Prospect Hill. Follow the selected sector’s mission before returning to the winter decisions.',
  fieldOrdersByChoice: Object.fromEntries(Object.entries(FREDERICKSBURG_MISSIONS).map(([id, mission]) => [id, mission.orders])),
  successResultsByChoice: missionSuccessResults('fredericksburg_field'),
  practiceChoices: [
    { id: 'option_a', text: 'Hold the Sunken Road under attack.' },
    { id: 'option_b', text: 'Reinforce Prospect Hill.' },
  ],
};

const gainesMillBattle = {
  id: 'gaines_mill',
  scenarioId: 'seven_days',
  title: 'Gaines’ Mill — Across Boatswain’s Creek',
  date: 'June 27, 1862',
  defaultSelection: 'gaines-mill-hood',
  eyebrow: 'Optional field command',
  objective: 'Cross Boatswain’s Creek and establish a supported breach, or hold a crossing to cover an organized withdrawal.',
  context: 'The field represents Porter’s position above Boatswain’s Creek and the approach to the Watt House plateau. The view is rotated and distances are compressed.',
  fieldOrdersByChoice: Object.fromEntries(Object.entries(GAINES_MILL_MISSIONS).map(([id, mission]) => [id, mission.orders])),
  successResultsByChoice: missionSuccessResults('seven_days'),
  practiceChoices: [
    { id: 'option_a', text: 'Open a supported breach at Porter’s ridge.' },
    { id: 'option_b', text: 'Cover a withdrawal across Boatswain’s Creek.' },
  ],
};

const newMarketBattle = {
  id: 'new_market',
  scenarioId: 'new_market',
  title: 'New Market — Bushong Farm and the Valley Pike',
  date: 'May 15, 1864',
  defaultSelection: 'new-market-wharton',
  eyebrow: 'Optional field command',
  objective: 'Advance on Bushong Farm with support, or hold the Valley Pike with an organized reserve.',
  context: 'The board compresses Bushong House and its orchard, the muddy Field of Lost Shoes and the Valley Pike. The two missions let you explore different uses of the reserve.',
  fieldOrdersByChoice: Object.fromEntries(Object.entries(NEW_MARKET_MISSIONS).map(([id, mission]) => [id, mission.orders])),
  successResultsByChoice: missionSuccessResults('new_market'),
  practiceChoices: [
    { id: 'option_a', text: 'Support the advance on Bushong Farm.' },
    { id: 'option_b', text: 'Hold the Valley Pike with the cadets in reserve.' },
  ],
};

const missionaryRidgeBattle = {
  id: 'missionary_ridge',
  scenarioId: 'missionary_ridge',
  title: 'Missionary Ridge — Hold the Crest',
  date: 'November 25, 1863',
  defaultSelection: 'missionary-ridge-bate',
  eyebrow: 'Optional field command',
  objective: 'Hold the Main Crest under pressure or screen an organized withdrawal off the ridge.',
  context: 'This board compresses Orchard Knob, the lower rifle pits, and the central crest beside Bragg’s headquarters. The Union’s Chattanooga victory frames both missions.',
  fieldOrdersByChoice: Object.fromEntries(Object.entries(MISSIONARY_RIDGE_MISSIONS).map(([id, mission]) => [id, mission.orders])),
  successResultsByChoice: missionSuccessResults('missionary_ridge'),
  practiceChoices: [
    { id: 'option_a', text: 'Hold the Main Crest under pressure.' },
    { id: 'option_b', text: 'Screen the crest and withdraw in order.' },
  ],
};

const spotsylvaniaBattle = {
  id: 'spotsylvania',
  scenarioId: 'spotsylvania',
  title: 'Spotsylvania — The Bloody Angle',
  date: 'May 12–13, 1864',
  defaultSelection: 'spotsylvania-ramseur',
  eyebrow: 'Optional field command',
  objective: 'Stabilize the Interior Line with infantry and guns, or recover a section of the West Face with a reserve in hand.',
  context: 'The board compresses the Mule Shoe, McCoull House, and the two lines of earthworks. The missions settle a local action in the longer battle.',
  fieldOrdersByChoice: Object.fromEntries(Object.entries(SPOTSYLVANIA_MISSIONS).map(([id, mission]) => [id, mission.orders])),
  successResultsByChoice: missionSuccessResults('spotsylvania'),
  practiceChoices: [
    { id: 'option_a', text: 'Stabilize the Interior Line with infantry and guns.' },
    { id: 'option_b', text: 'Retake a section of the West Face.' },
  ],
};

const kennesawBattle = {
  id: 'kennesaw_mountain',
  scenarioId: 'kennesaw_mountain',
  title: 'Kennesaw Mountain — Cheatham Hill',
  date: 'June 27, 1864',
  defaultSelection: 'kennesaw-vaughan',
  selectionByChoice: { option_b: 'kennesaw-mebane' },
  eyebrow: 'Optional field command',
  objective: 'Hold the Dead Angle under pressure or get the guns and rear guard out by the Southern Road.',
  context: 'The board compresses the approaches to the Dead Angle. Kolb Farmhouse marks the separate June 22 action to the south. The two orders resolve a local command in the larger Atlanta campaign.',
  fieldOrdersByChoice: Object.fromEntries(Object.entries(KENNESAW_MISSIONS).map(([id, mission]) => [id, mission.orders])),
  successResultsByChoice: missionSuccessResults('kennesaw_mountain'),
  practiceChoices: [
    { id: 'option_a', text: 'Hold the Dead Angle on Cheatham Hill.' },
    { id: 'option_b', text: 'Cover the guns’ withdrawal down the Southern Road.' },
  ],
};

const vicksburgBattle = {
  id: 'vicksburg',
  scenarioId: 'vicksburg',
  title: 'Vicksburg — Railroad Redoubt',
  date: 'May 22, 1863',
  defaultSelection: 'vicksburg-waul',
  selectionByChoice: { option_b: 'vicksburg-battery' },
  eyebrow: 'Optional field command',
  objective: 'Recover the breached redoubt or save the guns and infantry at the Interior Line.',
  context: 'The board compresses the Railroad Redoubt, the Southern Railroad cut, and the neighboring Second Texas Lunette. Both orders resolve a local action. Vicksburg is still under siege.',
  fieldOrdersByChoice: Object.fromEntries(Object.entries(VICKSBURG_MISSIONS).map(([id, mission]) => [id, mission.orders])),
  successResultsByChoice: missionSuccessResults('vicksburg'),
  practiceChoices: [
    { id: 'option_a', text: 'Retake the Railroad Redoubt with Waul’s Texas Legion.' },
    { id: 'option_b', text: 'Bring the guns back to the Interior Line.' },
  ],
};

const sailorsCreekBattle = {
  id: 'sailors_creek',
  scenarioId: 'sailors_creek',
  title: 'Sailor’s Creek — Hillsman Farm',
  date: 'April 6, 1865',
  defaultSelection: 'sailors-kershaw',
  selectionByChoice: { option_b: 'sailors-lee' },
  eyebrow: 'Optional field command',
  objective: 'Keep an aid route open or withdraw the remaining formations together.',
  context: 'This board represents the Hillsman Farm sector. The Overton–Hillsman House marks the historical VI Corps field hospital that treated men from both armies. Aid Staging and the West Road are local game objectives.',
  fieldOrdersByChoice: Object.fromEntries(Object.entries(SAILORS_CREEK_MISSIONS).map(([id, mission]) => [id, mission.orders])),
  successResultsByChoice: missionSuccessResults('sailors_creek'),
  practiceChoices: [
    { id: 'option_a', text: 'Keep the South Bank open for an aid escort.' },
    { id: 'option_b', text: 'Withdraw the formations by the West Road.' },
  ],
};

const choiceGatedBattles = {
  sailors_creek: sailorsCreekBattle,
  vicksburg: vicksburgBattle,
  kennesaw_mountain: kennesawBattle,
  spotsylvania: spotsylvaniaBattle,
  missionary_ridge: missionaryRidgeBattle,
  new_market: newMarketBattle,
  seven_days: gainesMillBattle,
  second_manassas: secondManassasBattle,
  antietam: antietamCampaignBattle,
  fredericksburg_field: fredericksburgBattle,
  five_forks: fiveForksBattle,
  fall_of_atlanta: jonesboroughBattle,
};

export const PRACTICE_BATTLES = {
  sailors_creek: sailorsCreekBattle,
  vicksburg: vicksburgBattle,
  ...BATTLE_SCENARIOS,
  kennesaw_mountain: kennesawBattle,
  spotsylvania: spotsylvaniaBattle,
  missionary_ridge: missionaryRidgeBattle,
  new_market: newMarketBattle,
  seven_days: gainesMillBattle,
  second_manassas: secondManassasBattle,
  fredericksburg_field: fredericksburgBattle,
  antietam: {
    ...antietamField,
    objective: 'Manage three linked sectors with a limited reserve. Choose whether to hold the Sunken Road, withdraw in order, defend a wider front, or contest the Lower Bridge.',
    context: 'This compressed and rotated battlefield places the Cornfield, Sunken Road and Lower Bridge on one board. Formations represent larger commands, and the four practice objectives model different possible decisions.',
    fieldOrdersByChoice: Object.fromEntries(Object.entries(ANTIETAM_MISSIONS).map(([id, mission]) => [id, mission.orders])),
    practiceChoices: [
      { id: 'option_a', text: 'Hold the Bloody Lane under pressure.' },
      { id: 'option_b', text: 'Withdraw the army in order.' },
      { id: 'option_c', text: 'Hold both the Cornfield and the Bloody Lane.' },
      { id: 'option_d', text: 'Try an alternate counterattack toward the Lower Bridge.' },
    ],
  },
  five_forks: fiveForksBattle,
  fall_of_atlanta: jonesboroughBattle,
};

export function fieldCommandTitle(battle, choiceId, battleRulesVersion) {
  return battle.id === 'shiloh' && choiceId === 'option_b' && battleRulesVersion >= 14
    ? 'Shiloh — Hold the Command Reserve'
    : battle.title;
}

export function battleForScenario(activeScenario, state, choiceId) {
  const scenarioId = activeScenario?.id;
  if (state?.battleCampaign?.results?.[scenarioId]) return null;
  if (isChoiceGatedField(scenarioId)) {
    return usesAssessedFieldConsequences(state, scenarioId, choiceId) ? choiceGatedBattles[scenarioId] : null;
  }
  return BATTLE_SCENARIOS[scenarioId] || null;
}

export function battleReadiness(state, choiceId, battle = BATTLE_SCENARIOS.manassas_battlefield) {
  const metrics = state?.metrics || {};
  const supplyProfile = getBattleSupplyProfile(state);
  const manassasPostures = {
    option_a: { preparation: 4, cohesion: -5, note: 'An immediate attack trades order for momentum.' },
    option_b: { preparation: 8, cohesion: 8, note: 'A defensive posture best exploits Henry Hill.' },
    option_c: { preparation: -5, cohesion: 4, note: 'The objective becomes preservation rather than victory.' },
    option_d: { preparation: 3, cohesion: 2, note: 'Skirmishers widen the screen but consume ammunition.' },
  };
  const shilohPostures = {
    option_a: { preparation: 7, cohesion: -7, note: "Johnston's presence adds momentum but puts the army's irreplaceable commander inside the kill zone." },
    option_b: { preparation: 5, cohesion: 12, note: 'A command reserve sacrifices some shock to preserve coordination and Johnston himself.' },
    option_c: { preparation: -6, cohesion: -5, note: 'Diplomatic exploitation does little to solve the immediate battlefield traffic jam.' },
    option_d: { preparation: 1, cohesion: 7, note: 'Depot and crossing priorities strengthen endurance but limit pursuit toward the landing.' },
  };
  const chancellorsvillePostures = {
    option_a: { preparation: 9, cohesion: 3, note: "Jackson's historical flank march creates the strongest surprise opportunity, but its value expires quickly." },
    option_b: { preparation: 3, cohesion: 11, note: 'The compact line is easier to control but abandons the chance to collapse the Union right.' },
    option_c: { preparation: 6, cohesion: 6, note: "Stuart's feint widens the surprise window while adding another moving part to the march." },
    option_d: { preparation: -2, cohesion: -5, note: 'Direct pressure reaches contact immediately but spends strength without the leverage of surprise.' },
  };
  const wildernessPostures = {
    option_a: { preparation: -5, cohesion: -9, note: 'A premature counterstroke spends Hill before Longstreet can put weight behind it.' },
    option_b: { preparation: 8, cohesion: 12, note: 'The Texans hold Lee back while the battered front buys time for Longstreet.' },
    option_c: { preparation: -7, cohesion: -8, note: "Lee's personal advance lifts morale but risks the army's command before the reinforcements arrive." },
    option_d: { preparation: 2, cohesion: 7, note: 'Yielding ground improves order but concedes the initiative and narrows the victory conditions.' },
  };
  const cedarCreekPostures = {
    option_a: { preparation: 9, cohesion: 8, note: 'Relentless pressure converts the morning surprise only if the ranks stay closed through Belle Grove.' },
    option_b: { preparation: 2, cohesion: -8, note: 'The historical pause gives Sheridan time to reconstruct the Union line for an afternoon counterattack.' },
    option_c: { preparation: 5, cohesion: 11, note: 'An early withdrawal trades possession of the field for prisoners, wagons, food, and an intact army.' },
    option_d: { preparation: 4, cohesion: 12, note: 'A covered retreat along the Valley Pike preserves cohesion but accepts a narrow operational defeat.' },
  };
  const gettysburgPostures = {
    option_a: { preparation: -4, cohesion: -7, note: 'The cannonade creates smoke and momentum, but the open approach and Union interior line leave almost no margin.' },
    option_b: { preparation: 7, cohesion: 11, note: 'Repositioning south preserves Pickett and forces Meade to decide whether to leave the ridge.' },
    option_c: { preparation: 5, cohesion: 13, note: 'An immediate retreat sacrifices the invasion but gives the army its best chance to cross the Potomac intact.' },
    option_d: { preparation: 3, cohesion: 7, note: "Stuart's disruption can cover the retreat, but cavalry action cannot make the Cemetery Ridge assault sound." },
  };
  const gettysburgJacksonPostures = {
    option_a: { preparation: 10, cohesion: 5, note: "Jackson's advantage is a short window to reach the heights before the Union fishhook closes." },
    option_b: { preparation: 8, cohesion: 12, note: 'Coordinating Jackson and Longstreet extends the attack window and reduces the risk of isolated corps assaults.' },
    option_c: { preparation: 5, cohesion: 8, note: 'Threatening the Baltimore Pike creates operational leverage but makes a decisive battlefield result less likely.' },
    option_d: { preparation: 4, cohesion: 5, note: 'The wide turning movement preserves maneuver at the cost of time while Union reinforcements approach.' },
  };
  const chickamaugaPostures = {
    option_a: { preparation: 1, cohesion: -9, note: 'Disconnected frontal attacks spend strength in the woods without creating a point of decision.' },
    option_b: { preparation: 10, cohesion: 11, note: "Longstreet's concentrated column is positioned to exploit the accidental gap before the Union center can recover." },
    option_c: { preparation: -8, cohesion: -6, note: 'Waiting for Richmond consumes the opening while orders and formations become stale in the woods.' },
    option_d: { preparation: 4, cohesion: 5, note: 'The rail-cutting cavalry improves the operational position but leaves fewer troops to exploit the battlefield opening.' },
  };
  const coldHarborPostures = {
    option_a: { preparation: 1, cohesion: -10, note: 'A counterattack gives up the engineered killing ground and asks exhausted divisions to beat a larger army in the open.' },
    option_b: { preparation: 10, cohesion: 12, note: 'Deepened traverses, cleared fields of fire, and disciplined reserves make the interlocking works exceptionally difficult to storm.' },
    option_c: { preparation: 5, cohesion: 8, note: 'The battlefield posture remains sound while Richmond turns the repulse into a political argument.' },
    option_d: { preparation: 6, cohesion: 10, note: 'The front line must remain credible while reserve formations and wagons begin the operational pivot toward Petersburg.' },
  };
  const petersburgPostures = {
    option_a: { preparation: 9, cohesion: 7, note: "Mahone's covered approach and immediate counterattack offer the best chance to seal the breach before Burnside can organize beyond it." },
    option_b: { preparation: 6, cohesion: 11, note: 'Secondary works and controlled reserves reduce the risk of collapse, but leave the enemy lodged around the crater longer.' },
    option_c: { preparation: 5, cohesion: 6, note: 'The night sortie has a bounded objective: strike siege material, avoid reinforcement, and return before daylight.' },
    option_d: { preparation: 7, cohesion: 8, note: 'Marked lanes and experimental mines can magnify defensive fire, but only if discipline keeps friendly formations out of the danger area.' },
  };
  const thirdWinchesterPostures = {
    option_a: { preparation: -8, cohesion: -12, note: 'A charge toward the Berryville approach spends scarce infantry against a larger army with fresh reserves.' },
    option_b: { preparation: 5, cohesion: 9, note: 'A defended withdrawal uses the southern stone walls to cover the main body, but the rear guard must escape before Union cavalry closes in.' },
    option_c: { preparation: -6, cohesion: -4, note: 'Political rumors provide no physical delay or battlefield advantage; the divisions still face Sheridan on the same timetable.' },
    option_d: { preparation: 7, cohesion: 12, note: 'Farm-road columns and a cavalry screen improve withdrawal coordination, but preserving the army still depends on readiness and an open Valley Pike.' },
  };
  const antietamPostures = {
    option_a: { preparation: 5, cohesion: 7, note: 'Keep both infantry formations in the Sunken Road line so they can support each other under pressure.' },
    option_b: { preparation: 5, cohesion: 12, note: 'Order the withdrawal while formations are still organized, and account for the reserve as it arrives.' },
    option_c: { preparation: 1, cohesion: 3, note: 'Defending two sectors makes a single reserve cover more ground.' },
    option_d: { preparation: -4, cohesion: -3, note: 'Recovering the bridge approach depends on staging the arriving reserve with Toombs.' },
  };
  const fiveForksPostures = {
    option_a: { preparation: -4, cohesion: -5, note: 'Holding the long line keeps the crossroads covered but exposes the Angle to Warren’s turning attack.' },
    option_b: { preparation: 4, cohesion: 8, note: 'A refused flank shortens the line. A rear guard must stay on Ford’s Road long enough for the rest to leave in order.' },
    option_c: { preparation: 2, cohesion: 9, note: 'An immediate withdrawal gives the force the best margin to reach the exit before pressure builds.' },
  };
  const jonesboroughPostures = {
    option_a: { preparation: -2, cohesion: 4, note: 'Commit infantry together at the crossing. Expect pressure to build before the railroad can be used again.' },
    option_b: { preparation: 4, cohesion: 11, note: 'Give the batteries time to limber and keep the approach to Lovejoy’s Station open.' },
  };
  const secondManassasPostures = {
    option_a: { preparation: 3, cohesion: 3, note: 'Keep Jackson’s formations in touch while Longstreet’s wing advances on Chinn Ridge.' },
    option_b: { preparation: 4, cohesion: 9, note: 'Deploy covering guns near Groveton and keep the reserve ready behind the Deep Cut.' },
  };
  const fredericksburgPostures = {
    option_a: { preparation: 6, cohesion: 6, note: 'Bring the battery into support of the Sunken Road and keep the defenders together behind the wall.' },
    option_b: { preparation: 4, cohesion: 8, note: 'Move the reserve early enough to reinforce Prospect Hill before Meade’s pressure breaks the line.' },
  };
  const gainesMillPostures = {
    option_a: { preparation: 5, cohesion: -2, note: 'Keep supporting infantry close after crossing the creek. A single brigade cannot secure the ridge.' },
    option_b: { preparation: 3, cohesion: 10, note: 'Hold the crossing together while the other formations prepare to leave in order.' },
  };
  const newMarketPostures = {
    option_a: { preparation: 2, cohesion: -2, note: 'Send a regular brigade with the cadets. Keep both organized while crossing the muddy field.' },
    option_b: { preparation: 5, cohesion: 8, note: 'Keep the regular brigades together on the pike and the cadet reserve safely behind them.' },
  };
  const missionaryRidgePostures = {
    option_a: { preparation: 6, cohesion: 5, note: 'Keep two organized infantry formations together on the crest while Union pressure builds.' },
    option_b: { preparation: 3, cohesion: 10, note: 'Keep the rear guard on the crest while the rest of the command makes for the eastern exits.' },
  };
  const spotsylvaniaPostures = {
    option_a: { preparation: 6, cohesion: 7, note: 'Form a supported line and bring the battery into action before pressure reaches the interior works.' },
    option_b: { preparation: 3, cohesion: 1, note: 'Move supporting infantry together and keep an organized reserve clear of the fight for the West Face.' },
  };
  const kennesawPostures = {
    option_a: { preparation: 7, cohesion: 6, note: 'Bring two infantry formations together behind the Dead Angle and keep the line organized under pressure.' },
    option_b: { preparation: 4, cohesion: 9, note: 'Get the guns onto the Southern Road while organized infantry covers the withdrawal.' },
  };
  const vicksburgPostures = {
    option_a: { preparation: 5, cohesion: 6, note: 'Bring Waul into the redoubt and restore a supported line before pressure returns.' },
    option_b: { preparation: 4, cohesion: 9, note: 'Keep infantry at the redoubt until the guns deploy at the Interior Line.' },
  };
  const sailorsCreekPostures = {
    option_a: { preparation: 4, cohesion: 5, note: 'Keep the infantry together on the South Bank while the escort reaches Aid Staging.' },
    option_b: { preparation: 4, cohesion: 9, note: 'Send the lead formations toward the exit while the rear guard holds.' },
  };
  const postureTable = battle?.id === 'sailors_creek'
    ? sailorsCreekPostures
    : battle?.id === 'vicksburg'
    ? vicksburgPostures
    : battle?.id === 'kennesaw_mountain'
    ? kennesawPostures
    : battle?.id === 'spotsylvania'
    ? spotsylvaniaPostures
    : battle?.id === 'missionary_ridge'
    ? missionaryRidgePostures
    : battle?.id === 'new_market'
    ? newMarketPostures
    : battle?.id === 'gaines_mill'
    ? gainesMillPostures
    : battle?.id === 'fredericksburg'
    ? fredericksburgPostures
    : battle?.id === 'second_manassas'
    ? secondManassasPostures
    : battle?.id === 'jonesborough'
    ? jonesboroughPostures
    : battle?.id === 'five_forks'
    ? fiveForksPostures
    : battle?.id === 'antietam'
    ? antietamPostures
    : battle?.id === 'third_winchester'
    ? thirdWinchesterPostures
    : battle?.id === 'shiloh'
    ? shilohPostures
    : battle?.id === 'chancellorsville'
      ? chancellorsvillePostures
      : battle?.id === 'wilderness'
        ? wildernessPostures
        : battle?.id === 'cedar_creek'
          ? cedarCreekPostures
        : battle?.id === 'gettysburg'
          ? gettysburgPostures
        : battle?.id === 'gettysburg_jackson'
          ? gettysburgJacksonPostures
        : battle?.id === 'chickamauga'
          ? chickamaugaPostures
        : battle?.id === 'cold_harbor'
          ? coldHarborPostures
        : battle?.id === 'petersburg'
          ? petersburgPostures
      : manassasPostures;
  const posture = postureTable[choiceId] || { preparation: 0, cohesion: 0, note: 'The field force enters without a defined posture.' };
  const preparation = clamp(Math.round(
    (metrics.militaryStrength ?? 70) * 0.48
    + (metrics.munitions ?? 70) * 0.28
    + (metrics.publicMorale ?? 70) * 0.16
    + posture.preparation,
  ));
  return {
    preparation,
    cohesion: clamp(Math.round(52 + preparation * 0.34 + posture.cohesion)),
    supply: clamp(Math.round((metrics.munitions ?? 70) * 0.78 + (metrics.foodSupply ?? 70) * 0.18)),
    morale: clamp(Math.round(45 + (metrics.publicMorale ?? 70) * 0.42)),
    notes: [posture.note, preparation >= 70 ? 'The brigades arrive with a useful margin.' : preparation >= 50 ? 'The line is serviceable but brittle.' : 'Thin preparation leaves little room for a second mistake.', ...(state?.rulesVersion === 2 ? supplyProfile.notes : [])],
    ...(state?.rulesVersion === 2 ? { supplyProfile } : {}),
  };
}

function delegatedOutcome(score, choiceId) {
  if (choiceId === 'option_c') return score >= 55 ? 'disciplined-withdrawal' : 'defeat';
  if (score >= 76) return 'decisive-win';
  if (score >= 57) return 'costly-win';
  if (score >= 42) return 'defeat';
  return 'rout';
}

function offensiveOutcome(score) {
  if (score >= 76) return 'decisive-win';
  if (score >= 57) return 'costly-win';
  if (score >= 42) return 'defeat';
  return 'rout';
}

const STAFF_MISSION_THRESHOLDS = {
  antietam: { option_a: 64, option_b: 62 },
  five_forks: { option_a: 76, option_b: 63, option_c: 57 },
  jonesborough: { option_a: 76, option_b: 62 },
  second_manassas: { option_a: 74, option_b: 60 },
  fredericksburg: { option_a: 65, option_b: 67 },
  gaines_mill: { option_a: 70 },
  new_market: { option_a: 70, option_b: 63 },
  missionary_ridge: { option_a: 68, option_b: 62 },
  spotsylvania: { option_a: 64, option_b: 70 },
  kennesaw_mountain: { option_a: 66, option_b: 62 },
  vicksburg: { option_a: 69, option_b: 61 },
  sailors_creek: { option_a: 62, option_b: 59 },
};

export function delegateBattle(state, battle, choiceId) {
  const readiness = battleReadiness(state, choiceId, battle);
  const postureBonus = battle?.id === 'sailors_creek'
    ? ({ option_a: 3, option_b: 6 }[choiceId] || 0)
    : battle?.id === 'vicksburg'
    ? ({ option_a: 3, option_b: 7 }[choiceId] || 0)
    : battle?.id === 'kennesaw_mountain'
    ? ({ option_a: 5, option_b: 7 }[choiceId] || 0)
    : battle?.id === 'spotsylvania'
    ? ({ option_a: 6, option_b: 3 }[choiceId] || 0)
    : battle?.id === 'missionary_ridge'
    ? ({ option_a: 3, option_b: 6 }[choiceId] || 0)
    : battle?.id === 'new_market'
    ? ({ option_a: 4, option_b: 7 }[choiceId] || 0)
    : battle?.id === 'gaines_mill'
    ? 4
    : battle?.id === 'fredericksburg'
    ? ({ option_a: 6, option_b: 4 }[choiceId] || 0)
    : battle?.id === 'second_manassas'
    ? ({ option_a: 1, option_b: 6 }[choiceId] || 0)
    : battle?.id === 'jonesborough'
    ? ({ option_a: -4, option_b: 8 }[choiceId] || 0)
    : battle?.id === 'five_forks'
    ? ({ option_a: -3, option_b: 5, option_c: 9 }[choiceId] || 0)
    : battle?.id === 'antietam'
    ? ({ option_a: 2, option_b: 8 }[choiceId] || 0)
    : battle?.id === 'third_winchester'
    ? ({ option_a: -14, option_b: 6, option_c: -6, option_d: 10 }[choiceId] || 0)
    : battle?.id === 'shiloh'
    ? ({ option_a: 2, option_b: 11, option_c: -5, option_d: 4 }[choiceId] || 0)
    : battle?.id === 'chancellorsville'
      ? ({ option_a: 13, option_b: 5, option_c: 8, option_d: -4 }[choiceId] || 0)
      : battle?.id === 'wilderness'
        ? ({ option_a: -8, option_b: 14, option_c: -7, option_d: 4 }[choiceId] || 0)
      : battle?.id === 'cedar_creek'
        ? ({ option_a: 14, option_b: -10, option_c: 8, option_d: 7 }[choiceId] || 0)
      : battle?.id === 'gettysburg'
        ? ({ option_a: -13, option_b: 10, option_c: 11, option_d: 6 }[choiceId] || 0)
      : battle?.id === 'gettysburg_jackson'
        ? ({ option_a: 14, option_b: 11, option_c: 5, option_d: 3 }[choiceId] || 0)
      : battle?.id === 'chickamauga'
        ? ({ option_a: -9, option_b: 16, option_c: -12, option_d: 6 }[choiceId] || 0)
      : battle?.id === 'cold_harbor'
        ? ({ option_a: -12, option_b: 16, option_c: 8, option_d: 12 }[choiceId] || 0)
      : battle?.id === 'petersburg'
        ? ({ option_a: 17, option_b: 9, option_c: 7, option_d: 12 }[choiceId] || 0)
      : ({ option_a: -2, option_b: 10, option_c: 1, option_d: 3 }[choiceId] || 0);
  const profile = getBattleSupplyProfile(state);
  const score = clamp(Math.round(readiness.preparation * 0.52 + readiness.cohesion * 0.28 + readiness.supply * 0.12 + readiness.morale * 0.08 + postureBonus - profile.readinessPenalty - profile.foodPenalty));
  const mission = fieldMissionRules(battle?.scenarioId);
  const result = mission
    ? (score >= STAFF_MISSION_THRESHOLDS[battle.id]?.[choiceId]
      ? mission.outcomes[choiceId]
      : score >= 42 ? 'defeat' : 'rout')
    : battle?.id === 'third_winchester' && ['option_b', 'option_d'].includes(choiceId)
    ? (score >= (choiceId === 'option_b' ? 62 : 60) ? 'disciplined-withdrawal' : score >= 43 ? 'defeat' : 'rout')
    : battle?.id === 'third_winchester' && choiceId === 'option_a'
      ? (score >= 64 ? 'costly-win' : score >= 44 ? 'defeat' : 'rout')
      : battle?.id === 'third_winchester'
        ? (score >= 78 ? 'costly-win' : score >= 44 ? 'defeat' : 'rout')
    : battle?.id === 'shiloh' && choiceId === 'option_d'
    ? (score >= 56 ? 'disciplined-withdrawal' : 'defeat')
    : battle?.id === 'chancellorsville' && choiceId === 'option_b'
      ? (score >= 54 ? 'disciplined-withdrawal' : 'defeat')
      : battle?.id === 'chancellorsville'
        ? offensiveOutcome(score)
        : battle?.id === 'wilderness' && choiceId === 'option_b'
          ? (score >= 64 ? 'costly-win' : score >= 48 ? 'disciplined-withdrawal' : 'defeat')
          : battle?.id === 'wilderness' && choiceId === 'option_d'
            ? (score >= 50 ? 'disciplined-withdrawal' : 'defeat')
            : battle?.id === 'wilderness'
              ? offensiveOutcome(score)
              : battle?.id === 'cedar_creek' && ['option_c', 'option_d'].includes(choiceId)
                ? (score >= 52 ? 'disciplined-withdrawal' : score >= 40 ? 'defeat' : 'rout')
                : battle?.id === 'cedar_creek' && choiceId === 'option_b'
                  ? offensiveOutcome(score - 10)
                  : battle?.id === 'cedar_creek'
                    ? offensiveOutcome(score)
                  : battle?.id === 'gettysburg' && ['option_b', 'option_c', 'option_d'].includes(choiceId)
                    ? (score >= 52 ? 'disciplined-withdrawal' : score >= 40 ? 'defeat' : 'rout')
                  : battle?.id === 'gettysburg'
                    ? offensiveOutcome(score - 12)
                  : battle?.id === 'gettysburg_jackson' && choiceId === 'option_a'
                    ? (score >= 84 ? 'decisive-win' : score >= 66 ? 'costly-win' : score >= 48 ? 'defeat' : 'rout')
                  : battle?.id === 'gettysburg_jackson' && choiceId === 'option_b'
                    ? (score >= 68 ? 'costly-win' : score >= 50 ? 'defeat' : 'rout')
                  : battle?.id === 'gettysburg_jackson' && choiceId === 'option_c'
                    ? (score >= 58 ? 'costly-win' : score >= 44 ? 'disciplined-withdrawal' : 'defeat')
                  : battle?.id === 'gettysburg_jackson'
                    ? (score >= 62 ? 'costly-win' : score >= 47 ? 'disciplined-withdrawal' : 'defeat')
                  : battle?.id === 'chickamauga' && choiceId === 'option_b'
                    ? (score >= 78 ? 'decisive-win' : score >= 60 ? 'costly-win' : score >= 45 ? 'defeat' : 'rout')
                  : battle?.id === 'chickamauga' && (choiceId === 'option_d' || state?.battleRulesVersion >= 15 && choiceId === 'option_c')
                    ? (score >= 57 ? 'costly-win' : score >= 45 ? 'disciplined-withdrawal' : 'defeat')
                  : battle?.id === 'chickamauga'
                    ? offensiveOutcome(score - (choiceId === 'option_a' ? 15 : 12))
                  : battle?.id === 'cold_harbor' && choiceId === 'option_a'
                    ? (score >= 80 ? 'costly-win' : score >= 48 ? 'defeat' : 'rout')
                  : battle?.id === 'cold_harbor' && choiceId === 'option_d'
                    ? (score >= 62 ? 'disciplined-withdrawal' : score >= 47 ? 'defeat' : 'rout')
                  : battle?.id === 'cold_harbor' && choiceId === 'option_b'
                    ? (score >= 82 ? 'decisive-win' : score >= 62 ? 'costly-win' : 'defeat')
                  : battle?.id === 'cold_harbor'
                    ? (score >= 64 ? 'costly-win' : score >= 46 ? 'defeat' : 'rout')
                  : battle?.id === 'petersburg' && choiceId === 'option_a'
                    ? (score >= 78 ? 'decisive-win' : score >= 59 ? 'costly-win' : score >= 44 ? 'defeat' : 'rout')
                  : battle?.id === 'petersburg' && choiceId === 'option_b'
                    ? (score >= 58 ? 'costly-win' : score >= 44 ? 'defeat' : 'rout')
                  : battle?.id === 'petersburg' && choiceId === 'option_c'
                    ? (score >= 58 ? 'costly-win' : score >= 45 ? 'defeat' : 'rout')
                  : battle?.id === 'petersburg'
                    ? (score >= 76 ? 'decisive-win' : score >= 58 ? 'costly-win' : score >= 44 ? 'defeat' : 'rout')
        : delegatedOutcome(score, choiceId);
  const resolution = {
    battleId: battle.id,
    scenarioId: battle.scenarioId,
    ...(mission ? { choiceId } : {}),
    result,
    score,
    confederateLossRate: result === 'decisive-win' ? 0.11 : result === 'costly-win' ? 0.23 : result === 'disciplined-withdrawal' ? 0.16 : result === 'defeat' ? 0.31 : 0.45,
    unionLossRate: result === 'decisive-win' ? 0.36 : result === 'costly-win' ? 0.28 : result === 'disciplined-withdrawal' ? 0.14 : result === 'defeat' ? 0.18 : 0.12,
    commanderStatus: battle?.id === 'shiloh'
      ? choiceId === 'option_b' || choiceId === 'option_d'
        ? 'protected'
        : choiceId === 'option_a' && result !== 'decisive-win'
          ? 'mortally wounded'
          : 'exposed'
      : battle?.id === 'wilderness'
        ? choiceId === 'option_b'
          ? 'held by the Texans'
          : choiceId === 'option_c'
            ? ['defeat', 'rout'].includes(result) ? 'nearly lost at the line' : 'pulled back by the Texans'
            : choiceId === 'option_d' ? 'directing withdrawal' : 'pressing the front'
      : undefined,
    delegated: true,
  };
  return state?.rulesVersion === 2 ? { ...resolution, assessment: getBattleAssessment(resolution, choiceId) } : resolution;
}

const OUTCOME_EFFECTS = {
  'decisive-win': { metrics: { militaryStrength: 4, munitions: -3, publicMorale: 5 }, tactical: 12 },
  'costly-win': { metrics: { militaryStrength: -2, munitions: -4, publicMorale: 2 }, tactical: 7 },
  'disciplined-withdrawal': { metrics: { militaryStrength: 1, munitions: -2, publicMorale: -3 }, tactical: 3 },
  defeat: { metrics: { militaryStrength: -6, munitions: -3, publicMorale: -6 }, tactical: -6 },
  rout: { metrics: { militaryStrength: -10, munitions: -5, publicMorale: -10 }, tactical: -12 },
};

export function applyBattleResolution(state, resolution, { legacyShiloh = false } = {}) {
  if (!resolution?.scenarioId || state?.battleCampaign?.results?.[resolution.scenarioId]) return state;
  const mission = fieldMissionRules(resolution.scenarioId);
  if (mission && (state.scenarioId !== resolution.scenarioId || resolution.battleId !== mission.battleId
    || !Object.hasOwn(mission.outcomes, resolution.choiceId)
    || !usesAssessedFieldConsequences(state, resolution.scenarioId, resolution.choiceId)
    || (resolution.battleRulesVersion !== undefined && resolution.battleRulesVersion < 18))) return state;
  const battle = mission ? choiceGatedBattles[resolution.scenarioId] : BATTLE_SCENARIOS[resolution.scenarioId];
  const effect = OUTCOME_EFFECTS[resolution.result] || OUTCOME_EFFECTS.defeat;
  const policyVersion = legacyShiloh && resolution.scenarioId === 'shiloh_army_of_tennessee'
    ? null
    : fieldConsequencesVersion(state, resolution.scenarioId);
  const result = {
    ...resolution,
    ...(policyVersion
      && (resolution.battleRulesVersion === undefined || resolution.battleRulesVersion >= 18)
      ? { fieldResultConsequencesVersion: policyVersion } : {}),
    title: battle?.title || resolution.battleId,
    tacticalScore: effect.tactical,
    completedTurn: state.currentTurn,
  };
  const metrics = Object.fromEntries(Object.entries(state.metrics).map(([key, value]) => [key, clamp(value + (effect.metrics[key] || 0))]));
  const supplyResult = state.rulesVersion === 2 ? applySupplyDeltas(state.metrics, state.campaignEconomy, effect.metrics) : null;
  return {
    ...state,
    metrics: supplyResult?.metrics || metrics,
    ...(supplyResult ? { campaignEconomy: supplyResult.economy } : {}),
    battleCampaign: {
      version: 1,
      results: { ...(state.battleCampaign?.results || {}), [resolution.scenarioId]: result },
    },
    statusMessage: `${battleResultLabel(resolution.result, resolution.assessment)} at ${battle?.title || 'the field battle'}. The result now shapes the strategic consequence.`,
  };
}

export function battleResultLabel(result, assessment = null) {
  if (result === 'disciplined-withdrawal' && assessment?.evidence?.some(item => item.label === 'Field outcome' && item.value === 'Army preserved through the mission')) return 'Army preserved through the mission';
  return ({
    'decisive-win': 'Decisive Confederate victory',
    'costly-win': 'Limited Confederate victory',
    'disciplined-withdrawal': 'Army preserved in withdrawal',
    defeat: 'Field defeat',
    rout: 'Confederate line routed',
  })[result] || result;
}

export function battleChoiceSuccessModifier(battle, choiceId, result, fallback = 0) {
  const successResults = battle?.successResultsByChoice?.[choiceId];
  if (!Array.isArray(successResults) || !successResults.length) return fallback;
  return successResults.includes(result) ? 1 : -1;
}
