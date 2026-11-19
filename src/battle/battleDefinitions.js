const WORLD = { width: 1500, height: 900 };
const MISSIONARY_RIDGE_WORLD = { width: 1600, height: 900 };
const SPOTSYLVANIA_WORLD = { width: 1600, height: 900 };
const KENNESAW_WORLD = { width: 1600, height: 900 };
const VICKSBURG_WORLD = { width: 1600, height: 900 };
const SAILORS_CREEK_WORLD = { width: 1600, height: 900 };
const NEW_MARKET_WORLD = { width: 1600, height: 900 };
const GAINES_MILL_WORLD = { width: 1600, height: 900 };
const FREDERICKSBURG_WORLD = { width: 1600, height: 900 };
const ANTIETAM_WORLD = { width: 1650, height: 900 };
const FIVE_FORKS_WORLD = { width: 1600, height: 880 };
const JONESBOROUGH_WORLD = { width: 1600, height: 880 };
const SECOND_MANASSAS_WORLD = { width: 1600, height: 900 };
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

// Across this rotated and compressed field, the historical left, center
// and right appear left to right. Formations represent local detachments.
const ANTIETAM_FORMATIONS = [
  { id: 'antietam-lawton', name: "Lawton's line", side: 'confederate', type: 'infantry', x: 420, y: 505, facing: -Math.PI / 2, frontage: 165, mode: 'line', strength: 2900, morale: 79, cohesion: 77, ammunition: 47 },
  { id: 'antietam-hill', name: "D. H. Hill's division", side: 'confederate', type: 'infantry', x: 715, y: 560, facing: -Math.PI / 2, frontage: 170, mode: 'line', strength: 4200, morale: 85, cohesion: 83, ammunition: 48 },
  { id: 'antietam-anderson', name: "R. H. Anderson's division", side: 'confederate', type: 'infantry', x: 935, y: 590, facing: -Math.PI / 2, frontage: 165, mode: 'line', strength: 3200, morale: 81, cohesion: 78, ammunition: 46 },
  { id: 'antietam-toombs', name: "Toombs's bridge defenders", side: 'confederate', type: 'infantry', x: 1385, y: 558, facing: -Math.PI / 2, frontage: 125, mode: 'line', strength: 1800, morale: 80, cohesion: 76, ammunition: 42 },
  { id: 'antietam-hood', name: "Hood's division", side: 'confederate', type: 'infantry', x: 300, y: 690, facing: -Math.PI / 2, frontage: 155, mode: 'line', strength: 3200, morale: 86, cohesion: 81, ammunition: 42, reserve: true },
  { id: 'antietam-light-division', name: "A. P. Hill's Light Division", side: 'confederate', type: 'infantry', x: 1255, y: 743, facing: -Math.PI / 2, frontage: 150, mode: 'column', strength: 3300, morale: 86, cohesion: 81, ammunition: 46, active: false, arrivalTime: 46, reserve: true, arrivalMessage: "A. P. Hill's Light Division has arrived from Harpers Ferry on the Confederate right." },
  { id: 'antietam-confederate-artillery', name: 'Confederate field batteries', side: 'confederate', type: 'artillery', x: 786, y: 692, facing: -Math.PI / 2, frontage: 100, mode: 'line', strength: 260, morale: 81, cohesion: 80, ammunition: 44 },
  { id: 'antietam-hooker', name: "Hooker's I Corps", side: 'union', type: 'infantry', x: 423, y: 213, facing: Math.PI / 2, frontage: 170, mode: 'line', strength: 3800, morale: 75, cohesion: 71, ammunition: 45 },
  { id: 'antietam-mansfield', name: "Mansfield's XII Corps", side: 'union', type: 'infantry', x: 277, y: 110, facing: Math.PI / 2, frontage: 150, mode: 'line', strength: 3200, morale: 73, cohesion: 70, ammunition: 44, active: false, arrivalTime: 13, arrivalMessage: "Mansfield's XII Corps enters behind the Cornfield attack." },
  { id: 'antietam-french', name: "French's II Corps division", side: 'union', type: 'infantry', x: 690, y: 266, facing: Math.PI / 2, frontage: 165, mode: 'line', strength: 4400, morale: 75, cohesion: 70, ammunition: 45, active: false, arrivalTime: 21, arrivalMessage: "French's division opens the attack toward the Sunken Road." },
  { id: 'antietam-richardson', name: "Richardson's II Corps division", side: 'union', type: 'infantry', x: 978, y: 182, facing: Math.PI / 2, frontage: 160, mode: 'line', strength: 4100, morale: 76, cohesion: 71, ammunition: 45, active: false, arrivalTime: 32, arrivalMessage: "Richardson's division follows French toward the Confederate center." },
  { id: 'antietam-burnside', name: "Burnside's IX Corps", side: 'union', type: 'infantry', x: 1325, y: 293, facing: Math.PI / 2, frontage: 165, mode: 'line', strength: 4200, morale: 74, cohesion: 71, ammunition: 45, active: false, arrivalTime: 38, arrivalMessage: "Burnside's IX Corps moves on the Lower Bridge." },
  { id: 'antietam-union-artillery', name: 'Union field batteries', side: 'union', type: 'artillery', x: 834, y: 99, facing: Math.PI / 2, frontage: 95, mode: 'line', strength: 250, morale: 72, cohesion: 68, ammunition: 38 },
];

