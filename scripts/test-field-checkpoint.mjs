import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { BATTLE_SCENARIOS } from '../src/game/battles.js';
import { createFreshCampaignState, createCampaignSnapshot, CAMPAIGN_STORAGE_KEY } from '../src/game/campaignStorage.js';
import { saveFieldCheckpoint, loadFieldCheckpoint, clearFieldCheckpoint, FIELD_CHECKPOINT_KEY } from '../src/game/fieldCheckpoint.js';
const campaign = createFreshCampaignState(1861);
const json = value => JSON.parse(JSON.stringify(value));
for (const battle of Object.values(BATTLE_SCENARIOS)) for (const choice of ['option_a','option_b','option_c','option_d']) {
 test(`${battle.id}/${choice}: checkpoint resumes deterministically through the result`, () => {
  let original = new CivilWarBattleEngine(battle.id,campaign,choice);
  let resumed = new CivilWarBattleEngine(battle.id,campaign,choice);
  for(let i=0;i<1500 && original.outcome==='undecided';i++) {
   if(i===10 || i===150) for(const e of [original,resumed]) {
    const u=e.state.find(u=>u.side==='confederate'&&u.active);
    e.order(u.id,i===10?'advance':'withdraw');
   }
   original.tick(.2); resumed.tick(.2);
   if([15,160,270,420].includes(i)) resumed=CivilWarBattleEngine.fromCheckpoint(json(resumed.checkpoint()),battle.id,campaign,choice);
   assert.deepEqual(json(resumed.snapshot({presentation:true})),json(original.snapshot({presentation:true})));
  }
  assert.notEqual(original.outcome,'undecided');
  const final=CivilWarBattleEngine.fromCheckpoint(json(original.checkpoint()),battle.id,campaign,choice);
  assert.deepEqual(final.checkpoint(),original.checkpoint());
 });
}
function fixture() {
 const map=new Map([[CAMPAIGN_STORAGE_KEY,JSON.stringify(createCampaignSnapshot(campaign,null))]]);
 const storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};
 const battle=Object.values(BATTLE_SCENARIOS)[0];
 const pending={battle,choiceId:'option_b',baseState:campaign,successModifier:0,statusNote:'',mode:'fight'};
 const engine=new CivilWarBattleEngine(battle.id,campaign,'option_b'); engine.tick(.2);
 return {storage,map,pending,engine};
}
test('field storage roundtrip and completed campaign invalidation',()=>{
 const {storage,map,pending,engine}=fixture();
 saveFieldCheckpoint(pending,engine.checkpoint(),campaign,storage);
 assert.equal(loadFieldCheckpoint(storage).pending.mode,'suspended');
 assert.deepEqual(loadFieldCheckpoint(storage).pending.checkpoint,engine.checkpoint());
 const raw=JSON.parse(map.get(CAMPAIGN_STORAGE_KEY)); raw.exportedAt='changed timestamp';map.set(CAMPAIGN_STORAGE_KEY,JSON.stringify(raw));
 assert.ok(loadFieldCheckpoint(storage).pending);
 raw.state.currentTurn++;map.set(CAMPAIGN_STORAGE_KEY,JSON.stringify(raw));
 assert.match(loadFieldCheckpoint(storage).error,/earlier campaign/);
 assert.ok(map.has(FIELD_CHECKPOINT_KEY));
 clearFieldCheckpoint(storage);assert.equal(loadFieldCheckpoint(storage).pending,null);
});
test('corrupt, future and incompatible checkpoints fail safely',()=>{
 const {storage,map,pending,engine}=fixture();
 saveFieldCheckpoint(pending,engine.checkpoint(),campaign,storage);
 const raw=map.get(FIELD_CHECKPOINT_KEY);map.set(FIELD_CHECKPOINT_KEY,raw.slice(0,-10));
 assert.ok(loadFieldCheckpoint(storage).error);assert.ok(map.has(FIELD_CHECKPOINT_KEY));
 for(const mutate of [x=>x.version=2,x=>x.state.battleRulesVersion=99,x=>x.state.state.pop(),x=>x.state.time=-1]) {
  const state=engine.checkpoint(); mutate(state);
  assert.throws(()=>CivilWarBattleEngine.fromCheckpoint(state,pending.battle.id,campaign,'option_b'));
 }
 assert.throws(()=>saveFieldCheckpoint(pending,engine.checkpoint(),campaign,{...storage,setItem(){throw new Error('Quota exceeded');}}),/Quota/);
 assert.throws(()=>saveFieldCheckpoint(pending,engine.checkpoint(),campaign,null),/unavailable/);
});
