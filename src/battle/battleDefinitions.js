const WORLD = { width: 1500, height: 900 };
const CHANCELLORSVILLE_WORLD = { width: 1600, height: 900 };
const WILDERNESS_WORLD = { width: 1600, height: 900 };
const CEDAR_CREEK_WORLD = { width: 1600, height: 900 };
const GETTYSBURG_WORLD = { width: 1700, height: 900 };
const CHICKAMAUGA_WORLD = { width: 1650, height: 900 };
const COLD_HARBOR_WORLD = { width: 1650, height: 900 };
const PETERSBURG_WORLD = { width: 1650, height: 900 };
const THIRD_WINCHESTER_WORLD = { width: 1600, height: 900 };

// Rotated tactical field: east at top, west at bottom, north at right.
// Representative infantry groups, not a complete order of battle; cavalry stays off-map.
const THIRD_WINCHESTER_FORMATIONS = [
  { id: 'ramseur-winchester', name: "Ramseur's Division", side: 'confederate', type: 'infantry', x: 450, y: 580, facing: -Math.PI / 2, frontage: 210, mode: 'line', strength: 3000, morale: 77, cohesion: 74, ammunition: 42 },
  { id: 'rodes-winchester', name: "Rodes's Division", side: 'confederate', type: 'infantry', x: 740, y: 615, facing: -Math.PI / 2, frontage: 205, mode: 'line', strength: 2900, morale: 79, cohesion: 75, ammunition: 42 },
  { id: 'gordon-winchester', name: "Gordon's Division", side: 'confederate', type: 'infantry', x: 1040, y: 560, facing: -Math.PI / 2, frontage: 215, mode: 'line', strength: 3200, morale: 80, cohesion: 76, ammunition: 43 },
  { id: 'wharton-winchester', name: "Wharton's Division", side: 'confederate', type: 'infantry', x: 1270, y: 700, facing: -1.15, frontage: 190, mode: 'line', strength: 2400, morale: 74, cohesion: 70, ammunition: 40 },
  { id: 'winchester-batteries', name: 'Winchester Batteries', side: 'confederate', type: 'artillery', x: 510, y: 695, facing: -Math.PI / 2, frontage: 110, mode: 'line', strength: 300, morale: 77, cohesion: 76, ammunition: 34 },
  { id: 'getty-vi-winchester', name: "Getty's Division, VI Corps", side: 'union', type: 'infantry', x: 440, y: 240, facing: Math.PI / 2, frontage: 225, mode: 'line', strength: 5000, morale: 76, cohesion: 72, ammunition: 44 },
  { id: 'ricketts-vi-winchester', name: "Ricketts's Division, VI Corps", side: 'union', type: 'infantry', x: 745, y: 220, facing: Math.PI / 2, frontage: 220, mode: 'line', strength: 4800, morale: 75, cohesion: 71, ammunition: 43 },
  { id: 'grover-xix-winchester', name: "Grover's Division, XIX Corps", side: 'union', type: 'infantry', x: 1090, y: 235, facing: Math.PI / 2, frontage: 230, mode: 'line', strength: 5700, morale: 73, cohesion: 69, ammunition: 43 },
  { id: 'dwight-xix-winchester', name: "Dwight's Division, XIX Corps", side: 'union', type: 'infantry', x: 1170, y: 95, facing: Math.PI / 2, frontage: 205, mode: 'deep', strength: 4000, morale: 78, cohesion: 75, ammunition: 44 },
  { id: 'russell-vi-winchester', name: "Russell's Reserve, VI Corps", side: 'union', type: 'infantry', x: 650, y: 95, facing: Math.PI / 2, frontage: 205, mode: 'line', strength: 3200, morale: 82, cohesion: 79, ammunition: 44, active: false, arrivalTime: 28 },
  { id: 'duval-crook-winchester', name: "Duval's Infantry, Crook's Corps", side: 'union', type: 'infantry', x: 1490, y: 390, facing: 2.5, frontage: 190, mode: 'line', strength: 3500, morale: 82, cohesion: 76, ammunition: 44, active: false, arrivalTime: 60, arrivalMessage: "Crook's Duval division is crossing Red Bud Run on the northern flank." },
  { id: 'thoburn-crook-winchester', name: "Thoburn's Infantry, Crook's Corps", side: 'union', type: 'infantry', x: 1390, y: 260, facing: 2.2, frontage: 190, mode: 'line', strength: 3000, morale: 81, cohesion: 75, ammunition: 44, active: false, arrivalTime: 66, arrivalMessage: "Thoburn's infantry is advancing along the near bank of Red Bud Run toward Hackwood." },
  { id: 'union-winchester-batteries', name: 'VI Corps Batteries', side: 'union', type: 'artillery', x: 820, y: 300, facing: Math.PI / 2, frontage: 110, mode: 'line', strength: 360, morale: 78, cohesion: 76, ammunition: 36 },
];

const MANASSAS_FORMATIONS = [
  { id: 'jackson-brigade', name: "Jackson's Brigade", side: 'confederate', type: 'infantry', x: 660, y: 650, facing: -Math.PI / 2, frontage: 220, mode: 'line', strength: 2600, morale: 82, cohesion: 78, ammunition: 42 },
  { id: 'bee-evans-line', name: 'Bee and Evans', side: 'confederate', type: 'infantry', x: 930, y: 675, facing: -Math.PI / 2, frontage: 190, mode: 'line', strength: 1650, morale: 60, cohesion: 61, ammunition: 34 },
  { id: 'hampton-reserve', name: 'Hampton Reserve', side: 'confederate', type: 'infantry', x: 800, y: 800, facing: -Math.PI / 2, frontage: 135, mode: 'deep', strength: 720, morale: 74, cohesion: 72, ammunition: 38 },
  { id: 'sherman-brigade', name: "Sherman's Brigade", side: 'union', type: 'infantry', x: 455, y: 245, facing: Math.PI / 2, frontage: 220, mode: 'line', strength: 2500, morale: 67, cohesion: 70, ammunition: 42 },
  { id: 'keyes-brigade', name: "Keyes's Brigade", side: 'union', type: 'infantry', x: 760, y: 220, facing: Math.PI / 2, frontage: 215, mode: 'line', strength: 2200, morale: 65, cohesion: 68, ammunition: 40 },
  { id: 'howard-brigade', name: "Howard's Brigade", side: 'union', type: 'infantry', x: 1080, y: 260, facing: Math.PI / 2, frontage: 205, mode: 'deep', strength: 1850, morale: 62, cohesion: 65, ammunition: 38 },
  { id: 'ricketts-griffin', name: 'Ricketts-Griffin Battery', side: 'union', type: 'artillery', x: 870, y: 375, facing: Math.PI / 2, frontage: 105, mode: 'line', strength: 220, morale: 72, cohesion: 76, ammunition: 28 },
];

const SHILOH_FORMATIONS = [
  { id: 'hardee-corps', name: "Hardee's Corps", side: 'confederate', type: 'infantry', x: 335, y: 205, facing: Math.PI / 2, frontage: 245, mode: 'line', strength: 6500, morale: 78, cohesion: 64, ammunition: 38 },
  { id: 'bragg-corps', name: "Bragg's Corps", side: 'confederate', type: 'infantry', x: 650, y: 180, facing: Math.PI / 2, frontage: 255, mode: 'line', strength: 7000, morale: 76, cohesion: 61, ammunition: 40 },
  { id: 'polk-corps', name: "Polk's Corps", side: 'confederate', type: 'infantry', x: 965, y: 215, facing: Math.PI / 2, frontage: 220, mode: 'line', strength: 4800, morale: 70, cohesion: 59, ammunition: 36 },
  { id: 'breckinridge-reserve', name: "Breckinridge's Reserve", side: 'confederate', type: 'infantry', x: 720, y: 70, facing: Math.PI / 2, frontage: 165, mode: 'deep', strength: 4500, morale: 80, cohesion: 74, ammunition: 42 },
  { id: 'sherman-division', name: "Sherman's Division", side: 'union', type: 'infantry', x: 305, y: 500, facing: -Math.PI / 2, frontage: 235, mode: 'line', strength: 7000, morale: 66, cohesion: 61, ammunition: 40 },
  { id: 'mcclernand-division', name: "McClernand's Division", side: 'union', type: 'infantry', x: 600, y: 515, facing: -Math.PI / 2, frontage: 230, mode: 'line', strength: 6500, morale: 64, cohesion: 59, ammunition: 39 },
  { id: 'prentiss-division', name: "Prentiss's Division", side: 'union', type: 'infantry', x: 875, y: 555, facing: -Math.PI / 2, frontage: 205, mode: 'deep', strength: 5200, morale: 68, cohesion: 63, ammunition: 38 },
  { id: 'hurlbut-division', name: "Hurlbut's Division", side: 'union', type: 'infantry', x: 1120, y: 620, facing: -Math.PI / 2, frontage: 220, mode: 'line', strength: 6800, morale: 70, cohesion: 65, ammunition: 42 },
  { id: 'landing-artillery', name: 'Pittsburg Landing Batteries', side: 'union', type: 'artillery', x: 1160, y: 735, facing: -Math.PI / 2, frontage: 110, mode: 'line', strength: 380, morale: 78, cohesion: 78, ammunition: 36 },
  { id: 'buell-vanguard', name: "Buell's Vanguard", side: 'union', type: 'infantry', x: 1270, y: 845, facing: -Math.PI / 2, frontage: 215, mode: 'column', strength: 6000, morale: 82, cohesion: 78, ammunition: 44, active: false, arrivalTime: 72 },
];