// North-up compression of White Oak Road and the Ford's Road approach.
// Formations represent parts of the historical commands, with authored strengths.
const FIVE_FORKS_FORMATIONS = [
  { id: 'five-forks-steuart', name: "Steuart's brigade", side: 'confederate', type: 'infantry', x: 825, y: 411, facing: Math.PI / 2, frontage: 140, mode: 'line', strength: 1260, morale: 82, cohesion: 81, ammunition: 45 },
  { id: 'five-forks-ransom', name: "Ransom's brigade", side: 'confederate', type: 'infantry', x: 1100, y: 418, facing: .23, frontage: 128, mode: 'line', strength: 1200, morale: 80, cohesion: 79, ammunition: 44 },
  { id: 'five-forks-wallace', name: "Wallace's brigade", side: 'confederate', type: 'infantry', x: 955, y: 346, facing: .66, frontage: 118, mode: 'line', strength: 1120, morale: 82, cohesion: 82, ammunition: 43 },
  { id: 'five-forks-corse', name: "Corse's brigade", side: 'confederate', type: 'infantry', x: 590, y: 416, facing: Math.PI / 2, frontage: 135, mode: 'line', strength: 1300, morale: 84, cohesion: 80, ammunition: 44 },
  { id: 'five-forks-fitz-lee', name: "Fitzhugh Lee's dismounted troopers", side: 'confederate', type: 'infantry', x: 711, y: 293, facing: .72, frontage: 110, mode: 'line', strength: 970, morale: 85, cohesion: 85, ammunition: 44, reserve: true },
  { id: 'five-forks-guns', name: "Pegram's batteries", side: 'confederate', type: 'artillery', x: 714, y: 400, facing: Math.PI / 2, frontage: 96, mode: 'line', strength: 185, morale: 82, cohesion: 79, ammunition: 38 },
  { id: 'five-forks-devin', name: "Devin's dismounted division", side: 'union', type: 'infantry', x: 787, y: 687, facing: -Math.PI / 2, frontage: 148, mode: 'line', strength: 1600, morale: 74, cohesion: 72, ammunition: 46 },
  { id: 'five-forks-custer', name: "Custer's dismounted division", side: 'union', type: 'infantry', x: 394, y: 754, facing: -1.15, frontage: 145, mode: 'line', strength: 1560, morale: 73, cohesion: 70, ammunition: 42, active: false, arrivalTime: 12, arrivalMessage: "Custer's dismounted troops enter from the south-west." },
  { id: 'five-forks-ayres', name: "Ayres's V Corps division", side: 'union', type: 'infantry', x: 1412, y: 490, facing: Math.PI, frontage: 152, mode: 'line', strength: 2050, morale: 76, cohesion: 74, ammunition: 45, active: false, arrivalTime: 11, arrivalMessage: "Ayres's V Corps division advances on the exposed Angle." },
  { id: 'five-forks-crawford', name: "Crawford's V Corps division", side: 'union', type: 'infantry', x: 1410, y: 218, facing: Math.PI, frontage: 145, mode: 'line', strength: 1840, morale: 75, cohesion: 73, ammunition: 44, active: false, arrivalTime: 16, arrivalMessage: "Crawford's V Corps division presses toward Ford's Road from the east." },
  { id: 'five-forks-griffin', name: "Griffin's V Corps division", side: 'union', type: 'infantry', x: 1460, y: 392, facing: Math.PI, frontage: 145, mode: 'line', strength: 1860, morale: 73, cohesion: 73, ammunition: 44, active: false, arrivalTime: 25, arrivalMessage: "Griffin joins the pressure on the Confederate left." },
];

// The September 1 front, compressed around Hardee's salient and the railroad.
// Unit locations, strengths and timing are tuned for play.
const JONESBOROUGH_FORMATIONS = [
  { id: 'jonesborough-govan', name: 'Govan’s brigade', side: 'confederate', type: 'infantry', x: 780, y: 517, facing: -Math.PI / 2, frontage: 136, mode: 'line', strength: 1330, morale: 84, cohesion: 81, ammunition: 48 },
  { id: 'jonesborough-granbury', name: 'Granbury’s brigade', side: 'confederate', type: 'infantry', x: 1090, y: 512, facing: -Math.PI / 2, frontage: 127, mode: 'line', strength: 1280, morale: 86, cohesion: 83, ammunition: 48 },
  { id: 'jonesborough-lowrey', name: 'Lowrey’s brigade', side: 'confederate', type: 'infantry', x: 856, y: 609, facing: -Math.PI / 2, frontage: 132, mode: 'line', strength: 1250, morale: 79, cohesion: 76, ammunition: 43 },
  { id: 'jonesborough-carter', name: 'Carter’s supporting line', side: 'confederate', type: 'infantry', x: 655, y: 468, facing: -2.5, frontage: 137, mode: 'line', strength: 1510, morale: 79, cohesion: 74, ammunition: 40 },
  { id: 'jonesborough-battery', name: 'Hardee’s field battery', side: 'confederate', type: 'artillery', x: 952, y: 602, facing: -Math.PI / 2, frontage: 78, mode: 'line', strength: 250, morale: 80, cohesion: 78, ammunition: 43 },
  { id: 'jonesborough-morgan', name: 'Morgan’s XIV Corps line', side: 'union', type: 'infantry', x: 899, y: 399, facing: Math.PI / 2, frontage: 120, mode: 'line', strength: 950, morale: 66, cohesion: 66, ammunition: 44 },
  { id: 'jonesborough-carlin', name: 'Carlin’s XIV Corps line', side: 'union', type: 'infantry', x: 546, y: 302, facing: .9, frontage: 158, mode: 'line', strength: 1520, morale: 78, cohesion: 72, ammunition: 43 },
  { id: 'jonesborough-baird', name: 'Baird’s XIV Corps line', side: 'union', type: 'infantry', x: 487, y: 301, facing: .8, frontage: 143, mode: 'column', strength: 1350, morale: 77, cohesion: 73, ammunition: 44, active: false, arrivalTime: 13, arrivalMessage: 'Baird’s line joins the XIV Corps pressure west of the railroad.' },
  { id: 'jonesborough-stanley', name: 'Stanley’s IV Corps advance', side: 'union', type: 'infantry', x: 1040, y: 171, facing: Math.PI / 2, frontage: 152, mode: 'column', strength: 2380, morale: 83, cohesion: 79, ammunition: 48, active: false, arrivalTime: 25, arrivalMessage: 'Stanley’s IV Corps advance appears along the railroad from the north.' },
  { id: 'jonesborough-union-guns', name: 'Union field battery', side: 'union', type: 'artillery', x: 749, y: 208, facing: 1.2, frontage: 80, mode: 'line', strength: 260, morale: 73, cohesion: 70, ammunition: 43 },
];

