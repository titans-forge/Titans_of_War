import { fieldAttackPlanFor } from './fieldAttackPlans.js';
import { getBattleEngineConfig } from './battleDefinitions.js';
import { fieldExitTargets } from './fieldBattleProfiles.js';
import { landmarkField } from './historicalLandmarks.js';
import { sortieTargets } from './siegeCommand.js';
import { BLANDFORD_CHURCH } from './petersburgTerrainArt.js';
import { antietamBridgeLocation } from './antietamArt.js';
import { fiveForksSites } from './fiveForksArt.js';
import { jonesboroughSites } from './jonesboroughArt.js';
import { secondManassasSites } from './secondManassasArt.js';
import { fredericksburgSites } from './fredericksburgArt.js';
import { gainesMillSites } from './gainesMillArt.js';
import { newMarketSites } from './newMarketArt.js';
import { missionaryRidgeSites } from './missionaryRidgeArt.js';
import { spotsylvaniaSites } from './spotsylvaniaArt.js';
import { kennesawSites } from './kennesawArt.js';
import { vicksburgSites } from './vicksburgArt.js';
import { sailorsSites } from './sailorsCreekArt.js';

// Read-only views of authored playable coordinates, never historical map bearings
// or promises of a safe route. Old non-tactical battles expose no invented exits.
export function battleLocations(snapshot, petersburgTerrainArt = false) {
  const field = landmarkField(snapshot);
  if (!field) return [];
  const config = getBattleEngineConfig(snapshot.scenarioId), world = config.world;
  const result = [];
  const add = (kind, site, name = site.name) => {
    if (!Number.isFinite(site.x) || !Number.isFinite(site.y) || site.x < 0 || site.y < 0 || site.x > world.width || site.y > world.height) return;
    result.push({ id: `${kind}:${site.id}`, kind, name, x: site.x, y: site.y,
      width: site.width || 100, height: site.height || 100,
      ...(site.scenic ? { scenic: true, labelOffsetY: site.labelOffsetY } : {}),
      ...(site.focusLabelOffsetX == null ? {} : { focusLabelOffsetX: site.focusLabelOffsetX }),
      ...(['five_forks', 'jonesborough', 'second_manassas', 'fredericksburg', 'gaines_mill', 'new_market', 'missionary_ridge', 'spotsylvania', 'kennesaw_mountain', 'vicksburg', 'sailors_creek'].includes(snapshot.scenarioId) && site.note
        ? { note: site.note, source: site.source } : {}) });
  };
  for (const target of sortieTargets(snapshot)) add('Objective', target);
  if (field.attackObjective) add('Objective', field.attackObjective);
  const defendedSector = field.sectors?.find(site => site.name === field.defenseObjective?.name);
  if (defendedSector) add('Objective', defendedSector, `${defendedSector.name} · defense objective`);
  for (const sector of field.sectors || []) add('Sector', sector);
  for (const site of field.landmarks || []) add('Landmark', site);
  if (snapshot.scenarioId === 'antietam') {
    const bridge = antietamBridgeLocation(field);
    if (bridge) add('Landmark', bridge);
  }
  if (snapshot.scenarioId === 'five_forks') {
    for (const site of fiveForksSites(field)) add(site.id === 'burnt-quarter' ? 'Landmark' : 'Terrain', site);
  }
  if (snapshot.scenarioId === 'jonesborough') {
    for (const site of jonesboroughSites(field)) add(site.kind, site);
  }
  if (snapshot.scenarioId === 'second_manassas') {
    for (const site of secondManassasSites(field)) add(site.kind, site);
  }
  if (snapshot.scenarioId === 'fredericksburg') {
    for (const site of fredericksburgSites(field)) add(site.kind, site);
  }
  if (snapshot.scenarioId === 'gaines_mill') {
    for (const site of gainesMillSites(field)) add(site.kind, site);
  }
  if (snapshot.scenarioId === 'new_market') {
    for (const site of newMarketSites(field)) add(site.kind, site);
  }
  if (snapshot.scenarioId === 'missionary_ridge') {
    for (const site of missionaryRidgeSites(field)) add(site.kind, site);
  }
  if (snapshot.scenarioId === 'spotsylvania') {
    for (const site of spotsylvaniaSites(field)) add(site.kind, site);
  }
  if (snapshot.scenarioId === 'kennesaw_mountain') {
    for (const site of kennesawSites(field)) add(site.kind, site);
  }
  if (snapshot.scenarioId === 'vicksburg') {
    for (const site of vicksburgSites(field)) add(site.kind, site);
  }
  if (snapshot.scenarioId === 'sailors_creek') {
    for (const site of sailorsSites(field)) add(site.kind, site);
  }
  if (petersburgTerrainArt && snapshot.scenarioId === 'petersburg') {
    add('Landmark', BLANDFORD_CHURCH);
    const basin = field.zones.find(zone => zone.kind === 'crater');
    if (basin) add('Terrain', {
      id: 'crater-basin', name: basin.name, x: (basin.left + basin.right) / 2,
      y: (basin.top + basin.bottom) / 2, width: basin.right - basin.left, height: basin.bottom - basin.top,
    });
    const works = field.zones.find(zone => zone.kind === 'earthworks' && zone.name === 'Secondary works');
    if (works) add('Terrain', {
      id: 'secondary-works', name: 'Secondary works', x: (works.left + works.right) / 2,
      y: (works.top + works.bottom) / 2, width: 300, height: works.bottom - works.top,
    });
  }
  if (['first_manassas', 'shiloh'].includes(snapshot.scenarioId) && snapshot.battleRulesVersion >= 17 && field.attackObjective) {
    for (const step of fieldAttackPlanFor(snapshot.scenarioId, snapshot.battleRulesVersion).steps) add('Plan', step, step.label);
  }
  const exits = snapshot.fieldBattle
    ? fieldExitTargets({ scenarioId: snapshot.scenarioId, config, world }, { side: 'confederate' })
    : [180, 850, 1510].map(x => ({ x, y: world.height - 18 }));
  const exitName = snapshot.scenarioId === 'five_forks' ? 'Ford’s Road'
    : snapshot.scenarioId === 'jonesborough' ? 'Lovejoy approach'
    : snapshot.scenarioId === 'missionary_ridge' ? 'Dalton approach'
      : config.withdrawalCorridor ? 'Winchester corridor' : 'Confederate rear';
  const exitLabels = snapshot.scenarioId === 'missionary_ridge' ? ['north', 'center', 'south'] : ['left', 'center', 'right'];
  exits.forEach((point, i) => add('Exit', { ...point, id: i, width: 90, height: 60 },
    `${exitName} · ${exitLabels[i]}`));
  return result;
}
