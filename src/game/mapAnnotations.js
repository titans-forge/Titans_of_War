export const MAP_CANVAS_SIZE = {
  width: 600,
  height: 320,
};

const DEFAULT_PLATE_CAPTION = 'Illustrative game schematic: not to scale, not surveyed geography, and not evidence of exact historical positions.';

const DEFAULT_ANNOTATION = {
  plateCaption: DEFAULT_PLATE_CAPTION,
  inspectorPins: [],
  topography: {
    type: 'contours',
    shape: 'arc',
    centerX: 340,
    centerY: 170,
    radius: 35,
    layers: 4,
  },
  waterways: [],
  labels: [],
  troops: null,
  maneuvers: {},
};

export const MAP_PLATE_CAPTIONS = {
  fort_sumter: 'Game schematic — Plate I: Plan of Charleston Outer Harbor & Fortifications, April 1861 setting.',
  charleston_harbor_escape: 'Game schematic — Plate I-B: Hypothetical Barge Escape Route under Cover of Fog, April 1861.',
  radical_republican_crisis: 'Game schematic — Plate I-C: Washington cabinet pressure, border-state rail corridors, and emergency mobilization routes, April 1861.',
  naval_technology: 'Game schematic — Plate Technology: Hampton Roads ironclad designs and Merrimack conversion schematics, March 1862 technology setting.',
  shiloh_army_of_tennessee: 'Game schematic — Plate III-A: Pittsburg Landing camps, Corinth roads, and Johnston attack axes, April 1862.',
  first_winchester: 'Game schematic — Plate III-B: Winchester turnpikes, Abrams Creek crossings, and Banks\'s retreat routes, May 1862.',
  hotspur_cabinet_crisis: 'Game schematic — Plate Emergency: Cabinet debate over frontline movements; emergency setting.',
  fox_supply_crisis: 'Game schematic — Plate Emergency II: Rail supply blockage nodes; quartermaster emergency setting.',
  wolf_finance_crisis: 'Game schematic — Plate Emergency III: Sovereign debt and gold reserves; treasury emergency setting.',
  manassas_battlefield: "Game schematic — Plate II: Survey of Henry House Hill & Bull Run Creek, July 1861 setting.",
  seven_days: "Game schematic — Plate III: Swamps of the Chickahominy River, June 1862 setting.",
  second_manassas: 'Game schematic — Plate IV: Combat Sector of the Railway Cut, August 1862 setting.',
  potomac_leverage_campaign: 'Game schematic — Plate IV-B: Maryland Invasion corridor & Potomac approaches, Sept. 1862.',
  antietam: "Game schematic — Plate V: Topography of the Bloody Lane & Dunker Church sectors, September 1862 setting.",
  emancipation_cabinet_debate: 'Game schematic — Plate V-C: Washington cabinet debate after the Maryland Campaign, recruitment policy, and European diplomacy, Sept. 1862.',
  fredericksburg_winter_politics: 'Game schematic — Plate V-B: Fredericksburg heights, winter camps, and Rappahannock riverbank exchanges, Dec. 1862-Jan. 1863.',
  chancellorsville_maneuver: "Game schematic — Plate VI-A: Wilderness roads and Jackson's concealed flank march route, May 1863.",
  chancellorsville_aftermath: "Game schematic — Plate VI-B: Wilderness crossings and dusk attack sectors on the Union right, May 1863.",
  gettysburg_campaign_setup: 'Game schematic — Plate VII-A: Cashtown approaches, Gettysburg road net, and Pennsylvania concentration points, July 1863.',
  gettysburg_with_jackson_setup: 'Game schematic — Plate VII-B: Gettysburg approach corridors under Jackson-survives chronology, July 1863.',
  susquehanna_offensive: 'Game schematic — Plate VII-C: Susquehanna River crossings and Pennsylvania rail approaches, June-July 1863.',
  gettysburg_decision: "Game schematic — Plate VII-D: Cemetery Ridge and Little Round Top elevation contours, July 1863 setting.",
  gettysburg_with_jackson: 'Game schematic — Plate VII-E: Cemetery Hill, Culp\'s Hill, and the Baltimore Pike under alternate corps command, July 1863.',
  gettysburg_recognition_crisis: 'Game schematic — Plate VII-F Alt.: Gettysburg victory lines, Atlantic diplomatic routes, and the proposed armistice boundary, July 1863.',
  chickamauga: "Game schematic — Plate VIII: Forest thickets along the River of Death, September 1863 setting.",
  chattanooga_stranglehold: 'Game schematic — Plate VIII-B: Rail blockade coordinates of Chattanooga siege, Oct. 1863.',
  wilderness_opening: "Game schematic — Plate IX-A: Orange Plank Road crisis, Longstreet's approach, and Texas Brigade counterstroke sectors, May 1864.",
  wilderness: "Game schematic — Plate IX-B: The Tangled Woods and Brock Road crossroad sectors, May 1864 setting.",
  cold_harbor: 'Game schematic — Plate IX-C: Cold Harbor trench belts, crossroads, and artillery killing grounds, June 1864.',
  new_market: 'Game schematic — Plate IX-D: Bushong Farm fields, the Valley Pike, and New Market approaches, May 1864.',
  atlanta_election_pressure: 'Game schematic — Plate IX-E: North Georgia rail lines, Chattahoochee crossings, and the Atlanta election clock, Summer 1864.',
  atlanta_holds_october: 'Game schematic — Plate IX-E Alt.: North Georgia rail lines, contested Atlanta approaches, and the election clock, October-November 1864.',
  fall_of_atlanta: 'Game schematic — Plate IX-F: Jonesborough, the Macon railroad, and Atlanta evacuation routes, September 1864.',
  election_1864_lincoln: 'Game schematic — Plate X-C: Electoral returns, soldier voting, and the military news shaping Lincoln\'s reelection, November 1864.',
  election_1864_mcclellan: 'Game schematic — Plate X-C Alt.: Electoral returns under a delayed Atlanta and contested Valley campaign, November 1864.',
  black_confederate_debate: 'Game schematic — Plate X-A: Petersburg supply lines, militia districts, and Richmond Colored Troops debate, March 1865.',
  third_winchester: "Game schematic — Plate X: Winchester approaches, Opequon crossings, and cavalry pressure, September 1864.",
  cedar_creek: 'Game schematic — Plate X-B: Belle Grove, Middletown Pike, and Cedar Creek crossings at dawn, October 1864.',
  petersburg_siege: 'Game schematic — Plate XI: Trench defensive lines and mine detonation at the Crater, Petersburg, July 1864.',
  five_forks: 'Game schematic — Plate XI-A: Five Forks crossroads, White Oak Road, Ford\'s Road, and the South Side Railroad, April 1865.',
  richmond_evacuation: 'Game schematic — Plate XI-B: Richmond evacuation routes and retreat rail corridors, April 1865.',
  greensboro_convention: 'Game schematic — Plate XII: Departmental Parole boundaries and rail relief channels, Greensboro, April 1865.',
  appomattox_decision: "Game schematic — Plate XII-B: General Lee's final retreat lines to Appomattox Courthouse, April 1865.",
  southern_independence_1864: 'Game schematic — Plate XIII: Confederate peace lines and European mediation corridors, Autumn 1864 — Spring 1865.',
};

