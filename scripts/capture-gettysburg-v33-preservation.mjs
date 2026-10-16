import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {regressionModules,regressionHarness} from './test-support/gettysburgV30Regression.mjs';

// One-time authentic installed-v32 capture. Candidate code is never an oracle.
const LIVE='/Users/titansforge/Vault/Titans_of_War';
const ROOT=fileURLToPath(new URL('../',import.meta.url)).replace(/\/$/,'');
const WORK=fileURLToPath(new URL('../../',import.meta.url)).replace(/\/$/,'');
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const plain=value=>JSON.parse(JSON.stringify(value));
const hash=value=>sha(JSON.stringify(plain(value)));
const baselineRaw=readFileSync(WORK+'/baseline-hashes.json');
const BASELINE_SHA256='b32990ab452dc92a1e55223f390b4198a653cf284848f388b4ecb7c9823e9ce0';
assert.equal(sha(baselineRaw),BASELINE_SHA256);
const baseline=JSON.parse(baselineRaw);assert.equal(Object.keys(baseline).length,1548);
const paths=['package.json','src/battle/CivilWarBattlefield.jsx',
 'scripts/test-support/gettysburgV29Preservation.mjs','scripts/test-support/gettysburgV32Preservation.mjs',
 'scripts/test-gettysburg-v31-contact.mjs','scripts/test-gettysburg-v32-contact.mjs'];
const writeOnceExact=(name,bytes)=>{
 if(existsSync(name)){assert.equal(lstatSync(name).isSymbolicLink(),false);assert.deepEqual(readFileSync(name),Buffer.from(bytes),'Capture is immutable: '+name);}
 else{mkdirSync(name.substring(0,name.lastIndexOf('/')),{recursive:true});writeFileSync(name,bytes,{flag:'wx'});}
};
const sourceFiles=paths.map(path=>{
 const raw=readFileSync(LIVE+'/'+path);assert.equal(sha(raw),baseline[path],'Authentic live-before: '+path);
 const archive='scripts/test-support/gettysburg-v33-before/'+path;
 assert.deepEqual(readFileSync(ROOT+'/'+archive),raw,'Previously captured candidate-before copy: '+path);
 return {path,sha256:sha(raw),bytes:raw.length,archive,candidateCopyBeforeSHA256:baseline[path]};
});
const dependencyPaths=['scripts/test-support/gettysburgV30Regression.mjs','scripts/test-support/gettysburgV32Regression.mjs',
 'scripts/test-support/gettysburgClipTextures.mjs','scripts/test-support/fieldSuspendHarness.mjs','src/App.jsx',
 'src/battle/civilWarEngine.js','src/battle/formationVisualCheckpoint.js','src/battle/formationVisualState.js',
 'src/battle/combatCheckpointEnvelope.js','src/battle/gettysburgInfantryVolleyPresentation.js',
 'src/battle/gettysburgInfantryShotMotion.js','src/battle/gettysburgInfantryClipPolicy.js',
 'src/battle/gettysburgInfantryClips.js','src/game/fieldCheckpoint.js','src/game/fieldSuspendSave.js','src/game/campaignStorage.js'];
const dependencies=dependencyPaths.map(path=>{
 const bytes=readFileSync(LIVE+'/'+path);assert.equal(sha(bytes),baseline[path]);
 assert.deepEqual(readFileSync(ROOT+'/'+path),bytes,'Capture runtime dependency is the authentic live copy');
 return {path,sha256:sha(bytes),bytes:bytes.length};
});
const modules=await regressionModules(LIVE);
const pairModule=await import(pathToFileURL(LIVE+'/scripts/test-support/gettysburgV32Regression.mjs'));
const campaign=await import(pathToFileURL(LIVE+'/src/game/campaignStorage.js'));
const field=await import(pathToFileURL(LIVE+'/src/game/fieldCheckpoint.js'));
const suspend=await import(pathToFileURL(LIVE+'/src/game/fieldSuspendSave.js'));
const {BATTLE_SCENARIOS}=await import(pathToFileURL(LIVE+'/src/game/battles.js'));
const scene=readFileSync(LIVE+'/src/battle/CivilWarBattlefield.jsx');
const harness=regressionHarness(LIVE,modules,scene.toString(),' ?artPass=gettysburg-v32'.trim());
assert.equal(modules.gettysburgInfantryClipAssets('gettysburg','?artPass=gettysburg-v32').length,78);
assert.equal(modules.gettysburgInfantryClipPolicy('gettysburg','?artPass=gettysburg-v33'),null);
const oldFixturePath='scripts/fixtures/gettysburg-v32-preservation.json';
const oldFixtureBytes=readFileSync(LIVE+'/'+oldFixturePath);assert.equal(sha(oldFixtureBytes),baseline[oldFixturePath]);
const oldFixture=JSON.parse(oldFixtureBytes);
const queries=[...new Set(['',...oldFixture.queryRows.map(row=>row.query),
 ...['baseline','moderate','small','invalid'].map(profile=>'?artPass=gettysburg-v32&infantryScale='+profile)])];