// Representative formations from the final afternoon. Gameplay compresses
// the two fronts, their strengths, and the interval between attacks.
const SECOND_MANASSAS_FORMATIONS = [
  { id: 'second-manassas-starke', name: 'Starke’s Deep Cut line', side: 'confederate', type: 'infantry', x: 524, y: 267, facing: 0, frontage: 144, mode: 'line', strength: 1830, morale: 82, cohesion: 78, ammunition: 46 },
  { id: 'second-manassas-lawton', name: 'Lawton’s support', side: 'confederate', type: 'infantry', x: 562, y: 344, facing: 0, frontage: 145, mode: 'line', strength: 1700, morale: 84, cohesion: 81, ammunition: 44 },
  { id: 'second-manassas-hood', name: 'Hood’s Texas Brigade', side: 'confederate', type: 'infantry', x: 820, y: 611, facing: 0, frontage: 140, mode: 'line', strength: 1760, morale: 86, cohesion: 82, ammunition: 46 },
  { id: 'second-manassas-kemper', name: 'Kemper’s supporting line', side: 'confederate', type: 'infantry', x: 818, y: 748, facing: -.2, frontage: 137, mode: 'line', strength: 1680, morale: 84, cohesion: 79, ammunition: 45 },
  { id: 'second-manassas-battery', name: 'Stephen D. Lee’s artillery', side: 'confederate', type: 'artillery', x: 494, y: 529, facing: -.35, frontage: 80, mode: 'line', strength: 235, morale: 83, cohesion: 81, ammunition: 40 },
  { id: 'second-manassas-porter', name: 'Porter’s Deep Cut assault', side: 'union', type: 'infantry', x: 758, y: 320, facing: Math.PI, frontage: 145, mode: 'line', strength: 1570, morale: 72, cohesion: 71, ammunition: 44 },
  { id: 'second-manassas-mclean', name: 'McLean’s Ohio brigade', side: 'union', type: 'infantry', x: 1090, y: 628, facing: Math.PI, frontage: 126, mode: 'line', strength: 1170, morale: 72, cohesion: 71, ammunition: 44 },
  { id: 'second-manassas-warren', name: 'Warren’s Groveton line', side: 'union', type: 'infantry', x: 907, y: 466, facing: Math.PI, frontage: 121, mode: 'line', strength: 1430, morale: 76, cohesion: 74, ammunition: 46 },
  { id: 'second-manassas-maine', name: '5th Maine Battery', side: 'union', type: 'artillery', x: 1220, y: 622, facing: Math.PI, frontage: 78, mode: 'line', strength: 195, morale: 74, cohesion: 70, ammunition: 35, active: false, arrivalTime: 24, arrivalMessage: 'The 5th Maine Battery reaches the approaches to Chinn Ridge.' },
  { id: 'second-manassas-reynolds', name: 'Pennsylvania Reserves', side: 'union', type: 'infantry', x: 1343, y: 676, facing: Math.PI, frontage: 139, mode: 'column', strength: 1400, morale: 77, cohesion: 74, ammunition: 42, active: false, arrivalTime: 29, arrivalMessage: 'The Pennsylvania Reserves cover the approach from Henry Hill.' },
];

// December 13 compressed into two connected sectors. Names represent the
// formations involved in each fight, not a literal order of battle.
const FREDERICKSBURG_FORMATIONS = [
  { id: 'fredericksburg-cobb', name: 'Cobb’s stone-wall line', side: 'confederate', type: 'infantry', x: 584, y: 220, facing: 0, frontage: 106, mode: 'line', strength: 1510, morale: 82, cohesion: 78, ammunition: 50 },
  { id: 'fredericksburg-kershaw', name: 'Kershaw’s supporting line', side: 'confederate', type: 'infantry', x: 572, y: 305, facing: 0, frontage: 103, mode: 'line', strength: 1530, morale: 83, cohesion: 81, ammunition: 48 },
  { id: 'fredericksburg-walton', name: 'Walton’s Washington Artillery', side: 'confederate', type: 'artillery', x: 366, y: 322, facing: 0, frontage: 72, mode: 'line', strength: 188, morale: 82, cohesion: 78, ammunition: 37 },
  { id: 'fredericksburg-gregg', name: 'Gregg’s South Carolinians', side: 'confederate', type: 'infantry', x: 515, y: 586, facing: 0, frontage: 107, mode: 'line', strength: 1340, morale: 78, cohesion: 78, ammunition: 44 },
  { id: 'fredericksburg-lane', name: 'Lane’s North Carolinians', side: 'confederate', type: 'infantry', x: 531, y: 710, facing: 0, frontage: 115, mode: 'line', strength: 1410, morale: 81, cohesion: 76, ammunition: 44 },
  { id: 'fredericksburg-early', name: 'Early’s reserve', side: 'confederate', type: 'infantry', x: 385, y: 521, facing: 0, frontage: 110, mode: 'line', strength: 1690, morale: 84, cohesion: 82, ammunition: 47, reserve: true },
  { id: 'fredericksburg-french', name: 'French’s assault line', side: 'union', type: 'infantry', x: 785, y: 267, facing: Math.PI, frontage: 128, mode: 'line', strength: 1740, morale: 74, cohesion: 72, ammunition: 44 },
  { id: 'fredericksburg-hancock', name: 'Hancock’s supporting division', side: 'union', type: 'infantry', x: 853, y: 214, facing: Math.PI, frontage: 117, mode: 'line', strength: 1440, morale: 74, cohesion: 71, ammunition: 43, active: false, arrivalTime: 8, arrivalMessage: 'Hancock’s Union infantry follows French toward the Sunken Road.' },
  { id: 'fredericksburg-humphreys', name: 'Humphreys’s assault line', side: 'union', type: 'infantry', x: 885, y: 332, facing: Math.PI, frontage: 112, mode: 'line', strength: 1400, morale: 73, cohesion: 70, ammunition: 41, active: false, arrivalTime: 18, arrivalMessage: 'Humphreys’s line arrives for another assault on Marye’s Heights.' },
  { id: 'fredericksburg-meade', name: 'Meade’s Pennsylvania Reserves', side: 'union', type: 'infantry', x: 773, y: 650, facing: Math.PI, frontage: 119, mode: 'line', strength: 1540, morale: 76, cohesion: 74, ammunition: 46 },
  { id: 'fredericksburg-gibbon', name: 'Gibbon’s supporting infantry', side: 'union', type: 'infantry', x: 843, y: 745, facing: Math.PI, frontage: 109, mode: 'line', strength: 1290, morale: 74, cohesion: 71, ammunition: 42, active: false, arrivalTime: 10, arrivalMessage: 'Gibbon’s infantry arrives on the southern approach.' },
  { id: 'fredericksburg-union-guns', name: 'Union artillery on the plain', side: 'union', type: 'artillery', x: 889, y: 544, facing: Math.PI, frontage: 76, mode: 'line', strength: 188, morale: 75, cohesion: 72, ammunition: 33 },
];