export const MAP_INSPECTOR_PINS = {
  fort_sumter: [
    { x: 50, y: 50, label: 'Fort Sumter', desc: 'Federal masonry fort isolated in Charleston Harbor.' },
    { x: 22, y: 78, label: 'Cummings Point', desc: 'Confederate ironclad battery shelling Sumter\'s gorge wall.' },
    { x: 78, y: 25, label: 'Fort Moultrie', desc: 'Secessionist sand-bagged batteries pouring mortar shell into Sumter.' },
  ],
  naval_technology: [
    { x: 35, y: 45, label: 'Gosport Navy Yard', desc: 'Where the burned steam frigate Merrimack is raised and rebuilt as the CSS Virginia.' },
    { x: 65, y: 55, label: 'Hampton Roads Channel', desc: 'Waterway where the first clash of ironclad ships will change naval warfare forever.' },
    { x: 80, y: 30, label: 'James River Defense', desc: 'Crucial shipping channel protected by experimental electric torpedoes and battery piles.' },
  ],
  shiloh_army_of_tennessee: [
    { x: 72, y: 28, label: 'Pittsburg Landing', desc: 'Union river landing where Grant can still anchor a defensive recovery if not driven into the Tennessee.' },
    { x: 45, y: 50, label: 'Shiloh Church', desc: 'Central road junction and symbolic landmark in the confused woodland battle.' },
    { x: 25, y: 68, label: "Johnston's Advance", desc: 'The Confederate approach where personal command presence can bring either cohesion or disaster.' },
  ],
  first_winchester: [
    { x: 48, y: 52, label: 'Valley Pike', desc: 'The road through Winchester that controls both retreat and supply in the lower Shenandoah.' },
    { x: 24, y: 72, label: 'Abrams Creek', desc: 'Water barrier and approach line shaping Confederate attack routes west of town.' },
    { x: 74, y: 30, label: 'Bower\'s Hill', desc: 'High ground east of Winchester and part of Banks\'s attempted defensive screen.' },
  ],
  manassas_battlefield: [
    { x: 55, y: 48, label: 'Henry House Hill', desc: 'Where Jackson stood like a stone wall, halting the Union advance.' },
    { x: 35, y: 20, label: 'Sudley Ford', desc: 'Union flanking column crossing Bull Run Creek.' },
    { x: 75, y: 70, label: 'Manassas Junction', desc: 'Manassas railroad depots bringing Johnston\'s Valley reinforcements.' },
  ],
  antietam: [
    { x: 52, y: 50, label: 'Bloody Lane', desc: 'A sunken farm road where over 5,000 soldiers fell in four hours.' },
    { x: 45, y: 22, label: 'The Cornfield', desc: 'Scene of catastrophic charges and counter-charges at dawn.' },
    { x: 58, y: 82, label: 'Burnside Bridge', desc: 'A narrow stone bridge defended by a handful of Georgia riflemen.' },
  ],
  fredericksburg_winter_politics: [
    { x: 62, y: 28, label: "Marye's Heights", desc: 'The stone wall and heights where Burnside\'s attacks were shattered at terrible cost.' },
    { x: 44, y: 46, label: 'Rappahannock River', desc: 'Front line and human boundary where burial flags, newspaper swaps, and brief Christmas-week fraternization occurred.' },
    { x: 72, y: 74, label: 'Winter Camps', desc: 'Where shoes, furloughs, rations, and political patience mattered more than one more charge.' },
  ],
  gettysburg_campaign_setup: [
    { x: 34, y: 56, label: 'Cashtown Gap', desc: 'Western approach where Lee\'s columns funnel toward the Gettysburg road net.' },
    { x: 58, y: 38, label: 'Gettysburg Junction', desc: 'Road hub whose accidental importance can harden the campaign into a decisive battle.' },
    { x: 76, y: 20, label: 'South Mountain Screens', desc: 'Union concentration routes and Confederate uncertainty while Stuart is still restoring the picture.' },
  ],
  gettysburg_with_jackson_setup: [
    { x: 50, y: 26, label: 'Cemetery Hill', desc: 'The height Jackson might reach faster than Ewell historically did.' },
    { x: 66, y: 34, label: 'Baltimore Pike', desc: 'Communication route that becomes more vulnerable when Jackson is alive to exploit tempo.' },
    { x: 32, y: 58, label: 'Approach Roads', desc: 'The network where Lee can still choose speed, coordination, or a wider Pennsylvania pressure campaign.' },
  ],
  gettysburg_decision: [
    { x: 50, y: 42, label: 'Cemetery Ridge', desc: 'The Union center, target of Pickett\'s desperate charge.' },
    { x: 35, y: 82, label: 'Little Round Top', desc: 'Key rocky hill anchored by the 20th Maine, saving the Union flank.' },
    { x: 48, y: 15, label: 'Cemetery Hill', desc: 'Heavy Union artillery concentration holding the Baltimore Pike.' },
  ],
  gettysburg_with_jackson: [
    { x: 50, y: 42, label: 'Cemetery Ridge', desc: 'Still the main Union spine, but no longer the only imaginable target.' },
    { x: 48, y: 15, label: 'Cemetery Hill', desc: 'The high ground Jackson might have tried to seize before the Union line fully hardened.' },
    { x: 62, y: 30, label: 'Baltimore Pike', desc: 'The communications and supply route that a living Jackson could threaten more aggressively.' },
  ],
  atlanta_election_pressure: [
    { x: 32, y: 26, label: 'Kennesaw Line', desc: 'Where Johnston\'s retreat strategy tries to turn terrain and delay into political time.' },
    { x: 58, y: 52, label: 'Atlanta Rail Hub', desc: 'Industrial workshops, depots, and rail junctions whose loss would shake both armies and the Northern election.' },
    { x: 74, y: 78, label: 'Chattahoochee Crossings', desc: 'Final barrier lines whose defense determines whether Atlanta becomes a siege, a fight, or a political collapse.' },
  ],
  fall_of_atlanta: [
    { x: 34, y: 72, label: 'Jonesborough', desc: 'The railroad battle whose loss severed Atlanta from its last southern supply connection.' },
    { x: 58, y: 48, label: 'Atlanta Inner Works', desc: 'Fortified city, workshop complex, and political prize that could no longer be supplied once the railroads were cut.' },
    { x: 76, y: 28, label: 'Macon Railroad', desc: 'The final rail artery Hood needed to reopen or abandon.' },
  ],
  election_1864_lincoln: [
    { x: 44, y: 40, label: 'Northern Electorate', desc: 'Civilian returns strengthened by Atlanta, Mobile Bay, and Union recovery in the Valley.' },
    { x: 70, y: 58, label: 'Soldier Vote', desc: 'Union soldiers voted heavily for Lincoln where state law permitted field or proxy ballots.' },
  ],
  election_1864_mcclellan: [
    { x: 44, y: 40, label: 'Northern Electorate', desc: 'An alternate result produced by the absence of decisive September and October Union victories.' },
    { x: 70, y: 58, label: 'Union Condition', desc: 'McClellan opposed the administration but still required restoration of the Union as the basis of peace.' },
  ],
  cold_harbor: [
    { x: 48, y: 44, label: 'Cold Harbor Crossroads', desc: 'The road junction anchoring the Confederate line and narrowing Grant\'s attack options.' },
    { x: 28, y: 72, label: 'Union Assault Front', desc: 'Ground over which Federal infantry must cross open killing zones into entrenched fire.' },
    { x: 74, y: 28, label: 'Petersburg Pivot', desc: 'Road and rail direction that matters once Lee treats Cold Harbor as cover for the next move south.' },
  ],
  new_market: [
    { x: 54, y: 54, label: 'Bushong Farm', desc: 'Center of the field where the cadets and main Confederate line strike through mud and wheat.' },
    { x: 36, y: 32, label: 'Valley Pike', desc: 'The road whose control decides whether the Shenandoah remains a working supply corridor.' },
    { x: 74, y: 76, label: 'VMI Cadet Advance', desc: 'The approach line made famous by the cadets\' charge into the rain-soaked field.' },
  ],
  cedar_creek: [
    { x: 52, y: 26, label: 'Belle Grove', desc: 'The great Valley plantation overlooking Middletown and the dawn Confederate attack.' },
    { x: 30, y: 70, label: 'Cedar Creek Fords', desc: 'Night crossing points that made the morning surprise possible.' },
    { x: 76, y: 58, label: 'Middletown Pike', desc: 'Road corridor where captured wagons and the Union counterstroke both converged.' },
  ],
  petersburg_siege: [
    { x: 50, y: 50, label: 'The Crater Breach', desc: 'Breach blown by 8,000 lbs of gunpowder detonated under Confederate fort.' },
    { x: 28, y: 42, label: 'Union Siege Lines', desc: 'Intricate trench works extending over thirty miles.' },
    { x: 72, y: 58, label: 'Mahone\'s Counter-Attack', desc: 'Confederate infantry charge sealing the crater breach.' },
  ],
  five_forks: [
    { x: 50, y: 54, label: 'Five Forks', desc: 'The star-shaped crossroads Pickett was ordered to hold at all hazards.' },
    { x: 28, y: 30, label: 'White Oak Road', desc: 'The extended Confederate line exposed to Warren\'s turning movement.' },
    { x: 76, y: 24, label: 'South Side Railroad', desc: 'Lee\'s last major supply artery into Petersburg and the strategic object behind the battle.' },
    { x: 70, y: 72, label: 'Ford\'s Road', desc: 'Retreat and communication corridor threatened as the Confederate left collapsed.' },
  ],
  black_confederate_debate: [
    { x: 54, y: 52, label: 'Petersburg Front', desc: 'The shrinking line that makes manpower policy a military emergency rather than a theory.' },
    { x: 32, y: 28, label: 'Richmond Congress', desc: 'Months of legislative resistance over whether Colored Troops policy concedes too much too late.' },
    { x: 76, y: 76, label: 'Virginia Pressure', desc: 'State-level pressure that finally helps force the policy over the line.' },
  ],
  appomattox_decision: [
    { x: 50, y: 48, label: 'McLean House', desc: 'The quiet parlor where Lee met Grant to sign the honorable parole terms.' },
    { x: 25, y: 35, label: 'Appomattox Station', desc: 'Where Sheridan\'s cavalry intercepted Lee\'s final supply trains.' },
    { x: 75, y: 62, label: 'Custer\'s Cavalry Circle', desc: 'Union horsemen forming a ring of steel around the Confederate remnants.' },
  ],
  southern_independence_1864: [
    { x: 48, y: 35, label: 'Richmond, Va.', desc: 'The Confederate capital still standing — the military fact that makes peace negotiation possible.' },
    { x: 60, y: 22, label: 'Washington, D.C.', desc: 'The Union capital under political pressure from a fractured home front and a stalled military campaign.' },
    { x: 72, y: 42, label: 'Valley Corridor', desc: "Jackson's unbroken Valley armies — the cumulative strategic fact that drove Northern war-weariness past recovery." },
    { x: 30, y: 58, label: 'Peace Convention', desc: 'Where commissioners from both sides meet under European witness to draft the separation compact.' },
  ],
};

