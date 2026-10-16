// Titans of War - Core Historical Scenario Database
import { INITIAL_STATE } from './initialState.js';
import { resolveScenarioMedia } from './mediaCatalog.js';
import antietamCard from '../assets/images/antietam_card.jpg';
import appomattoxCard from '../assets/images/appomattox_card.jpg';
import chancellorsvilleCard from '../assets/images/chancellorsville_card.jpg';
import chickamaugaCard from '../assets/images/chickamauga_card.jpg';
import fortSumterCard from '../assets/images/fort_sumter_card.jpg';
import gettysburgCard from '../assets/images/gettysburg_card.jpg';
import manassasBattlefieldCard from '../assets/images/manassas_battlefield_card.jpg';
import petersburgCard from '../assets/images/petersburg_card.jpg';
import secondManassasCard from '../assets/images/second_manassas_card.jpg';
import sevenDaysCard from '../assets/images/seven_days_card.jpg';
import thirdWinchesterCard from '../assets/images/third_winchester_card.jpg';
import wildernessCard from '../assets/images/wilderness_card.jpg';

export { INITIAL_STATE };

export const STATIC_SCENARIOS = [
{
    id: "fort_sumter",
    turn: 1,
    date: "April 13, 1861",
    actor: "Major Robert Anderson",
    roleLabel: "Union Fort Commander",
    image: fortSumterCard,
    title: "The Crisis of Fort Sumter — Surrender Decision",
    description: "Your supplies are almost gone. After 34 hours of bombardment by secessionist batteries, fires and damaged defenses have made Fort Sumter increasingly untenable. The relief expedition has not supplied the garrison. Surrender terms are being discussed with Beauregard's representatives. The war has begun; you must decide whether to accept evacuation, prolong resistance, or attempt an escape.",
    letterTarget: "your wife Eba",
    sourceNotes: "OR ser. 1 vol. 1 pp. 12-30 (Anderson-Beauregard correspondence); Channing, A History of the United States vol. VI; Nevins, The War for the Union vol. I ch. 2; Foote, The Civil War vol. I pp. 40-49.",
    period_voice: "Paraphrase of Anderson's oral remark to Beauregard's three emissaries, April 11, 1861: without relief, the garrison would soon face starvation even if the bombardment did not destroy the fort. This was an oral communication, not a letter to Adjutant General Cooper. (National Park Service, Battle of Fort Sumter, April 1861: https://home.nps.gov/articles/battle-of-fort-sumter-april-1861.htm)",
    primerTags: ["upper_south_secession_crisis", "border_state_bargain", "women_in_the_war"],
    choices: [
      {
        id: "option_a",
        text: "Refuse surrender and return fire aggressively. Hold the masonry.",
        proposer: "hotspur",
        costDescription: "Consumes 20 Military Strength, prolongs the bombardment.",
        successRate: 0.5,
        next: "manassas_battlefield",
        successEffects: {
          metrics: { militaryStrength: -10, munitions: -20, publicMorale: +30, divergenceIndex: +0.10 },
          shards: { hotspur: +35, fox: -5 }
        },
        successConsequence: "Miraculous defense! Sumter's masonry absorbs the shocks as your gunners execute brilliant counter-battery work, caving in Beauregard's mortars. A historic standoff cedes the harbor!",
        failureEffects: {
          metrics: { militaryStrength: -30, munitions: -30, publicMorale: +10 },
          shards: { hotspur: +15, fox: -15 }
        },
        failureConsequence: "Further resistance could not save the battered fort. Fort Sumter fell, and the bombardment galvanized the Union into action."
      },
      {
        id: "option_b",
        text: "Negotiate evacuation terms under protest. Preserve your garrison.",
        proposer: "fox",
        costDescription: "Preserves the garrison; the game model applies an initial Public Morale penalty.",
        next: "radical_republican_crisis",
        effects: {
          metrics: { militaryStrength: -5, publicMorale: -25, treasury: +10 },
          shards: { hotspur: -20, fox: +25, wolf: +10 }
        },
        consequence: "Anderson accepts evacuation with honors. Historically, the garrison left the fort on April 14, and the attack rallied Northern support for the Union. The Public Morale penalty and following cabinet crisis are modeled political pressures, not a record of public anger at Anderson's surrender."
      },
      {
        id: "option_c",
        text: "Prolong surrender negotiations while awaiting help from the relief expedition.",
        proposer: "wolf",
        costDescription: "Saves munitions, moderate risk of battery containment.",
        next: "manassas_battlefield",
        effects: {
          metrics: { munitions: -5, militaryStrength: -15, publicMorale: -5 },
          shards: { wolf: +25, hotspur: -10 }
        },
        consequence: "The fleet was driven off by coastal mortars. You held out 2 extra days, but surrender was eventually forced. The South claims a moral victory."
      },
      {
        id: "option_d",
        text: "Spike the heavy columbiad guns and prepare a barge escape before the next dawn.",
        proposer: "sovereign",
        costDescription: "Destroys munitions, high tactical divergence.",
        next: "charleston_harbor_escape",
        effects: {
          metrics: { munitions: -40, treasury: -10, divergenceIndex: +0.2 },
          shards: { fox: +15, wolf: +10 }
        },
        consequence: "The barge escape was 100% successful under cover of fog. The columbiads were ruined, depriving the South of heavy artillery. History has already begun to diverge."
      }
    ]
  },

{
    id: "radical_republican_crisis",
    turn: 2,
    date: "April 1861",
    actor: "President Abraham Lincoln",
    roleLabel: "Union Civil Executive",
    image: "/images/cw_pictures/Lincoln Cabinet.jpeg",
    title: "Mobilizing the Union — The Coalition After Sumter",
    description: "The attack on Sumter has rallied Northern support for the Union. Lincoln must turn that response into troops, funds, and a workable coalition while weighing the reactions of the Upper South, the border states, and Europe. This branch imagines an intensified cabinet dispute over the pace and language of mobilization. Its political penalties and factional responses are game assumptions, not measured consequences of the historical evacuation.",
    primerTags: ["upper_south_secession_crisis", "border_state_bargain", "copperhead_politics"],
    letterTarget: "the cabinet and Congressional leaders",
    choices: [
      {
        id: "option_a",
        text: "Call Congress into emergency session and answer the attack with overwhelming mobilization.",
        proposer: "hotspur",
        costDescription: "High treasury and munitions cost, restores Northern resolve.",
        effects: {
          metrics: { treasury: -18, munitions: -10, militaryStrength: +18, publicMorale: +18, divergenceIndex: +0.06 },
          shards: { hotspur: +28, fox: -10 }
        },
        consequence: "Rapid mobilization turns public resolve into recruiting and administrative work. In this modeled branch, the cabinet gains political support by committing resources quickly, while increasing the strain on its treasury and supplies."
      },
      {
        id: "option_b",
        text: "Frame evacuation as discipline, preserve the border-state coalition, and mobilize quietly.",
        proposer: "fox",
        costDescription: "Lower morale recovery, stronger coalition stability.",
        effects: {
          metrics: { treasury: -8, militaryStrength: +10, publicMorale: +6, divergenceIndex: +0.04 },
          shards: { fox: +30, hotspur: -10, wolf: +4 }
        },
        consequence: "Lincoln refuses to let the loudest faction write the whole opening chapter. Recruiting rises more slowly, but Maryland, Kentucky, and Missouri hear less language that might drive them out of the Union."
      },
      {
        id: "option_c",
        text: "Channel Radical demands for action into a press offensive about rebellion, restraint, and lawful Union.",
        proposer: "wolf",
        costDescription: "Treasury cost, political recovery, diplomatic narrative gain.",
        effects: {
          metrics: { treasury: -12, publicMorale: +12, divergenceIndex: +0.08 },
          shards: { wolf: +28, fox: +6, hotspur: -6 }
        },
        consequence: "The cabinet lets radicals thunder while official dispatches emphasize law, patience, and rebel responsibility. The administration gains time to define the war before its enemies define the retreat."
      },
      {
        id: "option_d",
        text: "Prioritize border-state neutrality and delay sweeping hard-war measures.",
        proposer: "sovereign",
        costDescription: "Morale cost, strongest border-state preservation play.",
        effects: {
          metrics: { treasury: +6, publicMorale: -8, militaryStrength: +4, divergenceIndex: +0.10 },
          shards: { fox: +12, wolf: +12, hotspur: -14 }
        },
        consequence: "The decision enrages hard-war men, but it buys the administration breathing room where the map is most fragile. The Union survives the week by treating politics as terrain."
      }
    ]
  },

{
    id: "manassas_battlefield",
    turn: 2,
    date: "July 21, 1861",
    actor: "Brig. Gen. Thomas J. Jackson",
    roleLabel: "Confederate Brigade Commander",
    image: manassasBattlefieldCard,
    title: "First Battle of Manassas — Henry Hill",
    description: "The Virginia sun beats down on Henry Hill. Union columns under McDowell are swinging wide around Sudley Springs, threatening to roll up the Confederate left. General Bee's brigade is already breaking on Matthews Hill. The day is young, but the fate of the infant Confederacy may be decided in the next few hours. If the line collapses here, Richmond is open. If it holds, the South gains a legend.",
    letterTarget: "your wife Anna",
    sourceNotes: "OR ser. 1 vol. 2 pp. 313-571 (reports of McDowell, Beauregard, J.E. Johnston, Jackson); Henderson, Stonewall Jackson and the American Civil War vol. I ch. 9; Freeman, R.E. Lee vol. I ch. 33; Battles and Leaders of the Civil War vol. I pp. 167-261.",
    period_voice: "General Bee to his brigade on Henry Hill: \"There is Jackson, standing like a stone wall. Rally behind the Virginians!\" (Henderson, Stonewall Jackson vol. I p. 152, drawing on participant reports collected in OR.)",
    primerTags: ["upper_south_secession_crisis", "border_state_bargain", "women_in_the_war"],
    choices: [
      {
        id: "option_a",
        text: "Charge! Advance Bee's brigade and smash the Union flank.",
        proposer: "hotspur",
        costDescription: "Consumes 20 Military Strength, increases Public Morale significantly.",
        successRate: 0.6,
        successEffects: {
          metrics: { militaryStrength: -10, munitions: -10, publicMorale: +35, divergenceIndex: +0.08 },
          shards: { hotspur: +25 }
        },
        successConsequence: "Flank rolled up! Jackson's charge was a sweeping, coordinated strike, capturing Ricketts' Union battery intact and forcing McDowell into a panicked retreat back across Bull Run!",
        failureEffects: {
          metrics: { militaryStrength: -30, munitions: -20, publicMorale: +10 },
          shards: { hotspur: +10, fox: -20 }
        },
        failureConsequence: "Bee was rallied by your stand, but the charge suffered heavy casualties under canister fire. The phrase 'There stands Jackson like a stone wall' is already spreading through the ranks."
      },
      {
        id: "option_b",
        text: "Hold Henry Hill. Form defensive blocks and let them come to us.",
        proposer: "fox",
        costDescription: "Saves Military Strength, increases defensive alignment.",
        effects: {
          metrics: { militaryStrength: -5, munitions: -5, publicMorale: +10 },
          shards: { hotspur: -10, fox: +25 }
        },
        consequence: "A solid defensive wall. You stood like a stone wall, repelling consecutive charges. The legend of 'Stonewall' Jackson is born in the smoke and heat of this ridge."
      },
      {
        id: "option_c",
        text: "Order tactical withdrawal to the Manassas junction rail depot.",
        proposer: "wolf",
        costDescription: "Saves resources, but drops Public Morale and Hotspur alignment.",
        effects: {
          metrics: { treasury: +10, publicMorale: -25, militaryStrength: 0 },
          shards: { hotspur: -20, fox: +10, wolf: +20 }
        },
        consequence: "The junction was secured cleanly, but the retreat triggered panic on the home front. Newspapers in Richmond are already screaming of betrayal."
      },
      {
        id: "option_d",
        text: "Deploy skirmishers to execute a diversionary flank ride.",
        proposer: "sovereign",
        costDescription: "Consumes 15 Munitions, minor risk, high technical upside.",
        effects: {
          metrics: { munitions: -20, militaryStrength: -10, publicMorale: +5 },
          shards: { fox: +10, wolf: +10 }
        },
        consequence: "The Union columns delayed their advance, confused by the flank scouts. A small tactical success, but one that could grow into something larger if the war drags on."
      }
    ]
  },

{
    id: "charleston_harbor_escape",
    turn: 2,
    date: "April 15, 1861",
    actor: "Major Robert Anderson",
    roleLabel: "Union Harbor Raider",
    image: fortSumterCard,
    title: "Charleston Harbor Escape — Guns in the Fog",
    description: "The barge columns slip out beneath a wet dawn haze while Confederate signal fires burn uselessly along Morris Island. Your garrison lives, the ruined columbiads cannot be turned against the relief fleet, and Washington suddenly possesses a propaganda victory instead of a martyrdom. The war still begins, but its opening chapter is no longer surrender at Sumter; it is an audacious escape that embarrasses Charleston and tempts Lincoln toward sharper coastal action.",
    letterTarget: "your wife Eba",
    primerTags: ["trent_affair", "border_state_bargain"],
    choices: [
      {
        id: "option_a",
        text: "Raid the harbor batteries before Confederate crews can reset their guns.",
        proposer: "hotspur",
        costDescription: "High military and munitions cost, strong morale upside.",
        successRate: 0.45,
        successEffects: {
          metrics: { militaryStrength: -12, munitions: -18, publicMorale: +25, divergenceIndex: +0.08 },
          shards: { hotspur: +25, fox: -10 }
        },
        successConsequence: "The night raid wrecked two exposed harbor batteries and sent Charleston into a panic. Northern papers crown the escaped garrison as avengers, and foreign observers suddenly doubt Confederate coastal control.",
        failureEffects: {
          metrics: { militaryStrength: -28, munitions: -22, publicMorale: -5, divergenceIndex: +0.03 },
          shards: { hotspur: +5, fox: -15 }
        },
        failureConsequence: "The raid scattered under canister and searchlight glare. The garrison escaped Sumter only to bleed in the marsh approaches, muting the victory in Washington."
      },
      {
        id: "option_b",
        text: "Preserve the garrison and turn the escape into a disciplined Union recruiting symbol.",
        proposer: "fox",
        costDescription: "Moderate treasury cost, stabilizes morale and command legitimacy.",
        effects: {
          metrics: { treasury: -8, militaryStrength: +8, publicMorale: +12, divergenceIndex: +0.04 },
          shards: { fox: +25, hotspur: -10 }
        },
        consequence: "The survivors parade through Northern cities as proof that restraint and discipline can shame rebellion without squandering lives. Recruiting depots fill faster than expected."
      },
      {
        id: "option_c",
        text: "Send captured harbor charts to European envoys as evidence of Confederate instability.",
        proposer: "wolf",
        costDescription: "Consumes treasury, improves diplomatic leverage through scandal.",
        effects: {
          metrics: { treasury: -12, publicMorale: +4, divergenceIndex: +0.07 },
          shards: { wolf: +25, fox: +5, hotspur: -10 }
        },
        consequence: "British and French consuls receive copies of the harbor charts before Richmond can control the story. Charleston's boast of mastery looks brittle in European salons."
      },
      {
        id: "option_d",
        text: "Scatter the garrison into clandestine coastal teams to harass blockade runners.",
        proposer: "sovereign",
        costDescription: "Radical divergence; drains resources but opens a shadow-war track.",
        effects: {
          metrics: { militaryStrength: -10, munitions: -10, treasury: -8, divergenceIndex: +0.12 },
          shards: { wolf: +15, hotspur: +10, fox: -15 }
        },
        consequence: "Anderson's men disappear into inlet stations and loyalist safehouses. The coast war begins months ahead of schedule, severing the campaign from orthodox chronology."
      }
    ]
  },

  {
    id: "naval_technology",
    turn: 3,
    date: "March 8, 1862",
    actor: "Secretary Stephen Mallory",
    roleLabel: "Confederate Navy Secretary",
    // image will be loaded from SCENARIO_ASSET_MAP → hunley_submarine
    title: "Naval Technology — The Blockade & Experimental Warfare",
    description: "The Union blockade threatens Confederate commerce and access to European supplies. In Richmond, the cabinet weighs ironclads, river defenses, and experimental submarine research. Wolf proposes funding precursor work such as the Pioneer experiments of early 1862. The later H.L. Hunley reference in the archive belongs to 1863, not this March 1862 decision. An early operational submarine and its immediate results here are explicitly hypothetical accelerated development, not the recorded Hunley mission.",
    letterTarget: "your daughter Ruby",
    primerTags: ["naval_technology", "cotton_diplomacy", "wartime_industry"],
    choices: [
      {
        id: "option_a",
        text: "Fund the ironclad CSS Virginia to break the blockade at Hampton Roads.",
        proposer: "hotspur",
        costDescription: "Consumes 20 Treasury, boosts Military Strength significantly.",
        successRate: 0.6,
        successEffects: {
          metrics: { treasury: -20, militaryStrength: +25, publicMorale: +15, divergenceIndex: +0.05 },
          shards: { hotspur: +25, fox: -10 }
        },
        successConsequence: "Breakthrough! The armored CSS Virginia steamrolls the Union fleet at Hampton Roads, sinking the Cumberland and Congress in fire. The world learns of the first ironclad clash!",
        failureEffects: {
          metrics: { treasury: -25, militaryStrength: -10, publicMorale: -10 },
          shards: { hotspur: +10, fox: -15 }
        },
        failureConsequence: "The CSS Virginia ran aground under heavy mortar fire. Though it proved the concept of armor, the blockade remains unbroken, and the vessel was burned to prevent capture."
      },
      {
        id: "option_b",
        text: "Deploy steam river ironclads and electric naval mines for Mississippi defense.",
        proposer: "fox",
        costDescription: "Consumes 15 Munitions and 10 Treasury, secures inland waterways.",
        effects: {
          metrics: { munitions: -15, treasury: -10, militaryStrength: +15, publicMorale: +10 },
          shards: { fox: +25, hotspur: -5, wolf: +5 }
        },
        consequence: "Heavy river batteries and contact mines successfully hold off Union ironclads on the Mississippi, securing Vicksburg's supply lines for another season."
      },
      {
        id: "option_c",
        text: "Fund precursor submarine research for hypothetical early torpedo operations.",
        proposer: "wolf",
        costDescription: "Consumes 25 Treasury, high strategic risk and divergence.",
        successRate: 0.4,
        successEffects: {
          metrics: { treasury: -25, militaryStrength: +10, publicMorale: +25, divergenceIndex: +0.15 },
          shards: { wolf: +30, hotspur: -5 }
        },
        successConsequence: "Hypothetical accelerated development: an experimental submarine sinks a blockading warship with a torpedo. This imagined early success is not the H.L. Hunley's historical attack on USS Housatonic in February 1864.",
        failureEffects: {
          metrics: { treasury: -25, militaryStrength: -15, publicMorale: -15, divergenceIndex: +0.05 },
          shards: { wolf: +10, hotspur: -10 }
        },
        failureConsequence: "Hypothetical research setback: an experimental submarine sinks during trials, killing its crew and consuming scarce funds. This outcome does not reenact the later Hunley's 1863 training losses."
      },
      {
        id: "option_d",
        text: "Purchase state-of-the-art Whitworth rifled cannon from British manufacturers.",
        proposer: "sovereign",
        costDescription: "Consumes 30 Treasury, drastically increases Munitions.",
        effects: {
          metrics: { treasury: -30, munitions: +35, militaryStrength: +10 },
          shards: { fox: +15, wolf: +10 }
        },
        consequence: "The highly accurate Whitworth rifled guns arrive via blockade runners, transforming Confederate siege battery effectiveness across the theaters."
      }
    ]
  },

{
    id: "seven_days",
  turn: 6,
    date: "June 25, 1862",
    actor: "General Robert E. Lee",
    roleLabel: "Commander of Northern Virginia",
    image: sevenDaysCard,
    title: "The Seven Days Battles — Saving Richmond",
    description: "McClellan's massive Army of the Potomac — over 100,000 men — looms just six miles outside Richmond. The Confederate capital is in a state of near-panic. Hotspur demands immediate aggressive flank offensives across the Chickahominy to smash the Union right before it can dig in. Fox urges the rapid construction of heavy earthworks around the capital gates. Wolf whispers of back-channel peace feelers through Northern copperheads. The fate of the Confederacy may be decided in the next ten days of fighting.",
    letterTarget: "your wife Mary",
    sourceNotes: "OR ser. 1 vol. 11 pt. 2 pp. 489-996 (Lee's reports and subordinate filings); Freeman, R.E. Lee vol. II ch. 11-14; Battles and Leaders vol. II pp. 319-405; Henderson, Stonewall Jackson vol. II ch. 14.",
    period_voice: "Lee to Davis, June 5 1862, on assuming field command: \"I shall endeavor to do my duty, and trust to the smiles of a kind Providence.\" (Freeman, R.E. Lee vol. II p. 78, citing Lee's manuscript letterbook.)",
    primerTags: ["conscription_substitution", "civil_war_medicine", "army_technology_advancement"],
    choices: [
      {
        id: "option_a",
        text: "Launch aggressive assault on Fitz John Porter's right flank at Mechanicsville.",
        proposer: "hotspur",
        costDescription: "High Military Strength cost, saves Richmond from siege.",
        effects: {
          metrics: { militaryStrength: -25, munitions: -20, publicMorale: +25 },
          shards: { hotspur: +25, fox: -10 }
        },
        consequence: "A bloody repulse at Mechanicsville, but the sheer aggression and unexpected counter-attacks panicked McClellan, forcing his army into a retreat down the Peninsula. The Seven Days have begun in fire."
      },
      {
        id: "option_b",
        text: "Form heavy earthwork fortifications around the Richmond perimeter.",
        proposer: "fox",
        costDescription: "Saves resources, but allows Union heavy siege guns to deploy.",
        effects: {
          metrics: { militaryStrength: -5, munitions: -5, publicMorale: -15 },
          shards: { fox: +25, hotspur: -15 }
        },
        consequence: "Earthworks held, but McClellan successfully deployed siege mortars, pounding Richmond outskirts daily. The capital survived, but at terrible cost to civilian morale."
      },
      {
        id: "option_c",
        text: "Initiate back-channel peace proposals through northern copperheads.",
        proposer: "wolf",
        minDivergence: 0.12,
        costDescription: "Drains Treasury, high strategic divergence. Unlocked on Drifting timelines.",
        effects: {
          metrics: { treasury: -15, publicMorale: +15, divergenceIndex: +0.15 },
          shards: { wolf: +30, fox: -10 }
        },
        consequence: "Copperhead networks amplified the peace signals. Northern morale staggered, but McClellan's lines remained intact. The war continues, but the political landscape has shifted."
      },
      {
        id: "option_d",
        text: "Redirect Stuart's cavalry to execute a complete circular flank ride.",
        proposer: "sovereign",
        costDescription: "Consumes 15 Munitions, minor military payoff, massive intelligence gain.",
        effects: {
          metrics: { munitions: -15, militaryStrength: -5, publicMorale: +15 },
          shards: { fox: +15, wolf: +10 }
        },
        consequence: "Stuart successfully rode entirely around McClellan's army, capturing vital blueprints, logistics maps, and even McClellan's own dispatch book. A daring coup that will echo through the war."
      }
    ]
  },

{
    id: "shiloh_army_of_tennessee",
    turn: 4,
    date: "April 6-7, 1862",
    actor: "General Albert Sidney Johnston",
    roleLabel: "Western Theater Commander",
    image: "/images/cw_pictures/Shiloh AI Gen.jpeg",
    title: "Shiloh - The Army of Tennessee",
    description: "Grant's army is exposed near Pittsburg Landing, and Confederate columns have achieved surprise after a difficult concentration through the Tennessee woods. The chance is enormous: a decisive victory could throw Union forces back from the river, preserve Western Tennessee, and give the Army of Tennessee the kind of command cohesion Lee later forged in Virginia. But the attack is disordered, the corps are hard to control, river and rail lifelines are already under pressure, and Johnston's own presence at the front risks the one commander who might keep the Western army from breaking into missed chances and recrimination.",
    letterTarget: "President Jefferson Davis",
    primerTags: ["shiloh_western_theater", "conscription_substitution"],
    choices: [
      {
        id: "option_a",
        text: "Press Johnston forward personally to drive Grant away from Pittsburg Landing.",
        proposer: "hotspur",
        costDescription: "High command risk, strong chance of decisive battlefield shock.",
        effects: {
          metrics: { militaryStrength: -18, munitions: -12, publicMorale: +24, divergenceIndex: +0.08 },
          shards: { hotspur: +28, fox: -12 }
        },
        consequence: "The assault gains terrifying momentum, but the army's cohesion now depends on Johnston remaining alive and visible in the smoke. Victory and strategic self-mutilation move dangerously close together."
      },
      {
        id: "option_b",
        text: "Keep Johnston behind the main line and impose a tighter command reserve.",
        proposer: "fox",
        costDescription: "Less immediate shock, better chance of preserving Western command cohesion.",
        effects: {
          metrics: { militaryStrength: +6, munitions: -6, publicMorale: +4 },
          shards: { fox: +28, hotspur: -10 }
        },
        consequence: "The attack loses some fury, but the army keeps a clearer chain of command. The larger strategic prize is not just one battlefield; it is whether the Western army can become something more coherent than a temporary coalition."
      },
      {
        id: "option_c",
        text: "Exploit the victory narrative to seek mediation talk and Northern peace pressure.",
        proposer: "wolf",
        costDescription: "Treasury cost, diplomatic divergence, limited tactical coordination.",
        effects: {
          metrics: { treasury: -14, publicMorale: +10, divergenceIndex: +0.06 },
          shards: { wolf: +26, hotspur: -4 }
        },
        consequence: "Dispatches frame Shiloh as proof that the Union cannot easily conquer the Mississippi Valley. Recognition remains distant, but mediation talk becomes easier when the Western war still looks undecided."
      },
      {
        id: "option_d",
        text: "Prioritize depots, river crossings, and industrial evacuation over pursuit.",
        proposer: "sovereign",
        costDescription: "Lower glory, stronger Western logistics and industry preservation.",
        effects: {
          metrics: { munitions: +10, treasury: +8, publicMorale: -5 },
          shards: { fox: +14, wolf: +8 }
        },
        consequence: "The army gives up part of the pursuit to protect what makes campaigning in the West possible: river access, workshops, depots, and rail movement. It is less dramatic than a battlefield rout, but strategically harder to replace."
      }
    ]
  },

{
    id: "first_winchester",
    turn: 5,
    date: "May 25, 1862",
    actor: "Maj. Gen. Thomas J. Jackson",
    roleLabel: "Valley District Commander",
    image: thirdWinchesterCard,
    title: "First Winchester — Gates of the Lower Valley",
    description: "The Shenandoah lies at its greenest: apple orchards in bloom, wheat rippling beyond stone fences, and the Valley Pike shining pale through the folds of the Blue Ridge. Yet beauty masks urgency. Banks is trying to keep a Federal foothold at Winchester, and with it a corridor through which the Union can requisition the lower Valley's flour, cattle, and draft animals. If you break him here, the Valley remains a Confederate granary and a shield for Richmond. If you fail, the breadbasket opens to enemy seizure and the lower Valley becomes a route of ruin instead of supply.",
    letterTarget: "your wife Anna",
    primerTags: ["shenandoah_valley_campaign", "women_in_the_war"],
    choices: [
      {
        id: "option_a",
        text: "Drive straight through Winchester at dawn and try to shatter Banks before he can escape north.",
        proposer: "hotspur",
        costDescription: "High battlefield risk, strong morale swing, best chance at a major food recovery.",
        successRate: 0.55,
        successEffects: {
          metrics: { militaryStrength: -12, munitions: -10, publicMorale: +20, foodSupply: +16, divergenceIndex: +0.05 },
          shards: { hotspur: +28, fox: -10 }
        },
        successConsequence: "Jackson's attack cracks Banks in the streets and on the turnpikes beyond town. Flour, livestock, and wagon stores are gathered before the Federals can burn them, and the lower Valley again feels like a Confederate storehouse instead of a corridor of retreat.",
        failureEffects: {
          metrics: { militaryStrength: -24, munitions: -12, publicMorale: +4, foodSupply: -8 },
          shards: { hotspur: +10, fox: -18 }
        },
        failureConsequence: "The assault reaches Winchester but not in sufficient order to trap Banks. He slips north after wrecking depots and driving off wagons, leaving the Valley greener than ever to the eye and poorer than ever in your commissary books."
      },
      {
        id: "option_b",
        text: "Advance on the Valley Pike in disciplined order, taking mills, wagons, and the town intact where possible.",
        proposer: "fox",
        costDescription: "Lower shock, steadier command control, strong gain in preserved food and transport.",
        effects: {
          metrics: { militaryStrength: -8, munitions: -6, publicMorale: +10, foodSupply: +14 },
          shards: { fox: +28, hotspur: -10 }
        },
        consequence: "Banks is pushed out without a theatrical annihilation, but the town, flour mills, and wagon parks are taken in usable condition. It is the kind of Valley victory quartermasters remember long after newspapers forget it."
      },
      {
        id: "option_c",
        text: "Use Ashby's horse and valley civilians to turn the retreat into panic while your infantry closes deliberately.",
        proposer: "wolf",
        costDescription: "Treasury cost, political humiliation for the Union, moderate food gain through captured stores.",
        effects: {
          metrics: { treasury: -10, publicMorale: +12, foodSupply: +8, divergenceIndex: +0.08 },
          shards: { wolf: +30, fox: +5, hotspur: -8 }
        },
        consequence: "Rumor, cavalry pressure, and local intelligence make Banks's retreat look larger and uglier than it is. The Valley's people see Confederate command as present and competent, and enough wagons are seized to stiffen future rations."
      },
      {
        id: "option_d",
        text: "Swing wide over the ridges and cut the Baltimore road, prioritizing herd seizure and depot capture over a set-piece town fight.",
        proposer: "sovereign",
        costDescription: "Operational divergence, moderate losses, strongest raw food haul if the trap closes.",
        effects: {
          metrics: { militaryStrength: -10, munitions: -8, treasury: +6, foodSupply: +18, divergenceIndex: +0.12 },
          shards: { fox: +12, wolf: +12 }
        },
        consequence: "The maneuver treats Winchester as a logistics problem rather than a single battlefield. Herds, flour, and rail stores are pulled south in quantity, and the Valley begins feeding later campaigns instead of merely inspiring them."
      }
    ]
  },

{
    id: "second_manassas",
    turn: 7,
    date: "August 29, 1862",
    actor: "General Robert E. Lee",
    roleLabel: "Army Commander",
    image: secondManassasCard,
    title: "Second Battle of Manassas — The Trap",
    description: "Jackson has successfully lured Pope's Union army into attacking his hidden line along the Stony Ridge railway cut. For two days the 'foot cavalry' has absorbed the blows, drawing the enemy deeper into the trap. Longstreet's massive wing has arrived on Pope's exposed flank, but Longstreet hesitates, preferring a reconnaissance-in-force. The moment for the decisive blow is slipping away. If Pope realizes the danger and withdraws, the opportunity of the war may be lost. The eyes of the South are upon this ridge.",
    letterTarget: "your daughter Mildred",
    primerTags: ["cotton_diplomacy", "copperhead_politics"],
    choices: [
      {
        id: "option_a",
        text: "Order Longstreet to launch an immediate, massive flank attack.",
        proposer: "hotspur",
        costDescription: "Consumes 25 Military Strength, sweeps Pope from the field.",
        effects: {
          metrics: { militaryStrength: -25, munitions: -20, publicMorale: +30 },
          shards: { hotspur: +30, fox: -15 }
        },
        consequence: "The largest flank attack of the war. Longstreet crushed the Union left, forcing Pope into a chaotic retreat to Washington. The South's greatest tactical victory of the war."
      },
      {
        id: "option_b",
        text: "Approve Longstreet's reconnaissance in force. Hold defensive positions until the second dawn.",
        proposer: "fox",
        maxDivergence: 0.40,
        costDescription: "Preserves military cores, but allows Pope to reinforce. Unavailable on highly diverged timelines.",
        effects: {
          metrics: { militaryStrength: -5, munitions: -10, publicMorale: +10 },
          shards: { fox: +25, hotspur: -20 }
        },
        consequence: "Pope detected the flank force and executed a structured night withdrawal, escaping the trap. The moment passed. The war will be longer for it."
      },
      {
        id: "option_c",
        text: "Exploit captured dispatches and Northern press confusion before Pope can rebuild his story.",
        proposer: "wolf",
        costDescription: "Consumes treasury, boosts political pressure without another foreign-recognition ask.",
        effects: {
          metrics: { treasury: -10, munitions: +8, publicMorale: +8 },
          shards: { wolf: +25, fox: +4, hotspur: -8 }
        },
        consequence: "Stuart's intelligence haul and Pope's public embarrassment become the weapon. Richmond turns the victory into confusion inside the Union command system rather than another appeal to Europe."
      },
      {
        id: "option_d",
        text: "Order Stuart to execute a midnight raid on Pope's logistics depot at Catlett's Station.",
        proposer: "sovereign",
        costDescription: "Yields massive Munitions and Treasury.",
        effects: {
          metrics: { munitions: +35, treasury: +20, militaryStrength: -5 },
          shards: { fox: +15, hotspur: +10 }
        },
        consequence: "Incredible success. Stuart captured Pope's personal dispatch book and 300,000 dollars in treasury bonds. The intelligence haul will shape the next phase of the war."
      }
    ],
    branches: [
      { minDivergence: 0.22, scenarioId: "potomac_leverage_campaign" }
    ]
  },

{
    id: "antietam",
  turn: 8,
    date: "September 17, 1862",
    actor: "General Robert E. Lee",
    roleLabel: "Army Commander",
    image: antietamCard,
    title: "Battle of Antietam — Sharpsburg Threshold",
    description: "Your army is backed against the Potomac River near Sharpsburg. McClellan has discovered your lost order 191 and is launching massive, consecutive assaults on your left flank at the Cornfield and center at the Bloody Lane. Your lines are at breaking point. The sun rises on what will become the bloodiest single day in American history. A single mistake here could end the Confederate cause. Yet a victory could force European recognition and break the Union will. The weight of the nation rests on these corn rows and sunken roads.",
    letterTarget: "your wife Mary",
    sourceNotes: "OR ser. 1 vol. 19 pt. 1 pp. 25-198 (reports of Lee, McClellan, Hooker, Sumner); Freeman, R.E. Lee vol. II ch. 25-26; Battles and Leaders vol. II pp. 545-682; Henderson, Stonewall Jackson vol. II ch. 20.",
    period_voice: "Lee to Jefferson Davis after Sharpsburg, September 20 1862: \"The Army of Northern Virginia held the field one entire day, and during the ensuing night quietly recrossed into Virginia in good order and without loss.\" (OR ser. 1 vol. 19 pt. 1 p. 142)",
    primerTags: ["cotton_diplomacy", "civil_war_medicine", "death_in_the_civil_war"],
    choices: [
      {
        id: "option_a",
        text: "Stand firm in the Bloody Lane. Order a desperate bayonet counter-charge.",
        proposer: "hotspur",
        costDescription: "Catastrophic Military casualties, absolute survival threshold.",
        effects: {
          metrics: { militaryStrength: -35, munitions: -25, publicMorale: +10 },
          shards: { hotspur: +30, fox: -30 }
        },
        next: "emancipation_cabinet_debate",
        consequence: "The lane held by a thread, but the division was utterly mangled. The field is a slaughterhouse. The bloodiest day in American history ends in tactical stalemate."
      },
      {
        id: "option_b",
        text: "Order structured tactical withdrawal across the Potomac during the night.",
        proposer: "fox",
        costDescription: "Preserves the army core, but concludes the Northern invasion.",
        effects: {
          metrics: { militaryStrength: -5, publicMorale: -20, treasury: +5 },
          shards: { fox: +25, hotspur: -20 }
        },
        next: "emancipation_cabinet_debate",
        consequence: "Orderly retreat completed. The army survived to fight another day, but the retreat allowed Lincoln to issue the Emancipation Proclamation. The war has changed forever."
      },
      {
        id: "option_c",
        text: "Leverage the Maryland copperhead networks to delay Union supply trains.",
        proposer: "wolf",
        costDescription: "Consumes 20 Treasury, slightly reduces Union pressure.",
        effects: {
          metrics: { treasury: -20, munitions: +10, publicMorale: +5 },
          shards: { wolf: +25, fox: 0 }
        },
        next: "emancipation_cabinet_debate",
        consequence: "Train lines sabotaged, slowing McClellan's ammunition wagons and stabilizing the line. The battle ends in bloody stalemate, but the South lives to fight on."
      },
      {
        id: "option_d",
        text: "Execute a dangerous tactical flank march through the Potomac canal beds.",
        proposer: "sovereign",
        minDivergence: 0.15,
        costDescription: "High divergence, massive military risk. Unlocked on Drifting timelines.",
        effects: {
          metrics: { militaryStrength: -20, munitions: -10, divergenceIndex: +0.25 },
          shards: { hotspur: +10, wolf: +10 }
        },
        next: "emancipation_cabinet_debate",
        consequence: "Brilliant maneuver. You completely bypassed McClellan's right flank, slipping into his rear. A daring escape that preserves the army but cedes the strategic initiative."
      }
    ]
  },

{
    id: "potomac_leverage_campaign",
  turn: 8,
    date: "September 1862",
    actor: "General Robert E. Lee",
    roleLabel: "Army Commander",
    image: antietamCard,
    title: "The Potomac Leverage Campaign — Maryland In Doubt",
    description: "Victory at Second Manassas has not yet funneled you into the historical killing ground at Sharpsburg. Instead, the army is moving through a Maryland landscape full of frightened militia, wavering civilians, and vulnerable depots while Washington struggles to understand whether Lee means to strike Baltimore, sever the railroads, or merely loot and withdraw. The question is whether this wider shock can be converted into political leverage before shoes wear through, enlistments expire, and McClellan finally concentrates his masses.",
    primerTags: ["cotton_diplomacy", "border_state_bargain", "copperhead_politics"],
    letterTarget: "your wife Mary",
    choices: [
      {
        id: "option_a",
        text: "Drive hard for the Baltimore & Ohio corridor and force Maryland into open panic.",
        proposer: "hotspur",
        costDescription: "Heavy military strain, strong morale surge, major divergence.",
        effects: {
          metrics: { militaryStrength: -20, munitions: -15, publicMorale: +20, divergenceIndex: +0.12 },
          shards: { hotspur: +25, fox: -15 }
        },
        next: "emancipation_cabinet_debate",
        consequence: "Rail bridges and depots fall in quick succession, and Maryland politics tremble. The advance thrills the South, but every mile north worsens straggling and supply exhaustion."
      },
      {
        id: "option_b",
        text: "Consolidate around Frederick and force the Union to attack a prepared line.",
        proposer: "fox",
        costDescription: "Lower losses, steadier supply position, modest divergence.",
        effects: {
          metrics: { militaryStrength: -8, munitions: -8, publicMorale: +10, treasury: +5, divergenceIndex: +0.06 },
          shards: { fox: +25, hotspur: -10 }
        },
        next: "emancipation_cabinet_debate",
        consequence: "The army stops lunging for a decisive blow and begins acting like an occupying force with prepared positions. The campaign loses romance, but gains order."
      },
      {
        id: "option_c",
        text: "Flood European consuls and the Northern press with peace feelers while the invasion still shocks opinion.",
        proposer: "wolf",
        costDescription: "Treasury strain, diplomatic upside, strong political divergence.",
        effects: {
          metrics: { treasury: -18, publicMorale: +8, divergenceIndex: +0.15 },
          shards: { wolf: +30, fox: +5, hotspur: -10 }
        },
        next: "emancipation_cabinet_debate",
        consequence: "British and French observers begin treating the Maryland campaign as a political crisis rather than just another raid. Recognition still does not come, but the war's diplomatic tempo changes."
      },
      {
        id: "option_d",
        text: "Strip Maryland depots of shoes, grain, and horses, then slip back across the Potomac on your own timetable.",
        proposer: "sovereign",
        costDescription: "Moderate military cost, strong supply gain, continued divergence.",
        effects: {
          metrics: { militaryStrength: -10, munitions: +15, treasury: +20, divergenceIndex: +0.08 },
          shards: { fox: +15, wolf: +10 }
        },
        next: "emancipation_cabinet_debate",
        consequence: "The army leaves with wagons full of hard material instead of one climactic battlefield legend. It is less glorious than Antietam, but materially better for keeping the army alive."
      }
    ]
  },

{
    id: "emancipation_cabinet_debate",
  turn: 9,
    interlude: true,
    date: "September 22, 1862",
    actor: "President Abraham Lincoln",
    roleLabel: "Union Civil Executive",
    image: "/images/cw_pictures/Lincoln Cabinet.jpeg",
    title: "Emancipation Proclamation — Cabinet, Manpower, and Europe",
    description: "After the Maryland Campaign gives Washington a battlefield footing, Lincoln brings the cabinet back to a question he has already been carrying: whether emancipation should now be announced as a war measure. The policy could unsettle parts of Northern opinion and the border-state coalition, but it also changes the manpower question by opening a clearer path toward Black enlistment in Union service. It also makes British or French intervention diplomatically harder, because recognition of the Confederacy would now look less like mediation between belligerents and more like aid to a slaveholding republic against a government fighting slavery as a war aim.",
    letterTarget: "the cabinet and War Department",
    sourceNotes: "Lincoln, Preliminary Emancipation Proclamation, September 22 1862; OR ser. 3 vol. 2 pp. 407-409; Lincoln, Annual Message to Congress, December 1 1862; Salmon P. Chase diary entries on the cabinet debates.",
    primerTags: ["emancipation_war_measure", "cotton_diplomacy", "conscription_substitution"],
    choices: [
      {
        id: "option_a",
        text: "Issue the preliminary proclamation now and prepare recruitment machinery for Black soldiers.",
        proposer: "hotspur",
        costDescription: "Lower Public Morale, stronger Union Military Strength, slight timeline drift.",
        effects: {
          metrics: { militaryStrength: +8, publicMorale: -6, treasury: -4, divergenceIndex: +0.04 },
          shards: { hotspur: +10, wolf: +8, fox: -4 }
        },
        next: "fredericksburg_winter_politics",
        consequence: "The proclamation becomes a military instrument as well as a political one. Northern unease rises in some districts, but the Union gains a clearer path to new fighting men and makes European recognition of the Confederacy harder to defend."
      },
      {
        id: "option_b",
        text: "Delay until the army wins another clear field result and the border states can be steadied.",
        proposer: "fox",
        costDescription: "Small morale protection, weak manpower gain, little timeline impact.",
        effects: {
          metrics: { militaryStrength: +3, publicMorale: -2, treasury: +2, divergenceIndex: +0.01 },
          shards: { fox: +8, wolf: -4, hotspur: -2 }
        },
        next: "fredericksburg_winter_politics",
        consequence: "The administration avoids the sharpest immediate backlash, but also loses some of the momentum created by Antietam. Recruitment policy remains less clear, and Europe receives a less decisive signal."
      },
      {
        id: "option_c",
        text: "Issue it and send diplomatic instructions framing intervention as aid to slavery.",
        proposer: "wolf",
        costDescription: "Treasury cost and morale strain, strong diplomatic positioning.",
        effects: {
          metrics: { militaryStrength: +6, publicMorale: -5, treasury: -8, divergenceIndex: +0.05 },
          shards: { wolf: +14, fox: +4, hotspur: -2 }
        },
        next: "fredericksburg_winter_politics",
        consequence: "Seward's department turns the proclamation into a foreign-policy weapon. The Union pays for the political shock at home, but British and French leaders now face a much higher cost if they move toward recognition."
      },
      {
        id: "option_d",
        text: "Keep policy narrow: confiscation enforcement, compensated schemes, and border-state pressure.",
        proposer: "sovereign",
        costDescription: "Protects morale, but leaves manpower and diplomacy weaker.",
        effects: {
          metrics: { militaryStrength: +2, publicMorale: +2, treasury: +2 },
          shards: { fox: +8, wolf: -8, hotspur: -4 }
        },
        next: "fredericksburg_winter_politics",
        consequence: "The cabinet buys time and preserves more of the old coalition, but the war aim remains less forceful. The Union gains fewer immediate recruits and gives Europe more room to treat the war as a conventional separation crisis."
      }
    ]
  },

{
    id: "fredericksburg_winter_politics",
  turn: 9,
    date: "December 1862 - January 1863",
    actor: "President Jefferson Davis",
    roleLabel: "Commander-in-Chief",
    image: antietamCard,
    title: "Fredericksburg and Winter Camps — The Rappahannock Interlude",
    description: "Burnside's assaults have been smashed against Marye's Heights, and the Army of Northern Virginia stands victorious above the Rappahannock. Yet victory has not solved the Confederacy's real winter problems. Shoes are short, furloughs are politicized, governors resent Richmond impressments, and the army that will need to fight again in 1863 is shivering in muddy camps. Along the riverbanks, burial flags, exchanged newspapers, and brief Christmas-week fraternization show that the soldiers remain human even as the governments harden. The question now is whether Fredericksburg becomes a springboard for bold action or a disciplined pause that rebuilds the army, the railroads, and the home front.",
    letterTarget: "your wife Varina",
    primerTags: ["impressment_bread_riots", "conscription_substitution", "faith_in_the_armies"],
    choices: [
      {
        id: "option_a",
        text: "Exploit the victory immediately and prepare a winter stroke before the Union recovers.",
        proposer: "hotspur",
        costDescription: "High military strain, morale surge, modest divergence.",
        effects: {
          metrics: { militaryStrength: -18, munitions: -14, publicMorale: +18, divergenceIndex: +0.08 },
          shards: { hotspur: +25, fox: -15 }
        },
        consequence: "The government treats Fredericksburg not as a breathing space but as proof that one more sharp blow might crack Northern confidence. The army's pride rises, but winter roads, hunger, and fatigue make the gamble expensive before it even begins."
      },
      {
        id: "option_b",
        text: "Stabilize the winter camps, improve issue discipline, and permit controlled burial flags and Christmas-week riverbank exchanges.",
        proposer: "fox",
        costDescription: "Treasury cost, stronger morale recovery, better spring readiness.",
        effects: {
          metrics: { treasury: -8, militaryStrength: +6, munitions: +4, publicMorale: +14 },
          shards: { fox: +28, hotspur: -10 }
        },
        consequence: "Winter quarters improve, shoes and rations arrive more regularly, and the famous fraternization scenes along the Rappahannock cool panic without weakening discipline. It is not romantic peace, but it keeps the army from rotting between campaigns."
      },
      {
        id: "option_c",
        text: "Turn Fredericksburg into a political offensive: publicize Union losses, press prisoner exchange, and widen Northern peace agitation.",
        proposer: "wolf",
        costDescription: "Treasury strain, political leverage, moderate divergence.",
        effects: {
          metrics: { treasury: -12, publicMorale: +10, divergenceIndex: +0.10 },
          shards: { wolf: +30, fox: +5, hotspur: -10 }
        },
        consequence: "Fredericksburg is marketed not merely as a battlefield success, but as evidence that continued Northern assaults will buy only slaughter. Peace editors and exchange advocates gain new material, even if Lincoln's government does not bend."
      },
      {
        id: "option_d",
        text: "Push winter logistics outward to the states: shoes, militia backfill, rail stockpiles, and governor-managed furlough discipline.",
        proposer: "sovereign",
        costDescription: "Moderate supply gain, stronger state cooperation, limited divergence.",
        effects: {
          metrics: { treasury: +6, militaryStrength: +4, munitions: +10, publicMorale: +6, divergenceIndex: +0.04 },
          shards: { fox: +12, wolf: +12, hotspur: -4 }
        },
        consequence: "Richmond stops pretending it can micromanage every boot and furlough from the center. Governors grumble less, quartermasters move faster, and the army enters spring less glamorous but materially better prepared."
      }
    ]
  },

{
    id: "chancellorsville_maneuver",
  turn: 10,
    date: "May 2, 1863",
    actor: "General Robert E. Lee",
    roleLabel: "Commander of Northern Virginia",
    image: chancellorsvilleCard,
    title: "The Chancellorsville Gamble — Jackson's Flank March",
    description: "Hooker has crossed the Rappahannock with superior numbers and believes he has forced Lee into retreat. Instead, the Army of Northern Virginia is hidden in the tangled Wilderness around Chancellorsville, with Stuart's cavalry screening the roads and Jackson studying the exposed Union right near the Orange Plank Road. The army is outnumbered, Sedgwick still threatens Fredericksburg, and every hour of delay gives Hooker time to entrench. Lee and Jackson now consider the most dangerous decision of the campaign: divide an already smaller army, send Jackson on a long concealed march, and strike the Union flank before nightfall.",
    letterTarget: "General Jackson",
    sourceNotes: "OR ser. 1 vol. 25 pt. 1 pp. 171-1029 (reports of Lee, Jackson's staff, Hooker, Howard); Freeman, Lee's Lieutenants vol. II ch. 27-30; Henderson, Stonewall Jackson vol. II ch. 24; Hotchkiss, Make Me a Map of the Valley pp. 117-132 (campaign maps).",
    period_voice: "Lee in conversation with Jackson on the night of May 1 1863, as recorded by Jackson's staff: \"How can we get at those people?\" — Jackson, after Stuart's reconnaissance: \"General, my troops will move at four o'clock.\" (Henderson, Stonewall Jackson vol. II p. 412)",
    primerTags: ["impressment_bread_riots", "faith_in_the_armies"],
    choices: [
      {
        id: "option_a",
        next: "chancellorsville_aftermath",
        text: "Approve Jackson's concealed flank march around the Union right.",
        proposer: "hotspur",
        costDescription: "High tactical risk, strong morale upside, historical maneuver.",
        effects: {
          metrics: { militaryStrength: -10, munitions: -8, publicMorale: +18 },
          shards: { hotspur: +25, fox: -10 }
        },
        consequence: "Jackson's column disappears through the Wilderness roads while Lee holds Hooker's attention with a thin front. If the march stays hidden, the Union XI Corps will be hit from an angle it does not believe possible."
      },
      {
        id: "option_b",
        next: "chancellorsville_aftermath",
        text: "Refuse the split and form a compact defensive line near Chancellorsville.",
        proposer: "fox",
        costDescription: "Preserves strength, sacrifices the chance for a decisive blow.",
        effects: {
          metrics: { militaryStrength: +4, munitions: +4, publicMorale: -6 },
          shards: { fox: +25, hotspur: -15 }
        },
        consequence: "The army digs in and denies Hooker an easy breakthrough, but the campaign becomes a grinding contest of artillery, supply, and attrition rather than Lee's audacious envelopment."
      },
      {
        id: "option_c",
        next: "chancellorsville_aftermath",
        text: "Use Stuart and local guides to feint toward United States Ford while Jackson probes the flank.",
        proposer: "wolf",
        costDescription: "Diplomatic narrative gain, moderate divergence, smaller tactical payoff.",
        effects: {
          metrics: { treasury: -6, publicMorale: +8, divergenceIndex: +0.05 },
          shards: { wolf: +25, hotspur: +5 }
        },
        consequence: "Rumors and cavalry screens convince Hooker that Lee is hunting his crossings. Jackson gains time, but the deception requires delicate coordination across bad roads and unreliable reports."
      },
      {
        id: "option_d",
        next: "chancellorsville_aftermath",
        text: "Launch a direct pressure attack before Hooker completes his entrenchments.",
        proposer: "sovereign",
        costDescription: "Heavy immediate cost, less dependency on secrecy.",
        effects: {
          metrics: { militaryStrength: -18, munitions: -15, publicMorale: +8 },
          shards: { hotspur: +10, fox: +5 }
        },
        consequence: "The attack shocks the Union front but spends men quickly in the thickets. Lee avoids the hazards of a divided army, yet gives up the possibility of collapsing Hooker's flank in one stroke."
      }
    ]
  },

{
    id: "chancellorsville_aftermath",
  turn: 11,
    date: "May 2-3, 1863",
    actor: "Lt. Gen. Thomas J. Jackson",
    roleLabel: "Second Corps Commander",
    image: chancellorsvilleCard,
    title: "Chancellorsville Breakthrough — Dusk on the Union Right",
    description: "Jackson's march has reached the Union flank after hours of dust, silence, and bad Wilderness roads. Howard's XI Corps is exposed near Dowdall's Tavern, with campfires burning and stacked muskets suggesting that many Union soldiers still believe the Confederate movement was a retreat. Lee waits with a thin line in Hooker's front while Jackson prepares to unleash his corps from the woods. The opportunity is enormous, but darkness is falling, formations are stretched along narrow roads, and a reckless pursuit could scatter command control in the same thickets that made the surprise possible.",
    letterTarget: "General Lee",
    primerTags: ["faith_in_the_armies", "women_in_the_war", "death_in_the_civil_war"],
    choices: [
      {
        id: "option_a",
        text: "Drive Jackson's corps hard into the exposed XI Corps before nightfall.",
        proposer: "hotspur",
        costDescription: "High combat cost, decisive battlefield upside.",
        effects: {
          metrics: { militaryStrength: -16, munitions: -14, publicMorale: +24 },
          shards: { hotspur: +25, fox: -15 }
        },
        consequence: "The Union right collapses in a wave of panic as Jackson's lines burst from the woods. The victory is immense, but the pursuit pushes command into darkness and confusion."
      },
      {
        id: "option_b",
        next: "gettysburg_with_jackson_setup",
        text: "Halt after the flank rupture, keep Jackson off a night reconnaissance, and let Lee close the trap at dawn.",
        proposer: "fox",
        costDescription: "Preserves strength, reduces the chance of total rout, and keeps Jackson alive for the next campaign.",
        effects: {
          metrics: { militaryStrength: +8, munitions: +4, publicMorale: +10, divergenceIndex: +0.06 },
          shards: { fox: +25, hotspur: -10 }
        },
        consequence: "Jackson's men stop short of exhaustion and reform their lines. Hooker survives the night with more of his army intact, but Jackson is not exposed to the confused darkness that historically destroyed the Confederacy's most aggressive battlefield lieutenant."
      },
      {
        id: "option_c",
        text: "Exploit the victory with dispatches to Europe and Northern peace editors.",
        proposer: "wolf",
        costDescription: "Treasury cost, diplomatic divergence, moderate battlefield restraint.",
        effects: {
          metrics: { treasury: -16, publicMorale: +12, divergenceIndex: +0.06 },
          shards: { wolf: +30, hotspur: -5 }
        },
        consequence: "The battlefield success becomes a political instrument before casualty lists harden the mood. Foreign observers do not recognize the Confederacy, but they begin reading Chancellorsville as proof that the war is not nearing a simple Union victory."
      },
      {
        id: "option_d",
        text: "Detach cavalry and guides to seal the fords before Hooker can retreat.",
        proposer: "sovereign",
        costDescription: "Operational divergence, supply gain, risk of overextension.",
        effects: {
          metrics: { treasury: +12, militaryStrength: -10, munitions: -6, divergenceIndex: +0.08 },
          shards: { fox: +15, wolf: -5 }
        },
        consequence: "Confederate horsemen race for the crossings and supply roads. The move threatens Hooker's escape routes, but every detached regiment makes Lee's central line thinner."
      }
    ]
  },

{
    id: "gettysburg_campaign_setup",
  turn: 12,
    date: "June 30 - July 1, 1863",
    actor: "General Robert E. Lee",
    roleLabel: "Commander of Northern Virginia",
    image: gettysburgCard,
    title: "Pennsylvania Campaign — Before Gettysburg Fixes the Map",
    description: "The invasion of Pennsylvania has reached the dangerous point where a campaign of road junctions, shoes, missing cavalry, and half-seen corps movements can harden into the most famous battle of the war. Ewell's columns are spread toward Carlisle and York, Longstreet is closing up from the west, Stuart has not fully restored Lee's picture of the enemy, and Meade is trying to concentrate faster than the Army of Northern Virginia can feed itself. Gettysburg matters not because destiny demands it, but because the road network, the depot rumors, and the pressure for one decisive Northern victory are all converging there at once.",
    letterTarget: "President Jefferson Davis",
    primerTags: ["cotton_diplomacy", "copperhead_politics"],
    choices: [
      {
        id: "option_a",
        next: "gettysburg_decision",
        text: "Concentrate hard on Gettysburg and force the battle before Meade fully settles his line.",
        proposer: "hotspur",
        costDescription: "Higher battlefield strain, morale gain, locks in a decisive fight.",
        effects: {
          metrics: { militaryStrength: -12, munitions: -10, publicMorale: +18 },
          shards: { hotspur: +25, fox: -12 }
        },
        consequence: "The campaign stops wandering and snaps toward collision. The army moves with urgency for the road hub, accepting that the invasion will likely be judged in one concentrated battle."
      },
      {
        id: "option_b",
        next: "gettysburg_decision",
        text: "Tighten the South Mountain screens, find Stuart, and make Meade fight a prepared line instead of an accidental town battle.",
        proposer: "fox",
        costDescription: "Lower losses, better coordination, modest momentum loss.",
        effects: {
          metrics: { militaryStrength: -6, munitions: -6, treasury: +6, publicMorale: +10 },
          shards: { fox: +28, hotspur: -10 }
        },
        consequence: "Lee resists being dragged into battle by rumor and road dust alone. The army's shape improves, but every hour spent clarifying the picture lets the Union line grow firmer."
      },
      {
        id: "option_c",
        next: "susquehanna_offensive",
        text: "Widen the campaign toward the Susquehanna crossings and make Pennsylvania panic the main weapon.",
        proposer: "wolf",
        costDescription: "Treasury cost, political leverage, stronger divergence.",
        effects: {
          metrics: { treasury: -12, publicMorale: +8, divergenceIndex: +0.12 },
          shards: { wolf: +30, fox: +4, hotspur: -8 }
        },
        consequence: "Instead of allowing Gettysburg to become the whole story, the invasion is reframed as a broader political shock campaign aimed at roads, depots, and Northern nerves."
      },
      {
        id: "option_d",
        next: "gettysburg_decision",
        text: "Strip local depots for shoes, grain, and horses while delaying full engagement until the last practical moment.",
        proposer: "sovereign",
        costDescription: "Moderate strain, strong supply upside, less battlefield clarity.",
        effects: {
          metrics: { militaryStrength: -8, munitions: +10, treasury: +12, publicMorale: +6, divergenceIndex: +0.05 },
          shards: { fox: +10, wolf: +12 }
        },
        consequence: "The army gets what it came north to seek in material terms, but the campaign remains operationally muddy. When battle finally comes, it does so with fuller wagons and less certainty."
      }
    ]
  },

{
    id: "gettysburg_with_jackson_setup",
  turn: 12,
    date: "June 30 - July 1, 1863",
    actor: "General Robert E. Lee",
    roleLabel: "Commander of Northern Virginia",
    image: gettysburgCard,
    title: "Pennsylvania Campaign with Jackson — Tempo Before Contact",
    description: "Jackson's survival changes the invasion before a shot is fired at Gettysburg. Lee now possesses a corps commander whose instinct is to convert road information into rapid movement, not committee delay. That does not guarantee victory, but it changes the menu. The army can still stumble into a fixed battle, yet it can also drive faster for the heights, coordinate more tightly with Longstreet, or spread the pressure eastward against the Baltimore Pike and the Susquehanna depots before Meade fully understands where the real threat lies.",
    letterTarget: "President Jefferson Davis",
    primerTags: ["cotton_diplomacy", "copperhead_politics"],
    choices: [
      {
        id: "option_a",
        next: "gettysburg_with_jackson",
        text: "Drive Jackson hard toward the key heights and force the battle to move at his tempo.",
        proposer: "hotspur",
        costDescription: "Heavy strain, stronger immediate battlefield upside.",
        effects: {
          metrics: { militaryStrength: -10, munitions: -10, publicMorale: +18, divergenceIndex: +0.06 },
          shards: { hotspur: +25, fox: -10 }
        },
        consequence: "Lee gives the campaign to Jackson's speed. The army accepts confusion and fatigue in exchange for the chance to strike the high ground before the Union line becomes permanent."
      },
      {
        id: "option_b",
        next: "gettysburg_with_jackson",
        text: "Keep Jackson and Longstreet in deliberate alignment and refuse to let the battle harden accidentally.",
        proposer: "fox",
        costDescription: "Lower losses, stronger command coherence, less theatrical momentum.",
        effects: {
          metrics: { militaryStrength: -4, munitions: -4, treasury: +5, publicMorale: +12, divergenceIndex: +0.04 },
          shards: { fox: +30, hotspur: -12 }
        },
        consequence: "The value of Jackson surviving is used in the least romantic way possible: not for legend, but for timing, control, and the prevention of yet another improvised frontal catastrophe."
      },
      {
        id: "option_c",
        next: "susquehanna_offensive",
        text: "Use Jackson's mobility to threaten the Baltimore Pike and Susquehanna depots before committing to one fixed battlefield.",
        proposer: "wolf",
        costDescription: "Treasury strain, political leverage, campaign divergence.",
        effects: {
          metrics: { treasury: -10, publicMorale: +8, divergenceIndex: +0.14 },
          shards: { wolf: +30, fox: +5, hotspur: -8 }
        },
        consequence: "Jackson's survival turns Gettysburg from a single ridge-line drama into a wider campaign problem for the Union. Meade now has to defend roads and depots as well as a battlefield."
      },
      {
        id: "option_d",
        next: "gettysburg_with_jackson",
        text: "Keep the army dispersed long enough to harvest shoes and rail stores, then concentrate only if Meade blunders into reach.",
        proposer: "sovereign",
        costDescription: "Moderate strain, supply upside, delayed collision.",
        effects: {
          metrics: { militaryStrength: -6, munitions: +10, treasury: +12, publicMorale: +6, divergenceIndex: +0.08 },
          shards: { fox: +10, wolf: +12 }
        },
        consequence: "Jackson's presence is used to keep the campaign flexible rather than immediately decisive. The army becomes richer in material, but less certain of where and when the final clash will happen."
      }
    ]
  },

{
    id: "gettysburg_with_jackson",
  turn: 13,
    date: "July 1-2, 1863",
    actor: "General Robert E. Lee",
    roleLabel: "Commander of Northern Virginia",
    image: gettysburgCard,
    title: "Gettysburg with Jackson — The Unmade Left Hook",
    description: "Jackson survived Chancellorsville, and with him survived a very different kind of Confederate tempo. Gettysburg is no longer simply the story of Ewell hesitating on the first evening and Lee resorting to a frontal climax on the third day. With Jackson still in the army, Lee can consider a faster seizure of Cemetery Hill and Culp's Hill, a more coherent day-two envelopment, or a broader maneuver against the Baltimore Pike and Washington communications. The public knows this as one of the great what-ifs of the war because the difference is not abstract: it is the presence or absence of the commander most likely to turn opportunity into violent motion before the Union line fully hardens.",
    letterTarget: "President Jefferson Davis",
    primerTags: ["cotton_diplomacy", "copperhead_politics", "faith_in_the_armies"],
    choices: [
      {
        id: "option_a",
        text: "Let Jackson seize the high ground at once and roll the Union right before Meade fully anchors it.",
        proposer: "hotspur",
        costDescription: "Heavy battlefield cost, high upside, major divergence from the historical Gettysburg rhythm.",
        successRate: 0.5,
        successEffects: {
          metrics: { militaryStrength: -18, munitions: -16, publicMorale: +30, divergenceIndex: +0.22 },
          shards: { hotspur: +30, fox: -10 }
        },
        successConsequence: "Jackson's corps drives with the speed the public has always imagined. The Union right is hit before it settles, and Gettysburg becomes a decisive Confederate victory instead of a fixed artillery duel at Cemetery Ridge. Dispatches from London and Paris report that both governments are preparing recognition and a joint mediation offer.",
        failureEffects: {
          metrics: { militaryStrength: -30, munitions: -22, publicMorale: -8, divergenceIndex: +0.08 },
          shards: { hotspur: +10, fox: -20 }
        },
        failureConsequence: "Even with Jackson alive, the ground and the enemy are too strong for a clean seizure. The attack bites hard but not deeply enough, and the army pays for trying to win Gettysburg in one violent burst."
      },
      {
        id: "option_b",
        text: "Use Jackson to coordinate a dawn envelopment with Longstreet instead of drifting toward a frontal finale.",
        proposer: "fox",
        costDescription: "Lower losses, stronger operational coherence, moderate upside.",
        effects: {
          metrics: { militaryStrength: -4, munitions: -4, treasury: +6, publicMorale: +20, divergenceIndex: +0.08 },
          shards: { fox: +32, hotspur: -12 }
        },
        consequence: "Jackson's presence does not magically guarantee victory, but it gives Lee something he historically lacked at Gettysburg: a corps commander able to move fast, coordinate hard, and keep the battle from hardening into Pickett's doomed geometry."
      },
      {
        id: "option_c",
        text: "Exploit Jackson's survival to threaten the Baltimore Pike and seek armistice leverage before the battle settles.",
        proposer: "wolf",
        costDescription: "Treasury strain, political divergence, less battlefield decisiveness.",
        effects: {
          metrics: { treasury: -16, publicMorale: +10, divergenceIndex: +0.18 },
          shards: { wolf: +30, fox: +5, hotspur: -8 }
        },
        consequence: "Instead of betting everything on one ridge, Lee turns Jackson's mobility into political and logistical pressure. Washington feels the shock even if the battlefield outcome remains unresolved."
      },
      {
        id: "option_d",
        text: "Send Jackson on a wide turning movement to sever the Union rear and force Meade out of position.",
        proposer: "sovereign",
        costDescription: "Operational gamble, moderate supply gain, high command risk.",
        effects: {
          metrics: { militaryStrength: -18, munitions: -14, treasury: +6, divergenceIndex: +0.22 },
          shards: { fox: +12, wolf: +12, hotspur: +6 }
        },
        consequence: "The army avoids the simple frontal script altogether. Jackson ranges wider against roads and supply lines, making Gettysburg less famous as a single charge and more dangerous as a campaign of shifting pressure."
      }
    ],
    branches: [
      {
        minDivergence: 0,
        scenarioId: "gettysburg_recognition_crisis",
        requiredChoices: [
          { scenarioId: "shiloh_army_of_tennessee", choiceId: "option_b" },
          { scenarioId: "chancellorsville_aftermath", choiceId: "option_b" },
          { scenarioId: "gettysburg_with_jackson", choiceId: "option_a", choiceSucceeded: true }
        ]
      }
    ]
  },

{
    id: "gettysburg_recognition_crisis",
    turn: 0,
    interlude: true,
    date: "July 1863",
    actor: "President Jefferson Davis",
    roleLabel: "Civil Executive",
    image: "/images/cw_pictures/CSA Independence.jpeg",
    title: "International Recognition — Victory or a Longer War",
    description: "The alternate chain has produced the diplomatic break Richmond sought from the beginning. Albert Sidney Johnston survived Shiloh and kept the Western army coherent; Jackson survived Chancellorsville and helped turn Gettysburg into a decisive Confederate victory on Northern soil. Britain and France now announce recognition of the Confederate States and offer joint mediation built around an immediate armistice. Recognition changes the legal and diplomatic position, but it does not compel Washington to stop fighting unless Richmond accepts the armistice and converts battlefield success into a settlement. Davis must choose whether to take the victory now or continue the war in pursuit of stronger terms.",
    letterTarget: "the Confederate Congress and the governments of Britain and France",
    sourceNotes: "British Cabinet and Foreign Office correspondence on recognition and mediation, 1862-1863; Russell to Palmerston correspondence; Adams, Great Britain and the American Civil War; Owsley, King Cotton Diplomacy; Nevins, The War for the Union vol. III. This is an explicitly counterfactual outcome gated by survival of Johnston and Jackson plus a decisive Confederate victory at Gettysburg.",
    period_voice: "Recognition was understood as a question of belligerent power, military durability, and European interest. In this alternate line, a decisive victory in Pennsylvania supplies the battlefield fact that Confederate diplomacy historically failed to produce.",
    primerTags: ["cotton_diplomacy", "election_of_1864"],
    suppressCabinetCrisisAfter: true,
    choices: [
      {
        id: "option_a",
        endsCampaign: true,
        text: "Accept British and French recognition with the mediated armistice. Take independence now.",
        proposer: "wolf",
        costDescription: "Concludes the campaign with recognized Confederate independence.",
        effects: {
          metrics: { treasury: +24, publicMorale: +35, divergenceIndex: +0.30 },
          shards: { wolf: +35, fox: +18, hotspur: -8 }
        },
        consequence: "CAMPAIGN CONCLUDED — Richmond accepts the Anglo-French mediation terms. Recognition becomes an enforceable armistice, Washington faces the risk of a wider Atlantic war, and commissioners begin converting the military boundary into an international settlement. Confederate independence is secured at the moment of maximum leverage."
      },
      {
        id: "option_b",
        next: "chickamauga",
        text: "Accept recognition but decline an immediate armistice. Continue the war for stronger military and territorial terms.",
        proposer: "hotspur",
        costDescription: "Recognition is banked, but the campaign continues and the settlement can still be lost.",
        effects: {
          metrics: { militaryStrength: +8, treasury: +12, publicMorale: +22, divergenceIndex: +0.18 },
          shards: { hotspur: +24, wolf: -8, fox: +6 }
        },
        consequence: "Britain and France recognize the Confederacy, but Davis refuses to freeze the war on the present lines. The diplomatic victory strengthens credit and morale while leaving armies in the field. The campaign now proceeds to Chickamauga with independence recognized but final peace still unsecured."
      }
    ]
  },

{
    id: "gettysburg_decision",
  turn: 13,
    date: "July 3, 1863",
    actor: "General Robert E. Lee",
    roleLabel: "Commander of Northern Virginia",
    image: gettysburgCard,
    title: "The Gettysburg Crisis — Cemetery Ridge",
    description: "Cemetery Ridge looms in the extreme summer heat. Day 2 flanking attacks have failed with heavy loss. Longstreet is nearly mutinous, urging immediate tactical withdrawal south before the army is destroyed. General Pickett's fresh division stands ready, awaiting your charge order. The entire war may turn on the next few hours. A successful assault could break the Union center and open the road to Washington. Failure will bleed the Army of Northern Virginia white on these Pennsylvania slopes.",
    letterTarget: "your wife Mary",
    sourceNotes: "OR ser. 1 vol. 27 pt. 2 pp. 305-360 (Lee's report) and pt. 1 (Meade); Freeman, Lee's Lieutenants vol. III ch. 6-9; Longstreet, From Manassas to Appomattox ch. 28; Battles and Leaders vol. III pp. 339-377.",
    period_voice: "Lee to Longstreet on the morning of July 3 1863, as recorded by Longstreet: \"The enemy is there, General Longstreet, and I am going to strike him.\" Longstreet replied that no fifteen thousand men ever arrayed for battle could take that position. (Longstreet, From Manassas to Appomattox p. 386)",
    primerTags: ["cotton_diplomacy", "copperhead_politics", "army_technology_advancement"],
    choices: [
      {
        id: "option_a",
        text: "Charge Pickett's Division straight up the center.",
        proposer: "hotspur",
        costDescription: "Incurs catastrophic Military losses, high morale risk.",
        successRate: 0.35,
        successEffects: {
          metrics: { militaryStrength: -20, munitions: -20, publicMorale: +40, divergenceIndex: +0.40 },
          shards: { hotspur: +35, fox: -10 }
        },
        successConsequence: "The High Water Mark breached! Against all historical odds, Armistead's brigade pierces the stone wall at Cemetery Ridge, routing Webb's center. Meade's army retreats; Philadelphia lies open!",
        failureEffects: {
          metrics: { militaryStrength: -40, munitions: -30, publicMorale: -25 },
          shards: { hotspur: +10, fox: -35 }
        },
        failureConsequence: "The charge reached the copse of trees, but was utterly shredded by canister fire. A tactical disaster that will haunt the South for generations."
      },
      {
        id: "option_b",
        text: "Decline the charge. Reposition south to force Meade to attack us.",
        proposer: "fox",
        costDescription: "Preserves military core, shifts strategic coordinate.",
        effects: {
          metrics: { militaryStrength: -5, munitions: -5, publicMorale: +15 },
          shards: { fox: +25, hotspur: -20 }
        },
        consequence: "Meade declines to attack, forcing a stand-off. Pickett's division survives intact. The invasion ends, but the army lives to fight another day."
      },
      {
        id: "option_c",
        text: "Execute immediate orderly retreat to Virginia through Potomac passes.",
        proposer: "wolf",
        costDescription: "Saves resources, but caps campaign.",
        effects: {
          metrics: { treasury: +10, publicMorale: -20, militaryStrength: 0 },
          shards: { wolf: +25, hotspur: -20 }
        },
        consequence: "Orderly withdrawal completed. The invasion is over, but the army remains strong and ready. Foreign powers take note of the disciplined retreat."
      },
      {
        id: "option_d",
        text: "Deploy Stuart's Cavalry in a sweeping deep rear-guard raid.",
        proposer: "sovereign",
        costDescription: "Consumes 15 Munitions, moderate military payoff.",
        effects: {
          metrics: { munitions: -15, militaryStrength: -10, treasury: +15 },
          shards: { fox: +10, hotspur: +10 }
        },
        consequence: "Stuart disrupted Union communications lines, seizing 50 supply wagons and critical dispatches. A daring raid that buys time and intelligence, even as the main army withdraws."
      }
    ]
  },

{
    id: "susquehanna_offensive",
  turn: 13,
    date: "June 1863",
    actor: "General Robert E. Lee",
    roleLabel: "Commander of Northern Virginia",
    image: gettysburgCard,
    title: "The Susquehanna Offensive — Pennsylvania Panic",
    description: "The campaign has slipped off its historical rails. Instead of concentrating at Gettysburg, Confederate columns have spread alarm through south-central Pennsylvania, threatening the Susquehanna crossings and sending Harrisburg, York, and Philadelphia into political panic. Northern governors demand militia mobilization while Washington struggles to determine where Lee's true weight lies. The strategic question is no longer whether to assault Cemetery Ridge; it is whether this wider incursion can be converted into leverage before logistics, enlistments, and public patience begin to fail.",
    letterTarget: "your wife Mary",
    primerTags: ["cotton_diplomacy", "copperhead_politics"],
    choices: [
      {
        id: "option_a",
        text: "Force the Susquehanna crossings and drive directly toward Harrisburg's depots.",
        proposer: "hotspur",
        costDescription: "Heavy military cost, sharp morale surge, major divergence.",
        effects: {
          metrics: { militaryStrength: -20, munitions: -20, publicMorale: +25, divergenceIndex: +0.18 },
          shards: { hotspur: +25, fox: -15 }
        },
        consequence: "The crossings are seized in violent confusion, sending militia and railroad officials fleeing west. The raid electrifies the South, but every mile deeper into Pennsylvania stretches supply and discipline thinner."
      },
      {
        id: "option_b",
        text: "Entrench along the river line and force Meade to attack on your terms.",
        proposer: "fox",
        costDescription: "Lower losses, steadier line, modest divergence gain.",
        effects: {
          metrics: { militaryStrength: -8, munitions: -8, publicMorale: +10, divergenceIndex: +0.08 },
          shards: { fox: +25, hotspur: -15 }
        },
        consequence: "Earthworks and river screens blunt the Union response. Pennsylvania remains under threat, but the campaign shifts from glorious gamble to disciplined positional pressure."
      },
      {
        id: "option_c",
        text: "Exploit the panic through Northern governors, peace editors, and railroad boards.",
        proposer: "wolf",
        costDescription: "Treasury strain, domestic political upside, high divergence.",
        effects: {
          metrics: { treasury: -20, publicMorale: +5, divergenceIndex: +0.15 },
          shards: { wolf: +30, fox: +5, hotspur: -10 }
        },
        consequence: "The panic moves through rail offices, statehouses, and opposition newspapers instead of foreign chancelleries. No armistice comes at once, but Northern leaders now argue over whether the invasion is a military emergency or a political breaking point."
      },
      {
        id: "option_d",
        text: "Strip the rail depots, seize shoes and grain, and withdraw before Meade can pin you down.",
        proposer: "sovereign",
        costDescription: "Moderate cost, major supply gain, continued divergence.",
        effects: {
          metrics: { militaryStrength: -10, munitions: +15, treasury: +20, divergenceIndex: +0.10 },
          shards: { fox: +15, wolf: +10 }
        },
        consequence: "The army pulls south with wagons full of shoes, rails, and flour instead of a single climactic battlefield victory. It is less glorious than Gettysburg, but materially better for keeping men in the ranks."
      }
    ]
  },

{
    id: "chickamauga",
  turn: 14,
    date: "September 19, 1863",
    actor: "General Braxton Bragg",
    roleLabel: "Army Commander",
    image: chickamaugaCard,
    title: "Battle of Chickamauga — River of Death",
    description: "Rosecrans' Union army has slipped into Georgia. You have intercepted them near Chickamauga Creek in heavy woods where visibility is poor and command control is brittle. The 'River of Death' runs red before the fighting even begins. Longstreet's fresh divisions are arriving by rail from Virginia, but your relations with your own subordinates, especially the proud Longstreet, are bitter and openly distrustful. One misstep in these tangled thickets and the entire Western theater could collapse. The South's last great chance to break the Union hold on Tennessee hangs in the balance.",
    sourceNotes: "OR ser. 1 vol. 30 pt. 2 pp. 11-71 (Bragg's report) and pt. 1 (Rosecrans, Thomas); Longstreet, From Manassas to Appomattox ch. 33; Battles and Leaders vol. III pp. 638-679; Henderson's western-theater analysis in The Civil War: A Soldier's View ch. 7.",
    period_voice: "Bragg in his after-action report, October 30 1863: \"The general result of these operations was the discomfiture of the enemy's plans, the recovery of nearly the whole of East Tennessee, and the placing of our army in possession of the great chain of mountains.\" (OR ser. 1 vol. 30 pt. 2 p. 23)",
    primerTags: ["copperhead_politics"],
    letterTarget: "your wife Elise",
    choices: [
      {
        id: "option_a",
        text: "Launch aggressive frontal assaults through the dense undergrowth.",
        proposer: "hotspur",
        costDescription: "Heavy Military casualties, high risk.",
        effects: {
          metrics: { militaryStrength: -25, munitions: -20, publicMorale: +15 },
          shards: { hotspur: +25, fox: -15 }
        },
        consequence: "Severe casualties in the dense woods. The battle resolved into a chaotic brawl with no clear advantage. The Army of Tennessee bleeds for little gain."
      },
      {
        id: "option_b",
        text: "Deploy Longstreet's fresh division in a concentrated column attack through the center gap.",
        proposer: "fox",
        costDescription: "Consumes 15 Munitions, high tactical payoff.",
        effects: {
          metrics: { munitions: -15, militaryStrength: -10, publicMorale: +25 },
          shards: { fox: +30, hotspur: 0 }
        },
        consequence: "Incredible breakthrough! Longstreet exploited a major gap in the Union line, routing their entire right wing. One of the great tactical successes of the war — if only Bragg could capitalize on it."
      },
      {
        id: "option_c",
        text: "Request immediate strategic coordination and advice from Richmond war cabinet.",
        proposer: "wolf",
        costDescription: "Saves resources, but delays action.",
        effects: {
          metrics: { treasury: -10, publicMorale: +5 },
          shards: { wolf: +25, hotspur: -10 }
        },
        consequence: "Bragg spent crucial hours debating with Davis's envoys, allowing Rosecrans to fortify Chattanooga. The moment of victory slipped away in committee."
      },
      {
        id: "option_d",
        text: "Divert cavalry to sever the Chattanooga rail bridges completely.",
        proposer: "sovereign",
        costDescription: "Consumes 20 Munitions, isolates Union army.",
        effects: {
          metrics: { munitions: -20, militaryStrength: -5, treasury: +15 },
          shards: { fox: +15, wolf: +10 }
        },
        consequence: "The bridges were successfully burned, leaving Rosecrans' supply lines completely severed. A brilliant economy-of-force move that buys time for the Confederacy in the West."
      }
    ],
    branches: [
      { minDivergence: 0.35, scenarioId: "chattanooga_stranglehold" }
    ]
  },

{
    id: "wilderness_opening",
  turn: 15,
    date: "May 6, 1864",
    actor: "General Robert E. Lee",
    roleLabel: "Army Commander",
    image: wildernessCard,
    title: "Wilderness Crisis — Lee's Line Staggers",
    description: "Grant has crossed the Rapidan and the first collision in the Wilderness has gone badly enough to put Lee's army in real danger. Federal pressure is building near the Orange Plank Road, Confederate formations are confused in the thickets, and for a few hours the Army of Northern Virginia looks closer to rupture than victory. Longstreet's First Corps is still coming up. If Lee throws men forward too soon, the army may spend the last strength it needs to survive the Overland Campaign. If he waits long enough for Longstreet and the Texas Brigade to arrive, the counterstroke may still save the field.",
    letterTarget: "your wife Mary",
    sourceNotes: "OR ser. 1 vol. 36 pt. 1 pp. 1027-1083 (Lee's report) and pt. 2 (Grant's dispatches); Grant, Personal Memoirs vol. II ch. 49-50; Freeman, Lee's Lieutenants vol. III ch. 16-18; Catton, A Stillness at Appomattox ch. 2-3.",
    period_voice: "Grant to Halleck, May 11 1864 from Spotsylvania: \"I propose to fight it out on this line if it takes all summer.\" (OR ser. 1 vol. 36 pt. 2 p. 627)",
    primerTags: ["election_of_1864", "conscription_substitution"],
    choices: [
      {
        id: "option_a",
        next: "wilderness",
        text: "Throw the nearest brigades forward immediately before Longstreet reaches the field.",
        proposer: "hotspur",
        costDescription: "Very high army-loss risk. May end the campaign if your field strength is already low.",
        effects: {
          metrics: { militaryStrength: -72, munitions: -18, publicMorale: -8 },
          shards: { hotspur: +25, fox: -10 }
        },
        consequence: "The counterstroke goes in before the army is ready. Some Union pressure is checked, but the price is ruinous: brigades are torn apart in smoke, brush, and confused musketry before Longstreet can put weight behind the blow."
      },
      {
        id: "option_b",
        next: "wilderness",
        text: "Have the Texans hold Lee back, wait for Longstreet, and let the Texas Brigade stabilize the line.",
        proposer: "fox",
        scoreCard: {
          tactical: 20,
          strategic: 8
        },
        survivalFloor: {
          militaryStrength: 12,
          publicMorale: 14,
          foodSupply: 8
        },
        costDescription: "The sound course. Takes losses, but preserves the army for the Overland fight.",
        effects: {
          metrics: { militaryStrength: +10, munitions: -8, publicMorale: +14, divergenceIndex: +0.03 },
          shards: { fox: +28, hotspur: -8, wolf: +4 }
        },
        consequence: "The Texans physically hold Lee back until Longstreet can arrive. The line steadies, the counterstroke is organized instead of theatrical, and the army comes out of the crisis battered but still capable of continuing the campaign."
      },
      {
        id: "option_c",
        next: "wilderness",
        text: "Let Lee ride forward personally to rally the line before the Texans can stop him.",
        proposer: "hotspur",
        costDescription: "High drama, grave command risk, possible morale gain.",
        successRate: 0.35,
        successEffects: {
          metrics: { militaryStrength: -28, munitions: -12, publicMorale: +18, divergenceIndex: +0.08 },
          shards: { hotspur: +30, fox: -14 }
        },
        successConsequence: "The army is electrified and Lee is pulled back before the risk becomes catastrophe. The moment becomes legend, but even success spends men the Confederacy can barely replace.",
        failureEffects: {
          metrics: { militaryStrength: -82, munitions: -16, publicMorale: -18, divergenceIndex: +0.12 },
          shards: { hotspur: +10, fox: -24, wolf: -8 }
        },
        failureConsequence: "The gesture becomes nearly disastrous. Staff officers and Texans pull Lee back, but the line surges forward in disorder and bleeds heavily before Longstreet can restore control."
      },
      {
        id: "option_d",
        next: "wilderness",
        text: "Yield ground toward the Brock Road and preserve the army rather than contest the thickets at once.",
        proposer: "wolf",
        costDescription: "Avoids immediate collapse, but hurts morale and concedes operational initiative.",
        effects: {
          metrics: { militaryStrength: -20, munitions: -6, publicMorale: -18, foodSupply: -6 },
          shards: { wolf: +24, fox: +8, hotspur: -18 }
        },
        consequence: "The retreat saves part of the army from destruction, but it tells every watching soldier that Grant has not been thrown back. The Overland Campaign continues with less Confederate confidence and less room to maneuver."
      }
    ]
  },

{
    id: "wilderness",
  turn: 16,
    date: "May 6, 1864",
    actor: "General Robert E. Lee",
    roleLabel: "Army Commander",
    image: wildernessCard,
    title: "Wilderness Aftermath — Fire, Roads, and Truce",
    description: "Longstreet's arrival has kept the Wilderness from becoming immediate disaster, but it has not ended the horror. Dense brush, ravines, and second-growth timber still neutralize artillery and magnify confusion. The dry undergrowth is catching fire around wounded men from both armies, while Grant's greater decision is becoming clear: unlike earlier Union commanders, he will keep moving south after a bloody check. The question now is whether Lee should chase a larger tactical gain, fortify the road junctions, interrupt the carnage with a truce, or use the chaos to strike at Grant's supply line.",
    letterTarget: "your wife Mary",
    sourceNotes: "OR ser. 1 vol. 36 pt. 1 pp. 1027-1083 (Lee's report) and pt. 2 (Grant's dispatches); Grant, Personal Memoirs vol. II ch. 49-50; Freeman, Lee's Lieutenants vol. III ch. 16-18; Catton, A Stillness at Appomattox ch. 2-3.",
    period_voice: "Grant to Halleck, May 11 1864 from Spotsylvania: \"I propose to fight it out on this line if it takes all summer.\" (OR ser. 1 vol. 36 pt. 2 p. 627)",
    primerTags: ["election_of_1864", "civil_war_medicine", "army_technology_advancement"],
    choices: [
      {
        id: "option_a",
        text: "Order immediate flank assault through the burning brush under General Gordon.",
        proposer: "hotspur",
        costDescription: "High Military casualties, massive risk of smoke inhalation.",
        effects: {
          metrics: { militaryStrength: -25, munitions: -15, publicMorale: +15 },
          shards: { hotspur: +25, fox: -10 }
        },
        consequence: "The flank attack rolled up Grant's right wing, but the raging brushfire prevented complete destruction. The Wilderness remains a charnel house."
      },
      {
        id: "option_b",
        text: "Fortify along the Brock Road intersection. Force Grant to attack your earthworks.",
        proposer: "fox",
        costDescription: "Saves resources, holds vital crossroads.",
        effects: {
          metrics: { militaryStrength: -5, munitions: -10, publicMorale: +10 },
          shards: { fox: +25, hotspur: -15 }
        },
        consequence: "Grant launched bloody assaults against your earthworks, suffering massive casualties before shifting south. The Wilderness campaign has begun in earnest."
      },
      {
        id: "option_c",
        text: "Issue a public call for immediate humane truce to rescue wounded from the fire.",
        proposer: "wolf",
        minDivergence: 0.22,
        costDescription: "Boosts Public Morale, temporarily freezes conflict. Unlocked on Branching timelines.",
        effects: {
          metrics: { publicMorale: +25, militaryStrength: 0 },
          shards: { wolf: +30, hotspur: -20 }
        },
        consequence: "A noble truce was accepted. 800 wounded were saved, significantly boosting civilian morale on both sides. Even in the midst of horror, humanity prevailed — for a moment."
      },
      {
        id: "option_d",
        text: "Redirect Stuart's replacement cavalry to execute a raid on Grant's supply train at Belle Plain.",
        proposer: "sovereign",
        costDescription: "Yields massive Munitions.",
        effects: {
          metrics: { munitions: +30, treasury: +10, militaryStrength: -5 },
          shards: { fox: +15, wolf: +10 }
        },
        consequence: "The raid captured 120 supply wagons, alleviating the army's acute starvation. A daring strike that keeps the Army of Northern Virginia in the field a little longer."
      }
    ]
  },

{
    id: "chattanooga_stranglehold",
  turn: 15,
    interlude: true,
    date: "October 1863",
    actor: "General Braxton Bragg",
    roleLabel: "Army Commander",
    image: chickamaugaCard,
    title: "Chattanooga Stranglehold — The Rail Noose",
    description: "This campaign no longer follows the familiar slide from Chickamauga to Confederate drift. The crossings and rail approaches to Chattanooga are badly severed, Union recovery is slower, and the question in the Western Theater is whether this advantage can be converted into something larger before Grant restores order. Confederate leaders argue over whether to storm the heights, tighten the siege, weaponize the political shock in the North, or break eastward for more depots before the moment closes.",
    letterTarget: "President Davis",
    primerTags: ["shiloh_western_theater", "atlanta_campaign_1864"],
    choices: [
      {
        id: "option_a",
        next: "wilderness_opening",
        text: "Storm the Chattanooga heights before the Union can recover its nerve.",
        proposer: "hotspur",
        costDescription: "Heavy military losses, morale gain, major divergence.",
        effects: {
          metrics: { militaryStrength: -18, munitions: -16, publicMorale: +20, divergenceIndex: +0.12 },
          shards: { hotspur: +25, fox: -15 }
        },
        consequence: "The assault turns the siege into a brutal contest for the ridges. Victory seems possible, but only at the cost of exhausting the very army that created the opportunity."
      },
      {
        id: "option_b",
        next: "wilderness_opening",
        text: "Tighten the rail siege, ration ammunition, and starve the garrison into retreat.",
        proposer: "fox",
        costDescription: "Modest losses, treasury gain, steadier control of the theater.",
        effects: {
          metrics: { militaryStrength: -10, munitions: -10, treasury: +10, publicMorale: +10, divergenceIndex: +0.08 },
          shards: { fox: +25, hotspur: -10 }
        },
        consequence: "The war in Tennessee becomes one of rails, depots, and patience rather than single-day glory. It is less theatrical than an assault, but more sustainable."
      },
      {
        id: "option_c",
        next: "wilderness_opening",
        text: "Use the siege to fuel Northern peace agitation and an exchange-and-armistice campaign.",
        proposer: "wolf",
        costDescription: "Treasury cost, morale gain, strong political divergence.",
        effects: {
          metrics: { treasury: -15, publicMorale: +10, divergenceIndex: +0.14 },
          shards: { wolf: +30, hotspur: -10 }
        },
        consequence: "Newspapers in the North begin treating Chattanooga as a political embarrassment as much as a military one. No armistice arrives, but the siege now has a political front."
      },
      {
        id: "option_d",
        next: "wilderness_opening",
        text: "Detach Longstreet eastward to strip Knoxville and the rail depots before Grant can restore the line.",
        proposer: "sovereign",
        costDescription: "Moderate military cost, strong supply upside, continued divergence.",
        effects: {
          metrics: { militaryStrength: -6, munitions: +10, treasury: +20, divergenceIndex: +0.10 },
          shards: { fox: +10, wolf: +15 }
        },
        consequence: "The theater fragments into simultaneous operations, but the material reward is immediate. More wagons, more rails, and more food now move under Confederate control."
      }
    ]
  },

{
    id: "cold_harbor",
  turn: 18,
    date: "June 3, 1864",
    actor: "General Robert E. Lee",
    roleLabel: "Army Commander",
    image: "/images/cw_pictures/Grant at Cold Harbor.jpeg",
    title: "Cold Harbor — Entrenchment, Slaughter, and the Election Clock",
    description: "The Overland Campaign has not ended in the Wilderness. Grant keeps sliding south and Lee keeps getting there first. Now the armies face one another behind converging trench lines at Cold Harbor, where open ground, artillery sight lines, and exhausted men make frontal assault look less like Napoleonic decision and more like industrial butchery. Every Confederate commander understands the military stakes, but the political ones are nearly as large: if Grant is bloodily checked again, Northern morale and the 1864 election conversation may tilt in ways no battlefield map can fully capture.",
    letterTarget: "President Jefferson Davis",
    primerTags: ["election_of_1864", "conscription_substitution", "death_in_the_civil_war"],
    choices: [
      {
        id: "option_a",
        text: "Counterattack hard while Grant's army is tangled in its assault preparations and try to throw him back from the crossroads.",
        proposer: "hotspur",
        costDescription: "Heavy battlefield losses, strong morale payoff, major command gamble.",
        effects: {
          metrics: { militaryStrength: -18, munitions: -14, publicMorale: +20, divergenceIndex: +0.08 },
          shards: { hotspur: +26, fox: -12 }
        },
        consequence: "Lee turns defense into sudden violence, hoping not merely to repulse Grant but to bruise him so badly that the road to Petersburg opens under a political cloud in Washington."
      },
      {
        id: "option_b",
        text: "Deepen the works, conserve the army, and let Cold Harbor become proof that Grant can be stopped without wasting irreplaceable men.",
        proposer: "fox",
        costDescription: "Lower losses, steadier line, modest resource preservation.",
        effects: {
          metrics: { militaryStrength: -6, munitions: -8, publicMorale: +14, treasury: +6, foodSupply: +4 },
          shards: { fox: +28, hotspur: -12 }
        },
        consequence: "The army chooses field engineering and patience over theatrical counterstroke. Grant still moves south, but he does so under the weight of another expensive failure and a Confederate line that remains organized."
      },
      {
        id: "option_c",
        text: "Exploit the slaughter politically by pushing peace agitation, prisoner-exchange appeals, and foreign commentary on Grant's casualties.",
        proposer: "wolf",
        costDescription: "Treasury cost, political upside, moderate divergence.",
        effects: {
          metrics: { treasury: -12, publicMorale: +10, divergenceIndex: +0.12 },
          shards: { wolf: +30, fox: +4, hotspur: -8 }
        },
        consequence: "Cold Harbor becomes not just a battlefield but an argument. Dispatches, editors, and diplomats begin treating Grant's casualties as evidence that the war's end may still be political rather than purely military."
      },
      {
        id: "option_d",
        text: "Use the trench screen to slip men and wagons toward the Petersburg approaches, treating Cold Harbor as cover for the next operational pivot.",
        proposer: "sovereign",
        costDescription: "Moderate losses, strong logistical positioning, continued divergence.",
        effects: {
          metrics: { militaryStrength: -2, munitions: -4, treasury: +10, foodSupply: +6, divergenceIndex: +0.1 },
          shards: { fox: +12, wolf: +14 }
        },
        consequence: "Instead of trying to win one more famous field, Lee uses Cold Harbor to buy time and movement. Roads, wagons, and rail access toward Petersburg matter more now than glory on a single bloody morning."
      }
    ]
  },

{
    id: "new_market",
    turn: 17,
    date: "May 15, 1864",
    actor: "Maj. Gen. John C. Breckinridge",
    roleLabel: "Valley Department Commander",
    image: thirdWinchesterCard,
    title: "New Market — The Cadets and the Wheatfields",
    description: "Rain has turned the Valley roads to paste, but the fields around Bushong Farm are still the rich Shenandoah ground that has fed armies for three years. Sigel is pressing up the Valley Pike, threatening not just Staunton but the barns, mills, and wheat reserves that keep the Valley useful to Richmond. Breckinridge has a thin line, reluctant reserves, and the VMI cadets in hand. If this field is held, the Confederacy keeps one more harvest corridor. If it is lost, Union columns can begin cutting that corridor to pieces.",
    letterTarget: "President Davis",
    primerTags: ["shenandoah_valley_campaign"],
    choices: [
      {
        id: "option_a",
        text: "Throw the cadets and the reserve straight at Bushong's line before Sigel can settle his guns.",
        proposer: "hotspur",
        costDescription: "High battlefield risk, large morale surge, major food swing if the line breaks cleanly.",
        successRate: 0.5,
        successEffects: {
          metrics: { militaryStrength: -14, munitions: -10, publicMorale: +24, foodSupply: +18, divergenceIndex: +0.06 },
          shards: { hotspur: +28, fox: -10 }
        },
        successConsequence: "The soaked line surges forward and Sigel's position gives way. Bushong's barns, local grain, and wagon parks remain in Confederate hands, and the cadets enter history carrying not just romance but a real harvest back into the army's future.",
        failureEffects: {
          metrics: { militaryStrength: -22, munitions: -12, publicMorale: +6, foodSupply: -10 },
          shards: { hotspur: +10, fox: -18 }
        },
        failureConsequence: "The charge becomes legend without becoming decision. Sigel holds long enough to damage stores and scatter livestock, and the Valley keeps its beauty while losing the substance that beauty promised."
      },
      {
        id: "option_b",
        text: "Hold the ridges, use the cadets as reserve, and secure the Valley Pike and nearby granaries before pursuing.",
        proposer: "fox",
        costDescription: "Lower drama, steadier battlefield control, strong preservation of food and transport.",
        effects: {
          metrics: { militaryStrength: -6, munitions: -6, publicMorale: +12, foodSupply: +16 },
          shards: { fox: +30, hotspur: -12 }
        },
        consequence: "The fight is won by discipline rather than by one theatrical blow. The Bushong farm belt, nearby mills, and road traffic remain usable, which matters more to the next month of campaigning than any single headline."
      },
      {
        id: "option_c",
        text: "Turn New Market into a public theater of Valley loyalty and youthful sacrifice while organized parties sweep up stores.",
        proposer: "wolf",
        costDescription: "Treasury cost, political gain, moderate food recovery through deliberate seizure.",
        effects: {
          metrics: { treasury: -8, publicMorale: +14, foodSupply: +10, divergenceIndex: +0.08 },
          shards: { wolf: +28, fox: +4 }
        },
        consequence: "The cadets become a story Richmond can use, but the better achievement is quieter: flour, fodder, and livestock are gathered under cover of victory speeches and dispatches. The Valley feeds both morale and army."
      },
      {
        id: "option_d",
        text: "Send cavalry around Sigel's flank to seize depots, herds, and rail stores even if the main fight stays limited.",
        proposer: "sovereign",
        costDescription: "Operational gamble, moderate losses, strongest material recovery if the sweep lands.",
        effects: {
          metrics: { militaryStrength: -10, munitions: -8, treasury: +10, foodSupply: +20, divergenceIndex: +0.12 },
          shards: { fox: +12, wolf: +14 }
        },
        consequence: "The battle becomes half pursuit, half quartermaster raid. By evening the Confederates own fewer laurels perhaps, but far more cattle, flour, and field stores than Sigel expected to surrender."
      }
    ]
  },

{
    id: "atlanta_election_pressure",
    turn: 19,
    date: "July-August 1864",
    actor: "President Jefferson Davis",
    roleLabel: "Commander-in-Chief",
    image: chickamaugaCard,
    title: "The March to Atlanta — Johnston, Hood, and the Election Clock",
    description: "Sherman's three armies are grinding south from Chattanooga through the North Georgia rail belt, repeatedly turning Confederate positions rather than smashing them head-on. Joseph E. Johnston insists that space can be traded for time, that every mile stretched across the hills and river crossings hurts Sherman more than one reckless battle, and that keeping Atlanta unfallen through the autumn could help break Lincoln politically. Davis and the Richmond press are running out of patience. The question is no longer just military: it is whether Atlanta should be defended by maneuver, by offensive fury, by political delay aimed at the Northern election, or by stripping the city's industrial value before it can be taken.",
    letterTarget: "the governors and Gen. Lee",
    primerTags: ["atlanta_campaign_1864", "election_of_1864", "impressment_bread_riots"],
    choices: [
      {
        id: "option_a",
        text: "Replace Johnston, empower Hood, and seek an immediate offensive blow north of Atlanta.",
        proposer: "hotspur",
        costDescription: "Heavy military loss risk, morale surge, faster political climax.",
        next: "fall_of_atlanta",
        effects: {
          metrics: { militaryStrength: +6, munitions: -16, publicMorale: +16, divergenceIndex: +0.08 },
          shards: { hotspur: +26, fox: -18, wolf: -6 }
        },
        consequence: "The command change briefly stiffens offensive cohesion and calls stragglers back to the colors. Hood's aggressiveness restores confidence and momentum, but it also accelerates the decisive fight for Atlanta's railroads. The campaign now turns toward Jonesborough, evacuation, and the September headline Lincoln needs."
      },
      {
        id: "option_b",
        next: "atlanta_holds_october",
        text: "Keep Johnston in command and prolong the campaign through river lines, flank refusals, and disciplined retreat.",
        proposer: "fox",
        costDescription: "Modest losses now, strong campaign endurance, real political leverage. Atlanta does not fall on schedule and the November election clock becomes the decisive front.",
        effects: {
          metrics: { militaryStrength: -8, munitions: -6, treasury: +6, publicMorale: +24, divergenceIndex: +0.18 },
          shards: { fox: +34, hotspur: -16, wolf: +22 }
        },
        consequence: "Johnston refuses to surrender the city to one set-piece fight. Sherman keeps moving, but he is forced to keep earning every new position with time, bridging, and supply effort. Atlanta remains in play through the summer and into the autumn — and with it, the possibility that Northern politics rather than battlefield annihilation will shape the war's next phase."
      },
      {
        id: "option_c",
        text: "Exploit the delay politically: press peace Democrats, magnify war weariness, and make Atlanta a referendum on Lincoln.",
        proposer: "wolf",
        costDescription: "Treasury cost, stronger political divergence, limited direct battlefield relief.",
        effects: {
          metrics: { treasury: -12, publicMorale: +10, divergenceIndex: +0.12 },
          shards: { wolf: +30, fox: +6, hotspur: -10 }
        },
        consequence: "Pamphlets, editorials, and private feelers turn the Georgia campaign into a political argument in Northern cities. Sherman still advances, but every month Atlanta stays outside Union control deepens the sense that Lincoln may lose the election before he wins the war."
      },
      {
        id: "option_d",
        text: "Prepare fallback lines, evacuate machine shops and rolling stock, and treat Atlanta as an industrial question as much as a battlefield one.",
        proposer: "sovereign",
        costDescription: "Moderate morale loss, strong supply preservation, better post-Atlanta endurance.",
        effects: {
          metrics: { militaryStrength: -8, munitions: +12, treasury: +10, publicMorale: -8, divergenceIndex: +0.05 },
          shards: { fox: +12, wolf: +12, hotspur: -6 }
        },
        consequence: "Even if Atlanta cannot be held forever, the Confederacy avoids surrendering its rail and workshop value intact. It is a colder choice than heroic defense, but it leaves more material for the campaigns that follow."
      }
    ]
  },

{
    // Alternate-history branch — reached only by keeping Johnston in command at
    // atlanta_election_pressure:option_b. Joseph E. Johnston's maneuver
    // defense holds Atlanta past the September 2 fall date and into the
    // November election window, converting the Georgia campaign into a
    // political crisis for Lincoln rather than a military one for the South.
    id: "atlanta_holds_october",
    turn: 21,
    date: "October-November 1864",
    actor: "General Joseph E. Johnston",
    roleLabel: "Army of Tennessee Commander",
    image: "/images/cw_pictures/Burning of Atlanta.jpeg",
    title: "Atlanta Holds Past September — The Election Clock Runs Down",
    description: "Johnston has been right where his critics said he was wrong. The Army of Tennessee has refused the set-piece battle Hood would have given Sherman in July, has traded space for time at every river crossing from the Etowah to the Chattahoochee, and has kept Atlanta inside Confederate lines through September. Sherman is still maneuvering — the railroads to Macon and Augusta are contested, not cut — but the September telegram Washington needed never went out, and the New York Tribune is openly speculating about a Lincoln defeat. The Democratic platform from Chicago, with its peace plank, is now circulating as a serious settlement proposition. Whether the war ends in Confederate independence, in a Concurrent-Majority compact under McClellan, or in one more bloody campaign depends on what Richmond and the field army do in the next sixty days.",
    letterTarget: "President Davis and Vice President Stephens",
    sourceNotes: "OR ser. 1 vol. 38 pts. 4-5 (Sherman, Thomas, Schofield correspondence September-October 1864); Johnston, Narrative of Military Operations Directed during the Late War between the States (Appleton, 1874) ch. 11-12; Castel, Decision in the West (University Press of Kansas, 1992) ch. 13 (counterfactual); Lincoln, Collected Works vol. VII pp. 514 (August 23 1864 memorandum) and vol. VIII pp. 1-50 (October-November correspondence); Democratic Party Platform of 1864 (Chicago, August 29-31); McClure, Recollections of Half a Century (Salem Press, 1902) ch. on the 1864 campaign.",
    period_voice: "Lincoln, memorandum sealed and held by his cabinet, August 23 1864: \"This morning, as for some days past, it seems exceedingly probable that this Administration will not be re-elected. Then it will be my duty to so co-operate with the President elect, as to save the Union between the election and the inauguration; as he will have secured his election on such ground that he can not possibly save it afterwards.\" (Lincoln, Collected Works vol. VII p. 514) — In this branch, the conditions Lincoln feared in August have not been broken by an Atlanta victory in September.",
    primerTags: ["election_of_1864", "copperhead_politics", "atlanta_campaign_1864"],
    choices: [
      {
        id: "option_a",
        text: "Order Johnston to strike Sherman's overextended supply line at Allatoona Pass and break the campaign before the election.",
        proposer: "hotspur",
        costDescription: "Heavy battlefield risk, large morale and political upside if it works.",
        successRate: 0.55,
        successEffects: {
          metrics: { militaryStrength: -18, munitions: -16, publicMorale: +28, divergenceIndex: +0.14 },
          shards: { hotspur: +28, fox: +6, wolf: +18 }
        },
        successConsequence: "Johnston cuts the Western and Atlantic at Allatoona, severs Sherman from his Tennessee depots for ten days, and forces a withdrawal toward Chattanooga that the Northern press cannot misread. Lincoln's cabinet meets in continuous session. The October state elections in Pennsylvania and Indiana go to the Democrats by margins no one in August thought possible.",
        failureEffects: {
          metrics: { militaryStrength: -28, munitions: -22, publicMorale: -6, divergenceIndex: +0.06 },
          shards: { hotspur: +14, fox: -14, wolf: +4 }
        },
        failureConsequence: "The attack fails. Sherman repairs the railroad in five days and resumes the maneuver. Atlanta is still in Confederate hands, but the political dividend the strike was supposed to pay does not arrive, and the army has spent men it cannot replace."
      },
      {
        id: "option_b",
        text: "Hold Johnston on his line, refuse the climactic battle, and let the maneuver campaign run out the election clock.",
        proposer: "fox",
        costDescription: "Moderate attrition, very strong political leverage, large divergence push toward a McClellan settlement window.",
        effects: {
          metrics: { militaryStrength: -6, munitions: -8, treasury: +4, publicMorale: +30, divergenceIndex: +0.18 },
          shards: { fox: +38, wolf: +24, hotspur: -12 }
        },
        consequence: "Johnston declines the battle Sherman keeps offering. Atlanta is still a Confederate city on October 11, when Pennsylvania and Ohio go to the polls, and the October results break against the administration. New York World and Chicago Times print full pages projecting a McClellan electoral majority. The Confederate political strategy — wait out Northern war weariness — has finally found the timing it needed."
      },
      {
        id: "option_c",
        text: "Open back-channel negotiations with the McClellan campaign and the New York peace Democrats through Canada.",
        proposer: "wolf",
        costDescription: "Treasury cost, very large divergence push, opens the Concurrent-Majority settlement window directly.",
        effects: {
          metrics: { treasury: -18, publicMorale: +18, divergenceIndex: +0.24 },
          shards: { wolf: +42, fox: +14, hotspur: -16 }
        },
        consequence: "Confederate agents in Canada (Clay, Thompson, Tucker) carry quiet letters to New York and Cincinnati. McClellan's managers will not commit on paper, but they let Richmond understand that a settlement under the Chicago platform's first plank — restoration with constitutional protections — is a serious proposition if he wins. Calhoun's Concurrent Majority returns to political conversation for the first time since 1860."
      },
      {
        id: "option_d",
        text: "Use the political moment to recover the Valley and stabilize Confederate finance, treating the Atlanta holdout as the cover that buys the rest of the line time.",
        proposer: "sovereign",
        costDescription: "Smaller direct political boost, much stronger material foundation if the settlement does not arrive.",
        effects: {
          metrics: { militaryStrength: +8, munitions: +14, treasury: +18, publicMorale: +12, divergenceIndex: +0.10 },
          shards: { fox: +20, wolf: +18, hotspur: -6 }
        },
        consequence: "Richmond uses the months Johnston has bought. The Shenandoah is reinforced, bond confidence stabilizes for the first time since 1862, impressment is relaxed in Virginia and the Carolinas, and the army that will need to hold whatever line is drawn after the election arrives at November in better shape than it has been all year."
      }
    ]
    // No direct branch to southern_independence_1864 from here. The Peace
    // Crisis is reachable only by playing through Third Winchester, Cedar
    // Creek, and the election_1864_mcclellan turn, then arriving at the
    // late-campaign endpoint that gates the Peace Crisis on Atlanta delay,
    // Cedar Creek victory, and a McClellan election. Jumping past Cedar
    // Creek here would create the inconsistent state where the Peace
    // Crisis loads but its McClellan-Concurrent-Majority option is locked
    // because the Cedar Creek history entry never existed.
  },

{
    id: "fall_of_atlanta",
    turn: 21,
    date: "September 1-2, 1864",
    actor: "Lt. Gen. John Bell Hood",
    roleLabel: "Army Commander",
    image: "/images/cw_pictures/Burning of Atlanta.jpeg",
    title: "The Fall of Atlanta — Railroads, Evacuation, and Election Shock",
    description: "Sherman has abandoned repeated frontal pressure and driven toward the Macon and Western Railroad below Atlanta. The fight at Jonesborough now threatens the last rail connection keeping the city supplied. Atlanta is no longer merely a fortified place: it is a workshop complex, a rail junction, a symbol of Confederate endurance, and the battlefield result Lincoln's campaign desperately needs. Hood must decide whether to gamble the army on reopening the railroad, preserve the field force while evacuating the city, destroy the industrial plant before withdrawal, or attempt the hardest course of all — hold the inner works long enough to deny Washington its September victory.",
    letterTarget: "President Jefferson Davis",
    sourceNotes: "OR ser. 1 vol. 38 pts. 1-5 (Atlanta Campaign and Jonesborough reports); Sherman to Halleck, September 3 1864; Hood, Advance and Retreat; Johnston, Narrative of Military Operations; Castel, Decision in the West; Lincoln, Collected Works vol. VII.",
    period_voice: "Sherman to Halleck, September 3 1864: \"Atlanta is ours, and fairly won.\" The telegram converted a military success into an immediate Northern political event.",
    primerTags: ["atlanta_campaign_1864", "election_of_1864", "impressment_bread_riots"],
    choices: [
      {
        id: "option_a",
        text: "Concentrate at Jonesborough and counterattack to reopen the Macon railroad before Sherman can seal it.",
        proposer: "hotspur",
        costDescription: "High battlefield risk. A success delays Atlanta's fall; failure spends the army and hands Lincoln a decisive headline.",
        successRate: 0.35,
        successEffects: {
          metrics: { militaryStrength: -12, munitions: -14, publicMorale: +22, divergenceIndex: +0.10 },
          shards: { hotspur: +28, fox: -12 }
        },
        successConsequence: "The railroad is reopened long enough to move stores and keep Atlanta nominally in Confederate hands. Sherman has not been defeated, but the victory telegram Washington expected in September does not arrive.",
        failureEffects: {
          metrics: { militaryStrength: -28, munitions: -18, publicMorale: -22 },
          shards: { hotspur: +8, fox: -22 }
        },
        failureConsequence: "The counterattack fails, the railroad is cut, and the army retreats through a city already hearing the demolition trains. Atlanta falls after consuming men the Confederacy cannot replace."
      },
      {
        id: "option_b",
        text: "Evacuate Atlanta in disciplined order and preserve the Army of Tennessee for the campaigns beyond the city.",
        proposer: "fox",
        costDescription: "Severe morale and election shock, but preserves the field army.",
        effects: {
          metrics: { militaryStrength: +6, munitions: +4, publicMorale: -24 },
          shards: { fox: +30, hotspur: -16 }
        },
        consequence: "Atlanta falls on September 2, but the army escapes as an organized force. Sherman gains the political trophy; Richmond retains soldiers who can still contest Tennessee and the Carolinas."
      },
      {
        id: "option_c",
        text: "Remove machinery, rolling stock, ammunition, and skilled workers before abandoning the city.",
        proposer: "sovereign",
        costDescription: "The city falls, but more industrial capacity and supplies survive.",
        effects: {
          metrics: { militaryStrength: -4, munitions: +16, treasury: +10, publicMorale: -18 },
          shards: { fox: +12, wolf: +10, hotspur: -10 }
        },
        consequence: "Sherman takes Atlanta, but not an intact arsenal. Machine tools, locomotives, stores, and skilled men move south before the demolition fires, reducing the material value of the Union victory even as its political value remains enormous."
      },
      {
        id: "option_d",
        text: "Hold the inner defenses and rail approaches through the election season while avoiding a general battle outside the works.",
        proposer: "wolf",
        costDescription: "Extremely difficult alternate route. Success may change the election; failure traps stores and damages the army.",
        successRate: 0.30,
        successEffects: {
          metrics: { militaryStrength: -14, munitions: -16, publicMorale: +26, divergenceIndex: +0.18 },
          shards: { wolf: +28, fox: +8, hotspur: -8 }
        },
        successConsequence: "Atlanta remains contested into November. Sherman controls much of the rail belt but cannot send the clean victory telegram Lincoln needs, and Northern voters enter the election with the war's central prize unresolved.",
        failureEffects: {
          metrics: { militaryStrength: -24, munitions: -22, treasury: -10, publicMorale: -26 },
          shards: { wolf: +10, fox: -14, hotspur: -10 }
        },
        failureConsequence: "The prolonged defense ends in evacuation after stores and rolling stock are caught in the tightening ring. Atlanta still falls, only later and at greater military cost."
      }
    ]
  },

{
    id: "third_winchester",
    turn: 22,
    date: "September 19, 1864",
    actor: "Lt. Gen. Jubal Early",
    roleLabel: "Valley District Commander",
    image: thirdWinchesterCard,
    title: "Third Winchester — The Valley Campaign",
  description: "Sheridan's army has crossed Opequon Creek and pushed through the crowded Berryville approach. West of the creek, your reunited divisions face a much larger force across the Middle Field and along Red Bud Run, east and northeast of Winchester. A counterattack may exploit gaps between the Union corps, but fresh infantry and cavalry threaten your northern flank. Behind you lie Winchester, the Valley Pike, and the farms and mills that help feed Confederate armies. Hold too long, and a hard-fought defense may become a trapped army.",
    sourceNotes: "National Park Service, Third Battle of Winchester; Shenandoah Valley Battlefields Foundation, Brandon H. Beck, The Third Battle of Winchester. The playable field is a compressed representative sector, not a survey or a literal order of battle.",
    letterTarget: "General Lee",
    primerTags: ["shenandoah_valley_campaign", "election_of_1864"],
    choices: [
      {
        id: "option_a",
        text: "Order a desperate infantry charge through the Berryville Canyon approach toward Sheridan's center.",
        proposer: "hotspur",
        costDescription: "Extreme Military losses, high risk of routing.",
        effects: {
          metrics: { militaryStrength: -30, munitions: -20, publicMorale: -5, foodSupply: -18 },
          shards: { hotspur: +25, fox: -25 }
        },
        consequence: "The infantry charged gallantly, but Sheridan's massive reserves crushed the assault, forcing a retreat. The Valley is lost, barns and wagon parks are abandoned in the rush south, and the South's last great breadbasket begins feeding the enemy instead."
      },
      {
        id: "option_b",
        text: "Fall back to the stone walls south of Winchester. Form tight defensive rings.",
        proposer: "fox",
        costDescription: "Saves Military core, retreats from Winchester.",
        effects: {
          metrics: { militaryStrength: -10, publicMorale: -15, munitions: -5, foodSupply: -12 },
          shards: { fox: +25, hotspur: -10 }
        },
        consequence: "The stone walls held, preventing a total rout, but Winchester fell into Sheridan's hands. The retreat saves men while surrendering mills, fodder, and the lower Valley's easiest supply roads."
      },
      {
        id: "option_c",
        text: "Leverage copperhead networks to spread rumors of Sheridan's imminent defeat.",
        proposer: "wolf",
        costDescription: "Consumes 15 Treasury, minor morale boost.",
        effects: {
          metrics: { treasury: -15, publicMorale: +10, foodSupply: -8 },
          shards: { wolf: +25, hotspur: -5 }
        },
        consequence: "In this alternate political choice, favorable reports bolster supporters at home, but they do not stop Sheridan's troops. Your field commanders must still face his advance, and publicity cannot recover the grain or livestock lost with the lower Valley."
      },
      {
        id: "option_d",
        text: "Use local farm roads to withdraw south toward the Valley Pike under a cavalry screen.",
        proposer: "sovereign",
        minDivergence: 0.12,
        costDescription: "High divergence, escape the trap cleanly. Unlocked on Drifting timelines.",
        effects: {
          metrics: { militaryStrength: -5, munitions: -5, foodSupply: -6, divergenceIndex: +0.2 },
          shards: { fox: +15, wolf: +10 }
        },
        consequence: "The screened columns slip south along farm roads and rejoin the Valley Pike before Sheridan's cavalry can close the route. This alternate withdrawal preserves the army, though not the full stores of the lower Valley it leaves behind."
      }
    ]
  },

{
    id: "cedar_creek",
    turn: 23,
    date: "October 19, 1864",
    actor: "Lt. Gen. Jubal Early",
    roleLabel: "Valley District Commander",
    image: thirdWinchesterCard,
    title: "Cedar Creek — Belle Grove at Dawn",
    description: "Before sunrise mist lies across Cedar Creek and the lawns of Belle Grove, the great Valley house above Middletown. Sheridan's camps are strung out among barns, stacks of fodder, and captured grain from a countryside already scarred by the Burning. A surprise blow here could reopen the lower Valley, recover food and livestock, and restore the notion that the Shenandoah is still Richmond's granary. If the attack unravels, Belle Grove becomes witness not to rescue but to the final stripping of the breadbasket.",
    letterTarget: "General Lee",
    primerTags: ["shenandoah_valley_campaign", "election_of_1864"],
    electionBranch: {
      threshold: 7,
      lincolnScenarioId: "election_1864_lincoln",
      mcclellanScenarioId: "election_1864_mcclellan",
      // Hard preconditions for the McClellan branch. The structural
      // argument: Atlanta delayed past September and Cedar Creek yielding
      // a field victory or an orderly early withdrawal are the events that break the
      // Northern coalition. Without both, even a high pressure score
      // returns to the Lincoln branch.
      mcclellanRequiredAll: [
        { scenarioId: "atlanta_election_pressure", choiceId: "option_b", label: "Atlanta delayed (Keep Johnston)" }
      ],
      mcclellanRequiredAnyOf: [
        { scenarioId: "cedar_creek", choiceId: "option_a", fieldResultRequirement: "field-victory", label: "Cedar Creek — Confederate field victory" },
        { scenarioId: "cedar_creek", choiceId: "option_c", fieldResultRequirement: "ordered-supply-withdrawal", label: "Cedar Creek — organized withdrawal with prisoners and supply" }
      ]
    },
    choices: [
      {
        id: "option_a",
        text: "Drive the dawn assault past Belle Grove, keep the ranks closed, and press Sheridan before he can rally.",
        proposer: "hotspur",
        costDescription: "Highest operational commitment. Heavy ammunition use with major political consequences.",
        effects: {
          metrics: { militaryStrength: +4, munitions: -16, publicMorale: +30, foodSupply: +22, divergenceIndex: +0.16 },
          shards: { hotspur: +24, fox: +16, wolf: +16 }
        },
        survivalFloor: { militaryStrength: 18, publicMorale: 18, foodSupply: 12 },
        consequence: "The morning attack never dissolves into plunder and confusion. Early keeps pressure on the broken camps, Sheridan cannot reconstruct his line, and the Union army retreats down the Valley in disorder. Confederate forces recover wagons, flour, livestock, and a political victory large enough to alter the election campaign."
      },
      {
        id: "option_b",
        text: "Repeat the historical course: pause amid the captured camps, then meet Sheridan's afternoon counterattack.",
        proposer: "fox",
        costDescription: "Mostly unchanged history: a brilliant morning surprise becomes a decisive afternoon defeat.",
        effects: {
          metrics: { militaryStrength: -22, munitions: -14, publicMorale: -14, foodSupply: -16 },
          shards: { fox: -8, hotspur: -6 }
        },
        survivalFloor: { militaryStrength: 12, publicMorale: 12, foodSupply: 8 },
        consequence: "The dawn assault overruns the Union camps, but the advance loses cohesion while men gather food and abandoned property. Sheridan returns, rallies his army, and drives Early from the field. The battle remains close for much of the day, yet ends near the historical result: Confederate defeat and final Union command of the Valley."
      },
      {
        id: "option_c",
        text: "Withdraw after the morning success, carrying off prisoners and wagons before Sheridan can organize the counterstroke.",
        proposer: "wolf",
        costDescription: "Narrow tactical loss, but preserves the army and much of the captured supply train.",
        effects: {
          metrics: { militaryStrength: -8, munitions: -8, publicMorale: +4, foodSupply: +14, divergenceIndex: +0.06 },
          shards: { wolf: +24, fox: +12, hotspur: -8 }
        },
        survivalFloor: { militaryStrength: 14, publicMorale: 14, foodSupply: 10 },
        consequence: "Early concedes the field before Sheridan's full weight arrives. The Union can claim Cedar Creek, but the Confederate army escapes without the historical rout and carries south enough prisoners, wagons, and food to make the result a narrow defeat rather than a Valley catastrophe."
      },
      {
        id: "option_d",
        text: "Refuse the exposed afternoon line, cover the Valley Pike with cavalry, and conduct a fighting withdrawal through Middletown.",
        proposer: "sovereign",
        costDescription: "Narrow operational loss, with stronger rear-guard cohesion and fewer abandoned stores.",
        effects: {
          metrics: { militaryStrength: -12, munitions: -10, publicMorale: -4, foodSupply: +8, divergenceIndex: +0.04 },
          shards: { fox: +18, wolf: +10 }
        },
        survivalFloor: { militaryStrength: 14, publicMorale: 14, foodSupply: 10 },
        consequence: "Sheridan retakes the camps and holds the field, but the Confederate rear guard keeps the retreat from becoming a rout. Early loses Cedar Creek narrowly, saves more of his infantry and trains, and leaves the Valley campaign damaged rather than destroyed."
      }
    ]
  },

{
    id: "election_1864_lincoln",
    turn: 24,
    date: "November 8, 1864",
    actor: "President Jefferson Davis",
    roleLabel: "Civil Executive",
    image: "/images/cw_pictures/Lincoln Cabinet.jpeg",
    title: "Election of 1864 — Lincoln Wins a Mandate to Finish the War",
    description: "The returns are decisive. Atlanta's fall, Union recovery in the Valley, and the soldier vote have held Lincoln's coalition together. McClellan carried a serious opposition, but his rejection of disunion and the army's vote denied Richmond the political collapse it hoped to exploit. The Confederacy now faces an administration committed to prosecuting the war through surrender. Davis must decide whether to answer the result with military concentration, a renewed attempt at reunion talks, a public appeal to the states, or an effort to preserve negotiating leverage for the spring.",
    letterTarget: "the Confederate Congress and state governors",
    sourceNotes: "Official presidential election returns for 1864; Lincoln, Collected Works vol. VII; McClellan acceptance letter, September 8 1864; Sherman to Halleck, September 3 1864; Sheridan campaign dispatches; Nicolay and Hay, Abraham Lincoln: A History vol. IX.",
    period_voice: "Lincoln told a serenading crowd after the election that the result demonstrated a republican government could hold a national election during civil war without surrendering either the government or the election.",
    primerTags: ["election_of_1864", "atlanta_campaign_1864", "copperhead_politics"],
    suppressCabinetCrisisAfter: true,
    choices: [
      {
        id: "option_a",
        next: "black_confederate_debate",
        text: "Concentrate every remaining resource on keeping Lee and the rail lines in the field through the winter.",
        proposer: "hotspur",
        costDescription: "Military focus, severe treasury and food strain.",
        effects: {
          metrics: { militaryStrength: +10, munitions: +6, treasury: -18, foodSupply: -10, publicMorale: +4 },
          shards: { hotspur: +24, fox: +4, wolf: -10 }
        },
        consequence: "Richmond treats the election as proof that only the armies can still create leverage. Winter stores and state reserves are pulled toward Virginia at the expense of nearly every civilian claim."
      },
      {
        id: "option_b",
        next: "black_confederate_debate",
        text: "Seek talks within reunion while insisting on generous paroles, state administration, and limits on confiscation.",
        proposer: "wolf",
        costDescription: "Political initiative with limited military relief.",
        effects: {
          metrics: { treasury: -8, publicMorale: +8, divergenceIndex: +0.05 },
          shards: { wolf: +28, hotspur: -12, fox: +6 }
        },
        consequence: "The administration explores the settlement Lincoln might accept rather than the independence he will not. No armistice follows, but the terms of eventual reunion become an active political question."
      },
      {
        id: "option_c",
        next: "black_confederate_debate",
        text: "Transfer more authority over food, militia, and local defense to willing governors.",
        proposer: "fox",
        costDescription: "Improves supply cooperation while weakening Richmond's direct control.",
        effects: {
          metrics: { militaryStrength: +4, treasury: +6, foodSupply: +12, divergenceIndex: +0.06 },
          shards: { fox: +26, hotspur: -8, wolf: +4 }
        },
        consequence: "The central government survives by sharing more power. Governors release stores and militia support in exchange for greater control over how the final campaign is sustained."
      },
      {
        id: "option_d",
        next: "black_confederate_debate",
        text: "Prepare a spring peace position while continuing the war through the winter.",
        proposer: "sovereign",
        costDescription: "Balanced but limited gains in endurance and negotiating leverage.",
        effects: {
          metrics: { militaryStrength: +3, treasury: -6, foodSupply: +6, publicMorale: +6, divergenceIndex: +0.04 },
          shards: { fox: +10, wolf: +14 }
        },
        consequence: "Davis refuses both immediate capitulation and empty defiance. The armies hold while commissioners assemble the strongest reunion terms still available if the military position breaks."
      }
    ]
  },

{
    id: "election_1864_mcclellan",
    turn: 24,
    date: "November 8, 1864",
    actor: "President Jefferson Davis",
    roleLabel: "Civil Executive",
    image: "/images/cw_pictures/Armistice.jpeg",
    title: "Election of 1864 — McClellan Wins, but Union Remains His Condition",
    description: "The campaign has denied Lincoln the sequence of victories that restored his coalition in the historical election. Atlanta remained unresolved too long, Confederate resistance in the Valley retained political force, and McClellan has carried enough Northern states to win. Yet this is not independence. McClellan repudiated the Chicago peace plank and made restoration of the Union a condition of settlement. Between election and inauguration, Lincoln remains president and Grant remains in command. Richmond has a narrow opportunity to shape an armistice or conditional reunion before battlefield events outrun the political transition.",
    letterTarget: "Confederate commissioners and Democratic intermediaries",
    sourceNotes: "Democratic Party Platform of 1864; McClellan acceptance letter, September 8 1864; Lincoln memorandum of August 23 1864; Lincoln, Collected Works vol. VII; McClellan, McClellan's Own Story; Nicolay and Hay vol. IX.",
    period_voice: "McClellan's acceptance letter made reunion the indispensable condition of peace, separating him from the Chicago platform's demand for an immediate cessation of hostilities.",
    primerTags: ["election_of_1864", "concurrent_majority_settlement", "copperhead_politics"],
    suppressCabinetCrisisAfter: true,
    choices: [
      {
        id: "option_a",
        next: "black_confederate_debate",
        text: "Offer an immediate armistice tied to reunion negotiations before the military situation changes.",
        proposer: "wolf",
        costDescription: "Strong political leverage, no guarantee Lincoln or Grant will pause.",
        effects: {
          metrics: { treasury: -10, publicMorale: +18, divergenceIndex: +0.12 },
          shards: { wolf: +30, hotspur: -12, fox: +6 }
        },
        consequence: "Confederate commissioners offer a cessation of hostilities without pretending McClellan promised independence. The proposal frames the next four months as a contest over the terms of reunion."
      },
      {
        id: "option_b",
        next: "black_confederate_debate",
        text: "Keep the armies intact until inauguration and bargain from continued possession of Richmond and Petersburg.",
        proposer: "fox",
        costDescription: "Preserves leverage but demands another winter of supply and casualties.",
        effects: {
          metrics: { militaryStrength: +8, munitions: -8, treasury: -12, foodSupply: -8, publicMorale: +10, divergenceIndex: +0.08 },
          shards: { fox: +28, hotspur: +4, wolf: +6 }
        },
        consequence: "Richmond treats territory and organized armies as the only negotiable currency McClellan cannot ignore. The price is surviving until March without allowing Grant to decide the question first."
      },
      {
        id: "option_c",
        next: "black_confederate_debate",
        text: "Demand recognition of independence and dare the president-elect to abandon his own Union condition.",
        proposer: "hotspur",
        costDescription: "Very high political risk and divergence; likely wastes the opening.",
        effects: {
          metrics: { militaryStrength: +4, treasury: -14, publicMorale: +12, divergenceIndex: +0.20 },
          shards: { hotspur: +28, wolf: -16, fox: -10 }
        },
        consequence: "The demand rallies hard-line opinion but collides with McClellan's public commitment to reunion. Democratic intermediaries warn that Richmond may be throwing away the one electoral result capable of changing the war."
      },
      {
        id: "option_d",
        endsCampaign: true,
        text: "Propose reunion through a Concurrent Majority amendment that McClellan will submit to Congress and the states.",
        proposer: "sovereign",
        costDescription: "Concludes the campaign in conditional reunion; ratification remains uncertain.",
        effects: {
          metrics: { treasury: -8, publicMorale: +20, divergenceIndex: +0.16 },
          shards: { wolf: +22, fox: +14, hotspur: -8 }
        },
        consequence: "CAMPAIGN CONCLUDED — The Confederate government accepts reunion under a McClellan presidency in exchange for his promise to submit a Concurrent Majority amendment to Congress and the states. McClellan can promise advocacy and submission, not ratification. The armies stand down while the constitutional struggle moves beyond this campaign."
      }
    ]
  },

{
    id: "black_confederate_debate",
    turn: 25,
    date: "February-March 1865",
    actor: "President Jefferson Davis",
    roleLabel: "Civil Executive",
    image: "/images/cw_pictures/Virginia debates emancipation for military service .jpeg",
    title: "Recruiting Colored Troops — Virginia Forces the Federal Hand",
    description: "The Confederacy is running out of men faster than it is running out of ground, but the question has not appeared overnight. Louisiana's free men of color formed a state militia regiment in 1861, Black men have served the armies for years in logistics and labor roles, and officers and politicians have debated armed enlistment with increasing urgency. Now the Virginia General Assembly has instructed both of Virginia's Confederate senators to support the national bill. That instruction is expected to decide the Senate vote. Congress can authorize Davis to accept Black soldiers, but owner consent, freedom, pay, command, and state manumission law still determine whether authorization becomes an army. Lee's headquarters also directs that the men be consulted over whether they prefer Colored Troops, Confederate troops, or volunteers. Davis must decide whether to force the federal measure through, use willing states to begin recruitment, attach explicit freedom terms, or preserve the old policy.",
    letterTarget: "the governors and Confederate Congress",
    sourceNotes: "OR ser. 4 vol. 3 pp. 1009-1012 (Lee to Andrew Hunter, January 11 1865); Journal of the Confederate Congress (March 1865 debates and act approved March 13); Virginia General Assembly joint resolutions instructing its senators; General Orders No. 14, March 23 1865; Charles Marshall for Lee to Ewell, March 27 1865; Freeman, R.E. Lee vol. IV ch. 1.",
    period_voice: "Lee to Andrew Hunter, January 11 1865: \"We must decide whether slavery shall be extinguished by our enemies and the slaves be used against us, or use them ourselves at the risk of the effects which may be produced upon our social institutions. My own opinion is that we should employ them without delay.\" (OR ser. 4 vol. 3 p. 1012)",
    primerTags: ["confederate_black_military_service", "conscription_substitution", "impressment_bread_riots"],
    suppressCabinetCrisisAfter: true,
    choices: [
      {
        id: "option_a",
        text: "Force the national bill through on Virginia's vote — instruct the rest of the cabinet and the press to treat the federal measure as already carried.",
        proposer: "hotspur",
        costDescription: "Sharp political backlash, possible manpower gain, high legitimacy shock.",
        effects: {
          metrics: { militaryStrength: +12, publicMorale: -12, divergenceIndex: +0.12 },
          shards: { hotspur: +20, fox: -8, wolf: -12 }
        },
        consequence: "Davis treats the Virginia legislature's instruction as decisive: with both Virginia senators bound, the Confederate Senate is whipped into line and the national bill is forced to a vote. Some new units begin to form under federal authority, but the political rupture in the rest of the Senate caucus is immediate and bitter."
      },
      {
        id: "option_b",
        text: "Press Virginia and other willing states to begin militia recruitment while the national measure is still in conference; treat federal passage as a follow-on, not a precondition.",
        proposer: "fox",
        costDescription: "Smaller immediate gain, faster implementation, lower congressional friction.",
        effects: {
          metrics: { militaryStrength: +8, treasury: +4, publicMorale: -4, divergenceIndex: +0.06 },
          shards: { fox: +28, hotspur: -6, wolf: +6 }
        },
        consequence: "Davis asks Virginia to turn legislative pressure into a state recruiting program and urges other willing governors to follow, drawing on Louisiana's earlier militia precedent. The national measure remains in the Senate, but the alternate state route begins moving while Richmond keeps talking."
      },
      {
        id: "option_c",
        text: "Tie the Virginia-driven federal vote to explicit freedom terms, soldier pay, and a political settlement Congress can defend in public.",
        proposer: "wolf",
        costDescription: "Treasury cost, diplomatic divergence, fractures congressional opponents.",
        effects: {
          metrics: { treasury: -10, publicMorale: +4, militaryStrength: +6, divergenceIndex: +0.16 },
          shards: { wolf: +30, hotspur: -18, fox: +4 }
        },
        consequence: "Davis uses Virginia's instruction as cover for a broader package: enlistment, manumission language, soldier pay, and prisoner-exchange leverage move through the Senate together. Congressional hard-liners rage, but foreign observers and Northern peace men can no longer say Richmond is entirely frozen in place."
      },
      {
        id: "option_d",
        text: "Refuse to use Virginia's instruction at the federal level. Leave any state experiment to the governors and keep the national doctrine intact.",
        proposer: "sovereign",
        costDescription: "No federal rupture now, but the central government forfeits the leverage Virginia just handed it.",
        effects: {
          metrics: { militaryStrength: -10, publicMorale: +6 },
          shards: { hotspur: +8, fox: -14, wolf: -10 }
        },
        consequence: "Davis declines to push the national bill on Virginia's instruction. Any state experiment remains uncertain, and the Confederate Senate never resolves the federal question. The army enters the final campaign more politically coherent at the center and materially weaker in the line."
      }
    ]
  },

{
    id: "petersburg_siege",
  turn: 20,
    date: "July 30, 1864",
    actor: "General Robert E. Lee",
    roleLabel: "Army Commander",
    image: "/images/cw_pictures/battle of petersburg.jpeg",
    title: "The Siege of Petersburg — The Crater",
    description: "For six weeks the armies have extended a growing network of trenches around Petersburg, the rail hub protecting Richmond's southern approaches. In the humid predawn darkness, the Union has detonated an enormous gunpowder mine beneath Elliott's Salient, tearing a crater and a wide breach through your sector. Burnside's divisions are moving into the broken works. This is the moment when the defensive line could collapse — or when a disciplined counterattack through the covered approaches could buy the Confederacy several more months of life.",
    letterTarget: "your wife Mary",
    sourceNotes: "OR ser. 1 vol. 40 pt. 1 pp. 524-792 (Crater reports of Mahone, Beauregard, and Burnside); Freeman, Lee's Lieutenants vol. III ch. 22; Battles and Leaders vol. IV pp. 545-560; Mahone's manuscript account in the Mahone Papers, Duke University.",
    period_voice: "Mahone after closing the Crater, July 30 1864: \"The men went into the work as if they meant to end it then and there.\" (Battles and Leaders vol. IV p. 558)",
    primerTags: ["conscription_substitution", "impressment_bread_riots", "wartime_industry"],
    choices: [
      {
        id: "option_a",
        text: "Launch an immediate, desperate counter-attack into the crater under Mahone.",
        proposer: "hotspur",
        costDescription: "Consumes 20 Military Strength, secures the breach.",
        successRate: 0.65,
        successEffects: {
          metrics: { militaryStrength: -15, munitions: -15, publicMorale: +25, divergenceIndex: +0.10 },
          shards: { hotspur: +30 }
        },
        successConsequence: "Total containment! Mahone trapped the Union divisions inside the crater, turning it into a complete tactical disaster for Grant. The Petersburg lines are stabilized.",
        failureEffects: {
          metrics: { militaryStrength: -12, munitions: -20, publicMorale: -8 },
          shards: { hotspur: +15, fox: -20 }
        },
        failureConsequence: "The counter-attack closes the breach only partially and at ugly cost. The line does not collapse at once, but the army spends precious men and ammunition for a reprieve that will not last."
      },
      {
        id: "option_b",
        text: "Seal the secondary works, contain the breach, and preserve the army rather than counterattacking into the crater at once.",
        proposer: "fox",
        costDescription: "Lower immediate losses, but risks leaving the Union lodged inside the works.",
        effects: {
          metrics: { militaryStrength: -7, munitions: -8, publicMorale: -4 },
          shards: { fox: +25, hotspur: -20 }
        },
        consequence: "Secondary lines and disciplined reserves prevent immediate collapse. The response lacks Mahone's dramatic counterstroke, but the Petersburg front survives the day without spending every available brigade in the crater."
      },
      {
        id: "option_c",
        text: "Mount a night sortie against Grant's forward siege works, wrecking sap rollers, gabions, and exposed rail parties before withdrawing.",
        proposer: "wolf",
        costDescription: "Aggressive but limited action. Costs men and ammunition while preserving the campaign line.",
        effects: {
          metrics: { militaryStrength: -10, munitions: -12, publicMorale: +14, divergenceIndex: +0.05 },
          shards: { wolf: +22, hotspur: +12, fox: -6 }
        },
        consequence: "The sortie burns siege material, disrupts forward working parties, and forces Grant's engineers to rebuild exposed approaches under fire. It does not break the siege, but it proves the Petersburg line can still strike back without gambling the whole army."
      },
      {
        id: "option_d",
        text: "Seed the crater approaches with new land mines and electrically fired torpedoes, then channel the Union assault into marked killing ground.",
        proposer: "sovereign",
        costDescription: "Consumes Treasury and munitions, but stays within period mine and torpedo experimentation.",
        effects: {
          metrics: { treasury: -18, munitions: -18, militaryStrength: -4, divergenceIndex: +0.04 },
          shards: { fox: +15, wolf: +10 }
        },
        consequence: "The new mines do not look like a future war machine; they look like desperate field engineering. Wires, buried shells, and marked lanes slow the Union rush long enough for artillery and reserves to seal the crater perimeter."
      }
    ]
  },

{
    id: "five_forks",
    turn: 26,
    date: "April 1, 1865",
    actor: "Maj. Gen. George E. Pickett",
    roleLabel: "Army Commander",
    image: "/images/cw_pictures/generic battle scene 2.jpeg",
    title: "Five Forks — The South Side Railroad Breaks",
    description: "Lee has ordered Five Forks held at all hazards. The crossroads protects Ford's Depot and the South Side Railroad, the last major supply artery feeding Petersburg. Sheridan's cavalry presses the front while Warren's V Corps moves against the exposed Confederate left. Pickett's command is isolated, the White Oak Road line is thin, and poor communication threatens to leave the generals behind the line when the assault begins. If Five Forks is lost, Grant can turn the Petersburg defenses and force the evacuation of both Petersburg and Richmond.",
    letterTarget: "General Robert E. Lee",
    sourceNotes: "OR ser. 1 vol. 46 pts. 1-3 (Appomattox Campaign reports and correspondence); Lee to Pickett, April 1 1865; Sheridan, Personal Memoirs vol. II; Grant, Personal Memoirs vol. II; NPS Petersburg National Battlefield, Five Forks campaign documentation.",
    period_voice: "Lee's order to Pickett on April 1 1865 was direct: \"Hold Five Forks at all hazards. Protect road to Ford's Depot and prevent Union forces from striking the Southside Railroad.\"",
    primerTags: ["conscription_substitution", "impressment_bread_riots", "election_of_1864"],
    suppressCabinetCrisisAfter: true,
    choices: [
      {
        id: "option_a",
        next: "richmond_evacuation",
        text: "Hold the extended White Oak Road line exactly as ordered and meet Sheridan's attack in place.",
        proposer: "hotspur",
        costDescription: "Historically disastrous exposure to a turning attack on the left.",
        effects: {
          metrics: { militaryStrength: -30, munitions: -16, publicMorale: -18 },
          shards: { hotspur: +18, fox: -22 }
        },
        consequence: "Warren's infantry overwhelms the refused left while Sheridan fixes the front. The line collapses from flank and rear, thousands are captured, and the South Side Railroad is opened to Grant."
      },
      {
        id: "option_b",
        next: "richmond_evacuation",
        text: "Refuse the left behind Gravelly Run, keep reserves near Ford's Road, and maintain continuous command at the front.",
        proposer: "fox",
        costDescription: "Best tactical defense, but the railroad remains under overwhelming pressure.",
        effects: {
          metrics: { militaryStrength: -10, munitions: -10, publicMorale: +6, divergenceIndex: +0.05 },
          shards: { fox: +30, hotspur: -8 }
        },
        consequence: "The refused flank absorbs the first Union blow and more of Pickett's command escapes north. Five Forks is eventually abandoned, but the army loses fewer prisoners and gains precious hours for Lee to organize evacuation."
      },
      {
        id: "option_c",
        next: "richmond_evacuation",
        text: "Withdraw before the full assault, save Pickett's division, and concede the crossroads and railroad.",
        proposer: "sovereign",
        costDescription: "Preserves troops while immediately making Petersburg untenable.",
        effects: {
          metrics: { militaryStrength: +4, munitions: +2, publicMorale: -22 },
          shards: { fox: +16, wolf: +6, hotspur: -16 }
        },
        consequence: "The division avoids encirclement, but the strategic price is immediate. Grant reaches the railroad and Lee must order the evacuation without the delay a contested Five Forks might have purchased."
      },
      {
        id: "option_d",
        next: "richmond_evacuation",
        text: "Strike Sheridan's cavalry near Dinwiddie before Warren completes his deployment, then fall back behind Ford's Road.",
        proposer: "wolf",
        costDescription: "High-risk attempt to disrupt Union coordination and preserve a retreat corridor.",
        successRate: 0.40,
        successEffects: {
          metrics: { militaryStrength: -8, munitions: -12, publicMorale: +14, divergenceIndex: +0.10 },
          shards: { wolf: +24, fox: +8 }
        },
        successConsequence: "The counterstroke disrupts Sheridan long enough for Pickett to shorten the line and save the Ford's Road corridor. The railroad cannot be held indefinitely, but the retreat begins with command cohesion intact.",
        failureEffects: {
          metrics: { militaryStrength: -24, munitions: -16, publicMorale: -14 },
          shards: { wolf: +8, fox: -14 }
        },
        failureConsequence: "The attack spends the last mobile reserve without breaking Sheridan's screen. Warren arrives against a disordered flank and the collapse follows more rapidly."
      }
    ]
  },

{
    id: "richmond_evacuation",
  turn: 27,
    date: "April 2-3, 1865",
    actor: "General Robert E. Lee",
    roleLabel: "Army Commander",
    image: "/images/cw_pictures/richmond_evacuation_theater_flux2.jpg",
    title: "Richmond Evacuation - The Capital Burns",
    description: "The Petersburg line has cracked and Richmond can no longer be defended as a capital, depot, and symbol at the same time. Fires are spreading near the warehouses, government clerks are trying to move records south, and Davis needs the army preserved long enough to keep any national authority alive. Lee must decide whether Richmond is worth one more stand, whether the army should move immediately toward Amelia Court House, or whether the evacuation itself can be used to shape the final political terms of the war.",
    letterTarget: "President Jefferson Davis",
    suppressCabinetCrisisAfter: true,
    primerTags: ["concurrent_majority_settlement", "impressment_bread_riots"],
    choices: [
      {
        id: "option_a",
        text: "Hold a short rearguard defense at Richmond to buy the government more time.",
        proposer: "hotspur",
        costDescription: "Severe military cost, temporary morale and political cover.",
        effects: {
          metrics: { militaryStrength: -28, munitions: -18, publicMorale: +10 },
          shards: { hotspur: +25, fox: -15 }
        },
        consequence: "The delay lets more officials escape, but every hour spent near the capital risks trapping the Army of Northern Virginia against converging Union columns."
      },
      {
        id: "option_b",
        next: "appomattox_decision",
        text: "Evacuate immediately and preserve the army for a linkup farther south.",
        proposer: "fox",
        costDescription: "Preserves strength, morale shock from abandoning the capital.",
        effects: {
          metrics: { militaryStrength: +8, munitions: +4, publicMorale: -18 },
          shards: { fox: +28, hotspur: -15 }
        },
        consequence: "The army leaves Richmond before the roads fully close. The decision is bleak, but it keeps organized command alive for at least one more march."
      },
      {
        id: "option_c",
        text: "Frame the evacuation as disciplined national continuity and seek mediated terms.",
        proposer: "wolf",
        costDescription: "Treasury cost, diplomatic divergence, limited battlefield relief.",
        effects: {
          metrics: { treasury: -15, publicMorale: +6, divergenceIndex: +0.08 },
          shards: { wolf: +30, hotspur: -8 }
        },
        consequence: "Dispatches emphasize order rather than collapse. The military situation remains desperate, but foreign and Northern political readers see a government still trying to negotiate rather than dissolve."
      },
      {
        id: "option_d",
        text: "Destroy military stores, protect civilian corridors, and move by night.",
        proposer: "sovereign",
        costDescription: "Moderate supply loss, stronger civilian legitimacy.",
        effects: {
          metrics: { munitions: -12, publicMorale: +12, treasury: -8 },
          shards: { fox: +12, wolf: +12 }
        },
        consequence: "The army loses stores it cannot carry, but fewer civilians are abandoned to the fires and confusion. The retreat begins with more order than Richmond expected."
      }
    ],
    branches: [
      // Tier 1 (highest divergence): the full alternate-history chain.
      // The only route to the Peace Crisis. It requires A.S. Johnston and
      // Jackson to survive, then the successful flank-assault result on the
      // Jackson-at-Gettysburg branch, in addition to the later political
      // conditions. Near-miss Gettysburg choices cannot unlock independence.
      {
        minDivergence: 0.72,
        scenarioId: "southern_independence_1864",
        requiredScenarios: ["gettysburg_with_jackson", "shiloh_army_of_tennessee", "election_1864_mcclellan"],
        requiredChoices: [
          { scenarioId: "shiloh_army_of_tennessee", choiceId: "option_b" },
          { scenarioId: "chancellorsville_aftermath", choiceId: "option_b" },
          { scenarioId: "gettysburg_with_jackson", choiceId: "option_a", choiceSucceeded: true }
        ],
        requiredChoiceGroups: [
          {
            any: [
              { scenarioId: "atlanta_election_pressure", choiceId: "option_b" },
              { scenarioId: "atlanta_election_pressure", choiceId: "option_c" }
            ]
          },
          {
            any: [
              { scenarioId: "third_winchester", choiceId: "option_d" },
              { scenarioId: "cedar_creek", choiceId: "option_a" }
            ]
          }
        ]
      },
      // Fallback at moderate divergence: the Greensboro
      // Convention. Reached when the campaign drifted from history but
      // did not deliver the full Johnston-Jackson-Gettysburg chain.
      { minDivergence: 0.55, scenarioId: "greensboro_convention" }
    ]
  },

{
    id: "appomattox_decision",
  turn: 28,
    // Explicit branches can reach this settlement before the numeric final
    // turn. Every choice here settles the campaign without repeating surrender.
    endsCampaign: true,
    date: "April 9, 1865",
    actor: "General Robert E. Lee",
    roleLabel: "Army Commander",
    image: "/images/cw_pictures/Davis and Lee.jpeg",
    title: "Appomattox — Parole, Conditional Reunion, or Fragmentation",
    description: "Your army is surrounded at Appomattox Court House. The rations are exhausted, ammunition is nearly gone, and the men are starving. Grant's terms are honorable, but Confederate political futures are not all the same. Full independence is no longer a plausible military outcome here; that chance would have required decisive victories in the North and foreign intervention long before this courthouse. The real question now is whether the war ends in parole and reunion, in a failed attempt at conditional political settlement, or in fragmented resistance that abandons coherent national command.",
    letterTarget: "the Southern People",
    sourceNotes: "OR ser. 1 vol. 46 pt. 1 pp. 1265-1296 and pt. 3 (Grant-Lee correspondence April 7-9 1865); Grant, Personal Memoirs vol. II ch. 67; Freeman, R.E. Lee vol. IV ch. 8; Battles and Leaders vol. IV pp. 729-746.",
    period_voice: "Lee to his army in General Orders No. 9, April 10 1865: \"After four years of arduous service, marked by unsurpassed courage and fortitude, the Army of Northern Virginia has been compelled to yield to overwhelming numbers and resources.\" (OR ser. 1 vol. 46 pt. 1 p. 1267)",
    primerTags: ["concurrent_majority_settlement", "faith_in_the_armies", "death_in_the_civil_war"],
    choices: [
      {
        id: "option_a",
        text: "Decline surrender. Disband the army into decentralized mountain guerrilla shards.",
        proposer: "hotspur",
        minDivergence: 0.35,
        costDescription: "Sparks indefinite domestic insurgency, drops Military Strength to zero.",
        effects: {
          metrics: { militaryStrength: -80, publicMorale: -40, treasury: -30, divergenceIndex: +0.6 },
          shards: { hotspur: +40, fox: -40, wolf: -40 }
        },
        consequence: "Formal surrender is rejected, but the army does not continue as a coherent national force. Commands splinter into holdouts, deserters, and partisan bands, trading organized campaigning for local violence and prolonged instability."
      },
      {
        id: "option_b",
        text: "Accept Grant's honorable surrender terms. Paroled men return home.",
        proposer: "fox",
        costDescription: "Preserves lives, concludes the war, restores civilian trust.",
        effects: {
          metrics: { militaryStrength: -5, publicMorale: +25, treasury: +20 },
          shards: { fox: +30, hotspur: -30, wolf: +20 }
        },
        consequence: "Lee accepts Grant’s terms for the Army of Northern Virginia at the McLean House. Paroles allow men to return home under the agreed conditions. Other Confederate forces have yet to surrender, and the political work of Reconstruction remains ahead."
      },
      {
        id: "option_c",
        text: "Seek a conditional military convention tied to reunion under negotiated political guarantees.",
        proposer: "wolf",
        costDescription: "Consumes remaining Treasury, moderate divergence, uncertain political payoff.",
        effects: {
          metrics: { treasury: -20, publicMorale: +12, divergenceIndex: +0.18 },
          shards: { wolf: +30, hotspur: -20 }
        },
        consequence: "Grant entertains military formalities but not foreign-style sovereignty. The appeal does not preserve independence, yet it can shape whether reunion looks like humiliation, parole, or a harder negotiated settlement."
      },
      {
        id: "option_d",
        text: "Execute a final, desperate charge to break Grant's infantry circle.",
        proposer: "sovereign",
        costDescription: "Catastrophic casualty rate, absolute defeat.",
        effects: {
          metrics: { militaryStrength: -75, publicMorale: -20, munitions: -10 },
          shards: { hotspur: +10, fox: -30 }
        },
        consequence: "The final charge was utterly routed in minutes. The remnants were captured, leading to unconditional surrender. A last act of defiance that will be remembered as both noble and tragic."
      }
    ]
  },

{
    id: "southern_independence_1864",
  turn: 28,
    date: "Autumn 1864 — Spring 1865",
    actor: "President Jefferson Davis",
    roleLabel: "Civil Executive",
    image: "/images/cw_pictures/Davis and Lee.jpeg",
    title: "The Peace Crisis — Independence, Armistice, or Concurrent Majority",
    description: "This is the timeline where it all changed. Jackson survived Chancellorsville and remade Gettysburg. The Western army held together after Shiloh because Johnston never rode into the kill zone. Four years of cumulative Confederate decisions have bent the war so far from its historical arc that Northern public opinion has reached a breaking point the Union never reached in the history we know. Grant is stalled. Sherman is bleeding. The autumn elections have shattered Lincoln's war coalition, and European powers are quietly drafting mediation proposals. Confederate armies still hold Virginia, the Valley is unbroken, and Richmond stands. Full independence is still on the table, but it is the hardest road. McClellan's candidacy, carried by a Democratic coalition with peace men inside it, offers something more plausible than recognized disunion: a restructured Federal Republic. Calhoun's Concurrent Majority meant that a numerical national majority should not govern a distinct sectional interest without that section's concurrent consent. The question is whether the South demands all or takes the next best thing.",
    letterTarget: "the Confederate People and the world",
    sourceNotes: "Calhoun, A Disquisition on Government (1851), on concurrent majority and sectional consent; Democratic Party Platform of 1864; George B. McClellan letter accepting the Democratic nomination, Sept. 8 1864, rejecting disunion while opposing Lincoln's war policy; Nevins, The War for the Union vol. IV; Foote, The Civil War vol. III.",
    period_voice: "McClellan's 1864 acceptance letter rejected disunion as a settlement even while condemning the administration's conduct of the war. This route treats his election as pressure for reunion under altered constitutional terms, not as automatic Southern independence.",
    suppressCabinetCrisisAfter: true,
    // The Peace Crisis is terminal. Any choice here ends the campaign and
    // routes the player to the final grade / Strategic Stability Index
    // summary, regardless of currentTurn. This prevents the inconsistent
    // state where a settlement is declared but the game keeps demanding
    // more turns.
    endsCampaign: true,
    primerTags: ["concurrent_majority_settlement", "election_of_1864", "cotton_diplomacy"],
    choices: [
      {
        id: "option_a",
        text: "Issue a formal declaration of unconditional independence. Demand immediate diplomatic recognition from Britain and France and accept nothing less.",
        proposer: "hotspur",
        minDivergence: 0.88,
        // Full independence is the maximum alternate-history outcome and is
        // gated by the three historical preconditions named in the Titans
        // Forge campaign design: a Western army that survived the loss of
        // A.S. Johnston, an Army of Northern Virginia that still had Jackson,
        // and the successful flank-assault branch at Gettysburg decisive
        // enough to bring Britain and France toward intervention.
        requiresHistory: {
          label: "Full independence requires A.S. Johnston living, Jackson living, and a successful Gettysburg flank assault large enough to bring Britain and France into the war.",
          allOf: [
            { scenarioId: "shiloh_army_of_tennessee", choiceId: "option_b", label: "Albert Sidney Johnston survives Shiloh (Shiloh: Keep Johnston behind the line)" },
            { scenarioId: "chancellorsville_aftermath", choiceId: "option_b", label: "Stonewall Jackson survives Chancellorsville (Chancellorsville: halt at the flank rupture)" },
            { scenarioId: "gettysburg_with_jackson", choiceId: "option_a", choiceSucceeded: true, label: "Gettysburg with Jackson — successful flank assault" }
          ]
        },
        costDescription: "Nearly impossible. Requires maximum divergence and the three historical conditions that make foreign recognition plausible.",
        effects: {
          metrics: { publicMorale: +50, divergenceIndex: +0.35, treasury: -20 },
          shards: { hotspur: +45, fox: -15, wolf: -10 }
        },
        consequence: "Davis's proclamation converts the earlier diplomatic breakthrough into final peace. Britain and France make clear that recognition will be backed by mediation and material pressure, while the Northern peace wing breaks the remaining war coalition. The guns fall silent and the Confederacy's independence moves from recognition in principle to settled international fact."
      },
      {
        id: "option_b",
        text: "Accept European-brokered mediation and propose a binding armistice along the existing military lines, with sovereignty negotiated afterward.",
        proposer: "fox",
        minDivergence: 0.82,
        // European armistice is a half-step short of unconditional
        // independence and is gated by the same alternate-history record
        // that makes foreign mediation politically credible: the Western
        // army intact under Johnston, Jackson present at Gettysburg, and a
        // successful Gettysburg flank-assault outcome.
        requiresHistory: {
          label: "European armistice requires A.S. Johnston living, Jackson living, and a successful Gettysburg flank assault decisive enough to draw Britain and France toward mediation.",
          allOf: [
            { scenarioId: "shiloh_army_of_tennessee", choiceId: "option_b", label: "Albert Sidney Johnston survives Shiloh" },
            { scenarioId: "chancellorsville_aftermath", choiceId: "option_b", label: "Stonewall Jackson survives Chancellorsville" },
            { scenarioId: "gettysburg_with_jackson", choiceId: "option_a", choiceSucceeded: true, label: "Gettysburg with Jackson — successful flank assault" }
          ]
        },
        costDescription: "Very hard. Requires sustained high-divergence play and the alternate-history record that makes European mediation credible.",
        effects: {
          metrics: { publicMorale: +32, treasury: +18, militaryStrength: +10, divergenceIndex: +0.22 },
          shards: { fox: +38, wolf: +12, hotspur: -8 }
        },
        consequence: "French and British envoys arrive in Washington with a draft armistice that Grant's army cannot simply ignore. Meade and Lee agree to a ceasefire along the existing lines, and commissioners begin drafting the boundary terms in Richmond. Southern independence, without proclamation, settles across the continent like weather — a fact before it is a treaty."
      },
      {
        id: "option_c",
        text: "Work through McClellan's Democratic coalition toward a conditional armistice: he will propose to Congress and the states a Concurrent Majority compact giving both sections veto power over federal acts affecting sectional sovereignty.",
        proposer: "wolf",
        // The McClellan / Concurrent Majority path is the baseline
        // achievable McClellan-victory ending. It requires the two
        // historical conditions that delivered him the election in this
        // branch — Atlanta delayed past the orthodox fall and Cedar Creek
        // ending as a Confederate victory — but does NOT require the
        // foreign-intervention chain that gates unconditional independence.
        requiresHistory: {
          label: "Concurrent Majority settlement requires the two conditions that delivered McClellan the election: Atlanta delayed past September and a Confederate result at Cedar Creek.",
          allOf: [
            { scenarioId: "atlanta_election_pressure", choiceId: "option_b", label: "Atlanta delayed (Keep Johnston)" },
            {
              label: "Cedar Creek ended as a Confederate victory",
              anyOf: [
                { scenarioId: "cedar_creek", choiceId: "option_a", label: "Cedar Creek — decisive Confederate victory" },
                { scenarioId: "cedar_creek", choiceId: "option_c", label: "Cedar Creek — narrow Confederate withdrawal with prisoners and supply" }
              ]
            }
          ]
        },
        costDescription: "The most achievable good outcome. Not independence, and not guaranteed ratification, but the Alternate History Settlement closes the campaign on a proposed constitutional reform rather than unconditional surrender.",
        effects: {
          metrics: { publicMorale: +30, treasury: +22, divergenceIndex: +0.15, militaryStrength: +8 },
          shards: { wolf: +45, fox: +18, hotspur: -20 }
        },
        consequence: "CAMPAIGN CONCLUDED — Alternate History Settlement. McClellan wins the November election and Confederate envoys are waiting. He promises to ask Congress and the states for a constitutional settlement drawn from Calhoun's Concurrent Majority: no legislation touching sectional sovereignty would pass without concurrent consent from both sections. The South accepts an armistice not as independence, but as a wager that reunion can be made conditional through formal amendment rather than imposed by arms alone. McClellan supports the proposal; ratification by Congress and the states is not guaranteed. The campaign closes here."
      },
      {
        id: "option_d",
        text: "Offer Lincoln a modified federal compact before McClellan can win: permanent state sovereignty, no slavery extension to territories, voluntary reconstruction funds — end the killing without requiring a new president.",
        proposer: "sovereign",
        costDescription: "Deeply uncertain. Lincoln may reject it outright. But a deal struck before McClellan wins gives the South the best constitutional language it will get from a war president. Always available as a fallback even when the McClellan and independence conditions have not been earned.",
        effects: {
          metrics: { publicMorale: +18, treasury: +8, divergenceIndex: +0.28, militaryStrength: +4 },
          shards: { fox: +18, wolf: +20, hotspur: -18 }
        },
        consequence: "The offer lands in Washington like a diplomatic grenade. Lincoln, facing political collapse and aware that McClellan waits in the wings, accepts the framework over his own cabinet's objections. The settlement is not Calhoun's Concurrent Majority in full, but it embeds state sovereignty deep enough into the post-war constitutional language that a reunited republic looks nothing like the centralized Union Lincoln started the war to preserve."
      }
    ]
  },

{
    id: "greensboro_convention",
  turn: 28,
    date: "April 1865",
    actor: "President Jefferson Davis",
    roleLabel: "Civil Executive",
    image: "/images/cw_pictures/Davis and Lee.jpeg",
    title: "Greensboro Convention — Parole, Armistice, or Exhaustion",
    description: "This timeline has diverged too far to end neatly at Appomattox. Richmond has been abandoned, the field armies are still partly intact, but enlistments are expiring, bread riots and supply failures are spreading, and governors are asserting their own authority over men and food. In Greensboro, civilian and military leaders weigh whether to parole armies by department, seek a temporary armistice, or let the war decay into scattered state resistance. The issue is no longer just battlefield honor; it is whether any coherent civil order can outlast the war's exhaustion.",
    letterTarget: "the governors and people of the South",
    primerTags: ["concurrent_majority_settlement", "impressment_bread_riots", "border_state_bargain"],
    choices: [
      {
        id: "option_a",
        text: "Reject the convention and urge governors to continue resistance with whatever men remain under arms.",
        proposer: "hotspur",
        costDescription: "Sharp morale and military collapse, severe divergence.",
        effects: {
          metrics: { militaryStrength: -45, publicMorale: -25, treasury: -20, divergenceIndex: +0.35 },
          shards: { hotspur: +35, fox: -35, wolf: -20 }
        },
        consequence: "Some officers obey, but many soldiers simply drift home or vanish on the roads. What remains is resistance by fragments: raids, holdouts, and local vendettas rather than a national army in the field."
      },
      {
        id: "option_b",
        text: "Accept departmental paroles and organize food relief before the remaining armies melt away.",
        proposer: "fox",
        costDescription: "Preserves lives, steadies morale, and restores civil order.",
        effects: {
          metrics: { militaryStrength: -10, publicMorale: +20, treasury: +10 },
          shards: { fox: +30, hotspur: -25, wolf: +10 }
        },
        consequence: "The field armies are disbanded under supervision rather than shattered in one last campaign. Food wagons turn toward towns and farms, and governors regain something like ordinary civil responsibility."
      },
      {
        id: "option_c",
        text: "Seek a ninety-day armistice and relief convention with foreign consuls as witnesses.",
        proposer: "wolf",
        costDescription: "Treasury cost, diplomatic upside, strong divergence.",
        effects: {
          metrics: { treasury: -20, publicMorale: +15, divergenceIndex: +0.25 },
          shards: { wolf: +30, fox: +5, hotspur: -15 }
        },
        consequence: "Washington refuses formal recognition, but temporary ceasefire corridors and relief talks buy time. The war ends not in a single surrender scene, but in negotiation, exhaustion, and political ambiguity."
      },
      {
        id: "option_d",
        text: "Order soldiers home to harvest and preserve local order under state authority.",
        proposer: "sovereign",
        costDescription: "Reduces military power, stabilizes civilian endurance, moderate divergence.",
        effects: {
          metrics: { militaryStrength: -30, publicMorale: +10, treasury: +5, divergenceIndex: +0.15 },
          shards: { fox: +10, wolf: +15, hotspur: -10 }
        },
        consequence: "The armies do not evaporate in one moment; they unravel. Men leave for farms and families, governors reclaim militia authority, and the war ends through demobilization and weariness more than one final battlefield verdict."
      }
    ]
  },

{
    id: "hotspur_cabinet_crisis",
    turn: 0,
    crisisFor: "hotspur",
    date: "Emergency Session",
    actor: "President Jefferson Davis",
    roleLabel: "Civil Executive",
    image: "/images/cw_pictures/Davis cabinet.jpeg",
    title: "Cabinet Crisis — Fire-Eaters In Revolt",
    description: "Telegrams from the front and editorials from Richmond alike accuse the government of hesitation. Fire-eater politicians, hard-driving brigade officers, and restless newspaper men are demanding renewed offensive action while enlistments expire and stragglers drift home. Civil authority still governs the war, but if their anger is ignored, discipline in the field may give way to unauthorized raids, leave-taking, and open insubordination.",
    letterTarget: "the governors and generals",
    choices: [
      {
        id: "option_a",
        text: "Authorize a sharp offensive demonstration to satisfy the fire-eaters and steady the camps.",
        proposer: "hotspur",
        costDescription: "Military and munitions cost, restores Hotspur alignment, raises morale.",
        effects: {
          metrics: { militaryStrength: -12, munitions: -12, publicMorale: +15, divergenceIndex: +0.06 },
          shards: { hotspur: +35, fox: -10 }
        },
        shardAlignmentFloor: { hotspur: 35 },
        consequence: "The order for action quieted the loudest agitators and brought stragglers back toward the colors, though at the price of another risky offensive temper in camp."
      },
      {
        id: "option_b",
        text: "Refuse theatrics. Rotate exhausted regiments, punish unauthorized leave, and rebuild the ranks deliberately.",
        proposer: "fox",
        costDescription: "Moderate treasury cost, strengthens discipline and restores mixed support.",
        effects: {
          metrics: { treasury: -10, militaryStrength: +8, publicMorale: +5 },
          shards: { hotspur: +15, fox: +25 }
        },
        shardAlignmentFloor: { hotspur: 35 },
        consequence: "The camps resent another week without glory, but furlough schedules and strict discipline reduce straggling and keep the army from dissolving into grievance and rumor."
      },
      {
        id: "option_c",
        text: "Summon governors, clergy, and senior officers to publicly restate civilian control and the duty to remain under arms.",
        proposer: "wolf",
        costDescription: "Treasury cost, restores legitimacy and calms political agitation.",
        effects: {
          metrics: { treasury: -12, publicMorale: +10 },
          shards: { hotspur: +10, wolf: +25, fox: +10 }
        },
        shardAlignmentFloor: { hotspur: 35 },
        consequence: "The proclamation campaign does not excite the camps, but it blunts the claim that Richmond has lost its grip and reasserts that the war remains under lawful civil authority."
      },
      {
        id: "option_d",
        text: "Clear bounty arrears and offer short harvest furloughs in exchange for renewed service pledges.",
        proposer: "sovereign",
        costDescription: "Treasury strain, stabilizes morale and slows desertion.",
        effects: {
          metrics: { treasury: -18, militaryStrength: +5, publicMorale: +12 },
          shards: { hotspur: +20, fox: +10, wolf: +5 }
        },
        shardAlignmentFloor: { hotspur: 35 },
        consequence: "Paymasters and furlough papers calm the camps faster than rhetoric. More men remain with the army, even if only because they now believe Richmond remembers their families."
      }
    ]
  },

{
    id: "fox_supply_crisis",
    turn: 0,
    crisisFor: "fox",
    date: "Quartermaster Emergency",
    actor: "Secretary of War James Seddon",
    roleLabel: "War Department",
    image: petersburgCard,
    title: "Cabinet Crisis — Rail, Shoes, and Rations",
    description: "Quartermasters and governors are warning that the war can no longer be run on emergency improvisation alone. Shoes, fodder, salt meat, and rail capacity are failing at once, while state officials resist new impressments and local farmers hide grain from Confederate agents. If the practical bloc is ignored much longer, men will not necessarily mutiny; they will simply go hungry, drift home, and leave the colors one wagon at a time.",
    letterTarget: "the quartermasters and governors",
    choices: [
      {
        id: "option_a",
        text: "Impose emergency impressment and seize state depots before the armies starve in place.",
        proposer: "hotspur",
        costDescription: "Treasury gain, morale loss, partial supply recovery.",
        effects: {
          metrics: { treasury: +15, munitions: +10, publicMorale: -15 },
          shards: { hotspur: +20, fox: +10, wolf: -10 }
        },
        shardAlignmentFloor: { fox: 35 },
        consequence: "The depots fill, but the countryside seethes. You save the campaign's immediate supply crisis at the cost of sharper resentment among civilians and state authorities."
      },
      {
        id: "option_b",
        text: "Centralize the railroads, ration offensives, and rebuild the commissary before asking for another battlefield gamble.",
        proposer: "fox",
        costDescription: "Treasury cost, major munitions recovery, restores Fox alignment.",
        effects: {
          metrics: { treasury: -10, munitions: +20, militaryStrength: +5 },
          shards: { fox: +35, hotspur: -10 }
        },
        shardAlignmentFloor: { fox: 35 },
        consequence: "Rail schedules are finally subordinated to army need, shoes and ammunition begin reaching the ranks again, and the practical men in Richmond stop openly predicting collapse."
      },
      {
        id: "option_c",
        text: "Negotiate state supply quotas with governors and merchants instead of forcing another round of seizures.",
        proposer: "wolf",
        costDescription: "Treasury cost, morale gain, moderate supply recovery.",
        effects: {
          metrics: { treasury: -15, munitions: +12, publicMorale: +10 },
          shards: { fox: +20, wolf: +25 }
        },
        shardAlignmentFloor: { fox: 35 },
        consequence: "The quotas arrive more slowly than seizure parties would like, but they arrive with less bitterness, and governors return to the table instead of denouncing Richmond from their capitals."
      },
      {
        id: "option_d",
        text: "Grant short harvest furloughs and local recruitment bonuses to keep soldiers tied to the colors through the next season.",
        proposer: "sovereign",
        costDescription: "Short-term military dip, morale gain, steadier reenlistment base.",
        effects: {
          metrics: { militaryStrength: -5, treasury: -8, publicMorale: +15 },
          shards: { fox: +15, hotspur: +5, wolf: +10 }
        },
        shardAlignmentFloor: { fox: 35 },
        consequence: "Some officers complain about thinning the line, but more men return after furlough than had been staying under compulsion alone. The army holds together by concession rather than coercion."
      }
    ]
  },

{
    id: "wolf_finance_crisis",
    turn: 0,
    crisisFor: "wolf",
    date: "Confidential Finance Council",
    actor: "Judah P. Benjamin",
    roleLabel: "Diplomatic Secretary",
    image: chancellorsvilleCard,
    title: "Cabinet Crisis — Bonds, Blockade, and Civil Confidence",
    description: "The diplomatic and financial bloc is warning that confidence is collapsing faster than armies. Cotton bonds are faltering, blockade-running insurers are charging ruinous rates, and peace men in both North and South are beginning to say openly that the treasury is chasing a war the public can no longer feed. If nothing is done, the Confederacy will not be overthrown by decree; it will be hollowed out by unpaid notes, closed warehouses, and a civilian public that stops believing sacrifice will ever end.",
    letterTarget: "the financiers and consuls",
    choices: [
      {
        id: "option_a",
        text: "Seize speculative cotton stores and force emergency war-bond purchases from the commercial houses.",
        proposer: "hotspur",
        costDescription: "Treasury recovery, morale cost, limited diplomatic backlash.",
        effects: {
          metrics: { treasury: +20, publicMorale: -10 },
          shards: { hotspur: +20, wolf: +10, fox: -5 }
        },
        shardAlignmentFloor: { wolf: 35 },
        consequence: "The treasury refills for the moment, but merchants and editors denounce the heavy hand of Richmond. You buy cash quickly at the price of broader civilian trust."
      },
      {
        id: "option_b",
        text: "Publish an austerity program, protect rail payments, and prioritize bread and salt over prestige spending.",
        proposer: "fox",
        costDescription: "Moderate treasury gain, restores confidence through restraint.",
        effects: {
          metrics: { treasury: +10, publicMorale: +5, munitions: +5 },
          shards: { fox: +20, wolf: +15 }
        },
        shardAlignmentFloor: { wolf: 35 },
        consequence: "The program is grim, but credible. Bond confidence steadies because civilians can see that the state is still capable of sober administration rather than theatrical promises."
      },
      {
        id: "option_c",
        text: "Send commissioners abroad and circulate a conciliatory political message to reopen credit and peace pressure.",
        proposer: "wolf",
        costDescription: "Treasury cost, morale gain, diplomatic divergence.",
        effects: {
          metrics: { treasury: -15, publicMorale: +10, divergenceIndex: +0.06 },
          shards: { wolf: +35, hotspur: -10 }
        },
        shardAlignmentFloor: { wolf: 35 },
        consequence: "The commissioners do not guarantee recognition, but they slow the sense of financial isolation and give civilians a reason to imagine something other than endless exhaustion."
      },
      {
        id: "option_d",
        text: "Open relief kitchens in the hardest-hit towns and suspend selected impressments to restore civilian trust.",
        proposer: "sovereign",
        costDescription: "Treasury cost, strong morale recovery, moderate political stabilization.",
        effects: {
          metrics: { treasury: -12, publicMorale: +18 },
          shards: { wolf: +20, fox: +10, hotspur: -5 }
        },
        shardAlignmentFloor: { wolf: 35 },
        consequence: "The policy does not solve the blockade, but it cools town anger and bread-riot talk. Civilians continue to suffer, yet fewer believe they have been utterly abandoned by the government."
      }
    ]
  }
];