const CHANCELLORSVILLE_FORMATIONS = [
  { id: 'lee-holding-line', name: "Lee's Holding Line", side: 'confederate', type: 'infantry', x: 1430, y: 820, facing: -Math.PI / 2, frontage: 235, mode: 'line', strength: 14500, morale: 82, cohesion: 76, ammunition: 42 },
  { id: 'jackson-rodes', name: "Rodes's Division", side: 'confederate', type: 'infantry', x: 110, y: 365, facing: 0, frontage: 215, mode: 'column', strength: 7800, morale: 86, cohesion: 74, ammunition: 42, active: false },
  { id: 'jackson-colston', name: "Colston's Division", side: 'confederate', type: 'infantry', x: 90, y: 505, facing: 0, frontage: 205, mode: 'column', strength: 6500, morale: 80, cohesion: 69, ammunition: 40, active: false },
  { id: 'ap-hill-reserve', name: "A. P. Hill's Reserve", side: 'confederate', type: 'infantry', x: 70, y: 640, facing: 0, frontage: 180, mode: 'deep', strength: 7200, morale: 84, cohesion: 76, ammunition: 43, active: false },
  { id: 'devens-division', name: "Devens's Division", side: 'union', type: 'infantry', x: 505, y: 365, facing: Math.PI, frontage: 210, mode: 'line', strength: 4500, morale: 63, cohesion: 58, ammunition: 39, flankTarget: true },
  { id: 'schurz-division', name: "Schurz's Division", side: 'union', type: 'infantry', x: 555, y: 520, facing: Math.PI, frontage: 215, mode: 'line', strength: 5200, morale: 68, cohesion: 62, ammunition: 40, flankTarget: true },
  { id: 'barlow-reserve', name: "Barlow's Reserve", side: 'union', type: 'infantry', x: 670, y: 650, facing: Math.PI, frontage: 170, mode: 'deep', strength: 3100, morale: 72, cohesion: 69, ammunition: 40, flankTarget: true },
  { id: 'hooker-center', name: "Hooker's Center", side: 'union', type: 'infantry', x: 1030, y: 505, facing: Math.PI / 2, frontage: 255, mode: 'line', strength: 17000, morale: 76, cohesion: 72, ammunition: 44 },
  { id: 'chancellorsville-artillery', name: 'Union Center Batteries', side: 'union', type: 'artillery', x: 965, y: 625, facing: Math.PI / 2, frontage: 115, mode: 'line', strength: 420, morale: 76, cohesion: 77, ammunition: 36 },
];

const WILDERNESS_FORMATIONS = [
  { id: 'hill-wilcox-line', name: "Wilcox's Division", side: 'confederate', type: 'infantry', x: 470, y: 610, facing: -Math.PI / 2, frontage: 220, mode: 'line', strength: 6200, morale: 66, cohesion: 54, ammunition: 34, visibilityLimit: 205, wildernessFront: true },
  { id: 'hill-heth-line', name: "Heth's Division", side: 'confederate', type: 'infantry', x: 790, y: 625, facing: -Math.PI / 2, frontage: 225, mode: 'line', strength: 6500, morale: 65, cohesion: 52, ammunition: 35, visibilityLimit: 205, wildernessFront: true },
  { id: 'ewell-wilderness-line', name: "Ewell's Second Corps", side: 'confederate', type: 'infantry', x: 1250, y: 585, facing: -Math.PI / 2, frontage: 245, mode: 'line', strength: 12800, morale: 74, cohesion: 66, ammunition: 39, visibilityLimit: 215 },
  { id: 'texas-brigade', name: 'Texas Brigade', side: 'confederate', type: 'infantry', x: 570, y: 825, facing: -Math.PI / 2, frontage: 175, mode: 'column', strength: 3600, morale: 88, cohesion: 82, ammunition: 42, visibilityLimit: 210, active: false, reinforcementRole: 'texans' },
  { id: 'longstreet-first-corps', name: "Longstreet's First Corps", side: 'confederate', type: 'infantry', x: 910, y: 850, facing: -Math.PI / 2, frontage: 250, mode: 'column', strength: 14500, morale: 84, cohesion: 79, ammunition: 43, visibilityLimit: 215, active: false, reinforcementRole: 'longstreet' },
  { id: 'hancock-second-corps', name: "Hancock's Second Corps", side: 'union', type: 'infantry', x: 475, y: 245, facing: Math.PI / 2, frontage: 245, mode: 'line', strength: 16500, morale: 82, cohesion: 76, ammunition: 43, visibilityLimit: 210, unionPressure: true },
  { id: 'getty-fifth-corps', name: "Getty's Division", side: 'union', type: 'infantry', x: 785, y: 270, facing: Math.PI / 2, frontage: 220, mode: 'line', strength: 7200, morale: 77, cohesion: 72, ammunition: 41, visibilityLimit: 205, unionPressure: true },
  { id: 'wadsworth-division', name: "Wadsworth's Division", side: 'union', type: 'infantry', x: 1090, y: 255, facing: Math.PI / 2, frontage: 220, mode: 'line', strength: 8600, morale: 76, cohesion: 69, ammunition: 40, visibilityLimit: 205, unionPressure: true },
  { id: 'warren-reserve', name: "Warren's Reserve", side: 'union', type: 'infantry', x: 1360, y: 190, facing: Math.PI / 2, frontage: 190, mode: 'deep', strength: 9000, morale: 78, cohesion: 75, ammunition: 42, visibilityLimit: 210 },
  { id: 'wilderness-union-artillery', name: 'Union Road Batteries', side: 'union', type: 'artillery', x: 895, y: 395, facing: Math.PI / 2, frontage: 105, mode: 'line', strength: 360, morale: 74, cohesion: 75, ammunition: 32, visibilityLimit: 225 },
];

const CEDAR_CREEK_FORMATIONS = [
  { id: 'gordon-division', name: "Gordon's Division", side: 'confederate', type: 'infantry', x: 330, y: 680, facing: -Math.PI / 2, frontage: 215, mode: 'line', strength: 3600, morale: 84, cohesion: 76, ammunition: 38, surpriseColumn: true },
  { id: 'ramseur-division', name: "Ramseur's Division", side: 'confederate', type: 'infantry', x: 630, y: 720, facing: -Math.PI / 2, frontage: 210, mode: 'line', strength: 3300, morale: 82, cohesion: 73, ammunition: 38, surpriseColumn: true },
  { id: 'kershaw-division', name: "Kershaw's Division", side: 'confederate', type: 'infantry', x: 930, y: 700, facing: -Math.PI / 2, frontage: 205, mode: 'line', strength: 2900, morale: 80, cohesion: 72, ammunition: 37, surpriseColumn: true },
  { id: 'wharton-division', name: "Wharton's Division", side: 'confederate', type: 'infantry', x: 1220, y: 740, facing: -Math.PI / 2, frontage: 190, mode: 'deep', strength: 2300, morale: 76, cohesion: 69, ammunition: 36, surpriseColumn: true },
  { id: 'early-artillery', name: "Early's Artillery", side: 'confederate', type: 'artillery', x: 790, y: 815, facing: -Math.PI / 2, frontage: 110, mode: 'line', strength: 320, morale: 76, cohesion: 75, ammunition: 30 },
  { id: 'thoburn-eighth-corps', name: "Thoburn's VIII Corps", side: 'union', type: 'infantry', x: 360, y: 390, facing: Math.PI / 2, frontage: 205, mode: 'line', strength: 4200, morale: 58, cohesion: 52, ammunition: 39, surpriseTarget: true },
  { id: 'emory-nineteenth-corps', name: "Emory's XIX Corps", side: 'union', type: 'infantry', x: 700, y: 350, facing: Math.PI / 2, frontage: 235, mode: 'line', strength: 8200, morale: 66, cohesion: 61, ammunition: 41, surpriseTarget: true },
  { id: 'wright-sixth-corps', name: "Wright's VI Corps", side: 'union', type: 'infantry', x: 1050, y: 300, facing: Math.PI / 2, frontage: 245, mode: 'line', strength: 11800, morale: 77, cohesion: 73, ammunition: 43 },
  { id: 'cedar-creek-batteries', name: 'Belle Grove Batteries', side: 'union', type: 'artillery', x: 820, y: 455, facing: Math.PI / 2, frontage: 115, mode: 'line', strength: 360, morale: 68, cohesion: 67, ammunition: 32, surpriseTarget: true },
  { id: 'sheridan-rally-line', name: "Sheridan's Rally Line", side: 'union', type: 'infantry', x: 1320, y: 155, facing: Math.PI / 2, frontage: 245, mode: 'deep', strength: 7800, morale: 90, cohesion: 86, ammunition: 44, active: false, arrivalTime: 62, reinforcementRole: 'sheridan' },
];