const MANASSAS_ANNOTATION = {
  waterways: [
    {
      type: 'bezier',
      start: [0, 40],
      cp1: [200, 20],
      cp2: [350, 70],
      end: [600, 20],
      label: { text: 'BULL RUN CREEK', x: 420, y: 35 },
    },
  ],
  labels: [{ text: 'HENRY HOUSE HILL', x: 220, y: 185 }],
  troops: {
    union: { x: 230, y: 70, label: 'UNION FORCES', width: 65 },
    confederate: { x: 320, y: 250, label: 'CONFED. FORCE', width: 70 },
  },
};

export const MAP_ANNOTATIONS = {
  fort_sumter: {
    topography: {
      type: 'harbor-fort',
      waveSpacing: 20,
      polygon: [
        [260, 145],
        [310, 130],
        [350, 165],
        [310, 200],
        [260, 185],
      ],
    },
    labels: [
      { text: 'CHARLESTON HARBOR', x: 40, y: 40 },
      { text: 'FORT SUMTER (MASONRY)', x: 250, y: 120, color: 'rgba(212, 175, 55, 0.5)' },
    ],
    troops: {
      union: { x: 268, y: 157, label: 'US GARRISON', width: 65 },
      confederate: { x: 40, y: 260, label: 'CS BATTERIES', width: 70 },
    },
  },
  naval_technology: {
    topography: {
      type: 'contours',
      shape: 'arc',
      centerX: 300,
      centerY: 160,
      radius: 40,
      layers: 3,
    },
    waterways: [
      {
        type: 'bezier',
        start: [100, 200],
        cp1: [250, 180],
        cp2: [400, 240],
        end: [600, 200],
        label: { text: 'HAMPTON ROADS CHANNEL', x: 280, y: 220 },
      },
    ],
    labels: [
      { text: 'IRONCLAD SHIPYARDS', x: 80, y: 120 },
      { text: 'SUBMARINE DEVELOPMENT COVE', x: 380, y: 100 }
    ],
    troops: {
      union: { x: 450, y: 140, label: 'UNION BLOCKADE', width: 75 },
      confederate: { x: 120, y: 150, label: "MALLORY'S YARDS", width: 75 },
    },
  },
  shiloh_army_of_tennessee: {
    waterways: [
      {
        type: 'bezier',
        start: [520, 0],
        cp1: [560, 90],
        cp2: [540, 220],
        end: [575, 320],
        label: { text: 'TENNESSEE RIVER', x: 470, y: 120 },
      },
    ],
    labels: [
      { text: 'SHILOH CHURCH', x: 220, y: 120 },
      { text: 'PITTSBURG LANDING', x: 360, y: 285 },
    ],
    troops: {
      union: { x: 360, y: 175, label: 'GRANT / BUELL', width: 78 },
      confederate: { x: 165, y: 175, label: 'A.S. JOHNSTON', width: 82 },
    },
    maneuvers: {
      option_a: { endOffsetX: 55, endOffsetY: -20 },
      option_d: { endOffsetX: -20, endOffsetY: 40 },
    },
  },
  manassas_battlefield: MANASSAS_ANNOTATION,
  first_winchester: {
    waterways: [
      {
        type: 'bezier',
        start: [120, 0],
        cp1: [170, 90],
        cp2: [130, 180],
        end: [180, 320],
        label: { text: 'ABRAMS CREEK', x: 90, y: 122 },
      },
    ],
    labels: [
      { text: 'VALLEY PIKE / WINCHESTER', x: 180, y: 78 },
      { text: 'BOWER\'S HILL', x: 360, y: 92 },
    ],
    troops: {
      union: { x: 360, y: 88, label: 'BANKS', width: 58 },
      confederate: { x: 170, y: 228, label: 'JACKSON', width: 68 },
    },
    maneuvers: {
      option_a: { endOffsetX: 90, endOffsetY: -48 },
      option_d: { endOffsetX: 120, endOffsetY: -18 },
    },
  },
  second_manassas: MANASSAS_ANNOTATION,
  seven_days: {
    waterways: [
      {
        type: 'bezier',
        start: [0, 20],
        cp1: [150, 80],
        cp2: [300, 30],
        end: [600, 70],
        label: { text: 'CHICKAHOMINY RIVER', x: 450, y: 85 },
      },
    ],
    labels: [{ text: 'RICHMOND OUTSKIRTS', x: 30, y: 290 }],
    troops: {
      union: { x: 450, y: 80, label: 'UNION FORCES', width: 65 },
      confederate: { x: 80, y: 230, label: 'CONFED. FORCE', width: 70 },
    },
  },
  antietam: {
    topography: {
      type: 'contours',
      shape: 'ellipse',
      centerX: 260,
      centerY: 180,
      radiusX: 35,
      radiusY: 18,
      rotation: 0.2,
      layers: 4,
    },
    waterways: [
      {
        type: 'bezier',
        start: [200, 0],
        cp1: [230, 80],
        cp2: [180, 160],
        end: [220, 320],
        label: { text: 'ANTIETAM CREEK', x: 130, y: 100 },
      },
    ],
    labels: [{ text: 'BLOODY LANE SECTOR', x: 340, y: 190 }],
    troops: {
      union: { x: 340, y: 60, label: 'UNION FORCES', width: 65 },
      confederate: { x: 260, y: 240, label: 'CONFED. FORCE', width: 70 },
    },
  },
  fredericksburg_winter_politics: {
    waterways: [
      {
        type: 'bezier',
        start: [0, 155],
        cp1: [180, 130],
        cp2: [420, 185],
        end: [600, 145],
        label: { text: 'RAPPAHANNOCK RIVER', x: 215, y: 148 },
      },
    ],
    labels: [
      { text: "MARYE'S HEIGHTS", x: 320, y: 92 },
      { text: 'WINTER CAMPS / BURIAL FLAGS', x: 120, y: 260 },
    ],
    troops: {
      union: { x: 220, y: 78, label: 'BURNSIDE', width: 56 },
      confederate: { x: 360, y: 220, label: 'LEE', width: 46 },
    },
    maneuvers: {
      option_a: { endOffsetX: -30, endOffsetY: -55 },
      option_b: { endOffsetX: 10, endOffsetY: 28 },
      option_d: { endOffsetX: 55, endOffsetY: 22 },
    },
  },
  chancellorsville_maneuver: {
    waterways: [
      {
        type: 'bezier',
        start: [0, 150],
        cp1: [200, 190],
        cp2: [400, 120],
        end: [600, 170],
        label: { text: 'RAPPAHANNOCK RIVER', x: 250, y: 145 },
      },
    ],
  },
  chancellorsville_aftermath: {
    waterways: [
      {
        type: 'bezier',
        start: [0, 150],
        cp1: [200, 190],
        cp2: [400, 120],
        end: [600, 170],
        label: { text: 'RAPPAHANNOCK RIVER', x: 250, y: 145 },
      },
    ],
  },
  gettysburg_campaign_setup: {
    topography: {
      type: 'contours',
      shape: 'ellipse',
      centerX: 300,
      centerY: 165,
      radiusX: 42,
      radiusY: 20,
      rotation: 0.15,
      layers: 4,
    },
    labels: [{ text: 'GETTYSBURG ROAD NET / CEMETERY HILL AXIS', x: 150, y: 110 }],
    troops: {
      union: { x: 370, y: 115, label: 'MEADE', width: 54 },
      confederate: { x: 210, y: 235, label: 'LEE / EWELL', width: 82 },
    },
    maneuvers: {
      option_c: { endOffsetX: 140, endOffsetY: -26 },
      option_d: { endOffsetX: 100, endOffsetY: 6 },
    },
  },
  gettysburg_with_jackson_setup: {
    topography: {
      type: 'contours',
      shape: 'ellipse',
      centerX: 300,
      centerY: 165,
      radiusX: 42,
      radiusY: 20,
      rotation: 0.15,
      layers: 4,
    },
    labels: [{ text: 'EARLY HEIGHTS RACE / BALTIMORE PIKE', x: 180, y: 108 }],
    troops: {
      union: { x: 345, y: 120, label: 'MEADE', width: 54 },
      confederate: { x: 220, y: 235, label: 'LEE / JACKSON', width: 88 },
    },
    maneuvers: {
      option_a: { endOffsetX: 82, endOffsetY: -60 },
      option_c: { endOffsetX: 128, endOffsetY: -18 },
      option_d: { endOffsetX: 110, endOffsetY: 10 },
    },
  },
  chickamauga: {
    waterways: [
      {
        type: 'bezier',
        start: [300, 0],
        cp1: [250, 80],
        cp2: [350, 160],
        end: [300, 320],
        label: { text: 'CHICKAMAUGA CREEK', x: 180, y: 140 },
      },
    ],
    troops: {
      union: { x: 180, y: 80, label: 'UNION FORCES', width: 65 },
      confederate: { x: 340, y: 230, label: 'CONFED. FORCE', width: 70 },
    },
  },
  atlanta_election_pressure: {
    topography: {
      type: 'contours',
      shape: 'ellipse',
      centerX: 300,
      centerY: 150,
      radiusX: 48,
      radiusY: 24,
      rotation: -0.08,
      layers: 4,
    },
    waterways: [
      {
        type: 'bezier',
        start: [380, 0],
        cp1: [340, 90],
        cp2: [420, 170],
        end: [360, 320],
        label: { text: 'CHATTAHOOCHEE RIVER', x: 335, y: 108 },
      },
    ],
    labels: [
      { text: 'ATLANTA RAIL BELT / ELECTION CLOCK', x: 165, y: 78 },
      { text: 'NORTH GEORGIA DEFENSIVE RETREATS', x: 95, y: 250 },
    ],
    troops: {
      union: { x: 150, y: 92, label: 'SHERMAN', width: 64 },
      confederate: { x: 360, y: 220, label: 'JOHNSTON / HOOD', width: 108 },
    },
    maneuvers: {
      option_a: { endOffsetX: -30, endOffsetY: -46 },
      option_b: { endOffsetX: 38, endOffsetY: 18 },
      option_c: { endOffsetX: 120, endOffsetY: -18 },
      option_d: { endOffsetX: 70, endOffsetY: 34 },
    },
  },
  fall_of_atlanta: {
    topography: {
      type: 'contours',
      shape: 'ellipse',
      centerX: 330,
      centerY: 165,
      radiusX: 58,
      radiusY: 26,
      rotation: 0.1,
      layers: 4,
    },
    labels: [
      { text: 'ATLANTA INNER WORKS', x: 242, y: 92 },
      { text: 'MACON & WESTERN RAILROAD', x: 258, y: 254 },
      { text: 'JONESBOROUGH', x: 96, y: 258 },
    ],
    troops: {
      union: { x: 175, y: 205, label: 'SHERMAN', width: 64 },
      confederate: { x: 365, y: 118, label: 'HOOD', width: 52 },
    },
    maneuvers: {
      option_a: { endOffsetX: -88, endOffsetY: 58 },
      option_b: { endOffsetX: 72, endOffsetY: 52 },
      option_c: { endOffsetX: 92, endOffsetY: 34 },
      option_d: { endOffsetX: -22, endOffsetY: -12 },
    },
  },
  third_winchester: {
    waterways: [
      {
        type: 'bezier',
        start: [220, 0],
        cp1: [260, 100],
        cp2: [200, 180],
        end: [270, 320],
        label: { text: 'OPEQUON CREEK', x: 190, y: 110 },
      },
    ],
    troops: {
      union: { x: 360, y: 80, label: 'UNION FORCES', width: 65 },
      confederate: { x: 170, y: 230, label: 'CONFED. FORCE', width: 70 },
    },
  },
  gettysburg_decision: {
  new_market: {
    topography: {
      type: 'contours',
      shape: 'ellipse',
      centerX: 300,
      centerY: 165,
      radiusX: 44,
      radiusY: 20,
      rotation: -0.08,
      layers: 4,
    },
    waterways: [
      {
        type: 'bezier',
        start: [110, 0],
        cp1: [160, 80],
        cp2: [130, 180],
        end: [180, 320],
        label: { text: 'NORTH FORK SHENANDOAH', x: 64, y: 120 },
      },
    ],
    labels: [
      { text: 'BUSHONG FARM / VALLEY PIKE', x: 165, y: 92 },
      { text: 'VMI CADET ADVANCE', x: 320, y: 248 },
    ],
    troops: {
      union: { x: 365, y: 92, label: 'SIGEL', width: 56 },
      confederate: { x: 205, y: 232, label: 'BRECKINRIDGE', width: 94 },
    },
    maneuvers: {
      option_a: { endOffsetX: 84, endOffsetY: -52 },
      option_d: { endOffsetX: 126, endOffsetY: -12 },
    },
  },
  cedar_creek: {
    waterways: [
      {
        type: 'bezier',
        start: [150, 0],
        cp1: [210, 80],
        cp2: [160, 190],
        end: [235, 320],
        label: { text: 'CEDAR CREEK', x: 112, y: 118 },
      },
    ],
    labels: [
      { text: 'BELLE GROVE', x: 300, y: 82 },
      { text: 'MIDDLETOWN PIKE', x: 332, y: 236 },
    ],
    troops: {
      union: { x: 370, y: 92, label: 'SHERIDAN', width: 78 },
      confederate: { x: 195, y: 232, label: 'EARLY', width: 56 },
    },
    maneuvers: {
      option_a: { endOffsetX: 98, endOffsetY: -56 },
      option_d: { endOffsetX: 130, endOffsetY: -14 },
    },
  },
    topography: {
      type: 'contours',
      shape: 'ellipse',
      centerX: 300,
      centerY: 170,
      radiusX: 45,
      radiusY: 20,
      rotation: 0,
      layers: 4,
    },
    labels: [{ text: "CEMETERY RIDGE (PICKETT'S TARGET)", x: 210, y: 145 }],
    troops: {
      union: { x: 268, y: 170, label: 'UNION FORCES', width: 65 },
      confederate: { x: 268, y: 265, label: 'CONFED. FORCE', width: 70 },
    },
    maneuvers: {
      option_c: { endOffsetX: 150 },
    },
  },
  gettysburg_with_jackson: {
    topography: {
      type: 'contours',
      shape: 'ellipse',
      centerX: 300,
      centerY: 170,
      radiusX: 45,
      radiusY: 20,
      rotation: 0,
      layers: 4,
    },
    labels: [{ text: 'CEMETERY HILL / BALTIMORE PIKE AXIS', x: 170, y: 120 }],
    troops: {
      union: { x: 300, y: 150, label: 'UNION FORCES', width: 65 },
      confederate: { x: 240, y: 250, label: "JACKSON'S CORPS", width: 74 },
    },
    maneuvers: {
      option_c: { endOffsetX: 120, endOffsetY: -20 },
      option_d: { endOffsetX: 150, endOffsetY: -10 },
    },
  },
  wilderness_opening: {
    topography: {
      type: 'forest-fire',
      forestGrid: { startX: 28, startY: 20, stepX: 58, stepY: 44, radius: 17 },
      fireZones: [{ x: 360, y: 146, radius: 44, color: 'rgba(239, 68, 68, 0.025)' }],
    },
    labels: [
      { text: 'ORANGE PLANK ROAD CRISIS', x: 48, y: 48 },
      { text: 'LONGSTREET APPROACH', x: 330, y: 264, color: 'rgba(245, 158, 11, 0.62)' },
    ],
    troops: {
      union: { x: 214, y: 86, label: 'GRANT', width: 52 },
      confederate: { x: 346, y: 226, label: 'LEE', width: 42 },
    },
    maneuvers: {
      option_b: { endOffsetX: -48, endOffsetY: -34 },
      option_c: { endOffsetX: -76, endOffsetY: -56 },
    },
  },
  wilderness: {
    topography: {
      type: 'forest-fire',
      forestGrid: { startX: 30, startY: 20, stepX: 60, stepY: 45, radius: 18 },
      fireZones: [{ x: 380, y: 150, radius: 60, color: 'rgba(239, 68, 68, 0.03)' }],
    },
    labels: [
      { text: 'BROCK ROAD CROSSROADS', x: 40, y: 290 },
      { text: 'BRUSHFIRE SECTOR', x: 330, y: 80, color: 'rgba(239, 68, 68, 0.5)' },
    ],
    troops: {
      union: { x: 210, y: 90, label: 'UNION FORCES', width: 65 },
      confederate: { x: 340, y: 230, label: 'CONFED. FORCE', width: 70 },
    },
  },
  cold_harbor: {
    topography: {
      type: 'trench-crater',
      trench: { startY: 42, stepY: 38, xStep: 24, amplitude: 9 },
      crater: { x: 320, y: 158, radius: 14 },
    },
    labels: [
      { text: 'COLD HARBOR TRENCH FRONT', x: 42, y: 34 },
      { text: 'ARTILLERY KILLING GROUND', x: 248, y: 112, color: 'rgba(239, 68, 68, 0.58)' },
    ],
    troops: {
      union: { x: 180, y: 118, label: 'GRANT', width: 52 },
      confederate: { x: 360, y: 210, label: 'LEE', width: 42 },
    },
    maneuvers: {
      option_a: { endOffsetX: -28, endOffsetY: -42 },
      option_d: { endOffsetX: 118, endOffsetY: 22 },
    },
  },
  black_confederate_debate: {
    topography: {
      type: 'trench-crater',
      trench: { startY: 50, stepY: 42, xStep: 22, amplitude: 10 },
      crater: { x: 340, y: 180, radius: 18 },
    },
    labels: [
      { text: 'RICHMOND POLITICAL FRONT', x: 28, y: 34 },
      { text: 'PETERSBURG MANPOWER CRISIS', x: 215, y: 122, color: 'rgba(239, 68, 68, 0.55)' },
    ],
    troops: {
      union: { x: 385, y: 100, label: 'UNION PRESSURE', width: 74 },
      confederate: { x: 220, y: 235, label: 'CONFED. RESERVES', width: 82 },
    },
  },
  petersburg_siege: {
    topography: {
      type: 'trench-crater',
      trench: { startY: 30, stepY: 40, xStep: 25, amplitude: 15 },
      crater: { x: 300, y: 160, radius: 28 },
    },
    labels: [
      { text: 'BATTLE OF CRATER TRENCHES', x: 40, y: 30 },
      { text: 'THE CRATER BREACH', x: 250, y: 125, color: 'rgba(239, 68, 68, 0.6)' },
    ],
    troops: {
      union: { x: 190, y: 148, label: 'UNION FORCES', width: 65 },
      confederate: { x: 340, y: 148, label: 'CONFED. FORCE', width: 70 },
    },
  },
  five_forks: {
    topography: {
      type: 'contours',
      shape: 'arc',
      centerX: 315,
      centerY: 165,
      radius: 38,
      layers: 4,
    },
    labels: [
      { text: 'WHITE OAK ROAD', x: 165, y: 106 },
      { text: 'FIVE FORKS', x: 286, y: 166 },
      { text: 'FORD\'S ROAD', x: 388, y: 232 },
      { text: 'SOUTH SIDE RAILROAD', x: 300, y: 42 },
    ],
    troops: {
      union: { x: 185, y: 220, label: 'SHERIDAN / WARREN', width: 110 },
      confederate: { x: 350, y: 140, label: 'PICKETT', width: 62 },
    },
    maneuvers: {
      option_a: { endOffsetX: -18, endOffsetY: -30 },
      option_b: { endOffsetX: 20, endOffsetY: -10 },
      option_c: { endOffsetX: 84, endOffsetY: 44 },
      option_d: { endOffsetX: -78, endOffsetY: 24 },
    },
  },
  appomattox_decision: {
    labels: [{ text: 'MCLEAN HOUSE (APPOMATTOX C.H.)', x: 230, y: 145 }],
    troops: {
      union: { x: 160, y: 148, label: 'UNION FORCES', width: 65 },
      confederate: { x: 360, y: 148, label: 'CONFED. FORCE', width: 70 },
    },
  },
  southern_independence_1864: {
    labels: [
      { text: 'CONFEDERATE PEACE LINES', x: 200, y: 200 },
      { text: 'RICHMOND (STANDING)', x: 310, y: 160 },
    ],
    troops: {
      union: { x: 120, y: 148, label: 'UNION FORCES', width: 60 },
      confederate: { x: 340, y: 148, label: 'CONFED. ARMIES', width: 85 },
    },
  },
};

export function getMapAnnotation(scenarioId) {
  const annotation = MAP_ANNOTATIONS[scenarioId] || {};

  return {
    ...DEFAULT_ANNOTATION,
    ...annotation,
    plateCaption: annotation.plateCaption || MAP_PLATE_CAPTIONS[scenarioId] || DEFAULT_PLATE_CAPTION,
    inspectorPins: annotation.inspectorPins || MAP_INSPECTOR_PINS[scenarioId] || [],
    topography: {
      ...DEFAULT_ANNOTATION.topography,
      ...(annotation.topography || {}),
    },
    waterways: annotation.waterways || [],
    labels: annotation.labels || [],
    troops: annotation.troops || null,
    maneuvers: annotation.maneuvers || {},
  };
}