// --- Production-safe asset resolution -------------------------------------
// Battle-card images were referenced as bare "/src/assets/images/x.jpg" strings,
// which only resolve under `vite dev` and 404 in a production `vite build`.
// Vite's import.meta.glob hashes them properly for both dev and build.
// Guarded so the module still imports cleanly under plain Node (headless harness/tests).
try {
  if (typeof import.meta !== 'undefined' && typeof import.meta.glob === 'function') {
    const cardImages = import.meta.glob('../assets/images/*.jpg', { eager: true, import: 'default' });
    for (const scenario of STATIC_SCENARIOS) {
      if (scenario.image) {
        const file = scenario.image.split('/').pop();
        const resolved = cardImages[`../assets/images/${file}`];
        if (resolved) scenario.image = resolved;
      }
    }
  }
} catch {
  // Non-Vite runtime (Node): leave image strings as-is; they aren't rendered there.
}

// Derive historical image lookups from the shared media catalog.
export const HISTORIC_MAPS = Object.fromEntries(
  STATIC_SCENARIOS.map((scenario) => [scenario.id, resolveScenarioMedia(scenario.id).src])
);

// Map authentic clashing advisor opinions to the scenarios
export const HISTORIC_ADVISORS = {
  naval_technology: {
    hotspur: "Steel and fire! Armored ironclads are the future of naval warfare. Build the CSS Virginia and smash their wooden fleet at Hampton Roads!",
    fox: "Our rivers are our lifelines. Fortify the Mississippi with river ironclads and defensive mine barriers to deny them inland passage.",
    wolf: "Fund early submarine research to explore another way of attacking the blockade. An operational boat this soon would be a hypothetical acceleration, not the later Hunley already ready for service."
  },
  shiloh_army_of_tennessee: {
    hotspur: "Grant is exposed at Pittsburg Landing. Drive Johnston forward, finish the collapse, and turn surprise into the decisive Western victory the Confederacy has been waiting for.",
    fox: "One battle is not the only prize. Preserve Johnston, tighten command reserve, and build a Western army that can hold Tennessee, rails, and depots after the smoke clears.",
    wolf: "A Western victory matters politically only if we narrate it correctly. Make Shiloh look like proof that the Mississippi Valley cannot be conquered cheaply, and peace pressure will grow faster."
  },
  first_winchester: {
    hotspur: "Banks is reeling and Winchester is the gate. Hit him hard enough and the lower Valley becomes our granary again instead of his retreat road.",
    fox: "Take the town and the mills intact. The point is not merely to win at Winchester, but to make the Valley feed the army for the campaigns still ahead.",
    wolf: "A victory here should frighten Washington and steady Valley civilians at the same time. Panic on the roads is useful, but preserved stores are better."
  },
  fort_sumter: {
    hotspur: "The secessionist batteries have dared block our supply! Return their fire and maintain the honor of the flag, whatever the cost in masonry!",
    fox: "Our men are starving, and the fort cannot withstand a prolonged siege. Negotiate a disciplined evacuation so we can fight again under better skies.",
    wolf: "The bombardment has already begun the war. Prolong negotiations to buy the relief expedition time, while making clear that our garrison is holding under fire."
  },
  radical_republican_crisis: {
    hotspur: "Restraint has made us look weak. Call Congress, raise the men, fund the army, and answer rebellion with overwhelming national force.",
    fox: "Do not let outrage wreck the coalition before the war even has a map. Mobilize, yes, but keep Maryland, Kentucky, and Missouri inside the Union argument.",
    wolf: "The story can still be controlled. Let radicals thunder while the administration defines rebellion, lawful restraint, and Union legitimacy for newspapers and foreign readers."
  },
  charleston_harbor_escape: {
    hotspur: "The garrison has escaped! Turn this success into a storm: launch immediate counter-raids on their exposed batteries while they are in confusion!",
    fox: "Do not squander our survivors. Parade them as proof of Northern discipline and fill our recruiting depots while our credit is strong.",
    wolf: "Dispatch the harbor chart copies to European salons immediately. Let foreign eyes see how brittle the rebel hold on Charleston truly is."
  },
  manassas_battlefield: {
    hotspur: "Jackson holds Henry Hill like a stone wall! Charge their batteries on the flank and sweep the blue columns back across Bull Run in panic!",
    fox: "Hold our ground. Draw their forces onto our defensive lines and preserve our infantry reserves. Logistics wins this day, not wild charges.",
    wolf: "Keep a withdrawal route open before the field is lost. Preserving the army may offer more political leverage than a last stand on Henry Hill."
  },
  seven_days: {
    hotspur: "Drive McClellan back to the James River! Aggressive frontal pressure will break their morale and free Richmond from the siege!",
    fox: "Let them waste their strength on our earthworks. Rebuild our supply trains and wait for them to bleed out in the swamps.",
    wolf: "Use Northern copperhead channels and war-weariness editors. A victory here is leverage only if Richmond turns it into pressure behind McClellan's lines."
  },
  second_manassas: {
    hotspur: "Slam into Pope's flank while he is focused on Jackson! A decisive blow will smash the Union center and open the road to Maryland!",
    fox: "Hold the railway cut. Maintain defensive screens, preserve our munitions, and let their columns exhaust themselves in futile assaults.",
    wolf: "Exploit Pope's captured dispatches and the press panic. This victory should confuse Union command and politics before anyone can package defeat as order."
  },
  potomac_leverage_campaign: {
    hotspur: "We have crossed the Potomac! Drive aggressively toward Harrisburg, seize the state house, and force them into a final battlefield crisis!",
    fox: "Entrench along the Monocacy. Force McClellan to attack us on our own ground, saving our men and munitions.",
    wolf: "Establish contacts with the peace democrats in Baltimore. We must turn our military presence into immediate political leverage."
  },
  antietam: {
    hotspur: "Hold the Bloody Lane! Counter-attack their center with everything we have and drive McClellan back across the creek!",
    fox: "Withdraw our exposed divisions, fortify the high grounds, and slip back across the Potomac before we are pinned down.",
    wolf: "Make a public appeal to European observers. Show them our tactical resilience is proof of sovereign statehood."
  },
  emancipation_cabinet_debate: {
    hotspur: "If emancipation is a war measure, then make it serve the army. The proclamation must open recruiting ground, not merely fill newspaper columns.",
    fox: "Move carefully. Maryland, Kentucky, and Missouri still matter, and a proclamation that breaks the coalition before the recruits arrive would be poor arithmetic.",
    wolf: "Europe is the key audience beyond the cabinet room. If Britain or France intervene after this, they must explain why they are helping slavery's government against a Union war measure."
  },
  fredericksburg_winter_politics: {
    hotspur: "Fredericksburg has broken them on the heights. Strike again before winter excuses their weakness and turns victory into idleness.",
    fox: "The battle is won. The next campaign will be lost in mud and frost if we do not use this pause for shoes, discipline, camp order, and controlled humanity on the river line.",
    wolf: "The spectacle of slaughter works only if we shape the narrative. Make Fredericksburg a political argument for exchange, mediation, and Northern war weariness."
  },
  chancellorsville_maneuver: {
    hotspur: "Divide the army and trust Jackson. The enemy right is hanging in the air, and a hidden march through the Wilderness can roll it up before Hooker understands the danger.",
    fox: "Hooker outnumbers us and Sedgwick is still behind us. Keep the army compact, fortify the crossroads, and make the Union pay for every yard.",
    wolf: "Mask the movement with Stuart's screens and false reports toward the fords. If Hooker misreads our intent, the flank blow will carry political weight far beyond Virginia."
  },
  chancellorsville_aftermath: {
    hotspur: "The flank is broken. Press the attack before darkness gives them time to think, and turn surprise into complete rout.",
    fox: "The surprise has done its work. Halt, dress the lines, and keep Jackson out of the murderous darkness. The greater prize may be preserving him for Pennsylvania.",
    wolf: "Turn the blow into a message immediately. The world must see that Hooker's grand offensive has been wrecked by Confederate maneuver."
  },
  gettysburg_campaign_setup: {
    hotspur: "Pennsylvania is ripe for one concentrated shock. Force the battle now, before Meade settles and before the road network slips back out of our hands.",
    fox: "Do not let rumor choose the field. Rebuild the picture, locate Stuart, and force Meade to attack a line we understand.",
    wolf: "The invasion's value is political pressure. Widen the panic toward the Susquehanna and make the North feel exposed everywhere at once."
  },
  gettysburg_with_jackson_setup: {
    hotspur: "Jackson lives. Use the one surviving commander in this army who can still turn road dust into immediate violence before the enemy is ready.",
    fox: "Jackson surviving matters only if it improves command coherence. Keep him and Longstreet aligned and stop Gettysburg from becoming another improvised frontal altar.",
    wolf: "Jackson changes the shape of fear. Threaten the Baltimore Pike and the Susquehanna line, and let Pennsylvania panic do part of the fighting for us."
  },
  gettysburg_with_jackson: {
    hotspur: "Jackson is alive. Use him like Jackson: seize the heights before the Federals can breathe and turn Gettysburg into a battlefield panic instead of a static duel.",
    fox: "This is the value of Jackson surviving. Not romance, but tempo and coordination. Use him to keep Longstreet and the left hook aligned, not to feed another frontal myth.",
    wolf: "Jackson's survival changes the political theater as much as the battlefield. Threaten Washington's communications and make Gettysburg look like a campaign crisis, not just a local fight."
  },
  gettysburg_recognition_crisis: {
    hotspur: "Recognition is leverage, not peace. Keep the armies moving and force Washington to concede more than the present line.",
    fox: "The military object has been achieved. An armistice backed by Britain and France secures the army, the treasury, and independence before another campaign can spend them.",
    wolf: "Take the settlement. Recognition without an armistice is a diplomatic fact; recognition joined to mediation is an enforceable victory."
  },
  susquehanna_offensive: {
    hotspur: "Harrisburg lies open! Force the crossings and seize their main supply depots before their militia can organize!",
    fox: "Entrench along the river bends. Let them attack our fortifications while we harvest the Pennsylvania resources.",
    wolf: "Turn the panic inward. Governors, peace editors, and railroad boards can pressure Washington faster than another distant appeal to European cabinets."
  },
  gettysburg_decision: {
    hotspur: "Charge Pickett's Division straight up the center! We will pierce their stone wall and break the union line forever!",
    fox: "Decline this suicidal charge. Reposition south, get between Meade and Washington, and force him to attack us.",
    wolf: "Withdraw in orderly columns. The invasion has achieved its purpose of stripping their depots. Save the army to fight in Virginia."
  },
  chickamauga: {
    hotspur: "Bragg! Launch immediate frontal assaults through the dense undergrowth and crush their vanguard before they can fortify!",
    fox: "Use Longstreet's concentrated column to pierce their center gap. It is a disciplined tactical strike that will shatter their right wing.",
    wolf: "Richmond has sent advice: coordinate with the war cabinet, avoid rash maneuvers, and wait for supply reinforcements."
  },
  chattanooga_stranglehold: {
    hotspur: "Storm the ridges! Turn the siege into an immediate battlefield assault before Grant can organize a relief force!",
    fox: "Tighten the rail siege. Preserve our munitions, starve their garrison, and maintain a disciplined grip on the theater.",
    wolf: "Use our victory at Chickamauga to fuel peace campaigns in the North. Turn their tactical defeat into a domestic political crisis."
  },
  wilderness: {
    hotspur: "Grant has opened the Overland Campaign. Strike his columns in the thickets before his numbers and persistence turn every road south into a grinding siege.",
    fox: "The point is not one dramatic blow. Hold the Brock Road, force him to pay at each crossroads, and make the Overland Campaign an attritional ledger he cannot ignore.",
    wolf: "The horror is too great. Propose a temporary humanitarian truce to rescue the wounded burning alive in the fires and shape the political memory of this campaign's opening."
  },
  new_market: {
    hotspur: "Throw the line forward before Sigel settles. Bushong's fields are worth blood if they keep the Valley in Confederate hands and the granaries southbound.",
    fox: "Hold the pike, preserve the cadets for the right moment, and secure the farms and mills. New Market matters because it feeds later battles, not because it flatters one speech.",
    wolf: "The cadets will become a story no matter what; make sure the story escorts flour, fodder, and state confidence back toward Richmond."
  },
  atlanta_election_pressure: {
    hotspur: "Enough retreat. Replace Johnston, unleash Hood, and hit Sherman hard enough to prove Atlanta is not just another city to be traded away.",
    fox: "Johnston's retreats are not cowardice if they keep the army whole and Atlanta unconquered through the election season. Time is a weapon here.",
    wolf: "Atlanta is a Northern political test as much as a Georgia campaign. Stretch the timetable, feed peace agitation, and turn every week of delay into pressure on Lincoln."
  },
  fall_of_atlanta: {
    hotspur: "Reopen the Macon road at Jonesborough. Atlanta is still defensible if the army strikes before Sherman turns maneuver into a finished political victory.",
    fox: "Do not lose the army to save a city whose rails are already being cut. Evacuate in order and preserve the force that must fight after Atlanta.",
    wolf: "The calendar is the battlefield. Hold Atlanta only if the defense can deny Lincoln his September headline without trapping Hood inside the works."
  },
  black_confederate_debate: {
    hotspur: "If the state is dying, use every man who will fight. Force the issue now and stop pretending old formulas can still fill the line.",
    fox: "Do it where it can actually happen. Push willing states like Virginia and Louisiana to raise militia formations directly instead of wasting more months inside Congress.",
    wolf: "Tie enlistment to freedom terms and turn necessity into political leverage. The manpower question is now inseparable from the settlement the Confederacy can still claim to seek."
  },
  third_winchester: {
    hotspur: "Charge through the Berryville Canyon approach toward Sheridan's center! We must show them the spirit of the Valley is not yet broken!",
    fox: "Fall back to the stone walls south of Winchester. Form tight defensive rings and save the core of the army.",
    wolf: "Spread favorable reports through Northern peace networks to sustain political hope. But the army must buy its own time; a rumor will not halt Sheridan's columns."
  },
  cedar_creek: {
    hotspur: "The dawn surprise is our last real chance to take Belle Grove, the wagons, and the grain back in one blow. Press before Sheridan turns panic into counterattack.",
    fox: "Secure the captured wagons first and make Belle Grove a line, not a trophy. The Valley must feed the army after the cheering stops.",
    wolf: "Shock them at dawn, publish the shock at once, and let organized seizure do the real work. A headline is useful, but a full commissary is survival."
  },
  election_1864_lincoln: {
    hotspur: "The electorate has chosen continued war. Stop waiting for Northern politics and place every remaining resource behind the field armies.",
    fox: "Lincoln's victory narrows the options, but it does not abolish logistics. Share authority with governors and keep the army fed through winter.",
    wolf: "Independence is no longer a plausible offer to this administration. Seek the strongest reunion and parole terms before military collapse writes them for us."
  },
  election_1864_mcclellan: {
    hotspur: "Do not mistake a Democratic victory for generosity. Hold the armies and demand the greatest settlement the battlefield can still support.",
    fox: "McClellan cannot bargain until March, and Grant will not stop. Preserve Richmond and Petersburg long enough to make the electoral result operationally real.",
    wolf: "McClellan promised Union, not independence. Offer an armistice and conditional reunion he can defend without repudiating his acceptance letter."
  },
  petersburg_siege: {
    hotspur: "Mahone is ready! Launch a desperate counter-attack into the Crater mine breach and trap their divisions inside the hole!",
    fox: "Seal the secondary works, contain the breach, and preserve the army. A line that survives today can still shape tomorrow.",
    wolf: "Hit Grant's exposed siege works at night, wreck the tools of the advance, then return before he can turn the sortie into a general battle."
  },
  five_forks: {
    hotspur: "Lee ordered Five Forks held at all hazards. Stand on the crossroads and make Sheridan pay for the railroad.",
    fox: "The exposed left is the danger. Refuse it, keep reserves at Ford's Road, and save enough of Pickett's command to cover the evacuation.",
    wolf: "Disrupt Sheridan before Warren deploys, then withdraw while the corridor remains open. Hours and road access matter more than possession of one intersection."
  },
  richmond_evacuation: {
    hotspur: "Hold the capital long enough for the government to escape with dignity. A rearguard stand can still shape how this ending is remembered.",
    fox: "Leave now. Richmond is no longer worth the army. Preserve command, rations, and road order before Grant closes every route west.",
    wolf: "Make the evacuation look like continuity, not collapse. Dispatches to Europe and Northern peace men must show a government still able to bargain."
  },
  greensboro_convention: {
    hotspur: "Reject all surrender terms! Urge the governors to continue resistance in the mountains with whatever men remain!",
    fox: "Accept departmental paroles. Organize food relief and save the lives of our men so they can rebuild their homes.",
    wolf: "Seek a ninety-day armistice and relief convention with foreign consuls as witnesses to avoid a chaotic ending."
  },
  appomattox_decision: {
    hotspur: "We must not surrender! Disband the army into the mountains and wage an indefinite guerrilla insurgency!",
    fox: "Grant's terms are honorable. Accept the parole, stack the arms, and let the men return home to rebuild their lives in peace.",
    wolf: "Seek the best reunion terms still available under military defeat. Independence is gone, but the settlement can still be shaped before the final signatures are set."
  },
  southern_independence_1864: {
    hotspur: "This is the moment history does not have. Proclaim independence now. Force the world to decide. Nothing less than full recognition is worth four years of the dead.",
    fox: "Full independence is the right goal, but Europe will only ratify what the army already holds. Take the armistice while the lines are still ours and let sovereignty follow the facts on the ground.",
    wolf: "McClellan is the instrument, but Calhoun is the doctrine. Use the armistice to make him place a Concurrent Majority compact before Congress and the states. Ratification is not guaranteed, but it gives reunion a constitutional price instead of leaving the terms to armies alone."
  }
};

for (const scenario of STATIC_SCENARIOS) {
  scenario.historicalImage = HISTORIC_MAPS[scenario.id] || '/images/cw_pictures/unknown.svg';
  if (!scenario.advisors && HISTORIC_ADVISORS[scenario.id]) {
    scenario.advisors = HISTORIC_ADVISORS[scenario.id];
  }
}