const GETTYSBURG_FORMATIONS = [
  { id: 'pickett-division', name: "Pickett's Division", side: 'confederate', type: 'infantry', x: 430, y: 720, facing: -Math.PI / 2, frontage: 230, mode: 'line', strength: 5200, morale: 87, cohesion: 79, ammunition: 42, assaultColumn: true },
  { id: 'pettigrew-division', name: "Pettigrew's Division", side: 'confederate', type: 'infantry', x: 760, y: 745, facing: -Math.PI / 2, frontage: 245, mode: 'line', strength: 5600, morale: 78, cohesion: 70, ammunition: 40, assaultColumn: true },
  { id: 'trimble-division', name: "Trimble's Division", side: 'confederate', type: 'infantry', x: 1065, y: 770, facing: -Math.PI / 2, frontage: 195, mode: 'deep', strength: 3400, morale: 76, cohesion: 68, ammunition: 39, assaultColumn: true },
  { id: 'wilcox-support', name: "Wilcox's Support", side: 'confederate', type: 'infantry', x: 1360, y: 735, facing: -Math.PI / 2, frontage: 180, mode: 'deep', strength: 2700, morale: 72, cohesion: 69, ammunition: 38, reserve: true },
  { id: 'alexander-battalion', name: "Alexander's Artillery", side: 'confederate', type: 'artillery', x: 825, y: 840, facing: -Math.PI / 2, frontage: 120, mode: 'line', strength: 420, morale: 82, cohesion: 80, ammunition: 38 },
  { id: 'gibbon-center', name: "Gibbon's Division", side: 'union', type: 'infantry', x: 470, y: 330, facing: Math.PI / 2, frontage: 230, mode: 'line', strength: 4800, morale: 84, cohesion: 82, ammunition: 44, ridgeDefender: true, unionCenter: true },
  { id: 'hays-center', name: "Hays's Division", side: 'union', type: 'infantry', x: 790, y: 310, facing: Math.PI / 2, frontage: 225, mode: 'line', strength: 4400, morale: 82, cohesion: 80, ammunition: 43, ridgeDefender: true, unionCenter: true },
  { id: 'webb-angle', name: "Webb at the Angle", side: 'union', type: 'infantry', x: 1080, y: 345, facing: Math.PI / 2, frontage: 190, mode: 'deep', strength: 3100, morale: 86, cohesion: 84, ammunition: 43, ridgeDefender: true, stoneWall: true, unionCenter: true },
  { id: 'cushing-battery', name: "Cushing's Battery", side: 'union', type: 'artillery', x: 905, y: 420, facing: Math.PI / 2, frontage: 110, mode: 'line', strength: 280, morale: 88, cohesion: 84, ammunition: 34, ridgeDefender: true, stoneWall: true, unionCenter: true },
  { id: 'hancock-reserve', name: "Hancock's Reserve", side: 'union', type: 'infantry', x: 1370, y: 245, facing: Math.PI / 2, frontage: 220, mode: 'deep', strength: 5200, morale: 86, cohesion: 83, ammunition: 44, ridgeDefender: true },
];

const GETTYSBURG_JACKSON_FORMATIONS = [
  { id: 'jackson-rodes-gettysburg', name: "Rodes's Division", side: 'confederate', type: 'infantry', x: 1180, y: 700, facing: -2.15, frontage: 225, mode: 'line', strength: 7600, morale: 88, cohesion: 80, ammunition: 42, jacksonColumn: true },
  { id: 'jackson-early-gettysburg', name: "Early's Division", side: 'confederate', type: 'infantry', x: 1430, y: 650, facing: -2.25, frontage: 215, mode: 'line', strength: 6400, morale: 84, cohesion: 76, ammunition: 41, jacksonColumn: true },
  { id: 'jackson-johnson-gettysburg', name: "Johnson's Division", side: 'confederate', type: 'infantry', x: 1510, y: 795, facing: -2.25, frontage: 205, mode: 'deep', strength: 5900, morale: 82, cohesion: 74, ammunition: 40, jacksonColumn: true },
  { id: 'hill-support-gettysburg', name: "A. P. Hill's Support", side: 'confederate', type: 'infantry', x: 880, y: 785, facing: -Math.PI / 2, frontage: 220, mode: 'deep', strength: 7600, morale: 76, cohesion: 70, ammunition: 40, reserve: true },
  { id: 'longstreet-wing-gettysburg', name: "Longstreet's Wing", side: 'confederate', type: 'infantry', x: 520, y: 840, facing: -Math.PI / 2, frontage: 245, mode: 'column', strength: 10800, morale: 84, cohesion: 81, ammunition: 43, active: false, arrivalTime: 34, reinforcementRole: 'longstreet-gettysburg' },
  { id: 'jackson-artillery-gettysburg', name: "Second Corps Artillery", side: 'confederate', type: 'artillery', x: 1260, y: 835, facing: -2.15, frontage: 115, mode: 'line', strength: 380, morale: 80, cohesion: 79, ammunition: 35 },
  { id: 'howard-cemetery-hill', name: "Howard on Cemetery Hill", side: 'union', type: 'infantry', x: 1040, y: 350, facing: 0.9, frontage: 225, mode: 'line', strength: 6400, morale: 72, cohesion: 68, ammunition: 42, hillDefender: true, surpriseTarget: true },
  { id: 'slocum-culps-hill', name: "Slocum on Culp's Hill", side: 'union', type: 'infantry', x: 1320, y: 270, facing: 1.05, frontage: 220, mode: 'line', strength: 7200, morale: 78, cohesion: 74, ammunition: 43, hillDefender: true, surpriseTarget: true },
  { id: 'cemetery-hill-batteries', name: 'Cemetery Hill Batteries', side: 'union', type: 'artillery', x: 1160, y: 430, facing: 1.0, frontage: 115, mode: 'line', strength: 320, morale: 79, cohesion: 78, ammunition: 34, hillDefender: true, surpriseTarget: true },
  { id: 'hancock-arrival-gettysburg', name: "Hancock's Rally Line", side: 'union', type: 'infantry', x: 770, y: 190, facing: Math.PI / 2, frontage: 245, mode: 'deep', strength: 9400, morale: 88, cohesion: 85, ammunition: 44, active: false, arrivalTime: 58, ridgeDefender: true, reinforcementRole: 'hancock-gettysburg' },
];

