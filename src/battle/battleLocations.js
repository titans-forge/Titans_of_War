import { fieldAttackPlanFor } from './fieldAttackPlans.js';
import { getBattleEngineConfig } from './battleDefinitions.js';
import { fieldExitTargets } from './fieldBattleProfiles.js';
import { landmarkField } from './historicalLandmarks.js';
import { sortieTargets } from './siegeCommand.js';

// Read-only views of authored playable coordinates, never historical map bearings
// or promises of a safe route. Old non-tactical battles expose no invented exits.
export function battleLocations(snapshot) {
  const field = landmarkField(snapshot);
  if (!field) return [];
  const config = getBattleEngineConfig(snapshot.scenarioId), world = config.world;
  const result = [];
  const add = (kind, site, name = site.name) => {
    if (!Number.isFinite(site.x) || !Number.isFinite(site.y) || site.x < 0 || site.y < 0 || site.x > world.width || site.y > world.height) return;
    result.push({ id: `${kind}:${site.id}`, kind, name, x: site.x, y: site.y,
      width: site.width || 100, height: site.height || 100 });
  };
  for (const target of sortieTargets(snapshot)) add('Objective', target);
  if (field.attackObjective) add('Objective', field.attackObjective);
  const defendedSector = field.sectors?.find(site => site.name === field.defenseObjective?.name);
  if (defendedSector) add('Objective', defendedSector, `${defendedSector.name} · defense objective`);
  for (const sector of field.sectors || []) add('Sector', sector);
  for (const site of field.landmarks || []) add('Landmark', site);
  if (['first_manassas', 'shiloh'].includes(snapshot.scenarioId) && snapshot.battleRulesVersion >= 17 && field.attackObjective) {
    for (const step of fieldAttackPlanFor(snapshot.scenarioId, snapshot.battleRulesVersion).steps) add('Plan', step, step.label);
  }
  const exits = snapshot.fieldBattle
    ? fieldExitTargets({ scenarioId: snapshot.scenarioId, config, world }, { side: 'confederate' })
    : [180, 850, 1510].map(x => ({ x, y: world.height - 18 }));
  exits.forEach((point, i) => add('Exit', { ...point, id: i, width: 90, height: 60 },
    `${config.withdrawalCorridor ? 'Winchester corridor' : 'Confederate rear'} · ${['left', 'center', 'right'][i]}`));
  return result;
}
