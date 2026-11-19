import { segmentHitsLandmark } from './historicalLandmarks.js';
// Authored game coordinates. These are representative tactical boards, not surveyed maps.
const sector = (id, name, x, y, width = 260, height = 170) => ({ id, name, x, y, width, height });
const zone = (name, kind, left, top, right, bottom, defense = 1, movement = 1) => ({ name, kind, left, top, right, bottom, defense, movement });
export const FIELD_BATTLE_PROFILES = {
  sailors_creek: {
    theme: 'pasture', subtitle: 'Hillsman Farm · Little Sailor’s Creek · South Bank Heights',
    sectors: [
      sector('left', 'West Road', 425, 690, 350, 170),
      sector('center', 'South Bank', 790, 545, 360, 208),
      sector('right', 'Aid Staging', 1108, 726, 270, 150),
    ],
    zones: [
      zone('North Bank Floodplain', 'mud', 85, 313, 1525, 438, .93, .68),
      zone('Little Sailor’s Creek', 'creek', 30, 362, 1570, 414, .91, .52),
      zone('South Bank Heights', 'ridge', 525, 440, 1090, 646, 1.17, .91),
      zone('South Woods', 'woods', 1180, 485, 1540, 650, 1.13, .82),
      zone('West Road', 'road', 0, 635, 690, 751, 1, 1.13),
      zone('Aid Staging', 'clearing', 973, 651, 1243, 801, 1, 1),
    ],
    advice: [
      'The April 6 battlefield has a low, wet creek bottom below the Confederate heights. The West Road offers firm ground.',
      'Historically, Union surgeons at the Overton–Hillsman House treated wounded from both sides. The farm is a historical landmark. This scenario’s Aid Staging is a separate, fictional position.',
    ],
  },
  vicksburg: {
    theme: 'pasture', subtitle: 'Railroad ravine · Southeast breach · Interior line',
    sectors: [
      sector('left', 'Interior Line', 420, 520, 300, 238),
      sector('center', 'Railroad Redoubt', 790, 445, 230, 212),
      sector('right', 'Federal Approach', 1130, 445, 320, 246),
    ],
    zones: [
      zone('Railroad Ravine', 'woods', 160, 650, 1485, 798, 1.13, .76),
      zone('East Approach Slope', 'ridge', 925, 308, 1440, 609, 1.08, .83),
      zone('Interior Line Works', 'earthworks', 285, 413, 560, 631, 1.23, .94),
      zone('Railroad Redoubt Works', 'earthworks', 675, 339, 905, 551, 1.38, .92),
      zone('Southeast Breach', 'clearing', 850, 473, 905, 551, 1, .87),
    ],
    advice: [
      'The Railroad Redoubt guarded the line of the Southern Railroad. The covered works and the damaged southeast angle offer different protection.',
      'This local action depicts the May 22 assault. The Interior Line mission is an alternative defensive position inside the Vicksburg lines.',
    ],
  },
  kennesaw_mountain: {
    theme: 'pasture', subtitle: 'Upper Approach · Dead Angle · Southern Road',
    sectors: [
      sector('left', 'Upper Approach', 570, 275, 230, 160),
      sector('center', 'Dead Angle', 785, 455, 310, 205),
      sector('right', 'Southern Road', 1135, 665, 250, 170),
    ],
    zones: [
      zone('Upper Approach', 'woods', 355, 135, 615, 380, 1.13, .84),
      zone('Wooded Ravine', 'woods', 340, 325, 515, 580, 1.14, .79),
      zone('Western Slope', 'ridge', 600, 245, 807, 580, 1.06, .79),
      zone('Cheatham Hill', 'ridge', 725, 325, 965, 635, 1.15, .9),
      zone('Dead Angle Works', 'earthworks', 662, 350, 925, 550, 1.36, .92),
      zone('Southern Road', 'road', 1080, 590, 1210, 750, 1, 1.13),
      zone('Southern Road', 'road', 1160, 716, 1310, 836, 1, 1.13),
      zone('Southern Road', 'road', 1265, 795, 1380, 900, 1, 1.13),
    ],
    advice: [
      'The Dead Angle is at Cheatham Hill. The works offer cover while the wooded approach and western slope slow formations.',
      'The June 27 attack was repulsed at the Dead Angle. The road withdrawal is an alternative mission on a compressed field.',
    ],
  },
  spotsylvania: {
    theme: 'pasture', subtitle: 'Mule Shoe · West Face · Interior Line',
    sectors: [
      sector('left', 'West Face', 595, 382, 190, 126),
      sector('center', 'Interior Line', 785, 632, 340, 104),
      sector('right', 'Mule Shoe Apex', 760, 225, 300, 130),
    ],
    zones: [
      zone('Rain-Soaked Fields', 'mud', 365, 162, 535, 548, 1, .74),
      zone('McCoull Farm', 'clearing', 728, 398, 902, 555, 1, 1.01),
      zone('McCoull Orchard', 'woods', 745, 484, 907, 585, 1.12, .86),
      zone('West Face Works', 'earthworks', 500, 323, 690, 447, 1.24, .9),
      zone('Salient Apex Works', 'earthworks', 610, 162, 915, 280, 1.28, .9),
      zone('East Face Works', 'earthworks', 900, 252, 1040, 524, 1.27, .91),
      zone('Interior Line Works', 'earthworks', 465, 598, 1120, 685, 1.39, .93),
      zone('Harrison Farm Lane', 'road', 905, 525, 974, 896, 1, 1.13),
    ],
    advice: [
      'On May 12 the Union reached the Mule Shoe and fighting continued along its West Face.',
      'The rain slows off-road movement through wet ground. The Harrison farm lane offers firmer footing.',
      'These orders concern one part of the battle. Lee’s troops historically moved to the line behind the salient.',
    ],
  },
  missionary_ridge: {
    theme: 'pasture', subtitle: 'Western slope · Crest works · Dalton road',
    sectors: [
      sector('left', 'Outer Rifle Pits', 690, 450, 150, 300),
      sector('center', 'Main Crest', 1015, 390, 130, 340),
      sector('right', 'Eastern Spur', 1240, 530, 220, 260),
    ],
    zones: [
      zone('Orchard Knob', 'ridge', 235, 306, 435, 585, 1.13, .92),
      zone('West Rifle Pits', 'earthworks', 645, 180, 730, 735, 1.2, .9),
      zone('Western Slope', 'ridge', 734, 105, 956, 791, 1.02, .68),
      zone('Crest Works', 'earthworks', 956, 102, 1080, 795, 1.36, .89),
      zone('Eastern Spur', 'ridge', 1080, 270, 1350, 732, 1.08, .94),
      zone('Dalton Road', 'road', 1255, 555, 1600, 638, 1, 1.13),
    ],
    advice: [
      'The playable sector compresses Orchard Knob, the western rifle pits and the central stretch of the ridge.',
      'The steep western slope slows troops. The crest offers cover; the eastern road leads toward the marked Confederate exits.',
      'The Union took the ridge historically. These orders aim to buy time locally or preserve the retiring force.',
    ],
  },
  new_market: {
    theme: 'pasture', subtitle: 'Bushong Farm · Valley Pike',
    sectors: [
      sector('left', 'Bushong Farm', 635, 355, 350, 196),
      sector('center', 'Valley Pike', 1068, 478, 260, 144),
      sector('right', 'Reserve Rise', 850, 615, 258, 170),
    ],
    zones: [
      zone('Shenandoah River', 'creek', 22, 0, 123, 900, .9, .46),
      zone('Riverbank Woods', 'woods', 130, 107, 306, 776, 1.16, .8),
      zone('Bushong’s Hill', 'ridge', 326, 91, 935, 248, 1.16, .89),
      zone('Field of Lost Shoes', 'mud', 336, 245, 940, 419, .96, .68),
      zone('Bushong Orchard', 'clearing', 435, 419, 747, 535, 1.06, .93),
      zone('Reserve Rise', 'ridge', 720, 533, 986, 695, 1.1, .94),
      zone('Valley Pike', 'road', 1036, 0, 1100, 900, 1, 1.13),
    ],
    advice: [
      'Rain soaked the plowed field north of Bushong Farm, slowing formations that cross it.',
      'The Valley Pike offers firmer footing. Reserve Rise is a representative assembly area behind the road.',
    ],
  },
  gaines_mill: {
    theme: 'pasture', subtitle: 'Boatswain’s Creek · Porter’s ridge',
    sectors: [
      sector('left', 'Ravine Crossing', 565, 489, 220, 160),
      sector('center', 'Porter’s Ridge', 810, 298, 310, 180),
      sector('right', 'Watt Plateau', 1135, 237, 290, 160),
    ],
    zones: [
      zone('Watt Plateau', 'clearing', 951, 128, 1408, 318, 1, 1),
      zone('Porter’s Ridge', 'ridge', 647, 208, 963, 380, 1.22, .9),
      zone('Boatswain’s Ravine', 'ravine', 138, 377, 1450, 553, 1.15, .76),
      zone('Boatswain’s Creek', 'creek', 138, 414, 1450, 510, .98, .62),
      zone('Ravine Crossing', 'road', 531, 403, 601, 552, 1.04, 1),
      zone('Watt Farm Lane', 'road', 850, 374, 916, 552, 1.02, 1.02),
    ],
    advice: [
      'The board is rotated. The Watt plateau, historically south of Boatswain’s Creek, is above the ravine on screen.',
      'Boatswain’s Creek slows movement through the ravine. The crossing and farm lane give infantry firmer approaches.',
      'Porter’s line has elevated cover. Infantry benefits from approaching and supporting the ridge together.',
    ],
  },
  fredericksburg: {
    theme: 'pasture', subtitle: 'Stone wall and Prospect Hill · Two defenses',
    sectors: [sector('left', 'Marye’s Heights', 515, 265, 245, 172), sector('center', 'Reserve road', 615, 435, 245, 140), sector('right', 'Prospect Hill', 575, 645, 250, 188)],
    zones: [
      zone('Rappahannock River', 'creek', 1210, 0, 1390, 900, .9, .46),
      zone('Fredericksburg town', 'clearing', 920, 110, 1200, 425, 1.02, .92),
      zone('Prospect Hill woods', 'woods', 414, 536, 699, 789, 1.15, .81),
      zone('Marye’s Heights', 'ridge', 367, 125, 555, 365, 1.19, .93),
      zone('Prospect Hill', 'ridge', 465, 548, 675, 754, 1.22, .89),
      zone('Richmond, Fredericksburg and Potomac Railroad', 'ridge', 674, 470, 710, 868, 1.12, .84),
      zone('Sunken Road', 'ravine', 568, 115, 612, 415, 1.42, .92),
      zone('Reserve road', 'road', 330, 408, 1150, 461, 1, 1.11),
      zone('Pontoon crossing', 'road', 1160, 406, 1450, 430, 1, .99),
    ],
    advice: [
      'Infantry on the Sunken Road benefits from the stone-wall cover. The heights behind it offer a position for the guns.',
      'The railroad and woods mark the Prospect Hill approach. Union formations have already crossed the Rappahannock.',
    ],
  },
  second_manassas: {
    theme: 'pasture', subtitle: 'Deep Cut and Chinn Ridge · Two wings',
    sectors: [sector('left', 'Deep Cut', 560, 300, 262, 154), sector('center', 'Groveton gun line', 600, 507, 245, 155), sector('right', 'Chinn Ridge', 1080, 660, 270, 175)],
    zones: [
      zone('Deep Cut woods', 'woods', 256, 110, 507, 220, 1.16, .79),
      zone('Chinn Ridge woods', 'woods', 895, 750, 1348, 860, 1.14, .8),
      zone('Groveton pasture', 'clearing', 430, 411, 817, 590, 1, 1),
      zone('Unfinished Railroad · Deep Cut', 'ravine', 420, 215, 698, 382, 1.35, .87),
      zone('Chinn Ridge', 'ridge', 952, 563, 1214, 755, 1.17, .92),
      zone('Warrenton Turnpike', 'road', 0, 459, 1600, 527, 1, 1.11),
    ],
    advice: [
      'The Unfinished Railroad is an earthwork and grade. It carried no rails here during the battle.',
      'The Warrenton Turnpike links the two fronts. The direct assault and limited defense need different commitments.',
    ],
  },
  jonesborough: {
    theme: 'pasture', subtitle: 'Macon & Western Railroad · Crossing and withdrawal',
    sectors: [sector('left', 'Warren House salient', 662, 448, 218, 180), sector('center', 'Rail crossing', 930, 440, 242, 150), sector('right', 'Lovejoy Road screen', 962, 674, 254, 174)],
    zones: [
      zone('West bank woods', 'woods', 48, 60, 337, 818, 1.1, .83),
      zone('Flint River', 'creek', 105, 0, 215, 880, .88, .49),
      zone('Depot yard', 'clearing', 982, 326, 1180, 545, 1, 1.02),
      zone('Warren House salient', 'earthworks', 555, 402, 754, 480, 1.34, .91),
      zone('Rail embankment', 'ridge', 911, 0, 950, 880, 1.12, .83),
      zone('Rail crossing', 'road', 735, 421, 1093, 459, 1, 1.1),
      zone('Lovejoy Road', 'road', 950, 485, 994, 880, 1, 1.13),
    ],
    advice: [
      'Davis’s XIV Corps pressures the salient west of the railroad. Stanley’s advance enters from the north along the tracks.',
      'The rail embankment slows formations off the crossing. The southern exit leads toward Lovejoy’s Station.',
    ],
  },
  five_forks: {
    theme: 'woodland', subtitle: 'White Oak Road · Hold or save the army',
    sectors: [sector('left', 'Ford’s Road screen', 780, 248, 260, 160), sector('center', 'Five Forks crossroads', 780, 416, 260, 155), sector('right', 'The Angle', 1110, 404, 140, 215)],
    zones: [
      zone('Pine and oak woods', 'woods', 130, 90, 1530, 575, 1.08, .88),
      zone('Gilliam farm clearing', 'clearing', 280, 420, 620, 660, 1, 1),
      zone('Bass farm clearing', 'clearing', 1180, 485, 1500, 710, 1, 1),
      zone('Ford’s Road', 'road', 722, 0, 838, 444, 1, 1.14),
      zone('White Oak Road', 'road', 0, 427, 1600, 466, 1, 1.09),
      zone('White Oak Road works', 'earthworks', 320, 387, 1104, 427, 1.4, .93),
      zone('The Angle works', 'earthworks', 1060, 309, 1178, 444, 1.47, .93),
    ],
    advice: [
      'Sheridan’s dismounted cavalry comes from the south while Warren’s V Corps arrives in waves from the east.',
      'White Oak Road connects the extended works to the Angle. Ford’s Road runs north through the marked rear exits.',
      'For organized withdrawal, formations must actually reach those exits. Leaving the line immediately cannot earn a screen or defense objective.',
    ],
  },
  antietam: {
    theme: 'pasture', subtitle: 'Sharpsburg · Three sectors under pressure',
    sectors: [sector('left', 'The Cornfield', 415, 432, 320, 200), sector('center', 'Bloody Lane', 820, 568, 390, 190), sector('right', 'Lower Bridge', 1325, 520, 260, 215)],
    zones: [
      zone('Miller Cornfield', 'clearing', 215, 330, 575, 514, 1.13, .82),
      zone('Sunken Road', 'ravine', 600, 516, 1030, 626, 1.38, .87),
      zone('Antietam Creek', 'creek', 1190, 390, 1530, 527, .88, .52),
      zone('Lower Bridge crossing', 'road', 1280, 390, 1370, 527, 1, .97),
      zone('Sherrick heights', 'ridge', 1160, 528, 1550, 690, 1.16, .9),
    ],
    advice: [
      'Union pressure reaches the Cornfield first, then the Sunken Road and Lower Bridge. Late arrivals appear in the roster and dispatches.',
      'The Sunken Road offers cover. Away from the bridge, the modeled creek slows movement considerably.',
      'A. P. Hill arrives on the right. Keep the entry clear so the Light Division can deploy.',
    ],
  },
  first_manassas: {
    theme: 'pasture', subtitle: 'Henry Hill · Reserve and counterattack',
    sectors: [sector('left', 'Matthews approach', 470, 455), sector('center', 'Henry Hill', 735, 620), sector('right', 'Right of the hill', 1040, 635)],
    zones: [zone('Matthews approach', 'ridge', 240, 430, 1270, 520, 1.07, .95), zone('Henry Hill', 'ridge', 380, 535, 1240, 720, 1.16, .94)],
    advice: ['At field minute 105, keep at least two organized infantry formations on Henry Hill, within 340 of each other, with no organized Union troops on it. Your hill defense must have come under fire during the battle. Fallback and Withdraw do not count toward the defending pair.', 'Hampton is your fresh reserve. Move him into a clear supporting position; leave room for the line to turn.', 'Use a supported counterattack when the Union loses cohesion, or cover the retreat toward Manassas Junction.'],
  },
  shiloh: {
    theme: 'woodland', subtitle: 'Pittsburg Landing · Attack toward the river',
    sectors: [sector('left', 'Union camp line', 420, 545), sector('center', 'Hornet’s Nest approach', 865, 610), sector('right', 'Pittsburg Landing', 1160, 750)],
    zones: [zone('Broken woodland', 'woods', 80, 260, 260, 760, 1.1, .85), zone('Camp line', 'ridge', 240, 500, 1270, 650, 1.12, .92), zone('Landing defense', 'ridge', 930, 700, 1480, 850, 1.16, .93)],
    advice: ['The Confederate advance goes down the screen toward Pittsburg Landing. Your rear exits are at the top.', 'Keep Hardee, Bragg and Polk connected. Breckinridge can support a weak flank or remain a fresh reserve.', 'Buell arrives from the landing. Leave time and room to disengage toward the upper edge if the attack stalls.'],
  },
  chancellorsville: {
    theme: 'woodland', subtitle: 'Concealed approach · Turning the flank',
    sectors: [sector('left', 'XI Corps flank', 475, 380), sector('center', 'Flank road', 640, 615), sector('right', 'Hooker’s center', 1070, 505)],
    zones: [zone('Flank woods', 'woods', 40, 160, 725, 810, 1.1, .9), zone('Chancellorsville clearing', 'clearing', 760, 350, 1350, 710, 1.04, 1)],
    advice: ['Watch the flank-column arrival notices. Incoming troops are selectable only after reaching an open deployment position.', 'Move Jackson’s divisions out of column, then attack Howard’s flank together before the surprise window closes.', 'Lee’s holding line fixes the center. A direct attack and a concealed flank march have different deadlines and exposure.'],
  },
  wilderness: {
    theme: 'woodland', subtitle: 'Orange Plank Road · Hold for Longstreet',
    sectors: [sector('left', 'Hill’s front', 470, 610), sector('center', 'Orange Plank Road', 830, 625), sector('right', 'Brock Road approach', 1220, 575)],
    zones: [zone('Wilderness thickets', 'woods', 100, 300, 1490, 770, 1.1, .72), zone('Orange Plank Road', 'road', 50, 600, 1550, 650, 1.02, 1.12)],
    advice: ['In the waiting posture, hold Hill’s front until the Texans and Longstreet arrive. Moving or attacking early counts as a premature commitment.', 'The woods shorten visibility and slow movement. Use the road to move reserves, then deploy clear of friendly fire lanes.', 'Fallback before a division collapses. Rally behind the front near an organized friend; the rally does not replace losses.'],
  },
  third_winchester: {
    theme: 'pasture', subtitle: 'Middle Field · A covered corridor withdrawal',
    sectors: [sector('left', 'Middle Field west', 530, 565), sector('center', 'Middle Field east', 1010, 565), sector('right', 'Gordon’s rearguard', 1240, 700)],
    zones: [zone('Middle Field', 'clearing', 350, 430, 1250, 670, 1.12, .98), zone('Defended line', 'ridge', 300, 550, 1250, 730, 1.22, .95), zone('Northern flank', 'woods', 1250, 290, 1540, 620, 1.08, .9)],
    advice: ['Hold Middle Field under pressure or use Gordon and Wharton to cover retiring columns. The mission counts actual covering time.', 'All Confederate exits lead to the marked lower-left Winchester corridor. Distance alone cannot count as a corridor escape.', 'Crook approaches the right of the screen. Bring the rearguard out before cavalry pressure isolates it.'],
  },
  cedar_creek: {
    theme: 'pasture', subtitle: 'Belle Grove · Surprise and counterattack',
    sectors: [sector('left', 'VIII Corps camps', 360, 410), sector('center', 'Belle Grove', 715, 390), sector('right', 'Valley Pike', 1090, 490)],
    zones: [zone('Camp terraces', 'ridge', 210, 300, 1310, 470, 1.12, .93), zone('Cedar Creek approaches', 'creek', 90, 555, 1500, 650, 1.08, .86)],
    advice: ['Use the dawn window with connected infantry; a scattered advance gives the camps time to recover.', 'Sheridan’s arrival changes the fight. Keep a reserve and ammunition for his counterattack.', 'If withdrawing with the train, screen the guns while they limber. Routed survivors are recorded separately from an organized withdrawal.'],
  },
  gettysburg_jackson: {
    theme: 'pasture', subtitle: 'Alternate history · Race for the heights',
    sectors: [sector('left', 'Cemetery Hill', 1000, 380), sector('center', 'Culp’s Hill', 1320, 300), sector('right', 'Baltimore Pike approach', 1450, 535, 240)],
    zones: [zone('Cemetery Hill', 'ridge', 845, 250, 1190, 460, 1.2, .9), zone('Culp’s Hill', 'woods', 1195, 150, 1540, 430, 1.2, .85), zone('Supporting ridge', 'ridge', 545, 100, 860, 295, 1.16, .94)],
    advice: ['This is the alternate-history battle. Its heights, arrivals and surprise window differ from the July 3 assault.', 'Deploy Jackson’s divisions with enough space to turn. Bring supporting artillery forward through a clear lane.', 'Coordinate Longstreet’s arrival with the attack and watch for Hancock’s rally line before committing the last reserve.'],
  },
  chickamauga: {
    theme: 'woodland', subtitle: 'Brotherton gap · Concentration and exploitation',
    sectors: [sector('left', 'Brotherton gap', 765, 590), sector('center', 'Dyer Field', 1040, 455), sector('right', 'Horseshoe Ridge', 345, 220)],
    zones: [zone('Wooded front', 'woods', 70, 300, 1540, 720, 1.1, .79), zone('Brotherton clearing', 'clearing', 560, 455, 1190, 660, 1, 1), zone('Horseshoe Ridge', 'ridge', 120, 90, 560, 325, 1.2, .9)],
    advice: ['Keep Longstreet’s divisions together until the Brotherton opening appears. Columns move efficiently but are exposed under fire.', 'Assault the gap as a connected group, then continue toward Dyer Field rather than stopping at the first contact.', 'Thomas’s arriving line makes a late breakthrough harder. Preserve supporting formations and avoid isolated fights in the woods.'],
  },
  cold_harbor: {
    theme: 'earthworks', subtitle: 'Interlocking works · Fire lanes and transfer',
    sectors: [sector('left', 'Left works', 335, 670), sector('center', 'Central works', 780, 670), sector('right', 'Petersburg road', 1330, 765)],
    zones: [zone('Broken assault ground', 'ravine', 60, 410, 1580, 620, .94, .86), zone('Confederate works', 'earthworks', 90, 615, 1540, 795, 1.48, .96)],
    advice: ['Hold the prepared works and give the batteries clear lanes. Moving beyond the works gives up their protection.', 'The Federal assault must actually be repulsed. Watch suppression and reinforce gaps in the trench screen.', 'For the Petersburg transfer, send Breckinridge and Hill through the marked rear exits while other formations hold the screen.'],
  },
  petersburg: {
    theme: 'earthworks', subtitle: 'The Crater · Containment and reserve timing',
    sectors: [sector('left', 'West shoulder', 535, 610), sector('center', 'Crater breach', 875, 510), sector('right', 'East shoulder', 1200, 610)],
    zones: [zone('Crater basin', 'crater', 595, 380, 1100, 590, .82, .72), zone('Secondary works', 'earthworks', 110, 640, 1520, 805, 1.38, .95), zone('West siege works', 'earthworks', 170, 115, 510, 245, 1.12, .92), zone('East engineer depot', 'earthworks', 1120, 115, 1440, 245, 1.12, .92)],
    advice: ['Keep the secondary line intact while Mahone arrives. Counterattack, containment, mines and a sortie have different mission conditions.', 'Move both reserve brigades toward the breach together; committing one alone risks losing support in the crater approaches.', 'On the night sortie, strike both marked siege-work targets and then return the raiding brigades safely through the rear.'],
  },
};