const CHICKAMAUGA_FORMATIONS = [
  { id: 'breckinridge-chickamauga', name: "Breckinridge's Division", side: 'confederate', type: 'infantry', x: 315, y: 690, facing: -Math.PI / 2, frontage: 210, mode: 'line', strength: 5100, morale: 78, cohesion: 69, ammunition: 39, visibilityLimit: 195, woodedFront: true },
  { id: 'bushrod-johnson-column', name: "Bushrod Johnson's Division", side: 'confederate', type: 'infantry', x: 650, y: 735, facing: -Math.PI / 2, frontage: 180, mode: 'column', strength: 5200, morale: 83, cohesion: 77, ammunition: 41, visibilityLimit: 200, longstreetColumn: true },
  { id: 'hindman-chickamauga', name: "Hindman's Division", side: 'confederate', type: 'infantry', x: 920, y: 765, facing: -Math.PI / 2, frontage: 185, mode: 'column', strength: 6100, morale: 80, cohesion: 73, ammunition: 40, visibilityLimit: 200, longstreetColumn: true },
  { id: 'kershaw-chickamauga', name: "Kershaw's Division", side: 'confederate', type: 'infantry', x: 1190, y: 735, facing: -Math.PI / 2, frontage: 175, mode: 'deep', strength: 4800, morale: 84, cohesion: 77, ammunition: 42, visibilityLimit: 200, longstreetColumn: true },
  { id: 'preston-chickamauga', name: "Preston's Reserve", side: 'confederate', type: 'infantry', x: 1410, y: 815, facing: -Math.PI / 2, frontage: 170, mode: 'deep', strength: 4400, morale: 79, cohesion: 75, ammunition: 41, visibilityLimit: 195, reserve: true },
  { id: 'longstreet-artillery-chickamauga', name: "Longstreet's Artillery", side: 'confederate', type: 'artillery', x: 1030, y: 840, facing: -Math.PI / 2, frontage: 110, mode: 'line', strength: 360, morale: 79, cohesion: 77, ammunition: 34, visibilityLimit: 260 },
  { id: 'thomas-fourteenth-corps', name: "Thomas's XIV Corps", side: 'union', type: 'infantry', x: 340, y: 290, facing: Math.PI / 2, frontage: 245, mode: 'line', strength: 11800, morale: 86, cohesion: 82, ammunition: 44, visibilityLimit: 205, ridgeDefender: true },
  { id: 'palmer-union-center', name: "Palmer's Division", side: 'union', type: 'infantry', x: 590, y: 350, facing: Math.PI / 2, frontage: 215, mode: 'line', strength: 5600, morale: 76, cohesion: 72, ammunition: 42, visibilityLimit: 195 },
  { id: 'wood-division-gap', name: "Wood's Division", side: 'union', type: 'infantry', x: 790, y: 405, facing: Math.PI / 2, frontage: 205, mode: 'line', strength: 5100, morale: 74, cohesion: 70, ammunition: 42, visibilityLimit: 195, gapTarget: true },
  { id: 'davis-division-gap', name: "Davis's Division", side: 'union', type: 'infantry', x: 1025, y: 430, facing: Math.PI / 2, frontage: 205, mode: 'line', strength: 4700, morale: 70, cohesion: 67, ammunition: 40, visibilityLimit: 195, gapTarget: true },
  { id: 'sheridan-division-gap', name: "Sheridan's Division", side: 'union', type: 'infantry', x: 1245, y: 395, facing: Math.PI / 2, frontage: 220, mode: 'line', strength: 6000, morale: 75, cohesion: 70, ammunition: 41, visibilityLimit: 195, gapTarget: true },
  { id: 'wilder-mounted-brigade', name: "Wilder's Brigade", side: 'union', type: 'infantry', x: 1390, y: 530, facing: Math.PI / 2, frontage: 190, mode: 'skirmish', strength: 3100, morale: 82, cohesion: 78, ammunition: 48, visibilityLimit: 220 },
  { id: 'horseshoe-ridge-line', name: "Thomas on Horseshoe Ridge", side: 'union', type: 'infantry', x: 310, y: 165, facing: Math.PI / 2, frontage: 250, mode: 'deep', strength: 7600, morale: 92, cohesion: 88, ammunition: 44, visibilityLimit: 210, active: false, arrivalTime: 60, ridgeDefender: true, reinforcementRole: 'thomas-rally' },
];

const COLD_HARBOR_FORMATIONS = [
  { id: 'kershaw-cold-harbor', name: "Kershaw's Division", side: 'confederate', type: 'infantry', x: 285, y: 665, facing: -Math.PI / 2, frontage: 225, mode: 'line', strength: 6100, morale: 84, cohesion: 82, ammunition: 43, entrenchDefender: true },
  { id: 'hoke-cold-harbor', name: "Hoke's Division", side: 'confederate', type: 'infantry', x: 600, y: 650, facing: -Math.PI / 2, frontage: 230, mode: 'line', strength: 6800, morale: 86, cohesion: 84, ammunition: 44, entrenchDefender: true },
  { id: 'field-cold-harbor', name: "Field's Division", side: 'confederate', type: 'infantry', x: 915, y: 665, facing: -Math.PI / 2, frontage: 225, mode: 'line', strength: 6400, morale: 83, cohesion: 81, ammunition: 43, entrenchDefender: true },
  { id: 'breckinridge-cold-harbor', name: "Breckinridge's Division", side: 'confederate', type: 'infantry', x: 1225, y: 680, facing: -Math.PI / 2, frontage: 210, mode: 'line', strength: 5400, morale: 82, cohesion: 80, ammunition: 42, entrenchDefender: true, petersburgTransfer: true },
  { id: 'hill-reserve-cold-harbor', name: "A. P. Hill's Reserve", side: 'confederate', type: 'infantry', x: 1450, y: 805, facing: -Math.PI / 2, frontage: 185, mode: 'deep', strength: 6200, morale: 80, cohesion: 79, ammunition: 42, reserve: true, petersburgTransfer: true },
  { id: 'cold-harbor-artillery', name: "Lee's Center Batteries", side: 'confederate', type: 'artillery', x: 780, y: 760, facing: -Math.PI / 2, frontage: 120, mode: 'line', strength: 420, morale: 84, cohesion: 84, ammunition: 38, entrenchDefender: true },
  { id: 'hancock-second-corps-cold-harbor', name: "Hancock's II Corps", side: 'union', type: 'infantry', x: 280, y: 235, facing: Math.PI / 2, frontage: 245, mode: 'line', strength: 14500, morale: 75, cohesion: 66, ammunition: 43, assaultFormation: true },
  { id: 'wright-sixth-corps-cold-harbor', name: "Wright's VI Corps", side: 'union', type: 'infantry', x: 590, y: 270, facing: Math.PI / 2, frontage: 245, mode: 'line', strength: 13200, morale: 76, cohesion: 68, ammunition: 43, assaultFormation: true },
  { id: 'smith-eighteenth-corps-cold-harbor', name: "Smith's XVIII Corps", side: 'union', type: 'infantry', x: 900, y: 255, facing: Math.PI / 2, frontage: 240, mode: 'line', strength: 11800, morale: 74, cohesion: 65, ammunition: 42, assaultFormation: true },
  { id: 'burnside-ninth-corps-cold-harbor', name: "Burnside's IX Corps", side: 'union', type: 'infantry', x: 1195, y: 215, facing: Math.PI / 2, frontage: 220, mode: 'deep', strength: 10500, morale: 71, cohesion: 63, ammunition: 41, assaultFormation: true },
  { id: 'warren-fifth-corps-cold-harbor', name: "Warren's V Corps", side: 'union', type: 'infantry', x: 1445, y: 275, facing: Math.PI / 2, frontage: 220, mode: 'line', strength: 12400, morale: 75, cohesion: 69, ammunition: 43, assaultFormation: true },
  { id: 'cold-harbor-union-artillery', name: 'Union Assault Batteries', side: 'union', type: 'artillery', x: 820, y: 405, facing: Math.PI / 2, frontage: 120, mode: 'line', strength: 520, morale: 76, cohesion: 74, ammunition: 38 },
];

