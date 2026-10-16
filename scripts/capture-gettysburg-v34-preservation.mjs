import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';

// One-time authentic installed-v33 capture. Candidate code is never an oracle.
const LIVE='/Users/titansforge/Vault/Titans_of_War';
const ROOT=fileURLToPath(new URL('../',import.meta.url)).replace(/\/$/,'');
const WORK=fileURLToPath(new URL('../../',import.meta.url)).replace(/\/$/,'');
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const plain=value=>JSON.parse(JSON.stringify(value));
const hash=value=>sha(JSON.stringify(plain(value)));
const baselineRaw=readFileSync(WORK+'/baseline-hashes.json');
const BASELINE_SHA256='6b1a15053d54150ddbbc3145f962383bfef452a7f25ca20b9fce74a76b396f6a';
assert.equal(sha(baselineRaw),BASELINE_SHA256);
const baseline=JSON.parse(baselineRaw);assert.equal(Object.keys(baseline).length,1562);
const paths=['package.json','src/battle/CivilWarBattlefield.jsx','scripts/test-support/gettysburgV33Preservation.mjs'];
const started=performance.now();let inventoriedBytes=0;
for(const [path,digest] of Object.entries(baseline)){
 const bytes=readFileSync(LIVE+'/'+path);inventoriedBytes+=bytes.length;
 assert.ok(inventoriedBytes<=2147483648,'Bounded baseline bytes');assert.ok(performance.now()-started<=90000,'Bounded baseline time');
 assert.equal(sha(bytes),digest,'Authentic complete current-before baseline: '+path);
}
const writeOnceExact=(name,bytes)=>{
 if(existsSync(name)){assert.equal(lstatSync(name).isSymbolicLink(),false);assert.deepEqual(readFileSync(name),Buffer.from(bytes),'Capture is immutable: '+name);}
 else{mkdirSync(name.substring(0,name.lastIndexOf('/')),{recursive:true});writeFileSync(name,bytes,{flag:'wx'});}
};
const sourceFiles=paths.map(path=>{
 const raw=readFileSync(LIVE+'/'+path);assert.equal(sha(raw),baseline[path],'Authentic live-before: '+path);
 const archive='scripts/test-support/gettysburg-v34-before/'+path;
 writeOnceExact(ROOT+'/'+archive,raw);
 assert.deepEqual(readFileSync(ROOT+'/'+archive),raw,'Authentic before archive: '+path);
 return {path,sha256:sha(raw),bytes:raw.length,archive,candidateCopyBeforeSHA256:baseline[path]};
});
const dependencyPaths=['scripts/test-support/gettysburgV30Regression.mjs','scripts/test-support/gettysburgV32Regression.mjs',
 'scripts/test-support/gettysburgV33Regression.mjs','src/battle/contactLayoutPresentation.js',
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
const {regressionModules,regressionHarness}=await import(pathToFileURL(LIVE+'/scripts/test-support/gettysburgV30Regression.mjs'));
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
const oldFixturePath='scripts/fixtures/gettysburg-v33-preservation.json';
const oldFixtureBytes=readFileSync(LIVE+'/'+oldFixturePath);assert.equal(sha(oldFixtureBytes),baseline[oldFixturePath]);
const oldFixture=JSON.parse(oldFixtureBytes);
const queries=[...new Set(['',...oldFixture.queryRows.map(row=>row.query),
 ...['baseline','moderate','small','invalid'].map(profile=>'?artPass=gettysburg-v32&infantryScale='+profile),
 '?artPass=gettysburg-v32&standardContinuity=v34', '?artPass=gettysburg-v32&contactLayout=v33&standardContinuity=v34'])];
const queryRows=queries.map(query=>{
 const clips=modules.prepareGettysburgInfantryClips(modules.gettysburgInfantryClipDefinitions('gettysburg',query,harness.textures),
  (key,frame)=>harness.textures.exists(key)&&harness.textures.get(key).has(frame));
 const poses=clips.flatMap(clip=>[0,1,2,3].flatMap(frame=>[{}, {paused:true},{reducedMotion:true},{resolving:true}].map(flags=>
  modules.gettysburgInfantryClipPose('v34-authentic-v33',{id:17,direction:clip.direction,
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
const anchors=value=>value.ids.map(formationId=>({formationId,anchorId:value.scene.views.get(formationId).standardAnchorId??null}));
for(const profile of ['baseline','moderate','small'])for(const direction of [1,5])for(const fall of [false,true]){
 const before=pairModule.syntheticPair(harness,profile,'gettysburg-v32',fall,direction);
 before.scene.speed=0;const beforeAnchors=anchors(before);const checkpoint=plain(before.scene.checkpoint()),facts=pairModule.visibleFacts(pairModule.pairFacts(harness,before));
 const cold=pairModule.coldPair(harness,checkpoint,before);cold.scene.speed=0;
 const preDrawAnchors=anchors(cold),preDrawCheckpoint=plain(cold.scene.checkpoint());pairModule.drawPair(cold);
 const coldFacts=pairModule.visibleFacts(pairModule.pairFacts(harness,cold));
 assert.deepEqual(modules.combatCheckpointEnvelope(preDrawCheckpoint),modules.combatCheckpointEnvelope(checkpoint));
 coldRows.push({profile,direction,fall,checkpoint,checkpointSHA256:hash(checkpoint),beforeFactsSHA256:hash(facts),
  coldPreDrawCheckpointSHA256:hash(preDrawCheckpoint),coldFactsSHA256:hash(coldFacts),
  coldFactsEqualBefore:hash(coldFacts)===hash(facts),beforeAnchors,preDrawAnchors,coldAnchors:anchors(cold),rawCombatSHA256:hash(modules.combatCheckpointEnvelope(checkpoint))});
}
const layoutModule=await import(pathToFileURL(LIVE+'/scripts/test-support/gettysburgV33Regression.mjs'));
const carrierRows=[];
const carrierRecords=value=>value.ids.map(id=>{
 const view=value.scene.views.get(id),formation=layoutModule.current(value.scene,id),figures=view.visual.output.figures;
 const display=layer=>layer?{x:layer.x,y:layer.y,depth:layer.depth,scaleX:layer.scaleX,scaleY:layer.scaleY,visible:layer.visible}:null;
 return {formationId:id,carrierId:view.standardAnchorId??null,
  retainedAnchor:modules.gettysburgInfantryStandardAnchor(formation,figures,view.standardAnchorId),
  freshNearestAnchor:modules.gettysburgInfantryStandardAnchor(formation,figures),
  carrierStillLiving:figures.some(f=>f.id===view.standardAnchorId&&f.visible&&!f.fallen),
  standard:display(view.standard),standardUI:display(view.standardUI),
  rawFeetSHA256:hash(figures.map(f=>f.visible?{id:f.id,visible:f.visible,x:f.x,y:f.y,fallen:f.fallen}:{id:f.id,visible:f.visible})),
  rawFallenSHA256:hash(view.visual.figures.map(f=>({id:f.id,alive:f.alive,fallen:f.fallen===null?null:{x:f.fallen.x,y:f.fallen.y,time:f.fallen.time,facing:f.fallen.facing,scale:f.fallen.scale}}))),
  livingFigures:figures.filter(f=>f.visible&&!f.fallen).length};
});
for(const enabled of [false,true]){
 const actual=await layoutModule.layoutHarness(LIVE),value=layoutModule.publicPair(actual,1,'moderate',enabled);
 layoutModule.drawPair(value);const initial=carrierRecords(value);
 value.scene.previewDestination({x:650,y:600});value.scene.confirmMove();value.scene.setSpeed(1);
 for(let steps=0;value.scene.engine.time<63-1e-6&&steps<1300;steps++){value.scene.engine.tick(.05);layoutModule.drawPair(value);}
 assert.ok(Math.abs(value.scene.engine.time-63)<1e-6);
 value.scene.setSpeed(0);value.scene.issueOrder('assault',{sectorId:'left'});value.scene.setSpeed(1);let reached=null;
 for(let steps=0;value.scene.engine.time<104.05-1e-6&&steps<2200;steps++){
  const time=value.scene.engine.time;value.scene.engine.tick(.05);layoutModule.drawPair(value);
  assert.ok(value.scene.engine.time>time);
  if(reached===null&&value.confederate.inMelee&&value.union.inMelee)reached=value.scene.engine.time;
 }
 assert.ok(Math.abs(value.scene.engine.time-104.05)<1e-6);assert.ok(reached!==null&&value.confederate.active&&value.union.active);
 value.scene.setSpeed(0);layoutModule.drawPair(value);
 const warm=carrierRecords(value),saved=plain(value.scene.checkpoint());layoutModule.drawPair(value);assert.deepEqual(carrierRecords(value),warm);
 const cold=layoutModule.coldPair(actual,value,saved),coldBeforeDrawCarrierIds=cold.ids.map(formationId=>({formationId,carrierId:cold.scene.views.get(formationId).standardAnchorId??null}));
 const coldPreDrawCheckpoint=plain(cold.scene.checkpoint());layoutModule.drawPair(cold);const resumed=carrierRecords(cold),resaved=plain(cold.scene.checkpoint());
 assert.deepEqual(cold.scene.engine.checkpoint(),value.scene.engine.checkpoint());
 for(let i=0;i<warm.length;i++){assert.equal(warm[i].rawFeetSHA256,resumed[i].rawFeetSHA256);assert.equal(warm[i].rawFallenSHA256,resumed[i].rawFallenSHA256);}
 assert.deepEqual(warm.map(row=>row.carrierId),[16,16]);assert.deepEqual(resumed.map(row=>row.carrierId),[19,18]);
 carrierRows.push({contactLayoutEnabled:enabled,query:value.search,simulationTime:value.scene.engine.time,displayedFieldTime:Math.floor(value.scene.engine.time),contactReachedAt:reached,
  untouchedRosterPublicCommands:true,sourceCommandSchedule:{move:{x:650,y:600},pauseBeforeAssaultNominalTime:63,assault:{sectorId:'left'},pauseAfterNominalTime:104.05},
  initial,warm,coldBeforeDrawCarrierIds,resumed,checkpoint:saved,checkpointSHA256:hash(saved),coldPreDrawCheckpointSHA256:hash(coldPreDrawCheckpoint),
  saveHasStandardAnchorId:JSON.stringify(saved.presentation).includes('standardAnchorId'),rawCombatSHA256:hash(value.scene.engine.checkpoint()),
  savedPresentationSHA256:hash(saved.presentation),afterFirstColdDrawPresentationSHA256:hash(resaved.presentation),
  carrierChanges:warm.map((row,i)=>({formationId:row.formationId,warmCarrierId:row.carrierId,coldCarrierId:resumed[i].carrierId,changed:row.carrierId!==resumed[i].carrierId,
   worldStandardDelta:{x:resumed[i].standard.x-row.standard.x,y:resumed[i].standard.y-row.standard.y}}))});
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
for(const [path,digest] of Object.entries(baseline)){assert.ok(performance.now()-started<=90000,'Bounded capture time');assert.equal(sha(readFileSync(LIVE+'/'+path)),digest,'Whole live baseline remained authentic during capture: '+path);}
const fixture={schema:'gettysburg-v34-authentic-installed-v33-baseline-v1',capturedFrom:LIVE,artPass:'gettysburg-v32',
 baselineFiles:1562,baselineSHA256:BASELINE_SHA256,sceneSHA256:sha(scene),sourceFiles,dependencies,
 oldFixture:{path:oldFixturePath,sha256:sha(oldFixtureBytes)},
 protectedFiles:Object.entries(baseline).filter(([path])=>!paths.includes(path)).map(([path,sha256])=>({path,sha256})),
 queryRows,sceneRows,coldRows,carrierRows,rawSaveWitness,oldFixturesRefreshed:false,oldMigrationLedgersEdited:false,
 limitations:['Actual installed current Scene/modules with synthetic display objects and accepted legacy64x96 frame stand-ins; not pixel/GPU validation.',
 'Cold witness disagreements are recorded honestly, not asserted away or used as repaired output oracles.',
 'Authentic raw combat, feet, mouths and save bytes do not substitute for current behavioral, owner-v2 or ordinary public-play checks.']};
const fixturePath='scripts/fixtures/gettysburg-v34-preservation.json';
writeOnceExact(ROOT+'/'+fixturePath,JSON.stringify(fixture,null,2)+'\n');
const receipt={schema:'v34-authentic-preservation-capture-receipt-1',baselineFiles:1562,baselineSHA256:BASELINE_SHA256,
 fixture:fixturePath,fixtureSHA256:sha(readFileSync(ROOT+'/'+fixturePath)),captureSHA256:sha(readFileSync(fileURLToPath(import.meta.url))),
 sourceFiles,dependencies,protectedFiles:fixture.protectedFiles.length,complete:true,baselineBytes:inventoriedBytes,queryRows:queryRows.length,
 poseRows:queryRows.reduce((sum,row)=>sum+row.poseRows,0),sceneRows:sceneRows.length,coldRows:coldRows.length,
 coldFactsEqualBefore:coldRows.filter(row=>row.coldFactsEqualBefore).length,carrierRows:carrierRows.length,
 carrierFailures:carrierRows.flatMap(row=>row.carrierChanges).filter(row=>row.changed).length,rawSaveBytes:{campaign:campaignRaw.length,field:fieldRaw.length},
 runtime:process.version,liveWrites:false,oldFixturesRefreshed:false,oldMigrationLedgersEdited:false,sourceOnly:true,localInstall:false};
writeOnceExact(WORK+'/evidence/v34-preservation/authentic-capture.receipt.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));