export const insideFieldZone = (u, z) => u.x >= z.left && u.x <= z.right && u.y >= z.top && u.y <= z.bottom;
export const insideFieldSector = (u, s) => Math.abs(u.x - s.x) <= s.width / 2 && Math.abs(u.y - s.y) <= s.height / 2;

export function fieldTerrain(e, u) {
  let result = { name: 'Open ground', defense: 1, movement: e.config.movement?.baseMultiplier || 1 };
  for (const z of e.fieldBattle.zones) if (insideFieldZone(u, z)) {
    const defense = z.kind === 'earthworks' && e.scenarioId === 'cold_harbor' && e.entrenchmentState === 'abandoned' ? 1.04 : z.defense;
    result = { name: z.name, defense, movement: z.movement };
  }
  // A mine blast destroys the road surface inside the basin. Preserve the
  // historical simulation of saved rules 11 and earlier.
  if (e.battleRulesVersion >= 12 && e.scenarioId === 'petersburg'
    && e.fieldBattle.zones.some(z => z.kind === 'crater' && insideFieldZone(u,z))) return result;
  for (const road of e.config.movement?.roadBands || []) if (Math.abs(u[road.axis] - road.value) <= road.width) result.movement = Math.max(result.movement, road.multiplier);
  return result;
}

export function fieldLineOfFire(e, a, b) {
  // Preserve each battle's authored visibility limits. Decorative trees never
  // become invisible blockers: terrain zones and these limits are shown in UI.
  return Math.hypot(a.x - b.x, a.y - b.y) <= (a.visibilityLimit || Infinity)
    && !(e.fieldBattle?.landmarks || []).some(site => segmentHitsLandmark(a, b, site));
}