const queryRows=queries.map(query=>{
 const clips=modules.prepareGettysburgInfantryClips(modules.gettysburgInfantryClipDefinitions('gettysburg',query,harness.textures),
  (key,frame)=>harness.textures.exists(key)&&harness.textures.get(key).has(frame));
 const poses=clips.flatMap(clip=>[0,1,2,3].flatMap(frame=>[{}, {paused:true},{reducedMotion:true},{resolving:true}].map(flags=>
  modules.gettysburgInfantryClipPose('v33-authentic-v32',{id:17,direction:clip.direction,
   action:clip.action==='march'?'walk':clip.action,frame,fallen:clip.action==='fall',scale:1.37},999,
   {scenarioId:'gettysburg',search:query,side:clip.side,identity:clip.identity,versionedIdentity:true,
    clips,shootingAge:.08,reloadProgress:.7,...flags}))));
 return {query,policy:modules.gettysburgInfantryClipPolicy('gettysburg',query),assets:modules.gettysburgInfantryClipAssets('gettysburg',query),
  clips:clips.length,clipsSHA256:hash(clips),poseRows:poses.length,posesSHA256:hash(poses)};
});
const sceneRows=[];
const captureScene=(query,side,direction,state)=>{
 const value=pairModule.isolated(harness,query,side,direction,state),facts=plain(harness.facts(value.view));
 const checkpoint=plain(value.scene.checkpoint());
 const feet=facts.visual.output.figures.map(figure=>({id:figure.id,x:figure.x,y:figure.y,scale:figure.scale,fallen:figure.fallen,visible:figure.visible}));
 const mouths=facts.soldiers.map(body=>({clipVolleyMuzzle:body.clipVolleyMuzzle,clipVolleyAt:body.clipVolleyAt}));
 sceneRows.push({query,side,direction,state,factsSHA256:hash(facts),feetSHA256:hash(feet),muzzlesSHA256:hash(mouths),
  shadowsSHA256:hash(value.scene.shadows.draws),smokeSHA256:hash(value.scene.smoke.draws),
  checkpointSHA256:hash(checkpoint),rawCombatSHA256:hash(modules.combatCheckpointEnvelope(checkpoint)),figureSlots:facts.soldiers.length});
};
for(const profile of ['baseline','moderate','small'])for(const side of ['union','confederate'])
 for(let direction=0;direction<8;direction++)for(const state of ['ready','fire','reload','walk','melee','fall'])
  captureScene('?artPass=gettysburg-v32&infantryScale='+profile,side,direction,state);
for(const side of ['union','confederate'])for(let direction=0;direction<8;direction++)
 for(const state of ['fire','melee','fall'])captureScene('',side,direction,state);