// Compressed formations for the tactical board. Their strengths and timing
// are tuned for play and do not represent a literal order of battle.
const GAINES_MILL_FORMATIONS = [
  { id: 'gaines-mill-hood', name: 'Hood’s Texas Brigade', side: 'confederate', type: 'infantry', x: 714, y: 564, facing: -Math.PI / 2, frontage: 110, mode: 'line', strength: 1660, morale: 83, cohesion: 81, ammunition: 46 },
  { id: 'gaines-mill-law', name: 'Law’s supporting brigade', side: 'confederate', type: 'infantry', x: 883, y: 566, facing: -Math.PI / 2, frontage: 109, mode: 'line', strength: 1540, morale: 82, cohesion: 80, ammunition: 46 },
  { id: 'gaines-mill-hill', name: 'A. P. Hill’s supporting line', side: 'confederate', type: 'infantry', x: 514, y: 627, facing: -Math.PI / 2, frontage: 115, mode: 'line', strength: 1380, morale: 74, cohesion: 74, ammunition: 39 },
  { id: 'gaines-mill-battery', name: 'Confederate field battery', side: 'confederate', type: 'artillery', x: 697, y: 679, facing: -Math.PI / 2, frontage: 65, mode: 'line', strength: 168, morale: 82, cohesion: 77, ammunition: 32 },
  { id: 'gaines-mill-morell', name: 'Morell’s ridge line', side: 'union', type: 'infantry', x: 812, y: 318, facing: Math.PI / 2, frontage: 117, mode: 'line', strength: 1350, morale: 70, cohesion: 73, ammunition: 40 },
  { id: 'gaines-mill-sykes', name: 'Sykes’s regulars', side: 'union', type: 'infantry', x: 491, y: 312, facing: Math.PI / 2, frontage: 105, mode: 'line', strength: 1210, morale: 74, cohesion: 74, ammunition: 42 },
  { id: 'gaines-mill-guns', name: 'Porter’s plateau battery', side: 'union', type: 'artillery', x: 1121, y: 287, facing: Math.PI / 2, frontage: 72, mode: 'line', strength: 176, morale: 76, cohesion: 72, ammunition: 33 },
  { id: 'gaines-mill-slocum', name: 'Slocum’s supporting infantry', side: 'union', type: 'infantry', x: 1068, y: 183, facing: Math.PI / 2, frontage: 110, mode: 'line', strength: 1080, morale: 75, cohesion: 72, ammunition: 34, active: false, arrivalTime: 17, arrivalMessage: 'Slocum’s infantry arrives behind Porter’s ridge.' },
];

// Representative groups for the farm and pike actions. Strengths, distances
// and reinforcement timings are playable abstractions.
const NEW_MARKET_FORMATIONS = [
  { id: 'new-market-wharton', name: 'Wharton’s brigade', side: 'confederate', type: 'infantry', x: 435, y: 575, facing: -Math.PI / 2, frontage: 114, mode: 'line', strength: 1830, morale: 84, cohesion: 83, ammunition: 44 },
  { id: 'new-market-echols', name: 'Echols’s brigade', side: 'confederate', type: 'infantry', x: 886, y: 566, facing: -Math.PI / 2, frontage: 116, mode: 'line', strength: 1650, morale: 82, cohesion: 81, ammunition: 44 },
  { id: 'new-market-cadets', name: 'VMI Cadet Battalion', side: 'confederate', type: 'infantry', x: 674, y: 659, facing: -Math.PI / 2, frontage: 68, mode: 'line', strength: 265, morale: 82, cohesion: 82, ammunition: 36, reserve: true },
  { id: 'new-market-battery', name: 'McLaughlin’s field battery', side: 'confederate', type: 'artillery', x: 945, y: 676, facing: -Math.PI / 2, frontage: 68, mode: 'line', strength: 148, morale: 77, cohesion: 76, ammunition: 33 },
  { id: 'new-market-thoburn', name: 'Thoburn’s Union infantry', side: 'union', type: 'infantry', x: 648, y: 315, facing: Math.PI / 2, frontage: 112, mode: 'line', strength: 1360, morale: 72, cohesion: 75, ammunition: 41 },
  { id: 'new-market-moor', name: 'Moor’s Union infantry', side: 'union', type: 'infantry', x: 1110, y: 311, facing: Math.PI / 2, frontage: 108, mode: 'line', strength: 1320, morale: 74, cohesion: 72, ammunition: 39 },
  { id: 'new-market-carlin', name: 'Carlin’s Union battery', side: 'union', type: 'artillery', x: 522, y: 214, facing: Math.PI / 2, frontage: 70, mode: 'line', strength: 151, morale: 73, cohesion: 71, ammunition: 31 },
  { id: 'new-market-union-reserve', name: 'Sigel’s supporting infantry', side: 'union', type: 'infantry', x: 1128, y: 197, facing: Math.PI / 2, frontage: 104, mode: 'line', strength: 1050, morale: 73, cohesion: 74, ammunition: 37, active: false, arrivalTime: 17, activationOrder: 'hold', arrivalMessage: 'Supporting Union infantry arrives behind the Pike line.' },
];

// The center formations represent portions of the historical divisions.
const MISSIONARY_RIDGE_FORMATIONS = [
  { id: 'missionary-ridge-anderson', name: 'Anderson’s crest infantry', side: 'confederate', type: 'infantry', x: 1002, y: 300, facing: Math.PI, frontage: 140, mode: 'line', strength: 1780, morale: 85, cohesion: 86, ammunition: 44 },
  { id: 'missionary-ridge-bate', name: 'Bate’s supporting infantry', side: 'confederate', type: 'infantry', x: 1124, y: 465, facing: Math.PI, frontage: 134, mode: 'line', strength: 1640, morale: 83, cohesion: 84, ammunition: 42 },
  { id: 'missionary-ridge-rearguard', name: 'Army rearguard', side: 'confederate', type: 'infantry', x: 1220, y: 634, facing: Math.PI, frontage: 118, mode: 'line', strength: 1260, morale: 83, cohesion: 85, ammunition: 40, reserve: true },
  { id: 'missionary-ridge-battery', name: 'Confederate crest battery', side: 'confederate', type: 'artillery', x: 1010, y: 578, facing: Math.PI, frontage: 74, mode: 'line', strength: 146, morale: 82, cohesion: 83, ammunition: 32 },
  { id: 'missionary-ridge-wood', name: 'Wood’s Union infantry', side: 'union', type: 'infantry', x: 571, y: 314, facing: 0, frontage: 137, mode: 'line', strength: 1540, morale: 76, cohesion: 74, ammunition: 42 },
  { id: 'missionary-ridge-sheridan', name: 'Sheridan’s Union infantry', side: 'union', type: 'infantry', x: 592, y: 492, facing: 0, frontage: 145, mode: 'line', strength: 1640, morale: 76, cohesion: 73, ammunition: 42 },
  { id: 'missionary-ridge-baird', name: 'Baird’s supporting infantry', side: 'union', type: 'infantry', x: 650, y: 186, facing: 0, frontage: 124, mode: 'line', strength: 1230, morale: 75, cohesion: 74, ammunition: 39, active: false, arrivalTime: 12, activationOrder: 'hold', arrivalMessage: 'Baird’s supporting infantry appears north of the first wave.' },
  { id: 'missionary-ridge-union-battery', name: 'Union field battery', side: 'union', type: 'artillery', x: 328, y: 438, facing: 0, frontage: 75, mode: 'line', strength: 158, morale: 77, cohesion: 80, ammunition: 35 },
];