export function fieldExitTargets(e, u) {
  if (e.scenarioId === 'sailors_creek' && u.side === 'confederate') {
    return [639, 680, 722].map(y => ({ x: 18, y }));
  }
  if (e.scenarioId === 'vicksburg') {
    return [320, 510, 610].map(y => ({ x: u.side === 'confederate' ? 18 : e.world.width - 18, y }));
  }
  if (e.scenarioId === 'kennesaw_mountain' && u.side === 'confederate') {
    return [1090, 1210, 1330].map(x => ({ x, y: e.world.height - 18 }));
  }
  if (e.scenarioId === 'missionary_ridge') {
    return u.side === 'confederate' ? [520, 594, 676].map(y => ({ x: e.world.width - 18, y }))
      : [286, 423, 589].map(y => ({ x: 18, y }));
  }
  if (e.scenarioId === 'fredericksburg') {
    return u.side === 'confederate' ? [210, 445, 680].map(y => ({ x: 18, y })) : [{ x: 1186, y: 418 }];
  }
  if (e.scenarioId === 'jonesborough' && u.side === 'confederate') {
    return [855, 930, 1005].map(x => ({ x, y: e.world.height - 18 }));
  }
  if (e.scenarioId === 'five_forks' && u.side === 'confederate') {
    return [690, 780, 870].map(x => ({ x, y: 18 }));
  }
  if (e.scenarioId === 'third_winchester' && u.side === 'confederate') {
    const z = e.config.withdrawalCorridor;
    return [.2, .5, .8].map(t => ({ x: z.left + (z.right - z.left) * t, y: z.top + 35 }));
  }
  const edge = e.config.retreatEdges?.[u.side] || (u.side === 'union' ? 'top' : 'bottom');
  return [.12, .5, .88].map(t => ({ x: e.world.width * t, y: edge === 'top' ? 18 : e.world.height - 18 }));
}