const PETERSBURG_FORMATIONS = [
  { id: 'elliott-salient-survivors', name: "Elliott's Salient Survivors", side: 'confederate', type: 'infantry', x: 255, y: 660, facing: -Math.PI / 2, frontage: 175, mode: 'line', strength: 1550, morale: 66, cohesion: 54, ammunition: 32, secondaryDefender: true },
  { id: 'bushrod-johnson-line', name: "Bushrod Johnson's Line", side: 'confederate', type: 'infantry', x: 510, y: 690, facing: -Math.PI / 2, frontage: 205, mode: 'line', strength: 4300, morale: 78, cohesion: 72, ammunition: 40, secondaryDefender: true },
  { id: 'gracie-petersburg-line', name: "Gracie's Brigade", side: 'confederate', type: 'infantry', x: 1190, y: 690, facing: -Math.PI / 2, frontage: 205, mode: 'line', strength: 2700, morale: 80, cohesion: 76, ammunition: 41, secondaryDefender: true },
  { id: 'ransom-petersburg-reserve', name: "Ransom's Reserve", side: 'confederate', type: 'infantry', x: 1435, y: 770, facing: -Math.PI / 2, frontage: 165, mode: 'deep', strength: 3600, morale: 78, cohesion: 75, ammunition: 40, reserve: true, secondaryDefender: true },
  { id: 'mahone-virginia-brigade', name: "Mahone's Virginia Brigade", side: 'confederate', type: 'infantry', x: 930, y: 825, facing: -Math.PI / 2, frontage: 180, mode: 'column', strength: 2800, morale: 90, cohesion: 86, ammunition: 43, active: false, mahoneReserve: true, reinforcementRole: 'mahone' },
  { id: 'mahone-alabama-brigade', name: "Mahone's Alabama Brigade", side: 'confederate', type: 'infantry', x: 1180, y: 850, facing: -Math.PI / 2, frontage: 175, mode: 'column', strength: 2300, morale: 87, cohesion: 83, ammunition: 42, active: false, mahoneReserve: true, reinforcementRole: 'mahone' },
  { id: 'petersburg-confederate-batteries', name: 'Crater Sector Batteries', side: 'confederate', type: 'artillery', x: 820, y: 745, facing: -Math.PI / 2, frontage: 115, mode: 'line', strength: 310, morale: 80, cohesion: 79, ammunition: 34, secondaryDefender: true },
  { id: 'ledlie-crater-division', name: "Ledlie's Division", side: 'union', type: 'infantry', x: 720, y: 415, facing: Math.PI / 2, frontage: 195, mode: 'deep', strength: 4800, morale: 62, cohesion: 51, ammunition: 40, craterAttacker: true },
  { id: 'potter-crater-division', name: "Potter's Division", side: 'union', type: 'infantry', x: 430, y: 355, facing: Math.PI / 2, frontage: 205, mode: 'line', strength: 5300, morale: 70, cohesion: 62, ammunition: 41, craterAttacker: true },
  { id: 'wilcox-crater-division', name: "Wilcox's Division", side: 'union', type: 'infantry', x: 1010, y: 365, facing: Math.PI / 2, frontage: 205, mode: 'line', strength: 5000, morale: 68, cohesion: 60, ammunition: 41, craterAttacker: true },
  { id: 'ferrero-crater-division', name: "Ferrero's Division", side: 'union', type: 'infantry', x: 820, y: 230, facing: Math.PI / 2, frontage: 210, mode: 'deep', strength: 4300, morale: 78, cohesion: 70, ammunition: 42, active: false, arrivalTime: 18, craterAttacker: true, reinforcementRole: 'ferrero' },
  { id: 'union-crater-batteries', name: 'Union Siege Batteries', side: 'union', type: 'artillery', x: 1370, y: 385, facing: Math.PI / 2, frontage: 120, mode: 'line', strength: 430, morale: 76, cohesion: 74, ammunition: 36 },
  { id: 'union-forward-pickets', name: 'Union Forward Pickets', side: 'union', type: 'infantry', x: 815, y: 300, facing: Math.PI / 2, frontage: 220, mode: 'skirmish', strength: 2100, morale: 70, cohesion: 68, ammunition: 40, active: false },
  { id: 'union-siege-train-west', name: 'Western Siege Train', side: 'union', type: 'artillery', x: 330, y: 185, facing: Math.PI / 2, frontage: 105, mode: 'line', strength: 220, morale: 55, cohesion: 52, ammunition: 0, active: false, siegeObjective: true },
  { id: 'union-engineer-depot-east', name: 'Eastern Engineer Depot', side: 'union', type: 'artillery', x: 1275, y: 195, facing: Math.PI / 2, frontage: 105, mode: 'line', strength: 220, morale: 55, cohesion: 52, ammunition: 0, active: false, siegeObjective: true },
];