const coldRows=[];
for(const profile of ['baseline','moderate','small'])for(const direction of [1,5])for(const fall of [false,true]){
 const before=pairModule.syntheticPair(harness,profile,'gettysburg-v32',fall,direction);
 before.scene.speed=0;const checkpoint=plain(before.scene.checkpoint()),facts=pairModule.visibleFacts(pairModule.pairFacts(harness,before));
 const cold=pairModule.coldPair(harness,checkpoint,before);cold.scene.speed=0;
 const preDrawCheckpoint=plain(cold.scene.checkpoint());pairModule.drawPair(cold);
 const coldFacts=pairModule.visibleFacts(pairModule.pairFacts(harness,cold));
 assert.deepEqual(modules.combatCheckpointEnvelope(preDrawCheckpoint),modules.combatCheckpointEnvelope(checkpoint));
 coldRows.push({profile,direction,fall,checkpoint,checkpointSHA256:hash(checkpoint),beforeFactsSHA256:hash(facts),
  coldPreDrawCheckpointSHA256:hash(preDrawCheckpoint),coldFactsSHA256:hash(coldFacts),
  coldFactsEqualBefore:hash(coldFacts)===hash(facts),rawCombatSHA256:hash(modules.combatCheckpointEnvelope(checkpoint))});
}
const rawCase=pairModule.syntheticPair(harness,'moderate','gettysburg-v32',true,1);
const checkpoint=plain(rawCase.scene.checkpoint()),state=harness.campaign;
const battle=Object.values(BATTLE_SCENARIOS).find(value=>value.id==='gettysburg');
const pending={battle,choiceId:'option_a',baseState:state,mode:'fight',practice:true,statusNote:''};
const scenario={id:'checkpoint_fixture',title:'Field campaign',turn:1,actor:'Scenario commander',roleLabel:'Army Commander',choices:[{id:'option_b',text:'Fight',consequence:'Resolved'}]};
const snapshot=campaign.createCampaignSnapshot(state,scenario),data=new Map();
const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
const saved=suspend.saveFieldSuspension(snapshot,pending,checkpoint,state,storage);
const originalSnapshot=campaign.loadCampaignSnapshotResult(storage).snapshot;
const loaded=suspend.loadFieldSuspension(storage,originalSnapshot);
assert.equal(loaded.error,null);assert.equal(loaded.owner,saved.owner);assert.ok(loaded.pending);
const campaignRaw=data.get(campaign.CAMPAIGN_STORAGE_KEY),fieldRaw=data.get(field.FIELD_CHECKPOINT_KEY);
const envelope=JSON.parse(fieldRaw),payload=JSON.parse(envelope.payload);
assert.equal(loaded.owner,payload.anchor);assert.deepEqual(loaded.pending.checkpoint,checkpoint);
const rawSaveWitness={campaignKey:campaign.CAMPAIGN_STORAGE_KEY,fieldKey:field.FIELD_CHECKPOINT_KEY,campaignRaw,fieldRaw,
 campaignSHA256:sha(campaignRaw),fieldSHA256:sha(fieldRaw),fieldVersion:payload.version,fieldChecksum:envelope.checksum,
 owner:loaded.owner,protectedCampaign:loaded.protectedCampaign,rawCombatSHA256:hash(modules.combatCheckpointEnvelope(loaded.pending.checkpoint)),
 originalSnapshotSHA256:hash(originalSnapshot),pendingOwnerStored:Object.hasOwn(loaded.pending,'owner'),
 limitations:'Synthetic owned Map storage with actual unchanged save/load APIs; not device quota or public browser usability.'};
for(const record of [...sourceFiles,...dependencies])assert.equal(sha(readFileSync(LIVE+'/'+record.path)),record.sha256,'Live remained authentic during capture');
const fixture={schema:'gettysburg-v33-authentic-installed-v32-baseline-v1',capturedFrom:LIVE,artPass:'gettysburg-v32',
 baselineFiles:1548,baselineSHA256:BASELINE_SHA256,sceneSHA256:sha(scene),sourceFiles,dependencies,
 oldFixture:{path:oldFixturePath,sha256:sha(oldFixtureBytes)},
 protectedFiles:Object.entries(baseline).filter(([path])=>!paths.includes(path)).map(([path,sha256])=>({path,sha256})),
 queryRows,sceneRows,coldRows,rawSaveWitness,oldFixturesRefreshed:false,oldMigrationLedgersEdited:false,
 limitations:['Actual installed current Scene/modules with synthetic display objects and accepted legacy64x96 frame stand-ins; not pixel/GPU validation.',
 'Cold witness disagreements are recorded honestly, not asserted away or used as repaired output oracles.',
 'Authentic raw combat, feet, mouths and save bytes do not substitute for current behavioral, owner-v2 or ordinary public-play checks.']};
const fixturePath='scripts/fixtures/gettysburg-v33-preservation.json';
writeOnceExact(ROOT+'/'+fixturePath,JSON.stringify(fixture,null,2)+'\n');
const receipt={schema:'v33-authentic-preservation-capture-receipt-1',baselineFiles:1548,baselineSHA256:BASELINE_SHA256,
 fixture:fixturePath,fixtureSHA256:sha(readFileSync(ROOT+'/'+fixturePath)),captureSHA256:sha(readFileSync(fileURLToPath(import.meta.url))),
 sourceFiles,dependencies,protectedFiles:fixture.protectedFiles.length,queryRows:queryRows.length,
 poseRows:queryRows.reduce((sum,row)=>sum+row.poseRows,0),sceneRows:sceneRows.length,coldRows:coldRows.length,
 coldFactsEqualBefore:coldRows.filter(row=>row.coldFactsEqualBefore).length,rawSaveBytes:{campaign:campaignRaw.length,field:fieldRaw.length},
 runtime:process.version,liveWrites:false,oldFixturesRefreshed:false,oldMigrationLedgersEdited:false,sourceOnly:true,localInstall:false};
writeOnceExact(WORK+'/evidence/v33-preservation/authentic-capture.receipt.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));

