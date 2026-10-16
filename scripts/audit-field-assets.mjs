import fs from 'node:fs';
import vm from 'node:vm';
import {getBattleEngineConfig} from '../src/battle/battleDefinitions.js';
import {CivilWarBattleEngine} from '../src/battle/civilWarEngine.js';
import {createFreshCampaignState} from '../src/game/campaignStorage.js';
import {BATTLE_SCENARIOS} from '../src/game/battles.js';
import {landmarkField} from '../src/battle/historicalLandmarks.js';
import {siegeTargetAssets} from '../src/battle/siegeTargetVisual.js';
import {siegeTerrainAssets} from '../src/battle/siegeTerrainVisual.js';
import {DETAILED_UNIT_PAGES,detailedUnitAssetDirectory} from '../src/battle/detailedUnitVisual.js';
import {gettysburgInfantryFamilyAssets} from '../src/battle/gettysburgInfantryFamily.js';
import {gettysburgInfantryClipAssets} from '../src/battle/gettysburgInfantryClipAssets.js';
const source=fs.readFileSync(new URL('../src/battle/CivilWarBattlefield.jsx',import.meta.url),'utf8');
const method=source.slice(source.indexOf('  preload() {'),source.indexOf('  create() {'));
const Loader=vm.runInNewContext(`(class {${method}})`,{siegeTargetAssets,siegeTerrainAssets,landmarkField,DETAILED_UNIT_PAGES,detailedUnitAssetDirectory,gettysburgInfantryFamilyAssets,gettysburgInfantryClipAssets,PUBLIC_BASE:''});
const results=[];
function collectBattleAssets(battle,artPassSearch=''){
 const loader=new Loader(),urls=[];loader.scenarioId=battle.id;loader.artPassSearch=artPassSearch;loader.engine=new CivilWarBattleEngine(battle.id,createFreshCampaignState(1861),'option_a');loader.config=getBattleEngineConfig(battle.id);
 if(loader.engine.gettysburg)loader.config={...loader.config,terrain:{key:'gettysburg-terrain-v3',src:'images/battles/gettysburg-terrain-v3.png'}};
 if(loader.engine.fieldBattle){const ground={first_manassas:'manassas-ground-v3',shiloh:'shiloh-ground-v2'}[battle.id]||'realistic-v2/pasture';loader.config={...loader.config,terrain:{key:ground,src:`images/battles/${ground}.${ground==='shiloh-ground-v2'?'webp':'png'}`}};}
 loader.load={image(_key,url){urls.push(url);},json(_key,url){urls.push(url);},atlas(_key,image,json){urls.push(image,json);}};loader.preload();
 const assets=[...new Set(urls)].map(src=>({src,bytes:fs.statSync(new URL('../public/'+src,import.meta.url)).size}));
 return {battle:battle.id,artPass:artPassSearch||null,loadEntries:urls.length,uniqueAssets:assets.length,bytes:assets.reduce((n,a)=>n+a.bytes,0),assets};
}
for(const battle of Object.values(BATTLE_SCENARIOS))results.push(collectBattleAssets(battle));
const gettysburg=Object.values(BATTLE_SCENARIOS).find((battle)=>battle.id==='gettysburg');
const variants=[collectBattleAssets(gettysburg,'?artPass=gettysburg-v1'),collectBattleAssets(gettysburg,'?artPass=gettysburg-v2'),collectBattleAssets(gettysburg,'?artPass=gettysburg-v3'),collectBattleAssets(gettysburg,'?artPass=gettysburg-v4')];
const report={scope:'Current-rule option A preload assets only. Uncompressed file bytes, not transferred bytes, decoded memory, startup timing or total app payload. Shared image URLs counted once per encounter.',results,variants};
const payload=JSON.stringify(report,null,2)+'\n';if(process.argv[2])fs.writeFileSync(process.argv[2],payload,{flag:'wx'});else console.log(payload);
