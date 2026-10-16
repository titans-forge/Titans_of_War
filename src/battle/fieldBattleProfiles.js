import { segmentHitsLandmark } from './historicalLandmarks.js';
// Authored game coordinates. These are representative tactical boards, not surveyed maps.
const sector = (id, name, x, y, width = 260, height = 170) => ({ id, name, x, y, width, height });
const zone = (name, kind, left, top, right, bottom, defense = 1, movement = 1) => ({ name, kind, left, top, right, bottom, defense, movement });
export const FIELD_BATTLE_PROFILES = {
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
  if (e.scenarioId === 'third_winchester' && u.side === 'confederate') {
    const z = e.config.withdrawalCorridor;
    return [.2, .5, .8].map(t => ({ x: z.left + (z.right - z.left) * t, y: z.top + 35 }));
  }
  const edge = e.config.retreatEdges?.[u.side] || (u.side === 'union' ? 'top' : 'bottom');
  return [.12, .5, .88].map(t => ({ x: e.world.width * t, y: edge === 'top' ? 18 : e.world.height - 18 }));
}
