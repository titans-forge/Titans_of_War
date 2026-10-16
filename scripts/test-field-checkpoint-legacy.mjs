import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CivilWarBattleEngine } from '../src/battle/civilWarEngine.js';
import { BATTLE_SCENARIOS } from '../src/game/battles.js';
import { createFreshCampaignState } from '../src/game/campaignStorage.js';
test('187 legacy and current rule combinations resume with browser-sized simulation steps', () => {
 for(let version=1;version<=17;version++)for(const b of Object.values(BATTLE_SCENARIOS)) {
  const c=createFreshCampaignState(1861,null,{rulesVersion:version===1?1:2,battleRulesVersion:version});
  const a=new CivilWarBattleEngine(b.id,c,'option_b');for(let i=0;i<20;i++)a.tick(.05);
  const r=CivilWarBattleEngine.fromCheckpoint(a.checkpoint(),b.id,c,'option_b');
  for(let i=0;i<20;i++){a.tick(.05);r.tick(.05);}
  assert.deepEqual(r.checkpoint(),a.checkpoint(),`${b.id} rules ${version}`);
 }
});
