import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { landmarksFor, segmentHitsLandmark, formationLandmarkBlocker, landmarkMoveClear, landmarkClearance } from '../src/battle/historicalLandmarks.js';
import { gettysburgLineOfFire, resolveGettysburgVolley } from '../src/battle/gettysburgMechanics.js';
import { closeCombatPairs } from '../src/battle/closeCombat.js';
import { fieldArrivalClear } from '../src/battle/fieldBattleMechanics.js';
import { previewGroupOrder, confirmGroupOrder } from '../src/battle/groupOrders.js';
import { createFreshCampaignState, createCampaignSnapshot, restoreCampaignFromSnapshot, getCampaignSnapshotCompatibility } from '../src/game/campaignStorage.js';
const ids = ['first_manassas', 'third_winchester', 'cedar_creek'];
const make = (id = 'first_manassas', version = 8, choice = 'option_b') => new CivilWarBattleEngine(id, { rulesVersion: 2, battleRulesVersion: version, metrics: { militaryStrength: 85, munitions: 80, foodSupply: 78, treasury: 75, publicMorale: 80 } }, choice);
function isolated(id, type = 'infantry', version = 8) {
  const e = make(id, version, type === 'artillery' && id === 'first_manassas' ? 'option_a' : 'option_b'), u = e.state.find(u => u.side === 'confederate' && u.type === type);
  // Exercise the real movement loop without unrelated enemy decisions or mission deadlines.
  e.updateFieldCommand = () => {}; e.activateReinforcements = () => {}; e.updateFieldMission = () => false;
  e.config = { ...e.config, maxTime: 1000 }; e.state.forEach(v => { v.active = v.id === u.id; v.arrivalTime = null; });
  return { e, u, site: landmarksFor(id, 8)[0] };
}
test('new archives retain rules 8; version 11 preserves rules 7 and rejects future semantics', () => {
  const scene = { id: 'first', title: 'First', turn: 1, choices: [{ id: 'a', text: 'A' }] };
  const save = createCampaignSnapshot(createFreshCampaignState(1, scene.id, { battleRulesVersion: 8 }), scene);
  assert.equal(save.version, 22); assert.equal(restoreCampaignFromSnapshot(save, [scene]).state.battleRulesVersion, 8);
  save.version = 11; assert.equal(getCampaignSnapshotCompatibility(save).ok, false);
  save.state.battleRulesVersion = 7; const restored = restoreCampaignFromSnapshot(save, [scene]);
  assert.equal(restored.state.battleRulesVersion, 7); assert.equal(restored.migratedFromVersion, 11);
  assert.equal(make('first_manassas', restored.state.battleRulesVersion).fieldBattle.landmarks, undefined);
});
test('all first-batch deployments and scheduled arrivals start clear for every opening and doctrine', () => {
  for (const id of ids) for (const choice of ['option_a','option_b','option_c','option_d']) for (const enemyDoctrine of ['reserve','flank','depth']) {
    const e = new CivilWarBattleEngine(id, { rulesVersion: 2, battleRulesVersion: 8, enemyDoctrine }, choice);
    assert.equal(e.fieldBattle.landmarks.length, 1);
    for (const u of e.state) assert.equal(formationLandmarkBlocker(e.fieldBattle, u), undefined, `${id}/${choice}/${enemyDoctrine}/${u.id}`);
    const s = e.snapshot(); s.fieldBattle.landmarks[0].x = -100; assert.notEqual(e.fieldBattle.landmarks[0].x, -100);
  }
  assert.deepEqual(landmarksFor('petersburg', 8), []); assert.deepEqual(landmarksFor('first_manassas', 7), []);
});
test('line segments block roofs and edges but leave shots beside the house clear', () => {
  const site = { x: 100, y: 100, width: 40, height: 20 };
  assert.equal(segmentHitsLandmark({x:0,y:100},{x:200,y:100},site), true);
  assert.equal(segmentHitsLandmark({x:100,y:0},{x:100,y:200},site), true);
  assert.equal(segmentHitsLandmark({x:0,y:90},{x:200,y:90},site), true);
  assert.equal(segmentHitsLandmark({x:0,y:89},{x:200,y:89},site), false);
  assert.equal(segmentHitsLandmark({x:0,y:0},{x:200,y:200},site), true);
  assert.equal(segmentHitsLandmark({x:0,y:0},{x:0,y:0},site), false);
});
for (const id of ids) for (const type of ['infantry', 'artillery']) test(`${id}: ${type} crosses the field by routing around the house`, () => {
  const {e,u,site} = isolated(id,type); const margin = site.width / 2 + landmarkClearance(u) + 65;
  Object.assign(u, { x: site.x-margin, y: site.y, facing: 0 });
  const target = { x: Math.min(e.world.width-70,site.x+margin), y: site.y };
  assert.equal(e.move(u.id, target), true); let detour = 0;
  for (let i=0;i<2500 && (u.pendingCommand || u.order !== 'hold');i++) {
    const previous={...u};e.tick(.05);
    assert.equal(landmarkMoveClear(e.fieldBattle,previous,u),true,'swept movement cannot tunnel');
    assert.equal(formationLandmarkBlocker(e.fieldBattle,u),undefined);
    detour = Math.max(detour,Math.abs(u.y-site.y));
  }
  assert.ok(Math.hypot(u.x-target.x,u.y-target.y)<3, `Failed to arrive: ${u.x},${u.y}; ${u.order}; ${u.pressureReason}`);
  assert.ok(detour > site.height/2,'the route visibly goes around');
  if(type==='artillery') { for(let i=0;i<110;i++)e.tick(.05);assert.equal(u.gunState,'deployed');assert.equal(formationLandmarkBlocker(e.fieldBattle,u),undefined); }
});
test('blocked destinations reject single and group orders before changing any courier', () => {
  const e=make(), site=e.fieldBattle.landmarks[0], units=e.state.filter(u=>u.side==='confederate'&&u.active);
  const before=structuredClone(e.state);assert.equal(e.move(units[0].id,site),false);assert.deepEqual(e.state,before);
  const request={ids:units.slice(0,2).map(u=>u.id),order:'move',layout:'line',point:{x:site.x+80,y:site.y}};
  const plan=previewGroupOrder(e.snapshot(),request,e.world);assert.match(plan.error,/Henry House/);
  assert.ok(confirmGroupOrder(e,plan).error);assert.deepEqual(e.state,before);
});
test('a formation cannot widen into a building and reinforcements cannot appear inside it', () => {
  const {e,u,site}=isolated('first_manassas');Object.assign(u,{formationMode:'column',x:site.x-site.width/2-landmarkClearance({formationMode:'column'})-3,y:site.y});
  assert.equal(formationLandmarkBlocker(e.fieldBattle,u),undefined);const cohesion=u.cohesion;
  assert.equal(e.setFormation(u.id,'line'),false);assert.equal(u.formationMode,'column');assert.equal(u.cohesion,cohesion);assert.match(u.pressureReason,/Henry House/);
  Object.assign(u,{x:site.x,y:site.y});assert.equal(fieldArrivalClear(e,u),false);
});
test('both armies lose direct fire through buildings, and melee cannot cross a footprint', () => {
  const e=make(),site=e.fieldBattle.landmarks[0],a=e.state.find(u=>u.side==='confederate'),b=e.state.find(u=>u.side==='union');
  e.state=[a,b];Object.assign(a,{x:site.x,y:site.y+site.height/2+25,facing:-Math.PI/2});Object.assign(b,{x:site.x,y:site.y-site.height/2-25,facing:Math.PI/2});
  assert.equal(gettysburgLineOfFire(e,a,b),false);assert.equal(gettysburgLineOfFire(e,b,a),false);
  const before=structuredClone(e.state);resolveGettysburgVolley(e,a,b);resolveGettysburgVolley(e,b,a);assert.deepEqual(e.state,before);assert.deepEqual(closeCombatPairs(e),[]);
  a.x=b.x=site.x+site.width/2+10;assert.equal(gettysburgLineOfFire(e,a,b),true);
});
test('queued movement retains sufficient room when a wider formation is requested', () => {
  const {e,u,site}=isolated('first_manassas');u.formationMode='column';
  Object.assign(u,{x:300,y:site.y});
  const point={x:site.x-site.width/2-landmarkClearance(u)-3,y:site.y};
  assert.equal(e.move(u.id,point),true);const pending=structuredClone(u.pendingCommand);
  assert.equal(e.setFormation(u.id,'skirmish'),false);assert.equal(u.formationMode,'column');
  assert.deepEqual(u.pendingCommand,pending);assert.match(u.pressureReason,/destination/);
});
test('building routes are deterministic at 1x and 4x display stepping', () => {
  const a=isolated('cedar_creek'),b=isolated('cedar_creek');
  for(const f of [a,b]){Object.assign(f.u,{x:400,y:f.site.y});f.e.move(f.u.id,{x:900,y:f.site.y});}
  for(let i=0;i<800;i++)a.e.tick(.05);for(let i=0;i<200;i++)b.e.tick(.2);
  assert.deepEqual(a.e.state,b.e.state);assert.deepEqual(a.e.events,b.e.events);
});
test('selected landmark art ships as full original RGBA PNG assets', () => {
  for(const id of ids){const site=landmarksFor(id,8)[0],png=readFileSync(new URL(`../public/${site.src}`,import.meta.url));assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png[25],6);assert.ok(png.readUInt32BE(16)>=1024);assert.ok(png.length>100000);}
});