// These formations represent parts of the historical commands. The board
// compresses several hours of fighting onto two local objectives.
const SPOTSYLVANIA_FORMATIONS = [
  { id: 'spotsylvania-gordon', name: 'Gordon’s infantry', side: 'confederate', type: 'infantry', x: 707, y: 622, facing: -Math.PI / 2, frontage: 122, mode: 'line', strength: 1685, morale: 86, cohesion: 83, ammunition: 45 },
  { id: 'spotsylvania-ramseur', name: 'Ramseur’s infantry', side: 'confederate', type: 'infantry', x: 1012, y: 600, facing: -Math.PI / 2, frontage: 124, mode: 'line', strength: 1580, morale: 84, cohesion: 83, ammunition: 43 },
  { id: 'spotsylvania-reserve', name: 'Interior reserve infantry', side: 'confederate', type: 'infantry', x: 733, y: 743, facing: -Math.PI / 2, frontage: 116, mode: 'line', strength: 1200, morale: 85, cohesion: 84, ammunition: 41, reserve: true },
  { id: 'spotsylvania-battery', name: 'Confederate field battery', side: 'confederate', type: 'artillery', x: 937, y: 743, facing: -Math.PI / 2, frontage: 70, mode: 'line', strength: 148, morale: 80, cohesion: 81, ammunition: 34 },
  { id: 'spotsylvania-barlow', name: 'Barlow’s Union infantry', side: 'union', type: 'infantry', x: 759, y: 224, facing: Math.PI / 2, frontage: 130, mode: 'line', strength: 1680, morale: 77, cohesion: 73, ammunition: 40 },
  { id: 'spotsylvania-birney', name: 'Birney’s Union infantry', side: 'union', type: 'infantry', x: 588, y: 360, facing: Math.PI / 2, frontage: 124, mode: 'line', strength: 1330, morale: 75, cohesion: 72, ammunition: 40 },
  { id: 'spotsylvania-wright', name: 'Wright’s supporting infantry', side: 'union', type: 'infantry', x: 456, y: 250, facing: Math.PI / 2, frontage: 124, mode: 'line', strength: 1280, morale: 78, cohesion: 74, ammunition: 39, active: false, arrivalTime: 13, activationOrder: 'hold', arrivalMessage: 'Wright’s supporting infantry arrives on the western approach.' },
  { id: 'spotsylvania-union-battery', name: 'Union field battery', side: 'union', type: 'artillery', x: 343, y: 213, facing: Math.PI / 2, frontage: 68, mode: 'line', strength: 147, morale: 75, cohesion: 73, ammunition: 31 },
];

const KENNESAW_FORMATIONS = [
  { id: 'kennesaw-maney', name: 'Maney’s infantry', side: 'confederate', type: 'infantry', x: 718, y: 424, facing: -Math.PI / 2, frontage: 125, mode: 'line', strength: 1520, morale: 87, cohesion: 86, ammunition: 46 },
  { id: 'kennesaw-vaughan', name: 'Vaughan’s infantry', side: 'confederate', type: 'infantry', x: 1025, y: 466, facing: -Math.PI / 2, frontage: 115, mode: 'line', strength: 1440, morale: 86, cohesion: 85, ammunition: 44 },
  { id: 'kennesaw-reserve', name: 'Hill reserve infantry', side: 'confederate', type: 'infantry', x: 1030, y: 695, facing: -Math.PI / 2, frontage: 100, mode: 'line', strength: 990, morale: 84, cohesion: 86, ammunition: 39, reserve: true },
  { id: 'kennesaw-mebane', name: 'Mebane’s battery', side: 'confederate', type: 'artillery', x: 973, y: 560, facing: -Math.PI / 2, frontage: 68, mode: 'line', strength: 145, morale: 83, cohesion: 84, ammunition: 33 },
  { id: 'kennesaw-mccook', name: 'McCook’s Union infantry', side: 'union', type: 'infantry', x: 640, y: 171, facing: Math.PI / 2, frontage: 120, mode: 'line', strength: 1490, morale: 77, cohesion: 75, ammunition: 36 },
  { id: 'kennesaw-harker', name: 'Harker’s Union infantry', side: 'union', type: 'infantry', x: 849, y: 144, facing: Math.PI / 2, frontage: 119, mode: 'line', strength: 1370, morale: 77, cohesion: 75, ammunition: 36 },
  { id: 'kennesaw-mitchell', name: 'Mitchell’s supporting infantry', side: 'union', type: 'infantry', x: 516, y: 238, facing: Math.PI / 2, frontage: 102, mode: 'line', strength: 1210, morale: 77, cohesion: 74, ammunition: 34, active: false, arrivalTime: 15, activationOrder: 'hold', arrivalMessage: 'Mitchell’s infantry arrives on the upper approach.' },
  { id: 'kennesaw-union-battery', name: 'Union field battery', side: 'union', type: 'artillery', x: 466, y: 169, facing: Math.PI / 2, frontage: 68, mode: 'line', strength: 138, morale: 76, cohesion: 74, ammunition: 24 },
];