export const BATTLE_ENGINE_CONFIGS = {
  first_manassas: {
    id: 'first_manassas',
    world: WORLD,
    terrain: { key: 'manassas-terrain', src: 'images/battles/first-manassas-henry-hill-v1.webp', mapMode: false },
    projection: { horizon: 92, farScale: 0.58, nearScale: 1.05 },
    formations: MANASSAS_FORMATIONS,
    defaultSelection: 'jackson-brigade',
    maxTime: 105,
    unionAdvance: true,
    postures: {
      option_a: { morale: 6, cohesion: -4, fatigue: 5, reserveMode: 'deep', commanderStatus: 'front line' },
      option_b: { morale: 2, cohesion: 8, fatigue: 0, reserveMode: 'deep', commanderStatus: 'protected' },
      option_c: { morale: -7, cohesion: 4, fatigue: 0, reserveMode: 'column', commanderStatus: 'withdrawing' },
      option_d: { morale: 3, cohesion: 2, fatigue: 2, reserveMode: 'skirmish', commanderStatus: 'screening' },
    },
  },
  shiloh: {
    id: 'shiloh',
    world: WORLD,
    retreatEdges: { confederate: 'top', union: 'bottom' },
    terrain: { key: 'shiloh-terrain', src: 'images/battles/shiloh-terrain-v1.webp', mapMode: false },
    projection: { horizon: 92, farScale: 0.58, nearScale: 1.05 },
    formations: SHILOH_FORMATIONS,
    defaultSelection: 'hardee-corps',
    maxTime: 128,
    reinforcementTime: 72,
    unionAdvance: false,
    postures: {
      option_a: { morale: 9, cohesion: -5, fatigue: 5, reserveMode: 'deep', commanderStatus: 'exposed' },
      option_b: { morale: 3, cohesion: 10, fatigue: 0, reserveMode: 'deep', commanderStatus: 'protected' },
      option_c: { morale: 1, cohesion: -4, fatigue: 2, reserveMode: 'column', commanderStatus: 'distracted' },
      option_d: { morale: -3, cohesion: 5, fatigue: 0, ammunition: 6, reserveMode: 'deep', commanderStatus: 'protected' },
    },
  },
  chancellorsville: {
    id: 'chancellorsville',
    world: CHANCELLORSVILLE_WORLD,
    terrain: { key: 'chancellorsville-terrain', src: 'images/battles/chancellorsville-terrain-v1.webp', mapMode: false },
    projection: { horizon: 88, farScale: 0.57, nearScale: 1.06 },
    formations: CHANCELLORSVILLE_FORMATIONS,
    defaultSelection: 'lee-holding-line',
    maxTime: 112,
    unionAdvance: false,
    flankFormationIds: ['jackson-rodes', 'jackson-colston', 'ap-hill-reserve'],
    postures: {
      option_a: { morale: 7, cohesion: 2, fatigue: 3, reserveMode: 'deep', surpriseDeadline: 52 },
      option_b: { morale: 1, cohesion: 9, fatigue: 0, reserveMode: 'line', surpriseDeadline: null },
      option_c: { morale: 4, cohesion: 4, fatigue: 2, reserveMode: 'deep', surpriseDeadline: 58 },
      option_d: { morale: 5, cohesion: -5, fatigue: 5, reserveMode: 'line', surpriseDeadline: null },
    },
    choiceDeployments: {
      option_a: {
        formations: {
          'jackson-rodes': { arrivalTime: 20, arrivalMessage: "Rodes's Division has cleared the concealed march and is forming opposite Howard's flank." },
          'jackson-colston': { arrivalTime: 25, arrivalMessage: "Colston's Division has reached the turnoff behind Rodes." },
          'ap-hill-reserve': { arrivalTime: 31, arrivalMessage: "A. P. Hill's Reserve has closed the flank column." },
        },
      },
      option_b: {
        formations: {
          'jackson-rodes': { active: true, arrivalTime: null, x: 765, y: 710, facing: -Math.PI / 2, mode: 'line' },
          'jackson-colston': { active: true, arrivalTime: null, x: 530, y: 760, facing: -Math.PI / 2, mode: 'line' },
          'ap-hill-reserve': { active: true, arrivalTime: null, x: 330, y: 805, facing: -Math.PI / 2, mode: 'deep' },
        },
      },
      option_c: {
        formations: {
          'jackson-rodes': { arrivalTime: 25, arrivalMessage: "Rodes's Division has emerged while Stuart's feint still draws attention toward the fords." },
          'jackson-colston': { arrivalTime: 31, arrivalMessage: "Colston's Division is deploying behind the concealed screen." },
          'ap-hill-reserve': { arrivalTime: 38, arrivalMessage: "A. P. Hill's Reserve has reached the rear of the flank column." },
        },
      },
      option_d: {
        formations: {
          'jackson-rodes': { active: true, arrivalTime: null, x: 720, y: 660, facing: -Math.PI / 2, mode: 'line' },
          'jackson-colston': { active: true, arrivalTime: null, x: 500, y: 705, facing: -Math.PI / 2, mode: 'line' },
          'ap-hill-reserve': { active: true, arrivalTime: null, x: 285, y: 750, facing: -Math.PI / 2, mode: 'deep' },
        },
      },
    },
  },
  wilderness: {
    id: 'wilderness',
    world: WILDERNESS_WORLD,
    terrain: { key: 'wilderness-terrain', src: 'images/battles/wilderness-terrain-v1.webp', mapMode: false },
    projection: { horizon: 86, farScale: 0.58, nearScale: 1.04 },
    formations: WILDERNESS_FORMATIONS,
    defaultSelection: 'hill-heth-line',
    maxTime: 118,
    unionAdvance: true,
    longstreetFormationId: 'longstreet-first-corps',
    texasFormationId: 'texas-brigade',
    movement: {
      baseMultiplier: 0.72,
      roadBands: [
        { axis: 'y', value: 625, width: 58, multiplier: 1.12 },
        { axis: 'x', value: 910, width: 48, multiplier: 1.06 },
      ],
    },
    postures: {
      option_a: { morale: 4, cohesion: -8, fatigue: 8, reserveMode: 'column', commanderStatus: 'pressing the front' },
      option_b: { morale: 5, cohesion: 6, fatigue: 1, reserveMode: 'deep', commanderStatus: 'held by the Texans' },
      option_c: { morale: 10, cohesion: -9, fatigue: 7, reserveMode: 'column', commanderStatus: 'riding into the line' },
      option_d: { morale: -5, cohesion: 5, fatigue: 1, reserveMode: 'column', commanderStatus: 'directing withdrawal' },
    },
    choiceDeployments: {
      option_a: {
        formations: {
          'texas-brigade': { arrivalTime: 18, arrivalMessage: 'The Texas Brigade has reached the Orange Plank Road and is moving to restore the broken front.' },
          'longstreet-first-corps': { arrivalTime: 27, arrivalMessage: "Longstreet's First Corps has reached the field after the premature counterstroke." },
        },
      },
      option_b: {
        formations: {
          'texas-brigade': { arrivalTime: 10, arrivalMessage: "The Texas Brigade has arrived, checked Lee's impulse to charge, and is forming to steady Hill's line." },
          'longstreet-first-corps': { arrivalTime: 18, arrivalMessage: "Longstreet's First Corps has reached the Orange Plank Road; the organized counterstroke can begin." },
        },
      },
      option_c: {
        formations: {
          'texas-brigade': { arrivalTime: 14, arrivalMessage: 'The Texans have reached Lee and are trying to pull him behind their line.' },
          'longstreet-first-corps': { arrivalTime: 23, arrivalMessage: "Longstreet's First Corps has arrived after Lee exposed himself at the front." },
        },
      },
      option_d: {
        formations: {
          'hill-wilcox-line': { y: 710, mode: 'column' },
          'hill-heth-line': { y: 735, mode: 'column' },
          'ewell-wilderness-line': { y: 690, mode: 'line' },
          'texas-brigade': { arrivalTime: 12, activationOrder: 'hold', arrivalMessage: 'The Texas Brigade has reached the withdrawal line and is covering the Brock Road approaches.' },
          'longstreet-first-corps': { arrivalTime: 20, activationOrder: 'hold', arrivalMessage: "Longstreet's First Corps has arrived to cover the army's withdrawal." },
        },
      },
    },
  },
  third_winchester: {
    id: 'third_winchester',
    world: THIRD_WINCHESTER_WORLD,
    terrain: { key: 'third-winchester-terrain', src: 'images/battles/third-winchester-terrain-v1.webp', mapMode: false },
    projection: { horizon: 82, farScale: 0.55, nearScale: 1.06 },
    formations: THIRD_WINCHESTER_FORMATIONS,
    defaultSelection: 'ramseur-winchester',
    maxTime: 142,
    unionAdvance: true,
    crookFormationIds: ['duval-crook-winchester', 'thoburn-crook-winchester'],
    rearguardFormationIds: ['gordon-winchester', 'wharton-winchester'],
    middleField: { left: 350, right: 1250, top: 430, bottom: 670 },
    rearguardSector: { left: 900, right: 1400, top: 480, bottom: 780 },
    withdrawalCorridor: { left: 180, right: 620, top: 810 },
    middleFieldHoldRequired: 18,
    rearguardHoldRequired: 8,
    cavalryPressureTime: 88,
    movement: {
      baseMultiplier: 0.9,
      roadBands: [{ axis: 'x', value: 400, width: 95, multiplier: 1.08 }],
    },
    postures: {
      option_a: { morale: 5, cohesion: -9, fatigue: 5, reserveMode: 'line', commanderStatus: 'counterattacking across Middle Field' },
      option_b: { morale: 2, cohesion: 7, fatigue: 0, reserveMode: 'line', commanderStatus: 'holding a defended withdrawal line' },
      option_c: { morale: 0, cohesion: 0, fatigue: 1, reserveMode: 'line', commanderStatus: 'holding while political dispatches circulate' },
      option_d: { morale: 1, cohesion: 6, fatigue: 1, reserveMode: 'line', commanderStatus: 'screening the Winchester withdrawal' },
    },
    choiceDeployments: {
      option_a: { formations: { 'ramseur-winchester': { y: 510 }, 'rodes-winchester': { y: 525 }, 'gordon-winchester': { y: 490 } } },
      option_b: { formations: {} },
      option_c: { formations: {} },
      option_d: { formations: { 'ramseur-winchester': { x: 400, y: 665, mode: 'column' }, 'rodes-winchester': { x: 670, y: 690, mode: 'column' } } },
    },
  },
  cedar_creek: {
    id: 'cedar_creek',
    world: CEDAR_CREEK_WORLD,
    terrain: { key: 'cedar-creek-terrain', src: 'images/battles/cedar-creek-terrain-v1.webp', mapMode: false },
    projection: { horizon: 82, farScale: 0.55, nearScale: 1.06 },
    formations: CEDAR_CREEK_FORMATIONS,
    defaultSelection: 'gordon-division',
    maxTime: 126,
    unionAdvance: false,
    sheridanFormationId: 'sheridan-rally-line',
    surpriseFormationIds: ['gordon-division', 'ramseur-division', 'kershaw-division', 'wharton-division'],
    movement: {
      baseMultiplier: 0.9,
      roadBands: [
        { axis: 'x', value: 760, width: 62, multiplier: 1.12 },
        { axis: 'y', value: 585, width: 48, multiplier: 1.04 },
      ],
    },
    postures: {
      option_a: { morale: 8, cohesion: 7, fatigue: 2, reserveMode: 'deep', surpriseDeadline: 35, commanderStatus: 'pressing beyond Belle Grove' },
      option_b: { morale: 4, cohesion: -5, fatigue: 4, reserveMode: 'deep', surpriseDeadline: 35, commanderStatus: 'halted among the camps' },
      option_c: { morale: 2, cohesion: 9, fatigue: 1, reserveMode: 'column', surpriseDeadline: 38, commanderStatus: 'directing withdrawal' },
      option_d: { morale: 1, cohesion: 11, fatigue: 1, reserveMode: 'line', surpriseDeadline: 38, commanderStatus: 'holding the Valley Pike' },
    },
    choiceDeployments: {
      option_a: {
        formations: {
          'sheridan-rally-line': { arrivalTime: 68, arrivalMessage: "Sheridan has reached the field and is reforming the fugitives north of Middletown." },
        },
      },
      option_b: {
        formations: {
          'sheridan-rally-line': { arrivalTime: 54, arrivalMessage: "Sheridan has returned while Early's advance is stalled among the captured camps." },
        },
      },
      option_c: {
        formations: {
          'gordon-division': { y: 590, mode: 'column' },
          'ramseur-division': { y: 625, mode: 'column' },
          'kershaw-division': { y: 610, mode: 'column' },
          'wharton-division': { y: 650, mode: 'column' },
          'sheridan-rally-line': { arrivalTime: 58, arrivalMessage: "Sheridan is organizing pursuit as Early's captured wagons move back toward Cedar Creek." },
        },
      },
      option_d: {
        formations: {
          'gordon-division': { y: 620, mode: 'line' },
          'ramseur-division': { y: 655, mode: 'line' },
          'kershaw-division': { y: 640, mode: 'line' },
          'wharton-division': { y: 690, mode: 'deep' },
          'sheridan-rally-line': { arrivalTime: 56, arrivalMessage: "Sheridan has returned and is driving his reformed line toward Middletown and the Valley Pike." },
        },
      },
    },
  },
  gettysburg: {
    id: 'gettysburg',
    world: GETTYSBURG_WORLD,
    terrain: { key: 'gettysburg-terrain', src: 'images/battles/gettysburg-terrain-v1.webp', mapMode: false },
    projection: { horizon: 80, farScale: 0.54, nearScale: 1.05 },
    formations: GETTYSBURG_FORMATIONS,
    defaultSelection: 'pickett-division',
    maxTime: 118,
    unionAdvance: false,
    chargeFormationIds: ['pickett-division', 'pettigrew-division', 'trimble-division'],
    unionCenterIds: ['gibbon-center', 'hays-center', 'webb-angle', 'cushing-battery'],
    movement: {
      baseMultiplier: 0.96,
      roadBands: [{ axis: 'y', value: 520, width: 34, multiplier: 0.88 }],
    },
    postures: {
      option_a: { morale: 7, cohesion: -5, fatigue: 4, reserveMode: 'deep', assaultDeadline: 64, commanderStatus: 'committed to the center' },
      option_b: { morale: 1, cohesion: 10, fatigue: 0, reserveMode: 'column', assaultDeadline: null, commanderStatus: 'repositioning south' },
      option_c: { morale: -4, cohesion: 13, fatigue: 0, reserveMode: 'column', assaultDeadline: null, commanderStatus: 'directing retreat' },
      option_d: { morale: 2, cohesion: 6, fatigue: 2, reserveMode: 'deep', assaultDeadline: null, commanderStatus: 'covering the withdrawal' },
    },
    choiceDeployments: {
      option_b: { formations: { 'pickett-division': { y: 750, mode: 'column' }, 'pettigrew-division': { y: 770, mode: 'column' }, 'trimble-division': { y: 805, mode: 'column' } } },
      option_c: { formations: { 'pickett-division': { y: 770, mode: 'column' }, 'pettigrew-division': { y: 790, mode: 'column' }, 'trimble-division': { y: 820, mode: 'column' }, 'wilcox-support': { y: 835, mode: 'column' } } },
      option_d: { formations: { 'pickett-division': { y: 745, mode: 'line' }, 'pettigrew-division': { y: 765, mode: 'line' }, 'trimble-division': { y: 800, mode: 'deep' }, 'wilcox-support': { y: 690, mode: 'line' } } },
    },
  },
  gettysburg_jackson: {
    id: 'gettysburg_jackson',
    world: GETTYSBURG_WORLD,
    terrain: { key: 'gettysburg-jackson-terrain', src: 'images/battles/gettysburg-terrain-v1.webp', mapMode: false },
    projection: { horizon: 80, farScale: 0.54, nearScale: 1.05 },
    formations: GETTYSBURG_JACKSON_FORMATIONS,
    defaultSelection: 'jackson-rodes-gettysburg',
    maxTime: 122,
    unionAdvance: false,
    surpriseFormationIds: ['jackson-rodes-gettysburg', 'jackson-early-gettysburg', 'jackson-johnson-gettysburg'],
    unionCenterIds: ['howard-cemetery-hill', 'slocum-culps-hill', 'cemetery-hill-batteries'],
    hancockFormationId: 'hancock-arrival-gettysburg',
    postures: {
      option_a: { morale: 9, cohesion: 5, fatigue: 3, reserveMode: 'deep', surpriseDeadline: 46, commanderStatus: 'driving for the heights' },
      option_b: { morale: 5, cohesion: 11, fatigue: 1, reserveMode: 'deep', surpriseDeadline: 62, commanderStatus: 'coordinating both wings' },
      option_c: { morale: 2, cohesion: 7, fatigue: 2, reserveMode: 'column', surpriseDeadline: 58, commanderStatus: 'turning the Baltimore Pike' },
      option_d: { morale: 5, cohesion: 3, fatigue: 4, reserveMode: 'column', surpriseDeadline: 68, commanderStatus: 'on the wide turning movement' },
    },
    choiceDeployments: {
      option_a: { formations: { 'longstreet-wing-gettysburg': { arrivalTime: 40, arrivalMessage: "Longstreet's wing is closing while Jackson attacks the heights." }, 'hancock-arrival-gettysburg': { arrivalTime: 58, arrivalMessage: "Hancock has reached Cemetery Hill and is restoring the Union line." } } },
      option_b: { formations: { 'longstreet-wing-gettysburg': { arrivalTime: 24, arrivalMessage: "Longstreet's wing has aligned with Jackson for the coordinated envelopment." }, 'hancock-arrival-gettysburg': { arrivalTime: 64, arrivalMessage: "Hancock has reached the threatened Union center." } } },
      option_c: { formations: { 'jackson-rodes-gettysburg': { x: 1360, y: 610, mode: 'column' }, 'jackson-early-gettysburg': { x: 1510, y: 700, mode: 'column' }, 'longstreet-wing-gettysburg': { arrivalTime: 38, arrivalMessage: "Longstreet is fixing the Union left while Jackson threatens the Baltimore Pike." }, 'hancock-arrival-gettysburg': { arrivalTime: 60, arrivalMessage: "Hancock has reached the rear of the Union fishhook." } } },
      option_d: { formations: { 'jackson-rodes-gettysburg': { x: 1440, y: 650, mode: 'column' }, 'jackson-early-gettysburg': { x: 1540, y: 760, mode: 'column' }, 'jackson-johnson-gettysburg': { x: 1500, y: 840, mode: 'column' }, 'longstreet-wing-gettysburg': { arrivalTime: 45, arrivalMessage: "Longstreet is maintaining pressure while Jackson's turning column moves wide." }, 'hancock-arrival-gettysburg': { arrivalTime: 66, arrivalMessage: "Hancock has reached the threatened roads south of Gettysburg." } } },
    },
  },
  chickamauga: {
    id: 'chickamauga',
    world: CHICKAMAUGA_WORLD,
    terrain: { key: 'chickamauga-terrain', src: 'images/battles/chickamauga-terrain-v1.webp', mapMode: false },
    projection: { horizon: 84, farScale: 0.55, nearScale: 1.06 },
    formations: CHICKAMAUGA_FORMATIONS,
    defaultSelection: 'bushrod-johnson-column',
    maxTime: 126,
    unionAdvance: false,
    longstreetFormationIds: ['bushrod-johnson-column', 'hindman-chickamauga', 'kershaw-chickamauga'],
    gapTargetIds: ['wood-division-gap', 'davis-division-gap', 'sheridan-division-gap'],
    thomasFormationId: 'horseshoe-ridge-line',
    movement: {
      baseMultiplier: 0.79,
      roadBands: [{ axis: 'x', value: 760, width: 68, multiplier: 1.1 }],
    },
    postures: {
      option_a: { morale: 5, cohesion: -8, fatigue: 5, reserveMode: 'line', gapOpenTime: null, gapDeadline: null, commanderStatus: 'feeding attacks through the woods' },
      option_b: { morale: 8, cohesion: 9, fatigue: 1, reserveMode: 'deep', gapOpenTime: 14, gapDeadline: 54, commanderStatus: 'concentrating Longstreet at Brotherton Farm' },
      option_c: { morale: -3, cohesion: -5, fatigue: 2, reserveMode: 'column', gapOpenTime: 24, gapDeadline: 43, commanderStatus: 'awaiting direction from Richmond' },
      option_d: { morale: 2, cohesion: 4, fatigue: 2, reserveMode: 'deep', gapOpenTime: 17, gapDeadline: 48, commanderStatus: 'covering the rail-cutting cavalry' },
    },
    choiceDeployments: {
      option_a: { formations: { 'bushrod-johnson-column': { x: 610, mode: 'line' }, 'hindman-chickamauga': { x: 900, mode: 'line' }, 'kershaw-chickamauga': { x: 1210, mode: 'line' }, 'horseshoe-ridge-line': { arrivalTime: 54 } } },
      option_b: { formations: { 'bushrod-johnson-column': { x: 700, mode: 'column' }, 'hindman-chickamauga': { x: 890, mode: 'column' }, 'kershaw-chickamauga': { x: 1080, mode: 'deep' }, 'horseshoe-ridge-line': { arrivalTime: 62 } } },
      option_c: { formations: { 'bushrod-johnson-column': { active: false, arrivalTime: 25, arrivalMessage: "Bushrod Johnson's Division is finally moving from the delayed conference toward Brotherton Farm." }, 'hindman-chickamauga': { active: false, arrivalTime: 30, arrivalMessage: "Hindman's Division has received the attack order after the Union center has begun to recover." }, 'kershaw-chickamauga': { active: false, arrivalTime: 34, arrivalMessage: "Kershaw's Division is reaching the field behind the delayed column." }, 'horseshoe-ridge-line': { arrivalTime: 51 } } },
      option_d: { formations: { 'breckinridge-chickamauga': { strength: 4200 }, 'preston-chickamauga': { active: false, arrivalTime: 28, arrivalMessage: "Preston's reserve has reached Longstreet after cavalry detachments reduced the available field force." }, 'horseshoe-ridge-line': { arrivalTime: 57 } } },
    },
  },
  cold_harbor: {
    id: 'cold_harbor',
    world: COLD_HARBOR_WORLD,
    terrain: { key: 'cold-harbor-terrain', src: 'images/battles/cold-harbor-terrain-v1.webp', mapMode: false },
    projection: { horizon: 88, farScale: 0.55, nearScale: 1.06 },
    formations: COLD_HARBOR_FORMATIONS,
    defaultSelection: 'hoke-cold-harbor',
    maxTime: 112,
    unionAdvance: false,
    assaultFormationIds: ['hancock-second-corps-cold-harbor', 'wright-sixth-corps-cold-harbor', 'smith-eighteenth-corps-cold-harbor', 'burnside-ninth-corps-cold-harbor', 'warren-fifth-corps-cold-harbor'],
    transferFormationIds: ['breckinridge-cold-harbor', 'hill-reserve-cold-harbor'],
    postures: {
      option_a: { morale: 8, cohesion: -9, fatigue: 5, reserveMode: 'line', assaultStartTime: 10, entrenchmentState: 'abandoned', commanderStatus: 'counterattacking beyond the works' },
      option_b: { morale: 6, cohesion: 10, fatigue: 0, reserveMode: 'deep', assaultStartTime: 12, entrenchmentState: 'prepared', commanderStatus: 'holding the interlocking works' },
      option_c: { morale: 3, cohesion: 7, fatigue: 1, reserveMode: 'deep', assaultStartTime: 11, entrenchmentState: 'prepared', commanderStatus: 'holding while dispatches leave Richmond' },
      option_d: { morale: 2, cohesion: 8, fatigue: 1, reserveMode: 'column', assaultStartTime: 12, entrenchmentState: 'screening', transferDeadline: 54, commanderStatus: 'screening the Petersburg pivot' },
    },
    choiceDeployments: {
      option_a: { formations: { 'kershaw-cold-harbor': { y: 570, entrenchDefender: false }, 'hoke-cold-harbor': { y: 555, entrenchDefender: false }, 'field-cold-harbor': { y: 570, entrenchDefender: false }, 'breckinridge-cold-harbor': { y: 590, entrenchDefender: false }, 'hill-reserve-cold-harbor': { y: 710, mode: 'line' } } },
      option_b: { formations: {} },
      option_c: { formations: { 'hill-reserve-cold-harbor': { strength: 5500 } } },
      option_d: { formations: { 'breckinridge-cold-harbor': { y: 725, mode: 'column', entrenchDefender: false }, 'hill-reserve-cold-harbor': { y: 785, mode: 'column' } } },
    },
    movement: {
      baseMultiplier: 0.9,
      roadBands: [{ axis: 'x', value: 1360, width: 76, multiplier: 1.15 }],
    },
  },
  petersburg: {
    id: 'petersburg',
    world: PETERSBURG_WORLD,
    terrain: { key: 'petersburg-crater-terrain', src: 'images/battles/petersburg-crater-terrain-v1.webp', mapMode: false },
    projection: { horizon: 86, farScale: 0.54, nearScale: 1.08 },
    formations: PETERSBURG_FORMATIONS,
    defaultSelection: 'bushrod-johnson-line',
    maxTime: 118,
    unionAdvance: false,
    craterAttackerIds: ['ledlie-crater-division', 'potter-crater-division', 'wilcox-crater-division', 'ferrero-crater-division'],
    mahoneFormationIds: ['mahone-virginia-brigade', 'mahone-alabama-brigade'],
    sortieFormationIds: ['mahone-virginia-brigade', 'mahone-alabama-brigade'],
    siegeObjectiveIds: ['union-siege-train-west', 'union-engineer-depot-east'],
    postures: {
      option_a: { morale: 9, cohesion: 7, fatigue: 2, reserveMode: 'column', assaultStartTime: 4, mahoneArrivalTime: 11, craterDeadline: 48, craterPosture: 'counterattack', commanderStatus: 'sending Mahone through the covered way' },
      option_b: { morale: 2, cohesion: 10, fatigue: 0, reserveMode: 'deep', assaultStartTime: 5, mahoneArrivalTime: 24, craterDeadline: 68, craterPosture: 'containment', commanderStatus: 'holding the secondary works' },
      option_c: { morale: 5, cohesion: 5, fatigue: 3, reserveMode: 'column', sortieDeadline: 54, craterPosture: 'night-sortie', commanderStatus: 'leading the night sortie' },
      option_d: { morale: 3, cohesion: 8, fatigue: 1, reserveMode: 'deep', assaultStartTime: 5, mahoneArrivalTime: 19, craterDeadline: 62, craterPosture: 'mine-channel', mineState: 'armed', commanderStatus: 'channeling the assault into the marked lanes' },
    },
    choiceDeployments: {
      option_a: {
        formations: {
          'mahone-virginia-brigade': { arrivalTime: 11, arrivalMessage: "Mahone's Virginia Brigade has come through the covered way and is forming for the counterattack." },
          'mahone-alabama-brigade': { arrivalTime: 15, arrivalMessage: "Mahone's Alabama Brigade is closing behind the first counterattack line." },
        },
      },
      option_b: {
        formations: {
          'bushrod-johnson-line': { y: 725, mode: 'line' },
          'gracie-petersburg-line': { y: 725, mode: 'line' },
          'mahone-virginia-brigade': { arrivalTime: 24, y: 785, mode: 'deep', arrivalMessage: "Mahone's first brigade has reached the secondary line as a controlled reserve." },
          'mahone-alabama-brigade': { arrivalTime: 29, y: 820, mode: 'deep', arrivalMessage: "Mahone's second brigade has reached the reserve works." },
        },
      },
      option_c: {
        formations: {
          'elliott-salient-survivors': { active: false },
          'bushrod-johnson-line': { active: false },
          'gracie-petersburg-line': { active: false },
          'ransom-petersburg-reserve': { active: false },
          'petersburg-confederate-batteries': { active: false },
          'mahone-virginia-brigade': { active: true, arrivalTime: null, x: 650, y: 735, mode: 'column', sortieFormation: true },
          'mahone-alabama-brigade': { active: true, arrivalTime: null, x: 1000, y: 760, mode: 'column', sortieFormation: true },
          'ledlie-crater-division': { active: false },
          'potter-crater-division': { active: false },
          'wilcox-crater-division': { active: false },
          'ferrero-crater-division': { active: false, arrivalTime: null },
          'union-crater-batteries': { active: false },
          'union-forward-pickets': { active: false },
          'union-siege-train-west': { active: true },
          'union-engineer-depot-east': { active: true },
        },
      },
      option_d: {
        formations: {
          'ledlie-crater-division': { y: 370 },
          'potter-crater-division': { y: 315 },
          'wilcox-crater-division': { y: 325 },
          'mahone-virginia-brigade': { arrivalTime: 19, y: 790, mode: 'deep', arrivalMessage: "Mahone's reserve has reached the marked defensive lanes behind the crater." },
          'mahone-alabama-brigade': { arrivalTime: 24, y: 825, mode: 'deep', arrivalMessage: "Mahone's second brigade has reached the mine-channel reserve." },
        },
      },
    },
    movement: {
      baseMultiplier: 0.82,
      roadBands: [
        { axis: 'x', value: 930, width: 68, multiplier: 1.16 },
        { axis: 'y', value: 735, width: 48, multiplier: 1.08 },
      ],
    },
  },
};

export function getBattleEngineConfig(scenarioId) {
  const config = BATTLE_ENGINE_CONFIGS[scenarioId];
  if (!config) throw new Error(`Unsupported Civil War battle: ${scenarioId}`);
  return config;
}