const VICKSBURG_FORMATIONS = [
  { id: 'vicksburg-alabama', name: '30th Alabama infantry', side: 'confederate', type: 'infantry', x: 721, y: 518, facing: 0, frontage: 94, mode: 'line', strength: 1050, morale: 80, cohesion: 80, ammunition: 38 },
  { id: 'vicksburg-waul', name: 'Waul’s Texas Legion', side: 'confederate', type: 'infantry', x: 528, y: 369, facing: 0, frontage: 100, mode: 'line', strength: 1110, morale: 86, cohesion: 85, ammunition: 39, reserve: true },
  { id: 'vicksburg-battery', name: 'Confederate field guns', side: 'confederate', type: 'artillery', x: 612, y: 587, facing: 0, frontage: 67, mode: 'line', strength: 130, morale: 82, cohesion: 84, ammunition: 30 },
  { id: 'vicksburg-griffith', name: 'Griffith’s 22nd Iowa detachment', side: 'union', type: 'infantry', x: 874, y: 498, facing: Math.PI, frontage: 50, mode: 'column', strength: 132, morale: 40, cohesion: 34, ammunition: 20 },
  { id: 'vicksburg-iowa', name: 'Federal Iowa infantry', side: 'union', type: 'infantry', x: 1202, y: 546, facing: Math.PI, frontage: 109, mode: 'line', strength: 1035, morale: 78, cohesion: 73, ammunition: 34 },
  { id: 'vicksburg-carr', name: 'Carr’s supporting infantry', side: 'union', type: 'infantry', x: 1136, y: 264, facing: Math.PI, frontage: 109, mode: 'line', strength: 975, morale: 77, cohesion: 73, ammunition: 34, active: false, arrivalTime: 11, activationOrder: 'hold', arrivalMessage: 'Carr’s supporting infantry appears on the eastern approach.' },
  { id: 'vicksburg-union-battery', name: 'Federal field guns', side: 'union', type: 'artillery', x: 1164, y: 452, facing: Math.PI, frontage: 65, mode: 'line', strength: 138, morale: 75, cohesion: 73, ammunition: 29 },
];

const SAILORS_CREEK_FORMATIONS = [
  { id: 'sailors-lee', name: 'Custis Lee’s infantry', side: 'confederate', type: 'infantry', x: 707, y: 521, facing: -Math.PI / 2, frontage: 118, mode: 'line', strength: 1480, morale: 79, cohesion: 81, ammunition: 42 },
  { id: 'sailors-kershaw', name: 'Kershaw’s infantry', side: 'confederate', type: 'infantry', x: 1036, y: 573, facing: -Math.PI / 2, frontage: 116, mode: 'line', strength: 1530, morale: 82, cohesion: 81, ammunition: 42, reserve: true },
  { id: 'sailors-escort', name: 'Casualty escort infantry', side: 'confederate', type: 'infantry', x: 1318, y: 719, facing: -Math.PI / 2, frontage: 90, mode: 'line', strength: 610, morale: 82, cohesion: 84, ammunition: 32 },
  { id: 'sailors-wheaton', name: 'Wheaton’s VI Corps infantry', side: 'union', type: 'infantry', x: 698, y: 222, facing: Math.PI / 2, frontage: 129, mode: 'line', strength: 1730, morale: 81, cohesion: 80, ammunition: 40 },
  { id: 'sailors-seymour', name: 'Seymour’s VI Corps infantry', side: 'union', type: 'infantry', x: 918, y: 241, facing: Math.PI / 2, frontage: 117, mode: 'line', strength: 1460, morale: 81, cohesion: 79, ammunition: 38 },
  { id: 'sailors-keifer', name: 'Keifer’s supporting infantry', side: 'union', type: 'infantry', x: 479, y: 216, facing: Math.PI / 2, frontage: 104, mode: 'line', strength: 1020, morale: 79, cohesion: 77, ammunition: 35, active: false, arrivalTime: 10, activationOrder: 'hold', arrivalMessage: 'Keifer’s supporting line reaches the western creek approach.' },
  { id: 'sailors-union-guns', name: 'VI Corps field battery', side: 'union', type: 'artillery', x: 1000, y: 127, facing: Math.PI / 2, frontage: 69, mode: 'line', strength: 142, morale: 78, cohesion: 80, ammunition: 26 },
];

export const BATTLE_ENGINE_CONFIGS = {
  sailors_creek: {
    id: 'sailors_creek',
    world: SAILORS_CREEK_WORLD,
    terrain: { key: 'sailors-creek-pasture', src: 'images/battles/realistic-v2/pasture.png', mapMode: false },
    projection: { horizon: 80, farScale: .58, nearScale: 1.08 },
    formations: SAILORS_CREEK_FORMATIONS,
    defaultSelection: 'sailors-kershaw',
    maxTime: 91,
    unionAdvance: false,
    retreatEdges: { confederate: 'west', union: 'top' },
    postures: {
      option_a: { morale: 3, cohesion: 4, fatigue: 3, reserveMode: 'line', commanderStatus: 'forming an aid screen' },
      option_b: { morale: 3, cohesion: 5, fatigue: 2, reserveMode: 'line', commanderStatus: 'covering the westward withdrawal' },
    },
    choiceDeployments: {
      option_b: { formations: {
        'sailors-lee': { x: 679, y: 664 },
        'sailors-kershaw': { x: 879, y: 543 },
        'sailors-escort': { x: 710, y: 753 },
      } },
    },
  },
  vicksburg: {
    id: 'vicksburg',
    world: VICKSBURG_WORLD,
    terrain: { key: 'vicksburg-pasture', src: 'images/battles/realistic-v2/pasture.png', mapMode: false },
    projection: { horizon: 80, farScale: .58, nearScale: 1.08 },
    formations: VICKSBURG_FORMATIONS,
    defaultSelection: 'vicksburg-waul',
    maxTime: 64,
    unionAdvance: false,
    retreatEdges: { confederate: 'west', union: 'east' },
    postures: {
      option_a: { morale: 3, cohesion: 4, fatigue: 3, reserveMode: 'line', commanderStatus: 'recovering the redoubt' },
      option_b: { morale: 3, cohesion: 5, fatigue: 2, reserveMode: 'line', commanderStatus: 'covering the interior line' },
    },
    choiceDeployments: {
      option_b: { formations: {
        'vicksburg-waul': { x: 340, y: 470 },
      } },
    },
  },
  kennesaw_mountain: {
    id: 'kennesaw_mountain',
    world: KENNESAW_WORLD,
    terrain: { key: 'kennesaw-pasture', src: 'images/battles/realistic-v2/pasture.png', mapMode: false },
    projection: { horizon: 80, farScale: .58, nearScale: 1.08 },
    formations: KENNESAW_FORMATIONS,
    defaultSelection: 'kennesaw-vaughan',
    maxTime: 78,
    unionAdvance: false,
    postures: {
      option_a: { morale: 3, cohesion: 4, fatigue: 2, reserveMode: 'line', commanderStatus: 'supporting the Dead Angle' },
      option_b: { morale: 3, cohesion: 5, fatigue: 2, reserveMode: 'line', commanderStatus: 'covering the southern road' },
    },
    choiceDeployments: {
      option_b: { formations: {
        'kennesaw-vaughan': { x: 865, y: 460 },
        'kennesaw-mebane': { x: 1022, y: 590 },
      } },
    },
  },
  spotsylvania: {
    id: 'spotsylvania',
    world: SPOTSYLVANIA_WORLD,
    terrain: { key: 'spotsylvania-pasture', src: 'images/battles/realistic-v2/pasture.png', mapMode: false },
    projection: { horizon: 80, farScale: .58, nearScale: 1.08 },
    formations: SPOTSYLVANIA_FORMATIONS,
    defaultSelection: 'spotsylvania-ramseur',
    maxTime: 60,
    unionAdvance: false,
    postures: {
      option_a: { morale: 3, cohesion: 5, fatigue: 3, reserveMode: 'line', commanderStatus: 'preparing the second line' },
      option_b: { morale: 3, cohesion: 5, fatigue: 3, reserveMode: 'line', commanderStatus: 'supporting the local counterattack' },
    },
    choiceDeployments: {
      option_b: { formations: {
        'spotsylvania-gordon': { x: 537, y: 528 },
        'spotsylvania-ramseur': { x: 677, y: 521 },
        'spotsylvania-battery': { x: 665, y: 633 },
      } },
    },
  },
  missionary_ridge: {
    id: 'missionary_ridge',
    world: MISSIONARY_RIDGE_WORLD,
    terrain: { key: 'missionary-ridge-pasture', src: 'images/battles/realistic-v2/pasture.png', mapMode: false },
    projection: { horizon: 80, farScale: .58, nearScale: 1.08 },
    formations: MISSIONARY_RIDGE_FORMATIONS,
    defaultSelection: 'missionary-ridge-bate',
    maxTime: 68,
    unionAdvance: false,
    retreatEdges: { confederate: 'east', union: 'west' },
    postures: {
      option_a: { morale: 3, cohesion: 4, fatigue: 2, reserveMode: 'line', commanderStatus: 'supporting the center line' },
      option_b: { morale: 2, cohesion: 6, fatigue: 2, reserveMode: 'line', commanderStatus: 'covering the eastward withdrawal' },
    },
    choiceDeployments: {
      option_b: { formations: {
        'missionary-ridge-bate': { x: 1000, y: 451 },
        'missionary-ridge-rearguard': { x: 1256, y: 585 },
        'missionary-ridge-battery': { x: 1228, y: 711 },
      } },
    },
  },
  new_market: {
    id: 'new_market',
    world: NEW_MARKET_WORLD,
    terrain: { key: 'new-market-grass', src: 'images/battles/realistic-v2/pasture.png', mapMode: false },
    projection: { horizon: 80, farScale: .58, nearScale: 1.08 },
    formations: NEW_MARKET_FORMATIONS,
    defaultSelection: 'new-market-wharton',
    maxTime: 65,
    unionAdvance: false,
    postures: {
      option_a: { morale: 2, cohesion: 2, fatigue: 3, reserveMode: 'line', commanderStatus: 'supporting the farm advance' },
      option_b: { morale: 1, cohesion: 4, fatigue: 2, reserveMode: 'line', commanderStatus: 'securing the supply route' },
    },
    choiceDeployments: {
      option_b: { formations: {
        'new-market-wharton': { x: 978, y: 562 },
        'new-market-echols': { x: 1130, y: 573 },
        'new-market-cadets': { x: 849, y: 650 },
        'new-market-battery': { x: 923, y: 681 },
        'new-market-union-reserve': { arrivalTime: 8 },
      } },
    },
  },
  gaines_mill: {
    id: 'gaines_mill',
    world: GAINES_MILL_WORLD,
    terrain: { key: 'gaines-mill-grass', src: 'images/battles/realistic-v2/pasture.png', mapMode: false },
    projection: { horizon: 80, farScale: .58, nearScale: 1.08 },
    formations: GAINES_MILL_FORMATIONS,
    defaultSelection: 'gaines-mill-hood',
    maxTime: 62,
    unionAdvance: false,
    postures: {
      option_a: { morale: 2, cohesion: 3, fatigue: 3, reserveMode: 'line', commanderStatus: 'coordinating the ravine assault' },
      option_b: { morale: 0, cohesion: 4, fatigue: 2, reserveMode: 'line', commanderStatus: 'covering the crossing withdrawal' },
    },
    choiceDeployments: {
      option_b: { formations: {
        'gaines-mill-hood': { x: 512, y: 596 },
        'gaines-mill-law': { x: 650, y: 585 },
        'gaines-mill-hill': { x: 790, y: 708 },
        'gaines-mill-battery': { x: 585, y: 674 },
        'gaines-mill-sykes': { x: 544, y: 328 },
        'gaines-mill-slocum': { x: 511, y: 282, arrivalTime: 24, activationOrder: 'hold', arrivalMessage: 'Slocum’s infantry follows the probe toward the ravine.' },
      } },
    },
  },
  fredericksburg: {
    id: 'fredericksburg',
    world: FREDERICKSBURG_WORLD,
    terrain: { key: 'fredericksburg-grass', src: 'images/battles/realistic-v2/pasture.png', mapMode: false },
    projection: { horizon: 80, farScale: .58, nearScale: 1.08 },
    formations: FREDERICKSBURG_FORMATIONS,
    defaultSelection: 'fredericksburg-cobb',
    maxTime: 51,
    unionAdvance: false,
    retreatEdges: { confederate: 'west', union: 'east' },
    movement: { baseMultiplier: .97 },
    postures: {
      option_a: { morale: 2, cohesion: 3, fatigue: 3, reserveMode: 'line', commanderStatus: 'directing the heights defense' },
      option_b: { morale: 0, cohesion: 5, fatigue: 3, reserveMode: 'line', commanderStatus: 'covering the Prospect Hill gap' },
    },
    choiceDeployments: {
      option_a: { formations: { 'fredericksburg-gibbon': { arrivalTime: 24 } } },
      option_b: { formations: {
        'fredericksburg-hancock': { arrivalTime: 22 },
        'fredericksburg-humphreys': { arrivalTime: 37 },
        'fredericksburg-meade': { x: 723, y: 650 },
      } },
    },
  },
  second_manassas: {
    id: 'second_manassas',
    world: SECOND_MANASSAS_WORLD,
    terrain: { key: 'second-manassas-grass', src: 'images/battles/realistic-v2/pasture.png', mapMode: false },
    projection: { horizon: 80, farScale: .56, nearScale: 1.08 },
    formations: SECOND_MANASSAS_FORMATIONS,
    defaultSelection: 'second-manassas-starke',
    maxTime: 53,
    unionAdvance: false,
    movement: { baseMultiplier: .97 },
    postures: {
      option_a: { morale: 3, cohesion: 2, fatigue: 3, reserveMode: 'line', commanderStatus: 'coordinating the two wings' },
      option_b: { morale: 0, cohesion: 6, fatigue: 1, reserveMode: 'line', commanderStatus: 'directing the limited defense' },
    },
    choiceDeployments: {
      option_b: { formations: {
        'second-manassas-hood': { x: 687, y: 619 },
        'second-manassas-kemper': { x: 665, y: 750 },
        'second-manassas-battery': { x: 452, y: 551 },
        'second-manassas-warren': { x: 841, y: 463 },
        'second-manassas-reynolds': { arrivalTime: 22 },
      } },
    },
  },
  jonesborough: {
    id: 'jonesborough',
    world: JONESBOROUGH_WORLD,
    terrain: { key: 'jonesborough-grass', src: 'images/battles/realistic-v2/pasture.png', mapMode: false },
    projection: { horizon: 80, farScale: .56, nearScale: 1.08 },
    formations: JONESBOROUGH_FORMATIONS,
    defaultSelection: 'jonesborough-govan',
    maxTime: 49,
    unionAdvance: true,
    movement: { baseMultiplier: .96 },
    postures: {
      option_a: { morale: 2, cohesion: 3, fatigue: 4, reserveMode: 'line', commanderStatus: 'directing the rail counterattack' },
      option_b: { morale: 0, cohesion: 7, fatigue: 2, reserveMode: 'column', commanderStatus: 'organizing the Lovejoy withdrawal' },
    },
    choiceDeployments: {
      option_b: { formations: {
        'jonesborough-govan': { x: 760, y: 548 },
        'jonesborough-granbury': { x: 1069, y: 541 },
        'jonesborough-lowrey': { x: 864, y: 660, mode: 'column' },
        'jonesborough-carter': { x: 595, y: 475 },
        'jonesborough-battery': { x: 963, y: 678 },
        'jonesborough-morgan': { morale: 76, cohesion: 75 },
        'jonesborough-stanley': { arrivalTime: 17 },
      } },
    },
  },
  five_forks: {
    id: 'five_forks',
    world: FIVE_FORKS_WORLD,
    terrain: { key: 'five-forks-grass', src: 'images/battles/realistic-v2/pasture.png', mapMode: false },
    projection: { horizon: 82, farScale: .54, nearScale: 1.06 },
    formations: FIVE_FORKS_FORMATIONS,
    defaultSelection: 'five-forks-steuart',
    maxTime: 60,
    unionAdvance: true,
    retreatEdges: { confederate: 'top', union: 'bottom' },
    movement: { baseMultiplier: .96, roadBands: [{ axis: 'x', value: 780, width: 52, multiplier: 1.14 }, { axis: 'y', value: 445, width: 21, multiplier: 1.09 }] },
    postures: {
      option_a: { morale: 0, cohesion: 3, fatigue: 4, reserveMode: 'line', commanderStatus: 'holding the extended line' },
      option_b: { morale: 3, cohesion: 6, fatigue: 3, reserveMode: 'line', commanderStatus: 'directing the rearguard' },
      option_c: { morale: 1, cohesion: 7, fatigue: 1, reserveMode: 'column', commanderStatus: 'organizing the early withdrawal' },
    },
    choiceDeployments: {
      option_b: { formations: {
        'five-forks-ransom': { x: 1024, y: 377 },
        'five-forks-wallace': { x: 855, y: 284, facing: 0 },
        'five-forks-fitz-lee': { x: 702, y: 240, facing: 0 },
      } },
      option_c: { formations: {
        'five-forks-steuart': { x: 810, y: 350, mode: 'column' },
        'five-forks-ransom': { x: 980, y: 320, mode: 'column' },
        'five-forks-wallace': { x: 925, y: 250, mode: 'column' },
        'five-forks-corse': { x: 620, y: 300, mode: 'column' },
        'five-forks-fitz-lee': { x: 681, y: 212 },
        'five-forks-guns': { x: 751, y: 205 },
      } },
    },
  },
  antietam: {
    id: 'antietam',
    world: ANTIETAM_WORLD,
    terrain: { key: 'pasture', src: 'images/battles/realistic-v2/pasture.png', mapMode: false },
    projection: { horizon: 85, farScale: .54, nearScale: 1.06 },
    formations: ANTIETAM_FORMATIONS,
    defaultSelection: 'antietam-hill',
    maxTime: 92,
    unionAdvance: true,
    movement: { baseMultiplier: .94, roadBands: [{ axis: 'y', value: 740, width: 48, multiplier: 1.12 }] },
    postures: {
      option_a: { morale: 5, cohesion: 6, fatigue: 5, reserveMode: 'line', commanderStatus: 'holding the Sunken Road' },
      option_b: { morale: 1, cohesion: 6, fatigue: 4, reserveMode: 'column', commanderStatus: 'organizing withdrawal' },
      option_c: { morale: 4, cohesion: 5, fatigue: 6, reserveMode: 'line', commanderStatus: 'holding the Cornfield and the lane' },
      option_d: { morale: 4, cohesion: 4, fatigue: 7, reserveMode: 'line', commanderStatus: 'preparing the right-wing counterstroke' },
    },
    choiceDeployments: {
      option_b: { formations: {
        'antietam-lawton': { x: 352, y: 595, mode: 'column' },
        'antietam-hill': { y: 635, mode: 'column' },
        'antietam-anderson': { y: 656, mode: 'column' },
        'antietam-toombs': { y: 660, mode: 'column' },
        'antietam-light-division': { arrivalTime: 38 },
      } },
      option_c: { formations: { 'antietam-hood': { x: 322, y: 545 } } },
      option_d: { formations: { 'antietam-toombs': { x: 1380, y: 665 } } },
    },
  },
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
